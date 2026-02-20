// pray.js -- Prayer mechanics, sacrifice system, and deity interaction
// cf. pray.c — critically_low_hp, stuck_in_wall, in_trouble,
//              worst_cursed_item, fix_curse_trouble, fix_worst_trouble,
//              god_zaps_you, fry_by_god, angrygods, at_your_feet, gcrownu,
//              give_spell, pleased, water_prayer, godvoice, gods_angry,
//              gods_upset, consume_offering, offer_too_soon,
//              desecrate_altar, offer_real_amulet, offer_negative_valued,
//              offer_fake_amulet, offer_different_alignment_altar,
//              sacrifice_your_race, bestow_artifact, sacrifice_value,
//              dosacrifice, eval_offering, offer_corpse,
//              can_pray, pray_revive, dopray, prayer_done,
//              maybe_turn_mon_iter, doturn,
//              altarmask_at, a_gname, a_gname_at, u_gname,
//              align_gname, halu_gname, align_gtitle,
//              altar_wrath, blocked_boulder
//
// pray.c covers:
//   - Prayer (#pray command): dopray/can_pray/prayer_done, crisis detection
//     (in_trouble, critically_low_hp, stuck_in_wall), and divine response
//     (pleased, fix_worst_trouble, angrygods, god_zaps_you, fry_by_god)
//   - Sacrifice (#offer command): dosacrifice/eval_offering/offer_corpse,
//     sacrifice_value, bestow_artifact, various offer_* cases
//   - Turning undead (#turn command): doturn/maybe_turn_mon_iter
//   - Deity name helpers: align_gname, a_gname, u_gname, halu_gname, align_gtitle
//   - Water prayer (bless/curse water on altar)
//   - Altar wrath on desecration
//
// JS implementations: none. All functions are runtime gameplay deity interaction.

// cf. pray.c:116 — critically_low_hp(only_if_injured): low HP check
// Returns TRUE if HP ≤ threshold based on max HP and level.
// Used by in_trouble() to prioritize HP crises in prayer.
// TODO: pray.c:116 — critically_low_hp(): low HP threshold check

// cf. pray.c:161 — stuck_in_wall(): hero surrounded by impassable rock?
// Returns TRUE if all adjacent squares are rock/wall with no escape.
// Used as a prayer crisis condition.
// TODO: pray.c:161 — stuck_in_wall(): impassable surroundings check

// cf. pray.c:198 — in_trouble(): return worst current problem code
// Checks ordered list of crises: stoning, sliming, choking, starving,
//   critically_low_hp, stuck, bad status effects, cursed items.
// Returns TROUBLE_* constant for worst problem, or 0 if none.
// TODO: pray.c:198 — in_trouble(): prayer crisis detection

// cf. pray.c:288 — worst_cursed_item(): select highest-priority cursed item
// Scans inventory for cursed items in priority order (loadstone, armor, weapon).
// Returns the most problematic cursed item for uncursing.
// TODO: pray.c:288 — worst_cursed_item(): cursed item priority

// cf. pray.c:349 — fix_curse_trouble(otmp, what): uncurse item with message
// Removes curse from item; prints "<item> softly glows" message.
// TODO: pray.c:349 — fix_curse_trouble(): divine uncursing

// cf. pray.c:373 — fix_worst_trouble(trouble): fix the worst identified problem
// Dispatches on TROUBLE_* code: heals HP, uncurses items, cures stoning/sliming,
//   teleports hero from wall, restores stats, etc.
// Called by pleased() when deity responds favorably.
// TODO: pray.c:373 — fix_worst_trouble(): divine problem resolution

// cf. pray.c:610 — god_zaps_you(resp_god): divine lightning punishment
// Fires a lightning bolt and potentially a disintegration beam from god.
// Called by angrygods() for severe punishment.
// TODO: pray.c:610 — god_zaps_you(): divine lightning bolt

// cf. pray.c:694 — fry_by_god(resp_god, via_disintegration): kill by divine wrath
// Sets appropriate death message; calls done(DIED) with deity attribution.
// TODO: pray.c:694 — fry_by_god(): divine execution

// cf. pray.c:704 — angrygods(resp_god): angry deity punishment
// Selects from tiered punishments based on alignment record and history:
//   curses inventory, summons monsters, god_zaps_you, fry_by_god.
// TODO: pray.c:704 — angrygods(): deity punishment dispatcher

