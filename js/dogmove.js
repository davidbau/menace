// dogmove.js -- Pet movement AI
// C-faithful port of dogmove.c dog_move(), pet_ranged_attk(), and helpers
// Extracted from monmove.js for easier C-vs-JS comparison

import { COLNO, ROWNO, IS_ROOM, IS_DOOR, IS_POOL, IS_LAVA,
         D_CLOSED, D_LOCKED,
         POOL, STAIRS, LADDER, isok } from './config.js';
import { rn2, rnd, pushRngLogEntry } from './rng.js';
import { mattacku } from './mhitu.js';
import { CORPSE, BALL_CLASS, CHAIN_CLASS, ROCK_CLASS, FOOD_CLASS,
         COIN_CLASS, GEM_CLASS,
         PICK_AXE, DWARVISH_MATTOCK, UNICORN_HORN,
         SKELETON_KEY, LOCK_PICK, CREDIT_CARD,
         BOULDER, TIN, EGG,
         SILVER,
         objectData } from './objects.js';
import { doname, next_ident, weight } from './mkobj.js';
import { obj_resists, is_organic, is_metallic, is_rustprone } from './objdata.js';
import { observeObject } from './discovery.js';
import { dogfood, DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT,
         UNDEF } from './dog.js';
import { couldsee, m_cansee, do_clear_area } from './vision.js';
import { mattackm, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED } from './mhitm.js';
import { is_animal, is_mindless, nohands, nolimbs, unsolid,
         carnivorous, herbivorous, is_metallivore,
         y_monnam, YMonnam, Monnam } from './mondata.js';
import { PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_FLOATING_EYE, PM_GELATINOUS_CUBE,
         PM_LONG_WORM, PM_COCKATRICE, PM_CHICKATRICE, PM_MEDUSA,
         NUMMONS,
         mons,
         AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_WEAP,
         AT_ENGL,
         MR_POISON, MR_ACID, MR_STONE, MR_FIRE,
         M1_SWIM, M1_NEEDPICK, M1_TUNNEL, M1_SEE_INVIS,
         M1_NOTAKE, M1_NOHANDS, M1_UNSOLID, M1_NOHEAD, M1_NOLIMBS,
         M2_STRONG, M2_ROCKTHROW,
         S_MIMIC, S_DRAGON, S_NYMPH,
         WT_HUMAN, MZ_HUMAN,
         MZ_TINY, MZ_SMALL, MZ_MEDIUM, MZ_LARGE, MZ_HUGE, MZ_GIGANTIC,
         G_FREQ } from './monsters.js';
import { MAGIC_PORTAL } from './symbols.js';
import { gettrack } from './track.js';
import { helpless } from './monutil.js';
import { onscary } from './mon.js';
import { W_ARMS, W_WEP } from './worn.js';

// Shared utilities from monmove.js
import { dist2, distmin, monnear, mfndpos, mon_allowflags,
         m_avoid_kicked_loc, m_avoid_soko_push_loc,
         m_harmless_trap,
         monmoveTrace, monmoveStepLabel,
         canSpotMonsterForMap, map_invisible,
         mondead, mpickobj, mdrop_obj,
         MTSZ, SQSRCHRADIUS, FARAWAY,
         mon_track_add,
         ALLOW_M, ALLOW_MDISP, ALLOW_TRAPS, ALLOW_U } from './monmove.js';
import { newsym } from './monutil.js';

// ========================================================================
// Constants — C ref: dogmove.c:11-13
// ========================================================================
const DOG_HUNGRY = 300;
const DOG_WEAK   = 500;
const DOG_STARVE = 750;

const MAX_CARR_CAP = 1000; // C ref: weight.h
const NON_PM = -1;

// ========================================================================
// Helper predicates — moved from dog.js (originally C dogmove.c helpers)
// ========================================================================

function monIndex(mon) {
    if (Number.isInteger(mon?.mnum)) return mon.mnum;
    if (Number.isInteger(mon?.mndx)) return mon.mndx;
    return NON_PM;
}

function monPtr(mon) {
    const idx = monIndex(mon);
    return ismnum(idx) ? mons[idx] : null;
}

function ismnum(fx) { return fx >= 0 && fx < NUMMONS; }

// C ref: mondata.h — flesh_petrifies(pm)
function flesh_petrifies(pm) {
    return pm === mons[PM_COCKATRICE] || pm === mons[PM_CHICKATRICE]
        || pm === mons[PM_MEDUSA];
}

// C ref: mondata.h — touch_petrifies(pm) — same as flesh_petrifies for corpse monsters
function touch_petrifies(pm) { return flesh_petrifies(pm); }

function resists_poison(mon) { return !!(monPtr(mon)?.mr1 & MR_POISON); }
function resists_acid(mon)   { return !!(monPtr(mon)?.mr1 & MR_ACID); }
function resists_ston(mon)   { return !!(monPtr(mon)?.mr1 & MR_STONE); }
function likes_fire(ptr) { return !!(ptr.mr1 & MR_FIRE); }

function mon_hates_silver(mon) {
    const ptr = monPtr(mon);
    if (!ptr) return false;
    return !!(ptr.flags2 & 0x00000400);
}

// C ref: mondata.h — has_head(ptr) = !(M1_NOHEAD)
function has_head(ptr) { return !(ptr.flags1 & M1_NOHEAD); }

// C ref: mondata.h — haseyes(ptr) = !(M1_NOEYES)
// M1_NOEYES = 0x00001000
function haseyes(ptr) { return !(ptr.flags1 & 0x00001000); }

// ========================================================================
// dog_nutrition — C ref: dogmove.c:155-214
// Sets mon.meating (turns spent eating) and returns nutrition value.
// No RNG consumed.
// ========================================================================
function dog_nutrition(mon, obj) {
    const mdat = monPtr(mon);
    if (!mdat) return 0;
    let nutrit;

    if (obj.oclass === FOOD_CLASS) {
        if (obj.otyp === CORPSE) {
            const corpsenm = obj.corpsenm !== undefined ? obj.corpsenm : 0;
            mon.meating = 3 + (mons[corpsenm].weight >> 6);
            nutrit = mons[corpsenm].nutrition || 0;
        } else {
            mon.meating = objectData[obj.otyp].delay || 0;
            nutrit = objectData[obj.otyp].nutrition || 0;
        }
        switch (mdat.msize) {
            case MZ_TINY:     nutrit *= 8; break;
            case MZ_SMALL:    nutrit *= 6; break;
            default:
            case MZ_MEDIUM:   nutrit *= 5; break;
            case MZ_LARGE:    nutrit *= 4; break;
            case MZ_HUGE:     nutrit *= 3; break;
            case MZ_GIGANTIC: nutrit *= 2; break;
        }
    } else if (obj.oclass === COIN_CLASS) {
        mon.meating = Math.floor((obj.quan || 1) / 2000) + 1;
        nutrit = Math.floor((obj.quan || 1) / 20);
    } else {
        mon.meating = Math.floor((obj.owt || 0) / 20) + 1;
        nutrit = 5 * (objectData[obj.otyp].nutrition || 0);
    }
    return nutrit;
}

// ========================================================================
// max_mon_load / curr_mon_load / can_carry — C ref: dogmove.c:1894-2034
// ========================================================================

function max_mon_load(mon) {
    const mdat = monPtr(mon);
    if (!mdat) return 0;
    const strong = !!(mdat.flags2 & M2_STRONG);
    const cwt = mdat.weight || 0;
    const msize = mdat.msize || 0;
    let maxload;

    if (!cwt) {
        maxload = (MAX_CARR_CAP * msize) / MZ_HUMAN;
    } else if (!strong || cwt > WT_HUMAN) {
        maxload = (MAX_CARR_CAP * cwt) / WT_HUMAN;
    } else {
        maxload = MAX_CARR_CAP;
    }

    if (!strong) maxload = Math.floor(maxload / 2);
    if (maxload < 1) maxload = 1;

    return Math.floor(maxload);
}

// Normalize monster inventory to an iterable sequence.
// Some paths still carry C-style nobj-linked chains instead of arrays.
function mon_inventory_items(mon) {
    if (!mon?.minvent) return [];
    if (Array.isArray(mon.minvent)) return mon.minvent;
    const items = [];
    const seen = new Set();
    let cur = mon.minvent;
    while (cur && typeof cur === 'object' && !seen.has(cur)) {
        items.push(cur);
        seen.add(cur);
        cur = cur.nobj || null;
    }
    return items;
}

function curr_mon_load(mon) {
    let load = 0;
    const throws = !!(monPtr(mon)?.flags2 & M2_ROCKTHROW);
    for (const obj of mon_inventory_items(mon)) {
        if (obj.otyp !== BOULDER || !throws)
            load += obj.owt || 0;
    }
    return load;
}

