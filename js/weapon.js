// weapon.js -- To-hit/damage bonuses, weapon skill system, monster weapon AI
// cf. weapon.c — hitval, dmgval, abon, dbon, skill system, select_hwep/rwep

import { objectData, WEAPON_CLASS, TOOL_CLASS, GEM_CLASS, BALL_CLASS, CHAIN_CLASS,
         CREAM_PIE, CORPSE, EGG, BOULDER,
         IRON_CHAIN, CROSSBOW_BOLT, MORNING_STAR, PARTISAN, RUNESWORD,
         ELVEN_BROADSWORD, BROADSWORD, FLAIL, RANSEUR, VOULGE,
         ACID_VENOM, HALBERD, SPETUM, BATTLE_AXE, BARDICHE, TRIDENT,
         TSURUGI, DWARVISH_MATTOCK, TWO_HANDED_SWORD,
         MACE, SILVER_MACE, WAR_HAMMER,
         BILL_GUISARME, GUISARME, LUCERN_HAMMER, LEATHER,
         KATANA, UNICORN_HORN, CRYSKNIFE, LONG_SWORD, SCIMITAR, SILVER_SABER,
         SHORT_SWORD, ELVEN_SHORT_SWORD, DWARVISH_SHORT_SWORD, ORCISH_SHORT_SWORD,
         AXE, BULLWHIP, QUARTERSTAFF, JAVELIN, AKLYS, CLUB, PICK_AXE, RUBBER_HOSE,
         SILVER_DAGGER, ELVEN_DAGGER, DAGGER, ORCISH_DAGGER, ATHAME, SCALPEL,
         KNIFE, WORM_TOOTH,
         DWARVISH_SPEAR, SILVER_SPEAR, ELVEN_SPEAR, SPEAR, ORCISH_SPEAR,
         SHURIKEN, YA, SILVER_ARROW, ELVEN_ARROW, ARROW, ORCISH_ARROW,
         DART, FLINT, ROCK, LOADSTONE, LUCKSTONE,
         GLAIVE, BEC_DE_CORBIN, FAUCHARD, LANCE, GRAPPLING_HOOK,
         BOW, ELVEN_BOW, ORCISH_BOW, YUMI, SLING, CROSSBOW,
       } from './objects.js';
import { rnd, d, rn2 } from './rng.js';
import { mon_hates_blessings, mon_hates_silver, mon_hates_light,
         thick_skinned, strongmonst, is_giant, resists_ston, likes_gems,
         is_animal, is_mindless, touch_petrifies, attacktype, x_monnam,
         throws_rocks,
       } from './mondata.js';
import { MZ_LARGE, S_EEL, S_SNAKE, S_XORN, S_DRAGON, S_JABBERWOCK,
         S_NAGA, S_WORM_TAIL, S_KOP, S_GIANT,
         PM_BALROG, AT_WEAP,
       } from './monsters.js';
import { mons, PM_MONK, PM_SAMURAI, PM_HEALER, PM_CLERIC, PM_WIZARD } from './monsters.js';
import {
    W_ARMS, W_ARMG, W_WEP,
    P_NONE, P_DAGGER, P_KNIFE, P_AXE, P_PICK_AXE, P_SHORT_SWORD, P_BROAD_SWORD,
    P_LONG_SWORD, P_TWO_HANDED_SWORD, P_SABER, P_CLUB, P_MACE, P_MORNING_STAR,
    P_FLAIL, P_HAMMER, P_QUARTERSTAFF, P_POLEARMS, P_SPEAR, P_TRIDENT, P_LANCE,
    P_BOW, P_SLING, P_CROSSBOW, P_DART, P_SHURIKEN, P_BOOMERANG, P_WHIP,
    P_UNICORN_HORN, P_ATTACK_SPELL, P_HEALING_SPELL, P_DIVINATION_SPELL,
    P_ENCHANTMENT_SPELL, P_CLERIC_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL,
    P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_RIDING, P_NUM_SKILLS,
    P_FIRST_WEAPON, P_LAST_WEAPON, P_FIRST_SPELL, P_LAST_SPELL,
    P_FIRST_H_TO_H, P_LAST_H_TO_H, P_MARTIAL_ARTS, P_SKILL_LIMIT,
    P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT, P_MASTER,
    P_GRAND_MASTER, NO_WEAPON_WANTED, NEED_WEAPON, NEED_RANGED_WEAPON,
    NEED_HTH_WEAPON, NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE,
    BOLT_LIM, AKLYS_LIM,
} from './const.js';
import { which_armor } from './worn.js';
import { spec_abon, artifact_light } from './artifact.js';
import { dist2 } from './hacklib.js';
import { couldsee } from './vision.js';
import { game as _gstate } from './gstate.js';

// Hero skill state (C: P_SKILL/P_MAX_SKILL/P_ADVANCE).
let skillSystemActive = false;
const heroSkill = new Array(P_NUM_SKILLS).fill(P_ISRESTRICTED);
const heroMaxSkill = new Array(P_NUM_SKILLS).fill(P_ISRESTRICTED);
const heroSkillAdvance = new Array(P_NUM_SKILLS).fill(0);

// ============================================================================
// hitval — cf. weapon.c:149
// ============================================================================
export function hitval(otmp, mon) {
    if (!otmp) return 0;
    let tmp = 0;
    const info = objectData[otmp.otyp];
    if (!info) return 0;
    const Is_weapon = (info.oc_class === WEAPON_CLASS || info.weptool);

    if (Is_weapon) tmp += (otmp.spe || 0);
    tmp += (info.oc_oc1 || 0);

    if (mon) {
        const ptr = mon.type || mon.data || {};
        if (Is_weapon && otmp.blessed && mon_hates_blessings(mon))
            tmp += 2;
        const mlet = ptr.mlet;
        if (info.oc_subtyp === P_SPEAR && isKebabable(mlet))
            tmp += 2;
        if (info.oc_subtyp === P_TRIDENT && ptr.swim) {
            if (mlet === S_EEL || mlet === S_SNAKE)
                tmp += 2;
        }
        if (info.oc_subtyp === P_PICK_AXE && ptr.passes_walls && ptr.thick_skinned)
            tmp += 2;
    }

    // C ref: weapon.c:182-184 — artifact to-hit bonus
    if (otmp.oartifact)
        tmp += spec_abon(otmp, mon);

    return tmp;
}

function isKebabable(mlet) {
    return mlet === S_XORN || mlet === S_DRAGON || mlet === S_JABBERWOCK
        || mlet === S_NAGA || mlet === S_WORM_TAIL
        || mlet === S_SNAKE;
}

