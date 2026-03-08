import { beforeEach, describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import {
    COIN_CLASS, GOLD_PIECE, TOOL_CLASS, STETHOSCOPE, WEAPON_CLASS, SCALPEL,
    SPBOOK_CLASS, OIL_LAMP, ARMOR_CLASS, SMALL_SHIELD, SPE_HEALING, FLINT, SLING,
    POTION_CLASS, POT_HEALING,
} from '../../js/objects.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    player.inventory = [{
        oclass: COIN_CLASS,
        otyp: GOLD_PIECE,
        invlet: '$',
        quan: 10,
        known: true,
        dknown: true,
        bknown: true,
        blessed: false,
        cursed: false,
        spe: 0,
    }];

    const display = {
        topMessage: null,
        lastOverlay: null,
        rows: 24,
        cols: 80,
        renderOverlayMenuCalls: [],
        putstrWrites: [],
        screenClears: 0,
        putstr_message(msg) {
            this.topMessage = msg;
        },
        putstr(col, row, str, color, attr) {
            this.putstrWrites.push({ col, row, str, color, attr });
        },
        setCell(col, row, ch, fg, bg) {},
        clearRow(row) {},
        clearScreen() {
            this.screenClears++;
        },
        renderOverlayMenu(lines) {
            this.renderOverlayMenuCalls.push(lines);
            this.lastOverlay = lines;
        },
        renderChargenMenu(lines) {
            this.lastOverlay = lines;
        },
    };

    return {
        game: {
            player,
            map,
            display,
            fov: null,
            flags: { verbose: true },
            menuRequested: false,
        },
    };
}

function addInventoryItems(player, count, oclass = WEAPON_CLASS) {
    const items = [];
    for (let i = 0; i < count; i++) {
        const invlet = String.fromCharCode('a'.charCodeAt(0) + i);
        items.push({
            oclass,
            otyp: oclass === WEAPON_CLASS ? SCALPEL : oclass,
            invlet,
            quan: 1,
            name: `${oclass === WEAPON_CLASS ? 'sword' : 'item'}-${invlet}`,
            known: true,
            dknown: true,
            bknown: true,
            blessed: false,
            cursed: false,
            spe: 0,
        });
    }
    player.inventory = items;
    return items;
}

