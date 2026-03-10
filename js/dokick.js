// dokick.js -- Kick command, object impact and migration mechanics
// cf. dokick.c — kickdmg, maybe_kick_monster, kick_monster, ghitm,
//                container_impact_dmg, kick_object, really_kick_object,
//                kickstr, watchman_thief_arrest, watchman_door_damage,
//                kick_dumb, kick_ouch, kick_door, kick_nondoor, dokick,
//                drop_to, impact_drop, ship_object, obj_delivery,
//                deliver_obj_to_mon, otransit_msg, down_gate
//
// dokick.c handles kick mechanics and object transportation through levels:
//   dokick(): the #kick command — determine target, kick monster/object/terrain.
//   impact_drop(): objects fall through traps to lower levels.
//   ship_object(): migrate objects through pit/trapdoor to other levels.
//   obj_delivery(): deliver migrating objects when arriving on a level.
//   ghitm(): gold/object thrown at monster with shop interaction.

import { rn2, rnd, rnl } from './rng.js';
import { In_endgame, Is_botlevel, Is_stronghold, Is_airlevel, Is_waterlevel, In_mines, dunlev, dunlevs_in_dungeon } from './dungeon.js';
import { sgn } from './hacklib.js';
import { Role_if } from './role.js';
import { exercise } from './attrib_exercise.js';
import { acurr as ACURR, acurrstr as ACURRSTR, change_luck, adjalign } from './attrib.js';
import {
    A_STR, A_DEX, A_CON, A_CHA, A_WIS,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    DOOR, SDOOR, SCORR, ROOM, CORR, LADDER, STAIRS, IRONBARS, TREE,
    THRONE, FOUNTAIN, SINK, GRAVE, ALTAR,
    POOL, LAVAPOOL, LAVAWALL,
    IS_DOOR, IS_STWALL, IS_OBSTRUCTED,
    SLT_ENCUMBER, HVY_ENCUMBER,
    PIT, SPIKED_PIT, WEB, HOLE, TRAPDOOR, STATUE_TRAP,
    is_pit, is_hole, W_ARMF,
    TT_PIT, TT_WEB, TT_BEARTRAP, P_NONE, P_MARTIAL_ARTS,
} from './const.js';
import {
    IS_TREE, IS_THRONE, IS_FOUNTAIN, IS_SINK, IS_GRAVE, IS_ALTAR,
    IS_DRAWBRIDGE, IS_SOFT, ZAP_POS,
} from './const.js';
import {
    pline, pline_The, You, Your, You_hear, You_cant, There, Norep,
    impossible, verbalize,
} from './pline.js';
import { mon_nam, Monnam, a_monnam } from './do_name.js';
import { hcolor, hliquid } from './do_name.js';
import {
    xname, doname, splitobj, mksobj, Is_container,
} from './mkobj.js';
import { Doname2, Tobjnam, otense, killer_xname, corpse_xname } from './objnam.js';
import { placeFloorObject, stackobj } from './invent.js';
import {
    thick_skinned, nolimbs, slithy, nohands, haseyes, attacktype,
    likes_gold, is_mercenary, is_flyer, is_floater, is_giant,
    can_teleport, canseemon, poly_when_stoned, M_AP_TYPE,
} from './mondata.js';
import { mons, PM_SHADE, PM_SASQUATCH, PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN, PM_KILLER_BEE, PM_BLACK_PUDDING, PM_AMOROUS_DEMON, PM_STONE_GOLEM, PM_ARCHEOLOGIST, PM_SAMURAI, S_EEL, S_LIZARD, AT_KICK, M2_UNDEAD, M2_WERE, M2_HUMAN, M2_ELF, M2_DWARF, M2_GNOME, M2_ORC, M2_DEMON, M2_GIANT } from './monsters.js';
import {
    COIN_CLASS, GEM_CLASS, GLASS,
    BOULDER, EGG, MIRROR, CORPSE, ROCK, EXPENSIVE_CAMERA,
    KICKING_BOOTS, LEVITATION_BOOTS, FUMBLE_BOOTS,
    objectData,
} from './objects.js';
import { obj_resists } from './objdata.js';
import { mondead, setmangry, seemimic, wakeup, wake_nearto, wake_nearby, angry_guards } from './mon.js';
import { newsym, map_invisible, canspotmon } from './display.js';
import { mpickobj } from './steal.js';
import { monflee, closed_door } from './monmove.js';
import { cansee, couldsee } from './vision.js';
import { recalc_block_point, unblock_point } from './vision.js';
import { game as _gstate } from './gstate.js';
import { near_capacity, inv_weight, weight_cap, overexertion, feel_location, feel_newsym, money_cnt } from './hack.js';
import { in_rooms, in_town } from './hack.js';
import { is_pool, is_ice, is_drawbridge_wall, find_drawbridge } from './dbridge.js';
import { noteleport_level, goodpos, rloco } from './teleport.js';
import { body_part, poly_gender, polymon } from './polyself.js';
import { LEG, FOOT } from './const.js';
import { set_wounded_legs } from './do.js';
import { flooreffects } from './do.js';
import { hurtle } from './dothrow.js';
import { thitmonst, hero_breaks, breaks, breaktest } from './dothrow.js';
import { scatter } from './explode.js';
import { sobj_at, delobj } from './invent.js';
import { snuff_candle } from './apply.js';
import { bhit } from './zap.js';
import { dealloc_obj, obj_extract_self, doname } from './mkobj.js';
import { find_trap } from './detect.js';
import { cvt_sdoor_to_door } from './detect.js';
import {
    costly_spot, costly_adjacent, shop_keeper, find_objowner,
    stolen_value, costly_gold, make_happy_shk, make_angry_shk,
    addtobill, subfrombill, pay_for_damage, add_damage,
    hot_pursuit, contained_gold, donate_gold, picked_container,
} from './shk.js';
import { use_skill } from './weapon.js';
import { check_caitiff, attack_checks } from './uhitm.js';
// C's passive() not yet ported — callsites guarded with typeof checks
import { is_art } from './artifact.js';
import { sink_backs_up } from './fountain.js';
import { altar_wrath } from './pray.js';
import { del_engr_at, disturb_grave } from './engrave.js';
import { rnd_class, makeplural, Is_box, Has_contents, Is_mbag } from './objnam.js';
import { hidden_gold } from './vault.js';
import { kick_steed } from './steed.js';
import { legs_in_no_shape } from './do.js';
import { nhgetch } from './input.js';
import { DIRECTION_KEYS } from './const.js';
import { place_monster } from './steed.js';
import { m_in_out_region } from './region.js';
import { set_apparxy } from './monmove.js';
import { maybe_unhide_at } from './mon.js';
import { finish_meating } from './dogmove.js';
import { is_watch, bigmonst, verysmall, mhis } from './mondata.js';
import { water_damage, mintrap_postmove, instapetrify, t_at } from './trap.js';

// ============================================================================
// Constants
// ============================================================================

const kick_passes_thru = "kick passes harmlessly through";

// C ref: hack.h — SHOP_DOOR_COST
const SHOP_DOOR_COST = 400;

// looted flags for various terrain types (rm.h)
const T_LOOTED = 1;
const TREE_LOOTED = 1;
const TREE_SWARM = 2;
const D_WARNED = 16;
const S_LPUDDING = 1;
const S_LDWASHER = 2;

// Migration destination codes (dungeon.h)
const MIGR_NOWHERE = -1;
const MIGR_RANDOM = 0;
const MIGR_STAIRS_UP = 3;
const MIGR_LADDER_UP = 5;
const MIGR_SSTAIRS = 7;
const MIGR_WITH_HERO = 9;
const MIGR_NOBREAK = 1024;
const MIGR_NOSCATTER = 2048;
const MIGR_TO_SPECIES = 4096;

// Trap result
const Trap_Killed_Mon = 2;
const NO_TRAP_FLAGS = 0;

// KICKED_WEAPON for bhit
const KICKED_WEAPON = 2;

// right side for wounded legs
const RIGHT_SIDE = 2;

// DILITHIUM_CRYSTAL and LUCKSTONE for rnd_class range
import { DILITHIUM_CRYSTAL, LUCKSTONE } from './objects.js';

// ART_MJOLLNIR
const ART_MJOLLNIR = 3; // from artilist.h

// ============================================================================
// Helper functions (local)
// ============================================================================

// cf. dokick.c:8 — #define is_bigfoot(x) ((x) == &mons[PM_SASQUATCH])
function is_bigfoot(data) {
    return data && data.id === PM_SASQUATCH;
}

// cf. dokick.c:9 — #define martial()
function martial(player) {
    return martial_bonus(player) || is_bigfoot(player.data)
        || (player.boots && player.boots.otyp === KICKING_BOOTS);
}

// C ref: weapon.c martial_bonus() — check if player has martial arts bonus
function martial_bonus(player) {
    // C ref: weapon.c martial_bonus() — Role_if(PM_MONK) || Role_if(PM_SAMURAI)
    const role = player.role;
    return role === 'Monk' || role === 'Samurai';
}



// M_AP_TYPE imported from mondata.js
const M_AP_MONSTER = 3; // C: M_AP_MONSTER=3 (2 is M_AP_OBJECT)

// OBJ_AT — check if objects exist at position
function OBJ_AT(x, y, map) {
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    return objs && objs.length > 0;
}


// isok helper
function isok(x, y) {
    return x >= 0 && x < 80 && y >= 0 && y < 21;
}

// obfree — free an object (destroy it)
function obfree(obj, map) {
    // In JS, just let GC handle it
}

