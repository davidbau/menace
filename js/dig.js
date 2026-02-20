// dig.js -- Digging mechanics: pick-axe, wand of digging, burial
// cf. dig.c — mkcavepos, mkcavearea, pick_can_reach, dig_typ, is_digging,
//             dig_check, digcheck_fail_message, dig, furniture_handled,
//             holetime, digactualhole, liquid_flow, dighole, dig_up_grave,
//             use_pick_axe, use_pick_axe2, watchman_canseeu, watch_dig,
//             mdig_tunnel, draft_message, zap_dig, adj_pit_checks,
//             pit_flow, buried_ball, buried_ball_to_punishment,
//             buried_ball_to_freedom, bury_an_obj, bury_objs, unearth_objs,
//             rot_organic, rot_corpse, bury_monst, bury_you, unearth_you,
//             escape_tomb, wiz_debug_cmd_bury
//
// dig.c handles all digging-related gameplay:
//   use_pick_axe(): initiate digging occupation.
//   dig(): occupation callback that gradually digs through terrain.
//   dighole/digactualhole: create holes, pits, and trapdoors.
//   mdig_tunnel(): monster digging through walls.
//   zap_dig(): wand-of-digging effects.
//   bury_*/unearth_*: object/player burial mechanics.
//   rot_organic/rot_corpse: timed decomposition of buried items.
//
// JS implementations: none — all digging logic is runtime gameplay.

// cf. dig.c:47 [static] — mkcavepos(x, y, dist, waslit, rockit): cave position
// Modifies terrain at location during ceiling collapse or cave creation.
// TODO: dig.c:47 — mkcavepos(): cave position modification

// cf. dig.c:87 [static] — mkcavearea(rockit): create/collapse cave area
// Creates or collapses a cave area around the player with visual/gameplay effects.
// TODO: dig.c:87 — mkcavearea(): cave area modification

// cf. dig.c:140 [static] — pick_can_reach(pick, x, y): pickaxe reach check
// Determines if a pickaxe can reach a target location.
// TODO: dig.c:140 — pick_can_reach(): pickaxe reach check

// cf. dig.c:168 — dig_typ(otmp, x, y): what can be dug at location
// Returns the type of terrain/object that can be dug at location.
// TODO: dig.c:168 — dig_typ(): diggable terrain type

// cf. dig.c:194 — is_digging(void): currently digging?
// Returns TRUE if player is currently in a digging occupation.
// TODO: dig.c:194 — is_digging(): dig occupation check

// cf. dig.c:206 — dig_check(madeby, x, y): validate digging
// Checks if digging is allowed at location; returns failure reason if not.
// TODO: dig.c:206 — dig_check(): digging validation

// cf. dig.c:254 — digcheck_fail_message(digresult, madeby, x, y): dig fail message
// Displays appropriate error message for failed dig attempt.
// TODO: dig.c:254 — digcheck_fail_message(): digging failure message

// cf. dig.c:299 [static] — dig(void): digging occupation callback
// Gradually digs through terrain; accumulates effort per turn.
// TODO: dig.c:299 — dig(): dig occupation callback

// cf. dig.c:570 [static] — furniture_handled(x, y, madeby_u): furniture destruction
// Processes terrain furniture destruction (fountains, sinks, drawbridges) when digging.
// TODO: dig.c:570 — furniture_handled(): furniture dig effects

// cf. dig.c:596 — holetime(void): estimate dig time remaining
// Returns estimate of turns needed to complete current hole.
// TODO: dig.c:596 — holetime(): dig time estimate

// cf. dig.c:639 — digactualhole(x, y, madeby, ttyp): create pit/hole trap
// Creates a pit or hole trap at given location with messaging.
// TODO: dig.c:639 — digactualhole(): hole/pit creation

// cf. dig.c:837 — liquid_flow(x, y, typ, ttmp, fillmsg): liquid flooding
// Handles liquid flooding when a pit is created near water or lava.
// TODO: dig.c:837 — liquid_flow(): liquid flow into pit

// cf. dig.c:884 — dighole(pit_only, by_magic, cc): dig a hole
// Main hole-creation function; creates hole, pit, or trapdoor.
// TODO: dig.c:884 — dighole(): hole/pit/trapdoor creation

// cf. dig.c:1026 [static] — dig_up_grave(cc): excavate grave
// Digs up a grave and unearths objects buried within.
// TODO: dig.c:1026 — dig_up_grave(): grave excavation

