// light.js -- Light source management, vision illumination
// cf. light.c — new_light_source, new_light_core, del_light_source,
//               delete_ls, do_light_sources, show_transient_light,
//               transient_light_cleanup, discard_flashes, find_mid,
//               whereis_mon, save_light_sources, restore_light_sources,
//               light_stats, relink_light_sources, maybe_write_ls,
//               light_sources_sanity_check, write_ls, obj_move_light_source,
//               any_light_source, snuff_light_source, obj_sheds_light,
//               obj_is_burning, obj_split_light_source,
//               obj_merge_light_sources, obj_adjust_light_radius,
//               candle_light_range, arti_light_radius,
//               arti_light_description, wiz_light_sources
//
// light.c manages dynamic light sources during play:
//   new_light_source(): create light source for object or monster.
//   del_light_source(): remove light source when object/monster gone.
//   do_light_sources(): mark temporarily lit locations for vision system.
//   candle_light_range(): calculate candle illumination radius.
//   snuff_light_source(): extinguish light at a location.
//   save/restore_light_sources: persistence (N/A in JS, uses storage.js).
//
// JS implementations:
//   (none yet — light source management not yet ported)

// cf. light.c:62 — new_light_source(x, y, range, type, id): create light source
// Creates a new light source by calling new_light_core.
// TODO: light.c:62 — new_light_source(): light source creation

// cf. light.c:68 [static] — new_light_core(x, y, range, type, id): allocate light source
// Allocates and initializes a new light source structure and adds it to light_base.
// TODO: light.c:68 — new_light_core(): light source allocation

// cf. light.c:99 — del_light_source(type, id): delete light source
// Finds and deletes a light source by type and ID from the light_base list.
// TODO: light.c:99 — del_light_source(): light source deletion

// cf. light.c:141 [static] — delete_ls(ls): remove light source from list
// Removes a light source from the light_base linked list and frees its memory.
// TODO: light.c:141 — delete_ls(): light source list removal

// cf. light.c:169 — do_light_sources(cs_rows): mark lit locations
// Marks locations temporarily lit by mobile light sources in the vision system's array.
// TODO: light.c:169 — do_light_sources(): vision light source application

// cf. light.c:257 — show_transient_light(obj, x, y): transient light display
// Shows light from a thrown/kicked lit object or camera flash at a location.
// TODO: light.c:257 — show_transient_light(): transient object light display

// cf. light.c:330 — transient_light_cleanup(void): clean up transient light
// Cleans up camera flashes and redraws monsters visible during transient light movement.
// TODO: light.c:330 — transient_light_cleanup(): transient light cleanup

// cf. light.c:360 [static] — discard_flashes(void): remove camera flashes
// Removes all camera flash light sources (those with NULL object pointers).
// TODO: light.c:360 — discard_flashes(): camera flash removal

// cf. light.c:376 — find_mid(nid, fmflags): find monster by ID
// Finds a monster by its ID number across various monster chains.
// TODO: light.c:376 — find_mid(): monster ID lookup

// cf. light.c:397 [static] — whereis_mon(mon, fmflags): locate monster in chains
// Returns a flag indicating which monster chain contains the given monster.
// TODO: light.c:397 — whereis_mon(): monster chain location

// cf. light.c:421 — save_light_sources(nhfp, range): save light sources
// Saves all light sources of a given range to disk.
// N/A: light.c:421 — save_light_sources() (JS uses storage.js)

// cf. light.c:479 — restore_light_sources(nhfp): restore light sources
// Restores light source structures from disk without recalculating object pointers.
// N/A: light.c:479 — restore_light_sources() (JS uses storage.js)

// cf. light.c:501 — light_stats(hdrfmt, hdrbuf, count, size): light source statistics
// Provides statistics on light sources for the #stats wizard-mode command.
// TODO: light.c:501 — light_stats(): light source stats

// cf. light.c:517 — relink_light_sources(ghostly): relink light sources after restore
// Relinks all light sources marked as needing fixup after restore,
// remapping object/monster IDs.
// TODO: light.c:517 — relink_light_sources(): post-restore light source relink

// cf. light.c:570 [static] — maybe_write_ls(nhfp, range, write_it): count or write light sources
// Counts or writes light sources matching the specified range.
// N/A: light.c:570 — maybe_write_ls() (JS uses storage.js)

// cf. light.c:606 — light_sources_sanity_check(void): validate light sources
// Verifies that all light source object and monster pointers are still valid.
// TODO: light.c:606 — light_sources_sanity_check(): light source validation

// cf. light.c:634 [static] — write_ls(nhfp, ls): write single light source
// Writes a single light source structure to disk, converting pointers to IDs.
// N/A: light.c:634 — write_ls() (JS uses storage.js)

// cf. light.c:706 — obj_move_light_source(src, dest): move light source between objects
// Changes a light source's object ID from src to dest.
// TODO: light.c:706 — obj_move_light_source(): light source object transfer

// cf. light.c:719 — any_light_source(void): check for active light sources
// Returns true if there are any active light sources.
// TODO: light.c:719 — any_light_source(): active light source check

// cf. light.c:729 — snuff_light_source(x, y): extinguish light at location
// Snuffs out light sources at a location if they are burnable objects.
// TODO: light.c:729 — snuff_light_source(): light source extinguishment

// cf. light.c:763 — obj_sheds_light(obj): check if object emits light
// Returns true if an object emits any light.
// TODO: light.c:763 — obj_sheds_light(): object light emission check

// cf. light.c:771 — obj_is_burning(obj): check if object is burning
// Returns true if an object is lit and will be snuffed by end_burn().
// TODO: light.c:771 — obj_is_burning(): object burning check

// cf. light.c:779 — obj_split_light_source(src, dest): copy light source to split object
// Copies a light source from src object and attaches it to dest object.
// TODO: light.c:779 — obj_split_light_source(): light source split copy

// cf. light.c:808 — obj_merge_light_sources(src, dest): merge light sources
// Merges light sources when objects are combined.
// TODO: light.c:808 — obj_merge_light_sources(): light source merging

// cf. light.c:826 — obj_adjust_light_radius(obj, new_radius): change light radius
// Changes a light source's radius for an object.
// TODO: light.c:826 — obj_adjust_light_radius(): light radius adjustment

// cf. light.c:843 — candle_light_range(obj): calculate candle light range
// Calculates the light range for a candle or candelabrum based on quantity.
// TODO: light.c:843 — candle_light_range(): candle illumination radius

// cf. light.c:881 — arti_light_radius(obj): artifact light radius
// Returns the light radius for a light-emitting artifact based on curse/bless state.
// TODO: light.c:881 — arti_light_radius(): artifact light radius

// cf. light.c:916 — arti_light_description(obj): artifact light description
// Returns an adverb describing a lit artifact's light intensity.
// TODO: light.c:916 — arti_light_description(): artifact light description

// cf. light.c:935 — wiz_light_sources(void): wizard mode light source display
// Displays information about all active light sources for the #lightsources wizard command.
// TODO: light.c:935 — wiz_light_sources(): wizard light source display
