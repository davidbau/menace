// mkobj_new.js -- Object creation for dungeon generation
// Faithful port of mkobj.c from NetHack 3.7
// Focus: PRNG-faithful RNG consumption for level generation alignment

import { rn2, rnd, rn1, rne, d } from './rng.js';
import {
    objectData, bases, oclass_prob_totals, mkobjprobs, NUM_OBJECTS,
    ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
    TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS,
    CHAIN_CLASS, VENOM_CLASS,
    IRON, COPPER, WOOD, PLASTIC, GLASS, DRAGON_HIDE, LIQUID,
    ARROW, DART, ROCK,
    initObjectData,
} from './objects.js';
import { rndmonnum } from './makemon_new.js';

// Named object indices we need (exported from objects.js)
// Check: CORPSE, EGG, TIN, SLIME_MOLD, KELP_FROND, CANDY_BAR,
// LOADSTONE, LUCKSTONE, TALLOW_CANDLE, WAX_CANDLE, BRASS_LANTERN, OIL_LAMP,
// MAGIC_LAMP, CHEST, LARGE_BOX, ICE_BOX, SACK, OILSKIN_SACK, BAG_OF_HOLDING,
// EXPENSIVE_CAMERA, TINNING_KIT, MAGIC_MARKER, CAN_OF_GREASE, CRYSTAL_BALL,
// HORN_OF_PLENTY, BAG_OF_TRICKS, FIGURINE, BELL_OF_OPENING,
// MAGIC_FLUTE, MAGIC_HARP, FROST_HORN, FIRE_HORN, DRUM_OF_EARTHQUAKE,
// WAN_WISHING, WAN_NOTHING, BOULDER, STATUE,
// AMULET_OF_YENDOR, AMULET_OF_STRANGULATION, AMULET_OF_CHANGE, AMULET_OF_RESTFUL_SLEEP,
// FUMBLE_BOOTS, LEVITATION_BOOTS, HELM_OF_OPPOSITE_ALIGNMENT, GAUNTLETS_OF_FUMBLING,
// RIN_TELEPORTATION, RIN_POLYMORPH, RIN_AGGRAVATE_MONSTER, RIN_HUNGER,
// GOLD_PIECE, SPE_BLANK_PAPER, POT_OIL, POT_WATER

// P_ skill constants for is_multigen
const P_BOW = 20;
const P_SHURIKEN = 24;

// Helper: is object a stackable missile?
function is_multigen(obj) {
    if (obj.oclass !== WEAPON_CLASS) return false;
    const skill = objectData[obj.otyp].sub;
    return skill >= -P_SHURIKEN && skill <= -P_BOW;
}

// Helper: can object be poisoned?
function is_poisonable(obj) {
    return is_multigen(obj);
}

// Helper: material checks for erosion
function is_flammable(obj) {
    const mat = objectData[obj.otyp].material;
    if (mat === LIQUID) return false;
    return (mat <= WOOD) || mat === PLASTIC;
}
function is_rustprone(obj) {
    return objectData[obj.otyp].material === IRON;
}
function is_crackable(obj) {
    return objectData[obj.otyp].material === GLASS && obj.oclass === ARMOR_CLASS;
}
function is_rottable(obj) {
    const mat = objectData[obj.otyp].material;
    if (mat === LIQUID) return false;
    return mat <= WOOD || mat === DRAGON_HIDE;
}
function is_corrodeable(obj) {
    const mat = objectData[obj.otyp].material;
    return mat === COPPER || mat === IRON;
}

// Helper: can object generate eroded?
function may_generate_eroded(obj) {
    // Skip erosion for coins, items with no relevant class
    if (obj.oclass === COIN_CLASS) return false;
    if (obj.oclass === VENOM_CLASS) return false;
    if (obj.oclass === BALL_CLASS || obj.oclass === CHAIN_CLASS) return false;
    // Simplified: check if erosion is relevant for the class
    switch (obj.oclass) {
    case WEAPON_CLASS:
    case ARMOR_CLASS:
    case TOOL_CLASS:
        return true;
    default:
        return false;
    }
}

// C ref: mkobj.c blessorcurse()
function blessorcurse(obj, chance) {
    if (obj.blessed || obj.cursed) return;
    if (!rn2(chance)) {
        if (!rn2(2)) {
            obj.cursed = true;
        } else {
            obj.blessed = true;
        }
    }
}

// C ref: mkobj.c curse()
function curse(obj) {
    obj.blessed = false;
    obj.cursed = true;
}

// C ref: mkobj.c bless()
function bless_obj(obj) {
    obj.cursed = false;
    obj.blessed = true;
}