// cf. dig.c:1091 — use_pick_axe(obj): start digging occupation
// Initiates the digging occupation when using a pick-axe.
// TODO: dig.c:1091 — use_pick_axe(): pick-axe use

// cf. dig.c:1161 — use_pick_axe2(obj): continue pick-axe use
// Continues or repeats pick-axe usage after initial action.
// TODO: dig.c:1161 — use_pick_axe2(): pick-axe continuation

// cf. dig.c:1361 [static] — watchman_canseeu(mtmp): watchman visibility
// Checks if a watchman monster can see the player.
// TODO: dig.c:1361 — watchman_canseeu(): watchman LOS check

// cf. dig.c:1376 — watch_dig(mtmp, x, y, zap): watchman dig reaction
// Handles watchman monster reactions when player digs nearby.
// TODO: dig.c:1376 — watch_dig(): watchman dig warning

// cf. dig.c:1413 — mdig_tunnel(mtmp): monster digging
// Allows a monster to dig a tunnel through terrain.
// TODO: dig.c:1413 — mdig_tunnel(): monster tunneling

// cf. dig.c:1503 — draft_message(unexpected): draft/wind message
// Displays message about draft or wind from digging activities.
// TODO: dig.c:1503 — draft_message(): dig draft message

// cf. dig.c:1547 — zap_dig(void): wand of digging effect
// Processes digging when a wand of digging is used; creates holes by magic.
// TODO: dig.c:1547 — zap_dig(): wand digging

// cf. dig.c:1762 [static] — adj_pit_checks(cc, msg): pit adjacency validation
// Validates and processes digging into pits with error messages.
// TODO: dig.c:1762 — adj_pit_checks(): pit adjacency check

// cf. dig.c:1843 [static] — pit_flow(trap, filltyp): liquid into pit
// Handles liquid flowing into a pit when digging creates contact.
// TODO: dig.c:1843 — pit_flow(): pit liquid filling

// cf. dig.c:1884 — buried_ball(cc): retrieve buried ball
// Retrieves a buried iron ball or other buried object.
// TODO: dig.c:1884 — buried_ball(): buried ball retrieval

// cf. dig.c:1934 — buried_ball_to_punishment(void): move ball to punishment level
// Moves a buried ball to the punishment dungeon level.
// TODO: dig.c:1934 — buried_ball_to_punishment(): punishment ball relocation

// cf. dig.c:1957 — buried_ball_to_freedom(void): free punishment ball
// Removes a buried ball, freeing the player from punishment.
// TODO: dig.c:1957 — buried_ball_to_freedom(): punishment ball removal

// cf. dig.c:1983 — bury_an_obj(otmp, dealloced): bury an object
// Buries an object underground, removing it from visibility.
// TODO: dig.c:1983 — bury_an_obj(): single object burial

// cf. dig.c:2049 — bury_objs(x, y): bury all objects at location
// Buries all objects at given location when a grave is dug.
// TODO: dig.c:2049 — bury_objs(): location object burial

// cf. dig.c:2085 — unearth_objs(x, y): unearth objects at location
// Retrieves all buried objects from given location.
// TODO: dig.c:2085 — unearth_objs(): object unearthing

// cf. dig.c:2124 — rot_organic(arg, timeout): organic decay timer
// Timer callback for organic material decomposition while buried.
// TODO: dig.c:2124 — rot_organic(): organic decay timer

// cf. dig.c:2145 — rot_corpse(arg, timeout): corpse decomposition timer
// Timer callback for corpse decomposition while buried.
// TODO: dig.c:2145 — rot_corpse(): corpse decay timer

// cf. dig.c:2192 — bury_monst(mtmp): bury a monster
// Buries a monster underground.
// TODO: dig.c:2192 — bury_monst(): monster burial

// cf. dig.c:2211 — bury_you(void): bury the player
// Buries the player underground with dungeon transitions.
// TODO: dig.c:2211 — bury_you(): player burial

// cf. dig.c:2229 — unearth_you(void): unearth the player
// Removes player from buried state and returns to dungeon.
// TODO: dig.c:2229 — unearth_you(): player unearthing

// cf. dig.c:2240 — escape_tomb(void): escape from tomb/burial
// Allows player to escape from a tomb or burial location.
// TODO: dig.c:2240 — escape_tomb(): tomb escape

// cf. dig.c:2287 — wiz_debug_cmd_bury(void): wizard burial toggle
// Wizard mode command to toggle burial state for debugging.
// TODO: dig.c:2287 — wiz_debug_cmd_bury(): wizard burial debug
