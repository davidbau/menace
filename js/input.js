// input.js -- Runtime-agnostic input primitives.
// Provides an async input queue plus module-level wrappers used by game code.

import { CLR_GRAY } from './render.js';
import { recordKey, isReplayMode, getNextReplayKey } from './keylog.js';
import {
    CMDQ_KEY, CMDQ_EXTCMD, CMDQ_DIR, CMDQ_USER_INPUT, CMDQ_INT,
    CQ_CANNED, CQ_REPEAT,
} from './const.js';
import { envFlag } from './runtime_env.js';
import { waitForMoreDismissKey } from './more_keys.js';
import { game as activeGame, beginOriginAwait, endOriginAwait } from './gstate.js';

function ynTraceEnabled() {
    return envFlag('WEBHACK_YN_TRACE');
}

function ynTrace(...args) {
    if (!ynTraceEnabled()) return;
    // eslint-disable-next-line no-console
    console.log('[YN_TRACE]', ...args);
}

/**
 * Display contract used by input helpers.
 * @typedef {Object} InputDisplay
 * @property {boolean} [messageNeedsMore]
 * @property {string|null} [topMessage]
 * @property {(row:number) => void} [clearRow]
 * @property {(x:number, y:number, text:string, color?:number) => void} [putstr]
 * @property {(msg:string) => void} [putstr_message]
 */

/**
 * Input runtime contract.
 * @typedef {Object} InputRuntime
 * @property {(ch:number) => void} pushInput
 * @property {() => Promise<number>} nhgetch
 * @property {() => void} [clearInputQueue]
 * @property {() => InputDisplay|null} [getDisplay]
 */

/**
 * Create an in-memory async input queue.
 * Useful for both browser and headless test adapters.
 * @returns {InputRuntime}
 */
export function createInputQueue({ throwOnEmpty = false } = {}) {
    const inputQueue = [];
    let inputResolver = null;
    let waitEpoch = 0;
    let waitStack = null;
    let waitContext = null;
    const waitListeners = [];

    function abortError() {
        const err = new Error('waitForInputWait aborted');
        err.name = 'AbortError';
        return err;
    }

    function removeWaitListener(listener) {
        const idx = waitListeners.indexOf(listener);
        if (idx >= 0) waitListeners.splice(idx, 1);
    }

    function notifyWaitStarted() {
        waitEpoch += 1;
        for (let i = waitListeners.length - 1; i >= 0; i--) {
            const listener = waitListeners[i];
            if (waitEpoch > listener.afterEpoch) {
                waitListeners.splice(i, 1);
                if (listener.signal && listener.onAbort) {
                    listener.signal.removeEventListener('abort', listener.onAbort);
                }
                listener.resolve(waitEpoch);
            }
        }
    }

    return {
        pushInput(ch) {
            if (inputResolver) {
                const resolve = inputResolver;
                inputResolver = null;
                waitStack = null;
                waitContext = null;
                resolve(ch);
            } else {
                inputQueue.push(ch);
            }
        },
        setWaitContext(stack) {
            waitContext = stack || null;
            waitStack = waitContext;
        },
        nhgetch() {
            if (inputQueue.length > 0) {
                return Promise.resolve(inputQueue.shift());
            }
            if (inputResolver) {
                throw new Error('Concurrent nhgetch() wait detected: existing input read is still pending');
            }
            if (throwOnEmpty) {
                throw new Error('Input queue empty - test may be missing keystrokes');
            }
            if (!waitContext) {
                waitContext = new Error('input wait').stack || null;
            }
            waitStack = waitContext;
            notifyWaitStarted();
            return new Promise((resolve) => {
                inputResolver = resolve;
            });
        },
        isWaitingInput() {
            return inputResolver !== null;
        },
        getInputState() {
            return {
                waiting: inputResolver !== null,
                queueLength: inputQueue.length,
                waitEpoch,
                waitStack,
                waitContext,
            };
        },
        waitForInputWait({ afterEpoch = 0, signal = null } = {}) {
            const since = Number.isInteger(afterEpoch) ? afterEpoch : 0;
            if (inputResolver !== null && waitEpoch > since) {
                return Promise.resolve(waitEpoch);
            }
            return new Promise((resolve, reject) => {
                if (signal?.aborted) {
                    reject(abortError());
                    return;
                }
                const listener = {
                    afterEpoch: since,
                    resolve,
                    signal,
                    onAbort: null,
                };
                if (signal) {
                    listener.onAbort = () => {
                        removeWaitListener(listener);
                        reject(abortError());
                    };
                    signal.addEventListener('abort', listener.onAbort, { once: true });
                }
                waitListeners.push(listener);
            });
        },
        clearInputQueue() {
            inputQueue.length = 0;
        },
        getDisplay() {
            return null;
        },
    };
}

