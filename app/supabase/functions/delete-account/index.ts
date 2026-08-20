/**
 * delete-account — permanently erases the calling user and everything they own.
 *
 * Google Play requires any app that lets users create an account to offer an
 * in-app route to delete that account and its data (defect D1). The client
 * cannot do this itself: RLS lets a user delete their own *rows*, but nothing
 * short of the service role can delete the `auth.users` row, and leaving that
 * behind would mean the account still exists and still signs in.
 *
 * WHAT GETS DELETED
 * Exactly one statement does the work — the admin delete of the auth user. Every
 * table that stores user data declares `references auth.users(id) on delete
 * cascade`, so the row removal fans out to:
 *
 *   tasks · todos · task_groups · user_profiles · reminder_settings ·
 *   scheduled_reminders · shares (as owner AND as recipient) ·
 *   in_app_notifications · ai_usage_quota
 *
 * This is asserted end-to-end by `npm run verify:account-deletion`, which fills
 * every one of those tables and proves the count returns to zero. Any NEW table
 * holding user data must declare the same cascade, or it will silently survive
 * deletion and turn a compliance guarantee into a false claim.
 *
 * The one deliberate exception is `in_app_notifications.actor_id`, which is
 * `on delete set null`: those rows belong to a *different* user — the person who
 * was notified — and deleting them would erase someone else's inbox. The link
 * back to the deleted user is severed, which is what actually matters.
 *
 * AUTHENTICATION
 * `verify_jwt` is on, but unlike ai-proxy this handler does NOT simply decode the
 * token's `sub`. It calls `/auth/v1/user` and uses the id GoTrue returns. For an
 * irreversible whole-account delete the identity must come from a source that
 * validates the token rather than from a claim we read out of it, so that a
 * future config change to `verify_jwt` cannot turn this into an endpoint that
 * deletes whichever account a caller names. The account to delete is never taken
 * from the request body — there is no way to ask this function to delete anyone
 * other than yourself.
 *
 * Deploy:  supabase functions deploy delete-account
 */

/**
 * Required in the request body. Not a security control — the JWT is what
 * authorises this — but a bare POST to a URL should not be able to destroy an
 * account, and an explicit intent token keeps a stray or mistaken call inert.
 */
const CONFIRMATION = 'DELETE_MY_ACCOUNT';

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

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return json({ error: 'Missing Authorization header' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
        console.error('delete-account: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
        return json({ error: 'Account deletion is unavailable right now.' }, 503);
    }

    // Explicit intent, checked before anything expensive or destructive.
    let confirm: unknown;
    try {
        ({ confirm } = await req.json());
    } catch {
        return json({ error: 'Request body is not valid JSON' }, 400);
    }
    if (confirm !== CONFIRMATION) {
        return json({ error: 'Missing or invalid confirmation' }, 400);
    }

    // Resolve the caller from the token itself, via GoTrue. This both validates
    // the token and yields the id — the body has no say in whose account this is.
    let userId: string;
    try {
        const me = await fetch(`${url}/auth/v1/user`, {
            headers: { Authorization: authHeader, apikey: serviceKey },
        });
        if (!me.ok) {
            return json({ error: 'Your session is no longer valid. Please sign in again.' }, 401);
        }
        const user = await me.json();
        if (typeof user?.id !== 'string' || !user.id) {
            return json({ error: 'Could not identify the caller' }, 401);
        }
        userId = user.id;
    } catch (err) {
        console.error('delete-account: could not resolve caller:', err);
        return json({ error: 'Account deletion is unavailable right now.' }, 503);
    }

    // Hard delete. A soft delete would leave the row — and therefore the account —
    // in place, which is not what was asked for and not what Play requires.
    try {
        const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ should_soft_delete: false }),
        });

        if (!res.ok) {
            // The user id is safe to log — it is not a secret, and without it a
            // failed deletion cannot be followed up on.
            console.error(`delete-account: admin delete ${res.status} for ${userId}:`, await res.text());
            return json({ error: 'Could not delete the account. Please try again.' }, 502);
        }
    } catch (err) {
        console.error(`delete-account: admin delete failed for ${userId}:`, err);
        return json({ error: 'Could not delete the account. Please try again.' }, 502);
    }

    console.log(`delete-account: deleted ${userId}`);
    return json({ deleted: true });
});
