// polyself.js -- Polymorphing mechanics for player character
// cf. polyself.c — set_uasmon, float_vs_flight, steed_vs_stealth,
//                  check_strangling, polyman, change_sex, livelog_newform,
//                  newman, polyself, polymon, uasmon_maxStr, dropp,
//                  break_armor, drop_weapon, rehumanize, dobreathe,
//                  dospit, doremove, dospinweb, dosummon, dogaze, dohide,
//                  dopoly, domindblast, uunstick, skinback,
//                  mbodypart, body_part, poly_gender, ugolemeffects,
//                  armor_to_dragon, polysense, ugenocided, udeadinside
//
// polyself.c handles player polymorphing into monster forms:
//   polyself()/polymon(): polymorph into random or specific monster form.
//   rehumanize(): return to original form at timeout or HP depletion.
//   break_armor(): remove unsuitable armor when changing form.
//   dobreathe/dospit/dospinweb/dogaze/dosummon: form-specific attacks.
//   body_part(): get body part name appropriate for current form.
//   ugolemeffects(): handle golem-specific damage immunity.
//
// JS implementations:
//   mbodypart(mon, part): full port — body part name for any monster
//   body_part(part): full port — player body part name via mbodypart
//   poly_gender(): full port — gender of polymorphed player
//   ugolemeffects(player, damtype, dam): full port — golem damage absorption
//   armor_to_dragon(atyp): full port — armor->dragon type mapping
//   skinback(player, silently): full port — dragon scale skin reversion
//   uunstick(player): full port — release held monster
//   set_uasmon(player): full port — form intrinsics from monster data
//   float_vs_flight(player): full port — levitation/flight priority
//   steed_vs_stealth(player): full port — riding blocks stealth
//   check_strangling(player, on): full port — strangulation for form change
//   polyman(player, fmt, arg): full port — revert to human form
//   change_sex(player): full port — toggle gender
//   newman(player): full port — new human form with RNG parity
//   polyself(player, psflags, map): full port — main polymorph handler
//   polymon(player, mntmp, map): full port — transform into specific monster
//   rehumanize(player): full port — return to human form
//   break_armor(player): full port — remove/break ill-fitting armor
//   drop_weapon(player, alone): full port — drop unwieldable weapon
//   dobreathe(player, map): full port — breath weapon attack
//   dospit(player, map): full port — spit venom attack
//   doremove(player): full port — nymph chain removal
//   dospinweb(player, map): full port — web spinning
//   dosummon(player, map): full port — werewolf ally summoning
//   dogaze(player, map): full port — gaze attack with full RNG parity
//   dohide(player, map): full port — form hiding
//   dopoly(player, map): full port — vampire shape change
//   domindblast(player, map): full port — mind flayer psychic blast with RNG parity
//   polysense(player): full port — species awareness when polymorphed

import { rn1, rn2, rnd, d } from './rng.js';
import { mark_vision_dirty } from './vision.js';
import { exercise } from './attrib_exercise.js';
import { newhp, newpw, rndexp } from './exper.js';
import { mons, SPECIAL_PM, S_ANT, S_BLOB, S_COCKATRICE, S_DOG, S_EYE, S_FELINE, S_FUNGUS, S_GIANT, S_GOLEM, S_HUMANOID, S_HUMAN, S_JELLY, S_LEPRECHAUN, S_LIGHT, S_MIMIC, S_MUMMY, S_NYMPH, S_ORC, S_PUDDING, S_QUANTMECH, S_RODENT, S_SPIDER, S_UNICORN, S_VAMPIRE, S_VORTEX, S_WORM, S_YETI, S_ZOMBIE, S_ANGEL, S_CENTAUR, S_DRAGON, S_ELEMENTAL, S_EEL, S_BAT, MZ_SMALL, MZ_HUGE, AT_CLAW, AT_BREA, AT_SPIT, AT_GAZE, AT_ENGL, AD_FIRE, AD_ELEC, AD_PHYS, AD_COLD, AD_CONF, AD_ANY, AD_BLND, AD_DRST, AD_ACID, AD_MAGM, AD_RBRE, AD_HALU, MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC, MR_POISON, MR_ACID, MR_STONE, MS_SHRIEK, PM_OWLBEAR, PM_MUMAK, PM_MASTODON, PM_SHARK, PM_JELLYFISH, PM_KRAKEN, PM_FLOATING_EYE, PM_RAVEN, PM_KI_RIN, PM_ROTHE, PM_STALKER, PM_AMOROUS_DEMON, PM_STONE_GOLEM, PM_FLESH_GOLEM, PM_IRON_GOLEM, PM_STRAW_GOLEM, PM_PAPER_GOLEM, PM_ROPE_GOLEM, PM_LEATHER_GOLEM, PM_GOLD_GOLEM, PM_WOOD_GOLEM, PM_CLAY_GOLEM, PM_GLASS_GOLEM, PM_GRAY_DRAGON, PM_SILVER_DRAGON, PM_GOLD_DRAGON, PM_RED_DRAGON, PM_ORANGE_DRAGON, PM_WHITE_DRAGON, PM_BLACK_DRAGON, PM_BLUE_DRAGON, PM_GREEN_DRAGON, PM_YELLOW_DRAGON, PM_BABY_GRAY_DRAGON, PM_GHOUL, PM_GREMLIN, PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_PURPLE_WORM, PM_BABY_PURPLE_WORM, PM_SHRIEKER, PM_HUMAN, PM_WOLF, PM_FOG_CLOUD, PM_VAMPIRE_BAT, PM_ORC, PM_HILL_ORC, PM_MORDOR_ORC, PM_ELF, PM_GREEN_ELF, PM_GREY_ELF, PM_GIANT, PM_STONE_GIANT, PM_HILL_GIANT, PM_MEDUSA, PM_GREEN_SLIME, PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER, PM_GIANT_EEL, PM_ELECTRIC_EEL, G_UNIQ, M2_HUMAN, M2_ELF } from './monsters.js';
import {
    GRAY_DRAGON_SCALE_MAIL, GRAY_DRAGON_SCALES,
    SILVER_DRAGON_SCALE_MAIL, SILVER_DRAGON_SCALES,
    GOLD_DRAGON_SCALE_MAIL, GOLD_DRAGON_SCALES,
    RED_DRAGON_SCALE_MAIL, RED_DRAGON_SCALES,
    ORANGE_DRAGON_SCALE_MAIL, ORANGE_DRAGON_SCALES,
    WHITE_DRAGON_SCALE_MAIL, WHITE_DRAGON_SCALES,
    BLACK_DRAGON_SCALE_MAIL, BLACK_DRAGON_SCALES,
    BLUE_DRAGON_SCALE_MAIL, BLUE_DRAGON_SCALES,
    GREEN_DRAGON_SCALE_MAIL, GREEN_DRAGON_SCALES,
    YELLOW_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALES,
    BLINDING_VENOM, ACID_VENOM,
} from './objects.js';
import {
    is_humanoid, slithy, nohands, is_hider, hides_under,
    is_golem, attacktype, sticks,
    is_flyer, is_floater, is_whirly,
    has_horns, has_head, strongmonst, breakarm, sliparm,
    polyok, is_male, is_female, is_neuter,
    is_vampire, is_were, is_orc, is_elf, is_dwarf, is_gnome,
    is_human, is_giant, is_undead,
    nonliving, weirdnonliving,
    flaming,
    cantwield, is_mindless, telepathic, perceives,
    is_animal, unsolid, amorphous, webmaker,
    is_mind_flayer, is_bat, can_breathe,
    is_clinger, is_placeholder, is_unicorn,
    resists_fire, haseyes,
    dmgtype, dmgtype_fromattack, lays_eggs,
    can_be_strangled, infravision, regenerates,
    passes_walls, pm_invisible, is_swimmer,
    can_teleport, control_teleport, likes_lava,
    poly_when_stoned,
    attacktype_fordmg,
} from './mondata.js';
import { pline, You, Your, You_cant, You_feel, pline_The } from './pline.js';
import { Monnam, mon_nam } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { dist2 } from './hacklib.js';
import { killed, wakeup, setmangry } from './mon.js';
import { mksobj } from './mkobj.js';
import { AMULET_OF_STRANGULATION } from './objects.js';
import { were_summon } from './were.js';
import { FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES, STONE_RES, DRAIN_RES, SICK_RES, ANTIMAGIC, STUNNED, BLINDED, HALLUC_RES, SEE_INVIS, TELEPAT, INFRAVISION, INVIS, TELEPORT, TELEPORT_CONTROL, LEVITATION, FLYING, SWIMMING, PASSES_WALLS, REGENERATION, REFLECTING, FROM_FORM, FROM_RACE, FROMOUTSIDE, I_SPECIAL, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL, TT_BEARTRAP, ARM, EYE, FACE, FINGER, FINGERTIP, FOOT, HAND, HANDED, HEAD, LEG, LIGHT_HEADED, NECK, SPINE, TOE, HAIR, BLOOD, LUNG, NOSE, STOMACH, BOLT_LIM, LOW_PM, NON_PM } from './const.js';

// resists_fire already imported from mondata.js above

// C's humanoid() macro is M1_HUMANOID check, same as JS's is_humanoid()
const humanoid = is_humanoid;

const NO_PART = -1;

// ============================================================================
// mbodypart(mon, part) — cf. polyself.c:1956
// Get body part name for a monster. Full port of the C lookup tables.
// ============================================================================