const defaultInputRuntime = createInputQueue();
let activeInputRuntime = defaultInputRuntime;
let cmdqInputModeDoAgain = false;
let cmdqRepeatRecordMode = false;

export function setInputRuntime(runtime) {
    activeInputRuntime = runtime || defaultInputRuntime;
}

export function getInputRuntime() {
    return activeInputRuntime;
}

// Reset module-level input/command-queue state.
// Needed for deterministic multi-session replay in long-lived workers.
export function resetInputModuleState() {
    activeInputRuntime = defaultInputRuntime;
    if (typeof defaultInputRuntime.clearInputQueue === 'function') {
        defaultInputRuntime.clearInputQueue();
    }
    cmdqInputModeDoAgain = false;
    cmdqRepeatRecordMode = false;
    _cmdQueues[CQ_CANNED] = null;
    _cmdQueues[CQ_REPEAT] = null;
    _throwOnEmptyInput = false;
}

export function setCmdqInputMode(inDoAgain) {
    cmdqInputModeDoAgain = !!inDoAgain;
}

export function setCmdqRepeatRecordMode(enabled) {
    cmdqRepeatRecordMode = !!enabled;
}

export function pushInput(ch) {
    activeInputRuntime.pushInput(ch);
}

export function clearInputQueue() {
    if (typeof activeInputRuntime.clearInputQueue === 'function') {
        activeInputRuntime.clearInputQueue();
    }
}

export function getInputQueueLength() {
    if (typeof activeInputRuntime.getInputState === 'function') {
        return activeInputRuntime.getInputState().queueLength;
    }
    return 0;
}

let _throwOnEmptyInput = false;

export function setThrowOnEmptyInput(enabled) {
    _throwOnEmptyInput = !!enabled;
}

const _cmdQueues = {
    [CQ_CANNED]: null,
    [CQ_REPEAT]: null,
};

function cmdq_appendNode(queueKind, node) {
    let cq = _cmdQueues[queueKind];
    if (!cq) {
        _cmdQueues[queueKind] = node;
        return;
    }
    while (cq.next) cq = cq.next;
    cq.next = node;
}

function cmdq_makeNode(typ) {
    return {
        typ,
        key: null,
        dirx: 0,
        diry: 0,
        dirz: 0,
        intval: 0,
        ec_entry: null,
        next: null,
    };
}

function cmdq_queue_kind(inDoAgain) {
    return inDoAgain ? CQ_REPEAT : CQ_CANNED;
}

// C ref: cmd.c cmdq_add_ec()
export function cmdq_add_ec(queueKind, extcmdEntry) {
    const node = cmdq_makeNode(CMDQ_EXTCMD);
    node.ec_entry = extcmdEntry || null;
    cmdq_appendNode(queueKind, node);
}

// C ref: cmd.c cmdq_add_key()
export function cmdq_add_key(queueKind, key) {
    const node = cmdq_makeNode(CMDQ_KEY);
    node.key = key;
    cmdq_appendNode(queueKind, node);
}

// C ref: cmd.c cmdq_add_dir()
export function cmdq_add_dir(queueKind, dx, dy, dz) {
    const node = cmdq_makeNode(CMDQ_DIR);
    node.dirx = dx | 0;
    node.diry = dy | 0;
    node.dirz = dz | 0;
    cmdq_appendNode(queueKind, node);
}

