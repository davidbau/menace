// timeout.js -- Timer subsystem used for timer-driven gameplay effects.
//
// This is a lightweight but stateful port of timeout.c primitives. It is not a
// full simulation of every C timeout effect yet, but it now provides:
//   - a central timer queue with start/stop/peek/run primitives
//   - timer helpers for objects and map locations
//   - exported callbacks used by higher-level effects (burning, egg hatch, etc.)
//   - basic foundation for `nh_timeout()` and status-processing hooks

import { rnd } from './rng.js';
import { pline } from './pline.js';

export const TIMER_KIND = {
    SHORT: 0,
    LONG: 1,
    SPECIAL: 2,
};

const OBJ_TIMER_KIND = TIMER_KIND.SHORT;

export const TIMER_FUNC = {
    BURN_OBJECT: 'BURN_OBJECT',
    HATCH_EGG: 'HATCH_EGG',
    FIGURINE_TRANSFORM: 'FIGURINE_TRANSFORM',
    FALL_ASLEEP: 'FALL_ASLEEP',
    DO_STORMS: 'DO_STORMS',
};

const MAX_EGG_HATCH_TIME = 200;

let _currentTurn = 0;
let _timerQueue = [];
let _timeoutContext = {
    player: null,
    map: null,
    display: null,
};

let _timerTrace = [];

function normalizeTurnArg(when) {
    if (Number.isNaN(when)) return 0;
    const v = Number(when);
    if (!Number.isFinite(v)) return 0;
    return Math.trunc(v);
}

function normalizeKind(kind) {
    if (kind === TIMER_KIND.LONG || kind === TIMER_KIND.SPECIAL || kind === TIMER_KIND.SHORT) {
        return kind;
    }
    return TIMER_KIND.SHORT;
}

function normalizeCallback(funcIndex) {
    if (funcIndex === null || funcIndex === undefined) return '';
    if (typeof funcIndex === 'string' || Number.isFinite(funcIndex)) {
        return String(funcIndex);
    }
    return '';
}

function normalizeAnyArg(arg) {
    return Object.is(arg, undefined) ? null : arg;
}

function timerMatches(timer, { funcIndex = '', arg = null, kind = null } = {}) {
    const hasFuncMatch = funcIndex === null || funcIndex === '' || timer.funcIndex === funcIndex;
    const hasArgMatch = arg === undefined || arg === null || timer.arg === arg;
    const hasKindMatch = kind === null || kind === undefined || timer.kind === kind;
    return hasFuncMatch && hasArgMatch && hasKindMatch;
}

function calculateAbsoluteTurn(when, kind) {
    const t = normalizeTurnArg(when);
    if (kind === TIMER_KIND.SHORT) {
        return _currentTurn + Math.max(0, t);
    }
    return Math.max(0, t);
}

function cloneTimer(t) {
    return {
        when: t.when,
        kind: t.kind,
        funcIndex: t.funcIndex,
        arg: t.arg,
        x: t.x,
        y: t.y,
        data: t.data,
    };
}

function insertTimer(timer) {
    const idx = _timerQueue.findIndex((entry) => entry.when > timer.when);
    if (idx < 0) {
        _timerQueue.push(timer);
        return;
    }
    _timerQueue.splice(idx, 0, timer);
}

function queueSignature() {
    return _timerQueue.map((t, idx) => `${idx}:${t.funcIndex}@${t.when}`).join('|') || 'empty';
}

function traceTimerEvent(event) {
    const entry = `${String(event).slice(0, 120)} :: ${queueSignature()}`;
    _timerTrace.push(entry);
    if (_timerTrace.length > 200) _timerTrace.shift();
}

export function setTimerContext(context = {}) {
    _timeoutContext = { ..._timeoutContext, ...context };
}

export function setCurrentTurn(turn) {
    _currentTurn = normalizeTurnArg(turn);
}

export function getCurrentTurn() {
    return _currentTurn;
}

export function clearTimeoutQueue() {
    _timerQueue = [];
    _timerTrace = [];
}

