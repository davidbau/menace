// wizard.js -- Wizard of Yendor AI and covetous monster behavior
// cf. wizard.c — amulet, mon_has_amulet, mon_has_special, tactics, strategy,
//                choose_stairs, nasty, pick_nasty, clonewiz, resurrect,
//                intervene, wizdeadorgone, cuss, aggravate, has_aggravatables

import { m_next2u } from './muse.js';
import { rn2, rnd, rn1 } from './rng.js';
import { pline, You, You_feel, verbalize } from './pline.js';
import { makemon } from './makemon.js';
import { NO_MM_FLAGS, RLOC_MSG, BOLT_LIM, MAGIC_PORTAL, M_AP_MONSTER,
         STRAT_APPEARMSG, STRAT_WAITFORU, STRAT_CLOSE, STRAT_WAITMASK,
         STRAT_HEAL, STRAT_GROUND, STRAT_MONSTR, STRAT_PLAYER,
         STRAT_NONE, STRAT_STRATMASK, STRAT_GOAL } from './const.js';
import { mksobj, doname, add_to_minv } from './mkobj.js';
import {
    AMULET_OF_YENDOR, FAKE_AMULET_OF_YENDOR,
    BELL_OF_OPENING, CANDELABRUM_OF_INVOCATION,
    SPE_BOOK_OF_THE_DEAD,
} from './objects.js';
import {
    mons, S_ANGEL, S_DEMON, AT_MAGC,
    PM_WIZARD_OF_YENDOR,
    PM_COCKATRICE, PM_ETTIN, PM_STALKER, PM_MINOTAUR,
    PM_OWLBEAR, PM_PURPLE_WORM, PM_XAN, PM_UMBER_HULK,
    PM_XORN, PM_ZRUTY, PM_LEOCROTTA, PM_BALUCHITHERIUM,
    PM_CARNIVOROUS_APE, PM_FIRE_ELEMENTAL, PM_JABBERWOCK,
    PM_IRON_GOLEM, PM_OCHRE_JELLY, PM_GREEN_SLIME,
    PM_DISPLACER_BEAST, PM_GENETIC_ENGINEER,
    PM_BLACK_DRAGON, PM_RED_DRAGON, PM_ARCH_LICH, PM_VAMPIRE_LEADER,
    PM_MASTER_MIND_FLAYER, PM_DISENCHANTER, PM_WINGED_GARGOYLE,
    PM_STORM_GIANT, PM_OLOG_HAI, PM_ELF_NOBLE, PM_ELVEN_MONARCH,
    PM_OGRE_TYRANT, PM_CAPTAIN, PM_GREMLIN,
    PM_SILVER_DRAGON, PM_ORANGE_DRAGON, PM_GREEN_DRAGON,
    PM_YELLOW_DRAGON, PM_GUARDIAN_NAGA, PM_FIRE_GIANT,
    PM_ALEAX, PM_COUATL, PM_HORNED_DEVIL, PM_BARBED_DEVIL,
    PM_HUMAN, PM_WATER_DEMON, PM_VAMPIRE, PM_TROLL,
    PM_FLOATING_EYE, PM_TRAPPER, PM_ARCHON,
    M3_WANTSAMUL, M3_WANTSBELL, M3_WANTSBOOK, M3_WANTSCAND,
    M3_WANTSARTI,
    G_HELL, G_NOHELL,
} from './monsters.js';
import { is_covetous, is_minion, attacktype, big_to_little, is_lminion } from './mondata.js';
import { Monnam } from './do_name.js';
import { hcolor } from './do_name.js';
import { newsym } from './display.js';
import { mpickobj } from './steal.js';
import { enexto, rloc, rloc_to } from './teleport.js';
import { helpless as monHelpless, healmon, wake_nearto } from './mon.js';
import { monster_census, msummon } from './minion.js';
import { sgn, distu, ROLL_FROM } from './hacklib.js';
import { is_quest_artifact } from './objdata.js';
import { rndcurse } from './sit.js';
import { builds_up, In_endgame, In_W_tower, In_hell, Is_astralevel } from './dungeon.js';

// Strategy constants imported from const.js (monst.h)

const MAXNASTIES = 10;
const MM_NOWAIT = 0x00000002;
const MM_NOMSG  = 0x00020000;

// ============================================================================
// Data tables
// ============================================================================

