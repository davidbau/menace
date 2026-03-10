import { beforeEach, describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import {
    init_nhwindows, create_nhwindow, destroy_nhwindow, clear_nhwindow,
    display_nhwindow,
    start_menu, add_menu, end_menu, select_menu, putstr,
    getWinMessage,
} from '../../js/windows.js';
import {
    NHW_MESSAGE, NHW_MENU, NHW_TEXT,
    PICK_NONE, PICK_ONE, PICK_ANY,
    MENU_BEHAVE_STANDARD, ATR_NONE,
} from '../../js/const.js';
import { handleInventory } from '../../js/invent.js';
import { handleKnownSpells } from '../../js/spell.js';
import { Player } from '../../js/player.js';
import { SPE_HEALING, WEAPON_CLASS } from '../../js/objects.js';

function makeDisplay() {
    return {
        messages: [],
        lastMenuLines: null,
        putstr_message(msg) { this.messages.push(msg); },
        renderMoreMarker() { this.messages.push('--More--'); },
        clearRow() {},
        renderChargenMenu(lines) { this.lastMenuLines = lines; },
    };
}

describe('nhwindow infrastructure (windows.js)', () => {
    beforeEach(() => {
        setThrowOnEmptyInput(true);
        clearInputQueue();
        // Reset module state before each test
        init_nhwindows(null, null, null);
    });

    describe('init_nhwindows', () => {
        it('creates WIN_MESSAGE window', () => {
            const display = makeDisplay();
            init_nhwindows(display, null, null);
            const winMessage = getWinMessage();
            assert.ok(typeof winMessage === 'number' && winMessage >= 1);
        });

        it('resets wins state on each call', () => {
            init_nhwindows(null, null, null);
            const win1 = create_nhwindow(NHW_MENU);
            init_nhwindows(null, null, null);
            // After re-init, slot win1 should be free again
            const win2 = create_nhwindow(NHW_MENU);
            assert.equal(win2, win1); // same slot reused
        });
    });

    describe('create_nhwindow / destroy_nhwindow', () => {
        it('returns a valid window id', () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            assert.ok(typeof win === 'number' && win >= 1);
        });

        it('allocates distinct ids for multiple windows', () => {
            init_nhwindows(null, null, null);
            const a = create_nhwindow(NHW_MENU);
            const b = create_nhwindow(NHW_TEXT);
            assert.notEqual(a, b);
        });

        it('destroy_nhwindow is safe to call on already-destroyed window', () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            destroy_nhwindow(win);
            assert.doesNotThrow(() => destroy_nhwindow(win));
        });

        it('freed slot is reused after destroy', () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            destroy_nhwindow(win);
            const win2 = create_nhwindow(NHW_MENU);
            assert.equal(win2, win);
        });
    });

    describe('rerender callback on destroy (bug #162 fix)', () => {
        it('calls rerender callback when NHW_MENU window is destroyed', () => {
            let rerenderCount = 0;
            init_nhwindows(null, null, () => { rerenderCount++; });
            const win = create_nhwindow(NHW_MENU);
            destroy_nhwindow(win);
            assert.equal(rerenderCount, 1);
        });

        it('calls rerender callback when NHW_TEXT window is destroyed', () => {
            let rerenderCount = 0;
            init_nhwindows(null, null, () => { rerenderCount++; });
            const win = create_nhwindow(NHW_TEXT);
            destroy_nhwindow(win);
            assert.equal(rerenderCount, 1);
        });

        it('does NOT call rerender callback when NHW_MESSAGE window is destroyed', () => {
            let rerenderCount = 0;
            init_nhwindows(null, null, () => { rerenderCount++; });
            const win = create_nhwindow(NHW_MESSAGE);
            destroy_nhwindow(win);
            assert.equal(rerenderCount, 0);
        });

        it('does not throw when rerender callback is null', () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            assert.doesNotThrow(() => destroy_nhwindow(win));
        });
    });

    describe('tutorial prompt rerender pattern', () => {
        // Mirrors _maybeDoTutorial() in nethack.js:
        //   select_menu → destroy_nhwindow → if y: enterTutorial
        // destroy_nhwindow must run on BOTH n-path and y-path.

        it('n-path: rerender fires unconditionally after select_menu', async () => {
            let rerenderCalled = false;
            init_nhwindows(null, null, () => { rerenderCalled = true; });
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, { ival: 'y' }, 'y'.charCodeAt(0), 0, ATR_NONE, 0, 'Yes, do a tutorial', 0);
            add_menu(win, null, { ival: 'n' }, 'n'.charCodeAt(0), 0, ATR_NONE, 0, 'No, just start play', 0);
            end_menu(win, ' Do you want a tutorial?');

            pushInput('n'.charCodeAt(0));
            const sel = await select_menu(win, PICK_ONE);
            destroy_nhwindow(win); // mirrors nethack.js: always called before checking sel

            assert.equal(rerenderCalled, true, 'rerender must fire on n-path');
            assert.ok(sel !== null, 'n returns a selection (not cancel)');
            assert.equal(sel[0].identifier.ival, 'n');
        });

        it('y-path: rerender fires before entering tutorial', async () => {
            let rerenderCalled = false;
            init_nhwindows(null, null, () => { rerenderCalled = true; });
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, { ival: 'y' }, 'y'.charCodeAt(0), 0, ATR_NONE, 0, 'Yes, do a tutorial', 0);
            add_menu(win, null, { ival: 'n' }, 'n'.charCodeAt(0), 0, ATR_NONE, 0, 'No, just start play', 0);
            end_menu(win, ' Do you want a tutorial?');

            pushInput('y'.charCodeAt(0));
            const sel = await select_menu(win, PICK_ONE);
            destroy_nhwindow(win); // rerender before enterTutorial

            assert.equal(rerenderCalled, true, 'rerender must fire on y-path');
            assert.ok(sel !== null);
            assert.equal(sel[0].identifier.ival, 'y');
        });

        it('ESC-path: rerender fires and selection is null', async () => {
            let rerenderCalled = false;
            init_nhwindows(null, null, () => { rerenderCalled = true; });
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, { ival: 'y' }, 'y'.charCodeAt(0), 0, ATR_NONE, 0, 'Yes, do a tutorial', 0);
            add_menu(win, null, { ival: 'n' }, 'n'.charCodeAt(0), 0, ATR_NONE, 0, 'No, just start play', 0);
            end_menu(win, ' Do you want a tutorial?');

            pushInput(27); // ESC
            const sel = await select_menu(win, PICK_ONE);
            destroy_nhwindow(win);

            assert.equal(rerenderCalled, true, 'rerender must fire on ESC-path');
            assert.equal(sel, null);
        });
    });

    describe('select_menu PICK_NONE', () => {
        it('returns null after space', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            end_menu(win, 'Press any key');
            pushInput(' '.charCodeAt(0));
            const result = await select_menu(win, PICK_NONE);
            assert.equal(result, null);
        });

        it('returns null after any key', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            end_menu(win, '(end)');
            pushInput('x'.charCodeAt(0));
            const result = await select_menu(win, PICK_NONE);
            assert.equal(result, null);
        });
    });

    describe('select_menu PICK_ONE', () => {
        it('returns matching item on key press', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            add_menu(win, null, 'bravo', 'b'.charCodeAt(0), 0, ATR_NONE, 0, 'Option B', 0);
            end_menu(win, 'Choose:');
            pushInput('b'.charCodeAt(0));
            const result = await select_menu(win, PICK_ONE);
            assert.deepEqual(result, [{ identifier: 'bravo', count: -1 }]);
        });

        it('returns null on ESC', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            end_menu(win, 'Choose:');
            pushInput(27);
            const result = await select_menu(win, PICK_ONE);
            assert.equal(result, null);
        });

        it('returns null on q', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            end_menu(win, 'Choose:');
            pushInput('q'.charCodeAt(0));
            const result = await select_menu(win, PICK_ONE);
            assert.equal(result, null);
        });

        it('skips unrecognized keys and waits for valid input', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            end_menu(win, 'Choose:');
            pushInput('z'.charCodeAt(0)); // unrecognized
            pushInput('a'.charCodeAt(0)); // valid
            const result = await select_menu(win, PICK_ONE);
            assert.deepEqual(result, [{ identifier: 'alpha', count: -1 }]);
        });
    });

    describe('end_menu auto-selector assignment', () => {
        it('assigns a, b, c to items with ch=0', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'first',  0, 0, ATR_NONE, 0, 'First',  0);
            add_menu(win, null, 'second', 0, 0, ATR_NONE, 0, 'Second', 0);
            add_menu(win, null, 'third',  0, 0, ATR_NONE, 0, 'Third',  0);
            end_menu(win, 'Pick:');
            // Verify auto-assigned selectors by selecting each one
            pushInput('b'.charCodeAt(0));
            const result = await select_menu(win, PICK_ONE);
            assert.deepEqual(result, [{ identifier: 'second', count: -1 }]);
        });

        it('preserves explicit ch and only auto-assigns to ch=0 items', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'yes', 'y'.charCodeAt(0), 0, ATR_NONE, 0, 'Yes', 0);
            add_menu(win, null, 'no',  'n'.charCodeAt(0), 0, ATR_NONE, 0, 'No',  0);
            end_menu(win, 'Confirm:');
            pushInput('n'.charCodeAt(0));
            const result = await select_menu(win, PICK_ONE);
            assert.deepEqual(result, [{ identifier: 'no', count: -1 }]);
        });
    });

    describe('putstr routing', () => {
        it('routes putstr to display.putstr_message for NHW_MESSAGE window', () => {
            const display = makeDisplay();
            init_nhwindows(display, null, null);
            const winMessage = getWinMessage();
            putstr(winMessage, ATR_NONE, 'hello world');
            assert.ok(display.messages.includes('hello world'));
        });

        it('does not call putstr_message for non-message windows', () => {
            const display = makeDisplay();
            init_nhwindows(display, null, null);
            const win = create_nhwindow(NHW_TEXT);
            putstr(win, ATR_NONE, 'text line');
            assert.equal(display.messages.length, 0);
        });
    });

    describe('clear_nhwindow', () => {
        it('clears mlist and data', () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'x', 'x'.charCodeAt(0), 0, ATR_NONE, 0, 'Item X', 0);
            clear_nhwindow(win);
            // After clear, no items — pressing 'x' should not match anything
            // so select_menu will wait for a cancel key
            pushInput('q'.charCodeAt(0));
            return select_menu(win, PICK_ONE).then(result => {
                assert.equal(result, null);
            });
        });
    });

    describe('select_menu PICK_ANY', () => {
        it('returns null on ESC with nothing selected', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            add_menu(win, null, 'bravo', 'b'.charCodeAt(0), 0, ATR_NONE, 0, 'Option B', 0);
            end_menu(win, 'Pick any:');
            pushInput(27);
            const result = await select_menu(win, PICK_ANY);
            assert.equal(result, null);
        });

        it('returns null on Enter with nothing selected', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            end_menu(win, 'Pick any:');
            pushInput(13);
            const result = await select_menu(win, PICK_ANY);
            assert.equal(result, null);
        });

        it('toggles individual items and confirms with Enter', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            add_menu(win, null, 'bravo', 'b'.charCodeAt(0), 0, ATR_NONE, 0, 'Option B', 0);
            add_menu(win, null, 'charlie', 'c'.charCodeAt(0), 0, ATR_NONE, 0, 'Option C', 0);
            end_menu(win, 'Pick any:');
            pushInput('a'.charCodeAt(0)); // select A
            pushInput('c'.charCodeAt(0)); // select C
            pushInput(13);                // confirm
            const result = await select_menu(win, PICK_ANY);
            assert.ok(Array.isArray(result));
            assert.equal(result.length, 2);
            assert.ok(result.some(r => r.identifier === 'alpha'));
            assert.ok(result.some(r => r.identifier === 'charlie'));
        });

        it('. selects all items', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            add_menu(win, null, 'bravo', 'b'.charCodeAt(0), 0, ATR_NONE, 0, 'Option B', 0);
            end_menu(win, 'Pick any:');
            pushInput('.'.charCodeAt(0)); // select all
            pushInput(13);               // confirm
            const result = await select_menu(win, PICK_ANY);
            assert.ok(Array.isArray(result));
            assert.equal(result.length, 2);
        });

        it('- deselects all items', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            add_menu(win, null, 'bravo', 'b'.charCodeAt(0), 0, ATR_NONE, 0, 'Option B', 0);
            end_menu(win, 'Pick any:');
            pushInput('.'.charCodeAt(0)); // select all
            pushInput('-'.charCodeAt(0)); // deselect all
            pushInput(13);               // confirm (nothing selected)
            const result = await select_menu(win, PICK_ANY);
            assert.equal(result, null);
        });

        it('toggling same item twice deselects it', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            add_menu(win, null, 'alpha', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'Option A', 0);
            add_menu(win, null, 'bravo', 'b'.charCodeAt(0), 0, ATR_NONE, 0, 'Option B', 0);
            end_menu(win, 'Pick any:');
            pushInput('a'.charCodeAt(0)); // select A
            pushInput('a'.charCodeAt(0)); // deselect A
            pushInput('b'.charCodeAt(0)); // select B
            pushInput(13);               // confirm
            const result = await select_menu(win, PICK_ANY);
            assert.ok(Array.isArray(result));
            assert.equal(result.length, 1);
            assert.equal(result[0].identifier, 'bravo');
        });
    });

    describe('end_menu auto-selector z→A boundary', () => {
        it('wraps from z to A after 26 auto-assigned items', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            start_menu(win, MENU_BEHAVE_STANDARD);
            // Add 27 items with no explicit ch — first 26 get a-z, 27th gets A
            for (let i = 0; i < 27; i++) {
                add_menu(win, null, `item${i}`, 0, 0, ATR_NONE, 0, `Item ${i}`, 0);
            }
            end_menu(win, 'Pick:');
            // The 27th item (index 26) should have selector 'A'
            pushInput('A'.charCodeAt(0));
            const result = await select_menu(win, PICK_ONE);
            assert.ok(result !== null, 'A should be a valid selector after z wrap');
            assert.equal(result[0].identifier, 'item26');
        });
    });

    describe('display_nhwindow', () => {
        it('does not throw for non-message window', async () => {
            init_nhwindows(null, null, null);
            const win = create_nhwindow(NHW_MENU);
            await assert.doesNotReject(() => display_nhwindow(win, true));
        });

        it('shows --More-- and waits for key for blocking message window', async () => {
            const display = makeDisplay();
            init_nhwindows(display, null, null);
            // Simulate a message having been shown (toplin = NON_EMPTY)
            const winMessage = getWinMessage();
            putstr(winMessage, ATR_NONE, 'A message');
            pushInput(' '.charCodeAt(0));
            await display_nhwindow(winMessage, true);
            assert.ok(display.messages.some(m => m === '--More--'));
        });
    });

    describe('integration: rerender fires from handleInventory / handleKnownSpells', () => {
        function makeMinimalDisplay() {
            return {
                topMessage: null,
                lastOverlay: null,
                renderOverlayMenuCalls: [],
                putstr_message(msg) { this.topMessage = msg; },
                renderOverlayMenu(lines) {
                    this.renderOverlayMenuCalls.push(lines);
                    this.lastOverlay = lines;
                },
                renderChargenMenu(lines) { this.lastOverlay = lines; },
                clearRow() {},
            };
        }

        it('handleInventory triggers rerender callback on dismiss', async () => {
            let rerenderCalled = false;
            const display = makeMinimalDisplay();
            init_nhwindows(display, null, () => { rerenderCalled = true; });

            const player = new Player();
            player.initRole(11);
            player.inventory = [{ invlet: 'a', oclass: WEAPON_CLASS, otyp: 1, quan: 1,
                known: true, dknown: true, bknown: true, name: 'long sword',
                blessed: false, cursed: false, spe: 0 }];

            pushInput(' '.charCodeAt(0)); // dismiss inventory
            await handleInventory(player, display, { player, display, flags: {} });
            assert.equal(rerenderCalled, true, 'rerender must fire after handleInventory');
        });

        it('handleKnownSpells triggers rerender callback on dismiss', async () => {
            let rerenderCalled = false;
            const display = makeMinimalDisplay();
            init_nhwindows(display, null, () => { rerenderCalled = true; });

            const player = new Player();
            player.initRole(11);
            player.wizard = true;
            player.turns = 6;
            player.spells = [{ otyp: SPE_HEALING, sp_lev: 1, sp_know: 19994 }];

            pushInput(' '.charCodeAt(0)); // dismiss spell menu
            await handleKnownSpells(player, display);
            assert.equal(rerenderCalled, true, 'rerender must fire after handleKnownSpells');
        });
    });
});
