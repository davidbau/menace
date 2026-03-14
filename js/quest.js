// quest.js -- Quest dungeon branch mechanics and NPC dialog dispatch
// cf. quest.c — onquest, nemdead, leaddead, artitouch, ok_to_quest,
//               finish_quest, leader_speaks, nemesis_speaks, nemesis_stinks,
//               quest_chat, quest_talk, quest_stat_check,
//               and static helpers on_start, on_locate, on_goal,
//               not_capable, is_pure, expulsion, chat_with_leader,
//               chat_with_nemesis, chat_with_guardian, prisoner_speaks
//
// The quest system manages entry to the role-specific quest dungeon branch:
//   - Level arrival messages (on_start/on_locate/on_goal via onquest())
//   - Eligibility checks (level, alignment purity, got_quest flag)
//   - Leader/nemesis/guardian NPC conversations (quest_chat/quest_talk)
//   - Quest completion (artitouch, finish_quest)
//   - Expulsion from quest dungeon for ineligible players
//   - nemesis_stinks() creates a gas cloud on nemesis death
//
// Key macros in quest.c:
//   Not_firsttime: on_level(&u.uz0, &u.uz) — not the first arrival
//   Qstat(x): svq.quest_status.x — quest status flag accessor
//   MIN_QUEST_LEVEL: minimum XL to get the quest (role-dependent, from quest.h)
//   MIN_QUEST_ALIGN: minimum alignment record required

import { rn2 } from './rng.js';
import { pline, verbalize } from './pline.js';
import { exercise } from './attrib.js';
import { adjalign } from './attrib.js';
import { schedule_goto } from './do.js';
import { nomul } from './hack.js';
import { carrying, fully_identify_obj, update_inventory } from './invent.js';
import { setmangry, monnear, helpless } from './mon.js';
import { Monnam, mon_nam } from './do_name.js';
import { canseemon } from './mondata.js';
import { is_quest_artifact } from './objdata.js';
import { deltrap } from './dungeon.js';
import { create_gas_cloud } from './region.js';
import { AMULET_OF_YENDOR, FAKE_AMULET_OF_YENDOR, BELL_OF_OPENING } from './objects.js';
import {
    MS_NEMESIS, MS_GUARDIAN, MS_DJINNI,
    PM_PRISONER, PM_WIZARD, mons,
} from './monsters.js';
import { MAGIC_PORTAL, STRAT_WAITMASK, UTOTYPE_PORTAL } from './const.js';
import { A_WIS } from './const.js';
import { the, xname } from './objnam.js';
import { create_nhwindow, destroy_nhwindow, putstr, display_nhwindow } from './windows.js';
import { NHW_TEXT, ATR_NONE } from './const.js';

// C: #define MIN_QUEST_LEVEL 14
const MIN_QUEST_LEVEL = 14;
// C: #define MIN_QUEST_ALIGN 20
const MIN_QUEST_ALIGN = 20;

// STRAT_WAITMASK imported from const.js

// Helper: Qstat accessor — ensures game.quest_status exists
function Qstat(game) {
    if (!game.quest_status) game.quest_status = {};
    return game.quest_status;
}

// Helper: Not_firsttime — on_level(&u.uz0, &u.uz) in C
// True if player is on the same level as previous (not first arrival)
function Not_firsttime(player) {
    // In JS, player.prevDungeonLevel tracks the previous level (u.uz0)
    // and player.dungeonLevel is current (u.uz)
    return player.prevDungeonLevel === player.dungeonLevel
        && player.prevDnum === player.dnum;
}

// ======================================================================
// Quest text stubs — qt_pager / com_pager
// The Lua-based quest text system (questpgr.c) is not ported to JS.
// These stubs produce minimal pline output for quest flow.
// ======================================================================

