---
name: long-running-task
description: Use this skill when creating or running any batch operation, bulk reprocessing, or automated task that takes more than a couple minutes. Provides a disciplined methodology for structuring long tasks so they give early feedback, survive interruption, and can be resumed without repeating work.
---

# Long-Running Task

## Philosophy

Long tasks are a risky use of time. A broken setup can burn through hundreds
of items before anyone notices. An interrupted task that can't resume wastes
all the work done so far. An opaque task that produces no output until the
end gives no opportunity to catch problems early.

The core principle: **problems in long tasks should be detectable within
the first few items, not after hundreds.** Structure every long task for
early visibility, interruptibility, and resumability.

## When To Use

- Any batch operation over more than ~20 items
- Any operation expected to take more than 2 minutes
- Examples: rerecording C sessions, bulk test runs, file migrations,
  code transformations, data processing pipelines

## The Protocol

### 1. Run a canary FIRST

Before launching the full batch, run 1-2 items manually and **inspect the
actual output**, not just the exit code.

Pick two canaries:
- One item you expect to **change** — verify it changed in the right way
- One item you expect to be **unchanged** — verify it's identical (or only
  has benign diffs like timestamps)

```bash
# Example: rerecording sessions after a C binary change

# Canary 1: a session known to be affected by the fix
python3 rerecord.py sessions/seed032_manual_direct.session.json
git diff -- sessions/seed032_manual_direct.session.json
# INSPECT: are the screen diffs in the expected direction?
# (e.g., more content visible, not less; messages appearing, not disappearing)

# Canary 2: a short session that shouldn't be affected
python3 rerecord.py sessions/interface_chargen.session.json
git diff -- sessions/interface_chargen.session.json
# INSPECT: only recorded_with/timestamp should differ, not screens
```

**What "wrong" looks like:**
- Exit code 0 but output file is empty or truncated
- Screens changed in unexpected ways (content disappeared, garbled output)
- Unaffected items showing large diffs (suggests a binary or env problem)
- Item takes 10x longer than expected (suggests a hang or resource issue)

Only proceed to the full batch after both canaries look correct.

### 2. Write a proper script

Don't run batch operations as one-liners. Write a named script in `scripts/`
that someone can read, re-run, and understand weeks later.

The script must provide:

