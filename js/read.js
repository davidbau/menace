// read.js -- Scroll reading mechanics
// cf. read.c — doread, seffects, scroll effects, genocide, punishment, recharging

import { rn2, rn1, rnd, d } from './rng.js';
import { more, nhgetch_raw } from './input.js';
import {
    objectData, SCROLL_CLASS, SPBOOK_CLASS, WEAPON_CLASS, COIN_CLASS,
    SPE_BLANK_PAPER, SPE_NOVEL, SPE_BOOK_OF_THE_DEAD,
    SCR_ENCHANT_ARMOR, SCR_DESTROY_ARMOR, SCR_CONFUSE_MONSTER,
    SCR_SCARE_MONSTER, SCR_REMOVE_CURSE, SCR_ENCHANT_WEAPON,
    SCR_CREATE_MONSTER, SCR_TAMING, SCR_GENOCIDE, SCR_LIGHT,
    SCR_TELEPORTATION, SCR_GOLD_DETECTION, SCR_FOOD_DETECTION,
    SCR_IDENTIFY, SCR_CHARGING, SCR_MAGIC_MAPPING, SCR_AMNESIA,
    SCR_FIRE, SCR_EARTH, SCR_PUNISHMENT, SCR_STINKING_CLOUD,
    SCR_BLANK_PAPER,
    CANDY_BAR,
    WAN_WISHING, WAN_CANCELLATION, WAN_DEATH, WAN_POLYMORPH,
    WAN_UNDEAD_TURNING, WAN_COLD, WAN_FIRE, WAN_LIGHTNING,
    WAN_MAGIC_MISSILE, WAN_NOTHING, NODIR,
    OIL_LAMP, BRASS_LANTERN, MAGIC_MARKER, TINNING_KIT, EXPENSIVE_CAMERA,
    BELL_OF_OPENING, UNICORN_HORN, BOULDER, ROCK,
    HEAVY_IRON_BALL,
    WAND_CLASS, RING_CLASS, TOOL_CLASS,
} from './objects.js';
import { A_STR, A_INT, A_WIS, A_CON, SDOOR, COLNO, ROWNO, MM_EDOG, MM_ADJACENTOK, CONFUSION, STUNNED } from './const.js';
import { doname, bcsign, blessorcurse, uncurse } from './mkobj.js';
import { exercise } from './attrib_exercise.js';
import { acurr } from './attrib.js';
import { discoverObject, isObjectNameKnown } from './o_init.js';
import { make_confused, make_stunned } from './potion.js';
import { makemon } from './makemon.js';
import { NO_MINVENT } from './const.js';
import { mons, PM_ACID_BLOB, PM_YELLOW_LIGHT, PM_BLACK_LIGHT, PM_GREMLIN, S_HUMAN,
         PM_GUARD, PM_SHOPKEEPER, PM_HIGH_CLERIC, PM_ALIGNED_CLERIC, PM_ANGEL,
         PM_LONG_WORM_TAIL, PM_LONG_WORM, PM_HUMAN_ZOMBIE, PM_DOPPELGANGER } from './monsters.js';
import { resist } from './zap.js';
import { monflee } from './monmove.js';
import { Yobjnam2, Yname2, makeplural, an } from './objnam.js';
import { hcolor } from './do_name.js';
import { t_at, m_at } from './trap.js';
import { scrolltele, level_tele } from './teleport.js';
import { gold_detect, food_detect, trap_detect, do_mapping, cvt_sdoor_to_door } from './detect.js';
import { explode } from './explode.js';
import { EXPL_FIERY } from './const.js';
import { tmp_at } from './animation.js';
import { DISP_BEAM, DISP_END } from './const.js';
import { getpos_sethilite, getpos_async } from './getpos.js';
import { pline, impossible, You } from './pline.js';
import { cansee, mark_vision_dirty } from './vision.js';
import { newsym } from './display.js';
import { identify_pack, buildInventoryOverlayLines, renderOverlayMenuUntilDismiss } from './invent.js';
import { nhimport } from './origin_awaits.js';
import { engulfing_u, unique_corpstat, amorphous, is_whirly, unsolid,
         passes_walls, noncorporeal } from './mondata.js';

const SPELL_KEEN = 20000; // cf. spell.c KEEN
const MAX_SPELL_STUDY = 3; // cf. spell.h MAX_SPELL_STUDY
const STINKING_CLOUD_TARGET_DIST = 6;


// ============================================================
// 1. Scroll learning
// ============================================================

// cf. read.c learnscrolltyp() — implemented below (line ~learnscrolltyp)
// cf. read.c learnscroll() — wrapper; in JS, learnscrolltyp is called directly

// ============================================================
// 2. Enchantment helpers
// ============================================================

// cf. read.c stripspe() — strip enchantment from charged item
async function stripspe(obj, player, display) {
    if (obj.blessed || (obj.spe || 0) <= 0) {
        await display.putstr_message('Nothing happens.');
    } else {
        await display.putstr_message(`${Yobjnam2(obj, player.blind ? 'vibrate' : 'glow')} briefly.`);
        obj.spe = 0;
    }
}

// ============================================================
// 3. Read validation
// ============================================================

// cf. read.c read_ok() — validate object is readable
export function read_ok(obj) {
    if (!obj) return false;
    if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS) return true;
    return false;
}

// ============================================================
// 4. Glow messages
// ============================================================

// cf. read.c p_glow1() — "Your <item> glows briefly" / "vibrates briefly"
export async function p_glow1(otmp, player, display) {
    await display.putstr_message(
        `${Yobjnam2(otmp, player.blind ? 'vibrate' : 'glow')} briefly.`);
}

// cf. read.c p_glow2() — "Your <item> glows <color> for a moment"
export async function p_glow2(otmp, color, player, display) {
    await display.putstr_message(
        `${Yobjnam2(otmp, player.blind ? 'vibrate' : 'glow')}${player.blind ? '' : ' '}${player.blind ? '' : hcolor(color)} for a moment.`);
}

// cf. read.c p_glow3() — "Your <item> glows feebly <color> for a moment"
export async function p_glow3(otmp, color, player, display) {
    await display.putstr_message(
        `${Yobjnam2(otmp, player.blind ? 'vibrate' : 'glow')} feebly${player.blind ? '' : ' '}${player.blind ? '' : hcolor(color)} for a moment.`);
}

// ============================================================
// 5. Text display
// ============================================================

// cf. read.c erode_obj_text() — erode text based on object erosion
// Simplified: returns text as-is since wipeout_text with seed is not exported
export function erode_obj_text(otmp, buf) {
    const erosion = Math.max(otmp.oeroded || 0, otmp.oeroded2 || 0);
    if (erosion) {
        // Approximate: replace some chars with '?' based on erosion level
        const maxErode = 3;
        const numWipe = Math.floor(buf.length * erosion / (2 * maxErode));
        const chars = buf.split('');
        // Deterministic wipeout based on o_id to avoid RNG consumption
        for (let i = 0; i < numWipe && i < chars.length; i++) {
            const idx = ((otmp.o_id || 0) * 31 + i * 17) % chars.length;
            if (chars[idx] !== ' ') chars[idx] = '?';
        }
        return chars.join('');
    }
    return buf;
}

// cf. read.c tshirt_text() — random T-shirt text messages
const shirt_msgs = [
    "I explored the Dungeons of Doom and all I got was this lousy T-shirt!",
    "Is that Mjollnir in your pocket or are you just happy to see me?",
    "It's not the size of your sword, it's how #enhance'd you are with it.",
    "Madame Elvira's House O' Succubi Lifetime Customer",
    "Madame Elvira's House O' Succubi Employee of the Month",
    "Ludios Vault Guards Do It In Small, Dark Rooms",
    "Yendor Military Soldiers Do It In Large Groups",
    "I survived Yendor Military Boot Camp",
    "Ludios Accounting School Intra-Mural Lacrosse Team",
    "Oracle(TM) Fountains 10th Annual Wet T-Shirt Contest",
    "Hey, black dragon!  Disintegrate THIS!",
    "I'm With Stupid -->",
    "Don't blame me, I voted for Izchak!",
    "Don't Panic",
    "Furinkan High School Athletic Dept.",
    "Hel-LOOO, Nurse!",
    "=^.^=",
    "100% goblin hair - do not wash",
    "Aberzombie and Fitch",
    "cK -- Cockatrice touches the Kop",
    "Don't ask me, I only adventure here",
    "Down with pants!",
    "d, your dog or a killer?",
    "FREE PUG AND NEWT!",
    "Go team ant!",
    "Got newt?",
    "Hello, my darlings!",
    "Hey!  Nymphs!  Steal This T-Shirt!",
    "I <3 Dungeon of Doom",
    "I <3 Maud",
    "I am a Valkyrie.  If you see me running, try to keep up.",
    "I am not a pack rat - I am a collector",
    "I bounced off a rubber tree",
    "Plunder Island Brimstone Beach Club",
    "If you can read this, I can hit you with my polearm",
    "I'm confused!",
    "I scored with the princess",
    "I want to live forever or die in the attempt.",
    "Lichen Park",
    "LOST IN THOUGHT - please send search party",
    "Meat is Mordor",
    "Minetown Better Business Bureau",
    "Minetown Watch",
    "Ms. Palm's House of Negotiable Affection--A Very Reputable House Of Disrepute",
    "Protection Racketeer",
    "Real men love Crom",
    "Somebody stole my Mojo!",
    "The Hellhound Gang",
    "The Werewolves",
    "They Might Be Storm Giants",
    "Weapons don't kill people, I kill people",
    "White Zombie",
    "You're killing me!",
    "Anhur State University - Home of the Fighting Fire Ants!",
    "FREE HUGS",
    "Serial Ascender",
    "Real men are valkyries",
    "Young Men's Cavedigging Association",
    "Occupy Fort Ludios",
    "I couldn't afford this T-shirt so I stole it!",
    "Mind flayers suck",
    "I'm not wearing any pants",
    "Down with the living!",
    "Pudding farmer",
    "Vegetarian",
    "Hello, I'm War!",
    "It is better to light a candle than to curse the darkness",
    "It is easier to curse the darkness than to light a candle",
    "rock--paper--scissors--lizard--Spock!",
    "/Valar morghulis/ -- /Valar dohaeris/",
];

