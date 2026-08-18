import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Task, Todo, TaskWithProgress, Database, AIGeneratedTodo } from '../../types';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../contexts/ToastContext';
import * as Crypto from 'expo-crypto';

/**
 * Turn a delete failure into something the user can act on.
 *
 * Optimistic deletes used to roll back with `_err` unused, so a failed delete
 * looked like the row vanishing and silently reappearing with no explanation
 * (DF-1). Whatever the cause, the user must be told the delete did not stick.
 *
 * 23503 is a foreign-key violation. Migration 0014 removed the known cause (a
 * branched todo made its task undeletable), so this branch should now be
 * unreachable — it is kept because reaching it silently is precisely the
 * failure mode being fixed, and a new reference added later would otherwise
 * reintroduce the same invisible bug.
 */
function deleteErrorMessage(err: unknown, subject: 'task' | 'todo'): string {
    const code = (err as { code?: string } | null)?.code;
    if (code === '23503') {
        return `This ${subject} is still linked to something else and could not be deleted.`;
    }
    return `Could not delete the ${subject}. Please try again.`;
}

type BranchTaskWithProgress = Task & {
    todos: Todo[];
    total_count: number;
    completed_count: number;
};

type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TodoInsert = Database['public']['Tables']['todos']['Insert'];

// Centralized query keys for cache invalidation
export const taskKeys = {
    all: ['tasks'] as const,
    detail: (id: string) => ['tasks', id] as const,
    todos: (taskId: string) => ['tasks', taskId, 'todos'] as const,
};

// Fetch all tasks with todo progress counts (owner's tasks only)
export const useTasks = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: taskKeys.all,
        queryFn: async (): Promise<TaskWithProgress[]> => {
            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user!.id)
                .is('parent_todo_id', null)
                .order('created_at', { ascending: false });

            if (tasksError) throw tasksError;
            if (!tasks || tasks.length === 0) return [];

            const taskIds = tasks.map((t) => t.id);
            const { data: todos, error: todosError } = await supabase
                .from('todos')
                .select('*')
                .in('task_id', taskIds)
                .order('order', { ascending: true });

            if (todosError) throw todosError;

            const todosByTask = new Map<string, Todo[]>();
            for (const todo of todos || []) {
                const existing = todosByTask.get(todo.task_id) || [];
                existing.push(todo as Todo);
                todosByTask.set(todo.task_id, existing);
            }

            return tasks.map((task) => {
                const taskTodos = todosByTask.get(task.id) || [];
                return {
                    ...(task as Task),
                    todos: taskTodos,
                    total_count: taskTodos.length,
                    completed_count: taskTodos.filter((t) => t.completed).length,
                };
            });
        },
    });
};

// Fetch a single task
export const useTask = (taskId: string) => {
    return useQuery({
        queryKey: taskKeys.detail(taskId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .single();

            if (error) throw error;
            return data as Task;
        },
        enabled: !!taskId,
    });
};

// Fetch todos for a specific task
export const useTaskTodos = (taskId: string) => {
    return useQuery({
        queryKey: taskKeys.todos(taskId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('todos')
                .select('*')
                .eq('task_id', taskId)
                .order('order', { ascending: true });

            if (error) throw error;
            return data as Todo[];
        },
        enabled: !!taskId,
    });
};

// Create a task with AI-generated todos
export const useCreateTaskWithTodos = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            task,
            todos,
        }: {
            task: TaskInsert;
            todos: AIGeneratedTodo[];
        }) => {
            const { data: newTask, error: taskError } = await supabase
                .from('tasks')
                .insert(task)
                .select()
                .single();

            if (taskError) throw taskError;

            const todosToInsert: TodoInsert[] = todos.map(
                (todo, index) => ({
                    task_id: newTask.id,
                    user_id: task.user_id,
                    title: todo.title,
                    completed: false,
                    order: index,
                    due_date: todo.due_date,
                    due_time: todo.due_time,
                }),
            );

            const { data: insertedTodos, error: todosError } = await supabase
                .from('todos')
                .insert(todosToInsert)
                .select();

            if (todosError) {
                // Clean up the task if todos insertion fails
                await supabase.from('tasks').delete().eq('id', newTask.id);
                throw todosError;
            }

            return { task: newTask as Task, todos: (insertedTodos || []) as Todo[] };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};

