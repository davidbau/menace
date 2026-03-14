import { pushRngLogEntry } from './rng.js';
import { envFlag } from './runtime_env.js';

export function repaintTraceEnabled() {
    return envFlag('WEBHACK_REPAINT_TRACE');
}

export function repaintHp(player) {
    return Number.isFinite(player?.uhp) ? (player.uhp | 0) : 0;
}

export function repaintBotl(player) {
    return player?._botl ? 1 : 0;
}

export function repaintBotlx(player) {
    return Number.isFinite(player?._botlx) ? (player._botlx | 0) : 0;
}

export function repaintTimeBotl(player) {
    return Number.isFinite(player?._time_botl) ? (player._time_botl | 0) : 0;
}

export function repaintToplineState(display) {
    if (!display) return 0;
    return (display.messageNeedsMore || display.topMessage) ? 1 : 0;
}

export function repaintCursorRow(display) {
    return Number.isInteger(display?.cursorRow) ? display.cursorRow : -1;
}

export function repaintCursorCol(display) {
    return Number.isInteger(display?.cursorCol) ? display.cursorCol : -1;
}

function truncateText(value, limit = 48) {
    const text = String(value ?? '');
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function encodeValue(value) {
    if (typeof value === 'string') return JSON.stringify(truncateText(value));
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (value == null) return 'null';
    return String(value);
}

export function logRepaint(kind, fields = {}) {
    if (!repaintTraceEnabled()) return;
    const parts = [];
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        parts.push(`${key}=${encodeValue(value)}`);
    }
    pushRngLogEntry(`^repaint[${parts.length ? `${kind} ${parts.join(' ')}` : kind}]`);
}