// cf. pray.c:788 — at_your_feet(str): print "object appears at your feet" message
// Prints formatted message for divine gift appearing at hero's position.
// TODO: pray.c:788 — at_your_feet(): gift arrival message

// cf. pray.c:805 — gcrownu(): crown player as Hand of Elbereth or Envoy
// Awards crown artifact (Orb of Fate / Eye of the Aethiopica / etc.) as
//   divine reward for exceptional alignment; removes crowning flag.
// TODO: pray.c:805 — gcrownu(): divine coronation/artifact award

// cf. pray.c:999 — give_spell(): give blessed spellbook as divine gift
// Either teaches a spell directly or drops a blessed spellbook at player's feet.
// Called by pleased() as a minor divine gift.
// TODO: pray.c:999 — give_spell(): divine spell gift

// cf. pray.c:1071 — pleased(g_align): pleased deity response
// Orchestrates positive prayer outcome: fix_worst_trouble, gcrownu, give_spell,
//   equipment blessings, attribute restoration, protection replenishment.
// TODO: pray.c:1071 — pleased(): deity pleasure response

// cf. pray.c:1387 — water_prayer(bless_water): bless or curse water on altar
// Blesses or curses all water potions in player's inventory when praying on altar.
// TODO: pray.c:1387 — water_prayer(): altar water blessing/cursing

// cf. pray.c:1415 — godvoice(g_align, words): print god's voice message
// Formats and outputs deity speech with proper attribution and formatting.
// TODO: pray.c:1415 — godvoice(): deity voice output

// cf. pray.c:1429 — gods_angry(g_align): print angry god message
// Outputs a randomly chosen angry deity exclamation.
// TODO: pray.c:1429 — gods_angry(): angry deity message

// cf. pray.c:1436 — gods_upset(g_align): make god upset and trigger anger
// Decrements alignment record; calls angrygods() for punishment.
// TODO: pray.c:1436 — gods_upset(): deity anger trigger

// cf. pray.c:1446 — consume_offering(otmp): display sacrifice consumption
// Prints "<item> is consumed in a flash of light!"; removes item from floor.
// TODO: pray.c:1446 — consume_offering(): sacrifice display

// cf. pray.c:1480 — offer_too_soon(altaralign): feedback for wrong altar offering
// Prints message when trying to offer Amulet on non-matching altar.
// TODO: pray.c:1480 — offer_too_soon(): wrong altar offering message

// cf. pray.c:1501 — desecrate_altar(highaltar, altaralign): altar desecration wrath
// Triggers divine punishment for standing on and desecrating an enemy altar.
// TODO: pray.c:1501 — desecrate_altar(): altar desecration handler

// cf. pray.c:1529 — offer_real_amulet(otmp, altaralign): Amulet of Yendor offering
// Handles the game-ending Amulet sacrifice on the correct altar; calls done(WIN).
// TODO: pray.c:1529 — offer_real_amulet(): Amulet sacrifice (game win)

// cf. pray.c:1592 — offer_negative_valued(highaltar, altaralign): negative sacrifice
// Handles sacrificing a negative-value item (angered deity response).
// TODO: pray.c:1592 — offer_negative_valued(): negative sacrifice

// cf. pray.c:1602 — offer_fake_amulet(otmp, highaltar, altaralign): fake amulet
// Handles fake Amulet sacrifice with luck penalty and message.
// TODO: pray.c:1602 — offer_fake_amulet(): fake amulet sacrifice

// cf. pray.c:1631 — offer_different_alignment_altar(otmp, altaralign): cross-alignment
// Handles sacrificing on enemy altar (conversion opportunity or punishment).
// TODO: pray.c:1631 — offer_different_alignment_altar(): cross-alignment sacrifice

// cf. pray.c:1698 — sacrifice_your_race(otmp, highaltar, altaralign): own race corpse
// Handles sacrificing a corpse of the player's own race (high bonus or taboo).
// TODO: pray.c:1698 — sacrifice_your_race(): racial sacrifice handler

// cf. pray.c:1781 — bestow_artifact(max_giftvalue): grant artifact as divine gift
// Randomly selects an appropriate artifact within value limit; places at feet.
// TODO: pray.c:1781 — bestow_artifact(): divine artifact award

// cf. pray.c:1839 — sacrifice_value(otmp): calculate corpse sacrifice value
// Returns sacrifice value based on monster difficulty and freshness.
// TODO: pray.c:1839 — sacrifice_value(): corpse value calculation

