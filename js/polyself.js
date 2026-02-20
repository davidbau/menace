// polyself.js -- Polymorphing mechanics for player character
// cf. polyself.c — set_uasmon, float_vs_flight, steed_vs_stealth,
//                  check_strangling, polyman, change_sex, livelog_newform,
//                  newman, polyself, polymon, uasmon_maxStr, dropp,
//                  break_armor, drop_weapon, rehumanize, dobreathe,
//                  dospit, doremove, dospinweb, dosummon, dogaze, dohide,
//                  dopoly, domindblast, uunstick, skinback,
//                  mbodypart, body_part, poly_gender, ugolemeffects,
//                  armor_to_dragon, polysense, ugenocided, udeadinside
//
// polyself.c handles player polymorphing into monster forms:
//   polyself()/polymon(): polymorph into random or specific monster form.
//   rehumanize(): return to original form at timeout or HP depletion.
//   break_armor(): remove unsuitable armor when changing form.
//   dobreathe/dospit/dospinweb/dogaze/dosummon: form-specific attacks.
//   body_part(): get body part name appropriate for current form.
//   ugolemeffects(): handle golem-specific damage immunity.
//
// JS implementations:
//   (none yet — polymorph mechanics not yet ported)

// cf. polyself.c:38 [static] — set_uasmon(void): update youmonst data pointer
// Updates youmonst.data structure pointer and intrinsics after polymorph.
// TODO: polyself.c:38 — set_uasmon(): polymorphed monster data update

// cf. polyself.c:131 — float_vs_flight(void): resolve levitation vs flying priority
// Sets or clears flying flag based on levitation priority.
// TODO: polyself.c:131 — float_vs_flight(): flight/levitation priority

// cf. polyself.c:158 — steed_vs_stealth(void): block stealth when riding
// Blocks stealth when riding unless flying.
// TODO: polyself.c:158 — steed_vs_stealth(): riding stealth interaction

// cf. polyself.c:168 [static] — check_strangling(on): strangling immunity check
// Handles strangulation immunity for the new polymorphed form.
// TODO: polyself.c:168 — check_strangling(): polymorph strangulation immunity

// cf. polyself.c:200 [static] — polyman(fmt, arg): return to human form
// Creates a new human form for the player.
// TODO: polyself.c:200 — polyman(): human form restoration

// cf. polyself.c:269 — change_sex(void): change player gender
// Changes the player's gender.
// TODO: polyself.c:269 — change_sex(): gender change

// cf. polyself.c:303 — livelog_newform(viapoly, oldgend, newgend): log form change
// Logs a message if the non-polymorphed hero's gender changed.
// TODO: polyself.c:303 — livelog_newform(): form change live log

// cf. polyself.c:332 [static] — newman(void): attempt return to human
// Attempts to return the player to human form.
// TODO: polyself.c:332 — newman(): human form attempt

// cf. polyself.c:465 — polyself(psflags): polymorph player
// Main polymorphing function with flags parameter.
// TODO: polyself.c:465 — polyself(): player polymorph main

// cf. polyself.c:467 — polymon(mntmp): polymorph into specific monster
// Attempts to polymorph the player into a specific monster type.
// TODO: polyself.c:467 — polymon(): specific monster polymorph

// cf. polyself.c:1073 — uasmon_maxStr(void): max strength while polymorphed
// Determines the hero's temporary strength while polymorphed.
// TODO: polyself.c:1073 — uasmon_maxStr(): polymorphed strength maximum

// cf. polyself.c:1119 [static] — dropp(obj): drop object wrapper for break_armor
// Wrapper for dropx() called by break_armor.
// TODO: polyself.c:1119 — dropp(): armor break drop wrapper

// cf. polyself.c:1153 [static] — break_armor(void): remove unsuitable armor
// Removes and drops armor when unsuitable for the new form.
// TODO: polyself.c:1153 — break_armor(): unsuitable armor removal

