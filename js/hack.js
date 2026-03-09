// hack.js -- Movement, running, and travel
// Mirrors hack.c from the C source.
// domove(), findtravelpath(), lookaround(), etc.

// Lazy-registered function to avoid circular import (zap.js imports from hack.js)
var _burnarmor = () => false;
export function registerBurnarmor(fn) { _burnarmor = fn; }

import { COLNO, ROWNO, STONE, DOOR, CORR, SDOOR, SCORR, STAIRS, LADDER, FOUNTAIN, SINK, THRONE, ALTAR, GRAVE,
         POOL, LAVAPOOL, IRONBARS, TREE, ROOM, IS_DOOR, D_CLOSED, D_LOCKED,
         D_ISOPEN, D_NODOOR, D_BROKEN, ACCESSIBLE, IS_OBSTRUCTED, IS_WALL, ICE,
         IS_STWALL, IS_ROCK, IS_ROOM, IS_FURNITURE, IS_POOL, IS_LAVA, IS_WATERWALL,
         WATER, LAVAWALL, AIR, MOAT, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
         isok, A_STR, A_DEX, A_CON, A_WIS, A_INT, A_CHA,
         RACE_ELF,
         TELEPORT, SEE_INVIS, POISON_RES, COLD_RES, SHOCK_RES, FIRE_RES,
         SLEEP_RES, DISINT_RES, TELEPORT_CONTROL, STEALTH, FAST, INVIS, INTRINSIC,
         ROOMOFFSET, SHOPBASE, OROOM, COURT, SWAMP, VAULT, BEEHIVE, MORGUE,
         BARRACKS, ZOO, DELPHI, TEMPLE, LEPREHALL, COCKNEST, ANTHOLE,
         UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER, OVERLOADED,
         NO_TRAP, VIBRATING_SQUARE, MAGIC_PORTAL, is_pit, BEAR_TRAP, WEB,
         HOLE, TRAPDOOR,
         W_NONDIGGABLE, W_NONPASSWALL,
         DIRECTION_KEYS, RUN_KEYS,
         DO_MOVE, TEST_MOVE, TEST_TRAV, TEST_TRAP,
         TRAVP_TRAVEL, TRAVP_GUESS, TRAVP_VALID,
         LOST_THROWN, LOST_DROPPED, LOST_STOLEN, LOST_EXPLODING } from './const.js';
import { SQKY_BOARD, SLP_GAS_TRAP, FIRE_TRAP, PIT, SPIKED_PIT, ANTI_MAGIC, TELEP_TRAP,
         ARROW_TRAP, DART_TRAP, ROCKTRAP } from './const.js';
