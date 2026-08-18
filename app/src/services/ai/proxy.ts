import { supabase } from '../../lib/supabase';

/**
 * Client half of the ai-proxy Supabase Edge Function.
 *
 * AI provider keys are no longer present in the app at all — the proxy holds
 * them. These helpers return a plain `Response` so the provider modules keep
 * their existing status/parsing logic unchanged.
 *
 * Every AI call in the app goes through here, which makes this the one place
 * that can guarantee a request eventually ends (F4). Before, nothing in the
 * app had a timeout: on a stalled connection `fetch` never settles, so the
 * spinner span forever, the fallback to the second provider never ran, and the
 * only escape was to force-quit the app.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const AI_PROXY_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`;

/**
 * Chat generation is normally 2-4s. 30s is deliberately generous: the point is
 * to bound the failure, not to cut off a slow-but-working request.
 */
export const CHAT_TIMEOUT_MS = 30_000;

/**
 * Transcription uploads an audio file, so it is slower and more sensitive to a
 * weak uplink than chat.
 */
export const TRANSCRIBE_TIMEOUT_MS = 60_000;

/** A request was given up on because it took too long. */
export class AiTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`The AI service did not respond within ${Math.round(timeoutMs / 1000)}s.`);
        this.name = 'AiTimeoutError';
    }
}

/** A request was cancelled by the caller (e.g. the user left the screen). */
export class AiCancelledError extends Error {
    constructor() {
        super('The request was cancelled.');
        this.name = 'AiCancelledError';
    }
}

/**
 * The server refused the request because the caller is over their quota (F3).
 *
 * This is a distinct type because it must NOT be treated as a provider failure.
 * The proxy's budget is shared across providers, so falling back to Gemini after
 * an OpenAI 429 just spends a second request to be refused again, and the user
 * ends up reading "check your connection" about a connection that is fine.
 */
export class AiRateLimitError extends Error {
    readonly retryAfterSeconds: number;

    constructor(retryAfterSeconds: number) {
        super(rateLimitMessage(retryAfterSeconds));
        this.name = 'AiRateLimitError';
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

function rateLimitMessage(seconds: number): string {
    if (seconds <= 90) {
        return `You've made a lot of AI requests. Please try again in ${Math.max(1, Math.ceil(seconds))} seconds.`;
    }
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
        return `You've made a lot of AI requests. Please try again in ${minutes} minutes.`;
    }
    const hours = Math.ceil(minutes / 60);
    return `You've reached today's AI request limit. Please try again in ${hours} hour${hours === 1 ? '' : 's'}.`;
}

/**
 * Turn a 429 into a typed error at the single point every AI call passes
 * through, so no individual provider module has to remember to handle it.
 */
function throwIfRateLimited(response: Response): Response {
    if (response.status !== 429) return response;

    const header = Number(response.headers.get('Retry-After'));
    const retryAfter = Number.isFinite(header) && header > 0 ? header : 60;
    throw new AiRateLimitError(retryAfter);
}

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || ANON_KEY;
    return {
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
    };
}

/**
 * `fetch` with a deadline, and optional caller-driven cancellation.
 *
 * Timeout and cancellation both abort the same request but mean different
 * things to the user — one is a service problem worth retrying or falling back
 * from, the other is something they asked for and must not surface as an
 * error. They are reported as distinct error types so callers can tell them
 * apart; `fetch` itself reports both as an indistinguishable `AbortError`.
 */
async function fetchWithTimeout(
    init: RequestInit,
    timeoutMs: number,
    signal?: AbortSignal,
): Promise<Response> {
    if (signal?.aborted) {
        throw new AiCancelledError();
    }

    const controller = new AbortController();
    let timedOut = false;

    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    const forwardAbort = () => controller.abort();
    signal?.addEventListener('abort', forwardAbort);

    try {
        return await fetch(AI_PROXY_URL, { ...init, signal: controller.signal });
    } catch (error) {
        // Translate the generic AbortError into the reason it happened.
        if (timedOut) throw new AiTimeoutError(timeoutMs);
        if (signal?.aborted) throw new AiCancelledError();
        throw error;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', forwardAbort);
    }
}

/** Forward a JSON request to a named upstream provider. */
export async function proxyJson(
    target: 'openai-chat' | 'gemini-generate',
    body: unknown,
    signal?: AbortSignal,
): Promise<Response> {
    return throwIfRateLimited(
        await fetchWithTimeout(
            {
                method: 'POST',
                headers: {
                    ...(await authHeaders()),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ target, body }),
            },
            CHAT_TIMEOUT_MS,
            signal,
        ),
    );
}

/** Forward a multipart request (audio transcription). */
export async function proxyFormData(
    form: FormData,
    signal?: AbortSignal,
): Promise<Response> {
    return throwIfRateLimited(
        await fetchWithTimeout(
            {
                method: 'POST',
                // No Content-Type — fetch sets it with the multipart boundary.
                headers: await authHeaders(),
                body: form,
            },
            TRANSCRIBE_TIMEOUT_MS,
            signal,
        ),
    );
}
