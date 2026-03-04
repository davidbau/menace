// look.js -- Look/whatis core
// C refs: pager.c do_look(), do_screen_description(), dowhatis(), doquickwhatis()

import {
    STAIRS, LADDER, FOUNTAIN, SINK, THRONE, ALTAR, GRAVE, POOL, LAVAPOOL,
    DOOR, IRONBARS, TREE, CORR, SCORR, ICE,
} from './config.js';
import { set_getpos_context, getpos_async } from './getpos.js';
import { nhgetch } from './input.js';
import { def_monsyms } from './symbols.js';
import { x_monnam } from './mondata.js';
import { engr_at, can_reach_floor } from './engrave.js';

const LOOK_ONCE = 1;
const LOOK_VERBOSE = 3;

// C ref: dat/help symbol legend (reduced table used by '/' typed-symbol path).
const SYMBOL_DESCRIPTIONS = {
    '-': 'wall of a room, or an open door',
    '|': 'wall of a room, or an open door',
    '.': 'floor of a room, or a doorway',
    '#': 'a corridor, or iron bars, or a tree',
    '>': 'stairs down: a way to the next level',
    '<': 'stairs up: a way to the previous level',
    '@': 'you (usually), or another human',
    ')': 'a weapon',
    '[': 'a suit or piece of armor',
    '%': 'something edible (not necessarily healthy)',
    '/': 'a wand',
    '=': 'a ring',
    '?': 'a scroll',
    '!': 'a potion',
    '(': 'a useful item (pick-axe, key, lamp...)',
    '$': 'a pile of gold',
    '*': 'a gem or rock',
    '+': 'a closed door, or a spellbook',
    '^': 'a trap (once you detect it)',
    '"': 'an amulet, or a spider web',
    '0': 'an iron ball',
    '_': 'an altar, or an iron chain',
    '{': 'a fountain',
    '}': 'a pool of water or moat or lava',
    '\\': 'an opulent throne',
    '`': 'a boulder or statue',
    ' ': 'dark part of a room, or solid rock',
    '\u00b7': 'floor of a room (middle dot)',
};

function terrain_here_description(loc, ctx = {}) {
    if (!loc) return '';
    const player = ctx.player || null;
    const map = ctx.map || null;
    const dnum = Number.isInteger(player?.dnum)
        ? player.dnum
        : (Number.isInteger(map?._genDnum) ? map._genDnum : undefined);
    const depth = Number.isInteger(player?.dungeonLevel) ? player.dungeonLevel : undefined;
    const outOfDungeonExit = (loc.typ === STAIRS && loc.flags === 1 && dnum === 0 && depth === 1);
    if (outOfDungeonExit) return 'There is a staircase up out of the dungeon here.';
    if (loc.typ === STAIRS && loc.flags === 1) return 'There is a staircase up here.';
    if (loc.typ === STAIRS && loc.flags === 0) return 'There is a staircase down here.';
    if (loc.typ === LADDER && loc.flags === 1) return 'There is a ladder up here.';
    if (loc.typ === LADDER && loc.flags === 0) return 'There is a ladder down here.';
    if (loc.typ === FOUNTAIN) return 'There is a fountain here.';
    if (loc.typ === SINK) return 'There is a sink here.';
    if (loc.typ === THRONE) return 'There is a throne here.';
    if (loc.typ === ALTAR) return 'There is an altar here.';
    if (loc.typ === GRAVE) return 'There is a grave here.';
    if (loc.typ === POOL) return 'There is a pool of water here.';
    if (loc.typ === LAVAPOOL) return 'There is molten lava here.';
    if (loc.typ === DOOR && loc.flags > 0) return 'There is an open door here.';
    if (loc.typ === DOOR && loc.flags === 0) return 'There is a closed door here.';
    if (loc.typ === IRONBARS) return 'There are iron bars here.';
    if (loc.typ === TREE) return 'There is a tree here.';
    return '';
}

function monster_class_desc(mon) {
    const glyph = mon?.displayChar;
    if (!glyph) return '';
    const idx = glyph.charCodeAt(0);
    if (idx < 0 || idx >= def_monsyms.length) return '';
    return String(def_monsyms[idx]?.explain || '');
}

function look_object_name(obj) {
    if (!obj) return 'object';
    if (typeof obj.name === 'string' && obj.name.length) return obj.name;
    if (typeof obj.dname === 'string' && obj.dname.length) return obj.dname;
    if (typeof obj.oc_name === 'string' && obj.oc_name.length) return obj.oc_name;
    return 'object';
}

