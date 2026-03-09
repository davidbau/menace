# ASYNC_CLEANUP

Catalog of async suspension origins in gameplay/runtime code.

## Proposed Execution Model (Single-Thread Faithful)

Goal: preserve NetHack's single-threaded semantics in JS by allowing only one
active origin-await at a time.

### Core Invariants

1. Single active origin await:
   - At runtime, exactly zero or one origin await may be active.
   - Starting a second origin await while one is active is a hard error.
2. No unregistered suspension:
   - If the top-level command loop is paused, there must be an active origin
     token describing why.
   - If paused-without-origin is observed, treat it as a missing-origin bug.
3. Deterministic key ownership:
   - Keyboard input is consumed only by input-consuming origins.
   - Non-input origins must not directly consume keys.

### Origin Registration Lifecycle

Each origin helper (for example `nhgetch`, `nh_delay_output`, `await import`,
`await fetch`, save/load async boundary) is responsible for registering itself:

1. `beginOriginAwait(originType, meta)` sets global active-origin state.
2. Await underlying Promise.
3. `endOriginAwait(token)` clears active-origin state.

Required diagnostics:
- origin type (`input`, `delay`, `import`, `fetch`, `save_load`, `more_prompt`)
- callsite metadata (`site`, module/function, optional boundary owner)
- nested-origin violation info (existing + attempted origin)
- paused-without-origin violation info

### Input Queue Semantics

When a non-input origin is active:
- incoming keys are queued in input runtime
- keys are not dropped and not consumed by non-input code

When the next input-consuming origin activates:
- it drains from the same deterministic queue (`pushInput`/`nhgetch` path)
- replay/live behavior remains aligned

### `--More--` Policy

Use one primitive key-read origin (`nhgetch`) and build policy above it:

1. show `--More--`
2. loop: read next key via `nhgetch`
3. if key is an allowed dismiss key, clear `--More--` and return
4. otherwise ignore and continue loop

This avoids separate "key discard mode" plumbing and keeps dismissal logic
close to C `more()/xwaitforspace()` behavior.

### Wrapper Reduction Plan

`awaitInput` / `awaitMore` are transitional wrappers. Target state:
- origin helpers carry the registration logic directly
- callsites await origin helpers directly
- wrappers become optional diagnostics adapters (or are removed)

This avoids duplicate instrumentation layers and makes origin accounting exact.

### Canonical Origin Set (Current Scope)

- Input: `nhgetch_raw` / `nhgetch_wrap` (ultimately runtime `nhgetch`)
- Delay: `nh_delay_output`
- Explicit more prompt: `awaitDisplayMorePrompt` -> `display.morePrompt`
- Module/network I/O: `await import`, `await fetch`
- Persistence I/O: async save/load boundaries (`loadAutosave`, browser save)

Non-origins (dispatch/wrappers):
- `awaitInput`, `awaitMore`
- `putstr_message` (may internally reach a more/input origin but is not itself
  a root origin primitive)
- boundary callback awaits such as `topBoundary.onKey` (consume already-read key)

## 1. nhgetch Callsite Inventory

- Total callsites: 104
- `nhgetch_raw` callsites: 79
- `nhgetch_wrap` callsites: 25
- Marked `--More--` boundary callsites: 24

