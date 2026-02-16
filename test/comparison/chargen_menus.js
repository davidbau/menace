// test/comparison/chargen_menus.js -- Chargen menu building for session tests
//
// Builds expected chargen menu screens for comparison against C session data.
// Pure functions for constructing the menus shown during character creation.

import {
    roles, races, validRacesForRole, validAlignsForRoleRace,
    needsGenderMenu, roleNameForGender, alignName,
} from '../../js/player.js';

import {
    A_LAWFUL, A_NEUTRAL, A_CHAOTIC, MALE, FEMALE,
} from '../../js/config.js';

import { getSessionCharacter, getSessionScreenLines } from './session_loader.js';
import { HeadlessDisplay } from './session_helpers.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Roles with implemented JS chargen inventory
export const CHARGEN_SUPPORTED_ROLES = new Set([
    'Archeologist', 'Barbarian', 'Caveman', 'Healer', 'Knight',
    'Monk', 'Priest', 'Ranger', 'Rogue', 'Samurai', 'Tourist',
    'Valkyrie', 'Wizard',
]);

// Map role name → roles[] index
export const CHARGEN_ROLE_INDEX = {};
for (let i = 0; i < roles.length; i++) CHARGEN_ROLE_INDEX[roles[i].name] = i;

// Map race name → races[] index
export const CHARGEN_RACE_INDEX = {};
for (let i = 0; i < races.length; i++) CHARGEN_RACE_INDEX[races[i].name] = i;

// Map alignment name → alignment value
export const CHARGEN_ALIGN_MAP = { lawful: A_LAWFUL, neutral: A_NEUTRAL, chaotic: A_CHAOTIC };

// ---------------------------------------------------------------------------
// Menu building functions
// ---------------------------------------------------------------------------

// Build the header line for chargen menus: "<role> <race> <gender> <alignment>"
export function buildHeaderLine(roleIdx, raceIdx, gender, align) {
    const parts = [];
    if (roleIdx >= 0) {
        const female = gender === FEMALE;
        parts.push(roleNameForGender(roleIdx, female));
    } else {
        parts.push('<role>');
    }
    if (raceIdx >= 0) {
        parts.push(races[raceIdx].name);
    } else {
        parts.push('<race>');
    }
    if (gender === FEMALE) {
        parts.push('female');
    } else if (gender === MALE) {
        parts.push('male');
    } else {
        parts.push('<gender>');
    }
    if (align !== -128) {
        parts.push(alignName(align));
    } else {
        parts.push('<alignment>');
    }
    return parts.join(' ');
}

// Build role menu lines (matching _showRoleMenu in nethack.js)
export function buildRoleMenuLines(raceIdx, gender, align) {
    const lines = [];
    lines.push(' Pick a role or profession');
    lines.push('');
    lines.push(' ' + buildHeaderLine(-1, raceIdx, gender, align));
    lines.push('');

    for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        if (raceIdx >= 0 && !role.validRaces.includes(raceIdx)) continue;
        if (align !== -128 && !role.validAligns.includes(align)) continue;
        const ch = role.menuChar;
        const article = role.menuArticle || 'a';
        const nameDisplay = role.namef
            ? `${role.name}/${role.namef}`
            : role.name;
        lines.push(` ${ch} - ${article} ${nameDisplay}`);
    }
    lines.push(' * * Random');
    lines.push(' / - Pick race first');
    lines.push(' " - Pick gender first');
    lines.push(' [ - Pick alignment first');
    lines.push(' ~ - Set role/race/&c filtering');
    lines.push(' q - Quit');
    lines.push(' (end)');
    return lines;
}

