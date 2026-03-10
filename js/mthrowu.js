// mthrowu.js -- Monster ranged attacks (throwing)
// C ref: mthrowu.c — thrwmu(), m_throw(), monshoot(), select_rwep(), lined_up()
// Also includes weapon wield helpers used before ranged/melee attacks.
//
// INCOMPLETE / MISSING vs C mthrowu.c:
// - m_throw: no ohitmon() full damage calculation (erosion, material bonuses)
// - m_throw: corpse creation uses corpse_chance + mkcorpstat (faithful to C mondied)
// - thrwmu: polearm attack path not implemented (C:1169)
// - monmulti: prince/lord/mplayer multishot bonuses not modeled
// - No buzzmu (spell ray) implementation

import { ACCESSIBLE, IS_OBSTRUCTED, IS_DOOR,
         D_CLOSED, D_LOCKED, IRONBARS, SINK, isok, A_STR, BOLT_LIM,
         MIGR_NOWHERE, MIGR_RANDOM, MIGR_STAIRS_UP, MIGR_LADDER_UP, MIGR_SSTAIRS,
         is_hole } from './const.js';
import { rn2, rnd } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { newexplevel } from './exper.js';
import {
    BOULDER, WEAPON_CLASS, CORPSE, objectData, POTION_CLASS, VENOM_CLASS,
    BLINDING_VENOM, ACID_VENOM, ELVEN_ARROW, ELVEN_BOW, ORCISH_ARROW, ORCISH_BOW,
    CROSSBOW_BOLT, CROSSBOW, CREAM_PIE, EGG, WAN_STRIKING,
    AKLYS,
    PARTISAN, RANSEUR, SPETUM, GLAIVE, HALBERD, BARDICHE, VOULGE,
    FAUCHARD, GUISARME, BILL_GUISARME, GEM_CLASS, FIRST_GLASS_GEM, LAST_GLASS_GEM,
    ARMOR_CLASS, TOOL_CLASS, ROCK_CLASS, FOOD_CLASS, SPBOOK_CLASS, WAND_CLASS,
    BALL_CLASS, CHAIN_CLASS, COIN_CLASS, SKELETON_KEY, LOCK_PICK, CREDIT_CARD,
    TALLOW_CANDLE, WAX_CANDLE, LENSES, TIN_WHISTLE, MAGIC_WHISTLE, STATUE,
    MEAT_STICK, ENORMOUS_MEATBALL,
} from './objects.js';
import { doname, xname, mkcorpstat, mksobj, add_to_minv } from './mkobj.js';
import { couldsee, m_cansee } from './vision.js';
import {
    x_monnam, Monnam, is_prince, is_lord, is_mplayer, is_elf, is_orc, is_gnome,
    throws_rocks, is_unicorn,
} from './mondata.js';
import {
    mons, AT_WEAP, G_NOCORPSE, AD_ACID, AD_BLND, AD_DRST,
    AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE, AD_DISN, AD_ELEC, MZ_TINY, MZ_HUMAN, MZ_LARGE,
} from './monsters.js';
import { distmin, dist2 } from './hacklib.js';
import { mondead, corpse_chance } from './mon.js';
import { flush_screen, canSeeMonsterForMap } from './display.js';
import { placeFloorObject } from './invent.js';
import { select_rwep as weapon_select_rwep,
    mon_wield_item, dmgval } from './weapon.js';
import { NEED_WEAPON, NEED_HTH_WEAPON, NEED_RANGED_WEAPON, P_BOW } from './const.js';
import { ammo_and_launcher, multishot_class_bonus } from './dothrow.js';
import { breaks, harmless_missile } from './dothrow.js';
import { should_mulch_missile } from './dothrow.js';
import { breaktest } from './dothrow.js';
import { find_mac } from './worn.js';
import { more, nhgetch_raw } from './input.js';
import {
    buzz, ZT_BREATH, ZT_MAGIC_MISSILE, ZT_FIRE, ZT_COLD, ZT_SLEEP,
    ZT_DEATH, ZT_LIGHTNING, ZT_POISON_GAS, ZT_ACID,
} from './zap.js';
import {
    tmp_at, tmp_at_end_async, nh_delay_output,
} from './animation.js';
import { DISP_FLASH, DISP_TETHER, DISP_END, BACKTRACK } from './const.js';
import { flooreffects } from './do.js';
import { stairway_at } from './stairs.js';
import { t_at } from './trap.js';
import { envFlag, getEnv, writeStderr } from './runtime_env.js';

const hallublasts = [
    'bubbles', 'butterflies', 'dust specks', 'flowers', 'glitter',
    'hot air', 'lightning', 'music', 'rainbows', 'stars',
];

// C ref: include/display.h GLYPH_OBJ_OFF/obj_to_glyph().
// For thrown objects we need canonical numeric glyph IDs so tmp_at_* event
// payloads match C harness logs.
function objectTmpGlyph(otmp) {
    const otyp = Number.isInteger(otmp?.otyp) ? otmp.otyp : 0;
    const NUMMONS = Array.isArray(mons) ? mons.length : 0;
    const GLYPH_OBJ_OFF = (9 * NUMMONS) + 1;
    return GLYPH_OBJ_OFF + otyp;
}

function shouldThrowTrace(map) {
    if (!envFlag('WEBHACK_THROW_TRACE')) return false;
    const raw = getEnv('WEBHACK_THROW_TRACE_STEP', '');
    if (!raw) return true;
    const want = Number.parseInt(raw, 10);
    if (!Number.isInteger(want) || want <= 0) return true;
    const step = (Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex : -1) + 1;
    return step === want;
}

