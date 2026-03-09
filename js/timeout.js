// timeout.js -- Timer subsystem used for timer-driven gameplay effects.
//
// This is a lightweight but stateful port of timeout.c primitives. It is not a
// full simulation of every C timeout effect yet, but it now provides:
//   - a central timer queue with start/stop/peek/run primitives
//   - timer helpers for objects and map locations
//   - exported callbacks used by higher-level effects (burning, egg hatch, etc.)
//   - basic foundation for `nh_timeout()` and status-processing hooks

import { game as _gstate } from './gstate.js';
import * as NHC from './const.js';
import { rnd, rn2 } from './rng.js';
import { pline, You, You_feel } from './pline.js';
import { TIMEOUT, INTRINSIC, FROMOUTSIDE,
         CONFUSION, STUNNED, BLINDED, HALLUC, SICK, VOMITING, DEAF, GLIB,
         FAST, FUMBLING, WOUNDED_LEGS, SLEEPING, LEVITATION,
         STONED, SLIMED, STRANGLED, INVIS, SEE_INVIS, DISPLACED,
         PASSES_WALLS, MAGICAL_BREATHING, FLYING,
         FIRE_RES, STONE_RES, DETECT_MONSTERS, PROT_FROM_SHAPE_CHANGERS,
         SICK_NONVOMITABLE, A_CON, A_DEX, A_STR, ACCESSIBLE,
         TIMER_KIND, TIMER_FUNC, MELT_ICE_AWAY,
         NO_MINVENT, MM_NOMSG,
         LS_OBJECT, OBJ_INVENT, OBJ_FLOOR, OBJ_CONTAINED } from './const.js';
import { exercise } from './attrib_exercise.js';
import { acurr } from './attrib.js';
import { mons } from './monsters.js';
import { POT_OIL, TALLOW_CANDLE, WAX_CANDLE, CANDELABRUM_OF_INVOCATION } from './objects.js';
import { big_to_little } from './mondata.js';
import { enexto } from './teleport.js';
import { new_light_source, del_light_source, candle_light_range } from './light.js';

const OBJ_TIMER_KIND = TIMER_KIND.SHORT;

const MAX_EGG_HATCH_TIME = 200;

// C ref: timeout.c propertynames[] table used by wizard diagnostics.
const _PROPERTY_NAMES = [
    ['INVULNERABLE', 'invulnerable'],
    ['STONED', 'petrifying'],
    ['SLIMED', 'becoming slime'],
    ['STRANGLED', 'strangling'],
    ['SICK', 'fatally sick'],
    ['STUNNED', 'stunned'],
    ['CONFUSION', 'confused'],
    ['HALLUC', 'hallucinating'],
    ['BLINDED', 'blinded'],
    ['DEAF', 'deafness'],
    ['VOMITING', 'vomiting'],
    ['GLIB', 'slippery fingers'],
    ['WOUNDED_LEGS', 'wounded legs'],
    ['SLEEPY', 'sleepy'],
    ['TELEPORT', 'teleporting'],
    ['POLYMORPH', 'polymorphing'],
    ['LEVITATION', 'levitating'],
    ['FAST', 'very fast'],
    ['CLAIRVOYANT', 'clairvoyant'],
    ['DETECT_MONSTERS', 'monster detection'],
    ['SEE_INVIS', 'see invisible'],
    ['INVIS', 'invisible'],
    ['ACID_RES', 'acid resistance'],
    ['STONE_RES', 'stoning resistance'],
    ['DISPLACED', 'displaced'],
    ['PASSES_WALLS', 'pass thru walls'],
    ['MAGICAL_BREATHING', 'magical breathing'],
    ['WWALKING', 'water walking'],
    ['FIRE_RES', 'fire resistance'],
    ['COLD_RES', 'cold resistance'],
    ['SLEEP_RES', 'sleep resistance'],
    ['DISINT_RES', 'disintegration resistance'],
    ['SHOCK_RES', 'shock resistance'],
    ['POISON_RES', 'poison resistance'],
    ['DRAIN_RES', 'drain resistance'],
    ['SICK_RES', 'sickness resistance'],
    ['ANTIMAGIC', 'magic resistance'],
    ['HALLUC_RES', 'hallucination resistance'],
    ['BLND_RES', 'light-induced blindness resistance'],
    ['FUMBLING', 'fumbling'],
    ['HUNGER', 'voracious hunger'],
    ['TELEPAT', 'telepathic'],
    ['WARNING', 'warning'],
    ['WARN_OF_MON', 'warn: monster type or class'],
    ['WARN_UNDEAD', 'warn: undead'],
    ['SEARCHING', 'searching'],
    ['INFRAVISION', 'infravision'],
    ['ADORNED', 'adorned (+/- Cha)'],
    ['STEALTH', 'stealthy'],
    ['AGGRAVATE_MONSTER', 'monster aggravation'],
    ['CONFLICT', 'conflict'],
    ['JUMPING', 'jumping'],
    ['TELEPORT_CONTROL', 'teleport control'],
    ['FLYING', 'flying'],
    ['SWIMMING', 'swimming'],
    ['SLOW_DIGESTION', 'slow digestion'],
    ['HALF_SPDAM', 'half spell damage'],
    ['HALF_PHDAM', 'half physical damage'],
    ['REGENERATION', 'HP regeneration'],
    ['ENERGY_REGENERATION', 'energy regeneration'],
    ['PROTECTION', 'extra protection'],
    ['PROT_FROM_SHAPE_CHANGERS', 'protection from shape changers'],
    ['POLYMORPH_CONTROL', 'polymorph control'],
    ['UNCHANGING', 'unchanging'],
    ['REFLECTING', 'reflecting'],
    ['FREE_ACTION', 'free action'],
    ['FIXED_ABIL', 'fixed abilities'],
    ['LIFESAVED', 'life will be saved'],
    [0, null],
];