// add_to_migration — add object to migrating objects list
function add_to_migration(obj, game) {
    if (!game) return;
    if (!game.migrating_objs) game.migrating_objs = [];
    game.migrating_objs.push(obj);
}

// weight — recalculate object weight
function weight(obj) {
    return obj.owt || 1;
}

// useup — reduce quantity by 1, remove if 0
function useup(obj, map) {
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        obj_extract_self(obj, map);
    }
}

// surface — name of surface at location
function surface(x, y) {
    return "floor";
}

// singular — call fn with obj.quan temporarily set to 1
async function singular(obj, fn, ...args) {
    const save = obj.quan;
    obj.quan = 1;
    const result = await fn(obj, ...args);
    obj.quan = save;
    return result;
}

// currency — "zorkmid" or "zorkmids"
function currency(amount) {
    return amount === 1 ? "zorkmid" : "zorkmids";
}

// mhis imported from mondata.js

// verbalize imported from pline.js

// miss — show miss message
async function miss(what, mtmp) {
    await pline("%s misses %s.", what, mon_nam(mtmp));
}


// makeplural imported from objnam.js

// something/Something
const something = "something";
const Something = "Something";

// sgn imported from hacklib.js
// Role_if imported from role.js

// ============================================================================
// stairway helpers (local, simplified)
// ============================================================================

function stairway_at(x, y, map) {
    if (!map.stairways) return null;
    for (const s of map.stairways) {
        if (s.sx === x && s.sy === y) return s;
    }
    return null;
}

function stairway_find_from(fromdlev, isladder, map) {
    if (!map.stairways) return null;
    for (const s of map.stairways) {
        if (s.tolev && s.tolev.dnum === fromdlev.dnum
            && s.tolev.dlevel === fromdlev.dlevel) {
            if (isladder === undefined || s.isladder === isladder) return s;
        }
    }
    return null;
}

// ============================================================================
// special_dmgval stub — blessed/silver boot damage bonus
// cf. uhitm.c special_dmgval()
// ============================================================================
function special_dmgval(youmonst, mon, wslot, longptr) {
    // TODO: implement full special_dmgval checking blessed/silver gear
    // For now, return 0 (no bonus)
    return 0;
}

// ============================================================================
// abuse_dog stub
// ============================================================================
function abuse_dog(mon) {
    // cf. dog.c abuse_dog() — reduce tameness, maybe untame
    if (mon.mtame) {
        mon.mtame--;
    }
}

// ============================================================================
// remove_monster / place_monster helpers
// ============================================================================
function remove_monster(x, y, map) {
    if (map.removeMonsterAt) map.removeMonsterAt(x, y);
}

// ============================================================================
// mintrap wrapper (from trap.js mintrap_postmove)
// ============================================================================
async function mintrap(mon, flags, map, player) {
    return await mintrap_postmove(mon, map, player, null, null);
}

// ============================================================================
// maybe_mnexto — monster moves to adjacent square
// ============================================================================
function maybe_mnexto(mon, map) {
    // TODO: implement — try to move mon to random adjacent passable square
}

// ============================================================================
// enexto — find empty position near (x,y)
// ============================================================================
function enexto(cc, x, y, data, map) {
    // simplified — just return the same position
    cc.x = x;
    cc.y = y;
    return true;
}

// ============================================================================
// makemon stub
// ============================================================================
function makemon(montype, x, y, flags, map) {
    // TODO: implement
    return null;
}

// ============================================================================
// mkgold stub
// ============================================================================
function mkgold(amount, x, y, map) {
    // TODO: implement
}

// ============================================================================
// mksobj_at stub
// ============================================================================
function mksobj_at(otyp, x, y, init, artif, map) {
    // TODO: implement
    return null;
}

// ============================================================================
// rnd_treefruit_at stub
// ============================================================================
function rnd_treefruit_at(x, y, map) {
    // TODO: implement
    return null;
}

// ============================================================================
// fall_through stub
// ============================================================================
function fall_through(tression, typ, player, map) {
    // TODO: implement
}

// ============================================================================
// b_trapped — triggered door/chest trap
// ============================================================================
async function b_trapped(what, bodypart, player, map) {
    // TODO: implement
    await pline("KABOOM!!  You triggered a trap on the %s!", what);
}

// ============================================================================
// chest_trap stub
// ============================================================================
function chest_trap(obj, bodypart, force, player, map) {
    // TODO: implement
    return 0;
}

// ============================================================================
// breakchestlock stub
// ============================================================================
function breakchestlock(box, destroyit, game, player) {
    if (box) box.olocked = false;
}

import { touch_petrifies, engulfing_u } from './mondata.js';

// ============================================================================
// is_unpaid helper
// ============================================================================
function is_unpaid(obj) {
    if (obj.unpaid) return true;
    // check contents
    if (Has_contents(obj)) {
        for (const o of obj.cobj) {
            if (o.unpaid) return true;
        }
    }
    return false;
}

// ============================================================================
// ismnum helper
// ============================================================================
function ismnum(corpsenm) {
    return corpsenm !== undefined && corpsenm !== null && corpsenm !== NON_PM && corpsenm >= 0;
}

// remove_worn_item stub
function remove_worn_item(obj, osync) {
    // TODO: implement
}

// ============================================================================
// Dungeon level helpers (stubs for single-level)
// ============================================================================
// In_endgame imported from dungeon.js
// Is_botlevel, Is_stronghold, Is_airlevel, Is_waterlevel, In_mines imported from dungeon.js
// on_level available from dungeon.js if needed
function ok_to_quest() { return true; }
// dunlev, dunlevs_in_dungeon imported from dungeon.js

// ============================================================================
// Wipe engraving
// ============================================================================
function u_wipe_engr(cnt) {
    // TODO: implement
}

// ============================================================================
// get_iter_mons / get_iter_mons_xy
// ============================================================================
async function get_iter_mons(fn, map) {
    if (!map || !map.monsters) return false;
    for (const mon of map.monsters) {
        if (mon && !mon.dead && await fn(mon)) return true;
    }
    return false;
}

async function get_iter_mons_xy(fn, x, y, map) {
    if (!map || !map.monsters) return false;
    for (const mon of map.monsters) {
        if (mon && !mon.dead && await fn(mon, x, y)) return true;
    }
    return false;
}

// angry_guards: imported from mon.js

// ============================================================================
// mon_yells stub
// ============================================================================
async function mon_yells(mtmp, msg) {
    await pline("%s yells: \"%s\"", Monnam(mtmp), msg);
}

// couldsee imported from vision.js

// ============================================================================
// engulfing_u imported from mondata.js

// ============================================================================
// distant_name helper
// ============================================================================
async function distant_name(obj, fn) {
    return await fn(obj);
}

// ============================================================================
// The — article helper
// ============================================================================
function The(str) {
    if (!str) return "";
    return "The " + str;
}

// An
function An(str) {
    if (!str) return "";
    const ch = str[0].toLowerCase();
    if ("aeiou".includes(ch)) return "An " + str;
    return "A " + str;
}

// ============================================================================
// Passes_walls check
// ============================================================================
function Passes_walls(player) {
    return !!(player.passesWalls || player.phasing);
}

// ============================================================================
// kicked object global (module-level state like C's gk.kickedobj)
// ============================================================================
let kickedobj = null;

// gate_str for transit messages
let gate_str = null;

// ============================================================================
// 1. kickdmg — calculate and apply kick damage to a monster
// cf. dokick.c:38
// ============================================================================

async function kickdmg(mon, clumsy, player, map) {
    const uarmf = player.boots;
    let dmg = Math.floor((ACURRSTR(player) + ACURR(player, A_DEX) + ACURR(player, A_CON)) / 15);
    let kick_skill = P_NONE;
    let trapkilled = false;

    if (uarmf && uarmf.otyp === KICKING_BOOTS)
        dmg += 5;

    if (clumsy)
        dmg = Math.floor(dmg / 2);

    // kicking a dragon or elephant will not harm it
    if (thick_skinned(mon.type || mon.data))
        dmg = 0;

    // attacking a shade is normally useless
    if ((mon.type || mon.data).id === PM_SHADE)
        dmg = 0;

    const specialdmg = special_dmgval({ data: player.data }, mon, W_ARMF, null);

    if ((mon.type || mon.data).id === PM_SHADE && !specialdmg) {
        await pline_The("%s.", kick_passes_thru);
        return;
    }

    if (M_AP_TYPE(mon))
        seemimic(mon, map);

    check_caitiff(mon);

    // squeeze some guilt feelings...
    if (mon.mtame) {
        await abuse_dog(mon);
        if (mon.mtame)
            await monflee(mon, dmg ? rnd(dmg) : 1, false, false, player, null, null);
        else
            mon.mflee = 0;
    }

    if (dmg > 0) {
        dmg = rnd(dmg);
        if (martial(player)) {
            if (dmg > 1)
                kick_skill = P_MARTIAL_ARTS;
            dmg += rn2(Math.floor(ACURR(player, A_DEX) / 2) + 1);
        }
        await exercise(player, A_DEX, true);
    }
    dmg += specialdmg;
    if (uarmf)
        dmg += (uarmf.spe || 0);
    dmg += (player.udaminc || 0);
    if (dmg > 0)
        mon.mhp -= dmg;

    const monData = mon.type || mon.data;
    if (mon.mhp > 0 && martial(player) && !bigmonst(monData) && !rn2(3)
        && mon.mcanmove !== false && player.ustuck !== mon && !mon.mtrapped) {
        const mdx = mon.mx + (player.dx || 0);
        const mdy = mon.my + (player.dy || 0);
        if (goodpos(mdx, mdy, mon, 0, map, player)) {
            await pline("%s reels from the blow.", Monnam(mon));
            if (await m_in_out_region(mon, mdx, mdy, map, player)) {
                remove_monster(mon.mx, mon.my, map);
                newsym(mon.mx, mon.my, map);
                place_monster(mon, mdx, mdy, map);
                newsym(mon.mx, mon.my, map);
                set_apparxy(mon, map, player);
                if (await mintrap(mon, NO_TRAP_FLAGS, map, player) === Trap_Killed_Mon)
                    trapkilled = true;
            }
        }
    }

    if (typeof passive === 'function')
        await passive(mon, uarmf, true, mon.mhp > 0, AT_KICK, false);

    if (mon.mhp <= 0 && !trapkilled) {
        mondead(mon, map, player);
    }

    if (kick_skill !== P_NONE)
        use_skill(kick_skill, 1);
}

