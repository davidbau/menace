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
| `[~]` | allmain.c | allmain.js | Main game loop, newgame, moveloop. JS: split across `nethack.js`, `menace.js` |
| `[N/A]` | alloc.c | — | Memory allocation (nhalloc, nhfree). JS uses GC |
| `[~]` | apply.c | apply.js | Applying items (doapply, dojump, dorub). JS: partially in `commands.js` |
| `[~]` | artifact.c | artifact.js | Artifact creation and effects |
| `[~]` | attrib.c | attrib.js | Attribute system. JS: partially in `attrib_exercise.js` |
| `[~]` | ball.c | ball.js | Ball & chain handling |
| `[a]` | bones.c | bones.js | Bones file save/load. All 9 functions aligned; 3 static TODO (no_bones_level, goodfruit, fixuporacle) |
| `[~]` | botl.c | botl.js | Bottom status line |
| `[x]` | calendar.c | calendar.js | Time, moon phase, Friday 13th, night/midnight. Affects gameplay |
| `[N/A]` | cfgfiles.c | — | Config file parsing. JS: `storage.js` handles config differently |
| `[~]` | cmd.c | cmd.js | Command dispatch. JS: `commands.js`, `input.js` |
| `[N/A]` | coloratt.c | — | Terminal color attribute mapping |
| `[N/A]` | date.c | — | Build date/version stamps |
| `[~]` | dbridge.c | dbridge.js | Drawbridge mechanics |
| `[~]` | decl.c | decl.js | Global variable declarations. JS: spread across modules |
| `[~]` | detect.c | detect.js | Detection spells and scrolls |
| `[~]` | dig.c | dig.js | Digging mechanics |
| `[~]` | display.c | display.js | Display/rendering. JS file exists but may diverge |
| `[N/A]` | dlb.c | — | Data librarian (file bundling). Not needed in JS |
| `[a]` | do.c | do.js | Miscellaneous actions. handleDrop/handleDownstairs/handleUpstairs (dodrop/dodown/doup); ~45 functions TODO |
| `[~]` | do_name.c | do_name.js | Naming things (docallcmd, do_mgivenname) |
| `[a]` | do_wear.c | do_wear.js | Wearing/removing armor and accessories. handleWear/handlePutOn/handleTakeOff (dowear/doputon/dotakeoff); ~68 functions TODO |
| `[a]` | dog.c | dog.js | Pet behavior. dogfood in dog.js; makedog/mon_arrive in u_init.js; losedogs/keepdogs/migrate TODO |
| `[a]` | dogmove.c | dogmove.js | Pet movement AI. All functions except `quickmimic` |
| `[~]` | dokick.c | dokick.js | Kicking mechanics |
| `[~]` | dothrow.c | dothrow.js | Throwing mechanics |
| `[a]` | drawing.c | symbols.js | Symbol/glyph drawing tables and lookup functions. Data tables in symbols.js; 3 lookup functions implemented |
| `[~]` | dungeon.c | dungeon.js | Dungeon structure and level management |
| `[a]` | eat.c | eat.js | Eating mechanics. handleEat (doeat) implemented; ~50 functions TODO |
| `[~]` | end.c | end.js | Game over, death, scoring |
| `[~]` | engrave.c | engrave.js | Engraving mechanics. JS: `engrave_data.js` is data only |
| `[a]` | exper.c | exper.js | Experience and leveling. newuexp, newexplevel, pluslvl implemented; experience, more_experienced, losexp, newpw, enermod, rndexp TODO |
| `[~]` | explode.c | explode.js | Explosion effects |
| `[~]` | extralev.c | extralev.js | Special level generation helpers |
| `[N/A]` | files.c | — | File I/O operations. JS: `storage.js` |
| `[~]` | fountain.c | fountain.js | Fountain effects |
| `[~]` | getpos.c | getpos.js | Position selection UI |
| `[~]` | glyphs.c | glyphs.js | Glyph system. JS: partially in `display.js`, `symbols.js` |
| `[~]` | hack.c | — | Core movement and actions. JS: split across multiple files |
| `[a]` | hacklib.c | hacklib.js | String/char utilities. All C functions implemented; in-place string ops return new strings in JS |
| `[~]` | iactions.c | iactions.js | Item actions context menu |
| `[~]` | insight.c | insight.js | Player knowledge/enlightenment |
| `[a]` | invent.c | invent.js | Inventory management. handleInventory/buildInventoryOverlayLines/compactInvletPromptChars (ddoinv/display_inventory/compactify); ~80 functions TODO |
| `[x]` | isaac64.c | isaac64.js | ISAAC64 PRNG. All 8 functions matched |
| `[~]` | light.c | light.js | Light source management |
| `[~]` | lock.c | lock.js | Lock picking and door opening |
| `[N/A]` | mail.c | — | In-game mail system (uses real mail on Unix) |
| `[a]` | makemon.c | makemon.js | Monster creation. Core functions aligned; clone_mon/propagate TODO |
| `[~]` | mcastu.c | mcastu.js | Monster spellcasting. castmu/buzzmu and all 11 spell functions TODO (runtime gameplay) |
| `[N/A]` | mdlib.c | — | Metadata library utilities |
| `[~]` | mhitm.c | mhitm.js | Monster-vs-monster combat. mattackm/mdamagem RNG parity PARTIAL in dogmove.js; full implementation TODO |
| `[a]` | mhitu.c | mhitu.js | Monster-vs-hero combat. monsterAttackPlayer implemented; 22 functions TODO |
| `[~]` | minion.c | minion.js | Minion summoning: msummon, summon_minion, demon_talk, bribe, guardian angels. All 14 functions TODO (runtime gameplay) |
| `[~]` | mklev.c | mklev.js | Level generation. makelevel/makerooms/makecorridors/mineralize PARTIAL in dungeon.js; topologize/mkinvokearea/place_branch TODO |
| `[~]` | mkmap.c | mkmap.js | Map generation algorithms. JS: in `sp_lev.js` |
| `[~]` | mkmaze.c | mkmaze.js | Maze generation. wallification/create_maze/makemaz PARTIAL in dungeon.js; water plane (movebubbles etc.) TODO; save/restore N/A |
| `[~]` | mkobj.c | mkobj.js | Object creation |
| `[~]` | mkroom.c | mkroom.js | Room generation. somex/somey/inside_room/somexy/somexyspace ALIGNED in dungeon.js; mkshop/mktemple/fill_zoo PARTIAL; save/restore N/A |
| `[a]` | mon.c | mon.js | Monster lifecycle: movemon, mfndpos, mm_aggression, corpse_chance, passivemm, hider premove, zombie_maker, zombie_form, undead_to_corpse, genus, pm_to_cham |
| `[a]` | mondata.c | mondata.js | Monster data queries: predicates, mon_knows_traps, passes_bars, dmgtype, hates_silver, sticks, etc. |
| `[a]` | monmove.c | monmove.js | Monster movement: dochug, m_move, m_move_aggress, set_apparxy, m_search_items |
| `[~]` | monst.c | monst.js | Monster data tables. mons[] array PARTIAL in monsters.js (JS-native structure); monst_globals_init implicit in module load |
| `[~]` | mplayer.c | mplayer.js | Player-character rival monsters (endgame + ghost-level). is_mplayer() in mondata.js; rnd_offensive/defensive/misc_item in makemon.js; mk_mplayer/create_mplayers/mplayer_talk TODO (endgame not yet modeled) |
| `[a]` | mthrowu.c | mthrowu.js | Monster ranged attacks: m_throw, thrwmu, lined_up, select_rwep, monmulti |
| `[~]` | muse.c | muse.js | Monster item usage AI |
| `[~]` | music.c | music.js | Musical instruments |
| `[N/A]` | nhlobj.c | — | Lua object bindings (l_obj_*). All 21 functions are Lua C API wrappers; JS port uses direct function calls (object(), monster() in sp_lev.js) with no Lua interpreter |
| `[N/A]` | nhlsel.c | — | Lua selection bindings (l_selection_*). All ~40 functions wrap selvar.c for Lua; JS port uses the `selection` object exported from sp_lev.js directly |
| `[N/A]` | nhlua.c | — | Lua interpreter integration |
| `[N/A]` | nhmd4.c | — | MD4 hash implementation |
| `[a]` | o_init.c | o_init.js | Object class initialization. Core shuffle functions aligned; setgemprobs, obj_shuffle_range, objdescr_is added; discovery functions in `discovery.js` |
| `[a]` | objects.c | objects.js | Object data tables. objects.js is auto-generated from objects.h (same source as C); objects_globals_init implicit in module load |
| `[~]` | objnam.c | objnam.js | Object naming (xname, doname, makeplural, readobjnam/wishing). All functions TODO; no JS object naming yet |
| `[~]` | options.c | options.js | Game options. JS: `options_menu.js`, `storage.js` |
| `[~]` | pager.c | pager.js | Text pager and look/describe commands. pager.js has text pager only; help commands in commands.js; game look functions (do_look, lookat, waterbody_name) not yet in JS |
| `[~]` | pickup.c | pickup.js | Picking up items |
| `[~]` | pline.c | pline.js | Message output. pline/putmesg PARTIAL via display.putstr_message(); impossible PARTIAL via console.error; livelog/gamelog TODO |
| `[~]` | polyself.c | polyself.js | Polymorphing |
| `[a]` | potion.c | potion.js | Potion effects. handleQuaff (dodrink) with healing; ~60 functions TODO |
| `[~]` | pray.c | pray.js | Prayer mechanics, sacrifice, turning undead, deity interaction. All 45 functions TODO (runtime gameplay) |
| `[~]` | priest.c | priest.js | Priest behavior, temple management, shrine, minion roamers. move_special() PARTIAL in monmove.js:679; all other functions TODO |
| `[~]` | quest.c | quest.js | Quest mechanics. All 22 functions are runtime gameplay (NPC dialog, eligibility, expulsion); none in JS |
| `[~]` | questpgr.c | questpgr.js | Quest text pager. com_pager_core N/A (Lua interpreter); is_quest_artifact PARTIAL in objdata.js:54; all other functions TODO |
| `[a]` | read.c | read.js | Reading scrolls/spellbooks. handleRead (doread) with spellbook study; ~50 functions TODO |
| `[x]` | rect.c | rect.js | Rectangle allocation for room placement |
| `[~]` | region.c | region.js | Region effects (gas clouds, etc.). No runtime regions in JS; all functions TODO |
| `[N/A]` | report.c | — | Bug reporting, panic trace |
| `[~]` | restore.c | restore.js | Game state restoration. All functions N/A (JS uses storage.js/IndexedDB with different format) |
| `[a]` | rip.c | display.js | RIP screen. genl_outrip as Display.renderTombstone (method); center() inlined |
| `[x]` | rnd.c | rng.js | Random number generation |
| `[~]` | role.c | role.js | Role/race/gender/alignment selection. roles[] data in player.js; ok_role/ok_race/ok_align PARTIAL in nethack.js; role_init PARTIAL in nethack.js+u_init.js; Hello() in player.js; all others TODO |
| `[~]` | rumors.c | rumors.js | Rumor/oracle/CapitalMon system. JS: `rumor_data.js` (data); unpadline/init_rumors/get_rnd_line in `hacklib.js`; getrumor inlined in `dungeon.js`; outoracle/doconsult/CapitalMon TODO |
| `[~]` | save.c | save.js | Game state serialization. All functions N/A (JS uses storage.js/IndexedDB with different format; GC replaces freedynamicdata) |
| `[a]` | selvar.c | — | Selection geometry. JS: `selection` object in `sp_lev.js`. All major geometry functions aligned including ellipse/gradient/is_irregular/size_description |
| `[N/A]` | sfbase.c | — | Save file base I/O routines |
| `[N/A]` | sfstruct.c | — | Save file structure definitions |
| `[~]` | shk.c | — | Shopkeeper behavior. JS: partially in `shknam.js` |
| `[a]` | shknam.c | shknam.js | Shop naming and stocking. All C functions aligned; hallucination in shkname/is_izchak and in_town() in is_izchak deferred |
| `[~]` | sit.c | sit.js | Sitting effects. All 7 functions (dosit, rndcurse, attrcurse, take_gold, throne_sit_effect, special_throne_effect, lay_an_egg) are TODO stubs |
| `[~]` | sounds.c | sounds.js | Monster sounds, ambient room sounds, chat. dosounds() partial in nethack.js/headless_runtime.js; domonnoise/growl/yelp/whimper/beg/dotalk TODO; sound library N/A |
| `[~]` | sp_lev.c | sp_lev.js | Special level interpreter |
| `[ ]` | spell.c | — | Spell casting |
| `[~]` | stairs.c | stairs.js | Stairway linked-list management and hero placement. JS uses map.upstair/dnstair objects (no linked list); u_on_upstairs/dnstairs → getArrivalPosition in level_transition.js; stairway_find_*, On_stairs_*, stairs_description TODO |
| `[~]` | steal.c | steal.js | Monster stealing. `findgold` in makemon.js; drop logic partially inline in monmove.js; all steal/mpickobj/relobj/mdrop_obj unimplemented |
| `[~]` | steed.c | steed.js | Riding steeds. put_saddle_on_mon partially inline in u_init.js; all 15 functions are TODO stubs |
| `[N/A]` | strutil.c | — | String utilities (strbuf, pmatch). JS: native string ops |
| `[N/A]` | symbols.c | — | Terminal graphics mode management (ASCII/IBM/curses/UTF-8 symbol-set switching). Browser port uses static data in symbols.js; no runtime mode switching |
| `[N/A]` | sys.c | — | System-level interface |
| `[~]` | teleport.c | teleport.js | Teleportation. goodpos/collect_coords/enexto PARTIAL in dungeon.js; all runtime tele functions TODO |
| `[~]` | timeout.c | timeout.js | Timer-based effects. run_timers/start_timer/stop_timer/nh_timeout all TODO; start_corpse_timeout/attach_egg_hatch_timeout PARTIAL in mkobj.js (RNG-parity only); save/restore N/A |
| `[a]` | topten.c | topten.js | High score table. observable_depth implemented; I/O funcs N/A; encode/format funcs TODO |
| `[p]` | track.c | track.js | Player tracking for pets. save/rest not yet implemented |
| `[a]` | trap.c | trap.js | Trap mechanics: m_harmless_trap, floor_trigger, mintrap_postmove, mon_check_in_air |
| `[a]` | u_init.c | u_init.js | Player initialization. u_init_role, u_init_race, u_init_carry_attr_boost, trquan, ini_inv, ini_inv_mkobj_filter, restricted_spell_discipline aligned. JS-only wrappers: simulatePostLevelInit, initAttributes |
| `[a]` | uhitm.c | uhitm.js | Hero-vs-monster combat. playerAttackMonster implemented; 93 functions TODO |
| `[N/A]` | utf8map.c | — | UTF-8 glyph mapping for terminal |
| `[~]` | vault.c | `vault.js` | Vault guard behavior |
| `[N/A]` | version.c | — | Version info |
| `[a]` | vision.c | vision.js | FOV / LOS. Core algorithm (view_from, right_side, left_side, clear_path, do_clear_area) matches C. block_point/dig_point/rogue_vision TODO |
| `[~]` | weapon.c | `weapon.js` | Weapon skills, hit/damage bonuses, monster weapon AI. abon→player.strToHit, dbon→player.strDamage (player.js); select_rwep partial in mthrowu.js. |
| `[a]` | were.c | were.js | Lycanthropy. 6 of 8 functions aligned; you_were/you_unwere TODO (need polymon/rehumanize) |
| `[~]` | wield.c | `wield.js` | Wielding weapons. dowield→handleWield(commands.js:2371), doswapweapon→handleSwapWeapon(commands.js:3477) partial. |
| `[N/A]` | windows.c | — | Windowing system interface. JS: `display.js`, `browser_input.js` |
| `[~]` | wizard.c | wizard.js | Wizard of Yendor AI. All 21 functions are runtime gameplay AI; none implemented in JS |
| `[~]` | wizcmds.c | wizcmds.js | Wizard-mode debug commands. wiz_level_tele/wiz_map/wiz_genesis/wiz_wish/wiz_identify PARTIAL in commands.js; Lua commands N/A; sanity checks and advanced debug TODO |
| `[~]` | worm.c | worm.js | Long worm mechanics. save/rest_worm are N/A (no save file). All 24 other functions are TODO stubs |
| `[~]` | worn.c | `worn.js` | Equipment slot management |
| `[a]` | write.c | write.js | Writing on scrolls. cost, write_ok, new_book_description implemented; dowrite TODO |
| `[a]` | zap.c | zap.js | Wand beam effects. zhitm, zap_hit, resist, burnarmor, xkilled, corpse_chance, dobuzz implemented. dozap/weffects/bhitm/revive/polyuse and many others TODO |

### Summary

