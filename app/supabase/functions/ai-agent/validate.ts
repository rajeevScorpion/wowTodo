/**
 * Deterministic gate between the model and the database.
 *
 * The legacy pipeline validated in `services/ai/openai.ts` and never rejected
 * anything across 27 calls — structured output from JSON mode is genuinely
 * reliable. That is not the risk this guards against. The risk is output that is
 * *well-formed and wrong*: a due_date in the past, a time the user never gave, a
 * Hindi request answered in English. Those parse perfectly and then fire an alarm
 * at the wrong hour.
 *
 * Two categories, and the distinction is the whole design:
 *
 *   **Fix** — unambiguously safe to correct, and correcting is better than
 *   spending a second model call. Trimming, deduplication, dropping empty
 *   entries, normalising HH:MM:SS.
 *
 *   **Problem** — the model has to try again, because any correction we made up
 *   would be a guess of the kind this whole redesign exists to stop.
 *
 * Problems trigger exactly one repair attempt. If that also fails, the caller
 * falls back to the legacy path — a worse plan beats no plan.
 */

import type { AgentTask, AgentTodo, Language } from './types.ts';
import { isIsoDate } from './dateContext.ts';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HHMMSS = /^([01]\d|2[0-3]):([0-5]\d):[0-5]\d$/;
const DEVANAGARI = /[ऀ-ॿ]/;

/** Upper bound on steps. Not a target — see the "How many steps" rule in base.ts. */
const MAX_TODOS = 30;
const MAX_TITLE = 200;

