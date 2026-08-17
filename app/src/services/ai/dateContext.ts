/**
 * The date context given to the AI, in one place.
 *
 * Three defects motivated this helper, all found by the prompt-160 evaluation:
 *
 * 1. **The model cannot resolve weekday names.** The tag used to be
 *    `[CURRENT DATE: 2026-08-17]`. Asked for "next Monday" or "this Saturday", the model
 *    scored **0/9**, deterministically, across repeated runs — "next Monday" landed on a
 *    Friday. For a reminder app that means reminders fire on the wrong day.
 *
 *    Adding the weekday to the tag (`2026-08-17 (Monday)`) was tried first and changed
 *    **nothing** — the output was byte-identical, still 0/9. The model does not reliably
 *    do calendar arithmetic even when told what day it is. So this helper does the
 *    arithmetic in TypeScript and hands the model a lookup table instead. Dates are a
 *    solved problem in code and an unsolved one in a language model; this keeps them
 *    where they belong.
 *
 * 2. **UTC instead of local time.** The tag was built with `toISOString()`, which is UTC.
 *    For a user in IST (UTC+05:30), every task created before 05:30 local was dated to the
 *    previous day — and India is a primary market. Dates now come from the device's local
 *    calendar.
 *
 * 3. **Four copies.** The logic lived in openai/gemini × task/branch, which is how it
 *    drifted. All four now call this.
 */

const WEEKDAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

/** Local calendar date as `YYYY-MM-DD` — never UTC. */
function isoLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * A pre-resolved calendar the model can look up instead of compute.
 *
 * Each weekday maps to its **next occurrence** within the coming seven days. Both "this
 * Saturday" and "next Saturday" resolve to that same date, which is how the phrases are
 * ordinarily used and what date parsers such as chrono do: said on a Monday, "next
 * Monday" means a week today, and "this Friday" means the Friday four days away. The
 * genuinely ambiguous "the Saturday after next" is deliberately not covered — better to
 * leave it unresolved than to guess.
 *
 * Roughly ten short lines, against a prompt that is already several thousand tokens.
 */
export function buildDateContext(now: Date = new Date()): string {
    const today = isoLocal(now);
    const todayName = WEEKDAYS[now.getDay()];
    const tomorrow = addDays(now, 1);

    const lines: string[] = [
        `[CURRENT DATE: ${today} (${todayName})]`,
        '',
        '[DATE REFERENCE — already calculated. Use these exact dates; do not work them',
        'out yourself. "this <day>" and "next <day>" both mean the next occurrence below.]',
        `today = ${today} (${todayName})`,
        `tomorrow = ${isoLocal(tomorrow)} (${WEEKDAYS[tomorrow.getDay()]})`,
    ];

    for (let offset = 1; offset <= 7; offset++) {
        const d = addDays(now, offset);
        lines.push(`${WEEKDAYS[d.getDay()]} = ${isoLocal(d)}`);
    }

    return lines.join('\n');
}
