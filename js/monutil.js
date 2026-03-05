// monutil.js -- Shared monster utilities
// Distance macros from hack.h, debug tracing, display helpers,
// visibility checks, and monster inventory utilities.

import { isok, IS_WALL, CORR, SCORR, ROOM, ICE,
         POOL, MOAT, WATER, LAVAPOOL, LAVAWALL,
         DRAWBRIDGE_UP, DB_UNDER, DB_MOAT, DB_LAVA,
         MAP_ROW_START, COLNO, ROWNO,
         SEE_INVIS, DETECT_MONSTERS, TELEPAT, INFRAVISION, WARNING, WARN_OF_MON } from './config.js';
import { PM_GRID_BUG,
         PM_ANGEL, G_UNIQ,
         AT_BITE, AT_CLAW, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_WEAP,
         AT_ENGL, AT_HUGS, AD_STCK } from './monsters.js';
import { monsterMapGlyph, objectMapGlyph } from './display_rng.js';
import {
    wallIsVisible, trapGlyph,
    terrainSymbol as renderTerrainSymbol,
    CLR_GRAY, NO_COLOR, CLR_WHITE, CLR_BRIGHT_BLUE,
} from './render.js';
import { cansee, couldsee, clear_vision_full_recalc, get_vision_full_recalc } from './vision.js';
import { do_light_sources } from './light.js';
export { mark_vision_dirty } from './vision.js';
import { Monnam } from './mondata.js';
import { is_hider, noattacks, dmgtype, attacktype, is_mindless, infravisible, is_human, is_rider } from './mondata.js';
import { weight } from './mkobj.js';
import { pushRngLogEntry, rnd } from './rng.js';
import { place_object, stackobj } from './stackobj.js';
import { SCR_SCARE_MONSTER } from './objects.js';
import { extract_from_minvent, update_mon_extrinsics } from './worn.js';
import { worm_known } from './worm.js';

// ========================================================================
// Constants — C ref: hack.h / monst.h / dogmove.c
// ========================================================================
export const MTSZ = 4;           // C ref: monst.h — track history size
export const SQSRCHRADIUS = 5;   // C ref: dogmove.c — object search radius
export const FARAWAY = 127;      // C ref: hack.h — large distance sentinel
export const BOLT_LIM = 8;       // C ref: hack.h BOLT_LIM (threat radius baseline)

// ========================================================================
// Debug tracing — development-only trace helpers
// ========================================================================
function monmoveTraceEnabled() {
    const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
    return env.WEBHACK_MONMOVE_TRACE === '1';
}

export function monmoveTrace(...args) {
    if (!monmoveTraceEnabled()) return;
    console.log('[MONMOVE_TRACE]', ...args);
}

function monmovePhase3TraceEnabled() {
    const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
    return env.WEBHACK_MONMOVE_PHASE3_TRACE === '1';
}

export function monmovePhase3Trace(...args) {
    if (!monmovePhase3TraceEnabled()) return;
    console.log('[MONMOVE_PHASE3]', ...args);
}

export function monmoveStepLabel(map) {
    const idx = map?._replayStepIndex;
    return Number.isInteger(idx) ? String(idx + 1) : '?';
}

// ========================================================================
// Distance — C ref: hack.h macros
// ========================================================================

// Squared distance
export function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

// C ref: hack.h distmin()
export function distmin(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

// C ref: mon.c monnear() + NODIAG()
export function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);
    // C ref: hack.h NODIAG(monnum) is only PM_GRID_BUG.
    const nodiag = mon.mndx === PM_GRID_BUG;
    if (distance === 2 && nodiag) return false;
    return distance < 3;
}

// C ref: monst.h helpless(mon) — sleeping or unable to move.
// Be tolerant of replay/state encodings that use numeric flags.
export function helpless(mon) {
    if (!mon) return true;
    if (mon.msleeping || mon.sleeping) return true;
    if (mon.mcanmove === false || mon.mcanmove === 0) return true;
    if (Number(mon.mfrozen || 0) > 0) return true;
    if (mon.mstun || mon.stunned) return true;
    return false;
}