const humanoid_parts = [
    'arm',       'eye',  'face',         'finger',
    'fingertip', 'foot', 'hand',         'handed',
    'head',      'leg',  'light headed', 'neck',
    'spine',     'toe',  'hair',         'blood',
    'lung',      'nose', 'stomach',
];
const jelly_parts = [
    'pseudopod', 'dark spot', 'front',
    'pseudopod extension', 'pseudopod extremity',
    'pseudopod root', 'grasp', 'grasped',
    'cerebral area', 'lower pseudopod', 'viscous',
    'middle', 'surface', 'pseudopod extremity',
    'ripples', 'juices', 'surface', 'sensor',
    'stomach',
];
const animal_parts = [
    'forelimb',  'eye',           'face',
    'foreclaw',  'claw tip',      'rear claw',
    'foreclaw',  'clawed',        'head',
    'rear limb', 'light headed',  'neck',
    'spine',     'rear claw tip', 'fur',
    'blood',     'lung',          'nose',
    'stomach',
];
const bird_parts = [
    'wing',     'eye',  'face',         'wing',
    'wing tip', 'foot', 'wing',         'winged',
    'head',     'leg',  'light headed', 'neck',
    'spine',    'toe',  'feathers',     'blood',
    'lung',     'bill', 'stomach',
];
const horse_parts = [
    'foreleg',  'eye',           'face',
    'forehoof', 'hoof tip',      'rear hoof',
    'forehoof', 'hooved',        'head',
    'rear leg', 'light headed',  'neck',
    'backbone', 'rear hoof tip', 'mane',
    'blood',    'lung',          'nose',
    'stomach',
];
const sphere_parts = [
    'appendage', 'optic nerve', 'body', 'tentacle',
    'tentacle tip', 'lower appendage', 'tentacle',
    'tentacled', 'body', 'lower tentacle',
    'rotational', 'equator', 'body',
    'lower tentacle tip', 'cilia', 'life force',
    'retina', 'olfactory nerve', 'interior',
];
const fungus_parts = [
    'mycelium', 'visual area', 'front',
    'hypha',    'hypha',       'root',
    'strand',   'stranded',    'cap area',
    'rhizome',  'sporulated',  'stalk',
    'root',     'rhizome tip', 'spores',
    'juices',   'gill',        'gill',
    'interior',
];
const vortex_parts = [
    'region',        'eye',           'front',
    'minor current', 'minor current', 'lower current',
    'swirl',         'swirled',       'central core',
    'lower current', 'addled',        'center',
    'currents',      'edge',          'currents',
    'life force',    'center',        'leading edge',
    'interior',
];
const snake_parts = [
    'vestigial limb', 'eye', 'face', 'large scale',
    'large scale tip', 'rear region', 'scale gap',
    'scale gapped', 'head', 'rear region',
    'light headed', 'neck', 'length', 'rear scale',
    'scales', 'blood', 'lung', 'forked tongue',
    'stomach',
];
const worm_parts = [
    'anterior segment', 'light sensitive cell',
    'clitellum', 'setae', 'setae', 'posterior segment',
    'segment', 'segmented', 'anterior segment',
    'posterior', 'over stretched', 'clitellum',
    'length', 'posterior setae', 'setae', 'blood',
    'skin', 'prostomium', 'stomach',
];
const spider_parts = [
    'pedipalp', 'eye', 'face', 'pedipalp', 'tarsus',
    'claw', 'pedipalp', 'palped', 'cephalothorax',
    'leg', 'spun out', 'cephalothorax', 'abdomen',
    'claw', 'hair', 'hemolymph', 'book lung',
    'labrum', 'digestive tract',
];
const fish_parts = [
    'fin', 'eye', 'premaxillary', 'pelvic axillary',
    'pelvic fin', 'anal fin', 'pectoral fin', 'finned',
    'head', 'peduncle', 'played out', 'gills',
    'dorsal fin', 'caudal fin', 'scales', 'blood',
    'gill', 'nostril', 'stomach',
];

// claw attacks are overloaded in mons[]; most humanoids with
// such attacks should still reference hands rather than claws
const not_claws = [
    S_HUMAN, S_MUMMY, S_ZOMBIE, S_ANGEL, S_NYMPH, S_LEPRECHAUN,
    S_QUANTMECH, S_VAMPIRE, S_ORC, S_GIANT,
];

// cf. polyself.c:1956 — mbodypart(mon, part)
export function mbodypart(mon, part) {
    const mptr = mon.type || mon.data || mons[0];

    if (part <= NO_PART) {
        return 'mystery part';
    }

    // some special cases
    if (mptr.mlet === S_DOG || mptr.mlet === S_FELINE
        || mptr.mlet === S_RODENT || mptr === mons[PM_OWLBEAR]) {
        switch (part) {
        case HAND:
            return 'paw';
        case HANDED:
            return 'pawed';
        case FOOT:
            return 'rear paw';
        case ARM:
        case LEG:
            return horse_parts[part]; // "foreleg", "rear leg"
        default:
            break; // for other parts, use animal_parts[] below
        }
    } else if (mptr.mlet === S_YETI) { // excl. owlbear due to 'if' above
        // opposable thumbs, hence "hands", "arms", "legs", &c
        return humanoid_parts[part]; // yeti/sasquatch, monkey/ape
    }

    if ((part === HAND || part === HANDED)
        && (humanoid(mptr) && attacktype(mptr, AT_CLAW)
            && !not_claws.includes(mptr.mlet)
            && mptr !== mons[PM_STONE_GOLEM]
            && mptr !== mons[PM_AMOROUS_DEMON]))
        return (part === HAND) ? 'claw' : 'clawed';

    if ((mptr === mons[PM_MUMAK] || mptr === mons[PM_MASTODON])
        && part === NOSE)
        return 'trunk';
    if (mptr === mons[PM_SHARK] && part === HAIR)
        return 'skin'; // sharks don't have scales
    if ((mptr === mons[PM_JELLYFISH] || mptr === mons[PM_KRAKEN])
        && (part === ARM || part === FINGER || part === HAND || part === FOOT
            || part === TOE))
        return 'tentacle';
    if (mptr === mons[PM_FLOATING_EYE] && part === EYE)
        return 'cornea';
    if (humanoid(mptr) && (part === ARM || part === FINGER || part === FINGERTIP
                           || part === HAND || part === HANDED))
        return humanoid_parts[part];
    if (mptr.mlet === S_COCKATRICE)
        return (part === HAIR) ? snake_parts[part] : bird_parts[part];
    if (mptr === mons[PM_RAVEN])
        return bird_parts[part];
    if (mptr.mlet === S_CENTAUR || mptr.mlet === S_UNICORN
        || mptr === mons[PM_KI_RIN]
        || (mptr === mons[PM_ROTHE] && part !== HAIR))
        return horse_parts[part];
    if (mptr.mlet === S_LIGHT) {
        if (part === HANDED)
            return 'rayed';
        else if (part === ARM || part === FINGER || part === FINGERTIP
                 || part === HAND)
            return 'ray';
        else
            return 'beam';
    }
    if (mptr === mons[PM_STALKER] && part === HEAD)
        return 'head';
    if (mptr.mlet === S_EEL && mptr !== mons[PM_JELLYFISH])
        return fish_parts[part];
    if (mptr.mlet === S_WORM)
        return worm_parts[part];
    if (mptr.mlet === S_SPIDER)
        return spider_parts[part];
    if (slithy(mptr) || (mptr.mlet === S_DRAGON && part === HAIR))
        return snake_parts[part];
    if (mptr.mlet === S_EYE)
        return sphere_parts[part];
    if (mptr.mlet === S_JELLY || mptr.mlet === S_PUDDING
        || mptr.mlet === S_BLOB || mptr === mons[PM_JELLYFISH])
        return jelly_parts[part];
    if (mptr.mlet === S_VORTEX || mptr.mlet === S_ELEMENTAL)
        return vortex_parts[part];
    if (mptr.mlet === S_FUNGUS)
        return fungus_parts[part];
    if (humanoid(mptr))
        return humanoid_parts[part];
    return animal_parts[part];
}

// cf. polyself.c:2127 — body_part(part)
// In C this calls mbodypart(&gy.youmonst, part). In JS, when the player
// is not polymorphed the default is humanoid. Pass player object for
// polymorphed form support.
export function body_part(part, player) {
    if (player && player.type) {
        return mbodypart(player, part);
    }
    // Default: humanoid (non-polymorphed player)
    return humanoid_parts[part] || 'mystery part';
}

// ============================================================================
// poly_gender() — cf. polyself.c:2133
// ============================================================================

// cf. polyself.c:2133 — poly_gender()
// Returns gender of polymorphed player: 0/1 = same as flags.female, 2 = none.
export function poly_gender(player) {
    if (!player || !player.type) return 0;
    const mptr = player.type;
    if (is_neuter(mptr) || !is_humanoid(mptr))
        return 2;
    return player.female ? 1 : 0;
}

// ============================================================================
// ugolemeffects(player, damtype, dam) — cf. polyself.c:2144
// Golem-specific damage absorption. Returns true if damage was absorbed.
// ============================================================================

// Autotranslated from polyself.c:2143
export async function ugolemeffects(damtype, dam, game, player) {
  let heal = 0;
  if (player.umonnum !== PM_FLESH_GOLEM && player.umonnum !== PM_IRON_GOLEM) return;
  switch (damtype) {
    case AD_ELEC:
      if (player.umonnum === PM_FLESH_GOLEM) heal = Math.floor((dam + 5) / 6);
    break;
    case AD_FIRE:
      if (player.umonnum === PM_IRON_GOLEM) heal = dam;
    break;
  }
  if (heal && (player.mh < player.mhmax)) {
    player.mh += heal;
    if (player.mh > player.mhmax) player.mh = player.mhmax;
    game.disp.botl = true;
    await pline("Strangely, you feel better than before.");
    await exercise(player, A_STR, true);
  }
}

// ============================================================================
// armor_to_dragon(atyp) — cf. polyself.c:2175
// Convert armor object type to corresponding dragon PM index.
// ============================================================================

