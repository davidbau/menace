/* NetHack 3.7	rnd.c	$NHDT-Date: 1596498205 2020/08/03 23:43:25 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.30 $ */
/*      Copyright (c) 2004 by Robert Patrick Rankin               */
/* NetHack may be freely redistributed.  See license for details. */

/* Suppress rng logging macros inside this file -- we define the real
   functions here, and add logging directly in each function body.
   Internal calls (e.g. rnz calling rn2) inherit the outer caller's
   context because the macros don't fire inside rnd.c. */
#define RNGLOG_IN_RND_C
#include "hack.h"

/*
 * PRNG call logging infrastructure.
 * When NETHACK_RNGLOG is set, every rn2/rnd/rnl/d/rne/rnz call is logged
 * with: call#, function(args) = result @ caller_func(file:line)
 *
 * The caller_func, file:line come from rng_log_set_caller(), invoked
 * by the macros in hack.h before calling the real function.
 *
 * Caller context propagation: the context is NOT cleared after logging.
 * This means internal rn2 calls from wrapper functions (rnz, rne, rnl)
 * inherit the ORIGINAL caller's file:line annotation.  For example,
 * if start_corpse_timeout at mkobj.c:1409 calls rnz(25), the internal
 * rn2(1000), rn2(4), rn2(2) calls all log with "@ mkobj.c:1409".
 * The wrapper result (rnz, rne, rnl) also logs with the same annotation.
 *
 * Context is overwritten by the next macro expansion (each external call
 * sets fresh context), so there is no stale-context problem.
 */
static FILE *rng_logfile = NULL;
static int rng_call_count = 0;
static const char *rng_caller_file = NULL;
static int rng_caller_line = 0;
static const char *rng_caller_func = NULL;

void
rng_log_init(void)
{
    const char *logpath = getenv("NETHACK_RNGLOG");
    if (logpath && *logpath) {
        rng_logfile = fopen(logpath, "w");
        if (rng_logfile)
            setvbuf(rng_logfile, NULL, _IOLBF, 0); /* line-buffered */
    }
}

void
rng_log_set_caller(const char *file, int line, const char *func)
{
    rng_caller_file = file;
    rng_caller_line = line;
    rng_caller_func = func;
}

int
rng_log_get_call_count(void)
{
    return rng_call_count;
}

static void
rng_log_write(const char *func, const char *args, int result)
{
    if (!rng_logfile)
        return;
    rng_call_count++;
    if (rng_caller_file) {
        if (rng_caller_func) {
            fprintf(rng_logfile, "%d %s(%s) = %d @ %s(%s:%d)\n",
                    rng_call_count, func, args, result,
                    rng_caller_func, rng_caller_file, rng_caller_line);
        } else {
            fprintf(rng_logfile, "%d %s(%s) = %d @ %s:%d\n",
                    rng_call_count, func, args, result,
                    rng_caller_file, rng_caller_line);
        }
        /* Do NOT clear rng_caller_file here -- let internal calls from
           wrapper functions (rnz, rne, rnl) inherit the same context. */
    } else {
        fprintf(rng_logfile, "%d %s(%s) = %d\n",
                rng_call_count, func, args, result);
    }
}

/*
 * Mid-level function tracing (009-midlog-infrastructure patch).
 *
 * Logs >entry and <exit markers for key functions, interleaved with the
 * RNG call log.  Uses the same rng_logfile and rng_call_count.
 *
 * Format:
 *   >funcname @ caller(file:line)
 *   <funcname=result #start-end @ caller(file:line)
 *
 * A stack records rng_call_count at entry so exit can report the
 * RNG call range consumed by the function.
 */
#define MIDLOG_STACK_SIZE 16
static int midlog_stack[MIDLOG_STACK_SIZE];
static int midlog_depth = 0;

void
midlog_enter(const char *fn, const char *file, int line, const char *caller)
{
    if (!rng_logfile)
        return;
    if (midlog_depth < MIDLOG_STACK_SIZE)
        midlog_stack[midlog_depth] = rng_call_count;
    midlog_depth++;
    fprintf(rng_logfile, ">%s @ %s(%s:%d)\n", fn, caller, file, line);
}

void
midlog_exit_int(const char *fn, int result,
                const char *file, int line, const char *caller)
{
    if (!rng_logfile)
        return;
    --midlog_depth;
    int entry = (midlog_depth >= 0 && midlog_depth < MIDLOG_STACK_SIZE)
                    ? midlog_stack[midlog_depth] : 0;
    fprintf(rng_logfile, "<%s=%d #%d-%d @ %s(%s:%d)\n",
            fn, result, entry + 1, rng_call_count, caller, file, line);
}

void
midlog_exit_void(const char *fn,
                 const char *file, int line, const char *caller)
{
    if (!rng_logfile)
        return;
    --midlog_depth;
    int entry = (midlog_depth >= 0 && midlog_depth < MIDLOG_STACK_SIZE)
                    ? midlog_stack[midlog_depth] : 0;
    fprintf(rng_logfile, "<%s #%d-%d @ %s(%s:%d)\n",
            fn, entry + 1, rng_call_count, caller, file, line);
}

