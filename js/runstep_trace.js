import { envFlagTruth } from './runtime_env.js';
import { pushRngLogEntry } from './rng.js';

export function isRunstepEventEnabled() {
    return envFlagTruth('WEBHACK_EVENT_RUNSTEP');
}

export function emitRunstepEvent(game, keyarg, path, cmdOverride = null, opts = {}) {
    if (!isRunstepEventEnabled()) return;
    const ctx = game?.context || {};
    const p = game?.u || game?.player || {};
    const ux = Number.isFinite(Number(p?.x)) ? Number(p.x) : Number(p?.ux || 0);
    const uy = Number.isFinite(Number(p?.y)) ? Number(p.y) : Number(p?.uy || 0);
    const cmd = (cmdOverride == null) ? (game?.cmdKey | 0) : (cmdOverride | 0);
    const cc = (Number.isFinite(Number(opts?.commandCount)) ? (opts?.commandCount | 0) : (game?.commandCount | 0));

    pushRngLogEntry(
        `^runstep[path=${path} keyarg=${keyarg | 0} cmd=${cmd} cc=${cc} moves=${(game?.moves | 0)} multi=${(game?.multi | 0)} run=${(ctx?.run | 0)} mv=${ctx?.mv ? 1 : 0} move=1 occ=${game?.occupation ? 1 : 0} umoved=${p?.umoved ? 1 : 0} ux=${ux | 0} uy=${uy | 0}]`
    );
}
