// teleport.js -- Teleportation mechanics (player, monster, objects, levels)
// cf. teleport.c — goodpos, enexto, teleds, safe_teleds, tele, scrolltele,
//                  dotele, level_tele, domagicportal, tele_trap, rloc,
//                  rloco, random_teleport_level, u_teleport_mon, and helpers
//
// Runtime teleport functions for monster relocation (rloc/rloc_to),
// position validation (goodpos), and hero teleport helpers.

import {
    COLNO, ROWNO, isok, ACCESSIBLE, A_WIS,
    POOL, MOAT, WATER, LAVAPOOL, ICE,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DBWALL, DOOR,
    IS_POOL, IS_LAVA, IS_DRAWBRIDGE,
    D_CLOSED, D_LOCKED,
    NO_TRAP, TELEP_TRAP, LEVEL_TELEP, VIBRATING_SQUARE,
    MAGIC_PORTAL,
    HOLE, TRAPDOOR,
    is_pit, is_hole,
    NO_MM_FLAGS, MM_IGNOREWATER, MM_IGNORELAVA,
    GP_CHECKSCARY, GP_ALLOW_U, GP_AVOID_MONPOS, GP_ALLOW_XY,
    RLOC_NONE, RLOC_NOMSG, RLOC_MSG, RLOC_TELE, RLOC_ERR,
    TELEDS_TELEPORT, ANTIMAGIC, VAULT, STRAT_APPEARMSG,
    FORCETRAP, VIASITTING, BOLT_LIM,
} from './const.js';
import { somexyspace, search_special } from './mkroom.js';
import { BOULDER, CLOAK_OF_MAGIC_RESISTANCE } from './objects.js';
import { M1_SWIM, M1_AMPHIBIOUS, M1_FLY, M1_WALLWALK, M1_AMORPHOUS, M2_ROCKTHROW, S_EEL } from './monsters.js';
import { rn2, rnd, rn1 } from './rng.js';
import { is_pool, is_lava, is_waterwall } from './dbridge.js';
import { passes_walls, is_swimmer, is_flyer, is_floater,
         likes_lava, canseemon,
         is_rider, is_dlord, is_dprince, control_teleport,
         } from './mondata.js';
import { newsym, mark_vision_dirty } from './display.js';
import { getpos_async } from './getpos.js';
import { mondead, onscary } from './mon.js';
import { set_apparxy, mon_track_clear } from './monmove.js';
import { pline } from './pline.js';
import { exercise } from './attrib_exercise.js';
import { Monnam, Amonnam, mon_nam } from './do_name.js';
import { maybeHandleShopEntryMessage, describeGroundObjectForPlayer } from './shk.js';
import { deltrap } from './dungeon.js';
import { couldsee } from './vision.js';

function pendingToplineNeedsAck(display) {
    return !!(display?.messageNeedsMore && display?.moreMarkerActive);
}

function dismissOwnedToplineMore(game) {
    const display = game?.display;
    if (!display) return;
    if (Object.hasOwn(display, 'messageNeedsMore')) display.messageNeedsMore = false;
    if (Object.hasOwn(display, 'moreMarkerActive')) display.moreMarkerActive = false;
    if (Object.hasOwn(display, 'topMessage')) display.topMessage = null;
    if (typeof display.clearRow === 'function') {
        display.clearRow(0);
        if (display._topMessageRow1 !== undefined) {
            display.clearRow(1);
            display._topMessageRow1 = undefined;
        }
    }
}

function installTeleportArrivalMorePrompt(game, oldX, oldY) {
    if (!game?.display || !pendingToplineNeedsAck(game.display)) return;
    let stage = 0;
    game.pendingPrompt = {
        type: 'teleport_arrival_more',
        onKey: async (chCode, gameCtx) => {
            if (chCode !== 32 && chCode !== 10 && chCode !== 13
                && chCode !== 27 && chCode !== 16) {
                return { handled: true, moved: false, tookTime: false, prompt: true };
            }

            dismissOwnedToplineMore(gameCtx);

            if (stage === 0) {
                stage = 1;
                await maybeHandleShopEntryMessage(gameCtx, oldX, oldY);
                if (pendingToplineNeedsAck(gameCtx.display)) {
                    return { handled: true, moved: false, tookTime: false, prompt: true };
                }
            }

            if (stage === 1) {
                stage = 2;
                const objs = gameCtx.map?.objectsAt
                    ? gameCtx.map.objectsAt(gameCtx.player.x, gameCtx.player.y)
                    : [];
                if (objs.length === 1) {
                    await pline(`You see here ${describeGroundObjectForPlayer(objs[0], gameCtx.player, gameCtx.map)}.`);
                    if (pendingToplineNeedsAck(gameCtx.display)) {
                        return { handled: true, moved: false, tookTime: false, prompt: true };
                    }
                }
            }

            gameCtx.pendingPrompt = null;
            return { handled: true, moved: false, tookTime: true, prompt: true };
        },
    };
}

// ============================================================================
// Flags (cf. hack.h)
// ============================================================================

