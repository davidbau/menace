// allmain.js -- Main game loop: early_init, moveloop, newgame, welcome
// cf. allmain.c — early_init, moveloop_preamble, u_calc_moveamt, moveloop_core,
//                 maybe_do_tutorial, moveloop, regen_pw, regen_hp,
//                 stop_occupation, init_sound_disp_gamewindows, newgame,
//                 welcome, do_positionbar, interrupt_multi, argcheck,
//                 debug_fields, timet_to_seconds, timet_delta,
//                 dump_enums, dump_glyphids, harness_dump_checkpoint,
//                 json_write_escaped
//
// allmain.c is the main game orchestration module:
//   early_init(): startup before anything else (crash handlers, globals).
//   moveloop(): outer loop calling moveloop_core() repeatedly.
//   moveloop_core(): one full game turn — monster moves, hero regeneration,
//     occupation, autopickup, timeout processing.
//   newgame(): full new-game setup (role selection, dungeon gen, startup).
//   welcome(): display character description at game start or restore.

import { movemon, settrack, mon_regen } from './monmove.js';
import { savebones } from './bones.js';
import { setCurrentTurn, nh_timeout } from './timeout.js';
import { setOutputContext } from './pline.js';
import { setObjectMoves } from './mkobj.js';
import { runtimeDecideToShapeshift, makemon, setMakemonPlayerContext } from './makemon.js';
import { M2_WERE } from './monsters.js';
import { were_change } from './were.js';
import { allocateMonsterMovement } from './mon.js';
import { rn2, rnd, rn1, initRng, getRngState, setRngState, getRngCallCount, setRngCallCount,
         enableRngLog, getRngLog as readRngLog, pushRngLogEntry } from './rng.js';
import { NORMAL_SPEED, A_DEX, A_CON, ROOMOFFSET, SHOPBASE,
         COLNO, ROWNO, A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
         FEMALE, MALE, TERMINAL_COLS,
         RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC,
         SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER } from './config.js';
import { ageSpells } from './spell.js';
import { wipe_engr_at } from './engrave.js';
import { dosearch0 } from './detect.js';
import { maybe_finished_meal } from './eat.js';
import { exerper, exerchk } from './attrib_exercise.js';
import { rhack } from './cmd.js';
import { FOV, get_vision_full_recalc } from './vision.js';
import { monsterNearby, setDisplayContext, see_monsters, vision_recalc, mark_vision_dirty, flush_screen } from './monutil.js';
import { nomul, unmul, near_capacity } from './hack.js';
import { Player, roles, races } from './player.js';
import { mklev, setGameSeed, isBranchLevelToDnum } from './dungeon.js';
import { getArrivalPosition, changeLevel as changeLevelCore, deferred_goto } from './do.js';
import { loadSave, deleteSave, loadAutosave, scheduleAutosave, deleteAutosave,
         loadFlags, saveFlags, deserializeRng,
         restGameState, restLev, listSavedData, clearAllData } from './storage.js';
import { buildEntry, saveScore, loadScores, formatTopTenEntry, formatTopTenHeader } from './topten.js';
import { startRecording } from './keylog.js';
import { nhgetch, getCount, setInputRuntime, cmdq_clear, cmdq_add_int, cmdq_add_key,
         cmdq_copy, cmdq_peek, cmdq_restore, setCmdqInputMode,
         setCmdqRepeatRecordMode,
         CQ_CANNED, CQ_REPEAT, CMDQ_INT, CMDQ_KEY } from './input.js';
import { init_nhwindows, NHW_MENU, MENU_BEHAVE_STANDARD, PICK_ONE, ATR_NONE,
         create_nhwindow, destroy_nhwindow, start_menu, add_menu, end_menu, select_menu } from './windows.js';
import { CLR_GRAY } from './display.js';
import { initFirstLevel } from './u_init.js';
import { movebubbles } from './mkmaze.js';
import { initAnimation, configureAnimation, setAnimationMode } from './animation.js';
import { phase_of_the_moon, friday_13th } from './calendar.js';
import { change_luck } from './attrib.js';

// cf. allmain.c:169 — moveloop_core() monster movement + turn-end processing.
// Called after the hero's action took time.  Runs movemon() for monster turns,
// then moveloop_turnend() for once-per-turn effects.
// opts.skipMonsterMove: skip movemon (used by some test harnesses)
// C ref: vision_full_recalc checked at top of each loop iteration (vision.c)
// Autotranslated from allmain.c:169
export async function moveloop_core(game, opts = {}) {
    const player = (game.u || game.player);
    // C ref: at top of each moveloop iteration, vision_recalc(0) if vision_full_recalc set.
    // This catches topology changes from the player's action (door opens, dig, teleport, etc.)
    // so that monsters run with up-to-date FOV.
    if (game.fov && get_vision_full_recalc()) {
        setDisplayContext({ display: game.display, player, fov: game.fov, flags: game.flags, map: (game.lev || game.map) });
        vision_recalc();
    }
    if (!Number.isFinite(player.umovement)) {
        player.umovement = NORMAL_SPEED;
    }
    // C ref: allmain.c:197 — actual time passed.
    player.umovement -= NORMAL_SPEED;

    do {
        let monscanmove = false;
        if (!opts.skipMonsterMove) {
            do {
                monscanmove = await movemon((game.lev || game.map), player, game.display, game.fov, game);
                if (player.umovement >= NORMAL_SPEED)
                    break; /* it's now your turn */
            } while (monscanmove);
        }
        // C ref: mon.c movemon() does deferred_goto() on u.utotype.
        // JS keeps it here until mon.c-level transition plumbing is fully ported.
        if (player.utotype) {
            await deferred_goto(player, game);
            monscanmove = false;
        }
        if (!monscanmove && player.umovement < NORMAL_SPEED) {
            await moveloop_turnend(game);
        }
    } while (player.umovement < NORMAL_SPEED);

    // C ref: vision_full_recalc set during monster turns (digs, door breaks, etc.) —
    // fire vision_recalc now so the display is current before screen capture.
    if (game.fov && get_vision_full_recalc()) {
        setDisplayContext({ display: game.display, player, fov: game.fov, flags: game.flags, map: (game.lev || game.map) });
        vision_recalc();
    }

    // C ref: allmain.c end of moveloop_core — check for player death
    if (player.isDead || player.uhp <= 0) {
        if (!player.deathCause) {
            player.deathCause = 'died';
        }
        game.gameOver = true;
        game.gameOverReason = 'killed';
        if (typeof savebones === 'function') {
            savebones(game);
        }
    }
}

