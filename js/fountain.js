import { rn2, rnd, rn1 } from './rng.js';
import { FOUNTAIN, SINK, ROOM, POOL, A_STR, A_DEX, A_CON, A_WIS, A_LAWFUL,
         isok } from './const.js';
import { COIN_CLASS, RING_CLASS, POTION_CLASS, LONG_SWORD, BOULDER,
         DILITHIUM_CRYSTAL, LUCKSTONE,
         POT_POLYMORPH, POT_OIL, POT_ACID, POT_LEVITATION,
         POT_OBJECT_DETECTION, POT_GAIN_LEVEL, POT_GAIN_ENERGY,
         POT_MONSTER_DETECTION, POT_FRUIT_JUICE, POT_WATER } from './objects.js';
import { pline, You, Your, You_feel, You_hear, You_see, pline_The,
         verbalize } from './pline.js';
import { exercise } from './attrib_exercise.js';
import { adjattrib, poison_strdmg, acurr } from './attrib.js';
import { makemon } from './makemon.js';
import { mons, PM_WATER_MOCCASIN, PM_WATER_DEMON, PM_WATER_NYMPH,
         PM_WATER_ELEMENTAL, PM_SEWER_RAT, PM_KNIGHT } from './monsters.js';
import { mksobj, mkobj, bless, curse, uncurse, xname } from './mkobj.js';
import { rnd_class } from './objnam.js';
import { newsym, mark_vision_dirty } from './display.js';
import { cansee, couldsee, do_clear_area } from './vision.js';
import { distmin } from './hacklib.js';
import { losehp } from './hack.js';
import { sobj_at, useup } from './invent.js';
import { water_damage, water_damage_chain } from './trap.js';
import { ER_NOTHING, ER_DESTROYED, ER_GREASED } from './const.js';
import { del_engr_at } from './engrave.js';
import { minliquid } from './mon.js';
import { hliquid, hcolor, a_monnam, Amonnam, rndmonnam } from './do_name.js';
import { body_part } from './polyself.js';
import { ARM, HAND, FACE, HEAD } from './const.js';
import { is_watch, nolimbs } from './mondata.js';
import { polymorph_sink } from './do.js';
import { ART_EXCALIBUR } from './artifacts.js';
import { artiname, exist_artifact, discover_artifact } from './artifact.js';
import { somegold } from './steal.js';
import { IS_FOUNTAIN } from './const.js';

// fountain.js -- Fountain and sink effects: quaff, dip, wash
// cf. fountain.c -- floating_above, dowatersnakes, dowaterdemon, dowaternymph,
//                   dogushforth, gush, dofindgem, watchman_warn_fountain,
//                   dryup, drinkfountain, dipfountain, wash_hands,
//                   breaksink, drinksink, dipsink, sink_backs_up

// Fountain looted/warned flags (rm.h:243-250)
const F_LOOTED = 1;
const F_WARNED = 2;
// Sink looted flags (rm.h:262-264)
const S_LPUDDING = 1;
const S_LDWASHER = 2;
const S_LRING = 4;

const A_MAX = 6;
const MM_NOMSG = 0x00020000;
const DOOR = 23;

function FOUNTAIN_IS_WARNED(loc) { return (loc.looted || 0) & F_WARNED; }
function FOUNTAIN_IS_LOOTED(loc) { return (loc.looted || 0) & F_LOOTED; }
function SET_FOUNTAIN_WARNED(loc) { loc.looted = (loc.looted || 0) | F_WARNED; }
function SET_FOUNTAIN_LOOTED(loc) { loc.looted = (loc.looted || 0) | F_LOOTED; }
function CLEAR_FOUNTAIN_LOOTED(loc) { loc.looted = (loc.looted || 0) & ~F_LOOTED; }

// cf. fountain.c:21 -- floating_above(what): levitation message
export async function floating_above(player, what) {
    if (player.utrap && (player.utraptype === 'infloor' || player.utraptype === 'lava')) {
        await You("are trapped in the %s.", what);
    } else {
        await You("are floating high above the %s.", what);
    }
}

