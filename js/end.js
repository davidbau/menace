// end.js -- Game over, death handling, scoring, and endgame
// cf. end.c — done_intr, done1, done2, done_hangup, done_in_by, fixup_death,
//             should_query_disclose_option, dump_plines, dump_everything,
//             disclose, savelife, get_valuables, sort_valuables, panic,
//             artifact_score, done_object_cleanup, fuzzer_savelife, done,
//             really_done, container_contents, nh_terminate,
//             delayed_killer, find_delayed_killer, dealloc_killer,
//             save_killers, restore_killers, build_english_list,
//             wordcount, bel_copy1, NH_abort
//
// end.c handles all game-termination logic:
//   done(how): main game-end entry point; checks life-saving amulet.
//   really_done(how): final cleanup, bones, score, tombstone, exit.
//   done_in_by(mtmp, how): construct killer message from monster.
//   disclose(): prompt for end-of-game disclosure (inventory, conduct, etc.).
//   dump_everything(): generate dumplog file.
//   panic(): fatal error handler with stack trace attempt.
//   delayed_killer: deferred death reason management.
//
// JS implementations:
//   renderTombstone → display.js:1135 (PARTIAL — tombstone rendering)
//   renderTopTen → display.js:1186 (PARTIAL — high score display)

import { A_CON, isok, DIED, CHOKING, POISONING, STARVING, DROWNING, BURNING, DISSOLVED, CRUSHING, STONING, TURNED_SLIME, GENOCIDED, PANICKED, TRICKED, QUIT, ESCAPED, ASCENDED, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, NON_PM, OBJ_FREE, OBJ_FLOOR, W_AMUL } from './const.js';
import { pline, You, Your, You_feel, pline_The, impossible } from './pline.js';
import { mons, G_UNIQ, PM_GHOST, PM_HIGH_CLERIC, PM_WRAITH, PM_VAMPIRE, PM_GHOUL, S_WRAITH, S_MUMMY, S_VAMPIRE, M2_PNAME, PM_TOURIST, PM_HUMAN, PM_GREEN_SLIME, PM_HOUSECAT } from './monsters.js';
import { x_monnam, hasGivenName, is_vampshifter } from './mondata.js';
import { AMULET_OF_LIFE_SAVING, AMULET_CLASS, GEM_CLASS,
         FIRST_AMULET, FIRST_REAL_GEM, LAST_REAL_GEM, LAST_GLASS_GEM,
         BELL_OF_OPENING, CANDELABRUM_OF_INVOCATION,
         SPE_BOOK_OF_THE_DEAD, BAG_OF_TRICKS, STATUE,
         objectData } from './objects.js';
import { Is_container, xname, doname } from './mkobj.js';
import { arti_cost, artiname } from './artifact.js';
import { acurr } from './attrib.js';
import { currency } from './invent.js';
import { d } from './rng.js';
import { roles } from './player.js';
import { freedynamicdata } from './save.js';
import { ynFunction } from './input.js';

// cf. end.c:47 — death descriptions (indexed by game_end_types)
const deaths = [
    "died", "choked", "poisoned", "starvation", "drowning", "burning",
    "dissolving under the heat and pressure", "crushed", "turned to stone",
    "turned into slime", "genocided", "panic", "trickery", "quit",
    "escaped", "ascended"
];

// cf. end.c:55 — "when you %s" descriptions
const ends = [
    "died", "choked", "were poisoned",
    "starved", "drowned", "burned",
    "dissolved in the lava",
    "were crushed", "turned to stone",
    "turned into slime", "were genocided",
    "panicked", "were tricked", "quit",
    "escaped", "ascended"
];

// ============================================================================
// Killer state — cf. C's svk.killer (struct kinfo)
// In C this is a global; in JS we use a module-level object.
// ============================================================================
const killer = {
    name: '',
    format: KILLED_BY_AN,
    next: null,  // linked list for delayed killers
};

// Access the killer state
export function getKiller() { return killer; }
export function setKillerName(name) { killer.name = name; }
export function setKillerFormat(fmt) { killer.format = fmt; }

// ============================================================================
// delayed_killer / find_delayed_killer / dealloc_killer
// cf. end.c:1709-1760
// Manages deferred death reasons (e.g., sickness, sliming)
// ============================================================================

// cf. end.c:1709 — delayed_killer(id, format, killername): set delayed killer
// Sets a deferred killer record with format and name for later use.
export function delayed_killer(id, format, killername) {
    let k = find_delayed_killer(id);
    if (!k) {
        // No match — add a new delayed killer to the list
        k = { id, format: 0, name: '', next: killer.next };
        killer.next = k;
    }
    k.format = format;
    k.name = killername || '';
    killer.name = '';
}

// cf. end.c:1728 — find_delayed_killer(id): find delayed killer
// Searches delayed killer list for record matching given id.
// Autotranslated from end.c:1728
export function find_delayed_killer(id) {
  let k;
  for (k = killer.next; k != null; k = k.next) {
    if (k.id === id) {
      break;
    }
  }
  return k;
}