// ============================================================================
// dmgval — cf. weapon.c:216
// ============================================================================
export function dmgval(otmp, mon) {
    if (!otmp) return 0;
    const otyp = otmp.otyp;
    const info = objectData[otyp];
    if (!info) return 0;
    if (otyp === CREAM_PIE) return 0;

    const ptr = mon?.type || mon?.data || {};
    const isLarge = (ptr.msize ?? 0) >= MZ_LARGE;
    let tmp = 0;

    if (isLarge) {
        if (info.oc_wldam) tmp = rnd(info.oc_wldam);
        switch (otyp) {
        case IRON_CHAIN: case CROSSBOW_BOLT: case MORNING_STAR:
        case PARTISAN: case RUNESWORD: case ELVEN_BROADSWORD: case BROADSWORD:
            tmp++; break;
        case FLAIL: case RANSEUR: case VOULGE:
            tmp += rnd(4); break;
        case ACID_VENOM: case HALBERD: case SPETUM:
            tmp += rnd(6); break;
        case BATTLE_AXE: case BARDICHE: case TRIDENT:
            tmp += d(2, 4); break;
        case TSURUGI: case DWARVISH_MATTOCK: case TWO_HANDED_SWORD:
            tmp += d(2, 6); break;
        }
    } else {
        if (info.oc_wsdam) tmp = rnd(info.oc_wsdam);
        switch (otyp) {
        case IRON_CHAIN: case CROSSBOW_BOLT: case MACE: case SILVER_MACE:
        case WAR_HAMMER: case FLAIL: case SPETUM: case TRIDENT:
            tmp++; break;
        case BATTLE_AXE: case BARDICHE: case BILL_GUISARME: case GUISARME:
        case LUCERN_HAMMER: case MORNING_STAR: case RANSEUR:
        case BROADSWORD: case ELVEN_BROADSWORD: case RUNESWORD: case VOULGE:
            tmp += rnd(4); break;
        case ACID_VENOM:
            tmp += rnd(6); break;
        }
    }

    const Is_weapon = (info.oc_class === WEAPON_CLASS || info.weptool);
    if (Is_weapon) {
        tmp += (otmp.spe || 0);
        if (tmp < 0) tmp = 0;
    }

    if (info.oc_material !== undefined && info.oc_material <= LEATHER
        && thick_skinned(ptr))
        tmp = 0;

    if (Is_weapon || info.oc_class === GEM_CLASS || info.oc_class === BALL_CLASS
        || info.oc_class === CHAIN_CLASS) {
        let bonus = 0;
        if (mon && otmp.blessed && mon_hates_blessings(mon))
            bonus += rnd(4);
        if (info.oc_subtyp === P_AXE && ptr.body === 'wood')
            bonus += rnd(4);
        if (mon && info.oc_material === 14 /* SILVER */ && mon_hates_silver(mon))
            bonus += rnd(20);
        // C ref: weapon.c:333-334 — artifact light bonus vs light-hating
        if (artifact_light(otmp) && otmp.lamplit && mon_hates_light(mon))
            bonus += rnd(8);
        tmp += bonus;
    }

    return Math.max(tmp, 0);
}

// C ref: weapon.c special_dmgval() — unarmed blessed/silver damage.
export function special_dmgval(mon, obj = null) {
    let bonus = 0;
    if (obj && obj.blessed && mon_hates_blessings(mon)) bonus += rnd(4);
    const mat = obj ? objectData[obj.otyp]?.oc_material : null;
    if (mat === 14 /* SILVER */ && mon_hates_silver(mon)) bonus += rnd(20);
    return bonus;
}

// C ref: weapon.c silver_sears() — message/effect helper.
export async function silver_sears(mon, display) {
    if (!mon || !display) return false;
    if (!mon_hates_silver(mon)) return false;
    await display.putstr_message(`The silver sears ${x_monnam(mon)}!`);
    return true;
}

// ============================================================================
// abon — cf. weapon.c:950
// ============================================================================
export function abon(str, dex, level) {
    let sbon;
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str <= 18) sbon = 1;
    else if (str < 22) sbon = 2;
    else sbon = 3;
    sbon += (level < 3) ? 1 : 0;
    if (dex < 4) return sbon - 3;
    if (dex < 6) return sbon - 2;
    if (dex < 8) return sbon - 1;
    if (dex < 14) return sbon;
    return sbon + dex - 14;
}

// ============================================================================
// dbon — cf. weapon.c:988
// ============================================================================
export function dbon(str) {
    if (str < 6) return -1;
    if (str < 16) return 0;
    if (str < 18) return 1;
    if (str === 18) return 2;
    if (str <= 20) return 3;
    if (str <= 22) return 4;
    if (str < 25) return 5;
    return 6;
}

