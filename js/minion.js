// minion.js -- Minion summoning: demons, angels, guardian management
// cf. minion.c — newemin, free_emin, monster_census, msummon,
//                summon_minion, demon_talk, bribe,
//                dprince, dlord, llord, lminion, ndemon,
//                lose_guardian_angel, gain_guardian_angel

import { rn2, rnd, rn1 } from './rng.js';
import { pline, You_feel, verbalize } from './pline.js';
import { makemon, mkclass } from './makemon.js';
import { NO_MM_FLAGS } from './const.js';
import { AMULET_OF_YENDOR } from './objects.js';
import { mons, S_ANGEL, S_DEMON, PM_WIZARD_OF_YENDOR, PM_ANGEL, PM_ARCHON, PM_BONE_DEVIL, PM_SKELETON, PM_JUIBLEX, PM_YEENOGHU, PM_ORCUS, PM_DEMOGORGON, PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL, PM_SHOPKEEPER, PM_ALIGNED_CLERIC, PM_HIGH_CLERIC, G_UNIQ } from './monsters.js';
import { A_NONE, A_CHAOTIC, A_NEUTRAL, A_LAWFUL } from './const.js';
import {
    is_ndemon, is_dlord, is_dprince,
    is_lord, canseemon, is_lminion,
} from './mondata.js';
import { Monnam, Amonnam } from './do_name.js';
import { newsym } from './display.js';
import { enexto } from './teleport.js';
import { RLOC_MSG, NON_PM } from './const.js';

// cf. minion.c:11 — elementals[] for neutral minion summoning
const elementals = [
    PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL,
    PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL,
];

// MM_EMIN flag — add emin structure
const MM_EMIN = 0x00000400;
// MM_NOMSG flag — suppress appear message
const MM_NOMSG = 0x00020000;

// ============================================================================
// newemin / free_emin — minion extra data
// cf. minion.c:17, minion.c:28
// ============================================================================

export function newemin(mtmp) {
    if (!mtmp.emin) {
        mtmp.emin = { min_align: A_NONE, renegade: false };
    }
}

export function free_emin(mtmp) {
    mtmp.emin = null;
    mtmp.isminion = false;
}

// ============================================================================
// monster_census — count monsters on level
// cf. minion.c:39
// ============================================================================

export function monster_census(spotted, map, player, fov) {
    let count = 0;
    for (const mtmp of map.monsters || []) {
        if (mtmp.dead) continue;
        // C: if (mtmp->isgd && mtmp->mx == 0) continue;
        if (mtmp.isgd && mtmp.mx === 0) continue;
        if (spotted && !canseemon(mtmp, player, fov)) continue;
        ++count;
    }
    return count;
}


// ============================================================================
// dprince — select demon prince by alignment
// cf. minion.c:389
// ============================================================================

export function dprince(atyp) {
    // C: for (tryct = !In_endgame(&u.uz) ? 20 : 0; tryct > 0; --tryct)
    // We don't have In_endgame at runtime yet; assume not in endgame (tryct=20)
    const tryct_max = 20;
    for (let tryct = tryct_max; tryct > 0; --tryct) {
        // C: pm = rn1(PM_DEMOGORGON + 1 - PM_ORCUS, PM_ORCUS)
        const pm = rn1(PM_DEMOGORGON + 1 - PM_ORCUS, PM_ORCUS);
        // C: !(mvitals[pm].mvflags & G_GONE) — genocide not tracked yet
        // C: (atyp == A_NONE || sgn(mons[pm].maligntyp) == sgn(atyp))
        if (atyp === A_NONE || Math.sign(mons[pm].maligntyp) === Math.sign(atyp))
            return pm;
    }
    return dlord(atyp); // approximate
}

// ============================================================================
// dlord — select demon lord by alignment
// cf. minion.c:403
// ============================================================================

export function dlord(atyp) {
    const tryct_max = 20;
    for (let tryct = tryct_max; tryct > 0; --tryct) {
        // C: pm = rn1(PM_YEENOGHU + 1 - PM_JUIBLEX, PM_JUIBLEX)
        const pm = rn1(PM_YEENOGHU + 1 - PM_JUIBLEX, PM_JUIBLEX);
        if (atyp === A_NONE || Math.sign(mons[pm].maligntyp) === Math.sign(atyp))
            return pm;
    }
    return ndemon(atyp); // approximate
}