| File:Line | Function | Reader | More? | Purpose | Site |
|---|---|---|---|---|---|
| js/allmain.js:2344 | _consumePendingMoreBoundary | wrap | yes | Dismiss/acknowledge --More-- boundary |  |
| js/allmain.js:2358 | _readCommandLoopKey | wrap | yes | Dismiss/acknowledge --More-- boundary |  |
| js/apply.js:1035 | resolveApplySelection | wrap | no | Choose direction | apply.chop.direction |
| js/apply.js:1047 | resolveApplySelection | wrap | no | Choose direction | apply.lockpick.direction |
| js/apply.js:1129 | fn | wrap | no | Choose direction | apply.use-directional.direction |
| js/apply.js:1179 | fn | wrap | no | Choose item/inventory entry | apply.select.loop |
| js/apply.js:1222 | fn | raw | yes | Dismiss/acknowledge --More-- boundary | apply.inventory-list.morePrompt |
| js/apply.js:1228 | fn | raw | yes | Dismiss/acknowledge --More-- boundary | apply.inventory-list.more-fallback |
| js/apply.js:1258 | fn | raw | yes | Dismiss/acknowledge --More-- boundary | apply.invalid-invlet.morePrompt |
| js/chargen.js:63 | playerSelection | raw | no | Choose item/inventory entry | chargen.playerSelection.autopickPrompt |
| js/chargen.js:158 | showGameOver | raw | no | Character generation/startup menu flow | chargen.showGameOver.dismiss |
| js/chargen.js:210 | showGameOver | raw | no | Character generation/startup menu flow | chargen.showGameOver.playAgain |
| js/chargen.js:254 | enterTutorial | raw | yes | Dismiss/acknowledge --More-- boundary | chargen.enterTutorial.morePrompt |
| js/chargen.js:336 | handleReset | raw | no | Character generation/startup menu flow | chargen.handleReset.noSavedData |
| js/chargen.js:347 | handleReset | raw | no | Character generation/startup menu flow | chargen.handleReset.confirmDelete |
| js/chargen.js:369 | restoreFromSave | raw | no | Character generation/startup menu flow | chargen.restoreFromSave.confirm |
| js/chargen.js:483 | showRoleMenu | raw | no | Choose item/inventory entry | chargen.showRoleMenu.select |
| js/chargen.js:570 | showRaceMenu | raw | no | Choose item/inventory entry | chargen.showRaceMenu.select |
| js/chargen.js:641 | showGenderMenu | raw | no | Choose item/inventory entry | chargen.showGenderMenu.select |
| js/chargen.js:711 | showAlignMenu | raw | no | Choose item/inventory entry | chargen.showAlignMenu.select |
| js/chargen.js:752 | showConfirmation | raw | no | Choose item/inventory entry | chargen.showConfirmation.select |
| js/chargen.js:806 | showLoreAndWelcome | raw | yes | Dismiss/acknowledge --More-- boundary | chargen.showLoreAndWelcome.loreMore |
| js/chargen.js:874 | showLoreAndWelcome | raw | yes | Dismiss/acknowledge --More-- boundary | chargen.showLoreAndWelcome.welcomeMore |
| js/chargen.js:958 | showFilterMenu | raw | no | Character generation/startup menu flow | chargen.showFilterMenu.loop |
| js/cmd.js:789 | queueRepeatExtcmd | raw | no | Command/prompt key input | cmd.handleExtendedCommand.enhance |
| js/cmd.js:931 | readExtendedCommandLine | raw | no | Command/prompt key input | cmd.readExtendedCommandLine |
| js/cmd.js:965 | handleExtendedCommandUntrap | raw | no | Choose direction | cmd.handleExtendedCommandUntrap.direction |
| js/cmd.js:1020 | handleExtendedCommandUntrap | raw | no | Choose item/inventory entry | cmd.handleExtendedCommandUntrap.tool |
| js/cmd.js:1038 | handleExtendedCommandName | raw | no | Choose item/inventory entry | cmd.handleExtendedCommandName.select |
| js/do_name.js:1147 | handleCallObjectTypePrompt | raw | no | Choose item/inventory entry | do_name.handleCallObjectTypePrompt.select |
| js/do_wear.js:1928 | putOnSelectedItem | raw | no | Choose item/inventory entry | do_wear.putOnSelectedItem.ringFinger |
| js/do_wear.js:2191 | showWearHelpList | raw | no | Choose item/inventory entry | do_wear.handleWear.select |
| js/do_wear.js:2273 | showPutOnHelpList | raw | no | Choose item/inventory entry | do_wear.handlePutOn.select |
| js/do_wear.js:2344 | showTakeOffHelpList | raw | no | Choose item/inventory entry | do_wear.handleTakeOff.select |
| js/do_wear.js:2404 | showRemoveHelpList | raw | no | Choose item/inventory entry | do_wear.handleRemove.select |
| js/do.js:688 | showToplineErrorWithMore | raw | yes | Dismiss/acknowledge --More-- boundary | do.handleDrop.moreBoundary |
| js/do.js:703 | showToplineErrorWithMore | wrap | no | Choose item/inventory entry | do.handleDrop.select |
| js/do.js:817 | showDropCandidates | wrap | yes | Dismiss/acknowledge --More-- boundary | do.showDropCandidates.more |
| js/do.js:940 | promptDropTypeClass | wrap | no | Command/prompt key input | do.promptDropTypeClass.input |
| js/do.js:993 | handleDropTypes | wrap | no | Choose item/inventory entry | do.handleDropTypes.select |
| js/dokick.js:1640 | dokick | raw | no | Choose direction | dokick.dokick.direction |
| js/dothrow.js:205 | promptDirectionAndThrowItem | wrap | no | Choose direction | dothrow.promptDirectionAndThrowItem.direction |
| js/dothrow.js:362 | handleThrow | wrap | no | Choose item/inventory entry | dothrow.handleThrow.select |
| js/dothrow.js:452 | handleFire | wrap | no | Choose direction | dothrow.handleFire.bullwhipDirection |
| js/dothrow.js:564 | handleFire | wrap | no | Choose item/inventory entry | dothrow.handleFire.select |
| js/dothrow.js:622 | handleFire | wrap | no | Command/prompt key input | dothrow.handleFire.readyWieldedConfirm |
| js/eat.js:1849 | handleEat | wrap | no | Command/prompt key input | eat.handleEat.floorPrompt |
| js/eat.js:1879 | handleEat | wrap | no | Choose item/inventory entry | eat.handleEat.inventorySelect |
| js/eat.js:1928 | handleEat | wrap | yes | Dismiss/acknowledge --More-- boundary | eat.handleEat.moreDismiss |
| js/engrave.js:408 | read_engr_at | raw | yes | Dismiss/acknowledge --More-- boundary | engrave.read_engr_at.moreDismiss |
| js/engrave.js:599 | handleEngrave | raw | no | Command/prompt key input | engrave.handleEngrave.stylusPrompt |
| js/getpos.js:571 | getpos_async | wrap | yes | Dismiss/acknowledge --More-- boundary | getpos.tip.moreDismiss |
| js/getpos.js:628 | getpos_async | wrap | no | Move targeting cursor / pick map position | getpos.getpos_async.loop |
| js/getpos.js:816 | getpos_async | raw | yes | Dismiss/acknowledge --More-- boundary | getpos.forcefalse.unknown.more |
| js/hack.js:3797 | getdir | raw | no | Choose direction | hack.getdir.read |
| js/input.js:493 | readUnifiedKey | raw | no | Input subsystem internal boundary read |  |
| js/input.js:534 | readBoundaryKey | wrap | yes | Dismiss/acknowledge --More-- boundary |  |
| js/input.js:540 | readBoundaryKey | wrap | yes | Dismiss/acknowledge --More-- boundary |  |
| js/invent.js:270 | renderOverlayMenuUntilDismiss | raw | no | Command/prompt key input | invent.renderOverlayMenuUntilDismiss.loop |
| js/invent.js:349 | handleInventory | raw | no | Choose item/inventory entry | invent.handleInventory.loop |
| js/invent.js:610 | handleInventory | raw | no | Choose item/inventory entry | invent.handleInventory.actionMenu |
| js/invent.js:674 | handleInventory | raw | no | Choose item/inventory entry | invent.handleInventory.adjustLetter |
| js/invent.js:1508 | doorganize | raw | no | Choose item/inventory entry | invent.doorganize.selectItem |
| js/invent.js:1568 | doorganize | raw | no | Choose item/inventory entry | invent.doorganize.selectLetter |
| js/kick.js:50 | handleKick | raw | yes | Dismiss/acknowledge --More-- boundary | kick.handleKick.woundedLegs.morePrompt |
| js/kick.js:57 | handleKick | raw | no | Choose direction | kick.handleKick.direction |
| js/lock.js:519 | pick_lock | raw | no | Choose direction | lock.pick_lock.direction |
| js/lock.js:952 | handleOpen | raw | no | Choose direction | lock.handleOpen.direction |
| js/lock.js:1046 | handleClose | raw | no | Choose direction | lock.handleClose.direction |
| js/mthrowu.js:345 | maybeFlushToplineBeforeMessage | raw | yes | Dismiss/acknowledge --More-- boundary | mthrowu.maybeFlushToplineBeforeMessage.morePrompt |
| js/mthrowu.js:666 | flightBlocked | raw | yes | Dismiss/acknowledge --More-- boundary | mthrowu.m_throw.impact.morePrompt |
| js/o_init.js:685 | handleDiscoveries | raw | no | Command/prompt key input | o_init.handleDiscoveries.pageNav |
| js/options.js:2058 | editDoWhatCountOption | raw | no | Navigate/edit options UI | options.editDoWhatCountOption |
| js/options.js:2105 | editStatusHilitesOption | raw | no | Navigate/edit options UI | options.editStatusHilitesOption |
| js/options.js:2134 | editStatusHilitesOption | raw | no | Navigate/edit options UI | options.editStatusHilitesOption.submenu |
| js/options.js:2175 | editStatusConditionsOption | raw | no | Navigate/edit options UI | options.editStatusConditionsOption |
| js/options.js:2216 | editNumberPadModeOption | raw | no | Navigate/edit options UI | options.editNumberPadModeOption |
| js/options.js:2276 | editAutounlockOption | raw | no | Navigate/edit options UI | options.editAutounlockOption |
| js/options.js:2359 | editPickupTypesOption | raw | no | Navigate/edit options UI | options.editPickupTypesOption |
| js/options.js:2384 | editPickupTypesOption | raw | no | Navigate/edit options UI | options.handleSet.loop |
| js/pager.js:217 | do_look | raw | no | Navigate pager/help text | pager.do_look.identify |
| js/pager.js:357 | dolook | raw | yes | Dismiss/acknowledge --More-- boundary | pager.handleLook.readEngraving.morePrompt |
| js/pager.js:440 | render | raw | no | Navigate pager/help text | pager.showPager.loop |
| js/pager.js:516 | showMoreTextPages | raw | yes | Dismiss/acknowledge --More-- boundary | pager.showMoreTextPages.more |
| js/pager.js:571 | getSearchTerm | raw | no | Navigate pager/help text | pager.getSearchTerm.loop |
| js/pager.js:777 | showTextWindowFile | raw | yes | Dismiss/acknowledge --More-- boundary | pager.showTextWindowFile.more |
| js/pickup.js:1526 | doTakeOut | raw | no | Choose item/inventory entry | pickup.handleUseContainer.classSelect |
| js/pickup.js:1594 | doTakeOut | raw | no | Choose item/inventory entry | pickup.handleUseContainer.takeOutSelect |
| js/pickup.js:1713 | doPutIn | raw | no | Command/prompt key input | pickup.handleUseContainer.menuLoop |
| js/pickup.js:1764 | doPutIn | raw | no | Choose item/inventory entry | pickup.handleUseContainer.stashSelect |
| js/pickup.js:1799 | handleLoot | raw | no | Choose direction | pickup.handleLoot.direction |
| js/potion.js:402 | handleQuaff | raw | no | Command/prompt key input | potion.handleQuaff.fountainConfirm |
| js/potion.js:442 | showQuaffPrompt | raw | no | Choose item/inventory entry | potion.handleQuaff.select |
| js/promo.js:232 | run | wrap | no | Promo/menu scene key handling |  |
| js/read.js:325 | showReadPrompt | wrap | no | Choose item/inventory entry | read.handleRead.select |
| js/read.js:386 | showReadPrompt | raw | no | Command/prompt key input | read.handleRead.refreshKnownSpellConfirm |
| js/read.js:499 | fn | raw | yes | Dismiss/acknowledge --More-- boundary | read.handleRead.invalidInvletMorePrompt |
| js/sounds.js:1152 | dotalk | raw | no | Choose direction | sounds.dotalk.direction |
| js/spell.js:449 | handleKnownSpells | raw | no | Command/prompt key input | spell.handleKnownSpells.dismiss |
| js/spell.js:1048 | getspell | raw | no | Choose item/inventory entry | spell.getspell.select |
| js/wield.js:428 | handleWield | wrap | no | Choose item/inventory entry | wield.handleWield.select |
| js/wield.js:469 | handleWield | raw | yes | Dismiss/acknowledge --More-- boundary | wield.handleWield.invalidInvletMorePrompt |
| js/wield.js:621 | handleQuiver | raw | no | Choose item/inventory entry | wield.handleQuiver.select |
| js/zap.js:550 | showZapPrompt | raw | no | Choose item/inventory entry | zap.handleZap.selectWand |