// ============================================================================
// 2. maybe_kick_monster — precondition check for kicking a monster
// cf. dokick.c:125
// ============================================================================
export async function maybe_kick_monster(mon, x, y, player, map, game) {
    const ctx = (game && game.svc && game.svc.context)
        ? game.svc.context
        : game?.context;
    if (mon) {
        const save_forcefight = ctx ? ctx.forcefight : false;
        // bhitpos
        game.bhitpos = { x, y };

        if (!mon.mpeaceful || !canspotmon(mon, player, null, map))
            if (ctx) ctx.forcefight = true;

        if (await attack_checks(mon, null) || await overexertion(player, game))
            mon = null;

        if (ctx) ctx.forcefight = save_forcefight;
    }
    return mon !== null;
}

// ============================================================================
// 3. kick_monster — execute kick vs monster
// cf. dokick.c:145
// ============================================================================

async function kick_monster(mon, x, y, player, map, game) {
    let clumsy = false;
    const uarmf = player.boots;
    const monData = mon.type || mon.data;

    // anger target
    setmangry(mon, true, map, player);

    if (player.levitating && !rn2(3) && verysmall(monData) && !is_flyer(monData)) {
        await pline("Floating in the air, you miss wildly!");
        await exercise(player, A_DEX, false);
        if (typeof passive === 'function')
            await passive(mon, uarmf, false, true, AT_KICK, false);
        return;
    }

    // reveal hidden target
    if (mon.mundetected || (M_AP_TYPE(mon) && M_AP_TYPE(mon) !== M_AP_MONSTER)) {
        if (M_AP_TYPE(mon))
            seemimic(mon, map);
        mon.mundetected = 0;
        if (!canspotmon(mon, player, null, map))
            map_invisible(map, x, y, player);
        else
            newsym(x, y, map);
        await There("is %s here.",
            canspotmon(mon, player, null, map) ? a_monnam(mon) : "something hidden");
    }

    // Polymorph kick attacks
    if (player.polymorph && attacktype(player.data, AT_KICK)) {
        // TODO: implement Upolyd kick attack loop
        // For now, fall through to normal kick
    }

    const i = -inv_weight(player);
    const j = weight_cap(player);

    if (i < Math.floor(j * 3 / 10)) {
        if (!rn2((i < Math.floor(j / 10)) ? 2 : (i < Math.floor(j / 5)) ? 3 : 4)) {
            if (martial(player)) {
                // goto doit — fall through
            } else {
                await Your("clumsy kick does no damage.");
                if (typeof passive === 'function')
                    await passive(mon, uarmf, false, true, AT_KICK, false);
                return;
            }
        }
        if (i < Math.floor(j / 10))
            clumsy = true;
        else if (!rn2((i < Math.floor(j / 5)) ? 2 : 3))
            clumsy = true;
    }

    if (player.fumbling)
        clumsy = true;
    else if (player.armor && objectData[player.armor.otyp]
             && objectData[player.armor.otyp].oc_bulky
             && ACURR(player, A_DEX) < rnd(25))
        clumsy = true;

    // doit:
    await You("kick %s.", mon_nam(mon));
    if (!rn2(clumsy ? 3 : 4) && (clumsy || !bigmonst(monData))
        && mon.mcansee !== false && !mon.mtrapped && !thick_skinned(monData)
        && monData.mlet !== S_EEL && haseyes(monData)
        && mon.mcanmove !== false
        && !mon.mstun && !mon.mconf && !mon.msleeping
        && (monData.mmove || 12) >= 12) {
        if (!nohands(monData) && !rn2(martial(player) ? 5 : 3)) {
            await pline("%s blocks your %skick.", Monnam(mon),
                clumsy ? "clumsy " : "");
            if (typeof passive === 'function')
                await passive(mon, uarmf, false, true, AT_KICK, false);
            return;
        } else {
            maybe_mnexto(mon, map);
            if (mon.mx !== x || mon.my !== y) {
                // unmap_invisible
                const dodgeverb = can_teleport(monData) && !noteleport_level(mon, map)
                    ? "teleports"
                    : is_floater(monData) ? "floats"
                    : is_flyer(monData) ? "swoops"
                    : (nolimbs(monData) || slithy(monData)) ? "slides"
                    : "jumps";
                await pline("%s %s, %s evading your %skick.", Monnam(mon),
                    dodgeverb,
                    clumsy ? "easily" : "nimbly", clumsy ? "clumsy " : "");
                if (typeof passive === 'function')
                    await passive(mon, uarmf, false, true, AT_KICK, false);
                return;
            }
        }
    }
    await kickdmg(mon, clumsy, player, map);
}

// ============================================================================
// 4. ghitm — gold/object thrown hits monster
// cf. dokick.c:294
// ============================================================================

export async function ghitm(mtmp, gold, player, map) {
    let msg_given = false;

    const monData = mtmp.data || mtmp.type;
    if (!likes_gold(monData) && !mtmp.isshk && !mtmp.ispriest
        && !mtmp.isgd && !is_mercenary(monData)) {
        wakeup(mtmp, true, map, player);
    } else if (mtmp.mcanmove === false) {
        if (canseemon(mtmp, player)) {
            await pline_The("%s harmlessly %s %s.", xname(gold),
                otense(gold, "hit"), mon_nam(mtmp));
            msg_given = true;
        }
    } else {
        const was_sleeping = mtmp.msleeping;
        const value = (gold.quan || 1) * (objectData[gold.otyp] ? objectData[gold.otyp].oc_cost || 1 : 1);

        mtmp.msleeping = 0;
        mtmp.sleeping = false;
        finish_meating(mtmp);
        if (!mtmp.isgd && !rn2(4))
            setmangry(mtmp, true, map, player);

        if (cansee(mtmp.mx, mtmp.my))
            await pline("%s %scatches the gold.", Monnam(mtmp),
                was_sleeping ? "awakens and " : "");

        mpickobj(mtmp, gold);
        // gold has been absorbed by monster inventory

        if (mtmp.isshk) {
            const eshk = mtmp.eshk || {};
            let robbed = eshk.robbed || 0;
            if (robbed) {
                robbed -= value;
                if (robbed < 0) robbed = 0;
                await pline_The("amount %scovers %s recent losses.",
                    !robbed ? "" : "partially ", mhis(mtmp));
                eshk.robbed = robbed;
                if (!robbed)
                    await make_happy_shk(mtmp, false, map);
            } else {
                if (mtmp.mpeaceful) {
                    eshk.credit = (eshk.credit || 0) + value;
                    await You("have %d %s in credit.", eshk.credit, currency(eshk.credit));
                } else {
                    await verbalize("Thanks, scum!");
                }
            }
        } else if (mtmp.ispriest) {
            if (mtmp.mpeaceful)
                await verbalize("Thank you for your contribution.");
            else
                await verbalize("Thanks, scum!");
        } else if (mtmp.isgd) {
            const umoney = money_cnt(player.inventory);
            await verbalize(umoney ? "Drop the rest and follow me."
                : hidden_gold(true, player)
                    ? "You still have hidden gold.  Drop it now."
                    : mtmp.mpeaceful
                        ? "I'll take care of that; please move along."
                        : "I'll take that; now get moving.");
        } else if (is_mercenary(monData)) {
            const was_angry = !mtmp.mpeaceful;
            let goldreqd = 0;

            if (monData.id === PM_SOLDIER) goldreqd = 100;
            else if (monData.id === PM_SERGEANT) goldreqd = 250;
            else if (monData.id === PM_LIEUTENANT) goldreqd = 500;
            else if (monData.id === PM_CAPTAIN) goldreqd = 750;

            if (goldreqd && rn2(3)) {
                const umoney = money_cnt(player.inventory);
                goldreqd += Math.floor((umoney + (player.ulevel || 1) * rn2(5)) / ACURR(player, A_CHA));
                if (value > goldreqd)
                    mtmp.mpeaceful = true;
            }

            if (!mtmp.mpeaceful) {
                if (goldreqd)
                    await verbalize("That's not enough, coward!");
                else
                    await verbalize("I don't take bribes from scum like you!");
            } else if (was_angry) {
                await verbalize("That should do.  Now beat it!");
            } else {
                await verbalize("Thanks for the tip, %s.",
                    player.female ? "lady" : "buddy");
            }
        }
        return true;
    }

    if (!msg_given)
        await miss(xname(gold), mtmp);
    return false;
}

// ============================================================================
// 5. container_impact_dmg — container kick damage
// cf. dokick.c:411
// ============================================================================

