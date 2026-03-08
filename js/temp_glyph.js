// temp_glyph.js -- Shared transient glyph decoding for tmp_at overlays.
// C ref: display.c show_glyph()/mapglyph pipeline; JS passes either
// { ch, color } cells or numeric values from various call sites.

import { mons } from './monsters.js';
import { CORPSE, objectData } from './objects.js';
import {
    CLR_BLACK,
    CLR_BLUE,
    CLR_BRIGHT_GREEN,
    CLR_BROWN,
    CLR_CYAN,
    CLR_GREEN,
    CLR_GRAY,
    CLR_MAGENTA,
    CLR_ORANGE,
    CLR_RED,
    CLR_WHITE,
    def_warnsyms,
    MAXTCHARS,
    WARNCOUNT,
} from './const.js';
import {
    def_monsyms,
    defsyms,
    S_altar,
    S_arrow_trap,
    S_brdnladder,
    S_digbeam,
    S_expl_br,
    S_expl_tl,
    S_goodpos,
    S_grave,
    S_ndoor,
    S_stone,
    S_sw_tl,
    S_trwall,
    S_vbeam,
    S_vwall,
    S_invisible,
} from './symbols.js';

const NUM_ZAP = 8;
const MAXEXPCHARS = (S_expl_br - S_expl_tl) + 1;
const WALL_VARIANT_COUNT = (S_trwall - S_vwall) + 1;
const CMAP_A_COUNT = (S_brdnladder - S_ndoor) + 1;
const CMAP_B_COUNT = S_arrow_trap + MAXTCHARS - S_grave;
const CMAP_C_COUNT = (S_goodpos - S_digbeam) + 1;
const SWALLOW_COUNT = 8;