// cf. wizard.c:31 — nasties[]: array of powerful summoned monsters
// Grouped as neutral, chaotic, lawful (44 entries)
const nasties = [
    /* neutral */
    PM_COCKATRICE, PM_ETTIN, PM_STALKER, PM_MINOTAUR,
    PM_OWLBEAR, PM_PURPLE_WORM, PM_XAN, PM_UMBER_HULK,
    PM_XORN, PM_ZRUTY, PM_LEOCROTTA, PM_BALUCHITHERIUM,
    PM_CARNIVOROUS_APE, PM_FIRE_ELEMENTAL, PM_JABBERWOCK,
    PM_IRON_GOLEM, PM_OCHRE_JELLY, PM_GREEN_SLIME,
    PM_DISPLACER_BEAST, PM_GENETIC_ENGINEER,
    /* chaotic */
    PM_BLACK_DRAGON, PM_RED_DRAGON, PM_ARCH_LICH, PM_VAMPIRE_LEADER,
    PM_MASTER_MIND_FLAYER, PM_DISENCHANTER, PM_WINGED_GARGOYLE,
    PM_STORM_GIANT, PM_OLOG_HAI, PM_ELF_NOBLE, PM_ELVEN_MONARCH,
    PM_OGRE_TYRANT, PM_CAPTAIN, PM_GREMLIN,
    /* lawful */
    PM_SILVER_DRAGON, PM_ORANGE_DRAGON, PM_GREEN_DRAGON,
    PM_YELLOW_DRAGON, PM_GUARDIAN_NAGA, PM_FIRE_GIANT,
    PM_ALEAX, PM_COUATL, PM_HORNED_DEVIL, PM_BARBED_DEVIL,
];

// cf. wizard.c:52 — wizapp[]: 12 disguise forms for the Wizard
const wizapp = [
    PM_HUMAN, PM_WATER_DEMON, PM_VAMPIRE, PM_RED_DRAGON,
    PM_TROLL, PM_UMBER_HULK, PM_XORN, PM_XAN,
    PM_COCKATRICE, PM_FLOATING_EYE, PM_GUARDIAN_NAGA, PM_TRAPPER,
];

// cf. wizard.c:818 — random_insult[]
const random_insult = [
    "antic",      "blackguard",   "caitiff",    "chucklehead",
    "coistrel",   "craven",       "cretin",     "cur",
    "dastard",    "demon fodder", "dimwit",     "dolt",
    "fool",       "footpad",      "imbecile",   "knave",
    "maledict",   "miscreant",    "niddering",  "poltroon",
    "rattlepate", "reprobate",    "scapegrace", "varlet",
    "villein",    /* (sic.) */
    "wittol",     "worm",         "wretch",
];

// cf. wizard.c:829 — random_malediction[]
const random_malediction = [
    "Hell shall soon claim thy remains,",
    "I chortle at thee, thou pathetic",
    "Prepare to die, thou",
    "Resistance is useless,",
    "Surrender or die, thou",
    "There shall be no mercy, thou",
    "Thou shalt repent of thy cunning,",
    "Thou art as a flea to me,",
    "Thou art doomed,",
    "Thy fate is sealed,",
    "Verily, thou shalt be one dead",
];

// ============================================================================
// Utility helpers
// ============================================================================



// In_W_tower, In_hell imported from dungeon.js
const Inhell = In_hell;

// In_endgame imported from dungeon.js

// Is_astralevel imported from dungeon.js

// Is_rogue_level — stub
function Is_rogue_level() { return false; }

// inhistemple — stub (temple/epri tracking not available)
function inhistemple(/*mtmp*/) { return false; }

// inhishop — simplified check
function inhishop(mtmp) { return !!(mtmp.isshk && mtmp.shoproom); }

// ptr accessor for monster data
function mptr(mtmp) { return mtmp.data || mtmp.type || {}; }

// cansee_pos — can hero see location? (approximate)
function cansee_pos(map, player, fov, x, y) {
    if (player.blind) return false;
    if (fov && fov[y] && fov[y][x]) return true;
    return false;
}


// ============================================================================
// M_Wants — does monster want this artifact?
// cf. wizard.c:139
// ============================================================================

function M_Wants(mtmp, mask) {
    return !!(mptr(mtmp).mflags3 & mask);
}

// ============================================================================
// which_arti — convert M3_WANTS* mask to object type
// cf. wizard.c:141
// ============================================================================

function which_arti(mask) {
    switch (mask) {
    case M3_WANTSAMUL: return AMULET_OF_YENDOR;
    case M3_WANTSBELL: return BELL_OF_OPENING;
    case M3_WANTSCAND: return CANDELABRUM_OF_INVOCATION;
    case M3_WANTSBOOK: return SPE_BOOK_OF_THE_DEAD;
    default: return 0; // 0 signifies quest artifact
    }
}

