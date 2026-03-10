// dog.js -- Pet AI helper functions
// C ref: dog.c dogfood(), initedog()
// Focus: exact RNG consumption alignment with C NetHack

import {
    mons, NUMMONS,
    M1_FLY, M1_SWIM, M1_AMPHIBIOUS, M2_DOMESTIC,
    S_BLOB, S_JELLY, S_FUNGUS, S_VORTEX, S_LIGHT, S_ELEMENTAL,
    S_GOLEM, S_GHOST, S_YETI, S_KOBOLD, S_ORC, S_OGRE,
    PM_MEDUSA,
    PM_STALKER, PM_FLESH_GOLEM, PM_LEATHER_GOLEM,
    PM_GHOUL, PM_KILLER_BEE, PM_PYROLISK,
    PM_GELATINOUS_CUBE, PM_RUST_MONSTER,
    PM_LIZARD, PM_LICHEN,
    PM_LITTLE_DOG, PM_KITTEN, PM_PONY,
    PM_CAVE_DWELLER, PM_SAMURAI, PM_BARBARIAN, PM_RANGER,
} from './monsters.js';

import {
    objectData,
    FOOD_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, COIN_CLASS, GEM_CLASS,
    SILVER,
    CORPSE, TIN, EGG,
    TRIPE_RATION, MEATBALL, MEAT_STICK, ENORMOUS_MEATBALL, MEAT_RING,
    LUMP_OF_ROYAL_JELLY, GLOB_OF_GREEN_SLIME,
    CLOVE_OF_GARLIC, APPLE, CARROT, BANANA, SLIME_MOLD,
    AMULET_OF_STRANGULATION, RIN_SLOW_DIGESTION,
    SCROLL_CLASS, SPBOOK_CLASS,
} from './objects.js';

import { obj_resists, is_organic, is_metallic, is_rustprone, hasPoisonTrapBit, is_quest_artifact } from './objdata.js';
import {
    carnivorous, herbivorous, is_undead, is_elf,
    is_humanoid, acidic, poisonous, is_metallivore,
    canseemon, slimeproof, DEADMONSTER, is_domestic,
} from './mondata.js';
import { rn2, rn1 } from './rng.js';
import { isok, ACCESSIBLE, COLNO, ROWNO, IS_DOOR, D_CLOSED, D_LOCKED,
         POOL, LAVAPOOL,
         MM_EDOG, MM_NOMSG, MM_IGNOREWATER, MM_FEMALE, MM_MALE,
         DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT, POISON, UNDEF, TABU,
         MON_ARRIVE_WITH_YOU } from './const.js';
import { SADDLE } from './objects.js';
import { roles } from './player.js';
import { makemon, mbirth_limit, set_malign } from './makemon.js';
import { NO_MINVENT, MAXMONNO } from './const.js';
import { mksobj, xname } from './mkobj.js';
import { mpickobj } from './steal.js';
import { mark_vision_dirty } from './display.js';
import { pline, pline_The, pline_mon, You, impossible } from './pline.js';
import { Monnam } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { body_part } from './polyself.js';
import { acurr } from './attrib.js';
import { A_CHA } from './const.js';
import { is_covetous, is_human, is_demon, haseyes, sticks, flesh_petrifies,
         is_rider, resists_poison, resists_acid, resists_ston, likes_fire,
         mon_hates_silver } from './mondata.js';
import { EYE, has_oname, ONAME, EDOG, ESHK } from './const.js';
import { wake_nearto } from './mon.js';
import { finish_meating, dog_eat } from './dogmove.js';
import { newsym } from './display.js';
import { m_unleash } from './apply.js';

// Re-export dogmove.c functions that were previously defined here
export { can_carry, dog_eat } from './dogmove.js';

const NON_PM = -1;

function monIndex(mon) {
    if (Number.isInteger(mon?.mnum)) return mon.mnum;
    if (Number.isInteger(mon?.mndx)) return mon.mndx;
    return NON_PM;
}

function monPtr(mon) {
    const idx = monIndex(mon);
    return ismnum(idx) ? mons[idx] : null;
}

// ========================================================================
// Helper predicates matching C macros from mondata.h
// ========================================================================

function mon_vegan(ptr) {
    return ptr.mlet === S_BLOB || ptr.mlet === S_JELLY
        || ptr.mlet === S_FUNGUS || ptr.mlet === S_VORTEX
        || ptr.mlet === S_LIGHT
        || (ptr.mlet === S_ELEMENTAL && ptr !== mons[PM_STALKER])
        || (ptr.mlet === S_GOLEM && ptr !== mons[PM_FLESH_GOLEM]
            && ptr !== mons[PM_LEATHER_GOLEM])
        || ptr.mlet === S_GHOST;
}

function polyfood(obj) { return false; }



function ismnum(fx) { return fx >= 0 && fx < NUMMONS; }
const humanoid = is_humanoid;

function same_race(ptr1, ptr2) {
    const race_flags = 0x00004000 | 0x00008000 | 0x00010000 | 0x00020000 | 0x00040000;
    return !!(ptr1.mflags2 & ptr2.mflags2 & race_flags);
}

function peek_at_iced_corpse_age(obj) { return obj.age || 0; }

// ========================================================================
// dogfood — classify object for pet food evaluation
// C ref: dog.c:988-1130 dogfood(mon, obj)
// ========================================================================

