// mkobj.js -- Object creation
// Faithful port of mkobj.c from NetHack 3.7
// C ref: mkobj.c — object creation, class initialization, containers

import { rn2, rnd, rn1, rne, rnz, d } from './rng.js';
import {
    objectData, bases, oclass_prob_totals, mkobjprobs, NUM_OBJECTS,
    ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
    TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS,
    CHAIN_CLASS, VENOM_CLASS,
    IRON, COPPER, WOOD, PLASTIC, GLASS, DRAGON_HIDE, LIQUID,
    ARROW, DART, ROCK,
    GOLD_PIECE, DILITHIUM_CRYSTAL, LOADSTONE,
    WAN_CANCELLATION, WAN_LIGHT, WAN_LIGHTNING,
    BAG_OF_HOLDING, OILSKIN_SACK, BAG_OF_TRICKS, SACK,
    LARGE_BOX, CHEST, ICE_BOX, CORPSE, STATUE,
    CLASS_SYMBOLS,
    initObjectData,
} from './objects.js';
import { rndmonnum } from './makemon.js';
import { mons, G_NOCORPSE, M2_NEUTER, M2_FEMALE, M2_MALE } from './monsters.js';

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

// Module-level depth for level_difficulty() during mklev
let _levelDepth = 1;
export function setLevelDepth(d) { _levelDepth = d; }

// C ref: objnam.c rnd_class() -- pick random object in index range by probability
function rnd_class(first, last) {
    let sum = 0;
    for (let i = first; i <= last; i++)
        sum += objectData[i].prob || 0;
    if (!sum) return rn1(last - first + 1, first);
    let x = rnd(sum);
    for (let i = first; i <= last; i++) {
        x -= objectData[i].prob || 0;
        if (x <= 0) return i;
    }
    return first;
}

// C ref: Is_mbag() -- is object a magic bag?
function is_mbag(obj) {
    return obj.otyp === BAG_OF_HOLDING || obj.otyp === BAG_OF_TRICKS
        || obj.otyp === OILSKIN_SACK;
}

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

// C ref: Is_container(otmp) — is object a container?
function Is_container(obj) {
    return obj.otyp === LARGE_BOX || obj.otyp === CHEST || obj.otyp === ICE_BOX
        || obj.otyp === SACK || obj.otyp === OILSKIN_SACK
        || obj.otyp === BAG_OF_HOLDING || obj.otyp === BAG_OF_TRICKS;
}

// C ref: mkobj.c weight() — compute actual weight of an object
// Considers quantity, corpse type, container contents, coins
export function weight(obj) {
    let wt = objectData[obj.otyp].weight;
    if (obj.quan < 1) return 0;
    if (Is_container(obj) || obj.otyp === STATUE) {
        if (obj.otyp === STATUE && obj.corpsenm >= 0 && obj.corpsenm < mons.length) {
            wt = Math.floor(3 * mons[obj.corpsenm].weight / 2);
            const msize = mons[obj.corpsenm].size || 0;
            const minwt = (msize * 2 + 1) * 100;
            if (wt < minwt) wt = minwt;
        }
        // Container contents weight — cobj not tracked in JS yet, so cwt=0
        let cwt = 0;
        if (obj.cobj) {
            for (const c of obj.cobj) cwt += weight(c);
            if (obj.otyp === BAG_OF_HOLDING)
                cwt = obj.cursed ? (cwt * 2)
                    : obj.blessed ? Math.floor((cwt + 3) / 4)
                    : Math.floor((cwt + 1) / 2);
        }
        return wt + cwt;
    }
    if (obj.otyp === CORPSE && obj.corpsenm >= 0 && obj.corpsenm < mons.length) {
        return obj.quan * mons[obj.corpsenm].weight;
    }
    if (obj.oclass === COIN_CLASS) {
        return Math.max(Math.floor((obj.quan + 50) / 100), 1);
    }
    return wt ? wt * obj.quan : (obj.quan + 1) >> 1;
}