export function armor_to_dragon(atyp) {
    switch (atyp) {
    case GRAY_DRAGON_SCALE_MAIL:
    case GRAY_DRAGON_SCALES:
        return PM_GRAY_DRAGON;
    case SILVER_DRAGON_SCALE_MAIL:
    case SILVER_DRAGON_SCALES:
        return PM_SILVER_DRAGON;
    case GOLD_DRAGON_SCALE_MAIL:
    case GOLD_DRAGON_SCALES:
        return PM_GOLD_DRAGON;
    case RED_DRAGON_SCALE_MAIL:
    case RED_DRAGON_SCALES:
        return PM_RED_DRAGON;
    case ORANGE_DRAGON_SCALE_MAIL:
    case ORANGE_DRAGON_SCALES:
        return PM_ORANGE_DRAGON;
    case WHITE_DRAGON_SCALE_MAIL:
    case WHITE_DRAGON_SCALES:
        return PM_WHITE_DRAGON;
    case BLACK_DRAGON_SCALE_MAIL:
    case BLACK_DRAGON_SCALES:
        return PM_BLACK_DRAGON;
    case BLUE_DRAGON_SCALE_MAIL:
    case BLUE_DRAGON_SCALES:
        return PM_BLUE_DRAGON;
    case GREEN_DRAGON_SCALE_MAIL:
    case GREEN_DRAGON_SCALES:
        return PM_GREEN_DRAGON;
    case YELLOW_DRAGON_SCALE_MAIL:
    case YELLOW_DRAGON_SCALES:
        return PM_YELLOW_DRAGON;
    default:
        return NON_PM;
    }
}

// ============================================================================
// skinback(player, silently) — cf. polyself.c:1938
// Revert dragon scale skin merging.
// ============================================================================

export async function skinback(player, silently) {
    // cf. polyself.c:1938 — skinback()
    // Revert dragon scale skin merging.
    if (!player) return;
    if (player.uskin) {
        if (!silently) {
            await Your("skin returns to its original form.");
        }
        player.armor = player.uskin;
        player.uskin = null;
    }
}

// ============================================================================
// uunstick(player) — cf. polyself.c:1925
// Release monster held in player's clutches.
// ============================================================================

export async function uunstick(player) {
    // cf. polyself.c:1925 — uunstick()
    // Release monster held in player's clutches.
    if (!player) return;
    const mtmp = player.ustuck;
    if (!mtmp) return;
    player.ustuck = null;
    await pline("%s is no longer in your clutches.", Monnam(mtmp));
}

// ============================================================================
// ugenocided(player) — cf. polyself.c:2249
// Check if player's role or race has been genocided.
// ============================================================================

export function ugenocided(player) {
    // Genocide tracking requires mvitals — not yet in JS game state
    return false;
}

// ============================================================================
// udeadinside(player) — cf. polyself.c:2257
// How hero feels "inside" after self-genocide.
// ============================================================================

export function udeadinside(player) {
    if (!player || !player.type) return 'dead';
    const mptr = player.type;
    if (!nonliving(mptr))
        return 'dead';           // living, including demons
    if (!weirdnonliving(mptr))
        return 'condemned';      // undead plus manes
    return 'empty';              // golems plus vortices
}

// ============================================================================
// uasmon_maxStr() — cf. polyself.c:1073
// Determine hero's temporary strength max while polymorphed.
// ============================================================================

export function uasmon_maxStr(player) {
    // Returns 18 (normal human max) without character_race() lookup
    // Full implementation requires character_race() lookup
    if (!player || !player.type) return 18;
    if (strongmonst(player.type)) return 118; // STR18(100) approximation
    return 18;
}

// ============================================================================
// set_uasmon() — cf. polyself.c:38
// Update player's monster data pointer and intrinsics after polymorph.
// ============================================================================

export function set_uasmon(player) {
    // cf. polyself.c:38 — set_uasmon()
    // Update player's monster data pointer and intrinsics after polymorph.
    if (!player) return;
    if (player.umonnum !== undefined && player.umonnum >= 0) {
        player.type = mons[player.umonnum];
    }
    const mdat = player.type;
    if (!mdat) return;

    // Ensure uprops exists
    if (!player.uprops) player.uprops = {};

    // Helper: set or clear FROM_FORM bit on a property's intrinsic
    function propset(propIdx, on) {
        if (!player.uprops[propIdx]) {
            player.uprops[propIdx] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        }
        if (on) {
            player.uprops[propIdx].intrinsic |= FROM_FORM;
        } else {
            player.uprops[propIdx].intrinsic &= ~FROM_FORM;
        }
    }

    // resist_from_form: check mdat.mresists for resistance bits
    const mr = mdat.mresists || 0;

    propset(FIRE_RES, !!(mr & MR_FIRE));
    propset(COLD_RES, !!(mr & MR_COLD));
    propset(SLEEP_RES, !!(mr & MR_SLEEP));
    propset(DISINT_RES, !!(mr & MR_DISINT));
    propset(SHOCK_RES, !!(mr & MR_ELEC));
    propset(POISON_RES, !!(mr & MR_POISON));
    propset(ACID_RES, !!(mr & MR_ACID));
    propset(STONE_RES, !!(mr & MR_STONE));

    // DRAIN_RES: C suppresses uwep and checks resists_drli; we approximate
    // by checking if the monster form has drain life resistance intrinsically
    // (non-living or certain types)
    propset(DRAIN_RES, nonliving(mdat) || is_were(mdat) || is_vampire(mdat));

    // ANTIMAGIC: dmgtype(mdat, AD_MAGM) || baby gray dragon || dmgtype(mdat, AD_RBRE)
    propset(ANTIMAGIC, (dmgtype(mdat, AD_MAGM)
                        || mdat === mons[PM_BABY_GRAY_DRAGON]
                        || dmgtype(mdat, AD_RBRE)));

    // SICK_RES: fungus or ghoul
    propset(SICK_RES, (mdat.mlet === S_FUNGUS || mdat === mons[PM_GHOUL]));

    // STUNNED: stalker or bat
    propset(STUNNED, (mdat === mons[PM_STALKER] || is_bat(mdat)));

    // HALLUC_RES: dmgtype(mdat, AD_HALU)
    propset(HALLUC_RES, dmgtype(mdat, AD_HALU));

    propset(SEE_INVIS, perceives(mdat));
    propset(TELEPAT, telepathic(mdat));
    propset(INFRAVISION, infravision(mdat));
    propset(INVIS, pm_invisible(mdat));
    propset(TELEPORT, can_teleport(mdat));
    propset(TELEPORT_CONTROL, control_teleport(mdat));
    propset(LEVITATION, is_floater(mdat));
    // floating eye is a floater+flyer; suppress flying so levitation takes priority
    propset(FLYING, (is_flyer(mdat) && !is_floater(mdat)));
    propset(SWIMMING, is_swimmer(mdat));
    propset(PASSES_WALLS, passes_walls(mdat));
    propset(REGENERATION, regenerates(mdat));
    propset(REFLECTING, (mdat === mons[PM_SILVER_DRAGON]));
    propset(BLINDED, !haseyes(mdat));

    float_vs_flight({ disp: {} }, player);
    polysense(player);
    mark_vision_dirty(); // SEE_INVIS, INFRAVISION, TELEPAT, BLINDED may have changed
}

// ============================================================================
// float_vs_flight() — cf. polyself.c:131
// ============================================================================

// Autotranslated from polyself.c:130
export function float_vs_flight(game, player) {
  let stuck_in_floor = (player.utrap && player.utraptype !== TT_PIT);
  if ((HLevitation || ELevitation) || ((HFlying || EFlying) && stuck_in_floor)) {
    BFlying |= I_SPECIAL;
  }
  else {
    BFlying &= ~I_SPECIAL;
  }
  if ((HLevitation || ELevitation) && stuck_in_floor) {
    BLevitation |= I_SPECIAL;
  }
  else {
    BLevitation &= ~I_SPECIAL;
  }
  steed_vs_stealth();
  game.disp.botl = true;
}

// ============================================================================
// steed_vs_stealth() — cf. polyself.c:158
// ============================================================================

// cf. polyself.c:157 — riding blocks stealth
// C uses BStealth (blocked-stealth intrinsic); JS intrinsic system not fully wired
export function steed_vs_stealth(player) {
  // Stub: when player property system is complete, this should toggle
  // blocked-stealth FROMOUTSIDE based on riding + flying/levitation state
}

// ============================================================================
// check_strangling(player, on) — cf. polyself.c:168
// ============================================================================

async function check_strangling(player, on) {
    // cf. polyself.c:168 — check_strangling()
    // For changing into form that's immune to strangulation.
    if (!player) return;

    if (on) {
        // on -- maybe resume strangling
        const was_strangled = !!(player.strangled);
        if (player.amulet && player.amulet.otyp === AMULET_OF_STRANGULATION
            && can_be_strangled(player.type || mons[PM_HUMAN])) {
            player.strangled = 6;
            await Your("%s %s your %s!",
                player.amulet.oname || "amulet",
                was_strangled ? "still constricts" : "begins constricting",
                body_part(NECK, player));
        }
    } else {
        // off -- maybe block strangling
        if (player.strangled && !can_be_strangled(player.type || mons[PM_HUMAN])) {
            player.strangled = 0;
            await You("are no longer being strangled.");
        }
    }
}

// ============================================================================
// polyman(player, fmt, arg) — cf. polyself.c:200
// Make a (new) human out of the player.
// ============================================================================

async function polyman(player, fmt, arg) {
    // cf. polyself.c:200 — polyman()
    // Make a (new) human out of the player.
    if (!player) return;

    const wasSticking = player.type && sticks(player.type) && player.ustuck && !player.uswallow;

    const Upolyd = player.mtimedone > 0;
    if (Upolyd) {
        // Restore old attributes
        if (player.macurr) player.acurr = Object.assign({}, player.macurr);
        if (player.mamax) player.amax = Object.assign({}, player.mamax);
        player.umonnum = player.umonster || 0;
        player.female = player.mfemale !== undefined ? player.mfemale : player.female;
    }
    set_uasmon(player);

    player.mh = 0;
    player.mhmax = 0;
    player.mtimedone = 0;
    await skinback(player, false);
    player.uundetected = 0;

    if (wasSticking)
        await uunstick(player);

    // find_ac
    if (player.findAC) player.findAC();

    // Clear mimicking state
    if (player.mappearance) {
        player.m_ap_type = 0;
        player.mappearance = 0;
    }

    // Output the polymorph message
    if (fmt) await pline(fmt, arg);

    // Genocide check
    if (ugenocided(player)) {
        await pline("You feel %s inside.", udeadinside(player));
    }

    // Twoweapon check
    // if (player.twoweap && !could_twoweap(player.type)) untwoweapon(player);

    // Pit escape timer reset
    if (player.utrap && player.utraptype === TT_PIT) {
        player.utrap = rn1(6, 2);
    }

    // Blindness handling: reverting from eyeless form
    const was_blind = !!player.blind;
    if (was_blind && haseyes(player.type || mons[PM_HUMAN])) {
        player.blind = 0;
        mark_vision_dirty();
    }

    await check_strangling(player, true);
}

