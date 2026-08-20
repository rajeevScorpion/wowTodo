import { deleteAccount, AccountDeletionError } from '../deleteAccount';

// `mock`-prefixed so jest's hoisted factory is allowed to reference them.
const mockGetSession = jest.fn(async () => ({ data: { session: { access_token: 'test-token' } } }));
const mockSignOut = jest.fn(async () => ({ error: null }));

jest.mock('../../../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: (...args: unknown[]) => mockGetSession(...(args as [])),
            signOut: (...args: unknown[]) => mockSignOut(...(args as [])),
        },
    },
}));

function response(status: number, body: unknown) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as unknown as Response;
}

/**
 * The server half is covered end-to-end by `npm run verify:account-deletion`,
 * which drives the real Edge Function against a real database. These tests cover
 * what that script cannot see: what the *device* is left holding afterwards.
 *
 * The failure this guards against is a partial one. If the account is deleted
 * but the app keeps the session, the user is left signed in to an account that
 * no longer exists — every query 401s and there is no way back to the login
 * screen short of reinstalling. The mirror-image bug is just as bad: signing out
 * when the deletion actually failed hides a live account behind a "deleted"
 * message.
 */
describe('deleteAccount (D1)', () => {
    beforeEach(() => {
        mockGetSession.mockClear();
        mockSignOut.mockClear();
        mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    });
    afterEach(() => jest.restoreAllMocks());

    it('sends the session token and the confirmation the function requires', async () => {
        const fetchMock = jest.fn(async () => response(200, { deleted: true }));
        global.fetch = fetchMock as unknown as typeof fetch;

        await deleteAccount();

        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toMatch(/\/functions\/v1\/delete-account$/);
        expect(init.method).toBe('POST');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
        expect(JSON.parse(init.body as string)).toEqual({ confirm: 'DELETE_MY_ACCOUNT' });
    });

    it('signs out locally once the server confirms deletion', async () => {
        global.fetch = jest.fn(async () => response(200, { deleted: true })) as unknown as typeof fetch;

        await deleteAccount();

        // scope:'local' matters: a global sign-out posts to /logout with the token
        // of a user who no longer exists, fails, and strands the dead session.
        expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('does NOT sign out when the server refused the deletion', async () => {
        global.fetch = jest.fn(async () =>
            response(502, { error: 'Could not delete the account. Please try again.' }),
        ) as unknown as typeof fetch;

        await expect(deleteAccount()).rejects.toBeInstanceOf(AccountDeletionError);
        expect(mockSignOut).not.toHaveBeenCalled();
    });

    it("surfaces the server's own wording, which distinguishes the causes", async () => {
        global.fetch = jest.fn(async () =>
            response(401, { error: 'Your session is no longer valid. Please sign in again.' }),
        ) as unknown as typeof fetch;

        await expect(deleteAccount()).rejects.toThrow('Your session is no longer valid. Please sign in again.');
    });

    it('still reports something useful when the error body is not JSON', async () => {
        global.fetch = jest.fn(async () => ({
            ok: false,
            status: 500,
            json: async () => { throw new SyntaxError('Unexpected token'); },
            text: async () => 'upstream failure',
        })) as unknown as typeof fetch;

        await expect(deleteAccount()).rejects.toThrow('Could not delete the account. Please try again.');
        expect(mockSignOut).not.toHaveBeenCalled();
    });

    it('reports a network failure as a connection problem, not a deletion', async () => {
        global.fetch = jest.fn(async () => { throw new TypeError('Network request failed'); }) as unknown as typeof fetch;

        await expect(deleteAccount()).rejects.toThrow(/Could not reach the server/);
        expect(mockSignOut).not.toHaveBeenCalled();
    });

    it('refuses without a session instead of calling the endpoint anonymously', async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } } as never);
        const fetchMock = jest.fn(async () => response(200, { deleted: true }));
        global.fetch = fetchMock as unknown as typeof fetch;

        await expect(deleteAccount()).rejects.toThrow('You are not signed in.');
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