// ============================================================================
// llord — select lawful lord (Archon)
// cf. minion.c:418
// ============================================================================

// Autotranslated from minion.c:418
export function llord(game) {
  if (!(game.mvitals[PM_ARCHON].mvflags & G_GONE)) return PM_ARCHON;
  return lminion();
}

// ============================================================================
// lminion — select lawful minion (random angel class)
// cf. minion.c:427
// ============================================================================

export function lminion(depth) {
    for (let tryct = 0; tryct < 20; tryct++) {
        // C: ptr = mkclass(S_ANGEL, 0); if (ptr && !is_lord(ptr)) return monsndx(ptr)
        const mndx = mkclass(S_ANGEL, 0, depth || 1);
        if (mndx >= 0 && !is_lord(mons[mndx]))
            return mndx;
    }
    return NON_PM;
}

// ============================================================================
// ndemon — select random non-lord/non-prince demon by alignment
// cf. minion.c:442
// ============================================================================

export function ndemon(atyp, depth) {
    // C: ptr = mkclass_aligned(S_DEMON, 0, atyp)
    // Our mkclass already supports alignment filtering via atyp parameter
    const mndx = mkclass(S_DEMON, 0, depth || 1, atyp);
    return (mndx >= 0 && is_ndemon(mons[mndx])) ? mndx : NON_PM;
}

// ============================================================================
// msummon — monster summons allies
// cf. minion.c:58
// ============================================================================

export async function msummon(mon, map, player, display) {
    let dtype = NON_PM, cnt = 0, result = 0;
    let atyp;
    const depth = player?.dungeonLevel || 1;

    let ptr;
    if (mon) {
        ptr = mon.type || mon.data || {};

        // C: if (u_wield_art(ART_DEMONBANE) && is_demon(ptr))
        // TODO: Demonbane wielding check — skip for now

        // Determine alignment
        if (mon.ispriest && mon.epri) {
            atyp = mon.epri.shralign;
        } else if (mon.isminion && mon.emin) {
            atyp = mon.emin.min_align;
        } else {
            atyp = (ptr.maligntyp === A_NONE) ? A_NONE : Math.sign(ptr.maligntyp);
        }
    } else {
        // Null summoner = Wizard of Yendor
        ptr = mons[PM_WIZARD_OF_YENDOR];
        atyp = (ptr.maligntyp === A_NONE) ? A_NONE : Math.sign(ptr.maligntyp);
    }

    if (is_dprince(ptr) || (mon === null || (mon && mon.mndx === PM_WIZARD_OF_YENDOR))) {
        dtype = (!rn2(20)) ? dprince(atyp)
              : (!rn2(4)) ? dlord(atyp)
              : ndemon(atyp, depth);
        cnt = ((dtype !== NON_PM) && !rn2(4) && is_ndemon(mons[dtype])) ? 2 : 1;
    } else if (is_dlord(ptr)) {
        dtype = (!rn2(50)) ? dprince(atyp)
              : (!rn2(20)) ? dlord(atyp)
              : ndemon(atyp, depth);
        cnt = ((dtype !== NON_PM) && !rn2(4) && is_ndemon(mons[dtype])) ? 2 : 1;
    } else if (mon && mon.mndx === PM_BONE_DEVIL) {
        dtype = PM_SKELETON;
        cnt = 1;
    } else if (is_ndemon(ptr)) {
        dtype = (!rn2(20)) ? dlord(atyp)
              : (!rn2(6)) ? ndemon(atyp, depth)
              : (mon ? mon.mndx : NON_PM);
        cnt = 1;
    } else if (is_lminion(mon)) {
        dtype = (is_lord(ptr) && !rn2(20))
                    ? llord()
                    : (is_lord(ptr) || !rn2(6)) ? lminion(depth) : (mon ? mon.mndx : NON_PM);
        cnt = ((dtype !== NON_PM) && !rn2(4) && !is_lord(mons[dtype])) ? 2 : 1;
    } else if (mon && mon.mndx === PM_ANGEL) {
        // non-lawful angels can also summon
        if (!rn2(6)) {
            switch (atyp) {
            case A_NEUTRAL:
                dtype = elementals[rn2(elementals.length)];
                break;
            case A_CHAOTIC:
            case A_NONE:
                dtype = ndemon(atyp, depth);
                break;
            default:
                dtype = PM_ANGEL;
                break;
            }
        } else {
            dtype = PM_ANGEL;
        }
        cnt = ((dtype !== NON_PM) && !rn2(4) && !is_lord(mons[dtype])) ? 2 : 1;
    }

    if (dtype === NON_PM) return 0;

    // Sanity checks
    if (cnt > 1 && (mons[dtype].geno & G_UNIQ) !== 0) cnt = 1;

    // C: if mvitals[dtype].mvflags & G_GONE — genocide not tracked yet; skip

    // Census for group-counting
    const census = monster_census(false, map, player);

    while (cnt > 0) {
        const mtmp = makemon(mons[dtype], player.x, player.y, MM_EMIN | MM_NOMSG, depth, map);
        if (mtmp) {
            result++;
            // Angel alignment matching
            if (dtype === PM_ANGEL) {
                mtmp.isminion = true;
                newemin(mtmp);
                mtmp.emin.min_align = atyp;
                // renegade if same alignment but not peaceful, or peaceful but different alignment
                mtmp.emin.renegade = (atyp !== (player.alignment || 0)) !== !mtmp.peaceful;
            }

            // C: appearance message for last in batch
            if (cnt === 1 && canseemon(mtmp, player)) {
                if (display) {
                    await display.putstr_message(`${Amonnam(mtmp)} appears!`);
                } else {
                    await pline("%s appears!", Amonnam(mtmp));
                }
            }
        }
        cnt--;
    }

    // Actual census difference
    if (result) result = monster_census(false, map, player) - census;
    return result;
}

