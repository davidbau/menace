// attrib.js -- Attribute system: STR/DEX/CON/INT/WIS/CHA, luck, innate abilities
// cf. attrib.c — adjattrib, gainstr, losestr, poison_strdmg, poisontell, poisoned,
//                change_luck, stone_luck, set_moreluck, restore_attrib, exercise,
//                exerper, exerchk, rnd_attr, init_attr_role_redist, init_attr,
//                redist_attr, vary_init_attr, postadjabil, role_abil,
//                check_innate_abil, innately, is_innate, from_what, adjabil,
//                newhp, minuhpmax, setuhpmax, adjuhploss, acurr, acurrstr,
//                extremeattr, adjalign, uchangealign
//
// attrib.c manages all player attribute mechanics:
//   adjattrib(): raise or lower an attribute with messaging and bounds.
//   gainstr/losestr: specific strength adjustment paths with consequences.
//   poisoned(): full poison application (attribute loss + HP damage).
//   exercise/exerper/exerchk: attribute training system (exercise/abuse tracking).
//   init_attr/redist_attr: attribute rolling and polymorphism adjustments.
//   adjabil(): grant/revoke innate abilities on level change.
//   newhp/setuhpmax: HP maximum adjustments on leveling.
//   acurr/acurrstr: effective attribute value with modifiers.
//   adjalign/uchangealign: alignment record adjustment and type change.
//
// JS implementations:
//   exercise() → attrib_exercise.js:22 (PARTIAL — RNG-parity implementation)
//   exerchk() → attrib_exercise.js:42 (PARTIAL — RNG-parity, no attribute mutation)

// cf. attrib.c:116 — adjattrib(ndx, incr, msgflg): adjust an attribute
// Raises or lowers attribute ndx by incr; prints message if msgflg set.
// TODO: attrib.c:116 — adjattrib(): attribute adjustment

// cf. attrib.c:199 — gainstr(otmp, incr, givemsg): gain strength
// Grants strength increase, possibly from cursed source; handles exceptional str.
// TODO: attrib.c:199 — gainstr(): strength gain

// cf. attrib.c:218 — losestr(num, knam, k_format): lose strength
// Applies strength loss with potential HP damage and possible death.
// TODO: attrib.c:218 — losestr(): strength loss

// cf. attrib.c:271 — poison_strdmg(strloss, dmg, knam, k_format): poison damage
// Combined strength loss and HP damage from poisoning.
// TODO: attrib.c:271 — poison_strdmg(): combined poison damage

// cf. attrib.c:291 — poisontell(typ, exclaim): poison feedback message
// Prints attribute-loss feedback message for poison type.
// TODO: attrib.c:291 — poisontell(): poison message

// cf. attrib.c:314 — poisoned(reason, typ, pkiller, fatal, thrown_weapon): full poison
// Applies complete poisoning: attribute loss, HP damage, potential death.
// TODO: attrib.c:314 — poisoned(): full poison application

// cf. attrib.c:408 — change_luck(n): modify luck value
// Adjusts luck up or down with bounds checking.
// TODO: attrib.c:408 — change_luck(): luck adjustment

// cf. attrib.c:420 — stone_luck(include_uncursed): luck from stones
// Calculates net luck bonus from blessed/cursed luck stones in inventory.
// TODO: attrib.c:420 — stone_luck(): luck stone bonus

// cf. attrib.c:438 — set_moreluck(void): update luck modifier
// Recalculates luck bonus based on current luck-giving items.
// TODO: attrib.c:438 — set_moreluck(): luck modifier update

// cf. attrib.c:452 — restore_attrib(void): restore temporary attribute losses
// Processes timed attribute restoration (currently unused in NH3.7+).
// TODO: attrib.c:452 — restore_attrib(): timed attribute restoration

// cf. attrib.c:486 — exercise(i, inc_or_dec): track attribute exercise/abuse
// Records exercise or abuse of attribute i for periodic adjustment.
// JS equiv: attrib_exercise.js:22 — exercise() (PARTIAL — RNG parity, no attribute change)
// PARTIAL: attrib.c:486 — exercise() ↔ attrib_exercise.js:22

// cf. attrib.c:518 [static] — exerper(void): periodic exercise processing
// Periodically checks exercise/abuse based on hunger and encumbrance.
// TODO: attrib.c:518 — exerper(): periodic exercise check

// cf. attrib.c:595 — exerchk(void): apply accumulated exercise/abuse
// At intervals, applies attribute changes from accumulated exercise/abuse.
// JS equiv: attrib_exercise.js:42 — exerchk() (PARTIAL — RNG parity, no attribute mutation)
// PARTIAL: attrib.c:595 — exerchk() ↔ attrib_exercise.js:42

