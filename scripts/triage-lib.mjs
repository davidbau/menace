// Shared library for triage tools.
// Provides entry filtering, normalization, step numbering convention,
// and C RNG pattern annotation.

// ─── Entry filtering (matches test comparator logic) ─────────────────────

export function isComparable(e) {
    if (typeof e !== 'string') return false;
    if (e[0] === '^' || e[0] === '>' || e[0] === '<' || e[0] === '~') return false;
    if (e.startsWith('d(') || e.startsWith('rne(') || e.startsWith('rnz(') || e.startsWith('rnl(')) return false;
    return true;
}

export function normalize(e) {
    return e.replace(/ @.*$/, '');
}

// ─── Step numbering ──────────────────────────────────────────────────────
// All triage tools use 1-indexed gameplay steps to match:
//   - the test comparator's `approximateStepForRngIndex` (returns i+1)
//   - movement-propagation.mjs
//   - rng_step_diff.js --step argument
//
// getSessionGameplaySteps() returns a 0-indexed array.
// Gameplay step N (1-indexed) = gameplaySteps[N-1] (0-indexed array index).
// JS replay step N (1-indexed) = result.steps[N] (0=startup, 1..=per-key).

export const STEP_INDEX_HELP =
    'Steps are 1-indexed to match the test comparator output (step=N in test failures).';

// Convert 1-indexed gameplay step to array indices
export function toArrayIndex(step1) { return step1 - 1; }
export function toReplayIndex(step1) { return step1; } // result.steps[step1] is gameplay step step1

// ─── C RNG pattern annotation ────────────────────────────────────────────
// Maps common C RNG call patterns to human-readable descriptions.
// Recognizes function names from C caller tags and entry patterns.

const ANNOTATIONS = [
    // Turn structure
    { pattern: /rn2\(70\).*moveloop_core|rn2\(70\).*allmain/, label: 'spawn check' },
    { pattern: /rn2\(20\).*gethungry|rn2\(20\).*eat\./, label: 'hunger check' },
    { pattern: /rn2\(91\).*moveloop_core|rn2\(76\).*moveloop_core/, label: 'engrave wipe check' },
    { pattern: /rn2\(12\).*mcalcmove|rn2\(12\).*allocateMonsterMovement/, label: 'monster move alloc' },
    { pattern: /rn2\(400\).*dosounds/, label: 'dosounds' },
    { pattern: /rn2\(200\).*dosounds/, label: 'dosounds' },

    // Monster AI
    { pattern: /rn2\(5\).*distfleeck/, label: 'flee check' },
    { pattern: /rn2\(4\).*dochug/, label: 'dochug gate' },
    { pattern: /rn2\(100\).*obj_resists/, label: 'obj_resists (pet food eval)' },
    { pattern: /dog_goal/, label: 'pet goal eval' },
    { pattern: /dog_move/, label: 'pet movement' },
    { pattern: /mfndpos/, label: 'monster position find' },
    { pattern: /m_move/, label: 'monster movement' },

    // Object operations
    { pattern: /rnd\(2\).*next_ident/, label: 'object ID alloc (splitobj/newobj)' },

    // Exercise / attributes
    { pattern: /rn2\(19\).*exercise|rn2\(19\).*attrib/, label: 'exercise check' },

    // Combat
    { pattern: /rn2\(\d+\).*do_attack|rn2\(\d+\).*uhitm/, label: 'combat roll' },
    { pattern: /overexertion/, label: 'overexertion check' },
];

export function annotateEntry(entry) {
    if (typeof entry !== 'string') return null;
    for (const { pattern, label } of ANNOTATIONS) {
        if (pattern.test(entry)) return label;
    }
    return null;
}

// Annotate a list of entries, returning a summary like:
// "2× monster move alloc, 1× spawn check, 1× hunger check"
export function summarizeEntries(entries) {
    const counts = new Map();
    for (const e of entries) {
        const label = annotateEntry(e) || 'other';
        counts.set(label, (counts.get(label) || 0) + 1);
    }
    if (counts.size === 0) return '(none)';
    return [...counts.entries()]
        .map(([label, count]) => count > 1 ? `${count}× ${label}` : label)
        .join(', ');
}