export async function container_impact_dmg(obj, x, y, player, map) {
    let loss = 0;
    let wchange = false;

    if (!Is_container(obj) || !Has_contents(obj) || Is_mbag(obj))
        return;

    const shoproom = in_rooms(x, y, 'S', map);
    const shkp = shoproom ? shop_keeper(shoproom) : null;
    const costly = shkp && costly_spot(x, y, map);
    const insider = player.ushops && player.ushops.length > 0
        && shoproom && shoproom === player.ushops[0];
    const frominv = (obj !== kickedobj);

    const contents = [...(obj.cobj || [])];
    for (const otmp of contents) {
        let result = null;

        const odata = objectData[otmp.otyp];
        if (odata && odata.oc_material === GLASS
            && otmp.oclass !== GEM_CLASS && !obj_resists(otmp, 33, 100)) {
            result = "shatter";
        } else if (otmp.otyp === EGG && !rn2(3)) {
            result = "cracking";
        }
        if (result) {
            if (otmp.otyp === MIRROR)
                change_luck(-2, player);
            if (otmp.otyp === EGG && otmp.spe && ismnum(otmp.corpsenm))
                change_luck(-1, player);

            await You_hear("a muffled %s.", result);
            if (costly) {
                if (frominv && !otmp.unpaid)
                    otmp.no_charge = 1;
                loss += await stolen_value(otmp, x, y, shkp ? shkp.mpeaceful : true, true, map);
            }
            if (otmp.quan > 1) {
                useup(otmp, map);
            } else {
                // remove from container
                obj.cobj = obj.cobj.filter(o => o !== otmp);
            }
            obj.cknown = 0;
            wchange = true;
        }
    }
    if (wchange)
        obj.owt = weight(obj);
    if (costly && loss) {
        if (!insider) {
            await You("caused %d %s worth of damage!", loss, currency(loss));
            await make_angry_shk(shkp, x, y);
        } else {
            // TODO: shkname
            await You("owe the shopkeeper %d %s for objects destroyed.", loss, currency(loss));
        }
    }
}

// ============================================================================
// 6. kick_object — jacket around really_kick_object
// cf. dokick.c:488
// ============================================================================

async function kick_object(x, y, player, map, game) {
    let kickobjnam = "";
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    kickedobj = objs.length > 0 ? objs[0] : null;
    if (kickedobj) {
        kickobjnam = killer_xname(kickedobj);
        const res = await really_kick_object(x, y, player, map, game);
        kickedobj = null;
        return { res, kickobjnam };
    }
    return { res: 0, kickobjnam };
}

// ============================================================================
// 7. really_kick_object — core object kick logic
// cf. dokick.c:507
// ============================================================================

async function really_kick_object(x, y, player, map, game) {
    if (!kickedobj || kickedobj.otyp === BOULDER
        || kickedobj === player.uball || kickedobj === player.uchain)
        return 0;

    const trap = t_at(x, y, map);
    if (trap) {
        if ((is_pit(trap.ttyp) && !Passes_walls(player)) || trap.ttyp === WEB) {
            if (!trap.tseen)
                await find_trap(trap, player, map);
            await You_cant("kick %s that's in a %s!", something,
                player.hallucinating ? "tizzy"
                : (trap.ttyp === WEB) ? "web"
                : "pit");
            return 1;
        }
        if (trap.ttyp === STATUE_TRAP) {
            // activate_statue_trap(trap, x, y, false) — TODO
            return 1;
        }
    }

    if (player.fumbling && !rn2(3)) {
        await Your("clumsy kick missed.");
        return 1;
    }

    if (!player.boots && kickedobj.otyp === CORPSE
        && touch_petrifies(mons[kickedobj.corpsenm])
        && !player.stoneResistance) {
        await You("kick %s with your bare %s.",
            corpse_xname(kickedobj, null, 0),
            makeplural(body_part(FOOT, player)));
        if (poly_when_stoned(player.data) && await polymon(PM_STONE_GOLEM, player)) {
            ; // hero has been transformed but kick continues
        } else {
            await instapetrify("kicking " + killer_xname(kickedobj) + " barefoot", player);
        }
    }

    const isgold = (kickedobj.oclass === COIN_CLASS);
    let k_owt = kickedobj.owt || 1;

    if (kickedobj.quan > 1 && !isgold) {
        const save_quan = kickedobj.quan;
        kickedobj.quan = 1;
        k_owt = weight(kickedobj);
        kickedobj.quan = save_quan;
    }

    let range = Math.floor(ACURRSTR(player) / 2) - Math.floor(k_owt / 40);

    if (martial(player))
        range += rnd(3);

    if (is_pool(x, y, map)) {
        range = Math.floor(range / 3) + 1;
    } else if (Is_airlevel(player.uz) || Is_waterlevel(player.uz)) {
        range += rnd(3);
    } else {
        if (is_ice(x, y, map)) {
            range += rnd(3);
        }
        if (kickedobj.greased) {
            range += rnd(3);
        }
    }

    // Mjollnir is magically too heavy to kick
    if (is_art(kickedobj, ART_MJOLLNIR))
        range = 1;

    // see if the object has a place to move into
    const dx = player.dx || 0;
    const dy = player.dy || 0;
    if (!isok(x + dx, y + dy)
        || !ZAP_POS(map.at(x + dx, y + dy)?.typ || 0)
        || closed_door(x + dx, y + dy, map))
        range = 1;

    const shkp = find_objowner(kickedobj, x, y, map);
    const costly = shkp && (costly_spot(x, y, map)
        || (costly_adjacent(shkp, x, y, map) && kickedobj.unpaid));

    await Norep("You kick %s.",
        !isgold ? await singular(kickedobj, doname, player) : doname(kickedobj, player));

    const loc = map.at(x, y);
    if (loc && (IS_OBSTRUCTED(loc.typ) || closed_door(x, y, map))) {
        if ((!martial(player) && rn2(20) > ACURR(player, A_DEX))
            || IS_OBSTRUCTED(map.at(player.x, player.y)?.typ || 25)
            || closed_door(player.x, player.y, map)) {
            if (player.blind)
                await pline("It doesn't come loose.");
            else
                await pline("%s %sn't come loose.",
                    The(await distant_name(kickedobj, xname)),
                    otense(kickedobj, "do"));
            return (!rn2(3) || martial(player)) ? 1 : 0;
        }
        if (player.blind)
            await pline("It comes loose.");
        else
            await pline("%s %s loose.", The(await distant_name(kickedobj, xname)),
                otense(kickedobj, "come"));
        obj_extract_self(kickedobj, map);
        newsym(x, y, map);
        if (costly && (!costly_spot(player.x, player.y, map))) {
            if (!kickedobj.no_charge)
                addtobill(kickedobj, false, false, false);
            else
                kickedobj.no_charge = 0;
        }
        if (!await flooreffects(kickedobj, player.x, player.y, "fall", player, map)) {
            placeFloorObject(kickedobj, player.x, player.y, map);
            stackobj(kickedobj, map);
            newsym(player.x, player.y, map);
        }
        return 1;
    }

    // a box gets a chance of breaking open here
    if (Is_box(kickedobj)) {
        const otrp = kickedobj.otrapped;
        if (range < 2)
            await pline("THUD!");
        await container_impact_dmg(kickedobj, x, y, player, map);
        if (kickedobj.olocked) {
            if (!rn2(5) || (martial(player) && !rn2(2))) {
                await You("break open the lock!");
                await breakchestlock(kickedobj, false, game, player);
                if (otrp)
                    chest_trap(kickedobj, LEG, false, player, map);
                return 1;
            }
        } else {
            if (!rn2(3) || (martial(player) && !rn2(2))) {
                await pline_The("lid slams open, then falls shut.");
                kickedobj.lknown = 1;
                if (otrp)
                    chest_trap(kickedobj, LEG, false, player, map);
                return 1;
            }
        }
        if (range < 2)
            return 1;
    }

    // fragile objects should not be kicked
    if (await hero_breaks(kickedobj, kickedobj.ox || x, kickedobj.oy || y, 0, player, map))
        return 1;

    if (range < 2) {
        if (!Is_box(kickedobj))
            await pline("Thump!");
        return (!rn2(3) || martial(player)) ? 1 : 0;
    }

    if (kickedobj.quan > 1) {
        if (!isgold) {
            kickedobj = splitobj(kickedobj, 1);
        } else {
            if (rn2(20)) {
                const flyingcoinmsg = [
                    "scatter the coins", "knock coins all over the place",
                    "send coins flying in all directions",
                ];
                if (!player.deaf)
                    await pline("Thwwpingg!");
                await You("%s!", flyingcoinmsg[rn2(flyingcoinmsg.length)]);
                scatter(x, y, rnd(3), 0x10 | 0x08, kickedobj, map); // VIS_EFFECTS | MAY_HIT
                newsym(x, y, map);
                return 1;
            }
            if (kickedobj.quan > 300) {
                await pline("Thump!");
                return (!rn2(3) || martial(player)) ? 1 : 0;
            }
        }
    }

    const slide = is_ice(x, y, map) || kickedobj.greased;
    if (slide && !player.blind)
        await pline("Whee!  %s %s across the %s.", Doname2(kickedobj, player),
            otense(kickedobj, "slide"), await surface(x, y));

    obj_extract_self(kickedobj, map);
    await snuff_candle(kickedobj);
    newsym(x, y, map);

    // bhit to send the object flying
    const mon = await bhit(dx, dy, range, KICKED_WEAPON,
        null, null, { obj: kickedobj }, map, player);

    if (!kickedobj)
        return 1; // object broken

    if (mon) {
        if (mon.isshk && kickedobj.ocarry === mon)
            return 1; // shk caught it
        if (isgold ? await ghitm(mon, kickedobj, player, map)
                   : await thitmonst(mon, kickedobj, player, map, game))
            return 1;
    }

    // the object might have fallen down a hole
    if (kickedobj.where === 'migrating')
        return 1;

    const bhitpos = game.bhitpos || { x: x + dx, y: y + dy };
    // place object at final position
    if (await flooreffects(kickedobj, bhitpos.x, bhitpos.y, "fall", player, map))
        return 1;

    if (costly) {
        if (kickedobj.unpaid)
            subfrombill(kickedobj, shkp);
        if (Has_contents(kickedobj)) {
            const gtg = contained_gold(kickedobj, true);
            if (gtg > 0)
                await donate_gold(gtg, shkp, false);
        }
    }
    placeFloorObject(kickedobj, bhitpos.x, bhitpos.y, map);
    stackobj(kickedobj, map);
    newsym(kickedobj.ox || bhitpos.x, kickedobj.oy || bhitpos.y, map);
    return 1;
}

