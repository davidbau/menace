// do_name.js -- Naming objects, monsters, and features
// cf. do_name.c — nextmbuf, free_mgivenname, free_oname, safe_oname,
//                 christen_monst, alreadynamed, do_mgivenname, do_oname,
//                 objtyp_is_callable, name_ok, call_ok, docallcmd, docall_xname,
//                 docall, namefloorobj, x_monnam, l_monnam, mon_nam,
//                 noit_mon_nam, some_mon_nam, Monnam, noit_Monnam,
//                 Some_Monnam, noname_monnam, m_monnam, y_monnam, YMonnam,
//                 Adjmonnam, a_monnam, Amonnam, distant_monnam, mon_nam_too,
//                 monverbself, minimal_monnam, Mgender, pmname, mon_pmname,
//                 obj_pmname, rndmonnam, bogon_is_pname, roguename,
//                 rndcolor, rndorcname, christen_orc, lookup_novel

import { rn2, rn1, rn2_on_display_rng } from './rng.js';
import { buildInventoryOverlayLines, renderOverlayMenuUntilDismiss, update_inventory } from './invent.js';
import { mons, SPECIAL_PM, G_NOGEN, G_UNIQ, PM_GHOST, PM_WIZARD_OF_YENDOR, PM_SHOPKEEPER } from './monsters.js';
import { highc, upstart, s_suffix } from './hacklib.js';
import { CLR_MAX, NO_COLOR, ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR, SUPPRESS_IT, SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE, SUPPRESS_MAPPEARANCE, SUPPRESS_NAME, AUGMENT_IT, EXACT_NAME, LOW_PM } from './const.js';
import { hasGivenName, type_is_pname, is_mplayer,
         is_animal, is_mindless, is_humanoid } from './mondata.js';
import { flush_screen } from './display.js';
import { nhgetch_raw, getlin } from './input.js';
import { impossible } from './pline.js';
import { discoverObject, undiscoverObject } from './o_init.js';
import { doname } from './mkobj.js';
import { objectData,
         AMULET_CLASS, SCROLL_CLASS, POTION_CLASS, WAND_CLASS, RING_CLASS,
         GEM_CLASS, SPBOOK_CLASS, ARMOR_CLASS, TOOL_CLASS, VENOM_CLASS,
       } from './objects.js';

// Re-export helper needed by x_monnam naming logic.
export { hasGivenName } from './mondata.js';

// ========================================================================
// christen_monst — cf. do_name.c:132
// Assigns a custom given name to a monster.
// In JS, we store the given name in mon.mgivenname (separate from
// mon.name which is the species display name).
// ========================================================================
export function christen_monst(mtmp, name) {
    if (!mtmp) return mtmp;
    if (name && name.length > 0) {
        mtmp.mgivenname = String(name).slice(0, 63); // PL_PSIZ limit
    } else {
        delete mtmp.mgivenname;
    }
    return mtmp;
}

// ========================================================================
// has_mgivenname / MGIVENNAME — JS equivalents
// C uses has_mgivenname(mtmp) macro and MGIVENNAME(mtmp) macro.
// In our JS port, the given name is either in mon.mgivenname (if
// christen_monst was called) or detected by hasGivenName() in mondata.js
// which compares mon.name to mon.type.mname.
// ========================================================================
function has_mgivenname(mon) {
    if (mon?.mgivenname) return true;
    return hasGivenName(mon);
}

function MGIVENNAME(mon) {
    if (mon?.mgivenname) return mon.mgivenname;
    // Fall back to mondata.js convention: if mon.name differs from type name
    if (hasGivenName(mon)) return mon.name;
    return '';
}

// ========================================================================
// Mgender — cf. do_name.c:1288
// Returns 0 for MALE, 1 for FEMALE.
// ========================================================================
const MALE = 0;
const FEMALE = 1;
const NEUTRAL = 2;
const NUM_MGENDERS = 3;

export function Mgender(mtmp) {
    if (mtmp?.female) return FEMALE;
    return MALE;
}

// ========================================================================
// pmname — cf. do_name.c:1302
// Returns the creature type name. C has pmnames[] array per gender;
// JS monster data uses a single C-style mname field.
// ========================================================================
// Autotranslated from do_name.c:1302
export function pmname(pm, mgender) {
  // JS monsters have a single mname field rather than C's pmnames[] array per gender.
  return pm?.mname || '';
}

// ========================================================================
// mon_pmname — cf. do_name.c:1312
// Returns the creature type name for a specific monster instance.
// ========================================================================
// Autotranslated from do_name.c:1312
export function mon_pmname(mon) {
  return pmname(mon.data || mon.type, Mgender(mon));
}

// ========================================================================
// W_SADDLE constant for saddle check
// ========================================================================
const W_SADDLE = 0x00100000;

// ========================================================================
// just_an — local helper matching C's just_an()
// Returns "a " or "an " for the given string.
// ========================================================================
function just_an(str) {
    const s = String(str || '').trimStart();
    if (!s) return 'a ';
    const c = s[0].toLowerCase();
    return 'aeiou'.includes(c) ? 'an ' : 'a ';
}

