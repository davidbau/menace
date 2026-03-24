/*
 * rogue_patch.h — Harness overrides for deterministic Rogue 3.6 builds.
 * Injected via -include during compilation of game source files.
 * Works on both macOS and Linux.
 *
 * Strategy: override md_* portability functions rather than libc.
 * This avoids conflicts with system headers.
 */

#ifndef ROGUE_PATCH_H
#define ROGUE_PATCH_H

/* Use our config.h for HAVE_* defines (before mdport.h processes them) */
#define HAVE_CONFIG_H 1

/* Override exit() to return control to harness */
extern void harness_exit(int status);
#define exit(s) harness_exit(s)

/* Override rnd() for RNG logging.
 * The game's rnd() is in main.c.  We redirect CALLS to our logging wrapper
 * but must not rename the DEFINITION (that would create a duplicate symbol).
 * Solution: #define rnd to harness_rnd everywhere, then suppress the
 * definition in main.c by also defining HARNESS_SKIP_RND. */
extern int harness_rnd(int range);
#define rnd(x) harness_rnd(x)
/* Keystroke injection: the Makefile's setup target patches md_readchar()
 * in mdport.c to call harness_next_key() when HARNESS is defined. */
extern int harness_next_key(void);

/* Disable score file operations (harness doesn't use them).
 * Can't use function-like macro because rogue.h declares open_score(void). */

#endif /* ROGUE_PATCH_H */
