/**
 * The resolved calendar handed to the specialist. Mirrors
 * src/services/ai/dateContext.ts, which carries the full reasoning.
 *
 * The short version: asked to resolve "next Monday" from a bare date, the model
 * scored 0/9 deterministically, and adding the weekday to the tag changed
 * nothing — it does not do calendar arithmetic reliably even when told what day
 * it is. So the arithmetic happens in code and the model gets a lookup table.
 *
 * ## Why `today` comes from the client
 *
 * The server has no idea what day it is *for the user*. Deno runs in UTC, and the
 * original client bug was exactly this: dates built with `toISOString()` meant
 * every task created before 05:30 local in IST — a primary market — was dated to
 * the previous day. Moving the pipeline server-side would have silently
 * reintroduced that bug for every user, so the device's local date travels with
 * the request.
 *
 * It is validated as a plain YYYY-MM-DD and never interpolated raw: a client
 * cannot use it to inject prompt text.
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True only for a well-formed, real calendar date. */
export function isIsoDate(value: unknown): value is string {
    if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isoUtc(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

/**
 * Resolve the client's date, or fall back to the server's.
 *
 * The fallback is logged rather than silent. A missing `today` means an older
 * client or a malformed request, and the consequence — dates off by one for
 * anyone east of UTC — is precisely the kind of fault that gets misattributed to
 * the model for weeks.
 */
export function resolveToday(clientToday: unknown): string {
    if (isIsoDate(clientToday)) return clientToday;
    const fallback = isoUtc(new Date());
    console.warn(`ai-agent: no valid client date, falling back to server UTC ${fallback}`);
    return fallback;
}

/** A pre-resolved seven-day calendar the model looks up instead of computing. */
export function buildDateContext(today: string): string {
    // Anchored at UTC midnight purely as a calendar cursor — `today` already IS
    // the user's local date, so no timezone maths happens here and none should.
    const base = new Date(`${today}T00:00:00Z`);
    const todayName = WEEKDAYS[base.getUTCDay()];
    const tomorrow = addDays(base, 1);

    const lines: string[] = [
        `[CURRENT DATE: ${today} (${todayName})]`,
        '',
        '[DATE REFERENCE — already calculated. Use these exact dates; do not work them',
        'out yourself. "this <day>" and "next <day>" both mean the next occurrence below.]',
        `today = ${today} (${todayName})`,
        `tomorrow = ${isoUtc(tomorrow)} (${WEEKDAYS[tomorrow.getUTCDay()]})`,
    ];

    for (let offset = 1; offset <= 7; offset++) {
        const d = addDays(base, offset);
        lines.push(`${WEEKDAYS[d.getUTCDay()]} = ${isoUtc(d)}`);
    }

    return lines.join('\n');
}
