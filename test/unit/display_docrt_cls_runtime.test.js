import test from 'node:test';
import assert from 'node:assert/strict';

import { ROOM } from '../../js/const.js';
import { cls, docrt_flags } from '../../js/display.js';

test('cls clears map area rows through display.clearRow', async () => {
    // C ref: cls() clears WIN_MAP area (rows MAP_ROW_START through STATUS_ROW_1-1),
    // not all terminal rows. MAP_ROW_START=1, STATUS_ROW_1=22 → 21 rows.
    let rowsCleared = 0;
    const display = {
        rows: 24,
        clearRow: () => { rowsCleared += 1; },
    };
    await cls({ display });
    assert.equal(rowsCleared, 21);
});

test('docrt_flags repaints map cells through newsym path', async () => {
    const cells = [];
    const display = {
        setCell: (x, y, ch, color) => cells.push({ x, y, ch, color }),
    };
    const loc = { typ: ROOM, seenv: 1, flags: 0, waslit: true };
    const map = {
        at: () => loc,
        monsterAt: () => null,
        objectsAt: () => [],
        trapAt: () => null,
        engravingAt: () => null,
    };
    const ctx = {
        display,
        map,
        player: { x: 10, y: 10 },
        fov: { canSee: () => true },
        flags: { msg_window: false },
    };
    await docrt_flags(null, ctx);
    assert.equal(cells.length > 0, true);
});