// CC flags for collect_coords
const CC_NO_FLAGS = 0;
const CC_INCL_CENTER = 0x01;
const CC_UNSHUFFLED = 0x02;
const CC_RING_PAIRS = 0x04;
const CC_SKIP_MONS = 0x08;
const CC_SKIP_INACCS = 0x10;
// STRAT_APPEARMSG imported from const.js

// ============================================================================
// noteleport_level — cf. teleport.c:29
// ============================================================================

export function noteleport_level(mon, map) {
    // demon court in Gehennom prevents others from teleporting
    // Simplified: check map.flags.noteleport
    if (map && map.flags && map.flags.noteleport) return true;
    return false;
}

function hasAntimagic(player) {
    if (!player) return false;
    const prop = player.uprops?.[ANTIMAGIC];
    return !!(player.antimagic || player.Antimagic
        || prop?.intrinsic || prop?.extrinsic
        || player?.cloak?.otyp === CLOAK_OF_MAGIC_RESISTANCE);
}

// ============================================================================
// goodpos — cf. teleport.c:80
// Full runtime version: checks terrain, monsters, scary locations.
// ============================================================================

export function goodpos(x, y, mtmp, gpflags, map, player) {
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    if (!loc) return false;

    const ignorewater = (gpflags & MM_IGNOREWATER) !== 0;
    const ignorelava = (gpflags & MM_IGNORELAVA) !== 0;
    const checkscary = (gpflags & GP_CHECKSCARY) !== 0;
    const allow_u = (gpflags & GP_ALLOW_U) !== 0;
    const avoid_monpos = (gpflags & GP_AVOID_MONPOS) !== 0;

    // Check player location
    if (!allow_u && player) {
        if (x === player.x && y === player.y && mtmp !== player)
            return false;
    }

    // Check monster at location
    if (avoid_monpos) {
        const mtmp2 = map.monsterAt(x, y);
        if (mtmp2) return false;
    }

    if (mtmp && mtmp !== player) {
        const mtmp2 = map.monsterAt(x, y);
        if (mtmp2 && (mtmp2 !== mtmp || mtmp.wormno))
            return false;

        const mdat = mtmp.data || mtmp.type || {};
        const f1 = mdat.mflags1 || 0;

        if (is_pool(x, y, map) && !ignorewater) {
            return !!(f1 & (M1_SWIM | M1_AMPHIBIOUS | M1_FLY));
        } else if (mdat.mlet === S_EEL && rn2(13) && !ignorewater) {
            return false;
        } else if (is_lava(x, y, map) && !ignorelava) {
            if (likes_lava(mdat) || (f1 & M1_FLY)) return true;
            return false;
        }

        if ((f1 & M1_WALLWALK) && loc.typ < DOOR) return true;
        if ((f1 & M1_AMORPHOUS) && loc.typ === DOOR
            && (loc.flags & (D_CLOSED | D_LOCKED))) return true;

        // C ref: teleport.c goodpos() checks onscary for real monsters and
        // goodpos_onscary for fake placement probes (m_id==0 path). In JS,
        // onscary(map,x,y,mon) handles both when given the probe monster data.
        if (checkscary) {
            if (typeof onscary === 'function' && onscary(map, x, y, mtmp))
                return false;
        }
    }

    // Check accessible terrain
    if (!ACCESSIBLE(loc.typ)) {
        if (!(is_pool(x, y, map) && ignorewater)
            && !(is_lava(x, y, map) && ignorelava))
            return false;
    }

    // Skip boulder locations for most creatures
    if (map.objects) {
        const hasBoulder = map.objects.some(o => o && o.otyp === BOULDER
            && o.ox === x && o.oy === y);
        if (hasBoulder) {
            if (!mtmp) return false;
            const mdat = mtmp.data || mtmp.type || {};
            if (!((mdat.mflags2 || 0) & M2_ROCKTHROW)) return false;
        }
    }

    return true;
}

// teleport.c:48 — approximation of onscary() using only monster data.
// In JS we delegate to mon.js onscary() with a lightweight probe monster.
export function goodpos_onscary(x, y, mptr, map) {
    if (!mptr || !isok(x, y) || !map || typeof onscary !== 'function') return false;
    const probe = { data: mptr, type: mptr, mx: x, my: y, wormno: 0 };
    return !!onscary(map, x, y, probe);
}

// ============================================================================
// collect_coords — cf. teleport.c:572
// Runtime version with full cc_flags support.
// ============================================================================