// Build race menu lines (matching _showRaceMenu in nethack.js)
export function buildRaceMenuLines(roleIdx, gender, align) {
    const role = roles[roleIdx];
    const validRaces = validRacesForRole(roleIdx);

    // Check if alignment is forced across all valid races for this role
    const allAligns = new Set();
    for (const ri of validRaces) {
        for (const a of validAlignsForRoleRace(roleIdx, ri)) {
            allAligns.add(a);
        }
    }
    const alignForHeader = allAligns.size === 1 ? [...allAligns][0] : align;

    const lines = [];
    lines.push('Pick a race or species');
    lines.push('');
    lines.push(buildHeaderLine(roleIdx, -1, gender, alignForHeader));
    lines.push('');

    for (const ri of validRaces) {
        if (align !== -128) {
            const vAligns = validAlignsForRoleRace(roleIdx, ri);
            if (!vAligns.includes(align)) continue;
        }
        lines.push(`${races[ri].menuChar} - ${races[ri].name}`);
    }
    lines.push('* * Random');

    // Navigation — matching C order: ?, ", constraint notes, [, ~, q, (end)
    lines.push('');
    lines.push('? - Pick another role first');

    if (gender < 0 && needsGenderMenu(roleIdx)) {
        lines.push('" - Pick gender first');
    }

    // Constraint notes
    if (role.forceGender === 'female') {
        lines.push('    role forces female');
    }
    if (allAligns.size === 1) {
        lines.push('    role forces ' + alignName([...allAligns][0]));
    }

    // Alignment navigation if not forced
    if (align === -128 && allAligns.size > 1) {
        lines.push('[ - Pick alignment first');
    }

    lines.push('~ - Set role/race/&c filtering');
    lines.push('q - Quit');
    lines.push('(end)');
    return lines;
}

// Build gender menu lines (matching _showGenderMenu in nethack.js)
export function buildGenderMenuLines(roleIdx, raceIdx, align) {
    const role = roles[roleIdx];
    const validAligns = validAlignsForRoleRace(roleIdx, raceIdx);
    const lines = [];
    lines.push('Pick a gender or sex');
    lines.push('');

    const alignDisplay = validAligns.length === 1 ? validAligns[0] : -128;
    lines.push(buildHeaderLine(roleIdx, raceIdx, -1, alignDisplay));
    lines.push('');

    lines.push('m - male');
    lines.push('f - female');
    lines.push('* * Random');

    lines.push('');
    lines.push('? - Pick another role first');

    const validRaces = validRacesForRole(roleIdx);
    if (validRaces.length > 1) {
        lines.push('/ - Pick another race first');
    }

    // Constraint notes
    if (validRaces.length === 1) {
        lines.push('    role forces ' + races[validRaces[0]].name);
    }
    if (validAligns.length === 1) {
        const role = roles[roleIdx];
        const forcer = role.validAligns.length === 1 ? 'role' : 'race';
        lines.push(`    ${forcer} forces ` + alignName(validAligns[0]));
    }

    if (align === -128 && validAligns.length > 1) {
        lines.push('[ - Pick alignment first');
    }

    lines.push('~ - Set role/race/&c filtering');
    lines.push('q - Quit');
    lines.push('(end)');
    return lines;
}

// Build alignment menu lines (matching _showAlignMenu in nethack.js)
export function buildAlignMenuLines(roleIdx, raceIdx, gender) {
    const validAligns = validAlignsForRoleRace(roleIdx, raceIdx);
    const role = roles[roleIdx];
    const lines = [];
    lines.push('Pick an alignment or creed');
    lines.push('');
    lines.push(buildHeaderLine(roleIdx, raceIdx, gender, -128));
    lines.push('');

    const alignChars = { [A_LAWFUL]: 'l', [A_NEUTRAL]: 'n', [A_CHAOTIC]: 'c' };
    for (const a of validAligns) {
        lines.push(`${alignChars[a]} - ${alignName(a)}`);
    }
    lines.push('* * Random');

    lines.push('');
    lines.push('? - Pick another role first');

    const validRacesForAlign = validRacesForRole(roleIdx);
    if (validRacesForAlign.length > 1) {
        lines.push('/ - Pick another race first');
    }

    // Constraint notes
    if (validRacesForAlign.length === 1) {
        lines.push('    role forces ' + races[validRacesForAlign[0]].name);
    }
    if (role.forceGender === 'female') {
        lines.push('    role forces female');
    }

    if (needsGenderMenu(roleIdx)) {
        lines.push('" - Pick another gender first');
    }

    lines.push('~ - Set role/race/&c filtering');
    lines.push('q - Quit');
    lines.push('(end)');
    return lines;
}

