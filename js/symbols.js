// symbols.js -- late-bound symbol offsets and dependent constants
// C refs: include/display.h enum glyph_offsets
//
// This module intentionally depends on const.js + generated leaf data modules
// (objects.js / monsters.js / artifacts.js). It can be imported late to obtain
// constants which are deferred in const.js generation due cross-leaf deps.

import {
    S_trwall,
    S_vwall,
    S_brdnladder,
    S_ndoor,
    S_arrow_trap,
    MAXTCHARS,
    S_grave,
    S_goodpos,
    S_digbeam,
    MAXEXPCHARS,
    WARNCOUNT,
} from './const.js';
import { NUM_OBJECTS } from './objects.js';
import { NUMMONS } from './monsters.js';

// ===== display.h constants (owned by symbols.js) =====
export const GM_FLAGS = 0;
export const GM_TTYCHAR = (GM_FLAGS + 1);
export const GM_COLOR = (GM_TTYCHAR + 1);
export const NUM_GLYPHMOD = (GM_COLOR + 1);
export const GLYPH_MON_OFF = 0;
export const SHIELD_COUNT = 21;
export const NUM_ZAP = 8;
export const MG_FLAG_NORMAL = 0x00;
export const MG_FLAG_NOOVERRIDE = 0x01;
export const MG_HERO = 0x00001;
export const MG_CORPSE = 0x00002;
export const MG_INVIS = 0x00004;
export const MG_DETECT = 0x00008;
export const MG_PET = 0x00010;
export const MG_RIDDEN = 0x00020;
export const MG_STATUE = 0x00040;
export const MG_OBJPILE = 0x00080;
export const MG_BW_LAVA = 0x00100;
export const MG_BW_ICE = 0x00200;
export const MG_BW_SINK = 0x00200;
export const MG_BW_ENGR = 0x00200;
export const MG_NOTHING = 0x00400;
export const MG_UNEXPL = 0x00800;
export const MG_MALE = 0x01000;
export const MG_FEMALE = 0x02000;
export const MG_BADXY = 0x04000;

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
