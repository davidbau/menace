/*
 * hack_patch.h — Harness patches for seed control and JSON session capture.
 * Included before all C source files via Makefile CFLAGS.
 *
 * Replaces:
 *   - getchar()  → harness_getchar() (reads from injected keystroke buffer)
 *   - srand()    → harness_srand()   (seed-controlled)
 *   - rand()     → harness_rand()    (logged)
 *   - getpid()   → harness_getpid()  (deterministic)
 *   - exit()     → harness_exit()    (captured, not fatal)
 *   - Terminal output → JSON frame capture
 */

#ifndef HACK_PATCH_H
#define HACK_PATCH_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Forward declarations */
int harness_getchar(void);
void harness_srand(unsigned int seed);
int harness_rand(void);
int harness_getpid(void);
void harness_exit(int code);
void harness_capture_screen(void);
void harness_emit_rng(const char *fn, int x, int y, int result);

/* Replace system calls */
#define getchar()    harness_getchar()
#define srand(s)     harness_srand(s)
#define rand()       harness_rand()
#define getpid()     harness_getpid()
#define exit(c)      harness_exit(c)

/* Terminal I/O → no-op or screen buffer */
#define fputs(s,f)   harness_fputs(s, f)
#define putchar(c)   harness_putchar(c)
#define printf(...)  harness_printf(__VA_ARGS__)
#define fflush(f)    harness_fflush(f)

void harness_fputs(const char *s, FILE *f);
void harness_putchar(int c);
int  harness_printf(const char *fmt, ...);
void harness_fflush(FILE *f);

/* Signal handling — ignore */
#define signal(sig, handler)  ((void)0)
#define kill(pid, sig)        ((void)0)
#define fork()                0
#define wait(s)               0
#define sleep(n)              ((void)0)
#define chdir(p)              0

/* File I/O — use temp in-memory buffers */
#define fopen(path, mode)     harness_fopen(path, mode)
#define fclose(fp)            harness_fclose(fp)
#define fread(ptr,s,n,fp)     harness_fread(ptr,s,n,fp)
#define fwrite(ptr,s,n,fp)    harness_fwrite(ptr,s,n,fp)
#define ferror(fp)            0
#define unlink(f)             0
#define link(a,b)             0
#define open(f,m)             (-1)
#define read(fd,buf,n)        0
#define write(fd,buf,n)       (n)
#define creat(f,m)            (-1)
#define close(fd)             ((void)0)

FILE* harness_fopen(const char *path, const char *mode);
int   harness_fclose(FILE *fp);
int   harness_fread(void *ptr, int sz, int n, FILE *fp);
int   harness_fwrite(const void *ptr, int sz, int n, FILE *fp);

/* String functions */
#include <string.h>
char *harness_index(const char *s, int c);
#define index(s,c)  harness_index(s,c)

/* Remove exec/fork */
#define execl(...)   harness_exit(1)

/* Other */
#define cbin()   ((void)0)
#define cbout()  ((void)0)
#define getlin(buf) harness_getlin(buf)
void harness_getlin(char *buf);
#define getgid()  42
#define getuid()  42
#define setuid(u) ((void)0)
#define alarm(n)  ((void)0)

/* Options */
#define set1(s) ((void)0)

#endif /* HACK_PATCH_H */
