import { AppLanguage } from '../../types';
import type { AgentName, AgentStage } from './agent';

/**
 * The words the progressive status line says, and nothing else.
 *
 * Kept as a pure function apart from the component so it can be tested without
 * the React Native render stack — every other suite in this project is
 * logic-only, and a status line that says the wrong thing is exactly the kind of
 * regression that is cheap to catch here and expensive to catch on a device.
 *
 * Every stage below corresponds to a real event: `transcribing` to the Whisper
 * call being in flight, the rest to server-sent events from `ai-agent`. There is
 * deliberately no stage a timer could reach on its own — a progress line that
 * advances by itself is most confident precisely when the request has stalled.
 */

/** Local capture, then the server stages. */
export type PipelineStage = { stage: 'transcribing' } | AgentStage;

/**
 * The router's `topic` is model output rendered verbatim, so it is bounded here
 * rather than trusted. A pathological topic would otherwise push the status line
 * to several lines and shift the whole screen.
 */
const MAX_TOPIC = 40;

function cleanTopic(topic: string | null): string | null {
    if (!topic) return null;
    const trimmed = topic.trim().replace(/\s+/g, ' ');
    if (!trimmed) return null;
    return trimmed.length > MAX_TOPIC ? `${trimmed.slice(0, MAX_TOPIC - 1)}…` : trimmed;
}

/**
 * What each specialist says while it works.
 *
 * `topic` is the phrasing when the router named the subject ("Butter Chicken");
 * `generic` is the fallback when it did not. The fallback is deliberately vague
 * rather than invented — "planning your recipe" is honest, "planning your Butter
 * Chicken" when we were never told the dish is not.
 */
type AgentCopy = { topic: (t: string) => string; generic: string };

const EN: Record<AgentName, AgentCopy> = {
    recipe: {
        topic: (t) => `Recipe agent is planning ${t}`,
        generic: 'Recipe agent is planning your dish',
    },
    trip: {
        topic: (t) => `Trip planner is mapping out ${t}`,
        generic: 'Trip planner is mapping out your trip',
    },
    schedule: {
        topic: (t) => `Scheduler is laying out ${t}`,
        generic: 'Scheduler is laying out your day',
    },
    shopping: {
        topic: (t) => `Building your ${t} list`,
        generic: 'Building your shopping list',
    },
    project: {
        topic: (t) => `Breaking down ${t}`,
        generic: 'Breaking your project into steps',
    },
    general: {
        topic: (t) => `Planning ${t}`,
        generic: 'Planning your task',
    },
};

const HI: Record<AgentName, AgentCopy> = {
    recipe: {
        topic: (t) => `रेसिपी एजेंट ${t} की योजना बना रहा है`,
        generic: 'रेसिपी एजेंट योजना बना रहा है',
    },
    trip: {
        topic: (t) => `ट्रिप प्लानर ${t} की योजना बना रहा है`,
        generic: 'ट्रिप प्लानर योजना बना रहा है',
    },
    schedule: {
        topic: (t) => `${t} का शेड्यूल बन रहा है`,
        generic: 'आपके दिन का शेड्यूल बन रहा है',
    },
    shopping: {
        topic: (t) => `${t} की सूची बन रही है`,
        generic: 'खरीदारी की सूची बन रही है',
    },
    project: {
        topic: (t) => `${t} के चरण बन रहे हैं`,
        generic: 'आपके प्रोजेक्ट के चरण बन रहे हैं',
    },
    general: {
        topic: (t) => `${t} की योजना बन रही है`,
        generic: 'आपके काम की योजना बन रही है',
    },
};

const GENERIC = {
    en: {
        transcribing: 'Transcribing…',
        understanding: 'Understanding what you need…',
        building: (n: number) => (n === 1 ? '1 step so far…' : `${n} steps so far…`),
        ready: (n: number) => (n === 1 ? '1 step ready' : `${n} steps ready`),
    },
    hi: {
        transcribing: 'लिख रहे हैं…',
        understanding: 'समझ रहे हैं कि आपको क्या चाहिए…',
        building: (n: number) => `${n} चरण अब तक…`,
        ready: (n: number) => `${n} चरण तैयार`,
    },
} as const;

/**
 * The line to show for a stage.
 *
 * Exhaustive over `PipelineStage` by construction: the switch returns in every
 * arm and the function has no trailing `return`, so adding a stage without
 * adding its copy is a compile error rather than a blank status line.
 */
export function agentStatusLine(stage: PipelineStage, language: AppLanguage): string {
    const copy = language === 'hi' ? GENERIC.hi : GENERIC.en;

    switch (stage.stage) {
        case 'transcribing':
            return copy.transcribing;
        case 'understanding':
            return copy.understanding;
        case 'planning': {
            const table = language === 'hi' ? HI : EN;
            // An agent name we do not recognise still has to say something — the
            // server could ship a seventh specialist before the app does.
            const agent = table[stage.agent] ?? table.general;
            const topic = cleanTopic(stage.topic);
            // Explicitly `null`, not truthiness: "no topic" is `cleanTopic`'s
            // contract to state, and a truthiness check here would quietly cover
            // for it returning an empty string — so a regression in the cleaner
            // would produce "Recipe agent is planning " with nothing after it,
            // and nothing would fail.
            return topic === null ? agent.generic : agent.topic(topic);
        }
        case 'building':
            return copy.building(stage.todos);
        case 'ready':
            return copy.ready(stage.todos);
    }
}

/**
 * How far along the pipeline a stage is, 0–1, for the progress bar.
 *
 * `building` is deliberately not a function of the todo count: the total is
 * unknown while the steps are still arriving, so any percentage derived from it
 * would be made up. It sits at a fixed point and the *count* does the talking.
 */
export function agentStatusProgress(stage: PipelineStage): number {
    switch (stage.stage) {
        case 'transcribing':
            return 0.2;
        case 'understanding':
            return 0.45;
        case 'planning':
            return 0.65;
        case 'building':
            return 0.85;
        case 'ready':
            return 1;
    }
}
