---
name: trace-before-theorize
description: When investigating a bug where C is ground truth, get a concrete trace from the C binary before spending time theorizing from code inspection. Invest in making the trace work — don't theorize around infrastructure obstacles.
---

# Trace Before Theorize

## Philosophy

Code inspection and theory are seductive because they feel productive
without requiring anything to actually run. But they go in circles.
A single concrete measurement from the running system answers questions
that hours of reading code cannot.

When you can't explain a C-vs-JS divergence, **get a trace from C first**.
Don't theorize about what C "must" do — measure what it actually does.

The infrastructure to run the trace will be messy. Build systems break.
NFS locks block installs. Config files are missing. Wizard mode is
disabled. Session replay fails because inventory letters shifted. These
are not reasons to fall back to theorizing — they are the actual work.
Fix them. Each fix makes the next investigation faster.

## When To Use

- Any C-vs-JS parity divergence where you've read the code twice
  and still can't explain the difference
- Any bug where you have a theory but no measurement
- Any time you catch yourself saying "C must do X because..."
  without having verified it

## The Protocol

### 1. Define the concrete question

Not "why is the bugbear peaceful?" but "what is `mpeaceful` at line 1296
of makemon.c, and does it change before makemon returns?"

### 2. Add a trace to the C source

Minimal, targeted, and file-based (not stderr — tmux eats stderr):

```c
/* BISECT TRACE */
{
    static FILE *_tp = NULL;
    static int _tc = 0;
    if (!_tc) { _tc = 1; _tp = fopen("/tmp/trace.log", "w"); }
    if (_tp && gi.in_mklev) {
        fprintf(_tp, "[TRACE] mndx=%d val=%d at (%d,%d)\n",
                mndx, mtmp->mpeaceful, mtmp->mx, mtmp->my);
        fflush(_tp);
    }
}
```

Key details:
- Write to a **hardcoded file path** (not stderr, not env-var-gated)
- Use `fflush()` after every write (the process may crash or be killed)
- Gate on `gi.in_mklev` or similar to limit output to the relevant phase
- Use `static` for the file pointer so it opens once

### 3. Build and install the traced binary

```bash
cd nethack-c/patched/src
rm -f nethack makemon.o
clang -g -I../include -c -o makemon.o makemon.c
clang -o nethack *.o hacklib.a -lncurses -ltinfo ../lib/lua/liblua-5.4.8.a -lm
bash scripts/fix_install.sh
```

If `make install` fails (NFS locks, missing dirs), use `fix_install.sh`.
If `setup.sh` overwrites your trace (it re-clones from upstream), edit
the patched source AFTER setup.sh runs, then rebuild manually.

### 4. Run the actual session

Use `rerecord.py`, not `run_session.py` directly — rerecord handles:
- `clear_runtime_state()` (cleans stale saves that block startup)
- Correct `cwd` (SCRIPT_DIR)
- Proper character/chargen setup

```bash
rm -f /tmp/trace.log
python3 test/comparison/c-harness/rerecord.py \
  test/comparison/sessions/the_session.session.json
cat /tmp/trace.log
```

### 5. Read the trace and answer the question

The trace will either confirm or refute your theory in seconds.
Then you know exactly where to look next — or the answer is obvious.

## Common Infrastructure Obstacles (and fixes)

| Problem | Symptom | Fix |
|---------|---------|-----|
| NFS lock on install dir | `rm: Device or resource busy` on `.nfs*` files | `bash scripts/fix_install.sh` |
| Missing perm/record files | `Cannot open file perm` | `touch $INSTALL/perm $INSTALL/record` |
| Missing Lua data files | `Error opening nhlib.lua` | `cp patched/dat/*.lua $INSTALL/` |
| Missing sysconf | `Unable to open SYSCF_FILE` | `cp patched/sys/unix/sysconf $INSTALL/sysconf` |
| Wizard mode disabled | `Unavailable command 'wizwish'` | `sed -i 's/^WIZARDS=.*/WIZARDS=*/' $INSTALL/sysconf` |
| Stale save files | `Destroy old game?` prompt blocks startup | `rm -f $INSTALL/save/*` or use `rerecord.py` (calls `clear_runtime_state`) |
| setup.sh overwrites trace | Trace code disappears after rebuild | Edit patched source AFTER setup.sh, rebuild with manual `clang` commands |
| Trace file not created | File doesn't appear | Use hardcoded path, not env var. Check binary has trace: `strings nethack \| grep trace` |
| Session replay fails | Wrong RNG count, wrong level | Use `rerecord.py` not `run_session.py` directly |
| Wish-path sessions fail | Quaff sequence produces "silly thing to drink" | Inventory letters depend on chargen; use `rerecord.py` which matches original chargen |

## Anti-patterns

- **Reading code for hours instead of running it**: If you've read
  `peace_minded` three times and still can't explain the result, trace it.
- **Theorizing around infrastructure failures**: "The C harness can't
  replay this session so let me reason about it instead" — no, fix the
  harness.
- **Building infrastructure speculatively**: Don't build a general-purpose
  tracing framework. Add one `fprintf` to answer one question. The
  infrastructure investment is in making the build/install/run cycle work,
  not in the trace itself.
- **Giving up on running the code**: Every obstacle (NFS, sysconf, wizard
  mode, save files) has a concrete fix. Each fix is reusable. The
  accumulated fixes (`fix_install.sh`, `clear_runtime_state`, sysconf
  patching) make every subsequent investigation trivial.

## Example: seed329 bugbear peacefulness

**Question**: Why are 8 monsters peaceful in JS but hostile in C?

**Hours wasted theorizing**: Read `peace_minded` 3 times. Read `set_malign`.
Read `fill_zoo_room`. Read every `mpeaceful=0` assignment in C. Searched
for bulk-hostility code. Deduced from RNG perfection that `peace_minded`
must return the same. Concluded "something after peace_minded flips them"
but couldn't find what.

**Infrastructure investment** (30 minutes):
1. Fixed NFS lock → `fix_install.sh`
2. Fixed missing perm/lua/sysconf files
3. Fixed wizard mode (`WIZARDS=*`)
4. Fixed session replay (use `rerecord.py` not `run_session.py`)
5. Fixed stale saves (`clear_runtime_state`)

**Trace** (2 minutes):
1. Added `fprintf` at `peace_minded` assignment → `mpeaceful=1` for all 8
2. Already knew `fill_zoo_room` COURT check is the only post-creation flip
3. Answer: room is COURT in C, not in JS → `do_mkroom` parity bug

Total: 30 min infrastructure + 2 min trace = answer.
Versus: 3+ hours theorizing = no answer.