// C ref: dogmove.c:1971-2034
export function can_carry(mon, obj, player = null) {
    const mdat = monPtr(mon);
    if (!mdat) return 0;

    if (mdat.flags1 & M1_NOTAKE) return 0;

    if ((obj.otyp === CORPSE || obj.otyp === EGG)
        && obj.corpsenm !== undefined
        && ismnum(obj.corpsenm)
        && flesh_petrifies(mons[obj.corpsenm])
        && !resists_ston(mon))
        return 0;
    if (mon_hates_silver(mon)
        && objectData[obj.otyp] && objectData[obj.otyp].material === SILVER)
        return 0;

    const iquan = obj.quan || 1;

    if (iquan > 1 && (mdat.flags1 & M1_NOHANDS)) {
        let glomper = false;
        if (mdat.mlet === S_DRAGON
            && (obj.oclass === COIN_CLASS || obj.oclass === GEM_CLASS)) {
            glomper = true;
        } else {
            for (const atk of mdat.attacks || []) {
                if (atk.type === AT_ENGL) { glomper = true; break; }
            }
        }
        if (!glomper) return 1;
    }

    // C ref: mon.c:2002 — steeds don't pick up stuff (to avoid shop abuse)
    if (player && mon === player.usteed) return 0;

    if (mon.peaceful && !mon.tame) return 0;
    if ((mdat.flags2 & M2_ROCKTHROW) && obj.otyp === BOULDER) return iquan;
    if (mdat.mlet === S_NYMPH)
        return (obj.oclass === ROCK_CLASS) ? 0 : iquan;
    if (curr_mon_load(mon) + (obj.owt || 0) > max_mon_load(mon)) return 0;

    return iquan;
}

// ========================================================================
// dog_eat — C ref: dogmove.c:217-342
// ========================================================================
export async function dog_eat(mon, obj, map, turnCount, ctx = null) {
    const edog = mon.edog;
    if (!edog) return 1;
    const display = ctx?.display || null;
    const player = ctx?.player || null;
    const fov = ctx?.fov || null;
    const startX = Number.isInteger(ctx?.startX) ? ctx.startX : mon.mx;
    const startY = Number.isInteger(ctx?.startY) ? ctx.startY : mon.my;

    if (edog.hungrytime < turnCount)
        edog.hungrytime = turnCount;

    let nutrit = dog_nutrition(mon, obj);
    pushRngLogEntry(`^eat[${mon.mndx}@${mon.mx},${mon.my},${obj.otyp}]`);
    edog.hungrytime += nutrit;

    mon.confused = 0;
    if (edog.mhpmax_penalty) {
        mon.mhpmax = (mon.mhpmax || 0) + edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }

    if (mon.flee && mon.fleetim > 1)
        mon.fleetim = Math.floor(mon.fleetim / 2);

    if (mon.tame < 20)
        mon.tame++;

    let removeFromMap = true;
    if ((obj.quan || 1) > 1 && obj.oclass === FOOD_CLASS) {
        obj.quan--;
        obj = { ...obj, quan: 1 };
        removeFromMap = false;
    }

    if (display && player) {
        const seeObj = fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my);
        const sawPet = (fov?.canSee ? fov.canSee(startX, startY) : couldsee(map, player, startX, startY))
            && !mon.minvis;
        if (sawPet || (seeObj && !mon.minvis)) {
            await display.putstr_message(`${YMonnam(mon)} eats ${doname(obj, null)}.`);
        } else if (seeObj) {
            await display.putstr_message(`It eats ${doname(obj, null)}.`);
        }
    }

    if (dogfood(mon, obj, turnCount) === DOGFOOD && obj.invlet) {
        edog.apport += Math.floor(200 / ((edog.dropdist || 0) + turnCount
                                          - (edog.droptime || 0)));
        if (edog.apport <= 0) edog.apport = 1;
    }

    // C ref: m_consume_obj → delobj → delobj_core calls obj_resists(obj, 0, 0)
    // to check if the object is indestructible (Amulet, invocation tools, Rider
    // corpses). This consumes rn2(100) for non-artifact objects. We must match
    // this RNG consumption even though JS doesn't implement the protection logic.
    obj_resists(obj, 0, 0);
    if (removeFromMap) {
        map.removeObject(obj);
    }

    return 1;
}

// ========================================================================
// dog_starve — C ref: dogmove.c:342-352
// ========================================================================
// JS vs C: C calls mondied(mtmp) which handles corpse creation, inventory drop,
// and experience. JS simplified to mon.dead = true. C also checks usteed.
// C uses cansee() for visibility; JS uses fov?.canSee which may differ in edge cases.
// C has Hallucination check ("bummed" vs "sad"); JS always uses "sad".
export async function dog_starve(mon, map, display, player, fov) {
    if (mon.mleashed) {
        if (display) await display.putstr_message('Your leash goes slack.');
    } else {
        const canSee = display && player && (
            fov?.canSee ? fov.canSee(mon.mx, mon.my) : false
        );
        if (canSee) {
            await display.putstr_message(`${Monnam(mon)} starves.`);
        } else if (display) {
            await display.putstr_message('You feel sad for a moment.');
        }
    }
    mondead(mon, map, player);
}

// ========================================================================
// dog_hunger — C ref: dogmove.c:356-388
// Returns true on starvation death.
// JS vs C: C uses couldsee() for the "confused from hunger" message and
// calls beg(mtmp) when not visible but couldsee. JS skips beg() and
// uses "worried" message for the else branch. C also calls stop_occupation().
// ========================================================================
export async function dog_hunger(mon, edog, turnCount, map, display, player, fov) {
    if (turnCount > edog.hungrytime + DOG_WEAK) {
        const mdat = monPtr(mon);
        if (mdat && !carnivorous(mdat) && !herbivorous(mdat)) {
            edog.hungrytime = turnCount + DOG_WEAK;
        } else if (!edog.mhpmax_penalty) {
            const newmhpmax = Math.floor((mon.mhpmax || 0) / 3);
            mon.confused = 1;
            edog.mhpmax_penalty = (mon.mhpmax || 0) - newmhpmax;
            mon.mhpmax = newmhpmax;
            if ((mon.mhp || 0) > mon.mhpmax)
                mon.mhp = mon.mhpmax;
            if (mon.mhp <= 0 || mon.dead) {
                await dog_starve(mon, map, display, player, fov);
                return true;
            }
            const canSee = display && player && (
                fov?.canSee ? fov.canSee(mon.mx, mon.my) : false
            );
            if (canSee) {
                await display.putstr_message(`${Monnam(mon)} is confused from hunger.`);
            } else if (display) {
                await display.putstr_message(`You feel worried about ${y_monnam(mon)}.`);
            }
        } else if (turnCount > edog.hungrytime + DOG_STARVE
                   || mon.mhp <= 0 || mon.dead) {
            await dog_starve(mon, map, display, player, fov);
            return true;
        }
    }
    return false;
}

// ========================================================================
// finish_meating — C ref: dogmove.c:1442-1451
// JS vs C: C calls newsym() to update the display after resetting appearance.
// JS does not yet have newsym; callers should refresh display as needed.
// ========================================================================
export function finish_meating(mon) {
    mon.meating = 0;
    if (mon.m_ap_type && mon.m_ap_type !== 0
        && mon.type?.mlet !== S_MIMIC) {
        mon.m_ap_type = 0;
        mon.mappearance = 0;
    }
}

// ========================================================================
// mnum_leashable — C ref: dogmove.c:1456-1463
// ========================================================================
export function mnum_leashable(mnum) {
    if (mnum < 0 || mnum >= NUMMONS) return false;
    const ptr = mons[mnum];
    if (!ptr) return false;
    if (mnum === PM_LONG_WORM) return false;
    if (unsolid(ptr)) return false;
    return !nolimbs(ptr) || has_head(ptr);
}

// ========================================================================
// quickmimic — C ref: dogmove.c:1466-1535
// Stub: requires mimic appearance system not yet in JS
// ========================================================================
// TODO: implement when mimic appearance system is available
// RNG: rn2(SIZE(qm)) — would need qm table

// ========================================================================
// dog_goal helper functions — C-faithful checks
// ========================================================================

// C ref: dogmove.c:144-153 — cursed_object_at(x, y)
// Checks if ANY object at position (x, y) is cursed
function cursed_object_at(map, x, y) {
    for (const obj of map.objects) {
        if (obj.buried) continue;
        if (obj.ox === x && obj.oy === y && obj.cursed)
            return true;
    }
    return false;
}

