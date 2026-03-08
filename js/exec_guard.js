// exec_guard.js -- SYNCLOCK phase S0 execution guard (instrumentation-first).
// Tracks command execution epochs and typed suspension boundaries.

import { getEnv, writeStderr } from './runtime_env.js';

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

function gameState(game) {
    if (!game || typeof game !== 'object') return null;
    let st = stateByGame.get(game);
    if (!st) {
        st = {
            seq: 0,
            activeToken: null,
            depth: 0,
        };
        stateByGame.set(game, st);
    }
    return st;
}

function report(game, mode, kind, details = {}) {
    const payload = { kind, ...details };
    if (typeof game?.emitDiagnosticEvent === 'function') {
        game.emitDiagnosticEvent('synclock.guard', payload);
    }
    if (shouldWarn(mode)) {
        writeStderr(`[SYNCLOCK] ${kind} ${JSON.stringify(payload)}\n`);
    }
    if (shouldThrow(mode)) {
        throw new Error(`SYNCLOCK ${kind}`);
    }
}

export function beginCommandExec(game, details = {}) {
    const mode = modeValue();
    const st = gameState(game);
    if (!st) return null;
    if (st.depth > 0) {
        report(game, mode, 'nested-command', details);
    }
    st.depth += 1;
    st.seq += 1;
    st.activeToken = st.seq;
    if (typeof game?.emitDiagnosticEvent === 'function') {
        game.emitDiagnosticEvent('synclock.command.begin', {
            token: st.activeToken,
            depth: st.depth,
            ...details,
        });
    }
    return st.activeToken;
}

export function endCommandExec(game, token, details = {}) {
    const mode = modeValue();
    const st = gameState(game);
    if (!st) return;
    if (token !== st.activeToken) {
        report(game, mode, 'end-token-mismatch', { expected: st.activeToken, got: token, ...details });
    }
    st.depth = Math.max(0, st.depth - 1);
    if (st.depth === 0) {
        st.activeToken = null;
    }
    if (typeof game?.emitDiagnosticEvent === 'function') {
        game.emitDiagnosticEvent('synclock.command.end', {
            token,
            depth: st.depth,
            ...details,
        });
    }
}

export function beforeTypedSuspend(game, type, details = {}) {
    const mode = modeValue();
    const st = gameState(game);
    if (!st) return null;
    if (!st.activeToken) {
        report(game, mode, 'suspend-outside-command', { type, ...details });
    }
    const snapshot = {
        token: st.activeToken,
        type,
    };
    if (typeof game?.emitDiagnosticEvent === 'function') {
        game.emitDiagnosticEvent('synclock.suspend.before', {
            token: snapshot.token,
            type,
            ...details,
        });
    }
    return snapshot;
}

export function afterTypedSuspend(game, snapshot, details = {}) {
    if (!snapshot) return;
    const mode = modeValue();
    const st = gameState(game);
    if (!st) return;
    if (snapshot.token !== st.activeToken) {
        report(game, mode, 'resume-token-mismatch', {
            before: snapshot.token,
            after: st.activeToken,
            type: snapshot.type,
            ...details,
        });
    }
    if (typeof game?.emitDiagnosticEvent === 'function') {
        game.emitDiagnosticEvent('synclock.suspend.after', {
            token: snapshot.token,
            type: snapshot.type,
            ...details,
        });
    }
}

