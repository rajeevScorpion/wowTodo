/**
 * Client half of the agentic planner.
 *
 * The behaviours worth protecting here are the ones whose failure is silent:
 *
 *  - a clarifying question must NOT fall back to the legacy prompt (falling back
 *    would fabricate the exact task the question refused to invent);
 *  - a stream split across arbitrary chunk boundaries must still parse, because
 *    the network decides where the boundaries land, not us;
 *  - a platform without streaming must still produce the task.
 *
 * None of these are visible to `tsc`, and all of them would look like "the AI is
 * being weird" rather than a bug.
 */

const mockGetSession = jest.fn();
const mockExpoFetch = jest.fn();

// Wrapped in an arrow rather than passed directly: jest hoists the factory above
// the `const` declarations, so a direct reference is still undefined when the
// factory runs. Matches the pattern in deleteAccount.test.ts.
jest.mock('../../../lib/supabase', () => ({
    supabase: { auth: { getSession: (...args: unknown[]) => mockGetSession(...(args as [])) } },
}));

jest.mock('expo/fetch', () => ({
    fetch: (...args: unknown[]) => mockExpoFetch(...args),
}));

import {
    AgentClarificationNeeded,
    AgentUnavailableError,
    generateTaskWithAgent,
    resetAgentAvailability,
} from '../agent';
import type { AgentStage } from '../agent';

const TASK = {
    title: 'Chicken Biryani for Six',
    description: 'A biryani for six people on Sunday.',
    event_time: null,
    todos: [{ title: 'Buy the meat and dairy', due_date: '2026-08-22', due_time: null, note: 'Chicken 1.5 kg' }],
    groups: { selected: 'Cooking', existing_ranked: [], new_suggestions: [] },
};

/** Build an SSE body from events, split at the given byte boundaries. */
function sseStream(events: unknown[], chunkSize = Infinity) {
    const text = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
    const bytes = new TextEncoder().encode(text);
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
        chunks.push(bytes.slice(i, i + chunkSize));
    }
    let index = 0;
    return {
        getReader: () => ({
            read: async () =>
                index < chunks.length
                    ? { done: false, value: chunks[index++] }
                    : { done: true, value: undefined },
        }),
    };
}

function respond(events: unknown[], opts: { chunkSize?: number; streaming?: boolean; status?: number } = {}) {
    const { chunkSize = Infinity, streaming = true, status = 200 } = opts;
    const text = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => null },
        body: streaming ? sseStream(events, chunkSize) : null,
        text: async () => text,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    resetAgentAvailability();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
});