// C ref: dogmove.c:1353-1362 — could_reach_item(mon, nx, ny)
// Check if monster could pick up objects from location (no pool/lava/boulder blocking)
export function could_reach_item(map, mon, nx, ny) {
    const loc = map.at(nx, ny);
    if (!loc) return false;
    const mdat = mon?.type || {};
    const isPool = IS_POOL(loc.typ);
    const isLava = IS_LAVA(loc.typ);
    const isSwimmer = !!(mdat.flags1 & M1_SWIM);
    const likesLava = mon?.mndx === PM_FIRE_ELEMENTAL || mon?.mndx === PM_SALAMANDER;
    const throwsRocks = !!(mdat.flags2 & M2_ROCKTHROW);
    // C: sobj_at(BOULDER, nx, ny) — is there a boulder at this position?
    let hasBoulder = false;
    for (const obj of map.objects) {
        if (obj.buried) continue;
        if (obj.ox === nx && obj.oy === ny && obj.otyp === BOULDER) {
            hasBoulder = true; break;
        }
    }
    return (!isPool || isSwimmer)
        && (!isLava || likesLava)
        && (!hasBoulder || throwsRocks);
}

// C ref: dogmove.c:1371-1407 — can_reach_location(mon, mx, my, fx, fy)
// Recursive pathfinding: can monster navigate from (mx,my) to (fx,fy)?
// Uses greedy approach: only steps through cells closer to target.
export function can_reach_location(map, mon, mx, my, fx, fy) {
    if (mx === fx && my === fy) return true;
    if (!isok(mx, my)) return false;

    const d = dist2(mx, my, fx, fy);
    for (let i = mx - 1; i <= mx + 1; i++) {
        for (let j = my - 1; j <= my + 1; j++) {
            if (!isok(i, j)) continue;
            if (dist2(i, j, fx, fy) >= d) continue;
            const loc = map.at(i, j);
            if (!loc) continue;
            // C: IS_OBSTRUCTED(typ) = typ < POOL
            if (loc.typ < POOL) continue;
            // C: closed/locked doors block
            if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED)))
                continue;
            if (!could_reach_item(map, mon, i, j)) continue;
            if (can_reach_location(map, mon, i, j, fx, fy))
                return true;
        }
    }
    return false;
}

// C ref: dogmove.c droppables(mon)
// Pick next inventory item a tame monster is willing to drop.
function droppables(mon) {
    const inv = mon_inventory_items(mon);
    const mdat = mon.type || {};
    const wep = mon.weapon
        || inv.find((obj) => ((obj?.owornmask || 0) & W_WEP) !== 0)
        || null;
    const shield = inv.find((obj) => ((obj?.owornmask || 0) & W_ARMS) !== 0) || null;
    const dummy = { dummy: true, oartifact: 1 };
    let pickaxe = null;
    let unihorn = null;
    let key = null;
    const verysmall = (mdat.msize || 0) === MZ_TINY;

    if (is_animal(mdat) || is_mindless(mdat)) {
        pickaxe = unihorn = key = dummy;
    } else {
        if (!(mdat.flags1 & M1_TUNNEL) || !(mdat.flags1 & M1_NEEDPICK)) pickaxe = dummy;
        if (nohands(mdat) || verysmall) key = dummy;
    }
    if (wep) {
        if (wep.otyp === PICK_AXE || wep.otyp === DWARVISH_MATTOCK) pickaxe = wep;
        if (wep.otyp === UNICORN_HORN) unihorn = wep;
    }

    for (const obj of inv) {
        switch (obj.otyp) {
        case DWARVISH_MATTOCK:
            // C ref: dogmove.c droppables() — keep mattock if shielded.
            if (shield) break;
            if (pickaxe && pickaxe !== dummy
                && pickaxe.otyp === PICK_AXE
                && pickaxe !== wep
                && (!pickaxe.oartifact || obj.oartifact)) {
                return pickaxe;
            }
            // fall through
        case PICK_AXE:
            if (!pickaxe || (obj.oartifact && !pickaxe.oartifact)) {
                if (pickaxe && pickaxe !== dummy) return pickaxe;
                pickaxe = obj;
                continue;
            }
            break;
        case UNICORN_HORN:
            if (obj.cursed) break;
            if (!unihorn || (obj.oartifact && !unihorn.oartifact)) {
                if (unihorn && unihorn !== dummy) return unihorn;
                unihorn = obj;
                continue;
            }
            break;
        case SKELETON_KEY:
            if (key && key !== dummy
                && key.otyp === LOCK_PICK
                && (!key.oartifact || obj.oartifact)) {
                return key;
            }
            // fall through
        case LOCK_PICK:
            if (key && key !== dummy
                && key.otyp === CREDIT_CARD
                && (!key.oartifact || obj.oartifact)) {
                return key;
            }
            // fall through
        case CREDIT_CARD:
            if (!key || (obj.oartifact && !key.oartifact)) {
                if (key && key !== dummy) return key;
                key = obj;
                continue;
            }
            break;
        default:
            break;
        }
        // C ref: dogmove.c droppables() — generic drop candidates skip worn/wielded.
        // Cursed filtering is handled only for specific tool classes above.
        if (!obj.owornmask && obj !== wep) return obj;
    }
    return null;
}

// ========================================================================
// dog_invent — pet inventory management (pickup/drop at current position)
// C ref: dogmove.c:392-471
// Returns: 0 (no action), 1 (ate something), 2 (died)
// ========================================================================
async function dog_invent(mon, edog, udist, map, turnCount, display, player, fov = null) {
    if (helpless(mon) || mon.meating) {
        pushRngLogEntry(`^dog_invent_decision[${mon.mndx}@${mon.mx},${mon.my} ud=${udist} act=-1 otyp=-1 carry=0 rv=0]`);
        return 0;
    }
    const omx = mon.mx, omy = mon.my;
    let diagAct = 0;
    let diagOtyp = -1;
    let diagCarry = 0;

    const hasDrop = !!droppables(mon);

    if (hasDrop) {
        // C ref: dogmove.c:411-421 — drop path
        if (!rn2(udist + 1) || !rn2(edog.apport)) {
            if (rn2(10) < edog.apport) {
                let dropObj;
                while ((dropObj = droppables(mon)) != null) {
                    const canSeePet = display && player && (
                        fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my)
                    );
                    // C ref: steal.c:824 — name captured BEFORE extract_from_minvent/stackobj,
                    // so quantity reflects the pre-merge state of the dropped item.
                    // observeObject is called first so dknown is set for correct identification.
                    if (canSeePet) observeObject(dropObj);
                    const dropName = canSeePet ? doname(dropObj, null) : null;
                    mdrop_obj(mon, dropObj, map);
                    if (canSeePet) {
                        // C ref: weapon.c:766 — Monnam(mon) uses ARTICLE_THE
                        const monLabel = Monnam(mon);
                        await display.putstr_message(`${monLabel} drops ${dropName}.`);
                    }
                }
                if (edog.apport > 1) edog.apport--;
                edog.dropdist = udist;
                edog.droptime = turnCount;
                diagAct = 1;
            }
        }
    } else {
        // C ref: dogmove.c:423-470 — pickup/eat path
        // Find the top object at pet's position (last in array = top of C's chain)
        let obj = null;
        for (let i = map.objects.length - 1; i >= 0; i--) {
            if (map.objects[i].buried) continue;
            if (map.objects[i].ox === omx && map.objects[i].oy === omy) {
                obj = map.objects[i]; break;
            }
        }

        if (obj
            && obj.oclass !== BALL_CLASS
            && obj.oclass !== CHAIN_CLASS
            && obj.oclass !== ROCK_CLASS
            && !obj.achievement) {
            const edible = dogfood(mon, obj, turnCount);

            // C ref: dogmove.c:436-438 — eat if edible enough
            if ((edible <= CADAVER
                || (edog.mhpmax_penalty && edible === ACCFOOD))
                && could_reach_item(map, mon, obj.ox, obj.oy)) {
                const canSeePet = display && player && (
                    fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my)
                );
                if (canSeePet) {
                    await display.putstr_message(`${YMonnam(mon)} eats ${doname(obj, null)}.`);
                }
                await dog_eat(mon, obj, map, turnCount);
                pushRngLogEntry(`^dog_invent_decision[${mon.mndx}@${omx},${omy} ud=${udist} act=2 otyp=${obj.otyp} carry=0 rv=1]`);
                return 1;
            }

            // C ref: dogmove.c:440-467 — carry check
            const carryamt = can_carry(mon, obj, player);
            if (carryamt > 0 && !obj.cursed
                && could_reach_item(map, mon, obj.ox, obj.oy)) {
                if (rn2(20) < edog.apport + 3) {
                    if (rn2(udist) || !rn2(edog.apport)) {
                        // C ref: dogmove.c:452-454 — splitobj when carrying
                        // only part of a stack; leave remainder on the floor.
                        let picked = obj;
                        const quan = obj.quan || 1;
                        if (carryamt > 0 && carryamt < quan) {
                            obj.quan = quan - carryamt;
                            obj.owt = weight(obj);
                            // C ref: splitobj() allocates a new object, consuming
                            // next_ident() via newobj().
                            picked = { ...obj, quan: carryamt, o_id: next_ident() };
                            picked.owt = weight(picked);
                            // C ref: splitobj() leaves the split object on the
                            // floor list; mpickobj path then extracts it,
                            // emitting ^remove before ^pickup.
                            map.objects.splice(map.objects.length, 0, picked);
                            map.removeObject(picked);
                        } else {
                            map.removeObject(obj);
                        }
                        mpickobj(mon, picked);
                        // C ref: dogmove.c "The <pet> picks up <obj>." when observed.
                        const canSeePet = display && player && (
                            fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my)
                        );
                        if (canSeePet) {
                            observeObject(picked);
                            // C ref: dogmove.c:454 — Monnam(mtmp) uses ARTICLE_THE
                            const monLabel = Monnam(mon);
                            await display.putstr_message(`${monLabel} picks up ${doname(picked, null)}.`);
                        }
                        diagAct = 3;
                        diagOtyp = picked?.otyp ?? -1;
                        diagCarry = carryamt;
                    }
                }
            }
        }
    }
    pushRngLogEntry(`^dog_invent_decision[${mon.mndx}@${omx},${omy} ud=${udist} act=${diagAct} otyp=${diagOtyp} carry=${diagCarry} rv=0]`);
    return 0;
}