export function collect_coords(cx, cy, maxradius, cc_flags, map) {
    const include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0;
    const scramble = (cc_flags & CC_UNSHUFFLED) === 0;
    const ring_pairs = scramble && (cc_flags & CC_RING_PAIRS) !== 0;
    const skip_mons = (cc_flags & CC_SKIP_MONS) !== 0;
    const skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;

    const rowrange = (cy < Math.floor(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < Math.floor(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    const k = Math.max(rowrange, colrange);
    if (!maxradius) maxradius = k;
    else maxradius = Math.min(maxradius, k);

    const result = [];
    let passIdx = 0;
    let n = 0;

    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; radius++) {
        let newpass, passend;
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            newpass = ((radius % 2) !== 0 || radius === 0);
            passend = ((radius % 2) === 0 || radius === maxradius);
        }
        if (newpass) {
            passIdx = result.length;
            n = 0;
        }

        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;

                // Quick filters
                if (skip_mons && map && map.monsterAt(x, y)) continue;
                if (skip_inaccessible) {
                    const loc = map && map.at(x, y);
                    if (!loc || !ACCESSIBLE(loc.typ)) {
                        // ZAP_POS allows pools and lava but not walls
                        if (!IS_POOL(loc.typ) && !IS_LAVA(loc.typ)) continue;
                    }
                }

                result.push({ x, y });
                n++;
            }
        }

        if (scramble && passend) {
            let shuffleIdx = passIdx;
            let shuffleN = n;
            while (shuffleN > 1) {
                const swap = rn2(shuffleN);
                if (swap) {
                    const tmp = result[shuffleIdx];
                    result[shuffleIdx] = result[shuffleIdx + swap];
                    result[shuffleIdx + swap] = tmp;
                }
                shuffleIdx++;
                shuffleN--;
            }
        }
    }

    return result;
}

// ============================================================================
// enexto — cf. teleport.c:190 (runtime version)
// ============================================================================

// Autotranslated from teleport.c:190
export function enexto(cc, xx, yy, mdat, map, player) {
  return (enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY, map, player) || enexto_core(cc, xx, yy, mdat, NO_MM_FLAGS, map, player));
}

export function enexto_core(cc_out, xx, yy, mdat, entflags, map, player) {
    const fakemon = { data: mdat || {}, type: mdat || {}, wormno: 0 };

    // First pass: radius 3
    const nearCoords = collect_coords(xx, yy, 3, CC_NO_FLAGS, map);
    for (const cc of nearCoords) {
        if (goodpos(cc.x, cc.y, fakemon, entflags, map, player)) {
            cc_out.x = cc.x;
            cc_out.y = cc.y;
            return true;
        }
    }

    // Second pass: full map
    const allCoords = collect_coords(xx, yy, 0, CC_NO_FLAGS, map);
    for (let i = nearCoords.length; i < allCoords.length; i++) {
        const cc = allCoords[i];
        if (goodpos(cc.x, cc.y, fakemon, entflags, map, player)) {
            cc_out.x = cc.x;
            cc_out.y = cc.y;
            return true;
        }
    }

    // Try (xx,yy) itself if GP_ALLOW_XY
    cc_out.x = xx;
    cc_out.y = yy;
    if ((entflags & GP_ALLOW_XY) && goodpos(xx, yy, fakemon, entflags, map, player))
        return true;

    return false;
}

// ============================================================================
// rloc_pos_ok — cf. teleport.c:1570
// ============================================================================

function rloc_pos_ok(x, y, mtmp, map, player) {
    if (!goodpos(x, y, mtmp, GP_CHECKSCARY, map, player))
        return false;

    const xx = mtmp.mx;
    const yy = mtmp.my;

    if (!xx) {
        // Migrating monster arrival — simplified, skip restricted area checks
        return true;
    }

    // Shopkeeper stays in shop
    if (mtmp.isshk) {
        const loc = map.at(x, y);
        if (loc && mtmp.shoproom && loc.roomno !== mtmp.shoproom)
            return false;
    }
    // Priest stays in temple
    if (mtmp.ispriest) {
        const loc = map.at(x, y);
        if (loc && mtmp.shroom && loc.roomno !== mtmp.shroom)
            return false;
    }

    return true;
}

// ============================================================================
// rloc_to_core — cf. teleport.c:1640
// Core monster relocation.
// ============================================================================

