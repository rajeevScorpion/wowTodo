import {
    proxyJson,
    AiTimeoutError,
    AiCancelledError,
    CHAT_TIMEOUT_MS,
} from '../proxy';

// The proxy only needs a token; keep the real Supabase client out of it.
jest.mock('../../../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(async () => ({ data: { session: { access_token: 'test-token' } } })),
        },
    },
}));

/** A fetch that never settles on its own — it only ends when aborted. */
function hangingFetch() {
    return jest.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
                const err = new Error('Aborted');
                err.name = 'AbortError';
                reject(err);
            });
        }));
}

describe('ai proxy timeouts (F4 — a request must always end)', () => {
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('gives up on a stalled request instead of hanging forever', async () => {
        jest.useFakeTimers();
        global.fetch = hangingFetch() as unknown as typeof fetch;

        const pending = proxyJson('openai-chat', { model: 'gpt-4o-mini' });
        const assertion = expect(pending).rejects.toBeInstanceOf(AiTimeoutError);

        // Let authHeaders() settle, then run out the clock.
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(CHAT_TIMEOUT_MS);

        await assertion;
    });

    it('reports caller cancellation as cancellation, not as a timeout', async () => {
        jest.useFakeTimers();
        global.fetch = hangingFetch() as unknown as typeof fetch;

        const controller = new AbortController();
        const pending = proxyJson('openai-chat', { model: 'gpt-4o-mini' }, controller.signal);
        const assertion = expect(pending).rejects.toBeInstanceOf(AiCancelledError);

        await Promise.resolve();
        await Promise.resolve();
        controller.abort();

        await assertion;
    });

    it('does not start a request that was cancelled before it began', async () => {
        const fetchMock = hangingFetch();
        global.fetch = fetchMock as unknown as typeof fetch;

        const controller = new AbortController();
        controller.abort();

        await expect(
            proxyJson('openai-chat', { model: 'gpt-4o-mini' }, controller.signal),
        ).rejects.toBeInstanceOf(AiCancelledError);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('passes a successful response straight through and clears its timer', async () => {
        jest.useFakeTimers();
        const ok = new Response(JSON.stringify({ ok: true }), { status: 200 });
        global.fetch = jest.fn(async () => ok) as unknown as typeof fetch;

        const res = await proxyJson('openai-chat', { model: 'gpt-4o-mini' });

        expect(res.status).toBe(200);
        // A leaked timer would keep a handle open and could abort a later request.
        expect(jest.getTimerCount()).toBe(0);
    });
});
