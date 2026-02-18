# Non-Wizard Parity Notes (2026-02-17)

## What was fixed

- `keylog_to_session.py` no longer writes invalid `OPTIONS=symset:ASCII` to `.nethackrc`.
- `keylog_to_session.py` now detects appended keylog files (`seq` reset) and uses the longest monotonic segment.
- `keylog_to_session.py` ready-mode replay now uses only in-moveloop keys and avoids synthetic startup key injection.
- `replay_core.getSessionCharacter()` now supports legacy v1 sessions (`session.character`) instead of only v3 (`session.options`).
- `simulateDungeonInit()`/`initLevelGeneration()` gained wizard-mode-aware behavior:
  - non-wizard dungeon/level chance rolls are consumed;
  - `bigrm` chance (40%) is modeled for DoD.
- `nethack.js` now passes wizard mode into `initLevelGeneration(...)`.
- `u_init.makedog()` no longer calls `peace_minded()` for starting pets (this was adding extra RNG drift).

## Current result

- Startup RNG for `seed7_knight_selfplay_nonwiz.session.json` is now exact:
  - `2878/2878` startup calls match.
- First divergence moved from startup/step0 into deeper gameplay:
  - earlier in this pass: step `109`, `2541/27047` RNG calls matched
  - latest in this pass: step `166`, `3799/27472` RNG calls matched

## Current high-signal mismatch

- Remaining first mismatch is still in pet AI/melee sequencing (`dog_move`/`mattackm` path),
  now after a much longer matching prefix:
  - JS: `rn2(4)=2`
  - C:  `rnd(21)=2`
  - divergence point: step `166`

## Additional fixes in this pass

- `combat.js`: player kill-corpse creation switched to `mkcorpstat(...)` path (closer to C `make_corpse/mkcorpstat` behavior).
- `monmove.js`: pet melee path tightened toward C:
  - multi-attack to-hit handling (`rnd(20 + i)`) and damage ordering;
  - knockback RNG ordering aligned around damage resolution;
  - corpse creation on pet kill uses `mkcorpstat(...)` parity path.
- `monmove.js`: fixed drop-path bug in pet inventory handling:
  - drop path now only drops droppables (not worn, not wielded, not cursed).
- `monmove.js`: avoided in-loop monster-removal mutation drift during `movemon` iteration by deferring physical removal to the existing cleanup pass.

## Additional fixes (later pass)

- `monmove.js`: ported C-style `droppables()` selection for pet inventory management (key/pickaxe/unicorn-horn retention logic).
- `monmove.js`: `dog_invent` drop flow now repeatedly drops `droppables()` candidates (instead of dropping all simple non-cursed items).
- `monmove.js`: added C `nofetch` class gate in pet pickup path (`BALL_CLASS`, `CHAIN_CLASS`, `ROCK_CLASS`).
- `monmove.js`: added `G_NOCORPSE` gate in pet corpse chance roll.
- `monmove.js`: added floor-object corpse stacking helper and routed pet drop/corpse placements through it to avoid duplicate same-cell corpse drift.
- `level_transition.js`: restored missing `ACCESSIBLE` import (fixed `replay_tutorial_prompt` runtime failure).
- `sp_lev.js`: removed unconditional leading-newline strip in `des.map` to preserve blank-line behavior expected by tests.
- `test/unit/u_init.test.js`: corrected STR bound assertion to allow NetHack `18/xx` encoding (`<= 118`).

## Updated result

- Nonwizard parity advanced further:
  - previous checkpoint: first divergence step `352`, `7087/26183` RNG calls matched.
  - current checkpoint: first divergence step `480`, `11114/24667` RNG calls matched.

## Current focused hotspot

- Remaining first mismatch at step `480`:
  - JS: `rn2(12)=9`
  - C:  `rn2(8)=5`
- This indicates an `m_move`/`mfndpos` candidate-count mismatch at that branch (JS effective `cnt=3` vs C `cnt=2`).
- Next pass is to close that final `mfndpos` branch-local condition gap rather than calibrating offsets.
