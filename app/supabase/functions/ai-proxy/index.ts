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
 *
 * Deploy:  supabase functions deploy ai-proxy
 * Secrets: supabase secrets set OPENAI_API_KEY=... GEMINI_API_KEY=...
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/** Models this proxy is willing to bill for. */
const ALLOWED_CHAT_MODELS = new Set(['gpt-4o-mini']);
const ALLOWED_TRANSCRIBE_MODELS = new Set(['whisper-1']);

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

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    // verify_jwt handles authentication, but fail loudly rather than silently
    // proxying if the platform config is ever changed.
    if (!req.headers.get('Authorization')) {
        return json({ error: 'Missing Authorization header' }, 401);
    }

    const contentType = req.headers.get('content-type') ?? '';

    try {
        // ── Audio transcription (multipart passthrough) ──────────────────────
        if (contentType.includes('multipart/form-data')) {
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
        const { target, body } = await req.json();

        if (target === 'openai-chat') {
            // Validate the request before looking at server configuration, so the
            // model whitelist is provably enforced even when no key is set.
            if (!ALLOWED_CHAT_MODELS.has(body?.model)) {
                return json({ error: `Model not allowed: ${body?.model}` }, 400);
            }

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
            const apiKey = requireKey('GEMINI_API_KEY');
            if (!apiKey) {
                return json({ error: 'GEMINI_API_KEY is not configured on the server' }, 503);
            }

            const upstream = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            return new Response(await upstream.text(), {
                status: upstream.status,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        return json({ error: `Unknown target: ${target}` }, 400);
    } catch (err) {
        console.error('ai-proxy failure:', err);
        return json({ error: 'Proxy request failed' }, 500);
    }
});
