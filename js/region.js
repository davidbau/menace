// region.js -- Region effects: gas clouds, force fields, enter/leave callbacks
// cf. region.c — create_region, add_region, remove_region, run_regions,
//                in_out_region, m_in_out_region, update_player_regions,
//                create_gas_cloud, inside_gas_cloud, expire_gas_cloud,
//                region_danger, region_safety, save_regions, rest_regions
//
// C data model: regions[] array of NhRegion structs, each with:
//   bounding box (bx/by/ex/ey), array of NhRect rectangles, monster list,
//   TTL (time-to-live), damage, visible flag, enter/leave/expire/inside
//   callbacks, associated messages.
// NetHack uses regions primarily for gas cloud effects from wands/spells/traps;
//   force fields and msg regions are compile-disabled (#if 0).
//
// JS data model: map.gascloud[] holds cloud objects created at level-gen time;
//   gas cloud regions are not simulated dynamically in JS (no run_regions).
//   map.js:129 reserves the gascloud[] array; no runtime callbacks.
//
// JS implementations: none. All runtime region functions are TODO.
// Note: sp_lev.js uses "regions" for LR_TELE/LR_XLEV teleport zones —
//   those are sp_lev.c constructs distinct from region.c gas clouds.

// cf. region.c:53 — inside_rect(rect, x, y): is (x,y) in rectangle?
// Returns x >= rect.lx && x <= rect.hx && y >= rect.ly && y <= rect.hy.
// TODO: region.c:53 — inside_rect(): point-in-rectangle test

// cf. region.c:62 — inside_region(reg, x, y): is (x,y) in region?
// Checks bounding box first, then tests each NhRect in reg->rects[].
// TODO: region.c:62 — inside_region(): point-in-region test

// cf. region.c:78 — create_region(rects, nrects, ttl, ...): allocate new region
// Allocates NhRegion; copies rects; computes bounding box (bx/by/ex/ey);
//   sets TTL, damage, visible, persist_on_death, attach_2_u, attach_2_m flags;
//   initializes callback indices to NO_CALLBACK; zeros monster list.
// TODO: region.c:78 — create_region(): region allocation and initialization

// cf. region.c:132 — add_rect_to_reg(reg, rect): add rectangle to region
// Reallocates reg->rects[]; updates bounding box.
// TODO: region.c:132 — add_rect_to_reg(): extend region with new rectangle

// cf. region.c:160 — add_mon_to_reg(reg, mon): add monster to region's monster list
// Handles long worm specially (adds worm segments too).
// TODO: region.c:160 — add_mon_to_reg(): add monster to region

// cf. region.c:191 — remove_mon_from_reg(reg, mon): remove monster from region's list
// Linear search; shifts remaining entries.
// TODO: region.c:191 — remove_mon_from_reg(): remove monster from region

// cf. region.c:209 — mon_in_region(reg, mon): is monster in region's monster list?
// Linear search through reg->monsters[].
// TODO: region.c:209 — mon_in_region(): monster membership test

// cf. region.c:262 — free_region(reg): free all memory in a region
// Frees rects[], monsters[], enter/leave message strings, the struct itself.
// N/A: JS uses garbage collection.
// N/A: region.c:262 — free_region()

// cf. region.c:283 — add_region(reg): add region to active list; populate monsters
// Adds to regions[] array (expanding if needed); for each map tile inside reg,
//   adds any monster present via add_mon_to_reg(); sets attach_2_u if player inside.
// TODO: region.c:283 — add_region(): activate a new region

// cf. region.c:343 — remove_region(reg): remove region from active list
// Calls newsym for all tiles in bounding box; frees via free_region();
//   removes from regions[] array.
// TODO: region.c:343 — remove_region(): deactivate and free a region

// cf. region.c:393 — clear_regions(): free all active regions
// Frees each regions[i]; resets max_regions and n_regions to 0.
// Called on level change.
// TODO: region.c:393 — clear_regions(): remove all active regions

// cf. region.c:413 — run_regions(): per-turn region processing
// For each region: decrement TTL (if !forever); call expire callback if TTL==0;
//   call inside callbacks for player/monsters within region.
// Called once per turn from moveloop.
// TODO: region.c:413 — run_regions(): per-turn region updates

// cf. region.c:479 — in_out_region(x, y): player entered/left a region
// Compares player's new (x,y) against old position in each region;
//   fires enter_func or leave_func callback and prints messages.
// Called from teleds() and similar position-changing functions.
// TODO: region.c:479 — in_out_region(): player region enter/leave

// cf. region.c:533 — m_in_out_region(mon, x, y): monster entered/left a region
// Checks new position (x,y) against each region; fires monster callbacks.
// Referenced (but not implemented) in dogmove.js:1526.
// TODO: region.c:533 — m_in_out_region(): monster region enter/leave

