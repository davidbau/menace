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

import { pushRngLogEntry, rn1, rn2, rnd, withRngTag } from './rng.js';
import { nhgetch_wrap } from './input.js';
import { WAND_CLASS } from './objects.js';
import { compactInvletPromptChars, buildInventoryOverlayLines, renderOverlayMenuUntilDismiss } from './invent.js';
import { pline, You, You_cant, impossible, You_see } from './pline.js';
import {
    COLNO, ROWNO, ROOM, GRAVE, FOUNTAIN, ICE,
    ACCESSIBLE, is_hole, is_pit, isok,
} from './const.js';
import { is_lava, is_pool, is_pool_or_lava } from './dbridge.js';
import { IS_GRAVE, IS_AIR } from './const.js';
import { newsym } from './display.js';
import { goodpos } from './teleport.js';
import { makemon } from './makemon.js';
import { exercise } from './attrib_exercise.js';
import { t_at } from './trap.js';
import { attacktype, ceiling_hider, sticks } from './mondata.js';
import { AT_HUGS, MZ_HUGE } from './monsters.js';
import { envFlag } from './runtime_env.js';
import { awaitInput } from './suspend.js';

function engrTraceEnabled() {
    return envFlag('WEBHACK_ENGR_TRACE');
}

function engrTrace(...args) {
    if (!engrTraceEnabled()) return;
    console.log('[ENGR_TRACE]', ...args);
}

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

// cf. engrave.c:461 — del_engr_at(x, y)
// Deletes any engraving at location (x,y). Convenience wrapper around del_engr.
// Autotranslated from engrave.c:462
export function del_engr_at(mapOrX, xOrY, yMaybe) {
    let map = null;
    let x = null;
    let y = null;

    if (mapOrX && Array.isArray(mapOrX.engravings)) {
        map = mapOrX;
        x = xOrY;
        y = yMaybe;
    } else if (yMaybe && Array.isArray(yMaybe.engravings)) {
        x = mapOrX;
        y = xOrY;
        map = yMaybe;
    } else {
        return;
    }

    if (!Number.isInteger(x) || !Number.isInteger(y)) return;
    const ep = engr_at(map, x, y);
    if (ep) del_engr(map, x, y);
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
    // C ref: engrave.c wipeout_text() trims trailing spaces.
    while (chars.length > 0 && chars[chars.length - 1] === ' ') {
        chars.pop();
    }
    return chars.join('');
}

// cf. engrave.c:271 — wipe_engr_at(x, y, cnt, magical)
// Centralized engraving wiping/erosion.
export async function wipe_engr_at(map, x, y, cnt, magical = false) {
    if (!map || !Array.isArray(map.engravings)) return;
    const step = Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?';
    await withRngTag('wipe_engr_at(engrave.js:139)', () => {
        // C ref: engrave.c:276 — event_log only when ep && !HEADSTONE && !nowipeout.
        const idx = map.engravings.findIndex((e) => e && e.x === x && e.y === y);
        if (idx < 0) {
            engrTrace(`step=${step}`, `wipe_at(${x},${y})`, `cnt=${cnt}`, `magical=${magical ? 1 : 0}`, 'engr=none');
            return;
        }
        const engr = map.engravings[idx];
        if (!engr || engr.type === 'headstone' || engr.nowipeout) {
            engrTrace(`step=${step}`, `wipe_at(${x},${y})`, `cnt=${cnt}`, `magical=${magical ? 1 : 0}`,
                `engr=${engr ? engr.type : 'null'}`, `nowipeout=${engr?.nowipeout ? 1 : 0}`, 'skip=1');
            return;
        }
        pushRngLogEntry(`^wipe[${x},${y}]`);  // C ref: engrave.c:277
        engrTrace(`step=${step}`, `wipe_at(${x},${y})`, `cnt=${cnt}`, `magical=${magical ? 1 : 0}`,
            `engr=${engr.type}`, `len=${String(engr.text || '').length}`);
        const beforeText = String(engr.text || '');
        const loc = map.at ? map.at(x, y) : null;
        const isIce = !!loc && loc.typ === ICE;
        if (engr.type !== 'burn' || isIce || (magical && !rn2(2))) {
            let erase = cnt;
            if (engr.type !== 'dust' && engr.type !== 'blood') {
                erase = rn2(1 + Math.floor(50 / (cnt + 1))) ? 0 : 1;
            }
            if (erase > 0) {
                engr.text = wipeoutEngravingText(engr.text || '', erase);
                engrTrace(
                    `step=${step}`,
                    `wipe_text(${x},${y})`,
                    `before=${JSON.stringify(beforeText)}`,
                    `after=${JSON.stringify(String(engr.text || ''))}`
                );
                if (!engr.text) {
                    del_engr(map, x, y);
                }
            }
        }
    });
}

