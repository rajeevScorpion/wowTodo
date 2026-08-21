/**
 * Minimal OpenAI chat client for the Edge Functions.
 *
 * ai-proxy forwards a client-built body untouched; ai-agent builds its own, so it
 * needs a small typed helper rather than a passthrough. Kept deliberately thin —
 * no retry loop, no streaming of the upstream response. The orchestrator decides
 * what a failure means; this only reports it.
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Models ai-agent is willing to bill for.
 *
 * Separate from ai-proxy's list on purpose. ai-proxy accepts a model chosen by the
 * *client*, so its list is a security boundary; this one is chosen by our own
 * server code, so it is a guard against a typo or a bad config value silently
 * routing spend to an expensive model.
 */
export const AGENT_MODELS = new Set(['gpt-4o-mini', 'gpt-4o']);

export interface ChatUsage {
    tokensIn: number;
    tokensOut: number;
}

export interface ChatResult<T> {
    data: T;
    usage: ChatUsage;
    model: string;
}

export class UpstreamError extends Error {
    readonly status: number;
    /** Short machine code for ai_runs.error_code — never a provider message. */
    readonly code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = 'UpstreamError';
        this.status = status;
        this.code = code;
    }
}

/**
 * One JSON-mode chat completion.
 *
 * `signal` is threaded through so the orchestrator can abandon a call when the
 * client hangs up mid-stream — without it a disconnected request would keep
 * spending against the owner's OpenAI account until the upstream finished.
 */
export async function chatJson<T>(
    opts: {
        model: string;
        system: string;
        user: string;
        temperature?: number;
        maxTokens?: number;
        signal?: AbortSignal;
    },
): Promise<ChatResult<T>> {
    if (!AGENT_MODELS.has(opts.model)) {
        throw new UpstreamError(500, 'model_not_allowed', `Model not allowed: ${opts.model}`);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey || !apiKey.trim()) {
        throw new UpstreamError(503, 'no_api_key', 'OPENAI_API_KEY is not configured on the server');
    }

    const res = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        signal: opts.signal,
        body: JSON.stringify({
            model: opts.model,
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxTokens,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: opts.system },
                { role: 'user', content: opts.user },
            ],
        }),
    });

    if (!res.ok) {
        // The body is logged, not returned and not stored: provider errors quote the
        // request back, which would smuggle the user's utterance into a log line and
        // into ai_runs.error_code.
        console.error(`openai ${res.status}:`, (await res.text()).slice(0, 300));
        throw new UpstreamError(502, `upstream_${res.status}`, 'The AI provider rejected the request.');
    }

    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
        throw new UpstreamError(502, 'empty_completion', 'The AI provider returned an empty response.');
    }

    let data: T;
    try {
        data = JSON.parse(content);
    } catch {
        throw new UpstreamError(502, 'unparseable_json', 'The AI provider returned malformed JSON.');
    }

    return {
        data,
        model: body?.model ?? opts.model,
        usage: {
            tokensIn: Number(body?.usage?.prompt_tokens) || 0,
            tokensOut: Number(body?.usage?.completion_tokens) || 0,
        },
    };
}

/**
 * The same call, streamed, with a callback as the JSON arrives.
 *
 * Used for the specialist so the UI can report real progress ("6 steps so far")
 * instead of animating a bar on a timer. That distinction matters more than it
 * looks: a timer-driven indicator is most confident precisely when the request
 * has stalled, which is the one moment it is lying.
 *
 * `onPartial` receives the accumulated text after every chunk. It must not throw
 * — a display concern cannot be allowed to fail a request that is succeeding.
 */
export async function chatJsonStream<T>(
    opts: {
        model: string;
        system: string;
        user: string;
        temperature?: number;
        maxTokens?: number;
        signal?: AbortSignal;
        onPartial?: (accumulated: string) => void;
    },
): Promise<ChatResult<T>> {
    if (!AGENT_MODELS.has(opts.model)) {
        throw new UpstreamError(500, 'model_not_allowed', `Model not allowed: ${opts.model}`);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey || !apiKey.trim()) {
        throw new UpstreamError(503, 'no_api_key', 'OPENAI_API_KEY is not configured on the server');
    }

    const res = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        signal: opts.signal,
        body: JSON.stringify({
            model: opts.model,
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxTokens,
            response_format: { type: 'json_object' },
            stream: true,
            // Without this the usage block never arrives on a streamed response,
            // and ai_runs would record every agentic request as costing 0 tokens.
            stream_options: { include_usage: true },
            messages: [
                { role: 'system', content: opts.system },
                { role: 'user', content: opts.user },
            ],
        }),
    });

    if (!res.ok || !res.body) {
        console.error(`openai stream ${res.status}:`, (await res.text()).slice(0, 300));
        throw new UpstreamError(502, `upstream_${res.status}`, 'The AI provider rejected the request.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    let content = '';
    let model = opts.model;
    let tokensIn = 0;
    let tokensOut = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffered += decoder.decode(value, { stream: true });

        // SSE frames are newline-delimited; the last fragment may be incomplete,
        // so it stays in the buffer until the rest of it arrives.
        const lines = buffered.split('\n');
        buffered = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;

            let frame: Record<string, unknown>;
            try {
                frame = JSON.parse(payload);
            } catch {
                continue;   // a malformed frame is not worth failing the request over
            }

            const choices = frame.choices as Array<Record<string, unknown>> | undefined;
            const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
            if (typeof delta?.content === 'string') {
                content += delta.content;
                try {
                    opts.onPartial?.(content);
                } catch (err) {
                    console.error('onPartial threw (ignored):', err);
                }
            }

            if (typeof frame.model === 'string') model = frame.model;
            const usage = frame.usage as Record<string, unknown> | undefined;
            if (usage) {
                tokensIn = Number(usage.prompt_tokens) || tokensIn;
                tokensOut = Number(usage.completion_tokens) || tokensOut;
            }
        }
    }

    if (!content.trim()) {
        throw new UpstreamError(502, 'empty_completion', 'The AI provider returned an empty response.');
    }

    let data: T;
    try {
        data = JSON.parse(content);
    } catch {
        throw new UpstreamError(502, 'unparseable_json', 'The AI provider returned malformed JSON.');
    }

    return { data, model, usage: { tokensIn, tokensOut } };
}
