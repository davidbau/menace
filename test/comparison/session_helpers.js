// test/comparison/session_helpers.js -- Re-export facade.
//
// Provides a single import point for test files that need replay/comparison
// utilities from multiple modules. No logic lives here — just re-exports.

export {
    compareRng,
    compareGrids,
    compareScreenLines,
    compareScreenAnsi,
} from './comparators.js';

export {
    stripAnsiSequences,
    getSessionScreenLines,
    getSessionScreenAnsiLines,
    normalizeSession,
    loadAllSessions,
} from './session_loader.js';

export {
    HeadlessDisplay,
    replaySession,
} from '../../js/replay_core.js';

export {
    typName,
    parseTypGrid,
    parseSessionTypGrid,
    formatDiffs,
    extractTypGrid,
    generateMapsSequential,
    compareRng as compareRngCore,
    hasStartupBurstInFirstStep,
    getSessionStartup,
    getSessionCharacter,
    getSessionGameplaySteps,
    prepareReplayArgs,
    stripAnsiSequences as stripAnsiSequencesCore,
} from '../../js/replay_compare.js';

export {
    generateMapsWithCoreReplay as generateMapsWithRng,
    generateStartupWithCoreReplay as generateStartupWithRng,
} from '../../js/headless.js';

// ---------------------------------------------------------------------------
// replayGameplaySession(seed, session, opts)
//
// Convenience adapter: calls prepareReplayArgs + replaySession, then groups
// the flat per-key results back into per-step results using stepBoundaries.
// Used by unit tests that compare per-step RNG/screen output.
// ---------------------------------------------------------------------------

import { replaySession as _replaySession } from '../../js/replay_core.js';
import { prepareReplayArgs as _prepareReplayArgs, stripAnsiSequences as _stripAnsi } from '../../js/replay_compare.js';

export async function replayGameplaySession(seed, session, opts = {}) {
    const args = _prepareReplayArgs(seed, session, opts);
    const jsSession = await _replaySession(args.seed, args.opts, args.keys);

    const startup = {
        rng: jsSession.steps[0].rng,
        screen: (jsSession.steps[0].screen || '').split('\n').map(l => _stripAnsi(l)),
        cursor: jsSession.steps[0].cursor,
    };

    const gameplaySteps = jsSession.steps.slice(1);
    const steps = [];
    let keyIdx = 0;
    for (const len of args.stepBoundaries) {
        const stepSlice = gameplaySteps.slice(keyIdx, keyIdx + len);
        const lastStep = stepSlice.length > 0 ? stepSlice[stepSlice.length - 1] : null;
        const screenLines = (lastStep?.screen || '').split('\n');
        steps.push({
            rng: stepSlice.flatMap(k => k.rng),
            rngCalls: stepSlice.reduce((n, k) => n + k.rng.length, 0),
            screen: screenLines.map(l => _stripAnsi(l)),
            cursor: lastStep?.cursor,
        });
        keyIdx += len;
    }

    return { startup, steps, jsSession };
}
