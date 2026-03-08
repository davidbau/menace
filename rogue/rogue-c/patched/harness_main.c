/*
 * harness_main.c — Entry point and session capture for Rogue 3.6 harness.
 *
 * Compiled WITHOUT -include rogue_patch.h so we can use real libc I/O
 * for JSON output.
 *
 * Provides:
 *   - main()           — parses args, sets up harness, calls game_main()
 *   - harness_exit()   — captures final state and emits JSON
 *   - readchar_harness() — keystroke injection + screen capture
 *
 * The game's main() is renamed to game_main() via -include harness_rename.h.
 * All game source files are compiled with -include rogue_patch.h which
 * redirects rand(), srand(), exit() to harness versions.
 */

#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>

/* ===== Shared with rng_log.c ===== */
#include "harness_events.h"
extern int harness_rng_buf[];
extern int harness_rng_count;
void harness_srand(unsigned int seed);
void harness_set_forced_seed(unsigned int seed);
int  harness_rand(void);

/* ===== Shared with hack_curses.c ===== */
#define SCRROWS 24
#define SCRCOLS 80
extern char harness_display[SCRROWS][SCRCOLS + 1];

/* ===== Keystroke injection ===== */
static const char *harness_keys = NULL;
static int harness_key_pos = 0;
static int harness_key_count = 0;
static const char *harness_outfile = NULL;
static unsigned int g_harness_seed = 42;  /* our forced seed for JSON output */

/* ===== Step capture ===== */
#define MAX_RNG_PER_STEP 8192
#define MAX_STEPS 8192

typedef struct {
    char key;
    char screen[SCRROWS][SCRCOLS + 1];
    int  rng[MAX_RNG_PER_STEP];
    int  rng_count;
    int  event_pos[MAX_EVENTS_PER_STEP];
    char event_name[MAX_EVENTS_PER_STEP][MAX_EVENT_NAME];
    int  event_count;
} HarnessStep;

static HarnessStep harness_steps[MAX_STEPS];
static int harness_nsteps = 0;

/* ===== JSON output ===== */

static void json_escape_str(FILE *out, const char *s)
{
    fputc('"', out);
    for (; *s; s++) {
        unsigned char c = (unsigned char)*s;
        if (*s == '"')       { fputs("\\\"", out); }
        else if (*s == '\\') { fputs("\\\\", out); }
        else if (*s == '\n') { fputs("\\n", out); }
        else if (*s == '\r') { fputs("\\r", out); }
        else if (c < 0x20 || c > 0x7e) { fprintf(out, "\\u%04x", c); }
        else                 { fputc(*s, out); }
    }
    fputc('"', out);
}

static void emit_session_json(FILE *out, unsigned int seed)
{
    int i, r, j;
    fprintf(out, "{\n");
    fprintf(out, "  \"seed\": %u,\n", seed);
    fprintf(out, "  \"steps\": [\n");
    for (i = 0; i < harness_nsteps; i++) {
        HarnessStep *s = &harness_steps[i];
        fprintf(out, "    {\n");
        /* key */
        fprintf(out, "      \"key\": \"");
        char k = s->key;
        if (k == '"')        { fputs("\\\"", out); }
        else if (k == '\\')  { fputs("\\\\", out); }
        else if (k >= 32 && k < 127) { fputc(k, out); }
        else                 { fprintf(out, "\\u%04x", (unsigned char)k); }
        fprintf(out, "\",\n");
        /* rng — interleave event strings with integer RNG values */
        fprintf(out, "      \"rng\": [");
        {
            int ei = 0, first = 1;
            for (j = 0; j < s->rng_count; j++) {
                while (ei < s->event_count && s->event_pos[ei] == j) {
                    if (!first) fputc(',', out);
                    first = 0;
                    json_escape_str(out, s->event_name[ei]);
                    ei++;
                }
                if (!first) fputc(',', out);
                first = 0;
                fprintf(out, "%d", s->rng[j]);
            }
            while (ei < s->event_count) {
                if (!first) fputc(',', out);
                first = 0;
                json_escape_str(out, s->event_name[ei]);
                ei++;
            }
        }
        fprintf(out, "],\n");
        /* screen */
        fprintf(out, "      \"screen\": [\n");
        for (r = 0; r < SCRROWS; r++) {
            /* trim trailing spaces */
            char row[SCRCOLS + 1];
            memcpy(row, s->screen[r], SCRCOLS + 1);
            int len = SCRCOLS;
            while (len > 0 && row[len - 1] == ' ') len--;
            row[len] = '\0';
            fprintf(out, "        ");
            json_escape_str(out, row);
            if (r < SCRROWS - 1) fputc(',', out);
            fputc('\n', out);
        }
        fprintf(out, "      ]\n");
        fprintf(out, "    }%s\n", (i < harness_nsteps - 1) ? "," : "");
    }
    fprintf(out, "  ]\n}\n");
}

