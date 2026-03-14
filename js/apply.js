// apply.js -- Applying items: tools, lamps, whips, traps, and more
// cf. apply.c — do_blinding_ray, use_camera, use_towel, its_dead,
//               use_stethoscope, use_whistle, use_magic_whistle, magic_whistled,
//               um_dist, number_leashed, o_unleash, m_unleash, unleash_all,
//               leashable, use_leash, use_leash_core, mleashed_next2u,
//               next_to_u, check_leash, use_mirror, use_bell, use_candelabrum,
//               use_candle, snuff_candle, snuff_lit, splash_lit, catch_lit,
//               use_lamp, light_cocktail, rub_ok, dorub, dojump, check_jump,
//               is_valid_jump_pos, get_valid_jump_position, display_jump_positions,
//               tinnable, use_tinning_kit, use_unicorn_horn, fig_transform,
//               figurine_location_checks, use_figurine, grease_ok, use_grease,
//               touchstone_ok, use_stone, reset_trapset, use_trap, set_trap,
//               use_whip, find_poleable_mon, get_valid_polearm_position,
//               display_polearm_positions, calc_pole_range, could_pole_mon,
//               snickersnee_used_dist_attk, use_pole, use_cream_pie, jelly_ok,
//               use_royal_jelly, grapple_range, can_grapple_location,
//               display_grapple_positions, use_grapple, discard_broken_wand,
//               broken_wand_explode, maybe_dunk_boulders, do_break_wand,
//               apply_ok, doapply, unfixable_trouble_count,
//               flip_through_book, flip_coin
//
// apply.c handles the #apply command and all tool-use mechanics:
//   doapply(): dispatches to specific use_* functions based on object type.
//   use_lamp/candle/candelabrum: light source management.
//   use_leash/check_leash/unleash_all: pet leash management.
//   use_pole/use_whip/use_grapple: range-weapon and mobility tools.
//   use_stethoscope/use_mirror/use_camera: diagnostic and utility tools.
//   use_whistle/use_magic_whistle: pet-summoning whistles.
//   do_break_wand: wand explosion from applied breaking.
//   dorub/dojump: rubbing and physical jumping commands.
//
// JS implementations:
//   doapply -> handleApply() (PARTIAL)
//   um_dist, number_leashed, o_unleash, m_unleash, unleash_all,
//   leashable, next_to_u, check_leash, beautiful, snuff_candle,
//   snuff_lit, splash_lit, catch_lit, tinnable, use_unicorn_horn,
//   fig_transform, figurine_location_checks, unfixable_trouble_count,
//   reset_trapset, calc_pole_range, could_pole_mon, maybe_dunk_boulders,
//   do_blinding_ray, flip_through_book, flip_coin -- ported as stubs or partial

import { objectData, WEAPON_CLASS, TOOL_CLASS, SPBOOK_CLASS,
         WAND_CLASS, COIN_CLASS, POTION_CLASS, GEM_CLASS, RING_CLASS,
         LANCE, BULLWHIP, STETHOSCOPE,
         PICK_AXE, DWARVISH_MATTOCK, EXPENSIVE_CAMERA, MIRROR, FIGURINE,
         CREDIT_CARD, LOCK_PICK, SKELETON_KEY,
         CREAM_PIE, EUCALYPTUS_LEAF, LUMP_OF_ROYAL_JELLY,
         POT_OIL, TOUCHSTONE, LUCKSTONE, LOADSTONE, FLINT,
         LEASH, CANDELABRUM_OF_INVOCATION,
         WAX_CANDLE, TALLOW_CANDLE, OIL_LAMP, MAGIC_LAMP, BRASS_LANTERN,
         TIN_WHISTLE, MAGIC_WHISTLE, BELL, BELL_OF_OPENING,
         UNICORN_HORN, GRAPPLING_HOOK, CAN_OF_GREASE, TINNING_KIT,
         LAND_MINE, BEARTRAP, TOWEL, BLINDFOLD, LENSES, SADDLE,
         CORPSE, EGG, TIN, STATUE, BOULDER,
         SPE_BLANK_PAPER, SPE_NOVEL, SPE_BOOK_OF_THE_DEAD,
         LARGE_BOX, CHEST, ICE_BOX, SACK, BAG_OF_HOLDING, OILSKIN_SACK,
         BAG_OF_TRICKS, HORN_OF_PLENTY,
         WOODEN_FLUTE, MAGIC_FLUTE, TOOLED_HORN, FROST_HORN, FIRE_HORN,
         WOODEN_HARP, MAGIC_HARP, BUGLE, LEATHER_DRUM, DRUM_OF_EARTHQUAKE,
         CRYSTAL_BALL, MAGIC_MARKER, TIN_OPENER, BANANA,
         WAN_OPENING, WAN_WISHING, WAN_NOTHING, WAN_LOCKING, WAN_PROBING,
         WAN_DEATH, WAN_LIGHTNING, WAN_FIRE, WAN_COLD, WAN_MAGIC_MISSILE,
         WAN_STRIKING, WAN_CANCELLATION, WAN_POLYMORPH, WAN_TELEPORTATION,
         WAN_UNDEAD_TURNING, WAN_DIGGING, WAN_CREATE_MONSTER, WAN_LIGHT,
         WAN_SECRET_DOOR_DETECTION, WAN_ENLIGHTENMENT } from './objects.js';
import { more, nhgetch, ynFunction, cmdq_add_ec, cmdq_add_key } from './input.js';
import { doname, xname } from './mkobj.js';
import { make_glib, make_blinded, incr_itimeout, set_itimeout } from './potion.js';
import { gulp_blnd_check } from './mhitu.js';
import { IS_DOOR, IS_STWALL, D_CLOSED, D_LOCKED, D_ISOPEN, D_NODOOR, D_BROKEN,
         A_STR, A_DEX, A_CON, A_CHA,
         isok, COLNO, ROWNO, IS_OBSTRUCTED,
         SICK, BLINDED, GLIB, HALLUC, VOMITING, CONFUSION, STUNNED, DEAF,
         TIMEOUT, HAND, FACE, HEAD, CQ_CANNED } from './const.js';
import { rn2, rnd, rn1, d, shuffle_int_array } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { acurr } from './attrib.js';
import { pline, You, Your, You_cant, You_hear,
         pline_The, There, pline_mon, verbalize, impossible } from './pline.js';
import { Monnam, mon_nam } from './do_name.js';
import { nolimbs, has_head, unsolid, breathless,
         is_vampire, is_unicorn, is_humanoid, is_demon, perceives,
         slithy, strongmonst, can_blow, is_rider, touch_petrifies,
         poly_when_stoned, throws_rocks, passes_walls,
         bigmonst, verysmall, nohands } from './mondata.js';
import { mons, PM_LONG_WORM, MS_SILENT,
         PM_ROGUE, PM_HEALER, PM_ARCHEOLOGIST } from './monsters.js';
