# Adventure (Colossal Cave) — JS Port

Port of Crowther/Woods Adventure 2.5 (430-point version, 1995) to
JavaScript, running inside the Mazes of Menace shell.

## Directory Structure

```
adventure/
  adventure-c/
    original/     — git submodule: Leprechaun817/open-adventure (C source)
    patched/      — C source with harness patches applied
  js/             — JavaScript port
  patches/        — patches applied to C source for deterministic harness
  scripts/        — build/recording scripts
  test/
    sessions/     — parity test sessions (C output vs JS output)
  README.md       — this file
```

## Building the C version

```bash
cd adventure/adventure-c/original
make advent
```

## Running

From the shell: type `adventure` at the prompt.

## Parity Testing

Sessions are recorded from the C binary and compared against JS output.
Format matches dungeon/ parity tests: each session is a JSON file with
`{input, output}` pairs per turn.

## Source

Based on open-adventure by Eric S. Raymond, forward-ported from the
Crowther/Woods Adventure 2.5 with permission of the original authors.
BSD 2-clause license.