// ========================================================================
// Display helpers — attack verbs, monster names
// ========================================================================
export function attackVerb(type) {
    switch (type) {
        case AT_BITE: return 'bites';
        case AT_CLAW: return 'claws';
        // C ref: mhitm.c hitmm() uses generic "hits" for AT_KICK.
        case AT_KICK: return 'hits';
        case AT_BUTT: return 'butts';
        case AT_TUCH: return 'touches';
        case AT_STNG: return 'stings';
        case AT_WEAP: return 'hits';
        default: return 'hits';
    }
}

export function monAttackName(mon) {
    // C ref: do_name.c Monnam() — uses ARTICLE_THE regardless of tame status,
    // and "saddled" is prepended when a saddle is worn.
    return Monnam(mon);
}

// ========================================================================
// Visibility helpers — map_invisible, newsym, canSpotMonsterForMap
// ========================================================================

// C ref: display.c:378 map_invisible() — mark location as containing an
// invisible monster.  Sets mem_invis (JS equivalent of levl glyph =
// GLYPH_INVISIBLE) for rendering by the display layer.
export function map_invisible(map, x, y, player) {
    if (!map || !isok(x, y)) return;
    if (player && x === player.x && y === player.y) return;
    const loc = map.at(x, y);
    if (!loc) return;
    loc.mem_invis = true;
    // C ref: display.c map_invisible() updates glyph immediately.
    // Keep display in sync with remembered invisible markers.
    newsym(x, y);
}

// ========================================================================
// Display context — allows newsym() to perform per-cell rendering
// without changing its (map, x, y) call signature at 217 call sites.
// ========================================================================
let _displayContext = null;

function spotShowsEngravings(loc) {
    const typ = loc?.typ;
    return typ === CORR || typ === ICE || typ === ROOM;
}

function isPoolAt(loc) {
    if (!loc) return false;
    if (loc.typ === POOL || loc.typ === MOAT || loc.typ === WATER) return true;
    if (loc.typ === DRAWBRIDGE_UP) {
        return (loc.drawbridgemask & DB_UNDER) === DB_MOAT;
    }
    return false;
}

function coversObjectsAt(loc, player) {
    const underwater = !!(player?.underwater || player?.uinwater || player?.Underwater);
    return ((isPoolAt(loc) && !underwater)
        || loc?.typ === LAVAPOOL
        || loc?.typ === LAVAWALL);
}

function playerHasActiveProp(player, prop) {
    if (!player || !Number.isInteger(prop)) return false;
    if (typeof player.hasProp === 'function') return !!player.hasProp(prop);
    const entry = player.uprops?.[prop];
    if (!entry) return false;
    return !!(entry.intrinsic || entry.extrinsic);
}

function playerCanSeeInvisible(player) {
    return !!(player?.seeInvisible || player?.See_invisible || playerHasActiveProp(player, SEE_INVIS));
}

function monsterShownOnMap(mon, player) {
    if (!mon) return false;
    if (mon.mundetected) return false;
    const ap = mon.m_ap_type;
    if (ap === 'furniture' || ap === 'object' || ap === 1 || ap === 2) return false;
    if (mon.minvis && !playerCanSeeInvisible(player)) return false;
    return true;
}

// Set the display context for incremental rendering.
// ctx = { display, player, fov, flags, map } or null to disable.
// Returns the previous context (for save/restore in renderMap).
export function setDisplayContext(ctx) {
    const prev = _displayContext;
    _displayContext = ctx || null;
    return prev;
}

