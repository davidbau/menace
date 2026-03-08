/*
 * harness_events.h — Shared constants and declaration for harness event logging.
 * Included by rng_log.c and harness_main.c.
 */

#ifndef HARNESS_EVENTS_H
#define HARNESS_EVENTS_H

#define MAX_EVENTS_PER_STEP 64
#define MAX_EVENT_NAME 128

/* Defined in rng_log.c */
extern int  harness_event_count;
extern int  harness_event_pos[MAX_EVENTS_PER_STEP];
extern char harness_event_name[MAX_EVENTS_PER_STEP][MAX_EVENT_NAME];

void harness_log_event(const char *name);

#endif /* HARNESS_EVENTS_H */