async function qt_pager(msgid, game, obj = null) {
    const player = (game.u || game.player);
    const isWizardRole = player?.roleMnum === PM_WIZARD
        || String(player?.roleName || '').toLowerCase() === 'wizard'
        || String(player?.role || '').toLowerCase() === 'wizard';
    if (msgid === "gotit" && isWizardRole && obj) {
        // C ref: questpgr.c com_pager_core() loads nhlib.lua, whose top-level
        // shuffle() consumes rn2(3), rn2(2) even for single-entry role text.
        rn2(3);
        rn2(2);
        const qname = the(obj.oname || xname(obj));
        const win = create_nhwindow(NHW_TEXT);
        await putstr(win, ATR_NONE, `As you touch ${qname}, its comforting power infuses you`);
        await putstr(win, ATR_NONE, "with new energy.  You feel as if you can detect others' thoughts flowing");
        await putstr(win, ATR_NONE, `through it.  Although you yearn to wear ${qname} and`);
        await putstr(win, ATR_NONE, "attack the Wizard of Yendor, you know you must return it to its rightful");
        await putstr(win, ATR_NONE, "owner, Neferet the Green.");
        await display_nhwindow(win, true);
        destroy_nhwindow(win);
        return;
    }
    // Quest text system is only partially ported; keep placeholder fallback for
    // currently unimplemented role/message combinations.
    if (msgid) await pline("[Quest: %s]", msgid);
}

async function com_pager(msgid, game) {
    // Common (non-role-specific) quest text — same stub as qt_pager
    if (msgid) {
        await pline("[Quest: %s]", msgid);
    }
}

// ======================================================================
// Static helpers
// ======================================================================

// cf. quest.c:26 [static] — on_start(): quest start-level arrival message
export async function on_start(game) {
    const qs = Qstat(game);
    const player = (game.u || game.player);
    if (!qs.first_start) {
        await qt_pager("firsttime", game);
        qs.first_start = true;
    } else if ((player.prevDnum !== player.dnum)
               || ((player.prevDungeonLevel || 0) < player.dungeonLevel)) {
        if ((qs.not_ready || 0) <= 2)
            await qt_pager("nexttime", game);
        else
            await qt_pager("othertime", game);
    }
}

// cf. quest.c:40 [static] — on_locate(): quest locate-level arrival message
export async function on_locate(game) {
    const qs = Qstat(game);
    const player = (game.u || game.player);
    // the locate messages only make sense when arriving from above
    const from_above = (player.prevDungeonLevel || 0) < player.dungeonLevel;

    if (qs.killed_nemesis) {
        return;
    } else if (!qs.first_locate) {
        if (from_above)
            await qt_pager("locate_first", game);
        // mark as seen even if arrived from below
        qs.first_locate = true;
    } else {
        if (from_above)
            await qt_pager("locate_next", game);
    }
}

// cf. quest.c:62 [static] — on_goal(): quest goal-level arrival message
async function on_goal(game) {
    const qs = Qstat(game);
    const map = (game.lev || game.map);

    if (qs.killed_nemesis) {
        return;
    } else if (!qs.made_goal) {
        await qt_pager("goal_first", game);
        qs.made_goal = 1;
    } else {
        // Check if quest artifact is present on the level (floor, minvent, buried)
        // In C this uses find_quest_artifact() with OBJ_FLOOR|OBJ_MINVENT|OBJ_BURIED
        let qarti = find_quest_artifact_on_level(map);
        await qt_pager(qarti ? "goal_next" : "goal_alt", game);
        if (qs.made_goal < 7)
            qs.made_goal++;
    }
}

// Simplified find_quest_artifact on current level
// Searches floor objects and monster inventories
function find_quest_artifact_on_level(map) {
    if (!map) return null;
    // Check floor objects
    if (map.objects) {
        for (const objList of Object.values(map.objects)) {
            if (Array.isArray(objList)) {
                for (const obj of objList) {
                    if (obj && is_quest_artifact(obj)) return obj;
                }
            }
        }
    }
    // Check monster inventories
    if (map.monsters) {
        for (const mon of map.monsters) {
            if (mon && !mon.dead && mon.minvent) {
                for (const obj of mon.minvent) {
                    if (obj && is_quest_artifact(obj)) return obj;
                }
            }
        }
    }
    return null;
}

// cf. quest.c:147 [static] — not_capable(): minimum XL check
// Autotranslated from quest.c:146
export function not_capable(player) {
  return  (player.ulevel < MIN_QUEST_LEVEL);
}

// cf. quest.c:153 [static] — is_pure(talk): alignment purity check
// Returns: 1=pure, 0=impure (record too low), -1=converted
function is_pure(talk, game) {
    const player = (game.u || game.player);
    const original_alignment = player.ualignbase_original != null
        ? player.ualignbase_original : player.alignment;
    const current_base = player.ualignbase_current != null
        ? player.ualignbase_current : player.alignment;
    const alignRecord = player.alignmentRecord || 0;

    // In C, wizard mode shows debug info and offers alignment adjustment.
    // We skip wizard-mode dialog in JS.

    const purity = (alignRecord >= MIN_QUEST_ALIGN
                    && player.alignment === original_alignment
                    && current_base === original_alignment)
                       ? 1
                       : (current_base !== original_alignment) ? -1 : 0;
    return purity;
}