// ============================================================================
// mon_has_arti — does monster carry specific artifact?
// cf. wizard.c:164
// If otyp=0, checks for quest artifact. Else checks specific otyp.
// ============================================================================
export function mon_has_arti(mtmp, otyp) {
    for (const otmp of mtmp.minvent || []) {
        if (otyp) {
            if (otmp.otyp === otyp) return true;
        } else if (is_quest_artifact(otmp)) {
            return true;
        }
    }
    return false;
}

// ============================================================================
// other_mon_has_arti — find another monster carrying artifact
// cf. wizard.c:183
// ============================================================================
export function other_mon_has_arti(mtmp, otyp, map) {
    for (const mtmp2 of map.monsters || []) {
        // no need for dead check — dead monsters have no inventory
        if (mtmp2 !== mtmp && mon_has_arti(mtmp2, otyp))
            return mtmp2;
    }
    return null;
}

// ============================================================================
// on_ground — find object of type on the ground
// cf. wizard.c:201
// ============================================================================
export function on_ground(otyp, map) {
    for (const otmp of map.objects || []) {
        if (otyp) {
            if (otmp.otyp === otyp) return otmp;
        } else if (is_quest_artifact(otmp)) {
            return otmp;
        }
    }
    return null;
}

// ============================================================================
// you_have — does player possess artifact matching mask?
// cf. wizard.c:215
// ============================================================================

function you_have(mask, player) {
    const inv = player.inventory || [];
    switch (mask) {
    case M3_WANTSAMUL: return inv.some(o => o && o.otyp === AMULET_OF_YENDOR);
    case M3_WANTSBELL: return inv.some(o => o && o.otyp === BELL_OF_OPENING);
    case M3_WANTSCAND: return inv.some(o => o && o.otyp === CANDELABRUM_OF_INVOCATION);
    case M3_WANTSBOOK: return inv.some(o => o && o.otyp === SPE_BOOK_OF_THE_DEAD);
    case M3_WANTSARTI: return false; // TODO: quest artifact tracking
    default: return false;
    }
}

// ============================================================================
// target_on — find goal position for covetous monster
// cf. wizard.c:235
// ============================================================================
// Autotranslated from wizard.c:235
export function target_on(mask, mtmp, player) {
  let otyp, otmp, mtmp2;
  if (!M_Wants(mask)) return  STRAT_NONE;
  otyp = which_arti(mask);
  if (!mon_has_arti(mtmp, otyp)) {
    if (you_have(mask)) {
      mtmp.mgoal.x = player.x;
      mtmp.mgoal.y = player.y;
      return (STRAT_PLAYER | mask);
    }
    else if ((otmp = on_ground(otyp))) {
      mtmp.mgoal.x = otmp.ox;
      mtmp.mgoal.y = otmp.oy;
      return (STRAT_GROUND | mask);
    }
    else if ((mtmp2 = other_mon_has_arti(mtmp, otyp)) != null   && (otyp !== AMULET_OF_YENDOR || (!mtmp2.iswiz && !inhistemple(mtmp2)))) {
      mtmp.mgoal.x = mtmp2.mx;
      mtmp.mgoal.y = mtmp2.my;
      return (STRAT_MONSTR | mask);
    }
  }
  mtmp.mgoal.x = mtmp.mgoal.y = 0;
  return  STRAT_NONE;
}

// ============================================================================
// strategy — covetous monster AI strategy selection
// cf. wizard.c:268
// ============================================================================

function strategy(mtmp, map, player) {
    const ptr = mptr(mtmp);

    if (!is_covetous(ptr)
        || (mtmp.isshk && inhishop(mtmp))
        || (mtmp.ispriest && inhistemple(mtmp)))
        return STRAT_NONE;

    let dstrat;
    const hpRatio = Math.floor((mtmp.mhp * 3) / mtmp.mhpmax); // 0-3
    switch (hpRatio) {
    default:
    case 0: // panic time — almost snuffed
        return STRAT_HEAL;
    case 1: // the wiz is less cautious
        if (ptr !== mons[PM_WIZARD_OF_YENDOR])
            return STRAT_HEAL;
        // fall through
    case 2:
        dstrat = STRAT_HEAL;
        break;
    case 3:
        dstrat = STRAT_NONE;
        break;
    }

    // C: if (svc.context.made_amulet)
    // Approximate: check if player has amulet
    if (you_have(M3_WANTSAMUL, player)) {
        const strat = target_on(M3_WANTSAMUL, mtmp, map, player);
        if (strat !== STRAT_NONE) return strat;
    }

    // C: if (u.uevent.invoked) — invocation not tracked; use default order
    let strat;
    if ((strat = target_on(M3_WANTSBOOK, mtmp, map, player)) !== STRAT_NONE) return strat;
    if ((strat = target_on(M3_WANTSBELL, mtmp, map, player)) !== STRAT_NONE) return strat;
    if ((strat = target_on(M3_WANTSCAND, mtmp, map, player)) !== STRAT_NONE) return strat;
    if ((strat = target_on(M3_WANTSARTI, mtmp, map, player)) !== STRAT_NONE) return strat;

    return dstrat;
}