function glyphLayout() {
    const NUMMONS = Array.isArray(mons) ? mons.length : 0;
    const NUM_OBJECTS = Array.isArray(objectData) ? objectData.length : 0;

    const GLYPH_MON_OFF = 0;
    const GLYPH_MON_MALE_OFF = GLYPH_MON_OFF;
    const GLYPH_MON_FEM_OFF = NUMMONS + GLYPH_MON_MALE_OFF;
    const GLYPH_PET_OFF = NUMMONS + GLYPH_MON_FEM_OFF;
    const GLYPH_PET_MALE_OFF = GLYPH_PET_OFF;
    const GLYPH_PET_FEM_OFF = NUMMONS + GLYPH_PET_MALE_OFF;
    const GLYPH_INVIS_OFF = NUMMONS + GLYPH_PET_FEM_OFF;
    const GLYPH_DETECT_OFF = 1 + GLYPH_INVIS_OFF;
    const GLYPH_DETECT_MALE_OFF = GLYPH_DETECT_OFF;
    const GLYPH_DETECT_FEM_OFF = NUMMONS + GLYPH_DETECT_MALE_OFF;
    const GLYPH_BODY_OFF = NUMMONS + GLYPH_DETECT_FEM_OFF;
    const GLYPH_RIDDEN_OFF = NUMMONS + GLYPH_BODY_OFF;
    const GLYPH_RIDDEN_MALE_OFF = GLYPH_RIDDEN_OFF;
    const GLYPH_RIDDEN_FEM_OFF = NUMMONS + GLYPH_RIDDEN_MALE_OFF;
    const GLYPH_OBJ_OFF = NUMMONS + GLYPH_RIDDEN_FEM_OFF;
    const GLYPH_CMAP_OFF = NUM_OBJECTS + GLYPH_OBJ_OFF;
    const GLYPH_CMAP_STONE_OFF = GLYPH_CMAP_OFF;
    const GLYPH_CMAP_MAIN_OFF = 1 + GLYPH_CMAP_STONE_OFF;
    const GLYPH_CMAP_MINES_OFF = WALL_VARIANT_COUNT + GLYPH_CMAP_MAIN_OFF;
    const GLYPH_CMAP_GEH_OFF = WALL_VARIANT_COUNT + GLYPH_CMAP_MINES_OFF;
    const GLYPH_CMAP_KNOX_OFF = WALL_VARIANT_COUNT + GLYPH_CMAP_GEH_OFF;
    const GLYPH_CMAP_SOKO_OFF = WALL_VARIANT_COUNT + GLYPH_CMAP_KNOX_OFF;
    const GLYPH_CMAP_A_OFF = WALL_VARIANT_COUNT + GLYPH_CMAP_SOKO_OFF;
    const GLYPH_ALTAR_OFF = CMAP_A_COUNT + GLYPH_CMAP_A_OFF;
    const GLYPH_CMAP_B_OFF = 5 + GLYPH_ALTAR_OFF;
    const GLYPH_ZAP_OFF = CMAP_B_COUNT + GLYPH_CMAP_B_OFF;
    const GLYPH_CMAP_C_OFF = (NUM_ZAP << 2) + GLYPH_ZAP_OFF;
    const GLYPH_SWALLOW_OFF = CMAP_C_COUNT + GLYPH_CMAP_C_OFF;
    const GLYPH_EXPLODE_OFF = (NUMMONS << 3) + GLYPH_SWALLOW_OFF;
    const GLYPH_EXPLODE_DARK_OFF = GLYPH_EXPLODE_OFF;
    const GLYPH_EXPLODE_NOXIOUS_OFF = MAXEXPCHARS + GLYPH_EXPLODE_DARK_OFF;
    const GLYPH_EXPLODE_MUDDY_OFF = MAXEXPCHARS + GLYPH_EXPLODE_NOXIOUS_OFF;
    const GLYPH_EXPLODE_WET_OFF = MAXEXPCHARS + GLYPH_EXPLODE_MUDDY_OFF;
    const GLYPH_EXPLODE_MAGICAL_OFF = MAXEXPCHARS + GLYPH_EXPLODE_WET_OFF;
    const GLYPH_EXPLODE_FIERY_OFF = MAXEXPCHARS + GLYPH_EXPLODE_MAGICAL_OFF;
    const GLYPH_EXPLODE_FROSTY_OFF = MAXEXPCHARS + GLYPH_EXPLODE_FIERY_OFF;
    const GLYPH_WARNING_OFF = MAXEXPCHARS + GLYPH_EXPLODE_FROSTY_OFF;
    const GLYPH_STATUE_OFF = WARNCOUNT + GLYPH_WARNING_OFF;
    const GLYPH_STATUE_MALE_OFF = GLYPH_STATUE_OFF;
    const GLYPH_STATUE_FEM_OFF = NUMMONS + GLYPH_STATUE_MALE_OFF;
    const GLYPH_PILETOP_OFF = NUMMONS + GLYPH_STATUE_FEM_OFF;
    const GLYPH_OBJ_PILETOP_OFF = GLYPH_PILETOP_OFF;
    const GLYPH_BODY_PILETOP_OFF = NUM_OBJECTS + GLYPH_OBJ_PILETOP_OFF;
    const GLYPH_STATUE_MALE_PILETOP_OFF = NUMMONS + GLYPH_BODY_PILETOP_OFF;
    const GLYPH_STATUE_FEM_PILETOP_OFF = NUMMONS + GLYPH_STATUE_MALE_PILETOP_OFF;
    const GLYPH_UNEXPLORED_OFF = NUMMONS + GLYPH_STATUE_FEM_PILETOP_OFF;
    const GLYPH_NOTHING_OFF = GLYPH_UNEXPLORED_OFF + 1;

    return {
        NUMMONS,
        NUM_OBJECTS,
        GLYPH_MON_MALE_OFF,
        GLYPH_MON_FEM_OFF,
        GLYPH_PET_MALE_OFF,
        GLYPH_PET_FEM_OFF,
        GLYPH_INVIS_OFF,
        GLYPH_DETECT_MALE_OFF,
        GLYPH_DETECT_FEM_OFF,
        GLYPH_BODY_OFF,
        GLYPH_RIDDEN_MALE_OFF,
        GLYPH_RIDDEN_FEM_OFF,
        GLYPH_OBJ_OFF,
        GLYPH_CMAP_OFF,
        GLYPH_CMAP_STONE_OFF,
        GLYPH_CMAP_MAIN_OFF,
        GLYPH_CMAP_MINES_OFF,
        GLYPH_CMAP_GEH_OFF,
        GLYPH_CMAP_KNOX_OFF,
        GLYPH_CMAP_SOKO_OFF,
        GLYPH_CMAP_A_OFF,
        GLYPH_ALTAR_OFF,
        GLYPH_CMAP_B_OFF,
        GLYPH_ZAP_OFF,
        GLYPH_CMAP_C_OFF,
        GLYPH_SWALLOW_OFF,
        GLYPH_EXPLODE_OFF,
        GLYPH_WARNING_OFF,
        GLYPH_STATUE_MALE_OFF,
        GLYPH_STATUE_FEM_OFF,
        GLYPH_OBJ_PILETOP_OFF,
        GLYPH_BODY_PILETOP_OFF,
        GLYPH_STATUE_MALE_PILETOP_OFF,
        GLYPH_STATUE_FEM_PILETOP_OFF,
        GLYPH_UNEXPLORED_OFF,
        GLYPH_NOTHING_OFF,
    };
}

