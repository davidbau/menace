// muse.js -- Monster item use: defensive, offensive, miscellaneous
// cf. muse.c — precheck, mzapwand, mplayhorn, mreadmsg, mquaffmsg,
//              m_use_healing, m_sees_sleepy_soldier, m_tele, m_next2m,
//              find_defensive, mon_escape, use_defensive, rnd_defensive_item,
//              linedup_chk_corpse, m_use_undead_turning, hero_behind_chokepoint,
//              mon_has_friends, mon_likes_objpile_at, find_offensive,
//              mbhitm, fhito_loc, mbhit, use_offensive, rnd_offensive_item,
//              find_misc, muse_newcham_mon, mloot_container, use_misc
//
// muse.c handles monster AI for using items in combat:
//   find_defensive(): search monster inventory for defensive items or escape routes.
//   use_defensive(): execute selected defensive action (potions, wands, etc.).
//   find_offensive(): search for offensive items to attack the hero.
//   use_offensive(): execute offensive action (zap wand, throw, etc.).
//   find_misc(): search for miscellaneous items (invisibility, speed, polymorph).
//   use_misc(): execute miscellaneous actions.
//
// JS implementations:
//   (none yet — monster item AI not yet ported)

// cf. muse.c:57 [static] — precheck(mon, obj): monster item use precondition
// Checks if a monster can use an item; handles special potions and cursed wand backfire.
// TODO: muse.c:57 — precheck(): monster item use precondition

// cf. muse.c:163 [static] — mzapwand(mtmp, otmp, self): monster zap wand message
// Messages monster zapping a wand; deducts charge and clears charge memory if unseen.
// TODO: muse.c:163 — mzapwand(): monster wand zap message

// cf. muse.c:193 [static] — mplayhorn(mtmp, otmp, self): monster play horn message
// Messages monster playing a magical horn and deducts its charge.
// TODO: muse.c:193 — mplayhorn(): monster horn play message

// cf. muse.c:236 [static] — mreadmsg(mtmp, otmp): monster read scroll message
// Displays message for unseen or seen monster reading a scroll and reveals its label.
// TODO: muse.c:236 — mreadmsg(): monster scroll read message

// cf. muse.c:291 [static] — mquaffmsg(mtmp, otmp): monster drink potion message
// Shows message when a monster drinks a potion.
// TODO: muse.c:291 — mquaffmsg(): monster potion drink message

// cf. muse.c:335 [static] — m_use_healing(mtmp): check monster has healing potions
// Checks if a monster has healing potions and sets defensive item priority.
// TODO: muse.c:335 — m_use_healing(): monster healing potion check

// cf. muse.c:359 [static] — m_sees_sleepy_soldier(mtmp): check for sleeping soldiers
// Returns true if a monster can see a nearby sleeping soldier within 3 squares.
// TODO: muse.c:359 — m_sees_sleepy_soldier(): sleeping soldier detection

// cf. muse.c:382 [static] — m_tele(mtmp, vismon, oseen, how): monster teleport
// Teleports a monster or restricts teleportation based on level restrictions and amulet.
// TODO: muse.c:382 — m_tele(): monster teleportation

// cf. muse.c:418 [static] — m_next2m(mtmp): check monster adjacent to another
// Returns true if another monster is adjacent to the given monster.
// TODO: muse.c:418 — m_next2m(): adjacent monster check

// cf. muse.c:439 — find_defensive(mtmp, tryescape): find monster defensive item
// Searches monster inventory and surroundings for defensive items or escape routes.
// TODO: muse.c:439 — find_defensive(): monster defensive item search

// cf. muse.c:778 [static] — mon_escape(mtmp, vismon): monster escape check
// Checks if a monster can escape the dungeon via upstairs, removing it if possible.
// TODO: muse.c:778 — mon_escape(): monster dungeon escape

// cf. muse.c:794 — use_defensive(mtmp): execute monster defensive action
// Executes the defensive action selected by find_defensive.
// TODO: muse.c:794 — use_defensive(): monster defensive action execution