function throwTrace(map, display, label, extra = '') {
    if (!shouldThrowTrace(map)) return;
    const step = (Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex : -1) + 1;
    const lines = (display && typeof display.getScreenLines === 'function')
        ? (display.getScreenLines() || [])
        : [];
    const top = String(lines[0] || '');
    const row3 = String(lines[3] || '');
    const topMsg = String(display?.topMessage || '');
    writeStderr(
        `[MTHROW step=${step}] ${label}`
        + ` top=${JSON.stringify(top)}`
        + ` topMsg=${JSON.stringify(topMsg)}`
        + ` r3=${JSON.stringify(row3)}`
        + (extra ? ` ${extra}` : '')
        + '\n'
    );
}

async function down_gate_for_throw(x, y, map, player) {
    const stway = await stairway_at(x, y, map);
    if (stway && !stway.up && !stway.isladder) {
        return (stway.tolev && stway.tolev.dnum === (player?.uz ? player.uz.dnum : 0))
            ? MIGR_STAIRS_UP : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        return MIGR_LADDER_UP;
    }
    const trap = t_at(x, y, map);
    if (trap && trap.tseen && is_hole(trap.ttyp)) {
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}

/* Return a random hallucinatory blast.
 * C ref: mthrowu.c rnd_hallublast().
 */
export function rnd_hallublast() {
    return hallublasts[rn2(hallublasts.length)];
}

// C ref: mthrowu.c blocking_terrain().
export function blocking_terrain(map, x, y) {
    if (!isok(x, y)) return true;
    const loc = map.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ)) return true;
    if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

// check if a monster is carrying an item of a particular type.
// C ref: mthrowu.c m_carrying().
export function m_carrying(mon, type) {
    if (!mon || !Array.isArray(mon.minvent)) return null;
    return mon.minvent.find((obj) => obj && obj.otyp === type) || null;
}

// C ref: mthrowu.c m_has_launcher_and_ammo().
export function m_has_launcher_and_ammo(mon) {
    if (!mon || !mon.weapon || !Array.isArray(mon.minvent)) return false;
    const launcher = mon.weapon;
    for (const obj of mon.minvent) {
        if (obj && ammo_and_launcher(obj, launcher)) return true;
    }
    return false;
}

// C ref: mthrowu.c linedup().
export function linedup(ax, ay, bx, by, boulderhandling = 0, map, player, fov = null) {
    const tbx = ax - bx;
    const tby = ay - by;
    if (!tbx && !tby) return false;

    if (!(!tbx || !tby || Math.abs(tbx) === Math.abs(tby))) return false;
    if (distmin(tbx, tby, 0, 0) >= BOLT_LIM) return false;

    // C ref: if target is hero square, use couldsee(mon_pos), otherwise clear_path().
    const inSight = (ax === player.x && ay === player.y)
        // C ref: linedup() uses couldsee(bx, by) for hero target.
        // Use current FOV COULD_SEE bitmap when available.
        ? ((fov && typeof fov.couldSee === 'function')
            ? fov.couldSee(bx, by)
            : couldsee(map, player, bx, by))
        // C ref: linedup() uses clear_path(ax, ay, bx, by) for non-hero target.
        : m_cansee({ mx: ax, my: ay }, map, bx, by);
    if (inSight) return true;
    if (boulderhandling === 0) return false;

    const dx = Math.sign(ax - bx);
    const dy = Math.sign(ay - by);
    let cx = bx;
    let cy = by;
    let boulderspots = 0;
    do {
        cx += dx;
        cy += dy;
        if (blocking_terrain(map, cx, cy)) return false;
        const objs = map.objectsAt?.(cx, cy) || [];
        if (objs.some((o) => o && !o.buried && o.otyp === BOULDER)) boulderspots++;
    } while (cx !== ax || cy !== ay);
    if (boulderhandling === 1) return true;
    const denom = 2 + boulderspots;
    return rn2(denom) < 2;
}

// C ref: mthrowu.c linedup_callback().
export function linedup_callback(ax, ay, bx, by, fnc, map) {
    const tbx = ax - bx;
    const tby = ay - by;
    if (!tbx && !tby) return false;
    if (!(!tbx || !tby || Math.abs(tbx) === Math.abs(tby))) return false;
    if (distmin(tbx, tby, 0, 0) >= BOLT_LIM) return false;
    const dx = Math.sign(ax - bx);
    const dy = Math.sign(ay - by);
    let cx = bx;
    let cy = by;
    do {
        cx += dx;
        cy += dy;
        if (blocking_terrain(map, cx, cy)) return false;
        if (fnc?.(cx, cy)) return true;
    } while (cx !== ax || cy !== ay);
    return false;
}

// C ref: mthrowu.c m_lined_up().
export function m_lined_up(mtarg, mtmp, map, player, fov = null) {
    const utarget = !!(mtarg && player && mtarg === player);
    const tx = utarget ? (Number.isInteger(mtmp?.mux) ? mtmp.mux : player.x) : mtarg?.mx;
    const ty = utarget ? (Number.isInteger(mtmp?.muy) ? mtmp.muy : player.y) : mtarg?.my;
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) return 0;
    if (utarget && (player?.uundetected || player?.disguised)) return 0;
    const ignoreBoulders = utarget && !!(m_carrying(mtmp, WAN_STRIKING)
        || throws_rocks(mtmp?.type || {}));
    return linedup(tx, ty, mtmp.mx, mtmp.my, utarget ? (ignoreBoulders ? 1 : 2) : 0, map, player, fov) ? 1 : 0;
}

// C ref: mthrowu.c lined_up().
export function lined_up(mtmp, map, player, fov = null) {
    return m_lined_up(player, mtmp, map, player, fov) !== 0;
}

