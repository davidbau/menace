// sit.js -- Sitting effects and related hero intrinsic/inventory curses
// cf. sit.c -- #sit command, throne effects, rndcurse, attrcurse

import { rn2, rnd, rn1, d } from './rng.js';
import { ROOM, THRONE, SINK, ALTAR, GRAVE, STAIRS, LADDER,
         FOUNTAIN, ICE, DRAWBRIDGE_DOWN,
         A_STR, A_DEX, A_CON, A_WIS, A_INT, A_CHA,
         INTRINSIC, FROMOUTSIDE, TIMEOUT,
         FIRE_RES, COLD_RES, POISON_RES, SHOCK_RES,
         SEE_INVIS, INVIS, TELEPORT, TELEPAT,
         FAST, STEALTH, PROTECTION, AGGRAVATE_MONSTER,
         isok, W_SADDLE,
         TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
         PIT, SPIKED_PIT } from './const.js';
import { COIN_CLASS, SADDLE } from './objects.js';
import { pline, You, Your, You_feel, You_cant, pline_The,
         verbalize } from './pline.js';
import { exercise } from './attrib_exercise.js';
import { adjattrib } from './attrib.js';
import { is_pool, is_lava, is_ice } from './dbridge.js';
import { PM_TRAPPER, S_DRAGON } from './monsters.js';
import { is_prince, slithy, is_hider, lays_eggs, likes_lava,
         amorphous, is_humanoid, eggs_in_water, sticks } from './mondata.js';
import { which_armor } from './worn.js';
import { Monnam, mon_nam } from './do_name.js';
import { spec_ability } from './artifact.js';
import { ART_MAGICBANE, SPFX_INTEL } from './artifacts.js';
import { make_confused, make_blinded, make_glib } from './potion.js';
import { makemon } from './makemon.js';
import { courtmon } from './mkroom.js';
import { level_difficulty } from './dungeon.js';
import { unbless, curse as curseObj } from './mkobj.js';
import { mark_vision_dirty } from './vision.js';
import { do_mapping } from './detect.js';
import { aggravate } from './wizard.js';
import { update_inventory } from './invent.js';
import { burn_away_slime } from './timeout.js';

// cf. sit.c:14 -- take_gold(): remove all gold coins from hero inventory
export async function take_gold(player, display) {
    let lost_money = false;
    player.inventory = player.inventory.filter(otmp => {
        if (otmp.oclass === COIN_CLASS) {
            lost_money = true;
            return false; // remove
        }
        return true;
    });
    if (!lost_money) {
        await You_feel("a strange sensation.");
    } else {
        await You("notice you have no gold!");
        // botl update handled by caller
    }
}

// cf. sit.c:238 -- special_throne_effect(): Vlad's tower throne effects
async function special_throne_effect(effect, player, map, display) {
    const tx = player.x, ty = player.y;

    switch (effect) {
    case 1:
    case 2:
    case 3:
    case 4:
        // 4 chances of a wish, then throne disappears
        // TODO: makewish() — wish granting not yet ported
        await pline("A voice echoes: \"You may wish for an object.\"");
        {
            const loc = map.at(tx, ty);
            if (loc) {
                loc.typ = ROOM;
                loc.flags = 0;
            }
        }
        await pline_The("throne disintegrates, having spent its power.");
        break;
    case 5:
        // permanent level drain
        await pline("Sitting on the throne was a terrible experience.");
        // TODO: losexp("a bad experience sitting on a throne") — level drain
        // TODO: Drain_resistance check
        break;
    case 6:
    {
        // grease hands and inventory
        await pline("A greasy liquid sprays all over you!");
        for (const otmp of player.inventory) {
            if (otmp.oclass !== COIN_CLASS)
                otmp.greased = 1;
        }
        make_glib(player, rn1(101, 100));
        break;
    }
    case 7:
        // lose an intrinsic
        await attrcurse(player, display);
        await pline_The("throne somehow seems to be amused.");
        break;
    case 8:
    {
        // level teleport to Vibrating Square level
        // TODO: schedule_goto to VS level
        if (player.amulet) {
            await You_feel("extremely disoriented for a moment.");
        } else {
            await You_feel("extremely out of place.");
        }
        break;
    }
    case 9:
    {
        // summon demons (3x msummon(NULL))
        await pline_The("throne seeems to be calling for help!");
        // TODO: msummon(NULL) x3 — demon summoning
        break;
    }
    case 10:
    {
        // confused blessed remove curse effect
        // TODO: seffects() with fake blessed remove curse spellbook
        await pline("You feel as if someone is helping you.");
        break;
    }
    case 11:
        // polymorph effect
        await pline("This throne was not meant for those such as you!");
        await You_feel("a change coming over you.");
        // TODO: polyself(POLY_NOFLAGS)
        break;
    case 12:
        // acid damage
        await pline("The throne is covered in acid!");
        {
            // RNG parity: rnd(16) or rnd(80) for damage
            const dmg = player.acid_resistance ? rnd(16) : rnd(80);
            // TODO: losehp(dmg, "acidic chair", KILLED_BY_AN)
        }
        await exercise(player, A_CON, false);
        break;
    case 13:
    {
        // ability shuffle
        await pline("As you sit on the throne, your body and mind start to warp.");
        for (let ability = 0; ability < 6; ++ability) { // A_MAX = 6
            const adj = rn2(5) - 2;
            await adjattrib(player, ability, adj, -1);
        }
        break;
    }
    }
}

