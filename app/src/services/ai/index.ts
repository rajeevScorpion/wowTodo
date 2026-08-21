import { AIGeneratedTask, AppLanguage, BranchContext } from '../../types';
import { generateTaskWithOpenAI, generateBranchWithOpenAI } from './openai';
import { generateTaskWithGemini, generateBranchWithGemini } from './gemini';
import { transcribeAudio } from './whisper';
import { AiCancelledError, AiRateLimitError } from './proxy';
import {
    AgentClarificationNeeded,
    generateTaskWithAgent,
    type AgentStage,
} from './agent';

/**
 * AI orchestration.
 *
 * Provider credentials live server-side in the ai-proxy Edge Function, so the
 * app no longer knows which providers are configured. The fallback is therefore
 * driven by what actually fails rather than by which keys are present: try
 * OpenAI, fall back to Gemini, and surface a single actionable error if neither
 * works.
 */

/**
 * Being over quota is not a provider outage.
 *
 * The proxy's budget is shared between OpenAI and Gemini, so retrying the other
 * provider is guaranteed to be refused too — it just spends a second request to
 * reach the same answer, and buries the real reason behind a connection error
 * the user cannot act on. Re-throw immediately and let the message through.
 */
function rethrowIfRateLimited(error: unknown): void {
    if (error instanceof AiRateLimitError) throw error;
}

/** Both providers failed, or neither is configured on the server. */
function providersUnavailable(openAiError: unknown, geminiError: unknown): Error {
    console.error('OpenAI failed:', openAiError);
    console.error('Gemini failed:', geminiError);
    return new Error(
        'Could not reach the AI service. Please check your connection and try again.',
    );
}

export interface GenerateTaskOptions {
    /** Progress from the agentic path. Never called on the legacy path. */
    onStage?: (stage: AgentStage) => void;
    signal?: AbortSignal;
}

/**
 * Generate a task with todos from user input.
 *
 * Three tiers: the agentic planner (`ai-agent`), then OpenAI with the legacy
 * single prompt, then Gemini. The signature and return type are unchanged, so
 * `review.tsx` and every other caller are unaffected by which one served the
 * request.
 *
 * The agentic path is off by default and enabled server-side, so for most users
 * this currently costs one refused request before the legacy path runs — a few
 * hundred milliseconds, in exchange for being able to enable, canary and disable
 * the new pipeline without an app-store release.
 */
export async function generateTask(
    userInput: string,
    existingGroups?: string[],
    language?: AppLanguage,
    options: GenerateTaskOptions = {},
): Promise<AIGeneratedTask> {
    try {
        return await generateTaskWithAgent(userInput, existingGroups, language, options);
    } catch (error) {
        // A clarifying question is the agentic path WORKING. Falling back would
        // hand the same utterance to the prompt that fabricates, and produce
        // precisely the invented task the question existed to prevent.
        if (error instanceof AgentClarificationNeeded) throw error;
        if (error instanceof AiCancelledError) throw error;
        rethrowIfRateLimited(error);
        console.warn('Agentic planner unavailable, using the legacy path:', error);
    }

    let openAiError: unknown;
    try {
        return await generateTaskWithOpenAI(userInput, existingGroups, language);
    } catch (error) {
        rethrowIfRateLimited(error);
        openAiError = error;
        console.warn('OpenAI failed, falling back to Gemini:', error);
    }

    try {
        return await generateTaskWithGemini(userInput, existingGroups, language);
    } catch (geminiError) {
        rethrowIfRateLimited(geminiError);
        throw providersUnavailable(openAiError, geminiError);
    }
}

/**
 * Generate a branch (sub-task) from a specific todo item.
 * Tries OpenAI first, falls back to Gemini on failure.
 */
export async function generateBranch(
    context: BranchContext,
    existingGroups?: string[],
    language?: AppLanguage,
): Promise<AIGeneratedTask> {
    let openAiError: unknown;
    try {
        return await generateBranchWithOpenAI(context, existingGroups, language);
    } catch (error) {
        rethrowIfRateLimited(error);
        openAiError = error;
        console.warn('OpenAI branch generation failed, falling back to Gemini:', error);
    }

    try {
        return await generateBranchWithGemini(context, existingGroups, language);
    } catch (geminiError) {
        rethrowIfRateLimited(geminiError);
        throw providersUnavailable(openAiError, geminiError);
    }
}

/**
 * Transcribe audio to text. Served by Whisper via the ai-proxy function.
 */
export async function transcribeVoice(
    audioUri: string,
    language: AppLanguage = 'en',
): Promise<string> {
    return transcribeAudio(audioUri, language);
}

// Re-exported so screens import the clarification type from the same place they
// import generateTask, rather than reaching into the agent module directly.
export { AgentClarificationNeeded, AgentUnavailableError, type AgentStage } from './agent';