// cf. allmain.c:169 — moveloop_core() turn-end block
// Unified from processTurnEnd (nethack.js) and simulateTurnEnd (headless_runtime.js).
// Called once per real turn, after hero and monsters have moved.
// game must provide: player, map, display, fov, multi, turnCount, seerTurn,
//                    flags, travelPath, runMode
export async function moveloop_turnend(game) {
    // C ref: allmain.c:239 — settrack() called after movemon, before moves++
    settrack((game.u || game.player));
    game.turnCount++;
    (game.u || game.player).turns = game.turnCount;
    setCurrentTurn(game.turnCount);
    setOutputContext(game.display);
    await nh_timeout({
        player: (game.u || game.player),
        map: (game.lev || game.map),
        display: game.display,
    });
    // C ref: allmain.c -- random spawn happens before svm.moves++.
    // During this turn-end frame, mkobj-side erosion checks should
    // still observe the pre-increment move count.
    setObjectMoves(game.turnCount);

    // Minimal C-faithful wounded-legs timer (set_wounded_legs): while active,
    // DEX stays penalized; recover when timeout expires.
    if (((game.u || game.player).woundedLegsTimeout || 0) > 0) {
        (game.u || game.player).woundedLegsTimeout--;
        if ((game.u || game.player).woundedLegsTimeout <= 0 && (game.u || game.player).attributes) {
            (game.u || game.player).woundedLegsTimeout = 0;
            (game.u || game.player).attributes[A_DEX] = Math.min(25, (game.u || game.player).attributes[A_DEX] + 1);
            (game.u || game.player).justHealedLegs = true;
        }
    }
    // C ref: allmain.c repeat loop behavior for repeated searching.
    // When wounded legs heal during repeated search, interrupt the repeat.
    if ((game.u || game.player).justHealedLegs
        && game.multi > 0
        && game.cmdKey === 's'.charCodeAt(0)) {
        (game.u || game.player).justHealedLegs = false;
        game.multi = 0;
        await game.display.putstr_message('Your leg feels better.');
    }

    // C ref: mon.c m_calcdistress() — temporary flee timeout handling.
    for (const mon of (game.lev || game.map).monsters) {
        if (mon.dead) continue;
        if (mon.fleetim && mon.fleetim > 0) {
            mon.fleetim--;
            if (mon.fleetim <= 0) {
                mon.fleetim = 0;
                mon.flee = false;
            }
        }
    }

    // C ref: mon.c m_calcdistress() — HP regen + mspec_used decrement, once per game turn.
    for (const mon of (game.lev || game.map).monsters) {
        if (mon.dead) continue;
        mon_regen(mon, false, game.turnCount);
    }

    // C ref: mon.c m_calcdistress() shapechange + lycanthropy pass.
    for (const mon of (game.lev || game.map).monsters) {
        if (mon.dead) continue;
        runtimeDecideToShapeshift(mon, (game.u || game.player).dungeonLevel,
            (game.lev || game.map), (game.u || game.player), game.fov);
        if (mon.type && (mon.type.flags2 & M2_WERE)) {
            were_change(mon, {
                player: (game.u || game.player),
                map: (game.lev || game.map),
                fov: game.fov,
                display: game.display,
            });
        }
    }

    // C ref: allmain.c:226-227 — reallocate movement to monsters via mcalcmove
    await allocateMonsterMovement((game.lev || game.map));

    // C ref: allmain.c:232-236 — occasionally spawn a new monster.
    // New monster spawns after movement allocation and therefore loses its first turn.
    const levFlags = (game.lev || game.map)?.flags || {};
    const randomMonstersAllowed = !levFlags.nomongen;
    if (!rn2(70) && randomMonstersAllowed && !levFlags.is_tutorial) {
        setMakemonPlayerContext((game.u || game.player));
        makemon(null, 0, 0, 0, (game.u || game.player).dungeonLevel, (game.lev || game.map));
    }

    // C ref: allmain.c:238 u_calc_moveamt(wtcap)
    u_calc_moveamt((game.u || game.player));

    // C ref: allmain.c:295-301 — regen_hp(mvl_wtcap)
    await regen_hp(game);

    // C ref: allmain.c:341-343 — autosearch for players with Searching
    // intrinsic (Archeologists/Rangers at level 1, Rogues at 10, etc.)
    if ((game.u || game.player).searching && game.multi >= 0) {
        await dosearch0((game.u || game.player), (game.lev || game.map), game.display, game);
    }

    // C ref: allmain.c:351 dosounds() — ambient sounds
    await moveloop_dosounds(game);

    // C ref: allmain.c:374 — water/air planes update moving bubbles/clouds each turn.
    if ((game.lev || game.map)?.flags?.is_waterlevel || (game.lev || game.map)?.flags?.is_airlevel) {
        if ((game.lev || game.map)?._water && (game.u || game.player)) {
            (game.lev || game.map)._water.heroPos = {
                x: (game.u || game.player).x,
                y: (game.u || game.player).y,
                dx: (game.u || game.player).dx || 0,
                dy: (game.u || game.player).dy || 0,
            };
            (game.lev || game.map)._water.onHeroMoved = (x, y) => {
                (game.u || game.player).x = x;
                (game.u || game.player).y = y;
                mark_vision_dirty(); // player position changed
            };
            (game.lev || game.map)._water.onVisionRecalc = () => {
                setDisplayContext({ display: game.display, player: (game.u || game.player), fov: game.fov, flags: game.flags, map: (game.lev || game.map) });
                vision_recalc();
            };
        }
        await movebubbles((game.lev || game.map));
    }

    // C ref: allmain.c:353 gethungry()
    // eat.c:3186 — rn2(20) for accessory hunger timing
    rn2(20);
    (game.u || game.player).hunger--;
    if ((game.u || game.player).hunger <= 0) {
        await game.display.putstr_message('You faint from lack of food.');
        (game.u || game.player).hunger = 1;
        (game.u || game.player).hp -= rnd(3);
        if ((game.u || game.player).hp <= 0) {
            (game.u || game.player).deathCause = 'starvation';
        }
    }
    if ((game.u || game.player).hunger === 150) {
        await game.display.putstr_message('You are beginning to feel weak.');
    }
    if ((game.u || game.player).hunger === 300) {
        await game.display.putstr_message('You are beginning to feel hungry.');
    }

    // C ref: allmain.c:354 age_spells() — decrement spell retention each turn
    ageSpells((game.u || game.player));

    // C ref: attrib.c exerper() — periodic exercise updates.
    // C's svm.moves starts at 1 and increments before exerper/exerchk.
    const moves = game.turnCount + 1;
    await exerper((game.u || game.player), moves);

    // C ref: attrib.c exerchk()
    await exerchk((game.u || game.player), moves);

    // C ref: allmain.c:359 — engrave wipe check
    const dex = (game.u || game.player).attributes ? (game.u || game.player).attributes[A_DEX] : 14;
    if (!rn2(40 + dex * 3)) {
        // C ref: allmain.c:359-360 u_wipe_engr(rnd(3))
        await wipe_engr_at((game.lev || game.map), (game.u || game.player).x, (game.u || game.player).y, rnd(3), false);
    }

    // C ref: allmain.c:414 seer_turn check
    // C's svm.moves is +1 ahead of turnCount (same offset as exerchk)
    if (moves >= game.seerTurn) {
        game.seerTurn = moves + rn1(31, 15);
    }
    // C ref: allmain.c:385-393 — immobile turn countdown and unmul().
    if (game.multi < 0) {
        if (++game.multi === 0) {
            await unmul(null, (game.u || game.player), game.display, game);
            if ((game.u || game.player)?.utotype) {
                await deferred_goto((game.u || game.player), game);
            }
        }
    }
    // After turn-end completes, subsequent command processing observes
    // the incremented move counter.
    setObjectMoves(game.turnCount + 1);
}

// C ref: allmain.c:680 stop_occupation()
export async function stop_occupation(game) {
    if (!game) return;
    const occ = game.occupation;
    if (occ && typeof occ.fn === 'function') {
        const finishedMeal = !!await maybe_finished_meal(game, true);
        if (!finishedMeal) {
            const occtxt = occ.occtxt || occ.txt;
            if (typeof occtxt === 'string' && occtxt.length > 0) {
                game.display?.putstr_message?.(`You stop ${occtxt}.`);
            }
        }
        game.occupation = null;
        game.pendingPrompt = null;
        nomul(0, game);
    } else if (Number.isInteger(game.multi) && game.multi >= 0) {
        nomul(0, game);
    }
    // C ref: cmdq_clear(CQ_CANNED) — clear queued synthetic/user-ahead
    // keystrokes in the active input runtime, then reset count prefix.
    cmdq_clear(CQ_CANNED);
    game.commandCount = 0;
}

// C ref: allmain.c:116 [static] — u_calc_moveamt(wtcap): hero movement amount.
// JS approximation: no steed movement penalty.
function u_calc_moveamt(player) {
    let moveamt = player.speed || NORMAL_SPEED;
    if (player.veryFast) {
        if (typeof process !== 'undefined'
            && process?.env?.WEBHACK_RUN_DEBUG
            && process.env.WEBHACK_RUN_DEBUG !== '0') {
            const e = player.uprops[28];
            const rngIdx = readRngLog().length;
            process.stderr.write(`DBG u_calc_moveamt veryFast turns=${player.turns} rngIdx=${rngIdx} intr=${e?.intrinsic} extr=${e?.extrinsic}\n`);
        }
    }
    if (player.veryFast) {
        if (rn2(3) !== 0) moveamt += NORMAL_SPEED;
    } else if (player.fast) {
        if (rn2(3) === 0) moveamt += NORMAL_SPEED;
    }
    // C ref: allmain.c:138-156 — encumbrance penalty reduces movement amount
    const wtcap = near_capacity(player);
    if (wtcap === SLT_ENCUMBER) {
        moveamt -= Math.floor(moveamt / 4);
    } else if (wtcap === MOD_ENCUMBER) {
        moveamt -= Math.floor(moveamt / 2);
    } else if (wtcap === HVY_ENCUMBER) {
        moveamt -= Math.floor((moveamt * 3) / 4);
    } else if (wtcap === EXT_ENCUMBER) {
        moveamt -= Math.floor((moveamt * 7) / 8);
    }
    player.umovement = Math.max(0, (player.umovement || 0) + moveamt);
}

// C ref: sounds.c:202-339 dosounds() — ambient level sounds
// Each feature check uses short-circuit && so rn2() is only called
// when the feature exists. Fountains/sinks don't return early;
// all others return on a triggered sound.
export async function moveloop_dosounds(game) {
    if (game.flags && game.flags.acoustics === false) return;
    const hallu = (game.u || game.player)?.hallucinating ? 1 : 0;
    const playerInShop = (() => {
        const loc = (game.lev || game.map)?.at?.((game.u || game.player).x, (game.u || game.player).y);
        if (!loc || !Number.isFinite(loc.roomno)) return false;
        const ridx = loc.roomno - ROOMOFFSET;
        const room = (game.lev || game.map)?.rooms?.[ridx];
        return !!(room && Number.isFinite(room.rtype) && room.rtype >= SHOPBASE);
    })();
    const tendedShop = ((game.lev || game.map)?.monsters || []).some((m) => m && !m.dead && m.isshk);
    const f = (game.lev || game.map).flags || {};
    if (f.nfountains && !rn2(400)) {
        const fountainMsg = [
            'You hear bubbling water.',
            'You hear water falling on coins.',
            'You hear the splashing of a naiad.',
            'You hear a soda fountain!',
        ];
        await game.display.putstr_message(fountainMsg[rn2(3) + hallu]);
    }
    if (f.nsinks && !rn2(300)) {
        const sinkMsg = [
            'You hear a slow drip.',
            'You hear a gurgling noise.',
            'You hear dishes being washed!',
        ];
        await game.display.putstr_message(sinkMsg[rn2(2) + hallu]);
    }
    if (f.has_court && !rn2(200)) { return; }
    if (f.has_swamp && !rn2(200)) {
        const swampMsg = [
            'You hear mosquitoes!',
            'You smell marsh gas!',
            'You hear Donald Duck!',
        ];
        await game.display.putstr_message(swampMsg[rn2(2) + hallu]);
        return;
    }
    if (f.has_vault && !rn2(200)) {
        const vaultMsg = [
            'You hear the footsteps of a guard on patrol.',
            'You hear someone counting gold coins.',
            'You hear Ebenezer Scrooge!',
        ];
        await game.display.putstr_message(vaultMsg[rn2(2) + hallu]);
        return;
    }
    if (f.has_beehive && !rn2(200)) { return; }
    if (f.has_morgue && !rn2(200)) { return; }
    if (f.has_barracks && !rn2(200)) {
        const barracksMsg = [
            'You hear blades being honed.',
            'You hear loud snoring.',
            'You hear dice being thrown.',
            'You hear General MacArthur!',
        ];
        await game.display.putstr_message(barracksMsg[rn2(3) + hallu]);
        return;
    }
    if (f.has_zoo && !rn2(200)) { return; }
    if (f.has_shop && !rn2(200)) {
        if (tendedShop && !playerInShop) {
            const shopMsg = [
                'You hear someone cursing shoplifters.',
                'You hear the chime of a cash register.',
                'You hear Neiman and Marcus arguing!',
            ];
            await game.display.putstr_message(shopMsg[rn2(2) + hallu]);
        }
        return;
    }
    if (f.has_temple && !rn2(200)) { return; }
}