// cf. engrave.c:51 — random_engraving(outbuf, pristine_copy): random engraving text
// Selects random engraving text from rumors or engrave file; degrades it.
// NOTE: The actual RNG-consuming implementation is in dungeon.js as random_engraving_rng()
// because the engrave file data and rumor infrastructure live there.
// This is intentionally left as a reference stub.

// cf. engrave.c:187 — can_reach_floor(check_pit): can reach floor?
// Returns TRUE if hero can reach floor (not levitating, swallowed, stuck, etc.).
// C checks: uswallow, ustuck+AT_HUGS, Levitation, riding skill, ceiling_hider,
//           Flying/huge size, pit teetering.
// In JS the player properties for Levitation/Flying/etc. are not yet uniformly
// available, so this is a simplified version that covers the common cases.
export function can_reach_floor(player, map, check_pit = false) {
    if (!player) return true;
    const mapRef = map || player.lev || player.map || null;
    const youmonst = player.data || player.type || null;
    const stuckData = player.ustuck?.data || player.ustuck?.type || null;
    const levitation = !!(player.Levitation || player.levitating
        || player.inherentLevitation
        || ((player.uprops || {})[19]?.intrinsic)
        || ((player.uprops || {})[19]?.extrinsic));
    const isAirOrWaterLevel = !!(mapRef?.flags?.is_airlevel || mapRef?.flags?.is_waterlevel);

    // C ref: engrave.c can_reach_floor():
    //   Levitation blocks floor reach except on air/water levels.
    if (player.uswallow
        || (player.ustuck && !sticks(youmonst) && attacktype(stuckData, AT_HUGS))
        || (levitation && !isAirOrWaterLevel)) {
        return false;
    }
    // C checks riding skill; JS does not track full skill state here. Keep
    // prior conservative behavior: riders can't reach floor.
    if (player.usteed) return false;
    if (player.uundetected && ceiling_hider(youmonst)) return false;

    if (player.Flying || player.flying || (youmonst?.size >= MZ_HUGE)) {
        return true;
    }

    // C: if check_pit and hero is teetering at seen pit or just escaped shaft,
    // cannot reach floor.
    const trap = check_pit && mapRef ? t_at(player.x, player.y, mapRef) : null;
    if (trap?.tseen) {
        const heroInPit = !!player.utrap && (is_pit(trap.ttyp) || is_hole(trap.ttyp));
        if ((is_pit(trap.ttyp) && !heroInPit) || (is_hole(trap.ttyp) && !heroInPit)) {
            return false;
        }
    }

    return true;
}

// cf. engrave.c:218 — cant_reach_floor(x, y, up, check_pit, wand_engraving)
// Prints message explaining why hero can't reach floor or ceiling.
export async function cant_reach_floor(player, map, x, y, up, check_pit, wand_engraving) {
    const surface_name = "floor"; // simplified surface()
    const what = wand_engraving
        ? "The wand does nothing more, and the tip of the wand"
        : "You";
    if (up) {
        await pline("%s can't reach the ceiling.", what);
    } else {
        await pline("%s can't reach the %s.", what, surface_name);
    }
}

// cf. engrave.c:231 — engr_at(x, y): engraving at location
// Returns engraving struct at given coordinates, or null if none.
export function engr_at(map, x, y) {
    if (!map || !Array.isArray(map.engravings)) return null;
    return map.engravings.find((e) => e && e.x === x && e.y === y) || null;
}

// cf. engrave.c:251 — sengr_at(s, x, y, strict): find engraving with string
// Finds engraving at location containing string s (case-insensitive).
// If strict, requires exact match of entire text.
// Ignores headstones. In C also checks engr_time <= moves (not tracked in JS).
export function sengr_at(map, s, x, y, strict) {
    const ep = engr_at(map, x, y);
    if (ep && ep.type !== 'headstone') {
        const epText = (ep.text || '').toLowerCase();
        const searchText = (s || '').toLowerCase();
        if (strict) {
            if (epText === searchText) return ep;
        } else {
            if (epText.includes(searchText)) return ep;
        }
    }
    return null;
}

