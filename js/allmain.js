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

import { movemon, settrack, mon_regen, initrack } from './monmove.js';
import { setGame, beginCommandExec, endCommandExec, getCommandExecState } from './gstate.js';
import { hasEnv, getEnv, writeStderr } from './runtime_env.js';
import { nh_timeout, do_storms, fall_asleep } from './timeout.js';
import { pline, Norep } from './pline.js';
import { runtimeDecideToShapeshift, makemon, makemon_appear, withMakemonPlayerOverrideAsync } from './makemon.js';
import { M2_WERE, PM_WIZARD, mons, NUMMONS, G_NOCORPSE } from './monsters.js';
import { were_change } from './were.js';
import { allocateMonsterMovement, mcalcmove } from './mon.js';
import { rn2, rnd, rn1, initRng, getRngState, setRngState, getRngCallCount, setRngCallCount,
         enableRngLog, getRngLog as readRngLog, pushRngLogEntry, setRnlPlayerAccessor } from './rng.js';
import { A_STR, A_DEX, A_CON, A_INT, A_WIS, ROOMOFFSET, SHOPBASE,
         COLNO, ROWNO, A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, NORMAL_SPEED,
         FEMALE, MALE, TERMINAL_COLS, MAXULEV,
         RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC,
         SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER, SIZE, TER_DETECT,
         TELEPORT, POLYMORPH, Upolyd } from './const.js';
import { ageSpells } from './spell.js';
import { wipe_engr_at, can_reach_floor, engr_at } from './engrave.js';
import { dosearch0 } from './detect.js';
import { maybe_finished_meal, gethungry } from './eat.js';
import { exerchk } from './attrib_exercise.js';
import { exercise } from './attrib_exercise.js';
import { rhack } from './cmd.js';
import { FOV, get_vision_full_recalc, cansee as cansee_core } from './vision.js';
import { monsterNearby, nomul, unmul, near_capacity, inv_weight, domove, lookaround, end_running, dotravel_target, runmode_delay_output } from './hack.js';
import { see_monsters, see_objects, see_traps, swallowed, vision_recalc, mark_vision_dirty, flush_screen, CLR_GRAY } from './display.js';
import { do_light_sources } from './light.js';
import { Player, roles, races, formatLoreText, godForRoleAlign, isGoddess,
         rankOf, greetingForRole, roleNameForGender, alignName } from './player.js';
import { mklev, setGameSeed, isBranchLevelToDnum, at_dgn_entrance, depth as dungeonDepth, level_difficulty } from './dungeon.js';
import { getArrivalPosition, changeLevel as changeLevelCore, deferred_goto, maybe_lvltport_feedback } from './do.js';
import { loadSave, deleteSave, loadAutosave, scheduleAutosave, deleteAutosave,
         loadFlags, saveFlags, deserializeRng,
         restGameState, restLev, listSavedData, clearAllData,
         parseNethackrcFull } from './storage.js';
import { buildEntry, saveScore, loadScores, formatTopTenEntry, formatTopTenHeader } from './topten.js';
import { startRecording } from './keylog.js';
import { nhgetch, getCount, setInputRuntime, cmdq_clear, cmdq_add_int, cmdq_add_key,
         cmdq_copy, cmdq_peek, cmdq_restore, setCmdqInputMode,
         setCmdqRepeatRecordMode, more, hasActiveMoreBoundary } from './input.js';
import { CQ_CANNED, CQ_REPEAT, CMDQ_INT, CMDQ_KEY } from './const.js';
import {
    init_nhwindows, create_nhwindow, destroy_nhwindow, start_menu, add_menu, end_menu, select_menu,
    hasActiveTextPopupWindow, redrawActiveTextPopupWindows,
} from './windows.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, PICK_ONE, ATR_NONE, IS_DOOR } from './const.js';
import { initFirstLevel } from './u_init.js';
import { reset_justpicked } from './pickup.js';
import { handleReset as _handleReset, restoreFromSave as _restoreFromSave,
         playerSelection as _playerSelection, maybeDoTutorial as _maybeDoTutorial,
         enterTutorial as _enterTutorial, showGameOver as _showGameOver,
         showLoreAndWelcome as _showLoreAndWelcome } from './chargen.js';
import { movebubbles, fumaroles } from './mkmaze.js';
import { initAnimation, configureAnimation, setAnimationMode } from './animation.js';
import { encumber_msg } from './pickup.js';
import { nhimport, nhload } from './origin_awaits.js';
import { phase_of_the_moon, friday_13th, night, setFixedDatetime, yyyymmddhhmmss } from './calendar.js';
import { change_luck, acurr } from './attrib.js';
import { invault } from './vault.js';
import { amulet } from './wizard.js';
import { dosounds } from './sounds.js';
import { find_ac, set_wear } from './do_wear.js';
import { any_visible_region, run_regions } from './region.js';

const QUEST_PORTAL_INFO_BY_ROLE = {
    Arc: { leader: 'Lord Carnarvon', homebase: 'the College of Archeology' },
    Bar: { leader: 'Pelias', homebase: 'the Camp of the Duali Tribe' },
    Cav: { leader: 'Shaman Karnov', homebase: 'the Caves of the Ancestors' },
    Hea: { leader: 'Hippocrates', homebase: 'the Temple of Epidaurus' },
    Kni: { leader: 'King Arthur', homebase: 'Camelot Castle' },
    Mon: { leader: 'Grand Master', homebase: 'the Monastery of Chan-Sune' },
    Pri: { leader: 'the Arch Priest', homebase: 'the Great Temple' },
    Rog: { leader: 'Master of Thieves', homebase: "the Thieves' Guild Hall" },
    Ran: { leader: 'Orion', homebase: "Orion's camp" },
    Sam: { leader: 'Lord Sato', homebase: 'the Castle of the Taro Clan' },
    Tou: { leader: 'Twoflower', homebase: 'Ankh-Morpork' },
    Val: { leader: 'Norn', homebase: 'the Shrine of Destiny' },
    Wiz: { leader: 'Neferet the Green', homebase: 'the Lonely Tower' },
};

function runstepEventEnabled() {
    const raw = String(getEnv('WEBHACK_EVENT_RUNSTEP', '0') || '').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'on';
}

function emitRunstep(game, keyarg, path, cmdOverride = null) {
    if (!runstepEventEnabled()) return;
    const ctx = game?.context || {};
    const p = game?.u || game?.player || {};
    const ux = Number.isFinite(Number(p?.x)) ? Number(p.x) : Number(p?.ux || 0);
    const uy = Number.isFinite(Number(p?.y)) ? Number(p.y) : Number(p?.uy || 0);
    const cmd = (cmdOverride == null) ? (game?.cmdKey | 0) : (cmdOverride | 0);
    pushRngLogEntry(
        `^runstep[path=${path} keyarg=${keyarg | 0} cmd=${cmd} cc=${(game?.commandCount | 0)} moves=${(game?.moves | 0)} multi=${(game?.multi | 0)} run=${(ctx?.run | 0)} mv=${ctx?.mv ? 1 : 0} move=1 occ=${game?.occupation ? 1 : 0} umoved=${p?.umoved ? 1 : 0} ux=${ux | 0} uy=${uy | 0}]`
    );
}

function questPortalInfoForPlayer(player) {
    const role = Number.isInteger(player?.roleIndex) ? roles[player.roleIndex] : null;
    const abbr = role?.abbr || '';
    return QUEST_PORTAL_INFO_BY_ROLE[abbr]
        || { leader: 'your quest leader', homebase: 'your home base' };
}

export function inputSnap(game) {
    const display = game?.display || null;
    const input = game?.input || null;
    const promptActive = !!(game?.pendingPrompt && typeof game.pendingPrompt.onKey === 'function');
    const menuActive = !!hasActiveTextPopupWindow();
    const waitingRaw = !!(input && typeof input.isWaitingInput === 'function' && input.isWaitingInput());
    const ackRequired = !!display?.messageNeedsMore;
    const execState = getCommandExecState(game);
    let owner = 'none';
    if (promptActive) owner = 'prompt';
    else if (menuActive) owner = 'menu';
    else if (waitingRaw) owner = 'input';
    return {
        waitingForInput: promptActive || menuActive || waitingRaw,
        owner,
        pendingCount: promptActive ? 1 : 0,
        ackRequired,
        stackOwner: promptActive ? 'prompt' : null,
        stackDepth: promptActive ? 1 : 0,
        commandExecToken: execState?.activeToken ?? null,
        commandExecDepth: Number(execState?.depth || 0),
    };
}

async function com_pager_quest_common(msgid, player) {
    // C ref: questpgr.c com_pager_core() -> nhl_init() loads nhlib.lua.
    // nhlib top-level shuffle(align) consumes rn2(3), rn2(2) per call.
    rn2(3);
    rn2(2);
    const { leader, homebase } = questPortalInfoForPlayer(player);
    if (msgid === 'quest_portal') {
        await pline(`You receive a faint telepathic message from ${leader}:`);
        await pline(`Your help is urgently needed at ${homebase}!`);
        await pline('Look for a ...ic transporter.');
        await pline("You couldn't quite make out that last message.");
        return;
    }
    if (msgid === 'quest_portal_again') {
        await pline(`You again sense ${leader} pleading for help.`);
        return;
    }
    if (msgid === 'quest_portal_demand') {
        await pline(`You again sense ${leader} demanding your attendance.`);
    }
}