// cf. allmain.c moveloop() — shared post-input command orchestration.
// Executes a single command (rhack), then drains any occupation it creates,
// then handles multi-repeat (counted commands like "20s").
// Used by nethack.js (browser), headless_runtime.js (tests/selfplay), and
// replay_core.js (session comparison) so that all three drive the same
// orchestration logic.
//
// opts.countPrefix:      digit count (e.g. 20 for "20s")
// opts.onTimedTurn:      hook called after each moveloop_core
// opts.onBeforeRepeat:   hook called before each multi-repeat iteration
// opts.skipMonsterMove:  passed through to moveloop_core
// opts.skipTurnEnd:      skip all post-rhack processing (moveloop, occ, multi)
export async function run_command(game, ch, opts = {}) {
    const {
        countPrefix = 0,
        onTimedTurn,
        onBeforeRepeat,
        skipMonsterMove,
        skipTurnEnd = false,
        skipRepeatRecord = false,
    } = opts;

    const chCode = typeof ch === 'number' ? ch
        : (typeof ch === 'string' && ch.length > 0) ? ch.charCodeAt(0) : 0;

    // C ref: readchar() / flush_screen — if --More-- is pending on the
    // topline, this key dismisses it rather than being processed as a
    // command.  This handles --More-- for turns where nhgetch is not
    // called (normal combat/movement turns without prompts).
    if (game.display && game.display._pendingMore) {
        game.display._clearMore();
        return { tookTime: false };
    }

    // C ref: tty_display_nhwindow(WIN_MESSAGE, FALSE) — at the start of
    // each command cycle, C clears the previous turn's topline message.
    // The old message text is "remembered" (pushed to history) and the
    // message area is marked empty, so the next screen capture shows a
    // clean topline unless a new pline() fires during this command.
    // Exception: digit count-prefix keys ('1'-'9', and '0' extending an
    // existing count) do NOT clear the topline — C only clears the message
    // window after the final command key is read (parse():4914).
    const _isCountDigit = (chCode >= 49 && chCode <= 57)
        || (chCode === 48 && game.countAccum != null);
    if (!_isCountDigit && game.display && game.display.topMessage && !game.display._pendingMore) {
        game.display.clearRow(0);
        game.display.topMessage = null;
        game.display.messageNeedsMore = false;
    }

    if (game?._tempNoConcatMessages
        && game.display
        && Object.hasOwn(game.display, 'noConcatenateMessages')) {
        game.display.noConcatenateMessages = false;
        game._tempNoConcatMessages = false;
    }
    const isPrefixKey = chCode === 'm'.charCodeAt(0)
        || chCode === 'F'.charCodeAt(0)
        || chCode === 'G'.charCodeAt(0)
        || chCode === 'g'.charCodeAt(0);

    // Prompt handlers (e.g., eat.c "Continue eating? [yn]") consume input
    // without advancing time until a terminating answer is provided.
    if (game.pendingPrompt && typeof game.pendingPrompt.onKey === 'function') {
        const promptResult = game.pendingPrompt.onKey(chCode, game);
        if (promptResult && promptResult.handled) {
            if (game._pendingPromptTask) {
                await game._pendingPromptTask;
                game._pendingPromptTask = null;
            }
            if (!game.pendingPrompt && game._pendingTutorialStrip
                && typeof game._applyTutorialStrip === 'function') {
                game._applyTutorialStrip();
                game._pendingTutorialStrip = false;
            }
            return {
                tookTime: false,
                moved: false,
                prompt: true,
            };
        }
    }

    if (!skipRepeatRecord && !game.inDoAgain
        && chCode !== 0
        && chCode !== 1
        && chCode !== '#'.charCodeAt(0)) {
        if (!game._repeatPrefixChainActive) {
            cmdq_clear(CQ_REPEAT);
        }
        cmdq_add_key(CQ_REPEAT, chCode);
    }

    // Set multi from countPrefix, set cmdKey
    game.commandCount = countPrefix;
    if (countPrefix > 0) {
        game.multi = countPrefix - 1; // first execution is now
    } else {
        game.multi = 0;
    }
    game.cmdKey = chCode;

    const coreOpts = {};
    if (skipMonsterMove) coreOpts.skipMonsterMove = true;

    // Process one timed turn of world updates after a command consumed time.
    const advanceTimedTurn = async () => {
        await moveloop_core(game, coreOpts);
        // C ref: allmain.c:459-474 — "once-per-player-input" section.
        // After monsters move, update display at every monster position.
        see_monsters(game.map);
        if (onTimedTurn) {
            await onTimedTurn();
        }
    };

    // Set advanceRunTurn for running mode (G/g commands process monster
    // turns between each movement step rather than batching all movement).
    game.advanceRunTurn = async () => {
        await advanceTimedTurn();
    };

    // Execute command
    const enableRepeatCapture = !skipRepeatRecord && !game.inDoAgain && chCode !== '#'.charCodeAt(0);
    setCmdqInputMode(!!game.inDoAgain);
    setCmdqRepeatRecordMode(enableRepeatCapture);
    let result;
    try {
        result = await rhack(chCode, game);
    } finally {
        setCmdqInputMode(false);
        setCmdqRepeatRecordMode(false);
    }

    if (result && result.repeatRequest) {
        game.advanceRunTurn = null;
        return await execute_repeat_command(game, opts);
    }
    if (!skipRepeatRecord && !game.inDoAgain) {
        game._repeatPrefixChainActive = !!(result && !result.tookTime && isPrefixKey);
    }
    await maybe_deferred_goto_after_rhack(game, result, { skipTurnEnd });

    // Clear advanceRunTurn
    game.advanceRunTurn = null;

    // Post-rhack processing: moveloop_core, occupation, multi-repeat
    if (result && result.tookTime && !skipTurnEnd) {
        await advanceTimedTurn();
        if (typeof result.onAfterTurn === 'function') {
            await result.onAfterTurn(game);
        }

        // Drain any occupation created by the command
        await _drainOccupation(game, coreOpts, onTimedTurn);

        // Multi-repeat loop
        while (game.multi > 0) {
            if (onBeforeRepeat) {
                await onBeforeRepeat();
            }
            if (game.multi <= 0) break; // hook may have cleared multi

            game.multi--;
            game.advanceRunTurn = async () => {
                await advanceTimedTurn();
            };
            const repeated = await rhack(game.cmdKey, game);
            game.advanceRunTurn = null;

            if (!repeated || !repeated.tookTime) break;
            await advanceTimedTurn();
            if (typeof repeated.onAfterTurn === 'function') {
                await repeated.onAfterTurn(game);
            }

            // Drain occupation from repeated command
            await _drainOccupation(game, coreOpts, onTimedTurn);
        }
    }

    // C ref: bot() + curs_on_u() — update status line and cursor position
    // after all command processing.  In C, bot() runs at the end of each
    // moveloop turn, and curs_on_u() runs before waiting for the next key.
    const _player = game.u || game.player;
    if (game.display && _player) {
        if (typeof game.display.renderStatus === 'function') {
            game.display.renderStatus(_player);
        }
        // C ref: parse() / get_count() — while accumulating a count prefix that
        // has been displayed ("Count: N"), the cursor stays on the topline.
        // putstr_message() already positioned it there; skip cursorOnPlayer.
        if (typeof game.display.cursorOnPlayer === 'function' && !result?.isCountDigitWithDisplay) {
            game.display.cursorOnPlayer(_player);
        }
    }

    return result;
}

// C ref: cmd.c do_repeat() queue payload decode.
// Returns last repeatable command snapshot from CQ_REPEAT, or null.
export function get_repeat_command_snapshot() {
    const copy = cmdq_copy(CQ_REPEAT);
    if (!copy) return null;
    let cursor = copy;
    let countPrefix = 0;

    if (cursor.typ === CMDQ_INT) {
        countPrefix = Number.isFinite(cursor.intval) ? Math.max(0, cursor.intval | 0) : 0;
        cursor = cursor.next;
    }
    if (!cursor || cursor.typ !== CMDQ_KEY || !Number.isFinite(cursor.key)) {
        return null;
    }
    return { key: cursor.key | 0, countPrefix };
}

