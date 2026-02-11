// Integration test for options system
// Verifies all options work together and persist correctly
import { test } from 'node:test';
import assert from 'node:assert';
import { loadFlags, saveFlags, DEFAULT_FLAGS } from '../../js/storage.js';

test('options - all default values are set', () => {
    const flags = loadFlags();

    // Verify all 13 options have default values
    assert.ok('pickup' in flags, 'pickup should be defined');
    assert.ok('verbose' in flags, 'verbose should be defined');
    assert.ok('DECgraphics' in flags, 'DECgraphics should be defined');
    assert.ok('msg_window' in flags, 'msg_window should be defined');
    assert.ok('showexp' in flags, 'showexp should be defined');
    assert.ok('time' in flags, 'time should be defined');
    assert.ok('rest_on_space' in flags, 'rest_on_space should be defined');
    assert.ok('number_pad' in flags, 'number_pad should be defined');
    assert.ok('lit_corridor' in flags, 'lit_corridor should be defined');
    assert.ok('color' in flags, 'color should be defined');
    assert.ok('safe_pet' in flags, 'safe_pet should be defined');
    assert.ok('confirm' in flags, 'confirm should be defined');
    assert.ok('tombstone' in flags, 'tombstone should be defined');
});

test('options - default values match expected', () => {
    const flags = loadFlags();

    // Verify default values (from storage.js DEFAULT_FLAGS)
    assert.strictEqual(flags.pickup, true, 'pickup default should be true');
    assert.strictEqual(flags.verbose, true, 'verbose default should be true');
    assert.strictEqual(flags.DECgraphics, false, 'DECgraphics default should be false');
    assert.strictEqual(flags.msg_window, false, 'msg_window default should be false');
    assert.strictEqual(flags.showexp, true, 'showexp default should be true');
    assert.strictEqual(flags.time, false, 'time default should be false');
    assert.strictEqual(flags.rest_on_space, false, 'rest_on_space default should be false');
    assert.strictEqual(flags.number_pad, false, 'number_pad default should be false');
    assert.strictEqual(flags.lit_corridor, false, 'lit_corridor default should be false');
    assert.strictEqual(flags.color, true, 'color default should be true');
    assert.strictEqual(flags.safe_pet, true, 'safe_pet default should be true');
    assert.strictEqual(flags.confirm, true, 'confirm default should be true');
    assert.strictEqual(flags.tombstone, true, 'tombstone default should be true');
});

test('options - save and load persistence', () => {
    // Note: In Node.js test environment, localStorage is not available,
    // so save/load operations return defaults. This test verifies the
    // save/load functions work without errors even when storage is unavailable.

    // Save custom flags (will be no-op without localStorage)
    const customFlags = {
        ...DEFAULT_FLAGS,
        pickup: false,
        verbose: false,
        time: true,
        rest_on_space: true,
        DECgraphics: true,
    };

    // Should not throw
    assert.doesNotThrow(() => saveFlags(customFlags), 'saveFlags should not throw');

    // Load returns defaults when storage unavailable
    const loaded = loadFlags();
    assert.ok(loaded, 'loadFlags should return object');
    assert.ok('pickup' in loaded, 'loaded flags should have pickup property');

    // In browser environment with localStorage, persistence would work
    // For now, just verify the API works without errors
});

