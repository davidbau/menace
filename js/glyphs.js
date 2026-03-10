// glyphs.js -- Glyph ID cache, customization, and symbol mapping
// cf. glyphs.c — glyphrep_to_custom_map_entries, fix_glyphname,
//                glyph_to_cmap, glyph_find_core, fill_glyphid_cache,
//                init_glyph_cache, free_glyphid_cache, add_glyph_to_cache,
//                find_glyph_in_cache, find_glyphid_in_cache_by_glyphnum,
//                glyph_hash, glyphid_cache_status, match_glyph, glyphrep,
//                add_custom_nhcolor_entry, apply_customizations,
//                maybe_shuffle_customizations, shuffle_customizations,
//                find_matching_customization, purge_all_custom_entries,
//                purge_custom_entries, dump_all_glyphids, wizcustom_glyphids,
//                parse_id, clear_all_glyphmap_colors, reset_customcolors
//
// glyphs.c provides the glyph ID cache and customization system:
//   glyph_to_cmap(): map glyph ID → character map symbol index.
//   fill_glyphid_cache(): build hash cache of all glyph IDs for config parsing.
//   apply_customizations(): apply pending symbol/color customizations to glyph map.
//   add_custom_nhcolor_entry(): add or update a custom color entry for a glyph.
//   purge_all_custom_entries(): clear all custom glyph customizations.
//
// JS implementations:
//   const.js: exports symbol and color definitions equivalent to glyphs.c's G_/S_ glyph IDs.
//   display.js:621 — terrainSymbol(): similar symbol lookup by location type.

// cf. glyphs.c:112 — glyphrep_to_custom_map_entries(op, glyphptr): parse glyph rep string
// Parses a glyph representation string with optional Unicode/color values and
// applies customizations to the custom symbol map entries.
// TODO: glyphs.c:112 — glyphrep_to_custom_map_entries(): glyph rep parsing

// cf. glyphs.c:183 [static] — fix_glyphname(str): normalize glyph name
// Converts a glyph name to lowercase and replaces non-alphanumeric chars with underscores.
// TODO: glyphs.c:183 — fix_glyphname(): glyph name normalization

// cf. glyphs.c:200 — glyph_to_cmap(glyph): glyph ID to cmap symbol
// Maps a glyph ID to its corresponding character map symbol index.
// TODO: glyphs.c:200 — glyph_to_cmap(): glyph-to-cmap mapping

// cf. glyphs.c:233 [static] — glyph_find_core(id, findwhat): find glyph by ID
// Core function that finds glyphs by ID, supporting monster, object, and cmap types.
// TODO: glyphs.c:233 — glyph_find_core(): glyph ID lookup core

// cf. glyphs.c:302 — fill_glyphid_cache(void): build glyph ID cache
// Initializes and fills a cache of all glyph ID strings for fast config file parsing.
// TODO: glyphs.c:302 — fill_glyphid_cache(): glyph ID cache population

// cf. glyphs.c:332 [static] — init_glyph_cache(void): allocate glyph cache
// Allocates and initializes the glyph ID cache with power-of-two sizing.
// TODO: glyphs.c:332 — init_glyph_cache(): glyph cache initialization

// cf. glyphs.c:353 — free_glyphid_cache(void): free glyph cache
// Frees all memory allocated for the glyph ID cache.
// TODO: glyphs.c:353 — free_glyphid_cache(): glyph cache deallocation

// cf. glyphs.c:369 [static] — add_glyph_to_cache(glyphnum, id): cache a glyph ID
// Adds a glyph ID entry to the cache using double-hash collision resolution.
// TODO: glyphs.c:369 — add_glyph_to_cache(): glyph cache entry insertion

// cf. glyphs.c:392 [static] — find_glyph_in_cache(id): look up cached glyph
// Searches the cache for a glyph ID using double-hash lookups.
// TODO: glyphs.c:392 — find_glyph_in_cache(): glyph cache lookup by ID

// cf. glyphs.c:415 [static] — find_glyphid_in_cache_by_glyphnum(glyphnum): cache lookup by number
// Retrieves a glyph ID string from the cache by glyph number.
// TODO: glyphs.c:415 — find_glyphid_in_cache_by_glyphnum(): cache lookup by number