export function kind_name(kind) {
    switch (kind) {
    case TIMER_KIND.SHORT: return 'SHORT';
    case TIMER_KIND.LONG: return 'LONG';
    case TIMER_KIND.SPECIAL: return 'SPECIAL';
    default: return `UNKNOWN(${kind})`;
    }
}

export function timer_stats() {
    const totalsByKind = {};
    const totalsByFunc = {};
    for (const timer of _timerQueue) {
        const kindKey = kind_name(timer.kind);
        totalsByKind[kindKey] = (totalsByKind[kindKey] || 0) + 1;
        const fn = timer.funcIndex || 'UNKNOWN';
        totalsByFunc[fn] = (totalsByFunc[fn] || 0) + 1;
    }
    return {
        timerCount: _timerQueue.length,
        byKind: totalsByKind,
        byFunc: totalsByFunc,
    };
}

function _getTimerCallback(funcIndex, custom) {
    if (typeof custom === 'function') return custom;
    if (funcIndex === TIMER_FUNC.BURN_OBJECT) return burn_object;
    if (funcIndex === TIMER_FUNC.HATCH_EGG) return hatch_egg;
    if (funcIndex === TIMER_FUNC.FIGURINE_TRANSFORM) return fig_transform;
    if (funcIndex === TIMER_FUNC.FALL_ASLEEP) return fall_asleep;
    if (funcIndex === TIMER_FUNC.DO_STORMS) return do_storms;
    if (funcIndex === 'melt-ice') return () => {
        // Placeholder for themed room melt timers.
    };
    return null;
}

export function start_timer(when, kind = TIMER_KIND.SHORT, funcIndex, arg = null, custom = null) {
    const normalizedKind = normalizeKind(kind);
    const normalizedArg = normalizeAnyArg(arg);
    const absoluteWhen = calculateAbsoluteTurn(when, normalizedKind);
    const callback = _getTimerCallback(normalizeCallback(funcIndex), custom);
    const normalizedFunc = normalizeCallback(funcIndex);

    const duplicate = _timerQueue.find((timer) => timerMatches(timer, {
        kind: normalizedKind,
        funcIndex: normalizedFunc,
        arg: normalizedArg,
    }));
    if (duplicate) {
        return null;
    }

    const timer = {
        when: absoluteWhen,
        kind: normalizedKind,
        funcIndex: normalizedFunc,
        arg: normalizedArg,
        custom,
        callback: typeof callback === 'function' ? callback : null,
    };
    insertTimer(timer);

    if (normalizedKind === OBJ_TIMER_KIND && normalizedArg && typeof normalizedArg === 'object') {
        normalizedArg.timed = (Number.isInteger(normalizedArg.timed) ? normalizedArg.timed : 0) + 1;
    }
    traceTimerEvent(`start_timer(${timer.funcIndex}, ${absoluteWhen})`);
    return timer;
}

export function start_timer_at(x, y, funcIndex, when, kind = TIMER_KIND.LONG) {
    const timer = start_timer(when, kind, funcIndex, null, null);
    if (timer) {
        timer.x = Math.trunc(x);
        timer.y = Math.trunc(y);
    }
    return timer;
}

export function stop_timer(funcIndex, arg = null, cleanup = null) {
    let removed = false;
    const normalizedFunc = normalizeCallback(funcIndex);
    const argMatch = Object.is(arg, undefined) ? null : arg;

    for (let i = _timerQueue.length - 1; i >= 0; i--) {
        const timer = _timerQueue[i];
        if (timerMatches(timer, { funcIndex: normalizedFunc, arg: argMatch })) {
            const [removedTimer] = _timerQueue.splice(i, 1);
            removed = true;
            if (removedTimer.kind === OBJ_TIMER_KIND && removedTimer.arg && typeof removedTimer.arg === 'object') {
                removedTimer.arg.timed = Math.max(0, (Number.isInteger(removedTimer.arg.timed) ? removedTimer.arg.timed : 1) - 1);
            }
            if (typeof cleanup === 'function') {
                cleanup(removedTimer, removedTimer.when);
            } else if (removedTimer.kind === OBJ_TIMER_KIND
                       && removedTimer.funcIndex === TIMER_FUNC.BURN_OBJECT) {
                cleanup_burn(removedTimer.arg, removedTimer.when);
            }
            traceTimerEvent(`stop_timer(${normalizedFunc || '*'}, removed@${removedTimer.when})`);
        }
    }
    return removed;
}