// ============================================================================
// summon_minion — summon aligned minion for player
// cf. minion.c:197
// ============================================================================

export async function summon_minion(alignment, talk, map, player, display) {
    const depth = player?.dungeonLevel || 1;
    let mnum;

    switch (alignment) {
    case A_LAWFUL:
        mnum = lminion(depth);
        break;
    case A_NEUTRAL:
        mnum = elementals[rn2(elementals.length)];
        break;
    case A_CHAOTIC:
    case A_NONE:
        mnum = ndemon(alignment, depth);
        break;
    default:
        // impossible("unaligned player?");
        mnum = ndemon(A_NONE, depth);
        break;
    }

    let mon;
    if (mnum === NON_PM) {
        mon = null;
    } else if (mnum === PM_ANGEL) {
        mon = makemon(mons[mnum], player.x, player.y, MM_EMIN | MM_NOMSG, depth, map);
        if (mon) {
            mon.isminion = true;
            newemin(mon);
            mon.emin.min_align = alignment;
            mon.emin.renegade = false;
        }
    } else if (mnum !== PM_SHOPKEEPER && mnum !== PM_GUARD
               && mnum !== PM_ALIGNED_CLERIC && mnum !== PM_HIGH_CLERIC) {
        mon = makemon(mons[mnum], player.x, player.y, MM_EMIN | MM_NOMSG, depth, map);
        if (mon) {
            mon.isminion = true;
            newemin(mon);
            mon.emin.min_align = alignment;
            mon.emin.renegade = false;
        }
    } else {
        mon = makemon(mons[mnum], player.x, player.y, MM_NOMSG, depth, map);
    }

    if (mon) {
        if (talk) {
            // C: pline_The("voice of %s booms:", align_gname(alignment))
            // align_gname not readily available here; use generic message
            await pline("A divine voice booms!");
            await verbalize("Thou shalt pay for thine indiscretion!");
            if (canseemon(mon, player)) {
                await pline("%s appears before you.", Amonnam(mon));
            }
        }
        mon.peaceful = false;
        // don't call set_malign(); player was naughty
    }
}

// ============================================================================
// demon_talk — handle demon negotiation/bribery
// cf. minion.c:262
// Returns 1 if demon accepts bribe and won't attack, 0 otherwise.
// ============================================================================

