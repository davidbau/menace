import { initRng } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { Player } from '../../js/player.js';

initRng(1);
initLevelGeneration();
const map = await makelevel(1);
wallification(map);
const player = new Player();
player.initRole(11);
if (map.upstair) { player.x = map.upstair.x; player.y = map.upstair.y; }
simulatePostLevelInit(player, map, 1);

console.log('Total monsters:', map.monsters.length);
for (const m of map.monsters) {
    const wander = (m.type && m.type.flags2 || 0) & 0x800000;
    const flags2 = (m.type && m.type.flags2) || 0;
    console.log('  ' + m.name + ' at (' + m.mx + ',' + m.my + ') mlevel=' + m.mlevel
        + ' sleeping=' + m.sleeping + ' speed=' + m.speed + ' tame=' + m.tame
        + ' wander=' + !!wander + ' flags2=0x' + flags2.toString(16)
        + ' mndx=' + m.mndx);
}
