/*
 * rng_log.c — RNG logging and event tracking for Rogue 3.6 harness.
 *
 * Provides:
 *   harness_rnd(range)    — logged replacement for rnd()
 *   harness_log_event()   — event tracking per step
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "harness_events.h"

/* The RN macro from rogue.h — we need the game's seed variable */
extern int seed;
#define RN (((seed = seed*11109+13849) & 0x7fff) >> 1)

/* Forced seed for harness deterministic replay */
static unsigned int forced_seed = 0;
static int use_forced_seed = 0;

void harness_set_forced_seed(unsigned int s)
{
    forced_seed = s;
    use_forced_seed = 1;
}

void harness_srand(unsigned int s)
{
    if (use_forced_seed)
        seed = (int)forced_seed;
    else
        seed = (int)s;
}

/* RNG call log — filled per step, read by harness_main.c */
#define MAX_RNG_LOG 8192
static int  _harness_rng_log[MAX_RNG_LOG];
int  *harness_rng_buf = _harness_rng_log;
static int  _harness_rng_args[MAX_RNG_LOG];
int  harness_rng_count = 0;

/* Event buffer — reset between steps by the harness */
int  harness_event_count = 0;
int  harness_event_pos[MAX_EVENTS_PER_STEP];
char harness_event_name[MAX_EVENTS_PER_STEP][MAX_EVENT_NAME];

/* Total RNG call counter (not reset between steps) */
int  harness_rng_call_count = 0;

/*
 * harness_rnd — drop-in replacement for rnd().
 * Uses the same RN macro as the original rnd() in main.c.
 * Logs each call for session output.
 */
int harness_rnd(int range)
{
    int result;
    if (range == 0)
        return 0;
    result = abs(RN) % range;

    if (harness_rng_count < MAX_RNG_LOG) {
        _harness_rng_args[harness_rng_count] = range;
        _harness_rng_log[harness_rng_count] = result;
        harness_rng_count++;
    }
    harness_rng_call_count++;

    return result;
}

/*
 * roll — replacement for game's roll() which was guarded out.
 * Calls harness_rnd so each die roll is logged.
 */
int roll(int number, int sides)
{
    int dtotal = 0;
    while (number--)
        dtotal += harness_rnd(sides) + 1;
    return dtotal;
}

void harness_log_event(const char *name)
{
    if (harness_event_count >= MAX_EVENTS_PER_STEP)
        return;
    harness_event_pos[harness_event_count] = harness_rng_call_count;
    strncpy(harness_event_name[harness_event_count], name, MAX_EVENT_NAME - 1);
    harness_event_name[harness_event_count][MAX_EVENT_NAME - 1] = '\0';
    harness_event_count++;
}