import { defsyms, trap_to_defsym } from './symbols.js';
import { PASSES_WALLS, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { rn2, rnd, rn1, rnl, d, c_d, pushRngLogEntry } from './rng.js';
import { exercise, registerNearCapacity } from './attrib_exercise.js';
import { WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
         TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
         WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BOULDER,
         ARROW, DART, SCR_SCARE_MONSTER } from './objects.js';
import { nhgetch_raw } from './input.js';
import { awaitInput } from './suspend.js';
import { do_attack } from './uhitm.js';
import { formatGoldPickupMessage, formatInventoryPickupMessage, schedule_goto } from './do.js';
import { x_monnam, y_monnam, YMonnam, Monnam, mon_nam, canseemon, passes_walls, is_longworm, mon_learns_traps, mons_see_trap, is_hider, noattacks, is_human, is_rider, is_clinger, DEADMONSTER } from './mondata.js';
import { engr_at, read_engr_at, maybeSmudgeEngraving, u_wipe_engr, can_reach_floor } from './engrave.js';
import { gethungry } from './eat.js';
import { describeGroundObjectForPlayer, maybeHandleShopEntryMessage, u_left_shop, inhishop, costly_spot } from './shk.js';
import { observeObject } from './o_init.js';
import { place_object } from './mkobj.js';
import { xname, an, The } from './objnam.js';
import { hliquid, m_monnam } from './do_name.js';
import { dosearch0 } from './detect.js';
import { newsym, mark_vision_dirty, vision_recalc, canSpotMonsterForMap, canSeeMonsterForMap } from './display.js';
import { couldsee } from './vision.js';
import { helpless, monnear, onscary } from './mon.js';
import { monflee } from './monmove.js';
import { ynFunction } from './input.js';
import { water_friction, maybe_adjust_hero_bubble } from './mkmaze.js';
import { Invocation_lev, find_level, deltrap } from './dungeon.js';
import { tmp_at, nh_delay_output, nh_delay_output_nowait } from './animation.js';
import { DISP_ALL, DISP_END } from './const.js';
import { getpos_async } from './getpos.js';
import { stucksteed } from './steed.js';
import { in_out_region } from './region.js';
import { drag_ball as drag_ball_core } from './ball.js';
import { pline, Norep, You, You_feel, You_cant, You_hear, set_msg_xy } from './pline.js';
import { look_here, dfeature_at } from './invent.js';
import { maybe_unhide_at } from './mon.js';
import { tele_trap } from './teleport.js';
import { TT_PIT, TT_WEB, TT_LAVA, TT_BEARTRAP, xdir, ydir, N_DIRS } from './const.js';
import { MZ_LARGE, PM_GRID_BUG, PM_ANGEL, G_UNIQ, AT_WEAP,
         PM_WIZARD, PM_VALKYRIE } from './monsters.js';
import { stackobj } from './invent.js';
import { thitu } from './mthrowu.js';
import { dmgval } from './weapon.js';
import { poisoned, acurr, acurrstr } from './attrib.js';
import { intemple } from './priest.js';
import { t_missile, seetrap, conjoined_pits, adj_nonconjoined_pit, into_vs_onto, floor_trigger,
       } from './trap.js';
import { envFlag, getEnv } from './runtime_env.js';
import { autokey, pick_lock } from './lock.js';

function runTraceEnabled() {
    return envFlag('WEBHACK_RUN_TRACE');
}

function traceStepWindow() {
    const fromRaw = getEnv('WEBHACK_TRACE_STEP_FROM', '');
    const toRaw = getEnv('WEBHACK_TRACE_STEP_TO', '');
    const from = Number.parseInt(String(fromRaw || '').trim(), 10);
    const to = Number.parseInt(String(toRaw || '').trim(), 10);
    return {
        from: Number.isInteger(from) ? from : null,
        to: Number.isInteger(to) ? to : null,
    };
}

function parseTraceStep(args) {
    for (const a of args) {
        const m = /(?:^|\s)step=(\d+)(?:\s|$)/.exec(String(a || ''));
        if (m) return Number.parseInt(m[1], 10);
    }
    return null;
}

function stepInTraceWindow(step) {
    if (!Number.isInteger(step)) return true;
    const { from, to } = traceStepWindow();
    if (Number.isInteger(from) && step < from) return false;
    if (Number.isInteger(to) && step > to) return false;
    return true;
}

function runTrace(...args) {
    if (!runTraceEnabled()) return;
    const step = parseTraceStep(args);
    if (!stepInTraceWindow(step)) return;
    console.log('[RUN_TRACE]', ...args);
}

function testMoveEventEnabled() {
    return envFlag('WEBHACK_EVENT_TEST_MOVE');
}

function engrTraceEnabled() {
    return envFlag('WEBHACK_ENGR_TRACE');
}

function engrTrace(...args) {
    if (!engrTraceEnabled()) return;
    console.log('[ENGR_TRACE]', ...args);
}

function replayStepLabel(map) {
    const idx = map?._replayStepIndex;
    return Number.isInteger(idx) ? String(idx + 1) : '?';
}

function travelTmpAtDebugEnabled() {
    return envFlag('WEBHACK_TRAVEL_TMP_AT_DEBUG');
}

function debug_travel_tmp_at(path, startX, startY) {
    if (!travelTmpAtDebugEnabled() || !Array.isArray(path) || path.length === 0) return;
    let x = startX;
    let y = startY;
    tmp_at(DISP_ALL, { ch: '1', color: 14 });
    for (const [dx, dy] of path) {
        x += dx;
        y += dy;
        tmp_at(x, y);
    }
    nh_delay_output_nowait();
    tmp_at(DISP_END, 0);
}


function M_AP_TYPE(mon) {
    return Number(mon?.m_ap_type || mon?.mappearanceType || 0);
}

function canspotmon(mon, player = null, fov = null) {
    return !!canseemon(mon, player, fov);
}

function remove_object(obj, map) {
    if (!obj || !map) return;
    if (typeof map.removeObject === 'function') {
        map.removeObject(obj);
        return;
    }
    if (Array.isArray(map.objects)) {
        const idx = map.objects.indexOf(obj);
        if (idx >= 0) map.objects.splice(idx, 1);
    }
}

function ensure_context(game) {
    if (game?.svc) {
        if (!game.svc.context) game.svc.context = {};
        if (!game.context) game.context = game.svc.context;
    } else if (!game.context) {
        game.context = {};
    }
    const ctx = (game?.svc?.context) || game.context;
    if (!Number.isInteger(ctx.run)) {
        if (game.runMode === 2) ctx.run = 2;
        else if (game.runMode === 1 || game.runMode === 3) ctx.run = 3;
        else ctx.run = 0;
    }
    if (!Number.isInteger(ctx.travel)) ctx.travel = game.traveling ? 1 : 0;
    if (!Number.isInteger(ctx.travel1)) ctx.travel1 = 0;
    if (!Number.isInteger(ctx.nopick)) ctx.nopick = game.menuRequested ? 1 : 0;
    if (!Number.isInteger(ctx.forcefight)) ctx.forcefight = game.forceFight ? 1 : 0;
    if (!Number.isInteger(ctx.door_opened)) ctx.door_opened = 0;
    if (!Number.isInteger(ctx.move)) ctx.move = 0;
    return ctx;
}

function autounlock_has_action(flags, action) {
    const raw = String(flags?.autounlock ?? '').trim();
    if (raw === 'none') return false;
    if (!raw) return action === 'apply-key';
    const parts = raw.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
    return parts.includes(action);
}

function has_forcefight_prefix(game, ctx) {
    if (ctx?.forcefight) return true;
    return !!game?.forceFight;
}

function clear_forcefight_prefix(game, ctx) {
    if (ctx) ctx.forcefight = 0;
    if (game && typeof game.forceFight !== 'undefined') game.forceFight = false;
}

const tmp_anything = {
    a_uint: 0,
    a_long: 0,
    a_monst: null,
    a_obj: null,
};

function reset_tmp_anything() {
    tmp_anything.a_uint = 0;
    tmp_anything.a_long = 0;
    tmp_anything.a_monst = null;
    tmp_anything.a_obj = null;
}

// C ref: hack.c uint_to_any()
// Autotranslated from hack.c:74
export function uint_to_any(ui) {
    reset_tmp_anything();
    tmp_anything.a_uint = (ui >>> 0);
    return tmp_anything;
}

// C ref: hack.c long_to_any()
// Autotranslated from hack.c:82
export function long_to_any(lng) {
    reset_tmp_anything();
    tmp_anything.a_long = Number.isFinite(lng) ? Math.trunc(lng) : 0;
    return tmp_anything;
}

// C ref: hack.c monst_to_any()
// Autotranslated from hack.c:90
export function monst_to_any(mon) {
    reset_tmp_anything();
    tmp_anything.a_monst = mon || null;
    return tmp_anything;
}

// C ref: hack.c obj_to_any()
// Autotranslated from hack.c:98
export function obj_to_any(obj) {
    reset_tmp_anything();
    tmp_anything.a_obj = obj || null;
    return tmp_anything;
}

// C ref: hack.c maybe_smudge_engr()
export async function maybe_smudge_engr(map, oldX, oldY, newX, newY, player) {
    const fmt = (ep) => {
        if (!ep) return 'none';
        const txt = String(ep.text || '');
        return `${ep.type || '?'}@${ep.x},${ep.y} len=${txt.length} nowipeout=${ep.nowipeout ? 1 : 0} eread=${ep.eread ? 1 : 0} erevealed=${ep.erevealed ? 1 : 0}`;
    };
    const ctx = player?.game?.svc?.context || player?.svc?.context || null;
    engrTrace(
        `step=${replayStepLabel(map)}`,
        `run=${Number(ctx?.run || 0)}`,
        `move=(${oldX},${oldY})->(${newX},${newY})`,
        `old=${fmt(engr_at(map, oldX, oldY))}`,
        `new=${fmt(engr_at(map, newX, newY))}`
    );
    await maybeSmudgeEngraving(map, oldX, oldY, newX, newY, player);
}

// C ref: hack.c could_move_onto_boulder()
export function could_move_onto_boulder(_sx, _sy, player) {
    if (player?.passesWalls) return true;
    if (player?.usteed) return false;
    if (player?.throwsRocks) return true;
    if (player?.verysmall) return true;
    return inv_weight(player) <= -850; // extremely light inventory
}

// C ref: hack.c cannot_push_msg()
export async function cannot_push_msg(otmp, _rx, _ry, _map, display, player = null) {
    const name = (otmp?.otyp === BOULDER) ? 'the boulder' : 'that object';
    if (player?.usteed) {
        // C uses YMonnam(u.usteed); keep wording faithful.
        await display?.putstr_message(`Your steed tries to move ${name}, but cannot.`);
    } else {
        await display?.putstr_message(`You try to move ${name}, but in vain.`);
    }
}

// C ref: hack.c cannot_push()
export async function cannot_push(otmp, rx, ry, map, display, player = null) {
    if (!isok(rx, ry)) {
        await cannot_push_msg(otmp, rx, ry, map, display, player);
        return true;
    }
    const loc = map.at(rx, ry);
    if (!loc || IS_OBSTRUCTED(loc.typ) || closed_door(rx, ry, map)) {
        await cannot_push_msg(otmp, rx, ry, map, display, player);
        return true;
    }
    if (map.monsterAt(rx, ry)) {
        await cannot_push_msg(otmp, rx, ry, map, display, player);
        return true;
    }
    if (sobj_at(BOULDER, rx, ry, map)) {
        await cannot_push_msg(otmp, rx, ry, map, display, player);
        return true;
    }
    return false;
}

// C ref: hack.c rock_disappear_msg()
export async function rock_disappear_msg(otmp, display) {
    const name = (otmp?.otyp === BOULDER) ? 'The boulder' : 'It';
    await display?.putstr_message(`${name} disappears.`);
}

function currentMovesLikeC(game) {
    if (!game || typeof game !== 'object') return 0;
    const moves = Number(game.moves);
    if (Number.isFinite(moves) && moves > 0) return moves;
    const turnCount = Number(game.turnCount);
    // C's svm.moves is initialized to 1 and advances once per completed turn.
    return Number.isFinite(turnCount) ? (turnCount + 1) : 0;
}

function boulderPushShouldMessage(otmp, game) {
    if (!game || typeof game !== 'object' || !otmp) return true;
    const moves = currentMovesLikeC(game);
    if (otmp.o_id !== game.bldrpush_oid) {
        game.bldrpushtime = moves + 1;
        game.bldrpush_oid = otmp.o_id;
    }
    const bldrpushtime = Number(game.bldrpushtime) || 0;
    const givemesg = (moves > bldrpushtime + 2) || (moves < bldrpushtime);
    game.bldrpushtime = moves;
    return givemesg;
}

// C ref: hack.c dopush()
export async function dopush(sx, sy, rx, ry, otmp, _costly, map, display, player, game) {
    const name = (otmp?.otyp === BOULDER) ? 'the boulder' : 'that object';
    if (boulderPushShouldMessage(otmp, game)) {
        const effort = player?.throwsRocks ? 'little' : 'great';
        await display?.putstr_message(`With ${effort} effort you move ${name}.`);
    }
    movobj(otmp, rx, ry, map);
    return { sx, sy, rx, ry };
}

// C ref: hack.c moverock_done()
export function moverock_done(_sx, _sy, _map) {
    // In C this updates movement side effects after push. JS keeps this as a
    // named boundary and performs side effects at the callsites.
}

// C ref: hack.c moverock_core()
export async function moverock_core(sx, sy, dx, dy, player, map, display, game) {
    const otmp = sobj_at(BOULDER, sx, sy, map);
    if (!otmp) return 0;
    // C ref: hack.c moverock_core() — ensure this boulder is top object.
    const here = map.objectsAt ? map.objectsAt(sx, sy) : [];
    if (here.length > 0 && here[here.length - 1] !== otmp) movobj(otmp, sx, sy, map);
    const rx = sx + dx;
    const ry = sy + dy;
    if (await cannot_push(otmp, rx, ry, map, display, player)) {
        return -1;
    }
    // C ref: hack.c moverock_core() — relink at top of fobj chain before dopush.
    if (Array.isArray(map?.objects) && map.objects.length > 0
        && map.objects[map.objects.length - 1] !== otmp) {
        movobj(otmp, sx, sy, map);
    }
    // C ref: hack.c dopush() — strength exercise happens before moving rock.
    if (player && !player.throwsRocks) await exercise(player, A_STR, true);
    await dopush(sx, sy, rx, ry, otmp, false, map, display, player, game);
    if (game) game.lastMoveDir = [dx, dy];
    return 1;
}

// C ref: hack.c moverock()
// Autotranslated from hack.c:336
export async function moverock(a0, a1, a2, a3, a4, a5, a6, a7) {
    // Runtime call path uses explicit coords/dir:
    // moverock(sx, sy, dx, dy, player, map, display, game)
    if (typeof a0 === 'number') {
        const sx = a0, sy = a1, dx = a2, dy = a3;
        const player = a4, map = a5, display = a6, game = a7;
        const ret = await moverock_core(sx, sy, dx, dy, player, map, display, game);
        moverock_done(sx, sy, map);
        return ret;
    }
    // C-style wrapper fallback:
    // moverock(player, map, display, game) uses player.dx/player.dy.
    const player = a0, map = a1, display = a2, game = a3;
    const sx = player.x + player.dx, sy = player.y + player.dy;
    const ret = await moverock_core(sx, sy, player.dx, player.dy, player, map, display, game);
    moverock_done(sx, sy, map);
    return ret;
}

// C ref: hack.c cant_squeeze_thru()
// Returns 0 if the player can squeeze through, nonzero if blocked:
//   1: body too large, 2: carrying too much, 3: Sokoban restriction
// Caller should already have checked bad_rock for both intermediate cells.
// C ref: hack.c:935 cant_squeeze_thru()
export function cant_squeeze_thru(player, map) {
    if (!player) return 0;
    // Passes_walls (phasing) always allows squeeze
    if (player.passesWalls || player.phasing
        || (player.uprops && player.uprops[PASSES_WALLS])) return 0;
    // bigmonst check: msize >= MZ_LARGE (3)
    const mdat = player.type;
    const msize = mdat ? (mdat.msize ?? 0) : 0;
    const isBig = msize >= MZ_LARGE;
    if (isBig) {
        // amorphous/whirly/noncorporeal/slithy/can_fog checks omitted for brevity;
        // player in normal form is none of these
        return 1; // body too large
    }
    // C ref: hack.c:954 — weight check WT_TOOMUCH_DIAGONAL = 600
    const WT_TOOMUCH_DIAGONAL = 600;
    const wt = inv_weight(player) + weight_cap(player);
    if (wt > WT_TOOMUCH_DIAGONAL) return 2; // lugging too much
    // Sokoban restriction
    if (map?.flags?.is_sokoban) return 3;
    return 0; // can squeeze through
}

// C ref: hack.c notice_mons_cmp()
export function notice_mons_cmp(a, b) {
    const ax = a?.mx ?? 0;
    const ay = a?.my ?? 0;
    const bx = b?.mx ?? 0;
    const by = b?.my ?? 0;
    return (ax + ay) - (bx + by);
}

// C ref: hack.c domove_bump_mon()
export async function domove_bump_mon(mon, _glyph, _nopick, game, display) {
    const ctx = ensure_context(game);
    if (!mon || mon.dead) return { handled: false, tookTime: false };
    const visibleEnough = (!mon.mundetected) || !!mon.tame || !!mon.peaceful;
    // C: m-prefix bump into known/visible monster consumes a turn and stops.
    if (_nopick && !ctx.travel && visibleEnough) {
        if (mon.peaceful && !game?.flags?.hallucination) {
            await display?.putstr_message(`Pardon me, ${m_monnam(mon)}.`);
        } else {
            await display?.putstr_message(`You move right into ${y_monnam(mon)}.`);
        }
        return { handled: true, tookTime: true };
    }
    return { handled: false, tookTime: false };
}

// C ref: hack.c domove_swap_with_pet()
export async function domove_swap_with_pet(mon, nx, ny, dir, player, map, display, game) {
    const oldPlayerX = player.x;
    const oldPlayerY = player.y;
    const diagSwap = (oldPlayerX !== nx) && (oldPlayerY !== ny);
    const monTrap = mon?.mtrapped ? (map?.trapAt ? map.trapAt(mon.mx, mon.my) : null) : null;
    const blockedPit = !!(mon?.mtrapped
        && monTrap
        && is_pit(monTrap.ttyp)
        && sobj_at(BOULDER, monTrap.tx, monTrap.ty, map));
    const noDiag = Number(mon?.mndx ?? -1) === PM_GRID_BUG;
    const heroOldTrap = map?.trapAt ? map.trapAt(oldPlayerX, oldPlayerY) : null;

    // C ref: hack.c domove_swap_with_pet() — clear hidden state before swap checks.
    mon.mundetected = 0;
    if (monTrap) mon.mtrapped = true;
    else mon.mtrapped = 0;

    if (blockedPit) {
        // C: silently fail swap when pet is pinned in pit by a boulder.
        return false;
    }
    if (diagSwap && noDiag) {
        await You('stop.  %s can\'t move diagonally.', YMonnam(mon));
        return false;
    }
    if (mon.peaceful && mon.mtrapped) {
        await You('stop.  %s can\'t move out of that trap.', YMonnam(mon));
        return false;
    }
    if (mon.peaceful && heroOldTrap) {
        await You('stop.  %s doesn\'t want to swap places.', YMonnam(mon));
        return false;
    }

    // C ref: remove_monster/place_monster → newsym at old+new positions
    const petOldX = mon.mx, petOldY = mon.my;
    mon.mx = oldPlayerX;
    mon.my = oldPlayerY;
    player.x = nx;
    player.y = ny;
    player.moved = true;
    game.lastMoveDir = dir;
    player.displacedPetThisTurn = true;
    await maybeHandleShopEntryMessage(game, oldPlayerX, oldPlayerY);

    // C ref: player moved — recompute FOV immediately (see domove_core comment).
    if (game.fov) {
        mark_vision_dirty();
        vision_recalc();
        newsym(oldPlayerX, oldPlayerY);  // show pet at old player position
        newsym(player.x, player.y);      // show '@' at new player position
        display.renderStatus(player);
    }
    await display.putstr_message(`You swap places with ${y_monnam(mon)}.`);
    // C ref: object display happens in spoteffects/autopickup (domove post-move),
    // not in domove_swap_with_pet.  Caller (domove_core) handles objects.
    return true;
}

// C ref: hack.c domove_attackmon_at()
export async function domove_attackmon_at(mon, nx, ny, dir, player, map, display, game) {
    const ctx = ensure_context(game);
    if (!mon) return { handled: false };
    const forcefight = has_forcefight_prefix(game, ctx);
    if (forcefight && ctx) ctx.forcefight = 1;
    const safeDogEnabled = !!(game?.flags?.safe_pet ?? game?.flags?.safe_dog ?? true);
    const disoriented = !!(player?.confused || player?.Confusion
        || player?.hallucinating || player?.Hallucination
        || player?.stunned || player?.Stunned);
    // C ref: is_safemon(mon) uses canspotmon(mon), not canseemon(mon).
    // Use map+FOV-aware spotting semantics so safe-mon gating matches C.
    const safeMonVisible = canSpotMonsterForMap(mon, map, player, game?.fov || null);
    // C ref: is_safemon() protects peaceful monsters and (optionally) tame pets.
    const safeMon = !!mon.peaceful || (!!mon.tame && safeDogEnabled);
    const shouldDisplace = safeMon
        && safeMonVisible
        && !disoriented
        && !forcefight;
    runTrace(
        `step=${replayStepLabel(map)}`,
        'domove_attackmon_at',
        `mon=${mon?.mndx ?? '?'}@${mon?.mx},${mon?.my}`,
        `target=${nx},${ny}`,
        `tame=${mon?.tame ? 1 : 0}`,
        `peaceful=${mon?.peaceful ? 1 : 0}`,
        `visible=${safeMonVisible ? 1 : 0}`,
        `safe=${safeMon ? 1 : 0}`,
        `displace=${shouldDisplace ? 1 : 0}`,
        `forcefight=${forcefight ? 1 : 0}`,
    );
    if (shouldDisplace) {
        const monData = mon.data || mon.type || {};
        const playerLoc = map?.at ? map.at(player.x, player.y) : null;
        const punished = !!(player?.Punished || player?.punished || player?.uchain);
        const petIsLongworm = !!(is_longworm(monData) && mon.wormno);
        const obstructedHeroSquare = !!(playerLoc && IS_OBSTRUCTED(playerLoc.typ));
        // C ref: uhitm.c do_attack() — evaluate foo first (including rn2(7)),
        // then only check in-shop when foo is false.
        const foo = (
            punished
            || !rn2(7)
            || petIsLongworm
            || (obstructedHeroSquare && !passes_walls(monData))
        );
        let inTendedShop = false;
        if (!foo) {
            const monLoc = map?.at ? map.at(mon.mx, mon.my) : null;
            const monRoomNo = Number(monLoc?.roomno || 0);
            const monRoom = (monRoomNo >= ROOMOFFSET) ? map?.rooms?.[monRoomNo - ROOMOFFSET] : null;
            inTendedShop = !!(monRoom
                && Number(monRoom.rtype || 0) >= SHOPBASE
                && monRoom.resident
                && inhishop(monRoom.resident, map));
        }
        const blocked = (inTendedShop || foo);
        if (blocked) {
            if (mon.tame) {
                await monflee(mon, rnd(6), false, false, player, display, null);
            }
            const label = YMonnam(mon);
            // C ref: uhitm.c:499 — You("stop.  %s is in the way!", ...)
            // Route through pline/You so --More-- semantics stay C-faithful.
            await You('stop.  %s is in the way!', label);
            end_running(true, game);
            clear_forcefight_prefix(game, ctx);
            return { handled: true, moved: false, tookTime: true };
        }
        if (mon.mfrozen || mon.mcanmove === false || mon.msleeping
            || (((mon.data || mon.type)?.mmove ?? 0) === 0 && rn2(6))) {
            const label = YMonnam(mon);
            // C ref: uhitm.c:504 — pline("%s doesn't seem to move!", Monnam(mtmp))
            await pline("%s doesn't seem to move!", label);
            end_running(true, game);
            clear_forcefight_prefix(game, ctx);
            return { handled: true, moved: false, tookTime: true };
        }
        // C ref: hack.c — safemon displacement is resolved later in domove()
        // after movement viability checks; this stage only decides that attack
        // should not consume the turn yet.
        clear_forcefight_prefix(game, ctx);
        return { handled: false, pendingSwap: true, mon };
    }

    if (mon.peaceful && !mon.tame && game.flags?.confirm) {
        const answer = await ynFunction(
            `Really attack ${x_monnam(mon)}?`,
            'yn',
            'n'.charCodeAt(0),
            display
        );
        if (answer !== 'y'.charCodeAt(0)) {
            await display.putstr_message('Cancelled.');
            clear_forcefight_prefix(game, ctx);
            return { handled: true, moved: false, tookTime: false };
        }
    }
    const killed = await do_attack(player, mon, display, map, { game, context: ctx });
    clear_forcefight_prefix(game, ctx);
    if (killed) map.removeMonster(mon);
    player.moved = true;
    return { handled: true, moved: false, tookTime: true };
}

// C ref: hack.c domove_fight_ironbars()
export async function domove_fight_ironbars(x, y, map, display, game, player) {
    const ctx = ensure_context(game);
    const loc = map?.at ? map.at(x, y) : null;
    const hasWeapon = !!(player?.weapon || player?.uwielded || player?.uwep);
    if (!has_forcefight_prefix(game, ctx) || !loc || loc.typ !== IRONBARS || !hasWeapon) return false;
    if (display) await display.putstr_message('You attack the iron bars.');
    clear_forcefight_prefix(game, ctx);
    return true; // action handled, consumes a turn
}

// C ref: hack.c domove_fight_web()
export async function domove_fight_web(x, y, map, display, game) {
    const ctx = ensure_context(game);
    const trap = map?.trapAt ? map.trapAt(x, y) : null;
    if (!has_forcefight_prefix(game, ctx) || !trap || trap.ttyp !== WEB || !trap.tseen) return false;
    if (display) await display.putstr_message('You cut through the web.');
    const idx = map.traps.indexOf(trap);
    if (idx >= 0) map.traps.splice(idx, 1);
    clear_forcefight_prefix(game, ctx);
    return true; // action handled, consumes a turn
}

// C ref: hack.c domove_fight_empty()
export async function domove_fight_empty(x, y, map, display, game) {
    const ctx = ensure_context(game);
    if (!has_forcefight_prefix(game, ctx) || map?.monsterAt?.(x, y)) return false;
    const loc = map?.at ? map.at(x, y) : null;
    let target = '';
    if (loc) {
        if (IS_WALL(loc.typ)) {
            target = 'the wall';
        } else if (loc.typ === STAIRS) {
            if (map.upstair && map.upstair.x === x && map.upstair.y === y) {
                target = 'the branch staircase up';
            } else if (map.dnstair && map.dnstair.x === x && map.dnstair.y === y) {
                target = 'the branch staircase down';
            } else {
                target = loc.stairdir ? 'the branch staircase up' : 'the branch staircase down';
            }
        }
    }
    await display?.putstr_message(target ? `You harmlessly attack ${target}.` : 'You attack thin air.');
    clear_forcefight_prefix(game, ctx);
    return true;
}

// Handle directional movement
// C ref: hack.c domove_core() worker
export async function domove_core(dir, player, map, display, game) {
    const ctx = ensure_context(game);
    const flags = game.flags || {};
    const oldX = player.x;
    const oldY = player.y;
    const domoveNotime = (reason) => {
        if (!runTraceEnabled()) return;
        runTrace(
            `step=${replayStepLabel(map)}`,
            'domove_notime',
            reason,
            `from=${oldX},${oldY}`,
            `dir=${moveDir?.[0] ?? 0},${moveDir?.[1] ?? 0}`,
            `run=${Number(ctx.run || 0)}`,
            `travel=${ctx.travel ? 1 : 0}`,
        );
    };
    // Preserve pre-move coordinates for C-style URETREATING checks.
    game.ux0 = oldX;
    game.uy0 = oldY;
    let moveDir = dir;
    if (ctx.travel) {
        const _tOk = await findtravelpath(TRAVP_TRAVEL, game);
        if (!_tOk) {
            await findtravelpath(TRAVP_GUESS, game);
        }
        // C ref: hack.c:2708 — reset travel1 after findtravelpath.
        ctx.travel1 = 0;
        if (Array.isArray(game.travelPath) && game.travelPath.length > 0) {
            moveDir = game.travelPath[0];
        } else {
            // No path found — stop traveling.
            // C ref: hack.c domove() when findtravelpath fails to set dx/dy.
            end_running(true, game);
            domoveNotime('travel.no-path');
            return { moved: false, tookTime: false };
        }
    }
    let nx = player.x + moveDir[0];
    let ny = player.y + moveDir[1];
    player.dx = moveDir[0];
    player.dy = moveDir[1];
    // C ref: cmd.c move-prefix handling is consumed by the attempted move
    // path, even when that move is blocked.
    const nopick = !!ctx.nopick;
    ctx.nopick = 0;
    ctx.door_opened = 0;
    ctx.move = 0;

    if (await carrying_too_much(player, map, display)) {
        domoveNotime('carrying-too-much');
        return { moved: false, tookTime: false };
    }
    if (await air_turbulence(player, map, display)) {
        domoveNotime('air-turbulence');
        return { moved: false, tookTime: false };
    }
    slippery_ice_fumbling(player, map);
    const impDest = { x: nx, y: ny };
    if (impaired_movement(player, map, impDest, game)) {
        domoveNotime('impaired-movement');
        return { moved: false, tookTime: false };
    }
    nx = impDest.x;
    ny = impDest.y;

    const tDest = { x: nx, y: ny };
    if (await water_turbulence(player, map, display, tDest)) {
        domoveNotime('water-turbulence');
        return { moved: false, tookTime: false };
    }
    nx = tDest.x;
    ny = tDest.y;

    if (!isok(nx, ny) && has_forcefight_prefix(game, ctx)) {
        if (await domove_fight_empty(nx, ny, map, display, game)) {
            return { moved: false, tookTime: true };
        }
    }
    if (await move_out_of_bounds(nx, ny, display, flags)) {
        ctx.move = 0;
        nomul(0, game);
        domoveNotime('out-of-bounds');
        return { moved: false, tookTime: false };
    }
    if (await avoid_running_into_trap_or_liquid(nx, ny, player, map, display, ctx.run)) {
        domoveNotime('avoid-run-trap-liquid');
        return { moved: false, tookTime: false };
    }

    if (!isok(nx, ny)) {
        await display.putstr_message("You can't move there.");
        domoveNotime('invalid-destination');
        return { moved: false, tookTime: false };
    }

    let loc = map.at(nx, ny);

    // C ref: hack.c:2741 escape_from_sticky_mon(x, y)
    // If hero is stuck to a monster and trying to move away, attempt escape.
    if (player.ustuck && (nx !== player.ustuck.mx || ny !== player.ustuck.my)) {
        const stuckMon = player.ustuck;
        if (stuckMon.dead || !monnear(stuckMon, player.x, player.y)) {
            // Monster died or is no longer adjacent — auto-release
            player.ustuck = null;
        } else {
            // C ref: hack.c:2645 rn2(!u.ustuck->mcanmove ? 8 : 40)
            const canMove = stuckMon.mcanmove !== false && !stuckMon.mfrozen;
            const escapeRoll = rn2(canMove ? 40 : 8);
            if (escapeRoll <= 2) {
                // Escape successful (cases 0, 1, 2)
                await display.putstr_message(`You pull free from the ${x_monnam(stuckMon)}.`);
                player.ustuck = null;
            } else if (escapeRoll === 3 && !canMove) {
                // Wake/release frozen monster, then check tame
                stuckMon.mfrozen = 1;
                stuckMon.sleeping = false;
                if (stuckMon.tame && !game?.flags?.conflict) {
                    await display.putstr_message(`You pull free from the ${x_monnam(stuckMon)}.`);
                    player.ustuck = null;
                } else {
                    await display.putstr_message(`You cannot escape from the ${x_monnam(stuckMon)}!`);
                    return { moved: false, tookTime: true };
                }
            } else {
                // Failed to escape
                if (stuckMon.tame && !game?.flags?.conflict) {
                    await display.putstr_message(`You pull free from the ${x_monnam(stuckMon)}.`);
                    player.ustuck = null;
                } else {
                    await display.putstr_message(`You cannot escape from the ${x_monnam(stuckMon)}!`);
                    return { moved: false, tookTime: true };
                }
            }
        }
    }

    // Check for monster at target position
    let pendingSwapMon = null;
    const mon = map.monsterAt(nx, ny);
    runTrace(
        `step=${replayStepLabel(map)}`,
        'domove_target',
        `from=${oldX},${oldY}`,
        `to=${nx},${ny}`,
        `mon=${mon ? `${mon.mndx}@${mon.mx},${mon.my}` : 'none'}`,
    );
    if (mon) {
        const bump = await domove_bump_mon(mon, null, nopick, game, display);
        if (bump.handled) {
            return { moved: false, tookTime: !!bump.tookTime };
        }
        const attackResult = await domove_attackmon_at(mon, nx, ny, moveDir, player, map, display, game);
        if (attackResult.handled) {
            return { moved: !!attackResult.moved, tookTime: !!attackResult.tookTime };
        }
        if (attackResult.pendingSwap && attackResult.mon === mon) {
            pendingSwapMon = mon;
        }
    }

    if (await domove_fight_ironbars(nx, ny, map, display, game, player)) {
        return { moved: false, tookTime: true };
    }
    if (await domove_fight_web(nx, ny, map, display, game)) {
        return { moved: false, tookTime: true };
    }

    const sokoban = !!(map?.flags?.is_sokoban || map?.flags?.in_sokoban || game?.flags?.sokoban);
    if (sobj_at(BOULDER, nx, ny, map) && (sokoban || !player?.passesWalls)) {
        const moved = await moverock(nx, ny, moveDir[0], moveDir[1], player, map, display, game);
        if (moved < 0) {
            domoveNotime('moverock-refused');
            return { moved: false, tookTime: false };
        }
    }

    loc = map.at(nx, ny);
    if (await domove_fight_empty(nx, ny, map, display, game)) {
        return { moved: false, tookTime: true };
    }

    // Closed/locked door auto-open gate.
    // C ref: hack.c test_move() only attempts doopen_indir() when:
    // autoopen enabled, not running, and not confused/stunned/fumbling.
    // If that gate is not met, fall through to test_move() for regular
    // blocked-door messaging ("That door is closed.", bump text, etc).
    if (loc && IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED))) {
        const flags = game?.flags || map?.flags || {};
        const canAutoOpen = !!(flags.autoopen
            && !ctx.run
            && !player.confused
            && !player.stunned
            && !player.fumbling);

        if (!canAutoOpen) {
            if (nx === player.x || ny === player.y) {
                if (player.blind || player.stunned || acurr(player, A_DEX) < 10 || player.fumbling) {
                    await display.putstr_message("Ouch!  You bump into a door.");
                    await exercise(player, A_DEX, false);
                    ctx.door_opened = 1;
                    ctx.move = 1;
                    nomul(0, game);
                } else {
                    await display.putstr_message("That door is closed.");
                }
            }
            domoveNotime('closed-door-no-autoopen');
            return { moved: false, tookTime: false };
        }

        if (loc.flags & D_LOCKED) {
            await pline("This door is locked.");
            if (autounlock_has_action(flags, 'apply-key')) {
                const unlocktool = autokey(player, true);
                if (unlocktool) {
                    const res = await pick_lock(game, unlocktool, nx, ny, null);
                    // C behavior: lock-picking occupation can run immediately
                    // on this command cycle before the next monster turn.
                    if (res !== 0 && game?.occupation && typeof game.occupation.fn === 'function') {
                        const cont = await game.occupation.fn(game);
                        if (!cont) {
                            game.occupation = null;
                            game.pendingPrompt = null;
                        }
                    }
                    return { moved: false, tookTime: res !== 0 };
                }
            }
            domoveNotime('locked-door-autoopen-no-tool');
            return { moved: false, tookTime: false };
        }

        const str = acurr(player, A_STR);
        const dex = acurr(player, A_DEX);
        const con = acurr(player, A_CON);
        const threshold = Math.floor((str + dex + con) / 3);
        const luck = (player.uluck ?? player.luck) || 0;
        if (rnl(20, luck) < threshold) {
            loc.flags = (loc.flags & ~D_CLOSED) | D_ISOPEN;
            await display.putstr_message("The door opens.");
            domoveNotime('closed-door-autoopen-opened');
        } else {
            await exercise(player, A_STR, true);
            await display.putstr_message("The door resists!");
            domoveNotime('closed-door-autoopen-resisted');
        }
        return { moved: false, tookTime: false };
    }
    if (!await test_move(player.x, player.y, moveDir[0], moveDir[1], DO_MOVE, player, map, display, game)) {
        // C ref: hack.c:2824-2829 — when test_move fails, C sets
        // context.move = 0 and calls nomul(0) (unless door_opened).
        // nomul(0) clears multi, which stops travel and running.
        if (!ctx.door_opened) {
            ctx.move = 0;
            nomul(0, game);
        }
        domoveNotime('test-move-failed');
        return { moved: false, tookTime: false };
    }
    if (await swim_move_danger(nx, ny, player, map, display)) {
        // C ref: hack.c:2833-2836 — swim_move_danger sets move=0, nomul(0)
        ctx.move = 0;
        nomul(0, game);
        domoveNotime('swim-move-danger');
        return { moved: false, tookTime: false };
    }
    if (await u_rooted(player, display, game)) {
        domoveNotime('u-rooted');
        return { moved: false, tookTime: false };
    }
    if (player.utrap) {
        const moved = await trapmove(player, nx, ny, display, map);
        // C ref: hack.c trapmove() — failed escape attempt still uses a turn.
        if (!moved) return { moved: false, tookTime: true };
    }
    loc = map.at(nx, ny);
    const steppingTrap = map.trapAt(nx, ny);
    // C ref: hack.c:2533-2561 — paranoid trap confirmation for known traps.
    // Respect 'm' (nopick) prefix suppression unless moving recklessly (run).
    if (steppingTrap && steppingTrap.tseen
        && !player.stunned && !player.confused
        && (!nopick || ctx.run)) {
        const trapType = steppingTrap.ttyp;
        const trapDesc = defsyms[trap_to_defsym(trapType)]?.explanation
            || defsyms[trap_to_defsym(trapType)]?.desc
            || 'trap';
        const into = into_vs_onto(trapType);
        const prompt = `Really ${u_locomotion('step', player)} ${into ? 'into' : 'onto'} that ${trapDesc}?`;
        const ans = await ynFunction(
            prompt,
            'yn',
            'n'.charCodeAt(0),
            display
        );
        if (ans !== 'y'.charCodeAt(0)) {
            domoveNotime('paranoid-trap-cancel');
            return { moved: false, tookTime: false };
        }
    }

    let swappedWithPet = false;
    if (pendingSwapMon && !pendingSwapMon.dead && map.monsterAt(nx, ny) === pendingSwapMon) {
        const swapped = await domove_swap_with_pet(pendingSwapMon, nx, ny, moveDir, player, map, display, game);
        clear_forcefight_prefix(game, ctx);
        if (!swapped) return { moved: false, tookTime: true };
        // C ref: after successful pet swap, domove() continues to post-move
        // processing (reset_occupations, run checks, spoteffects, etc).
        // Do NOT return early — fall through to post-move section.
        swappedWithPet = true;
        ctx.move = 1;
    }

    if (!swappedWithPet) {
        // Normal move: update player position and FOV.
        player.x = nx;
        player.y = ny;
        player.moved = true;
        ctx.move = 1;
        game.lastMoveDir = moveDir;
        // Clear force-fight prefix after successful movement.
        clear_forcefight_prefix(game, ctx);
        await maybeHandleShopEntryMessage(game, oldX, oldY);

        // C ref: player moved — recompute FOV immediately so newsym sees correct visibility.
        if (game.fov) {
            mark_vision_dirty();
            vision_recalc();
            newsym(oldX, oldY);          // update old player position (show terrain)
            newsym(player.x, player.y);  // update new player position (show '@')
            display.renderStatus(player);
        }
    }

    async function applySteppedTrap(trap) {
        if (!trap) return null;
        // C ref: trap.c dotrap() starts with nomul(0), which stops running/
        // multi-turn continuation before any trap branch (including early
        // seen-trap escape and in-air bypass returns).
        if (ctx) ctx.run = 0;
        if (game && Number.isFinite(game.multi)) game.multi = 0;
        const wasSeen = !!trap.tseen;
        const trapType = trap.ttyp;
        const teleDestX = Number.isInteger(trap?.teledest_x) ? trap.teledest_x
            : (Number.isInteger(trap?.teledest?.x) ? trap.teledest.x : -1);
        const teleDestY = Number.isInteger(trap?.teledest_y) ? trap.teledest_y
            : (Number.isInteger(trap?.teledest?.y) ? trap.teledest.y : -1);
        const forceTrap = (trapType === TELEP_TRAP) && isok(teleDestX, teleDestY);
        // C ref: trap.c dotrap() seen-trap escape gate (trap.c:2962-2970).
        // Without this, JS can apply full trap effects (e.g. teleport) where C
        // spends rn2(5) and escapes the trap instead.
        const undestroyable = (trapType === MAGIC_PORTAL || trapType === VIBRATING_SQUARE);
        const fumbling = !!(player?.Fumbling || player?.fumbling);
        const oldTrap = map?.trapAt?.(oldX, oldY) || null;
        const conjPit = !!(oldTrap && conjoined_pits(trap, oldTrap, true, player));
        const adjPit = !!adj_nonconjoined_pit(trap, player);
        const youdata = player.youmonst
            ? (player.youmonst.type || mons[player.youmonst.mndx]) : null;
        const clinging = !!(youdata && is_clinger(youdata));
        const lev = !!(player?.Levitation || player?.levitating);
        const fly = !!(player?.Flying || player?.flying);
        if (!forceTrap && (lev || fly) && floor_trigger(trapType)) {
            if (wasSeen) {
                const det = (trapType === ARROW_TRAP && !trap.madeby_u) ? 'an'
                    : (trap.madeby_u ? 'your' : 'that');
                const trapDesc = defsyms[trap_to_defsym(trapType)]?.explanation
                    || defsyms[trap_to_defsym(trapType)]?.desc
                    || 'trap';
                await You(`${fly ? 'fly' : 'float'} over ${det} ${trapDesc}.`);
            }
            return trap;
        }
        let seenEscapeRoll = null;
        if (!forceTrap && wasSeen && !fumbling && !undestroyable && trapType !== ANTI_MAGIC
            && !conjPit && !adjPit) {
            seenEscapeRoll = rn2(5);
        }
        if (seenEscapeRoll !== null
            && (seenEscapeRoll === 0 || (is_pit(trapType) && clinging))) {
            const trapDesc = defsyms[trap_to_defsym(trapType)]?.explanation
                || defsyms[trap_to_defsym(trapType)]?.desc
                || 'trap';
            const det = trap.madeby_u ? 'your' : 'that';
            await You(`escape ${det} ${trapDesc}.`);
            return trap;
        }
        // C ref: trap.c seetrap() — mark trap as discovered
        if (!trap.tseen) {
            trap.tseen = true;
        }
        // C ref: trap.c dotrap() — mount learns trap type and nearby monsters
        // that can see the trap remember it.
        if (player?.usteed) mon_learns_traps(player.usteed, trap.ttyp);
        mons_see_trap(trap, map);
        // C ref: trap.c trapeffect_arrow_trap()/trapeffect_dart_trap()
        // Hero branch in dotrap().
        if (trap.ttyp === ARROW_TRAP || trap.ttyp === DART_TRAP) {
            // C ref: trap.c checks trap->once && trap->tseen before calling
            // seetrap(); use pre-step visibility (wasSeen), not the updated
            // trap.tseen we just set above for awareness propagation.
            if (trap.once && wasSeen && !rn2(15)) {
                await You_hear(trap.ttyp === ARROW_TRAP ? 'a loud click!' : 'a soft click.');
                deltrap(map, trap);
                newsym(player.x, player.y);
                return trap;
            }
            trap.once = 1;
            seetrap(trap);
            const isDart = trap.ttyp === DART_TRAP;
            await pline(isDart ? 'A little dart shoots out at you!' : 'An arrow shoots out at you!');
            const otmp = t_missile(isDart ? DART : ARROW, trap);
            if (isDart && !rn2(6)) otmp.opoisoned = 1;
            const projectileName = isDart ? 'a little dart' : 'an arrow';
            const hit = await thitu(
                isDart ? 7 : 8,
                dmgval(otmp, player),
                otmp,
                projectileName,
                player,
                display,
                game
            );
            if (hit) {
                if (isDart && otmp.opoisoned) {
                    await poisoned(player, 'dart', A_CON, 'little dart', 10, true);
                }
            } else {
                place_object(otmp, player.x, player.y, map);
                if (!player.blind) observeObject(otmp);
                stackobj(otmp, map);
                newsym(player.x, player.y);
            }
            return trap;
        }
        // Trap-specific effects (no RNG for SQKY_BOARD)
        if (trap.ttyp === SQKY_BOARD) {
            await display.putstr_message('A board beneath you squeaks loudly.');
            // Match tty topline behavior where later same-turn messages replace
            // this trap notice rather than concatenating with it.
            display.messageNeedsMore = false;
        }
        // C ref: trap.c trapeffect_slp_gas_trap() for hero path
        else if (trap.ttyp === SLP_GAS_TRAP) {
            const duration = rnd(25);
            player.stunned = true;
            await display.putstr_message('A cloud of gas puts you to sleep!');
            // Keep duration for future full sleep handling without changing turn loop yet.
            player.sleepTrapTurns = Math.max(player.sleepTrapTurns || 0, duration);
        }
        // C ref: trap.c dofiretrap() for hero path (non-resistant baseline)
        else if (trap.ttyp === FIRE_TRAP) {
            const origDmg = d(2, 4);
            const fireDmg = d(2, 4);
            await display.putstr_message('A tower of flame erupts from the floor!');
            player.takeDamage(Math.max(0, fireDmg), 'a fire trap');
            // C ref: burnarmor(&youmonst) || rn2(3)
            if (!_burnarmor(player, player)) rn2(3);
            void origDmg; // kept for parity readability with C's orig_dmg handling.
        }
        // C ref: trap.c trapeffect_pit() — set trap timeout and apply damage.
        else if (trap.ttyp === PIT || trap.ttyp === SPIKED_PIT) {
            // C ref: trap.c trapeffect_pit() — stepping from one pit into an
            // adjacent non-conjoined pit consumes rn2(5) for "between pits"
            // message suffix selection before setting TT_PIT duration.
            const oldTrap = map?.trapAt?.(oldX, oldY) || null;
            const conjPit = !!(oldTrap && conjoined_pits(trap, oldTrap, true, player));
            const adjPit = !!adj_nonconjoined_pit(trap, player);
            if (adjPit && !conjPit) rn2(5);
            const trapTurns = rn2(6) + 2; // rn1(6,2)
            player.pitTrapTurns = Math.max(player.pitTrapTurns || 0, trapTurns);
            // C ref: trap.c set_utrap(rn1(6,2), TT_PIT)
            player.utrap = trapTurns;
            player.utraptype = TT_PIT;
            const pitDmg = rnd(trap.ttyp === SPIKED_PIT ? 10 : 6);
            player.takeDamage(Math.max(0, pitDmg), trap.ttyp === SPIKED_PIT
                ? 'a pit of spikes'
                : 'a pit');
            if (trap.ttyp === SPIKED_PIT) {
                rn2(6); // C ref: 1-in-6 poison-spike branch gate.
                // C ref: trap.c trapeffect_pit() emits both lines when falling
                // into a spiked pit: first "fall into a pit", then "land on spikes".
                await display.putstr_message('You fall into a pit!');
                await display.putstr_message('You land on a set of sharp iron spikes!');
            } else {
                await display.putstr_message('You fall into a pit!');
            }
            // C ref: trap.c:1943-1944
            await exercise(player, A_STR, false);
            await exercise(player, A_DEX, false);
        }
        // C ref: trap.c trapeffect_anti_magic()
        else if (trap.ttyp === ANTI_MAGIC) {
            // C ref: trap.c trapeffect_anti_magic() + drain_en()
            let drain = c_d(2, 6); // 2..12
            const halfd = rnd(Math.max(1, Math.floor(drain / 2)));
            let exclaim = false;
            if (player.pwmax > drain) {
                player.pwmax = Math.max(0, player.pwmax - halfd);
                drain -= halfd;
                exclaim = true;
            }
            if (player.pwmax < 1) {
                player.pw = 0;
                player.pwmax = 0;
                await display.putstr_message('You feel momentarily lethargic.');
            } else {
                let n = drain;
                if (n > Math.floor((player.pw + player.pwmax) / 3)) {
                    n = rnd(n);
                }
                let punct = exclaim ? '!' : '.';
                if (n > player.pw) punct = '!';
                player.pw -= n;
                if (player.pw < 0) {
                    player.pwmax = Math.max(0, player.pwmax - rnd(-player.pw));
                    player.pw = 0;
                } else if (player.pw > player.pwmax) {
                    player.pw = player.pwmax;
                }
                await display.putstr_message(`You feel your magical energy drain away${punct}`);
            }
        }
        // C ref: trap.c dotrap() TELEP_TRAP -> teleds/safe_teleds path.
        else if (trap.ttyp === TELEP_TRAP) {
            await tele_trap(trap, game);
            return 'teleported';
        }
        // C ref: trap.c dotrap() -> fall_through(TRUE, ...)
        else if (trap.ttyp === TRAPDOOR || trap.ttyp === HOLE) {
            await pline(trap.ttyp === TRAPDOOR
                ? 'A trap door opens up under you!'
                : "There's a gaping hole under you!");
            await You('fall down a shaft!');
            // Falling to another level should pause on the combined trap message
            // before the level transition redraw.
            if (display && typeof display.renderMoreMarker === 'function') {
                display.renderMoreMarker();
                display.markMorePending({ source: 'hack.fall-through' });
                if (game) game._pendingDeferredTurnAfterMore = true;
            }
            const currentDepth = Number.isInteger(player?.dungeonLevel)
                ? player.dungeonLevel
                : (Number.isInteger(map?._genDlevel) ? map._genDlevel : 1);
            const destDepth = Number.isInteger(trap?.dst?.dlevel)
                ? trap.dst.dlevel
                : (currentDepth + 1);
            // C ref: trap.c fall_through() schedules deferred level change with
            // UTOTYPE_FALLING so goto_level applies fall-damage semantics.
            schedule_goto(player, destDepth, 0x02, null, null);
        } else if (trap.ttyp === ROCKTRAP) {
            // TODO(parity): hero rock-trap detail path is not fully modeled yet.
            // Keep branch explicit to avoid accidental fallthrough semantics.
        }
        return trap;
    }

    // C ref: hack.c spoteffects() order:
    // - non-pit trap squares: pickup/look_here first, then dotrap
    // - pit/spiked pit: dotrap first, then pickup
    const trap = map.trapAt(nx, ny);
    const pitTrap = !!(trap && (trap.ttyp === PIT || trap.ttyp === SPIKED_PIT));
    if (pitTrap) {
        const trapResult = await applySteppedTrap(trap);
        if (trapResult === 'teleported') {
            return { moved: true, tookTime: true };
        }
    }

    // Helper function: Check if object class matches pickup_types string
    // C ref: pickup.c pickup_filter() and flags.pickup_types
    function shouldAutopickup(obj, pickupTypes, costly) {
        const howLost = obj?.how_lost;
        const wasThrown = howLost === LOST_THROWN || howLost === 'LOST_THROWN' || howLost === 'thrown';
        const wasDropped = howLost === LOST_DROPPED || howLost === 'LOST_DROPPED' || howLost === 'dropped';
        const wasStolen = howLost === LOST_STOLEN || howLost === 'LOST_STOLEN' || howLost === 'stolen';
        const wasExploding = howLost === LOST_EXPLODING || howLost === 'LOST_EXPLODING' || howLost === 'exploding';
        const droppedNoPick = !!(game.flags?.nopick_dropped || game.flags?.dropped_nopick);

        // C ref: pickup.c autopick_testobj() loss-state overrides.
        if ((game.flags?.pickup_thrown && (wasThrown || !!obj?._thrownByPlayer))
            || (game.flags?.pickup_stolen && wasStolen)) {
            return true;
        }
        if (droppedNoPick && wasDropped) return false;
        if (wasExploding) return false;

        // C ref: pickup.c autopick_testobj() — reject unpaid floor items in shops.
        if (costly && !obj?.no_charge) {
            return false;
        }
        // If pickup_types is empty, pick up all non-gold items (backward compat)
        if (!pickupTypes || pickupTypes === '') {
            return true;
        }

        // Map object class to symbol character
        const classToSymbol = {
            [WEAPON_CLASS]: ')',
            [ARMOR_CLASS]: '[',
            [RING_CLASS]: '=',
            [AMULET_CLASS]: '"',
            [TOOL_CLASS]: '(',
            [FOOD_CLASS]: '%',
            [POTION_CLASS]: '!',
            [SCROLL_CLASS]: '?',
            [SPBOOK_CLASS]: '+',
            [WAND_CLASS]: '/',
            [COIN_CLASS]: '$',
            [GEM_CLASS]: '*',
            [ROCK_CLASS]: '`',
        };

        const symbol = classToSymbol[obj.oclass];
        return symbol && pickupTypes.includes(symbol);
    }

    // Autopickup — C ref: hack.c:3265 pickup(1)
    // C ref: pickup.c pickup() checks flags.pickup && !context.nopick
    const objs = map.objectsAt(nx, ny);
    let pickedUp = false;

    const costly = costly_spot(nx, ny, map);

    // C ref: pickup.c pickup() — running into objects stops running before
    // autopick processing (which can suppress pickup on this step).
    let suppressAutopickThisStep = false;
    if (objs.length > 0 && Number(ctx.run || 0) > 0 && Number(ctx.run || 0) !== 8 && !nopick) {
        nomul(0, game);
        suppressAutopickThisStep = true;
    }

    const mdat = player?.polyData || player?.data || null;
    const inPool = is_pool(player.x, player.y, map) && !player.underwater;
    const inLava = is_lava(player.x, player.y, map);
    const canReachFloor = can_reach_floor(player, map, !!(trap && is_pit(trap.ttyp)));
    let canAutopickThisStep = !!(game.flags?.pickup && !nopick && !suppressAutopickThisStep && objs.length > 0);
    if (canAutopickThisStep && (inPool || inLava || !canReachFloor || (mdat && notake(mdat)))) {
        canAutopickThisStep = false;
    }

    // Pick up gold first if autopickup is enabled
    // C ref: pickup.c pickup() — autopickup gate applies to ALL items including gold
    if (canAutopickThisStep) {
        const gold = objs.find(o => o.oclass === COIN_CLASS);
        if (gold && shouldAutopickup(gold, '', costly)) {
            player.addToInventory(gold);
            map.removeObject(gold);
            await display.putstr_message(formatGoldPickupMessage(gold, player));
            pickedUp = true;
        }
    }

    // Then pick up other items if autopickup is enabled
    // C ref: pickup.c pickup() filters by pickup_types
    if (canAutopickThisStep) {
        const pickupTypes = game.flags?.pickup_types || '';
        const obj = objs.find(o => o.oclass !== COIN_CLASS && shouldAutopickup(o, pickupTypes, costly));
        if (obj) {
            observeObject(obj);
            const addResult = player.addToInventory(obj, { withMeta: true });
            const inventoryObj = addResult.item;
            map.removeObject(obj);
            if (addResult.discoveredByCompare) {
                await display.putstr_message('You learn more about your items by comparing them.');
            }
            await display.putstr_message(formatInventoryPickupMessage(obj, inventoryObj, player));
            pickedUp = true;
        }
    }

    // C ref: pickup.c pickup() — engravings come BEFORE items.

    // C ref: read engravings on the current square when not submerged.
    if (!is_lava(player.x, player.y, map)
        && !(is_pool(player.x, player.y, map) && !player.underwater)) {
        await read_engr_at(map, player.x, player.y, player, game);
    }

    // Show what's here if nothing was picked up
    // C ref: invent.c look_here() — terrain features (stairs, fountain, doorway)
    // are shown via dfeature_at() inside look_here(), not via flags.verbose.
    if (!pickedUp && objs.length > 0) {
        if (objs.length === 1) {
            // C ref: invent.c look_here() — show dfeature BEFORE object.
            const dfeature = dfeature_at(player.x, player.y, map, { depth: player.dungeonLevel });
            if (dfeature) {
                await display.putstr_message(`There is ${an(dfeature)} here.`);
            }
            const seen = objs[0];
            if (seen.oclass === COIN_CLASS) {
                const count = seen.quan || 1;
                if (count === 1) {
                    await display.putstr_message('You see here a gold piece.');
                } else {
                    await display.putstr_message(`You see here ${count} gold pieces.`);
                }
            } else {
                observeObject(seen);
                await display.putstr_message(`You see here ${describeGroundObjectForPlayer(seen, player, map)}.`);
            }
        } else {
            // C ref: invent.c look_here() — for 2+ objects, C uses a NHW_MENU
            // popup window ("Things that are here:") that the player dismisses.
            await look_here(player, map, objs.length);
        }
    }

    if (!pitTrap && trap) {
        const trapResult = await applySteppedTrap(trap);
        if (trapResult === 'teleported') {
            return { moved: true, tookTime: true };
        }
    }

    // C ref: hack.c:2682 + 2944-2947
    // domove() smudges only when gd.domove_succeeded carries DOMOVE flags.
    // If nomul(0) clears running during this move (for example read_engr_at()),
    // C clears the attempting gate and skips this post-move smudge.
    const runAtMoveStart = Number(ctx._runAtMoveStart || 0);
    const runClearedDuringMove = runAtMoveStart > 0 && Number(ctx.run || 0) === 0;
    if (!runClearedDuringMove) {
        await maybe_smudge_engr(map, oldX, oldY, player.x, player.y, player);
    }

    await runmode_delay_output(game, display);

    return { moved: true, tookTime: true };
}