// cf. fountain.c:38 [static] -- dowatersnakes(): fountain spawns snakes
async function dowatersnakes(player, map, display) {
    let num = rn1(5, 2);

    // mvitals not tracked in JS -- always allow spawning
    if (!player.blind) {
        const snakestr = player.hallucinating ? (rndmonnam() + "s") : "snakes";
        await pline("An endless stream of %s pours forth!", snakestr);
    } else {
        await You_hear("%s hissing!", "something");
    }
    while (num-- > 0) {
        const mtmp = makemon(PM_WATER_MOCCASIN, player.x, player.y,
                             MM_NOMSG, map.depth || 1, map);
        if (mtmp) {
            const trap = map.trapAt ? map.trapAt(mtmp.mx, mtmp.my) : null;
            if (trap) {
                // mintrap(mtmp) -- trap interaction not fully ported
            }
        }
    }
}

// cf. fountain.c:64 [static] -- dowaterdemon(): fountain spawns demon or wish
export async function dowaterdemon(player, map, display) {
    // mvitals not tracked in JS -- always allow spawning
    const mtmp = makemon(PM_WATER_DEMON, player.x, player.y,
                         MM_NOMSG, map.depth || 1, map);
    if (mtmp) {
        if (!player.blind)
            await You("unleash %s!", a_monnam(mtmp));
        else
            await You_feel("the presence of evil.");

        // Give those on low levels a (slightly) better chance of survival
        const depth = map.depth || 1;
        if (rnd(100) > (80 + depth)) {
            await pline("Grateful for %s release, %s grants you a wish!",
                  mtmp.female ? "her" : "his",
                  mtmp.female ? "she" : "he");
            // mongrantswish(&mtmp) -- wish granting not yet ported
        } else {
            const trap = map.trapAt ? map.trapAt(mtmp.mx, mtmp.my) : null;
            if (trap) {
                // mintrap(mtmp) -- trap interaction
            }
        }
    } else {
        await pline_The("fountain bubbles furiously for a moment, then calms.");
    }
}

// cf. fountain.c:94 [static] -- dowaternymph(): fountain spawns nymph
export async function dowaternymph(player, map, display) {
    const mtmp = makemon(PM_WATER_NYMPH, player.x, player.y,
                         MM_NOMSG, map.depth || 1, map);
    if (mtmp) {
        if (!player.blind)
            await You("attract %s!", a_monnam(mtmp));
        else
            await You_hear("a seductive voice.");
        mtmp.msleeping = 0;
        mtmp.sleeping = false;
        const trap = map.trapAt ? map.trapAt(mtmp.mx, mtmp.my) : null;
        if (trap) {
            // mintrap(mtmp) -- trap interaction
        }
    } else if (!player.blind) {
        await pline("A large bubble rises to the surface and pops.");
    } else {
        await You_hear("a loud pop.");
    }
}

// Helper: check if location is next to a door
function nexttodoor(x, y, map) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (!isok(nx, ny)) continue;
            const loc = map.at(nx, ny);
            if (loc && loc.typ === DOOR) return true;
        }
    }
    return false;
}

// cf. fountain.c:120 -- dogushforth(drinking): fountain gushes
// Autotranslated from fountain.c:119
export async function dogushforth(drinking, player) {
  let madepool = 0;
  await do_clear_area(player.x, player.y, 7, gush, madepool);
  if (!madepool) {
    if (drinking) await Your("thirst is quenched.");
    else {
      await pline("Water sprays all over yoplayer.");
    }
  }
}

