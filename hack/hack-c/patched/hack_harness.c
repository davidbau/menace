/*
 * hack_harness.c — Harness implementation for Hack 1982 session capture.
 *
 * This file is compiled WITHOUT -include hack_patch.h so it can use
 * real libc I/O for JSON output. It implements all the harness_*()
 * functions declared in hack_patch.h.
 *
 * Session JSON format:
 * {
 *   "seed": N,
 *   "steps": [
 *     { "key": "h", "screen": ["...80 chars...", ...24 rows] }
 *   ]
 * }
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <setjmp.h>

/* ===== Screen buffer ===== */
#define SCRCOLS 80
#define SCRROWS 24
static char screen[SCRROWS][SCRCOLS + 1];
static int cursor_x = 0;  /* 0-based */
static int cursor_y = 0;  /* 0-based */

static void screen_clear(void) {
  int r;
  for (r = 0; r < SCRROWS; r++) {
    memset(screen[r], ' ', SCRCOLS);
    screen[r][SCRCOLS] = '\0';
  }
  cursor_x = cursor_y = 0;
}

static void screen_putch(int c) {
  if (c == '\r') { cursor_x = 0; return; }
  if (c == '\n') { cursor_y++; if (cursor_y >= SCRROWS) cursor_y = SCRROWS-1; return; }  /* LF: down only, no CR */
  if (c == '\b') { if (cursor_x > 0) cursor_x--; return; }
  if (c == '\007') return;  /* bell */
  if (cursor_x < SCRCOLS && cursor_y < SCRROWS && cursor_y >= 0)
    screen[cursor_y][cursor_x++] = (char)c;
}

static void screen_move(int x, int y) {
  cursor_x = (x >= 0 && x < SCRCOLS) ? x : 0;
  cursor_y = (y >= 0 && y < SCRROWS) ? y : 0;
}

static void screen_eol(void) {
  if (cursor_y >= 0 && cursor_y < SCRROWS) {
    int x;
    for (x = cursor_x; x < SCRCOLS; x++) screen[cursor_y][x] = ' ';
  }
}

/* VT100 escape sequence parser */
static char esc_buf[64];
static int esc_len = 0;
static int in_esc = 0;

static void process_esc(void) {
  if (esc_len < 1) return;
  if (esc_buf[0] == '[') {
    /* CSI sequence: parse params */
    int params[8] = {0,0,0,0,0,0,0,0};
    int np = 0;
    int i = 1;
    while (i < esc_len) {
      int v = 0;
      while (i < esc_len && esc_buf[i] >= '0' && esc_buf[i] <= '9')
        v = v*10 + (esc_buf[i++]-'0');
      params[np < 8 ? np++ : 7] = v;
      if (i < esc_len && esc_buf[i] == ';') i++;
      else break;
    }
    char cmd = (i < esc_len) ? esc_buf[i] : 0;
    if (cmd == 'H' || cmd == 'f') {
      /* cursor position: row;col (1-based) */
      screen_move(params[1]-1, params[0]-1);
    } else if (cmd == 'J') {
      screen_clear();
    } else if (cmd == 'K') {
      screen_eol();
    } else if (cmd == 'A') {
      cursor_y -= (params[0] ? params[0] : 1);
      if (cursor_y < 0) cursor_y = 0;
    } else if (cmd == 'B') {
      cursor_y += (params[0] ? params[0] : 1);
      if (cursor_y >= SCRROWS) cursor_y = SCRROWS-1;
    } else if (cmd == 'C') {
      cursor_x += (params[0] ? params[0] : 1);
      if (cursor_x >= SCRCOLS) cursor_x = SCRCOLS-1;
    } else if (cmd == 'D') {
      cursor_x -= (params[0] ? params[0] : 1);
      if (cursor_x < 0) cursor_x = 0;
    } else if (cmd == 'm') {
      /* color/attribute — ignore */
    }
  }
}

static void feed_char(int c) {
  if (c == '\033') { in_esc = 1; esc_len = 0; return; }
  if (in_esc) {
    if (esc_len < (int)(sizeof(esc_buf)-1)) esc_buf[esc_len++] = (char)c;
    /* CSI sequences end at 0x40-0x7e; ESC sequences end at 0x40-0x7e too */
    if (esc_len == 1 && c != '[') {
      /* Simple 2-char ESC sequence */
      if (c == 'M') {
        /* ESC M = reverse linefeed (cursor up 1) */
        cursor_y--;
        if (cursor_y < 0) cursor_y = 0;
      }
      /* Other 2-char sequences: ignore */
      in_esc = esc_len = 0;
      return;
    }
    if (esc_len > 1 && c >= 0x40 && c <= 0x7e) {
      esc_buf[esc_len] = '\0';
      process_esc();
      in_esc = esc_len = 0;
    }
    return;
  }
  screen_putch(c);
}

