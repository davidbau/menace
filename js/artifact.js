// artifact.js -- Artifact creation, invocation, special effects
// cf. artifact.c — hack_artifacts, init_artifacts, save_artifacts, restore_artifacts,
//                  artiname, mk_artifact, dispose_of_orig_obj, artifact_name,
//                  exist_artifact, artifact_exists, found_artifact, find_artifact,
//                  nartifact_exist, artifact_origin, spec_ability, confers_luck,
//                  arti_reflects, shade_glare, restrict_name, attacks, defends,
//                  defends_when_carried, protects, set_artifact_intrinsic,
//                  touch_artifact, arti_immune, bane_applies, spec_applies,
//                  spec_m2, spec_abon, spec_dbon, discover_artifact,
//                  undiscovered_artifact, disp_artifact_discoveries,
//                  dump_artifact_info, Mb_hit, invoke_ok, doinvoke,
//                  nothing_special, invoke_taming, invoke_healing,
//                  invoke_energy_boost, invoke_untrap, invoke_charge_obj,
//                  invoke_create_portal, invoke_create_ammo, invoke_banish,
//                  invoke_fling_poison, invoke_storm_spell, invoke_blinding_ray,
//                  arti_invoke_cost_pw, arti_invoke_cost, arti_invoke,
//                  finesse_ahriman, artifact_light, arti_speak,
//                  artifact_has_invprop, arti_cost, abil_to_adtyp, abil_to_spfx,
//                  what_gives, glow_color, glow_strength, glow_verb,
//                  Sting_effects, retouch_object, untouchable, retouch_equipment,
//                  count_surround_traps, mkot_trap_warn, is_magic_key,
//                  has_magic_key, is_art, get_artifact, permapoisoned
//
// artifact.c manages all artifact-specific behavior:
//   mk_artifact(): create artifact from object with alignment constraints.
//   spec_ability/attacks/defends/protects: check artifact properties.
//   set_artifact_intrinsic(): apply/remove worn/wielded artifact bonuses.
//   touch_artifact(): verify a creature can handle an artifact.
//   arti_invoke/doinvoke: the #invoke command and all invocation effects.
//   Mb_hit(): Magicbane special hit processing.
//   Sting_effects(): warning glow for Sting-like orc-sensing artifacts.
//   retouch_object/equipment: check touchability after form change.
//
// JS implementations: none — all artifact logic is runtime gameplay.
//   Artifact data (names, properties) lives in artifacts.js (data file).

// cf. artifact.c:87 [static] — hack_artifacts(void): initialize artifact specials
// Adjusts artifact entries for special cases at startup.
// TODO: artifact.c:87 — hack_artifacts(): artifact init fixups

// cf. artifact.c:111 — init_artifacts(void): zero artifact existence list
// Clears the artifact-exists tracking array at new game.
// TODO: artifact.c:111 — init_artifacts(): artifact list initialization

// cf. artifact.c:119 — save_artifacts(nhfp): save artifact data
// Writes artifact existence flags to save file.
// N/A: artifact.c:119 — save_artifacts() (JS uses storage.js)

// cf. artifact.c:133 — restore_artifacts(nhfp): restore artifact data
// Reads artifact existence flags from save file.
// N/A: artifact.c:133 — restore_artifacts() (JS uses storage.js)

// cf. artifact.c:151 — artiname(artinum): artifact name by index
// Returns name string for artifact number artinum.
// TODO: artifact.c:151 — artiname(): artifact name lookup

// cf. artifact.c:171 — mk_artifact(otmp, alignment, max_giftvalue, adjust_spe): create artifact
// Converts obj to an artifact; selects by alignment and gift value constraints.
// TODO: artifact.c:171 — mk_artifact(): artifact creation

// cf. artifact.c:312 [static] — dispose_of_orig_obj(obj): discard replaced object
// Removes and frees object when it is replaced during artifact creation.
// TODO: artifact.c:312 — dispose_of_orig_obj(): object disposal

// cf. artifact.c:329 — artifact_name(name, otyp_p, fuzzy): find artifact by name
// Searches artifact table for name match (exact or fuzzy); returns artifact number.
// TODO: artifact.c:329 — artifact_name(): artifact name search

// cf. artifact.c:356 — exist_artifact(otyp, name): check if artifact exists
// Returns TRUE if artifact with given type and name has been created.
// TODO: artifact.c:356 — exist_artifact(): artifact existence check

// cf. artifact.c:371 — artifact_exists(otmp, name, mod, flgs): mark artifact
// Sets or clears the existence flag for the artifact.
// TODO: artifact.c:371 — artifact_exists(): artifact existence flag

// cf. artifact.c:409 — found_artifact(a): mark artifact as found
// Records that artifact a has been encountered.
// TODO: artifact.c:409 — found_artifact(): artifact found flag