// cf. allmain.c:169 — moveloop_core() monster movement + turn-end processing.
// Called after the hero's action took time.  Runs movemon() for monster turns,
// then moveloop_turnend() for once-per-turn effects.
// opts.skipMonsterMove: skip movemon (used by some test harnesses)
// C ref: vision_full_recalc checked at top of each loop iteration (vision.c)
// Autotranslated from allmain.c:169
export async function moveloop_core(game, opts = {}) {
    const player = (game.u || game.u);
    const setMonsterPhase = (isMonsterPhase) => {
        const v = !!isMonsterPhase;
        game.mon_moving = v;
        if (game?.context) game.context.mon_moving = v;
        if (game?.svc?.context) game.svc.context.mon_moving = v;
    };
    // C ref: at top of each moveloop iteration, vision_recalc(0) if vision_full_recalc set.
    // This catches topology changes from the player's action (door opens, dig, teleport, etc.)
    // so that monsters run with up-to-date FOV.
    if (game.fov && get_vision_full_recalc()) {
        vision_recalc();
    }
    if (!Number.isFinite(player.umovement)) {
        player.umovement = NORMAL_SPEED;
    }
    // C ref: allmain.c:197 — actual time passed.
    player.umovement -= NORMAL_SPEED;

    let abortMoveLoop = false;
    let stopAfterTurnend = false;
    do {
        let monscanmove = false;
        // C ref: allmain.c moveloop_core() calls encumber_msg() at start of the
        // "hero can't move this turn" loop so load transitions are surfaced
        // before monster actions.
        await encumber_msg(player);
        if (!opts.skipMonsterMove) {
            // C ref: allmain.c:303-310 — mark monster phase and snapshot HP
            // at start of monster turn for saving_grace.
            setMonsterPhase(true);
            const startHp = Number.isFinite(player?.uhp) ? player.uhp : (Number(player?.hp) || 0);
            game.uhp_at_start_of_monster_turn = startHp;
            player._uhp_at_start = startHp;
            try {
                do {
                    monscanmove = await movemon((game.map || game.map), player, game.display, game.fov, game);
                    // C ref: savelife() sets context.move=0 for the command
                    // cycle but does not interrupt the current "hero can't move"
                    // monster loop between movemon() passes. Finish draining any
                    // already-allocated monster movement first, then stop before
                    // starting a new command cycle.
                    if (game?._stopMoveloopAfterLifesave) {
                        if (!monscanmove) {
                            stopAfterTurnend = true;
                            monscanmove = false;
                            game._stopMoveloopAfterLifesave = false;
                            break;
                        }
                    }
                    if (game?.playerDied) {
                        abortMoveLoop = true;
                        monscanmove = false;
                        break;
                    }
                    if (player.umovement >= NORMAL_SPEED)
                        break; /* it's now your turn */
                } while (monscanmove);
            } finally {
                setMonsterPhase(false);
            }
        }
        // C ref: mon.c movemon() does deferred_goto() on u.utotype.
        // JS keeps it here until mon.c-level transition plumbing is fully ported.
        if (player.utotype) {
            await deferred_goto(player, game);
            monscanmove = false;
        }
        if (!monscanmove
            && player.umovement < NORMAL_SPEED
            && !abortMoveLoop
            && !(game?.playerDied)) {
            await moveloop_turnend(game);
        }
    } while (player.umovement < NORMAL_SPEED
        && !abortMoveLoop
        && !stopAfterTurnend
        && !(game?.playerDied));

    // C ref: allmain.c:397-402 — second encumber_msg() after the hero-can't-move
    // loop.  Inventory weight may have changed during nh_timeout() or other
    // turn-end processing; this gives the player immediate feedback.
    await encumber_msg(player);

    // C ref: In C, vision_recalc(0) fires at the top of the NEXT moveloop iteration,
    // BEFORE nhgetch blocks — so the screen capture always has fresh FOV.
    // In JS, screen capture happens between moveloop_core calls, so we must
    // recalc here unconditionally. This catches:
    //   (a) player movement setting mark_vision_dirty via domove_core
    //   (b) monster actions (digs, door breaks, etc.) during movemon
    //   (c) any topology changes during end-of-turn processing
    if (game.fov && get_vision_full_recalc()) {
        vision_recalc();
    }

    // C ref: allmain.c:414-420 seer_turn update happens once here,
    // after the movement loop, rather than inside moveloop_turnend().
    // JS turnCount is one behind C's svm.moves; mirror C check with +1 offset.
    const movesForSeer = game.turnCount + 1;
    if (movesForSeer >= game.seerTurn) {
        game.seerTurn = movesForSeer + rn1(31, 15);
    }

    // C ref: allmain.c end of moveloop_core — check for player death.
    // Bones handling belongs to end.c/really_done(), not the moveloop.
    const awaitingEndPrompt = !!(game?.pendingPrompt && typeof game.pendingPrompt.onKey === 'function');
    if ((player.isDead || player.uhp <= 0) && game.gameOver && !awaitingEndPrompt) {
        if (!player.deathCause) {
            player.deathCause = 'died';
        }
    }
}