// Helper: can object generate eroded?
function may_generate_eroded(obj) {
    // C ref: may_generate_eroded + erosion_matters
    // erosion_matters returns true only for WEAPON, ARMOR, BALL, CHAIN,
    // and TOOL_CLASS items that are weptools (oc_skill != P_NONE)
    const od = objectData[obj.otyp];
    switch (obj.oclass) {
    case WEAPON_CLASS:
    case ARMOR_CLASS:
    case BALL_CLASS:
    case CHAIN_CLASS:
        return true;
    case TOOL_CLASS:
        // C ref: is_weptool(o) = oclass==TOOL_CLASS && oc_skill != P_NONE
        // In objects.js, 'sub' field = oc_skill
        return (od.sub || 0) !== 0;
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
        displayChar: CLASS_SYMBOLS[objectData[otyp].oc_class] || '?',
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

// rndmonnum imported from makemon.js (circular but safe — called at runtime only)

// C ref: mon.c undead_to_corpse() — map undead monsters to their living form
function undead_to_corpse(mndx) {
    const ptr = objectData.length > 0 ? mons[mndx] : null;
    if (!ptr) return mndx;
    const name = ptr.name;
    // Zombie → living
    if (name === 'kobold zombie' || name === 'kobold mummy') return mons.findIndex(m => m.name === 'kobold');
    if (name === 'dwarf zombie' || name === 'dwarf mummy') return mons.findIndex(m => m.name === 'dwarf');
    if (name === 'gnome zombie' || name === 'gnome mummy') return mons.findIndex(m => m.name === 'gnome');
    if (name === 'orc zombie' || name === 'orc mummy') return mons.findIndex(m => m.name === 'orc');
    if (name === 'elf zombie' || name === 'elf mummy') return mons.findIndex(m => m.name === 'elf');
    if (name === 'human zombie' || name === 'human mummy'
        || name === 'vampire' || name === 'vampire lord') return mons.findIndex(m => m.name === 'human');
    if (name === 'giant zombie' || name === 'giant mummy') return mons.findIndex(m => m.name === 'giant');
    if (name === 'ettin zombie' || name === 'ettin mummy') return mons.findIndex(m => m.name === 'ettin');
    return mndx;
}
// Cache the lookups (lazy init on first call)
let _undead_cache = null;
function undead_to_corpse_fast(mndx) {
    if (!_undead_cache) {
        _undead_cache = new Map();
        const targets = [
            [['kobold zombie', 'kobold mummy'], 'kobold'],
            [['dwarf zombie', 'dwarf mummy'], 'dwarf'],
            [['gnome zombie', 'gnome mummy'], 'gnome'],
            [['orc zombie', 'orc mummy'], 'orc'],
            [['elf zombie', 'elf mummy'], 'elf'],
            [['human zombie', 'human mummy', 'vampire', 'vampire lord'], 'human'],
            [['giant zombie', 'giant mummy'], 'giant'],
            [['ettin zombie', 'ettin mummy'], 'ettin'],
        ];
        for (const [srcs, tgt] of targets) {
            const tgtIdx = mons.findIndex(m => m.name === tgt);
            for (const src of srcs) {
                const srcIdx = mons.findIndex(m => m.name === src);
                if (srcIdx >= 0 && tgtIdx >= 0) _undead_cache.set(srcIdx, tgtIdx);
            }
        }
    }
    return _undead_cache.has(mndx) ? _undead_cache.get(mndx) : mndx;
}

// C ref: mkobj.c mksobj_init() -- class-specific object initialization
// skipErosion: if true, skip mkobj_erosions (used by ini_inv — C's mksobj
// path for starting inventory doesn't include erosion)
function mksobj_init(obj, artif, skipErosion) {
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
            // C ref: mkobj.c:900-910 — retry if G_NOCORPSE
            let tryct = 50;
            do {
                obj.corpsenm = undead_to_corpse_fast(rndmonnum());
            } while (obj.corpsenm >= 0
                     && (mons[obj.corpsenm].geno & G_NOCORPSE)
                     && --tryct > 0);
            if (tryct === 0) obj.corpsenm = mons.findIndex(m => m.name === 'human');
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
                // C ref: mkobj.c:930-937 — retry until cnutrit && !G_NOCORPSE
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = undead_to_corpse_fast(rndmonnum());
                    if (mndx >= 0 && mons[mndx].nutrition > 0
                        && !(mons[mndx].geno & G_NOCORPSE)) {
                        obj.corpsenm = mndx;
                        rn2(10); // set_tin_variety RANDOM_TIN: rn2(TTSZ-1) = rn2(10)
                        break;
                    }
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

    if (!skipErosion) mkobj_erosions(obj);
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
            const otmp = mkobj(oclass, false);
            if (!otmp) continue;

            // C ref: mkobj.c:360-370 — coin quantity and rock substitution
            if (otmp.oclass === COIN_CLASS) {
                // C ref: rnd(level_difficulty() + 2) * rnd(75)
                rnd(_levelDepth + 2);
                rnd(75);
            } else {
                // C ref: while (otmp->otyp == ROCK) rnd_class(...)
                while (otmp.otyp === ROCK) {
                    otmp.otyp = rnd_class(DILITHIUM_CRYSTAL, LOADSTONE);
                }
            }
            // C ref: mkobj.c:371-378 — bag of holding special cases
            if (box.otyp === BAG_OF_HOLDING) {
                if (is_mbag(otmp)) {
                    otmp.otyp = SACK;
                } else {
                    while (otmp.otyp === WAN_CANCELLATION) {
                        otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
                    }
                }
            }
        }
    }
}

