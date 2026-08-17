import { AIGeneratedTask, AppLanguage, BranchContext, normalizeAITodos } from '../../types';
import { TASK_DECOMPOSITION_SYSTEM_PROMPT } from './prompt';
import { BRANCH_DECOMPOSITION_SYSTEM_PROMPT } from './branchPrompt';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function buildUserMessage(userInput: string, existingGroups?: string[], language?: AppLanguage): string {
    let message = '';
    if (language) {
        message += `[LANGUAGE: ${language === 'hi' ? 'Hindi' : 'English'}]\n\n`;
    }
    message += `[CURRENT DATE: ${new Date().toISOString().split('T')[0]}]\n\n`;
    message += userInput;
    if (existingGroups && existingGroups.length > 0) {
        message += `\n\nExisting groups: [${existingGroups.join(', ')}]`;
    }
    return message;
}

export async function generateTaskWithOpenAI(
    userInput: string,
    apiKey: string,
    existingGroups?: string[],
    language?: AppLanguage,
): Promise<AIGeneratedTask> {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: TASK_DECOMPOSITION_SYSTEM_PROMPT },
                { role: 'user', content: buildUserMessage(userInput, existingGroups, language) },
            ],
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('OpenAI returned empty response');
    }

    const parsed = JSON.parse(content);
    validateAIResponse(parsed);

    // Normalize todos to AIGeneratedTodo[] (handles both string and object formats)
    parsed.todos = normalizeAITodos(parsed.todos);
    parsed.event_time = parsed.event_time ?? null;

    return parsed;
}

function buildBranchUserMessage(
    context: BranchContext,
    existingGroups?: string[],
    language?: AppLanguage,
): string {
    let message = '';
    if (language) {
        message += `[LANGUAGE: ${language === 'hi' ? 'Hindi' : 'English'}]\n\n`;
    }
    message += `[CURRENT DATE: ${new Date().toISOString().split('T')[0]}]\n\n`;

    message += `## Mother Task\nTitle: ${context.motherTask.title}\n`;
    if (context.motherTask.description) {
        message += `Description: ${context.motherTask.description}\n`;
    }

    message += `\n## Mother Task Todos\n`;
    for (const todo of context.motherTodos) {
        const marker = todo.order === context.branchedTodo.order ? '>>> ' : '    ';
        message += `${marker}${todo.order + 1}. ${todo.title}\n`;
    }

    message += `\n## Todo Being Branched\n`;
    message += `"${context.branchedTodo.title}" (step ${context.branchedTodo.order + 1})\n`;

    if (context.userProfile?.profession || context.userProfile?.city) {
        message += `\n## User Profile\n`;
        if (context.userProfile.profession) message += `Profession: ${context.userProfile.profession}\n`;
        if (context.userProfile.city) message += `City: ${context.userProfile.city}\n`;
    }

    if (context.additionalContext.trim()) {
        message += `\n## Additional Context from User\n${context.additionalContext.trim()}\n`;
    }

    if (existingGroups && existingGroups.length > 0) {
        message += `\n\nExisting groups: [${existingGroups.join(', ')}]`;
    }

    return message;
}

export async function generateBranchWithOpenAI(
    context: BranchContext,
    apiKey: string,
    existingGroups?: string[],
    language?: AppLanguage,
): Promise<AIGeneratedTask> {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: BRANCH_DECOMPOSITION_SYSTEM_PROMPT },
                { role: 'user', content: buildBranchUserMessage(context, existingGroups, language) },
            ],
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('OpenAI returned empty response');
    }

    const parsed = JSON.parse(content);
    validateAIResponse(parsed);

    parsed.todos = normalizeAITodos(parsed.todos);
    parsed.event_time = parsed.event_time ?? null;

    return parsed;
}

function validateAIResponse(data: unknown): asserts data is AIGeneratedTask {
    const obj = data as Record<string, unknown>;
    if (typeof obj.title !== 'string' || !obj.title.trim()) {
        throw new Error('AI response missing title');
    }
    if (typeof obj.description !== 'string') {
        throw new Error('AI response missing description');
    }
    if (!Array.isArray(obj.todos) || obj.todos.length === 0) {
        throw new Error('AI response missing todos array');
    }
    for (const todo of obj.todos) {
        if (typeof todo === 'string') {
            if (!todo.trim()) throw new Error('AI response contains empty todo string');
            continue;
        }
        if (typeof todo !== 'object' || todo === null) {
            throw new Error('AI response contains invalid todo entry');
        }
        const t = todo as Record<string, unknown>;
        if (typeof t.title !== 'string' || !t.title.trim()) {
            throw new Error('AI response todo missing title');
        }
    }
    // Support both new "groups" object and legacy "group" string
    if (obj.groups && typeof obj.groups === 'object') {
        const g = obj.groups as Record<string, unknown>;
        if (typeof g.selected !== 'string' || !g.selected.trim()) {
            throw new Error('AI response groups missing selected');
        }
        if (!Array.isArray(g.existing_ranked)) g.existing_ranked = [];
        if (!Array.isArray(g.new_suggestions)) g.new_suggestions = [];
    } else if (typeof obj.group === 'string' && obj.group.trim()) {
        // Legacy fallback: convert "group" string to new format
        obj.groups = { selected: obj.group, existing_ranked: [], new_suggestions: [] };
        delete obj.group;
    } else {
        throw new Error('AI response missing groups');
    }
}