// cf. fountain.c:134 [static] -- gush(x, y, poolcnt): place pool at location
async function gush(x, y, poolcnt, player, map, display, fov) {
    if (((x + y) % 2) || (x === player.x && y === player.y)
        || (rn2(1 + distmin(player.x, player.y, x, y)))
        || !map.at(x, y) || (map.at(x, y).typ !== ROOM)
        || (sobj_at(BOULDER, x, y, map))
        || nexttodoor(x, y, map))
        return;

    // Check for traps -- delfloortrap not fully ported
    const trap = map.trapAt ? map.trapAt(x, y) : null;
    if (trap) return; // simplified: skip if trap present

    if (!(poolcnt.count++))
        await pline("Water gushes forth from the overflowing fountain!");

    // Put a pool at x, y
    const loc = map.at(x, y);
    loc.typ = POOL;
    loc.flags = 0;
    del_engr_at(map, x, y);
    // water_damage_chain for floor objects
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    if (objs) {
        for (const obj of objs) {
            water_damage(obj, null, true);
        }
    }

    const mtmp = map.monsterAt ? map.monsterAt(x, y) : null;
    if (mtmp)
        await minliquid(mtmp, map, player);
    else
        newsym(x, y);
}

// cf. fountain.c:165 [static] -- dofindgem(): gem in fountain
export async function dofindgem(player, map, display) {
    if (!player.blind)
        await You("spot a gem in the sparkling waters!");
    else
        await You_feel("a gem here!");
    // cf. fountain.c:171 — mksobj_at(rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1), ...)
    const gemtype = rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1);
    const gem = mksobj(gemtype, false, false);
    if (gem && map.addObject) {
        gem.ox = player.x;
        gem.oy = player.y;
        map.addObject(gem);
    }
    const loc = map.at(player.x, player.y);
    if (loc) SET_FOUNTAIN_LOOTED(loc);
    newsym(player.x, player.y);
    await exercise(player, A_WIS, true); // a discovery!
}

// cf. fountain.c:179 [static] -- watchman_warn_fountain(mtmp): guard fountain warning
export async function watchman_warn_fountain(mtmp, player, fov) {
    if (is_watch(mtmp.data || mons[mtmp.mnum])
        && couldsee(null, player, mtmp.mx, mtmp.my)
        && mtmp.mpeaceful) {
        if (!player.deaf) {
            await pline("%s yells:", Amonnam(mtmp));
            await verbalize("Hey, stop using that fountain!");
        } else {
            await pline("%s earnestly %s %s %s!",
                  Amonnam(mtmp),
                  nolimbs(mtmp.data || mons[mtmp.mnum]) ? "shakes" : "waves",
                  mtmp.female ? "her" : "his",
                  nolimbs(mtmp.data || mons[mtmp.mnum])
                  ? "head"
                  : "arms");
        }
        return true;
    }
    return false;
}

// cf. fountain.c:201 -- dryup(x, y, isyou): dry up fountain or sink
export async function dryup(x, y, isyou, player, map, display, fov) {
    const loc = map.at(x, y);
    if (!loc || loc.typ !== FOUNTAIN) return;

    if (!rn2(3) || FOUNTAIN_IS_WARNED(loc)) {
        if (isyou && map.inTown && map.inTown(x, y) && !FOUNTAIN_IS_WARNED(loc)) {
            SET_FOUNTAIN_WARNED(loc);
            // Warn about future fountain use
            let warned = false;
            for (const mtmp of (map.monsters || [])) {
                if (mtmp.dead) continue;
                if (await watchman_warn_fountain(mtmp, player, fov)) {
                    warned = true;
                    break;
                }
            }
            if (!warned)
                await pline_The("flow reduces to a trickle.");
            return;
        }
        // dry up the fountain
        if (cansee(map, player, fov, x, y)) {
            await pline_The("fountain dries up!");
        }
        // replace the fountain with ordinary floor
        loc.typ = ROOM;
        loc.flags = 0;
        loc.blessedftn = 0;
        newsym(x, y);
        if (isyou && map.inTown && map.inTown(x, y)) {
            // angry_guards(FALSE) -- not yet ported
        }
    }
}

