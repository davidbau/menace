// vi.js -- Minimal vi simulator for editing files (especially .nethackrc).
// Supports normal, insert, and command-line modes with basic vi keybindings.

const ESC = 27;
const ENTER = 13;
const BACKSPACE = 8;

export class ViEditor {
    constructor(display, getch, filename, content, readonly) {
        this.display = display;
        this.getch = getch;
        this.filename = filename;
        this.lines = (content || '').split('\n');
        if (this.lines.length === 0) this.lines = [''];
        this.readonly = readonly;
        this.mode = 'normal'; // 'normal', 'insert', 'command'
        this.cursorRow = 0;   // line in buffer
        this.cursorCol = 0;
        this.topLine = 0;     // first visible line
        this.cmdBuf = '';     // command-line mode buffer
        this.statusMsg = '';
        this.modified = false;
        this.undoStack = [];
        this.rows = display.rows || 24;
        this.cols = display.cols || 80;
        this.editRows = this.rows - 2; // leave 2 rows for status + command
    }

    // Save current state for undo
    _pushUndo() {
        this.undoStack.push({
            lines: this.lines.map(l => l),
            cursorRow: this.cursorRow,
            cursorCol: this.cursorCol,
        });
        if (this.undoStack.length > 50) this.undoStack.shift();
    }

    // Main editor loop
    async run() {
        this._render();
        while (true) {
            const ch = await this.getch();
            let result;
            if (this.mode === 'normal') {
                result = this._handleNormal(ch);
            } else if (this.mode === 'insert') {
                result = this._handleInsert(ch);
            } else if (this.mode === 'command') {
                result = await this._handleCommand(ch);
            }
            if (result === 'quit') return;
            this._render();
        }
    }

    _handleNormal(ch) {
        const c = String.fromCharCode(ch);
        this.statusMsg = '';

        // Movement
        if (c === 'h' || ch === 260) { // left arrow mapped by some inputs
            if (this.cursorCol > 0) this.cursorCol--;
        } else if (c === 'j' || ch === 258) { // down
            if (this.cursorRow < this.lines.length - 1) this.cursorRow++;
            this._clampCol();
        } else if (c === 'k' || ch === 259) { // up
            if (this.cursorRow > 0) this.cursorRow--;
            this._clampCol();
        } else if (c === 'l' || ch === 261) { // right
            const line = this.lines[this.cursorRow] || '';
            if (this.cursorCol < line.length - 1) this.cursorCol++;
        }
        // Enter insert mode
        else if (c === 'i') {
            this.mode = 'insert';
        } else if (c === 'a') {
            const line = this.lines[this.cursorRow] || '';
            this.cursorCol = Math.min(this.cursorCol + 1, line.length);
            this.mode = 'insert';
        } else if (c === 'o') {
            this._pushUndo();
            this.lines.splice(this.cursorRow + 1, 0, '');
            this.cursorRow++;
            this.cursorCol = 0;
            this.mode = 'insert';
            this.modified = true;
        } else if (c === 'O') {
            this._pushUndo();
            this.lines.splice(this.cursorRow, 0, '');
            this.cursorCol = 0;
            this.mode = 'insert';
            this.modified = true;
        }
        // Delete character
        else if (c === 'x') {
            const line = this.lines[this.cursorRow] || '';
            if (line.length > 0) {
                this._pushUndo();
                this.lines[this.cursorRow] = line.slice(0, this.cursorCol) + line.slice(this.cursorCol + 1);
                this._clampCol();
                this.modified = true;
            }
        }
        // Delete line (dd)
        else if (c === 'd') {
            this._pendingD = true;
        }
        // Undo
        else if (c === 'u') {
            if (this.undoStack.length > 0) {
                const state = this.undoStack.pop();
                this.lines = state.lines;
                this.cursorRow = state.cursorRow;
                this.cursorCol = state.cursorCol;
                this.modified = true;
            }
        }
        // Jump to end/start
        else if (c === 'G') {
            this.cursorRow = this.lines.length - 1;
            this._clampCol();
        } else if (c === 'g') {
            this._pendingG = true;
        }
        // Page movement
        else if (c === '$') {
            const line = this.lines[this.cursorRow] || '';
            this.cursorCol = Math.max(0, line.length - 1);
        } else if (c === '0' || c === '^') {
            this.cursorCol = 0;
        }
        // Command mode
        else if (c === ':') {
            this.mode = 'command';
            this.cmdBuf = '';
        }

        // Handle pending double-key commands
        if (this._pendingD && c === 'd' && !this._justSetD) {
            this._pushUndo();
            if (this.lines.length > 1) {
                this.lines.splice(this.cursorRow, 1);
                if (this.cursorRow >= this.lines.length) this.cursorRow = this.lines.length - 1;
            } else {
                this.lines[0] = '';
            }
            this._clampCol();
            this.modified = true;
            this._pendingD = false;
        } else if (c === 'd') {
            this._justSetD = true;
        } else {
            if (this._pendingD && c !== 'd') this._pendingD = false;
            this._justSetD = false;
        }

        if (this._pendingG && c === 'g' && !this._justSetG) {
            this.cursorRow = 0;
            this._clampCol();
            this._pendingG = false;
        } else if (c === 'g') {
            this._justSetG = true;
        } else {
            if (this._pendingG && c !== 'g') this._pendingG = false;
            this._justSetG = false;
        }
    }