// ============================================================================
// 8. kickstr — kick death message formatting
// cf. dokick.c:793
// ============================================================================

function kickstr(kickobjnam, maploc) {
    let what;
    if (kickobjnam)
        what = kickobjnam;
    else if (!maploc)
        what = "nothing";
    else if (IS_DOOR(maploc.typ))
        what = "a door";
    else if (IS_TREE(maploc.typ))
        what = "a tree";
    else if (IS_STWALL(maploc.typ))
        what = "a wall";
    else if (IS_OBSTRUCTED(maploc.typ))
        what = "a rock";
    else if (IS_THRONE(maploc.typ))
        what = "a throne";
    else if (IS_FOUNTAIN(maploc.typ))
        what = "a fountain";
    else if (IS_GRAVE(maploc.typ))
        what = "a headstone";
    else if (IS_SINK(maploc.typ))
        what = "a sink";
    else if (IS_ALTAR(maploc.typ))
        what = "an altar";
    else if (IS_DRAWBRIDGE(maploc.typ))
        what = "a drawbridge";
    else if (maploc.typ === STAIRS)
        what = "the stairs";
    else if (maploc.typ === LADDER)
        what = "a ladder";
    else if (maploc.typ === IRONBARS)
        what = "an iron bar";
    else
        what = "something weird";
    return "kicking " + what;
}

// ============================================================================
// 9. watchman_thief_arrest — guard arrest check
// cf. dokick.c:833
// ============================================================================
// Autotranslated from dokick.c:833
export async function watchman_thief_arrest(mtmp) {
  if (is_watch(mtmp.data) && couldsee(_gstate.map, _gstate.player, mtmp.mx, mtmp.my) && mtmp.mpeaceful) {
    await mon_yells(mtmp, "Halt, thief! You're under arrest!");
    await angry_guards(false);
    return true;
  }
  return false;
}

// ============================================================================
// 10. watchman_door_damage — guard door response
// cf. dokick.c:845
// ============================================================================
// Autotranslated from dokick.c:845
export async function watchman_door_damage(mtmp, x, y, map) {
  if (is_watch(mtmp.data) && mtmp.mpeaceful && couldsee(_gstate.map, _gstate.player, mtmp.mx, mtmp.my)) {
    if (map.locations[x][y].looted & D_WARNED) {
      await mon_yells(mtmp, "Halt, vandal! You're under arrest!");
      await angry_guards(false);
    }
    else {
      await mon_yells(mtmp, "Hey, stop damaging that door!");
      map.locations[x][y].looted |= D_WARNED;
    }
    return true;
  }
  return false;
}

// ============================================================================
// 11. kick_dumb — clumsy kick at empty space
// cf. dokick.c:863
// ============================================================================
// Autotranslated from dokick.c:863
export async function kick_dumb(x, y, map, player) {
  await exercise(player, A_DEX, false);
  if (martial(player) || ACURR(player, A_DEX) >= 16 || rn2(3)) { await You("kick at empty space."); }
  else {
    await pline("Dumb move! You strain a muscle.");
    await exercise(player, A_STR, false);
    set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
  }
  if ((Is_airlevel(player.uz) || player.levitating) && rn2(2)) {
      await hurtle(-player.dx, -player.dy, 1, true);
  }
}

// ============================================================================
// 12. kick_ouch — player hurt by kick
// cf. dokick.c:880
// ============================================================================
// Autotranslated from dokick.c:880
export async function kick_ouch(x, y, kickobjnam, game, map, player) {
  let dmg, buf;
  await pline("Ouch! That hurts!");
  await exercise(player, A_DEX, false);
  await exercise(player, A_STR, false);
  if (isok(x, y)) {
    if (player.Blind) feel_location(x, y);
    if (is_drawbridge_wall(x, y) >= 0) {
      await pline_The("drawbridge is unaffected.");
      find_drawbridge( x, y);
      game.maploc = map.locations[x][y];
    }
    wake_nearto(x, y, 5 * 5, map);
  }
  if (!rn2(3)) set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
  dmg = rnd(ACURR(player, A_CON) > 15 ? 3 : 5);
  await losehp(Maybe_Half_Phys(dmg), kickstr(buf, kickobjnam), KILLED_BY);
  if (Is_airlevel(player.uz) || player.levitating) {
      await hurtle(-player.dx, -player.dy, rn1(2, 4), true);
  }
}

// ============================================================================
// 13. kick_door — kick a door
// cf. dokick.c:909
// ============================================================================

async function kick_door(x, y, avrg_attrib, maploc, player, map, game) {
    const doormask = maploc.flags || 0;

    if (doormask === D_ISOPEN || doormask === D_BROKEN || doormask === D_NODOOR) {
        await kick_dumb(x, y, map, player);
        return;
    }

    // not enough leverage while levitating
    if (player.levitating) {
        await kick_ouch(x, y, "", game, map, player);
        return;
    }

    await exercise(player, A_DEX, true);
    const doorbuster = player.polymorph && is_giant(player.data);
    if (doorbuster
        || (rnl(35) < avrg_attrib + (!martial(player) ? 0 : ACURR(player, A_DEX)))) {
        const shoproom = in_rooms(x, y, 'S', map);
        const shopdoor = !!shoproom;

        if (doormask & D_TRAPPED) {
            if (game.flags?.verbose)
                await You("kick the door.");
            await exercise(player, A_STR, false);
            maploc.flags = D_NODOOR;
            await b_trapped("door", FOOT, player, map);
        } else if (ACURR(player, A_STR) > 18 && !rn2(5) && !shopdoor) {
            await pline("As you kick the door, it shatters to pieces!");
            await exercise(player, A_STR, true);
            maploc.flags = D_NODOOR;
        } else {
            await pline("As you kick the door, it crashes open!");
            await exercise(player, A_STR, true);
            maploc.flags = D_BROKEN;
        }
        feel_newsym(x, y);
        recalc_block_point(x, y);
        if (shopdoor) {
            add_damage(x, y, SHOP_DOOR_COST, map, game.moves);
            pay_for_damage("break", false, map, player, game.moves);
        }
        if (in_town(x, y, map))
            await get_iter_mons(async (m) => await watchman_thief_arrest(m), map);
    } else {
        if (player.blind)
            feel_location(x, y, map);
        await exercise(player, A_STR, true);
        await pline("%s!!", (player.deaf || !rn2(3)) ? "Thwack" : "Whammm");
        if (in_town(x, y, map))
            await get_iter_mons_xy(async (m, xx, yy) => await watchman_door_damage(m, xx, yy, map), x, y, map);
    }
}


