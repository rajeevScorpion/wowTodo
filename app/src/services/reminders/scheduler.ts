import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { isExpoGo } from '../../lib/expoGoDetect';
import type { Database } from '../../types/database';
import {
    Todo,
    Task,
    ReminderSettings,
    ReminderSettingsRow,
    ReminderSlot,
    ScheduledReminder,
    rowToReminderSettings,
} from '../../types';

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
 * The OS caps how many local notifications an app may have pending. iOS silently
 * discards anything beyond 64 — no error, the reminder simply never fires. We
 * schedule only the soonest MAX_PENDING reminders and top the window up whenever
 * reminders are rescheduled, so a user with hundreds of todos still reliably
 * gets the ones that matter next.
 */
const MAX_PENDING_NOTIFICATIONS = 60;

interface ReminderCandidate {
    todo: Todo;
    task: Task;
    slot: ReminderSlot;
    slotNumber: number;
    fireAt: Date;
}

/**
 * Work out every reminder that *should* exist for a set of todos. Pure and
 * synchronous — no I/O — so the whole plan can be computed, sorted and trimmed
 * before a single notification is scheduled.
 */
export function buildReminderCandidates(
    todos: Todo[],
    taskFor: (todo: Todo) => Task | undefined,
    allSettings: ReminderSettings[],
    now: Date,
): ReminderCandidate[] {
    const candidates: ReminderCandidate[] = [];

    for (const todo of todos) {
        const task = taskFor(todo);
        if (!task) continue;

        const dueDateTime = resolveDueDateTime(todo, task);
        if (!dueDateTime) continue;

        const settings = findApplicableSettings(allSettings, task.group_id);
        if (!settings) continue;

        for (let i = 0; i < settings.slots.length; i++) {
            const slot = settings.slots[i];
            if (!slot.enabled) continue;

            const fireAt = new Date(dueDateTime.getTime() - slot.minutes_before * 60 * 1000);
            if (fireAt <= now) continue;

            candidates.push({ todo, task, slot, slotNumber: i + 1, fireAt });
        }
    }

    // Soonest first, so trimming to the cap keeps the most imminent reminders.
    candidates.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
    return candidates;
}

/**
 * Schedule a batch of candidates and persist them in a single round trip.
 * Previously this issued one upsert per slot, which meant 3 network calls per
 * todo — 300 sequential calls for a 100-todo reschedule.
 */
async function scheduleCandidates(candidates: ReminderCandidate[]): Promise<number> {
    const rows: Database['public']['Tables']['scheduled_reminders']['Insert'][] = [];

    for (const c of candidates) {
        try {
            const notificationId = await scheduleLocalNotification(c.todo, c.task, c.slot, c.fireAt);
            rows.push({
                user_id: c.todo.user_id,
                todo_id: c.todo.id,
                slot_number: c.slotNumber,
                fire_at: c.fireAt.toISOString(),
                type: c.slot.type,
                notification_id: notificationId,
            });
        } catch (error) {
            console.warn(`Failed to schedule reminder slot ${c.slotNumber} for todo ${c.todo.id}:`, error);
        }
    }

    if (rows.length === 0) return 0;

    const { error } = await supabase
        .from('scheduled_reminders')
        .upsert(rows, { onConflict: 'todo_id,slot_number' });

    if (error) {
        console.warn('Failed to persist scheduled reminders:', error);
    }

    return rows.length;
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
    const candidates = buildReminderCandidates([todo], () => task, allSettings, new Date());
    return scheduleCandidates(candidates);
}

/**
 * Schedule reminders for multiple todos at once.
 */
export async function scheduleRemindersForTodos(
    todos: Todo[],
    task: Task,
    allSettings: ReminderSettings[],
): Promise<number> {
    // Plan every todo up front so the whole set persists in one round trip
    // rather than one per todo.
    const candidates = buildReminderCandidates(todos, () => task, allSettings, new Date());
    return scheduleCandidates(candidates);
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

            // Cancel in parallel — sequentially awaiting hundreds of these made
            // changing a reminder setting take several seconds.
            if (existing) {
                await Promise.all(
                    existing
                        .map(r => r.notification_id)
                        .filter((id): id is string => Boolean(id))
                        .map(id =>
                            Notifications
                                .cancelScheduledNotificationAsync(id)
                                .catch(() => {
                                    // Already fired or unknown id — nothing to cancel.
                                }),
                        ),
                );
            }
        }

        await supabase
            .from('scheduled_reminders')
            .delete()
            .eq('user_id', userId);

        // Only todos that can still produce a future reminder.
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

        const candidates = buildReminderCandidates(
            todos as Todo[],
            todo => taskMap.get(todo.task_id),
            allSettings,
            new Date(),
        );

        if (candidates.length > MAX_PENDING_NOTIFICATIONS) {
            console.info(
                `Reminder window: ${candidates.length} due, scheduling the soonest ${MAX_PENDING_NOTIFICATIONS}.`,
            );
        }

        return scheduleCandidates(candidates.slice(0, MAX_PENDING_NOTIFICATIONS));
    } catch (error) {
        console.warn('Failed to reschedule all reminders:', error);
        return 0;
    }
}

const WINDOW_SYNC_THROTTLE_MS = 30 * 60 * 1000; // 30 minutes
const LAST_WINDOW_SYNC_KEY = 'wowtodo:reminders:lastWindowSync';

/**
 * Top up the rolling reminder window.
 *
 * Because only the soonest MAX_PENDING_NOTIFICATIONS reminders are ever handed
 * to the OS, something has to schedule the *next* batch as earlier ones fire.
 * This runs on cold start and whenever the app returns to the foreground,
 * throttled so it costs nothing on rapid app switching.
 *
 * Self-contained: it loads the user's reminder settings itself so it can be
 * called from anywhere without plumbing React Query state through.
 */
export async function syncReminderWindow(
    userId: string,
    options: { force?: boolean } = {},
): Promise<number> {
    if (_isExpoGo) return 0;

    try {
        if (!options.force) {
            const last = await AsyncStorage.getItem(LAST_WINDOW_SYNC_KEY);
            if (last && Date.now() - Number(last) < WINDOW_SYNC_THROTTLE_MS) {
                return 0;
            }
        }

        const { data: rows, error } = await supabase
            .from('reminder_settings')
            .select('*')
            .eq('user_id', userId);

        if (error || !rows || rows.length === 0) return 0;

        // The table stores slots as flat slot1_*/slot2_*/slot3_* columns; the
        // scheduler works with the mapped `slots` array. Must go through the
        // same mapper the rest of the app uses.
        const settings = (rows as ReminderSettingsRow[]).map(rowToReminderSettings);

        const scheduled = await rescheduleAllReminders(userId, settings);
        await AsyncStorage.setItem(LAST_WINDOW_SYNC_KEY, String(Date.now()));
        return scheduled;
    } catch (err) {
        console.warn('Reminder window sync failed:', err);
        return 0;
    }
}