void
midlog_exit_ptr(const char *fn, const void *result,
                const char *file, int line, const char *caller)
{
    (void)result;  /* pointer value not logged - differs between C/JS */
    if (!rng_logfile)
        return;
    --midlog_depth;
    int entry = (midlog_depth >= 0 && midlog_depth < MIDLOG_STACK_SIZE)
                    ? midlog_stack[midlog_depth] : 0;
    fprintf(rng_logfile, "<%s #%d-%d @ %s(%s:%d)\n",
            fn, entry + 1, rng_call_count, caller, file, line);
}

/*
 * Event logging (012-event-logging patch).
 *
 * Writes ^event lines interleaved with the RNG log, to track game-state
 * changes (object placement, monster pickup/drop/eat/die) for C-vs-JS
 * divergence diagnosis.
 */
void
event_log(const char *fmt, ...)
{
    va_list ap;
    if (!rng_logfile)
        return;
    fputc('^', rng_logfile);
    va_start(ap, fmt);
    vfprintf(rng_logfile, fmt, ap);
    va_end(ap);
    fputc('\n', rng_logfile);
}

#ifdef USE_ISAAC64
#include "isaac64.h"

staticfn int whichrng(int (*fn)(int));
staticfn int RND(int);
staticfn void set_random(unsigned long, int (*)(int));

#if 0
static isaac64_ctx rng_state;
#endif

struct rnglist_t {
    int (*fn)(int);
    boolean init;
    isaac64_ctx rng_state;
};

enum { CORE = 0, DISP = 1 };

static struct rnglist_t rnglist[] = {
    { rn2, FALSE, { 0 } },                      /* CORE */
    { rn2_on_display_rng, FALSE, { 0 } },       /* DISP */
};

staticfn int
whichrng(int (*fn)(int))
{
    int i;

    for (i = 0; i < SIZE(rnglist); ++i)
        if (rnglist[i].fn == fn)
            return i;
    return -1;
}

void
init_isaac64(unsigned long seed, int (*fn)(int))
{
    unsigned char new_rng_state[sizeof seed];
    unsigned i;
    int rngindx = whichrng(fn);

    if (rngindx < 0)
        panic("Bad rng function passed to init_isaac64().");

    for (i = 0; i < sizeof seed; i++) {
        new_rng_state[i] = (unsigned char) (seed & 0xFF);
        seed >>= 8;
    }
    isaac64_init(&rnglist[rngindx].rng_state, new_rng_state,
                 (int) sizeof seed);
}

staticfn int
RND(int x)
{
    return (isaac64_next_uint64(&rnglist[CORE].rng_state) % x);
}

/* 0 <= rn2(x) < x, but on a different sequence from the "main" rn2;
   used in cases where the answer doesn't affect gameplay and we don't
   want to give users easy control over the main RNG sequence. */
int
rn2_on_display_rng(int x)
{
    return (isaac64_next_uint64(&rnglist[DISP].rng_state) % x);
}

#else   /* USE_ISAAC64 */

/* "Rand()"s definition is determined by [OS]conf.h */
#if defined(UNIX) || defined(RANDOM)
#define RND(x) ((int) (Rand() % (long) (x)))
#else
/* Good luck: the bottom order bits are cyclic. */
#define RND(x) ((int) ((Rand() >> 3) % (x)))
#endif
int
rn2_on_display_rng(int x)
{
    static unsigned seed = 1;
    seed *= 2739110765;
    return (int) ((seed >> 16) % (unsigned) x);
}
#endif  /* USE_ISAAC64 */

/* 0 <= rn2(x) < x */
int
rn2(int x)
{
    int result;
#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)
    if (x <= 0) {
        impossible("rn2(%d) attempted", x);
        return 0;
    }
#endif
    result = RND(x);
    if (rng_logfile) {
        char buf[32];
        snprintf(buf, sizeof buf, "%d", x);
        rng_log_write("rn2", buf, result);
    }
    return result;
}

/* 0 <= rnl(x) < x; sometimes subtracting Luck;
   good luck approaches 0, bad luck approaches (x-1) */
int
rnl(int x)
{
    int i, adjustment;
    /* Internal rn2 call inherits caller context from the rnl macro --
       no save/clear needed. */

#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)
    if (x <= 0) {
        impossible("rnl(%d) attempted", x);
        return 0;
    }
#endif

    adjustment = Luck;
    if (x <= 15) {
        /* for small ranges, use Luck/3 (rounded away from 0);
           also guard against architecture-specific differences
           of integer division involving negative values */
        adjustment = (abs(adjustment) + 1) / 3 * sgn(adjustment);
        /*
         *       11..13 ->  4
         *        8..10 ->  3
         *        5.. 7 ->  2
         *        2.. 4 ->  1
         *       -1,0,1 ->  0 (no adjustment)
         *       -4..-2 -> -1
         *       -7..-5 -> -2
         *      -10..-8 -> -3
         *      -13..-11-> -4
         */
    }

    i = RND(x);
    if (adjustment && rn2(37 + abs(adjustment))) {
        i -= adjustment;
        if (i < 0)
            i = 0;
        else if (i >= x)
            i = x - 1;
    }
    if (rng_logfile) {
        char buf[32];
        snprintf(buf, sizeof buf, "%d", x);
        rng_log_write("rnl", buf, i);
    }
    return i;
}

