/*
 * rng_log.c — Event logging for rogue C harness.
 * Provides harness_log_event() for tracking game events per step.
 */

#include <stdio.h>
#include <string.h>
#include "harness_events.h"

/* Global event buffer — reset between steps by the harness. */
int  harness_event_count = 0;
int  harness_event_pos[MAX_EVENTS_PER_STEP];
char harness_event_name[MAX_EVENTS_PER_STEP][MAX_EVENT_NAME];

/* RNG call counter — incremented by rnd() wrapper in misc.c */
int  harness_rng_call_count = 0;

void harness_log_event(const char *name) {
    if (harness_event_count >= MAX_EVENTS_PER_STEP)
        return;
    harness_event_pos[harness_event_count] = harness_rng_call_count;
    strncpy(harness_event_name[harness_event_count], name, MAX_EVENT_NAME - 1);
    harness_event_name[harness_event_count][MAX_EVENT_NAME - 1] = '\0';
    harness_event_count++;
}