// Describe a standard turn-end pattern
export function describeTurnEnd(entries) {
    const comparable = entries.filter(isComparable);
    const hasMcalcmove = comparable.some(e => /mcalcmove|allocateMonsterMovement/.test(e));
    const hasSpawn = comparable.some(e => /rn2\(70\)/.test(e));
    const hasHunger = comparable.some(e => /rn2\(20\).*gethungry|rn2\(20\).*moveloop_turnend/.test(e));
    if (hasMcalcmove && hasSpawn && hasHunger) {
        return 'standard turn end (movemon + spawn + hunger)';
    }
    if (hasMcalcmove && hasSpawn) {
        return 'turn end (movemon + spawn)';
    }
    return null;
}

// ─── Key description ─────────────────────────────────────────────────────

export function describeKey(key) {
    if (key === ' ') return 'space';
    if (key === '\n') return 'enter';
    if (key === '\x1b') return 'ESC';
    if (key === ',') return 'pickup';
    if (key === '.') return 'wait';
    if (key === 's') return 'search';
    if (key === 'D') return 'drop-menu';
    if (key === 'd') return 'drop';
    if (key === '#') return 'extended';
    const viDirs = { h: 'west', j: 'south', k: 'north', l: 'east',
                     y: 'NW', u: 'NE', b: 'SW', n: 'SE' };
    if (viDirs[key]) return `move ${viDirs[key]}`;
    if (key >= 'A' && key <= 'Z') return `shift-${key.toLowerCase()}`;
    return key;
}

// ─── Command span detection ──────────────────────────────────────────────
// Identifies multi-key command flows by examining the JS game state
// captured at each step. Uses the topline prompt text and display state
// (which are authoritative — JS shows the same prompts C does) rather
// than heuristic key-pattern scanning.
//
// Requires capturedStates from step-boundary-context's onKey callback.
// Without captured state, returns null (no guess).

const PROMPT_COMMANDS = [
    { pattern: /What do you want to throw\b/i, name: 'throw' },
    { pattern: /In what direction\b/i, name: 'direction' },
    { pattern: /Drop what type of items\b/i, name: 'drop-menu' },
    { pattern: /What do you want to drop\b/i, name: 'drop' },
    { pattern: /What do you want to zap\b/i, name: 'zap' },
    { pattern: /What do you want to cast\b/i, name: 'cast' },
    { pattern: /What do you want to read\b/i, name: 'read' },
    { pattern: /What do you want to drink\b/i, name: 'quaff' },
    { pattern: /What do you want to eat\b/i, name: 'eat' },
    { pattern: /What do you want to wield\b/i, name: 'wield' },
    { pattern: /What do you want to wear\b/i, name: 'wear' },
    { pattern: /What do you want to put on\b/i, name: 'put-on' },
    { pattern: /What do you want to take off\b/i, name: 'take-off' },
    { pattern: /What do you want to use or apply\b/i, name: 'apply' },
    { pattern: /What would you like to drop\b/i, name: 'drop-select' },
    { pattern: /\(end\)/i, name: 'menu-overlay' },
];

// Detect what command a step belongs to from captured JS game state.
// gameplaySteps: 0-indexed array from getSessionGameplaySteps
// stepIdx: 0-indexed position in gameplaySteps
// capturedStates: map/object from 1-indexed step → { topMessage, msgRow0, pendingPrompt, ... }
export function detectCommandSpan(gameplaySteps, stepIdx, capturedStates = null) {
    if (!capturedStates) return null;
    const step1 = stepIdx + 1;
    const state = capturedStates?.get?.(step1) || capturedStates?.[step1];
    if (!state) return null;

    // Check pendingPrompt first — most specific signal
    if (state.pendingPrompt) {
        return { command: state.pendingPrompt, role: 'pending-prompt' };
    }

    // Check topline message and screen row0 against known prompt patterns
    const topMsg = state.topMessage || '';
    const row0 = state.msgRow0 || '';
    const checkText = topMsg || row0;

    for (const { pattern, name } of PROMPT_COMMANDS) {
        if (pattern.test(checkText)) {
            return { command: name, role: 'prompt-active' };
        }
    }

    // Check messageNeedsMore — mid-message-dismiss
    if (state.messageNeedsMore && topMsg) {
        return { command: 'more-dismiss', role: `msg: ${topMsg.slice(0, 40)}` };
    }

    return null;
}

// Format a command span for display.
export function formatCommandSpan(span) {
    if (!span) return '';
    return `[${span.command}: ${span.role}]`;
}