// cf. muse.c:1220 — rnd_defensive_item(mtmp): random defensive item selection
// Randomly selects a defensive item type appropriate for the monster's difficulty.
// TODO: muse.c:1220 — rnd_defensive_item(): random monster defensive item

// cf. muse.c:1292 [static] — linedup_chk_corpse(x, y): corpse at location callback
// Callback checking if there's a corpse at the specified location.
// TODO: muse.c:1292 — linedup_chk_corpse(): corpse location callback

// cf. muse.c:1298 [static] — m_use_undead_turning(mtmp, obj): monster use undead wand
// Sets offensive action if monster has wand of undead turning and hero carries corpse nearby.
// TODO: muse.c:1298 — m_use_undead_turning(): monster undead turning wand use

// cf. muse.c:1341 [static] — hero_behind_chokepoint(mtmp): check hero at chokepoint
// Returns true if the hero is behind a terrain chokepoint from the monster's perspective.
// TODO: muse.c:1341 — hero_behind_chokepoint(): hero chokepoint check

// cf. muse.c:1368 [static] — mon_has_friends(mtmp): check monster has allies
// Returns true if a hostile monster has other hostile monsters adjacent to it.
// TODO: muse.c:1368 — mon_has_friends(): monster ally check

// cf. muse.c:1392 [static] — mon_likes_objpile_at(mtmp, x, y): check monster wants objects
// Returns true if a monster wants any items in an object pile at a location.
// TODO: muse.c:1392 — mon_likes_objpile_at(): monster object desire check

// cf. muse.c:1419 — find_offensive(mtmp): find monster offensive item
// Searches for offensive items in monster inventory suitable for attacking the hero.
// TODO: muse.c:1419 — find_offensive(): monster offensive item search

// cf. muse.c:1595 [static] — mbhitm(mtmp, otmp): monster hit by wand/scroll/potion
// Handles a monster being hit by an offensive wand, scroll, or potion effect.
// TODO: muse.c:1595 — mbhitm(): monster item hit handling

// cf. muse.c:1704 [static] — fhito_loc(obj, tx, ty, fhito): apply function to location objects
// Applies a function to all objects at the target location for wand effects.
// TODO: muse.c:1704 — fhito_loc(): location object wand effect application

// cf. muse.c:1731 [static] — mbhit(mon, range, fhitm, fhito, obj): monster wand beam
// Modified bhit for monsters zapping wands along a path.
// TODO: muse.c:1731 — mbhit(): monster wand beam projection

// cf. muse.c:1815 — use_offensive(mtmp): execute monster offensive action
// Executes the offensive action selected by find_offensive.
// TODO: muse.c:1815 — use_offensive(): monster offensive action execution

// cf. muse.c:2014 — rnd_offensive_item(mtmp): random offensive item selection
// Randomly selects an appropriate offensive item based on monster difficulty.
// TODO: muse.c:2014 — rnd_offensive_item(): random monster offensive item

// cf. muse.c:2074 — find_misc(mtmp): find monster miscellaneous item
// Searches for miscellaneous items like invisibility, speed, or polymorph potions.
// TODO: muse.c:2074 — find_misc(): monster misc item search

// cf. muse.c:2227 [static] — muse_newcham_mon(mon): polymorph target selection
// Selects appropriate monster type for polymorph based on worn armor.
// TODO: muse.c:2227 — muse_newcham_mon(): polymorph target selection

// cf. muse.c:2241 [static] — mloot_container(mon, container, vismon): monster loot container
// Monster removes and takes items from a container in inventory.
// TODO: muse.c:2241 — mloot_container(): monster container looting

// cf. muse.c:2360 — use_misc(mtmp): execute monster miscellaneous action
// Executes miscellaneous actions like becoming invisible, polymorphing, or looting containers.
// TODO: muse.c:2360 — use_misc(): monster misc action execution