// cf. engrave.c:264 — u_wipe_engr(cnt): wipe engraving at hero's location
// Wipes cnt characters from engraving at hero's position if reachable.
export async function u_wipe_engr(player, map, cnt) {
    if (can_reach_floor(player, map, true)) await wipe_engr_at(map, player.x, player.y, cnt, false);
}

// cf. engrave.c:297 — engr_can_be_felt(ep): engraving can be felt?
// Returns TRUE if engraving type can be detected by blind characters.
export function engr_can_be_felt(ep) {
    if (!ep) return false;
    switch (ep.type) {
    case 'engrave':
    case 'headstone':
    case 'burn':
        return true;
    case 'dust':
    case 'mark':
    case 'blood':
    default:
        return false;
    }
}

// cf. engrave.c:318 — read_engr_at(x, y): display engraving text
// Shows engraving text at location with appropriate sense message.
function describe_readable_engraving(map, x, y, player) {
    const ep = engr_at(map, x, y);
    if (!ep || !ep.text) return null;

    const blind = !!(player && player.blind);
    let sensed = false;
    let typeMsg = null;

    const loc = map.at ? map.at(x, y) : null;
    const onIce = loc && loc.typ === ICE;

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
        impossible('Something is written in a very strange way.');
        sensed = true;
        typeMsg = 'Something is written in a very strange way.';
    }

    if (!sensed) return null;
    const et = ep.text;
    // C: check if last char is original punctuation
    const endpunct = (et.length >= 2 && ".!?".includes(et[et.length - 1]))
        ? "" : ".";
    const readMsg = `You ${blind ? 'feel the words' : 'read'}: "${et}"${endpunct}`;
    return { ep, typeMsg, readMsg };
}

export async function read_engr_at(map, x, y, player, game = null) {
    const info = describe_readable_engraving(map, x, y, player);
    if (!info) return;
    const { ep, typeMsg, readMsg } = info;
    engrTrace(
        `step=${Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?'}`,
        `read_engr_at(${x},${y})`,
        `type=${String(ep?.type || '')}`,
        `text=${JSON.stringify(String(ep?.text || ''))}`
    );
    await pline(typeMsg);
    // Match C topline flow for engraving reads: split into two prompts only
    // when both messages can't fit on one topline.
    // C tty message wrapping leaves less than a full 80 columns for
    // concatenated engraving readouts in practice; use a conservative threshold
    // so mid-length tutorial engravings split with --More-- like C captures.
    const needsMoreBetweenMessages = (String(typeMsg || '').length + 2 + String(readMsg || '').length) > 74;
    if (needsMoreBetweenMessages && game?.display && typeof game.display.morePrompt === 'function') {
        // C-parity for in-command engraving prompts: movement side effects have
        // already happened; refresh map/status before waiting for dismissal.
        if (typeof game.docrt === 'function') {
            game.docrt();
        }
        if (typeof game.display.renderMoreMarker === 'function') {
            game.display.renderMoreMarker();
        }
        while (true) {
            const ch = await awaitInput(game, nhgetch_wrap(), { site: 'engrave.read_engr_at.moreDismiss' });
            if (ch === 32 || ch === 13 || ch === 10 || ch === 27) break;
        }
        if (typeof game.display.clearRow === 'function') {
            game.display.clearRow(0);
        }
        if ('messageNeedsMore' in game.display) {
            game.display.messageNeedsMore = false;
        }
    }
    await pline(readMsg);
    ep.eread = true;
    ep.erevealed = true;
    // C ref: engrave.c read_engr_at() -> if (context.run > 0) nomul(0)
    // Stop run/rush traversal after stepping onto a readable engraving.
    const ctx = game?.svc?.context;
    if (ctx && Number(ctx.run || 0) > 0) {
        engrTrace(
            `step=${Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?'}`,
            `read_engr_at stop-run at (${x},${y})`,
            `text=${JSON.stringify(String(ep.text || '').slice(0, 80))}`
        );
        ctx.run = 0;
        if (game) game.running = false;
    }
}