- **Total C files**: 129
- **N/A (system/platform)**: 22
- **Game logic files**: 107
- **Complete (`[x]`)**: 4
- **Aligned (`[a]`)**: 30
- **Present (`[p]`)**: 1
- **Needs alignment (`[~]`)**: 71
- **No JS file yet (`[ ]`)**: 1 (spell.c)

### JS Files Without C Counterparts

These JS files don't directly correspond to a single C file:

| JS File | Purpose | C Counterparts |
|---------|---------|----------------|
| animation_examples.js | Animation demo data | None (JS-only) |
| animations.js | Visual animations | None (JS-only) |
| attrib_exercise.js | Attribute exercise tracking | attrib.c |
| browser_input.js | Browser keyboard/mouse input | None (JS-only) |
| commands.js | Command dispatch | cmd.c, apply.c, do.c, etc. |
| config.js | Game configuration | decl.c, options.c |
| delay.js | Delay/animation timing | None (JS-only) |
| discovery.js | Object identification | o_init.c, invent.c |
| display_rng.js | Display-layer RNG | rnd.c |
| engrave_data.js | Engraving text data | engrave.c |
| epitaph_data.js | Epitaph text data | engrave.c |
| floor_objects.js | Floor object display | pickup.c, invent.c |
| headless_runtime.js | Headless test runtime | None (JS-only) |
| input.js | Input handling/replay | None (JS-only) |
| keylog.js | Keystroke logging | None (JS-only) |
| level_transition.js | Level change logic | do.c, stairs.c |
| map.js | Map data structure | hack.c, mklev.c |
| menace.js | Main game entry point | allmain.c |
| monsters.js | Monster data tables | monst.c |
| nethack.js | Game orchestration | allmain.c |
| objdata.js | Object property queries | objnam.c, mkobj.c |
| options_menu.js | Options UI | options.c |
| player.js | Player state and roles | role.c, decl.c |
| replay_core.js | Session replay/comparison | None (JS-only, test infra) |
| rumor_data.js | Rumor text data | rumors.c |
| special_levels.js | Special level registry | sp_lev.c, extralev.c |
| storage.js | Save/load/config | save.c, restore.c, files.c |
| xoshiro256.js | Xoshiro256 PRNG | None (JS-only, display RNG) |

---

## Function-Level Details

### isaac64.c → isaac64.js

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `lower_bits` | 39 | `lower_bits` | 14 | Match |
| `upper_bits` | 45 | `upper_bits` | 20 | Match |
| `isaac64_update` | 50 | `isaac64_update` | 39 | Match |
| `isaac64_mix` | 103 | `isaac64_mix` | 25 | Match |
| `isaac64_init` | 118 | `isaac64_init` | 111 | Match (exported) |
| `isaac64_reseed` | 124 | `isaac64_reseed` | 126 | Match (exported) |
| `isaac64_next_uint64` | 161 | `isaac64_next_uint64` | 178 | Match (exported) |
| `isaac64_next_uint` | 166 | `isaac64_next_uint` | 184 | Match (exported, added) |

### hacklib.c → hacklib.js

Note: C functions that modify strings in-place return new strings in JS (immutable strings).
`xcrypt(str, buf)` in C → `xcrypt(str)` in JS (no output buffer).
`nh_deterministic_qsort` takes a JS array directly rather than raw byte pointer.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `nh_deterministic_qsort` | 36 | `nh_deterministic_qsort` | 504 | Match (exported; JS array API instead of void*) |
| `digit` | 126 | `digit` | 14 | Match (exported) |
| `letter` | 133 | `letter` | 19 | Match (exported) |
| `highc` | 140 | `highc` | 24 | Match (exported) |
| `lowc` | 147 | `lowc` | 31 | Match (exported) |
| `lcase` | 154 | `lcase` | 44 | Match (exported; returns new string) |
| `ucase` | 166 | `ucase` | 49 | Match (exported; returns new string) |
| `upstart` | 178 | `upstart` | 54 | Match (exported; returns new string) |
| `upwords` | 187 | `upwords` | 60 | Match (exported; returns new string) |
| `mungspaces` | 206 | `mungspaces` | 86 | Match (exported; returns new string) |
| `trimspaces` | 228 | `trimspaces` | 102 | Match (exported; returns new string) |
| `strip_newline` | 244 | `strip_newline` | 107 | Match (exported; returns new string) |
| `eos` | 258 | `eos` | 119 | Match (exported; returns length, not pointer) |
| `c_eos` | 267 | `c_eos` | 124 | Match (exported; returns length, not pointer) |
| `str_start_is` | 277 | `str_start_is` | 134 | Match (exported) |
| `str_end_is` | 305 | `str_end_is` | 141 | Match (exported) |
| `str_lines_maxlen` | 316 | `str_lines_maxlen` | 146 | Match (exported) |
| `strkitten` | 340 | `strkitten` | 162 | Match (exported; returns new string) |
| `copynchars` | 351 | `copynchars` | 168 | Match (exported; no dst arg, returns new string) |
| `chrcasecpy` | 365 | `chrcasecpy` | 177 | Match (exported) |
| `strcasecpy` | 387 | `strcasecpy` | 188 | Match (exported; returns new string) |
| `s_suffix` | 409 | `s_suffix` | 206 | Match (exported) |
| `ing_suffix` | 427 | `ing_suffix` | 215 | Match (exported) |
| `xcrypt` | 464 | `xcrypt` | 326 | Match (exported; JS takes str only, no buf arg) |
| `onlyspace` | 483 | `onlyspace` | 255 | Match (exported) |
| `tabexpand` | 493 | `tabexpand` | 264 | Match (exported; returns new string) |
| `visctrl` | 533 | `visctrl` | 281 | Match (exported; no rotating static buffers needed) |
| `stripchars` | 560 | `stripchars` | 308 | Match (exported; no bp arg, (orig, stuff_to_strip) → new string) |
| `stripdigits` | 584 | `stripdigits` | 317 | Match (exported; returns new string) |
| `strsubst` | 599 | `strsubst` | 329 | Match (exported; returns new string) |
| `strNsubst` | 619 | `strNsubst` | 338 | Match (exported; returns new string; C return count not preserved) |
| `findword` | 663 | `findword` | 369 | Match (exported; returns slice of list from match, or null) |
| `ordin` | 689 | `ordin` | 439 | Match (exported) |
| `sitoa` | 701 | `sitoa` | 446 | Match (exported) |
| `sgn` | 714 | `sgn` | 451 | Match (exported) |
| `distmin` | 720 | `distmin` | 461 | Match (exported) |
| `dist2` | 737 | `dist2` | 467 | Match (exported) |
| `isqrt` | 746 | `isqrt` | 473 | Match (exported; uses Math.sqrt) |
| `online2` | 768 | `online2` | 478 | Match (exported) |
| `strncmpi` | 781 | `strncmpi` | 397 | Match (exported) |
| `strstri` | 803 | `strstri` | 412 | Match (exported; returns slice from match, or null) |
| `fuzzymatch` | 848 | `fuzzymatch` | 419 | Match (exported) |
| `swapbits` | 894 | `swapbits` | 489 | Match (exported) |
| `nh_snprintf` | 917 | — | — | N/A — JS has native string formatting |
| `unicodeval_to_utf8str` | 944 | — | — | N/A — JS handles Unicode natively |
| `case_insensitive_comp` | 986 | — | — | N/A — use strncmpi or toLowerCase() |
| `copy_bytes` | 1004 | — | — | N/A — file I/O not applicable to browser port |
| `datamodel` | 1037 | — | — | N/A — platform data model detection not needed |

### o_init.c → o_init.js (and discovery.js)

The core object-shuffle functions live in `o_init.js` under C-matching names.
Discovery/identification functions split into `discovery.js` (camelCase, noted below).

| C Function | C Line | JS File | JS Function | JS Line | Status |
|------------|--------|---------|-------------|---------|--------|
| `shuffle_tiles` | 34 | — | — | — | N/A — tile graphics not in JS port |
| `setgemprobs` | 53 | o_init.js | `setgemprobs` | — | Match (exported) |
| `randomize_gem_colors` | 84 | o_init.js | `randomize_gem_colors` | 79 | Match (private) |
| `shuffle` | 112 | o_init.js | `shuffle` | 107 | Match (private) |
| `init_objects` | 150 | o_init.js | `init_objects` | 204 | Match (exported) |
| `init_oclass_probs` | 239 | objects.js | `initObjectData` | 9183 | Split — merged with `bases[]` init; C ref noted |
| `obj_shuffle_range` | 268 | o_init.js | `obj_shuffle_range` | — | Match (exported) |
| `shuffle_all` | 321 | o_init.js | `shuffle_all` | 154 | Match (private) |
| `objdescr_is` | 351 | o_init.js | `objdescr_is` | — | Match (exported) |
| `oinit` | 368 | — | — | — | Subsumed — `init_objects` + `setgemprobs` cover this |
| `savenames` | 374 | discovery.js | `getDiscoveryState` | 178 | Renamed — save/restore via JSON; now also serializes extra disco entries |
| `restnames` | 410 | discovery.js | `setDiscoveryState` | 188 | Renamed — save/restore via JSON; restores extra disco entries (oc_uname path) |
| `observe_object` | 441 | discovery.js | `observeObject` | 105 | Renamed (camelCase) |
| `discover_object` | 448 | discovery.js | `discoverObject` | 64 | Renamed (camelCase) |
| `undiscover_object` | 492 | discovery.js | `undiscoverObject` | 75 | Renamed (camelCase); gem_learned TODO |
| `interesting_to_discover` | 520 | discovery.js | `interestingToDiscover` | 82 | Renamed (private, camelCase) |
| `discovered_cmp` | 543 | — | — | — | N/A — JS sort uses closures |
| `sortloot_descr` | 557 | — | — | — | N/A — merged into menu output |
| `choose_disco_sort` | 602 | — | — | — | TODO — sort-order menu not yet implemented |
| `disco_typename` | 652 | discovery.js | `discoveryTypeName` | 88 | Renamed (private) |
| `disco_append_typename` | 684 | — | — | — | Subsumed into `discoveryTypeName` |
| `disco_output_sorted` | 708 | — | — | — | Subsumed into `getDiscoveriesMenuLines` |
| `dodiscovered` | 731 | discovery.js | `getDiscoveriesMenuLines` | 123 | Renamed |
| `oclass_to_name` | 833 | — | — | — | Subsumed into `getDiscoveriesMenuLines` |
| `doclassdisco` | 845 | — | — | — | TODO — class-filtered discoveries command |
| `rename_disco` | 1062 | — | — | — | TODO — rename identified objects |

### were.c → were.js

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `were_change` | 9 | `were_change` | 95 | Match (exported, renamed from `runWereTurnEnd`) |
| `counter_were` | 48 | `counter_were` | 17 | Match (exported, renamed from `counterWere`) |
| `were_beastie` | 70 | `were_beastie` | 36 | Match |
| `new_were` | 96 | `new_were` | 72 | Match (exported, renamed from `applyWereFormChange`) |
| `were_summon` | 142 | `were_summon` | 163 | Match (tamedog path TODO) |
| `you_were` | 192 | — | — | TODO (needs polymon) |
| `you_unwere` | 213 | — | — | TODO (needs rehumanize) |
| `set_ulycn` | 232 | `set_ulycn` | 134 | Match (partial — needs set_uasmon) |

### dogmove.c → dogmove.js

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `dog_nutrition` | 155 | `dog_nutrition` | 114 | Match (internal, moved from dog.js) |
| `dog_eat` | 217 | `dog_eat` | 229 | Match (exported, moved from dog.js) |
| `dog_starve` | 342 | `dog_starve` | 291 | Match (internal) |
| `dog_hunger` | 356 | `dog_hunger` | 311 | Match (internal) |
| `cursed_object_at` | 144 | `cursed_object_at` | 381 | Match (internal) |
| `could_reach_item` | 1353 | `could_reach_item` | 392 | Match (exported) |
| `can_reach_location` | 1371 | `can_reach_location` | 417 | Match (internal) |
| `droppables` | 344 | `droppables` | 443 | Match (internal) |
| `dog_invent` | 392 | `dog_invent` | 525 | Match (internal) |
| `dog_goal` | 500 | (inlined in `dog_move`) | — | Inlined |
| `find_targ` | 654 | `find_targ` | 644 | Match (internal) |
| `find_friends` | 698 | `find_friends` | 676 | Match (internal) |
| `score_targ` | 742 | `score_targ` | 714 | Match (internal) |
| `best_target` | 842 | `best_target` | 775 | Match (internal) |
| `pet_ranged_attk` | 892 | `pet_ranged_attk` | 806 | Match (exported) |
| `dog_move` | 1016 | `dog_move` | 830 | Match (exported) |
| `finish_meating` | 1442 | `finish_meating` | 347 | Match (exported) |
| `mnum_leashable` | 1456 | `mnum_leashable` | 359 | Match (internal) |
| `quickmimic` | 1466 | — | — | TODO (needs mimic appearance system) |
| `max_mon_load` | 1908 | `max_mon_load` | 151 | Match (internal, moved from dog.js) |
| `curr_mon_load` | 1894 | `curr_mon_load` | 173 | Match (internal, moved from dog.js) |
| `can_carry` | 1971 | `can_carry` | 186 | Match (exported, moved from dog.js) |

### write.c → write.js

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `cost` | 14 | `cost` | 30 | Match (private — returns base charge cost for scroll/spellbook) |
| `write_ok` | 61 | `write_ok` | 46 | Match (private — getobj callback) |
| `dowrite` | 74 | `dowrite` | 62 | TODO (needs getobj, getlin, mksobj, useup, and full message system) |
| `new_book_description` | 395 | `new_book_description` | 71 | Match (private — JS returns string directly; no output-buffer argument) |

### bones.c → bones.js

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `no_bones_level` | 18 | — | — | TODO (static — check for special/quest/vibrating/astral levels) |
| `goodfruit` | 42 | — | — | TODO (static — check if fruit id usable on bones level) |
| `resetobjs` | 51 | `resetobjs` | 57 | Match (exported — cancel objects on save, rebuild displayChar on restore) |
| `sanitize_name` | 198 | `sanitize_name` | 193 | Match (exported — renamed from `sanitizeName`) |
| `give_to_nearby_mon` | 226 | `give_to_nearby_mon` | 128 | Match (exported — renamed from `giveToNearbyMon`) |
| `drop_upon_death` | 259 | `drop_upon_death` | 80 | Match (exported — renamed from `dropUponDeath`) |
| `fixuporacle` | 308 | — | — | TODO (static — restore oracle monster after bones load) |
| `can_make_bones` | 356 | `can_make_bones` | 40 | Match (exported — renamed from `canMakeBones`) |
| `remove_mon_from_bones` | 390 | `remove_mon_from_bones` | 172 | Match (exported — renamed from `removeMonFromBones`) |
| `savebones` | 403 | `savebones` | 207 | Match (exported) |
| `getbones` | 629 | `getbones` | 278 | Match (exported) |
| `set_ghostly_objlist` | 751 | `set_ghostly_objlist` | 157 | Match (exported — renamed from `setGhostlyObjlist`) |

### topten.c → topten.js

Notes:
- File I/O functions (readentry, writeentry, writexlentry, discardexcess) are N/A — JS uses localStorage.
- Terminal output functions (topten_print, topten_print_bold, outheader, outentry) are renamed in JS.
- CLI-mode functions (score_wanted, prscore, classmon) are N/A — browser port has no argv mode.
- `topten()` is split across buildEntry + saveScore + loadScores in JS.
- JS-only functions: `loadScores`, `saveScore`, `getPlayerRank`, `capitalize` (localStorage abstraction).

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `formatkiller` | 90 | — | — | TODO (needs killer format constants, an(), and game state svk.killer/gm.multi) |
| `topten_print` | 165 | — | — | N/A (terminal output — no terminal in JS port) |
| `topten_print_bold` | 174 | — | — | N/A (terminal output — no terminal in JS port) |
| `observable_depth` | 183 | `observable_depth` | 129 | Match (exported — endgame depth negative encoding deferred) |
| `discardexcess` | 208 | — | — | N/A (file I/O — JS uses JSON localStorage) |
| `readentry` | 220 | — | — | N/A (file I/O — JS uses `loadScores`) |
| `writeentry` | 301 | — | — | N/A (file I/O — JS uses `saveScore`) |
| `writexlentry` | 340 | — | — | N/A (xlogfile I/O — no xlogfile in browser) |
| `encodexlogflags` | 394 | — | — | TODO (needs wizard/discover/roleplay flags on player object) |
| `encodeconduct` | 411 | — | — | TODO (needs u.uconduct, num_genocides(), sokoban_in_play()) |
| `encodeachieve` | 455 | — | — | TODO (needs u.uachieved achievements array) |
| `add_achieveX` | 480 | — | — | TODO (static helper for encode_extended_achievements) |
| `encode_extended_achievements` | 491 | — | — | TODO (needs u.uachieved) |
| `encode_extended_conducts` | 584 | — | — | TODO (needs u.uconduct) |
| `free_ttlist` | 615 | — | — | N/A (GC handles memory in JS) |
| `topten` | 628 | `buildEntry` + `saveScore` + `loadScores` | 78,44,28 | Split — entry building + localStorage persistence |
| `outheader` | 929 | `formatTopTenHeader` | 115 | Renamed (JS returns string; no terminal I/O) |
| `outentry` | 946 | `formatTopTenEntry` | 105 | Renamed (JS returns lines array; no terminal I/O) |
| `score_wanted` | 1112 | — | — | N/A (CLI score query mode not in browser) |
| `prscore` | 1194 | — | — | N/A (CLI argc/argv scoring mode) |
| `classmon` | 1356 | — | — | N/A (CLI helper for prscore) |

