// calendar.js -- Time routines
// Faithful port of calendar.c from NetHack 3.7.
//
// The time is used for:
//  - seed for rand()
//  - year on tombstone and yyyymmdd in record file
//  - phase of the moon (various monsters react to NEW_MOON or FULL_MOON)
//  - night and midnight (the undead are dangerous at midnight)
//  - determination of what files are "very old"

// cf. calendar.c:32
export function getnow() {
    const fixed_dt = (typeof process !== 'undefined' && process?.env?.NETHACK_FIXED_DATETIME)
        || undefined;
    if (fixed_dt) {
        const parsed = time_from_yyyymmddhhmmss(fixed_dt);
        if (parsed !== 0) return parsed;
    }
    return Math.floor(Date.now() / 1000);
}

// cf. calendar.c:46
function getlt() {
    const d = new Date(getnow() * 1000);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const tm_yday = Math.floor((d - jan1) / 86400000);
    return {
        tm_year: d.getFullYear() - 1900,
        tm_mon: d.getMonth(),
        tm_mday: d.getDate(),
        tm_hour: d.getHours(),
        tm_min: d.getMinutes(),
        tm_sec: d.getSeconds(),
        tm_wday: d.getDay(),
        tm_yday,
    };
}

// cf. calendar.c:55
// Autotranslated from calendar.c:54
export function getyear() {
  return (1900 + getlt().tm_year);
}

// cf. calendar.c:62
export function yyyymmdd(date) {
    const d = (date === 0 || date === undefined) ? null : new Date(date * 1000);
    const lt = d ? null : getlt();
    const year = d ? d.getFullYear() : (1900 + lt.tm_year);
    let datenum = year < 1970 ? year + 2000 : year;
    datenum = datenum * 100 + (d ? (d.getMonth() + 1) : (lt.tm_mon + 1));
    datenum = datenum * 100 + (d ? d.getDate() : lt.tm_mday);
    return datenum;
}

// cf. calendar.c:86
export function hhmmss(date) {
    const d = (date === 0 || date === undefined) ? null : new Date(date * 1000);
    if (d) return d.getHours() * 10000 + d.getMinutes() * 100 + d.getSeconds();
    const lt = getlt();
    return lt.tm_hour * 10000 + lt.tm_min * 100 + lt.tm_sec;
}

// cf. calendar.c:101
export function yyyymmddhhmmss(date) {
    const d = (date === 0 || date === undefined) ? null : new Date(date * 1000);
    const lt = d ? null : getlt();
    const year = d ? d.getFullYear() : (1900 + lt.tm_year);
    const datenum = year < 1970 ? year + 2000 : year;
    return String(datenum).padStart(4, '0')
        + String(d ? (d.getMonth() + 1) : (lt.tm_mon + 1)).padStart(2, '0')
        + String(d ? d.getDate() : lt.tm_mday).padStart(2, '0')
        + String(d ? d.getHours() : lt.tm_hour).padStart(2, '0')
        + String(d ? d.getMinutes() : lt.tm_min).padStart(2, '0')
        + String(d ? d.getSeconds() : lt.tm_sec).padStart(2, '0');
}

// cf. calendar.c:126
export function time_from_yyyymmddhhmmss(buf) {
    if (typeof buf !== 'string' || buf.length !== 14) return 0;
    const y  = Number.parseInt(buf.slice(0, 4), 10);
    const mo = Number.parseInt(buf.slice(4, 6), 10);
    const md = Number.parseInt(buf.slice(6, 8), 10);
    const h  = Number.parseInt(buf.slice(8, 10), 10);
    const mi = Number.parseInt(buf.slice(10, 12), 10);
    const s  = Number.parseInt(buf.slice(12, 14), 10);
    const ms = new Date(y, mo - 1, md, h, mi, s).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 0;
    return Math.floor(ms / 1000);
}

// cf. calendar.c:200
// Autotranslated from calendar.c:199
export function phase_of_the_moon() {
  let lt = getlt(), epact, diy, goldn;
  diy = lt.tm_yday;
  goldn = (lt.tm_year % 19) + 1;
  epact = (11 * goldn + 18) % 30;
  if ((epact === 25 && goldn > 11) || epact === 24) epact++;
  return ((((((diy + epact) * 6) + 11) % 177) / 22) & 7);
}

// cf. calendar.c:215
// Autotranslated from calendar.c:214
export function friday_13th() {
  let lt = getlt();
  return (lt.tm_wday === 5 && lt.tm_mday === 13);
}

// cf. calendar.c:224
// Autotranslated from calendar.c:223
export function night() {
  let hour = getlt().tm_hour;
  return (hour < 6 || hour > 21);
}

// cf. calendar.c:232
// Autotranslated from calendar.c:231
export function midnight() {
  return (getlt().tm_hour === 0);
}