function fromDefsym(idx) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= defsyms.length) return null;
    const sym = defsyms[idx];
    if (!sym || typeof sym.ch !== 'string' || sym.ch.length === 0) return null;
    return {
        ch: sym.ch[0],
        color: Number.isInteger(sym.color) ? sym.color : CLR_GRAY,
        attr: 0,
    };
}

function fromMonsterIndex(mndx) {
    if (!Number.isInteger(mndx) || mndx < 0 || mndx >= mons.length) return null;
    const mon = mons[mndx] || {};
    const mlet = Number.isInteger(mon.mlet) ? mon.mlet : 0;
    const sym = def_monsyms[mlet];
    if (!sym || typeof sym.sym !== 'string' || sym.sym.length === 0) return null;
    return {
        ch: sym.sym[0],
        color: Number.isInteger(mon.mcolor) ? mon.mcolor : CLR_WHITE,
        attr: 0,
    };
}

function fromObjectIndex(otyp) {
    if (!Number.isInteger(otyp) || otyp < 0 || otyp >= objectData.length) return null;
    const obj = objectData[otyp] || {};
    if (typeof obj.symbol !== 'string' || obj.symbol.length === 0) return null;
    return {
        ch: obj.symbol[0],
        color: Number.isInteger(obj.color) ? obj.color : CLR_WHITE,
        attr: 0,
    };
}

function inRange(v, start, len) {
    return v >= start && v < (start + len);
}