async function rloc_to_core(mtmp, x, y, rlocflags, map, player, display, fov) {
    const oldx = mtmp.mx;
    const oldy = mtmp.my;
    const preventmsg = (rlocflags & RLOC_NOMSG) !== 0;
    const vanishmsg = (rlocflags & RLOC_MSG) !== 0;
    let appearmsg = ((Number(mtmp.mstrategy || 0) & STRAT_APPEARMSG) !== 0);
    const domsg = !!display && (vanishmsg || appearmsg) && !preventmsg;
    let telemsg = false;
    const heroDist2 = (tx, ty) => {
        if (!player) return Number.MAX_SAFE_INTEGER;
        const dx = tx - player.x;
        const dy = ty - player.y;
        return (dx * dx) + (dy * dy);
    };
    const canSeePos = (tx, ty) => {
        if (!player) return false;
        if (fov?.canSee) return !!fov.canSee(tx, ty);
        return !!couldsee(map, player, tx, ty);
    };

    if (x === mtmp.mx && y === mtmp.my && map.monsterAt(x, y) === mtmp)
        return; // already there

    // "pick up" monster from old location
    if (oldx) {
        if (domsg && canSeePos(mtmp.mx, mtmp.my)) {
            const seenAfter = canSeePos(x, y);
            if (seenAfter) {
                telemsg = true;
            } else {
                await pline(`${Monnam(mtmp)} vanishes!`);
            }
            // C ref: teleport.c suppresses appearmsg when we just emitted a
            // vanish message and won't see an immediate post-teleport arrival.
            appearmsg = false;
        }
        // C removes the monster from its old square before redrawing it.
        // newsym() reads live map state, so clear mx/my first to avoid
        // repainting a stale monster glyph at the old location.
        if (!mtmp.wormno) {
            mtmp.mx = 0;
            mtmp.my = 0;
        }
        newsym(oldx, oldy);
    }

    // Clear track
    mon_track_clear(mtmp);

    // Place monster at new position
    mtmp.mx = x;
    mtmp.my = y;

    // Update display
    newsym(x, y);

    // Orient monster toward player
    if (player) {
        set_apparxy(mtmp, map, player);
    }

    if (domsg && telemsg && canSeePos(mtmp.mx, mtmp.my)) {
        const du = heroDist2(x, y);
        const olddu = heroDist2(oldx, oldy);
        const next = du <= 2 ? ' next to you' : '';
        const nearu = du <= (BOLT_LIM * BOLT_LIM) ? ' close by' : '';
        const where = next || nearu || (du === olddu ? '' : (du < olddu ? ' closer to you' : ' farther away'));
        await pline(`${Monnam(mtmp)} vanishes and reappears${where}.`);
    } else if (domsg && (canSeePos(mtmp.mx, mtmp.my)
        || appearmsg)) {
        const du = heroDist2(x, y);
        const next = du <= 2 ? ' next to you' : '';
        const nearu = du <= (BOLT_LIM * BOLT_LIM) ? ' close by' : '';
        mtmp.mstrategy = Number(mtmp.mstrategy || 0) & ~STRAT_APPEARMSG;
        await pline(`${appearmsg ? Amonnam(mtmp) : Monnam(mtmp)} ${appearmsg ? 'suddenly ' : ''}${player?.blind ? 'arrives' : 'appears'}${next || nearu}!`);
    }

    // Trapped monster teleported away — clear trap state
    if (mtmp.mtrapped && !mtmp.wormno) {
        mtmp.mtrapped = 0;
    }
}

// cf. teleport.c:1766 — rloc_to(mon, x, y)
// Autotranslated from teleport.c:1765
export async function rloc_to(mtmp, x, y) {
  await rloc_to_core(mtmp, x, y, RLOC_NOMSG);
}

// cf. teleport.c:1772 — rloc_to_flag(mon, x, y, rflags)
// Autotranslated from teleport.c:1771
export async function rloc_to_flag(mtmp, x, y, rlocflags) {
  await rloc_to_core(mtmp, x, y, rlocflags);
}

// ============================================================================
// rloc — cf. teleport.c:1794
// Relocate monster to random location. Returns true if successful.
// ============================================================================

export async function rloc(mtmp, rlocflags, map, player, display, fov) {
    let x, y;

    // Try random positions (up to 50 times)
    for (let trycount = 0; trycount < 50; trycount++) {
        x = rnd(COLNO - 1); // 1..COLNO-1
        y = rn2(ROWNO);     // 0..ROWNO-1
        if (rloc_pos_ok(x, y, mtmp, map, player)) {
            await rloc_to_core(mtmp, x, y, rlocflags, map, player, display, fov);
            return true;
        }
    }

    // Exhaustive search with shuffled order
    const cc_flags = CC_INCL_CENTER | CC_UNSHUFFLED | CC_SKIP_MONS;
    const mdat = mtmp.data || mtmp.type || {};
    if (!((mdat.mflags1 || 0) & M1_WALLWALK))
        // Note: CC_SKIP_INACCS is OR'd in below
        ;
    const candy = collect_coords(
        Math.floor(COLNO / 2), Math.floor(ROWNO / 2), 0,
        cc_flags | (((mdat.mflags1 || 0) & M1_WALLWALK) ? 0 : CC_SKIP_INACCS),
        map
    );
    let backupX = 0, backupY = 0;
    const candycount = candy.length;

    for (let i = 0; i < candycount; i++) {
        // Fisher-Yates in-place
        const j = rn2(candycount - i);
        if (j > 0) {
            const tmp = candy[i];
            candy[i] = candy[i + j];
            candy[i + j] = tmp;
        }
        x = candy[i].x;
        y = candy[i].y;
        if (rloc_pos_ok(x, y, mtmp, map, player)) {
            await rloc_to_core(mtmp, x, y, rlocflags, map, player, display, fov);
            return true;
        }
        if (!backupX && goodpos(x, y, mtmp, NO_MM_FLAGS, map, player)) {
            backupX = x;
            backupY = y;
        }
    }

    // Use backup position
    if (!backupX) {
        return false;
    }
    await rloc_to_core(mtmp, backupX, backupY, rlocflags, map, player, display, fov);
    return true;
}

// teleport.c:1894 — optional wizard destination override for monster teleports.
// JS keeps this deterministic and UI-free: caller can prefill cc_p and set
// monTelecontrol=true to request validation of the provided destination.
export function control_mon_tele(mon, cc_p, rlocflags, via_rloc, map, player, opts = {}) {
    if (!cc_p || typeof cc_p !== 'object') return false;
    if (!isok(cc_p.x ?? -1, cc_p.y ?? -1)) {
        cc_p.x = mon?.mx ?? player?.x ?? 0;
        cc_p.y = mon?.my ?? player?.y ?? 0;
    }
    if (!opts.monTelecontrol) return false;
    if (player && cc_p.x === player.x && cc_p.y === player.y) return false;
    if (opts.force === true) return true;
    return via_rloc
        ? !!rloc_pos_ok(cc_p.x, cc_p.y, mon, map, player)
        : !!goodpos(cc_p.x, cc_p.y, mon, rlocflags, map, player);
}