// Backward-compatible helper name used by existing JS modules.
export function linedUpToPlayer(mon, map, player, fov = null) {
    return lined_up(mon, map, player, fov);
}

// C ref: weapon.c select_rwep() — full implementation in weapon.js
// Returns { weapon, propellor } or null. Extract .weapon for the missile.
function select_rwep(mon) {
    const result = weapon_select_rwep(mon);
    return result ? result.weapon : null;
}

const POLEARM_TYPES = new Set([
    PARTISAN, RANSEUR, SPETUM, GLAIVE, HALBERD,
    BARDICHE, VOULGE, FAUCHARD, GUISARME, BILL_GUISARME,
]);

function is_polearm(obj) {
    return !!(obj && POLEARM_TYPES.has(obj.otyp));
}

// C ref: mthrowu.c m_useupall().
export function m_useupall(mon, obj) {
    if (!mon || !obj) return;
    const inv = mon.minvent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    if (mon.weapon === obj) mon.weapon = null;
}

// C ref: mthrowu.c m_useup().
export function m_useup(mon, obj) {
    if (!mon || !obj) return;
    const qty = Number.isInteger(obj.quan) ? obj.quan : 1;
    if (qty > 1) {
        obj.quan = qty - 1;
        return;
    }
    m_useupall(mon, obj);
}

// C ref: mthrowu.c monmulti() — compute multishot count.
// Consumes rnd(multishot) when multishot > 0 and quan > 1.
export function monmulti(mon, otmp) {
    let multishot = 1;
    const quan = Number.isInteger(otmp?.quan) ? otmp.quan : 1;
    const mwep = mon?.weapon || null;
    const od = objectData[otmp.otyp];
    const launcherOk = ammo_and_launcher(otmp, mwep);
    const stackableWeapon = od && od.oc_class === WEAPON_CLASS;
    if (quan > 1 && (launcherOk || stackableWeapon) && !mon.mconf) {
        const ptr = mon?.type || {};
        if (is_prince(ptr)) multishot += 2;
        else if (is_lord(ptr) || is_mplayer(ptr)) multishot += 1;
        if (otmp.otyp === ELVEN_ARROW && !otmp.cursed) multishot += 1;
        if (mwep && mwep.otyp === ELVEN_BOW && otmp.otyp === ELVEN_ARROW && !mwep.cursed) multishot += 1;
        if (mwep && ammo_and_launcher(otmp, mwep) && (mwep.spe || 0) > 1) multishot += Math.floor(((mwep.spe || 0) + 1) / 3);
        multishot += multishot_class_bonus(mon?.mndx ?? -1, otmp, mwep);
        if ((is_elf(ptr) && otmp.otyp === ELVEN_ARROW && mwep?.otyp === ELVEN_BOW)
            || (is_orc(ptr) && otmp.otyp === ORCISH_ARROW && mwep?.otyp === ORCISH_BOW)
            || (is_gnome(ptr) && otmp.otyp === CROSSBOW_BOLT && mwep?.otyp === CROSSBOW)) {
            multishot += 1;
        }
        multishot = rnd(multishot);
    }
    if (multishot > quan) multishot = quan;
    if (multishot < 1) multishot = 1;
    return multishot;
}

function thrownObjectName(obj, player) {
    if (!obj) return 'a weapon';
    const oneShot = { ...obj, quan: 1, dknown: true };
    return doname(oneShot, player);
}

function stairFallMessage(obj, player, toloc) {
    const base = thrownObjectName(obj, player).replace(/^(a|an)\s+/i, '');
    if (toloc === MIGR_LADDER_UP) return `The ${base} falls down the ladder.`;
    if (toloc === MIGR_STAIRS_UP || toloc === MIGR_SSTAIRS) {
        return `The ${base} falls down the stairs.`;
    }
    return '';
}

// C ref: zap.c exclam(force)
function exclam(force) {
    if (force < 0) return '?';
    if (force <= 4) return '.';
    return '!';
}

// C ref: pline.c vpline() + win/tty/topl.c update_topl()/more().
// If a pending topline message cannot concatenate with the next message,
// tty blocks at "--More--" before showing that next message.
async function maybeFlushToplineBeforeMessage(display, msg, game) {
    if (!display || typeof display.morePrompt !== 'function') return;
    const prior = String(display.topMessage || '');
    if (!prior || !display.messageNeedsMore) return;
    if (String(msg || '').startsWith('You die')) return;
    const cols = Number.isInteger(display.cols) ? display.cols : 80;
    const combined = `${prior}  ${String(msg || '')}`;
    if (combined.length + 9 < cols) return;
    await more(display, { game,
        site: 'mthrowu.maybeFlushToplineBeforeMessage.morePrompt',
    });
    if (Object.hasOwn(display, 'noConcatenateMessages')) {
        display.noConcatenateMessages = true;
        if (game) game._tempNoConcatMessages = true;
    }
}

