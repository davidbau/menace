import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    delayed_killer,
    find_delayed_killer,
    dealloc_killer,
    getKiller,
} from '../../js/end.js';

test('delayed_killer records and updates deferred killer entries', () => {
    const root = getKiller();
    root.next = null;

    delayed_killer(22, 0, 'green slime');
    let k = find_delayed_killer(22);
    assert.ok(k);
    assert.equal(k.name, 'green slime');

    delayed_killer(22, 1, 'cockatrice');
    k = find_delayed_killer(22);
    assert.ok(k);
    assert.equal(k.format, 1);
    assert.equal(k.name, 'cockatrice');
});

test('dealloc_killer removes a deferred killer entry', () => {
    const root = getKiller();
    root.next = null;

    delayed_killer(33, 0, 'poison');
    const k = find_delayed_killer(33);
    assert.ok(k);
    dealloc_killer(k);
    assert.equal(find_delayed_killer(33), null);
});