// C ref: hack.c domove() entrypoint.
export async function domove(dir, player, map, display, game) {
    if (!Array.isArray(dir) || dir.length < 2) {
        return { moved: false, tookTime: false };
    }
    return domove_core(dir, player, map, display, game);
}

// C ref: cmd.c do_run() -> hack.c domove() with context.run
export async function do_run(dir, player, map, display, fov, game, runStyle = 'run') {
    const ctx = ensure_context(game);
    let runDir = dir;
    let steps = 0;
    let timedTurns = 0;
    const hasRunTurnHook = typeof game?.advanceRunTurn === 'function';
    const runModeValue = (runStyle === 'rush') ? 2 : (runStyle === 'shiftRun' ? 1 : 3);
    runTrace(
        `step=${replayStepLabel(map)}`,
        `start=(${player.x},${player.y})`,
        `dir=(${runDir[0]},${runDir[1]})`,
        `style=${runStyle}`,
        `hook=${hasRunTurnHook ? 1 : 0}`,
    );
    ctx.run = runModeValue;
    game.running = true;
    while (steps < 80) { // safety limit
        const beforeX = player.x;
        const beforeY = player.y;
        // Preserve run/rush attempt state across domove(). C gates post-domove
        // smudging on gd.domove_succeeded, which is derived from
        // gd.domove_attempting; nomul(0) during the move can clear that gate.
        ctx._runAtMoveStart = Number(ctx.run || 0);
        const result = await domove(runDir, player, map, display, game);
        ctx._runAtMoveStart = 0;
        if (result.tookTime) timedTurns++;
        runTrace(
            `step=${replayStepLabel(map)}`,
            `iter=${steps + 1}`,
            `dir=(${runDir[0]},${runDir[1]})`,
            `from=(${beforeX},${beforeY})`,
            `to=(${player.x},${player.y})`,
            `moved=${result.moved ? 1 : 0}`,
            `time=${result.tookTime ? 1 : 0}`,
        );

        // C-faithful run timing: each successful run step advances time once.
        // Important: blocked run steps that still consume time (pet in way,
        // forced-fight air swings, etc.) also advance a turn before run stops.
        if (hasRunTurnHook && result.tookTime) {
            await game.advanceRunTurn();
        }
        // C ref: read_engr_at() may stop running via nomul(0).
        if (Number(ctx.run || 0) === 0) break;
        if (!result.moved) break;
        steps++;

        const curLoc = map?.at?.(player.x, player.y);
        if (curLoc && IS_DOOR(curLoc.typ)) {
            break;
        }
        if (engr_at(map, player.x, player.y)) {
            break;
        }

        // C ref: vision_recalc at top of moveloop before lookaround — each
        // running step sees fresh FOV from the just-completed domove.
        vision_recalc();
        const look = await lookaround(map, player, fov, runDir, runStyle, display, game);
        if (Array.isArray(look?.nextDir)) {
            runDir = look.nextDir;
        }
        if (look?.stopReason) {
            runTrace(
                `step=${replayStepLabel(map)}`,
                `iter=${steps}`,
                `stop=${look.stopReason}`,
                `at=(${player.x},${player.y})`,
            );
            break;
        }

        // Update display during run
        display.renderMap(map, player, fov);
        display.renderStatus(player);

    }
    ctx.run = 0;
    ctx._runAtMoveStart = 0;
    game.running = false;
    return {
        moved: steps > 0,
        tookTime: hasRunTurnHook ? false : timedTurns > 0,
        runSteps: hasRunTurnHook ? 0 : timedTurns,
    };
}