// C ref: cmd.c cmdq_add_userinput()
export function cmdq_add_userinput(queueKind) {
    cmdq_appendNode(queueKind, cmdq_makeNode(CMDQ_USER_INPUT));
}

// C ref: cmd.c cmdq_add_int()
export function cmdq_add_int(queueKind, val) {
    const node = cmdq_makeNode(CMDQ_INT);
    node.intval = val | 0;
    cmdq_appendNode(queueKind, node);
}

// C ref: cmd.c cmdq_shift() -- shift last entry to first.
export function cmdq_shift(queueKind) {
    let cq = _cmdQueues[queueKind];
    if (!cq || !cq.next) return;
    while (cq.next && cq.next.next) cq = cq.next;
    const tail = cq.next;
    if (!tail) return;
    tail.next = _cmdQueues[queueKind];
    _cmdQueues[queueKind] = tail;
    cq.next = null;
}

// C ref: cmd.c cmdq_reverse()
export function cmdq_reverse(head) {
    let prev = null;
    let curr = head || null;
    while (curr) {
        const next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}

// C ref: cmd.c cmdq_copy()
export function cmdq_copy(queueKind) {
    let tmp = null;
    let cq = _cmdQueues[queueKind];
    while (cq) {
        const copy = {
            typ: cq.typ,
            key: cq.key,
            dirx: cq.dirx,
            diry: cq.diry,
            dirz: cq.dirz,
            intval: cq.intval,
            ec_entry: cq.ec_entry,
            next: tmp,
        };
        tmp = copy;
        cq = cq.next;
    }
    return cmdq_reverse(tmp);
}

// C ref: cmd.c cmdq_pop() -- queue chosen by in_doagain flag.
export function cmdq_pop(inDoAgain = false) {
    const queueKind = cmdq_queue_kind(inDoAgain);
    const node = _cmdQueues[queueKind];
    if (node) {
        _cmdQueues[queueKind] = node.next;
        node.next = null;
    }
    return node;
}

// C ref: cmd.c cmdq_peek()
export function cmdq_peek(queueKind) {
    return _cmdQueues[queueKind] || null;
}

// C ref: cmd.c cmdq_clear()
export function cmdq_clear(queueKind) {
    _cmdQueues[queueKind] = null;
}

function cmdq_clone_chain(head) {
    let tmp = null;
    let cq = head;
    while (cq) {
        const copy = {
            typ: cq.typ,
            key: cq.key,
            dirx: cq.dirx,
            diry: cq.diry,
            dirz: cq.dirz,
            intval: cq.intval,
            ec_entry: cq.ec_entry,
            next: tmp,
        };
        tmp = copy;
        cq = cq.next;
    }
    return cmdq_reverse(tmp);
}

export function cmdq_restore(queueKind, head) {
    _cmdQueues[queueKind] = cmdq_clone_chain(head || null);
}

function dirNodeToKey(node) {
    if (!node) return 0;
    if (node.dirz > 0) return '>'.charCodeAt(0);
    if (node.dirz < 0) return '<'.charCodeAt(0);
    const dx = node.dirx | 0;
    const dy = node.diry | 0;
    if (dx === 0 && dy === 0) return '.'.charCodeAt(0);
    if (dx === -1 && dy === 0) return 'h'.charCodeAt(0);
    if (dx === 1 && dy === 0) return 'l'.charCodeAt(0);
    if (dx === 0 && dy === -1) return 'k'.charCodeAt(0);
    if (dx === 0 && dy === 1) return 'j'.charCodeAt(0);
    if (dx === -1 && dy === -1) return 'y'.charCodeAt(0);
    if (dx === 1 && dy === -1) return 'u'.charCodeAt(0);
    if (dx === -1 && dy === 1) return 'b'.charCodeAt(0);
    if (dx === 1 && dy === 1) return 'n'.charCodeAt(0);
    return 0;
}

// Pop and decode one top-level queued command.
// Returns null or { key, countPrefix, extcmd }.
export function cmdq_pop_command(inDoAgain = false) {
    const queueKind = cmdq_queue_kind(inDoAgain);
    let countPrefix = 0;
    let head = _cmdQueues[queueKind];
    if (!head) return null;

    if (head.typ === CMDQ_INT) {
        countPrefix = Number.isFinite(head.intval) ? Math.max(0, head.intval | 0) : 0;
        _cmdQueues[queueKind] = head.next || null;
        head = _cmdQueues[queueKind];
    }
    if (!head) return null;

    _cmdQueues[queueKind] = head.next || null;
    head.next = null;

    if (head.typ === CMDQ_KEY) {
        return { key: head.key | 0, countPrefix };
    }
    if (head.typ === CMDQ_DIR) {
        return { key: dirNodeToKey(head), countPrefix };
    }
    if (head.typ === CMDQ_EXTCMD) {
        return { key: 0, countPrefix, extcmd: head.ec_entry || null };
    }
    if (head.typ === CMDQ_USER_INPUT) {
        return null;
    }
    return null;
}

function popQueuedInputKey(inDoAgain = false) {
    const queueKind = cmdq_queue_kind(inDoAgain);
    const head = _cmdQueues[queueKind];
    if (!head) return null;
    if (head.typ === CMDQ_EXTCMD) return null;

    _cmdQueues[queueKind] = head.next || null;
    head.next = null;

    if (head.typ === CMDQ_KEY) return head.key | 0;
    if (head.typ === CMDQ_DIR) return dirNodeToKey(head);
    if (head.typ === CMDQ_USER_INPUT) return null;
    if (head.typ === CMDQ_INT) {
        const digits = String(Math.max(0, head.intval | 0));
        if (!digits.length) return '0'.charCodeAt(0);
        for (let i = 1; i < digits.length; i++) {
            activeInputRuntime.pushInput(digits.charCodeAt(i));
        }
        return digits.charCodeAt(0);
    }
    return null;
}

// Lowest-level runtime key read (no queue/replay/keylog/--More-- handling).
// C analogue: raw windowproc read underneath readchar()/nhgetch().
function nhgetch_raw() {
    const display = getRuntimeDisplay();
    const snap = beginOriginAwait(activeGame, 'input');
    return Promise.resolve(activeInputRuntime.nhgetch())
        .then((ch) => {
            // C ref: tty topline key acknowledgement semantics.
            // After any keypress, topline should no longer be in NEED_MORE state.
            if (display) display.messageNeedsMore = false;
            return ch;
        })
        .finally(() => {
            endOriginAwait(activeGame, snap);
        });
}

// Get a character of input (async)
// This is the JS equivalent of C's nhgetch().
// C ref: winprocs.h win_nhgetch
export function nhgetch(opts = {}) {
    const readUnifiedKey = async () => {
        const queuedKey = popQueuedInputKey(cmdqInputModeDoAgain);
        if (Number.isFinite(queuedKey)) {
            ynTrace('raw=queued', queuedKey, String.fromCharCode(queuedKey));
            recordKey(queuedKey);
            return queuedKey;
        }

        if (isReplayMode()) {
            const key = getNextReplayKey();
            if (key !== null) {
                ynTrace('raw=replay', key, String.fromCharCode(key));
                recordKey(key);
                return key;
            }
        }

        if (_throwOnEmptyInput) {
            const state = typeof activeInputRuntime.getInputState === 'function'
                ? activeInputRuntime.getInputState() : null;
            if (!state || state.queueLength === 0) {
                throw new Error('Input queue empty - test may be missing keystrokes');
            }
        }

        if (typeof activeInputRuntime?.setWaitContext === 'function') {
            activeInputRuntime.setWaitContext(new Error('input wait context').stack || null);
        }

        const ch = await nhgetch_raw();
        ynTrace('raw=runtime', ch, Number.isFinite(ch) ? String.fromCharCode(ch) : String(ch));
        recordKey(ch);
        if (cmdqRepeatRecordMode && Number.isFinite(ch)) {
            cmdq_add_key(CQ_REPEAT, ch);
        }
        return ch;
    };

    const display = getRuntimeDisplay();

    // Clear message acknowledgement flag when user presses a key.
    // C ref: win/tty/topl.c - toplin gets set to TOPLINE_EMPTY after keypress
    if (display) {
        display.messageNeedsMore = false;
    }

    return readUnifiedKey();
}

export async function more(display, {
    game = null,
    forceVisual = false,
    clearAfter = true,
    readKey = null,
} = {}) {
    if (!display) return;
    const ctxGame = game ?? activeGame ?? null;
    const readMoreKey = (typeof readKey === 'function')
        ? readKey
        : () => nhgetch();

    // C ref: win/tty/topl.c more() -> bot() before xwaitforspace().
    // Keep status line current at every explicit --More-- boundary.
    const statusPlayer = display?._lastMapState?.player || ctxGame?.player || null;
    if (statusPlayer && typeof display.renderStatus === 'function') {
        display.renderStatus(statusPlayer);
    }

    if (forceVisual && typeof display.renderMoreMarker === 'function') {
        display.renderMoreMarker();
    }

    const ch = await waitForMoreDismissKey(readMoreKey);
    if (clearAfter) {
        if (typeof display.clearRow === 'function') {
            display.clearRow(0);
            if (display._topMessageRow1 !== undefined) {
                display.clearRow(1);
                display._topMessageRow1 = undefined;
            }
        }
        if ('messageNeedsMore' in display) display.messageNeedsMore = false;
        if ('topMessage' in display) display.topMessage = null;
    }
    return ch;
}

// Get a line of input (async)
// C ref: winprocs.h win_getlin
export async function getlin(prompt, display) {
    const runtimeDisplay = getRuntimeDisplay();
    const disp = display || runtimeDisplay;
    let line = '';

    // Helper to update display
    const updateDisplay = async () => {
        if (disp) {
            // Clear the message row and display prompt + current input.
            // Don't use putstr_message as it concatenates short messages.
            disp.clearRow(0);
            await disp.putstr(0, 0, prompt + line, CLR_GRAY);
            // C ref: tty_getlin() places cursor at end of typed text.
            // Set cursor to end of prompt + current input.
            const cols = disp.cols || 80;
            const cursorCol = Math.min((prompt + line).length, cols - 1);
            if (typeof disp.setCursor === 'function') disp.setCursor(cursorCol, 0);
        }
    };

    // Initial display
    await updateDisplay();

    const readPromptKey = async () => nhgetch();

    while (true) {
        const ch = await readPromptKey();
        if (ch === 13 || ch === 10) { // Enter
            // C-style prompt cleanup after accepting typed input.
            if (disp) {
                disp.topMessage = null;
                disp.messageNeedsMore = false;
                if (typeof disp.clearRow === 'function') {
                    disp.clearRow(0);
                }
            }
            return line;
        } else if (ch === 27) { // ESC
            if (disp) {
                disp.topMessage = null;
                disp.messageNeedsMore = false;
                if (typeof disp.clearRow === 'function') {
                    disp.clearRow(0);
                }
            }
            return null; // cancelled
        } else if (ch === 8 || ch === 127) { // Backspace
            if (line.length > 0) {
                line = line.slice(0, -1);
                await updateDisplay();
            }
        } else if (ch >= 32 && ch < 127) {
            line += String.fromCharCode(ch);
            await updateDisplay();
        }
    }
}

// Yes/no/quit prompt (async)
// C ref: winprocs.h win_yn_function
export async function ynFunction(query, choices, def, display) {
    const runtimeDisplay = getRuntimeDisplay();
    const disp = display || runtimeDisplay;
    let prompt = query;
    if (choices) {
        prompt += ` [${choices}]`;
    }
    if (def) {
        prompt += ` (${String.fromCharCode(def)})`;
    }
    prompt += ' ';

    if (disp) await disp.putstr_message(prompt);
    ynTrace('prompt', prompt.trimEnd(), `choices=${choices || ''}`, `def=${def || 0}`);

    // C ref: tty_yn_function() lowercases responses unless choices contain
    // explicit uppercase entries, in which case case is preserved.
    const preserveCase = !!(choices && /[A-Z]/.test(choices));
    const readPromptKey = async () => nhgetch();

    while (true) {
        const ch = await readPromptKey();
        ynTrace('key', ch, Number.isFinite(ch) ? String.fromCharCode(ch) : String(ch));
        // C quitchars handling for yn prompts: Space/CR/LF use default.
        if ((ch === 32 || ch === 13 || ch === 10) && def) {
            ynTrace('return=default', def, String.fromCharCode(def));
            return def;
        }
        // ESC returns 'q' or 'n' or default
        if (ch === 27) {
            if (choices && choices.includes('q')) return 'q'.charCodeAt(0);
            if (choices && choices.includes('n')) return 'n'.charCodeAt(0);
            if (def) return def;
            return 27;
        }
        // Check if this is a valid choice
        let c = String.fromCharCode(ch);
        if (!preserveCase) c = c.toLowerCase();
        if (!choices || choices.includes(c)) {
            ynTrace('return=choice', c);
            return c.charCodeAt(0);
        }
        ynTrace('reject', c);
    }
}

// Gather typed digits into a number; return the next non-digit
// C ref: cmd.c:4851 get_count()
// Returns: { count: number, key: number }
export async function getCount(firstKey, maxCount, display) {
    const runtimeDisplay = getRuntimeDisplay();
    const disp = display || runtimeDisplay;
    let cnt = 0;
    let key = firstKey || 0;
    let backspaced = false;
    let showzero = true;
    const LARGEST_INT = 32767; // C ref: global.h:133 LARGEST_INT (2^15 - 1)
    const MAX_COUNT = maxCount || LARGEST_INT;
    const ERASE_CHAR = 127; // DEL

    // If first key is provided and it's a digit, use it
    if (key && isDigit(key)) {
        cnt = key - 48; // '0' = 48
        key = 0; // Clear so we read next key
    }

    const readPromptKey = async () => nhgetch();

    while (true) {
        // If we don't have a key yet, read one
        if (!key) {
            key = await readPromptKey();
        }

        if (isDigit(key)) {
            const digit = key - 48;
            // cnt = (10 * cnt) + digit
            cnt = (cnt * 10) + digit;
            if (cnt < 0) {
                cnt = 0;
            } else if (cnt > MAX_COUNT) {
                cnt = MAX_COUNT;
            }
            showzero = (key === 48); // '0'
            key = 0; // Read next key
        } else if (key === 8 || key === ERASE_CHAR) { // Backspace
            if (!cnt) {
                break; // No count entered, just cancel
            }
            showzero = false;
            cnt = Math.floor(cnt / 10);
            backspaced = true;
            key = 0; // Read next key
        } else if (key === 27) { // ESC
            cnt = 0;
            break;
        } else {
            // Non-digit, non-backspace, non-ESC: this is the command key
            break;
        }

        // Show "Count: N" when cnt > 9 or after backspace
        // C ref: cmd.c:4911 - shows count when cnt > 9 || backspaced || echoalways
        if (cnt > 9 || backspaced) {
            if (disp) {
                if (backspaced && !cnt && !showzero) {
                    const countText = 'Count: ';
                    await disp.putstr_message(countText);
                    if (typeof disp.moveCursorTo === 'function') {
                        disp.moveCursorTo(countText.length, 0);
                    }
                } else {
                    const countText = `Count: ${cnt}`;
                    await disp.putstr_message(countText);
                    if (typeof disp.moveCursorTo === 'function') {
                        disp.moveCursorTo(countText.length, 0);
                    }
                }
            }
            backspaced = false;
        }
    }

    return { count: cnt, key: key };
}

// Helper: check if character code is a digit '0'-'9'
function isDigit(ch) {
    return ch >= 48 && ch <= 57; // '0' = 48, '9' = 57
}

function getRuntimeDisplay() {
    if (typeof activeInputRuntime.getDisplay === 'function') {
        return activeInputRuntime.getDisplay();
    }
    return null;
}
