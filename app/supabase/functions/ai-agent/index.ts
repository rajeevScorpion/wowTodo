/**
 * ai-agent — router + specialist orchestration for task planning.
 *
 * Replaces one 4,000-token generalist prompt with a cheap routing call followed
 * by a focused specialist. Two model calls, always, bounded in code rather than
 * by convention: this is a pipeline, not an agent loop. Agent-to-agent handoff
 * would be a round trip and a model call per hop, and this runs while a person
 * watches a spinner on a phone.
 *
 * ## Why it responds with a stream
 *
 * For the UI to say "Recipe agent is planning your Butter Chicken", it must learn
 * the routing decision *while the specialist is still running*. A JSON response
 * cannot narrate a decision it has already finished making. So the pipeline emits
 * server-sent events, and every stage the user sees is driven by a real one —
 * never by a timer, which would be most confident exactly when the request has
 * stalled.
 *
 * ## Failure is not an outage
 *
 * Every error path ends with the client falling back to the legacy ai-proxy path,
 * which is untouched. A worse plan beats no plan. That is also why the rollout
 * flag is checked before the quota is charged: a disabled agent must cost the
 * user nothing.
 *
 * Deploy:  supabase functions deploy ai-agent
 * Secrets: OPENAI_API_KEY (shared with ai-proxy), AGENT_ROLLOUT, AGENT_OWNER_IDS
 */

import { CORS_HEADERS, json, userIdFromJwt } from '../_shared/cors.ts';
import { enforceQuota } from '../_shared/quota.ts';
import { chatJson, chatJsonStream, UpstreamError } from '../_shared/openai.ts';
import { recordRun, type RunOutcome } from '../_shared/runs.ts';
import { buildDateContext, resolveToday } from './dateContext.ts';
import { ROUTER_SYSTEM_PROMPT, buildRouterMessage, detectScript, mentionsClockTime } from './router.ts';
import { resolveAgent } from './agents/registry.ts';
import { validate } from './validate.ts';
import type { AgentEvent, AgentRequest, AgentTask, Language, RouteDecision } from './types.ts';

/** Classification into six buckets is easy; this is the cheap half of the budget. */
const ROUTER_MODEL = 'gpt-4o-mini';
const SPECIALIST_MODEL = Deno.env.get('AGENT_SPECIALIST_MODEL') || 'gpt-4o-mini';

/** An utterance is a sentence or two. 4 KB is generous; 400 KB is an attack. */
const MAX_INPUT_CHARS = 4_000;

/**
 * Used only when the router has decided an utterance is not a task but has not
 * written a question of its own. Interface copy, not task content.
 */
const DEFAULT_QUESTION: Record<Language, string> = {
    en: "I couldn't find a task in that. What would you like to get done?",
    hi: 'इसमें मुझे कोई काम नहीं मिला। आप क्या करना चाहते हैं?',
};

/**
 * Rollout gate. `off` by default — a new pipeline must be opted into, never
 * opted out of. Flipping it needs no app release, which is the entire reason the
 * orchestrator moved server-side.
 */