// ============================================================================
// tele_restrict — cf. teleport.c:1945
// ============================================================================

export function tele_restrict(mon, map) {
    if (noteleport_level(mon, map)) {
        return true;
    }
    return false;
}

// ============================================================================
// u_teleport_mon — cf. teleport.c:2254
// Player teleports a monster (via wand/spell). Returns false if fails.
// ============================================================================

export async function u_teleport_mon(mtmp, give_feedback, map, player, display, fov) {
    const cc = {};

    if (mtmp.ispriest) {
        const loc = map.at(mtmp.mx, mtmp.my);
        // If priest is in temple, resist
        if (loc && mtmp.shroom && loc.roomno === mtmp.shroom) {
            if (give_feedback) {
                // "resists your magic!"
            }
            return false;
        }
    }

    const mdat = mtmp.data || mtmp.type || {};
    if ((is_rider(mdat) || control_teleport(mdat))
        && rn2(13)
        && enexto(cc, player ? player.x : mtmp.mx, player ? player.y : mtmp.my,
                  mdat, map, player)) {
        await rloc_to(mtmp, cc.x, cc.y, map, player, display, fov);
    } else {
        if (!await rloc(mtmp, RLOC_MSG, map, player, display, fov))
            return false;
    }
    return true;
}

// ============================================================================
// mtele_trap — cf. teleport.c:1957
// Monster steps on teleport trap.
// ============================================================================

export async function mtele_trap(mtmp, trap, in_sight, map, player, display, fov) {
    if (tele_restrict(mtmp, map)) return;
    if (!teleport_pet(mtmp, false)) return;

    // C ref: teleport.c mtele_trap() — preserve pre-teleport visible name.
    const monname = Monnam(mtmp);

    if (trap?.once) {
        await mvault_tele(mtmp, map, player);
    } else if (isok(trap?.teledest?.x ?? -1, trap?.teledest?.y ?? -1)) {
        const tx = trap.teledest.x;
        const ty = trap.teledest.y;
        const blockedByMon = !!(map?.monsterAt && map.monsterAt(tx, ty));
        const blockedByHero = !!(player && player.x === tx && player.y === ty);
        if (!(blockedByMon || blockedByHero)) {
            await rloc_to_core(mtmp, tx, ty, RLOC_MSG, map, player, display, fov);
        }
    } else {
        await rloc(mtmp, RLOC_NONE, map, player, display, fov);
    }

    if (in_sight) {
        if (canseemon(mtmp, player, fov)) {
            await pline(`${monname} seems disoriented.`);
        } else {
            await pline(`${monname} suddenly disappears!`);
        }
        if (trap && !trap.tseen) {
            trap.tseen = 1;
            newsym(trap.tx, trap.ty);
        }
    }
}

// ============================================================================
// mlevel_tele_trap — cf. teleport.c:1998
// Monster level teleport trap. Returns 0 if still on level, 1 if moved.
// ============================================================================

export async function mlevel_tele_trap(mtmp, trap, force_it, in_sight, map, player) {
    const tt = trap ? trap.ttyp : NO_TRAP;
    if (!mtmp) return 0;
    if (mtmp === player?.ustuck) return 0;
    if (!teleport_pet(mtmp, force_it)) return 0;

    // C ref: teleport.c mlevel_tele_trap() -> migrate_to_level() -> Trap_Moved_Mon.
    // For gameplay parity, treat all level-changing trap variants as migration
    // off the current level.
    if (tt === MAGIC_PORTAL || tt === LEVEL_TELEP || tt === HOLE || tt === TRAPDOOR) {
        if (in_sight) {
            const action = (tt === HOLE)
                ? 'falls into a hole'
                : (tt === TRAPDOOR)
                    ? 'falls through a trap door'
                    : 'disappears out of sight';
            await pline('Suddenly, %s %s.', mon_nam(mtmp), action);
            // C ref: teleport.c:2082 — seetrap(trap) when in_sight
            if (trap && !trap.tseen) { trap.tseen = 1; newsym(trap.tx, trap.ty); }
        }
        const _omx = mtmp.mx, _omy = mtmp.my;
        if (map?.removeMonster) map.removeMonster(mtmp);
        mtmp.mx = 0;
        mtmp.my = 0;
        newsym(_omx, _omy);
        return 3; // Trap_Moved_Mon
    }

    // Remaining level-teleport cases are still simplified.
    return 0;
}

// ============================================================================
// rloco — cf. teleport.c:2094
// Scatter object randomly on level.
// ============================================================================