    _handleInsert(ch) {
        if (ch === ESC) {
            this.mode = 'normal';
            if (this.cursorCol > 0) this.cursorCol--;
            return;
        }
        this._pushUndo();
        this.modified = true;
        const line = this.lines[this.cursorRow] || '';

        if (ch === BACKSPACE || ch === 127) {
            if (this.cursorCol > 0) {
                this.lines[this.cursorRow] = line.slice(0, this.cursorCol - 1) + line.slice(this.cursorCol);
                this.cursorCol--;
            } else if (this.cursorRow > 0) {
                // Join with previous line
                const prevLine = this.lines[this.cursorRow - 1];
                this.cursorCol = prevLine.length;
                this.lines[this.cursorRow - 1] = prevLine + line;
                this.lines.splice(this.cursorRow, 1);
                this.cursorRow--;
            }
        } else if (ch === ENTER) {
            const before = line.slice(0, this.cursorCol);
            const after = line.slice(this.cursorCol);
            this.lines[this.cursorRow] = before;
            this.lines.splice(this.cursorRow + 1, 0, after);
            this.cursorRow++;
            this.cursorCol = 0;
        } else if (ch >= 32 && ch < 127) {
            this.lines[this.cursorRow] = line.slice(0, this.cursorCol) + String.fromCharCode(ch) + line.slice(this.cursorCol);
            this.cursorCol++;
        }
    }

    async _handleCommand(ch) {
        if (ch === ESC) {
            this.mode = 'normal';
            this.cmdBuf = '';
            return;
        }
        if (ch === BACKSPACE || ch === 127) {
            if (this.cmdBuf.length > 0) {
                this.cmdBuf = this.cmdBuf.slice(0, -1);
            } else {
                this.mode = 'normal';
            }
            return;
        }
        if (ch === ENTER) {
            const cmd = this.cmdBuf.trim();
            this.cmdBuf = '';
            this.mode = 'normal';
            return this._execCommand(cmd);
        }
        if (ch >= 32 && ch < 127) {
            this.cmdBuf += String.fromCharCode(ch);
        }
    }

    _execCommand(cmd) {
        if (cmd === 'q') {
            if (this.modified) {
                this.statusMsg = 'E37: No write since last change (add ! to override)';
                return;
            }
            return 'quit';
        }
        if (cmd === 'q!') {
            return 'quit';
        }
        if (cmd === 'w') {
            return this._save();
        }
        if (cmd === 'wq' || cmd === 'x') {
            const err = this._save();
            if (err === 'quit') return 'quit'; // save succeeded
            if (!this.statusMsg.startsWith('E')) return 'quit'; // save succeeded
            return; // save failed, stay in editor
        }
        if (cmd === 'set nu' || cmd === 'set number') {
            this.showLineNumbers = true;
            return;
        }
        if (cmd === 'set nonu' || cmd === 'set nonumber') {
            this.showLineNumbers = false;
            return;
        }
        this.statusMsg = `E492: Not an editor command: ${cmd}`;
    }

    _save() {
        if (this.readonly) {
            this.statusMsg = "E45: 'readonly' option is set";
            return;
        }
        // Save via shell's filesystem would require fs access — we use a callback
        if (this.onSave) {
            const err = this.onSave(this.lines.join('\n'));
            if (err) {
                this.statusMsg = err;
                return;
            }
        }
        this.modified = false;
        this.statusMsg = `"${this.filename}" ${this.lines.length}L written`;
        return 'quit';
    }

    _clampCol() {
        const line = this.lines[this.cursorRow] || '';
        const maxCol = this.mode === 'insert' ? line.length : Math.max(0, line.length - 1);
        if (this.cursorCol > maxCol) this.cursorCol = maxCol;
    }

    _render() {
        const d = this.display;
        d.clearScreen();

        // Scroll to keep cursor visible
        if (this.cursorRow < this.topLine) this.topLine = this.cursorRow;
        if (this.cursorRow >= this.topLine + this.editRows) {
            this.topLine = this.cursorRow - this.editRows + 1;
        }

        // Draw file content
        const numWidth = this.showLineNumbers ? String(this.lines.length).length + 1 : 0;
        for (let i = 0; i < this.editRows; i++) {
            const lineIdx = this.topLine + i;
            if (lineIdx < this.lines.length) {
                let prefix = '';
                if (this.showLineNumbers) {
                    prefix = String(lineIdx + 1).padStart(numWidth - 1) + ' ';
                    d.putstr(0, i, prefix, 11); // CLR_YELLOW
                }
                const line = this.lines[lineIdx];
                const visible = line.slice(0, this.cols - numWidth);
                d.putstr(numWidth, i, visible, 7); // CLR_GRAY
            } else {
                d.putstr(0, i, '~', 4); // CLR_BLUE -- vi empty line marker
            }
        }

        // Status line (row rows-2)
        const statusRow = this.rows - 2;
        const modeStr = this.mode === 'insert' ? '-- INSERT --' :
                        this.mode === 'command' ? ':' + this.cmdBuf : '';
        if (this.statusMsg) {
            d.putstr(0, statusRow, this.statusMsg, 7);
        } else {
            d.putstr(0, statusRow, modeStr, 15); // CLR_WHITE
        }

        // Info line (row rows-1)
        const infoRow = this.rows - 1;
        const posInfo = `${this.cursorRow + 1},${this.cursorCol + 1}`;
        const fileInfo = `"${this.filename}"${this.modified ? ' [Modified]' : ''} ${this.lines.length}L`;
        d.putstr(0, infoRow, fileInfo, 7);
        d.putstr(this.cols - posInfo.length - 1, infoRow, posInfo, 7);

        // Position cursor
        const screenRow = this.cursorRow - this.topLine;
        const screenCol = (this.showLineNumbers ? numWidth : 0) + this.cursorCol;
        if (typeof d.setCursor === 'function') {
            d.setCursor(Math.min(screenCol, this.cols - 1), screenRow);
        }
    }
}