// C ref: display.c:918 newsym() — update the display at a location.
// When _displayContext is wired, this performs per-cell rendering matching
// C's incremental newsym behavior.  When _displayContext is null (during
// level generation or tests), just updates memory state.
// Map is obtained from the display context (matching C's implicit global
// level pointer — C's newsym() takes no map argument).
export function newsym(x, y) {
    const ctx = _displayContext;
    if (!ctx?.map) return;
    const map = ctx.map;
    if (!map || !isok(x, y)) return;
    const loc = map.at(x, y);
    if (!loc) return;

    if (!ctx || !ctx.display || typeof ctx.display.setCell !== 'function') {
        // No display wired (or mock display without setCell). Preserve
        // remembered glyph state; C newsym updates display/glyph buffers but
        // does not clear remembered invisible markers as a side effect.
        return;
    }

    const { display, player, fov, flags } = ctx;
    const mapOffset = flags?.msg_window ? 3 : MAP_ROW_START;
    const col = x - 1;
    const row = y + mapOffset;

    // --- Not visible (out of FOV) ---
    if (!fov || !fov.canSee(x, y)) {
        if (loc.mem_invis) {
            display.setCell(col, row, 'I', CLR_GRAY);
            return;
        }
        if (loc.seenv) {
            if (loc.mem_obj) {
                const rememberedObjColor = Number.isInteger(loc.mem_obj_color)
                    ? loc.mem_obj_color : 0;
                display.setCell(col, row, loc.mem_obj, rememberedObjColor);
                return;
            }
            if (loc.mem_trap) {
                const memTrapColor = Number.isInteger(loc.mem_trap_color)
                    ? loc.mem_trap_color : 0;
                display.setCell(col, row, loc.mem_trap, memTrapColor);
                return;
            }
            if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
                display.setCell(col, row, ' ', CLR_GRAY);
                return;
            }
            const sym = renderTerrainSymbol(loc, map, x, y, flags);
            const rememberedColor = (loc.typ === ROOM) ? NO_COLOR : sym.color;
            display.setCell(col, row, sym.ch, rememberedColor);
        } else {
            display.setCell(col, row, ' ', CLR_GRAY);
        }
        return;
    }

    // --- Visible (in FOV) ---

    // C ref: display.c:963-964 — mark any engraving at a visible square as
    // revealed, "even when covered by objects or a monster".
    const visEngr = map.engravingAt(x, y);
    if (visEngr) visEngr.erevealed = true;

    // Player glyph
    if (player && x === player.x && y === player.y) {
        display.setCell(col, row, '@', CLR_WHITE);
        return;
    }

    // Monster
    const mon = map.monsterAt(x, y);
    if (monsterShownOnMap(mon, player)) {
        loc.mem_invis = false;
        // Update remembered object under the monster
        const underObjs = coversObjectsAt(loc, player) ? [] : map.objectsAt(x, y);
        if (underObjs.length > 0) {
            const underTop = underObjs[underObjs.length - 1];
            const underGlyph = objectMapGlyph(underTop, false, { player, x, y });
            loc.mem_obj = underGlyph.ch || 0;
            loc.mem_obj_color = Number.isInteger(underGlyph.color)
                ? underGlyph.color : CLR_GRAY;
        } else {
            const engr = map.engravingAt(x, y);
            if (engr && (player?.wizard || !player?.blind || engr.erevealed)) {
                const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
                loc.mem_obj = engrCh;
                loc.mem_obj_color = CLR_BRIGHT_BLUE;
            } else {
                loc.mem_obj = 0;
                loc.mem_obj_color = 0;
            }
        }
        const hallu = !!player?.hallucinating;
        const glyph = monsterMapGlyph(mon, hallu);
        display.setCell(col, row, glyph.ch, glyph.color);
        return;
    }
    if (loc.mem_invis) {
        display.setCell(col, row, 'I', CLR_GRAY);
        return;
    }

    // Objects
    const objs = coversObjectsAt(loc, player) ? [] : map.objectsAt(x, y);
    if (objs.length > 0) {
        const topObj = objs[objs.length - 1];
        const hallu = !!player?.hallucinating;
        const glyph = objectMapGlyph(topObj, hallu, { player, x, y });
        const memGlyph = hallu
            ? objectMapGlyph(topObj, false, { player, x, y, observe: false })
            : glyph;
        loc.mem_obj = memGlyph.ch || 0;
        loc.mem_obj_color = Number.isInteger(memGlyph.color)
            ? memGlyph.color : CLR_GRAY;
        display.setCell(col, row, glyph.ch, glyph.color);
        return;
    }
    loc.mem_obj = 0;
    loc.mem_obj_color = 0;

    // Traps
    const trap = map.trapAt(x, y);
    if (trap && trap.tseen && !coversObjectsAt(loc, player)) {
        const tg = trapGlyph(trap.ttyp);
        loc.mem_trap = tg.ch;
        loc.mem_trap_color = tg.color;
        display.setCell(col, row, tg.ch, tg.color);
        return;
    }
    loc.mem_trap = 0;

    // Engravings (wizard mode or revealed)
    const engr = map.engravingAt(x, y);
    if (spotShowsEngravings(loc)
        && engr
        && (player?.wizard || !player?.blind || engr.erevealed)
        && !coversObjectsAt(loc, player)) {
        const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
        loc.mem_obj = engrCh;
        loc.mem_obj_color = CLR_BRIGHT_BLUE;
        display.setCell(col, row, engrCh, CLR_BRIGHT_BLUE);
        return;
    }

    // Terrain
    if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
        display.setCell(col, row, ' ', CLR_GRAY);
        return;
    }
    const sym = renderTerrainSymbol(loc, map, x, y, flags);
    display.setCell(col, row, sym.ch, sym.color);
}