// Delete a task (optimistic — cascade deletes todos via DB)
export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);
            if (error) throw error;
        },
        onMutate: async (taskId) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.all });

            const previousTasks = queryClient.getQueryData<TaskWithProgress[]>(taskKeys.all);

            queryClient.setQueryData<TaskWithProgress[]>(taskKeys.all, (old) =>
                old?.filter((t) => t.id !== taskId) ?? []
            );

            return { previousTasks };
        },
        onError: (err, _vars, context) => {
            if (context?.previousTasks !== undefined) {
                queryClient.setQueryData(taskKeys.all, context.previousTasks);
            }
            // The task is about to reappear on screen. Say why.
            showToast(deleteErrorMessage(err, 'task'), 'warning');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};

// Toggle a todo's completed status (optimistic)
export const useToggleTodo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            completed,
        }: {
            id: string;
            completed: boolean;
            taskId: string;
        }) => {
            const { data, error } = await supabase
                .from('todos')
                .update({ completed })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Todo;
        },
        onMutate: async ({ id, completed, taskId }) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.todos(taskId) });
            await queryClient.cancelQueries({ queryKey: taskKeys.all });

            const previousTodos = queryClient.getQueryData<Todo[]>(taskKeys.todos(taskId));
            const previousTasks = queryClient.getQueryData<TaskWithProgress[]>(taskKeys.all);

            queryClient.setQueryData<Todo[]>(taskKeys.todos(taskId), (old) =>
                old?.map((t) => (t.id === id ? { ...t, completed } : t)) ?? []
            );

            queryClient.setQueryData<TaskWithProgress[]>(taskKeys.all, (old) =>
                old?.map((task) => {
                    if (task.id !== taskId) return task;
                    const updatedTodos = task.todos.map((t) =>
                        t.id === id ? { ...t, completed } : t
                    );
                    return {
                        ...task,
                        todos: updatedTodos,
                        completed_count: updatedTodos.filter((t) => t.completed).length,
                    };
                }) ?? []
            );

            return { previousTodos, previousTasks, taskId };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTodos !== undefined) {
                queryClient.setQueryData(taskKeys.todos(context.taskId), context.previousTodos);
            }
            if (context?.previousTasks !== undefined) {
                queryClient.setQueryData(taskKeys.all, context.previousTasks);
            }
        },
        onSettled: (_data, _err, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.todos(taskId) });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};

// Update a todo's title (optimistic)
export const useUpdateTodo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            taskId,
            title,
        }: {
            id: string;
            taskId: string;
            title: string;
        }) => {
            const { data, error } = await supabase
                .from('todos')
                .update({ title })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Todo;
        },
        onMutate: async ({ id, taskId, title }) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.todos(taskId) });

            const previousTodos = queryClient.getQueryData<Todo[]>(taskKeys.todos(taskId));

            queryClient.setQueryData<Todo[]>(taskKeys.todos(taskId), (old) =>
                old?.map((t) => (t.id === id ? { ...t, title } : t)) ?? []
            );

            return { previousTodos, taskId };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTodos !== undefined) {
                queryClient.setQueryData(taskKeys.todos(context.taskId), context.previousTodos);
            }
        },
        onSettled: (_data, _err, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.todos(taskId) });
        },
    });
};

// Add a single manual todo to a task (optimistic)
export const useAddTodo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newTodo: TodoInsert) => {
            const { data, error } = await supabase
                .from('todos')
                .insert(newTodo)
                .select()
                .single();

            if (error) throw error;
            return data as Todo;
        },
        onMutate: async (newTodo) => {
            const taskId = newTodo.task_id;
            await queryClient.cancelQueries({ queryKey: taskKeys.todos(taskId) });
            await queryClient.cancelQueries({ queryKey: taskKeys.all });

            const previousTodos = queryClient.getQueryData<Todo[]>(taskKeys.todos(taskId));
            const previousTasks = queryClient.getQueryData<TaskWithProgress[]>(taskKeys.all);

            const optimisticTodo: Todo = {
                id: Crypto.randomUUID(),
                task_id: taskId,
                user_id: newTodo.user_id,
                title: newTodo.title,
                completed: false,
                order: newTodo.order ?? 999,
                due_date: newTodo.due_date ?? null,
                due_time: newTodo.due_time ?? null,
                is_branched: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            queryClient.setQueryData<Todo[]>(taskKeys.todos(taskId), (old) =>
                [...(old ?? []), optimisticTodo]
            );

            queryClient.setQueryData<TaskWithProgress[]>(taskKeys.all, (old) =>
                old?.map((task) => {
                    if (task.id !== taskId) return task;
                    const updatedTodos = [...task.todos, optimisticTodo];
                    return {
                        ...task,
                        todos: updatedTodos,
                        total_count: updatedTodos.length,
                        completed_count: updatedTodos.filter((t) => t.completed).length,
                    };
                }) ?? []
            );

            return { previousTodos, previousTasks, taskId };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTodos !== undefined) {
                queryClient.setQueryData(taskKeys.todos(context.taskId), context.previousTodos);
            }
            if (context?.previousTasks !== undefined) {
                queryClient.setQueryData(taskKeys.all, context.previousTasks);
            }
        },
        onSettled: (_data, _err, newTodo) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.todos(newTodo.task_id) });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};