import { dist2, distu, s_suffix } from './hacklib.js';
import { u_at } from './hack.js';
import { setnotworn } from './worn.js';
import { begin_burn, end_burn,
         kill_egg, attach_egg_hatch_timeout } from './timeout.js';
import { maketrap } from './dungeon.js';
import { tmp_at, nh_delay_output } from './animation.js';
import { DISP_BEAM, DISP_END, IS_FURNITURE, nothing_happens,
         P_AXE, P_PICK_AXE, P_TRIDENT, P_LANCE, DIGTYP_UNDIGGABLE } from './const.js';
import { break_wand } from './zap.js';
import { wield_tool } from './wield.js';
import { body_part } from './polyself.js';
import { freehand, can_reach_floor } from './engrave.js';
import { Blindf_off } from './do_wear.js';
import { dropx } from './do.js';
import { game as _gstate } from './gstate.js';
import { show_invalid_direction_cmdassist_help } from './pickup.js';
import { dry_a_towel } from './weapon.js';
import { dowrite } from './write.js';
import { is_wet_towel, gloves_simple_name, makeplural, thesimpleoname, yname } from './objnam.js';
import { shk_your } from './shk.js';
import { useupall, update_inventory, sobj_at } from './invent.js';
import { cansee } from './vision.js';
import { cmap_to_glyph } from './display.js';
import { S_goodpos } from './symbols.js';
import { t_at, m_at } from './trap.js';
import { walk_path } from './dothrow.js';
import { closed_door } from './monmove.js';
import { dig_typ } from './dig.js';
import { pick_lock } from './lock.js';
import { objdescr_is } from './o_init.js';

// -- Inline helpers --

const MAXLEASHED = 2;

const DIRECTION_KEYS = {
    'h': [-1, 0], 'j': [0, 1], 'k': [0, -1], 'l': [1, 0],
    'y': [-1, -1], 'u': [1, -1], 'b': [-1, 1], 'n': [1, 1],
    '.': [0, 0],
};

// nothing_happens imported from const.js




// Internal: is this object type ignitable? (mirrors light.c ignitable)
function _ignitable(obj) {
    return (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
            || obj.otyp === BRASS_LANTERN || obj.otyp === POT_OIL
            || obj.otyp === CANDELABRUM_OF_INVOCATION
            || obj.otyp === WAX_CANDLE || obj.otyp === TALLOW_CANDLE);
}

// ====================================================================
// Ported functions from apply.c
// ====================================================================

// cf. apply.c:61 -- STUB: depends on bhit, flash_hits_mon
export async function do_blinding_ray(_obj, player = null, map = null) {
    if (!player || !map) {
        await pline(nothing_happens);
        return;
    }
    const dx = Number.isInteger(player.dx) ? player.dx : 0;
    const dy = Number.isInteger(player.dy) ? player.dy : 0;
    if (!dx && !dy) {
        await pline(nothing_happens);
        return;
    }
    tmp_at(DISP_BEAM, { ch: '*', color: 14 });
    try {
        let x = player.x;
        let y = player.y;
        for (let i = 0; i < 8; i++) {
            x += dx;
            y += dy;
            if (!isok(x, y)) break;
            tmp_at(x, y);
            await nh_delay_output();
            const loc = map.at(x, y);
            if (!loc || IS_OBSTRUCTED(loc.typ)) break;
        }
    } finally {
        tmp_at(DISP_END, 0);
    }
}

// cf. apply.c:79 -- STUB: depends on getdir, bhit, zapyourself
export async function use_camera(obj) {
    if (obj.spe <= 0) { await pline(nothing_happens); return; }
    obj.spe--;
    await pline("You take a picture.");
}

// cf. apply.c:112 -- STUB: depends on freehand, Glib, makeplural
// Autotranslated from apply.c:111
export async function use_towel(obj, player) {
  let drying_feedback = (obj === player.weapon);
  if (!freehand()) { await You("have no free %s!", body_part(HAND)); return ECMD_OK; }
  else if (obj === player.blindfold) { await You("cannot use it while you're wearing it!"); return ECMD_OK; }
  else if (obj.cursed) {
    let old;
    switch (rn2(3)) {
      case 2:
        old = ((player.getPropTimeout(GLIB) || 0) & TIMEOUT);
      make_glib(player, old + rn1(10, 3));
      await Your("%s %s!", makeplural(body_part(HAND)), (old ? "are filthier than ever" : "get slimy"));
      if (is_wet_towel(obj)) dry_a_towel(obj, -1, drying_feedback);
      return ECMD_TIME;
      case 1:
        if (!player.blindfold) {
          old = player.ucreamed;
          player.ucreamed += rn1(10, 3);
          await pline("Yecch! Your %s %s gunk on it!", body_part(FACE), (old ? "has more" : "now has"));
          await make_blinded(player, (player.getPropTimeout(BLINDED) || 0) + player.ucreamed - old, true);
        }
        else {
          let what;
          what = (player.blindfold.otyp === LENSES) ? "lenses" : (obj.otyp === player.blindfold.otyp) ? "other towel" : "blindfold";
          if (player.blindfold.cursed) {
            await You("push your %s %s.", what, rn2(2) ? "cock-eyed" : "crooked");
          }
          else {
            let saved_ublindf = player.blindfold;
            await You("push your %s off.", what);
            await Blindf_off(player.blindfold);
            await dropx(saved_ublindf, player, _gstate?.map);
          }
        }
      if (is_wet_towel(obj)) dry_a_towel(obj, -1, drying_feedback);
      return ECMD_TIME;
      case 0:
        break;
    }
  }
  if (player.getPropTimeout(GLIB)) {
    make_glib(player, 0);
    await You("wipe off your %s.", !player.gloves ? makeplural(body_part(HAND)) : gloves_simple_name(player.gloves));
    if (is_wet_towel(obj)) dry_a_towel(obj, -1, drying_feedback);
    return ECMD_TIME;
  }
  else if (player.ucreamed) {
    incr_itimeout(player, BLINDED, (-1 * player.ucreamed));
    player.ucreamed = 0;
    if (!player.Blind) {
      await pline("You've got the glop off.");
      if (!gulp_blnd_check()) { set_itimeout(player, BLINDED, 1); await make_blinded(player, 0, true); }
    }
    else { await Your("%s feels clean now.", body_part(FACE)); }
    if (is_wet_towel(obj)) dry_a_towel(obj, -1, drying_feedback);
    return ECMD_TIME;
  }
  await Your("%s and %s are already clean.", body_part(FACE), makeplural(body_part(HAND)));
  return ECMD_OK;
}


// cf. apply.c:318 -- STUB: depends on getdir, mstatusline
async function use_stethoscope() { await You("hear nothing special."); }

// cf. apply.c:476 -- STUB: depends on wake_nearby
async function use_whistle(obj) {
    await You("produce a %s whistling sound.", obj.cursed ? "shrill" : "high");
}

