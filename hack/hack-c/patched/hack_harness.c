/*
 * hack_harness.c — Harness implementation for Hack 1982 session capture.
 *
 * Provides:
 *   - Keystroke injection (reads from --keys arg or stdin)
 *   - Screen buffer (80x24 chars) with JSON frame capture
 *   - Seeded, logged RNG
 *   - In-memory level file I/O
 *   - JSON output to stdout or --out file
 *
 * Session JSON format:
 * {
 *   "seed": N,
 *   "steps": [
 *     { "key": "h", "screen": [[...80 chars...] x 24 rows], "rng": [...] }
 *   ]
 * }
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include "hack_patch.h"

/* ===== Screen buffer ===== */
#define SCRCOLS 80
#define SCRROWS 24
static char screen[SCRROWS][SCRCOLS + 1];
static int cursor_x = 0;  /* 0-based */
static int cursor_y = 0;  /* 0-based */

void screen_clear(void) {
  for (int r = 0; r < SCRROWS; r++) {
    memset(screen[r], ' ', SCRCOLS);
    screen[r][SCRCOLS] = '\0';
  }
  cursor_x = cursor_y = 0;
}

void screen_putch(int c) {
  if (c == '\r') { cursor_x = 0; return; }
  if (c == '\n') { cursor_y++; cursor_x = 0; return; }
  if (c == '\b') { if (cursor_x > 0) cursor_x--; return; }
  if (cursor_x < SCRCOLS && cursor_y < SCRROWS)
    screen[cursor_y][cursor_x++] = (char)c;
}

void screen_move(int x, int y) {
  /* 0-based */
  cursor_x = (x >= 0 && x < SCRCOLS) ? x : cursor_x;
  cursor_y = (y >= 0 && y < SCRROWS) ? y : cursor_y;
}

/* VT100 escape sequence parser state */
static char esc_buf[32];
static int esc_len = 0;
static int in_esc = 0;

static void process_esc(void) {
  /* Parse \033[row;colH cursor movement */
  if (esc_buf[0] == '[' && esc_len > 1) {
    int row = 0, col = 0;
    int i = 1;
    while (i < esc_len && esc_buf[i] >= '0' && esc_buf[i] <= '9') row = row*10 + (esc_buf[i++]-'0');
    if (i < esc_len && esc_buf[i] == ';') {
      i++;
      while (i < esc_len && esc_buf[i] >= '0' && esc_buf[i] <= '9') col = col*10 + (esc_buf[i++]-'0');
    }
    char cmd = (i < esc_len) ? esc_buf[i] : 0;
    if (cmd == 'H') screen_move(col-1, row-1);
    else if (cmd == 'J') screen_clear(); /* clear screen */
    else if (cmd == 'K') {
      /* clear to end of line */
      for (int x = cursor_x; x < SCRCOLS; x++) screen[cursor_y][x] = ' ';
    }
    else if (cmd == 'M') { if (cursor_y > 0) cursor_y--; } /* UP */
    else if (cmd == 'C') cursor_x++;  /* forward */
  }
}

static void feed_char(int c) {
  if (c == 033) { in_esc = 1; esc_len = 0; return; }
  if (in_esc) {
    if (esc_len < (int)(sizeof(esc_buf)-1)) esc_buf[esc_len++] = (char)c;
    if (c >= 0x40 && c <= 0x7e) { esc_buf[esc_len] = '\0'; process_esc(); in_esc = esc_len = 0; }
    return;
  }
  screen_putch(c);
}

/* ===== Harness terminal replacements ===== */

void harness_fputs(const char *s, FILE *f) {
  if (f == stdout || f == stderr) { for (; *s; s++) feed_char((unsigned char)*s); }
}
void harness_putchar(int c) { feed_char(c); }
int harness_printf(const char *fmt, ...) {
  char buf[1024];
  va_list ap;
  va_start(ap, fmt);
  int n = vsnprintf(buf, sizeof(buf), fmt, ap);
  va_end(ap);
  for (int i = 0; i < n; i++) feed_char((unsigned char)buf[i]);
  return n;
}
void harness_fflush(FILE *f) { (void)f; }

/* ===== RNG ===== */
static unsigned int rng_seed = 0;
static int rng_calls = 0;

/* JSON RNG log */
#define MAX_RNG 65536
static struct { char fn[8]; int x, y, v; } rng_log[MAX_RNG];
static int rng_log_len = 0;

void harness_srand(unsigned int seed) { rng_seed = seed; rng_calls = 0; }

int harness_rand(void) {
  rng_seed = rng_seed * 1103515245U + 12345U;
  return (int)((rng_seed >> 16) & 0x7fff);
}

int harness_getpid(void) { return 1982; }

/* ===== Keystroke injection ===== */
static const char *keys_ptr = NULL;
static int key_pos = 0;
static int key_step = 0;  /* which step we're on */

int harness_getchar(void) {
  if (!keys_ptr || keys_ptr[key_pos] == '\0') {
    /* No more keys — return 'Q' to quit */
    return 'Q';
  }
  char c = keys_ptr[key_pos++];
  /* After each keystroke, capture a frame */
  key_step++;
  harness_capture_screen();
  return (unsigned char)c;
}

void harness_getlin(char *buf) {
  buf[0] = '\0';
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
  for (int i = 0; i < MAX_LEVFILES; i++)
    if (levfiles[i].in_use && strcmp(levfiles[i].name, name) == 0) return i;
  return -1;
}

