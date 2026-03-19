#!/usr/bin/env node
// cell-trace: Trace which code paths write to a specific display cell.
//
// Monkey-patches HeadlessDisplay.setCell to log all writes to the target
// cell during session replay. Shows the call stack, step number, and
// character transition for each write.
//
// Usage:
//   node scripts/cell-trace.mjs <session-path> --row R --col C [--step N] [--char CH]
//
// Examples:
//   node scripts/cell-trace.mjs test/comparison/sessions/seed032_manual_direct.session.json --row 12 --col 8
//   node scripts/cell-trace.mjs test/comparison/sessions/seed032_manual_direct.session.json --row 12 --col 8 --step 17
//   node scripts/cell-trace.mjs test/comparison/sessions/seed032_manual_direct.session.json --row 12 --col 8 --char +

import { replaySession } from '../js/replay_core.js';
import { prepareReplayArgs, getSessionGameplaySteps } from '../js/replay_compare.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function main() {
    const args = process.argv.slice(2);
    const sessionPath = args.find(a => !a.startsWith('--'));
    const rowIdx = args.indexOf('--row');
    const colIdx = args.indexOf('--col');
    const stepIdx = args.indexOf('--step');
    const charIdx = args.indexOf('--char');

    const targetRow = rowIdx >= 0 ? Number(args[rowIdx + 1]) : null;
    const targetCol = colIdx >= 0 ? Number(args[colIdx + 1]) : null;
    const targetStep = stepIdx >= 0 ? Number(args[stepIdx + 1]) : null;
    const targetChar = charIdx >= 0 ? args[charIdx + 1] : null;

    if (!sessionPath || targetRow === null || targetCol === null) {
        console.error('Usage: node scripts/cell-trace.mjs <session-path> --row R --col C [--step N] [--char CH]');
        process.exit(1);
    }

    const session = require(sessionPath.startsWith('/') ? sessionPath : `${process.cwd()}/${sessionPath}`);
    const replayArgs = prepareReplayArgs(session.seed, session, { captureScreens: true });
    const gameplaySteps = getSessionGameplaySteps(session);

    const writes = [];
    let patchApplied = false;

    console.log(`Replaying ${sessionPath.split('/').pop()}...`);
    console.log(`Tracing cell (col=${targetCol}, row=${targetRow})${targetStep !== null ? ` at step ${targetStep}` : ''}${targetChar ? ` char='${targetChar}'` : ''}\n`);

    const result = await replaySession(replayArgs.seed, {
        ...replayArgs.opts,
        captureScreens: true,
        onKey({ index, game }) {
            if (!patchApplied && game.display) {
                patchApplied = true;
                const display = game.display;
                const origSetCell = display.setCell.bind(display);
                display.setCell = function(col, row, ch, color, attr) {
                    if (row === targetRow && col === targetCol) {
                        const prevCh = display.grid[row]?.[col] || ' ';
                        const prevColor = display.colors[row]?.[col];
                        const step = (game.lev || game.map)?._replayStepIndex;

                        // Filter by step if specified
                        if (targetStep !== null && step !== targetStep) {
                            return origSetCell(col, row, ch, color, attr);
                        }
                        // Filter by char if specified
                        if (targetChar !== null && ch !== targetChar) {
                            return origSetCell(col, row, ch, color, attr);
                        }

                        // Capture stack trace (skip setCell and the monkey-patch frame)
                        const stack = new Error().stack?.split('\n').slice(2, 7)
                            .map(l => l.trim())
                            .filter(l => !l.includes('node:internal'))
                            || [];

                        // Identify the immediate caller
                        const callerLine = stack[0] || '';
                        let caller = 'unknown';
                        const atMatch = callerLine.match(/at (\S+)/);
                        if (atMatch) caller = atMatch[1];

                        // Identify the source file
                        const fileMatch = callerLine.match(/\/js\/(\S+\.js)/);
                        const sourceFile = fileMatch ? fileMatch[1] : '';

                        const changed = ch !== prevCh;
                        writes.push({
                            step,
                            prevCh,
                            newCh: ch,
                            prevColor,
                            newColor: color,
                            changed,
                            caller,
                            sourceFile,
                            stack: stack.slice(0, 4),
                            running: !!game.running,
                        });
                    }
                    return origSetCell(col, row, ch, color, attr);
                };
            }
        }
    }, replayArgs.keys);

    // Output results
    console.log(`${'='.repeat(70)}`);
    console.log(`Write history for cell (col=${targetCol}, row=${targetRow}):`);
    console.log(`${'='.repeat(70)}\n`);

    if (writes.length === 0) {
        console.log('  No writes to this cell were recorded.');
        console.log('  (The cell may have been set during startup before the monkey-patch was applied.)');

        // Check the final value
        const jsStep = targetStep !== null ? targetStep + 1 : result.steps.length - 1;
        const ansiLines = result.steps[jsStep]?.screen?.split('\n') || [];
        const plainLine = (ansiLines[targetRow] || '').replace(/\x1b\[[^m]*m/g, '');
        const cellChar = plainLine[targetCol] || ' ';
        console.log(`\n  Final value at capture: '${cellChar}'`);
    } else {
        // Group by step for readability
        let currentStep = null;
        const colorName = (c) => {
            const names = ['black','red','green','brown','blue','magenta','cyan','gray',
                           'dark-gray','orange','bright-green','yellow','bright-blue',
                           'bright-magenta','bright-cyan','white'];
            return names[c] || `color${c}`;
        };

        for (const w of writes) {
            if (w.step !== currentStep) {
                currentStep = w.step;
                const key = currentStep !== null && currentStep < gameplaySteps.length
                    ? gameplaySteps[currentStep]?.key : null;
                console.log(`--- Step ${currentStep ?? '?'}${key ? ` key=${JSON.stringify(key)}` : ''} ---`);
            }

            const changeMarker = w.changed ? '→' : '=';
            const runningTag = w.running ? ' [running]' : '';
            console.log(`  '${w.prevCh}' ${changeMarker} '${w.newCh}' (${colorName(w.newColor)})${runningTag}`);
            console.log(`    via ${w.caller} (${w.sourceFile})`);

            // Show abbreviated stack
            for (const frame of w.stack.slice(1, 3)) {
                const shortFrame = frame
                    .replace(/file:\/\/\/.*\/js\//, '')
                    .replace(/\)$/, '')
                    .replace(/at /, '← ');
                console.log(`    ${shortFrame}`);
            }
        }
    }

    // Compare with C session
    console.log(`\n${'='.repeat(70)}`);
    console.log('C session comparison:');
    console.log(`${'='.repeat(70)}\n`);

    const checkStep = targetStep !== null ? targetStep : writes.length > 0 ? writes[writes.length - 1].step : 0;
    if (checkStep !== null && checkStep < gameplaySteps.length) {
        const cScreenLines = (gameplaySteps[checkStep]?.screen || '').split('\n');
        const cLine = (cScreenLines[targetRow] || '').replace(/\x1b\[[^m]*m/g, '').replace(/[\x0e\x0f]/g, '');
        const cChar = cLine[targetCol] || ' ';

        const jsStep = checkStep + 1;
        const jsScreenLines = (result.steps[jsStep]?.screen || '').split('\n');
        const jsLine = (jsScreenLines[targetRow] || '').replace(/\x1b\[[^m]*m/g, '');
        const jsChar = jsLine[targetCol] || ' ';

        console.log(`  At step ${checkStep}:`);
        console.log(`    JS cell: '${jsChar}'`);
        console.log(`    C  cell: '${cChar}'`);
        if (jsChar !== cChar) {
            console.log(`    → MISMATCH: JS shows '${jsChar}' but C shows '${cChar}'`);
        } else {
            console.log(`    → Match`);
        }
    }

    console.log(`\nTotal writes recorded: ${writes.length} (${writes.filter(w => w.changed).length} changes, ${writes.filter(w => !w.changed).length} no-ops)`);
}

main().catch(e => { console.error(e); process.exit(1); });