### drawing.c → symbols.js

Notes:
- drawing.c is primarily data tables (defsyms[], def_monsyms[], def_oc_syms[]) embedded in symbols.js.
- Three lookup utility functions are implemented in symbols.js under C-matching names.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `def_char_to_objclass` | 91 | `def_char_to_objclass` | 997 | Match (exported — searches def_oc_syms[]) |
| `def_char_to_monclass` | 108 | `def_char_to_monclass` | 1005 | Match (exported — searches def_monsyms[]) |
| `def_char_is_furniture` | 120 | `def_char_is_furniture` | 1014 | Match (exported — uses S_upstair..S_fountain constants instead of scanning explanations) |

### symbols.c — N/A

All functions in symbols.c manage runtime terminal graphics mode switching
(ASCII / IBM PC graphics / curses / UTF-8 symbol sets). The browser JS port
uses static symbol data in symbols.js with no mode switching at runtime.

| C Function | C Line | Status |
|------------|--------|--------|
| `init_symbols` | 85 | N/A — symbol data is static in symbols.js |
| `init_showsyms` | 95 | N/A — no showsyms/primary_syms distinction in JS |
| `init_ov_rogue_symbols` | 113 | N/A — no rogue mode in JS |
| `init_ov_primary_symbols` | 122 | N/A — no primary symset in JS |
| `get_othersym` | 131 | N/A — no alternative symbol sets in JS |
| `init_primary_symbols` | 167 | N/A — static data |
| `init_rogue_symbols` | 187 | N/A — no rogue mode in JS |
| `assign_graphics` | 217 | N/A — no terminal graphics mode in JS |
| `switch_symbols` | 253 | N/A — no mode switching in JS |
| `update_ov_primary_symset` | 295 | N/A — no override symbol sets |
| `update_ov_rogue_symset` | 301 | N/A — no rogue symbol set |
| `update_primary_symset` | 307 | N/A — no primary symset |
| `update_rogue_symset` | 313 | N/A — no rogue symbol set |
| `clear_symsetentry` | 319 | N/A — no runtime symbol sets |
| `symset_is_compatible` | 353 | N/A — no symbol set loading |
| `proc_symset_line` | 431 | N/A — no config file parsing |
| `parse_sym_line` | 438 | N/A — no config file parsing |
| `set_symhandling` | 657 | N/A — no terminal handling modes |
| `load_symset` | 673 | N/A — no external symbol files in browser |
| `free_symsets` | 693 | N/A — GC handles memory |
| `savedsym_free` | 712 | N/A — GC handles memory |
| `savedsym_find` | 726 | N/A — no saved symbol overrides |
| `savedsym_add` | 739 | N/A — no saved symbol overrides |
| `savedsym_strbuf` | 757 | N/A — no saved symbol overrides |
| `parsesymbols` | 773 | N/A — no config file option parsing |
| `match_sym` | 852 | N/A — no config file option parsing |
| `do_symset` | 909 | N/A — no interactive options menu in JS |

### rip.c → display.js

Notes:
- rip.c has only 2 functions. `genl_outrip` is implemented as `Display.renderTombstone` (a class method).
- `center()` is a static helper that centers text — inlined in `renderTombstone`.
- The JS implementation correctly renders the tombstone ASCII art (C ref: rip.c rip[] template).

| C Function | C Line | JS Location | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `center` | 75 | — (inlined) | — | Inlined into `Display.renderTombstone` |
| `genl_outrip` | 85 | `Display.renderTombstone` | 1135 | Match (class method; winid/how/when replaced by name/gold/deathLines/year params) |

### dog.c → dog.js (and u_init.js)

Notes:
- `newedog`/`free_edog` are N/A (no edog struct in JS — edog fields set inline on monster).
- `makedog`, `mon_arrive`, `mon_catchup_elapsed_time` are in `u_init.js` (level transition module).
- `dogfood` is in `dog.js` under the C name.
- Many `mondata.h` predicates included in dog.js are from mondata.c (documented separately).
- `losedogs`, `keepdogs`, `migrate_to_level`, `discard_migrations` are partially in `u_init.js` (inlined into mon_arrive).
- JS-only helpers in dog.js: re-exports of dogmove.js functions, mondata predicates.

| C Function | C Line | JS File | JS Function | JS Line | Status |
|------------|--------|---------|-------------|---------|--------|
| `newedog` | 23 | — | — | — | N/A (no edog struct — fields inline on monster object) |
| `free_edog` | 35 | — | — | — | N/A (GC handles memory) |
| `initedog` | 45 | — | — | — | TODO (edog initialization; partially inlined in shkinit/nameshk) |
| `pet_type` | 91 | u_init.js | `pet_type` | 176 | Match (private — in u_init.js where makedog is called) |
| `pick_familiar_pm` | 104 | — | — | — | TODO (wizard familiar selection not yet implemented) |
| `make_familiar` | 138 | — | — | — | TODO (familiar creation for wizard) |
| `makedog` | 219 | u_init.js | `makedog` | 236 | Split (private in u_init.js — pet placed during newgame) |
| `set_mon_lastmove` | 287 | — | — | — | TODO (monster last-move tracking not yet needed) |
| `update_mlstmv` | 295 | — | — | — | TODO (mlstmv update) |
| `losedogs` | 304 | — | — | — | TODO (check for pets lost on level; partially in mon_arrive) |
| `mon_arrive` | 420 | u_init.js | `mon_arrive` | 390 | Split (exported from u_init.js — handles level transition for pets) |
| `mon_catchup_elapsed_time` | 623 | u_init.js | (inlined) | 484 | Split (inlined in mon_arrive — catch-up for time in limbo) |
| `mon_leave` | 725 | — | — | — | TODO (monster leaving level) |
| `keep_mon_accessible` | 764 | — | — | — | TODO (accessibility check for keepdogs) |
| `keepdogs` | 785 | — | — | — | TODO (partially inlined in mon_arrive; full version needed for keep/follow logic) |
| `migrate_to_level` | 883 | — | — | — | TODO (pending migration tracking) |
| `discard_migrations` | 934 | — | — | — | TODO (discard queued migrations) |
| `dogfood` | 991 | dog.js | `dogfood` | 115 | Match (exported) |
| `tamedog` | 1139 | — | — | — | TODO (taming a monster) |
| `wary_dog` | 1288 | — | — | — | TODO (make pet wary after death) |
| `abuse_dog` | 1358 | — | — | — | TODO (abuse pet — decrease tameness) |

### mon.c → mon.js

Notes:
- C `zombie_maker` is `staticfn` (private); exported in JS for testability and reuse.
- `zombie_form` uses ptr identity (`ptr == &mons[PM_ETTIN]`) in C; JS uses `ptr === mons[PM_ETTIN]` (same identity comparison since mons is a shared array).
- `pm_to_cham` uses `ismnum(mndx)` in C (= `mndx >= 0 && mndx < NUMMONS`); JS checks same bounds inline.
- `corpse_chance` and `xkilled` from C mon.c live in JS `zap.js` (see zap.c section).
- Many C mon.c functions (xkilled, monkilled, mondied, grow_up, minliquid, make_corpse) require full game state; not yet in JS.

| C function | C line | JS function | JS line | Status |
|---|---|---|---|---|
| `set_mon_data` | 13 | — | — | N/A (see mondata.c) |
| `attacktype_fordmg` | 42 | — | — | N/A (see mondata.c: `dmgtype_fromattack`) |
| `m_poisongas_ok` | 312 | — | — | TODO (needs full resistance/state checks) |
| `zombie_maker` | 344 | `zombie_maker` | 100 | Match (exported) |
| `zombie_form` | 368 | `zombie_form` | 111 | Match (exported) |
| `undead_to_corpse` | 399 | `undead_to_corpse` | 137 | Match (exported) |
| `genus` | 452 | `genus` | 155 | Match (exported) |
| `pm_to_cham` | 517 | `pm_to_cham` | 184 | Match (exported) |
| `make_corpse` | 546 | — | — | TODO (needs obj creation system) |
| `onscary` | — | `onscary` | 63 | Match (exported; predates this section) |
| `mfndpos` | — | `mfndpos` | 250 | Match (exported; predates this section) |
| `handleHiderPremove` | — | `handleHiderPremove` | 402 | Match (exported; predates this section) |
| `movemon` | — | `movemon` | 469 | Match (exported; predates this section) |
| `mm_aggression` | — | `mm_aggression` | 205 | Match (private; predates this section) |

### mondata.c → mondata.js

Notes:
- JS uses `ptr.attacks[i].type` (aatyp) and `ptr.attacks[i].damage` (adtyp); C uses `mattk[i].aatyp`/`adtyp`.
- `DISTANCE_ATTK_TYPE` = AT_SPIT || AT_BREA || AT_MAGC || AT_GAZE (from monattk.h); used in `ranged_attk`.
- `is_whirly(ptr)` = S_VORTEX || PM_AIR_ELEMENTAL; `noncorporeal(ptr)` = S_GHOST (from mondata.h).
- `bigmonst(ptr)` = size >= MZ_LARGE; `verysmall(ptr)` = size < MZ_SMALL.
- `mon_hates_silver`/`mon_hates_blessings`: C also checks `is_vampshifter()`; JS omits (no shapeshifter-form tracking).
- Many mondata.h macro predicates (carnivorous, is_undead, etc.) are in mondata.js — see `include/mondata.h → mondata.js` section below.

| C function | C line | JS function | JS line | Status |
|---|---|---|---|---|
| `set_mon_data` | 13 | — | — | N/A (in JS: inline assignment) |
| `attacktype_fordmg` | 42 | `dmgtype_fromattack` | 418 | Match (exported; arg order matches C `dmgtype_fromattack`) |
| `attacktype` | 54 | `attacktype` | 266 | Match (exported; predates this section) |
| `noattacks` | 61 | `noattacks` | 435 | Match (exported) |
| `poly_when_stoned` | 80 | `poly_when_stoned` | — | Match (genocide check omitted — no JS mvitals) |
| `defended` | 91 | — | — | TODO (needs inventory/worn items) |
| `Resists_Elem` | 139 | — | — | TODO (needs full resistance stack) |
| `resists_drli` | 192 | — | — | TODO (needs player state) |
| `resists_magm` | 201 | — | — | TODO (needs player state) |
| `resists_blnd` | 212 | — | — | TODO (needs player state) |
| `ranged_attk` | 402 | `ranged_attk` | 447 | Match (exported; uses DISTANCE_ATTK_TYPE) |
| `mon_hates_silver` | 517 | `mon_hates_silver` | 482 | Match (exported; vampshifter check omitted) |
| `hates_silver` | 524 | `hates_silver` | 471 | Match (exported) |
| `mon_hates_blessings` | 533 | `mon_hates_blessings` | 496 | Match (exported; vampshifter check omitted) |
| `hates_blessings` | 540 | `hates_blessings` | 489 | Match (exported) |
| `mon_hates_light` | 547 | `mon_hates_light` | — | Match (exported) |
| `passes_bars` | 554 | `passes_bars` | 399 | Match (exported; predates this section) |
| `can_blow` | 566 | `can_blow` | — | Match (exported; isStrangled=false default for player case) |
| `can_chant` | 579 | `can_chant` | — | Match (exported; isStrangled=false default for player case) |
| `can_be_strangled` | 590 | `can_be_strangled` | — | Match (exported; worn amulet check omitted — no worn item tracking) |
| `can_track` | 622 | `can_track` | — | Match (Excalibur check via optional wieldsExcalibur param) |
| `sliparm` | 632 | `sliparm` | 528 | Match (exported) |
| `breakarm` | 640 | `breakarm` | 538 | Match (exported) |
| `sticks` | 654 | `sticks` | 459 | Match (exported) |
| `cantvomit` | 663 | `cantvomit` | 507 | Match (exported) |
| `num_horns` | 678 | `num_horns` | 517 | Match (exported) |
| `dmgtype_fromattack` | 700 | `dmgtype_fromattack` | 418 | Match (see attacktype_fordmg above) |
| `dmgtype` | 712 | `dmgtype` | 429 | Match (exported) |
| `max_passive_dmg` | 720 | — | — | TODO (needs resistance checks) |
| `same_race` | 771 | `same_race` | — | Match (exported; full species matching including grow-up chains) |
| `little_to_big` | 1303 | `little_to_big` | — | Match (exported; uses grownups table) |
| `big_to_little` | 1316 | `big_to_little` | — | Match (exported; uses grownups table) |
| `big_little_match` | 1331 | `big_little_match` | — | Match (exported; checks grow-up chain membership) |
| `levl_follower` | 1211 | `levl_follower` | — | Match (exported; takes mon + player arg for steed/inventory access) |
| `mon_knows_traps` | — | `mon_knows_traps` | 367 | Match (exported; predates this section) |
| `mon_learns_traps` | — | `mon_learns_traps` | 377 | Match (exported; predates this section) |

### include/mondata.h → mondata.js (macro predicates)

Notes:
- All macros operate on a permonst pointer (ptr), which in JS is the `mons[]` entry.
- JS uses `ptr.flags1`/`ptr.flags2`/`ptr.flags3` for C's `mflags1`/`mflags2`/`mflags3`.
- C's `mresists` maps to `ptr.mr1` in the JS monster struct.
- `grounded(ptr)` takes optional `hasCeiling=true` param (C reads `u.uz` global; JS avoids global state).
- `nonliving`: C definition includes `is_undead || PM_MANES || weirdnonliving`; updated from previous stub.
- `likes_objs`: C includes `is_armed(ptr)` in addition to `M2_COLLECT`; JS updated accordingly.

