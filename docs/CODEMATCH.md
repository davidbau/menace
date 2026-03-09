# Code Match: NetHack C to JS Correspondence

This document tracks the mapping between NetHack C source files (`nethack-c/src/*.c`)
and corresponding JavaScript files (`js/*.js`) in this JS port.

**See also:** [C_PARITY_WORKLIST.md](C_PARITY_WORKLIST.md) tracks active parity
debugging by domain (which functions are diverging and which issues track them).
This document tracks structural coverage (which C files/functions have JS counterparts).

**Goal**: Every C file containing game logic should have a corresponding JS file with
the same name, and every function in the C file should have a corresponding function
with the same name in the JS file (where applicable).

**Status legend**:
- `[ ]` No JS file yet
- `[~]` JS file exists but needs alignment (function names/structure don't match C)
- `[a]` Aligned — JS file matches C naming, but some functions not yet implemented
- `[p]` Present — all functions exist, some with partial implementations
- `[x]` Complete — all functions fully implemented at parity
- `[N/A]` Not applicable (system/platform code with no JS equivalent)

**Note on .h files**: C header files define types, constants, and function prototypes.
In JS, these are handled by module exports. Constants and data structures from headers
are documented in the corresponding .js file rather than in separate files.

**Note on .lua files**: NetHack uses Lua for special level definitions. The JS port
handles these via `js/levels/` and `js/special_levels.js`. These are data-driven and
don't follow the same 1:1 C→JS mapping pattern.

---

## C Source Files

### Game Core

| Status | C File | JS File | Notes |
|--------|--------|---------|-------|
| `[~]` | allmain.c | allmain.js | Main game loop, newgame, moveloop. JS: chargen UI split into `chargen.js`; browser entry point in `nethack.js`. `moveloop_core()` and deferred-turn execution are now async to support awaited animation timing in monster-turn paths `showLoreAndWelcome` parity added to headless init path: renders role lore text with `--More--` then queues welcome greeting message before gameplay, matching C `moveloop_preamble()` behavior. |
| `[N/A]` | alloc.c | — | Memory allocation (nhalloc, nhfree). JS uses GC |
| `[a]` | apply.c | apply.js | Applying items. handleApply (doapply) with isApplyCandidate/isApplyChopWeapon/isApplyPolearm/isApplyDownplay helpers; `tmp_at` overlays now wired for blinding-ray and polearm/grapple target highlighting callsites, with blinding-ray frames now using awaited `nh_delay_output()`. `#apply` wand flow now routes through `do_break_wand` to async `zap.break_wand` and consumes the wand via `useupall()` |
| `[p]` | artifact.c | artifact.js | Artifact system. Generated data table (artifacts.js) with artilist[], SPFX_*, ART_* constants. ~70 functions implemented: existence tracking (init/exist/found/find/mk_artifact), pure predicates (spec_ability, confers_luck, arti_reflects, shade_glare, restrict_name, attacks, defends, protects, arti_immune, artifact_has_invprop, arti_cost, is_art, permapoisoned, spec_m2), combat (spec_applies, bane_applies, spec_abon, spec_dbon — wired into uhitm/mhitm/mhitu), discovery, glow/Sting. Stubs: set_artifact_intrinsic, Mb_hit, doinvoke, arti_invoke, all invoke_* functions, retouch_object/equipment |
| `[~]` | attrib.c | attrib.js | Attribute system. JS: partially in `attrib_exercise.js` |
| `[~]` | ball.c | ball.js | Ball & chain handling |
| `[a]` | bones.c | bones.js | Bones file save/load. All 9 functions aligned; 3 static TODO (no_bones_level, goodfruit, fixuporacle) |
| `[~]` | botl.c | botl.js | Bottom status line |
| `[x]` | calendar.c | calendar.js | Time, moon phase, Friday 13th, night/midnight. Affects gameplay |
| `[N/A]` | cfgfiles.c | — | Config file parsing. JS: `storage.js` handles config differently |
| `[a]` | cmd.c | cmd.js | Command dispatch. rhack() dispatches all key/command input; handleExtendedCommand (doextcmd); prefix commands (m/F/G/g). `input.js` handles low-level input and cmdq primitives (`cmdq_add_*`, `cmdq_pop/peek/copy/clear`, `cmdq_shift/reverse`) with `allmain.execute_repeat_command()` wired for `CQ_REPEAT` replay (`Ctrl+A`/`#repeat`). ~140 C functions remain N/A (mostly key binding/mouse) |
| `[N/A]` | coloratt.c | — | Terminal color attribute mapping |
| `[N/A]` | date.c | — | Build date/version stamps |
| `[~]` | dbridge.c | dbridge.js | Drawbridge mechanics |
| `[~]` | decl.c | decl.js | Global variable declarations. JS: spread across modules |
| `[a]` | detect.c | detect.js | Detection spells and scrolls. dosearch0 and map_redisplay implemented (RNG-parity + C-faithful redisplay/reconstrain path); ~40 functions TODO |
| `[~]` | dig.c | dig.js | Digging mechanics. `zap_dig()` wand traversal now uses awaited `nh_delay_output()` boundaries in interactive mode (headless still skips delays) |
| `[~]` | display.c | display.js | Display/rendering. `tmp_at()`/`nh_delay_output` lifecycle now follows C `display.c` semantics more closely (DISP_FLASH vs DISP_ALWAYS visibility, per-step flush, BACKTRACK cleanup timing, map-overlay restore path). Transient numeric glyph decoding now follows C `display.h` glyph ranges (monster/object/cmap/zap/swallow/explosion/warning) via `temp_glyph.js`; explosion glyph blocks decode with per-explosion-type color phases and zap glyph blocks now decode per zap-type color groups (magic/fire/cold/sleep/death/lightning/poison/acid) rather than a single shared beam color. Headless overlay handling mirrors browser stack semantics for nested temp glyphs. `display_monster`/`display_warning`/`warning_of`/`show_mon_or_warn`/`show_glyph`/`mon_overrides_region` now wired as callable display helpers (context-aware, no undefined globals), and `newsym` no longer upgrades WARNING-only sensing into monster glyphs (warning glyph path now preserved). Remaining divergence is full mapglyph/windowport detail (pet/infravision/status overlays and tty/windowport edge behavior) |
| `[N/A]` | dlb.c | — | Data librarian (file bundling). Not needed in JS |
| `[a]` | do.c | do.js | Miscellaneous actions. handleDrop/handleDownstairs/handleUpstairs (dodrop/dodown/doup); stair transitions now reproduce C's blocking `--More--` acknowledgment via `waitForStairMessageAck()` (`goto_level()` → `docrt()` → `display_nhwindow(WIN_MESSAGE,TRUE)`); ~45 functions TODO |
| `[~]` | do_name.c | do_name.js | Naming things (docallcmd, do_mgivenname) |
| `[~]` | do_wear.c | do_wear.js | Wearing/removing armor and accessories. Multi-slot handleWear/handlePutOn/handleTakeOff/handleRemove; canwearobj, cursed_check, find_ac. Equipment on/off effects implemented for all slot types: Boots (speed/stealth/fumble/levitation with messages and makeknown), Cloaks (stealth/displacement/invisibility/protection), Helmets (brilliance/telepathy/dunce cap), Gloves (fumbling/power/dexterity), all 28 ring types (resistances, teleport, polymorph, conflict, etc. with extrinsic tracking), Amulets (ESP, life saving, strangulation, change, etc.). Uses toggle_extrinsic/toggle_stealth/toggle_displacement helpers. adj_abon and learnring implemented. Remaining gaps: float_up/float_down for levitation, vision system calls (see_monsters, newsym), cockatrice corpse wielding check, multi-takeoff(A), armor destruction. |
| `[a]` | dog.c | dog.js | Pet behavior. dogfood/makedog/mon_arrive in dog.js; losedogs/keepdogs/migrate TODO |
| `[a]` | dogmove.c | dogmove.js | Pet movement AI. All functions except `quickmimic` |
| `[a]` | dokick.c | kick.js | Kicking mechanics. handleKick (dokick) approximation; full kick effects TODO |
| `[a]` | dothrow.c | dothrow.js | Throwing mechanics. handleThrow/handleFire (dothrow/dofire), promptDirectionAndThrowItem (throwit), ammoAndLauncher, DIRECTION_KEYS; throw flight now uses `tmp_at(DISP_FLASH)` + `nh_delay_output`-boundary frames, including awaited projectile-frame timing in the active throw command path and awaited per-step timing in `throwit` paths (legacy `nowait` path removed there). Boomerang visuals now follow C `boomhit` structure with `DISP_FLASH` + per-step `DISP_CHANGE` toggling (`S_boomleft/right`) and awaited frame boundaries; tethered-weapon backtrack cleanup now uses awaited async `tmp_at(DISP_END, BACKTRACK)` timing in interactive mode. ~30 functions TODO |
| `[a]` | drawing.c | symbols.js | Symbol/glyph drawing tables and lookup functions. Auto-generated by `gen_symbols.py` into `symbols.js` (defsyms[], DEF_*, S_stone..S_expl_br, MAXPCHARS, glyph offset constants GLYPH_*_OFF, SYM_OFF_*). S_* monster class constants (S_ANT..S_MIMIC_DEF, MAXMCLASSES) canonical home is `monsters.js`. 3 lookup functions (def_char_to_objclass, def_char_to_monclass, def_char_is_furniture) TODO |
| `[~]` | dungeon.c | dungeon.js | Dungeon structure and level management |
| `[a]` | eat.c | eat.js | Eating mechanics. handleEat (doeat) implemented; ~50 functions TODO |
| `[~]` | end.c | end.js | Game over, death, scoring |
| `[a]` | engrave.c | engrave.js | Engraving mechanics. handleEngrave (doengrave) approximation, maybeSmudgeEngraving (wipe_engr_at); engrave_data.js has text data; ~30 functions TODO |
| `[a]` | exper.c | exper.js | Experience and leveling. newuexp, newexplevel, pluslvl, losexp, newpw, newhp, enermod implemented; experience, more_experienced, rndexp TODO. Role/race hpadv/enadv_full/xlev data in player.js. |
| `[p]` | explode.c | explode.js | Explosion effects. All 9 functions present: adtyp_to_expltype, explosionmask (stub), engulfer_explosion_msg (stub), explode (3x3 area with resistance checks and C-style `tmp_at(DISP_BEAM/DISP_CHANGE)` frame animation with awaited per-phase `nh_delay_output()`), scatter (stub), splatter_burning_oil, explode_oil, mon_explodes, ugolemeffects (stub) |
| `[~]` | extralev.c | extralev.js | Special level generation helpers now in `extralev.js`: `corr`, `roguejoin`, `miniwalk`, `roguecorr`, `makerogueghost`, and `makeroguerooms`; rogue special-level generator now calls `makeroguerooms` directly |
| `[N/A]` | files.c | — | File I/O operations. JS: `storage.js` |
| `[a]` | fountain.c | fountain.js | Fountain effects. drinkfountain/dryup implemented (RNG-parity); ~12 functions TODO |
| `[~]` | getpos.c | getpos.js | Position selection UI. Core highlight callback lifecycle wired (`getpos_sethilite`, toggle, refresh, cleanup) and interactive cursor loop implemented (`getpos_async`: vi/arrow movement, pick/cancel, redraw/help, filter cycle, C-style target-class next/prev keys `m/M o/O d/D x/X i/I v/V`, typed map-symbol cycling forward/backward, and NHW_MENU-backed `=` target picking). `getloc_filter` handling now applies basic view/area gating in target gathering, target cycling, and map-symbol searches. Helper surfaces `getpos_getvalids_selection`, `getpos_help_keyxhelp`, `getpos_help`, and `getpos_menu` now exist in partial form. Full C parity for keybindings/target classes/filter-area behavior/help text details remains partial |
| `[~]` | glyphs.c | glyphs.js | Glyph system. JS: partially in `display.js`, `symbols.js` (glyph offsets), `const.js` |
| `[a]` | hack.c | hack.js | Core movement and actions. C-structure entry points now explicit: `domove`, `domove_core`, `do_run`, `do_rush`, `lookaround`, `findtravelpath` (with `TRAVP_*` modes), travel setup (`dotravel`/`dotravel_target`), and spot/capacity helpers. Behavior remains partial vs C in many edge paths (~70 TODOs), but structure and naming fidelity improved. |
| `[a]` | hacklib.c | hacklib.js | String/char utilities. All C functions implemented; in-place string ops return new strings in JS |
| `[~]` | iactions.c | iactions.js | Item actions context menu |
| `[~]` | insight.c | insight.js | Player knowledge/enlightenment |
| `[a]` | invent.c | invent.js | Inventory management. handleInventory/buildInventoryOverlayLines/compactInvletPromptChars (ddoinv/display_inventory/compactify/getobj/ggetobj); ~18 functions TODO |
| `[x]` | isaac64.c | isaac64.js | ISAAC64 PRNG. All 8 functions matched |
| `[~]` | light.c | light.js | Light source management |
| `[a]` | lock.c | lock.js | Lock picking and door opening. handleForce/handleOpen/handleClose (doforce/doopen/doclose) approximations; ~15 functions TODO |
| `[N/A]` | mail.c | — | In-game mail system (uses real mail on Unix) |
| `[a]` | makemon.c | makemon.js | Monster creation. Core functions aligned; clone_mon/propagate TODO |
| `[p]` | mcastu.c | mcastu.js | Monster spellcasting. All 14 functions present: castmu (full spell selection pipeline with fumble check), buzzmu (beam path via zap.buzz), choose_magic_spell, choose_clerical_spell, cast_wizard_spell, cast_cleric_spell, m_cure_self, touch_of_death, death_inflicted_by, cursetxt (stub), is_undirected_spell, spell_would_be_useless, aggravation (stub), curse_objects (stub) |
| `[N/A]` | mdlib.c | — | Metadata library utilities |
| `[a]` | mhitm.c | mhitm.js | Monster-vs-monster combat. mattackm/hitmm/mdamagem/passivemm/fightm implemented (m-vs-m path); RNG parity for pets in dogmove.js; monCombatName per-monster visibility pronouns; rustm (full erode_obj dispatch), mdisplacem (position swap + petrification), engulf_target, gulpmm (simplified), mon_poly (simplified); artifact spec_dbon wired into mdamagem. gazemu/gulpmm full effects TODO |
| `[a]` | mhitu.c | mhitu.js | Monster-vs-hero combat. `mattacku` restructured to match `hitmu()` flow; `hitmsg`, `mhitm_knockback`, `mhitu_adtyping` dispatcher, ~30 AD_* handlers (phys/fire/cold/elec/acid/stck/plys/slee/conf/stun/blnd/drst/drli/dren/drin/slow/ston etc.) implemented with real effects; `mpoisons_subj`, `u_slow_down`, `wildmiss`, `getmattk` (attack substitution), `assess_dmg`, `passiveum` (hero passive counter); `AD_SGLD`→`stealgold`, `AD_SEDU`→`steal`, `AD_RUST/CORR/DCAY`→`erode_obj` wired; artifact `spec_dbon` wired into `mhitu_ad_phys`; `gazemu`/`gulpmu`/`expels`/`summonmu`/`doseduce` still partial |
| `[a]` | minion.c | minion.js | Minion summoning. `newemin`/`free_emin`, `monster_census`, `dprince`/`dlord`/`llord`/`lminion`/`ndemon` (demon hierarchy selectors), `msummon` (summon demon/minion by type), `summon_minion` (alignment-based summoning with talk) — 10 functions. `demon_talk`, `bribe`, guardian angel gain/lose TODO. |
| `[~]` | mklev.c | mklev.js | Level generation. Helpers moved to `mklev.js`: door/door-position (`mkroom_cmp`, `bydoor`, `okdoor`, `good_rm_wall_doorpos`, `finddpos_shift`, `finddpos`, `maybe_sdoor`), stairs/feature placement (`mkstairs`, `generate_stairs*`, `cardinal_nextto_room`, `place_niche`, `occupied`, `find_okay_roompos`, `mkfount`, `mksink`, `mkaltar`, `mkgrave`), and niche pipeline (`makeniche`, `make_niches`, `makevtele`); remaining generation pipeline still in `dungeon.js` |
| `[~]` | mkmap.c | mkmap.js | Map generation algorithms now implemented in `mkmap.js` (`init_map`, `init_fill`, `get_map`, `pass_*`, `flood_fill_rm`, `join_map`, `finish_map`, `mkmap`, room cleanup/removal); `sp_lev.js` now calls `mkmap.js` directly |
| `[~]` | mkmaze.c | mkmaze.js | Maze generation. Core helpers plus region-placement path (`is_exclusion_zone`, `bad_location`, `put_lregion_here`, `place_lregion`) and maze generation path (`makemaz`, `create_maze`, `populate_maze`, `maze0xy`, `maze_remove_deadends`, `mazexy`, `pick_vibrasquare_location`) now live in `mkmaze.js`; protofile special-level load path and water-plane runtime scaffold are implemented (remaining C matrix details still pending) |
| `[a]` | mkobj.c | mkobj.js | Object creation. mksobj/mkobj/mkcorpstat/xname/doname/weight/Is_container implemented; BUC functions exported (bless/unbless/curse/uncurse/blessorcurse/bcsign/set_bknown); erosion predicates exported (is_flammable/is_rustprone/is_rottable/is_corrodeable/is_crackable/erosion_matters); splitobj, container_weight added; ~30 functions TODO |
| `[~]` | mkroom.c | mkroom.js | Room generation. `mkroom.js` now owns `do_mkroom`, `pick_room`, `mkzoo`, `mkswamp`, `invalid_shop_shape`, `mkshop`, `mktemple`, `mkundead`, search/type/save/restore helpers (`search_special`, `cmap_to_type`, `save_room(s)`, `rest_room(s)`), and zoo/room population selectors (`squadmon`, `courtmon`, `morguemon`, `antholemon`, `mk_zoo_thronemon`) plus room predicates/helpers (`isbig`, `has_dnstairs`, `has_upstairs`, `nexttodoor`, `shrine_pos`) and room-coordinate helpers (`somex`, `somey`, `inside_room`, `somexy`, `somexyspace`) |
| `[a]` | mon.c | mon.js | Monster lifecycle: movemon, mfndpos (flag-based), mm_aggression, corpse_chance, passivemm, hider premove, zombie_maker/zombie_form/undead_to_corpse/genus/pm_to_cham; death chain: mlifesaver/lifesaved_monster/set_mon_min_mhpmax/check_gear_next_turn/m_detach/mondead_full/mondied/mongone/monkilled/xkilled/killed/make_corpse; alertness: wake_msg/wakeup/seemimic/wake_nearto_core/wake_nearto/wake_nearby/setmangry; turn processing: healmon/meatbox/m_consume_obj/meatmetal/meatobj/meatcorpse/minliquid/mpickgold/can_touch_safely/mon_give_prop/mon_givit/mcalcdistress; visibility: m_in_air/m_poisongas_ok/elemental_clog/set_ustuck/maybe_unhide_at/hideunder/hide_monst |
| `[a]` | mondata.c | mondata.js | Monster data queries: predicates, mon_knows_traps, passes_bars, dmgtype, hates_silver, sticks, etc. |
| `[a]` | monmove.c | monmove.js | Monster movement: dochug, m_move, m_move_aggress, set_apparxy, m_search_items; dochugw (wrapper), m_everyturn_effect, m_postmove_effect, postmov, should_displace, mb_trapped, itsstuck, release_hero, watch_on_duty, m_balks_at_approaching, mon_would_consume_item. Attack dispatch path is now async-aware so ranged monster attacks can await animation timing `maybe_postmove_hideunder()` helper extracted to run once after movement+trap resolution, eliminating duplicate hide-under RNG roll from `m_move`; pre-trapped monsters now resolve `mintrap_postmove` at `m_move` entry before normal movement (matching C `monmove.c:1748-1757`). |
| `[~]` | monst.c | monst.js | Monster data tables. mons[] array PARTIAL in monsters.js (JS-native structure); monst_globals_init implicit in module load. Also exports PM_* monster-table indices, S_* monster class constants (S_ANT..S_MIMIC_DEF), and MAXMCLASSES — these are the canonical source for role identity checks via `player.roleMnum` |
| `[~]` | mplayer.c | mplayer.js | Player-character rival monsters (endgame + ghost-level). is_mplayer() in mondata.js; rnd_offensive/defensive/misc_item in makemon.js; mk_mplayer/create_mplayers/mplayer_talk TODO (endgame not yet modeled) |
| `[a]` | mthrowu.c | mthrowu.js | Monster ranged attacks: m_throw, thrwmu, lined_up, select_rwep, monmulti. Includes async timed projectile path (`m_throw_timed`/`monshoot`/`thrwmu`) using awaited `nh_delay_output()` in interactive mode, with headless delay skipping retained; breath beam path (`breamm`/`breamu`) now also awaits async `buzz()` beam traversal timing. Tethered return-flight cleanup now uses awaited async BACKTRACK timing (`tmp_at_end_async`) in interactive mode |
| `[~]` | muse.c | muse.js | Monster item usage AI. Offensive wand/horn beam paths now route typed zap IDs into async `buzz()` (wand via `ZT_WAND(...)`, horn via `ZT_BREATH(...)`) instead of generic placeholder types. Immediate monster wand traversal (`mbhit`) now runs through `tmp_at(DISP_BEAM)` + awaited `nh_delay_output()` frames with async call flow in offensive/defensive wand callsites, and uses wand/horn-typed flashbeam coloring. Broader item-use parity remains partial |
| `[~]` | music.c | music.js | Musical instruments |
| `[N/A]` | nhlobj.c | — | Lua object bindings (l_obj_*). All 21 functions are Lua C API wrappers; JS port uses direct function calls (object(), monster() in sp_lev.js) with no Lua interpreter |
| `[N/A]` | nhlsel.c | — | Lua selection bindings (l_selection_*). All ~40 functions wrap selvar.c for Lua; JS port uses the `selection` object exported from sp_lev.js directly |
| `[N/A]` | nhlua.c | — | Lua interpreter integration |
| `[N/A]` | nhmd4.c | — | MD4 hash implementation |
| `[a]` | o_init.c | o_init.js | Object class initialization. Core shuffle functions aligned; setgemprobs, obj_shuffle_range, objdescr_is added; discovery handlers now in `o_init.js` (`handleDiscoveries`) and `do_name.js` (`handleCallObjectTypePrompt`) |
| `[a]` | objects.c | objects.js | Object data tables. objects.js is auto-generated from objects.h (same source as C); objects_globals_init implicit in module load |
| `[p]` | objnam.c | objnam.js | Object naming/wishing now covers xname/doname/makeplural/makesingular/readobjnam plus helper symbol set (fruit lookup, safe_qbuf, wallprop/terrain hooks, readobjnam pre/postparse wrappers). Remaining parity gaps: full wiz terrain wish behavior and precise C fruit-chain semantics |
| `[~]` | options.c | options.js | Game options. JS: `options.js` now owns both data and `handleSet` UI flow |
| `[~]` | pager.c | pager.js | Text pager and look/describe commands. `pager.js` handles menu/history/help wrappers (`dohelp`/`dowhatdoes`/`dohistory`/`doprev_message`/`doterrain`) and now owns `do_look()` / `do_screen_description()` / `dowhatis()` / `doquickwhatis()`. Remaining full `do_look` menu/cursor flows (`/`, `;`, lookat, waterbody_name, checkfile/supplemental info) still partial |
| `[a]` | pickup.c | pickup.js | Picking up items. handlePickup/handleLoot/handlePay/handleTogglePickup (dopickup/doloot/dopay/dotogglepickup); pay is a stub; ~50 functions TODO |
| `[a]` | pline.c | pline.js | Message output. pline, custompline, vpline, Norep, urgent_pline, raw_printf, vraw_printf, impossible, livelog_printf, gamelog_add, verbalize, You/Your/You_feel/You_cant/You_hear/You_see/pline_The/There, pline_dir/pline_xy/pline_mon, set_msg_dir/set_msg_xy, dumplogmsg/dumplogfreemessages, execplinehandler, nhassert_failed, You_buf/free_youbuf all implemented. putmesg semantics handled via setOutputContext |
| `[~]` | polyself.c | polyself.js | Polymorphing |
| `[~]` | potion.c | potion.js | Potion effects. handleQuaff (dodrink) with name-string matching for healing/gain level. Intrinsic timeout system: itimeout/set_itimeout/incr_itimeout. Status effect functions: make_confused/stunned/blinded/sick/hallucinated/vomiting/deaf/glib/slimed/stoned (all match C structure with Unaware check, Sick_resistance, partial cure logic, Halluc_resistance mask param). peffects dispatcher with 18 peffect_* functions for all potion types. Resistance checks for FREE_ACTION (sleeping/paralysis), ACID_RES (acid). healup with curesick/cureblind params. `mongrantswish` now includes the C-style `tmp_at(DISP_ALWAYS)` conceal overlay before removal. Remaining gaps: handleQuaff not yet using peffects dispatcher, unkn/identification tracking, speed_up(), vision system calls, vapors/throwing/dipping/mixing. |
| `[p]` | pray.c | pray.js | Prayer and sacrifice. `critically_low_hp`, `stuck_in_wall`, `in_trouble`, `worst_cursed_item`, `god_zaps_you`, `fry_by_god`, `at_your_feet`, `water_prayer`, `godvoice`, `gods_angry`/`gods_upset`, `consume_offering`, `desecrate_altar`, `offer_negative_valued`/`offer_fake_amulet`/`offer_different_alignment_altar`, `bestow_artifact`, `sacrifice_value`, `dosacrifice`, `eval_offering`, `offer_corpse`, `can_pray`, `pray_revive`, `dopray`, `prayer_done`, `doturn`, altar/deity name helpers — 34 of ~45 functions present. `fix_curse_trouble`, `please`, `give_spell`, `offer_too_soon`, `sacrifice_your_race` and ~10 others TODO. |
| `[~]` | priest.c | priest.js | Priest behavior, temple management, shrine, minion roamers. move_special() PARTIAL in monmove.js:679; all other functions TODO |
| `[a]` | quest.c | quest.js | Quest mechanics. `on_start`/`on_locate` (arrival messages), `not_capable`, `expulsion` (dungeon ejection), `onquest` (level arrival dispatcher), `nemdead`/`leaddead`, `artitouch`, `ok_to_quest`, `finish_quest`, `leader_speaks`/`chat_with_nemesis`/`nemesis_speaks`/`nemesis_stinks`/`chat_with_guardian`/`prisoner_speaks` (NPC dialog), `quest_chat`/`quest_talk`, `quest_stat_check` — 19 of 22 functions present. `is_pure` and 2 others TODO. |
| `[~]` | questpgr.c | questpgr.js | Quest text pager. com_pager_core N/A (Lua interpreter); is_quest_artifact PARTIAL in objdata.js:54; all other functions TODO |
| `[a]` | read.c | read.js | Reading scrolls/spellbooks. handleRead (doread) with spellbook study + seffects dispatcher + all 22 scroll effects implemented; some effects approximate (teleportation, mapping, detection need infrastructure). Stinking-cloud prompt path now includes `tmp_at` highlight setup/cleanup parity hook; fire-scroll explosion path now awaits async `explode()` timing |
| `[x]` | rect.c | rect.js | Rectangle allocation for room placement |
| `[p]` | region.c | region.js | Region system. `create_region`, `add_rect_to_reg`, `add_mon_to_reg`, `remove_mon_from_reg`, `mon_in_region`, `add_region`, `remove_region`, `clear_regions`, `run_regions`, `in_out_region`, `m_in_out_region`, `update_player_regions`, `inside_rect`/`inside_region`, `clear_heros_fault` — 15 functions present. Gas cloud effects (from `quest.js` `nemesis_stinks`) call `create_gas_cloud`. Save/restore TODO. |
| `[N/A]` | report.c | — | Bug reporting, panic trace |
| `[~]` | restore.c | restore.js | Game state restoration. All functions N/A (JS uses storage.js/IndexedDB with different format) |
| `[a]` | rip.c | display.js | RIP screen. genl_outrip as Display.renderTombstone (method); center() inlined |
| `[x]` | rnd.c | rng.js | Random number generation |
| `[~]` | role.c | role.js | Role/race/gender/alignment selection. roles[]/races[] data now in `role.js` (includes hpadv/enadv_full/xlev structs for all roles, hpadv/enadv for all races, `mnum` field mapping each role to its C PM_* monster-table index) and re-exported by `player.js`; `Role_if(player, pm)` and `Role_switch(player)` exported (matching C macros `Role_if`/`Role_switch` which compare `urole.mnum`); ok_role/ok_race/ok_align PARTIAL in chargen.js; role_init PARTIAL in chargen.js+u_init.js; Hello() in player.js; all others TODO |
| `[~]` | rumors.c | rumors.js | Rumor/oracle/CapitalMon system. JS: `rumor_data.js` (data); unpadline/init_rumors/get_rnd_line in `hacklib.js`; getrumor inlined in `dungeon.js`; outoracle/doconsult/CapitalMon TODO |
| `[~]` | save.c | save.js | Game state serialization. N/A (JS uses storage.js/IndexedDB); handleSave in storage.js. `freedynamicdata()` now calls `tmp_at(DISP_FREEMEM,0)` to mirror C display cleanup hook |
| `[a]` | selvar.c | — | Selection geometry. JS: `selection` object in `sp_lev.js`. All major geometry functions aligned including ellipse/gradient/is_irregular/size_description |
| `[N/A]` | sfbase.c | — | Save file base I/O routines |
| `[N/A]` | sfstruct.c | — | Save file structure definitions |
| `[a]` | shk.c | shk.js | Shopkeeper behavior. describeGroundObjectForPlayer (xname-based), maybeHandleShopEntryMessage, getprice/getCost/getShopQuoteForFloorObject (pricing approximations); shknam.js has naming. ~90 functions TODO |
| `[a]` | shknam.c | shknam.js | Shop naming and stocking. All C functions aligned; hallucination in shkname/is_izchak and in_town() in is_izchak deferred |
| `[a]` | sit.c | sit.js | Sitting effects. `dosit` (all terrain types: throne, sink, fountain, altar, grave, chest, floor), `rndcurse`, `attrcurse`, `take_gold` implemented. `throne_sit_effect`, `special_throne_effect`, `lay_an_egg` TODO. |
| `[~]` | sounds.c | sounds.js | Monster sounds, ambient room sounds, chat. dosounds() partial in chargen.js/headless.js; domonnoise/growl/yelp/whimper/beg/dotalk TODO; sound library N/A |
| `[~]` | sp_lev.c | sp_lev.js | Special level interpreter |
| `[a]` | spell.c | spell.js | Spell casting. ageSpells (age_spells), handleKnownSpells (dovspell/dospellmenu), estimateSpellFailPercent (percent_success approximation), spellRetentionText (spellretention). Spell category/skill tables from C. `tmp_at` callsites now wired for chain-lightning beam propagation frames and throwspell target highlighting cleanup; chain-lightning now uses awaited `nh_delay_output()` in interactive mode (skipped in headless). New stubs: study_book, book_cursed, confused_book, spell_skilltype, spelleffects, spell_damage_bonus, spell_would_be_useless_hero, learn, check_unpaid, rejectcasting. ~30 functions TODO |
| `[~]` | stairs.c | stairs.js | Stairway management. JS uses map.upstair/dnstair objects; u_on_upstairs/dnstairs → getArrivalPosition in do.js; stairway_find_*, On_stairs_*, stairs_description TODO |
| `[a]` | steal.c | steal.js | Monster stealing. somegold, findgold, stealgold, thiefdead, unresponsive, remove_worn_item, steal (weighted random), relobj implemented. stealamulet/maybe_absorb_item/mdrop_special_objs stubs. stealarm/unstolenarm/worn_item_removal/mpickobj TODO |
| `[a]` | steed.c | steed.js | Riding steeds. `can_saddle`, `can_ride`, `put_saddle_on_mon`, `maybewakesteed`, `doride`, `mount_steed` (full eligibility + message + stat changes), `exercise_steed`, `kick_steed`, `dismount_steed` (all reasons including petrification/engulf/poly), `poly_steed`, `stucksteed`, `rider_cant_reach` — 12 functions implemented. `place_monster` and related spawn helpers partially inline from `vault.js`. |
| `[N/A]` | strutil.c | — | String utilities (strbuf, pmatch). JS: native string ops |
| `[N/A]` | symbols.c | — | Terminal graphics mode management (ASCII/IBM/curses/UTF-8 symbol-set switching). Browser port uses static data in `symbols.js` (auto-generated by `gen_symbols.py`); no runtime mode switching |
| `[N/A]` | sys.c | — | System-level interface |
| `[~]` | teleport.c | teleport.js | Teleportation. `goodpos()` in `teleport.js` now uses canonical monster flag constants (`M1_SWIM`, `M1_AMPHIBIOUS`, `M1_FLY`, `M1_WALLWALK`, `M1_AMORPHOUS`, `M2_ROCKTHROW`, `S_EEL`) imported from `monsters.js` rather than hardcoded bit values; `onscary` probe check now runs for both real monsters and placement probes (not gated on `m_id`); `rloc`, `mtele_trap`, `mlevel_tele_trap`, `teleds`, `tele` and supporting helpers ported. `collect_coords`/`enexto`/`can_teleport` still TODO. |
| `[~]` | timeout.c | timeout.js | Timer-based effects. Full timer queue: run_timers, start/stop/peek/insert/remove_timer, obj_move/split/stop_timers, obj_has_timer, spot timers, done_timeout, egg/figurine/burn timers, fall_asleep. nh_timeout() has intrinsic timeout decrement loop matching C structure: calls dialogue functions before decrement, then on expiry fires effect via _fireExpiryEffect with full switch covering STONED/SLIMED/STRANGLED death, SICK death-or-recovery (CON check), CONFUSION/STUNNED/BLINDED/DEAF/HALLUC set-to-1-then-clear pattern, FAST slow message, INVIS expiry message, FUMBLING re-increment, VOMITING/GLIB/WOUNDED_LEGS/DISPLACED/PASSES_WALLS/DETECT_MONSTERS handlers. Dialogue stubs exported for stoned/vomiting/sleep/choke/sickness/levitation/slime/phaze. Remaining gaps: full dialogue countdown text sequences, float_down for levitation, vision system calls |
| `[a]` | topten.c | topten.js | High score table. observable_depth implemented; I/O funcs N/A; encode/format funcs TODO |
| `[p]` | track.c | track.js | Player tracking for pets. save/rest not yet implemented |
| `[p]` | trap.c | trap.js | Trap mechanics: monster-side flow is largely ported (m_harmless_trap, floor_trigger, mintrap_postmove, mon_check_in_air, trap effect dispatcher, erosion/water/fire/acid chains, petrification helpers). Rolling-boulder monster trap path now includes `tmp_at` flash lifecycle with awaited per-cell `nh_delay_output()` timing, launch-point/other-side boulder selection, per-cell boulder-coordinate updates, closed-door break handling, boulder-to-boulder handoff, bars/wall/tree stop rules, and basic trap-tile interactions while rolling (landmine converted to pit-state before boulder removal, tele trap relocate, level-tele consume, pit/spiked-pit fill behavior, hole/trapdoor fall-through removal), plus monster impact via `thitm` and hero impact damage when the rolling boulder crosses the hero cell. Rolling travel no longer uses a fixed short-step cap, matching C-style "travel until blocked/impact" behavior more closely. Full `launch_obj` parity (scatter/fall-through chain detail and richer object interactions) is still TODO. Remaining parity gaps are mainly player-side `dotrap`/interaction flow plus complex trap side-effects. |
| `[a]` | u_init.c | u_init.js | Player initialization. u_init_role, u_init_race, u_init_carry_attr_boost, trquan, ini_inv, ini_inv_mkobj_filter, restricted_spell_discipline aligned. JS-only wrappers: simulatePostLevelInit, initAttributes `simulatePostLevelInit` now applies role-sensitive pet alignment context override: Caveman startup uses `alignmentRecord=0` for `makedog()` creation context, matching C's Caveman-specific RNG width. |
| `[a]` | uhitm.c | uhitm.js | Hero-vs-monster combat. `do_attack` (+ `hmon` pipeline), all `mhitm_ad_*` handlers (40+), `mhitm_adtyping` dispatcher, `mhitm_mgc_atk_negated`, `mhitm_knockback` (with eligibility + messages) implemented; artifact `spec_abon` wired into `find_roll_to_hit`, `spec_dbon` wired into damage calc; engulf start-frame helper now uses awaited delay boundaries (`start_engulf`/`gulpum` async). 50 functions TODO |
| `[N/A]` | utf8map.c | — | UTF-8 glyph mapping for terminal |
| `[p]` | vault.c | vault.js | Vault guard system. `newegd`/`free_egd`, `in_fcorridor`, `restfakecorr`, `parkguard`, `grddead`, `findgd`, `vault_summon_gd`, `vault_occupied`, `uleftvault` (gold corridor patrol with Croesus dialog — full sentence prompts, drop-gold, bribe, leave options), `gd_mv_monaway`, `gd_letknow`, `invault`, `gd_move` (guard movement AI), `paygd`, `hidden_gold`, `gd_sound`, `vault_gd_watching` — all 18 functions present and implemented. |
| `[N/A]` | version.c | — | Version info |
| `[a]` | vision.c | vision.js | FOV / LOS. Core algorithm (view_from, right_side, left_side, clear_path, do_clear_area) matches C, including block/dig/unblock pointer maintenance, rogue vision path, and `howmonseen` mapping (in `display.js`). |
| `[a]` | weapon.c | weapon.js | Weapon skills, hit/damage bonuses, monster weapon AI. select_hwep, select_rwep (full), mon_wield_item, possibly_unwield, mwepgone, setmnotwielded, oselect, monmightthrowwep, autoreturn_weapon, weapon_type, skill_level_name, skill_name, wet/dry_a_towel implemented. weapon_hit/dam_bonus gated (returns 0). Skill system infrastructure (P_* constants, weapon_check state machine) complete. skill_init/enhance/advance and role tables TODO |
| `[a]` | were.c | were.js | Lycanthropy. 6 of 8 functions aligned; you_were/you_unwere TODO (need polymon/rehumanize) |
| `[a]` | wield.c | wield.js | Wielding weapons. setuwep/setuswapwep/setuqwep, uwepgone/uswapwepgone/uqwepgone, welded/weldmsg, ready_weapon, handleWield/handleSwapWeapon/handleQuiver. will_weld, mwelded, erodeable_wep, empty_handed, can_twoweapon (full), set_twoweap, untwoweapon, drop_uswapwep, handleTwoWeapon (dotwoweapon), chwepon, wield_tool, cant_wield_corpse implemented. finish_splitting/ready_ok/wield_ok TODO |
| `[N/A]` | windows.c | — | Windowing system interface. JS: `display.js`, `browser_input.js` |
| `[~]` | wizard.c | wizard.js | Wizard of Yendor AI. All 21 functions are runtime gameplay AI; none implemented in JS |
| `[a]` | wizcmds.c | wizcmds.js | Wizard-mode debug commands. handleWizLoadDes (wiz_load_splua), wizLevelChange (wiz_level_change), wizMap (wiz_map), wizTeleport (wiz_level_tele), wizGenesis (wiz_genesis); Lua commands N/A; sanity checks and advanced debug TODO |
| `[~]` | worm.c | worm.js | Long worm mechanics. save/rest_worm are N/A (no save file). All 24 other functions are TODO stubs |
| `[a]` | worn.c | worn.js | Equipment slot management. setworn, setnotworn, allunworn, wearmask_to_obj, wearslot, wornmask_to_armcat, armcat_to_wornmask, update_mon_extrinsics, mon_set_minvis, mon_adjust_speed, extract_from_minvent, m_lose_armor, mon_break_armor, extra_pref, racial_exception, m_dowear, m_dowear_type, find_mac, bypass stubs (bypass_obj, clear_bypasses, nxt_unbypassed_obj/loot) implemented. check_wornmask_slots/which_armor/recalc_telepat_range TODO |
| `[a]` | write.c | write.js | Writing on scrolls. cost, write_ok, new_book_description implemented; dowrite TODO |
| `[~]` | zap.c | zap.js | Wand beam effects. All mapped `zap.c` function surfaces now exist in `zap.js`, and many former wrappers now have concrete C-structured behavior (`zappable`, `dozap` self-zap routing, `weffects` setup/wrapup flow, `zapsetup`/`zapwrapup`, `zapyourself`, `zap_steed`, `probe_objchain`, object/container/monster location helpers, trap cancellation explosion gating, polymorph pile bookkeeping (`do_osshock` + `bhitpile` follow-up), egg hatch timeout wiring, inventory-resistance helpers, `spell_hit_bonus`, `resists_stun`). Core beam animation path remains unified async `buzz()`/`dobuzz()` with `tmp_at` and awaited frame boundaries. Remaining parity work is now mostly edge-depth and side-effect richness: full `zap_over_floor` elemental terrain/door/liquid rules, full revive/montraits/corpse consumption semantics, `cancel_monst` hero/nonhero edge behavior, complete `bhitm`/`zapyourself`/`zap_steed` effect matrices, richer `break_wand`/`backfire` detail, and exact object-destruction/material interactions. |

### Summary

- **Total C files**: 129
- **N/A (system/platform)**: 21
- **Game logic files**: 108
- **Complete (`[x]`)**: 4
- **Aligned (`[a]`)**: 51
- **Present (`[p]`)**: 9
- **Needs alignment (`[~]`)**: 44
- **No JS file yet (`[ ]`)**: 0

### JS Files With Non-Strict C Mapping

These JS files are infrastructure or intentionally split/aggregated relative to
the C layout (not strict 1:1 modules):

| JS File | Purpose | C Counterparts |
|---------|---------|----------------|
| animation_examples.js | Animation demo data | None (JS-only) |
| animation.js | Visual animations (`tmp_at`, `nh_delay_output`) | None (JS-only) |
| attrib_exercise.js | Attribute exercise tracking | attrib.c |
| browser_input.js | Browser keyboard/mouse input | None (JS-only) |
| cmd.js | Command dispatch | cmd.c |
| const.js | Game configuration, color constants (CLR_*), property flags | decl.c, options.c |
| symbols.js | Symbol/glyph drawing tables (defsyms, GLYPH_*_OFF, SYM_OFF_*), auto-generated by gen_symbols.py | drawing.c, display.h |
| delay.js | Delay/animation timing | None (JS-only) |
| display_rng.js | Display-layer RNG | rnd.c |
| engrave_data.js | Engraving text data | engrave.c |
| epitaph_data.js | Epitaph text data | engrave.c |
| floor_objects.js | Floor object display | pickup.c, invent.c |
| chargen.js | Interactive chargen menus (role/race/align selection, game-over, tutorial, save-restore) | role.c, end.c (partial) |
| headless.js | Headless test/selfplay runtime: HeadlessDisplay, createHeadlessInput, createHeadlessGame, generateMapsWithCoreReplay, generateStartupWithCoreReplay | None (JS-only) |
| input.js | Input handling/replay | None (JS-only) |
| keylog.js | Keystroke logging | None (JS-only) |
| hack.js | Core movement/running/travel | hack.c |
| kick.js | Kick command | dokick.c |
| game.js | Map data structure | hack.c, mklev.c |
| monsters.js | Monster data tables | monst.c |
| nethack.js | Browser entry point: reads URL params, wires Display+input to NetHackGame, registers window APIs | sys/unix/nethack.c (platform main) |
| objdata.js | Object property queries | objnam.c, mkobj.c |
| player.js | Player state runtime (roles/races sourced from role.js); `player.roleMnum` (C's `urole.mnum`) and `player.roleIndex` (roles[] array index) | decl.c, role.c |
| replay_core.js | Session replay/comparison | None (JS-only, test infra). Records per-step animation delay-boundary snapshots (`animationBoundaries`) in parallel with RNG/screen/event metrics |
| rumor_data.js | Rumor text data | rumors.c |
| special_levels.js | Special level registry | sp_lev.c, extralev.c |
| shk.js | Shopkeeper pricing/messages | shk.c |
| spell.js | Spell system | spell.c |
| storage.js | Save/load/config, handleSave | save.c, restore.c, files.c |
| xoshiro256.js | Xoshiro256 PRNG | None (JS-only, display RNG) |

---

## JS-Only Files: Function Details

These files have no direct C counterpart. Functions are documented with the closest C analogue where one exists.

### chargen.js (was nethack.js)

Interactive character generation menus and game lifecycle screens.  Re-exports `NetHackGame` from `allmain.js`.

| JS Function | C Analogue | Notes |
|-------------|------------|-------|
| `playerSelection(game)` | role.c `plselect()` | Top-level dispatcher: auto-picks or launches manual menus depending on options |
| `promptPlayerName(game)` | role.c player-name prompt | Asks for character name; validates and stores on `game.player` |
| `showRoleMenu(game, raceIdx, gender, align, isFirstMenu)` | role.c `plsel_role()` | Draws role selection overlay; returns chosen role index |
| `showRaceMenu(game, roleIdx, gender, align, isFirstMenu)` | role.c `plsel_race()` | Draws race selection overlay; returns chosen race index |
| `showGenderMenu(game, roleIdx, raceIdx, align, isFirstMenu)` | role.c `plsel_gend()` | Draws gender selection overlay; returns chosen gender |
| `showAlignMenu(game, roleIdx, raceIdx, gender, isFirstMenu)` | role.c `plsel_align()` | Draws alignment selection overlay; returns chosen alignment |
| `showConfirmation(game, roleIdx, raceIdx, gender, align)` | role.c confirmation step | Shows "Is this ok?" summary; returns true to accept, false to restart |
| `showLoreAndWelcome(game, roleIdx, raceIdx, gender, align)` | role.c `plsel_lore` / `welcome()` | Shows role lore text then welcome message before gameplay starts |
| `showFilterMenu(game)` | None (JS-only) | Overlay for narrowing role/race/align options; sets `game.rfilter` |
| `autoPickAll(game, showConfirm)` | role.c `pick_all()` | Randomly selects all chargen choices matching active filters |
| `manualSelection(game)` | role.c `manual_pick()` | Drives full interactive menu sequence until confirmation accepted |
| `showGameOver(game)` | end.c `you_died()` display | Renders tombstone/death reason screen and waits for acknowledge |
| `maybeDoTutorial(game)` | None (JS-only) | Checks first-run flag; launches tutorial if appropriate |
| `enterTutorial(game)` | None (JS-only) | Initialises tutorial level and sets tutorial state flags |
| `handleReset(game)` | None (JS-only) | Clears save data and reloads for a fresh game |
| `restoreFromSave(game, saveData, urlOpts)` | restore.c `dorecover()` | Deserialises a saved game state into a running `NetHackGame` |
| `buildHeaderLine(game, roleIdx, raceIdx, gender, align)` | None (JS-only) | Formats the "Role / Race / Align / Gender" header shown in chargen menus |

---

### headless.js (was headless_runtime.js)

Headless runtime for session tests and selfplay.  No C counterpart.  Re-exports `NetHackGame as HeadlessGame` from `allmain.js`.

#### HeadlessDisplay class

In-memory 80×24 character grid implementing every method the game engine calls on the display.  Used wherever `Display` (browser canvas) would be used in interactive play.

| Method | Notes |
|--------|-------|
| `putstr_message(msg)` | Appends msg to `messages[]`; writes to row 0 of grid; handles concatenation like C tty `update_topl()` |
| `renderMessageWindow()` | Clears row 0; re-renders current `topMessage` only (C ref: `docrt()` after menu close) |
| `renderMap(gameMap, player, fov, flags)` | Renders dungeon tiles, monsters, objects onto rows 1–22 of grid |
| `renderStatus(player)` | Renders two status rows at bottom of grid |
| `renderOverlayMenu(lines)` | Renders an inventory/selection overlay using `putstr` (no `putstr_message`) |
| `getScreenLines()` | Returns current grid as array of strings for test comparison |
| `setScreenLines(lines)` | Overwrites entire grid from array of strings (used by `applyStepScreen` in replay) |
| `setScreenAnsiLines(lines)` | Overwrites grid from ANSI-escaped strings, parsing color/attribute codes |

#### Factory and replay functions

| JS Function | C Analogue | Notes |
|-------------|------------|-------|
| `createHeadlessInput(opts)` | None (JS-only) | Returns a queue-based input runtime; `pushKey(code)` enqueues a keypress for `nhgetch()` to consume |
| `headlessFromSeed(seed, roleIndex, opts)` | None (JS-only) | Internal: creates a `NetHackGame` with `HeadlessDisplay` + `createHeadlessInput` and calls `game.init()` |
| `headlessStart(seed, options)` | None (JS-only) | Thin wrapper around `headlessFromSeed`; used by `generateMapsWithCoreReplay` |
| `createHeadlessGame(seed, roleIndex, opts)` | None (JS-only) | Public factory exported for unit tests; returns a fully initialised headless game |
| `generateMapsWithCoreReplay(seed, maxDepth, options)` | None (JS-only) | Generates levels 1…maxDepth by descending stairs headlessly; returns map snapshots |
| `generateStartupWithCoreReplay(seed, session, options)` | None (JS-only) | Replays the chargen/startup phase of a recorded session; captures RNG log and screen for comparison |
| `buildInventoryLines(player)` | None (JS-only) | Formats inventory as array of strings for headless test assertions |
| `extractCharacterFromSession(session)` | None (JS-only) | Pulls role/race/gender/align from a session record into a `character` options object |

---

### nethack.js (was menace.js)

Browser entry point only.  Reads URL params, constructs `Display` and browser input, calls `game.init()`.  No exports — loaded as `<script type="module">` directly from `index.html`.  Closest C analogue: `sys/unix/nethack.c` (platform-specific `main()`).

| JS Function / block | C Analogue | Notes |
|---------------------|------------|-------|
| `createBrowserLifecycle()` | None (JS-only) | Returns `{ restart, replaceUrlParams }` hooks used by the game for page reload and URL state |
| `registerMenuApis()` | None (JS-only) | Attaches `window._saveAndQuit`, `window._resetGame` etc. so UI buttons can call into the game |
| `registerKeylogApis()` | None (JS-only) | Attaches `window._getKeylog`, `window._startReplay` for developer keylog tools |
| Top-level init block | `sys/unix/nethack.c main()` | Reads `?seed=`, `?wizard=`, `?role=` etc. from URL; creates `Display` + browser input; constructs `NetHackGame`; calls `game.init(urlOpts)` |

---

## Function-Level Details

This section is generated from source symbol tables and includes function rows for every C file in this document.

### Function-Level Metrics

- **Raw rows (all files)**: `5000` total, `3681` missing (**73.62% left**)
- **Gameplay rows only**: `4335` total, `3060` missing (**70.59% left**)
- **Excluded non-gameplay rows**: `665` rows under `[N/A]` files

### Non-Gameplay Blacklist (Excluded From Gameplay %)

Rows under these `[N/A]` C files are non-gameplay/system and should not count against gameplay CODEMATCH burndown:

`alloc.c`, `cfgfiles.c`, `coloratt.c`, `date.c`, `dlb.c`, `files.c`, `mail.c`,
`mdlib.c`, `nhlobj.c`, `nhlsel.c`, `nhlua.c`, `nhmd4.c`, `report.c`, `sfbase.c`,
`sfstruct.c`, `strutil.c`, `symbols.c`, `sys.c`, `utf8map.c`, `version.c`,
`windows.c`.

### allmain.c -> allmain.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1001 | `argcheck` | - | N/A (CLI args, no browser equivalent) |
| 1124 | `debug_fields` | - | N/A (CLI debug parsing, no browser equivalent) |
| 907 | `do_positionbar` | - | N/A (tty position bar, not applicable to JS) |
| 1259 | `dump_enums` | allmain.js:2492 | N/A (build-time tool; autotranslated stub) |
| 1356 | `dump_glyphids` | allmain.js:2516 | N/A (build-time tool; autotranslated stub) |
| 36 | `early_init` | allmain.js:2462, NetHackGame constructor | Implemented |
| 697 | `init_sound_disp_gamewindows` | NetHackGame.init() | Implemented (display/animation setup in init()) |
| 950 | `interrupt_multi` | allmain.js:2482 | Implemented |
| 566 | `maybe_do_tutorial` | allmain.js:1209 buildReplayTutorialPromptFlow | Implemented |
| 586 | `moveloop` | allmain.js:2472, NetHackGame.gameLoop | Implemented |
| 169 | `moveloop_core` | allmain.js:148 | Implemented |
| 50 | `moveloop_preamble` | NetHackGame.init() showLoreAndWelcome | Implemented |
| 764 | `newgame` | NetHackGame.init() | Implemented |
| 621 | `regen_hp` | allmain.js:1078 | Implemented — encumbrance gate, Regeneration bonus, full-health interrupt |
| 599 | `regen_pw` | allmain.js:1127 regen_pw_turnend | Implemented |
| 680 | `stop_occupation` | allmain.js:438 | Implemented |
| 1182 | `timet_delta` | allmain.js:2487 | N/A (JS Date arithmetic; autotranslated stub) |
| 1173 | `timet_to_seconds` | allmain.js:2521 | N/A (JS Date.now(); autotranslated stub) |
| 116 | `u_calc_moveamt` | allmain.js:463 | Implemented |
| 851 | `welcome` | NetHackGame.init() showLoreAndWelcome | Implemented |

### alloc.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 266 | `FITSint_` | - | Missing |
| 276 | `FITSuint_` | - | Missing |
| 238 | `dupstr` | - | Missing |
| 253 | `dupstr_n` | - | Missing |
| 125 | `fmt_ptr` | - | Missing |
| 142 | `heapmon_init` | - | Missing |
| 152 | `nhalloc` | - | Missing |
| 219 | `nhdupstr` | - | Missing |
| 205 | `nhfree` | - | Missing |
| 170 | `nhrealloc` | - | Missing |
| 85 | `re_alloc` | - | Missing |

### apply.c -> apply.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 4146 | `apply_ok` | apply.js:1180 | Implemented |
| 993 | `beautiful` | apply.js:361 | Implemented |
| 3884 | `broken_wand_explode` | apply.js:779 | Implemented |
| 3367 | `calc_pole_range` | apply.js:725 | Implemented |
| 3697 | `can_grapple_location` | apply.js:754 | Implemented |
| 1573 | `catch_lit` | apply.js:447 | Implemented |
| 1858 | `check_jump` | apply.js:533 | Implemented |
| 927 | `check_leash` | apply.js:321 | Implemented |
| 3387 | `could_pole_mon` | apply.js:728 | Implemented |
| 3872 | `discard_broken_wand` | apply.js:776 | Implemented |
| 3703 | `display_grapple_positions` | apply.js:757 | Implemented |
| 1963 | `display_jump_positions` | apply.js:1164 | Implemented |
| 3330 | `display_polearm_positions` | apply.js:709 | Implemented |
| 61 | `do_blinding_ray` | apply.js:135 | Implemented |
| 3905 | `do_break_wand` | apply.js:785 | Implemented |
| 4209 | `doapply` | apply.js:984 | Implemented (as handleApply — partial dispatcher) |
| 1843 | `dojump` | apply.js:518 | Implemented |
| 1781 | `dorub` | apply.js:515 | Implemented |
| 2394 | `fig_transform` | apply.js:573 | Implemented |
| 2507 | `figurine_location_checks` | apply.js:576 | Implemented |
| 3279 | `find_poleable_mon` | apply.js:703 | Implemented |
| 4522 | `flip_coin` | apply.js:1152 | Implemented |
| 4468 | `flip_through_book` | apply.js:1133 | Implemented |
| 876 | `get_mleash` | apply.js:286 | Implemented |
| 1955 | `get_valid_jump_position` | apply.js:1159 | Implemented |
| 3317 | `get_valid_polearm_position` | apply.js:706 | Implemented |
| 3682 | `grapple_range` | apply.js:751 | Implemented |
| 2581 | `grease_ok` | apply.js:591 | Implemented |
| 1889 | `is_valid_jump_pos` | apply.js:561 | Implemented |
| 198 | `its_dead` | apply.js:234 | Implemented |
| 3603 | `jelly_ok` | apply.js:745 | Implemented |
| 1984 | `jump` | apply.js:619 | Implemented (preconditions faithful; getpos/movement stub) |
| 757 | `leashable` | apply.js:304 | Implemented |
| 1699 | `light_cocktail` | apply.js:499 | Implemented |
| 722 | `m_unleash` | apply.js:284 | Implemented |
| 518 | `magic_whistled` | apply.js:257 | Implemented |
| 3893 | `maybe_dunk_boulders` | apply.js:782 | Implemented |
| 887 | `mleashed_next2u` | apply.js:315 | Implemented |
| 915 | `next_to_u` | apply.js:318 | Implemented |
| 694 | `number_leashed` | apply.js:265 | Implemented |
| 707 | `o_unleash` | apply.js:274 | Implemented |
| 2809 | `reset_trapset` | apply.js:498 | Implemented |
| 1766 | `rub_ok` | apply.js:506 | Implemented |
| 2912 | `set_trap` | apply.js:545 | Partial — occupation callback wired for land mine/bear trap setup |
| 3412 | `snickersnee_used_dist_attk` | apply.js:731 | Implemented |
| 1468 | `snuff_candle` | apply.js:410 | Implemented |
| 1493 | `snuff_lit` | apply.js:424 | Implemented |
| 1514 | `splash_lit` | apply.js:438 | Implemented |
| 2163 | `tinnable` | apply.js:522 | Implemented |
| 2654 | `touchstone_ok` | apply.js:613 | Implemented |
| 688 | `um_dist` | apply.js:260 | Implemented |
| 4426 | `unfixable_trouble_count` | apply.js:1127 | Implemented |
| 742 | `unleash_all` | apply.js:295 | Implemented |
| 1198 | `use_bell` | apply.js:384 | Implemented |
| 79 | `use_camera` | apply.js:165 | Implemented |
| 1315 | `use_candelabrum` | apply.js:390 | Implemented |
| 1383 | `use_candle` | apply.js:407 | Implemented |
| 3564 | `use_cream_pie` | apply.js:737 | Implemented |
| 2540 | `use_figurine` | apply.js:588 | Implemented |
| 3725 | `use_grapple` | apply.js:773 | Implemented |
| 2600 | `use_grease` | apply.js:598 | Implemented |
| 1624 | `use_lamp` | apply.js:467 | Implemented |
| 765 | `use_leash` | apply.js:309 | Implemented |
| 817 | `use_leash_core` | apply.js:312 | Implemented |
| 495 | `use_magic_whistle` | apply.js:245 | Implemented |
| 1014 | `use_mirror` | apply.js:375 | Implemented |
| 3422 | `use_pole` | apply.js:734 | Implemented |
| 3612 | `use_royal_jelly` | apply.js:748 | Implemented |
| 318 | `use_stethoscope` | apply.js:237 | Implemented |
| 2676 | `use_stone` | apply.js:619 | Implemented |
| 2173 | `use_tinning_kit` | apply.js:529 | Implemented |
| 112 | `use_towel` | apply.js:173 | Implemented |
| 2817 | `use_trap` | apply.js:506 | Partial — trap setup checks + occupation wiring for land mine/bear trap |
| 2255 | `use_unicorn_horn` | apply.js:535 | Implemented |
| 2951 | `use_whip` | apply.js:700 | Implemented |
| 476 | `use_whistle` | apply.js:240 | Implemented |

### artifact.c -> artifact.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1249 | `Mb_hit` | artifact.js:610 | Stub |
| 2466 | `Sting_effects` | artifact.js:502 | Implemented |
| 2320 | `abil_to_adtyp` | artifact.js:654 | Implemented |
| 2344 | `abil_to_spfx` | artifact.js:670 | Implemented |
| 2309 | `arti_cost` | artifact.js:328 | Implemented |
| 979 | `arti_immune` | artifact.js:314 | Implemented |
| 2131 | `arti_invoke` | artifact.js:622 | Stub |
| 2106 | `arti_invoke_cost` | artifact.js:642 | Stub |
| 2091 | `arti_invoke_cost_pw` | artifact.js:641 | Stub |
| 537 | `arti_reflects` | artifact.js:234 | Implemented |
| 2279 | `arti_speak` | artifact.js:646 | Implemented |
| 371 | `artifact_exists` | artifact.js:140 | Implemented |
| 2299 | `artifact_has_invprop` | artifact.js:322 | Implemented |
| 1447 | `artifact_hit` | artifact.js:artifact_hit | Implemented |
| 2264 | `artifact_light` | artifact.js:337 | Implemented |
| 329 | `artifact_name` | artifact.js:78 | Implemented |
| 478 | `artifact_origin` | artifact.js:173 | Implemented |
| 151 | `artiname` | artifact.js:71 | Implemented |
| 626 | `attacks` | artifact.js:274 | Implemented |
| 993 | `bane_applies` | artifact.js:358 | Implemented |
| 526 | `confers_luck` | artifact.js:228 | Implemented |
| 2708 | `count_surround_traps` | artifact.js:697 | Stub |
| 636 | `defends` | artifact.js:283 | Implemented |
| 687 | `defends_when_carried` | artifact.js:294 | Implemented |
| 1113 | `discover_artifact` | artifact.js:449 | Implemented |
| 1147 | `disp_artifact_discoveries` | artifact.js:463 | Stub |
| 312 | `dispose_of_orig_obj` | artifact.js:dispose_of_orig_obj | Implemented |
| 1749 | `doinvoke` | artifact.js:616 | Stub |
| 1177 | `dump_artifact_info` | artifact.js:469 | Stub |
| 356 | `exist_artifact` | artifact.js:128 | Implemented |
| 422 | `find_artifact` | artifact.js:202 | Implemented |
| 2236 | `finesse_ahriman` | artifact.js:643 | Stub |
| 409 | `found_artifact` | artifact.js:195 | Implemented |
| 2821 | `get_artifact` | artifact.js:60 | Implemented |
| 2427 | `glow_color` | artifact.js:476 | Implemented |
| 2442 | `glow_strength` | artifact.js:glow_strength | Implemented |
| 2451 | `glow_verb` | artifact.js:495 | Implemented |
| 87 | `hack_artifacts` | - | Missing (init_artifacts serves similar role) |
| 2790 | `has_magic_key` | artifact.js:717 | Implemented |
| 111 | `init_artifacts` | artifact.js:102 | Implemented |
| 1963 | `invoke_banish` | artifact.js:637 | Stub |
| 2054 | `invoke_blinding_ray` | artifact.js:640 | Stub |
| 1848 | `invoke_charge_obj` | artifact.js:634 | Stub |
| 1934 | `invoke_create_ammo` | artifact.js:636 | Stub |
| 1867 | `invoke_create_portal` | artifact.js:635 | Stub |
| 1818 | `invoke_energy_boost` | artifact.js:632 | Stub |
| 2022 | `invoke_fling_poison` | artifact.js:638 | Stub |
| 1780 | `invoke_healing` | artifact.js:631 | Stub |
| 1727 | `invoke_ok` | artifact.js:628 | Stub |
| 2040 | `invoke_storm_spell` | artifact.js:639 | Stub |
| 1769 | `invoke_taming` | artifact.js:630 | Stub |
| 1838 | `invoke_untrap` | artifact.js:633 | Stub |
| 2808 | `is_art` | artifact.js:342 | Implemented |
| 2775 | `is_magic_key` | artifact.js:708 | Implemented |
| 172 | `mk_artifact` | artifact.js:551 | Implemented (RNG-consuming candidate selection) |
| 2753 | `mkot_trap_warn` | artifact.js:703 | Stub |
| 462 | `nartifact_exist` | artifact.js:211 | Implemented |
| 1762 | `nothing_special` | artifact.js:629 | Stub |
| 2837 | `permapoisoned` | artifact.js:347 | Implemented |
| 698 | `protects` | artifact.js:303 | Implemented |
| 133 | `restore_artifacts` | artifact.js:737 | Implemented |
| 575 | `restrict_name` | artifact.js:256 | Implemented |
| 2640 | `retouch_equipment` | artifact.js:535 | Stub |
| 2508 | `retouch_object` | artifact.js:528 | Stub |
| 119 | `save_artifacts` | artifact.js:729 | Implemented |
| 716 | `set_artifact_intrinsic` | artifact.js:543 | Stub |
| 555 | `shade_glare` | artifact.js:246 | Implemented |
| 516 | `spec_ability` | artifact.js:222 | Implemented |
| 1076 | `spec_abon` | artifact.js:415 | Implemented (wired into uhitm.js find_roll_to_hit) |
| 1009 | `spec_applies` | artifact.js:373 | Implemented |
| 1091 | `spec_dbon` | artifact.js:426 | Implemented (wired into uhitm/mhitm/mhitu damage) |
| 1065 | `spec_m2` | artifact.js:352 | Implemented |
| 908 | `touch_artifact` | artifact.js:510 | Implemented |
| 1131 | `undiscovered_artifact` | artifact.js:458 | Implemented |
| 2598 | `untouchable` | - | Missing |
| 2376 | `what_gives` | artifact.js:689 | Implemented |

### attrib.c -> attrib.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1197 | `acurr` | attrib.js:359 | Implemented |
| 1242 | `acurrstr` | attrib.js:392 | Implemented |
| 1003 | `adjabil` | attrib.js:1003 | Implemented |
| 1295 | `adjalign` | attrib.js:1195 | Implemented |
| 117 | `adjattrib` | attrib.js:409 | Implemented |
| 1179 | `adjuhploss` | attrib.js:1161 | Implemented |
| 408 | `change_luck` | attrib.js:606 | Implemented |
| 815 | `check_innate_abil` | attrib.js:924 | Implemented (internal helper) |
| 595 | `exerchk` | attrib.js:769 | Implemented |
| 486 | `exercise` | attrib.js:674 | Implemented |
| 518 | `exerper` | attrib.js:690 | Implemented (internal helper) |
| 1265 | `extremeattr` | attrib.js:1173 | Implemented |
| 902 | `from_what` | attrib.js:981 | Implemented |
| 200 | `gainstr` | attrib.js:472 | Implemented |
| 720 | `init_attr` | attrib.js:853 | Implemented |
| 696 | `init_attr_role_redist` | attrib.js:831 | Implemented (internal helper) |
| 861 | `innately` | attrib.js:950 | Implemented |
| 877 | `is_innate` | attrib.js:965 | Implemented |
| 218 | `losestr` | attrib.js:485 | Implemented |
| 1144 | `minuhpmax` | attrib.js:1135 | Implemented |
| 1077 | `newhp` | attrib.js:1081, exper.js:newhp | Implemented |
| 271 | `poison_strdmg` | attrib.js:522 | Implemented |
| 314 | `poisoned` | attrib.js:541 | Implemented |
| 291 | `poisontell` | attrib.js:528 | Implemented |
| 777 | `postadjabil` | attrib.js:898 | Implemented (internal helper) |
| 737 | `redist_attr` | attrib.js:872 | Implemented |
| 452 | `restore_attrib` | attrib.js:650 | Implemented |
| 679 | `rnd_attr` | attrib.js:816 | Implemented (internal helper) |
| 786 | `role_abil` | attrib.js:904 | Implemented |
| 438 | `set_moreluck` | attrib.js:637 | Implemented |
| 1154 | `setuhpmax` | attrib.js:1141 | Implemented |
| 420 | `stone_luck` | attrib.js:620 | Implemented |
| 1317 | `uchangealign` | attrib.js:1214 | Implemented |
| 761 | `vary_init_attr` | attrib.js:887 | Implemented |

### ball.c -> ball.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 327 | `Lift_covet_and_placebc` | - | Missing |
| 259 | `Placebc` | - | Missing |
| 287 | `Unplacebc` | - | Missing |
| 306 | `Unplacebc_and_covet_placebc` | - | Missing |
| 43 | `ballfall` | - | Missing |
| 23 | `ballrelease` | - | Missing |
| 354 | `bc_order` | - | Missing |
| 1034 | `bc_sanity_check` | - | Missing |
| 180 | `check_restriction` | - | Missing |
| 560 | `drag_ball` | - | Missing |
| 986 | `drag_down` | - | Missing |
| 882 | `drop_ball` | - | Missing |
| 236 | `lift_covet_and_placebc` | - | Missing |
| 965 | `litter` | - | Missing |
| 437 | `move_bc` | - | Missing |
| 193 | `placebc` | - | Missing |
| 120 | `placebc_core` | - | Missing |
| 380 | `set_bc` | - | Missing |
| 212 | `unplacebc` | - | Missing |
| 222 | `unplacebc_and_covet_placebc` | - | Missing |
| 147 | `unplacebc_core` | - | Missing |

### bones.c -> bones.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 752 | `bones_include_name` | - | Missing |
| 356 | `can_make_bones` | - | Missing |
| 259 | `drop_upon_death` | - | Missing |
| 786 | `fix_ghostly_obj` | - | Missing |
| 308 | `fixuporacle` | - | Missing |
| 823 | `free_ebones` | - | Missing |
| 629 | `getbones` | - | Missing |
| 226 | `give_to_nearby_mon` | - | Missing |
| 42 | `goodfruit` | - | Missing |
| 808 | `newebones` | - | Missing |
| 390 | `remove_mon_from_bones` | - | Missing |
| 51 | `resetobjs` | - | Missing |
| 198 | `sanitize_name` | - | Missing |
| 403 | `savebones` | - | Missing |
| 774 | `set_ghostly_objlist` | - | Missing |

### botl.c -> botl.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 4215 | `all_options_statushilites` | botl.js:694 | Implemented |
| 1629 | `anything_to_s` | - | Missing |
| 1903 | `bl_idx_to_fldname` | botl.js:252 | Implemented |
| 256 | `bot` | - | Missing |
| 744 | `bot_via_windowport` | - | Missing |
| 422 | `botl_score` | - | Missing |
| 43 | `check_gold_symbol` | - | Missing |
| 3094 | `clear_status_hilites` | botl.js:389 | Implemented |
| 1556 | `compare_blstats` | - | Missing |
| 1086 | `cond_cmp` | botl.js:623 | Implemented |
| 1129 | `cond_menu` | - | Missing |
| 2884 | `conditionbitmask2str` | botl.js:353 | Implemented |
| 1056 | `condopt` | - | Missing |
| 3220 | `count_status_hilites` | botl.js:457 | Implemented |
| 444 | `describe_level` | - | Missing |
| 51 | `do_statusline1` | - | Missing |
| 104 | `do_statusline2` | - | Missing |
| 1246 | `eval_notify_windowport_field` | - | Missing |
| 1374 | `evaluate_and_notify_windowport` | - | Missing |
| 1833 | `exp_percent_changing` | - | Missing |
| 1795 | `exp_percentage` | botl.js:230 | Implemented |
| 1964 | `fldname_to_bl_indx` | botl.js:645 | Implemented |
| 2107 | `get_hilite` | - | Missing |
| 24 | `get_strength_str` | botl.js:90 | Implemented |
| 2416 | `has_ltgt_percentnumber` | botl.js:272 | Implemented |
| 2000 | `hilite_reset_needed` | botl.js:258 | Implemented |
| 3112 | `hlattr2attrname` | botl.js:403 | Implemented |
| 1506 | `init_blstats` | - | Missing |
| 2473 | `is_fld_arrayvalues` | botl.js:282 | Implemented |
| 2395 | `is_ltgt_percentnumber` | botl.js:667 | Implemented |
| 2914 | `match_str2conditionbitmask` | botl.js:708 | Implemented |
| 405 | `max_rank_sz` | - | Missing |
| 1099 | `menualpha_cmp` | botl.js:636 | Implemented |
| 2079 | `noneoftheabove` | - | Missing |
| 1213 | `opt_next_cond` | - | Missing |
| 1107 | `parse_cond_option` | botl.js:146 | Implemented |
| 2976 | `parse_condition` | - | Missing |
| 2336 | `parse_status_hl1` | - | Missing |
| 2557 | `parse_status_hl2` | - | Missing |
| 1720 | `percentage` | botl.js:178 | Implemented |
| 2490 | `query_arrayvalue` | botl.js:291 | Implemented |
| 2852 | `query_conditions` | botl.js:331 | Implemented |
| 364 | `rank` | botl.js:120 | Implemented |
| 335 | `rank_of` | role.js:362 rankOf | Implemented |
| 318 | `rank_to_xlev` | botl.js:115 | Implemented |
| 1913 | `repad_with_dashes` | - | Missing |
| 2064 | `reset_status_hilites` | - | Missing |
| 1673 | `s_to_anything` | - | Missing |
| 2319 | `split_clridx` | botl.js:266 | Implemented |
| 2431 | `splitsubfields` | - | Missing |
| 1874 | `stat_cap_indx` | - | Missing |
| 1889 | `stat_hunger_indx` | - | Missing |
| 1038 | `stat_update_time` | - | Missing |
| 2022 | `status_eval_next_unhilite` | - | Missing |
| 1470 | `status_finish` | botl.js:159 | Implemented |
| 3333 | `status_hilite2str` | - | Missing |
| 2527 | `status_hilite_add_threshold` | botl.js:312 | Implemented |
| 3160 | `status_hilite_linestr_add` | - | Missing |
| 3205 | `status_hilite_linestr_countfield` | botl.js:448 | Implemented |
| 3191 | `status_hilite_linestr_done` | botl.js:436 | Implemented |
| 3313 | `status_hilite_linestr_gather` | botl.js:466 | Implemented |
| 3231 | `status_hilite_linestr_gather_conditions` | - | Missing |
| 4236 | `status_hilite_menu` | - | Missing |
| 3633 | `status_hilite_menu_add` | - | Missing |
| 3450 | `status_hilite_menu_choose_behavior` | botl.js:500 | Implemented |
| 3415 | `status_hilite_menu_choose_field` | botl.js:480 | Implemented |
| 3554 | `status_hilite_menu_choose_updownboth` | botl.js:567 | Implemented |
| 4095 | `status_hilite_menu_fld` | - | Missing |
| 4043 | `status_hilite_remove` | - | Missing |
| 4194 | `status_hilites_viewall` | botl.js:681 | Implemented |
| 1433 | `status_initialize` | - | Missing |
| 2952 | `str2conditionbitmask` | botl.js:373 | Implemented |
| 278 | `timebot` | - | Missing |
| 370 | `title_to_mon` | botl.js:125 | Implemented |
| 301 | `xlev_to_rank` | botl.js:110 | Implemented |

### calendar.c -> calendar.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 215 | `friday_13th` | - | Missing |
| 47 | `getlt` | - | Missing |
| 32 | `getnow` | - | Missing |
| 55 | `getyear` | - | Missing |
| 86 | `hhmmss` | - | Missing |
| 232 | `midnight` | - | Missing |
| 224 | `night` | - | Missing |
| 200 | `phase_of_the_moon` | - | Missing |
| 126 | `time_from_yyyymmddhhmmss` | - | Missing |
| 62 | `yyyymmdd` | - | Missing |
| 101 | `yyyymmddhhmmss` | - | Missing |

### cfgfiles.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 439 | `adjust_prefix` | - | Missing |
| 1887 | `assure_syscf_file` | - | Missing |
| 1435 | `can_read_file` | - | Missing |
| 462 | `choose_random_part` | - | Missing |
| 1119 | `cnf_line_ACCESSIBILITY` | - | Missing |
| 623 | `cnf_line_AUTOCOMPLETE` | - | Missing |
| 610 | `cnf_line_AUTOPICKUP_EXCEPTION` | - | Missing |
| 617 | `cnf_line_BINDINGS` | - | Missing |
| 693 | `cnf_line_BONESDIR` | - | Missing |
| 872 | `cnf_line_BONES_POOLS` | - | Missing |
| 1154 | `cnf_line_BOULDER` | - | Missing |
| 913 | `cnf_line_CHECK_PLNAME` | - | Missing |
| 904 | `cnf_line_CHECK_SAVE_UID` | - | Missing |
| 737 | `cnf_line_CONFIGDIR` | - | Missing |
| 1110 | `cnf_line_CRASHREPORTURL` | - | Missing |
| 704 | `cnf_line_DATADIR` | - | Missing |
| 837 | `cnf_line_DEBUGFILES` | - | Missing |
| 850 | `cnf_line_DUMPLOGFILE` | - | Missing |
| 993 | `cnf_line_ENTRYMAX` | - | Missing |
| 828 | `cnf_line_EXPLORERS` | - | Missing |
| 1080 | `cnf_line_GDBPATH` | - | Missing |
| 863 | `cnf_line_GENERICUSERS` | - | Missing |
| 1095 | `cnf_line_GREPPATH` | - | Missing |
| 636 | `cnf_line_HACKDIR` | - | Missing |
| 944 | `cnf_line_HIDEUSAGE` | - | Missing |
| 1168 | `cnf_line_HILITE_STATUS` | - | Missing |
| 651 | `cnf_line_LEVELDIR` | - | Missing |
| 1033 | `cnf_line_LIVELOG` | - | Missing |
| 726 | `cnf_line_LOCKDIR` | - | Missing |
| 953 | `cnf_line_MAXPLAYERS` | - | Missing |
| 1019 | `cnf_line_MAX_STATUENAME_RANK` | - | Missing |
| 1162 | `cnf_line_MENUCOLOR` | - | Missing |
| 819 | `cnf_line_MSGHANDLER` | - | Missing |
| 630 | `cnf_line_MSGTYPE` | - | Missing |
| 759 | `cnf_line_NAME` | - | Missing |
| 601 | `cnf_line_OPTIONS` | - | Missing |
| 1065 | `cnf_line_PANICTRACE_GDB` | - | Missing |
| 1050 | `cnf_line_PANICTRACE_LIBC` | - | Missing |
| 967 | `cnf_line_PERSMAX` | - | Missing |
| 980 | `cnf_line_PERS_IS_UID` | - | Missing |
| 1006 | `cnf_line_POINTSMIN` | - | Missing |
| 1132 | `cnf_line_PORTABLE_DEVICE_PATHS` | - | Missing |
| 1278 | `cnf_line_QT_COMPACT` | - | Missing |
| 1264 | `cnf_line_QT_FONTSIZE` | - | Missing |
| 1250 | `cnf_line_QT_TILEHEIGHT` | - | Missing |
| 1236 | `cnf_line_QT_TILEWIDTH` | - | Missing |
| 895 | `cnf_line_RECOVER` | - | Missing |
| 1189 | `cnf_line_ROGUESYMBOLS` | - | Missing |
| 766 | `cnf_line_ROLE` | - | Missing |
| 671 | `cnf_line_SAVEDIR` | - | Missing |
| 715 | `cnf_line_SCOREDIR` | - | Missing |
| 922 | `cnf_line_SEDUCE` | - | Missing |
| 810 | `cnf_line_SHELLERS` | - | Missing |
| 1228 | `cnf_line_SOUND` | - | Missing |
| 1219 | `cnf_line_SOUNDDIR` | - | Missing |
| 886 | `cnf_line_SUPPORT` | - | Missing |
| 1200 | `cnf_line_SYMBOLS` | - | Missing |
| 748 | `cnf_line_TROUBLEDIR` | - | Missing |
| 1179 | `cnf_line_WARNINGS` | - | Missing |
| 793 | `cnf_line_WIZARDS` | - | Missing |
| 1211 | `cnf_line_WIZKIT` | - | Missing |
| 783 | `cnf_line_catname` | - | Missing |
| 776 | `cnf_line_dogname` | - | Missing |
| 1669 | `cnf_parser_done` | - | Missing |
| 1654 | `cnf_parser_init` | - | Missing |
| 1536 | `config_erradd` | - | Missing |
| 1857 | `config_error_add` | - | Missing |
| 1584 | `config_error_done` | - | Missing |
| 1462 | `config_error_init` | - | Missing |
| 1485 | `config_error_nextline` | - | Missing |
| 167 | `do_write_config_file` | - | Missing |
| 586 | `find_optparam` | - | Missing |
| 221 | `fopen_config_file` | - | Missing |
| 505 | `free_config_sections` | - | Missing |
| 141 | `get_configfile` | - | Missing |
| 147 | `get_default_configfile` | - | Missing |
| 379 | `get_uchars` | - | Missing |
| 550 | `handle_config_section` | - | Missing |
| 521 | `is_config_section` | - | Missing |
| 1508 | `l_get_config_errors` | - | Missing |
| 1685 | `parse_conf_buf` | - | Missing |
| 1836 | `parse_conf_file` | - | Missing |
| 1802 | `parse_conf_str` | - | Missing |
| 1384 | `parse_config_line` | - | Missing |
| 1616 | `read_config_file` | - | Missing |
| 214 | `set_configfile_name` | - | Missing |
| 1867 | `vconfig_error_add` | - | Missing |

### cmd.c -> cmd.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 3560 | `accept_menu_prefix` | cmd.js:rhack (m prefix) | Implemented (inlined in rhack) |
| 4704 | `act_on_act` | - | N/A (action repeat internals, handled by run_command) |
| 3344 | `all_options_autocomplete` | cmd.js:1379 | Implemented |
| 2758 | `bind_key` | - | N/A (key binding system, JS uses fixed dispatch) |
| 2790 | `bind_key_fn` | - | N/A (key binding system) |
| 2720 | `bind_mousebtn` | - | N/A (mouse button binding) |
| 3242 | `bind_specialkey` | - | N/A (special key binding) |
| 647 | `can_do_extcmd` | cmd.js:handleExtendedCommand | Implemented (wizard check inlined) |
| 4952 | `click_to_cmd` | - | N/A (mouse click handling) |
| 3079 | `cmd_from_dir` | cmd.js:1362 | Implemented |
| 3119 | `cmd_from_ecname` | - | N/A (command table lookup, JS uses direct dispatch) |
| 3086 | `cmd_from_func` | - | N/A (command table lookup) |
| 3154 | `cmdname_from_func` | - | N/A (command table lookup) |
| 478 | `cmdq_add_dir` | input.js:137 | Aligned |
| 438 | `cmdq_add_ec` | input.js:123 | Aligned |
| 519 | `cmdq_add_int` | input.js:151 | Aligned |
| 458 | `cmdq_add_key` | input.js:130 | Aligned |
| 500 | `cmdq_add_userinput` | input.js:146 | Aligned |
| 615 | `cmdq_clear` | input.js:220 | Aligned |
| 571 | `cmdq_copy` | input.js:183 | Aligned |
| 608 | `cmdq_peek` | input.js:215 | Aligned |
| 594 | `cmdq_pop` | input.js:204 | Aligned |
| 557 | `cmdq_reverse` | input.js:170 | Aligned |
| 539 | `cmdq_shift` | input.js:158 | Aligned |
| 2808 | `commands_init` | - | N/A (command table initialization, JS uses static dispatch) |
| 4346 | `confdir` | hack.js:2701 | Implemented |
| 3360 | `count_autocompletions` | cmd.js:1390 | Implemented |
| 2360 | `count_bind_keys` | - | N/A (key binding system) |
| 4359 | `directionname` | cmd.js:1462 | Implemented |
| 1874 | `do_fight` | cmd.js:rhack (F prefix) | Aligned |
| 1684 | `do_move_east` | cmd.js:1183 | Implemented |
| 1670 | `do_move_north` | cmd.js:1171 | Implemented |
| 1677 | `do_move_northeast` | cmd.js:1177 | Implemented |
| 1663 | `do_move_northwest` | cmd.js:1165 | Implemented |
| 1698 | `do_move_south` | cmd.js:1195 | Implemented |
| 1691 | `do_move_southeast` | cmd.js:1189 | Implemented |
| 1705 | `do_move_southwest` | cmd.js:1201 | Implemented |
| 1656 | `do_move_west` | cmd.js:1159 | Implemented |
| 1890 | `do_repeat` | allmain.js:549, cmd.js:612 | APPROX |
| 1827 | `do_reqmenu` | cmd.js:rhack (m prefix) | Aligned |
| 1858 | `do_run` | hack.js:do_run | APPROX |
| 1798 | `do_run_east` | cmd.js:1279 | Implemented |
| 1784 | `do_run_north` | cmd.js:1267 | Implemented |
| 1791 | `do_run_northeast` | cmd.js:1273 | Implemented |
| 1777 | `do_run_northwest` | cmd.js:1261 | Implemented |
| 1812 | `do_run_south` | cmd.js:1291 | Implemented |
| 1805 | `do_run_southeast` | cmd.js:1285 | Implemented |
| 1819 | `do_run_southwest` | cmd.js:1297 | Implemented |
| 1770 | `do_run_west` | cmd.js:1255 | Implemented |
| 1842 | `do_rush` | hack.js:do_rush | APPROX |
| 1741 | `do_rush_east` | cmd.js:1231 | Implemented |
| 1727 | `do_rush_north` | cmd.js:1219 | Implemented |
| 1734 | `do_rush_northeast` | cmd.js:1225 | Implemented |
| 1720 | `do_rush_northwest` | cmd.js:1213 | Implemented |
| 1755 | `do_rush_south` | cmd.js:1243 | Implemented |
| 1748 | `do_rush_southeast` | cmd.js:1237 | Implemented |
| 1762 | `do_rush_southwest` | cmd.js:1249 | Implemented |
| 1713 | `do_rush_west` | cmd.js:1207 | Implemented |
| 708 | `doc_extcmd_flagstr` | cmd.js:1628 | Implemented |
| 5425 | `doclicklook` | - | N/A (mouse click look) |
| 677 | `doextcmd` | cmd.js:handleExtendedCommand | APPROX — handles #commands subset |
| 746 | `doextlist` | - | Missing |
| 4380 | `doherecmdmenu` | - | Missing |
| 2917 | `dokeylist` | - | N/A (key listing display) |
| 1577 | `dolookaround` | hack.js:lookaround | Implemented (in hack.js) |
| 1530 | `dolookaround_floodfill_findroom` | cmd.js:1133 | Implemented |
| 1074 | `domonability` | - | Missing |
| 4962 | `domouseaction` | - | N/A (mouse action handler) |
| 342 | `doprev_message` | pager.js:handlePrevMessages | Aligned |
| 5726 | `dosh_core` | - | N/A (shell escape, not applicable in browser) |
| 5706 | `dosuspend_core` | - | N/A (process suspend, not applicable in browser) |
| 1365 | `doterrain` | - | Missing |
| 4389 | `dotherecmdmenu` | - | Missing |
| 5343 | `dotravel` | hack.js:dotravel | APPROX — cursor-based travel |
| 5392 | `dotravel_target` | cmd.js:rhack (ch=31) | APPROX — retravel via stored destination |
| 3907 | `dtoxy` | cmd.js:1412 | Implemented |
| 5743 | `dummyfunction` | cmd.js:1572 | Implemented |
| 3949 | `dxdy_moveok` | cmd.js:1417 | Implemented |
| 3140 | `ecname_from_fn` | - | N/A (command table lookup) |
| 5227 | `end_of_input` | - | N/A (signal handling) |
| 1136 | `enter_explore_mode` | - | Missing |
| 3066 | `ext_func_tab_from_func` | - | N/A (command table lookup) |
| 641 | `extcmd_initiator` | cmd.js:handleExtendedCommand | Implemented (inlined) |
| 936 | `extcmd_via_menu` | - | Missing |
| 2351 | `extcmds_getentry` | cmd.js:1577 | Implemented |
| 2622 | `extcmds_match` | - | Missing |
| 3977 | `get_adjacent_loc` | - | Missing |
| 2374 | `get_changed_key_binds` | - | N/A (key binding system) |
| 5056 | `get_count` | input.js:644 getCount | Implemented |
| 4004 | `getdir` | hack.js:3759 | Implemented |
| 2548 | `handler_change_autocompletions` | - | N/A (key binding system) |
| 2507 | `handler_rebind_keys` | - | N/A (key binding system) |
| 2405 | `handler_rebind_keys_add` | - | N/A (key binding system) |
| 5203 | `hangup` | - | N/A (signal handling) |
| 175 | `harness_dump_checkpoint` | - | N/A (debug harness) |
| 4217 | `help_dir` | - | Missing |
| 4945 | `here_cmd_menu` | - | Missing |
| 4372 | `isok` | cmd.js:1469 | Implemented |
| 155 | `json_write_escaped` | cmd.js:1617 | Implemented |
| 2660 | `key2extcmddesc` | - | N/A (key listing) |
| 3273 | `key2txt` | cmd.js:1583 | Implemented |
| 2843 | `keylist_func_has_key` | - | N/A (key listing) |
| 2859 | `keylist_putcmds` | - | N/A (key listing) |
| 1356 | `levltyp_to_name` | - | N/A (debug helper) |
| 3374 | `lock_mouse_buttons` | - | N/A (mouse handling) |
| 1543 | `lookaround_known_room` | - | Missing |
| 1170 | `makemap_prepost` | - | N/A (wizard debug) |
| 4467 | `mcmd_addmenu` | - | Missing |
| 3917 | `movecmd` | cmd.js:rhack (inlined) | Implemented (movement dispatch inlined in rhack) |
| 5699 | `paranoid_query` | - | Missing |
| 5632 | `paranoid_ynq` | - | Missing |
| 5142 | `parse` | cmd.js:rhack + allmain.js:run_command | Implemented (command parsing distributed across rhack and run_command) |
| 3292 | `parseautocomplete` | cmd.js:handleExtendedCommand | Implemented (autocomplete in extended command handler) |
| 629 | `pgetchar` | input.js:nhgetch | Implemented |
| 3632 | `random_response` | cmd.js:1603 | Implemented |
| 3568 | `randomkey` | - | N/A (random keystroke for confusion) |
| 5320 | `readchar` | cmd.js:1557 | Implemented |
| 5257 | `readchar_core` | input.js:nhgetch | Implemented |
| 5332 | `readchar_poskey` | - | N/A (position-key variant for mouse) |
| 3958 | `redraw_cmd` | - | N/A (tty redraw) |
| 3658 | `reset_cmd_vars` | - | N/A (command variable reset, handled inline) |
| 3392 | `reset_commands` | - | N/A (command table reset) |
| 377 | `reset_occupations` | cmd.js:1043 | Implemented |
| 3678 | `rhack` | cmd.js:rhack | APPROX — dispatches all commands, missing many C bindings |
| 3652 | `rnd_extcmd_idx` | cmd.js:1399 | Implemented |
| 1639 | `set_move_cmd` | cmd.js:rhack (inlined) | Implemented (movement setup inlined) |
| 388 | `set_occupation` | cmd.js:258 (inlined) | Implemented (occupation setup inlined in command handlers) |
| 4168 | `show_direction_keys` | - | Missing |
| 3256 | `spkey_name` | cmd.js:1367 | Implemented |
| 4889 | `there_cmd_menu` | cmd.js:there_cmd_menu_far/next2u | Implemented (split into far/next2u/common) |
| 4685 | `there_cmd_menu_common` | cmd.js:1542 | Implemented |
| 4670 | `there_cmd_menu_far` | cmd.js:1532 | Implemented |
| 4570 | `there_cmd_menu_next2u` | cmd.js:1474 | Implemented |
| 4481 | `there_cmd_menu_self` | - | Missing |

| 350 | `timed_occupation` | cmd.js:1032 | Implemented |
| 1513 | `u_can_see_whole_selection` | - | Missing |
| 1480 | `u_have_seen_bounds_selection` | - | Missing |
| 1462 | `u_have_seen_whole_selection` | - | Missing |
| 3534 | `update_rest_on_space` | - | N/A (rest-on-space option, handled inline) |
| 1258 | `wiz_dumpmap` | - | N/A (wizard debug) |
| 1292 | `wiz_dumpobj` | - | Missing |
| 1322 | `wiz_dumpsnap` | - | Missing |
| 3895 | `xytod` | cmd.js:1404 | Implemented |
| 5446 | `yn_func_menu_opt` | cmd.js:1564 | Implemented |
| 5515 | `yn_function` | - | Missing |
| 5463 | `yn_function_menu` | - | Missing |
| 5438 | `yn_menuable_resp` | - | Missing |

### coloratt.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 606 | `add_menu_coloring` | - | Missing |
| 574 | `add_menu_coloring_parsed` | - | Missing |
| 1100 | `alt_color_spec` | - | Missing |
| 1037 | `alternative_palette` | - | Missing |
| 309 | `attr2attrname` | - | Missing |
| 519 | `basic_menu_colors` | - | Missing |
| 1087 | `change_palette` | - | Missing |
| 712 | `check_enhanced_colors` | - | Missing |
| 986 | `closest_color` | - | Missing |
| 327 | `clr2colorname` | - | Missing |
| 250 | `color_attr_parse_str` | - | Missing |
| 238 | `color_attr_to_str` | - | Missing |
| 968 | `color_distance` | - | Missing |
| 226 | `colortable_to_int32` | - | Missing |
| 1025 | `count_alt_palette` | - | Missing |
| 698 | `count_menucolors` | - | Missing |
| 653 | `free_menu_coloring` | - | Missing |
| 673 | `free_one_menu_coloring` | - | Missing |
| 1013 | `get_nhcolor_from_256_index` | - | Missing |
| 363 | `match_str2attr` | - | Missing |
| 338 | `match_str2clr` | - | Missing |
| 790 | `onlyhexdigits` | - | Missing |
| 385 | `query_attr` | - | Missing |
| 464 | `query_color` | - | Missing |
| 293 | `query_color_attr` | - | Missing |
| 802 | `rgbstr_to_int32` | - | Missing |
| 857 | `set_map_customcolor` | - | Missing |
| 753 | `wc_color_name` | - | Missing |

### date.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 134 | `free_nomakedefs` | - | Missing |
| 52 | `populate_nomakedefs` | - | Missing |

### dbridge.c -> dbridge.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 361 | `E_phrase` | - | Missing |
| 464 | `automiss` | - | Missing |
| 753 | `close_drawbridge` | - | Missing |
| 235 | `create_drawbridge` | - | Missing |
| 116 | `db_under_typ` | - | Missing |
| 866 | `destroy_drawbridge` | - | Missing |
| 532 | `do_entity` | - | Missing |
| 286 | `e_at` | - | Missing |
| 402 | `e_died` | - | Missing |
| 509 | `e_jumps` | - | Missing |
| 474 | `e_missed` | - | Missing |
| 351 | `e_nam` | - | Missing |
| 380 | `e_survives_at` | - | Missing |
| 180 | `find_drawbridge` | - | Missing |
| 211 | `get_wall_for_db` | - | Missing |
| 170 | `is_db_wall` | - | Missing |
| 137 | `is_drawbridge_wall` | - | Missing |
| 86 | `is_ice` | - | Missing |
| 62 | `is_lava` | - | Missing |
| 100 | `is_moat` | - | Missing |
| 46 | `is_pool` | - | Missing |
| 77 | `is_pool_or_lava` | - | Missing |
| 38 | `is_waterwall` | - | Missing |
| 304 | `m_to_e` | - | Missing |
| 741 | `nokiller` | - | Missing |
| 818 | `open_drawbridge` | - | Missing |
| 330 | `set_entity` | - | Missing |
| 321 | `u_to_e` | - | Missing |

### decl.c -> decl.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1066 | `decl_globals_init` | - | Missing |
| 1185 | `sa_victual` | - | Missing |

### detect.c -> detect.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 107 | `browse_map` | detect.js:116 | Implemented |
| 263 | `check_map_spot` | detect.js:202 | Implemented |
| 319 | `clear_stale_map` | detect.js:203 | Implemented |
| 1590 | `cvt_sdoor_to_door` | detect.js:757 | Implemented |
| 908 | `detect_obj_traps` | detect.js:538 | Implemented |
| 1930 | `detecting` | detect.js:920 | Implemented |
| 957 | `display_trap_map` | detect.js:display_trap_map | Implemented |
| 1423 | `do_mapping` | detect.js:do_mapping | Implemented |
| 1449 | `do_vicinity_map` | detect.js:do_vicinity_map | Implemented |
| 2098 | `dosearch` | detect.js:dosearch | Implemented |
| 2017 | `dosearch0` | detect.js:dosearch0 | RNG-PARITY — search for hidden doors/traps |
| 2295 | `dump_map` | detect.js:1068 | Implemented |
| 1936 | `find_trap` | detect.js:find_trap | Implemented |
| 1793 | `findit` | detect.js:855 | Implemented |
| 1640 | `findone` | detect.js:findone_fn | Implemented |
| 480 | `food_detect` | detect.js:333 | Implemented |
| 1611 | `foundone` | detect.js:773 | Implemented |
| 1092 | `furniture_detect` | detect.js:641 | Implemented |
| 336 | `gold_detect` | detect.js:246 | Implemented |
| 1143 | `level_distance` | detect.js:648 | Implemented |
| 123 | `map_monst` | detect.js:117 | Implemented |
| 95 | `map_redisplay` | detect.js:1090 | Implemented |
| 1966 | `mfind0` | detect.js:938 | Implemented |
| 799 | `monster_detect` | detect.js:481 | Implemented |
| 202 | `o_in` | detect.js:162 | Implemented |
| 230 | `o_material` | detect.js:178 | Implemented |
| 604 | `object_detect` | detect.js:406 | Implemented |
| 250 | `observe_recursively` | detect.js:193 | Implemented |
| 1903 | `openit` | detect.js:908 | Implemented |
| 1730 | `openone` | detect.js:openone | Implemented |
| 2135 | `premap_detect` | detect.js:1051 | Implemented |
| 86 | `reconstrain_map` | detect.js:reconstrain_map | Implemented |
| 2357 | `reveal_terrain` | detect.js:reveal_terrain | Implemented |
| 2168 | `reveal_terrain_getglyph` | - | Missing |
| 866 | `sense_trap` | detect.js:522 | Implemented |
| 1373 | `show_map_spot` | detect.js:713 | Implemented |
| 2125 | `skip_premap_detect` | detect.js:1045 | Implemented |
| 1012 | `trap_detect` | detect.js:trap_detect | Implemented |
| 140 | `trapped_chest_at` | detect.js:214 | Implemented |
| 183 | `trapped_door_at` | detect.js:233 | Implemented |
| 71 | `unconstrain_map` | detect.js:143 | Implemented |
| 1207 | `use_crystal_ball` | detect.js:use_crystal_ball | Implemented |
| 2108 | `warnreveal` | detect.js:1032 | Implemented |

### dig.c -> dig.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1763 | `adj_pit_checks` | dig.js:adj_pit_checks | Implemented |
| 1885 | `buried_ball` | dig.js:1548 | Implemented |
| 1958 | `buried_ball_to_freedom` | dig.js:1603 | Implemented |
| 1935 | `buried_ball_to_punishment` | dig.js:1583 | Implemented |
| 1984 | `bury_an_obj` | dig.js:1628 | Implemented |
| 2193 | `bury_monst` | dig.js:1801 | Implemented |
| 2273 | `bury_obj` | dig.js:bury_obj | Implemented |
| 2050 | `bury_objs` | dig.js:1686 | Implemented |
| 2212 | `bury_you` | dig.js:1820 | Implemented |
| 300 | `dig` | dig.js:1125 | Implemented |
| 207 | `dig_check` | dig.js:1458 | Implemented |
| 169 | `dig_typ` | dig.js:153 | Implemented |
| 1027 | `dig_up_grave` | dig.js:549 | Implemented |
| 640 | `digactualhole` | dig.js:370 | Implemented |
| 255 | `digcheck_fail_message` | dig.js:digcheck_fail_message | Implemented |
| 885 | `dighole` | dig.js:434 | Implemented |
| 1504 | `draft_message` | dig.js:618 | Implemented |
| 2241 | `escape_tomb` | dig.js:1855 | Implemented |
| 606 | `fillholetyp` | dig.js:299 | Implemented |
| 571 | `furniture_handled` | dig.js:336 | Implemented |
| 597 | `holetime` | dig.js:1438 | Implemented |
| 195 | `is_digging` | dig.js:1423 | Implemented |
| 838 | `liquid_flow` | dig.js:414 | Implemented |
| 1414 | `mdig_tunnel` | dig.js:197 | Implemented |
| 88 | `mkcavearea` | dig.js:mkcavearea | Implemented |
| 48 | `mkcavepos` | dig.js:1907 | Implemented |
| 141 | `pick_can_reach` | dig.js:pick_can_reach | Implemented |
| 1844 | `pit_flow` | dig.js:pit_flow | Implemented |
| 30 | `rm_waslit` | dig.js:1894 | Implemented |
| 2146 | `rot_corpse` | dig.js:1764 | Implemented |
| 2125 | `rot_organic` | dig.js:1736 | Implemented |
| 2086 | `unearth_objs` | dig.js:1705 | Implemented |
| 2230 | `unearth_you` | dig.js:1841 | Implemented |
| 1092 | `use_pick_axe` | dig.js:957 | Implemented |
| 1162 | `use_pick_axe2` | dig.js:983 | Implemented |
| 1377 | `watch_dig` | dig.js:663 | Implemented |
| 1362 | `watchman_canseeu` | dig.js:watchman_canseeu | Implemented |
| 2288 | `wiz_debug_cmd_bury` | dig.js:wiz_debug_cmd_bury | Implemented |
| 1548 | `zap_dig` | dig.js:715 | Implemented |

### display.c -> display.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2305 | `back_to_glyph` | display.js:computeGlyph (inlined) | Implemented (memory glyph logic inlined in computeGlyph) |
| 201 | `canseemon` | display.js:1372 | Implemented |
| 3148 | `check_pos` | display.js:1920 | Implemented |
| 2125 | `clear_glyph_buffer` | - | N/A (JS uses live map grid, no glyph buffer) |
| 2207 | `cls` | display.js:1848 | Implemented |
| 2717 | `cmap_to_roguecolor` | - | N/A (rogue display mode not supported) |
| 1689 | `curs_on_u` | display.js:1814 | Implemented |
| 527 | `display_monster` | display.js:1440 | Implemented (helper) |
| 647 | `display_warning` | display.js:1403 | Implemented |
| 1704 | `docrt` | display.js:1843 | Implemented |
| 1711 | `docrt_flags` | display.js:1830 | Implemented |
| 1696 | `doredraw` | display.js:1819 | Implemented |
| 3132 | `error4` | - | N/A (C wall-display error handler) |
| 759 | `feel_location` | display.js:1691 | Implemented |
| 739 | `feel_newsym` | display.js:1683 | Implemented |
| 1309 | `flash_glyph_at` | detect.js:124 | Implemented (in detect.js) |
| 2226 | `flush_screen` | display.js:2088 | Implemented |
| 3815 | `fn_cmap_to_glyph` | display.js:1819 | Implemented |
| 2525 | `get_bkglyph_and_framecolor` | - | N/A (glyph info struct, JS uses direct rendering) |
| 2496 | `glyph_at` | display.js:1902 | Implemented |
| 2505 | `glyphinfo_at` | display.js:newsym/computeGlyph (inlined) | Implemented (glyph info computed inline) |
| 215 | `is_safemon` | display.js:1403 | Implemented |
| 208 | `knowninvisible` | display.js:1381 | Implemented |
| 233 | `magic_map_background` | display.js:1489 | Implemented (shared map background path) |
| 279 | `map_background` | display.js:1489 | Implemented |
| 313 | `map_engraving` | display.js:1516 | Implemented |
| 2612 | `map_glyphinfo` | display.js:newsym/computeGlyph (inlined) | Implemented (glyph mapping inlined in newsym) |
| 391 | `map_invisible` | display.js:1868 | Implemented |
| 488 | `map_location` | display.js:1568 | Implemented |
| 333 | `map_object` | display.js:1532 | Implemented |
| 296 | `map_trap` | display.js:1551 | Implemented |
| 1534 | `mimic_light_blocking` | display.js:1805 | Implemented |
| 681 | `mon_overrides_region` | display.js:1451 | Implemented (simplified helper) |
| 187 | `mon_visible` | display.js:1357 | Implemented |
| 180 | `mon_warning` | display.js:1340 | Implemented |
| 3165 | `more_than_one` | - | N/A (debug check helper for wall display) |
| 931 | `newsym` | display.js:1878 | Implemented |
| 1865 | `newsym_force` | display.js:1725 | Implemented |
| 1780 | `redraw_map` | display.js:docrt_flags | Implemented (docrt_flags handles full map redraw) |
| 1820 | `reglyph_darkroom` | - | N/A (darkroom glyph handling inlined in computeGlyph) |
| 2757 | `reset_glyphmap` | - | N/A (JS uses direct character rendering, no glyph map tables) |
| 2165 | `row_refresh` | - | N/A (tty row-level rendering, JS uses full map redraw) |
| 1491 | `see_monsters` | display.js:2197 | Implemented |
| 1578 | `see_nearby_objects` | display.js:see_objects | Implemented (via see_objects + map_location) |
| 1560 | `see_objects` | display.js:1820 | Implemented |
| 1613 | `see_traps` | display.js:1829 | Implemented |
| 194 | `see_with_infrared` | display.js:1364 | Implemented |
| 173 | `sensemon` | display.js:1339 | Implemented |
| 3226 | `set_corn` | display.js:1929 | Implemented |
| 3258 | `set_crosswall` | display.js:1944 | Implemented |
| 1550 | `set_mimic_blocking` | display.js:1815 | Implemented |
| 3387 | `set_seenv` | display.js:1974 | Implemented |
| 3180 | `set_twall` | dungeon.js:3267 set_twall_mode | Implemented (in dungeon.js) |
| 3205 | `set_wall` | display.js:set_crosswall/set_corn (inlined) | Implemented (wall mode logic inlined) |
| 3348 | `set_wall_state` | display.js:1962 | Implemented (delegates to dungeon wallification) |
| 1114 | `shieldeff` | display.js:1701 | Implemented |
| 1879 | `show_glyph` | display.js:1387 | Implemented |
| 495 | `show_mon_or_warn` | display.js:1386 | Implemented |
| 728 | `suppress_map_output` | - | N/A (tty output suppression, not needed in JS) |
| 2455 | `swallow_to_glyph` | display.js:1890 | Implemented |
| 1336 | `swallowed` | display.js:1725 | Implemented |
| 3471 | `t_warn` | - | N/A (debug warning helper for wall display) |
| 1131 | `tether_glyph` | display.js:1712 | Implemented |
| 1178 | `tmp_at` | 259 (`animation.js`) | Aligned |
| 3126 | `type_to_name` | - | N/A (debug name lookup) |
| 1449 | `under_ground` | display.js:1782 | Implemented |
| 1399 | `under_water` | display.js:1751 | Implemented |
| 401 | `unmap_invisible` | display.js:1417 | Implemented |
| 422 | `unmap_object` | display.js:1431 | Implemented |
| 3402 | `unset_seenv` | - | N/A (inverse of set_seenv, not used in gameplay) |
| 3531 | `wall_angle` | display.js:computeGlyph (inlined) | Implemented (wall angle logic inlined in computeGlyph) |
| 667 | `warning_of` | display.js:1427 | Implemented |
| 3294 | `xy_set_wall_state` | dungeon.js:3329 | Implemented (in dungeon.js) |
| 2479 | `zapdir_to_glyph` | display.js:1899 | Implemented |

### dlb.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 263 | `build_dlb_filename` | - | Missing |
| 218 | `close_library` | - | Missing |
| 447 | `dlb_cleanup` | - | Missing |
| 483 | `dlb_fclose` | - | Missing |
| 529 | `dlb_fgetc` | - | Missing |
| 519 | `dlb_fgets` | - | Missing |
| 456 | `dlb_fopen` | - | Missing |
| 499 | `dlb_fread` | - | Missing |
| 509 | `dlb_fseek` | - | Missing |
| 539 | `dlb_ftell` | - | Missing |
| 429 | `dlb_init` | - | Missing |
| 175 | `find_file` | - | Missing |
| 252 | `lib_dlb_cleanup` | - | Missing |
| 292 | `lib_dlb_fclose` | - | Missing |
| 381 | `lib_dlb_fgetc` | - | Missing |
| 349 | `lib_dlb_fgets` | - | Missing |
| 273 | `lib_dlb_fopen` | - | Missing |
| 299 | `lib_dlb_fread` | - | Missing |
| 324 | `lib_dlb_fseek` | - | Missing |
| 391 | `lib_dlb_ftell` | - | Missing |
| 232 | `lib_dlb_init` | - | Missing |
| 201 | `open_library` | - | Missing |
| 127 | `readlibdir` | - | Missing |

### do.c -> do.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 947 | `better_not_try_to_drop_that` | - | Missing |
| 50 | `boulder_hits_pool` | - | Missing |
| 665 | `canletgo` | - | Missing |
| 2314 | `cmd_safety_prevention` | - | Missing |
| 1348 | `currentlevel_rewrite` | - | Missing |
| 2308 | `danger_uprops` | - | Missing |
| 2065 | `deferred_goto` | - | Missing |
| 363 | `doaltarobj` | - | Missing |
| 924 | `doddrop` | - | Missing |
| 1131 | `dodown` | - | Missing |
| 29 | `dodrop` | - | Missing |
| 2347 | `donull` | - | Missing |
| 498 | `dosinkring` | - | Missing |
| 1298 | `doup` | - | Missing |
| 2386 | `dowipe` | - | Missing |
| 714 | `drop` | - | Missing |
| 786 | `dropx` | - | Missing |
| 800 | `dropy` | - | Missing |
| 807 | `dropz` | - | Missing |
| 849 | `engulfer_digests_food` | - | Missing |
| 1448 | `familiar_level_msg` | - | Missing |
| 2033 | `final_level` | - | Missing |
| 162 | `flooreffects` | - | Missing |
| 1479 | `goto_level` | - | Missing |
| 2445 | `heal_legs` | - | Missing |
| 1993 | `hellish_smoke_mesg` | - | Missing |
| 2404 | `legs_in_no_shape` | - | Missing |
| 2022 | `maybe_lvltport_feedback` | - | Missing |
| 981 | `menu_drop` | - | Missing |
| 964 | `menudrop_split` | - | Missing |
| 893 | `obj_no_longer_held` | - | Missing |
| 404 | `polymorph_sink` | do.js:434 | Implemented |
| 2101 | `revive_corpse` | - | Missing |
| 2241 | `revive_mon` | - | Missing |
| 1375 | `save_currentstate` | - | Missing |
| 2047 | `schedule_goto` | - | Missing |
| 2422 | `set_wounded_legs` | - | Missing |
| 460 | `teleport_sink` | - | Missing |
| 2006 | `temperature_change_msg` | - | Missing |
| 395 | `trycall` | - | Missing |
| 1412 | `u_collide_m` | - | Missing |
| 1110 | `u_stuck_cannot_go` | - | Missing |
| 2357 | `wipeoff` | - | Missing |
| 2288 | `zombify_mon` | - | Missing |

### do_name.c -> do_name.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1142 | `Adjmonnam` | do_name.js:338 | Implemented |
| 1159 | `Amonnam` | do_name.js:351 | Implemented |
| 1289 | `Mgender` | do_name.js:77 | Implemented |
| 1074 | `Monnam` | do_name.js:296 | Implemented |
| 1092 | `Some_Monnam` | do_name.js:308 | Implemented |
| 1133 | `YMonnam` | do_name.js:332 | Implemented |
| 1152 | `a_monnam` | do_name.js:345 | Implemented |
| 158 | `alreadynamed` | do_name.js:838 | Implemented |
| 1415 | `bogon_is_pname` | do_name.js:532 | Implemented |
| 1369 | `bogusmon` | do_name.js:516 | Implemented |
| 480 | `call_ok` | do_name.js:896 | Implemented |
| 133 | `christen_monst` | do_name.js:39 | Implemented |
| 1557 | `christen_orc` | do_name.js:705 | Implemented |
| 1526 | `coyotename` | do_name.js:749 | Implemented |
| 1170 | `distant_monnam` | do_name.js:357 | Implemented |
| 199 | `do_mgivenname` | do_name.js:820 | Implemented |
| 290 | `do_oname` | do_name.js:864 | Implemented |
| 636 | `docall` | do_name.js:920 | Implemented |
| 605 | `docall_xname` | do_name.js:903 | Implemented |
| 499 | `docallcmd` | do_name.js:1098 | Implemented (as handleCallObjectTypePrompt) |
| 51 | `free_mgivenname` | do_name.js:804 | Implemented |
| 81 | `free_oname` | do_name.js:809 | Implemented |
| 1461 | `hcolor` | do_name.js:594 | Implemented |
| 1493 | `hliquid` | do_name.js:655 | Implemented |
| 1035 | `l_monnam` | do_name.js:270 | Implemented |
| 1627 | `lookup_novel` | do_name.js:951 | Implemented |
| 1110 | `m_monnam` | do_name.js:319 | Implemented |
| 1254 | `minimal_monnam` | do_name.js:383 | Implemented |
| 1042 | `mon_nam` | do_name.js:276 | Implemented |
| 1191 | `mon_nam_too` | do_name.js:363 | Implemented |
| 1313 | `mon_pmname` | do_name.js:98 | Implemented |
| 1221 | `monverbself` | do_name.js:373 | Implemented |
| 105 | `name_from_player` | do_name.js:828 | Implemented |
| 467 | `name_ok` | do_name.js:889 | Implemented |
| 679 | `namefloorobj` | do_name.js:909 | Implemented (stub — requires getpos) |
| 31 | `new_mgivenname` | do_name.js:805 | Implemented |
| 61 | `new_oname` | do_name.js:817 | Implemented |
| 1083 | `noit_Monnam` | do_name.js:302 | Implemented |
| 1054 | `noit_mon_nam` | do_name.js:282 | Implemented |
| 1102 | `noname_monnam` | do_name.js:314 | Implemented |
| 1611 | `noveltitle` | do_name.js:776 | Implemented |
| 1321 | `obj_pmname` | do_name.js:940 | Implemented |
| 429 | `objtyp_is_callable` | do_name.js:885 | Implemented |
| 372 | `oname` | do_name.js:859 | Implemented |
| 1303 | `pmname` | do_name.js:88 | Implemented |
| 1470 | `rndcolor` | do_name.js:632 | Implemented |
| 772 | `rndghostname` | do_name.js:926 | Implemented |
| 1389 | `rndmonnam` | do_name.js:547 | Implemented |
| 1538 | `rndorcname` | do_name.js:677 | Implemented |
| 1424 | `roguename` | do_name.js:730 | Implemented |
| 95 | `safe_oname` | do_name.js:814 | Implemented |
| 1065 | `some_mon_nam` | do_name.js:289 | Implemented |
| 827 | `x_monnam` | do_name.js:133 | Implemented |
| 1117 | `y_monnam` | do_name.js:324 | Implemented |

### do_wear.c -> do_wear.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1085 | `Amulet_off` | 309 | Full: ESP, life saving, strangulation, sleep, unchanging, reflection, breathing, guarding, flying extrinsic toggles |
| 958 | `Amulet_on` | 264 | Full: ESP, life saving, strangulation msg, sleep, change (gender swap), unchanging, reflection, breathing, guarding, flying |
| 934 | `Armor_gone` | do_wear.js:494 | Implemented |
| 904 | `Armor_off` | 259 | No-op (matches C) |
| 882 | `Armor_on` | 258 | No-op (matches C) |
| 1490 | `Blindf_off` | do_wear.js:862 | Implemented |
| 1456 | `Blindf_on` | do_wear.js:848 | Implemented |
| 261 | `Boots_off` | 104 | Speed slow message+makeknown, stealth, fumble clear, levitation. Missing: float_down, water walking sink check |
| 186 | `Boots_on` | 84 | Speed message+makeknown, stealth, fumble timeout, levitation+makeknown. Missing: float_up, water walking |
| 382 | `Cloak_off` | 147 | Stealth, displacement, invisibility+makeknown. Missing: mummy wrapping, alchemy smock acid_res |
| 325 | `Cloak_on` | 124 | Stealth, displacement, invisibility+makeknown, protection+makeknown. Missing: mummy wrapping, oilskin, alchemy smock |
| 645 | `Gloves_off` | 228 | Fumble clear, power STR restore, dexterity. Missing: cockatrice corpse check |
| 575 | `Gloves_on` | 209 | Fumble timeout, power STR=25+makeknown, dexterity |
| 517 | `Helmet_off` | 189 | Brilliance adj_abon reverse, telepathy, dunce cap. Missing: fedora luck, cornuthaum CHA, helm of opposite alignment |
| 433 | `Helmet_on` | 168 | Brilliance adj_abon, telepathy, dunce cap. Missing: fedora luck, cornuthaum, helm of opposite alignment |
| 1450 | `Ring_gone` | do_wear.js:Ring_gone | Implemented (wrapper for Ring_off_or_gone with gone=true) |
| 1444 | `Ring_off` | 399 | All 28 ring types with extrinsic toggles via Ring_off_or_gone. Missing: float_up, self_invis_message, see_monsters, newsym |
| 1342 | `Ring_off_or_gone` | do_wear.js:Ring_off_or_gone | Implemented (full switch over ring types, adjust_attrib for attr rings) |
| 1237 | `Ring_on` | 366 | All 28 ring types: passive extrinsics, stealth, warning, see_invis, invis, levitation, attribute rings, accuracy/damage, protection+find_ac, shape changers. Uses oldprop via RING_OPROP_MAP. Missing: float_up, self_invis_message, see_monsters, newsym |
| 730 | `Shield_off` | 252 | No-op (matches C) |
| 704 | `Shield_on` | 251 | No-op (matches C) |
| 773 | `Shirt_off` | 256 | No-op (matches C) |
| 754 | `Shirt_on` | 255 | No-op (matches C) |
| 2204 | `accessory_or_armor_on` | do_wear.js:accessory_or_armor_on | Implemented (delegates to putOnSelectedItem; nomul/afternmv for armor delay) |
| 3254 | `adj_abon` | 343 | Simplified: clamps attr to [3,25], no racial cap or Fixed_abil check |
| 1218 | `adjust_attrib` | do_wear.js:adjust_attrib | Implemented (ABON adjustment with learnring+extremeattr) |
| 2006 | `already_wearing` | do_wear.js:2371 | Implemented |
| 2012 | `already_wearing2` | do_wear.js:2376 | Implemented |
| 3415 | `any_worn_armor_ok` | do_wear.js:1709 | Implemented |
| 1766 | `armor_or_accessory_off` | do_wear.js:1258 | Implemented |
| 1915 | `armoroff` | do_wear.js:armoroff | Implemented (nomul delay + afternmv callback, faithful to C) |
| 2985 | `better_not_take_that_off` | do_wear.js:1410 | Implemented |
| 1640 | `cancel_doff` | do_wear.js:1116 | Implemented |
| 1659 | `cancel_don` | do_wear.js:1121 | Implemented |
| 2025 | `canwearobj` | 107 | Multi-slot validation with layering checks |
| 3424 | `count_worn_armor` | do_wear.js:1719 | Implemented |
| 1728 | `count_worn_stuff` | do_wear.js:1235 | Implemented |
| 1888 | `cursed` | 141 | cursed_check — prints message, sets bknown |
| 3196 | `destroy_arm` | do_wear.js:1530 | Implemented |
| 2819 | `do_takeoff` | do_wear.js:1332 | Implemented |
| 3017 | `doddoremarm` | do_wear.js:1422 | Implemented |
| 1598 | `doffing` | do_wear.js:1111 | Implemented |
| 1569 | `donning` | do_wear.js:1106 | Implemented |
| 2449 | `doputon` | 295 | handlePutOn — rings + amulets |
| 1869 | `doremring` | 389 | handleRemove — R command |
| 1828 | `dotakeoff` | 338 | handleTakeOff — multi-slot with layering |
| 2427 | `dowear` | 257 | handleWear — multi-slot with canwearobj |
| 793 | `dragon_armor_handling` | do_wear.js:445 | Implemented |
| 3339 | `equip_ok` | do_wear.js:1654 | Implemented |
| 2468 | `find_ac` | 168 | Full AC recalculation |
| 2523 | `glibr` | do_wear.js:1161 | Implemented |
| 567 | `hard_helmet` | do_wear.js:360 | Implemented |
| 1857 | `ia_dotakeoff` | do_wear.js:ia_dotakeoff | Implemented (item_action_in_progress wrapper around handleTakeOff) |
| 3277 | `inaccessible_equipment` | do_wear.js:1613 | Implemented |
| 1188 | `learnring` | 349 | Simplified: sets obj.known=true (C also handles discovery tracking) |
| 3184 | `maybe_destroy_armor` | do_wear.js:1519 | Implemented |
| 3085 | `menu_remarm` | do_wear.js:1434 | Implemented |
| 67 | `off_msg` | do_wear.js:133 | Implemented |
| 75 | `on_msg` | do_wear.js:138 | Implemented |
| 3386 | `puton_ok` | do_wear.js:1689 | Implemented |
| 3057 | `remarm_swapwep` | do_wear.js:1428 | Implemented |
| 3393 | `remove_ok` | do_wear.js:1694 | Implemented |
| 3009 | `reset_remarm` | do_wear.js:1416 | Implemented |
| 2691 | `select_off` | do_wear.js:1299 | Implemented |
| 1534 | `set_wear` | do_wear.js:1077 | Implemented |
| 2625 | `some_armor` | do_wear.js:1194 | Implemented |
| 1683 | `stop_donning` | do_wear.js:stop_donning | Implemented |
| 2652 | `stuck_ring` | do_wear.js:1214 | Implemented |
| 2895 | `take_off` | do_wear.js:1405 | Implemented |
| 3407 | `takeoff_ok` | do_wear.js:1704 | Implemented |
| 147 | `toggle_displacement` | do_wear.js:164 | Implemented |
| 106 | `toggle_stealth` | do_wear.js:154 | Implemented |
| 2682 | `unchanger` | do_wear.js:1227 | Implemented |
| 3400 | `wear_ok` | do_wear.js:1699 | Implemented |
| 607 | `wielding_corpse` | do_wear.js:421 | Implemented |
| 3139 | `wornarm_destroyed` | do_wear.js:1499 | Implemented |

### dog.c -> dog.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1358 | `abuse_dog` | dog.js:792 | Implemented |
| 934 | `discard_migrations` | dog.js:discard_migrations | Implemented (clean non-endgame migrating monsters/objects) |
| 991 | `dogfood` | dog.js:124 | Partial — food type classification for pets. May differ in edge cases |
| 35 | `free_edog` | dog.js:547 | Implemented |
| 45 | `initedog` | dog.js:initedog | Implemented (pet edog init with apport=ACURR(A_CHA), hunger, abuse) |
| 764 | `keep_mon_accessible` | dog.js:keep_mon_accessible | Implemented (Wizard/shk/priest/guard migration check) |
| 785 | `keepdogs` | dog.js:704 | Implemented |
| 304 | `losedogs` | dog.js:815 | Implemented |
| 138 | `make_familiar` | dog.js:571 | Implemented |
| 219 | `makedog` | dog.js:278 | Implemented |
| 883 | `migrate_to_level` | dog.js:765 | Implemented |
| 420 | `mon_arrive` | dog.js:397 | Implemented |
| 623 | `mon_catchup_elapsed_time` | dog.js:625 | Implemented |
| 725 | `mon_leave` | dog.js:687 | Implemented |
| 23 | `newedog` | dog.js:newedog | Implemented (allocate edog structure with parentmid) |
| 91 | `pet_type` | dog.js:267 | Implemented |
| 104 | `pick_familiar_pm` | dog.js:553 | Implemented |
| 287 | `set_mon_lastmove` | dog.js:615 | Implemented |
| 1139 | `tamedog` | dog.js:tamedog | Implemented (taming via food/magic, untameable checks, edog init) |
| 295 | `update_mlstmv` | dog.js:620 | Implemented |
| 1288 | `wary_dog` | dog.js:wary_dog | Implemented (pet revival loyalty, abuse checks, rn2 tameness roll) |

### dogmove.c -> dogmove.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 853 | `best_target` | dogmove.js:892 | Implemented |
| 1394 | `can_reach_location` | dogmove.js:508 | Implemented |
| 1377 | `could_reach_item` | dogmove.js:483 | Implemented |
| 146 | `cursed_object_at` | dogmove.js:472 | Implemented |
| 219 | `dog_eat` | dogmove.js:229 | Partial — nutrition, tameness, split food, eat message, apport. Has spurious obj_resists call. Missing: devour, killer bee jelly, rust monster, distant_name side-effects |
| 477 | `dog_goal` | dogmove.js (inlined in dog_move) | Implemented |
| 356 | `dog_hunger` | dogmove.js:319 | Partial — starvation check, hunger confusion, mhpmax penalty. Missing: beg(), couldsee for message, stop_occupation |
| 394 | `dog_invent` | dogmove.js:535 | Partial — drop and pickup paths. Missing: some pickup edge cases |
| 992 | `dog_move` | dogmove.js:851 | Partial — core movement loop, combat, mfndpos, distfleeck. Missing: best_target, score_targ, find_friends, wantdoor |
| 157 | `dog_nutrition` | dogmove.js:114 | Partial — base nutrition from oc_nutrition and dog_eat_time. Missing: some food type adjustments |
| 342 | `dog_starve` | dogmove.js:296 | Partial — death message, mondead. Missing: usteed, Hallucination |
| 709 | `find_friends` | dogmove.js:793 | Implemented |
| 665 | `find_targ` | dogmove.js:759 | Implemented |
| 1463 | `finish_meating` | dogmove.js:438 | Implemented |
| 1477 | `mnum_leashable` | dogmove.js:450 | Implemented |
| 904 | `pet_ranged_attk` | dogmove.js:919 | Implemented |
| 1487 | `quickmimic` | dogmove.js:1618 | Implemented |
| 753 | `score_targ` | dogmove.js:831 | Implemented |
| 1433 | `wantdoor` | dogmove.js (inlined callback) | Implemented |

### dokick.c -> kick.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 412 | `container_impact_dmg` | - | Missing |
| 1854 | `deliver_obj_to_mon` | - | Missing |
| 1257 | `dokick` | kick.js:handleKick | APPROX — kick command |
| 1943 | `down_gate` | - | Missing |
| 1473 | `drop_to` | - | Missing |
| 295 | `ghitm` | - | Missing |
| 1511 | `impact_drop` | - | Missing |
| 910 | `kick_door` | - | Missing |
| 864 | `kick_dumb` | - | Missing |
| 146 | `kick_monster` | - | Missing |
| 974 | `kick_nondoor` | - | Missing |
| 489 | `kick_object` | - | Missing |
| 881 | `kick_ouch` | - | Missing |
| 794 | `kickstr` | - | Missing |
| 126 | `maybe_kick_monster` | - | Missing |
| 1769 | `obj_delivery` | - | Missing |
| 1909 | `otransit_msg` | - | Missing |
| 508 | `really_kick_object` | - | Missing |
| 1639 | `ship_object` | - | Missing |
| 846 | `watchman_door_damage` | - | Missing |
| 834 | `watchman_thief_arrest` | - | Missing |

### dothrow.c -> dothrow.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 381 | `autoquiver` | dothrow.js:728 | Implemented |
| 2612 | `breakmsg` | dothrow.js:1478 | Implemented |
| 2480 | `breakobj` | dothrow.js:1434 | Implemented |
| 2444 | `breaks` | dothrow.js:1414 | Implemented |
| 2582 | `breaktest` | dothrow.js:1461 | Implemented |
| 1181 | `check_shop_obj` | dothrow.js:944 | Implemented |
| 469 | `dofire` | dothrow.js:handleFire | APPROX — fire command |
| 352 | `dothrow` | dothrow.js:handleThrow | APPROX — throw command |
| 590 | `endmultishot` | dothrow.js:781 | Implemented |
| 447 | `find_launcher` | dothrow.js:766 | Implemented |
| 2309 | `gem_accept` | dothrow.js:1371 | Implemented |
| 1220 | `harmless_missile` | dothrow.js:968 | Implemented |
| 2417 | `hero_breaks` | dothrow.js:1403 | Implemented |
| 606 | `hitfloor` | dothrow.js:794 | Implemented |
| 1078 | `hurtle` | dothrow.js:913 | Implemented |
| 742 | `hurtle_jump` | dothrow.js:845 | Implemented |
| 773 | `hurtle_step` | dothrow.js:854 | Implemented |
| 1130 | `mhurtle` | dothrow.js:926 | Implemented |
| 992 | `mhurtle_step` | dothrow.js:886 | Implemented |
| 297 | `ok_to_throw` | dothrow.js:702 | Implemented |
| 1913 | `omon_adj` | dothrow.js:1247 | Implemented |
| 2457 | `release_camera_demon` | dothrow.js:1422 | Implemented |
| 1855 | `return_throw_to_inv` | dothrow.js:1234 | Implemented |
| 1442 | `sho_obj_return_to_u` | dothrow.js:1535 | Implemented |
| 1976 | `should_mulch_missile` | dothrow.js:1276 | Implemented |
| 1468 | `swallowit` | dothrow.js:swallowit | Implemented |
| 2011 | `thitmonst` | dothrow.js:1292 | Implemented |
| 2656 | `throw_gold` | dothrow.js:1501 | Implemented |
| 87 | `throw_obj` | dothrow.js:671 | Implemented |
| 317 | `throw_ok` | dothrow.js:716 | Implemented |
| 1430 | `throwing_weapon` | dothrow.js:1020 | Implemented |
| 1510 | `throwit` | dothrow.js:1129 | Implemented |
| 1482 | `throwit_mon_hit` | dothrow.js:1119 | Implemented |
| 1460 | `throwit_return` | dothrow.js:1103 | Implemented |
| 1951 | `tmiss` | dothrow.js:1270 | Implemented |
| 1256 | `toss_up` | dothrow.js:986 | Implemented |
| 656 | `walk_path` | dothrow.js:812 | Implemented |
| 977 | `will_hurtle` | dothrow.js:878 | Implemented |

### drawing.c -> symbols.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 120 | `def_char_is_furniture` | - | Missing |
| 108 | `def_char_to_monclass` | - | Missing |
| 91 | `def_char_to_objclass` | - | Missing |

### dungeon.c -> dungeon.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1643 | `Can_dig_down` | dungeon.js:534 | Aligned |
| 1656 | `Can_fall_thru` | dungeon.js:540 | Aligned |
| 1668 | `Can_rise_up` | dungeon.js:546 | Aligned |
| 268 | `Fread` | - | Missing |
| 1901 | `In_V_tower` | dungeon.js:365 | Aligned |
| 1917 | `In_W_tower` | dungeon.js:368 | Aligned |
| 1936 | `In_hell` | dungeon.js:362 | Aligned |
| 1850 | `In_mines` | dungeon.js:356 | Aligned |
| 1843 | `In_quest` | dungeon.js:359 | Aligned |
| 2011 | `Invocation_lev` | dungeon.js:427 | Aligned |
| 1637 | `Is_botlevel` | dungeon.js:353 | Aligned |
| 1464 | `Is_branchlev` | dungeon.js:350 | Aligned |
| 1448 | `Is_special` | dungeon.js:345 | Aligned |
| 1908 | `On_W_tower_level` | dungeon.js:371 | Aligned |
| 514 | `add_branch` | dungeon.js:438 | Aligned |
| 545 | `add_level` | dungeon.js:459 | Aligned |
| 1972 | `assign_level` | dungeon.js:473 | Aligned |
| 1980 | `assign_rnd_level` | dungeon.js:479 | Aligned |
| 1891 | `at_dgn_entrance` | dungeon.js:527 | Aligned |
| 1695 | `avoid_ceiling` | dungeon.js:565 | Aligned |
| 2234 | `br_string` | dungeon.js:554 | Aligned |
| 3380 | `br_string2` | dungeon.js:565 | Aligned |
| 1477 | `builds_up` | dungeon.js:488 | Aligned |
| 1708 | `ceiling` | dungeon.js:579 | Aligned |
| 2250 | `chr_u_on_lvl` | dungeon.js:5269 | Implemented |
| 440 | `correct_branch_type` | dungeon.js:5067 | Implemented |
| 2943 | `count_feat_lastseentyp` | - | Missing |
| 1339 | `deepest_lev_reached` | dungeon.js:550 | Aligned |
| 1431 | `depth` | dungeon.js:306 | Aligned |
| 284 | `dname_to_dnum` | dungeon.js:502 | Aligned |
| 2565 | `donamelevel` | dungeon.js:5287 | Implemented |
| 3286 | `dooverview` | - | Missing |
| 1864 | `dungeon_branch` | dungeon.js:518 | Aligned |
| 1325 | `dunlev` | dungeon.js:297 | Aligned |
| 1332 | `dunlevs_in_dungeon` | dungeon.js:302 | Aligned |
| 1548 | `earth_sense` | - | Missing |
| 3402 | `endgamelevelname` | dungeon.js:5416 | Implemented |
| 311 | `find_branch` | dungeon.js:527 | Aligned |
| 1943 | `find_hell` | dungeon.js:544 | Aligned |
| 300 | `find_level` | dungeon.js:536 | Aligned |
| 2632 | `find_mapseen` | dungeon.js:5337 | Implemented |
| 2644 | `find_mapseen_by_str` | dungeon.js:5348 | Implemented |
| 1122 | `fixup_level_locations` | - | Missing |
| 2574 | `free_exclusions` | dungeon.js:5293 | Implemented |
| 1185 | `free_proto_dungeon` | - | Missing |
| 2472 | `get_annotation` | dungeon.js:5274 | Implemented |
| 781 | `get_dgn_align` | dungeon.js:5140 | Implemented |
| 744 | `get_dgn_flags` | dungeon.js:5114 | Implemented |
| 1796 | `get_level` | dungeon.js:402 | Aligned |
| 1951 | `goto_hell` | dungeon.js:5230 | Implemented |
| 1684 | `has_ceiling` | dungeon.js:559 | Aligned |
| 651 | `indent` | - | Missing |
| 1993 | `induced_align` | dungeon.js:246 | Implemented |
| 1111 | `init_castle_tune` | dungeon.js:5148 | Implemented |
| 867 | `init_dungeon_branches` | dungeon.js:3665 | Aligned (uses branch-topology builder) |
| 997 | `init_dungeon_dungeons` | dungeon.js:3675 | Aligned (drives dungeon placement/ledger setup loop) |
| 797 | `init_dungeon_levels` | dungeon.js:3670 | Aligned (uses recursive place_level simulation) |
| 960 | `init_dungeon_set_depth` | dungeon.js:3597 | Aligned |
| 933 | `init_dungeon_set_entry` | dungeon.js:3570 | Aligned |
| 1205 | `init_dungeons` | dungeon.js:3735 | Aligned |
| 566 | `init_level` | - | Missing |
| 2827 | `init_mapseen` | - | Missing |
| 463 | `insert_branch` | - | Missing |
| 2872 | `interest_mapseen` | - | Missing |
| 1376 | `ledger_no` | dungeon.js:311 | Aligned |
| 1422 | `ledger_to_dlev` | dungeon.js:335 | Aligned |
| 1402 | `ledger_to_dnum` | dungeon.js:322 | Aligned |
| 2092 | `lev_by_name` | - | Missing |
| 2021 | `level_difficulty` | - | Missing |
| 380 | `level_range` | - | Missing |
| 2609 | `load_exclusions` | dungeon.js:5321 | Implemented |
| 2713 | `load_mapseen` | - | Missing |
| 3259 | `mapseen_temple` | - | Missing |
| 1392 | `maxledgerno` | dungeon.js:314 | Aligned |
| 1497 | `next_level` | dungeon.js:5157 | Implemented |
| 1439 | `on_level` | dungeon.js:340 | Aligned |
| 2753 | `overview_stats` | - | Missing |
| 415 | `parent_dlevel` | - | Missing |
| 346 | `parent_dnum` | - | Missing |
| 632 | `pick_level` | - | Missing |
| 666 | `place_level` | dungeon.js:5099 | Implemented |
| 598 | `possible_places` | dungeon.js:5083 | Implemented |
| 1518 | `prev_level` | dungeon.js:5173 | Implemented |
| 2257 | `print_branch` | - | Missing |
| 2284 | `print_dungeon` | - | Missing |
| 2483 | `print_level_annotation` | dungeon.js:5281 | Implemented |
| 3508 | `print_mapseen` | - | Missing |
| 2494 | `query_annotation` | - | Missing |
| 3067 | `recalc_mapseen` | - | Missing |
| 2440 | `recbranch_mapseen` | - | Missing |
| 2803 | `remdun_mapseen` | - | Missing |
| 211 | `restore_dungeon` | - | Missing |
| 2657 | `rm_mapseen` | - | Missing |
| 3274 | `room_discovered` | dungeon.js:5359 | Implemented |
| 149 | `save_dungeon` | - | Missing |
| 2588 | `save_exclusions` | dungeon.js:5304 | Implemented |
| 2687 | `save_mapseen` | - | Missing |
| 3360 | `seen_string` | dungeon.js:5401 | Implemented |
| 3433 | `shop_string` | - | Missing |
| 3297 | `show_overview` | - | Missing |
| 1961 | `single_level_branch` | - | Missing |
| 1744 | `surface` | - | Missing |
| 2198 | `tport_menu` | - | Missing |
| 3336 | `traverse_mapseenchn` | - | Missing |
| 3452 | `tunesuffix` | - | Missing |
| 1568 | `u_on_newpos` | - | Missing |
| 1599 | `u_on_rndspot` | - | Missing |
| 2169 | `unplaced_floater` | - | Missing |
| 2184 | `unreachable_level` | - | Missing |
| 2919 | `update_lastseentyp` | - | Missing |
| 2935 | `update_mapseen_for` | - | Missing |

### eat.c -> eat.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 141 | `Bitfield` | - | N/A (C struct bitfield macro — JS uses object properties) |
| 142 | `Bitfield` | - | N/A (C struct bitfield macro — JS uses object properties) |
| 3956 | `Finish_digestion` | eat.js:1756 | Implemented |
| 1796 | `Hear_again` | eat.js:528 | Implemented |
| 3915 | `Popeye` | eat.js:1750 | Implemented |
| 2253 | `accessory_has_effect` | eat.js:1427 | Implemented |
| 338 | `adj_victual_nutrition` | eat.js:660 | Implemented |
| 3128 | `bite` | eat.js:2131 | Implemented |
| 2216 | `bounded_increase` | eat.js:1393 | Implemented |
| 3888 | `cant_finish_meal` | eat.js:1745 | Implemented |
| 245 | `choke` | eat.js:569 | Implemented |
| 3803 | `consume_oeaten` | eat.js:1703 | Implemented |
| 1528 | `consume_tin` | eat.js:1531 | Implemented |
| 1339 | `corpse_intrinsic` | eat.js:817 | Implemented |
| 1389 | `costly_tin` | eat.js:1507 | Implemented |
| 1129 | `cpostfx` | eat.js:923 | Implemented |
| 791 | `cprefx` | eat.js:889 | Implemented |
| 422 | `do_reset_eat` | eat.js:638 | Implemented |
| 2812 | `doeat` | eat.js:handleEat | Implemented |
| 2729 | `doeat_nonfood` | eat.js:1555 | Implemented |
| 544 | `done_eating` | eat.js:2143 | Implemented |
| 603 | `eat_brains` | eat.js:1762 | Implemented |
| 3512 | `eat_ok` | eat.js:1616 | Implemented |
| 2260 | `eataccessory` | eat.js:1432 | Implemented |
| 1850 | `eatcorpse` | eat.js:1117 | Implemented |
| 3783 | `eaten_stat` | eat.js:1689 | Implemented |
| 519 | `eatfood` | eat.js:2094 | Implemented |
| 576 | `eating_conducts` | eat.js:1035 | Implemented |
| 475 | `eating_dangerous_corpse` | eat.js:1604 | Implemented |
| 2073 | `eating_glob` | eat.js:2230 | Implemented |
| 163 | `eatmdone` | eat.js:202 | Implemented |
| 181 | `eatmupdate` | eat.js:218 | Implemented |
| 2409 | `eatspecial` | eat.js:1438 | Implemented |
| 2622 | `edibility_prompts` | eat.js:1548 | Implemented |
| 1103 | `eye_of_newt_buzz` | eat.js:800 | Implemented |
| 867 | `fix_petrification` | eat.js:876 | Implemented |
| 3574 | `floorfood` | eat.js:1650 | Implemented |
| 396 | `food_disappears` | eat.js:644 | Implemented |
| 409 | `food_substitution` | eat.js:650 | Implemented |
| 217 | `food_xname` | eat.js:157 | Implemented |
| 2493 | `foodword` | eat.js:169 | Implemented |
| 2505 | `fpostfx` | eat.js:1342 | Implemented |
| 2094 | `fprefx` | eat.js:1243 | Implemented |
| 2080 | `garlic_breath` | eat.js:1238 | Implemented |
| 3158 | `gethungry` | eat.js:208 | Implemented |
| 1003 | `givit` | eat.js:724 | Implemented |
| 126 | `init_uhunger` | eat.js:193 | Implemented |
| 890 | `intrinsic_possible` | eat.js:672 | Implemented |
| 91 | `is_edible` | eat.js:148 | Implemented |
| 3342 | `is_fainted` | eat.js:559 | Implemented |
| 2604 | `leather_cover` | eat.js:2238 | Implemented (C has #if 0) |
| 3284 | `lesshungry` | eat.js:301 | Implemented |
| 758 | `maybe_cannibal` | eat.js:859 | Implemented |
| 500 | `maybe_extend_timed_resist` | eat.js:242 | Implemented (C has #if 0) |
| 3872 | `maybe_finished_meal` | eat.js:1730 | Implemented |
| 3276 | `morehungry` | eat.js:295 | Implemented |
| 3357 | `newuhs` | eat.js:362 | Implemented |
| 325 | `obj_nutrition` | eat.js:182 | Implemented |
| 3534 | `offer_ok` | eat.js:1625 | Implemented |
| 1698 | `opentin` | eat.js:2104 | Implemented |
| 292 | `recalc_wt` | eat.js:655 | Implemented |
| 309 | `reset_eat` | eat.js:631 | Implemented |
| 3349 | `reset_faint` | eat.js:564 | Implemented |
| 1808 | `rottenfood` | eat.js:1072 | Implemented |
| 1461 | `set_tin_variety` | eat.js:1470 | Implemented |
| 961 | `should_givit` | eat.js:690 | Implemented |
| 2017 | `start_eating` | eat.js:2183 | Implemented |
| 1718 | `start_tin` | eat.js:1537 | Implemented |
| 992 | `temp_givit` | eat.js:718 | Implemented |
| 453 | `temp_resist` | eat.js:227 | Implemented |
| 1428 | `tin_details` | eat.js:1463 | Implemented |
| 3556 | `tin_ok` | eat.js:1635 | Implemented |
| 1489 | `tin_variety` | eat.js:1494 | Implemented |
| 1405 | `tin_variety_txt` | eat.js:1450 | Implemented |
| 3083 | `tinopen_ok` | eat.js:1644 | Implemented |
| 360 | `touchfood` | eat.js:622 | Implemented |
| 3331 | `unfaint` | eat.js:545 | Implemented |
| 3093 | `use_tin_opener` | eat.js:2113 | Implemented |
| 1516 | `use_up_tin` | eat.js:1521 | Implemented |
| 1376 | `violated_vegetarian` | eat.js:1055 | Implemented |
| 3731 | `vomit` | eat.js:1661 | Implemented |

### end.c -> end.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1898 | `NH_abort` | - | Missing |
| 909 | `artifact_score` | - | Missing |
| 1811 | `bel_copy1` | - | Missing |
| 1825 | `build_english_list` | - | Missing |
| 1596 | `container_contents` | - | Missing |
| 1740 | `dealloc_killer` | - | Missing |
| 1709 | `delayed_killer` | - | Missing |
| 621 | `disclose` | - | Missing |
| 1022 | `done` | - | Missing |
| 71 | `done1` | - | Missing |
| 93 | `done2` | - | Missing |
| 172 | `done_hangup` | - | Missing |
| 188 | `done_in_by` | - | Missing |
| 157 | `done_intr` | - | Missing |
| 853 | `done_object_cleanup` | - | Missing |
| 544 | `dump_everything` | - | Missing |
| 521 | `dump_plines` | - | Missing |
| 1728 | `find_delayed_killer` | - | Missing |
| 369 | `fixup_death` | - | Missing |
| 947 | `fuzzer_savelife` | - | Missing |
| 765 | `get_valuables` | - | Missing |
| 1676 | `nh_terminate` | - | Missing |
| 832 | `odds_and_ends` | - | Missing |
| 1132 | `really_done` | - | Missing |
| 1782 | `restore_killers` | - | Missing |
| 1762 | `save_killers` | - | Missing |
| 706 | `savelife` | - | Missing |
| 479 | `should_query_disclose_option` | - | Missing |
| 800 | `sort_valuables` | - | Missing |
| 1795 | `wordcount` | - | Missing |

### engrave.c -> engrave.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1764 | `blengr` | - | Missing |
| 187 | `can_reach_floor` | - | Missing |
| 218 | `cant_reach_floor` | - | Missing |
| 1644 | `del_engr` | - | Missing |
| 461 | `del_engr_at` | - | Missing |
| 1706 | `disturb_grave` | - | Missing |
| 955 | `doengrave` | engrave.js:handleEngrave | APPROX — engraving command |
| 545 | `doengrave_ctx_init` | - | Missing |
| 895 | `doengrave_ctx_verb` | - | Missing |
| 741 | `doengrave_sfx_item` | - | Missing |
| 583 | `doengrave_sfx_item_WAN` | - | Missing |
| 231 | `engr_at` | engrave.js:engr_at | Aligned |
| 297 | `engr_can_be_felt` | - | Missing |
| 1625 | `engr_stats` | - | Missing |
| 1266 | `engrave` | - | Missing |
| 1523 | `engraving_sanity_check` | - | Missing |
| 1731 | `feel_engraving` | - | Missing |
| 1508 | `forget_engravings` | - | Missing |
| 473 | `freehand` | - | Missing |
| 408 | `make_engr_at` | engrave.js:make_engr_at | Aligned |
| 1686 | `make_grave` | - | Missing |
| 51 | `random_engraving` | - | Missing |
| 318 | `read_engr_at` | - | Missing |
| 1583 | `rest_engravings` | - | Missing |
| 1666 | `rloc_engr` | - | Missing |
| 1497 | `sanitize_engravings` | - | Missing |
| 1550 | `save_engravings` | - | Missing |
| 1723 | `see_engraving` | - | Missing |
| 251 | `sengr_at` | - | Missing |
| 481 | `stylus_ok` | - | Missing |
| 503 | `u_can_engrave` | - | Missing |
| 264 | `u_wipe_engr` | headless.js, chargen.js | Aligned — calls wipe_engr_at at player pos |
| 271 | `wipe_engr_at` | engrave.js:wipe_engr_at | Aligned — RNG-faithful wipe with rubout table |
| 120 | `wipeout_text` | engrave.js:wipeoutEngravingText | Aligned — C-faithful rubout with rn2(4) per char |

### exper.c -> exper.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 26 | `enermod` | exper.js:enermod | Implemented — role-dependent energy modifier (Priest/Wizard 2x, Healer/Knight 3/2x, Barbarian/Valkyrie 3/4x) |
| 85 | `experience` | - | Missing (needs find_mac, permonst attack data, extra_nasty) |
| 207 | `losexp` | exper.js:losexp | Implemented — RNG-faithful (rnd(10) HP, rn2(5) PW); simplified (placeholder ranges vs C's uhpinc/ueninc arrays) |
| 169 | `more_experienced` | - | Missing (needs u.urexp, flags.showexp, disp.botl) |
| 300 | `newexplevel` | exper.js:newexplevel | Implemented |
| 45 | `newpw` | exper.js:newpw | Implemented — role/race enadv_full structs with enermod(). Init path uses infix+rnd(inrnd), level-up uses lo/hi with xlev cutoff and Wis-based bonus |
| 14 | `newuexp` | exper.js:newuexp | Implemented |
| 307 | `pluslvl` | exper.js:pluslvl | Implemented — calls newhp()/newpw() for role-dependent HP/PW gains. Missing: adjabil() |
| 378 | `rndexp` | - | Missing (needs LARGEST_INT handling) |

### explode.c -> explode.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 985 | `adtyp_to_expltype` | explode.js:37 | Implemented |
| 118 | `engulfer_explosion_msg` | explode.js:60 | Stub |
| 199 | `explode` | explode.js:70 | Implemented (3x3 area damage with resistance checks) |
| 972 | `explode_oil` | explode.js:148 | Implemented |
| 26 | `explosionmask` | explode.js:51 | Stub |
| 1017 | `mon_explodes` | explode.js:157 | Implemented (self-destruct with type encoding) |
| 721 | `scatter` | explode.js:133 | Stub |
| 960 | `splatter_burning_oil` | explode.js:142 | Implemented |

### extralev.c -> extralev.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 278 | `corr` | extralev.js:20 | Aligned |
| 288 | `makerogueghost` | extralev.js:161 | Aligned |
| 193 | `makeroguerooms` | extralev.js:222 | Aligned |
| 139 | `miniwalk` | extralev.js:54 | Aligned |
| 45 | `roguecorr` | extralev.js:96 | Aligned |
| 21 | `roguejoin` | extralev.js:27 | Aligned |

### files.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 3621 | `Death_quote` | - | Missing |
| 1291 | `check_panic_save` | - | Missing |
| 2662 | `check_recordfile` | - | Missing |
| 3404 | `choose_passage` | - | Missing |
| 731 | `clearlocks` | - | Missing |
| 518 | `close_nhfile` | - | Missing |
| 905 | `commit_bonesfile` | - | Missing |
| 985 | `compress_bonesfile` | - | Missing |
| 2154 | `contains_directory` | - | Missing |
| 831 | `create_bonesfile` | - | Missing |
| 621 | `create_levelfile` | - | Missing |
| 1138 | `create_savefile` | - | Missing |
| 3094 | `debugcore` | - | Missing |
| 972 | `delete_bonesfile` | - | Missing |
| 2133 | `delete_convertedfile` | - | Missing |
| 717 | `delete_levelfile` | - | Missing |
| 1238 | `delete_savefile` | - | Missing |
| 3058 | `do_deferred_showpaths` | - | Missing |
| 1569 | `docompress_file` | - | Missing |
| 1814 | `docompress_file` | - | Missing |
| 2040 | `doconvert_file` | - | Missing |
| 305 | `fname_decode` | - | Missing |
| 255 | `fname_encode` | - | Missing |
| 444 | `fopen_datafile` | - | Missing |
| 2584 | `fopen_sym_file` | - | Missing |
| 2440 | `fopen_wizkit_file` | - | Missing |
| 354 | `fqname` | - | Missing |
| 509 | `free_nhfile` | - | Missing |
| 1522 | `free_saved_games` | - | Missing |
| 1278 | `get_freeing_nhfile` | - | Missing |
| 1378 | `get_saved_games` | - | Missing |
| 461 | `init_nhfile` | - | Missing |
| 3640 | `livelog_add` | - | Missing |
| 3686 | `livelog_add` | - | Missing |
| 2230 | `lock_file` | - | Missing |
| 1783 | `make_compressed_name` | - | Missing |
| 2066 | `make_converted_name` | - | Missing |
| 2199 | `make_lockname` | - | Missing |
| 496 | `new_nhfile` | - | Missing |
| 199 | `nh_basename` | - | Missing |
| 1765 | `nh_compress` | - | Missing |
| 1774 | `nh_uncompress` | - | Missing |
| 583 | `nhclose` | - | Missing |
| 930 | `open_bonesfile` | - | Missing |
| 672 | `open_levelfile` | - | Missing |
| 1196 | `open_savefile` | - | Missing |
| 2774 | `paniclog` | - | Missing |
| 1336 | `plname_from_file` | - | Missing |
| 1993 | `problematic_savefile` | - | Missing |
| 2537 | `proc_wizkit_line` | - | Missing |
| 2604 | `read_sym_file` | - | Missing |
| 3447 | `read_tribute` | - | Missing |
| 2557 | `read_wizkit` | - | Missing |
| 2838 | `recover_savefile` | - | Missing |
| 1541 | `redirect` | - | Missing |
| 1249 | `restore_saved_game` | - | Missing |
| 3148 | `reveal_paths` | - | Missing |
| 534 | `rewind_nhfile` | - | Missing |
| 1107 | `save_savefile_name` | - | Missing |
| 767 | `set_bonesfile_name` | - | Missing |
| 816 | `set_bonestemp_name` | - | Missing |
| 1116 | `set_error_savefile` | - | Missing |
| 606 | `set_levelfile_name` | - | Missing |
| 999 | `set_savefile_name` | - | Missing |
| 753 | `strcmp_wrap` | - | Missing |
| 2809 | `testinglog` | - | Missing |
| 2391 | `unlock_file` | - | Missing |
| 394 | `validate_prefix_locations` | - | Missing |
| 549 | `viable_nhfile` | - | Missing |
| 2512 | `wizkit_addinv` | - | Missing |

### fountain.c -> fountain.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 581 | `breaksink` | - | Missing |
| 394 | `dipfountain` | - | Missing |
| 716 | `dipsink` | - | Missing |
| 165 | `dofindgem` | - | Missing |
| 120 | `dogushforth` | - | Missing |
| 64 | `dowaterdemon` | - | Missing |
| 94 | `dowaternymph` | - | Missing |
| 38 | `dowatersnakes` | - | Missing |
| 243 | `drinkfountain` | fountain.js:drinkfountain | RNG-PARITY — fountain drinking effects |
| 595 | `drinksink` | - | Missing |
| 201 | `dryup` | fountain.js:dryup | RNG-PARITY — fountain drying up |
| 134 | `gush` | - | Missing |
| 805 | `sink_backs_up` | - | Missing |
| 558 | `wash_hands` | - | Missing |
| 179 | `watchman_warn_fountain` | - | Missing |

### getpos.c -> getpos.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 640 | `auto_describe` | - | Missing |
| 312 | `cmp_coord_distu` | - | Missing |
| 595 | `coord_desc` | - | Missing |
| 557 | `dxdy_to_dist_descr` | - | Missing |
| 513 | `gather_locs` | - | Missing |
| 438 | `gather_locs_interesting` | - | Missing |
| 771 | `getpos` | getpos.js:getpos_async | Partial — interactive cursor loop plus filter/target cycling and basic target menu implemented; full C keybinding/help/target-class parity remains TODO |
| 102 | `getpos_getvalids_selection` | getpos.js:getpos_getvalids_selection | Partial — valid-location scan helper wired for current map bounds; C selectionvar-backed area map plumbing remains TODO |
| 167 | `getpos_help` | getpos.js:getpos_help | Partial — condensed interactive key help text; full C verbose/help-option variants remain TODO |
| 137 | `getpos_help_keyxhelp` | - | Missing |
| 665 | `getpos_menu` | getpos.js:getpos_menu | Partial — menu-style target list prompt with numeric selection (1-9); full NHW_MENU parity remains TODO |
| 753 | `getpos_refresh` | getpos.js:getpos_refresh | Implemented |
| 41 | `getpos_sethilite` | getpos.js:getpos_sethilite | Implemented |
| 72 | `getpos_toggle_hilite_state` | getpos.js:getpos_toggle_hilite_state | Implemented |
| 341 | `gloc_filter_classify_glyph` | - | Missing |
| 412 | `gloc_filter_done` | - | Missing |
| 382 | `gloc_filter_floodfill` | - | Missing |
| 364 | `gloc_filter_floodfill_matcharea` | - | Missing |
| 391 | `gloc_filter_init` | - | Missing |
| 422 | `known_vibrating_square_at` | - | Missing |
| 94 | `mapxy_valid` | getpos.js:isValidTarget | Implemented (helper parity) |
| 729 | `truncate_to_map` | - | Missing |

### glyphs.c -> glyphs.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 482 | `add_custom_nhcolor_entry` | - | Missing |
| 370 | `add_glyph_to_cache` | - | Missing |
| 529 | `apply_customizations` | - | Missing |
| 1165 | `clear_all_glyphmap_colors` | - | Missing |
| 795 | `dump_all_glyphids` | - | Missing |
| 1193 | `find_display_sym_customization` | - | Missing |
| 1215 | `find_display_urep_customization` | - | Missing |
| 393 | `find_glyph_in_cache` | - | Missing |
| 416 | `find_glyphid_in_cache_by_glyphnum` | - | Missing |
| 1268 | `find_glyphs` | - | Missing |
| 734 | `find_matching_customization` | - | Missing |
| 184 | `fix_glyphname` | - | Missing |
| 234 | `glyph_find_core` | - | Missing |
| 433 | `glyph_hash` | - | Missing |
| 200 | `glyph_to_cmap` | - | Missing |
| 450 | `glyphid_cache_status` | - | Missing |
| 468 | `glyphrep` | - | Missing |
| 112 | `glyphrep_to_custom_map_entries` | - | Missing |
| 1300 | `glyphs_to_unicode` | - | Missing |
| 333 | `init_glyph_cache` | - | Missing |
| 1262 | `just_find_callback` | - | Missing |
| 456 | `match_glyph` | - | Missing |
| 579 | `maybe_shuffle_customizations` | - | Missing |
| 822 | `parse_id` | - | Missing |
| 749 | `purge_all_custom_entries` | - | Missing |
| 759 | `purge_custom_entries` | - | Missing |
| 589 | `shuffle_customizations` | - | Missing |
| 644 | `shuffle_customizations` | - | Missing |
| 1249 | `test_glyphnames` | - | Missing |
| 53 | `to_custom_symset_entry_callback` | - | Missing |
| 1278 | `to_unicode_callback` | - | Missing |
| 806 | `wizcustom_glyphids` | - | Missing |

### hack.c -> hack.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2323 | `air_turbulence` | hack.js:2600 | Implemented (async, RNG) |
| 2444 | `avoid_moving_on_liquid` | hack.js:2737 | Implemented |
| 2425 | `avoid_moving_on_trap` | hack.js:2725 | Implemented |
| 2476 | `avoid_running_into_trap_or_liquid` | hack.js:2772 | Implemented |
| 2496 | `avoid_trap_andor_region` | hack.js:avoid_trap_andor_region | Implemented (approx; trap/liquid coverage) |
| 920 | `bad_rock` | hack.js:2205 | Implemented |
| 4302 | `calc_capacity` | hack.js:2347 | Implemented |
| 263 | `cannot_push` | hack.js:cannot_push | Implemented (approx) — push-block checks for map bounds/terrain/monster/boulder |
| 248 | `cannot_push_msg` | hack.js:cannot_push_msg | Implemented (approx) — feedback messaging for failed boulder push |
| 934 | `cant_squeeze_thru` | hack.js:cant_squeeze_thru | Implemented (approx) — diagonal squeeze gate using rock checks |
| 2597 | `carrying_too_much` | hack.js:2559 | Implemented (async) |
| 4329 | `check_capacity` | hack.js:2372 | Implemented (async) |
| 3511 | `check_special_room` | hack.js:3006 | Implemented (async) |
| 4416 | `cmp_weights` | hack.js:cmp_weights | Implemented |
| 146 | `could_move_onto_boulder` | hack.js:could_move_onto_boulder | Implemented (approx) |
| 3964 | `crawl_destination` | hack.js:2228 | Implemented |
| 1779 | `disturb_buried_zombies` | hack.js:3651 | Stub (zombie timer system not modeled) |
| 2676 | `domove` | hack.js:domove | Implemented — C-style movement entrypoint dispatching to `domove_core` |
| 1936 | `domove_attackmon_at` | hack.js:domove_attackmon_at | Implemented (approx) — displacement/safemon/confirm/attack split helper |
| 1906 | `domove_bump_mon` | hack.js:domove_bump_mon | Implemented (approx) |
| 2693 | `domove_core` | hack.js:domove_core | APPROX — movement, door auto-open, traps, autopickup |
| 2210 | `domove_fight_empty` | hack.js:domove_fight_empty | Implemented (approx) |
| 1977 | `domove_fight_ironbars` | hack.js:domove_fight_ironbars | Implemented (approx) |
| 2002 | `domove_fight_web` | hack.js:domove_fight_web | Implemented (approx) |
| 2079 | `domove_swap_with_pet` | hack.js:domove_swap_with_pet | Implemented (approx) — extracted pet swap helper |
| 3948 | `doorless_door` | hack.js:domove_core | APPROX — inline in movement path |
| 3761 | `dopickup` | hack.js:domove_core | APPROX — autopickup inline in movement path |
| 167 | `dopush` | hack.js:dopush | Implemented (approx) |
| 817 | `dosinkfall` | hack.js:3627 | Implemented (async, RNG) |
| 4351 | `dump_weights` | hack.js:dump_weights | Implemented (approx) |
| 4015 | `end_running` | hack.js:2796 | Implemented |
| 2620 | `escape_from_sticky_mon` | hack.js:776 | Implemented (inline in domove_core) |
| 1247 | `findtravelpath` | hack.js:findtravelpath | APPROX — `TRAVP_TRAVEL/GUESS/VALID` wrapper over BFS pathing |
| 3367 | `furniture_present` | hack.js:2949 | Implemented |
| 1833 | `handle_tip` | hack.js:3494 | Implemented (async) |
| 1768 | `impact_disturbs_zombies` | hack.js:3646 | Stub (zombie timer system not modeled) |
| 2406 | `impaired_movement` | hack.js:2688 | Implemented |
| 3383 | `in_rooms` | hack.js:2868 | Implemented |
| 3449 | `in_town` | hack.js:2917 | Implemented |
| 4426 | `inv_cnt` | hack.js:2387 | Implemented |
| 4281 | `inv_weight` | hack.js:2322 | Implemented |
| 3045 | `invocation_message` | hack.js:3208 | Implemented (async) |
| 963 | `invocation_pos` | hack.js:invocation_pos | Implemented (C-faithful core predicate via `Invocation_lev` + `map.inv_pos`) |
| 1507 | `is_valid_travelpt` | hack.js:3587 | Implemented (async) |
| 82 | `long_to_any` | hack.js:long_to_any | Implemented |
| 3783 | `lookaround` | hack.js:lookaround | APPROX — run stop conditions and continuation direction |
| 4185 | `losehp` | hack.js:losehp | Implemented (partial) — includes saving-grace hook, polymorph HP path, death/wail thresholds |
| 4321 | `max_capacity` | hack.js:2365 | Implemented |
| 904 | `may_dig` | hack.js:2187 | Implemented |
| 913 | `may_passwall` | hack.js:2197 | Implemented |
| 3001 | `maybe_smudge_engr` | hack.js:maybe_smudge_engr | Implemented wrapper; delegates to `engrave.js:maybeSmudgeEngraving` |
| 4086 | `maybe_wail` | hack.js:maybe_wail | Implemented (partial) — role/race gates and intrinsic-power warning split |
| 4444 | `money_cnt` | hack.js:2399 | Implemented |
| 90 | `monst_to_any` | hack.js:monst_to_any | Implemented |
| 3991 | `monster_nearby` | hack.js:monsterNearby | Aligned |
| 3351 | `monstinroom` | hack.js:2934 | Implemented |
| 2567 | `move_out_of_bounds` | hack.js:2589 | Implemented (async) |
| 3473 | `move_update` | hack.js:2963 | Implemented |
| 337 | `moverock` | hack.js:moverock | Implemented (approx) |
| 349 | `moverock_core` | hack.js:moverock_core | Implemented (approx) |
| 328 | `moverock_done` | hack.js:moverock_done | Implemented (boundary helper) |
| 806 | `movobj` | hack.js:3615 | Implemented |
| 4315 | `near_capacity` | hack.js:2357 | Implemented |
| 4036 | `nomul` | hack.js:2833 | Implemented |
| 1725 | `notice_all_mons` | hack.js:3474 | Stub (accessibility feature) |
| 1689 | `notice_mon` | hack.js:3468 | Stub (accessibility feature) |
| 1716 | `notice_mons_cmp` | hack.js:notice_mons_cmp | Implemented (approx comparator) |
| 98 | `obj_to_any` | hack.js:obj_to_any | Implemented |
| 3016 | `overexert_hp` | hack.js:overexert_hp | Implemented (partial) — polymorph HP and pass-out message |
| 3032 | `overexertion` | hack.js:overexertion | Implemented (partial) — metabolism + encumbrance damage gate |
| 3673 | `pickup_checks` | hack.js:3237 | Implemented (async) |
| 3121 | `pooleffects` | hack.js:3130 | Implemented (async) |
| 106 | `revive_nasty` | hack.js:3609 | Stub (Rider revival not modeled) |
| 316 | `rock_disappear_msg` | hack.js:rock_disappear_msg | Implemented (approx) |
| 4481 | `rounddiv` | hack.js:rounddiv | Implemented (C-faithful) |
| 2977 | `runmode_delay_output` | hack.js:runmode_delay_output | Implemented (approx) |
| 4123 | `saving_grace` | hack.js:saving_grace | Implemented (partial) — monster-turn lethal blow clamp with one-shot flag |
| 3112 | `set_uinwater` | hack.js:3097 | Implemented |
| 4176 | `showdamage` | hack.js:showdamage | Implemented (partial) — iflags gate and polymorph HP display |
| 2377 | `slippery_ice_fumbling` | hack.js:2656 | Implemented |
| 4455 | `spot_checks` | hack.js:3225 | Stub (ICE melting timer not modeled) |
| 3200 | `spoteffects` | hack.js:3160 | Implemented (async) |
| 628 | `still_chewing` | hack.js:2240 | Stub (tunneling not modeled) |
| 1866 | `swim_move_danger` | hack.js:2705 | Implemented (async) |
| 3072 | `switch_terrain` | hack.js:3113 | Implemented (async) |
| 972 | `test_move` | hack.js:2430 | Implemented (async) |
| 1531 | `trapmove` | hack.js:3519 | Implemented (async) |
| 1798 | `u_locomotion` | hack.js:3483 | Implemented |
| 2399 | `u_maybe_impaired` | hack.js:2669 | Implemented |
| 1675 | `u_rooted` | hack.js:2578 | Implemented (async) |
| 1814 | `u_simple_floortyp` | hack.js:3656 | Implemented |
| 4052 | `unmul` | hack.js:2845 | Implemented (async) |
| 2346 | `water_turbulence` | hack.js:1341 | Partial — C flow integrated (calls `water_friction`, adjusts destination, blocks climbing out while encumbered) |
| 4225 | `weight_cap` | hack.js:2300 | Implemented |

### hacklib.c -> hacklib.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 267 | `c_eos` | hacklib.js:125 | Implemented |
| 986 | `case_insensitive_comp` | hacklib.js:632 | Implemented |
| 365 | `chrcasecpy` | hacklib.js:188 | Implemented |
| 1004 | `copy_bytes` | hacklib.js:647 | Implemented |
| 351 | `copynchars` | hacklib.js:copynchars | Implemented |
| 1038 | `datamodel` | - | Missing |
| 126 | `digit` | hacklib.js:15 | Implemented |
| 737 | `dist2` | hacklib.js:484 | Implemented |
| 721 | `distmin` | hacklib.js:475 | Implemented |
| 258 | `eos` | hacklib.js:120 | Implemented |
| 665 | `findword` | hacklib.js:380 | Implemented |
| 849 | `fuzzymatch` | hacklib.js:430 | Implemented |
| 140 | `highc` | hacklib.js:25 | Implemented |
| 427 | `ing_suffix` | hacklib.js:226 | Implemented |
| 746 | `isqrt` | hacklib.js:496 | Implemented |
| 154 | `lcase` | hacklib.js:45 | Implemented |
| 133 | `letter` | hacklib.js:20 | Implemented |
| 147 | `lowc` | hacklib.js:32 | Implemented |
| 206 | `mungspaces` | hacklib.js:87 | Implemented |
| 36 | `nh_deterministic_qsort` | hacklib.js:535 | Implemented |
| 19 | `nh_qsort_idx_cmp` | hacklib.js:668 | Implemented |
| 918 | `nh_snprintf` | - | Missing |
| 768 | `online2` | hacklib.js:508 | Implemented |
| 483 | `onlyspace` | hacklib.js:266 | Implemented |
| 689 | `ordin` | hacklib.js:451 | Implemented |
| 409 | `s_suffix` | hacklib.js:217 | Implemented |
| 714 | `sgn` | hacklib.js:464 | Implemented |
| 702 | `sitoa` | hacklib.js:459 | Implemented |
| 621 | `strNsubst` | hacklib.js:349 | Implemented |
| 305 | `str_end_is` | hacklib.js:152 | Implemented |
| 316 | `str_lines_maxlen` | hacklib.js:157 | Implemented |
| 277 | `str_start_is` | hacklib.js:145 | Implemented |
| 387 | `strcasecpy` | hacklib.js:199 | Implemented |
| 244 | `strip_newline` | hacklib.js:108 | Implemented |
| 563 | `stripchars` | hacklib.js:319 | Implemented |
| 585 | `stripdigits` | hacklib.js:328 | Implemented |
| 340 | `strkitten` | hacklib.js:173 | Implemented |
| 781 | `strncmpi` | hacklib.js:408 | Implemented |
| 804 | `strstri` | hacklib.js:423 | Implemented |
| 600 | `strsubst` | hacklib.js:340 | Implemented |
| 896 | `swapbits` | hacklib.js:520 | Implemented |
| 493 | `tabexpand` | hacklib.js:275 | Implemented |
| 228 | `trimspaces` | hacklib.js:103 | Implemented |
| 166 | `ucase` | hacklib.js:50 | Implemented |
| 946 | `unicodeval_to_utf8str` | - | Missing |
| 178 | `upstart` | hacklib.js:55 | Implemented |
| 187 | `upwords` | hacklib.js:61 | Implemented |
| 533 | `visctrl` | hacklib.js:292 | Implemented |
| 1056 | `what_datamodel_is_this` | hacklib.js:what_datamodel_is_this | Implemented |
| 464 | `xcrypt` | hacklib.js:xcrypt | Implemented |

### iactions.c -> iactions.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 127 | `ia_addmenu` | - | Missing |
| 46 | `item_naming_classification` | - | Missing |
| 86 | `item_reading_classification` | - | Missing |
| 278 | `itemactions` | - | Missing |
| 140 | `itemactions_pushkeys` | - | Missing |

### insight.c -> insight.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2516 | `achieve_rank` | - | Missing |
| 3207 | `align_str` | - | Missing |
| 1464 | `attributes_enlightenment` | - | Missing |
| 286 | `attrval` | - | Missing |
| 445 | `background_enlightenment` | - | Missing |
| 705 | `basics_enlightenment` | - | Missing |
| 266 | `cause_known` | - | Missing |
| 804 | `characteristics_enlightenment` | - | Missing |
| 2504 | `count_achievements` | - | Missing |
| 2542 | `do_gamelog` | - | Missing |
| 2014 | `doattributes` | - | Missing |
| 3165 | `doborn` | - | Missing |
| 2086 | `doconduct` | - | Missing |
| 3155 | `dogenocided` | - | Missing |
| 2779 | `dovanquished` | - | Missing |
| 159 | `enlght_combatinc` | - | Missing |
| 200 | `enlght_halfdmg` | - | Missing |
| 126 | `enlght_line` | - | Missing |
| 117 | `enlght_out` | - | Missing |
| 360 | `enlightenment` | - | Missing |
| 313 | `fmt_elapsed_time` | - | Missing |
| 1445 | `item_resistance_message` | - | Missing |
| 3027 | `list_genocided` | - | Missing |
| 2794 | `list_vanquished` | - | Missing |
| 3295 | `mstatusline` | - | Missing |
| 2990 | `num_extinct` | - | Missing |
| 2973 | `num_genocides` | - | Missing |
| 3005 | `num_gone` | - | Missing |
| 823 | `one_characteristic` | - | Missing |
| 3255 | `piousness` | - | Missing |
| 2417 | `record_achievement` | - | Missing |
| 2486 | `remove_achievement` | - | Missing |
| 2728 | `set_vanq_order` | - | Missing |
| 2253 | `show_achievements` | - | Missing |
| 2094 | `show_conduct` | - | Missing |
| 2571 | `show_gamelog` | - | Missing |
| 3223 | `size_str` | - | Missing |
| 2527 | `sokoban_in_play` | - | Missing |
| 917 | `status_enlightenment` | - | Missing |
| 232 | `trap_predicament` | - | Missing |
| 3422 | `ustatusline` | - | Missing |
| 2631 | `vanqsort_cmp` | - | Missing |
| 223 | `walking_on_water` | - | Missing |
| 1247 | `weapon_insight` | - | Missing |
| 2027 | `youhiding` | - | Missing |

### invent.c -> invent.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1152 | `addinv` | invent.js:1075 | Implemented |
| 1160 | `addinv_before` | invent.js:addinv_before | Implemented |
| 1056 | `addinv_core0` | invent.js:addinv_core0 | Implemented |
| 960 | `addinv_core1` | invent.js:1032 | Implemented |
| 1025 | `addinv_core2` | invent.js:1051 | Implemented |
| 1169 | `addinv_nomerge` | invent.js:1085 | Implemented |
| 4927 | `adjust_gold_ok` | invent.js:2405 | Implemented |
| 4917 | `adjust_ok` | invent.js:2399 | Implemented |
| 5008 | `adjust_split` | invent.js:adjust_split | Implemented (no-op) |
| 1710 | `any_obj_ok` | invent.js:1453 | Implemented |
| 2377 | `askchain` | invent.js:askchain | Implemented |
| 694 | `assigninvlet` | invent.js:939 | Implemented |
| 1187 | `carry_obj_effects` | invent.js:1069 | Implemented |
| 1495 | `carrying` | invent.js:1350 | Implemented |
| 1508 | `carrying_stoning_corpse` | invent.js:1358 | Implemented |
| 4889 | `check_invent_gold` | invent.js:2254 | Implemented |
| 5423 | `cinv_ansimpleoname` | invent.js:cinv_ansimpleoname | Implemented |
| 5391 | `cinv_doname` | invent.js:cinv_doname | Implemented |
| 2143 | `ckunpaid` | invent.js:2384 | Implemented |
| 2136 | `ckvalidcat` | invent.js:1464 | Implemented |
| 1627 | `compactify` | invent.js:2356 | Implemented |
| 1337 | `consume_obj_charge` | invent.js:1232 | Implemented |
| 3548 | `count_buc` | invent.js:1909 | Implemented |
| 3620 | `count_contents` | invent.js:1945 | Implemented |
| 2698 | `count_unidentified` | invent.js:1660 | Implemented |
| 3526 | `count_unpaid` | invent.js:1899 | Implemented |
| 1546 | `currency` | invent.js:81 | Implemented |
| 3006 | `ddoinv` | invent.js:2389 | Implemented |
| 1413 | `delallobj` | invent.js:1276 | Implemented |
| 1430 | `delobj` | invent.js:1286 | Implemented |
| 1438 | `delobj_core` | invent.js:1291 | Implemented |
| 4037 | `dfeature_at` | invent.js:1991 | Implemented |
| 2964 | `dispinv_with_action` | invent.js:1874 | Implemented (approx; action dispatch remains TODO) |
| 5489 | `display_binventory` | invent.js:2300 | Implemented |
| 5446 | `display_cinventory` | invent.js:2288 | Implemented |
| 3428 | `display_inventory` | invent.js:1868 | Implemented |
| 5341 | `display_minventory` | invent.js:2279 | Implemented |
| 3057 | `display_pickinv` | invent.js:1812 | Implemented (approx) |
| 3467 | `display_used_invlets` | invent.js:display_used_invlets | Implemented (stub) |
| 4319 | `dolook` | invent.js:2071 | Implemented |
| 4981 | `doorganize` | invent.js:463 | Implemented (inline in item action menu 'i' handler; prompt + letter swap) |
| 5068 | `doorganize_core` | invent.js:463 | Implemented (inline; see doorganize) |
| 2814 | `doperminv` | invent.js:doperminv | Implemented (stub) |
| 4679 | `dopramulet` | invent.js:2165 | Implemented |
| 4601 | `doprarm` | invent.js:2141 | Implemented |
| 4503 | `doprgold` | invent.js:2117 | Implemented |
| 4740 | `doprinuse` | invent.js:2194 | Implemented |
| 4642 | `doprring` | invent.js:2155 | Implemented |
| 4715 | `doprtool` | invent.js:2182 | Implemented |
| 4550 | `doprwep` | invent.js:2127 | Implemented |
| 3827 | `dotypeinv` | invent.js:dotypeinv | Implemented (stub) |
| 3654 | `dounpaid` | invent.js:dounpaid | Implemented (stub) |
| 4343 | `feel_cockatrice` | invent.js:2085 | Implemented |
| 3021 | `find_unpaid` | invent.js:1766 | Implemented |
| 4845 | `free_invbuf` | invent.js:free_invbuf | Implemented (no-op) |
| 3044 | `free_pickinv_cache` | invent.js:free_pickinv_cache | Implemented (no-op) |
| 1403 | `freeinv` | invent.js:1269 | Implemented |
| 1356 | `freeinv_core` | invent.js:1254 | Implemented |
| 2637 | `fully_identify_obj` | invent.js:1640 | Implemented |
| 1613 | `g_at` | invent.js:1416 | Implemented |
| 1752 | `getobj` | invent.js:1582 | Implemented (approx wrapper over getobj_simple) |
| 1719 | `getobj_hands_txt` | invent.js:1611 | Implemented |
| 2202 | `ggetobj` | invent.js:1596 | Implemented (approx wrapper over ggetobj_count) |
| 1208 | `hold_another_object` | invent.js:1176 | Implemented |
| 2651 | `identify` | invent.js:1652 | Implemented |
| 2711 | `identify_pack` | invent.js:1669 | Implemented |
| 70 | `inuse_classify` | invent.js:751 | Implemented |
| 5290 | `invdisp_nothing` | invent.js:1889 | Implemented |
| 391 | `invletter_value` | invent.js:2345 | Implemented |
| 2167 | `is_inuse` | invent.js:1487 | Implemented |
| 2156 | `is_worn` | invent.js:1482 | Implemented |
| 2750 | `learn_unseen_invent` | invent.js:1700 | Implemented |
| 4800 | `let_to_name` | invent.js:2211 | Implemented |
| 4104 | `look_here` | invent.js:2038 | Implemented |
| 149 | `loot_classify` | invent.js:800 | Implemented |
| 309 | `loot_xname` | invent.js:loot_xname | Implemented |
| 2660 | `menu_identify` | invent.js:menu_identify | Implemented (stub) |
| 4379 | `mergable` | invent.js:2109 (re-export from mkobj) | Implemented |
| 775 | `merge_choice` | invent.js:976 | Implemented |
| 814 | `merged` | invent.js:986 | Implemented |
| 1678 | `mime_action` | invent.js:1447 | Implemented |
| 4578 | `noarmor` | invent.js:2136 | Implemented |
| 1479 | `nxtobj` | invent.js:1337 | Implemented |
| 1587 | `o_on` | invent.js:1395 | Implemented |
| 1602 | `obj_here` | invent.js:1407 | Implemented |
| 2861 | `obj_to_let` | invent.js:1720 | Implemented |
| 5477 | `only_here` | invent.js:2295 | Implemented |
| 5661 | `perm_invent_toggled` | invent.js:2318 | Implemented |
| 5549 | `prepare_perminvent` | invent.js:2312 | Implemented |
| 2875 | `prinv` | invent.js:1756 | Implemented |
| 4855 | `reassign` | invent.js:2231 | Implemented |
| 739 | `reorder_invent` | invent.js:918 | Implemented |
| 3456 | `repopulate_perminvent` | invent.js:2394 | Implemented |
| 2552 | `reroll_menu` | invent.js:reroll_menu | Implemented (stub) |
| 2188 | `safeq_shortxprname` | invent.js:1606 | Implemented |
| 2180 | `safeq_xprname` | invent.js:1602 | Implemented |
| 2624 | `set_cknown_lknown` | invent.js:1624 | Implemented |
| 2094 | `silly_thing` | invent.js:1459 | Implemented |
| 1466 | `sobj_at` | invent.js:1327 | Implemented |
| 593 | `sortloot` | invent.js:865 | Implemented |
| 655 | `sortloot` | invent.js:865 | Implemented (overload) |
| 403 | `sortloot_cmp` | invent.js:sortloot_cmp | Implemented |
| 1664 | `splittable` | invent.js:1430 | Implemented |
| 4366 | `stackobj` | invent.js:2414 | Implemented |
| 5565 | `sync_perminvent` | invent.js:2315 | Implemented |
| 1672 | `taking_off` | invent.js:1442 | Implemented |
| 3580 | `tally_BUCX` | invent.js:1931 | Implemented |
| 3793 | `this_type_only` | invent.js:1959 | Implemented |
| 4698 | `tool_being_used` | invent.js:2175 | Implemented |
| 1557 | `u_carried_gloves` | invent.js:1376 | Implemented |
| 1576 | `u_have_novel` | invent.js:1387 | Implemented |
| 647 | `unsortloot` | invent.js:912 | Implemented |
| 2782 | `update_inventory` | invent.js:1715 | Implemented |
| 1321 | `useup` | invent.js:1221 | Implemented |
| 1312 | `useupall` | invent.js:1214 | Implemented |
| 4763 | `useupf` | invent.js:1239 | Implemented |
| 2149 | `wearing_armor` | invent.js:1476 | Implemented |
| 4334 | `will_feel_cockatrice` | invent.js:2076 | Implemented |
| 5309 | `worn_wield_only` | invent.js:2274 | Implemented |
| 2895 | `xprname` | invent.js:1725 | Implemented |

### isaac64.c -> isaac64.js
No function symbols parsed from isaac64.c.

### light.c -> light.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 719 | `any_light_source` | light.js:344 | Implemented |
| 916 | `arti_light_description` | light.js:492 | Implemented |
| 881 | `arti_light_radius` | light.js:479 | Implemented |
| 843 | `candle_light_range` | light.js:454 | Implemented |
| 99 | `del_light_source` | light.js:96 | Implemented |
| 142 | `delete_ls` | light.js:109 | Implemented (internal helper) |
| 361 | `discard_flashes` | light.js:295 | Implemented (internal helper) |
| 169 | `do_light_sources` | light.js:121 | Implemented |
| 376 | `find_mid` | light.js:308 | Implemented |
| 606 | `light_sources_sanity_check` | light.js:528 | Implemented |
| 501 | `light_stats` | - | N/A (debug statistics, not needed for gameplay) |
| 571 | `maybe_write_ls` | - | N/A (save/restore file I/O, JS uses storage.js) |
| 69 | `new_light_core` | light.js:74 | Implemented |
| 826 | `obj_adjust_light_radius` | light.js:437 | Implemented |
| 771 | `obj_is_burning` | light.js:383 | Implemented |
| 808 | `obj_merge_light_sources` | light.js:419 | Implemented |
| 706 | `obj_move_light_source` | light.js:330 | Implemented |
| 763 | `obj_sheds_light` | light.js:374 | Implemented |
| 779 | `obj_split_light_source` | light.js:391 | Implemented |
| 517 | `relink_light_sources` | - | N/A (save/restore fixup, JS uses storage.js) |
| 479 | `restore_light_sources` | - | N/A (save/restore, JS uses storage.js) |
| 421 | `save_light_sources` | - | N/A (save/restore, JS uses storage.js) |
| 257 | `show_transient_light` | light.js:280 | Stub — vision_recalc integration deferred |
| 729 | `snuff_light_source` | light.js:352 | Implemented |
| 330 | `transient_light_cleanup` | light.js:289 | Implemented |
| 398 | `whereis_mon` | - | N/A (save/restore helper) |
| 935 | `wiz_light_sources` | light.js:507 | Implemented |
| 634 | `write_ls` | - | N/A (save/restore file I/O, JS uses storage.js) |

### lock.c -> lock.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 289 | `autokey` | - | Missing |
| 1056 | `boxlock` | - | Missing |
| 162 | `breakchestlock` | - | Missing |
| 1276 | `chest_shatter_msg` | - | Missing |
| 957 | `doclose` | lock.js:handleClose | APPROX — close door command |
| 676 | `doforce` | lock.js:handleForce | APPROX — force lock command |
| 773 | `doopen` | lock.js:handleOpen | APPROX — open door command |
| 780 | `doopen_indir` | - | Missing |
| 1103 | `doorlock` | - | Missing |
| 216 | `forcelock` | - | Missing |
| 38 | `lock_action` | - | Missing |
| 269 | `maybe_reset_pick` | - | Missing |
| 926 | `obstructed` | - | Missing |
| 358 | `pick_lock` | - | Missing |
| 30 | `picking_at` | - | Missing |
| 17 | `picking_lock` | - | Missing |
| 68 | `picklock` | - | Missing |
| 259 | `reset_pick` | - | Missing |
| 759 | `stumble_on_door_mimic` | - | Missing |
| 660 | `u_have_forceable_weapon` | - | Missing |

### mail.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 685 | `ck_server_admin_msg` | - | Missing |
| 461 | `ckmailstatus` | - | Missing |
| 550 | `ckmailstatus` | - | Missing |
| 744 | `ckmailstatus` | - | Missing |
| 90 | `free_maildata` | - | Missing |
| 97 | `getmailstatus` | - | Missing |
| 288 | `md_rush` | - | Missing |
| 149 | `md_start` | - | Missing |
| 248 | `md_stop` | - | Missing |
| 399 | `newmail` | - | Missing |
| 589 | `read_simplemail` | - | Missing |
| 487 | `readmail` | - | Missing |
| 704 | `readmail` | - | Missing |
| 763 | `readmail` | - | Missing |

### makemon.c -> makemon.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2010 | `adj_lev` | - | Missing |
| 1608 | `align_shift` | - | Missing |
| 2548 | `bagotricks` | - | Missing |
| 1778 | `check_mongen_order` | - | Missing |
| 839 | `clone_mon` | - | Missing |
| 1757 | `cmp_init_mongen_order` | - | Missing |
| 1553 | `create_critters` | - | Missing |
| 1829 | `dump_mongen` | - | Missing |
| 2373 | `freemcorpsenm` | - | Missing |
| 2227 | `golemhp` | - | Missing |
| 2045 | `grow_up` | - | Missing |
| 1061 | `init_mextra` | - | Missing |
| 1801 | `init_mongen_order` | - | Missing |
| 35 | `is_home_elemental` | - | Missing |
| 81 | `m_initgrp` | makemon.js:2528 | Implemented |
| 591 | `m_initinv` | makemon.js:1237 | Implemented |
| 150 | `m_initthrow` | makemon.js:768 | Implemented |
| 163 | `m_initweap` | monsters.js `m_initweap()` | Aligned — fixed offensive item check |
| 1149 | `makemon` | - | Missing |
| 1078 | `makemon_rnd_goodpos` | - | Missing |
| 1539 | `mbirth_limit` | - | Missing |
| 1733 | `mk_gen_ok` | - | Missing |
| 1867 | `mkclass` | - | Missing |
| 1874 | `mkclass_aligned` | - | Missing |
| 1977 | `mkclass_poly` | - | Missing |
| 578 | `mkmonmoney` | - | Missing |
| 2175 | `mongets` | - | Missing |
| 988 | `monhp_per_lvl` | makemon.js:2548 | Implemented |
| 2364 | `newmcorpsenm` | - | Missing |
| 1068 | `newmextra` | makemon.js:2563 | Implemented |
| 1014 | `newmonhp` | makemon.js:673 | Implemented |
| 2262 | `peace_minded` | - | Missing |
| 960 | `propagate` | - | Missing |
| 1649 | `rndmonst` | - | Missing |
| 1656 | `rndmonst_adj` | - | Missing |
| 2315 | `set_malign` | monsters.js `set_malign()` | Aligned |
| 2387 | `set_mimic_sym` | - | Missing |
| 2599 | `summon_furies` | - | Missing |
| 1638 | `temperature_shift` | - | Missing |
| 1590 | `uncommon` | - | Missing |
| 1511 | `unmakemon` | - | Missing |
| 58 | `wrong_elem_type` | - | Missing |

### mcastu.c -> mcastu.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 981 | `buzzmu` | mcastu.js:309 | Partial — maps AD_* to beam type and fires zap.buzz toward hero |
| 632 | `cast_cleric_spell` | mcastu.js:163 | Implemented (all CLC_* spell dispatch) |
| 449 | `cast_wizard_spell` | mcastu.js:110 | Implemented (all MGC_* spell dispatch) |
| 177 | `castmu` | mcastu.js:223 | Implemented (full pipeline: fumble check, spell selection, dispatch) |
| 130 | `choose_clerical_spell` | mcastu.js:66 | Implemented (recursive rn2 reduction) |
| 76 | `choose_magic_spell` | mcastu.js:44 | Implemented (recursive rn2 reduction) |
| 49 | `cursetxt` | mcastu.js:37 | Stub |
| 410 | `death_inflicted_by` | mcastu.js:104 | Implemented |
| 885 | `is_undirected_spell` | mcastu.js:263 | Implemented |
| 360 | `m_cure_self` | mcastu.js:85 | Implemented (d(3,6) heal) |
| 913 | `spell_would_be_useless` | mcastu.js:285 | Implemented |
| 375 | `touch_of_death` | mcastu.js:94 | Stub (damage calc only) |

### mdlib.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 349 | `bannerc_string` | - | Missing |
| 669 | `build_options` | - | Missing |
| 393 | `build_savebones_compat_string` | - | Missing |
| 627 | `count_and_validate_soundlibopts` | - | Missing |
| 602 | `count_and_validate_winopts` | - | Missing |
| 849 | `do_runtime_info` | - | Missing |
| 248 | `make_version` | - | Missing |
| 236 | `md_ignored_features` | - | Missing |
| 300 | `mdlib_version_string` | - | Missing |
| 375 | `mkstemp` | - | Missing |
| 641 | `opt_out_words` | - | Missing |
| 864 | `release_runtime_info` | - | Missing |
| 835 | `runtime_info_init` | - | Missing |
| 316 | `version_id_string` | - | Missing |

### mhitm.c -> mhitm.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1475 | `attk_protection` | mhitm.js | Implemented |
| 807 | `engulf_target` | mhitm.js:862 | Implemented |
| 970 | `explmm` | mhitm.js | Implemented (simplified) |
| 597 | `failed_grab` | mhitm.js | Implemented |
| 106 | `fightm` | mhitm.js | Implemented |
| 736 | `gazemm` | mhitm.js | Implemented (simplified) |
| 849 | `gulpmm` | - | Missing (engulf handled inline) |
| 644 | `hitmm` | mhitm.js | Implemented |
| 293 | `mattackm` | mhitm.js | Implemented |
| 1016 | `mdamagem` | mhitm.js | Implemented |
| 179 | `mdisplacem` | mhitm.js:819 | Implemented |
| 76 | `missmm` | mhitm.js | Implemented |
| 1122 | `mon_poly` | mhitm.js:887 | Implemented |
| 1283 | `mswingsm` | mhitm.js:899 | Implemented |
| 27 | `noises` | mhitm.js | Stub |
| 1210 | `paralyze_monst` | mhitm.js | Implemented |
| 1304 | `passivemm` | mhitm.js | Implemented |
| 41 | `pre_mm_attack` | mhitm.js | Implemented (simplified) |
| 1260 | `rustm` | mhitm.js | Stub |
| 1223 | `sleep_monst` | mhitm.js | Implemented |
| 1250 | `slept_monst` | mhitm.js | Stub |
| 1461 | `xdrainenergym` | mhitm.js | Implemented |

### mhitu.c -> mhitu.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2349 | `assess_dmg` | mhitu.js:assess_dmg | Implemented |
| 447 | `calc_mattacku_vars` | mhitu.js:calc_mattacku_vars | Implemented |
| 2606 | `cloneu` | mhitu.js:cloneu | Implemented (splits hero HP, creates tame clone via makemon) |
| 1928 | `could_seduce` | mhitu.js:could_seduce | Implemented |
| 1031 | `diseasemu` | mhitu.js:diseasemu | Implemented |
| 1979 | `doseduce` | mhitu.js:doseduce | Partial — entrypoint present with simplified seduction flow |
| 263 | `expels` | mhitu.js:expels | Implemented |
| 1587 | `explmu` | mhitu.js:explmu | Implemented |
| 1661 | `gazemu` | mhitu.js:gazemu | Implemented (partial effects) |
| 309 | `getmattk` | mhitu.js:getmattk | Implemented |
| 1269 | `gulp_blnd_check` | mhitu.js:gulp_blnd_check | Implemented (engulfment blindness on blindfold removal) |
| 1285 | `gulpmu` | mhitu.js:gulpmu | Implemented (simplified engulf path) |
| 30 | `hitmsg` | mhitu.js:hitmsg | Implemented — C-faithful attack verb dispatch (bite/kick/sting/butt/touch/tentacle/hit) |
| 1140 | `hitmu` | mhitu.js:mattacku | Implemented — restructured to match C hitmu() flow: mhm state object, mhitu_adtyping dispatch, mhitm_knockback, negative AC damage reduction |
| 1085 | `magic_negation` | mondata.js | Implemented (simplified) |
| 490 | `mattacku` | mhitu.js:mattacku | Implemented — attack loop with AT_WEAP weapon swing messages, range2 dispatch for thrwmu |
| 2303 | `mayberem` | mhitu.js:2179 | Implemented |
| 1895 | `mdamageu` | mhitu.js:mdamageu | Implemented |
| 86 | `missmu` | mhitu.js:mattacku | Implemented — miss message with "just misses" variant |
| 2386 | `mon_avoiding_this_attack` | mhitu.js:mon_avoiding_this_attack | Implemented (m_seenres check for ranged attack avoidance) |
| 146 | `mpoisons_subj` | mhitu.js:mpoisons_subj | Implemented |
| 131 | `mswings` | mhitu.js:monsterWeaponSwingMsg | Implemented — weapon swing verb/message for AT_WEAP |
| 106 | `mswings_verb` | mhitu.js:monsterWeaponSwingVerb | Implemented — thrust/swing/slash verb selection |
| 466 | `mtrapped_in_pit` | mhitu.js:mtrapped_in_pit | Implemented (pit trap check for player or monster) |
| - | `mhitu_adtyping` | mhitu.js:mhitu_adtyping | Implemented — dispatcher for ~30 AD_* handlers in mhitu (monster-attacks-hero) branch |
| - | `mhitu_ad_phys` | mhitu.js | Implemented — AT_HUGS grab, AT_WEAP weapon dmgval, AT_TUCH gate |
| - | `mhitu_ad_fire` | mhitu.js | Implemented — Fire_resistance check, rn2(20) destroy_items gate |
| - | `mhitu_ad_cold` | mhitu.js | Implemented — Cold_resistance check, rn2(20) destroy_items gate |
| - | `mhitu_ad_elec` | mhitu.js | Implemented — Shock_resistance check, rn2(20) destroy_items gate |
| - | `mhitu_ad_acid` | mhitu.js | Implemented — Acid_resistance check, exercise(A_STR) |
| - | `mhitu_ad_stck` | mhitu.js | Implemented — sets player.ustuck |
| - | `mhitu_ad_wrap` | mhitu.js | Implemented — mcan check, sets ustuck |
| - | `mhitu_ad_plys` | mhitu.js | Implemented — rn2(3) gate, Free_action check, paralysis via game.multi |
| - | `mhitu_ad_slee` | mhitu.js | Implemented — rn2(5) gate, Sleep_resistance + Free_action check |
| - | `mhitu_ad_conf` | mhitu.js | Implemented — rn2(4) + mspec_used gate, make_confused() |
| - | `mhitu_ad_stun` | mhitu.js | Implemented — make_stunned() |
| - | `mhitu_ad_blnd` | mhitu.js | Implemented — make_blinded() |
| - | `mhitu_ad_drst` | mhitu.js | Implemented — Poison_resistance check, rn2(8) gate; approximation: uses fixed stat drain instead of poisoned() subsystem |
| - | `mhitu_ad_drli` | mhitu.js | Implemented — rn2(3) gate, Drain_resistance check, losexp() |
| - | `mhitu_ad_dren` | mhitu.js | Implemented — drain_en (player.pw) inline |
| - | `mhitu_ad_drin` | mhitu.js | Implemented — brain eating: INT drain, level loss; approximation: no helmet check |
| - | `mhitu_ad_slow` | mhitu.js | Implemented — speed reduction; approximation: simple flag set vs full HFast property manipulation |
| - | `mhitu_ad_ston` | mhitu.js | Implemented — rn2(3) + rn2(10) gates, messages; approximation: no actual petrification yet |
| - | `mhitu_ad_tlpt` | mhitu.js | Stub — negation check only, no teleport system |
| - | `mhitu_ad_sgld` | mhitu.js | Stub — hitmsg + damage=0 (no gold theft) |
| - | `mhitu_ad_sedu` | mhitu.js | Stub — hitmsg + damage=0 (no seduction/item theft) |
| - | `mhitu_ad_ssex` | mhitu.js | Stub — hitmsg + damage=0 |
| - | `mhitu_ad_curs` | mhitu.js | Stub — hitmsg + damage=0 (no curse system) |
| - | `mhitu_ad_slim` | mhitu.js | Stub — hitmsg + damage=0 (no sliming) |
| - | `mhitu_ad_ench` | mhitu.js | Stub — hitmsg + damage=0 (no enchantment drain) |
| - | `mhitu_ad_poly` | mhitu.js | Stub — hitmsg + damage=0 (no polymorph) |
| - | `mhitu_ad_were` | mhitu.js | Stub — hitmsg + damage=0 (no lycanthropy) |
| - | `mhitu_ad_heal` | mhitu.js | Implemented — restores player HP |
| - | `mhitu_ad_legs` | mhitu.js | Implemented — delegates to AD_PHYS |
| - | `mhitu_ad_dgst` | mhitu.js | Stub — hitmsg + damage=0 (no engulfing) |
| - | `mhitu_ad_samu` | mhitu.js | Stub — hitmsg + damage=0 (no artifact theft) |
| - | `mhitu_ad_dise` | mhitu.js | Implemented — calls diseasemu(); zero-damage when disease resisted |
| - | `mhitu_ad_deth` | mhitu.js | Implemented — redirects to drli |
| - | `mhitu_ad_pest` | mhitu.js | Stub — physical damage only |
| - | `mhitu_ad_famn` | mhitu.js | Stub — physical damage only |
| - | `mhitu_ad_halu` | mhitu.js | Implemented — applies hallucination timeout and zeroes damage |
| - | `mhitu_ad_rust` | mhitu.js | Stub — hitmsg + damage=0 (no armor erosion) |
| - | `mhitu_ad_corr` | mhitu.js | Stub — hitmsg + damage=0 (no armor erosion) |
| - | `mhitu_ad_dcay` | mhitu.js | Stub — hitmsg + damage=0 (no armor erosion) |
| - | `mhitm_knockback` | mhitu.js | Implemented — rn2(3) distance, rn2(6) chance, eligibility (AD_PHYS, attack type, size), rn2(2)+rn2(2) message |
| 2425 | `passiveum` | mhitu.js:passiveum | Implemented |
| 954 | `summonmu` | mhitu.js:summonmu | Partial — entrypoint present, simplified summon behavior |
| 1045 | `u_slip_free` | mhitu.js:u_slip_free | Implemented |
| 162 | `u_slow_down` | mhitu.js:u_slow_down | Implemented |
| 175 | `wildmiss` | mhitu.js:wildmiss | Implemented |

### minion.c -> minion.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 360 | `bribe` | - | Missing |
| 263 | `demon_talk` | - | Missing |
| 404 | `dlord` | - | Missing |
| 390 | `dprince` | - | Missing |
| 29 | `free_emin` | - | Missing |
| 497 | `gain_guardian_angel` | - | Missing |
| 419 | `llord` | - | Missing |
| 428 | `lminion` | - | Missing |
| 467 | `lose_guardian_angel` | - | Missing |
| 40 | `monster_census` | - | Missing |
| 59 | `msummon` | - | Missing |
| 443 | `ndemon` | monsters.js `ndemon()` | Aligned |
| 17 | `newemin` | - | Missing |
| 198 | `summon_minion` | - | Missing |

### mklev.c -> mklev.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 571 | `add_door` | mklev.js:623 | Aligned |
| 305 | `add_room` | mklev.js:139 | Aligned |
| 319 | `add_subroom` | mklev.js:148 | Aligned |
| 553 | `alloc_doors` | mklev.js:614 | Aligned |
| 1746 | `bydoor` | mklev.js:188 | Aligned |
| 678 | `cardinal_nextto_room` | mklev.js:417 | Aligned |
| 1194 | `chk_okdoor` | mklev.js:703 | Aligned |
| 847 | `clear_level_structures` | mklev.js:71 | Aligned |
| 825 | `count_level_features` | mklev.js:58 | Aligned |
| 232 | `do_room_or_subroom` | mklev.js:58 | Aligned |
| 1796 | `dodoor` | mklev.js:698 | Aligned |
| 612 | `dosdoor` | mklev.js:665 | Aligned |
| 935 | `fill_ordinary_room` | dungeon.js:2530 | Aligned |
| 1656 | `find_branch_room` | mklev.js:370 | Aligned |
| 2299 | `find_okay_roompos` | mklev.js:473 | Aligned |
| 148 | `finddpos` | mklev.js:86 | Aligned |
| 107 | `finddpos_shift` | mklev.js:62 | Aligned |
| 336 | `free_luathemes` | mklev.js:829 | Aligned |
| 2246 | `generate_stairs` | mklev.js:212 | Aligned |
| 2215 | `generate_stairs_find_room` | mklev.js:197 | Aligned |
| 2197 | `generate_stairs_room_good` | mklev.js:183 | Aligned |
| 74 | `good_rm_wall_doorpos` | mklev.js:44 | Aligned |
| 430 | `join` | dungeon.js:1617 | Aligned |
| 1540 | `level_finalize_topology` | mklev.js:798 | Aligned |
| 799 | `make_niches` | mklev.js:415 | Aligned |
| 519 | `makecorridors` | dungeon.js:1685 | Aligned |
| 1247 | `makelevel` | dungeon.js:4617 | Aligned |
| 737 | `makeniche` | mklev.js:369 | Aligned |
| 358 | `makerooms` | dungeon.js:1283 | Aligned |
| 818 | `makevtele` | mklev.js:460 | Aligned |
| 1789 | `maybe_sdoor` | mklev.js:154 | Aligned |
| 1445 | `mineralize` | dungeon.js:4212 | Aligned |
| 2620 | `mk_knox_portal` | dungeon.js:3054 | Aligned |
| 2328 | `mkaltar` | mklev.js:330 | Aligned |
| 2281 | `mkfount` | mklev.js:309 | Aligned |
| 2349 | `mkgrave` | mklev.js:341 | Aligned |
| 2599 | `mkinvk_check_wall` | dungeon.js:3065 | Aligned |
| 2406 | `mkinvokearea` | dungeon.js:3134 | Aligned |
| 2499 | `mkinvpos` | dungeon.js:3073 | Aligned |
| 1573 | `mklev` | dungeon.js:4933 | Aligned |
| 1219 | `mklev_sanity_check` | mklev.js:721 | Aligned |
| 2313 | `mksink` | mklev.js:320 | Aligned |
| 2155 | `mkstairs` | mklev.js:142 | Aligned |
| 2032 | `mktrap` | dungeon.js:2296 | Aligned |
| 1811 | `mktrap_victim` | dungeon.js:2381 | Aligned |
| 1802 | `occupied` | mklev.js:310 | Aligned |
| 1775 | `okdoor` | mklev.js:68 | Aligned |
| 1687 | `place_branch` | mklev.js:811 | Aligned |
| 698 | `place_niche` | mklev.js:255 | Aligned |
| 1673 | `pos_to_room` | mklev.js:246 | Aligned |
| 211 | `sort_rooms` | mklev.js:34 | Aligned |
| 1170 | `themerooms_post_level_generate` | levels/themerms.js:1284 | Aligned |
| 1593 | `topologize` | mklev.js:410 | Aligned |
| 1934 | `traptype_rnd` | mklev.js:858 | Aligned |
| 1998 | `traptype_roguelvl` | mklev.js:903 | Aligned |
| 1428 | `water_has_kelp` | dungeon.js:4197 | Aligned |

### mkmap.c -> mkmap.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 331 | `finish_map` | mkmap.js:322 | Aligned |
| 153 | `flood_fill_rm` | mkmap.js:112 | Aligned |
| 55 | `get_map` | mkmap.js:44 | Aligned |
| 37 | `init_fill` | mkmap.js:31 | Aligned |
| 24 | `init_map` | mkmap.js:20 | Aligned |
| 258 | `join_map` | mkmap.js:272 | Aligned |
| 246 | `join_map_cleanup` | mkmap.js:343 | Aligned |
| 443 | `litstate_rnd` | mkmap.js:406 | Aligned |
| 451 | `mkmap` | mkmap.js:411 | Aligned |
| 68 | `pass_one` | mkmap.js:51 | Aligned |
| 124 | `pass_three` | mkmap.js:90 | Aligned |
| 101 | `pass_two` | mkmap.js:68 | Aligned |
| 412 | `remove_room` | mkmap.js:372 | Aligned |
| 379 | `remove_rooms` | mkmap.js:355 | Aligned |

### mkmaze.c -> mkmaze.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 475 | `baalz_fixup` | mkmaze.js:670 | Partial — bounded nondiggable wallification region ported; remaining special-case side effects pending |
| 341 | `bad_location` | mkmaze.js:194 | Aligned |
| 1441 | `bound_digging` | dungeon.js `bound_digging()` | Aligned |
| 708 | `check_ransacked` | mkmaze.js:810 | Partial — supports Minetown ransacked marker plus room-id/room-name lookups |
| 951 | `create_maze` | mkmaze.js:283 | Aligned |
| 166 | `extend_spine` | mkmaze.js:69 | Aligned |
| 229 | `fix_wall_spines` | mkmaze.js `fix_wall_spines` | Aligned (re-export) |
| 570 | `fixup_special` | mkmaze.js:771 | Partial — water/air setup, portal hook, medusa statue pass, cleric-quest/castle graveyard, Minetown ransacked booty, and town flag side effects ported; levregion driver remains in `sp_lev.js` |
| 1479 | `fumaroles` | mkmaze.js:948 | Partial — C-style nmax/size rolls, lava-square gas cloud spawning, and Deaf-aware whoosh message ported; vision-lite unit contexts still guard cloud creation |
| 1354 | `get_level_extends` | dungeon.js `get_level_extends()` | Aligned |
| 317 | `is_exclusion_zone` | mkmaze.js:149 | Aligned |
| 70 | `is_solid` | mkmaze.js:48 | Aligned |
| 45 | `iswall` | mkmaze.js:29 | Aligned |
| 59 | `iswall_or_stone` | mkmaze.js:41 | Aligned |
| 1128 | `makemaz` | mkmaze.js:209 | Aligned |
| 1924 | `maybe_adjust_hero_bubble` | mkmaze.js:1366 | Partial — now applies C-style 50% hero-direction steering for current bubble |
| 309 | `maze0xy` | mkmaze.js:116 | Aligned |
| 895 | `maze_inbounds` | mkmaze.js:177 | Aligned |
| 905 | `maze_remove_deadends` | mkmaze.js:422 | Aligned |
| 1317 | `mazexy` | mkmaze.js:507 | Aligned |
| 781 | `migr_booty_item` | mkmaze.js:851 | Aligned |
| 718 | `migrate_orc` | mkmaze.js:878 | Aligned |
| 1868 | `mk_bubble` | mkmaze.js:1324 | Partial — C bubble mask catalog + bounded seed placement ported |
| 1459 | `mkportal` | mkmaze.js:181 | Aligned |
| 1534 | `movebubbles` | mkmaze.js:1054 | Partial — now re-establishes water/air base terrain each tick, auto-discovers water portal, carries objects/monsters/traps, supports hero transport hooks, and triggers optional vision recalc callback; full C display side-effects remain |
| 1947 | `mv_bubble` | mkmaze.js:1387 | Partial — bounded movement/collision bounce, bubble drawing, and stochastic heading updates ported; full C display side-effects remain |
| 297 | `okay` | mkmaze.js:102 | Aligned |
| 1043 | `pick_vibrasquare_location` | mkmaze.js:537 | Aligned |
| 356 | `place_lregion` | mkmaze.js:300 | Aligned |
| 1098 | `populate_maze` | mkmaze.js:460 | Aligned |
| 413 | `put_lregion_here` | mkmaze.js:238 | Aligned |
| 1745 | `restore_waterlevel` | mkmaze.js:1200 | Partial — structured water-state restore ported with bubble rehydrate/redraw |
| 1718 | `save_waterlevel` | mkmaze.js:1184 | Partial — structured water-state snapshot ported (serializes bubble runtime state) |
| 77 | `set_levltyp` | mkmaze.js:53 | Aligned |
| 125 | `set_levltyp_lit` | mkmaze.js:61 | Aligned |
| 1797 | `set_wportal` | mkmaze.js:1228 | Partial — now supports C-style portal discovery from on-map MAGIC_PORTAL trap |
| 1807 | `setup_waterlevel` | mkmaze.js:1243 | Partial — water/air conversion + C-style mk_bubble seeding + map level-type flags ported |
| 749 | `shiny_orc_stuff` | mkmaze.js:838 | Aligned |
| 800 | `stolen_booty` | mkmaze.js:866 | Aligned |
| 1855 | `unsetup_waterlevel` | mkmaze.js:1311 | Partial |
| 1233 | `walkfrom` | mkmaze.js:1524 | Aligned |
| 1280 | `walkfrom` | mkmaze.js:1524 | Aligned |
| 198 | `wall_cleanup` | mkmaze.js:84 | Aligned |
| 290 | `wallification` | mkmaze.js `wallification` | Aligned (re-export) |
| 1684 | `water_friction` | mkmaze.js:1151 | Partial — C-style direction perturbation for underwater movement |

### mkobj.c -> mkobj.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2717 | `add_to_buried` | - | Missing |
| 2673 | `add_to_container` | mkobj.js:1823 | Implemented |
| 2695 | `add_to_migration` | mkobj.js:1838 | Implemented |
| 2645 | `add_to_minv` | mkobj.js:1809 | Implemented |
| 1854 | `bcsign` | mkobj.js:434 | Implemented |
| 713 | `bill_dummy_object` | mkobj.js:1628 | Implemented |
| 1742 | `bless` | mkobj.js:396 | Implemented |
| 1838 | `blessorcurse` | mkobj.js:386 | Implemented |
| 3371 | `check_contained` | - | Missing |
| 3417 | `check_glob` | - | Missing |
| 836 | `clear_dknown` | mkobj.js:1654 | Implemented |
| 627 | `clear_splitobjs` | mkobj.js:1623 | Implemented |
| 2730 | `container_weight` | mkobj.js:440 | Implemented |
| 418 | `copy_oextra` | - | Missing |
| 2126 | `corpse_revive_type` | mkobj.js:1709 | Implemented |
| 753 | `costly_alteration` | - | Missing |
| 1780 | `curse` | mkobj.js:412 | Implemented |
| 2742 | `dealloc_obj` | mkobj.js:1851 | Implemented (via dealloc_obj_real) |
| 2812 | `dealloc_obj_real` | mkobj.js:1851 | Implemented |
| 97 | `dealloc_oextra` | mkobj.js:1548 | Implemented |
| 2522 | `discard_minvent` | mkobj.js:1764 | Implemented |
| 2828 | `dobjsfree` | - | Missing |
| 2620 | `extract_nexthere` | mkobj.js:1792 | Implemented |
| 2593 | `extract_nobj` | mkobj.js:1774 | Implemented |
| 2022 | `fixup_oil` | - | Missing |
| 168 | `free_omailcmd` | mkobj.js:1600 | Implemented |
| 152 | `free_omid` | mkobj.js:1588 | Implemented |
| 129 | `free_omonst` | mkobj.js:1570 | Implemented |
| 2198 | `get_mtraits` | mkobj.js:1747 | Implemented |
| 2844 | `hornoplenty` | - | Missing |
| 3344 | `init_dummyobj` | - | Missing |
| 81 | `init_oextra` | mkobj.js:1538 | Implemented |
| 3246 | `insane_obj_bits` | mkobj.js:1895 | Implemented |
| 3311 | `insane_object` | - | Missing |
| 2267 | `is_flammable` | mkobj.js:290 | Implemented |
| 2286 | `is_rottable` | mkobj.js:302 | Implemented |
| 1988 | `is_treefruit` | mkobj.js:1688 | Implemented |
| 1440 | `item_on_ice` | - | Missing |
| 178 | `may_generate_eroded` | objects.js `mayGenerateEroded()` | Aligned — in_mklev context ordering fixed |
| 1701 | `maybe_adjust_light` | - | Missing |
| 2250 | `mk_named_object` | - | Missing |
| 2224 | `mk_tt_object` | sp_lev.js `mk_tt_object()` | Aligned |
| 305 | `mkbox_cnts` | mkobj.js:795 | Implemented |
| 2064 | `mkcorpstat` | mkobj.js:1039 | Implemented |
| 2000 | `mkgold` | sp_lev.js `mkgold()` | Aligned |
| 271 | `mkobj` | mkobj.js:1076 | Implemented |
| 228 | `mkobj_at` | - | Missing |
| 197 | `mkobj_erosions` | mkobj.js:496 | Implemented |
| 1176 | `mksobj` | mkobj.js:926 | Implemented |
| 239 | `mksobj_at` | mkobj.js:1605 | Implemented |
| 870 | `mksobj_init` | mkobj.js:547 | Implemented |
| 254 | `mksobj_migr_to_species` | mkobj.js:1613 | Implemented |
| 3201 | `mon_obj_sanity` | mkobj.js:1868 | Implemented |
| 158 | `new_omailcmd` | mkobj.js:1593 | Implemented |
| 87 | `newoextra` | mkobj.js:1543 | Implemented |
| 144 | `newomid` | mkobj.js:1582 | Implemented |
| 115 | `newomonst` | mkobj.js:1560 | Implemented |
| 510 | `next_ident` | mkobj.js:233 | Implemented |
| 537 | `nextoid` | - | Missing |
| 3275 | `nomerge_exception` | mkobj.js:1910 | Implemented |
| 3699 | `obj_absorb` | mkobj.js:1948 | Implemented |
| 2144 | `obj_attach_mid` | mkobj.js:1716 | Implemented |
| 2554 | `obj_extract_self` | - | Missing |
| 2394 | `obj_ice_effects` | - | Missing |
| 3765 | `obj_meld` | mkobj.js:1982 | Implemented |
| 3640 | `obj_nexto` | mkobj.js:1916 | Implemented |
| 3658 | `obj_nexto_xy` | mkobj.js:1925 | Implemented |
| 2946 | `obj_sanity_check` | - | Missing |
| 2437 | `obj_timer_checks` | - | Missing |
| 3029 | `objlist_sanity` | - | Missing |
| 2420 | `peek_at_iced_corpse_age` | - | Missing |
| 2302 | `place_object` | mkobj.js:59 | Implemented |
| 3815 | `pudding_merge_message` | mkobj.js:2007 | Implemented (async) |
| 2368 | `recreate_pile_at` | - | Missing |
| 2505 | `remove_object` | - | Missing |
| 642 | `replace_object` | - | Missing |
| 1368 | `rider_revival_time` | mkobj.js:1661 | Implemented |
| 1981 | `rnd_treefruit_at` | - | Missing |
| 389 | `rndmonnum` | - | Missing |
| 396 | `rndmonnum_adj` | - | Missing |
| 3444 | `sanity_check_worn` | - | Missing |
| 2154 | `save_mtraits` | mkobj.js:1724 | Implemented |
| 1861 | `set_bknown` | mkobj.js:428 | Implemented |
| 1315 | `set_corpsenm` | mkobj.js:1015 | Implemented |
| 3131 | `shop_obj_sanity` | - | Missing |
| 1497 | `shrink_glob` | - | Missing |
| 1670 | `shrinking_glob_gone` | - | Missing |
| 458 | `splitobj` | mkobj.js:446 | Implemented |
| 1386 | `start_corpse_timeout` | mkobj.js:969 | Implemented |
| 1470 | `start_glob_timeout` | mkobj.js:1672 | Implemented |
| 1273 | `stone_furniture_type` | - | Missing |
| 1261 | `stone_object_type` | - | Missing |
| 1764 | `unbless` | mkobj.js:405 | Implemented |
| 1819 | `uncurse` | mkobj.js:421 | Implemented |
| 855 | `unknow_object` | - | Missing |
| 685 | `unknwn_contnr_contents` | - | Missing |
| 557 | `unsplitobj` | - | Missing |
| 1885 | `weight` | - | Missing |
| 3293 | `where_name` | - | Missing |

### mkroom.c -> mkroom.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 503 | `antholemon` | mkroom.js:392 | Aligned |
| 913 | `cmap_to_type` | mkroom.js:432 | Aligned |
| 784 | `courtmon` | mkroom.js:361 | Aligned |
| 53 | `do_mkroom` | mkroom.js:299 | Aligned |
| 277 | `fill_zoo` | sp_lev.js `fill_zoo()` | Aligned — all room types, ndemon, mkgold merge, mongets/set_malign, mk_tt_object |
| 641 | `has_dnstairs` | mkroom.js:12 | Aligned |
| 654 | `has_upstairs` | mkroom.js:21 | Aligned |
| 679 | `inside_room` | mkroom.js:61 | Aligned |
| 1051 | `invalid_shop_shape` | mkroom.js:237 | Aligned |
| 43 | `isbig` | mkroom.js:7 | Aligned |
| 258 | `mk_zoo_thronemon` | mkroom.js:429 | Aligned |
| 96 | `mkshop` | mkroom.js:267 | Aligned |
| 531 | `mkswamp` | mkroom.js:194 | Aligned |
| 599 | `mktemple` | mkroom.js:388 | Aligned |
| 457 | `mkundead` | mkroom.js:466 | Aligned |
| 245 | `mkzoo` | mkroom.js:186 | Aligned |
| 479 | `morguemon` | mkroom.js:376 | Aligned |
| 624 | `nexttodoor` | mkroom.js:30 | Aligned |
| 221 | `pick_room` | mkroom.js:164 | Aligned |
| 876 | `rest_room` | mkroom.js:453 | Aligned |
| 894 | `rest_rooms` | mkroom.js:458 | Aligned |
| 845 | `save_room` | mkroom.js:445 | Aligned |
| 864 | `save_rooms` | mkroom.js:449 | Aligned |
| 766 | `search_special` | mkroom.js:418 | Aligned |
| 578 | `shrine_pos` | mkroom.js:42 | Aligned |
| 667 | `somex` | mkroom.js:57 | Aligned |
| 695 | `somexy` | mkroom.js:72 | Aligned |
| 745 | `somexyspace` | mkroom.js:135 | Aligned |
| 673 | `somey` | mkroom.js:58 | Aligned |
| 818 | `squadmon` | mkroom.js:343 | Aligned |

### mon.c -> mon.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 5222 | `accept_newcham_form` | mon.js:2477 | Implemented (async) |
| 5915 | `adj_erinys` | mon.js:2586 | Implemented |
| 4466 | `alloc_itermonarr` | - | Missing |
| 3068 | `anger_quest_guardians` | mon.js:2316 | Implemented |
| 5704 | `angry_guards` | mon.js:2540 | Implemented |
| 5539 | `can_be_hatched` | mon.js:2498 | Implemented |
| 1972 | `can_carry` | mon.js:2199 | Implemented |
| 1940 | `can_touch_safely` | mon.js:1882 | Implemented |
| 5908 | `check_gear_next_turn` | mon.js:877 | Implemented |
| 2579 | `copy_mextra` | mon.js:2224 | Implemented |
| 3177 | `corpse_chance` | mon.js:793 | Implemented |
| 1895 | `curr_mon_load` | mon.js:2173 | Implemented |
| 5580 | `dead_species` | - | Missing |
| 3981 | `deal_with_overcrowding` | - | Missing |
| 2631 | `dealloc_mextra` | mon.js:2259 | Implemented |
| 2658 | `dealloc_monst` | mon.js:2276 | Implemented |
| 4867 | `decide_to_shapeshift` | - | Missing |
| 2469 | `dmonsfree` | - | Missing |
| 5562 | `egg_type_from_parent` | - | Missing |
| 3873 | `elemental_clog` | mon.js:1401 | Implemented |
| 6060 | `flash_mon` | - | Missing |
| 452 | `genus` | mon.js:329 | Implemented |
| 4539 | `get_iter_mons` | - | Missing |
| 4557 | `get_iter_mons_xy` | - | Missing |
| 5673 | `golemeffects` | mon.js:2517 | Implemented (async) |
| 4591 | `healmon` | mon.js | Implemented — heals monster HP with optional overheal |
| 4801 | `hide_monst` | mon.js:1508 | Implemented |
| 4721 | `hideunder` | mon.js:1436 | Implemented (async) |
| 4976 | `isspecmon` | mon.js:2464 | Implemented |
| 4522 | `iter_mons` | - | Missing |
| 4495 | `iter_mons_safe` | - | Missing |
| 5602 | `kill_eggs` | mon.js:2506 | Implemented |
| 5632 | `kill_genocided_monsters` | - | Missing |
| 3465 | `killed` | mon.js | Implemented — wrapper for xkilled with XKILL_GIVEMSG |
| 2835 | `lifesaved_monster` | mon.js | Implemented — activate life saving amulet, restore HP |
| 2993 | `logdeadmon` | mon.js:2285 | Implemented |
| 1162 | `m_calcdistress` | mon.js:2017 | Implemented (async) |
| 1374 | `m_consume_obj` | mon.js:1585 | Implemented |
| 2730 | `m_detach` | mon.js | Implemented — detach monster from map, drop inventory |
| 2112 | `m_in_air` | mon.js:1381 | Implemented |
| 3829 | `m_into_limbo` | - | Missing |
| 312 | `m_poisongas_ok` | mon.js:1387 | Implemented |
| 4117 | `m_respond` | monmove.js | Partial — dispatcher calls m_respond_shrieker/medusa/erinyes; shrieker rn2(10) gate faithful but makemon stubbed; medusa gazemu stubbed; erinyes aggravate faithful |
| 4104 | `m_respond_medusa` | monmove.js | Stub — gazemu not implemented |
| 4084 | `m_respond_shrieker` | monmove.js | Partial — rn2(10) gate faithful, makemon stubbed |
| 4622 | `m_restartcham` | mon.js:2438 | Implemented |
| 546 | `make_corpse` | mon.js | Implemented — per-monster corpse/drop creation (dragon scales, golem drops, etc.) |
| 1909 | `max_mon_load` | mon.js:2184 | Implemented |
| 3994 | `maybe_mnexto` | mon.js:2390 | Implemented (async) |
| 4693 | `maybe_unhide_at` | mon.js:1416 | Implemented |
| 1156 | `mcalcdistress` | mon.js:2008 | Implemented (async) |
| 1108 | `mcalcmove` | mon.js:106 | Implemented |
| 1336 | `meatbox` | mon.js:1561 | Implemented |
| 1638 | `meatcorpse` | mon.js | Implemented — purple worms eating corpses |
| 1445 | `meatmetal` | mon.js | Implemented — rust monsters eating metal objects |
| 1515 | `meatobj` | mon.js | Implemented — gelatinous cubes eating organic objects |
| 2122 | `mfndpos` | mon.js | Flag-based port. Missing: ALLOW_DIG, poison gas regions, worm segments |
| 5249 | `mgender_from_permonst` | mon.js:2489 | Implemented |
| 3838 | `migrate_mon` | mon.js:2378 | Implemented (async) |
| 5769 | `mimic_hit_msg` | mon.js:2570 | Implemented (async) |
| 929 | `minliquid` | mon.js | Implemented — drowning/lava/water effects on monsters |
| 943 | `minliquid_core` | mon.js:1784 | Implemented (async) |
| 2823 | `mlifesaver` | mon.js | Implemented — check for amulet of life saving |
| 2372 | `mm_2way_aggression` | mon.js | Ported (zombie-maker aggression) |
| 2410 | `mm_aggression` | mon.js | Ported (purple worm + zombie-maker) |
| 2433 | `mm_displacement` | mon.js | Ported (displacer beast logic) |
| 4026 | `mnearto` | - | Missing |
| 3950 | `mnexto` | - | Missing |
| 2046 | `mon_allowflags` | monmove.js | Ported. Missing: ALLOW_DIG, Conflict ALLOW_U, is_vampshifter NOGARLIC |
| 4824 | `mon_animal_list` | - | Missing |
| 1708 | `mon_give_prop` | mon.js | Implemented — grant intrinsic property to monster |
| 1760 | `mon_givit` | mon.js | Implemented — give intrinsics from eaten corpse |
| 2678 | `mon_leaving_level` | mon.js | Partial — unstuck() called from mondead, mtrapped clearing; Missing: worm removal, mswallower display, mimic unhide, newsym |
| 240 | `mon_sanity_check` | - | Missing |
| 3743 | `mon_to_stone` | mon.js:2322 | Implemented (async) |
| 3077 | `mondead` | mon.js:mondead + mon.js:mondead_full | Partial in mon.js; mondead_full adds lifesaved_monster, m_detach, corpse drops. Still missing: vamprises, steam vortex gas cloud, Kop respawn, chameleon/lycanthrope revert, mvitals tracking |
| 3249 | `mondied` | mon.js | Implemented — died of own accord, calls mondead + corpse_chance + make_corpse |
| 3263 | `mongone` | mon.js | Implemented — remove monster without corpse |
| 3373 | `monkilled` | mon.js | Implemented — killed by non-hero |
| 2039 | `monlineu` | mon.js:430 | Implemented |
| 2458 | `monnear` | mon.js:2666 | Implemented |
| 3283 | `monstone` | - | Missing |
| 1308 | `movemon` | mon.js:2047 | Implemented (async) |
| 1196 | `movemon_singlemon` | - | Missing |
| 1809 | `mpickgold` | mon.js | Implemented — pick up gold at location |
| 1829 | `mpickstuff` | - | Missing |
| 5271 | `newcham` | - | Missing |
| 4426 | `normal_shape` | - | Missing |
| 3859 | `ok_to_obliterate` | mon.js:2384 | Implemented |
| 5756 | `pacify_guard` | mon.js:2560 | Implemented |
| 5763 | `pacify_guards` | mon.js:2565 | Implemented |
| 4158 | `peacefuls_respond` | - | Missing |
| 4850 | `pick_animal` | - | Missing |
| 4934 | `pickvampshape` | mon.js:2444 | Implemented |
| 517 | `pm_to_cham` | mon.js:358 | Implemented |
| 4130 | `qst_guardians_respond` | mon.js:2421 | Implemented (async) |
| 2543 | `relmon` | - | Missing |
| 2497 | `replmon` | mon.js:2612 | Implemented |
| 4616 | `rescham` | - | Missing |
| 4635 | `restartcham` | - | Missing |
| 4644 | `restore_cham` | - | Missing |
| 4657 | `restrap` | - | Missing |
| 59 | `sanity_check_single_mon` | - | Missing |
| 5964 | `see_monster_closeup` | - | Missing |
| 6018 | `see_nearby_monsters` | mon.js:2636 | Implemented (async) |
| 4404 | `seemimic` | mon.js | Implemented — reveal hiding mimic |
| 5150 | `select_newcham_form` | makemon.js:select_newcham_form | APPROX — random fallback only, missing sandestin/doppelganger/werecreature |
| 2804 | `set_mon_min_mhpmax` | mon.js:850 | Implemented |
| 3417 | `set_ustuck` | mon.js:1406 | Implemented |
| 4260 | `setmangry` | mon.js | Implemented — make peaceful monster hostile |
| 6051 | `shieldeff_mon` | - | Missing |
| 399 | `undead_to_corpse` | mon.js:311 | Implemented |
| 3434 | `unstuck` | mon.js | Implemented — clears player.ustuck, rnd(2) for sticky/engulf/hug monsters; TODO: swallowed-player repositioning + vision recalc (no RNG impact) |
| 5789 | `usmellmon` | - | Missing |
| 5008 | `valid_vampshiftform` | mon.js:2469 | Implemented |
| 4986 | `validspecmon` | - | Missing |
| 5021 | `validvamp` | - | Missing |
| 3761 | `vamp_stone` | mon.js:2338 | Implemented (async) |
| 2886 | `vamprises` | - | Missing |
| 4317 | `wake_msg` | mon.js | Implemented — display wake message |
| 4362 | `wake_nearby` | mon.js:1341 | Implemented |
| 4397 | `wake_nearto` | mon.js | Implemented — wake monsters within distance |
| 4369 | `wake_nearto_core` | mon.js:1311 | Implemented |
| 4328 | `wakeup` | mon.js | Implemented — wake monster, possibly anger |
| 5071 | `wiz_force_cham_form` | - | Missing |
| 3472 | `xkilled` | mon.js | Implemented — main hero-kills-monster with treasure drop |
| 368 | `zombie_form` | mon.js:256 | Implemented |
| 344 | `zombie_maker` | mon.js:274 | Implemented |

### mondata.c -> mondata.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 129 | `Resists_Elem` | mondata.js:Resists_Elem | Implemented |
| 54 | `attacktype` | mondata.js:257 | Implemented |
| 42 | `attacktype_fordmg` | mondata.js:921 | Implemented |
| 1331 | `big_little_match` | mondata.js:738 | Implemented |
| 1316 | `big_to_little` | mondata.js:730 | Implemented |
| 640 | `breakarm` | mondata.js:568 | Implemented |
| 591 | `can_be_strangled` | mondata.js:633 | Implemented |
| 305 | `can_blnd` | mondata.js:can_blnd | Implemented |
| 567 | `can_blow` | mondata.js:611 | Implemented |
| 580 | `can_chant` | mondata.js:622 | Implemented |
| 623 | `can_track` | mondata.js:601 | Implemented |
| 663 | `cantvomit` | mondata.js:541 | Implemented |
| 1522 | `cvt_adtyp_to_mseenres` | mondata.js:1437 | Implemented |
| 1540 | `cvt_prop_to_mseenres` | mondata.js:1461 | Implemented |
| 91 | `defended` | mondata.js:944 | Implemented |
| 712 | `dmgtype` | mondata.js:454 | Implemented |
| 700 | `dmgtype_fromattack` | mondata.js:440 | Implemented |
| 1180 | `gender` | mondata.js:1390 | Implemented |
| 1660 | `get_atkdam_type` | mondata.js:1534 | Implemented |
| 1586 | `give_u_to_m_resistances` | mondata.js:1543 | Implemented |
| 540 | `hates_blessings` | mondata.js:522 | Implemented |
| 524 | `hates_silver` | mondata.js:507 | Implemented |
| 1211 | `levl_follower` | mondata.js:833 | Implemented |
| 1303 | `little_to_big` | mondata.js:718 | Implemented |
| 1380 | `locomotion` | mondata.js:1396 | Implemented |
| 720 | `max_passive_dmg` | mondata.js:max_passive_dmg | Implemented |
| 533 | `mon_hates_blessings` | mondata.js:529 | Implemented |
| 547 | `mon_hates_light` | mondata.js:586 | Implemented |
| 517 | `mon_hates_silver` | mondata.js:514 | Implemented |
| 1617 | `mon_knows_traps` | mondata.js:397 | Implemented |
| 1629 | `mon_learns_traps` | mondata.js:407 | Implemented |
| 1641 | `mons_see_trap` | mondata.js:1509 | Implemented |
| 1558 | `monstseesu` | mondata.js:1487 | Implemented |
| 1572 | `monstunseesu` | mondata.js:1498 | Implemented |
| 428 | `mstrength` | mondata.js:mstrength | Implemented |
| 501 | `mstrength_ranged_attk` | mondata.js:1381 | Implemented |
| 1449 | `msummon_environ` | mondata.js:msummon_environ | Implemented |
| 883 | `name_to_mon` | mondata.js:name_to_mon | Implemented |
| 1090 | `name_to_monclass` | mondata.js:name_to_monclass | Implemented |
| 893 | `name_to_monplus` | mondata.js:name_to_monplus | Implemented |
| 61 | `noattacks` | mondata.js:461 | Implemented |
| 678 | `num_horns` | mondata.js:549 | Implemented |
| 1507 | `olfaction` | mondata.js:1408 | Implemented |
| 1411 | `on_fire` | mondata.js:on_fire | Implemented |
| 554 | `passes_bars` | mondata.js:421 | Implemented |
| 80 | `poly_when_stoned` | mondata.js:593 | Implemented |
| 1191 | `pronoun_gender` | mondata.js:pronoun_gender | Implemented |
| 1359 | `raceptr` | mondata.js:raceptr | Implemented |
| 402 | `ranged_attk` | mondata.js:483 | Implemented |
| 1607 | `resist_conflict` | mondata.js:1021 | Implemented |
| 248 | `resists_blnd` | mondata.js:resists_blnd | Implemented |
| 278 | `resists_blnd_by_arti` | mondata.js:resists_blnd_by_arti | Implemented |
| 201 | `resists_drli` | mondata.js:1008 | Implemented |
| 215 | `resists_magm` | mondata.js:980 | Implemented |
| 771 | `same_race` | mondata.js:772 | Implemented |
| 13 | `set_mon_data` | mondata.js:904 | Implemented |
| 632 | `sliparm` | mondata.js:561 | Implemented |
| 1395 | `stagger` | mondata.js:1402 | Implemented |
| 654 | `sticks` | mondata.js:496 | Implemented |

### monmove.c -> monmove.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2191 | `accessible` | monmove.js:2518 | Implemented |
| 395 | `bee_eat_jelly` | monmove.js:bee_eat_jelly | Implemented (royal jelly → queen bee transformation via grow_up) |
| 2368 | `can_fog` | monmove.js:2542 | Implemented |
| 2124 | `can_hide_under_obj` | monmove.js:2500 | Implemented |
| 2359 | `can_ooze` | monmove.js:2536 | Implemented |
| 2184 | `closed_door` | monmove.js:2376 | Implemented |
| 1248 | `count_webbing_walls` | monmove.js:2471 | Implemented |
| 2173 | `dissolve_bars` | monmove.js:2575 | Implemented |
| 534 | `distfleeck` | monmove.js | Implemented — rn2(5) bravegremlin, inrange/nearby from dist2, onscary scared check, monflee call. Missing: flees_light, in_your_sanctuary |
| 328 | `disturb` | monmove.js:1251 | Implemented |
| 691 | `dochug` | monmove.js:672 | Partial — core turn logic, dog_move dispatch, combat. Missing: many special cases |
| 205 | `dochugw` | monmove.js:2217 | Implemented |
| 376 | `find_pmmonst` | monmove.js:2419 | Implemented |
| 425 | `gelcube_digests` | monmove.js:2435 | Implemented |
| 1231 | `holds_up_web` | monmove.js:2464 | Implemented |
| 1057 | `itsstuck` | monmove.js:2314 | Implemented |
| 1143 | `leppie_avoidance` | monmove.js:202 | Implemented |
| 1158 | `leppie_stash` | monmove.js:2452 | Implemented |
| 575 | `m_arrival` | monmove.js:m_arrival | Implemented (resets STRAT_ARRIVE flag) |
| 1301 | `m_avoid_kicked_loc` | monmove.js:523 | Implemented |
| 1317 | `m_avoid_soko_push_loc` | monmove.js:536 | Implemented |
| 1185 | `m_balks_at_approaching` | monmove.js:2346 | Implemented |
| 144 | `m_break_boulder` | monmove.js:2402 | Implemented |
| 134 | `m_can_break_boulder` | monmove.js:421 | Implemented |
| 1112 | `m_digweapon_check` | monmove.js:1710 | Implemented |
| 651 | `m_everyturn_effect` | monmove.js:2223 | Implemented |
| 1717 | `m_move` | monmove.js:1145 | Partial — core movement, fleeing, mfndpos integration. Missing: many special cases |
| 2091 | `m_move_aggress` | monmove.js:1379 | Partial — aggression checks on movement |
| 673 | `m_postmove_effect` | monmove.js:2234 | Implemented |
| 1334 | `m_search_items` | monmove.js:m_search_items_goal | Implemented |
| 1273 | `maybe_spin_web` | monmove.js:2480 | Implemented |
| 55 | `mb_trapped` | monmove.js:2301 | Implemented |
| 584 | `mind_blast` | monmove.js | Partial — RNG-faithful: rn2(20) gate, hero lock-on (sensemon/Blind_telepat/rn2(10)), rnd(15) damage, monster loop with telepathic/rn2(2)/rn2(10)/rnd(15); losehp stubbed, hero unhide stubbed |
| 308 | `mon_regen` | monmove.js | Implemented — HP regen every 20 turns, mspec_used decrement, meating countdown. Missing: finish_meating |
| 79 | `mon_track_add` | monmove.js:154 | Implemented — ring buffer push |
| 90 | `mon_track_clear` | monmove.js:162 | Implemented — zero all entries |
| 1040 | `mon_would_consume_item` | monmove.js:2365 | Implemented |
| 1003 | `mon_would_take_item` | monmove.js:mon_would_take_item_search | Implemented |
| 107 | `mon_yells` | monmove.js:2390 | Implemented |
| 463 | `monflee` | monmove.js:173 | Implemented — flee timer, ustuck release, flee messages. Missing: Vrock gas cloud, flees_light message, M_AP_FURNITURE/OBJECT check |
| 97 | `monhaskey` | monmove.js:270 | Implemented — skeleton key, lock pick, credit card |
| 242 | `onscary` | mon.js:139 | Partial — immunity checks (iswiz, rider, angel, human, unique, shk, priest), SCR_SCARE_MONSTER, Elbereth. Missing: altar/vampire, blind/minotaur/Gehennom, Displaced |
| 1459 | `postmov` | monmove.js:2247 | Implemented |
| 363 | `release_hero` | monmove.js:2325 | Implemented |
| 2201 | `set_apparxy` | monmove.js | Partial — pet/ustuck/position early-return, notseen/displaced displacement, rn2(3)/rn2(4) gotu, offset loop faithful; Approximations: missing Underwater check, missing Xorn smell, loop exit omits passes_walls/can_ooze/can_fog, Displaced detected via cloak otyp not intrinsic |
| 1074 | `should_displace` | monmove.js:2277 | Implemented |
| 1256 | `soko_allow_web` | monmove.js:soko_allow_web | Implemented (Sokoban web restriction via stairway visibility) |
| 2322 | `stuff_prevents_passage` | monmove.js:stuff_prevents_passage | Implemented (bulky inventory check for squeezing through passages) |
| 2280 | `undesirable_disp` | monmove.js:undesirable_disp | Implemented |
| 2380 | `vamp_shift` | monmove.js:vamp_shift | Implemented (vampire shape-change; newcham stub) |
| 177 | `watch_on_duty` | monmove.js:watch_on_duty | Implemented |

### monst.c -> monst.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 72 | `monst_globals_init` | - | Missing |

### mplayer.c -> mplayer.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 327 | `create_mplayers` | - | Missing |
| 44 | `dev_name` | - | Missing |
| 72 | `get_mplname` | - | Missing |
| 118 | `mk_mplayer` | - | Missing |
| 95 | `mk_mplayer_armor` | - | Missing |
| 356 | `mplayer_talk` | - | Missing |

### mthrowu.c -> mthrowu.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1255 | `blocking_terrain` | mthrowu.js:48 | Implemented |
| 1067 | `breamm` | mthrowu.js:472 | Partial — lined-up/cooldown checks, breath message, and zap.buzz beam dispatch implemented; remaining gaps in full C breath edge-cases |
| 1248 | `breamu` | mthrowu.js:479 | Implemented — wrapper to breamm |
| 1057 | `breathwep_name` | mthrowu.js:464 | Implemented |
| 162 | `drop_throw` | mthrowu.js:227 | Partial — C-style break gate (`cream/venom/egg-on-hit/should_mulch_missile`) and drop placement path implemented |
| 1390 | `hit_bars` | mthrowu.js:262 | Partial — break/drop-on-bars path now wired via dothrow break logic |
| 1472 | `hits_bars` | mthrowu.js:275 | Partial — C-style class/type pass-through rules implemented |
| 1371 | `lined_up` | mthrowu.js:124 | Implemented |
| 1303 | `linedup` | mthrowu.js:75 | Implemented |
| 1268 | `linedup_callback` | mthrowu.js:113 | Implemented |
| 1378 | `m_carrying` | mthrowu.js:59 | Implemented |
| 58 | `m_has_launcher_and_ammo` | mthrowu.js:65 | Implemented |
| 1349 | `m_lined_up` | mthrowu.js:113 | Implemented |
| 551 | `m_throw` | mthrowu.js:313 | Partial — core throw pipeline with C-style flight checks, player-hit special cases (egg/pie/venom hitv=8), and dmgval-based ranged damage; remaining bars/return-flight/display edge details TODO |
| 1135 | `m_useup` | mthrowu.js:150 | Implemented |
| 1127 | `m_useupall` | mthrowu.js:141 | Implemented |
| 201 | `monmulti` | mthrowu.js:162 | Partial — core volley logic + class/racial bonuses implemented |
| 262 | `monshoot` | mthrowu.js:278 | Implemented |
| 321 | `ohitmon` | mthrowu.js:242 | Partial — hit/miss/drop pipeline with `find_mac` to-hit and `dmgval` weapon/gem damage path implemented; remaining C edge-cases (special materials/effects) TODO |
| 824 | `return_from_mtoss` | mthrowu.js:355 | Partial — thrower recatch-vs-drop behavior implemented |
| 52 | `rnd_hallublast` | mthrowu.js:43 | Implemented |
| 990 | `spitmm` | mthrowu.js:442 | Partial — venom path implemented |
| 1241 | `spitmu` | mthrowu.js:458 | Partial — wrapper to spitmm |
| 75 | `thitu` | mthrowu.js:197 | Implemented |
| 943 | `thrwmm` | mthrowu.js:428 | Implemented |
| 1147 | `thrwmu` | mthrowu.js:400 | Partial — ranged throw/shoot + polearm thrust path implemented |
| 506 | `ucatchgem` | mthrowu.js:491 | Partial — unicorn glass-gem catch/reject path implemented |

### muse.c -> muse.js
`muse.js` now has named surfaces for all currently mapped `muse.c` functions (including newly added `reveal_trap` and `necrophiliac`) and active implementations for defensive/offensive/misc item selection and execution paths (`find_*`, `use_*`, `mbhit*`, reflect/unstone/unslime helpers).

Remaining parity gaps are mostly behavioral depth:

| C Area | Remaining Gap In JS |
|--------|----------------------|
| `precheck` potion-occupant edge flow | Milky/smoky potion occupant behavior is only partially modeled; descriptor gating and side effects are still lighter than C. |
| `use_offensive` (`SCR_EARTH`, camera, thrown potions) | Boulder-drop/flash/blindness side effects and messaging are approximated versus C. |
| `use_misc` (`BULLWHIP`, cursed gain-level rise, bag rummage) | Disarm transfer/placement and migration semantics are simplified. |
| `muse_newcham_mon` | Dragon-armor-targeted polymorph mapping is partial; full scales/mail-to-monster mapping remains incomplete. |
| `m_tele` / migration | Several level-transition and special-level routing nuances are still simplified. |
| `you_aggravate` | Full map/vision/UI wakeup side effects are reduced to lightweight messaging. |

### music.c -> music.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 67 | `awaken_monsters` | - | Missing |
| 45 | `awaken_scare` | - | Missing |
| 162 | `awaken_soldiers` | - | Missing |
| 139 | `calm_nymphs` | - | Missing |
| 196 | `charm_monsters` | - | Missing |
| 105 | `charm_snakes` | - | Missing |
| 344 | `do_earthquake` | - | Missing |
| 503 | `do_improvisation` | - | Missing |
| 221 | `do_pit` | - | Missing |
| 759 | `do_play_instrument` | - | Missing |
| 478 | `generic_lvl_desc` | - | Missing |
| 733 | `improvised_notes` | - | Missing |
| 902 | `obj_to_instr` | - | Missing |
| 85 | `put_monsters_to_sleep` | - | Missing |

### nhlobj.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 114 | `l_obj_add_to_container` | - | Missing |
| 389 | `l_obj_at` | - | Missing |
| 603 | `l_obj_bury` | - | Missing |
| 35 | `l_obj_check` | - | Missing |
| 469 | `l_obj_container` | - | Missing |
| 47 | `l_obj_gc` | - | Missing |
| 97 | `l_obj_getcontents` | - | Missing |
| 483 | `l_obj_isnull` | - | Missing |
| 350 | `l_obj_new_readobjnam` | - | Missing |
| 445 | `l_obj_nextobj` | - | Missing |
| 171 | `l_obj_objects_to_table` | - | Missing |
| 413 | `l_obj_placeobj` | - | Missing |
| 73 | `l_obj_push` | - | Missing |
| 654 | `l_obj_register` | - | Missing |
| 496 | `l_obj_timer_has` | - | Missing |
| 520 | `l_obj_timer_peek` | - | Missing |
| 579 | `l_obj_timer_start` | - | Missing |
| 547 | `l_obj_timer_stop` | - | Missing |
| 247 | `l_obj_to_table` | - | Missing |
| 142 | `nhl_obj_u_giveobj` | - | Missing |
| 89 | `nhl_push_obj` | - | Missing |

### nhlsel.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 281 | `l_selection_and` | sp_lev.js:8157 | Aligned |
| 58 | `l_selection_check` | sp_lev.js:8129 | Aligned |
| 762 | `l_selection_circle` | sp_lev.js:8147 | Aligned |
| 136 | `l_selection_clone` | sp_lev.js:8120 | Aligned |
| 810 | `l_selection_ellipse` | sp_lev.js:8148 | Aligned |
| 559 | `l_selection_fillrect` | sp_lev.js:8146 | Aligned |
| 657 | `l_selection_filter_mapchar` | sp_lev.js:3074 | Aligned |
| 389 | `l_selection_filter_percent` | sp_lev.js:8154 | Aligned |
| 726 | `l_selection_flood` | sp_lev.js:8152 | Aligned |
| 70 | `l_selection_gc` | sp_lev.js:8122 | Aligned |
| 454 | `l_selection_getbounds` | sp_lev.js:8137 | Aligned |
| 224 | `l_selection_getpoint` | sp_lev.js:8125 | Aligned |
| 862 | `l_selection_gradient` | sp_lev.js:8149 | Aligned |
| 631 | `l_selection_grow` | sp_lev.js:8155 | Aligned |
| 925 | `l_selection_iterate` | sp_lev.js:8139 | Aligned |
| 509 | `l_selection_line` | sp_lev.js:8143 | Aligned |
| 682 | `l_selection_match` | sp_lev.js:8153 | Aligned |
| 127 | `l_selection_new` | sp_lev.js:8117 | Aligned |
| 260 | `l_selection_not` | sp_lev.js:8156 | Aligned |
| 203 | `l_selection_numpoints` | sp_lev.js:8124 | Aligned |
| 306 | `l_selection_or` | sp_lev.js:8158 | Aligned |
| 112 | `l_selection_push_copy` | sp_lev.js:8119 | Aligned |
| 94 | `l_selection_push_new` | sp_lev.js:8118 | Aligned |
| 591 | `l_selection_randline` | sp_lev.js:8144 | Aligned |
| 531 | `l_selection_rect` | sp_lev.js:8145 | Aligned |
| 1025 | `l_selection_register` | sp_lev.js:8123 | Aligned |
| 407 | `l_selection_rndcoord` | sp_lev.js:8140 | Aligned |
| 432 | `l_selection_room` | sp_lev.js:8141 | Aligned |
| 159 | `l_selection_setpoint` | sp_lev.js:8130 | Aligned |
| 962 | `l_selection_size_description` | sp_lev.js:8138 | Aligned |
| 361 | `l_selection_sub` | sp_lev.js:8160 | Aligned |
| 81 | `l_selection_to` | sp_lev.js:8121 | Aligned |
| 332 | `l_selection_xor` | sp_lev.js:8159 | Aligned |
| 476 | `params_sel_2coords` | sp_lev.js:8110 | Aligned |

### nhlua.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 395 | `check_mapchr` | sp_lev.js:3047 | Aligned |
| 2831 | `end_luapat` | - | Missing |
| 1960 | `free_tutorial` | - | Missing |
| 2567 | `get_lua_version` | - | Missing |
| 1448 | `get_nh_lua_variables` | - | Missing |
| 1230 | `get_table_boolean` | sp_lev.js:8069 | Aligned |
| 1258 | `get_table_boolean_opt` | sp_lev.js:8056 | Aligned |
| 1168 | `get_table_int` | sp_lev.js:8082 | Aligned |
| 1180 | `get_table_int_opt` | sp_lev.js:8075 | Aligned |
| 243 | `get_table_mapchr` | sp_lev.js:3065 | Aligned |
| 258 | `get_table_mapchr_opt` | sp_lev.js:3055 | Aligned |
| 1273 | `get_table_option` | sp_lev.js:8102 | Aligned |
| 1193 | `get_table_str` | sp_lev.js:8096 | Aligned |
| 1206 | `get_table_str_opt` | sp_lev.js:8090 | Aligned |
| 2965 | `hook_open` | - | Missing |
| 2897 | `hooked_open` | - | Missing |
| 2075 | `init_nhc_data` | - | Missing |
| 2214 | `init_u_data` | - | Missing |
| 171 | `l_nhcore_call` | - | Missing |
| 161 | `l_nhcore_done` | - | Missing |
| 142 | `l_nhcore_init` | - | Missing |
| 227 | `lcheck_param_table` | - | Missing |
| 2543 | `load_lua` | - | Missing |
| 3195 | `nhlL_newstate` | - | Missing |
| 2997 | `nhlL_openlibs` | - | Missing |
| 320 | `nhl_add_table_entry_bool` | - | Missing |
| 303 | `nhl_add_table_entry_char` | - | Missing |
| 295 | `nhl_add_table_entry_int` | - | Missing |
| 328 | `nhl_add_table_entry_region` | - | Missing |
| 313 | `nhl_add_table_entry_str` | - | Missing |
| 3120 | `nhl_alloc` | - | Missing |
| 913 | `nhl_an` | - | Missing |
| 1815 | `nhl_callback` | - | Missing |
| 2759 | `nhl_clearfromtable` | - | Missing |
| 1614 | `nhl_debug_flags` | - | Missing |
| 473 | `nhl_deltrap` | - | Missing |
| 1304 | `nhl_dnum_name` | - | Missing |
| 2519 | `nhl_done` | - | Missing |
| 1594 | `nhl_doturn` | - | Missing |
| 1289 | `nhl_dump_fmtstr` | - | Missing |
| 201 | `nhl_error` | - | Missing |
| 1660 | `nhl_flip_level` | - | Missing |
| 1873 | `nhl_gamestate` | - | Missing |
| 1795 | `nhl_get_cmd_key` | - | Missing |
| 680 | `nhl_get_config` | - | Missing |
| 1144 | `nhl_get_debug_themerm_name` | - | Missing |
| 276 | `nhl_get_timertype` | - | Missing |
| 508 | `nhl_get_xy_params` | - | Missing |
| 697 | `nhl_getlin` | - | Missing |
| 532 | `nhl_getmap` | - | Missing |
| 2251 | `nhl_getmeminuse` | - | Missing |
| 418 | `nhl_gettrap` | - | Missing |
| 3180 | `nhl_hookfn` | - | Missing |
| 622 | `nhl_impossible` | - | Missing |
| 899 | `nhl_ing_suffix` | - | Missing |
| 2446 | `nhl_init` | - | Missing |
| 1343 | `nhl_int_to_obj_name` | - | Missing |
| 1324 | `nhl_int_to_pm_name` | - | Missing |
| 1121 | `nhl_is_genocided` | - | Missing |
| 1108 | `nhl_level_difficulty` | - | Missing |
| 2335 | `nhl_loadlua` | - | Missing |
| 927 | `nhl_lua_rnglog_ctx_enabled` | - | Missing |
| 857 | `nhl_makeplural` | - | Missing |
| 871 | `nhl_makesingular` | - | Missing |
| 723 | `nhl_menu` | - | Missing |
| 2115 | `nhl_meta_u_index` | - | Missing |
| 2182 | `nhl_meta_u_newindex` | - | Missing |
| 3143 | `nhl_panic` | - | Missing |
| 666 | `nhl_parse_config` | - | Missing |
| 2260 | `nhl_pcall` | - | Missing |
| 2306 | `nhl_pcall_handle` | - | Missing |
| 636 | `nhl_pline` | - | Missing |
| 2091 | `nhl_push_anything` | - | Missing |
| 2884 | `nhl_pushhooked_open_table` | - | Missing |
| 1575 | `nhl_pushkey` | - | Missing |
| 1086 | `nhl_random` | - | Missing |
| 1068 | `nhl_rn2` | - | Missing |
| 949 | `nhl_rnglog_set_lua_caller` | - | Missing |
| 885 | `nhl_s_suffix` | - | Missing |
| 2229 | `nhl_set_package_path` | - | Missing |
| 1520 | `nhl_stairways` | - | Missing |
| 1551 | `nhl_test` | - | Missing |
| 812 | `nhl_text` | - | Missing |
| 1679 | `nhl_timer_has_at` | - | Missing |
| 1710 | `nhl_timer_peek_at` | - | Missing |
| 1763 | `nhl_timer_start_at` | - | Missing |
| 1738 | `nhl_timer_stop_at` | - | Missing |
| 2192 | `nhl_u_clear_inventory` | - | Missing |
| 2202 | `nhl_u_giveobj` | - | Missing |
| 1372 | `nhl_variable` | - | Missing |
| 652 | `nhl_verbalize` | - | Missing |
| 3159 | `nhl_warn` | - | Missing |
| 2841 | `opencheckpat` | - | Missing |
| 1496 | `restore_luadata` | - | Missing |
| 1479 | `save_luadata` | - | Missing |
| 384 | `splev_chr2typ` | - | Missing |
| 403 | `splev_typ2chr` | - | Missing |
| 2810 | `start_luapat` | - | Missing |
| 2243 | `traceback_handler` | - | Missing |
| 1988 | `tutorial` | - | Missing |

### nhmd4.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 83 | `nhmd4_body` | - | Missing |
| 235 | `nhmd4_final` | - | Missing |
| 183 | `nhmd4_init` | - | Missing |
| 196 | `nhmd4_update` | - | Missing |

### o_init.c -> o_init.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 627 | `choose_disco_sort` | - | Missing |
| 709 | `disco_append_typename` | - | Missing |
| 733 | `disco_output_sorted` | - | Missing |
| 677 | `disco_typename` | - | Missing |
| 473 | `discover_object` | - | Missing |
| 569 | `discovered_cmp` | - | Missing |
| 870 | `doclassdisco` | - | Missing |
| 756 | `dodiscovered` | - | Missing |
| 1164 | `get_sortdisco` | - | Missing |
| 150 | `init_objects` | - | Missing |
| 264 | `init_oclass_probs` | - | Missing |
| 545 | `interesting_to_discover` | - | Missing |
| 293 | `obj_shuffle_range` | - | Missing |
| 376 | `objdescr_is` | - | Missing |
| 466 | `observe_object` | - | Missing |
| 858 | `oclass_to_name` | - | Missing |
| 393 | `oinit` | - | Missing |
| 84 | `randomize_gem_colors` | - | Missing |
| 1087 | `rename_disco` | - | Missing |
| 435 | `restnames` | - | Missing |
| 399 | `savenames` | - | Missing |
| 53 | `setgemprobs` | - | Missing |
| 112 | `shuffle` | - | Missing |
| 346 | `shuffle_all` | - | Missing |
| 34 | `shuffle_tiles` | - | Missing |
| 583 | `sortloot_descr` | - | Missing |
| 517 | `undiscover_object` | - | Missing |

### objects.c -> objects.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 32 | `objects_globals_init` | - | Missing |

### objnam.c -> objnam.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2149 | `An` | objnam.js:943 | Aligned |
| 2293 | `Doname2` | objnam.js:748 | Aligned |
| 5412 | `Japanese_item_name` | objnam.js:2147 | Aligned |
| 2224 | `The` | objnam.js:987 | Aligned |
| 2280 | `Tobjnam` | objnam.js:1032 | Aligned |
| 2368 | `Yname2` | objnam.js:1068 | Aligned |
| 2270 | `Yobjnam2` | objnam.js:1026 | Aligned |
| 2392 | `Ysimple_name2` | objnam.js:1090 | Aligned |
| 2480 | `actualoname` | objnam.js:1131 | Aligned |
| 1143 | `add_erosion_words` | objnam.js:592 | Aligned |
| 2136 | `an` | objnam.js:936 | Aligned |
| 2436 | `ansimpleoname` | objnam.js:1108 | Aligned |
| 2234 | `aobjnam` | objnam.js:1003 | Aligned |
| 5425 | `armor_simple_name` | objnam.js:2248 | Aligned |
| 3184 | `badman` | objnam.js:1331 | Aligned |
| 2492 | `bare_artifactname` | objnam.js:1143 | Aligned |
| 5541 | `boots_simple_name` | objnam.js:2221 | Aligned |
| 3158 | `ch_ksound` | objnam.js:1305 | Aligned |
| 5482 | `cloak_simple_name` | objnam.js:2180 | Aligned |
| 1815 | `corpse_xname` | objnam.js:759 | Aligned |
| 1915 | `cxname` | objnam.js:813 | Aligned |
| 1924 | `cxname_singular` | objnam.js:820 | Aligned |
| 3910 | `dbterrainmesg` | objnam.js:366 | Aligned |
| 347 | `distant_name` | objnam.js:340 | Aligned |
| 1745 | `doname` | objnam.js:69 | Aligned |
| 1223 | `doname_base` | objnam.js:587 | Aligned |
| 1759 | `doname_vague_quan` | objnam.js:733 | Aligned |
| 1752 | `doname_with_price` | objnam.js:697 | Aligned |
| 1195 | `erosion_matters` | objnam.js:73 | Aligned |
| 431 | `fruit_from_indx` | objnam.js:306 | Aligned |
| 443 | `fruit_from_name` | objnam.js:312 | Aligned |
| 414 | `fruitname` | objnam.js:326 | Aligned |
| 5522 | `gloves_simple_name` | objnam.js:2208 | Aligned |
| 5503 | `helm_simple_name` | objnam.js:2193 | Aligned |
| 2100 | `just_an` | objnam.js:906 | Aligned |
| 1933 | `killer_xname` | objnam.js:832 | Aligned |
| 2826 | `makeplural` | objnam.js:1416 | Aligned |
| 3027 | `makesingular` | objnam.js:1560 | Aligned |
| 167 | `maybereleaseobuf` | objnam.js:122 | Aligned |
| 5596 | `mimic_obj_name` | objnam.js:2268 | Aligned |
| 1038 | `minimal_xname` | objnam.js:1074 | Aligned |
| 1090 | `mshot_xname` | objnam.js:631 | Aligned |
| 142 | `nextobuf` | objnam.js:116 | Aligned |
| 1778 | `not_fully_identified` | objnam.js:658 | Aligned |
| 333 | `obj_is_pname` | objnam.js:290 | Aligned |
| 201 | `obj_typename` | objnam.js:138 | Aligned |
| 2521 | `otense` | objnam.js:1165 | Aligned |
| 2303 | `paydoname` | objnam.js:1046 | Aligned |
| 4900 | `readobjnam` | objnam.js:2070 | Aligned |
| 3923 | `readobjnam_init` | objnam.js:1846 | Aligned |
| 4168 | `readobjnam_parse_charges` | objnam.js:1863 | Aligned |
| 4230 | `readobjnam_postparse1` | objnam.js:1993 | Aligned |
| 4656 | `readobjnam_postparse2` | objnam.js:2045 | Aligned |
| 4717 | `readobjnam_postparse3` | objnam.js:2065 | Aligned |
| 3956 | `readobjnam_preparse` | objnam.js:1872 | Aligned |
| 150 | `releaseobuf` | objnam.js:119 | Aligned |
| 523 | `reorder_fruit` | objnam.js:332 | Aligned |
| 5393 | `rnd_class` | objnam.js:1826 | Aligned |
| 3445 | `rnd_otyp_by_namedesc` | objnam.js:1762 | Aligned |
| 3422 | `rnd_otyp_by_wpnskill` | objnam.js:1681 | Aligned |
| 5614 | `safe_qbuf` | objnam.js:353 | Aligned |
| 312 | `safe_typename` | objnam.js:247 | Aligned |
| 3529 | `set_wallprop_from_str` | objnam.js:384 | Aligned |
| 5560 | `shield_simple_name` | objnam.js:2234 | Aligned |
| 3522 | `shiny_obj` | objnam.js:1820 | Aligned |
| 5590 | `shirt_simple_name` | objnam.js:2243 | Aligned |
| 2000 | `short_oname` | objnam.js:347 | Aligned |
| 298 | `simple_typename` | objnam.js:227 | Aligned |
| 2418 | `simpleonames` | objnam.js:1101 | Aligned |
| 2773 | `singplur_compound` | objnam.js:1350 | Aligned |
| 2698 | `singplur_lookup` | objnam.js:1364 | Aligned |
| 2082 | `singular` | objnam.js:890 | Aligned |
| 123 | `strprepend` | objnam.js:125 | Aligned |
| 5461 | `suit_simple_name` | objnam.js:2168 | Aligned |
| 2162 | `the` | objnam.js:949 | Aligned |
| 1106 | `the_unique_obj` | objnam.js:606 | Aligned |
| 1121 | `the_unique_pm` | objnam.js:615 | Aligned |
| 2464 | `thesimpleoname` | objnam.js:1121 | Aligned |
| 2553 | `vtense` | objnam.js:1172 | Aligned |
| 3233 | `wishymatch` | objnam.js:1722 | Aligned |
| 3544 | `wizterrainwish` | objnam.js:395 | Aligned |
| 558 | `xcalled` | objnam.js:133 | Aligned |
| 575 | `xname` | objnam.js:65 | Aligned |
| 581 | `xname_flags` | objnam.js:578 | Aligned |
| 2349 | `yname` | objnam.js:1057 | Aligned |
| 2252 | `yobjnam` | objnam.js:1015 | Aligned |
| 2381 | `ysimple_name` | objnam.js:1084 | Aligned |

### options.c -> options.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 9307 | `add_autopickup_exception` | - | Missing |
| 8095 | `add_menu_cmd_alias` | - | Missing |
| 9650 | `all_options_apes` | - | Missing |
| 9563 | `all_options_conds` | - | Missing |
| 9602 | `all_options_menucolors` | - | Missing |
| 9635 | `all_options_msgtypes` | - | Missing |
| 9665 | `all_options_palette` | - | Missing |
| 9685 | `all_options_strbuf` | - | Missing |
| 447 | `ask_do_tutorial` | - | Missing |
| 7556 | `assign_warnings` | - | Missing |
| 6678 | `bad_negation` | - | Missing |
| 5470 | `can_set_perm_invent` | - | Missing |
| 7481 | `change_inv_order` | - | Missing |
| 708 | `check_misc_menu_command` | - | Missing |
| 5517 | `check_perm_invent_again` | - | Missing |
| 8141 | `collect_menu_keys` | - | Missing |
| 6775 | `complain_about_duplicate` | - | Missing |
| 9221 | `count_apes` | - | Missing |
| 9209 | `count_cond` | - | Missing |
| 6688 | `determine_ambiguities` | - | Missing |
| 8800 | `doset` | options.js:handleSet | APPROX — options menu |
| 9048 | `doset_add_menu` | - | Missing |
| 8722 | `doset_simple` | - | Missing |
| 8551 | `doset_simple_menu` | - | Missing |
| 9286 | `dotogglepickup` | pickup.js:handleTogglePickup | Aligned |
| 6767 | `duplicate_opt_detection` | - | Missing |
| 10159 | `enhance_menu_text` | - | Missing |
| 6881 | `escapes` | - | Missing |
| 7573 | `feature_alert_opts` | - | Missing |
| 9379 | `free_autopickup_exceptions` | - | Missing |
| 7787 | `free_one_msgtype` | - | Missing |
| 801 | `freeroleoptvals` | - | Missing |
| 8185 | `fruitadd` | - | Missing |
| 8036 | `get_cnf_role_opt` | - | Missing |
| 8109 | `get_menu_cmd_key` | - | Missing |
| 8496 | `get_option_value` | - | Missing |
| 748 | `getoptstr` | - | Missing |
| 9238 | `handle_add_list_remove` | - | Missing |
| 5571 | `handler_align_misc` | - | Missing |
| 6316 | `handler_autopickup_exception` | - | Missing |
| 5609 | `handler_autounlock` | - | Missing |
| 5660 | `handler_disclose` | - | Missing |
| 6392 | `handler_menu_colors` | - | Missing |
| 5765 | `handler_menu_headings` | - | Missing |
| 5780 | `handler_menu_objsyms` | - | Missing |
| 5529 | `handler_menustyle` | - | Missing |
| 5817 | `handler_msg_window` | - | Missing |
| 6487 | `handler_msgtype` | - | Missing |
| 5878 | `handler_number_pad` | - | Missing |
| 5938 | `handler_paranoid_confirmation` | - | Missing |
| 5996 | `handler_perminv_mode` | - | Missing |
| 6137 | `handler_petattr` | - | Missing |
| 6071 | `handler_pickup_burden` | - | Missing |
| 6099 | `handler_pickup_types` | - | Missing |
| 6109 | `handler_runmode` | - | Missing |
| 6152 | `handler_sortloot` | - | Missing |
| 6306 | `handler_symset` | - | Missing |
| 6558 | `handler_versinfo` | - | Missing |
| 6191 | `handler_whatis_coord` | - | Missing |
| 6264 | `handler_whatis_filter` | - | Missing |
| 6605 | `handler_windowborders` | - | Missing |
| 7830 | `hide_unhide_msgtypes` | - | Missing |
| 8052 | `illegal_menu_cmd_key` | - | Missing |
| 7064 | `initoptions` | - | Missing |
| 7305 | `initoptions_finish` | - | Missing |
| 7119 | `initoptions_init` | - | Missing |
| 9957 | `is_wc2_option` | - | Missing |
| 9903 | `is_wc_option` | - | Missing |
| 6724 | `length_without_val` | - | Missing |
| 8523 | `longest_option_name` | - | Missing |
| 8126 | `map_menu_cmd` | - | Missing |
| 6745 | `match_optname` | - | Missing |
| 7705 | `msgtype2name` | - | Missing |
| 7746 | `msgtype_add` | - | Missing |
| 7846 | `msgtype_count` | - | Missing |
| 7772 | `msgtype_free` | - | Missing |
| 7859 | `msgtype_parse_add` | - | Missing |
| 7812 | `msgtype_type` | - | Missing |
| 9762 | `next_opt` | - | Missing |
| 6833 | `nh_getenv` | - | Missing |
| 6846 | `nmcpy` | - | Missing |
| 8077 | `oc_to_str` | - | Missing |
| 729 | `opt2roleopt` | - | Missing |
| 1408 | `optfn_DECgraphics` | - | Missing |
| 1919 | `optfn_IBMgraphics` | - | Missing |
| 937 | `optfn_align_message` | - | Missing |
| 987 | `optfn_align_status` | - | Missing |
| 899 | `optfn_alignment` | - | Missing |
| 1036 | `optfn_altkeyhandling` | - | Missing |
| 1080 | `optfn_autounlock` | - | Missing |
| 5195 | `optfn_boolean` | - | Missing |
| 1185 | `optfn_boulder` | - | Missing |
| 1263 | `optfn_catname` | - | Missing |
| 1273 | `optfn_crash_email` | - | Missing |
| 1299 | `optfn_crash_name` | - | Missing |
| 1325 | `optfn_crash_urlmax` | - | Missing |
| 1359 | `optfn_cursesgraphics` | - | Missing |
| 1456 | `optfn_disclose` | - | Missing |
| 1576 | `optfn_dogname` | - | Missing |
| 1585 | `optfn_dungeon` | - | Missing |
| 1607 | `optfn_effects` | - | Missing |
| 1629 | `optfn_font_map` | - | Missing |
| 1638 | `optfn_font_menu` | - | Missing |
| 1647 | `optfn_font_message` | - | Missing |
| 1656 | `optfn_font_size_map` | - | Missing |
| 1665 | `optfn_font_size_menu` | - | Missing |
| 1674 | `optfn_font_size_message` | - | Missing |
| 1683 | `optfn_font_size_status` | - | Missing |
| 1692 | `optfn_font_size_text` | - | Missing |
| 1701 | `optfn_font_status` | - | Missing |
| 1710 | `optfn_font_text` | - | Missing |
| 1719 | `optfn_fruit` | - | Missing |
| 1790 | `optfn_gender` | - | Missing |
| 1828 | `optfn_glyph` | - | Missing |
| 1865 | `optfn_hilite_status` | - | Missing |
| 1910 | `optfn_horsename` | - | Missing |
| 1976 | `optfn_map_mode` | - | Missing |
| 2083 | `optfn_menu_deselect_all` | - | Missing |
| 2091 | `optfn_menu_deselect_page` | - | Missing |
| 2099 | `optfn_menu_first_page` | - | Missing |
| 2189 | `optfn_menu_headings` | - | Missing |
| 2107 | `optfn_menu_invert_all` | - | Missing |
| 2115 | `optfn_menu_invert_page` | - | Missing |
| 2123 | `optfn_menu_last_page` | - | Missing |
| 2131 | `optfn_menu_next_page` | - | Missing |
| 2231 | `optfn_menu_objsyms` | - | Missing |
| 2139 | `optfn_menu_previous_page` | - | Missing |
| 2147 | `optfn_menu_search` | - | Missing |
| 2155 | `optfn_menu_select_all` | - | Missing |
| 2163 | `optfn_menu_select_page` | - | Missing |
| 2171 | `optfn_menu_shift_left` | - | Missing |
| 2179 | `optfn_menu_shift_right` | - | Missing |
| 2296 | `optfn_menuinvertmode` | - | Missing |
| 2326 | `optfn_menustyle` | - | Missing |
| 2384 | `optfn_monsters` | - | Missing |
| 2402 | `optfn_mouse_support` | - | Missing |
| 2462 | `optfn_msg_window` | - | Missing |
| 2529 | `optfn_msghistory` | - | Missing |
| 2555 | `optfn_name` | - | Missing |
| 2580 | `optfn_number_pad` | - | Missing |
| 8361 | `optfn_o_autocomplete` | - | Missing |
| 8317 | `optfn_o_autopickup_exceptions` | - | Missing |
| 8339 | `optfn_o_bind_keys` | - | Missing |
| 8383 | `optfn_o_menu_colors` | - | Missing |
| 8404 | `optfn_o_message_types` | - | Missing |
| 8429 | `optfn_o_status_cond` | - | Missing |
| 8461 | `optfn_o_status_hilites` | - | Missing |
| 2654 | `optfn_objects` | - | Missing |
| 2676 | `optfn_packorder` | - | Missing |
| 2705 | `optfn_palette` | - | Missing |
| 2741 | `optfn_palette` | - | Missing |
| 2824 | `optfn_paranoid_confirmation` | - | Missing |
| 3052 | `optfn_perminv_mode` | - | Missing |
| 3144 | `optfn_petattr` | - | Missing |
| 3203 | `optfn_pettype` | - | Missing |
| 3262 | `optfn_pickup_burden` | - | Missing |
| 3314 | `optfn_pickup_types` | - | Missing |
| 3410 | `optfn_pile_limit` | - | Missing |
| 3444 | `optfn_player_selection` | - | Missing |
| 3477 | `optfn_playmode` | - | Missing |
| 3513 | `optfn_race` | - | Missing |
| 3551 | `optfn_roguesymset` | - | Missing |
| 3595 | `optfn_role` | - | Missing |
| 3633 | `optfn_runmode` | - | Missing |
| 3675 | `optfn_scores` | - | Missing |
| 3769 | `optfn_scroll_amount` | - | Missing |
| 3800 | `optfn_scroll_margin` | - | Missing |
| 3869 | `optfn_sortdiscoveries` | - | Missing |
| 3920 | `optfn_sortloot` | - | Missing |
| 3964 | `optfn_sortvanquished` | - | Missing |
| 3830 | `optfn_soundlib` | - | Missing |
| 4019 | `optfn_statushilites` | - | Missing |
| 4073 | `optfn_statuslines` | - | Missing |
| 4117 | `optfn_subkeyvalue` | - | Missing |
| 4141 | `optfn_suppress_alert` | - | Missing |
| 4173 | `optfn_symset` | - | Missing |
| 4245 | `optfn_term_cols` | - | Missing |
| 4286 | `optfn_term_rows` | - | Missing |
| 4327 | `optfn_tile_file` | - | Missing |
| 4360 | `optfn_tile_height` | - | Missing |
| 4392 | `optfn_tile_width` | - | Missing |
| 4424 | `optfn_traps` | - | Missing |
| 4446 | `optfn_vary_msgcount` | - | Missing |
| 4478 | `optfn_versinfo` | - | Missing |
| 4653 | `optfn_video` | - | Missing |
| 4631 | `optfn_video_height` | - | Missing |
| 4610 | `optfn_video_width` | - | Missing |
| 4544 | `optfn_videocolors` | - | Missing |
| 4579 | `optfn_videoshades` | - | Missing |
| 4688 | `optfn_warnings` | - | Missing |
| 4709 | `optfn_whatis_coord` | - | Missing |
| 4754 | `optfn_whatis_filter` | - | Missing |
| 4803 | `optfn_windowborders` | - | Missing |
| 4863 | `optfn_windowchain` | - | Missing |
| 4900 | `optfn_windowcolors` | - | Missing |
| 4949 | `optfn_windowtype` | - | Missing |
| 9469 | `option_help` | - | Missing |
| 10120 | `options_free_window_colors` | - | Missing |
| 7920 | `parse_role_opt` | - | Missing |
| 7611 | `parsebindings` | - | Missing |
| 506 | `parseoptions` | - | Missing |
| 862 | `petname_optfn` | - | Missing |
| 5172 | `pfxfn_IBM_` | - | Missing |
| 4997 | `pfxfn_cond_` | - | Missing |
| 5042 | `pfxfn_font` | - | Missing |
| 7716 | `query_msgtype` | - | Missing |
| 6797 | `rejectoption` | - | Missing |
| 9356 | `remove_autopickup_exception` | - | Missing |
| 6758 | `reset_duplicate_opt_detection` | - | Missing |
| 837 | `restoptvals` | - | Missing |
| 772 | `saveoptstr` | - | Missing |
| 815 | `saveoptvals` | - | Missing |
| 7461 | `set_menuobjsyms_flags` | - | Missing |
| 9859 | `set_option_mod_status` | - | Missing |
| 10138 | `set_playmode` | - | Missing |
| 9939 | `set_wc2_option_mod_status` | - | Missing |
| 9885 | `set_wc_option_mod_status` | - | Missing |
| 2058 | `shared_menu_optfn` | - | Missing |
| 9100 | `show_menu_controls` | - | Missing |
| 5434 | `spcfn_misc_menu_cmd` | - | Missing |
| 6668 | `string_for_env_opt` | - | Missing |
| 6650 | `string_for_opt` | - | Missing |
| 9392 | `sym_val` | - | Missing |
| 8780 | `term_for_boolean` | - | Missing |
| 7886 | `test_regex_pattern` | - | Missing |
| 6956 | `txt2key` | - | Missing |
| 790 | `unsaveoptstr` | - | Missing |
| 7536 | `warning_opts` | - | Missing |
| 9970 | `wc2_supported` | - | Missing |
| 9983 | `wc_set_font_name` | - | Missing |
| 10027 | `wc_set_window_colors` | - | Missing |
| 9916 | `wc_supported` | - | Missing |

### pager.c -> pager.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2446 | `Bitfield` | - | Missing |
| 2447 | `Bitfield` | - | Missing |
| 2448 | `Bitfield` | - | Missing |
| 1133 | `add_cmap_descr` | - | Missing |
| 1627 | `add_quoted_engraving` | - | Missing |
| 82 | `append_str` | - | Missing |
| 830 | `checkfile` | - | Missing |
| 2774 | `dispfile_debughelp` | pager.js:1233 | Implemented |
| 2744 | `dispfile_help` | pager.js:1208 | Implemented |
| 2768 | `dispfile_license` | pager.js:1228 | Implemented |
| 2756 | `dispfile_optionfile` | pager.js:1218 | Implemented |
| 2762 | `dispfile_optmenu` | pager.js:1223 | Implemented |
| 2750 | `dispfile_shelp` | pager.js:1213 | Implemented |
| 2780 | `dispfile_usagehelp` | pager.js:1238 | Implemented |
| 1669 | `do_look` | pager.js:do_look | Partial — C-shaped async look core for `/` and `;` with getpos loop + symbol path; full menu/checkfile/supplemental-info branches still TODO |
| 1246 | `do_screen_description` | pager.js:do_screen_description | Partial — monster/object/trap/terrain location description core |
| 2249 | `do_supplemental_info` | - | Missing |
| 2714 | `docontact` | - | Missing |
| 2856 | `dohelp` | pager.js:handleHelp | APPROX — help command |
| 2957 | `dohistory` | pager.js:handleHistory | APPROX — message history |
| 2332 | `doidtrap` | pager.js:1163 | Implemented |
| 2816 | `domenucontrols` | - | Missing |
| 2325 | `doquickwhatis` | pager.js:doquickwhatis | Partial — quick cursor-based glance path |
| 2655 | `dowhatdoes` | pager.js:handleWhatdoes | APPROX — key help |
| 2573 | `dowhatdoes_core` | pager.js:1196 | Implemented |
| 2318 | `dowhatis` | pager.js:dowhatis | Partial — routed through do_look mode 0 |
| 2810 | `hmenu_doextlist` | pager.js:1263 | Implemented |
| 2786 | `hmenu_doextversion` | pager.js:1243 | Implemented |
| 2792 | `hmenu_dohistory` | pager.js:1248 | Implemented |
| 2804 | `hmenu_dowhatdoes` | - | Missing |
| 2798 | `hmenu_dowhatis` | - | Missing |
| 807 | `ia_checkfile` | - | Missing |
| 614 | `ice_descr` | - | Missing |
| 68 | `is_swallow_sym` | pager.js:1094 | Implemented |
| 1975 | `look_all` | - | Missing |
| 422 | `look_at_monster` | - | Missing |
| 380 | `look_at_object` | pager.js:1125 | Implemented |
| 2140 | `look_engrs` | - | Missing |
| 1962 | `look_region_nearby` | pager.js:1155 | Implemented |
| 2074 | `look_traps` | - | Missing |
| 657 | `lookat` | - | Missing |
| 186 | `mhidden_description` | - | Missing |
| 138 | `monhealthdescr` | pager.js:1103 | Implemented |
| 284 | `object_from_map` | - | Missing |
| 108 | `self_lookat` | - | Missing |
| 2904 | `setopt_cmd` | - | Missing |
| 167 | `trap_description` | pager.js:1111 | Implemented |
| 561 | `waterbody_name` | - | Missing |
| 2454 | `whatdoes_cond` | - | Missing |
| 2417 | `whatdoes_help` | - | Missing |

### pickup.c -> pickup.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2035 | `able_to_loot` | pickup.js:638 | Implemented |
| 475 | `add_valid_menu_class` | pickup.js:214 | Implemented |
| 509 | `all_but_uchain` | pickup.js:245 | Implemented |
| 517 | `allow_all` | pickup.js:250 | Implemented |
| 597 | `allow_cat_no_uchain` | pickup.js:285 | Implemented |
| 523 | `allow_category` | pickup.js:255 | Implemented |
| 975 | `autopick` | pickup.js:autopick | Implemented |
| 930 | `autopick_testobj` | pickup.js:334 | Implemented |
| 2531 | `boh_loss` | pickup.js:713 | Implemented |
| 1570 | `carry_count` | pickup.js:405 | Implemented |
| 913 | `check_autopickup_exceptions` | pickup.js:329 | Implemented |
| 430 | `check_here` | pickup.js:198 | Implemented |
| 3485 | `choose_tip_container_menu` | pickup.js:1019 | Implemented |
| 2714 | `ck_bag` | pickup.js:810 | Implemented |
| 101 | `collect_obj_classes` | pickup.js:1046 | Implemented |
| 2018 | `container_at` | pickup.js:624 | Implemented |
| 2883 | `container_gone` | pickup.js:925 | Implemented |
| 1511 | `count_categories` | pickup.js:361 | Implemented |
| 635 | `count_justpicked` | pickup.js:309 | Implemented |
| 3829 | `count_target_containers` | pickup.js:count_target_containers | Implemented (C #if 0 stub) |
| 337 | `deferred_decor` | pickup.js:191 | Implemented |
| 1544 | `delta_cwt` | pickup.js:382 | Implemented |
| 353 | `describe_decor` | pickup.js:194 | Implemented |
| 2512 | `do_boh_explosion` | pickup.js:697 | Implemented |
| 2082 | `do_loot_cont` | pickup.js:do_loot_cont | Implemented |
| 2160 | `doloot` | pickup.js:handleLoot | APPROX — loot command |
| 2172 | `doloot_core` | pickup.js:doloot_core→handleLoot | Implemented |
| 3542 | `dotip` | pickup.js:1025 | Implemented |
| 1972 | `encumber_msg` | pickup.js:575 | Implemented |
| 2891 | `explain_container_prompt` | pickup.js:931 | Implemented |
| 285 | `fatal_corpse_mistake` | pickup.js:160 | Implemented |
| 648 | `find_justpicked` | pickup.js:319 | Implemented |
| 317 | `force_decor` | pickup.js:188 | Implemented |
| 2552 | `in_container` | pickup.js:726 | Implemented |
| 3377 | `in_or_out_menu` | pickup.js:955 | Implemented |
| 2504 | `is_boh_item_gone` | pickup.js:691 | Implemented |
| 609 | `is_worn_by_type` | pickup.js:294 | Implemented |
| 1705 | `lift_object` | pickup.js:471 | Implemented |
| 2425 | `loot_mon` | pickup.js:loot_mon | Implemented |
| 2482 | `mbag_explodes` | pickup.js:677 | Implemented |
| 2797 | `mbag_item_gone` | pickup.js:872 | Implemented |
| 469 | `menu_class_present` | pickup.js:208 | Implemented |
| 3245 | `menu_loot` | pickup.js:menu_loot | Implemented |
| 2066 | `mon_beside` | pickup.js:663 | Implemented |
| 460 | `n_or_more` | pickup.js:201 | Implemented |
| 2820 | `observe_quantum_cat` | pickup.js:889 | Implemented |
| 2721 | `out_container` | pickup.js:815 | Implemented |
| 1897 | `pick_obj` | pickup.js:503 | Implemented |
| 672 | `pickup` | pickup.js:handlePickup | APPROX — pickup command |
| 1803 | `pickup_object` | pickup.js:523 | Implemented |
| 1942 | `pickup_prinv` | pickup.js:570 | Implemented |
| 1226 | `query_category` | pickup.js:query_category | Implemented |
| 141 | `query_classes` | pickup.js:query_classes | Implemented |
| 1025 | `query_objlist` | pickup.js:query_objlist | Implemented |
| 2775 | `removed_from_icebox` | pickup.js:857 | Implemented |
| 616 | `reset_justpicked` | pickup.js:300 | Implemented |
| 2344 | `reverse_loot` | pickup.js:reverse_loot | Implemented |
| 303 | `rider_corpse_revival` | pickup.js:175 | Implemented |
| 76 | `simple_look` | pickup.js:simple_look | Implemented |
| 2937 | `stash_ok` | pickup.js:946 | Implemented |
| 3461 | `tip_ok` | pickup.js:1010 | Implemented |
| 3668 | `tipcontainer` | pickup.js:1031 | Implemented |
| 3934 | `tipcontainer_checks` | pickup.js:1041 | Implemented |
| 3851 | `tipcontainer_gettarget` | pickup.js:1035 | Implemented |
| 3210 | `traditional_loot` | pickup.js:traditional_loot | Implemented |
| 2923 | `u_handsy` | pickup.js:936 | Implemented |
| 273 | `u_safe_from_fatal_corpse` | pickup.js:151 | Implemented |
| 2952 | `use_container` | pickup.js:use_container→containerMenu | Implemented |

### pline.c -> pline.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 327 | `Norep` | 154 | Aligned |
| 425 | `There` | 195 | Aligned |
| 366 | `You` | 175 | Aligned |
| 339 | `You_buf` | 211 | Aligned |
| 403 | `You_cant` | 187 | Aligned |
| 388 | `You_feel` | 183 | Aligned |
| 436 | `You_hear` | 199 | Aligned |
| 455 | `You_see` | 203 | Aligned |
| 377 | `Your` | 179 | Aligned |
| 299 | `custompline` | 125 | Aligned |
| 52 | `dumplogfreemessages` | 227 | Aligned |
| 22 | `dumplogmsg` | 219 | Aligned |
| 641 | `execplinehandler` | 262 | Aligned |
| 351 | `free_youbuf` | 215 | Aligned (no-op) |
| 495 | `gamelog_add` | 235 | Aligned |
| 531 | `gamelog_add` | 235 | Aligned (single entry point) |
| 584 | `impossible` | 253 | Aligned |
| 514 | `livelog_printf` | 244 | Aligned |
| 538 | `livelog_printf` | 244 | Aligned (single entry point) |
| 690 | `nhassert_failed` | 268 | Aligned |
| 104 | `pline` | 131 | Aligned |
| 414 | `pline_The` | 191 | Aligned |
| 114 | `pline_dir` | 158 | Aligned |
| 138 | `pline_mon` | 168 | Aligned |
| 126 | `pline_xy` | 163 | Aligned |
| 65 | `putmesg` | - | N/A (handled via setOutputContext) |
| 549 | `raw_printf` | 140 | Aligned |
| 84 | `set_msg_dir` | 51 | Aligned |
| 93 | `set_msg_xy` | 55 | Aligned |
| 315 | `urgent_pline` | 150 | Aligned |
| 476 | `verbalize` | 207 | Aligned |
| 153 | `vpline` | 135 | Aligned |
| 563 | `vraw_printf` | 144 | Aligned |

### polyself.c -> polyself.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2175 | `armor_to_dragon` | - | Missing |
| 2127 | `body_part` | - | Missing |
| 1153 | `break_armor` | - | Missing |
| 269 | `change_sex` | - | Missing |
| 168 | `check_strangling` | - | Missing |
| 1405 | `dobreathe` | - | Missing |
| 1626 | `dogaze` | - | Missing |
| 1761 | `dohide` | - | Missing |
| 1878 | `domindblast` | - | Missing |
| 1861 | `dopoly` | - | Missing |
| 1465 | `doremove` | - | Missing |
| 1481 | `dospinweb` | - | Missing |
| 1434 | `dospit` | - | Missing |
| 1608 | `dosummon` | - | Missing |
| 1290 | `drop_weapon` | - | Missing |
| 1119 | `dropp` | - | Missing |
| 131 | `float_vs_flight` | - | Missing |
| 303 | `livelog_newform` | - | Missing |
| 1956 | `mbodypart` | - | Missing |
| 332 | `newman` | - | Missing |
| 2133 | `poly_gender` | - | Missing |
| 200 | `polyman` | - | Missing |
| 731 | `polymon` | - | Missing |
| 465 | `polyself` | - | Missing |
| 2220 | `polysense` | - | Missing |
| 1352 | `rehumanize` | - | Missing |
| 38 | `set_uasmon` | - | Missing |
| 1938 | `skinback` | - | Missing |
| 158 | `steed_vs_stealth` | - | Missing |
| 1073 | `uasmon_maxStr` | - | Missing |
| 2257 | `udeadinside` | - | Missing |
| 2249 | `ugenocided` | - | Missing |
| 2144 | `ugolemeffects` | - | Missing |
| 1925 | `uunstick` | - | Missing |

### potion.c -> potion.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1494 | `H2Opotion_dip` | potion.js:865 | Implemented |
| 1484 | `bottlename` | potion.js:852 | Implemented |
| 2217 | `dip_hands_ok` | potion.js:1269 | Implemented |
| 2365 | `dip_into` | potion.js:1296 | Implemented |
| 2200 | `dip_ok` | potion.js:1261 | Implemented |
| 2403 | `dip_potion_explosion` | potion.js:1313 | Implemented |
| 2801 | `djinni_from_bottle` | potion.js:1437 | Implemented |
| 2253 | `dodip` | potion.js:1287 | Implemented (internal) |
| 526 | `dodrink` | potion.js:389 handleQuaff | Implemented |
| 618 | `dopotion` | potion.js:peffects (inlined) | Implemented (dispatcher at peffects) |
| 505 | `drink_ok` | potion.js:380 | Implemented |
| 481 | `ghost_from_bottle` | potion.js:364 | Implemented |
| 1424 | `healup` | 324 | Full: heal HP, max HP increase, cure blindness, cure sickness |
| 2229 | `hold_potion` | potion.js:1276 | Implemented |
| 1591 | `impact_arti_light` | potion.js:930 | Implemented |
| 83 | `incr_itimeout` | 53 | Full match |
| 56 | `itimeout` | 29 | Full match |
| 68 | `itimeout_incr` | 37 | Full match |
| 261 | `make_blinded` | 133 | Probe-ahead with BBlinded, message paths for regaining/losing sight, Unaware check. Missing: Eyes of Overworld special messages, Blindfolded sub-paths, toggle_blindness vision calls |
| 89 | `make_confused` | 66 | Full: Unaware check, Hallucination-aware message, botl flag |
| 443 | `make_deaf` | 176 | Full match |
| 461 | `make_glib` | 190 | Full match |
| 369 | `make_hallucinated` | 152 | Full: mask parameter for Halluc_resistance toggling, Blind-aware verb, botl flag. Missing: uswallow/mimicking/vision recalc |
| 137 | `make_sick` | 104 | Full: Sick_resistance check, partial cure (clearing one type keeps other with doubled timer), cause tracking, CON exercise. Missing: delayed_killer allocation |
| 195 | `make_slimed` | 193 | Simplified: set/clear with message and botl. Missing: fake appearance handling |
| 222 | `make_stoned` | 200 | Simplified: set/clear with message and botl. Missing: delayed_killer |
| 107 | `make_stunned` | 85 | Full: Unaware check, stagger message, botl flag. Missing: u.usteed wobble |
| 243 | `make_vomiting` | 167 | Full: Unaware check, message on clear, botl flag |
| 2108 | `mixtype` | potion.js:1190 | Implemented |
| 2782 | `mongrantswish` | potion.js:1413 | Implemented |
| 1293 | `peffect_acid` | 510 | Acid_resistance check, damage, exercise |
| 1069 | `peffect_blindness` | 352 | Blessed cure, cursed extension |
| 768 | `peffect_booze` | 560 | Confusion from booze |
| 1010 | `peffect_confusion` | 337 | Blessed cure, cursed extension |
| 792 | `peffect_enlightenment` | potion.js:peffects default case | Stub (enlightenment messages not ported, RNG consumed inline) |
| 1124 | `peffect_extra_healing` | 456 | Heal + max HP, cure hallucination, exercise |
| 1140 | `peffect_full_healing` | 469 | Full heal, cure hallucination, exercise |
| 1026 | `peffect_gain_ability` | 546 | Simplified: random attr +1. Missing: blessed=all attrs, proper adjattrib |
| 1220 | `peffect_gain_energy` | 492 | Energy gain/drain with max increase |
| 1079 | `peffect_gain_level` | 480 | Level gain/loss. pluslvl() now uses newhp()/newpw(). Missing: adjabil() |
| 693 | `peffect_hallucination` | 433 | Blessed cure, cursed extension |
| 1115 | `peffect_healing` | 445 | Heal, cure blindness, exercise |
| 808 | `peffect_invisibility` | 521 | Timed invisibility via incr_itimeout |
| 1161 | `peffect_levitation` | potion.js:1535 | Implemented |
| 910 | `peffect_monster_detection` | potion.js:1502 | Implemented |
| 951 | `peffect_object_detection` | potion.js:1528 | Implemented |
| 1256 | `peffect_oil` | potion.js:peffects default | Stub (oil quaff has no special effect in C either, falls through to "tasted like water") |
| 877 | `peffect_paralysis` | 396 | FREE_ACTION check, confusion-aware message |
| 1314 | `peffect_polymorph` | potion.js:1565 | Implemented |
| 646 | `peffect_restore_ability` | 539 | Stub: no attribute restoration yet |
| 838 | `peffect_see_invisible` | 532 | Timed see_invis via incr_itimeout |
| 960 | `peffect_sickness` | 416 | Blessed cure, cursed illness, uncursed vomiting |
| 897 | `peffect_sleeping` | 380 | FREE_ACTION check, blessed wake, sleep mechanism |
| 1048 | `peffect_speed` | 364 | Speed up with incr_itimeout. Missing: full speed_up() |
| 714 | `peffect_water` | potion.js:peffects default | Implemented (handled by default "tasted like water" case) |
| 1329 | `peffects` | 577 | Dispatcher for 18 potion types |
| 2394 | `poof` | potion.js:1304 | Implemented |
| 2428 | `potion_dip` | potion.js:1331 | Implemented (internal) |
| 1918 | `potionbreathe` | potion.js:1063 | Implemented (internal) |
| 1621 | `potionhit` | potion.js:940 | Implemented (internal) |
| 471 | `self_invis_message` | potion.js:354 | Implemented |
| 75 | `set_itimeout` | 46 | Full match |
| 2905 | `speed_up` | potion.js:338 | Implemented |
| 2859 | `split_mon` | potion.js:1478 | Implemented (internal) |
| 1457 | `strange_feeling` | potion.js:833 | Implemented |
| 336 | `toggle_blindness` | potion.js:make_blinded (inlined) | Stub (vision recalc deferred to mark_vision_dirty) |

### pray.c -> pray.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2507 | `a_gname` | pray.js:2510 | Implemented |
| 2514 | `a_gname_at` | pray.js:2515 | Implemented |
| 2530 | `align_gname` | pray.js:2528 | Implemented |
| 2628 | `align_gtitle` | pray.js:2580 | Implemented |
| 2652 | `altar_wrath` | pray.js:2597 | Implemented |
| 2490 | `altarmask_at` | pray.js:2488 | Implemented |
| 704 | `angrygods` | pray.js:1136 | Implemented |
| 788 | `at_your_feet` | pray.js:1214 | Implemented |
| 1781 | `bestow_artifact` | pray.js:1957 | Implemented |
| 2677 | `blocked_boulder` | pray.js:665 | Implemented |
| 2124 | `can_pray` | pray.js:2216 | Implemented |
| 1446 | `consume_offering` | pray.js:1691 | Implemented |
| 116 | `critically_low_hp` | pray.js:639 | Implemented |
| 1501 | `desecrate_altar` | pray.js:1734 | Implemented |
| 2199 | `dopray` | pray.js:2288 | Implemented |
| 1854 | `dosacrifice` | pray.js:2011 | Implemented |
| 2414 | `doturn` | pray.js:2432 | Implemented |
| 1899 | `eval_offering` | pray.js:2061 | Implemented |
| 349 | `fix_curse_trouble` | pray.js:848 | Implemented |
| 373 | `fix_worst_trouble` | pray.js:871 | Implemented |
| 694 | `fry_by_god` | pray.js:1126 | Implemented |
| 805 | `gcrownu` | pray.js:1231 | Implemented |
| 999 | `give_spell` | pray.js:1374 | Implemented |
| 610 | `god_zaps_you` | pray.js:1063 | Implemented |
| 1429 | `gods_angry` | pray.js:1673 | Implemented |
| 1436 | `gods_upset` | pray.js:1681 | Implemented |
| 1415 | `godvoice` | pray.js:1659 | Implemented |
| 2577 | `halu_gname` | pray.js:2548 | Implemented |
| 198 | `in_trouble` | pray.js:723 | Implemented |
| 2347 | `maybe_turn_mon_iter` | pray.js:2383 | Implemented |
| 1959 | `offer_corpse` | pray.js:2095 | Implemented |
| 1631 | `offer_different_alignment_altar` | pray.js:1830 | Implemented |
| 1602 | `offer_fake_amulet` | pray.js:1806 | Implemented |
| 1592 | `offer_negative_valued` | pray.js:1795 | Implemented |
| 1529 | `offer_real_amulet` | pray.js:1750 | Implemented |
| 1480 | `offer_too_soon` | pray.js:1719 | Implemented |
| 1071 | `pleased` | pray.js:1418 | Implemented |
| 2177 | `pray_revive` | pray.js:2266 | Implemented |
| 2276 | `prayer_done` | pray.js:2315 | Implemented |
| 1839 | `sacrifice_value` | pray.js:1996 | Implemented |
| 1698 | `sacrifice_your_race` | pray.js:1887 | Implemented |
| 161 | `stuck_in_wall` | pray.js:696 | Implemented |
| 2524 | `u_gname` | pray.js:2523 | Implemented |
| 1387 | `water_prayer` | pray.js:1629 | Implemented |
| 288 | `worst_cursed_item` | pray.js:796 | Implemented |

### priest.c -> priest.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 841 | `angry_priest` | - | Missing |
| 883 | `clearpriests` | - | Missing |
| 392 | `findpriest` | - | Missing |
| 545 | `forget_temple_entry` | - | Missing |
| 28 | `free_epri` | - | Missing |
| 760 | `ghod_hitsu` | - | Missing |
| 376 | `has_shrine` | - | Missing |
| 153 | `histemple_at` | - | Missing |
| 735 | `in_your_sanctuary` | - | Missing |
| 161 | `inhistemple` | - | Missing |
| 410 | `intemple` | - | Missing |
| 688 | `mk_roamer` | - | Missing |
| 280 | `mon_aligntyp` | - | Missing |
| 42 | `move_special` | - | Missing |
| 16 | `newepri` | - | Missing |
| 370 | `p_coaligned` | - | Missing |
| 177 | `pri_move` | - | Missing |
| 558 | `priest_talk` | - | Missing |
| 220 | `priestini` | - | Missing |
| 302 | `priestname` | - | Missing |
| 719 | `reset_hostility` | - | Missing |
| 897 | `restpriest` | - | Missing |
| 142 | `temple_occupied` | - | Missing |

### quest.c -> quest.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 125 | `artitouch` | - | Missing |
| 427 | `chat_with_guardian` | - | Missing |
| 282 | `chat_with_leader` | - | Missing |
| 380 | `chat_with_nemesis` | - | Missing |
| 186 | `expulsion` | - | Missing |
| 226 | `finish_quest` | - | Missing |
| 153 | `is_pure` | - | Missing |
| 116 | `leaddead` | - | Missing |
| 357 | `leader_speaks` | - | Missing |
| 107 | `nemdead` | - | Missing |
| 389 | `nemesis_speaks` | - | Missing |
| 412 | `nemesis_stinks` | - | Missing |
| 147 | `not_capable` | - | Missing |
| 140 | `ok_to_quest` | - | Missing |
| 62 | `on_goal` | - | Missing |
| 40 | `on_locate` | - | Missing |
| 26 | `on_start` | - | Missing |
| 90 | `onquest` | - | Missing |
| 437 | `prisoner_speaks` | - | Missing |
| 459 | `quest_chat` | - | Missing |
| 500 | `quest_stat_check` | - | Missing |
| 481 | `quest_talk` | - | Missing |

### questpgr.c -> questpgr.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 624 | `com_pager` | - | Missing |
| 468 | `com_pager_core` | - | Missing |
| 236 | `convert_arg` | - | Missing |
| 328 | `convert_line` | - | Missing |
| 423 | `deliver_by_pline` | - | Missing |
| 439 | `deliver_by_window` | - | Missing |
| 655 | `deliver_splev_message` | - | Missing |
| 73 | `find_qarti` | - | Missing |
| 89 | `find_quest_artifact` | - | Missing |
| 134 | `guardname` | - | Missing |
| 142 | `homebase` | - | Missing |
| 61 | `intermed` | - | Missing |
| 67 | `is_quest_artifact` | - | Missing |
| 50 | `ldrname` | - | Missing |
| 124 | `neminame` | - | Missing |
| 637 | `qt_montype` | - | Missing |
| 630 | `qt_pager` | - | Missing |
| 199 | `qtext_pronoun` | - | Missing |
| 459 | `skip_pager` | - | Missing |
| 150 | `stinky_nemesis` | - | Missing |

### read.c -> read.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 253 | `apron_text` | read.js:248 | Implemented |
| 303 | `assign_candy_wrapper` | read.js:270 | Implemented |
| 1079 | `can_center_cloud` | read.js:1619 | Implemented |
| 295 | `candy_wrapper_text` | read.js:265 | Implemented |
| 3059 | `cant_revive` | read.js:cant_revive | Implemented |
| 79 | `cap_spe` | read.js:275 | Implemented |
| 688 | `charge_ok` | read.js:1513 | Implemented |
| 3319 | `create_particular` | read.js:1644 | Implemented |
| 3199 | `create_particular_creation` | read.js:create_particular_creation | Implemented (wizard mode stub) |
| 3084 | `create_particular_parse` | read.js:create_particular_parse | Implemented (wizard mode stub) |
| 1087 | `display_stinking_cloud_positions` | read.js:1625 | Implemented |
| 2585 | `do_class_genocide` | read.js:do_class_genocide | Implemented (stub) |
| 2773 | `do_genocide` | read.js:do_genocide | Implemented (stub) |
| 3029 | `do_stinking_cloud` | read.js:do_stinking_cloud | Implemented |
| 329 | `doread` | read.js:73 | Implemented (handleRead: inventory selection + spellbook study + seffects dispatch) |
| 2288 | `drop_boulder_on_monster` | read.js:1549 | Implemented |
| 2241 | `drop_boulder_on_player` | read.js:drop_boulder_on_player | Implemented |
| 88 | `erode_obj_text` | read.js:111 | Implemented |
| 1019 | `forget` | read.js:936 | Partial (inline in seffect_amnesia; forgets spells only, no map forget) |
| 223 | `hawaiian_design` | read.js:228 | Implemented |
| 189 | `hawaiian_motif` | read.js:215 | Implemented |
| 69 | `learnscroll` | read.js:1506 | Implemented |
| 57 | `learnscrolltyp` | read.js:270 | Implemented (wraps discoverObject) |
| 2438 | `litroom` | read.js:642 | Implemented |
| 1043 | `maybe_tame` | read.js:1226 | Implemented |
| 666 | `p_glow1` | read.js:88 | Implemented |
| 672 | `p_glow2` | read.js:94 | Implemented |
| 679 | `p_glow3` | read.js:100 | Implemented |
| 2966 | `punish` | read.js:punish | Implemented |
| 314 | `read_ok` | read.js:77 | Implemented |
| 728 | `recharge` | read.js:recharge | Implemented |
| 1777 | `seffect_amnesia` | read.js:936 | Implemented (forgets spells; rn2 message; exercise(A_WIS,false)) |
| 1952 | `seffect_blank_paper` | read.js:317 | Implemented |
| 1735 | `seffect_charging` | read.js:388 | Partial (confused path faithful; non-confused: no getobj/recharge yet) |
| 1348 | `seffect_confuse_monster` | read.js:469 | Implemented (faithful RNG: rnd(100), rnd(2), rn1(8,2); umconf tracking) |
| 1557 | `seffect_create_monster` | read.js:839 | Implemented (faithful RNG: rn2(73)+rnd(4); uses makemon; confused=acid blob) |
| 1285 | `seffect_destroy_armor` | read.js:789 | Implemented (confused erodeproof; normal destroy_arm; cursed degrade+stun) |
| 1866 | `seffect_earth` | read.js:1043 | Approximate (messages match; no boulder drop_boulder_on_monster/player yet) |
| 1114 | `seffect_enchant_armor` | read.js:686 | Implemented (faithful: evaporation check, enchant calc, vibration warning) |
| 1576 | `seffect_enchant_weapon` | read.js:606 | Implemented (faithful: confused erodeproof; chwepon RNG: rn2(spe), rnd(3-spe/3)) |
| 1797 | `seffect_fire` | read.js:1007 | Partial (faithful RNG: rn1(3,3)+bcsign; no explode() area effect yet) |
| 1993 | `seffect_food_detection` | read.js:901 | Stub (message only; needs food_detect infrastructure) |
| 1669 | `seffect_genocide` | read.js:993 | Stub (messages only; needs do_genocide/do_class_genocide prompts) |
| 1982 | `seffect_gold_detection` | read.js:884 | Stub (message only; needs gold_detect/trap_detect infrastructure) |
| 2002 | `seffect_identify` | read.js:326 | Implemented (faithful RNG: rn2(5) blessed check + cval; identify_pack inline) |
| 1688 | `seffect_light` | read.js:425 | Partial (confused: faithful rn1(2,3)+makemon lights; non-confused: no litroom yet) |
| 2049 | `seffect_magic_mapping` | read.js:909 | Approximate (messages match; no do_mapping() level reveal yet) |
| 2104 | `seffect_mail` | read.js:seffect_mail | Implemented |
| 1923 | `seffect_punishment` | read.js:1063 | Partial (confused/blessed "guilty" faithful; no punish() ball-and-chain yet) |
| 1438 | `seffect_remove_curse` | read.js:556 | Implemented (faithful: inventory iteration, blessorcurse(2) for confused, uncurse worn) |
| 1403 | `seffect_scare_monster` | read.js:515 | Implemented (faithful: resist() per monster, monflee, cansee check, ct counting) |
| 1938 | `seffect_stinking_cloud` | read.js:1078 | Stub (message only; needs do_stinking_cloud positioning) |
| 1626 | `seffect_taming` | read.js:960 | Approximate (simplified: no resist/maybe_tame, just sets tame flag in radius) |
| 1962 | `seffect_teleportation` | read.js:867 | Stub (messages only; needs scrolltele/level_tele infrastructure) |
| 2141 | `seffects` | read.js:1097 | Implemented (full dispatch to all 22 scroll types; exercise(A_WIS) for magic scrolls) |
| 2418 | `set_lit` | read.js:1596 | Implemented |
| 651 | `stripspe` | read.js:63 | Implemented |
| 99 | `tshirt_text` | read.js:202 | Implemented |
| 3013 | `unpunish` | read.js:1611 | Implemented |
| 1068 | `valid_cloud_pos` | read.js:1543 | Implemented |
| 2361 | `wand_explode` | read.js:wand_explode | Implemented |

### rect.c -> rect.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 161 | `add_rect` | - | Missing |
| 45 | `free_rect` | - | Missing |
| 82 | `get_rect` | - | Missing |
| 60 | `get_rect_ind` | - | Missing |
| 29 | `init_rect` | - | Missing |
| 116 | `intersect` | - | Missing |
| 134 | `rect_bounds` | - | Missing |
| 147 | `remove_rect` | - | Missing |
| 104 | `rnd_rect` | - | Missing |
| 182 | `split_rects` | - | Missing |

### region.c -> region.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 161 | `add_mon_to_reg` | - | Missing |
| 133 | `add_rect_to_reg` | - | Missing |
| 284 | `add_region` | - | Missing |
| 660 | `any_visible_region` | - | Missing |
| 394 | `clear_regions` | - | Missing |
| 227 | `clone_region` | - | Missing |
| 1003 | `create_force_field` | - | Missing |
| 1213 | `create_gas_cloud` | - | Missing |
| 1313 | `create_gas_cloud_selection` | - | Missing |
| 955 | `create_msg_region` | - | Missing |
| 79 | `create_region` | - | Missing |
| 983 | `enter_force_field` | - | Missing |
| 1046 | `expire_gas_cloud` | - | Missing |
| 263 | `free_region` | - | Missing |
| 480 | `in_out_region` | - | Missing |
| 1091 | `inside_gas_cloud` | - | Missing |
| 54 | `inside_rect` | - | Missing |
| 63 | `inside_region` | - | Missing |
| 1168 | `is_hero_inside_gas_cloud` | - | Missing |
| 533 | `m_in_out_region` | - | Missing |
| 1182 | `make_gas_cloud` | - | Missing |
| 210 | `mon_in_region` | - | Missing |
| 651 | `reg_damg` | - | Missing |
| 1341 | `region_danger` | - | Missing |
| 1368 | `region_safety` | - | Missing |
| 899 | `region_stats` | - | Missing |
| 192 | `remove_mon_from_reg` | - | Missing |
| 638 | `remove_mon_from_regions` | - | Missing |
| 344 | `remove_region` | - | Missing |
| 622 | `replace_mon_regions` | - | Missing |
| 928 | `reset_region_mids` | - | Missing |
| 799 | `rest_regions` | - | Missing |
| 414 | `run_regions` | - | Missing |
| 741 | `save_regions` | - | Missing |
| 732 | `show_region` | - | Missing |
| 598 | `update_monster_region` | - | Missing |
| 582 | `update_player_regions` | - | Missing |
| 718 | `visible_region_at` | - | Missing |
| 674 | `visible_region_summary` | - | Missing |

### report.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 529 | `NH_panictrace_gdb` | - | Missing |
| 485 | `NH_panictrace_libc` | - | Missing |
| 189 | `crashreport_bidshow` | - | Missing |
| 113 | `crashreport_init` | - | Missing |
| 461 | `dobugreport` | - | Missing |
| 571 | `get_saved_pline` | - | Missing |
| 600 | `panictrace_handler` | - | Missing |
| 625 | `panictrace_setsignals` | - | Missing |
| 290 | `submit_web_report` | - | Missing |
| 237 | `swr_add_uricoded` | - | Missing |

### restore.c -> restore.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1430 | `add_id_mapping` | - | Missing |
| 1417 | `clear_id_mapping` | - | Missing |
| 781 | `dorecover` | - | Missing |
| 71 | `find_lev_obj` | - | Missing |
| 484 | `freefruitchn` | - | Missing |
| 1308 | `get_plname_from_file` | - | Missing |
| 1038 | `getlev` | - | Missing |
| 497 | `ghostfruit` | - | Missing |
| 113 | `inven_inuse` | - | Missing |
| 465 | `loadfruitchn` | - | Missing |
| 1454 | `lookup_id_mapping` | - | Missing |
| 1480 | `reset_oattached_mids` | - | Missing |
| 1339 | `rest_bubbles` | - | Missing |
| 1013 | `rest_levl` | - | Missing |
| 947 | `rest_stairs` | - | Missing |
| 980 | `restcemetery` | - | Missing |
| 153 | `restdamage` | - | Missing |
| 522 | `restgamestate` | - | Missing |
| 130 | `restlevchn` | - | Missing |
| 747 | `restlevelfile` | - | Missing |
| 734 | `restlevelstate` | - | Missing |
| 307 | `restmon` | - | Missing |
| 373 | `restmonchn` | - | Missing |
| 183 | `restobj` | - | Missing |
| 231 | `restobjchn` | - | Missing |
| 1360 | `restore_gamelog` | - | Missing |
| 1506 | `restore_menu` | - | Missing |
| 1385 | `restore_msghistory` | - | Missing |
| 1027 | `trickery` | - | Missing |

### rip.c -> display.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 75 | `center` | rip.js:center | Implemented |
| 85 | `genl_outrip` | rip.js:genl_outrip | Implemented |

### rnd.c -> rng.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 207 | `RND` | - | Missing |
| 338 | `d` | - | Missing |
| 189 | `init_isaac64` | - | Missing |
| 465 | `init_random` | - | Missing |
| 103 | `midlog_enter` | - | Missing |
| 114 | `midlog_exit_int` | - | Missing |
| 140 | `midlog_exit_ptr` | - | Missing |
| 127 | `midlog_exit_void` | - | Missing |
| 472 | `reseed_random` | - | Missing |
| 241 | `rn2` | - | Missing |
| 216 | `rn2_on_display_rng` | - | Missing |
| 231 | `rn2_on_display_rng` | - | Missing |
| 312 | `rnd` | - | Missing |
| 331 | `rnd_on_display_rng` | - | Missing |
| 361 | `rne` | - | Missing |
| 56 | `rng_log_get_call_count` | - | Missing |
| 37 | `rng_log_init` | - | Missing |
| 48 | `rng_log_set_caller` | - | Missing |
| 62 | `rng_log_write` | - | Missing |
| 262 | `rnl` | - | Missing |
| 390 | `rnz` | - | Missing |
| 418 | `set_random` | - | Missing |
| 428 | `set_random` | - | Missing |
| 482 | `shuffle_int_array` | - | Missing |
| 178 | `whichrng` | - | Missing |

### role.c -> role.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 2143 | `Goodbye` | role.js:433 | Implemented |
| 2120 | `Hello` | role.js:413 | Implemented |
| 1583 | `build_plselection_prompt` | role.js:1278 | Implemented |
| 2163 | `character_race` | role.js:1505 | Implemented |
| 1358 | `clearrolefilter` | role.js:1103 | Implemented |
| 2177 | `genl_player_selection` | role.js:1602 | Implemented |
| 2206 | `genl_player_setup` | role.js:1546 | Implemented (stub — chargen.js handles UI) |
| 3017 | `genl_player_setup` | role.js:1546 | Implemented (stub — non-TTY variant) |
| 1303 | `gotrolefilter` | role.js:1050 | Implemented |
| 2777 | `maybe_skip_seps` | role.js:1532 | Implemented |
| 1172 | `ok_align` | role.js:879 | Implemented |
| 1107 | `ok_gend` | role.js:848 | Implemented |
| 1037 | `ok_race` | role.js:807 | Implemented |
| 971 | `ok_role` | role.js:767 | Implemented |
| 1211 | `pick_align` | role.js:981 | Implemented |
| 1146 | `pick_gend` | role.js:961 | Implemented |
| 1081 | `pick_race` | role.js:940 | Implemented |
| 1015 | `pick_role` | role.js:924 | Implemented |
| 1665 | `plnamesuffix` | role.js:1390 | Implemented (stub — JS uses chargen.js promptPlayerName) |
| 2806 | `plsel_startmenu` | role.js:1541 | Implemented |
| 1384 | `promptsep` | role.js:1135 | Implemented |
| 1415 | `race_alignmentcount` | role.js:1163 | Implemented |
| 916 | `randalign` | role.js:726 | Implemented |
| 853 | `randgend` | role.js:682 | Implemented |
| 787 | `randrace` | role.js:635 | Implemented |
| 719 | `randrole` | role.js:582 | Implemented |
| 731 | `randrole_filtered` | role.js:593 | Implemented |
| 2728 | `reset_role_filtering` | role.js:1525 | Implemented |
| 1235 | `rigid_role_checks` | role.js:1008 | Implemented |
| 1399 | `role_gendercount` | role.js:1150 | Implemented |
| 1980 | `role_init` | role.js:1539 | Implemented (stub — logic split across chargen.js/dungeon.js/u_init.js) |
| 1816 | `role_menu_extra` | role.js:1435 | Implemented |
| 1726 | `role_selection_prolog` | role.js:1359 | Implemented |
| 1318 | `rolefilterstring` | role.js:1065 | Implemented |
| 1431 | `root_plselection_prompt` | role.js:1176 | Implemented |
| 1284 | `setrolefilter` | role.js:1030 | Implemented |
| 2979 | `setup_algnmenu` | role.js:1587 | Implemented |
| 2943 | `setup_gendmenu` | role.js:1576 | Implemented |
| 2905 | `setup_racemenu` | role.js:1565 | Implemented |
| 2854 | `setup_rolemenu` | role.js:1550 | Implemented |
| 943 | `str2align` | role.js:747 | Implemented |
| 880 | `str2gend` | role.js:702 | Implemented |
| 813 | `str2race` | role.js:655 | Implemented |
| 747 | `str2role` | role.js:609 | Implemented |
| 907 | `validalign` | role.js:719 | Implemented |
| 844 | `validgend` | role.js:675 | Implemented |
| 778 | `validrace` | role.js:628 | Implemented |
| 713 | `validrole` | role.js:575 | Implemented |

### rumors.c -> rumors.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 791 | `CapitalMon` | - | Missing |
| 770 | `couldnt_open_file` | - | Missing |
| 696 | `doconsult` | - | Missing |
| 939 | `free_CapMons` | - | Missing |
| 420 | `get_rnd_line` | - | Missing |
| 499 | `get_rnd_text` | - | Missing |
| 117 | `getrumor` | - | Missing |
| 829 | `init_CapMons` | - | Missing |
| 577 | `init_oracles` | - | Missing |
| 85 | `init_rumors` | - | Missing |
| 308 | `others_check` | - | Missing |
| 640 | `outoracle` | - | Missing |
| 529 | `outrumor` | - | Missing |
| 623 | `restore_oracles` | - | Missing |
| 196 | `rumor_check` | - | Missing |
| 598 | `save_oracles` | - | Missing |
| 67 | `unpadline` | - | Missing |

### save.c -> save.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 74 | `dosave0` | - | Missing |
| 1038 | `free_dungeons` | - | Missing |
| 1055 | `freedynamicdata` | - | Missing |
| 679 | `save_bc` | - | Missing |
| 574 | `save_bubbles` | - | Missing |
| 237 | `save_gamelog` | - | Missing |
| 1008 | `save_msghistory` | - | Missing |
| 648 | `save_stairs` | - | Missing |
| 600 | `savecemetery` | - | Missing |
| 623 | `savedamage` | - | Missing |
| 929 | `savefruitchn` | - | Missing |
| 265 | `savegamestate` | - | Missing |
| 421 | `savelev` | - | Missing |
| 444 | `savelev_core` | - | Missing |
| 952 | `savelevchn` | - | Missing |
| 560 | `savelevl` | - | Missing |
| 809 | `savemon` | - | Missing |
| 862 | `savemonchn` | - | Missing |
| 709 | `saveobj` | - | Missing |
| 745 | `saveobjchn` | - | Missing |
| 343 | `savestateinlock` | - | Missing |
| 898 | `savetrapchn` | - | Missing |
| 977 | `store_plname_in_file` | - | Missing |
| 329 | `tricked_fileremoved` | - | Missing |

### selvar.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 542 | `line_dist_coord` | - | Missing |
| 379 | `sel_flood_havepoint` | - | Missing |
| 48 | `selection_clear` | - | Missing |
| 65 | `selection_clone` | - | Missing |
| 456 | `selection_do_ellipse` | - | Missing |
| 570 | `selection_do_gradient` | - | Missing |
| 321 | `selection_do_grow` | - | Missing |
| 626 | `selection_do_line` | - | Missing |
| 683 | `selection_do_randline` | - | Missing |
| 248 | `selection_filter_mapchar` | - | Missing |
| 224 | `selection_filter_percent` | - | Missing |
| 395 | `selection_floodfill` | - | Missing |
| 802 | `selection_force_newsyms` | - | Missing |
| 33 | `selection_free` | - | Missing |
| 781 | `selection_from_mkroom` | - | Missing |
| 77 | `selection_getbounds` | - | Missing |
| 168 | `selection_getpoint` | - | Missing |
| 747 | `selection_is_irregular` | - | Missing |
| 726 | `selection_iterate` | - | Missing |
| 15 | `selection_new` | - | Missing |
| 211 | `selection_not` | - | Missing |
| 99 | `selection_recalc_bounds` | - | Missing |
| 284 | `selection_rndcoord` | - | Missing |
| 181 | `selection_setpoint` | - | Missing |
| 764 | `selection_size_description` | - | Missing |
| 372 | `set_selection_floodfillchk` | - | Missing |

### sfbase.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 246 | `SF_X` | - | Missing |
| 617 | `bitfield_dump` | - | Missing |
| 625 | `complex_dump` | - | Missing |
| 792 | `norm_ptrs_achievement_tracking` | - | Missing |
| 752 | `norm_ptrs_align` | - | Missing |
| 748 | `norm_ptrs_any` | - | Missing |
| 757 | `norm_ptrs_arti_info` | - | Missing |
| 762 | `norm_ptrs_attribs` | - | Missing |
| 767 | `norm_ptrs_bill_x` | - | Missing |
| 797 | `norm_ptrs_book_info` | - | Missing |
| 772 | `norm_ptrs_branch` | - | Missing |
| 777 | `norm_ptrs_bubble` | - | Missing |
| 782 | `norm_ptrs_cemetery` | - | Missing |
| 787 | `norm_ptrs_context_info` | - | Missing |
| 847 | `norm_ptrs_d_flags` | - | Missing |
| 852 | `norm_ptrs_d_level` | - | Missing |
| 857 | `norm_ptrs_damage` | - | Missing |
| 862 | `norm_ptrs_dest_area` | - | Missing |
| 867 | `norm_ptrs_dgn_topology` | - | Missing |
| 802 | `norm_ptrs_dig_info` | - | Missing |
| 872 | `norm_ptrs_dungeon` | - | Missing |
| 877 | `norm_ptrs_ebones` | - | Missing |
| 882 | `norm_ptrs_edog` | - | Missing |
| 887 | `norm_ptrs_egd` | - | Missing |
| 892 | `norm_ptrs_emin` | - | Missing |
| 897 | `norm_ptrs_engr` | - | Missing |
| 807 | `norm_ptrs_engrave_info` | - | Missing |
| 902 | `norm_ptrs_epri` | - | Missing |
| 907 | `norm_ptrs_eshk` | - | Missing |
| 912 | `norm_ptrs_fakecorridor` | - | Missing |
| 917 | `norm_ptrs_fe` | - | Missing |
| 922 | `norm_ptrs_flag` | - | Missing |
| 927 | `norm_ptrs_fruit` | - | Missing |
| 932 | `norm_ptrs_gamelog_line` | - | Missing |
| 937 | `norm_ptrs_kinfo` | - | Missing |
| 942 | `norm_ptrs_levelflags` | - | Missing |
| 947 | `norm_ptrs_linfo` | - | Missing |
| 952 | `norm_ptrs_ls_t` | - | Missing |
| 972 | `norm_ptrs_mapseen` | - | Missing |
| 957 | `norm_ptrs_mapseen_feat` | - | Missing |
| 962 | `norm_ptrs_mapseen_flags` | - | Missing |
| 967 | `norm_ptrs_mapseen_rooms` | - | Missing |
| 977 | `norm_ptrs_mextra` | - | Missing |
| 982 | `norm_ptrs_mkroom` | - | Missing |
| 987 | `norm_ptrs_monst` | - | Missing |
| 992 | `norm_ptrs_mvitals` | - | Missing |
| 997 | `norm_ptrs_nhcoord` | - | Missing |
| 1002 | `norm_ptrs_nhrect` | - | Missing |
| 1007 | `norm_ptrs_novel_tracking` | - | Missing |
| 1012 | `norm_ptrs_obj` | - | Missing |
| 812 | `norm_ptrs_obj_split` | - | Missing |
| 1017 | `norm_ptrs_objclass` | - | Missing |
| 1022 | `norm_ptrs_oextra` | - | Missing |
| 817 | `norm_ptrs_polearm_info` | - | Missing |
| 1027 | `norm_ptrs_prop` | - | Missing |
| 1032 | `norm_ptrs_q_score` | - | Missing |
| 1037 | `norm_ptrs_rm` | - | Missing |
| 1042 | `norm_ptrs_s_level` | - | Missing |
| 1047 | `norm_ptrs_skills` | - | Missing |
| 1052 | `norm_ptrs_spell` | - | Missing |
| 1057 | `norm_ptrs_stairway` | - | Missing |
| 822 | `norm_ptrs_takeoff_info` | - | Missing |
| 827 | `norm_ptrs_tin_info` | - | Missing |
| 1062 | `norm_ptrs_trap` | - | Missing |
| 832 | `norm_ptrs_tribute_info` | - | Missing |
| 1067 | `norm_ptrs_u_conduct` | - | Missing |
| 1072 | `norm_ptrs_u_event` | - | Missing |
| 1077 | `norm_ptrs_u_have` | - | Missing |
| 1082 | `norm_ptrs_u_realtime` | - | Missing |
| 1087 | `norm_ptrs_u_roleplay` | - | Missing |
| 1092 | `norm_ptrs_version_info` | - | Missing |
| 837 | `norm_ptrs_victual_info` | - | Missing |
| 1097 | `norm_ptrs_vlaunchinfo` | - | Missing |
| 1102 | `norm_ptrs_vptrs` | - | Missing |
| 842 | `norm_ptrs_warntype_info` | - | Missing |
| 1107 | `norm_ptrs_you` | - | Missing |
| 647 | `sf_init` | - | Missing |
| 377 | `sf_log` | - | Missing |
| 664 | `sf_setflprocs` | - | Missing |
| 658 | `sf_setprocs` | - | Missing |
| 265 | `sfi_char` | - | Missing |
| 306 | `sfi_genericptr` | - | Missing |
| 348 | `sfi_version_info` | - | Missing |
| 290 | `sfo_genericptr` | - | Missing |
| 330 | `sfo_version_info` | - | Missing |
| 449 | `sfvalue_any` | - | Missing |
| 608 | `sfvalue_bitfield` | - | Missing |
| 460 | `sfvalue_genericptr` | - | Missing |

### sfstruct.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 100 | `SF_C` | - | Missing |
| 147 | `SF_X` | - | Missing |
| 447 | `bclose` | - | Missing |
| 478 | `bflush` | - | Missing |
| 436 | `bufoff` | - | Missing |
| 415 | `bufon` | - | Missing |
| 494 | `bwrite` | - | Missing |
| 404 | `close_check` | - | Missing |
| 384 | `getidx` | - | Missing |
| 113 | `historical_sfi_char` | - | Missing |
| 136 | `historical_sfi_genericptr_t` | - | Missing |
| 130 | `historical_sfo_genericptr_t` | - | Missing |
| 603 | `logging_finish` | - | Missing |
| 549 | `mread` | - | Missing |
| 596 | `sfstruct_read_error` | - | Missing |

### shk.c -> shk.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 5812 | `Shk_Your` | - | Missing |
| 4334 | `add_damage` | - | Missing |
| 3250 | `add_one_tobill` | - | Missing |
| 3306 | `add_to_billobjs` | - | Missing |
| 3430 | `addtobill` | - | Missing |
| 437 | `addupbill` | - | Missing |
| 4932 | `after_shk_move` | - | Missing |
| 3178 | `alter_cost` | - | Missing |
| 1272 | `angry_shk_exists` | - | Missing |
| 3539 | `append_honorific` | - | Missing |
| 3327 | `bill_box_content` | - | Missing |
| 3391 | `billable` | - | Missing |
| 5726 | `block_door` | - | Missing |
| 5761 | `block_entry` | - | Missing |
| 2700 | `bp_to_obj` | - | Missing |
| 2250 | `buy_container` | - | Missing |
| 5843 | `cad` | - | Missing |
| 451 | `call_kops` | - | Missing |
| 1463 | `cheapest_item` | - | Missing |
| 1219 | `check_credit` | - | Missing |
| 5674 | `check_unpaid` | - | Missing |
| 5623 | `check_unpaid_usage` | - | Missing |
| 377 | `clear_no_charge` | - | Missing |
| 329 | `clear_no_charge_obj` | - | Missing |
| 389 | `clear_no_charge_pets` | - | Missing |
| 319 | `clear_unpaid` | - | Missing |
| 309 | `clear_unpaid_obj` | - | Missing |
| 2936 | `contained_cost` | - | Missing |
| 2987 | `contained_gold` | - | Missing |
| 4210 | `corpsenm_price_adj` | - | Missing |
| 5562 | `cost_per_charge` | - | Missing |
| 5304 | `costly_adjacent` | - | Missing |
| 5680 | `costly_gold` | - | Missing |
| 5285 | `costly_spot` | - | Missing |
| 569 | `credit_report` | - | Missing |
| 1116 | `delete_contents` | - | Missing |
| 664 | `deserted_shop` | - | Missing |
| 4465 | `discard_damage_owned_by` | - | Missing |
| 4444 | `discard_damage_struct` | - | Missing |
| 4132 | `doinvbill` | - | Missing |
| 3814 | `donate_gold` | - | Missing |
| 1684 | `dopay` | pickup.js:handlePay | STUB — pay command placeholder |
| 2161 | `dopayobj` | - | Missing |
| 3005 | `dropped_container` | - | Missing |
| 4426 | `find_damage` | - | Missing |
| 1025 | `find_objowner` | - | Missing |
| 2718 | `find_oid` | - | Missing |
| 2664 | `finish_paybill` | - | Missing |
| 4785 | `fix_shop_damage` | - | Missing |
| 3139 | `gem_learned` | - | Missing |
| 2818 | `get_cost` | shk.js:getCost | APPROX — item cost calculation |
| 2750 | `get_cost_of_shop_item` | - | Missing |
| 2787 | `get_pricing_units` | - | Missing |
| 5073 | `getcad` | - | Missing |
| 4254 | `getprice` | shk.js:getprice | APPROX — base price lookup |
| 5911 | `globby_bill_fixup` | - | Missing |
| 1258 | `home_shk` | - | Missing |
| 1390 | `hot_pursuit` | - | Missing |
| 2518 | `inherits` | - | Missing |
| 980 | `inhishop` | - | Missing |
| 509 | `inside_shop` | shk.js:insideShop | APPROX — shop boundary check |
| 2396 | `insufficient_funds` | - | Missing |
| 4947 | `is_fshk` | - | Missing |
| 1108 | `is_unpaid` | - | Missing |
| 5541 | `kops_gone` | - | Missing |
| 4526 | `litter_getpos` | - | Missing |
| 4647 | `litter_newsyms` | - | Missing |
| 4557 | `litter_scatter` | - | Missing |
| 1411 | `make_angry_shk` | - | Missing |
| 1336 | `make_happy_shk` | - | Missing |
| 1381 | `make_happy_shoppers` | - | Missing |
| 1486 | `make_itemized_bill` | - | Missing |
| 5048 | `makekops` | - | Missing |
| 1609 | `menu_pick_pay_items` | - | Missing |
| 5835 | `mon_owns` | - | Missing |
| 157 | `money2mon` | - | Missing |
| 186 | `money2u` | - | Missing |
| 215 | `next_shkp` | - | Missing |
| 1067 | `noisy_shop` | - | Missing |
| 1128 | `obfree` | - | Missing |
| 2805 | `oid_price_adjustment` | - | Missing |
| 1077 | `onbill` | - | Missing |
| 1101 | `onshopbill` | - | Missing |
| 1285 | `pacify_shk` | - | Missing |
| 1238 | `pay` | - | Missing |
| 1986 | `pay_billed_items` | - | Missing |
| 5109 | `pay_for_damage` | - | Missing |
| 2426 | `paybill` | - | Missing |
| 862 | `pick_pick` | - | Missing |
| 3026 | `picked_container` | - | Missing |
| 5341 | `price_quote` | - | Missing |
| 2360 | `reject_purchase` | - | Missing |
| 606 | `remote_burglary` | - | Missing |
| 4667 | `repair_damage` | - | Missing |
| 4387 | `repairable_damage` | - | Missing |
| 280 | `replshk` | - | Missing |
| 290 | `restshk` | - | Missing |
| 1303 | `rile_shk` | - | Missing |
| 628 | `rob_shop` | - | Missing |
| 1322 | `rouse_shk` | - | Missing |
| 896 | `same_price` | - | Missing |
| 5880 | `sasc_bug` | - | Missing |
| 3864 | `sellobj` | - | Missing |
| 3850 | `sellobj_state` | - | Missing |
| 3089 | `set_cost` | - | Missing |
| 2623 | `set_repo_loc` | - | Missing |
| 272 | `set_residency` | - | Missing |
| 400 | `setpaid` | - | Missing |
| 5456 | `shk_chat` | - | Missing |
| 5403 | `shk_embellish` | - | Missing |
| 4491 | `shk_fixes_damage` | - | Missing |
| 4376 | `shk_impaired` | - | Missing |
| 4815 | `shk_move` | - | Missing |
| 3353 | `shk_names_obj` | - | Missing |
| 5820 | `shk_owns` | - | Missing |
| 5797 | `shk_your` | - | Missing |
| 4297 | `shkcatch` | - | Missing |
| 235 | `shkgone` | - | Missing |
| 931 | `shop_debt` | - | Missing |
| 993 | `shop_keeper` | - | Missing |
| 5321 | `shop_object` | - | Missing |
| 4954 | `shopdig` | - | Missing |
| 944 | `shopper_financial_report` | - | Missing |
| 1440 | `sortbill_cmp` | - | Missing |
| 3044 | `special_stock` | - | Missing |
| 3560 | `splitbill` | - | Missing |
| 3650 | `stolen_container` | - | Missing |
| 3691 | `stolen_value` | - | Missing |
| 3598 | `sub_one_frombill` | - | Missing |
| 3631 | `subfrombill` | - | Missing |
| 1059 | `tended_shop` | - | Missing |
| 692 | `u_entered_shop` | - | Missing |
| 520 | `u_left_shop` | - | Missing |
| 3201 | `unpaid_cost` | - | Missing |
| 2112 | `update_bill` | - | Missing |
| 6036 | `use_unpaid_trapobj` | - | Missing |

### shknam.c -> shknam.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 857 | `Shknam` | - | Missing |
| 583 | `free_eshk` | - | Missing |
| 843 | `get_shop_item` | - | Missing |
| 596 | `good_shopdoor` | - | Missing |
| 360 | `init_shop_selection` | - | Missing |
| 922 | `is_izchak` | - | Missing |
| 454 | `mkshobj_at` | - | Missing |
| 443 | `mkveggy_at` | - | Missing |
| 487 | `nameshk` | - | Missing |
| 571 | `neweshk` | - | Missing |
| 819 | `saleable` | - | Missing |
| 642 | `shkinit` | - | Missing |
| 870 | `shkname` | - | Missing |
| 914 | `shkname_is_pname` | - | Missing |
| 408 | `shkveg` | - | Missing |
| 732 | `stock_room` | - | Missing |
| 709 | `stock_room_goodpos` | - | Missing |
| 380 | `veggy_item` | - | Missing |

### sit.c -> sit.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 640 | `attrcurse` | - | Missing |
| 396 | `dosit` | - | Missing |
| 354 | `lay_an_egg` | - | Missing |
| 565 | `rndcurse` | - | Missing |
| 238 | `special_throne_effect` | - | Missing |
| 14 | `take_gold` | - | Missing |
| 39 | `throne_sit_effect` | - | Missing |

### sounds.c -> sounds.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1779 | `activate_chosen_soundlib` | - | Missing |
| 1556 | `add_sound_mapping` | - | Missing |
| 1798 | `assign_soundlib` | - | Missing |
| 2084 | `base_soundname_to_filename` | - | Missing |
| 62 | `beehive_mon_sound` | - | Missing |
| 519 | `beg` | sounds.js:548 | Implemented |
| 1809 | `choose_soundlib` | - | Missing |
| 617 | `cry_sound` | - | Missing |
| 1257 | `dochat` | - | Missing |
| 679 | `domonnoise` | sounds.js:669 | Implemented |
| 202 | `dosounds` | sounds.js:227 | Implemented |
| 1248 | `dotalk` | sounds.js:1132 | Implemented |
| 1995 | `get_sound_effect_filename` | - | Missing |
| 1864 | `get_soundlib_name` | - | Missing |
| 402 | `growl` | sounds.js:446 | Implemented |
| 351 | `growl_sound` | - | Missing |
| 1981 | `initialize_semap_basenames` | - | Missing |
| 546 | `maybe_gasp` | - | Missing |
| 1659 | `maybe_play_sound` | - | Missing |
| 20 | `mon_in_room` | - | Missing |
| 659 | `mon_is_gecko` | - | Missing |
| 89 | `morgue_mon_sound` | - | Missing |
| 1927 | `nosound_achievement` | - | Missing |
| 1947 | `nosound_ambience` | - | Missing |
| 1922 | `nosound_exit_nhsound` | - | Missing |
| 1937 | `nosound_hero_playnotes` | - | Missing |
| 1917 | `nosound_init_nhsound` | - | Missing |
| 1942 | `nosound_play_usersound` | - | Missing |
| 1932 | `nosound_soundeffect` | - | Missing |
| 1953 | `nosound_verbal` | - | Missing |
| 181 | `oracle_sound` | - | Missing |
| 1642 | `play_sound_for_message` | - | Missing |
| 1676 | `release_sound_mappings` | - | Missing |
| 1413 | `responsive_mon_at` | - | Missing |
| 2161 | `set_voice` | - | Missing |
| 1629 | `sound_matches_message` | - | Missing |
| 2185 | `sound_speak` | - | Missing |
| 1883 | `soundlib_id_from_opt` | - | Missing |
| 131 | `temple_priest_sound` | - | Missing |
| 30 | `throne_mon_sound` | - | Missing |
| 1427 | `tiphat` | - | Missing |
| 479 | `whimper` | sounds.js:514 | Implemented |
| 427 | `yelp` | sounds.js:471 | Implemented |
| 115 | `zoo_mon_sound` | - | Missing |

### sp_lev.c -> sp_lev.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 5541 | `add_doors_to_room` | dungeon.js:1377 | Aligned |
| 2805 | `build_room` | sp_lev.js:2750 | Aligned |
| 1408 | `check_room` | dungeon.js:286 | Aligned |
| 2439 | `create_altar` | sp_lev.js:4950 | Aligned |
| 2669 | `create_corridor` | dungeon.js:1786 | Aligned |
| 6444 | `create_des_coder` | sp_lev.js:240 | Aligned |
| 1715 | `create_door` | sp_lev.js:4607 | Aligned |
| 1926 | `create_monster` | sp_lev.js:4531 | Aligned |
| 2186 | `create_object` | sp_lev.js `object()` | Aligned — executes in script order (deferral removed) |
| 1487 | `create_room` | dungeon.js:362 | Aligned |
| 1669 | `create_subroom` | mklev.js:193 | Aligned |
| 1813 | `create_trap` | sp_lev.js:4383 | Aligned |
| 4769 | `cvt_to_abscoord` | sp_lev.js:1996 | Aligned |
| 4790 | `cvt_to_relcoord` | sp_lev.js:1987 | Aligned |
| 2542 | `dig_corridor` | dungeon.js:1462 | Aligned |
| 5214 | `ensure_way_out` | sp_lev.js:2005 | Aligned |
| 2924 | `fill_empty_maze` | sp_lev.js:7673 | Aligned |
| 2729 | `fill_special_room` | sp_lev.js `fill_special_room()` | Aligned — called from finalize_level |
| 3141 | `find_montype` | sp_lev.js:3682 | Aligned |
| 3464 | `find_objtype` | sp_lev.js:3787 | Aligned |
| 429 | `flip_dbridge_horizontal` | sp_lev.js:1997 | Aligned |
| 443 | `flip_dbridge_vertical` | sp_lev.js:2003 | Aligned |
| 500 | `flip_encoded_dir_bits` | sp_lev.js:1992 | Aligned |
| 534 | `flip_level` | sp_lev.js:1982 | Aligned |
| 968 | `flip_level_rnd` | sp_lev.js:1976 | Aligned |
| 927 | `flip_vault_guard` | sp_lev.js:2011 | Aligned |
| 459 | `flip_visuals` | sp_lev.js:1987 | Aligned |
| 4597 | `floodfillchk_match_accessible` | sp_lev.js:2057 | Aligned |
| 4584 | `floodfillchk_match_under` | sp_lev.js:2052 | Aligned |
| 5143 | `generate_way_out_method` | sp_lev.js:2064 | Aligned |
| 5316 | `get_coord` | sp_lev.js:7647 | Aligned |
| 1386 | `get_free_room_loc` | sp_lev.js:2536 | Aligned |
| 1203 | `get_location` | sp_lev.js:2448 | Aligned |
| 1338 | `get_location_coord` | sp_lev.js:2498 | Aligned |
| 3988 | `get_mkroom_name` | sp_lev.js:7652 | Aligned |
| 1361 | `get_room_loc` | sp_lev.js:2515 | Aligned |
| 3112 | `get_table_align` | sp_lev.js:124 | Aligned |
| 3438 | `get_table_buc` | sp_lev.js:143 | Aligned |
| 5558 | `get_table_coords_or_region` | sp_lev.js:4150 | Aligned |
| 3403 | `get_table_int_or_random` | sp_lev.js:133 | Aligned |
| 5257 | `get_table_intarray_entry` | sp_lev.js:4101 | Aligned |
| 3129 | `get_table_monclass` | sp_lev.js:3637 | Aligned |
| 3165 | `get_table_montype` | sp_lev.js:3691 | Aligned |
| 3451 | `get_table_objclass` | sp_lev.js:3781 | Aligned |
| 3535 | `get_table_objtype` | sp_lev.js:3793 | Aligned |
| 5279 | `get_table_region` | sp_lev.js:4110 | Aligned |
| 4001 | `get_table_roomtype_opt` | sp_lev.js:157 | Aligned |
| 4347 | `get_table_traptype_opt` | sp_lev.js:4093 | Aligned |
| 3186 | `get_table_xy_or_coord` | sp_lev.js:4205 | Aligned |
| 4364 | `get_trapname_bytype` | sp_lev.js:4060 | Aligned |
| 4376 | `get_traptype_byname` | sp_lev.js:4055 | Aligned |
| 1318 | `get_unpacked_coord` | sp_lev.js:2475 | Aligned |
| 4136 | `good_stair_loc` | sp_lev.js:2524 | Aligned |
| 1281 | `is_ok_location` | sp_lev.js:2520 | Aligned |
| 4144 | `l_create_stairway` | sp_lev.js:3559 | Aligned |
| 5407 | `l_get_lregion` | sp_lev.js:4686 | Aligned |
| 3057 | `l_push_mkroom_table` | sp_lev.js:4070 | Aligned |
| 3048 | `l_push_wid_hei_table` | sp_lev.js:4059 | Aligned |
| 6435 | `l_register_des` | sp_lev.js:8117 | Aligned |
| 4736 | `l_table_getset_feature_flag` | sp_lev.js:4086 | Aligned |
| 5368 | `levregion_add` | sp_lev.js:4702 | Aligned |
| 2837 | `light_region` | sp_lev.js:4324 | Aligned |
| 1123 | `link_doors_rooms` | dungeon.js:1435 | Aligned |
| 6454 | `load_special` | sp_lev.js:6536 | Aligned |
| 4280 | `lspo_altar` | sp_lev.js:6549 | Aligned |
| 4526 | `lspo_corridor` | sp_lev.js:6555 | Aligned |
| 4668 | `lspo_door` | sp_lev.js:6545 | Aligned |
| 5717 | `lspo_drawbridge` | sp_lev.js:6560 | Aligned |
| 3878 | `lspo_engraving` | sp_lev.js:6543 | Aligned |
| 5495 | `lspo_exclusion` | sp_lev.js:6563 | Aligned |
| 4841 | `lspo_feature` | sp_lev.js:6551 | Aligned |
| 6011 | `lspo_finalize_level` | sp_lev.js:6570 | Aligned |
| 4926 | `lspo_gas_cloud` | sp_lev.js:6571 | Aligned |
| 4477 | `lspo_gold` | sp_lev.js:6557 | Aligned |
| 4240 | `lspo_grave` | sp_lev.js:6548 | Aligned |
| 4229 | `lspo_ladder` | sp_lev.js:6547 | Aligned |
| 3755 | `lspo_level_flags` | sp_lev.js:6541 | Aligned |
| 3833 | `lspo_level_init` | sp_lev.js:6542 | Aligned |
| 5469 | `lspo_levregion` | sp_lev.js:6562 | Aligned |
| 6074 | `lspo_map` | sp_lev.js:6550 | Aligned |
| 5766 | `lspo_mazewalk` | sp_lev.js:6559 | Aligned |
| 3074 | `lspo_message` | sp_lev.js:6538 | Aligned |
| 3936 | `lspo_mineralize` | sp_lev.js:6544 | Aligned |
| 3212 | `lspo_monster` | sp_lev.js:6539 | Aligned |
| 5934 | `lspo_non_diggable` | sp_lev.js:6566 | Aligned |
| 5943 | `lspo_non_passwall` | sp_lev.js:6567 | Aligned |
| 3553 | `lspo_object` | sp_lev.js:6540 | Aligned |
| 4555 | `lspo_random_corridors` | sp_lev.js:6556 | Aligned |
| 5581 | `lspo_region` | sp_lev.js:6561 | Aligned |
| 5048 | `lspo_replace_terrain` | sp_lev.js:6553 | Aligned |
| 5990 | `lspo_reset_level` | sp_lev.js:6569 | Aligned |
| 4025 | `lspo_room` | sp_lev.js:6554 | Aligned |
| 4220 | `lspo_stair` | sp_lev.js:6546 | Aligned |
| 5440 | `lspo_teleport_region` | sp_lev.js:6568 | Aligned |
| 4975 | `lspo_terrain` | sp_lev.js:6552 | Aligned |
| 4394 | `lspo_trap` | sp_lev.js:6558 | Aligned |
| 5873 | `lspo_wall_property` | sp_lev.js:6565 | Aligned |
| 5962 | `lspo_wallify` | sp_lev.js:6564 | Aligned |
| 360 | `lvlfill_maze_grid` | sp_lev.js:1471 | Aligned |
| 375 | `lvlfill_solid` | sp_lev.js:1445 | Aligned |
| 392 | `lvlfill_swamp` | sp_lev.js:1491 | Aligned |
| 1865 | `m_bad_boulder_spot` | sp_lev.js:5980| Aligned |
| 329 | `map_cleanup` | sp_lev.js:6028 | Aligned |
| 276 | `mapfrag_canmatch` | sp_lev.js:2296| Aligned |
| 282 | `mapfrag_error` | sp_lev.js:2291| Aligned |
| 257 | `mapfrag_free` | sp_lev.js:2286| Aligned |
| 228 | `mapfrag_fromstr` | sp_lev.js:2255| Aligned |
| 267 | `mapfrag_get` | sp_lev.js:2273| Aligned |
| 299 | `mapfrag_match` | sp_lev.js:2317| Aligned |
| 218 | `match_maptyps` | sp_lev.js:2248| Aligned |
| 1111 | `maybe_add_door` | sp_lev.js:4859| Aligned |
| 2898 | `maze1xy` | sp_lev.js:7847 | Aligned |
| 4808 | `nhl_abs_coord` | sp_lev.js:2724| Aligned |
| 1853 | `noncoalignment` | sp_lev.js:5991| Aligned |
| 1312 | `pm_good_location` | sp_lev.js:5975| Aligned |
| 1885 | `pm_to_humidity` | sp_lev.js:5955| Aligned |
| 4575 | `random_wdir` | sp_lev.js:7814 | Aligned |
| 1017 | `remove_boundary_syms` | sp_lev.js:6092 | Aligned |
| 1149 | `rnddoor` | sp_lev.js:5089 | Aligned |
| 1160 | `rndtrap` | sp_lev.js:7819 | Aligned |
| 2485 | `search_door` | sp_lev.js:4846| Aligned |
| 4644 | `sel_set_door` | sp_lev.js:5101 | Aligned |
| 4630 | `sel_set_feature` | sp_lev.js:2994| Aligned|
| 5532 | `sel_set_lit` | sp_lev.js:2954| Aligned|
| 4606 | `sel_set_ter` | sp_lev.js:2539| Aligned|
| 987 | `sel_set_wall_property` | sp_lev.js:4590 | Aligned |
| 5952 | `sel_set_wallify` | sp_lev.js:6562| Aligned |
| 1043 | `set_door_orientation` | sp_lev.js:5094 | Aligned |
| 4590 | `set_floodfillchk_match_under` | sp_lev.js:2127 | Aligned |
| 1275 | `set_ok_location_func` | sp_lev.js:2538 | Aligned |
| 1002 | `set_wall_property` | sp_lev.js:4652 | Aligned |
| 5908 | `set_wallprop_in_selection` | sp_lev.js:4601 | Aligned |
| 1090 | `shared_with_room` | sp_lev.js:4827| Aligned |
| 316 | `solidify_map` | sp_lev.js:6074 | Aligned |
| 1909 | `sp_amask_to_amask` | sp_lev.js:5998| Aligned |
| 3020 | `sp_code_jmpaddr` | sp_lev.js:256| Aligned |
| 6336 | `sp_level_coder_init` | sp_lev.js:231 | Aligned |
| 2980 | `splev_initlev` | sp_lev.js:1703| Aligned |
| 3029 | `spo_end_moninvent` | sp_lev.js:341| Aligned |
| 4116 | `spo_endroom` | sp_lev.js:330| Aligned |
| 3038 | `spo_pop_container` | sp_lev.js:336| Aligned |
| 6324 | `update_croom` | sp_lev.js:324| Aligned |
| 2863 | `wallify_map` | sp_lev.js:6553| Aligned |

### spell.c -> spell.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 669 | `age_spells` | spell.js:ageSpells | Aligned — decrement spell retention |
| 343 | `book_cursed` | spell.js:266 | Stub |
| 646 | `book_disappears` | - | Missing |
| 658 | `book_substitution` | - | Missing |
| 1619 | `can_center_spell_location` | - | Missing |
| 1003 | `cast_chain_lightning` | - | Missing |
| 1104 | `cast_protection` | - | Missing |
| 189 | `confused_book` | spell.js:272 | Stub |
| 130 | `cursed_book` | - | Missing |
| 231 | `deadbook` | - | Missing |
| 211 | `deadbook_pacify_undead` | - | Missing |
| 1627 | `display_spell_target_positions` | - | Missing |
| 820 | `docast` | - | Missing (spelleffects stub exists) |
| 2075 | `dospellmenu` | spell.js:handleKnownSpells | APPROX — spell list display |
| 2021 | `dovspell` | spell.js:handleKnownSpells | APPROX — known spells command |
| 787 | `dowizcast` | - | Missing |
| 2391 | `force_learn_spell` | - | Missing |
| 715 | `getspell` | - | Missing (inline in handleKnownSpells) |
| 2340 | `initialspell` | - | Missing |
| 2363 | `known_spell` | - | Missing |
| 356 | `learn` | spell.js:315 | Stub |
| 1763 | `losespells` | - | Missing |
| 2417 | `num_spells` | - | Missing |
| 2173 | `percent_success` | spell.js:estimateSpellFailPercent | APPROX — spell failure calculation |
| 952 | `propagate_chain_lightning` | - | Missing |
| 687 | `rejectcasting` | spell.js:338 | Stub |
| 2059 | `show_spells` | - | Missing |
| 864 | `skill_based_spellbook_id` | - | Missing |
| 1927 | `sortspells` | - | Missing |
| 1607 | `spell_aim_step` | - | Missing |
| 1181 | `spell_backfire` | - | Missing |
| 1870 | `spell_cmp` | - | Missing |
| 2379 | `spell_idx` | - | Missing |
| 115 | `spell_let_to_idx` | - | Missing |
| 856 | `spell_skilltype` | spell.js:spellCategoryForName | APPROX — spell category lookup |
| 1385 | `spelleffects` | spell.js:296 | Stub |
| 1220 | `spelleffects_check` | - | Missing |
| 2295 | `spellretention` | spell.js:spellRetentionText | APPROX — retention display |
| 1976 | `spellsortmenu` | - | Missing |
| 832 | `spelltypemnemonic` | spell.js:spellCategoryForName | APPROX — category for display |
| 468 | `study_book` | spell.js:258 | Stub |
| 1655 | `throwspell` | - | Missing |
| 1707 | `tport_spell` | - | Missing |

### stairs.c -> stairs.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 154 | `On_ladder` | - | Missing |
| 148 | `On_stairs` | - | Missing |
| 170 | `On_stairs_dn` | - | Missing |
| 162 | `On_stairs_up` | - | Missing |
| 180 | `known_branch_stairs` | - | Missing |
| 187 | `stairs_description` | - | Missing |
| 8 | `stairway_add` | - | Missing |
| 40 | `stairway_at` | - | Missing |
| 50 | `stairway_find` | - | Missing |
| 79 | `stairway_find_dir` | - | Missing |
| 64 | `stairway_find_from` | - | Missing |
| 99 | `stairway_find_special_dir` | - | Missing |
| 89 | `stairway_find_type_dir` | - | Missing |
| 27 | `stairway_free_all` | - | Missing |
| 137 | `u_on_dnstairs` | - | Missing |
| 113 | `u_on_sstairs` | - | Missing |
| 125 | `u_on_upstairs` | - | Missing |

### steal.c -> steal.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 14 | `somegold` | steal.js:12 | Implemented — proportional gold subset using rn1 |
| 45 | `findgold` | steal.js:38 | Implemented — returns gold object from inventory |
| 58 | `stealgold` | steal.js:51 | Implemented — leprechaun gold theft (simplified: no floor gold, no teleport) |
| 120 | `thiefdead` | steal.js:102 | Stub — multi-turn armor theft not ported |
| 133 | `unresponsive` | steal.js:110 | Implemented — hero consciousness check |
| 147 | `unstolenarm` | - | Missing — multi-turn armor theft callback |
| 165 | `stealarm` | - | Missing — multi-turn armor theft callback |
| 213 | `remove_worn_item` | steal.js:123 | Implemented — clears equipment slots and owornmask |
| 294 | `worn_item_removal` | - | Missing — remove worn item with theft message |
| 343 | `steal` | steal.js:150 | Implemented — simplified nymph/monkey theft with weighted random selection |
| 618 | `mpickobj` | - | Missing — full monster pickup with side effects |
| 689 | `stealamulet` | steal.js:217 | Stub — requires quest artifact tracking |
| 772 | `maybe_absorb_item` | steal.js:225 | Stub — mimic absorption |
| 814 | `mdrop_obj` | steal.js | Partial — uses extract_from_minvent |
| 852 | `mdrop_special_objs` | steal.js:234 | Stub — requires obj_resists |
| 875 | `relobj` | steal.js:243 | Implemented — release all monster inventory to floor |

### steed.c -> steed.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 169 | `can_ride` | - | Missing |
| 26 | `can_saddle` | - | Missing |
| 576 | `dismount_steed` | - | Missing |
| 178 | `doride` | - | Missing |
| 387 | `exercise_steed` | - | Missing |
| 402 | `kick_steed` | - | Missing |
| 460 | `landing_spot` | - | Missing |
| 827 | `maybewakesteed` | - | Missing |
| 197 | `mount_steed` | - | Missing |
| 898 | `place_monster` | - | Missing |
| 852 | `poly_steed` | - | Missing |
| 142 | `put_saddle_on_mon` | - | Missing |
| 17 | `rider_cant_reach` | - | Missing |
| 878 | `stucksteed` | - | Missing |
| 36 | `use_saddle` | - | Missing |

### strutil.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 82 | `Strlen_` | - | Missing |
| 145 | `pmatch` | - | Missing |
| 105 | `pmatch_internal` | - | Missing |
| 152 | `pmatchi` | - | Missing |
| 17 | `strbuf_append` | - | Missing |
| 49 | `strbuf_empty` | - | Missing |
| 9 | `strbuf_init` | - | Missing |
| 58 | `strbuf_nl_to_crlf` | - | Missing |
| 28 | `strbuf_reserve` | - | Missing |

### symbols.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 217 | `assign_graphics` | - | Missing |
| 319 | `clear_symsetentry` | - | Missing |
| 909 | `do_symset` | - | Missing |
| 693 | `free_symsets` | - | Missing |
| 131 | `get_othersym` | - | Missing |
| 122 | `init_ov_primary_symbols` | - | Missing |
| 113 | `init_ov_rogue_symbols` | - | Missing |
| 167 | `init_primary_symbols` | - | Missing |
| 187 | `init_rogue_symbols` | - | Missing |
| 95 | `init_showsyms` | - | Missing |
| 85 | `init_symbols` | - | Missing |
| 673 | `load_symset` | - | Missing |
| 852 | `match_sym` | - | Missing |
| 438 | `parse_sym_line` | - | Missing |
| 773 | `parsesymbols` | - | Missing |
| 431 | `proc_symset_line` | - | Missing |
| 739 | `savedsym_add` | - | Missing |
| 726 | `savedsym_find` | - | Missing |
| 712 | `savedsym_free` | - | Missing |
| 757 | `savedsym_strbuf` | - | Missing |
| 657 | `set_symhandling` | - | Missing |
| 253 | `switch_symbols` | - | Missing |
| 353 | `symset_is_compatible` | - | Missing |
| 295 | `update_ov_primary_symset` | - | Missing |
| 301 | `update_ov_rogue_symset` | - | Missing |
| 307 | `update_primary_symset` | - | Missing |
| 313 | `update_rogue_symset` | - | Missing |

### sys.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 21 | `sys_early_init` | - | Missing |
| 115 | `sysopt_release` | - | Missing |
| 164 | `sysopt_seduce_set` | - | Missing |

### teleport.c -> teleport.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 573 | `collect_coords` | teleport.js:157 | Implemented |
| 1894 | `control_mon_tele` | - | Missing |
| 1439 | `domagicportal` | teleport.js:865 | Implemented |
| 1029 | `dotele` | teleport.js:798 | Implemented |
| 914 | `dotelecmd` | teleport.js:961 | Implemented |
| 191 | `enexto` | teleport.js:234 | Implemented |
| 214 | `enexto_core` | teleport.js:238 | Implemented |
| 276 | `enexto_core` | teleport.js:238 | Implemented |
| 201 | `enexto_gpflags` | teleport.js:989 | Implemented |
| 81 | `goodpos` | teleport.js:78 | Implemented |
| 48 | `goodpos_onscary` | - | Missing |
| 1160 | `level_tele` | teleport.js:838 | Implemented |
| 1533 | `level_tele_trap` | teleport.js:938 | Implemented |
| 21 | `m_blocks_teleporting` | teleport.js:983 | Implemented |
| 1998 | `mlevel_tele_trap` | teleport.js:544 | Implemented |
| 1957 | `mtele_trap` | teleport.js:505 | Implemented |
| 1932 | `mvault_tele` | teleport.js:1013 | Implemented |
| 30 | `noteleport_level` | teleport.js:58 | Implemented |
| 2182 | `random_teleport_level` | teleport.js:611 | Implemented |
| 1794 | `rloc` | teleport.js:402 | Implemented |
| 1570 | `rloc_pos_ok` | teleport.js:275 | Implemented |
| 1766 | `rloc_to` | teleport.js:387 | Implemented |
| 1640 | `rloc_to_core` | teleport.js:308 | Implemented |
| 1772 | `rloc_to_flag` | teleport.js:393 | Implemented |
| 2094 | `rloco` | teleport.js:581 | Implemented |
| 712 | `safe_teleds` | teleport.js:712 | Implemented |
| 844 | `scrolltele` | teleport.js:770 | Implemented |
| 1781 | `stairway_find_forwiz` | teleport.js:1004 | Implemented |
| 837 | `tele` | teleport.js:762 | Implemented |
| 381 | `tele_jump_ok` | teleport.js:648 | Implemented |
| 1945 | `tele_restrict` | teleport.js:461 | Implemented |
| 809 | `tele_to_rnd_pet` | - | Missing |
| 1487 | `tele_trap` | teleport.js:884 | Implemented |
| 443 | `teleds` | teleport.js:681 | Implemented |
| 415 | `teleok` | teleport.js:656 | Implemented |
| 781 | `teleport_pet` | teleport.js:969 | Implemented |
| 2254 | `u_teleport_mon` | teleport.js:473 | Implemented |
| 768 | `vault_tele` | teleport.js:994 | Implemented |

### timeout.c -> timeout.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 981 | `attach_egg_hatch_timeout` | 473 | Aligned |
| 1204 | `attach_fig_transform_timeout` | 509 | Aligned |
| 1712 | `begin_burn` | 542 | Aligned |
| 448 | `burn_away_slime` | 587 | Stub (no-op) |
| 1383 | `burn_object` | 524 | Aligned |
| 295 | `choke_dialogue` | 583 | Stub (no-op) |
| 1828 | `cleanup_burn` | 551 | Aligned |
| 1847 | `do_storms` | 575 | Aligned |
| 575 | `done_timeout` | 462 | Aligned |
| 1804 | `end_burn` | 564 | Aligned |
| 951 | `fall_asleep` | 451 | Aligned |
| 1017 | `hatch_egg` | 499 | Aligned |
| 2459 | `insert_timer` | 247 | Aligned |
| 1009 | `kill_egg` | 492 | Aligned |
| 1995 | `kind_name` | 130 | Aligned |
| 1360 | `lantern_message` | 593 | Stub (no-op) |
| 1193 | `learn_egg_type` | timeout.js:learn_egg_type | Implemented |
| 353 | `levitation_dialogue` | 585 | Stub (no-op) |
| 2619 | `maybe_write_timer` | - | N/A (save/restore) |
| 2576 | `mon_is_local` | - | N/A (save/restore) |
| 588 | `nh_timeout` | 407 | Aligned: intrinsic timeout decrement loop, dialogue calls before decrement, _fireExpiryEffect with death/status/equipment handlers |
| 2396 | `obj_has_timer` | 369 | Aligned |
| 2552 | `obj_is_local` | - | N/A (save/restore) |
| 2331 | `obj_move_timers` | 333 | Aligned |
| 2351 | `obj_split_timers` | 344 | Aligned |
| 2369 | `obj_stop_timers` | 364 | Aligned |
| 2316 | `peek_timer` | 235 | Aligned |
| 534 | `phaze_dialogue` | 589 | Stub (no-op) |
| 2014 | `print_queue` | 282 | Aligned |
| 117 | `property_by_index` | - | Missing |
| 554 | `region_dialogue` | 590 | Stub (no-op) |
| 2743 | `relink_timers` | 607 | Stub |
| 2475 | `remove_timer` | 243 | Aligned |
| 2699 | `restore_timers` | 611 | Stub |
| 2214 | `run_timers` | 268 | Aligned |
| 2660 | `save_timers` | 615 | Stub |
| 1345 | `see_lamp_flicker` | 592 | Stub (no-op) |
| 323 | `sickness_dialogue` | 584 | Stub (no-op) |
| 268 | `sleep_dialogue` | 582 | Stub (no-op) |
| 389 | `slime_dialogue` | 586 | Stub (no-op) |
| 457 | `slimed_to_death` | 588 | Stub (no-op) |
| 1222 | `slip_or_trip` | 591 | Stub (no-op) |
| 2408 | `spot_stop_timers` | 377 | Aligned |
| 2437 | `spot_time_expires` | 389 | Aligned |
| 2451 | `spot_time_left` | 399 | Aligned |
| 2239 | `start_timer` | 168 | Aligned |
| 137 | `stoned_dialogue` | 580 | Stub (no-op) |
| 2291 | `stop_timer` | 210 | Aligned |
| 2595 | `timer_is_local` | - | N/A (save/restore) |
| 2122 | `timer_sanity_check` | 311 | Aligned |
| 2727 | `timer_stats` | 139 | Aligned |
| 197 | `vomiting_dialogue` | 581 | Stub (no-op) |
| 2041 | `wiz_timeout_queue` | 294 | Aligned |
| 2497 | `write_timer` | - | N/A (save/restore) |

### topten.c -> topten.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 480 | `add_achieveX` | - | Missing |
| 1356 | `classmon` | - | Missing |
| 208 | `discardexcess` | - | Missing |
| 491 | `encode_extended_achievements` | - | Missing |
| 584 | `encode_extended_conducts` | - | Missing |
| 455 | `encodeachieve` | - | Missing |
| 411 | `encodeconduct` | - | Missing |
| 394 | `encodexlogflags` | - | Missing |
| 90 | `formatkiller` | - | Missing |
| 615 | `free_ttlist` | - | Missing |
| 1381 | `get_rnd_toptenentry` | - | Missing |
| 1471 | `nsb_mung_line` | - | Missing |
| 1479 | `nsb_unmung_line` | - | Missing |
| 183 | `observable_depth` | - | Missing |
| 946 | `outentry` | - | Missing |
| 929 | `outheader` | - | Missing |
| 1194 | `prscore` | - | Missing |
| 220 | `readentry` | - | Missing |
| 1112 | `score_wanted` | - | Missing |
| 628 | `topten` | - | Missing |
| 165 | `topten_print` | - | Missing |
| 174 | `topten_print_bold` | - | Missing |
| 1445 | `tt_doppel` | - | Missing |
| 1422 | `tt_oname` | - | Missing |
| 301 | `writeentry` | - | Missing |
| 340 | `writexlentry` | - | Missing |

### track.c -> track.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 38 | `gettrack` | - | Missing |
| 59 | `hastrack` | - | Missing |
| 15 | `initrack` | - | Missing |
| 89 | `rest_track` | - | Missing |
| 72 | `save_track` | - | Missing |
| 24 | `settrack` | - | Missing |

### trap.c -> trap.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 4525 | `acid_damage` | trap.js:975 | Implemented — acid corrosion for objects |
| 908 | `activate_statue_trap` | trap.js:1346 | Implemented |
| 6511 | `adj_nonconjoined_pit` | trap.js:1839 | Implemented |
| 726 | `animate_statue` | - | Missing |
| 6601 | `b_trapped` | trap.js:1873 | Implemented (async) |
| 4883 | `back_on_ground` | - | Missing |
| 3098 | `blow_up_landmine` | trap.js:1460 | Implemented (async) |
| 88 | `burnarmor` | - | Missing |
| 1086 | `check_in_air` | trap.js:209 | Partial — `mon_check_in_air` subset for monster trap logic |
| 6201 | `chest_trap` | trap.js:1626 | Implemented (async) |
| 3009 | `choose_trapnote` | dungeon.js:2079 | Implemented |
| 593 | `clamp_hole_destination` | - | Missing |
| 6487 | `clear_conjoined_pits` | trap.js:1824 | Implemented |
| 4090 | `climb_pit` | - | Missing |
| 6117 | `closeholdingtrap` | - | Missing |
| 5248 | `cnv_trap_obj` | trap.js:1532 | Implemented (async) |
| 6459 | `conjoined_pits` | trap.js:1809 | Implemented |
| 5165 | `could_untrap` | - | Missing |
| 6423 | `count_traps` | trap.js:1791 | Implemented |
| 6575 | `delfloortrap` | trap.js:1859 | Implemented (async) |
| 6438 | `deltrap` | dungeon.js:2268 | Implemented |
| 5701 | `disarm_box` | trap.js:1756 | Implemented (async) |
| 5460 | `disarm_holdingtrap` | - | Missing |
| 5501 | `disarm_landmine` | trap.js:1580 | Implemented (async) |
| 5571 | `disarm_shooting_trap` | trap.js:1616 | Implemented (async) |
| 5537 | `disarm_squeaky_board` | trap.js:1598 | Implemented (async) |
| 418 | `dng_bottom` | dungeon.js:2276 | Partial — dungeon bottom computation for trapdoor/hole depth rules |
| 4140 | `dofiretrap` | trap.js:2003 | Implemented (async) |
| 4224 | `domagictrap` | trap.js:2057 | Implemented (async) |
| 2922 | `dotrap` | trap.js:2754 | Implemented (async) |
| 5155 | `dountrap` | trap.js:1526 | Implemented (async) |
| 5109 | `drain_en` | - | Missing |
| 4966 | `drown` | - | Missing |
| 4804 | `emergency_disrobe` | - | Missing |
| 171 | `erode_obj` | trap.js | Implemented — armor/weapon erosion by type (burn/rust/rot/corrode/crack) |
| 602 | `fall_through` | trap.js:2127 | Implemented (async) |
| 3495 | `feeltrap` | trap.js:1495 | Implemented |
| 3917 | `fill_pit` | trap.js:1520 | Implemented (async) |
| 3506 | `find_random_launch_coord` | dungeon.js:2116 | Implemented |
| 4362 | `fire_damage` | trap.js | Implemented — fire damage to single object |
| 4457 | `fire_damage_chain` | trap.js:995 | Implemented — chain helper for fire damage |
| 3931 | `float_down` | trap.js:1410 | Implemented (async) |
| 3844 | `float_up` | trap.js:1384 | Implemented (async) |
| 1061 | `floor_trigger` | trap.js:186 | Implemented |
| 3170 | `force_launch_placement` | - | Missing |
| 360 | `grease_protect` | trap.js | Implemented — grease protection check |
| 5607 | `help_monster_out` | - | Missing |
| 442 | `hole_destination` | dungeon.js:2294 | Partial — RNG depth selection for generated holes/trapdoors |
| 7065 | `ignite_items` | - | Missing |
| 2711 | `immune_to_trap` | - | Missing |
| 3751 | `instapetrify` | trap.js | Implemented — instant hero petrification (simplified) |
| 5282 | `into_vs_onto` | trap.js:1551 | Implemented |
| 3602 | `isclearpath` | trap.js:1502 | Implemented |
| 6529 | `join_adjacent_pits` | - | Missing |
| 939 | `keep_saddle_with_steedcorpse` | trap.js:1361 | Implemented |
| 3148 | `launch_drop_spot` | - | Missing |
| 3162 | `launch_in_progress` | - | Missing |
| 3186 | `launch_obj` | - | Missing |
| 4483 | `lava_damage` | - | Missing |
| 6701 | `lava_effects` | - | Missing |
| 3633 | `m_easy_escape_pit` | trap.js:178 | Implemented |
| 1098 | `m_harmless_trap` | trap.js:217 | Implemented — monster harmless-trap checks |
| 456 | `maketrap` | dungeon.js:2191 | Implemented |
| 6966 | `maybe_finish_sokoban` | - | Missing |
| 3765 | `minstapetrify` | trap.js | Implemented — instant monster petrification |
| 3640 | `mintrap` | trap.js:769 | Partial — monster post-move branch (`mintrap_postmove`) |
| 390 | `mk_trap_statue` | dungeon.js:2151 | Implemented |
| 3566 | `mkroll_launch` | - | Missing |
| 5300 | `move_into_trap` | - | Missing |
| 3820 | `mselftouch` | trap.js | Implemented — monster petrification from wielded cockatrice corpse |
| 972 | `mu_maybe_destroy_web` | trap.js:538 | Partial — integrated within web trapeffect for monster branch |
| 6159 | `openfallingtrap` | - | Missing |
| 6008 | `openholdingtrap` | - | Missing |
| 4564 | `pot_acid_damage` | - | Missing |
| 4921 | `rescued_from_terrain` | - | Missing |
| 1045 | `reset_utrap` | trap.js:1449 | Implemented (async) |
| 5437 | `reward_untrap` | trap.js:1567 | Implemented (async) |
| 4854 | `rnd_nextto_goodpos` | - | Missing |
| 3485 | `seetrap` | trap.js:111 | Implemented |
| 3790 | `selftouch` | trap.js | Implemented — hero petrification from wielded cockatrice corpse |
| 1030 | `set_utrap` | trap.js:1440 | Implemented |
| 6898 | `sink_into_lava` | trap.js:1884 | Implemented (async) |
| 6946 | `sokoban_guilt` | - | Missing |
| 3028 | `steedintrap` | trap.js:1945 | Implemented (async) |
| 6409 | `t_at` | trap.js:133 | Implemented |
| 1018 | `t_missile` | trap.js:123 | Implemented (internal helper) |
| 6618 | `thitm` | trap.js:139 | Implemented (monster trap-hit helper) |
| 7079 | `trap_ice_effects` | trap.js:1912 | Implemented (async) |
| 7102 | `trap_sanity_check` | trap.js:1928 | Implemented |
| 2301 | `trapeffect_anti_magic` | trap.js:605 | Partial — monster branch |
| 1182 | `trapeffect_arrow_trap` | trap.js:289 | Partial — monster branch |
| 1468 | `trapeffect_bear_trap` | trap.js:353 | Partial — monster branch |
| 1241 | `trapeffect_dart_trap` | trap.js:307 | Partial — monster branch |
| 1715 | `trapeffect_fire_trap` | trap.js:434 | Partial — monster branch |
| 1991 | `trapeffect_hole` | trap.js:516 | Partial — monster branch |
| 2464 | `trapeffect_landmine` | trap.js:646 | Partial — monster branch with simplified explosion/scatter |
| 2066 | `trapeffect_level_telep` | trap.js:532 | Partial — monster branch |
| 2638 | `trapeffect_magic_portal` | trap.js:700 | Partial — monster branch |
| 2271 | `trapeffect_magic_trap` | trap.js:598 | Partial — monster branch |
| 1810 | `trapeffect_pit` | trap.js:493 | Partial — monster branch |
| 2413 | `trapeffect_poly_trap` | trap.js:635 | Partial — monster branch |
| 1313 | `trapeffect_rocktrap` | trap.js:327 | Partial — monster branch |
| 2590 | `trapeffect_rolling_boulder_trap` | trap.js:691 | Partial — monster branch; launch path not yet fully ported |
| 1580 | `trapeffect_rust_trap` | trap.js:378 | Partial — monster branch |
| 2863 | `trapeffect_selector` | trap.js:714 | Partial — monster selector branch |
| 1548 | `trapeffect_slp_gas_trap` | trap.js:369 | Partial — monster branch |
| 1392 | `trapeffect_sqky_board` | trap.js:345 | Partial — monster branch |
| 2257 | `trapeffect_statue_trap` | trap.js:593 | Partial — monster branch |
| 2048 | `trapeffect_telep_trap` | trap.js:526 | Partial — monster branch |
| 2653 | `trapeffect_vibrating_square` | trap.js:705 | Partial — monster branch |
| 2084 | `trapeffect_web` | trap.js:538 | Partial — monster branch |
| 7007 | `trapname` | - | Missing |
| 2989 | `trapnote` | trap.js:84 | Implemented |
| 5348 | `try_disarm` | - | Missing |
| 5584 | `try_lift` | - | Missing |
| 6567 | `uescaped_shaft` | trap.js:1854 | Implemented |
| 6683 | `unconscious` | - | Missing |
| 5514 | `unsqueak_ok` | trap.js:1589 | Implemented |
| 5755 | `untrap` | trap.js:1776 | Implemented (async) |
| 5728 | `untrap_box` | trap.js:1776 | Implemented (async) |
| 5196 | `untrap_prob` | - | Missing |
| 6555 | `uteetering_at_seen_pit` | trap.js:1849 | Implemented |
| 4619 | `water_damage` | trap.js | Implemented — water damage to single object |
| 4762 | `water_damage_chain` | trap.js:985 | Implemented — chain helper for water damage |

### u_init.c -> u_init.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1297 | `ini_inv` | u_init.js:491 | Implemented |
| 1204 | `ini_inv_adjust_obj` | u_init.js:ini_inv_adjust_obj | Implemented |
| 1114 | `ini_inv_mkobj_filter` | u_init.js:451 | Implemented |
| 1178 | `ini_inv_obj_substitution` | u_init.js:ini_inv_obj_substitution | Implemented |
| 1250 | `ini_inv_use_obj` | u_init.js:1308 | Implemented |
| 586 | `knows_class` | u_init.js:knows_class | Implemented |
| 575 | `knows_object` | u_init.js:knows_object | Implemented |
| 868 | `pauper_reinit` | u_init.js:pauper_reinit | Implemented |
| 1090 | `restricted_spell_discipline` | u_init.js:441 | Implemented |
| 1036 | `skills_for_role` | u_init.js:skills_for_role | Implemented |
| 1105 | `trquan` | u_init.js:622 | Implemented |
| 927 | `u_init_carry_attr_boost` | u_init.js:906 | Implemented |
| 1369 | `u_init_inventory_attrs` | u_init.js:u_init_inventory_attrs | Implemented |
| 942 | `u_init_misc` | u_init.js:u_init_misc | Implemented |
| 790 | `u_init_race` | u_init.js:704 | Implemented |
| 635 | `u_init_role` | u_init.js:628 | Implemented |
| 1394 | `u_init_skills_discoveries` | u_init.js:u_init_skills_discoveries | Implemented |

### uhitm.c -> uhitm.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 74 | `mhitm_mgc_atk_negated` | uhitm.js | Implemented |
| 188 | `attack_checks` | uhitm.js:160 | Implemented |
| 330 | `check_caitiff` | uhitm.js:199 | Implemented |
| 4813 | `damageum` | uhitm.js:1258 | Implemented |
| 2111 | `demonpet` | uhitm.js:849 | Implemented |
| 6286 | `disguised_as_mon` | uhitm.js:1524 | Implemented |
| 6278 | `disguised_as_non_mon` | uhitm.js:1513 | Implemented |
| 447 | `do_attack` | hack.js | Partial — safemon displacement (rn2(7) gate, monflee(rnd(6)), frozen/helpless/immobile rn2(6)), messages. Missing: Stormbringer, shopkeeper/inshop, leprechaun evasion, longworm, obstructed terrain |
| 3923 | `do_stone_mon` | uhitm.js:do_stone_mon | Implemented |
| 3902 | `do_stone_u` | uhitm.js:do_stone_u | Implemented |
| 735 | `double_punch` | uhitm.js:371 | Implemented |
| 103 | `dynamic_multi_reason` | uhitm.js:133 | Implemented |
| 4927 | `end_engulf` | uhitm.js:1308 | Implemented |
| 125 | `erode_armor` | uhitm.js:147 | Implemented |
| 4869 | `explum` | uhitm.js:1284 | Implemented |
| 364 | `find_roll_to_hit` | uhitm.js | Partial — abon() (STR+DEX+level), find_mac, luck, hitval, weapon_hit_bonus (stub), plus near_capacity/utrap penalties, Monk bonus/armor penalty, Elf-vs-orc bonus |
| 1941 | `first_weapon_hit` | uhitm.js:789 | Implemented |
| 6319 | `flash_hits_mon` | uhitm.js:1547 | Implemented |
| 431 | `force_attack` | uhitm.js:274 | Implemented |
| 4936 | `gulpum` | uhitm.js:1317 | Implemented |
| 757 | `hitum` | uhitm.js:380 | Implemented |
| 650 | `hitum_cleave` | uhitm.js:363 | Implemented |
| 818 | `hmon` | uhitm.js:403 | Implemented |
| 1732 | `hmon_hitmon` | uhitm.js:669 | Implemented |
| 837 | `hmon_hitmon_barehands` | uhitm.js:410 | Implemented |
| 1414 | `hmon_hitmon_dmg_recalc` | uhitm.js:551 | Implemented |
| 1365 | `hmon_hitmon_do_hit` | uhitm.js:529 | Implemented |
| 1519 | `hmon_hitmon_jousting` | uhitm.js:587 | Implemented |
| 1097 | `hmon_hitmon_misc_obj` | uhitm.js:484 | Implemented |
| 1615 | `hmon_hitmon_msg_hit` | uhitm.js:628 | Implemented |
| 1680 | `hmon_hitmon_msg_lightobj` | uhitm.js:656 | Implemented |
| 1641 | `hmon_hitmon_msg_silver` | uhitm.js:637 | Implemented |
| 1566 | `hmon_hitmon_pet` | uhitm.js:603 | Implemented |
| 1488 | `hmon_hitmon_poison` | uhitm.js:568 | Implemented |
| 1073 | `hmon_hitmon_potion` | uhitm.js:475 | Implemented |
| 1582 | `hmon_hitmon_splitmon` | uhitm.js:621 | Implemented |
| 1548 | `hmon_hitmon_stagger` | uhitm.js:595 | Implemented |
| 1048 | `hmon_hitmon_weapon` | uhitm.js:465 | Implemented |
| 919 | `hmon_hitmon_weapon_melee` | uhitm.js:441 | Implemented |
| 884 | `hmon_hitmon_weapon_ranged` | uhitm.js:425 | Implemented |
| 5402 | `hmonas` | uhitm.js:1403 | Implemented |
| 2076 | `joust` | uhitm.js:841 | Implemented |
| 586 | `known_hitum` | uhitm.js:334 | Implemented |
| 6403 | `light_hits_gremlin` | uhitm.js:1585 | Implemented |
| 5196 | `m_is_steadfast` | uhitm.js:1350 | Implemented |
| 2034 | `m_slips_free` | uhitm.js:833 | Implemented |
| 2720 | `mhitm_ad_acid` | uhitm.js | Implemented (m-vs-m path) |
| 2936 | `mhitm_ad_blnd` | uhitm.js | Implemented (m-vs-m path) |
| 2604 | `mhitm_ad_cold` | uhitm.js | Implemented (m-vs-m path) |
| 3668 | `mhitm_ad_conf` | uhitm.js | Implemented (m-vs-m path) |
| 2316 | `mhitm_ad_corr` | uhitm.js | Stub (no armor system) |
| 2993 | `mhitm_ad_curs` | uhitm.js | Stub (no m-vs-m effect) |
| 2341 | `mhitm_ad_dcay` | uhitm.js | Stub (no armor system) |
| 3815 | `mhitm_ad_deth` | uhitm.js | Implemented (redirects to drli) |
| 4470 | `mhitm_ad_dgst` | uhitm.js | Stub |
| 4571 | `mhitm_ad_dise` | uhitm.js | Stub (no m-vs-m effect) |
| 2396 | `mhitm_ad_dren` | uhitm.js | Implemented (m-vs-m path) |
| 3146 | `mhitm_ad_drin` | uhitm.js | Implemented (m-vs-m path) |
| 2423 | `mhitm_ad_drli` | uhitm.js | Implemented (m-vs-m path) |
| 3100 | `mhitm_ad_drst` | uhitm.js | Implemented (m-vs-m path) |
| 2662 | `mhitm_ad_elec` | uhitm.js | Implemented (m-vs-m path) |
| 3581 | `mhitm_ad_ench` | uhitm.js | Stub (no m-vs-m effect) |
| 3755 | `mhitm_ad_famn` | uhitm.js | Stub (physical only m-vs-m) |
| 2499 | `mhitm_ad_fire` | uhitm.js | Implemented (m-vs-m path) |
| 3875 | `mhitm_ad_halu` | uhitm.js | Stub (no m-vs-m effect) |
| 4274 | `mhitm_ad_heal` | uhitm.js | Implemented (m-vs-m path) |
| 4403 | `mhitm_ad_legs` | uhitm.js | Implemented (delegates to phys) |
| 3786 | `mhitm_ad_pest` | uhitm.js | Stub (physical only m-vs-m) |
| 3959 | `mhitm_ad_phys` | uhitm.js | Implemented (m-vs-m path) |
| 3409 | `mhitm_ad_plys` | uhitm.js | Implemented (m-vs-m path) |
| 3707 | `mhitm_ad_poly` | uhitm.js | Stub (needs newcham) |
| 2259 | `mhitm_ad_rust` | uhitm.js | Stub (no armor system) |
| 4548 | `mhitm_ad_samu` | uhitm.js | Stub (no m-vs-m effect) |
| 4601 | `mhitm_ad_sedu` | uhitm.js | Stub (no m-vs-m effect) |
| 2768 | `mhitm_ad_sgld` | uhitm.js | Stub (no m-vs-m effect) |
| 3457 | `mhitm_ad_slee` | uhitm.js | Implemented (m-vs-m path) |
| 3504 | `mhitm_ad_slim` | uhitm.js | Stub (needs newcham) |
| 3630 | `mhitm_ad_slow` | uhitm.js | Implemented (m-vs-m path) |
| 4729 | `mhitm_ad_ssex` | uhitm.js | Stub (no m-vs-m effect) |
| 3284 | `mhitm_ad_stck` | uhitm.js | Implemented (m-vs-m path) |
| 4181 | `mhitm_ad_ston` | uhitm.js | Stub (needs petrification) |
| 4366 | `mhitm_ad_stun` | uhitm.js | Implemented (m-vs-m path) |
| 2837 | `mhitm_ad_tlpt` | uhitm.js | Stub |
| 4243 | `mhitm_ad_were` | uhitm.js | Stub (no m-vs-m effect) |
| 3315 | `mhitm_ad_wrap` | uhitm.js | Implemented (m-vs-m path) |
| 4760 | `mhitm_adtyping` | uhitm.js | Implemented |
| 5225 | `mhitm_knockback` | mhitu.js + uhitm.js | Implemented — rn2(3) distance, rn2(6) chance, eligibility checks (AD_PHYS, attack type, size), rn2(2)+rn2(2) message; no actual monster movement |
| 3082 | `mhitm_really_poison` | uhitm.js | Implemented |
| 1920 | `mhurtle_to_doom` | uhitm.js:779 | Implemented |
| 5176 | `missum` | uhitm.js | Implemented (message path; cumbersome-armor hint + miss message) |
| 350 | `mon_maybe_unparalyze` | uhitm.js | Implemented — rn2(10) wake paralyzed monster before dieroll |
| 6293 | `nohandglow` | uhitm.js | Stub — function present; `umconf` state not yet modeled |
| 5843 | `passive` | uhitm.js | Partial — C-style AT_NONE search, damage dice, AD_ACID/AD_ENCH first-pass handling, `passive_obj` integration for weapon erosion, rn2(3) alive gate, and AD_PLYS/COLD/FIRE/ELEC/STUN alive effects with hero resistance/status hooks. Remaining gaps: exact damage/death messaging parity and full property-system fidelity |
| 6105 | `passive_obj` | uhitm.js | Partial — erosion paths wired through `erode_obj` for FIRE/ACID/RUST/CORR/DCAY and AD_ENCH enchant-drain path now wired; remaining gaps are full C `drain_item` edge semantics |
| 1970 | `shade_aware` | uhitm.js | Implemented |
| 1994 | `shade_miss` | uhitm.js | Implemented |
| 4909 | `start_engulf` | uhitm.js | Stub — function surface present; display/animation path not modeled |
| 2152 | `steal_it` | uhitm.js:867 | Implemented |
| 6260 | `stumble_onto_mimic` | uhitm.js | Implemented (reveal + wake path; simplified stickiness) |
| 6179 | `that_is_a_mimic` | uhitm.js | Implemented (simplified reveal path) |
| 2126 | `theft_petrifies` | uhitm.js:857 | Implemented |

### utf8map.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 148 | `add_custom_urep_entry` | - | Missing |
| 59 | `free_all_glyphmap_u` | - | Missing |
| 86 | `mixed_to_utf8` | - | Missing |
| 37 | `set_map_u` | - | Missing |
| 18 | `unicode_val` | - | Missing |

### vault.c -> vault.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 123 | `blackout` | - | Missing |
| 48 | `clear_fcorr` | - | Missing |
| 281 | `find_guard_dest` | - | Missing |
| 204 | `findgd` | - | Missing |
| 35 | `free_egd` | - | Missing |
| 869 | `gd_letknow` | - | Missing |
| 888 | `gd_move` | - | Missing |
| 836 | `gd_move_cleanup` | - | Missing |
| 734 | `gd_mv_monaway` | - | Missing |
| 752 | `gd_pick_corridor_gold` | - | Missing |
| 1272 | `gd_sound` | - | Missing |
| 175 | `grddead` | - | Missing |
| 1257 | `hidden_gold` | - | Missing |
| 192 | `in_fcorridor` | - | Missing |
| 317 | `invault` | - | Missing |
| 632 | `move_gold` | - | Missing |
| 155 | `parkguard` | - | Missing |
| 1205 | `paygd` | - | Missing |
| 144 | `restfakecorr` | - | Missing |
| 256 | `uleftvault` | - | Missing |
| 1278 | `vault_gd_watching` | - | Missing |
| 244 | `vault_occupied` | - | Missing |
| 237 | `vault_summon_gd` | - | Missing |
| 646 | `wallify_vault` | - | Missing |

### version.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 371 | `check_version` | - | Missing |
| 354 | `comp_times` | - | Missing |
| 760 | `compare_critical_bytes` | - | Missing |
| 468 | `copyright_banner_line` | - | Missing |
| 166 | `doextversion` | - | Missing |
| 156 | `doversion` | - | Missing |
| 491 | `dump_version_info` | - | Missing |
| 277 | `early_version_info` | - | Missing |
| 666 | `get_critical_size_count` | - | Missing |
| 461 | `get_current_feature_ver` | - | Missing |
| 428 | `get_feature_notice_ver` | - | Missing |
| 35 | `getversionstring` | - | Missing |
| 336 | `insert_rtoption` | - | Missing |
| 89 | `status_version` | - | Missing |
| 673 | `store_critical_bytes` | - | Missing |
| 509 | `store_version` | - | Missing |
| 710 | `uptodate` | - | Missing |
| 837 | `validate` | - | Missing |

### vision.c -> vision.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1408 | `_q1_path` | vision.js:163 | Implemented (as `q1_path`) |
| 1502 | `_q2_path` | vision.js:219 | Implemented (as `q2_path`) |
| 1549 | `_q3_path` | vision.js:247 | Implemented (as `q3_path`) |
| 1455 | `_q4_path` | vision.js:191 | Implemented (as `q4_path`) |
| 854 | `block_point` | vision.js:687 | Implemented |
| 1602 | `clear_path` | vision.js:275 | Implemented |
| 956 | `dig_point` | vision.js:630 | Implemented |
| 2096 | `do_clear_area` | vision.js:1121 | Implemented |
| 153 | `does_block` | vision.js:79 | Implemented |
| 1040 | `fill_point` | vision.js:571 | Implemented |
| 274 | `get_unused_cs` | vision.js:137 | Implemented |
| 105 | `get_viz_clear` | vision.js:112 | Implemented |
| 2141 | `howmonseen` | display.js:2038 | Implemented |
| 1847 | `left_side` | vision.js:401 | Implemented |
| 414 | `new_angle` | vision.js:958 | Implemented (inlined in `FOV.compute` seenv update) |
| 900 | `recalc_block_point` | vision.js:699 | Implemented |
| 1655 | `right_side` | vision.js:290 | Implemented |
| 314 | `rogue_vision` | vision.js:709 | Implemented (static helper) |
| 888 | `unblock_point` | vision.js:693 | Implemented |
| 1991 | `view_from` | vision.js:507 | Implemented |
| 1640 | `view_init` | vision.js:151 | Implemented |
| 121 | `vision_init` | vision.js:118 | Implemented |
| 512 | `vision_recalc` | display.js:1889 | Implemented |
| 211 | `vision_reset` | vision.js:126 | Implemented |

### weapon.c -> weapon.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 76 | `give_may_advance_msg` | weapon.js | Implemented (message hook + availability check) |
| 90 | `weapon_descr` | weapon.js | Implemented (delegates to skill_name) |
| 149 | `hitval` | weapon.js | Implemented — spe, oc_hitbon, blessed vs undead/demon, spear vs kebabable, trident vs swimmer, pick vs earthen. spec_abon now wired in uhitm.js find_roll_to_hit |
| 216 | `dmgval` | weapon.js | Partial — base roll, weapon-type bonus dice, spe, thick_skinned, blessed +d4, silver +d20, axe vs wood +d4. spec_dbon now wired in uhitm/mhitm/mhitu. Missing: shade, heavy iron ball, erosion, artifact light |
| 361 | `special_dmgval` | weapon.js | Implemented (blessed/silver unarmed bonus helper) |
| 436 | `silver_sears` | weapon.js | Implemented (silver-sear messaging helper) |
| 476 | `oselect` | weapon.js | Implemented — find typed item in monster inventory |
| 520 | `autoreturn_weapon` | weapon.js | Implemented — check for aklys |
| 533 | `select_rwep` | weapon.js | Implemented — full ranged weapon selection (cockatrice eggs, pies, boulders, polearms, rwep[] list, propellor matching) |
| 680 | `monmightthrowwep` | weapon.js | Implemented — test if weapon is in rwep[] list |
| 705 | `select_hwep` | weapon.js | Implemented — full melee weapon priority list (hwep[] ~30 types) |
| 747 | `possibly_unwield` | weapon.js | Implemented — re-evaluate weapon after theft/polymorph |
| 801 | `mon_wield_item` | weapon.js | Implemented — dispatches on weapon_check state (NEED_HTH_WEAPON, NEED_RANGED_WEAPON, etc.) |
| 938 | `mwepgone` | weapon.js | Implemented — setmnotwielded + weapon_check = NEED_WEAPON |
| 950 | `abon` | weapon.js | Implemented — STR/DEX/level hit bonus |
| 988 | `dbon` | weapon.js | Implemented — STR damage bonus |
| 1015 | `finish_towel_change` | weapon.js | Implemented |
| 1033 | `wet_a_towel` | weapon.js | Implemented — towel wetness |
| 1062 | `dry_a_towel` | weapon.js | Implemented — towel drying |
| 1087 | `skill_level_name` | weapon.js | Implemented — skill level display name |
| 1120 | `skill_name` | weapon.js | Implemented — skill name lookup |
| 1127 | `slots_required` | weapon.js | Implemented |
| 1151 | `can_advance` | weapon.js | Implemented |
| 1168 | `could_advance` | weapon.js | Implemented |
| 1182 | `peaked_skill` | weapon.js | Implemented |
| 1193 | `skill_advance` | weapon.js | Implemented |
| 1224 | `add_skills_to_menu` | weapon.js | Implemented (data rows for UI) |
| 1301 | `show_skills` | weapon.js | Implemented (menu data wrapper) |
| 1324 | `enhance_weapon_skill` | weapon.js | Implemented (non-UI auto-advance path) |
| 1409 | `unrestrict_weapon_skill` | weapon.js | Implemented |
| 1419 | `use_skill` | weapon.js | Implemented |
| 1432 | `add_weapon_skill` | weapon.js | Implemented |
| 1448 | `lose_weapon_skill` | weapon.js | Implemented |
| 1471 | `drain_weapon_skill` | weapon.js | Implemented |
| 1512 | `weapon_type` | weapon.js | Implemented — skill category lookup |
| 1527 | `uwep_skill_type` | weapon.js | Implemented |
| 1540 | `weapon_hit_bonus` | weapon.js | Gated — returns 0 until skill_init wired |
| 1639 | `weapon_dam_bonus` | weapon.js | Gated — returns 0 until skill_init wired |
| 1733 | `skill_init` | weapon.js | Partial — initializes JS skill state; role-table fidelity still pending |
| 1809 | `setmnotwielded` | weapon.js | Implemented — clear W_WEP from owornmask |

### were.c -> were.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 48 | `counter_were` | - | Missing |
| 96 | `new_were` | - | Missing |
| 232 | `set_ulycn` | - | Missing |
| 70 | `were_beastie` | - | Missing |
| 9 | `were_change` | - | Missing |
| 142 | `were_summon` | - | Missing |
| 213 | `you_unwere` | - | Missing |
| 192 | `you_were` | - | Missing |

### wield.c -> wield.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 133 | `cant_wield_corpse` | wield.js | Implemented — cockatrice petrification stub |
| 153 | `empty_handed` | wield.js | Implemented — description when not wielding |
| 164 | `ready_weapon` | wield.js | Implemented — core wield logic with two-weapon compat |
| 271 | `setuqwep` | wield.js | Implemented — set quiver slot |
| 280 | `setuswapwep` | wield.js | Implemented — set swap weapon slot |
| 289 | `ready_ok` | - | Missing — weapon readiness check |
| 326 | `wield_ok` | - | Missing — wield validation |
| 341 | `finish_splitting` | - | Missing — stack splitting after wield |
| 350 | `dowield` | wield.js | handleWield — w command |
| 456 | `doswapweapon` | wield.js | handleSwapWeapon — x command |
| 500 | `dowieldquiver` | wield.js | handleQuiver — Q command |
| 507 | `doquiver_core` | wield.js | handleQuiver — Q command |
| 678 | `wield_tool` | wield.js | Implemented — wield tool during apply |
| 756 | `can_twoweapon` | wield.js | Implemented — full TWOWEAPOK checks |
| 804 | `drop_uswapwep` | wield.js | Implemented — drop secondary weapon |
| 829 | `set_twoweap` | wield.js | Implemented — toggle two-weapon flag |
| 836 | `dotwoweapon` | wield.js | handleTwoWeapon — #twoweapon with rnd(20) dex check |
| 864 | `uwepgone` | wield.js | Implemented — force-remove main weapon |
| 879 | `uswapwepgone` | wield.js | Implemented — force-remove swap weapon |
| 888 | `uqwepgone` | wield.js | Implemented — force-remove quiver |
| 897 | `untwoweapon` | wield.js | Implemented — disable two-weapon mode |
| 909 | `chwepon` | wield.js | Implemented — enchant/corrode weapon (rn2(3) evaporate, rn2(7) vibrate) |
| 1042 | `welded` | wield.js | Implemented — uses will_weld() for cursed check |
| 1052 | `weldmsg` | wield.js | Implemented — weld message |
| 1069 | `mwelded` | wield.js | Implemented — monster version of welded() |

### windows.c -> —
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1785 | `add_menu` | - | Missing |
| 1816 | `add_menu_heading` | - | Missing |
| 1832 | `add_menu_str` | - | Missing |
| 342 | `addto_windowchain` | - | Missing |
| 1769 | `adjust_menu_promptstyle` | - | Missing |
| 231 | `check_tty_wincap` | - | Missing |
| 241 | `check_tty_wincap2` | - | Missing |
| 1644 | `choose_classes_menu` | - | Missing |
| 267 | `choose_windows` | - | Missing |
| 372 | `commit_windowchain` | - | Missing |
| 1439 | `decode_glyph` | - | Missing |
| 1466 | `decode_mixed` | - | Missing |
| 206 | `def_raw_print` | - | Missing |
| 215 | `def_wait_synch` | - | Missing |
| 1328 | `dump_add_menu` | - | Missing |
| 1300 | `dump_clear_nhwindow` | - | Missing |
| 1267 | `dump_close_log` | - | Missing |
| 1293 | `dump_create_nhwindow` | - | Missing |
| 1314 | `dump_destroy_nhwindow` | - | Missing |
| 1307 | `dump_display_nhwindow` | - | Missing |
| 1348 | `dump_end_menu` | - | Missing |
| 1126 | `dump_fmtstr` | - | Missing |
| 1276 | `dump_forward_putstr` | - | Missing |
| 1244 | `dump_open_log` | - | Missing |
| 1286 | `dump_putstr` | - | Missing |
| 1366 | `dump_redirect` | - | Missing |
| 1359 | `dump_select_menu` | - | Missing |
| 1321 | `dump_start_menu` | - | Missing |
| 1428 | `encglyph` | - | Missing |
| 193 | `genl_can_suspend_no` | - | Missing |
| 199 | `genl_can_suspend_yes` | - | Missing |
| 1539 | `genl_display_file` | - | Missing |
| 472 | `genl_getmsghistory` | - | Missing |
| 451 | `genl_message_menu` | - | Missing |
| 461 | `genl_preference_update` | - | Missing |
| 1528 | `genl_putmixed` | - | Missing |
| 489 | `genl_putmsghistory` | - | Missing |
| 922 | `genl_status_enablefield` | - | Missing |
| 909 | `genl_status_finish` | - | Missing |
| 893 | `genl_status_init` | - | Missing |
| 937 | `genl_status_update` | - | Missing |
| 1841 | `get_menu_coloring` | - | Missing |
| 1868 | `getlin` | - | Missing |
| 1419 | `glyph2symidx` | - | Missing |
| 1410 | `glyph2ttychar` | - | Missing |
| 1397 | `has_color` | - | Missing |
| 714 | `hup_add_menu` | - | Missing |
| 793 | `hup_change_color` | - | Missing |
| 784 | `hup_cliparound` | - | Missing |
| 697 | `hup_create_nhwindow` | - | Missing |
| 872 | `hup_ctrl_nhwindow` | - | Missing |
| 762 | `hup_curs` | - | Missing |
| 776 | `hup_display_file` | - | Missing |
| 769 | `hup_display_nhwindow` | - | Missing |
| 730 | `hup_end_menu` | - | Missing |
| 643 | `hup_exit_nhwindows` | - | Missing |
| 808 | `hup_get_color_string` | - | Missing |
| 683 | `hup_getlin` | - | Missing |
| 690 | `hup_init_nhwindows` | - | Missing |
| 829 | `hup_int_ndecl` | - | Missing |
| 676 | `hup_nh_poskey` | - | Missing |
| 657 | `hup_nhgetch` | - | Missing |
| 755 | `hup_outrip` | - | Missing |
| 744 | `hup_print_glyph` | - | Missing |
| 737 | `hup_putstr` | - | Missing |
| 704 | `hup_select_menu` | - | Missing |
| 801 | `hup_set_font_name` | - | Missing |
| 816 | `hup_status_update` | - | Missing |
| 865 | `hup_void_fdecl_constchar_p` | - | Missing |
| 842 | `hup_void_fdecl_int` | - | Missing |
| 849 | `hup_void_fdecl_winid` | - | Missing |
| 856 | `hup_void_fdecl_winid_ulong` | - | Missing |
| 835 | `hup_void_ndecl` | - | Missing |
| 664 | `hup_yn_function` | - | Missing |
| 1562 | `menuitem_invert_test` | - | Missing |
| 1600 | `mixed_to_glyphinfo` | - | Missing |
| 615 | `nhwindows_hangup` | - | Missing |
| 1856 | `select_menu` | - | Missing |
| 253 | `win_choices_find` | - | Missing |
| 169 | `wl_addhead` | - | Missing |
| 176 | `wl_addtail` | - | Missing |
| 157 | `wl_new` | - | Missing |

### wizard.c -> wizard.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 488 | `aggravate` | monmove.js | Faithful — wakes sleeping monsters, rn2(5) unfreeze chance; In_W_tower check omitted |
| 61 | `amulet` | - | Missing |
| 332 | `choose_stairs` | - | Missing |
| 511 | `clonewiz` | - | Missing |
| 840 | `cuss` | - | Missing |
| 468 | `has_aggravatables` | - | Missing |
| 779 | `intervene` | - | Missing |
| 106 | `mon_has_amulet` | - | Missing |
| 165 | `mon_has_arti` | - | Missing |
| 117 | `mon_has_special` | - | Missing |
| 585 | `nasty` | - | Missing |
| 202 | `on_ground` | - | Missing |
| 184 | `other_mon_has_arti` | - | Missing |
| 532 | `pick_nasty` | - | Missing |
| 709 | `resurrect` | - | Missing |
| 270 | `strategy` | - | Missing |
| 369 | `tactics` | - | Missing |
| 236 | `target_on` | - | Missing |
| 142 | `which_arti` | - | Missing |
| 809 | `wizdeadorgone` | - | Missing |
| 216 | `you_have` | - | Missing |

### wizcmds.c -> wizcmds.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 1199 | `contained_stats` | - | Missing |
| 1135 | `count_obj` | - | Missing |
| 1444 | `levl_sanity_check` | - | Missing |
| 1506 | `list_migrating_mons` | - | Missing |
| 110 | `makemap_remove_mons` | - | Missing |
| 73 | `makemap_unmakemon` | - | Missing |
| 1485 | `migrsort_cmp` | - | Missing |
| 1284 | `misc_stats` | - | Missing |
| 1257 | `mon_chain` | - | Missing |
| 1177 | `mon_invent_chain` | - | Missing |
| 1156 | `obj_chain` | - | Missing |
| 1460 | `sanity_check` | - | Missing |
| 1228 | `size_monst` | - | Missing |
| 1117 | `size_obj` | - | Missing |
| 1885 | `wiz_custom` | - | Missing |
| 229 | `wiz_detect` | - | Missing |
| 1705 | `wiz_display_macros` | - | Missing |
| 412 | `wiz_flip_level` | - | Missing |
| 549 | `wiz_fuzzer` | - | Missing |
| 203 | `wiz_genesis` | wizcmds.js:wizGenesis | APPROX — create monster |
| 50 | `wiz_identify` | - | Missing |
| 949 | `wiz_intrinsic` | - | Missing |
| 243 | `wiz_kill` | - | Missing |
| 446 | `wiz_level_change` | wizcmds.js:wizLevelChange | APPROX — wizard level teleport |
| 399 | `wiz_level_tele` | wizcmds.js:wizTeleport | APPROX — coordinate teleport |
| 841 | `wiz_levltyp_legend` | - | Missing |
| 353 | `wiz_load_lua` | - | Missing |
| 376 | `wiz_load_splua` | wizcmds.js:handleWizLoadDes | APPROX — load special level |
| 156 | `wiz_makemap` | - | Missing |
| 176 | `wiz_map` | wizcmds.js:wizMap | APPROX — reveal map |
| 693 | `wiz_map_levltyp` | - | Missing |
| 1827 | `wiz_migrate_mons` | - | Missing |
| 1784 | `wiz_mon_diff` | - | Missing |
| 534 | `wiz_panic` | - | Missing |
| 568 | `wiz_polyself` | - | Missing |
| 1102 | `wiz_rumor_check` | - | Missing |
| 576 | `wiz_show_seenv` | - | Missing |
| 1616 | `wiz_show_stats` | - | Missing |
| 621 | `wiz_show_vision` | - | Missing |
| 657 | `wiz_show_wmodes` | - | Missing |
| 885 | `wiz_smell` | - | Missing |
| 494 | `wiz_telekinesis` | - | Missing |
| 218 | `wiz_where` | - | Missing |
| 32 | `wiz_wish` | - | Missing |
| 1938 | `wizcustom_callback` | - | Missing |
| 1402 | `you_sanity_check` | - | Missing |

### worm.c -> worm.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 836 | `count_wsegs` | - | Missing |
| 852 | `create_worm_tail` | - | Missing |
| 373 | `cutworm` | - | Missing |
| 503 | `detect_wsegs` | - | Missing |
| 979 | `flip_worm_segs_horizontal` | - | Missing |
| 968 | `flip_worm_segs_vertical` | - | Missing |
| 120 | `initworm` | - | Missing |
| 738 | `place_worm_tail_randomly` | - | Missing |
| 615 | `place_wsegs` | - | Missing |
| 803 | `random_dir` | - | Missing |
| 990 | `redraw_worm` | - | Missing |
| 714 | `remove_worm` | - | Missing |
| 577 | `rest_worm` | - | Missing |
| 639 | `sanity_check_worm` | - | Missing |
| 528 | `save_worm` | - | Missing |
| 487 | `see_wsegs` | - | Missing |
| 175 | `shrink_worm` | - | Missing |
| 827 | `size_wseg` | - | Missing |
| 146 | `toss_wsegs` | - | Missing |
| 898 | `worm_cross` | - | Missing |
| 883 | `worm_known` | - | Missing |
| 196 | `worm_move` | - | Missing |
| 288 | `worm_nomove` | - | Missing |
| 308 | `wormgone` | - | Missing |
| 344 | `wormhitu` | - | Missing |
| 682 | `wormno_sanity_check` | - | Missing |
| 946 | `wseg_at` | - | Missing |

### worn.c -> worn.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 50 | `recalc_telepat_range` | - | Missing — telepathy range recalculation |
| 73 | `setworn` | worn.js | Implemented — set worn item in slot with owornmask |
| 147 | `setnotworn` | worn.js | Implemented — clear worn item (item destroyed while worn) |
| 180 | `allunworn` | worn.js | Implemented — clear all worn items |
| 198 | `wearmask_to_obj` | worn.js | Implemented — get object for wornmask |
| 210 | `wornmask_to_armcat` | worn.js | Implemented — mask to armor category |
| 242 | `armcat_to_wornmask` | worn.js | Implemented — armor category to mask |
| 274 | `wearslot` | worn.js | Implemented — valid slots for object |
| 347 | `check_wornmask_slots` | - | Missing — sanity check for worn slots |
| 466 | `mon_set_minvis` | worn.js | Implemented — set monster invisible |
| 478 | `mon_adjust_speed` | worn.js | Implemented — monster speed from equipment |
| 569 | `update_mon_extrinsics` | worn.js | Implemented — set/clear monster mextrinsics |
| 707 | `find_mac` | worn.js | Implemented — calculate monster AC from worn armor |
| 747 | `m_dowear` | worn.js | Implemented — monster equip armor |
| 789 | `m_dowear_type` | worn.js | Implemented — equip specific armor type |
| 996 | `which_armor` | - | Missing — get worn armor by slot |
| 1030 | `m_lose_armor` | worn.js | Implemented — monster lose armor piece |
| 1045 | `clear_bypass` | worn.js | Stub — bypass system not needed |
| 1060 | `clear_bypasses` | worn.js | Stub — bypass system not needed |
| 1109 | `bypass_obj` | worn.js | Stub — bypass system not needed |
| 1117 | `bypass_objlist` | - | Missing — bypass system stub |
| 1132 | `nxt_unbypassed_obj` | worn.js | Stub — bypass system not needed |
| 1149 | `nxt_unbypassed_loot` | worn.js | Stub — bypass system not needed |
| 1167 | `mon_break_armor` | worn.js | Implemented — armor removal on polymorph |
| 1329 | `extra_pref` | worn.js | Implemented — speed boots preference |
| 1350 | `racial_exception` | worn.js | Implemented — hobbit+elven armor |
| 1367 | `extract_from_minvent` | worn.js | Implemented — centralized monster inventory removal |

### write.c -> write.js
| C Line | C Function | JS Line | Alignment |
|--------|------------|---------|-----------|
| 74 | `dowrite` | - | Missing |
| 395 | `new_book_description` | - | Missing |
| 61 | `write_ok` | - | Missing |

### zap.c -> zap.js
`zap.js` now has named surfaces for all mapped `zap.c` functions; this section tracks the **remaining missing logic depth** rather than missing symbols.

| C Area | Remaining Gap In JS |
|--------|----------------------|
| `zapyourself`, `zap_steed`, `bhitm` | Large portions of per-wand/per-spell edge behavior and exact message/resistance sequencing remain partial. |
| `cancel_monst` | Hero cancellation path and non-hero shape/cancel-kill edge cases are incomplete versus C. |
| `revive`, `montraits`, `get_*_location` | Corpse/container/buried/migrating handling and trait restoration semantics are simplified. |
| `zap_over_floor`, `melt_ice*`, `start_melt_ice_timeout` | Many elemental terrain transformations (web/pool/moat/lava/iron-bars/door richness and timer lifecycle) are partial. |
| `maybe_destroy_item` + destruction side effects | Detailed item-destruction outcomes, messages, and HP side effects are still approximated. |
| `poly_obj`, `obj_shudders`, `polyuse`, `create_polymon`, `do_osshock` | Polymorph/object-material pipelines are structurally present but still approximate in selection and side effects. |
| `backfire`, `break_wand` | Explosion typing, damage semantics, and edge feedback differ from C in several cases. |
| `zhitu`-equivalent hero beam damage flow | Direct hero-hit branch exists in beam loop but is not a full C-faithful `zhitu` pipeline. |
| `spell_hit_bonus` | Uses simplified JS skill mapping rather than full C `spell_skilltype()`/`P_SKILL` integration. |
