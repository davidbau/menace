# Skill: Area Parity Sweep

## When to apply
When you have identified and fixed a specific parity gap (missing check, wrong flag,
duplicate implementation), immediately generalize and sweep the surrounding area for
all similar gaps before moving on.

## Principle
**Fix the class of problem, not just the instance.**

A single discovered parity bug is evidence of a pattern. After understanding the root
cause, sweep the entire function/file/area for all instances of the same pattern.
This prevents:
- Rediscovering the same problem type in future sessions
- Fixing bugs one at a time when batch-fixing is more efficient
- Leaving adjacent parity gaps that cause RNG divergences at different game points

## Process

1. **Fix the specific bug** — implement the concrete fix, test, verify no regression.

2. **Identify the pattern** — ask: what class of problem is this?
   - Missing C condition/check in JS?
   - Duplicate implementations that diverge?
   - Missing RNG-consuming code path?
   - Wrong flag/constant value?

3. **Sweep the area** — systematically check for all instances of the same pattern:
   - Same function: are there other missing conditions?
   - Same file: are there other functions with similar gaps?
   - Related files: do related C functions have the same issue?

4. **Fix all instances at once** — batch the fixes into one commit with clear
   documentation of what was found and fixed.

5. **Test the batch** — verify no regressions from the combined fix.

## Examples

### Example 1: mon_allowflags gaps
Found: JS missing `is_vampshifter → NOGARLIC` check.
Sweep: Compared ALL conditions in C's `mon_allowflags` with JS's.
Fixed: vampshifter, passes_bars engulfer guard, Conflict (noted incomplete),
       ALLOW_DIG (found already implemented by other agent — removed duplicate).
Result: One commit fixing the entire function instead of 4 separate commits.

### Example 2: mfndpos differences
Found: JS missing garlic/boulder info marking.
Sweep: Agent compared ALL mfndpos logic line by line.
Fixed: garlic marking, boulder marking, trap logic (fixed_tele_trap + else-if),
       onscary displacement, ALLOW_SSM marking, ALLOW_MDISP clearing, mm_aggression.
Result: 4 commits covering all identified differences in one session.

### Example 3: exercise() duplication
Found: Two implementations of exercise() in attrib.js and attrib_exercise.js.
Sweep: Checked for other duplicate function implementations.
Fixed: Unified to single implementation, removed dead code.
Result: Should have also searched for other C functions with multiple JS
        implementations.

## Anti-patterns
- Fixing one condition in a function and moving on without checking the rest
- Discovering a duplicate implementation and only removing one instance
- Finding a missing RNG call in one code path without checking sibling paths
- Treating each divergence as a unique problem instead of recognizing patterns

## Integration with debugging
When investigating a divergence:
1. First, find the specific root cause (which code path, which function)
2. Fix that specific issue
3. Before committing, apply Area Parity Sweep to the surrounding code
4. Commit the batch fix with clear documentation