## 2. nh_delay_output Await Callsites

- Total await callsites: 28

| File:Line | Function | Purpose | Code |
|---|---|---|---|
| js/animation.js:204 | tmp_at_end_async | Core tmp_at animation backtrack pacing | `await this.nh_delay_output();` |
| js/apply.js:154 | do_blinding_ray | Animation frame delay boundary | `await nh_delay_output();` |
| js/delay.js:17 | delay_output | Compatibility wrapper forwarding to nh_delay_output | `await nh_delay_output(ms);` |
| js/delay.js:21 | delay_output_raf | Compatibility wrapper forwarding to nh_delay_output | `await nh_delay_output(ms);` |
| js/detect.js:127 | flash_glyph_at | Animation frame delay boundary | `await nh_delay_output();` |
| js/dig.js:802 | zap_dig | Digging beam/visual pacing | `await nh_delay_output();` |
| js/display.js:1801 | shieldeff | Core tmp_at animation backtrack pacing | `await nh_delay_output();` |
| js/dothrow.js:285 | promptDirectionAndThrowItem | Thrown-projectile frame pacing | `await nh_delay_output();` |
| js/dothrow.js:1107 | boomhit_visual | Thrown-projectile frame pacing | `await nh_delay_output();` |
| js/dothrow.js:1206 | throwit | Thrown-projectile frame pacing | `await nh_delay_output();` |
| js/dothrow.js:1557 | sho_obj_return_to_u | Thrown-projectile frame pacing | `await nh_delay_output();` |
| js/explode.js:124 | explode | Animation frame delay boundary | `await nh_delay_output();` |
| js/hack.js:2883 | runmode_delay_output | runmode_delay_output pacing during movement | `await nh_delay_output();` |
| js/hack.js:2885 | runmode_delay_output | runmode_delay_output pacing during movement | `await nh_delay_output();` |
| js/hack.js:2886 | runmode_delay_output | runmode_delay_output pacing during movement | `await nh_delay_output();` |
| js/hack.js:2887 | runmode_delay_output | runmode_delay_output pacing during movement | `await nh_delay_output();` |
| js/hack.js:2888 | runmode_delay_output | runmode_delay_output pacing during movement | `await nh_delay_output();` |
| js/mthrowu.js:754 | flightBlocked | Monster projectile frame pacing | `await nh_delay_output();` |
| js/mthrowu.js:758 | flightBlocked | Monster projectile frame pacing | `await nh_delay_output();` |
| js/muse.js:1690 | mbhit | Animation frame delay boundary | `await nh_delay_output();` |
| js/spell.js:916 | cast_chain_lightning | Spell visual pacing | `await nh_delay_output();` |
| js/spell.js:926 | cast_chain_lightning | Spell visual pacing | `await nh_delay_output();` |
| js/spell.js:927 | cast_chain_lightning | Spell visual pacing | `await nh_delay_output();` |
| js/trap.js:827 | trapeffect_rolling_boulder_trap_mon | Trap animation pacing | `await nh_delay_output();` |
| js/uhitm.js:1358 | start_engulf | Animation frame delay boundary | `await nh_delay_output();` |
| js/uhitm.js:1359 | start_engulf | Animation frame delay boundary | `await nh_delay_output();` |
| js/zap.js:1085 | bhit_zapped_wand | Beam/zap frame pacing | `await nh_delay_output();` |
| js/zap.js:1154 | dobuzz | Beam/zap frame pacing | `await nh_delay_output();` |

