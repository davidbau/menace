/**
 * NetHack Options Menu
 *
 * Interactive two-page options menu matching C NetHack 3.7 exactly.
 * Displays current option values and allows toggling.
 */

import { saveFlags, DEFAULT_FLAGS } from './storage.js';

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