// cf. artifact.c:422 — find_artifact(otmp): register artifact finding
// Logs artifact discovery to livelog; marks as found.
// TODO: artifact.c:422 — find_artifact(): artifact discovery logging

// cf. artifact.c:462 — nartifact_exist(void): count existing artifacts
// Returns count of artifacts currently in the game world.
// TODO: artifact.c:462 — nartifact_exist(): artifact count

// cf. artifact.c:478 — artifact_origin(arti, aflags): set artifact origin flags
// Records how an artifact was obtained (wish, gift, found, etc.).
// TODO: artifact.c:478 — artifact_origin(): artifact origin tracking

// cf. artifact.c:516 — spec_ability(otmp, abil): check artifact ability
// Returns TRUE if artifact has the specified special ability flag.
// TODO: artifact.c:516 — spec_ability(): artifact ability check

// cf. artifact.c:526 — confers_luck(obj): object confers luck?
// Returns TRUE if carrying/wearing obj gives luck bonus.
// TODO: artifact.c:526 — confers_luck(): luck conferral check

// cf. artifact.c:537 — arti_reflects(obj): artifact gives reflection?
// Returns TRUE if artifact provides reflection to a monster.
// TODO: artifact.c:537 — arti_reflects(): artifact reflection check

// cf. artifact.c:555 — shade_glare(obj): effective against shades?
// Returns TRUE if artifact's light is effective against shades.
// TODO: artifact.c:555 — shade_glare(): shade vulnerability check

// cf. artifact.c:575 — restrict_name(otmp, name): name restricted for object?
// Returns TRUE if the given name is reserved for a different artifact type.
// TODO: artifact.c:575 — restrict_name(): artifact name restriction

// cf. artifact.c:626 — attacks(adtyp, otmp): artifact attacks with damage type?
// Returns TRUE if artifact has offensive attack of the given type.
// TODO: artifact.c:626 — attacks(): artifact attack type check

// cf. artifact.c:636 — defends(adtyp, otmp): artifact defends against damage type?
// Returns TRUE if artifact provides defense against the given damage type when wielded/worn.
// TODO: artifact.c:636 — defends(): artifact defense check

// cf. artifact.c:687 — defends_when_carried(adtyp, otmp): defense when carried?
// Returns TRUE if artifact defends against damage type even when just carried.
// TODO: artifact.c:687 — defends_when_carried(): carried defense check

// cf. artifact.c:698 — protects(otmp, being_worn): confers Protection?
// Returns TRUE if artifact grants the Protection property when worn/wielded.
// TODO: artifact.c:698 — protects(): Protection property check

// cf. artifact.c:716 — set_artifact_intrinsic(otmp, on, wp_mask): apply intrinsics
// Applies or removes all intrinsic properties conferred by artifact otmp.
// TODO: artifact.c:716 — set_artifact_intrinsic(): artifact intrinsic management

// cf. artifact.c:908 — touch_artifact(obj, mon): can creature touch artifact?
// Tests if mon can handle artifact obj; applies consequences if not.
// TODO: artifact.c:908 — touch_artifact(): artifact touchability check

// cf. artifact.c:979 — arti_immune(obj, dtyp): artifact immunity to damage?
// Returns TRUE if artifact grants immunity to given damage type.
// TODO: artifact.c:979 — arti_immune(): artifact damage immunity

// cf. artifact.c:993 [static] — bane_applies(oart, mon): bane effect applies?
// Returns TRUE if artifact's bane property applies to given monster.
// TODO: artifact.c:993 — bane_applies(): bane applicability check

// cf. artifact.c:1009 [static] — spec_applies(weap, mtmp): special attack applies?
// Returns TRUE if artifact's special attack applies to monster mtmp.
// TODO: artifact.c:1009 — spec_applies(): special attack applicability

// cf. artifact.c:1065 — spec_m2(otmp): M2 flags for special attack
// Returns monster M2 flags that the artifact's special attacks apply to.
// TODO: artifact.c:1065 — spec_m2(): special attack monster flags

// cf. artifact.c:1076 — spec_abon(otmp, mon): special attack bonus
// Returns to-hit bonus from artifact's special attack properties.
// TODO: artifact.c:1076 — spec_abon(): attack bonus from artifact

// cf. artifact.c:1091 — spec_dbon(otmp, mon, tmp): special damage bonus
// Returns damage bonus from artifact's special attack vs given monster.
// TODO: artifact.c:1091 — spec_dbon(): damage bonus from artifact

// cf. artifact.c:1113 — discover_artifact(m): add to discoveries
// Marks artifact m as identified and adds to discoveries list.
// TODO: artifact.c:1113 — discover_artifact(): artifact identification

