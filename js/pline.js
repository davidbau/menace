// pline.js -- NetHack-like message primitives.
// This module centralizes common message entry points that map C code calls.

const PLINE_URGENT = 1 << 0;
const PLINE_NOREP = 1 << 1;

const NOREPEAT = '___PLINE_NO_REPEAT___';

let _outputContext = null;
let _lastMessage = NOREPEAT;
const _pendingContext = {
    dir: null,
    x: null,
    y: null,
};

const _gameLog = [];
const _liveLog = [];
const _dumpLog = [];

function safeString(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    return String(value);
}

function getOutputContext() {
    if (_outputContext && typeof _outputContext.putstr_message === 'function') {
        return _outputContext;
    }
    if (typeof _outputContext === 'function') {
        return { putstr_message: _outputContext };
    }
    return { putstr_message: (text) => {
        if (typeof console !== 'undefined' && console.log) {
            console.log(safeString(text));
        }
    } };
}

export function setOutputContext(context) {
    _outputContext = context || null;
}

function clearTransientContext() {
    _pendingContext.dir = null;
    _pendingContext.x = null;
    _pendingContext.y = null;
}

export function set_msg_dir(dir) {
    _pendingContext.dir = Number.isFinite(dir) ? dir : null;
}

export function set_msg_xy(x, y) {
    _pendingContext.x = Number.isFinite(x) ? x : null;
    _pendingContext.y = Number.isFinite(y) ? y : null;
}

function formatLine(format, args) {
    if (!format) return '';
    if (typeof format !== 'string') return safeString(format);
    if (!Array.isArray(args) || args.length === 0) return format;

    let out = '';
    let argIndex = 0;
    for (let i = 0; i < format.length; i++) {
        const ch = format[i];
        if (ch !== '%' || i === format.length - 1) {
            out += ch;
            continue;
        }
        const spec = format[i + 1];
        if (spec === '%') {
            out += '%';
            i += 1;
            continue;
        }

        const arg = args[argIndex++];
        switch (spec) {
        case 's':
            out += safeString(arg);
            break;
        case 'd':
        case 'i':
            out += Number.isFinite(Number(arg)) ? Math.trunc(Number(arg)).toString() : '0';
            break;
        case 'u':
            out += Number.isFinite(Number(arg)) ? Math.abs(Math.trunc(Number(arg))).toString() : '0';
            break;
        case 'f':
            out += Number.isFinite(Number(arg)) ? Number(arg).toString() : '0';
            break;
        case 'c':
            out += safeString(String.fromCharCode(Number.isFinite(Number(arg)) ? Number(arg) : 0));
            break;
        default:
            out += `%${spec}`;
            if (arg !== undefined) {
                out += safeString(arg);
            }
            break;
        }
        i += 1;
    }

    return out;
}

function emitMessage(message, pflags = 0) {
    const text = safeString(message);
    const shouldHide = ((pflags & PLINE_NOREP) !== 0) && text === _lastMessage;
    if (shouldHide) {
        clearTransientContext();
        return false;
    }

    getOutputContext().putstr_message(text);
    _lastMessage = text;
    clearTransientContext();
    return true;
}

export function custompline(pflags, line, ...args) {
    const flags = Number.isFinite(pflags) ? pflags : 0;
    const text = formatLine(line, args);
    return emitMessage(text, flags);
}

export function pline(line, ...args) {
    return custompline(0, line, ...args);
}

export function vpline(line, args) {
    const actualArgs = Array.isArray(args) ? args : [];
    return pline(line, ...actualArgs);
}

export function raw_printf(line, ...args) {
    return vraw_printf(line, args);
}

export function vraw_printf(line, args) {
    // raw_printf skips repeat suppression/history processing by design in C.
    const text = formatLine(line, Array.isArray(args) ? args : []);
    return getOutputContext().putstr_message(text);
}

export function urgent_pline(line, ...args) {
    return custompline(PLINE_URGENT, line, ...args);
}

export function Norep(line, ...args) {
    return custompline(PLINE_NOREP, line, ...args);
}

export function pline_dir(dir, line, ...args) {
    set_msg_dir(dir);
    return pline(line, ...args);
}

export function pline_xy(x, y, line, ...args) {
    set_msg_xy(x, y);
    return pline(line, ...args);
}

export function pline_mon(mon, line, ...args) {
    if (mon && Number.isFinite(mon.mx) && Number.isFinite(mon.my)) {
        return pline_xy(mon.mx, mon.my, line, ...args);
    }
    return pline(line, ...args);
}

export function You(line, ...args) {
    return pline(`You ${formatLine(line, args)}`);
}

export function Your(line, ...args) {
    return pline(`Your ${formatLine(line, args)}`);
}

export function You_feel(line, ...args) {
    return pline(`You feel ${formatLine(line, args)}`);
}

export function You_cant(line, ...args) {
    return pline(`You can't ${formatLine(line, args)}`);
}

export function pline_The(line, ...args) {
    return pline(`The ${formatLine(line, args)}`);
}

export function There(line, ...args) {
    return pline(`There ${formatLine(line, args)}`);
}

export function You_hear(line, ...args) {
    return pline(`You hear ${formatLine(line, args)}`);
}

export function You_see(line, ...args) {
    return pline(`You see ${formatLine(line, args)}`);
}

export function verbalize(line, ...args) {
    return pline(`"${formatLine(line, args)}"`);
}

export function You_buf(siz) {
    return ''.padEnd(Math.max(0, Math.trunc(siz || 0)), ' ');
}

export function free_youbuf() {
    return;
}

export function dumplogmsg(line) {
    const text = safeString(line);
    _dumpLog.push(text);
    if (_dumpLog.length > 512) {
        _dumpLog.shift();
    }
}

export function dumplogfreemessages() {
    _dumpLog.length = 0;
}

export function getDumpLog() {
    return _dumpLog.slice();
}

export function gamelog_add(_glflags, _gltime, str) {
    const text = safeString(str);
    _gameLog.push(text);
    if (_gameLog.length > 500) {
        _gameLog.shift();
    }
    return text;
}

export function livelog_printf(_lltype, line, ...args) {
    const text = formatLine(line, args);
    _liveLog.push(`${new Date().toISOString()} ${text}`);
    if (_liveLog.length > 500) {
        _liveLog.shift();
    }
    return text;
}

export function impossible(s, ...args) {
    const text = formatLine(s, args);
    _gameLog.push(text);
    if (typeof console !== 'undefined' && console.error) {
        console.error(`impossible: ${text}`);
    }
    return text;
}

export function execplinehandler(line) {
    if (typeof console !== 'undefined' && console.info) {
        console.info(`pline handler: ${safeString(line)}`);
    }
}

export function nhassert_failed(expression, filepath, line) {
    const msg = `NetHack assertion failed: ${safeString(expression)} at ${safeString(filepath)}:${line}`;
    impossible(msg);
    if (typeof console !== 'undefined' && console.error) {
        console.error(msg);
    }
    throw new Error(msg);
}

export function plineFlags() {
    return { PLINE_URGENT, PLINE_NOREP };
}

export function resetPlineState() {
    _lastMessage = NOREPEAT;
    clearTransientContext();
}
