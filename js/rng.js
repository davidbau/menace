// rng.js -- Random number generation
// Faithful port of rnd.c from the C source.
// Uses ISAAC64 PRNG for exact C compatibility.
// C ref: rnd.c, isaac64.c

import { isaac64_init, isaac64_next_uint64 } from './isaac64.js';
import { getEnv, getEnvObject, envFlag } from './runtime_env.js';

let coreCtx = null; // CORE ISAAC64 context (C rn2)
let dispCtx = null; // DISP ISAAC64 context (C rn2_on_display_rng)
const CORE = 0;
const DISP = 1;

// --- PRNG call logging ---
// When enabled, every rn2/rnd/rnl/d call is logged in the same format
// as the C PRNG logger (003-prng-logging patch).  Enable with enableRngLog(),
// retrieve with getRngLog(), disable with disableRngLog().
//
// Caller context propagation (withTags=true):
// Like C's improved 003 patch, wrapper functions (rnz, rne, rnl, rn1)
// capture the caller's identity once on entry. Internal rn2/rnd calls
// inherit that context rather than showing "rnz" or "rne" as the caller.
// Context is cleared when the outermost RNG function returns.
let rngLog = null;       // null = disabled, Array = enabled
let rngCallCount = 0;
let rngLogWithTags = false;  // when true, log includes caller info
let rngLogWithParent = false; // when true, include parent/grandparent in tag
let rngLogEventTags = false; // when true, add caller tags to ^event log entries
let rngCallerTag = null;     // current caller annotation (propagated through wrappers)
let rngDepth = 0;            // nesting depth for context propagation
let rngTagOverride = null;   // explicit caller tag override for hotspot paths
const rngTagCache = new Map();
const rngEventTagCache = new Map();

export function enableRngLog(withTags = true) {
    const tagsPref = getEnv('RNG_LOG_TAGS');
    if (tagsPref === '0') withTags = false;
    else if (tagsPref === '1') withTags = true;
    const parentPref = getEnv('RNG_LOG_PARENT');
    const eventTagPref = getEnv('RNG_LOG_EVENT_TAGS');
    rngLog = [];
    rngCallCount = 0;
    rngLogWithTags = withTags;
    // Default-on parent context whenever caller tags are enabled; opt out with RNG_LOG_PARENT=0.
    rngLogWithParent = !!withTags && parentPref !== '0';
    // Event caller tags are lower-value and high-overhead in monster-heavy replays.
    // Keep disabled by default; opt in with RNG_LOG_EVENT_TAGS=1.
    rngLogEventTags = !!withTags && eventTagPref === '1';
    rngCallerTag = null;
    rngDepth = 0;
    rngTagCache.clear();
    rngEventTagCache.clear();
}

export function getRngLog() {
    return rngLog;
}

export function pushRngLogEntry(entry) {
    if (!rngLog) return;
    if (typeof entry !== 'string' || entry.length === 0) return;
    // For event entries (^...), append caller context when tag logging is enabled.
    if (rngLogWithTags && rngLogEventTags && entry[0] === '^') {
        const holder = {};
        const prevLimit = Error.stackTraceLimit;
        Error.stackTraceLimit = 5;
        Error.captureStackTrace(holder, pushRngLogEntry);
        const stack = holder.stack || '';
        Error.stackTraceLimit = prevLimit;
        const lines = stack.split('\n');
        const callerLine = lines[1] || '';
        const parentLine = lines[2] || '';
        const cacheKey = `${callerLine}\n${parentLine}`;
        let callers = rngEventTagCache.get(cacheKey);
        if (callers === undefined) {
            const callerTag = parseStackFrameTag(callerLine);
            const parentTag = parseStackFrameTag(parentLine);
            callers = callerTag && parentTag
                ? `${callerTag} <= ${parentTag}`
                : (callerTag || parentTag || null);
            rngEventTagCache.set(cacheKey, callers);
        }
        if (callers) {
            rngLog.push(`${entry} @ ${callers}`);
            return;
        }
    }
    rngLog.push(entry);
}

export function disableRngLog() {
    rngLog = null;
    rngLogWithParent = false;
    rngLogEventTags = false;
    rngCallerTag = null;
    rngDepth = 0;
    rngTagOverride = null;
    rngTagCache.clear();
    rngEventTagCache.clear();
}