// hero is hit by a thrown object.
// C ref: mthrowu.c thitu().
export async function thitu(tlev, dam, objp, name, player, display, game, mon = null) {
    const obj = objp || null;
    const dieRoll = rnd(20);
    if ((player.ac || 10) + tlev <= dieRoll) {
        if (display) {
            const verbose = game?.flags?.verbose !== false;
            let msg;
            if (player.blind || !verbose) {
                msg = 'It misses.';
            } else if ((player.ac || 10) + tlev <= dieRoll - 2) {
                const objName = name || thrownObjectName(obj, player);
                const cap = objName.charAt(0).toUpperCase() + objName.slice(1);
                msg = `${cap} misses you.`;
            } else {
                msg = `You are almost hit by ${name || thrownObjectName(obj, player)}.`;
            }
            throwTrace(game?.map || null, display, 'thitu:miss:before_putstr', `msg=${JSON.stringify(msg)}`);
            await maybeFlushToplineBeforeMessage(display, msg, game);
            await display.putstr_message(msg);
            throwTrace(game?.map || null, display, 'thitu:miss:after_putstr', `msg=${JSON.stringify(msg)}`);
        }
        return 0;
    }

    if (display) {
        const text = name || thrownObjectName(obj, player);
        const punct = exclam(Number.isFinite(dam) ? dam : 0);
        const msg = `You are hit by ${text}${punct}`;
        throwTrace(game?.map || null, display, 'thitu:hit:before_putstr', `msg=${JSON.stringify(msg)}`);
        await maybeFlushToplineBeforeMessage(display, msg, game);
        await display.putstr_message(msg);
        throwTrace(game?.map || null, display, 'thitu:hit:after_putstr', `msg=${JSON.stringify(msg)}`);
    }
    if (player.takeDamage) player.takeDamage(dam, mon ? x_monnam(mon) : 'an object');
    else player.uhp -= dam;
    await exercise(player, A_STR, false);
    return 1;
}

// C ref: mthrowu.c drop_throw().
export async function drop_throw(obj, ohit, x, y, map, player, game) {
    if (!obj || !map) return true;
    let broken;
    if (obj.otyp === CREAM_PIE || obj.oclass === VENOM_CLASS
        || (ohit && obj.otyp === EGG)) {
        broken = true;
    } else {
        broken = !!(ohit && should_mulch_missile(obj, true));
    }
    if (broken) return true;
    if (!isok(x, y)) return true;
    const spot = map.at(x, y);
    if (!spot || !ACCESSIBLE(spot.typ)) return true;
    const toloc = await down_gate_for_throw(x, y, map, player);
    if (toloc !== MIGR_NOWHERE) {
        // C ref: dokick.c ship_object() nodrop gate for non-ladder routes.
        const nodrop = (obj === player?.uball) || (obj === player?.uchain)
            || (toloc !== MIGR_LADDER_UP && rn2(3));
        if (!nodrop) {
            // C ref: dokick.c ship_object() runs breaktest() before migration.
            // This preserves obj_resists() RNG even when object leaves the level.
            breaktest(obj);
            const msg = stairFallMessage(obj, player, toloc);
            if (msg && game?.display && couldsee(map, player, x, y)) {
                await game.display.putstr_message(msg);
            }
            return true;
        }
    }
    if (await flooreffects(obj, x, y, 'fall', player, map)) {
        return true;
    }
    obj.ox = x;
    obj.oy = y;
    placeFloorObject(map, obj);
    return false;
}

// C ref: mthrowu.c hit_bars().
export async function hit_bars(objp, objx, objy, barsx, barsy, breakflags = 0, map, player, game) {
    const obj = objp || null;
    if (!obj) return;
    // C-style: breakable items may shatter on bars.
    const broken = await breaks(obj, objx, objy, null, map);
    if (broken) return;
    // Survived impact: drop at the impact cell.
    if (map && isok(objx, objy))
        await drop_throw(obj, false, objx, objy, map, player, game);
}

// C ref: mthrowu.c hits_bars().
export async function hits_bars(objp, x, y, barsx, barsy, always_hit = 0, whodidit = -1, map = null, player = null, game = null) {
    const obj = objp || null;
    if (!obj) return true;
    let hits = !!always_hit;
    if (!hits) {
        switch (obj.oclass) {
        case WEAPON_CLASS: {
            const skill = objectData[obj.otyp]?.oc_subtyp || 0;
            // Most missiles pass through; bigger melee weapons hit.
            hits = !(skill === -20 /* bow ammo skill */
                || skill === -22 /* crossbow ammo skill */
                || skill === -23 /* dart */
                || skill === -24 /* shuriken */
                || skill === 17 /* spear */
                || skill === 1 /* dagger-ish */);
            break;
        }
        case ARMOR_CLASS:
            hits = (objectData[obj.otyp]?.armcat !== 3); // gloves pass through
            break;
        case TOOL_CLASS:
            hits = ![SKELETON_KEY, LOCK_PICK, CREDIT_CARD, TALLOW_CANDLE,
                WAX_CANDLE, LENSES, TIN_WHISTLE, MAGIC_WHISTLE].includes(obj.otyp);
            break;
        case ROCK_CLASS:
            hits = (obj.otyp !== STATUE || ((mons[obj.corpsenm || 0]?.msize || 0) > MZ_TINY));
            break;
        case FOOD_CLASS:
            if (obj.otyp === CORPSE) hits = ((mons[obj.corpsenm || 0]?.msize || 0) > MZ_TINY);
            else hits = (obj.otyp === MEAT_STICK || obj.otyp === ENORMOUS_MEATBALL);
            break;
        case SPBOOK_CLASS:
        case WAND_CLASS:
        case BALL_CLASS:
        case CHAIN_CLASS:
            hits = true;
            break;
        default:
            hits = false;
            break;
        }
    }
    if (hits && whodidit !== -1) {
        await hit_bars(obj, x, y, barsx, barsy, 0, map, player, game);
    }
    return hits;
}