| C macro | JS function | Status |
|---|---|---|
| `pm_resistance(ptr, typ)` | `pm_resistance` | Match (uses ptr.mr1) |
| `immune_poisongas(ptr)` | `immune_poisongas` | Match |
| `is_flyer(ptr)` | `is_flyer` | Match (alias for can_fly) |
| `is_floater(ptr)` | `is_floater` | Match |
| `is_swimmer(ptr)` | `is_swimmer` | Match (alias for can_swim) |
| `breathless(ptr)` | `breathless` | Match (predates this section) |
| `amphibious(ptr)` | `amphibious` | Match (predates this section) |
| `cant_drown(ptr)` | `cant_drown` | Match |
| `passes_walls(ptr)` | `passes_walls` | Match (predates this section) |
| `amorphous(ptr)` | `amorphous` | Match (predates this section) |
| `noncorporeal(ptr)` | `noncorporeal` | Match |
| `tunnels(ptr)` | `tunnels` | Match (alias for can_tunnel) |
| `needspick(ptr)` | `needspick` | Match (alias for needs_pick) |
| `hides_under(ptr)` | `hides_under` | Match (predates this section) |
| `is_hider(ptr)` | `is_hider` | Match (predates this section) |
| `ceiling_hider(ptr)` | `ceiling_hider` | Match |
| `haseyes(ptr)` | `haseyes` | Match (predates this section) |
| `eyecount(ptr)` | `eyecount` | Match |
| `nohands(ptr)` | `nohands` | Match (predates this section) |
| `nolimbs(ptr)` | `nolimbs` | Match (predates this section) |
| `notake(ptr)` | `notake` | Match (predates this section) |
| `has_head(ptr)` | `has_head` | Match |
| `has_horns(ptr)` | `has_horns` | Match |
| `is_whirly(ptr)` | `is_whirly` | Match |
| `flaming(ptr)` | `flaming` | Match |
| `is_silent(ptr)` | `is_silent` | Match |
| `unsolid(ptr)` | `unsolid` | Match (predates this section) |
| `mindless(ptr)` | `is_mindless` | Match (predates this section; JS uses is_mindless) |
| `humanoid(ptr)` | `is_humanoid` | Match (predates this section; JS uses is_humanoid) |
| `is_animal(ptr)` | `is_animal` | Match (predates this section) |
| `slithy(ptr)` | `slithy` | Match (predates this section) |
| `is_wooden(ptr)` | `is_wooden` | Match |
| `thick_skinned(ptr)` | `thick_skinned` | Match (predates this section) |
| `hug_throttles(ptr)` | `hug_throttles` | Match |
| `digests(ptr)` | `digests` | Match |
| `enfolds(ptr)` | `enfolds` | Match |
| `slimeproof(ptr)` | `slimeproof` | Match |
| `lays_eggs(ptr)` | `lays_eggs` | Match (predates this section) |
| `eggs_in_water(ptr)` | `eggs_in_water` | Match |
| `regenerates(ptr)` | `regenerates` | Match (predates this section) |
| `perceives(ptr)` | `perceives` | Match (predates this section) |
| `can_teleport(ptr)` | `can_teleport` | Match (predates this section) |
| `control_teleport(ptr)` | `control_teleport` | Match (predates this section) |
| `telepathic(ptr)` | `telepathic` | Match |
| `is_armed(ptr)` | `is_armed` | Match |
| `acidic(ptr)` | `acidic` | Match (predates this section) |
| `poisonous(ptr)` | `poisonous` | Match (predates this section) |
| `carnivorous(ptr)` | `carnivorous` | Match (predates this section) |
| `herbivorous(ptr)` | `herbivorous` | Match (predates this section) |
| `metallivorous(ptr)` | `is_metallivore` | Match (predates this section; JS uses is_metallivore) |
| `polyok(ptr)` | `polyok` | Match |
| `is_shapeshifter(ptr)` | `is_shapeshifter` | Match (predates this section) |
| `is_undead(ptr)` | `is_undead` | Match (predates this section) |
| `is_were(ptr)` | `is_were` | Match (predates this section) |
| `is_elf/dwarf/gnome/orc/human(ptr)` | same | Match (predates this section) |
| `is_bat(ptr)` | `is_bat` | Match |
| `is_bird(ptr)` | `is_bird` | Match |
| `is_giant(ptr)` | `is_giant` | Match (predates this section) |
| `is_golem(ptr)` | `is_golem` | Match (predates this section) |
| `is_domestic(ptr)` | `is_domestic` | Match (predates this section) |
| `is_demon(ptr)` | `is_demon` | Match (predates this section) |
| `is_mercenary(ptr)` | `is_mercenary` | Match (predates this section) |
| `is_male(ptr)` | `is_male` | Match |
| `is_female(ptr)` | `is_female` | Match |
| `is_neuter(ptr)` | `is_neuter` | Match |
| `is_wanderer(ptr)` | `is_wanderer` | Match (predates this section) |
| `always_hostile(ptr)` | `always_hostile` | Match (predates this section) |
| `always_peaceful(ptr)` | `always_peaceful` | Match (predates this section) |
| `extra_nasty(ptr)` | `extra_nasty` | Match |
| `strongmonst(ptr)` | `strongmonst` | Match (predates this section) |
| `can_breathe(ptr)` | `can_breathe` | Match (predates this section) |
| `cantwield(ptr)` | `cantwield` | Match |
| `could_twoweap(ptr)` | `could_twoweap` | Match |
| `cantweararm(ptr)` | `cantweararm` | Match |
| `throws_rocks(ptr)` | `throws_rocks` | Match |
| `type_is_pname(ptr)` | `type_is_pname` | Match |
| `is_lord(ptr)` | `is_lord` | Match |
| `is_prince(ptr)` | `is_prince` | Match |
| `is_ndemon(ptr)` | `is_ndemon` | Match |
| `is_dlord(ptr)` | `is_dlord` | Match |
| `is_dprince(ptr)` | `is_dprince` | Match |
| `is_minion(ptr)` | `is_minion` | Match (predates this section) |
| `likes_gold(ptr)` | `likes_gold` | Match (predates this section) |
| `likes_gems(ptr)` | `likes_gems` | Match (predates this section) |
| `likes_objs(ptr)` | `likes_objs` | Match (fixed: now includes is_armed) |
| `likes_magic(ptr)` | `likes_magic` | Match (predates this section) |
| `webmaker(ptr)` | `webmaker` | Match |
| `is_unicorn(ptr)` | `is_unicorn` | Match (predates this section) |
| `is_longworm(ptr)` | `is_longworm` | Match (predates this section) |
| `is_covetous(ptr)` | `is_covetous` | Match (predates this section) |
| `infravision(ptr)` | `infravision` | Match (predates this section) |
| `infravisible(ptr)` | `infravisible` | Match (predates this section) |
| `is_displacer(ptr)` | `is_displacer` | Match (predates this section) |
| `is_mplayer(ptr)` | `is_mplayer` | Match |
| `is_watch(ptr)` | `is_watch` | Match |
| `is_rider(ptr)` | `is_rider` | Match (predates this section) |
| `is_placeholder(ptr)` | `is_placeholder` | Match |
| `is_reviver(ptr)` | `is_reviver` | Match |
| `unique_corpstat(ptr)` | `unique_corpstat` | Match |
| `emits_light(ptr)` | `emits_light` | Match (returns 0 or 1 like C) |
| `likes_lava(ptr)` | `likes_lava` | Match |
| `pm_invisible(ptr)` | `pm_invisible` | Match |
| `likes_fire(ptr)` | `likes_fire` | Match |
| `touch_petrifies(ptr)` | `touch_petrifies` | Match |
| `flesh_petrifies(ptr)` | `flesh_petrifies` | Match |
| `passes_rocks(ptr)` | `passes_rocks` | Match |
| `is_mind_flayer(ptr)` | `is_mind_flayer` | Match (predates this section) |
| `is_vampire(ptr)` | `is_vampire` | Match |
| `hates_light(ptr)` | `hates_light` | Match (predates this section) |
| `weirdnonliving(ptr)` | `weirdnonliving` | Match |
| `nonliving(ptr)` | `nonliving` | Match (fixed: now includes PM_MANES + weirdnonliving) |
| `completelyburns(ptr)` | `completelyburns` | Match |
| `completelyrots(ptr)` | `completelyrots` | Match |
| `completelyrusts(ptr)` | `completelyrusts` | Match |
| `vegan(ptr)` | `vegan` | Match |
| `vegetarian(ptr)` | `vegetarian` | Match |
| `corpse_eater(ptr)` | `corpse_eater` | Match |
| `grounded(ptr)` | `grounded` | Match (hasCeiling param replaces `has_ceiling(&u.uz)` global) |
| `befriend_with_obj(ptr, obj)` | `befriend_with_obj` | Match (exported; note unicorns lack M2_DOMESTIC so unicorn clause is dead code in practice) |
| `immune_poisongas(ptr)` | `immune_poisongas` | Match |

### makemon.c → makemon.js

Notes:
- C's `mextra` struct (extra per-monster data) has no JS equivalent; fields are set inline on the monster object.
- `rndmonst()` renamed to `rndmonnum()` in JS (clearer name; wraps `rndmonst_adj(0,0,depth)`).
- JS-only: many `mondata.h` predicates (is_mercenary, is_lord, etc.) included locally. Also: rndmonnum_adj, runtimeDecideToShapeshift, group/newcham helpers.
- `monhp_per_lvl` inlined into `newmonhp` logic (not a separate function).
- Debugging functions (dump_mongen, check_mongen_order, cmp_init_mongen_order) are N/A.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `is_home_elemental` | 35 | — | — | TODO (elemental home types not yet tracked) |
| `wrong_elem_type` | 58 | — | — | TODO (depends on is_home_elemental) |
| `m_initgrp` | 81 | — | — | TODO (group spawn not yet implemented) |
| `m_initthrow` | 150 | `m_initthrow` | 617 | Match (private) |
| `m_initweap` | 163 | `m_initweap` | 629 | Match (private) |
| `mkmonmoney` | 578 | `mkmonmoney` | 1041 | Match (private) |
| `m_initinv` | 591 | `m_initinv` | 1050 | Match (private) |
| `clone_mon` | 839 | — | — | TODO (needed for level transfer and polymorph) |
| `propagate` | 960 | — | — | TODO (spawning copies of unique monsters) |
| `monhp_per_lvl` | 988 | — | — | Inlined — logic embedded in `newmonhp` |
| `newmonhp` | 1014 | `newmonhp` | 580 | Match (exported) |
| `init_mextra` | 1061 | — | — | N/A (no mextra struct in JS — fields set inline) |
| `newmextra` | 1068 | — | — | N/A (no mextra struct in JS) |
| `makemon_rnd_goodpos` | 1078 | `makemon_rnd_goodpos` | 1548 | Match (private) |
| `makemon` | 1149 | `makemon` | 1648 | Match (exported) |
| `unmakemon` | 1511 | — | — | TODO (remove monster from map; not yet needed) |
| `mbirth_limit` | 1539 | `mbirth_limit` | 561 | Match (exported) |
| `create_critters` | 1553 | — | — | TODO (special level monster creation) |
| `uncommon` | 1590 | `uncommon` | 286 | Match (private) |
| `align_shift` | 1608 | `align_shift` | 297 | Match (private) |
| `temperature_shift` | 1638 | `temperature_shift` | 312 | Match (private) |
| `rndmonst` | 1649 | `rndmonnum` | 397 | Renamed (exported; `rndmonnum()` wraps `rndmonst_adj(0,0,depth)`) |
| `rndmonst_adj` | 1656 | `rndmonst_adj` | 317 | Match (exported) |
| `mk_gen_ok` | 1733 | `mk_gen_ok` | 430 | Match (private) |
| `cmp_init_mongen_order` | 1757 | — | — | N/A (JS sort uses closure comparator) |
| `check_mongen_order` | 1778 | — | — | N/A (debugging utility) |
| `init_mongen_order` | 1801 | `init_mongen_order` | 442 | Match (private) |
| `dump_mongen` | 1829 | — | — | N/A (debugging utility) |
| `mkclass` | 1867 | `mkclass` | 483 | Match (exported) |
| `mkclass_aligned` | 1874 | — | — | TODO (alignment-filtered class pick; merged into mkclass atyp param partially) |

### shknam.c → shknam.js

Notes:
- The JS port stores shopkeeper name as `shk.shknam` field (set by `nameshk`); `shk.shoptype` stores shop type.
- `veggy_item(obj, otyp)` simplified to `veggy_item(otyp)` — obj parameter dropped (TIN/CORPSE species not tracked).
- `neweshk`/`free_eshk` are N/A (JS has no struct allocation/deallocation).
- `shkname`/`is_izchak` skip hallucination support (needs game state) and `is_izchak` skips `in_town()` (not yet in JS).
- JS-only functions: `mkmonmoney` (gold helper), `mon_at` (position lookup), `pointInShop`/`monsterInShop` (display helpers).

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `init_shop_selection` | 360 | — | — | TODO (not yet needed — no interactive shop selection in JS) |
| `veggy_item` | 380 | `veggy_item` | 305 | Partial (private — obj param dropped; TIN/CORPSE species not checked) |
| `shkveg` | 408 | `shkveg` | 311 | Match (private) |
| `mkveggy_at` | 443 | `mkveggy_at` | 332 | Match (private) |
| `mkshobj_at` | 454 | `mkshobj_at` | 540 | Match (private — extra shpIndex/map/depth params in JS) |
| `nameshk` | 487 | `nameshk` | 431 | Match (private — extra ubirthday/ledgerNo params replace C globals) |
| `neweshk` | 557 | — | — | N/A (no struct allocation in JS — eshk fields set inline on monster object) |
| `free_eshk` | 569 | — | — | N/A (GC handles memory) |
| `good_shopdoor` | 582 | `good_shopdoor` | 345 | Match (private — returns {di,sx,sy} instead of output pointers) |
| `shkinit` | 628 | `shkinit` | 490 | Match (private — extra shp_indx/map/depth/ubirthday/ledgerNo params; stores shk.shoptype) |
| `stock_room_goodpos` | 695 | `stock_room_goodpos` | 389 | Match (private — rmno param dropped, map added) |
| `stock_room` | 718 | `stock_room` | 597 | Match (exported — extra map/depth/ubirthday/ledgerNo params) |
| `saleable` | 805 | `saleable` | 695 | Match (exported — checks shk.shoptype against shop iprobs table) |
| `get_shop_item` | 829 | `get_shop_item` | 288 | Match (exported) |
| `Shknam` | 843 | `Shknam` | 731 | Match (exported — returns upstart(shkname(shk))) |
| `shkname` | 856 | `shkname` | 719 | Match (exported — strips prefix char; hallucination omitted) |
| `shkname_is_pname` | 900 | `shkname_is_pname` | 741 | Match (exported — checks for '-', '+', or '=' prefix) |
| `is_izchak` | 908 | `is_izchak` | 753 | Match (exported — hallucination and in_town() checks omitted) |

### vision.c → vision.js

Notes:
- C's global state (viz_array, viz_clear, left_ptrs, right_ptrs) is encapsulated in the JS `FOV` class.
- Algorithm C quadrant functions (right_side, left_side, view_from, clear_path) match C names.
- JS-only functions: q1_path..q4_path (Bresenham path checks), is_clear_map, clear_path_map.
- C macros `m_cansee`, `couldsee` are ported as exported JS functions.
- `doesBlock` renamed to `does_block` (C: vision.c:153).

| C Function / Concept | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `does_block` | 153 | `does_block` | 40 | Match (private — renamed from `doesBlock`) |
| `vision_init` | 121 | `FOV` constructor | 409 | Encapsulated (FOV class owns vision arrays) |
| `vision_reset` | 211 | `FOV.visionReset` | 420 | Encapsulated (builds viz_clear, left/right ptrs) |
| `get_unused_cs` | 274 | (inlined in `FOV.compute`) | — | Inlined (cs_rows/cs_left/cs_right are module-level) |
| `rogue_vision` | 314 | — | — | TODO (rogue level mode not yet in JS) |
| `new_angle` | 414 | — | — | Inlined (angle logic inside `view_from` scanner) |
| `vision_recalc` | 512 | `FOV.compute` | 474 | Encapsulated (renamed; takes px/py instead of control flag) |
| `block_point` | 854 | — | — | TODO (not yet needed — no dynamic blocking in JS) |
| `unblock_point` | 888 | — | — | TODO (not yet needed) |
| `recalc_block_point` | 900 | — | — | TODO (not yet needed) |
| `dig_point` | 956 | — | — | TODO (digging not yet in JS) |
| `fill_point` | 1040 | — | — | TODO (fill actions not yet in JS) |
| `clear_path` | 1602 | `clear_path` | 176 | Match (exported) |
| `view_init` | 1640 | — | — | Subsumed into `FOV` constructor |
| `right_side` | 1655 | `right_side` | 191 | Match (private) |
| `left_side` | 1847 | `left_side` | 280 | Match (private) |
| `view_from` | 1991 | `view_from` | 362 | Match (private) |
| `do_clear_area` | 2096 | `do_clear_area` | 695 | Match (exported) |
| `howmonseen` | 2141 | — | — | TODO (monster perception flags not yet in JS) |
| `couldsee` (macro) | vision.h | `couldsee` | 665 | Ported as function (exported) |
| `m_cansee` (macro) | vision.h | `m_cansee` | 658 | Ported as function (exported) |


### nhlobj.c — N/A (Lua bindings)

All 21 functions in nhlobj.c are Lua C API wrappers (`l_obj_*` / `nhl_*`). The JS port has no Lua
interpreter; object manipulation is handled by direct JS function calls (`object()`, `monster()`, etc.)
exported from `sp_lev.js`. No function-level mapping exists.

| C Function | Notes |
|---|---|
| `l_obj_check` | Lua type check helper — N/A |
| `l_obj_gc` | Lua GC finalizer — N/A |
| `l_obj_push` | Push obj onto Lua stack — N/A |
| `nhl_push_obj` | Public push (called from nhlua.c) — N/A |
| `nhl_obj_u_giveobj` | Give obj to player via Lua — N/A |
| `l_obj_getcontents` | Iterate container contents — N/A |
| `l_obj_add_to_container` | Place obj into container — N/A |
| `l_obj_objects_to_table` | Serialize obj list to Lua table — N/A |
| `l_obj_to_table` | Serialize single obj to Lua table — N/A |
| `l_obj_new_readobjnam` | Create obj from name string — N/A |
| `l_obj_at` | Get obj at map location — N/A |
| `l_obj_placeobj` | Place obj at coordinates — N/A |
| `l_obj_nextobj` | Iterator: next obj in list — N/A |
| `l_obj_container` | Get containing obj — N/A |
| `l_obj_isnull` | Null check — N/A |
| `l_obj_timer_has` | Check obj timer — N/A |
| `l_obj_timer_peek` | Read obj timer value — N/A |
| `l_obj_timer_stop` | Stop obj timer — N/A |
| `l_obj_timer_start` | Start obj timer — N/A |
| `l_obj_bury` | Bury obj in floor — N/A |
| `l_obj_register` | Register Lua metatable — N/A |