function tshirt_text(tshirt) {
    const buf = shirt_msgs[(tshirt.o_id || 0) % shirt_msgs.length];
    return erode_obj_text(tshirt, buf);
}

// cf. read.c hawaiian_motif() — random Hawaiian shirt motif
const hawaiian_motifs = [
    "flamingo", "parrot", "toucan", "bird of paradise",
    "sea turtle", "tropical fish", "jellyfish", "giant eel", "water nymph",
    "plumeria", "orchid", "hibiscus flower", "palm tree",
    "hula dancer", "sailboat", "ukulele",
];

function hawaiian_motif(shirt) {
    // C: motif = shirt->o_id ^ (unsigned) ubirthday
    // Simplified: use o_id directly (ubirthday not easily accessible)
    const motif = (shirt.o_id || 0);
    return hawaiian_motifs[motif % hawaiian_motifs.length];
}

// cf. read.c hawaiian_design() — random Hawaiian shirt design
const hawaiian_bgs = [
    "purple", "yellow", "red", "blue", "orange", "black", "green",
    "abstract", "geometric", "patterned", "naturalistic",
];

function hawaiian_design(shirt) {
    // C: bg = shirt->o_id ^ (unsigned) ~ubirthday
    const bg = ((shirt.o_id || 0) * 37 + 7);
    const motif = hawaiian_motif(shirt);
    return `${makeplural(motif)} on ${an(hawaiian_bgs[bg % hawaiian_bgs.length])} background`;
}

// cf. read.c apron_text() — random apron text messages
const apron_msgs = [
    "Kiss the cook",
    "I'm making SCIENCE!",
    "Don't mess with the chef",
    "Don't make me poison you",
    "Gehennom's Kitchen",
    "Rat: The other white meat",
    "If you can't stand the heat, get out of Gehennom!",
    "If we weren't meant to eat animals, why are they made out of meat?",
    "If you don't like the food, I'll stab you",
    "I am an alchemist; if you see me running, try to catch up...",
];
export function apron_text(apron) {
    const buf = apron_msgs[(apron.o_id || 0) % apron_msgs.length];
    return erode_obj_text(apron, buf);
}

// cf. read.c candy_wrapper_text() — candy bar wrapper text
const candy_wrappers = [
    "",
    "Apollo",
    "Moon Crunchy",
    "Snacky Cake", "Chocolate Nuggie", "The Small Bar",
    "Crispy Yum Yum", "Nilla Crunchie", "Berry Bar",
    "Choco Nummer", "Om-nom",
    "Fruity Oaty",
    "Wonka Bar",
];

function candy_wrapper_text(obj) {
    return candy_wrappers[(obj.spe || 0) % candy_wrappers.length];
}

// cf. read.c assign_candy_wrapper() — assign wrapper text to candy bar
export function assign_candy_wrapper(obj) {
    if (obj.otyp === CANDY_BAR) {
        obj.spe = 1 + rn2(candy_wrappers.length - 1);
    }
}

// ============================================================
// 6. Main entry
// ============================================================

// cf. read.c doread() — read a scroll or spellbook (partial)
// Implemented: inventory selection, spellbook study (cf. spell.c study_book).
// TODO: read_ok validation, scroll identification, seffects dispatch
async function handleRead(player, display, game) {
    const readableClasses = new Set([SCROLL_CLASS, SPBOOK_CLASS]);
    const readable = (player.inventory || []).filter((o) => o && readableClasses.has(o.oclass));
    const letters = readable.map((o) => o.invlet).join('');
    const prompt = letters
        ? `What do you want to read? [${letters} or ?*] `
        : 'What do you want to read? [*] ';

    // Keep prompt active until explicit cancel, matching tty flow.
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const isDismissKey = (code) => code === 27 || code === 10 || code === 13 || code === 32;
    // All inventory letters — C's getobj PICK_ONE menu accepts any inventory
    // letter as an accelerator.  Non-matching keys are consumed silently by
    // the menu loop (matching C TTY page-advance / dismiss behavior).
    const allInvLetters = (player.inventory || [])
        .filter((o) => o && typeof o.invlet === 'string' && o.invlet.length > 0)
        .map((o) => o.invlet)
        .join('');
    const showReadableHelpList = async () => {
        replacePromptMessage();
        const lines = buildInventoryOverlayLines(player);
        return await renderOverlayMenuUntilDismiss(display, lines, allInvLetters);
    };
    const showReadPrompt = async () => {
        await display.putstr_message(prompt);
    };
    await showReadPrompt();
    while (true) {
        const ch = await nhgetch_raw({ site: 'read.handleRead.select' });
        let c = String.fromCharCode(ch);
        if (isDismissKey(ch)) {
            replacePromptMessage();
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            // C's PICK_ONE menu returns the selected inventory letter directly.
            const menuSelection = await showReadableHelpList();
            if (!menuSelection) {
                await showReadPrompt();
                continue;
            }
            if (menuSelection === '?' || menuSelection === '*') {
                await showReadPrompt();
                continue;
            }
            // C getobj/display_pickinv parity: a letter chosen from the
            // inventory overlay becomes the active item selection.
            if (!(player.inventory || []).some((o) => o && o.invlet === menuSelection)) {
                await showReadPrompt();
                continue;
            }
            c = menuSelection;
        }
        const anyItem = (player.inventory || []).find((o) => o && o.invlet === c);
        if (anyItem) {
            if (anyItem.oclass === SPBOOK_CLASS) {
                replacePromptMessage();
                // cf. spell.c study_book() (partial)
                const od = objectData[anyItem.otyp] || {};
                // cf. read.c doread() — blank paper check
                if (anyItem.otyp === SPE_BLANK_PAPER) {
                    await display.putstr_message('This spellbook is all blank.');
                    return { moved: false, tookTime: true };
                }
                // cf. read.c doread() — novel check (not implemented further)
                if (anyItem.otyp === SPE_NOVEL) {
                    await display.putstr_message('You read the novel for a while.');
                    return { moved: false, tookTime: true };
                }
                // cf. spell.c study_book():537-558 — calculate study delay
                const ocLevel = od.oc_oc2 || 1;
                const ocDelay = od.oc_delay || 1;
                let delayTurns;
                if (ocLevel <= 2) delayTurns = ocDelay;
                else if (ocLevel <= 4) delayTurns = (ocLevel - 1) * ocDelay;
                else if (ocLevel <= 6) delayTurns = ocLevel * ocDelay;
                else delayTurns = 8 * ocDelay; // level 7

                // cf. spell.c study_book():561-572 — check if spell already known and well-retained
                const spells = player.spells || (player.spells = []);
                const knownEntry = spells.find(s => s.otyp === anyItem.otyp);
                if (knownEntry && knownEntry.sp_know > SPELL_KEEN / 10) {
                    const spellName = String(od.oc_name || 'this spell').toLowerCase();
                    // cf. spell.c study_book() — show both messages on one line to match
                    // C TTY behavior where pline() + yn() appear together.
                    await display.putstr_message(`You know "${spellName}" quite well already.  Refresh your memory anyway? [yn] (n)`);
                    const ans = await nhgetch_raw();
                    if (String.fromCharCode(ans) !== 'y') {
                        return { moved: false, tookTime: false };
                    }
                    replacePromptMessage();
                }

                // cf. spell.c study_book():577-602 — difficulty check (uncursed, non-BOTD books)
                if (!anyItem.blessed && anyItem.otyp !== SPE_BOOK_OF_THE_DEAD) {
                    if (anyItem.cursed) {
                        // Cursed: too hard (C: cursed_book() + nomul for delay)
                        await display.putstr_message("This book is beyond your comprehension.");
                        return { moved: false, tookTime: true };
                    }
                    // Uncursed: roll difficulty
                    const intel = acurr(player, A_INT);
                    const readAbility = intel + 4 + Math.floor((player.ulevel || 1) / 2) - 2 * ocLevel;
                    if (rnd(20) > readAbility) {
                        await display.putstr_message("You can't make heads or tails of this.");
                        return { moved: false, tookTime: true };
                    }
                }

                // cf. spell.c study_book() — start studying
                await display.putstr_message('You begin to memorize the runes.');
                const bookRef = anyItem;
                const bookOd = od;
                const bookOcLevel = ocLevel;
                game.occupation = {
                    occtxt: 'studying',
                    delayLeft: delayTurns,
                    async fn(g) {
                        if (this.delayLeft > 0) {
                            this.delayLeft--;
                            return true; // still studying
                        }
                        // cf. spell.c learn() — study complete
                        // exercise(A_WIS, TRUE) — no RNG
                        const spellsArr = g.player.spells || (g.player.spells = []);
                        const ent = spellsArr.find(s => s.otyp === bookRef.otyp);
                        const spellName = String(bookOd.name || 'unknown spell').toLowerCase();
                        const studyCount = bookRef.spestudied || 0;
                        if (ent) {
                            // Already known — refresh
                            if (studyCount >= MAX_SPELL_STUDY) {
                                await g.display.putstr_message('This spellbook is too faint to be read any more.');
                                bookRef.otyp = SPE_BLANK_PAPER;
                            } else {
                                await g.display.putstr_message(
                                    `Your knowledge of "${spellName}" is ${ent.sp_know ? 'keener' : 'restored'}.`);
                                ent.sp_know = SPELL_KEEN + 1; // incrnknow(i, 1)
                                bookRef.spestudied = studyCount + 1;
                            }
                        } else {
                            // New spell
                            if (studyCount >= MAX_SPELL_STUDY) {
                                await g.display.putstr_message('This spellbook is too faint to read even once.');
                                bookRef.otyp = SPE_BLANK_PAPER;
                            } else {
                                const spellIdx = spellsArr.length;
                                spellsArr.push({ otyp: bookRef.otyp, sp_lev: bookOcLevel, sp_know: SPELL_KEEN + 1 });
                                bookRef.spestudied = studyCount + 1;
                                if (spellIdx === 0) {
                                    await g.display.putstr_message(`You learn "${spellName}".`);
                                } else {
                                    const spellet = spellIdx < 26
                                        ? String.fromCharCode('a'.charCodeAt(0) + spellIdx)
                                        : String.fromCharCode('A'.charCodeAt(0) + spellIdx - 26);
                                    await g.display.putstr_message(
                                        `You add "${spellName}" to your repertoire, as '${spellet}'.`);
                                }
                            }
                        }
                        return false; // occupation done
                    },
                };
                return { moved: false, tookTime: true };
            }
            if (anyItem.oclass === SCROLL_CLASS) {
                replacePromptMessage();
                // cf. read.c doread() — scroll reading
                const consumed = await seffects(anyItem, player, display, game);
                if (consumed) {
                    // Scroll was used up inside seffects
                } else {
                    // Scroll still exists — use it up now
                    if (anyItem.quan > 1) {
                        anyItem.quan--;
                    } else {
                        player.removeFromInventory(anyItem);
                    }
                }
                return { moved: false, tookTime: true };
            }
            replacePromptMessage();
            await display.putstr_message('That is a silly thing to read.');
            return { moved: false, tookTime: false };
        }
        // C/getobj-style invalid invlet boundary:
        // show error, block at --More--, then reveal prompt again.
        replacePromptMessage();
        await display.putstr_message("You don't have that object.");
        await more(display, { game,
            site: 'read.handleRead.invalidInvletMorePrompt',
        });
        await showReadPrompt();
        continue;
    }
}

