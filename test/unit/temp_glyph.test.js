import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mons } from '../../js/monsters.js';
import { DAGGER, objectData } from '../../js/objects.js';
import {
    S_arrow_trap,
    S_brdnladder,
    S_digbeam,
    S_expl_br,
    S_expl_tl,
    S_goodpos,
    S_grave,
    S_ndoor,
    S_stone,
    S_trwall,
    S_vbeam,
    S_vwall,
    defsyms,
} from '../../js/symbols.js';
import {
    MAXTCHARS,
    WARNCOUNT,
    def_warnsyms,
} from '../../js/const.js';
import { tempGlyphToCell } from '../../js/temp_glyph.js';

const NUM_ZAP = 8;
const MAXEXPCHARS = (S_expl_br - S_expl_tl) + 1;
const WALL_VARIANT_COUNT = (S_trwall - S_vwall) + 1;
const CMAP_A_COUNT = (S_brdnladder - S_ndoor) + 1;
const CMAP_B_COUNT = S_arrow_trap + MAXTCHARS - S_grave;
const CMAP_C_COUNT = (S_goodpos - S_digbeam) + 1;

function glyphOffsets() {
    const NUMMONS = mons.length;
    const NUM_OBJECTS = objectData.length;

    const GLYPH_MON_OFF = 0;
    const GLYPH_MON_MALE_OFF = GLYPH_MON_OFF;
    const GLYPH_MON_FEM_OFF = NUMMONS + GLYPH_MON_MALE_OFF;
    const GLYPH_PET_MALE_OFF = NUMMONS + GLYPH_MON_FEM_OFF;
    const GLYPH_PET_FEM_OFF = NUMMONS + GLYPH_PET_MALE_OFF;
    const GLYPH_INVIS_OFF = NUMMONS + GLYPH_PET_FEM_OFF;
    const GLYPH_DETECT_MALE_OFF = 1 + GLYPH_INVIS_OFF;
    const GLYPH_DETECT_FEM_OFF = NUMMONS + GLYPH_DETECT_MALE_OFF;
    const GLYPH_BODY_OFF = NUMMONS + GLYPH_DETECT_FEM_OFF;
    const GLYPH_RIDDEN_MALE_OFF = NUMMONS + GLYPH_BODY_OFF;
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
    const GLYPH_WARNING_OFF = (MAXEXPCHARS * 7) + GLYPH_EXPLODE_OFF;
    const GLYPH_STATUE_MALE_OFF = WARNCOUNT + GLYPH_WARNING_OFF;
    const GLYPH_STATUE_FEM_OFF = NUMMONS + GLYPH_STATUE_MALE_OFF;
    const GLYPH_OBJ_PILETOP_OFF = NUMMONS + GLYPH_STATUE_FEM_OFF;
    const GLYPH_BODY_PILETOP_OFF = NUM_OBJECTS + GLYPH_OBJ_PILETOP_OFF;
    const GLYPH_STATUE_MALE_PILETOP_OFF = NUMMONS + GLYPH_BODY_PILETOP_OFF;
    const GLYPH_STATUE_FEM_PILETOP_OFF = NUMMONS + GLYPH_STATUE_MALE_PILETOP_OFF;
    const GLYPH_UNEXPLORED_OFF = NUMMONS + GLYPH_STATUE_FEM_PILETOP_OFF;
    const GLYPH_NOTHING_OFF = GLYPH_UNEXPLORED_OFF + 1;

    return {
        GLYPH_OBJ_OFF,
        GLYPH_CMAP_STONE_OFF,
        GLYPH_ZAP_OFF,
        GLYPH_WARNING_OFF,
        GLYPH_NOTHING_OFF,
    };
}

describe('temp_glyph numeric decoding', () => {
    it('decodes object glyph IDs via GLYPH_OBJ_OFF', () => {
        const G = glyphOffsets();
        const cell = tempGlyphToCell(G.GLYPH_OBJ_OFF + DAGGER);
        assert.strictEqual(cell.ch, objectData[DAGGER].symbol[0]);
        assert.strictEqual(cell.color, objectData[DAGGER].color);
    });

    it('decodes cmap stone and zap glyph IDs to defsyms', () => {
        const G = glyphOffsets();
        const stone = tempGlyphToCell(G.GLYPH_CMAP_STONE_OFF);
        assert.strictEqual(stone.ch, defsyms[S_stone].ch);
        const zap = tempGlyphToCell(G.GLYPH_ZAP_OFF);
        assert.strictEqual(zap.ch, defsyms[S_vbeam].ch);
    });

    it('decodes warning glyph IDs to warning symbols', () => {
        const G = glyphOffsets();
        const cell = tempGlyphToCell(G.GLYPH_WARNING_OFF);
        assert.strictEqual(cell.ch, def_warnsyms[0].ch);
        assert.strictEqual(cell.color, def_warnsyms[0].color);
    });

    it('maps GLYPH_NOTHING to a blank cell', () => {
        const G = glyphOffsets();
        const cell = tempGlyphToCell(G.GLYPH_NOTHING_OFF);
        assert.strictEqual(cell.ch, ' ');
    });

    it('falls back to default marker for unknown numeric values', () => {
        const G = glyphOffsets();
        const cell = tempGlyphToCell(G.GLYPH_NOTHING_OFF + 5000);
        assert.strictEqual(cell.ch, '*');
    });
});
