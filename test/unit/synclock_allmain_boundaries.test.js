import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('synclock allmain boundary hygiene', () => {
    it('keeps nhgetch_wrap usage explicit (handleMore disabled)', () => {
        const src = readFileSync(resolve('js/allmain.js'), 'utf8');
        assert.equal(src.includes('nhgetch_wrap()'), false);
        assert.equal(src.includes('nhgetch_wrap({ handleMore: true })'), false);
        assert.equal(src.includes('nhgetch_wrap({ handleMore: false })'), true);
    });

    it('does not use raw setTimeout(0) awaits in allmain command loop paths', () => {
        const src = readFileSync(resolve('js/allmain.js'), 'utf8');
        assert.equal(/await\s+new\s+Promise\s*\(\s*r\s*=>\s*setTimeout\s*\(\s*r\s*,\s*0\s*\)\s*\)/.test(src), false);
        // Ensure canonical display sync primitive is used for loop-frame yields.
        assert.equal(src.includes('await display_sync();'), true);
    });
});