/* ===== Harness terminal replacements ===== */

void harness_fputs(const char *s, FILE *f) {
  (void)f;
  for (; *s; s++) feed_char((unsigned char)*s);
}

void harness_putchar(int c) { feed_char(c); }

int harness_printf(const char *fmt, ...) {
  char buf[4096];
  va_list ap;
  int n, i;
  va_start(ap, fmt);
  n = vsnprintf(buf, sizeof(buf), fmt, ap);
  va_end(ap);
  for (i = 0; i < n && i < (int)sizeof(buf); i++) feed_char((unsigned char)buf[i]);
  return n;
}

void harness_fflush(FILE *f) { (void)f; }

/* ===== RNG ===== */
static unsigned int rng_seed = 0;

/* Seed override: game calls srand(getpid()), we intercept to use our seed */
static unsigned int seed_override = 42;
static int has_seed_override = 0;

/* Per-step RNG accumulation buffer */
#define MAX_RNG_PER_STEP 2048
static int current_rng_buf[MAX_RNG_PER_STEP];
int current_rng_count = 0;

/* forward reference — defined in screen capture section below */
static int step_count;

/* Event buffer: inline ^event markers in the RNG stream */
#define MAX_TOTAL_EVENTS 4096
#define MAX_EVT_LEN 256
static struct {
  int step;     /* step index this event belongs to */
  int rng_pos;  /* current_rng_count at time of event */
  char msg[MAX_EVT_LEN];
} g_events[MAX_TOTAL_EVENTS];
static int g_event_count = 0;

void harness_log_event(const char *fmt, ...) {
  va_list ap;
  if (g_event_count >= MAX_TOTAL_EVENTS) return;
  g_events[g_event_count].step = step_count;
  g_events[g_event_count].rng_pos = current_rng_count;
  va_start(ap, fmt);
  vsnprintf(g_events[g_event_count].msg, MAX_EVT_LEN, fmt, ap);
  va_end(ap);
  g_event_count++;
}

void harness_srand(unsigned int seed) {
  rng_seed = has_seed_override ? seed_override : seed;
}

int harness_rand(void) {
  rng_seed = rng_seed * 1103515245U + 12345U;
  int v = (int)((rng_seed >> 16) & 0x7fff);
  if (current_rng_count < MAX_RNG_PER_STEP)
    current_rng_buf[current_rng_count++] = v;
  return v;
}

int harness_getpid(void) { return 1982; }

/* forward declarations */
void harness_capture_screen(void);
void harness_exit(int code);

/* ===== Keystroke injection ===== */
static const char *keys_ptr = NULL;
static int key_pos = 0;

int harness_getchar(void) {
  if (!keys_ptr || keys_ptr[key_pos] == '\0') {
    /* No more keys: capture final screen and exit */
    harness_capture_screen();
    harness_exit(0);
    return 0;  /* unreachable */
  }
  char c = keys_ptr[key_pos++];
  /* Capture screen after each keystroke */
  harness_capture_screen();
  return (unsigned char)c;
}

void harness_getlin(char *buf) {
  /* Read characters until '\r' or '\n', matching JS getlin() behavior.
   * This ensures that "Call it:" prompts consume the same keys as JS. */
  int len = 0;
  int ch;
  while ((ch = harness_getchar()) != '\r' && ch != '\n') {
    if (ch == '\x1b') { len = 0; break; }  /* ESC: clear input */
    if (ch == '\b' || ch == '\x7f') { if (len > 0) len--; continue; }
    if (len < 79) buf[len++] = (char)ch;
  }
  buf[len] = '\0';
}

/* ===== In-memory level file I/O ===== */
#define MAX_LEVFILES 64
#define MAX_LEVDATA  65536

static struct {
  char name[64];
  char data[MAX_LEVDATA];
  int size;
  int rpos;
  int in_use;
} levfiles[MAX_LEVFILES];

static int find_levfile(const char *name) {
  int i;
  for (i = 0; i < MAX_LEVFILES; i++)
    if (levfiles[i].in_use && strcmp(levfiles[i].name, name) == 0) return i;
  return -1;
}