export function rloco(obj, map, player) {
    let tx, ty;
    let try_limit = 4000;

    if (!obj) return true;

    const otx = obj.ox;
    const oty = obj.oy;

    do {
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
        if (!--try_limit) break;
    } while (!goodpos(tx, ty, null, 0, map, player));

    // Move object
    obj.ox = tx;
    obj.oy = ty;
    newsym(otx, oty);
    newsym(tx, ty);
    return true;
}

// ============================================================================
// random_teleport_level — cf. teleport.c:2182
// Returns absolute depth for random level teleport.
// ============================================================================

// cf. teleport.c:2182 — random_teleport_level()
// Returns absolute depth for random level teleport.
export function random_teleport_level(cur_depth, game) {
    // cf. teleport.c:2187 — 1/5 chance of staying on same level
    if (!rn2(5)) return cur_depth;

    if (!game || !game.dungeon) return cur_depth;

    const dng = game.dungeon;
    const min_depth = dng.depth_start || 1;
    const max_depth_raw = (dng.num_dunlevs || 1) + min_depth - 1;
    let max_depth = max_depth_raw;
    let min_d = min_depth;

    // cf. teleport.c:2230 — range is 1 to current+3, current not counting
    let nlev = rn2(cur_depth + 3 - min_d) + min_d;
    if (nlev >= cur_depth) nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        // teleport up if already on bottom
        if (cur_depth >= max_depth)
            nlev -= rnd(3);
    }
    if (nlev < min_d) {
        nlev = min_d;
        if (nlev === cur_depth) {
            nlev += rnd(3);
            if (nlev > max_depth) nlev = max_depth;
        }
    }
    return nlev;
}

// ============================================================================
// Hero teleport helper: teleok — cf. teleport.c:414
// ============================================================================

// cf. teleport.c:380 — tele_jump_ok: check teleport region restrictions
function tele_jump_ok(x1, y1, x2, y2, map) {
    if (!isok(x2, y2)) return false;
    // Simplified: no restricted region tracking in JS yet
    // Full implementation would check dndest/updest bounded areas
    return true;
}

// cf. teleport.c:414 — teleok: is (x,y) a valid hero teleport destination?
function teleok(x, y, trapok, game) {
    const map = (game.lev || game.map);
    const player = (game.u || game.player);

    if (!trapok) {
        const trap = map.trapAt(x, y);
        if (!trap) {
            trapok = true;
        } else if (trap.ttyp === VIBRATING_SQUARE) {
            trapok = true;
        } else if ((is_pit(trap.ttyp) || is_hole(trap.ttyp))
                   && (player.levitating || player.flying)) {
            trapok = true;
        }
        if (!trapok) return false;
    }
    if (!goodpos(x, y, player, 0, map, player)) return false;
    if (!tele_jump_ok(player.x, player.y, x, y, map)) return false;
    return true;
}

// ============================================================================
// cf. teleport.c:442 — teleds(nx, ny, flags): move hero to new position
// ============================================================================

export async function teleds(nx, ny, flags, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);
    const is_teleport = (flags & TELEDS_TELEPORT) !== 0;

    const ux0 = player.x;
    const uy0 = player.y;

    // Clear trap state
    if (player.utrap) player.utrap = 0;

    // Move hero
    player.x = nx;
    player.y = ny;
    if (player.ux0 !== undefined) { player.ux0 = ux0; player.uy0 = uy0; }

    // C ref: teleds() — player position changed, mark FOV dirty for moveloop_core
    newsym(ux0, uy0);       // clear old position
    mark_vision_dirty();    // FOV recomputed at start of moveloop_core
    newsym(nx, ny);         // show '@' at new position

    if (is_teleport) {
        const same = (nx === ux0 && ny === uy0);
        await pline(`You materialize in ${same ? "the same" : "a different"} location!`);
        if (game) installTeleportArrivalMorePrompt(game, ux0, uy0);
    }
}

// ============================================================================
// cf. teleport.c:712 — safe_teleds(flags): find safe spot and teleport hero
// ============================================================================

export async function safe_teleds(flags, game) {
    const map = (game.lev || game.map);
    const player = (game.u || game.player);

    // cf. teleport.c:731 — try 40 random spots first (RNG must match C)
    for (let tcnt = 0; tcnt < 40; tcnt++) {
        const nux = rnd(COLNO - 1);
        const nuy = rn2(ROWNO);
        if (teleok(nux, nuy, false, game)) {
            await teleds(nux, nuy, flags, game);
            return true;
        }
    }

    // cf. teleport.c:742 — exhaustive search via collect_coords
    // Use the same ring-pair shuffled search as C
    const cc_flags = CC_RING_PAIRS | CC_SKIP_MONS
        | (player.passesWalls ? 0 : CC_SKIP_INACCS);
    const candy = collect_coords(player.x, player.y, 0, cc_flags, map, player);
    let backupX = 0, backupY = 0;

    for (let tcnt = 0; tcnt < candy.length; tcnt++) {
        const nux = candy[tcnt].x;
        const nuy = candy[tcnt].y;
        if (teleok(nux, nuy, false, game)) {
            await teleds(nux, nuy, flags, game);
            return true;
        }
        if (!backupX) {
            const trap = map.trapAt(nux, nuy);
            if (trap && teleok(nux, nuy, true, game)) {
                backupX = nux;
                backupY = nuy;
            }
        }
    }

    // Fall back to trap spot
    if (backupX) {
        await teleds(backupX, backupY, flags, game);
        return true;
    }
    return false;
}