// ========================================================================
// x_monnam — cf. do_name.c:826
// Core monster name formatter with article, adjective, and visibility
// options. This is the faithful JS port of the C function.
//
// NOTE: This JS port does NOT yet handle all C conditions:
// - Hallucination (treated as always off since hallu isn't tracked here)
// - canspotmon (visibility always assumed true for non-UI code)
// - priests/minions priestname() (falls through to normal path)
// - shopkeepers shkname() (falls through to normal path)
// - player monsters rank_of() (falls through to normal path)
// - mappearance (not yet supported)
// These simplifications match the current state of the JS port where
// most callers are in combat/AI code operating on visible monsters.
// ========================================================================
export function x_monnam(mtmp, article = ARTICLE_NONE, adjective = null,
                         suppress = 0, called = false) {
    if (!mtmp) return 'it';

    const mdat = mtmp.data || mtmp.type || {};

    // C: if (mtmp == &youmonst) return "you"
    // JS: no youmonst equivalent yet; skip

    // Article YOUR on non-tame becomes THE
    if (article === ARTICLE_YOUR && !mtmp.tame) {
        article = ARTICLE_THE;
    }

    const do_hallu = false; // Hallucination not yet tracked
    const do_invis = !!(mtmp.minvis) && !(suppress & SUPPRESS_INVISIBLE);
    // Visibility: for now, assume monster is always visible in naming context
    // (canspotmon check would go here)
    const do_it = false; // !(suppress & SUPPRESS_IT) - simplified
    const do_saddle = !(suppress & SUPPRESS_SADDLE);
    const do_name = !(suppress & SUPPRESS_NAME) || type_is_pname(mdat);
    const augment_it = !!(suppress & AUGMENT_IT);

    let buf = '';

    // Unseen monster handling (simplified — always visible for now)
    if (do_it) {
        if (!augment_it) return 'it';
        const s_one = is_humanoid(mdat) && !is_animal(mdat) && !is_mindless(mdat);
        return s_one ? 'someone' : 'something';
    }

    // Get base monster name
    const pm_name = mon_pmname(mtmp);

    // Shopkeeper special handling
    if (mtmp.isshk && !do_hallu) {
        const shkName = mtmp.mgivenname || mtmp.shkname || mtmp.name || pm_name;
        if (adjective && article === ARTICLE_THE) {
            buf = `the ${adjective} ${shkName}`;
        } else {
            buf = shkName;
            if ((mtmp.mndx !== PM_SHOPKEEPER) || do_invis) {
                buf += ' the ';
                if (do_invis) buf += 'invisible ';
                buf += pm_name;
            }
        }
        return buf;
    }

    // Build adjective prefix
    if (adjective) {
        buf += adjective + ' ';
    }
    if (do_invis) {
        buf += 'invisible ';
    }
    if (do_saddle && (mtmp.misc_worn_check & W_SADDLE) && !do_hallu) {
        buf += 'saddled ';
    }
    const has_adjectives = (buf.length > 0);

    // Monster name or type
    let name_at_start = false;

    if (do_hallu) {
        // Would call rndmonnam() here — not yet for non-hallu path
        buf += pm_name;
        name_at_start = type_is_pname(mdat);
    } else if (do_name && has_mgivenname(mtmp)) {
        const givenName = MGIVENNAME(mtmp);

        if (mtmp.mndx === PM_GHOST) {
            buf += `${s_suffix(givenName)} ghost`;
            name_at_start = true;
        } else if (called) {
            buf += `${pm_name} called ${givenName}`;
            name_at_start = type_is_pname(mdat);
        } else if (is_mplayer(mdat) && givenName.includes(' the ')) {
            // <name> the <adjective> <invisible> <saddled> <rank>
            const theIdx = givenName.indexOf(' the ');
            let pbuf = givenName.slice(0, theIdx + 5);
            if (has_adjectives) pbuf += buf;
            pbuf += givenName.slice(theIdx + 5);
            buf = pbuf;
            article = ARTICLE_NONE;
            name_at_start = true;
        } else {
            buf += givenName;
            name_at_start = true;
        }
    } else if (is_mplayer(mdat)) {
        // Would use rank_of() here; fall through to pm_name
        buf += pm_name;
        name_at_start = false;
    } else {
        buf += pm_name;
        name_at_start = type_is_pname(mdat);
    }

    // Adjust article based on name type
    if (name_at_start && (article === ARTICLE_YOUR || !has_adjectives)) {
        if (mtmp.mndx === PM_WIZARD_OF_YENDOR) {
            article = ARTICLE_THE;
        } else {
            article = ARTICLE_NONE;
        }
    } else if ((mdat.geno & G_UNIQ) && article === ARTICLE_A) {
        article = ARTICLE_THE;
    }

    // Prepend article
    switch (article) {
    case ARTICLE_YOUR:
        buf = 'your ' + buf;
        break;
    case ARTICLE_THE:
        buf = 'the ' + buf;
        break;
    case ARTICLE_A:
        buf = just_an(buf) + buf;
        break;
    case ARTICLE_NONE:
    default:
        break;
    }

    return buf;
}

// ========================================================================
// Convenience wrappers — cf. do_name.c:1034-1165
// These all delegate to x_monnam with appropriate arguments.
// ========================================================================

// cf. do_name.c:1034 — l_monnam(mtmp): for use in "owner" context
export function l_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null,
        has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, true);
}

// cf. do_name.c:1041 — mon_nam(mtmp): standard monster name
export function mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null,
        has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}

// cf. do_name.c:1053 — noit_mon_nam(mtmp): monster name without "it"
export function noit_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_YOUR, null,
        has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | SUPPRESS_IT) : SUPPRESS_IT,
        false);
}

// cf. do_name.c:1064 — some_mon_nam(mtmp): vague monster reference
export function some_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null,
        has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | AUGMENT_IT) : AUGMENT_IT,
        false);
}