// cf. glyphs.c:432 [static] — glyph_hash(id): hash glyph ID string
// Computes a 32-bit hash value for a glyph ID string using rotate-and-xor.
// TODO: glyphs.c:432 — glyph_hash(): glyph ID hash computation

// cf. glyphs.c:449 — glyphid_cache_status(void): check cache initialized
// Returns whether the glyph ID cache is currently initialized.
// TODO: glyphs.c:449 — glyphid_cache_status(): cache status query

// cf. glyphs.c:455 — match_glyph(buf): match G_ glyph reference
// Matches a G_ glyph reference string and applies attached color customizations.
// TODO: glyphs.c:455 — match_glyph(): G_ glyph reference matching

// cf. glyphs.c:467 — glyphrep(op): validate glyph representation
// Validates that a glyph representation string can be successfully parsed.
// TODO: glyphs.c:467 — glyphrep(): glyph rep validation

// cf. glyphs.c:481 — add_custom_nhcolor_entry(customization_name, glyphidx, nhcolor, which_set): add custom color
// Adds or updates a custom color entry for a specific glyph in a graphics set.
// TODO: glyphs.c:481 — add_custom_nhcolor_entry(): custom glyph color entry

// cf. glyphs.c:528 — apply_customizations(which_set, docustomize): apply glyph customizations
// Applies pending symbol and color customizations to the glyph map array.
// TODO: glyphs.c:528 — apply_customizations(): glyph customization application

// cf. glyphs.c:578 — maybe_shuffle_customizations(void): shuffle customizations if needed
// Conditionally applies customization shuffling to match shuffled object descriptions.
// TODO: glyphs.c:578 — maybe_shuffle_customizations(): conditional customization shuffle

// cf. glyphs.c:643 [static] — shuffle_customizations(void): shuffle glyph customizations
// Shuffles glyph customizations to match object description changes.
// TODO: glyphs.c:643 — shuffle_customizations(): customization shuffle

// cf. glyphs.c:733 — find_matching_customization(customization_name, custtype, which_set): find customization
// Finds customization details matching a specific name, type, and graphics set.
// TODO: glyphs.c:733 — find_matching_customization(): customization lookup

// cf. glyphs.c:748 — purge_all_custom_entries(void): clear all customizations
// Clears all custom glyph customizations across all graphics sets.
// TODO: glyphs.c:748 — purge_all_custom_entries(): full customization reset

// cf. glyphs.c:758 — purge_custom_entries(which_set): clear one set's customizations
// Clears all customization entries for a specific graphics set.
// TODO: glyphs.c:758 — purge_custom_entries(): per-set customization reset

// cf. glyphs.c:794 — dump_all_glyphids(fp): debug dump all glyph IDs
// Outputs all glyph ID strings with their glyph numbers to a file for debugging.
// N/A: glyphs.c:794 — dump_all_glyphids() (no file I/O in browser)

// cf. glyphs.c:805 — wizcustom_glyphids(win): wizard mode glyph ID display
// Displays all available glyph IDs to the player in wizard mode.
// TODO: glyphs.c:805 — wizcustom_glyphids(): wizard glyph ID display

// cf. glyphs.c:821 [static] — parse_id(id, findwhat): parse glyph/symbol ID
// Parses glyph IDs and symbol names (G_ and S_ prefixes), generates glyph names,
// and supports cache filling.
// TODO: glyphs.c:821 — parse_id(): glyph/symbol ID parsing

// cf. glyphs.c:1164 — clear_all_glyphmap_colors(void): clear custom glyph colors
// Clears custom color settings from all glyphs in the glyph map.
// TODO: glyphs.c:1164 — clear_all_glyphmap_colors(): glyph color clearing

// cf. glyphs.c:1176 — reset_customcolors(void): reset to applied colors
// Resets custom glyph colors to their currently applied state.
// TODO: glyphs.c:1176 — reset_customcolors(): custom color reset