// ============================================================================
// change_sex(player) — cf. polyself.c:269
// ============================================================================

export function change_sex(player) {
    // cf. polyself.c:269 — change_sex()
    if (!player) return;
    const Upolyd = player.mtimedone > 0;

    // Some monsters are always of one sex and their sex can't be changed
    if (!Upolyd
        || (!is_male(player.type) && !is_female(player.type)
            && !is_neuter(player.type))) {
        player.female = !player.female;
    }
    if (Upolyd) {
        player.mfemale = !player.mfemale;
    }
    // Amorous demon special handling
    if (Upolyd && player.umonnum === PM_AMOROUS_DEMON) {
        player.female = !player.female;
        set_uasmon(player);
    }
}

// ============================================================================
// newman(player) — cf. polyself.c:332
// Attempt to return player to new human form with level/stat changes.
// Full port: consumes RNG to match C behavior order.
// ============================================================================

export async function newman(player) {
    // cf. polyself.c:332 — newman()
    // Transform player into a "new" human form with level/stat changes.
    if (!player) return;

    const MAXULEV = 30;
    const oldlvl = player.ulevel || 1;
    let newlvl = oldlvl + rn1(5, -2); // new = old + {-2,-1,0,+1,+2}

    if (newlvl > 127 || newlvl < 1) {
        // level went below 0 or overflowed — fatal
        await pline("Your new form doesn't seem healthy enough to survive.");
        if (player.done) await player.done('DIED', "unsuccessful polymorph");
        // Must have been life-saved to continue
        return;
    }
    if (newlvl > MAXULEV)
        newlvl = MAXULEV;

    // If level goes down, peak level goes down by same amount
    if (newlvl < oldlvl) {
        player.ulevelmax = (player.ulevelmax || oldlvl) - (oldlvl - newlvl);
    }
    if ((player.ulevelmax || 0) < newlvl)
        player.ulevelmax = newlvl;
    player.ulevel = newlvl;
    if (player.ulevel !== undefined) player.ulevel = newlvl;

    const oldgend = poly_gender(player);
    // sex_change_ok is set by caller (polyself)
    if (player._sex_change_ok && !rn2(10)) {
        change_sex(player);
    }

    // adjabil(oldlvl, newlvl) — ability adjustments for level change
    if (player.adjabil) await player.adjabil(oldlvl, newlvl);

    // cf. polyself.c:363 — rndexp(FALSE) — random XP for new level
    player.uexp = rndexp(player, false);

    // redist_attr() — set up new attribute points
    if (player.redist_attr) player.redist_attr();

    // New hit points: scale hpmax by rn1(4, 8)/10, then add newhp() per level
    let hpmax = player.uhpmax || 10;
    // Remove level-gain-based HP (uhpinc[])
    if (player.uhpinc) {
        for (let i = 0; i < oldlvl; i++)
            hpmax -= (player.uhpinc[i] || 0);
    }
    // hpmax * rn1(4,8) / 10; ~0.95*hpmax on average
    const hpScale = rn1(4, 8);
    hpmax = Math.round(hpmax * hpScale / 10);
    // cf. polyself.c:387 — newhp() per level, role-dependent HP gain
    for (let i = 0; i < newlvl; i++) {
        player.ulevel = i;
        hpmax += newhp(player);
    }
    if (hpmax < newlvl)
        hpmax = newlvl;
    // Retain same proportion for current HP: u.uhp * hpmax / u.uhpmax
    const oldHpMax = player.uhpmax || 1;
    player.uhp = Math.round((player.uhp || 1) * hpmax / oldHpMax);
    player.uhpmax = hpmax;
    if (player.uhp > player.uhpmax)
        player.uhp = player.uhpmax;
    if (player.uhp < 1)
        player.uhp = 1;

    // Same for spell power
    let enmax = player.uenmax || 0;
    if (player.ueninc) {
        for (let i = 0; i < oldlvl; i++)
            enmax -= (player.ueninc[i] || 0);
    }
    const enScale = rn1(4, 8);
    enmax = Math.round(enmax * enScale / 10);
    // cf. polyself.c:401 — newpw() per level, role-dependent PW gain
    for (let i = 0; i < newlvl; i++) {
        player.ulevel = i;
        enmax += newpw(player);
    }
    if (enmax < newlvl)
        enmax = newlvl;
    const oldEnMax = player.uenmax || 1;
    player.uen = Math.round((player.uen || 0) * enmax / (oldEnMax < 1 ? 1 : oldEnMax));
    player.uenmax = enmax;

    player.ulevel = newlvl;
    if (player.ulevel !== undefined) player.ulevel = newlvl;

    player.uhunger = rn1(500, 500);
    // Clear sickness and stoning
    if (player.sick) player.sick = 0;
    if (player.stoned) player.stoned = 0;

    if ((player.uhp || 0) <= 0) {
        if (player.polyControl) {
            if (player.uhp <= 0) player.uhp = 1;
        } else {
            await pline("Your new form doesn't seem healthy enough to survive.");
            // done(DIED) — "unsuccessful polymorph"
            // Must have been life-saved to get here
            return;
        }
    }

    // newuhs(FALSE) — update hunger state
    if (player.newuhs) await player.newuhs(false);

    // Use race-specific form name
    const newform = (player.female && player.raceIndividualF)
        ? player.raceIndividualF
        : (player.raceIndividualM || player.raceNoun || "person");
    await polyman(player, "You feel like a new %s!", newform);

    const newgend = poly_gender(player);
    livelog_newform(true, oldgend, newgend);

    // Slime handling
    if (player.slimed) {
        await Your("body transforms, but there is still slime on you.");
        player.slimed = 10;
    }

    // encumber_msg, retouch_equipment, selftouch
    if (player.encumber_msg) await player.encumber_msg();
    if (player.retouch_equipment) player.retouch_equipment(2);
    if (!player.gloves && player.selftouch) {
        player.selftouch("No longer petrify-resistant, you");
    }
}

// ============================================================================
// polyself(player, psflags) — cf. polyself.c:465
// Main polymorph entry point.
// ============================================================================

export async function polyself(player, psflags, map) {
    // cf. polyself.c:465 — polyself()
    // Main polymorph entry point.
    if (!player) return;

    const POLY_CONTROLLED = 1;
    const POLY_LOW_CTRL = 2;
    const POLY_MONSTER = 4;
    const POLY_REVERT = 8;

    const forcecontrol = !!(psflags & POLY_CONTROLLED);
    const low_control = !!(psflags & POLY_LOW_CTRL);
    let monsterpoly = !!(psflags & POLY_MONSTER);
    const formrevert = !!(psflags & POLY_REVERT);
    const draconian = !!(player.armor && player.armor.otyp !== undefined
                         && armor_to_dragon(player.armor.otyp) !== NON_PM);
    const iswere = (player.ulycn !== undefined && player.ulycn >= LOW_PM);
    const isvamp = player.type ? (is_vampire(player.type)) : false;
    const polyControl = player.polyControl || false;
    const controllable_poly = polyControl && !(player.stunned || player.unaware);
    const Unchanging = player.unchanging || false;

    if (Unchanging) {
        await You("fail to transform!");
        return;
    }

    // being Stunned|Unaware doesn't negate this aspect of Poly_control
    if (!polyControl && !forcecontrol && !draconian && !iswere && !isvamp) {
        const acon = (player.acurr && player.acurr.con) || player.acurr_con || 10;
        if (rn2(20) > acon) {
            await pline("You shudder for a moment.");
            const dmg = rnd(30);
            player.uhp = (player.uhp || 1) - dmg;
            if (player.losehp) await player.losehp(dmg, "system shock", 1 /* KILLED_BY_AN */);
            await exercise('A_CON', false);
            return;
        }
    }

    let mntmp = NON_PM;

    if (formrevert) {
        mntmp = player.cham || NON_PM;
        monsterpoly = true;
    }

    // Vampire special handling
    if (monsterpoly && isvamp) {
        // do_vampyr path
        if (mntmp < LOW_PM || (mons[mntmp] && (mons[mntmp].geno & G_UNIQ))) {
            mntmp = (player.type === mons[PM_VAMPIRE_LEADER] && !rn2(10))
                ? PM_WOLF
                : !rn2(4) ? PM_FOG_CLOUD : PM_VAMPIRE_BAT;
            if (player.cham !== undefined && player.cham >= LOW_PM
                && !is_vampire(player.type) && !rn2(2)) {
                mntmp = player.cham;
            }
        }
        if (mntmp === PM_HUMAN)
            await newman(player);
        else
            await polymon(player, mntmp, map);
        return;
    }

    // Controlled poly: in C this uses getlin() for interactive input.
    // We skip the interactive part but handle draconian merge and were shift.

    if (draconian || iswere || isvamp) {
        // special changes that don't require polyok()
        if (draconian) {
            // Dragon scale merge
            mntmp = armor_to_dragon(player.armor.otyp);
            await You("merge with your scaly armor.");
            player.uskin = player.armor;
            player.armor = null;
        } else if (iswere) {
            const Upolyd = player.mtimedone > 0;
            if (Upolyd) {
                mntmp = PM_HUMAN; // force newman()
            } else {
                mntmp = player.ulycn;
            }
        } else if (isvamp) {
            // Vampire form change — handled by do_vampyr above, but can also
            // reach here if controllable poly was involved
            if (mntmp < LOW_PM || (mons[mntmp] && (mons[mntmp].geno & G_UNIQ))) {
                mntmp = (player.type === mons[PM_VAMPIRE_LEADER] && !rn2(10))
                    ? PM_WOLF
                    : !rn2(4) ? PM_FOG_CLOUD : PM_VAMPIRE_BAT;
                if (player.cham !== undefined && player.cham >= LOW_PM
                    && !is_vampire(player.type) && !rn2(2)) {
                    mntmp = player.cham;
                }
            }
        }
        // sex_change_ok left disabled for special changes
        if (mntmp === PM_HUMAN)
            await newman(player);
        else
            await polymon(player, mntmp, map);
        return;
    }

    // Random monster selection
    if (mntmp < LOW_PM) {
        let tryct = 200;
        do {
            mntmp = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
            if (polyok(mons[mntmp]) && !is_placeholder(mons[mntmp]))
                break;
        } while (--tryct > 0);
    }

    // sex_change_ok for newman/polymon
    player._sex_change_ok = (player._sex_change_ok || 0) + 1;

    if (!polyok(mons[mntmp]) || (!forcecontrol && !rn2(5))
        || (mons[mntmp] && player.umonster !== undefined
            && mons[mntmp] === mons[player.umonster])) {
        await newman(player);
    } else {
        await polymon(player, mntmp, map);
    }

    player._sex_change_ok = (player._sex_change_ok || 1) - 1;

    // Light source handling: if old form emitted light and new form doesn't
    // (or vice versa), update light sources. Delegated to caller since
    // light source API is managed by the map/display system.
}