export function dogfood(mon, obj, moves) {
    const mptr = monPtr(mon);
    if (!mptr) return APPORT;
    const carni = carnivorous(mptr);
    const herbi = herbivorous(mptr);
    if (hasPoisonTrapBit(obj) && !resists_poison(mon))
        return POISON;

    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    if (obj.oclass === FOOD_CLASS) {
        const fx = (obj.otyp === CORPSE || obj.otyp === TIN || obj.otyp === EGG)
            ? (obj.corpsenm !== undefined ? obj.corpsenm : NON_PM)
            : NON_PM;
        const fptr = ismnum(fx) ? mons[fx] : null;

        if (obj.otyp === CORPSE && fptr && is_rider(fptr))
            return TABU;

        if ((obj.otyp === CORPSE || obj.otyp === EGG)
            && fptr && flesh_petrifies(fptr)
            && !resists_ston(mon))
            return POISON;

        if (obj.otyp === LUMP_OF_ROYAL_JELLY
            && mptr === mons[PM_KILLER_BEE]) {
            return TABU;
        }

        if (!carni && !herbi)
            return obj.cursed ? UNDEF : APPORT;

        const starving = !!(mon.tame && !mon.isminion
                           && mon.edog && mon.edog.mhpmax_penalty);
        const mblind = false;

        if (monIndex(mon) === PM_GHOUL) {
            if (obj.otyp === CORPSE) {
                const corpseAge = peek_at_iced_corpse_age(obj);
                return (corpseAge + 50 <= (moves || 0)
                        && fx !== PM_LIZARD && fx !== PM_LICHEN) ? DOGFOOD
                    : (starving && fptr && !mon_vegan(fptr)) ? ACCFOOD
                    : POISON;
            }
            if (obj.otyp === EGG)
                return starving ? ACCFOOD : POISON;
            return TABU;
        }

        switch (obj.otyp) {
        case TRIPE_RATION:
        case MEATBALL:
        case MEAT_RING:
        case MEAT_STICK:
        case ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;

        case EGG:
            if (fx === PM_PYROLISK && !likes_fire(mptr))
                return POISON;
            return carni ? CADAVER : MANFOOD;

        case CORPSE: {
            const corpseAge = peek_at_iced_corpse_age(obj);
            if ((corpseAge + 50 <= (moves || 0)
                 && fx !== PM_LIZARD && fx !== PM_LICHEN
                 && mptr.mlet !== S_FUNGUS)
                || (fptr && acidic(fptr) && !resists_acid(mon))
                || (fptr && poisonous(fptr) && !resists_poison(mon)))
                return POISON;
            else if (polyfood(obj) && mon.tame > 1 && !starving)
                return MANFOOD;
            else if (fptr && mon_vegan(fptr))
                return herbi ? CADAVER : MANFOOD;
            else if (humanoid(mptr) && fptr && same_race(mptr, fptr)
                     && !is_undead(mptr) && fptr.mlet !== S_KOBOLD
                     && fptr.mlet !== S_ORC && fptr.mlet !== S_OGRE)
                return (starving && carni && !is_elf(mptr)) ? ACCFOOD : TABU;
            else
                return carni ? CADAVER : MANFOOD;
        }

        case GLOB_OF_GREEN_SLIME:
            return (starving || slimeproof(mptr)) ? ACCFOOD : POISON;

        case CLOVE_OF_GARLIC:
            return is_undead(mptr) ? TABU
                : (herbi || starving) ? ACCFOOD
                : MANFOOD;

        case TIN:
            return is_metallivore(mptr) ? ACCFOOD : MANFOOD;

        case APPLE:
            return herbi ? DOGFOOD : starving ? ACCFOOD : MANFOOD;

        case CARROT:
            return (herbi || mblind) ? DOGFOOD : starving ? ACCFOOD : MANFOOD;

        case BANANA:
            return (mptr.mlet === S_YETI && herbi) ? DOGFOOD
                : (herbi || starving) ? ACCFOOD
                : MANFOOD;

        default:
            if (starving) return ACCFOOD;
            return (obj.otyp > SLIME_MOLD) ? (carni ? ACCFOOD : MANFOOD)
                                           : (herbi ? ACCFOOD : MANFOOD);
        }
    }

    if (obj.oclass === ROCK_CLASS)
        return UNDEF;

    if (obj.otyp === AMULET_OF_STRANGULATION
        || obj.otyp === RIN_SLOW_DIGESTION)
        return TABU;

    if (mon_hates_silver(mon)
        && objectData[obj.otyp].oc_material === SILVER)
        return TABU;

    if (monIndex(mon) === PM_GELATINOUS_CUBE && is_organic(obj))
        return ACCFOOD;

    if (is_metallivore(mptr) && is_metallic(obj)
        && (is_rustprone(obj) || monIndex(mon) !== PM_RUST_MONSTER)) {
        return (is_rustprone(obj) && !obj.oerodeproof) ? DOGFOOD : ACCFOOD;
    }

    if (!obj.cursed
        && obj.oclass !== BALL_CLASS
        && obj.oclass !== CHAIN_CLASS)
        return APPORT;

    return UNDEF;
}


// ========================================================================
// makedog — C ref: dog.c:219
// Pet creation and placement at game start.
// ========================================================================

// C ref: dog.c:90-101 pet_type()
function pet_type(roleIndex) {
    const role = roles[roleIndex];
    if (role.petType === 'pony') return PM_PONY;
    if (role.petType === 'cat') return PM_KITTEN;
    if (role.petType === 'dog') return PM_LITTLE_DOG;
    return rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
}