// cf. end.c:1740 — dealloc_killer(kptr): remove delayed killer
// Removes delayed killer from linked list.
export function dealloc_killer(kptr) {
    if (!kptr) return;
    let prev = killer;
    for (let k = killer.next; k != null; k = k.next) {
        if (k === kptr) {
            prev.next = k.next;
            return;
        }
        prev = k;
    }
    impossible("dealloc_killer (#%d) not on list", kptr.id);
}

// ============================================================================
// build_english_list
// cf. end.c:1825
// Converts space-separated words to "a, b, or c" format.
// ============================================================================

// cf. end.c:1794 [static] — wordcount(p): count words in string
export function wordcount(p) {
    let words = 0;
    let i = 0;
    while (i < p.length) {
        while (i < p.length && p[i] === ' ') i++;
        if (i < p.length) words++;
        while (i < p.length && p[i] !== ' ') i++;
    }
    return words;
}

// cf. end.c:1811 [static] — bel_copy1(inp, out): copy next word
// Returns [nextIndex, word] — extracts next whitespace-delimited word from inp starting at index out
export function bel_copy1(inp, idx) {
  // skip leading whitespace
  while (idx < inp.length && inp[idx] === ' ') idx++;
  // copy word
  let word = '';
  while (idx < inp.length && inp[idx] !== ' ') {
    word += inp[idx++];
  }
  return [idx, word];
}

// cf. end.c:1825 — build_english_list(input): build English list
export function build_english_list(input) {
    let words = wordcount(input);
    let idx = 0;
    let out = '';
    let word;

    switch (words) {
    case 0:
        impossible("no words in list");
        break;
    case 1:
        // "single"
        [idx, word] = bel_copy1(input, idx);
        out += word;
        break;
    default:
        if (words === 2) {
            // "first or second"
            [idx, word] = bel_copy1(input, idx);
            out += word + ' ';
        } else {
            // "first, second, or third"
            let remaining = words;
            do {
                [idx, word] = bel_copy1(input, idx);
                out += word + ', ';
            } while (--remaining > 1);
        }
        out += 'or ';
        [idx, word] = bel_copy1(input, idx);
        out += word;
        break;
    }
    return out;
}

// is_vampshifter imported from mondata.js

// ============================================================================
// done_in_by
// cf. end.c:188
// Builds killer message from monster type, name, and context.
// ============================================================================

// cf. end.c:188 — done_in_by(mtmp, how): construct killer message
// Builds detailed killer message from monster type, name, and context.
// In the JS port, this sets player.deathCause and then calls done().
export async function done_in_by(mtmp, how, game) {
    const player = (game.u || game.player);
    const mndx = mtmp.mndx;
    const mptr = mons[mndx] || {};
    const chamMndx = (mtmp.cham != null && mtmp.cham >= 0) ? mtmp.cham : mndx;
    const champtr = mons[chamMndx] || mptr;
    const mimicker = (mtmp.m_ap_type != null && mtmp.m_ap_type > 0);
    const imitator = (mptr !== champtr || mimicker);

    await You((how === STONING) ? "turn to stone..." : "die...");

    let buf = '';
    killer.format = KILLED_BY_AN;

    // "killed by the high priest of Crom" is okay,
    // "killed by the high priest" alone isn't
    if ((mptr.geno & G_UNIQ) !== 0 && !(imitator && !mimicker)
        && !(mndx === PM_HIGH_CLERIC && !mtmp.ispriest)) {
        if (!(mptr.mflags2 & M2_PNAME))
            buf += 'the ';
        killer.format = KILLED_BY;
    }
    // _the_ <invisible> ghost of Dudley
    if (mndx === PM_GHOST && hasGivenName(mtmp)) {
        buf += 'the ';
        killer.format = KILLED_BY;
    }
    if (mtmp.minvis) buf += 'invisible ';

    if (imitator) {
        const realnm = champtr.name || 'monster';
        let fakenm = mptr.name || 'monster';
        const alt = is_vampshifter(mtmp);

        if (mimicker) {
            // fakenm from mappearance
            const appMptr = mons[mtmp.mappearance];
            if (appMptr) fakenm = appMptr.name;
        } else if (alt && (realnm.indexOf('vampire') >= 0)
                   && fakenm === 'vampire bat') {
            fakenm = 'bat';
        }
        let shape;
        if (alt || (mptr.mflags2 & M2_PNAME)) {
            shape = fakenm;
        } else {
            shape = fakenm;
        }
        const relation = alt ? 'in %s form'
            : mimicker ? 'disguised as %s'
            : 'imitating %s';
        buf += `${realnm} ${relation.replace('%s', shape)}`;
    } else if (mndx === PM_GHOST) {
        buf += 'ghost';
        if (hasGivenName(mtmp)) {
            const givenName = mtmp.name || '';
            buf += ` of ${givenName}`;
        }
    } else if (mtmp.isshk) {
        const shknm = mtmp.shopkeeperName || mtmp.name || 'shopkeeper';
        const honorific = mtmp.female ? 'Ms. ' : 'Mr. ';
        buf += `${honorific}${shknm}, the shopkeeper`;
        killer.format = KILLED_BY;
    } else if (mtmp.ispriest || mtmp.isminion) {
        buf += x_monnam(mtmp);
    } else {
        buf += mptr.name || 'monster';
        if (hasGivenName(mtmp)) {
            const givenName = mtmp.name || '';
            buf += ` called ${givenName}`;
        }
    }

    killer.name = buf;

    // Undead transformation (C: ugrave_arise handling)
    if (mptr.mlet === S_WRAITH)
        player.ugrave_arise = PM_WRAITH;
    else if (mptr.mlet === S_MUMMY)
        player.ugrave_arise = -1; // simplified; race-specific mummy
    else if (mptr.mlet === S_VAMPIRE && player.race === PM_HUMAN)
        player.ugrave_arise = PM_VAMPIRE;
    else if (mndx === PM_GHOUL)
        player.ugrave_arise = PM_GHOUL;

    await done(how, game);
}