function escapeHtml(text) {
    return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// C ref: pager.c do_screen_description() -- reduced structural port.
export function do_screen_description(ctx, cc) {
    const map = ctx?.map;
    const player = ctx?.player;
    if (!map || !cc) {
        return { found: false, firstmatch: '', outStr: '', text: '', kind: 'none' };
    }
    const x = Number(cc.x);
    const y = Number(cc.y);

    if (player && x === player.x && y === player.y) {
        return { found: true, firstmatch: 'you', outStr: '', text: 'you', kind: 'hero' };
    }

    const mon = map.monsterAt ? map.monsterAt(x, y) : null;
    if (mon) {
        const firstmatch = x_monnam(mon, { article: 'none' });
        const classDesc = monster_class_desc(mon);
        const outStr = classDesc ? `(${classDesc})` : '';
        return {
            found: true,
            firstmatch,
            outStr,
            text: outStr ? `${firstmatch} ${outStr}` : firstmatch,
            kind: 'monster',
            classDesc,
        };
    }

    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    if (objs.length > 0) {
        const topObj = objs[objs.length - 1];
        const firstmatch = look_object_name(topObj);
        const outStr = objs.length > 1 ? `(+${objs.length - 1} more)` : '';
        return {
            found: true,
            firstmatch,
            outStr,
            text: outStr ? `${firstmatch} ${outStr}` : firstmatch,
            kind: 'object',
        };
    }

    const trap = map.trapAt ? map.trapAt(x, y) : null;
    if (trap && trap.tseen) {
        return { found: true, firstmatch: 'a trap', outStr: '', text: 'a trap', kind: 'trap' };
    }

    const loc = map.at ? map.at(x, y) : null;
    const terrain = terrain_here_description(loc, { map, player });
    if (terrain) {
        return { found: true, firstmatch: terrain, outStr: '', text: terrain, kind: 'terrain' };
    }

    return { found: false, firstmatch: '', outStr: '', text: '', kind: 'none' };
}

// Sync helper used by hover/details callers.
export function do_lookat(ctx, target = null) {
    const player = ctx?.player;
    const cc = target || { x: player?.x, y: player?.y };
    const desc = do_screen_description(ctx, cc);
    if (desc.found) return desc;
    return {
        found: true,
        firstmatch: 'You see no objects here.',
        outStr: '',
        text: 'You see no objects here.',
        kind: 'none',
    };
}

async function do_look_symbol(display, symChar) {
    if ((symChar >= 'a' && symChar <= 'z') || (symChar >= 'A' && symChar <= 'Z')) {
        await display.putstr_message(`'${symChar}': a monster (or straddling the letter range).`);
    } else if (SYMBOL_DESCRIPTIONS[symChar]) {
        await display.putstr_message(`'${symChar}': ${SYMBOL_DESCRIPTIONS[symChar]}.`);
    } else {
        await display.putstr_message(`I don't know what '${symChar}' represents.`);
    }
}

// C ref: pager.c do_look(mode, click_cc) -- partial structural port.
export async function do_look(game, mode = 0, click_cc = null) {
    const { map, player, display, flags } = game || {};
    if (!map || !player || !display) return { moved: false, tookTime: false };

    const quick = (mode === 1);
    const clicklook = (mode === 2);
    let from_screen = false;
    let sym = null;
    const cc = clicklook && click_cc ? { x: click_cc.x, y: click_cc.y } : { x: player.x, y: player.y };
    let ans = 0;

    if (!clicklook) {
        if (quick) {
            from_screen = true;
        } else {
            await display.putstr_message("What do you want to identify? [type a symbol, ';' for map, or ESC]");
            const ch = await nhgetch();
            if (ch === 27) return { moved: false, tookTime: false };
            const c = String.fromCharCode(ch);
            if (c === ';' || c === '/' || c === 'y') from_screen = true;
            else sym = c;
        }
    }

    do {
        if (from_screen || clicklook) {
            if (from_screen) {
                // C ref: pager.c do_look() always enters getpos() for map lookups;
                // quick mode still uses getpos, but with force=true.
                if (!quick && flags?.verbose) {
                    await display.putstr_message('Please move the cursor to a monster, object or location.');
                }
                set_getpos_context({ map, display, flags, goalPrompt: 'a monster, object or location', player });
                ans = await getpos_async(cc, quick, 'a monster, object or location');
                if (ans < 0 || cc.x < 0 || cc.y < 0) break;
            }
            const desc = do_screen_description({ map, player }, cc);
            if (desc.found) await display.putstr_message(desc.text);
            else await display.putstr_message("I've never heard of such things.");
        } else if (sym !== null) {
            await do_look_symbol(display, sym);
        }
    } while (from_screen && !quick && ans !== LOOK_ONCE && ans !== LOOK_VERBOSE && !clicklook);

    return { moved: false, tookTime: false };
}

// C refs: pager.c dowhatis(), doquickwhatis()
export async function dowhatis(game) {
    return await do_look(game, 0, null);
}

export async function doquickwhatis(game) {
    return await do_look(game, 1, null);
}

// UI adapter: style do_look output without changing core text semantics.
export function format_do_look_html(desc) {
    const first = escapeHtml(desc?.firstmatch || '');
    const out = escapeHtml(desc?.outStr || '');
    return {
        nameText: desc?.firstmatch || '',
        descText: desc?.outStr || '',
        nameHtml: first ? `<strong>${first}</strong>` : '',
        descHtml: out,
    };
}

// C ref: invent.c look_here() style message used for ':' command.
function build_dolook_message(ctx) {
    const map = ctx?.map;
    const player = ctx?.player;
    if (!map || !player) return 'You see no objects here.';

    const loc = map.at ? map.at(player.x, player.y) : null;
    const objs = map.objectsAt ? map.objectsAt(player.x, player.y) : [];
    const terrain = terrain_here_description(loc, { map, player });
    const objText = (objs.length > 0)
        ? `Things that are here: ${objs.map(o => look_object_name(o)).join(', ')}`
        : '';

    if (terrain && objText) return `${terrain} ${objText}`.trim();
    if (terrain) return terrain;
    if (objText) return objText;
    return 'You see no objects here.';
}

// C ref: invent.c dolook() → look_here() → read_engr_at()
// Shows engraving type message, pauses for --More--, then shows engraving text.
// This matches C's tty multi-message sequence that produces --More-- between lines.
export async function dolook(game) {
    const { map, player, display } = game || {};
    if (!display) return { moved: false, tookTime: false };

    if (map && player) {
        const ep = engr_at(map, player.x, player.y);
        if (ep && ep.text) {
            const loc = map.at ? map.at(player.x, player.y) : null;
            const onIce = !!(loc && loc.typ === ICE);
            const blind = !!(player.blind);
            let sensed = false;
            let typeMsg = '';

            switch (ep.type) {
            case 'dust':
                if (!blind) {
                    sensed = true;
                    typeMsg = `Something is written here in the ${onIce ? 'frost' : 'dust'}.`;
                }
                break;
            case 'engrave':
            case 'headstone':
                if (!blind || can_reach_floor(player, map)) {
                    sensed = true;
                    typeMsg = 'Something is engraved here on the floor.';
                }
                break;
            case 'burn':
                if (!blind || can_reach_floor(player, map)) {
                    sensed = true;
                    typeMsg = `Some text has been ${onIce ? 'melted' : 'burned'} into the floor here.`;
                }
                break;
            case 'mark':
                if (!blind) {
                    sensed = true;
                    typeMsg = "There's some graffiti on the floor here.";
                }
                break;
            case 'blood':
                if (!blind) {
                    sensed = true;
                    typeMsg = 'You see a message scrawled in blood here.';
                }
                break;
            default:
                sensed = true;
                typeMsg = 'Something is written in a very strange way.';
                break;
            }

            if (sensed) {
                // C tty appends "--More--" to the topline before blocking on the
                // next keypress; render the marker so captured screen comparisons match.
                // C ref: win/tty/topl.c tmore(), pager.c dolook() flow.
                await display.putstr_message(typeMsg);
                if (typeof display.renderMoreMarker === 'function') display.renderMoreMarker();
                await display.morePrompt(nhgetch);
                const et = ep.text;
                const endpunct = (et.length >= 2 && '.!?'.includes(et[et.length - 1])) ? '' : '.';
                await display.putstr_message(`You ${blind ? 'feel the words' : 'read'}: "${et}"${endpunct}`);
                ep.eread = true;
                ep.erevealed = true;
            }
        }
    }

    await display.putstr_message(String(build_dolook_message({ map, player }) || '').substring(0, 79));
    return { moved: false, tookTime: false };
}

export function is_corridor_like(loc) {
    return !!loc && (loc.typ === CORR || loc.typ === SCORR);
}
