import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { HeadlessDisplay } from '../../js/headless.js';

describe('headless overlay header attr', () => {

test('headless overlay menu renders first header line in inverse video', () => {
    const display = new HeadlessDisplay();
    const offx = display.renderOverlayMenu([
        ' Weapons',
        'a - a weapon',
        ' Armor',
        'b - an armor piece',
    ]);

    // C ref: wintty.c — category header leading space is in the pre-cleared area;
    // the text ("Weapons") starts at offx in inverse video (not offx+1).
    assert.equal(display.grid[0][offx].attr, 1);
    assert.equal(display.grid[1][offx].attr, 0);
    assert.equal(display.grid[2][offx].attr, 1);
});

test('headless overlay menu caps right-side offset at C tty max column', () => {
    const display = new HeadlessDisplay();
    const offx = display.renderOverlayMenu([
        'Coins',
        '$ - 33 gold pieces',
        'Weapons',
        'a - 10 darts (weapon in right hand)',
        '(end)',
    ]);

    assert.equal(offx, 43);
    assert.equal(display.grid[0][43].ch, 'C');
});

}); // describe