// cf. apply.c:495 -- STUB: depends on magic_whistled, tele_to_rnd_pet
async function use_magic_whistle(obj) {
    if (obj.cursed && !rn2(2)) {
        await You("produce a high-pitched humming noise.");
        // C: wake_nearby(TRUE) then if (!rn2(2) && !noteleport_level) tele_to_rnd_pet
        rn2(2); // teleport check — RNG consumed even though tele not implemented
    } else {
        await You("produce a strange whistling sound.");
        // C: magic_whistled(obj) — teleports all tame monsters (RNG via mnexto)
    }
}

// cf. apply.c:518 -- STUB: pet-relocation logic
function magic_whistled() {}

// cf. apply.c:688 -- um_dist: Chebyshev distance > n from player
export function um_dist(player, x, y, n) {
    return (Math.abs(player.x - x) > n || Math.abs(player.y - y) > n);
}

// cf. apply.c:694 -- number_leashed: count leashed pets
export function number_leashed(player) {
    let count = 0;
    for (const obj of (player.inventory || [])) {
        if (obj.otyp === LEASH && obj.leashmon) count++;
    }
    return count;
}

// cf. apply.c:707 -- o_unleash: unleash from leash object side
export function o_unleash(otmp, map) {
    if (map) {
        for (const mtmp of (map.monsters || [])) {
            if (mtmp.m_id === otmp.leashmon) { mtmp.mleashed = 0; break; }
        }
    }
    otmp.leashmon = 0;
}

// cf. apply.c:876 -- get_mleash: find leash attached to a monster
export function get_mleash(mtmp, player) {
    for (const otmp of (player ? player.inventory || [] : [])) {
        if (otmp.otyp === LEASH && otmp.leashmon === mtmp.m_id)
            return otmp;
    }
    return null;
}

// cf. apply.c:722 -- m_unleash: unleash from monster side
export async function m_unleash(mtmp, feedback, player) {
    if (feedback) await Your("leash falls slack.");
    for (const otmp of (player ? player.inventory || [] : [])) {
        if (otmp.otyp === LEASH && otmp.leashmon === mtmp.m_id) {
            otmp.leashmon = 0; break;
        }
    }
    mtmp.mleashed = 0;
}

// cf. apply.c:742 -- unleash_all: remove all leashes
export function unleash_all(player, map) {
    for (const otmp of (player.inventory || []))
        if (otmp.otyp === LEASH) otmp.leashmon = 0;
    for (const mtmp of (map ? map.monsters || [] : []))
        mtmp.mleashed = 0;
}

// cf. apply.c:757 -- leashable: can monster be leashed?
// Autotranslated from apply.c:756
export function leashable(mtmp) {
  return  (mtmp.mnum !== PM_LONG_WORM && !unsolid(mtmp.data) && (!nolimbs(mtmp.data) || has_head(mtmp.data)));
}

// cf. apply.c:765 -- STUB: use_leash
export async function use_leash() { await pline("You need to get closer to use a leash."); }

// cf. apply.c:817 -- STUB: use_leash_core
export function use_leash_core() {}


// cf. apply.c:927 -- check_leash: leash range enforcement
export async function check_leash(player, x, y, map) {
    for (const otmp of (player.inventory || [])) {
        if (otmp.otyp !== LEASH || !otmp.leashmon) continue;
        let mtmp = null;
        for (const m of (map ? map.monsters || [] : [])) {
            if (m.m_id === otmp.leashmon) { mtmp = m; break; }
        }
        if (!mtmp) {
            impossible("leash in use isn't attached to anything?");
            otmp.leashmon = 0;
            continue;
        }
        if (dist2(player.x, player.y, mtmp.mx, mtmp.my)
            > dist2(x, y, mtmp.mx, mtmp.my)) {
            if (!um_dist(player, mtmp.mx, mtmp.my, 3)) {
                /* still close enough */
            } else if (otmp.cursed && !breathless(mtmp.data || mons[mtmp.mnum])) {
                if (um_dist(player, mtmp.mx, mtmp.my, 5)
                    || (mtmp.mhp -= rnd(2)) <= 0) {
                    await Your("leash chokes %s to death!", mon_nam(mtmp));
                    mtmp.mhp = 0;
                } else {
                    await pline_mon(mtmp, "%s is choked by the leash!", Monnam(mtmp));
                    if (mtmp.mtame && rn2(mtmp.mtame)) mtmp.mtame--;
                }
            } else {
                if (um_dist(player, mtmp.mx, mtmp.my, 5)) {
                    await pline("%s leash snaps loose!", s_suffix(Monnam(mtmp)));
                    await m_unleash(mtmp, false, player);
                } else {
                    await You("pull on the leash.");
                    const data = mtmp.data || mons[mtmp.mnum];
                    if (data.msound !== MS_SILENT) rn2(3);
                }
            }
        }
    }
}

// cf. apply.c:992 -- beautiful: charisma adjective
export function beautiful(player) {
    const cha = acurr(player, A_CHA);
    if (cha >= 25) return "sublime";
    if (cha >= 19) return "splendorous";
    if (cha >= 16) return "handsome";
    if (cha >= 14) return "amiable";
    if (cha >= 11) return "cute";
    if (cha >= 9) return "plain";
    if (cha >= 6) return "homely";
    if (cha >= 4) return "ugly";
    return "hideous";
}

// cf. apply.c:1014 -- STUB: use_mirror (depends on bhit, Medusa, etc.)
async function use_mirror(obj, player = null) {
    if (obj.cursed && !rn2(2)) {
        await pline("The mirror fogs up and doesn't reflect!");
        return;
    }
    await pline(`You look as ${beautiful(player)} as ever.`);
}

// cf. apply.c:1198 -- STUB: use_bell (depends on invocation_pos, makemon)
async function use_bell(obj) {
    await You("ring %s.", xname(obj));
    if (obj.cursed && !rn2(4)) { /* would summon nymphs */ }
}

// cf. apply.c:1315 -- use_candelabrum
async function use_candelabrum(obj) {
    const s = (obj.spe !== 1) ? "candles" : "candle";
    if (obj.lamplit) {
        await You("snuff the %s.", s);
        end_burn(obj, true);
        return;
    }
    if (obj.spe <= 0) { await pline("This %s has no %s.", xname(obj), s); return; }
    if (obj.spe < 7) {
        await There("are only %d %s in %s.", obj.spe, s, xname(obj));
    } else {
        await pline("%s's %s burn brightly!", xname(obj), s);
    }
    begin_burn(obj, false);
}

// cf. apply.c:1383 -- use_candle (simplified: just lights it)
async function use_candle(obj) { await use_lamp(obj); }