// C ref: cmd.c do_rush()
export async function do_rush(dir, player, map, display, fov, game) {
    return do_run(dir, player, map, display, fov, game, 'rush');
}

function pickRunContinuationDir(map, player, dir) {
    const loc = map?.at(player.x, player.y);
    if (!loc || (loc.typ !== CORR && loc.typ !== SCORR)) return dir;

    const backDx = -dir[0];
    const backDy = -dir[1];
    const options = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
        if (dx === backDx && dy === backDy) continue;
        const nx = player.x + dx;
        const ny = player.y + dy;
        if (!isok(nx, ny)) continue;
        const nloc = map.at(nx, ny);
        if (nloc && ACCESSIBLE(nloc.typ)) {
            options.push([dx, dy]);
        }
    }
    return options.length === 1 ? options[0] : dir;
}

// Check if running should stop
// C ref: hack.c lookaround() -- checks for interesting things while running
export async function lookaround(map, player, fov, dir, runStyle = 'run', display = null, game = null) {
    const ctx = game ? ensure_context(game) : { run: (runStyle === 'rush') ? 2 : 3, travel: 0 };
    const runMode = Number(ctx.run ?? ((runStyle === 'rush') ? 2 : 3));
    const travel = !!ctx.travel;
    const ux = player.x;
    const uy = player.y;
    const [dx, dy] = dir;
    const flags = map?.flags || {};
    if (player?.blind || runMode === 0) {
        return { stopReason: null, nextDir: null };
    }
    // C: grid bugs can't continue diagonal run.
    if (player?.noDiag && dx && dy) {
        if (display) await display.putstr_message('You cannot move diagonally.');
        return { stopReason: 'no-diag', nextDir: null };
    }
    let corrct = 0;
    let noturn = 0;
    let x0 = 0;
    let y0 = 0;
    let m0 = 1;
    let i0 = 9;

    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            const infront = (x === ux + dx && y === uy + dy);
            if (!isok(x, y) || (x === ux && y === uy)) continue;

            const mon = map.monsterAt(x, y);
            const monVisible = !!(mon && !mon.dead
                && mon.m_ap_type !== M_AP_FURNITURE
                && mon.m_ap_type !== M_AP_OBJECT
                && canSeeMonsterForMap(mon, map, player, fov));
            if (monVisible) {
                const isSafeMon = !!(mon.tame || mon.peaceful || mon.mpeaceful);
                if ((runMode !== 1 && !isSafeMon) || (infront && !travel)) {
                    return { stopReason: infront ? 'monster-in-front' : 'hostile-nearby' };
                }
            }

            const loc = map.at(x, y);
            if (!loc || loc.typ === STONE) continue;
            if (x === ux - dx && y === uy - dy) continue;

            const isClosedDoor = closed_door(x, y, map);
            const doorMappear = !!(mon && mon.appear_as_type && IS_DOOR(mon.appear_as_type));
            let bcorr = false;

            if (await avoid_moving_on_trap(x, y, (infront && runMode > 1), map, display, flags)) {
                if (runMode === 1) {
                    bcorr = true;
                } else if (infront) {
                    return { stopReason: 'trap-ahead' };
                }
            }

            if (bcorr) {
                // goto bcorr
            } else
            if (IS_OBSTRUCTED(loc.typ) || loc.typ === ROOM || loc.typ === AIR || loc.typ === ICE) {
                continue;
            } else if (isClosedDoor || doorMappear) {
                if (x !== ux && y !== uy) continue;
                if (runMode !== 1 && !travel) {
                    return { stopReason: 'door-ahead' };
                }
                bcorr = true;
            } else if (loc.typ === CORR) {
                bcorr = true;
            } else if (is_pool_or_lava(x, y, map)) {
                if (infront && await avoid_moving_on_liquid(x, y, true, player, map, display, flags)) {
                    return { stopReason: 'liquid-ahead' };
                }
                continue;
            } else {
                if (runMode === 1) {
                    bcorr = true;
                } else if (runMode === 8) {
                    continue;
                } else if (mon && !mon.dead) {
                    continue;
                } else if (((x === ux - dx) && (y !== uy + dy))
                    || ((y === uy - dy) && (x !== ux + dx))) {
                    continue;
                } else {
                    return { stopReason: 'interesting-near' };
                }
            }

            if (bcorr) {
                const uLoc = map.at(ux, uy);
                if (uLoc && uLoc.typ !== ROOM) {
                    if (runMode === 1 || runMode === 3 || runMode === 8) {
                        const i = dist2(x, y, ux + dx, uy + dy);
                        if (i > 2) continue;
                        if (corrct === 1 && dist2(x, y, x0, y0) !== 1) noturn = 1;
                        if (i < i0) {
                            i0 = i;
                            x0 = x;
                            y0 = y;
                            m0 = mon ? 1 : 0;
                        }
                    }
                    corrct++;
                }
                continue;
            }
        }
    }

    if (corrct > 1 && runMode === 2) {
        return { stopReason: 'corridor-widens' };
    }
    if ((runMode === 1 || runMode === 3 || runMode === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        let turn = 0;
        if (i0 === 2) {
            turn = (dx === y0 - uy && dy === ux - x0) ? 2 : -2;
        } else if (dx && dy) {
            turn = ((dx === dy && y0 === uy) || (dx !== dy && y0 !== uy)) ? -1 : 1;
        } else {
            turn = ((x0 - ux === y0 - uy && !dy) || (x0 - ux !== y0 - uy && dy)) ? 1 : -1;
        }
        const lastTurn = Number.isInteger(player.last_str_turn) ? player.last_str_turn : 0;
        turn += lastTurn;
        if (turn <= 2 && turn >= -2) {
            player.last_str_turn = turn;
            const nextDir = [x0 - ux, y0 - uy];
            if (nextDir[0] !== dx || nextDir[1] !== dy) {
                return { stopReason: null, nextDir };
            }
        }
    }
    return { stopReason: null, nextDir: null };
}

// BFS pathfinding for travel command
// C ref: hack.c findtravelpath()
export function findPath(map, startX, startY, endX, endY) {
    if (!isok(endX, endY)) return null;
    if (startX === endX && startY === endY) return [];

    const queue = [[startX, startY, []]];
    const visited = new Set();
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
        const [x, y, path] = queue.shift();

        // Check all 8 directions
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx === endX && ny === endY) {
                const result = [...path, [dx, dy]];
                debug_travel_tmp_at(result, startX, startY);
                return result;
            }

            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            if (!isok(nx, ny)) continue;

            const loc = map.at(nx, ny);
            if (!loc || !ACCESSIBLE(loc.typ)) continue;

            visited.add(key);
            queue.push([nx, ny, [...path, [dx, dy]]]);
        }

        // Limit search to prevent infinite loops
        if (visited.size > 500) return null;
    }

    return null; // No path found
}