function decodeCMapGlyph(glyph, G) {
    if (glyph === G.GLYPH_CMAP_STONE_OFF) {
        return fromDefsym(S_stone);
    }
    if (inRange(glyph, G.GLYPH_CMAP_MAIN_OFF, WALL_VARIANT_COUNT)) {
        return fromDefsym(S_vwall + (glyph - G.GLYPH_CMAP_MAIN_OFF));
    }
    if (inRange(glyph, G.GLYPH_CMAP_MINES_OFF, WALL_VARIANT_COUNT)) {
        return fromDefsym(S_vwall + (glyph - G.GLYPH_CMAP_MINES_OFF));
    }
    if (inRange(glyph, G.GLYPH_CMAP_GEH_OFF, WALL_VARIANT_COUNT)) {
        return fromDefsym(S_vwall + (glyph - G.GLYPH_CMAP_GEH_OFF));
    }
    if (inRange(glyph, G.GLYPH_CMAP_KNOX_OFF, WALL_VARIANT_COUNT)) {
        return fromDefsym(S_vwall + (glyph - G.GLYPH_CMAP_KNOX_OFF));
    }
    if (inRange(glyph, G.GLYPH_CMAP_SOKO_OFF, WALL_VARIANT_COUNT)) {
        return fromDefsym(S_vwall + (glyph - G.GLYPH_CMAP_SOKO_OFF));
    }
    if (inRange(glyph, G.GLYPH_CMAP_A_OFF, CMAP_A_COUNT)) {
        return fromDefsym(S_ndoor + (glyph - G.GLYPH_CMAP_A_OFF));
    }
    if (inRange(glyph, G.GLYPH_ALTAR_OFF, 5)) {
        return fromDefsym(S_altar);
    }
    if (inRange(glyph, G.GLYPH_CMAP_B_OFF, CMAP_B_COUNT)) {
        return fromDefsym(S_grave + (glyph - G.GLYPH_CMAP_B_OFF));
    }
    if (inRange(glyph, G.GLYPH_ZAP_OFF, NUM_ZAP << 2)) {
        const orient = (glyph - G.GLYPH_ZAP_OFF) % 4;
        const ztype = Math.floor((glyph - G.GLYPH_ZAP_OFF) / 4);
        const cell = fromDefsym(S_vbeam + orient);
        if (!cell) return null;
        // C ref: GLYPH_ZAP encodes zap type in groups of 4 directional glyphs.
        const zcolor = [
            CLR_MAGENTA, // magic missile
            CLR_RED,     // fire
            CLR_CYAN,    // cold
            CLR_GREEN,   // sleep
            CLR_BLACK,   // death
            CLR_WHITE,   // lightning
            CLR_GREEN,   // poison gas
            CLR_BRIGHT_GREEN, // acid
        ][ztype];
        return {
            ...cell,
            color: Number.isInteger(zcolor) ? zcolor : cell.color,
        };
    }
    if (inRange(glyph, G.GLYPH_CMAP_C_OFF, CMAP_C_COUNT)) {
        return fromDefsym(S_digbeam + (glyph - G.GLYPH_CMAP_C_OFF));
    }
    return null;
}