// C ref: display.c:1480 see_monsters() — loop through all monsters
// and call newsym() at each monster's position.  Called in the
// "once-per-player-input" section of moveloop_core to update the
// display after monsters have moved.
export function see_monsters(map) {
    if (!map || !map.monsters) return;
    const ctx = _displayContext;
    if (!ctx || !ctx.display) return;  // no display wired

    for (const mon of map.monsters) {
        if (!mon || mon.mhp <= 0) continue;  // DEADMONSTER
        newsym(mon.mx, mon.my);
    }
    // When not riding, also update hero's cell
    const player = ctx.player;
    if (player && !player.usteed) {
        newsym(player.x, player.y);
    }
}

// C ref: vision.c:511 vision_recalc() — recompute FOV and call newsym() for
// all cells whose visibility changed.  Uses _displayContext for fov/map/player.
// Safe to call when _displayContext is null (no-op: level gen or tests).
// For the player-move case, call newsym(oldX, oldY) and newsym(player.x, player.y)
// after vision_recalc to ensure old and new player positions are updated
// (vision_recalc only updates cells whose visibility changed).
export function vision_recalc() {
    clear_vision_full_recalc(); // C ref: vision_recalc clears vision_full_recalc flag
    const ctx = _displayContext;
    if (!ctx || !ctx.fov || !ctx.fov.visible || !ctx.map || !ctx.player) return;
    const { fov, map, player } = ctx;

    // Snapshot old visibility before recompute
    const oldVisible = [];
    for (let x = 0; x < COLNO; x++) {
        oldVisible[x] = fov.visible[x].slice();
    }

    // Recompute FOV — mutates fov.visible in place
    // C ref: vision_recalc() calls do_light_sources() to mark TEMP_LIT before lighting loop
    fov.compute(map, player.x, player.y, do_light_sources, player);

    // Call newsym for all cells whose visibility changed
    if (ctx.display) {
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                if (oldVisible[x][y] !== fov.visible[x][y]) {
                    newsym(x, y);
                }
            }
        }
    }
}

// C ref: display.c:2200 flush_screen(cursor_on_u)
// Syncs the display: update status if dirty, move cursor to hero.
// cursor_on_u: 1 = update status + cursor; 0 = update status only;
//              -1 = toggle delay_flushing (suppresses all flushes until called again)
// C's glyph-buffer flush is a no-op in JS — newsym() writes directly to display.
let _flushing = false;
let _delay_flushing = false;

export function flush_screen(cursor_on_u) {
    // C ref: cursor_on_u == -1 toggles delay_flushing (used to bracket level changes)
    if (cursor_on_u === -1) {
        _delay_flushing = !_delay_flushing;
        return;
    }
    if (_delay_flushing) return;
    if (_flushing) return; // prevent re-entrancy: pline -> flush_screen -> pline
    _flushing = true;

    const ctx = _displayContext;
    if (ctx?.display && ctx?.player) {
        const { display, player } = ctx;
        // C ref: if (disp.botl || disp.botlx) bot(); else if (disp.time_botl) timebot();
        if (player._botl) {
            if (typeof display.renderStatus === 'function')
                display.renderStatus(player);
            player._botl = false;
        }
        // C ref: glyph buffer flush (print cells marked gnew) — JS: no-op, newsym is immediate
        // C ref: if (cursor_on_u) curs(WIN_MAP, u.ux, u.uy)
        if (cursor_on_u > 0 && typeof display.cursorOnPlayer === 'function')
            display.cursorOnPlayer(player);
    }

    _flushing = false;
}

