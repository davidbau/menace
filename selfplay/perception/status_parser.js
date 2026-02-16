// selfplay/perception/status_parser.js -- Parse NetHack status lines
//
// Extracts player stats from the two status lines (rows 22-23):
//   Row 22: "Wizard  St:11  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral"
//   Row 23: "Dlvl:1  $:0  HP:12(12)  Pw:8(8)  AC:9  Xp:1/0  T:1"
//
// Also handles variant formats with conditions appended:
//   "Dlvl:1  $:0  HP:12(12)  Pw:8(8)  AC:9  Xp:1/0  T:1  Hungry  Blind"

/**
 * Parsed player status from the two NetHack status lines.
 */
export class PlayerStatus {
    constructor() {
        // Line 1 fields
        this.name = '';
        this.title = '';      // "the Evoker", etc. (if present)
        this.str = 0;         // Strength (can be 18/xx for fighters)
        this.strExtra = 0;    // Strength bonus (e.g., 18/50 → str=18, strExtra=50)
        this.dex = 0;
        this.con = 0;
        this.int = 0;
        this.wis = 0;
        this.cha = 0;
        this.alignment = '';  // 'Lawful', 'Neutral', 'Chaotic'
        this.score = 0;

        // Line 2 fields
        this.dungeonLevel = 0;
        this.gold = 0;
        this.hp = 0;
        this.hpmax = 0;
        this.pw = 0;
        this.pwmax = 0;
        this.ac = 0;
        this.xpLevel = 0;
        this.xpPoints = 0;
        this.turns = 0;

        // Conditions (from end of line 2)
        this.hungry = false;
        this.weak = false;
        this.fainting = false;
        this.satiated = false;
        this.blind = false;
        this.confused = false;
        this.stunned = false;
        this.hallucinating = false;
        this.ill = false;
        this.foodPoisoned = false;
        this.slimed = false;

        // Hunger level as a single value for easy comparison
        // 0=normal, 1=hungry, 2=weak, 3=fainting, -1=satiated
        this.hungerLevel = 0;

        // Whether parsing succeeded
        this.valid = false;
    }

    /**
     * HP as a fraction (0.0 to 1.0).
     */
    get hpFraction() {
        return this.hpmax > 0 ? this.hp / this.hpmax : 1;
    }

    /**
     * True if HP is critically low (below 20%).
     */
    get hpCritical() {
        return this.hpFraction < 0.2;
    }

    /**
     * True if HP is low (below 40%).
     */
    get hpLow() {
        return this.hpFraction < 0.4;
    }

    /**
     * True if we need food soon.
     */
    get needsFood() {
        return this.hungry || this.weak || this.fainting;
    }

    /**
     * True if any debilitating condition is active.
     */
    get hasDebuff() {
        return this.blind || this.confused || this.stunned || this.hallucinating;
    }
}

/**
 * Parse both status lines into a PlayerStatus object.
 *
 * @param {string} line1 - Status line 1 (row 22)
 * @param {string} line2 - Status line 2 (row 23)
 * @returns {PlayerStatus}
 */
export function parseStatus(line1, line2) {
    const status = new PlayerStatus();

    if (line1) parseLine1(line1, status);
    if (line2) parseLine2(line2, status);

    status.valid = status.hp > 0 || status.hpmax > 0;
    return status;
}

/**
 * Parse status line 1: name, attributes, alignment.
 * Format: "Wizard  St:18  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral  S:42"
 * or:     "Wizard the Evoker  St:11  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral"
 */
