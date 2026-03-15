// shell.js -- Main shell loop: prompt, parse, dispatch.
// Simulates a 1980s Unix login shell using the existing Display class.

import { VirtualFS, USERNAME, HOMEDIR, loginBanner } from './filesystem.js';
import { getBuiltinCommands } from './commands.js';
import { ViEditor } from './vi.js';
import {
    CLR_GREEN, CLR_GRAY, CLR_WHITE, CLR_CYAN, CLR_YELLOW,
} from '../js/render.js';

const PROMPT_COLOR = CLR_GREEN;
const OUTPUT_COLOR = CLR_GRAY;
const ROWS = 24;
const COLS = 80;

export class Shell {
    constructor(display, getch) {
        this.display = display;
        this.getch = getch;
        this.fs = new VirtualFS();
        this.commands = getBuiltinCommands();
        this.scrollBuffer = []; // lines currently on screen
        this.inputLine = '';
        this.cursorPos = 0;
        this.history = [];
        this.historyIdx = -1;
        this.running = true;
        this.result = null; // set when shell should return an action
    }

    // Entry point: takes over the display, returns when shell exits.
    // options.interrupt: if true, simulate Ctrl-C interrupt of current screen
    // Returns: { action: 'exit' } or { action: 'launch', game: 'nethack' } etc.
    async run(options = {}) {
        // Enable blinking cursor
        if (typeof this.display.cursSet === 'function') this.display.cursSet(1);
        this.scrollBuffer = [];

        if (options.interrupt) {
            // Capture current screen content, then scroll it up with ^C
            this._captureScreen();
            this._addLine('^C', PROMPT_COLOR);
            this._addLine('Interrupt', OUTPUT_COLOR);
            this._addLine('', OUTPUT_COLOR);
        } else {
            this.display.clearScreen();
            // Show login banner (generated with current date/time)
            for (const line of loginBanner().split('\n')) {
                this._addLine(line, OUTPUT_COLOR);
            }
            this._addLine('', OUTPUT_COLOR);
            // Show MOTD on clean entry
            const motd = this.fs.cat('/etc/motd');
            if (motd) {
                for (const line of motd.split('\n')) {
                    this._addLine(line, OUTPUT_COLOR);
                }
                this._addLine('', OUTPUT_COLOR);
            }
        }

        while (this.running) {
            this._renderPrompt();
            const line = await this._readLine();
            if (line === null) continue; // interrupted

            if (line.trim()) {
                this.history.push(line);
                if (this.history.length > 100) this.history.shift();
            }
            this.historyIdx = -1;

            // Echo the command in the scroll buffer
            const promptStr = this._promptString();
            this._addLine(promptStr + line, PROMPT_COLOR);

            const result = await this._execute(line.trim());
            if (result) {
                this.result = result;
                this.running = false;
            }
        }

        return this.result || { action: 'exit' };
    }

    _promptString() {
        const cwd = this.fs.cwd;
        const display = cwd === HOMEDIR ? '~' :
                        cwd.startsWith(HOMEDIR + '/') ? '~' + cwd.slice(HOMEDIR.length) : cwd;
        return `${USERNAME}@pdp11:${display}$ `;
    }