// C ref: rnd.c:37 rng_log_init()
export function rng_log_init(withTags = true) {
    enableRngLog(withTags);
}

// C ref: rnd.c:48 rng_log_set_caller()
export function rng_log_set_caller(tag) {
    rngTagOverride = (typeof tag === 'string' && tag.length > 0) ? tag : null;
}

// C ref: rnd.c:56 rng_log_get_call_count()
export function rng_log_get_call_count() {
    return getRngCallCount();
}

// C ref: rnd.c:62 rng_log_write()
export function rng_log_write(entry) {
    pushRngLogEntry(String(entry ?? ''));
}

// C ref: rnd.c:103 midlog_enter()
export function midlog_enter(_name, _file, _line, _func) {
    return;
}

// C ref: rnd.c:114 midlog_exit_int()
export function midlog_exit_int(_name, _result, _file, _line, _func) {
    return;
}

// C ref: rnd.c:127 midlog_exit_void()
export function midlog_exit_void(_name, _file, _line, _func) {
    return;
}

// C ref: rnd.c:140 midlog_exit_ptr()
export function midlog_exit_ptr(_name, _result, _file, _line, _func) {
    return;
}

// Hot-path helper: avoid per-call stack parsing by supplying explicit tag context.
export async function withRngTag(tag, fn) {
    const prev = rngTagOverride;
    rngTagOverride = (typeof tag === 'string' && tag.length > 0) ? tag : null;
    try {
        const out = await fn();
        if (out && typeof out.then === 'function') {
            return out.finally(() => {
                rngTagOverride = prev;
            });
        }
        rngTagOverride = prev;
        return out;
    } catch (err) {
        rngTagOverride = prev;
        throw err;
    }
}

function parseStackFrameTag(line) {
    if (!line || typeof line !== 'string') return null;
    const at = line.indexOf('at ');
    if (at < 0) return null;
    const frame = line.slice(at + 3).trim();
    if (!frame) return null;

    let fn = null;
    let loc = frame;
    const lparen = frame.indexOf(' (');
    if (lparen > 0 && frame.endsWith(')')) {
        fn = frame.slice(0, lparen).trim() || null;
        loc = frame.slice(lparen + 2, -1);
    }
    const slash = loc.lastIndexOf('/');
    const tail = slash >= 0 ? loc.slice(slash + 1) : loc;
    const colon2 = tail.lastIndexOf(':');
    if (colon2 <= 0) return null;
    const colon1 = tail.lastIndexOf(':', colon2 - 1);
    if (colon1 <= 0) return null;
    const file = tail.slice(0, colon1);
    const lineNo = tail.slice(colon1 + 1, colon2);
    if (!file || !lineNo) return null;
    return fn ? `${fn}(${file}:${lineNo})` : `${file}:${lineNo}`;
}

// Capture caller context on first entry into an RNG function.
// Wrapper functions (rnz, rne, rnl, rn1) and primitives (rn2, rnd)
// all call this. Only the outermost call (depth 0→1) captures the
// stack trace; inner calls inherit the existing tag.
function enterRng() {
    rngDepth++;
    if (rngDepth === 1 && rngLogWithTags) {
        if (rngTagOverride) {
            rngCallerTag = rngTagOverride;
            return;
        }
        const holder = {};
        const prevLimit = Error.stackTraceLimit;
        Error.stackTraceLimit = rngLogWithParent ? 6 : 4;
        Error.captureStackTrace(holder, enterRng);
        const stack = holder.stack || '';
        Error.stackTraceLimit = prevLimit;
        const lines = stack.split('\n');
        // [0]=Error, [1]=enterRng, [2]=rn2/rnz/etc, [3]=caller
        const parentLine = lines[4] || '';
        const grandLine = lines[5] || '';
        const callerLine = lines[3] || '';
        const cacheKey = rngLogWithParent
            ? `${callerLine}\n${parentLine}\n${grandLine}`
            : callerLine;
        if (rngTagCache.has(cacheKey)) {
            rngCallerTag = rngTagCache.get(cacheKey);
            return;
        }

        const callerTag = parseStackFrameTag(callerLine);
        if (!callerTag) {
            rngCallerTag = null;
            rngTagCache.set(cacheKey, null);
            return;
        }
        let fullTag = callerTag;
        if (rngLogWithParent) {
            const parentTag = parseStackFrameTag(parentLine);
            if (parentTag) {
                fullTag = `${fullTag} <= ${parentTag}`;
                const grandTag = parseStackFrameTag(grandLine);
                if (grandTag) {
                    fullTag = `${fullTag} <= ${grandTag}`;
                }
            }
        }
        rngCallerTag = fullTag;
        rngTagCache.set(cacheKey, fullTag);
    }
}