// C ref: cmd.c do_repeat() -- replay CQ_REPEAT command stream.
export async function execute_repeat_command(game, opts = {}) {
    if (game?.inDoAgain) return { moved: false, tookTime: false };
    if (!cmdq_peek(CQ_REPEAT)) {
        game?.display?.putstr_message?.('There is no command available to repeat.');
        return { moved: false, tookTime: false };
    }

    const repeatCopy = cmdq_copy(CQ_REPEAT);
    game.inDoAgain = true;
    try {
        return await run_command(game, 0, { ...opts, skipRepeatRecord: true });
    } finally {
        game.inDoAgain = false;
        cmdq_restore(CQ_REPEAT, repeatCopy);
    }
}

// C ref: allmain.c deferred_goto() immediately follows rhack() whenever
// u.utotype is set. In JS, timed commands defer this until after moveloop_core()
// so ordering stays after monster movement.
export async function maybe_deferred_goto_after_rhack(game, result, opts = {}) {
    const { skipTurnEnd = false } = opts;
    if (!game?.player?.utotype) return;
    if (!(result && result.tookTime) || skipTurnEnd) {
        await deferred_goto((game.u || game.player), game);
    }
}

// Internal helper: drain a multi-turn occupation until it completes or is
// interrupted by an adjacent hostile monster.
async function _drainOccupation(game, coreOpts, onTimedTurn) {
    while (game.occupation) {
        const occ = game.occupation;
        const cont = await occ.fn(game);
        const finishedOcc = !cont ? occ : null;

        if (cont === 'prompt') {
            // Occupation has paused on an in-band prompt and will resume or
            // abort when that prompt consumes subsequent input.
        } else if (!cont) {
            // C ref: natural occupation completion clears silently.
            game.occupation = null;
            game.pendingPrompt = null;
        }

        // C ref: allmain.c:510 — monster_nearby() check BEFORE movemon.
        // After timed_occupation executes the occupation fn, C checks if a
        // hostile monster is now adjacent. If so, stop_occupation() is
        // called BEFORE monster turns, producing messages like
        // "You stop searching." before "The fox bites!"
        if (game.occupation && monsterNearby(
                (game.lev || game.map), (game.u || game.player), game.fov)) {
            await stop_occupation(game);
        }

        // Occupation step took time — process monster moves + turn-end
        await moveloop_core(game, coreOpts);
        if (onTimedTurn) await onTimedTurn();

        if (finishedOcc && typeof finishedOcc.onFinishAfterTurn === 'function') {
            finishedOcc.onFinishAfterTurn(game);
        }
        if (cont === 'prompt') break;
    }
}

// --- Remaining allmain.c stubs ---

// cf. allmain.c:155 [static] — json_write_escaped(fp, s): JSON-escape a string
// N/A: allmain.c:155 — json_write_escaped() (no file I/O in JS)

// cf. allmain.c:175 — harness_dump_checkpoint(phase): dump game state snapshot
// N/A: allmain.c:175 — harness_dump_checkpoint() (file I/O; JS harness uses oracle/)

// cf. allmain.c:36 — early_init(argc, argv): pre-game initialization
// TODO: allmain.c:36 — early_init(): pre-game initialization

// cf. allmain.c:50 [static] — moveloop_preamble(resuming): pre-loop setup
// TODO: allmain.c:50 — moveloop_preamble(): pre-loop setup

// cf. allmain.c:566 [static] — maybe_do_tutorial(void): tutorial prompt
// TODO: allmain.c:566 — maybe_do_tutorial(): tutorial entry prompt

// cf. allmain.c:586 — moveloop(resuming): main game loop
// TODO: allmain.c:586 — moveloop(): main game loop

// cf. allmain.c:599 [static] — regen_pw(wtcap): power point regeneration
// TODO: allmain.c:599 — regen_pw(): power regeneration

// cf. allmain.c:621 [static] — regen_hp(wtcap): hit point regeneration
// Ported from C's regen_hp() (allmain.c:623-681).
// Simplified: no polymorph HP (u.mh), no eel-out-of-water.
// U_CAN_REGEN: Regeneration intrinsic or Sleepy+asleep.
// GAP: Missing encumbrance gate. C checks:
//   encumbrance_ok = (wtcap < MOD_ENCUMBER || !u.umoved);
//   if (u.uhp < u.uhpmax && (encumbrance_ok || U_CAN_REGEN())) ...
// JS doesn't track wtcap or umoved, so we skip the gate.
// This causes rn2(100) to be consumed when C would skip it in overencumbered+moved cases.
async function regen_hp(game) {
    const player = (game.u || game.player);
    // C ref: allmain.c:656-660 — non-polymorph branch, encumbrance-gated
    if (player.uhp < player.uhpmax) {
        const con = player.attributes ? player.attributes[A_CON] : 10;
        // C ref: allmain.c:661 — heal = (ulevel + ACURR(A_CON)) > rn2(100)
        let heal = (player.ulevel + con) > rn2(100) ? 1 : 0;
        // C ref: allmain.c:663 — U_CAN_REGEN bonus: +1 heal
        if (player.regeneration) {
            heal += 1;
        }
        // C ref: allmain.c:665 — Sleepy+asleep bonus: +1 heal
        // (not tracked in JS yet)
        if (heal) {
            player.uhp += heal;
            if (player.uhp > player.uhpmax)
                player.uhp = player.uhpmax;
            // C ref: allmain.c:670 — stop voluntary multi-turn activity if fully healed
            if (player.uhp === player.uhpmax) {
                // interrupt_multi("You are in full health.")
                if (game.multi > 0
                    && !game.travelPath?.length
                    && !((game.svc?.context?.run || game.context?.run || 0) > 0)) {
                    game.multi = 0;
                    if (game.flags?.verbose !== false) {
                        await game.display.putstr_message('You are in full health.');
                    }
                }
            }
        }
    }
}

// cf. allmain.c:697 — init_sound_disp_gamewindows(void): init display/sound
// TODO: allmain.c:697 — init_sound_disp_gamewindows(): display initialization

// cf. allmain.c:764 — newgame(void): new game initialization
// TODO: allmain.c:764 — newgame(): new game setup

// cf. allmain.c:851 — welcome(new_game): display welcome message
// TODO: allmain.c:851 — welcome(): welcome message display

// cf. allmain.c:907 [static] — do_positionbar(void): update position bar
// TODO: allmain.c:907 — do_positionbar(): position bar update

// cf. allmain.c:950 [static] — interrupt_multi(msg): interrupt multi-turn action
// TODO: allmain.c:950 — interrupt_multi(): multi-turn interrupt

// cf. allmain.c:1001 — argcheck(argc, argv, e_arg): process early CLI args
// N/A: allmain.c:1001 — argcheck() (no command-line args in browser)

// cf. allmain.c:1124 [static] — debug_fields(opts): parse debug options
// N/A: allmain.c:1124 — debug_fields() (no CLI args in browser)

// cf. allmain.c:1173 — timet_to_seconds(ttim): time_t to seconds
// N/A: allmain.c:1173 — timet_to_seconds() (JS uses Date.now())

// cf. allmain.c:1182 — timet_delta(etim, stim): time difference
// N/A: allmain.c:1182 — timet_delta() (JS uses Date arithmetic)

// cf. allmain.c:1259 [static] — dump_enums(void): dump enumeration constants
// N/A: allmain.c:1259 — dump_enums() (build-time tool)

// cf. allmain.c:1356 — dump_glyphids(void): dump glyph identifier constants
// N/A: allmain.c:1356 — dump_glyphids() (build-time tool)

// ============================================================================
// DEFAULT_GAME_FLAGS — minimal defaults for the headless path
// ============================================================================
const DEFAULT_GAME_FLAGS = {
    pickup: false,
    verbose: false,
    safe_wait: true,
};

async function renderToplineMorePrompt(display, msg) {
    const raw = String(msg || '');
    const text = raw.endsWith('--More--')
        ? raw.slice(0, Math.max(0, raw.length - '--More--'.length))
        : raw;
    if (typeof display.clearRow === 'function') display.clearRow(0);
    if ('messageNeedsMore' in display) display.messageNeedsMore = false;
    await display.putstr_message(text);
    if (typeof display.renderMoreMarker === 'function') {
        display.renderMoreMarker();
        return;
    }
    const moreStr = '--More--';
    const msgLen = text.length;
    const col = Math.min(msgLen, Math.max(0, display.cols - moreStr.length));
    await display.putstr(col, 0, moreStr, CLR_GRAY);
}

