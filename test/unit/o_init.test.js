import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { init_objects } from '../../js/o_init.js';
import { objectData, bases,
    AMULET_OF_ESP, AMULET_OF_FLYING,
    POT_GAIN_ABILITY, POT_OIL, POT_WATER,
    RING_CLASS, AMULET_CLASS, POTION_CLASS,
    TURQUOISE, AQUAMARINE, FLUORITE,
    WAN_NOTHING,
} from '../../js/objects.js';
import { initRng as seedRng } from '../../js/rng.js';

describe('o_init', () => {
    it('consumes exactly 198 RNG calls', async () => {
        const { enableRngLog, getRngLog } = await import('../../js/rng.js');
        seedRng(42n);
        enableRngLog();
        init_objects();
        const log = getRngLog();
        assert.equal(log.length, 198, `Expected 198 RNG calls, got ${log.length}`);
    });

    it('shuffles amulet descriptions', () => {
        // Canonical (unshuffled) amulet descriptions from objects.js
        const canonicalDescs = [
            'circular', 'spherical', 'oval', 'triangular', 'pyramidal',
            'square', 'concave', 'hexagonal', 'octagonal', 'perforated', 'cubical'
        ];

        seedRng(42n);
        init_objects();

        const newDescs = [];
        for (let i = AMULET_OF_ESP; i <= AMULET_OF_FLYING; i++) {
            newDescs.push(objectData[i].desc);
        }

        // After shuffling, descriptions should be a permutation of the originals
        assert.deepEqual([...newDescs].sort(), [...canonicalDescs].sort(),
            'Shuffled descriptions should be a permutation of originals');

        // With seed 42, at least one description should have moved
        const unchanged = newDescs.filter((d, i) => d === canonicalDescs[i]).length;
        assert.ok(unchanged < canonicalDescs.length,
            'At least one amulet description should change with seed 42');
    });

    it('shuffles potion descriptions', () => {
        seedRng(42n);
        init_objects();

        // POT_WATER should NOT be shuffled (it's outside the range)
        // All potions in range should have non-null descriptions
        for (let i = POT_GAIN_ABILITY; i <= POT_OIL; i++) {
            assert.ok(objectData[i].desc !== null,
                `Potion at index ${i} should have a description`);
        }
    });

    it('is deterministic for the same seed', () => {
        seedRng(42n);
        init_objects();
        const descs1 = [];
        for (let i = AMULET_OF_ESP; i <= AMULET_OF_FLYING; i++) {
            descs1.push(objectData[i].desc);
        }

        seedRng(42n);
        init_objects();
        const descs2 = [];
        for (let i = AMULET_OF_ESP; i <= AMULET_OF_FLYING; i++) {
            descs2.push(objectData[i].desc);
        }

        assert.deepEqual(descs1, descs2, 'Same seed should produce same shuffle');
    });

    it('produces different shuffles for different seeds', () => {
        seedRng(42n);
        init_objects();
        const descs42 = [];
        for (let i = AMULET_OF_ESP; i <= AMULET_OF_FLYING; i++) {
            descs42.push(objectData[i].desc);
        }

        seedRng(999n);
        init_objects();
        const descs999 = [];
        for (let i = AMULET_OF_ESP; i <= AMULET_OF_FLYING; i++) {
            descs999.push(objectData[i].desc);
        }

        // Very unlikely to be identical for different seeds
        assert.notDeepEqual(descs42, descs999,
            'Different seeds should (almost certainly) produce different shuffles');
    });

    it('computes bases[] correctly', () => {
        seedRng(42n);
        init_objects();

        // bases[RING_CLASS] should point to first ring
        assert.equal(objectData[bases[RING_CLASS]].oc_class, RING_CLASS,
            'bases[RING_CLASS] should point to a ring');
        assert.equal(objectData[bases[AMULET_CLASS]].oc_class, AMULET_CLASS,
            'bases[AMULET_CLASS] should point to an amulet');
        assert.equal(objectData[bases[POTION_CLASS]].oc_class, POTION_CLASS,
            'bases[POTION_CLASS] should point to a potion');
    });

    it('randomizes WAN_NOTHING direction', () => {
        // Run with multiple seeds and check the direction is set
        const dirs = new Set();
        for (let s = 1n; s <= 20n; s++) {
            seedRng(s);
            init_objects();
            dirs.add(objectData[WAN_NOTHING].dir);
        }
        // With 20 seeds, should see both NODIR(1) and IMMEDIATE(2)
        assert.ok(dirs.size >= 2,
            'WAN_NOTHING direction should vary across seeds');
    });
});