function hasPlayerProp(player, propId, ...legacyFlags) {
    if (!player) return false;
    if (typeof player.hasProp === 'function') {
        try {
            if (player.hasProp(propId)) return true;
        } catch (e) {
            // Fall through to legacy field checks.
        }
    }
    return legacyFlags.some((flag) => !!player?.[flag]);
}

function playerBlind(player) {
    return !!(player?.blind || player?.Blind);
}

// C ref: display.h _mon_visible(mon)
export function monVisibleForMap(mon, player) {
    if (!mon) return false;
    if (mon.mundetected) return false;
    const seeInvis = hasPlayerProp(player, SEE_INVIS, 'seeInvisible', 'See_invisible');
    if (mon.minvis && !seeInvis) return false;
    return true;
}

// C ref: display.h _see_with_infrared(mon)
export function seeWithInfraredForMap(mon, map, player) {
    if (!mon || !map || !player) return false;
    if (playerBlind(player)) return false;
    const hasInfra = hasPlayerProp(player, INFRAVISION, 'infravision', 'Infravision');
    if (!hasInfra) return false;
    const mdat = mon.type || mon.data || null;
    if (!mdat || !infravisible(mdat)) return false;
    return couldsee(map, player, mon.mx, mon.my);
}

// C ref: display.h _canseemon(mon)
export function canSeeMonsterForMap(mon, map, player, fov) {
    if (!mon || !map || !player) return false;
    const locSeen = mon.wormno
        ? worm_known(mon, map, player, fov)
        : (cansee(map, player, fov, mon.mx, mon.my)
            || seeWithInfraredForMap(mon, map, player));
    if (!locSeen) return false;
    return monVisibleForMap(mon, player);
}

// C ref: display.h _sensemon(mon)
export function senseMonsterForMap(mon, map, player) {
    if (!mon || !player) return false;
    if (player?.uswallow && player?.ustuck && mon !== player.ustuck) return false;

    const heroUnderwater = !!(player?.underwater || player?.uinwater || player?.Underwater);
    if (heroUnderwater) {
        const d2 = dist2(player.x, player.y, mon.mx, mon.my);
        const onPool = !!(map && isPoolAt(map.at(mon.mx, mon.my)));
        if (!(d2 <= 2 && onPool)) return false;
    }

    const detectMonsters = hasPlayerProp(player, DETECT_MONSTERS, 'detectMonsters', 'Detect_monsters');
    const telepathy = hasPlayerProp(player, TELEPAT, 'telepathy', 'Telepathy');
    let tpSense = false;
    if (telepathy) {
        const mdat = mon.type || mon.data || null;
        if (mdat && !is_mindless(mdat)) {
            const blindTelepathic = playerBlind(player);
            const unblindRange = Number(player?.unblind_telepat_range || player?.unblindTelepathRange || BOLT_LIM);
            tpSense = blindTelepathic || dist2(player.x, player.y, mon.mx, mon.my) <= (unblindRange * unblindRange);
        }
    }

    const warning = hasPlayerProp(player, WARNING, 'warning', 'Warning');
    const warnOfMon = hasPlayerProp(player, WARN_OF_MON, 'warnOfMon', 'Warn_of_mon');
    const warnSense = warning || warnOfMon;

    return detectMonsters || tpSense || warnSense;
}

// C ref: display.h canspotmon(mon) = canseemon(mon) || sensemon(mon)
export function canSpotMonsterForMap(mon, map, player, fov) {
    return canSeeMonsterForMap(mon, map, player, fov)
        || senseMonsterForMap(mon, map, player);
}

function onscary(map, x, y, mon = null) {
    if (!map) return false;
    if (mon) {
        const mdat = mon.type || mon.data || {};
        if (mon.iswiz) return false;
        if (is_rider(mdat)) return false;
        if (mdat.mndx === PM_ANGEL) return false;
        if (is_human(mdat) || (Number(mdat.geno || 0) & G_UNIQ)
            || mon.isshk || mon.ispriest) return false;
    }
    const objects = Array.isArray(map.objects) ? map.objects : [];

    for (const obj of objects) {
        if (!obj || obj.buried) continue;
        if (obj.ox === x && obj.oy === y
            && obj.otyp === SCR_SCARE_MONSTER
            && !obj.cursed) {
            return true;
        }
    }

    if (!Array.isArray(map.engravings)) return false;
    for (const engr of map.engravings) {
        if (!engr || engr.x !== x || engr.y !== y) continue;
        if (/elbereth/i.test(String(engr.text || ''))) {
            return true;
        }
    }

    return false;
}