// ============================================================================
// 14. kick_nondoor — kick non-door terrain
// cf. dokick.c:972
// ============================================================================
// Autotranslated from dokick.c:973
export async function kick_nondoor(x, y, avrg_attrib, game, map, player) {
  if (game.maploc.typ === SDOOR) {
    if (!player.levitating && rn2(30) < avrg_attrib) {
      cvt_sdoor_to_door(game.maploc);
      await pline("Crash! %s a secret door!",   (((game.maploc.flags || 0) & (D_LOCKED | D_TRAPPED)) === D_LOCKED) ? "Your kick uncovers" : "You kick open");
      await exercise(player, A_DEX, true);
      if ((game.maploc.flags || 0) & D_TRAPPED) { game.maploc.flags = D_NODOOR; await b_trapped("door", FOOT, player, map); }
      else if (game.maploc.flags !== D_NODOOR && !((game.maploc.flags || 0) & D_LOCKED)) game.maploc.flags = D_ISOPEN;
      feel_newsym(x, y);
      if (game.maploc.flags === D_ISOPEN || game.maploc.flags === D_NODOOR) unblock_point(x, y);
      return ECMD_TIME;
    }
    else { await kick_ouch(x, y, ""); return ECMD_TIME; }
  }
  if (game.maploc.typ === SCORR) {
    if (!player.levitating && rn2(30) < avrg_attrib) {
      await pline("Crash! You kick open a secret passage!");
      await exercise(player, A_DEX, true);
      game.maploc.typ = CORR;
      feel_newsym(x, y);
      unblock_point(x, y);
      return ECMD_TIME;
    }
    else { await kick_ouch(x, y, ""); return ECMD_TIME; }
  }
  if (IS_THRONE(game.maploc.typ)) {
    let i;
    if (player.levitating) { await kick_dumb(x, y); return ECMD_TIME; }
    if ((Luck < 0 || game.maploc.looted) && !rn2(3)) {
      game.maploc.looted = 0;
      game.maploc.typ = ROOM;
      mkgold( rnd(200), x, y);
      if (player.Blind) await pline("CRASH! You destroy it.");
      else { await pline("CRASH! You destroy the throne."); newsym(x, y); }
      await exercise(player, A_DEX, true);
      return ECMD_TIME;
    }
    else if (Luck > 0 && !rn2(3) && !game.maploc.looted) {
      mkgold( rn1(201, 300), x, y);
      i = Luck + 1;
      if (i > 6) i = 6;
      while (i--) {
        mksobj_at( rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1), x, y, false, true);
      }
      if (player.Blind) await You("kick %s loose!", something);
      else {
        await You("kick loose some ornamental coins and gems!");
        newsym(x, y);
      }
      game.maploc.looted = T_LOOTED;
      return ECMD_TIME;
    }
    else if (!rn2(4)) {
      if (dunlev(map.uz) < dunlevs_in_dungeon(map.uz.dnum)) { fall_through(false, 0); return ECMD_TIME; }
      else { await kick_ouch(x, y, ""); return ECMD_TIME; }
    }
    await kick_ouch(x, y, "");
    return ECMD_TIME;
  }
  if (IS_ALTAR(game.maploc.typ)) {
    if (player.levitating) { await kick_dumb(x, y); return ECMD_TIME; }
    await You("kick %s.", (player.Blind ? something : "the altar"));
    await altar_wrath(x, y);
    if (!rn2(3)) { await kick_ouch(x, y, ""); return ECMD_TIME; }
    await exercise(player, A_DEX, true);
    return ECMD_TIME;
  }
  if (IS_FOUNTAIN(game.maploc.typ)) {
    if (player.levitating) { await kick_dumb(x, y); return ECMD_TIME; }
    await You("kick %s.", (player.Blind ? something : "the fountain"));
    if (!rn2(3)) { await kick_ouch(x, y, ""); return ECMD_TIME; }
    if (uarmf && rn2(3)) {
      if (water_damage(uarmf, "metal boots", true) === ER_NOTHING) { await Your("boots get wet."); }
    }
    await exercise(player, A_DEX, true);
    return ECMD_TIME;
  }
  if (IS_GRAVE(game.maploc.typ)) {
    if (player.levitating) { await kick_dumb(x, y); }
    else if (rn2(4)) { await kick_ouch(x, y, ""); }
    else if (!game.maploc.disturbed && !rn2(2)) { await disturb_grave(x, y); }
    else {
      await exercise(player, A_WIS, false);
      if (Role_if(player, PM_ARCHEOLOGIST) || Role_if(player, PM_SAMURAI) || (player.ualign.type === A_LAWFUL && player.ualign.record > -10)) adjalign(-sgn(player.ualign.type));
      game.maploc.typ = ROOM;
      game.maploc.emptygrave = 0;
      game.maploc.disturbed = 0;
      mksobj_at(ROCK, x, y, true, false);
      del_engr_at(x, y);
      if (player.Blind) { await pline("Crack! %s broke!", Something); }
      else { await pline_The("headstone topples over and breaks!"); newsym(x, y); }
    }
    return ECMD_TIME;
  }
  if (game.maploc.typ === IRONBARS) { await kick_ouch(x, y, ""); return ECMD_TIME; }
  if (IS_TREE(game.maploc.typ)) {
    let treefruit;
    if (rn2(3)) {
      if (!rn2(6) && !(game.mvitals[PM_KILLER_BEE].mvflags & G_GONE)) await You_hear("a low buzzing.");
      await kick_ouch(x, y, "");
      return ECMD_TIME;
    }
    if (rn2(15) && !(game.maploc.looted & TREE_LOOTED) && (treefruit = rnd_treefruit_at(x, y, game.lev || game.map))) {
      let nfruit = 8 - rnl(7), nfall, frtype = treefruit.otyp;
      treefruit.quan = nfruit;
      treefruit.owt = weight(treefruit);
      if (is_plural(treefruit)) await pline("Some %s fall from the tree!", xname(treefruit));
      else {
        await pline("%s falls from the tree!", An(xname(treefruit)));
      }
      nfall = scatter(x, y, 2, MAY_HIT, treefruit);
      if (nfall !== nfruit) {
        treefruit = mksobj(frtype, true, false);
        treefruit.quan = nfruit - nfall;
        await pline("%ld %s got caught in the branches.", nfruit - nfall, xname(treefruit));
        dealloc_obj(treefruit);
      }
      await exercise(player, A_DEX, true);
      await exercise(player, A_WIS, true);
      newsym(x, y);
      game.maploc.looted |= TREE_LOOTED;
      return ECMD_TIME;
    }
    else if (!(game.maploc.looted & TREE_SWARM)) {
      let cnt = rnl(4) + 2, made = 0, mm = {x, y};
      while (cnt--) {
        if (enexto( mm, mm.x, mm.y, mons[PM_KILLER_BEE]) && makemon( mons[PM_KILLER_BEE], mm.x, mm.y, MM_ANGRY|MM_NOMSG)) made++;
      }
      if (made) await pline("You've attracted the tree's former occupants!");
      else {
        await You("smell stale honey.");
      }
      game.maploc.looted |= TREE_SWARM;
      return ECMD_TIME;
    }
    await kick_ouch(x, y, "");
    return ECMD_TIME;
  }
  if (IS_SINK(game.maploc.typ)) {
    let gend = poly_gender();
    if (player.levitating) { await kick_dumb(x, y); return ECMD_TIME; }
    if (rn2(5)) {
      if (!player.Deaf) await pline("Klunk! The pipes vibrate noisily.");
      else {
        await pline("Klunk!");
      }
      await exercise(player, A_DEX, true);
      return ECMD_TIME;
    }
    else if (!(game.maploc.looted & S_LPUDDING) && !rn2(3) && !(game.mvitals[PM_BLACK_PUDDING].mvflags & G_GONE)) {
      if (player.Blind) { if (!player.Deaf) await You_hear("a gushing sound."); }
      else {
        await pline("A %s ooze gushes up from the drain!", hcolor(NH_BLACK));
      }
      makemon( mons[PM_BLACK_PUDDING], x, y, MM_NOMSG);
      await exercise(player, A_DEX, true);
      newsym(x, y);
      game.maploc.looted |= S_LPUDDING;
      return ECMD_TIME;
    }
    else if (!(game.maploc.looted & S_LDWASHER) && !rn2(3) && !(game.mvitals[PM_AMOROUS_DEMON].mvflags & G_GONE)) {
      await pline("%s returns!", (player.Blind ? Something : "The dish washer"));
      if (makemon( mons[PM_AMOROUS_DEMON], x, y, MM_NOMSG | ((gend === 1 || (gend === 2 && rn2(2))) ? MM_MALE : MM_FEMALE))) newsym(x, y);
      game.maploc.looted |= S_LDWASHER;
      await exercise(player, A_DEX, true);
      return ECMD_TIME;
    }
    else if (!rn2(3)) { await sink_backs_up(x, y); return ECMD_TIME; }
    await kick_ouch(x, y, "");
    return ECMD_TIME;
  }
  if (game.maploc.typ === STAIRS || game.maploc.typ === LADDER || IS_STWALL(game.maploc.typ)) {
    if (!IS_STWALL(game.maploc.typ) && game.maploc.ladder === LA_DOWN) { await kick_dumb(x, y); return ECMD_TIME; }
    await kick_ouch(x, y, "");
    return ECMD_TIME;
  }
  await kick_dumb(x, y);
  return ECMD_TIME;
}

// A_LAWFUL import
import { A_LAWFUL, NATTK, NON_PM } from './const.js';

// ============================================================================
// 15. dokick — the #kick command handler
// cf. dokick.c:1256
// This is the main exported async function, replacing handleKick from kick.js
// ============================================================================

