// fountain.js -- Fountain and sink effects: quaff, dip, wash
// cf. fountain.c — floating_above, dowatersnakes, dowaterdemon, dowaternymph,
//                  dogushforth, gush, dofindgem, watchman_warn_fountain,
//                  dryup, drinkfountain, dipfountain, wash_hands,
//                  breaksink, drinksink, dipsink, sink_backs_up
//
// fountain.c handles all fountain and sink interactions:
//   drinkfountain(): random effects when player quaffs from fountain.
//   dipfountain(obj): dipping object into fountain for magical effects.
//   drinksink(): random effects when player quaffs from sink.
//   dipsink(obj): dipping into sink with special potion interactions.
//   dryup(): drain a fountain/sink, optionally with guard warning.
//   wash_hands(): remove grease effect from fountain or sink.
//
// JS implementations:
//   drinkfountain → commands.js:3184 (PARTIAL — RNG-parity implementation)
//   dryup → commands.js:3234 (PARTIAL)

// cf. fountain.c:21 — floating_above(what): levitation message
// Displays "You are floating above the <what>" when levitating over it.
// TODO: fountain.c:21 — floating_above(): levitation over fountain message

// cf. fountain.c:38 [static] — dowatersnakes(void): fountain spawns snakes
// Spawns water moccasins from a fountain of snakes.
// TODO: fountain.c:38 — dowatersnakes(): snake fountain effect

// cf. fountain.c:64 [static] — dowaterdemon(void): fountain spawns demon or wish
// Spawns a water demon or grants a wish when drinking from fountain.
// TODO: fountain.c:64 — dowaterdemon(): demon/wish fountain effect

// cf. fountain.c:94 [static] — dowaternymph(void): fountain spawns nymph
// Spawns a water nymph when drinking from a fountain.
// TODO: fountain.c:94 — dowaternymph(): nymph fountain effect

// cf. fountain.c:120 — dogushforth(drinking): fountain gushes
// Creates spreading water pools from fountain in line of sight.
// TODO: fountain.c:120 — dogushforth(): fountain gush effect

// cf. fountain.c:134 [static] — gush(x, y, poolcnt): place pool at location
// Places a pool at given location with proper tile type and display updates.
// TODO: fountain.c:134 — gush(): individual pool placement

// cf. fountain.c:165 [static] — dofindgem(void): gem in fountain
// Creates a gem in the fountain waters that the player can find.
// TODO: fountain.c:165 — dofindgem(): gem discovery in fountain

// cf. fountain.c:179 [static] — watchman_warn_fountain(mtmp): guard fountain warning
// Watchman warns player about inappropriate fountain use in town.
// TODO: fountain.c:179 — watchman_warn_fountain(): guard fountain warning

// cf. fountain.c:201 — dryup(x, y, isyou): dry up fountain or sink
// Drains the fountain or sink; optionally triggers guard warning.
// JS equiv: commands.js:3234 — dryup() (PARTIAL)
// PARTIAL: fountain.c:201 — dryup() ↔ commands.js:3234

// cf. fountain.c:243 — drinkfountain(void): drink from fountain
// Handles all random effects when player quaffs from a fountain.
// JS equiv: commands.js:3184 — drinkfountain() (PARTIAL — RNG parity)
// PARTIAL: fountain.c:243 — drinkfountain() ↔ commands.js:3184

// cf. fountain.c:394 — dipfountain(obj): dip object into fountain
// Handles magical effects of dipping objects into a fountain.
// TODO: fountain.c:394 — dipfountain(): fountain dipping effects

// cf. fountain.c:558 — wash_hands(void): wash hands in fountain/sink
// Removes grease effect from hands at fountain or sink.
// TODO: fountain.c:558 — wash_hands(): grease removal

// cf. fountain.c:581 — breaksink(x, y): sink becomes fountain
// Converts a sink into a fountain when pipes break (levitation potion).
// TODO: fountain.c:581 — breaksink(): sink-to-fountain conversion

// cf. fountain.c:595 — drinksink(void): drink from sink
// Handles random effects when player quaffs from a sink.
// TODO: fountain.c:595 — drinksink(): sink drinking effects

// cf. fountain.c:716 — dipsink(obj): dip object into sink
// Handles special interactions from dipping objects into a sink.
// TODO: fountain.c:716 — dipsink(): sink dipping effects

// cf. fountain.c:805 — sink_backs_up(x, y): ring spawns from backed-up sink
// Creates a ring object from sink when levitation potion causes backup.
// TODO: fountain.c:805 — sink_backs_up(): backed-up sink ring spawn