// ============================================================================
// choose_stairs — find stairs for fleeing covetous monster
// cf. wizard.c:330
// sx_out, sy_out are output objects: {x:} and {y:}
// dir: true = forward, false = backtrack (usually up)
// ============================================================================

export function choose_stairs(sx_out, sy_out, dir, map) {
    const stdir = builds_up(map) ? dir : !dir;

    // Look for stairs in preferred direction, then fallback
    let stway = null;
    if (stdir && map.upstair) stway = map.upstair;
    else if (!stdir && map.dnstair) stway = map.dnstair;

    if (!stway) {
        // Try other direction
        if (!stdir && map.upstair) stway = map.upstair;
        else if (stdir && map.dnstair) stway = map.dnstair;
    }

    if (stway) {
        sx_out.x = stway.x;
        sy_out.y = stway.y;
    }
}

// ============================================================================
// amulet — If you have the Amulet, alert the Wizard; show portal heat
// cf. wizard.c:59
// ============================================================================

export async function amulet(map, player, display) {
    // C: check if wearing or wielding the real Amulet of Yendor
    const amu = (player.amulet && player.amulet.otyp === AMULET_OF_YENDOR)
             ? player.amulet
             : (player.weapon && player.weapon.otyp === AMULET_OF_YENDOR)
             ? player.weapon
             : null;

    if (amu && !rn2(15)) {
        // Search for magic portal traps and give proximity hints
        for (const ttmp of map.traps || []) {
            if (ttmp.ttyp === MAGIC_PORTAL) {
                const tx = ttmp.tx !== undefined ? ttmp.tx : ttmp.x;
                const ty = ttmp.ty !== undefined ? ttmp.ty : ttmp.y;
                const du = distu(player, tx, ty);
                if (du <= 9)
                    await pline("The Amulet of Yendor feels hot!");
                else if (du <= 64)
                    await pline("The Amulet of Yendor feels very warm.");
                else if (du <= 144)
                    await pline("The Amulet of Yendor feels warm.");
                // else, the amulet feels normal
                break;
            }
        }
    }

    // C: if (!svc.context.no_of_wizards) return;
    // Count wizards on level
    let wizCount = 0;
    for (const mtmp of map.monsters || []) {
        if (mtmp.dead) continue;
        if (mtmp.iswiz) wizCount++;
    }
    if (!wizCount) return;

    // Find Wizard and wake him if necessary
    for (const mtmp of map.monsters || []) {
        if (mtmp.dead) continue;
        if (mtmp.iswiz && mtmp.sleeping && !rn2(40)) {
            mtmp.sleeping = false;
            mtmp.msleeping = 0;
            if (!m_next2u(mtmp, player))
                await You("get the creepy feeling that somebody noticed your taking the Amulet.");
            return;
        }
    }
}

// ============================================================================
// mon_has_amulet — does this monster carry the Amulet of Yendor?
// cf. wizard.c:104
// ============================================================================

// Autotranslated from wizard.c:105
export function mon_has_amulet(mtmp) {
  let otmp;
  for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
    if (otmp.otyp === AMULET_OF_YENDOR) return 1;
  }
  return 0;
}

// ============================================================================
// mon_has_special — does monster carry a quest-relevant item?
// cf. wizard.c:115
// ============================================================================

export function mon_has_special(mtmp) {
    for (const otmp of mtmp.minvent || []) {
        if (otmp.otyp === AMULET_OF_YENDOR
            || is_quest_artifact(otmp)
            || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD)
            return true;
    }
    return false;
}

// ============================================================================
// tactics — execute covetous monster's strategy
// cf. wizard.c:367
// ============================================================================