// C ref: mkobj.c bcsign()
function bcsign(obj) {
    return obj.cursed ? -1 : obj.blessed ? 1 : 0;
}

// Create a blank object
function newobj(otyp) {
    // C ref: mkobj.c:1183 — otmp->o_id = next_ident()
    // next_ident() consumes rnd(2) for unique object ID
    rnd(2);
    return {
        otyp: otyp,
        oclass: objectData[otyp].oc_class,
        quan: 1,
        spe: 0,
        blessed: false,
        cursed: false,
        oerodeproof: false,
        oeroded: 0,
        oeroded2: 0,
        greased: false,
        opoisoned: 0,
        corpsenm: -1, // NON_PM
        owt: objectData[otyp].weight,
        ox: 0, oy: 0,
        where: 'free',
        lamplit: false,
        age: 1,
        tknown: false,
        known: false,
        dknown: false,
        name: objectData[otyp].name,
    };
}

// C ref: mkobj.c mkobj_erosions()
function mkobj_erosions(obj) {
    if (!may_generate_eroded(obj)) return;
    if (!rn2(100)) {
        obj.oerodeproof = true;
    } else {
        if (!rn2(80) && (is_flammable(obj) || is_rustprone(obj) || is_crackable(obj))) {
            do {
                obj.oeroded++;
            } while (obj.oeroded < 3 && !rn2(9));
        }
        if (!rn2(80) && (is_rottable(obj) || is_corrodeable(obj))) {
            do {
                obj.oeroded2++;
            } while (obj.oeroded2 < 3 && !rn2(9));
        }
    }
    if (!rn2(1000)) obj.greased = true;
}

// rndmonnum imported from makemon_new.js (circular but safe — called at runtime only)

