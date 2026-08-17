import { AIGeneratedTask, AppLanguage, BranchContext } from '../../types';
import { generateTaskWithOpenAI, generateBranchWithOpenAI } from './openai';
import { generateTaskWithGemini, generateBranchWithGemini } from './gemini';
import { transcribeAudio } from './whisper';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

/**
 * Generate a task with todos from user input.
 * Tries OpenAI first, falls back to Gemini on failure.
 */
export async function generateTask(
    userInput: string,
    existingGroups?: string[],
    language?: AppLanguage,
): Promise<AIGeneratedTask> {
    if (OPENAI_KEY) {
        try {
            return await generateTaskWithOpenAI(userInput, OPENAI_KEY, existingGroups, language);
        } catch (error) {
            console.warn('OpenAI failed, falling back to Gemini:', error);
        }
    }

    if (GEMINI_KEY) {
        try {
            return await generateTaskWithGemini(userInput, GEMINI_KEY, existingGroups, language);
        } catch (error) {
            console.error('Gemini also failed:', error);
            throw new Error(
                'Both AI providers failed. Please check your API keys and try again.',
            );
        }
    }

    throw new Error(
        'No AI provider configured. Add EXPO_PUBLIC_OPENAI_API_KEY or EXPO_PUBLIC_GEMINI_API_KEY to your .env file.',
    );
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
    if (OPENAI_KEY) {
        try {
            return await generateBranchWithOpenAI(context, OPENAI_KEY, existingGroups, language);
        } catch (error) {
            console.warn('OpenAI branch generation failed, falling back to Gemini:', error);
        }
    }

    if (GEMINI_KEY) {
        try {
            return await generateBranchWithGemini(context, GEMINI_KEY, existingGroups, language);
        } catch (error) {
            console.error('Gemini branch generation also failed:', error);
            throw new Error(
                'Both AI providers failed. Please check your API keys and try again.',
            );
        }
    }

    throw new Error(
        'No AI provider configured. Add EXPO_PUBLIC_OPENAI_API_KEY or EXPO_PUBLIC_GEMINI_API_KEY to your .env file.',
    );
}

/**
 * Transcribe audio to text using Whisper.
 * Requires OpenAI API key.
 */
export async function transcribeVoice(audioUri: string, language: AppLanguage = 'en'): Promise<string> {
    if (!OPENAI_KEY) {
        throw new Error('OpenAI API key required for voice transcription');
    }
    return transcribeAudio(audioUri, OPENAI_KEY, language);
}