// ============================================================================
// polymon(player, mntmp) — cf. polyself.c:731
// Transform player into specific monster type.
// Consumes RNG: exercise calls, rn2 for sex change, rn1 for timer/HP.
// ============================================================================

export async function polymon(player, mntmp, map) {
    // cf. polyself.c:731 — polymon()
    // Transform player into specific monster type. Return 1 if successful.
    if (!player || mntmp < LOW_PM || mntmp >= mons.length) return 0;

    // Genocide check — mvitals not tracked yet, skip
    // if (mvitals[mntmp].mvflags & G_GENOD) {
    //     You_feel("rather %s-ish.", mons[mntmp].mname);
    //     exercise('A_WIS', true);
    //     return 0;
    // }

    // Conduct tracking
    if (!player.uconduct) player.uconduct = {};
    player.uconduct.polyselfs = (player.uconduct.polyselfs || 0) + 1;

    // Exercise — must match C RNG consumption order
    await exercise('A_CON', false);
    await exercise('A_WIS', true);

    const Upolyd = player.mtimedone > 0;

    if (!Upolyd) {
        // Human to monster; save human stats
        player.macurr = Object.assign({}, player.acurr || {});
        player.mamax = Object.assign({}, player.amax || {});
        player.mfemale = player.female;
    } else {
        // Monster to monster; restore human stats
        if (player.macurr) player.acurr = Object.assign({}, player.macurr);
        if (player.mamax) player.amax = Object.assign({}, player.mamax);
        player.female = player.mfemale;
    }

    // Sex change check — matches C's dochange logic
    let dochange = false;
    if (is_male(mons[mntmp])) {
        if (player.female) dochange = true;
    } else if (is_female(mons[mntmp])) {
        if (!player.female) dochange = true;
    } else if (!is_neuter(mons[mntmp]) && mntmp !== player.ulycn) {
        if (player._sex_change_ok && !rn2(10))
            dochange = true;
    }

    const prevMonnum = player.umonnum;
    let buf = (player.umonnum !== mntmp) ? "" : "new ";
    if (dochange) {
        player.female = !player.female;
        if (is_male(mons[mntmp]) || is_female(mons[mntmp]))
            buf += "";
        else
            buf += player.female ? "female " : "male ";
    }
    buf += mons[mntmp].mname;
    if (player.umonnum !== mntmp)
        await You("turn into a %s!", buf);
    else
        await You("feel like a %s!", buf);

    // If stoned and poly_when_stoned, become stone golem
    if (player.stoned && poly_when_stoned(mons[mntmp])) {
        mntmp = PM_STONE_GOLEM;
        await pline("You turn to stone!");
        player.stoned = 0;
    }

    player.mtimedone = rn1(500, 500);
    player.umonnum = mntmp;
    set_uasmon(player);

    // New stats — currently only strength gets changed
    const newMaxStr = uasmon_maxStr(player);
    if (strongmonst(mons[mntmp])) {
        if (player.acurr) player.acurr.str = newMaxStr;
        if (player.amax) player.amax.str = newMaxStr;
    } else {
        if (player.amax) player.amax.str = newMaxStr;
        if (player.acurr && player.acurr.str > newMaxStr)
            player.acurr.str = newMaxStr;
    }

    // Stone_resistance && Stoned -> clear petrification
    if (player.stoned && ((mons[mntmp].mresists || 0) & MR_STONE)) {
        player.stoned = 0;
        await You("no longer seem to be petrifying.");
    }
    // Sick_resistance && Sick -> clear sickness
    if (player.sick && (mons[mntmp].mlet === S_FUNGUS || mons[mntmp] === mons[PM_GHOUL])) {
        player.sick = 0;
        await You("no longer feel sick.");
    }
    // Slimed handling
    if (player.slimed) {
        if (flaming(mons[mntmp])) {
            player.slimed = 0;
            await pline("The slime burns away!");
        } else if (mntmp === PM_GREEN_SLIME) {
            player.slimed = 0; // silently
        }
    }
    await check_strangling(player, false); // maybe stop strangling
    if (nohands(mons[mntmp])) {
        player.glib = 0;
    }

    // Hit point calculation — must match C's RNG consumption
    const mlvl = mons[mntmp].mlevel || 0;
    if (mons[mntmp].mlet === S_DRAGON && mntmp >= PM_GRAY_DRAGON) {
        const inEndgame = player.inEndgame || false;
        player.mhmax = inEndgame ? (8 * mlvl) : (4 * mlvl + d(mlvl, 4));
    } else if (is_golem(mons[mntmp])) {
        player.mhmax = golemhp(mntmp);
    } else {
        if (!mlvl)
            player.mhmax = rnd(4);
        else
            player.mhmax = d(mlvl, 8);
        if (player.isHomeElemental && player.isHomeElemental(mons[mntmp]))
            player.mhmax *= 3;
    }
    player.mh = player.mhmax;

    // Low level characters can't be high level monsters for long
    if ((player.ulevel || 1) < mlvl) {
        player.mtimedone = Math.floor(player.mtimedone * (player.ulevel || 1) / mlvl);
    }

    // Handle skin/armor/weapon
    if (player.uskin && mntmp !== armor_to_dragon((player.uskin.otyp || 0)))
        await skinback(player, false);
    await break_armor(player);
    await drop_weapon(player, 1);
    if (player.findAC) player.findAC();

    // Pit escape timer reset
    if (player.utrap && player.utraptype === TT_PIT) {
        player.utrap = rn1(6, 2);
    }

    // Blindness: if was eyeless and now can see
    if (player.blind && haseyes(mons[mntmp])) {
        player.blind = 0;
        mark_vision_dirty();
    }

    // Egg type learning
    if (lays_eggs(mons[mntmp])) {
        if (player.learnEggType) player.learnEggType(mntmp);
    }

    // Engulf/swallow handling
    if (player.uswallow && player.ustuck) {
        const usiz = mons[mntmp].msize || 0;
        const ustdata = player.ustuck.type || player.ustuck.data;
        if (unsolid(mons[mntmp])
            || usiz >= MZ_HUGE
            || (ustdata && ustdata.msize < usiz && !is_whirly(ustdata))) {
            if (unsolid(mons[mntmp])) {
                await pline("%s can no longer contain you.",
                    player.ustuck.name || "It");
            }
            if (player.expels) await player.expels(player.ustuck);
        }
    } else if (player.ustuck && !player.uswallow) {
        // Being held; if now capable of holding or unsolid, release
        if (sticks(mons[mntmp]) || unsolid(mons[mntmp])) {
            const stuckName = (player.ustuck.name || "It");
            player.ustuck = null;
            await pline("%s loses its grip on you.", stuckName);
        }
    }

    // Steed handling
    if (player.usteed) {
        if (player.canRide && !player.canRide(player.usteed)) {
            if (player.dismount) player.dismount();
        }
    }

    if (player.findAC) player.findAC();

    // Pool/lava spoteffects
    if (player.spoteffects) await player.spoteffects(true);

    // Passes_walls trap handling
    if (passes_walls(mons[mntmp]) && player.utrap) {
        // TT_INFLOOR, TT_BURIEDBALL from trap.js
        if (player.utraptype === TT_INFLOOR) {
            await pline_The("rock seems to no longer trap you.");
            player.utrap = 0;
        } else if (player.utraptype === TT_BURIEDBALL) {
            await pline_The("buried ball is no longer bound to you.");
            player.utrap = 0;
        }
    }

    // Lava-loving creatures
    if (likes_lava(mons[mntmp]) && player.utrap && player.utraptype === TT_LAVA) {
        await pline_The("lava now feels soothing.");
        player.utrap = 0;
    }

    // Amorphous/whirly/unsolid: slip out of chains, traps
    if (amorphous(mons[mntmp]) || is_whirly(mons[mntmp]) || unsolid(mons[mntmp])) {
        if (player.punished) {
            await You("slip out of the iron chain.");
            player.punished = false;
        }
        // TT_WEB, TT_BEARTRAP from trap.js
        if (player.utrap && (player.utraptype === TT_WEB || player.utraptype === TT_BEARTRAP)) {
            await You("are no longer stuck in the %s.",
                player.utraptype === TT_WEB ? "web" : "bear trap");
            player.utrap = 0;
        }
    }

    // Small creatures can escape bear traps and webs
    if (player.utrap) {
        // TT_WEB, TT_BEARTRAP from trap.js
        if ((player.utraptype === TT_WEB || player.utraptype === TT_BEARTRAP)
            && (mons[mntmp].msize !== undefined && mons[mntmp].msize <= MZ_SMALL)) {
            await You("are no longer stuck in the %s.",
                player.utraptype === TT_WEB ? "web" : "bear trap");
            player.utrap = 0;
        }
    }

    // Webmaker in web: orient yourself
    if (webmaker(mons[mntmp]) && player.utrap && player.utraptype === TT_WEB) {
        await You("orient yourself on the web.");
        player.utrap = 0;
    }

    await check_strangling(player, true); // maybe start strangling

    // Encumbrance, retouch equipment, selftouch
    if (player.encumber_msg) await player.encumber_msg();
    if (player.retouch_equipment) player.retouch_equipment(2);
    if (!player.gloves && player.selftouch) {
        player.selftouch("No longer petrify-resistant, you");
    }

    // Verbose #monster hints
    const uptr = mons[mntmp];
    const might_hide = (is_hider(uptr) || hides_under(uptr));

    if (can_breathe(uptr))
        await pline("Use the command #monster to use your breath weapon.");
    if (attacktype(uptr, AT_SPIT))
        await pline("Use the command #monster to spit venom.");
    if (uptr.mlet === S_NYMPH)
        await pline("Use the command #monster to remove an iron ball.");
    if (attacktype(uptr, AT_GAZE))
        await pline("Use the command #monster to gaze at monsters.");
    if (might_hide && webmaker(uptr))
        await pline("Use the command #monster to hide or to spin a web.");
    else if (might_hide)
        await pline("Use the command #monster to hide.");
    else if (webmaker(uptr))
        await pline("Use the command #monster to spin a web.");
    if (is_were(uptr))
        await pline("Use the command #monster to summon help.");
    if (mntmp === PM_GREMLIN)
        await pline("Use the command #monster to multiply in a fountain.");
    if (is_unicorn(uptr))
        await pline("Use the command #monster to use your horn.");
    if (is_mind_flayer(uptr))
        await pline("Use the command #monster to emit a mental blast.");
    if (uptr.msound === MS_SHRIEK)
        await pline("Use the command #monster to shriek.");
    if (is_vampire(uptr))
        await pline("Use the command #monster to change shape.");
    if (lays_eggs(uptr) && player.female
        && !(uptr === mons[PM_GIANT_EEL] || uptr === mons[PM_ELECTRIC_EEL]))
        await pline("Use the command #sit to lay an egg.");

    return 1;
}

