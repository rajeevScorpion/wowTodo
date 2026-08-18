import { proxyJson, proxyFormData, AiRateLimitError } from '../proxy';
import { generateTask } from '../index';

// The proxy only needs a token; keep the real Supabase client out of it.
jest.mock('../../../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(async () => ({ data: { session: { access_token: 'test-token' } } })),
        },
    },
}));

/** A response as the ai-proxy Edge Function sends it when a quota is exhausted. */
function rateLimited(retryAfter: string | null) {
    const headers = new Map<string, string>();
    if (retryAfter !== null) headers.set('retry-after', retryAfter);
    return {
        ok: false,
        status: 429,
        headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
        text: async () => JSON.stringify({ error: 'Rate limit exceeded.' }),
        json: async () => ({ error: 'Rate limit exceeded.' }),
    } as unknown as Response;
}

function ok(body: unknown) {
    return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify(body),
        json: async () => body,
    } as unknown as Response;
}

describe('ai proxy rate limiting (F3)', () => {
    afterEach(() => jest.restoreAllMocks());

    it('turns a 429 into a typed AiRateLimitError rather than a plain Response', async () => {
        global.fetch = jest.fn(async () => rateLimited('45')) as unknown as typeof fetch;

        await expect(proxyJson('openai-chat', { model: 'gpt-4o-mini' }))
            .rejects.toBeInstanceOf(AiRateLimitError);
    });

    it('carries Retry-After through to the user-facing message', async () => {
        global.fetch = jest.fn(async () => rateLimited('45')) as unknown as typeof fetch;

        await expect(proxyJson('openai-chat', { model: 'gpt-4o-mini' }))
            .rejects.toMatchObject({ retryAfterSeconds: 45 });
    });

    it('phrases a long window in hours, not thousands of seconds', async () => {
        global.fetch = jest.fn(async () => rateLimited('7200')) as unknown as typeof fetch;

        await expect(proxyJson('openai-chat', { model: 'gpt-4o-mini' }))
            .rejects.toThrow(/today's AI request limit.*2 hours/);
    });

    it('falls back to a sane retry window when the header is missing', async () => {
        global.fetch = jest.fn(async () => rateLimited(null)) as unknown as typeof fetch;

        await expect(proxyJson('openai-chat', { model: 'gpt-4o-mini' }))
            .rejects.toMatchObject({ retryAfterSeconds: 60 });
    });

    it('applies to transcription as well as chat', async () => {
        global.fetch = jest.fn(async () => rateLimited('30')) as unknown as typeof fetch;

        await expect(proxyFormData(new FormData()))
            .rejects.toBeInstanceOf(AiRateLimitError);
    });

    it('leaves a normal response completely untouched', async () => {
        const body = { choices: [] };
        global.fetch = jest.fn(async () => ok(body)) as unknown as typeof fetch;

        const res = await proxyJson('openai-chat', { model: 'gpt-4o-mini' });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual(body);
    });

    it('does NOT spend a second request on the fallback provider when rate limited', async () => {
        // The budget is shared, so the Gemini leg would only be refused again —
        // and the user would be told to check a connection that is fine.
        const fetchMock = jest.fn(async () => rateLimited('30'));
        global.fetch = fetchMock as unknown as typeof fetch;

        await expect(generateTask('buy milk')).rejects.toBeInstanceOf(AiRateLimitError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('still falls back to Gemini for an ordinary provider failure', async () => {
        // Guards the check above from over-reaching: only 429 short-circuits.
        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                headers: { get: () => null },
                text: async () => 'upstream exploded',
            } as unknown as Response)
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                headers: { get: () => null },
                text: async () => 'upstream exploded',
            } as unknown as Response);
        global.fetch = fetchMock as unknown as typeof fetch;

        await expect(generateTask('buy milk')).rejects.toThrow(/Could not reach the AI service/);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