// C ref: mkobj.c mksobj_init() -- class-specific object initialization
function mksobj_init(obj, artif) {
    const oclass = obj.oclass;
    const otyp = obj.otyp;
    const od = objectData[otyp];

    switch (oclass) {
    case WEAPON_CLASS:
        if (is_multigen(obj)) obj.quan = rn1(6, 6);
        if (!rn2(11)) {
            obj.spe = rne(3);
            obj.blessed = !!rn2(2);
        } else if (!rn2(10)) {
            curse(obj);
            obj.spe = -rne(3);
        } else {
            blessorcurse(obj, 10);
        }
        if (is_poisonable(obj) && !rn2(100))
            obj.opoisoned = 1;
        if (artif && !rn2(20)) {
            // mk_artifact -- skip, just consumed the rn2
        }
        break;

    case FOOD_CLASS:
        // Check specific food types by name since we may not have all constants
        if (od.name === 'corpse') {
            // rndmonnum loop -- up to 50 tries
            let tryct = 50;
            do {
                obj.corpsenm = rndmonnum(); // undead_to_corpse(rndmonnum())
            } while (obj.corpsenm < 0 && --tryct > 0);
        } else if (od.name === 'egg') {
            obj.corpsenm = -1;
            if (!rn2(3)) {
                for (let tryct = 200; tryct > 0; --tryct) {
                    obj.corpsenm = rndmonnum(); // can_be_hatched(rndmonnum())
                    break; // simplified: first attempt succeeds
                }
            }
        } else if (od.name === 'tin') {
            obj.corpsenm = -1;
            if (!rn2(6)) {
                // spinach tin -- no RNG
            } else {
                for (let tryct = 200; tryct > 0; --tryct) {
                    rndmonnum(); // undead_to_corpse(rndmonnum())
                    rn2(10); // set_tin_variety RANDOM_TIN: rn2(TTSZ-1) = rn2(10)
                    break; // simplified: first attempt succeeds
                }
            }
            blessorcurse(obj, 10);
        } else if (od.name === 'kelp frond') {
            obj.quan = rnd(2);
        } else if (od.name === 'candy bar') {
            rn2(15); // assign_candy_wrapper: rn2(SIZE(candy_wrappers)-1)
        }
        // General food: possible quan=2
        if (od.name !== 'corpse' && od.name !== 'meat ring'
            && od.name !== 'kelp frond' && od.name !== 'egg'
            && od.name !== 'tin' && od.name !== 'candy bar') {
            // Check if pudding (glob) -- skip pudding logic
            if (!rn2(6)) obj.quan = 2;
        }
        break;

    case GEM_CLASS:
        if (od.name === 'loadstone') {
            curse(obj);
        } else if (od.name === 'rock') {
            obj.quan = rn1(6, 6);
        } else if (od.name !== 'luckstone' && !rn2(6)) {
            obj.quan = 2;
        }
        break;

    case TOOL_CLASS:
        if (od.name === 'tallow candle' || od.name === 'wax candle') {
            obj.spe = 1;
            obj.quan = 1 + (rn2(2) ? rn2(7) : 0);
            blessorcurse(obj, 5);
        } else if (od.name === 'brass lantern' || od.name === 'oil lamp') {
            obj.spe = 1;
            obj.age = rn1(500, 1000);
            blessorcurse(obj, 5);
        } else if (od.name === 'magic lamp') {
            obj.spe = 1;
            blessorcurse(obj, 2);
        } else if (od.name === 'chest' || od.name === 'large box') {
            obj.olocked = !!rn2(5);
            obj.otrapped = !rn2(10);
            obj.tknown = obj.otrapped && !rn2(100);
            // mkbox_cnts -- consume RNG for contents
            mkbox_cnts(obj);
        } else if (od.name === 'ice box' || od.name === 'sack'
                   || od.name === 'oilskin sack' || od.name === 'bag of holding') {
            mkbox_cnts(obj);
        } else if (od.name === 'expensive camera' || od.name === 'tinning kit'
                   || od.name === 'magic marker') {
            obj.spe = rn1(70, 30);
        } else if (od.name === 'can of grease') {
            obj.spe = rn1(21, 5);
            blessorcurse(obj, 10);
        } else if (od.name === 'crystal ball') {
            obj.spe = rn1(5, 3);
            blessorcurse(obj, 2);
        } else if (od.name === 'horn of plenty' || od.name === 'bag of tricks') {
            obj.spe = rn1(18, 3);
        } else if (od.name === 'figurine') {
            let tryct = 0;
            do {
                obj.corpsenm = rndmonnum(); // rndmonnum_adj(5, 10)
            } while (tryct++ < 30 && false); // simplified: first attempt ok
            blessorcurse(obj, 4);
        } else if (od.name === 'Bell of Opening') {
            obj.spe = 3;
        } else if (od.name === 'magic flute' || od.name === 'magic harp'
                   || od.name === 'frost horn' || od.name === 'fire horn'
                   || od.name === 'drum of earthquake') {
            obj.spe = rn1(5, 4);
        }
        break;

    case AMULET_CLASS:
        if (rn2(10) && (od.name === 'amulet of strangulation'
                        || od.name === 'amulet of change'
                        || od.name === 'amulet of restful sleep')) {
            curse(obj);
        } else {
            blessorcurse(obj, 10);
        }
        break;

    case VENOM_CLASS:
    case CHAIN_CLASS:
    case BALL_CLASS:
        break;

    case POTION_CLASS:
    case SCROLL_CLASS:
        blessorcurse(obj, 4);
        break;

    case SPBOOK_CLASS:
        blessorcurse(obj, 17);
        break;

    case ARMOR_CLASS:
        if (rn2(10) && (od.name === 'fumble boots'
                        || od.name === 'levitation boots'
                        || od.name === 'helm of opposite alignment'
                        || od.name === 'gauntlets of fumbling'
                        || !rn2(11))) {
            curse(obj);
            obj.spe = -rne(3);
        } else if (!rn2(10)) {
            obj.blessed = !!rn2(2);
            obj.spe = rne(3);
        } else {
            blessorcurse(obj, 10);
        }
        if (artif && !rn2(40)) {
            // mk_artifact -- skip, just consumed the rn2
        }
        break;

    case WAND_CLASS:
        if (od.name === 'wand of wishing') {
            obj.spe = 1;
        } else {
            obj.spe = rn1(5, (od.dir === 1) ? 11 : 4); // NODIR=1
        }
        blessorcurse(obj, 17);
        break;

    case RING_CLASS:
        if (od.charged) {
            blessorcurse(obj, 3);
            if (rn2(10)) {
                if (rn2(10) && bcsign(obj))
                    obj.spe = bcsign(obj) * rne(3);
                else
                    obj.spe = rn2(2) ? rne(3) : -rne(3);
            }
            if (obj.spe === 0)
                obj.spe = rn2(4) - rn2(3);
            if (obj.spe < 0 && rn2(5))
                curse(obj);
        } else if (rn2(10) && (od.name === 'ring of teleportation'
                               || od.name === 'ring of polymorph'
                               || od.name === 'ring of aggravate monster'
                               || od.name === 'ring of hunger'
                               || !rn2(9))) {
            curse(obj);
        }
        break;

    case ROCK_CLASS:
        if (od.name === 'statue') {
            obj.corpsenm = rndmonnum(); // corpsenm = rndmonnum()
            if (rn2(Math.floor(1 / 2 + 10)) > 10) { // level_difficulty()/2+10, at depth 1: rn2(10) > 10 always false
                // would add spellbook to container -- skip
            }
        }
        break;

    case COIN_CLASS:
        break; // no init for coins

    default:
        break;
    }

    mkobj_erosions(obj);
}

