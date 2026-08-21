import { buildReminderCandidates } from '../scheduler';
import type { ReminderSettings, ReminderSlot, Task, Todo } from '../../../types';

/**
 * buildReminderCandidates is the heart of reminder scheduling: it decides which
 * reminders should exist, when each fires, and — critically — the order used to
 * trim down to the OS pending-notification cap. It is pure, so it can be tested
 * exhaustively without touching Supabase or the notification APIs.
 */

const NOW = new Date('2026-08-17T10:00:00Z');

function makeTask(over: Partial<Task> = {}): Task {
    return {
        id: 'task-1',
        user_id: 'user-1',
        title: 'Launch party',
        description: null,
        source_text: null,
        source_type: 'text',
        group_id: null,
        event_time: null,
        parent_todo_id: null,
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
        ...over,
    };
}

function makeTodo(over: Partial<Todo> = {}): Todo {
    return {
        id: 'todo-1',
        task_id: 'task-1',
        user_id: 'user-1',
        title: 'Book the venue',
        completed: false,
        order: 0,
        due_date: null,
        due_time: null,
        note: null,
        is_branched: false,
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
        ...over,
    };
}

function slot(over: Partial<ReminderSlot> = {}): ReminderSlot {
    return { minutes_before: 30, type: 'notification', enabled: true, ...over };
}

function makeSettings(slots: ReminderSlot[], groupId: string | null = null): ReminderSettings {
    return {
        id: groupId ? `settings-${groupId}` : 'settings-global',
        user_id: 'user-1',
        group_id: groupId,
        slots,
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
    };
}

const taskFor = (task: Task) => () => task;