// C ref: dog.c makedog()
export function makedog(map, player, depth) {
    const pmIdx = pet_type(player.roleIndex);
    let petName = '';
    if (pmIdx === PM_LITTLE_DOG) {
        if (player.roleMnum === PM_CAVE_DWELLER) petName = 'Slasher';
        else if (player.roleMnum === PM_SAMURAI) petName = 'Hachi';
        else if (player.roleMnum === PM_BARBARIAN) petName = 'Idefix';
        else if (player.roleMnum === PM_RANGER) petName = 'Sirius';
    }

    const pet = makemon(pmIdx, player.x, player.y, MM_EDOG | NO_MINVENT | MM_NOMSG, depth, map);
    if (!pet) return null;

    if (pmIdx === PM_PONY) {
        const saddleObj = mksobj(SADDLE, true, false);
        if (saddleObj) {
            saddleObj.owornmask = 0x100000; // W_SADDLE
            mpickobj(pet, saddleObj);
            pet.misc_worn_check = 0x100000;
        }
    }

    if (petName) pet.name = petName;

    // C ref: dog.c:271 — initedog(mtmp, TRUE)
    pet.tame = true;
    pet.mtame = is_domestic(mons[pmIdx]) ? 10 : 5;
    pet.peaceful = true;
    pet.mpeaceful = true;
    pet.edog.apport = 0;
    pet.edog.hungrytime = 1000;
    pet.edog.droptime = 0;
    pet.edog.dropdist = 10000;
    pet.edog.whistletime = 0;
    pet.edog.ogoal = { x: 0, y: 0 };
    pet.edog.abuse = 0;
    pet.edog.revivals = 0;
    pet.edog.mhpmax_penalty = 0;
    pet.edog.killed_by_u = false;

    return pet;
}

// ========================================================================
// mon_arrive — C ref: dog.c:474
// Pet/follower migration between levels.
// ========================================================================

// C ref: teleport.c collect_coords() — collect positions by ring and shuffle.
// Used by mon_arrive for mnexto-style placement.
function collectCoordsShuffle(cx, cy, maxRadius) {
    const allPositions = [];
    for (let radius = 1; radius <= maxRadius; radius++) {
        const ring = [];
        const loy = cy - radius, hiy = cy + radius;
        const lox = cx - radius, hix = cx + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                if (isok(x, y)) ring.push({ x, y });
            }
        }
        let start = 0;
        let n = ring.length;
        while (n > 1) {
            const k = rn2(n);
            if (k !== 0) {
                const temp = ring[start];
                ring[start] = ring[start + k];
                ring[start + k] = temp;
            }
            start++;
            n--;
        }
        for (const pos of ring) allPositions.push(pos);
    }
    return allPositions;
}

// C ref: teleport.c goodpos() subset for mon_arrive/mnexto placement.
function arrivalGoodPos(map, mon, x, y) {
    const loc = map.at(x, y);
    if (!loc || !ACCESSIBLE(loc.typ)) return false;
    if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED))) return false;
    if (map.monsterAt(x, y)) return false;
    const flags1 = (mon?.data || mon?.type)?.mflags1 || 0;
    const canFlyOrSwim = !!(flags1 & (M1_FLY | M1_SWIM | M1_AMPHIBIOUS));
    if ((loc.typ === POOL || loc.typ === LAVAPOOL) && !canFlyOrSwim) return false;
    return true;
}

// C ref: dog.c mon_catchup_elapsed_time()
function monCatchupElapsedTime(mtmp, nmv) {
    const imv = Math.max(0, Math.min(0x7ffffffe, Math.trunc(nmv || 0)));
    if (!imv) return;

    if (mtmp.mtrapped && rn2(imv + 1) > 20) mtmp.mtrapped = false;
    if (mtmp.mconf && rn2(imv + 1) > 25) mtmp.mconf = false;
    if (mtmp.mstun && rn2(imv + 1) > 5) mtmp.mstun = false;

    if (Number.isInteger(mtmp.meating) && mtmp.meating > 0) {
        if (imv > mtmp.meating) mtmp.meating = 0;
        else mtmp.meating -= imv;
    }

    if ((mtmp.mtame || 0) > 0) {
        const wilder = Math.floor((imv + 75) / 150);
        if (mtmp.mtame > wilder) mtmp.mtame -= wilder;
        else if (mtmp.mtame > rn2(Math.max(1, wilder))) mtmp.mtame = 0;
        else {
            mtmp.mtame = 0;
            mtmp.mpeaceful = 0;
        }
    }
}

