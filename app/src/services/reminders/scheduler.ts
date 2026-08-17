import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { isExpoGo } from '../../lib/expoGoDetect';
import { Todo, Task, ReminderSettings, ReminderSlot, ScheduledReminder } from '../../types';

const _isExpoGo = isExpoGo();

/**
 * Resolve the effective due datetime for a todo.
 * Priority: todo's own due_date/due_time > task event_time
 * If only due_date (no time), defaults to 9:00 AM.
 */
function resolveDueDateTime(todo: Todo, task: Task): Date | null {
    if (todo.due_date) {
        const time = todo.due_time || '09:00';
        return new Date(`${todo.due_date}T${time}:00`);
    }
    if (task.event_time) {
        return new Date(task.event_time);
    }
    return null;
}

/**
 * Find the applicable reminder settings for a task.
 * Checks for group-specific override first, then falls back to global.
 */
function findApplicableSettings(
    allSettings: ReminderSettings[],
    groupId: string | null,
): ReminderSettings | null {
    if (groupId) {
        const override = allSettings.find(s => s.group_id === groupId);
        if (override) return override;
    }
    return allSettings.find(s => s.group_id === null) ?? null;
}

/**
 * Schedule a single local notification.
 * In Expo Go, returns a placeholder ID (notifications not supported).
 */
async function scheduleLocalNotification(
    todo: Todo,
    task: Task,
    slot: ReminderSlot,
    fireAt: Date,
): Promise<string> {
    if (_isExpoGo) {
        return `expo-go-placeholder-${todo.id}-${Date.now()}`;
    }

    const isAlarm = slot.type === 'alarm' || slot.type === 'both';
    const channelId = isAlarm ? 'alarm-channel' : 'default';

    const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
            title: `${isAlarm ? '⏰ ' : ''}${task.title}`,
            body: todo.title,
            sound: true,
            priority: isAlarm
                ? Notifications.AndroidNotificationPriority.MAX
                : Notifications.AndroidNotificationPriority.HIGH,
            data: {
                todoId: todo.id,
                taskId: todo.task_id,
                type: slot.type,
            },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            channelId,
        },
    });

    return notificationId;
}

/**
 * Schedule reminders for a single todo based on reminder settings.
 * Returns the number of reminders scheduled.
 * In Expo Go: persists to DB but skips local notification scheduling.
 */
export async function scheduleRemindersForTodo(
    todo: Todo,
    task: Task,
    allSettings: ReminderSettings[],
): Promise<number> {
    const dueDateTime = resolveDueDateTime(todo, task);
    if (!dueDateTime) return 0;

    const settings = findApplicableSettings(allSettings, task.group_id);
    if (!settings) return 0;

    const now = new Date();
    let count = 0;

    for (let i = 0; i < settings.slots.length; i++) {
        const slot = settings.slots[i];
        if (!slot.enabled) continue;

        const fireAt = new Date(dueDateTime.getTime() - slot.minutes_before * 60 * 1000);
        if (fireAt <= now) continue;

        try {
            const notificationId = await scheduleLocalNotification(todo, task, slot, fireAt);

            await supabase.from('scheduled_reminders').upsert({
                user_id: todo.user_id,
                todo_id: todo.id,
                slot_number: i + 1,
                fire_at: fireAt.toISOString(),
                type: slot.type,
                notification_id: notificationId,
            }, {
                onConflict: 'todo_id,slot_number',
            });

            count++;
        } catch (error) {
            console.warn(`Failed to schedule reminder slot ${i + 1} for todo ${todo.id}:`, error);
        }
    }

    return count;
}

/**
 * Schedule reminders for multiple todos at once.
 */
export async function scheduleRemindersForTodos(
    todos: Todo[],
    task: Task,
    allSettings: ReminderSettings[],
): Promise<number> {
    let total = 0;
    for (const todo of todos) {
        const count = await scheduleRemindersForTodo(todo, task, allSettings);
        total += count;
    }
    return total;
}

/**
 * Cancel all scheduled reminders for a specific todo.
 */
export async function cancelRemindersForTodo(todoId: string): Promise<void> {
    try {
        const { data: reminders } = await supabase
            .from('scheduled_reminders')
            .select('*')
            .eq('todo_id', todoId);

        if (reminders && reminders.length > 0) {
            if (!_isExpoGo) {
                for (const reminder of reminders) {
                    if (reminder.notification_id) {
                        try {
                            await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
                        } catch {
                            // Notification may have already fired
                        }
                    }
                }
            }

            await supabase
                .from('scheduled_reminders')
                .delete()
                .eq('todo_id', todoId);
        }
    } catch (error) {
        console.warn('Failed to cancel reminders for todo:', error);
    }
}

/**
 * Reschedule all reminders for a user.
 * Called when reminder settings change.
 */
export async function rescheduleAllReminders(
    userId: string,
    allSettings: ReminderSettings[],
): Promise<number> {
    try {
        if (!_isExpoGo) {
            const { data: existing } = await supabase
                .from('scheduled_reminders')
                .select('notification_id')
                .eq('user_id', userId);

            if (existing) {
                for (const r of existing) {
                    if (r.notification_id) {
                        try {
                            await Notifications.cancelScheduledNotificationAsync(r.notification_id);
                        } catch {
                            // Notification may have already fired
                        }
                    }
                }
            }
        }

        await supabase
            .from('scheduled_reminders')
            .delete()
            .eq('user_id', userId);

        const { data: todos } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .eq('completed', false)
            .not('due_date', 'is', null);

        if (!todos || todos.length === 0) return 0;

        const taskIds = [...new Set(todos.map(t => t.task_id))];
        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .in('id', taskIds);

        if (!tasks) return 0;

        const taskMap = new Map(tasks.map(t => [t.id, t as Task]));

        let total = 0;
        for (const todo of todos) {
            const task = taskMap.get(todo.task_id);
            if (!task) continue;
            const count = await scheduleRemindersForTodo(todo as Todo, task, allSettings);
            total += count;
        }

        return total;
    } catch (error) {
        console.warn('Failed to reschedule all reminders:', error);
        return 0;
    }
}