// C ref: mthrowu.c ohitmon().
export async function ohitmon(mtmp, otmp, range, verbose, map, player, display, game) {
    if (!mtmp || !otmp) return { stop: true, deathMessage: null };
    const od = objectData[otmp.otyp] || {};
    const hitThreshold = 5 + find_mac(mtmp);
    const dieRoll = rnd(20);
    if (hitThreshold >= dieRoll) {
        let deathMessage = null;
        let damage = 0;
        if (otmp.oclass === WEAPON_CLASS || otmp.oclass === GEM_CLASS) {
            damage = dmgval(otmp, mtmp);
        } else if ((od.oc_wsdam || 0) > 0) {
            damage = rnd(od.oc_wsdam || 0);
        }
        damage += (otmp.spe || 0);
        if (damage < 1) damage = 1;
        // C ref: mthrowu.c ohitmon() — pline("The %s hits %s%s", xname, mon_nam, exclam)
        if (verbose && display && !player?.blind && couldsee(map, player, mtmp.mx, mtmp.my)) {
            const msg = `The ${xname({ ...otmp, dknown: true })} hits ${x_monnam(mtmp, { article: 'none' })}${exclam(damage)}`;
            await maybeFlushToplineBeforeMessage(display, msg, game);
            await display.putstr_message(msg);
        }
        mtmp.mhp -= damage;
        if (mtmp.mhp <= 0) {
            if (verbose && display && !player?.blind && couldsee(map, player, mtmp.mx, mtmp.my)) {
                deathMessage = `${Monnam(mtmp)} is killed!`;
            }
            mondead(mtmp, map);
            map.removeMonster?.(mtmp);
            if (player) {
                const exp = ((mtmp.mlevel || 0) + 1) * ((mtmp.mlevel || 0) + 1);
                player.exp = (player.exp || 0) + exp;
                player.score = (player.score || 0) + exp;
                await newexplevel(player, display);
            }
            const mdat2 = mons[mtmp.mndx || 0] || {};
            if (corpse_chance(mtmp) && !(((mdat2.geno || 0) & G_NOCORPSE) !== 0)) {
                const corpse = mkcorpstat(CORPSE, mtmp.mndx || 0, true, mtmp.mx, mtmp.my, map);
                if (corpse) corpse.age = (player?.turns || 0) + 1;
            }
        }
        await drop_throw(otmp, true, mtmp.mx, mtmp.my, map, player, game);
        return { stop: true, deathMessage };
    }
    if (range <= 0) {
        await drop_throw(otmp, false, mtmp.mx, mtmp.my, map, player, game);
        return { stop: true, deathMessage: null };
    }
    return { stop: false, deathMessage: null };
}

// C ref: mthrowu.c monshoot() — common multishot throw/shoot logic.
export async function monshoot(mon, otmp, mwep, map, player, display, game, mtarg = null) {
    if (!mon || !otmp) return false;
    const tx = mtarg ? mtarg.mx : (Number.isInteger(mon.mux) ? mon.mux : player.x);
    const ty = mtarg ? mtarg.my : (Number.isInteger(mon.muy) ? mon.muy : player.y);
    const dm = distmin(mon.mx, mon.my, tx, ty);
    const multishot = monmulti(mon, otmp);
    const available = Number.isInteger(otmp.quan) ? otmp.quan : 1;
    const shots = Math.max(1, Math.min(multishot, available));
    const tethered_weapon = !!(mwep && otmp?.otyp === AKLYS && mwep.otyp === AKLYS);
    let hitPlayer = false;
    let promptedForTopline = false;

    if (display && canSeeMonsterForMap(mon, map, player, game?.fov)) {
        const targetName = mtarg ? ` at the ${x_monnam(mtarg)}` : '';
        throwTrace(map, display, 'monshoot:before_throws_msg');
        await display.putstr_message(`The ${x_monnam(mon)} throws ${thrownObjectName(otmp, player)}${targetName}!`);
        throwTrace(map, display, 'monshoot:after_throws_msg');
    }

    const ddx = Math.sign(tx - mon.mx);
    const ddy = Math.sign(ty - mon.my);
    for (let i = 0; i < shots; i++) {
        throwTrace(map, display, 'monshoot:loop:before_m_throw_timed', `shot=${i + 1}/${shots}`);
        const projectile = { ...otmp, quan: 1, ox: mon.mx, oy: mon.my, invlet: null };
        m_useup(mon, otmp);
        const result = await m_throw_timed(
            mon, mon.mx, mon.my, ddx, ddy, dm, projectile, map, player, display, game,
            { tethered_weapon }
        );
        throwTrace(map, display, 'monshoot:loop:after_m_throw_timed', `shot=${i + 1}/${shots}`);
        if (result?.hitPlayer) hitPlayer = true;
        if (result?.promptedForTopline) promptedForTopline = true;
        if (tethered_weapon && result?.returnFlight) {
            return_from_mtoss(mon, projectile, true, map);
            if (mon.dead) break;
            continue;
        }
        if (result?.drop && isok(result.x, result.y)) {
            const spot = map.at(result.x, result.y);
            if (spot && ACCESSIBLE(spot.typ)) {
                projectile.ox = result.x;
                projectile.oy = result.y;
                placeFloorObject(map, projectile);
                if (game?.docrt) {
                    game.docrt();
                }
            }
        }
        if (mon.dead) break;
    }
    // C ref: monshoot() does not unconditionally force an extra topline
    // acknowledgement here; `putstr_message()`/`thitu()` already handle
    // required --More-- pauses while messages are emitted.
    return true;
}

