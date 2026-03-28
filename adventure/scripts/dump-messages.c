/*
 * dump-messages.c — Standalone decoder for adventure LINES[] database.
 * Uses the same MAP2 table and PUTTXT logic as the runtime but without
 * linking misc.o (avoids symbol conflicts and stdout redirect issues).
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "database.h"

extern long LINUSE, TRVS, CLSSES, TRNVLS, TABNDX, HNTMAX;
extern long PTEXT[], RTEXT[], CTEXT[], OBJSND[], OBJTXT[];
extern long STEXT[], LTEXT[], COND[], KEY[], LOCSND[];
extern long LINES[];
extern long CVAL[], TTEXT[], TRNVAL[];
extern long TRAVEL[], KTAB[], ATAB[];
extern long PLAC[], FIXD[];
extern long ACTSPK[];
extern long HINTS[][5];

/* Build MAP2: advent-code → ASCII, matching MPINIT() exactly */
static char MAP2[129];

static void init_map2(void) {
    long MAP1[129];
    static long RUNS[7][2] = {{32,34}, {39,46}, {65,90}, {97,122}, {37,37}, {48,57}, {0,126}};
    for (int i = 1; i <= 128; i++) MAP1[i] = -1;
    long val = 0;
    for (int i = 0; i < 7; i++) {
        for (long j = RUNS[i][0]; j <= RUNS[i][1]; j++) {
            if (MAP1[j+1] < 0) { MAP1[j+1] = val; val++; }
        }
    }
    MAP1[128] = MAP1[10]; /* DEL uses TAB's value */
    MAP1[10] = MAP1[33]; /* TAB maps to space */
    MAP1[11] = MAP1[33]; /* vertical tab too */
    for (int i = 0; i <= 126; i++) {
        long v = MAP1[i+1] + 1;
        if (v >= 0 && v < 129) {
            if (i >= 64)
                MAP2[v] = (char)((i - 64) + '@');
            else
                MAP2[v] = (char)i;
        }
    }
}

/* Decode a single line of packed words from LINES[start..end-1] */
static int decode_line(long start, long end, char *buf, int pos) {
    long state = 0;
    for (long i = start; i <= end; i++) {
        long word = LINES[i];
        if (word == 0 || word == -1) break;
        long div = 64L * 64L * 64L * 64L;
        long w = word;
        for (int j = 0; j < 5; j++) {
            long byte = w / div;
            if (state == 0 && byte == 63) {
                state = 63;
            } else {
                long charIdx = state + byte;
                state = 0;
                long mapIdx = charIdx + 1;
                if (mapIdx >= 0 && mapIdx < 129) {
                    char c = MAP2[mapIdx];
                    buf[pos++] = c ? c : ' ';
                } else {
                    buf[pos++] = ' ';
                }
            }
            w = (w - byte * div) * 64;
        }
    }
    /* Trim trailing spaces on this line */
    while (pos > 0 && buf[pos-1] == ' ') pos--;
    return pos;
}

/* Decode message at LINES[idx] using SPEAK() structure:
 * LINES[K] = end pointer (abs value - 1); negative means continuation.
 * Text at LINES[K+1] through LINES[L].
 * Parameter tokens (%S, %W, etc.) are preserved as-is. */
static char *decode_message(long idx) {
    if (idx <= 0 || idx > LINUSE) return strdup("");
    char *buf = malloc(65536);
    int pos = 0;
    long k = idx;
    int first_line = 1;
    while (1) {
        long marker = LINES[k];
        if (marker == 0) break;
        long L = (marker < 0 ? -marker : marker) - 1;
        if (!first_line) buf[pos++] = '\n';
        first_line = 0;
        pos = decode_line(k + 1, L, buf, pos);
        k = L + 1;
        if (k > LINUSE || LINES[k] < 0) break; /* negative next marker = stop (SPEAK: line 114) */
    }
    /* Trim trailing whitespace */
    while (pos > 0 && (buf[pos-1] == ' ' || buf[pos-1] == '\n'))
        pos--;
    buf[pos] = 0;
    char *result = strdup(buf);
    free(buf);
    return result;
}

/* Decode vocabulary word */
static char *decode_word(long packed) {
    char word[6];
    long div = 64L * 64L * 64L * 64L;
    long w = packed;
    int pos = 0;
    for (int j = 0; j < 5; j++) {
        long byte = w / div;
        if (byte > 0 && byte < 63) {
            long mapIdx = byte + 1;
            if (mapIdx < 129) {
                char c = MAP2[mapIdx];
                if (c > 32) word[pos++] = c;
            }
        }
        w = (w - byte * div) * 64;
    }
    word[pos] = 0;
    return strdup(word);
}

static void json_str(const char *s) {
    putchar('"');
    for (const char *p = s; *p; p++) {
        if (*p == '"') printf("\\\"");
        else if (*p == '\\') printf("\\\\");
        else if (*p == '\n') printf("\\n");
        else if (*p == '\t') printf("\\t");
        else if ((unsigned char)*p < 32) printf("\\u%04x", (unsigned char)*p);
        else putchar(*p);
    }
    putchar('"');
}

