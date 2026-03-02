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
         D_CLOSED, D_LOCKED, IRONBARS, SINK, isok, A_STR } from './config.js';
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
import { doname, xname, mkcorpstat, mksobj } from './mkobj.js';
import { couldsee, m_cansee } from './vision.js';
import {
    x_monnam, is_prince, is_lord, is_mplayer, is_elf, is_orc, is_gnome,
    throws_rocks, is_unicorn,
} from './mondata.js';
import {
    mons, AT_WEAP, G_NOCORPSE, AD_ACID, AD_BLND, AD_DRST,
    AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE, AD_DISN, AD_ELEC, MZ_TINY, MZ_HUMAN, MZ_LARGE,
} from './monsters.js';
import { distmin, dist2, mondead, BOLT_LIM } from './monutil.js';
import { add_to_minv } from './monutil.js';
import { placeFloorObject } from './stackobj.js';
import { corpse_chance } from './mon.js';
import { select_rwep as weapon_select_rwep,
    mon_wield_item, NEED_WEAPON, NEED_HTH_WEAPON, NEED_RANGED_WEAPON, dmgval, P_BOW } from './weapon.js';
import { ammo_and_launcher, multishot_class_bonus } from './dothrow.js';
import { breaks, harmless_missile } from './dothrow.js';
import { should_mulch_missile } from './dothrow.js';
import { find_mac } from './worn.js';
import { nhgetch } from './input.js';
import {
    buzz, ZT_BREATH, ZT_MAGIC_MISSILE, ZT_FIRE, ZT_COLD, ZT_SLEEP,
    ZT_DEATH, ZT_LIGHTNING, ZT_POISON_GAS, ZT_ACID,
} from './zap.js';
import {
    tmp_at, tmp_at_end_async, nh_delay_output,
    DISP_FLASH, DISP_TETHER, DISP_END, BACKTRACK,
} from './animation.js';
import { objectMapGlyph } from './display_rng.js';
import { canonicalizeAttackFields } from './attack_fields.js';

const hallublasts = [
    'bubbles', 'butterflies', 'dust specks', 'flowers', 'glitter',
    'hot air', 'lightning', 'music', 'rainbows', 'stars',
];

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

// C ref: zap.c exclam(force)
function exclam(force) {
    if (force < 0) return '?';
    if (force <= 4) return '.';
    return '!';
}

// hero is hit by a thrown object.
// C ref: mthrowu.c thitu().
export function thitu(tlev, dam, objp, name, player, display, game, mon = null) {
    const obj = objp || null;
    const dieRoll = rnd(20);
    if ((player.ac || 10) + tlev <= dieRoll) {
        if (display) {
            const verbose = game?.flags?.verbose !== false;
            if (player.blind || !verbose) {
                display.putstr_message('It misses.');
            } else if ((player.ac || 10) + tlev <= dieRoll - 2) {
                const objName = name || thrownObjectName(obj, player);
                const cap = objName.charAt(0).toUpperCase() + objName.slice(1);
                display.putstr_message(`${cap} misses you.`);
            } else {
                display.putstr_message(`You are almost hit by ${name || thrownObjectName(obj, player)}.`);
            }
        }
        return 0;
    }

    if (display) {
        const text = name || thrownObjectName(obj, player);
        const punct = exclam(Number.isFinite(dam) ? dam : 0);
        display.putstr_message(`You are hit by ${text}${punct}`);
    }
    if (player.takeDamage) player.takeDamage(dam, mon ? x_monnam(mon) : 'an object');
    else player.uhp -= dam;
    exercise(player, A_STR, false);
    return 1;
}

// C ref: mthrowu.c drop_throw().
export function drop_throw(obj, ohit, x, y, map) {
    if (!obj || !map) return true;
    let broken;
    if (obj.otyp === CREAM_PIE || obj.oclass === VENOM_CLASS
        || (ohit && obj.otyp === EGG)) {
        broken = true;
    } else {
        broken = !!(ohit && should_mulch_missile(obj));
    }
    if (broken) return true;
    if (!isok(x, y)) return true;
    const spot = map.at(x, y);
    if (!spot || !ACCESSIBLE(spot.typ)) return true;
    obj.ox = x;
    obj.oy = y;
    placeFloorObject(map, obj);
    return false;
}

// C ref: mthrowu.c hit_bars().
export function hit_bars(objp, objx, objy, barsx, barsy, breakflags = 0, map) {
    const obj = objp || null;
    if (!obj) return;
    // C-style: breakable items may shatter on bars.
    const broken = breaks(obj, objx, objy, null, map);
    if (broken) return;
    // Survived impact: drop at the impact cell.
    if (map && isok(objx, objy)) {
        obj.ox = objx;
        obj.oy = objy;
        placeFloorObject(map, obj);
    }
}