export async function m_throw_timed(
    mon, startX, startY, dx, dy, range, weapon, map, player, display, game,
    options = {}
) {
    const tethered_weapon = !!options.tethered_weapon;
    let hitPlayer = false;
    let dropHandledInImpact = false;
    let promptedForTopline = false;
    let x = startX;
    let y = startY;
    let dropX = startX;
    let dropY = startY;

    if ((weapon.cursed || weapon.greased) && (dx || dy) && !rn2(7)) {
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        if (!dx && !dy) {
            return { drop: true, x: startX, y: startY };
        }
    }

    function flightBlocked(bx, by, pre, forcehit) {
        const nx = bx + dx, ny = by + dy;
        if (!isok(nx, ny)) return true;
        const nloc = map.at(nx, ny);
        if (!nloc) return true;
        if (IS_OBSTRUCTED(nloc.typ)) return true;
        if (IS_DOOR(nloc.typ) && (nloc.flags & (D_CLOSED | D_LOCKED))) return true;
        if (nloc.typ === IRONBARS && forcehit) return true;
        if (!pre) {
            const cloc = map.at(bx, by);
            if (cloc && cloc.typ === SINK) return true;
        }
        return false;
    }

    if (flightBlocked(startX, startY, true, 0)) {
        return { drop: true, x: startX, y: startY };
    }

    const projGlyph = objectTmpGlyph(weapon);
    tmp_at(tethered_weapon ? DISP_TETHER : DISP_FLASH, projGlyph);
    throwTrace(map, display, 'm_throw:tmp_at:start', `projGlyph=${projGlyph}`);
    while (range-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y)) break;
        const loc = map.at(x, y);
        if (!loc) break;
        if (ACCESSIBLE(loc.typ)) {
            dropX = x;
            dropY = y;
        }

        const mtmp = map.monsterAt(x, y);
        if (mtmp && !mtmp.dead) {
            const impact = await ohitmon(mtmp, weapon, range, true, map, player, display, game);
            if (impact.stop) {
                if (display
                    && typeof display.morePrompt === 'function'
                    && (display.topMessage || '').includes('  ')) {
                    await more(display, { game,
                        site: 'mthrowu.m_throw.impact.morePrompt',
                    });
                    if (Object.hasOwn(display, 'noConcatenateMessages')) {
                        display.noConcatenateMessages = true;
                        if (game) game._tempNoConcatMessages = true;
                    }
                    promptedForTopline = true;
                }
                if (impact.deathMessage && display) {
                    await display.putstr_message(impact.deathMessage);
                }
                // ohitmon() already performs drop_throw() when projectile stops.
                dropHandledInImpact = true;
                break;
            }
        }

        if (x === player.x && y === player.y) {
            if (weapon?.oclass === GEM_CLASS && await ucatchgem(weapon, mon, player, map, display)) {
                break;
            }
            let hitv;
            let dam;
            switch (weapon?.otyp) {
            case EGG:
            case CREAM_PIE:
            case BLINDING_VENOM:
                hitv = 8;
                dam = 0;
                break;
            default: {
                dam = dmgval(weapon, { type: player?.data || {} });
                hitv = 3 - distmin(player.x, player.y, mon.mx, mon.my);
                if (hitv < -4) hitv = -4;
                if (is_elf(mon?.type || {})
                    && (objectData[weapon.otyp]?.oc_subtyp === -P_BOW)) {
                    hitv += 1;
                    if (mon.weapon?.otyp === ELVEN_BOW) hitv += 1;
                    if (weapon.otyp === ELVEN_ARROW) dam += 1;
                }
                const heroSize = player?.data?.msize ?? MZ_HUMAN;
                if (heroSize >= MZ_LARGE) hitv += 1;
                hitv += 8 + (weapon.spe || 0);
                if (dam < 1) dam = 1;
                break;
            }
            }
            const hitu = await thitu(hitv, dam, weapon, null, player, display, game, mon);
            if (game) {
                if (typeof game.stop_occupation === 'function') await game.stop_occupation();
                else if (typeof game.stopOccupation === 'function') await game.stopOccupation();
                else if (game.occupation || Number.isInteger(game.multi)) {
                    game.occupation = null;
                    game.multi = 0;
                }
            }
            if (hitu) {
                if (!tethered_weapon) {
                    await drop_throw(weapon, true, player.x, player.y, map, player, game);
                    dropHandledInImpact = true;
                }
                hitPlayer = true;
                break;
            }
        }

        const forcehit = !rn2(5);
        const nx = x + dx;
        const ny = y + dy;
        const nextLoc = isok(nx, ny) ? map.at(nx, ny) : null;
        if (nextLoc && nextLoc.typ === IRONBARS
            && await hits_bars(weapon, x, y, nx, ny, forcehit ? 1 : 0, 0, map, player, game)) {
            // C ref: mthrowu.c hit_bars()/drop_throw happen before the final tmp_at
            // frame on blocked flight.
            dropHandledInImpact = true;
            break;
        }
        if (!range || flightBlocked(x, y, false, forcehit)) {
            if (!tethered_weapon) {
                await drop_throw(weapon, false, x, y, map, player, game);
                dropHandledInImpact = true;
            }
            break;
        }

        throwTrace(map, display, 'm_throw:tmp_at:flight', `x=${x} y=${y} range=${range}`);
        tmp_at(x, y);
        await nh_delay_output();
    }
    throwTrace(map, display, 'm_throw:tmp_at:end', `x=${x} y=${y}`);
    tmp_at(x, y);
    await nh_delay_output();
    if (tethered_weapon) {
        await tmp_at_end_async(BACKTRACK);
        return { drop: false, returnFlight: true, x: mon.mx, y: mon.my, hitPlayer, promptedForTopline };
    }
    throwTrace(map, display, 'm_throw:tmp_at:clear');
    tmp_at(DISP_END, 0);
    flush_screen(1); // C ref: dothrow.c:1015 — flush after monster throw animation
    return { drop: !dropHandledInImpact, x: dropX, y: dropY, hitPlayer, promptedForTopline };
}