// Reorder todos within a task
export const useReorderTodos = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            taskId,
            orderedIds,
        }: {
            taskId: string;
            orderedIds: string[];
        }) => {
            const updates = orderedIds.map((id, index) =>
                supabase
                    .from('todos')
                    .update({ order: index })
                    .eq('id', id),
            );
            const results = await Promise.all(updates);
            const failed = results.find((r) => r.error);
            if (failed?.error) throw failed.error;
        },
        onMutate: async ({ taskId, orderedIds }) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.todos(taskId) });
            const previous = queryClient.getQueryData<Todo[]>(taskKeys.todos(taskId));

            if (previous) {
                const reordered = orderedIds
                    .map((id, index) => {
                        const todo = previous.find((t) => t.id === id);
                        return todo ? { ...todo, order: index } : null;
                    })
                    .filter(Boolean) as Todo[];
                queryClient.setQueryData(taskKeys.todos(taskId), reordered);
            }

            return { previous, taskId };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    taskKeys.todos(context.taskId),
                    context.previous,
                );
            }
        },
        onSettled: (_data, _err, variables) => {
            queryClient.invalidateQueries({
                queryKey: taskKeys.todos(variables.taskId),
            });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};

// Delete a single todo (optimistic)
export const useDeleteTodo = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({
            id,
            taskId,
        }: {
            id: string;
            taskId: string;
        }) => {
            const { error } = await supabase
                .from('todos')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { taskId };
        },
        onMutate: async ({ id, taskId }) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.todos(taskId) });
            await queryClient.cancelQueries({ queryKey: taskKeys.all });

            const previousTodos = queryClient.getQueryData<Todo[]>(taskKeys.todos(taskId));
            const previousTasks = queryClient.getQueryData<TaskWithProgress[]>(taskKeys.all);

            queryClient.setQueryData<Todo[]>(taskKeys.todos(taskId), (old) =>
                old?.filter((t) => t.id !== id) ?? []
            );

            queryClient.setQueryData<TaskWithProgress[]>(taskKeys.all, (old) =>
                old?.map((task) => {
                    if (task.id !== taskId) return task;
                    const updatedTodos = task.todos.filter((t) => t.id !== id);
                    return {
                        ...task,
                        todos: updatedTodos,
                        total_count: updatedTodos.length,
                        completed_count: updatedTodos.filter((t) => t.completed).length,
                    };
                }) ?? []
            );

            return { previousTodos, previousTasks, taskId };
        },
        onError: (err, _vars, context) => {
            if (context?.previousTodos !== undefined) {
                queryClient.setQueryData(taskKeys.todos(context.taskId), context.previousTodos);
            }
            if (context?.previousTasks !== undefined) {
                queryClient.setQueryData(taskKeys.all, context.previousTasks);
            }
            // The todo is about to reappear on screen. Say why.
            showToast(deleteErrorMessage(err, 'todo'), 'warning');
        },
        onSettled: (_data, _err, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.todos(taskId) });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
        },
    });
};

// ============================================================
// Branch hooks
// ============================================================

export const branchKeys = {
    forTodo: (todoId: string) => ['branch', todoId] as const,
    forTask: (taskId: string) => ['branches', taskId] as const,
};

// Create a branch task linked to a parent todo
export const useCreateBranch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            task,
            todos,
            parentTodoId,
        }: {
            task: TaskInsert;
            todos: AIGeneratedTodo[];
            parentTodoId: string;
        }) => {
            // 1. Insert the branch task with parent_todo_id
            const { data: newTask, error: taskError } = await supabase
                .from('tasks')
                .insert({ ...task, parent_todo_id: parentTodoId })
                .select()
                .single();

            if (taskError) throw taskError;

            // 2. Insert todos for the branch task
            const todosToInsert: TodoInsert[] = todos.map((todo, index) => ({
                task_id: newTask.id,
                user_id: task.user_id,
                title: todo.title,
                completed: false,
                order: index,
                due_date: todo.due_date,
                due_time: todo.due_time,
            }));

            const { data: insertedTodos, error: todosError } = await supabase
                .from('todos')
                .insert(todosToInsert)
                .select();

            if (todosError) {
                // Rollback: delete the branch task
                await supabase.from('tasks').delete().eq('id', newTask.id);
                throw todosError;
            }

            // 3. Mark the parent todo as branched
            const { error: updateError } = await supabase
                .from('todos')
                .update({ is_branched: true })
                .eq('id', parentTodoId);

            if (updateError) {
                // Rollback: delete the branch task (cascade deletes todos)
                await supabase.from('tasks').delete().eq('id', newTask.id);
                throw updateError;
            }

            return { task: newTask as Task, todos: (insertedTodos || []) as Todo[] };
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            // Invalidate the parent task's todos (to reflect is_branched change)
            queryClient.invalidateQueries({ queryKey: branchKeys.forTodo(variables.parentTodoId) });
        },
    });
};