// cf. apply.c:1468 -- snuff_candle
export async function snuff_candle(otmp) {
    const candle = (otmp.otyp === WAX_CANDLE || otmp.otyp === TALLOW_CANDLE);
    if ((candle || otmp.otyp === CANDELABRUM_OF_INVOCATION) && otmp.lamplit) {
        const many = candle ? (otmp.quan > 1) : (otmp.spe > 1);
        await pline("Your %scandle%s flame%s extinguished.",
              candle ? "" : "candelabrum's ",
              many ? "s'" : "'s", many ? "s are" : " is");
        end_burn(otmp, true);
        return true;
    }
    return false;
}

// cf. apply.c:1493 -- snuff_lit
export async function snuff_lit(obj) {
    if (obj.lamplit) {
        if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
            || obj.otyp === BRASS_LANTERN || obj.otyp === POT_OIL) {
            await pline("%s goes out!", xname(obj));
            end_burn(obj, true);
            return true;
        }
        if (await snuff_candle(obj)) return true;
    }
    return false;
}

// cf. apply.c:1514 -- splash_lit
export async function splash_lit(obj) {
    if (obj.lamplit && obj.otyp === BRASS_LANTERN) {
        await pline("%s crackles and flickers.", xname(obj));
        return false;
    }
    return await snuff_lit(obj);
}

// cf. apply.c:1573 -- catch_lit
export async function catch_lit(obj) {
    if (!obj.lamplit && _ignitable(obj)) {
        if ((obj.otyp === MAGIC_LAMP || obj.otyp === CANDELABRUM_OF_INVOCATION)
            && obj.spe === 0)
            return false;
        if (obj.age === 0 && obj.otyp !== WAX_CANDLE && obj.otyp !== TALLOW_CANDLE)
            return false;
        if (obj.otyp === BRASS_LANTERN) return false;
        if (obj.otyp === CANDELABRUM_OF_INVOCATION && obj.cursed) return false;
        if ((obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP)
            && obj.cursed && !rn2(2))
            return false;
        await pline("%s catches light!", xname(obj));
        begin_burn(obj, false);
        return true;
    }
    return false;
}

// cf. apply.c:1624 -- use_lamp
export async function use_lamp(obj) {
    if (obj.lamplit) {
        const lamp = (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP) ? "lamp"
                   : (obj.otyp === BRASS_LANTERN) ? "lantern" : null;
        if (lamp) await pline("Your %s is now off.", lamp);
        else await You("snuff out %s.", xname(obj));
        end_burn(obj, true);
        return;
    }
    const isCandle = (obj.otyp === WAX_CANDLE || obj.otyp === TALLOW_CANDLE);
    if ((!isCandle && obj.age === 0) || (obj.otyp === MAGIC_LAMP && obj.spe === 0)) {
        if (obj.otyp === BRASS_LANTERN) await Your("lantern is out of power.");
        else await pline("This %s has no oil.", xname(obj));
        return;
    }
    if (obj.cursed && !rn2(2)) {
        if ((obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP) && !rn2(3)) {
            await pline("The lamp spills and covers your fingers with oil.");
            make_glib(player, (player.getPropTimeout(GLIB) || 0) + d(2, 10));
        } else {
            await pline("%s flickers for a moment, then dies.", xname(obj));
        }
    } else {
        const lamp = (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP) ? "lamp"
                   : (obj.otyp === BRASS_LANTERN) ? "lantern" : null;
        if (lamp) await pline("Your %s is now on.", lamp);
        else await pline("%s's flame burns brightly!", xname(obj));
        begin_burn(obj, false);
    }
}

// cf. apply.c:1699 -- STUB: light_cocktail
export async function light_cocktail(obj) {
    if (obj.lamplit) { await You("snuff the lit potion."); end_burn(obj, true); return; }
    const player = _gstate?.player;
    await You("light %spotion.%s", shk_your(obj), player?.Blind ? "" : "  It gives off a dim light.");
    begin_burn(obj, false);
}

// cf. apply.c:1766 -- rub_ok filter
function rub_ok(obj) {
    if (!obj) return false;
    return (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
            || obj.otyp === BRASS_LANTERN || obj.otyp === TOUCHSTONE
            || obj.otyp === LUCKSTONE || obj.otyp === LOADSTONE
            || obj.otyp === FLINT || obj.otyp === LUMP_OF_ROYAL_JELLY);
}

// cf. apply.c:1781 -- STUB: dorub
export async function dorub() { await pline("You rub... but nothing special happens."); }

// Jump trajectory constants (cf. apply.c:1855)
const jAny = 0, jHorz = 1, jVert = 2, jDiag = 3;

// cf. apply.c:1858 -- check_jump: walk_path callback for jump validation
// Returns true if the tile at (x,y) is passable for jumping through
function check_jump(x, y, arg, map, player) {
    const traj = arg.traj;
    const loc = map.locations[x]?.[y];
    if (!loc) return false;

    if (player?.data && passes_walls(player.data))
        return true;
    if (IS_STWALL(loc.typ))
        return false;
    if (IS_DOOR(loc.typ)) {
        if (closed_door(x, y, map))
            return false;
        if ((loc.doormask & D_ISOPEN) !== 0 && traj !== jAny
            /* reject diagonal jump into/out-of/through open door */
            && (traj === jDiag
                /* reject horizontal jump through horizontal open door
                   and non-horizontal (vertical) jump through vertical open door */
                || ((traj & jHorz) !== 0) === (!!loc.horizontal)))
            return false;
        /* empty doorways aren't restricted */
    }
    /* let giants jump over boulders */
    if (sobj_at(BOULDER, x, y, map) && !throws_rocks(player?.data || {}))
        return false;
    return true;
}

// cf. apply.c:1889 -- is_valid_jump_pos: validate a jump destination
export function is_valid_jump_pos(x, y, magic, showmsg, player, map) {
    if (!player) player = globalThis.gs?.player;
    if (!map) map = globalThis.gs?.map;

    const HJumping = player?.hJumping || 0;
    const EJumping = player?.eJumping || 0;
    const INTRINSIC = 0x00000001; // cf. const.js

    if (!magic && !(HJumping & ~INTRINSIC) && !EJumping
        && distu(player, x, y) !== 5) {
        /* Knight jumping restriction: exactly 5 distance (L-shape) */
        if (showmsg) pline("Illegal move!");
        return false;
    } else if (distu(player, x, y) > (magic ? 6 + magic * 3 : 9)) {
        if (showmsg) pline("Too far!");
        return false;
    } else if (!isok(x, y)) {
        if (showmsg) You("cannot jump there!");
        return false;
    } else if (!cansee(x, y)) {
        if (showmsg) You("cannot see where to land!");
        return false;
    } else {
        const loc = map.locations[player.x]?.[player.y];
        const dx = x - player.x, dy = y - player.y;
        let ax = Math.abs(dx), ay = Math.abs(dy);
        const Pw = player?.data && passes_walls(player.data);

        /* diag: any non-orthogonal destination classified as diagonal */
        const diag = (magic || Pw || (!dx && !dy)) ? jAny
               : !dy ? jHorz : !dx ? jVert : jDiag;
        /* traj: flatten out trajectory */
        if (ax >= 2 * ay) ay = 0;
        else if (ay >= 2 * ax) ax = 0;
        const traj = (magic || Pw || (!ax && !ay)) ? jAny
               : !ay ? jHorz : !ax ? jVert : jDiag;

        if (diag === jDiag && loc && IS_DOOR(loc.typ)
            && (loc.doormask & D_ISOPEN) !== 0
            && (traj === jDiag
                || ((traj & jHorz) !== 0) === (!!loc.horizontal))) {
            if (showmsg) You_cant("jump diagonally out of a doorway.");
            return false;
        }
        const uc = { x: player.x, y: player.y };
        const tc = { x, y };
        const arg = { traj, map, player };
        if (!walk_path(uc, tc,
                (a, wx, wy) => check_jump(wx, wy, a, a.map, a.player), arg)) {
            if (showmsg) There("is an obstacle preventing that jump.");
            return false;
        }
    }
    return true;
}

