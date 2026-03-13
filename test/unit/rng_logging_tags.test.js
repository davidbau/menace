import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { initRng, enableRngLog, getRngLog, disableRngLog, rn2, rn2_on_display_rng } from '../../js/rng.js';

function withRngEnv(overrides, fn) {
    const prevTags = process.env.RNG_LOG_TAGS;
    const prevParent = process.env.RNG_LOG_PARENT;
    const prevDisp = process.env.RNG_LOG_DISP;
    const prevDispCallers = process.env.RNG_LOG_DISP_CALLERS;
    try {
        if (Object.prototype.hasOwnProperty.call(overrides, 'RNG_LOG_TAGS')) {
            const v = overrides.RNG_LOG_TAGS;
            if (v === undefined) delete process.env.RNG_LOG_TAGS;
            else process.env.RNG_LOG_TAGS = v;
        }
        if (Object.prototype.hasOwnProperty.call(overrides, 'RNG_LOG_PARENT')) {
            const v = overrides.RNG_LOG_PARENT;
            if (v === undefined) delete process.env.RNG_LOG_PARENT;
            else process.env.RNG_LOG_PARENT = v;
        }
        if (Object.prototype.hasOwnProperty.call(overrides, 'RNG_LOG_DISP')) {
            const v = overrides.RNG_LOG_DISP;
            if (v === undefined) delete process.env.RNG_LOG_DISP;
            else process.env.RNG_LOG_DISP = v;
        }
        if (Object.prototype.hasOwnProperty.call(overrides, 'RNG_LOG_DISP_CALLERS')) {
            const v = overrides.RNG_LOG_DISP_CALLERS;
            if (v === undefined) delete process.env.RNG_LOG_DISP_CALLERS;
            else process.env.RNG_LOG_DISP_CALLERS = v;
        }
        return fn();
    } finally {
        if (prevTags === undefined) delete process.env.RNG_LOG_TAGS;
        else process.env.RNG_LOG_TAGS = prevTags;
        if (prevParent === undefined) delete process.env.RNG_LOG_PARENT;
        else process.env.RNG_LOG_PARENT = prevParent;
        if (prevDisp === undefined) delete process.env.RNG_LOG_DISP;
        else process.env.RNG_LOG_DISP = prevDisp;
        if (prevDispCallers === undefined) delete process.env.RNG_LOG_DISP_CALLERS;
        else process.env.RNG_LOG_DISP_CALLERS = prevDispCallers;
        disableRngLog();
    }
}

function runTaggedSample() {
    initRng(123);
    function leaf() { rn2(10); }
    function parent() { leaf(); }
    parent();
    const log = getRngLog() || [];
    assert.ok(log.length > 0, 'expected at least one RNG log entry');
    return String(log[0]);
}

function runDisplayTaggedSample() {
    initRng(123);
    function leaf() { rn2_on_display_rng(10); }
    function parent() { leaf(); }
    parent();
    const log = getRngLog() || [];
    assert.ok(log.length > 0, 'expected at least one RNG log entry');
    return String(log[0]);
}

describe('RNG log caller tags', () => {
    it('enables caller+parent tags by default when env is unset', () => {
        const first = withRngEnv({ RNG_LOG_TAGS: undefined, RNG_LOG_PARENT: undefined }, () => {
            enableRngLog();
            return runTaggedSample();
        });
        assert.match(first, / @ /, `missing caller tag in "${first}"`);
        assert.match(first, / <= /, `missing parent chain in "${first}"`);
    });

    it('includes parent chain by default when tags are enabled via env', () => {
        const first = withRngEnv({ RNG_LOG_TAGS: '1', RNG_LOG_PARENT: undefined }, () => {
            enableRngLog();
            return runTaggedSample();
        });
        assert.match(first, / @ /, `missing caller tag in "${first}"`);
        assert.match(first, / <= /, `missing parent chain in "${first}"`);
    });

    it('allows fully disabling caller tags with RNG_LOG_TAGS=0', () => {
        const first = withRngEnv({ RNG_LOG_TAGS: '0', RNG_LOG_PARENT: undefined }, () => {
            enableRngLog();
            return runTaggedSample();
        });
        assert.doesNotMatch(first, / @ /, `unexpected caller tag in "${first}"`);
    });

    it('allows opting out of parent chain with RNG_LOG_PARENT=0', () => {
        const first = withRngEnv({ RNG_LOG_TAGS: '1', RNG_LOG_PARENT: '0' }, () => {
            enableRngLog();
            return runTaggedSample();
        });
        assert.match(first, / @ /, `missing caller tag in "${first}"`);
        assert.doesNotMatch(first, / <= /, `unexpected parent chain in "${first}"`);
    });

    it('keeps display RNG logs untagged by default', () => {
        const first = withRngEnv({
            RNG_LOG_TAGS: '1',
            RNG_LOG_PARENT: undefined,
            RNG_LOG_DISP: '1',
            RNG_LOG_DISP_CALLERS: undefined,
        }, () => {
            enableRngLog();
            return runDisplayTaggedSample();
        });
        assert.match(first, /^~drn2\(10\)=\d+$/, `unexpected display RNG format in "${first}"`);
    });

    it('adds display RNG caller tags when RNG_LOG_DISP_CALLERS=1', () => {
        const first = withRngEnv({
            RNG_LOG_TAGS: '1',
            RNG_LOG_PARENT: undefined,
            RNG_LOG_DISP: '1',
            RNG_LOG_DISP_CALLERS: '1',
        }, () => {
            enableRngLog();
            return runDisplayTaggedSample();
        });
        assert.match(first, /^~drn2\(10\)=\d+ @ /, `missing display RNG caller tag in "${first}"`);
    });
});