// ============================================================================
// cf. teleport.c:837 — tele(): hero teleport via non-scroll method
// ============================================================================

// Autotranslated from teleport.c:836
export async function tele(game) {
  await scrolltele(0, game);
}

// ============================================================================
// cf. teleport.c:844 — scrolltele(scroll): hero teleport, possibly controlled
// ============================================================================

export async function scrolltele(scroll, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);

    // cf. teleport.c:849 — check no-teleport level
    if (noteleport_level(player, map)) {
        await pline("A mysterious force prevents you from teleporting!");
        return;
    }

    // cf. teleport.c:860 — Amulet of Yendor interference
    if (player.hasAmulet && !rn2(3)) {
        await pline("You feel disoriented for a moment.");
        return;
    }

    // cf. teleport.c:867 — controlled teleport (player chooses destination)
    const controlled = player.teleport_control
                    || (scroll && scroll.blessed)
                    || game.wizard;
    if (controlled) {
        await pline("Where do you want to be teleported?");
        const cc = { x: player.x, y: player.y };
        const display = game.display;
        const rc = await getpos_async(cc, true, "the desired position", {
            map, display, flags: game.flags, player
        });
        if (rc < 0) return; // cancelled

        // cf. teleport.c:893 — same spot: do nothing
        if (cc.x === player.x && cc.y === player.y) return;

        // cf. teleport.c:899 — check if destination is valid
        if (teleok(cc.x, cc.y, false, game)) {
            await teleds(cc.x, cc.y, TELEDS_TELEPORT, game);
        } else {
            await pline("Sorry...");
            await safe_teleds(TELEDS_TELEPORT, game);
        }
        return;
    }

    // cf. teleport.c:909 — random teleport
    await safe_teleds(TELEDS_TELEPORT, game);
}

// ============================================================================
// cf. teleport.c:1029 — dotele(break_the_rules): #teleport command
// ============================================================================

export async function dotele(break_the_rules, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);

    // cf. teleport.c:1036-1064 — check for teleport trap at current position
    let trap = map.trapAt(player.x, player.y);
    if (trap && !trap.tseen) trap = null;

    if (trap) {
        if (trap.ttyp === LEVEL_TELEP && trap.tseen) {
            // level teleport trap — trigger it
            await level_tele_trap(trap, FORCETRAP, game);
            return 1;
        } else if (trap.ttyp === TELEP_TRAP) {
            if (trap.once) {
                deltrap(map, trap);
                newsym(player.x, player.y);
            }
        } else {
            trap = null;
        }
    }

    if (!trap && !break_the_rules) {
        // cf. teleport.c:1069 — check Teleportation intrinsic
        if (!player.teleportation) {
            await pline("You don't know that spell.");
            return 0;
        }
    }

    // cf. teleport.c:1140-1157 — perform the teleport
    await tele(game);
    // cf. teleport.c:1128 — exercise WIS after spell-based teleport (not trap)
    if (!trap) {
        exercise(player, A_WIS, true);
    }
    return 1;
}

// ============================================================================
// cf. teleport.c:1160 — level_tele(): level teleportation
// ============================================================================

export async function level_tele(game) {
    const player = (game.u || game.player);

    // cf. teleport.c:1180 — Amulet/endgame prevention
    if (player.hasAmulet) {
        await pline("You feel very disoriented for a moment.");
        return;
    }

    // cf. teleport.c:2182 — get random level
    const cur_depth = player.depth || 1;
    const nlev = random_teleport_level(cur_depth, game);

    if (nlev === cur_depth) {
        await pline("You shudder for a moment.");
        return;
    }

    // Schedule level change
    // TODO: implement schedule_goto for actual level changes
    await pline(`You are teleported to level ${nlev}!`);
}

// ============================================================================
// cf. teleport.c:1439 — domagicportal(trap): magic portal handler
// ============================================================================

export async function domagicportal(trap, game) {
    // cf. teleport.c:1458
    await pline("You activated a magic portal!");

    // cf. teleport.c:1464 — endgame without amulet
    if (game && (game.u || game.player) && (game.u || game.player).inEndgame && !(game.u || game.player).hasAmulet) {
        await pline("You feel dizzy for a moment, but nothing happens...");
        return;
    }

    // TODO: implement schedule_goto for portal destination
}

// ============================================================================
// cf. teleport.c:1487 — tele_trap(trap): hero teleport trap activation
// ============================================================================

let in_tele_trap = false;

