/*
 * rogue_patch.h — Harness overrides for deterministic rogue builds.
 * Injected via -include during compilation of game source files.
 */

#ifndef ROGUE_PATCH_H
#define ROGUE_PATCH_H

/* Override rand/srand with deterministic harness versions.
 * Use __attribute__ to suppress conflicts with stdlib declarations. */
extern int harness_rand(void);
extern void harness_srand(unsigned int seed);

/* Override exit to return control to harness instead of terminating */
extern void harness_exit(int status);

/* Disable crypt.h (macOS doesn't have it) */
#define _XOPEN_CRYPT
#define md_crypt(k, s) ((char*)(k))

#endif /* ROGUE_PATCH_H */