// ============================================================================
// weapon_hit_bonus / weapon_dam_bonus — cf. weapon.c:1540
// ============================================================================
export function weapon_hit_bonus(weapon) {
    if (!skillSystemActive) return 0;
    const wep_type = weapon_type(weapon);
    // C ref: twoweap override — use P_TWO_WEAPON_COMBAT when dual-wielding
    const player = _gstate?.u ?? _gstate?.player;
    const type = (player?.twoweap && weapon &&
                  (weapon === player?.weapon || weapon === player?.swapWeapon))
        ? P_TWO_WEAPON_COMBAT : wep_type;
    if (type === P_NONE) return 0;
    let bonus = 0;
    const level = heroSkill[type] ?? P_ISRESTRICTED;
    if (type <= P_LAST_WEAPON) {
        // C ref: weapon.c:1553-1572 — standard weapon skills
        switch (level) {
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -4; break;
        case P_BASIC:     bonus = 0;  break;
        case P_SKILLED:   bonus = 2;  break;
        case P_EXPERT:    bonus = 3;  break;
        default:          bonus = 0;  break;
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        // C ref: weapon.c:1573-1595 — two-weapon combat
        let skill = heroSkill[P_TWO_WEAPON_COMBAT] ?? P_ISRESTRICTED;
        const wepSkill = heroSkill[wep_type] ?? P_ISRESTRICTED;
        if (wepSkill < skill) skill = wepSkill;
        switch (skill) {
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -9; break;
        case P_BASIC:     bonus = -7; break;
        case P_SKILLED:   bonus = -5; break;
        case P_EXPERT:    bonus = -3; break;
        default:          bonus = -9; break;
        }
    } else if (type === P_BARE_HANDED_COMBAT) {
        // C ref: weapon.c:1596-1609 — bare-handed / martial arts
        const roleMnum = player?.roleMnum;
        const martial = (roleMnum === PM_MONK || roleMnum === PM_SAMURAI);
        bonus = Math.max(level, P_UNSKILLED) - 1;
        bonus = Math.floor((bonus + 2) * (martial ? 2 : 1) / 2);
    }
    // C ref: weapon.c:1611-1625 — riding penalty
    if (player?.usteed) {
        const ridingSkill = heroSkill[P_RIDING] ?? P_ISRESTRICTED;
        if (ridingSkill <= P_UNSKILLED) bonus -= 2;
        else if (ridingSkill === P_BASIC) bonus -= 1;
    }
    return bonus;
}

// cf. weapon.c:1638
export function weapon_dam_bonus(weapon) {
    if (!skillSystemActive) return 0;
    const wep_type = weapon_type(weapon);
    const player = _gstate?.u ?? _gstate?.player;
    const type = (player?.twoweap && weapon &&
                  (weapon === player?.weapon || weapon === player?.swapWeapon))
        ? P_TWO_WEAPON_COMBAT : wep_type;
    if (type === P_NONE) return 0;
    let bonus = 0;
    const level = heroSkill[type] ?? P_ISRESTRICTED;
    if (type <= P_LAST_WEAPON) {
        switch (level) {
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -2; break;
        case P_BASIC:     bonus = 0;  break;
        case P_SKILLED:   bonus = 1;  break;
        case P_EXPERT:    bonus = 2;  break;
        default:          bonus = 0;  break;
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        let skill = heroSkill[P_TWO_WEAPON_COMBAT] ?? P_ISRESTRICTED;
        const wepSkill = heroSkill[wep_type] ?? P_ISRESTRICTED;
        if (wepSkill < skill) skill = wepSkill;
        switch (skill) {
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -3; break;
        case P_BASIC:     bonus = -1; break;
        case P_SKILLED:   bonus = 0;  break;
        case P_EXPERT:    bonus = 1;  break;
        default:          bonus = -3; break;
        }
    } else if (type === P_BARE_HANDED_COMBAT) {
        // C ref: weapon.c:1691-1704
        const roleMnum = player?.roleMnum;
        const martial = (roleMnum === PM_MONK || roleMnum === PM_SAMURAI);
        bonus = Math.max(level, P_UNSKILLED) - 1;
        bonus = Math.floor((bonus + 1) * (martial ? 3 : 1) / 2);
    }
    // C ref: weapon.c:1706-1721 — riding thrust damage
    if (player?.usteed && type !== P_TWO_WEAPON_COMBAT) {
        const ridingSkill = heroSkill[P_RIDING] ?? P_ISRESTRICTED;
        if (ridingSkill === P_SKILLED) bonus += 1;
        else if (ridingSkill === P_EXPERT) bonus += 2;
    }
    return bonus;
}

// ============================================================================
// weapon_type — cf. weapon.c:1512
// ============================================================================
// Autotranslated from weapon.c:1511
export function weapon_type(obj) {
    if (!obj) return P_BARE_HANDED_COMBAT;
    const od = objectData[obj.otyp];
    if (!od) return P_NONE;
    if (od.oc_class !== WEAPON_CLASS && od.oc_class !== TOOL_CLASS
        && od.oc_class !== GEM_CLASS)
        return P_NONE;
    const skill = od.oc_subtyp || 0; // mapped from C oc_skill
    return skill < 0 ? -skill : skill;
}

// ============================================================================
// oselect — cf. weapon.c:475
// ============================================================================
// Find one item of given type in monster inventory.
export function oselect(mtmp, type) {
    for (const otmp of (mtmp.minvent || [])) {
        if (otmp.otyp !== type) continue;
        // Never select non-cockatrice corpses/eggs
        if ((type === CORPSE || type === EGG)) {
            if (otmp.corpsenm === undefined || otmp.corpsenm < 0) continue;
            if (!touch_petrifies(mons[otmp.corpsenm])) continue;
        }
        return otmp;
    }
    return null;
}

// m_carrying: canonical export in mthrowu.js (C's mthrowu.c)
import { m_carrying } from './mthrowu.js';
export { m_carrying };

// ============================================================================
// autoreturn_weapon — cf. weapon.c:520
// ============================================================================
const arwep = [
    { otyp: AKLYS, range: AKLYS_LIM * AKLYS_LIM, tethered: 1 },
];

export function autoreturn_weapon(otmp) {
    if (!otmp) return null;
    for (const arw of arwep) {
        if (otmp.otyp === arw.otyp) return arw;
    }
    return null;
}

// ============================================================================
// rwep[] — ranged weapon priority list cf. weapon.c:498
// ============================================================================
const rwep = [
    DWARVISH_SPEAR, SILVER_SPEAR, ELVEN_SPEAR, SPEAR, ORCISH_SPEAR, JAVELIN,
    SHURIKEN, YA, SILVER_ARROW, ELVEN_ARROW, ARROW, ORCISH_ARROW,
    CROSSBOW_BOLT, SILVER_DAGGER, ELVEN_DAGGER, DAGGER, ORCISH_DAGGER, KNIFE,
    FLINT, ROCK, LOADSTONE, LUCKSTONE, DART, CREAM_PIE,
];

// polearms list
const pwep = [
    HALBERD, BARDICHE, SPETUM, BILL_GUISARME, VOULGE, RANSEUR,
    GUISARME, GLAIVE, LUCERN_HAMMER, BEC_DE_CORBIN, FAUCHARD, PARTISAN, LANCE,
];

// ============================================================================
// select_rwep — cf. weapon.c:533
// ============================================================================
// Select best ranged weapon for monster. Returns {weapon, propellor} or null.
export function select_rwep(mtmp) {
    let otmp;
    let propellor = null; // null means "hands" (no launcher needed)

    const mlet = (mtmp.data || mtmp.type || {}).mlet;

    // cockatrice eggs first
    if ((otmp = oselect(mtmp, EGG)) != null) return { weapon: otmp, propellor: null };

    // Kops prefer pies
    if (mlet === S_KOP && (otmp = oselect(mtmp, CREAM_PIE)) != null)
        return { weapon: otmp, propellor: null };

    // Giants prefer boulders
    if (throws_rocks(mtmp.data || mtmp.type || {}) &&
        (otmp = oselect(mtmp, BOULDER)) != null)
        return { weapon: otmp, propellor: null };

    // Polearms: within distance 13 and can see
    const mwep = mtmp.weapon;
    const mweponly = mwep && mwep.cursed && mtmp.weapon_check === NO_WEAPON_WANTED;

    if (dist2(mtmp.mx, mtmp.my, mtmp.mux || 0, mtmp.muy || 0) <= 13) {
        for (const pw of pwep) {
            const od = objectData[pw];
            if (!od) continue;
            if (((strongmonst(mtmp.data || mtmp.type) && !(mtmp.misc_worn_check & W_ARMS))
                 || !od.big)
                && (od.oc_material !== 14 /* SILVER */ || !mon_hates_silver(mtmp))) {
                if ((otmp = oselect(mtmp, pw)) != null
                    && (otmp === mwep || !mweponly)) {
                    return { weapon: otmp, propellor: otmp }; // force wield polearm
                }
            }
        }
    }

    // Throw-and-return weapons (aklys)
    for (const arw of arwep) {
        if (!is_mindless(mtmp.data || mtmp.type || {}) && !is_animal(mtmp.data || mtmp.type || {}) && !mweponly
            && dist2(mtmp.mx, mtmp.my, mtmp.mux || 0, mtmp.muy || 0) <= arw.range) {
            const od = objectData[arw.otyp];
            if ((!(mtmp.misc_worn_check & W_ARMS) || !(od && od.big))
                && (!(od && od.oc_material === 14) || !mon_hates_silver(mtmp))) {
                if ((otmp = oselect(mtmp, arw.otyp)) != null
                    && (otmp === mwep || !mweponly)) {
                    return { weapon: otmp, propellor: otmp };
                }
            }
        }
    }

    // Standard ranged weapon priority list
    for (let i = 0; i < rwep.length; i++) {
        // Gem-slinging: right before darts
        if (rwep[i] === DART && likes_gems(mtmp.data || mtmp.type || {})
            && m_carrying(mtmp, SLING)) {
            for (const invObj of (mtmp.minvent || [])) {
                if (invObj.oclass === GEM_CLASS
                    && (invObj.otyp !== LOADSTONE || !invObj.cursed)) {
                    return { weapon: invObj, propellor: m_carrying(mtmp, SLING) };
                }
            }
        }

        propellor = null; // hands
        const od = objectData[rwep[i]];
        const skill = od ? (od.oc_subtyp || 0) : 0;
        if (skill < 0) {
            switch (-skill) {
            case P_BOW:
                propellor = oselect(mtmp, YUMI) || oselect(mtmp, ELVEN_BOW)
                    || oselect(mtmp, BOW) || oselect(mtmp, ORCISH_BOW);
                break;
            case P_SLING:
                propellor = oselect(mtmp, SLING);
                break;
            case P_CROSSBOW:
                propellor = oselect(mtmp, CROSSBOW);
                break;
            }
            // If wielded weapon is welded and it's not the propellor, can't use
            if (mwep && mwep.cursed && mwep !== propellor
                && mtmp.weapon_check === NO_WEAPON_WANTED)
                propellor = undefined; // needed one and didn't have one
        }

        if (propellor !== undefined) {
            if (rwep[i] !== LOADSTONE) {
                otmp = oselect(mtmp, rwep[i]);
                if (otmp && !otmp.oartifact
                    && !(otmp === mwep && mwep.cursed))
                    return { weapon: otmp, propellor };
            } else {
                for (const invObj of (mtmp.minvent || [])) {
                    if (invObj.otyp === LOADSTONE && !invObj.cursed)
                        return { weapon: invObj, propellor };
                }
            }
        }
    }

    return null;
}

// ============================================================================
// monmightthrowwep — cf. weapon.c:680
// ============================================================================
export function monmightthrowwep(obj) {
    if (!obj) return false;
    for (const r of rwep) {
        if (obj.otyp === r) return true;
    }
    return false;
}

// ============================================================================
// hwep[] — melee weapon priority list cf. weapon.c:691
// ============================================================================
const hwep = [
    CORPSE, // cockatrice corpse
    TSURUGI, RUNESWORD, DWARVISH_MATTOCK, TWO_HANDED_SWORD, BATTLE_AXE,
    KATANA, UNICORN_HORN, CRYSKNIFE, TRIDENT, LONG_SWORD, ELVEN_BROADSWORD,
    BROADSWORD, SCIMITAR, SILVER_SABER, MORNING_STAR, ELVEN_SHORT_SWORD,
    DWARVISH_SHORT_SWORD, SHORT_SWORD, ORCISH_SHORT_SWORD, SILVER_MACE, MACE,
    AXE, DWARVISH_SPEAR, SILVER_SPEAR, ELVEN_SPEAR, SPEAR, ORCISH_SPEAR, FLAIL,
    BULLWHIP, QUARTERSTAFF, JAVELIN, AKLYS, CLUB, PICK_AXE, RUBBER_HOSE,
    WAR_HAMMER, SILVER_DAGGER, ELVEN_DAGGER, DAGGER, ORCISH_DAGGER, ATHAME,
    SCALPEL, KNIFE, WORM_TOOTH,
];

// ============================================================================
// select_hwep — cf. weapon.c:705
// ============================================================================
// Select best melee weapon for monster.
export function select_hwep(mtmp) {
    const strong = strongmonst(mtmp.data || mtmp.type || {});
    const wearing_shield = !!(mtmp.misc_worn_check & W_ARMS);

    // Prefer artifacts (simplified: skip artifact check, not implemented)

    // Giants prefer clubs
    if (is_giant(mtmp.data || mtmp.type || {})) {
        const otmp = oselect(mtmp, CLUB);
        if (otmp) return otmp;
    }
    // Balrog prefers bullwhip
    if ((mtmp.data || mtmp.type) === mons[PM_BALROG]) {
        const otmp = oselect(mtmp, BULLWHIP);
        if (otmp) return otmp;
    }

    for (const hw of hwep) {
        // Cockatrice corpse: needs gloves and stone resistance
        if (hw === CORPSE && !(mtmp.misc_worn_check & W_ARMG)
            && !resists_ston(mtmp))
            continue;

        const od = objectData[hw];
        if (!od) continue;

        // Only strong monsters can wield bimanual weapons (unless wearing shield)
        if (((strong && !wearing_shield) || !od.big)
            && (od.oc_material !== 14 /* SILVER */ || !mon_hates_silver(mtmp))) {
            const otmp = oselect(mtmp, hw);
            if (otmp) return otmp;
        }
    }

    return null;
}

// ============================================================================
// setmnotwielded — cf. weapon.c:1809
// ============================================================================
export function setmnotwielded(mon, obj) {
    if (!obj) return;
    // artifact light handling: simplified (no artifact system)
    if (mon.weapon === obj) mon.weapon = null;
    obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
}

// ============================================================================
// mwepgone — cf. weapon.c:938
// ============================================================================
export function mwepgone(mon) {
    const mwep = mon.weapon;
    if (mwep) {
        setmnotwielded(mon, mwep);
        mon.weapon_check = NEED_WEAPON;
    }
}

// ============================================================================
// possibly_unwield — cf. weapon.c:747
// ============================================================================
export function possibly_unwield(mon, _polyspot) {
    const mw_tmp = mon.weapon;
    if (!mw_tmp) return;

    // Check if weapon is still in inventory
    let found = false;
    for (const obj of (mon.minvent || [])) {
        if (obj === mw_tmp) { found = true; break; }
    }
    if (!found) {
        // Weapon was stolen or destroyed
        mon.weapon = null;
        mon.weapon_check = NEED_WEAPON;
        return;
    }

    if (!attacktype(mon.data || mon.type || {}, AT_WEAP)) {
        // Monster can no longer use weapons
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = NO_WEAPON_WANTED;
        return;
    }

    // Otherwise just mark for re-evaluation
    if (!(mw_tmp.cursed && mon.weapon_check === NO_WEAPON_WANTED))
        mon.weapon_check = NEED_WEAPON;
}

// ============================================================================
// mon_wield_item — cf. weapon.c:801
// ============================================================================
// Monster wields appropriate weapon. Returns 1 if took time, 0 otherwise.
export function mon_wield_item(mon) {
    let obj;

    if (mon.weapon_check === NO_WEAPON_WANTED) return 0;

    switch (mon.weapon_check) {
    case NEED_HTH_WEAPON:
        obj = select_hwep(mon);
        break;
    case NEED_RANGED_WEAPON: {
        const result = select_rwep(mon);
        obj = result ? result.propellor : null;
        break;
    }
    case NEED_PICK_AXE:
        obj = m_carrying(mon, PICK_AXE);
        if (!obj && !which_armor(mon, W_ARMS))
            obj = m_carrying(mon, DWARVISH_MATTOCK);
        break;
    case NEED_AXE:
        obj = m_carrying(mon, BATTLE_AXE);
        if (!obj || which_armor(mon, W_ARMS))
            obj = m_carrying(mon, AXE);
        break;
    case NEED_PICK_OR_AXE:
        obj = m_carrying(mon, DWARVISH_MATTOCK);
        if (!obj) obj = m_carrying(mon, BATTLE_AXE);
        if (!obj || which_armor(mon, W_ARMS)) {
            obj = m_carrying(mon, PICK_AXE);
            if (!obj) obj = m_carrying(mon, AXE);
        }
        break;
    default:
        return 0;
    }

    if (obj) {
        const mw_tmp = mon.weapon;
        if (mw_tmp && mw_tmp.otyp === obj.otyp) {
            // Already wielding same type
            mon.weapon_check = NEED_WEAPON;
            return 0;
        }
        // Check for welded weapon
        if (mw_tmp && mw_tmp.cursed) {
            mon.weapon_check = NO_WEAPON_WANTED;
            return 1;
        }

        // Wield the new weapon
        if (mw_tmp) setmnotwielded(mon, mw_tmp);
        mon.weapon = obj;
        mon.weapon_check = NEED_WEAPON;
        obj.owornmask = (obj.owornmask || 0) | W_WEP;
        return 1;
    }
    mon.weapon_check = NEED_WEAPON;
    return 0;
}

// ============================================================================
// Towel functions — cf. weapon.c:1014-1083
// ============================================================================
export function finish_towel_change(obj, newspe) {
    newspe = Math.min(newspe, 7);
    obj.spe = Math.max(newspe, 0);
}

export function wet_a_towel(obj, amt, _verbose) {
    const newspe = (amt <= 0) ? (obj.spe || 0) - amt : amt;
    if (newspe !== (obj.spe || 0))
        finish_towel_change(obj, newspe);
}

export function dry_a_towel(obj, amt, _verbose) {
    const newspe = (amt < 0) ? (obj.spe || 0) + amt : amt;
    if (newspe !== (obj.spe || 0))
        finish_towel_change(obj, newspe);
}

// ============================================================================
// Skill level helpers — cf. weapon.c:1087-1123
// ============================================================================
export function skill_level_name(level) {
    switch (level) {
    case P_UNSKILLED: return 'Unskilled';
    case P_BASIC: return 'Basic';
    case P_SKILLED: return 'Skilled';
    case P_EXPERT: return 'Expert';
    case P_MASTER: return 'Master';
    case P_GRAND_MASTER: return 'Grand Master';
    default: return 'Unknown';
    }
}

// C ref: weapon.c weapon_descr()/skill_name() helper.
export function weapon_descr(skill) {
    return skill_name(skill);
}

export function skill_name(skill) {
    switch (skill) {
    case P_DAGGER: return 'dagger';
    case P_KNIFE: return 'knife';
    case P_AXE: return 'axe';
    case P_PICK_AXE: return 'pick-axe';
    case P_SHORT_SWORD: return 'short sword';
    case P_BROAD_SWORD: return 'broadsword';
    case P_LONG_SWORD: return 'long sword';
    case P_TWO_HANDED_SWORD: return 'two-handed sword';
    case P_SABER: return 'saber';
    case P_CLUB: return 'club';
    case P_MACE: return 'mace';
    case P_MORNING_STAR: return 'morning star';
    case P_FLAIL: return 'flail';
    case P_HAMMER: return 'hammer';
    case P_QUARTERSTAFF: return 'quarterstaff';
    case P_POLEARMS: return 'polearms';
    case P_SPEAR: return 'spear';
    case P_TRIDENT: return 'trident';
    case P_LANCE: return 'lance';
    case P_BOW: return 'bow';
    case P_SLING: return 'sling';
    case P_CROSSBOW: return 'crossbow';
    case P_DART: return 'dart';
    case P_SHURIKEN: return 'shuriken';
    case P_BOOMERANG: return 'boomerang';
    case P_WHIP: return 'whip';
    case P_UNICORN_HORN: return 'unicorn horn';
    case P_ATTACK_SPELL: return 'attack spells';
    case P_HEALING_SPELL: return 'healing spells';
    case P_DIVINATION_SPELL: return 'divination spells';
    case P_ENCHANTMENT_SPELL: return 'enchantment spells';
    case P_CLERIC_SPELL: return 'clerical spells';
    case P_ESCAPE_SPELL: return 'escape spells';
    case P_MATTER_SPELL: return 'matter spells';
    case P_BARE_HANDED_COMBAT: return 'bare-handed combat';
    case P_TWO_WEAPON_COMBAT: return 'two weapon combat';
    case P_RIDING: return 'riding';
    default: return 'unknown';
    }
}

// ============================================================================
// ============================================================================
// cf. u_init.c Skill_A through Skill_W — per-role skill tables.
// Each entry: [skill_index, max_level]. Terminated by [P_NONE, 0].
// ============================================================================

// Role indices match roles[] in player.js (0=Arc, 1=Bar, 2=Cav, 3=Hea, 4=Kni,
// 5=Mon, 6=Pri, 7=Ran, 8=Rog, 9=Sam, 10=Tou, 11=Val, 12=Wiz).
const ROLE_SKILL_TABLES = [
    // 0 = Archeologist
    [[P_DAGGER,P_BASIC],[P_KNIFE,P_BASIC],[P_PICK_AXE,P_EXPERT],[P_SHORT_SWORD,P_BASIC],[P_SABER,P_EXPERT],[P_CLUB,P_SKILLED],[P_QUARTERSTAFF,P_SKILLED],[P_SLING,P_SKILLED],[P_DART,P_BASIC],[P_BOOMERANG,P_EXPERT],[P_WHIP,P_EXPERT],[P_UNICORN_HORN,P_SKILLED],[P_ATTACK_SPELL,P_BASIC],[P_HEALING_SPELL,P_BASIC],[P_DIVINATION_SPELL,P_EXPERT],[P_MATTER_SPELL,P_BASIC],[P_RIDING,P_BASIC],[P_TWO_WEAPON_COMBAT,P_BASIC],[P_BARE_HANDED_COMBAT,P_EXPERT]],
    // 1 = Barbarian
    [[P_DAGGER,P_BASIC],[P_AXE,P_EXPERT],[P_PICK_AXE,P_SKILLED],[P_SHORT_SWORD,P_EXPERT],[P_BROAD_SWORD,P_SKILLED],[P_LONG_SWORD,P_SKILLED],[P_TWO_HANDED_SWORD,P_EXPERT],[P_SABER,P_SKILLED],[P_CLUB,P_SKILLED],[P_MACE,P_SKILLED],[P_MORNING_STAR,P_SKILLED],[P_FLAIL,P_BASIC],[P_HAMMER,P_EXPERT],[P_QUARTERSTAFF,P_BASIC],[P_SPEAR,P_SKILLED],[P_TRIDENT,P_SKILLED],[P_BOW,P_BASIC],[P_ATTACK_SPELL,P_BASIC],[P_ESCAPE_SPELL,P_BASIC],[P_RIDING,P_BASIC],[P_TWO_WEAPON_COMBAT,P_BASIC],[P_BARE_HANDED_COMBAT,P_MASTER]],
    // 2 = Caveman
    [[P_DAGGER,P_BASIC],[P_KNIFE,P_SKILLED],[P_AXE,P_SKILLED],[P_PICK_AXE,P_BASIC],[P_CLUB,P_EXPERT],[P_MACE,P_EXPERT],[P_MORNING_STAR,P_BASIC],[P_FLAIL,P_SKILLED],[P_HAMMER,P_SKILLED],[P_QUARTERSTAFF,P_EXPERT],[P_POLEARMS,P_SKILLED],[P_SPEAR,P_EXPERT],[P_TRIDENT,P_SKILLED],[P_BOW,P_SKILLED],[P_SLING,P_EXPERT],[P_ATTACK_SPELL,P_BASIC],[P_MATTER_SPELL,P_SKILLED],[P_BOOMERANG,P_EXPERT],[P_UNICORN_HORN,P_BASIC],[P_BARE_HANDED_COMBAT,P_MASTER]],
    // 3 = Healer
    [[P_DAGGER,P_SKILLED],[P_KNIFE,P_EXPERT],[P_SHORT_SWORD,P_SKILLED],[P_SABER,P_BASIC],[P_CLUB,P_SKILLED],[P_MACE,P_BASIC],[P_QUARTERSTAFF,P_EXPERT],[P_POLEARMS,P_BASIC],[P_SPEAR,P_BASIC],[P_TRIDENT,P_BASIC],[P_SLING,P_SKILLED],[P_DART,P_EXPERT],[P_SHURIKEN,P_SKILLED],[P_UNICORN_HORN,P_EXPERT],[P_HEALING_SPELL,P_EXPERT],[P_BARE_HANDED_COMBAT,P_BASIC]],
    // 4 = Knight
    [[P_DAGGER,P_BASIC],[P_KNIFE,P_BASIC],[P_AXE,P_SKILLED],[P_PICK_AXE,P_BASIC],[P_SHORT_SWORD,P_SKILLED],[P_BROAD_SWORD,P_SKILLED],[P_LONG_SWORD,P_EXPERT],[P_TWO_HANDED_SWORD,P_SKILLED],[P_SABER,P_SKILLED],[P_CLUB,P_BASIC],[P_MACE,P_SKILLED],[P_MORNING_STAR,P_SKILLED],[P_FLAIL,P_BASIC],[P_HAMMER,P_BASIC],[P_POLEARMS,P_SKILLED],[P_SPEAR,P_SKILLED],[P_TRIDENT,P_BASIC],[P_LANCE,P_EXPERT],[P_BOW,P_BASIC],[P_CROSSBOW,P_SKILLED],[P_ATTACK_SPELL,P_SKILLED],[P_HEALING_SPELL,P_SKILLED],[P_CLERIC_SPELL,P_SKILLED],[P_RIDING,P_EXPERT],[P_TWO_WEAPON_COMBAT,P_SKILLED],[P_BARE_HANDED_COMBAT,P_EXPERT]],
    // 5 = Monk
    [[P_QUARTERSTAFF,P_BASIC],[P_SPEAR,P_BASIC],[P_CROSSBOW,P_BASIC],[P_SHURIKEN,P_BASIC],[P_ATTACK_SPELL,P_BASIC],[P_HEALING_SPELL,P_EXPERT],[P_DIVINATION_SPELL,P_BASIC],[P_ENCHANTMENT_SPELL,P_BASIC],[P_CLERIC_SPELL,P_SKILLED],[P_ESCAPE_SPELL,P_SKILLED],[P_MATTER_SPELL,P_BASIC],[P_BARE_HANDED_COMBAT,P_GRAND_MASTER]],
    // 6 = Priest
    [[P_CLUB,P_EXPERT],[P_MACE,P_EXPERT],[P_MORNING_STAR,P_EXPERT],[P_FLAIL,P_EXPERT],[P_HAMMER,P_EXPERT],[P_QUARTERSTAFF,P_EXPERT],[P_POLEARMS,P_SKILLED],[P_SPEAR,P_SKILLED],[P_TRIDENT,P_SKILLED],[P_LANCE,P_BASIC],[P_BOW,P_BASIC],[P_SLING,P_BASIC],[P_CROSSBOW,P_BASIC],[P_DART,P_BASIC],[P_SHURIKEN,P_BASIC],[P_BOOMERANG,P_BASIC],[P_UNICORN_HORN,P_SKILLED],[P_HEALING_SPELL,P_EXPERT],[P_DIVINATION_SPELL,P_EXPERT],[P_CLERIC_SPELL,P_EXPERT],[P_BARE_HANDED_COMBAT,P_BASIC]],
    // 7 = Ranger
    [[P_DAGGER,P_EXPERT],[P_KNIFE,P_SKILLED],[P_AXE,P_SKILLED],[P_PICK_AXE,P_BASIC],[P_SHORT_SWORD,P_BASIC],[P_MORNING_STAR,P_BASIC],[P_FLAIL,P_SKILLED],[P_HAMMER,P_BASIC],[P_QUARTERSTAFF,P_BASIC],[P_POLEARMS,P_SKILLED],[P_SPEAR,P_EXPERT],[P_TRIDENT,P_BASIC],[P_BOW,P_EXPERT],[P_SLING,P_EXPERT],[P_CROSSBOW,P_EXPERT],[P_DART,P_EXPERT],[P_SHURIKEN,P_SKILLED],[P_BOOMERANG,P_EXPERT],[P_WHIP,P_BASIC],[P_HEALING_SPELL,P_BASIC],[P_DIVINATION_SPELL,P_EXPERT],[P_ESCAPE_SPELL,P_BASIC],[P_RIDING,P_BASIC],[P_BARE_HANDED_COMBAT,P_BASIC]],
    // 8 = Rogue
    [[P_DAGGER,P_EXPERT],[P_KNIFE,P_EXPERT],[P_SHORT_SWORD,P_EXPERT],[P_BROAD_SWORD,P_SKILLED],[P_LONG_SWORD,P_SKILLED],[P_TWO_HANDED_SWORD,P_BASIC],[P_SABER,P_SKILLED],[P_CLUB,P_SKILLED],[P_MACE,P_SKILLED],[P_MORNING_STAR,P_BASIC],[P_FLAIL,P_BASIC],[P_HAMMER,P_BASIC],[P_POLEARMS,P_BASIC],[P_SPEAR,P_BASIC],[P_CROSSBOW,P_EXPERT],[P_DART,P_EXPERT],[P_SHURIKEN,P_SKILLED],[P_DIVINATION_SPELL,P_SKILLED],[P_ESCAPE_SPELL,P_SKILLED],[P_MATTER_SPELL,P_SKILLED],[P_RIDING,P_BASIC],[P_TWO_WEAPON_COMBAT,P_EXPERT],[P_BARE_HANDED_COMBAT,P_EXPERT]],
    // 9 = Samurai
    [[P_DAGGER,P_BASIC],[P_KNIFE,P_SKILLED],[P_SHORT_SWORD,P_EXPERT],[P_BROAD_SWORD,P_SKILLED],[P_LONG_SWORD,P_EXPERT],[P_TWO_HANDED_SWORD,P_EXPERT],[P_SABER,P_BASIC],[P_FLAIL,P_SKILLED],[P_QUARTERSTAFF,P_BASIC],[P_POLEARMS,P_SKILLED],[P_SPEAR,P_SKILLED],[P_LANCE,P_SKILLED],[P_BOW,P_EXPERT],[P_SHURIKEN,P_EXPERT],[P_ATTACK_SPELL,P_BASIC],[P_DIVINATION_SPELL,P_BASIC],[P_CLERIC_SPELL,P_SKILLED],[P_RIDING,P_SKILLED],[P_TWO_WEAPON_COMBAT,P_EXPERT],[P_BARE_HANDED_COMBAT,P_MASTER]],
    // 10 = Tourist
    [[P_DAGGER,P_EXPERT],[P_KNIFE,P_SKILLED],[P_AXE,P_BASIC],[P_PICK_AXE,P_BASIC],[P_SHORT_SWORD,P_EXPERT],[P_BROAD_SWORD,P_BASIC],[P_LONG_SWORD,P_BASIC],[P_TWO_HANDED_SWORD,P_BASIC],[P_SABER,P_SKILLED],[P_MACE,P_BASIC],[P_MORNING_STAR,P_BASIC],[P_FLAIL,P_BASIC],[P_HAMMER,P_BASIC],[P_QUARTERSTAFF,P_BASIC],[P_POLEARMS,P_BASIC],[P_SPEAR,P_BASIC],[P_TRIDENT,P_BASIC],[P_LANCE,P_BASIC],[P_BOW,P_BASIC],[P_SLING,P_BASIC],[P_CROSSBOW,P_BASIC],[P_DART,P_EXPERT],[P_SHURIKEN,P_BASIC],[P_BOOMERANG,P_BASIC],[P_WHIP,P_BASIC],[P_UNICORN_HORN,P_SKILLED],[P_DIVINATION_SPELL,P_BASIC],[P_ENCHANTMENT_SPELL,P_BASIC],[P_ESCAPE_SPELL,P_SKILLED],[P_RIDING,P_BASIC],[P_TWO_WEAPON_COMBAT,P_SKILLED],[P_BARE_HANDED_COMBAT,P_SKILLED]],
    // 11 = Valkyrie
    [[P_DAGGER,P_EXPERT],[P_AXE,P_EXPERT],[P_PICK_AXE,P_SKILLED],[P_SHORT_SWORD,P_SKILLED],[P_BROAD_SWORD,P_SKILLED],[P_LONG_SWORD,P_EXPERT],[P_TWO_HANDED_SWORD,P_EXPERT],[P_SABER,P_BASIC],[P_HAMMER,P_EXPERT],[P_QUARTERSTAFF,P_BASIC],[P_POLEARMS,P_SKILLED],[P_SPEAR,P_EXPERT],[P_TRIDENT,P_BASIC],[P_LANCE,P_SKILLED],[P_SLING,P_BASIC],[P_ATTACK_SPELL,P_BASIC],[P_ESCAPE_SPELL,P_BASIC],[P_RIDING,P_SKILLED],[P_TWO_WEAPON_COMBAT,P_SKILLED],[P_BARE_HANDED_COMBAT,P_EXPERT]],
    // 12 = Wizard
    [[P_DAGGER,P_EXPERT],[P_KNIFE,P_SKILLED],[P_AXE,P_SKILLED],[P_SHORT_SWORD,P_BASIC],[P_CLUB,P_SKILLED],[P_MACE,P_BASIC],[P_QUARTERSTAFF,P_EXPERT],[P_POLEARMS,P_SKILLED],[P_SPEAR,P_BASIC],[P_TRIDENT,P_BASIC],[P_SLING,P_SKILLED],[P_DART,P_EXPERT],[P_SHURIKEN,P_BASIC],[P_ATTACK_SPELL,P_EXPERT],[P_HEALING_SPELL,P_SKILLED],[P_DIVINATION_SPELL,P_EXPERT],[P_ENCHANTMENT_SPELL,P_SKILLED],[P_CLERIC_SPELL,P_SKILLED],[P_ESCAPE_SPELL,P_EXPERT],[P_MATTER_SPELL,P_EXPERT],[P_RIDING,P_BASIC],[P_BARE_HANDED_COMBAT,P_BASIC]],
];

// cf. u_init.c skills_for_role() — return skill table for given role index.
export function skills_for_role(roleIndex) {
    return ROLE_SKILL_TABLES[roleIndex] || null;
}

// ============================================================================
// Skill system — data structures and initialization
// ============================================================================

// cf. u_init.c skill_init() — initialize hero skill arrays for a role.
// Accepts either:
//   - an array of [skill_index, max_level] pairs (ROLE_SKILL_TABLES format), or
//   - null/undefined to reset (no active skill system).
export function skill_init(_class_skill) {
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        heroSkill[i] = P_ISRESTRICTED;
        heroMaxSkill[i] = P_ISRESTRICTED;
        heroSkillAdvance[i] = 0;
    }
    if (!_class_skill) {
        skillSystemActive = false;
        return;
    }
    // C ref: weapon.c:1768-1776 — walk class_skill table, set maximums.
    // Skills still at P_ISRESTRICTED become P_UNSKILLED (NOT P_BASIC).
    // P_BASIC is only given to skills matching starting inventory weapons
    // (done later by skill_init_from_inventory).
    if (Array.isArray(_class_skill[0])) {
        for (const [skill, maxLevel] of _class_skill) {
            if (skill < 0 || skill >= P_NUM_SKILLS) continue;
            heroMaxSkill[skill] = maxLevel;
            if (heroSkill[skill] === P_ISRESTRICTED) {
                heroSkill[skill] = P_UNSKILLED;
            }
        }
    } else {
        for (let i = 0; i < P_NUM_SKILLS; i++) {
            const maxSkill = _class_skill[i] ?? P_BASIC;
            heroMaxSkill[i] = maxSkill;
            if (heroSkill[i] === P_ISRESTRICTED) {
                heroSkill[i] = P_UNSKILLED;
            }
        }
    }
    // C ref: weapon.c:1778-1780 — high-potential fighters start with basic
    if (heroMaxSkill[P_BARE_HANDED_COMBAT] > P_EXPERT) {
        heroSkill[P_BARE_HANDED_COMBAT] = P_BASIC;
    }
    skillSystemActive = true;
}

// C ref: weapon.c:1745-1784 — Set P_BASIC for weapon skills matching
// inventory items and role-specific magic skills.
// Called after starting inventory is created.
export function skill_init_from_inventory(inventory, roleMnum) {
    if (!skillSystemActive) return;
    // C ref: weapon.c:1746-1756 — inventory weapon skills → P_BASIC
    if (inventory) {
        for (const obj of inventory) {
            if (is_ammo_obj(obj)) continue;
            const skill = weapon_type(obj);
            if (skill !== P_NONE) {
                heroSkill[skill] = P_BASIC;
            }
        }
    }
    // C ref: weapon.c:1759-1766 — magic skills by role
    if (roleMnum === PM_HEALER || roleMnum === PM_MONK) {
        heroSkill[P_HEALING_SPELL] = P_BASIC;
    } else if (roleMnum === PM_CLERIC) {
        heroSkill[P_CLERIC_SPELL] = P_BASIC;
    } else if (roleMnum === PM_WIZARD) {
        heroSkill[P_ATTACK_SPELL] = P_BASIC;
        heroSkill[P_ENCHANTMENT_SPELL] = P_BASIC;
    }
    // C ref: weapon.c:1790-1797 — set advance values
    // practice_needed_to_advance(level) = level * level * 20
    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (heroSkill[skill] > P_ISRESTRICTED) {
            const lvl = heroSkill[skill] - 1;
            heroSkillAdvance[skill] = lvl * lvl * 20;
        }
    }
}