// cf. sit.c:39 -- throne_sit_effect(): maybe do something when hero sits on a throne
async function throne_sit_effect(player, map, display) {
    const tx = player.x, ty = player.y;

    // C: In_V_tower(&u.uz) — Vlad's tower check
    const special_throne = !!(map.flags && map.flags.in_v_tower);

    // C: rnd(6) > 4  is same as !rn2(3) — 1/3 chance of effect
    if (rnd(6) > 4) {
        const effect = rnd(13);

        if (special_throne) {
            await special_throne_effect(effect, player, map, display);
            return;
        }

        switch (effect) {
        case 1:
            // stat drain + hp loss
            {
                const attr = rn2(6); // rn2(A_MAX)
                const loss = rn1(4, 3); // rn2(4) + 3
                await adjattrib(player, attr, -loss, 0);
                const dmg = rnd(10);
                // TODO: losehp(dmg, "cursed throne", KILLED_BY_AN)
            }
            break;
        case 2:
            // stat gain
            {
                const attr = rn2(6); // rn2(A_MAX)
                await adjattrib(player, attr, 1, 0);
            }
            break;
        case 3:
            // electric shock
            await pline("A%s electric shock shoots through your body!",
                  player.shock_resistance ? "n" : " massive");
            {
                const dmg = player.shock_resistance ? rnd(6) : rnd(30);
                // TODO: losehp(dmg, "electric chair", KILLED_BY_AN)
            }
            await exercise(player, A_CON, false);
            break;
        case 4:
            // full heal
            await You_feel("much, much better!");
            if (player.mh !== undefined && player.mhmax !== undefined) {
                // Upolyd path
                if (player.mh >= (player.mhmax - 5))
                    player.mhmax += 4;
                player.mh = player.mhmax;
            }
            if (player.uhp >= (player.maxhp - 5)) {
                player.maxhp += 4;
                if (player.maxhp > (player.hppeak || player.maxhp))
                    player.hppeak = player.maxhp;
            }
            player.uhp = player.maxhp;
            player.ucreamed = 0;
            // TODO: make_blinded(0, TRUE) — cure blindness
            // TODO: make_sick(0, null, FALSE, SICK_ALL) — cure sickness
            // TODO: heal_legs(0) — cure wounded legs
            break;
        case 5:
            // take gold
            await take_gold(player, display);
            break;
        case 6:
            // wish or luck change
            {
                const luckcheck = (player.luck || 0) + rn2(5);
                if (luckcheck < 0) {
                    await You_feel("your luck is changing.");
                    // TODO: change_luck(1)
                    if (player.luck !== undefined) player.luck += 1;
                } else {
                    // TODO: makewish()
                    await pline("A voice echoes: \"You may wish for an object.\"");
                }
            }
            break;
        case 7:
            // summon court monsters
            {
                const cnt = rnd(10);
                await pline("A voice echoes:");
                await verbalize("Thine audience hath been summoned, %s!",
                          player.gender === 1 ? "Dame" : "Sire");
                for (let i = 0; i < cnt; i++) {
                    makemon(courtmon(level_difficulty(map)), tx, ty, 0, 0, map);
                }
            }
            break;
        case 8:
            // genocide
            await pline("A voice echoes:");
            await verbalize("By thine Imperious order, %s...",
                      player.gender === 1 ? "Dame" : "Sire");
            // TODO: do_genocide(5) — REALLY|ONTHRONE
            break;
        case 9:
            // curse luck or rndcurse
            await pline("A voice echoes:");
            await verbalize(
                 "A curse upon thee for sitting upon this most holy throne!");
            if ((player.luck || 0) > 0) {
                // RNG parity: rn1(100, 250) = rn2(100) + 250 for blind duration
                const blindDur = rn1(100, 250);
                // TODO: make_blinded(BlindedTimeout + blindDur, TRUE)
                if ((player.luck || 0) > 1) {
                    const lossamt = rnd(2);
                    // TODO: change_luck(-lossamt)
                } else {
                    // TODO: change_luck(-1)
                }
            } else {
                await rndcurse(player, map, display);
            }
            break;
        case 10:
            // magic mapping or see_invis
            if ((player.luck || 0) < 0 || player.hasProp(SEE_INVIS)) {
                if (map.flags && map.flags.nommap) {
                    await pline("A terrible drone fills your head!");
                    // RNG parity: rnd(30) for confusion
                    const confDur = rnd(30);
                    make_confused(player, (player.confusion_intrinsic || 0) + confDur, false);
                } else {
                    await pline("An image forms in your mind.");
                    await do_mapping(player, map, display);
                }
            } else {
                if (!player.blind) {
                    await Your("vision becomes clear.");
                } else {
                    // Simplified: blind case with eye tingle
                    await Your("eyes tingle...");
                }
                // HSee_invisible |= FROMOUTSIDE
                player.ensureUProp(SEE_INVIS).intrinsic |= FROMOUTSIDE;
                mark_vision_dirty();
            }
            break;
        case 11:
            // teleport or aggravate
            if ((player.luck || 0) < 0) {
                await You_feel("threatened.");
                aggravate(map, player);
            } else {
                await You_feel("a wrenching sensation.");
                // TODO: tele() — teleport hero
            }
            break;
        case 12:
            // identify pack
            await You("are granted an insight!");
            if (player.inventory && player.inventory.length > 0) {
                const identCount = rn2(5); // RNG parity: rn2(5) agrees w/seffects()
                // TODO: identify_pack(identCount, FALSE)
            }
            break;
        case 13:
            // confusion
            await Your("mind turns into a pretzel!");
            {
                const confDur = rn1(7, 16); // rn2(7) + 16
                await make_confused(player, confDur, false);
            }
            break;
        default:
            break;
        }
    } else {
        // No effect — flavor text
        const playerType = player.type || {};
        if (is_prince(playerType) || player.uhand_of_elbereth)
            await You_feel("very comfortable here.");
        else
            await You_feel("somehow out of place...");
    }

    // Throne removal: 1/3 chance (non-special thrones only)
    if (!special_throne && !rn2(3)) {
        const loc = map.at(tx, ty);
        if (loc) {
            loc.typ = ROOM;
            loc.flags = 0;
        }
        await pline_The("throne vanishes in a puff of logic.");
    }
}