// ========================================================================
// Pet ranged attack evaluation
// C ref: dogmove.c find_targ(), score_targ(), best_target(), pet_ranged_attk()
// ========================================================================

// C ref: dogmove.c:654-696 find_targ() — find first visible monster along a line
//
// CRITICAL FOR RNG ALIGNMENT: C checks mtmp->mux/muy (pet's tracked player
// position) along the scan line. If the player is in the path, find_targ
// returns &gy.youmonst, which score_targ handles with an early -3000 return
// BEFORE consuming rnd(5). For tame pets, mux/muy always equals the player's
// actual position (see set_apparxy in monmove.c:2211-2214).
//
// Without this check, JS scans past the player and finds monsters beyond,
// consuming extra rnd(5) calls that C never makes. This is a recurring bug
// pattern — see memory/pet_ranged_attk_bug.md for full documentation.
function find_targ(mon, dx, dy, maxdist, map, player) {
    const mux = Number.isInteger(mon.mux) ? mon.mux : 0;
    const muy = Number.isInteger(mon.muy) ? mon.muy : 0;
    let curx = mon.mx, cury = mon.my;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury)) break;
        // C ref: dogmove.c:679 — if pet can't see this cell, stop
        if (!m_cansee(mon, map, curx, cury)) break;
        // C ref: dogmove.c:682-683 — if pet thinks player is here, return player
        // Uses mtmp->mux/muy (apparent player position), not always u.ux/u.uy.
        if (curx === mux && cury === muy) {
            return { isPlayer: true, mx: player.x, my: player.y };
        }
        // C ref: dogmove.c:685-693 — check for monster at position
        const targ = map.monsterAt(curx, cury);
        if (targ && !targ.dead) {
            // C ref: dogmove.c:687-690 — must be visible to the pet and not hidden
            const perceiveInvis = !!(mons[mon.mndx]?.flags1 & M1_SEE_INVIS);
            if ((!targ.minvis || perceiveInvis) && !targ.mundetected) {
                return targ;
            }
            // Pet can't see it — clear target and keep scanning
        }
    }
    return null;
}

// C ref: dogmove.c:698-740 find_friends() — check if allies are behind target
// Scans beyond the target in the same direction to see if the player or
// tame monsters are in the line of fire. Returns 1 if so (pet should not fire).
export function find_friends(mon, target, maxdist, map, player) {
    const dx = Math.sign(target.mx - mon.mx);
    const dy = Math.sign(target.my - mon.my);
    const mux = Number.isInteger(mon.mux) ? mon.mux : 0;
    const muy = Number.isInteger(mon.muy) ? mon.muy : 0;
    let curx = target.mx, cury = target.my;
    let dist = Math.max(Math.abs(target.mx - mon.mx), Math.abs(target.my - mon.my));

    for (; dist <= maxdist; ++dist) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury)) return false;
        // C ref: dogmove.c:717-718 — if pet can't see beyond, stop
        if (!m_cansee(mon, map, curx, cury)) return false;
        // C ref: dogmove.c:721-722 — player behind target
        if (curx === mux && cury === muy) return true;
        // C ref: dogmove.c:724-736 — tame monster behind target
        const pal = map.monsterAt(curx, cury);
        if (pal && !pal.dead) {
            if (pal.tame) {
                const perceiveInvis = !!(mons[mon.mndx]?.flags1 & M1_SEE_INVIS);
                if (!pal.minvis || perceiveInvis) return true;
            }
            // Quest leaders/guardians — skip for now (not in early game)
        }
    }
    return false;
}

// C ref: dogmove.c:742-840 score_targ() — evaluate target attractiveness
//
// RNG CRITICAL: rnd(5) fuzz factor at line 835, rn2(3) if confused at 753/837.
// Several early returns (lines 774, 778, 783, 789, 794) exit BEFORE consuming
// rnd(5). The player target (isPlayer) hits line 786→789 returning -3000 before
// rnd(5) — this is critical for RNG alignment.
//
// For vampire shifters (line 818), rn2() is consumed. Not relevant for early
// game pets but included for correctness.
function score_targ(mon, target, map, player) {
    let score = 0;
    // C ref: dogmove.c:753 — if not confused, or 1-in-3 chance, do full scoring
    if (!mon.confused || !rn2(3)) {
        // C ref: dogmove.c:758-769 — alignment checks (minions/priests)
        // Simplified: early-game monsters are not minions/priests

        // C ref: dogmove.c:771-774 — quest friendlies (not in early game)

        // C ref: dogmove.c:776-779 — coaligned priests (not in early game)

        // C ref: dogmove.c:780-783 — adjacent targets penalized
        const dm = Math.max(Math.abs(mon.mx - target.mx), Math.abs(mon.my - target.my));
        if (dm <= 1) {
            score -= 3000;
            return score;
        }
        // C ref: dogmove.c:785-789 — tame monsters and player never targeted
        // Returns BEFORE rnd(5) at line 835
        if (target.tame || target.isPlayer) {
            score -= 3000;
            return score;
        }
        // C ref: dogmove.c:791-794 — friends behind target
        if (find_friends(mon, target, 15, map, player)) {
            score -= 3000;
            return score;
        }
        // C ref: dogmove.c:797-798 — hostile bonus
        if (!target.peaceful) score += 10;
        // C ref: dogmove.c:800-801 — passive monster penalty
        const mdat = mons[target.mndx];
        if (mdat && mdat.attacks && mdat.attacks[0] && mdat.attacks[0].type === 0) {
            score -= 1000;
        }
        // C ref: dogmove.c:804-807 — weak target penalty
        const targLev = target.m_lev || 0;
        const monLev = mon.m_lev || 0;
        if ((targLev < 2 && monLev > 5)
            || (monLev > 12 && targLev < monLev - 9)) {
            score -= 25;
        }
        // C ref: dogmove.c:813-822 — vampire shifter level adjustment
        // rn2() consumed here for vampire shifters — not relevant early game
        let mtmpLev = monLev;
        // (vampire shifter check omitted — no vampires in early game)

        // C ref: dogmove.c:826-827 — vastly stronger foe penalty
        if (targLev > mtmpLev + 4)
            score -= (targLev - mtmpLev) * 20;
        // C ref: dogmove.c:831 — beefiest monster bonus
        score += targLev * 2 + Math.floor((target.mhp || 0) / 3);
    }
    // C ref: dogmove.c:835 — fuzz factor (consumed for all targets that reach here)
    score += rnd(5);
    // C ref: dogmove.c:837-838 — confused penalty
    if (mon.confused && !rn2(3)) score -= 1000;
    return score;
}

// C ref: dogmove.c:842-890 best_target() — find best ranged attack target
export function best_target(mon, forced, map, player) {
    // C ref: dogmove.c:854 — if (!mtmp->mcansee) return 0;
    const monCanSee = (mon.mcansee !== 0 && mon.mcansee !== false)
        && !mon.blind
        && !(Number.isFinite(mon.mblinded) && mon.mblinded > 0)
        && !mon.mblind;
    if (!monCanSee) return null;
    let bestscore = -40000;
    let bestTarg = null;
    // C ref: dogmove.c:861-882 — scan all 8 directions
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const targ = find_targ(mon, dx, dy, 7, map, player);
            if (!targ) continue;
            const currscore = score_targ(mon, targ, map, player);
            if (currscore > bestscore) {
                bestscore = currscore;
                bestTarg = targ;
            }
        }
    }
    // C ref: dogmove.c:886-887 — filter negative scores
    if (!forced && bestscore < 0) bestTarg = null;
    return bestTarg;
}