function decodeCGlyph(glyph) {
    if (!Number.isInteger(glyph) || glyph < 0) return null;
    const G = glyphLayout();

    if (inRange(glyph, G.GLYPH_OBJ_OFF, G.NUM_OBJECTS)) {
        return fromObjectIndex(glyph - G.GLYPH_OBJ_OFF);
    }
    if (inRange(glyph, G.GLYPH_OBJ_PILETOP_OFF, G.NUM_OBJECTS)) {
        return fromObjectIndex(glyph - G.GLYPH_OBJ_PILETOP_OFF);
    }
    if (inRange(glyph, G.GLYPH_BODY_OFF, G.NUMMONS)) {
        return fromObjectIndex(CORPSE);
    }
    if (inRange(glyph, G.GLYPH_BODY_PILETOP_OFF, G.NUMMONS)) {
        return fromObjectIndex(CORPSE);
    }

    if (inRange(glyph, G.GLYPH_MON_MALE_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_MON_MALE_OFF);
    }
    if (inRange(glyph, G.GLYPH_MON_FEM_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_MON_FEM_OFF);
    }
    if (inRange(glyph, G.GLYPH_PET_MALE_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_PET_MALE_OFF);
    }
    if (inRange(glyph, G.GLYPH_PET_FEM_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_PET_FEM_OFF);
    }
    if (inRange(glyph, G.GLYPH_DETECT_MALE_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_DETECT_MALE_OFF);
    }
    if (inRange(glyph, G.GLYPH_DETECT_FEM_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_DETECT_FEM_OFF);
    }
    if (inRange(glyph, G.GLYPH_RIDDEN_MALE_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_RIDDEN_MALE_OFF);
    }
    if (inRange(glyph, G.GLYPH_RIDDEN_FEM_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_RIDDEN_FEM_OFF);
    }
    if (inRange(glyph, G.GLYPH_STATUE_MALE_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_STATUE_MALE_OFF);
    }
    if (inRange(glyph, G.GLYPH_STATUE_FEM_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_STATUE_FEM_OFF);
    }
    if (inRange(glyph, G.GLYPH_STATUE_MALE_PILETOP_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_STATUE_MALE_PILETOP_OFF);
    }
    if (inRange(glyph, G.GLYPH_STATUE_FEM_PILETOP_OFF, G.NUMMONS)) {
        return fromMonsterIndex(glyph - G.GLYPH_STATUE_FEM_PILETOP_OFF);
    }
    if (glyph === G.GLYPH_INVIS_OFF) {
        const invis = def_monsyms[S_invisible];
        if (invis && typeof invis.sym === 'string' && invis.sym.length > 0) {
            return { ch: invis.sym[0], color: CLR_GRAY, attr: 0 };
        }
    }

    if (inRange(glyph, G.GLYPH_WARNING_OFF, WARNCOUNT)) {
        const warn = def_warnsyms[glyph - G.GLYPH_WARNING_OFF];
        if (warn && typeof warn.ch === 'string' && warn.ch.length > 0) {
            return {
                ch: warn.ch[0],
                color: Number.isInteger(warn.color) ? warn.color : CLR_WHITE,
                attr: 0,
            };
        }
    }

    const cmap = decodeCMapGlyph(glyph, G);
    if (cmap) return cmap;

    if (inRange(glyph, G.GLYPH_SWALLOW_OFF, G.NUMMONS * SWALLOW_COUNT)) {
        return fromDefsym(S_sw_tl + ((glyph - G.GLYPH_SWALLOW_OFF) % SWALLOW_COUNT));
    }
    if (inRange(glyph, G.GLYPH_EXPLODE_OFF, MAXEXPCHARS * 7)) {
        const phase = Math.floor((glyph - G.GLYPH_EXPLODE_OFF) / MAXEXPCHARS);
        const cell = fromDefsym(S_expl_tl + ((glyph - G.GLYPH_EXPLODE_OFF) % MAXEXPCHARS));
        if (!cell) return null;
        // C ref: explosion glyph blocks are grouped by explosion type; give each
        // group its canonical palette color instead of a single shared fallback.
        const phaseColor = [
            CLR_GRAY,    // dark
            CLR_GREEN,   // noxious
            CLR_BROWN,   // muddy
            CLR_BLUE,    // wet
            CLR_MAGENTA, // magical
            CLR_RED,     // fiery
            CLR_WHITE,   // frosty
        ][phase];
        return {
            ...cell,
            color: Number.isInteger(phaseColor) ? phaseColor : CLR_ORANGE,
        };
    }
    if (glyph === G.GLYPH_UNEXPLORED_OFF || glyph === G.GLYPH_NOTHING_OFF) {
        return { ch: ' ', color: CLR_GRAY, attr: 0 };
    }

    return null;
}

export function tempGlyphToCell(glyph) {
    if (glyph && typeof glyph === 'object') {
        const ch = typeof glyph.ch === 'string' && glyph.ch.length > 0 ? glyph.ch[0] : '*';
        const color = Number.isInteger(glyph.color) ? glyph.color : CLR_WHITE;
        const attr = Number.isInteger(glyph.attr) ? glyph.attr : 0;
        return { ch, color, attr };
    }

    if (typeof glyph === 'string' && glyph.length > 0) {
        return { ch: glyph[0], color: CLR_WHITE, attr: 0 };
    }

    if (Number.isInteger(glyph)) {
        const decoded = decodeCGlyph(glyph);
        if (decoded) return decoded;
    }

    return { ch: '*', color: CLR_WHITE, attr: 0 };
}