async function buildReplayTutorialPromptFlow(messages, enterAfterPromptCount, onEnterTutorial) {
    const prompts = Array.isArray(messages) ? messages.map((s) => String(s || '')).filter(Boolean) : [];
    let idx = 0;
    let entered = false;
    let awaitingFinalDismiss = false;
    let didPostEnterRender = false;
    const enterAt = Number.isInteger(enterAfterPromptCount)
        ? Math.max(0, Math.min(enterAfterPromptCount, prompts.length))
        : prompts.length;
    const handler = {
        isReplayStartupPrompt: true,
        onKey: async (_ch, g) => {
            if (awaitingFinalDismiss) {
                if (typeof g.display.clearRow === 'function') g.display.clearRow(0);
                if ('messageNeedsMore' in g.display) g.display.messageNeedsMore = false;
                g.pendingPrompt = null;
                awaitingFinalDismiss = false;
                return { handled: true };
            }
            if (idx < prompts.length) {
                if (entered && !didPostEnterRender && idx >= enterAt && typeof g.docrt === 'function') {
                    g.docrt();
                    didPostEnterRender = true;
                }
                await renderToplineMorePrompt(g.display, prompts[idx]);
                idx++;
                if (!entered && idx >= enterAt) {
                    g._pendingPromptTask = Promise.resolve(onEnterTutorial(g));
                    entered = true;
                }
                if (idx < prompts.length) {
                    g.pendingPrompt = handler;
                } else {
                    if (!entered) {
                        g._pendingPromptTask = Promise.resolve(onEnterTutorial(g));
                        entered = true;
                    }
                    awaitingFinalDismiss = true;
                    g.pendingPrompt = handler;
                }
                return { handled: true };
            }
            if (!entered) {
                g._pendingPromptTask = Promise.resolve(onEnterTutorial(g));
                entered = true;
            }
            if (typeof g.display.clearRow === 'function') g.display.clearRow(0);
            if ('messageNeedsMore' in g.display) g.display.messageNeedsMore = false;
            g.pendingPrompt = null;
            return { handled: true };
        },
    };
    return handler;
}

// ============================================================================
// NetHackGame — unified browser + headless game class
// cf. allmain.c early_init(), moveloop(), newgame()
// ============================================================================
export class NetHackGame {
    constructor(deps = {}) {
        this.deps = deps;
        this.lifecycle = deps.lifecycle || {};
        this.hooks = deps.hooks || {};
        this.fov = new FOV();
        this.svc = { context: {} };
        this.gd = {};
        this.gm = {};
        this.gn = {};
        this.flags = null; // set in init()
        this.levels = {};
        this.gameOver = false;
        this.gameOverReason = '';
        this.turnCount = 0;
        setObjectMoves(1); // C ref: svm.moves starts at 1
        this.wizard = false;
        this.seerTurn = 0;
        this.occupation = null;
        this.pendingPrompt = null;
        this.pendingDeferredTimedTurn = false;
        this.seed = 0;
        this.multi = 0;
        this.inDoAgain = false;
        this.commandCount = 0;
        this.cmdKey = 0;
        this.lastCommand = null;
        this._repeatPrefixChainActive = false;
        this._namePromptEcho = '';
        this._rngAccessors = { getRngState, setRngState, getRngCallCount, setRngCallCount };
        this.rfilter = {
            roles: new Array(roles.length).fill(false),
            races: new Array(races.length).fill(false),
            genders: new Array(2).fill(false),
            aligns: new Array(3).fill(false),
        };
        this.lastHP = undefined;
        this.dnum = undefined;
        this.dungeonAlignOverride = undefined;

        // Browser/headless path: player/map set up later in async init()
        this.player = new Player();
        this.map = null;
        this.display = deps.display || null;
        setOutputContext(this.display);
        // Canonical namespace aliases for state refactor campaign.
        Object.defineProperty(this, 'context', {
            configurable: true,
            enumerable: true,
            get: () => this.svc.context,
            set: (v) => { this.svc.context = v || {}; },
        });
        Object.defineProperty(this, 'u', {
            configurable: true,
            enumerable: true,
            get: () => this.player,
            set: (v) => { this.player = v; },
        });
        Object.defineProperty(this, 'lev', {
            configurable: true,
            enumerable: true,
            get: () => this.map,
            set: (v) => { this.map = v; },
        });
        // Legacy movement-prefix mirrors mapped onto canonical context fields.
        Object.defineProperty(this, 'runMode', {
            configurable: true,
            enumerable: true,
            get: () => {
                const run = Number(this.svc.context?.run || 0);
                if (run === 2) return 2;
                if (run === 3) return 3;
                return 0;
            },
            set: (v) => {
                const n = Number(v) || 0;
                const ctx = this.svc.context || (this.svc.context = {});
                if (n === 2) ctx.run = 2;
                else if (n === 1 || n === 3) ctx.run = 3;
                else ctx.run = 0;
            },
        });
        Object.defineProperty(this, 'traveling', {
            configurable: true,
            enumerable: true,
            get: () => !!this.svc.context?.travel,
            set: (v) => {
                const ctx = this.svc.context || (this.svc.context = {});
                ctx.travel = v ? 1 : 0;
            },
        });
        Object.defineProperty(this, 'forceFight', {
            configurable: true,
            enumerable: true,
            get: () => !!this.svc.context?.forcefight,
            set: (v) => {
                const ctx = this.svc.context || (this.svc.context = {});
                ctx.forcefight = v ? 1 : 0;
            },
        });
        Object.defineProperty(this, 'menuRequested', {
            configurable: true,
            enumerable: true,
            get: () => !!this.svc.context?.nopick,
            set: (v) => {
                const ctx = this.svc.context || (this.svc.context = {});
                ctx.nopick = v ? 1 : 0;
            },
        });
        // Initialize canonical movement-prefix context defaults directly.
        this.svc.context.nopick = 0;
        this.svc.context.forcefight = 0;
        this.svc.context.travel = 0;
        this.svc.context.run = 0;
        this.input = deps.input || null;
        if (this.display) {
            initAnimation(this.display, { mode: 'headless', skipDelays: true });
        }
    }

    // Emit lifecycle event
    async _runLifecycle(name, ...args) {
        const fn = this.lifecycle[name];
        if (typeof fn === 'function') {
            return await fn(...args);
        }
        return undefined;
    }

    // Emit hook events
    _emitRuntimeBindings() {
        if (typeof this.hooks.onRuntimeBindings === 'function') {
            this.hooks.onRuntimeBindings({
                game: this,
                flags: this.flags,
                display: this.display,
            });
        }
    }

    _emitGameplayStart() {
        if (typeof this.hooks.onGameplayStart === 'function') {
            this.hooks.onGameplayStart({ game: this });
        }
    }

    _emitGameOver() {
        if (typeof this.hooks.onGameOver === 'function') {
            this.hooks.onGameOver({ game: this, reason: this.gameOverReason });
        }
    }

    // Re-render game view (map + status). Called after a modal window closes.
    _rerenderGame() {
        if (!this.fov || !this.map || !this.display) return;
        this.fov.compute(this.map, this.player.x, this.player.y);
        this.display.renderMessageWindow();
        this.display.renderMap(this.map, this.player, this.fov, this.flags);
        this.display.renderStatus(this.player);
        this.display.cursorOnPlayer(this.player);
    }