// Clear caller context when the outermost RNG function returns.
function exitRng() {
    if (--rngDepth === 0) {
        rngCallerTag = null;
    }
}

function logRng(func, args, result) {
    if (!rngLog) return;
    rngCallCount++;
    const tag = rngCallerTag ? ` @ ${rngCallerTag}` : '';
    rngLog.push(`${rngCallCount} ${func}(${args})=${result}${tag}`);
}

let _currentSeed = 0;

function cloneIsaacCtx(state) {
    if (!state) return null;
    return {
        a: state.a,
        b: state.b,
        c: state.c,
        n: state.n,
        r: state.r.slice(),
        m: state.m.slice(),
    };
}

// Get the current RNG seed
export function getRngSeed() {
    return _currentSeed;
}

// Initialize the PRNG with a seed (unsigned long, up to 64 bits)
// C ref: rnd.c init_isaac64() -- converts seed to little-endian bytes
export function initRng(seed) {
    _currentSeed = seed;
    // Convert seed to BigInt, then to 8 little-endian bytes
    // C ref: rnd.c init_isaac64() -- sizeof(unsigned long) = 8 on 64-bit Linux
    let s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number(s & 0xFFn);
        s >>= 8n;
    }
    coreCtx = isaac64_init(bytes);
    dispCtx = isaac64_init(bytes);
    // Reset log counter on re-init (like C's init_random)
    if (rngLog) {
        rngLog.length = 0;
        rngCallCount = 0;
    }
}

// C ref: rnd.c:178 whichrng()
export function whichrng(fn) {
    if (fn === rn2) return CORE;
    if (fn === rn2_on_display_rng) return DISP;
    return -1;
}

// C ref: rnd.c:189 init_isaac64(seed, fn)
export function init_isaac64(seed, fn = rn2) {
    // If contexts are uninitialized, seed both streams first for deterministic startup.
    if (!coreCtx || !dispCtx) {
        initRng(seed);
        return;
    }
    const s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    const bytes = new Uint8Array(8);
    let tmp = s;
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number(tmp & 0xFFn);
        tmp >>= 8n;
    }
    const which = whichrng(fn);
    if (which === DISP) {
        dispCtx = isaac64_init(bytes);
    } else {
        coreCtx = isaac64_init(bytes);
    }
}

// C ref: rnd.c:418 set_random(seed, fn)
export function set_random(seed, fn = rn2) {
    init_isaac64(seed, fn);
}

function sys_random_seed() {
    const forced = getEnv('NETHACK_SEED');
    if (forced != null && forced !== '') {
        const parsed = Number.parseInt(forced, 10);
        if (Number.isFinite(parsed)) return parsed >>> 0;
    }
    return (Date.now() >>> 0);
}

// C ref: rnd.c:465 init_random(fn)
export function init_random(fn = rn2) {
    set_random(sys_random_seed(), fn);
}

// C ref: rnd.c:472 reseed_random(fn)
export function reseed_random(fn = rn2) {
    // JS/browser runtime does not model has_strong_rngseed; keep deterministic
    // behavior by sharing init path.
    init_random(fn);
}

// Raw 64-bit value, modulo x -- matches C's RND(x) macro
// C ref: rnd.c RND() = isaac64_next_uint64() % x
function RND(x) {
    const raw = isaac64_next_uint64(coreCtx);
    return Number(raw % BigInt(x));
}

function DRND(x) {
    const raw = isaac64_next_uint64(dispCtx);
    return Number(raw % BigInt(x));
}