// C ref: mthrowu.c return_from_mtoss().
export function return_from_mtoss(magr, otmp, tethered_weapon, map) {
    if (!magr || !otmp || !map) return;
    const impaired = !!(magr.mconf || magr.mstun || magr.mblinded);
    const madeItBack = !!rn2(100);
    const atx = magr.mx;
    const aty = magr.my;
    if (madeItBack && !impaired && rn2(100)) {
        add_to_minv(magr, otmp);
        if (tethered_weapon) magr.weapon = otmp;
    } else if (isok(atx, aty)) {
        otmp.ox = atx;
        otmp.oy = aty;
        placeFloorObject(map, otmp);
    }
}

// C ref: mthrowu.c m_throw() — simulate projectile flight.
// Consumes rn2(5) at each step, plus hit/damage rolls on collision.
// C ref: mthrowu.c thrwmu() — monster throws at player.
// Returns true if the monster acted (threw something).
export async function thrwmu(mon, map, player, display, game) {
    // C ref: mthrowu.c:1157-1159 — wield ranged weapon before selecting
    if (mon.weapon_check === NEED_WEAPON || !mon.weapon) {
        mon.weapon_check = NEED_RANGED_WEAPON;
        if (mon_wield_item(mon) !== 0)
            return true; // wielding consumed the turn
    }
    const otmp = select_rwep(mon);
    if (!otmp) return false;

    const targetX = Number.isInteger(mon.mux) ? mon.mux : player.x;
    const targetY = Number.isInteger(mon.muy) ? mon.muy : player.y;
    if (is_polearm(otmp) && otmp === mon.weapon) {
        const range2 = dist2(mon.mx, mon.my, targetX, targetY);
        if (range2 <= 5 && couldsee(map, player, mon.mx, mon.my)) {
            if (display) {
                await display.putstr_message(`The ${x_monnam(mon)} thrusts ${thrownObjectName(otmp, player)}.`);
            }
            const od = objectData[otmp.otyp] || {};
            let dam = (od.oc_wsdam || 0) > 0 ? rnd(od.oc_wsdam || 0) : 1;
            dam += (otmp.spe || 0);
            if (dam < 1) dam = 1;
            let hitv = 3 - distmin(player.x, player.y, mon.mx, mon.my);
            if (hitv < -4) hitv = -4;
            hitv += 8 + (otmp.spe || 0);
            await thitu(hitv, dam, otmp, null, player, display, game, mon);
            // C ref: mthrowu.c m_throw() stop_occupation() ordering.
            if (game) {
                if (typeof game.stop_occupation === 'function') await game.stop_occupation();
                else if (typeof game.stopOccupation === 'function') await game.stopOccupation();
                else if (game.occupation || Number.isInteger(game.multi)) {
                    game.occupation = null;
                    game.multi = 0;
                }
            }
            return true;
        }
        return false;
    }

    if (!lined_up(mon, map, player)) return false;
    const ux0 = Number.isInteger(game?.ux0) ? game.ux0 : player.x;
    const uy0 = Number.isInteger(game?.uy0) ? game.uy0 : player.y;
    const retreating = distmin(player.x, player.y, mon.mx, mon.my)
        > distmin(ux0, uy0, mon.mx, mon.my);
    const retreatRange = BOLT_LIM - distmin(mon.mx, mon.my, targetX, targetY);
    if (retreating && retreatRange > 0 && rn2(retreatRange)) return false;

    mon.mux = targetX;
    mon.muy = targetY;
    return await monshoot(mon, otmp, mon.weapon, map, player, display, game, null);
}

// Monster throws item at another monster.
// C ref: mthrowu.c thrwmm().
export async function thrwmm(mtmp, mtarg, map, player, display, game) {
    if (!mtmp || !mtarg) return 0;
    if (mtmp.weapon_check === NEED_WEAPON || !mtmp.weapon) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        if (mon_wield_item(mtmp) !== 0) return 0;
    }
    const otmp = select_rwep(mtmp);
    if (!otmp) return 0;
    if (!m_lined_up(mtarg, mtmp, map, player)) return 0;
    return (await monshoot(mtmp, otmp, mtmp.weapon, map, player, display, game, mtarg)) ? 1 : 0;
}

// monster spits substance at monster.
// C ref: mthrowu.c spitmm().
export async function spitmm(mtmp, mattk, mtarg, map, player, display, game) {
    if (!mtmp || !mattk || !mtarg) return 0;
    if (mtmp.mcan) {
        if (display) await display.putstr_message(`A dry rattle comes from the ${x_monnam(mtmp)}'s throat.`);
        return 0;
    }
    if (!m_lined_up(mtarg, mtmp, map, player)) return 0;
    const adtyp = mattk.adtyp;
    const venomType = (adtyp === AD_BLND || adtyp === AD_DRST) ? BLINDING_VENOM : ACID_VENOM;
    const otmp = mksobj(venomType, true, false);
    if (!otmp) return 0;
    otmp.quan = 1;
    const tx = mtarg === player ? (Number.isInteger(mtmp.mux) ? mtmp.mux : player.x) : mtarg.mx;
    const ty = mtarg === player ? (Number.isInteger(mtmp.muy) ? mtmp.muy : player.y) : mtarg.my;
    const denom = Math.max(1, BOLT_LIM - distmin(mtmp.mx, mtmp.my, tx, ty));
    if (rn2(denom)) return 0;
    if (display) {
        await display.putstr_message(`The ${x_monnam(mtmp)} spits venom!`);
    }
    return (await monshoot(mtmp, otmp, null, map, player, display, game, mtarg)) ? 1 : 0;
}

// monster spits substance at hero.
// C ref: mthrowu.c spitmu().
export async function spitmu(mtmp, mattk, map, player, display, game) {
    return await spitmm(mtmp, mattk, player, map, player, display, game);
}