describe('inventory modal dismissal', () => {
    beforeEach(() => {
        setThrowOnEmptyInput(true);
        clearInputQueue();
    });

    afterEach(() => {
        const remaining = getInputQueueLength();
        setThrowOnEmptyInput(false);
        clearInputQueue();
        assert.equal(remaining, 0, `Test did not consume all pushed inputs (${remaining} remaining)`);
    });

    it('keeps inventory open on non-dismiss keys and closes on space', async () => {
        const { game } = makeGame();
        setThrowOnEmptyInput(false); // staged input: keys pushed after rhack starts
        pushInput('o'.charCodeAt(0));

        const pending = rhack('i'.charCodeAt(0), game);
        const early = await Promise.race([
            pending.then(() => 'resolved'),
            new Promise((resolve) => setTimeout(() => resolve('pending'), 30)),
        ]);

        assert.equal(early, 'pending');
        pushInput(' '.charCodeAt(0));

        const result = await pending;
        assert.equal(result.tookTime, false);
        assert.ok(Array.isArray(game.display.lastOverlay));
    });

    it('paginates inventory list with space and restores prior page with b', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 25, WEAPON_CLASS);

        pushInput(' '.charCodeAt(0)); // page 2
        pushInput('b'.charCodeAt(0)); // back to page 1
        pushInput(' '.charCodeAt(0)); // page 2 again
        pushInput(' '.charCodeAt(0)); // dismiss after final page

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        // Multi-page uses fullScreen putstr path (4 page draws = 4 clearScreens)
        assert.equal(game.display.screenClears >= 4, true);
        const strs = game.display.putstrWrites.map((w) => w.str);
        // Page 1 has items a-v (not w); page 2 has items w-y
        assert.ok(strs.some((s) => String(s || '').startsWith('v - ')));
        assert.ok(strs.some((s) => String(s || '').startsWith('w - ')));
        assert.ok(!strs.some((s) => String(s || '').includes('--More--')));
        // Page counter format: "(N of M)"
        assert.ok(strs.some((s) => String(s || '').includes('1 of 2')));
        assert.ok(strs.some((s) => String(s || '').includes('2 of 2')));
    });

    it('advances to next page with space and still shows next page items', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 25, WEAPON_CLASS);

        pushInput(' '.charCodeAt(0)); // next page
        pushInput(' '.charCodeAt(0)); // dismiss after final page

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        // Multi-page uses fullScreen putstr path (2 page draws)
        assert.equal(game.display.screenClears >= 2, true);
        const strs = game.display.putstrWrites.map((w) => w.str);
        // Page 2 contains items w-y (rows=24 means 23 content rows per page)
        assert.ok(strs.some((s) => String(s || '').startsWith('w - ')));
        assert.ok(strs.some((s) => String(s || '').startsWith('y - ')));
    });

    it('ignores back-page on first page and keeps current page visible', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 25, WEAPON_CLASS);
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('b'.charCodeAt(0)); // already at first page — ignored
        pushInput('a'.charCodeAt(0)); // select first page item
        pushInput(' '.charCodeAt(0)); // dismiss action menu

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        // Multi-page uses fullScreen putstr — page 1 items drawn via putstr
        assert.ok(writes.some((w) => String(w.str || '').startsWith('a - ')));
        assert.ok(writes.some((w) => String(w.str || '').includes('1 of 2')));
        assert.ok(writes.some((w) => w.row === 0 && String(w.str || '').includes('Do what with the scalpel?')));
    });

    it('single-page inventory ignores back-page and dismisses on space', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 1, WEAPON_CLASS);

        pushInput('b'.charCodeAt(0)); // should be ignored on one page
        pushInput(' '.charCodeAt(0)); // should dismiss

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(game.display.renderOverlayMenuCalls.length, 1);
        const firstPage = game.display.renderOverlayMenuCalls[0];
        assert.ok(!firstPage.includes('--More--'));
    });

    it('moves to next page with \'>\' and keeps menu open on final-page \'>\'', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 25, WEAPON_CLASS);

        pushInput('>'.charCodeAt(0)); // next page
        pushInput('>'.charCodeAt(0)); // ignored on final page
        pushInput(' '.charCodeAt(0)); // dismiss

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        // 2 page draws (initial + one > advance; second > is no-op on last page)
        assert.equal(game.display.screenClears >= 2, true);
        const strs = game.display.putstrWrites.map((w) => w.str);
        // Page 2 has items w-y
        assert.ok(strs.some((s) => String(s || '').startsWith('w - ')));
    });

    it('supports first/last page jump controls', async () => {
        const { game } = makeGame();
        const writes = [];
        addInventoryItems(game.player, 40, WEAPON_CLASS);
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str: String(str || ''), color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('>'.charCodeAt(0)); // to second page
        pushInput('^'.charCodeAt(0)); // back to first
        pushInput('a'.charCodeAt(0)); // select first-page item
        pushInput(' '.charCodeAt(0)); // dismiss item action menu

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        // After ^ (back to first), 'a' is on page 1 → selectable
        assert.ok(writes.some((w) => w.str.startsWith('a - ')));
        assert.ok(writes.some((w) => w.row === 0 && w.str.includes('Do what with the ')));
    });

    it('jumps directly to last page with \'|\' and allows second-page item selection', async () => {
        const { game } = makeGame();
        const writes = [];
        addInventoryItems(game.player, 40, WEAPON_CLASS);
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str: String(str || ''), color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('|'.charCodeAt(0));  // jump to last page
        pushInput('w'.charCodeAt(0));  // select item on last page (w is first item on page 2)
        pushInput(' '.charCodeAt(0));  // dismiss action menu

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        // Last page has items starting from w
        assert.ok(writes.some((w) => w.str.startsWith('w - ')));
        assert.ok(writes.some((w) => w.row === 0 && w.str.includes('Do what with the ')));
    });

    it('keeps exact full single page in one redraw and supports last item selection', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 19, WEAPON_CLASS); // header + 19 items + end fits one page
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('s'.charCodeAt(0)); // select the last item on this page
        pushInput(' '.charCodeAt(0)); // dismiss action menu

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(game.display.renderOverlayMenuCalls.length, 1);
        const firstPage = game.display.renderOverlayMenuCalls[0];
        assert.ok(!firstPage.includes('--More--'));
        assert.ok(firstPage.some((line) => String(line || '').startsWith('s - ')));
        assert.ok(writes.some((w) => w.row === 0 && String(w.str || '').includes('Do what with the scalpel?')));
    });

    it('selects item from second page and opens matching action menu', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 25, WEAPON_CLASS);
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput(' '.charCodeAt(0)); // next page (page 2 has w-y with rows=24)
        pushInput('w'.charCodeAt(0)); // select item visible on second page
        pushInput(' '.charCodeAt(0)); // dismiss action menu

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.row === 0 && String(w.str || '').includes('Do what with the scalpel?')));
        assert.ok(writes.some((w) => String(w.str || '').includes('w - Wield this item in your hands')));
    });

    it('closes inventory on enter', async () => {
        const { game } = makeGame();
        pushInput('\n'.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(Array.isArray(game.display.lastOverlay));
    });

    it('renders single-item action menu for stethoscope selections', async () => {
        const { game } = makeGame();
        game.player.inventory.push({
            oclass: TOOL_CLASS,
            otyp: STETHOSCOPE,
            invlet: 'c',
            quan: 1,
            name: 'stethoscope',
        });
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('c'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.row === 2 && w.str.includes('Listen through the stethoscope')));
        assert.ok(writes.some((w) => w.row === 0 && w.attr === 1 && w.str.includes('Do what with the stethoscope?')));
    });

    it('keeps item action menu open on invalid keys, then allows c-name flow', async () => {
        const { game } = makeGame();
        setThrowOnEmptyInput(false); // staged input: keys pushed after rhack starts
        const scalpel = {
            oclass: WEAPON_CLASS,
            otyp: SCALPEL,
            invlet: 'a',
            quan: 1,
            name: 'scalpel',
        };
        game.player.inventory = [scalpel];
        game.player.weapon = scalpel;

        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('a'.charCodeAt(0)); // select item from inventory menu
        pushInput('n'.charCodeAt(0)); // invalid action key, should keep submenu open
        const pending = rhack('i'.charCodeAt(0), game);
        const early = await Promise.race([
            pending.then(() => 'resolved'),
            new Promise((resolve) => setTimeout(() => resolve('pending'), 30)),
        ]);
        assert.equal(early, 'pending');

        pushInput('c'.charCodeAt(0)); // choose "name this specific ..."
        pushInput('e'.charCodeAt(0));
        pushInput('\n'.charCodeAt(0));
        const result = await pending;
        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.row === 0 && w.str.includes('Do what with the scalpel?')));
        assert.ok(writes.some((w) => w.row === 0 && w.str.includes('What do you want to name this scalpel?')));
        assert.equal(scalpel.oname, 'e');
    });

    it('uses spellbook wording in inventory action prompt', async () => {
        const { game } = makeGame();
        game.player.inventory = [{
            oclass: SPBOOK_CLASS,
            otyp: SPE_HEALING,
            invlet: 'g',
            quan: 1,
            known: true,
            dknown: true,
        }];
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('g'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.row === 0 && w.attr === 1 && w.str.includes('Do what with the spellbook of healing?')));
        assert.ok(writes.some((w) => w.str.includes('r - Study this spellbook')));
    });

    it('uses flint stone naming in stack action prompt', async () => {
        const { game } = makeGame();
        game.player.inventory = [{
            oclass: WEAPON_CLASS,
            otyp: FLINT,
            invlet: 'f',
            quan: 2,
            known: true,
            dknown: true,
        }];
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('f'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.row === 0 && w.attr === 1 && w.str.includes('Do what with the flint stones?')));
        assert.ok(writes.some((w) => w.str.includes('c - Name this stack of flint stones')));
    });

    it('uses sling-specific shoot wording for flint stack actions', async () => {
        const { game } = makeGame();
        const sling = {
            oclass: WEAPON_CLASS,
            otyp: SLING,
            invlet: 's',
            quan: 1,
            known: true,
            dknown: true,
        };
        game.player.inventory = [
            sling,
            {
                oclass: WEAPON_CLASS,
                otyp: FLINT,
                invlet: 'f',
                quan: 2,
                known: true,
                dknown: true,
            },
        ];
        game.player.weapon = sling;
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('f'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.str.includes('f - Shoot one of these with your wielded sling')));
    });

    it('shows potion stack actions with dip/call/quaff entries', async () => {
        const { game } = makeGame();
        game.player.inventory = [{
            oclass: POTION_CLASS,
            otyp: POT_HEALING,
            invlet: 'f',
            quan: 10,
            known: true,
            dknown: true,
        }];
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('f'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.str.includes('Do what with the ')));
        assert.ok(writes.some((w) => w.str.includes('a - Dip something into one of these potions')));
        assert.ok(writes.some((w) => w.str.includes('C - Call the type for')));
        assert.ok(writes.some((w) => w.str.includes('q - Quaff (drink) one of these potions')));
    });

    it('shows light and rub actions for oil lamps', async () => {
        const { game } = makeGame();
        game.player.inventory = [{
            oclass: TOOL_CLASS,
            otyp: OIL_LAMP,
            invlet: 'e',
            quan: 1,
            lamplit: false,
            known: true,
            dknown: true,
        }];
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('e'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.str.includes('Do what with the oil lamp?')));
        assert.ok(writes.some((w) => w.str.includes('a - Light this light source')));
        assert.ok(writes.some((w) => w.str.includes('R - Rub this oil lamp')));
    });

    it('shows take-off action for worn armor item submenu', async () => {
        const { game } = makeGame();
        const shield = {
            oclass: ARMOR_CLASS,
            otyp: SMALL_SHIELD,
            invlet: 'c',
            quan: 1,
            name: 'small shield',
        };
        game.player.inventory = [shield];
        game.player.shield = shield;
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('c'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(writes.some((w) => w.str.includes('Do what with the small shield?')));
        assert.ok(writes.some((w) => w.str.includes('i - Adjust inventory by assigning new letter')));
        assert.ok(writes.some((w) => w.str.includes('T - Take off this armor')));
        assert.ok(writes.some((w) => w.str.includes('/ - Look up information about this')));
        assert.ok(!writes.some((w) => w.str.includes('d - Drop this item')));
    });
});