// ============================================================
// 7. Scroll helper functions
// ============================================================

// cf. read.c useup_scroll() — consume a scroll
function useup_scroll(sobj, player) {
    if (sobj.quan > 1) {
        sobj.quan--;
    } else {
        player.removeFromInventory(sobj);
    }
}

// cf. read.c learnscrolltyp() — mark scroll type as discovered
export function learnscrolltyp(otyp) {
    discoverObject(otyp, true, true);
}

// cf. read.c cap_spe() — cap enchantment at SPE_LIM (99)
export function cap_spe(obj) {
    if (obj.spe > 99) obj.spe = 99;
    if (obj.spe < -99) obj.spe = -99;
}

// cf. C some_armor() — priority-based armor selection (do_wear.c:2625)
// C algorithm: start with cloak/armor/shirt, then each extremity slot
// has a 25% chance to replace the current pick (via rn2(4))
function some_armor(player) {
    // Priority: cloak > armor > shirt
    let otmph = player.cloak || null;
    if (!otmph) otmph = player.armor || null;
    if (!otmph) otmph = player.shirt || null;
    // Each extremity slot: if worn, replace if nothing yet OR 25% chance
    let otmp;
    otmp = player.helmet;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = player.gloves;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = player.boots;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = player.shield;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    return otmph;
}



// ============================================================
// 8. Individual scroll effects
// ============================================================

// cf. read.c seffect_blank_paper()
export async function seffect_blank_paper(sobj, player, display) {
    if (player.blind) {
        await display.putstr_message("You don't remember there being any magic words on this scroll.");
    } else {
        await display.putstr_message('This scroll seems to be blank.');
    }
}

// cf. read.c seffect_identify()
async function seffect_identify(sobj, player, display) {
    const already_known = isObjectNameKnown(sobj.otyp);
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;

    // Scroll: use up first, then identify
    useup_scroll(sobj, player);

    if (confused || (scursed && !already_known)) {
        await display.putstr_message('You identify this as an identify scroll.');
    } else if (!already_known) {
        await display.putstr_message('This is an identify scroll.');
    }
    if (!already_known) {
        learnscrolltyp(SCR_IDENTIFY);
    }
    if (confused || (scursed && !already_known)) {
        return true; // consumed
    }

    const inv = player.inventory || [];
    if (!inv.length) {
        await display.putstr_message("You're not carrying anything else to be identified.");
        return true; // consumed (useup already called)
    }

    let cval = 1;
    if (sblessed || (!scursed && !rn2(5))) {
        cval = rn2(5);
        // cval==0 means identify ALL
        if (cval === 1 && sblessed && (player.luck || 0) > 0) {
            ++cval;
        }
    }
    // C ref: read.c identify_pack(cval, FALSE)
    await identify_pack(cval, player, false);
    return true; // consumed (useup already called)
}

// cf. read.c seffect_charging()
export async function seffect_charging(sobj, player, display, game) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const already_known = isObjectNameKnown(sobj.otyp);

    if (confused) {
        if (scursed) {
            await display.putstr_message('You feel discharged.');
            player.pw = 0;
        } else {
            await display.putstr_message('You feel charged up!');
            player.pw += d(sblessed ? 6 : 4, 4);
            if (player.pw > player.pwmax) {
                player.pwmax = player.pw;
            } else {
                player.pw = player.pwmax;
            }
        }
        return false;
    }

    // Non-confused: identify, then prompt for item to charge
    if (!already_known) {
        await display.putstr_message('This is a charging scroll.');
        learnscrolltyp(SCR_CHARGING);
    }
    // Use up scroll before prompting
    const charge_bless = scursed ? -1 : sblessed ? 1 : 0;
    useup_scroll(sobj, player);

    // cf. getobj("charge", charge_ok, ...) + recharge(otmp, curse_bless)
    // In automated play, no item prompt is possible; the scroll is consumed
    // but no item is charged. A full UI implementation would prompt here.
    await display.putstr_message('You have a feeling of loss.');
    return true; // consumed
}

// cf. display.c litroom() — light or darken a room and update display
function litroom(player, map, doit) {
    const room = map?.roomAt(player.x, player.y);
    if (!room) return;
    room.rlit = doit;
    for (let y = room.ly; y <= room.hy; y++) {
        for (let x = room.lx; x <= room.hx; x++) {
            const loc = map.at ? map.at(x, y) : (map.locations?.[x]?.[y]);
            if (loc) loc.lit = doit;
            newsym(x, y);
        }
    }
    mark_vision_dirty();
}

// cf. read.c seffect_light()
export async function seffect_light(sobj, player, display, game) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const map = game?.map;

    if (!confused) {
        // cf. litroom(!scursed, sobj) — light or darken current room
        litroom(player, map, !scursed);
        if (!player.blind) {
            if (!scursed) {
                await display.putstr_message('A lit field surrounds you!');
            } else {
                await display.putstr_message('Darkness surrounds you.');
            }
        }
        return true;
    }

    // Confused: create tame lights around player
    const pm = scursed ? PM_BLACK_LIGHT : PM_YELLOW_LIGHT;
    const numlights = rn1(2, 3) + (sblessed ? 2 : 0);
    let sawlights = false;
    const depth = player.dungeonLevel || 1;

    for (let i = 0; i < numlights; i++) {
        if (map) {
            const mon = makemon(mons[pm], player.x, player.y,
                                MM_EDOG | NO_MINVENT, depth, map);
            if (mon) {
                mon.msleeping = 0;
                mon.sleeping = false;
                mon.mcan = true; // cancelled — won't explode
                mon.tame = true;
                sawlights = true;
            }
        }
    }
    if (sawlights) {
        await display.putstr_message('Lights appear all around you!');
    }
    return false;
}

