/**
 * CORS headers and JSON helper, shared by the Edge Functions.
 *
 * Extracted from ai-proxy so `ai-agent` cannot drift from it. `_shared/` is not
 * itself a function — the Supabase runtime skips directories beginning with an
 * underscore when it builds its function map.
 */

export const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

/**
 * The caller's user id, read from the JWT payload.
 *
 * The signature is NOT verified here, and deliberately so: `verify_jwt` is on for
 * these functions, so the platform has already rejected anything unsigned, expired
 * or forged before the handler runs. Re-verifying would mean shipping the JWT
 * secret into the function for no gain. This only decodes what has already been
 * proven authentic.
 */
export function userIdFromJwt(authHeader: string): string | null {
    try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = token.split('.')[1];
        if (!payload) return null;
        // base64url -> base64, and restore the stripped padding.
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const claims = JSON.parse(atob(padded));
        return typeof claims?.sub === 'string' ? claims.sub : null;
    } catch {
        return null;
    }
}
