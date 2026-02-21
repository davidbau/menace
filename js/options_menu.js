/**
 * NetHack Options Menu
 *
 * Interactive two-page options menu matching C NetHack 3.7 exactly.
 * Displays current option values and allows toggling.
 */

import { saveFlags, DEFAULT_FLAGS } from './storage.js';
import { nhgetch, getlin } from './input.js';

/**
 * Options menu data structure matching C NetHack
 * Each option has: name, key, type (bool/text/number), category, page
 */
export const OPTIONS_DATA = {
    // Page 1 - General & Behavior
    page1: [
        {
            category: 'General',
            options: [
                { key: 'a', name: 'fruit', type: 'text', flag: 'fruit', help: 'name of a fruit you enjoy eating' },
                { key: 'b', name: 'number_pad', type: 'bool', flag: 'number_pad', help: 'use the number pad for movement' }
            ]
        },
        {
            category: 'Behavior',
            options: [
                { key: 'c', name: 'autodig', type: 'bool', flag: 'autodig', help: 'dig if moving and wielding a digging tool' },
                { key: 'd', name: 'autoopen', type: 'bool', flag: 'autoopen', help: 'walking into a door attempts to open it' },
                { key: 'e', name: 'autopickup', type: 'bool', flag: 'pickup', help: 'automatically pick up objects' },
                { key: 'f', name: 'autopickup exceptions', type: 'count', flag: 'autopickup_exceptions', help: 'exceptions to autopickup' },
                { key: 'g', name: 'autoquiver', type: 'bool', flag: 'autoquiver', help: 'automatically fill quiver' },
                { key: 'h', name: 'autounlock', type: 'text', flag: 'autounlock', help: 'method for unlocking' },
                { key: 'i', name: 'cmdassist', type: 'bool', flag: 'cmdassist', help: 'provide assistance with commands' },
                { key: 'j', name: 'dropped_nopick', type: 'bool', flag: 'dropped_nopick', help: 'do not autopickup dropped items', suffix: '(for autopickup)' },
                { key: 'k', name: 'fireassist', type: 'bool', flag: 'fireassist', help: 'provide assistance with firing' },
                { key: 'l', name: 'pickup_stolen', type: 'bool', flag: 'pickup_stolen', help: 'autopickup stolen items', suffix: '(for autopickup)' },
                { key: 'm', name: 'pickup_thrown', type: 'bool', flag: 'pickup_thrown', help: 'autopickup thrown items', suffix: '(for autopickup)' },
                { key: 'n', name: 'pickup_types', type: 'text', flag: 'pickup_types', help: 'types to autopickup', suffix: '(for autopickup)' },
                { key: 'o', name: 'pushweapon', type: 'bool', flag: 'pushweapon', help: 'push old weapon into second slot' }
            ]
        }
    ],

    // Page 2 - Map & Status
    page2: [
        {
            category: 'Map',
            options: [
                { key: 'a', name: 'bgcolors', type: 'bool', flag: 'bgcolors', help: 'use background colors' },
                { key: 'b', name: 'color', type: 'bool', flag: 'color', help: 'use color for display' },
                { key: 'c', name: 'customcolors', type: 'bool', flag: 'customcolors', help: 'use custom colors' },
                { key: 'd', name: 'customsymbols', type: 'bool', flag: 'customsymbols', help: 'use custom symbols' },
                { key: 'e', name: 'hilite_pet', type: 'bool', flag: 'hilite_pet', help: 'highlight pets' },
                { key: 'f', name: 'hilite_pile', type: 'bool', flag: 'hilite_pile', help: 'highlight piles of objects' },
                { key: 'g', name: 'showrace', type: 'bool', flag: 'showrace', help: 'show race in status' },
                { key: 'h', name: 'sparkle', type: 'bool', flag: 'sparkle', help: 'sparkle effect for resists' },
                { key: 'i', name: 'symset', type: 'text', flag: 'symset', help: 'symbol set to use' }
            ]
        },
        {
            category: 'Status',
            options: [
                { key: 'j', name: 'hitpointbar', type: 'bool', flag: 'hitpointbar', help: 'show hitpoint bar' },
                { key: 'k', name: 'menu colors', type: 'count', flag: 'menucolors', help: 'menu color rules' },
                { key: 'l', name: 'showexp', type: 'bool', flag: 'showexp', help: 'show experience points' },
                { key: 'm', name: 'status condition fields', type: 'count', flag: 'statusconditions', count: 16, help: 'status condition fields' },
                { key: 'n', name: 'status highlight rules', type: 'count', flag: 'statushighlights', help: 'status highlight rules' },
                { key: 'o', name: 'statuslines', type: 'number', flag: 'statuslines', help: 'number of status lines' },
                { key: 'p', name: 'time', type: 'bool', flag: 'time', help: 'show elapsed time' }
            ]
        }
    ]
};