// cf. fountain.c:243 -- drinkfountain(): drink from fountain
export async function drinkfountain(player, map, display, fov) {
    const loc = map.at(player.x, player.y);
    const mgkftn = loc && loc.blessedftn === 1;
    const fate = rnd(30);

    // C ref: fountain.c:249-252 -- levitation check
    if (player.levitating || player.levitation) {
        await floating_above(player, "fountain");
        return;
    }

    // C ref: fountain.c:254 -- blessed fountain jackpot
    if (mgkftn && (player.luck || 0) >= 0 && fate >= 10) {
        const littleluck = (player.luck || 0) < 4;
        await pline("Wow!  This makes you feel great!");
        // blessed restore ability: restore all ABASE to AMAX
        // gain ability, blessed if "natural" luck is high
        let i = rn2(A_MAX); // start at a random attribute
        for (let ii = 0; ii < A_MAX; ii++) {
            if (await adjattrib(player, i, 1, littleluck ? -1 : 0) && littleluck)
                break;
            if (++i >= A_MAX)
                i = 0;
        }
        await pline("A wisp of vapor escapes the fountain...");
        await exercise(player, A_WIS, true);
        if (loc) loc.blessedftn = 0;
        return; // NO dryup on blessed jackpot path
    }

    if (fate < 10) {
        // C ref: fountain.c:279 -- cool draught refreshes
        await pline_The("cool draught refreshes you.");
        player.uhunger = (player.uhunger || player.hunger || 0) + rnd(10);
        // newuhs(FALSE) -- hunger state update
        if (mgkftn) return; // blessed fountain, no dryup
    } else {
        // C ref: fountain.c:286-387 -- switch on fate
        switch (fate) {
        case 19: // Self-knowledge
            await You_feel("self-knowledgeable...");
            // enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS) -- not ported
            await exercise(player, A_WIS, true);
            await pline_The("feeling subsides.");
            break;
        case 20: // Foul water
            await pline_The("water is foul!  You gag and vomit.");
            rn1(20, 11); // morehungry(rn1(20, 11)) -- RNG consumed
            // vomit() -- not ported
            break;
        case 21: // Poisonous
            await pline_The("water is contaminated!");
            if (player.poison_resistance) {
                await pline("Perhaps it is runoff from the nearby %s farm.", "slime mold");
                await losehp(rnd(4), "unrefrigerated sip of juice", 0, player, display);
                break;
            }
            await poison_strdmg(player, rn1(4, 3), rnd(10), "contaminated water", 0);
            await exercise(player, A_CON, false);
            break;
        case 22: // Fountain of snakes!
            await dowatersnakes(player, map, display);
            break;
        case 23: // Water demon
            await dowaterdemon(player, map, display);
            break;
        case 24: { // Maybe curse some items
            await pline("This water's no good!");
            rn1(20, 11); // morehungry(rn1(20, 11)) -- RNG consumed
            await exercise(player, A_CON, false);
            // curse items in inventory
            let buc_changed = 0;
            for (const obj of (player.inventory || [])) {
                if (obj.oclass !== COIN_CLASS && !obj.cursed && !rn2(5)) {
                    curse(obj);
                    ++buc_changed;
                }
            }
            break;
        }
        case 25: // See invisible
            if (player.blind) {
                if (player.Invis) {
                    await You_feel("transparent.");
                } else {
                    await You_feel("very self-conscious.");
                    await pline("Then it passes.");
                }
            } else {
                await You_see("an image of someone stalking you.");
                await pline("But it disappears.");
            }
            // HSee_invisible |= FROMOUTSIDE
            player.see_invisible_intrinsic = true;
            newsym(player.x, player.y);
            mark_vision_dirty();
            await exercise(player, A_WIS, true);
            break;
        case 26: // See Monsters
            // monster_detect not called here for RNG parity -- no RNG consumed
            await pline_The("%s tastes like nothing.", hliquid("water"));
            await exercise(player, A_WIS, true);
            break;
        case 27: // Find a gem in the sparkling waters
            if (loc && !FOUNTAIN_IS_LOOTED(loc)) {
                await dofindgem(player, map, display);
                break;
            }
            // FALLTHROUGH to case 28
            // falls through
        case 28: // Water Nymph
            await dowaternymph(player, map, display);
            break;
        case 29: { // Scare
            await pline("This %s gives you bad breath!", hliquid("water"));
            for (const mtmp of (map.monsters || [])) {
                if (mtmp.dead) continue;
                // monflee(mtmp, 0, FALSE, FALSE) -- simplified
                mtmp.mflee = 1;
                mtmp.mfleetim = 0;
            }
            break;
        }
        case 30: // Gushing forth in this room
            await dogushforth(true, player, map, display, fov);
            break;
        default:
            await pline("This tepid %s is tasteless.", hliquid("water"));
            break;
        }
    }
    // C ref: fountain.c:389 -- dryup at end of all non-jackpot paths
    await dryup(player.x, player.y, true, player, map, display, fov);
}