// cf. engrave.c:473 — freehand(void): player has free hand?
// Returns TRUE if player has a free hand to engrave with.
export function freehand(player) {
    if (!player) return true;
    const uwep = player.weapon;
    if (!uwep) return true;
    // C: (!uwep || !welded(uwep) || (!bimanual(uwep) && (!uarms || !uarms->cursed)))
    // Simplified: if weapon is welded (cursed and worn), check bimanual
    if (uwep.cursed && uwep.owornmask) {
        // Welded weapon; check if bimanual
        if (uwep.bimanual) return false;
        // Not bimanual; check shield
        const uarms = player.shield;
        if (uarms && uarms.cursed) return false;
    }
    return true;
}

// cf. engrave.c:481 [static] — stylus_ok(obj): object is engraving stylus?
// Filter callback for getobj; rates objects as suitable engraving tools.
// In C returns GETOBJ_SUGGEST or GETOBJ_DOWNPLAY.
// In JS, returns true if the object is a suggested engraving tool.
export function stylus_ok(obj) {
    if (!obj) return true; // fingers
    if (obj.oclass === 'WEAPON_CLASS' || obj.oclass === WAND_CLASS
        || obj.oclass === 'GEM_CLASS' || obj.oclass === 'RING_CLASS')
        return true;
    if (obj.oclass === 'TOOL_CLASS'
        && (obj.otyp === 'TOWEL' || obj.otyp === 'MAGIC_MARKER'))
        return true;
    return false;
}

// cf. engrave.c:503 [static] — u_can_engrave(void): player can engrave?
// Checks if player is at a valid location for engraving.
async function u_can_engrave(player, map) {
    if (!player || !map) return false;
    const loc = map.at ? map.at(player.x, player.y) : null;
    if (!loc) return false;
    const levtyp = loc.typ;

    if (player.uswallow) {
        // C: is_animal / is_whirly checks
        return false;
    }
    if (is_lava(player.x, player.y, map)) {
        await You_cant("write on the lava!");
        return false;
    }
    if (is_pool(player.x, player.y, map) || levtyp === FOUNTAIN) {
        await You_cant("write on the water!");
        return false;
    }
    if (IS_AIR(levtyp)) {
        await You_cant("write in thin air!");
        return false;
    }
    if (!ACCESSIBLE(levtyp)) {
        await You_cant("write here.");
        return false;
    }
    return true;
}

// cf. engrave.c:545 [static] — doengrave_ctx_init(de): init engrave context
// Initializes doengrave context structure with defaults.
// In JS, returns a context object rather than mutating a struct pointer.
function doengrave_ctx_init(player, map) {
    const oep = engr_at(map, player.x, player.y);
    const loc = map.at ? map.at(player.x, player.y) : null;
    return {
        dengr: false,
        doblind: false,
        doknown: false,
        eow: false,
        ptext: true,
        teleengr: false,
        zapwand: false,
        disprefresh: false,
        adding: false,
        ret: 0, // ECMD_OK
        type: 'dust',
        oetype: oep ? oep.type : null,
        otmp: null,
        oep,
        buf: '',
        ebuf: '',
        post_engr_text: '',
        writer: null,
        everb: null,
        eloc: null,
        len: 0,
        jello: false,
        frosted: !!(loc && loc.typ === ICE),
    };
}

// cf. engrave.c:583 [static] — doengrave_sfx_item_WAN(de): wand engraving effects
// Handles special wand effects during engraving (fire, lightning, digging, etc.).
// NOTE: Full implementation requires wand infrastructure (zapnodir, wand types, etc.)
// that is not yet available. This is a stub that preserves the interface.
function doengrave_sfx_item_WAN(de) {
    // Stub: wand engraving effects not yet implemented
    // Would handle WAN_LIGHT, WAN_FIRE, WAN_DIGGING, etc.
}

// cf. engrave.c:741 [static] — doengrave_sfx_item(de): object engraving effects
// Handles special effects for all object types used for engraving.
// NOTE: Full implementation requires object class infrastructure.
// This is a stub that returns true (continue) for all cases.
function doengrave_sfx_item(de) {
    return true;
}

