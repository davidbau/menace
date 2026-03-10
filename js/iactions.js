// iactions.js -- Item actions menu helpers
// cf. iactions.c — item_naming_classification, item_reading_classification,
//                  ia_addmenu, itemactions_pushkeys, itemactions

import {
    objectData,
    SCROLL_CLASS,
    SPBOOK_CLASS,
    FORTUNE_COOKIE,
    T_SHIRT,
    ALCHEMY_SMOCK,
    HAWAIIAN_SHIRT,
    SCR_BLANK_PAPER,
    SPE_NOVEL,
    SPE_BLANK_PAPER,
    SPE_BOOK_OF_THE_DEAD,
} from './objects.js';

// Action-classification return codes (minimal JS-compatible surface).
const IA_NONE = 0;
const IA_NAMING = 1;
const IA_READING = 2;

// Action identifiers for itemactions_pushkeys/itemactions menu rows.
const IA_ACT_READ = 'read';
const IA_ACT_NAME = 'name-item';
const IA_ACT_CALL = 'call-kind';
const IA_ACT_WIELD = 'wield';
const IA_ACT_DROP = 'drop';

function setOut(outbuf, text) {
    if (outbuf && typeof outbuf === 'object') {
        if ('value' in outbuf) outbuf.value = text;
        if ('text' in outbuf) outbuf.text = text;
    }
}

// cf. iactions.c:46 [static] — item_naming_classification()
export function item_naming_classification(obj, onamebuf, ocallbuf) {
    if (!obj) {
        setOut(onamebuf, '');
        setOut(ocallbuf, '');
        return IA_NONE;
    }

    const od = objectData[obj.otyp] || {};
    const hasObjName = !!(obj.oname && String(obj.oname).length);
    const hasTypeCall = !!(od.oc_uname && String(od.oc_uname).length);

    setOut(onamebuf, hasObjName ? 'Rename this item' : 'Name this item');
    setOut(ocallbuf, hasTypeCall ? 'Rename this item type' : 'Call this item type');
    return IA_NAMING;
}

// cf. iactions.c:85 [static] — item_reading_classification()
export function item_reading_classification(obj, outbuf) {
    if (!obj) {
        setOut(outbuf, '');
        return IA_NONE;
    }
    const otyp = obj.otyp;
    let text = '';
    if (otyp === FORTUNE_COOKIE) {
        text = 'Read the message inside this cookie';
    } else if (otyp === T_SHIRT) {
        text = 'Read the slogan on the shirt';
    } else if (otyp === ALCHEMY_SMOCK) {
        text = 'Read the slogan on the apron';
    } else if (otyp === HAWAIIAN_SHIRT) {
        text = 'Look at the pattern on the shirt';
    } else if (obj.oclass === SCROLL_CLASS) {
        const od = objectData[otyp] || {};
        const magic = (obj.dknown && (otyp !== SCR_BLANK_PAPER || !od.oc_name_known))
            ? ' to activate its magic'
            : '';
        text = `Read this scroll${magic}`;
    } else if (obj.oclass === SPBOOK_CLASS) {
        const od = objectData[otyp] || {};
        const novel = otyp === SPE_NOVEL;
        const blank = otyp === SPE_BLANK_PAPER && !!od.oc_name_known;
        const tome = otyp === SPE_BOOK_OF_THE_DEAD && !!od.oc_name_known;
        const verb = (novel || blank) ? 'Read' : (tome ? 'Examine' : 'Study');
        const what = novel ? 'novel' : (tome ? 'tome' : 'spellbook');
        text = `${verb} this ${what}`;
    } else {
        setOut(outbuf, '');
        return IA_NONE;
    }
    setOut(outbuf, text);
    return IA_READING;
}

// cf. iactions.c:126 [static] — ia_addmenu()
export function ia_addmenu(win, act, let_, txt) {
    if (!Array.isArray(win)) return;
    win.push({
        act,
        key: let_,
        text: txt,
    });
}

// cf. iactions.c:139 [static] — itemactions_pushkeys()
// Returns a key sequence for callers that support command queue injection.
export function itemactions_pushkeys(_otmp, act) {
    switch (act) {
    case IA_ACT_READ: return ['r'];
    case IA_ACT_NAME: return ['C'];
    case IA_ACT_CALL: return ['#', 'c'];
    case IA_ACT_WIELD: return ['w'];
    case IA_ACT_DROP: return ['d'];
    default: return [];
    }
}

// cf. iactions.c:277 — itemactions()
// JS-friendly non-interactive menu model; returns action rows.
export function itemactions(otmp) {
    if (!otmp) return [];
    const rows = [];

    const readBuf = { value: '' };
    const nameBuf = { value: '' };
    const callBuf = { value: '' };

    if (item_reading_classification(otmp, readBuf) !== IA_NONE) {
        ia_addmenu(rows, IA_ACT_READ, 'r', readBuf.value);
    }
    if (item_naming_classification(otmp, nameBuf, callBuf) !== IA_NONE) {
        ia_addmenu(rows, IA_ACT_NAME, 'N', nameBuf.value);
        ia_addmenu(rows, IA_ACT_CALL, 'C', callBuf.value);
    }
    ia_addmenu(rows, IA_ACT_WIELD, 'w', 'Wield this item');
    ia_addmenu(rows, IA_ACT_DROP, 'd', 'Drop this item');
    return rows;
}