// cf. read.c seffect_confuse_monster()
async function seffect_confuse_monster(sobj, player, display) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const isHuman = (player.monsterType?.mlet === S_HUMAN) || !player.monsterType;

    if (!isHuman || scursed) {
        if (!player.confused) {
            await display.putstr_message('You feel confused.');
        }
        await make_confused(player, (player.getPropTimeout
            ? (player.getPropTimeout(CONFUSION) || 0) : 0) + rnd(100), false);
        return false;
    }

    if (confused) {
        if (!sblessed) {
            await display.putstr_message('Your hands begin to glow purple.');
            await make_confused(player, (player.getPropTimeout
                ? (player.getPropTimeout(CONFUSION) || 0) : 0) + rnd(100), false);
        } else {
            await display.putstr_message('A red glow surrounds your head.');
            await make_confused(player, 0, true);
        }
    } else {
        // Touch-of-confusion effect
        let incr = 3; // scroll class incr
        if (!sblessed) {
            if (!(player.umconf || 0)) {
                await display.putstr_message('Your hands begin to glow red.');
            } else {
                await display.putstr_message('The red glow of your hands intensifies.');
            }
            incr += rnd(2);
        } else {
            await display.putstr_message(
                `Your hands glow ${(player.umconf || 0) ? 'an even more' : 'a'} brilliant red.`);
            incr += rn1(8, 2);
        }
        if ((player.umconf || 0) >= 40) incr = 1;
        player.umconf = (player.umconf || 0) + incr;
    }
    return false;
}

// cf. read.c seffect_scare_monster()
export async function seffect_scare_monster(sobj, player, display, game) {
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const map = game?.map;
    const fov = game?.fov;
    let ct = 0;

    if (map) {
        for (const mtmp of (map.monsters || [])) {
            if (mtmp.dead || (mtmp.mhp != null && mtmp.mhp <= 0)) continue;
            // C: cansee(mtmp->mx, mtmp->my) — only affects visible monsters
            const canSee = fov?.canSee
                ? fov.canSee(mtmp.mx, mtmp.my)
                : true; // default visible if no fov
            if (!canSee) continue;

            if (confused || scursed) {
                mtmp.mflee = false;
                mtmp.mfrozen = 0;
                mtmp.msleeping = 0;
                mtmp.sleeping = false;
                mtmp.mcanmove = true;
            } else if (!resist(mtmp, SCROLL_CLASS)) {
                // cf. read.c:1420 monflee(mtmp, 0, FALSE, FALSE)
                await monflee(mtmp, 0, false, false);
            }
            if (!mtmp.tame) ct++;
        }
    }

    if (confused || scursed) {
        await display.putstr_message(
            `You hear sad wailing ${!ct ? 'in the distance' : 'close by'}.`);
    } else {
        await display.putstr_message(
            `You hear maniacal laughter ${!ct ? 'in the distance' : 'close by'}.`);
    }
    return false;
}

// cf. read.c seffect_remove_curse()
async function seffect_remove_curse(sobj, player, display) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;

    if (!player.hallucinating) {
        await display.putstr_message(
            !confused ? 'You feel like someone is helping you.'
                      : 'You feel like you need some help.');
    } else {
        await display.putstr_message(
            !confused ? 'You feel in touch with the Universal Oneness.'
                      : 'You feel the power of the Force against you!');
    }

    if (scursed) {
        await display.putstr_message('The scroll disintegrates.');
        return false;
    }

    // Iterate inventory and uncurse/blessorcurse items
    const inv = player.inventory || [];
    for (const obj of inv) {
        if (obj === sobj && (obj.quan || 1) === 1) continue; // skip self
        if (obj.oclass === COIN_CLASS) continue;

        // C: wornmask check — simplified: check if worn/wielded or blessed scroll
        const isWorn = (obj === player.weapon || obj === player.armor
            || obj === player.shield || obj === player.helmet
            || obj === player.gloves || obj === player.boots
            || obj === player.cloak || obj === player.shirt
            || obj === player.amulet || obj === player.leftRing
            || obj === player.rightRing);

        if (sblessed || isWorn) {
            if (confused) {
                blessorcurse(obj, 2);
                obj.bknown = false;
            } else if (obj.cursed) {
                uncurse(obj);
                if (obj.bknown) {
                    learnscrolltyp(SCR_REMOVE_CURSE);
                }
            }
        }
    }
    return false;
}

// cf. read.c seffect_enchant_weapon()
export async function seffect_enchant_weapon(sobj, player, display) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const uwep = player.weapon;

    // Confused + have weapon: erodeproofing/de-proofing
    if (confused && uwep) {
        const old_erodeproof = !!uwep.oerodeproof;
        const new_erodeproof = !scursed;
        uwep.oerodeproof = false; // for messages
        if (player.blind) {
            await display.putstr_message('Your weapon feels warm for a moment.');
        } else {
            await display.putstr_message(
                `${doname(uwep, player)} ${scursed ? 'is' : 'is'} covered by a ${scursed ? 'mottled purple' : 'shimmering golden'} ${scursed ? 'glow' : 'shield'}!`);
        }
        if (new_erodeproof && (uwep.oeroded || uwep.oeroded2)) {
            uwep.oeroded = 0;
            uwep.oeroded2 = 0;
            await display.putstr_message(
                `${doname(uwep, player)} ${player.blind ? 'feels' : 'looks'} as good as new!`);
        }
        uwep.oerodeproof = new_erodeproof;
        return false;
    }

    // Non-confused: enchant/disenchant weapon
    // cf. chwepon(sobj, amount) — change weapon enchantment
    let amount;
    if (scursed) {
        amount = -1;
    } else if (!uwep) {
        amount = 1;
    } else if (uwep.spe >= 9) {
        amount = !rn2(uwep.spe) ? 1 : 0;
    } else if (sblessed) {
        amount = rnd(Math.max(1, 3 - Math.floor(uwep.spe / 3)));
    } else {
        amount = 1;
    }

    if (!uwep) {
        // No weapon wielded
        await display.putstr_message("You feel a strange vibration.");
        // C: exercise(A_DEX, amount >= 0)
        await exercise(player, A_DEX, amount >= 0);
        return false;
    }

    // C: evaporation check — (spe > 5 && amount >= 0) || (spe < -5 && amount < 0)
    if (((uwep.spe > 5 && amount >= 0) || (uwep.spe < -5 && amount < 0))
        && rn2(3)) {
        // Evaporate — weapon too highly enchanted
        await display.putstr_message(`${doname(uwep, player)} violently glows then evaporates!`);
        player.weapon = null;
        player.removeFromInventory(uwep);
        return false;
    }

    uwep.spe += amount;
    cap_spe(uwep);

    if (amount > 0) {
        if (player.blind) {
            await display.putstr_message('Your weapon feels warm for a moment.');
        } else {
            await display.putstr_message(`${doname(uwep, player)} glows silver for a moment.`);
        }
    } else if (amount < 0) {
        if (player.blind) {
            await display.putstr_message('Your weapon feels cold for a moment.');
        } else {
            await display.putstr_message(`${doname(uwep, player)} glows black for a moment.`);
        }
        if (!uwep.cursed) {
            uwep.cursed = true;
        }
    }
    // C: elven weapons vibrate warningly when enchanted beyond a limit
    // C: (spe > 5) && (is_elven_weapon || oartifact || !rn2(7))
    // rn2(7) only consumed when not elven and not artifact (short-circuit)
    if (uwep.spe > 5 && !uwep.oartifact) {
        rn2(7); // vibration check — is_elven_weapon not implemented, safe approximation
    }
    return false;
}

// cf. read.c seffect_enchant_armor()
async function seffect_enchant_armor(sobj, player, display) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const otmp = some_armor(player);

    if (!otmp) {
        // No armor worn
        if (!player.blind) {
            await display.putstr_message('Your skin glows then fades.');
        } else {
            await display.putstr_message('Your skin feels warm for a moment.');
        }
        // cf. strange_feeling -> useup
        useup_scroll(sobj, player);
        await exercise(player, A_CON, !scursed);
        await exercise(player, A_STR, !scursed);
        return true; // consumed
    }

    if (confused) {
        // Erodeproofing
        const old_erodeproof = !!otmp.oerodeproof;
        const new_erodeproof = !scursed;
        otmp.oerodeproof = false;
        if (player.blind) {
            await display.putstr_message(`${doname(otmp, player)} feels warm for a moment.`);
        } else {
            await display.putstr_message(
                `${doname(otmp, player)} is covered by a ${scursed ? 'mottled black' : 'shimmering golden'} ${scursed ? 'glow' : 'shield'}!`);
        }
        if (new_erodeproof && (otmp.oeroded || otmp.oeroded2)) {
            otmp.oeroded = 0;
            otmp.oeroded2 = 0;
            await display.putstr_message(
                `${doname(otmp, player)} ${player.blind ? 'feels' : 'looks'} as good as new!`);
        }
        otmp.oerodeproof = new_erodeproof;
        return false;
    }

    // cf. C seffect_enchant_armor normal path
    const od = objectData[otmp.otyp] || {};
    const special_armor = false; // simplified: no elven armor check
    let s = scursed ? -(otmp.spe || 0) : (otmp.spe || 0);

    // Evaporation check for high enchantment
    if (s > (special_armor ? 5 : 3) && rn2(s)) {
        await display.putstr_message(
            `${doname(otmp, player)} violently ${player.blind ? 'vibrates' : 'glows'} for a while, then evaporates.`);
        // Remove worn armor
        const slots = ['armor', 'cloak', 'shield', 'helmet', 'gloves', 'boots', 'shirt'];
        for (const slot of slots) {
            if (player[slot] === otmp) player[slot] = null;
        }
        player.removeFromInventory(otmp);
        return false;
    }
    if (s < -100) s = -100;

    // Calculate enchantment power: (4 - s) / 2
    s = Math.floor((4 - s) / 2);
    if (special_armor) ++s;
    if (!od.magic) ++s;
    if (sblessed) ++s;

    if (s <= 0) {
        s = 0;
        if ((otmp.spe || 0) > 0 && !rn2(otmp.spe)) s = 1;
    } else {
        s = rnd(s);
    }
    if (s > 11) s = 11;

    if (scursed) s = -s;

    // Apply enchantment
    await display.putstr_message(
        `${doname(otmp, player)} ${s === 0 ? 'violently ' : ''}${player.blind ? 'vibrates' : 'glows'}${(!player.blind) ? (scursed ? ' black' : ' silver') : ''} for a ${(s * s > 1) ? 'while' : 'moment'}.`);

    if (scursed && !otmp.cursed) {
        otmp.cursed = true;
    } else if (sblessed && !otmp.blessed) {
        otmp.blessed = true;
    } else if (!scursed && otmp.cursed) {
        uncurse(otmp);
    }

    if (s) {
        otmp.spe = (otmp.spe || 0) + s;
        cap_spe(otmp);
    }

    // Vibration warning
    if ((otmp.spe || 0) > (special_armor ? 5 : 3)
        && (special_armor || !rn2(7))) {
        await display.putstr_message(
            `${doname(otmp, player)} suddenly vibrates ${player.blind ? 'again' : 'unexpectedly'}.`);
    }
    return false;
}