// C ref: dog.c:474 mon_arrive() — tame pets follow player between levels.
export function mon_arrive(oldMap, newMap, player, opts = {}) {
    if (!oldMap || !newMap) return false;
    const when = opts.when || MON_ARRIVE_WITH_YOU;
    const sourceHeroX = Number.isInteger(opts.sourceHeroX) ? opts.sourceHeroX : player.x;
    const sourceHeroY = Number.isInteger(opts.sourceHeroY) ? opts.sourceHeroY : player.y;
    const heroX = Number.isInteger(opts.heroX) ? opts.heroX : player.x;
    const heroY = Number.isInteger(opts.heroY) ? opts.heroY : player.y;
    const currentMoves = Number.isInteger(opts.moves)
        ? opts.moves
        : (Number.isInteger(player?.turns) ? player.turns : 0);
    const failedArrivals = Array.isArray(opts.failedArrivals)
        ? opts.failedArrivals
        : (newMap.failedArrivals || (newMap.failedArrivals = []));
    const oldFailed = Array.isArray(oldMap.failedArrivals) ? oldMap.failedArrivals : [];
    const oldFailedSet = new Set(oldFailed);
    const seen = new Set();
    const addUnique = (arr, mon) => {
        if (!mon || seen.has(mon)) return;
        seen.add(mon);
        arr.push(mon);
    };

    const candidates = [];
    for (const m of oldFailed) addUnique(candidates, m);
    for (const m of (oldMap.monsters || [])) addUnique(candidates, m);

    const pets = candidates.filter((m) => {
        const tameLike = !!m?.tame || (m?.mtame || 0) > 0;
        if (!m || m.dead || !tameLike) return false;
        if (oldFailedSet.has(m)) return true;
        if (m.mtrapped || m.meating) return false;
        const dx = Math.abs((m.mx ?? 0) - sourceHeroX);
        const dy = Math.abs((m.my ?? 0) - sourceHeroY);
        return dx <= 1 && dy <= 1;
    });
    if (pets.length === 0) return false;
    if (oldFailed.length) oldMap.failedArrivals = [];

    let migratedCount = 0;

    for (let i = pets.length - 1; i >= 0; i--) {
        const pet = pets[i];
        const wasOnOldMap = oldMap.monsters.includes(pet);
        if (wasOnOldMap) {
            oldMap.removeMonster(pet);
        }
        const mtame = pet.mtame || (pet.tame ? 10 : 0);
        const bound = mtame > 0 ? 10 : (pet.mpeaceful ? 5 : 2);

        pet.mux = heroX;
        pet.muy = heroY;
        pet.mtrack = new Array(4).fill(null).map(() => ({ x: 0, y: 0 }));

        let petX = 0;
        let petY = 0;
        let foundPos = false;

        if (when === MON_ARRIVE_WITH_YOU) {
            if (!newMap.monsterAt(heroX, heroY) && !rn2(bound)) {
                petX = heroX;
                petY = heroY;
                foundPos = true;
            } else {
                const positions = collectCoordsShuffle(heroX, heroY, 3);
                for (const pos of positions) {
                    if (arrivalGoodPos(newMap, pet, pos.x, pos.y)
                        && !(pos.x === heroX && pos.y === heroY)) {
                        petX = pos.x;
                        petY = pos.y;
                        foundPos = true;
                        break;
                    }
                }
            }
        } else {
            let localeX = Number.isInteger(opts.localeX) ? opts.localeX : heroX;
            let localeY = Number.isInteger(opts.localeY) ? opts.localeY : heroY;
            const exact = !!opts.localeExact;
            let wander = exact ? 0 : Math.max(0, Math.min(8, opts.wander || 0));
            const randomPlacement = !!opts.randomPlacement;
            const shouldCatchup = Number.isInteger(pet.mlstmv)
                && pet.mlstmv < (currentMoves - 1);

            if (shouldCatchup) {
                const nmv = (currentMoves - 1) - pet.mlstmv;
                monCatchupElapsedTime(pet, nmv);
                if (!exact && !Number.isInteger(opts.wander)) {
                    wander = Math.max(0, Math.min(8, nmv));
                }
            }

            if (wander > 0 && localeX > 0) {
                const xmin = Math.max(1, localeX - wander);
                const xmax = Math.min(COLNO - 1, localeX + wander);
                const ymin = Math.max(0, localeY - wander);
                const ymax = Math.min(ROWNO - 1, localeY + wander);
                localeX = rn1(xmax - xmin + 1, xmin);
                localeY = rn1(ymax - ymin + 1, ymin);
            }

            if (randomPlacement) {
                for (let tries = 0; tries < (COLNO * ROWNO); tries++) {
                    const rx = rn1(COLNO - 1, 1);
                    const ry = rn2(ROWNO);
                    if (arrivalGoodPos(newMap, pet, rx, ry)) {
                        petX = rx;
                        petY = ry;
                        foundPos = true;
                        break;
                    }
                }
            } else {
                const exactLoc = newMap.at(localeX, localeY);
                if (exact && exactLoc && arrivalGoodPos(newMap, pet, localeX, localeY)) {
                    petX = localeX;
                    petY = localeY;
                    foundPos = true;
                } else {
                    const positions = collectCoordsShuffle(localeX, localeY, 3);
                    for (const pos of positions) {
                        if (arrivalGoodPos(newMap, pet, pos.x, pos.y)) {
                            petX = pos.x;
                            petY = pos.y;
                            foundPos = true;
                            break;
                        }
                    }
                }
            }
        }
        if (!foundPos) {
            if (!failedArrivals.includes(pet)) failedArrivals.push(pet);
            continue;
        }

        pet.mx = petX;
        pet.my = petY;
        pet.sleeping = false;
        pet.dead = false;
        if (Number.isInteger(currentMoves)) pet.mlstmv = currentMoves;
        if ('migrating' in pet) pet.migrating = false;
        if ('limbo' in pet) pet.limbo = false;
        newMap.addMonster(pet);
        migratedCount++;
    }

    return migratedCount > 0;
}

// Autotranslated from dog.c:34
export function free_edog(mtmp) {
  if (mtmp.mextra && mtmp.mextra.edog) { mtmp.mextra.edog = null; } // JS: no free() needed
  mtmp.mtame = 0;
}

// Autotranslated from dog.c:103
export async function pick_familiar_pm(otmp, quietly, game) {
  let pm =  0;
  if (otmp) {
    let mndx = otmp.corpsenm;
    if (!ismnum(mndx)) return 0;
    pm = mons[mndx];
    if ((game.mvitals[mndx].mvflags & G_EXTINCT) && mbirth_limit(mndx) !== MAXMONNO) { if (!quietly) await pline("... into a pile of dust."); return  0; }
  }
  else if (!rn2(3)) { pm = mons[rndmonst()]; }
  else {
    let skill = spell_skilltype(SPE_CREATE_FAMILIAR), max = 3 * P_SKILL(skill);
    pm = rndmonst_adj(0, max);
    if (!pm && !quietly) await There("seems to be nothing available for a familiar.");
  }
  return pm;
}