export async function tactics(mtmp, map, player, display, fov) {
    const strat = strategy(mtmp, map, player);
    const sx_out = { x: 0 };
    const sy_out = { y: 0 };

    // Update mstrategy, preserving wait/appear flags
    mtmp.mstrategy =
        ((mtmp.mstrategy || 0) & (STRAT_WAITMASK | STRAT_APPEARMSG)) | strat;

    switch (strat) {
    case STRAT_HEAL: { // hide and recover
        let mx = mtmp.mx, my = mtmp.my;

        // C: if (u.uswallow && u.ustuck == mtmp) expels()
        // TODO: expels not ported

        // If wounded, hole up on or near the stairs (to block them)
        choose_stairs(sx_out, sy_out, !!(mtmp.m_id % 2), map);
        mtmp.mavenge = 1; // covetous monsters attack while fleeing
        const sx = sx_out.x, sy = sy_out.y;

        if (In_W_tower(mx, my)
            || (mtmp.iswiz && !sx && !mon_has_amulet(mtmp))) {
            if (!rn2(3 + Math.floor(mtmp.mhp / 10)))
                await rloc(mtmp, RLOC_MSG, map, player, display, fov);
        } else if (sx && (mx !== sx || my !== sy)) {
            // mnearto: teleport near stairs
            const cc = {};
            if (!enexto(cc, sx, sy, mptr(mtmp), map, player)
                || (await rloc_to(mtmp, cc.x, cc.y, map, player, display, fov), false)) {
                // couldn't move to target; stay put
                await rloc_to(mtmp, mx, my, map, player, display, fov);
                return 0;
            }
            await rloc_to(mtmp, cc.x, cc.y, map, player, display, fov);
            mx = mtmp.mx;
            my = mtmp.my;
        }
        // if you're not around, cast healing spells
        if (distu(player, mx, my) > (BOLT_LIM * BOLT_LIM)) {
            if (mtmp.mhp <= mtmp.mhpmax - 8) {
                healmon(mtmp, rnd(8), 0);
                return 1;
            }
        }
    }
    // FALLTHROUGH to STRAT_NONE
    // eslint-disable-next-line no-fallthrough
    case STRAT_NONE: { // harass
        if (!rn2(!mtmp.mflee ? 5 : 33)) {
            // mnexto: teleport near current position
            const cc = {};
            if (enexto(cc, mtmp.mx, mtmp.my, mptr(mtmp), map, player))
                await rloc_to(mtmp, cc.x, cc.y, map, player, display, fov);
        }
        return 0;
    }

    default: { // kill, maim, pillage!
        const where = (strat & STRAT_STRATMASK);
        const tx = mtmp.mgoal ? mtmp.mgoal.x : 0;
        const ty = mtmp.mgoal ? mtmp.mgoal.y : 0;
        const targ = (strat & STRAT_GOAL);

        if (!targ) return 0; // simply wants you to close

        if ((player.x === tx && player.y === ty) || where === STRAT_PLAYER) {
            // player is standing on it (or has it) — teleport near
            const mx = mtmp.mx, my = mtmp.my;
            const cc = {};
            if (enexto(cc, tx, ty, mptr(mtmp), map, player))
                await rloc_to(mtmp, cc.x, cc.y, map, player, display, fov);
            else
                await rloc_to(mtmp, mx, my, map, player, display, fov);
            return 0;
        }

        if (where === STRAT_GROUND) {
            if (!map.monsterAt(tx, ty) || (mtmp.mx === tx && mtmp.my === ty)) {
                // teleport to it and pick it up
                await rloc_to(mtmp, tx, ty, map, player, display, fov);

                const otmp = on_ground(which_arti(targ), map);
                if (otmp) {
                    if (cansee_pos(map, player, fov, mtmp.mx, mtmp.my))
                        await pline("%s picks up %s.", Monnam(mtmp), doname(otmp, player));
                    // obj_extract_self — remove from map objects
                    const idx = (map.objects || []).indexOf(otmp);
                    if (idx >= 0) map.objects.splice(idx, 1);
                    mpickobj(mtmp, otmp);
                    return 1;
                }
                return 0;
            } else {
                // a monster is standing on it — cause some trouble
                if (!rn2(5)) {
                    const cc = {};
                    if (enexto(cc, mtmp.mx, mtmp.my, mptr(mtmp), map, player))
                        await rloc_to(mtmp, cc.x, cc.y, map, player, display, fov);
                }
                return 0;
            }
        } else {
            // a monster has it — port beside it
            const mx = mtmp.mx, my = mtmp.my;
            const cc = {};
            if (enexto(cc, tx, ty, mptr(mtmp), map, player))
                await rloc_to(mtmp, cc.x, cc.y, map, player, display, fov);
            else
                await rloc_to(mtmp, mx, my, map, player, display, fov);
            return 0;
        }
    } // default case
    } // switch
}

