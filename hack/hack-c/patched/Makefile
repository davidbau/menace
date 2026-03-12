# Makefile for patched Hack 1982 harness
# Builds hack_harness — a deterministic binary with seed control and JSON output

CC = gcc

# Base flags for all compilation
CFLAGS = -g -O0 -DVTONL -DHARNESS -DSEED_CONTROL \
         -Wno-implicit-function-declaration \
         -Wno-implicit-int \
         -Wno-return-type \
         -Wno-int-conversion

# Flags for game source files (add hack_patch.h injection)
GAME_CFLAGS = $(CFLAGS) -include hack_patch.h

# Harness infrastructure (compiled without game patch macros)
HARNESS_SRCS = hack_harness.c rng_log.c
HARNESS_OBJS = $(HARNESS_SRCS:.c=.o)

# Standard game source files (patched via -include hack_patch.h)
STD_SRCS = rnd.c hack.c hack.do.c hack.do1.c hack.lev.c hack.mon.c hack.pri.c
STD_OBJS = $(STD_SRCS:.c=.o)

# hack.main.c: also rename main() → game_main()
HACKMAIN_OBJ = hack.main.o

# mklev.c: rename all conflicting symbols via mklev_names.h
MKLEV_OBJ = mklev.o

OBJS = $(HARNESS_OBJS) $(STD_OBJS) $(HACKMAIN_OBJ) $(MKLEV_OBJ)

all: hack_harness

hack_harness: $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

# Harness files: no game patch macros
$(HARNESS_OBJS): %.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

# Standard game files: inject hack_patch.h
$(STD_OBJS): %.o: %.c hack_patch.h
	$(CC) $(GAME_CFLAGS) -c -o $@ $<

# hack.main.c: inject hack_patch.h + rename main
hack.main.o: hack.main.c hack_patch.h hack_main_rename.h
	$(CC) $(GAME_CFLAGS) -include hack_main_rename.h -c -o $@ $<

# mklev.c: inject hack_patch.h + rename conflicting symbols
mklev.o: mklev.c hack_patch.h mklev_names.h
	$(CC) $(GAME_CFLAGS) -include mklev_names.h -c -o $@ $<

clean:
	rm -f $(OBJS) hack_harness

.PHONY: all clean