// Autotranslated from dog.c:137
export async function make_familiar(otmp, x, y, quietly) {
  let pm, mtmp = null, chance, trycnt = 100, reallytame = true;
  do {
    let mmflags, cgend;
    if (!(pm = await pick_familiar_pm(otmp, quietly))) {
      break;
    }
    mmflags = MM_EDOG | MM_IGNOREWATER | NO_MINVENT | MM_NOMSG;
    cgend = otmp ? (otmp.spe & CORPSTAT_GENDER) : 0;
    mmflags |= ((cgend === CORPSTAT_FEMALE) ? MM_FEMALE : (cgend === CORPSTAT_MALE) ? MM_MALE : 0);
    mtmp = makemon(pm, x, y, mmflags);
    if (otmp) {
      if (!mtmp) {
        if (!quietly) await pline_The( "figurine writhes and then shatters into pieces!");
        break;
      }
      else if (mtmp.isminion) { mtmp.isminion = 0; free_emin(mtmp); }
    }
  } while (!mtmp && --trycnt > 0);
  if (!mtmp) return  0;
  if (is_pool(mtmp.mx, mtmp.my) && await minliquid(mtmp)) return  0;
  if (otmp) {
    chance = rn2(10);
    if (chance > 2) chance = otmp.blessed ? 0 : !otmp.cursed ? 1 : 2;
    if (chance > 0) {
      reallytame = false;
      if (chance === 2) {
        if (!quietly) await You("get a bad feeling about this.");
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
      }
    }
    if (has_oname(otmp)) mtmp = christen_monst(mtmp, ONAME(otmp));
  }
  if (reallytame) initedog(mtmp, true);
  mtmp.msleeping = 0;
  mtmp.sleeping = false;
  set_malign(mtmp);
  newsym(mtmp.mx, mtmp.my);
  if (mtmp.mtame && attacktype(mtmp.data, AT_WEAP)) { mtmp.weapon_check = NEED_HTH_WEAPON; mon_wield_item(mtmp); }
  return mtmp;
}

// Autotranslated from dog.c:286
export function set_mon_lastmove(mtmp, game) {
  mtmp.mlstmv = (Number(game?.moves) || 0);
}

// Autotranslated from dog.c:294
export function update_mlstmv() {
  iter_mons(set_mon_lastmove);
}

// Autotranslated from dog.c:622
export async function mon_catchup_elapsed_time(mtmp, nmv, game) {
  let imv = 0;
  if (nmv < 0) { throw new Error('catchup from future time?'); return; }
  else if (nmv === 0) { impossible("catchup from now?"); }
  else if (nmv >= LARGEST_INT) imv = LARGEST_INT - 1;
  else {
    imv =  nmv;
  }
  if (mtmp.mblinded) {
    if (imv >=  mtmp.mblinded) mtmp.mblinded = 1;
    else {
      mtmp.mblinded -= imv;
    }
  }
  if (mtmp.mfrozen) {
    if (imv >=  mtmp.mfrozen) mtmp.mfrozen = 1;
    else {
      mtmp.mfrozen -= imv;
    }
  }
  if (mtmp.mfleetim) {
    if (imv >=  mtmp.mfleetim) mtmp.mfleetim = 1;
    else {
      mtmp.mfleetim -= imv;
    }
  }
  if (mtmp.mtrapped && rn2(imv + 1) > 20) mtmp.mtrapped = 0;
  if (mtmp.mconf && rn2(imv + 1) > 25) mtmp.mconf = 0;
  if (mtmp.mstun && rn2(imv + 1) > 5) mtmp.mstun = 0;
  if (mtmp.meating) {
    if (imv > mtmp.meating) finish_meating(mtmp);
    else {
      mtmp.meating -= imv;
    }
  }
  if (imv > mtmp.mspec_used) mtmp.mspec_used = 0;
  else {
    mtmp.mspec_used -= imv;
  }
  if (mtmp.mtame) {
    let wilder = Math.floor((imv + 75) / 150);
    if (mtmp.mtame > wilder) {
      mtmp.mtame -= wilder;
    }
    else if (mtmp.mtame > rn2(wilder)) mtmp.mtame = 0;
    else {
      mtmp.mtame = mtmp.mpeaceful = 0;
    }
  }
  if (mtmp.mtame && !mtmp.isminion && (carnivorous(mtmp.data) || herbivorous(mtmp.data))) {
    let edog = EDOG(mtmp);
    if (((Number(game?.moves) || 0) > edog.hungrytime + 500 && mtmp.mhp < 3) || ((Number(game?.moves) || 0) > edog.hungrytime + 750)) mtmp.mtame = mtmp.mpeaceful = 0;
  }
  if (!mtmp.mtame && mtmp.mleashed) { impossible("catching up for leashed monster?"); await m_unleash(mtmp, false); }
  if (!regenerates(mtmp.data)) {
    imv /= 20;
  }
  healmon(mtmp, imv, 0);
  set_mon_lastmove(mtmp);
}

// Autotranslated from dog.c:724
export function mon_leave(mtmp) {
  let obj, num_segs = 0;
  for (obj = mtmp.minvent; obj; obj = obj.nobj) {
    if (Has_contents(obj)) picked_container(obj);
    obj.no_charge = 0;
  }
  if (mtmp.isshk) set_residency(mtmp, true);
  if (mtmp.wormno) {
    let cnt = count_wsegs(mtmp), mx = mtmp.mx, my = mtmp.my;
    num_segs = Math.min(cnt, MAX_NUM_WORMS - 1);
    wormgone(mtmp);
    if (mx) place_monster(mtmp, mx, my);
  }
  return num_segs;
}