// cf. attrib.c:679 [static] — rnd_attr(void): random attribute index
// Returns random attribute index weighted by role distribution.
// TODO: attrib.c:679 — rnd_attr(): random attribute selection

// cf. attrib.c:696 [static] — init_attr_role_redist(np, addition): distribute role points
// Distributes attribute points from role-specific starting array.
// TODO: attrib.c:696 — init_attr_role_redist(): role point distribution

// cf. attrib.c:720 — init_attr(np): initialize starting attributes
// Rolls and distributes starting attributes for the hero.
// TODO: attrib.c:720 — init_attr(): attribute initialization

// cf. attrib.c:737 — redist_attr(void): redistribute for polymorphing
// Adjusts attributes when hero polymorphs into different form.
// TODO: attrib.c:737 — redist_attr(): polymorph attribute redistribution

// cf. attrib.c:761 — vary_init_attr(void): random starting variation
// Applies minor random variation to starting attribute values.
// TODO: attrib.c:761 — vary_init_attr(): starting attribute variation

// cf. attrib.c:777 [static] — postadjabil(ability): post-process innate ability
// Applies side effects after innate ability change.
// TODO: attrib.c:777 — postadjabil(): innate ability post-processing

// cf. attrib.c:786 [static] — role_abil(r): innate ability table for role
// Returns the innate ability progression table for role r.
// TODO: attrib.c:786 — role_abil(): role ability table

// cf. attrib.c:815 [static] — check_innate_abil(ability, frommask): innate ability check
// Returns ability entry if ability qualifies as innate from frommask source.
// TODO: attrib.c:815 — check_innate_abil(): innate ability verification

// cf. attrib.c:861 [static] — innately(ability): innate ability source
// Returns whether an ability was obtained innately (role/race/form).
// TODO: attrib.c:861 — innately(): innate ability determination

// cf. attrib.c:877 — is_innate(propidx): property source type
// Returns source type of property (role innate, race innate, worn item, etc.).
// TODO: attrib.c:877 — is_innate(): property source determination

// cf. attrib.c:902 — from_what(propidx): property source description
// Returns text describing source of property (wizard mode diagnostic).
// TODO: attrib.c:902 — from_what(): property source text

// cf. attrib.c:1003 — adjabil(oldlevel, newlevel): adjust innate abilities on level change
// Grants or revokes innate abilities as hero changes experience level.
// TODO: attrib.c:1003 — adjabil(): level-change innate ability adjustment

// cf. attrib.c:1077 — newhp(void): HP gain for new level
// Calculates hit point gain on level up based on role/race/CON.
// TODO: attrib.c:1077 — newhp(): level-up HP calculation

// cf. attrib.c:1144 — minuhpmax(altmin): minimum allowed maximum HP
// Returns the minimum value that maximum HP can be reduced to.
// TODO: attrib.c:1144 — minuhpmax(): minimum HP max

// cf. attrib.c:1154 — setuhpmax(newmax, even_when_polyd): update max HP
// Sets maximum HP; adjusts current HP proportionally if needed.
// TODO: attrib.c:1154 — setuhpmax(): max HP adjustment

// cf. attrib.c:1179 — adjuhploss(loss, olduhp): recalculate pending HP loss
// Recalculates pending HP loss after max HP reduction.
// TODO: attrib.c:1179 — adjuhploss(): HP loss recalculation

// cf. attrib.c:1197 — acurr(chridx): current effective attribute value
// Returns current attribute value including temporary modifiers and bonuses.
// TODO: attrib.c:1197 — acurr(): effective attribute value

// cf. attrib.c:1242 — acurrstr(void): normalized strength value
// Converts exceptional strength (18/xx) to standardized 3-25 range.
// TODO: attrib.c:1242 — acurrstr(): normalized strength

// cf. attrib.c:1265 — extremeattr(attrindx): attribute at limit?
// Returns TRUE if attribute is at its maximum or minimum value.
// TODO: attrib.c:1265 — extremeattr(): attribute limit check

// cf. attrib.c:1295 — adjalign(n): adjust alignment record
// Adds n to alignment record with bounds checking; tracks abuse.
// TODO: attrib.c:1295 — adjalign(): alignment record adjustment

// cf. attrib.c:1317 — uchangealign(newalign, reason): change alignment type
// Changes hero's alignment to newalign; handles helm-based conversion.
// TODO: attrib.c:1317 — uchangealign(): alignment type change