export function peek_timer(funcIndex, arg = null) {
    const normalizedFunc = normalizeCallback(funcIndex);
    const argMatch = Object.is(arg, undefined) ? null : arg;
    const match = _timerQueue.find((timer) => timer.funcIndex === normalizedFunc
        && (argMatch === null || timer.arg === argMatch));
    return match ? match.when : 0;
}

export function remove_timer(_base, _funcIndex, _arg) {
    return stop_timer(_funcIndex, _arg);
}

export function insert_timer(timer) {
    if (!timer || typeof timer !== 'object') return;
    insertTimer(timer);
}

function _fireTimer(timer) {
    if (!timer) return;
    const callback = timer.callback || _getTimerCallback(timer.funcIndex, null);
    if (typeof callback !== 'function') return;
    if (timer.kind === OBJ_TIMER_KIND && timer.arg && typeof timer.arg === 'object' && Number.isInteger(timer.arg.timed)) {
        timer.arg.timed = Math.max(0, timer.arg.timed - 1);
    }
    try {
        callback(timer.arg, timer);
    } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(`timeout callback failed for ${timer.funcIndex}:`, err);
        }
    }
}

export function run_timers(when) {
    if (Number.isFinite(when)) {
        _currentTurn = normalizeTurnArg(when);
    }

    let next = _timerQueue[0];
    while (next && next.when <= _currentTurn) {
        const timer = _timerQueue.shift();
        traceTimerEvent(`run_timers(${timer.funcIndex}, ${timer.when})`);
        _fireTimer(timer);
        next = _timerQueue[0];
    }
}

export function print_queue(win, base) {
    const lines = _timerQueue.map((timer) => {
        const kind = kind_name(timer.kind);
        return `${base ? `${base}: ` : ''}${kind} ${timer.funcIndex} ${timer.when}`;
    });
    if (win && typeof win.putstr_message === 'function') {
        for (const line of lines) win.putstr_message(line);
        return;
    }
    return lines;
}

export function wiz_timeout_queue() {
    return {
        currentTurn: _currentTurn,
        count: _timerQueue.length,
        timers: _timerQueue.map((timer) => ({
            when: timer.when,
            kind: kind_name(timer.kind),
            func: timer.funcIndex,
            hasArg: !!timer.arg,
            x: timer.x,
            y: timer.y,
        })),
        stats: timer_stats(),
        trace: _timerTrace.slice(),
    };
}

export function timer_sanity_check() {
    const issues = [];
    const seen = new Set();
    for (const timer of _timerQueue) {
        if (!timer.funcIndex) {
            issues.push('missing function index');
            continue;
        }
        if (!Number.isFinite(timer.when)) {
            issues.push(`invalid when for ${timer.funcIndex}`);
        }
        const id = `${timer.funcIndex}:${timer.when}:${Object.is(timer.arg, null) ? 'null' : typeof timer.arg}`;
        if (seen.has(id)) {
            issues.push(`duplicate timer signature ${id}`);
        }
        seen.add(id);
    }
    return issues;
}

// Object-level timer helpers -------------------------------------------------

export function obj_move_timers(src, dest) {
    if (!src || !dest) return;
    for (const timer of _timerQueue) {
        if (timer.arg === src) {
            timer.arg = dest;
        }
    }
    dest.timed = (Number.isInteger(dest.timed) ? dest.timed : 0) + (Number.isInteger(src.timed) ? src.timed : 0);
    src.timed = 0;
}