// Autotranslated from glyphs.c:199
export function glyph_to_cmap(glyph) {
  if (glyph === GLYPH_CMAP_STONE_OFF) return S_stone;
  else if (glyph_is_cmap_main(glyph)) return (glyph - GLYPH_CMAP_MAIN_OFF) + S_vwall;
  else if (glyph_is_cmap_mines(glyph)) return (glyph - GLYPH_CMAP_MINES_OFF) + S_vwall;
  else if (glyph_is_cmap_gehennom(glyph)) return (glyph - GLYPH_CMAP_GEH_OFF) + S_vwall;
  else if (glyph_is_cmap_knox(glyph)) return (glyph - GLYPH_CMAP_KNOX_OFF) + S_vwall;
  else if (glyph_is_cmap_sokoban(glyph)) return (glyph - GLYPH_CMAP_SOKO_OFF) + S_vwall;
  else if (glyph_is_cmap_a(glyph)) return (glyph - GLYPH_CMAP_A_OFF) + S_ndoor;
  else if (glyph_is_cmap_altar(glyph)) return S_altar;
  else if (glyph_is_cmap_b(glyph)) return (glyph - GLYPH_CMAP_B_OFF) + S_grave;
  else if (glyph_is_cmap_c(glyph)) return (glyph - GLYPH_CMAP_C_OFF) + S_digbeam;
  else if (glyph_is_cmap_zap(glyph)) return ((glyph - GLYPH_ZAP_OFF) % 4) + S_vbeam;
  else if (glyph_is_swallow(glyph)) return glyph_to_swallow(glyph) + S_sw_tl;
  else if (glyph_is_explosion(glyph)) return glyph_to_explosion(glyph) + S_expl_tl;
  else {
    return MAXPCHARS;
  }
}

// Autotranslated from glyphs.c:332
export function init_glyph_cache() {
  let glyph;
  glyphid_cache_lsize = 0;
  glyphid_cache_size = 1;
  while (glyphid_cache_size < 2*MAX_GLYPH) {
    ++glyphid_cache_lsize;
    glyphid_cache_size <<= 1;
  }
  glyphid_cache = Array.from({ length: glyphid_cache_size }, () => ({ glyphnum: 0, id: null }));
  for (glyph = 0; glyph < glyphid_cache_size; ++glyph) {
    glyphid_cache[glyph].glyphnum = 0;
    glyphid_cache[glyph].id =  0;
  }
}

// Autotranslated from glyphs.c:353
export function free_glyphid_cache() {
  let idx;
  if (!glyphid_cache) return;
  for (idx = 0; idx < glyphid_cache_size; ++idx) {
    if (glyphid_cache[idx].id) { (glyphid_cache[idx].id, 0); glyphid_cache[idx].id =  0; }
  }
  (glyphid_cache, 0);
  glyphid_cache =  0;
}

// Autotranslated from glyphs.c:415
export function find_glyphid_in_cache_by_glyphnum(glyphnum) {
  let idx;
  if (!glyphid_cache) return  0;
  for (idx = 0; idx < glyphid_cache_size; ++idx) {
    if (glyphid_cache[idx].glyphnum === glyphnum && glyphid_cache[idx].id !== 0) { return glyphid_cache[idx].id; }
  }
  return  0;
}

// Autotranslated from glyphs.c:449
export function glyphid_cache_status() {
  return (glyphid_cache != null);
}

// Autotranslated from glyphs.c:455
export function match_glyph(buf) {
  let workbuf;
  workbuf = buf;
  return glyphrep(workbuf);
}

// Autotranslated from glyphs.c:467
export function glyphrep(op) {
  let reslt = 0, glyph = NO_GLYPH;
  if (!glyphid_cache) reslt = 1;
  nhUse(reslt);
  reslt = glyphrep_to_custom_map_entries(op, glyph);
  if (reslt) return 1;
  return 0;
}

// Autotranslated from glyphs.c:481
export function add_custom_nhcolor_entry(customization_name, glyphidx, nhcolor, which_set) {
  let gdc =  gs.sym_customizations[which_set][custom_nhcolor];
  let details, newdetails = 0;
  if (!gdc.details) {
    gdc.customization_name = customization_name;
    gdc.custtype = custom_nhcolor;
    gdc.details = 0;
    gdc.details_end = 0;
  }
  details = find_matching_customization(customization_name, custom_nhcolor, which_set);
  if (details) {
    while (details) {
      if (details.content.ccolor.glyphidx === glyphidx) { details.content.ccolor.nhcolor = nhcolor; return 1; }
      details = details.next;
    }
  }
  newdetails = { content: { urep: { glyphidx: glyphidx }, ccolor: { glyphidx: glyphidx, nhcolor: nhcolor } }, next: null };
  newdetails.next =  0;
  if (gdc.details === null) { gdc.details = newdetails; }
  else { gdc.details_end.next = newdetails; }
  gdc.details_end = newdetails;
  gdc.count++;
  return 1;
}