## 3. Ad-hoc Raw Timer Awaits (setTimeout Promises)

- Total ad-hoc timer awaits: 2

| File:Line | Function | Code |
|---|---|---|
| js/animation.js:146 | nh_delay_output | `await new Promise((resolve) => setTimeout(resolve, ms));` |
| js/storage.js:1034 | handleSave | `await new Promise(r => setTimeout(r, 500));` |

## 4. awaitDisplayMorePrompt Callsites

- Total callsites: 11

| File:Line | Purpose |
|---|---|
| js/apply.js:1222 | Dismiss `--More--` after inventory-list prompt |
| js/apply.js:1258 | Dismiss `--More--` after invalid inventory letter |
| js/chargen.js:254 | Dismiss tutorial intro `--More--` |
| js/do.js:688 | Dismiss `--More--` in drop flow top-line error |
| js/getpos.js:816 | Dismiss `--More--` in map-position help/tip flow |
| js/kick.js:50 | Dismiss `--More--` in kick flow prompt |
| js/mthrowu.js:345 | Dismiss `--More--` in monster-throw messaging |
| js/mthrowu.js:666 | Dismiss `--More--` in blocked/impact throw messaging |
| js/pager.js:357 | Dismiss `--More--` in read-engraving pager path |
| js/read.js:499 | Dismiss `--More--` after invalid read selection |
| js/wield.js:469 | Dismiss `--More--` after invalid wield selection |