export function obj_split_timers(src, dest) {
    if (!src || !dest) return;
    const duplicates = [];
    for (const timer of _timerQueue) {
        if (timer.arg === src) {
            duplicates.push(cloneTimer(timer));
        }
    }
    for (const dup of duplicates) {
        dup.arg = dest;
        dup.kind = dup.kind || OBJ_TIMER_KIND;
        insertTimer(dup);
    }
    if (dest && Number.isInteger(dest.timed)) {
        dest.timed += duplicates.length;
    } else if (dest) {
        dest.timed = duplicates.length;
    }
}

export function obj_stop_timers(object) {
    if (!object) return;
    stop_timer(null, object);
}

export function obj_has_timer(object, timerType) {
    const target = normalizeCallback(timerType);
    return _timerQueue.some((timer) => timer.arg === object
        && (timerType === undefined || timerType === null || timer.funcIndex === target));
}

// Spot-timer helpers --------------------------------------------------------

export function spot_stop_timers(x, y, funcIndex = null) {
    for (let i = _timerQueue.length - 1; i >= 0; i--) {
        const timer = _timerQueue[i];
        const hasPos = Number.isFinite(timer.x) && Number.isFinite(timer.y);
        if (!hasPos) continue;
        if (timer.x === x && timer.y === y
            && (funcIndex === null || timer.funcIndex === normalizeCallback(funcIndex))) {
            _timerQueue.splice(i, 1);
        }
    }
}

export function spot_time_expires(x, y, funcIndex) {
    const target = normalizeCallback(funcIndex);
    for (const timer of _timerQueue) {
        if (timer.x === x && timer.y === y && timer.funcIndex === target) {
            return timer.when;
        }
    }
    return 0;
}

export function spot_time_left(x, y, funcIndex) {
    const expires = spot_time_expires(x, y, funcIndex);
    if (!expires) return 0;
    return Math.max(0, expires - _currentTurn);
}

// Timeout-driven gameplay behavior ------------------------------------------

export function nh_timeout(context = {}) {
    if (context.player || context.display || context.map) {
        setTimerContext(context);
    }
    run_timers(_currentTurn);

    const player = context.player || _timeoutContext.player;
    if (!player) return;

    if (player.fast) {
        player._fastMessageCooldown = Math.max((player._fastMessageCooldown || 1) - 1, 0);
    }

    const sleepUntil = normalizeTurnArg(player.sleepTimeout);
    if (sleepUntil > 0) {
        const remaining = sleepUntil - 1;
        player.sleepTimeout = remaining;
        if (remaining <= 0) {
            player.sleepTimeout = 0;
            player.sleeping = false;
            const msg = typeof player.sleepWakeupMessage === 'string'
                ? player.sleepWakeupMessage
                : 'You wake up.';
            if (player.sleepWakeupMessage) {
                pline(msg);
            }
        }
    }

    if (player._timed) {
        const keys = Object.keys(player._timed);
        for (const key of keys) {
            const value = Number(player._timed[key]);
            if (Number.isNaN(value) || value <= 0) continue;
            const next = value - 1;
            if (next <= 0) {
                delete player._timed[key];
            } else {
                player._timed[key] = next;
            }
        }
    }
}

export function fall_asleep(howLong, wakeupMsg) {
    const player = _timeoutContext.player;
    if (!player) return;
    player.sleeping = true;
    player.sleepTimeout = Math.max(0, Math.trunc(howLong));
    player.sleepWakeupMessage = wakeupMsg || 'You wake up.';

    // In C this would set the global Slept flag and trigger sleep status logic.
    // That additional behavior is not yet modeled in this JS foundation.
}

export function done_timeout(how, which) {
    if (typeof console !== 'undefined' && console.error) {
        console.error(`done_timeout: ${String(how)} ${String(which || '')}`);
    }
    const player = _timeoutContext.player;
    if (player) {
        player.dead = true;
        player.deathCause = how || 'timeout';
    }
}

