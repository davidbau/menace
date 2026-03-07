/*
 * harness_rename.h — Rename main() to game_main() in main.c
 */

/* Rename main to game_main so harness_main.c can provide main() */
#define main game_main

/* getchar calls in save.c / init.c: redirect to harness_next_key */
#define getchar harness_next_key