export async function demon_talk(mtmp, map, player, display) {
    // C: if (u_wield_art(ART_EXCALIBUR) || u_wield_art(ART_DEMONBANE))
    // TODO: artifact wielding check — approximate with weapon name check
    const weapon = player?.weapon;
    if (weapon && (weapon.artifactName === 'Excalibur' || weapon.artifactName === 'Demonbane')) {
        if (canseemon(mtmp, player)) {
            await pline("%s looks very angry.", Amonnam(mtmp));
        } else {
            await You_feel("tension building.");
        }
        mtmp.peaceful = false;
        mtmp.tame = false;
        if (map && display) newsym(mtmp.mx, mtmp.my);
        return 0;
    }

    // C: Slight advantage — demon prince becomes visible
    if (is_dprince(mtmp.data || mtmp.type || {}) && mtmp.invisible) {
        mtmp.invisible = false;
        mtmp.perminvis = false;
        if (map && display) newsym(mtmp.mx, mtmp.my);
    }

    const ptr = mtmp.data || mtmp.type || {};
    // C: if (youmonst.data->mlet == S_DEMON) — player polymorphed into demon
    // TODO: player polymorph check

    // C: cash = money_cnt(invent)
    const cash = player?.gold || 0;
    // C: Athome = Inhell && (mtmp->cham == NON_PM)
    const Athome = false; // TODO: Inhell check not available

    let demand = Math.floor((cash * (rnd(80) + 20 * (Athome ? 1 : 0)))
        / (100 * (1 + (Math.sign(player?.alignment || 0) === Math.sign(ptr.maligntyp || 0) ? 1 : 0))));

    if (!demand) {
        mtmp.peaceful = false;
        return 0;
    }

    // C: if mon_has_amulet or Deaf, make demand unmeetable
    // TODO: Deaf check
    // Inline mon_has_amulet check to avoid circular dependency with wizard.js
    const hasAmulet = (mtmp.inventory || []).some(o => o && o.otyp === AMULET_OF_YENDOR);
    if (hasAmulet) {
        demand = cash + rn1(1000, 125);
    }

    await pline("%s demands %d zorkmids for safe passage.", Amonnam(mtmp), demand);

    // C: offer = bribe(mtmp) — prompts player for gold
    // TODO: bribe() requires getlin() which needs UI integration
    // For now, stub: demon always gets angry
    await pline("%s gets angry...", Amonnam(mtmp));
    mtmp.peaceful = false;
    return 0;
}

// ============================================================================
// bribe — get gold amount offered to demon
// cf. minion.c:359
// TODO: Requires getlin() for user input — stub for now
// ============================================================================

export function bribe(mtmp, map, player, display) {
    // TODO: minion.c:359 — bribe() needs getlin() UI integration
    return 0;
}

// ============================================================================
// lose_guardian_angel — remove guardian angel
// cf. minion.c:466
// ============================================================================

export async function lose_guardian_angel(mon, map, player, display) {
    const depth = player?.dungeonLevel || 1;

    if (mon) {
        if (canseemon(mon, player)) {
            await pline("%s rebukes you, saying:", Monnam(mon));
            await verbalize("Since you desire conflict, have some more!");
        }
        // C: mongone(mon) — remove from play
        if (mon.dead !== undefined) mon.dead = true;
    }

    // Create 2 to 4 hostile angels to replace the lost guardian
    for (let i = rn1(3, 2); i > 0; --i) {
        const mm = { x: player.x, y: player.y };
        if (enexto(mm, mm.x, mm.y, mons[PM_ANGEL], map, player)) {
            const angel = makemon(mons[PM_ANGEL], mm.x, mm.y, NO_MM_FLAGS, depth, map);
            if (angel) {
                angel.peaceful = false;
            }
        }
    }
}

// ============================================================================
// gain_guardian_angel — summon tame guardian angel on Astral Plane
// cf. minion.c:496
// TODO: Requires Astral Plane detection, Conflict check, full equipment logic
// ============================================================================

export function gain_guardian_angel(map, player, display) {
    // TODO: minion.c:496 — gain_guardian_angel() needs Astral Plane + full implementation
    // This is called on entering the Astral Plane and requires:
    // - Conflict check
    // - u.ualign.record > 8 (fervent)
    // - Creating a powerful tame angel with silver saber + amulet of reflection
    // Stub for now — will be implemented when endgame is ported
}
