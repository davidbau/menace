# Session Format (V4)

> *"You carefully read the scroll. It describes a unified session format."*

**See also:**
[PARITY_TEST_MATRIX.md](PARITY_TEST_MATRIX.md) (test reference) |
[COLLECTING_SESSIONS.md](COLLECTING_SESSIONS.md) (session collection) |
[TESTING.md](TESTING.md) (testing infrastructure) |
[GATE8_CHECKLIST.md](GATE8_CHECKLIST.md) (migration history)

## Overview

A **session file** is a JSON document that captures reference data from C NetHack
for verifying the JS port. V4 sessions use two authoritative fields for startup
configuration:

1. **`env`** — environment variables (seed, fixed datetime)
2. **`nethackrc`** — NetHack RC file contents (character, flags, wizard mode)

All runtimes (C harness, headless JS, browser JS) use the same startup path:
parse the nethackrc, apply the env vars, and replay the key sequence.

## Key Differences from V3

| Aspect | V3 | V4 |
|--------|-----|-----|
| Startup config | `options` dict | `env` + `nethackrc` |
| Seed storage | `seed` field | `env.NETHACK_SEED` (also `seed` for convenience) |
| Character selection | `options.role/race/gender/align` | nethackrc `OPTIONS=role:...,race:...` |
| Startup steps | Auto-advanced (hidden) | Key-driven (explicit steps) |
| Tutorial | `options.tutorial` | nethackrc `OPTIONS=!tutorial` or omitted for prompt |
| Wizard mode | `options.wizard` | nethackrc `WIZARD=<name>` |
| Version branching | `version === 3` paths | No version branching |

## File Location

Sessions live in:
- `test/comparison/sessions/` — gameplay, chargen, interface, option tests
- `test/comparison/maps/` — wizard-mode map exploration sessions

Naming: `seed<N>_<description>.session.json` (≤56 chars)

## Top-Level Structure