// C ref: obj.h is_ammo() — (WEAPON_CLASS || GEM_CLASS) && oc_skill in [-P_CROSSBOW..-P_BOW]
function is_ammo_obj(obj) {
    if (!obj) return false;
    const od = objectData[obj.otyp];
    if (!od) return false;
    if (od.oc_class !== WEAPON_CLASS && od.oc_class !== GEM_CLASS) return false;
    const sk = od.oc_subtyp ?? 0;
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}

export function use_skill(skill, degree = 1) {
    if (!skillSystemActive) return;
    if (!Number.isInteger(skill) || skill < 0 || skill >= P_NUM_SKILLS) return;
    heroSkillAdvance[skill] += Math.max(0, degree | 0);
}

export function unrestrict_weapon_skill(skill) {
    if (!Number.isInteger(skill) || skill < 0 || skill >= P_NUM_SKILLS) return;
    if (heroMaxSkill[skill] === P_ISRESTRICTED) heroMaxSkill[skill] = P_BASIC;
    if (heroSkill[skill] === P_ISRESTRICTED) heroSkill[skill] = P_UNSKILLED;
}

export function add_weapon_skill(n) {
    if (!skillSystemActive) return;
    heroSkillAdvance[P_NONE] = (heroSkillAdvance[P_NONE] || 0) + Math.max(0, n | 0);
}