// cf. artifact.c:1131 — undiscovered_artifact(m): fully identified?
// Returns TRUE if artifact has not been fully identified.
// TODO: artifact.c:1131 — undiscovered_artifact(): identification check

// cf. artifact.c:1147 — disp_artifact_discoveries(tmpwin): display discoveries
// Shows list of found and identified artifacts in window tmpwin.
// TODO: artifact.c:1147 — disp_artifact_discoveries(): discovery display

// cf. artifact.c:1177 — dump_artifact_info(tmpwin): wizard mode artifact dump
// Shows all artifacts with their flags and status.
// TODO: artifact.c:1177 — dump_artifact_info(): wizard artifact dump

// cf. artifact.c:1249 [static] — Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis, hittee): Magicbane hit
// Processes Magicbane special hit effects (curse, confusion, etc.) in combat.
// TODO: artifact.c:1249 — Mb_hit(): Magicbane special hit processing

// cf. artifact.c:1727 [static] — invoke_ok(obj): invocation filter callback
// Returns GETOBJ_SUGGEST for objects that can be invoked.
// TODO: artifact.c:1727 — invoke_ok(): invocation item filter

// cf. artifact.c:1749 — doinvoke(void): #invoke command
// Prompts for item and calls arti_invoke() for artifact invocation.
// TODO: artifact.c:1749 — doinvoke(): invoke command handler

// cf. artifact.c:1762 [static] — nothing_special(obj): no-op invocation message
// Prints "Nothing happens" for artifacts with no invocation effect.
// TODO: artifact.c:1762 — nothing_special(): invoke no-op message

// cf. artifact.c:1769 [static] — invoke_taming(obj): taming invocation
// Invokes artifact's taming power on nearby monsters.
// TODO: artifact.c:1769 — invoke_taming(): taming invocation

// cf. artifact.c:1780 [static] — invoke_healing(obj): healing invocation
// Invokes artifact's healing power (HP restoration).
// TODO: artifact.c:1780 — invoke_healing(): healing invocation

// cf. artifact.c:1818 [static] — invoke_energy_boost(obj): energy boost invocation
// Invokes artifact's power-point restoration effect.
// TODO: artifact.c:1818 — invoke_energy_boost(): energy boost invocation

// cf. artifact.c:1838 [static] — invoke_untrap(obj): untrap invocation
// Invokes artifact's trap removal power.
// TODO: artifact.c:1838 — invoke_untrap(): untrap invocation

// cf. artifact.c:1848 [static] — invoke_charge_obj(obj): charge invocation
// Invokes artifact's object-charging power.
// TODO: artifact.c:1848 — invoke_charge_obj(): charge invocation

// cf. artifact.c:1867 [static] — invoke_create_portal(obj): portal invocation
// Creates a magic portal to another level via artifact invocation.
// TODO: artifact.c:1867 — invoke_create_portal(): portal creation

// cf. artifact.c:1934 [static] — invoke_create_ammo(obj): ammo invocation
// Creates ammunition (arrows/bolts) via artifact invocation.
// TODO: artifact.c:1934 — invoke_create_ammo(): ammo creation

// cf. artifact.c:1963 [static] — invoke_banish(obj): banishment invocation
// Banishes hostile monsters via artifact invocation.
// TODO: artifact.c:1963 — invoke_banish(): banishment invocation

// cf. artifact.c:2022 [static] — invoke_fling_poison(obj): poison fling invocation
// Flings poison at targets via artifact invocation.
// TODO: artifact.c:2022 — invoke_fling_poison(): poison fling invocation

// cf. artifact.c:2040 [static] — invoke_storm_spell(obj): storm invocation
// Calls down a storm via artifact invocation.
// TODO: artifact.c:2040 — invoke_storm_spell(): storm invocation

// cf. artifact.c:2054 [static] — invoke_blinding_ray(obj): blinding ray invocation
// Fires a blinding ray via artifact invocation.
// TODO: artifact.c:2054 — invoke_blinding_ray(): blinding ray invocation

// cf. artifact.c:2091 [static] — arti_invoke_cost_pw(obj): invocation power cost
// Returns the power point cost to invoke this artifact.
// TODO: artifact.c:2091 — arti_invoke_cost_pw(): invocation power cost

// cf. artifact.c:2106 [static] — arti_invoke_cost(obj): check and deduct power
// Verifies player has enough power and deducts invocation cost.
// TODO: artifact.c:2106 — arti_invoke_cost(): invocation cost check

// cf. artifact.c:2131 [static] — arti_invoke(obj): main invocation dispatcher
// Dispatches to appropriate invoke_* function based on artifact properties.
// TODO: artifact.c:2131 — arti_invoke(): invocation dispatcher

// cf. artifact.c:2236 — finesse_ahriman(obj): freeing ends levitation?
// Checks if freeing Ahriman's Pentalpha ends levitation.
// TODO: artifact.c:2236 — finesse_ahriman(): Ahriman levitation check