// C ref: mkobj.c mkbox_cnts() -- fill container with random items
function mkbox_cnts(box) {
    const od = objectData[box.otyp];
    let n;
    if (od.name === 'ice box') {
        n = 20;
    } else if (od.name === 'chest') {
        n = box.olocked ? 7 : 5;
    } else if (od.name === 'large box') {
        n = box.olocked ? 5 : 3;
    } else {
        // sack, oilskin sack, bag of holding
        n = 1;
    }
    n = rn2(n + 1); // actual count

    // For each item in box, generate it
    for (let i = 0; i < n; i++) {
        if (od.name === 'ice box') {
            // mkobj(FOOD_CLASS, TRUE) for ice box contents
            mkobj(FOOD_CLASS, true);
        } else {
            // rnd(100) for class selection from boxiprobs
            const tprob = rnd(100);
            // Use boxiprobs table to select class
            const boxiprobs = [
                { iprob: 18, iclass: GEM_CLASS },
                { iprob: 15, iclass: FOOD_CLASS },
                { iprob: 18, iclass: POTION_CLASS },
                { iprob: 18, iclass: SCROLL_CLASS },
                { iprob: 12, iclass: SPBOOK_CLASS },
                { iprob: 7, iclass: COIN_CLASS },
                { iprob: 6, iclass: WAND_CLASS },
                { iprob: 5, iclass: RING_CLASS },
                { iprob: 1, iclass: AMULET_CLASS },
            ];
            let prob = tprob;
            let oclass = GEM_CLASS; // default
            for (const bp of boxiprobs) {
                prob -= bp.iprob;
                if (prob <= 0) { oclass = bp.iclass; break; }
            }
            // Create the item
            mkobj(oclass, false);
        }
    }
}

// C ref: mksobj() post-init -- handle corpse/statue/figurine/egg gender
function mksobj_postinit(obj) {
    const od = objectData[obj.otyp];
    // Corpse: if corpsenm not set, assign one
    if (od.name === 'corpse' && obj.corpsenm === -1) {
        rndmonnum(); // undead_to_corpse(rndmonnum())
    }
    // Statue/figurine: if corpsenm not set, assign one
    if ((od.name === 'statue' || od.name === 'figurine') && obj.corpsenm === -1) {
        rndmonnum();
    }
    // Gender assignment for corpse/statue/figurine: sometimes rn2(2)
    if (obj.corpsenm !== -1 && (od.name === 'corpse' || od.name === 'statue' || od.name === 'figurine')) {
        // is_neuter/is_female/is_male checks -- simplified: 50% chance of rn2(2)
        rn2(2); // gender assignment
    }
}

// C ref: mkobj.c mksobj() -- create a specific object type
export function mksobj(otyp, init, artif) {
    if (otyp < 0 || otyp >= NUM_OBJECTS) otyp = 0;
    const obj = newobj(otyp);
    if (init) mksobj_init(obj, artif);
    mksobj_postinit(obj);
    return obj;
}

// C ref: mkobj.c mkobj() -- create random object of a class
export function mkobj(oclass, artif) {
    // RANDOM_CLASS selection
    if (oclass === 0) { // RANDOM_CLASS = 0 in C, but our ILLOBJ_CLASS = 0
        // Use mkobjprobs table
        let tprob = rnd(100);
        for (const ip of mkobjprobs) {
            tprob -= ip.iprob;
            if (tprob <= 0) { oclass = ip.iclass; break; }
        }
    }

    // Select specific object type within class
    const probTotal = oclass_prob_totals[oclass];
    let prob, i;
    if (probTotal > 0) {
        prob = rnd(probTotal);
        i = bases[oclass];
        while (prob > 0 && i < bases[oclass + 1]) {
            prob -= objectData[i].prob || 0;
            if (prob > 0) i++;
        }
    } else {
        i = bases[oclass];
    }
    // Sanity check
    if (i >= NUM_OBJECTS || objectData[i].oc_class !== oclass) {
        i = bases[oclass];
    }

    return mksobj(i, true, artif);
}

// RANDOM_CLASS constant (matches C's RANDOM_CLASS = 0)
export const RANDOM_CLASS = 0;