// cf. engrave.c:895 [static] — doengrave_ctx_verb(de): engrave verb selection
// Sets verb phrasing for engraving prompt (write/engrave/burn/melt/scrawl).
function doengrave_ctx_verb(de) {
    switch (de.type) {
    default:
        de.everb = de.adding ? "add to the weird writing on"
                             : "write strangely on";
        break;
    case 'dust':
        de.everb = de.adding ? "add to the writing in" : "write in";
        de.eloc = de.frosted ? "frost" : "dust";
        break;
    case 'headstone':
        de.everb = de.adding ? "add to the epitaph on" : "engrave on";
        break;
    case 'engrave':
        de.everb = de.adding ? "add to the engraving in" : "engrave in";
        break;
    case 'burn':
        de.everb = de.adding ? (de.frosted ? "add to the text melted into"
                                : "add to the text burned into")
                   : (de.frosted ? "melt into" : "burn into");
        break;
    case 'mark':
        de.everb = de.adding ? "add to the graffiti on" : "scribble on";
        break;
    case 'blood':
        de.everb = de.adding ? "add to the scrawl on" : "scrawl on";
        break;
    }
}

// cf. engrave.c:955 — doengrave(void): #engrave command handler
// Selects stylus, prompts for text, handles effects, starts engraving occupation.
// PARTIAL: engrave.c:955 — doengrave() <-> handleEngrave()
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
    const writePrompt = writeLetters
        ? `What do you want to write with? [- ${writeLetters} or ?*] `
        : 'What do you want to write with? [- or ?*] ';
    await display.putstr_message(writePrompt);
    while (true) {
        const ch = await awaitInput(null, nhgetch_wrap(), { site: 'engrave.handleEngrave.stylusPrompt' });
        let c = String.fromCharCode(ch);
        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage();
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            replacePromptMessage();
            const lines = buildInventoryOverlayLines(player);
            const allInvLetters = (player.inventory || [])
                .filter((o) => o && o.invlet)
                .map((o) => o.invlet)
                .join('');
            const menuSelection = await renderOverlayMenuUntilDismiss(display, lines, allInvLetters);
            if (menuSelection) {
                c = menuSelection;
                // Fall through to item processing below.
            } else {
                await display.putstr_message(writePrompt);
                continue;
            }
        }
        if (c === '-' || (writeLetters && writeLetters.includes(c))) {
            replacePromptMessage();
            await display.putstr_message('Engraving is not implemented yet.');
            return { moved: false, tookTime: false };
        }
        // Keep prompt active for unsupported letters.
    }
}

// cf. engrave.c:1266 — engrave(void): engraving occupation callback
// Gradually engraves text char by char; handles stylus wear and marker ink.
// NOTE: Full implementation requires the occupation system (set_occupation).
// This is a stub that preserves the interface.
function engrave_occupation() {
    // Stub: occupation callback not yet implemented.
    // Would handle char-by-char engraving, stylus dulling, marker ink usage.
    return 0; // finished
}

// cf. engrave.c:1764 [static] — blengr(void): blind engraving text
// Returns encrypted blind-writing text for blind player engraving attempts.
// C uses xcrypt() to decode these; they are obfuscated strings.
const blind_writing = [
    [0x44, 0x66, 0x6d, 0x69, 0x62, 0x65, 0x22, 0x45, 0x7b, 0x71,
     0x65, 0x6d, 0x72],
    [0x51, 0x67, 0x60, 0x7a, 0x7f, 0x21, 0x40, 0x71, 0x6b, 0x71,
     0x6f, 0x67, 0x63],
    [0x49, 0x6d, 0x73, 0x69, 0x62, 0x65, 0x22, 0x4c, 0x61, 0x7c,
     0x6d, 0x67, 0x24, 0x42, 0x7f, 0x69, 0x6c, 0x77, 0x67, 0x7e],
    [0x4b, 0x6d, 0x6c, 0x66, 0x30, 0x4c, 0x6b, 0x68, 0x7c, 0x7f,
     0x6f],
    [0x51, 0x67, 0x70, 0x7a, 0x7f, 0x6f, 0x67, 0x68, 0x64, 0x71,
     0x21, 0x4f, 0x6b, 0x6d, 0x7e, 0x72],
    [0x4c, 0x63, 0x76, 0x61, 0x71, 0x21, 0x48, 0x6b, 0x7b, 0x75,
     0x67, 0x63, 0x24, 0x45, 0x65, 0x6b, 0x6b, 0x65],
    [0x4c, 0x67, 0x68, 0x6b, 0x78, 0x68, 0x6d, 0x76, 0x7a, 0x75,
     0x21, 0x4f, 0x71, 0x7a, 0x75, 0x6f, 0x77],
    [0x44, 0x66, 0x6d, 0x7c, 0x78, 0x21, 0x50, 0x65, 0x66, 0x65,
     0x6c],
    [0x44, 0x66, 0x73, 0x69, 0x62, 0x65, 0x22, 0x56, 0x7d, 0x63,
     0x69, 0x76, 0x6b, 0x66],
];