// ============================================================================
// fixup_death
// cf. end.c:369
// ============================================================================

const death_fixups = [
    { why: STONING, unmulti: true, exclude: "getting stoned", include: null },
    { why: STARVING, unmulti: false, exclude: "fainted from lack of food", include: "fainted" },
];

// cf. end.c:369 [static] — fixup_death(how): fix helpless-death reason
function fixup_death(how, game) {
    if (game.multi_reason) {
        for (const fix of death_fixups) {
            if (fix.why === how && fix.exclude === game.multi_reason) {
                if (fix.include)
                    game.multi_reason = fix.include;
                else
                    game.multi_reason = null;
                if (fix.unmulti)
                    game.multi = 0;
                break;
            }
        }
    }
}

// ============================================================================
// savelife
// cf. end.c:706
// Restores hero to playable state after Amulet of Life Saving triggers.
// ============================================================================

// cf. end.c:706 [static] — savelife(how): life-saving amulet restoration
function savelife(how, game) {
    const player = (game.u || game.player);
    const givehp = 50 + 10 * Math.floor(acurr(player, A_CON) / 2);

    if (player.ulevel < 1) player.ulevel = 1;
    // C: uhpmin = minuhpmax(10) — ensure hpmax >= 10
    if (player.uhpmax < 10) player.uhpmax = 10;
    player.uhp = Math.min(player.uhpmax, givehp);
    player._botl = true;
    player._botlStepIndex = Number.isInteger((game?.lev || game?.map)?._replayStepIndex)
        ? (game.lev || game.map)._replayStepIndex
        : null;

    if (player.hunger < 500 || how === CHOKING) {
        player.hunger = 900;
        player.nutrition = 900;
    }
    // Cure imminent sickness death
    // C: if ((Sick & TIMEOUT) == 1L) make_sick(0, ...)
    // TODO: when Sick property is fully ported

    game.multi = -1;
    if (game) {
        const ctx = game.context || (game.context = {});
        ctx.move = 0;
    }
    // C ref: end.c savelife() sets gn.nomovemsg so unmul() emits this exact line.
    game.nomovemsg = "You survived that attempt on your life.";
    game.multi_reason = (player.roleIndex === roles.findIndex(r => r?.name === 'Tourist'))
        ? "being toyed with by Fate"
        : "attempting to cheat Death";
    // C-faithful scope: only request an immediate moveloop stop when the
    // lifesave occurs during monster-phase processing.
    if (game?.context?.mon_moving) {
        game._stopMoveloopAfterLifesave = true;
    }

    player.ugrave_arise = -1; // NON_PM
}

// ============================================================================
// done — main game-end handler
// cf. end.c:1022
// ============================================================================

// cf. end.c:1022 — done(how): main game-end handler
// Checks for life-saving, wizard/discover options, then calls really_done.
export async function done(how, game) {
    const player = (game.u || game.player);
    let survive = false;
    const wornAmulet = player?.amulet
        || player?.inventory?.find((obj) => ((obj?.owornmask || 0) & W_AMUL) !== 0)
        || null;

    if (how === TRICKED) {
        if (killer.name) {
            killer.name = '';
        }
        if (game.wizard) {
            killer.format = KILLED_BY_AN;
            return;
        }
    }

    // Set killer format defaults
    if (how === ASCENDED || (!killer.name && how === GENOCIDED))
        killer.format = NO_KILLER_PREFIX;
    if (!killer.name && (how === STARVING || how === BURNING))
        killer.format = KILLED_BY;
    if (!killer.name || how >= PANICKED)
        killer.name = deaths[how] || 'died';

    if (how < PANICKED) {
        player.umortality = (player.umortality || 0) + 1;
        if (player.uhp !== 0) {
            player.uhp = 0;
        }
    }

    // Life-saving amulet check
    // C: Lifesaved = wearing AMULET_OF_LIFE_SAVING
    if (wornAmulet && wornAmulet.otyp === AMULET_OF_LIFE_SAVING
        && how <= GENOCIDED) {
        await pline("But wait...");
        await Your("medallion %s!", "begins to glow");
        if (how === CHOKING) await You("vomit ...");
        await You_feel("much better!");
        await pline_The("medallion crumbles to dust!");
        // Remove the amulet (C: useup(uamul))
        const amuIdx = player.inventory.indexOf(wornAmulet);
        if (amuIdx >= 0) player.inventory.splice(amuIdx, 1);
        player.amulet = null;

        // C: adjattrib(A_CON, -1, TRUE) — lose 1 CON
        if (player.attributes[A_CON] > 3)
            player.attributes[A_CON]--;

        savelife(how, game);
        if (how === GENOCIDED) {
            await pline("Unfortunately you are still genocided...");
        } else {
            // Set death cause for livelog
            player.deathCause = '';
            survive = true;
        }
    }

    if (!survive && (game.wizard || game.discover) && how <= GENOCIDED) {
        // C ref: done() uses yn_function("Die?", "yn", 'n') inline.
        // Keep this blocking so post-savelife flow continues in the same
        // command cycle once a valid response is entered.
        const ch = await ynFunction(
            'Die?',
            'yn',
            'n'.charCodeAt(0),
            game.display
        );
        if (ch === 'y'.charCodeAt(0) || ch === 'Y'.charCodeAt(0)) {
            await really_done(how, game);
            return;
        }
        await pline("OK, so you don't %s.", (how === CHOKING) ? 'choke' : 'die');
        savelife(how, game);
        if (Object.hasOwn(game, 'playerDied')) {
            game.playerDied = false;
        }
        killer.name = '';
        killer.format = KILLED_BY_AN;
        return;
    }

    if (survive) {
        if (Object.hasOwn(game, 'playerDied')) {
            game.playerDied = false;
        }
        killer.name = '';
        killer.format = KILLED_BY_AN;
        return;
    }

    // Really done — set game over state
    await really_done(how, game);
}

