// Unit tests for .nethackrc parsing and building (Gate 1 of unified session startup)
import { describe, test } from 'node:test';
import assert from 'assert';
import { parseNethackrcFull, buildNethackrc, buildSessionEnv } from '../../js/storage.js';

describe('parseNethackrcFull', () => {

  test('parses character selection from OPTIONS', () => {
    const rc = 'OPTIONS=name:Wizard,role:Wizard,race:human,gender:male,align:neutral';
    const { character } = parseNethackrcFull(rc);
    assert.strictEqual(character.name, 'Wizard');
    assert.strictEqual(character.role, 'Wizard');
    assert.strictEqual(character.race, 'human');
    assert.strictEqual(character.gender, 'male');
    assert.strictEqual(character.align, 'neutral');
  });

  test('parses WIZARD directive', () => {
    const rc = 'OPTIONS=name:Wizard\nWIZARD=Wizard';
    const { wizard } = parseNethackrcFull(rc);
    assert.strictEqual(wizard, true);
  });

  test('WIZARD=other does not enable wizard for different name', () => {
    const rc = 'OPTIONS=name:Player\nWIZARD=Admin';
    const { wizard } = parseNethackrcFull(rc);
    assert.strictEqual(wizard, false);
  });

  test('parses !autopickup', () => {
    const rc = 'OPTIONS=!autopickup';
    const { flags } = parseNethackrcFull(rc);
    assert.strictEqual(flags.pickup, false);
  });

  test('parses !tutorial', () => {
    const rc = 'OPTIONS=!tutorial';
    const { flags } = parseNethackrcFull(rc);
    assert.strictEqual(flags.tutorial, false);
  });

  test('parses DECgraphics', () => {
    const rc = 'OPTIONS=DECgraphics';
    const { flags } = parseNethackrcFull(rc);
    assert.strictEqual(flags.DECgraphics, true);
  });

  test('parses !verbose', () => {
    const rc = 'OPTIONS=!verbose';
    const { flags } = parseNethackrcFull(rc);
    assert.strictEqual(flags.verbose, false);
  });

  test('ignores comments', () => {
    const rc = '# This is a comment\nOPTIONS=name:Test\n# Another comment';
    const { character } = parseNethackrcFull(rc);
    assert.strictEqual(character.name, 'Test');
  });

  test('handles blank lines', () => {
    const rc = '\nOPTIONS=name:Test\n\n';
    const { character } = parseNethackrcFull(rc);
    assert.strictEqual(character.name, 'Test');
  });

  test('all 13 roles parse correctly', () => {
    const roles = ['Archeologist', 'Barbarian', 'Caveman', 'Healer', 'Knight',
                   'Monk', 'Priest', 'Ranger', 'Rogue', 'Samurai', 'Tourist',
                   'Valkyrie', 'Wizard'];
    for (const role of roles) {
      const rc = `OPTIONS=role:${role}`;
      const { character } = parseNethackrcFull(rc);
      assert.strictEqual(character.role, role, `role ${role} should parse`);
    }
  });

  test('full session .nethackrc', () => {
    const rc = [
      'OPTIONS=name:Wizard,role:Wizard,race:human,gender:male,align:neutral',
      'OPTIONS=!autopickup,symset:DECgraphics,!verbose',
      'OPTIONS=!tutorial',
      'WIZARD=Wizard',
    ].join('\n');
    const { flags, character, wizard } = parseNethackrcFull(rc);
    assert.strictEqual(character.name, 'Wizard');
    assert.strictEqual(character.role, 'Wizard');
    assert.strictEqual(character.race, 'human');
    assert.strictEqual(character.gender, 'male');
    assert.strictEqual(character.align, 'neutral');
    assert.strictEqual(wizard, true);
    assert.strictEqual(flags.pickup, false);
    assert.strictEqual(flags.tutorial, false);
  });
});

describe('buildNethackrc', () => {

  test('builds character OPTIONS line', () => {
    const rc = buildNethackrc({
      character: { name: 'Wizard', role: 'Wizard', race: 'human', gender: 'male', align: 'neutral' },
    });
    assert.ok(rc.includes('OPTIONS=name:Wizard,role:Wizard,race:human,gender:male,align:neutral'));
  });

  test('builds WIZARD directive', () => {
    const rc = buildNethackrc({
      character: { name: 'Wizard' },
      wizard: true,
    });
    assert.ok(rc.includes('WIZARD=Wizard'));
  });

  test('builds flag OPTIONS', () => {
    const rc = buildNethackrc({
      flags: { pickup: false, verbose: false, tutorial: false },
    });
    assert.ok(rc.includes('!autopickup') || rc.includes('!pickup'));
    assert.ok(rc.includes('!tutorial'));
  });

  test('round-trips through parse', () => {
    const input = {
      character: { name: 'Wizard', role: 'Wizard', race: 'human', gender: 'male', align: 'neutral' },
      wizard: true,
      flags: { tutorial: false, pickup: false },
    };
    const rc = buildNethackrc(input);
    const parsed = parseNethackrcFull(rc);
    assert.strictEqual(parsed.character.name, 'Wizard');
    assert.strictEqual(parsed.character.role, 'Wizard');
    assert.strictEqual(parsed.character.race, 'human');
    assert.strictEqual(parsed.wizard, true);
    assert.strictEqual(parsed.flags.tutorial, false);
    assert.strictEqual(parsed.flags.pickup, false);
  });
});

describe('buildSessionEnv', () => {

  test('builds seed and datetime', () => {
    const env = buildSessionEnv(1060, '20000110090000');
    assert.strictEqual(env.NETHACK_SEED, '1060');
    assert.strictEqual(env.NETHACK_FIXED_DATETIME, '20000110090000');
  });

  test('omits null fields', () => {
    const env = buildSessionEnv(42, null);
    assert.strictEqual(env.NETHACK_SEED, '42');
    assert.strictEqual(env.NETHACK_FIXED_DATETIME, undefined);
  });
});