// C ref: mthrowu.c hits_bars().
export function hits_bars(objp, x, y, barsx, barsy, always_hit = 0, whodidit = -1, map = null) {
    const obj = objp || null;
    if (!obj) return true;
    let hits = !!always_hit;
    if (!hits) {
        switch (obj.oclass) {
        case WEAPON_CLASS: {
            const skill = objectData[obj.otyp]?.sub || 0;
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
        hit_bars(obj, x, y, barsx, barsy, 0, map);
    }
    return hits;
}

// C ref: mthrowu.c ohitmon().
export function ohitmon(mtmp, otmp, range, verbose, map, player, display, game) {
    if (!mtmp || !otmp) return 1;
    const od = objectData[otmp.otyp] || {};
    const hitThreshold = 5 + find_mac(mtmp);
    const dieRoll = rnd(20);
    if (hitThreshold >= dieRoll) {
        let damage = 0;
        if (otmp.oclass === WEAPON_CLASS || otmp.oclass === GEM_CLASS) {
            damage = dmgval(otmp, mtmp);
        } else if ((od.sdam || 0) > 0) {
            damage = rnd(od.sdam || 0);
        }
        damage += (otmp.spe || 0);
        if (damage < 1) damage = 1;
        // C ref: mthrowu.c ohitmon() — pline("The %s hits %s%s", xname, mon_nam, exclam)
        if (verbose && display && !player?.blind && couldsee(map, player, mtmp.mx, mtmp.my)) {
            display.putstr_message(
                `The ${xname({ ...otmp, dknown: true })} hits ${x_monnam(mtmp, { article: 'none' })}${exclam(damage)}`
            );
        }
        mtmp.mhp -= damage;
        if (mtmp.mhp <= 0) {
            mondead(mtmp, map);
            map.removeMonster?.(mtmp);
            if (player) {
                const exp = ((mtmp.mlevel || 0) + 1) * ((mtmp.mlevel || 0) + 1);
                player.exp = (player.exp || 0) + exp;
                player.score = (player.score || 0) + exp;
                newexplevel(player, display);
            }
            const mdat2 = mons[mtmp.mndx || 0] || {};
            if (corpse_chance(mtmp) && !(((mdat2.geno || 0) & G_NOCORPSE) !== 0)) {
                const corpse = mkcorpstat(CORPSE, mtmp.mndx || 0, true, mtmp.mx, mtmp.my, map);
                if (corpse) corpse.age = (player?.turns || 0) + 1;
            }
        }
        drop_throw(otmp, true, mtmp.mx, mtmp.my, map);
        return 1;
    }
    if (range <= 0) {
        drop_throw(otmp, false, mtmp.mx, mtmp.my, map);
        return 1;
    }
    return 0;
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

    if (display) {
        const targetName = mtarg ? ` at the ${x_monnam(mtarg)}` : '';
        display.putstr_message(`The ${x_monnam(mon)} throws ${thrownObjectName(otmp, player)}${targetName}!`);
    }

    const ddx = Math.sign(tx - mon.mx);
    const ddy = Math.sign(ty - mon.my);
    for (let i = 0; i < shots; i++) {
        const projectile = { ...otmp, quan: 1, ox: mon.mx, oy: mon.my, invlet: null };
        m_useup(mon, otmp);
        const result = await m_throw_timed(
            mon, mon.mx, mon.my, ddx, ddy, dm, projectile, map, player, display, game,
            { tethered_weapon }
        );
        if (result?.hitPlayer) hitPlayer = true;
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
                if (game?.renderCurrentScreen) {
                    game.renderCurrentScreen();
                }
            }
        }
        if (mon.dead) break;
    }
    // Preserve existing throw-message ack behavior, but don't consume the next
    // command key when the throw already resolved with a direct hit on hero.
    if (!hitPlayer
        && !mtarg
        && display
        && typeof display.morePrompt === 'function') {
        // C ref: win/tty/topl.c tmore() renders "--More--" before blocking on getch,
        // but only when two messages were concatenated onto the topline.
        // When only a single throw message is present, C does not show --More-- here.
        if (typeof display.renderMoreMarker === 'function'
            && (display.topMessage || '').includes('  ')) {
            display.renderMoreMarker();
        }
        await display.morePrompt(nhgetch);
        if (Object.hasOwn(display, 'noConcatenateMessages')) {
            display.noConcatenateMessages = true;
            game._tempNoConcatMessages = true;
        }
    }
    return true;
}

