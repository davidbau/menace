/*
 * rng_log.c — RNG interception for Rogue 3.6 harness.
 *
 * Compiled WITHOUT -include rogue_patch.h so we can call real libc rand().
 * Provides harness_rand() and harness_srand() which replace rand()/srand()
 * in all game source files.
 *
 * We use the system rand() / srand() directly here.
 */

#include <stdlib.h>
#include <string.h>
#include "harness_events.h"

/* Per-step RNG accumulation buffer */
#define MAX_RNG_PER_STEP 8192
int harness_rng_buf[MAX_RNG_PER_STEP];
int harness_rng_count = 0;

/* Per-step event log (position in rng stream + name string) */
int  harness_event_count = 0;
int  harness_event_pos[MAX_EVENTS_PER_STEP];
char harness_event_name[MAX_EVENTS_PER_STEP][MAX_EVENT_NAME];

/* Seed tracking */
static unsigned int g_seed = 0;
static unsigned int g_forced_seed = 0;
static int g_has_forced_seed = 0;

/* Called by harness_main.c before game starts */
void harness_set_forced_seed(unsigned int seed)
{
    g_forced_seed = seed;
    g_has_forced_seed = 1;
    g_seed = seed;
    srand(seed);
}

/* Called by game's srand() — always overridden to use forced seed if set */
void harness_srand(unsigned int seed)
{
    if (g_has_forced_seed) {
        /* Ignore the game's seed, use our forced seed */
        (void)seed;
        g_seed = g_forced_seed;
        srand(g_forced_seed);
    } else {
        g_seed = seed;
        srand(seed);
    }
}

int harness_rand(void)
{
    int r = rand();
    int v = r & 0x7fff;  /* low 15 bits, matching Rogue's RN macro */
    if (harness_rng_count < MAX_RNG_PER_STEP)
        harness_rng_buf[harness_rng_count++] = v;
    return r;
}

void harness_log_rand(int val)
{
    if (harness_rng_count < MAX_RNG_PER_STEP)
        harness_rng_buf[harness_rng_count++] = val;
}

void harness_log_event(const char *name)
{
    if (harness_event_count < MAX_EVENTS_PER_STEP) {
        harness_event_pos[harness_event_count] = harness_rng_count;
        strncpy(harness_event_name[harness_event_count], name, MAX_EVENT_NAME - 1);
        harness_event_name[harness_event_count][MAX_EVENT_NAME - 1] = '\0';
        harness_event_count++;
    }
}