describe('generateTaskWithAgent', () => {
    it('returns the task from the done event and reports each stage', async () => {
        const stages: AgentStage[] = [];
        mockExpoFetch.mockResolvedValue(
            respond([
                { type: 'routed', agent: 'recipe', topic: 'Chicken Biryani', confidence: 0.9, allow_times: false },
                { type: 'progress', todos: 1 },
                { type: 'done', task: TASK, agent: 'recipe', confidence: 0.9, prompt_version: 'recipe/v1' },
            ]),
        );

        const result = await generateTaskWithAgent('biryani for six', ['Cooking'], 'en', {
            onStage: (s) => stages.push(s),
        });

        expect(result.title).toBe('Chicken Biryani for Six');
        expect(stages.map((s) => s.stage)).toEqual(['understanding', 'planning', 'building', 'ready']);
        expect(stages[1]).toEqual({ stage: 'planning', agent: 'recipe', topic: 'Chicken Biryani' });
    });

    it('carries provenance so the task row can record which specialist produced it', async () => {
        mockExpoFetch.mockResolvedValue(
            respond([{ type: 'done', task: TASK, agent: 'recipe', confidence: 0.87, prompt_version: 'recipe/v1' }]),
        );

        const result = await generateTaskWithAgent('biryani', undefined, 'en');

        expect(result.agent).toBe('recipe');
        expect(result.confidence).toBe(0.87);
        expect(result.prompt_version).toBe('recipe/v1');
    });

    it("keeps a step's note, so the recipe agent's quantities reach the UI", async () => {
        // The note is where the recipe specialist puts amounts by design, to keep
        // them out of the title. A normaliser that drops the field loses them
        // silently — the task still looks fine, it is just wrong, and the agent
        // takes the blame for the client's data loss.
        mockExpoFetch.mockResolvedValue(
            respond([{ type: 'done', task: TASK, agent: 'recipe', confidence: 0.9, prompt_version: 'recipe/v1' }]),
        );

        const result = await generateTaskWithAgent('biryani for six', undefined, 'en');

        expect(result.todos[0].note).toBe('Chicken 1.5 kg');
    });

    it('throws AgentClarificationNeeded rather than returning a task', async () => {
        // mockImplementation, not mockResolvedValue: a response carries a stateful
        // reader, so reusing one object across two calls hands the second an
        // already-drained stream.
        mockExpoFetch.mockImplementation(async () =>
            respond([{ type: 'clarify', question: 'Which place, and what needs sorting?' }]),
        );

        await expect(generateTaskWithAgent('sort out the thing', undefined, 'en')).rejects.toBeInstanceOf(
            AgentClarificationNeeded,
        );

        await expect(generateTaskWithAgent('sort out the thing', undefined, 'en')).rejects.toMatchObject({
            question: 'Which place, and what needs sorting?',
        });
    });

    it('parses a stream split at arbitrary chunk boundaries', async () => {
        // 7 bytes cuts frames mid-JSON and mid-key. The network chooses these
        // boundaries; a parser that only works on whole frames works on a laptop
        // and fails on a train.
        mockExpoFetch.mockResolvedValue(
            respond(
                [
                    { type: 'routed', agent: 'trip', topic: 'Goa trip', confidence: 0.8, allow_times: false },
                    { type: 'done', task: TASK, agent: 'trip', confidence: 0.8, prompt_version: 'trip/v1' },
                ],
                { chunkSize: 7 },
            ),
        );

        const result = await generateTaskWithAgent('goa trip', undefined, 'en');
        expect(result.title).toBe('Chicken Biryani for Six');
        expect(result.agent).toBe('trip');
    });

    it('still produces the task when the platform cannot stream', async () => {
        const stages: AgentStage[] = [];
        mockExpoFetch.mockResolvedValue(
            respond([{ type: 'done', task: TASK, agent: 'general', confidence: 1, prompt_version: 'general/v1' }], {
                streaming: false,
            }),
        );

        const result = await generateTaskWithAgent('laundry', undefined, 'en', {
            onStage: (s) => stages.push(s),
        });

        expect(result.title).toBe('Chicken Biryani for Six');
        // The task survives; only the live commentary is lost.
        expect(stages.map((s) => s.stage)).toEqual(['understanding', 'ready']);
    });

    it('surfaces a server error event as AgentUnavailableError', async () => {
        mockExpoFetch.mockResolvedValue(
            respond([{ type: 'error', code: 'upstream_502', message: 'The planner is unavailable.' }]),
        );

        await expect(generateTaskWithAgent('anything', undefined, 'en')).rejects.toBeInstanceOf(
            AgentUnavailableError,
        );
    });

    it('treats the rollout flag being off as unavailable, not as a crash', async () => {
        mockExpoFetch.mockImplementation(async () => respond([], { status: 503, streaming: false }));

        await expect(generateTaskWithAgent('anything', undefined, 'en')).rejects.toMatchObject({
            name: 'AgentUnavailableError',
            code: 'http_503',
        });
    });

    it('stops calling the server once it says this account is not enabled', async () => {
        // Otherwise every user who is not on the rollout pays a full round trip
        // before every single task they create.
        mockExpoFetch.mockImplementation(async () => respond([], { status: 503, streaming: false }));

        await expect(generateTaskWithAgent('one', undefined, 'en')).rejects.toBeInstanceOf(AgentUnavailableError);
        await expect(generateTaskWithAgent('two', undefined, 'en')).rejects.toMatchObject({
            code: 'disabled_for_session',
        });
        await expect(generateTaskWithAgent('three', undefined, 'en')).rejects.toBeInstanceOf(AgentUnavailableError);

        expect(mockExpoFetch).toHaveBeenCalledTimes(1);
    });

    it('keeps retrying after a transient failure', async () => {
        // A 500 is not a statement about this account, and latching it would take
        // the feature away until the app is restarted.
        mockExpoFetch.mockImplementation(async () => respond([], { status: 500, streaming: false }));

        await expect(generateTaskWithAgent('one', undefined, 'en')).rejects.toBeInstanceOf(AgentUnavailableError);
        await expect(generateTaskWithAgent('two', undefined, 'en')).rejects.toBeInstanceOf(AgentUnavailableError);

        expect(mockExpoFetch).toHaveBeenCalledTimes(2);
    });

    it('fails when the stream ends with neither a task nor a question', async () => {
        mockExpoFetch.mockResolvedValue(respond([{ type: 'progress', todos: 3 }]));

        await expect(generateTaskWithAgent('anything', undefined, 'en')).rejects.toMatchObject({
            code: 'no_result',
        });
    });

    it("sends the device's LOCAL date, never a UTC one", async () => {
        mockExpoFetch.mockResolvedValue(
            respond([{ type: 'done', task: TASK, agent: 'general', confidence: 1, prompt_version: 'general/v1' }]),
        );

        // 00:30 local on the 21st is still the 20th in UTC for anywhere east of
        // UTC. Sending the UTC date is the bug that dated every IST user's tasks
        // to the previous day.
        const realDate = Date;
        // @ts-expect-error — deliberately replacing the global for one call.
        global.Date = class extends realDate {
            constructor(...args: unknown[]) {
                if (args.length) super(...(args as []));
                else super(2026, 7, 21, 0, 30);
            }
        };

        try {
            await generateTaskWithAgent('anything', undefined, 'en');
        } finally {
            global.Date = realDate;
        }

        const body = JSON.parse(mockExpoFetch.mock.calls[0][1].body);
        expect(body.today).toBe('2026-08-21');
    });
});