// C ref: hack.c findtravelpath(mode).
// JS keeps the same role but uses existing BFS pathing in findPath().
// Returns true when a path (or travel viability for TRAVP_VALID) exists.
export async function findtravelpath(mode, game) {
    if (!game || !(game.u || game.player) || !(game.lev || game.map)) return false;
    const ctx = ensure_context(game);
    const { player, map } = game;
    const tx = game.travelX;
    const ty = game.travelY;
    if (!Number.isInteger(tx) || !Number.isInteger(ty) || !isok(tx, ty)) return false;

    // C ref: decl.c dirs_ord[] — cardinals first: W, N, E, S, NW, NE, SE, SW.
    // Direction iteration order matters: when multiple adjacent cells have equal
    // BFS distance, the first one encountered becomes the preferred travel step.
    const noDiag = !!player?.noDiag;
    const dirs = noDiag
        ? [[-1, 0], [0, -1], [1, 0], [0, 1]]
        : [[-1, 0], [0, -1], [1, 0], [0, 1], [-1, -1], [1, -1], [1, 1], [-1, 1]];

    // Adjacent target uses normal move legality with restricted diagonal handling.
    if ((mode === TRAVP_TRAVEL || mode === TRAVP_VALID)
        && ctx.travel1
        && Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y)) === 1
        && crawl_destination(tx, ty, player, map)) {
        const ok = await test_move(player.x, player.y, tx - player.x, ty - player.y, TEST_MOVE, player, map, null, game);
        if (ok && mode === TRAVP_TRAVEL) {
            game.travelPath = [[tx - player.x, ty - player.y]];
            game.travelStep = 0;
        }
        return ok;
    }

    // C ref: hack.c findtravelpath() — BFS from target toward hero.
    // earlyGoalX/Y: if set, terminates when this cell is discovered.
    // C terminates immediately when the hero cell is found; the direction
    // is parent_cell - hero_pos (the first frontier cell to reach the hero
    // determines the travel step via implicit wave-expansion tiebreaking).
    async function reverseWave(goalX, goalY, earlyGoalX, earlyGoalY) {
        // C ref: hack.c:1296-1430 — level-by-level BFS with two alternating
        // step arrays.  Cells with closed doors or boulders are re-queued
        // at the next radius (delay of +3) to prefer clear paths.
        //
        // C uses travel[COLNO][ROWNO] initialized to 0 by memset.
        // travel[x][y] = 0 means unvisited (or seed).  Discovered cells
        // get travel[nx][ny] = radius (≥1).  The seed cell stays 0 until
        // re-discovered by a neighbor, matching C's memset initialization.
        const dist = new Map();
        let currentLevel = [[goalX, goalY]];
        // C ref: seed cell keeps travel=0 (memset, never set explicitly).
        // Use 0 so the seed can be re-discovered by neighbors (C behavior:
        // !travel[nx][ny] is true for 0, allowing re-addition to wave).
        dist.set(`${goalX},${goalY}`, 0);
        let radius = 1;
        while (currentLevel.length) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i++) {
                const [x, y] = currentLevel[i];
                // C ref: travel[x][y] — 0 for seed/unvisited.
                const r = dist.get(`${x},${y}`) || 0;
                // C ref: hack.c:1356-1375 — delay expansion from cells
                // with closed doors or boulders (source cell), or traps/
                // pools/lava at the destination (per-direction).
                const cellDelay = (
                    (!player.passesWalls && closed_door(x, y, map))
                    || (sobj_at(BOULDER, x, y, map)
                        && !could_move_onto_boulder(x, y, player))
                );
                let alreadyrepeated = false;
                for (const [ddx, ddy] of dirs) {
                    const nx = x + ddx;
                    const ny = y + ddy;
                    if (!isok(nx, ny)) continue;
                    // Per-direction delay: trap/pool/lava at destination
                    const trap = map.trapAt ? map.trapAt(nx, ny) : null;
                    const dirDelay = cellDelay
                        || (trap && trap.tseen && trap.ttyp !== VIBRATING_SQUARE)
                        || (!!(map.at(nx, ny)?.seenv) && is_pool_or_lava(nx, ny, map));
                    if (dirDelay && r > radius - 3) {
                        if (!alreadyrepeated) {
                            nextLevel.push([x, y]);
                            alreadyrepeated = true;
                        }
                        continue;
                    }
                    const key = `${nx},${ny}`;
                    if (dist.has(key)) continue;
                    if (!await test_move(x, y, nx - x, ny - y, TEST_TRAV, player, map, null, game)) continue;
                    // C ref: hack.c:1377-1378 — cell must be previously seen OR
                    // currently in line of sight (if not blind).
                    const seen = !!(map.at(nx, ny)?.seenv)
                        || (!player.blind && couldsee(map, player, nx, ny));
                    if (!seen) continue;
                    // C ref: hack.c:1378 — early termination when hero found.
                    if (earlyGoalX != null && nx === earlyGoalX && ny === earlyGoalY) {
                        return { dist, earlyDir: [x - earlyGoalX, y - earlyGoalY], parentX: x, parentY: y };
                    }
                    dist.set(key, radius);
                    nextLevel.push([nx, ny]);
                }
            }
            currentLevel = nextLevel;
            radius++;
        }
        return { dist, earlyDir: null };
    }

    // For TRAVP_TRAVEL/VALID, use early termination to match C's implicit
    // wave-expansion tiebreaking (first frontier cell to reach hero wins).
    const heroX = player.x, heroY = player.y;
    const useEarly = (mode === TRAVP_TRAVEL || mode === TRAVP_VALID);
    const waveResult = await reverseWave(tx, ty,
        useEarly ? heroX : undefined, useEarly ? heroY : undefined);
    const travel = waveResult.dist;
    const earlyDir = waveResult.earlyDir;

    if (earlyDir) {
        // C early termination found the hero.
        if (mode === TRAVP_VALID) return true;

        // C ref: hack.c:1384-1395 — check if parent cell is the target
        // or was already visited in travelmap. If so, stop travel.
        const parentX = waveResult.parentX ?? (heroX + earlyDir[0]);
        const parentY = waveResult.parentY ?? (heroY + earlyDir[1]);
        const travelVisited = game._travelVisited || (game._travelVisited = new Set());
        const parentIsTarget = (parentX === tx && parentY === ty);
        const parentWasVisited = travelVisited.has(`${parentX},${parentY}`);
        if (mode === TRAVP_TRAVEL && (parentIsTarget || parentWasVisited)) {
            nomul(0, game);
            ctx.run = 8; // C ref: hack.c:1389
            if (parentWasVisited) {
                await pline('You stop, unsure which way to go.');
            } else {
                game.travelX = 0;
                game.travelY = 0;
            }
        }
        travelVisited.add(`${heroX},${heroY}`);
        game.travelPath = [earlyDir];
        game.travelStep = 0;
        return true;
    }

    // Fallback: full wave completed. Use min-distance selection.
    const heroKey = `${heroX},${heroY}`;
    const ctrav = travel.get(heroKey) || 0;
    if (ctrav > 0) {
        let best = null;
        let bestR = Number.POSITIVE_INFINITY;
        for (const [dx, dy] of dirs) {
            const nx = heroX + dx;
            const ny = heroY + dy;
            if (!isok(nx, ny)) continue;
            const r = travel.get(`${nx},${ny}`) || 0;
            if (!r) continue;
            if (!await test_move(heroX, heroY, dx, dy, TEST_MOVE, player, map, null, game)) continue;
            if (r < bestR) {
                bestR = r;
                best = [dx, dy];
            }
        }
        if (best) {
            if (mode === TRAVP_VALID) return true;
            game.travelPath = [best];
            game.travelStep = 0;
            return true;
        }
    }

    if (mode !== TRAVP_GUESS) {
        return false;
    }

    // C ref: hack.c findtravelpath() GUESS mode.
    // Phase 1: BFS from hero outward, building travel distance map.
    // C swaps tx/ty and ux/uy for GUESS mode (BFS from hero, goal=target).
    // Only expand through couldsee cells (C line 1354).
    async function heroWave() {
        // C ref: hack.c:1296-1430 — same level-by-level BFS as reverseWave
        // but for GUESS mode (from hero outward, with couldsee restriction).
        const dist = new Map();
        // C ref: seed cell keeps travel=0 (memset, never set).
        // GUESS phase 2 "ctrav > 0" correctly skips the seed.
        dist.set(`${heroX},${heroY}`, 0);
        let currentLevel = [[heroX, heroY]];
        let radius = 1;
        while (currentLevel.length) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i++) {
                const [x, y] = currentLevel[i];
                const r = dist.get(`${x},${y}`) || 0;
                const cellDelay = (
                    (!player.passesWalls && closed_door(x, y, map))
                    || (sobj_at(BOULDER, x, y, map)
                        && !could_move_onto_boulder(x, y, player))
                );
                let alreadyrepeated = false;
                for (const [ddx, ddy] of dirs) {
                    const nx = x + ddx;
                    const ny = y + ddy;
                    if (!isok(nx, ny)) continue;
                    // C ref: hack.c:1354 — GUESS mode skips cells not couldsee.
                    if (!couldsee(map, player, nx, ny)) continue;
                    // Per-direction delay: trap/pool/lava at destination
                    const trap = map.trapAt ? map.trapAt(nx, ny) : null;
                    const dirDelay = cellDelay
                        || (trap && trap.tseen && trap.ttyp !== VIBRATING_SQUARE)
                        || (!!(map.at(nx, ny)?.seenv) && is_pool_or_lava(nx, ny, map));
                    if (dirDelay && r > radius - 3) {
                        if (!alreadyrepeated) {
                            nextLevel.push([x, y]);
                            alreadyrepeated = true;
                        }
                        continue;
                    }
                    const key = `${nx},${ny}`;
                    if (dist.has(key)) continue;
                    if (!await test_move(x, y, nx - x, ny - y, TEST_TRAV, player, map, null, game)) continue;
                    const seen = !!(map.at(nx, ny)?.seenv)
                        || (!player.blind && couldsee(map, player, nx, ny));
                    if (!seen) continue;
                    dist.set(key, radius);
                    nextLevel.push([nx, ny]);
                }
            }
            currentLevel = nextLevel;
            radius++;
        }
        return dist;
    }

    const guessDist = await heroWave();

    // Phase 2: Pick best reachable+couldsee cell as GUESS intermediate point.
    // C ref: hack.c:1433-1460.
    //
    // C swaps tx↔ux for GUESS mode (line 1284-1288): ux=u.tx (target),
    // tx=u.ux (hero).  In the phase 2 loop, tx/ty are SHADOWED by loop
    // vars (candidate coords).  So distmin(ux,uy,tx,ty) in the loop =
    // distmin(TARGET, CANDIDATE) — target-relative Chebyshev distance.
    // Initial dist = distmin(TARGET, HERO) = upper bound.
    //
    // JS guessDist(hero) = 0 matches C's exclusion (travel[seed] never set).
    let px = heroX, py = heroY;
    let bestDist = Math.max(Math.abs(tx - heroX), Math.abs(ty - heroY));
    let bestD2 = (tx - heroX) * (tx - heroX) + (ty - heroY) * (ty - heroY);
    let bestTravel = COLNO * ROWNO;
    for (let cx = 1; cx < COLNO; cx++) {
        for (let cy = 0; cy < ROWNO; cy++) {
            if (!couldsee(map, player, cx, cy)) continue;
            const ctrav = guessDist.get(`${cx},${cy}`) || 0;
            if (ctrav <= 0) continue;
            // C ref: distmin(ux, uy, tx, ty) = target-to-candidate Chebyshev.
            const nxtdist = Math.max(Math.abs(tx - cx), Math.abs(ty - cy));
            if (nxtdist === bestDist && ctrav < bestTravel) {
                const nd2 = (tx - cx) * (tx - cx) + (ty - cy) * (ty - cy);
                if (nd2 < bestD2) {
                    px = cx;
                    py = cy;
                    bestD2 = nd2;
                    bestTravel = ctrav;
                }
            } else if (nxtdist < bestDist) {
                px = cx;
                py = cy;
                bestDist = nxtdist;
                bestD2 = (tx - cx) * (tx - cx) + (ty - cy) * (ty - cy);
                bestTravel = ctrav;
            }
        }
    }

    // C ref: hack.c:1462-1471 — if best guess is hero's own position.
    if (px === heroX && py === heroY) {
        const sdx = Math.sign(tx - heroX);
        const sdy = Math.sign(ty - heroY);
        if (sdx || sdy) {
            if (await test_move(heroX, heroY, sdx, sdy, TEST_MOVE, player, map, null, game)) {
                const travelVisited = game._travelVisited || (game._travelVisited = new Set());
                travelVisited.add(`${heroX},${heroY}`);
                game.travelPath = [[sdx, sdy]];
                game.travelStep = 0;
                return true;
            }
        }
        // C ref: hack.c:1499-1503 "found:" label — no path, stop travel.
        nomul(0, game);
        return false;
    }

    // C ref: hack.c:1487-1494 "goto noguess" — re-run TRAVEL BFS from best
    // cell with mode=TRAVP_TRAVEL.  C's "goto noguess" jumps back to the BFS
    // loop, which includes the visited/oscillation check at hack.c:1381-1398.
    const guessWave = await reverseWave(px, py, heroX, heroY);
    if (guessWave.earlyDir) {
        // Apply the same visited-cell check as the TRAVEL path (lines above).
        // C's "goto noguess" sets mode=TRAVP_TRAVEL before re-running the BFS,
        // so the visited check always applies during the GUESS re-run.
        {
            const parentX = guessWave.parentX ?? (heroX + guessWave.earlyDir[0]);
            const parentY = guessWave.parentY ?? (heroY + guessWave.earlyDir[1]);
            const travelVisited = game._travelVisited || (game._travelVisited = new Set());
            // C ref: hack.c:1386 — check against ORIGINAL target (u.tx,u.ty),
            // not the GUESS intermediate point (px,py).  C's "goto noguess"
            // overwrites local tx,ty but u.tx/u.ty stay as the original target.
            const parentIsTarget = (parentX === tx && parentY === ty);
            const parentWasVisited = travelVisited.has(`${parentX},${parentY}`);
            if (parentIsTarget || parentWasVisited) {
                nomul(0, game);
                ctx.run = 8;
                if (parentWasVisited) {
                    await pline('You stop, unsure which way to go.');
                } else {
                    game.travelX = 0;
                    game.travelY = 0;
                }
            }
            travelVisited.add(`${heroX},${heroY}`);
        }
        game.travelPath = [guessWave.earlyDir];
        game.travelStep = 0;
        return true;
    }
    // Fallback if reverseWave didn't find hero (shouldn't happen).
    nomul(0, game);
    return false;
}

// C ref: cmd.c dotravel()
export async function dotravel(game) {
    const { player, map, display } = game;
    const ctx = ensure_context(game);
    const getposTipSeen = !!player?._tipsShown?.getpos;
    const travelPrompt = (game?.flags?.verbose && getposTipSeen)
        ? "Where do you want to travel to?  (For instructions type a '?')"
        : 'Where do you want to travel to?';
    await display.putstr_message(travelPrompt);
    // C ref: cmd.c dotravel() starts getpos from cached travel destination
    // when available; otherwise from current hero location.
    const hasCachedTravel = (Number.isInteger(game.travelX) && Number.isInteger(game.travelY)
        && !(game.travelX === 0 && game.travelY === 0));
    const cc = hasCachedTravel
        ? { x: game.travelX, y: game.travelY }
        : { x: player.x, y: player.y };
    const isTravelPathValid = async (x, y) => {
        const prevX = game.travelX;
        const prevY = game.travelY;
        const prevTravel1 = ctx.travel1;
        try {
            game.travelX = x;
            game.travelY = y;
            ctx.travel1 = 1;
            return !!(await findtravelpath(TRAVP_VALID, game));
        } finally {
            game.travelX = prevX;
            game.travelY = prevY;
            ctx.travel1 = prevTravel1;
        }
    };
    const result = await getpos_async(cc, true, 'the desired destination', {
        map,
        display,
        flags: game.flags,
        goalPrompt: 'the desired destination',
        player,
        travelMode: true,
        isTravelPathValid,
    });
    if (result < 0) {
        await display.putstr_message('Travel cancelled.');
        return { moved: false, tookTime: false };
    }
    const cursorX = cc.x;
    const cursorY = cc.y;

    // C ref: cmd.c:5107-5108 — store travel destination.
    game.travelX = cursorX;
    game.travelY = cursorY;
    // C ref: gt.travelmap — tracks visited cells to detect oscillation.
    game._travelVisited = new Set();

    // C ref: cmd.c:5110 — dotravel_target() handles all validation and setup.
    return dotravel_target(game);
}

// C ref: cmd.c dotravel_target()
// C sets context.run=8, multi=max(COLNO,ROWNO), context.mv=TRUE, nopick=1,
// then calls domove() once. The moveloop_core multi loop repeats domove()
// for up to ~80 travel steps, with monster turns between each step.
export async function dotravel_target(game) {
    const { player, map, display } = game;
    const ctx = ensure_context(game);

    if (!isok(game.travelX, game.travelY)) {
        await pline('No travel destination set.');
        return { moved: false, tookTime: false };
    }
    if (player.x === game.travelX && player.y === game.travelY) {
        await You('are already here.');
        game.travelX = 0;
        game.travelY = 0;
        return { moved: false, tookTime: false };
    }

    // C ref: cmd.c:5131-5140
    ctx.travel = 1;
    ctx.travel1 = 1;
    ctx.run = 8;
    ctx.nopick = 1;
    ctx.mv = true;
    if (!game.multi) {
        game.multi = Math.max(COLNO, ROWNO);
    }
    player.last_str_turn = 0;

    // First travel step — domove_core will call findtravelpath internally.
    // C ref: cmd.c dotravel_target() returns ECMD_TIME unconditionally once
    // destination validation passes, even if domove() doesn't move (for
    // example no reachable path from the selected cursor point).
    const moveResult = await domove([0, 0], player, map, display, game);
    return {
        moved: !!(moveResult && moveResult.moved),
        tookTime: true,
    };
}

// Wait/search safety warning and execution helpers for rhack()
// C ref: do.c cmd_safety_prevention()
export async function performWaitSearch(cmd, game, map, player, fov, display) {
    if (game && game.flags && game.flags.safe_wait
        && !ensure_context(game).nopick && !(game.multi > 0) && !game.occupation) {
        if (monsterNearby(map, player, fov)) {
            await safetyWarning(cmd, game, display);
            return { moved: false, tookTime: false };
        }
    }
    resetSafetyWarningCounter(cmd, game);
    if (cmd === 's') {
        await dosearch0(player, map, display, game);
    }
    return { moved: false, tookTime: true };
}

async function safetyWarning(cmd, game, display) {
    const search = cmd === 's';
    const counterKey = search ? 'alreadyFoundFlag' : 'didNothingFlag';
    const cmddesc = search ? 'another search' : 'a no-op (to rest)';
    const act = search ? 'You already found a monster.' : 'Are you waiting to get hit?';

    if (!Number.isInteger(game[counterKey])) game[counterKey] = 0;
    const includeHint = !!(game.flags?.cmdassist || game[counterKey] === 0);
    if (!game.flags?.cmdassist) game[counterKey] += 1;

    const msg = includeHint ? `${act}  Use 'm' prefix to force ${cmddesc}.` : act;
    // Keep suppression aligned with C Norep semantics: if a different topline
    // message was shown since the prior safety warning, allow warning again.
    const lastShown = Array.isArray(display?.messages) && display.messages.length
        ? display.messages[display.messages.length - 1]
        : null;
    if (game.lastSafetyWarningMessage
        && typeof lastShown === 'string'
        && lastShown !== game.lastSafetyWarningMessage) {
        game.lastSafetyWarningMessage = '';
    }
    if (game.lastSafetyWarningMessage === msg) {
        // C ref: pline() with Norep suppression clears the message window
        // (clear_nhwindow(WIN_MESSAGE)) without displaying a new message.
        clearTopline(display);
        return;
    }
    await display.putstr_message(msg);
    game.lastSafetyWarningMessage = msg;
}

function resetSafetyWarningCounter(cmd, game) {
    if (cmd === 's') {
        game.alreadyFoundFlag = 0;
    } else {
        game.didNothingFlag = 0;
    }
    game.lastSafetyWarningMessage = '';
}

function clearTopline(display) {
    if (!display) return;
    if (typeof display.clearRow === 'function') display.clearRow(0);
    if ('topMessage' in display) display.topMessage = '';
    if ('messageNeedsMore' in display) display.messageNeedsMore = false;
}

// ========================================================================
// Ported from C hack.c — utility, terrain, capacity, movement, room, and
// combat helper functions.
// ========================================================================

// Weight constants (weight.h)
const WT_WEIGHTCAP_STRCON = 25;
const WT_WEIGHTCAP_SPARE = 50;
const MAX_CARR_CAP = 1000;
const WT_HUMAN = 1450;
const WT_WOUNDEDLEG_REDUCT = 100;
const LEFT_SIDE = 0x10;
const RIGHT_SIDE = 0x20;

// --------------------------------------------------------------------
// Utility
// --------------------------------------------------------------------

// C ref: hack.c rounddiv() — round-aware integer division
// Autotranslated from hack.c:4481
export function rounddiv(x, y) {
    let r, m;
    let divsgn = 1;
    if (y === 0) {
        throw new Error('division by zero in rounddiv');
    }
    else if (y < 0) { divsgn = -divsgn; y = -y; }
    if (x < 0) { divsgn = -divsgn; x = -x; }
    r = Math.trunc(x / y);
    m = x % y;
    if (2 * m >= y) r++;
    return divsgn * r;
}

// C ref: hack.c invocation_pos() — is (x,y) the invocation position?
// Autotranslated from hack.c:963
// Autotranslated from hack.c:962
export function invocation_pos(x, y, map) {
  return  (Invocation_lev(map.uz) && x === map.inv_pos.x && y === map.inv_pos.y);
}

// --------------------------------------------------------------------
// Terrain checks
// --------------------------------------------------------------------

// C ref: hack.c may_dig() — is (x,y) diggable?
export function may_dig(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return false;
    const wallInfo = Number(loc.wall_info ?? loc.flags ?? 0);
    return !((IS_STWALL(loc.typ) || loc.typ === TREE)
             && (wallInfo & W_NONDIGGABLE));
}

// C ref: hack.c may_passwall() — can phase through wall at (x,y)?
// Autotranslated from hack.c:913
export function may_passwall(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return false;
    const wallInfo = Number(loc.wall_info ?? loc.flags ?? 0);
    return !(IS_STWALL(loc.typ) && (wallInfo & W_NONPASSWALL));
}

// C ref: hack.c bad_rock() — is (x,y) impassable rock for given monster?
export function bad_rock(mdat, x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return true;
    // Sokoban boulder check omitted (Sokoban not yet modeled)
    if (!IS_OBSTRUCTED(loc.typ)) return false;
    const tunnels = !!(mdat && mdat.mflags2 & 0x00000040); // M2_TUNNEL placeholder
    const needspick = !!(mdat && mdat.mflags1 & 0x00002000); // M1_NEEDPICK placeholder
    const passes = !!(mdat && mdat.mflags1 & 0x00000100); // M1_WALLWALK placeholder
    if (tunnels && !needspick) return false;
    if (passes && may_passwall(x, y, map)) return false;
    return true;
}

