// engrave.js -- Engraving mechanics: Elbereth, write, tombstones
// cf. engrave.c — random_engraving, wipeout_text, can_reach_floor,
//                 cant_reach_floor, engr_at, sengr_at, u_wipe_engr,
//                 wipe_engr_at, engr_can_be_felt, read_engr_at,
//                 make_engr_at, del_engr_at, freehand, stylus_ok,
//                 u_can_engrave, doengrave_ctx_init, doengrave_sfx_item_WAN,
//                 doengrave_sfx_item, doengrave_ctx_verb, doengrave,
//                 engrave, blengr, sanitize_engravings, forget_engravings,
//                 engraving_sanity_check, save_engravings, rest_engravings,
//                 engr_stats, del_engr, rloc_engr, make_grave,
//                 disturb_grave, see_engraving, feel_engraving
//
// engrave.c handles all engraving mechanics:
//   doengrave(): the #engrave command — select stylus, prompt text, start occupation.
//   engrave(): occupation callback that engraves char by char.
//   make_engr_at(): create a new engraving at a location.
//   sengr_at("Elbereth",...): detect protective Elbereth engravings.
//   make_grave/disturb_grave: grave creation and disturbance.
//   save/rest_engravings: persistence across level changes.

import { pushRngLogEntry, rn2, rnd } from './rng.js';
import { nhgetch } from './input.js';
import { WAND_CLASS } from './objects.js';
import { compactInvletPromptChars } from './invent.js';

// C engraving type constants (engrave.h):
// DUST=1, ENGRAVE=2, BURN=3, MARK=4, ENGR_BLOOD=5, HEADSTONE=6
const ENGR_TYPE_MAP = {
    dust: 1, engrave: 2, burn: 3, mark: 4, blood: 5, headstone: 6,
};

function engrTypeNum(type) {
    return ENGR_TYPE_MAP[type] || 0;
}

// cf. engrave.c:408 — make_engr_at(x, y, s, pristine_s, e_time, e_type)
// Centralized engraving creation. Replaces any existing engraving at location.
export function make_engr_at(map, x, y, text, type, opts = {}) {
    if (!map || !Array.isArray(map.engravings)) return;
    // C ref: make_engr_at replaces existing engraving at location.
    del_engr(map, x, y);
    const engr = {
        x, y,
        type: type || 'dust',
        text: text || '',
        guardobjects: !!opts.guardobjects,
        nowipeout: !!opts.nowipeout,
    };
    if (opts.degrade !== undefined) engr.degrade = opts.degrade;
    map.engravings.push(engr);
    pushRngLogEntry(`^engr[${engrTypeNum(engr.type)},${x},${y}]`);
    return engr;
}

// cf. engrave.c:1644 — del_engr(ep)
// Centralized engraving deletion. Removes engraving at (x,y).
export function del_engr(map, x, y) {
    if (!map || !Array.isArray(map.engravings)) return;
    const idx = map.engravings.findIndex(e => e && e.x === x && e.y === y);
    if (idx >= 0) {
        pushRngLogEntry(`^dengr[${x},${y}]`);
        map.engravings.splice(idx, 1);
    }
}

// C ref: engrave.c:120 — wipeout_text(engr, cnt, seed=0)
// Degrades cnt characters in engraving string via character rubout.
// Each iteration consumes rn2(lth) + rn2(4), plus rn2(ln) if rubout match found.
const RUBOUTS = {
    'A': "V", 'B': "Pb", 'C': "(", 'D': "|)", 'E': "FL",
    'F': "|-", 'G': "C", 'H': "|-", 'I': "|", 'K': "|<",
    'L': "|_", 'M': "|", 'N': "|\\", 'O': "C(", 'P': "F",
    'Q': "C(", 'R': "PF", 'T': "|", 'U': "J", 'V': "/\\",
    'W': "V/\\", 'Z': "/",
    'b': "|", 'd': "c|", 'e': "c", 'g': "c", 'h': "n",
    'j': "i", 'k': "|", 'l': "|", 'm': "nr", 'n': "r",
    'o': "c", 'q': "c", 'w': "v", 'y': "v",
    ':': ".", ';': ",:", ',': ".", '=': "-", '+': "-|",
    '*': "+", '@': "0", '0': "C(", '1': "|", '6': "o",
    '7': "/", '8': "3o",
};

function wipeoutEngravingText(text, cnt) {
    if (!text || cnt <= 0) return text || '';
    const chars = text.split('');
    const lth = chars.length;
    if (!lth) return text;
    while (cnt-- > 0) {
        const nxt = rn2(lth);
        const use_rubout = rn2(4);
        const ch = chars[nxt];
        if (ch === ' ') continue;
        if ("?.,'`-|_".includes(ch)) {
            chars[nxt] = ' ';
            continue;
        }
        if (use_rubout && RUBOUTS[ch]) {
            const wipeto = RUBOUTS[ch];
            const j = rn2(wipeto.length);
            chars[nxt] = wipeto[j];
        } else {
            chars[nxt] = '?';
        }
    }
    return chars.join('');
}

