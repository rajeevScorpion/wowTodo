/**
 * The progressive status line.
 *
 * Worth testing rather than eyeballing, because the failure mode is not a crash:
 * it is the app confidently telling the user something that is not true. The
 * removed review screen used to cover this wait, so whatever fills it now has to
 * be honest about what is actually happening — particularly when the router did
 * NOT tell us the subject, which is exactly when a template is most tempted to
 * invent one.
 */

import { agentStatusLine, agentStatusProgress, type PipelineStage } from '../agentStatus';

describe('agentStatusLine', () => {
    it('names the specialist and the topic the router actually returned', () => {
        const line = agentStatusLine(
            { stage: 'planning', agent: 'recipe', topic: 'Butter Chicken' },
            'en',
        );

        expect(line).toBe('Recipe agent is planning Butter Chicken');
    });

    it('stays generic when the router did not name a topic', () => {
        // The whole point of the contextual line is that it is true. With no topic
        // the honest wording is vague; the failure to guard against is a template
        // that renders "planning undefined" or, worse, a plausible invented dish.
        const line = agentStatusLine({ stage: 'planning', agent: 'recipe', topic: null }, 'en');

        expect(line).toBe('Recipe agent is planning your dish');
        expect(line).not.toMatch(/undefined|null/);
    });

    it('treats a whitespace-only topic as no topic', () => {
        const line = agentStatusLine({ stage: 'planning', agent: 'trip', topic: '   ' }, 'en');

        expect(line).toBe('Trip planner is mapping out your trip');
    });

    it('bounds a runaway topic instead of letting it reflow the screen', () => {
        const topic = 'a'.repeat(200);
        const line = agentStatusLine({ stage: 'planning', agent: 'general', topic }, 'en');

        expect(line.length).toBeLessThan(60);
        expect(line.endsWith('…')).toBe(true);
    });

    it('falls back to the general wording for an agent the app does not know', () => {
        // The server can ship a seventh specialist before the app does. That must
        // degrade to a plain line, not to a blank one or a crash.
        const stage = { stage: 'planning', agent: 'gardening', topic: 'the herb bed' } as unknown as PipelineStage;

        expect(agentStatusLine(stage, 'en')).toBe('Planning the herb bed');
    });

    it('speaks Devanagari for Hindi, not transliterated English', () => {
        const line = agentStatusLine({ stage: 'planning', agent: 'recipe', topic: 'बटर चिकन' }, 'hi');

        expect(line).toContain('बटर चिकन');
        expect(line).toMatch(/[ऀ-ॿ]/);
        expect(line).not.toMatch(/[A-Za-z]/);
    });

    it('counts steps in the singular when there is one', () => {
        expect(agentStatusLine({ stage: 'building', todos: 1 }, 'en')).toBe('1 step so far…');
        expect(agentStatusLine({ stage: 'building', todos: 6 }, 'en')).toBe('6 steps so far…');
        expect(agentStatusLine({ stage: 'ready', todos: 1 }, 'en')).toBe('1 step ready');
        expect(agentStatusLine({ stage: 'ready', todos: 8 }, 'en')).toBe('8 steps ready');
    });

    it('has wording for every stage in both languages', () => {
        const stages: PipelineStage[] = [
            { stage: 'transcribing' },
            { stage: 'understanding' },
            { stage: 'planning', agent: 'schedule', topic: null },
            { stage: 'building', todos: 3 },
            { stage: 'ready', todos: 3 },
        ];

        for (const stage of stages) {
            for (const language of ['en', 'hi'] as const) {
                expect(agentStatusLine(stage, language).trim().length).toBeGreaterThan(0);
            }
        }
    });
});

describe('agentStatusProgress', () => {
    it('advances monotonically along the real pipeline order', () => {
        const order: PipelineStage[] = [
            { stage: 'transcribing' },
            { stage: 'understanding' },
            { stage: 'planning', agent: 'recipe', topic: null },
            { stage: 'building', todos: 2 },
            { stage: 'ready', todos: 8 },
        ];

        const values = order.map(agentStatusProgress);

        expect(values).toEqual([...values].sort((a, b) => a - b));
        expect(new Set(values).size).toBe(values.length);
        expect(values[values.length - 1]).toBe(1);
    });

    it('does not derive progress from the step count', () => {
        // The total is unknown while steps are still arriving, so any percentage
        // computed from the running count would be fabricated — and it would move
        // fastest on the longest lists, which is precisely backwards.
        expect(agentStatusProgress({ stage: 'building', todos: 1 })).toBe(
            agentStatusProgress({ stage: 'building', todos: 14 }),
        );
    });
});