// Autotranslated from glyphs.c:748
export function purge_all_custom_entries() {
  let i;
  for (i = 0; i < NUM_GRAPHICS + 1; ++i) {
    purge_custom_entries(i);
  }
}

// Autotranslated from glyphs.c:758
export function purge_custom_entries(which_set, player) {
  let custtype, gdc, details, next;
  for (custtype = custom_none; custtype < custom_count; ++custtype) {
    gdc = gs.sym_customizations[which_set][custtype];
    details = gdc.details;
    while (details) {
      next = details.next;
      if (gdc.custtype === custom_ureps) {
        if (details.content.urep.player.utf8str) (details.content.urep.player.utf8str, 0);
        details.content.urep.player.utf8str = null;
      }
      else if (gdc.custtype === custom_symbols) { details.content.sym.symparse =  0; details.content.sym.val = 0; }
      else if (gdc.custtype === custom_nhcolor) { details.content.ccolor.nhcolor = 0; details.content.ccolor.glyphidx = 0; }
      (details, 0);
      details = next;
    }
    gdc.details = 0;
    gdc.details_end = 0;
    if (gdc.customization_name) { (gdc.customization_name, 0); gdc.customization_name = 0; }
    gdc.count = 0;
  }
}

// Autotranslated from glyphs.c:805
export function wizcustom_glyphids(win) {
  let glyphnum, id;
  if (!glyphid_cache) return;
  for (glyphnum = 0; glyphnum < MAX_GLYPH; ++glyphnum) {
    id = find_glyphid_in_cache_by_glyphnum(glyphnum);
    if (id) { wizcustom_callback(win, glyphnum, id); }
  }
}

// Autotranslated from glyphs.c:1164
export function clear_all_glyphmap_colors() {
  let glyph;
  for (glyph = 0; glyph < MAX_GLYPH; ++glyph) {
    if (glyphmap[glyph].customcolor) glyphmap[glyph].customcolor = 0;
    glyphmap[glyph].color256idx = 0;
  }
}

// Autotranslated from glyphs.c:111
export function glyphrep_to_custom_map_entries(op, glyphptr) {
  to_custom_symbol_find = zero_find;
  let buf, c_glyphid, c_unicode, c_colorval, cp, reslt = 0, rgb = 0;
  let slash = false, colon = false;
  if (!glyphid_cache) reslt = 1;
  nhUse(reslt);
  buf = op;
  c_unicode = c_colorval =  0;
  c_glyphid = cp = buf;
  while ( cp) {
    if ( cp === ':' || cp === '/') {
      if ( cp === ':') { colon = true; cp = '\x00'; }
      if ( cp === '/') { slash = true; cp = '\x00'; }
    }
    cp++;
    if (colon) { c_unicode = cp; colon = false; }
    if (slash) { c_colorval = cp; slash = false; }
  }
  if (c_glyphid && c_glyphid === ' ') c_glyphid++;
  if (c_colorval && c_colorval === ' ') c_colorval++;
  if (c_unicode && c_unicode === ' ') {
    while ( c_unicode === ' ') {
      c_unicode++;
    }
  }
  if (c_unicode && !c_unicode) c_unicode = 0;
  if ((c_colorval && (rgb = rgbstr_to_int32(c_colorval)) !== -1) || !c_colorval) {
    to_custom_symbol_find.color = (rgb === -1 || !c_colorval) ? 0 : (rgb === 0) ? nonzero_black : rgb;
  }
  if (c_unicode) to_custom_symbol_find.unicode_val = c_unicode;
  to_custom_symbol_find.extraval = glyphptr;
  to_custom_symbol_find.callback = to_custom_symset_entry_callback;
  reslt = glyph_find_core(c_glyphid, to_custom_symbol_find);
  return reslt;
}

// C ref: glyphs.c:183 — normalize glyph name to lowercase with _ for non-alnum
export function fix_glyphname(str) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c >= 'A' && c <= 'Z') {
      result += c.toLowerCase();
    } else if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
      result += c;
    } else {
      result += '_';
    }
  }
  return result;
}