// ============================================================================
// really_done
// cf. end.c:1131
// In JS, this sets game state to game over. The actual tombstone/score
// rendering is handled by display.js and chargen.js.
// ============================================================================

async function maybeInstallPossessionsPrompt(how, game) {
    const player = (game.u || game.player);
    if (!player?.inventory?.length) return false;

    if (game.display) {
        if (typeof game.display.clearRow === 'function') game.display.clearRow(0);
        game.display.topMessage = null;
        if (Object.hasOwn(game.display, 'messageNeedsMore')) {
            game.display.messageNeedsMore = false;
        }
    }

    const diedByQuit = (how === QUIT);
    const prompt = diedByQuit
        ? 'Do you want to see what you had when you quit? [ynq] (n)'
        : 'Do you want your possessions identified? [ynq] (n)';
    await pline(prompt);

    game.pendingPrompt = {
        type: 'death_possessions_identify',
        onKey: async (chCode, gameCtx) => {
            const ch = String.fromCharCode(chCode || 0).toLowerCase();
            if (ch === 'y') {
                // TODO(c-faithful): display full inventory + container contents.
            } else if (ch === 'q') {
                gameCtx.done_stopprint = (gameCtx.done_stopprint || 0) + 1;
            }
            gameCtx.pendingPrompt = null;
            if (gameCtx.display) {
                if (typeof gameCtx.display.clearRow === 'function') gameCtx.display.clearRow(0);
                gameCtx.display.topMessage = null;
                if (Object.hasOwn(gameCtx.display, 'messageNeedsMore')) {
                    gameCtx.display.messageNeedsMore = false;
                }
            }
            renderHeadlessEndWarnings(gameCtx);
            return {
                handled: true,
                moved: false,
                tookTime: false,
                terminalScreenOwned: true,
            };
        },
    };
    return true;
}

function renderHeadlessEndWarnings(game) {
    const display = game?.display;
    if (!display || display?.constructor?.name !== 'HeadlessDisplay') return;
    if (typeof display.clearScreen !== 'function' || typeof display.putstr !== 'function') return;

    display.clearScreen();
    if (game.wizard) {
        // C emits the wizard-score notice after endgame scoring paths; logfile
        // warnings are harness/environment dependent and should not be forced.
        display.putstr(0, 2, 'Since you were in wizard mode, the score list will not be checked.');
    }
}

// cf. end.c:1131 [static] — really_done(how): final game termination
async function really_done(how, game) {
    const player = (game.u || game.player);

    // Build death description for display
    player.deathCause = formatkiller(how);

    // Set the game-over flags
    game.gameOver = true;
    game.gameOverReason = deaths[how] || 'died';

    const installedPrompt = await maybeInstallPossessionsPrompt(how, game);
    if (!installedPrompt && game.display) {
        if (typeof game.display.clearRow === 'function') game.display.clearRow(0);
        game.display.topMessage = null;
        if (Object.hasOwn(game.display, 'messageNeedsMore')) {
            game.display.messageNeedsMore = false;
        }
        if (Object.hasOwn(game.display, 'moreMarkerActive')) {
            game.display.moreMarkerActive = false;
        }
    }
}

// ============================================================================
// formatkiller
// cf. end.c — builds "killed by a/an X" or "killed by X" string
// ============================================================================

export function formatkiller(how) {
    if (!killer.name) return deaths[how] || 'died';

    let prefix;
    switch (killer.format) {
    case NO_KILLER_PREFIX:
        prefix = '';
        break;
    case KILLED_BY:
        prefix = 'killed by ';
        break;
    case KILLED_BY_AN:
    default:
        // Add "a" or "an" article
        prefix = 'killed by ';
        const name = killer.name;
        if (name) {
            const firstChar = name[0].toLowerCase();
            if ('aeiou'.includes(firstChar))
                prefix += 'an ';
            else
                prefix += 'a ';
        }
        break;
    }
    return prefix + killer.name;
}