// cf. pray.c:1854 — dosacrifice(): #offer command handler
// Validates altar presence; dispatches to appropriate offer_* function based on
//   item type (corpse, amulet, other). Core sacrifice dispatcher.
// TODO: pray.c:1854 — dosacrifice(): sacrifice command handler

// cf. pray.c:1899 — eval_offering(otmp, altaralign): evaluate corpse offering
// Calculates adjusted sacrifice value with alignment bonuses.
// TODO: pray.c:1899 — eval_offering(): offering value evaluation

// cf. pray.c:1959 — offer_corpse(otmp, highaltar, altaralign): main corpse sacrifice
// Handles all corpse sacrifice rewards: alignment adjustment, gods_upset,
//   pleased, gcrownu, bestow_artifact, god conversion.
// TODO: pray.c:1959 — offer_corpse(): corpse sacrifice handler

// cf. pray.c:2124 — can_pray(praying): check prayer feasibility
// Returns TRUE if prayer is allowed now; checks timeout, alignment status,
//   on-altar modifiers; sets up prayer parameters (prayer_god, prayer_expect).
// TODO: pray.c:2124 — can_pray(): prayer eligibility check

// cf. pray.c:2177 — pray_revive(): revive pet corpses during altar prayer
// If praying on a co-aligned altar, may revive nearby pet corpses/statues.
// TODO: pray.c:2177 — pray_revive(): pet resurrection via prayer

// cf. pray.c:2199 — dopray(): #pray command handler
// Prompts for confirmation; calls can_pray(); initiates prayer sequence.
// Schedules prayer_done() for deferred outcome.
// TODO: pray.c:2199 — dopray(): prayer command handler

// cf. pray.c:2276 — prayer_done(): handle prayer outcome
// Called after prayer delay; checks displeasure/neutrality/pleasure/special;
//   calls pleased() or angrygods() or water_prayer() as appropriate.
// TODO: pray.c:2276 — prayer_done(): deferred prayer outcome

// cf. pray.c:2347 — maybe_turn_mon_iter(mtmp): turn undead iterator
// For each monster: checks if turnable (undead); applies turning effect.
// Used by doturn() via get_iter_mons().
// TODO: pray.c:2347 — maybe_turn_mon_iter(): turning undead iterator

// cf. pray.c:2414 — doturn(): #turn command for turning undead
// Cleric/Priest power: attempts to turn nearby undead monsters.
// Checks alignment, skill level, monster resistance; calls maybe_turn_mon_iter().
// TODO: pray.c:2414 — doturn(): turn undead command

// cf. pray.c:2490 — altarmask_at(x, y): get altar mask at coordinates
// Returns altar alignment mask at (x,y); handles altar mimics.
// TODO: pray.c:2490 — altarmask_at(): altar mask lookup

// cf. pray.c:2507 — a_gname(): name of altar's deity at player position
// Calls a_gname_at(u.ux, u.uy).
// TODO: pray.c:2507 — a_gname(): altar deity name at player

// cf. pray.c:2514 — a_gname_at(x, y): name of altar's deity at position
// Returns deity name string for the altar at (x,y).
// TODO: pray.c:2514 — a_gname_at(): altar deity name at position

// cf. pray.c:2524 — u_gname(): player's own deity name
// Returns name of player's patron deity based on alignment.
// TODO: pray.c:2524 — u_gname(): player deity name

// cf. pray.c:2530 — align_gname(alignment): alignment to deity name
// Converts lawful/neutral/chaotic to role-specific deity name string.
// TODO: pray.c:2530 — align_gname(): alignment to deity name

// cf. pray.c:2577 — halu_gname(alignment): hallucination deity name
// Returns a random deity name from any alignment's pantheon (for hallucination).
// TODO: pray.c:2577 — halu_gname(): hallucinated deity name

// cf. pray.c:2628 — align_gtitle(alignment): deity title string
// Returns "god" or "goddess" based on deity gender for the given alignment.
// TODO: pray.c:2628 — align_gtitle(): deity title (god/goddess)

// cf. pray.c:2652 — altar_wrath(x, y): divine wrath for altar desecration
// Called when player desecrates an altar; triggers deity anger based on alignment.
// TODO: pray.c:2652 — altar_wrath(): altar desecration wrath

// cf. pray.c:2677 — blocked_boulder(dx, dy): are boulders blocking escape?
// Checks if boulders block movement in direction (dx,dy) from current position.
// Used by stuck_in_wall() to detect total enclosure.
// TODO: pray.c:2677 — blocked_boulder(): boulder escape check