// ============================================================================
// has_aggravatables — are there any monsters mon could aggravate?
// cf. wizard.c:466
// ============================================================================

export function has_aggravatables(mon, map, player) {
    const in_w_tower = In_W_tower(mon.mx, mon.my);

    if (in_w_tower !== In_W_tower(player.x, player.y))
        return false;

    for (const mtmp of map.monsters || []) {
        if (mtmp.dead) continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my))
            continue;
        if (((mtmp.mstrategy || 0) & STRAT_WAITFORU) !== 0 || monHelpless(mtmp))
            return true;
    }
    return false;
}

// ============================================================================
// aggravate — wake all monsters on level
// cf. wizard.c:486
// ============================================================================

export function aggravate(map, player) {
    const in_w_tower = In_W_tower(player ? player.x : 0, player ? player.y : 0);

    for (const mtmp of map.monsters || []) {
        if (mtmp.dead) continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my))
            continue;
        mtmp.mstrategy = (mtmp.mstrategy || 0) & ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.sleeping = false;
        mtmp.msleeping = 0;
        if (mtmp.mcanmove === false && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = true;
        }
    }
}

// ============================================================================
// clonewiz — Wizard cloning ("Double Trouble")
// cf. wizard.c:510
// ============================================================================

export function clonewiz(map, player, display) {
    const depth = player?.dungeonLevel || 1;
    const mtmp2 = makemon(mons[PM_WIZARD_OF_YENDOR], player.x, player.y,
                          MM_NOWAIT, depth, map);
    if (mtmp2) {
        mtmp2.sleeping = false;
        mtmp2.msleeping = 0;
        mtmp2.tame = false;
        mtmp2.mtame = 0;
        mtmp2.peaceful = false;
        mtmp2.mpeaceful = false;

        // Give clone a fake amulet sometimes
        const playerHasAmulet = (player.inventory || []).some(
            o => o && o.otyp === AMULET_OF_YENDOR
        );
        if (!playerHasAmulet && rn2(2)) {
            const fake = mksobj(FAKE_AMULET_OF_YENDOR, true, false);
            if (fake) add_to_minv(mtmp2, fake);
        }

        // C: if (!Protection_from_shape_changers)
        // Protection not tracked; apply disguise unconditionally
        mtmp2.m_ap_type = M_AP_MONSTER;
        mtmp2.mappearance = ROLL_FROM(wizapp);

        if (map) newsym(mtmp2.mx, mtmp2.my);
    }
}

// ============================================================================
// pick_nasty — select a random nasty monster type
// cf. wizard.c:531
// Also used by newcham().
// ============================================================================

export function pick_nasty(difcap) {
    // C: res = ROLL_FROM(nasties) — consumes rn2(SIZE(nasties))
    let res = ROLL_FROM(nasties);

    // C: Is_rogue_level check — re-roll for uppercase monster
    // Is_rogue_level not tracked; skip the check but if it were rogue level
    // we'd consume another rn2(nasties.length)
    // TODO: if (Is_rogue_level()) res = ROLL_FROM(nasties);

    // Check for genocided, too difficult, or out of place
    let alt = res;
    // mvitals not tracked (genocide/extinction)
    if ((difcap > 0 && (mons[res].difficulty || 0) >= difcap)
        // C: (mons[res].geno & (Inhell ? G_NOHELL : G_HELL)) != 0
        || ((mons[res].geno || 0) & (Inhell() ? G_NOHELL : G_HELL)) !== 0) {
        alt = big_to_little(res);
    }
    if (alt !== res /* && not genocided */) {
        const mnam = mons[alt].mname || '';
        // only non-juveniles can become alternate choice
        if (!mnam.startsWith('baby ')
            && !mnam.endsWith(' hatchling')
            && !mnam.endsWith(' pup')
            && !mnam.endsWith(' cub')) {
            res = alt;
        }
    }

    return res;
}

// ============================================================================
// nasty — summon wave of powerful monsters
// cf. wizard.c:584
// Returns number of monsters created.
// ============================================================================