function blengr() {
    // C: ROLL_FROM(blind_writing) — pick a random entry
    return blind_writing[rn2(blind_writing.length)];
}

// cf. engrave.c:1497 — sanitize_engravings(void): remove control chars
// Removes terminal-disrupting characters from engravings when loading bones.
export function sanitize_engravings(map) {
    if (!map || !Array.isArray(map.engravings)) return;
    for (const ep of map.engravings) {
        if (ep && ep.text) {
            // C: sanitize_name() removes control characters
            ep.text = ep.text.replace(/[\x00-\x1f\x7f]/g, '');
        }
    }
}

// cf. engrave.c:1508 — forget_engravings(void): mark engravings as unread
// Marks all engravings as unseen/unread before saving bones.
export function forget_engravings(map) {
    if (!map || !Array.isArray(map.engravings)) return;
    for (const ep of map.engravings) {
        if (ep) {
            ep.eread = false;
            ep.erevealed = false;
        }
    }
}

// cf. engrave.c:1523 — engraving_sanity_check(void): validate engravings
// Checks all engravings have legal locations and accessible terrain.
export function engraving_sanity_check(map) {
    if (!map || !Array.isArray(map.engravings)) return;
    for (const ep of map.engravings) {
        if (!ep) continue;
        const x = ep.x, y = ep.y;
        if (!isok(x, y)) {
            impossible("engraving sanity: !isok <%d,%d>", x, y);
            continue;
        }
        const loc = map.at ? map.at(x, y) : null;
        if (!loc) continue;
        const levtyp = loc.typ;
        if (is_pool_or_lava(x, y, map) || IS_AIR(levtyp) || !ACCESSIBLE(levtyp)) {
            impossible("engraving sanity: illegal surface (%d)", levtyp);
            continue;
        }
    }
}

// cf. engrave.c:1550 — save_engravings(nhfp): serialize engravings
// N/A: engrave.c:1550 — save_engravings() (JS uses storage.js)

// cf. engrave.c:1583 — rest_engravings(nhfp): deserialize engravings
// N/A: engrave.c:1583 — rest_engravings() (JS uses storage.js)

// cf. engrave.c:1625 — engr_stats(hdrfmt, hdrbuf, count, size): engraving stats
// Calculates statistics for engraving data.
export function engr_stats(map) {
    let count = 0;
    let size = 0;
    if (map && Array.isArray(map.engravings)) {
        for (const ep of map.engravings) {
            if (ep) {
                count++;
                size += (ep.text || '').length;
            }
        }
    }
    return { count, size };
}

// cf. engrave.c:1666 — rloc_engr(ep): relocate engraving randomly
// Moves engraving to a new valid location on the level.
// Autotranslated from engrave.c:1668
export function rloc_engr(map, ep) {
  let tx, ty, tryct = 200;
  do {
    if (--tryct < 0) return;
    tx = rn1(COLNO - 3, 2);
    ty = rn2(ROWNO);
  } while (engr_at(map, tx, ty) || !goodpos(tx, ty, 0, 0));
  ep.engr_x = tx;
  ep.engr_y = ty;
  newsym(tx, ty);
}

// cf. engrave.c:1686 — make_grave(x, y, str): create headstone
// Creates headstone at location with epitaph text.
// The caller is responsible for newsym(x, y).
export function make_grave(map, x, y, str) {
    if (!map) return;
    const loc = map.at ? map.at(x, y) : null;
    if (!loc) return;
    // C: Can we put a grave here?
    if (loc.typ !== ROOM && loc.typ !== GRAVE) return;
    if (map.trapAt && map.trapAt(x, y)) return;
    // Make the grave
    loc.typ = GRAVE;
    // Engrave the headstone
    del_engr_at(map, x, y);
    // C: if (!str) str = get_rnd_text(EPITAPHFILE, buf, rn2, MD_PAD_RUMORS);
    // str should be provided by caller or left as empty
    if (!str) str = '';
    make_engr_at(map, x, y, str, 'headstone');
}