// C ref: hack.c doorless_door() — does (x,y) have a doorless doorway?
export function doorless_door(x, y, map) {
    const loc = map.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    // Rogue level: all doors are doorless but block diagonal
    if (map.flags && map.flags.is_rogue_level) return false;
    return !((loc.flags || 0) & ~(D_NODOOR | D_BROKEN));
}

// C ref: hack.c crawl_destination() — can hero crawl from water to (x,y)?
export function crawl_destination(x, y, player, map) {
    const loc = map.at(x, y);
    if (!loc || !ACCESSIBLE(loc.typ)) return false;
    // Orthogonal movement is unrestricted
    if (x === player.x || y === player.y) return true;
    // Diagonal restrictions
    if (IS_DOOR(loc.typ) && !doorless_door(x, y, map)) return false;
    return true;
}

// C ref: hack.c still_chewing() — chew on wall/door/boulder (poly'd)
// Returns true if still eating, false when done.
export function still_chewing(_x, _y, _player, _map, _display) {
    // Full chewing behavior requires multi-turn state and polymorph system.
    // Stub: always returns false (hero cannot chew).
    return false;
}

// C ref: hack.c is_pool_or_lava() helper
function is_pool_or_lava(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return false;
    return IS_POOL(loc.typ) || IS_LAVA(loc.typ);
}

// C ref: hack.c is_pool() helper
function is_pool(x, y, map) {
    const loc = map.at(x, y);
    return loc ? IS_POOL(loc.typ) : false;
}

// C ref: hack.c is_lava() helper
function is_lava(x, y, map) {
    const loc = map.at(x, y);
    return loc ? IS_LAVA(loc.typ) : false;
}

// C ref: hack.c is_ice() helper
function is_ice(x, y, map) {
    const loc = map.at(x, y);
    return loc ? loc.typ === ICE : false;
}

// C ref: hack.c is_waterwall() helper
function is_waterwall(x, y, map) {
    const loc = map.at(x, y);
    return loc ? IS_WATERWALL(loc.typ) : false;
}

// C ref: hack.c closed_door() helper
function closed_door(x, y, map) {
    const loc = map.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.flags || 0) & (D_CLOSED | D_LOCKED));
}

// C ref: hack.c sobj_at() — find object of given type at (x,y)
function sobj_at(otyp, x, y, map) {
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    // C ref: floor object chain is scanned from top object downward.
    for (let i = objs.length - 1; i >= 0; i--) {
        const obj = objs[i];
        if (obj.otyp === otyp) return obj;
    }
    return null;
}

// --------------------------------------------------------------------
// Carrying capacity (hack.c weight_cap / inv_weight / calc_capacity etc.)
// --------------------------------------------------------------------

// C ref: hack.c weight_cap() — maximum carrying capacity
export function weight_cap(player) {
    const str = acurrstr(player);
    const con = acurr(player, A_CON);
    let carrcap = WT_WEIGHTCAP_STRCON * (str + con) + WT_WEIGHTCAP_SPARE;
    // Polymorph adjustments omitted for now
    if (player.levitating || player.flying) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
        // Wounded legs reduction
        if (!player.flying) {
            const woundedBits = Number(player?.eWoundedLegs || 0);
            const leftWounded = !!player?.woundedLegLeft || ((woundedBits & LEFT_SIDE) !== 0);
            const rightWounded = !!player?.woundedLegRight || ((woundedBits & RIGHT_SIDE) !== 0);
            if (leftWounded) carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (rightWounded) carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }
    return Math.max(carrcap, 1);
}

// C ref: hack.c inv_weight() — weight beyond carrying capacity (negative = under)
export function inv_weight(player) {
    let wt = 0;
    let hasCoinObject = false;
    const inv = player.inventory || [];
    for (const obj of inv) {
        if (!obj) continue;
        if (obj.oclass === COIN_CLASS) {
            hasCoinObject = true;
            wt += Math.floor(((obj.quan || 0) + 50) / 100);
        } else {
            wt += obj.owt || 0;
        }
    }
    // JS frequently stores hero gold in player.gold (not as COIN_CLASS obj).
    // C inv_weight includes carried coins, so account for that representation.
    if (!hasCoinObject) {
        wt += Math.floor(((player?.gold || 0) + 50) / 100);
    }
    const wc = weight_cap(player);
    // Store wc on player for calc_capacity to use (mirrors C's global gw.wc)
    player._wc = wc;
    return wt - wc;
}

// C ref: hack.c calc_capacity() — encumbrance level with extra weight
export function calc_capacity(player, xtra_wt) {
    const wt = inv_weight(player) + (xtra_wt || 0);
    if (wt <= 0) return UNENCUMBERED;
    const wc = player._wc || weight_cap(player);
    if (wc <= 1) return OVERLOADED;
    const cap = Math.floor(wt * 2 / wc) + 1;
    return Math.min(cap, OVERLOADED);
}

// C ref: hack.c near_capacity() — current encumbrance level
export function near_capacity() {
    const player = arguments[0];
    if (!player) return UNENCUMBERED;
    return calc_capacity(player, 0);
}
registerNearCapacity(near_capacity);

// C ref: hack.c max_capacity() — how far over max capacity
export function max_capacity(player) {
    const wt = inv_weight(player);
    const wc = player._wc || weight_cap(player);
    return wt - 2 * wc;
}

// C ref: hack.c check_capacity() — too encumbered to act?
export async function check_capacity(player, str, display) {
    if (near_capacity(player) >= EXT_ENCUMBER) {
        if (display) {
            if (str) {
                await display.putstr_message(str);
            } else {
                await display.putstr_message("You can't do that while carrying so much stuff.");
            }
        }
        return true;
    }
    return false;
}

// C ref: hack.c inv_cnt() — count inventory items
export function inv_cnt(player, incl_gold) {
    let ct = 0;
    const inv = player.inventory || [];
    for (const obj of inv) {
        if (!obj) continue;
        if (incl_gold || obj.oclass !== COIN_CLASS) ct++;
    }
    return ct;
}

// C ref: hack.c money_cnt() — count gold in inventory
// Autotranslated from hack.c:4443
export function money_cnt(otmp) {
  while (otmp) {
    if (otmp.oclass === COIN_CLASS) return otmp.quan;
    otmp = otmp.nobj;
  }
  return 0;
}

// C ref: hack.c cmp_weights()
export function cmp_weights(i1, i2) {
    const w1 = Number(i1?.owt || 0);
    const w2 = Number(i2?.owt || 0);
    return w1 - w2;
}

// C ref: hack.c dump_weights()
export async function dump_weights(player, display) {
    const inv = [...(player?.inventory || [])];
    inv.sort(cmp_weights);
    if (!display) return inv.map(o => `${o?.owt || 0}:${o?.otyp || '?'}`);
    for (const obj of inv) {
        await display.putstr_message(`wt=${obj?.owt || 0} otyp=${obj?.otyp || '?'}`);
    }
    return inv;
}

// --------------------------------------------------------------------
// Movement validation (test_move, carrying_too_much, etc.)
// --------------------------------------------------------------------

// C ref: hack.c test_move() — validate a move from (ux,uy) by (dx,dy)
export async function test_move(ux, uy, dx, dy, mode, player, map, display, game = null) {
    const x = ux + dx;
    const y = uy + dy;
    const flags = map.flags || {};
    const testMoveResult = (rv) => {
        if (testMoveEventEnabled()) {
            pushRngLogEntry(`^test_move[mode=${mode} from=${ux},${uy} dir=${dx},${dy} to=${x},${y} rv=${rv ? 1 : 0}]`);
        }
        return rv;
    };

    if (!isok(x, y)) return testMoveResult(false);

    const loc = map.at(x, y);
    if (!loc) return testMoveResult(false);

    // Check for physical obstacles at destination
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) {
        if (loc.typ === IRONBARS) {
            // Iron bars: currently no passes_bars or chewing support
            if (mode === DO_MOVE && flags.mention_walls) {
                if (display) await display.putstr_message('You cannot pass through the bars.');
            }
            return testMoveResult(false);
        }
        // Wall/rock
        if (mode === DO_MOVE) {
            if (flags.mention_walls) {
                if (display) await display.putstr_message("It's a wall.");
            }
        }
        return testMoveResult(false);
    } else if (IS_DOOR(loc.typ)) {
        if (closed_door(x, y, map)) {
            // Closed door blocks movement
            if (mode === DO_MOVE) {
                // C ref: hack.c test_move() only reports "That door is closed."
                // for orthogonal movement; diagonal closed-door attempts are
                // silent unless auto-open applies.
                if (x === ux || y === uy) {
                    if (display) await display.putstr_message('That door is closed.');
                }
            } else if (mode === TEST_TRAV || mode === TEST_TRAP) {
                // Fall through to diagonal check
            } else {
                return testMoveResult(false);
            }
            if (mode !== TEST_TRAV && mode !== TEST_TRAP) return testMoveResult(false);
        }
        // Diagonal into intact doorway
        if (dx && dy && !doorless_door(x, y, map)) {
            if (mode === DO_MOVE) {
                if (flags.mention_walls) {
                    if (display) await display.putstr_message("You can't move diagonally into an intact doorway.");
                }
            }
            return testMoveResult(false);
        }
    }

    // Diagonal squeeze check
    // C ref: hack.c:1133-1148 — only block if cant_squeeze_thru returns nonzero.
    // Normal-size heroes (MZ_MEDIUM) can always squeeze diagonally through walls.
    if (dx && dy && bad_rock(null, ux, y, map) && bad_rock(null, x, uy, map)) {
        const squeezeReason = cant_squeeze_thru(player, map);
        if (squeezeReason) {
            if (mode === DO_MOVE) {
                if (squeezeReason === 1) {
                    if (display) await display.putstr_message('Your body is too large to fit through.');
                } else if (squeezeReason === 2) {
                    if (display) await display.putstr_message('You are carrying too much to get through.');
                } else if (squeezeReason === 3) {
                    if (display) await display.putstr_message('You cannot pass that way.');
                }
            }
            return testMoveResult(false);
        }
    }

    // C parity: trap/liquid travel gating is only active while running/travel.
    const runMode = Number(game?.context?.run ?? 0);
    const travelMode = !!(game?.context?.travel);
    if ((mode === TEST_TRAV || mode === TEST_TRAP)
        && (runMode === 8 || travelMode)) {
        const trap = map.trapAt ? map.trapAt(x, y) : null;
        if (trap && trap.tseen && trap.ttyp !== VIBRATING_SQUARE) {
            return testMoveResult(mode === TEST_TRAP);
        }
        const seen = !!(map.at(x, y)?.seenv);
        if (seen && is_pool_or_lava(x, y, map)) {
            return testMoveResult(mode === TEST_TRAP);
        }
    }
    if (mode === TEST_TRAP) return testMoveResult(false);

    // Diagonal out of intact doorway
    const fromLoc = map.at(ux, uy);
    if (dx && dy && fromLoc && IS_DOOR(fromLoc.typ)
        && !doorless_door(ux, uy, map)) {
        if (mode === DO_MOVE && flags.mention_walls) {
            if (display) await display.putstr_message("You can't move diagonally out of an intact doorway.");
        }
        return testMoveResult(false);
    }

    // Boulder check
    if (sobj_at(BOULDER, x, y, map)) {
        const inSokoban = !!(map?.flags?.is_sokoban || map?.flags?.in_sokoban || game?.flags?.sokoban);
        if (mode !== TEST_TRAV && mode !== DO_MOVE) return testMoveResult(false);
        if (mode !== TEST_TRAV
            && runMode >= 2
            && !player?.blind && !player?.hallucinating
            && !could_move_onto_boulder(x, y, player, map)) {
            if (mode === DO_MOVE && flags.mention_walls) {
                if (display) await display.putstr_message('A boulder blocks your path.');
            }
            return testMoveResult(false);
        }
        if (mode === TEST_TRAV) {
            if (inSokoban) return testMoveResult(false);
            if (sobj_at(BOULDER, ux, uy, map)
                && !could_move_onto_boulder(ux, uy, player, map)) {
                return testMoveResult(false);
            }
        }
    }

    return testMoveResult(true);
}

// C ref: hack.c carrying_too_much() — can hero move?
export async function carrying_too_much(player, map, display) {
    const heroHp = Number.isFinite(player?.uhp) ? player.uhp : (player?.hp || 0);
    const heroHpMax = Number.isFinite(player?.uhpmax) ? player.uhpmax : (player?.hpmax || 0);
    const wtcap = near_capacity(player);
    if (wtcap >= OVERLOADED
        || (wtcap > SLT_ENCUMBER && (heroHp < 10 && heroHp !== heroHpMax))) {
        if (map?.flags?.is_airlevel) return false;
        if (wtcap < OVERLOADED) {
            if (display) await display.putstr_message("You don't have enough stamina to move.");
            await exercise(player, A_CON, false);
        } else {
            if (display) await display.putstr_message('You collapse under your load.');
        }
        return true;
    }
    return false;
}

// C ref: hack.c u_rooted() — is hero rooted in place?
export async function u_rooted(player, display, game = null) {
    // Only applies when polymorphed into an immobile form
    if (player.polyData && player.polyData.mmove === 0) {
        if (display) await display.putstr_message('You are rooted to the ground.');
        if (game) nomul(0, game);
        return true;
    }
    return false;
}

// C ref: hack.c move_out_of_bounds() — is (x,y) off the map?
export async function move_out_of_bounds(x, y, display, flags) {
    if (!isok(x, y)) {
        if (flags && flags.mention_walls) {
            if (display) await display.putstr_message('You have already gone as far as possible.');
        }
        return true;
    }
    return false;
}

// C ref: hack.c air_turbulence() — plane of air movement disruption
export async function air_turbulence(player, map, display) {
    if (map.flags && map.flags.is_airlevel && rn2(4)
        && !player.levitating && !player.flying) {
        switch (rn2(3)) {
        case 0:
            if (display) await display.putstr_message('You tumble in place.');
            await exercise(player, A_DEX, false);
            break;
        case 1:
            if (display) await display.putstr_message("You can't control your movements very well.");
            break;
        case 2:
            if (display) await display.putstr_message("It's hard to walk in thin air.");
            await exercise(player, A_DEX, true);
            break;
        }
        return true;
    }
    return false;
}

// C ref: hack.c water_turbulence() — underwater movement disruption
export async function water_turbulence(player, map, display, target = null) {
    if (!player?.uinwater) return false;

    if (map?.flags?.is_waterlevel) {
        maybe_adjust_hero_bubble(map, {
            x: player.x,
            y: player.y,
            dx: player.dx,
            dy: player.dy,
        });
    }
    await water_friction(map, player, display);
    if (!player.dx && !player.dy) {
        return true;
    }

    const x = player.x + player.dx;
    const y = player.y + player.dy;
    if (target) {
        target.x = x;
        target.y = y;
    }

    if (isok(x, y) && !IS_POOL(map?.at(x, y)?.typ)
        && !(map?.flags?.is_waterlevel) && near_capacity(player) > (player.swimming ? MOD_ENCUMBER : SLT_ENCUMBER)) {
        if (display) await display.putstr_message('You are carrying too much to climb out of the water.');
        player.dx = 0;
        player.dy = 0;
        return true;
    }
    return false;
}

// C ref: hack.c slippery_ice_fumbling() — fumble on ice
export function slippery_ice_fumbling(player, map) {
    if (player.levitating) return;
    const loc = map.at(player.x, player.y);
    if (!loc || loc.typ !== ICE) return;
    // C: snow boots, flying, floater/clinger/whirly exempt from ice fumbling
    if (player.flying) return;
    // C: Cold_resistance reduces chance (rn2(3) vs rn2(2)) but doesn't exempt
    if (!rn2(player.coldResistant ? 3 : 2)) {
        player.fumbling = true;
    }
}

// C ref: hack.c u_maybe_impaired() — is hero stunned or confused?
export function u_maybe_impaired(player) {
    return !!(player.stunned || (player.confused && !rn2(5)));
}

// C ref: cmd.c:4411 confdir() — randomize movement direction if impaired
// dirs_ord: cardinals first, then diagonals (C decl.c:81)
const dirs_ord = [0, 2, 4, 6, 1, 3, 5, 7]; // W, N, E, S, NW, NE, SE, SW
export function confdir(force_impairment, player) {
    if (force_impairment || u_maybe_impaired(player)) {
        const kmax = (player.umonnum === PM_GRID_BUG) ? (N_DIRS / 2) : N_DIRS;
        const k = dirs_ord[rn2(kmax)];
        player.dx = xdir[k];
        player.dy = ydir[k];
    }
}

// C ref: hack.c:2403 impaired_movement() — randomize direction if impaired
// Returns true if movement is impossible (50 retries failed), false otherwise.
// Modifies dest.x/dest.y to reflect the new randomized direction.
export function impaired_movement(player, map, dest, game) {
    if (u_maybe_impaired(player)) {
        let tries = 0;
        do {
            if (tries++ > 50) {
                nomul(0, game);
                return true;
            }
            confdir(true, player);
            dest.x = player.x + player.dx;
            dest.y = player.y + player.dy;
        } while (!isok(dest.x, dest.y) || bad_rock(player.youmonst?.data || null, dest.x, dest.y, map));
    }
    return false;
}

// C ref: hack.c swim_move_danger() — is it dangerous to move into water/lava?
export async function swim_move_danger(x, y, player, map, display) {
    const loc = map.at(x, y);
    if (!loc) return false;
    const isLiquid = IS_POOL(loc.typ) || IS_LAVA(loc.typ);
    if (!isLiquid) return false;
    if (player.levitating || player.flying) return false;
    // If player is underwater, pool is ok
    if (player.uinwater && IS_POOL(loc.typ)) return false;
    // Warn about stepping into liquid
    if (!player.stunned && !player.confused) {
        const what = waterbody_name_at(x, y, map);
        set_msg_xy(x, y);
        await You('avoid stepping into the %s.', what);
        await handle_tip('swim', player, display);
        return true;
    }
    return false;
}

// C ref: hack.c avoid_moving_on_trap() — stop for known trap during run
export async function avoid_moving_on_trap(x, y, msg, map, display, flags) {
    const trap = map.trapAt ? map.trapAt(x, y) : null;
    if (trap && trap.tseen && trap.ttyp !== VIBRATING_SQUARE) {
        if (msg && flags && flags.mention_walls) {
            if (display) await display.putstr_message('You stop in front of a trap.');
        }
        return true;
    }
    return false;
}

// C ref: hack.c avoid_moving_on_liquid() — stop at edge of pool/lava
export async function avoid_moving_on_liquid(x, y, msg, player, map, display, flags) {
    if (!is_pool_or_lava(x, y, map)) return false;
    if (player.levitating || player.flying) return false;
    const loc = map.at(x, y);
    if (!loc || !loc.seenv) return false;
    if (msg && flags && flags.mention_walls) {
        const what = waterbody_name_at(x, y, map);
        set_msg_xy(x, y);
        await You('stop at the edge of the %s.', what);
    }
    return true;
}