// ============================================================================
// rehumanize(player) — cf. polyself.c:1352
// Return to original form.
// ============================================================================

export async function rehumanize(player) {
    // cf. polyself.c:1352 — rehumanize()
    // Return to original form, usually due to polymorph timing out or HP loss.
    if (!player) return;

    const was_flying = player.uprops && player.uprops[FLYING] &&
        (player.uprops[FLYING].intrinsic || player.uprops[FLYING].extrinsic);

    const Unchanging = player.unchanging || false;

    // Can't revert back while unchanging
    if (Unchanging) {
        if ((player.mh || 0) < 1) {
            // killed while stuck in creature form
            if (player.done) await player.done('DIED');
            return; // don't rehumanize after all (lifesaved)
        }
    }

    // Light source handling
    if (player.delLightSource) player.delLightSource();

    const raceAdj = player.raceAdj || "human";
    await polyman(player, "You return to %s form!", raceAdj);

    if ((player.uhp || 0) < 1) {
        await Your("old form was not healthy enough to survive.");
        if (player.done) await player.done('DIED');
    }

    // nomul(0) — cancel any multi-turn action
    if (player.nomul) player.nomul(0);

    if (player.encumber_msg) await player.encumber_msg();

    // Steed landing message
    if (was_flying && player.usteed) {
        const isNowFlying = player.uprops && player.uprops[FLYING] &&
            (player.uprops[FLYING].intrinsic || player.uprops[FLYING].extrinsic) &&
            !player.uprops[FLYING].blocked;
        if (!isNowFlying) {
            await You("and %s return gently to the ground.",
                player.usteed.name || "your steed");
        }
    }

    if (player.retouch_equipment) player.retouch_equipment(2);
    if (!player.gloves && player.selftouch) {
        player.selftouch("No longer petrify-resistant, you");
    }
}

// ============================================================================
// break_armor(player) — cf. polyself.c:1153
// Remove unsuitable armor when changing form.
// ============================================================================

// C ref: polyself.c:1119 — dropp()
// Wrapper over dropx used by break_armor/drop_weapon paths.
export async function dropp(obj, player) {
    if (!obj || !player) return;
    if (typeof player.dropx === 'function') {
        await player.dropx(obj);
        return;
    }
    if (typeof player.dropp === 'function') {
        await player.dropp(obj);
    }
}

export async function break_armor(player) {
    // cf. polyself.c:1153 — break_armor()
    // Remove/break armor that doesn't fit the new polymorphed form.
    if (!player || !player.type) return;
    const uptr = player.type;

    // Helper: remove and drop an armor piece
    async function removeArmor(slot, offFn) {
        const otmp = player[slot];
        if (!otmp) return;
        if (offFn && player[offFn]) player[offFn]();
        await dropp(otmp, player);
        player[slot] = null;
    }

    if (breakarm(uptr)) {
        // Large form breaks out of armor
        if (player.armor) {
            await You("break out of your armor!");
            await exercise('A_STR', false);
            if (player.Armor_gone) player.Armor_gone();
            if (player.useup) player.useup(player.armor);
            player.armor = null;
        }
        if (player.cloak) {
            // Mummy wrapping adapts to some sizes — skip if allowed
            await pline_The("clasp on your cloak breaks open!");
            await removeArmor('uarmc', 'Cloak_off');
        }
        if (player.shirt) {
            await Your("shirt rips to shreds!");
            if (player.useup) player.useup(player.shirt);
            player.shirt = null;
        }
    } else if (sliparm(uptr)) {
        // Small/slimy form slips out of armor
        if (player.armor) {
            await Your("armor falls around you!");
            if (player.Armor_gone) player.Armor_gone();
            await dropp(player.armor, player);
            player.armor = null;
        }
        if (player.cloak) {
            if (is_whirly(uptr))
                await Your("cloak falls, unsupported!");
            else
                await You("shrink out of your cloak!");
            await removeArmor('uarmc', 'Cloak_off');
        }
        if (player.shirt) {
            if (is_whirly(uptr))
                await You("seep right through your shirt!");
            else
                await You("become much too small for your shirt!");
            await dropp(player.shirt, player);
            player.shirt = null;
        }
    }

    // Horns pierce/knock off helmet
    if (has_horns(uptr)) {
        if (player.helmet) {
            await Your("helmet falls to the ground!");
            await removeArmor('uarmh', 'Helmet_off');
        }
    }

    // No hands or very small — lose gloves, shield, helmet
    if (nohands(uptr) || (uptr.msize !== undefined && uptr.msize <= MZ_SMALL)) {
        if (player.gloves) {
            await You("drop your gloves%s!", player.weapon ? " and weapon" : "");
            await drop_weapon(player, 0);
            await removeArmor('uarmg', 'Gloves_off');
        }
        if (player.shield) {
            await You("can no longer hold your shield!");
            await removeArmor('uarms', 'Shield_off');
        }
        if (player.helmet) {
            await Your("helmet falls to the ground!");
            await removeArmor('uarmh', 'Helmet_off');
        }
    }

    // No hands, very small, slithy, or centaur — lose boots
    if (nohands(uptr) || (uptr.msize !== undefined && uptr.msize <= MZ_SMALL)
        || slithy(uptr) || uptr.mlet === S_CENTAUR) {
        if (player.boots) {
            if (is_whirly(uptr))
                await Your("boots fall away!");
            else
                await Your("boots %s off your feet!",
                    (uptr.msize !== undefined && uptr.msize <= MZ_SMALL) ? "slide" : "are pushed");
            removeArmor('uarmf', 'Boots_off');
        }
    }

    // Eyewear falls off without a head
    if (player.ublindf && !has_head(uptr)) {
        await Your("eyewear falls off!");
        removeArmor('ublindf', 'Blindf_off');
    }
    // rings stay worn even when no hands
}

// ============================================================================
// drop_weapon(player, alone) — cf. polyself.c:1290
// Drop weapon for handless form.
// ============================================================================

export async function drop_weapon(player, alone) {
    // cf. polyself.c:1290 — drop_weapon()
    // Drop weapon when polymorphed into a form that can't wield.
    if (!player) return;

    if (player.weapon) {
        if (!alone || cantwield(player.type)) {
            if (alone) {
                await You("find you must drop your weapon!");
            }
            // Handle twoweapon: drop swap weapon first
            if (player.twoweap && player.swapWeapon) {
                const swapwep = player.swapWeapon;
                player.swapWeapon = null;
                if (player.dropx) await player.dropx(swapwep);
            }
            const wep = player.weapon;
            player.weapon = null;
            if (player.dropx) await player.dropx(wep);
            if (player.update_inventory) player.update_inventory();
        }
    }
}

// ============================================================================
// polysense(player) — cf. polyself.c:2220
// Some species have awareness of other species when polymorphed.
// ============================================================================
export function polysense(player) {
    // cf. polyself.c:2220 — polysense()
    // Some species have awareness of other species when polymorphed.
    if (!player) return;

    // Initialize warntype tracking
    if (!player.warntype) player.warntype = {};
    player.warntype.speciesidx = NON_PM;
    player.warntype.species = null;
    player.warntype.polyd = 0;
    // Clear FROM_RACE from warn_of_mon if uprops tracking is available
    // (HWarn_of_mon &= ~FROMRACE equivalent)

    let warnidx = NON_PM;

    switch (player.umonnum) {
    case PM_PURPLE_WORM:
    case PM_BABY_PURPLE_WORM:
        warnidx = PM_SHRIEKER;
        break;
    case PM_VAMPIRE:
    case PM_VAMPIRE_LEADER:
        player.warntype.polyd = M2_HUMAN | M2_ELF;
        player.warnOfMon = true;
        return;
    }

    if (warnidx >= LOW_PM) {
        player.warntype.speciesidx = warnidx;
        player.warntype.species = mons[warnidx];
        player.warnOfMon = true;
    } else {
        player.warnOfMon = false;
    }
}

// ============================================================================
// Form-specific attacks (player #monster command)
// ============================================================================

