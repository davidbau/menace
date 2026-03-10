import test from 'node:test';
import assert from 'node:assert/strict';

import {
    case_insensitive_comp,
    copy_bytes,
    datamodel,
    nh_snprintf,
    unicodeval_to_utf8str,
    what_datamodel_is_this,
} from '../../js/hacklib.js';

test('hacklib case_insensitive_comp matches C-style sign behavior', () => {
    assert.equal(case_insensitive_comp('Elbereth', 'elbereth'), 0);
    assert.ok(case_insensitive_comp('abc', 'abd') < 0);
    assert.ok(case_insensitive_comp('abd', 'abc') > 0);
});

test('hacklib unicodeval_to_utf8str writes bytes and NUL terminator', () => {
    const buf = new Uint8Array(8);
    const ok = unicodeval_to_utf8str(0x00e9, buf, buf.length); // é
    assert.equal(ok, 1);
    assert.equal(buf[0], 0xc3);
    assert.equal(buf[1], 0xa9);
    assert.equal(buf[2], 0x00);
});

test('hacklib datamodel and what_datamodel_is_this resolve known models', () => {
    assert.equal(what_datamodel_is_this(0, 2, 4, 8, 8, 8), 'I32LP64');
    assert.equal(what_datamodel_is_this(1, 2, 4, 8, 8, 8), 'Unix 64-bit');
    assert.notEqual(datamodel(0), '');
});

test('hacklib nh_snprintf bounds output to size-1 and supports out objects', () => {
    const out = { value: '' };
    const rendered = nh_snprintf('t', 1, out, 6, '%s-%d', 'abc', 99);
    assert.equal(rendered, 'abc-9');
    assert.equal(out.value, 'abc-9');
});

test('hacklib copy_bytes copies from stream-like read/write endpoints', () => {
    const src = new Uint8Array([1, 2, 3, 4]);
    let pos = 0;
    const ifd = {
        read(buf, off, len) {
            const n = Math.min(len, src.length - pos);
            if (n > 0) buf.set(src.subarray(pos, pos + n), off);
            pos += n;
            return n;
        },
    };
    const sink = [];
    const ofd = {
        write(buf, off, len) {
            for (let i = 0; i < len; i++) sink.push(buf[off + i]);
            return len;
        },
    };
    assert.equal(copy_bytes(ifd, ofd), true);
    assert.deepEqual(sink, [1, 2, 3, 4]);
});
