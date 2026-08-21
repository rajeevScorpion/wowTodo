/**
 * Per-user AI quota, shared by ai-proxy and ai-agent.
 *
 * Copied from ai-proxy without behavioural change (defect F3, migration 0015).
 * Two properties are load-bearing and must survive any edit here:
 *
 *  1. **Fail CLOSED.** If the quota store is unreachable the safe answer is to
 *     refuse. An open failure mode would mean the one condition under which the
 *     limiter stops working is also the condition an attacker can most easily
 *     provoke.
 *  2. **Windows shortest-first**, so a burst is reported with the short
 *     retry-after rather than "come back tomorrow".
 *
 * `ai-agent` charges the SAME 'chat' budget as ai-proxy. That is deliberate: the
 * two are alternative implementations of one user action, so a separate allowance
 * would let a caller double the effective ceiling by alternating between them.
 */

import { CORS_HEADERS, json } from './cors.ts';

export type QuotaKind = 'chat' | 'transcribe';

/**
 * Per-user quotas, as [windowSeconds, limit] pairs.
 *
 * Two windows per kind. The short one stops a runaway loop within seconds; the
 * long one bounds the daily bill even if the caller paces themselves to stay
 * under the burst limit. Both must pass.
 */
export const LIMITS: Record<QuotaKind, Array<[number, number]>> = {
    chat: [[60, 15], [86_400, 200]],
    transcribe: [[60, 20], [86_400, 300]],
};

/**
 * Consume one unit against every window for `kind`.
 *
 * Returns null when the request may proceed, or a ready-to-send 429 when it may
 * not.
 *
 * One unit is charged per **user action**, not per model call. `ai-agent` makes
 * two calls internally (router, then specialist); charging both would halve the
 * effective ceiling from 15 tasks/minute to 7 for no gain in protection, because
 * the function's own call count is bounded in code rather than by this budget.
 */
export async function enforceQuota(userId: string, kind: QuotaKind): Promise<Response | null> {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceKey) {
        console.error('quota: store not configured (SUPABASE_URL / SERVICE_ROLE_KEY)');
        return json({ error: 'Rate limiting is unavailable; request refused.' }, 503);
    }

    for (const [windowSeconds, limit] of LIMITS[kind]) {
        let rows: Array<{ allowed: boolean; retry_after: number }>;
        try {
            const res = await fetch(`${url}/rest/v1/rpc/consume_ai_quota`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({
                    p_user_id: userId,
                    p_kind: kind,
                    p_window_seconds: windowSeconds,
                    p_limit: limit,
                }),
            });
            if (!res.ok) {
                console.error(`quota: rpc ${res.status}:`, await res.text());
                return json({ error: 'Rate limiting is unavailable; request refused.' }, 503);
            }
            rows = await res.json();
        } catch (err) {
            console.error('quota: rpc failed:', err);
            return json({ error: 'Rate limiting is unavailable; request refused.' }, 503);
        }

        const decision = rows?.[0];
        if (decision && decision.allowed === false) {
            const retryAfter = Math.max(1, Number(decision.retry_after) || 1);
            return new Response(
                JSON.stringify({
                    error: 'Rate limit exceeded. Please wait before trying again.',
                    retry_after: retryAfter,
                }),
                {
                    status: 429,
                    headers: {
                        ...CORS_HEADERS,
                        'Content-Type': 'application/json',
                        'Retry-After': String(retryAfter),
                    },
                },
            );
        }
    }

    return null;
}
