// test/comparison/session_datetime.js -- Session datetime resolution helpers.

function isFourteenDigitDatetime(value) {
    return typeof value === 'string' && /^\d{14}$/.test(value);
}

export function recordedAtToDatetime(recordedAt) {
    if (typeof recordedAt !== 'string' || recordedAt.length === 0) return null;
    const d = new Date(recordedAt);
    if (!Number.isFinite(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const h = d.getUTCHours();
    const mi = d.getUTCMinutes();
    const s = d.getUTCSeconds();
    return `${String(y).padStart(4, '0')}${String(mo).padStart(2, '0')}${String(day).padStart(2, '0')}`
        + `${String(h).padStart(2, '0')}${String(mi).padStart(2, '0')}${String(s).padStart(2, '0')}`;
}

export function resolveSessionFixedDatetime(session, sourcePref = 'session') {
    const candidate = session?.meta?.options?.datetime || session?.meta?.regen?.datetime;
    const fromSession = isFourteenDigitDatetime(candidate) ? candidate : null;
    const recordedAt = session?.meta?.options?.recordedAt || session?.meta?.regen?.recordedAt;
    const fromRecordedAt = recordedAtToDatetime(recordedAt);
    if (sourcePref === 'recorded-at-only') return fromRecordedAt || null;
    if (sourcePref === 'recorded-at-prefer') return fromRecordedAt || fromSession || null;
    if (sourcePref === 'session') return fromSession || fromRecordedAt || null;
    return fromSession || fromRecordedAt || null;
}

