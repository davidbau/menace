import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('synclock allmain boundary hygiene', () => {
    it('does not use raw await nhgetch() in allmain game loop paths', () => {
        const src = readFileSync(resolve('js/allmain.js'), 'utf8');
        assert.equal(/await\s+nhgetch\s*\(/.test(src), false);
        // Ensure typed wrapper is present for loop-input waits.
        assert.equal(src.includes('await awaitInput(this, nhgetch()'), true);
    });

    it('does not use raw setTimeout(0) awaits in allmain command loop paths', () => {
        const src = readFileSync(resolve('js/allmain.js'), 'utf8');
        assert.equal(/await\s+new\s+Promise\s*\(\s*r\s*=>\s*setTimeout\s*\(\s*r\s*,\s*0\s*\)\s*\)/.test(src), false);
        // Ensure typed animation wrapper remains in use.
        assert.equal(src.includes('await awaitAnim(this, new Promise(r => setTimeout(r, 0))'), true);
    });
});

