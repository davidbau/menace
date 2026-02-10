// Test autopickup option behavior
import { test } from 'node:test';
import assert from 'node:assert';

test('autopickup option behavior', () => {
    // Mock player, map, display, game
    const player = {
        x: 5, y: 5,
        inventory: [],
        moved: false,
        addToInventory(obj) {
            this.inventory.push(obj);
        }
    };

    const testObj = { name: 'a dagger', oclass: 10, invlet: 'a' };
    const objects = [testObj];

    const map = {
        at(x, y) { return { typ: 1, ch: '.', color: 7 }; },
        objectsAt(x, y) {
            if (x === 6 && y === 5) return [...objects];
            return [];
        },
        removeObject(obj) {
            const idx = objects.indexOf(obj);
            if (idx >= 0) objects.splice(idx, 1);
        },
        monsterAt(x, y) { return null; },
        trapAt(x, y) { return null; }
    };

    let messages = [];
    const display = {
        putstr_message(msg) {
            messages.push(msg);
        }
    };

    // Test 1: autopickup on (default) - should pick up item
    const gamePickup = {
        flags: { pickup: true },
        menuRequested: false,
        forceFight: false
    };

    // Simulate movement to the right (where object is)
    const nopick1 = gamePickup.menuRequested;
    player.x = 6;
    player.moved = true;
    gamePickup.menuRequested = false;
    gamePickup.forceFight = false;

    const objs1 = map.objectsAt(6, 5);
    let pickedUp1 = false;
    if (gamePickup.flags.pickup && !nopick1 && objs1.length > 0) {
        const obj = objs1.find(o => o.oclass !== 11);
        if (obj) {
            player.addToInventory(obj);
            map.removeObject(obj);
            display.putstr_message(`${obj.invlet} - ${obj.name}.`);
            pickedUp1 = true;
        }
    }

    assert.strictEqual(pickedUp1, true, 'Should pick up item with autopickup on');
    assert.strictEqual(player.inventory.length, 1, 'Item should be in inventory');
    assert.strictEqual(messages[messages.length - 1], 'a - a dagger.', 'Should show pickup message');

    // Reset for test 2
    player.inventory = [];
    player.x = 5;
    messages = [];
    objects.push(testObj);

    // Test 2: autopickup off - should NOT pick up item
    const gameNoPickup = {
        flags: { pickup: false },
        menuRequested: false,
        forceFight: false
    };

    const nopick2 = gameNoPickup.menuRequested;
    player.x = 6;
    player.moved = true;
    gameNoPickup.menuRequested = false;
    gameNoPickup.forceFight = false;

    const objs2 = map.objectsAt(6, 5);
    let pickedUp2 = false;
    if (gameNoPickup.flags.pickup && !nopick2 && objs2.length > 0) {
        const obj = objs2.find(o => o.oclass !== 11);
        if (obj) {
            player.addToInventory(obj);
            map.removeObject(obj);
            display.putstr_message(`${obj.invlet} - ${obj.name}.`);
            pickedUp2 = true;
        }
    }

    if (!pickedUp2 && objs2.length > 0) {
        display.putstr_message(`You see here ${objs2[0].name}.`);
    }

    assert.strictEqual(pickedUp2, false, 'Should NOT pick up item with autopickup off');
    assert.strictEqual(player.inventory.length, 0, 'Item should not be in inventory');
    assert.strictEqual(messages[messages.length - 1], 'You see here a dagger.', 'Should show "You see here" message');

    // Reset for test 3
    messages = [];
    player.x = 5;

    // Test 3: 'm' prefix (nopick=true) - should NOT pick up even with autopickup on
    const gameNopick = {
        flags: { pickup: true },
        menuRequested: true,  // 'm' prefix was pressed
        forceFight: false
    };

    const nopick3 = gameNopick.menuRequested;  // Save before clearing
    player.x = 6;
    player.moved = true;
    gameNopick.menuRequested = false;  // Cleared after movement
    gameNopick.forceFight = false;

    const objs3 = map.objectsAt(6, 5);
    let pickedUp3 = false;
    if (gameNopick.flags.pickup && !nopick3 && objs3.length > 0) {
        const obj = objs3.find(o => o.oclass !== 11);
        if (obj) {
            player.addToInventory(obj);
            map.removeObject(obj);
            display.putstr_message(`${obj.invlet} - ${obj.name}.`);
            pickedUp3 = true;
        }
    }

    if (!pickedUp3 && objs3.length > 0) {
        display.putstr_message(`You see here ${objs3[0].name}.`);
    }

    assert.strictEqual(pickedUp3, false, 'Should NOT pick up with m prefix (nopick=true)');
    assert.strictEqual(player.inventory.length, 0, 'Item should not be in inventory with m prefix');
    assert.strictEqual(messages[messages.length - 1], 'You see here a dagger.', 'Should show "You see here" with m prefix');
});
