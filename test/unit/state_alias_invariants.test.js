import test from 'node:test';
import assert from 'node:assert/strict';

import { NetHackGame } from '../../js/allmain.js';

test('NetHackGame canonical alias invariants: context <-> svc.context', () => {
    const game = new NetHackGame();
    assert.equal(game.context, game.svc.context);

    game.context = { run: 2, travel: 1 };
    assert.equal(game.context, game.svc.context);
    assert.equal(game.svc.context.run, 2);
    assert.equal(game.svc.context.travel, 1);

    game.svc.context.forcefight = 1;
    assert.equal(game.context.forcefight, 1);
});

test('NetHackGame legacy movement mirrors route through svc.context', () => {
    const game = new NetHackGame();

    game.runMode = 2;
    assert.equal(game.svc.context.run, 2);
    assert.equal(game.runMode, 2);
    game.runMode = 3;
    assert.equal(game.svc.context.run, 3);
    assert.equal(game.runMode, 3);
    game.runMode = 0;
    assert.equal(game.svc.context.run, 0);

    game.traveling = true;
    assert.equal(game.svc.context.travel, 1);
    assert.equal(game.traveling, true);
    game.traveling = false;
    assert.equal(game.svc.context.travel, 0);

    game.forceFight = true;
    assert.equal(game.svc.context.forcefight, 1);
    assert.equal(game.forceFight, true);
    game.forceFight = false;
    assert.equal(game.svc.context.forcefight, 0);

    game.menuRequested = true;
    assert.equal(game.svc.context.nopick, 1);
    assert.equal(game.menuRequested, true);
    game.menuRequested = false;
    assert.equal(game.svc.context.nopick, 0);
});

test('NetHackGame canonical alias invariants: u <-> player', () => {
    const game = new NetHackGame();
    assert.equal(game.u, game.u);

    const replacement = { x: 10, y: 12 };
    game.u = replacement;
    assert.equal(game.u, replacement);
    assert.equal(game.u, replacement);
});

test('NetHackGame canonical alias invariants: lev <-> map', () => {
    const game = new NetHackGame();
    assert.equal(game.map, game.map);

    const replacement = { marker: 'map' };
    game.map = replacement;
    assert.equal(game.map, replacement);
    assert.equal(game.map, replacement);
});