### nhlsel.c — N/A (Lua selection bindings)

All ~40 functions in nhlsel.c are Lua C API wrappers (`l_selection_*`) that expose `selvar.c`
selection geometry to Lua scripts. The JS port uses the `selection` object exported from `sp_lev.js`
directly. See selvar.c section below for the geometry function mapping.

| C Function | Notes |
|---|---|
| `l_selection_check` | Lua type check — N/A |
| `l_selection_push_new` | Lua stack alloc — N/A |
| `l_selection_push_copy` | Lua stack copy — N/A |
| `l_selection_to` | Lua type coerce — N/A |
| `l_selection_gc` | Lua GC finalizer — N/A |
| `l_selection_new` | Wraps `selection_new` → `selection.new()` in JS |
| `l_selection_clone` | Wraps `selection_clone` → N/A in JS (GC, create new) |
| `l_selection_numpoints` | `sel.numpoints()` |
| `l_selection_getpoint` | Access coords array directly in JS |
| `l_selection_setpoint` | `sel.set(x, y)` |
| `l_selection_not` | `sel.negate()` |
| `l_selection_and` | `sel.intersect(other)` |
| `l_selection_or` | `sel.union(other)` |
| `l_selection_xor` | `sel.xor(other)` — symmetric difference |
| `l_selection_sub` | `sel.sub(other)` — set difference A-B |
| `l_selection_filter_percent` | `sel.percentage(pct)` |
| `l_selection_rndcoord` | `sel.rndcoord()` |
| `l_selection_room` | `selection.room()` |
| `l_selection_getbounds` | `sel.bounds()` |
| `params_sel_2coords` | Internal helper — N/A |
| `l_selection_line` | `selection.line(x1, y1, x2, y2)` |
| `l_selection_randline` | `selection.randline(x1, y1, x2, y2, roughness)` |
| `l_selection_rect` | `selection.rect(x1, y1, x2, y2)` |
| `l_selection_fillrect` | `selection.fillrect(x1, y1, x2, y2)` |
| `l_selection_grow` | `sel.grow(iterations)` |
| `l_selection_filter_mapchar` | `sel.filter_mapchar(ch)` |
| `l_selection_match` | `selection.match(pattern)` |
| `l_selection_flood` | `selection.floodfill(x, y, matchFn)` |
| `l_selection_circle` | `selection.circle(xc, yc, r, filled)` — ellipse with equal axes |
| `l_selection_ellipse` | `selection.ellipse(xc, yc, a, b, filled)` |
| `l_selection_gradient` | `selection.gradient(x, y, x2, y2, gtyp, mind, maxd)` |
| `l_selection_iterate` | `sel.iterate(func)` |
| `l_selection_size_description` | `sel.size_description()` |
| `l_selection_ipairs` | Lua ipairs protocol — N/A |
| `l_selection_register` | Lua metatable registration — N/A |

### selvar.c → sp_lev.js (`selection` object)

Selection geometry functions are implemented as methods of the `selection` object exported from
`sp_lev.js` (line 6813). The Lua-specific memory management (`selection_free`, `selection_clear`,
`selection_clone`) is handled by GC. The Lua binding wrapper functions are in nhlsel.c (N/A).

| C Function | C Line | JS Equivalent | JS Line | Notes |
|---|---|---|---|---|
| `selection_new` | 15 | `selection.new()` | 7081 | Match |
| `selection_free` | 33 | N/A | — | GC handles memory |
| `selection_clear` | 48 | N/A | — | GC — create new instead |
| `selection_clone` | 65 | N/A | — | GC — create new and copy |
| `selection_getbounds` | 77 | `sel.bounds()` | 7159 | Match |
| `selection_recalc_bounds` | 99 | N/A | — | Bounds recalculated on demand |
| `selection_getpoint` | 168 | (coords array) | — | Access coords directly |
| `selection_setpoint` | 181 | `sel.set(x, y)` | 7105 | Match |
| `selection_not` | 211 | `sel.negate()` | 7183 | Match (also `selection.negate(sel)` at 7335) |
| `selection_filter_percent` | 224 | `sel.percentage(pct)` | 7121 | Match (also `selection.percentage(sel, pct)` at 7384) |
| `selection_filter_mapchar` | 248 | `sel.filter_mapchar(ch)` | 7176 | Match (also `selection.filter_mapchar(sel, ch)` at 7555) |
| `selection_rndcoord` | 284 | `sel.rndcoord()` | 7131 | Match (also `selection.rndcoord(sel)` at 7241) |
| `selection_do_grow` | 321 | `sel.grow(n)` | 7190 | Match (also `selection.grow(sel, n)` at 7282) |
| `set_selection_floodfillchk` | 372 | N/A | — | JS closures capture matchFn directly |
| `sel_flood_havepoint` | 379 | N/A | — | Internal staticfn helper |
| `selection_floodfill` | 395 | `selection.floodfill(x, y, matchFn)` | 7415 | Match |
| `selection_do_ellipse` | 456 | `selection.ellipse(xc, yc, a, b, filled)` | — | Match (static factory) |
| `line_dist_coord` | 542 | N/A | — | Inlined in `selection.gradient()` |
| `selection_do_gradient` | 570 | `selection.gradient(x,y,x2,y2,gtyp,mind,maxd)` | 7318 | Match (static factory) |
| `selection_do_line` | 626 | `selection.line(x1, y1, x2, y2)` | 6980 | Match (Bresenham) |
| `selection_do_randline` | 683 | `selection.randline(...)` | 7011 | Match |
| `selection_iterate` | 726 | `sel.iterate(func)` | 7149 | Match |
| `selection_is_irregular` | 747 | `sel.is_irregular()` | 7231 | Match (method on sel object) |
| `selection_size_description` | 764 | `sel.size_description()` | 7249 | Match (method on sel object) |
| `selection_from_mkroom` | 781 | `selection.room()` | 6824 | Match (C ref comment present in JS) |
| `selection_force_newsyms` | 802 | N/A | — | Display concern — not needed in JS |

### u_init.c → u_init.js

Notes:
- C's Lua integration (`com_pager()` calls) replaced by direct JS function calls.
- `u_init_inventory_attrs()` + `u_init_misc()` combined into `simulatePostLevelInit()`.
- `init_attr()` + `vary_init_attr()` combined into `initAttributes()`.
- `knows_object()` / `knows_class()` → split across `applyRolePreknowledge()` + `applyStartupDiscoveries()`.
- Functions from dog.c (`makedog`, `mon_arrive`, `adj_lev`) are also in u_init.js.

| C Function | C Line | JS Function | JS Line | Notes |
|---|---|---|---|---|
| `knows_object` | 575 | `applyStartupDiscoveries` (part) | 1460 | Combined with knows_class logic |
| `knows_class` | 586 | `applyRolePreknowledge` (part) | 1519 | Split with discoverClassByRule |
| `u_init_role` | 635 | `u_init_role` | 1073 | Match |
| `u_init_race` | 790 | `u_init_race` | 1149 | Match |
| `pauper_reinit` | 868 | N/A | — | Pauper mode not yet in JS |
| `u_init_carry_attr_boost` | 927 | `u_init_carry_attr_boost` | 1351 | Match |
| `u_init_misc` | 942 | (in `simulatePostLevelInit`) | 1596 | Combined into wrapper |
| `skills_for_role` | 1038 | `spellDisciplineForRole` | 885 | Internal helper; no C name match |
| `restricted_spell_discipline` | 1092 | `restricted_spell_discipline` | 894 | Match (renamed from camelCase) |
| `trquan` | 1107 | `trquan` | 1067 | Match |
| `ini_inv_mkobj_filter` | 1116 | `ini_inv_mkobj_filter` | 904 | Match (renamed from camelCase) |
| `ini_inv_obj_substitution` | 1180 | (inlined in `ini_inv`) | — | Merged into ini_inv logic |
| `ini_inv_adjust_obj` | 1206 | (inlined in `ini_inv`) | — | Merged into ini_inv logic |
| `ini_inv_use_obj` | 1252 | `initialSpell` (partial) | 935 | Spell learning only; equipment handled elsewhere |
| `ini_inv` | 1299 | `ini_inv` | 944 | Match (renamed from camelCase) |
| `u_init_inventory_attrs` | 1371 | (in `simulatePostLevelInit`) | 1596 | Combined into wrapper |
| `u_init_skills_discoveries` | 1396 | `applyStartupDiscoveries` | 1460 | Renamed (JS-style) |

### zap.c → zap.js

Notes:
- `burnarmor` is from trap.c in C, but implemented in zap.js for beam effect locality.
- `corpse_chance` and `xkilled` are from mon.c in C, but in zap.js in JS.
- `resist` is simplified: C takes 4 args (monst, oclass, damage, dflags); JS takes 2 (mon, oclass).
- `zap_hit` is `staticfn` in C; exported in JS for use by combat and wand code.
- `wandToBeamType`, `beamDamageDice` are JS-only internal helpers.

| C Function | C File | C Line | JS Function | JS Line | Notes |
|---|---|---|---|---|---|
| `zhitm` | zap.c | 4224 | `zhitm` | 113 | Match |
| `zap_hit` | zap.c | 4646 | `zap_hit` | 101 | Match (staticfn in C, public in JS) |
| `resist` | zap.c | 6070 | `resist` | 66 | Match (simplified 2-arg form) |
| `dobuzz` | zap.c | ~4900 | `dobuzz` | 240 | Match |
| `burnarmor` | trap.c | 88 | `burnarmor` | 86 | Match (different source C file) |
| `corpse_chance` | mon.c | 3243 | `corpse_chance` | 168 | Match (different source C file) |
| `xkilled` | mon.c | 3581 | `xkilled` | 178 | Match (different source C file; simplified) |
| `bhitm` | zap.c | 158 | N/A | — | TODO (beam-hit-monster via wand obj; larger function) |
| `bhitpile` | zap.c | 2426 | N/A | — | TODO (beam-hit-pile) |
| `dozap` | zap.c | 2615 | N/A | — | TODO (top-level wand zap command) |
| `zapnodir` | zap.c | 2537 | N/A | — | TODO (no-direction wands) |
| `zapyourself` | zap.c | 2693 | N/A | — | TODO (wand self-zap) |
| `revive` | zap.c | 882 | N/A | — | TODO (corpse revival) |
| `poly_obj` | zap.c | 1700 | N/A | — | TODO (object polymorph) |
| `learnwand` | zap.c | 121 | N/A | — | TODO (identify wand after zapping) |
| `cancel_item` | zap.c | 1237 | N/A | — | TODO (cancellation beam) |

### pager.c → pager.js + commands.js

Notes:
- pager.c in C serves two roles: (1) text file pager infrastructure, (2) game look/describe commands.
- JS splits these: pager.js = text pager, commands.js = help commands, game look = mostly TODO.
- The ~49 game look functions (do_look, lookat, waterbody_name, etc.) are not yet in JS.

| C Function | C Line | JS Location | JS Function | Notes |
|---|---|---|---|---|
| `checkfile` / `page_file` | 830 | pager.js | `showPager` | Architectural match (pager infrastructure); JS renamed |
| `dowhatis` | 2318 | commands.js | (inline, ~4503) | Partially implemented: shows glyph name |
| `doquickwhatis` | 2325 | commands.js | (inline, ~588) | Basic whatis on map position |
| `dowhatdoes` | ~2340 | commands.js | (~4530) | Key description |
| `dohistory` | ~2350 | commands.js | (~4577) | Game version history |
| `doversion` | ~2360 | commands.js | (~618) | Version string |
| `dohelp` | ~2380 | commands.js | (~4355) | Help menu |
| `self_lookat` | 108 | N/A | — | TODO (player stats description) |
| `monhealthdescr` | 138 | N/A | — | TODO (monster health bar) |
| `trap_description` | 167 | N/A | — | TODO (trap name/description) |
| `mhidden_description` | 186 | N/A | — | TODO (hidden monster description) |
| `object_from_map` | 284 | N/A | — | TODO (top object at position) |
| `look_at_object` | 380 | N/A | — | TODO (object look description) |
| `look_at_monster` | 422 | N/A | — | TODO (monster look description) |
| `waterbody_name` | 561 | N/A | — | TODO (lake/ocean/moat naming) |
| `ice_descr` | 614 | N/A | — | TODO (ice description) |
| `lookat` | 657 | N/A | — | TODO (look at map location) |
| `do_screen_description` | 1246 | N/A | — | TODO (describe map tile) |
| `do_look` | 1669 | N/A | — | TODO (main ; command) |
| `look_all` | 1975 | N/A | — | TODO (extended look mode) |
| `look_traps` | 2074 | N/A | — | TODO (nearby trap descriptions) |
| `look_engrs` | 2140 | N/A | — | TODO (nearby engraving descriptions) |
| `do_supplemental_info` | 2249 | N/A | — | TODO (supplemental descriptions) |
| `doidtrap` | 2332 | N/A | — | TODO (identify trap) |

### monmove.c → monmove.js

Notes:
- `dochugw` (C:205) wraps `dochug` — inlined in JS (movemon iterates the monster list directly).
- `onscary`, `mfndpos`, `petCorpseChanceRoll`, `consumePassivemmRng` imported from `mon.js` and re-exported.
- `m_harmless_trap`, `floor_trigger`, `mintrap_postmove` imported from `trap.js` and re-exported.
- `initrack`, `settrack` imported from `track.js` and re-exported.
- `leppie_avoidance` private helper (C:1143); `leppie_stash` TODO.
- `set_apparxy` implements C:2201 but simplified: displacement details differ.
- `can_unlock` now uses `monhaskey(mon, true) || iswiz || is_rider` (C:1768-faithful).
- `mon_track_add` / `mon_track_clear` also called inline in `dogmove.js` (C ref: dogmove.c:1319).

| C Function | C Line | JS Function | Status |
|---|---|---|---|
| `mon_track_add` | 79 | `mon_track_add` | Match (exported) |
| `mon_track_clear` | 90 | `mon_track_clear` | Match (exported) |
| `monhaskey` | 97 | `monhaskey` | Match (exported; now used in can_unlock) |
| `mon_yells` | 107 | — | TODO (needs message system) |
| `m_can_break_boulder` | 134 | `m_can_break_boulder` | Match (exported) |
| `m_break_boulder` | 144 | — | TODO (needs boulder fracture) |
| `watch_on_duty` | 177 | — | TODO (needs in_town check, message system) |
| `dochugw` | 205 | (inlined) | Subsumed into movemon loop |
| `onscary` | 242 | `onscary` | Re-exported from mon.js |
| `mon_regen` | 308 | — | TODO (needs HP/nutrition system) |
| `disturb` | 328 | — | TODO (needs message system) |
| `release_hero` | 363 | — | TODO (needs message system) |
| `find_pmmonst` | 376 | — | TODO (needs monster list + mvitals access) |
| `bee_eat_jelly` | 395 | — | TODO (needs grow_up, delobj) |
| `gelcube_digests` | 425 | — | TODO (needs digestion system) |
| `monflee` | 463 | (partial) | Subset in `applyMonflee` (mhitu.js); full version TODO |
| `distfleeck` | 534 | — | TODO (brave_gremlin roll consumed but not applied) |
| `m_arrival` | 575 | — | TODO (arrival effects not yet in JS) |
| `mind_blast` | 584 | — | TODO (mind blast not yet in JS) |
| `m_everyturn_effect` | 651 | — | TODO (per-turn effects) |
| `m_postmove_effect` | 673 | — | TODO (post-move effects) |
| `dochug` | 691 | `dochug` | Match (private; missing Conflict, covetous, m_respond) |
| `mon_would_take_item` | 1003 | `mon_would_take_item_search` | Partial (used in m_search_items_goal) |
| `leppie_avoidance` | 1143 | `leppie_avoidance` | Match (private) |
| `m_avoid_kicked_loc` | 1301 | `m_avoid_kicked_loc` | Match (exported) |
| `m_avoid_soko_push_loc` | 1317 | `m_avoid_soko_push_loc` | Match (exported) |
| `m_search_items` | 1334 | `m_search_items_goal` | Renamed (private; returns goal coords rather than modifying output pointers) |
| `m_move` | 1717 | `m_move` | Match (private; missing boulder-push, vault guard, covetous teleport) |
| `m_move_aggress` | 2091 | `m_move_aggress` | Match (private; simplified — first attack only) |
| `set_apparxy` | 2201 | `set_apparxy` | Match (private; displacement simplification noted) |
| `movemon` | (in mon.c) | `movemon` | Match (exported; delegates to mon.js movemon with dochug callback) |

### invent.c → invent.js