## 5. display.morePrompt Direct Callsites

- Total direct callsites: 1
- Note: this is the centralized implementation site; gameplay callsites use section 4 (`awaitDisplayMorePrompt`), so we avoid double counting.

| File:Line | Purpose |
|---|---|
| js/suspend.js:32 | Wrapper calls `display.morePrompt(readMoreKey)` |

## 6. await import Callsites

- Total callsites: 23
- Classification summary:
  - `cycle-breaker`: 10
  - `lazy-cold-path`: 11
  - `runtime-adapter`: 2

| File:Line | Classification | Rationale |
|---|---|
| js/allmain.js:1674 | cycle-breaker | `allmain <-> chargen` direct module cycle; import deferred at init path |
| js/allmain.js:2335 | cycle-breaker | `allmain <-> chargen` direct module cycle; game-over path deferred |
| js/allmain.js:2396 | lazy-cold-path | travel command helper loaded only when travel path executes |
| js/do.js:1196 | cycle-breaker | `do <-> hack` direct module cycle; movement-update helper deferred |
| js/dog.js:1010 | cycle-breaker | `dog <-> dogmove` direct module cycle; `dog_eat` helper deferred |
| js/dog.js:1061 | cycle-breaker | `dog <-> dogmove` direct module cycle; `dog_eat` helper deferred |
| js/mplayer.js:106 | lazy-cold-path | `verbalize` needed only in specific monster-player message branch |
| js/pager.js:740 | runtime-adapter | Node-only fallback (`node:fs/promises`) for non-browser help loading |
| js/pickup.js:1865 | cycle-breaker | `pickup <-> lock` direct module cycle in autounlock path |
| js/pickup.js:1888 | lazy-cold-path | shop payment helper loaded only when in-shop pickup path triggers |
| js/pickup.js:2140 | cycle-breaker | `pickup <-> lock` direct module cycle in autounlock path |
| js/read.js:1773 | lazy-cold-path | map-position helper loaded only in specific scroll/effect branches |
| js/read.js:1790 | lazy-cold-path | region helper loaded only for gas-cloud effect branch |
| js/read.js:1807 | lazy-cold-path | object-placement helpers loaded only for boulder-drop path |
| js/sounds.js:1149 | runtime-adapter | local lazy import for `#chat` handling path avoids widening top-level deps |
| js/sounds.js:1150 | runtime-adapter | local lazy import for `#chat` direction constants |
| js/timeout.js:594 | lazy-cold-path | rare timeout-revival branch helper |
| js/timeout.js:600 | lazy-cold-path | rare timeout-zombify branch helper |
| js/timeout.js:606 | lazy-cold-path | rare timeout-rot branch helper |
| js/timeout.js:757 | lazy-cold-path | leg-heal timeout branch helper |
| js/timeout.js:893 | lazy-cold-path | rare timeout-monster spawn helper |
| js/trap.js:1736 | cycle-breaker | `trap <-> potion` direct module cycle; status helper deferred |
| js/zap.js:1526 | cycle-breaker | `zap <-> explode` direct module cycle; explosion helper deferred |