// Unbranch: sever the link between a branch task and its parent todo
export const useUnbranch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            branchTaskId,
            parentTodoId,
        }: {
            branchTaskId: string;
            parentTodoId: string;
        }) => {
            // 1. Remove the parent_todo_id link
            const { error: taskError } = await supabase
                .from('tasks')
                .update({ parent_todo_id: null })
                .eq('id', branchTaskId);

            if (taskError) throw taskError;

            // 2. Mark the parent todo as no longer branched
            const { error: todoError } = await supabase
                .from('todos')
                .update({ is_branched: false })
                .eq('id', parentTodoId);

            if (todoError) throw todoError;

            return { branchTaskId, parentTodoId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            queryClient.invalidateQueries({ queryKey: branchKeys.forTodo(data.parentTodoId) });
        },
    });
};

// Fetch the branch task linked to a specific todo (if any)
export const useBranchForTodo = (todoId: string) => {
    return useQuery({
        queryKey: branchKeys.forTodo(todoId),
        queryFn: async (): Promise<BranchTaskWithProgress | null> => {
            // Find the branch task that has this todo as parent
            const { data: branchTask, error: taskError } = await supabase
                .from('tasks')
                .select('*')
                .eq('parent_todo_id', todoId)
                .maybeSingle();

            if (taskError) throw taskError;
            if (!branchTask) return null;

            // Fetch the branch task's todos for progress
            const { data: branchTodos, error: todosError } = await supabase
                .from('todos')
                .select('*')
                .eq('task_id', branchTask.id)
                .order('order', { ascending: true });

            if (todosError) throw todosError;

            const todos = (branchTodos || []) as Todo[];
            return {
                ...(branchTask as Task),
                todos,
                total_count: todos.length,
                completed_count: todos.filter(t => t.completed).length,
            };
        },
        enabled: !!todoId,
    });
};

// Fetch all branch tasks for a given task (batch query for task-level branch view)
export const useBranchesForTask = (taskId: string, branchedTodoIds: string[]) => {
    return useQuery({
        queryKey: ['branches', taskId, 'all'],
        queryFn: async () => {
            // Fetch all branch tasks linked to the branched todos
            const { data: branchTasks, error } = await supabase
                .from('tasks')
                .select('*')
                .in('parent_todo_id', branchedTodoIds);

            if (error) throw error;
            if (!branchTasks?.length) return [];

            // Fetch todos for all branch tasks in one query
            const branchTaskIds = branchTasks.map(t => t.id);
            const { data: allTodos, error: todosError } = await supabase
                .from('todos')
                .select('*')
                .in('task_id', branchTaskIds)
                .order('order', { ascending: true });

            if (todosError) throw todosError;

            const todosByTask = new Map<string, Todo[]>();
            for (const todo of allTodos || []) {
                const existing = todosByTask.get(todo.task_id) || [];
                existing.push(todo as Todo);
                todosByTask.set(todo.task_id, existing);
            }

            return branchTasks.map(bt => {
                const todos = todosByTask.get(bt.id) || [];
                return {
                    parentTodoId: bt.parent_todo_id!,
                    branchTask: {
                        ...(bt as Task),
                        todos,
                        total_count: todos.length,
                        completed_count: todos.filter(t => t.completed).length,
                    },
                };
            });
        },
        enabled: branchedTodoIds.length > 0,
    });
};

// Check if a task has any branched todos (for delete guard)
export const useTaskHasBranches = (taskId: string) => {
    return useQuery({
        queryKey: branchKeys.forTask(taskId),
        queryFn: async (): Promise<boolean> => {
            const { data: todos, error } = await supabase
                .from('todos')
                .select('id')
                .eq('task_id', taskId)
                .eq('is_branched', true)
                .limit(1);

            if (error) throw error;
            return (todos?.length ?? 0) > 0;
        },
        enabled: !!taskId,
    });
};