export async function nasty(summoner, map, player, display, fov) {
    const depth = player?.dungeonLevel || 1;
    // when a monster casts "summon nasties", suppress appear message;
    // when random harassment casts, show messages
    const mmflags = summoner ? MM_NOMSG : NO_MM_FLAGS;

    const census = monster_census(false, map, player, fov);

    if (!rn2(10) && Inhell()) {
        // summon demon prince/lord (like WoY)
        const count = await msummon(null, map, player, display);
        return count > 0 ? monster_census(false, map, player, fov) - census : 0;
    }

    let count = 0;
    const s_cls = summoner ? mptr(summoner).mlet : 0;
    let difcap = summoner ? (mptr(summoner).difficulty || 0) : 0;
    const castalign = summoner ? sgn(mptr(summoner).align || 0) : 0;
    let tmp = ((player.ulevel || 1) > 3)
        ? Math.floor((player.ulevel || 1) / 3) : 1;

    const bypos = { x: player.x, y: player.y };

    for (let i = rnd(tmp); i > 0 && count < MAXNASTIES; --i) {
        for (let j = 0; j < 20; j++) {
            // Pick a nasty, avoiding chain summoners
            let trylimit = 10 + 1; // 10 tries
            let makeindex;
            let m_cls;
            let gotoNextJ = false;
            do {
                if (!--trylimit) { gotoNextJ = true; break; }
                makeindex = pick_nasty(difcap);
                m_cls = mons[makeindex].mlet;
            } while ((difcap > 0 && (mons[makeindex].difficulty || 0) >= difcap
                      && attacktype(mons[makeindex], AT_MAGC))
                     || (s_cls === S_DEMON && m_cls === S_ANGEL)
                     || (s_cls === S_ANGEL && m_cls === S_DEMON));
            if (gotoNextJ) continue;

            // do this after picking the monster to place
            if (summoner) {
                const pos = {};
                // C: enexto(&bypos, summoner->mux, summoner->muy, ...)
                const mux = summoner.mux || summoner.mx || player.x;
                const muy = summoner.muy || summoner.my || player.y;
                if (!enexto(pos, mux, muy, mons[makeindex], map, player))
                    continue;
                bypos.x = pos.x;
                bypos.y = pos.y;
            }

            // Try to create the chosen nasty
            let mtmp = makemon(mons[makeindex], bypos.x, bypos.y,
                               mmflags, depth, map);
            if (mtmp) {
                mtmp.sleeping = false;
                mtmp.msleeping = 0;
                mtmp.mpeaceful = false;
                mtmp.peaceful = false;
                mtmp.tame = false;
                mtmp.mtame = 0;
                // set_malign(mtmp) — alignment penalty not set (deferred)
            } else {
                // random monster substitute for genocided selection
                mtmp = makemon(null, bypos.x, bypos.y, mmflags, depth, map);
                if (mtmp) {
                    m_cls = mptr(mtmp).mlet;
                    if ((difcap > 0 && (mptr(mtmp).difficulty || 0) >= difcap
                         // in endgame, rn2(3); otherwise rn2(7)
                         && rn2(In_endgame() ? 3 : 7) // usually cap
                         && attacktype(mptr(mtmp), AT_MAGC))
                        || (s_cls === S_DEMON && m_cls === S_ANGEL)
                        || (s_cls === S_ANGEL && m_cls === S_DEMON)) {
                        // unmakemon — remove unsuitable substitute
                        if (map && map.removeMonster) map.removeMonster(mtmp);
                        mtmp.dead = true;
                        mtmp = null;
                    }
                }
            }

            if (mtmp) {
                // cap difficulty after creating arch-lich or archon
                if (mtmp.mndx === PM_ARCH_LICH || mtmp.mndx === PM_ARCHON) {
                    const cap = Math.min(
                        mons[PM_ARCHON].difficulty || 26,
                        mons[PM_ARCH_LICH].difficulty || 31
                    );
                    if (!difcap || difcap > cap) difcap = cap;
                }
                // delay first use of spell or breath attack
                mtmp.mspec_used = rnd(4);

                if (++count >= MAXNASTIES
                    || (mptr(mtmp).align || 0) === 0
                    || sgn(mptr(mtmp).align || 0) === castalign)
                    break;
            }
            // nextj: continue
        } // for j
    } // for i

    if (count) count = monster_census(false, map, player, fov) - census;
    return count;
}

// ============================================================================
// resurrect — bring back the Wizard of Yendor
// cf. wizard.c:708
// ============================================================================