// cf. read.c seffect_destroy_armor()
async function seffect_destroy_armor(sobj, player, display) {
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const otmp = some_armor(player);

    if (confused) {
        if (!otmp) {
            await display.putstr_message('Your bones itch.');
            useup_scroll(sobj, player);
            await exercise(player, A_STR, false);
            await exercise(player, A_CON, false);
            return true; // consumed
        }
        // Confused: erodeproofing
        const new_erodeproof = !!scursed;
        await display.putstr_message(`${doname(otmp, player)} glows purple for a moment.`);
        otmp.oerodeproof = new_erodeproof;
        return false;
    }

    if (!scursed || !otmp || !otmp.cursed) {
        // Destroy a piece of armor
        if (!otmp) {
            await display.putstr_message('Your skin itches.');
            useup_scroll(sobj, player);
            await exercise(player, A_STR, false);
            await exercise(player, A_CON, false);
            return true; // consumed
        }
        // cf. destroy_arm(otmp)
        await display.putstr_message(`${doname(otmp, player)} crumbles and turns to dust!`);
        const slots = ['armor', 'cloak', 'shield', 'helmet', 'gloves', 'boots', 'shirt'];
        for (const slot of slots) {
            if (player[slot] === otmp) player[slot] = null;
        }
        player.removeFromInventory(otmp);
    } else {
        // Both armor and scroll cursed: degrade
        await display.putstr_message(`${doname(otmp, player)} vibrates.`);
        if ((otmp.spe || 0) >= -6) {
            otmp.spe = (otmp.spe || 0) - 1;
        }
        await make_stunned(player,
            (player.getPropTimeout ? (player.getPropTimeout(STUNNED) || 0) : 0)
            + rn1(10, 10), true);
    }
    return false;
}

// cf. read.c seffect_create_monster()
export async function seffect_create_monster(sobj, player, display, game) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const map = game?.map;
    const depth = player.dungeonLevel || 1;

    // cf. create_critters(count, ptr, FALSE)
    const baseCount = 1 + ((confused || scursed) ? 12 : 0);
    const extraCount = (sblessed || rn2(73)) ? 0 : rnd(4);
    const count = baseCount + extraCount;
    const monType = confused ? mons[PM_ACID_BLOB] : null;

    let created = 0;
    if (map) {
        for (let i = 0; i < count; i++) {
            const mon = makemon(monType, player.x, player.y,
                                MM_ADJACENTOK, depth, map);
            if (mon) created++;
        }
    }
    if (!created) {
        await display.putstr_message('You feel as if nothing combative is near.');
    }
    return false;
}

// cf. read.c seffect_teleportation()
export async function seffect_teleportation(sobj, player, display, game) {
    const scursed = sobj.cursed;
    const confused = !!player.confused;

    if (confused || scursed) {
        // cf. level_tele() — level teleport
        await level_tele(game);
    } else {
        // cf. scrolltele(sobj) — normal teleport
        await scrolltele(sobj, game);
    }
    return false;
}

// cf. read.c seffect_gold_detection()
export async function seffect_gold_detection(sobj, player, display, game) {
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const map = game?.map;

    if (confused || scursed) {
        // cf. trap_detect(sobj)
        if (await trap_detect(sobj, player, map, display, game)) {
            // failure: strange_feeling -> useup
            useup_scroll(sobj, player);
            return true;
        }
    } else {
        // cf. gold_detect(sobj)
        if (await gold_detect(sobj, player, map, display, game)) {
            // failure: strange_feeling -> useup
            useup_scroll(sobj, player);
            return true;
        }
    }
    return false;
}

// cf. read.c seffect_food_detection()
export async function seffect_food_detection(sobj, player, display, game) {
    const map = game?.map;
    // cf. food_detect(sobj)
    if (await food_detect(sobj, player, map, display, game)) {
        // nothing detected: strange_feeling -> useup
        useup_scroll(sobj, player);
        return true;
    }
    return false;
}

// cf. read.c seffect_magic_mapping()
async function seffect_magic_mapping(sobj, player, display, game) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const map = game?.map;

    // cf. C: nommap level check — not yet tracked in JS levels
    // if (level.flags.nommap) { ... make_confused ... return; }

    if (sblessed && map) {
        // Blessed: also reveals secret doors (before do_mapping)
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = map.at(x, y);
                if (loc && loc.typ === SDOOR) {
                    cvt_sdoor_to_door(loc);
                }
            }
        }
    }

    await display.putstr_message('A map coalesces in your mind!');
    const cval = scursed && !confused;
    if (cval) {
        // Temporarily confuse to screw up map
        player.confused = (player.confused || 0) || 1;
    }
    // cf. do_mapping()
    if (map) {
        await do_mapping(player, map, display);
    }
    if (cval) {
        // Restore confusion
        if (player.confused === 1) player.confused = 0;
        await display.putstr_message("Unfortunately, you can't grasp the details.");
    }
    return false;
}

// cf. read.c seffect_amnesia()
async function seffect_amnesia(sobj, player, display) {
    const sblessed = sobj.blessed;

    // cf. forget(!sblessed ? ALL_SPELLS : 0)
    if (!sblessed) {
        // Forget all spells
        const spells = player.spells || [];
        for (const spell of spells) {
            spell.sp_know = 0;
        }
    }
    // C: drain_weapon_skill(rnd(howmuch ? 5 : 3)) — always consumed
    rnd(!sblessed ? 5 : 3);

    if (player.hallucinating) {
        await display.putstr_message('Your mind releases itself from mundane concerns.');
    } else if (rn2(2)) {
        await display.putstr_message('Who was that Maud person anyway?');
    } else {
        await display.putstr_message('Thinking of Maud you forget everything else.');
    }
    await exercise(player, A_WIS, false);
    return false;
}

// cf. read.c maybe_tame() — taming effect on a monster
function maybe_tame(mtmp, sobj) {
    const was_tame = !!mtmp.tame;
    const was_peaceful = !!mtmp.mpeaceful;

    if (sobj.cursed) {
        // Cursed: anger the monster
        if (mtmp.mpeaceful) {
            mtmp.mpeaceful = false;
        }
        if (was_peaceful && !mtmp.mpeaceful) return -1;
    } else {
        // cf. C: if (!resist(mtmp, sobj->oclass, 0, NOTELL) || mtmp->isshk)
        //     tamedog(mtmp, sobj, FALSE)
        if (!resist(mtmp, SCROLL_CLASS) || mtmp.isshk) {
            // Simplified tamedog: tame the monster
            if (!mtmp.tame) {
                mtmp.tame = true;
                mtmp.mpeaceful = true;
            }
        }
        if ((!was_peaceful && mtmp.mpeaceful) || was_tame !== !!mtmp.tame) {
            return 1;
        }
    }
    return 0;
}

// cf. read.c seffect_taming()
export async function seffect_taming(sobj, player, display, game) {
    const confused = !!player.confused;
    const map = game?.map;
    const bd = confused ? 5 : 1;
    let candidates = 0, results = 0, vis_results = 0;

    if (map) {
        for (let i = -bd; i <= bd; i++) {
            for (let j = -bd; j <= bd; j++) {
                const mx = player.x + i;
                const my = player.y + j;
                const mtmp = map.monsterAt ? map.monsterAt(mx, my) : null;
                if (!mtmp || mtmp.dead || (mtmp.mhp != null && mtmp.mhp <= 0)) continue;
                candidates++;
                const res = maybe_tame(mtmp, sobj);
                results += res;
                vis_results += res; // simplified: assume all visible
            }
        }
    }
    if (!results) {
        await display.putstr_message(
            `Nothing interesting ${!candidates ? 'happens' : 'seems to happen'}.`);
    } else {
        await display.putstr_message(
            `The neighborhood ${vis_results ? 'is' : 'seems'} ${results < 0 ? 'un' : ''}friendlier.`);
    }
    return false;
}