// cf. sit.c:354 -- lay_an_egg(): female polymorph lays an egg on the floor
async function lay_an_egg(player, map, display) {
    if (player.gender !== 1) { // !flags.female
        await pline("Males can't lay eggs!");
        return 0; // ECMD_OK
    }
    // TODO: hunger check, eggs_in_water check, egg creation
    await You("lay an egg.");
    return 1; // ECMD_TIME
}

// cf. sit.c:396 -- dosit(): #sit command
export async function dosit(player, map, display) {
    const sit_message = "sit on the %s.";
    const px = player.x, py = player.y;
    const trap = map.trapAt ? map.trapAt(px, py) : null;
    const loc = map.at(px, py);
    const typ = loc ? loc.typ : 0;

    if (player.usteed) {
        await You("are already sitting on %s.", mon_nam(player.usteed));
        return 0; // ECMD_OK
    }

    // Un-hide from ceiling
    const playerType = player.type || {};
    if (player.uundetected && is_hider(playerType)
        && (player.umonnum || 0) !== PM_TRAPPER) {
        player.uundetected = false;
    }

    if (player.levitating || player.uswallow) {
        // can't reach floor
        if (player.uswallow)
            await pline("There are no seats in here!");
        else if (player.levitating)
            await You("tumble in place.");
        else
            await You("are sitting on air.");
        return 0; // ECMD_OK
    } else if (player.ustuck && !sticks(playerType)) {
        if (is_humanoid(player.ustuck.data || {}))
            await pline("%s won't offer a lap.", Monnam(player.ustuck));
        else
            await pline("%s has no lap.", Monnam(player.ustuck));
        return 0; // ECMD_OK
    } else if (is_pool(px, py, map) && !player.underwater) {
        // water sitting — fall through to in_water
        await You("sit in the water.");
        if (!rn2(10) && player.armor)
            ; // TODO: water_damage(uarm, "armor", TRUE)
        if (!rn2(10) && player.boots)
            ; // TODO: water_damage(uarmf, "armor", TRUE)
        return 1; // ECMD_TIME
    }

    // Check for objects on the tile
    const objs = map.objectsAt ? map.objectsAt(px, py) : [];
    if (objs.length > 0 && !(trap && (trap.ttyp === PIT || trap.ttyp === SPIKED_PIT))) {
        // Not teetering at a pit — sit on objects
        const obj = objs[0]; // top object
        if (playerType.mlet === S_DRAGON && obj.oclass === COIN_CLASS) {
            await You("coil up around your hoard.");
        } else {
            if (slithy(playerType))
                await You("coil up around %s.", obj.oname || "it");
            else
                await You("sit on %s.", obj.oname || "it");
            if (!obj.otyp) {
                // generic
            } else {
                await pline("It's not very comfortable...");
            }
        }
    } else if (trap || (player.utrap && (player.utraptype || 0) >= TT_LAVA)) {
        if (player.utrap) {
            await exercise(player, A_WIS, false);
            if (player.utraptype === TT_BEARTRAP) { // TT_BEARTRAP
                await You_cant("sit down with your foot in the bear trap.");
                player.utrap++;
            } else if (player.utraptype === TT_PIT) { // TT_PIT
                if (trap && trap.ttyp === SPIKED_PIT) {
                    await You("sit down on a spike.  Ouch!");
                    // RNG parity: rn2(2) for half phys damage
                    const dmg = player.half_physical_damage ? rn2(2) : 1;
                    // TODO: losehp(dmg, "sitting on an iron spike", KILLED_BY)
                    await exercise(player, A_STR, false);
                } else {
                    await You("sit down in the pit.");
                }
                player.utrap += rn2(5);
            } else if (player.utraptype === TT_WEB) { // TT_WEB
                await You("sit in the spider web and get entangled further!");
                player.utrap += rn1(10, 5);
            } else if (player.utraptype === TT_LAVA) { // TT_LAVA
                await You("sit in the lava!");
                player.utrap += rnd(4);
                const dmg = d(2, 10);
                // TODO: losehp(dmg, "sitting in lava", KILLED_BY)
            } else if (player.utraptype === TT_INFLOOR || player.utraptype === TT_BURIEDBALL) {
                // TT_INFLOOR or TT_BURIEDBALL
                await You_cant("maneuver to sit!");
                player.utrap++;
            }
        } else {
            await You(player.flying ? "land." : "sit down.");
            // TODO: dotrap(trap, VIASITTING)
        }
    } else if (player.underwater) {
        await You("sit down on the muddy bottom.");
    } else if (typ === SINK) {
        await You(sit_message, "sink");
        await Your("rump gets wet.");
    } else if (typ === ALTAR) {
        await You(sit_message, "altar");
        // TODO: altar_wrath(px, py)
    } else if (typ === GRAVE) {
        await You(sit_message, "grave");
    } else if (typ === STAIRS) {
        await You(sit_message, "stairs");
    } else if (typ === LADDER) {
        await You(sit_message, "ladder");
    } else if (is_lava(px, py, map)) {
        await You(sit_message, "lava");
        await burn_away_slime();
        if (likes_lava(playerType)) {
            await pline_The("lava feels warm.");
            return 1; // ECMD_TIME
        }
        await pline_The("lava burns you!");
        {
            const dmg = d(player.hasProp(FIRE_RES) ? 2 : 10, 10);
            // TODO: losehp(dmg, "sitting on lava", KILLED_BY)
        }
    } else if (is_ice(px, py, map)) {
        await You(sit_message, "ice");
        if (!player.cold_resistance)
            await pline_The("ice feels cold.");
    } else if (typ === DRAWBRIDGE_DOWN) {
        await You(sit_message, "drawbridge");
    } else if (typ === THRONE) {
        await You(sit_message, "throne");
        await throne_sit_effect(player, map, display);
    } else if (lays_eggs(playerType)) {
        return await lay_an_egg(player, map, display);
    } else {
        await pline("Having fun sitting on the floor?");
    }
    return 1; // ECMD_TIME
}