static void print_long_array(const char *name, long arr[], int lo, int hi) {
    printf("  \"%s\": [", name);
    for (int i = lo; i <= hi; i++) {
        if (i > lo) putchar(',');
        if ((i - lo) % 20 == 0) printf("\n    ");
        printf("%ld", arr[i]);
    }
    printf("\n  ]");
}

int main(void) {
    init_map2();

    printf("{\n");
    printf("  \"linuse\": %ld,\n", LINUSE);
    printf("  \"trvs\": %ld,\n", TRVS);
    printf("  \"clsses\": %ld,\n", CLSSES);
    printf("  \"trnvls\": %ld,\n", TRNVLS);
    printf("  \"tabndx\": %ld,\n", TABNDX);
    printf("  \"hntmax\": %ld,\n", HNTMAX);

    print_long_array("stext", STEXT, 0, 185); printf(",\n");
    print_long_array("ltext", LTEXT, 0, 185); printf(",\n");
    print_long_array("cond", COND, 0, 185); printf(",\n");
    print_long_array("key", KEY, 0, 185); printf(",\n");
    print_long_array("locsnd", LOCSND, 0, 185); printf(",\n");
    print_long_array("plac", PLAC, 0, 100); printf(",\n");
    print_long_array("fixd", FIXD, 0, 100); printf(",\n");
    print_long_array("ptext", PTEXT, 0, 100); printf(",\n");
    print_long_array("objsnd", OBJSND, 0, 100); printf(",\n");
    print_long_array("objtxt", OBJTXT, 0, 100); printf(",\n");
    print_long_array("rtext", RTEXT, 0, 277); printf(",\n");
    print_long_array("travel", TRAVEL, 0, TRVS); printf(",\n");
    print_long_array("ctext", CTEXT, 0, CLSSES); printf(",\n");
    print_long_array("cval", CVAL, 0, CLSSES); printf(",\n");
    print_long_array("ttext", TTEXT, 0, TRNVLS); printf(",\n");
    print_long_array("trnval", TRNVAL, 0, TRNVLS); printf(",\n");
    print_long_array("actspk", ACTSPK, 0, 35); printf(",\n");

    /* Hints */
    printf("  \"hints\": [\n");
    for (int i = 0; i <= HNTMAX; i++) {
        printf("    [%ld, %ld, %ld, %ld, %ld]", HINTS[i][0], HINTS[i][1],
               HINTS[i][2], HINTS[i][3], HINTS[i][4]);
        if (i < HNTMAX) putchar(',');
        putchar('\n');
    }
    printf("  ],\n");

    /* Decoded messages */
    printf("  \"messages\": {\n");
    int first = 1;
    long indices[20000];
    int nidx = 0;
    for (int i = 0; i <= 185; i++) { if (STEXT[i] > 0) indices[nidx++] = STEXT[i]; }
    for (int i = 0; i <= 185; i++) { if (LTEXT[i] > 0) indices[nidx++] = LTEXT[i]; }
    for (int i = 0; i <= 277; i++) { if (RTEXT[i] > 0) indices[nidx++] = RTEXT[i]; }
    for (int i = 0; i <= 100; i++) {
        long idx = PTEXT[i];
        while (idx > 0 && idx <= LINUSE) {
            indices[nidx++] = idx;
            long next = LINES[idx - 1];
            if (next <= 0 || next == idx) break;
            idx = next;
        }
    }
    for (int i = 0; i <= CLSSES; i++) { if (CTEXT[i] > 0) indices[nidx++] = CTEXT[i]; }
    for (int i = 0; i <= TRNVLS; i++) { if (TTEXT[i] > 0) indices[nidx++] = TTEXT[i]; }
    for (int i = 0; i <= 35; i++) { if (ACTSPK[i] > 0) indices[nidx++] = ACTSPK[i]; }
    for (int i = 0; i <= 185; i++) { if (LOCSND[i] > 0) indices[nidx++] = LOCSND[i]; }
    for (int i = 0; i <= 100; i++) { if (OBJSND[i] > 0) indices[nidx++] = OBJSND[i]; }
    for (int i = 0; i <= 100; i++) { if (OBJTXT[i] > 0) indices[nidx++] = OBJTXT[i]; }
    /* Sort + dedup */
    for (int i = 0; i < nidx - 1; i++)
        for (int j = i + 1; j < nidx; j++)
            if (indices[i] > indices[j]) { long t = indices[i]; indices[i] = indices[j]; indices[j] = t; }
    int uniq = 0;
    for (int i = 0; i < nidx; i++) {
        if (i == 0 || indices[i] != indices[i-1])
            indices[uniq++] = indices[i];
    }
    nidx = uniq;
    for (int i = 0; i < nidx; i++) {
        char *msg = decode_message(indices[i]);
        if (!first) printf(",\n");
        printf("    \"%ld\": ", indices[i]);
        json_str(msg);
        first = 0;
        free(msg);
    }
    printf("\n  },\n");

    /* Vocabulary */
    printf("  \"vocabulary\": [\n");
    for (int i = 1; i <= TABNDX; i++) {
        char *word = decode_word(KTAB[i]);
        printf("    {\"word\": ");
        json_str(word);
        printf(", \"id\": %ld, \"type\": %ld}", ATAB[i] % 1000, ATAB[i] / 1000);
        if (i < TABNDX) putchar(',');
        putchar('\n');
        free(word);
    }
    printf("  ]\n}\n");
    return 0;
}