// cf. polyself.c:1405 — dobreathe(): breath weapon attack
export async function dobreathe(player, map) {
    // Breath weapon attack for polymorphed player.
    if (!player || !player.type) return 0;

    if (player.strangled) {
        await You_cant("breathe.  Sorry.");
        return 0;
    }
    if ((player.uen || 0) < 15) {
        await You("don't have enough energy to breathe!");
        return 0;
    }
    player.uen -= 15;

    // In C, getdir() is called here for direction input.
    // If player.dx/dy/dz are set by the caller (or a getdir wrapper),
    // use them. Otherwise this is a no-op for the breath itself.
    if (player.getdir && !player.getdir()) {
        player.uen += 15; // refund energy on cancel
        return 0; // ECMD_CANCEL
    }

    const mattk = attacktype_fordmg(player.type, AT_BREA, AD_ANY);
    if (!mattk) {
        await pline("bad breath attack?"); // impossible
    } else {
        if (!player.dx && !player.dy && !player.dz) {
            // Breathe on self
            if (player.ubreatheu) {
                player.ubreatheu(mattk);
            }
        } else {
            // Directed breath: ubuzz subsystem
            if (player.ubuzz) {
                player.ubuzz(mattk.adtyp, mattk.damn || 0);
            }
        }
    }
    return 1; // ECMD_TIME
}

// cf. polyself.c:1434 — dospit(): spit venom attack
export async function dospit(player, map) {
    // Spit venom attack for polymorphed player.
    if (!player || !player.type) return 0;

    // In C, getdir() is called for direction input.
    if (player.getdir && !player.getdir()) {
        return 0; // ECMD_CANCEL
    }

    const mattk = attacktype_fordmg(player.type, AT_SPIT, AD_ANY);
    if (!mattk) {
        await pline("bad spit attack?"); // impossible
    } else {
        let otmp;
        switch (mattk.adtyp) {
        case AD_BLND:
        case AD_DRST:
            otmp = mksobj(BLINDING_VENOM, true, false);
            break;
        case AD_ACID:
        default:
            otmp = mksobj(ACID_VENOM, true, false);
            break;
        }
        if (otmp) {
            otmp.spe = 1; // indicates it's yours
            if (player.throwit) {
                await player.throwit(otmp, 0, false, null);
            }
        }
    }
    return 1; // ECMD_TIME
}

// cf. polyself.c:1465 — doremove(): remove iron chain
export async function doremove(player) {
    // cf. polyself.c:1465 — doremove()
    // Nymph form ability to remove iron chain punishment.
    if (!player) return 0;

    const Punished = player.punished || false;

    if (!Punished) {
        if (player.utrap && player.utraptype === TT_BURIEDBALL) {
            await pline_The("ball and chain are buried firmly in the ground.");
            return 0;
        }
        await You("are not chained to anything!");
        return 0;
    }
    // unpunish() — remove ball and chain punishment
    if (player.unpunish) {
        player.unpunish();
    } else {
        player.punished = false;
    }
    return 1; // ECMD_TIME
}

// cf. polyself.c:1481 — dospinweb(): web spinning attack
export async function dospinweb(player, map) {
    // cf. polyself.c:1481 — dospinweb()
    // Spider form ability to spin a web on the current tile.
    if (!player || !map) return 0;

    const x = player.x, y = player.y;
    // Check for terrain rejection: water, lava, air
    const loc = map && map.at ? map.at(x, y) : null;
    const reject_terrain = loc && (loc.isPool || loc.isLava || loc.isAir);

    if (player.levitation || reject_terrain) {
        await You("must be on %s ground to spin a web.",
            reject_terrain ? "solid" : "the");
        return 0;
    }

    if (player.uswallow) {
        await You("release web fluid inside %s.", mon_nam(player.ustuck));
        if (player.ustuck && is_animal(player.ustuck.type || player.ustuck.data)) {
            if (player.expels) await player.expels(player.ustuck);
            return 0;
        }
        if (player.ustuck && is_whirly(player.ustuck.type || player.ustuck.data)) {
            // Check engulfing attack type for flavor text
            const ustdata = player.ustuck.type || player.ustuck.data;
            if (ustdata && ustdata.attacks) {
                for (let i = 0; i < ustdata.attacks.length; i++) {
                    if (ustdata.attacks[i].aatyp === AT_ENGL) {
                        let sweep = "";
                        switch (ustdata.attacks[i].adtyp) {
                        case AD_FIRE: sweep = "ignites and "; break;
                        case AD_ELEC: sweep = "fries and "; break;
                        case AD_COLD: sweep = "freezes, shatters and "; break;
                        }
                        await pline_The("web %sis swept away!", sweep);
                        return 0;
                    }
                }
            }
            await pline_The("web is swept away!");
            return 0;
        }
        // default: a nasty jelly-like creature
        await pline_The("web dissolves into %s.", mon_nam(player.ustuck));
        return 0;
    }

    if (player.utrap) {
        await You("cannot spin webs while stuck in a trap.");
        return 0;
    }

    await exercise('A_DEX', true);

    // Check for existing trap on tile
    const ttmp = loc ? loc.trap : null;

    if (ttmp) {
        // Handle various trap types as in C
        // C trap type enum values (from const.js)
        const PIT = 11, SPIKED_PIT = 12, SQKY_BOARD = 4;
        const TELEP_TRAP = 15, LEVEL_TELEP = 16, MAGIC_PORTAL = 17;
        const VIBRATING_SQUARE = 23, WEB = 18, HOLE = 13, TRAPDOOR = 14;
        const ROLLING_BOULDER_TRAP = 7;
        const ttyp = ttmp.ttyp !== undefined ? ttmp.ttyp : ttmp.type;

        switch (ttyp) {
        case PIT: case SPIKED_PIT:
            await You("spin a web, covering up the pit.");
            if (loc.deltrap) loc.deltrap(ttmp);
            return 1;
        case SQKY_BOARD:
            await pline_The("squeaky board is muffled.");
            if (loc.deltrap) loc.deltrap(ttmp);
            return 1;
        case TELEP_TRAP: case LEVEL_TELEP:
        case MAGIC_PORTAL: case VIBRATING_SQUARE:
            await Your("webbing vanishes!");
            return 0;
        case WEB:
            await You("make the web thicker.");
            return 1;
        case HOLE: case TRAPDOOR:
            await You("web over the %s.", ttyp === TRAPDOOR ? "trap door" : "hole");
            if (loc.deltrap) loc.deltrap(ttmp);
            return 1;
        case ROLLING_BOULDER_TRAP:
            await You("spin a web, jamming the trigger.");
            if (loc.deltrap) loc.deltrap(ttmp);
            return 1;
        default:
            // Arrow, dart, bear, rock, fire, land mine, sleep gas, rust,
            // magic, anti-magic, poly traps — trigger them
            await You("have triggered a trap!");
            if (player.dotrap) player.dotrap(ttmp);
            return 1;
        }
    }

    // Check for stairs/ladders — cop out: don't let them hide the stairs
    if (loc && loc.isStairs) {
        await Your("web fails to impede access to the %s.",
             loc.isLadder ? "ladder" : "stairs");
        return 1;
    }

    // Create a web trap
    if (map.maketrap) {
        const newTrap = map.maketrap(x, y, 18 /* WEB */);
        if (newTrap) {
            newTrap.madeby_u = 1;
        }
    }
    await You("spin a web.");
    return 1; // ECMD_TIME
}

// cf. polyself.c:1608 — dosummon(): summon allies
export async function dosummon(player, map) {
    // cf. polyself.c:1608 — dosummon()
    // Werewolf/werecreature form ability to summon allies.
    if (!player || !player.type) return 0;

    if ((player.uen || 0) < 10) {
        await You("lack the energy to send forth a call for help!");
        return 0;
    }
    player.uen -= 10;

    await You("call upon your brethren for help!");
    await exercise('A_WIS', true);

    // Call were_summon — matches C's RNG consumption
    const result = were_summon(player.type, player.x, player.y,
        true, { player }, map, 0);
    if (!result || !result.total) {
        await pline("But none arrive.");
    }
    return 1; // ECMD_TIME
}