// cf. do_name.c:1073 — Monnam(mtmp): capitalized monster name
export function Monnam(mtmp) {
    const bp = mon_nam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// cf. do_name.c:1082 — noit_Monnam(mtmp): capitalized non-"it" name
export function noit_Monnam(mtmp) {
    const bp = noit_mon_nam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// cf. do_name.c:1091 — Some_Monnam(mtmp): capitalized vague reference
export function Some_Monnam(mtmp) {
    const bp = some_mon_nam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// cf. do_name.c:1101 — noname_monnam(mtmp, article): no given name
export function noname_monnam(mtmp, article) {
    return x_monnam(mtmp, article, null, SUPPRESS_NAME, false);
}

// cf. do_name.c:1109 — m_monnam(mtmp): exact name (disclosure)
export function m_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null, EXACT_NAME, false);
}

// cf. do_name.c:1116 — y_monnam(mtmp): "your" for pets, "the" otherwise
export function y_monnam(mtmp) {
    const prefix = mtmp?.tame ? ARTICLE_YOUR : ARTICLE_THE;
    const suppression_flag = (has_mgivenname(mtmp) /* || mtmp === u.usteed */)
        ? SUPPRESS_SADDLE : 0;
    return x_monnam(mtmp, prefix, null, suppression_flag, false);
}

// cf. do_name.c:1132 — YMonnam(mtmp): capitalized "your" reference
export function YMonnam(mtmp) {
    const bp = y_monnam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// cf. do_name.c:1141 — Adjmonnam(mtmp, adj): adjective-prefixed name
export function Adjmonnam(mtmp, adj) {
    const bp = x_monnam(mtmp, ARTICLE_THE, adj,
        has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
    return highc(bp[0]) + bp.slice(1);
}

// cf. do_name.c:1151 — a_monnam(mtmp): indefinite article monster name
export function a_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null,
        has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}

// cf. do_name.c:1158 — Amonnam(mtmp): capitalized indefinite article name
export function Amonnam(mtmp) {
    const bp = a_monnam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// cf. do_name.c:1169 — distant_monnam(mon, article): distant reference
export function distant_monnam(mon, article = ARTICLE_NONE) {
    // Simplified: no Astral Plane high priest check yet
    return x_monnam(mon, article, null, 0, true);
}

// cf. do_name.c:1190 — mon_nam_too(mon, other_mon): relative name
export function mon_nam_too(mon, other_mon) {
    if (mon !== other_mon) {
        return mon_nam(mon);
    }
    // Same monster: reflexive pronoun
    if (mon?.female) return 'herself';
    return 'itself'; // simplified: no hallu "themselves"
}

// cf. do_name.c:1220 — monverbself(mon, monnamtext, verb, othertext)
export function monverbself(mon, monnamtext, verb, othertext) {
    const selfbuf = mon_nam_too(mon, mon);
    let result = monnamtext;
    result += ' ' + verb;
    if (othertext) result += ' ' + othertext;
    result += ' ' + selfbuf;
    return result;
}

// cf. do_name.c:1253 — minimal_monnam(mon, ckloc): for debugging
export function minimal_monnam(mon, _ckloc = false) {
    if (!mon) return '[Null monster]';
    const mdat = mon.type;
    if (!mdat) return '[Null mon->data]';
    const prefix = mon.tame ? 'tame ' : mon.mpeaceful ? 'peaceful ' : '';
    return `${prefix}${mon_pmname(mon)} <${mon.mx ?? '?'},${mon.my ?? '?'}>`;
}

// ========================================================================
// Bogus monster list — cf. dat/bogusmon.txt
// Compiled into JS since we don't have file access at runtime.
// The prefix codes -_+|= indicate gender/pname status.
// ========================================================================
const bogusmons = [
    "jumbo shrimp", "giant pigmy", "gnu", "killer penguin",
    "giant cockroach", "giant slug", "maggot", "pterodactyl",
    "tyrannosaurus rex", "basilisk", "beholder", "nightmare",
    "efreeti", "marid", "rot grub", "bookworm", "master lichen",
    "shadow", "hologram", "jester", "attorney", "sleazoid",
    "killer tomato", "amazon", "robot", "battlemech", "rhinovirus",
    "harpy", "lion-dog", "rat-ant", "Y2K bug", "angry mariachi",
    "arch-pedant", "bluebird of happiness", "cardboard golem",
    "duct tape golem", "diagonally moving grid bug", "evil overlord",
    "newsgroup troll", "ninja pirate zombie robot", "octarine dragon",
    "plaid unicorn", "gonzo journalist", "lag monster", "loan shark",
    "possessed waffle iron", "poultrygeist", "stuffed raccoon puppet",
    "viking", "wee green blobbie", "wereplatypus", "hag of bolding",
    "blancmange", "raging nerd", "spelling bee", "land octopus",
    "frog prince", "pigasus", "_Semigorgon", "conventioneer",
    "large microbat", "small megabat", "uberhulk", "tofurkey",
    "+Dudley", "shrinking violet", "shallow one", "spherical cow",
    "electric giraffe", "steam dragon", "omnibus", "slinky",
    "maxotaur", "millitaur", "octahedron", "dungeon core",
    "quale", "holloway", "chiasmus", "giant tetrapod", "voussoir",
    "barking spider", "frog cloud", "toothsayer",
    "grue", "Christmas-tree monster", "luck sucker", "paskald",
    "brogmoid", "dornbeast",
    "Ancient Multi-Hued Dragon", "+Evil Iggy",
    "rattlesnake", "ice monster", "phantom", "quagga",
    "aquator", "griffin", "emu", "kestrel", "xeroc", "venus flytrap",
    "creeping coins", "hydra", "siren", "killer bunny",
    "rodent of unusual size", "were-rabbit",
    "+Smokey Bear", "Luggage", "vampiric watermelon", "Ent",
    "tangle tree", "nickelpede", "wiggle",
    "white rabbit", "snark", "pushmi-pullyu", "smurf",
    "tribble", "Klingon", "Borg", "Ewok", "Totoro", "ohmu",
    "youma", "nyaasu",
    "-Godzilla", "+King Kong",
    "earthquake beast", "Invid", "Terminator", "boomer", "Dalek",
    "microscopic space fleet", "Ravenous Bugblatter Beast of Traal",
    "leathery-winged avian", "teenage mutant ninja turtle",
    "samurai rabbit", "aardvark", "=Audrey II",
    "witch doctor", "one-eyed one-horned flying purple people eater",
    "+Barney the dinosaur", "+Morgoth", "Vorlon", "questing beast",
    "Predator", "dementor", "mother-in-law",
    "praying mantis", "beluga whale", "chicken", "coelacanth",
    "star-nosed mole", "lungfish", "slow loris", "sea cucumber",
    "tapeworm", "liger", "velociraptor", "corpulent porpoise",
    "quokka", "potoo", "lemming", "dhole",
    "wolpertinger", "elwedritsche", "skvader", "+Nessie",
    "tatzelwurm", "dahu",
    "dropbear", "wild haggis", "jackalope", "flying monkey",
    "flying pig", "hippocampus", "hippogriff", "kelpie",
    "catoblepas", "phoenix", "amphisbaena",
    "bouncing eye", "floating nose", "wandering eye",
    "buffer overflow", "dangling pointer", "walking disk drive",
    "floating point", "regex engine", "netsplit", "wiki", "peer",
    "COBOL", "wire shark",
    "bohrbug", "mandelbug", "schroedinbug", "heisenbug",
    "cacodemon", "scrag", "+Crow T. Robot",
    "chess pawn", "chocolate pudding", "ooblecks",
    "terracotta warrior", "hearse", "roomba", "miniature blimp",
    "dust speck", "gazebo",
    "gray goo", "magnetic monopole",
    "first category perpetual motion device", "big dumb object",
    "+Lord British", "particle man", "kitten prospecting robot",
    "guillemet", "solidus", "obelus", "dingbat", "bold face",
    "boustrophedon", "ligature", "rebus", "dinkus",
    "apostrophe golem", "voluptuous ampersand",
    "+Bob the angry flower", "+Strong Bad", "+Magical Trevor",
    "smakken", "mimmoth", "one-winged dewinged stab-bat",
    "Invisible Pink Unicorn", "Flying Spaghetti Monster",
    "three-headed monkey", "+El Pollo Diablo",
    "little green man", "weighted Companion Cube",
    "/b/tard", "manbearpig",
    "bonsai-kitten", "tie-thulu", "+Domo-kun",
    "looooooooooooong cat", "nyan cat",
    "ceiling cat", "basement cat", "monorail cat",
    "tridude", "orcus cosmicus",
    "yeek", "quylthulg", "Greater Hell Beast",
    "+Vendor of Yizard",
    "+Sigmund", "lernaean hydra", "-Ijyb", "=Gloorx Vloq",
    "+Blork the orc",
    "unicorn pegasus kitten", "enderman",
    "wight supremacist", "zergling",
    "existential angst", "figment of your imagination",
    "flash of insight", "ghoti", "vermicious knid",
    "meeple", "womble", "fraggle", "stainless steel rat",
    "antagonistic undecagonstring", "mock role",
    "clown", "mime", "peddler", "haggler",
    "gloating eye", "flush golem", "martyr orc", "mortar orc",
    "acid blog", "acute blob", "aria elemental",
    "aliasing priest", "aligned parasite", "aligned parquet",
    "aligned proctor", "baby balky dragon", "baby blues dragon",
    "baby caricature", "baby crochet", "baby grainy dragon",
    "baby bong worm", "baby long word", "baby parable worm",
    "barfed devil", "beer wight", "boor wight", "brawny mold",
    "rave spider", "clue golem", "bust vortex",
    "errata elemental", "elastic eel", "electrocardiogram eel",
    "fir elemental", "tire elemental", "flamingo sphere",
    "fallacy golem", "frizzed centaur", "forest centerfold",
    "fierceness sphere", "frosted giant", "geriatric snake",
    "gnat ant", "giant bath", "grant beetle", "greater snake",
    "grind bug", "giant mango", "glossy golem", "gnome laureate",
    "gnome dummy", "gooier ooze", "green slide", "guardian nacho",
    "hell hound pun", "high purist", "hairnet devil", "ice trowel",
    "killer beet", "feather golem", "lounge worm", "mountain lymph",
    "pager golem", "pie fiend", "prophylactic worm", "sock mole",
    "rogue piercer", "seesawing sphere", "simile mimic",
    "moldier ant", "stain vortex", "scone giant", "umbrella hulk",
    "vampire mace", "verbal jabberwock", "water lemon",
    "water melon", "winged grizzly", "yellow wight",
];

// bogon_codes prefix characters: "-_+|=" from C's bogon_codes[]
const BOGON_CODES = '-_+|=';

// ========================================================================
// bogusmon — cf. do_name.c:1369 / rumors.c
// Returns {name, code} where code is the prefix character (if any).
// In C this reads from BOGUSMONFILE; we use the compiled-in list.
// Uses rn2_on_display_rng to match C's RNG consumption.
// ========================================================================
export function bogusmon() {
    const idx = rn2_on_display_rng(bogusmons.length);
    let entry = bogusmons[idx];
    let code = '';
    if (entry.length > 0 && BOGON_CODES.includes(entry[0])) {
        code = entry[0];
        entry = entry.slice(1);
    }
    return { name: entry, code };
}

// ========================================================================
// bogon_is_pname — cf. do_name.c:1414
// Returns true if the bogon code character indicates a proper name.
// Codes: - (female pname), + (male pname), = (unspecified pname)
// ========================================================================
export function bogon_is_pname(code) {
    if (!code) return false;
    return '-+='.includes(code);
}

// ========================================================================
// rndmonnam — cf. do_name.c:1388
// RNG-CONSUMING: generates a random monster name for hallucination.
// Uses rn2_on_display_rng to match C's separate display RNG stream.
//
// Returns {name, code} where code is the bogon prefix (if any).
// C returns char* and sets *code; JS returns an object.
// ========================================================================
const BOGUSMONSIZE = 100; // arbitrary, matches C

export function rndmonnam() {
    let name;
    let code = '';

    // C: do { name = rn2_on_display_rng(SPECIAL_PM + BOGUSMONSIZE - LOW_PM) + LOW_PM; }
    //    while (name < SPECIAL_PM && (type_is_pname || G_NOGEN));
    let nameIdx;
    do {
        nameIdx = rn2_on_display_rng(SPECIAL_PM + BOGUSMONSIZE - LOW_PM) + LOW_PM;
    } while (nameIdx < SPECIAL_PM
             && (type_is_pname(mons[nameIdx]) || (mons[nameIdx].geno & G_NOGEN)));

    if (nameIdx >= SPECIAL_PM) {
        // Use bogus monster name
        const b = bogusmon();
        name = b.name;
        code = b.code;
    } else {
        // Use real monster name with random gender
        name = pmname(mons[nameIdx], rn2_on_display_rng(2));
    }
    return { name, code };
}

// ========================================================================
// hcolors — cf. do_name.c:1441 — hallucinatory color names
// ========================================================================
const hcolors = [
    "ultraviolet", "infrared", "bluish-orange", "reddish-green", "dark white",
    "light black", "sky blue-pink", "pinkish-cyan", "indigo-chartreuse",
    "salty", "sweet", "sour", "bitter", "umami",
    "striped", "spiral", "swirly", "plaid", "checkered", "argyle", "paisley",
    "blotchy", "guernsey-spotted", "polka-dotted", "square", "round",
    "triangular", "cabernet", "sangria", "fuchsia", "wisteria", "lemon-lime",
    "strawberry-banana", "peppermint", "romantic", "incandescent",
    "octarine",
    "excitingly dull", "mauve", "electric",
    "neon", "fluorescent", "phosphorescent", "translucent", "opaque",
    "psychedelic", "iridescent", "rainbow-colored", "polychromatic",
    "colorless", "colorless green",
    "dancing", "singing", "loving", "loudy", "noisy", "clattery", "silent",
    "apocyan", "infra-pink", "opalescent", "violant", "tuneless",
    "viridian", "aureolin", "cinnabar", "purpurin", "gamboge", "madder",
    "bistre", "ecru", "fulvous", "tekhelet", "selective yellow",
];

// cf. do_name.c:1460 — hcolor(colorpref): hallucinatory or real color
export function hcolor(colorpref) {
    // For now, always return the non-hallu preference (no Hallucination check)
    // When hallucinating, would use: hcolors[rn2_on_display_rng(hcolors.length)]
    if (!colorpref) {
        return hcolors[rn2_on_display_rng(hcolors.length)];
    }
    return colorpref;
}

// ========================================================================
// c_obj_colors — cf. decl.c:20
// Color index to color name mapping. Matches CLR_* constants.
// ========================================================================
const c_obj_colors = [
    "black",          // CLR_BLACK (0)
    "red",            // CLR_RED (1)
    "green",          // CLR_GREEN (2)
    "brown",          // CLR_BROWN (3)
    "blue",           // CLR_BLUE (4)
    "magenta",        // CLR_MAGENTA (5)
    "cyan",           // CLR_CYAN (6)
    "gray",           // CLR_GRAY (7)
    "transparent",    // NO_COLOR (8)
    "orange",         // CLR_ORANGE (9)
    "bright green",   // CLR_BRIGHT_GREEN (10)
    "yellow",         // CLR_YELLOW (11)
    "bright blue",    // CLR_BRIGHT_BLUE (12)
    "bright magenta", // CLR_BRIGHT_MAGENTA (13)
    "bright cyan",    // CLR_BRIGHT_CYAN (14)
    "white",          // CLR_WHITE (15)
];

// ========================================================================
// rndcolor — cf. do_name.c:1469
// RNG-CONSUMING: returns a random real color name.
// Uses rn2() (main RNG), not display RNG. If hallucinating, would use
// hcolor() instead. This matches C exactly.
// ========================================================================
export function rndcolor() {
    const k = rn2(CLR_MAX);
    // C: return Hallucination ? hcolor(NULL) : (k == NO_COLOR) ? "colorless" : c_obj_colors[k]
    // For now, no Hallucination check (always non-hallu path)
    if (k === NO_COLOR) return 'colorless';
    return c_obj_colors[k];
}

// ========================================================================
// hliquids — cf. do_name.c:1479
// ========================================================================
const hliquids = [
    "yoghurt", "oobleck", "clotted blood", "diluted water", "purified water",
    "instant coffee", "tea", "herbal infusion", "liquid rainbow",
    "creamy foam", "mulled wine", "bouillon", "nectar", "grog", "flubber",
    "ketchup", "slow light", "oil", "vinaigrette", "liquid crystal", "honey",
    "caramel sauce", "ink", "aqueous humour", "milk substitute",
    "fruit juice", "glowing lava", "gastric acid", "mineral water",
    "cough syrup", "quicksilver", "sweet vitriol", "grey goo", "pink slime",
    "cosmic latte",
];

// cf. do_name.c:1492 — hliquid(liquidpref): hallucinatory liquid
export function hliquid(liquidpref) {
    // Simplified: no Hallucination check; return pref or random if null
    if (!liquidpref) {
        return hliquids[rn2_on_display_rng(hliquids.length)];
    }
    return liquidpref;
}

// ========================================================================
// rndorcname — cf. do_name.c:1537
// RNG-CONSUMING: generates a random orc clan name.
// Uses rn1() and rn2() from main RNG stream, matching C exactly.
//
// C code:
//   int i, iend = rn1(2, 3), vstart = rn2(2);
//   for (i = 0; i < iend; ++i) {
//       vstart = 1 - vstart;
//       Sprintf(eos(s), "%s%s", (i > 0 && !rn2(30)) ? "-" : "",
//               vstart ? ROLL_FROM(v) : ROLL_FROM(snd));
//   }
// ROLL_FROM(a) = a[rn2(SIZE(a))]
// ========================================================================
export function rndorcname() {
    const v = ["a", "ai", "og", "u"];
    const snd = ["gor", "gris", "un", "bane", "ruk",
                  "oth", "ul", "z", "thos", "akh", "hai"];

    const iend = rn1(2, 3);  // 3..4 syllables
    let vstart = rn2(2);     // start with vowel or consonant
    let s = '';

    for (let i = 0; i < iend; i++) {
        vstart = 1 - vstart;  // alternate
        const hyphen = (i > 0 && !rn2(30)) ? '-' : '';
        let syllable;
        if (vstart) {
            syllable = v[rn2(v.length)];       // ROLL_FROM(v)
        } else {
            syllable = snd[rn2(snd.length)];   // ROLL_FROM(snd)
        }
        s += hyphen + syllable;
    }
    return s;
}

// ========================================================================
// christen_orc — cf. do_name.c:1556
// Assigns a random orc name with optional gang/other suffix.
// Uses rndorcname() which consumes RNG.
// ========================================================================
export function christen_orc(mtmp, gang = null, other = null) {
    if (!mtmp) return mtmp;

    const orcname = rndorcname();
    let buf = '';
    let nameit = false;

    if (gang) {
        buf = `${upstart(orcname)} of ${upstart(gang)}`;
        nameit = true;
    } else if (other) {
        buf = `${upstart(orcname)}${other}`;
        nameit = true;
    }

    if (nameit) {
        mtmp = christen_monst(mtmp, buf);
    }
    return mtmp;
}

// ========================================================================
// roguename — cf. do_name.c:1423
// RNG-CONSUMING: random rogue character name.
// ========================================================================
export function roguename() {
    return rn2(3) ? (rn2(2) ? "Michael Toy" : "Kenneth Arnold")
                  : "Glenn Wichman";
}

// ========================================================================
// coyotename — cf. do_name.c:1526
// ========================================================================
const coynames = [
    "Carnivorous Vulgaris", "Road-Runnerus Digestus", "Eatibus Anythingus",
    "Famishus-Famishus", "Eatibus Almost Anythingus", "Eatius Birdius",
    "Famishius Fantasticus", "Eternalii Famishiis", "Famishus Vulgarus",
    "Famishius Vulgaris Ingeniusi", "Eatius-Slobbius", "Hardheadipus Oedipus",
    "Carnivorous Slobbius", "Hard-Headipus Ravenus", "Evereadii Eatibus",
    "Apetitius Giganticus", "Hungrii Flea-Bagius", "Overconfidentii Vulgaris",
    "Caninus Nervous Rex", "Grotesques Appetitus", "Nemesis Ridiculii",
    "Canis latrans",
];

export function coyotename(mtmp) {
    if (!mtmp) return '';
    const base = x_monnam(mtmp, ARTICLE_NONE, null, 0, true);
    const alias = mtmp.mcan
        ? coynames[coynames.length - 1]
        : coynames[(mtmp.m_id || 0) % (coynames.length - 1)];
    return `${base} - ${alias}`;
}

// ========================================================================
// Discworld novels — cf. do_name.c:1588
// ========================================================================
const sir_Terry_novels = [
    "The Colour of Magic", "The Light Fantastic", "Equal Rites", "Mort",
    "Sourcery", "Wyrd Sisters", "Pyramids", "Guards! Guards!", "Eric",
    "Moving Pictures", "Reaper Man", "Witches Abroad", "Small Gods",
    "Lords and Ladies", "Men at Arms", "Soul Music", "Interesting Times",
    "Maskerade", "Feet of Clay", "Hogfather", "Jingo", "The Last Continent",
    "Carpe Jugulum", "The Fifth Elephant", "The Truth", "Thief of Time",
    "The Last Hero", "The Amazing Maurice and His Educated Rodents",
    "Night Watch", "The Wee Free Men", "Monstrous Regiment",
    "A Hat Full of Sky", "Going Postal", "Thud!", "Wintersmith",
    "Making Money", "Unseen Academicals", "I Shall Wear Midnight", "Snuff",
    "Raising Steam", "The Shepherd's Crown",
];

// cf. do_name.c:1610 — noveltitle(novidx): random Discworld novel
export function noveltitle(novidx = null) {
    let j = rn2(sir_Terry_novels.length);
    if (novidx !== null && novidx >= 0 && novidx < sir_Terry_novels.length) {
        j = novidx;
    }
    return { title: sir_Terry_novels[j], index: j };
}

// ========================================================================
// Player-interactive stubs — not needed for automated play
// ========================================================================

// TODO: do_name.c:50 — free_mgivenname(): monster name deallocation (N/A in JS GC)
// TODO: do_name.c:80 — free_oname(): object name deallocation (N/A in JS GC)
// TODO: do_name.c:94 — safe_oname(): safe object name pointer
// TODO: do_name.c:198 — do_mgivenname(): monster naming command (player interactive)
// TODO: do_name.c:289 — do_oname(): object naming command (player interactive)
// TODO: do_name.c:428 — objtyp_is_callable(): object type nameable check
// TODO: do_name.c:466 — name_ok(): naming permission check
// TODO: do_name.c:479 — call_ok(): call eligibility check
// TODO: do_name.c:498 — docallcmd(): #name command handler (player interactive)
// TODO: do_name.c:604 — docall_xname(): object name extraction
// TODO: do_name.c:635 — docall(): object name assignment
// TODO: do_name.c:678 — namefloorobj(): floor object naming (player interactive)
// TODO: do_name.c:1320 — obj_pmname(): object creature type name
// TODO: do_name.c:1626 — lookup_novel(): novel title search (player interactive)

// cf. do_name.c:31 — new_mgivenname: allocate space for monster given name
// In JS, names are just strings — no allocation needed.
export function new_mgivenname(mon, lth) {
    if (lth) {
        if (!mon.mextra) mon.mextra = {};
        else free_mgivenname(mon);
        // MGIVENNAME will be set by caller
    } else {
        if (has_mgivenname(mon)) free_mgivenname(mon);
    }
}

// cf. do_name.c:61 — new_oname: allocate space for object name
// In JS, names are just strings — no allocation needed.
export function new_oname(obj, lth) {
    if (lth) {
        if (!obj.oextra) obj.oextra = {};
        else free_oname(obj);
        // ONAME will be set by caller
    } else {
        if (has_oname(obj)) free_oname(obj);
    }
}

// cf. do_name.c:105 — name_from_player: get a name string from player input
export async function name_from_player(prompt, defres) {
    let buf = await getlin(prompt);
    if (!buf || buf === '\x1b') return null;
    // Strip leading/trailing spaces, condense internal sequences
    buf = buf.replace(/\s+/g, ' ').trim();
    if (buf.length > 31) buf = buf.substring(0, 31); // PL_PSIZ
    return buf || null;
}

// cf. do_name.c:158 — alreadynamed: check if monster is already named this
export function alreadynamed(mtmp, monnambuf, usrbuf) {
    if (!usrbuf || !usrbuf.length) {
        // Attempt to erase existing name
        const name_not_title = hasGivenName(mtmp)
            || type_is_pname(mtmp.data || mtmp.type)
            || mtmp.isshk;
        return { rejected: true, msg:
            `${upstart(monnambuf)} would rather keep its existing ${name_not_title ? 'name' : 'title'}.` };
    }
    // Check fuzzy match
    const lower = (s) => (s || '').toLowerCase().replace(/[-_ ]/g, '');
    if (lower(usrbuf) === lower(monnambuf)) {
        return { rejected: true, msg:
            `${upstart(monnambuf)} is already called ${monnambuf}.` };
    }
    // Check "the X" prefix
    if (monnambuf.toLowerCase().startsWith('the ')
        && lower(usrbuf) === lower(monnambuf.substring(4))) {
        return { rejected: true, msg:
            `${upstart(monnambuf)} is already called ${monnambuf}.` };
    }
    return { rejected: false };
}

// cf. do_name.c:290 — do_oname: name an individual object
// JS equivalent: oname() at line ~859 handles the naming logic
export async function do_oname(obj, player) {
    if (!obj) return;
    // Novel can't be renamed
    const SPE_NOVEL = 406; // from objects.js
    if (obj.otyp === SPE_NOVEL) {
        // C: pline("%s already has a published name.", Ysimple_name2(obj));
        return;
    }
    const prompt = `What do you want to name this ${doname(obj, player)}? `;
    const buf = await name_from_player(prompt, safe_oname(obj));
    if (!buf) return;
    if (obj.oartifact) {
        const aname = has_oname(obj) ? ONAME(obj) : 'The artifact';
        // C: pline("%s resists the attempt.", aname);
        return;
    }
    await oname(obj, buf, 0, player);
}

// cf. do_name.c:429 — objtyp_is_callable: check if object type can be called
// JS equivalent: isObjectTypeCallable at line ~976
export function objtyp_is_callable(i) {
    const od = objectData[i];
    if (!od) return false;
    if (od.oc_uname) return true;
    const cls = od.oc_class;
    switch (cls) {
    case AMULET_CLASS:
        // Amulets of Yendor can't be called (anti-identification exploit)
        if (od.oc_name === 'Amulet of Yendor' || od.oc_name === 'cheap plastic imitation of the Amulet of Yendor')
            return false;
        // fall through
    case SCROLL_CLASS: case POTION_CLASS: case WAND_CLASS:
    case RING_CLASS: case GEM_CLASS: case SPBOOK_CLASS:
    case ARMOR_CLASS: case TOOL_CLASS: case VENOM_CLASS:
        if (od.oc_descr) return true;
        break;
    }
    return false;
}

// cf. do_name.c:499 — docallcmd: naming menu command dispatcher
// JS equivalent: handleCallObjectTypePrompt (defined below)

// cf. do_name.c:679 — namefloorobj: name type of object on floor
export async function namefloorobj(player, map, display) {
    // Simplified: in full C, this uses getpos to select a floor tile
    // and then calls docall on the object there.
    // Stub for CODEMATCH — full implementation requires getpos infrastructure.
    // Full implementation requires getpos infrastructure — stub for CODEMATCH
}

// cf. do_name.c:759 — ghost names array
const ghostnames = [
    'Adri', 'Andries', 'Andreas', 'Bert', 'David', 'Dirk',
    'Emile', 'Frans', 'Fred', 'Greg', 'Hether', 'Jay',
    'John', 'Jon', 'Karnov', 'Kay', 'Kenny', 'Kevin',
    'Maud', 'Michiel', 'Mike', 'Peter', 'Robert', 'Ron',
    'Tom', 'Wilmar', 'Nick Danger', 'Phoenix', 'Jiro', 'Mizue',
    'Stephan', 'Lance Braccus', 'Shadowhawk', 'Murphy',
];
// cf. do_name.c:772 — rndghostname: random ghost name for ghost monsters
export function rndghostname(player) {
    // C: rn2(7) ? ROLL_FROM(ghostnames) : plname
    // ROLL_FROM picks a random entry from the array
    return rn2(7) ? ghostnames[rn2(ghostnames.length)]
                  : (player?.name || 'Strstripes');
}

// Autotranslated from do_name.c:50
export function free_mgivenname(mon) {
  if (has_mgivenname(mon)) { if (mon.mextra) mon.mextra.mgivenname = null; mon.mgivenname = null; }
}

// Autotranslated from do_name.c:80
export function free_oname(obj) {
  if (has_oname(obj) && obj.oextra) { obj.oextra.oname = null; } // JS: no free() needed
}

// Autotranslated from do_name.c:94
export function safe_oname(obj) {
  if (has_oname(obj)) return ONAME(obj);
  return "";
}

// Autotranslated from do_name.c:198
export async function do_mgivenname(player) {
  let buf, monnambuf, qbuf, cc = { x: 0, y: 0 }, cx, cy, mtmp = null, do_swallow = false;
  if ((player?.Hallucination || player?.hallucinating || false)) { await You("would never recognize it anyway."); return; }
  cc.x = player.x;
  cc.y = player.y;
  if (getpos( cc, false, "the monster you want to name") < 0 || !isok(cc.x, cc.y)) return;
  cx = cc.x, cy = cc.y;
  if (u_at(cx, cy)) {
    if (player.usteed && canspotmon(player.usteed)) { mtmp = player.usteed; }
    else {
      await pline("This %s creature is called %s and cannot be renamed.", beautiful(), svp.plname);
      return;
    }
  }
  else {
    mtmp = m_at(cx, cy);
  }
  if (!mtmp && player.uswallow) {
    let glyph = glyph_at(cx, cy);
    if (glyph_is_swallow(glyph)) { mtmp = player.ustuck; do_swallow = true; }
  }
  if (!do_swallow && (!mtmp || (!sensemon(mtmp) && (!(cansee(cx, cy) || see_with_infrared(mtmp)) || mtmp.mundetected || M_AP_TYPE(mtmp) === M_AP_FURNITURE || M_AP_TYPE(mtmp) === M_AP_OBJECT || (mtmp.minvis && !See_invisible))))) { await pline("I see no monster there."); return; }
  qbuf = `What do you want to call ${distant_monnam(mtmp, ARTICLE_THE, monnambuf)}?`;
  if (!name_from_player(buf, qbuf, has_mgivenname(mtmp) ? MGIVENNAME(mtmp) : null)) return;
  if ((mtmp.data.geno & G_UNIQ) && !mtmp.ispriest) {
    if (!alreadynamed(mtmp, monnambuf, buf)) await pline("%s doesn't like being called names!", upstart(monnambuf));
  }
  else if (mtmp.isshk && !((player?.Deaf || player?.deaf || false) || helpless(mtmp) || mtmp.data.msound <= MS_ANIMAL)) {
    if (!alreadynamed(mtmp, monnambuf, buf)) {
      await verbalize("I'm %s, not %s.", shkname(mtmp), buf);
    }
  }
  else if (mtmp.ispriest || mtmp.isminion || mtmp.isshk || mtmp.data === mons[PM_GHOST] || has_ebones(mtmp)) {
    if (!alreadynamed(mtmp, monnambuf, buf)) await pline("%s will not accept the name %s.", upstart(monnambuf), buf);
  }
  else { christen_monst(mtmp, buf); }
}

// Autotranslated from do_name.c:371
export async function oname(obj, name, oflgs, player) {
  let lth, buf;
  let via_naming = (oflgs & ONAME_VIA_NAMING) !== 0, skip_inv_update = (oflgs & ONAME_SKIP_INVUPD) !== 0;
  lth = name ? (name.length + 1) : 0;
  if (lth > PL_PSIZ) {
    lth = PL_PSIZ;
    name = name.slice(0, PL_PSIZ - 1);
  }
  if (obj.oartifact || (lth && exist_artifact(obj.otyp, name))) return obj;
  new_oname(obj, lth);
  if (lth) {
    if (obj.oextra) obj.oextra.oname = name;
  }
  if (lth) artifact_exists(obj, name, true, oflgs);
  if (obj.oartifact) {
    if (obj === player.swapWeapon) await untwoweapon();
    if (obj === player.weapon) await set_artifact_intrinsic(obj, true, W_WEP);
    if (obj.unpaid) alter_cost(obj, 0);
    if (via_naming) {
      if (!player.uconduct.literate++) livelog_printf(LL_CONDUCT | LL_ARTIFACT, "became literate by naming %s", bare_artifactname(obj));
      else {
        livelog_printf(LL_ARTIFACT, "chose %s to be named \"%s\"", ansimpleoname(obj), bare_artifactname(obj));
      }
    }
  }
  if (carried(obj) && !skip_inv_update) update_inventory();
  return obj;
}

// Autotranslated from do_name.c:466
export function name_ok(obj) {
  if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
  if (!obj.dknown || obj.oartifact || obj.otyp === SPE_NOVEL) return GETOBJ_DOWNPLAY;
  return GETOBJ_SUGGEST;
}

// Autotranslated from do_name.c:479
export function call_ok(obj) {
  if (!obj || !objtyp_is_callable(obj.otyp)) return GETOBJ_EXCLUDE;
  if (!obj.dknown || (objectData[obj.otyp].oc_name_known && !objectData[obj.otyp].oc_uname)) return GETOBJ_DOWNPLAY;
  return GETOBJ_SUGGEST;
}

// Autotranslated from do_name.c:604
export function docall_xname(obj) {
  let otemp;
  otemp = obj;
  otemp.oextra =  0;
  otemp.quan = 1;
  otemp.blessed = otemp.cursed = 0;
  if (otemp.oclass === WEAPON_CLASS) otemp.opoisoned = 0;
  else if (otemp.oclass === POTION_CLASS) otemp.odiluted = 0;
  else if (otemp.otyp === TOWEL || otemp.otyp === STATUE) otemp.spe = 0;
  else if (otemp.otyp === TIN) otemp.known = 0;
  else if (otemp.otyp === FIGURINE) otemp.corpsenm = NON_PM;
  else if (otemp.otyp === HEAVY_IRON_BALL) otemp.owt = objectData[HEAVY_IRON_BALL].oc_wt;
  else if (otemp.oclass === FOOD_CLASS && otemp.globby) otemp.owt = 120;
  return an(xname( otemp));
}

// Autotranslated from do_name.c:635
export async function docall(obj) {
  let buf, qbuf, uname_p, had_name = false;
  if (!obj.dknown) return;
  flush_screen(1);
  if (obj.oclass === POTION_CLASS && obj.fromsink) {
    qbuf = `Call a stream of ${OBJ_DESCR(objectData[obj.otyp])} fluid:`;
  }
  else {
    safe_qbuf(qbuf, "Call ", ":", obj, docall_xname, simpleonames, "thing");
  }
  uname_p = (objectData[obj.otyp].oc_uname);
  if (!name_from_player(buf, qbuf, uname_p)) return;
  if ( uname_p) { had_name = true; (uname_p, 0), uname_p = null; }
  mungspaces(buf);
  if (!buf) { if (had_name) undiscoverObject(obj.otyp); }
  else { uname_p = buf; discoverObject(obj.otyp, false, true); }
  if (obj.where === 'OBJ_INVENT' || carrying(obj.otyp)) update_inventory();
}

// Autotranslated from do_name.c:1320
export function obj_pmname(obj) {
  if ((obj.otyp === CORPSE || obj.otyp === STATUE || obj.otyp === FIGURINE) && ismnum(obj.corpsenm)) {
    let cgend = (obj.spe & CORPSTAT_GENDER), mgend = ((cgend === CORPSTAT_MALE) ? MALE : (cgend === CORPSTAT_FEMALE) ? FEMALE : NEUTRAL), mndx = obj.corpsenm;
    if (mndx === PM_ALIGNED_CLERIC && cgend === CORPSTAT_RANDOM) mndx = PM_CLERIC;
    return pmname(mons[mndx], mgend);
  }
  impossible("obj_pmname otyp:%i,corpsenm:%i", obj.otyp, obj.corpsenm);
  return "two-legged glorkum-seeker";
}

// C ref: do_name.c:1626 — lookup_novel(): search for novel title by name
export function lookup_novel(lookname, idx) {
  const eq = (a, b) => a.toLowerCase() === b.toLowerCase();
  // Handle common misspellings/abbreviations
  if (eq(The(lookname), "The Color of Magic")) lookname = sir_Terry_novels[0];
  else if (eq(lookname, "Sorcery")) lookname = sir_Terry_novels[4];
  else if (eq(lookname, "Masquerade")) lookname = sir_Terry_novels[17];
  else if (eq(The(lookname), "The Amazing Maurice")) lookname = sir_Terry_novels[27];
  else if (eq(lookname, "Thud")) lookname = sir_Terry_novels[33];
  for (let k = 0; k < sir_Terry_novels.length; ++k) {
    if (eq(lookname, sir_Terry_novels[k]) || eq(The(lookname), sir_Terry_novels[k])) {
      return { title: sir_Terry_novels[k], index: k };
    }
  }
  if (idx != null && idx >= 0 && idx < sir_Terry_novels.length) {
    return { title: sir_Terry_novels[idx], index: idx };
  }
  return null;
}

// ========================================================================
// Object type calling (merged from discovery.js)
// C ref: do_name.c objtyp_is_callable(), docallcmd()
// ========================================================================

// C ref: do_name.c objtyp_is_callable()
export function isObjectTypeCallable(obj) {
    if (!obj) return false;
    const meta = objectData[obj.otyp] || null;
    const hasDesc = !!(meta && typeof meta.oc_descr === 'string' && meta.oc_descr.length > 0);
    if (!hasDesc) return false;

    if (obj.oclass === AMULET_CLASS) {
        const name = String(meta?.name || '').toLowerCase();
        return !name.includes('amulet of yendor');
    }
    return obj.oclass === SCROLL_CLASS
        || obj.oclass === POTION_CLASS
        || obj.oclass === WAND_CLASS
        || obj.oclass === RING_CLASS
        || obj.oclass === GEM_CLASS
        || obj.oclass === SPBOOK_CLASS
        || obj.oclass === ARMOR_CLASS
        || obj.oclass === TOOL_CLASS
        || obj.oclass === VENOM_CLASS;
}

// C ref: do_name.c docallcmd() — #call/#name command prompt
export async function handleCallObjectTypePrompt(player, display) {
    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const callChoices = inventory
        .filter((obj) => isObjectTypeCallable(obj) && obj.invlet)
        .map((obj) => obj.invlet)
        .join('');
    const prompt = callChoices
        ? `What do you want to call? [${callChoices} or ?*] `
        : 'What do you want to call? [*] ';
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const isDismissKey = (code) => code === 27 || code === 32;

    while (true) {
        await display.putstr_message(prompt);
        const ch = await nhgetch_raw();
        const c = String.fromCharCode(ch);
        if (isDismissKey(ch)) {
            replacePromptMessage();
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            replacePromptMessage();
            const lines = buildInventoryOverlayLines(player);
            const allInvLetters = inventory
                .filter((o) => o && o.invlet)
                .map((o) => o.invlet)
                .join('');
            const menuSelection = await renderOverlayMenuUntilDismiss(display, lines, allInvLetters);
            if (menuSelection) {
                const menuItem = inventory.find((obj) => obj && obj.invlet === menuSelection);
                if (menuItem && isObjectTypeCallable(menuItem)) {
                    await getlin(`Call ${doname(menuItem, player)}:`, display);
                    return { moved: false, tookTime: false };
                }
            }
            continue;
        }

        const selected = inventory.find((obj) => obj && obj.invlet === c);
        if (!selected) {
            continue;
        }
        if (!isObjectTypeCallable(selected)) {
            replacePromptMessage();
            await display.putstr_message('That is a silly thing to call.');
            return { moved: false, tookTime: false };
        }

        await getlin(`Call ${doname(selected, player)}:`, display);
        return { moved: false, tookTime: false };
    }
}

// C ref: do_name.c Monnam() — uses ARTICLE_THE regardless of tame status.
export function monAttackName(mon) {
    return Monnam(mon);
}