export async function m_throw_timed(
    mon, startX, startY, dx, dy, range, weapon, map, player, display, game,
    options = {}
) {
    const tethered_weapon = !!options.tethered_weapon;
    let hitPlayer = false;
    let dropHandledInImpact = false;
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

    const projGlyph = objectMapGlyph(weapon, false, {
        player,
        x: startX,
        y: startY,
        observe: false,
    });
    tmp_at(tethered_weapon ? DISP_TETHER : DISP_FLASH, projGlyph);
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
            if (ohitmon(mtmp, weapon, range, true, map, player, display, game)) {
                // ohitmon() already performs drop_throw() when projectile stops.
                dropHandledInImpact = true;
                break;
            }
        }

        if (x === player.x && y === player.y) {
            if (weapon?.oclass === GEM_CLASS && ucatchgem(weapon, mon, player, map, display)) {
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
                    && (objectData[weapon.otyp]?.sub === -P_BOW)) {
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
            const hitu = thitu(hitv, dam, weapon, null, player, display, game, mon);
            if (game) {
                if (typeof game.stop_occupation === 'function') game.stop_occupation();
                else if (typeof game.stopOccupation === 'function') game.stopOccupation();
                else if (game.occupation || Number.isInteger(game.multi)) {
                    game.occupation = null;
                    game.multi = 0;
                }
            }
            if (hitu) {
                hitPlayer = true;
                break;
            }
        }

        const forcehit = !rn2(5);
        const nx = x + dx;
        const ny = y + dy;
        const nextLoc = isok(nx, ny) ? map.at(nx, ny) : null;
        if (nextLoc && nextLoc.typ === IRONBARS && hits_bars(weapon, x, y, nx, ny, forcehit ? 1 : 0, 0, map)) {
            break;
        }
        if (!range || flightBlocked(x, y, false, forcehit)) break;

        tmp_at(x, y);
        await nh_delay_output();
    }
    tmp_at(x, y);
    await nh_delay_output();
    if (tethered_weapon) {
        await tmp_at_end_async(BACKTRACK);
        return { drop: false, returnFlight: true, x: mon.mx, y: mon.my, hitPlayer };
    }
    tmp_at(DISP_END, 0);
    return { drop: !dropHandledInImpact, x: dropX, y: dropY, hitPlayer };
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
                display.putstr_message(`The ${x_monnam(mon)} thrusts ${thrownObjectName(otmp, player)}.`);
            }
            const od = objectData[otmp.otyp] || {};
            let dam = (od.sdam || 0) > 0 ? rnd(od.sdam || 0) : 1;
            dam += (otmp.spe || 0);
            if (dam < 1) dam = 1;
            let hitv = 3 - distmin(player.x, player.y, mon.mx, mon.my);
            if (hitv < -4) hitv = -4;
            hitv += 8 + (otmp.spe || 0);
            thitu(hitv, dam, otmp, null, player, display, game, mon);
            // C ref: mthrowu.c m_throw() stop_occupation() ordering.
            if (game) {
                if (typeof game.stop_occupation === 'function') game.stop_occupation();
                else if (typeof game.stopOccupation === 'function') game.stopOccupation();
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
        if (display) display.putstr_message(`A dry rattle comes from the ${x_monnam(mtmp)}'s throat.`);
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
        display.putstr_message(`The ${x_monnam(mtmp)} spits venom!`);
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
export function ucatchgem(gem, mon, player, map, display) {
    if (!gem || !player) return false;
    if (gem.oclass !== GEM_CLASS) return false;
    if (!is_unicorn(player?.data || {})) return false;
    const name = thrownObjectName(gem, player);
    const isGlass = gem.otyp >= FIRST_GLASS_GEM && gem.otyp <= LAST_GLASS_GEM;
    if (display) {
        display.putstr_message(`You catch the ${name}.`);
        if (isGlass) {
            display.putstr_message(`You are not interested in ${x_monnam(mon)}'s junk.`);
        } else {
            display.putstr_message(`You accept ${x_monnam(mon)}'s gift.`);
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
    canonicalizeAttackFields(mattk);
    if (mtmp.mcan) {
        if (display) display.putstr_message(`The ${x_monnam(mtmp)} coughs.`);
        return 0;
    }
    if (mtmp.mspec_used) return 0;
    if (rn2(3)) return 0;
    const adtyp = mattk?.adtyp ?? AD_FIRE;
    if (display) {
        display.putstr_message(`The ${x_monnam(mtmp)} breathes ${breathwep_name(adtyp, !!player?.hallucinating)}!`);
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
    const attacks = mon.attacks || (mon.type && mon.type.attacks) || [];
    return attacks.some(a => a && a.type === AT_WEAP);
}

// C ref: monmove.c:853-860 — dochug weapon wielding gate
// Called from monmove.js before melee attacks. Uses mon_wield_item for
// proper weapon AI (select_hwep priority list) instead of first-item scan.
export function maybeMonsterWieldBeforeAttack(mon, player, display, fov, nearby = true) {
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
                display.putstr_message(`The ${x_monnam(mon)} wields ${thrownObjectName(mon.weapon, player)}!`);
            }
        }
        return true;
    }
    return false;
}