// ============================================================================
// panic
// cf. end.c:396
// ============================================================================

// cf. end.c:396 — panic(str): panic error handler
export function panic(str, ...args) {
    let msg = str;
    if (args.length > 0) {
        // Simple printf-style formatting
        let i = 0;
        msg = str.replace(/%[sd]/g, () => {
            return i < args.length ? String(args[i++]) : '';
        });
    }
    console.error('NETHACK PANIC:', msg);
    console.trace();
    // In C this calls really_done(PANICKED); in JS we throw
    throw new Error(`NetHack panic: ${msg}`);
}

// ============================================================================
// done_intr — interrupt signal handler
// cf. end.c:156
// In C this is a signal handler for SIGINT during end-of-game display.
// In the browser environment, signals don't exist. We track the
// "stop printing" flag on the game state to allow aborting end output.
// ============================================================================

// cf. end.c:156 [static] — done_intr(sig_unused): interrupt signal handler
// In the JS port, this just sets the stopprint flag.
export function done_intr(game) {
    if (game) {
        game.done_stopprint = (game.done_stopprint || 0) + 1;
    }
}

// ============================================================================
// done1 — SIGINT handler during play
// cf. end.c:70
// In C, this is called as a signal handler when SIGINT is received.
// In the browser environment, this is called when the user requests quit.
// ============================================================================

// cf. end.c:70 — done1(game): game interrupt handler
// If flags.ignintr is set, ignore the interrupt. Otherwise, call done2().
export async function done1(game) {
    if (game.flags && game.flags.ignintr) {
        // Ignore the interrupt; clear message window and return
        if (game.multi > 0) game.multi = 0;
        return;
    }
    await done2(game);
}

// ============================================================================
// done2 — #quit command handler
// cf. end.c:92
// The "#quit" command or keyboard interrupt handler.
// ============================================================================

// cf. end.c:92 — done2(game): #quit command handler
// In C this prompts "Really quit?" with paranoid_query. In the JS port,
// the UI layer handles confirmation before calling this.
export async function done2(game) {
    await done(QUIT, game);
}

// ============================================================================
// done_hangup — hangup signal handler
// cf. end.c:172
// In C this handles SIGHUP/connection loss. In the browser, this is
// called when the connection is lost or the tab is being closed.
// ============================================================================

// cf. end.c:172 [static] — done_hangup(game): hangup handler
export function done_hangup(game) {
    if (game) {
        game.done_hup = (game.done_hup || 0) + 1;
    }
    done_intr(game);
}

// ============================================================================
// should_query_disclose_option
// cf. end.c:479
// Checks player's disclosure preferences for a given category.
// Categories: 'i' (inventory), 'a' (attributes), 'v' (vanquished),
//             'g' (genocided), 'c' (conduct), 'o' (overview)
// ============================================================================

// Disclosure option constants (cf. hack.h)
const DISCLOSE_NO_WITHOUT_PROMPT       = 'n';
const DISCLOSE_YES_WITHOUT_PROMPT      = 'y';
const DISCLOSE_PROMPT_DEFAULT_YES      = '+';
const DISCLOSE_PROMPT_DEFAULT_NO       = '-';
const DISCLOSE_PROMPT_DEFAULT_SPECIAL  = '#';
const DISCLOSE_SPECIAL_WITHOUT_PROMPT  = 'a';

const disclosure_options = 'iavgco';

// cf. end.c:479 [static] — should_query_disclose_option(category, game):
// Returns { shouldQuery: boolean, defquery: char }
function should_query_disclose_option(category, game) {
    let defquery = 'n';
    const flags = game.flags || {};
    const end_disclose = flags.end_disclose || '';

    const idx = disclosure_options.indexOf(category);
    if (idx >= 0 && idx < end_disclose.length) {
        const disclose = end_disclose[idx];
        if (disclose === DISCLOSE_YES_WITHOUT_PROMPT) {
            return { shouldQuery: false, defquery: 'y' };
        } else if (disclose === DISCLOSE_SPECIAL_WITHOUT_PROMPT) {
            return { shouldQuery: false, defquery: 'a' };
        } else if (disclose === DISCLOSE_NO_WITHOUT_PROMPT) {
            return { shouldQuery: false, defquery: 'n' };
        } else if (disclose === DISCLOSE_PROMPT_DEFAULT_YES) {
            return { shouldQuery: true, defquery: 'y' };
        } else if (disclose === DISCLOSE_PROMPT_DEFAULT_SPECIAL) {
            return { shouldQuery: true, defquery: 'a' };
        } else {
            // DISCLOSE_PROMPT_DEFAULT_NO or anything else
            return { shouldQuery: true, defquery: 'n' };
        }
    }
    if (idx < 0) {
        impossible("should_query_disclose_option: bad category %s", category);
    }
    // Default: prompt with 'n' as default
    return { shouldQuery: true, defquery: 'n' };
}

