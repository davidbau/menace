// Test Dashboard Logic
// Loads results.jsonl and visualizes test history

let testData = [];
let timelineChart = null;
let categoryChart = null;
let currentIndex = -1;

// Load and parse JSONL file
async function loadTestData() {
    try {
        const response = await fetch('results.jsonl');
        const text = await response.text();

        // Parse JSONL (one JSON object per line)
        testData = text
            .trim()
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line))
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort chronologically

        console.log(`Loaded ${testData.length} test results`);
        renderDashboard();
    } catch (error) {
        console.error('Error loading test data:', error);
        document.getElementById('latest-commit').textContent = 'Error loading data';
    }
}

// Render all dashboard components
function renderDashboard() {
    if (testData.length === 0) {
        document.getElementById('latest-commit').textContent = 'No data available';
        return;
    }

    currentIndex = testData.length - 1;

    // Setup scrubber first
    setupScrubber();

    // Render timeline chart (shows all history)
    renderTimelineChart();

    // Render commits table
    renderCommitsTable();

    // Update last updated timestamp
    document.getElementById('last-updated').textContent = new Date().toLocaleString();

    // Trigger initial display via scrubber
    updateForCommit(currentIndex);
}

// Update summary cards and category chart for a specific commit
function updateForCommit(index) {
    const commit = testData[index];
    if (!commit) return;

    currentIndex = index;

    // Update summary cards
    document.getElementById('latest-commit').textContent = commit.commit;
    document.getElementById('latest-message').textContent = commit.message;

    document.getElementById('total-tests').textContent = commit.stats.total;
    document.getElementById('pass-count').textContent = commit.stats.pass;
    document.getElementById('fail-count').textContent = commit.stats.fail;

    const passPercent = ((commit.stats.pass / commit.stats.total) * 100).toFixed(1);
    const failPercent = ((commit.stats.fail / commit.stats.total) * 100).toFixed(1);

    document.getElementById('pass-percent').textContent = `${passPercent}%`;
    document.getElementById('fail-percent').textContent = `${failPercent}%`;

    if (commit.newTests !== 0) {
        const sign = commit.newTests > 0 ? '+' : '';
        document.getElementById('new-tests').textContent = `${sign}${commit.newTests} new`;
    } else {
        document.getElementById('new-tests').textContent = '';
    }

    // Update category chart
    renderCategoryChart(commit);
}

// Setup scrubber
function setupScrubber() {
    const scrubber = document.getElementById('commit-scrubber');
    const scrubberInfo = document.getElementById('scrubber-info');

    scrubber.max = testData.length - 1;
    scrubber.value = testData.length - 1;

    scrubber.addEventListener('input', (e) => {
        const index = parseInt(e.target.value);
        const commit = testData[index];

        if (commit) {
            const date = new Date(commit.date).toLocaleDateString();
            const passPercent = ((commit.stats.pass / commit.stats.total) * 100).toFixed(1);

            scrubberInfo.textContent = `${commit.commit} (${date}): ${commit.stats.pass}/${commit.stats.total} (${passPercent}%) - ${commit.message}`;

            // Update summary cards and category chart
            updateForCommit(index);
        }
    });

    // Trigger initial display
    scrubber.dispatchEvent(new Event('input'));
}

// Render timeline chart
function renderTimelineChart() {
    const ctx = document.getElementById('timeline-chart').getContext('2d');

    const labels = testData.map(d => {
        const date = new Date(d.date);
        return `${d.commit.substring(0, 7)} (${date.toLocaleDateString()})`;
    });

    const passData = testData.map(d => d.stats.pass);
    const failData = testData.map(d => d.stats.fail);
    const totalData = testData.map(d => d.stats.total);

    if (timelineChart) {
        timelineChart.destroy();
    }

    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Passing',
                    data: passData,
                    borderColor: '#5a5',
                    backgroundColor: 'rgba(85, 170, 85, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Failing',
                    data: failData,
                    borderColor: '#d55',
                    backgroundColor: 'rgba(221, 85, 85, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#aaa' }
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#333' },
                    ticks: { color: '#888' }
                },
                x: {
                    grid: { color: '#333' },
                    ticks: { color: '#888', maxRotation: 45 }
                }
            }
        }
    });
}

// Render category chart
function renderCategoryChart(commit) {
    const ctx = document.getElementById('category-chart').getContext('2d');

    const categories = commit.categories || {};
    const labels = Object.keys(categories);
    const passData = labels.map(cat => categories[cat].pass);
    const failData = labels.map(cat => categories[cat].fail);

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Passing',
                    data: passData,
                    backgroundColor: '#5a5'
                },
                {
                    label: 'Failing',
                    data: failData,
                    backgroundColor: '#d55'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#aaa', font: { size: 10 } }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: '#333' },
                    ticks: { color: '#888', font: { size: 10 } }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: '#333' },
                    ticks: { color: '#888' }
                }
            }
        }
    });
}

// Render commits table
function renderCommitsTable() {
    const tbody = document.getElementById('commits-tbody');
    tbody.innerHTML = '';

    // Show last 20 commits by default
    const recentData = testData.slice(-20).reverse();

    recentData.forEach((commit, index) => {
        const prevIndex = testData.length - index - 2;
        const prev = prevIndex >= 0 ? testData[prevIndex] : null;

        const row = document.createElement('tr');

        // Add regression/improvement highlighting
        if (commit.regression) {
            row.classList.add('regression-row');
        } else if (prev && commit.stats.pass > prev.stats.pass) {
            row.classList.add('improvement-row');
        }

        const date = new Date(commit.date).toLocaleDateString();
        const passPercent = ((commit.stats.pass / commit.stats.total) * 100).toFixed(1);

        let delta = '';
        let deltaClass = 'delta-neutral';
        if (prev) {
            const diff = commit.stats.pass - prev.stats.pass;
            if (diff > 0) {
                delta = `+${diff}`;
                deltaClass = 'delta-positive';
            } else if (diff < 0) {
                delta = `${diff}`;
                deltaClass = 'delta-negative';
            } else {
                delta = '–';
            }
        }

        const deltaText = delta || '–';

        row.innerHTML = `
            <td><span class="commit-hash">${commit.commit}</span></td>
            <td>${date}</td>
            <td>${commit.author}</td>
            <td>${commit.message}</td>
            <td>${commit.stats.total}</td>
            <td>${commit.stats.pass}</td>
            <td>${commit.stats.fail}</td>
            <td>${passPercent}%</td>
            <td><span class="${deltaClass}">${deltaText}</span></td>
        `;

        tbody.appendChild(row);
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadTestData();
});
