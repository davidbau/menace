import { describe, it, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import {
    createInputQueue,
    setInputRuntime,
    getInputRuntime,
    pushInput,
    nhgetch_wrap,
    clearInputQueue,
    ynFunction,
    cmdq_add_key,
    cmdq_add_int,
    cmdq_add_dir,
    cmdq_add_userinput,
    cmdq_add_ec,
    cmdq_shift,
    cmdq_reverse,
    cmdq_copy,
    cmdq_pop,
    cmdq_pop_command,
    cmdq_peek,
    cmdq_clear,
    setCmdqInputMode,
    setCmdqRepeatRecordMode, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { CMDQ_KEY, CMDQ_INT, CMDQ_DIR, CMDQ_USER_INPUT, CQ_CANNED, CQ_REPEAT } from '../../js/const.js';
import { mapBrowserKeyToNhCode } from '../../js/browser_input.js';
import { createHeadlessInput } from '../../js/headless.js';

describe('input runtime primitives', () => {
    beforeEach(() => {
        clearInputQueue();
        setThrowOnEmptyInput(true);
        setInputRuntime(createInputQueue());
    });

    it('createInputQueue yields pushed input in order', async () => {
        const runtime = createInputQueue();
        runtime.pushInput('a'.charCodeAt(0));
        runtime.pushInput('b'.charCodeAt(0));
        assert.equal(await runtime.nhgetch(), 'a'.charCodeAt(0));
        assert.equal(await runtime.nhgetch(), 'b'.charCodeAt(0));
    });

    it('module wrappers use active input runtime', async () => {
        const runtime = createInputQueue();
        setInputRuntime(runtime);
        pushInput('x'.charCodeAt(0));
        assert.equal(await nhgetch_wrap(), 'x'.charCodeAt(0));
        assert.equal(getInputRuntime(), runtime);
    });

    it('clearInputQueue clears queued input on active runtime', async () => {
        const runtime = createInputQueue();
        setInputRuntime(runtime);
        pushInput('x'.charCodeAt(0));
        clearInputQueue();

        // Disable throw-on-empty so nhgetch blocks instead of throwing
        setThrowOnEmptyInput(false);
        let settled = false;
        const p = nhgetch_wrap().then(() => {
            settled = true;
        });
        await new Promise((r) => setTimeout(r, 10));
        assert.equal(settled, false);

        pushInput('y'.charCodeAt(0));
        await p;
        setThrowOnEmptyInput(true);
    });

    it('ynFunction uses runtime display when explicit display is omitted', async () => {
        const prompts = [];
        const runtime = createInputQueue();
        runtime.getDisplay = () => ({
            putstr_message(msg) {
                prompts.push(msg);
            },
        });
        setInputRuntime(runtime);
        pushInput('y'.charCodeAt(0));

        const result = await ynFunction('Proceed?', 'yn', 'n'.charCodeAt(0));
        assert.equal(result, 'y'.charCodeAt(0));
        assert.equal(prompts.length, 1);
        assert.match(prompts[0], /Proceed\?/);
    });

    it('waitForInputWait signals queue->wait transitions with incrementing epochs', async () => {
        const runtime = createInputQueue();
        assert.equal(runtime.isWaitingInput(), false);
        assert.equal(runtime.getInputState().waitEpoch, 0);

        const pending = runtime.nhgetch();
        await new Promise((r) => setTimeout(r, 0));
        const s1 = runtime.getInputState();
        assert.equal(runtime.isWaitingInput(), true);
        assert.equal(s1.waitEpoch, 1);

        const immediate = await runtime.waitForInputWait({ afterEpoch: 0 });
        assert.equal(immediate, 1);

        const nextWait = runtime.waitForInputWait({ afterEpoch: 1 });
        runtime.pushInput('x'.charCodeAt(0));
        assert.equal(await pending, 'x'.charCodeAt(0));
        assert.equal(runtime.isWaitingInput(), false);

        const secondPending = runtime.nhgetch();
        const secondEpoch = await nextWait;
        assert.equal(secondEpoch, 2);
        runtime.pushInput('y'.charCodeAt(0));
        await secondPending;
    });

    it('waitForInputWait supports abort signals', async () => {
        const runtime = createInputQueue();
        const ac = new AbortController();
        const p = runtime.waitForInputWait({ afterEpoch: 0, signal: ac.signal });
        ac.abort();
        await assert.rejects(p, /aborted/);
    });

    it('throws on concurrent nhgetch waits for createInputQueue', async () => {
        const runtime = createInputQueue();
        const pending = runtime.nhgetch();
        assert.throws(
            () => runtime.nhgetch(),
            /Concurrent nhgetch\(\) wait detected/
        );
        runtime.pushInput('x'.charCodeAt(0));
        assert.equal(await pending, 'x'.charCodeAt(0));
    });

    it('headless input exposes the same boundary wait contract', async () => {
        const runtime = createHeadlessInput();
        assert.equal(runtime.getInputState().waitEpoch, 0);
        const pending = runtime.nhgetch();
        const epoch = await runtime.waitForInputWait({ afterEpoch: 0 });
        assert.equal(epoch, 1);
        runtime.pushInput('z'.charCodeAt(0));
        assert.equal(await pending, 'z'.charCodeAt(0));
    });

    it('throws on concurrent nhgetch waits for headless input', async () => {
        const runtime = createHeadlessInput();
        const pending = runtime.nhgetch();
        await assert.rejects(
            runtime.nhgetch(),
            /Concurrent nhgetch\(\) wait detected/
        );
        runtime.pushInput('y'.charCodeAt(0));
        assert.equal(await pending, 'y'.charCodeAt(0));
    });
});

describe('cmdq primitives', () => {
    beforeEach(() => {
        cmdq_clear(CQ_CANNED);
        cmdq_clear(CQ_REPEAT);
    });

    it('queues and pops canned keys in FIFO order', () => {
        cmdq_add_key(CQ_CANNED, 'a'.charCodeAt(0));
        cmdq_add_key(CQ_CANNED, 'b'.charCodeAt(0));
        assert.equal(cmdq_pop(false).key, 'a'.charCodeAt(0));
        assert.equal(cmdq_pop(false).key, 'b'.charCodeAt(0));
        assert.equal(cmdq_pop(false), null);
    });

    it('cmdq_pop uses repeat queue when inDoAgain is true', () => {
        cmdq_add_key(CQ_CANNED, 'c'.charCodeAt(0));
        cmdq_add_key(CQ_REPEAT, 'r'.charCodeAt(0));
        assert.equal(cmdq_pop(true).key, 'r'.charCodeAt(0));
        assert.equal(cmdq_pop(false).key, 'c'.charCodeAt(0));
    });

    it('cmdq_shift moves tail entry to the head', () => {
        cmdq_add_key(CQ_CANNED, 1);
        cmdq_add_key(CQ_CANNED, 2);
        cmdq_add_key(CQ_CANNED, 3);
        cmdq_shift(CQ_CANNED);
        assert.equal(cmdq_pop(false).key, 3);
        assert.equal(cmdq_pop(false).key, 1);
        assert.equal(cmdq_pop(false).key, 2);
    });

    it('cmdq_copy creates independent node chain', () => {
        cmdq_add_key(CQ_CANNED, 1);
        cmdq_add_int(CQ_CANNED, 42);
        cmdq_add_dir(CQ_CANNED, -1, 0, 1);
        cmdq_add_userinput(CQ_CANNED);
        const extcmd = { ef_txt: 'test' };
        cmdq_add_ec(CQ_CANNED, extcmd);

        const copy = cmdq_copy(CQ_CANNED);
        assert.equal(copy.typ, CMDQ_KEY);
        assert.equal(copy.next.typ, CMDQ_INT);
        assert.equal(copy.next.next.typ, CMDQ_DIR);
        assert.equal(copy.next.next.dirx, -1);
        assert.equal(copy.next.next.next.typ, CMDQ_USER_INPUT);
        assert.equal(copy.next.next.next.next.ec_entry, extcmd);

        // Mutate original and verify copy doesn't change.
        const head = cmdq_peek(CQ_CANNED);
        head.key = 99;
        assert.equal(copy.key, 1);
    });

    it('cmdq_reverse reverses linked nodes in-place', () => {
        const n1 = { typ: CMDQ_KEY, key: 1, next: null };
        const n2 = { typ: CMDQ_KEY, key: 2, next: null };
        const n3 = { typ: CMDQ_KEY, key: 3, next: null };
        n1.next = n2;
        n2.next = n3;
        const rev = cmdq_reverse(n1);
        assert.equal(rev.key, 3);
        assert.equal(rev.next.key, 2);
        assert.equal(rev.next.next.key, 1);
        assert.equal(rev.next.next.next, null);
    });

    it('cmdq_pop_command decodes leading int+key payload', () => {
        cmdq_add_int(CQ_REPEAT, 17);
        cmdq_add_key(CQ_REPEAT, 's'.charCodeAt(0));
        const cmd = cmdq_pop_command(true);
        assert.deepEqual(cmd, {
            key: 's'.charCodeAt(0),
            countPrefix: 17,
        });
        assert.equal(cmdq_pop(true), null);
    });

    it('nhgetch consumes queued direction in doagain input mode', async () => {
        cmdq_add_dir(CQ_REPEAT, 1, 0, 0);
        setCmdqInputMode(true);
        const ch = await nhgetch_wrap();
        setCmdqInputMode(false);
        assert.equal(ch, 'l'.charCodeAt(0));
    });

    it('nhgetch records prompt input into repeat queue when enabled', async () => {
        const runtime = createInputQueue();
        setInputRuntime(runtime);
        setCmdqRepeatRecordMode(true);
        pushInput('y'.charCodeAt(0));
        const ch = await nhgetch_wrap();
        setCmdqRepeatRecordMode(false);
        assert.equal(ch, 'y'.charCodeAt(0));
        const queued = cmdq_pop(true);
        assert.equal(queued.key, 'y'.charCodeAt(0));
        assert.equal(cmdq_pop(true), null);
    });
});

describe('browser key mapping', () => {
    it('maps numpad keys when number_pad is enabled', () => {
        const code = mapBrowserKeyToNhCode(
            { key: '8', location: 3, ctrlKey: false, altKey: false, metaKey: false },
            { number_pad: true }
        );
        assert.equal(code, 'k'.charCodeAt(0));
    });

    it('maps numpad keys when number_pad mode is numeric and > 0', () => {
        const code = mapBrowserKeyToNhCode(
            { key: '8', location: 3, ctrlKey: false, altKey: false, metaKey: false },
            { number_pad: 2 }
        );
        assert.equal(code, 'k'.charCodeAt(0));
    });

    it('does not map numpad keys when number_pad mode is 0 or -1', () => {
        const offCode = mapBrowserKeyToNhCode(
            { key: '8', location: 3, ctrlKey: false, altKey: false, metaKey: false },
            { number_pad: 0 }
        );
        const legacyOffCode = mapBrowserKeyToNhCode(
            { key: '8', location: 3, ctrlKey: false, altKey: false, metaKey: false },
            { number_pad: -1 }
        );
        assert.equal(offCode, '8'.charCodeAt(0));
        assert.equal(legacyOffCode, '8'.charCodeAt(0));
    });

    it('maps space to rest only when rest_on_space is enabled', () => {
        const enabled = mapBrowserKeyToNhCode(
            { key: ' ', location: 0, ctrlKey: false, altKey: false, metaKey: false },
            { rest_on_space: true }
        );
        const disabled = mapBrowserKeyToNhCode(
            { key: ' ', location: 0, ctrlKey: false, altKey: false, metaKey: false },
            { rest_on_space: false }
        );
        assert.equal(enabled, '.'.charCodeAt(0));
        assert.equal(disabled, ' '.charCodeAt(0));
    });

    it('maps arrow keys to vi movement', () => {
        const code = mapBrowserKeyToNhCode(
            { key: 'ArrowLeft', location: 0, ctrlKey: false, altKey: false, metaKey: false },
            {}
        );
        assert.equal(code, 'h'.charCodeAt(0));
    });

    it('maps ctrl-letter combinations to C() codes', () => {
        const code = mapBrowserKeyToNhCode(
            { key: 'a', location: 0, ctrlKey: true, altKey: false, metaKey: false },
            {}
        );
        assert.equal(code, 1);
    });

    it('maps alt-letter combinations from physical key code even with composed key values', () => {
        const code = mapBrowserKeyToNhCode(
            { key: 'ì', code: 'KeyL', location: 0, ctrlKey: false, altKey: true, metaKey: false },
            {}
        );
        assert.equal(code, ('l'.charCodeAt(0) | 0x80));
    });
});
