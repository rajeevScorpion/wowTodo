import { supabase } from '../../lib/supabase';

/**
 * Client half of the `delete-account` Edge Function (defect D1).
 *
 * Deleting the account is a server-side operation — see the function's own
 * header for why — so this module is only responsible for asking for it, and for
 * leaving the device in a clean state afterwards.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const DELETE_ACCOUNT_URL = `${SUPABASE_URL}/functions/v1/delete-account`;

/**
 * Matches the constant the function checks. Deliberately not user-facing: what
 * the user types to confirm is a UI concern and lives in the dialog.
 */
const CONFIRMATION = 'DELETE_MY_ACCOUNT';

/**
 * Generous, because the alternative is worse. If this call is cut off after the
 * server has already deleted the account, the user sees a failure for something
 * that succeeded and is left staring at data that no longer exists.
 */
const DELETE_TIMEOUT_MS = 30_000;

/** Account deletion did not happen. The message is safe to show to the user. */
export class AccountDeletionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AccountDeletionError';
    }
}

/**
 * Permanently delete the signed-in user's account, then sign out locally.
 *
 * The sign-out is scoped to `local` on purpose. A global sign-out posts to
 * `/logout` with the session's token, and by this point the user that token
 * belongs to no longer exists — so the request fails and the app is left holding
 * a session for a deleted account, which is the one state this must not end in.
 * A local sign-out clears stored credentials without a network round trip and
 * still emits `SIGNED_OUT`, which is what drives `clearLocalUserData` and the
 * redirect back to the login screen.
 *
 * @throws {AccountDeletionError} if the account still exists
 */
export async function deleteAccount(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
        throw new AccountDeletionError('You are not signed in.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELETE_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(DELETE_ACCOUNT_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                apikey: ANON_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ confirm: CONFIRMATION }),
            signal: controller.signal,
        });
    } catch {
        throw new AccountDeletionError(
            'Could not reach the server. Check your connection and try again.',
        );
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        throw new AccountDeletionError(await errorMessage(response));
    }

    // Only after the server has confirmed the account is gone. Signing out first
    // would discard the token the request needs.
    await supabase.auth.signOut({ scope: 'local' });
}

/**
 * The function's own wording where it has any — it distinguishes "your session
 * expired" from "try again", and those need different actions from the user.
 */
async function errorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json();
        if (typeof body?.error === 'string' && body.error) return body.error;
    } catch {
        // Not JSON — fall through to the generic message.
    }
    return 'Could not delete the account. Please try again.';
}