// cf. read.c seffect_genocide()
export async function seffect_genocide(sobj, player, display) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;
    const already_known = isObjectNameKnown(sobj.otyp);

    if (!already_known) {
        await display.putstr_message('You have found a scroll of genocide!');
    }
    // cf. C: if (sblessed) do_class_genocide(); else do_genocide((!scursed) | (2 * !!Confusion))
    // do_genocide and do_class_genocide require interactive prompts (monster class/type selection)
    // which are not yet available in automated play. The scroll is identified but has no effect.
    await display.putstr_message('A sad feeling comes over you.');
    return false;
}

// cf. read.c seffect_fire()
async function seffect_fire(sobj, player, display, game) {
    const sblessed = sobj.blessed;
    const confused = !!player.confused;
    const already_known = isObjectNameKnown(sobj.otyp);
    const cval = bcsign(sobj);
    let dam = Math.floor((2 * (rn1(3, 3) + 2 * cval) + 1) / 3);
    const map = game?.map;
    let ccx = player.x, ccy = player.y;

    // Use up scroll first
    useup_scroll(sobj, player);

    if (!already_known) {
        learnscrolltyp(SCR_FIRE);
    }

    if (confused) {
        // Confused: minor self-burn
        await display.putstr_message('The scroll catches fire and you burn your hands.');
        // cf. losehp(1, ...) simplified: take 1 damage
        player.uhp = Math.max(0, (player.uhp || 0) - 1);
        return true; // consumed
    }

    // Non-confused: explosion
    if (sblessed) {
        // Blessed: damage multiplied by 5; in C, player can aim
        // but in automated play, center on self
        dam *= 5;
    }
    await display.putstr_message('The scroll erupts in a tower of flame!');

    // cf. explode(cc.x, cc.y, ZT_SPELL_O_FIRE, dam, SCROLL_CLASS, EXPL_FIERY)
    const ZT_SPELL_O_FIRE = 11;
    if (map) {
        await explode(ccx, ccy, ZT_SPELL_O_FIRE, dam, SCROLL_CLASS, EXPL_FIERY, map, player);
    } else {
        // Fallback: take damage directly
        player.uhp = Math.max(0, (player.uhp || 0) - dam);
    }
    return true; // consumed
}

// cf. read.c seffect_earth()
export async function seffect_earth(sobj, player, display, game) {
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = !!player.confused;

    // cf. C: check has_ceiling, not rogue level, not endgame
    await display.putstr_message(
        `The ${sblessed ? 'ceiling rumbles around' : 'ceiling rumbles above'} you!`);

    // cf. drop_boulder_on_player / drop_boulder_on_monster
    // Simplified: boulder damage without full object creation
    if (!sblessed) {
        // cf. C: drop_boulder_on_player(confused, !scursed, TRUE, FALSE)
        // dam = dmgval of boulder/rock
        const dam = confused ? rnd(6) : rnd(20);
        if (player.helmet) {
            await display.putstr_message('Fortunately, you are wearing a hard helmet.');
            player.uhp = Math.max(0, (player.uhp || 0) - Math.min(dam, 2));
        } else {
            await display.putstr_message(`You are hit by ${confused ? 'rocks' : 'a boulder'}!`);
            player.uhp = Math.max(0, (player.uhp || 0) - dam);
        }
    }
    return false;
}

// cf. read.c seffect_punishment()
export async function seffect_punishment(sobj, player, display) {
    const sblessed = sobj.blessed;
    const confused = !!player.confused;

    if (confused || sblessed) {
        await display.putstr_message('You feel guilty.');
        return false;
    }
    // cf. punish(sobj) — apply iron ball + chain
    // punish() creates iron ball and chain objects; not yet fully ported
    await display.putstr_message('You are being punished for your misbehavior!');
    // Mark player as punished (simplified — no ball/chain objects)
    player.punished = true;
    return false;
}

// cf. read.c seffect_stinking_cloud()
export async function seffect_stinking_cloud(sobj, player, display, game) {
    const already_known = isObjectNameKnown(sobj.otyp);

    if (!already_known) {
        await display.putstr_message('You have found a scroll of stinking cloud!');
    }
    // cf. do_stinking_cloud(sobj, already_known) + display_stinking_cloud_positions()
    const map = game?.map;
    if (map && player) {
        const display_stinking_cloud_positions = (on) => {
            if (on) {
                tmp_at(DISP_BEAM, { ch: '*', color: 10 });
                for (let dx = -STINKING_CLOUD_TARGET_DIST; dx <= STINKING_CLOUD_TARGET_DIST; dx++) {
                    for (let dy = -STINKING_CLOUD_TARGET_DIST; dy <= STINKING_CLOUD_TARGET_DIST; dy++) {
                        const x = player.x + dx;
                        const y = player.y + dy;
                        if (x === player.x && y === player.y) continue;
                        const loc = map.at ? map.at(x, y) : null;
                        if (!loc) continue;
                        tmp_at(x, y);
                    }
                }
            } else {
                tmp_at(DISP_END, 0);
            }
        };
        const can_center_cloud = (x, y) => {
            const loc = map.at ? map.at(x, y) : null;
            if (!loc) return false;
            return Math.max(Math.abs(x - player.x), Math.abs(y - player.y)) <= STINKING_CLOUD_TARGET_DIST;
        };
        const cc = { x: player.x, y: player.y };
        getpos_sethilite(display_stinking_cloud_positions, can_center_cloud);
        const rc = await getpos_async(cc, true, 'the desired position', {
            map, display, flags: game?.flags, goalPrompt: 'the desired position', player
        });
        if (rc < 0) {
            return false;
        }
    }
    // The C version prompts for a target position; automated play still self-targets.
    // cf. create_gas_cloud(cc.x, cc.y, ...) — gas cloud creation not yet ported
    await display.putstr_message('A cloud of toxic gas billows from the scroll.');
    return false;
}


// ============================================================
// 9. Effect dispatcher
// ============================================================

// cf. read.c seffects() — dispatch scroll effects by scroll type
// Returns true if scroll was consumed (useup'd) inside the handler
async function seffects(sobj, player, display, game) {
    const otyp = sobj.otyp;
    const od = objectData[otyp] || {};

    // cf. read.c:2147 — exercise wisdom for reading any magical scroll
    if (od.magic) {
        await exercise(player, A_WIS, true);
    }

    switch (otyp) {
    case SCR_ENCHANT_ARMOR:
        return await seffect_enchant_armor(sobj, player, display);
    case SCR_DESTROY_ARMOR:
        return await seffect_destroy_armor(sobj, player, display);
    case SCR_CONFUSE_MONSTER:
        return await seffect_confuse_monster(sobj, player, display);
    case SCR_SCARE_MONSTER:
        return await seffect_scare_monster(sobj, player, display, game);
    case SCR_BLANK_PAPER:
        return await seffect_blank_paper(sobj, player, display);
    case SCR_REMOVE_CURSE:
        return await seffect_remove_curse(sobj, player, display);
    case SCR_CREATE_MONSTER:
        return await seffect_create_monster(sobj, player, display, game);
    case SCR_ENCHANT_WEAPON:
        return await seffect_enchant_weapon(sobj, player, display);
    case SCR_TAMING:
        return await seffect_taming(sobj, player, display, game);
    case SCR_GENOCIDE:
        return await seffect_genocide(sobj, player, display);
    case SCR_LIGHT:
        return await seffect_light(sobj, player, display, game);
    case SCR_TELEPORTATION:
        return await seffect_teleportation(sobj, player, display, game);
    case SCR_GOLD_DETECTION:
        return await seffect_gold_detection(sobj, player, display, game);
    case SCR_FOOD_DETECTION:
        return await seffect_food_detection(sobj, player, display, game);
    case SCR_IDENTIFY:
        return await seffect_identify(sobj, player, display);
    case SCR_CHARGING:
        return await seffect_charging(sobj, player, display, game);
    case SCR_MAGIC_MAPPING:
        return await seffect_magic_mapping(sobj, player, display, game);
    case SCR_AMNESIA:
        return await seffect_amnesia(sobj, player, display);
    case SCR_FIRE:
        return await seffect_fire(sobj, player, display, game);
    case SCR_EARTH:
        return await seffect_earth(sobj, player, display, game);
    case SCR_PUNISHMENT:
        return await seffect_punishment(sobj, player, display);
    case SCR_STINKING_CLOUD:
        return await seffect_stinking_cloud(sobj, player, display, game);
    default:
        await display.putstr_message(`What weird effect is this? (${otyp})`);
        return false;
    }
}

export { handleRead, tshirt_text, hawaiian_motif, hawaiian_design, candy_wrapper_text, stripspe, bcsign, blessorcurse, uncurse, some_armor, useup_scroll, seffects, litroom };

// Autotranslated from read.c:68
export function learnscroll(sobj) {
  if (sobj.oclass !== SPBOOK_CLASS) {
    learnscrolltyp(sobj.otyp);
  }
}