// cf. engrave.c:271 — wipe_engr_at(x, y, cnt, magical)
// Centralized engraving wiping/erosion.
export function wipe_engr_at(map, x, y, cnt, magical = false) {
    if (!map || !Array.isArray(map.engravings)) return;
    // C ref: event_log("wipe[%d,%d]") is unconditional — logged even when
    // no engraving exists at (x,y). This matches C's wipe_engr_at which
    // calls event_log() before checking if ep is non-NULL.
    pushRngLogEntry(`^wipe[${x},${y}]`);
    const idx = map.engravings.findIndex((e) => e && e.x === x && e.y === y);
    if (idx < 0) return;
    const engr = map.engravings[idx];
    if (!engr || engr.type === 'headstone' || engr.nowipeout) return;
    const loc = map.at ? map.at(x, y) : null;
    const isIce = !!loc && loc.typ === 10; // ICE
    if (engr.type !== 'burn' || isIce || (magical && !rn2(2))) {
        let erase = cnt;
        if (engr.type !== 'dust' && engr.type !== 'blood') {
            erase = rn2(1 + Math.floor(50 / (cnt + 1))) ? 0 : 1;
        }
        if (erase > 0) {
            engr.text = wipeoutEngravingText(engr.text || '', erase).replace(/^ +/, '');
            if (!engr.text) {
                del_engr(map, x, y);
            }
        }
    }
}

// cf. engrave.c:51 — random_engraving(outbuf, pristine_copy): random engraving text
// Selects random engraving text from rumors or engrave file; degrades it.
// TODO: engrave.c:51 — random_engraving(): random engraving selection

// cf. engrave.c:187 — can_reach_floor(check_pit): can reach floor?
// Returns TRUE if hero can reach floor (not levitating, swallowed, stuck, etc.).
// TODO: engrave.c:187 — can_reach_floor(): floor reach check

// cf. engrave.c:218 — cant_reach_floor(x, y, up, check_pit, wand_engraving): explain unreachable
// Prints message explaining why hero can't reach floor or ceiling.
// TODO: engrave.c:218 — cant_reach_floor(): unreachable floor message

// cf. engrave.c:231 — engr_at(x, y): engraving at location
// Returns engraving struct at given coordinates, or null if none.
export function engr_at(map, x, y) {
    if (!map || !Array.isArray(map.engravings)) return null;
    return map.engravings.find((e) => e && e.x === x && e.y === y) || null;
}

// cf. engrave.c:251 — sengr_at(s, x, y, strict): find engraving with string
// Finds engraving at location containing string s (substring or exact match).
// TODO: engrave.c:251 — sengr_at(): engraving string search

// cf. engrave.c:264 — u_wipe_engr(cnt): wipe engraving at hero's location
// Wipes cnt characters from engraving at hero's position if reachable.
// TODO: engrave.c:264 — u_wipe_engr(): hero position engraving wipe

// cf. engrave.c:297 — engr_can_be_felt(ep): engraving can be felt?
// Returns TRUE if engraving type can be detected by blind characters.
// TODO: engrave.c:297 — engr_can_be_felt(): tactile engrave check

// cf. engrave.c:318 — read_engr_at(x, y): display engraving text
// Shows engraving text at location with appropriate sense message.
// TODO: engrave.c:318 — read_engr_at(): engraving text display

// cf. engrave.c:473 — freehand(void): player has free hand?
// Returns TRUE if player has a free hand to engrave with.
// TODO: engrave.c:473 — freehand(): free hand check

// cf. engrave.c:481 [static] — stylus_ok(obj): object is engraving stylus?
// Filter callback for getobj; rates objects as suitable engraving tools.
// TODO: engrave.c:481 — stylus_ok(): engraving tool filter

// cf. engrave.c:503 [static] — u_can_engrave(void): player can engrave?
// Checks if player is at a valid location for engraving.
// TODO: engrave.c:503 — u_can_engrave(): engrave location check

// cf. engrave.c:545 [static] — doengrave_ctx_init(de): init engrave context
// Initializes doengrave context structure with defaults.
// TODO: engrave.c:545 — doengrave_ctx_init(): engrave context initialization

// cf. engrave.c:583 [static] — doengrave_sfx_item_WAN(de): wand engraving effects
// Handles special wand effects during engraving (fire, lightning, digging, etc.).
// TODO: engrave.c:583 — doengrave_sfx_item_WAN(): wand engrave special effects

// cf. engrave.c:741 [static] — doengrave_sfx_item(de): object engraving effects
// Handles special effects for all object types used for engraving.
// TODO: engrave.c:741 — doengrave_sfx_item(): engrave object effects

// cf. engrave.c:895 [static] — doengrave_ctx_verb(de): engrave verb selection
// Sets verb phrasing for engraving prompt (write/engrave/burn/melt/scrawl).
// TODO: engrave.c:895 — doengrave_ctx_verb(): engrave verb

