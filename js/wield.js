// wield.js -- Weapon wielding, swapping, quivering, and two-weapon combat
// cf. wield.c — setuwep, dowield, doswapweapon, chwepon, welded, twoweapon
//
// Three weapon slots (cf. wield.c:8):
//   uwep (W_WEP)        — main weapon; set by 'w'; conveys intrinsics if weapon/weptool/artifact
//   uswapwep (W_SWAPWEP)— secondary weapon; set by 'x'; used for two-weapon combat
//   uquiver (W_QUIVER)  — readied ammunition; set by 'Q'; used by 'f' (fire) command
// Cursed weapons/weptools/heavy iron ball/iron chain/tin opener can weld
//   to the hand (will_weld macro). Welded weapons can't be unwielded or dropped.
// Partial JS implementation: dowield → handleWield() in commands.js:2371;
//   doswapweapon → handleSwapWeapon() in commands.js:3477.
//   JS tracks weapons as player.weapon / player.swapWeapon / player.quiver directly,
//   without the full wornmask/extrinsic machinery from worn.c.
//   Two-weapon combat, weld mechanic, chwepon, and slot-gone functions not implemented.

// cf. wield.c:100 — setuwep(obj): set hero's main weapon slot
// Calls setworn(obj, W_WEP); handles Sunsword stop-shining on unwield,
//   Ogresmasher status bar update. Sets u.unweapon flag:
//   TRUE if empty/launcher/ammo/missile/pole (not Snickersnee/mounted);
//   FALSE if weapon/weptool/wet_towel.
// JS equivalent: player.weapon = item (set directly in handleWield/commands.js:2446)
// TODO: wield.c:100 — setuwep(): full weapon-slot set with extrinsic/artifact handling

// cf. wield.c:132 [static] — cant_wield_corpse(obj): petrify hero for bare-handed cockatrice corpse
// If no gloves, obj is a petrifying corpse, and no Stone_resistance: petrifies hero.
// TODO: wield.c:132 — cant_wield_corpse(): bare-handed cockatrice wield petrification

// cf. wield.c:153 — empty_handed(): return string for bare-hand state
// Returns "empty handed" if wearing gloves, "bare handed" if humanoid,
//   "not wielding anything" otherwise (for paws/no hands).
// TODO: wield.c:153 — empty_handed(): bare-hand description string

// cf. wield.c:163 [static] — ready_weapon(wep): perform the actual wield
// Handles: null wep (unwield), corpse petrify check, two-handed+shield check,
//   retouch_object(), weld-to-hand message, setuwep(), artifact speak,
//   artifact lighting, unpaid-item shopkeeper message.
// Returns ECMD_OK/ECMD_TIME/ECMD_FAIL/ECMD_CANCEL.
// TODO: wield.c:163 — ready_weapon(): core weapon-equip logic

// cf. wield.c:271 — setuqwep(obj): set quivered ammunition slot
// Calls setworn(obj, W_QUIVER). No extra handling beyond setworn's update_inventory().
// TODO: wield.c:271 — setuqwep(): equip quiver slot

// cf. wield.c:280 — setuswapwep(obj): set secondary weapon slot
// Calls setworn(obj, W_SWAPWEP).
// TODO: wield.c:280 — setuswapwep(): equip secondary weapon slot

// cf. wield.c:289 [static] — ready_ok(obj): getobj callback for quiver selection
// Suggests ammo that matches current launcher; downplays launchers and non-weapons.
// TODO: wield.c:289 — ready_ok(): quiver-selection filter callback

// cf. wield.c:325 [static] — wield_ok(obj): getobj callback for wield selection
// Suggests weapons and weptools; excludes coins; downplays everything else.
// TODO: wield.c:325 — wield_ok(): wield-selection filter callback

// cf. wield.c:340 [static] — finish_splitting(obj): give split-off item its own inv slot
// Calls freeinv(obj) + addinv_nomerge(obj) after getobj split.
// TODO: wield.c:340 — finish_splitting(): split-stack inventory slot assignment

// cf. wield.c:350 — dowield(): #wield command — wield a weapon
// Prompts via getobj(wield_ok); handles: quivered-item confirmation with split offer,
//   weld check, pushweapon option (old weapon → uswapwep), untwoweapon().
// Partially implemented as handleWield() in commands.js:2371.
//   JS version lacks: weld check, cantwield, corpse petrify, two-weapon cleanup,
//   split stack, pushweapon option, artifact speak/light, shopkeeper message.
// TODO: wield.c:350 — dowield(): full #wield command implementation

// cf. wield.c:456 — doswapweapon(): #swap command — exchange primary and secondary weapons
// Checks: cantwield, welded. Swaps uwep↔uswapwep via ready_weapon()+setuswapwep().
// Validates two-weapon still possible after swap.
// Partially implemented as handleSwapWeapon() in commands.js:3477.
//   JS version lacks: cantwield, weld check, TWOWEAPOK validation.
// TODO: wield.c:456 — doswapweapon(): full #swap implementation