export async function resurrect(map, player, display) {
    const depth = player?.dungeonLevel || 1;
    let mtmp;
    let verb;

    // Count existing wizards on level
    let wizCount = 0;
    for (const m of map.monsters || []) {
        if (!m.dead && m.iswiz) wizCount++;
    }

    if (!wizCount) {
        // make a new Wizard
        verb = "kill";
        mtmp = makemon(mons[PM_WIZARD_OF_YENDOR], player.x, player.y,
                       MM_NOWAIT, depth, map);
        // affects experience; he's not coming back from a corpse
        // but is subject to repeated killing like a revived corpse
        if (mtmp) mtmp.mrevived = true;
    } else {
        // C: look for migrating Wizard
        // Migration system not fully ported. Try to find and wake existing wizard.
        verb = "elude";
        for (const m of map.monsters || []) {
            if (m.dead) continue;
            if (m.iswiz && !mon_has_amulet(m)) {
                mtmp = m;
                if (mtmp.sleeping) {
                    mtmp.sleeping = false;
                    mtmp.msleeping = 0;
                }
                if (mtmp.mfrozen === 1) { mtmp.mfrozen = 0; mtmp.mcanmove = true; }
                break;
            }
        }
    }

    if (mtmp) {
        mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
        mtmp.tame = false;
        mtmp.mtame = 0;
        mtmp.mpeaceful = false;
        mtmp.peaceful = false;
        // set_malign(mtmp) — deferred

        // C: if (!Deaf)
        if (!player.deaf) {
            await pline("A voice booms out...");
            await verbalize("So thou thought thou couldst %s me, fool.", verb);
        }
    }
}

// ============================================================================
// intervene — retaliate after Wizard is killed
// cf. wizard.c:778
// ============================================================================

export async function intervene(map, player, display, fov) {
    // C: int which = Is_astralevel(&u.uz) ? rnd(4) : rn2(6);
    const which = Is_astralevel() ? rnd(4) : rn2(6);

    switch (which) {
    case 0:
    case 1:
        await You_feel("vaguely nervous.");
        break;
    case 2:
        if (!player.blind)
            await You("notice a %s glow surrounding you.", hcolor("black"));
        await rndcurse(player, map, display);
        break;
    case 3:
        aggravate(map, player);
        break;
    case 4:
        await nasty(null, map, player, display, fov);
        break;
    case 5:
        await resurrect(map, player, display);
        break;
    }
}

// ============================================================================
// wizdeadorgone — Wizard removal bookkeeping
// cf. wizard.c:808
// ============================================================================

export function wizdeadorgone(player) {
    // C: svc.context.no_of_wizards--;
    // Wizard count is derived from map.monsters at runtime;
    // no global counter to decrement.

    if (!player.udemigod) {
        player.udemigod = true;
        player.udg_cnt = rn1(250, 50);
    }
}

// ============================================================================
// cuss — Wizard/minion taunts and threats
// cf. wizard.c:839
// ============================================================================

export async function cuss(mtmp, map, player) {
    // C: if (Deaf) return;
    if (player.deaf) return;

    if (mtmp.iswiz) {
        if (!rn2(5)) { // typical bad guy action
            await pline("%s laughs fiendishly.", Monnam(mtmp));
        } else if (you_have(M3_WANTSAMUL, player) && !rn2(random_insult.length)) {
            // C: SetVoice(mtmp, 0, 80, 0);
            await verbalize("Relinquish the amulet, %s!", ROLL_FROM(random_insult));
        } else if ((player.uhp || 0) < 5 && !rn2(2)) { // Panic
            // C: SetVoice(mtmp, 0, 80, 0);
            await verbalize(rn2(2) ? "Even now thy life force ebbs, %s!"
                             : "Savor thy breath, %s, it be thy last!",
                      ROLL_FROM(random_insult));
        } else if (mtmp.mhp < 5 && !rn2(2)) { // Parthian shot
            // C: SetVoice(mtmp, 0, 80, 0);
            await verbalize(rn2(2) ? "I shall return." : "I'll be back.");
        } else {
            // C: SetVoice(mtmp, 0, 80, 0);
            await verbalize("%s %s!",
                      ROLL_FROM(random_malediction),
                      ROLL_FROM(random_insult));
        }
    } else if (is_lminion(mtmp)
               && !(mtmp.isminion && mtmp.emin && mtmp.emin.renegade)) {
        // C: com_pager("angel_cuss") — quest text system not ported
        await pline("%s casts aspersions on your ancestry.", Monnam(mtmp));
    } else {
        if (!rn2(is_minion(mptr(mtmp)) ? 100 : 5))
            await pline("%s casts aspersions on your ancestry.", Monnam(mtmp));
        else {
            // C: com_pager("demon_cuss") — quest text system not ported
            await pline("%s casts aspersions on your ancestry.", Monnam(mtmp));
        }
    }

    wake_nearto(mtmp.mx, mtmp.my, 5 * 5, map);
}

// ============================================================================
// Exports of constants and internal functions for use by other modules
// ============================================================================

export { nasties, wizapp, which_arti, strategy };