Notes:
- `invletter_value` renamed to `invletSortValue` (camelCase; private).
- `compactify` renamed to `compactInvletPromptChars` (camelCase; exported).
- `currency` matches C name (exported).
- `display_inventory`/`display_pickinv` combined into `buildInventoryOverlayLines` + `renderOverlayMenuUntilDismiss` (exported).
- `ddoinv` renamed to `handleInventory` (camelCase; exported).
- `isMenuDismissKey` is a JS-only private helper (consolidates dismiss-key checks).
- `unsortloot`/`free_invbuf`/`free_pickinv_cache` are N/A (GC handles memory).

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `invletter_value` | ~90 | `invletSortValue` | 18 | Renamed (private) |
| `compactify` | ~120 | `compactInvletPromptChars` | 27 | Renamed (exported) |
| `currency` | ~180 | `currency` | 51 | Match (exported) |
| `display_inventory` | ~4750 | `buildInventoryOverlayLines` | 56 | Renamed (exported; builds menu lines) |
| `display_pickinv` | ~4680 | `renderOverlayMenuUntilDismiss` | 99 | Renamed (exported; overlay menu with selection) |
| `ddoinv` | ~4830 | `handleInventory` | 139 | Renamed (exported; full inventory command with submenu) |
| `inuse_classify` | ~65 | — | — | TODO (worn/wielded classification for loot sorting) |
| `loot_classify` | ~80 | — | — | TODO (loot menu grouping) |
| `loot_xname` | ~100 | — | — | TODO (extended name for loot display) |
| `sortloot_cmp` | ~140 | — | — | TODO (comparison function for sortloot) |
| `sortloot` | ~260 | — | — | TODO (sort object chain for display) |
| `unsortloot` | ~330 | — | — | N/A (GC handles memory) |
| `reorder_invent` | ~350 | — | — | TODO (reorder hero inventory by class) |
| `assigninvlet` | ~400 | — | — | TODO (assign inventory letter to object) |
| `merge_choice` | ~480 | — | — | TODO (ask player about merging stacks) |
| `merged` | ~520 | — | — | TODO (check and perform object merging) |
| `addinv_core0` | ~600 | — | — | TODO (core add-to-inventory phase 0) |
| `addinv_core1` | ~650 | — | — | TODO (core add-to-inventory phase 1) |
| `addinv_core2` | ~750 | — | — | TODO (core add-to-inventory phase 2) |
| `addinv` | ~830 | — | — | TODO (add object to hero inventory) |
| `addinv_before` | ~850 | — | — | TODO (add object before specific item) |
| `addinv_nomerge` | ~870 | — | — | TODO (add object without merge) |
| `carry_obj_effects` | ~900 | — | — | TODO (side effects of carrying object) |
| `hold_another_object` | ~950 | — | — | TODO (check if hero can hold more) |
| `useupall` | ~1000 | — | — | TODO (consume entire stack) |
| `useup` | ~1030 | — | — | TODO (consume one from stack) |
| `consume_obj_charge` | ~1060 | — | — | TODO (consume wand/tool charge) |
| `useupf` | ~1090 | — | — | TODO (consume one from floor stack) |
| `freeinv_core` | ~1120 | — | — | TODO (core free-from-inventory) |
| `freeinv` | ~1150 | — | — | TODO (remove object from inventory chain) |
| `delallobj` | ~1180 | — | — | TODO (delete all objects at location) |
| `delobj` | ~1210 | — | — | TODO (delete single object) |
| `delobj_core` | ~1240 | — | — | TODO (core object deletion) |
| `sobj_at` | ~1280 | — | — | TODO (find object type at location) |
| `nxtobj` | ~1310 | — | — | TODO (find next object of type in chain) |
| `carrying` | ~1340 | — | — | TODO (check if hero carries object type) |
| `carrying_stoning_corpse` | ~1370 | — | — | TODO (check for cockatrice corpse) |
| `u_carried_gloves` | ~1400 | — | — | TODO (check if hero carries gloves) |
| `u_have_novel` | ~1420 | — | — | TODO (check if hero has novel) |
| `o_on` | ~1440 | — | — | TODO (find object by id in chain) |
| `obj_here` | ~1470 | — | — | TODO (check if object is at location) |
| `g_at` | ~1500 | — | — | TODO (find gold at location) |
| `splittable` | ~1530 | — | — | TODO (check if stack can be split) |
| `taking_off` | ~1560 | — | — | TODO (check if action is take-off) |
| `mime_action` | ~1590 | — | — | TODO (mime gesture for empty-handed action) |
| `any_obj_ok` | ~1620 | — | — | TODO (check if any object acceptable) |
| `getobj_hands_txt` | ~1650 | — | — | TODO (empty-hand prompt text) |
| `getobj` | ~1700 | — | — | TODO (prompt to select inventory object) |
| `silly_thing` | ~2000 | — | — | TODO (message for silly object use) |
| `ckvalidcat` | ~2050 | — | — | TODO (check valid object category) |
| `ckunpaid` | ~2080 | — | — | TODO (check if object is unpaid) |
| `wearing_armor` | ~2100 | — | — | TODO (check if hero wears armor) |
| `is_worn` | ~2130 | — | — | TODO (check if object is worn) |
| `is_inuse` | ~2160 | — | — | TODO (check if object is in use) |
| `safeq_xprname` | ~2190 | — | — | TODO (safe extended name for quit prompts) |
| `safeq_shortxprname` | ~2230 | — | — | TODO (safe short name for quit prompts) |
| `ggetobj` | ~2270 | — | — | TODO (get object with class filter) |
| `askchain` | ~2350 | — | — | TODO (ask about each object in chain) |
| `reroll_menu` | ~2500 | — | — | TODO (reroll identification menu) |
| `set_cknown_lknown` | ~2530 | — | — | TODO (set container/lock known flags) |
| `fully_identify_obj` | ~2560 | — | — | TODO (fully identify an object) |
| `identify` | ~2600 | — | — | TODO (scroll of identify) |
| `menu_identify` | ~2700 | — | — | TODO (menu-driven identification) |
| `count_unidentified` | ~2750 | — | — | TODO (count unidentified objects) |
| `identify_pack` | ~2800 | — | — | TODO (identify entire pack) |
| `learn_unseen_invent` | ~2850 | — | — | TODO (learn about unseen inventory) |
| `update_inventory` | ~2900 | — | — | TODO (update permanent inventory window) |
| `doperminv` | ~2930 | — | — | TODO (display permanent inventory) |
| `obj_to_let` | ~2960 | — | — | TODO (object to inventory letter) |
| `prinv` | ~3000 | — | — | TODO (print inventory item) |
| `xprname` | ~3050 | — | — | TODO (extended name for inventory display) |
| `dispinv_with_action` | ~3100 | — | — | TODO (display inventory with action prompt) |
| `find_unpaid` | ~3200 | — | — | TODO (find unpaid items) |
| `free_pickinv_cache` | ~3250 | — | — | N/A (GC handles memory) |
| `repopulate_perminvent` | ~3300 | — | — | TODO (repopulate permanent inventory window) |
| `display_used_invlets` | ~3350 | — | — | TODO (show used inventory letters) |
| `count_unpaid` | ~3400 | — | — | TODO (count unpaid items) |
| `count_buc` | ~3450 | — | — | TODO (count blessed/uncursed/cursed) |
| `tally_BUCX` | ~3500 | — | — | TODO (tally BUC status) |
| `count_contents` | ~3550 | — | — | TODO (count container items) |
| `dounpaid` | ~3600 | — | — | TODO (list unpaid items) |
| `this_type_only` | ~3650 | — | — | TODO (filter for specific object type) |
| `dotypeinv` | ~3700 | — | — | TODO (type-filtered inventory display) |
| `dfeature_at` | ~3800 | — | — | TODO (describe dungeon feature at location) |
| `look_here` | ~3900 | — | — | TODO (look at objects at hero location) |
| `dolook` | ~4000 | — | — | TODO (look command) |
| `will_feel_cockatrice` | ~4100 | — | — | TODO (check if touching will petrify) |
| `feel_cockatrice` | ~4150 | — | — | TODO (handle touching cockatrice corpse) |
| `stackobj` | ~4200 | — | — | TODO (merge object into existing stack) |
| `mergable` | ~4250 | — | — | TODO (check if two objects can merge) |
| `doprgold` | ~4300 | — | — | TODO (print gold amount) |
| `doprwep` | ~4330 | — | — | TODO (print wielded weapon) |
| `noarmor` | ~4360 | — | — | TODO (check if hero wears no armor) |
| `doprarm` | ~4380 | — | — | TODO (print worn armor) |
| `doprring` | ~4410 | — | — | TODO (print worn rings) |
| `dopramulet` | ~4440 | — | — | TODO (print worn amulet) |
| `tool_being_used` | ~4470 | — | — | TODO (check if tool is in active use) |
| `doprtool` | ~4500 | — | — | TODO (print tools in use) |
| `doprinuse` | ~4530 | — | — | TODO (print all items in use) |
| `let_to_name` | ~4560 | — | — | TODO (inventory letter to class name) |
| `free_invbuf` | ~4600 | — | — | N/A (GC handles memory) |
| `reassign` | ~4630 | — | — | TODO (reassign inventory letters) |
| `check_invent_gold` | ~4660 | — | — | TODO (check inventory gold consistency) |
| `adjust_ok` | ~4700 | — | — | TODO (check if adjustment is ok) |
| `adjust_gold_ok` | ~4730 | — | — | TODO (check if gold adjustment is ok) |
| `doorganize` | ~4900 | — | — | TODO (organize inventory / adjust command) |
| `adjust_split` | ~4950 | — | — | TODO (adjust by splitting stack) |
| `doorganize_core` | ~5000 | — | — | TODO (core inventory organization) |
| `invdisp_nothing` | ~5100 | — | — | TODO (display "nothing" for empty inventory) |
| `worn_wield_only` | ~5130 | — | — | TODO (filter to worn/wielded items) |
| `display_minventory` | ~5160 | — | — | TODO (display monster inventory) |
| `cinv_doname` | ~5250 | — | — | TODO (container inventory doname) |
| `cinv_ansimpleoname` | ~5300 | — | — | TODO (container inventory simple name) |
| `display_cinventory` | ~5350 | — | — | TODO (display container inventory) |
| `only_here` | ~5400 | — | — | TODO (filter objects at current location) |
| `display_binventory` | ~5450 | — | — | TODO (display buried inventory) |
| `prepare_perminvent` | ~5500 | — | — | TODO (prepare permanent inventory display) |
| `sync_perminvent` | ~5550 | — | — | TODO (sync permanent inventory) |
| `perm_invent_toggled` | ~5600 | — | — | TODO (handle permanent inventory toggle) |

### do.c → do.js

Notes:
- `dodrop` renamed to `handleDrop` (camelCase; exported).
- `dodown`/`doup` renamed to `handleDownstairs`/`handleUpstairs` (camelCase; exported).
- JS-only helpers: `formatGoldPickupMessage`, `formatInventoryPickupMessage` (used by handlePickup in commands.js).
- Level transition logic (goto_level, schedule_goto, etc.) not yet implemented.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `dodrop` | ~100 | `handleDrop` | 59 | Renamed (exported; simplified single-item drop) |
| `dodown` | ~700 | `handleDownstairs` | 165 | Renamed (exported) |
| `doup` | ~800 | `handleUpstairs` | 184 | Renamed (exported) |
| `drop` | ~150 | — | — | TODO (drop a single object) |
| `dropx` | ~200 | — | — | TODO (drop helper with floor effects) |
| `dropy` | ~250 | — | — | TODO (place object on floor at hero location) |
| `dropz` | ~300 | — | — | TODO (drop into water/lava) |
| `canletgo` | ~350 | — | — | TODO (check if object can be released) |
| `doddrop` | ~400 | — | — | TODO (drop from inventory prompt) |
| `menu_drop` | ~450 | — | — | TODO (menu-driven multi-drop) |
| `menudrop_split` | ~500 | — | — | TODO (split stack for partial drop) |
| `better_not_try_to_drop_that` | ~550 | — | — | TODO (warn about dropping quest artifact) |
| `boulder_hits_pool` | ~600 | — | — | TODO (boulder falls into pool/lava) |
| `flooreffects` | ~650 | — | — | TODO (effects of object landing on floor) |
| `obj_no_longer_held` | ~660 | — | — | TODO (cleanup when object leaves inventory) |
| `doaltarobj` | ~900 | — | — | TODO (drop object on altar for BUC identification) |
| `trycall` | ~950 | — | — | TODO (prompt to name object class) |
| `polymorph_sink` | ~1000 | — | — | TODO (polymorph at kitchen sink) |
| `teleport_sink` | ~1050 | — | — | TODO (teleport at kitchen sink) |
| `dosinkring` | ~1100 | — | — | TODO (drop ring into kitchen sink) |
| `u_stuck_cannot_go` | ~1150 | — | — | TODO (check if engulfed/grabbed) |
| `goto_level` | ~1200 | — | — | TODO (change dungeon level) |
| `schedule_goto` | ~1400 | — | — | TODO (schedule deferred level change) |
| `deferred_goto` | ~1450 | — | — | TODO (execute scheduled level change) |
| `save_currentstate` | ~1500 | — | — | TODO (save current level state) |
| `currentlevel_rewrite` | ~1550 | — | — | TODO (rewrite current level) |
| `badspot` | ~1600 | — | — | TODO (check unsuitable landing spot) |
| `u_collide_m` | ~1650 | — | — | TODO (hero collides with monster on arrival) |
| `familiar_level_msg` | ~1700 | — | — | TODO (déjà vu message) |
| `final_level` | ~1750 | — | — | TODO (arrival on Astral Plane) |
| `hellish_smoke_mesg` | ~1800 | — | — | TODO (Gehennom smoke messages) |
| `temperature_change_msg` | ~1850 | — | — | TODO (temperature change message) |
| `maybe_lvltport_feedback` | ~1900 | — | — | TODO (level teleport feedback) |
| `revive_corpse` | ~1950 | — | — | TODO (revive a corpse) |
| `revive_mon` | ~2000 | — | — | TODO (internal revive helper) |
| `zombify_mon` | ~2050 | — | — | TODO (turn corpse into zombie) |
| `donull` | ~2100 | — | — | TODO (do nothing / wait command) |
| `wipeoff` | ~2150 | — | — | TODO (wipe face continuation) |
| `dowipe` | ~2200 | — | — | TODO (start wiping face) |
| `cmd_safety_prevention` | ~2250 | — | — | TODO (prevent dangerous commands) |
| `danger_uprops` | ~2300 | — | — | TODO (check dangerous hero properties) |
| `engulfer_digests_food` | ~2350 | — | — | TODO (engulfer digests food) |
| `legs_in_no_shape` | ~2400 | — | — | TODO (wounded legs check) |
| `set_wounded_legs` | ~2450 | — | — | TODO (set wounded legs condition) |
| `heal_legs` | ~2500 | — | — | TODO (heal wounded legs) |

### do_wear.c → do_wear.js