function waterbody_name_at(x, y, map) {
    const loc = map?.at?.(x, y);
    if (!loc) return 'water';
    const currentSpecial = find_level(map?.uz?.dnum, map?.uz?.dlevel);
    const specialName = String(currentSpecial?.name || '').toLowerCase();
    const isMedusa = !!(map?.flags?.is_medusa_level || specialName.startsWith('medusa'));
    if (is_lava(x, y, map)) return `molten ${hliquid('lava')}`;
    if (is_pool(x, y, map)) {
        if (loc.typ === POOL) return `pool of ${hliquid('water')}`;
        if (loc.typ === MOAT) {
            if (isMedusa) return 'shallow sea';
            if (specialName.startsWith('juiblex')) return 'swamp';
            return 'moat';
        }
        return hliquid('water');
    }
    if (IS_WATERWALL(loc.typ)) return `wall of ${hliquid('water')}`;
    if (loc.typ === LAVAWALL) return `wall of ${hliquid('lava')}`;
    return 'water';
}

// C ref: hack.c avoid_running_into_trap_or_liquid()
export async function avoid_running_into_trap_or_liquid(x, y, player, map, display, run) {
    if (!run) return false;
    const wouldStop = run >= 2;
    const flags = map.flags || {};
    if (await avoid_moving_on_trap(x, y, wouldStop, map, display, flags)
        || (player.blind && await avoid_moving_on_liquid(x, y, wouldStop, player, map, display, flags))) {
        if (wouldStop) return true;
    }
    return false;
}

// C ref: hack.c avoid_trap_andor_region()
export async function avoid_trap_andor_region(x, y, player, map, display, flags) {
    if (await avoid_moving_on_trap(x, y, true, map, display, flags)) return true;
    if (await avoid_moving_on_liquid(x, y, true, player, map, display, flags)) return true;
    // region.c integration is still partial in JS; this only covers trap/liquid.
    return false;
}

// --------------------------------------------------------------------
// Running control
// --------------------------------------------------------------------

// C ref: hack.c end_running() — stop running/traveling
export function end_running(and_travel, game) {
    if (!game) return;
    const ctx = ensure_context(game);
    game.running = false;
    ctx.run = 0;
    if (and_travel) {
        game.travelPath = null;
        game.travelStep = 0;
        game._travelVisited = null;
        ctx.travel = 0;
        ctx.travel1 = 0;
        ctx.mv = false;
    }
    if (game.multi > 0) game.multi = 0;
}

// C ref: hack.c runmode_delay_output()
// Autotranslated from hack.c:2977
export async function runmode_delay_output(game, display) {
    if (!game) return;
    const ctx = ensure_context(game);
    const runmode = game?.flags?.runmode || 'leap';
    if (ctx.run || game.multi) {
        if (runmode === 'tport') return;
        if (runmode === 'leap' && ((Number(game.moves) || 0) % 7 !== 0)) return;
        if (display?.renderMessageWindow) display.renderMessageWindow();
        await nh_delay_output();
        if (runmode === 'crawl') {
            await nh_delay_output();
            await nh_delay_output();
            await nh_delay_output();
            await nh_delay_output();
        }
    }
}

// C ref: hack.c nomul() — set multi-turn action count
export function nomul(nval, game) {
    if (!game) return;
    if (typeof game.multi !== 'number') game.multi = 0;
    if (game.multi < nval) return; // bug fix from C
    game.multi = nval;
    if (nval === 0) {
        game.multi_reason = null;
    }
    end_running(true, game);
}

// C ref: hack.c unmul() — end a multi-turn action
export async function unmul(msg_override, player, display, game) {
    if (!game) return;
    game.multi = 0;
    if (msg_override !== undefined && msg_override !== null) {
        game.nomovemsg = msg_override;
    } else if (!game.nomovemsg) {
        game.nomovemsg = 'You can move again.';
    }
    const msg = game.nomovemsg || '';
    if (msg && display) {
        await display.putstr_message(msg);
    }
    game.nomovemsg = null;
    if (player) player.usleep = 0;
    game.multi_reason = null;

    // C ref: hack.c:4075 — call afternmv callback when multi-turn action ends
    if (game.afternmv) {
        const f = game.afternmv;
        // Clear before calling (matches C: override encumbrance hack for levitation)
        game.afternmv = null;
        await f();
    }
}

// --------------------------------------------------------------------
// Room / location helpers
// --------------------------------------------------------------------

// C ref: hack.c in_rooms() — which rooms contain (x,y)?
// Returns array of room indices (offset by ROOMOFFSET).
export function in_rooms(x, y, typewanted, map) {
    if (!map || !map.rooms) return [];
    const loc = map.at(x, y);
    if (!loc) return [];
    const roomno = loc.roomno;
    if (roomno === undefined || roomno === null) return [];

    const NO_ROOM = 0;
    const SHARED = 1;
    const SHARED_PLUS = 2;

    const result = [];

    function goodtype(rno) {
        const idx = rno - ROOMOFFSET;
        if (idx < 0 || idx >= map.rooms.length) return false;
        if (!typewanted) return true;
        const rt = map.rooms[idx].rtype || OROOM;
        return rt === typewanted || (typewanted === SHOPBASE && rt > SHOPBASE);
    }

    if (roomno === NO_ROOM) return result;
    if (roomno !== SHARED && roomno !== SHARED_PLUS) {
        // Regular room
        if (goodtype(roomno)) result.push(roomno);
        return result;
    }

    // SHARED or SHARED_PLUS: scan neighbors
    const step = roomno === SHARED ? 2 : 1;
    const minX = Math.max(1, x - 1);
    const maxX = Math.min(COLNO - 1, x + 1);
    const minY = Math.max(0, y - 1);
    const maxY = Math.min(ROWNO - 1, y + 1);

    for (let sx = minX; sx <= maxX; sx += step) {
        for (let sy = minY; sy <= maxY; sy += step) {
            const nloc = map.at(sx, sy);
            if (!nloc) continue;
            const rno = nloc.roomno;
            if (rno >= ROOMOFFSET && !result.includes(rno) && goodtype(rno)) {
                result.push(rno);
            }
        }
    }
    return result;
}

// C ref: hack.c in_town() — is (x,y) in a town?
export function in_town(x, y, map) {
    if (!map || !map.flags || !map.flags.has_town) return false;
    if (!map.rooms) return false;
    let has_subrooms = false;
    for (const room of map.rooms) {
        if (!room || room.hx <= 0) continue;
        if (room.nsubrooms > 0) {
            has_subrooms = true;
            if (x >= room.lx && x <= room.hx && y >= room.ly && y <= room.hy) {
                return true;
            }
        }
    }
    return !has_subrooms;
}

// C ref: hack.c monstinroom() — find monster of type in room
export function monstinroom(mdat_pmid, roomno, map) {
    if (!map || !map.monsters) return null;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        if (mon.mnum === mdat_pmid
            || (mon.data && mon.data.mndx === mdat_pmid)
            || (mon.type && mon.type.mndx === mdat_pmid)) {
            const rooms = in_rooms(mon.mx, mon.my, 0, map);
            if (rooms.includes(roomno + ROOMOFFSET)) return mon;
        }
    }
    return null;
}

// C ref: hack.c furniture_present() — check for furniture type in room
export function furniture_present(furniture, roomno, map) {
    if (!map || !map.rooms || roomno < 0 || roomno >= map.rooms.length) return false;
    const room = map.rooms[roomno];
    if (!room) return false;
    for (let y = room.ly; y <= room.hy; y++) {
        for (let x = room.lx; x <= room.hx; x++) {
            const loc = map.at(x, y);
            if (loc && loc.typ === furniture) return true;
        }
    }
    return false;
}

// C ref: hack.c move_update() — track room entry/exit
export function move_update(newlev, player, map) {
    if (!player || !map) return;
    player.urooms0 = player.urooms || '';
    player.ushops0 = player.ushops || '';
    if (newlev) {
        player.urooms = '';
        player.uentered = '';
        player.ushops = '';
        player.ushops_entered = '';
        player.ushops_left = player.ushops0;
        return;
    }
    const rooms = in_rooms(player.x, player.y, 0, map);
    player.urooms = rooms.map(r => String.fromCharCode(r)).join('');

    let entered = '';
    let shops = '';
    let shopsEntered = '';
    for (const rno of rooms) {
        const c = String.fromCharCode(rno);
        if (!player.urooms0.includes(c)) entered += c;
        const idx = rno - ROOMOFFSET;
        if (idx >= 0 && map.rooms && map.rooms[idx]) {
            const rt = map.rooms[idx].rtype || OROOM;
            if (rt >= SHOPBASE) {
                shops += c;
                if (!player.ushops0.includes(c)) shopsEntered += c;
            }
        }
    }
    player.uentered = entered;
    player.ushops = shops;
    player.ushops_entered = shopsEntered;

    // Build ushops_left
    let left = '';
    for (const ch of player.ushops0) {
        if (!player.ushops.includes(ch)) left += ch;
    }
    player.ushops_left = left;
}

// C ref: hack.c check_special_room() — room entry messages
export async function check_special_room(newlev, player, map, display, fov) {
    move_update(newlev, player, map);

    if (player.ushops_left) {
        for (const ch of player.ushops_left) {
            await u_left_shop(ch, !!newlev, map, player);
        }
    }

    if (!player.uentered && !player.ushops_entered) return;

    // Shop entry handled by maybeHandleShopEntryMessage elsewhere

    if (!player.uentered) return;
    if (!map || !map.rooms) return;

    for (const ch of player.uentered) {
        const roomno = ch.charCodeAt(0) - ROOMOFFSET;
        if (roomno < 0 || roomno >= map.rooms.length) continue;
        const rt = map.rooms[roomno].rtype || OROOM;

        switch (rt) {
        case ZOO:
            if (display) await display.putstr_message("Welcome to David's treasure zoo!");
            break;
        case SWAMP:
            if (display) await display.putstr_message('It looks rather muddy down here.');
            break;
        case COURT:
            if (display) {
                const hasThrone = furniture_present(THRONE, roomno, map);
                await display.putstr_message(`You enter an opulent${hasThrone ? ' throne' : ''} room!`);
            }
            break;
        case LEPREHALL:
            if (display) await display.putstr_message('You enter a leprechaun hall!');
            break;
        case MORGUE:
            if (display) await display.putstr_message('You have an uncanny feeling...');
            break;
        case BEEHIVE:
            if (display) await display.putstr_message('You enter a giant beehive!');
            break;
        case COCKNEST:
            if (display) await display.putstr_message('You enter a disgusting nest!');
            break;
        case ANTHOLE:
            if (display) await display.putstr_message('You enter an anthole!');
            break;
        case BARRACKS:
            if (display) await display.putstr_message('You enter a military barracks!');
            break;
        case DELPHI:
            // Oracle greeting handled separately
            break;
        case TEMPLE:
            // C ref: hack.c:3610 — intemple(roomno + ROOMOFFSET)
            await intemple(roomno + ROOMOFFSET, map, player, display, fov);
            break;
        default:
            break;
        }

        // C hack.c:3649-3660: wake monsters in special rooms on entry
        if (rt === COURT || rt === SWAMP || rt === MORGUE || rt === ZOO) {
            const stealth = player.hasProp ? player.hasProp(STEALTH) : false;
            for (const mtmp of (map.monsters || [])) {
                if (mtmp.dead || mtmp.mhp <= 0) continue;
                // Check monster is in this room
                const mloc = map.at ? map.at(mtmp.mx, mtmp.my) : null;
                if (!mloc || (mloc.roomno !== undefined
                    ? mloc.roomno !== roomno
                    : false)) continue;
                if (!stealth && !rn2(3)) {
                    mtmp.msleeping = 0;
                }
            }
        }

        // Mark room as discovered (type -> OROOM) after first entry
        if (rt !== OROOM && rt !== TEMPLE && rt < SHOPBASE) {
            map.rooms[roomno].rtype = OROOM;
        }
    }
}

// --------------------------------------------------------------------
// Spot effects (spoteffects, pooleffects, switch_terrain)
// --------------------------------------------------------------------

// C ref: hack.c set_uinwater()
export function set_uinwater(in_out, player) {
    // Backward compatibility: older JS call sites pass (player, in_out).
    if (player == null && in_out && typeof in_out === 'object') {
        player = in_out;
        in_out = arguments[1];
    } else if (player && typeof player !== 'object' && in_out && typeof in_out === 'object') {
        const oldInOut = player;
        player = in_out;
        in_out = oldInOut;
    }
    if (!player) return;
    player.uinwater = in_out ? 1 : 0;
}

// C ref: hack.c switch_terrain() — toggle levitation/flight when entering
//   solid terrain
export async function switch_terrain(player, map, display) {
    const loc = map.at(player.x, player.y);
    if (!loc) return;
    const blocklev = IS_OBSTRUCTED(loc.typ) || closed_door(player.x, player.y, map)
                     || IS_WATERWALL(loc.typ) || loc.typ === LAVAWALL;
    if (blocklev) {
        if (player.levitating && display) {
            await display.putstr_message("You can't levitate in here.");
        }
        if (player.flying && display) {
            await display.putstr_message("You can't fly in here.");
        }
    }
}

// C ref: hack.c pooleffects() — check for entering/leaving water/lava
// Returns true to skip rest of spoteffects.
export async function pooleffects(newspot, player, map, display) {
    // Check for leaving water
    if (player.uinwater) {
        if (!is_pool(player.x, player.y, map)) {
            if (display) await display.putstr_message('You are back on solid ground.');
            set_uinwater(player, 0);
        }
        // Still in water: no further pool effects
    }

    // Check for entering water or lava
    if (!player.ustuck && !player.levitating && !player.flying
        && is_pool_or_lava(player.x, player.y, map)) {
        if (is_lava(player.x, player.y, map)) {
            // lava_effects() would be called here
            if (display) await display.putstr_message('The lava burns you!');
            // Simplified: don't kill outright
            return true;
        } else {
            // drown() would be called here for non-water-walkers
            if (!player.waterWalking) {
                if (display) await display.putstr_message('You fall into the water!');
                return true;
            }
        }
    }
    return false;
}

// C ref: hack.c spoteffects() — effects of stepping on current square
export async function spoteffects(pick, player, map, display, game) {
    // Prevent recursion
    if (player._inSpoteffects) return;
    player._inSpoteffects = true;

    try {
        // Terrain-dependent levitation/flight changes
        const oldLoc = map.at(game.ux0 || player.x, game.uy0 || player.y);
        const curLoc = map.at(player.x, player.y);
        if (curLoc && oldLoc && curLoc.typ !== oldLoc.typ) {
            await switch_terrain(player, map, display);
        }

        // Pool/lava effects
        if (await pooleffects(true, player, map, display)) {
            return;
        }

        // Room entry messages
        await check_special_room(false, player, map, display, game?.fov || null);

        // Sink + levitation
        if (curLoc && curLoc.typ === SINK && player.levitating) {
            // dosinkfall() would be called
        }

        // Trap effects
        const trap = map.trapAt ? map.trapAt(player.x, player.y) : null;
        const isPit = trap && is_pit(trap.ttyp);

        // Pick up before trap (unless pit)
        if (pick && !isPit) {
            // Autopickup handled by domove
        }

        // Trigger trap (already handled in domove for basic traps)

        // Pick up after pit trap
        if (pick && isPit) {
            // Autopickup handled by domove
        }

    } finally {
        player._inSpoteffects = false;
    }
}

// C ref: hack.c invocation_message() — vibration at invocation pos
export async function invocation_message(player, map, display) {
    if (!invocation_pos(player.x, player.y, map)) return;
    // Check not on stairs
    const loc = map.at(player.x, player.y);
    if (loc && loc.typ === STAIRS) return;

    if (display) {
        if (player.levitating || player.flying) {
            await display.putstr_message('You feel a strange vibration beneath you.');
        } else {
            await display.putstr_message('You feel a strange vibration under your feet.');
        }
    }
    player.uvibrated = true;
}

// C ref: hack.c spot_checks() — handle terrain changes at (x,y)
export function spot_checks(_x, _y, _old_typ, _map) {
    // ICE melting effects and drawbridge ice checks
    // Stub: no timer system yet
}

// --------------------------------------------------------------------
// Pickup
// --------------------------------------------------------------------

// C ref: hack.c pickup_checks() — validate pickup attempt
// Returns: 1 = cannot pickup (time taken), 0 = cannot pickup (no time),
//          -1 = do normal pickup, -2 = loot monster inventory
export async function pickup_checks(player, map, display) {
    // Swallowed
    if (player.uswallow) {
        if (display) {
            await display.putstr_message("You don't see anything in here to pick up.");
        }
        return 1;
    }
    // Pool
    if (is_pool(player.x, player.y, map)) {
        if (player.levitating || player.flying) {
            if (display) await display.putstr_message('You cannot dive into the water to pick things up.');
            return 0;
        }
    }
    // Lava
    if (is_lava(player.x, player.y, map)) {
        if (player.levitating || player.flying) {
            if (display) await display.putstr_message("You can't reach the bottom to pick things up.");
            return 0;
        }
    }
    // No objects
    const objs = map.objectsAt ? map.objectsAt(player.x, player.y) : [];
    if (objs.length === 0) {
        const loc = map.at(player.x, player.y);
        if (loc) {
            if (loc.typ === THRONE) {
                if (display) await display.putstr_message('It must weigh a ton!');
            } else if (loc.typ === SINK) {
                if (display) await display.putstr_message('The plumbing connects it to the floor.');
            } else if (loc.typ === GRAVE) {
                if (display) await display.putstr_message("You don't need a gravestone.  Yet.");
            } else if (loc.typ === FOUNTAIN) {
                if (display) await display.putstr_message('You could drink the water...');
            } else if (IS_DOOR(loc.typ) && ((loc.flags || 0) & D_ISOPEN)) {
                if (display) await display.putstr_message("It won't come off the hinges.");
            } else if (loc.typ === ALTAR) {
                if (display) await display.putstr_message('Moving the altar would be a very bad idea.');
            } else if (loc.typ === STAIRS) {
                if (display) await display.putstr_message('The stairs are solidly affixed.');
            } else {
                if (display) await display.putstr_message('There is nothing here to pick up.');
            }
        } else {
            if (display) await display.putstr_message('There is nothing here to pick up.');
        }
        return 0;
    }
    // Can't reach floor (levitating without landing, in a pit, etc.)
    // Simplified: always reachable for now
    return -1;
}

// C ref: hack.c dopickup() — the #pickup command
export async function dopickup(player, map, display) {
    const ret = await pickup_checks(player, map, display);
    if (ret >= 0) {
        return ret ? { tookTime: true } : { tookTime: false };
    }
    // Normal pickup: handled elsewhere via pickup() in pickup.js
    return { tookTime: false, doPickup: true };
}

// --------------------------------------------------------------------
// Combat / damage helpers
// --------------------------------------------------------------------

// C ref: hack.c overexert_hp() — lose 1 HP or pass out from overexertion
export async function overexert_hp(player, display) {
    const usingPolyHp = !!player?.upolyd;
    const hpKey = usingPolyHp ? 'mh' : 'hp';
    const curHp = Number(player?.[hpKey] || 0);
    if (curHp > 1) {
        player[hpKey] = curHp - 1;
    } else {
        if (display) await display.putstr_message('You pass out from exertion!');
        await exercise(player, A_CON, false);
        // fall_asleep(-10, false) would be called
    }
}

