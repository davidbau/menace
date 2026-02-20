// dokick.js -- Kick command, object impact and migration mechanics
// cf. dokick.c — kickdmg, maybe_kick_monster, kick_monster, ghitm,
//                container_impact_dmg, kick_object, really_kick_object,
//                kickstr, watchman_thief_arrest, watchman_door_damage,
//                kick_dumb, kick_ouch, kick_door, kick_nondoor, dokick,
//                drop_to, impact_drop, ship_object, obj_delivery,
//                deliver_obj_to_mon, otransit_msg, down_gate
//
// dokick.c handles kick mechanics and object transportation through levels:
//   dokick(): the #kick command — determine target, kick monster/object/terrain.
//   impact_drop(): objects fall through traps to lower levels.
//   ship_object(): migrate objects through pit/trapdoor to other levels.
//   obj_delivery(): deliver migrating objects when arriving on a level.
//   ghitm(): gold/object thrown at monster with shop interaction.
//
// JS implementations:
//   (none yet — kick and migration mechanics not yet ported)

// cf. dokick.c:38 [static] — kickdmg(mon, clumsy): calculate kick damage
// Calculates damage from a kick against a monster, with clumsy penalty.
// TODO: dokick.c:38 — kickdmg(): kick damage calculation

// cf. dokick.c:125 [static] — maybe_kick_monster(mon, x, y): check kick vs monster
// Determines whether a kick against a target monster should proceed.
// TODO: dokick.c:125 — maybe_kick_monster(): kick monster precondition check

// cf. dokick.c:145 [static] — kick_monster(mon, x, y): execute kick vs monster
// Executes a kick attack against a monster including damage and effects.
// TODO: dokick.c:145 — kick_monster(): monster kick execution

// cf. dokick.c:294 — ghitm(mtmp, gold): gold/object thrown hits monster
// Handles gold or thrown object hitting a monster; interacts with shops and special NPCs.
// TODO: dokick.c:294 — ghitm(): thrown gold/object monster hit

// cf. dokick.c:411 — container_impact_dmg(obj, x, y): container kick damage
// Applies damage to contents of kicked or thrown containers.
// TODO: dokick.c:411 — container_impact_dmg(): container contents kick damage

// cf. dokick.c:488 [static] — kick_object(x, y, kickobjnam): kick object on floor
// Handles kicking an object on the ground; determines effects.
// TODO: dokick.c:488 — kick_object(): floor object kick

// cf. dokick.c:507 [static] — really_kick_object(x, y): core object kick logic
// Core logic for kicking objects, including range calculation and effects.
// TODO: dokick.c:507 — really_kick_object(): object kick core mechanics

// cf. dokick.c:793 [static] — kickstr(buf, kickobjnam): kick death message
// Formats a cause-of-death message for kicking-related fatalities.
// TODO: dokick.c:793 — kickstr(): kick death message formatting

// cf. dokick.c:833 [static] — watchman_thief_arrest(mtmp): guard arrest check
// Checks if a watch guard should arrest the player for thievery.
// TODO: dokick.c:833 — watchman_thief_arrest(): theft arrest check

// cf. dokick.c:845 [static] — watchman_door_damage(mtmp, x, y): guard door response
// Checks if a watch guard should respond to door damage.
// TODO: dokick.c:845 — watchman_door_damage(): guard door damage response

// cf. dokick.c:863 [static] — kick_dumb(x, y): clumsy kick at empty space
// Handles a clumsy kick at empty space.
// TODO: dokick.c:863 — kick_dumb(): empty space kick

// cf. dokick.c:880 [static] — kick_ouch(x, y, kickobjnam): player hurt by kick
// Handles player taking damage from a kick against terrain.
// TODO: dokick.c:880 — kick_ouch(): player kick self-damage

// cf. dokick.c:909 [static] — kick_door(x, y, avrg_attrib): kick a door
// Kicks a door to open or break it.
// TODO: dokick.c:909 — kick_door(): door kick mechanics

// cf. dokick.c:972 [static] — kick_nondoor(x, y, avrg_attrib): kick non-door terrain
// Handles kicking non-door terrain features.
// TODO: dokick.c:972 — kick_nondoor(): non-door terrain kick

// cf. dokick.c:1256 — dokick(void): #kick command handler
// The #kick extended command handler.
// TODO: dokick.c:1256 — dokick(): kick command handler

// cf. dokick.c:1472 [static] — drop_to(cc, loc, x, y): object trap destination
// Calculates the destination for objects falling through traps.
// TODO: dokick.c:1472 — drop_to(): trap fall destination

// cf. dokick.c:1510 — impact_drop(missile, x, y, dlev): objects fall via impact
// Processes objects falling through traps or holes due to impact at a location.
// TODO: dokick.c:1510 — impact_drop(): impact-caused object falling

// cf. dokick.c:1638 — ship_object(otmp, x, y, shop_floor_obj): migrate object to other level
// Handles object migration through traps or to other dungeon levels.
// TODO: dokick.c:1638 — ship_object(): inter-level object migration

// cf. dokick.c:1768 — obj_delivery(near_hero): deliver migrating objects to level
// Delivers objects that have migrated to the current dungeon level.
// TODO: dokick.c:1768 — obj_delivery(): migrating object delivery

// cf. dokick.c:1853 — deliver_obj_to_mon(mtmp, cnt, deliverflags): give objects to monster
// Gives dropped objects to monsters based on species preferences.
// TODO: dokick.c:1853 — deliver_obj_to_mon(): monster object delivery

// cf. dokick.c:1908 [static] — otransit_msg(otmp, nodrop, chainthere, num): transit message
// Displays message about objects in transit through traps.
// TODO: dokick.c:1908 — otransit_msg(): object transit message

// cf. dokick.c:1942 — down_gate(x, y): trap migration route
// Determines migration route for objects falling through traps at a given location.
// TODO: dokick.c:1942 — down_gate(): trap fall route determination