// hero catches gem thrown by mon iff unicorn.
// C ref: mthrowu.c ucatchgem().
export async function ucatchgem(gem, mon, player, map, display) {
    if (!gem || !player) return false;
    if (gem.oclass !== GEM_CLASS) return false;
    if (!is_unicorn(player?.data || {})) return false;
    const name = thrownObjectName(gem, player);
    const isGlass = gem.otyp >= FIRST_GLASS_GEM && gem.otyp <= LAST_GLASS_GEM;
    if (display) {
        await display.putstr_message(`You catch the ${name}.`);
        if (isGlass) {
            await display.putstr_message(`You are not interested in ${x_monnam(mon)}'s junk.`);
        } else {
            await display.putstr_message(`You accept ${x_monnam(mon)}'s gift.`);
        }
    }
    if (isGlass) {
        if (map && isok(player.x, player.y)) {
            gem.ox = player.x;
            gem.oy = player.y;
            placeFloorObject(map, gem);
        }
    } else if (typeof player.addToInventory === 'function') {
        player.addToInventory(gem);
    } else if (map && isok(player.x, player.y)) {
        gem.ox = player.x;
        gem.oy = player.y;
        placeFloorObject(map, gem);
    }
    return true;
}

// Return the name of a breath weapon.
// C ref: mthrowu.c breathwep_name().
export function breathwep_name(typ, hallucinating = false) {
    if (hallucinating) return rnd_hallublast();
    if (typ === AD_MAGM) return 'fragments';
    if (typ === AD_FIRE) return 'fire';
    if (typ === AD_COLD) return 'frost';
    if (typ === AD_SLEE) return 'sleep gas';
    if (typ === AD_DISN) return 'a disintegration blast';
    if (typ === AD_ELEC) return 'lightning';
    if (typ === AD_DRST) return 'poison gas';
    if (typ === AD_ACID) return 'acid';
    return 'strange breath';
}

function breath_zap_type(adtyp) {
    switch (adtyp) {
    case AD_FIRE: return ZT_FIRE;
    case AD_COLD: return ZT_COLD;
    case AD_SLEE: return ZT_SLEEP;
    case AD_DISN: return ZT_DEATH;
    case AD_ELEC: return ZT_LIGHTNING;
    case AD_DRST: return ZT_POISON_GAS;
    case AD_ACID: return ZT_ACID;
    case AD_MAGM:
    default:
        return ZT_MAGIC_MISSILE;
    }
}

// monster breathes at monster (ranged) -- placeholder fidelity surface.
// C ref: mthrowu.c breamm().
export async function breamm(mtmp, mattk, mtarg, map, player, display, game) {
    if (!m_lined_up(mtarg, mtmp, map, player)) return 0;
    if (mtmp.mcan) {
        if (display) await display.putstr_message(`The ${x_monnam(mtmp)} coughs.`);
        return 0;
    }
    if (mtmp.mspec_used) return 0;
    if (rn2(3)) return 0;
    const adtyp = mattk?.adtyp ?? AD_FIRE;
    if (display) {
        await display.putstr_message(`The ${x_monnam(mtmp)} breathes ${breathwep_name(adtyp, !!player?.hallucinating)}!`);
    }
    const nd = Math.max(1, mattk?.damn || 6);
    const dx = Math.sign((mtarg?.x ?? mtarg?.mx ?? 0) - (mtmp.mx ?? 0));
    const dy = Math.sign((mtarg?.y ?? mtarg?.my ?? 0) - (mtmp.my ?? 0));
    if (map && (dx !== 0 || dy !== 0)) {
        await buzz(ZT_BREATH(breath_zap_type(adtyp)), nd, mtmp.mx, mtmp.my, dx, dy, map, player);
    }
    mtmp.mspec_used = 10 + rn2(20);
    return 1;
}

// monster breathes at hero.
// C ref: mthrowu.c breamu().
export async function breamu(mtmp, mattk, map, player, display, game) {
    return await breamm(mtmp, mattk, player, map, player, display, game);
}

// Check if a monster has any AT_WEAP attacks (can throw weapons).
export function hasWeaponAttack(mon) {
    const mdat = mon?.data || mon?.type || (Number.isInteger(mon?.mndx) ? mons[mon.mndx] : null) || null;
    const attacks = mon?.attacks || mdat?.attacks || [];
    return attacks.some(a => a && a.aatyp === AT_WEAP);
}

// C ref: monmove.c:853-860 — dochug weapon wielding gate
// Called from monmove.js before melee attacks. Uses mon_wield_item for
// proper weapon AI (select_hwep priority list) instead of first-item scan.
export async function maybeMonsterWieldBeforeAttack(mon, player, display, fov, nearby = true) {
    if (!hasWeaponAttack(mon)) return false;
    // Keep legacy behavior for monsters that start unarmed in JS fixtures.
    // C equivalent checks weapon_check state; JS tests also rely on
    // !MON_WEP-style entry here.
    if (mon.weapon_check !== NEED_WEAPON && mon.weapon) return false;
    // C ref: monmove.c wield gate — trapped monsters with a ranged option
    // should keep that option rather than spend a turn switching to HTH.
    if (mon.mtrapped && !nearby && select_rwep(mon)) return false;
    const oldWeapon = mon.weapon;
    mon.weapon_check = NEED_HTH_WEAPON;
    if (mon_wield_item(mon) !== 0) {
        // Wielding took monster's turn — show message if visible
        if (mon.weapon && mon.weapon !== oldWeapon) {
            const visible = !fov?.canSee || (fov.canSee(mon.mx, mon.my)
                && !player?.blind && !mon.minvis);
            if (display && visible) {
                await display.putstr_message(`The ${x_monnam(mon)} wields ${thrownObjectName(mon.weapon, player)}!`);
            }
        }
        return true;
    }
    return false;
}