// Autotranslated from dog.c:784
export async function keepdogs(pets_only, game, map, player) {
  let mtmp, mtmp2;
  for (mtmp = (map?.fmon || null); mtmp; mtmp = mtmp2) {
    mtmp2 = mtmp.nmon;
    if (DEADMONSTER(mtmp)) {
      continue;
    }
    if (pets_only) {
      if (!mtmp.mtame) {
        continue;
      }
      mtmp.mtrapped = 0;
      finish_meating(mtmp);
      mtmp.msleeping = 0;
      mtmp.sleeping = false;
      mtmp.mfrozen = 0;
      mtmp.mcanmove = 1;
    }
    if (((monnear(mtmp, player.x, player.y) && levl_follower(mtmp))   || (player.uhave.amulet && mtmp.iswiz)) && (!helpless(mtmp)   || (mtmp === player.usteed))   && !(mtmp.mstrategy & STRAT_WAITFORU)) {
      let num_segs, stay_behind = false;
      if (mtmp.mtrapped) {
        mintrap(mtmp, NO_TRAP_FLAGS);
      }
      if (mtmp === player.usteed) {
        mtmp.mtrapped = 0;
        mtmp.meating = 0;
        mdrop_special_objs(mtmp);
      }
      else if (mtmp.meating || mtmp.mtrapped) {
        if (canseemon(mtmp)) await pline_mon(mtmp, "%s is still %s.", Monnam(mtmp), mtmp.meating ? "eating" : "trapped");
        stay_behind = true;
      }
      else if (mon_has_amulet(mtmp)) {
        if (canseemon(mtmp)) await pline("%s seems very disoriented for a moment.", Monnam(mtmp));
        stay_behind = true;
      }
      if (stay_behind) {
        if (mtmp.mleashed) {
          await pline("%s leash suddenly comes loose.", humanoid(mtmp.data) ? (mtmp.female ? "Her" : "His") : "Its");
          await m_unleash(mtmp, false);
        }
        if (mtmp === player.usteed) { impossible("steed left behind?"); await dismount_steed(DISMOUNT_GENERIC); }
        continue;
      }
      num_segs = mon_leave(mtmp);
      relmon(mtmp, game.mydogs);
      mtmp.mx = mtmp.my = 0;
      mtmp.wormno = num_segs;
      mtmp.mlstmv = (Number(game?.moves) || 0);
    }
    else if (keep_mon_accessible(mtmp)) {
      await migrate_to_level(mtmp, ledger_no(map.uz), MIGR_EXACT_XY, null);
    }
    else if (mtmp.mleashed) {
      await pline("%s leash goes slack.", s_suffix(Monnam(mtmp)));
      await m_unleash(mtmp, false);
    }
  }
}

// Autotranslated from dog.c:882
export async function migrate_to_level(mtmp, tolev, xyloc, cc, game, map) {
  let new_lev, xyflags, mx = mtmp.mx, my = mtmp.my, num_segs;
  if (mtmp.mleashed) { mtmp.mtame--; await m_unleash(mtmp, true); }
  num_segs = mon_leave(mtmp);
  relmon(mtmp, game.migrating_mons);
  mtmp.mstate |= MON_MIGRATING;
  new_lev.dnum = ledger_to_dnum( tolev);
  new_lev.dlevel = ledger_to_dlev( tolev);
  xyflags = (depth( new_lev) < depth(map.uz));
  if (In_W_tower(mx, my, map.uz)) {
    xyflags |= 2;
  }
  mtmp.wormno = num_segs;
  mtmp.mlstmv = (Number(game?.moves) || 0);
  mtmp.mtrack[2].x = map.uz.dnum;
  mtmp.mtrack[2].y = map.uz.dlevel;
  mtmp.mtrack[1].x = cc ? cc.x : mx;
  mtmp.mtrack[1].y = cc ? cc.y : my;
  mtmp.mtrack[0].x = xyloc;
  mtmp.mtrack[0].y = xyflags;
  mtmp.mux = new_lev.dnum;
  mtmp.muy = new_lev.dlevel;
  mtmp.mx = mtmp.my = 0;
  if (emits_light(mtmp.data)) mark_vision_dirty();
}

// Autotranslated from dog.c:1357
export async function abuse_dog(mtmp) {
  if (!mtmp.mtame) return;
  if (Aggravate_monster || Conflict) {
    mtmp.mtame /= 2;
  }
  else {
    mtmp.mtame--;
  }
  if (mtmp.mtame && !mtmp.isminion) EDOG(mtmp).abuse++;
  if (!mtmp.mtame && mtmp.mleashed) await m_unleash(mtmp, true);
  if (mtmp.mx !== 0) {
    if (mtmp.mtame && rn2(mtmp.mtame)) await yelp(mtmp);
    else {
      await growl(mtmp);
    }
    if (!mtmp.mtame) {
      newsym(mtmp.mx, mtmp.my);
      if (mtmp.wormno) { redraw_worm(mtmp); }
    }
  }
}

// Autotranslated from dog.c:303
export function losedogs(game, map) {
  let mtmp, mprev, dismissKops = 0, xyloc;
  failed_arrivals = 0;
  for (mtmp = game.migrating_mons; mtmp; mtmp = mtmp.nmon) {
    if (mtmp.mux !== map.uz.dnum || mtmp.muy !== map.uz.dlevel) {
      continue;
    }
    if (mtmp.isshk) {
      if (ESHK(mtmp).dismiss_kops) { if (dismissKops === 0) dismissKops = 1; ESHK(mtmp).dismiss_kops = false; }
      else if (!mtmp.mpeaceful) { dismissKops = -1; }
    }
  }
  for (mtmp = game.mydogs; mtmp && dismissKops >= 0; mtmp = mtmp.nmon) {
    if (mtmp.isshk) { if (!mtmp.mpeaceful) dismissKops = -1; }
  }
  if (dismissKops > 0) make_happy_shoppers(true);
  for (mprev = game.migrating_mons; (mtmp = mprev) != null; ) {
    xyloc = mtmp.mtrack[0].x;
    if (mtmp.mux === map.uz.dnum && mtmp.muy === map.uz.dlevel && xyloc === MIGR_EXACT_XY) { mprev = mtmp.nmon; mon_arrive(mtmp, Before_you); }
    else { mprev = mtmp.nmon; }
  }
  while ((mtmp = game.mydogs) != null) {
    game.mydogs = mtmp.nmon;
    mon_arrive(mtmp, With_you);
  }
  for (mprev = game.migrating_mons; (mtmp = mprev) != null; ) {
    xyloc = mtmp.mtrack[0].x;
    if (mtmp.mux === map.uz.dnum && mtmp.muy === map.uz.dlevel && xyloc !== MIGR_EXACT_XY) { mprev = mtmp.nmon; mon_arrive(mtmp, After_you); }
    else { mprev = mtmp.nmon; }
  }
  while ((mtmp = failed_arrivals) != null) {
    failed_arrivals = mtmp.nmon;
    mtmp.nmon = fmon;
    fmon = mtmp;
    m_into_limbo(mtmp);
  }
}

