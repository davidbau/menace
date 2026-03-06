/*
 * rng_log.c — RNG instrumentation for Hack 1982 harness.
 *
 * Wraps rnd.c functions to emit JSON log entries.
 * The actual rnd.c functions are renamed via macros in hack_patch.h.
 */

#ifdef HARNESS

#include <stdio.h>
#include "hack_patch.h"

/* Instrumented wrappers that log each RNG call */

static char rng_json_buf[1048576];
static int rng_json_len = 0;

void rng_log_append(const char *fn, int x, int y, int result) {
    rng_json_len += snprintf(rng_json_buf + rng_json_len,
        sizeof(rng_json_buf) - rng_json_len,
        "{\"fn\":\"%s\",\"x\":%d,\"y\":%d,\"v\":%d},",
        fn, x, y, result);
}

/* These are called from the patched rnd.c via macros */
/* rnd.c is not patched — instead we wrap here via -DHARNESS guards */

#endif /* HARNESS */