// C ref: mksobj() post-init -- handle corpse/statue/figurine/egg gender
// C ref: mkobj.c:1196-1225
function mksobj_postinit(obj) {
    const od = objectData[obj.otyp];
    // Corpse: if corpsenm not set, assign one
    if (od.name === 'corpse' && obj.corpsenm === -1) {
        obj.corpsenm = undead_to_corpse_fast(rndmonnum());
    }
    // Statue/figurine: if corpsenm not set, assign one
    if ((od.name === 'statue' || od.name === 'figurine') && obj.corpsenm === -1) {
        rndmonnum();
    }
    // Gender assignment for corpse/statue/figurine
    // C ref: mkobj.c:1215-1218 — only rn2(2) if not neuter/female/male
    if (obj.corpsenm >= 0 && (od.name === 'corpse' || od.name === 'statue' || od.name === 'figurine')) {
        const ptr = mons[obj.corpsenm];
        const isNeuter = !!(ptr.flags2 & M2_NEUTER);
        const isFemale = !!(ptr.flags2 & M2_FEMALE);
        const isMale   = !!(ptr.flags2 & M2_MALE);
        if (!isNeuter && !isFemale && !isMale) {
            rn2(2); // random gender
        }
    }
    // C ref: mkobj.c:1224 set_corpsenm → start_corpse_timeout for CORPSE
    // start_corpse_timeout calls rnz(rot_adjust) where rot_adjust=25 at depth 1
    if (od.name === 'corpse' && obj.corpsenm >= 0) {
        rnz(25); // start_corpse_timeout
    }
}

