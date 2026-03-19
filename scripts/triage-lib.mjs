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