export async function tele_trap(trap, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);

    // cf. teleport.c:1493 — prevent recursive activation
    if (in_tele_trap) return;
    in_tele_trap = true;

    try {
        // cf. teleport.c:1497 — endgame or antimagic resistance
        if (hasAntimagic(player)) {
            await pline("You feel a wrenching sensation.");
            return;
        }

        // cf. teleport.c:1503 — vault teleport (one-use trap)
        if (trap.once) {
            deltrap(map, trap);
            newsym(player.x, player.y);
            // vault_tele — falls through to tele()
            await tele(game);
            return;
        }

        // cf. teleport.c:1507 — fixed-destination teleport
        const tx = Number.isInteger(trap?.teledest_x) ? trap.teledest_x
            : (Number.isInteger(trap?.teledest?.x) ? trap.teledest.x : -1);
        const ty = Number.isInteger(trap?.teledest_y) ? trap.teledest_y
            : (Number.isInteger(trap?.teledest?.y) ? trap.teledest.y : -1);
        if (isok(tx, ty)) {
            const mtmp = map.monsterAt(tx, ty);
            if (mtmp) {
                const dest = {x: 0, y: 0};
                if (enexto(dest, mtmp.mx, mtmp.my, mtmp.data, map, player)) {
                    await rloc_to(mtmp, dest.x, dest.y, map, player);
                }
            }
            if (!map.monsterAt(tx, ty)) {
                await teleds(tx, ty, TELEDS_TELEPORT, game);
            }
            return;
        }

        // cf. teleport.c:1527 — random teleport
        await tele(game);
    } finally {
        in_tele_trap = false;
    }
}

// ============================================================================
// cf. teleport.c:1533 — level_tele_trap(trap, trflags): level teleport trap
// ============================================================================

export async function level_tele_trap(trap, trflags, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);
    const intentional = (trflags & (FORCETRAP | VIASITTING)) !== 0;

    await pline("You step onto a level teleport trap!");

    // cf. teleport.c:1545 — antimagic resistance
    if (hasAntimagic(player) && !intentional) {
        await pline("You feel a wrenching sensation.");
        return;
    }

    // cf. teleport.c:1552 — remove trap and perform level teleport
    deltrap(map, trap);
    newsym(player.x, player.y);
    await level_tele(game);
}

// ============================================================================
// cf. teleport.c:914 — dotelecmd(): the #teleport command (wizard mode)
// ============================================================================

export async function dotelecmd(game) {
    return await dotele(false, game) ? 1 : 0;
}

// ============================================================================
// cf. teleport.c:781 — teleport_pet(mtmp, force): check if pet can teleport
// ============================================================================

export function teleport_pet(mtmp, force) {
    // cf. teleport.c:788 — can't teleport steed
    if (mtmp.isSteed) return false;

    // cf. teleport.c:788 — leashed pet
    if (mtmp.mleashed) {
        if (!force) return false;
        mtmp.mleashed = false;
        return true;
    }
    return true;
}

// teleport.c:809 — teleport hero near a random pet (if valid and not adjacent).
export async function tele_to_rnd_pet(game) {
    const map = game?.lev || game?.map;
    const player = game?.u || game?.player;
    if (!map || !player) return false;
    if (noteleport_level(player, map)) return false;

    let pet = null;
    let cnt = 0;
    for (const mtmp of (map.monsters || [])) {
        if (!mtmp || mtmp.dead) continue;
        const tame = Number(mtmp.mtame || 0) > 0 || !!mtmp.tame;
        if (!tame) continue;
        if (!isok(mtmp.mx, mtmp.my)) continue;
        cnt++;
        if (!rn2(cnt)) pet = mtmp;
    }
    if (!pet) return false;

    const adjacent = Math.abs((pet.mx || 0) - player.x) <= 1
        && Math.abs((pet.my || 0) - player.y) <= 1;
    if (adjacent) return false;

    const tx = pet.mx + rn2(3) - 1;
    const ty = pet.my + rn2(3) - 1;
    if (!isok(tx, ty) || !teleok(tx, ty, false, game)) return false;
    await teleds(tx, ty, TELEDS_TELEPORT, game);
    return true;
}

// Autotranslated from teleport.c:20
export function m_blocks_teleporting(mtmp) {
  if (is_dlord(mtmp.data) || is_dprince(mtmp.data)) return true;
  return false;
}

// Autotranslated from teleport.c:200
export function enexto_gpflags(cc, xx, yy, mdat, entflags, map, player) {
  return (enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY | entflags, map, player) || enexto_core(cc, xx, yy, mdat, entflags, map, player));
}

// Autotranslated from teleport.c:767
export async function vault_tele(map, player, game) {
  const croom = search_special(map, VAULT);
  if (croom) {
    const c = somexyspace(map, croom);
    if (c && teleok(c.x, c.y, false)) { await teleds(c.x, c.y, TELEDS_TELEPORT, game); return; }
  }
  await tele();
}

// Autotranslated from teleport.c:1780
export function stairway_find_forwiz(isladder, up, map) {
  let stway = gs.stairs;
  while (stway && !(stway.isladder === isladder && stway.up === up && stway.tolev.dnum === map.uz.dnum)) {
    stway = stway.next;
  }
  return stway;
}

// Autotranslated from teleport.c:1931
export async function mvault_tele(mtmp, map, player) {
  const croom = search_special(map, VAULT);
  if (croom) {
    const c = somexyspace(map, croom);
    if (c && goodpos(c.x, c.y, mtmp, 0, map, player)) { await rloc_to(mtmp, c.x, c.y, map, player); return; }
  }
  await rloc(mtmp, RLOC_NONE, map, player);
}