// C ref: hack.c overexertion() — combat metabolism check
// Returns true if hero fainted (multi < 0).
export async function overexertion(game) {
    // Backward compatibility: older JS call sites pass (player, game, display).
    let player = game?.player;
    let display = game?.display;
    if (arguments.length >= 2 && arguments[0] && typeof arguments[0] === 'object'
        && arguments[1] && typeof arguments[1] === 'object'
        && ('moves' in arguments[1] || 'player' in arguments[1])) {
        player = arguments[0];
        game = arguments[1];
        display = arguments[2];
    }
    if (!game || !player) return false;
    await gethungry(player);
    const moves = game.moves || 0;
    if ((moves % 3) !== 0 && near_capacity(player) >= HVY_ENCUMBER) {
        await overexert_hp(player, display);
    }
    return (game.multi || 0) < 0;
}

// C ref: hack.c maybe_wail() — low HP warning for certain roles
export async function maybe_wail(player, game, display) {
    const moves = game.moves || 0;
    if (moves <= (game.wailmsg || 0) + 50) return;
    game.wailmsg = moves;
    const heroHp = Number.isFinite(player?.uhp) ? player.uhp : (player?.hp || 0);

    const roleMnum = player.roleMnum;
    const race = player.raceIndex ?? player.race;
    const isWizard = roleMnum === PM_WIZARD;
    const isValkyrie = roleMnum === PM_VALKYRIE;
    const isElf = race === RACE_ELF || race === 'Elf';

    if (isWizard || isElf || isValkyrie) {
        const who = (isWizard || isValkyrie) ? (player.roleName || player.role || 'Adventurer') : 'Elf';
        if (heroHp === 1) {
            if (display) await display.putstr_message(`${who} is about to die.`);
        } else {
            const powers = [TELEPORT, SEE_INVIS, POISON_RES, COLD_RES, SHOCK_RES,
                FIRE_RES, SLEEP_RES, DISINT_RES, TELEPORT_CONTROL, STEALTH, FAST, INVIS];
            let powercnt = 0;
            for (const prop of powers) {
                if ((player?.uprops?.[prop]?.intrinsic & INTRINSIC) !== 0) powercnt++;
            }
            if (display) {
                await display.putstr_message(powercnt >= 4
                    ? `${who}, all your powers will be lost...`
                    : `${who}, your life force is running out.`);
            }
        }
    } else {
        if (heroHp === 1) {
            if (display) await display.putstr_message('You hear the wailing of the Banshee...');
        } else {
            if (display) await display.putstr_message('You hear the howling of the CwnAnnwn...');
        }
    }
}

// C ref: hack.c saving_grace() — one-time survival of lethal blow
export function saving_grace(dmg, player, game) {
    if (dmg < 0) return 0;
    const heroHp = Number.isFinite(player?.uhp) ? player.uhp : (player?.hp || 0);
    const heroHpMax = Number.isFinite(player?.uhpmax) ? player.uhpmax : (player?.hpmax || 0);
    // Only protects from monster attacks
    const monMoving = !!(game?.context?.mon_moving || game?.mon_moving);
    if (!monMoving) return dmg;
    if (dmg < heroHp || heroHp <= 0) return dmg;
    // Already used?
    if (game.saving_grace_turn) return heroHp - 1;
    const hpAtStart = Number.isFinite(game?.uhp_at_start_of_monster_turn)
        ? game.uhp_at_start_of_monster_turn
        : player._uhp_at_start;
    if (!player.usaving_grace
        && Number.isFinite(hpAtStart)
        && heroHpMax > 0
        && Math.floor(hpAtStart * 100 / heroHpMax) >= 90) {
        dmg = heroHp - 1;
        player.usaving_grace = 1;
        game.saving_grace_turn = true;
        end_running(true, game);
    }
    return dmg;
}

// C ref: hack.c showdamage() — display HP loss
export async function showdamage(dmg, player, display, game) {
    if (!game?.iflags?.showdamage || !dmg) return;
    const hp = player.upolyd
        ? (player.mh || 0)
        : (Number.isFinite(player?.uhp) ? player.uhp : (player?.hp || 0));
    if (display) await display.putstr_message(`[HP ${-dmg}, ${hp} left]`);
}

// C ref: hack.c losehp() — hero loses hit points
export async function losehp(n, knam, k_format, player, display, game) {
    end_running(true, game);

    if (player.upolyd) {
        player.mh = (player.mh || 0) - n;
        await showdamage(n, player, display, game);
        if ((player.mhmax || 0) < player.mh) player.mhmax = player.mh;
        if (player.mh < 1) {
            // rehumanize() would be called in full implementation
        } else if (n > 0 && player.mh * 10 < (player.mhmax || 0) && player.unchanging) {
            await maybe_wail(player, game, display);
        }
        return;
    }

    n = saving_grace(n, player, game);
    const hadLegacyHp = Object.prototype.hasOwnProperty.call(player, 'hp');
    const hadLegacyHpMax = Object.prototype.hasOwnProperty.call(player, 'hpmax');
    const heroHp = Number.isFinite(player?.uhp) ? player.uhp : (player?.hp || 0);
    const heroHpMax = Number.isFinite(player?.uhpmax) ? player.uhpmax : (player?.hpmax || 0);
    const nextHp = heroHp - n;
    player.uhp = nextHp;
    if (hadLegacyHp) player.hp = nextHp;
    await showdamage(n, player, display, game);
    if (heroHpMax < nextHp) {
        player.uhpmax = nextHp;
        if (hadLegacyHpMax) player.hpmax = nextHp;
    }
    if (player.uhp < 1) {
        if (display) await display.putstr_message('You die...');
        // done(DIED) would be called in full implementation
        // For now, set hp to 0
        player.uhp = 0;
        if (hadLegacyHp) player.hp = 0;
        if (game) {
            game.killer = { format: k_format, name: knam || '' };
            game.playerDied = true;
        }
    } else if (n > 0 && player.uhp * 10 < player.uhpmax) {
        await maybe_wail(player, game, display);
    }
}

// --------------------------------------------------------------------
// Monster awareness
// --------------------------------------------------------------------

// C ref: hack.c monster_nearby() — is a threatening monster adjacent?
// Re-export from monutil.js for convenience.


// C ref: hack.c notice_mon() — accessibility notice for a monster
export function notice_mon(_mtmp) {
    // Accessibility feature: announce newly spotted monsters.
    // Stub: not yet implemented.
}

// C ref: hack.c notice_all_mons() — notice all visible monsters
export function notice_all_mons(_reset) {
    // Stub: not yet implemented.
}

// --------------------------------------------------------------------
// Locomotion helpers
// --------------------------------------------------------------------

// C ref: hack.c u_locomotion() — appropriate movement verb for hero
export function u_locomotion(def, player) {
    if (player && player.levitating) {
        return def.charAt(0) === def.charAt(0).toUpperCase() ? 'Float' : 'float';
    }
    if (player && player.flying) {
        return def.charAt(0) === def.charAt(0).toUpperCase() ? 'Fly' : 'fly';
    }
    return def;
}

// C ref: hack.c handle_tip() — show gameplay tip
export async function handle_tip(tip, player, display) {
    if (!player) return false;
    const key = String(tip || '');
    player._tipsShown = player._tipsShown || {};
    if (player._tipsShown[key]) return false;
    let msg = null;
    if (key === 'swim' || key === 'TIP_SWIM' || key === '1') {
        msg = "(Tip: use 'm' prefix to step in if you really want to.)";
    }
    if (!msg) return false;
    player._tipsShown[key] = true;
    if (display?.putstr_message) {
        await display.putstr_message(msg);
    } else {
        await pline('%s', msg);
    }
    return true;
}

// --------------------------------------------------------------------
// Escape from traps
// --------------------------------------------------------------------

// C ref: hack.c trapmove() — try to escape from a trap
// Returns true if hero can continue moving to intended destination.
export async function trapmove(player, x, y, display, map = null) {
    if (!player.utrap) return true;
    const ttyp = player.utraptype;
    const isBear = (ttyp === TT_BEARTRAP);
    const isPitTrap = (ttyp === TT_PIT);
    const isWebTrap = (ttyp === TT_WEB);
    const isLavaTrap = (ttyp === TT_LAVA);
    const desttrap = map?.trapAt ? map.trapAt(x, y) : null;

    if (isBear) {
        if (display) await display.putstr_message('You are caught in a bear trap.');
        if ((player.dx && player.dy) || rn2(5) === 0) player.utrap--;
        if (!player.utrap) {
            if (display) await display.putstr_message('You finally wriggle free.');
        }
        return false;
    }
    if (isPitTrap) {
        if (desttrap && desttrap.tseen && is_pit(desttrap.ttyp)) {
            return true; // move into adjacent known pit
        }
        // C ref: trap.c climb_pit() — always consumes rn2(2) before checking
        // boulder-in-pit leg-stuck branch.
        const legStuckRoll = rn2(2);
        const hereX = Number.isInteger(player.x) ? player.x : x;
        const hereY = Number.isInteger(player.y) ? player.y : y;
        const objsHere = (typeof map?.objectsAt === 'function')
            ? map.objectsAt(hereX, hereY)
            : (map?.objects || []).filter((obj) => obj?.ox === hereX && obj?.oy === hereY);
        const boulderHere = objsHere.some((obj) => obj?.otyp === BOULDER);
        if (legStuckRoll === 0 && boulderHere) {
            if (display) {
                await display.putstr_message('Your leg gets stuck in a crevice.');
                await display.putstr_message('You free your leg.');
            }
            return false;
        }
        player.utrap = Math.max(0, (player.utrap || 0) - 1);
        if (!player.utrap) {
            if (display) await display.putstr_message('You crawl to the edge of the pit.');
            return false;
        }
        await Norep('You are still in a pit.');
        return false;
    }
    if (isWebTrap) {
        player.utrap--;
        if (!player.utrap) {
            if (display) await display.putstr_message('You disentangle yourself.');
        } else {
            if (display) await display.putstr_message('You are stuck to the web.');
        }
        return false;
    }
    if (isLavaTrap) {
        if (display) await display.putstr_message('You are stuck in the lava.');
        const steppingOffLava = map ? !is_lava(x, y, map) : true;
        if (steppingOffLava) {
            player.utrap--;
            if ((player.utrap & 0xff) === 0) player.utrap = 0;
        }
        player.umoved = true;
        return false;
    }
    return false;
}

// C ref: hack.c is_valid_travelpt() — can hero travel to (x,y)?
export async function is_valid_travelpt(x, y, player, map) {
    if (player.x === x && player.y === y) return true;
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    // C parity: ordinary heroes cannot path onto wall cells as travel points.
    if (IS_WALL(loc.typ) || loc.typ === SDOOR) {
        const canPassWalls = !!(
            player?.passesWalls
            || player?.passWalls
            || (player?.data && passes_walls(player.data))
        );
        if (!canPassWalls) return false;
    }
    // Stone that hasn't been seen is not a valid travel point
    if (loc.typ === STONE && !loc.seenv) return false;
    // Check if we can path there via C-style findtravelpath validation mode.
    const game = { player, map, travelX: x, travelY: y };
    return await findtravelpath(TRAVP_VALID, game);
}

// C ref: hack.c revive_nasty() — revive rider corpses at (x,y)
export function revive_nasty(_x, _y, _msg, _map) {
    // Rider revival system not yet implemented.
    return false;
}

// C ref: hack.c movobj() — move an object to new position
export function movobj(obj, ox, oy, map) {
    if (!obj || !map?.objects) return;
    // C ref: remove_object() — unlink from floor list without logging ^remove.
    const idx = map.objects.indexOf(obj);
    if (idx >= 0) map.objects.splice(idx, 1);
    maybe_unhide_at(obj.ox, obj.oy, map);
    newsym(obj.ox, obj.oy);
    place_object(obj, ox, oy, map);
    newsym(ox, oy);
}

// C ref: hack.c dosinkfall() — fall into a sink while levitating
export async function dosinkfall(player, map, display) {
    if (!player.levitating) return;
    const loc = map.at(player.x, player.y);
    if (!loc || loc.typ !== SINK) return;
    // Innate levitation just wobbles
    if (player.inherentLevitation) {
        if (display) await display.putstr_message('You wobble unsteadily for a moment.');
        return;
    }
    if (display) await display.putstr_message('You crash to the floor!');
    const con = acurr(player, A_CON);
    const dmg = rn1(8, 25 - con); // C: rn1(8, 25-ACURR(A_CON))
    if (typeof player.takeDamage === 'function') {
        player.takeDamage(dmg, 'fell onto a sink');
    }
    await exercise(player, A_DEX, false);
}

// C ref: hack.c impact_disturbs_zombies()
export function impact_disturbs_zombies(_obj, _violent) {
    // Buried zombie timer system not yet implemented.
}

// C ref: hack.c disturb_buried_zombies()
export function disturb_buried_zombies(_x, _y) {
    // Buried zombie timer system not yet implemented.
}

// C ref: hack.c u_simple_floortyp() — simplified floor type for hero
export function u_simple_floortyp(x, y, player, map) {
    const loc = map.at(x, y);
    if (!loc) return ROOM;
    if (IS_WATERWALL(loc.typ)) return WATER;
    if (loc.typ === LAVAWALL) return LAVAWALL;
    const inAir = player.levitating || player.flying;
    if (!inAir) {
        if (IS_POOL(loc.typ)) return POOL;
        if (IS_LAVA(loc.typ)) return LAVAPOOL;
    }
    return ROOM;
}

// C ref: hack.c feel_location() — feel terrain when blind
export function feel_location(_x, _y, _map) {
    // Display update for blind hero; stub.
}

// C ref: hack.c feel_newsym() — update map display for a newly felt/seen location.
// For sighted hero: newsym(x, y).  For blind: feel_location(x, y) (stub).
// Signature is (x, y) matching C — some callers pass (map, x, y) due to old stub.
export function feel_newsym(a, b, c) {
    // Compatibility: some old callers pass (map, x, y); canonical is (x, y).
    let x = a;
    let y = b;
    if (typeof a === 'object' && Number.isInteger(b) && Number.isInteger(c)) {
        x = b;
        y = c;
    }
    if (!Number.isInteger(x) || !Number.isInteger(y)) return;
    if (typeof c === 'object' && c?.blind) {
        feel_location(x, y);
    } else {
        newsym(x, y);
    }
}

// C ref: hack.c lava_effects() — effects of stepping on lava
// Returns true if hero moved while surviving.
export async function lava_effects(player, map, display) {
    if (!is_lava(player.x, player.y, map)) return false;
    if (player.fireResistant) {
        if (display) await display.putstr_message('The lava feels warm.');
        return false;
    }
    // Damage from lava
    const dmg = d(6, 6);
    if (display) await display.putstr_message("The lava burns you!");
    if (typeof player.takeDamage === 'function') {
        player.takeDamage(dmg, 'molten lava');
    }
    return false;
}

// C ref: hack.c swamp_effects() — effects of stepping in swamp
// Note: C doesn't have a standalone swamp_effects; swamp is a room type.
// This is a convenience stub for swamp terrain interaction.
export function swamp_effects(_player, _map, _display) {
    // Swamp rooms just give an entry message (handled by check_special_room).
    // No per-step swamp terrain effect in C.
}

// C ref: hack.c search_demand() — forced search from trap
// Note: C doesn't have search_demand in hack.c; this may refer to
// dosearch0 in detect.c. Re-export for convenience.
export { dosearch0 as search_demand };

// C ref: hack.c getdir() — get direction from player input
// Note: getdir() is actually in cmd.c in C; included here as it was
// mentioned in the task. Uses DIRECTION_KEYS from dothrow.js.
export async function getdir(prompt, display) {
    if (display && prompt) await display.putstr_message(prompt);
    const ch = await awaitInput(null, nhgetch_raw(), { site: 'hack.getdir.read' });
    const c = String.fromCharCode(ch);
    const dir = DIRECTION_KEYS[c.toLowerCase()];
    if (dir) return { dx: dir[0], dy: dir[1], dz: 0 };
    if (c === '>' || c === '<') return { dx: 0, dy: 0, dz: c === '>' ? 1 : -1 };
    if (c === '.') return { dx: 0, dy: 0, dz: 0 };
    return null; // invalid direction
}

// C ref: hack.c hurtle_step() — one step of hurtling through the air
// Note: hurtle_step is actually in dothrow.c in C. Included here as
// mentioned in the task.
export function hurtle_step(x, y, player, map) {
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    if (!loc || !ACCESSIBLE(loc.typ)) return false;
    // Check for monster blocking
    const mon = map.monsterAt ? map.monsterAt(x, y) : null;
    if (mon && !mon.dead) return false;
    // Move hero
    player.x = x;
    player.y = y;
    return true;
}

// C ref: hack.c drag_ball() — drag ball & chain when punished
// Returns true if movement can proceed.
export function drag_ball(_x, _y, _player, _map) {
    // Ball & chain (punishment) system not yet fully implemented.
    // Always allow movement.
    return true;
}

// ========================================================================
// Functions moved from monutil.js — C ref: hack.h / hack.c
// ========================================================================

// dist2/distmin: canonical definitions in hacklib.js
import { dist2, distmin } from './hacklib.js';
export { dist2, distmin };

function monsterIsTame(mon) {
    if (!mon) return false;
    if (mon.mtame !== undefined) return !!mon.mtame;
    return !!mon.tame;
}

function sanitizeMonsterType(mon) {
    const ptr = mon?.data || mon?.type;
    const ptrIsObject = ptr && typeof ptr === 'object';
    const attacks = ptrIsObject && Array.isArray(ptr.mattk)
        ? ptr.mattk
        : (!ptrIsObject ? [{ aatyp: AT_WEAP }] : []);
    return {
        ...(ptrIsObject ? ptr : {}),
        attacks,
        mflags1: Number(ptr?.mflags1 ?? 0),
        mflags2: Number(ptr?.mflags2 ?? 0),
        mflags3: Number(ptr?.mflags3 ?? 0),
    };
}

// C ref: hack.c:3988 — monster_nearby()
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
            if (mon.m_ap_type === M_AP_FURNITURE || mon.m_ap_type === M_AP_OBJECT) continue;

            const mptr = sanitizeMonsterType(mon);
            const isPeaceful = !!(mon.mpeaceful || mon.peaceful);
            const hostileThreat = playerHallucinating || (!monsterIsTame(mon) && !isPeaceful && !noattacks(mptr));
            const hidden = is_hider(mptr || {}) && mon.mundetected;
            const isHelpless = helpless(mon);
            const scary = onscary(map, px, py, mon);
            const canSpot = canSpotMonsterForMap(mon, map, player, fov);
            if (!hostileThreat) continue;
            if (hidden) continue;
            if (isHelpless) continue;
            if (scary) continue;
            if (!canSpot) continue;
            return true;
        }
    }
    return false;
}
