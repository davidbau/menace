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
// Identifies multi-key command flows by looking at the JS game state
// captured at each step. When a step has 0 RNG entries and a specific
// display/prompt state, it's likely mid-command (menu, prompt, overlay).
//
// Returns a description like "throw: direction prompt" or "drop-menu: class selection"
// or null if the step is a standalone command.

// Known command-starting keys and their expected prompt patterns
const COMMAND_PROMPTS = [
    { startKey: 't', prompt: /What do you want to throw/i, name: 'throw' },
    { startKey: 'f', prompt: /fire|In what direction/i, name: 'fire' },
    { startKey: 'D', prompt: /Drop what type/i, name: 'drop-menu' },
    { startKey: 'd', prompt: /What do you want to drop/i, name: 'drop' },
    { startKey: 'z', prompt: /What do you want to zap/i, name: 'zap' },
    { startKey: 'Z', prompt: /What do you want to cast/i, name: 'cast' },
    { startKey: 'r', prompt: /What do you want to read/i, name: 'read' },
    { startKey: 'q', prompt: /What do you want to drink/i, name: 'quaff' },
    { startKey: 'e', prompt: /What do you want to eat/i, name: 'eat' },
    { startKey: 'w', prompt: /What do you want to wield/i, name: 'wield' },
    { startKey: 'W', prompt: /What do you want to wear/i, name: 'wear' },
    { startKey: 'P', prompt: /What do you want to put on/i, name: 'put-on' },
    { startKey: 'T', prompt: /What do you want to take off/i, name: 'take-off' },
    { startKey: 'a', prompt: /What do you want to use/i, name: 'apply' },
    { startKey: ',', prompt: null, name: 'pickup' },
];

// Detect what command span a step belongs to by scanning backwards.
// gameplaySteps: 0-indexed array from getSessionGameplaySteps
// stepIdx: 0-indexed position in gameplaySteps
// capturedStates: map from 1-indexed step → { topMessage, ... } (optional)
export function detectCommandSpan(gameplaySteps, stepIdx, capturedStates = null) {
    const step1 = stepIdx + 1; // 1-indexed
    const thisStep = gameplaySteps[stepIdx];
    if (!thisStep) return null;

    // Check captured JS state for prompt context
    const state = capturedStates?.get?.(step1) || capturedStates?.[step1];
    const topMsg = state?.topMessage || state?.msgRow0 || '';

    // First check if we're already INSIDE a command span (scan backwards).
    // If so, this step is a continuation, even if its key matches a command name.
    // This prevents 'd' (invlet selection within throw overlay) from being
    // misidentified as a new drop command.
    for (let back = 1; back <= 8 && stepIdx - back >= 0; back++) {
        const prevStep = gameplaySteps[stepIdx - back];
        if (!prevStep) continue;
        const prevRng = prevStep.rng || [];
        const prevComparable = prevRng.filter(isComparable);
        // If a prior step had RNG entries, the command completed — we're past it
        if (prevComparable.length > 0 && back > 1) break;
        for (const cmd of COMMAND_PROMPTS) {
            if (prevStep.key === cmd.startKey) {
                let role = 'continuation';
                if (thisStep.key === '\n' || thisStep.key === ' ') role = 'confirm/dismiss';
                else if (/^[0-9]$/.test(thisStep.key)) role = 'count-digit';
                else if (/^[a-zA-Z]$/.test(thisStep.key)) role = 'invlet/selection';
                return { command: cmd.name, role, startStep: stepIdx - back + 1 };
            }
        }
    }

    // Check if THIS step starts a command (only if not already inside a span)
    for (const cmd of COMMAND_PROMPTS) {
        if (thisStep.key === cmd.startKey) {
            return { command: cmd.name, role: 'start', startStep: step1 };
        }
    }

    return null;
}

// Format a command span for display.
// Prefixed with '~' to indicate this is a heuristic guess, not authoritative.
// The detection scans backward for known command-starting keys and can be wrong
// when keys have dual meanings (e.g., 'd' = drop command OR invlet letter).
export function formatCommandSpan(span) {
    if (!span) return '';
    return `~[${span.command}: ${span.role}${span.startStep ? ` from step ${span.startStep}` : ''}]`;
}