export async function dokick(player, map, display, game) {
    let x, y;
    let avrg_attrib;
    let oldglyph = -1;
    let mtmp;
    let no_kick = false;
    const playerData = player.data || {};

    if (nolimbs(playerData) || slithy(playerData)) {
        await You("have no legs to kick with.");
        no_kick = true;
    } else if (verysmall(playerData)) {
        await You("are too small to do any kicking.");
        no_kick = true;
    } else if (player.usteed) {
        // TODO: yn_function for steed kick
        await You("kick %s.", mon_nam(player.usteed));
        await kick_steed(player, map, display);
        return { moved: false, tookTime: true };
    } else if (player.woundedLegs) {
        await legs_in_no_shape("kicking", false, player);
        no_kick = true;
    } else if (near_capacity(player) > SLT_ENCUMBER) {
        await Your("load is too heavy to balance yourself for a kick.");
        no_kick = true;
    } else if (playerData.mlet === S_LIZARD) {
        await Your("legs cannot kick effectively.");
        no_kick = true;
    } else if (player.uinwater && !rn2(2)) {
        await Your("slow motion kick doesn't hit anything.");
        no_kick = true;
    } else if (player.utrap) {
        no_kick = true;
        switch (player.utraptype) {
        case TT_PIT: // TT_PIT
            if (!Passes_walls(player))
                await pline("There's not enough room to kick down here.");
            else
                no_kick = false;
            break;
        case TT_WEB: // TT_WEB
        case TT_BEARTRAP: // TT_BEARTRAP
            await You_cant("move your %s!", body_part(LEG, player));
            break;
        default:
            break;
        }
    } else if (sobj_at(BOULDER, player.x, player.y, map) && !Passes_walls(player)) {
        await pline("There's not enough room to kick in here.");
        no_kick = true;
    }

    if (no_kick) {
        return { moved: false, tookTime: false };
    }

    // Get direction
    if (display) await display.putstr_message('In what direction? ');
    const dirCh = await nhgetch();
    if (display) display.topMessage = null;
    const c = String.fromCharCode(dirCh);
    const dir = DIRECTION_KEYS[c];
    if (!dir) {
        return { moved: false, tookTime: false };
    }
    const dx = dir[0];
    const dy = dir[1];
    if (!dx && !dy)
        return { moved: false, tookTime: false };

    player.dx = dx;
    player.dy = dy;

    x = player.x + dx;
    y = player.y + dy;
    player.kickedloc = { x, y };

    // KMH -- Kicking boots always succeed
    if (player.boots && player.boots.otyp === KICKING_BOOTS)
        avrg_attrib = 99;
    else
        avrg_attrib = Math.floor((ACURRSTR(player) + ACURR(player, A_DEX) + ACURR(player, A_CON)) / 3);

    if (player.uswallow) {
        switch (rn2(3)) {
        case 0:
            await You_cant("move your %s!", body_part(LEG, player));
            break;
        case 1:
            if (player.ustuck && player.ustuck.data
                && (player.ustuck.data.mflags1 & 0x4000000)) { // digests
                await pline("%s burps loudly.", Monnam(player.ustuck));
                break;
            }
            // FALLTHROUGH
        default:
            await Your("feeble kick has no effect.");
            break;
        }
        return { moved: false, tookTime: true };
    } else if (player.utrap && player.utraptype === TT_PIT) { // TT_PIT
        await You("kick at the side of the pit.");
        return { moved: false, tookTime: true };
    }

    if (player.levitating) {
        const xx = player.x - dx;
        const yy = player.y - dy;
        if (isok(xx, yy)) {
            const brace = map.at(xx, yy);
            if (brace && !IS_OBSTRUCTED(brace.typ) && !IS_DOOR(brace.typ)
                && (!Is_airlevel(player.uz) || !OBJ_AT(xx, yy, map))) {
                await You("have nothing to brace yourself against.");
                return { moved: false, tookTime: false };
            }
        }
    }

    mtmp = isok(x, y) ? map.monsterAt(x, y) : null;
    if (mtmp) {
        oldglyph = glyph_at(x, y);
        if (!await maybe_kick_monster(mtmp, x, y, player, map, game)) {
            const ctx = (game && game.svc && game.svc.context)
                ? game.svc.context
                : game?.context;
            return { moved: false, tookTime: ctx?.move ? true : false };
        }
    }

    wake_nearby(false, player, map);
    await u_wipe_engr(2);

    if (!isok(x, y)) {
        await kick_ouch(x, y, "", null, player, map);
        return { moved: false, tookTime: true };
    }

    const maploc = map.at(x, y);

    // The next five tests: monsters, pools, objects, non-doors, doors.
    if (mtmp) {
        const mdat = mtmp.data || mtmp.type;
        await kick_monster(mtmp, x, y, player, map, game);

        if (mtmp.mhp <= 0) {
            // dead monster handling
        } else if (!canspotmon(mtmp, player, null, map)
                   && mtmp.mx === x && mtmp.my === y) {
            map_invisible(map, x, y, player);
        }

        // recoil if floating
        const ctx = (game && game.svc && game.svc.context)
            ? game.svc.context
            : game?.context;
        if ((Is_airlevel(player.uz) || player.levitating) && ctx?.move) {
            let range = (playerData.cwt || 450) + (weight_cap(player) + inv_weight(player));
            if (range < 1) range = 1;
            range = Math.floor(3 * (mdat.cwt || 100) / range);
            if (range < 1) range = 1;
            await hurtle(-dx, -dy, range, true, player, map);
        }
        return { moved: false, tookTime: true };
    }

    // unmap_invisible
    if (maploc && ((is_pool(x, y, map) || maploc.typ === LAVAWALL) !== !!player.uinwater)) {
        await You("splash some %s around.",
            hliquid(is_pool(x, y, map) ? "water" : "lava"));
        return { moved: false, tookTime: true };
    }

    if (OBJ_AT(x, y, map) && (!player.levitating || Is_airlevel(player.uz)
                               || Is_waterlevel(player.uz) || sobj_at(BOULDER, x, y, map))) {
        const { res, kickobjnam } = await kick_object(x, y, player, map, game);
        if (res) {
            if (Is_airlevel(player.uz))
                await hurtle(-dx, -dy, 1, true, player, map);
            return { moved: false, tookTime: true };
        }
        await kick_ouch(x, y, kickobjnam, maploc, player, map);
        return { moved: false, tookTime: true };
    }

    if (maploc && IS_DOOR(maploc.typ)) {
        await kick_door(x, y, avrg_attrib, maploc, player, map, game);
    } else if (maploc) {
        await kick_nondoor(x, y, avrg_attrib, maploc, player, map, game);
    }
    return { moved: false, tookTime: true };
}

// ============================================================================
// 16. drop_to — object trap destination
// cf. dokick.c:1472
// ============================================================================

async function drop_to(cc, loc, x, y, player, map) {
    const stway = await stairway_at(x, y, map);

    switch (loc) {
    case MIGR_RANDOM:
        if (Is_stronghold(player.uz)) {
            // cc.x = valley_level.dnum; cc.y = valley_level.dlevel;
            cc.x = 0; cc.y = 0; // TODO: valley_level
            break;
        } else if (In_endgame(player.uz) || Is_botlevel(player.uz)) {
            cc.y = cc.x = 0;
            break;
        }
        // FALLTHROUGH
    case MIGR_STAIRS_UP:
    case MIGR_LADDER_UP:
    case MIGR_SSTAIRS:
        if (stway) {
            cc.x = stway.tolev ? stway.tolev.dnum : 0;
            cc.y = stway.tolev ? stway.tolev.dlevel : 0;
        } else {
            cc.x = player.uz ? player.uz.dnum : 0;
            cc.y = player.uz ? player.uz.dlevel + 1 : 1;
        }
        break;
    default:
    case MIGR_NOWHERE:
        cc.y = cc.x = 0;
        break;
    }
}

// ============================================================================
// 17. impact_drop — impact-caused object falling
// cf. dokick.c:1510
// ============================================================================

export async function impact_drop(missile, x, y, dlev, player, map, game) {
    if (!OBJ_AT(x, y, map))
        return;

    const toloc_orig = await down_gate(x, y, map, player);
    let toloc = toloc_orig;
    const cc = { x: 0, y: 0 };
    await drop_to(cc, toloc, x, y, player, map);
    if (!cc.y)
        return;

    if (dlev) {
        toloc = MIGR_WITH_HERO;
        cc.y = dlev;
    }

    const costly = costly_spot(x, y, map);
    let price = 0, debit = 0, robbed = 0;
    let angry = false;
    let shkp = null;
    if (costly) {
        const shoproom = in_rooms(x, y, 'S', map);
        shkp = shoproom ? shop_keeper(shoproom) : null;
        if (shkp) {
            const eshk = shkp.eshk || {};
            debit = eshk.debit || 0;
            robbed = eshk.robbed || 0;
            angry = !shkp.mpeaceful;
        }
    }

    const isrock = missile && missile.otyp === ROCK;
    let oct = 0, dct = 0;
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    for (const obj of [...objs]) {
        if (obj === missile) continue;
        oct += (obj.quan || 1);
        if (obj === player.uball || obj === player.uchain) continue;
        if ((isrock && obj.otyp === BOULDER)
            || rn2(obj.otyp === BOULDER ? 30 : 3))
            continue;

        obj_extract_self(obj, map);
        if (costly) {
            price += await stolen_value(obj, x, y,
                costly_spot(player.x, player.y, map), true, map);
            if (Has_contents(obj))
                picked_container(obj);
            if (obj.oclass !== COIN_CLASS)
                obj.no_charge = 0;
        }

        add_to_migration(obj, game);
        obj.ox = cc.x;
        obj.oy = cc.y;
        obj.owornmask = toloc;
        dct += (obj.quan || 1);
    }

    if (dct && cansee(x, y)) {
        const what = (dct === 1 ? "object falls" : "objects fall");
        if (missile)
            await pline("From the impact, %sother %s.",
                dct === oct ? "the " : dct === 1 ? "an" : "", what);
        else if (oct === dct)
            await pline("%s adjacent %s %s.", dct === 1 ? "The" : "All the", what,
                gate_str || "");
        else
            await pline("%s adjacent %s %s.",
                dct === 1 ? "One of the" : "Some of the",
                dct === 1 ? "objects falls" : what, gate_str || "");
    }

    if (costly && shkp && price) {
        const eshk = shkp.eshk || {};
        if ((eshk.robbed || 0) > robbed) {
            await You("removed %d %s worth of goods!", price, currency(price));
            if (cansee(shkp.mx, shkp.my)) {
                if (angry)
                    await pline("%s is infuriated!", Monnam(shkp));
                else
                    await pline("\"%s, you are a thief!\"", player.name || "adventurer");
            } else {
                await You_hear("a scream, \"Thief!\"");
            }
            hot_pursuit(shkp);
            await angry_guards(false);
            return;
        }
        if ((eshk.debit || 0) > debit) {
            const amt = (eshk.debit || 0) - debit;
            await You("owe the shopkeeper %d %s for goods lost.", amt, currency(amt));
        }
    }
}

// ============================================================================
// 18. ship_object — inter-level object migration
// cf. dokick.c:1638
// ============================================================================

