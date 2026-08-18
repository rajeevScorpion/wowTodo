/**
 * ai-proxy — keeps AI provider credentials off the client.
 *
 * Before this existed, EXPO_PUBLIC_OPENAI_API_KEY and EXPO_PUBLIC_GEMINI_API_KEY
 * were inlined into the app bundle by Expo, which means anyone who installs the
 * APK can extract them and spend against the account. Those keys now live only
 * here, as Supabase function secrets.
 *
 * This is deliberately a thin passthrough: prompt construction, response
 * validation, normalisation and the OpenAI→Gemini fallback all remain in the
 * app exactly as before. The only thing that moved is credential injection.
 *
 * Abuse control:
 *  - callers must present a valid Supabase JWT (verify_jwt is on)
 *  - only three upstream targets are reachable
 *  - only whitelisted models are accepted, so this cannot be used as a general
 *    purpose relay to expensive models
 *  - request bodies are capped (see MAX_*_BYTES)
 *  - per-user quotas, two windows per kind (see LIMITS)
 *
 * The last two close defect F3. Authentication and the model allow-list bound
 * *who* may call and *what* they may call, but nothing bounded *how much* — so a
 * single authenticated user could loop this endpoint and spend the owner's OpenAI
 * balance. That became a live exposure the moment real keys were deployed.
 *
 * Deploy:  supabase functions deploy ai-proxy
 * Secrets: supabase secrets set OPENAI_API_KEY=... GEMINI_API_KEY=...
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
// gemini-2.0-flash was retired by Google and returns 404 "no longer available", which
// silently killed the fallback: when OpenAI failed the app had nothing behind it and
// surfaced only the generic "Could not reach the AI service".
//
// Measured against a freshly issued key on 2026-08-17:
//   gemini-2.5-flash / -flash-lite   404 — "no longer available to NEW users"
//   gemini-3.1-flash-lite            200 but ~43s — unusable while F4 (no timeout) is open
//   gemini-3-flash-preview           200, ~8s, valid task JSON
//   gemini-flash-latest              intermittent: 200,503,200 then 503,503
//
// Neither single choice is safe. The alias is immune to retirement but flaky under load;
// the pinned preview model is fast and reliable today but will eventually be retired the
// same way 2.0-flash was. So try the alias first and fall back to the pinned model,
// giving one route past each failure mode. Order matters: alias first so that when
// Google promotes a new flash model this picks it up without a code change.
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3-flash-preview'];
const geminiUrl = (model: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Models this proxy is willing to bill for. */
const ALLOWED_CHAT_MODELS = new Set(['gpt-4o-mini']);
const ALLOWED_TRANSCRIBE_MODELS = new Set(['whisper-1']);

/**
 * Request body caps.
 *
 * A chat request is a prompt plus a little JSON scaffolding; the app's longest
 * realistic prompt is a few kilobytes, so 64 KB is generous by an order of
 * magnitude while still refusing a megabyte of padding sent purely to burn input
 * tokens. Audio is capped below Whisper's own 25 MB limit — the app records short
 * clips, and rejecting oversize uploads here avoids paying to forward them.
 */
const MAX_JSON_BYTES = 64 * 1024;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/**
 * Per-user quotas, as [windowSeconds, limit] pairs.
 *
 * Two windows per kind. The short one stops a runaway loop within seconds; the
 * long one bounds the daily bill even if the caller paces themselves to stay
 * under the burst limit. Both must pass.
 *
 * Sized against real use: generating a task list is one chat call, and a heavy
 * session might be a dozen. 15/minute and 200/day leave an ordinary user — and a
 * closed tester — far below the ceiling while capping worst-case spend.
 */
const LIMITS: Record<'chat' | 'transcribe', Array<[number, number]>> = {
    chat: [[60, 15], [86_400, 200]],
    transcribe: [[60, 20], [86_400, 300]],
};

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

function requireKey(name: string): string | null {
    const value = Deno.env.get(name);
    return value && value.trim() ? value : null;
}

/**
 * The caller's user id, read from the JWT payload.
 *
 * The signature is NOT verified here, and deliberately so: `verify_jwt` is on for
 * this function, so the platform has already rejected anything unsigned, expired
 * or forged before our handler runs. Re-verifying would mean shipping the JWT
 * secret into the function for no gain. This only decodes what has already been
 * proven authentic.
 */
function userIdFromJwt(authHeader: string): string | null {
    try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = token.split('.')[1];
        if (!payload) return null;
        // base64url -> base64, and restore the stripped padding.
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const claims = JSON.parse(atob(padded));
        return typeof claims?.sub === 'string' ? claims.sub : null;
    } catch {
        return null;
    }
}

/**
 * Consume one unit against every window for `kind`.
 *
 * Returns null when the request may proceed, or a ready-to-send 429 when it may
 * not. Windows are checked shortest-first so a burst is reported with the short
 * retry-after rather than "come back tomorrow".
 */
