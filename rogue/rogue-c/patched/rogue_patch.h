/*
 * rogue_patch.h — Harness patches for Rogue 3.6 session capture.
 *
 * Injected into all game source files via -include rogue_patch.h.
 * Must be included BEFORE any game headers to ensure system headers
 * are processed before we define override macros.
 */

#ifndef ROGUE_PATCH_H
#define ROGUE_PATCH_H

/* ===== System headers first (before any override macros) ===== */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>
#include <stdarg.h>
#include <ctype.h>
#include <errno.h>

/* ===== Forward declarations of harness functions ===== */
void harness_exit(int code);
void harness_log_rand(int val);
int  harness_rand(void);
void harness_srand(unsigned int seed);

/* ===== Forward declarations for pointer-returning functions ===== */
/* On 64-bit ARM, calling a function that returns a pointer without a visible
 * prototype causes the pointer to be truncated to 32 bits (implicit int return).
 * Declare all such functions here so every translation unit sees them. */
/* Forward-declare struct types used by these prototypes */
struct object;

char *prname(char *who, int upper);
char *inv_name(struct object *obj, int drop);
char *vowelstr(char *str);
char *num(int n1, int n2);
char *ring_num(struct object *obj);
char *tr_name(char c);
char *new(int size);

/* Variadic functions: MUST be declared with proper prototypes so the compiler
 * uses the correct ARM64 variadic calling convention at call sites. */
int msg(char *fmt, ...);
int addmsg(char *fmt, ...);
int chmsg(char *fmt, ...);

/* ===== Rename rogue functions that clash with system names ===== */
/* Rogue defines its own daemon() and kill_daemon() which clash with POSIX */
#define daemon  rogue_daemon
#define kill_daemon rogue_kill_daemon

/* ===== Replace system calls ===== */
#define srand(s)     harness_srand((unsigned int)(s))
#define rand()       harness_rand()
#define exit(c)      harness_exit(c)

/* Signal: return NULL so comparisons like (signal(x,f) != f) compile.
 * We cast to void* to avoid type issues. */
static inline void *harness_signal(int s, void *h) { (void)s; (void)h; return (void*)0; }
#define signal(sig, handler) harness_signal((sig), (void*)(handler))
#define sleep(n)             ((void)0)
#define kill(p, s)           ((void)0)

/* Low-level fd I/O used by original readchar() — suppress */
/* We intercept readchar() itself, so read() is not needed */
/* But some files do: while (read(0, &c, 1) < 0) — make it work */
/* We define readchar to the harness version in io.c directly */

/* File I/O — allow real I/O for now (no level files needed) */
/* save/restore is disabled via harness: save_game() won't be called */

/* Suppress getchar() calls outside readchar — they go through readchar anyway */

/* getuid / getpwuid stubs */
#define getuid()  1000
/* Don't stub getpwuid — it's used with struct passwd which needs pwd.h */

/* suppress scorefile write */
/* score() calls fopen, fputs etc — let them try real I/O; if file missing it's ok */

/* alarm — no-op */
#define alarm(n) ((void)0)

/* sbrk — not available on modern macOS; save.c uses sbrk(0)-version to
 * measure game data size. In harness we just return NULL; save won't work
 * but harness doesn't need save/restore. */
#include <stdint.h>
static inline char *harness_sbrk(intptr_t inc) { (void)inc; return (char*)0; }
#define sbrk(n) harness_sbrk(n)

/* free — make a no-op in harness mode.
 * Original Rogue used sbrk()-based allocation where cfree() was effectively
 * a no-op (freed memory remained accessible). Modern malloc reuses/protects
 * freed memory, causing use-after-free crashes when the game reads from
 * pointers it has "freed" (e.g. cur_armor after discard). */
static inline void harness_free(void *p) { (void)p; }
#define free(p) harness_free(p)
#define cfree(p) harness_free(p)

/* unctrl — provided by hack_curses.c */
/* No macro override needed; it's a real function */

#endif /* ROGUE_PATCH_H */
