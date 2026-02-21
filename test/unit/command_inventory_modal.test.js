import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import {
    COIN_CLASS, GOLD_PIECE, TOOL_CLASS, STETHOSCOPE, WEAPON_CLASS, SCALPEL,
    SPBOOK_CLASS, OIL_LAMP, ARMOR_CLASS, SMALL_SHIELD, SPE_HEALING, FLINT, SLING,
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
        renderOverlayMenuCalls: [],
        putstr_message(msg) {
            this.topMessage = msg;
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
        clearInputQueue();
    });

    it('keeps inventory open on non-dismiss keys and closes on space', async () => {
        const { game } = makeGame();
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
        assert.equal(game.display.renderOverlayMenuCalls.length >= 4, true);
        const firstPage = game.display.renderOverlayMenuCalls[0];
        const secondPage = game.display.renderOverlayMenuCalls[1];
        const thirdPage = game.display.renderOverlayMenuCalls[2];
        const fourthPage = game.display.renderOverlayMenuCalls[3];
        assert.ok(firstPage.includes('--More--'));
        assert.ok(!secondPage.includes('--More--'));
        assert.ok(thirdPage.includes('--More--'));
        assert.ok(!firstPage.some((line) => String(line || '').startsWith('u - ')));
        assert.ok(secondPage.some((line) => String(line || '').startsWith('u - ')));
        assert.ok(fourthPage.some((line) => String(line || '').startsWith('u - ')));
        assert.ok(!fourthPage.some((line) => line.includes('Weapons')));
        assert.ok(secondPage.some((line) => String(line || '').startsWith('v - ')));
    });

    it('advances to next page with space and still shows next page items', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 25, WEAPON_CLASS);

        pushInput(' '.charCodeAt(0)); // next page
        pushInput(' '.charCodeAt(0)); // dismiss after final page

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(game.display.renderOverlayMenuCalls.length >= 2, true);
        const finalPage = game.display.renderOverlayMenuCalls[1];
        assert.ok(finalPage.some((line) => String(line || '').startsWith('u - ')));
        assert.ok(finalPage.some((line) => String(line || '').startsWith('y - ')));
        assert.ok(!finalPage.includes('--More--'));
    });

    it('ignores back-page on first page and keeps current page visible', async () => {
        const { game } = makeGame();
        addInventoryItems(game.player, 25, WEAPON_CLASS);
        const writes = [];
        game.display.putstr = function putstr(col, row, str, color, attr) {
            writes.push({ col, row, str, color, attr });
        };
        game.display.clearRow = function clearRow() {};

        pushInput('b'.charCodeAt(0)); // already at first page
        pushInput('a'.charCodeAt(0)); // select first page item
        pushInput(' '.charCodeAt(0)); // dismiss action menu

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(game.display.renderOverlayMenuCalls.length >= 1, true);
        const firstPage = game.display.renderOverlayMenuCalls[0];
        assert.ok(firstPage.includes('--More--'));
        assert.ok(firstPage.some((line) => String(line || '').startsWith('a - ')));
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
        assert.equal(game.display.renderOverlayMenuCalls.length, 2);
        const firstPage = game.display.renderOverlayMenuCalls[0];
        const secondPage = game.display.renderOverlayMenuCalls[1];
        assert.ok(firstPage.includes('--More--'));
        assert.ok(!secondPage.includes('--More--'));
        assert.ok(secondPage.some((line) => String(line || '').startsWith('u - ')));
    });

    it('supports first/last page jump controls', async () => {
        const { game } = makeGame();
        const writes = [];
        addInventoryItems(game.player, 40, WEAPON_CLASS);
        game.display.putstr = function putstr(col, row, str) {
            if (row === 0) writes.push(String(str || ''));
        };
        game.display.clearRow = function clearRow() {};

        pushInput('>'.charCodeAt(0)); // to second page
        pushInput('^'.charCodeAt(0)); // back to first
        pushInput('a'.charCodeAt(0)); // select first-page item
        pushInput(' '.charCodeAt(0)); // dismiss item action menu

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(game.display.renderOverlayMenuCalls.length >= 3, true);
        const finalPage = game.display.renderOverlayMenuCalls[2];
        assert.ok(finalPage.some((line) => String(line || '').startsWith('a - ')));
        assert.ok(writes.some((w) => w.includes('Do what with the ')));
    });

    it('jumps directly to last page with \'|\' and allows second-page item selection', async () => {
        const { game } = makeGame();
        const writes = [];
        addInventoryItems(game.player, 40, WEAPON_CLASS);
        game.display.putstr = function putstr(col, row, str) {
            if (row === 0) writes.push(String(str || ''));
        };
        game.display.clearRow = function clearRow() {};

        pushInput('|'.charCodeAt(0));
        pushInput('u'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));

        const result = await rhack('i'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(game.display.renderOverlayMenuCalls.length >= 2, true);
        const lastPage = game.display.renderOverlayMenuCalls[1];
        assert.ok(!lastPage.includes('--More--'));
        assert.ok(lastPage.some((line) => String(line || '').startsWith('u - ')));
        assert.ok(writes.some((w) => w.includes('Do what with the ')));
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

        pushInput(' '.charCodeAt(0)); // next page
        pushInput('u'.charCodeAt(0)); // select item from second page
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