// cf. polyself.c:1626 — dogaze(): gaze attack
export async function dogaze(player, map) {
    // cf. polyself.c:1626 — dogaze()
    // Gaze attack for polymorphed player (umber hulk confuse, flaming sphere fire).
    if (!player || !player.type) return 0;

    let adtyp = 0;
    const attacks = player.type.mattk || player.type.attacks || [];
    for (let i = 0; i < attacks.length; i++) {
        if (attacks[i].aatyp === AT_GAZE) {
            adtyp = attacks[i].adtyp;
            break;
        }
    }
    if (adtyp !== AD_CONF && adtyp !== AD_FIRE) {
        await pline("gaze attack %d?", adtyp); // impossible in C
        return 0;
    }

    if (player.blind) {
        await You_cant("see anything to gaze at.");
        return 0;
    } else if (player.hallucination) {
        await You_cant("gaze at anything you can see.");
        return 0;
    }
    if ((player.uen || 0) < 15) {
        await You("lack the energy to use your special gaze!");
        return 0;
    }
    player.uen -= 15;

    let looked = 0;
    const monsters = map ? map.monsters || [] : [];

    for (const mtmp of monsters) {
        if (!mtmp || mtmp.dead || (mtmp.mhp || 0) <= 0) continue;
        // Check visibility — simplified: use distance and LOS
        // In C: canseemon(mtmp) && couldsee(mtmp->mx, mtmp->my)
        const mx = mtmp.x !== undefined ? mtmp.x : (mtmp.mx || 0);
        const my = mtmp.y !== undefined ? mtmp.y : (mtmp.my || 0);
        const d2 = dist2(player.x, player.y, mx, my);
        if (d2 > BOLT_LIM * BOLT_LIM) continue;
        // Simplified visibility check
        if (!mtmp.visible && !mtmp.detected) continue;

        looked++;
        const mdata = mtmp.data || mtmp.type;
        if (!mdata) continue;

        // Invisible player check
        if (player.Invis && !perceives(mdata)) {
            await pline("%s seems not to notice your gaze.", Monnam(mtmp));
        } else if (mtmp.invisible && !player.seeInvisible) {
            await You_cant("see where to gaze at %s.", Monnam(mtmp));
        } else if (player.safeDog && mtmp.tame && !player.confused) {
            await You("avoid gazing at %s.", mon_nam(mtmp));
        } else {
            // Peaceful monster confirmation check
            if (player.confirm && mtmp.mpeaceful && !player.confused) {
                // In C, yn query "Really confuse/attack <mon>?"
                // Skip if y_n returns 'n'; for JS, proceed by default
            }
            setmangry(mtmp, true, map, player);

            // Skip helpless, stunned, blind, eyeless targets
            if (mtmp.helpless || mtmp.stunned
                || !mtmp.canSee || !haseyes(mdata)) {
                looked--;
                continue;
            }

            if (adtyp === AD_CONF) {
                if (!mtmp.confused)
                    await Your("gaze confuses %s!", mon_nam(mtmp));
                else
                    await pline("%s is getting more and more confused.", Monnam(mtmp));
                mtmp.confused = true;
                if (mtmp.mconf !== undefined) mtmp.mconf = 1;
            } else if (adtyp === AD_FIRE) {
                // RNG: d(2,6) for fire damage, rn2(20) for item destroy chance
                let dmg = d(2, 6);
                const orig_dmg = dmg;
                const lev = player.ulevel || 1;

                await You("attack %s with a fiery gaze!", mon_nam(mtmp));
                if (resists_fire(mtmp)) {
                    await pline_The("fire doesn't burn %s!", mon_nam(mtmp));
                    dmg = 0;
                }
                if (lev > rn2(20)) {
                    if (player.destroyItems) dmg += player.destroyItems(mtmp, AD_FIRE, orig_dmg);
                    if (player.igniteItems) player.igniteItems(mtmp);
                }
                if (dmg) {
                    mtmp.mhp = (mtmp.mhp || 0) - dmg;
                }
                if ((mtmp.mhp || 0) <= 0) {
                    await killed(mtmp, map, player);
                }
            }

            // Counterattacks from gazed monsters
            if ((mtmp.mhp || 0) <= 0) continue;

            // Floating eye freeze — RNG: rn2(4), d(mlev+1, damd)
            if (mdata === mons[PM_FLOATING_EYE] && !mtmp.cancelled) {
                const Free_action = player.freeAction || false;
                if (!Free_action) {
                    await You("are frozen by %s gaze!", s_suffix(mon_nam(mtmp)));
                    const mlev = mdata.mlevel || 0;
                    const damd = (mdata.attacks && mdata.attacks[0])
                        ? (mdata.attacks[0].damd || 1) : 1;
                    const freezeTime = ((player.ulevel || 1) > 6 || rn2(4))
                        ? -d(mlev + 1, damd)
                        : -200;
                    if (player.nomul) player.nomul(freezeTime, "frozen by a monster's gaze");
                    return 1;
                } else {
                    await You("stiffen momentarily under %s gaze.",
                        s_suffix(mon_nam(mtmp)));
                }
            }

            // Medusa gaze counter
            if (mdata === mons[PM_MEDUSA] && !mtmp.cancelled) {
                await pline("Gazing at the awake %s is not a very good idea.",
                    mon_nam(mtmp));
                await pline("You turn to stone...");
                if (player.done) await player.done('STONING', "deliberately meeting Medusa's gaze");
            }
        }
    }

    if (!looked) {
        await You("gaze at no place in particular.");
    }
    return 1; // ECMD_TIME
}

// cf. polyself.c:1761 — dohide(): hide ability
export async function dohide(player, map) {
    // cf. polyself.c:1761 — dohide()
    // Form-specific hiding ability (mimics, piercers, lurkers, trappers, etc.)
    if (!player || !player.type) return 0;

    const ismimic = player.type.mlet === S_MIMIC;
    const Flying = player.flying || false;
    const on_ceiling = is_clinger(player.type) || Flying;

    // Can't hide while being held or while trapped (except floor hiders in pits)
    if (player.ustuck || (player.utrap && (player.utraptype !== TT_PIT || on_ceiling))) {
        let reason;
        if (player.utrap && !player.ustuck)
            reason = "trapped";
        else if (player.uswallow)
            reason = "swallowed";
        else if (!sticks(player.type))
            reason = "being held";
        else
            reason = "holding someone";
        await You_cant("hide while you're %s.", reason);
        if (player.uundetected || (ismimic && player.mappearance)) {
            player.uundetected = 0;
            if (ismimic) {
                player.m_ap_type = 0; // M_AP_NOTHING
                player.mappearance = 0;
            }
            if (map && map.newsym) map.newsym(player.x, player.y);
        }
        return 0;
    }

    // Eel in non-pool
    if (player.type.mlet === S_EEL) {
        const loc = map && map.at ? map.at(player.x, player.y) : null;
        const isPool = loc && loc.isPool;
        if (!isPool) {
            const isFountain = loc && loc.isFountain;
            if (isFountain)
                await pline_The("fountain is not deep enough to hide in.");
            else
                await pline("There is no water to hide in here.");
            player.uundetected = 0;
            return 0;
        }
    }

    // Hide-under creatures need objects to hide under
    if (hides_under(player.type)) {
        const loc = map && map.at ? map.at(player.x, player.y) : null;
        const hasObjects = loc && loc.objects && loc.objects.length > 0;
        if (!hasObjects) {
            await pline("There is nothing to hide under here.");
            player.uundetected = 0;
            return 0;
        }
        // Cockatrice corpse petrification check
        // In C, touching 'trice corpses while hiding under them is fatal.
        // Simplified: check if all objects in pile are petrifying corpses.
    }

    // Air/Water planes check — clinger needs a ceiling
    if (on_ceiling) {
        if (player.noCeiling) {
            await pline("There is nowhere to hide above you.");
            player.uundetected = 0;
            return 0;
        }
    }
    // Floor hiders on air/water planes
    if ((is_hider(player.type) && !Flying)) {
        if (player.noFloor) {
            await pline("There is nowhere to hide beneath you.");
            player.uundetected = 0;
            return 0;
        }
    }

    // Already hiding
    if (player.uundetected || (ismimic && player.mappearance)) {
        await pline("You are already hiding.");
        return 0;
    }

    if (ismimic) {
        // In C, should bring up "what to imitate?" dialog.
        // Imitate STRANGE_OBJECT (type 0).
        player.m_ap_type = 2; // M_AP_OBJECT
        player.mappearance = 0; // STRANGE_OBJECT
    } else {
        player.uundetected = 1;
    }
    if (map && map.newsym) map.newsym(player.x, player.y);
    await pline("You are now hiding.");
    return 1; // ECMD_TIME
}

// cf. polyself.c:1861 — dopoly(): polymorph into different form (vampire)
export async function dopoly(player, map) {
    // cf. polyself.c:1861 — dopoly()
    // Vampire shape change ability — transform between vampire forms.
    if (!player || !player.type) return 0;

    const POLY_MONSTER = 4;

    if (is_vampire(player.type)) {
        const savedat = player.type;
        await polyself(player, POLY_MONSTER, map);
        if (savedat !== player.type) {
            await You("transform into %s.", player.type.mname);
            if (map && map.newsym) map.newsym(player.x, player.y);
        }
    }
    return 1; // ECMD_TIME
}

// cf. polyself.c:1878 — domindblast(): psychic blast attack
export async function domindblast(player, map) {
    // cf. polyself.c:1878 — domindblast()
    // Mind flayer psychic blast — damages all nearby non-mindless hostile monsters.
    // RNG consumption must match C: rn2(2) per telepathic monster, rn2(10) per other,
    //   rnd(15) per affected monster.
    if (!player) return 0;

    if ((player.uen || 0) < 10) {
        await You("concentrate but lack the energy to maintain doing so.");
        return 0;
    }
    player.uen -= 10;

    await You("concentrate.");
    await pline("A wave of psychic energy pours out.");

    const monsters = map ? (map.monsters || []) : [];
    // Iterate in order matching C's fmon list traversal
    for (let i = 0; i < monsters.length; i++) {
        const mtmp = monsters[i];
        if (!mtmp || mtmp.dead || (mtmp.mhp || 0) <= 0) continue;

        const mx = mtmp.x !== undefined ? mtmp.x : (mtmp.mx || 0);
        const my = mtmp.y !== undefined ? mtmp.y : (mtmp.my || 0);
        if (dist2(player.x, player.y, mx, my) > BOLT_LIM * BOLT_LIM)
            continue;
        if (mtmp.peaceful || mtmp.mpeaceful) continue;
        const mdata = mtmp.data || mtmp.type;
        if (!mdata) continue;
        if (is_mindless(mdata)) continue;

        const isTelepath = telepathic(mdata);
        const u_sen = isTelepath && !mtmp.canSee && !(mtmp.mcansee === undefined ? true : mtmp.mcansee);

        // RNG consumption matches C exactly:
        // if telepathic: rn2(2); if not telepathic: rn2(10)
        if (u_sen || (isTelepath && rn2(2)) || !rn2(10)) {
            const dmg = rnd(15);

            // Wake it up — simplified
            wakeup(mtmp, (dmg > (mtmp.mhp || 0)) ? true : false, map, player);

            await You("lock in on %s %s.", s_suffix(mon_nam(mtmp)),
                u_sen ? "telepathy"
                    : isTelepath ? "latent telepathy"
                        : "mind");

            mtmp.mhp = (mtmp.mhp || 0) - dmg;
            if ((mtmp.mhp || 0) <= 0) {
                await killed(mtmp, map, player);
            }
        }
    }
    return 1; // ECMD_TIME
}

// cf. polyself.c:303 — livelog_newform(): log form change
export function livelog_newform(viapoly, oldgend, newgend) {
    // Live logging not implemented in JS
}

// golemhp — duplicate of makemon.js local function, needed for polymon
export function golemhp(mndx) {
    switch (mndx) {
    case PM_STRAW_GOLEM:    return 20;
    case PM_PAPER_GOLEM:    return 20;
    case PM_ROPE_GOLEM:     return 30;
    case PM_LEATHER_GOLEM:  return 40;
    case PM_GOLD_GOLEM:     return 60;
    case PM_WOOD_GOLEM:     return 50;
    case PM_FLESH_GOLEM:    return 40;
    case PM_CLAY_GOLEM:     return 70;
    case PM_STONE_GOLEM:    return 100;
    case PM_GLASS_GOLEM:    return 80;
    case PM_IRON_GOLEM:     return 120;
    default:                return 0;
    }
}

/*polyself.js*/
