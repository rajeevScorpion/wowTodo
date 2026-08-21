/**
 * The specialist registry.
 *
 * Adding an agent is: write one file next to this one, add one line here, and add
 * one bullet to the router's list. That is the whole extension path — the
 * orchestrator, the validator, the client and the event protocol are all unaware
 * of which agents exist.
 *
 * `tools` is declared but unused in phase 1. It is here so that phase 3
 * (user history) and phase 4 (web search) attach capability to a specialist
 * declaratively rather than by editing the orchestrator, and so that the set of
 * agents allowed to reach the network is readable in one place.
 */

import type { AgentName } from '../types.ts';
import * as recipe from './recipe.ts';
import * as trip from './trip.ts';
import * as schedule from './schedule.ts';
import * as shopping from './shopping.ts';
import * as project from './project.ts';
import * as general from './general.ts';

export type AgentTool = 'user_context' | 'web_search';

export interface Specialist {
    name: AgentName;
    systemPrompt: string;
    promptVersion: string;
    /** Not consulted in phase 1. See the note above. */
    tools: AgentTool[];
    /**
     * Ceiling on completion tokens. Sized per domain: a recipe with ingredients
     * and a method is genuinely longer than a shopping list, and a single ceiling
     * would either truncate the first or leave the second unbounded.
     */
    maxTokens: number;
}

export const REGISTRY: Record<AgentName, Specialist> = {
    recipe: {
        name: 'recipe',
        systemPrompt: recipe.SYSTEM_PROMPT,
        promptVersion: recipe.PROMPT_VERSION,
        tools: ['web_search'],
        maxTokens: 2200,
    },
    trip: {
        name: 'trip',
        systemPrompt: trip.SYSTEM_PROMPT,
        promptVersion: trip.PROMPT_VERSION,
        tools: ['web_search', 'user_context'],
        maxTokens: 2400,
    },
    schedule: {
        name: 'schedule',
        systemPrompt: schedule.SYSTEM_PROMPT,
        promptVersion: schedule.PROMPT_VERSION,
        tools: ['user_context'],
        maxTokens: 1600,
    },
    shopping: {
        name: 'shopping',
        systemPrompt: shopping.SYSTEM_PROMPT,
        promptVersion: shopping.PROMPT_VERSION,
        tools: ['user_context'],
        maxTokens: 1600,
    },
    project: {
        name: 'project',
        systemPrompt: project.SYSTEM_PROMPT,
        promptVersion: project.PROMPT_VERSION,
        tools: ['user_context'],
        maxTokens: 2000,
    },
    general: {
        name: 'general',
        systemPrompt: general.SYSTEM_PROMPT,
        promptVersion: general.PROMPT_VERSION,
        tools: [],
        maxTokens: 1800,
    },
};

/**
 * Resolve a router-supplied name. Falls back to `general` rather than failing:
 * an unrecognised agent name is a routing miss, and a general plan is a far
 * better answer to that than an error the user cannot act on.
 */
export function resolveAgent(name: unknown): Specialist {
    if (typeof name === 'string' && name in REGISTRY) {
        return REGISTRY[name as AgentName];
    }
    return REGISTRY.general;
}
