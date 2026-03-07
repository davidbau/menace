import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatGoldPickupMessage } from '../../js/do.js';

test('gold pickup message uses article for singular count with total suffix', () => {
    const msg = formatGoldPickupMessage({ quan: 1 }, { gold: 7 });
    assert.equal(msg, '$ - a gold piece (7 in total).');
});

test('gold pickup message keeps numeric count for plural', () => {
    const msg = formatGoldPickupMessage({ quan: 3 }, { gold: 9 });
    assert.equal(msg, '$ - 3 gold pieces (9 in total).');
});