function rolloutAllows(userId: string): boolean {
    const mode = (Deno.env.get('AGENT_ROLLOUT') || 'off').toLowerCase();
    if (mode === 'all') return true;
    if (mode === 'owner') {
        const ids = (Deno.env.get('AGENT_OWNER_IDS') || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return ids.includes(userId);
    }
    return false;
}

/** Count the todo titles present so far in a partially streamed JSON body. */
function countStreamedTodos(partial: string): number {
    const start = partial.indexOf('"todos"');
    if (start === -1) return 0;
    // Cosmetic only — it drives a status line and never the result, so an
    // approximate count during streaming is acceptable. It is measured after
    // `"todos"` appears so the task's own title is not counted as a step.
    return (partial.slice(start).match(/"title"\s*:/g) || []).length;
}

function buildSpecialistMessage(
    req: AgentRequest,
    route: RouteDecision,
    today: string,
    language: Language,
): string {
    const parts: string[] = [
        `[OUTPUT LANGUAGE: ${language === 'hi' ? 'Hindi (Devanagari script)' : 'English'}]`,
        '',
        buildDateContext(today),
        '',
    ];

    if (route.topic) parts.push(`[SUBJECT: ${route.topic}]`, '');

    parts.push('USER REQUEST:', req.input);

    if (req.groups?.length) {
        parts.push('', `Existing groups: [${req.groups.join(', ')}]`);
    }

    return parts.join('\n');
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
    const userId = userIdFromJwt(authHeader);
    if (!userId) {
        return json({ error: 'Could not identify the caller from the token' }, 401);
    }

    // Before the quota, deliberately: a disabled agent must not spend a user's
    // budget to tell them it is disabled.
    if (!rolloutAllows(userId)) {
        return json({ error: 'The agentic planner is not enabled for this account.', code: 'agent_disabled' }, 503);
    }

    let body: AgentRequest;
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Request body is not valid JSON' }, 400);
    }

    const input = typeof body?.input === 'string' ? body.input.trim() : '';
    if (!input) {
        return json({ error: '"input" is required' }, 400);
    }
    if (input.length > MAX_INPUT_CHARS) {
        return json({ error: `"input" exceeds ${MAX_INPUT_CHARS} characters` }, 413);
    }

    const limited = await enforceQuota(userId, 'chat');
    if (limited) {
        await recordRun({ userId, kind: 'task', outcome: 'rate_limited', errorCode: 'quota' });
        return limited;
    }

    const today = resolveToday(body.today);
    const requested: Language | undefined = body.language === 'hi' ? 'hi' : body.language === 'en' ? 'en' : undefined;
    const startedAt = Date.now();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;
            const send = (event: AgentEvent) => {
                if (closed) return;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            };
            const finish = () => {
                if (closed) return;
                closed = true;
                controller.close();
            };

            let tokensIn = 0;
            let tokensOut = 0;
            let agentName: string | null = null;
            let promptVersion: string | null = null;
            let specialistModel: string | null = null;

            const record = (outcome: RunOutcome, errorCode?: string) =>
                recordRun({
                    userId,
                    kind: 'task',
                    outcome,
                    agent: agentName,
                    promptVersion,
                    model: specialistModel,
                    routerModel: ROUTER_MODEL,
                    errorCode: errorCode ?? null,
                    latencyMs: Date.now() - startedAt,
                    tokensIn,
                    tokensOut,
                });

            try {
                // ── 1. Route ────────────────────────────────────────────────
                const script = detectScript(input);
                const routed = await chatJson<RouteDecision>({
                    model: ROUTER_MODEL,
                    system: ROUTER_SYSTEM_PROMPT,
                    user: buildRouterMessage(input, requested, script),
                    temperature: 0,
                    maxTokens: 200,
                    signal: req.signal,
                });

                tokensIn += routed.usage.tokensIn;
                tokensOut += routed.usage.tokensOut;

                // Decision only, never the utterance. This is the one place a
                // routing mistake can be diagnosed after the fact, and ai_runs
                // deliberately stores no content.
                console.log(
                    `ai-agent route: agent=${routed.data?.agent} conf=${routed.data?.confidence}` +
                    ` is_request=${routed.data?.is_request} clarify=${routed.data?.needs_clarification}` +
                    ` q=${routed.data?.question ? 'yes' : 'no'} time=${routed.data?.has_explicit_time}`,
                );

                const specialist = resolveAgent(routed.data?.agent);
                agentName = specialist.name;
                promptVersion = specialist.promptVersion;

                const confidence = Math.max(0, Math.min(1, Number(routed.data?.confidence) || 0));
                const topic = typeof routed.data?.topic === 'string' && routed.data.topic.trim()
                    ? routed.data.topic.trim().slice(0, 60)
                    : null;

                // The requested language wins; the router's detection only fills
                // the gap when the client sent no preference.
                const language: Language = requested ?? (routed.data?.language === 'hi' ? 'hi' : 'en');

                // BOTH must agree. The router judges intent; the regex checks that a
                // time is actually present in the words. Requiring both means a
                // fabricated time needs two independent failures rather than one —
                // and the model does fail alone: it reported "gym in the morning,
                // three client calls" as containing an explicit time, and the plan
                // came back with a 07:00 alarm on the gym.
                //
                // Defaults to false on anything other than an explicit true, so a
                // router that omits the field produces no clock times rather than
                // unconstrained ones.
                const allowTimes = routed.data?.has_explicit_time === true && mentionsClockTime(input);

                // ── 2. Clarify, and stop ────────────────────────────────────
                // Returning early is the point: no second call, no fabricated
                // plan. The evaluation set scores 0/3 here on the legacy path.
                const question = typeof routed.data?.question === 'string' ? routed.data.question.trim() : '';

                // `is_request: false` is treated as a clarification request even if
                // needs_clarification was not set: they are the same judgement asked
                // twice, and a disagreement means the router is confused about an
                // utterance it has already said contains no task. Planning it anyway
                // is how "the weather is nice" became a seven-item checklist.
                const wantsClarification =
                    routed.data?.needs_clarification === true || routed.data?.is_request === false;

                if (wantsClarification) {
                    // The router sometimes flags a non-task correctly and then leaves
                    // "question" null — measured on "The weather is really nice today
                    // and I feel happy": is_request=false, needs_clarification=true,
                    // question=none. Requiring a question here meant discarding a
                    // correct judgement and planning the utterance anyway, which is
                    // the exact failure this pipeline exists to remove.
                    //
                    // The fallback is interface copy, not invented task content, so
                    // supplying it fabricates nothing.
                    send({ type: 'clarify', question: question || DEFAULT_QUESTION[language] });
                    await record('clarified');
                    finish();
                    return;
                }

                send({ type: 'routed', agent: specialist.name, topic, confidence, allow_times: allowTimes });

                // ── 3. Plan ─────────────────────────────────────────────────
                const userMessage = buildSpecialistMessage(body, { ...routed.data, topic }, today, language);

                let lastReported = 0;
                const planned = await chatJsonStream<unknown>({
                    model: SPECIALIST_MODEL,
                    system: specialist.systemPrompt,
                    user: userMessage,
                    temperature: 0.3,
                    maxTokens: specialist.maxTokens,
                    signal: req.signal,
                    onPartial: (accumulated) => {
                        const n = countStreamedTodos(accumulated);
                        if (n > lastReported) {
                            lastReported = n;
                            send({ type: 'progress', todos: n });
                        }
                    },
                });

                specialistModel = planned.model;
                tokensIn += planned.usage.tokensIn;
                tokensOut += planned.usage.tokensOut;

                // ── 4. Validate, with one repair attempt ────────────────────
                let result = validate(planned.data, { today, language, allowTimes });

                if (!result.task) {
                    const repair = await chatJsonStream<unknown>({
                        model: SPECIALIST_MODEL,
                        system: specialist.systemPrompt,
                        user:
                            `${userMessage}\n\n` +
                            `## Your previous response was rejected\n\n` +
                            result.problems.map((p) => `- ${p}`).join('\n') +
                            `\n\nProduce a corrected JSON object. Fix only what is listed; keep everything else.`,
                        temperature: 0.2,
                        maxTokens: specialist.maxTokens,
                        signal: req.signal,
                    });

                    tokensIn += repair.usage.tokensIn;
                    tokensOut += repair.usage.tokensOut;
                    result = validate(repair.data, { today, language, allowTimes });
                }

                if (!result.task) {
                    // Two attempts, still invalid. The client falls back to the
                    // legacy path rather than showing the user an apology.
                    send({
                        type: 'error',
                        code: result.codes[0] ?? 'invalid_output',
                        message: 'The planner could not produce a usable list.',
                    });
                    await record('invalid', result.codes.join(',').slice(0, 64));
                    finish();
                    return;
                }

                const task: AgentTask = result.task;
                send({
                    type: 'done',
                    task,
                    agent: specialist.name,
                    confidence,
                    prompt_version: specialist.promptVersion,
                });
                await record('ok');
                finish();
            } catch (err) {
                const code = err instanceof UpstreamError ? err.code : 'internal';
                // Logged without the body: provider errors quote the request back,
                // which would put the user's utterance in the logs.
                console.error('ai-agent failure:', code, err instanceof Error ? err.message : err);
                send({ type: 'error', code, message: 'The planner is unavailable.' });
                await record('error', code);
                finish();
            }
        },
    });

    return new Response(stream, {
        headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
});