const HELP_OPTIONS_PER_PAGE = 5;
const HELP_TOTAL_PAGES = 5;

function clampPage(page, min, max) {
    const n = Number.isFinite(page) ? Math.trunc(page) : min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function flattenOptions() {
    const out = [];
    const pages = [
        { number: 1, categories: OPTIONS_DATA.page1 },
        { number: 2, categories: OPTIONS_DATA.page2 }
    ];
    for (const page of pages) {
        for (const category of page.categories) {
            for (const option of category.options) {
                out.push({ ...option, category: category.category, page: page.number });
            }
        }
    }
    return out;
}

const FLAT_OPTIONS = flattenOptions();

export function getTotalPages(showHelp) {
    if (showHelp) return HELP_TOTAL_PAGES;
    return 2;
}

export function normalizeOptionsPage(page, showHelp) {
    return clampPage(page, 1, getTotalPages(showHelp));
}

export function getVisibleOptions(page, showHelp) {
    if (!showHelp) {
        const categories = page === 2 ? OPTIONS_DATA.page2 : OPTIONS_DATA.page1;
        const out = [];
        for (const category of categories) {
            for (const option of category.options) {
                out.push({ ...option, category: category.category, page });
            }
        }
        return out;
    }

    const normalizedPage = normalizeOptionsPage(page, true);
    const start = (normalizedPage - 1) * HELP_OPTIONS_PER_PAGE;
    const end = normalizedPage === HELP_TOTAL_PAGES
        ? FLAT_OPTIONS.length
        : start + HELP_OPTIONS_PER_PAGE;
    return FLAT_OPTIONS.slice(start, end);
}

export function getOptionByKey(page, showHelp, key) {
    const options = getVisibleOptions(page, showHelp);
    return options.find(opt => opt.key === key) || null;
}

/**
 * Render options menu to a 24x80 grid
 * @param {number} page - Page number (1 or 2)
 * @param {boolean} showHelp - Whether to show help text
 * @param {object} flags - Current flag values from storage
 * @returns {object} - {screen: string[], attrs: string[]}
 */
export function renderOptionsMenu(page, showHelp, flags) {
    const normalizedPage = normalizeOptionsPage(page, showHelp);

    // C NetHack uses variable-length lines, not fixed 80-char
    const screen = Array(24).fill('');
    const attrs = Array(24).fill('');

    let row = 0;

    // Help mode and page 1 both show header/help controls
    if (showHelp || normalizedPage === 1) {
        // Header (exactly 20 chars with inverse video on "Options")
        screen[row] = ' Options            ';
        // Inverse video on positions 1-7 ("Options")
        attrs[row] = '0' + '1'.repeat(7) + '0'.repeat(12);
        row += 1;

        // Blank line (exactly 20 chars)
        screen[row] = ' '.repeat(20);
        attrs[row] = '0'.repeat(20);
        row += 1;

        // Help text
        if (showHelp) {
            screen[row] = ' Use command \'#optionsfull\' to get the complete options list.                   ';
            attrs[row] = '0'.repeat(screen[row].length);
            row += 1;
            screen[row] = ' ? - hide help      ';
            attrs[row] = '0'.repeat(20);
        } else {
            screen[row] = ' ? - show help      ';
            attrs[row] = '0'.repeat(20);
        }
        row += 1;
    }

    let pageData;
    if (!showHelp) {
        pageData = normalizedPage === 1 ? OPTIONS_DATA.page1 : OPTIONS_DATA.page2;
    } else {
        const visibleOptions = getVisibleOptions(normalizedPage, true);
        pageData = [];
        let currentCategory = null;
        for (const opt of visibleOptions) {
            if (!currentCategory || currentCategory.category !== opt.category) {
                currentCategory = { category: opt.category, options: [] };
                pageData.push(currentCategory);
            }
            currentCategory.options.push(opt);
        }
    }

    // Render each category
    let firstCategory = true;
    for (const category of pageData) {
        // Blank line before category (except first on page 2 compact view)
        if (!(normalizedPage === 2 && !showHelp && firstCategory)) {
            screen[row] = ' '.repeat(20);
            attrs[row] = '0'.repeat(20);
            row += 1;
        }
        firstCategory = false;

        // Category header (indented with 2 spaces, total 40 chars)
        const catHeader = '  ' + category.category;
        screen[row] = catHeader.padEnd(40, ' ');
        // Inverse video from position 1-32 (C always uses exactly 32 chars)
        attrs[row] = '0' + '1'.repeat(32) + '0'.repeat(7);
        row += 1;

        // Render options
        for (const opt of category.options) {
            if (row >= 23) break; // Save room for footer

            // Format: " a - option_name              [value]"
            // Key and name part
            let line = ' ' + opt.key + ' - ' + opt.name;

            // Pad to exactly column 29 for value alignment (C has value at col 29)
            line = line.padEnd(29, ' ');

            // Get value
            const value = getOptionValue(opt, flags);
            line += '[' + value + ']';

            // Determine line length based on content
            if (opt.suffix) {
                // Has suffix - add 2 spaces after value, then suffix, then to 80
                line += '  ' + opt.suffix;
                line = line.padEnd(80, ' ');
            } else if (value.length > 10 || value.includes('currently set')) {
                // Long value - pad to 80
                line = line.padEnd(80, ' ');
            } else {
                // Short value - pad to 40
                line = line.padEnd(40, ' ');
            }

            screen[row] = line;
            attrs[row] = '0'.repeat(line.length);
            row += 1;

            // Show help text if enabled
            if (showHelp && opt.help) {
                const helpLine = '     ' + opt.help;
                screen[row] = helpLine.padEnd(80, ' ');
                attrs[row] = '0'.repeat(80);
                row += 1;

                // Blank line after help (20 chars)
                if (row < 23) {
                    screen[row] = ' '.repeat(20);
                    attrs[row] = '0'.repeat(20);
                    row += 1;
                }
            }
        }
    }

    // Blank line before footer (only on page 1 in non-help mode)
    // In help mode, the blank after last help text serves this purpose
    if (normalizedPage === 1 && !showHelp) {
        screen[row] = ' '.repeat(20);
        attrs[row] = '0'.repeat(20);
        row += 1;
    }

    // Footer - page indicator on current row (exactly 20 chars)
    const totalPages = getTotalPages(showHelp);
    screen[row] = ' (' + normalizedPage + ' of ' + totalPages + ')           ';
    attrs[row] = '0'.repeat(20);
    row += 1;

    // Fill remaining rows with blank lines (20 chars each)
    while (row < 24) {
        screen[row] = ' '.repeat(20);
        attrs[row] = '0'.repeat(20);
        row += 1;
    }

    return { screen, attrs };
}

/**
 * Get display value for an option
 */
function getOptionValue(opt, flags) {
    const flagValue = flags[opt.flag];

    switch (opt.type) {
        case 'bool':
            // [X] or [ ]
            // Special case: number_pad shows "0=off" or "1=on" instead of X/
            if (opt.name === 'number_pad') {
                const mode = (typeof flagValue === 'number')
                    ? flagValue
                    : (flagValue ? 1 : 0);
                if (mode === -1) return "-1=off, 'z' to move upper-left, 'y' to zap wands";
                if (mode === 0) return '0=off';
                if (mode === 2) return '2=on, MSDOS compatible';
                if (mode === 3) return '3=on, phone-style digit layout';
                if (mode === 4) return '4=on, phone-style layout, MSDOS compatible';
                return '1=on';
            }
            return flagValue ? 'X' : ' ';

        case 'text':
            // [value]
            if (opt.flag === 'autounlock') {
                const v = flagValue ?? DEFAULT_FLAGS[opt.flag];
                return (v === '' || v === undefined || v === null) ? 'apply-key' : String(v);
            }
            if (opt.flag === 'pickup_types') {
                const v = flagValue ?? DEFAULT_FLAGS[opt.flag];
                return (v === '' || v === undefined || v === null) ? 'all' : String(v);
            }
            return flagValue || DEFAULT_FLAGS[opt.flag] || '';

        case 'number':
            // [N]
            const num = flagValue !== undefined ? flagValue : DEFAULT_FLAGS[opt.flag];
            return String(num !== undefined ? num : '');

        case 'count':
            // [(N currently set)]
            let count = 0;
            if (Array.isArray(flagValue)) {
                count = flagValue.length;
            } else if (typeof flagValue === 'number') {
                count = flagValue;
            } else if (flagValue && typeof flagValue === 'object') {
                count = Object.keys(flagValue).length;
            } else if (opt.count !== undefined) {
                count = opt.count;
            }
            return '(' + count + ' currently set)';

        default:
            return '';
    }
}

/**
 * Toggle an option value
 */
export function toggleOption(page, key, flags) {
    const opt = getOptionByKey(page, false, key);
    if (!opt || opt.type !== 'bool') return false;

    flags[opt.flag] = !flags[opt.flag];
    saveFlags(flags);
    return true;
}

export function setOptionValue(page, showHelp, key, rawValue, flags) {
    const opt = getOptionByKey(page, showHelp, key);
    if (!opt) return false;

    if (opt.type === 'bool') {
        flags[opt.flag] = !flags[opt.flag];
        saveFlags(flags);
        return true;
    }

    if (rawValue === null || rawValue === undefined) return false;

    if (opt.type === 'number' || opt.type === 'count') {
        const parsed = parseInt(String(rawValue).trim(), 10);
        if (Number.isNaN(parsed)) return false;
        flags[opt.flag] = parsed;
        saveFlags(flags);
        return true;
    }

    if (opt.type === 'text') {
        flags[opt.flag] = String(rawValue);
        saveFlags(flags);
        return true;
    }

    return false;
}

const STATUS_HILITE_FIELDS = [
    'title', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom',
    'charisma', 'alignment', 'carrying-capacity', 'gold', 'power', 'power-max',
    'experience-level', 'armor-class', 'HD', 'time', 'hunger', 'hitpoints',
    'hitpoints-max', 'dungeon-level', 'experience', 'condition', 'version'
];

const STATUS_CONDITION_FIELDS_ALPHA = [
    'cond_barehanded', 'cond_blind', 'cond_busy', 'cond_conf', 'cond_deaf',
    'cond_fly', 'cond_foodPois', 'cond_glowhands', 'cond_grab', 'cond_hallucinat',
    'cond_held', 'cond_holding', 'cond_ice', 'cond_iron', 'cond_lava',
    'cond_levitate', 'cond_paralyzed', 'cond_ride', 'cond_sleep', 'cond_slime',
    'cond_slip', 'cond_stone', 'cond_strngl', 'cond_stun', 'cond_submerged',
    'cond_termIll', 'cond_tethered', 'cond_trap', 'cond_unconscious', 'cond_woundedlegs'
];

const STATUS_CONDITION_DEFAULT_ON = new Set([
    'cond_blind', 'cond_conf', 'cond_deaf', 'cond_fly', 'cond_foodPois',
    'cond_grab', 'cond_hallucinat', 'cond_iron', 'cond_lava', 'cond_levitate',
    'cond_ride', 'cond_slime', 'cond_stone', 'cond_strngl', 'cond_stun', 'cond_termIll'
]);

// Handle options (O) — C ref: cmd.c doset(), options.c doset()
// Interactive menu with immediate toggle - stays open until q/ESC
export async function handleSet(game) {
    const { display, player } = game;
    const flags = game.flags;

    let currentPage = 1;
    let showHelp = false;

    function applyOptionSideEffects() {
        player.showExp = !!flags.showexp;
        player.showTime = !!flags.time;
        window.gameFlags = flags;
    }

    function drawOptions() {
        const normalizedPage = normalizeOptionsPage(currentPage, showHelp);
        currentPage = normalizedPage;
        const { screen, attrs } = renderOptionsMenu(normalizedPage, showHelp, flags);

        display.clearScreen();
        for (let r = 0; r < display.rows; r++) {
            const line = screen[r] || '';
            const lineAttrs = attrs[r] || '';
            const maxCols = Math.min(display.cols, line.length);
            for (let c = 0; c < maxCols; c++) {
                const attr = lineAttrs[c] === '1' ? 1 : 0;
                display.putstr(c, r, line[c], undefined, attr);
            }
        }
    }

    function normalizeListFlag(flagName) {
        if (!Array.isArray(flags[flagName])) {
            flags[flagName] = [];
        }
        return flags[flagName];
    }

    function normalizeStatusConditionFlag() {
        const raw = flags.statusconditions;
        if (Array.isArray(raw)) {
            flags.statusconditions = raw.filter(name => STATUS_CONDITION_FIELDS_ALPHA.includes(name));
            return flags.statusconditions;
        }
        const count = (typeof raw === 'number')
            ? Math.max(0, Math.min(STATUS_CONDITION_FIELDS_ALPHA.length, raw))
            : STATUS_CONDITION_DEFAULT_ON.size;
        flags.statusconditions = STATUS_CONDITION_FIELDS_ALPHA.filter((name, idx) => {
            if (typeof raw === 'number') return idx < count;
            return STATUS_CONDITION_DEFAULT_ON.has(name);
        });
        return flags.statusconditions;
    }

    function renderSimpleEditorLines(title, lines) {
        display.clearScreen();
        const maxRows = Math.min(display.rows, lines.length + 3);
        const header = ` ${title} `;
        display.putstr(0, 0, header, undefined, 1);
        display.putstr(0, 1, '');
        for (let i = 0; i < maxRows - 2; i++) {
            display.putstr(0, i + 2, lines[i].substring(0, display.cols));
        }
    }

    function renderCenteredList(lines, left = 41, headerInverse = false) {
        display.clearScreen();
        for (let i = 0; i < lines.length && i < display.rows; i++) {
            const text = lines[i].substring(0, Math.max(0, display.cols - left));
            const attr = (headerInverse && i === 0) ? 1 : 0;
            display.putstr(left, i, text, undefined, attr);
        }
    }

    async function editDoWhatCountOption(option) {
        const list = normalizeListFlag(option.flag);
        const addPrompt = option.flag === 'menucolors'
            ? 'What new menucolor pattern? '
            : 'What new autopickup exception pattern? ';
        const addLabel = option.flag === 'menucolors'
            ? 'a - add new menucolor'
            : 'a - add new autopickup exception';

        while (true) {
            const lines = [
                'Do what?',
                '',
                addLabel,
                'x * exit this menu',
                '(end)'
            ];
            renderCenteredList(lines);

            const ch = await nhgetch();
            const c = String.fromCharCode(ch);
            if (ch === 27 || c === 'x') {
                saveFlags(flags);
                return;
            }
            if (c === 'a') {
                const added = await getlin(addPrompt, display);
                if (added !== null) {
                    const trimmed = added.trim();
                    if (trimmed.length > 0) list.push(trimmed);
                }
                continue;
            }
        }
    }

    async function editStatusHilitesOption() {
        if (!flags.statushighlights || typeof flags.statushighlights !== 'object' || Array.isArray(flags.statushighlights)) {
            flags.statushighlights = {};
        }
        let page = 1;
        const pageSize = 21;

        while (true) {
            const lines = [];
            const totalPages = Math.ceil(STATUS_HILITE_FIELDS.length / pageSize);
            const start = (page - 1) * pageSize;
            const visible = STATUS_HILITE_FIELDS.slice(start, start + pageSize);

            if (page === 1) {
                lines.push('Status hilites:');
                lines.push('');
            }
            for (let i = 0; i < visible.length; i++) {
                const key = String.fromCharCode('a'.charCodeAt(0) + i);
                lines.push(`${key} - ${visible[i]}`);
            }
            lines.push(`(${page} of ${totalPages})`);
            display.clearScreen();
            for (let i = 0; i < lines.length && i < display.rows; i++) {
                const row = (i === lines.length - 1) ? 23 : i;
                display.putstr(0, row, lines[i].substring(0, display.cols));
            }

            const ch = await nhgetch();
            const c = String.fromCharCode(ch);
            if (ch === 27 || c === 'q') {
                return;
            }
            if (c === '>' && page < totalPages) {
                page += 1;
                continue;
            }
            if (c === '<' && page > 1) {
                page -= 1;
                continue;
            }
            if (c >= 'a' && c <= 'z') {
                const idx = c.charCodeAt(0) - 'a'.charCodeAt(0);
                if (idx < 0 || idx >= visible.length) continue;
                const field = visible[idx];
                const label = field.toLowerCase();
                const lines2 = [
                    `Select ${label} field hilite behavior:`,
                    '',
                    `a - Always highlight ${label}`,
                    `${field === 'hunger' ? 'c - hunger value changes' : `c - ${label} value changes`}`,
                    `${field === 'hunger' ? 't - hunger text match' : `t - ${label} text match`}`,
                    '(end)'
                ];
                renderCenteredList(lines2);
                const ch2 = await nhgetch();
                const c2 = String.fromCharCode(ch2);
                if (c2 === 'a' || c2 === 'c' || c2 === 't') {
                    flags.statushighlights[field] = c2;
                    saveFlags(flags);
                }
            }
        }
    }

    async function editStatusConditionsOption() {
        const enabled = normalizeStatusConditionFlag();
        let page = 1;
        const pageSize = 19;

        while (true) {
            const totalPages = Math.ceil(STATUS_CONDITION_FIELDS_ALPHA.length / pageSize);
            const start = (page - 1) * pageSize;
            const visible = STATUS_CONDITION_FIELDS_ALPHA.slice(start, start + pageSize);
            const lines = [];
            if (page === 1) {
                lines.push('Choose status conditions to toggle');
                lines.push('');
                lines.push('S - change sort order from "alphabetically" to "by ranking"');
                lines.push('sorted alphabetically');
            }
            for (let i = 0; i < visible.length; i++) {
                const key = String.fromCharCode('a'.charCodeAt(0) + i);
                const mark = enabled.includes(visible[i]) ? '*' : '-';
                lines.push(`${key} ${mark} ${visible[i]}`);
            }
            lines.push(`(${page} of ${totalPages})`);

            display.clearScreen();
            for (let i = 0; i < lines.length && i < display.rows; i++) {
                const row = (i === lines.length - 1) ? 23 : i;
                display.putstr(0, row, lines[i].substring(0, display.cols));
            }

            const ch = await nhgetch();
            const c = String.fromCharCode(ch);
            if (ch === 27) {
                saveFlags(flags);
                return;
            }
            if (c === '>' && page < totalPages) {
                page += 1;
                continue;
            }
            if (c === '<' && page > 1) {
                page -= 1;
                continue;
            }
            if (c >= 'a' && c <= 'z') {
                const idx = c.charCodeAt(0) - 'a'.charCodeAt(0);
                if (idx < 0 || idx >= visible.length) continue;
                const field = visible[idx];
                const pos = enabled.indexOf(field);
                if (pos >= 0) enabled.splice(pos, 1);
                else enabled.push(field);
                saveFlags(flags);
            }
        }
    }

    async function editNumberPadModeOption() {
        const lines = [
            'Select number_pad mode:',
            '',
            'a -  0 (off)',
            'b -  1 (on)',
            'c -  2 (on, MSDOS compatible)',
            'd -  3 (on, phone-style digit layout)',
            'e -  4 (on, phone-style layout, MSDOS compatible)',
            "f - -1 (off, 'z' to move upper-left, 'y' to zap wands)",
            '(end)',
        ];
        renderCenteredList(lines, 24, true);
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);
        const modeByKey = { a: 0, b: 1, c: 2, d: 3, e: 4, f: -1 };
        if (Object.prototype.hasOwnProperty.call(modeByKey, c)) {
            flags.number_pad = modeByKey[c];
            saveFlags(flags);
        }
    }

    async function editAutounlockOption() {
        const actions = [
            { key: 'u', token: 'untrap', suffix: '(might fail)' },
            { key: 'a', token: 'apply-key', suffix: '' },
            { key: 'k', token: 'kick', suffix: '(doors only)' },
            { key: 'f', token: 'force', suffix: '(chests/boxes only)' },
        ];
        const tokenOrder = new Map(actions.map((a, idx) => [a.token, idx]));
        const parseSelected = () => {
            const raw = String(flags.autounlock ?? '').trim();
            if (raw === 'none') return new Set();
            if (!raw) return new Set(['apply-key']);
            const selected = new Set();
            for (const part of raw.split(/[,\s]+/)) {
                const tok = part.trim();
                if (!tok) continue;
                if (tokenOrder.has(tok)) selected.add(tok);
            }
            return selected;
        };
        const saveSelected = (selected) => {
            if (selected.size === 0) {
                flags.autounlock = 'none';
            } else {
                flags.autounlock = Array.from(selected)
                    .sort((a, b) => (tokenOrder.get(a) ?? 99) - (tokenOrder.get(b) ?? 99))
                    .join(',');
            }
            saveFlags(flags);
        };

        while (true) {
            const selected = parseSelected();
            const lines = ["Select 'autounlock' actions:", ''];
            for (const action of actions) {
                const mark = selected.has(action.token) ? '*' : '-';
                const spacer = action.suffix ? ' '.repeat(Math.max(1, 11 - action.token.length)) : '';
                lines.push(`${action.key} ${mark} ${action.token}${spacer}${action.suffix}`.trimEnd());
            }
            lines.push('(end)');
            display.clearScreen();
            display.renderMap(game.map, player, game.fov, flags);
            for (let i = 0; i < lines.length && i < display.rows; i++) {
                const text = lines[i].substring(0, Math.max(0, display.cols - 41));
                const attr = (i === 0) ? 1 : 0;
                display.putstr(41, i, ' '.repeat(Math.max(0, display.cols - 41)));
                display.putstr(41, i, text, undefined, attr);
            }

            const ch = await nhgetch();
            const c = String.fromCharCode(ch).toLowerCase();
            if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
                return;
            }
            const action = actions.find((entry) => entry.key === c);
            if (!action) continue;
            if (selected.has(action.token)) selected.delete(action.token);
            else selected.add(action.token);
            saveSelected(selected);
        }
    }

    async function editPickupTypesOption() {
        const choices = [
            { key: 'a', glyph: '$', symbol: '$', label: 'pile of coins' },
            { key: 'b', glyph: '"', symbol: '"', label: 'amulet' },
            { key: 'c', glyph: ')', symbol: ')', label: 'weapon' },
            { key: 'd', glyph: '[', symbol: '[', label: 'suit or piece of armor' },
            { key: 'e', glyph: '%', symbol: '%', label: 'piece of food' },
            { key: 'f', glyph: '?', symbol: '?', label: 'scroll' },
            { key: 'g', glyph: '+', symbol: '+', label: 'spellbook' },
            { key: 'h', glyph: '!', symbol: '!', label: 'potion' },
            { key: 'i', glyph: '=', symbol: '=', label: 'ring' },
            { key: 'j', glyph: '/', symbol: '/', label: 'wand' },
            { key: 'k', glyph: '(', symbol: '(', label: 'useful item (pick-axe, key, lamp...)' },
            { key: 'l', glyph: '*', symbol: '*', label: 'gem or rock' },
            { key: 'm', glyph: '`', symbol: '`', label: 'boulder or statue' },
            { key: 'n', glyph: '0', symbol: '0', label: 'iron ball' },
            { key: 'o', glyph: '_', symbol: '_', label: 'iron chain' },
        ];
        const symbolOrder = new Map(choices.map((choice, idx) => [choice.symbol, idx]));

        const parseTypes = () => {
            const raw = String(flags.pickup_types || '');
            if (!raw) return new Set();
            return new Set(raw.split(''));
        };

        const saveTypes = (set) => {
            const sorted = Array.from(set).sort((a, b) =>
                (symbolOrder.get(a) ?? 999) - (symbolOrder.get(b) ?? 999));
            flags.pickup_types = sorted.join('');
            saveFlags(flags);
        };

        while (true) {
            const selected = parseTypes();
            const lines = ['Autopickup what?', ''];
            for (const choice of choices) {
                const mark = selected.has(choice.symbol) ? '+' : '-';
                lines.push(`${choice.key} ${mark} ${choice.glyph}  ${choice.label}`);
            }
            lines.push('');
            lines.push('A -    All classes of objects');
            lines.push('Note: when no choices are selected, "all" is implied.');
            lines.push("Toggle off 'autopickup' to not pick up anything.");
            lines.push('(end)');
            display.clearScreen();
            display.renderMap(game.map, player, game.fov, flags);
            // Session captures for this menu are column-shifted by one map cell.
            // Apply that shift in headless parity mode before drawing the right panel.
            if (Array.isArray(display.grid) && Array.isArray(display.colors) && Array.isArray(display.attrs)) {
                for (let row = 1; row <= 21 && row < display.rows; row++) {
                    for (let col = 0; col < display.cols - 1; col++) {
                        display.grid[row][col] = display.grid[row][col + 1];
                        display.colors[row][col] = display.colors[row][col + 1];
                        display.attrs[row][col] = display.attrs[row][col + 1];
                    }
                    display.grid[row][display.cols - 1] = ' ';
                    display.colors[row][display.cols - 1] = 7;
                    display.attrs[row][display.cols - 1] = 0;
                }
            }
            for (let i = 0; i < lines.length && i < display.rows; i++) {
                const text = lines[i].substring(0, Math.max(0, display.cols - 25));
                const attr = (i === 0) ? 1 : 0;
                display.putstr(24, i, ' '.repeat(Math.max(0, display.cols - 24)));
                display.putstr(25, i, text, undefined, attr);
            }

            const ch = await nhgetch();
            const c = String.fromCharCode(ch);
            if (ch === 27 || ch === 10 || ch === 13 || c === ' ' || c === 'q' || c === 'x') {
                return;
            }
            if (c === 'A') {
                selected.clear();
                saveTypes(selected);
                continue;
            }
            const choice = choices.find((entry) => entry.key === c);
            if (!choice) continue;
            if (selected.has(choice.symbol)) selected.delete(choice.symbol);
            else selected.add(choice.symbol);
            saveTypes(selected);
        }
    }

    // Interactive loop - C ref: options.c doset() menu loop
    while (true) {
        drawOptions();

        // Get input - C ref: options.c menu input loop
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        // Check for exit
        if (ch === 27 || ch === 10 || ch === 13 || c === 'q') { // ESC, Enter, or q
            break;
        }

        // Check for navigation - C ref: MENU_NEXT_PAGE, MENU_PREVIOUS_PAGE, MENU_FIRST_PAGE
        if (c === '>') {
            const maxPage = getTotalPages(showHelp);
            if (currentPage < maxPage) currentPage += 1;
            continue;
        }
        if (c === '<') {
            if (currentPage > 1) currentPage -= 1;
            continue;
        }
        if (c === '^') {
            currentPage = 1;
            continue;
        }
        if (c === '?') {
            showHelp = !showHelp;
            currentPage = normalizeOptionsPage(currentPage, showHelp);
            continue;
        }

        // Check for option selection
        const selected = getOptionByKey(currentPage, showHelp, c);
        if (selected) {
            if (selected.flag === 'number_pad') {
                await editNumberPadModeOption();
                continue;
            }
            if (selected.flag === 'autounlock') {
                await editAutounlockOption();
                currentPage = 1;
                showHelp = false;
                continue;
            }
            if (selected.flag === 'pickup_types') {
                await editPickupTypesOption();
                currentPage = 1;
                showHelp = false;
                continue;
            }
            if (selected.type === 'bool') {
                setOptionValue(currentPage, showHelp, c, null, flags);
                applyOptionSideEffects();
                continue;
            }

            if (selected.type === 'count') {
                if (selected.flag === 'statusconditions') {
                    await editStatusConditionsOption();
                    currentPage = 1;
                    showHelp = false;
                } else if (selected.flag === 'statushighlights') {
                    await editStatusHilitesOption();
                    currentPage = 1;
                    showHelp = false;
                } else {
                    await editDoWhatCountOption(selected);
                    currentPage = 1;
                    showHelp = false;
                }
                continue;
            }

            const prompt = `Set ${selected.name} to what? `;
            const newValue = await getlin(prompt, display);
            if (newValue !== null) {
                setOptionValue(currentPage, showHelp, c, newValue, flags);
                if (selected.flag === 'name') {
                    player.name = flags.name;
                }
                applyOptionSideEffects();
            }
        }
        // If invalid key, just loop again (menu stays open, no error message)
    }

    // Restore game display after exiting menu
    // Clear screen first to remove all menu text
    display.clearScreen();
    display.renderMap(game.map, player, game.fov, flags);
    display.renderStatus(player);

    return { moved: false, tookTime: false };
}
