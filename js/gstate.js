// gstate.js — global game state reference and execution/origin guard state.
// C uses global `u`, `level`, `flags`, `svm` — a single well-known state reference.
// JS modules read gstate.game.player, gstate.game.map, gstate.game.display, etc.

import { getEnv, writeStderr } from './runtime_env.js';

export let game = null;
export function setGame(g) { game = g; }

const stateByGame = new WeakMap();

function modeValue() {
    const raw = String(getEnv('WEBHACK_STRICT_SINGLE_THREAD', '') || '').trim().toLowerCase();
    if (!raw || raw === '0' || raw === 'off' || raw === 'false') return 'off';
    if (raw === 'warn' || raw === '2') return 'warn';
    return 'strict';
}

function shouldWarn(mode) {
    return mode === 'warn' || mode === 'strict';
}

function shouldThrow(mode) {
    return mode === 'strict';
}

function gameState(g) {
    if (!g || typeof g !== 'object') return null;
    let st = stateByGame.get(g);
    if (!st) {
        st = {
            seq: 0,
            activeToken: null,
            depth: 0,
            activeOrigin: null,
            originSeq: 0,
        };
        stateByGame.set(g, st);
    }
    return st;
}

function report(g, mode, kind, details = {}) {
    const payload = { kind, ...details };
    if (typeof g?.emitDiagnosticEvent === 'function') {
        g.emitDiagnosticEvent('synclock.guard', payload);
    }
    if (shouldWarn(mode)) {
        writeStderr(`[SYNCLOCK] ${kind} ${JSON.stringify(payload)}\n`);
    }
    if (shouldThrow(mode)) {
        throw new Error(`SYNCLOCK ${kind}`);
    }
}

export function beginCommandExec(g, details = {}) {
    const mode = modeValue();
    const st = gameState(g);
    if (!st) return null;
    if (st.depth > 0) {
        report(g, mode, 'nested-command', details);
    }
    st.depth += 1;
    st.seq += 1;
    st.activeToken = st.seq;
    if (typeof g?.emitDiagnosticEvent === 'function') {
        g.emitDiagnosticEvent('synclock.command.begin', {
            token: st.activeToken,
            depth: st.depth,
            ...details,
        });
    }
    return st.activeToken;
}

export function endCommandExec(g, token, details = {}) {
    const mode = modeValue();
    const st = gameState(g);
    if (!st) return;
    if (token !== st.activeToken) {
        report(g, mode, 'end-token-mismatch', { expected: st.activeToken, got: token, ...details });
    }
    st.depth = Math.max(0, st.depth - 1);
    if (st.depth === 0) {
        st.activeToken = null;
    }
    if (typeof g?.emitDiagnosticEvent === 'function') {
        g.emitDiagnosticEvent('synclock.command.end', {
            token,
            depth: st.depth,
            ...details,
        });
    }
}

export function getCommandExecState(g) {
    const st = gameState(g);
    if (!st) return { activeToken: null, depth: 0, seq: 0 };
    return {
        activeToken: st.activeToken,
        depth: st.depth,
        seq: st.seq,
    };
}

// New origin registration API used by canonical async origins.
export function beginOriginAwait(g, type) {
    const mode = modeValue();
    const st = gameState(g);
    if (!st) return null;
    if (st.activeOrigin) {
        report(g, mode, 'nested-origin-await', {
            existing: st.activeOrigin,
            attempted: type,
        });
    }
    st.originSeq += 1;
    const token = st.originSeq;
    st.activeOrigin = {
        token,
        type: String(type || 'origin'),
    };
    if (typeof g?.emitDiagnosticEvent === 'function') {
        g.emitDiagnosticEvent('synclock.origin.begin', {
            token,
            type: st.activeOrigin.type,
        });
    }
    return { token, type: st.activeOrigin.type };
}

export function endOriginAwait(g, snapshot) {
    if (!snapshot) return;
    const mode = modeValue();
    const st = gameState(g);
    if (!st) return;
    if (!st.activeOrigin) {
        report(g, mode, 'origin-end-without-active', {
            got: snapshot,
        });
        return;
    }
    if (snapshot.token !== st.activeOrigin.token) {
        report(g, mode, 'origin-token-mismatch', {
            expected: st.activeOrigin,
            got: snapshot,
        });
    }
    if (typeof g?.emitDiagnosticEvent === 'function') {
        g.emitDiagnosticEvent('synclock.origin.end', {
            token: snapshot.token,
            type: snapshot.type,
        });
    }
    st.activeOrigin = null;
}

export function getOriginAwaitState(g) {
    const st = gameState(g);
    if (!st || !st.activeOrigin) return null;
    return {
        token: st.activeOrigin.token,
        type: st.activeOrigin.type,
    };
}