// C ref: timeout.c:117 property_by_index()
export function property_by_index(idx, propertynum = null) {
    let i = Number.isFinite(idx) ? Math.trunc(idx) : 0;
    if (i < 0 || i >= _PROPERTY_NAMES.length) i = _PROPERTY_NAMES.length - 1;
    const [propKey, propName] = _PROPERTY_NAMES[i];
    if (propertynum && typeof propertynum === 'object') {
        propertynum.value = (typeof propKey === 'string' && Number.isInteger(NHC[propKey]))
            ? NHC[propKey]
            : 0;
    }
    return propName;
}

// _currentTurn is stored on the game object (gstate.game._currentTurn).
// The local fallback handles early boot before the game object exists.
let _currentTurnFallback = 0;
let _timerQueue = [];
// _timeoutContext falls back to gstate.game fields when not explicitly set.
let _timeoutContext = {
    get player() { return _gstate?.player ?? null; },
    get map() { return _gstate?.map ?? null; },
    get display() { return _gstate?.display ?? null; },
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
        return _getCurrentTurn() + Math.max(0, t);
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

// setTimerContext removed in Phase 4 — _timeoutContext reads from gstate directly.

function _getCurrentTurn() {
    if (_gstate && '_currentTurn' in _gstate) return _gstate._currentTurn;
    return _currentTurnFallback;
}

// setCurrentTurn removed in Phase 4 — allmain.js writes game._currentTurn directly.

export function getCurrentTurn() {
    return _getCurrentTurn();
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
    if (funcIndex === TIMER_FUNC.REVIVE_MON) return revive_mon_timer;
    if (funcIndex === TIMER_FUNC.ZOMBIFY_MON) return zombify_mon_timer;
    if (funcIndex === TIMER_FUNC.ROT_CORPSE) return rot_corpse_timer;
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

// Autotranslated from timeout.c:2474
export function remove_timer(base, func_index, arg) {
  let prev, curr;
  for (prev = 0, curr = base; curr; prev = curr, curr = curr.next) {
    if (curr.func_index === func_index && curr.arg.a_void === arg.a_void) {
      break;
    }
  }
  if (curr) {
    if (prev) prev.next = curr.next;
    else {
       base = curr.next;
    }
  }
  return curr;
}

export function insert_timer(timer) {
    if (!timer || typeof timer !== 'object') return;
    insertTimer(timer);
}

async function _fireTimer(timer) {
    if (!timer) return;
    const callback = timer.callback || _getTimerCallback(timer.funcIndex, null);
    if (typeof callback !== 'function') return;
    if (timer.kind === OBJ_TIMER_KIND && timer.arg && typeof timer.arg === 'object' && Number.isInteger(timer.arg.timed)) {
        timer.arg.timed = Math.max(0, timer.arg.timed - 1);
    }
    try {
        await callback(timer.arg, timer);
    } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(`timeout callback failed for ${timer.funcIndex}:`, err);
        }
    }
}

