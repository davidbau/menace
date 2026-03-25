---
name: coverage-session
description: Use this skill when designing, recording, or promoting C-grounded parity sessions to maximize code coverage. Covers session lifecycle from concept through recording, parity testing, and promotion.
---

# Coverage Session Design

## When To Use

- Planning a new session to increase code coverage
- Recording a session through the C harness
- Promoting a pending session to the test suite
- Evaluating whether a session concept has good coverage yield

## Core Principle

Coverage is the metric, not session count. A session that exercises 200
new lines is worth more than five sessions that exercise 10 new lines each.
Design sessions for maximum coverage-per-turn.

## Session Lifecycle

### 1. Identify low-coverage code

```bash
npm run coverage:session-parity:report
```

Look for files below 60% coverage. Prioritize files that are large and
have gameplay impact (combat, movement, inventory, traps, spells).

### 2. Design a high-yield session concept

Good session concepts combine multiple systems in one run:
- Potion effects + status interactions + prayer/luck
- Spell casting + inventory management + shop interactions
- Trap encounters + combat + item use
- Deep dungeon exploration + monster variety + death paths

Use wizard mode (`-D`) to teleport to specific levels, wish for items,
and set up conditions that exercise target code paths. Inside knowledge
of game state (monster positions, trap locations, item identities) is
fair game for session design.

### 3. Record through C harness

```bash
python3 test/comparison/c-harness/rerecord.py <session.json>
```

Or for a new session from scratch:
```bash
python3 test/comparison/c-harness/run_session.py \
  --seed <N> --keys "<keystring>" --out <output.json>
```

### 4. Test parity

```bash
node test/comparison/session_test_runner.js --verbose <session.json>
```

Fix any JS divergences. Do not mask mismatches — fix core game logic.

### 5. Check coverage gain

```bash
npm run coverage:session-parity:report
```

Compare before/after. If the session adds less than 50 new lines of
coverage, consider redesigning rather than adding marginal sessions.

### 6. Promote to test suite

Move from `test/comparison/sessions/pending/` to
`test/comparison/sessions/`. Commit with coverage metrics.

## Session Design Patterns

### Reconnaissance-first

Before committing to a long session, do a short reconnaissance run:
1. Wizard-teleport to the target area
2. Explore to understand what's there
3. Note which code paths are exercisable
4. Then design the real session with that knowledge

### Mixed interactions maximize discovery

Don't test one thing per session. Combine:
- Use a potion, then fight while under its effect
- Read a scroll in a shop (triggers shopkeeper reactions)
- Kick a sink (triggers multiple effect branches)
- Pray at an altar with various alignment states

### Wizard mode cheats for setup, not for testing

Use wizard mode to:
- Teleport to specific dungeon levels
- Wish for specific items to test
- Set up preconditions (HP level, inventory state)

Don't use wizard mode to bypass the code you're trying to test.

## Anti-Patterns

- Recording sessions that replay existing coverage without adding new lines
- Sessions over 1000 steps with diminishing returns (split into focused ones)
- Leaving pending sessions unprocessed (fix divergences promptly)
- "Observability campaigns" that don't produce sessions or fix divergences

## Commands Reference

```bash
# Check current coverage
npm run coverage:session-parity:report

# Run all gameplay sessions
scripts/run-and-report.sh

# Run specific session
node test/comparison/session_test_runner.js --verbose <path>

# PES report (instant, no re-run)
node scripts/pes-report.mjs

# Record new session
python3 test/comparison/c-harness/run_session.py --seed N --keys "..." --out file.json

# Re-record existing session
python3 test/comparison/c-harness/rerecord.py <session.json>
```