    // Initialize a new game — browser chargen path
    // C ref: allmain.c early_init() + moveloop_preamble()
    async init(initOptions = {}) {
        const urlOpts = {
            wizard: false,
            reset: false,
            seed: null,
            ...initOptions,
        };
        this.wizard = urlOpts.wizard;

        if (!this.display) {
            throw new Error('NetHackGame requires deps.display');
        }

        const interactiveMode = typeof window !== 'undefined' && typeof document !== 'undefined';
        setAnimationMode(interactiveMode ? 'interactive' : 'headless');
        configureAnimation({
            skipDelays: !interactiveMode,
            // C harness parity: tmp_at_start/step/end are canonical events.
            trace: true,
            canSee: (x, y) => {
                if (!this.fov || typeof this.fov.canSee !== 'function') return true;
                return !!this.fov.canSee(x, y);
            },
            onDelayBoundary: (payload) => {
                // Keep replay boundary semantics aligned with existing session logs.
                pushRngLogEntry('>runmode_delay_output @ animation(tmp_at)');
                pushRngLogEntry('<runmode_delay_output #0-0 @ animation(tmp_at)');
                if (typeof this.hooks.onAnimationDelayBoundary === 'function') {
                    this.hooks.onAnimationDelayBoundary({ game: this, ...payload });
                }
            },
            onTrace: (trace) => {
                if (!trace || typeof trace.type !== 'string') return;
                const p = trace;
                if (trace.type === 'tmp_at_start') {
                    pushRngLogEntry(`^tmp_at_start[mode=${p.mode},glyph=${String(p.glyph)}]`);
                } else if (trace.type === 'tmp_at_step') {
                    pushRngLogEntry(`^tmp_at_step[${p.x},${p.y},${String(p.glyph)}]`);
                } else if (trace.type === 'tmp_at_end') {
                    pushRngLogEntry(`^tmp_at_end[flags=${String(p.flags)}]`);
                }
                if (typeof this.hooks.onAnimationTrace === 'function') {
                    this.hooks.onAnimationTrace({ game: this, trace });
                }
            },
        });
        initAnimation(this.display, {});

        if (this.deps.input) {
            setInputRuntime(this.deps.input);
            this.input = this.deps.input;
        } else if (typeof this.deps.initInput === 'function') {
            const maybeRuntime = this.deps.initInput();
            if (maybeRuntime && typeof maybeRuntime.nhgetch === 'function') {
                setInputRuntime(maybeRuntime);
                this.input = maybeRuntime;
            }
        }

        // Wire up nhwindow infrastructure
        init_nhwindows(this.display, nhgetch, () => this._rerenderGame());
        // Give the display access to nhgetch so putstr_message can block
        // on --More-- when message overflow occurs (C ref: topl.c more()).
        if (this.display && typeof this.display.setNhgetch === 'function') {
            this.display.setNhgetch(nhgetch);
        }

        // Dynamically import chargen functions from nethack.js to avoid circular deps
        const nethackChargen = await import('./chargen.js');
        const {
            handleReset: _handleReset, restoreFromSave: _restoreFromSave,
            playerSelection: _playerSelection, maybeDoTutorial: _maybeDoTutorial,
            enterTutorial: _enterTutorial,
        } = nethackChargen;

        // Handle ?reset=1 — prompt to delete all saved data
        if (urlOpts.reset) {
            await _handleReset(this);
        }

        // Load user flags (C ref: flags struct from flag.h)
        this.flags = loadFlags(urlOpts.flags || null);
        this._emitRuntimeBindings();

        // Check for saved game before RNG init.
        // Prefer manual save; fall back to autosave (crash recovery).
        const saveData = loadSave() || await loadAutosave();
        if (saveData) {
            const restored = await _restoreFromSave(this, saveData, urlOpts);
            if (restored) return;
            deleteSave();
            deleteAutosave();
        }

        // Initialize RNG with seed from URL or random
        const seed = urlOpts.seed !== null
            ? urlOpts.seed
            : Math.floor(Math.random() * 0xFFFFFFFF);
        this.seed = seed;
        initRng(seed);
        setGameSeed(seed);

        // Start keystroke recording for reproducibility
        startRecording(seed, this.flags);
        this._emitRuntimeBindings();

        // Show welcome message
        const wizStr = this.wizard ? ' [WIZARD MODE]' : '';
        const seedStr = urlOpts.seed !== null ? ` (seed:${seed})` : '';
        await this.display.putstr_message(`NetHack Royal Jelly -- Welcome to the Mazes of Menace!${wizStr}${seedStr}`);

        // Player selection
        if (urlOpts.character) {
            // Headless/replay path: set player fields directly (no chargen RNG)
            const char = urlOpts.character;
            let roleIndex = 11; // default Valkyrie
            if (Number.isInteger(char.roleIndex)) {
                roleIndex = char.roleIndex;
            } else if (typeof char.role === 'string') {
                const idx = roles.findIndex(r => r.name === char.role);
                if (idx >= 0) roleIndex = idx;
            }
            const role = roles[roleIndex] || roles[11];
            const roleRaces = Array.isArray(role?.validRaces) && role.validRaces.length
                ? role.validRaces.slice()
                : [RACE_HUMAN];

            let selectedRace = this.player.race;
            if (Number.isInteger(char.gender)) {
                this.player.gender = char.gender;
            } else if (typeof char.gender === 'string' && char.gender.toLowerCase() === 'female') {
                this.player.gender = FEMALE;
            }
            const raceMap = { human: RACE_HUMAN, elf: RACE_ELF, dwarf: RACE_DWARF, gnome: RACE_GNOME, orc: RACE_ORC };
            if (Number.isInteger(char.race)) {
                selectedRace = char.race;
            } else if (typeof char.race === 'string') {
                const r = raceMap[char.race.toLowerCase()];
                if (r !== undefined) selectedRace = r;
            }
            if (!roleRaces.includes(selectedRace)) {
                selectedRace = roleRaces[0];
            }

            this.player.initRole(roleIndex);
            this.player.name = char.name || 'Agent';
            this.player.race = selectedRace;

            // C ref: role.c rigid_role_checks() -- enforce forced gender.
            if (role?.forceGender === 'female') {
                this.player.gender = FEMALE;
            } else if (role?.forceGender === 'male') {
                this.player.gender = MALE;
            }

            const alignMap = { lawful: A_LAWFUL, neutral: A_NEUTRAL, chaotic: A_CHAOTIC };
            let selectedAlign = this.player.alignment;
            if (Number.isInteger(char.alignment)) {
                selectedAlign = char.alignment;
            } else if (typeof char.align === 'string') {
                const a = alignMap[char.align.toLowerCase()];
                if (a !== undefined) selectedAlign = a;
            }
            const raceAligns = Array.isArray(races[selectedRace]?.validAligns)
                ? races[selectedRace].validAligns
                : [];
            const validAligns = Array.isArray(role?.validAligns)
                ? role.validAligns.filter((a) => raceAligns.includes(a))
                : [];
            if (!validAligns.includes(selectedAlign)) {
                selectedAlign = validAligns[0] ?? role?.validAligns?.[0] ?? A_NEUTRAL;
            }
            this.player.alignment = selectedAlign;
            // C ref: role.c:1222 pick_align(PICK_RIGID) via rigid_role_checks()
            // For manual-direct-live sessions, the C recording includes a rn2(1) call that
            // fires when the gender menu is shown (if alignment is forced to a single choice).
            // Simulate it here so the flat RNG stream stays aligned.
            if (urlOpts.simulateManualDirectChargen?.hasPickAlign) {
                rn2(1);
            }
        } else if (this.wizard) {
            // Wizard mode: auto-select Valkyrie (index 11)
            this.player.initRole(11); // PM_VALKYRIE
            this.player.name = 'Wizard';
            this.player.race = RACE_HUMAN;
            this.player.gender = FEMALE;
            this.player.alignment = A_NEUTRAL;
        } else {
            await _playerSelection(this);
        }

        // C ref: allmain.c moveloop_preamble() — real-world side effects.
        this.flags.moonphase = phase_of_the_moon();
        if (this.flags.moonphase === 4) { // FULL_MOON
            if (!urlOpts.character) {
                await this.display.putstr_message('You are lucky!  Full moon tonight.');
            }
            change_luck(1, this.player);
        } else if (this.flags.moonphase === 0) { // NEW_MOON
            if (!urlOpts.character) {
                await this.display.putstr_message('Be careful!  New moon tonight.');
            }
        }
        this.flags.friday13 = friday_13th();
        if (this.flags.friday13) {
            if (!urlOpts.character) {
                await this.display.putstr_message('Watch out!  Bad things can happen on Friday the 13th.');
            }
            change_luck(-1, this.player);
        }

        // First-level init
        this.dnum = Number.isInteger(urlOpts.startDnum) ? urlOpts.startDnum : undefined;
        this.dungeonAlignOverride = Number.isInteger(urlOpts.dungeonAlignOverride)
            ? urlOpts.dungeonAlignOverride : undefined;
        const startDlevel = Number.isInteger(urlOpts.startDlevel) ? urlOpts.startDlevel : 1;
        const { map, initResult } = await initFirstLevel(this.player, this.player.roleIndex, this.wizard, {
            startDlevel,
            startDnum: this.dnum,
            dungeonAlignOverride: this.dungeonAlignOverride,
        });
        this.map = map;
        this.levels[startDlevel] = map;
        this.player.wizard = this.wizard;
        this.seerTurn = initResult.seerTurn;

        // For manual-direct-live session replays, the preamble (rnd(9000)+rnd(30)) is
        // already consumed by simulatePostLevelInit above. If the player chose the tutorial,
        // call enterTutorial to generate the tutorial level-gen RNG (folded into startup).
        // direct:true skips the "Entering the tutorial." message/morePrompt.
        if (urlOpts.simulateManualDirectChargen?.hasTutorial) {
            await _enterTutorial(this, { direct: true });
        }

        // Apply flags
        this.player.showExp = this.flags.showexp;
        this.player.showScore = this.flags.showscore;
        this.player.showTime = this.flags.time;

        // Initial display
        this.fov.compute(this.map, this.player.x, this.player.y);
        this.display.renderMap(this.map, this.player, this.fov, this.flags);
        this.display.renderStatus(this.player);
        this.display.cursorOnPlayer(this.player);

        if (this.flags.tutorial && urlOpts.character) {
            const replayStartupPrompts = Array.isArray(urlOpts.replayTutorialStartupPrompts)
                ? urlOpts.replayTutorialStartupPrompts.filter((s) => String(s || '').length > 0)
                : [];
            if (replayStartupPrompts.length > 0) {
                const replayEnterAfter = Number.isInteger(urlOpts.tutorialStartupEnterAfterPromptCount)
                    ? urlOpts.tutorialStartupEnterAfterPromptCount
                    : replayStartupPrompts.length;
                // Replay-only path: consume startup prompt-dismiss keys exactly as captured.
                this.pendingPrompt = await buildReplayTutorialPromptFlow(
                    replayStartupPrompts,
                    replayEnterAfter,
                    (game) => _enterTutorial(game, { direct: true, deferRender: true })
                );
            } else if (urlOpts.tutorialDirectStart === true) {
                // Explicit replay/headless override; not C default.
                await _enterTutorial(this, { direct: true });
            } else {
                // C-like default tutorial option flow shows "Entering the tutorial." + --More--.
                await _enterTutorial(this, { direct: false });
            }
        } else if (this.flags.tutorial) {
            await _maybeDoTutorial(this);
        }

        this._emitGameplayStart();
    }

