// trace.js — Cell-level tracing functions for display debugging
// Extracted from display.js / headless.js to avoid duplication.

const _env = typeof process !== 'undefined' ? process.env : {};

export function parseTraceCellSpec(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    const m = text.match(/^(\d+)\s*,\s*(\d+)$/);
    if (!m) return null;
    return { col: Number(m[1]), row: Number(m[2]) };
}

export function parseTraceStepSpec(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    const m = text.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) return null;
    const from = Number(m[1]);
    const to = Number(m[2] || m[1]);
    if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
    return { from: Math.min(from, to), to: Math.max(from, to) };
}

export const TRACE_CELL_SPEC = parseTraceCellSpec(_env.WEBHACK_TRACE_CELL);
export const TRACE_CELL_STEPS = parseTraceStepSpec(_env.WEBHACK_TRACE_CELL_STEPS);
export const TRACE_CELL_STACK = _env.WEBHACK_TRACE_CELL_STACK === '1';

export function traceStepForDisplay(display) {
    const stepIndex = Number.isInteger(display?._lastMapState?.gameMap?._replayStepIndex)
        ? display._lastMapState.gameMap._replayStepIndex
        : null;
    return stepIndex === null ? null : stepIndex + 1;
}

export function formatTraceChar(ch) {
    if (ch === ' ') return 'space';
    return JSON.stringify(ch);
}

export function traceCaller() {
    if (!TRACE_CELL_STACK) return '';
    const stack = String(new Error().stack || '').split('\n').slice(3);
    for (const line of stack) {
        if (!line.includes('/js/display.js')
            && !line.includes('/js/terminal.js')
            && !line.includes('/js/trace.js')) {
            return line.trim().replace(/^at\s+/, '');
        }
    }
    return stack[0] ? stack[0].trim().replace(/^at\s+/, '') : '';
}

export function maybeTraceCellWrite(display, col, row, prev, next, kind = 'write') {
    if (!TRACE_CELL_SPEC) return;
    if (TRACE_CELL_SPEC.col !== col || TRACE_CELL_SPEC.row !== row) return;
    const step = traceStepForDisplay(display);
    if (TRACE_CELL_STEPS && (step === null || step < TRACE_CELL_STEPS.from || step > TRACE_CELL_STEPS.to)) return;
    const caller = traceCaller();
    const callerPart = caller ? ` caller=${caller}` : '';
    console.error(
        `^celltrace[kind=${kind} step=${step === null ? '?' : step}`
        + ` cell=${col},${row}`
        + ` prev=${formatTraceChar(prev.ch)}/${prev.color}/${prev.attr}`
        + ` next=${formatTraceChar(next.ch)}/${next.color}/${next.attr}`
        + `${callerPart}]`
    );
}