## 7. await fetch Callsites

- Total callsites: 3

| File:Line | Purpose |
|---|---|
| js/nethack.js:50 | Load external keylog JSON for replay |
| js/pager.js:733 | Load help text file |
| js/pager.js:1120 | Load Guidebook text |

## 8. Async Save/Load Callsites

- Total callsites: 2

| File:Line | Purpose |
|---|---|
| js/allmain.js:1692 | Load autosave if manual save absent |
| js/nethack.js:34 | Save current game via browser menu action |

## 9. Boundary Callback Awaits (`topBoundary.onKey`) Explained

`topBoundary.onKey` is not a separate async origin.
It is a dispatch point for a key already read from `nhgetch`.

Flow in `run_command`:
1. `_readCommandLoopKey(...)` reads one key (`nhgetch_wrap({ handleMore: false })`).
2. `peekInputBoundary()` returns the current owner (`more`, `prompt`, menu, etc.).
3. `run_command` awaits `topBoundary.onKey(chCode, game)` through `awaitInput(...)`.
4. The boundary handler reports whether it consumed the key.

So this boundary await is an ownership/dispatch mechanism layered over the input origin; it does not introduce a new key source.

Notes:
- `animation_examples.js` and `delay_output` wrappers are blacklisted from CODEMATCH parity scope.
- `nh_delay_output` is the canonical gameplay delay primitive; `delay_output`/`delay_output_raf` are compatibility wrappers in `js/delay.js`.
