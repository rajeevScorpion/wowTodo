import { supabase } from '../../lib/supabase';

/**
 * Client half of the ai-proxy Supabase Edge Function.
 *
 * AI provider keys are no longer present in the app at all — the proxy holds
 * them. These helpers return a plain `Response` so the provider modules keep
 * their existing status/parsing logic unchanged.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const AI_PROXY_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`;

async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || ANON_KEY;
    return {
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
    };
}

/** Forward a JSON request to a named upstream provider. */
export async function proxyJson(
    target: 'openai-chat' | 'gemini-generate',
    body: unknown,
): Promise<Response> {
    return fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
            ...(await authHeaders()),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target, body }),
    });
}

/** Forward a multipart request (audio transcription). */
export async function proxyFormData(form: FormData): Promise<Response> {
    return fetch(AI_PROXY_URL, {
        method: 'POST',
        // No Content-Type — fetch sets it with the multipart boundary.
        headers: await authHeaders(),
        body: form,
    });
}