// cf. dog.c:22 newedog() — allocate edog structure for a monster
export function newedog(mtmp) {
    if (!mtmp.mextra) mtmp.mextra = {};
    if (!mtmp.mextra.edog) {
        mtmp.mextra.edog = {
            parentmid: mtmp.m_id || 0,
            droptime: 0,
            dropdist: 10000,
            apport: 0,
            whistletime: 0,
            ogoal: { x: -1, y: -1 },
            abuse: 0,
            revivals: 0,
            mhpmax_penalty: 0,
            killed_by_u: 0,
            hungrytime: 0,
        };
    }
}

// cf. dog.c:45 initedog() — initialize pet edog data
export function initedog(mtmp, everything, player, game) {
    if (!mtmp.mextra?.edog) newedog(mtmp);
    const edogp = mtmp.mextra.edog;
    const moves = game?.moves || 0;
    const minhungry = moves + 1000;
    const minimumtame = is_domestic(mtmp.data || mtmp.type) ? 10 : 5;

    mtmp.mtame = Math.max(minimumtame, mtmp.mtame || 0);
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    set_malign(mtmp);

    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        edogp.apport = player ? acurr(player, A_CHA) : 10;
        edogp.whistletime = 0;
        edogp.ogoal = { x: -1, y: -1 };
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else {
        if ((edogp.apport || 0) <= 0) edogp.apport = 1;
    }
    if ((edogp.hungrytime || 0) < minhungry) {
        edogp.hungrytime = minhungry;
    }
    // C: u.uconduct.pets++ — conduct tracking not ported
}

// cf. dog.c:764 keep_mon_accessible() — should monster stay on migrating list?
export function keep_mon_accessible(mon, player) {
    if (mon.iswiz) return true;
    if (mon.mextra) {
        if (mon.isshk && mon.mextra.eshk) {
            const shopLevel = mon.mextra.eshk.shoplevel;
            if (shopLevel && player?.uz
                && (shopLevel.dnum !== player.uz.dnum || shopLevel.dlevel !== player.uz.dlevel)) {
                return true;
            }
        }
        if (mon.ispriest && mon.mextra.epri) {
            const shrLevel = mon.mextra.epri.shrlevel;
            if (shrLevel && player?.uz
                && (shrLevel.dnum !== player.uz.dnum || shrLevel.dlevel !== player.uz.dlevel)) {
                return true;
            }
        }
        if (mon.isgd && mon.mextra.egd) {
            const gdLevel = mon.mextra.egd.gdlevel;
            if (gdLevel && player?.uz
                && (gdLevel.dnum !== player.uz.dnum || gdLevel.dlevel !== player.uz.dlevel)) {
                return true;
            }
        }
    }
    return false;
}

// cf. dog.c:934 discard_migrations() — clean up non-endgame migrations
export function discard_migrations(game) {
    if (!game) return;
    // Discard migrating monsters not headed to endgame
    if (game.migrating_mons) {
        const kept = [];
        let mtmp = game.migrating_mons;
        while (mtmp) {
            const next = mtmp.nmon;
            const dest_dnum = mtmp.mux || 0;
            // Keep Wizard and endgame-bound monsters
            // C: In_endgame checks dest.dnum — simplified: endgame dnum is typically 4+
            if (mtmp.iswiz || dest_dnum >= 4) {
                kept.push(mtmp);
            }
            // else: discard (free in C; GC in JS)
            mtmp = next;
        }
        // Rebuild linked list
        game.migrating_mons = null;
        for (let i = kept.length - 1; i >= 0; i--) {
            kept[i].nmon = game.migrating_mons;
            game.migrating_mons = kept[i];
        }
    }
}