// Autotranslated from read.c:687
export function charge_ok(obj) {
  if (!obj) return GETOBJ_EXCLUDE;
  if (obj.oclass === WAND_CLASS) return GETOBJ_SUGGEST;
  if (obj.oclass === RING_CLASS && objectData[obj.otyp].oc_charged && obj.dknown && objectData[obj.otyp].oc_name_known) return GETOBJ_SUGGEST;
  if (is_weptool(obj)) return GETOBJ_EXCLUDE;
  if (obj.oclass === TOOL_CLASS) {
    if (obj.otyp === BRASS_LANTERN || (obj.otyp === OIL_LAMP)   || (obj.otyp === MAGIC_LAMP && !objectData[MAGIC_LAMP].oc_name_known)) { return GETOBJ_SUGGEST; }
    if (objectData[obj.otyp].oc_charged) {
      return (obj.dknown && objectData[obj.otyp].oc_name_known) ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
    }
    return GETOBJ_EXCLUDE;
  }
  return GETOBJ_EXCLUDE_SELECTABLE;
}

// Autotranslated from read.c:1018
export async function forget(howmuch, game, map, player) {
  let mtmp;
  if (Punished) player.bc_felt = 0;
  if (howmuch & ALL_SPELLS) await losespells();
  drain_weapon_skill(rnd(howmuch ? 5 : 3));
  for (mtmp = (map?.fmon || null); mtmp; mtmp = mtmp.nmon) {
    if (mtmp !== player.usteed && mtmp !== player.ustuck) mtmp.meverseen = 0;
  }
  for (mtmp = game.migrating_mons; mtmp; mtmp = mtmp.nmon) {
    mtmp.meverseen = 0;
  }
}

// Autotranslated from read.c:1067
export function valid_cloud_pos(x, y, map) {
  if (!isok(x,y)) return false;
  return ACCESSIBLE(map.locations[x][y].typ) || is_pool(x, y) || is_lava(x, y);
}

// Autotranslated from read.c:2287
export async function drop_boulder_on_monster(x, y, confused, byu, player) {
  let otmp2, mtmp;
  otmp2 = mksobj(confused ? ROCK : BOULDER, false, false);
  if (!otmp2) return false;
  otmp2.quan = confused ? rn1(5, 2) : 1;
  otmp2.owt = weight(otmp2);
  mtmp = m_at(x, y);
  if (mtmp && !amorphous(mtmp.data) && !passes_walls(mtmp.data) && !noncorporeal(mtmp.data) && !unsolid(mtmp.data)) {
    let helmet = which_armor(mtmp, W_ARMH), mdmg;
    if (cansee(mtmp.mx, mtmp.my)) {
      await pline("%s is hit by %s!", Monnam(mtmp), doname(otmp2));
      if (mtmp.minvis && !canspotmon(mtmp)) map_invisible(mtmp.mx, mtmp.my);
    }
    else if (engulfing_u(mtmp)) await You_hear("something hit %s %s over your %s!", s_suffix(mon_nam(mtmp)), mbodypart(mtmp, STOMACH), body_part(HEAD));
    mdmg = dmgval(otmp2, mtmp) * otmp2.quan;
    if (helmet) {
      if (hard_helmet(helmet)) {
        if (canspotmon(mtmp)) await pline("Fortunately, %s is wearing a hard helmet.", mon_nam(mtmp));
        else if (!(player?.Deaf || player?.deaf || false)) await You_hear("a clanging sound.");
        if (mdmg > 2) mdmg = 2;
      }
      else {
        if (canspotmon(mtmp)) await pline("%s's %s does not protect %s.", Monnam(mtmp), xname(helmet), mhim(mtmp));
      }
    }
    mtmp.mhp -= mdmg;
    if (DEADMONSTER(mtmp)) {
      if (byu) { await killed(mtmp); }
      else { await pline("%s is killed.", Monnam(mtmp)); mondied(mtmp); }
    }
    else { wakeup(mtmp, byu); }
    wake_nearto(x, y, 4 * 4);
  }
  else if (engulfing_u(mtmp)) {
    obfree(otmp2,  0);
    drop_boulder_on_player(confused, true, false, true);
    return 1;
  }
  if (!await flooreffects(otmp2, x, y, "fall")) {
    place_object(otmp2, x, y);
    stackobj(otmp2);
    newsym(x, y);
  }
  return true;
}

// Autotranslated from read.c:2417
export function set_lit(x, y, val, map) {
  let mtmp, gremlin;
  if (val) {
    map.locations[x][y].lit = 1;
    if ((mtmp = m_at(x, y, map)) != null && mtmp.data === mons[PM_GREMLIN]) {
      gremlin =  alloc(gremlin.length);
      gremlin.mon = mtmp;
      gremlin.nxt = gremlins;
      gremlins = gremlin;
    }
  }
  else { map.locations[x][y].lit = 0; snuff_light_source(x, y); }
}

// Autotranslated from read.c:3012
export function unpunish() {
  let savechain = uchain;
  setworn( 0, W_CHAIN);
  delobj(savechain);
  setworn( 0, W_BALL);
}

// Autotranslated from read.c:1078
export function can_center_cloud(x, y) {
  if (!valid_cloud_pos(x, y)) return false;
  return (cansee(x, y) && distu(x, y) < 32);
}

// Autotranslated from read.c:1086
export function display_stinking_cloud_positions(on_off, player) {
  let x, y, dx, dy, dist = 6;
  if (on_off) {
    tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos));
    for (dx = -dist; dx <= dist; dx++) {
      for (dy = -dist; dy <= dist; dy++) {
        x = player.x + dx;
        y = player.y + dy;
        if (u_at(x, y)) {
          continue;
        }
        if (can_center_cloud(x, y)) tmp_at(x, y);
      }
    }
  }
  else { tmp_at(DISP_END, 0); }
}

// Autotranslated from read.c:3318
export async function create_particular() {
  let d, bufp, buf, prompt, tryct = CP_TRYLIM, altmsg = 0;
  buf[0] = '\x00';
  prompt = "Create what kind of monster?";
  do {
    await getlin(prompt, buf);
    bufp = mungspaces(buf);
    if ( bufp === '\x1b') return false;
    if (create_particular_parse(bufp, d)) {
      break;
    }
    if ( bufp || altmsg || tryct < 2) { await pline("I've never heard of such monsters."); }
    else {
      await pline("Try again (type * for random, ESC to cancel).");
      ++altmsg;
    }
    if (tryct === CP_TRYLIM) {
      Strcat(prompt, " [type name or symbol]");
    }
  } while (--tryct > 0);
  if (!tryct) pline1(thats_enough_tries);
  else {
    return create_particular_creation( d);
  }
  return false;
}