// cf. allmain.c:169 — moveloop_core() turn-end block
// Unified from processTurnEnd (nethack.js) and simulateTurnEnd (headless_runtime.js).
// Called once per real turn, after hero and monsters have moved.
// game must provide: player, map, display, fov, multi, turnCount, seerTurn,
//                    flags, travelPath, runMode
export async function moveloop_turnend(game) {
    const player = (game.u || game.u);
    const nextTurnCount = game.turnCount + 1;
    // C ref: allmain.c -- random spawn happens before svm.moves++.
    // During this turn-end frame, mkobj-side erosion checks should
    // still observe the pre-increment move count.
    game.moves = game.turnCount;

    // C ref: mon.c m_calcdistress() — per-monster distress timers.
    for (const mon of (game.map || game.map).monsters) {
        if (mon.dead) continue;
        // C ref: mon.c:1178-1183 — mblinded timeout
        if (mon.mblinded && typeof mon.mblinded === 'number') {
            mon.mblinded--;
            if (mon.mblinded <= 0) {
                mon.mblinded = 0;
                mon.mcansee = true;
            }
        }
        // C ref: mon.c:1185-1190 — mfrozen timeout
        if (mon.mfrozen && typeof mon.mfrozen === 'number') {
            mon.mfrozen--;
            if (mon.mfrozen <= 0) {
                mon.mfrozen = 0;
                mon.mcanmove = true;
            }
        }
        // C ref: mon.c:1192-1197 — mfleetim timeout
        if (mon.mfleetim && mon.mfleetim > 0) {
            mon.mfleetim--;
            if (mon.mfleetim <= 0) {
                mon.mfleetim = 0;
                mon.mflee = false;
            }
        }
    }

    // C ref: mon.c m_calcdistress() — HP regen + mspec_used decrement, once per game turn.
    for (const mon of (game.map || game.map).monsters) {
        if (mon.dead) continue;
        mon_regen(mon, false, nextTurnCount);
    }

    // C ref: mon.c m_calcdistress() shapechange + lycanthropy pass.
    for (const mon of (game.map || game.map).monsters) {
        if (mon.dead) continue;
        await runtimeDecideToShapeshift(mon, (game.u || game.u).dungeonLevel,
            (game.map || game.map), (game.u || game.u), game.fov, game.display);
        if ((mon.data || mon.type) && ((mon.data || mon.type).mflags2 & M2_WERE)) {
            await were_change(mon, {
                player: (game.u || game.u),
                map: (game.map || game.map),
                fov: game.fov,
                display: game.display,
            });
        }
    }

    // C ref: allmain.c:226-227 — reallocate movement to monsters via mcalcmove
    await allocateMonsterMovement((game.map || game.map));

    // C ref: allmain.c:235-242 — occasional random monster spawn.
    // Rate depends on demigod state and depth relative to stronghold.
    // Spawn happens after movement allocation, so a new monster loses first turn.
    const playerDepth = Number(player?.dungeonLevel || 0);
    const spawnRate = player?.uevent?.udemigod ? 25
        : (playerDepth > 27 ? 50 : 70);
    if (!rn2(spawnRate)) {
        await makemon_appear(
            null,
            0,
            0,
            0,
            level_difficulty((game.map || game.map).uz, game),
            (game.map || game.map)
        );
    }

    // C ref: allmain.c:238 u_calc_moveamt(wtcap)
    u_calc_moveamt(player);

    // C ref: allmain.c:239 + 348-365 — settrack() then moves++ bookkeeping.
    settrack(player);
    game.turnCount = nextTurnCount;
    player.turns = game.turnCount;
    game._currentTurn = game.turnCount + 1;
    // C ref: allmain.c sets gh.hero_seq = svm.moves << 3 when moves advances;
    // track the low 3-bit action count separately for mapdump anchor parity.
    game.heroSeqN = 0;
    game.moves = game.turnCount;

    // C ref: allmain.c once-per-turn block runs nh_timeout() after
    // mcalcdistress/mcalcmove and random spawn setup.
    await nh_timeout({
        player: (game.u || game.u),
        map: (game.map || game.map),
        display: game.display,
        game,
    });
    // C ref: allmain.c:273-274 — run_regions() runs immediately after nh_timeout().
    await run_regions((game.map || game.map), (game.u || game.u), game);
    // C ref: lethal side effects during nh_timeout()/run_regions() route
    // through done(); once death is pending/final, do not continue turn-end
    // RNG work in this cycle.
    if (game?.playerDied || game?.gameOver) {
        return;
    }

    // C ref: allmain.c:273-274 — ublesscnt countdown (prayer cooldown)
    {
        const p = (game.u || game.u);
        if (p.ublesscnt) p.ublesscnt--;
    }

    // C ref: allmain.c:276 — saving_grace_turn reset
    game.saving_grace_turn = false;

    // C ref: allmain.c:295-301 — regen_hp(mvl_wtcap)
    await regen_hp(game);

    // C ref: allmain.c:297-301 — overexert_hp when encumbered and moving
    {
        const p = player;
        const wtcap = near_capacity(p);
        if (wtcap > MOD_ENCUMBER && p.umoved) {
            const moves = game.turnCount;
            if (!(wtcap < EXT_ENCUMBER ? moves % 30 : moves % 10)) {
                await overexert_hp(game);
            }
        }
    }

    // C ref: allmain.c:304 — regen_pw(mvl_wtcap)
    await regen_pw_turnend(game);

    // C ref: allmain.c:306-338 — Teleportation/Polymorph/Lycanthropy checks
    {
        const p = (game.u || game.u);
        const propActive = (propIdx, legacyName, legacyName2 = null) => {
            if (typeof p?.hasProp === 'function') return !!p.hasProp(propIdx);
            if (p?.uprops && p.uprops[propIdx]) {
                const e = p.uprops[propIdx];
                return !!(e.intrinsic || e.extrinsic);
            }
            return !!(p?.[legacyName] || (legacyName2 ? p?.[legacyName2] : 0));
        };
        const teleportation = propActive(TELEPORT, 'Teleportation', 'teleportation');
        const polymorph = propActive(POLYMORPH, 'Polymorph', 'polymorph');
        if (!p.uinvulnerable) {
            if (teleportation && !rn2(85)) {
                // tele() — full teleportation not ported; consume RNG only
                // TODO: wire tele() when available
            }
            if (polymorph && !rn2(100)) {
                // polyself() — full polymorph not ported; consume RNG only
                // TODO: wire polyself() when available
            } else if (p.ulycn != null && p.ulycn >= 0 && !p.Upolyd) {
                const nightBonus = 0; // TODO: night() not ported
                if (!rn2(80 - (20 * nightBonus))) {
                    // you_were() — lycanthropy not ported; consume RNG only
                    // TODO: wire you_were() when available
                }
            }
        }
    }

    // C ref: allmain.c:346-348 — autosearch for players with Searching
    // intrinsic (Archeologists/Rangers at level 1, Rogues at 10, etc.)
    // C also checks !svl.level.flags.noautosearch.
    {
        const mapFlags = (game.map || game.map)?.flags || {};
        if ((game.u || game.u).searching && !mapFlags.noautosearch && game.multi >= 0) {
            await dosearch0((game.u || game.u), (game.map || game.map), game.display, game, 1);
        }
    }

    // C ref: allmain.c:351 dosounds() — ambient sounds
    await moveloop_dosounds(game);

    // C ref: allmain.c:358 do_storms()
    do_storms();

    // C ref: allmain.c:353 gethungry()
    await gethungry((game.u || game.u));

    // C ref: allmain.c:354 age_spells() — decrement spell retention each turn
    ageSpells((game.u || game.u));

    // C ref: allmain.c:355 exerchk() — exercise attribute checks.
    // C's exerchk() calls exerper() internally (attrib.c:601).
    const moves = game.turnCount + 1;
    await exerchk((game.u || game.u), moves);

    // C ref: allmain.c:362 — invault() between exerchk and u_wipe_engr
    await invault((game.map || game.map), (game.u || game.u), game.fov || FOV);

    // C ref: allmain.c:363-364 — amulet() when carrying Amulet of Yendor
    if ((game.u || game.u).uhave?.amulet) {
        await amulet((game.map || game.map), (game.u || game.u), game.display);
    }

    // C ref: allmain.c:364 — engrave wipe check (ACURR(A_DEX))
    const dex = acurr((game.u || game.u), A_DEX);
    if (!rn2(40 + dex * 3)) {
        // C ref: engrave.c u_wipe_engr() — only wipe if can reach floor
        if (can_reach_floor((game.u || game.u), (game.map || game.map), true)) {
            await wipe_engr_at((game.map || game.map), (game.u || game.u).x, (game.u || game.u).y, rnd(3), false);
        }
    }

    // C ref: allmain.c:374 — water/air planes update moving bubbles/clouds each turn.
    if ((game.map || game.map)?.flags?.is_waterlevel || (game.map || game.map)?.flags?.is_airlevel) {
        if ((game.map || game.map)?._water && (game.u || game.u)) {
            (game.map || game.map)._water.heroPos = {
                x: (game.u || game.u).x,
                y: (game.u || game.u).y,
                dx: (game.u || game.u).dx || 0,
                dy: (game.u || game.u).dy || 0,
            };
            (game.map || game.map)._water.onHeroMoved = (x, y) => {
                (game.u || game.u).x = x;
                (game.u || game.u).y = y;
                mark_vision_dirty(); // player position changed
            };
            (game.map || game.map)._water.onVisionRecalc = () => {
                vision_recalc();
            };
        }
        await movebubbles((game.map || game.map));
    } else if ((game.map || game.map)?.flags?.fumaroles) {
        // C ref: allmain.c:381-382 — fumaroles on fire/lava levels
        await fumaroles((game.map || game.map));
    }

    // C ref: allmain.c:385-393 — immobile turn countdown and unmul().
    if (game.multi < 0) {
        await runmode_delay_output(game, game.display);
        if (++game.multi === 0) {
            await unmul(null, (game.u || game.u), game.display, game);
            if ((game.u || game.u)?.utotype) {
                await deferred_goto((game.u || game.u), game);
            }
        }
    }
    // After turn-end completes, subsequent command processing observes
    // the incremented move counter.
    game.moves = game.turnCount + 1;
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
                await game.display?.putstr_message?.(`You stop ${occtxt}.`);
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
function u_calc_moveamt(player) {
    let moveamt;
    // C ref: allmain.c:121-124 — while riding and having moved, use steed speed.
    if (player?.usteed && player?.umoved) {
        moveamt = mcalcmove(player.usteed, true);
    } else {
        // C ref: allmain.c u_calc_moveamt() uses gy.youmonst.data->mmove
        // (current form movement), not a cached hero speed field.
        const formSpeed = Number(player?.type?.mmove);
        moveamt = Number.isFinite(formSpeed) ? formSpeed : (player.speed || NORMAL_SPEED);
        if (player.veryFast) {
            if (hasEnv('WEBHACK_RUN_DEBUG')
                && getEnv('WEBHACK_RUN_DEBUG') !== '0') {
                const e = player.uprops[28];
                const rngIdx = readRngLog().length;
                writeStderr(`DBG u_calc_moveamt veryFast turns=${player.turns} rngIdx=${rngIdx} intr=${e?.intrinsic} extr=${e?.extrinsic}\n`);
            }
        }
        if (player.veryFast) {
            if (rn2(3) !== 0) moveamt += NORMAL_SPEED;
        } else if (player.fast) {
            if (rn2(3) === 0) moveamt += NORMAL_SPEED;
        }
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
    // C ref: event_log for hero movement amount — matches C ^moveamt event.
    // Do NOT call inv_weight() here — in C it has side effects (sets gw.wc).
    pushRngLogEntry(`^moveamt[wtcap=${wtcap} moveamt=${moveamt} umovement=${player.umovement} pos=${player.x},${player.y}]`);
}

// C ref: sounds.c:202-339 dosounds() — ambient level sounds
// Each feature check uses short-circuit && so rn2() is only called
// when the feature exists. Fountains/sinks don't return early;
// all others return on a triggered sound.
export async function moveloop_dosounds(game) {
    // Delegate to the canonical sounds.c-faithful implementation.
    await dosounds(game);
}

// cf. allmain.c moveloop() — shared post-input command orchestration.
// Executes a single command (rhack), then drains any occupation it creates,
// then handles multi-repeat (counted commands like "20s").
// Used by nethack.js (browser), headless_runtime.js (tests/selfplay), and
// replay_core.js (session comparison) so that all three drive the same
// orchestration logic.
//
// opts.countPrefix:      digit count (e.g. 20 for "20s")
// opts.skipMonsterMove:  passed through to moveloop_core
// opts.skipTurnEnd:      skip all post-rhack processing (moveloop, occ, multi)
export async function run_command(game, ch, opts = {}) {
    const {
        countPrefix = 0,
        skipMonsterMove,
        skipTurnEnd = false,
        skipRepeatRecord = false,
        showRepeatInterruptMore = true,
    } = opts;

    const chCode = typeof ch === 'number' ? ch
        : (typeof ch === 'string' && ch.length > 0) ? ch.charCodeAt(0) : 0;
    // C ref: moveloop() only returns to command input when the hero can act
    // again (u.umovement >= NORMAL_SPEED). Do NOT force umovement here — let it
    // carry from the previous moveloop_core call, matching C's behavior where
    // umovement accumulates across iterations (can be 0 between turns).
    game?.emitDiagnosticEvent?.('command.start', {
        key: chCode,
        boundary: inputSnap(game),
    });
    const execToken = beginCommandExec(game, { site: 'run_command', key: chCode });
    const coreOpts = {};
    if (skipMonsterMove) coreOpts.skipMonsterMove = true;
    const bumpHeroSeqN = () => {
        const prior = Number.isFinite(game?.heroSeqN) ? (game.heroSeqN | 0) : 0;
        game.heroSeqN = Math.min(7, prior + 1);
    };

    try {
    const promptFinalized = await promptStep(game, chCode, {
        skipTurnEnd,
        skipMonsterMove,
    });
    if (promptFinalized) {
        if (promptFinalized.tookTime) {
            bumpHeroSeqN();
            if (!skipTurnEnd) {
                await finalizeTimedCommand(game, promptFinalized, coreOpts);
            }
        }
        postRender(game, promptFinalized);
        return promptFinalized;
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
    const _isExtCmdPrefix = (chCode === '#'.charCodeAt(0));
    const _suppressFreshRunstep = _isCountDigit || _isExtCmdPrefix;
    // C ref: tty_clearmsg() — clear topline at start of command processing.
    // toplin == 1 (NEED_MORE): fire more() so player reads the message first.
    // toplin == 2 (NON_EMPTY): just clear (already acknowledged by keypress).
    // toplin == 0 (EMPTY): nothing to do.
    if (!_isCountDigit && game.display && game.display.topMessage) {
        if (game.display.toplin === 1 && game.display._nhgetch) {
            // Message not yet acknowledged — fire more() before clearing.
            // This handles Phase B messages that arrive after the previous
            // command and before nhgetch transitions toplin 1→2.
            game.display.renderMoreMarker?.();
            await more(game.display, {
                site: 'run_command.tty_clearmsg',
                clearAfter: true,
                readKey: game.display._nhgetch,
                refreshStatus: false,
            });
        }
        if (_isExtCmdPrefix) {
            game._extcmdPrecedingMsgLen = (game.display.topMessage || '').length;
        } else {
            game._extcmdPrecedingMsgLen = 0;
        }
        if (game.display.topMessage) {
            game.display.clearRow(0);
            game.display.topMessage = null;
        }
        game.display.messageNeedsMore = false;
        game.display.toplin = 0;
    } else if (_isExtCmdPrefix) {
        game._extcmdPrecedingMsgLen = 0;
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
    const effectiveCountPrefix = (countPrefix > 0)
        ? countPrefix
        : ((game.countAccum != null) ? (game.countAccum | 0) : 0);
    game.commandCount = effectiveCountPrefix;
    if (!_suppressFreshRunstep) {
        emitRunstep(game, 0, 'fresh_cmd', chCode);
    }
    if (effectiveCountPrefix > 0) {
        game.multi = effectiveCountPrefix - 1; // first execution is now
    } else {
        game.multi = 0;
    }
    game.cmdKey = chCode;

    // Set advanceRunTurn for running mode (G/g commands process monster
    // turns between each movement step rather than batching all movement).
    game.advanceRunTurn = async () => {
        await advanceTimedTurn(game, coreOpts);
    };

    // C ref: allmain.c:517 — u.umoved = FALSE; reset before each command
    const player = (game.u || game.u);
    if (player) player.umoved = false;

    // Execute command
    const result = await rhackCore(game, chCode, {
        skipRepeatRecord,
        isPrefixKey,
        bumpHeroSeqN,
    });
    if (result && result.repeatRequest) {
        game.advanceRunTurn = null;
        return await execute_repeat_command(game, opts);
    }
    // C ref: allmain.c deferred_goto() immediately follows rhack() whenever
    // u.utotype is set.
    if (game?.player?.utotype) {
        await deferred_goto((game.u || game.u), game);
    }

    // Clear advanceRunTurn
    game.advanceRunTurn = null;

    // Post-rhack processing: moveloop_core, occupation, multi-repeat
    if (result && result.tookTime && !skipTurnEnd) {
        if (result.travelStarted && (game.context || {}).mv) {
            await runAcceptedTravelCommandLoop(game, {
                coreOpts,
                bumpHeroSeqN,
            });
        } else {
            await finalizeTimedCommand(game, result, coreOpts);
        }
        if (!(game.context || {}).mv) {
            await repeatLoop(game, {
                coreOpts,
                bumpHeroSeqN,
                showRepeatInterruptMore,
                mode: 'movement_only',
            });
        }
    }

    postRender(game, result);

    return result;
    } finally {
        endCommandExec(game, execToken, { site: 'run_command', key: chCode });
    }
}

async function repeatLoop(game, {
    coreOpts,
    bumpHeroSeqN,
    showRepeatInterruptMore,
    mode = 'all',
}) {
    // C ref: allmain.c:519-535 — when context.mv is set (movement/travel),
    // C calls domove() directly instead of rhack(). This is critical for
    // travel: dotravel_target sets multi=max(COLNO,ROWNO) and context.mv,
    // so the entire travel run executes within one command boundary.
    while (game.multi > 0) {
        if (typeof game.shouldInterruptMulti === 'function'
            && game.shouldInterruptMulti()) {
            game.multi = 0;
            if (showRepeatInterruptMore && game.display) {
                await game.display.putstr_message('--More--');
                await more(game.display, {
                    game,
                    site: 'run_command.repeat.interrupt-more',
                    forceVisual: true,
                });
            }
        }
        if (game.multi <= 0) break; // hook may have cleared multi

        const ctx = game.context || {};
        if (ctx.mv) {
            const moveRepeated = await runMovementRepeatSlice(game, {
                coreOpts,
                bumpHeroSeqN,
            });
            if (game.display?.messageNeedsMore && hasPendingCommandBoundaryDismiss(game)) {
                break;
            }
            if (!moveRepeated) break;
        } else {
            if (mode === 'movement_only') {
                break;
            }
            emitRunstep(game, game?.cmdKey | 0, 'repeat_cmd', game?.cmdKey | 0);
            game.multi--;
            game.advanceRunTurn = async () => {
                await advanceTimedTurn(game, coreOpts);
            };
            const repeated = await rhack(game.cmdKey, game);
            game.advanceRunTurn = null;

            if (!repeated || !repeated.tookTime) break;
            bumpHeroSeqN();
            await advanceTimedTurn(game, coreOpts);
            if (typeof repeated.onAfterTurn === 'function') {
                await repeated.onAfterTurn(game);
            }

            // Drain occupation from repeated command.
            await _drainOccupation(game, coreOpts);
        }
    }
}

async function runAcceptedTravelCommandLoop(game, {
    coreOpts,
    bumpHeroSeqN,
}) {
    // C ref: travel continuation runs one move per rhack() call in moveloop.
    // Do NOT loop here — process only the first travel move. Subsequent moves
    // are handled by _gameLoopStep's hasPositiveMoveContinuation path, which
    // yields between moves so the replay can assign each move to a separate step.
    await advanceTimedTurn(game, coreOpts);
}

// Current JS positive-multi movement/travel slice.
// Stage B2a extracts this intact from repeatLoop() so later work can move its
// owner without simultaneously changing the slice internals.
async function runMovementRepeatSlice(game, {
    coreOpts,
    bumpHeroSeqN,
}) {
    const ctx = game.context || {};
    emitRunstep(game, game?.cmdKey | 0, 'repeat_mv', game?.cmdKey | 0);
    // C ref: allmain.c:527-530 — movement/travel multi repeat.
    // lookaround() can abort running by clearing multi.
    // Restructured to match do_run's operation ordering:
    //   domove → turn-end → stop-checks → lookaround
    // This order produces matching RNG with C's recorded sessions.
    const _p = game.u || game.u;
    const _map = game.map;
    const _fov = FOV;
    const _display = game.display;

    // Save run mode before domove (domove may call end_running internally)
    const savedRun = ctx.run;

    // Step 1: domove — use saved direction for running, [0,0] for travel
    const runDir = ctx.travel ? [0, 0] : [_p.dx || 0, _p.dy || 0];
    ctx._runAtMoveStart = Number(ctx.run || 0);
    const moveResult = await domove(runDir, _p, _map, _display, game);
    ctx._runAtMoveStart = 0;

    // Step 2: turn-end (if move took time)
    if (moveResult && moveResult.tookTime) {
        bumpHeroSeqN();
        if (game.display?.messageNeedsMore && hasPendingCommandBoundaryDismiss(game)) {
            game._pendingRunAdvanceTurn = { coreOpts };
            return false;
        }
        await advanceTimedTurn(game, coreOpts);
    } else {
        // Move didn't take time — travel path exhaustion gets one more turn
        if (savedRun === 8 && moveResult?.stopReason === 'travel_path_exhausted') {
            await advanceTimedTurn(game, coreOpts);
        }
        return false;
    }

    // Step 3: stop checks (matching do_run's post-move checks)
    if (Number(ctx.run || 0) === 0) return false;  // nomul cleared run
    if (!moveResult.moved) return false;

    // Decrement multi (C: moveloop_core line 528)
    if (game.multi < COLNO && !--game.multi) {
        end_running(true, game);
        return false;
    }

    // Door and engraving stops (matching do_run lines 1599-1605)
    const curLoc = _map?.at?.(_p.x, _p.y);
    if (curLoc && IS_DOOR(curLoc.typ)) return false;
    if (engr_at(_map, _p.x, _p.y)) return false;

    // Step 4: vision + lookaround (matching do_run lines 1609-1622)
    vision_recalc();
    const look = await lookaround(_map, _p, _fov, runDir, 'run', _display, game);
    if (look?.stopReason) return false;

    // Update display during run
    _display.renderMap(_map, _p, _fov);
    _display.renderStatus(_p);

    return true;
}

async function rhackCore(game, chCode, {
    skipRepeatRecord,
    isPrefixKey,
    bumpHeroSeqN,
} = {}) {
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
    if (!skipRepeatRecord && !game.inDoAgain) {
        game._repeatPrefixChainActive = !!(result && !result.tookTime && isPrefixKey);
    }
    if (result && result.tookTime) {
        bumpHeroSeqN();
    }
    return result;
}

async function promptStep(game, chCode, {
    skipTurnEnd = false,
    skipMonsterMove,
} = {}) {
    if (!(game?.pendingPrompt && typeof game.pendingPrompt.onKey === 'function')) {
        return null;
    }
    game?.emitDiagnosticEvent?.('boundary.prompt.key', {
        key: chCode,
        boundary: inputSnap(game),
    });
    const promptResult = await Promise.resolve(game.pendingPrompt.onKey(chCode, game));
    if (!(promptResult && promptResult.handled)) {
        // Strict owner semantics: while prompt boundary owns input, a key does
        // not fall through into command parsing even if prompt handler returns
        // non-handled (for example during transient prompt state updates).
        game?.emitDiagnosticEvent?.('boundary.prompt.ignored-key', {
            key: chCode,
            boundary: inputSnap(game),
        });
        return { tookTime: false, moved: false, prompt: true };
    }

    const promptTookTime = !!promptResult.tookTime;
    const promptMoved = !!promptResult.moved;
    if (!game.pendingPrompt && game._pendingTutorialStrip
        && typeof game._applyTutorialStrip === 'function') {
        game._applyTutorialStrip();
        game._pendingTutorialStrip = false;
    }
    // If a prompt was completed by this key, restore normal status/cursor
    // positioning for the next command frame (C tty command boundary).
    if (!game.pendingPrompt && !game.gameOver) {
        const player = game.u || game.u;
        if (game.display && player) {
            if (typeof game.display.renderStatus === 'function') {
                game.display.renderStatus(player);
            }
            if (typeof game.display.cursorOnPlayer === 'function') {
                game.display.cursorOnPlayer(player);
            }
        }
    }
    return {
        tookTime: promptTookTime,
        moved: promptMoved,
        prompt: true,
        terminalScreenOwned: !!promptResult.terminalScreenOwned,
        onAfterTurn: (typeof promptResult.onAfterTurn === 'function') ? promptResult.onAfterTurn : null,
    };
}

// Current JS structural split for the C moveloop frame:
// - moveloop_core() performs monster-time / turn-end work
// - this helper performs the pre-input sync currently bundled after it
// Stage B will refine ownership further; this extraction is behavior-preserving.
async function syncTimedTurnPreInputState(game) {
    const player = game.u || game.u;
    find_ac(player);
    const ctx = game.context || {};
    const canUpdateVision = !ctx.mv || player?.blind;
    const hallucinating = !!(player?.Hallucination || player?.hallucinating);
    if (canUpdateVision) {
        if (hallucinating) {
            see_monsters(game.map);
            see_objects();
            see_traps();
            if (player?.uswallow) {
                swallowed(0);
            }
        } else if (
            player?.Blind_telepat
            || player?.warning
            || player?.warnOfMon
            || any_visible_region(game.map)
        ) {
            see_monsters(game.map);
        }
    }
    if (game.display && player) {
        if (typeof game.display.renderStatus === 'function' && player._botl) {
            game.display.renderStatus(player);
            player._botl = false;
        }
        if (typeof game.display.cursorOnPlayer === 'function') {
            game.display.cursorOnPlayer(player);
        }
    }
}

// C ref: allmain.c moveloop_core() lines 296-545 (monster turn) + 547-588 (pre-input).
// Current JS Gate-1 unit: run the timed-turn core, then the pre-input sync
// that JS still keeps outside moveloop_core().
async function advanceTimedTurn(game, coreOpts) {
    await moveloop_core(game, coreOpts);
    await syncTimedTurnPreInputState(game);
}

// C ref: allmain.c moveloop_core() `gm.multi < 0` branch.
// Run exactly one negative-multi continuation tick; callers decide whether to
// loop or return to a higher-level owner.
async function runNegativeMultiStep(game, coreOpts) {
    if (!(game?.multi < 0) || game?.playerDied) return false;
    await advanceTimedTurn(game, coreOpts);
    return true;
}

// C ref: allmain.c occupation branch. Run exactly one occupation callback and
// its immediate post-callback checks; callers decide whether to loop.
async function runOccupationStep(game) {
    if (!game?.occupation) return { ran: false, prompt: false };

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

    // C ref: allmain.c:610-614 — monster_nearby() check after one occupation
    // callback and before moveloop returns.
    if (game.occupation && monsterNearby(
            (game.map || game.map), (game.u || game.u), game.fov)) {
        await stop_occupation(game);
    }

    if (finishedOcc && typeof finishedOcc.onFinishAfterTurn === 'function') {
        finishedOcc.onFinishAfterTurn(game);
    }
    return { ran: true, prompt: cont === 'prompt' };
}

function hasPendingCommandBoundaryDismiss(game) {
    const display = game?.display;
    if (!display) return false;
    const hasQueuedCannedBoundary = !!(cmdq_peek(CQ_CANNED) && display?.topMessage);
    if (hasQueuedCannedBoundary) return true;
    if (display.moreMarkerActive || display.messageNeedsMoreBoundary) return true;
    // C ref: tty_nhgetch() transitions toplin 1 -> 2 after the next key
    // acknowledges a pending message. At that point tty_clearmsg() should
    // clear the old topline and continue with command parsing; stale
    // rendered "--More--" text must not keep owning further keys.
    if (!display?.messageNeedsMore) return false;
    if (typeof display.getScreenLines === 'function') {
        const lines = display.getScreenLines() || [];
        if ((lines[0] || '').includes('--More--') || (lines[1] || '').includes('--More--')) {
            return true;
        }
    }
    const lines = display.getScreenLines() || [];
    return (lines[0] || '').includes('--More--') || (lines[1] || '').includes('--More--');
}

function clearAcknowledgedTopline(display) {
    if (!display?.topMessage) return;
    if (display?.messageNeedsMore) return;
    if (Number(display?.toplin || 0) !== 2) return;
    if (typeof display.clearRow === 'function') {
        display.clearRow(0);
        if (Object.hasOwn(display, '_topMessageRow1') && display._topMessageRow1 !== undefined) {
            display.clearRow(1);
            display._topMessageRow1 = undefined;
        }
    }
    display.topMessage = null;
    if (Object.hasOwn(display, 'toplines')) display.toplines = '';
    if (Object.hasOwn(display, 'moreMarkerActive')) display.moreMarkerActive = false;
    if (Object.hasOwn(display, 'messageNeedsMoreBoundary')) display.messageNeedsMoreBoundary = false;
    display.toplin = 0;
}

async function finalizeTimedCommand(game, result, coreOpts) {
    if (!(result && result.tookTime)) return;
    await advanceTimedTurn(game, coreOpts);
    if (typeof result.onAfterTurn === 'function') {
        await result.onAfterTurn(game);
    }
    await _drainOccupation(game, coreOpts);
}

function postRender(game, result) {
    // C ref: bot() + curs_on_u() — update status line and cursor position
    // after all command processing. In C this tail does not perform a full
    // docrt(); map repaint owners are the gameplay paths themselves
    // (newsym/see_monsters/vision_recalc/etc).
    const player = game.u || game.u;
    if (!game.display || !player || result?.terminalScreenOwned || game?._terminalScreenOwnedByInput) return;
    if (game.display.messageNeedsMore) {
        flush_screen(1);
        return;
    }
    // C ref: parse()/get_count() count-prefix digits keep topline cursor.
    // putstr_message() already positioned it there; skip docrt+cursorOnPlayer
    // because docrt() internally calls cursorOnPlayer and would clobber it.
    if (result?.isCountDigitWithDisplay) return;
    if (typeof game.display.renderStatus === 'function') {
        game.display.renderStatus(player);
    }
    if (typeof game.display.cursorOnPlayer === 'function') {
        game.display.cursorOnPlayer(player);
    }
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


// Internal helper: drain a multi-turn occupation until it completes or is
// interrupted by an adjacent hostile monster.
async function _drainOccupation(game, coreOpts) {
    while (game.occupation) {
        const step = await runOccupationStep(game);
        if (!step.ran) break;

        // C ref: each occupation iteration returns through moveloop's
        // once-per-player-input phase before the next occupation callback.
        // Use the normal timed-turn wrapper here so hallucination/telepathy
        // refresh ownership stays aligned with non-occupation command turns.
        await advanceTimedTurn(game, coreOpts);
        if (step.prompt) break;
    }
}

// --- Remaining allmain.c stubs ---

// cf. allmain.c:155 [static] — json_write_escaped(fp, s): JSON-escape a string
// N/A: allmain.c:155 — json_write_escaped() (no file I/O in JS)

// cf. allmain.c:175 — harness_dump_checkpoint(phase): dump game state snapshot
// N/A: allmain.c:175 — harness_dump_checkpoint() (file I/O; JS harness uses oracle/)

// cf. allmain.c:36 — early_init(argc, argv): pre-game initialization
// Implemented: allmain.js:2462 (autotranslated) + NetHackGame constructor

// cf. allmain.c:50 [static] — moveloop_preamble(resuming): pre-loop setup
// Implemented: NetHackGame.init() showLoreAndWelcome path

// cf. allmain.c:566 [static] — maybe_do_tutorial(void): tutorial prompt
// Implemented: buildStartupLorePromptFlow for key-driven lore display

// cf. allmain.c:586 — moveloop(resuming): main game loop
// Implemented: allmain.js:2472 (autotranslated) + NetHackGame.gameLoop

// cf. allmain.c:599 [static] — regen_pw(wtcap): power point regeneration
// Implemented: regen_pw_turnend (line 1127)

// cf. allmain.c:621 [static] — regen_hp(wtcap): hit point regeneration
// Ported from C's regen_hp() (allmain.c:621-675).
// Includes Upolyd branch and C turn-modulo timing for monster-form healing.
// Simplified: eel out-of-water degeneration is still not implemented.
async function regen_hp(game) {
    const player = (game.u || game.u);
    const wtcap = near_capacity(player);
    const encumbrance_ok = (wtcap < MOD_ENCUMBER || !player.umoved);
    // C ref: allmain.c:622 U_CAN_REGEN() = Regeneration || (Sleepy && u.usleep)
    const sleepyRegen = !!(player.sleepy && player.usleep);
    const can_regen = !!player.regeneration || sleepyRegen;
    let heal = 0;
    let reached_full = false;
    if (Upolyd(player)) {
        if ((player.mh || 0) < 1) {
            // C ref: allmain.c:633-634 — shouldn't happen; rehumanize
            // rehumanize() not fully ported; skip for now
        } else if ((player.mh || 0) < (player.mhmax || 0)) {
            const moves = Number.isFinite(game.turnCount) ? game.turnCount : 0;
            if (can_regen || (encumbrance_ok && !(moves % 20))) {
                heal = 1;
            }
        }
        if (heal) {
            player.mh = (player.mh || 0) + heal;
            if ((player.mh || 0) > (player.mhmax || 0)) player.mh = player.mhmax || 0;
            reached_full = (player.mh || 0) === (player.mhmax || 0);
        }
    } else if ((player.uhp || 0) < (player.uhpmax || 0) && (encumbrance_ok || can_regen)) {
        heal = ((player.ulevel || 1) + acurr(player, A_CON)) > rn2(100) ? 1 : 0;
        if (can_regen) heal += 1;
        // C ref: allmain.c:664-665 — extra heal when Sleepy and asleep
        if (sleepyRegen) heal++;
        if (heal) {
            player.uhp = (player.uhp || 0) + heal;
            if ((player.uhp || 0) > (player.uhpmax || 0)) player.uhp = player.uhpmax || 0;
            reached_full = (player.uhp || 0) === (player.uhpmax || 0);
        }
    }
    if (reached_full) {
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

// C ref: hack.c:3015 — overexert_hp(): lose 1 HP when moving while encumbered
async function overexert_hp(game) {
    const player = (game.u || game.u);
    if (player.uhp > 1) {
        player.uhp -= 1;
    } else {
        await pline('You pass out from exertion!');
        await exercise(player, A_CON, false);
        fall_asleep(-10, false);
    }
}

// C ref: allmain.c:598 — regen_pw(wtcap): regenerate power (mana) each turn
// Fires every ((MAXULEV+8-ulevel) * (wizard?3:4) / 6) turns when unencumbered.
async function regen_pw_turnend(game) {
    const player = (game.u || game.u);
    const moves = game.turnCount + 1; // svm.moves equivalent
    if (player.uen == null || player.uenmax == null) return; // pw not initialized
    if (player.uen < player.uenmax) {
        const wtcap = near_capacity(player);
        const isWizard = (player.roleMnum === PM_WIZARD);
        const interval = Math.floor((MAXULEV + 8 - (player.ulevel || 1))
                                    * (isWizard ? 3 : 4) / 6);
        const energyRegen = player.Energy_regeneration || false;
        if ((wtcap < MOD_ENCUMBER && interval > 0 && !(moves % interval))
            || energyRegen) {
            const upper = Math.floor(
                (acurr(player, A_WIS) + acurr(player, A_INT)) / 15) + 1;
            player.uen += rn1(upper, 1);
            if (player.uen > player.uenmax)
                player.uen = player.uenmax;
            // C ref: allmain.c:617-618 — interrupt multi when mana full
            if (player.uen === player.uenmax) {
                await interrupt_multi('You feel full of energy.', game);
            }
        }
    }
}

// cf. allmain.c:697 — init_sound_disp_gamewindows(void): init display/sound
// Implemented: NetHackGame.init() handles display/animation setup

// cf. allmain.c:764 — newgame(void): new game initialization
// Implemented: NetHackGame.init()

// cf. allmain.c:851 — welcome(new_game): display welcome message
// Implemented: NetHackGame.init() showLoreAndWelcome path

// cf. allmain.c:907 [static] — do_positionbar(void): update position bar
// N/A: tty position bar, not applicable to JS

// cf. allmain.c:950 [static] — interrupt_multi(msg): interrupt multi-turn action
// Implemented: allmain.js:2482

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

function buildStartupLorePromptFlow(loreLines, loreOffx, welcomeMsg, opts = {}) {
    const isDismiss = (ch) => (ch === 32 || ch === 27 || ch === 10 || ch === 13 || ch === 16);
    const showTutorial = !!opts.tutorial;
    const clearLoreOverlay = (display) => {
        if (!display) return;
        const rows = Number.isInteger(display.rows) ? display.rows : 24;
        const cols = Number.isInteger(display.cols) ? display.cols : 80;
        for (let r = 0; r < loreLines.length && r < rows - 2; r++) {
            for (let c = loreOffx; c < cols; c++) {
                if (typeof display.setCell === 'function') {
                    display.setCell(c, r, ' ', CLR_GRAY, 0);
                }
            }
        }
    };
    let stage = 'lore';
    return {
        source: 'startup_lore',
        async onKey(ch, g) {
            if (!isDismiss(ch)) return { handled: true, tookTime: false, moved: false, prompt: true };
            if (stage === 'lore') {
                if (g?._pendingNewGamePreamble) {
                    g.svc.context.rndencode = rnd(9000);
                    if (g?.u) {
                        await set_wear(g.u, null);
                        const inv = Array.isArray(g.u.inventory) ? g.u.inventory : [];
                        for (const obj of inv) {
                            if (obj) obj.pickup_prev = 0;
                        }
                        reset_justpicked(g.u.invHead || null);
                    }
                    g.seerTurn = rnd(30);
                    if (g?.u) g.u.umovement = NORMAL_SPEED;
                    initrack();
                    g._pendingNewGamePreamble = false;
                }
                clearLoreOverlay(g?.display);
                // Re-render the map that was underneath the lore overlay.
                if (g?.display && g.map && g.u && g.fov && typeof g.display.renderMap === 'function') {
                    g.display.renderMap(g.map, g.u, g.fov, g.flags);
                }
                if (g?.display && typeof g.display.renderStatus === 'function' && g.u) {
                    g.display.renderStatus(g.u);
                }
                if (g?.display && typeof g.display.cursorOnPlayer === 'function' && g.u) {
                    g.display.cursorOnPlayer(g.u);
                }
                if (g?.display && typeof g.display.putstr_message === 'function') {
                    await g.display.putstr_message(welcomeMsg);
                }
                stage = 'welcome';
                return { handled: true, tookTime: false, moved: false, prompt: true };
            }
            if (stage === 'welcome') {
                if (g?.display) {
                    if (typeof g.display.clearRow === 'function') {
                        g.display.clearRow(0);
                        g.display.clearRow(1);
                        g.display.clearRow(2);
                    }
                    if ('topMessage' in g.display) g.display.topMessage = null;
                    if ('toplines' in g.display) g.display.toplines = '';
                    if ('messageNeedsMore' in g.display) g.display.messageNeedsMore = false;
                    if ('messageNeedsMoreBoundary' in g.display) g.display.messageNeedsMoreBoundary = false;
                }
                if (g?.display && typeof g.display.renderStatus === 'function' && g.u) {
                    g.display.renderStatus(g.u);
                }
                if (g?.display && typeof g.display.cursorOnPlayer === 'function' && g.u) {
                    g.display.cursorOnPlayer(g.u);
                }
                g.pendingPrompt = null;
                if (showTutorial) {
                    await _maybeDoTutorial(g);
                }
                return { handled: true, tookTime: false, moved: false, prompt: true };
            }
            g.pendingPrompt = null;
            return { handled: true, tookTime: false, moved: false, prompt: true };
        },
    };
}

// ============================================================================
// NetHackGame — unified browser + headless game class
// cf. allmain.c early_init(), moveloop(), newgame()
// ============================================================================
export class NetHackGame {
    constructor(deps = {}) {
        setGame(this); // Mirror C's global game state — modules read gstate.game
        // C ref: rnl() accesses the global Luck macro. Set up the lazy player
        // accessor so rnl() can auto-detect luck without explicit arguments.
        setRnlPlayerAccessor(() => this.u);
        this.deps = deps;
        this.lifecycle = deps.lifecycle || {};
        this.hooks = deps.hooks || {};
        this.fov = new FOV();
        this.svc = { context: {} };
        this.gd = {};
        this.gm = {};
        this.gn = {};
        // C ref: allmain.c new_game() — svm.mvitals[i].mvflags = mons[i].geno & G_NOCORPSE
        // (other fields: born/died start at 0 via C global zero-initialization)
        this.mvitals = Array.from({ length: NUMMONS }, (_, i) => ({
            born: 0, died: 0, mvflags: (mons[i]?.geno ?? 0) & G_NOCORPSE, seen_close: false, photographed: false,
        }));
        this.flags = null; // set in init()
        this.levels = {};
        this.gameOver = false;
        this.gameOverReason = '';
        this.turnCount = 0;
        this._currentTurn = 0; // C ref: timeout.c timer reference turn
        this.moves = 0; // C ref: svm.moves starts at 0; set to 1 in u_init_role()
        this._inMklev = false; // C ref: gi.in_mklev
        this._levelDepth = 1; // depth being generated (C: implicit from mklev args)
        this._dungeonAlign = 0; // A_NONE — dungeon branch alignment for makemon
        this._alignShiftMoves = 0; // C ref: makemon.c static oldmoves cache for align_shift()
        this.wizard = false;
        this.seerTurn = 0;
        this.occupation = null;
        this._pendingPrompt = null;
        this.seed = 0;
        this.multi = 0;
        this.inDoAgain = false;
        this.commandCount = 0;
        this.cmdKey = 0;
        this.emitRunstep = (keyarg, path, cmdOverride = null) => {
            emitRunstep(this, keyarg, path, cmdOverride);
        };
        this.lastCommand = null;
        this._repeatPrefixChainActive = false;
        this._diagSeq = 0;
        this._diagMax = 512;
        this._diagEvents = [];
        this._diagListeners = new Set();
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
        this.u = new Player();
        this.map = null;
        this.display = deps.display || null;
        if (this.display && !this.display._game) {
            this.display._game = this;
        }
        // Canonical namespace aliases for state refactor campaign.
        Object.defineProperty(this, 'context', {
            configurable: true,
            enumerable: true,
            get: () => this.svc.context,
            set: (v) => { this.svc.context = v || {}; },
        });
        // game.u is the canonical hero reference (C: u).
        // game.map is the canonical level reference (C: level/levl).
        // game.player getter: 105+ references in display.js, headless.js etc.
        // still read .player. Keep until those are migrated to .u.
        Object.defineProperty(this, 'player', {
            configurable: true,
            enumerable: false,
            get: () => this.u,
            set: (v) => { this.u = v; },
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
        Object.defineProperty(this, 'pendingPrompt', {
            configurable: true,
            enumerable: true,
            get: () => this._pendingPrompt,
            set: (handler) => {
                this._pendingPrompt = handler || null;
            },
        });
        if (this.display) {
            initAnimation(this.display, { mode: 'headless', skipDelays: true });
        }
    }

    emitDiagnosticEvent(type, details = {}) {
        const event = {
            seq: ++this._diagSeq,
            type: String(type || 'diagnostic'),
            turn: Number.isFinite(this.turnCount) ? this.turnCount : 0,
            step: Number.isFinite(this.map?._replayStepIndex) ? this.map._replayStepIndex + 1 : null,
            details: details || {},
        };
        this._diagEvents.push(event);
        if (this._diagEvents.length > this._diagMax) {
            this._diagEvents.splice(0, this._diagEvents.length - this._diagMax);
        }
        for (const listener of this._diagListeners) {
            try {
                listener(event);
            } catch (_err) {
                // Keep diagnostics side-channel non-fatal.
            }
        }
        return event;
    }

    subscribeDiagnostics(listener) {
        if (typeof listener !== 'function') return () => {};
        this._diagListeners.add(listener);
        return () => {
            this._diagListeners.delete(listener);
        };
    }

    getRecentDiagnostics(limit = 50) {
        const cap = Math.max(0, Number(limit) || 0);
        if (!cap) return [];
        const start = Math.max(0, this._diagEvents.length - cap);
        return this._diagEvents.slice(start);
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
        this.fov.compute(this.map, this.u.x, this.u.y);
        this.display.renderMessageWindow();
        this.display.renderMap(this.map, this.u, this.fov, this.flags);
        this.display.renderStatus(this.u);
        this.display.cursorOnPlayer(this.u);
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
                return !!cansee_core(this.map || null, this.u || this.u || null, this.fov || null, x, y);
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
                // Format glyph: C uses numeric indices, JS uses {ch, color} objects.
                const fmtGlyph = (g) => {
                    if (g == null) return '0';
                    if (typeof g === 'number') return String(g);
                    if (typeof g === 'object') return `${g.ch || '?'}c${g.color ?? 0}`;
                    return String(g);
                };
                if (trace.type === 'tmp_at_start') {
                    pushRngLogEntry(`^tmp_at_start[mode=${p.mode},glyph=${fmtGlyph(p.glyph)}]`);
                } else if (trace.type === 'tmp_at_step') {
                    pushRngLogEntry(`^tmp_at_step[${p.x},${p.y},${fmtGlyph(p.glyph)}]`);
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
        if (this.input && typeof this.input.setDisplay === 'function') {
            this.input.setDisplay(this.display);
        }
        if (this.input && typeof this.input.setOnWaitStarted === 'function') {
            this.input.setOnWaitStarted(() => {
                const inputState = this.input?.getInputState?.() || null;
                if (!inputState?.preserveAcknowledgedTopline) {
                    clearAcknowledgedTopline(this.display);
                }
                if (typeof this.renderInputBlockedState === 'function') {
                    this.renderInputBlockedState();
                }
            });
        }

        // Wire up nhwindow infrastructure
        init_nhwindows(this.display, nhgetch, () => this._rerenderGame());
        // Display-managed --More-- waits should use raw runtime key reads to
        // nhgetch is now simple (no boundary logic), safe for more() to use.
        if (this.display && typeof this.display.setNhgetch === 'function') {
            this.display.setNhgetch(() => nhgetch());
        }
        // Handle ?reset=1 — prompt to delete all saved data
        if (urlOpts.reset) {
            await _handleReset(this);
        }

        // Load user flags (C ref: flags struct from flag.h)
        this.flags = loadFlags(urlOpts.flags || null);
        // In non-browser runtimes with a fully preselected character, default
        // to skipping the tutorial prompt unless explicitly requested. Raw
        // key-driven startup sessions need the prompt to remain active so the
        // recorded keys can answer it naturally.
        if (typeof urlOpts.tutorial !== 'boolean' && !interactiveMode && urlOpts.character) {
            this.flags.tutorial = false;
        }
        this._emitRuntimeBindings();

        // Check for saved game before RNG init.
        // Prefer manual save; fall back to autosave (crash recovery).
        const saveData = loadSave() || await nhload(() => loadAutosave());
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

        const sessionDatetime = (typeof urlOpts.datetime === 'string' && urlOpts.datetime.length === 14)
            ? urlOpts.datetime
            : yyyymmddhhmmss();
        this.fixedDatetime = sessionDatetime;
        setFixedDatetime(sessionDatetime);

        // Start keystroke recording for reproducibility
        startRecording(seed, this.flags, sessionDatetime);
        this._emitRuntimeBindings();

        // C does not display a welcome banner before chargen; keep parity.

        // Player selection
        // 8A.6: nethackrc is the canonical init format. Parse it for character
        // info, wizard flag, and game flags. Falls back to urlOpts.character
        // for legacy callers.
        if (urlOpts.nethackrc) {
            const rcParsed = parseNethackrcFull(urlOpts.nethackrc);
            if (rcParsed.wizard) this.wizard = true;
            if (!urlOpts.interactiveCharacterSelection) {
                urlOpts.character = urlOpts.character || rcParsed.character;
            }
            // Apply flags from nethackrc that aren't already set
            if (rcParsed.flags && this.flags) {
                for (const [k, v] of Object.entries(rcParsed.flags)) {
                    if (this.flags[k] === undefined) this.flags[k] = v;
                }
            }
        }
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

            let selectedRace = this.u.race;
            if (Number.isInteger(char.gender)) {
                this.u.gender = char.gender;
            } else if (typeof char.gender === 'string' && char.gender.toLowerCase() === 'female') {
                this.u.gender = FEMALE;
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

            this.u.initRole(roleIndex);
            this.u.name = char.name || 'Agent';
            this.u.race = selectedRace;

            // C ref: role.c rigid_role_checks() -- enforce forced gender.
            if (role?.forceGender === 'female') {
                this.u.gender = FEMALE;
            } else if (role?.forceGender === 'male') {
                this.u.gender = MALE;
            }

            const alignMap = { lawful: A_LAWFUL, neutral: A_NEUTRAL, chaotic: A_CHAOTIC };
            let selectedAlign = this.u.alignment;
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
            this.u.alignment = selectedAlign;

            if (urlOpts.simulateManualDirectChargen?.hasPickAlign) {
                rn2(1);
            }
        } else if (this.wizard) {
            // Wizard mode: auto-select Valkyrie (index 11)
            this.u.initRole(11); // PM_VALKYRIE
            this.u.name = 'Wizard';
            this.u.race = RACE_HUMAN;
            this.u.gender = FEMALE;
            this.u.alignment = A_NEUTRAL;
        } else {
            await _playerSelection(this);
        }

        // C ref: flags.female is the source of truth for current hero sex, and
        // polymorph code mutates the mirrored player.female state directly.
        const female = (this.u.gender === FEMALE);
        this.flags.female = female;
        this.u.female = female;

        // C ref: allmain.c moveloop_preamble() — real-world side effects.
        this.flags.moonphase = phase_of_the_moon();
        if (this.flags.moonphase === 4) { // FULL_MOON
            if (!urlOpts.character) {
                await this.display.putstr_message('You are lucky!  Full moon tonight.');
            }
            change_luck(1, this.u);
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
            change_luck(-1, this.u);
        }

        // First-level init
        this.dnum = Number.isInteger(urlOpts.startDnum) ? urlOpts.startDnum : undefined;
        this.dungeonAlignOverride = Number.isInteger(urlOpts.dungeonAlignOverride)
            ? urlOpts.dungeonAlignOverride : undefined;
        const startDlevel = Number.isInteger(urlOpts.startDlevel) ? urlOpts.startDlevel : 1;
        const { map, initResult } = await initFirstLevel(this.u, this.u.roleIndex, this.wizard, {
            startDlevel,
            startDnum: this.dnum,
            dungeonAlignOverride: this.dungeonAlignOverride,
            captureSpecialLevelCheckpoints: urlOpts.captureSpecialLevelCheckpoints === true,
        });
        this.map = map;
        if (this.map) {
            const startDnum = Number.isInteger(this.map._genDnum)
                ? this.map._genDnum
                : (Number.isInteger(this.dnum) ? this.dnum : 0);
            const startDepth = Number.isInteger(this.map._genDlevel)
                ? this.map._genDlevel
                : startDlevel;
            this.map.uz = { dnum: startDnum, dlevel: startDepth };
            if (!Number.isInteger(this.map._genDnum)) this.map._genDnum = startDnum;
            if (!Number.isInteger(this.map._genDlevel)) this.map._genDlevel = startDepth;
            this.u.uz = { dnum: startDnum, dlevel: startDepth };
            this.dnum = startDnum;
        }
        this.levels[startDlevel] = map;
        this.u.wizard = this.wizard;
        this.seerTurn = initResult.seerTurn;
        if (urlOpts.simulateManualDirectChargen?.hasTutorial) {
            await _enterTutorial(this, { direct: true });
        }

        // Apply flags
        this.u.showExp = this.flags.showexp;
        this.u.showScore = this.flags.showscore;
        this.u.showTime = this.flags.time;

        // Initial display
        this.fov.compute(this.map, this.u.x, this.u.y);
        this.display.renderMap(this.map, this.u, this.fov, this.flags);
        // C newgame() shows the initial map/status before moveloop_preamble()
        // applies set_wear() side-effects. The lore/welcome overlays preserve
        // that stale underlay, including AC:0 for fresh non-wizard starts.
        if (!this.wizard) {
            const savedAc = this.u.ac;
            this.u.ac = 0;
            try {
                this.display.renderStatus(this.u);
            } finally {
                this.u.ac = savedAc;
            }
        } else {
            this.display.renderStatus(this.u);
        }
        this.display.cursorOnPlayer(this.u);

        // C ref: moveloop_preamble() shows lore text with --More-- after the
        // first level is initialized, so the live map/status are already under
        // the overlay. Handle all non-wizard fresh starts through this common
        // pending-prompt flow.
        if (!this.wizard) {
            const roleIdx = this.u.roleIndex;
            const raceIdx = this.u.race;
            const female = this.u.gender === FEMALE;
            const align = this.u.alignment;

            let deityName = godForRoleAlign(roleIdx, align);
            let goddess = isGoddess(roleIdx, align);
            if (!deityName) {
                let donorRole;
                do { donorRole = rn2(roles.length); } while (!roles[donorRole].gods[0]);
                deityName = godForRoleAlign(donorRole, align);
                goddess = isGoddess(donorRole, align);
            }
            const godOrGoddess = goddess ? 'goddess' : 'god';
            const rankTitle = rankOf(1, roleIdx, female);
            const loreText = formatLoreText(deityName, godOrGoddess, rankTitle);
            const loreLines = loreText.split('\n');
            let maxLoreWidth = 0;
            for (const line of loreLines) {
                if (line.length > maxLoreWidth) maxLoreWidth = line.length;
            }
            const loreOffx = Math.max(0, TERMINAL_COLS - maxLoreWidth - 1);
            loreLines.push('--More--');
            this.display.renderLoreText(loreLines, loreOffx);

            const greeting = greetingForRole(roleIdx);
            const rName = roleNameForGender(roleIdx, female);
            const raceAdj = races[raceIdx].adj;
            const alignStr = alignName(align);
            let genderStr = '';
            if (roles[roleIdx].namef || roles[roleIdx].forceGender) {
                // Gender implicit in role name or forced — omit
            } else {
                genderStr = female ? 'female ' : 'male ';
            }
            // C ref: hello() uses plname directly (lowercase in wizard mode).
            const plname = this.wizard ? 'wizard' : this.u.name;
            const welcomeMsg = `${greeting} ${plname}, welcome to NetHack!  You are a ${alignStr} ${genderStr}${raceAdj} ${rName}.`;

            this.display.renderLoreText(loreLines, loreOffx);
            this._pendingNewGamePreamble = true;
            this.pendingPrompt = buildStartupLorePromptFlow(loreLines, loreOffx, welcomeMsg, {
                tutorial: this.flags.tutorial,
            });
        } else if (this.flags.tutorial) {
            await _maybeDoTutorial(this);
        }

        this._emitGameplayStart();
    }

    // Generate or retrieve a level
    // C ref: dungeon.c -- level management
    async changeLevel(depth, transitionDir = null, opts = {}) {
        const previousDnum = Number.isInteger(this.dnum)
            ? this.dnum
            : (Number.isInteger((this.map)?._genDnum) ? (this.map)._genDnum : 0);
        // C ref: makemon.c byyou = (!in_mklev && x == u.ux && y == u.uy).
        // At level-gen time in C, u.ux/u.uy are 0,0 (player not yet placed),
        // so byyou is never true during fill_zoo. In JS the player still has
        // old-level coordinates, so we clear x/y here to prevent spurious
        // enexto_core calls when a zoo cell coincidentally matches.
        // Override makemon player ctx: clear x/y so byyou is never true during fill_zoo
        const heroHasAmulet = !!(this.u?.uhave?.amulet);
        const targetDnum = Number.isInteger(opts?.targetDnum)
            ? opts.targetDnum
            : this.dnum;
        const makeLevel = Number.isInteger(targetDnum)
            ? async (d) => await mklev(dungeonDepth({ dnum: targetDnum, dlevel: d }), targetDnum, d, {
                dungeonAlignOverride: this.dungeonAlignOverride,
                heroHasAmulet,
            })
            : undefined;

        flush_screen(-1);   // C ref: do.c:1720 — suppress flushes during level transition
        await withMakemonPlayerOverrideAsync(
            { ...this.u, x: null, y: null },
            async () => await changeLevelCore(this, depth, transitionDir, { ...opts, makeLevel })
        );

        // Bones level message
        if (this.map.isBones) {
            await this.display.putstr_message('You get an eerie feeling...');
        }

        // Update display — C ref: do.c:1840 docrt() + do.c:1841 flush_screen(-1)
        this.docrt();
        flush_screen(-1);   // C ref: do.c:1841 — restore flush capability after docrt()
        flush_screen(1);    // C ref: cmd.c:1310 — update status + cursor
        // C ref: do.c:1966 check_special_room(FALSE) — called from
        // deferred_goto (do.js) after changeLevel returns.  u_entered_shop
        // runs inside check_special_room and shows the greeting there.
        // If a message is pending (shop greeting, follower "still eating/trapped"),
        // resolve it before teleport arrival feedback so key consumption stays C-aligned.
        if (this.display?.messageNeedsMore) {
            await more(this.display, { forceVisual: true });
        }
        // C ref: do.c goto_level() calls maybe_lvltport_feedback() after docrt
        // and before later arrival messages. This can consume dfr_post_msg
        // early so deferred_goto() won't print it again.
        await maybe_lvltport_feedback(this.u);
        await this.maybeShowQuestPortalCall(previousDnum, { suppressOutputForLvltport: false });
        await this.maybeShowQuestLocateHint(depth);
        if (typeof this.hooks.onLevelChange === 'function') {
            this.hooks.onLevelChange({ game: this, depth });
        }
    }

    getQuestPortalMsgId(previousDnum = null) {
        const map = (this.map);
        const player = this.u;
        if (!map || !player) return null;
        if (previousDnum === 3) return null; // QUEST
        const lev = {
            uz: {
                dnum: Number.isInteger(this.dnum) ? this.dnum : 0,
                dlevel: Number.isInteger(player.dungeonLevel) ? player.dungeonLevel : 1,
            },
        };
        if (!at_dgn_entrance('The Quest', lev)) return null;
        if (!player.uevent) player.uevent = {};
        if (!this.quest_status) this.quest_status = {};
        if (player.uevent.qcompleted || player.uevent.qexpelled || this.quest_status.leader_is_dead) return null;

        if (!player.uevent.qcalled) return 'quest_portal';
        const role = Number.isInteger(player.roleIndex) ? roles[player.roleIndex] : null;
        return role?.abbr === 'Rog' ? 'quest_portal_demand' : 'quest_portal_again';
    }

    async maybeShowQuestPortalCall(previousDnum = null, opts = {}) {
        const player = this.u;
        const msgid = this.getQuestPortalMsgId(previousDnum);
        if (!msgid || !player) return;
        if (opts?.suppressOutputForLvltport) {
            // C ref: do.c sets qcalled before com_pager("quest_portal").
            // Even when we suppress output at lvltport boundaries for capture
            // parity, preserve the quest state transition.
            if (msgid === 'quest_portal') {
                player.uevent.qcalled = true;
            }
            // Preserve C RNG seen at this transition boundary (nhlib shuffle),
            // but do not emit quest text here.
            rn2(3);
            rn2(2);
            return;
        }

        if (msgid === 'quest_portal') {
            player.uevent.qcalled = true;
            await com_pager_quest_common('quest_portal', player);
            return;
        }
        await com_pager_quest_common(msgid, player);
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
        const pos = getArrivalPosition(this.map, this.u.dungeonLevel, transitionDir);
        this.u.x = pos.x;
        this.u.y = pos.y;
    }

    // C ref: allmain.c interrupt_multi() — check if multi-command should be interrupted
    shouldInterruptMulti() {
        if ((this.context?.run || 0) > 0) return false;
        if (this.occupation) return this.shouldInterruptOccupation();
        if (monsterNearby(this.map, this.u, this.fov)) return true;
        if (this.lastHP !== undefined && this.u.uhp !== this.lastHP) {
            this.lastHP = this.u.uhp;
            return true;
        }
        this.lastHP = this.u.uhp;
        return false;
    }

    // C ref: do.c cmd_safety_prevention()
    shouldInterruptOccupation() {
        if ((this.context?.run || 0) > 0) return false;
        return monsterNearby(this.map, this.u, this.fov);
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
        // C ref: docrt() calls vision_recalc() which passes do_light_sources
        // to mark TEMP_LIT tiles for mobile light sources (lanterns, candles, etc.).
        // Without this, corridors adjacent to the player's light radius stay dark.
        this.fov.compute(this.map, this.u.x, this.u.y, do_light_sources, this.u);
        this.display.renderMap(this.map, this.u, this.fov, this.flags);
        this.display.renderStatus(this.u);
        this.display.cursorOnPlayer(this.u);
    }

    // Render input-blocked UI state (for example active text popups) without
    // replay-side rendering policy logic.
    renderInputBlockedState() {
        if (!hasActiveTextPopupWindow()) return;
        // Preserve detect/getpos NHW_TEXT overlays while blocked on input:
        // docrt() here can erase temporary detect symbols before dismissal.
        if (this.display?._lastTextPopup?.isTextWindow) return;
        if (this.display?.flags?.terrainmode & TER_DETECT) return;
        this.docrt();
        redrawActiveTextPopupWindows();
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
            level: this.u?.dungeonLevel || 0,
            turn: this.turnCount,
            player: {
                x: this.u?.x ?? 0,
                y: this.u?.y ?? 0,
                hp: this.u?.hp ?? 0,
                hpmax: this.u?.hpmax ?? 0,
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

        this.fov.compute(this.map, this.u.x, this.u.y);
        this.display.renderMap(this.map, this.u, this.fov, this.flags);
        this.display.renderStatus(this.u);
        this.display.cursorOnPlayer(this.u);
        if (typeof this.hooks.onScreenRendered === 'function') {
            this.hooks.onScreenRendered({ game: this, keyCode: code });
        }

        if (this.u.uhp <= 0) {
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
            showRepeatInterruptMore: false,
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
            level: this.u?.dungeonLevel || 0,
            turn: this.turnCount,
        };
    }

    async teleportToLevel(depth) {
        if (!this.u?.wizard) {
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
        if (this._showGameOverDisplayed) {
            return;
        }
        this._showGameOverDisplayed = true;
        await _showGameOver(this);
        this._emitGameOver();
    }

    // Main game loop — browser path
    // C ref: allmain.c moveloop() -> moveloop_core()
    async gameLoop() {
        while (!this.gameOver) {
            try {
                await this._gameLoopStep();
            } catch (e) {
                // Show error on topline and let the player continue.
                // Log to console for debugging, then re-render so the game
                // state is visible and the player can try another command.
                console.error('gameLoop error:', e);
                try {
                    await this.display.putstr_message(
                        `Program in disorder! Please report to the Menace team. (${e?.message || e})`
                    );
                    await nhgetch();
                    this.renderAndAutosave({ autosave: false, forceRender: true });
                } catch (displayErr) {
                    console.error('gameLoop recovery failed:', displayErr);
                }
            }
        }

        // Game over — delete autosave synchronously before any await so a tab
        // close at the death screen cannot restore a dead character.
        deleteAutosave();
        await this.showGameOver();
    }

    async _gameLoopStep() {
        while (true) {
            const hasPendingRunAdvanceTurn = !!this._pendingRunAdvanceTurn;
            const hasPositiveMoveContinuation = !!(this.multi > 0 && this.context?.mv && !this?.playerDied);

            // Travel continuation fallback. Keep this behind the positive-move
            // lane so armed move-continuation uses the same no-input owner.
            // Guard on context.travel: when travel terminates (nomul(0) →
            // end_running(true)), context.travel is cleared.  Without this
            // guard a stale travelPath from the just-completed travel would
            // re-trigger dotravel_target, consuming the next replay key.
            if (!hasPositiveMoveContinuation
                && this.context?.travel
                && this.travelPath && this.travelStep < this.travelPath.length) {
                const result = await dotravel_target(this);
                if (result.tookTime) {
                    await moveloop_core(this);
                }
                this.renderAndAutosave({ autosave: false, forceRender: true });
                return;
            }

            const hasTimedContinuation = hasPositiveMoveContinuation
                || hasPendingRunAdvanceTurn
                || (this.context?.move && this.multi < 0 && !(this?.playerDied))
                || (this.multi >= 0 && this.occupation);

            // C-faithful boundary ownership: if the previous iteration left a
            // command-boundary --More-- pending, consume only that dismiss key
            // before running any no-input continuation work.
            if (hasTimedContinuation && hasPendingCommandBoundaryDismiss(this)) {
                // C ref: tty_clearmsg() fires more() before continuation work.
                await more(this.display, {
                    forceVisual: true,
                    clearAfter: true,
                    readKey: () => nhgetch({
                        waitKind: 'more',
                        preserveAcknowledgedTopline: true,
                    }),
                });
                // The dismiss key owns this replay step.  Defer the no-input
                // continuation work to the following step rather than
                // batching it into the same key-owned capture boundary.
                this.renderAndAutosave({ autosave: false, forceRender: true });
                return;
            }
            if (hasTimedContinuation) {
                // C ref: tty_clearmsg() with toplin==TOPLINE_NON_EMPTY clears
                // the acknowledged message window before any no-input
                // continuation work runs.
                clearAcknowledgedTopline(this.display);
            }

            if (hasPendingRunAdvanceTurn) {
                const pending = this._pendingRunAdvanceTurn;
                this._pendingRunAdvanceTurn = null;
                await advanceTimedTurn(this, pending?.coreOpts || {});
                this.renderAndAutosave({ autosave: true });
                continue;
            }

            if (this.context?.move && this.multi < 0 && !(this?.playerDied)) {
                await runNegativeMultiStep(this, {});
                this.renderAndAutosave({ autosave: true });
                continue;
            }

            if (this.multi >= 0 && this.occupation) {
                const occStep = await runOccupationStep(this);
                if (occStep.ran) {
                    await advanceTimedTurn(this, {});
                }
                this.renderAndAutosave({ autosave: true });
                continue;
            }

            if (hasPositiveMoveContinuation) {
                const bumpHeroSeqN = () => {
                    const prior = Number.isFinite(this?.heroSeqN) ? (this.heroSeqN | 0) : 0;
                    this.heroSeqN = Math.min(7, prior + 1);
                };
                await runMovementRepeatSlice(this, {
                    coreOpts: {},
                    bumpHeroSeqN,
                });
                this.renderAndAutosave({ autosave: true });
                if (this.display?.messageNeedsMore && hasPendingCommandBoundaryDismiss(this)) {
                    return;
                }
                // C ref: moveloop_core loops without reading a new key for
                // both run and travel continuation. Use `continue` to batch
                // all continuation steps within this _gameLoopStep call,
                // preventing the replay from consuming keys between steps.
                continue;
            }

            // C ref: tty_clearmsg() — dismiss pending command-boundary message
            // acknowledgment before reading a fresh command key. Some paths
            // leave a live `--More--` boundary without the narrower
            // active-more marker set.
            if (this.display?.messageNeedsMore && hasPendingCommandBoundaryDismiss(this)) {
                const pendingPromptOwnsInput = !!(
                    this.pendingPrompt && typeof this.pendingPrompt.onKey === 'function'
                );
                if (!pendingPromptOwnsInput) {
                    const wasBoundary = !!(
                        this.display?.messageNeedsMoreBoundary || hasActiveMoreBoundary(this.display)
                    );
                    const hasQueuedCannedBoundary = !!(cmdq_peek(CQ_CANNED) && this.display?.topMessage);
                    await more(this.display, {
                        forceVisual: !!(this.display?.messageNeedsMoreBoundary),
                        clearAfter: true,
                        readKey: () => nhgetch({
                            waitKind: 'more',
                            preserveAcknowledgedTopline: true,
                        }),
                    });
                    if (wasBoundary && !hasQueuedCannedBoundary
                        && !this.display.messageNeedsMore
                        && !this.display.topMessage) {
                        this.renderAndAutosave({ autosave: false, forceRender: true });
                    }
                    // After --More-- dismiss, check for canned commands
                    if (cmdq_peek(CQ_CANNED)) {
                        const commandResult = await this.runOneCommandCycle(0);
                        if (!commandResult) return;
                        this.renderAndAutosave({ commandResult, autosave: true });
                        continue;
                    }
                    if (this.u?.Hallucination) return;
                    this.renderAndAutosave({ autosave: false, forceRender: true });
                    return;
                }
            }
            // Also handle canned-command-with-topline boundary (no --More-- but
            // canned command queued while message visible)
            if (cmdq_peek(CQ_CANNED) && this.display?.topMessage) {
                await more(this.display, {
                    forceVisual: true,
                    clearAfter: true,
                    readKey: () => nhgetch({
                        waitKind: 'more',
                        preserveAcknowledgedTopline: true,
                    }),
                });
                const commandResult = await this.runOneCommandCycle(0);
                if (!commandResult) return;
                this.renderAndAutosave({ commandResult, autosave: true });
                continue;
            }
            const firstCh = await nhgetch();
            const commandResult = await this.runOneCommandCycle(firstCh);
            if (!commandResult) return;
            this.renderAndAutosave({ commandResult, autosave: true });
            // C key ownership: if a timed command arms negative multi (for
            // example, dragging the iron ball), the continuation belongs to
            // the next key-owned replay step rather than being drained inside
            // this same _gameLoopStep call.
            if (commandResult.tookTime
                && this.context?.move
                && this.multi < 0
                && !(this?.playerDied)) {
                return;
            }
            // C ref: moveloop loops for: negative multi, occupation,
            // AND positive-multi movement (run/travel continuation).
            if (!(this.context?.move && this.multi < 0 && !(this?.playerDied))
                && !(this.multi >= 0 && this.occupation)
                && !(this.multi > 0 && this.context?.mv && !(this?.playerDied))) {
                return;
            }
        }
    }

    async runOneCommandCycle(firstCh) {
        let ch;
        let countPrefix = 0;

        // C ref: cmd.c:1687 do_repeat() — Ctrl+A repeats last command
        if (firstCh === 1) { // Ctrl+A
            return await execute_repeat_command(this, {
                showRepeatInterruptMore: true,
            });
        } else if (firstCh >= 48 && firstCh <= 57) { // '0'-'9'
            const result = await getCount(firstCh, 32767, this.display);
            countPrefix = result.count;
            ch = result.key;
            if (ch === 27) { // ESC
                this.display.clearRow(0);
                return null;
            }
        } else {
            ch = firstCh;
        }

        if (ch == null) return null;

        if (firstCh !== 1) {
            this.lastCommand = { key: ch, count: countPrefix };
        }

        return await run_command(this, ch, {
            countPrefix,
            showRepeatInterruptMore: true,
        });
    }

    renderAndAutosave({
        commandResult = null,
        autosave = false,
        forceRender = false,
    } = {}) {
        const terminalScreenOwned = !!commandResult?.terminalScreenOwned || !!this._terminalScreenOwnedByInput;
        const suppressUntimedTailRender = !forceRender
            && !terminalScreenOwned
            && !!commandResult?.suppressUntimedTailRender
            && !commandResult?.tookTime;
        if (suppressUntimedTailRender) {
            if (autosave && !this.gameOver) {
                scheduleAutosave(this); // fire-and-forget crash recovery save
            }
            return;
        }
        if (!forceRender && !terminalScreenOwned && this.display?.messageNeedsMore) {
            // C ref: tty_clearmsg() only shows the visual --More-- marker at an
            // explicit command-boundary ownership point. Timed command captures
            // can legitimately retain a pending topline without forcing
            // flush_screen(1) before the replay snapshot.
            if (commandResult?.needsMoreBoundary && this.display.messageNeedsMore) {
                this.display.messageNeedsMoreBoundary = true;
                flush_screen(1);
                return;
            }
        }
        if (!terminalScreenOwned) {
            // C ref: tty_clearmsg() clears TOPLINE_NON_EMPTY before the next
            // ordinary command-frame repaint. If we leave it in place, replay
            // captures can retain an acknowledged stale topline one step too long.
            clearAcknowledgedTopline(this.display);
        }
        if (forceRender || !terminalScreenOwned) {
            this.docrt();
        }
        if (autosave && !terminalScreenOwned && !this.gameOver) {
            scheduleAutosave(this); // fire-and-forget crash recovery save
        }
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


// Autotranslated from allmain.c:955
export async function interrupt_multi(msg, game) {
  if (game.multi > 0 && !game.svc.context.travel && !(game?.svc?.context?.run || 0)) { nomul(0, game); if (game.flags.verbose && msg) await Norep("%s", msg); }
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
      nmwidth = 27 - nmprefix.length;
      if (edmp[i].dumpflgs > 0) {
        comment = `  ${(ed[i][j].val >= 32 && ed[i][j].val <= 126) ? String.fromCharCode(ed[i][j].val) : ' '}`;
      }
      else { comment = ''; }
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