Notes:
- `dowear`/`doputon`/`dotakeoff` renamed to `handleWear`/`handlePutOn`/`handleTakeOff` (camelCase; exported).
- Current implementations are simplified: no slot system, no equipment effect callbacks.
- Equipment on/off effect functions (Boots_on, Cloak_on, etc.) are all TODO.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `dowear` | ~1800 | `handleWear` | 207 | Renamed (exported; simplified — no slot system) |
| `doputon` | ~1850 | `handlePutOn` | 243 | Renamed (exported; simplified — rings only) |
| `dotakeoff` | ~1500 | `handleTakeOff` | 267 | Renamed (exported; simplified — body armor only) |
| `fingers_or_gloves` | ~20 | — | — | TODO |
| `off_msg` | ~40 | — | — | TODO (message when taking off item) |
| `on_msg` | ~60 | — | — | TODO (message when putting on item) |
| `toggle_stealth` | ~80 | — | — | TODO (stealth intrinsic for boots/cloak) |
| `toggle_displacement` | ~100 | — | — | TODO (displacement intrinsic for cloak) |
| `Boots_on` | ~120 | — | — | TODO (effects of wearing boots) |
| `Boots_off` | ~180 | — | — | TODO (effects of removing boots) |
| `Cloak_on` | ~240 | — | — | TODO (effects of wearing cloak) |
| `Cloak_off` | ~300 | — | — | TODO (effects of removing cloak) |
| `Helmet_on` | ~360 | — | — | TODO (effects of wearing helmet) |
| `Helmet_off` | ~420 | — | — | TODO (effects of removing helmet) |
| `hard_helmet` | ~440 | — | — | TODO (check if helmet is hard) |
| `Gloves_on` | ~460 | — | — | TODO (effects of wearing gloves) |
| `wielding_corpse` | ~480 | — | — | TODO (corpse wielding interaction) |
| `Gloves_off` | ~520 | — | — | TODO (effects of removing gloves) |
| `Shield_on` | ~580 | — | — | TODO (effects of wearing shield) |
| `Shield_off` | ~620 | — | — | TODO (effects of removing shield) |
| `Shirt_on` | ~660 | — | — | TODO (effects of wearing shirt) |
| `Shirt_off` | ~700 | — | — | TODO (effects of removing shirt) |
| `dragon_armor_handling` | ~740 | — | — | TODO (dragon scale mail transformation) |
| `Armor_on` | ~800 | — | — | TODO (effects of wearing body armor) |
| `Armor_off` | ~860 | — | — | TODO (effects of removing body armor) |
| `Armor_gone` | ~900 | — | — | TODO (armor destroyed while worn) |
| `Amulet_on` | ~940 | — | — | TODO (effects of wearing amulet) |
| `Amulet_off` | ~1000 | — | — | TODO (effects of removing amulet) |
| `learnring` | ~1050 | — | — | TODO (learn ring type from effects) |
| `adjust_attrib` | ~1080 | — | — | TODO (attribute adjustment from ring) |
| `Ring_on` | ~1120 | — | — | TODO (effects of putting on ring) |
| `Ring_off_or_gone` | ~1200 | — | — | TODO (shared ring removal logic) |
| `Ring_off` | ~1260 | — | — | TODO (effects of removing ring) |
| `Ring_gone` | ~1300 | — | — | TODO (ring destroyed while worn) |
| `Blindf_on` | ~1340 | — | — | TODO (effects of wearing blindfold) |
| `Blindf_off` | ~1380 | — | — | TODO (effects of removing blindfold) |
| `set_wear` | ~1420 | — | — | TODO (set wear-state flags) |
| `donning` | ~1440 | — | — | TODO (check if donning in progress) |
| `doffing` | ~1460 | — | — | TODO (check if doffing in progress) |
| `cancel_doff` | ~1470 | — | — | TODO (cancel in-progress doffing) |
| `cancel_don` | ~1480 | — | — | TODO (cancel in-progress donning) |
| `stop_donning` | ~1490 | — | — | TODO (stop donning if item taken) |
| `count_worn_stuff` | ~1510 | — | — | TODO (count worn items) |
| `armor_or_accessory_off` | ~1530 | — | — | TODO (take off armor or accessory) |
| `ia_dotakeoff` | ~1560 | — | — | TODO (take off by invlet) |
| `doremring` | ~1580 | — | — | TODO (R command: remove ring/amulet) |
| `cursed` | ~1620 | — | — | TODO (check cursed and print message) |
| `armoroff` | ~1660 | — | — | TODO (remove a piece of armor) |
| `already_wearing` | ~1700 | — | — | TODO (already wearing check) |
| `already_wearing2` | ~1720 | — | — | TODO (body armor variant) |
| `canwearobj` | ~1740 | — | — | TODO (validate wearing object) |
| `accessory_or_armor_on` | ~1780 | — | — | TODO (dispatch wearing) |
| `find_ac` | ~1900 | — | — | TODO (recalculate AC) |
| `glibr` | ~1950 | — | — | TODO (slippery fingers) |
| `some_armor` | ~2000 | — | — | TODO (return armor in slot) |
| `stuck_ring` | ~2030 | — | — | TODO (ring stuck check) |
| `unchanger` | ~2060 | — | — | TODO (unchanging item check) |
| `select_off` | ~2090 | — | — | TODO (mark item for takeoff) |
| `do_takeoff` | ~2120 | — | — | TODO (execute one takeoff step) |
| `take_off` | ~2160 | — | — | TODO (take off specific item) |
| `better_not_take_that_off` | ~2200 | — | — | TODO (warn about load-bearing) |
| `reset_remarm` | ~2240 | — | — | TODO (reset multi-remove state) |
| `doddoremarm` | ~2280 | — | — | TODO (A command: multi-remove) |
| `remarm_swapwep` | ~2320 | — | — | TODO (swapweapon during removal) |
| `menu_remarm` | ~2360 | — | — | TODO (menu-driven multi-remove) |
| `wornarm_destroyed` | ~2400 | — | — | TODO (check if armor should be destroyed) |
| `maybe_destroy_armor` | ~2440 | — | — | TODO (maybe destroy by erosion) |
| `destroy_arm` | ~2480 | — | — | TODO (destroy worn armor) |
| `adj_abon` | ~2520 | — | — | TODO (adjust ability bonuses) |
| `inaccessible_equipment` | ~2560 | — | — | TODO (equipment inaccessible check) |
| `equip_ok` | ~2600 | — | — | TODO (equipment validation callback) |
| `puton_ok` | ~2620 | — | — | TODO (P command validation) |
| `remove_ok` | ~2640 | — | — | TODO (R command validation) |
| `wear_ok` | ~2660 | — | — | TODO (W command validation) |
| `takeoff_ok` | ~2680 | — | — | TODO (T command validation) |
| `any_worn_armor_ok` | ~2700 | — | — | TODO (any worn armor ok check) |
| `count_worn_armor` | ~2720 | — | — | TODO (count worn armor pieces) |

### eat.c → eat.js

Notes:
- `doeat` renamed to `handleEat` (camelCase; exported).
- Current implementation covers basic eating with simplified corpse intrinsics.
- Most individual effect handlers (cprefx, cpostfx, tin handling, hunger system) are TODO.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `doeat` | ~1200 | `handleEat` | 141 | Renamed (exported; partial — basic eating with simplified intrinsics) |
| `hu_stat` | ~20 | — | — | TODO (hunger state name table) |
| `is_edible` | ~30 | — | — | TODO (check if edible by hero) |
| `init_uhunger` | ~50 | — | — | TODO (initialize hunger state) |
| `eatmdone` | ~70 | — | — | TODO (eating-mode cleanup) |
| `eatmupdate` | ~90 | — | — | TODO (eating-mode display update) |
| `food_xname` | ~110 | — | — | TODO (food-specific naming) |
| `choke` | ~130 | — | — | TODO (choking occupation callback) |
| `recalc_wt` | ~160 | — | — | TODO (recalculate weight after partial eat) |
| `adj_victual_nutrition` | ~190 | — | — | TODO (adjust nutrition for partly-eaten) |
| `touchfood` | ~220 | — | — | TODO (mark food as touched) |
| `reset_eat` | ~250 | — | — | TODO (reset eating state) |
| `do_reset_eat` | ~270 | — | — | TODO (external reset wrapper) |
| `obj_nutrition` | ~290 | — | — | TODO (get nutrition value) |
| `food_disappears` | ~310 | — | — | TODO (food vanishes on level change) |
| `food_substitution` | ~330 | — | — | TODO (substitute food type) |
| `eating_dangerous_corpse` | ~350 | — | — | TODO (warn about dangerous corpses) |
| `eatfood` | ~380 | — | — | TODO (eating occupation callback) |
| `done_eating` | ~420 | — | — | TODO (finish eating) |
| `eating_conducts` | ~460 | — | — | TODO (track dietary conducts) |
| `eat_brains` | ~500 | — | — | TODO (brain eating effects) |
| `fix_petrification` | ~540 | — | — | TODO (cure petrification) |
| `maybe_cannibal` | ~570 | — | — | TODO (cannibalism effects) |
| `cprefx` | ~600 | — | — | TODO (corpse prefix effects) |
| `intrinsic_possible` | ~650 | — | — | TODO (intrinsic gain possible) |
| `should_givit` | ~680 | — | — | TODO (decide whether to grant intrinsic) |
| `temp_givit` | ~710 | — | — | TODO (grant temporary intrinsic) |
| `givit` | ~740 | — | — | TODO (grant intrinsic from corpse) |
| `eye_of_newt_buzz` | ~780 | — | — | TODO (energy boost from newt) |
| `cpostfx` | ~810 | — | — | TODO (corpse postfix effects) |
| `corpse_intrinsic` | ~860 | — | — | TODO (umbrella corpse intrinsic handler) |
| `violated_vegetarian` | ~900 | — | — | TODO (vegetarian conduct violation) |
| `costly_tin` | ~930 | — | — | TODO (tin from shop cost) |
| `tin_variety_txt` | ~960 | — | — | TODO (tin variety text) |
| `tin_details` | ~990 | — | — | TODO (tin contents and variety) |
| `set_tin_variety` | ~1020 | — | — | TODO (set variety on tin) |
| `tin_variety` | ~1040 | — | — | TODO (get tin variety) |
| `use_up_tin` | ~1060 | — | — | TODO (consume tin after opening) |
| `consume_tin` | ~1090 | — | — | TODO (eat opened tin contents) |
| `start_tin` | ~1120 | — | — | TODO (begin opening tin) |
| `opentin` | ~1150 | — | — | Partial (inlined in handleEat) |
| `bite` | ~1180 | — | — | Partial (incremental nutrition inlined in handleEat) |
| `Hear_again` | ~1250 | — | — | TODO (restore hearing) |
| `rottenfood` | ~1280 | — | — | TODO (rotten food effects) |
| `eatcorpse` | ~1320 | — | — | TODO (eat corpse with rot checks) |
| `start_eating` | ~1370 | — | — | TODO (begin eating) |
| `garlic_breath` | ~1420 | — | — | TODO (scare nearby monsters) |
| `fprefx` | ~1450 | — | — | TODO (non-corpse food prefix effects) |
| `bounded_increase` | ~1500 | — | — | TODO (bounded stat increase) |
| `accessory_has_effect` | ~1530 | — | — | TODO (accessory eating effect) |
| `eataccessory` | ~1560 | — | — | TODO (eat ring or amulet) |
| `eatspecial` | ~1600 | — | — | TODO (eat special non-food) |
| `fpostfx` | ~1650 | — | — | TODO (non-corpse food postfix) |
| `foodword` | ~1700 | — | — | TODO (word for eating action) |
| `edibility_prompts` | ~1730 | — | — | TODO (food edibility prompts) |
| `doeat_nonfood` | ~1770 | — | — | TODO (eat non-food item) |
| `gethungry` | ~1800 | — | — | TODO (process hunger each turn) |
| `morehungry` | ~1850 | — | — | TODO (increase hunger) |
| `lesshungry` | ~1880 | — | — | TODO (decrease hunger) |
| `unfaint` | ~1910 | — | — | TODO (recover from fainting) |
| `is_fainted` | ~1940 | — | — | TODO (check if fainted) |
| `reset_faint` | ~1960 | — | — | TODO (reset faint counter) |
| `newuhs` | ~1980 | — | — | TODO (update hunger state and messages) |
| `eat_ok` | ~2030 | — | — | TODO (getobj callback for edible items) |
| `offer_ok` | ~2060 | — | — | TODO (getobj callback for sacrifice items) |
| `tin_ok` | ~2080 | — | — | TODO (getobj callback for tins) |
| `tinopen_ok` | ~2100 | — | — | TODO (getobj callback for tin opener) |
| `floorfood` | ~2130 | — | — | TODO (check/prompt for food on floor) |
| `vomit` | ~2170 | — | — | TODO (vomiting effects) |
| `eaten_stat` | ~2200 | — | — | TODO (how much food eaten) |
| `consume_oeaten` | ~2230 | — | — | TODO (reduce oeaten field) |
| `maybe_finished_meal` | ~2260 | — | — | TODO (check if meal done) |
| `cant_finish_meal` | ~2280 | — | — | TODO (interrupt meal) |
| `Popeye` | ~2310 | — | — | TODO (spinach strength boost) |
| `Finish_digestion` | ~2340 | — | — | TODO (complete digestion) |

### exper.c → exper.js

Notes:
- All implemented functions match C names (exported).
- `pluslvl` uses placeholder HP/PW gain (rnd(8)/rn2(3)) pending role-dependent newhp/newpw.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `newuexp` | 14 | `newuexp` | 7 | Match (exported) |
| `enermod` | 25 | — | — | TODO (needs Role_switch data) |
| `newpw` | 44 | — | — | TODO (needs enadv struct) |
| `experience` | 84 | — | — | TODO (needs find_mac, attack data) |
| `more_experienced` | 168 | — | — | TODO (needs u.urexp, flags.showexp) |
| `losexp` | 206 | — | — | TODO (needs adjabil, uhpinc/ueninc) |
| `newexplevel` | 299 | `newexplevel` | 34 | Match (exported) |
| `pluslvl` | 306 | `pluslvl` | 42 | Match (exported; placeholder HP/PW gain) |
| `rndexp` | 377 | — | — | TODO (random XP for potions/polyself) |

### mhitu.c → mhitu.js

Notes:
- `mattacku`/`hitmu` combined into `monsterAttackPlayer` (camelCase; exported).
- `hitmsg` partially implemented as `monsterHitVerb` (private).
- `mswings_verb`/`mswings` partially implemented as `monsterWeaponSwingVerb`/`maybeMonsterWeaponSwingMessage` (private).
- `monflee` subset exported as `applyMonflee`.
- Most AD_* damage-type handlers and advanced attack logic are TODO.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `mattacku` | ~188 | `monsterAttackPlayer` | 100 | Renamed (exported; partial — basic melee attacks) |
| `hitmsg` | ~30 | `monsterHitVerb` | 19 | Renamed (private; partial) |
| `mswings_verb` | ~50 | `monsterWeaponSwingVerb` | 33 | Renamed (private; partial) |
| `mswings` | ~60 | `maybeMonsterWeaponSwingMessage` | 62 | Renamed (private; partial) |
| `monflee` | (monmove.c) | `applyMonflee` | 84 | Partial (exported; subset for melee morale) |
| `missmu` | ~280 | — | — | TODO (monster miss message) |
| `mpoisons_subj` | ~310 | — | — | TODO (poison subject message) |
| `u_slow_down` | ~340 | — | — | TODO (hero slowdown) |
| `wildmiss` | ~370 | — | — | TODO (invisible/displaced miss) |
| `expels` | ~400 | — | — | TODO (expel hero from engulfer) |
| `getmattk` | ~430 | — | — | TODO (get monster attack for index) |
| `calc_mattacku_vars` | ~460 | — | — | TODO (calculate attack variables) |
| `mtrapped_in_pit` | ~490 | — | — | TODO (monster trapped in pit) |
| `summonmu` | ~520 | — | — | TODO (summon minions) |
| `diseasemu` | ~550 | — | — | TODO (disease attack) |
| `u_slip_free` | ~580 | — | — | TODO (hero slips free) |
| `magic_negation` | ~610 | — | — | TODO (magic cancellation) |
| `hitmu` | ~640 | — | — | TODO (process single attack hit) |
| `gulp_blnd_check` | ~700 | — | — | TODO (blindness check during engulf) |
| `gulpmu` | ~730 | — | — | TODO (engulf attack) |
| `explmu` | ~760 | — | — | TODO (exploding monster attack) |
| `gazemu` | ~790 | — | — | TODO (gaze attack) |
| `mdamageu` | ~820 | — | — | TODO (apply damage to hero) |
| `could_seduce` | ~850 | — | — | TODO (seduction possible) |
| `doseduce` | ~880 | — | — | TODO (seduction attack) |
| `mayberem` | ~920 | — | — | TODO (maybe remove armor in seduction) |
| `assess_dmg` | ~960 | — | — | TODO (assess damage for fleeing) |
| `ranged_attk_assessed` | ~990 | — | — | TODO (ranged attack assessed) |
| `mon_avoiding_this_attack` | ~1020 | — | — | TODO (monster avoidance) |
| `ranged_attk_available` | ~1050 | — | — | TODO (available ranged attack) |
| `passiveum` | ~1080 | — | — | TODO (passive counterattack) |
| `cloneu` | ~1120 | — | — | TODO (clone hero attack) |

### potion.c → potion.js