// 0 <= rn2(x) < x
// C ref: rnd.c:93-107
export function rn2(x) {
    enterRng();
    if (x <= 0) { exitRng(); return 0; }

    // Debug Lua RNG calls
    if (envFlag('DEBUG_LUA_RNG') && x >= 1000 && x <= 1040) {
        const stack = new Error().stack;
        console.log(`\n=== rn2(${x}) called (Lua RNG) ===`);
        console.log(`Stack:\n${stack}`);
    }

    const result = RND(x);
    logRng('rn2', x, result);
    exitRng();
    return result;
}

// 0 <= rn2_on_display_rng(x) < x
// C ref: rnd.c rn2_on_display_rng() -- separate stream for display-only randomness.
export function rn2_on_display_rng(x) {
    if (x <= 0) return 0;
    const result = DRND(x);
    const processEnv = getEnvObject();
    const dispLogEnabled = processEnv?.RNG_LOG_DISP === '1';
    if (rngLog && dispLogEnabled) {
        const tag = rngCallerTag ? ` @ ${rngCallerTag}` : '';
        rngLog.push(`~drn2(${x})=${result}${tag}`);
    }
    return result;
}

// 1 <= rnd_on_display_rng(x) <= x
// C ref: rnd.c drnd() helper semantics.
export function rnd_on_display_rng(x) {
    if (x <= 0) return 1;
    return rn2_on_display_rng(x) + 1;
}

// 1 <= rnd(x) <= x
// C ref: rnd.c:153-165
export function rnd(x) {
    enterRng();
    if (x <= 0) { exitRng(); return 1; }
    const result = RND(x) + 1;
    logRng('rnd', x, result);
    exitRng();
    return result;
}

// rn1(x, y) = rn2(x) + y -- random in [y, y+x-1]
// C ref: hack.h macro -- NOT logged separately (rn2 inside is logged)
export function rn1(x, y) {
    enterRng();
    const result = rn2(x) + y;
    exitRng();
    return result;
}

// rnl(x) - luck-adjusted random, good luck approaches 0
// C ref: rnd.c:109-151
export function rnl(x, luck = 0) {
    enterRng();
    if (x <= 0) { exitRng(); return 0; }
    let adjustment = luck;
    if (x <= 15) {
        adjustment = Math.floor((Math.abs(adjustment) + 1) / 3) * Math.sign(adjustment);
    }
    let i = RND(x);
    // C rnl() consumes this gate via rn2(), which the C harness logs as
    // a separate rn2 entry. Use rn2() here to match.
    if (adjustment && rn2(37 + Math.abs(adjustment))) {
        i -= adjustment;
        if (i < 0) i = 0;
        else if (i >= x) i = x - 1;
    }
    logRng('rnl', x, i);
    exitRng();
    return i;
}

// d(n, x) = NdX dice roll = n + sum of n random calls
// When called from Lua code (themerms.js), matches Lua's d() implementation
// which uses math.random() that is replaced with nh.random()
// C ref: dat/nhlib.lua d() uses math.random(1, faces), replaced with nh.random(1, faces)
// C ref: nhlua.c nhl_random(1, faces) = 1 + rn2(faces), logs rn2() call
export function d(n, x) {
    // Lua's d(): for i=1,dice do sum = sum + math.random(1, faces) end
    // math.random is replaced with nh.random in C
    // nh.random(1, x) = 1 + rn2(x), logs rn2(x)
    // Match C's logging by calling rn2(x) + 1 directly
    let tmp = 0;
    for (let i = 0; i < n; i++) {
        tmp += 1 + rn2(x);  // Match nh.random(1, x) = 1 + rn2(x)
    }
    return tmp;
}

// C ref: rnd.c d() — C-style d(n,x) that uses RND directly.
// Unlike Lua's d() which calls rn2() per die (logged individually),
// C's rnd.c d() calls RND() per die (not logged individually) and logs
// the result as a composite d(n,x)=result entry.
// Use this for C code paths (e.g. newmonhp), not for Lua code paths.
export function c_d(n, x) {
    enterRng();
    let tmp = n;
    for (let i = 0; i < n; i++) {
        tmp += RND(x);
    }
    logRng('d', `${n},${x}`, tmp);
    exitRng();
    return tmp;
}

