// test/unit/epitaph.test.js -- Tests for epitaph data loading and selection
// C ref: engrave.c make_grave() → get_rnd_text(EPITAPHFILE, ...)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseEncryptedDataFile } from '../../js/hacklib.js';
import { initRng, rn2 } from '../../js/rng.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

// Load epitaph data the same way dungeon.js does
function loadEpitaphData() {
    const filePath = join(rootDir, 'nethack-c/install/games/lib/nethackdir/epitaph');
    const fileText = readFileSync(filePath, 'ascii');
    return parseEncryptedDataFile(fileText);
}

// Replicate get_rnd_line_index from dungeon.js for testing
function get_rnd_line_index(lineBytes, chunksize, padlength) {
    for (let trylimit = 10; trylimit > 0; trylimit--) {
        const chunkoffset = rn2(chunksize);
        let pos = 0;
        let lineIdx = 0;
        while (lineIdx < lineBytes.length && pos + lineBytes[lineIdx] <= chunkoffset) {
            pos += lineBytes[lineIdx];
            lineIdx++;
        }
        if (lineIdx < lineBytes.length) {
            const remaining = lineBytes[lineIdx] - (chunkoffset - pos);
            if (padlength === 0 || remaining <= padlength + 1) {
                const nextIdx = (lineIdx + 1) % lineBytes.length;
                return nextIdx;
            }
        } else {
            return 0;
        }
    }
    return 0;
}

describe('epitaph selection', () => {
    it('get_rnd_line_index returns valid indices for epitaph data', () => {
        const data = loadEpitaphData();
        initRng(42);
        for (let i = 0; i < 100; i++) {
            const idx = get_rnd_line_index(data.lineBytes, data.chunksize, 60);
            assert.ok(idx >= 0 && idx < data.texts.length,
                `index ${idx} should be in [0, ${data.texts.length})`);
        }
    });

    it('seeded RNG produces deterministic epitaph selection', () => {
        const data = loadEpitaphData();
        const results1 = [];
        const results2 = [];

        initRng(123);
        for (let i = 0; i < 20; i++) {
            const idx = get_rnd_line_index(data.lineBytes, data.chunksize, 60);
            results1.push(data.texts[idx]);
        }

        initRng(123);
        for (let i = 0; i < 20; i++) {
            const idx = get_rnd_line_index(data.lineBytes, data.chunksize, 60);
            results2.push(data.texts[idx]);
        }

        assert.deepEqual(results1, results2);
    });

    it('epitaph chunksize matches EPITAPH_FILE_CHUNKSIZE (24075)', () => {
        const data = loadEpitaphData();
        assert.equal(data.chunksize, 24075);
    });

    it('all epitaph line bytes are at least 60 (padded to MD_PAD_RUMORS)', () => {
        const data = loadEpitaphData();
        for (let i = 0; i < data.lineBytes.length; i++) {
            // Short lines are padded to 60 bytes (59 chars + newline).
            // Lines already >= 59 chars are not truncated, so can be longer.
            assert.ok(data.lineBytes[i] >= 60,
                `line ${i} should be at least 60 bytes, got ${data.lineBytes[i]}`);
        }
    });

    it('selected epitaphs are non-empty strings', () => {
        const data = loadEpitaphData();
        initRng(42);
        for (let i = 0; i < 50; i++) {
            const idx = get_rnd_line_index(data.lineBytes, data.chunksize, 60);
            const text = data.texts[idx];
            assert.ok(typeof text === 'string' && text.length > 0,
                `epitaph at index ${idx} should be non-empty`);
        }
    });
});