// Build confirmation menu lines (matching _showConfirmation in nethack.js)
export function buildConfirmMenuLines(playerName, roleIdx, raceIdx, gender, align) {
    const female = gender === FEMALE;
    const rName = roleNameForGender(roleIdx, female);
    const raceName = races[raceIdx].adj;
    const genderStr = female ? 'female' : 'male';
    const alignStr = alignName(align);
    const confirmText = `${playerName.toLowerCase()} the ${alignStr} ${genderStr} ${raceName} ${rName}`;

    const lines = [];
    lines.push('Is this ok? [ynq]');
    lines.push('');
    lines.push(confirmText);
    lines.push('');
    lines.push('y * Yes; start game');
    lines.push('n - No; choose role again');
    lines.push('q - Quit');
    lines.push('(end)');
    return lines;
}

// Given role+race are determined, figure out the next menu to show.
// Follows the same flow as _manualSelection: gender → alignment → confirmation.
export function buildNextMenu(roleIdx, raceIdx, gender, align, session) {
    // Need gender?
    if (gender < 0 && needsGenderMenu(roleIdx)) {
        return buildGenderMenuLines(roleIdx, raceIdx, align);
    }
    // Resolve gender if forced
    const effectiveGender = gender >= 0 ? gender
        : (roles[roleIdx].forceGender === 'female' ? FEMALE : MALE);

    // Need alignment?
    const validAligns = validAlignsForRoleRace(roleIdx, raceIdx);
    if (validAligns.length > 1 && align === -128) {
        return buildAlignMenuLines(roleIdx, raceIdx, effectiveGender);
    }
    // Resolve alignment if forced
    const effectiveAlign = align !== -128 ? align : validAligns[0];

    // All determined → confirmation
    const character = getSessionCharacter(session);
    return buildConfirmMenuLines(character.name, roleIdx, raceIdx, effectiveGender, effectiveAlign);
}

