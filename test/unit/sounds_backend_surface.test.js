import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  dochat,
  dotalk,
  add_sound_mapping,
  release_sound_mappings,
  play_sound_for_message,
  sound_matches_message,
  soundlib_id_from_opt,
  choose_soundlib,
  activate_chosen_soundlib,
  get_sound_effect_filename,
  nosound_init_nhsound,
  nosound_soundeffect,
} from '../../js/sounds.js';

describe('sounds backend compatibility surface', () => {
  it('dochat aliases dotalk behavior for basic swallowed case', async () => {
    const game = {
      player: { uswallow: 1, strangled: 0 },
      map: {},
      display: { putstr_message: async () => {} },
    };
    const a = await dotalk(game);
    const b = await dochat(game);
    assert.strictEqual(a, 0);
    assert.strictEqual(b, 0);
  });

  it('sound mapping lifecycle and message matching work', () => {
    const played = [];
    const game = { playSound: (name) => played.push(name) };
    release_sound_mappings();
    add_sound_mapping('hello', 'greeting');
    assert.strictEqual(sound_matches_message('Hello there', 'hello'), true);
    assert.strictEqual(play_sound_for_message('hello hero', game), 1);
    assert.deepStrictEqual(played, ['greeting']);
    release_sound_mappings();
  });

  it('soundlib selection and nosound hooks behave deterministically', () => {
    assert.strictEqual(soundlib_id_from_opt('nosound'), 0);
    choose_soundlib('nosound');
    assert.strictEqual(activate_chosen_soundlib(), 'nosound');
    assert.strictEqual(get_sound_effect_filename('zap_miss'), 'sounds/zap_miss.ogg');
    assert.strictEqual(nosound_init_nhsound(), 1);
    assert.strictEqual(nosound_soundeffect('zap'), 0);
  });
});