function monsterIsTame(mon) {
    if (!mon) return false;
    if (mon.mtame !== undefined) return !!mon.mtame;
    return !!mon.tame;
}

function sanitizeMonsterType(mon) {
    const ptr = mon?.type;
    const ptrIsObject = ptr && typeof ptr === 'object';
    const attacks = ptrIsObject && Array.isArray(ptr.attacks)
        ? ptr.attacks
        : (!ptrIsObject ? [{ type: AT_WEAP }] : []);

    return {
        ...(ptrIsObject ? ptr : {}),
        attacks,
        flags1: Number(ptr?.flags1 ?? 0),
        flags2: Number(ptr?.flags2 ?? 0),
        flags3: Number(ptr?.flags3 ?? 0),
    };
}

// C ref: hack.c:3988 — monster_nearby()
// Checks adjacent monsters that can actually threaten the player this turn.
export function monsterNearby(map, player, fov) {
    if (!map || !player) return false;
    const px = player.x;
    const py = player.y;
    const playerHallucinating = !!player.hallucinating;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const x = px + dx;
            const y = py + dy;
            if (!isok(x, y)) continue;

            const mon = map.monsterAt(x, y);
            if (!mon || mon.dead) continue;
            if (mon.m_ap_type === 'furniture' || mon.m_ap_type === 'object') continue;

            const mptr = sanitizeMonsterType(mon);
            const isPeaceful = !!(mon.mpeaceful || mon.peaceful);
            if (!(playerHallucinating || (!monsterIsTame(mon) && !isPeaceful && !noattacks(mptr)))) continue;

            if (is_hider(mptr || {}) && mon.mundetected) continue;
            if (helpless(mon)) continue;
            if (onscary(map, px, py, mon)) continue;

            // C ref: hack.c monster_nearby() requires canspotmon(mtmp).
            if (!canSpotMonsterForMap(mon, map, player, fov)) continue;

            return true;
        }
    }

    return false;
}

// ========================================================================
// Monster inventory helpers
// ========================================================================
export function canMergeMonsterInventoryObj(dst, src) {
    if (!dst || !src) return false;
    if (dst.otyp !== src.otyp) return false;
    if (!!dst.cursed !== !!src.cursed) return false;
    if (!!dst.blessed !== !!src.blessed) return false;
    if (Number(dst.spe || 0) !== Number(src.spe || 0)) return false;
    if (Number(dst.oeroded || 0) !== Number(src.oeroded || 0)) return false;
    if (Number(dst.oeroded2 || 0) !== Number(src.oeroded2 || 0)) return false;
    if (!!dst.oerodeproof !== !!src.oerodeproof) return false;
    if (!!dst.greased !== !!src.greased) return false;
    if (!!dst.opoisoned !== !!src.opoisoned) return false;
    if ((dst.corpsenm ?? -1) !== (src.corpsenm ?? -1)) return false;
    if ((dst.fromsink ?? null) !== (src.fromsink ?? null)) return false;
    if ((dst.no_charge ?? null) !== (src.no_charge ?? null)) return false;
    return true;
}

export function addToMonsterInventory(mon, obj) {
    if (!mon || !obj) return null;
    if (!Array.isArray(mon.minvent)) mon.minvent = [];
    const quan = Number(obj.quan || 1);
    if (quan <= 0) return null;
    obj.quan = quan;
    for (const invObj of mon.minvent) {
        if (!canMergeMonsterInventoryObj(invObj, obj)) continue;
        invObj.quan = Number(invObj.quan || 0) + quan;
        invObj.owt = weight(invObj);
        return invObj;
    }
    mon.minvent.push(obj);
    return obj;
}

// ========================================================================
// Centralized monster death/pickup/drop — C ref: mon.c, steal.c
// ========================================================================