    // Generate or retrieve a level
    // C ref: dungeon.c -- level management
    async changeLevel(depth, transitionDir = null, opts = {}) {
        // C ref: makemon.c byyou = (!in_mklev && x == u.ux && y == u.uy).
        // At level-gen time in C, u.ux/u.uy are 0,0 (player not yet placed),
        // so byyou is never true during fill_zoo. In JS the player still has
        // old-level coordinates, so we clear x/y here to prevent spurious
        // enexto_core calls when a zoo cell coincidentally matches.
        setMakemonPlayerContext({ ...this.player, x: null, y: null });
        const heroHasAmulet = !!(this.player?.uhave?.amulet);
        const targetDnum = Number.isInteger(opts?.targetDnum)
            ? opts.targetDnum
            : this.dnum;
        const makeLevel = Number.isInteger(targetDnum)
            ? async (d) => await mklev(d, targetDnum, d, {
                dungeonAlignOverride: this.dungeonAlignOverride,
                heroHasAmulet,
            })
            : undefined;

        flush_screen(-1);   // C ref: do.c:1720 — suppress flushes during level transition
        await changeLevelCore(this, depth, transitionDir, { ...opts, makeLevel });

        // Bones level message
        if (this.map.isBones) {
            await this.display.putstr_message('You get an eerie feeling...');
        }

        // Update display — C ref: do.c:1840 docrt() + do.c:1841 flush_screen(-1)
        this.docrt();
        flush_screen(-1);   // C ref: do.c:1841 — restore flush capability after docrt()
        flush_screen(1);    // C ref: cmd.c:1310 — update status + cursor
        await this.maybeShowQuestLocateHint(depth);
        if (typeof this.hooks.onLevelChange === 'function') {
            this.hooks.onLevelChange({ game: this, depth });
        }
    }

    async maybeShowQuestLocateHint(depth) {
        // C ref: the quest locate hint ("You couldn't quite make out that
        // last message.") is generated by on_locate() in quest.c, called
        // from check_special_room() when entering the quest locate level.
        // The previous implementation here incorrectly fired on main
        // dungeon level 14, generating spurious messages and rn2(3)+rn2(2)
        // RNG calls.  Disabled: proper quest messaging uses the quest
        // system, not this function.
    }

    placePlayerOnLevel(transitionDir = null) {
        const pos = getArrivalPosition(this.map, this.player.dungeonLevel, transitionDir);
        this.player.x = pos.x;
        this.player.y = pos.y;
    }

    // C ref: allmain.c interrupt_multi() — check if multi-command should be interrupted
    shouldInterruptMulti() {
        if ((this.context?.run || 0) > 0) return false;
        if (this.occupation) return this.shouldInterruptOccupation();
        if (monsterNearby(this.map, this.player, this.fov)) return true;
        if (this.lastHP !== undefined && this.player.uhp !== this.lastHP) {
            this.lastHP = this.player.uhp;
            return true;
        }
        this.lastHP = this.player.uhp;
        return false;
    }

    // C ref: do.c cmd_safety_prevention()
    shouldInterruptOccupation() {
        if ((this.context?.run || 0) > 0) return false;
        return monsterNearby(this.map, this.player, this.fov);
    }

    // Run the deferred timed turn postponed from a stop_occupation frame.
    async runPendingDeferredTimedTurn() {
        if (!this.pendingDeferredTimedTurn) return;
        this.pendingDeferredTimedTurn = false;
        await moveloop_core(this);
    }

    // C-parity naming for internal callers.
    async stop_occupation() {
        await stop_occupation(this);
    }

    // Compatibility alias for existing JS call sites.
    async stopOccupation() {
        await this.stop_occupation();
    }

    // Render current screen state
    docrt() {
        this.fov.compute(this.map, this.player.x, this.player.y);
        setDisplayContext({ display: this.display, player: this.player, fov: this.fov, flags: this.flags, map: this.map });
        this.display.renderMap(this.map, this.player, this.fov, this.flags);
        this.display.renderStatus(this.player);
        this.display.cursorOnPlayer(this.player);
    }

    _renderAll() {
        this.docrt();
    }

    // Return the COLNO×ROWNO terrain type grid
    getTypGrid() {
        const grid = [];
        for (let y = 0; y < ROWNO; y++) {
            const row = [];
            for (let x = 0; x < COLNO; x++) {
                const loc = this.map?.at?.(x, y);
                row.push(loc ? loc.typ : 0);
            }
            grid.push(row);
        }
        return grid;
    }

    getScreen() {
        return this.display.getScreenLines();
    }

    getAnsiScreen() {
        return this.getScreen().join('\n');
    }

    enableRngLogging(withTags = true) {
        enableRngLog(withTags);
    }

    getRngLog() {
        return [...(readRngLog() || [])];
    }

    clearRngLog() {
        const log = readRngLog();
        if (!log) return;
        log.length = 0;
        setRngCallCount(0);
    }

    checkpoint(phase = 'checkpoint') {
        return {
            phase,
            level: this.player?.dungeonLevel || 0,
            turn: this.turnCount,
            player: {
                x: this.player?.x ?? 0,
                y: this.player?.y ?? 0,
                hp: this.player?.hp ?? 0,
                hpmax: this.player?.hpmax ?? 0,
            },
            rng: this.getRngLog(),
            typGrid: this.getTypGrid(),
            screen: this.getScreen(),
        };
    }

    static isCountPrefixDigit(key) {
        const ch = typeof key === 'string' ? key.charCodeAt(0) : key;
        return ch >= 48 && ch <= 57;
    }

    static parseCountPrefixDigit(key) {
        const ch = typeof key === 'string' ? key.charCodeAt(0) : key;
        if (ch >= 48 && ch <= 57) return ch - 48;
        return null;
    }

    static accumulateCountPrefix(currentCount, key) {
        const digit = NetHackGame.parseCountPrefixDigit(key);
        if (digit !== null) {
            return {
                isDigit: true,
                newCount: Math.min(32767, (currentCount * 10) + digit),
            };
        }
        return { isDigit: false, newCount: currentCount };
    }

    async executeCommand(ch) {
        const code = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
        const result = await run_command(this, code);

        if (typeof this.hooks.onCommandResult === 'function') {
            this.hooks.onCommandResult({ game: this, keyCode: code, result });
        }
        if (result && result.tookTime && typeof this.hooks.onTurnAdvanced === 'function') {
            this.hooks.onTurnAdvanced({ game: this, keyCode: code, result });
        }

        this.fov.compute(this.map, this.player.x, this.player.y);
        this.display.renderMap(this.map, this.player, this.fov, this.flags);
        this.display.renderStatus(this.player);
        this.display.cursorOnPlayer(this.player);
        if (typeof this.hooks.onScreenRendered === 'function') {
            this.hooks.onScreenRendered({ game: this, keyCode: code });
        }

        if (this.player.uhp <= 0) {
            this.gameOver = true;
            this.gameOverReason = 'died';
        }

        return result;
    }

    async sendKey(key, replayContext = {}) {
        const raw = typeof key === 'string' ? key : String.fromCharCode(key);
        if (!raw) throw new Error('sendKey requires a non-empty key');
        for (let i = 1; i < raw.length; i++) {
            this.input.pushInput(raw.charCodeAt(i));
        }
        return this.executeReplayStep(raw[0], replayContext);
    }

    async sendKeys(keys, replayContext = {}) {
        const out = [];
        const seq = Array.isArray(keys) ? keys : String(keys || '').split('');
        for (const key of seq) {
            out.push(await this.sendKey(key, replayContext));
        }
        return out;
    }

    async replayStep(key, options = {}) {
        const result = await run_command(this, key, {
            countPrefix: (options.countPrefix && options.countPrefix > 0) ? options.countPrefix : 0,
            skipMonsterMove: options.skipMonsterMove,
            skipTurnEnd: !!options.skipTurnEnd,
            onBeforeRepeat: () => {
                if (typeof this.shouldInterruptMulti === 'function'
                    && this.shouldInterruptMulti()) {
                    this.multi = 0;
                }
            },
        });

        this.docrt();

        return {
            tookTime: result?.tookTime || false,
            moved: result?.moved || false,
            result,
            screen: this.getScreen(),
            typGrid: this.getTypGrid(),
        };
    }

    async executeReplayStep(key, replayContext = {}) {
        const raw = typeof key === 'string' ? key : String.fromCharCode(key);
        if (!raw) throw new Error('executeReplayStep requires a key');
        const beforeCount = readRngLog()?.length || 0;
        if (typeof this.hooks.onStepStart === 'function') {
            this.hooks.onStepStart({ game: this, key: raw, context: replayContext });
        }
        const result = await this.replayStep(raw, replayContext);
        if (typeof this.hooks.onCommandResult === 'function') {
            this.hooks.onCommandResult({ game: this, keyCode: raw.charCodeAt(0), result: result.result });
        }
        if (result.tookTime && typeof this.hooks.onTurnAdvanced === 'function') {
            this.hooks.onTurnAdvanced({ game: this, keyCode: raw.charCodeAt(0), result: result.result });
        }
        if (typeof this.hooks.onScreenRendered === 'function') {
            this.hooks.onScreenRendered({ game: this, keyCode: raw.charCodeAt(0) });
        }
        const fullLog = readRngLog() || [];
        const stepRng = fullLog.slice(beforeCount);
        if (typeof this.hooks.onReplayPrompt === 'function' && this.occupation) {
            this.hooks.onReplayPrompt({ game: this, key: raw, context: replayContext });
        }
        return {
            key: raw,
            result,
            rng: stepRng,
            typGrid: this.getTypGrid(),
            screen: this.getScreen(),
            level: this.player?.dungeonLevel || 0,
            turn: this.turnCount,
        };
    }