function parseLine1(line, status) {
    // Extract attributes first (reliable anchors)
    const attrMatch = line.match(
        /St:(\d+(?:\/\d+)?)\s+Dx:(\d+)\s+Co:(\d+)\s+In:(\d+)\s+Wi:(\d+)\s+Ch:(\d+)/
    );

    if (attrMatch) {
        // Parse strength (handle 18/xx format)
        const strStr = attrMatch[1];
        if (strStr.includes('/')) {
            const parts = strStr.split('/');
            status.str = parseInt(parts[0]);
            status.strExtra = parseInt(parts[1]);
        } else {
            status.str = parseInt(strStr);
            status.strExtra = 0;
        }

        status.dex = parseInt(attrMatch[2]);
        status.con = parseInt(attrMatch[3]);
        status.int = parseInt(attrMatch[4]);
        status.wis = parseInt(attrMatch[5]);
        status.cha = parseInt(attrMatch[6]);
    }

    // Extract name (everything before "St:")
    const stIdx = line.indexOf('St:');
    if (stIdx > 0) {
        const nameStr = line.substring(0, stIdx).trim();
        // Check for "Name the Title" format
        const titleMatch = nameStr.match(/^(.+?)\s+the\s+(.+)$/);
        if (titleMatch) {
            status.name = titleMatch[1];
            status.title = titleMatch[2];
        } else {
            status.name = nameStr;
        }
    }

    // Extract alignment (after Ch:XX)
    const alignMatch = line.match(/\b(Lawful|Neutral|Chaotic)\b/);
    if (alignMatch) {
        status.alignment = alignMatch[1];
    }

    // Extract score (S:NNN at end)
    const scoreMatch = line.match(/S:(\d+)/);
    if (scoreMatch) {
        status.score = parseInt(scoreMatch[1]);
    }
}

/**
 * Parse status line 2: dungeon level, HP, Pw, AC, XL, turns, conditions.
 * Format: "Dlvl:1  $:0  HP:12(12)  Pw:8(8)  AC:9  Xp:1/0  T:1"
 * With conditions: "... T:1  Hungry  Blind  Conf"
 */
function parseLine2(line, status) {
    // Dungeon level
    const dlvlMatch = line.match(/Dlvl:(\d+)/);
    if (dlvlMatch) status.dungeonLevel = parseInt(dlvlMatch[1]);

    // Gold
    const goldMatch = line.match(/\$:(\d+)/);
    if (goldMatch) status.gold = parseInt(goldMatch[1]);

    // HP
    const hpMatch = line.match(/HP:(-?\d+)\((\d+)\)/);
    if (hpMatch) {
        status.hp = parseInt(hpMatch[1]);
        status.hpmax = parseInt(hpMatch[2]);
    }

    // Power
    const pwMatch = line.match(/Pw:(\d+)\((\d+)\)/);
    if (pwMatch) {
        status.pw = parseInt(pwMatch[1]);
        status.pwmax = parseInt(pwMatch[2]);
    }

    // AC
    const acMatch = line.match(/AC:(-?\d+)/);
    if (acMatch) status.ac = parseInt(acMatch[1]);

    // Experience formats seen in C/ports:
    //   Xp:1/20
    //   Xp:1
    //   Exp:1
    //   Exp:1/20
    const xpMatch = line.match(/Xp:(\d+)(?:\/(\d+))?/i);
    if (xpMatch) {
        status.xpLevel = parseInt(xpMatch[1]);
        status.xpPoints = xpMatch[2] ? parseInt(xpMatch[2]) : 0;
    } else {
        const expMatch = line.match(/Exp:(\d+)(?:\/(\d+))?/i);
        if (expMatch) {
            status.xpLevel = parseInt(expMatch[1]);
            status.xpPoints = expMatch[2] ? parseInt(expMatch[2]) : 0;
        }
    }

    // Turns
    const turnMatch = line.match(/T:(\d+)/);
    if (turnMatch) status.turns = parseInt(turnMatch[1]);

    // Conditions (appear after T:NNN)
    const conditions = line.toUpperCase();
    status.satiated = conditions.includes('SATIATED');
    status.hungry = conditions.includes('HUNGRY');
    status.weak = conditions.includes('WEAK');
    status.fainting = conditions.includes('FAINT');
    status.blind = conditions.includes('BLIND');
    status.confused = conditions.includes('CONF');
    status.stunned = conditions.includes('STUN');
    status.hallucinating = conditions.includes('HALLU');
    status.ill = conditions.includes('ILL');
    status.foodPoisoned = conditions.includes('FOODPOIS');
    status.slimed = conditions.includes('SLIME');

    // Compute hunger level
    if (status.fainting) status.hungerLevel = 3;
    else if (status.weak) status.hungerLevel = 2;
    else if (status.hungry) status.hungerLevel = 1;
    else if (status.satiated) status.hungerLevel = -1;
    else status.hungerLevel = 0;
}
