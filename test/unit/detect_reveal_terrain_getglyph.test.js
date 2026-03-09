import { describe, it } from 'node:test';
import assert from 'node:assert';

import { reveal_terrain_getglyph } from '../../js/detect.js';

describe('detect.reveal_terrain_getglyph', () => {
  function makeMap(tile) {
    return {
      at(x, y) {
        if (x === 2 && y === 3) return tile;
        return null;
      },
    };
  }

  it('returns default glyph for unseen tiles when not full', () => {
    const map = makeMap({ glyph: 777, seenv: 0 });
    const glyph = reveal_terrain_getglyph(2, 3, 0, 123, 0, map);
    assert.strictEqual(glyph, 123);
  });

  it('returns remembered glyph for seen tiles', () => {
    const map = makeMap({ glyph: 777, seenv: 0xff });
    const glyph = reveal_terrain_getglyph(2, 3, 0, 123, 0, map);
    assert.strictEqual(glyph, 777);
  });

  it('returns remembered glyph for full reveal even if unseen', () => {
    const map = makeMap({ glyph: 777, seenv: 0 });
    const glyph = reveal_terrain_getglyph(2, 3, 0, 123, 0x80, map);
    assert.strictEqual(glyph, 777);
  });
});