// ============================================================================
// dump_plines — dump saved message history for dumplog
// cf. end.c:521
// In C, this writes the last DUMPLOG_MSG_COUNT messages to the dumplog.
// In the JS port, we collect them into the game's dumplog array.
// ============================================================================

// cf. end.c:521 [static] — dump_plines(game): dump message history
function dump_plines(game) {
    const dumplog = game.dumplog || [];
    const saved = game.saved_plines || [];
    if (saved.length === 0) return;

    dumplog.push("Latest messages:");
    for (const msg of saved) {
        if (msg) {
            dumplog.push(` ${msg}`);
        }
    }
    game.dumplog = dumplog;
}

// ============================================================================
// dump_everything — generate complete dumplog
// cf. end.c:544
// In C, this writes the full game state to a dumplog file.
// In the JS port, we collect it into game.dumplog for later retrieval.
// ============================================================================

// cf. end.c:544 [static] — dump_everything(how, when, game): dumplog generation
export function dump_everything(how, when, game) {
    const player = (game.u || game.player);
    const dumplog = game.dumplog || [];

    // Character name and basic info
    const roleName = (player.female && player.roleFemale)
        ? player.roleFemale : player.roleName || 'Adventurer';
    dumplog.push(`${player.name || 'unknown'}, ${player.alignment || ''} ${player.genderName || ''} ${player.raceName || ''} ${roleName}`);
    dumplog.push('');

    // Dump message history
    dump_plines(game);
    dumplog.push('');

    // Inventory
    if (player.inventory && player.inventory.length > 0) {
        dumplog.push("Inventory:");
        for (const obj of player.inventory) {
            const name = (typeof doname === 'function') ? doname(obj, player) : (obj.oname || 'item');
            dumplog.push(`  ${name}`);
            // Show container contents
            if ((Is_container(obj) || obj.otyp === STATUE) && obj.cobj && obj.cobj.length > 0) {
                dumplog.push(`  Contents of ${typeof xname === 'function' ? xname(obj) : 'container'}:`);
                for (const cobj of obj.cobj) {
                    const cname = (typeof doname === 'function') ? doname(cobj, player) : (cobj.name || 'item');
                    dumplog.push(`    ${cname}`);
                }
            }
        }
    }
    dumplog.push('');

    game.dumplog = dumplog;
}

// ============================================================================
// disclose — end-of-game disclosure prompts
// cf. end.c:621
// In C, this interactively prompts the player for what to disclose.
// In the JS port, we auto-disclose based on the player's disclosure
// preferences (since we can't block for user input in the same way).
// The disclosed information is collected into game.disclosure.
// ============================================================================

// cf. end.c:621 [static] — disclose(how, taken, game): end-of-game disclosure
function disclose(how, taken, game) {
    const player = (game.u || game.player);
    const disclosure = game.disclosure || {};

    // Inventory disclosure
    if (player.inventory && player.inventory.length > 0) {
        const { defquery } = should_query_disclose_option('i', game);
        if (defquery === 'y' || defquery === 'a') {
            disclosure.inventory = player.inventory.slice();
        }
    }

    // Attributes disclosure
    {
        const { defquery } = should_query_disclose_option('a', game);
        if (defquery === 'y' || defquery === 'a') {
            disclosure.attributes = true;
        }
    }

    // Vanquished monsters disclosure
    {
        const { defquery } = should_query_disclose_option('v', game);
        disclosure.vanquished = (defquery === 'y' || defquery === 'a');
    }

    // Genocided species disclosure
    {
        const { defquery } = should_query_disclose_option('g', game);
        disclosure.genocided = (defquery === 'y' || defquery === 'a');
    }

    // Conduct disclosure
    {
        const { defquery } = should_query_disclose_option('c', game);
        disclosure.conduct = (defquery === 'y' || defquery === 'a');
    }

    // Dungeon overview disclosure
    {
        const { defquery } = should_query_disclose_option('o', game);
        disclosure.overview = (defquery === 'y' || defquery === 'a');
    }

    game.disclosure = disclosure;
}

// ============================================================================
// get_valuables — collect amulets and gems for scoring
// cf. end.c:765
// Scans inventory (or container contents) for amulets and gems,
// tallying them into the provided amulets[] and gems[] arrays.
// Artifacts are skipped (they're scored separately).
// ============================================================================

// cf. end.c:765 [static] — get_valuables(list, amulets, gems): collect valuables
function get_valuables(list, amulets, gems) {
    if (!list) return;
    // In JS, list may be an array (inventory) or a linked list
    const items = Array.isArray(list) ? list : _toArray(list);
    for (const obj of items) {
        if ((Is_container(obj) || obj.otyp === STATUE) && obj.cobj) {
            // Recurse into container contents
            get_valuables(obj.cobj, amulets, gems);
        } else if (obj.oartifact) {
            continue; // skip artifacts
        } else if (obj.oclass === AMULET_CLASS) {
            const i = obj.otyp - FIRST_AMULET;
            if (i >= 0 && i < amulets.length) {
                if (!amulets[i].count) {
                    amulets[i].count = obj.quan || 1;
                    amulets[i].typ = obj.otyp;
                } else {
                    amulets[i].count += (obj.quan || 1);
                }
            }
        } else if (obj.oclass === GEM_CLASS && obj.otyp <= LAST_GLASS_GEM) {
            // Combine all glass gems into one slot (last+1)
            const i = Math.min(obj.otyp, LAST_REAL_GEM + 1) - FIRST_REAL_GEM;
            if (i >= 0 && i < gems.length) {
                if (!gems[i].count) {
                    gems[i].count = obj.quan || 1;
                    gems[i].typ = obj.otyp;
                } else {
                    gems[i].count += (obj.quan || 1);
                }
            }
        }
    }
}

