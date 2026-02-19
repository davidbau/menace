import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { initDiscoveryState, discoverObject } from '../../js/discovery.js';
import { POT_HEALING, POT_EXTRA_HEALING, POT_SICKNESS } from '../../js/objects.js';

function makeDisplay(rows = 4, cols = 80) {
    return {
        rows,
        cols,
        topMessage: null,
        messageNeedsMore: true,
        putstrCalls: [],
        clearScreenCount: 0,
        screenLines: Array.from({ length: rows }, (_, i) => `map-row-${i}`),
        clearScreen() {
            this.clearScreenCount++;
            this.screenLines = Array.from({ length: this.rows }, () => '');
        },
        clearRow(row) {
            if (row >= 0 && row < this.rows) this.screenLines[row] = '';
        },
        putstr(col, row, str, color, attr) {
            this.putstrCalls.push({ col, row, str, color, attr });
            if (row < 0 || row >= this.rows) return;
            const indent = ' '.repeat(Math.max(0, col || 0));
            this.screenLines[row] = (indent + String(str || '')).slice(0, this.cols);
        },
        putstr_message(msg) {
            this.topMessage = msg;
        },
        getScreenLines() {
            return [...this.screenLines];
        },
        setScreenLines(lines) {
            this.screenLines = Array.from({ length: this.rows }, (_, i) => String(lines?.[i] || ''));
        },
    };
}

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11); // Wizard
    player.x = 10;
    player.y = 10;
    const display = makeDisplay();
    return {
        game: {
            player,
            map,
            display,
            fov: null,
            flags: { verbose: true, cmdassist: true, safe_wait: true },
            menuRequested: false,
            commandCount: 0,
            multi: 0,
        },
    };
}

describe('discoveries modal command', () => {
    beforeEach(() => {
        clearInputQueue();
        initDiscoveryState();
    });

    it('paginates and restores the prior screen on space dismiss', async () => {
        const { game } = makeGame();
        const before = game.display.getScreenLines();

        discoverObject(POT_HEALING, true, true);
        discoverObject(POT_EXTRA_HEALING, true, true);
        discoverObject(POT_SICKNESS, true, true);

        pushInput(' '.charCodeAt(0)); // next page
        pushInput(' '.charCodeAt(0)); // dismiss

        const result = await rhack('\\'.charCodeAt(0), game);

        assert.equal(result.moved, false);
        assert.equal(result.tookTime, false);
        assert.ok(game.display.clearScreenCount >= 2);
        assert.ok(game.display.putstrCalls.some((w) => w.row === game.display.rows - 1 && w.str === '--More--'));
        assert.deepEqual(game.display.getScreenLines(), before);
        assert.equal(game.display.topMessage, null);
        assert.equal(game.display.messageNeedsMore, false);
    });

    it('prints empty-discoveries message when there are no discoveries', async () => {
        const { game } = makeGame();
        const result = await rhack('\\'.charCodeAt(0), game);
        assert.equal(result.moved, false);
        assert.equal(result.tookTime, false);
        assert.match(game.display.topMessage || '', /haven't discovered anything yet/i);
    });
});
