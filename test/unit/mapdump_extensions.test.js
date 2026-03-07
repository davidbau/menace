import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseCompactMapdump } from '../../test/comparison/session_loader.js';
import { compareMapdumpCheckpoints } from '../../test/comparison/comparators.js';

function baseDump() {
    return [
        'T~80,0',
        'F~80,0',
        'H~80,0',
        'L~80,0',
        'R~80,0',
        'O39,4,7,1',
        'M64,11,32,12',
        'K39,4,15',
        '',
    ].join('\n');
}

describe('mapdump extensions', () => {
    it('parses optional extension sections', () => {
        const text = [
            'T~80,0',
            'F~80,0',
            'H~80,0',
            'L~80,0',
            'R~80,0',
            'W~80,0',
            'U39,4,12,12,8,8,0,0,0,1,123,0,0,0,0,0',
            'A100,72',
            'Q1,39,4,7,1,1,0,0,10,97,0,0,0,0',
            'N44,64,11,32,12,12,0,0,0,0,1,0,0,0,0',
            'J39,4,15,1,0,0,-1,-1',
            'O39,4,7,1',
            'M64,11,32,12',
            'K39,4,15',
            '',
        ].join('\n');
        const parsed = parseCompactMapdump(text);
        assert.ok(parsed);
        assert.equal(Array.isArray(parsed.wallInfoGrid), true);
        assert.deepEqual(parsed.hero, [39, 4, 12, 12, 8, 8, 0, 0, 0, 1, 123, 0, 0, 0, 0, 0]);
        assert.deepEqual(parsed.anchor, [100, 72]);
        assert.equal(parsed.objectDetails.length, 1);
        assert.equal(parsed.monsterDetails.length, 1);
        assert.equal(parsed.trapDetails.length, 1);
    });

    it('keeps comparison backward-compatible when optional sections are absent on one side', () => {
        const withOptional = [
            'T~80,0',
            'F~80,0',
            'H~80,0',
            'L~80,0',
            'R~80,0',
            'W~80,0',
            'U39,4,12,12,8,8,0,0,0,1,123,0,0,0,0,0',
            'A100,72',
            'Q1,39,4,7,1,1,0,0,10,97,0,0,0,0',
            'N44,64,11,32,12,12,0,0,0,0,1,0,0,0,0',
            'J39,4,15,1,0,0,-1,-1',
            'O39,4,7,1',
            'M64,11,32,12',
            'K39,4,15',
            '',
        ].join('\n');
        const cmp = compareMapdumpCheckpoints(
            { d0l1_001: withOptional },
            { d0l1_001: baseDump() }
        );
        assert.equal(cmp.matched, 1);
        assert.equal(cmp.total, 1);
        assert.equal(cmp.firstDivergence, null);
    });

    it('compares optional sections when both sides provide them', () => {
        const left = [
            'T~80,0',
            'F~80,0',
            'H~80,0',
            'L~80,0',
            'R~80,0',
            'W~80,0',
            'U39,4,12,12,8,8,0,0,0,1,123,0,0,0,0,0',
            'O',
            'M',
            'K',
            '',
        ].join('\n');
        const right = [
            'T~80,0',
            'F~80,0',
            'H~80,0',
            'L~80,0',
            'R~80,0',
            'W~80,0',
            'U40,4,12,12,8,8,0,0,0,1,123,0,0,0,0,0',
            'O',
            'M',
            'K',
            '',
        ].join('\n');
        const cmp = compareMapdumpCheckpoints(
            { d0l1_001: left },
            { d0l1_001: right }
        );
        assert.equal(cmp.matched, 0);
        assert.equal(cmp.total, 1);
        assert.equal(cmp.firstDivergence?.kind, 'vector');
        assert.equal(cmp.firstDivergence?.section, 'U');
    });

    it('compares present-but-empty optional sparse sections', () => {
        const left = [
            'T~80,0',
            'F~80,0',
            'H~80,0',
            'L~80,0',
            'R~80,0',
            'Q',
            'O',
            'M',
            'K',
            '',
        ].join('\n');
        const right = [
            'T~80,0',
            'F~80,0',
            'H~80,0',
            'L~80,0',
            'R~80,0',
            'Q1,39,4,7,1,1,0,0,10,97,0,0,0,0',
            'O',
            'M',
            'K',
            '',
        ].join('\n');
        const cmp = compareMapdumpCheckpoints(
            { d0l1_001: left },
            { d0l1_001: right }
        );
        assert.equal(cmp.matched, 0);
        assert.equal(cmp.total, 1);
        assert.equal(cmp.firstDivergence?.kind, 'sparse');
        assert.equal(cmp.firstDivergence?.section, 'Q');
    });
});