// cf. wield.c:499 — dowieldquiver(): #quiver command (Q key)
// Thin wrapper that calls doquiver_core("ready").
// TODO: wield.c:499 — dowieldquiver(): #quiver command handler

// cf. wield.c:507 — doquiver_core(verb): guts of #quiver / #fire quiver refill
// Prompts via getobj(ready_ok). Handles: '-' to unquiver, splitting from uwep/uswapwep
//   with confirmation, two-weapon untwoweapon cleanup, time cost only if uwep/twoweap affected.
// TODO: wield.c:507 — doquiver_core(): quiver slot assignment with full split/two-weapon handling

// cf. wield.c:677 — wield_tool(obj, verb): temporarily wield a tool (for 'a'pply/rub/etc.)
// Used when hero applies a pick-axe, whip, grappling hook, polearm, or rubs a lamp.
// Handles: already wielded check, armor-worn check, weld check, cantwield, shield+bimanual,
//   uquiver/uswapwep displacement, ready_weapon() or direct setuwep(); pushweapon option.
// TODO: wield.c:677 — wield_tool(): wield a tool for application

// cf. wield.c:756 — can_twoweapon(): check if two-weapon combat is possible right now
// Validates: could_twoweap(youmonst.data), both hands occupied, TWOWEAPOK for both weapons,
//   neither bimanual, no shield, uswapwep not an artifact, not petrifying corpse, not Glib/cursed.
// Returns TRUE if all checks pass; prints failure message and returns FALSE otherwise.
// Not implemented in JS (two-weapon combat not yet supported).
// TODO: wield.c:756 — can_twoweapon(): two-weapon combat eligibility check

// cf. wield.c:804 — drop_uswapwep(): drop secondary weapon when cursed or Glib
// Prints message ("slips from your left hand" / "evades your grasp" / spasm message),
//   then calls dropx(uswapwep).
// TODO: wield.c:804 — drop_uswapwep(): force-drop secondary weapon

// cf. wield.c:829 — set_twoweap(on_off): set u.twoweap flag
// Simple setter; separated so it can be referenced by name.
// TODO: wield.c:829 — set_twoweap(): set two-weapon mode flag

// cf. wield.c:836 — dotwoweapon(): #twoweapon command
// Toggles two-weapon combat. Off: simple message + set_twoweap(FALSE).
// On: calls can_twoweapon(); on success, set_twoweap(TRUE); costs a turn if
//   rnd(20) > ACURR(A_DEX) (DEX check for coordination).
// TODO: wield.c:836 — dotwoweapon(): #twoweapon command handler

// cf. wield.c:864 — uwepgone(): force-remove main weapon (item consumed/stolen/destroyed)
// Ends artifact lighting if uwep was lit; calls setworn(null, W_WEP);
//   sets u.unweapon=TRUE; calls update_inventory().
// TODO: wield.c:864 — uwepgone(): main weapon forcibly removed

// cf. wield.c:879 — uswapwepgone(): force-remove secondary weapon
// Calls setworn(null, W_SWAPWEP); update_inventory().
// TODO: wield.c:879 — uswapwepgone(): secondary weapon forcibly removed

// cf. wield.c:888 — uqwepgone(): force-remove quivered weapon
// Calls setworn(null, W_QUIVER); update_inventory().
// TODO: wield.c:888 — uqwepgone(): quivered weapon forcibly removed

// cf. wield.c:897 — untwoweapon(): cancel two-weapon mode with message
// Prints "can no longer wield two weapons at once", calls set_twoweap(FALSE), update_inventory().
// TODO: wield.c:897 — untwoweapon(): cancel two-weapon combat

// cf. wield.c:909 — chwepon(otmp, amount): enchant or disenchant wielded weapon
// Effect of scroll of enchant weapon (+) or curse (-). Handles:
//   not a weapon → "hands twitch/itch" strange_feeling; special worm tooth↔crysknife
//   transformation; spe cap (>5 or <-5: rn2(3) evaporation); normal glow + spe change;
//   Magicbane itch/flinch; elven weapon vibration at spe>5.
// TODO: wield.c:909 — chwepon(): weapon enchantment/disenchantment

// cf. wield.c:1042 — welded(obj): test if hero's main weapon is welded to hand
// Returns 1 if obj==uwep and will_weld(obj) (cursed + erodeable_wep or tin opener);
//   also calls set_bknown(obj,1) to identify cursed status.
// TODO: wield.c:1042 — welded(): check if main weapon is welded to hand

// cf. wield.c:1052 — weldmsg(obj): print "X is welded to your hand!" message
// Temporarily clears owornmask to suppress "(weapon in hand)" in doname().
// TODO: wield.c:1052 — weldmsg(): print weld message for wielded item

// cf. wield.c:1069 — mwelded(obj): test if a monster's weapon is welded
// Returns TRUE if obj has W_WEP bit and is cursed erodeable/tin-opener.
// Called from monster attack code to determine if monster can change weapons.
// TODO: wield.c:1069 — mwelded(): monster weapon weld check