Notes:
- `dodrink` renamed to `handleQuaff` (camelCase; exported).
- Current implementation handles basic healing potions only.
- Individual `peffect_*` handlers, dipping, potion throwing, and status effect functions are TODO.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `dodrink` | ~250 | `handleQuaff` | 48 | Renamed (exported; partial — healing potions only) |
| `itimeout` | ~20 | — | — | TODO (return intrinsic timeout) |
| `itimeout_incr` | ~30 | — | — | TODO (increment intrinsic timeout) |
| `set_itimeout` | ~40 | — | — | TODO (set intrinsic timeout) |
| `incr_itimeout` | ~50 | — | — | TODO (increment with overflow protection) |
| `make_confused` | ~70 | — | — | TODO (set/extend confusion) |
| `make_stunned` | ~90 | — | — | TODO (set/extend stun) |
| `make_sick` | ~110 | — | — | TODO (apply sickness) |
| `make_slimed` | ~140 | — | — | TODO (begin sliming countdown) |
| `make_stoned` | ~160 | — | — | TODO (begin stoning countdown) |
| `make_vomiting` | ~180 | — | — | TODO (set/extend vomiting) |
| `make_blinded` | ~200 | — | — | TODO (set/extend blindness) |
| `toggle_blindness` | ~220 | — | — | TODO (toggle blind state) |
| `make_hallucinated` | ~240 | — | — | TODO (set/extend hallucination) |
| `make_deaf` | ~260 | — | — | TODO (set/extend deafness) |
| `make_glib` | ~280 | — | — | TODO (set/extend slippery fingers) |
| `self_invis_message` | ~300 | — | — | TODO (can't see yourself) |
| `ghost_from_bottle` | ~320 | — | — | TODO (ghost from smoky potion) |
| `drink_ok` | ~340 | — | — | TODO (validate drinkable) |
| `peffects` | ~400 | — | — | TODO (dispatch potion effects) |
| `peffect_restore_ability` | ~450 | — | — | TODO |
| `peffect_hallucination` | ~480 | — | — | TODO |
| `peffect_water` | ~510 | — | — | TODO (holy/unholy water) |
| `peffect_booze` | ~540 | — | — | TODO |
| `peffect_enlightenment` | ~560 | — | — | TODO |
| `peffect_invisibility` | ~580 | — | — | TODO |
| `peffect_see_invisible` | ~600 | — | — | TODO |
| `peffect_paralysis` | ~620 | — | — | TODO |
| `peffect_sleeping` | ~640 | — | — | TODO |
| `peffect_monster_detection` | ~660 | — | — | TODO |
| `peffect_object_detection` | ~680 | — | — | TODO |
| `peffect_sickness` | ~700 | — | — | TODO |
| `peffect_confusion` | ~720 | — | — | TODO |
| `peffect_gain_ability` | ~740 | — | — | TODO |
| `peffect_speed` | ~760 | — | — | TODO |
| `peffect_blindness` | ~780 | — | — | TODO |
| `peffect_gain_level` | ~800 | — | — | TODO |
| `peffect_healing` | ~820 | — | — | TODO |
| `peffect_extra_healing` | ~840 | — | — | TODO |
| `peffect_full_healing` | ~860 | — | — | TODO |
| `peffect_levitation` | ~880 | — | — | TODO |
| `peffect_gain_energy` | ~900 | — | — | TODO |
| `peffect_oil` | ~920 | — | — | TODO |
| `peffect_acid` | ~940 | — | — | TODO |
| `peffect_polymorph` | ~960 | — | — | TODO |
| `healup` | ~1000 | — | — | TODO (full healup) |
| `strange_feeling` | ~1030 | — | — | TODO (strange feeling message) |
| `bottlename` | ~1050 | — | — | TODO (potion container name) |
| `H2Opotion_dip` | ~1080 | — | — | TODO (dip into water) |
| `impact_arti_light` | ~1120 | — | — | TODO (artifact light on impact) |
| `potionhit` | ~1150 | — | — | TODO (potion hits target) |
| `potionbreathe` | ~1200 | — | — | TODO (breathe potion vapors) |
| `mixtype` | ~1250 | — | — | TODO (mixing two potions) |
| `dip_ok` | ~1300 | — | — | TODO (validate dip target) |
| `dip_hands_ok` | ~1320 | — | — | TODO (hands free for dipping) |
| `hold_potion` | ~1340 | — | — | TODO (hold potion during dip) |
| `dodip` | ~1360 | — | — | TODO (dip command) |
| `dip_into` | ~1400 | — | — | TODO (dip object into potion) |
| `poof` | ~1440 | — | — | TODO (potion poof) |
| `dip_potion_explosion` | ~1470 | — | — | TODO (potion explodes on dip) |
| `potion_dip` | ~1500 | — | — | TODO (dip potion into potion) |
| `mongrantswish` | ~1550 | — | — | TODO (monster grants wish) |
| `djinni_from_bottle` | ~1580 | — | — | TODO (djinni from smoky potion) |
| `split_mon` | ~1620 | — | — | TODO (split monster) |
| `speed_up` | ~1660 | — | — | TODO (increase hero speed) |

### read.c → read.js

Notes:
- `doread` renamed to `handleRead` (camelCase; exported).
- Current implementation covers spellbook study and basic scroll reading flow.
- Individual `seffect_*` scroll effect handlers are all TODO.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `doread` | ~300 | `handleRead` | 63 | Renamed (exported; partial — spellbook study + basic scroll flow) |
| `learnscrolltyp` | ~20 | — | — | TODO (learn scroll type) |
| `learnscroll` | ~40 | — | — | TODO (wrapper for scroll learning) |
| `cap_spe` | ~60 | — | — | TODO (cap enchantment at +127) |
| `stripspe` | ~80 | — | — | TODO (strip enchantment) |
| `read_ok` | ~100 | — | — | TODO (validate readable) |
| `p_glow1` | ~120 | — | — | TODO (item glows message) |
| `p_glow2` | ~140 | — | — | TODO (item glows moment message) |
| `p_glow3` | ~160 | — | — | TODO (item briefly glows message) |
| `erode_obj_text` | ~180 | — | — | TODO (eroded text check) |
| `tshirt_text` | ~200 | — | — | TODO (T-shirt text) |
| `hawaiian_motif` | ~220 | — | — | TODO (Hawaiian shirt motif) |
| `hawaiian_design` | ~240 | — | — | TODO (Hawaiian shirt design) |
| `apron_text` | ~260 | — | — | TODO (apron text) |
| `candy_wrapper_text` | ~280 | — | — | TODO (candy wrapper text) |
| `assign_candy_wrapper` | ~290 | — | — | TODO (assign wrapper) |
| `seffects` | ~400 | — | — | TODO (dispatch scroll effects) |
| `seffect_enchant_armor` | ~450 | — | — | TODO |
| `seffect_destroy_armor` | ~500 | — | — | TODO |
| `seffect_confuse_monster` | ~550 | — | — | TODO |
| `seffect_scare_monster` | ~600 | — | — | TODO |
| `seffect_remove_curse` | ~650 | — | — | TODO |
| `seffect_create_monster` | ~700 | — | — | TODO |
| `seffect_enchant_weapon` | ~750 | — | — | TODO |
| `seffect_taming` | ~800 | — | — | TODO |
| `seffect_genocide` | ~850 | — | — | TODO |
| `seffect_light` | ~900 | — | — | TODO |
| `seffect_charging` | ~950 | — | — | TODO |
| `seffect_amnesia` | ~1000 | — | — | TODO |
| `seffect_fire` | ~1050 | — | — | TODO |
| `seffect_earth` | ~1100 | — | — | TODO |
| `seffect_punishment` | ~1150 | — | — | TODO |
| `seffect_stinking_cloud` | ~1200 | — | — | TODO |
| `seffect_blank_paper` | ~1250 | — | — | TODO |
| `seffect_teleportation` | ~1300 | — | — | TODO |
| `seffect_gold_detection` | ~1350 | — | — | TODO |
| `seffect_food_detection` | ~1400 | — | — | TODO |
| `seffect_identify` | ~1450 | — | — | TODO |
| `seffect_magic_mapping` | ~1500 | — | — | TODO |
| `forget` | ~1550 | — | — | TODO (cause amnesia) |
| `maybe_tame` | ~1600 | — | — | TODO (attempt to tame) |
| `valid_cloud_pos` | ~1650 | — | — | TODO (valid cloud position) |
| `can_center_cloud` | ~1670 | — | — | TODO (can center cloud) |
| `display_stinking_cloud_positions` | ~1690 | — | — | TODO |
| `do_stinking_cloud` | ~1720 | — | — | TODO |
| `drop_boulder_on_player` | ~1760 | — | — | TODO (scroll of earth) |
| `drop_boulder_on_monster` | ~1800 | — | — | TODO |
| `charge_ok` | ~1840 | — | — | TODO (can be recharged) |
| `recharge` | ~1870 | — | — | TODO (recharge wand/tool) |
| `wand_explode` | ~1910 | — | — | TODO (overcharged wand explodes) |
| `set_lit` | ~1950 | — | — | TODO (set room lit state) |
| `litroom` | ~1980 | — | — | TODO (light/darken room) |
| `do_class_genocide` | ~2020 | — | — | TODO (genocide monster class) |
| `do_genocide` | ~2070 | — | — | TODO (genocide monster type) |
| `punish` | ~2120 | — | — | TODO (apply punishment) |
| `unpunish` | ~2160 | — | — | TODO (remove punishment) |
| `cant_revive` | ~2200 | — | — | TODO (check if can't revive) |
| `create_particular_parse` | ~2230 | — | — | TODO (parse monster name) |
| `create_particular_creation` | ~2260 | — | — | TODO (create specific monster) |
| `create_particular` | ~2300 | — | — | TODO (blessed create monster scroll) |

### trap.c → trap.js

Notes:
- Four functions implemented matching C names.
- `mintrap` partially covered by `mintrap_postmove` (PIT/SPIKED_PIT, TELEP_TRAP, MAGIC_TRAP only).
- `mon_check_in_air` is private (not exported).
- Most trap types (ARROW_TRAP, DART_TRAP, ROCKTRAP, LANDMINE, etc.) not yet handled.
- No player trap handling (dotrap) or launched object mechanics.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `m_harmless_trap` | ~200 | `m_harmless_trap` | 34 | Match (exported) |
| `floor_trigger` | ~250 | `floor_trigger` | 69 | Match (exported) |
| `mon_check_in_air` | ~280 | `mon_check_in_air` | 74 | Match (private) |
| `mintrap` | ~300 | `mintrap_postmove` | 83 | Renamed (exported; partial — PIT/TELEP/MAGIC only) |

### uhitm.c → uhitm.js

Notes:
- `do_attack`/`hmon_hitmon` combined into `playerAttackMonster` (camelCase; exported).
- Several internal helpers implemented: `weaponEnchantment`, `weaponDamageSides`, `luckBonus`, `dexToHit`, etc.
- `xkilled` from mon.c implemented as `handleMonsterKilled` (private).
- All 93 individual C functions (AD_* handlers, hmon_hitmon_* decomposition, etc.) are TODO stubs.

| C Function | C Line | JS Function | JS Line | Status |
|------------|--------|-------------|---------|--------|
| `do_attack` | 447 | `playerAttackMonster` | 656 | Renamed (exported; partial — basic melee) |
| `hmon_hitmon` | 1732 | (inlined in playerAttackMonster) | — | Inlined |
| `find_roll_to_hit` | 364 | `luckBonus` + `dexToHit` | 534, 540 | Split (private helpers) |
| `xkilled` | (mon.c) | `handleMonsterKilled` | 597 | Renamed (private; simplified) |
| `mhitm_mgc_atk_negated` | 74 | — | — | TODO |
| `dynamic_multi_reason` | 103 | — | — | TODO |
| `erode_armor` | 125 | — | — | TODO |
| `attack_checks` | 188 | — | — | TODO |
| `check_caitiff` | 330 | — | — | TODO |
| `mon_maybe_unparalyze` | 350 | — | — | TODO |
| `force_attack` | 431 | — | — | TODO |
| `known_hitum` | 586 | — | — | TODO |
| `hitum_cleave` | 650 | — | — | TODO |
| `double_punch` | 735 | — | — | TODO |
| `hitum` | 757 | — | — | TODO |
| `hmon` | 818 | — | — | TODO |
| `hmon_hitmon_barehands` | 837 | — | — | TODO |
| `hmon_hitmon_weapon_ranged` | 884 | — | — | TODO |
| `hmon_hitmon_weapon_melee` | 919 | — | — | TODO |
| `hmon_hitmon_weapon` | 1048 | — | — | TODO |
| `hmon_hitmon_potion` | 1073 | `hitMonsterWithPotion` | 573 | Partial (private) |
| `hmon_hitmon_misc_obj` | 1097 | — | — | TODO |
| `hmon_hitmon_do_hit` | 1365 | — | — | TODO |
| `hmon_hitmon_dmg_recalc` | 1414 | — | — | TODO |
| `hmon_hitmon_poison` | 1488 | — | — | TODO |
| `hmon_hitmon_jousting` | 1519 | — | — | TODO |
| `hmon_hitmon_stagger` | 1548 | — | — | TODO |
| `hmon_hitmon_pet` | 1566 | — | — | TODO |
| `hmon_hitmon_splitmon` | 1582 | — | — | TODO |
| `hmon_hitmon_msg_hit` | 1615 | — | — | TODO |
| `hmon_hitmon_msg_silver` | 1641 | — | — | TODO |
| `hmon_hitmon_msg_lightobj` | 1680 | — | — | TODO |
| `mhurtle_to_doom` | 1920 | — | — | TODO |
| `first_weapon_hit` | 1941 | — | — | TODO |
| `shade_aware` | 1970 | — | — | TODO |
| `shade_miss` | 1994 | — | — | TODO |
| `m_slips_free` | 2034 | — | — | TODO |
| `joust` | 2076 | — | — | TODO |
| `demonpet` | 2111 | — | — | TODO |
| `theft_petrifies` | 2126 | — | — | TODO |
| `steal_it` | 2152 | — | — | TODO |
| `mhitm_ad_rust` | 2259 | — | — | TODO |
| `mhitm_ad_corr` | 2316 | — | — | TODO |
| `mhitm_ad_dcay` | 2341 | — | — | TODO |
| `mhitm_ad_dren` | 2396 | — | — | TODO |
| `mhitm_ad_drli` | 2423 | — | — | TODO |
| `mhitm_ad_fire` | 2499 | — | — | TODO |
| `mhitm_ad_cold` | 2604 | — | — | TODO |
| `mhitm_ad_elec` | 2662 | — | — | TODO |
| `mhitm_ad_acid` | 2720 | — | — | TODO |
| `mhitm_ad_sgld` | 2768 | — | — | TODO |
| `mhitm_ad_tlpt` | 2837 | — | — | TODO |
| `mhitm_ad_blnd` | 2936 | — | — | TODO |
| `mhitm_ad_curs` | 2993 | — | — | TODO |
| `mhitm_really_poison` | 3082 | — | — | TODO |
| `mhitm_ad_drst` | 3100 | — | — | TODO |
| `mhitm_ad_drin` | 3146 | — | — | TODO |
| `mhitm_ad_stck` | 3284 | — | — | TODO |
| `mhitm_ad_wrap` | 3315 | — | — | TODO |
| `mhitm_ad_plys` | 3409 | — | — | TODO |
| `mhitm_ad_slee` | 3457 | — | — | TODO |
| `mhitm_ad_slim` | 3504 | — | — | TODO |
| `mhitm_ad_ench` | 3581 | — | — | TODO |
| `mhitm_ad_slow` | 3630 | — | — | TODO |
| `mhitm_ad_conf` | 3668 | — | — | TODO |
| `mhitm_ad_poly` | 3707 | — | — | TODO |
| `mhitm_ad_famn` | 3755 | — | — | TODO |
| `mhitm_ad_pest` | 3786 | — | — | TODO |
| `mhitm_ad_deth` | 3815 | — | — | TODO |
| `mhitm_ad_halu` | 3875 | — | — | TODO |
| `do_stone_u` | 3902 | — | — | TODO |
| `do_stone_mon` | 3923 | — | — | TODO |
| `mhitm_ad_phys` | 3959 | — | — | TODO |
| `mhitm_ad_ston` | 4181 | — | — | TODO |
| `mhitm_ad_were` | 4243 | — | — | TODO |
| `mhitm_ad_heal` | 4274 | — | — | TODO |
| `mhitm_ad_stun` | 4366 | — | — | TODO |
| `mhitm_ad_legs` | 4403 | — | — | TODO |
| `mhitm_ad_dgst` | 4470 | — | — | TODO |
| `mhitm_ad_samu` | 4548 | — | — | TODO |
| `mhitm_ad_dise` | 4571 | — | — | TODO |
| `mhitm_ad_sedu` | 4601 | — | — | TODO |
| `mhitm_ad_ssex` | 4729 | — | — | TODO |
| `mhitm_adtyping` | 4760 | — | — | TODO (dispatch AD_* by type) |
| `damageum` | 4813 | — | — | TODO |
| `explum` | 4869 | — | — | TODO |
| `start_engulf` | 4909 | — | — | TODO |
| `end_engulf` | 4927 | — | — | TODO |
| `gulpum` | 4936 | — | — | TODO |
| `missum` | 5176 | — | — | TODO |
| `m_is_steadfast` | 5196 | — | — | TODO |
| `mhitm_knockback` | 5225 | — | — | TODO |
| `hmonas` | 5402 | — | — | TODO (attack as monster form) |
| `passive` | 5843 | — | — | TODO (passive counterattack) |
| `passive_obj` | 6105 | — | — | TODO (passive damage to objects) |
| `that_is_a_mimic` | 6179 | — | — | TODO |
| `stumble_onto_mimic` | 6260 | — | — | TODO |
| `disguised_as_non_mon` | 6278 | — | — | TODO |
| `disguised_as_mon` | 6286 | — | — | TODO |
| `nohandglow` | 6293 | — | — | TODO |
| `flash_hits_mon` | 6319 | — | — | TODO |
| `light_hits_gremlin` | 6403 | — | — | TODO |

