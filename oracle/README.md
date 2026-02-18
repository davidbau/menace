# Test Statistics Dashboard

*"You gaze into the Oracle's crystal ball..."*

## What is This?

This directory contains the **Test Statistics Dashboard** - a visual interface for tracking test health over time.

**Live Dashboard**: https://davidbau.github.io/mazesofmenace/oracle/

**Local**: Open `index.html` in your browser

## Files

### `index.html` - The Dashboard
*"A blessed scroll of Dashboard UI"*

Interactive web interface showing:
- 📈 Timeline chart (pass/fail trends)
- 📊 Category breakdown (map, gameplay, chargen)
- 🔍 Commit scrubber (navigate history)
- 📋 Recent commits table
- ⚠️ Regression warnings

Open in browser to view test history.

### `dashboard.js` - Visualization Logic
*"A wand of Visualization (0:∞)"*

JavaScript that:
- Loads `results.jsonl` via fetch API
- Parses JSONL (newline-delimited JSON)
- Renders Chart.js timeline and category charts
- Implements commit scrubber
- Highlights regressions

### `dashboard.css` - Styling
*"A cloak of Styling [+0]"*

CSS for:
- Dark theme (easy on the eyes, like playing NetHack in a terminal)
- Responsive layout
- Chart styling
- Regression highlighting (red blinks!)

### `rebuild.sh` - Sync Script
*"A scroll of Rebuild"*

Standalone script that fetches git notes from remote, rebuilds `results.jsonl`, and commits+pushes if there are changes. Run periodically or manually.

### `results.jsonl` - Test History
*"The Book of Testing (one entry per commit)"*

**Newline-delimited JSON** (JSONL) format:
- One line per commit
- Each line is a complete JSON object
- Sorted chronologically

**Data Source**: Rebuilt from `refs/notes/test-results` by `oracle/rebuild.sh`

Example line:
```json
{"commit":"abc123","date":"2026-02-11T10:30:00Z","stats":{"total":631,"pass":137,"fail":494},"regression":false}
```

### `schema.json` - Log Format Documentation
*"The Sacred Format of Test Logs"*

JSON Schema defining the structure of test log entries. Includes:
- Field descriptions
- Type constraints
- Example values
- Required vs optional fields

Use this to understand or validate the log format.

## How It Works

```
Git Notes (authoritative)
    refs/notes/test-results
            ↓
    oracle/rebuild.sh
            ↓
    results.jsonl (mirror)
            ↓
    Dashboard (loads via fetch)
```

**Process**:
1. Tests run → results saved as git note attached to the commit
2. `oracle/rebuild.sh` fetches notes, rebuilds `results.jsonl`, commits and pushes if changed
3. Dashboard loads `results.jsonl` and visualizes

Run `oracle/rebuild.sh` periodically or manually to keep the dashboard up-to-date.

## Viewing the Dashboard

### GitHub Pages (After Push)

Once pushed to GitHub:
```
https://davidbau.github.io/mazesofmenace/oracle/
```

**Requirements**:
- GitHub Pages enabled in repository settings
- `_config.yml` includes `oracle` directory
- At least one entry in `results.jsonl`

### Local (Before Push)

```bash
# Option 1: Direct file
open oracle/index.html

# Option 2: Local server (avoids CORS issues)
cd oracle
python3 -m http.server 8000
# Open http://localhost:8000
```

## Data Format (JSONL)

**Why JSONL?**
- ✅ Append-only (fast, simple)
- ✅ Merge-friendly (sort by date)
- ✅ Git-friendly (line-based diffs)
- ✅ Easy to parse (split by newline, parse each as JSON)

**Example**:
```jsonl
{"commit":"abc123","date":"2026-02-11T09:00:00Z","stats":{"pass":100,"fail":10}}
{"commit":"def456","date":"2026-02-11T10:00:00Z","stats":{"pass":105,"fail":5}}
{"commit":"ghi789","date":"2026-02-11T11:00:00Z","stats":{"pass":110,"fail":0}}
```

Each line is independent. Load all lines, parse each as JSON, sort by date.

## Regenerating Dashboard Data

```bash
# Rebuild results.jsonl from all git notes, commit and push if changed
oracle/rebuild.sh
```

This fetches notes from remote, merges with local notes, rebuilds the JSONL file, and commits/pushes if anything changed.

### Manual Inspection

```bash
# View all test notes
git notes --ref=test-results list

# Show specific note
git notes --ref=test-results show abc123

# View last 5 test results
tail -5 oracle/results.jsonl | jq '.'

# Check current pass rate
jq -r '.stats.pass' oracle/results.jsonl | tail -1

# Count total entries
wc -l oracle/results.jsonl
```

## Customizing the Dashboard

### Add New Charts

Edit `dashboard.js`:
1. Load data from `results.jsonl`
2. Create new Chart.js chart
3. Add to `renderCharts()` function

### Change Theme

Edit `dashboard.css`:
- `:root` variables define colors
- `.dark-theme` class for dark mode
- Chart colors in `dashboard.js` (Chart.js config)

### Add New Data Fields

1. Update `schema.json` with new field
2. Modify test runner to include new field
3. Update `dashboard.js` to display it

## Troubleshooting

### Dashboard Not Loading

```bash
# Check if results.jsonl exists
ls -la oracle/results.jsonl

# Validate JSONL format
while IFS= read -r line; do
  echo "$line" | jq empty || echo "Invalid line";
done < oracle/results.jsonl

# Check if file is empty
wc -l oracle/results.jsonl
```

### Charts Not Rendering

**Common causes**:
- Empty `results.jsonl`
- Invalid JSON in one or more lines
- Browser console errors (check DevTools)
- CDN issue (Chart.js not loading)

**Fix**:
1. Open browser DevTools (F12)
2. Check Console for errors
3. Verify `results.jsonl` loads (Network tab)
4. Check if Chart.js loaded

### GitHub Pages Not Updating

```bash
# Verify _config.yml includes oracle
grep -A 5 "include:" _config.yml

# Force rebuild by pushing a change
git commit --allow-empty -m "Trigger Pages rebuild"
git push
```

GitHub Pages can take 1-2 minutes to update after push.

## Documentation

- **Main Guide**: [../docs/TESTING.md](../docs/TESTING.md) ⭐
- **Git Notes**: [../docs/TESTING_GIT_NOTES.md](../docs/TESTING_GIT_NOTES.md)
- **Hooks**: [../.githooks/README.md](../.githooks/README.md)
- **Schema**: [schema.json](schema.json)

---

*"The crystal ball shows all. Your tests' past, present, and future."*

*May your pass rate ever increase!*