**Per-item progress to stdout** (so it's visible in real time):
```bash
echo "[$DONE/$TOTAL] $BASENAME ... OK"        # or FAILED or SKIPPED
```

**A summary at the end:**
```bash
echo "=== Done ==="
echo "  Recorded: $RECORDED / Skipped: $SKIPPED / Failed: $FAILED"
```

**A machine-readable log file** (for post-hoc analysis and selective re-runs):
```bash
# Append one line per item to a JSONL results file
echo "{\"item\":\"$BASENAME\",\"status\":\"ok\",\"duration_s\":$ELAPSED}" \
  >> "$RESULTS_FILE"
```

### 3. Make it resumable

Each re-run should skip already-completed work. Common patterns:

```bash
# Pattern A: mtime comparison (skip if output is newer than input/binary)
SESSION_MTIME=$(stat -c %Y "$SESSION")
if [[ $SESSION_MTIME -gt $BINARY_MTIME ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
fi

# Pattern B: done-marker file
if [[ -f "${SESSION}.done" ]]; then continue; fi
# ... process ...
touch "${SESSION}.done"

# Pattern C: manifest (check JSONL log for already-completed items)
if grep -q "\"$BASENAME\"" "$RESULTS_FILE" 2>/dev/null; then continue; fi
```

### 4. Make it interruptible

- Write to the final output file only after the item is fully complete
  (use a temp file + `mv`, not direct writes to the target)
- Clean up resources (tmux sessions, temp dirs) in a trap handler:
  ```bash
  cleanup() {
      [[ -n "${TMUX_SESSION:-}" ]] && tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
      [[ -d "${TMPDIR:-}" ]] && rm -rf "$TMPDIR"
  }
  trap cleanup EXIT INT TERM
  ```
- Provide `--stop-on-failure` for early abort vs continue-on-error

### 5. Support selective re-runs

Accept filters so failures can be targeted without re-running everything:
```bash
bash scripts/batch_process.sh --only seed032      # one specific item
bash scripts/batch_process.sh --from 200           # resume from item 200
bash scripts/batch_process.sh --failed             # re-run only failures
bash scripts/batch_process.sh --grep "covmax"      # items matching pattern
```

## Running From Claude Code

### Launching

Use the Bash tool with `run_in_background: true`. **Never pipe through
`head` or `tail`** — this sends SIGPIPE and silently kills the process
after the pipe fills:

```bash
# WRONG — kills the process after 20 lines:
bash scripts/batch_process.sh 2>&1 | head -20

# RIGHT — run directly, full output streams to the task output file:
bash scripts/batch_process.sh
```

### Checking progress

Use `TaskOutput` with `block: false` to see current output without waiting
for completion. Or read the script's log file directly:

```bash
tail -5 tmp/batch_results.log
wc -l tmp/batch_results.jsonl    # how many items completed
grep FAILED tmp/batch_results.log  # any failures?
```

### Timeout awareness

The Bash tool has a maximum timeout of 600 seconds (10 minutes). For tasks
longer than this, `run_in_background: true` is required. The task continues
running and you are notified on completion.

### While waiting

Don't block on a long-running background task. Work on other things:
- Review code, write tests, fix bugs in unrelated areas
- Prepare the verification plan for when the batch completes
- Write documentation or commit completed work

## Common Pitfalls

### SIGPIPE from pipe filters

When the Bash tool runs `command | head -N` in the background, `head`
exits after N lines and closes the pipe. The command receives SIGPIPE
and terminates. The task reports "completed" with exit code 0 but only
a fraction of items were processed. This is the single most common
failure mode for long-running tasks in Claude Code.

### Unflushed side files

Progress logs written from Python or other buffered languages appear
empty for minutes while output sits in memory. The fix is line-buffering
— flush after every newline:

```python
f = open("log.txt", "w", buffering=1)                  # line-buffered (sufficient)
print(f"[{i}/{total}] {name} ... OK", flush=True)      # alternative: explicit flush per print
```

Bash `echo` is line-buffered by default, so bash scripts don't have this
problem for stdout — but output redirected through pipes may buffer in
larger blocks (use `stdbuf -oL` if needed).

### Parallelism introducing nondeterminism

Processes that depend on timing (tmux screen captures, sleep-and-poll
patterns, shared file locks) produce different results under CPU
contention. Run these sequentially unless parallelism has been explicitly
validated.

### Silent partial completion

After interruptions and restarts, items exist in three states: old,
partially processed, or fresh. Without a manifest tracking what was done,
you can't tell which is which. The JSONL results file solves this.

### Trusting exit codes over output

"506 succeeded, 0 failed" doesn't mean the results are correct. A
rerecording that produces identical output to the old version (when you
expected changes) is a silent failure. Always spot-check:

```bash
git diff --stat -- sessions/                     # did anything change?
git diff -- sessions/seed032_manual_direct.session.json | head -40  # right changes?
```

For session rerecording specifically, verify structural invariants:
- Does the rerecorded session visit the same dungeon levels (dlvl set)?
- Is the step count identical?
- Did the RNG call count stay the same?
- Are screen differences in the expected direction (more content, not less)?

## Checklist

Before launching a long task:

- [ ] Ran canary on 1-2 items and inspected actual output (not just exit code)
- [ ] Script is a named file in scripts/, not a one-liner
- [ ] Per-item progress with `[N/TOTAL]` counter
- [ ] Resumability: re-running skips completed items
- [ ] Not piped through `head`/`tail` or other truncating filters
- [ ] Side files use line-buffered output
- [ ] Plan for post-completion verification (what to spot-check)