// Build chargen screen for a step and render on HeadlessDisplay.
// Returns the screen lines array, or null if not a menu step.
export function buildChargenScreen(step, state, session) {
    const display = new HeadlessDisplay();
    let lines = null;
    let isFirstMenu = false;

    switch (step.action) {
        case 'decline-autopick':
            lines = buildRoleMenuLines(-1, -1, -128);
            isFirstMenu = true;
            break;
        case 'pick-role': {
            // After selecting role, the next menu depends on what's forced
            const roleIdx = CHARGEN_ROLE_INDEX[state.role];
            const raceIdx = state.race !== undefined ? CHARGEN_RACE_INDEX[state.race] : -1;
            const gender = state.gender !== undefined
                ? (state.gender === 'female' ? FEMALE : MALE)
                : -1;
            const align = state.align !== undefined ? CHARGEN_ALIGN_MAP[state.align] : -128;

            // Determine what menu was shown after this role pick
            // Follow the same logic as _manualSelection: role → race → gender → alignment
            const effectiveRace = raceIdx >= 0 ? raceIdx : -1;
            if (effectiveRace < 0) {
                // Need race menu
                const validRaces = validRacesForRole(roleIdx);
                if (validRaces.length === 1) {
                    // Race forced — continue to gender/alignment
                    const forcedRace = validRaces[0];
                    lines = buildNextMenu(roleIdx, forcedRace, gender, align, session);
                } else {
                    lines = buildRaceMenuLines(roleIdx, gender, align);
                }
            } else {
                // Race already determined (forced)
                lines = buildNextMenu(roleIdx, effectiveRace, gender, align, session);
            }
            break;
        }
        case 'pick-race': {
            const roleIdx = CHARGEN_ROLE_INDEX[state.role];
            const raceIdx = CHARGEN_RACE_INDEX[state.race];
            const gender = state.gender !== undefined
                ? (state.gender === 'female' ? FEMALE : MALE)
                : -1;
            const align = state.align !== undefined ? CHARGEN_ALIGN_MAP[state.align] : -128;
            lines = buildNextMenu(roleIdx, raceIdx, gender, align, session);
            break;
        }
        case 'pick-gender': {
            const roleIdx = CHARGEN_ROLE_INDEX[state.role];
            const raceIdx = state.race !== undefined ? CHARGEN_RACE_INDEX[state.race] : -1;
            const gender = state.gender === 'female' ? FEMALE : MALE;
            const align = state.align !== undefined ? CHARGEN_ALIGN_MAP[state.align] : -128;
            const effectiveRace = raceIdx >= 0 ? raceIdx : validRacesForRole(roleIdx)[0];
            lines = buildNextMenu(roleIdx, effectiveRace, gender, align, session);
            break;
        }
        case 'pick-align': {
            const roleIdx = CHARGEN_ROLE_INDEX[state.role];
            const raceIdx = state.race !== undefined ? CHARGEN_RACE_INDEX[state.race] : -1;
            const gender = state.gender !== undefined
                ? (state.gender === 'female' ? FEMALE : MALE)
                : (roles[roleIdx].forceGender === 'female' ? FEMALE : MALE);
            const align = CHARGEN_ALIGN_MAP[state.align];
            const effectiveRace = raceIdx >= 0 ? raceIdx : validRacesForRole(roleIdx)[0];
            const character = getSessionCharacter(session);
            lines = buildConfirmMenuLines(character.name, roleIdx, effectiveRace, gender, align);
            break;
        }
        default:
            return null; // Not a menu step we can rebuild
    }

    if (!lines) return null;

    display.renderChargenMenu(lines, isFirstMenu);
    return display.getScreenLines();
}

// Collect all startup RNG from a chargen session: confirm-ok + welcome ("more") steps.
// Returns the combined RNG array, or null if no confirm-ok step found.
export function collectChargenStartupRng(session) {
    let startupRng = [];
    let foundConfirm = false;
    for (const step of session.steps) {
        if (step.action === 'confirm-ok') {
            foundConfirm = true;
            startupRng = startupRng.concat(step.rng || []);
            continue;
        }
        if (foundConfirm && step.action === 'more' && (step.rng || []).length > 0) {
            startupRng = startupRng.concat(step.rng);
            break;
        }
        if (foundConfirm) break;
    }
    return startupRng.length > 0 ? startupRng : null;
}

// Derive the chargen state at a given step by tracking what's been picked so far.
// Returns { role, race, gender, align } with values set as they become known.
export function deriveChargenState(session, stepIndex) {
    const state = {};
    const character = getSessionCharacter(session);

    // Walk through steps up to (but not including) stepIndex to build state,
    // then the step AT stepIndex records the selection that just happened.
    for (let i = 0; i <= stepIndex; i++) {
        const step = session.steps[i];
        switch (step.action) {
            case 'pick-role':
                state.role = character.role;
                // If race is forced, set it
                {
                    const roleIdx = CHARGEN_ROLE_INDEX[character.role];
                    const vr = validRacesForRole(roleIdx);
                    if (vr.length === 1) state.race = races[vr[0]].name;
                    // If gender is forced, set it
                    if (roles[roleIdx].forceGender === 'female') state.gender = 'female';
                }
                break;
            case 'pick-race':
                state.race = character.race;
                break;
            case 'pick-gender':
                state.gender = character.gender;
                break;
            case 'pick-align':
                state.align = character.align;
                break;
        }
    }
    return state;
}