```json
{
  "version": 4,
  "env": {
    "NETHACK_SEED": "42",
    "NETHACK_FIXED_DATETIME": "20000110090000"
  },
  "nethackrc": "OPTIONS=name:Wizard,role:Valkyrie,...\nWIZARD=Wizard\n",
  "seed": 42,
  "source": "c",
  "type": "gameplay",
  "regen": { "mode": "gameplay", "moves": ":hhlhhhh.hhs" },
  "recorded_with": { "menace": "abc123", "nethack_c": "79c688cc6" },
  "steps": [ ... ],
  "checkpoints": { ... }
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | `4` | Format version (always 4) |
| `env` | object | Environment variables for deterministic replay |
| `nethackrc` | string | NetHack RC file contents (may be empty for interactive chargen) |
| `seed` | number | RNG seed (convenience duplicate of `env.NETHACK_SEED`) |
| `source` | `"c"` | Recording source (always C harness) |
| `steps` | array | Keystroke sequence with per-step state |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Session type: `"gameplay"`, `"chargen"`, `"interface"`, `"option_test"` |
| `regen` | object | Re-recording metadata |
| `recorded_with` | object | Git hashes of menace + nethack_c at recording time |
| `checkpoints` | object | Map dump snapshots keyed by `d<dnum>l<dlevel>_<seq>` |

## `env` Dictionary

| Key | Required | Description |
|-----|----------|-------------|
| `NETHACK_SEED` | yes | PRNG seed (string) |
| `NETHACK_FIXED_DATETIME` | yes | Fixed date/time `YYYYMMDDHHMMSS` |

The C harness also passes through diagnostic env vars (`NETHACK_RNGLOG`,
`NETHACK_KEYLOG`, etc.) but these are not stored in the session.

## `nethackrc` Format

Standard NetHack RC file format:

```
OPTIONS=name:Wizard,role:Valkyrie,race:human,gender:female,align:neutral
OPTIONS=!autopickup,symset:DECgraphics,!verbose
OPTIONS=!tutorial
OPTIONS=suppress_alert:3.4.3
WIZARD=Wizard
```

### Character Fields

When present in OPTIONS, these skip interactive chargen:

| Field | Example | Effect |
|-------|---------|--------|
| `name:<name>` | `name:Wizard` | Player name |
| `role:<role>` | `role:Valkyrie` | Role selection |
| `race:<race>` | `race:human` | Race selection |
| `gender:<gender>` | `gender:female` | Gender selection |
| `align:<align>` | `align:neutral` | Alignment selection |

When ALL of name, role, race, gender, align are specified, C's `player_selection()`
skips the interactive menus and no chargen RNG is consumed.

When ANY are omitted, C runs interactive chargen — the session's key sequence
must include the chargen menu selections.

### Game Flags

| Flag | Default | Description |
|------|---------|-------------|
| `!autopickup` | off | Disable autopickup |
| `!verbose` | off | Disable verbose messages |
| `!tutorial` | skip | Skip tutorial prompt |
| `tutorial` | ask | Show tutorial prompt |
| `symset:DECgraphics` | ASCII | Use DECgraphics symbols |
| `time` | off | Show turn counter |
| `color` | on | Enable color |
| `suppress_alert:3.4.3` | n/a | Suppress version alerts |

### Wizard Mode

`WIZARD=<name>` enables debug/wizard mode for the named player.

## `steps` Array

Each step captures the game state AFTER a keystroke is processed:

```json
{
  "key": " ",
  "rng": ["rn2(3)=1 @ foo(bar.c:42)", "^makemon[5@10,12]", ...],
  "screen": "...",
  "cursor": [x, y, visible]
}
```

### Step Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | string\|null | Keystroke (`null` for step 0 = initial screen) |
| `rng` | array | RNG calls and events since previous step |
| `screen` | string | Terminal screen content (ANSI-encoded) |
| `cursor` | `[x, y, vis]` | Cursor position and visibility |

### Step 0: Initial Screen

Step 0 always has `key: null` and captures the screen immediately after
game launch — typically showing the lore text with `--More--`.

### Startup Steps

Steps 1+ include startup keystrokes:
- Space(s) to dismiss `--More--` prompts (lore, welcome)
- `n` to decline tutorial (when `!tutorial` not in nethackrc)
- Chargen selections (role, race, gender, alignment) when character
  fields are omitted from nethackrc

### RNG Log Entries

The `rng` array contains three types of entries:

1. **RNG calls**: `"rn2(10)=7 @ caller(file.c:123)"`
2. **Events**: `"^makemon[5@10,12]"` (prefixed with `^`)
3. **Midlog**: `">func @ caller(file.c:123)"` / `"<func=result ..."` (prefixed with `>` or `<`)

## `regen` Field

Metadata for re-recording the session:

```json
{ "mode": "gameplay", "moves": ":hhlhhhh.hhs" }
```

| Mode | Description |
|------|-------------|
| `gameplay` | Normal gameplay. `moves` is compact key notation |
| `chargen` | Character generation. `selections` + `tutorial` |
| `map-teleport` | Wizard ^V level-teleport. `max_depth` |
| `interface` | Menu/UI testing |
| `option_test` | Option variation testing |
| `manual-direct-live` | Manual play via keylog recording |
| `keylog` | Re-recorded from keylog JSONL |

## `checkpoints` Field

Map dump snapshots at level-generation boundaries:

```json
{
  "d0l1_001": "T~80,0|~80,0|...",
  "d0l2_002": "T~80,0|..."
}
```

Key format: `d<dnum>l<dlevel>_<sequence>`. The value is a compact
mapdump string encoding terrain, flags, hero state, and monster positions.

## Comparison Channels

The test runner compares JS replay against C reference on these channels:

| Channel | Source | Description |
|---------|--------|-------------|
| `rng` | `steps[].rng` | RNG call sequence (normalized, composites filtered) |
| `screen` | `steps[].screen` | Terminal screen text |
| `color` | `steps[].screen` | Terminal color/attribute grid |
| `cursor` | `steps[].cursor` | Cursor position |
| `events` | `steps[].rng` | Event entries (prefixed with `^`) |
| `mapdump` | `checkpoints` | Map terrain/object/monster snapshots |

### Optional Event Types

Some C harness patches add diagnostic events that may not be present in
older session recordings. The comparator filters these when one side
lacks them entirely:

- `^moveamt[...]` — hero movement allocation (patch 028)
- `^fog_everyturn[...]` — fog cloud gas creation check (patch 029)
- `^add_region[...]` — region creation trace (patch 029)
- `^catchup[...]` — monster elapsed-time catchup (patch 031)