// cf. polyself.c:1290 [static] — drop_weapon(alone): drop weapon for handless form
// Drops weapon when polymorphing into a handless form.
// TODO: polyself.c:1290 — drop_weapon(): handless form weapon drop

// cf. polyself.c:1352 — rehumanize(void): return to original form
// Returns to original form when polymorph timeout or HP depletion occurs.
// TODO: polyself.c:1352 — rehumanize(): polymorph timeout reversion

// cf. polyself.c:1405 — dobreathe(void): breath weapon attack
// Breath weapon attack for dragon/dragon-like forms.
// TODO: polyself.c:1405 — dobreathe(): breath weapon attack

// cf. polyself.c:1434 — dospit(void): poison spit attack
// Spit poison attack for certain forms.
// TODO: polyself.c:1434 — dospit(): poison spit attack

// cf. polyself.c:1465 — doremove(void): remove worn/wielded object
// Removes object being worn or wielded.
// TODO: polyself.c:1465 — doremove(): worn item removal

// cf. polyself.c:1481 — dospinweb(void): spin web attack
// Spins a web attack for spider form.
// TODO: polyself.c:1481 — dospinweb(): web spinning attack

// cf. polyself.c:1608 — dosummon(void): summon allies
// Summons allies for certain monster forms.
// TODO: polyself.c:1608 — dosummon(): ally summoning attack

// cf. polyself.c:1626 — dogaze(void): gaze attack
// Gaze attack for basilisk-like forms.
// TODO: polyself.c:1626 — dogaze(): gaze attack

// cf. polyself.c:1761 — dohide(void): hide ability
// Hide ability for certain forms.
// TODO: polyself.c:1761 — dohide(): form hide ability

// cf. polyself.c:1861 — dopoly(void): polymorph into different form
// Handles polymorphing into different forms during gameplay.
// TODO: polyself.c:1861 — dopoly(): gameplay polymorph

// cf. polyself.c:1878 — domindblast(void): psychic blast attack
// Psychic blast attack for mind flayer form.
// TODO: polyself.c:1878 — domindblast(): mind flayer psychic blast

// cf. polyself.c:1925 — uunstick(void): escape from being stuck
// Escapes from being stuck or grabbed.
// TODO: polyself.c:1925 — uunstick(): stuck escape

// cf. polyself.c:1938 — skinback(silently): remove player from monster interior
// Removes the player from a monster's interior.
// TODO: polyself.c:1938 — skinback(): monster interior exit

// cf. polyself.c:1956 — mbodypart(mon, part): monster body part name
// Gets the body part name for a monster.
// TODO: polyself.c:1956 — mbodypart(): monster body part name

// cf. polyself.c:2127 — body_part(part): player body part name
// Gets the body part name appropriate for the player's current form.
// TODO: polyself.c:2127 — body_part(): player form body part name

// cf. polyself.c:2133 — poly_gender(void): polymorphed player gender
// Returns the gender of the polymorphed player.
// TODO: polyself.c:2133 — poly_gender(): polymorphed form gender

// cf. polyself.c:2144 — ugolemeffects(damtype, dam): golem damage handling
// Handles golem-specific damage effects for polymorphed golems.
// TODO: polyself.c:2144 — ugolemeffects(): golem damage immunity

// cf. polyself.c:2175 [static] — armor_to_dragon(atyp): armor to dragon type
// Converts an armor type to the corresponding dragon type.
// TODO: polyself.c:2175 — armor_to_dragon(): armor-dragon type mapping

// cf. polyself.c:2220 [static] — polysense(void): polymorphed species awareness
// Gives awareness of other species to the polymorphed player.
// TODO: polyself.c:2220 — polysense(): polymorphed species sense

// cf. polyself.c:2249 — ugenocided(void): check if player genocided
// Checks if the player's role or race has been genocided.
// TODO: polyself.c:2249 — ugenocided(): player genocide check

// cf. polyself.c:2257 — udeadinside(void): describe self-genocide feeling
// Describes how the player feels after self-genocide of role or race.
// TODO: polyself.c:2257 — udeadinside(): self-genocide feeling