// Helper: convert a linked list (obj.nobj) to an array
function _toArray(list) {
    const arr = [];
    for (let obj = list; obj; obj = obj.nobj) {
        arr.push(obj);
    }
    return arr;
}

// ============================================================================
// sort_valuables — sort collected valuables by count (descending)
// cf. end.c:800
// Simple insertion sort moving greater quantities to the front.
// ============================================================================

// cf. end.c:800 [static] — sort_valuables(list, size): sort by count
// Autotranslated from end.c:799
export function sort_valuables(list, size) {
  let i, j, ltmp;
  for (i = 1; i < size; i++) {
    if (list[i].count === 0) {
      continue;
    }
    ltmp = list[i];
    for (j = i; j > 0; --j) {
      if (list[j - 1].count >= ltmp.count) {
        break;
      }
      list[j] = list[j - 1];
    }
    list[j] = ltmp;
  }
  return;
}

// ============================================================================
// artifact_score — calculate and/or display artifact score contributions
// cf. end.c:909
// Called twice: once with counting=true to tally points into urexp,
// then with counting=false to display the list.
// ============================================================================

// cf. end.c:909 [static] — artifact_score(list, counting, lines, player):
// list: inventory array or linked list
// counting: if true, add points to player.urexp; if false, push display lines
// lines: array to push display strings into (when !counting)
// player: the player state
export function artifact_score(list, counting, lines, player) {
    const items = Array.isArray(list) ? list : _toArray(list);
    for (const otmp of items) {
        if (otmp.oartifact || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD
            || otmp.otyp === CANDELABRUM_OF_INVOCATION) {
            const value = arti_cost(otmp);
            const points = Math.floor(value * 5 / 2);
            if (counting) {
                player.urexp = nowrap_add(player.urexp || 0, points);
            } else {
                // Fully identify the object for display
                otmp.known = otmp.dknown = otmp.bknown = otmp.rknown = 1;
                const name = otmp.oartifact
                    ? artiname(otmp.oartifact)
                    : (objectData[otmp.otyp] ? objectData[otmp.otyp].oc_name : 'item');
                const cur = currency(value);
                lines.push(`${name} (worth ${value} ${cur} and ${points} points)`);
            }
        }
        // Recurse into containers
        if ((Is_container(otmp) || otmp.otyp === STATUE) && otmp.cobj) {
            artifact_score(otmp.cobj, counting, lines, player);
        }
    }
}

