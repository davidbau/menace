import { pushRngLogEntry } from './rng.js';
import { envFlag } from './runtime_env.js';

export function repaintTraceEnabled() {
    return envFlag('WEBHACK_REPAINT_TRACE');
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