// Advance ISAAC state without emitting a logged RNG entry.
// Used only for narrow parity fixes when C consumes raw PRNG output
// through non-logged paths between logged rn2/rnd calls.
export function advanceRngRaw(count = 1) {
    if (!coreCtx) return;
    const n = Math.max(0, Number.isInteger(count) ? count : 0);
    const processEnv = getEnvObject();
    const rawAdvanceLogEnabled = processEnv?.WEBHACK_LOG_RAW_ADVANCES === '1';
    if (rngLog && rawAdvanceLogEnabled) {
        let tag = '';
        if (rngLogWithTags) {
            const stack = new Error().stack;
            const lines = stack.split('\n');
            const callerLine = lines[2] || '';
            const m = callerLine.match(/at (?:(\S+) \()?.*?([^/\s]+\.js):(\d+)/);
            if (m) {
                tag = ` @ ${m[1] ? `${m[1]}(${m[2]}:${m[3]})` : `${m[2]}:${m[3]}`}`;
            }
        }
        rngLog.push(`~advanceRngRaw(${n})${tag}`);
    }
    for (let i = 0; i < n; i++) {
        isaac64_next_uint64(coreCtx);
    }
}

// C ref: rnd.c rnz() -- randomized scaling
// C logs rnz summary via explicit rng_log_write; internal rn2 calls are
// suppressed by RNGLOG_IN_RND_C. Internal rne(4) IS logged (explicit log).
export function rnz(i) {
    enterRng();
    let x = i;
    let tmp = 1000;
    tmp += rn2(1000);
    tmp *= rne(4);
    if (rn2(2)) {
        x = Math.floor(x * tmp / 1000);
    } else {
        x = Math.floor(x * 1000 / tmp);
    }
    logRng('rnz', i, x);
    exitRng();
    return x;
}

// C ref: rnd.c rne() -- 1 <= rne(x) <= max(u.ulevel/3, 5)
// During mklev at level 1, u.ulevel = 1, so utmp = 5
// C logs rne summary via explicit rng_log_write; internal rn2 calls are
// suppressed by RNGLOG_IN_RND_C. We match this with rngDepth check in rn2.
export function rne(x) {
    enterRng();
    const utmp = 5; // u.ulevel < 15 → utmp = 5
    let tmp = 1;
    while (tmp < utmp && !rn2(x))
        tmp++;
    logRng('rne', x, tmp);
    exitRng();
    return tmp;
}

// Advance the PRNG by n steps without logging.
// Used to skip past C startup calls (o_init, u_init, etc.) that JS
// doesn't implement yet, aligning the PRNG state for level generation.
export function skipRng(n) {
    for (let i = 0; i < n; i++) {
        isaac64_next_uint64(coreCtx);
    }
}

// Return the raw ISAAC64 context (for save/restore)
export function getRngState() {
    return cloneIsaacCtx(coreCtx);
}

// Restore ISAAC64 context (for save/restore)
export function setRngState(savedCtx) {
    if (!savedCtx) return;
    // Backward-compatible behavior: setting core state also syncs DISP
    // when no explicit DISP state has been provided.
    coreCtx = cloneIsaacCtx(savedCtx);
    dispCtx = cloneIsaacCtx(savedCtx);
}

// Return DISP RNG state (for display-focused diagnostics/save parity)
export function getDispRngState() {
    return cloneIsaacCtx(dispCtx);
}

// Restore DISP RNG state (for display-focused diagnostics/save parity)
export function setDispRngState(savedCtx) {
    if (!savedCtx) return;
    dispCtx = cloneIsaacCtx(savedCtx);
}

// Get the RNG call count (for save/restore)
export function getRngCallCount() {
    return rngCallCount;
}

// Set the RNG call count (for save/restore)
export function setRngCallCount(count) {
    rngCallCount = count;
}

// cf. rnd.c:482 — randomize the given array of numbers in-place (Fisher-Yates)
export function shuffle_int_array(indices) {
    for (let i = indices.length - 1; i > 0; i--) {
        const iswap = rn2(i + 1);
        if (iswap === i) continue;
        const temp = indices[i];
        indices[i] = indices[iswap];
        indices[iswap] = temp;
    }
}

// Initialize with a random seed by default
initRng(Math.floor(Math.random() * 0xFFFFFFFF));
