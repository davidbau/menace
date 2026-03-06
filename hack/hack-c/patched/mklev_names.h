/*
 * mklev_names.h — Rename mklev.c globals/functions to avoid link conflicts.
 * Included only when compiling mklev.c.
 *
 * mklev.c was originally a separate binary with its own copies of game data.
 * When linked into the harness as a single binary, its symbols conflict with
 * the game's copies. We rename them all with an ML_ prefix.
 */

/* Data globals that conflict with hack.main.c / hack.vars */
#define levl      ML_levl
#define fmon      ML_fmon
#define fobj      ML_fobj
#define fgold     ML_fgold
#define ftrap     ML_ftrap
#define dlevel    ML_dlevel
#define nul       ML_nul
#define dx        ML_dx
#define dy        ML_dy
#define xdnstair  ML_xdnstair
#define xupstair  ML_xupstair
#define ydnstair  ML_ydnstair
#define yupstair  ML_yupstair

/* Functions that conflict with hack.c / hack.lev.c / hack.mon.c / hack.pri.c */
#define g_at      ML_g_at
#define mkobj     ML_mkobj
#define makemon   ML_makemon
#define panic     ML_panic
#define savelev   ML_savelev
#define main      mklev_main

/* exit() inside mklev must NOT terminate the whole process.
   Override harness_exit (from hack_patch.h) with a longjmp-based version. */
extern void harness_mklev_exit(int code);
#undef exit
#define exit(c)   harness_mklev_exit(c)