    // Read a line of input character by character, supporting editing and history.
    async _readLine() {
        this.inputLine = '';
        this.cursorPos = 0;
        this.historyIdx = -1;
        this._savedInput = '';

        while (true) {
            this._renderInputLine();
            const ch = await this.getch();

            // Enter
            if (ch === 13 || ch === 10) {
                const line = this.inputLine;
                return line;
            }
            // Escape — clear line
            if (ch === 27) {
                this.inputLine = '';
                this.cursorPos = 0;
                continue;
            }
            // Backspace
            if (ch === 8 || ch === 127) {
                if (this.cursorPos > 0) {
                    this.inputLine = this.inputLine.slice(0, this.cursorPos - 1) + this.inputLine.slice(this.cursorPos);
                    this.cursorPos--;
                }
                continue;
            }
            // Ctrl-C
            if (ch === 3) {
                this.inputLine = '';
                this.cursorPos = 0;
                this._addLine(this._promptString() + '^C', PROMPT_COLOR);
                return null; // interrupted
            }
            // Ctrl-D on empty line = exit
            if (ch === 4 && this.inputLine.length === 0) {
                return 'exit';
            }
            // Ctrl-A — beginning of line
            if (ch === 1) {
                this.cursorPos = 0;
                continue;
            }
            // Ctrl-E — end of line
            if (ch === 5) {
                this.cursorPos = this.inputLine.length;
                continue;
            }
            // Ctrl-U — kill line
            if (ch === 21) {
                this.inputLine = this.inputLine.slice(this.cursorPos);
                this.cursorPos = 0;
                continue;
            }
            // Ctrl-K — kill to end
            if (ch === 11) {
                this.inputLine = this.inputLine.slice(0, this.cursorPos);
                continue;
            }

            // Up arrow (mapped to 'k' with meta in nethack input, but we check raw)
            // In the browser input system, arrow keys get mapped to hjkl.
            // We use Ctrl-P / Ctrl-N for history, and also check for
            // the special key codes that might come through.
            if (ch === 16) { // Ctrl-P — history up
                this._historyUp();
                continue;
            }
            if (ch === 14) { // Ctrl-N — history down
                this._historyDown();
                continue;
            }

            // Tab — filename completion
            if (ch === 9) {
                this._tabComplete();
                continue;
            }

            // Printable characters
            if (ch >= 32 && ch < 127) {
                this.inputLine = this.inputLine.slice(0, this.cursorPos) +
                    String.fromCharCode(ch) + this.inputLine.slice(this.cursorPos);
                this.cursorPos++;
            }
        }
    }

    _historyUp() {
        if (this.history.length === 0) return;
        if (this.historyIdx === -1) {
            this._savedInput = this.inputLine;
            this.historyIdx = this.history.length - 1;
        } else if (this.historyIdx > 0) {
            this.historyIdx--;
        }
        this.inputLine = this.history[this.historyIdx];
        this.cursorPos = this.inputLine.length;
    }

    _historyDown() {
        if (this.historyIdx === -1) return;
        if (this.historyIdx < this.history.length - 1) {
            this.historyIdx++;
            this.inputLine = this.history[this.historyIdx];
        } else {
            this.historyIdx = -1;
            this.inputLine = this._savedInput || '';
        }
        this.cursorPos = this.inputLine.length;
    }

    _tabComplete() {
        const line = this.inputLine.slice(0, this.cursorPos);
        const parts = line.split(/\s+/);
        const partial = parts[parts.length - 1] || '';

        if (parts.length <= 1 && !line.includes(' ')) {
            // Complete command names
            const matches = Object.keys(this.commands).filter(c => c.startsWith(partial));
            if (matches.length === 1) {
                const completion = matches[0].slice(partial.length) + ' ';
                this.inputLine = this.inputLine.slice(0, this.cursorPos) + completion + this.inputLine.slice(this.cursorPos);
                this.cursorPos += completion.length;
            }
        } else {
            // Complete file/directory names
            const lastSlash = partial.lastIndexOf('/');
            const dirPart = lastSlash >= 0 ? partial.slice(0, lastSlash + 1) : '';
            const prefix = lastSlash >= 0 ? partial.slice(lastSlash + 1) : partial;
            const dirPath = dirPart || '.';
            const entries = this.fs.ls(dirPath);
            if (entries) {
                const matches = entries.filter(e => e.startsWith(prefix));
                if (matches.length === 1) {
                    const match = matches[0];
                    const completion = match.slice(prefix.length);
                    const fullPath = dirPart + match;
                    const suffix = this.fs.isDir(fullPath) ? '/' : ' ';
                    this.inputLine = this.inputLine.slice(0, this.cursorPos) + completion + suffix + this.inputLine.slice(this.cursorPos);
                    this.cursorPos += completion.length + suffix.length;
                }
            }
        }
    }

    // Render the prompt + input on the last row of the display
    _renderInputLine() {
        const d = this.display;
        const promptRow = Math.min(this.scrollBuffer.length, ROWS - 1);
        d.clearRow(promptRow);
        const prompt = this._promptString();
        d.putstr(0, promptRow, prompt, PROMPT_COLOR);
        const inputVisible = this.inputLine.slice(0, COLS - prompt.length);
        d.putstr(prompt.length, promptRow, inputVisible, OUTPUT_COLOR);
        if (typeof d.setCursor === 'function') {
            d.setCursor(Math.min(prompt.length + this.cursorPos, COLS - 1), promptRow);
        }
    }

    _renderPrompt() {
        this._renderInputLine();
    }

