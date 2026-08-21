import { supabase } from '../../lib/supabase';
import { AIGeneratedTask, AppLanguage, normalizeAITodos } from '../../types';
import { AiCancelledError, AiRateLimitError, AiTimeoutError } from './proxy';

/**
 * Client half of the `ai-agent` Edge Function.
 *
 * The server streams server-sent events so the UI can say what is actually
 * happening — "Recipe agent is planning your Butter Chicken" — instead of
 * animating a bar on a timer. React Native's global `fetch` cannot read a
 * response body incrementally; `expo/fetch` can, and exposes a real
 * `ReadableStream`.
 *
 * Where it cannot (web, or a platform without the native module), the whole body
 * is read at once and the events are parsed from it. The task is still created
 * and still correct; only the live commentary is lost. That degradation is
 * silent by design: a missing status line is not worth failing a request over.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const AGENT_URL = `${SUPABASE_URL}/functions/v1/ai-agent`;

/**
 * Two model calls plus a stream, against 30s for the single-call legacy path.
 * Generous on purpose: the point is to bound a hung request, not to cut off a
 * slow one that is still working.
 */
export const AGENT_TIMEOUT_MS = 45_000;

export type AgentName = 'recipe' | 'trip' | 'schedule' | 'shopping' | 'project' | 'general';

/**
 * The slice of `fetch` this module uses, described structurally rather than by
 * importing Expo's types — the two `Response` shapes are not assignable to one
 * another and only these members are touched.
 */
interface StreamResponse {
    ok: boolean;
    status: number;
    headers: { get(name: string): string | null };
    body: { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }> } } | null;
    text(): Promise<string>;
}

type FetchLike = (url: string, init: Record<string, unknown>) => Promise<StreamResponse>;

let cachedFetch: FetchLike | null = null;

/**
 * `expo/fetch`, resolved lazily, falling back to the global `fetch`.
 *
 * Lazy for two reasons. Importing it at module scope pulls Expo's native fetch
 * implementation into every environment that touches `services/ai` — which broke
 * the existing `proxyRateLimit` suite outright, because the module cannot even be
 * constructed under jest. And on any platform where it fails to load, this way
 * costs a status line rather than the entire AI feature: the global `fetch`
 * cannot stream, and the non-streaming path below already handles that.
 */
function streamingFetch(): FetchLike {
    if (cachedFetch) return cachedFetch;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        cachedFetch = require('expo/fetch').fetch as FetchLike;
    } catch {
        console.warn('expo/fetch unavailable; agent status updates will not stream.');
        cachedFetch = globalThis.fetch as unknown as FetchLike;
    }
    return cachedFetch;
}

/**
 * What the UI is allowed to say, and when.
 *
 * A discriminated union so an unhandled stage is a type error rather than a
 * blank status line. Every member corresponds to a real server event — there is
 * deliberately no stage that a timer could produce on its own.
 */
export type AgentStage =
    | { stage: 'understanding' }
    | { stage: 'planning'; agent: AgentName; topic: string | null }
    | { stage: 'building'; todos: number }
    | { stage: 'ready'; todos: number };

/**
 * The planner declined to guess and asked a question instead.
 *
 * Deliberately an error type rather than a variant of the success value: it must
 * travel all the way to the UI without being mistaken for a task, and — most
 * importantly — it must NOT trigger the fallback to the legacy path. Falling
 * back would hand the same utterance to the prompt that fabricates, producing
 * exactly the invented task the question existed to prevent.
 */
export class AgentClarificationNeeded extends Error {
    readonly question: string;

    constructor(question: string) {
        super(question);
        this.name = 'AgentClarificationNeeded';
        this.question = question;
    }
}

/** The agentic path is off, broken, or produced nothing usable. Caller falls back. */
export class AgentUnavailableError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'AgentUnavailableError';
        this.code = code;
    }
}

/**
 * Once the server says this account is not on the rollout, stop asking.
 *
 * Without this every user who is *not* rolled out pays a full round trip before
 * their task even starts generating — on every single creation, forever. That is
 * a latency regression inflicted on everyone in order to serve a feature none of
 * them can use.
 *
 * Deliberately not persisted: it lives for the life of the process, so enabling
 * the flag server-side takes effect on the next app launch rather than requiring
 * a release or a cache-clearing dance. Only the two statuses that mean "not for
 * you" latch — a 500 or a timeout is a transient fault and must stay retryable.
 */
let disabledForSession = false;

/** Test seam. Nothing in the app calls this. */
export function resetAgentAvailability(): void {
    disabledForSession = false;
}

interface AgentOptions {
    onStage?: (stage: AgentStage) => void;
    signal?: AbortSignal;
}

/** Local calendar date. Never `toISOString()` — that is UTC, and dates it early. */
function localToday(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || ANON_KEY;
    return {
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
    };
}

type ServerEvent =
    | { type: 'routed'; agent: AgentName; topic: string | null; confidence: number; allow_times: boolean }
    | { type: 'clarify'; question: string }
    | { type: 'progress'; todos: number }
    | { type: 'done'; task: unknown; agent: AgentName; confidence: number; prompt_version: string }
    | { type: 'error'; code: string; message: string };