// C ref: dogmove.c:892-970 pet_ranged_attk() — pet considers ranged attack
// For early game pets (dogs/cats), they have no ranged attacks,
// but best_target still evaluates targets (consuming RNG via score_targ).
// The actual attack path (mattackm) is not reached for melee-only pets.
export async function pet_ranged_attk(mon, map, player, display, fov = null, game = null, hungry = false) {
    const mtarg = best_target(mon, false, map, player);
    // C ref: dogmove.c:912-970 — if target exists, pet may attempt attack.
    if (!mtarg) return 0;
    // C ref: dogmove.c:897 — hungry pets only attack 1 in 5
    if (hungry && rn2(5)) return 0;
    if (mtarg.isPlayer) {
        await mattacku(mon, player, display, game);
        return 1; // acted (MMOVE_DONE)
    }
    // C ref: dogmove.c:918 — mattackm(mtmp, mtarg)
    const monVisible = fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my);
    const targVisible = fov?.canSee ? fov.canSee(mtarg.mx, mtarg.my) : couldsee(map, player, mtarg.mx, mtarg.my);
    const vis = monVisible || targVisible;
    const turnCount = (player.turns || 0) + 1;
    const agrSpot = canSpotMonsterForMap(mon, map, player, fov);
    const defSpot = canSpotMonsterForMap(mtarg, map, player, fov);
    const ctx = { player, fov, turnCount, agrVisible: agrSpot, defVisible: defSpot };
    const mstatus = await mattackm(mon, mtarg, display, vis, map, ctx);
    if (mstatus & M_ATTK_AGR_DIED) return 1;
    // C ref: dogmove.c:928-944 — retaliation for ranged attack
    if ((mstatus & M_ATTK_HIT) && !(mstatus & M_ATTK_DEF_DIED)
        && rn2(4)) {
        if (mtarg.mcansee !== 0 && mtarg.mcansee !== false) {
            const rctx = { ...ctx, agrVisible: defSpot, defVisible: agrSpot };
            const rstatus = await mattackm(mtarg, mon, display, vis, map, rctx);
            if (rstatus & M_ATTK_DEF_DIED) return 1;
        }
    }
    if (mstatus !== 0) return 1; // MMOVE_DONE — pet acted
    return 0; // M_ATTK_MISS — no action taken
}

// ========================================================================
// dog_move — tame pet AI
// ========================================================================