    // Add a line to the scroll buffer and render it
    _addLine(text, color) {
        this.scrollBuffer.push({ text, color: color || OUTPUT_COLOR });
        // Keep only enough lines to fill the screen (minus input row)
        const maxLines = ROWS - 1;
        if (this.scrollBuffer.length > maxLines) {
            this.scrollBuffer = this.scrollBuffer.slice(this.scrollBuffer.length - maxLines);
        }
        this._renderScrollBuffer();
    }

    _renderScrollBuffer() {
        const d = this.display;
        const maxLines = ROWS - 1;
        for (let i = 0; i < maxLines; i++) {
            d.clearRow(i);
            if (i < this.scrollBuffer.length) {
                const entry = this.scrollBuffer[i];
                const line = entry.text.slice(0, COLS);
                if (entry.colors) {
                    // Per-cell colors (captured screen with preserved art colors)
                    for (let c = 0; c < line.length && c < entry.colors.length; c++) {
                        d.setCell(c, i, line[c], entry.colors[c]);
                    }
                } else {
                    // Single color (normal shell output)
                    d.putstr(0, i, line, entry.color);
                }
            }
        }
    }

    // Read the current display grid into the scroll buffer (for interrupt mode)
    // Preserves per-cell colors so the promo art doesn't desaturate.
    _captureScreen() {
        const d = this.display;
        if (!d.grid) return;
        for (let r = 0; r < Math.min(d.rows, ROWS - 1); r++) {
            let lastNonSpace = -1;
            const cells = [];
            for (let c = 0; c < Math.min(d.cols, COLS); c++) {
                const cell = d.grid[r][c];
                cells.push({ ch: cell.ch || ' ', color: cell.color });
                if (cell.ch && cell.ch !== ' ') lastNonSpace = c;
            }
            // Only add non-empty rows — store as cells array for color preservation
            if (lastNonSpace >= 0) {
                const text = cells.slice(0, lastNonSpace + 1).map(c => c.ch).join('');
                const colors = cells.slice(0, lastNonSpace + 1).map(c => c.color);
                this.scrollBuffer.push({ text, colors });
            }
        }
        // Trim to fit screen
        const maxLines = ROWS - 4; // leave room for ^C, Interrupt, blank, prompt
        if (this.scrollBuffer.length > maxLines) {
            this.scrollBuffer = this.scrollBuffer.slice(this.scrollBuffer.length - maxLines);
        }
    }

    clearDisplay() {
        this.scrollBuffer = [];
        this.display.clearScreen();
    }

    // Print a line to the shell output
    println(text) {
        // Handle long lines by wrapping
        if (!text) {
            this._addLine('', OUTPUT_COLOR);
            return;
        }
        while (text.length > COLS) {
            this._addLine(text.slice(0, COLS), OUTPUT_COLOR);
            text = text.slice(COLS);
        }
        this._addLine(text, OUTPUT_COLOR);
    }

    // Print text without newline (for prompts like --More--)
    printPrompt(text) {
        const promptRow = Math.min(this.scrollBuffer.length, ROWS - 1);
        this.display.clearRow(promptRow);
        this.display.putstr(0, promptRow, text, OUTPUT_COLOR);
    }

    clearPromptLine() {
        const promptRow = Math.min(this.scrollBuffer.length, ROWS - 1);
        this.display.clearRow(promptRow);
    }

    // Parse and execute a command line
    async _execute(line) {
        if (!line) return;

        // Simple tokenization (respect double quotes)
        const tokens = this._tokenize(line);
        if (tokens.length === 0) return;

        const cmdName = tokens[0];
        const args = tokens.slice(1);

        // Check for path-based commands (e.g. /usr/games/nethack, ./nethack)
        if (cmdName.includes('/')) {
            const game = this.fs.getGame(cmdName);
            if (game) {
                if (game === 'dungeon') return { action: 'dungeon' };
                return { action: 'launch', game };
            }
            if (this.fs.getNode(cmdName)) {
                this.println(`${cmdName}: Permission denied`);
                return;
            }
            this.println(`${cmdName}: No such file or directory`);
            return;
        }

        const cmd = this.commands[cmdName];
        if (!cmd) {
            this.println(`${cmdName}: Command not found.`);
            return;
        }

        const result = await cmd(args, this);
        if (result && result.action === 'vi') {
            return await this._runVi(result.file);
        }
        if (result && result.action === 'dungeon') {
            await this._runDungeon();
            return;
        }
        return result;
    }