export function attach_egg_hatch_timeout(egg, when) {
    if (!egg) return 0;
    const base = normalizeTurnArg(when);
    let timeout = base;
    if (!base || base <= 0) {
        for (let i = MAX_EGG_HATCH_TIME - 50; i <= MAX_EGG_HATCH_TIME; i++) {
            if (rnd(i) > 150) {
                timeout = i;
                break;
            }
        }
        if (!timeout) timeout = MAX_EGG_HATCH_TIME;
    }
    const turns = start_timer(timeout, TIMER_KIND.SHORT, TIMER_FUNC.HATCH_EGG, egg);
    if (!turns) return 0;
    egg._egg_hatch_timeout = turns.when;
    return turns.when;
}

export function kill_egg(egg) {
    if (!egg) return false;
    const removed = stop_timer(TIMER_FUNC.HATCH_EGG, egg);
    delete egg._egg_hatch_timeout;
    return removed;
}

export function hatch_egg(egg) {
    if (!egg || egg._deadHatching) return;
    egg._deadHatching = true;
    if (typeof pline === 'function') {
        if (typeof egg.corpsenm === 'number' && egg.corpsenm >= 0) {
            pline(`A creature hatches from a nearby egg.`);
        }
    }
}

export function attach_fig_transform_timeout(figurine) {
    if (!figurine) return null;
    return start_timer(rnd(9000) + 200, TIMER_KIND.SHORT, TIMER_FUNC.FIGURINE_TRANSFORM, figurine);
}

function fig_transform(figurine) {
    if (!figurine || !figurine.corpsenm) {
        return;
    }
    if (!figurine._figTransformMessageIssued) {
        pline('Your %s transforms!', figurine.name || 'figurine');
        figurine._figTransformMessageIssued = true;
    }
}

export function burn_object(arg) {
    const obj = arg;
    if (!obj || typeof obj !== 'object') return;
    if (!Number.isFinite(obj.age)) {
        obj.age = 0;
    }
    if (obj.age > 0) {
        obj.age -= 1;
        if (obj.age <= 0) {
            obj.age = 0;
            if (obj.lamplit) {
                obj.lamplit = false;
            }
            end_burn(obj, true);
        }
    }
}

export function begin_burn(obj, _alreadyLit = false) {
    if (!obj || !Number.isFinite(obj.age)) return null;
    if (obj.age <= 0) return null;
    obj.lamplit = true;
    const timer = start_timer(obj.age, TIMER_KIND.SHORT, TIMER_FUNC.BURN_OBJECT, obj);
    obj._burnTimer = timer;
    return timer;
}

export function cleanup_burn(arg, expireTime) {
    const obj = arg;
    if (obj && obj._burnTimer) {
        delete obj._burnTimer;
    }
    if (obj && obj.age <= 0) {
        obj.lamplit = false;
    }
    if (Number.isFinite(expireTime)) {
        obj._burnExpire = expireTime;
    }
}

export function end_burn(obj, timerAttached = false) {
    if (!obj) return false;
    const removed = stop_timer(TIMER_FUNC.BURN_OBJECT, obj);
    if (obj._burnTimer) delete obj._burnTimer;
    if (removed && timerAttached) {
        cleanup_burn(obj);
    }
    obj.lamplit = false;
    return removed;
}

export function do_storms() {
    // Storm behavior is not yet simulated.
    return;
}

export function stoned_dialogue() {}
export function vomiting_dialogue() {}
export function sleep_dialogue() {}
export function choke_dialogue() {}
export function sickness_dialogue() {}
export function levitation_dialogue() {}
export function slime_dialogue() {}
export function burn_away_slime() {}
export function slimed_to_death(_ptr) {}
export function phaze_dialogue() {}
export function region_dialogue() {}
export function slip_or_trip() {}
export function see_lamp_flicker() {}
export function lantern_message() {}

export function timerSanityCheck() {
    return timer_sanity_check();
}

export function kindName(kind) {
    return kind_name(kind);
}

export function printQueue(win, base) {
    return print_queue(win, base);
}

export function relink_timers() {
    return null;
}

export function restore_timers() {
    return 0;
}

export function save_timers() {
    return null;
}

export function saveTimers() {
    return save_timers();
}

export function restoreTimers() {
    return restore_timers();
}

export function relinkTimers() {
    return relink_timers();
}