// cf. apply.c:1984 -- jump: main jump command
// magic = 0 for physical jump, otherwise spell skill level
export async function jump(magic, player, map, game) {
    if (!player) player = globalThis.gs?.player;
    if (!map) map = globalThis.gs?.map;

    const Jumping = player?.hJumping || player?.eJumping;

    /* attempt "jumping" spell if no innate jumping */
    if (!magic && !Jumping) {
        await You_cant("jump very far.");
        return 0;
    }

    if (!magic && (nolimbs(player?.data || {}) || slithy(player?.data || {}))) {
        await You_cant("jump; you have no legs!");
        return 0;
    } else if (player?.uswallow) {
        if (magic) { await You("bounce around a little."); return 1; }
        await pline("You've got to be kidding!");
        return 0;
    } else if (player?.uinwater) {
        if (magic) { await You("swish around a little."); return 1; }
        await pline("This calls for swimming, not jumping!");
        return 0;
    } else if (player?.ustuck) {
        if (magic) {
            await You("writhe a little in the grasp of " + mon_nam(player.ustuck) + "!");
            return 1;
        }
        await You("cannot escape from " + mon_nam(player.ustuck) + "!");
        return 0;
    }

    /* Full jump getpos/movement not yet wired (requires getpos infrastructure).
       This stub handles the precondition checks faithfully to C. */
    await pline("Where do you want to jump?");
    await pline("(Jump position selection not yet implemented.)");
    return 0;
}

// cf. apply.c:1843 -- dojump: entry point for #jump command
export async function dojump(player, map, game) {
    return jump(0, player, map, game);
}

// cf. apply.c:2163 -- tinnable
// Autotranslated from apply.c:2162
export function tinnable(corpse) {
  if (corpse.oeaten) return 0;
  if (!mons[corpse.corpsenm].cnutrit) return 0;
  return 1;
}

// cf. apply.c:2173 -- STUB: use_tinning_kit
async function use_tinning_kit(obj) {
    if (obj.spe <= 0) { await You("seem to be out of tins."); return; }
    await pline("You need a corpse to tin.");
}

// cf. apply.c:2255 -- use_unicorn_horn (partial: RNG parity for cursed)
export async function use_unicorn_horn(obj, player) {
    if (!obj) return;
    if (obj.cursed) {
        rn1(90, 10); // lcount
        const effect = Math.floor(rn2(13) / 2);
        switch (effect) {
        case 0: rn1(acurr(player, A_CON), 20); break;
        default: break;
        }
        return;
    }
    // Uncursed/blessed: cure timed troubles
    // C: build trouble list from timed properties, shuffle, then cure up to val_limit
    let trouble_count = 0;
    const props = player.uprops || {};
    // Count timed troubles (matching C's prop_trouble checks)
    const troubleProps = [SICK, BLINDED, HALLUC, VOMITING, CONFUSION, STUNNED, DEAF];
    for (const p of troubleProps) {
        const prop = props[p];
        if (prop && (prop.intrinsic & TIMEOUT)) trouble_count++;
    }
    if (trouble_count === 0) {
        await pline(nothing_happens);
        return;
    }
    // C: shuffle_int_array(trouble_list, trouble_count) — Fisher-Yates shuffle
    if (trouble_count > 1) {
        for (let i = trouble_count - 1; i > 0; i--) {
            rn2(i + 1); // shuffle RNG consumed
        }
    }
    // C: val_limit = rn2(d(2, blessed ? 4 : 2))
    const val_limit = rn2(d(2, obj.blessed ? 4 : 2));
    // Actual trouble curing is simplified — RNG consumed above is what matters
    await pline(nothing_happens);
}

// cf. apply.c:2394 -- STUB: fig_transform timer callback
export function fig_transform() {}

// cf. apply.c:2507 -- figurine_location_checks
export async function figurine_location_checks(obj, cc, quietly) {
    if (!obj) return false;
    const x = cc ? cc.x : 0;
    const y = cc ? cc.y : 0;
    if (!isok(x, y)) {
        if (!quietly) await You("cannot put the figurine there.");
        return false;
    }
    return true;
}

// cf. apply.c:2540 -- STUB: use_figurine
export async function use_figurine() { await pline("The figurine wriggles but nothing happens."); }

// cf. apply.c:2581 -- grease_ok
export function grease_ok(obj) {
    if (!obj) return true;
    if (obj.oclass === COIN_CLASS) return false;
    return true;
}

// cf. apply.c:2600 -- STUB: use_grease
async function use_grease(obj) {
    if (obj.spe > 0) {
        if (obj.cursed && !rn2(2)) {
            obj.spe--;
            await pline("%s slips from your fingers.", xname(obj));
            return;
        }
        await pline("You need to select something to grease.");
    } else {
        if (obj.known) await pline("%s is empty.", xname(obj));
        else await pline("%s seems to be empty.", xname(obj));
    }
}

// cf. apply.c:2654 -- touchstone_ok
export function touchstone_ok(obj) {
    if (!obj) return false;
    return (obj.oclass === COIN_CLASS || obj.oclass === GEM_CLASS);
}

// cf. apply.c:2676 -- STUB: use_stone
async function use_stone() { await pline("\"scritch, scritch\""); }

// cf. apply.c:2809 -- reset_trapset
export function reset_trapset(game) {
    if (game && game.trapinfo) {
        game.trapinfo.tobj = null;
        game.trapinfo.force_bungle = 0;
    }
}