// C ref: mkobj.c mksobj() -- create a specific object type
// skipErosion: if true, skip mkobj_erosions (for ini_inv items)
export function mksobj(otyp, init, artif, skipErosion) {
    if (otyp < 0 || otyp >= NUM_OBJECTS) otyp = 0;
    const obj = newobj(otyp);
    if (init) mksobj_init(obj, artif, skipErosion);
    mksobj_postinit(obj);
    // C ref: mkobj.c — otmp->owt = weight(otmp) after full initialization
    obj.owt = weight(obj);
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

// ========================================================================
// Legacy object creation (simplified, non-C-faithful)
// Used by some tests
// ========================================================================

import { CLR_BLACK, CLR_CYAN, CLR_BROWN, CLR_GRAY, CLR_WHITE, CLR_YELLOW,
         CLR_RED, CLR_GREEN, CLR_BLUE, CLR_MAGENTA, CLR_ORANGE,
         CLR_BRIGHT_GREEN, CLR_BRIGHT_BLUE, HI_METAL, HI_GOLD } from './display.js';
import { COLNO, ROWNO, ACCESSIBLE } from './config.js';

export const objectTypes = [
    { name: 'orcish dagger',       oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 10, cost: 4, damage: [1,3], large_damage: [1,3] },
    { name: 'dagger',              oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 10, cost: 4, damage: [1,4], large_damage: [1,3] },
    { name: 'knife',               oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 5, cost: 4, damage: [1,3], large_damage: [1,2] },
    { name: 'short sword',         oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 30, cost: 10, damage: [1,6], large_damage: [1,8] },
    { name: 'orcish short sword',  oc_class: WEAPON_CLASS, symbol: ')', color: CLR_BLACK, weight: 30, cost: 10, damage: [1,5], large_damage: [1,8] },
    { name: 'long sword',          oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 40, cost: 15, damage: [1,8], large_damage: [1,12] },
    { name: 'mace',                oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 30, cost: 5, damage: [1,6], large_damage: [1,6] },
    { name: 'war hammer',          oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 50, cost: 5, damage: [1,4], large_damage: [1,4] },
    { name: 'club',                oc_class: WEAPON_CLASS, symbol: ')', color: CLR_BROWN, weight: 30, cost: 3, damage: [1,6], large_damage: [1,3] },
    { name: 'spear',               oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 30, cost: 3, damage: [1,6], large_damage: [1,8] },
    { name: 'bow',                 oc_class: WEAPON_CLASS, symbol: ')', color: CLR_BROWN, weight: 30, cost: 60, damage: [1,2], large_damage: [1,2] },
    { name: 'arrow',               oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 1, cost: 2, damage: [1,6], large_damage: [1,6], stackable: true },
    { name: 'leather armor',       oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 150, cost: 5, ac: 8 },
    { name: 'studded leather armor', oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 200, cost: 15, ac: 7 },
    { name: 'ring mail',           oc_class: ARMOR_CLASS, symbol: '[', color: HI_METAL, weight: 250, cost: 100, ac: 7 },
    { name: 'scale mail',          oc_class: ARMOR_CLASS, symbol: '[', color: HI_METAL, weight: 250, cost: 45, ac: 6 },
    { name: 'chain mail',          oc_class: ARMOR_CLASS, symbol: '[', color: HI_METAL, weight: 300, cost: 75, ac: 5 },
    { name: 'small shield',        oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 30, cost: 3, ac: 9, isShield: true },
    { name: 'leather gloves',      oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 10, cost: 8, ac: 9, isGloves: true },
    { name: 'low boots',           oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 10, cost: 8, ac: 9, isBoots: true },
    { name: 'helmet',              oc_class: ARMOR_CLASS, symbol: '[', color: HI_METAL, weight: 30, cost: 10, ac: 9, isHelmet: true },
    { name: 'elven cloak',         oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BLACK, weight: 10, cost: 60, ac: 9, isCloak: true },
    { name: 'food ration',         oc_class: FOOD_CLASS, symbol: '%', color: CLR_BROWN, weight: 20, cost: 45, nutrition: 800 },
    { name: 'apple',               oc_class: FOOD_CLASS, symbol: '%', color: CLR_RED, weight: 2, cost: 7, nutrition: 50 },
    { name: 'melon',               oc_class: FOOD_CLASS, symbol: '%', color: CLR_BRIGHT_GREEN, weight: 5, cost: 10, nutrition: 100 },
    { name: 'tripe ration',        oc_class: FOOD_CLASS, symbol: '%', color: CLR_BROWN, weight: 10, cost: 15, nutrition: 200 },
    { name: 'corpse',              oc_class: FOOD_CLASS, symbol: '%', color: CLR_BROWN, weight: 0, cost: 0, nutrition: 0 },
    { name: 'potion of healing',   oc_class: POTION_CLASS, symbol: '!', color: CLR_MAGENTA, weight: 20, cost: 100 },
    { name: 'potion of extra healing', oc_class: POTION_CLASS, symbol: '!', color: CLR_GREEN, weight: 20, cost: 100 },
    { name: 'potion of water',     oc_class: POTION_CLASS, symbol: '!', color: CLR_BLUE, weight: 20, cost: 100 },
    { name: 'scroll of identify',  oc_class: SCROLL_CLASS, symbol: '?', color: CLR_WHITE, weight: 5, cost: 20 },
    { name: 'scroll of teleportation', oc_class: SCROLL_CLASS, symbol: '?', color: CLR_WHITE, weight: 5, cost: 100 },
    { name: 'scroll of enchant weapon', oc_class: SCROLL_CLASS, symbol: '?', color: CLR_WHITE, weight: 5, cost: 60 },
    { name: 'scroll of enchant armor', oc_class: SCROLL_CLASS, symbol: '?', color: CLR_WHITE, weight: 5, cost: 80 },
    { name: 'gold piece',          oc_class: COIN_CLASS, symbol: '$', color: HI_GOLD, weight: 1, cost: 1, stackable: true },
    { name: 'worthless piece of glass', oc_class: GEM_CLASS, symbol: '*', color: CLR_GREEN, weight: 1, cost: 0 },
    { name: 'rock',                oc_class: ROCK_CLASS, symbol: '`', color: CLR_GRAY, weight: 10, cost: 0, stackable: true },
    { name: 'skeleton key',        oc_class: TOOL_CLASS, symbol: '(', color: HI_METAL, weight: 3, cost: 10 },
    { name: 'lamp',                oc_class: TOOL_CLASS, symbol: '(', color: CLR_YELLOW, weight: 20, cost: 10 },
    { name: 'pick-axe',            oc_class: TOOL_CLASS, symbol: '(', color: HI_METAL, weight: 100, cost: 50 },
    { name: 'wand of striking',    oc_class: WAND_CLASS, symbol: '/', color: HI_METAL, weight: 7, cost: 150, charges: [3,5] },
    { name: 'wand of fire',        oc_class: WAND_CLASS, symbol: '/', color: CLR_ORANGE, weight: 7, cost: 175, charges: [4,8] },
    { name: 'wand of cold',        oc_class: WAND_CLASS, symbol: '/', color: CLR_BRIGHT_BLUE, weight: 7, cost: 175, charges: [4,8] },
];

export function createObject(typeOrNull, x, y) {
    let type;
    if (typeOrNull) {
        type = typeOrNull;
    } else {
        type = objectTypes[rn2(objectTypes.length)];
    }
    return {
        type: type,
        name: type.name,
        displayChar: type.symbol || CLASS_SYMBOLS[type.oc_class] || '?',
        displayColor: type.color || CLR_GRAY,
        oc_class: type.oc_class,
        ox: x, oy: y,
        weight: type.weight || 0,
        cost: type.cost || 0,
        invlet: '',
        quantity: 1,
        blessed: false, cursed: false, known: false,
        enchantment: 0,
        damage: type.damage || null,
        large_damage: type.large_damage || null,
        ac: type.ac || 0,
        nutrition: type.nutrition || 0,
        charges: type.charges ? rn1(type.charges[1] - type.charges[0] + 1, type.charges[0]) : 0,
        stackable: type.stackable || false,
    };
}

export function populateObjects(map, depth) {
    const numObjects = rn1(5, 3 + Math.floor(depth / 2));
    for (let i = 0; i < numObjects; i++) {
        for (let attempts = 0; attempts < 100; attempts++) {
            const x = rn1(COLNO - 4, 2);
            const y = rn1(ROWNO - 4, 2);
            const loc = map.at(x, y);
            if (loc && ACCESSIBLE(loc.typ)) {
                let type;
                if (rn2(5) === 0) {
                    type = objectTypes.find(t => t.name === 'gold piece');
                } else {
                    const nonGold = objectTypes.filter(t => t.oc_class !== COIN_CLASS);
                    type = nonGold[rn2(nonGold.length)];
                }
                const obj = createObject(type, x, y);
                if (obj.oc_class === COIN_CLASS) {
                    obj.quantity = rn1(20 * depth, 5);
                }
                map.objects.push(obj);
                break;
            }
        }
    }
}