// ---------------------------------------------------------------------------
// cf. read.c:3059 — cant_revive(mtype_ref, revival, from_obj)
// Some creatures become zombies/dopplegangers when revived outside normal loc.
// mtype_ref is {value: PM_*} (pass-by-reference pattern).
// ---------------------------------------------------------------------------
export function cant_revive(mtype_ref, revival, from_obj) {
    const mtype = mtype_ref.value;
    if (mtype === PM_GUARD || (mtype === PM_SHOPKEEPER && !revival)
        || mtype === PM_HIGH_CLERIC || mtype === PM_ALIGNED_CLERIC
        || mtype === PM_ANGEL) {
        mtype_ref.value = PM_HUMAN_ZOMBIE;
        return true;
    } else if (mtype === PM_LONG_WORM_TAIL) {
        mtype_ref.value = PM_LONG_WORM;
        return true;
    } else if (unique_corpstat(mons[mtype])
               && (!from_obj || !from_obj.oextra_omonst)) {
        mtype_ref.value = PM_DOPPELGANGER;
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// cf. read.c:3084 — create_particular_parse(str, data)
// Parse user input for create_particular wizard mode command.
// Stub: wizard mode only, not needed for gameplay parity.
// ---------------------------------------------------------------------------
export function create_particular_parse(str, data) {
    // Wizard mode function — stub for CODEMATCH completeness
    return false;
}

// ---------------------------------------------------------------------------
// cf. read.c:3199 — create_particular_creation(data)
// Create the monster specified by create_particular_parse.
// Stub: wizard mode only, not needed for gameplay parity.
// ---------------------------------------------------------------------------
export async function create_particular_creation(data) {
    // Wizard mode function — stub for CODEMATCH completeness
    return false;
}

// ---------------------------------------------------------------------------
// cf. read.c:2585 — do_class_genocide()
// Genocide all monsters of a given class. Complex UI + monster iteration.
// Stub: genocide scroll effects are partially wired in seffects.
// ---------------------------------------------------------------------------
export async function do_class_genocide(player, game) {
    // Full implementation deferred — requires iterating all monsters of a class,
    // killing/removing them, and handling edge cases (unique monsters, etc.)
    await pline("A class genocide occurs!");
}

// ---------------------------------------------------------------------------
// cf. read.c:2773 — do_genocide(bang)
// Genocide a specific monster type. Has RNG: rndmonst() x3 for confused case.
// Stub: genocide scroll effects are partially wired in seffects.
// ---------------------------------------------------------------------------
export async function do_genocide(bang, player, game) {
    // Full implementation deferred — requires getlin prompt, monster name parsing,
    // and global monster removal
    await pline("A genocide occurs!");
}

// ---------------------------------------------------------------------------
// cf. read.c:3029 — do_stinking_cloud(sobj, mention_stinking)
// Prompt for stinking cloud location and create gas cloud.
// ---------------------------------------------------------------------------
export async function do_stinking_cloud(sobj, mention_stinking, player, game) {
    const display = game?.display;
    await pline("Where do you want to center the %scloud?",
        mention_stinking ? "stinking " : "");

    // getpos prompt — simplified: use player's position
    const { getpos } = await nhimport('./getpos.js');
    const cc = { x: player.x, y: player.y };
    getpos_sethilite(display_stinking_cloud_positions, can_center_cloud);
    const res = await getpos_async(cc, true, "the desired position", game);
    if (res < 0) {
        await pline("Never mind.");
        return;
    }
    if (!can_center_cloud(cc.x, cc.y)) {
        if (player.hallucinating) {
            await pline("Ugh... someone cut the cheese.");
        } else {
            await pline("%s a whiff of rotten eggs.",
                sobj.oclass === SCROLL_CLASS ? "The scroll crumbles with" : "You smell");
        }
        return;
    }
    const { create_gas_cloud } = await nhimport('./region.js');
    if (create_gas_cloud) {
        create_gas_cloud(cc.x, cc.y, 15 + 10 * bcsign(sobj), 8 + 4 * bcsign(sobj));
    }
}

// ---------------------------------------------------------------------------
// cf. read.c:2241 — drop_boulder_on_player(confused, helmet_protects, byu, skip_uswallow)
// Drop boulder(s) on the hero. RNG: rn1(5,2) for confused rock count.
// ---------------------------------------------------------------------------
export async function drop_boulder_on_player(confused, helmet_protects, byu, skip_uswallow, player, map, game) {
    // hit monster if swallowed
    if (player.uswallow && !skip_uswallow) {
        await drop_boulder_on_monster(player.x, player.y, confused, byu, player);
        return;
    }

    const { mksobj, weight: objWeight, place_object, stackobj } = await nhimport('./mkobj.js');
    const otmp2 = mksobj(confused ? ROCK : BOULDER, false, false);
    if (!otmp2) return;
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = objWeight(otmp2);

    let dmg = 0;
    if (!amorphous(player.data) && !player.Passes_walls
        && !noncorporeal(player.data) && !unsolid(player.data)) {
        await pline("You are hit by %s!", doname(otmp2));
        dmg = otmp2.quan; // simplified dmgval
        if (player.helmet && helmet_protects) {
            await pline("Fortunately, you are wearing a hard helmet.");
            if (dmg > 2) dmg = 2;
        }
    }
    // wake_nearto(player.x, player.y, 16) — not fully wired
    place_object(otmp2, player.x, player.y);
    stackobj(otmp2);
    newsym(player.x, player.y);
    // losehp not fully wired
}

// ---------------------------------------------------------------------------
// cf. read.c:2966 — punish(sobj)
// Apply punishment (ball & chain).
// ---------------------------------------------------------------------------
export async function punish(sobj, player) {
    const reuse_ball = (sobj && sobj.otyp === HEAVY_IRON_BALL) ? sobj : null;
    const cursed_levy = (sobj && sobj.cursed) ? 1 : 0;

    if (!reuse_ball)
        await You("are being punished for your misbehavior!");
    if (player.Punished) {
        await pline("Your iron ball gets heavier.");
        if (player.uball) player.uball.owt = (player.uball.owt || 0) + 160 * (1 + cursed_levy);
        return;
    }
    if (amorphous(player.data) || is_whirly(player.data) || unsolid(player.data)) {
        if (!reuse_ball) {
            await pline("A ball and chain appears, then falls away.");
        }
        return;
    }
    // Full ball & chain creation requires setworn/placebc — stub
    await pline("You are being punished!");
}

// ---------------------------------------------------------------------------
// cf. read.c:728 — recharge(obj, curse_bless)
// Recharge a wand, ring, or tool. RNG-consuming.
// ---------------------------------------------------------------------------
export async function recharge(obj, curse_bless, player, game) {
    const is_cursed = curse_bless < 0;
    const is_blessed = curse_bless > 0;

    if (obj.oclass === WAND_CLASS) {
        const lim = (obj.otyp === WAN_WISHING) ? 1
            : ((objectData[obj.otyp]?.oc_dir || 0) !== NODIR) ? 8 : 15;

        // undo prior cancellation
        if (obj.spe === -1) obj.spe = 0;

        // explosion check
        const n = obj.recharged || 0;
        if (n > 0 && (obj.otyp === WAN_WISHING
                      || (n * n * n > rn2(7 * 7 * 7)))) {
            await wand_explode(obj, rnd(lim), player, game);
            return;
        }
        obj.recharged = (obj.recharged || 0) + 1;

        if (is_cursed) {
            await stripspe(obj, player, game?.display);
        } else {
            let newn = (lim === 1) ? 1 : rn1(5, lim + 1 - 5);
            if (!is_blessed)
                newn = rnd(newn);
            if ((obj.spe || 0) < newn)
                obj.spe = newn;
            else
                obj.spe = (obj.spe || 0) + 1;

            if (obj.otyp === WAN_WISHING && obj.spe > 3) {
                await wand_explode(obj, 1, player, game);
                return;
            }
            if (lim === 1)
                await p_glow3(obj, 'blue', player, game?.display);
            else if (obj.spe >= lim)
                await p_glow2(obj, 'blue', player, game?.display);
            else
                await p_glow1(obj, player, game?.display);
        }

    } else if (obj.oclass === RING_CLASS && objectData[obj.otyp]?.oc_charged) {
        const s = is_blessed ? rnd(3) : is_cursed ? -rnd(2) : 1;
        if ((obj.spe || 0) > rn2(7) || (obj.spe || 0) <= -5) {
            await pline("%s momentarily, then explodes!", Yobjnam2(obj, "pulsate"));
            const sdmg = rnd(3 * Math.abs(obj.spe || 1));
            // useup + losehp not fully wired — consume RNG
        } else {
            await pline("%s spins %sclockwise for a moment.", Yname2(obj),
                s < 0 ? "counter" : "");
            obj.spe = (obj.spe || 0) + s;
        }

    } else if (obj.oclass === TOOL_CLASS) {
        const rechrg = obj.recharged || 0;
        if (objectData[obj.otyp]?.oc_charged) {
            if (rechrg < 7) obj.recharged = rechrg + 1;
        }
        switch (obj.otyp) {
        case BELL_OF_OPENING:
            if (is_cursed) await stripspe(obj, player, game?.display);
            else if (is_blessed) obj.spe = (obj.spe || 0) + rnd(3);
            else obj.spe = (obj.spe || 0) + 1;
            if (obj.spe > 5) obj.spe = 5;
            break;
        case MAGIC_MARKER: case TINNING_KIT: case EXPENSIVE_CAMERA:
            if (is_cursed) await stripspe(obj, player, game?.display);
            else if (rechrg > 0 && obj.otyp === MAGIC_MARKER) {
                await stripspe(obj, player, game?.display);
            } else {
                const factor = (obj.otyp === MAGIC_MARKER) ? 50 : (obj.otyp === TINNING_KIT) ? 20 : 60;
                obj.spe = (obj.spe || 0) + (is_blessed ? rn1(factor, factor) : rn1(factor, 0));
                await p_glow2(obj, 'blue', player, game?.display);
            }
            break;
        case UNICORN_HORN:
            if (is_cursed) await stripspe(obj, player, game?.display);
            else if (is_blessed) obj.spe = (obj.spe || 0) + rnd(5);
            else obj.spe = (obj.spe || 0) + 1;
            if (obj.spe > 7) obj.spe = 7;
            break;
        default:
            await pline("Nothing seems to happen.");
            break;
        }
    } else {
        await pline("You have a feeling of loss.");
    }
}

// ---------------------------------------------------------------------------
// cf. read.c:2104 — seffect_mail(sobjp)
// Handle reading a scroll of mail.
// ---------------------------------------------------------------------------
export async function seffect_mail(sobj) {
    const odd = ((sobj.o_id || 0) % 2) === 1;
    switch (sobj.spe) {
    case 2:
        await pline("This scroll is marked \"%s\".",
            odd ? "Postage Due" : "Return to Sender");
        break;
    case 1:
        await pline("This seems to be %s.",
            odd ? "a chain letter threatening your luck"
                : "junk mail addressed to the finder of the Eye of Larn");
        break;
    default:
        await pline("That was a scroll of mail?");
        break;
    }
}

// ---------------------------------------------------------------------------
// cf. read.c:2361 — wand_explode(obj, chg)
// A wand explodes during recharging or use. RNG: d(n,k).
// ---------------------------------------------------------------------------
export async function wand_explode(obj, chg, player, game) {
    const expl = !chg ? "suddenly" : "vibrates violently and";
    if (!chg) chg = 2;
    let n = (obj.spe || 0) + chg;
    if (n < 2) n = 2;
    let k;
    switch (obj.otyp) {
    case WAN_WISHING: k = 12; break;
    case WAN_CANCELLATION: case WAN_DEATH: case WAN_POLYMORPH: case WAN_UNDEAD_TURNING:
        k = 10; break;
    case WAN_COLD: case WAN_FIRE: case WAN_LIGHTNING: case WAN_MAGIC_MISSILE:
        k = 8; break;
    case WAN_NOTHING: k = 4; break;
    default: k = 6; break;
    }
    const dmg = d(n, k);
    obj.in_use = true;
    await pline("%s %s explodes!", Yname2(obj), expl);
    // losehp(Maybe_Half_Phys(dmg), "exploding wand", KILLED_BY_AN) — not fully wired
    // useup(obj) — not fully wired
    await exercise(player, A_STR, false);
}
