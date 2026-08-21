/**
 * Shapes exchanged inside ai-agent and with its client.
 *
 * `AgentTask` is intentionally identical to the app's existing `AIGeneratedTask`
 * plus optional additions. The whole point of the agentic path is that callers —
 * review.tsx, the create hooks, the reminder scheduler — keep working unchanged,
 * so this contract is the one thing in the redesign that must not move.
 */

export type AgentName =
    | 'recipe'
    | 'trip'
    | 'schedule'
    | 'shopping'
    | 'project'
    | 'general';

export const AGENT_NAMES: AgentName[] = [
    'recipe',
    'trip',
    'schedule',
    'shopping',
    'project',
    'general',
];

export type Language = 'en' | 'hi';

/**
 * What the router decides, before any planning happens.
 *
 * Field order in the router's JSON schema is load-bearing: `is_request` and
 * `needs_clarification` are emitted BEFORE `agent`, because a model that has
 * already named a specialist has committed to there being something to plan and
 * will not readily contradict itself two fields later. Measured — "The weather is
 * really nice today" routed to `general` while the judgement came last.
 */
export interface RouteDecision {
    /** Is the person asking for anything to happen at all? */
    is_request: boolean;
    agent: AgentName;
    /**
     * A 1-4 word human label for what this is about ("Butter Chicken", "Goa
     * trip"). Exists purely so the client's status line can be about the user's
     * task rather than about our architecture. Never used for planning.
     */
    topic: string | null;
    confidence: number;
    language: Language;
    /**
     * Whether the utterance named an actual time of day.
     *
     * Judged by the router because it has already read the utterance, and
     * enforced by the validator because a prompt rule alone does not hold: the
     * specialist produced `event_time: 19:00` for "this Sunday" on the first
     * real run, despite base.ts forbidding invented times in two places.
     */
    has_explicit_time: boolean;
    needs_clarification: boolean;
    question: string | null;
}

export interface AgentTodo {
    title: string;
    due_date: string | null;
    due_time: string | null;
    /** 0017. Quantities, references, caveats — detail that does not belong in a title. */
    note?: string | null;
}

export interface AgentGroups {
    selected: string;
    existing_ranked: string[];
    new_suggestions: string[];
}

export interface AgentTask {
    title: string;
    description: string;
    event_time: string | null;
    todos: AgentTodo[];
    groups: AgentGroups;
}

/** The request body the client sends. */
export interface AgentRequest {
    input: string;
    groups?: string[];
    language?: Language;
    /**
     * The device's LOCAL calendar date, `YYYY-MM-DD`.
     *
     * The server cannot derive this: Deno runs in UTC, and dating from UTC is the
     * exact bug that put every task created before 05:30 IST on the previous day.
     * See dateContext.ts.
     */
    today?: string;
}

/** Server-sent event names. Kept as a union so a typo is a compile error. */
export type AgentEvent =
    | {
        type: 'routed';
        agent: AgentName;
        topic: string | null;
        confidence: number;
        /** Whether clock times are permitted downstream. Exposed so the evaluation
         *  harness can score the decision, and so a fabricated time can be traced
         *  to the router rather than blamed on the specialist. */
        allow_times: boolean;
      }
    | { type: 'clarify'; question: string }
    | { type: 'progress'; todos: number }
    | { type: 'done'; task: AgentTask; agent: AgentName; confidence: number; prompt_version: string }
    | { type: 'error'; code: string; message: string };