// cf. quest.c:186 [static] — expulsion(seal): force-return from quest branch
export function expulsion(seal, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);
    const qs = Qstat(game);

    // In C, this finds the quest branch and schedules a goto to the parent dungeon.
    // In JS, the quest branch structure may differ. We use schedule_goto with
    // the quest start level or parent dungeon level.
    const portal_flag = (player.uevent && player.uevent.qexpelled) ? 0 : UTOTYPE_PORTAL;

    // Find the destination — in C this is the parent side of "The Quest" branch.
    // In JS, we go back to the level the player entered from, or quest start depth.
    const dest = player.quest_entry_level || player.prevDungeonLevel || 1;

    if (seal) {
        // UTOTYPE_RMPORTAL flag
    }

    nomul(0, game); // stop running
    schedule_goto(player, dest, portal_flag, null, null);

    if (seal) {
        const reexpelled = (player.uevent && player.uevent.qexpelled) ? 1 : 0;
        if (!player.uevent) player.uevent = {};
        player.uevent.qexpelled = 1;

        // Remove quest from dungeon overview
        // C: remdun_mapseen(quest_dnum) — not ported to JS
        // TODO: remdun_mapseen when dungeon overview is ported

        // Delete the magic portal on this level
        if (map && map.traps) {
            for (let i = 0; i < map.traps.length; i++) {
                const t = map.traps[i];
                if (t && t.ttyp === MAGIC_PORTAL) {
                    deltrap(map, t);
                    break;
                }
            }
        }
    }
}

// ======================================================================
// Exported functions
// ======================================================================

// cf. quest.c:89 — onquest(): dispatch arrival messages for quest levels
// Called on level change; does nothing if qcompleted or Not_firsttime.
export async function onquest(game) {
    const player = (game.u || game.player);
    const qs = Qstat(game);

    if ((player.uevent && player.uevent.qcompleted) || Not_firsttime(player))
        return;

    // In C, these check dungeon topology:
    //   Is_special, Is_qstart, Is_qlocate, Is_nemesis
    // In JS, we check map.quest_level_type if set by level generation.
    const map = (game.lev || game.map);
    if (!map || !map.quest_level_type)
        return;

    switch (map.quest_level_type) {
    case 'start':
        await on_start(game);
        break;
    case 'locate':
        await on_locate(game);
        break;
    case 'goal':
    case 'nemesis':
        await on_goal(game);
        break;
    }
}

// cf. quest.c:107 — nemdead(): nemesis was killed
// Autotranslated from quest.c:106
export async function nemdead() {
  // TODO: Qstat accessor needs game param; stub for now
  // if (!game.quest_status?.killed_nemesis) { game.quest_status.killed_nemesis = true; await qt_pager("killed_nemesis"); }
}

// cf. quest.c:116 — leaddead(): quest leader was killed
// Autotranslated from quest.c:115
export function leaddead() {
  // TODO: Qstat accessor needs game param; stub for now
  // if (!game.quest_status?.killed_leader) { game.quest_status.killed_leader = true; }
}

// cf. quest.c:125 — artitouch(obj): player first touches quest artifact
export async function artitouch(obj, game) {
    const qs = Qstat(game);
    const player = (game.u || game.player);
    if (!qs.touched_artifact) {
        // In C: observe_object(obj) so blind player gets it named
        // observe_object not yet ported globally; stub
        // Only give this message once
        qs.touched_artifact = true;
        await qt_pager("gotit", game, obj);
        await exercise(player, A_WIS, true);
    }
}

// cf. quest.c:140 — ok_to_quest(): quest dungeon entry eligibility
// Returns true if player is allowed to enter quest dungeon.
// Autotranslated from quest.c:139
export async function ok_to_quest() {
  return (((Qstat(got_quest) || Qstat(got_thanks)) && is_pure(false) > 0) || Qstat(killed_leader));
}