// cf. region.c:582 — update_player_regions(): resync player region membership
// After teleport etc.; updates attach_2_u for all regions based on current position.
// TODO: region.c:582 — update_player_regions(): resync player in regions

// cf. region.c:598 — update_monster_region(mon): resync monster region membership
// Re-evaluates add_mon_to_reg/remove_mon_from_reg for all regions.
// TODO: region.c:598 — update_monster_region(): resync monster in regions

// cf. region.c:651 — reg_damg(reg): damage-per-turn for region (0 if not visible/expired)
// Returns 0 if !reg->visible or reg->ttl==0; else reg->damage.
// TODO: region.c:651 — reg_damg(): region damage per turn

// cf. region.c:660 — any_visible_region(): are there any visible regions?
// Scans regions[]; returns TRUE if any has visible flag set.
// TODO: region.c:660 — any_visible_region(): visible-region existence check

// cf. region.c:674 — visible_region_summary(win): wizard-mode region display
// Outputs one line per visible region to window win (used by #timeout).
// TODO: region.c:674 — visible_region_summary(): wizard region info dump

// cf. region.c:718 — visible_region_at(x, y): find visible region at position
// Returns first visible region containing (x,y), or NULL.
// TODO: region.c:718 — visible_region_at(): region lookup by position

// cf. region.c:732 — show_region(reg, x, y): draw region glyph at (x,y)
// Calls show_glyph with region's glyph (gas cloud appearance).
// TODO: region.c:732 — show_region(): render region cell

// cf. region.c:741 — save_regions(nhfp): serialize regions to save file
// Writes n_regions, then each region's fields (bounding box, rects, TTL,
//   damage, flags, callbacks, messages, monster list).
// N/A: JS has no save file system.
// N/A: region.c:741 — save_regions()

// cf. region.c:799 — rest_regions(nhfp, ghostly): deserialize regions from save
// Reads region data; subtracts elapsed turns from TTL (ghostly mode).
// Calls reset_region_mids() for bones files.
// N/A: JS has no save file system.
// N/A: region.c:799 — rest_regions()

// cf. region.c:899 — region_stats(sbuf): region memory usage for #stats
// Appends region count and estimated byte usage to strbuf.
// TODO: region.c:899 — region_stats(): wizard memory stats

// cf. region.c:928 [static] — reset_region_mids(reg): fix monster IDs in bones region
// Removes from region's monster list any monster whose ID no longer exists on level.
// TODO: region.c:928 — reset_region_mids(): bones-file monster ID reconciliation

// cf. region.c:1046 — expire_gas_cloud(reg): gas cloud expiration callback
// Handles dissipation animation and partial damage reduction as cloud fades.
// Calls remove_region() when TTL reaches 0.
// TODO: region.c:1046 — expire_gas_cloud(): gas cloud expiration

// cf. region.c:1091 — inside_gas_cloud(reg, x, y, arg): gas cloud damage callback
// Applies poison/gas damage to player or monster at (x,y) each turn.
// Player: losehp + various resistances + Poison/Breathless checks.
// Monster: mon_adjust_hit_points with resistance checks.
// TODO: region.c:1091 — inside_gas_cloud(): gas cloud per-turn damage

// cf. region.c:1168 [static] — is_hero_inside_gas_cloud(): player in any gas cloud?
// Checks all regions with inside_gas_cloud callback.
// TODO: region.c:1168 — is_hero_inside_gas_cloud(): player gas cloud membership

// cf. region.c:1182 [static] — make_gas_cloud(reg, damage, visible): init gas cloud region
// Sets callbacks (INSIDE_GAS_CLOUD, EXPIRE_GAS_CLOUD), damage, visible flag,
//   persist_on_death; calls add_region().
// TODO: region.c:1182 — make_gas_cloud(): gas cloud common initialization

// cf. region.c:1213 — create_gas_cloud(x, y, radius, damage): BFS gas cloud creation
// Expands from (x,y) via breadth-first search up to MAX_CLOUD_SIZE cells;
//   collects accessible terrain into an NhRect array; calls make_gas_cloud().
// Used by wand of poison gas and similar sources.
// TODO: region.c:1213 — create_gas_cloud(): BFS gas cloud generation

// cf. region.c:1313 — create_gas_cloud_selection(sel, damage): gas cloud from selection
// Creates gas cloud covering explicitly selected map cells (from selection obj).
// TODO: region.c:1313 — create_gas_cloud_selection(): selection-based gas cloud

// cf. region.c:1341 — region_danger(): is player in a dangerous region?
// Used by prayer system to detect region-based dangers.
// Returns TRUE if player is in a visible gas-cloud region.
// TODO: region.c:1341 — region_danger(): prayer danger from regions

// cf. region.c:1368 — region_safety(): mitigate region dangers after prayer
// Dissipates gas clouds around player (removes or reduces damage).
// Called by successful prayer when region_danger() was TRUE.
// TODO: region.c:1368 — region_safety(): prayer region mitigation