// C ref: mon.c:3434 unstuck() — release hero if stuck to dying/departing monster
// Called from mon_leaving_level (via m_detach from mondead) and mongone.
// Sets mspec_used = rnd(2) for sticky/engulfing/hugging monsters to prevent
// immediate re-engagement (relevant when monster doesn't die, e.g. polymorph).
export function unstuck(mon, player) {
    if (!player || player.ustuck !== mon) return;
    const ptr = mon.type || {};
    player.ustuck = null;
    // C ref: mon.c:3458-3461 — prevent holder from immediately re-holding
    if (!mon.mspec_used && (dmgtype(ptr, AD_STCK)
                            || attacktype(ptr, AT_ENGL)
                            || attacktype(ptr, AT_HUGS))) {
        mon.mspec_used = rnd(2);
    }
}

// C ref: mon.c mondead() → m_detach() → mon_leaving_level() → unstuck()
// Marks monster dead and drops all inventory to floor.
// Does NOT call map.removeMonster — callers handle removal if needed;
// movemon() filters dead monsters at end of turn.
export function mondead(mon, map, player) {
    mon.dead = true;
    pushRngLogEntry(`^die[${mon.mndx || 0}@${mon.mx},${mon.my}]`);
    // C ref: mon.c mondead -> m_detach -> newsym clears stale invisible marker.
    const deathLoc = map?.at?.(mon.mx, mon.my);
    if (deathLoc) deathLoc.mem_invis = false;
    // C ref: mon.c mondead → m_detach → newsym clears invisible marker
    newsym(mon.mx, mon.my);
    // C ref: mon.c:2685 mon_leaving_level → unstuck
    if (player) unstuck(mon, player);
    // C ref: m_detach -> relobj: drop all inventory to floor via mdrop_obj
    if (Array.isArray(mon.minvent) && mon.minvent.length > 0) {
        // Reverse order to match C's relobj chain-order floor pile ordering
        const items = [...mon.minvent];
        for (let idx = items.length - 1; idx >= 0; idx--) {
            const obj = items[idx];
            if (!obj) continue;
            mdrop_obj(mon, obj, map);
        }
        mon.minvent = [];
        mon.weapon = null;
    }
}

// C ref: steal.c:619 mpickobj()
// Adds object to monster inventory with event logging.
// Callers are responsible for floor removal before calling this.
export function mpickobj(mon, obj) {
    pushRngLogEntry(`^pickup[${mon.mndx}@${mon.mx},${mon.my},${obj.otyp}]`);
    return addToMonsterInventory(mon, obj);
}

// C ref: steal.c:814 mdrop_obj()
// Removes object from monster inventory and places on floor with event logging.
// Uses extract_from_minvent for proper worn-item cleanup.
export function mdrop_obj(mon, obj, map) {
    // C ref: extract_from_minvent with do_extrinsics=FALSE, silently=TRUE
    // (extrinsics updated after placement, matching C's mdrop_obj)
    const unwornmask = obj.owornmask || 0;
    extract_from_minvent(mon, obj, false, true);
    obj.ox = mon.mx;
    obj.oy = mon.my;
    // C ref: steal.c:838-841 — place_object(); stackobj(); then event_log(EV_DROP)
    place_object(obj, obj.ox, obj.oy, map);
    stackobj(obj, map);
    pushRngLogEntry(`^drop[${mon.mndx}@${mon.mx},${mon.my},${obj.otyp}]`);
    // C ref: steal.c:846-847 — update extrinsics after placement
    if (!mon.dead && unwornmask) {
        update_mon_extrinsics(mon, obj, false, true);
    }
}

// C ref: mkobj.c add_to_minv() — add object to monster inventory with merging
// Wrapper around addToMonsterInventory with C-compatible name.
export function add_to_minv(mon, obj) {
    return addToMonsterInventory(mon, obj);
}

// C ref: mkobj.c discard_minvent() — discard all monster inventory
export function discard_minvent(mon) {
    if (!mon || !Array.isArray(mon.minvent)) return;
    while (mon.minvent.length > 0) {
        const obj = mon.minvent[0];
        extract_from_minvent(mon, obj, true, true);
        // C: obfree(otmp) — in JS, just let it be GC'd
    }
}