// cf. quest.c:225 — finish_quest(obj): handle quest artifact return to leader
// obj=null: player has Amulet; obj=quest artifact: completion;
// obj=other item: leader identifies it.
export async function finish_quest(obj, game) {
    const player = (game.u || game.player);
    const qs = Qstat(game);

    if (obj && !is_quest_artifact(obj)) {
        // Tossed an invocation item (or [fake] AoY) at the quest leader
        if (player.deaf) return;
        fully_identify_obj(obj);
        if (obj.otyp === AMULET_OF_YENDOR) {
            await qt_pager("hasamulet", game);
        } else if (obj.otyp === FAKE_AMULET_OF_YENDOR) {
            await verbalize(
                "Sorry to say, this is a mere imitation of the true Amulet of Yendor.");
        } else {
            await verbalize("Ah, I see you've found %s.", the(xname(obj)));
        }
        return;
    }

    if (player.uhave && player.uhave.amulet) {
        // Has the amulet in inventory
        await qt_pager("hasamulet", game);
        // Leader IDs the real amulet but ignores fakes
        const otmp = carrying(AMULET_OF_YENDOR, player);
        if (otmp) {
            fully_identify_obj(otmp);
            update_inventory(player);
        }
    } else {
        // Normal quest completion
        await qt_pager(!qs.got_thanks ? "offeredit" : "offeredit2", game);
        // Should have obtained bell during quest
        if (!carrying(BELL_OF_OPENING, player))
            await com_pager("quest_complete_no_bell", game);
    }
    qs.got_thanks = true;

    if (obj) {
        if (!player.uevent) player.uevent = {};
        player.uevent.qcompleted = 1; // you did it!
        fully_identify_obj(obj);
        update_inventory(player);
    }
}

// cf. quest.c:282 [static] — chat_with_leader(mtmp): leader conversation logic
async function chat_with_leader(mtmp, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);
    const qs = Qstat(game);

    if (!mtmp.peaceful || qs.pissed_off)
        return;

    // Rule 0: Cheater checks
    if (player.uhave && player.uhave.questart && !qs.met_nemesis)
        qs.cheater = true;

    // Rule 1: You've gone back with/without the amulet (got_thanks already set)
    if (qs.got_thanks) {
        if (player.uhave && player.uhave.amulet)
            await finish_quest(null, game);
        else
            await qt_pager("posthanks", game);

    // Rule 3: You've got the artifact and are back to return it
    } else if (player.uhave && player.uhave.questart) {
        // Find the quest artifact in inventory
        let qarti_obj = null;
        const inv = player.inventory || [];
        for (const otmp of inv) {
            if (otmp && is_quest_artifact(otmp)) {
                qarti_obj = otmp;
                break;
            }
        }
        await finish_quest(qarti_obj, game);

    // Rule 4: You haven't got the artifact yet but have the quest
    } else if (qs.got_quest) {
        await qt_pager("encourage", game);

    // Rule 5: You aren't yet acceptable - or are you?
    } else {
        let purity = 0;

        if (!qs.met_leader) {
            await qt_pager("leader_first", game);
            qs.met_leader = true;
            qs.not_ready = 0;
        } else {
            await qt_pager("leader_next", game);
        }

        // The quest leader might have passed through the portal into
        // the regular dungeon; remaining checks don't apply there.
        // In C: if (!on_level(&u.uz, &qstart_level)) return;
        // In JS: check if current level is the quest start level
        if (map && map.quest_level_type !== 'start')
            return;

        if (not_capable(player)) {
            await qt_pager("badlevel", game);
            await exercise(player, A_WIS, true);
            expulsion(false, game);
        } else if ((purity = is_pure(true, game)) < 0) {
            if (!qs.pissed_off) {
                await com_pager("banished", game);
                qs.pissed_off = true;
                expulsion(false, game);
            }
        } else if (purity === 0) {
            await qt_pager("badalign", game);
            qs.not_ready = 1;
            await exercise(player, A_WIS, true);
            expulsion(false, game);
        } else {
            // You are worthy!
            await qt_pager("assignquest", game);
            await exercise(player, A_WIS, true);
            qs.got_quest = true;
        }
    }
}

// cf. quest.c:357 — leader_speaks(mtmp): leader NPC response to chat
export async function leader_speaks(mtmp, game) {
    const qs = Qstat(game);
    const map = (game.lev || game.map);

    // Maybe you attacked leader?
    if (!mtmp.peaceful) {
        if (!qs.pissed_off) {
            await qt_pager("leader_last", game);
        }
        qs.pissed_off = true;
        mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
    }
    // The quest leader might have passed through the portal
    // into the regular dungeon; if so, don't do "backwards expulsion"
    if (!map || map.quest_level_type !== 'start')
        return;

    if (!qs.pissed_off)
        await chat_with_leader(mtmp, game);
}