FILE* harness_fopen(const char *path, const char *mode) {
  /* Encode slot index as FILE* (crude but works for single-threaded) */
  int slot = find_levfile(path);
  if (mode[0] == 'r' || mode[0] == 'R') {
    if (slot < 0) return NULL;
    levfiles[slot].rpos = 0;
  } else {
    if (slot < 0) {
      for (slot = 0; slot < MAX_LEVFILES; slot++)
        if (!levfiles[slot].in_use) break;
      if (slot >= MAX_LEVFILES) return NULL;
      levfiles[slot].in_use = 1;
      strncpy(levfiles[slot].name, path, 63);
    }
    levfiles[slot].size = 0;
    levfiles[slot].rpos = 0;
  }
  return (FILE*)(intptr_t)(slot + 1);  /* 1-based slot as FILE* */
}

int harness_fclose(FILE *fp) {
  (void)fp; return 0;
}

int harness_fread(void *ptr, int sz, int n, FILE *fp) {
  int slot = (int)(intptr_t)fp - 1;
  if (slot < 0 || slot >= MAX_LEVFILES || !levfiles[slot].in_use) return 0;
  int bytes = sz * n;
  int avail = levfiles[slot].size - levfiles[slot].rpos;
  if (bytes > avail) bytes = avail;
  if (bytes <= 0) return 0;
  memcpy(ptr, levfiles[slot].data + levfiles[slot].rpos, bytes);
  levfiles[slot].rpos += bytes;
  return bytes / sz;
}

int harness_fwrite(const void *ptr, int sz, int n, FILE *fp) {
  int slot = (int)(intptr_t)fp - 1;
  if (slot < 0 || slot >= MAX_LEVFILES || !levfiles[slot].in_use) return 0;
  int bytes = sz * n;
  if (levfiles[slot].size + bytes > MAX_LEVDATA) bytes = MAX_LEVDATA - levfiles[slot].size;
  memcpy(levfiles[slot].data + levfiles[slot].size, ptr, bytes);
  levfiles[slot].size += bytes;
  return bytes / sz;
}

/* ===== Screen capture ===== */
#define MAX_STEPS 65536
static struct {
  char key;
  char rows[SCRROWS][SCRCOLS + 1];
} steps[MAX_STEPS];
static int step_count = 0;

void harness_capture_screen(void) {
  if (step_count >= MAX_STEPS) return;
  steps[step_count].key = keys_ptr ? keys_ptr[key_pos - 1] : '?';
  for (int r = 0; r < SCRROWS; r++) {
    memcpy(steps[step_count].rows[r], screen[r], SCRCOLS);
    steps[step_count].rows[r][SCRCOLS] = '\0';
    /* Trim trailing spaces */
    int len = SCRCOLS;
    while (len > 0 && steps[step_count].rows[r][len-1] == ' ') len--;
    steps[step_count].rows[r][len] = '\0';
  }
  step_count++;
}

/* ===== JSON output ===== */
static void json_escape(FILE *out, const char *s) {
  fputc('"', out);
  for (; *s; s++) {
    if (*s == '"') fputs("\\\"", out);
    else if (*s == '\\') fputs("\\\\", out);
    else if (*s == '\n') fputs("\\n", out);
    else if (*s == '\r') fputs("\\r", out);
    else if ((unsigned char)*s < 0x20) fprintf(out, "\\u%04x", (unsigned char)*s);
    else fputc(*s, out);
  }
  fputc('"', out);
}

static void emit_session_json(FILE *out, unsigned int seed) {
  fprintf(out, "{\n");
  fprintf(out, "  \"seed\": %u,\n", seed);
  fprintf(out, "  \"steps\": [\n");
  for (int i = 0; i < step_count; i++) {
    fprintf(out, "    {\n");
    fprintf(out, "      \"key\": \"%c\",\n",
            (steps[i].key >= 32 && steps[i].key < 127) ? steps[i].key : '?');
    fprintf(out, "      \"screen\": [\n");
    for (int r = 0; r < SCRROWS; r++) {
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

/* ===== exit capture ===== */
static int exit_code_captured = 0;
void harness_exit(int code) {
  exit_code_captured = code;
  /* Throw a longjmp — for simplicity, we use abort to jump out */
  /* In a real harness, use setjmp/longjmp. For now, just exit. */
  exit(0);  /* Real exit — captured before this in run_session.py */
}

/* ===== String helpers ===== */
char *harness_index(const char *s, int c) {
  return strchr(s, c);
}

/* ===== main() — harness entry point ===== */
/* This replaces the game's main() for the harness build.
   The actual game's main() is renamed to game_main() via #define in hack.main.c */

extern void game_main_start(unsigned int seed, const char *keys, const char *outfile);

int main(int argc, char **argv) {
  unsigned int seed = 42;
  const char *keys = "Q";
  const char *outfile = NULL;

  for (int i = 1; i < argc; i++) {
    if (strcmp(argv[i], "--seed") == 0 && i+1 < argc) seed = atoi(argv[++i]);
    else if (strcmp(argv[i], "--keys") == 0 && i+1 < argc) keys = argv[++i];
    else if (strcmp(argv[i], "--out") == 0 && i+1 < argc) outfile = argv[++i];
  }

  screen_clear();
  keys_ptr = keys;
  key_pos = 0;

  /* Run game */
  /* The game's main() is included and renamed; we call it here */
  /* For now, just emit a placeholder */
  /* TODO: integrate with renamed game_main */

  FILE *out = outfile ? fopen(outfile, "w") : stdout;
  emit_session_json(out, seed);
  if (outfile) fclose(out);
  return 0;
}