export async function ship_object(otmp, x, y, shop_floor_obj, player, map, game) {
    if (!otmp) return false;

    const toloc = await down_gate(x, y, map, player);
    if (toloc === MIGR_NOWHERE) return false;

    const cc = { x: 0, y: 0 };
    await drop_to(cc, toloc, x, y, player, map);
    if (!cc.y) return false;

    const nodrop = (otmp === player.uball) || (otmp === player.uchain)
        || (toloc !== MIGR_LADDER_UP && rn2(3));

    const container = Has_contents(otmp);
    const unpaid = is_unpaid(otmp);

    let chainthere = false;
    let n = 0;
    if (OBJ_AT(x, y, map)) {
        const objs = map.objectsAt ? map.objectsAt(x, y) : [];
        for (const obj of objs) {
            if (obj === player.uchain) chainthere = true;
            else if (obj !== otmp) n += (obj.quan || 1);
        }
    }
    const impact = n > 0;

    if (otmp.otyp === BOULDER) {
        const trap = t_at(x, y, map);
        if (trap && is_hole(trap.ttyp)) {
            if (impact)
                await impact_drop(otmp, x, y, 0, player, map, game);
            return false;
        }
    }

    if (cansee(x, y))
        await otransit_msg(otmp, nodrop, chainthere, n);

    if (nodrop) {
        if (impact) {
            await impact_drop(otmp, x, y, 0, player, map, game);
            maybe_unhide_at(x, y, map);
        }
        return false;
    }

    if (unpaid || shop_floor_obj) {
        if (unpaid) {
            await stolen_value(otmp, player.x, player.y, true, false, map);
        } else {
            const ox = otmp.ox || x;
            const oy = otmp.oy || y;
            await stolen_value(otmp, ox, oy,
                costly_spot(player.x, player.y, map), false, map);
        }
        if (container)
            picked_container(otmp);
        if (otmp.oclass !== COIN_CLASS)
            otmp.no_charge = 0;
    }

    if (otmp.owornmask)
        remove_worn_item(otmp, true);

    if (breaktest(otmp)) {
        let result;
        const odata = objectData[otmp.otyp];
        if ((odata && odata.oc_material === GLASS) || otmp.otyp === EXPENSIVE_CAMERA) {
            if (otmp.otyp === MIRROR)
                change_luck(-2, player);
            result = "crash";
        } else {
            if (otmp.otyp === EGG && otmp.spe && ismnum(otmp.corpsenm))
                change_luck(-Math.min(otmp.quan || 1, 5), player);
            result = "splat";
        }
        await You_hear("a muffled %s.", result);
        obj_extract_self(otmp, map);
        obfree(otmp, map);
        return true;
    }

    add_to_migration(otmp, game);
    otmp.ox = cc.x;
    otmp.oy = cc.y;
    otmp.owornmask = toloc;

    if (otmp.otyp === BOULDER)
        otmp.otrapped = 0;

    if (impact) {
        await impact_drop(otmp, x, y, 0, player, map, game);
        newsym(x, y, map);
    }
    return true;
}

// ============================================================================
// 19. obj_delivery — deliver migrating objects to level
// cf. dokick.c:1768
// ============================================================================

export async function obj_delivery(near_hero, player, map, game) {
    if (!game.migrating_objs) return;

    const remaining = [];
    for (const otmp of game.migrating_objs) {
        if (!otmp) continue;
        if (!player.uz || otmp.ox !== player.uz.dnum || otmp.oy !== player.uz.dlevel) {
            remaining.push(otmp);
            continue;
        }

        let where = (otmp.owornmask || 0) & 0x7fff;
        if ((where & MIGR_TO_SPECIES) !== 0) {
            remaining.push(otmp);
            continue;
        }

        const nobreak = (where & MIGR_NOBREAK) !== 0;
        const noscatter = (where & MIGR_WITH_HERO) !== 0;
        where &= ~(MIGR_NOBREAK | MIGR_NOSCATTER);

        if (!near_hero !== (where !== MIGR_WITH_HERO)) {
            remaining.push(otmp);
            continue;
        }

        otmp.owornmask = 0;
        const fromdlev = {
            dnum: otmp.omigr_from_dnum || 0,
            dlevel: otmp.omigr_from_dlevel || 0,
        };

        let isladder = false;
        let nx = 0, ny = 0;

        switch (where) {
        case MIGR_LADDER_UP:
            isladder = true;
            // FALLTHROUGH
        case MIGR_STAIRS_UP:
        case MIGR_SSTAIRS: {
            const stway = await stairway_find_from(fromdlev, isladder, map);
            if (stway) { nx = stway.sx; ny = stway.sy; }
            break;
        }
        case MIGR_WITH_HERO:
            nx = player.x; ny = player.y;
            break;
        default:
        case MIGR_RANDOM:
            nx = ny = 0;
            break;
        }

        otmp.omigr_from_dnum = 0;
        otmp.omigr_from_dlevel = 0;

        if (nx > 0) {
            placeFloorObject(otmp, nx, ny, map);
            const loc = map.at(nx, ny);
            if (!nobreak && loc && !IS_SOFT(loc.typ)) {
                if (where === MIGR_WITH_HERO) {
                    if (await breaks(otmp, nx, ny, player, map))
                        continue;
                } else if (breaktest(otmp)) {
                    delobj(otmp, map);
                    continue;
                }
            }
            stackobj(otmp, map);
            if (!noscatter)
                scatter(nx, ny, rnd(2), 0, otmp, map);
            else
                newsym(nx, ny, map);
        } else {
            otmp.ox = otmp.oy = 0;
            if (rloco(otmp, map, player) && !nobreak && breaktest(otmp)) {
                delobj(otmp, map);
            }
        }
        // don't re-add to remaining
    }
    game.migrating_objs = remaining;
}

// ============================================================================
// 20. deliver_obj_to_mon — monster object delivery
// cf. dokick.c:1853
// ============================================================================

export function deliver_obj_to_mon(mtmp, cnt, deliverflags, game) {
    const DF_RANDOM = 1;
    const DF_ALL = 2;

    let maxobj;
    if ((deliverflags & DF_RANDOM) && cnt > 1)
        maxobj = rnd(cnt);
    else if (deliverflags & DF_ALL)
        maxobj = 0;
    else
        maxobj = 1;

    const DELIVER_PM = M2_UNDEAD | M2_WERE | M2_HUMAN | M2_ELF | M2_DWARF
                       | M2_GNOME | M2_ORC | M2_DEMON | M2_GIANT;

    if (!game.migrating_objs) return;

    let delivered = 0;
    const remaining = [];
    for (const otmp of game.migrating_objs) {
        if (!otmp) continue;
        const where = (otmp.owornmask || 0) & 0x7fff;
        if ((where & MIGR_TO_SPECIES) === 0) {
            remaining.push(otmp);
            continue;
        }

        const monData = mtmp.data || mtmp.type;
        if (otmp.migr_species !== NON_PM
            && ((monData.mflags2 || monData.mflags2 || 0) & DELIVER_PM) === otmp.migr_species) {
            otmp.owornmask = 0;
            otmp.ox = otmp.oy = 0;

            // special treatment for orcs
            if ((otmp.corpsenm & M2_ORC) !== 0 && otmp.oname) {
                if (!mtmp.mgivenname) {
                    // christen_orc omitted — TODO
                }
                otmp.oname = null;
            }
            otmp.migr_species = NON_PM;
            otmp.omigr_from_dnum = 0;
            otmp.omigr_from_dlevel = 0;
            // add_to_minv
            if (!mtmp.minvent) mtmp.minvent = [];
            mtmp.minvent.push(otmp);
            delivered++;
            if (maxobj && delivered >= maxobj)
                break;
        } else {
            remaining.push(otmp);
        }
    }
    game.migrating_objs = remaining;
}

// ============================================================================
// 21. otransit_msg — object transit message
// cf. dokick.c:1908
// ============================================================================
// Autotranslated from dokick.c:1908
export async function otransit_msg(otmp, nodrop, chainthere, num) {
  let optr = 0, obuf, xbuf;
  if (otmp.otyp === CORPSE) {
    optr = upstart(corpse_xname(otmp,  0, CXN_PFX_THE));
  }
  else { optr = Tobjnam(otmp,  0); }
  obuf = optr;
  if (num || chainthere) {
    if (num) {
      xbuf = ` ${otense(otmp, "hit")} ${(num === 1) ? "another" : "other"} object${(num > 1) ? "s" : ""}`;
    }
    else {
      xbuf = ` ${otense(otmp, "rattle")} your chain`;
    }
    if (nodrop) {
      xbuf += ".";
    }
    else {
      xbuf += ` and ${otense(otmp, "fall")} ${gate_str}.`;
    }
    await pline("%s%s", obuf, xbuf);
  }
  else if (!nodrop) await pline("%s %s %s.", obuf, otense(otmp, "fall"), gate_str);
}

// ============================================================================
// 22. down_gate — trap migration route
// cf. dokick.c:1942
// ============================================================================

export async function down_gate(x, y, map, player) {
    gate_str = null;
    const stway = await stairway_at(x, y, map);

    // quest level check
    // TODO: qstart_level / ok_to_quest()

    if (stway && !stway.up && !stway.isladder) {
        gate_str = "down the stairs";
        return (stway.tolev && stway.tolev.dnum === (player.uz ? player.uz.dnum : 0))
            ? MIGR_STAIRS_UP : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        gate_str = "down the ladder";
        return MIGR_LADDER_UP;
    }

    const trap = t_at(x, y, map);
    if (trap && trap.tseen && is_hole(trap.ttyp)) {
        gate_str = (trap.ttyp === TRAPDOOR) ? "through the trap door"
                                             : "through the hole";
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}