FILE* harness_fopen(const char *path, const char *mode) {
  int slot;
  if (mode[0] == 'r' || mode[0] == 'R') {
    slot = find_levfile(path);
    if (slot < 0) return NULL;
    levfiles[slot].rpos = 0;
  } else {
    slot = find_levfile(path);
    if (slot < 0) {
      for (slot = 0; slot < MAX_LEVFILES; slot++)
        if (!levfiles[slot].in_use) break;
      if (slot >= MAX_LEVFILES) return NULL;
      levfiles[slot].in_use = 1;
      strncpy(levfiles[slot].name, path, 63);
      levfiles[slot].name[63] = '\0';
    }
    levfiles[slot].size = 0;
    levfiles[slot].rpos = 0;
  }
  return (FILE*)(intptr_t)(slot + 1);  /* 1-based slot as FILE* */
}

int harness_fclose(FILE *fp) { (void)fp; return 0; }

int harness_fread(void *ptr, int sz, int n, FILE *fp) {
  int slot = (int)(intptr_t)fp - 1;
  int bytes, avail;
  if (slot < 0 || slot >= MAX_LEVFILES || !levfiles[slot].in_use) return 0;
  bytes = sz * n;
  avail = levfiles[slot].size - levfiles[slot].rpos;
  if (bytes > avail) bytes = avail;
  if (bytes <= 0) return 0;
  memcpy(ptr, levfiles[slot].data + levfiles[slot].rpos, bytes);
  levfiles[slot].rpos += bytes;
  return bytes / sz;
}

int harness_fwrite(const void *ptr, int sz, int n, FILE *fp) {
  int slot = (int)(intptr_t)fp - 1;
  int bytes;
  if (slot < 0 || slot >= MAX_LEVFILES || !levfiles[slot].in_use) return 0;
  bytes = sz * n;
  if (levfiles[slot].size + bytes > MAX_LEVDATA)
    bytes = MAX_LEVDATA - levfiles[slot].size;
  if (bytes <= 0) return 0;
  memcpy(levfiles[slot].data + levfiles[slot].size, ptr, bytes);
  levfiles[slot].size += bytes;
  return bytes / sz;
}

/* ===== Screen capture ===== */
#define MAX_STEPS 8192

static struct {
  char key;
  int  rng[MAX_RNG_PER_STEP];
  int  rng_count;
  char rows[SCRROWS][SCRCOLS + 1];
} steps[MAX_STEPS];
static int step_count = 0;

void harness_capture_screen(void) {
  int r, len;
  if (step_count >= MAX_STEPS) return;
  steps[step_count].key = keys_ptr ? keys_ptr[key_pos - 1] : '?';
  /* Copy and reset the per-step RNG buffer */
  memcpy(steps[step_count].rng, current_rng_buf, current_rng_count * sizeof(int));
  steps[step_count].rng_count = current_rng_count;
  current_rng_count = 0;
  for (r = 0; r < SCRROWS; r++) {
    memcpy(steps[step_count].rows[r], screen[r], SCRCOLS);
    steps[step_count].rows[r][SCRCOLS] = '\0';
    /* Trim trailing spaces */
    len = SCRCOLS;
    while (len > 0 && steps[step_count].rows[r][len-1] == ' ') len--;
    steps[step_count].rows[r][len] = '\0';
  }
  step_count++;
}

/* ===== JSON output (uses real libc I/O) ===== */
static void json_escape(FILE *out, const char *s) {
  fputc('"', out);
  for (; *s; s++) {
    unsigned char c = (unsigned char)*s;
    if (*s == '"')       fputs("\\\"", out);
    else if (*s == '\\') fputs("\\\\", out);
    else if (*s == '\n') fputs("\\n", out);
    else if (*s == '\r') fputs("\\r", out);
    else if (c < 0x20 || c > 0x7e) fprintf(out, "\\u%04x", c);
    else                 fputc(*s, out);
  }
  fputc('"', out);
}

static void emit_session_json(FILE *out, unsigned int seed) {
  int i, r, j, ei;
  fprintf(out, "{\n");
  fprintf(out, "  \"seed\": %u,\n", seed);
  fprintf(out, "  \"steps\": [\n");
  for (i = 0; i < step_count; i++) {
    fprintf(out, "    {\n");
    fprintf(out, "      \"key\": \"");
    char k = steps[i].key;
    if (k == '"')       fprintf(out, "\\\"");
    else if (k == '\\') fprintf(out, "\\\\");
    else if (k >= 32 && k < 127) fputc(k, out);
    else                fprintf(out, "\\u%04x", (unsigned char)k);
    fprintf(out, "\",\n");
    /* Emit rng array interleaved with ^events for this step */
    fprintf(out, "      \"rng\": [");
    ei = 0;
    /* find first event for this step */
    while (ei < g_event_count && g_events[ei].step < i) ei++;
    int first_ei = ei;
    int any = 0;
    int rng_pos = 0;
    ei = first_ei;
    for (j = 0; j < steps[i].rng_count; j++) {
      /* emit any events whose rng_pos <= j */
      while (ei < g_event_count && g_events[ei].step == i && g_events[ei].rng_pos <= j) {
        if (any) fputc(',', out);
        fprintf(out, "\"^%s\"", g_events[ei].msg);
        any = 1;
        ei++;
      }
      if (any) fputc(',', out);
      fprintf(out, "%d", steps[i].rng[j]);
      any = 1;
    }
    /* emit trailing events after last rng value */
    while (ei < g_event_count && g_events[ei].step == i) {
      if (any) fputc(',', out);
      fprintf(out, "\"^%s\"", g_events[ei].msg);
      any = 1;
      ei++;
    }
    fprintf(out, "],\n");
    fprintf(out, "      \"screen\": [\n");
    for (r = 0; r < SCRROWS; r++) {
      fprintf(out, "        ");
      json_escape(out, steps[i].rows[r]);
      if (r < SCRROWS - 1) fputc(',', out);
      fputc('\n', out);
    }
    fprintf(out, "      ]\n");
    fprintf(out, "    }%s\n", (i < step_count - 1) ? "," : "");
  }
  fprintf(out, "  ]\n}\n");
}