// cf. sit.c:565 -- rndcurse(): curse a few inventory items at random!
export async function rndcurse(player, map, display) {
    const mal_aura = "feel a malignant aura surround %s.";

    // Magicbane check
    if (player.weapon && player.weapon.oartifact === ART_MAGICBANE && rn2(20)) {
        await You(mal_aura, "the magic-absorbing blade");
        return;
    }

    if (player.antimagic) {
        // TODO: shieldeff(player.x, player.y)
    }

    await You(mal_aura, "you");

    // Count non-gold inventory items
    let nobj = 0;
    for (const otmp of player.inventory) {
        if (otmp.oclass === COIN_CLASS) continue;
        nobj++;
    }

    // RNG parity: divisor is ((!!Antimagic) + (!!Half_spell_damage) + 1)
    const divisor = (player.antimagic ? 1 : 0)
                  + (player.half_spell_damage ? 1 : 0) + 1;
    let cnt = rnd(Math.floor(6 / divisor) || 1);

    if (nobj) {
        for (; cnt > 0; cnt--) {
            const onum_target = rnd(nobj);
            let onum = onum_target;
            let otmp = null;
            for (const item of player.inventory) {
                if (item.oclass === COIN_CLASS) continue;
                if (--onum === 0) {
                    otmp = item;
                    break;
                }
            }
            if (!otmp || otmp.cursed)
                continue;

            // Intelligent artifact resistance
            if (otmp.oartifact && spec_ability(otmp, SPFX_INTEL)
                && rn2(10) < 8) {
                await pline("%s resists!", otmp.oname || "An item");
                continue;
            }

            if (otmp.blessed)
                unbless(otmp);
            else
                curseObj(otmp);
        }
        update_inventory(player);
    }

    // Steed's saddle
    if (player.usteed && !rn2(4)) {
        const saddle = which_armor(player.usteed, W_SADDLE);
        if (saddle && !saddle.cursed) {
            if (saddle.blessed)
                unbless(saddle);
            else
                curseObj(saddle);
            if (!player.blind) {
                await pline("%s glows %s.", saddle.oname || "The saddle",
                      saddle.cursed ? "black" : "brown");
            }
        }
    }
}

