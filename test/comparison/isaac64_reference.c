// isaac64_reference.c -- Generate ISAAC64 reference output for comparison tests.
// Compile: gcc -O2 -I../../nethack-c/include -o isaac64_reference isaac64_reference.c
// Usage: ./isaac64_reference <seed> <count>
// Outputs <count> lines of: rn2_value raw_uint64_hex

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

// Inline the ISAAC64 implementation (avoid needing full NetHack build)
#define ISAAC64_SZ_LOG      (8)
#define ISAAC64_SZ          (1<<ISAAC64_SZ_LOG)
#define ISAAC64_SEED_SZ_MAX (ISAAC64_SZ<<3)
#define ISAAC64_MASK ((uint64_t)0xFFFFFFFFFFFFFFFFULL)

struct isaac64_ctx {
    unsigned n;
    uint64_t r[ISAAC64_SZ];
    uint64_t m[ISAAC64_SZ];
    uint64_t a;
    uint64_t b;
    uint64_t c;
};

static inline uint32_t lower_bits(uint64_t x) {
    return (x & ((ISAAC64_SZ-1) << 3)) >> 3;
}

static inline uint32_t upper_bits(uint64_t y) {
    return (y >> (ISAAC64_SZ_LOG+3)) & (ISAAC64_SZ-1);
}

static void isaac64_mix(uint64_t _x[8]) {
    static const unsigned char SHIFT[8] = {9,9,23,15,14,20,17,14};
    int i;
    for (i = 0; i < 8; i++) {
        _x[i] -= _x[(i+4)&7];
        _x[(i+5)&7] ^= _x[(i+7)&7] >> SHIFT[i];
        _x[(i+7)&7] += _x[i];
        i++;
        _x[i] -= _x[(i+4)&7];
        _x[(i+5)&7] ^= _x[(i+7)&7] << SHIFT[i];
        _x[(i+7)&7] += _x[i];
    }
}

static void isaac64_update(struct isaac64_ctx *_ctx) {
    uint64_t *m = _ctx->m;
    uint64_t *r = _ctx->r;
    uint64_t a = _ctx->a;
    uint64_t b = _ctx->b + (++_ctx->c);
    int i;

    for (i = 0; i < ISAAC64_SZ/2; i++) {
        uint64_t x, y;
        x = m[i];
        a = ~(a^a<<21) + m[i+ISAAC64_SZ/2];
        m[i] = y = m[lower_bits(x)] + a + b;
        r[i] = b = m[upper_bits(y)] + x;
        x = m[++i];
        a = (a^a>>5) + m[i+ISAAC64_SZ/2];
        m[i] = y = m[lower_bits(x)] + a + b;
        r[i] = b = m[upper_bits(y)] + x;
        x = m[++i];
        a = (a^a<<12) + m[i+ISAAC64_SZ/2];
        m[i] = y = m[lower_bits(x)] + a + b;
        r[i] = b = m[upper_bits(y)] + x;
        x = m[++i];
        a = (a^a>>33) + m[i+ISAAC64_SZ/2];
        m[i] = y = m[lower_bits(x)] + a + b;
        r[i] = b = m[upper_bits(y)] + x;
    }
    for (i = ISAAC64_SZ/2; i < ISAAC64_SZ; i++) {
        uint64_t x, y;
        x = m[i];
        a = ~(a^a<<21) + m[i-ISAAC64_SZ/2];
        m[i] = y = m[lower_bits(x)] + a + b;
        r[i] = b = m[upper_bits(y)] + x;
        x = m[++i];
        a = (a^a>>5) + m[i-ISAAC64_SZ/2];
        m[i] = y = m[lower_bits(x)] + a + b;
        r[i] = b = m[upper_bits(y)] + x;
        x = m[++i];
        a = (a^a<<12) + m[i-ISAAC64_SZ/2];
        m[i] = y = m[lower_bits(x)] + a + b;
        r[i] = b = m[upper_bits(y)] + x;
        x = m[++i];
        a = (a^a>>33) + m[i-ISAAC64_SZ/2];
        m[i] = y = m[lower_bits(x)] + a + b;
        r[i] = b = m[upper_bits(y)] + x;
    }
    _ctx->b = b;
    _ctx->a = a;
    _ctx->n = ISAAC64_SZ;
}

static void isaac64_init(struct isaac64_ctx *_ctx,
                         const unsigned char *_seed, int _nseed) {
    _ctx->a = _ctx->b = _ctx->c = 0;
    memset(_ctx->r, 0, sizeof(_ctx->r));
    // reseed inline
    uint64_t *m = _ctx->m;
    uint64_t *r = _ctx->r;
    uint64_t x[8];
    int i, j;

    if (_nseed > ISAAC64_SEED_SZ_MAX) _nseed = ISAAC64_SEED_SZ_MAX;
    for (i = 0; i < _nseed>>3; i++) {
        r[i] ^= (uint64_t)_seed[i<<3|7]<<56 | (uint64_t)_seed[i<<3|6]<<48 |
                 (uint64_t)_seed[i<<3|5]<<40 | (uint64_t)_seed[i<<3|4]<<32 |
                 (uint64_t)_seed[i<<3|3]<<24 | (uint64_t)_seed[i<<3|2]<<16 |
                 (uint64_t)_seed[i<<3|1]<<8  | _seed[i<<3];
    }
    _nseed -= i<<3;
    if (_nseed > 0) {
        uint64_t ri = _seed[i<<3];
        for (j = 1; j < _nseed; j++)
            ri |= (uint64_t)_seed[i<<3|j] << (j<<3);
        r[i++] ^= ri;
    }

    x[0]=x[1]=x[2]=x[3]=x[4]=x[5]=x[6]=x[7]=(uint64_t)0x9E3779B97F4A7C13ULL;
    for (i = 0; i < 4; i++) isaac64_mix(x);
    for (i = 0; i < ISAAC64_SZ; i += 8) {
        for (j = 0; j < 8; j++) x[j] += r[i+j];
        isaac64_mix(x);
        memcpy(m+i, x, sizeof(x));
    }
    for (i = 0; i < ISAAC64_SZ; i += 8) {
        for (j = 0; j < 8; j++) x[j] += m[i+j];
        isaac64_mix(x);
        memcpy(m+i, x, sizeof(x));
    }
    isaac64_update(_ctx);
}

static uint64_t isaac64_next_uint64(struct isaac64_ctx *_ctx) {
    if (!_ctx->n) isaac64_update(_ctx);
    return _ctx->r[--_ctx->n];
}

int main(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <seed> <count>\n", argv[0]);
        return 1;
    }
    unsigned long seed = strtoul(argv[1], NULL, 10);
    int count = atoi(argv[2]);

    // Convert seed to 8 little-endian bytes (matching init_isaac64 in rnd.c)
    unsigned char seed_bytes[8];
    unsigned long s = seed;
    for (int i = 0; i < 8; i++) {
        seed_bytes[i] = (unsigned char)(s & 0xFF);
        s >>= 8;
    }

    struct isaac64_ctx ctx;
    isaac64_init(&ctx, seed_bytes, 8);

    // Output raw uint64 values and rn2(100) values
    for (int i = 0; i < count; i++) {
        uint64_t raw = isaac64_next_uint64(&ctx);
        printf("%016llx %d\n", (unsigned long long)raw, (int)(raw % 100));
    }
    return 0;
}