// C ref: dogmove.c dog_move() — full pet movement logic
// Returns: -2 (skip), 0 (stay), 1 (moved), 2 (moved+ate)
export async function dog_move(mon, map, player, display, fov, after = false, game = null) {
    const omx = mon.mx, omy = mon.my;
    // C ref: hack.h #define distu(xx,yy) dist2(xx,yy,u.ux,u.uy)
    const udist = dist2(omx, omy, player.x, player.y);
    const edogRaw = mon.edog || null;
    const edog = edogRaw || { apport: 0, hungrytime: 1000, whistletime: 0 };
    // C ref: dog_move uses svm.moves which is incremented at end of turn,
    // so during movemon() svm.moves = (completed turns + 1).
    // JS player.turns is incremented after movemon(), so add 1 to match C.
    const turnCount = (player.turns || 0) + 1;
    const env = (typeof process !== 'undefined' && process.env) ? process.env : null;
    const dogGoalTraceStep = env?.WEBHACK_DOGGOAL_TRACE_STEP;
    const dogGoalTraceEnabled = !!dogGoalTraceStep;
    const dogGoalStepLabel = monmoveStepLabel(map);
    const traceDogGoal = dogGoalTraceEnabled
        && (dogGoalTraceStep === dogGoalStepLabel || dogGoalTraceStep === '*');
    // C ref: dog_diag_events_enabled() checks WEBHACK_DIAG_EVENTS env var
    // Event parity mode: dog_goal* diagnostics are now canonical session events.
    const dogDiagEvents = true;

    // C ref: dogmove.c:1005-1006 — hunger check (before dog_invent)
    if (edogRaw && await dog_hunger(mon, edogRaw, turnCount, map, display, player, fov))
        return 2; // MMOVE_DIED — starved

    // C ref: dogmove.c:1010-1015 — steed check (Conflict dismount)
    // TODO: not yet implemented (no riding in JS)

    // C ref: dogmove.c:1024-1030 — dog_invent before dog_goal
    // When dog_invent returns 1 (ate), C does goto newdogpos.
    // Since nix==omx at that point, no movement occurs — return MMOVE_MOVED.
    if (edog) {
        const invResult = await dog_invent(mon, edog, udist, map, turnCount, display, player, fov);
        if (invResult === 1) return 1; // ate — C: goto newdogpos, no movement
        if (invResult === 2) return 0; // died
    }

    // C ref: dogmove.c:1040-1048 — Conflict check
    // TODO: Conflict property not yet tracked on player; guardian angel logic omitted

    // C ref: dogmove.c — whappr = (monstermoves - edog->whistletime < 5)
    const whappr = (turnCount - edog.whistletime) < 5 ? 1 : 0;

    // dog_goal — scan nearby objects for food/items
    // C ref: dogmove.c dog_goal():500-554
    let gx = 0, gy = 0, gtyp = UNDEF;
    const minX = Math.max(1, omx - SQSRCHRADIUS);
    const maxX = Math.min(COLNO - 1, omx + SQSRCHRADIUS);
    const minY = Math.max(0, omy - SQSRCHRADIUS);
    const maxY = Math.min(ROWNO - 1, omy + SQSRCHRADIUS);

    // C ref: in_masters_sight = couldsee(omx, omy)
    const inMastersSight = (fov && typeof fov.couldSee === 'function')
        ? !!fov.couldSee(omx, omy)
        : couldsee(map, player, omx, omy);

    // C ref: dogmove.c:498 — dog_has_minvent = (droppables(mtmp) != 0)
    const dogHasMinvent = !!droppables(mon);

    // C ref: dogmove.c:545 — lighting check for apport branch
    const dogLoc = map.at(omx, omy);
    const playerLoc0 = map.at(player.x, player.y);
    const dogLit = !!(dogLoc && dogLoc.lit);
    const playerLit = !!(playerLoc0 && playerLoc0.lit);

    // C ref: dogmove.c:498-555
    // Pets without EDOG (or leashed pets) don't pick object goals.
    if (!edogRaw || mon.mleashed) {
        gtyp = APPORT;
        gx = player.x;
        gy = player.y;
    } else {
        if (traceDogGoal) {
            console.log('[DOGGOAL_TRACE]',
                `step=${dogGoalStepLabel}`,
                `mon=${mon.m_id ?? '?'}`,
                `pos=(${omx},${omy})`,
                `range=[${minX}..${maxX}]x[${minY}..${maxY}]`,
                `objects=${map.objects.length}`);
        }
        // C ref: dog_goal_start event (inside else block, after range computed)
        if (dogDiagEvents)
            pushRngLogEntry(`^dog_goal_start[M${mon.m_id}@${omx},${omy} apport=${edog.apport} minvent=${dogHasMinvent ? 1 : 0} ims=${inMastersSight ? 1 : 0} range=[${minX}..${maxX}]x[${minY}..${maxY}]]`);
        // C ref: dog_goal iterates fobj (ALL objects on level)
        // C's fobj is LIFO (place_object prepends), so iterate in reverse to match
        // C's fobj excludes buried objects (those are on buriedobjlist, a separate list)
        for (let oi = map.objects.length - 1; oi >= 0; oi--) {
            const obj = map.objects[oi];
            if (obj.buried) continue;
            const ox = obj.ox, oy = obj.oy;

            if (ox < minX || ox > maxX || oy < minY || oy > maxY) continue;

            if (traceDogGoal) {
                console.log('[DOGGOAL_TRACE]',
                    `step=${dogGoalStepLabel}`,
                    `mon=${mon.m_id ?? '?'}`,
                    `oi=${oi}`,
                    `obj=${obj?.o_id ?? '?'}`,
                    `otyp=${obj?.otyp ?? '?'}`,
                    `xy=(${ox},${oy})`,
                    `cursed=${obj?.cursed ? 1 : 0}`,
                    `opoisoned=${obj?.opoisoned ? 1 : 0}`);
            }

            const otyp = dogfood(mon, obj, turnCount);
            // C ref: dogmove.c:526 — skip inferior goals
            if (otyp > gtyp || otyp === UNDEF) {
                if (dogDiagEvents)
                    pushRngLogEntry(`^dog_goal_obj[M${mon.m_id} oid=${obj.o_id}@${ox},${oy} food=${otyp} skip=inf]`);
                continue;
            }

            // C ref: dogmove.c:529-531 — skip cursed POSITIONS unless starving
            // C uses cursed_object_at(nx, ny) which checks ALL objects at position
            if (cursed_object_at(map, ox, oy)
                && !(edog.mhpmax_penalty && otyp < MANFOOD)) {
                if (dogDiagEvents)
                    pushRngLogEntry(`^dog_goal_obj[M${mon.m_id} oid=${obj.o_id}@${ox},${oy} food=${otyp} skip=cur]`);
                continue;
            }

            // C ref: dogmove.c:533-535 — skip unreachable goals
            if (!could_reach_item(map, mon, ox, oy)
                || !can_reach_location(map, mon, omx, omy, ox, oy)) {
                if (dogDiagEvents)
                    pushRngLogEntry(`^dog_goal_obj[M${mon.m_id} oid=${obj.o_id}@${ox},${oy} food=${otyp} skip=rch]`);
                continue;
            }

            if (otyp < MANFOOD) {
                // Good food — direct goal
                // C ref: dogmove.c:536-542
                if (otyp < gtyp || dist2(ox, oy, omx, omy) < dist2(gx, gy, omx, omy)) {
                    if (dogDiagEvents)
                        pushRngLogEntry(`^dog_goal_obj[M${mon.m_id} oid=${obj.o_id}@${ox},${oy} food=${otyp} sel=1]`);
                    gx = ox; gy = oy; gtyp = otyp;
                } else {
                    if (dogDiagEvents)
                        pushRngLogEntry(`^dog_goal_obj[M${mon.m_id} oid=${obj.o_id}@${ox},${oy} food=${otyp} sel=0]`);
                }
            } else if (gtyp === UNDEF && inMastersSight
                    && !dogHasMinvent
                    && (!dogLit || playerLit)
                    && (otyp === MANFOOD || m_cansee(mon, map, ox, oy))) {
                // C ref: dogmove.c:543-552 — APPORT/MANFOOD with apport+carry check
                // aproll extracted from condition so we can log it (mirrors C restructuring)
                const aproll = rn2(8);
                const carryRes = (edog.apport > aproll) ? can_carry(mon, obj, player) : 0;
                if (dogDiagEvents)
                    pushRngLogEntry(`^dog_goal_obj[M${mon.m_id} oid=${obj.o_id}@${ox},${oy} food=${otyp} apport=${edog.apport} rn2_8=${aproll} carry=${carryRes} sel=${(edog.apport > aproll && carryRes > 0) ? 1 : 0}]`);
                if (edog.apport > aproll && carryRes > 0) {
                    gx = ox; gy = oy; gtyp = APPORT;
                }
            } else if (dogDiagEvents) {
                pushRngLogEntry(`^dog_goal_obj[M${mon.m_id} oid=${obj.o_id}@${ox},${oy} food=${otyp} skip=apc]`);
            }
        }
    }
    // Follow player logic
    // C ref: dogmove.c:567-609
    let appr = 0;
    if (gtyp === UNDEF || (gtyp !== DOGFOOD && gtyp !== APPORT
                           && turnCount < edog.hungrytime)) {
        // No good goal found — follow player
        gx = player.x; gy = player.y;

        // C ref: dogmove.c:565-566 — if called from "after" path and already
        // adjacent to the hero's square, skip movement this turn.
        if (after && udist <= 4) {
            return 0;
        }

        appr = (udist >= 9) ? 1 : (mon.flee) ? -1 : 0;

        if (udist > 1) {
            // C ref: dogmove.c:575-578 — approach check
            const playerLoc = map.at(player.x, player.y);
            const playerInRoom = playerLoc && IS_ROOM(playerLoc.typ);
            if (!playerInRoom || !rn2(4) || whappr
                || (dogHasMinvent && rn2(edog.apport))) {
                appr = 1;
            }
        }

        // C ref: dogmove.c:583-606 — check stairs, food in inventory, portal
        if (appr === 0) {
            // C ref: On_stairs(u.ux, u.uy) — checks ALL stairway types
            // (regular stairs, ladders, branch stairs)
            const onStairs = (player.x === map.upstair?.x && player.y === map.upstair?.y)
                || (player.x === map.dnstair?.x && player.y === map.dnstair?.y)
                || (player.x === map.upladder?.x && player.y === map.upladder?.y)
                || (player.x === map.dnladder?.x && player.y === map.dnladder?.y);
            const pLoc = map.at(player.x, player.y);
            // C ref: On_stairs() checks stairway_at() which maintains a
            // linked list of ALL stairways (regular, ladders, branch).
            // JS tracks only one up/down stair, so also check the tile type
            // as a fallback for any untracked branch stairs or ladders.
            const onStairsOrTile = onStairs
                || (pLoc && (pLoc.typ === STAIRS || pLoc.typ === LADDER));
            if (onStairsOrTile) {
                appr = 1;
            } else {
                // C ref: scan player inventory for DOGFOOD items
                // C iterates gi.invent in linked-list order, maintained by
                // reorder_invent() which sorts by inv_rank(o) = o->invlet ^ 040.
                // Each dogfood() call consumes rn2(100) via obj_resists.
                // Must iterate in same order as C to keep RNG aligned.
                const invItems = [...player.inventory].sort((a, b) => {
                    const ra = ((a?.invlet || '').charCodeAt(0) ^ 32);
                    const rb = ((b?.invlet || '').charCodeAt(0) ^ 32);
                    return ra - rb;
                });
                for (const invObj of invItems) {
                    const invFood = dogfood(mon, invObj, turnCount);
                    if (invFood === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                }
                // C ref: dogmove.c:586-595 — magic portal proximity also
                // makes pets follow more tightly.
                if (appr === 0) {
                    for (const trap of map.traps || []) {
                        if (trap && trap.ttyp === MAGIC_PORTAL) {
                            const dx = trap.tx - player.x;
                            const dy = trap.ty - player.y;
                            if ((dx * dx + dy * dy) <= 2) appr = 1;
                            break;
                        }
                    }
                }
            }
        }
    } else {
        // Good goal exists
        appr = 1;
    }

    // C ref: dogmove.c:610-611 — confused pets don't approach or flee
    if (mon.confused) appr = 0;

    // C ref: dogmove.c:603-637 — redirect goal when pet can't see master
    if (gx === player.x && gy === player.y && !inMastersSight) {
        const cp = gettrack(omx, omy);
        if (cp) {
            gx = cp.x; gy = cp.y;
            if (edog) edog.ogoal.x = 0;
        } else {
            if (edog && edog.ogoal.x
                && (edog.ogoal.x !== omx || edog.ogoal.y !== omy)) {
                gx = edog.ogoal.x; gy = edog.ogoal.y;
                edog.ogoal.x = 0;
            } else {
                let fardist = FARAWAY * FARAWAY;
                gx = FARAWAY; gy = FARAWAY;
                // C ref: do_clear_area(omx, omy, 9, wantdoor, &fardist)
                // wantdoor finds visible-from-pet position closest to player
                const wdState = { dist: fardist };
                await do_clear_area(fov, map, omx, omy, 9, (x, y, st) => {
                    const ndist = dist2(x, y, player.x, player.y);
                    if (st.dist > ndist) {
                        gx = x; gy = y; st.dist = ndist;
                    }
                }, wdState);
                if (gx === FARAWAY || (gx === omx && gy === omy)) {
                    gx = player.x; gy = player.y;
                } else if (edog) {
                    edog.ogoal.x = gx; edog.ogoal.y = gy;
                }
            }
        }
    } else if (edog) {
        edog.ogoal.x = 0;
    }

    // C ref: dog_goal_end event — emitted after goal/appr are fully determined
    if (dogDiagEvents)
        pushRngLogEntry(`^dog_goal_end[M${mon.m_id} goal=${gx},${gy} gtyp=${gtyp} appr=${appr}]`);

    // ========================================================================
    // Position evaluation loop — uses mfndpos for C-faithful position collection
    // C ref: dogmove.c:1063-1268
    // ========================================================================

    // Collect valid positions (column-major order, no stay pos, boulder filter)
    const allowflags = mon_allowflags(mon, player);
    const positions = mfndpos(mon, map, player, allowflags);
    const cnt = positions.length;
    pushRngLogEntry(`^dog_move_entry[${mon.mndx}@${omx},${omy} goal=${gx},${gy} appr=${appr}]`);
    pushRngLogEntry(`^dog_move_mfndpos[cnt=${cnt} flags=0x${(allowflags >>> 0).toString(16)}]`);
    monmoveTrace('dog_move-begin',
        `step=${(Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?')}`,
        `id=${mon.m_id ?? '?'}`,
        `name=${mon.type?.name || mon.name || '?'}`,
        `pos=(${omx},${omy})`,
        `goal=(${gx},${gy})`,
        `appr=${appr}`,
        `udist=${udist}`,
        `whappr=${whappr}`,
        `cnt=${cnt}`,
        `poss=${positions.map((p) => `(${p.x},${p.y})`).join(' ')}`);
    let nix = omx, niy = omy;
    let nidist = dist2(omx, omy, gx, gy);
    let chcnt = 0;
    let chi = -1;
    let uncursedcnt = 0;
    const cursemsg = new Array(cnt).fill(false);

    // First pass: count uncursed positions
    // C ref: dogmove.c:1063-1072
    for (let i = 0; i < cnt; i++) {
        const nx = positions[i].x, ny = positions[i].y;
        if (map.monsterAt(nx, ny) && !positions[i].allowM && !positions[i].allowMDisp) {
            continue;
        }
        if (cursed_object_at(map, nx, ny)) continue;
        uncursedcnt++;
    }

    // Second pass: evaluate positions
    // C ref: dogmove.c:1088-1268
    // C ref: distmin check for backtrack avoidance (hoisted from loop)
    let do_eat = false;
    let eatObj = null;
    const distmin_pu = Math.max(Math.abs(omx - player.x), Math.abs(omy - player.y));
    for (let i = 0; i < cnt; i++) {
        const nx = positions[i].x, ny = positions[i].y;
        // C ref: dogmove.c:1086-1088 — if leashed, we drag the pet along.
        if (mon.mleashed && dist2(nx, ny, player.x, player.y) > 4) {
            continue;
        }

        // C ref: dogmove.c:1090-1092 — guardian angel stays within 16 squares
        if (!edogRaw) {
            const nd = dist2(nx, ny, player.x, player.y);
            if (nd > 16 && nd >= udist) continue;
        }

        // C ref: dogmove.c:1088-1166 — pet melee against adjacent monster.
        // Minimal faithful path: consume mattackm to-hit roll and stop after
        // one melee attempt (MMOVE_DONE) like C.
        if (positions[i].allowM) {
            const target = map.monsterAt(nx, ny);
            if (target && !target.dead) {
                // C ref: dogmove.c:1114-1128 — balk if target too strong/dangerous.
                const balk = (mon.m_lev || 1)
                    + Math.floor((5 * (mon.mhp || 1)) / Math.max(1, mon.mhpmax || 1))
                    - 2;
                if ((target.m_lev || 0) >= balk
                    || (target.tame && mon.tame)
                    || (target.peaceful && (mon.mhp || 1) * 4 < Math.max(1, mon.mhpmax || 1))) {
                    continue;
                }

                // C ref: dogmove.c:1124-1135 — Floating Eye, Gelatinous Cube, petrifier avoidance.
                // CRITICAL FOR RNG ALIGNMENT: rn2(10) consumed when target is one of these.
                // JS vs C: C also checks mon_reflects(mtmp) for Floating Eye and uses
                // best_target() fallback for ranged-only attack. JS simplified to always
                // skip (continue) since early-game pets have no ranged attacks.
                {
                    const tdat = mons[target.mndx] || target.type || {};
                    const mondat = mons[mon.mndx] || mon.type || {};
                    const monCanSee = (mon.mcansee !== 0 && mon.mcansee !== false)
                        && !mon.blind
                        && !(Number.isFinite(mon.mblinded) && mon.mblinded > 0)
                        && !mon.mblind;
                    const targCanSee = (target.mcansee !== 0 && target.mcansee !== false)
                        && !target.blind
                        && !(Number.isFinite(target.mblinded) && target.mblinded > 0)
                        && !target.mblind;
                    const isFloatingEye = target.mndx === PM_FLOATING_EYE;
                    const isGelCube = target.mndx === PM_GELATINOUS_CUBE;
                    const isPetrifier = touch_petrifies(tdat);
                    let skipTarget = false;
                    if (isFloatingEye && rn2(10)
                        && monCanSee && haseyes(mondat) && targCanSee
                        && (!target.minvis || !!(mondat.flags1 & M1_SEE_INVIS))) {
                        skipTarget = true;
                    } else if (isGelCube && rn2(10)) {
                        skipTarget = true;
                    } else if (isPetrifier && !resists_ston(mon)) {
                        skipTarget = true;
                    }
                if (skipTarget) continue;
            }

                // C ref: dogmove.c:1141 — only attack once per move
                if (after) return 0;

                // C ref: dogmove.c:1144-1146 — visibility for combat messages
                const monVisible = fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my);
                const targetVisible = fov?.canSee ? fov.canSee(target.mx, target.my) : couldsee(map, player, target.mx, target.my);
                const mmVisible = monVisible || targetVisible;
                if (mmVisible) {
                    if (!canSpotMonsterForMap(mon, map, player, fov)) {
                        map_invisible(map, mon.mx, mon.my, player);
                    }
                    if (!canSpotMonsterForMap(target, map, player, fov)) {
                        map_invisible(map, target.mx, target.my, player);
                    }
                }

                // C ref: dogmove.c:1146 — mattackm(mtmp, mtmp2)
                const monSpot = canSpotMonsterForMap(mon, map, player, fov);
                const targetSpot = canSpotMonsterForMap(target, map, player, fov);
                const ctx = { player, fov, turnCount, agrVisible: monSpot, defVisible: targetSpot };
                const mstatus = await mattackm(mon, target, display, mmVisible, map, ctx);

                // C ref: dogmove.c:1148-1150 — pet died
                if (mstatus & M_ATTK_AGR_DIED) return 0;

                // C ref: dogmove.c:1152-1163 — retaliation
                if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                    && rn2(4)
                    && target.mlstmv !== turnCount
                    && !onscary(map, mon.mx, mon.my, target)
                    && monnear(target, mon.mx, mon.my)) {
                    const rctx = { ...ctx, agrVisible: targetSpot, defVisible: monSpot };
                    const rstatus = await mattackm(target, mon, display, mmVisible, map, rctx);
                    if (rstatus & M_ATTK_DEF_DIED) return 0;
                }
                return 0; // MMOVE_DONE
            }
        }

        // C ref: monmove.c m_avoid_kicked_loc() via dogmove.c:1177
        if (m_avoid_kicked_loc(mon, nx, ny, player)) {
            continue;
        }
        if (m_avoid_soko_push_loc(mon, nx, ny, map, player)) {
            continue;
        }

        // Trap avoidance — C ref: dogmove.c:1182-1204
        // Pets avoid harmful seen traps with 39/40 probability
        // Only check if mfndpos flagged this position as having a trap (ALLOW_TRAPS)
        if (positions[i].allowTraps) {
            const trap = map.trapAt(nx, ny);
            if (trap && !m_harmless_trap(mon, trap)) {
                if (mon.mleashed) {
                    // C ref: dogmove.c:1193-1195 — leashed pet whimper at trap
                    // (sound message omitted — no Deaf check yet)
                } else {
                    if (trap.tseen && rn2(40)) {
                        continue;
                    }
                }
            }
        }

        // Check for food at adjacent position
        // C ref: dogmove.c:1207-1227 — dogfood check at position
        // If food found, goto newdogpos (skip rest of loop)
        if (edog) {
            let foundFood = false;
            const canReachFood = could_reach_item(map, mon, nx, ny);
            for (let oi = map.objects.length - 1; oi >= 0; oi--) {
                const obj = map.objects[oi];
                if (obj.buried) continue;
                if (obj.ox !== nx || obj.oy !== ny) continue;
                if (obj.cursed) {
                    cursemsg[i] = true;
                } else if (canReachFood) {
                    const otyp = dogfood(mon, obj, turnCount);
                    if (otyp < MANFOOD
                        && (otyp < ACCFOOD || turnCount >= edog.hungrytime)) {
                        nix = nx; niy = ny; chi = i;
                        do_eat = true;
                        eatObj = obj;
                        foundFood = true;
                        cursemsg[i] = false; // C ref: not reluctant
                        break;
                    }
                }
            }
            if (foundFood) break; // goto newdogpos
        }

        // Cursed avoidance
        // C ref: dogmove.c:1230-1232
        if (cursemsg[i] && !mon.mleashed && uncursedcnt > 0 && rn2(13 * uncursedcnt)) {
            continue;
        }

        // Track backtracking avoidance
        // C ref: dogmove.c:1239-1245 — only if not leashed and far from player
        // distmin > 5 check prevents backtrack avoidance when close to player
        // k = edog ? uncursedcnt : cnt; limit j < MTSZ && j < k - 1
        if (!mon.mleashed && mon.mtrack && distmin_pu > 5) {
            const k = edog ? uncursedcnt : cnt;
            let skipThis = false;
            for (let j = 0; j < MTSZ && j < k - 1; j++) {
                if (nx === mon.mtrack[j].x && ny === mon.mtrack[j].y) {
                    if (rn2(MTSZ * (k - j))) {
                        skipThis = true;
                        break;
                    }
                    // C ref: dogmove.c:1242-1244
                    // If rn2(...) == 0, keep scanning later mtrack entries.
                    // Duplicate coordinates can consume additional rn2() calls.
                }
            }
            if (skipThis) {
                continue;
            }
        }

        // Distance comparison
        // C ref: dogmove.c:1247-1257
        const ndist = dist2(nx, ny, gx, gy);
        const j = (ndist - nidist) * appr;
        if ((j === 0 && !rn2(++chcnt)) || j < 0
            || (j > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0) chcnt = 0;
            chi = i;
        }
    }

    // C ref: dogmove.c:1274-1279 — pet ranged attack before newdogpos
    // IMPORTANT: In C, when food is found (goto newdogpos at line 1236),
    // this code is SKIPPED because the goto jumps past it. Only execute
    // pet_ranged_attk when the pet didn't find food to eat.
    // Even if pet has no ranged attacks, best_target still evaluates
    // all visible monsters and calls score_targ (consuming rnd(5) each).
    if (!do_eat) {
        // C ref: dogmove.c:897-901 — hungry flag for pet_ranged_attk
        const hungry = edogRaw && (turnCount > edog.hungrytime + DOG_HUNGRY);
        const ranged = await pet_ranged_attk(mon, map, player, display, fov, null, hungry);
        if (ranged) return 0;
    }

    // Move the dog
    // C ref: dogmove.c:1274-1348 — newdogpos label
    pushRngLogEntry(`^dog_move_choice[${mon.mndx}@${omx},${omy} pick=${nix},${niy} chi=${chi} do_eat=${do_eat ? 1 : 0} cnt=${cnt} appr=${appr}]`);
    if (nix !== omx || niy !== omy) {
        pushRngLogEntry(`^dog_move_exit[${mon.mndx}@${omx},${omy}->${nix},${niy} chi=${chi} do_eat=${do_eat ? 1 : 0}]`);
        monmoveTrace('dog_move-pick',
            `step=${(Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?')}`,
            `id=${mon.m_id ?? '?'}`,
            `name=${mon.type?.name || mon.name || '?'}`,
            `from=(${omx},${omy})`,
            `to=(${nix},${niy})`,
            `chi=${chi}`,
            `nidist=${nidist}`,
            `do_eat=${do_eat ? 1 : 0}`);

        // C ref: dogmove.c:1274-1282 — ALLOW_U: pet chose player position
        // JS vs C: JS mfndpos currently skips the player position entirely
        // (no ALLOW_U flag), so this branch never triggers. C's mfndpos can
        // include the player position with ALLOW_U for tame pets in Conflict.
        if (chi >= 0 && positions[chi] && positions[chi].allowU) {
            if (mon.mleashed) {
                if (display) {
                    await display.putstr_message(`${Monnam(mon)} breaks loose of ${mon.female ? 'her' : 'his'} leash!`);
                }
                mon.mleashed = false;
            }
            await mattacku(mon, player, display, game);
            return 0; // MMOVE_DONE
        }

        // C ref: dogmove.c:1292-1306 — reluctant step on cursed item
        // JS vs C: C uses noit_Monnam() with locomotion() verb ("steps"),
        // checks is_flyer/is_floater for "over" vs "onto", and describes the
        // top item via distant_name(). JS simplified to generic message.
        if (chi >= 0 && cursemsg[chi]) {
            const canSeePet = display && player && (
                fov?.canSee ? fov.canSee(mon.mx, mon.my) || fov.canSee(nix, niy)
                    : couldsee(map, player, mon.mx, mon.my) || couldsee(map, player, nix, niy)
            );
            if (canSeePet && display) {
                await display.putstr_message(`${YMonnam(mon)} moves reluctantly.`);
            }
        }

        // Update track history (shift old positions, add current)
        // C ref: dogmove.c:1319 — mon_track_add(mtmp, omx, omy)
        mon_track_add(mon, omx, omy);
        // C ref: remove_monster/place_monster → newsym at old+new positions
        mon.mx = nix;
        mon.my = niy;
        newsym(omx, omy);
        newsym(nix, niy);

        // C ref: dogmove.c:1324-1327 — eat after moving
        if (do_eat && eatObj) {
            const sawPet = fov?.canSee ? fov.canSee(omx, omy) : couldsee(map, player, omx, omy);
            const seeObj = fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my);
            if (display && (sawPet || seeObj)) {
                await display.putstr_message(`${YMonnam(mon)} eats ${doname(eatObj, null)}.`);
            }
            await dog_eat(mon, eatObj, map, turnCount);
        }
    } else if (mon.mleashed && udist > 4) {
        // C ref: dogmove.c:1330-1348 — leashed pet drag-along
        // When leashed pet doesn't move but is far from player, drag toward player.
        // JS vs C: C uses xytod/dtoxy direction search with DIR_LEFT/DIR_RIGHT
        // widening pattern and goodpos() validation. JS simplified to try only
        // the direct direction toward player. C also calls m_in_out_region(),
        // remove_monster/place_monster, newsym, and set_apparxy.
        const dnx = Math.sign(omx - player.x);
        const dny = Math.sign(omy - player.y);
        let ccx = player.x + dnx, ccy = player.y + dny;
        if (isok(ccx, ccy) && !map.monsterAt(ccx, ccy)) {
            const loc = map.at(ccx, ccy);
            if (loc && loc.typ >= POOL) {
                // C ref: remove_monster/place_monster → newsym at old+new positions
                const _omx = mon.mx, _omy = mon.my;
                mon.mx = ccx;
                mon.my = ccy;
                newsym(_omx, _omy);
                newsym(ccx, ccy);
            }
        }
    }

    return nix !== omx || niy !== omy ? 1 : 0;
}