async function enforceQuota(userId: string, kind: 'chat' | 'transcribe'): Promise<Response | null> {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Fail CLOSED. If the quota store is unreachable the safe answer is to refuse:
    // an open failure mode would mean the one condition under which the limiter
    // stops working is also the condition an attacker can most easily provoke.
    if (!url || !serviceKey) {
        console.error('ai-proxy: quota store not configured (SUPABASE_URL / SERVICE_ROLE_KEY)');
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
                console.error(`ai-proxy: quota rpc ${res.status}:`, await res.text());
                return json({ error: 'Rate limiting is unavailable; request refused.' }, 503);
            }
            rows = await res.json();
        } catch (err) {
            console.error('ai-proxy: quota rpc failed:', err);
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

/** Reject an oversize body from its declared length, before reading it. */
function tooLarge(req: Request, maxBytes: number): Response | null {
    const declared = Number(req.headers.get('content-length') ?? '0');
    if (declared > maxBytes) {
        return json(
            { error: `Request body too large (max ${Math.floor(maxBytes / 1024)} KB).` },
            413,
        );
    }
    return null;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    // verify_jwt handles authentication, but fail loudly rather than silently
    // proxying if the platform config is ever changed.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return json({ error: 'Missing Authorization header' }, 401);
    }

    // Every quota is per user, so a request we cannot attribute cannot be limited
    // and must not be proxied.
    const userId = userIdFromJwt(authHeader);
    if (!userId) {
        return json({ error: 'Could not identify the caller from the token' }, 401);
    }

    const contentType = req.headers.get('content-type') ?? '';

    try {
        // ── Audio transcription (multipart passthrough) ──────────────────────
        if (contentType.includes('multipart/form-data')) {
            const oversize = tooLarge(req, MAX_AUDIO_BYTES);
            if (oversize) return oversize;

            const limited = await enforceQuota(userId, 'transcribe');
            if (limited) return limited;

            const inbound = await req.formData();
            const model = String(inbound.get('model') ?? 'whisper-1');
            if (!ALLOWED_TRANSCRIBE_MODELS.has(model)) {
                return json({ error: `Model not allowed: ${model}` }, 400);
            }

            const apiKey = requireKey('OPENAI_API_KEY');
            if (!apiKey) {
                return json({ error: 'OPENAI_API_KEY is not configured on the server' }, 503);
            }

            const upstream = await fetch(OPENAI_TRANSCRIBE_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}` },
                body: inbound,
            });

            // Whisper is asked for response_format=text, so pass the body through
            // untouched and let the client keep its existing parsing.
            const text = await upstream.text();
            return new Response(text, {
                status: upstream.status,
                headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
            });
        }

        // ── JSON targets ────────────────────────────────────────────────────
        const oversize = tooLarge(req, MAX_JSON_BYTES);
        if (oversize) return oversize;

        // Content-Length is absent on a chunked request, so measure what actually
        // arrived rather than trusting the header to have been there.
        const raw = await req.text();
        if (new TextEncoder().encode(raw).length > MAX_JSON_BYTES) {
            return json(
                { error: `Request body too large (max ${MAX_JSON_BYTES / 1024} KB).` },
                413,
            );
        }

        let target: string;
        let body: { model?: string } & Record<string, unknown>;
        try {
            ({ target, body } = JSON.parse(raw));
        } catch {
            return json({ error: 'Request body is not valid JSON' }, 400);
        }

        if (target === 'openai-chat') {
            // Validate the request before looking at server configuration, so the
            // model whitelist is provably enforced even when no key is set.
            if (!ALLOWED_CHAT_MODELS.has(body?.model as string)) {
                return json({ error: `Model not allowed: ${body?.model}` }, 400);
            }

            // After validation, so a malformed request does not burn the caller's
            // quota — it never reaches a billable upstream either way.
            const limited = await enforceQuota(userId, 'chat');
            if (limited) return limited;

            const apiKey = requireKey('OPENAI_API_KEY');
            if (!apiKey) {
                return json({ error: 'OPENAI_API_KEY is not configured on the server' }, 503);
            }

            const upstream = await fetch(OPENAI_CHAT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
            });

            return new Response(await upstream.text(), {
                status: upstream.status,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        if (target === 'gemini-generate') {
            // Shares the 'chat' budget with openai-chat. Gemini is the *fallback* for
            // the same user action, so a separate allowance would let one prompt cost
            // two units and double the effective ceiling.
            const limited = await enforceQuota(userId, 'chat');
            if (limited) return limited;

            const apiKey = requireKey('GEMINI_API_KEY');
            if (!apiKey) {
                return json({ error: 'GEMINI_API_KEY is not configured on the server' }, 503);
            }

            // Try each model in turn. This is the *fallback* provider, so its job is to
            // work at all; a single hardcoded model is the wrong shape for that. Both
            // observed failure modes are survivable this way:
            //   404 — the model was retired (silent and permanent otherwise)
            //   503 — transient capacity ("experiencing high demand")
            // Any other status is returned as-is: a 400 means the caller's request is
            // wrong and retrying a different model would only mask it.
            let upstream: Response | null = null;
            for (const model of GEMINI_MODELS) {
                upstream = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (upstream.status !== 404 && upstream.status !== 503) break;
            }

            return new Response(await upstream!.text(), {
                status: upstream!.status,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        return json({ error: `Unknown target: ${target}` }, 400);
    } catch (err) {
        console.error('ai-proxy failure:', err);
        return json({ error: 'Proxy request failed' }, 500);
    }
});
