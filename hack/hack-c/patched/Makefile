# Makefile for patched Hack 1982 harness
# Builds hack_harness — a deterministic binary with seed control and JSON output

CC = gcc
CFLAGS = -g -O0 -DSMALL -DVTONL -DHARNESS -DSEED_CONTROL \
         -Wno-implicit-function-declaration \
         -Wno-implicit-int \
         -Wno-return-type

SRCS = hack_harness.c rng_log.c \
       hack.c hack.do.c hack.do1.c hack.lev.c hack.main.c \
       hack.mon.c hack.pri.c mklev.c

OBJS = $(SRCS:.c=.o)

all: hack_harness

hack_harness: $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c hack_patch.h
	$(CC) $(CFLAGS) -c -o $@ $<

clean:
	rm -f $(OBJS) hack_harness

.PHONY: all clean
