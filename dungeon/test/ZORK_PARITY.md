# Zork Parity Session Format

## Overview

A ZORK_PARITY session file records step-by-step parser and game state
from both the Fortran reference binary and the JS engine, enabling
automated comparison to find divergences.

## Format

JSON file with structure:

```json
{
  "format": "zork-parity-v1",
  "source": "fortran" | "js",
  "timestamp": "2026-03-15T...",
  "steps": [
    {
      "move": 1,
      "input": "look",
      "parse": {
        "words": ["LOOK"],
        "act": 42,
        "prsa": 119,
        "prso": 0,
        "prsi": 0,
        "prep1": 0,
        "prep2": 0,
        "prswon": true,
        "vvoc_index": 42,
        "vvoc_entry": [2, 20480, 0],
        "synmch_drive": 119
      },
      "state": {
        "here": 2,
        "winner": 1,
        "moves": 1,
        "score": 0,
        "lit": true,
        "avehic": 0
      },
      "dispatch": {
        "vappli": { "called": true, "verb": 119, "result": true },
        "objact": { "called": false },
        "rappli": { "called": false }
      },
      "output": [
        " This is an open field west of a white house...",
        " There is a small mailbox here."
      ]
    }
  ]
}
```

## Fields per step

### parse — Parser results after SPARSE + SYNMCH

| Field | Description |
|-------|-------------|
| `words` | Lexed tokens (uppercased) |
| `act` | VVOC block index selected by SPARSE |
| `prsa` | Parsed verb action (from SYNMCH unpack) |
| `prso` | Parsed direct object |
| `prsi` | Parsed indirect object |
| `prep1` | Direct object preposition |
| `prep2` | Indirect object preposition |
| `prswon` | Parse succeeded |
| `vvoc_index` | Raw index into VVOC array |
| `vvoc_entry` | The VVOC syntax block (length + entries) |
| `synmch_drive` | The verb action SYNMCH resolved to |

### state — Game state after command execution

| Field | Description |
|-------|-------------|
| `here` | Current room number |
| `winner` | Current actor (1=player) |
| `moves` | Move counter |
| `score` | Current score |
| `lit` | Room is lit |
| `avehic` | Adventurer's vehicle (0=none) |

### dispatch — Which handlers were called

| Field | Description |
|-------|-------------|
| `vappli` | Verb handler: verb number and result |
| `objact` | Object action handler: called and result |
| `rappli` | Room action handler: called and result |

### output — Lines printed during this step

Array of strings exactly as printed by rspeak/output.

## Recording Tools

### Fortran: Instrumented binary

Patch `parser.f` to write JSON trace lines to stderr after each
SPARSE/SYNMCH call, and `game.f` to write state/dispatch/output.

Build with: `make -f Makefile.trace`

Run: `echo "look\nopen mailbox\nquit\ny" | ./dungeon_trace 2>trace.jsonl`

### JS: Instrumented engine

Add trace hooks to parser.js (after synmch), game.js (after dispatch),
and support.js (rspeak output capture).

Run: `node dungeon/test/record-session.mjs < input.txt > session.json`

### Comparison tool

`node dungeon/test/compare-sessions.mjs fortran.json js.json`

Outputs per-step diff highlighting first divergence in parse results,
state, or output.

## Key debugging scenarios

1. **Verb lookup**: SPARSE finds word → VVOC index → SYNMCH → prsa
2. **Object resolution**: SPARSE finds word → OVOC index → GETOBJ → prso
3. **Syntax matching**: SYNMCH tries each syntax entry in the VVOC block
4. **Handler dispatch**: vappli/objact/rappli selection and return values