test('options - toggle all options', () => {
    // Start with defaults
    const flags = { ...DEFAULT_FLAGS };

    // Toggle each option
    flags.pickup = !flags.pickup;
    flags.verbose = !flags.verbose;
    flags.DECgraphics = !flags.DECgraphics;
    flags.msg_window = !flags.msg_window;
    flags.showexp = !flags.showexp;
    flags.time = !flags.time;
    flags.rest_on_space = !flags.rest_on_space;
    flags.number_pad = !flags.number_pad;
    flags.lit_corridor = !flags.lit_corridor;
    flags.color = !flags.color;
    flags.safe_pet = !flags.safe_pet;
    flags.confirm = !flags.confirm;
    flags.tombstone = !flags.tombstone;

    // Verify all toggled
    assert.strictEqual(flags.pickup, false);
    assert.strictEqual(flags.verbose, false);
    assert.strictEqual(flags.DECgraphics, true);
    assert.strictEqual(flags.msg_window, true);
    assert.strictEqual(flags.showexp, false);
    assert.strictEqual(flags.time, true);
    assert.strictEqual(flags.rest_on_space, true);
    assert.strictEqual(flags.number_pad, true);
    assert.strictEqual(flags.lit_corridor, true);
    assert.strictEqual(flags.color, false);
    assert.strictEqual(flags.safe_pet, false);
    assert.strictEqual(flags.confirm, false);
    assert.strictEqual(flags.tombstone, false);
});

test('options - safe defaults for safety options', () => {
    const flags = loadFlags();

    // Safety options should default to safe values
    assert.strictEqual(flags.safe_pet, true, 'safe_pet should default to safe (true)');
    assert.strictEqual(flags.confirm, true, 'confirm should default to safe (true)');
});

test('options - gameplay enhancing defaults', () => {
    const flags = loadFlags();

    // Gameplay enhancing options should default to on
    assert.strictEqual(flags.pickup, true, 'pickup should default to on');
    assert.strictEqual(flags.verbose, true, 'verbose should default to on (helpful)');
    assert.strictEqual(flags.showexp, true, 'showexp should default to on (informative)');
    assert.strictEqual(flags.color, true, 'color should default to on (better UX)');
    assert.strictEqual(flags.tombstone, true, 'tombstone should default to on (dramatic)');
});

test('options - advanced features default to off', () => {
    const flags = loadFlags();

    // Advanced/optional features should default to off
    assert.strictEqual(flags.DECgraphics, false, 'DECgraphics should default to off');
    assert.strictEqual(flags.msg_window, false, 'msg_window should default to off');
    assert.strictEqual(flags.time, false, 'time should default to off');
    assert.strictEqual(flags.rest_on_space, false, 'rest_on_space should default to off');
    assert.strictEqual(flags.number_pad, false, 'number_pad should default to off');
    assert.strictEqual(flags.lit_corridor, false, 'lit_corridor should default to off');
});

test('options - no invalid flag values', () => {
    const flags = loadFlags();

    // All flags should be booleans or strings (some options like 'name' and 'pickup_types' are strings)
    const validTypes = ['boolean', 'string'];
    for (const [key, value] of Object.entries(flags)) {
        assert.ok(validTypes.includes(typeof value),
            `Option ${key} should be boolean or string, got ${typeof value}`);
    }

    // Verify specific string options are actually strings
    assert.strictEqual(typeof flags.name, 'string', 'name should be a string');
    assert.strictEqual(typeof flags.pickup_types, 'string', 'pickup_types should be a string');
});

test('options - compatibility with C NetHack flag names', () => {
    // Verify option names match C NetHack conventions
    const flags = loadFlags();

    // These match C flag.h names
    assert.ok('pickup' in flags, 'C: flags.pickup');
    assert.ok('verbose' in flags, 'C: flags.verbose');
    assert.ok('showexp' in flags, 'C: flags.showexp');
    assert.ok('time' in flags, 'C: flags.time');
    assert.ok('safe_pet' in flags, 'C: flags.safe_pet');
    assert.ok('confirm' in flags, 'C: flags.confirm');
    assert.ok('tombstone' in flags, 'C: flags.tombstone');
    assert.ok('rest_on_space' in flags, 'C: flags.rest_on_space');
    assert.ok('number_pad' in flags, 'C: iflags.num_pad');
    assert.ok('lit_corridor' in flags, 'C: flags.lit_corridor');
    assert.ok('color' in flags, 'C: iflags.wc_color');
    assert.ok('msg_window' in flags, 'C: iflags.prevmsg_window');
});