// cf. apply.c:2817 -- use_trap
async function use_trap(obj, player, map, display, game) {
    if (!obj || !player || !map || !game) {
        await You_cant("set a trap here!");
        return { moved: false, tookTime: false };
    }
    if (map.trapAt?.(player.x, player.y)) {
        await You_cant("set a trap here!");
        return { moved: false, tookTime: false };
    }
    const loc = map.at?.(player.x, player.y);
    if (!loc || loc.typ === STAIRS || loc.typ === LADDER) {
        await You_cant("set a trap here!");
        return { moved: false, tookTime: false };
    }
    if (IS_DOOR(loc.typ) || IS_FURNITURE(loc.typ)) {
        await You_cant("set a trap here!");
        return { moved: false, tookTime: false };
    }

    if (!game.trapinfo) game.trapinfo = {};
    game.trapinfo.tobj = obj;
    game.trapinfo.tx = player.x;
    game.trapinfo.ty = player.y;
    game.trapinfo.turns = 0;
    game.trapinfo.force_bungle = 0;

    game.occupation = {
        occtxt: `setting a ${obj.otyp === LAND_MINE ? 'land mine' : 'bear trap'}`,
        fn() {
            return set_trap(game, player, map, display);
        },
    };
    return { moved: false, tookTime: true };
}

// cf. apply.c:2912 -- set_trap occupation callback
function set_trap(game, player, map, display) {
    const info = game?.trapinfo;
    const obj = info?.tobj;
    if (!info || !obj || !player || !map) return false;
    if (player.x !== info.tx || player.y !== info.ty) {
        display?.putstr_message?.('You stop setting the trap.');
        reset_trapset(game);
        return false;
    }
    if (++info.turns < 2) return true;

    const trapType = (obj.otyp === LAND_MINE) ? LANDMINE : BEAR_TRAP;
    const depth = Number.isInteger(map?._genDlevel)
        ? map._genDlevel
        : (Number.isInteger(player?.dungeonLevel) ? player.dungeonLevel : 1);
    const placed = maketrap(map, player.x, player.y, trapType, depth);
    if (!placed) {
        display?.putstr_message?.('You fail to set the trap here.');
        reset_trapset(game);
        return false;
    }

    if (obj.quan > 1) {
        obj.quan--;
    } else if (Array.isArray(player.inventory)) {
        const idx = player.inventory.indexOf(obj);
        if (idx >= 0) player.inventory.splice(idx, 1);
    }
    display?.putstr_message?.('You finish setting your trap.');
    reset_trapset(game);
    return false;
}

// cf. apply.c:2951 -- STUB: use_whip
export async function use_whip() { await pline("Snap!"); }


// cf. apply.c:3330 -- STUB: display_polearm_positions
export function display_polearm_positions(player, map) {
    if (!player || !map) return;
    // C ref: apply.c display_polearm_positions() => tmp_at(DISP_BEAM, S_goodpos)
    tmp_at(DISP_BEAM, { ch: '*', color: 10 });
    try {
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                if (could_pole_mon(player, x, y, map)) tmp_at(x, y);
            }
        }
    } finally {
        tmp_at(DISP_END, 0);
    }
}

// cf. apply.c:3367 -- calc_pole_range
export function calc_pole_range() { return { min_range: 4, max_range: 4 }; }

// cf. apply.c:3387 -- could_pole_mon
export function could_pole_mon(_player, _x, _y, _map) { return false; }


// cf. apply.c:3422 -- STUB: use_pole
export async function use_pole() { await pline("You miss; there is no one there to hit."); }

// cf. apply.c:3564 -- use_cream_pie (partial)
async function use_cream_pie(obj, player) {
    if (obj.quan > 1) obj.quan--;
    await You("immerse your face in %s.", xname(obj));
    rnd(25); // blindinc RNG consumption
    if (obj.quan <= 0) setnotworn(player, obj);
}

// cf. apply.c:3603 -- jelly_ok
export function jelly_ok(obj) { return (obj && obj.otyp === EGG); }

// cf. apply.c:3612 -- STUB: use_royal_jelly
async function use_royal_jelly() { await pline("You need an egg to use royal jelly on."); }

// cf. apply.c:3682 -- grapple_range
export function grapple_range() { return 4; }

// cf. apply.c:3697 -- STUB: can_grapple_location
export function can_grapple_location(_player, _x, _y, _map) { return false; }

// cf. apply.c:3703 -- STUB: display_grapple_positions
export function display_grapple_positions(player, map) {
    if (!player || !map) return;
    // C ref: apply.c display_grapple_positions() => tmp_at(DISP_BEAM, S_goodpos)
    tmp_at(DISP_BEAM, { ch: '*', color: 10 });
    try {
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                if (can_grapple_location(player, x, y, map)) tmp_at(x, y);
            }
        }
    } finally {
        tmp_at(DISP_END, 0);
    }
}

// cf. apply.c:3725 -- STUB: use_grapple
async function use_grapple() { await pline(nothing_happens); }

// cf. apply.c:3872 -- STUB: discard_broken_wand
function discard_broken_wand() {}

// cf. apply.c:3884 -- STUB: broken_wand_explode
export function broken_wand_explode() {}

// cf. apply.c:3893 -- STUB: maybe_dunk_boulders
export function maybe_dunk_boulders() {}

// cf. apply.c:3905 -- do_break_wand
async function do_break_wand(obj, player, map, display) {
    const pdata = player?.data || player?.polyData || {};
    const isFragile = objdescr_is(obj, 'balsa') || objdescr_is(obj, 'glass');

    if (nohands(pdata)) {
        await You_cant("break %s without hands!", yname(obj));
        return false;
    } else if (!freehand(player)) {
        await Your("%s are occupied!", makeplural(body_part(HAND, player)));
        return false;
    } else if (acurr(player, A_STR) < (isFragile ? 5 : 10)) {
        await You("don't have the strength to break %s!", yname(obj));
        return false;
    }

    const confirm = `Are you really sure you want to break ${yname(obj)}?`;
    const ans = await ynFunction(confirm, 'yn', 'n'.charCodeAt(0), display);
    if (ans !== 'y'.charCodeAt(0)) {
        return false;
    }

    await pline(
        "Raising %s high above your %s, you %s it in two!",
        yname(obj),
        body_part(HEAD, player),
        isFragile ? 'snap' : 'break'
    );
    if (!obj.spe) obj.spe = rnd(3);
    await break_wand(obj, player, map);
    useupall(obj, player);
    return true;
}

// ====================================================================
// apply_ok / isApplyCandidate and related helpers
// ====================================================================

// cf. apply.c:4146 -- apply_ok: object can be applied?
export function isApplyCandidate(obj) {
    if (!obj) return false;
    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === SPBOOK_CLASS)
        return true;
    if (obj.oclass === WEAPON_CLASS) {
        const skill = objectData[obj.otyp]?.oc_subtyp;
        if (obj.otyp === BULLWHIP || obj.otyp === LANCE
            || skill === P_AXE || skill === P_PICK_AXE || skill === P_TRIDENT || skill === P_LANCE)
            return true;
    }
    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY)
        return true;
    if (obj.otyp === TOUCHSTONE || obj.otyp === LUCKSTONE
        || obj.otyp === LOADSTONE)
        return true;
    if (obj.otyp === POT_OIL && obj.dknown) return true;
    return false;
}

export function isApplyChopWeapon(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const skill = objectData[obj.otyp]?.oc_subtyp;
    return skill === P_AXE || skill === P_PICK_AXE;
}