// cf. engrave.c:955 — doengrave(void): #engrave command handler
// Selects stylus, prompts for text, handles effects, starts engraving occupation.
// PARTIAL: engrave.c:955 — doengrave() ↔ handleEngrave()
export async function handleEngrave(player, display) {
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const writeLetters = compactInvletPromptChars((player.inventory || [])
        .filter((item) => item && item.oclass === WAND_CLASS && item.invlet)
        .map((item) => item.invlet)
        .join(''));
    if (writeLetters) {
        display.putstr_message(`What do you want to write with? [- ${writeLetters} or ?*]`);
    } else {
        display.putstr_message('What do you want to write with? [- or ?*]');
    }
    while (true) {
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);
        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage();
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') continue;
        if (c === '-' || (writeLetters && writeLetters.includes(c))) {
            replacePromptMessage();
            display.putstr_message('Engraving is not implemented yet.');
            return { moved: false, tookTime: false };
        }
        // Keep prompt active for unsupported letters.
    }
}

// cf. engrave.c:1266 — engrave(void): engraving occupation callback
// Gradually engraves text char by char; handles stylus wear and marker ink.
// TODO: engrave.c:1266 — engrave(): engrave occupation callback

// cf. engrave.c:1764 [static] — blengr(void): blind engraving text
// Returns encrypted blind-writing text for blind player engraving attempts.
// TODO: engrave.c:1764 — blengr(): blind engraving text

// cf. engrave.c:1497 — sanitize_engravings(void): remove control chars
// Removes terminal-disrupting characters from engravings when loading bones.
// TODO: engrave.c:1497 — sanitize_engravings(): engraving sanitization

// cf. engrave.c:1508 — forget_engravings(void): mark engravings as unread
// Marks all engravings as unseen/unread before saving bones.
// TODO: engrave.c:1508 — forget_engravings(): engraving reset for bones

// cf. engrave.c:1523 — engraving_sanity_check(void): validate engravings
// Checks all engravings have legal locations and accessible terrain.
// TODO: engrave.c:1523 — engraving_sanity_check(): engraving validation

// cf. engrave.c:1550 — save_engravings(nhfp): serialize engravings
// Writes engraving structures to save file.
// N/A: engrave.c:1550 — save_engravings() (JS uses storage.js)

// cf. engrave.c:1583 — rest_engravings(nhfp): deserialize engravings
// Reads engravings from save file.
// N/A: engrave.c:1583 — rest_engravings() (JS uses storage.js)

// cf. engrave.c:1625 — engr_stats(hdrfmt, hdrbuf, count, size): engraving stats
// Calculates memory usage statistics for engraving data.
// TODO: engrave.c:1625 — engr_stats(): engraving memory stats

// cf. engrave.c:1666 — rloc_engr(ep): relocate engraving randomly
// Moves engraving to a new valid location on the level.
// TODO: engrave.c:1666 — rloc_engr(): engraving relocation

// cf. engrave.c:1686 — make_grave(x, y, str): create headstone
// Creates headstone at location with epitaph text.
// TODO: engrave.c:1686 — make_grave(): headstone creation

// cf. engrave.c:1706 — disturb_grave(x, y): disturb a grave
// Summons ghoul when grave is disturbed by engraving or kicking.
// TODO: engrave.c:1706 — disturb_grave(): grave disturbance

// cf. engrave.c:1723 — see_engraving(ep): update engraving display
// Updates display symbol at engraving location.
// TODO: engrave.c:1723 — see_engraving(): engraving display update

// cf. engrave.c:1731 — feel_engraving(ep): feel engraving (blind)
// Marks engraving as read/revealed for engravings detectable by touch.
// TODO: engrave.c:1731 — feel_engraving(): tactile engraving detection

// C ref: hack.c:3001-3012 maybe_smudge_engr()
// On successful movement, attempt to smudge engravings at origin/destination.
// C: checks can_reach_floor(TRUE), then wipes at old pos and new pos if engravings exist.
export function maybeSmudgeEngraving(map, x1, y1, x2, y2) {
    // C ref: if ((ep = engr_at(x1,y1)) && ep->engr_type != HEADSTONE)
    //            wipe_engr_at(x1, y1, rnd(5), FALSE);
    const ep1 = engr_at(map, x1, y1);
    if (ep1 && ep1.type !== 'headstone') {
        wipe_engr_at(map, x1, y1, rnd(5), false);
    }
    // C ref: if ((x2!=x1 || y2!=y1) && (ep = engr_at(x2,y2)) && ep->engr_type != HEADSTONE)
    //            wipe_engr_at(x2, y2, rnd(5), FALSE);
    if ((x2 !== x1 || y2 !== y1)) {
        const ep2 = engr_at(map, x2, y2);
        if (ep2 && ep2.type !== 'headstone') {
            wipe_engr_at(map, x2, y2, rnd(5), false);
        }
    }
}