// Autotranslated from dogmove.c:1473
export async function quickmimic(mtmp, player) {
  let idx = 0, trycnt = 5, spotted, seeloc, was_leashed = mtmp.mleashed, buf;
  if (Protection_from_shape_changers || !mtmp.meating) return;
  if (mtmp === player.usteed) await dismount_steed(DISMOUNT_POLY);
  do {
    idx = rn2(SIZE(qm));
    if (qm[idx].mndx !== 0 && monsndx(mtmp.data) === qm[idx].mndx) {
      break;
    }
    if (qm[idx].mlet !== 0 && mtmp.data.mlet === qm[idx].mlet) {
      break;
    }
    if (qm[idx].mndx === 0 && qm[idx].mlet === 0) {
      break;
    }
  } while (--trycnt > 0);
  if (trycnt === 0) idx = SIZE(qm) - 1;
  Strcpy(buf, y_monnam(mtmp));
  spotted = canspotmon(mtmp);
  seeloc = cansee(mtmp.mx, mtmp.my);
  mtmp.m_ap_type = qm[idx].m_ap_type;
  mtmp.mappearance = qm[idx].mappearance;
  if (spotted || seeloc || canspotmon(mtmp)) {
    let prev_glyph = glyph_at(mtmp.mx, mtmp.my);
    let what = (M_AP_TYPE(mtmp) === M_AP_FURNITURE) ? defsyms[mtmp.mappearance].explanation : (M_AP_TYPE(mtmp) === M_AP_OBJECT && OBJ_DESCR(objectData[mtmp.mappearance])) ? OBJ_DESCR(objectData[mtmp.mappearance]) : (M_AP_TYPE(mtmp) === M_AP_OBJECT && OBJ_NAME(objectData[mtmp.mappearance])) ? OBJ_NAME(objectData[mtmp.mappearance]) : (M_AP_TYPE(mtmp) === M_AP_MONSTER) ? pmname( mons, Mgender(mtmp)) : something;
    newsym(mtmp.mx, mtmp.my);
    if (was_leashed && (M_AP_TYPE(mtmp) !== M_AP_MONSTER || !mnum_leashable(mtmp.mappearance))) { await Your("leash goes slack."); await m_unleash(mtmp, false); }
    if (glyph_at(mtmp.mx, mtmp.my) !== prev_glyph) await You("%s %s %s where %s was!", seeloc ? "see" : "sense that", (what !== something) ? an(what) : what, seeloc ? "appear" : "has appeared", buf);
    else {
      await You("sense that %s feels rather %s-ish.", buf, what);
    }
    await display_nhwindow(WIN_MAP, true);
  }
}
