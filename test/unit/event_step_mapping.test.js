import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createGameplayComparatorPolicy } from '../comparison/comparator_policy.js';
import { buildComparisonArtifact } from '../comparison/comparison_artifacts.js';

describe('event step mapping', () => {
    it('maps event divergence steps using comparable events only', () => {
        const session = {
            startup: { rng: [] },
            steps: [
                { key: 'a', rng: ['^repaint[flush hp=1]', '^foo[1]'] },
                { key: 'b', rng: ['^bar[2]'] },
            ],
        };
        const policy = createGameplayComparatorPolicy(session);
        const cmp = policy.compareEvents(
            ['^foo[1]', '^bar[9]'],
            ['^repaint[flush hp=1]', '^foo[1]', '^bar[2]']
        );
        assert.equal(cmp.firstDivergence.index, 1);
        assert.equal(cmp.firstDivergence.step, 2);
    });

    it('preserves comparable-event raw mappings in artifacts', () => {
        const session = {
            file: 'sample.session.json',
            startup: { rng: [] },
            steps: [
                { key: 'a', rng: ['^repaint[flush hp=1]', '^foo[1]'] },
                { key: 'b', rng: ['^bar[2]'] },
            ],
            meta: { type: 'gameplay', seed: 1, options: {} },
        };
        const replay = {
            startup: { rng: [] },
            steps: [
                { key: 'a', rng: ['^foo[1]'] },
                { key: 'b', rng: ['^bar[9]'] },
            ],
        };
        const result = {
            passed: false,
            metrics: {},
            firstDivergences: {
                event: { index: 1 },
            },
            duration: 1,
        };
        const artifact = buildComparisonArtifact(session, replay, null, result);
        assert.deepEqual(artifact.comparison.event.session.stepEnds, [0, 1, 2]);
        assert.deepEqual(artifact.comparison.event.session.rawIndexMap, [1, 2]);
        assert.deepEqual(artifact.comparison.event.js.stepEnds, [0, 1, 2]);
        assert.deepEqual(artifact.comparison.event.js.rawIndexMap, [0, 1]);
    });
});
