// symbols.js -- late-bound symbol offsets and dependent constants
// C refs: include/display.h enum glyph_offsets, include/permonst.h, include/objclass.h, include/hack.h
//
// This module intentionally depends on const.js + generated leaf data modules
// (objects.js / monsters.js / artifacts.js). It can be imported late to obtain
// constants which are deferred in const.js generation due cross-leaf deps.

import {
    GLYPH_MON_OFF,
    S_trwall,
    S_vwall,
    S_brdnladder,
    S_ndoor,
    S_arrow_trap,
    MAXTCHARS,
    S_grave,
    S_goodpos,
    S_digbeam,
    NUM_ZAP,
    MAXEXPCHARS,
    WARNCOUNT,
} from './const.js';
import { NUM_OBJECTS, FIRST_REAL_GEM, LAST_REAL_GEM, FIRST_GLASS_GEM, LAST_GLASS_GEM, FIRST_SPELL, LAST_SPELL } from './objects.js';
import { NUMMONS, PM_LONG_WORM_TAIL } from './monsters.js';
import { AFTER_LAST_ARTIFACT } from './artifacts.js';

// include/permonst.h enum monnums
export const HIGH_PM = NUMMONS - 1;
export const SPECIAL_PM = PM_LONG_WORM_TAIL;

// include/display.h enum glyph_offsets
export const GLYPH_MON_MALE_OFF = GLYPH_MON_OFF;
export const GLYPH_MON_FEM_OFF = (NUMMONS + GLYPH_MON_MALE_OFF);
export const GLYPH_PET_OFF = (NUMMONS + GLYPH_MON_FEM_OFF);
export const GLYPH_PET_MALE_OFF = (GLYPH_PET_OFF);
export const GLYPH_PET_FEM_OFF = (NUMMONS + GLYPH_PET_MALE_OFF);
export const GLYPH_INVIS_OFF = (NUMMONS + GLYPH_PET_FEM_OFF);
export const GLYPH_DETECT_OFF = (1 + GLYPH_INVIS_OFF);
export const GLYPH_DETECT_MALE_OFF = (GLYPH_DETECT_OFF);
export const GLYPH_DETECT_FEM_OFF = (NUMMONS + GLYPH_DETECT_MALE_OFF);
export const GLYPH_BODY_OFF = (NUMMONS + GLYPH_DETECT_FEM_OFF);
export const GLYPH_RIDDEN_OFF = (NUMMONS + GLYPH_BODY_OFF);
export const GLYPH_RIDDEN_MALE_OFF = (GLYPH_RIDDEN_OFF);
export const GLYPH_RIDDEN_FEM_OFF = (NUMMONS + GLYPH_RIDDEN_MALE_OFF);
export const GLYPH_OBJ_OFF = (NUMMONS + GLYPH_RIDDEN_FEM_OFF);
export const GLYPH_CMAP_OFF = (NUM_OBJECTS + GLYPH_OBJ_OFF);
export const GLYPH_CMAP_STONE_OFF = (GLYPH_CMAP_OFF);
export const GLYPH_CMAP_MAIN_OFF = (1 + GLYPH_CMAP_STONE_OFF);
export const GLYPH_CMAP_MINES_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_MAIN_OFF);
export const GLYPH_CMAP_GEH_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_MINES_OFF);
export const GLYPH_CMAP_KNOX_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_GEH_OFF);
export const GLYPH_CMAP_SOKO_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_KNOX_OFF);
export const GLYPH_CMAP_A_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_SOKO_OFF);
export const GLYPH_ALTAR_OFF = (((S_brdnladder - S_ndoor) + 1) + GLYPH_CMAP_A_OFF);
export const GLYPH_CMAP_B_OFF = (5 + GLYPH_ALTAR_OFF);
export const GLYPH_ZAP_OFF = ((S_arrow_trap + MAXTCHARS - S_grave) + GLYPH_CMAP_B_OFF);
export const GLYPH_CMAP_C_OFF = ((NUM_ZAP << 2) + GLYPH_ZAP_OFF);
export const GLYPH_SWALLOW_OFF = (((S_goodpos - S_digbeam) + 1) + GLYPH_CMAP_C_OFF);
export const GLYPH_EXPLODE_OFF = ((NUMMONS << 3) + GLYPH_SWALLOW_OFF);
export const GLYPH_EXPLODE_DARK_OFF = (GLYPH_EXPLODE_OFF);
export const GLYPH_EXPLODE_NOXIOUS_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_DARK_OFF);
export const GLYPH_EXPLODE_MUDDY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_NOXIOUS_OFF);
export const GLYPH_EXPLODE_WET_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_MUDDY_OFF);
export const GLYPH_EXPLODE_MAGICAL_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_WET_OFF);
export const GLYPH_EXPLODE_FIERY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_MAGICAL_OFF);
export const GLYPH_EXPLODE_FROSTY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_FIERY_OFF);
export const GLYPH_WARNING_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_FROSTY_OFF);
export const GLYPH_STATUE_OFF = (WARNCOUNT + GLYPH_WARNING_OFF);
export const GLYPH_STATUE_MALE_OFF = (GLYPH_STATUE_OFF);
export const GLYPH_STATUE_FEM_OFF = (NUMMONS + GLYPH_STATUE_MALE_OFF);
export const GLYPH_PILETOP_OFF = (NUMMONS + GLYPH_STATUE_FEM_OFF);
export const GLYPH_OBJ_PILETOP_OFF = (GLYPH_PILETOP_OFF);
export const GLYPH_BODY_PILETOP_OFF = (NUM_OBJECTS + GLYPH_OBJ_PILETOP_OFF);
export const GLYPH_STATUE_MALE_PILETOP_OFF = (NUMMONS + GLYPH_BODY_PILETOP_OFF);
export const GLYPH_STATUE_FEM_PILETOP_OFF = (NUMMONS + GLYPH_STATUE_MALE_PILETOP_OFF);
export const GLYPH_UNEXPLORED_OFF = (NUMMONS + GLYPH_STATUE_FEM_PILETOP_OFF);
export const GLYPH_NOTHING_OFF = (GLYPH_UNEXPLORED_OFF + 1);
export const MAX_GLYPH = (GLYPH_NOTHING_OFF + 1);

// display.h macro aliases
export const NO_GLYPH = MAX_GLYPH;
export const GLYPH_INVISIBLE = GLYPH_INVIS_OFF;
export const GLYPH_UNEXPLORED = GLYPH_UNEXPLORED_OFF;
export const GLYPH_NOTHING = GLYPH_NOTHING_OFF;

// include/objclass.h
export const NUM_REAL_GEMS = (LAST_REAL_GEM - FIRST_REAL_GEM + 1);
export const NUM_GLASS_GEMS = (LAST_GLASS_GEM - FIRST_GLASS_GEM + 1);
export const MAXSPELL = (LAST_SPELL - FIRST_SPELL + 1);

// include/hack.h
export const NROFARTIFACTS = (AFTER_LAST_ARTIFACT - 1);