// cf. artifact.c:2264 — artifact_light(obj): artifact always emits light?
// Returns TRUE if this artifact always radiates light when carried.
// TODO: artifact.c:2264 — artifact_light(): artifact light emission

// cf. artifact.c:2279 — arti_speak(obj): artifact speech
// Handles artifact speaking (e.g., Excalibur glowing, Vorpal Blade hissing).
// TODO: artifact.c:2279 — arti_speak(): artifact speech effect

// cf. artifact.c:2299 — artifact_has_invprop(otmp, inv_prop): invocation property?
// Returns TRUE if artifact has a specific invocation property.
// TODO: artifact.c:2299 — artifact_has_invprop(): invocation property check

// cf. artifact.c:2309 — arti_cost(otmp): artifact sale price
// Returns shop selling price for the artifact.
// TODO: artifact.c:2309 — arti_cost(): artifact price

// cf. artifact.c:2320 [static] — abil_to_adtyp(abil): ability to damage type
// Maps intrinsic ability flag to corresponding attack damage type.
// TODO: artifact.c:2320 — abil_to_adtyp(): ability/damage type mapping

// cf. artifact.c:2344 [static] — abil_to_spfx(abil): ability to special effect
// Maps intrinsic ability flag to corresponding special effect flag.
// TODO: artifact.c:2344 — abil_to_spfx(): ability/special effect mapping

// cf. artifact.c:2376 — what_gives(abil): object conferring intrinsic
// Returns first worn/wielded object that grants the given intrinsic.
// TODO: artifact.c:2376 — what_gives(): intrinsic source lookup

// cf. artifact.c:2427 — glow_color(arti_indx): artifact glow color name
// Returns color name string for warning artifact's glow.
// TODO: artifact.c:2427 — glow_color(): artifact glow color

// cf. artifact.c:2442 [static] — glow_strength(count): glow intensity level
// Returns glow strength descriptor based on detected-monster count.
// TODO: artifact.c:2442 — glow_strength(): glow intensity

// cf. artifact.c:2451 — glow_verb(count, ingsfx): glow verb
// Returns appropriate verb ("glow"/"glows"/"pulsate") for artifact warning.
// TODO: artifact.c:2451 — glow_verb(): glow verb selection

// cf. artifact.c:2466 — Sting_effects(orc_count): Sting warning glow
// Handles Sting-like artifact glowing when orcs are nearby.
// TODO: artifact.c:2466 — Sting_effects(): orc-sensing glow

// cf. artifact.c:2508 — retouch_object(objp, loseit): handle artifact touchability on use
// Tests if player can handle artifact; may destroy or drop it if not.
// TODO: artifact.c:2508 — retouch_object(): artifact touch check on use

// cf. artifact.c:2598 [static] — untouchable(obj, drop_untouchable): can artifact be touched?
// Tests if artifact can be touched after alignment/form change.
// TODO: artifact.c:2598 — untouchable(): post-change touchability

// cf. artifact.c:2640 — retouch_equipment(dropflag): re-check all equipped items
// After alignment change, checks all worn items for touchability.
// TODO: artifact.c:2640 — retouch_equipment(): equipment touchability recheck

// cf. artifact.c:2708 [static] — count_surround_traps(x, y): count adjacent traps
// Returns count of traps around given coordinate (for Master Key warning).
// TODO: artifact.c:2708 — count_surround_traps(): adjacent trap count

// cf. artifact.c:2753 — mkot_trap_warn(void): sense traps with Master Key
// Checks for adjacent traps when wielding the Master Key.
// TODO: artifact.c:2753 — mkot_trap_warn(): Master Key trap sensing

// cf. artifact.c:2775 — is_magic_key(mon, obj): object acts as magic key?
// Returns TRUE if obj is the Master Key (or equivalent) for mon.
// TODO: artifact.c:2775 — is_magic_key(): magic key check

// cf. artifact.c:2790 — has_magic_key(mon): find magic key in inventory
// Returns the magic key object from mon's inventory if any.
// TODO: artifact.c:2790 — has_magic_key(): magic key search

// cf. artifact.c:2808 — is_art(obj, art): object is specific artifact?
// Returns TRUE if obj is the artifact with index art.
// TODO: artifact.c:2808 — is_art(): specific artifact check

// cf. artifact.c:2821 [static] — get_artifact(obj): get artifact data
// Returns pointer to artifact struct for the given object.
// TODO: artifact.c:2821 — get_artifact(): artifact data lookup

// cf. artifact.c:2837 — permapoisoned(obj): object permanently poisoned?
// Returns TRUE if artifact has permanent poison property.
// TODO: artifact.c:2837 — permapoisoned(): permanent poison check
