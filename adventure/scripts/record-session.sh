#!/bin/bash
# Record a parity test session from the C adventure binary.
# Usage: ./scripts/record-session.sh <input-file> <output-json>
# The input file should contain commands, one per line.
# First line can be "seed <N>" to set deterministic seed.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADVENT="$SCRIPT_DIR/../adventure-c/original/advent"
INPUT="$1"
OUTPUT="$2"

if [ ! -f "$ADVENT" ]; then
    echo "Build advent first: cd adventure-c/original && make advent"
    exit 1
fi
if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <input-file> <output-json>"
    exit 1
fi

# Run advent with the input, capture full output
FULL_OUTPUT=$(cat "$INPUT" | "$ADVENT" -o 2>&1)

# Convert to JSON session format: pairs of {input, output}
node -e "
const fs = require('fs');
const inputs = fs.readFileSync('$INPUT', 'utf8').trim().split('\n');
const fullOutput = process.argv[1];

// Split output by '> ' prompts
const parts = fullOutput.split(/\n> /);
const steps = [];

// First part is the welcome + first prompt
steps.push({ input: '', output: parts[0].replace(/\n> $/, '').trim() });

// Subsequent parts: input line was consumed, output follows
for (let i = 1; i < parts.length; i++) {
    const inp = inputs[i - 1] || '';
    // The output for this step is everything after the prompt echo
    const lines = parts[i].split('\n');
    // First line is the echoed input (already consumed by split)
    const output = lines.slice(1).join('\n').trim();
    steps.push({ input: inp, output });
}

fs.writeFileSync('$OUTPUT', JSON.stringify({ steps, seed: null }, null, 2));
console.log('Recorded ' + steps.length + ' steps to $OUTPUT');
" "$FULL_OUTPUT"