// cf. Long addition with overflow protection (C: nowrap_add)
function nowrap_add(a, b) {
    const result = (a || 0) + (b || 0);
    // Cap at Number.MAX_SAFE_INTEGER to prevent overflow
    if (result > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
    if (result < Number.MIN_SAFE_INTEGER) return Number.MIN_SAFE_INTEGER;
    return result;
}

// ============================================================================
// done_object_cleanup — pre-bones object cleanup
// cf. end.c:852
// Handles objects that may be in abnormal states at end of game:
// disposable items in use, thrown/kicked objects in limbo, ball & chain.
// ============================================================================

// cf. end.c:852 — done_object_cleanup(game): pre-bones object cleanup
export function done_object_cleanup(game) {
    const player = (game.u || game.player);
    if (!player) return;

    // C: inven_inuse(TRUE) — use up any active disposable item
    // In JS, clear any active-use tracking on inventory items
    if (player.inventory) {
        for (const obj of player.inventory) {
            if (obj.in_use) obj.in_use = false;
        }
    }

    // C: place thrown/kicked objects back on the map
    // In JS, if thrownobj or kickedobj are in limbo (where === 'free'),
    // place them at the hero's position
    const ox = player.x + (player.dx || 0);
    const oy = player.y + (player.dy || 0);
    const px = (isok(ox, oy) && (game.lev || game.map) && (game.lev || game.map).at(ox, oy)
                && (game.lev || game.map).at(ox, oy).accessible) ? ox : player.x;
    const py = (isok(ox, oy) && (game.lev || game.map) && (game.lev || game.map).at(ox, oy)
                && (game.lev || game.map).at(ox, oy).accessible) ? oy : player.y;

    if (game.thrownobj && game.thrownobj.where === OBJ_FREE) {
        game.thrownobj.x = px;
        game.thrownobj.y = py;
        game.thrownobj.where = OBJ_FLOOR;
        game.thrownobj = null;
    }
    if (game.kickedobj && game.kickedobj.where === OBJ_FREE) {
        game.kickedobj.x = px;
        game.kickedobj.y = py;
        game.kickedobj.where = OBJ_FLOOR;
        game.kickedobj = null;
    }
}

// ============================================================================
// fuzzer_savelife — fuzzer death prevention
// cf. end.c:947
// When the debug fuzzer is active, almost always keep the hero alive.
// In the JS port, the fuzzer is not used, so this always returns false.
// ============================================================================

// cf. end.c:947 [static] — fuzzer_savelife(how, game): fuzzer life-saving
function fuzzer_savelife(how, game) {
    // The JS port does not use the debug fuzzer.
    // In C, this would call savelife() and apply remedies.
    return false;
}

// ============================================================================
// container_contents — display contents of containers
// cf. end.c:1596
// Used for end-of-game disclosure and for ':' choice when looting.
// Recursively shows contents of all containers in the given list.
// ============================================================================

// cf. end.c:1596 — container_contents(list, identified, all_containers, reportempty, game):
// list: array of objects (inventory) or linked list
// identified: if true, fully identify all contents
// all_containers: if true, recurse into nested containers
// reportempty: if true, report empty containers
// game: game state for message output
export async function container_contents(list, identified, all_containers, reportempty, game) {
    const items = Array.isArray(list) ? list : _toArray(list);

    for (const box of items) {
        if (Is_container(box) || box.otyp === STATUE) {
            // Mark container as known
            box.cknown = 1;
            if (identified) box.lknown = 1;

            if (box.otyp === BAG_OF_TRICKS) {
                continue; // wrong type of container
            } else if (box.cobj && box.cobj.length > 0) {
                const boxName = (typeof xname === 'function') ? xname(box) : 'container';
                const lines = [];
                lines.push(`Contents of the ${boxName}:`);

                const contents = Array.isArray(box.cobj) ? box.cobj : _toArray(box.cobj);
                for (const obj of contents) {
                    if (identified) {
                        obj.known = obj.bknown = obj.dknown = obj.rknown = 1;
                        if (Is_container(obj) || obj.otyp === STATUE) {
                            obj.cknown = obj.lknown = 1;
                        }
                    }
                    const name = (typeof doname === 'function')
                        ? doname(obj, game && (game.u || game.player)) : (obj.oname || 'item');
                    lines.push(`  ${name}`);
                }

                // Output the container contents via pline
                for (const line of lines) {
                    await pline(line);
                }

                // Recurse into nested containers
                if (all_containers) {
                    await container_contents(box.cobj, identified, true, reportempty, game);
                }
            } else if (reportempty) {
                const boxName = (typeof xname === 'function') ? xname(box) : 'container';
                await pline("%s is empty.", boxName.charAt(0).toUpperCase() + boxName.slice(1));
            }
        }
        if (!all_containers) break;
    }
}

// ============================================================================
// nh_terminate — final game exit and cleanup
// cf. end.c:1676
// In C, this calls freedynamicdata(), dlb_cleanup(), and exit().
// In the JS port, this is a no-op / flag setter since the browser
// manages its own lifecycle.
// ============================================================================

// cf. end.c:1676 — nh_terminate(status, game): game exit
export function nh_terminate(status, game) {
    freedynamicdata();
    if (game) {
        game.program_state = game.program_state || {};
        game.program_state.in_moveloop = false;
        game.program_state.exiting = true;
    }
    // In the browser environment, we don't call process.exit().
    // The game loop will check game.program_state.exiting and stop.
}

// ============================================================================
// save_killers / restore_killers — serialization of delayed killers
// cf. end.c:1762, end.c:1782
// In the JS port, these serialize/deserialize the killer linked list
// to/from a plain array for JSON storage.
// ============================================================================

// cf. end.c:1762 — save_killers(): serialize delayed killers
export function save_killers() {
    const result = [];
    for (let kptr = killer.next; kptr; kptr = kptr.next) {
        result.push({
            id: kptr.id,
            format: kptr.format,
            name: kptr.name
        });
    }
    return {
        name: killer.name,
        format: killer.format,
        delayed: result
    };
}

// cf. end.c:1782 — restore_killers(data): deserialize delayed killers
export function restore_killers(data) {
    if (!data) return;
    killer.name = data.name || '';
    killer.format = data.format || KILLED_BY_AN;
    killer.next = null;

    // Rebuild the linked list from the saved array
    if (data.delayed && data.delayed.length > 0) {
        let prev = killer;
        for (const entry of data.delayed) {
            const k = {
                id: entry.id,
                format: entry.format,
                name: entry.name || '',
                next: null
            };
            prev.next = k;
            prev = k;
        }
    }
}

// ============================================================================
// NH_abort — stack trace and abort
// cf. end.c:1898
// In C, this attempts to generate a core dump / stack trace.
// In the JS port, this logs the error and throws.
// ============================================================================

// cf. end.c:1898 — NH_abort(why): stack trace and abort
export function NH_abort(why) {
    console.error('NH_abort:', why || 'unknown reason');
    console.trace();
    throw new Error(`NH_abort: ${why || 'unknown reason'}`);
}

// ============================================================================
// Export utility functions used internally but needed by other modules
// ============================================================================
export { nowrap_add, deaths, ends };