/* ===== real-stderr debug (for game code debug) ===== */
void harness_debug(const char *msg) {
  fputs(msg, stderr);
  fputs("\n", stderr);
  fflush(stderr);
}

void harness_debug_fmt(const char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  vfprintf(stderr, fmt, ap);
  va_end(ap);
  fputs("\n", stderr);
  fflush(stderr);
}

/* ===== mklev inline invocation ===== */
/* These globals are defined in hack.main.c */
extern char lock[];
extern char buf[];
extern char dlevel;

/* mklev_main() is mklev.c's main(), renamed via mklev_names.h */
extern int mklev_main(int argc, char **argv);

/* forward declaration for harness_mklev_exit's fallback */
void harness_exit(int code);

/* longjmp target for mklev's exit() — mklev calls exit(0) after savelev() */
static jmp_buf mklev_jmpbuf;
static int mklev_running = 0;

/* Called instead of harness_exit() when inside mklev_main */
void harness_mklev_exit(int code) {
  (void)code;
  if (mklev_running) {
    mklev_running = 0;
    longjmp(mklev_jmpbuf, 1);
  }
  /* Shouldn't be reached; fall back to real exit */
  harness_exit(code);
}

int harness_do_fork(void) {
  /* Instead of fork+exec, call mklev_main() directly.
     The mklev process writes its level data to an in-memory file named lock[].
     hack.lev.c's getlev() then reads it back from that same in-memory buffer.
     mklev calls exit(0) after savelev() — we intercept that with longjmp. */
  char *args[5];
  args[0] = "mklev";
  args[1] = lock;
  args[2] = buf;       /* level type char + null */
  args[3] = buf + 2;   /* dlevel as decimal string */
  args[4] = NULL;
  mklev_running = 1;
  if (setjmp(mklev_jmpbuf) == 0) {
    mklev_main(4, args);
    /* mklev_main returned without calling exit — shouldn't happen */
    mklev_running = 0;
  }
  /* Returns here after mklev's exit(0) via longjmp */
  return 1;  /* pretend to be parent process (PID > 0) */
}

/* ===== exit capture ===== */
static unsigned int g_seed = 42;
static const char *g_outfile = NULL;

void harness_exit(int code) {
  FILE *out;
  (void)code;
  out = g_outfile ? fopen(g_outfile, "w") : stdout;
  if (!out) out = stdout;
  emit_session_json(out, g_seed);
  if (g_outfile && out != stdout) fclose(out);
  exit(0);
}

/* ===== String helpers ===== */
char *harness_index(const char *s, int c) {
  return strchr(s, c);
}

/* ===== game_main() forward declaration ===== */
extern void game_main(void);

/* ===== main() — harness entry point ===== */
int main(int argc, char **argv) {
  unsigned int seed = 42;
  const char *keys = "Q";
  int i;

  for (i = 1; i < argc; i++) {
    if (strcmp(argv[i], "--seed") == 0 && i+1 < argc) seed = (unsigned int)atoi(argv[++i]);
    else if (strcmp(argv[i], "--keys") == 0 && i+1 < argc) keys = argv[++i];
    else if (strcmp(argv[i], "--out") == 0 && i+1 < argc) g_outfile = argv[++i];
  }

  g_seed = seed;
  seed_override = seed;
  has_seed_override = 1;

  screen_clear();
  keys_ptr = keys;
  key_pos = 0;

  /* Run the game. It will call harness_exit() when done. */
  game_main();

  /* Reached if game_main returns without calling exit (shouldn't happen) */
  harness_exit(0);
  return 0;
}