export function lose_weapon_skill(n) {
    if (!skillSystemActive) return;
    heroSkillAdvance[P_NONE] = Math.max(0, (heroSkillAdvance[P_NONE] || 0) - Math.max(0, n | 0));
}

export function drain_weapon_skill(n = 1) {
    if (!skillSystemActive) return;
    let tries = Math.max(1, n | 0);
    while (tries-- > 0) {
        const candidates = [];
        for (let i = 0; i < P_NUM_SKILLS; i++) {
            if (heroSkill[i] > P_UNSKILLED) candidates.push(i);
        }
        if (!candidates.length) return;
        const pick = candidates[rn2(candidates.length)];
        heroSkill[pick] = Math.max(P_UNSKILLED, heroSkill[pick] - 1);
    }
}

export function enhance_weapon_skill() {
    if (!skillSystemActive) return 0;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (can_advance(i)) {
            skill_advance(i);
            return 1;
        }
    }
    return 0;
}

// C ref: weapon.c slots_required().
export function slots_required(skill) {
    if (!Number.isInteger(skill) || skill < 0 || skill >= P_NUM_SKILLS) return 1;
    return Math.max(1, heroSkill[skill]);
}

// C ref: weapon.c could_advance().
export function could_advance(skill) {
    if (!skillSystemActive) return false;
    if (!Number.isInteger(skill) || skill < 0 || skill >= P_NUM_SKILLS) return false;
    if (heroSkill[skill] <= P_ISRESTRICTED) return false;
    if (heroSkill[skill] >= heroMaxSkill[skill]) return false;
    return heroSkillAdvance[skill] >= slots_required(skill);
}