describe('buildReminderCandidates', () => {
    it('produces one candidate per enabled slot', () => {
        const task = makeTask();
        // Far enough out that even the 24h-before slot is still in the future.
        const todo = makeTodo({ due_date: '2026-08-25', due_time: '09:00' });
        const settings = makeSettings([
            slot({ minutes_before: 10 }),
            slot({ minutes_before: 60 }),
            slot({ minutes_before: 1440 }),
        ]);

        const result = buildReminderCandidates([todo], taskFor(task), [settings], NOW);

        expect(result).toHaveLength(3);
        // Sorted soonest-first, so the largest lead time (slot 3, 24h before)
        // comes first and the smallest (slot 1, 10 min before) comes last.
        expect(result.map(c => c.slotNumber)).toEqual([3, 2, 1]);
    });

    it('skips disabled slots', () => {
        const task = makeTask();
        const todo = makeTodo({ due_date: '2026-08-18', due_time: '09:00' });
        const settings = makeSettings([
            slot({ minutes_before: 10 }),
            slot({ minutes_before: 60, enabled: false }),
        ]);

        const result = buildReminderCandidates([todo], taskFor(task), [settings], NOW);

        expect(result).toHaveLength(1);
        expect(result[0].slot.minutes_before).toBe(10);
    });

    it('drops reminders whose fire time has already passed', () => {
        const task = makeTask();
        // Due 15 minutes from now, but one slot wants 60 minutes beforehand —
        // that moment is in the past and must not be scheduled.
        const dueSoon = new Date(NOW.getTime() + 15 * 60 * 1000);
        const todo = makeTodo({
            due_date: dueSoon.toISOString().slice(0, 10),
            due_time: dueSoon.toTimeString().slice(0, 5),
        });
        const settings = makeSettings([
            slot({ minutes_before: 5 }),
            slot({ minutes_before: 60 }),
        ]);

        const result = buildReminderCandidates([todo], taskFor(task), [settings], NOW);

        expect(result).toHaveLength(1);
        expect(result[0].slot.minutes_before).toBe(5);
        expect(result[0].fireAt.getTime()).toBeGreaterThan(NOW.getTime());
    });

    it('returns nothing when a todo has no resolvable due date', () => {
        const task = makeTask({ event_time: null });
        const todo = makeTodo({ due_date: null, due_time: null });

        const result = buildReminderCandidates([todo], taskFor(task), [makeSettings([slot()])], NOW);

        expect(result).toEqual([]);
    });

    it("falls back to the task's event_time when the todo has no due date", () => {
        const task = makeTask({ event_time: '2026-08-20T18:00:00Z' });
        const todo = makeTodo({ due_date: null, due_time: null });

        const result = buildReminderCandidates([todo], taskFor(task), [makeSettings([slot()])], NOW);

        expect(result).toHaveLength(1);
    });

    it('defaults to 09:00 when a due_date has no due_time', () => {
        const task = makeTask();
        const todo = makeTodo({ due_date: '2026-08-19', due_time: null });

        const result = buildReminderCandidates(
            [todo],
            taskFor(task),
            [makeSettings([slot({ minutes_before: 0 })])],
            NOW,
        );

        expect(result).toHaveLength(1);
        // Local 09:00 on the due date.
        expect(result[0].fireAt.getHours()).toBe(9);
        expect(result[0].fireAt.getMinutes()).toBe(0);
    });

    it('sorts candidates soonest-first so trimming keeps the most imminent', () => {
        const task = makeTask();
        const todos = [
            makeTodo({ id: 'far', due_date: '2026-09-01', due_time: '09:00' }),
            makeTodo({ id: 'near', due_date: '2026-08-18', due_time: '09:00' }),
            makeTodo({ id: 'mid', due_date: '2026-08-25', due_time: '09:00' }),
        ];

        const result = buildReminderCandidates(
            todos,
            taskFor(task),
            [makeSettings([slot({ minutes_before: 0 })])],
            NOW,
        );

        expect(result.map(c => c.todo.id)).toEqual(['near', 'mid', 'far']);

        const times = result.map(c => c.fireAt.getTime());
        expect([...times].sort((a, b) => a - b)).toEqual(times);
    });

    it('prefers a group-specific override over global settings', () => {
        const task = makeTask({ group_id: 'group-1' });
        const todo = makeTodo({ due_date: '2026-08-18', due_time: '09:00' });

        const global = makeSettings([slot({ minutes_before: 10 })], null);
        const override = makeSettings(
            [slot({ minutes_before: 90 }), slot({ minutes_before: 120 })],
            'group-1',
        );

        const result = buildReminderCandidates([todo], taskFor(task), [global, override], NOW);

        expect(result).toHaveLength(2);
        expect(result.map(c => c.slot.minutes_before)).toEqual([120, 90]);
    });

    it('falls back to global settings when the group has no override', () => {
        const task = makeTask({ group_id: 'group-without-override' });
        const todo = makeTodo({ due_date: '2026-08-18', due_time: '09:00' });

        const global = makeSettings([slot({ minutes_before: 10 })], null);
        const other = makeSettings([slot({ minutes_before: 90 })], 'some-other-group');

        const result = buildReminderCandidates([todo], taskFor(task), [global, other], NOW);

        expect(result).toHaveLength(1);
        expect(result[0].slot.minutes_before).toBe(10);
    });

    it('skips todos whose task cannot be resolved', () => {
        const todo = makeTodo({ due_date: '2026-08-18', due_time: '09:00' });

        const result = buildReminderCandidates(
            [todo],
            () => undefined,
            [makeSettings([slot()])],
            NOW,
        );

        expect(result).toEqual([]);
    });

    it('produces no candidates when the user has no settings at all', () => {
        const task = makeTask();
        const todo = makeTodo({ due_date: '2026-08-18', due_time: '09:00' });

        expect(buildReminderCandidates([todo], taskFor(task), [], NOW)).toEqual([]);
    });

    it('scales: many todos stay correctly ordered so the cap keeps the soonest', () => {
        const task = makeTask();
        // 100 todos across 100 days, deliberately built in reverse order.
        const todos = Array.from({ length: 100 }, (_, i) => {
            // +2 days minimum so the 24h-before slot is still in the future for
            // every todo and all 300 candidates survive.
            const d = new Date(NOW.getTime() + (100 - i + 2) * 24 * 60 * 60 * 1000);
            return makeTodo({ id: `todo-${i}`, due_date: d.toISOString().slice(0, 10), due_time: '09:00' });
        });
        const settings = makeSettings([
            slot({ minutes_before: 0 }),
            slot({ minutes_before: 60 }),
            slot({ minutes_before: 1440 }),
        ]);

        const result = buildReminderCandidates(todos, taskFor(task), [settings], NOW);

        expect(result).toHaveLength(300);

        // The first 60 — what actually reaches the OS — must be the 60 earliest.
        const window = result.slice(0, 60).map(c => c.fireAt.getTime());
        const allTimes = result.map(c => c.fireAt.getTime()).sort((a, b) => a - b);
        expect(window).toEqual(allTimes.slice(0, 60));
    });
});