/* ===== Step capture ===== */

static void capture_step(char key)
{
    if (harness_nsteps >= MAX_STEPS) return;
    HarnessStep *s = &harness_steps[harness_nsteps++];
    s->key = key;
    /* copy current screen from harness_display */
    memcpy(s->screen, harness_display, sizeof(s->screen));
    /* copy and reset RNG buffer */
    int n = harness_rng_count;
    if (n > MAX_RNG_PER_STEP) n = MAX_RNG_PER_STEP;
    memcpy(s->rng, harness_rng_buf, n * sizeof(int));
    s->rng_count = n;
    harness_rng_count = 0;
    /* copy and reset event buffer */
    int ne = harness_event_count;
    if (ne > MAX_EVENTS_PER_STEP) ne = MAX_EVENTS_PER_STEP;
    memcpy(s->event_pos, harness_event_pos, ne * sizeof(int));
    memcpy(s->event_name, harness_event_name, ne * sizeof(harness_event_name[0]));
    s->event_count = ne;
    harness_event_count = 0;
}

/* ===== harness_next_key ===== */
/*
 * Called by readchar() in io.c (via #ifdef HARNESS) and by getchar() calls
 * in other game files (via harness_rename.h #define getchar harness_next_key).
 *
 * Captures current screen + RNG buffer, then returns next key.
 * When keys are exhausted, emits JSON and exits.
 */

int harness_next_key(void)
{
    if (harness_key_pos >= harness_key_count) {
        /* No more keys — capture final state and exit */
        capture_step('\0');
        FILE *out = harness_outfile ? fopen(harness_outfile, "w") : stdout;
        if (!out) out = stdout;
        emit_session_json(out, g_harness_seed);
        if (harness_outfile && out != stdout) fclose(out);
        exit(0);
    }

    char key = harness_keys[harness_key_pos++];
    /* capture current screen + RNG before consuming key */
    capture_step(key);
    return (unsigned char)key;
}

/* ===== harness_exit ===== */

void harness_exit(int code)
{
    (void)code;
    /* Capture whatever state we have */
    capture_step('\0');
    FILE *out = harness_outfile ? fopen(harness_outfile, "w") : stdout;
    if (!out) out = stdout;
    emit_session_json(out, g_harness_seed);
    if (harness_outfile && out != stdout) fclose(out);
    exit(0);
}

/* ===== main ===== */

/* game_main is the renamed main() from main.c */
extern void game_main(int argc, char **argv, char **envp);

/* wizard is a global bool in rogue.h / main.c */
extern int wizard;

int main(int argc, char **argv)
{
    unsigned int seed_val = 42;
    const char *keys = "";
    const char *outfile = NULL;
    int i;

    /* Check env vars (as specified in design) */
    {
        char *h_seed = getenv("HARNESS_SEED");
        char *h_keys = getenv("HARNESS_KEYS");
        char *h_out  = getenv("HARNESS_OUT");
        if (h_seed) seed_val = (unsigned int)atoi(h_seed);
        if (h_keys) keys = h_keys;
        if (h_out)  outfile = h_out;
    }

    /* Also support command-line args: --seed N --keys "..." --out file */
    for (i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--seed") == 0 && i + 1 < argc)
            seed_val = (unsigned int)atoi(argv[++i]);
        else if (strcmp(argv[i], "--keys") == 0 && i + 1 < argc)
            keys = argv[++i];
        else if (strcmp(argv[i], "--out") == 0 && i + 1 < argc)
            outfile = argv[++i];
        else if (strcmp(argv[i], "--wizard") == 0)
            wizard = 1;
    }

    harness_keys = keys;
    harness_key_count = (int)strlen(keys);
    harness_key_pos = 0;
    harness_outfile = outfile;

    g_harness_seed = seed_val;
    /* Set forced seed — this overrides any srand() call the game makes */
    harness_set_forced_seed(seed_val);

    /* Set ROGUEOPTS and USER env to avoid interactive prompts */
    setenv("ROGUEOPTS", "name=rogue,fruit=papaya", 1);
    setenv("USER", "rogue", 1);
    setenv("HOME", "/tmp", 1);
    /* Provide SEED env var so wizard mode seed works if needed */
    {
        char seedbuf[32];
        snprintf(seedbuf, sizeof(seedbuf), "%u", seed_val);
        setenv("SEED", seedbuf, 1);
    }

    /* Build a minimal argv for game_main */
    char *game_argv[2] = { "rogue_harness", NULL };

    game_main(1, game_argv, NULL);

    /* Should not reach here */
    harness_exit(0);
    return 0;
}