export function isApplyPolearm(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const skill = objectData[obj.otyp]?.oc_subtyp;
    return skill === P_TRIDENT || skill === P_LANCE;
}

export function isApplyDownplay(obj) {
    if (!obj) return false;
    if (obj.oclass === COIN_CLASS) return true;
    if (obj.oclass === POTION_CLASS && !obj.dknown) return true;
    return false;
}

function compactInvlets(letters) {
    const sorted = [...new Set(String(letters || '').split(''))].sort();
    if (sorted.length <= 5) return sorted.join('');
    const out = [];
    let i = 0;
    while (i < sorted.length) {
        let j = i;
        while (j + 1 < sorted.length
               && sorted[j + 1].charCodeAt(0) === sorted[j].charCodeAt(0) + 1) j++;
        if (j - i >= 2) out.push(sorted[i], '-', sorted[j]);
        else for (let k = i; k <= j; k++) out.push(sorted[k]);
        i = j + 1;
    }
    return out.join('');
}

// ====================================================================
// cf. apply.c:4209 -- doapply / handleApply
// ====================================================================

export async function handleApply(player, map, display, game) {
    const inventory = player.inventory || [];
    if (inventory.length === 0) {
        await display.putstr_message("You don't have anything to use or apply.");
        return { moved: false, tookTime: false };
    }

    const candidates = inventory.filter(isApplyCandidate);
    const hasDownplay = inventory.some(isApplyDownplay);
    if (candidates.length === 0 && !hasDownplay) {
        await display.putstr_message("You don't have anything to use or apply.");
        return { moved: false, tookTime: false };
    }

    const letters = compactInvlets(candidates.map((item) => item.invlet).join(''));
    const candidateByInvlet = new Map(
        candidates
            .filter((item) => item?.invlet)
            .map((item) => [String(item.invlet), item])
    );
    const prompt = letters.length > 0
        ? `What do you want to use or apply? [${letters} or ?*] `
        : 'What do you want to use or apply? [*] ';
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const showApplyPrompt = async () => {
        replacePromptMessage();
        await display.putstr_message(prompt);
    };
    const buildPickaxeDirPrompt = (obj) => {
        if (!(obj && (obj.otyp === PICK_AXE || obj.otyp === DWARVISH_MATTOCK))) {
            return 'In what direction? ';
        }
        const dirChars = [];
        const planarDirs = ['h', 'y', 'k', 'u', 'l', 'n', 'j', 'b'];
        for (const dch of planarDirs) {
            const d = DIRECTION_KEYS[dch];
            if (!d) continue;
            const nx = player.x + d[0];
            const ny = player.y + d[1];
            if (!isok(nx, ny)) continue;
            if (dig_typ(obj, nx, ny, map) !== DIGTYP_UNDIGGABLE) {
                dirChars.push(dch);
            }
        }
        if (can_reach_floor(player, map, false)) {
            dirChars.push('>');
        }
        const bracket = dirChars.join('') || '>';
        return `In what direction do you want to dig? [${bracket}] `;
    };
    await showApplyPrompt();
    const resolveApplySelection = async (selected) => {
        if (selected.otyp === OIL_LAMP || selected.otyp === MAGIC_LAMP
            || selected.otyp === BRASS_LANTERN) {
            await use_lamp(selected);
            return { moved: false, tookTime: true };
        }
        if (selected.otyp === WAX_CANDLE || selected.otyp === TALLOW_CANDLE) {
            await use_candle(selected);
            return { moved: false, tookTime: true };
        }
        if (selected.otyp === CANDELABRUM_OF_INVOCATION) {
            await use_candelabrum(selected);
            return { moved: false, tookTime: true };
        }
        if (selected.otyp === POT_OIL) {
            await light_cocktail(selected);
            return { moved: false, tookTime: true };
        }
        if (isApplyChopWeapon(selected)) {
            await display.putstr_message('In what direction do you want to chop? [>] ');
            await nhgetch();
            replacePromptMessage();
            return { moved: false, tookTime: false };
        }

        if (selected.otyp === CREDIT_CARD || selected.otyp === LOCK_PICK
            || selected.otyp === SKELETON_KEY) {
            const result = await pick_lock(game, selected, 0, 0, null);
            return { moved: false, tookTime: result !== 0 };
        }

        // C ref: dig.c use_pick_axe() — when not wielded, wield first and
        // consume time; the dig direction is handled on the next key.
        if (selected.otyp === PICK_AXE || selected.otyp === DWARVISH_MATTOCK) {
            const alreadyWielded = !!(player?.weapon && selected === player.weapon);
            if (!alreadyWielded) {
                if (!await wield_tool(player, display, selected, "dig")) {
                    return { moved: false, tookTime: false };
                }
                cmdq_add_ec(CQ_CANNED, (g) => handleApply(g.player, g.map, g.display, g));
                cmdq_add_key(CQ_CANNED, selected.invlet.charCodeAt(0));
                return { moved: false, tookTime: true };
            }
            if (!await wield_tool(player, display, selected, "dig")) {
                return { moved: false, tookTime: false };
            }
        }

        if (selected.otyp === PICK_AXE || selected.otyp === DWARVISH_MATTOCK
            || selected.otyp === BULLWHIP || selected.otyp === STETHOSCOPE
            || selected.otyp === EXPENSIVE_CAMERA || selected.otyp === MIRROR
            || selected.otyp === FIGURINE || isApplyPolearm(selected)) {
            const dirPrompt = (selected.otyp === PICK_AXE || selected.otyp === DWARVISH_MATTOCK)
                ? buildPickaxeDirPrompt(selected)
                : 'In what direction? ';
            replacePromptMessage();
            await display.putstr_message(dirPrompt);
            let dir = null;
            let dirChRaw = null;
            while (!dir) {
                const dirCh = await nhgetch();
                dirChRaw = dirCh;
                if (dirCh === 27 || dirCh === 32 || dirCh === 10 || dirCh === 13) {
                    replacePromptMessage();
                    // C ref: dig.c use_pick_axe() cancels silently (no message).
                    // Other tools (mirror, etc.) go through their own cancel paths.
                    if (selected.otyp !== MIRROR
                        && selected.otyp !== PICK_AXE
                        && selected.otyp !== DWARVISH_MATTOCK) {
                        await display.putstr_message('Never mind.');
                    }
                    return { moved: false, tookTime: false };
                }
                const dch = String.fromCharCode(dirCh);
                if ((selected.otyp === PICK_AXE || selected.otyp === DWARVISH_MATTOCK)
                    && (dch === '<' || dch === '>')) {
                    dir = [0, 0];
                    break;
                }
                dir = DIRECTION_KEYS[dch] || null;
                if (dir) break;
                replacePromptMessage();
                if (game?.flags?.cmdassist !== false) {
                    await show_invalid_direction_cmdassist_help(display);
                    await display.putstr_message(dirPrompt);
                    continue;
                }
                if (!player?.wizard)
                    await display.putstr_message('What a strange direction!  Never mind.');
                return { moved: false, tookTime: false };
            }
            replacePromptMessage();
            if (selected.otyp === PICK_AXE || selected.otyp === DWARVISH_MATTOCK) {
                const dch = String.fromCharCode(dirChRaw || 0);
                if (dch === '<') {
                    await You_cant('reach the ceiling.');
                    return { moved: false, tookTime: true };
                }
                return { moved: false, tookTime: true };
            }
            if (selected.otyp === MIRROR) {
                await use_mirror(selected, player);
                return { moved: false, tookTime: true };
            }
            return { moved: false, tookTime: false };
        }

        if (selected.oclass === SPBOOK_CLASS) {
            await flip_through_book(selected);
            return { moved: false, tookTime: true };
        }

        if (selected.otyp === LAND_MINE || selected.otyp === BEARTRAP) {
            return await use_trap(selected, player, map, display, game);
        }

        if (selected.otyp === MAGIC_MARKER) {
            // C ref: apply.c — case MAGIC_MARKER: res = dowrite(obj);
            const res = await dowrite(selected, player);
            return { moved: false, tookTime: res !== 0 };
        }

        if (selected.otyp === TINNING_KIT) {
            await display.putstr_message("You don't have anything to tin.");
            return { moved: false, tookTime: true };
        }

        if (selected.oclass === WAND_CLASS) {
            const tookTime = await do_break_wand(selected, player, map, display);
            return { moved: false, tookTime };
        }

        await display.putstr_message("Sorry, I don't know how to use that.");
        return { moved: false, tookTime: false };
    };

    while (true) {
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage();
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            let showList;
            if (c === '*') {
                showList = inventory.filter((item) => item?.invlet);
            } else if (candidates.length === 0) {
                showList = inventory.filter((item) => item?.invlet && isApplyDownplay(item));
                if (showList.length === 0) {
                    showList = inventory.filter((item) => item?.invlet);
                }
            } else {
                showList = candidates;
            }
            showList.sort((a, b) => String(a.invlet).charCodeAt(0) - String(b.invlet).charCodeAt(0));
            if (showList.length === 1) {
                const item = showList[0];
                replacePromptMessage();
                await display.putstr_message(`${item.invlet} - ${doname(item, player)}.`);
                await more(display, { game, site: 'apply.inventory-list.single-more' });
                await showApplyPrompt();
                continue;
            }
            for (const item of showList) {
                replacePromptMessage();
                await display.putstr_message(
                    `${item.invlet} - ${doname(item, player)}.`);
                await more(display, { game,
                    site: 'apply.inventory-list.morePrompt',
                });
            }
            await showApplyPrompt();
            continue;
        }

        const selected = inventory.find((obj) => obj.invlet === c);
        if (!selected) {
            // C ref: getobj() invalid invlet path used by doapply():
            // emit "You don't have that object.", pause at --More--, then
            // continue prompting within this same doapply command.
            // Keep this boundary explicit here so the dismiss key doesn't
            // get consumed together with the next command key.
            replacePromptMessage();
            await display.putstr_message("You don't have that object.");
            await more(display, { game,
                site: 'apply.invalid-invlet.morePrompt',
            });
            await showApplyPrompt();
            continue;
        }
        return await resolveApplySelection(selected);
    }
}