    async teleportToLevel(depth) {
        if (!this.player?.wizard) {
            return { ok: false, reason: 'wizard-disabled' };
        }
        if (!Number.isInteger(depth) || depth <= 0) {
            return { ok: false, reason: 'invalid-depth' };
        }
        await this.changeLevel(depth, 'teleport');
        this.docrt();
        if (typeof this.hooks.onLevelChange === 'function') {
            this.hooks.onLevelChange({ game: this, depth });
        }
        return { ok: true, depth };
    }

    revealMap() {
        if (!this.map) return;
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 0; x < COLNO; x++) {
                const loc = this.map.at(x, y);
                if (loc) {
                    loc.seenv = 0xFF;
                    loc.lit = true;
                }
            }
        }
        this.docrt();
    }

    // Show game-over screen (tombstone + score). Delegates to nethack.js showGameOver.
    // Also available as a standalone instance method for tests and external callers.
    async showGameOver() {
        const { showGameOver } = await import('./chargen.js');
        await showGameOver(this);
        this._emitGameOver();
    }

    // Main game loop — browser path
    // C ref: allmain.c moveloop() -> moveloop_core()
    async gameLoop() {
        while (!this.gameOver) {
            // Travel continuation
            if (this.travelPath && this.travelStep < this.travelPath.length) {
                const { dotravel_target } = await import('./hack.js');
                const result = await dotravel_target(this);
                if (result.tookTime) {
                    await moveloop_core(this);
                }
                this.fov.compute(this.map, this.player.x, this.player.y);
                this.display.renderMap(this.map, this.player, this.fov, this.flags);
                this.display.renderStatus(this.player);
                this.display.cursorOnPlayer(this.player);
                continue;
            }

            // Get player input with optional count prefix
            const firstCh = await nhgetch();
            let ch;
            let countPrefix = 0;

            // C ref: cmd.c:1687 do_repeat() — Ctrl+A repeats last command
            if (firstCh === 1) { // Ctrl+A
                await execute_repeat_command(this, {
                    onTimedTurn: async () => {
                        this.fov.compute(this.map, this.player.x, this.player.y);
                        this.display.renderMap(this.map, this.player, this.fov, this.flags);
                        this.display.renderStatus(this.player);
                        this.display.cursorOnPlayer(this.player);
                        await new Promise(r => setTimeout(r, 0));
                    },
                    onBeforeRepeat: async () => {
                        if (this.shouldInterruptMulti()) {
                            this.multi = 0;
                            await this.display.putstr_message('--More--');
                            await nhgetch();
                        }
                    },
                });
                this.fov.compute(this.map, this.player.x, this.player.y);
                this.display.renderMap(this.map, this.player, this.fov, this.flags);
                this.display.renderStatus(this.player);
                this.display.cursorOnPlayer(this.player);
                continue;
            } else if (firstCh >= 48 && firstCh <= 57) { // '0'-'9'
                const result = await getCount(firstCh, 32767, this.display);
                countPrefix = result.count;
                ch = result.key;
                if (ch === 27) { // ESC
                    this.display.clearRow(0);
                    continue;
                }
            } else {
                ch = firstCh;
            }

            if (!ch) continue;

            if (firstCh !== 1) {
                this.lastCommand = { key: ch, count: countPrefix };
            }

            await this.runPendingDeferredTimedTurn();

            await run_command(this, ch, {
                countPrefix,
                onTimedTurn: async () => {
                    this.fov.compute(this.map, this.player.x, this.player.y);
                    this.display.renderMap(this.map, this.player, this.fov, this.flags);
                    this.display.renderStatus(this.player);
                    this.display.cursorOnPlayer(this.player);
                    await new Promise(r => setTimeout(r, 0));
                },
                onBeforeRepeat: async () => {
                    if (this.shouldInterruptMulti()) {
                        this.multi = 0;
                        await this.display.putstr_message('--More--');
                        await nhgetch();
                    }
                },
            });

            this.fov.compute(this.map, this.player.x, this.player.y);
            this.display.renderMap(this.map, this.player, this.fov, this.flags);
            this.display.renderStatus(this.player);
            this.display.cursorOnPlayer(this.player);
            scheduleAutosave(this);   // fire-and-forget crash recovery save
        }

        // Game over — delete autosave synchronously before any await so a tab
        // close at the death screen cannot restore a dead character.
        deleteAutosave();
        await this.showGameOver();
    }
}

// Autotranslated from allmain.c:35
export function early_init(argc, argv) {
  crashreport_init(argc, argv);
  decl_globals_init();
  objects_globals_init();
  monst_globals_init();
  sys_early_init();
  runtime_info_init();
}

// Autotranslated from allmain.c:591
export async function moveloop(resuming) {
  moveloop_preamble(resuming);
  if (!resuming) maybe_do_tutorial();
  for (; ; ) {
    await moveloop_core();
  }
}

// Autotranslated from allmain.c:604
export async function regen_pw(wtcap, game, player) {
  if (player.uen < player.uenmax && ((wtcap < MOD_ENCUMBER && (!((Number(game?.moves) || 0) % ((MAXULEV + 8 - player.ulevel) * (Role_if(PM_WIZARD) ? 3 : 4) / 6)))) || Energy_regeneration)) {
    let upper =  (acurr(player,A_WIS) + acurr(player,A_INT)) / 15 + 1;
    player.uen += rn1(upper, 1);
    if (player.uen > player.uenmax) player.uen = player.uenmax;
    game.disp.botl = true;
    if (player.uen === player.uenmax) await interrupt_multi("You feel full of energy.");
  }
}

// Autotranslated from allmain.c:955
export async function interrupt_multi(msg, game) {
  if (game.multi > 0 && !game.svc.context.travel && !(game?.svc?.context?.run || 0)) { nomul(0); if (game.flags.verbose && msg) await Norep("%s", msg); }
}

// Autotranslated from allmain.c:1187
export function timet_delta(etim, stim) {
  return  difftime(etim, stim);
}

// Autotranslated from allmain.c:1264
export async function dump_enums() {
  let NUM_ENUM_DUMPS;
  let omdump = [ dump_om(LAST_GENERIC), dump_om(OBJCLASS_HACK), dump_om(FIRST_OBJECT), dump_om(FIRST_AMULET), dump_om(LAST_AMULET), dump_om(FIRST_SPELL), dump_om(LAST_SPELL), dump_om(MAXSPELL), dump_om(FIRST_REAL_GEM), dump_om(LAST_REAL_GEM), dump_om(FIRST_GLASS_GEM), dump_om(LAST_GLASS_GEM), dump_om(NUM_REAL_GEMS), dump_om(NUM_GLASS_GEMS), dump_om(MAX_GLYPH), ];
  let ed = [ monsdump, objdump, omdump, defsym_cmap_dump, defsym_mon_syms_dump, defsym_mon_defchars_dump, objclass_defchars_dump, objclass_classes_dump, objclass_syms_dump, arti_enum_dump, ];
  let edmp = [ [ "monnums", "PM_", UNPREFIXED_COUNT, 0, SIZE(monsdump) ], [ "objects_nums", "", 1, 0, SIZE(objdump) ], [ "misc_object_nums", "", 1, 0, SIZE(omdump) ], [ "cmap_symbols", "", 1, 0, SIZE(defsym_cmap_dump) ], [ "mon_syms", "", 1, 0, SIZE(defsym_mon_syms_dump) ], [ "mon_defchars", "", 1, 1, SIZE(defsym_mon_defchars_dump) ], [ "objclass_defchars", "", 1, 1, SIZE(objclass_defchars_dump) ], [ "objclass_classes", "", 1, 0, SIZE(objclass_classes_dump) ], [ "objclass_syms", "", 1, 0, SIZE(objclass_syms_dump) ], [ "artifacts_nums", "", 1, 0, SIZE(arti_enum_dump) ], ];
  let nmprefix, i, j, nmwidth, comment;
  for (i = 0; i < NUM_ENUM_DUMPS; ++ i) {
    await raw_printf("enum %s = {", edmp[i].title);
    for (j = 0; j < edmp[i].szd; ++j) {
      nmprefix = (j >= edmp[i].szd - edmp[i].unprefixed_count) ? "" : edmp[i].pfx;
      nmwidth = 27 -  strlen(nmprefix);
      if (edmp[i].dumpflgs > 0) {
        Snprintf(comment, comment.length, "  ", (ed[i][j].val >= 32 && ed[i][j].val <= 126) ? ed[i][j].val : ' ');
      }
      else { comment = '\0'; }
      await raw_printf(" %s% s.value = %3d,%s", nmprefix, -nmwidth, ed[i][j].nm, ed[i][j].val, comment);
    }
    raw_print("};");
    raw_print("");
  }
  raw_print("");
}

// Autotranslated from allmain.c:1361
export function dump_glyphids() {
  dump_all_glyphids(stdout);
}

// Autotranslated from allmain.c:1178
export function timet_to_seconds(ttim) {
  return timet_delta(ttim,  0);
}