// cf. sit.c:640 -- attrcurse(): remove a random INTRINSIC ability from hero
// Returns the intrinsic property which was removed, or 0 if nothing removed.
export async function attrcurse(player, display) {
    let ret = 0;

    // C uses a fall-through switch on rnd(11)
    // We replicate the cascade: if the rolled case's intrinsic is not present,
    // fall through to the next case.
    const roll = rnd(11);

    // Build cascade array: [case_num, property_key, message, ret_value]
    const cascade = [
        [1,  'fire_resistance_intrinsic',   "warmer.",              FIRE_RES],
        [2,  'teleportation_intrinsic',     "less jumpy.",          TELEPORT],
        [3,  'poison_resistance_intrinsic', "a little sick!",       POISON_RES],
        [4,  'telepathy_intrinsic',         null,                   TELEPAT],
        [5,  'cold_resistance_intrinsic',   "cooler.",              COLD_RES],
        [6,  'invisibility_intrinsic',      "paranoid.",            INVIS],
        [7,  'see_invisible_intrinsic',     null,                   SEE_INVIS],
        [8,  'fast_intrinsic',              "slower.",              FAST],
        [9,  'stealth_intrinsic',           "clumsy.",              STEALTH],
        [10, 'protection_intrinsic',        "vulnerable.",          PROTECTION],
        [11, 'aggravate_intrinsic',         "less attractive.",     AGGRAVATE_MONSTER],
    ];

    // Find start index based on roll
    let startIdx = cascade.findIndex(c => c[0] === roll);
    if (startIdx < 0) startIdx = cascade.length; // default: no match

    for (let i = startIdx; i < cascade.length; i++) {
        const [, prop, msg, propId] = cascade[i];
        if (player[prop]) {
            player[prop] = false;
            if (propId === TELEPAT) {
                // Special message for telepathy
                await Your("senses fail!");
            } else if (propId === SEE_INVIS) {
                // Special message for see invisible
                await You(player.Hallucination
                    ? "tawt you taw a puttie tat"
                    : "thought you saw something");
            } else if (msg) {
                await You_feel(msg);
            }
            ret = propId;
            break;
        }
    }

    return ret;
}