// cf. engrave.c:1706 — disturb_grave(x, y): disturb a grave
// Summons ghoul when grave is disturbed by engraving or kicking.
export async function disturb_grave(map, x, y, player, depth) {
    if (!map) return;
    const loc = map.at ? map.at(x, y) : null;
    if (!loc) return;
    if (!IS_GRAVE(loc.typ)) {
        impossible("Disturbing grave that isn't a grave? (%d)", loc.typ);
    } else if (loc.disturbed) {
        impossible("Disturbing already disturbed grave?");
    } else {
        await You("disturb the undead!");
        loc.disturbed = true;
        // C: makemon(&mons[PM_GHOUL], x, y, NO_MM_FLAGS)
        if (typeof makemon === 'function') {
            makemon('PM_GHOUL', x, y, 0, depth, map);
        }
        // C: exercise(A_WIS, FALSE)
        if (player) {
            await exercise(player, 2, false); // A_WIS = 2
        }
    }
}

// cf. engrave.c:1723 — see_engraving(ep): update engraving display
// Updates display symbol at engraving location.
// Autotranslated from engrave.c:1725
export function see_engraving(ep) {
  newsym(ep.engr_x, ep.engr_y);
}

// cf. engrave.c:1731 — feel_engraving(ep): feel engraving (blind)
// Marks engraving as read/revealed for engravings detectable by touch.
export function feel_engraving(map, ep) {
    if (!ep || !map) return;
    if (engr_can_be_felt(ep)) {
        ep.eread = true;
        ep.erevealed = true;
        // C: map_engraving(ep, 1) — not yet ported
        newsym(ep.x, ep.y);
    }
}

// C ref: hack.c:3001-3012 maybe_smudge_engr()
// On successful movement, attempt to smudge engravings at origin/destination.
// C: checks can_reach_floor(TRUE), then wipes at old pos and new pos if engravings exist.
export async function maybeSmudgeEngraving(map, x1, y1, x2, y2, player) {
    const step = Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?';
    const fmt = (ep) => {
        if (!ep) return 'none';
        const txt = String(ep.text || '');
        return `${ep.type || '?'} len=${txt.length} nowipeout=${ep.nowipeout ? 1 : 0}`;
    };
    // C ref: if (can_reach_floor(TRUE)) { ... }
    const reach = can_reach_floor(player, map, true);
    engrTrace(`step=${step}`, `maybeSmudgeEngraving reach=${reach ? 1 : 0}`, `from=(${x1},${y1})`, `to=(${x2},${y2})`);
    if (!reach) return;
    // C ref: if ((ep = engr_at(x1,y1)) && ep->engr_type != HEADSTONE)
    //            wipe_engr_at(x1, y1, rnd(5), FALSE);
    const ep1 = engr_at(map, x1, y1);
    engrTrace(`step=${step}`, `old-candidate=${fmt(ep1)}`);
    if (ep1 && ep1.type !== 'headstone') {
        const roll = rnd(5);
        engrTrace(`step=${step}`, `old-roll=${roll}`, `pos=(${x1},${y1})`);
        await wipe_engr_at(map, x1, y1, roll, false);
        engrTrace(`step=${step}`, `old-after=${fmt(engr_at(map, x1, y1))}`);
    }
    // C ref: if ((x2!=x1 || y2!=y1) && (ep = engr_at(x2,y2)) && ep->engr_type != HEADSTONE)
    //            wipe_engr_at(x2, y2, rnd(5), FALSE);
    if ((x2 !== x1 || y2 !== y1)) {
        const ep2 = engr_at(map, x2, y2);
        engrTrace(`step=${step}`, `new-candidate=${fmt(ep2)}`);
        if (ep2 && ep2.type !== 'headstone') {
            const roll = rnd(5);
            engrTrace(`step=${step}`, `new-roll=${roll}`, `pos=(${x2},${y2})`);
            await wipe_engr_at(map, x2, y2, roll, false);
            engrTrace(`step=${step}`, `new-after=${fmt(engr_at(map, x2, y2))}`);
        }
    }
}

// Autotranslated from engrave.c:50
export function random_engraving(outbuf, pristine_copy) {
  let rumor;
  if (!rn2(4) || !(rumor = getrumor(0, pristine_copy, true)) || !rumor) {
    get_rnd_text(ENGRAVEFILE, pristine_copy, rn2, MD_PAD_RUMORS);
  }
  outbuf = pristine_copy;
  wipeout_text(outbuf, (outbuf.length / 4) | 0, 0);
  return outbuf;
}
