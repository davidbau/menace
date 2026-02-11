#!/usr/bin/env node
/**
 * Simulate Room 2 shrinking in check_room
 */

const XLIM = 4, YLIM = 3, ROWNO = 21, COLNO = 80;

// Room 1 terrain (interior with walls)
const room1_interior = { lx: 35, ly: 6, hx: 45, hy: 14 };
const room1_walls = { lx: 34, ly: 5, hx: 46, hy: 15 };

function isOccupied(x, y) {
    // Check if (x,y) is part of Room 1 (walls or interior)
    return x >= room1_walls.lx && x <= room1_walls.hx &&
           y >= room1_walls.ly && y <= room1_walls.hy;
}

function simulateCheckRoom(lowx, ddx, lowy, ddy) {
    let hix = lowx + ddx;
    let hiy = lowy + ddy;
    const xlim = XLIM;
    const ylim = YLIM;

    console.log(`Initial: lowx=${lowx}, hix=${hix}, lowy=${lowy}, hiy=${hiy}`);
    console.log(`  Room: (${lowx},${lowy})-(${hix},${hiy}), size ${hix-lowx+1}x${hiy-lowy+1}`);

    let iteration = 0;
    for (;;) {
        iteration++;
        console.log(`\nIteration ${iteration}:`);

        // Check zero size
        if (hix <= lowx || hiy <= lowy) {
            console.log('  FAIL: Room shrunk to zero size');
            return null;
        }

        // Scan for conflicts
        let conflict = false;
        console.log(`  Scanning x=[${lowx - xlim},${hix + xlim}], y=[${lowy - ylim},${hiy + ylim}]`);

        for (let x = lowx - xlim; x <= hix + xlim && !conflict; x++) {
            if (x <= 0 || x >= COLNO) continue;
            let y = lowy - ylim;
            let ymax = hiy + ylim;
            if (y < 0) y = 0;
            if (ymax >= ROWNO) ymax = ROWNO - 1;

            for (; y <= ymax; y++) {
                if (isOccupied(x, y)) {
                    console.log(`  Conflict at (${x},${y})`);

                    // Shrink
                    if (x < lowx) {
                        const new_lowx = x + xlim + 1;
                        console.log(`    x < lowx: shrink lowx ${lowx} -> ${new_lowx}`);
                        lowx = new_lowx;
                    } else {
                        const new_hix = x - xlim - 1;
                        console.log(`    x >= lowx: shrink hix ${hix} -> ${new_hix}`);
                        hix = new_hix;
                    }
                    if (y < lowy) {
                        const new_lowy = y + ylim + 1;
                        console.log(`    y < lowy: shrink lowy ${lowy} -> ${new_lowy}`);
                        lowy = new_lowy;
                    } else {
                        const new_hiy = y - ylim - 1;
                        console.log(`    y >= lowy: shrink hiy ${hiy} -> ${new_hiy}`);
                        hiy = new_hiy;
                    }

                    conflict = true;
                    console.log(`  After shrink: lowx=${lowx}, hix=${hix}, lowy=${lowy}, hiy=${hiy}`);
                    break;
                }
            }
        }

        if (!conflict) {
            console.log('  SUCCESS: No conflicts');
            console.log(`  Final room: (${lowx},${lowy})-(${hix},${hiy}), size ${hix-lowx+1}x${hiy-lowy+1}`);
            return { lowx, ddx: hix - lowx, lowy, ddy: hiy - lowy };
        }

        if (iteration > 20) {
            console.log('  ABORT: Too many iterations');
            return null;
        }
    }
}

// Room 2 attempt 1
console.log('=== Room 2 Attempt 1 Shrinking ===\n');
console.log('Room 1 occupies: (' + room1_walls.lx + ',' + room1_walls.ly + ')-(' +
            room1_walls.hx + ',' + room1_walls.hy + ')\n');

const result = simulateCheckRoom(37, 11, 6, 1);
console.log('\n' + (result ? 'PASS' : 'FAIL'));