/** Pull complete `data:` frames out of a buffer, leaving any partial tail behind. */
function drainFrames(buffer: string): { events: ServerEvent[]; rest: string } {
    const lines = buffer.split('\n');
    const rest = lines.pop() ?? '';
    const events: ServerEvent[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
            events.push(JSON.parse(payload) as ServerEvent);
        } catch {
            // A truncated or malformed frame is not worth failing a request that
            // is otherwise succeeding — the terminal event is what matters.
        }
    }

    return { events, rest };
}

export async function generateTaskWithAgent(
    userInput: string,
    existingGroups?: string[],
    language?: AppLanguage,
    options: AgentOptions = {},
): Promise<AIGeneratedTask> {
    if (options.signal?.aborted) throw new AiCancelledError();
    if (disabledForSession) {
        throw new AgentUnavailableError('disabled_for_session', 'The planner is not enabled for this account.');
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, AGENT_TIMEOUT_MS);

    const forwardAbort = () => controller.abort();
    options.signal?.addEventListener('abort', forwardAbort);

    try {
        options.onStage?.({ stage: 'understanding' });

        const response = await streamingFetch()(AGENT_URL, {
            method: 'POST',
            headers: await authHeaders(),
            signal: controller.signal,
            body: JSON.stringify({
                input: userInput,
                groups: existingGroups,
                language,
                today: localToday(),
            }),
        });

        if (response.status === 429) {
            const header = Number(response.headers.get('Retry-After'));
            throw new AiRateLimitError(Number.isFinite(header) && header > 0 ? header : 60);
        }

        if (!response.ok) {
            // 503 is the rollout flag being off; 404 is the function not deployed
            // to this project yet. Both are settled answers about this account, so
            // latch them and stop paying a round trip per task. Everything else —
            // 500, 502, a timeout — is transient and stays retryable.
            if (response.status === 503 || response.status === 404) {
                disabledForSession = true;
            }
            throw new AgentUnavailableError(`http_${response.status}`, 'The planner is unavailable.');
        }

        // Collected in one object rather than as separate `let`s: every field is
        // assigned inside the `handle` closure, and TypeScript's flow analysis does
        // not follow that — it narrows a `let x: T | null = null` to `null`, making
        // the `if (x)` branch `never`. Object properties are re-widened after a
        // call, so this keeps the declared types intact.
        const got: {
            clarification: string | null;
            task: unknown;
            failure: AgentUnavailableError | null;
            todoCount: number;
            provenance: { agent: string; confidence: number; prompt_version: string } | null;
        } = { clarification: null, task: null, failure: null, todoCount: 0, provenance: null };

        const handle = (event: ServerEvent) => {
            switch (event.type) {
                case 'routed':
                    options.onStage?.({ stage: 'planning', agent: event.agent, topic: event.topic });
                    break;
                case 'progress':
                    got.todoCount = event.todos;
                    options.onStage?.({ stage: 'building', todos: event.todos });
                    break;
                case 'clarify':
                    got.clarification = event.question;
                    break;
                case 'done':
                    got.task = event.task;
                    got.provenance = {
                        agent: event.agent,
                        confidence: event.confidence,
                        prompt_version: event.prompt_version,
                    };
                    break;
                case 'error':
                    got.failure = new AgentUnavailableError(event.code, event.message);
                    break;
            }
        };

        const body = response.body;
        if (body) {
            const reader = body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const { events, rest } = drainFrames(buffer);
                buffer = rest;
                events.forEach(handle);
            }
        } else {
            // No streaming on this platform. The events are all present in the
            // completed body; only their timing is lost.
            const text = await response.text();
            drainFrames(`${text}\n`).events.forEach(handle);
        }

        if (got.failure) throw got.failure;
        if (got.clarification) throw new AgentClarificationNeeded(got.clarification);
        if (!got.task) throw new AgentUnavailableError('no_result', 'The planner returned nothing.');

        const result = got.task as AIGeneratedTask;
        // Same normalisation the legacy path applies, so both produce one shape.
        result.todos = normalizeAITodos(result.todos);
        result.event_time = result.event_time ?? null;

        // Carried so the task row can record which specialist and prompt version
        // produced it (migration 0017). Without this, a bad batch of tasks cannot
        // be traced back to a cause.
        if (got.provenance) {
            result.agent = got.provenance.agent;
            result.confidence = got.provenance.confidence;
            result.prompt_version = got.provenance.prompt_version;
        }

        options.onStage?.({ stage: 'ready', todos: result.todos.length || got.todoCount });
        return result;
    } catch (error) {
        // `fetch` reports a timeout and a user cancellation identically; they mean
        // very different things — one is worth retrying or falling back from, the
        // other is something the user asked for and must never surface as an error.
        if (timedOut) throw new AiTimeoutError(AGENT_TIMEOUT_MS);
        if (options.signal?.aborted) throw new AiCancelledError();
        throw error;
    } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', forwardAbort);
    }
}