// cf. quest.c:380 [static] — chat_with_nemesis(): nemesis taunt dialog
export async function chat_with_nemesis(game) {
    const qs = Qstat(game);
    await qt_pager("discourage", game);
    if (!qs.met_nemesis)
        qs.met_nemesis = true;
}

// cf. quest.c:388 — nemesis_speaks(): nemesis NPC response to chat
// Autotranslated from quest.c:388
export async function nemesis_speaks(player) {
  if (!Qstat(in_battle)) {
    if (player.uhave.questart) await qt_pager("nemesis_wantsit");
    else if (Qstat(made_goal) === 1 || !Qstat(met_nemesis)) await qt_pager("nemesis_first");
    else if (Qstat(made_goal) < 4) await qt_pager("nemesis_next");
    else if (Qstat(made_goal) < 7) await qt_pager("nemesis_other");
    else if (!rn2(5)) await qt_pager("discourage");
    if (Qstat(made_goal) < 7) Qstat(made_goal)++;
    // TODO: game.quest_status.met_nemesis = true;
  }
  else if (!rn2(5)) await qt_pager("discourage");
}

// cf. quest.c:411 — nemesis_stinks(mx, my): gas cloud on nemesis death
// Autotranslated from quest.c:411
export async function nemesis_stinks(mx, my, game) {
  let save_mon_moving = game.svc.context.mon_moving;
  game.svc.context.mon_moving = true;
  await create_gas_cloud(mx, my, 5, 8);
  game.svc.context.mon_moving = save_mon_moving;
}

// cf. quest.c:427 [static] — chat_with_guardian(): guardian NPC dialog
export async function chat_with_guardian(game) {
    const qs = Qstat(game);
    const player = (game.u || game.player);
    if (player.uhave && player.uhave.questart && qs.killed_nemesis)
        await qt_pager("guardtalk_after", game);
    else
        await qt_pager("guardtalk_before", game);
}

// cf. quest.c:437 [static] — prisoner_speaks(mtmp): prisoner awakening
export async function prisoner_speaks(mtmp, game) {
    const player = (game.u || game.player);
    const map = (game.lev || game.map);

    if ((mtmp.data || mtmp.type) === mons[PM_PRISONER]
        && ((mtmp.mstrategy || 0) & STRAT_WAITMASK)) {
        // Awaken the prisoner
        if (canseemon(mtmp, player))
            await pline("%s speaks:", Monnam(mtmp));
        // C: SetVoice(mtmp, 0, 80, 0) — voice system not ported
        await verbalize("I'm finally free!");
        mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
        mtmp.peaceful = true;

        // Your god is happy...
        adjalign(player, 3);

        // ...But the guards are not
        // C: angry_guards(FALSE) — not yet ported
        // TODO: angry_guards when guard system is ported
    }
}

// cf. quest.c:459 — quest_chat(mtmp): dispatch chat to quest NPC
export async function quest_chat(mtmp, game) {
    const qs = Qstat(game);

    if (mtmp.m_id === qs.leader_m_id) {
        await chat_with_leader(mtmp, game);
        // Leader might have become pissed during the chat
        if (qs.pissed_off)
            setmangry(mtmp, false, (game.lev || game.map), (game.u || game.player));
        return;
    }
    switch ((mtmp.data || mtmp.type) ? (mtmp.data || mtmp.type).msound : 0) {
    case MS_NEMESIS:
        await chat_with_nemesis(game);
        break;
    case MS_GUARDIAN:
        await chat_with_guardian(game);
        break;
    default:
        // impossible("quest_chat: Unknown quest character %s.", mon_nam(mtmp));
        break;
    }
}

// cf. quest.c:481 — quest_talk(mtmp): dispatch proactive NPC talk
// Autotranslated from quest.c:480
export async function quest_talk(mtmp) {
  if (mtmp.m_id === Qstat(leader_m_id)) { await leader_speaks(mtmp); return; }
  switch (mtmp.data.msound) {
    case MS_NEMESIS:
      await nemesis_speaks();
    break;
    case MS_DJINNI:
      await prisoner_speaks(mtmp);
    break;
    default:
      break;
  }
}

// cf. quest.c:499 — quest_stat_check(mtmp): update nemesis battle status
// Autotranslated from quest.c:499
export function quest_stat_check(mtmp, player) {
  if (mtmp.data.msound === MS_NEMESIS) Qstat(in_battle) = (!helpless(mtmp) && monnear(mtmp, player.x, player.y));
}