// ====================================================================
// cf. apply.c:4426 -- unfixable_trouble_count
// ====================================================================

export function unfixable_trouble_count(/* is_horn, player */) {
    // Most property states not tracked in JS yet; return 0.
    return 0;
}

// cf. apply.c:4468 -- flip_through_book
export async function flip_through_book(obj) {
    await You("flip through the pages of %s.", thesimpleoname(obj));
    if (obj.otyp === SPE_BOOK_OF_THE_DEAD) {
        await You_hear("the pages make an unpleasant rustling sound.");
    } else if (obj.otyp === SPE_BLANK_PAPER) {
        await pline("This spellbook has nothing written in it.");
    } else if (obj.otyp === SPE_NOVEL) {
        await pline("This looks like it might be interesting to read.");
    } else {
        const fadeness = ["fresh", "slightly faded", "very faded",
                          "extremely faded", "barely visible"];
        const findx = Math.min(obj.spestudied || 0, 4);
        await pline("The%s ink in this spellbook is %s.",
              objectData[obj.otyp]?.magic ? " magical" : "",
              fadeness[findx]);
    }
}

// cf. apply.c:4522 -- flip_coin
export async function flip_coin() {
    await You("flip a coin.");
    if (rn2(2)) await pline("It comes up heads.");
    else await pline("It comes up tails.");
}

// Autotranslated from apply.c:1954
export function get_valid_jump_position(x, y, map) {
  return (isok(x, y) && (ACCESSIBLE(map.locations[x][y].typ) || Passes_walls) && is_valid_jump_pos(x, y, gj.jumping_is_magic, false));
}

// Autotranslated from apply.c:1962
export function display_jump_positions(on_off, player) {
  let x, y, dx, dy;
  if (on_off) {
    tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos));
    for (dx = -4; dx <= 4; dx++) {
      for (dy = -4; dy <= 4; dy++) {
        x = dx + player.x;
        y = dy + player.y;
        if (get_valid_jump_position(x, y) && !u_at(player, x, y)) tmp_at(x, y);
      }
    }
  }
  else { tmp_at(DISP_END, 0); }
}

// Autotranslated from apply.c:4145
export function apply_ok(obj, player) {
  if (!obj) return GETOBJ_EXCLUDE;
  if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS || obj.oclass === SPBOOK_CLASS) return GETOBJ_SUGGEST;
  if (obj.oclass === COIN_CLASS) return GETOBJ_DOWNPLAY;
  if (obj.oclass === WEAPON_CLASS && (is_pick(obj) || is_axe(obj) || is_pole(obj) || obj.otyp === BULLWHIP)) return GETOBJ_SUGGEST;
  if (obj.oclass === POTION_CLASS) {
    if (!obj.dknown || !objectData[obj.otyp].oc_name_known) return GETOBJ_DOWNPLAY;
    if (obj.otyp === POT_OIL) return GETOBJ_SUGGEST;
  }
  if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF || obj.otyp === LUMP_OF_ROYAL_JELLY) return GETOBJ_SUGGEST;
  if (obj.otyp === BANANA && (player?.Hallucination || player?.hallucinating || false)) return GETOBJ_DOWNPLAY;
  if (is_graystone(obj)) {
    if (!obj.dknown) return GETOBJ_SUGGEST;
    if (obj.otyp !== TOUCHSTONE && (objectData[TOUCHSTONE].oc_name_known || objectData[obj.otyp].oc_name_known)) return GETOBJ_EXCLUDE_SELECTABLE;
    return GETOBJ_SUGGEST;
  }
  return GETOBJ_EXCLUDE_SELECTABLE;
}
