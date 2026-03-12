/*
 * hack_patch.h — Harness patches for seed control and JSON session capture.
 *
 * Strategy: include system headers FIRST, then define override macros.
 * This prevents the macros from mangling system header declarations.
 */

#ifndef HACK_PATCH_H
#define HACK_PATCH_H

/* ===== System headers first (before any override macros) ===== */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>    /* for index() */
#include <signal.h>     /* for kill(), signal() */
#include <errno.h>
#include <stdarg.h>

/* ===== Forward declarations of harness functions ===== */
int harness_getchar(void);
void harness_srand(unsigned int seed);
int harness_rand(void);
int harness_getpid(void);
void harness_exit(int code);
void harness_capture_screen(void);

void harness_fputs(const char *s, FILE *f);
void harness_putchar(int c);
int  harness_printf(const char *fmt, ...);
void harness_fflush(FILE *f);

FILE* harness_fopen(const char *path, const char *mode);
int   harness_fclose(FILE *fp);
int   harness_fread(void *ptr, int sz, int n, FILE *fp);
int   harness_fwrite(const void *ptr, int sz, int n, FILE *fp);

void harness_getlin(char *buf);

int harness_do_fork(void);
void harness_debug(const char *msg);  /* write to real stderr */
void harness_debug_fmt(const char *fmt, ...);  /* write formatted to real stderr */
void harness_log_event(const char *fmt, ...);  /* log event into rng stream */

/* ===== Replace system calls ===== */
#define getchar()    harness_getchar()
#define srand(s)     harness_srand(s)
#define rand()       harness_rand()
#define getpid()     harness_getpid()
#define exit(c)      harness_exit(c)

/* Terminal I/O → screen buffer */
#define fputs(s,f)   harness_fputs(s, f)
#define putchar(c)   harness_putchar(c)
#define printf(...)  harness_printf(__VA_ARGS__)
#define fflush(f)    harness_fflush(f)

/* Signal/process — no-ops (included signal.h first so these only affect calls) */
#define signal(sig, handler)  ((void)0)
#define sleep(n)              ((void)0)
#define chdir(p)              0

/* kill: need to suppress calls without mangling signal.h prototype.
   Use a renamed wrapper defined in rng_log.c/harness. */
#undef kill
static inline int harness_kill(int p, int s) { (void)p; (void)s; return 0; }
#define kill(p,s)  harness_kill(p,s)

/* fork/wait: call mklev inline instead of spawning a subprocess */
#define fork()   harness_do_fork()
static inline int harness_wait(void *s) { if (s) *(int*)s = 0; return 0; }
#define wait(s)  harness_wait(s)

/* execl: should never be reached (fork() handles mklev inline) */
#define execl(...)   harness_exit(1)

/* File I/O — use in-memory buffers */
#undef fopen
#undef fclose
#undef fread
#undef fwrite
#define fopen(path, mode)     harness_fopen(path, mode)
#define fclose(fp)            harness_fclose(fp)
#define fread(ptr,s,n,fp)     harness_fread(ptr,s,n,fp)
#define fwrite(ptr,s,n,fp)    harness_fwrite(ptr,s,n,fp)
#define ferror(fp)            0
#define unlink(f)             0
#define link(a,b)             0

/* Low-level fd I/O — disable */
#define open(f,m)             (-1)
#define read(fd,buf,n)        0
#define write(fd,buf,n)       (n)
#define creat(f,m)            (-1)
#define close(fd)             ((void)0)

/* Other system calls */
#define getgid()  42
#define getuid()  42
#define setuid(u) ((void)0)

/* getlogin: avoid NULL return in headless environment.
   Use identifier macro so char *getlogin() in hack.h stays valid. */
static inline char *harness_getlogin(void) { return "hplayer"; }
#define getlogin harness_getlogin
#define alarm(n)  ((void)0)

/* Harness aliases */
#define cbin()   ((void)0)
#define cbout()  ((void)0)
/* getlin: let game's own getlin() run using harness_getchar() */

/* mfree: the game uses mfree() as free() but original alloc() used sbrk(),
   where freed memory stayed accessible in the address space. Modern malloc()
   may scramble freed memory immediately (e.g. macOS guard allocator), causing
   use-after-free crashes in savelev() which reads mtmp->nmon after mfree(mtmp).
   No-op matches original VAX/PDP-11 behavior. */
#define mfree(ptr) ((void)(ptr))

/* pow: game defines pow(n) = 2^n, conflicts with math.h pow(x,y).
   Rename the game's pow to avoid the clash. */
#define pow pow_game

/* alloc() is defined in hack.main.c with explicit char* return type.
   Declare it here so ALL translation units get the correct 64-bit pointer ABI. */
extern char *alloc(int);

#endif /* HACK_PATCH_H */