    async _runVi(filename) {
        const absPath = this.fs.resolve(filename);
        const node = this.fs.getNode(filename);

        // If file doesn't exist and it's in a writable area, that's an error for now
        if (!node) {
            this.println(`vi: ${filename}: No such file or directory`);
            return;
        }
        if (node.type === 'dir') {
            this.println(`vi: ${filename}: Is a directory`);
            return;
        }

        const content = this.fs.cat(filename) || '';
        const readonly = this.fs.isReadonly(filename);

        const editor = new ViEditor(this.display, this.getch, filename, content, readonly);
        editor.onSave = (newContent) => {
            return this.fs.write(filename, newContent);
        };

        await editor.run();

        // Restore shell display
        this.display.clearScreen();
        this._renderScrollBuffer();
    }

    async _runDungeon() {
        try {
            const { DungeonGame } = await import('../dungeon/js/game.js');
            const [dataResp, textResp] = await Promise.all([
                fetch('../dungeon/js/dungeon-data.json'),
                fetch('../dungeon/js/dungeon-text.json'),
            ]);
            const data = await dataResp.json();
            const textRecords = await textResp.json();

            const game = new DungeonGame();
            game.init(data, textRecords);

            // Dungeon-specific input: show ">" prompt, no shell prompt
            const input = async () => {
                const promptRow = Math.min(this.scrollBuffer.length, ROWS - 1);
                this.display.clearRow(promptRow);
                this.display.putstr(0, promptRow, '>', OUTPUT_COLOR);

                this.inputLine = '';
                this.cursorPos = 0;
                while (true) {
                    const col = 1 + this.cursorPos;
                    this.display.putstr(1, promptRow, this.inputLine, OUTPUT_COLOR);
                    if (typeof this.display.setCursor === 'function') {
                        this.display.setCursor(Math.min(col, COLS - 1), promptRow);
                    }
                    const ch = await this.getch();
                    if (ch === 13 || ch === 10) {
                        const line = this.inputLine;
                        this._addLine('>' + line, OUTPUT_COLOR);
                        return line;
                    }
                    if (ch === 8 || ch === 127) {
                        if (this.cursorPos > 0) {
                            this.inputLine = this.inputLine.slice(0, this.cursorPos - 1) + this.inputLine.slice(this.cursorPos);
                            this.cursorPos--;
                            this.display.clearRow(promptRow);
                            this.display.putstr(0, promptRow, '>' + this.inputLine, OUTPUT_COLOR);
                        }
                        continue;
                    }
                    if (ch === 3) return ''; // Ctrl-C
                    if (ch >= 32 && ch < 127) {
                        this.inputLine = this.inputLine.slice(0, this.cursorPos) +
                            String.fromCharCode(ch) + this.inputLine.slice(this.cursorPos);
                        this.cursorPos++;
                    }
                }
            };

            // Line output: print to shell's scroll buffer
            const output = (text) => {
                for (const line of (text || '').split('\n')) {
                    this.println(line);
                }
            };

            this.display.clearScreen();
            this.scrollBuffer = [];

            await game.run(input, output);
        } catch (e) {
            if (e?.message !== 'quit') {
                this.println(`dungeon: ${e.message}`);
            }
        }

        // Restore shell display
        this.display.clearScreen();
        this._renderScrollBuffer();
    }

    _tokenize(line) {
        const tokens = [];
        let current = '';
        let inQuote = false;
        let quoteChar = '';

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuote) {
                if (ch === quoteChar) {
                    inQuote = false;
                } else {
                    current += ch;
                }
            } else if (ch === '"' || ch === "'") {
                inQuote = true;
                quoteChar = ch;
            } else if (ch === ' ' || ch === '\t') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
            } else {
                current += ch;
            }
        }
        if (current) tokens.push(current);
        return tokens;
    }
}

// Main entry point: run the shell, returning when done.
// display: Display instance
// getch: async function returning a character code
// lifecycle: object with launch methods
export async function runShell(display, getch, lifecycle, options = {}) {
    const shell = new Shell(display, getch);
    const result = await shell.run(options);

    if (result && result.action === 'launch') {
        const game = result.game;
        if (game === 'nethack') {
            // Navigate to main game
            if (lifecycle && lifecycle.restart) {
                lifecycle.restart();
            } else {
                window.location.href = '/';
            }
        } else if (game === 'hack') {
            window.location.href = '/hack/';
        } else if (game === 'rogue') {
            window.location.href = '/rogue/';
        }
    }

    return result;
}
