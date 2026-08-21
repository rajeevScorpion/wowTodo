/**
 * Writes one row to public.ai_runs per AI request (migration 0017).
 *
 * The prompt-160 evaluation recorded the gap this closes: nothing anywhere
 * captured prompt version, latency, cost or fallback rate, so a broken path was
 * indistinguishable from a working one and A/B attribution was impossible.
 *
 * Two rules, both enforced by the shape of this module rather than by discipline:
 *
 *  - **Never records content.** There is no parameter for the utterance, the
 *    transcript, the task title or a provider error message. `errorCode` is a
 *    short machine code and the column caps it at 64 characters.
 *  - **Never fails the request.** Metrics are not the product. A failure to
 *    record is logged and swallowed; refusing to serve a user because a
 *    telemetry insert failed would be a self-inflicted outage.
 */

export type RunOutcome = 'ok' | 'clarified' | 'invalid' | 'error' | 'rate_limited';

export interface RunRecord {
    userId: string;
    kind: 'task' | 'branch' | 'transcribe';
    outcome: RunOutcome;
    agent?: string | null;
    promptVersion?: string | null;
    model?: string | null;
    routerModel?: string | null;
    errorCode?: string | null;
    fallbackUsed?: boolean;
    latencyMs?: number | null;
    tokensIn?: number | null;
    tokensOut?: number | null;
    taskId?: string | null;
}

export async function recordRun(run: RunRecord): Promise<void> {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
        console.error('ai_runs: not configured (SUPABASE_URL / SERVICE_ROLE_KEY)');
        return;
    }

    try {
        const res = await fetch(`${url}/rest/v1/ai_runs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                user_id: run.userId,
                kind: run.kind,
                outcome: run.outcome,
                agent: run.agent ?? null,
                prompt_version: run.promptVersion ?? null,
                model: run.model ?? null,
                router_model: run.routerModel ?? null,
                error_code: run.errorCode ? run.errorCode.slice(0, 64) : null,
                fallback_used: run.fallbackUsed ?? false,
                latency_ms: run.latencyMs ?? null,
                tokens_in: run.tokensIn ?? null,
                tokens_out: run.tokensOut ?? null,
                task_id: run.taskId ?? null,
            }),
        });
        if (!res.ok) {
            console.error(`ai_runs: insert ${res.status}:`, (await res.text()).slice(0, 200));
        }
    } catch (err) {
        console.error('ai_runs: insert failed:', err);
    }
}