// cf. dog.c:1139 tamedog() — attempt to tame a monster with food or magic
export async function tamedog(mtmp, obj, givemsg, player, game, map) {
    let blessed_scroll = false;

    // Scroll/spellbook: set blessed flag, clear obj
    if (obj && (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS)) {
        blessed_scroll = !!obj.blessed;
        obj = null;
    }
    // Reduce frozen/sleep timers
    if (mtmp.mfrozen) mtmp.mfrozen = Math.floor((mtmp.mfrozen + 1) / 2);
    if (mtmp.msleeping) wake_nearto(mtmp.mx, mtmp.my, 1, map);

    // Untameable monsters
    if (mtmp.iswiz) return false;
    if (mtmp.data === mons[PM_MEDUSA]) return false;
    const M3_WANTSARTI = 0x0400;
    if ((mtmp.data?.mflags3 || 0) & M3_WANTSARTI) return false;

    // Pacify message
    if (givemsg && !mtmp.mpeaceful && canseemon(mtmp, map)) {
        await pline_mon(mtmp, "%s seems more amiable.", Monnam(mtmp));
        givemsg = false;
    }
    mtmp.mpeaceful = 1;
    set_malign(mtmp);

    // Full moon + night + dog: may resist
    // C: flags.moonphase == FULL_MOON && night() && rn2(6) — simplified
    // night()/moonphase not reliably available in JS replay

    mtmp.mflee = 0;
    mtmp.mfleetim = 0;

    // Break engulf/grab
    if (mtmp === player?.ustuck) {
        if (player.uswallow) {
            // C: expels(mtmp, ...) — not called here, simplified
        } else if (!(player.Upolyd && sticks(player.data || {}))) {
            // unstuck
            player.ustuck = null;
        }
    }

    // Already tame + food offering
    if (mtmp.mtame && obj) {
        const tasty = dogfood(mtmp, obj);
        if (mtmp.mcanmove && !mtmp.mconf && !mtmp.meating
            && (tasty === DOGFOOD || (tasty <= ACCFOOD
                && mtmp.mextra?.edog && mtmp.mextra.edog.hungrytime <= (game?.moves || 0)))) {
            if (canseemon(mtmp, map)) {
                await pline_mon(mtmp, "%s catches %s.", Monnam(mtmp), xname(obj));
            }
            // C: place_object + dog_eat — simplified
            await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, false);
            return true;
        } else {
            return false;
        }
    }

    // Already tame, increase tameness
    if (mtmp.mtame && mtmp.mtame < 10) {
        if (mtmp.mtame < rn2(10) + 1) mtmp.mtame++;
        if (blessed_scroll) {
            mtmp.mtame += 2;
            if (mtmp.mtame > 10) mtmp.mtame = 10;
        }
        return false;
    }

    // Shopkeeper: make happy
    if (mtmp.isshk) {
        // C: make_happy_shk(mtmp, FALSE) — not ported
        return false;
    }

    // Can't tame these
    if (!mtmp.mcanmove
        || mtmp.isshk || mtmp.isgd || mtmp.ispriest || mtmp.isminion
        || is_covetous(mtmp.data || {}) || is_human(mtmp.data || {})
        || (is_demon(mtmp.data || {}) && !is_demon(player?.data || {}))
        || (obj && dogfood(mtmp, obj) >= MANFOOD)) {
        return false;
    }

    // Quest leader
    if (game?.quest_status?.leader_m_id && mtmp.m_id === game.quest_status.leader_m_id) {
        return false;
    }

    // Initialize edog
    if (!mtmp.mextra?.edog) {
        newedog(mtmp);
        initedog(mtmp, true, player, game);
    } else {
        initedog(mtmp, false, player, game);
    }

    // Feed if food offering
    if (obj) {
        if (canseemon(mtmp, map)) {
            await pline_mon(mtmp, "%s catches %s.", Monnam(mtmp), xname(obj));
        }
        await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, false);
    }

    if (givemsg && canseemon(mtmp, map)) {
        await pline_mon(mtmp, "%s seems quite tame.", Monnam(mtmp));
    }
    return true;
}

// cf. dog.c:1288 wary_dog() — process pet revival/life-saving
export async function wary_dog(mtmp, was_dead, player, game, map) {
    const quietly = was_dead;

    finish_meating(mtmp);

    if (!mtmp.mtame) return;
    const edog = (!mtmp.isminion && mtmp.mextra?.edog) ? mtmp.mextra.edog : null;

    // Undo starvation HP penalty
    if (edog && edog.mhpmax_penalty) {
        mtmp.mhpmax = (mtmp.mhpmax || 0) + edog.mhpmax_penalty;
        mtmp.mhp = (mtmp.mhp || 0) + edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }

    // Check abuse/betrayal
    if (edog && (edog.killed_by_u === 1 || edog.abuse > 2)) {
        mtmp.mpeaceful = 0;
        mtmp.mtame = 0;
        if (edog.abuse >= 0 && edog.abuse < 10) {
            if (!rn2(edog.abuse + 1)) mtmp.mpeaceful = 1;
        }
        if (!quietly && canseemon(mtmp, map)) {
            const youmonst_data = player?.data || {};
            if (haseyes(youmonst_data)) {
                if (haseyes(mtmp.data || {})) {
                    await pline_mon(mtmp, "%s %s to look you in the %s.",
                        Monnam(mtmp),
                        mtmp.mpeaceful ? 'seems unable' : 'refuses',
                        body_part(EYE, player));
                } else {
                    await pline_mon(mtmp, "%s avoids your gaze.", Monnam(mtmp));
                }
            }
        }
    } else {
        // Random tameness reduction
        mtmp.mtame = rn2((mtmp.mtame || 0) + 1);
        if (!mtmp.mtame) mtmp.mpeaceful = rn2(2);
    }

    // If no longer tame
    if (!mtmp.mtame) {
        if (!quietly && canseemon(mtmp, map)) {
            await pline_mon(mtmp, "%s %s.",
                Monnam(mtmp),
                mtmp.mpeaceful ? 'is no longer tame' : 'has become feral');
        }
        newsym(mtmp.mx, mtmp.my);
        if (mtmp.mleashed) await m_unleash(mtmp, true, player);
        // C: dismount_steed if usteed — not ported
    } else if (edog) {
        // Reset edog state on revival
        edog.revivals = (edog.revivals || 0) + 1;
        edog.killed_by_u = 0;
        edog.abuse = 0;
        edog.ogoal = { x: -1, y: -1 };
        const moves = game?.moves || 0;
        if (was_dead || (edog.hungrytime || 0) < moves + 500) {
            edog.hungrytime = moves + 500;
        }
        if (was_dead) {
            edog.droptime = 0;
            edog.dropdist = 10000;
            edog.whistletime = 0;
            edog.apport = 5;
        }
    }
}