// cf. fountain.c:394 -- dipfountain(obj): dip object into fountain
export async function dipfountain(obj, player, map, display, fov) {
    let er = ER_NOTHING;
    const is_hands = (obj && obj.is_hands);

    if (player.levitating || player.levitation) {
        await floating_above(player, "fountain");
        return;
    }

    const loc = map.at(player.x, player.y);

    // Excalibur check
    if (obj && obj.otyp === LONG_SWORD && (player.ulevel || 1) >= 5
        && !rn2(player.roleMnum === PM_KNIGHT ? 6 : 30)
        && (obj.quan || 1) === 1 && !obj.oartifact
        && !exist_artifact(LONG_SWORD, artiname(ART_EXCALIBUR))) {

        if ((player.alignment || (player.ualign && player.ualign.type)) !== A_LAWFUL) {
            // Ha! Trying to cheat her.
            await pline("A freezing mist rises from the %s"
                  + " and envelopes the sword.", hliquid("water"));
            await pline_The("fountain disappears!");
            curse(obj);
            if ((obj.spe || 0) > -6 && !rn2(3))
                obj.spe = (obj.spe || 0) - 1;
            obj.oerodeproof = false;
            await exercise(player, A_WIS, false);
        } else {
            // The lady of the lake acts!
            await pline(
              "From the murky depths, a hand reaches up to bless the sword.");
            await pline("As the hand retreats, the fountain disappears!");
            // oname -- name the sword Excalibur
            obj.oartifact = ART_EXCALIBUR;
            obj.onamelth = artiname(ART_EXCALIBUR).length;
            obj.oname = artiname(ART_EXCALIBUR);
            discover_artifact(ART_EXCALIBUR);
            bless(obj);
            obj.oeroded = 0;
            obj.oeroded2 = 0;
            obj.oerodeproof = true;
            await exercise(player, A_WIS, true);
        }
        // Remove the fountain
        if (loc) {
            loc.typ = ROOM;
            loc.flags = 0;
        }
        newsym(player.x, player.y);
        if (map.inTown && map.inTown(player.x, player.y)) {
            // angry_guards(FALSE) -- not yet ported
        }
        return;
    } else if (is_hands || (obj && obj === player.gloves)) {
        er = await wash_hands(player, map, display);
    } else if (obj) {
        er = water_damage(obj, null, true);
    }

    if (er === ER_DESTROYED || (er !== ER_NOTHING && !rn2(2))) {
        return; // no further effect
    }

    switch (rnd(30)) {
    case 16: // Curse the item
        if (!is_hands && obj && obj.oclass !== COIN_CLASS && !obj.cursed) {
            curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20: // Uncurse the item
        if (!is_hands && obj && obj.cursed) {
            if (!player.blind)
                await pline_The("%s glows for a moment.", hliquid("water"));
            uncurse(obj);
        } else {
            await pline("A feeling of loss comes over you.");
        }
        break;
    case 21: // Water Demon
        await dowaterdemon(player, map, display);
        break;
    case 22: // Water Nymph
        await dowaternymph(player, map, display);
        break;
    case 23: // an Endless Stream of Snakes
        await dowatersnakes(player, map, display);
        break;
    case 24: // Find a gem
        if (loc && !FOUNTAIN_IS_LOOTED(loc)) {
            await dofindgem(player, map, display);
            break;
        }
        // FALLTHROUGH to case 25
        // falls through
    case 25: // Water gushes forth
        await dogushforth(false, player, map, display, fov);
        break;
    case 26: // Strange feeling
        await pline("A strange tingling runs up your %s.", body_part(ARM, player));
        break;
    case 27: // Strange feeling
        await You_feel("a sudden chill.");
        break;
    case 28: { // Strange feeling -- bath urge, lose gold
        await pline("An urge to take a bath overwhelms you.");
        let money = 0;
        for (const otmp of (player.inventory || [])) {
            if (otmp.oclass === COIN_CLASS)
                money += (otmp.quan || 0) * (otmp.cost || 1);
        }
        if (money > 10) {
            // Amount to lose
            money = Math.floor(somegold(money) / 10);
            for (const otmp of (player.inventory || [])) {
                if (money <= 0) break;
                if (otmp.oclass === COIN_CLASS) {
                    const denomination = otmp.cost || 1;
                    let coin_loss = Math.ceil(money / denomination);
                    coin_loss = Math.min(coin_loss, otmp.quan || 0);
                    otmp.quan = (otmp.quan || 0) - coin_loss;
                    money -= coin_loss * denomination;
                    if (!otmp.quan) {
                        // delobj -- mark for removal
                        otmp.deleted = true;
                    }
                }
            }
            player.inventory = (player.inventory || []).filter(o => !o.deleted);
            await You("lost some of your gold in the fountain!");
            if (loc) CLEAR_FOUNTAIN_LOOTED(loc);
            await exercise(player, A_WIS, false);
        }
        break;
    }
    case 29: { // You see coins
        if (loc && FOUNTAIN_IS_LOOTED(loc))
            break;
        if (loc) SET_FOUNTAIN_LOOTED(loc);
        // mkgold -- create gold on floor
        const depth = map.depth || 1;
        const maxdepth = map.maxDepth || 30;
        const goldamt = rnd((maxdepth - depth + 1) * 2) + 5;
        // Place gold on map
        const gold = mksobj(484 /* GOLD_PIECE */, false, false);
        if (gold && map.addObject) {
            gold.quan = goldamt;
            gold.ox = player.x;
            gold.oy = player.y;
            map.addObject(gold);
        }
        if (!player.blind)
            await pline("Far below you, you see coins glistening in the %s.",
                  hliquid("water"));
        await exercise(player, A_WIS, true);
        newsym(player.x, player.y);
        break;
    }
    default:
        if (er === ER_NOTHING)
            await pline("Nothing seems to happen.");
        break;
    }
    // update_inventory(player) -- simplified
    await dryup(player.x, player.y, true, player, map, display, fov);
}

// cf. fountain.c:558 -- wash_hands(): wash hands in fountain/sink
export async function wash_hands(player, map, display) {
    const hands = "hands";
    let res = ER_NOTHING;
    const was_glib = !!player.glib;

    await You("wash your %s%s in the %s.",
        player.gloves ? "gloved " : "", hands, hliquid("water"));
    if (player.glib) {
        player.glib = 0;
        await Your("%s are no longer slippery.",
             player.gloves ? "gloves" : "fingers");
    }
    if (player.gloves) {
        res = water_damage(player.gloves, null, true);
    }
    // not what ER_GREASED is for, but the checks in dipfountain just
    // compare the result to ER_DESTROYED and ER_NOTHING, so it works
    if (was_glib && res === ER_NOTHING)
        res = ER_GREASED;
    return res;
}

// cf. fountain.c:581 -- breaksink(x, y): sink becomes fountain
export async function breaksink(x, y, player, map, display, fov) {
    if (cansee(map, player, fov, x, y) || (x === player.x && y === player.y))
        await pline_The("pipes break!  Water spurts out!");
    const loc = map.at(x, y);
    if (loc) {
        loc.typ = FOUNTAIN;
        loc.looted = 0;
        loc.blessedftn = 0;
        SET_FOUNTAIN_LOOTED(loc);
    }
    newsym(x, y);
}

// cf. fountain.c:595 -- drinksink(): drink from sink
export async function drinksink(player, map, display, fov) {
    if (player.levitating || player.levitation) {
        await floating_above(player, "sink");
        return;
    }
    const loc = map.at(player.x, player.y);
    switch (rn2(20)) {
    case 0:
        await You("take a sip of very cold %s.", hliquid("water"));
        break;
    case 1:
        await You("take a sip of very warm %s.", hliquid("water"));
        break;
    case 2:
        await You("take a sip of scalding hot %s.", hliquid("water"));
        if (player.fire_resistance) {
            await pline("It seems quite tasty.");
        } else {
            // losehp(rnd(6), "sipping boiling water", KILLED_BY)
            rnd(6); // RNG consumed for damage
        }
        break;
    case 3: {
        // Sewer rat
        const mtmp = makemon(PM_SEWER_RAT, player.x, player.y,
                             MM_NOMSG, map.depth || 1, map);
        if (mtmp) {
            await pline("Eek!  There's %s in the sink!",
                  (player.blind) ? "something squirmy"
                                 : a_monnam(mtmp));
        } else {
            await pline_The("sink seems quite dirty.");
        }
        break;
    }
    case 4: {
        // Random potion effect from faucet
        let otmp;
        do {
            otmp = mkobj(POTION_CLASS, false);
        } while (otmp && otmp.otyp === POT_WATER);
        if (otmp) {
            otmp.cursed = false;
            otmp.blessed = false;
            await pline("Some %s liquid flows from the faucet.",
                  player.blind ? "odd" : hcolor(otmp.descr || ""));
            otmp.quan = (otmp.quan || 1) + 1; // Avoid panic upon useup()
            otmp.fromsink = 1;
            // dopotion(otmp) -- not ported, consume the potion effect
            // obfree -- cleanup
        }
        break;
    }
    case 5:
        if (loc && !((loc.looted || 0) & S_LRING)) {
            await You("find a ring in the sink!");
            const ring = mkobj(RING_CLASS, true);
            if (ring && map.addObject) {
                ring.ox = player.x;
                ring.oy = player.y;
                map.addObject(ring);
            }
            loc.looted = (loc.looted || 0) | S_LRING;
            await exercise(player, A_WIS, true);
            newsym(player.x, player.y);
        } else {
            await pline("Some dirty %s backs up in the drain.", hliquid("water"));
        }
        break;
    case 6:
        await breaksink(player.x, player.y, player, map, display, fov);
        break;
    case 7:
        await pline_The("%s moves as though of its own will!", hliquid("water"));
        {
            const mtmp = makemon(PM_WATER_ELEMENTAL, player.x, player.y,
                                 MM_NOMSG, map.depth || 1, map);
            if (!mtmp)
                await pline("But it quiets down.");
        }
        break;
    case 8:
        await pline("Yuk, this %s tastes awful.", hliquid("water"));
        // more_experienced(1, 0); newexplevel();
        break;
    case 9:
        await pline("Gaggg... this tastes like sewage!  You vomit.");
        {
            const con = acurr(player, A_CON);
            rn1(30 - con, 11); // morehungry(rn1(30 - ACURR(A_CON), 11)) -- RNG consumed
        }
        // vomit() -- not ported
        break;
    case 10:
        await pline("This %s contains toxic wastes!", hliquid("water"));
        if (!player.unchanging) {
            await You("undergo a freakish metamorphosis!");
            // polyself(POLY_NOFLAGS) -- not called for RNG safety
        }
        break;
    // more odd messages
    case 11:
        await You_hear("clanking from the pipes...");
        break;
    case 12:
        await You_hear("snatches of song from among the sewers...");
        break;
    case 13:
        await pline("Ew, what a stench!");
        // create_gas_cloud(u.ux, u.uy, 1, 4) -- not ported
        break;
    case 19:
        if (player.hallucinating) {
            await pline("From the murky drain, a hand reaches up... --oops--");
            break;
        }
        // FALLTHROUGH
        // falls through
    default:
        await You("take a sip of %s %s.",
            rn2(3) ? (rn2(2) ? "cold" : "warm") : "hot",
            hliquid("water"));
    }
}

// cf. fountain.c:716 -- dipsink(obj): dip object into sink
export async function dipsink(obj, player, map, display, fov) {
    const loc = map.at(player.x, player.y);
    let try_call = false;
    const not_looted_yet = loc ? !((loc.looted || 0) & S_LRING) : false;
    const is_hands = (obj && obj.is_hands) || (player.gloves && obj === player.gloves);

    if (!rn2(not_looted_yet ? 25 : 15)) {
        // breaksink
        await breaksink(player.x, player.y, player, map, display, fov);
        if (player.glib && is_hands)
            await Your("%s are still slippery.", player.gloves ? "gloves" : "fingers");
        return;
    } else if (is_hands) {
        await wash_hands(player, map, display);
        return;
    } else if (obj && obj.oclass !== POTION_CLASS) {
        await You("hold %s under the tap.", xname(obj));
        if (water_damage(obj, null, true) === ER_NOTHING)
            await pline("Nothing seems to happen.");
        return;
    }

    // at this point the object must be a potion
    if (!obj) return;
    await You("pour %s%s down the drain.",
        (obj.quan || 1) > 1 ? "one of " : "",
        xname(obj));
    switch (obj.otyp) {
    case POT_POLYMORPH:
        await polymorph_sink(player, map);
        try_call = true;
        break;
    case POT_OIL:
        if (!player.blind) {
            await pline("It leaves an oily film on the basin.");
            try_call = true;
        } else {
            await pline("Nothing seems to happen.");
        }
        break;
    case POT_ACID:
        // acts like a drain cleaner product
        try_call = true;
        if (!player.blind) {
            await pline_The("drain seems less clogged.");
        } else if (!player.deaf) {
            await You_hear("a sucking sound.");
        } else {
            await pline("Nothing seems to happen.");
            try_call = false;
        }
        break;
    case POT_LEVITATION:
        await sink_backs_up(player.x, player.y, player, map, display);
        try_call = true;
        break;
    case POT_OBJECT_DETECTION:
        if (loc && !((loc.looted || 0) & S_LRING)) {
            await You("sense a ring lost down the drain.");
            try_call = true;
            break;
        }
        // FALLTHROUGH
        // falls through
    case POT_GAIN_LEVEL:
    case POT_GAIN_ENERGY:
    case POT_MONSTER_DETECTION:
    case POT_FRUIT_JUICE:
    case POT_WATER:
        await pline("Nothing seems to happen.");
        break;
    default:
        // hero can feel the vapor on her skin
        await pline("A wisp of vapor rises up...");
        // potionbreathe(obj) -- not ported
        break;
    }
    // if (try_call && obj.dknown) trycall(obj) -- not ported
    useup(obj, player);
}

// cf. fountain.c:805 -- sink_backs_up(x, y): ring spawns from backed-up sink
export async function sink_backs_up(x, y, player, map, display) {
    let buf;
    if (!player.blind)
        buf = "Muddy waste pops up from the drain";
    else if (!player.deaf)
        buf = "You hear a sloshing sound";
    else
        buf = "Something splashes you in the " + body_part(FACE, player);
    await pline("%s%s.", !player.deaf ? "Flupp!  " : "", buf);

    const loc = map.at(x, y);
    if (loc && !((loc.looted || 0) & S_LRING)) { // once per sink
        if (!player.blind)
            await You_see("a ring shining in its midst.");
        const ring = mkobj(RING_CLASS, true);
        if (ring && map.addObject) {
            ring.ox = x;
            ring.oy = y;
            map.addObject(ring);
        }
        newsym(x, y);
        await exercise(player, A_DEX, true);
        await exercise(player, A_WIS, true); // a discovery!
        if (loc) loc.looted = (loc.looted || 0) | S_LRING;
    }
}