/* 1 <= rnd(x) <= x */
int
rnd(int x)
{
    int result;
#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)
    if (x <= 0) {
        impossible("rnd(%d) attempted", x);
        return 1;
    }
#endif
    result = RND(x) + 1;
    if (rng_logfile) {
        char buf[32];
        snprintf(buf, sizeof buf, "%d", x);
        rng_log_write("rnd", buf, result);
    }
    return result;
}

int
rnd_on_display_rng(int x)
{
    return rn2_on_display_rng(x) + 1;
}

/* d(N,X) == NdX == dX+dX+...+dX N times; n <= d(n,x) <= (n*x) */
int
d(int n, int x)
{
    int tmp = n;
    int orig_n = n;

#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)
    if (x < 0 || n < 0 || (x == 0 && n != 0)) {
        impossible("d(%d,%d) attempted", n, x);
        return 1;
    }
#endif
    while (n--)
        tmp += RND(x);
    if (rng_logfile) {
        char buf[64];
        snprintf(buf, sizeof buf, "%d,%d", orig_n, x);
        rng_log_write("d", buf, tmp);
    }
    return tmp; /* Alea iacta est. -- J.C. */
}

/* 1 <= rne(x) <= max(u.ulevel/3,5) */
int
rne(int x)
{
    int tmp, utmp;
    /* Internal rn2 calls inherit caller context from the rne macro --
       no save/clear needed. */

    utmp = (u.ulevel < 15) ? 5 : u.ulevel / 3;
    tmp = 1;
    while (tmp < utmp && !rn2(x))
        tmp++;
    if (rng_logfile) {
        char buf[32];
        snprintf(buf, sizeof buf, "%d", x);
        rng_log_write("rne", buf, tmp);
    }
    return tmp;

    /* was:
     *  tmp = 1;
     *  while (!rn2(x))
     *    tmp++;
     *  return min(tmp, (u.ulevel < 15) ? 5 : u.ulevel / 3);
     * which is clearer but less efficient and stands a vanishingly
     * small chance of overflowing tmp
     */
}

/* rnz: everyone's favorite! */
int
rnz(int i)
{
    long x = (long) i;
    long tmp = 1000L;
    /* Internal rn2/rne calls inherit caller context from the rnz macro --
       no save/clear needed. */

    tmp += rn2(1000);
    tmp *= rne(4);
    if (rn2(2)) {
        x *= tmp;
        x /= 1000;
    } else {
        x *= 1000;
        x /= tmp;
    }
    if (rng_logfile) {
        char buf[32];
        snprintf(buf, sizeof buf, "%d", i);
        rng_log_write("rnz", buf, (int) x);
    }
    return (int) x;
}

/* Sets the seed for the random number generator */
#ifdef USE_ISAAC64

staticfn void
set_random(unsigned long seed,
           int (*fn)(int))
{
    init_isaac64(seed, fn);
}

#else /* USE_ISAAC64 */

/*ARGSUSED*/
staticfn void
set_random(unsigned long seed,
           int (*fn)(int) UNUSED)
{
    /*
     * The types are different enough here that sweeping the different
     * routine names into one via #defines is even more confusing.
     */
# ifdef RANDOM /* srandom() from sys/share/random.c */
    srandom((unsigned int) seed);
# else
#  if defined(__APPLE__) || defined(BSD) || defined(LINUX) \
    || defined(ULTRIX) || defined(CYGWIN32) /* system srandom() */
#   if defined(BSD) && !defined(POSIX_TYPES) && defined(SUNOS4)
    (void)
#   endif
        srandom((int) seed);
#  else
#   ifdef UNIX /* system srand48() */
    srand48((long) seed);
#   else       /* poor quality system routine */
    srand((int) seed);
#   endif
#  endif
# endif
}
#endif /* USE_ISAAC64 */

/* An appropriate version of this must always be provided in
   port-specific code somewhere. It returns a number suitable
   as seed for the random number generator */
extern unsigned long sys_random_seed(void);

/*
 * Initializes the random number generator.
 * Only call once.
 */
void
init_random(int (*fn)(int))
{
    set_random(sys_random_seed(), fn);
}

/* Reshuffles the random number generator. */
void
reseed_random(int (*fn)(int))
{
   /* only reseed if we are certain that the seed generation is unguessable
    * by the players. */
    if (has_strong_rngseed)
        init_random(fn);
}

/* randomize the given list of numbers  0 <= i < count */
void
shuffle_int_array(int *indices, int count)
{
    int i, iswap, temp;

    for (i = count - 1; i > 0; i--) {
        if ((iswap = rn2(i + 1)) == i)
            continue;
        temp = indices[i];
        indices[i] = indices[iswap];
        indices[iswap] = temp;
    }
}

/*rnd.c*/