export interface ValidationResult {
    task: AgentTask | null;
    /** Human-readable, fed back to the model verbatim on the repair attempt. */
    problems: string[];
    /** Short machine codes for ai_runs.error_code. Never contains user content. */
    codes: string[];
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const normTitle = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

export interface ValidateOptions {
    today: string;
    language: Language;
    /**
     * Whether the utterance actually named a time of day, as judged by the
     * router. When false, every clock time in the response is stripped.
     *
     * This is enforcement, not belt-and-braces. `base.ts` forbids invented times
     * in two separate places and the first real run still produced
     * `event_time: 19:00` for "this Sunday". Reminders fire off these fields, so
     * the difference between an empty field and a plausible guess is the
     * difference between nothing happening and an alarm at 7pm on a day the user
     * had no plans.
     *
     * Stripping is a silent fix rather than a repair: there is exactly one
     * correct correction and no judgement involved, so spending a second model
     * call to reach it would be waste.
     */
    allowTimes: boolean;
}

export function validate(raw: unknown, opts: ValidateOptions): ValidationResult {
    const problems: string[] = [];
    const codes: string[] = [];
    const fail = (problem: string, code: string) => {
        problems.push(problem);
        codes.push(code);
    };

    if (!raw || typeof raw !== 'object') {
        fail('The response was not a JSON object.', 'not_object');
        return { task: null, problems, codes };
    }

    const obj = raw as Record<string, unknown>;

    // ── title / description ─────────────────────────────────────────────────
    const title = str(obj.title).slice(0, MAX_TITLE);
    if (!title) fail('"title" is missing or empty.', 'no_title');

    const description = str(obj.description);

    // ── todos ───────────────────────────────────────────────────────────────
    const rawTodos = Array.isArray(obj.todos) ? obj.todos : [];
    if (!Array.isArray(obj.todos)) fail('"todos" must be an array.', 'todos_not_array');

    const todos: AgentTodo[] = [];
    const seen = new Set<string>();

    for (const entry of rawTodos) {
        // The legacy schema allowed a bare string; keep accepting it so a model
        // that reverts to the older shape is corrected rather than rejected.
        const t = typeof entry === 'string' ? { title: entry } : entry;
        if (!t || typeof t !== 'object') continue;

        const rec = t as Record<string, unknown>;
        const todoTitle = str(rec.title).slice(0, MAX_TITLE);
        if (!todoTitle) continue;                       // fix: drop the empty entry

        const key = normTitle(todoTitle);
        if (seen.has(key)) continue;                    // fix: drop the duplicate
        seen.add(key);

        // ── due_date ────────────────────────────────────────────────────────
        let dueDate: string | null = null;
        if (rec.due_date != null && rec.due_date !== '') {
            if (!isIsoDate(rec.due_date)) {
                fail(`Step "${todoTitle}" has a due_date that is not a real YYYY-MM-DD date.`, 'bad_due_date');
            } else if ((rec.due_date as string) < opts.today) {
                // Not fixable by us: we cannot know whether the user meant next
                // year, or whether the step simply should not have a date.
                fail(
                    `Step "${todoTitle}" has due_date ${rec.due_date}, which is before today (${opts.today}). Use a date from the DATE REFERENCE block, or null.`,
                    'past_due_date',
                );
            } else {
                dueDate = rec.due_date as string;
            }
        }

        // ── due_time ────────────────────────────────────────────────────────
        let dueTime: string | null = null;
        if (rec.due_time != null && rec.due_time !== '') {
            const v = String(rec.due_time).trim();
            if (HHMM.test(v)) dueTime = v;
            else if (HHMMSS.test(v)) dueTime = v.slice(0, 5);   // fix: drop seconds
            else fail(`Step "${todoTitle}" has a due_time that is not HH:MM.`, 'bad_due_time');
        }

        // A time with no date cannot be scheduled against anything — the reminder
        // scheduler needs both. Dropping the time is the conservative correction;
        // inventing a date to keep it would be exactly the fabrication this
        // pipeline exists to avoid.
        if (dueTime && !dueDate) dueTime = null;

        // The user never said an hour, so there is no hour.
        if (!opts.allowTimes) dueTime = null;

        const note = str(rec.note);

        todos.push({ title: todoTitle, due_date: dueDate, due_time: dueTime, note: note || null });
    }

    if (todos.length === 0) {
        fail('"todos" contained no usable steps.', 'todos_empty');
    } else if (todos.length > MAX_TODOS) {
        // Fix rather than reject: the first N are the ones that matter, and a
        // 40-step list is a quality problem, not an invalid one.
        todos.length = MAX_TODOS;
    }

    // ── event_time ──────────────────────────────────────────────────────────
    let eventTime: string | null = null;
    if (obj.event_time != null && obj.event_time !== '') {
        const v = String(obj.event_time).trim();
        const parsed = new Date(v);
        if (Number.isNaN(parsed.getTime())) {
            fail('"event_time" is not a valid datetime.', 'bad_event_time');
        } else if (v.slice(0, 10) < opts.today) {
            fail(`"event_time" ${v} is before today (${opts.today}).`, 'past_event_time');
        } else if (!opts.allowTimes) {
            // event_time is a *moment*, and the user named no moment. Keeping the
            // date alone would render as midnight in the UI, which reads as a
            // decision rather than an absence. The day survives on the todos'
            // due_date, which is where a day belongs.
            eventTime = null;
        } else {
            eventTime = v;
        }
    }

    // ── groups ──────────────────────────────────────────────────────────────
    const g = (obj.groups ?? {}) as Record<string, unknown>;
    const selected = str(g.selected) || str(obj.group);      // legacy single-string shape
    if (!selected) {
        fail('"groups.selected" is missing.', 'no_group');
    }
    const strings = (v: unknown): string[] =>
        Array.isArray(v) ? v.map(str).filter(Boolean) : [];

    const groups = {
        selected,
        existing_ranked: strings(g.existing_ranked),
        new_suggestions: strings(g.new_suggestions),
    };

    // ── language ────────────────────────────────────────────────────────────
    // The measured failure (V16): a Hindi request written in Latin script comes
    // back in English. Checking the script of the OUTPUT is the only reliable
    // signal — asking the model whether it complied is not.
    if (opts.language === 'hi' && todos.length > 0) {
        const body = [title, description, ...todos.map((t) => t.title)].join(' ');
        if (!DEVANAGARI.test(body)) {
            fail(
                'The output language must be Hindi in Devanagari script, but the response is not in Devanagari. Rewrite every value in Devanagari.',
                'language_mismatch',
            );
        }
    }

    if (problems.length > 0) return { task: null, problems, codes };

    return {
        task: { title, description, event_time: eventTime, todos, groups },
        problems,
        codes,
    };
}