export async function run_timers(when) {
    if (Number.isFinite(when)) {
        _currentTurnFallback = normalizeTurnArg(when);
    }
    const currentTurn = Number.isFinite(when) ? normalizeTurnArg(when) : _getCurrentTurn();

    let next = _timerQueue[0];
    while (next && next.when <= currentTurn) {
        const timer = _timerQueue.shift();
        traceTimerEvent(`run_timers(${timer.funcIndex}, ${timer.when})`);
        await _fireTimer(timer);
        next = _timerQueue[0];
    }
}

export async function print_queue(win, base) {
    const lines = _timerQueue.map((timer) => {
        const kind = kind_name(timer.kind);
        return `${base ? `${base}: ` : ''}${kind} ${timer.funcIndex} ${timer.when}`;
    });
    if (win && typeof win.putstr_message === 'function') {
        for (const line of lines) await win.putstr_message(line);
        return;
    }
    return lines;
}

export function wiz_timeout_queue() {
    return {
        currentTurn: _getCurrentTurn(),
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

// Autotranslated from timeout.c:2450
export function spot_time_left(x, y, func_index, game) {
  let expires = spot_time_expires(x, y, func_index);
  return (expires > 0) ? expires - (Number(game?.moves) || 0) : 0;
}

// Timeout-driven gameplay behavior ------------------------------------------

export async function nh_timeout(context = {}) {
    await run_timers(_getCurrentTurn());

    const player = context.player || _timeoutContext.player;
    if (!player) return;
    const map = context.map || _timeoutContext.map;

    // --- Dialogue callbacks for active countdowns (C ref: timeout.c:620-640) ---
    // These fire BEFORE the timeout decrement, giving countdown messages.
    if (player.getPropTimeout(STONED)) await stoned_dialogue(player);
    if (player.getPropTimeout(SLIMED)) await slime_dialogue(player);
    if (player.getPropTimeout(VOMITING)) await vomiting_dialogue(player);
    if (player.getPropTimeout(STRANGLED)) await choke_dialogue(player);
    if (player.getPropTimeout(SICK)) await sickness_dialogue(player);
    if (player.getPropTimeout(LEVITATION)) await levitation_dialogue(player, map);

    // --- Intrinsic timeout decrements (C ref: timeout.c nh_timeout()) ---
    if (player.uprops) {
        const props = Object.keys(player.uprops);
        for (const key of props) {
            const prop = Number(key);
            const entry = player.uprops[key];
            if (!entry) continue;
            const timeout = entry.intrinsic & TIMEOUT;
            if (timeout > 0) {
                const newTimeout = timeout - 1;
                entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | newTimeout;
                if (prop === WOUNDED_LEGS) {
                    player.hWoundedLegs = newTimeout;
                }
                // On reaching zero, fire expiry effects
                if (newTimeout === 0) {
                    await _fireExpiryEffect(player, prop, context);
                }
            }
        }
    }

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
                await pline(msg);
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

async function revive_mon_timer(body) {
    if (!body) return;
    const { revive_mon } = await import('./do.js');
    await revive_mon(body, _timeoutContext.player, _timeoutContext.map);
}

async function zombify_mon_timer(body) {
    if (!body) return;
    const { zombify_mon } = await import('./do.js');
    await zombify_mon(body, _timeoutContext.player, _timeoutContext.map);
}

async function rot_corpse_timer(body) {
    if (!body) return;
    const { rot_corpse } = await import('./dig.js');
    rot_corpse(body, _getCurrentTurn(), _timeoutContext.map, _timeoutContext.player);
}

let _statusFnsPromise = null;
async function getStatusFns() {
    if (!_statusFnsPromise) {
        // Runtime lazy import avoids module-init registration side effects.
        _statusFnsPromise = import('./potion.js').then((m) => ({
            make_confused: m.make_confused,
            make_stunned: m.make_stunned,
            make_blinded: m.make_blinded,
            make_hallucinated: m.make_hallucinated,
            make_sick: m.make_sick,
            make_vomiting: m.make_vomiting,
            make_deaf: m.make_deaf,
            make_glib: m.make_glib,
            make_slimed: m.make_slimed,
            make_stoned: m.make_stoned,
        }));
    }
    return _statusFnsPromise;
}

// Fire expiry effect when an intrinsic timeout reaches zero.
// C ref: timeout.c nh_timeout() — the big switch on each prop (lines 690-940)
async function _fireExpiryEffect(player, prop, context = {}) {
    const fns = await getStatusFns();
    const entry = player.uprops[prop];

    switch (prop) {
    case STONED:
        // C ref: done_timeout(STONING, STONED) — petrification death
        await pline("You have turned to stone.");
        done_timeout('stoned', 'petrification');
        break;

    case SLIMED:
        // C ref: slimed_to_death() — sliming death
        await pline("You have become a green slime.");
        done_timeout('slimed', 'sliming');
        break;

    case VOMITING:
        if (fns.make_vomiting) await fns.make_vomiting(player, 0, true);
        break;

    case SICK:
        // C ref: hero might recover from food poisoning if good CON
        if ((player.usick_type & SICK_NONVOMITABLE) === 0
            && rn2(100) < acurr(player, A_CON)) {
            await You("have recovered from your illness.");
            if (fns.make_sick) await fns.make_sick(player, 0, null, false, 0xFF);
            await exercise(player, A_CON, false);
            // C ref: adjattrib(A_CON, -1, 1) — lose 1 CON
            if (player.attributes && player.attributes[A_CON] > 3)
                player.attributes[A_CON] -= 1;
            break;
        }
        // Fatal illness
        await pline("You die from your illness.");
        done_timeout('illness', player.usick_cause || 'illness');
        player.usick_type = 0;
        break;

    case FAST:
        // C ref: if (!Very_fast) You_feel("yourself slow down%s.");
        if (!player.veryFast)
            await You_feel("yourself slow down%s.",
                     player.fast ? " a bit" : "");
        break;

    case CONFUSION:
        // C ref: set_itimeout(&HConfusion, 1L); make_confused(0L, TRUE);
        if (entry) entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 1;
        if (fns.make_confused) await fns.make_confused(player, 0, true);
        break;

    case STUNNED:
        // C ref: set_itimeout(&HStun, 1L); make_stunned(0L, TRUE);
        if (entry) entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 1;
        if (fns.make_stunned) await fns.make_stunned(player, 0, true);
        break;

    case BLINDED:
        // C ref: set_itimeout(&HBlinded, 1L); make_blinded(0L, TRUE);
        if (entry) entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 1;
        if (fns.make_blinded) await fns.make_blinded(player, 0, true);
        break;

    case DEAF:
        if (entry) entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 1;
        if (fns.make_deaf) await fns.make_deaf(player, 0, true);
        player._botl = true;
        break;

    case INVIS:
        // C ref: newsym(); "You are no longer invisible."
        if (!player.blind) {
            const seeInvisEntry = player.uprops[SEE_INVIS];
            const canSeeInvis = seeInvisEntry && (seeInvisEntry.intrinsic || seeInvisEntry.extrinsic);
            await You(!canSeeInvis
                ? "are no longer invisible."
                : "can no longer see through yourself.");
        }
        break;

    case SEE_INVIS:
        // C ref: set_mimic_blocking(); see_monsters(); newsym();
        break;

    case HALLUC:
        // C ref: set_itimeout(&HHallucination, 1L); make_hallucinated(0L, TRUE, 0L);
        if (entry) entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 1;
        if (fns.make_hallucinated) await fns.make_hallucinated(player, 0, true, 0);
        break;

    case SLEEPING:
        // C ref: if (Sleepy) { fall_asleep(); incr_itimeout(); }
        break;

    case LEVITATION:
        // C ref: float_down(I_SPECIAL | TIMEOUT, 0L);
        break;

    case FLYING:
        // C ref: if (was_flying && !Flying) { "You land."; spoteffects(TRUE); }
        player._botl = true;
        break;

    case STRANGLED:
        // C ref: done_timeout(DIED, STRANGLED) — strangulation death
        await pline("You suffocate.");
        done_timeout('strangled', 'strangulation');
        break;

    case FUMBLING:
        // C ref: if (u.umoved && !(Levitation || Flying)) slip_or_trip();
        //     HFumbling &= ~FROMOUTSIDE;
        //     if (Fumbling) incr_itimeout(&HFumbling, rnd(20));
        if (entry) entry.intrinsic &= ~FROMOUTSIDE;
        if (entry && (entry.intrinsic || entry.extrinsic)) {
            // Still fumbling from another source — restart timer
            const e = player.ensureUProp(FUMBLING);
            e.intrinsic = (e.intrinsic & ~TIMEOUT) | rnd(20);
        }
        break;

    case WOUNDED_LEGS:
    {
        // C ref: timeout.c case WOUNDED_LEGS — heal_legs(0); stop_occupation();
        const { heal_legs } = await import('./do.js');
        await heal_legs(0, player);
        const game = context.game || _gstate;
        if (game && typeof game.stop_occupation === 'function') {
            await game.stop_occupation();
        } else if (game && typeof game.stopOccupation === 'function') {
            await game.stopOccupation();
        }
        break;
    }

    case GLIB:
        if (fns.make_glib) fns.make_glib(player, 0, false);
        break;

    case DETECT_MONSTERS:
        // C ref: see_monsters();
        break;

    case DISPLACED:
        // C ref: if (!Displaced) toggle_displacement(0, 0L, FALSE);
        break;

    case PASSES_WALLS:
        await pline("You're back to your normal self again.");
        break;

    case MAGICAL_BREATHING:
        // C ref: if (!Breathless) { message about coughing }
        break;

    // Other props: timeout expiry is passive
    default:
        break;
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
        for (let i = (MAX_EGG_HATCH_TIME - 50) + 1; i <= MAX_EGG_HATCH_TIME; i++) {
            if (rnd(i) > 150) {
                timeout = i;
                break;
            }
        }
        if (!timeout) timeout = MAX_EGG_HATCH_TIME;
    }
    const turns = start_timer(timeout + 1, TIMER_KIND.SHORT, TIMER_FUNC.HATCH_EGG, egg);
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

export async function hatch_egg(egg) {
    if (!egg || egg._deadHatching) return;
    egg._deadHatching = true;
    const map = _timeoutContext.map;
    const player = _timeoutContext.player;
    let canHatch = false;
    let x = 0;
    let y = 0;
    // C ref: timeout.c hatch_egg() uses get_obj_location() with locflags=0.
    // Only INVENT/FLOOR/MINVENT are eligible; otherwise it returns early
    // without consuming hatchcount RNG.
    switch (egg.where) {
    case 'OBJ_INVENT':
    case 'invent':
    case 3:
        if (player && Number.isInteger(player.x) && Number.isInteger(player.y)) {
            x = player.x;
            y = player.y;
            canHatch = true;
        }
        break;
    case 'OBJ_FLOOR':
    case 'floor':
    case 1:
        if (Number.isInteger(egg.ox) && Number.isInteger(egg.oy)) {
            x = egg.ox;
            y = egg.oy;
            canHatch = true;
        }
        break;
    case 'OBJ_MINVENT':
    case 'minvent':
    case 4:
        if (egg.ocarry && Number(egg.ocarry.mx) > 0) {
            x = Number(egg.ocarry.mx);
            y = Number(egg.ocarry.my);
            canHatch = true;
        }
        break;
    default:
        break;
    }
    if (!canHatch) return;

    // C ref: timeout.c hatch_egg() performs hatchcount = rnd((int) egg->quan)
    // only after location eligibility succeeds.
    const qty = Math.max(1, Math.trunc(Number(egg.quan) || 1));
    const hatchcount = rnd(qty);
    const mnum = big_to_little(Number.isInteger(egg.corpsenm) ? egg.corpsenm : -1);
    const mdat = Number.isInteger(mnum) && mnum >= 0 ? mons[mnum] : null;
    if (map && mdat) {
        const { makemon } = await import('./makemon.js');
        const depth = Number(player?.dungeonLevel || 1);
        let hatched = 0;
        for (let i = 0; i < hatchcount; i++) {
            const cc = { x, y };
            if (!enexto(cc, x, y, mdat, map, player)) break;
            if (!makemon(mnum, cc.x, cc.y, NO_MINVENT | MM_NOMSG, depth, map)) break;
            hatched++;
        }
        if (hatched > 0 && Number.isInteger(egg.quan)) {
            egg.quan = Math.max(0, egg.quan - hatched);
            if (egg.quan <= 0) {
                if (map?.objects?.includes(egg)) {
                    if (typeof map.removeObject === 'function') {
                        map.removeObject(egg);
                    } else {
                        const idx = map.objects.indexOf(egg);
                        if (idx >= 0) map.objects.splice(idx, 1);
                    }
                } else if (player?.inventory?.includes(egg) && typeof player.removeFromInventory === 'function') {
                    player.removeFromInventory(egg);
                }
            }
        }
    }
    if (typeof pline === 'function') {
        if (typeof egg.corpsenm === 'number' && egg.corpsenm >= 0) {
            await pline(`A creature hatches from a nearby egg.`);
        }
    }
}

export function attach_fig_transform_timeout(figurine) {
    if (!figurine) return null;
    return start_timer(rnd(9000) + 200, TIMER_KIND.SHORT, TIMER_FUNC.FIGURINE_TRANSFORM, figurine);
}

async function fig_transform(figurine) {
    if (!figurine || !figurine.corpsenm) {
        return;
    }
    if (!figurine._figTransformMessageIssued) {
        await pline('Your %s transforms!', figurine.oname || 'figurine');
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
    if (!_alreadyLit) {
        const loc = _resolveBurnObjectLocation(obj);
        if (loc) {
            new_light_source(loc.x, loc.y, _burnLightRadius(obj), LS_OBJECT, obj);
        }
    }
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
    del_light_source(LS_OBJECT, obj);
    const removed = stop_timer(TIMER_FUNC.BURN_OBJECT, obj);
    if (obj._burnTimer) delete obj._burnTimer;
    if (removed && timerAttached) {
        cleanup_burn(obj);
    }
    obj.lamplit = false;
    return removed;
}

function _burnLightRadius(obj) {
    if (!obj) return 3;
    if (obj.otyp === POT_OIL) return 1;
    if (obj.otyp === TALLOW_CANDLE || obj.otyp === WAX_CANDLE || obj.otyp === CANDELABRUM_OF_INVOCATION) {
        return candle_light_range(obj);
    }
    return 3;
}

function _resolveBurnObjectLocation(obj, depth = 0) {
    if (!obj || depth > 8) return null;
    if (obj.where === OBJ_INVENT || (!Number.isFinite(obj.where) && !Number.isFinite(obj.ox) && !Number.isFinite(obj.oy))) {
        const p = _timeoutContext.player;
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return { x: p.x, y: p.y };
    }
    if (obj.where === OBJ_FLOOR && Number.isFinite(obj.ox) && Number.isFinite(obj.oy)) {
        return { x: obj.ox, y: obj.oy };
    }
    if (obj.where === OBJ_CONTAINED && obj.ocontainer) {
        return _resolveBurnObjectLocation(obj.ocontainer, depth + 1);
    }
    if (Number.isFinite(obj.ox) && Number.isFinite(obj.oy)) {
        return { x: obj.ox, y: obj.oy };
    }
    const p = _timeoutContext.player;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return { x: p.x, y: p.y };
    return null;
}

export function do_storms() {
    // Storm behavior is not yet simulated.
    return;
}

// C ref: timeout.c — petrification countdown messages
// stoned_texts[0..4] indexed by SIZE - i where i = (Stoned & TIMEOUT)
const stoned_texts = [
    "You are slowing down.",            // i=5
    "Your limbs are stiffening.",       // i=4
    "Your limbs have turned to stone.", // i=3
    "You have turned to stone.",        // i=2
    "You are a statue.",                // i=1
];
export async function stoned_dialogue(player) {
    const p = player || _timeoutContext.player;
    if (!p) return;
    const i = p.getPropTimeout(STONED);
    if (i > 0 && i <= stoned_texts.length) {
        let msg = stoned_texts[stoned_texts.length - i];
        // C: nolimbs(ptr) — M1_NOLIMBS flag; use "extremities" instead of "limbs"
        const M1_NOLIMBS = 0x00040000;
        if (p.data && (p.data.mflags1 & M1_NOLIMBS) && msg.includes('limbs'))
            msg = msg.replace('limbs', 'extremities');
        await pline(msg);
    }
    // C: case 5 — HFast = 0L (lose intrinsic speed)
    if (i === 5 && p.uprops?.[FAST]) {
        p.uprops[FAST].intrinsic &= ~TIMEOUT;
    }
    // C: case 4 — limbs stiffening: stop_occupation() + nomul(0) — skipped (complex)
    // C: case 3 — limbs turned to stone: nomul(-3) — skipped (complex)
    await exercise(p, A_DEX, false);
}

// C ref: timeout.c — vomiting countdown messages
// Note: switch is on (v-1) because dialogue fires before the decrement.
const vomiting_texts = [
    "are feeling mildly nauseated.", // v-1=14 (v=15)
    "feel slightly confused.",       // v-1=11 (v=12)
    "can't seem to think straight.", // v-1=8  (v=9)
    "feel incredibly sick.",         // v-1=5  (v=6)
    "are about to vomit.",           // v-1=2  (v=3)
];
export async function vomiting_dialogue(player) {
    const p = player || _timeoutContext.player;
    if (!p) return;
    const v = p.getPropTimeout(VOMITING);
    const fns = await getStatusFns();
    switch (v - 1) {
    case 14:
        await You(vomiting_texts[0]);
        break;
    case 11: {
        let txt = vomiting_texts[1];
        if (p.getPropTimeout(CONFUSION))
            txt = txt.replace(' confused', ' more confused');
        await You(txt);
        break;
    }
    case 9:
        // C: make_confused — increases confusion
        if (fns.make_confused)
            await fns.make_confused(p, (p.getPropTimeout(CONFUSION) || 0) + rnd(4) + rnd(4), false);
        break;
    case 8:
        await You(vomiting_texts[2]);
        break;
    case 6:
        // C: make_stunned + FALLTHROUGH to case 9 (make_confused)
        if (fns.make_stunned)
            await fns.make_stunned(p, (p.getPropTimeout(STUNNED) || 0) + rnd(4) + rnd(4), false);
        if (fns.make_confused)
            await fns.make_confused(p, (p.getPropTimeout(CONFUSION) || 0) + rnd(4) + rnd(4), false);
        break;
    case 5:
        await You(vomiting_texts[3]);
        break;
    case 2: {
        let txt = vomiting_texts[4];
        // C: cantvomit(ptr) — plants, fungi, etc. (M2_NOLIMBS or sessile)
        // Simplified: check mlet for plant/fungus class
        const mlet = p.data?.mlet;
        if (mlet === 'F' || mlet === 'P')  // F=fungus, P=plant
            txt = "gag uncontrollably.";
        else if (p.getPropTimeout(HALLUC))
            txt = "are about to hurl!";
        await You(txt);
        break;
    }
    case 0:
        // C: vomit() — actual vomiting (complex, handled by expiry callback)
        break;
    default:
        break;
    }
    await exercise(p, A_CON, false);
}

// Autotranslated from timeout.c:267
export async function sleep_dialogue(player) {
    const p = player || _timeoutContext.player;
    if (!p) return;
    const i = p.getPropTimeout(SLEEPING);
    if (i === 4) await You("yawn.");
}

// C ref: timeout.c — strangulation countdown messages
const choke_texts = [
    "You find it hard to breathe.",  // i=5
    "You're gasping for air.",        // i=4
    "You can no longer breathe.",     // i=3
    "You're turning %s.",             // i=2 — %s = blue
    "You suffocate.",                 // i=1
];
const choke_texts2 = [
    "Your %s is becoming constricted.", // i=5 — %s = neck
    "Your blood is having trouble reaching your brain.", // i=4
    "The pressure on your %s increases.", // i=3 — %s = neck
    "Your consciousness is fading.",  // i=2
    "You suffocate.",                 // i=1
];
export async function choke_dialogue(player) {
    const p = player || _timeoutContext.player;
    if (!p) return;
    const i = p.getPropTimeout(STRANGLED);
    if (i > 0 && i <= choke_texts.length) {
        // C: if (Breathless || !rn2(50)) use choke_texts2 (neck pressure variant)
        // C: Breathless = gaseous/incorporeal monster forms; simplified here
        const breathless = !!(p.data?.mlet === 'E');  // E=elemental (gaseous)
        if (breathless || !rn2(50)) {
            let msg = choke_texts2[choke_texts2.length - i];
            // C: body_part(NECK) → "neck" for humans; "throat" for some forms
            if (msg.includes('%s')) msg = msg.replace(/%s/g, 'neck');
            await pline(msg);
        } else {
            const str = choke_texts[choke_texts.length - i];
            if (str.includes('%s')) {
                // C: hcolor(NH_BLUE) → "blue" normally, random hallu color
                const color = p.getPropTimeout(HALLUC) ? 'indigo' : 'blue';
                await pline(str.replace('%s', color));
            } else {
                await pline(str);
            }
        }
    }
    await exercise(p, A_STR, false);
}

// C ref: timeout.c — sickness countdown messages
const sickness_texts = [
    "Your illness feels worse.",   // i=3
    "Your illness is severe.",     // i=2
    "You are at Death's door.",    // i=1
];
export async function sickness_dialogue(player) {
    const p = player || _timeoutContext.player;
    if (!p) return;
    const j = p.getPropTimeout(SICK);
    const i = Math.trunc(j / 2);
    if (i > 0 && i <= sickness_texts.length && (j % 2) !== 0) {
        let msg = sickness_texts[sickness_texts.length - i];
        // C: food poisoning (not SICK_NONVOMITABLE) uses "sickness" not "illness"
        if ((p.usick_type & SICK_NONVOMITABLE) === 0)
            msg = msg.replace('illness', 'sickness');
        // C: Hallucination adds "She is inviting you in." etc.
        await pline(msg);
    }
    await exercise(p, A_CON, false);
}

// C ref: timeout.c — levitation countdown messages
const levi_texts = [
    "You float slightly lower.",          // i=2
    "You wobble unsteadily %s the %s.",   // i=1
];
export async function levitation_dialogue(player, map) {
    const p = player || _timeoutContext.player;
    const m = map || _timeoutContext.map;
    if (!p) return;
    // C: ELevitation (extrinsic) → no countdown messages
    if (p.uprops?.[LEVITATION]?.extrinsic) return;
    // C: skip in inaccessible cells (walls etc) or over pool/lava
    // ACCESSIBLE(typ): typ >= DOOR (8 in C's rm.h)
    const cellTyp = m?.locations?.[p.x]?.[p.y]?.typ ?? 0;
    const poolLavaTypes = new Set([22, 23, 24, 25]);  // POOL, MOAT, WATER, LAVAPOOL approx
    if (m && !ACCESSIBLE(cellTyp) && !poolLavaTypes.has(cellTyp)) return;
    const t = p.getPropTimeout(LEVITATION);
    // C: fires on odd turns of (HLevitation-1)/2
    const i = Math.trunc((t - 1) / 2);
    if ((t % 2 !== 0) && i > 0 && i <= levi_texts.length) {
        const s = levi_texts[levi_texts.length - i];
        if (s.includes('%s')) {
            const danger = m && poolLavaTypes.has(m.locations?.[p.x]?.[p.y]?.typ ?? 0);
            // "over" vs "in", "surface()" vs "air"
            const prep = danger ? "over" : "in";
            const loc = danger ? "the water" : "the air";
            await pline(s.replace('%s', prep).replace('%s', loc));
        } else {
            await pline(s);
        }
    }
}

// C ref: timeout.c — slime transformation countdown messages
const slime_texts = [
    "You are turning a little %s.",   // i=4 (t=9): %s=green
    "Your limbs are getting oozy.",   // i=3 (t=7)
    "Your skin begins to peel away.", // i=2 (t=5)
    "You are turning into %s.",       // i=1 (t=3): %s=a green slime
    "You have become %s.",            // i=0 (t=1): %s=a green slime
];
export async function slime_dialogue(player) {
    const p = player || _timeoutContext.player;
    if (!p) return;
    const t = p.getPropTimeout(SLIMED);
    const i = Math.trunc(t / 2);
    if ((t % 2) !== 0 && i >= 0 && i < slime_texts.length) {
        let msg = slime_texts[slime_texts.length - i - 1];
        // C: nolimbs(ptr) — M1_NOLIMBS flag
        const M1_NOLIMBS = 0x00040000;
        if (p.data && (p.data.mflags1 & M1_NOLIMBS) && msg.includes('limbs'))
            msg = msg.replace('limbs', 'extremities');
        if (msg.includes('%s')) {
            if (i === 4) {
                // "turning a little green" — only if not blind
                if (!p.getPropTimeout(BLINDED))
                    await pline(msg.replace('%s', 'green'));
            } else {
                // "turning into a green slime" or "have become a green slime"
                // C: an(rndmonnam()) when hallucinating; "a green slime" normally
                const monname = 'green slime';  // hallucination variant skipped (no rndmonnam import)
                // simple "a"/"an" article
                const article = /^[aeiou]/i.test(monname) ? 'an' : 'a';
                await pline(msg.replace('%s', `${article} ${monname}`));
            }
        } else {
            await pline(msg);
        }
    }
    // C: case 3 (i=3, t=7): HFast = 0L — lose intrinsic speed when limbs go oozy
    if (i === 3 && p.uprops?.[FAST]) {
        p.uprops[FAST].intrinsic &= ~TIMEOUT;
    }
}
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

export async function printQueue(win, base) {
    return await print_queue(win, base);
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

// Autotranslated from timeout.c:1192
export function learn_egg_type(mnum, game) {
  mnum = little_to_big(mnum);
  game.mvitals[mnum].mvflags |= MV_KNOWS_EGG;
  update_inventory();
}

// Autotranslated from timeout.c:2575
export function mon_is_local(mon, game) {
  let curr;
  for (curr = game.migrating_mons; curr; curr = curr.nmon) {
    if (curr === mon) return false;
  }
  for (curr = game.mydogs; curr; curr = curr.nmon) {
    if (curr === mon) return false;
  }
  return true;
}

// Autotranslated from timeout.c:2594
export function timer_is_local(timer) {
  switch (timer.kind) {
    case TIMER_LEVEL:
      return true;
    case TIMER_GLOBAL:
      return false;
    case TIMER_OBJECT:
      return obj_is_local(timer.arg.a_obj);
    case TIMER_MONSTER:
      return mon_is_local(timer.arg.a_monst);
  }
  throw new Error('timer_is_local');
  return false;
}