// C ref: weapon.c can_advance().
export function can_advance(skill) {
    if (!could_advance(skill)) return false;
    const pool = heroSkillAdvance[P_NONE] || 0;
    return pool >= slots_required(skill);
}

// C ref: weapon.c peaked_skill().
export function peaked_skill(skill) {
    if (!Number.isInteger(skill) || skill < 0 || skill >= P_NUM_SKILLS) return true;
    return heroSkill[skill] >= heroMaxSkill[skill];
}

// C ref: weapon.c skill_advance().
export function skill_advance(skill) {
    if (!can_advance(skill)) return false;
    const cost = slots_required(skill);
    heroSkillAdvance[P_NONE] = Math.max(0, (heroSkillAdvance[P_NONE] || 0) - cost);
    heroSkill[skill] = Math.min(heroMaxSkill[skill], heroSkill[skill] + 1);
    return true;
}

// C ref: weapon.c add_skills_to_menu()/show_skills().
export function add_skills_to_menu() {
    const rows = [];
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (heroSkill[i] <= P_ISRESTRICTED) continue;
        rows.push({
            skill: i,
            name: skill_name(i),
            level: heroSkill[i],
            levelName: skill_level_name(heroSkill[i]),
            canAdvance: can_advance(i),
        });
    }
    return rows;
}

export function show_skills() {
    return add_skills_to_menu();
}

// C ref: weapon.c give_may_advance_msg().
export async function give_may_advance_msg(display = null) {
    const any = add_skills_to_menu().some((row) => row.canAdvance);
    if (any && display) {
        await display.putstr_message('You feel more confident in your weapon skills.');
    }
    return any;
}

// C ref: weapon.c uwep_skill_type().
// Autotranslated from weapon.c:1526
export function uwep_skill_type(player) {
  if (player.twoweap) return P_TWO_WEAPON_COMBAT;
  return weapon_type(player.weapon);
}
