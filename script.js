/* ═══════════════════════════════════════════════
   ExpenseIQ — Core Application Logic
   ═══════════════════════════════════════════════ */

// ─── State ───
const STORAGE_KEY = 'expenseiq_data';
const STORAGE_BACKUP_KEY = 'expenseiq_data_backup';
const THEME_KEY = 'expenseiq_theme';
const CATEGORIES = ['Food','Travel','Shopping','Others'];
const CAT_EMOJI = { Food:'🍔', Travel:'✈️', Shopping:'🛍️', Others:'📦' };
const CAT_COLORS = { Food:'#ef4444', Travel:'#3b82f6', Shopping:'#f59e0b', Others:'#8b5cf6' };

// Robust data loading with fallback
let expenses = loadExpenses();
let activeFilter = 'All';
let searchQuery = '';
let deleteTargetId = null;
let charts = {};

function loadExpenses() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
        // Try backup
        const backup = localStorage.getItem(STORAGE_BACKUP_KEY);
        if (backup) {
            const parsed = JSON.parse(backup);
            if (Array.isArray(parsed)) {
                localStorage.setItem(STORAGE_KEY, backup);
                return parsed;
            }
        }
    } catch(e) {
        console.error('Failed to load expenses:', e);
    }
    return [];
}

// ─── DOM Refs ───
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const DOM = {
    sidebar: $('sidebar'), overlay: $('sidebar-overlay'), hamburger: $('hamburger'),
    mainContent: $('main-content'), greeting: $('greeting'),
    totalSpent: $('total-spent'), monthSpent: $('month-spent'),
    totalCount: $('total-count'), dailyAvg: $('daily-avg'), monthTrend: $('month-trend'),
    insightText: $('insight-text'), insightBanner: $('insights-banner'),
    recentList: $('recent-list'), expenseList: $('expense-list'),
    modalOverlay: $('modal-overlay'), modalTitle: $('modal-title'),
    form: $('expense-form'),
    inpAmount: $('inp-amount'), inpCategory: $('inp-category'),
    inpDate: $('inp-date'), inpDesc: $('inp-desc'), inpId: $('inp-id'),
    deleteOverlay: $('delete-overlay'),
    filterChips: $('filter-chips'), searchInput: $('search-input'),
    insightsList: $('insights-list'), toastContainer: $('toast-container'),
};

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateGreeting();
    bindEvents();
    render();
});

// ─── Theme ───
function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') document.documentElement.setAttribute('data-theme','dark');
    updateThemeLabels();
}
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
    updateThemeLabels();
    renderCharts();
}
function updateThemeLabels() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeBtn = $('theme-toggle');
    if (themeBtn) themeBtn.innerHTML = isDark ? '☀️ <span>Light Mode</span>' : '🌙 <span>Dark Mode</span>';
}

// ─── Greeting ───
function updateGreeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    DOM.greeting.textContent = g + ' 👋';
}

// ─── Events ───
function bindEvents() {
    // Nav
    $$('.nav-btn[data-view]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
    $$('.bottom-nav-btn[data-view]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
    $('btn-view-all').addEventListener('click', () => switchView('expenses'));

    // Sidebar mobile
    DOM.hamburger.addEventListener('click', () => { DOM.sidebar.classList.toggle('open'); DOM.overlay.classList.toggle('active'); });
    DOM.overlay.addEventListener('click', () => { DOM.sidebar.classList.remove('open'); DOM.overlay.classList.remove('active'); });

    // Theme
    $('theme-toggle').addEventListener('click', toggleTheme);
    $('bottom-theme-toggle')?.addEventListener('click', toggleTheme);

    // Add expense buttons
    ['btn-add-expense-hero','btn-add-expense-list','mobile-add-btn','fab-add'].forEach(id => {
        $(id)?.addEventListener('click', openAddModal);
    });

    // Modal
    $('modal-close').addEventListener('click', closeModal);
    $('btn-cancel').addEventListener('click', closeModal);
    DOM.modalOverlay.addEventListener('click', e => { if (e.target === DOM.modalOverlay) closeModal(); });
    DOM.form.addEventListener('submit', handleSave);

    // Delete modal
    $('delete-close').addEventListener('click', closeDeleteModal);
    $('btn-cancel-delete').addEventListener('click', closeDeleteModal);
    $('btn-confirm-delete').addEventListener('click', confirmDelete);
    DOM.deleteOverlay.addEventListener('click', e => { if (e.target === DOM.deleteOverlay) closeDeleteModal(); });

    // Filters
    DOM.filterChips.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        DOM.filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.category;
        renderExpenseList();
    });

    // Search
    DOM.searchInput.addEventListener('input', e => { searchQuery = e.target.value.toLowerCase(); renderExpenseList(); });

    // Keyboard
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDeleteModal(); closeImportModal(); closeClearAllModal(); } });

    // ─── Data Management ───
    $('btn-export')?.addEventListener('click', exportData);
    $('btn-import')?.addEventListener('click', () => $('import-overlay').classList.add('active'));
    $('btn-clear-all')?.addEventListener('click', () => $('clearall-overlay').classList.add('active'));

    // Import modal
    $('import-close')?.addEventListener('click', closeImportModal);
    $('btn-cancel-import')?.addEventListener('click', closeImportModal);
    $('import-overlay')?.addEventListener('click', e => { if (e.target === $('import-overlay')) closeImportModal(); });
    $('btn-confirm-import')?.addEventListener('click', () => {
        const fileInput = $('import-file');
        if (fileInput?.files?.[0]) {
            importData(fileInput.files[0]);
            closeImportModal();
            fileInput.value = '';
        } else {
            showToast('Please select a file first.', 'error');
        }
    });

    // Clear all modal
    $('clearall-close')?.addEventListener('click', closeClearAllModal);
    $('btn-cancel-clearall')?.addEventListener('click', closeClearAllModal);
    $('clearall-overlay')?.addEventListener('click', e => { if (e.target === $('clearall-overlay')) closeClearAllModal(); });
    $('btn-confirm-clearall')?.addEventListener('click', () => { clearAllData(); closeClearAllModal(); });
}

function closeImportModal() { $('import-overlay')?.classList.remove('active'); }
function closeClearAllModal() { $('clearall-overlay')?.classList.remove('active'); }

// ─── View Switching ───
function switchView(view) {
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`view-${view}`).classList.add('active');
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $$('.bottom-nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    DOM.sidebar.classList.remove('open');
    DOM.overlay.classList.remove('active');
    if (view === 'analytics') renderAnalytics();
}

// ─── CRUD & Data Persistence ───
function save() {
    try {
        const data = JSON.stringify(expenses);
        localStorage.setItem(STORAGE_KEY, data);
        localStorage.setItem(STORAGE_BACKUP_KEY, data);
        localStorage.setItem(STORAGE_KEY + '_timestamp', new Date().toISOString());
        updateSaveStatus('saved');
    } catch(e) {
        console.error('Save failed:', e);
        updateSaveStatus('error');
        showToast('⚠️ Failed to save data! Export a backup.', 'error');
    }
}

function updateSaveStatus(state) {
    const el = $('save-status');
    if (!el) return;
    el.classList.remove('saving','error');
    if (state === 'saved') {
        el.innerHTML = '💾 <span>All data saved ✅</span>';
    } else if (state === 'saving') {
        el.classList.add('saving');
        el.innerHTML = '⏳ <span>Saving...</span>';
    } else if (state === 'error') {
        el.classList.add('error');
        el.innerHTML = '❌ <span>Save failed!</span>';
    }
}

// Auto-save on page close
window.addEventListener('beforeunload', () => {
    try {
        const data = JSON.stringify(expenses);
        localStorage.setItem(STORAGE_KEY, data);
        localStorage.setItem(STORAGE_BACKUP_KEY, data);
    } catch(e) {}
});

// ─── Export Data ───
function exportData() {
    const exportObj = {
        app: 'ExpenseIQ',
        version: '1.0',
        exportDate: new Date().toISOString(),
        expenseCount: expenses.length,
        expenses: expenses
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExpenseIQ_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${expenses.length} expenses!`, 'success');
}

// ─── Import Data ───
function importData(file) {
    if (!file) { showToast('No file selected.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            let imported = [];
            // Support both raw array and wrapped format
            if (Array.isArray(json)) {
                imported = json;
            } else if (json.expenses && Array.isArray(json.expenses)) {
                imported = json.expenses;
            } else {
                showToast('Invalid backup file format.', 'error');
                return;
            }
            // Validate each expense
            imported = imported.filter(exp => exp.amount && exp.category && exp.date && exp.description);
            if (imported.length === 0) {
                showToast('No valid expenses found in file.', 'error');
                return;
            }
            // Merge without duplicates (by id)
            const existingIds = new Set(expenses.map(e => e.id));
            let addedCount = 0;
            imported.forEach(exp => {
                if (!exp.id) exp.id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
                if (!existingIds.has(exp.id)) {
                    expenses.push(exp);
                    existingIds.add(exp.id);
                    addedCount++;
                }
            });
            save();
            render();
            showToast(`Imported ${addedCount} new expenses! (${imported.length - addedCount} duplicates skipped)`, 'success');
        } catch(err) {
            console.error('Import error:', err);
            showToast('Failed to parse backup file.', 'error');
        }
    };
    reader.readAsText(file);
}

// ─── Clear All Data ───
function clearAllData() {
    expenses = [];
    save();
    render();
    showToast('All data cleared.', 'info');
}

function openAddModal() {
    DOM.modalTitle.textContent = 'Add Expense';
    DOM.form.reset();
    DOM.inpId.value = '';
    DOM.inpDate.value = new Date().toISOString().split('T')[0];
    $('btn-save').textContent = 'Save Expense';
    DOM.modalOverlay.classList.add('active');
}
function openEditModal(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    DOM.modalTitle.textContent = 'Edit Expense';
    DOM.inpAmount.value = exp.amount;
    DOM.inpCategory.value = exp.category;
    DOM.inpDate.value = exp.date;
    DOM.inpDesc.value = exp.description;
    DOM.inpId.value = exp.id;
    $('btn-save').textContent = 'Update Expense';
    DOM.modalOverlay.classList.add('active');
}
function closeModal() { DOM.modalOverlay.classList.remove('active'); }

function handleSave(e) {
    e.preventDefault();
    const data = {
        amount: parseFloat(DOM.inpAmount.value),
        category: DOM.inpCategory.value,
        date: DOM.inpDate.value,
        description: DOM.inpDesc.value.trim(),
    };
    const editId = DOM.inpId.value;
    if (editId) {
        const idx = expenses.findIndex(e => e.id === editId);
        if (idx > -1) { expenses[idx] = { ...expenses[idx], ...data }; }
        showToast('Expense updated!', 'success');
    } else {
        data.id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
        data.createdAt = Date.now();
        expenses.push(data);
        showToast('Expense added!', 'success');
    }
    save(); closeModal(); render();
}

function openDeleteModal(id) { deleteTargetId = id; DOM.deleteOverlay.classList.add('active'); }
function closeDeleteModal() { deleteTargetId = null; DOM.deleteOverlay.classList.remove('active'); }
function confirmDelete() {
    if (!deleteTargetId) return;
    expenses = expenses.filter(e => e.id !== deleteTargetId);
    save(); closeDeleteModal(); render();
    showToast('Expense deleted.', 'info');
}

// ─── Toast ───
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
    DOM.toastContainer.appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ─── Render ───
function render() {
    renderSummary();
    renderInsight();
    renderRecentList();
    renderExpenseList();
    renderCharts();
}

function renderSummary() {
    const total = expenses.reduce((s,e) => s + e.amount, 0);
    const now = new Date();
    const thisMonth = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const monthTotal = thisMonth.reduce((s,e) => s + e.amount, 0);

    // Last month comparison
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastMonth = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear(); });
    const lastMonthTotal = lastMonth.reduce((s,e) => s + e.amount, 0);

    let trendHTML = '';
    if (lastMonthTotal > 0) {
        const pct = ((monthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(0);
        trendHTML = pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
    }
    DOM.monthTrend.innerHTML = trendHTML;

    const daysInMonth = now.getDate();
    const avg = thisMonth.length > 0 ? (monthTotal / daysInMonth) : 0;

    DOM.totalSpent.textContent = fmt(total);
    DOM.monthSpent.textContent = fmt(monthTotal);
    DOM.totalCount.textContent = expenses.length;
    DOM.dailyAvg.textContent = fmt(avg);
}

function fmt(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits:0, maximumFractionDigits:0 }); }

function renderInsight() {
    if (expenses.length === 0) {
        DOM.insightText.textContent = 'Add some expenses to see smart insights about your spending habits.';
        return;
    }
    const now = new Date();
    const thisMonth = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    if (thisMonth.length === 0) {
        DOM.insightText.textContent = 'No expenses this month yet. Start tracking!';
        return;
    }
    const catTotals = {};
    thisMonth.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + e.amount; });
    const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];
    const pct = ((topCat[1] / thisMonth.reduce((s,e)=>s+e.amount,0)) * 100).toFixed(0);
    DOM.insightText.textContent = `You spent the most on ${topCat[0]} this month — ${fmt(topCat[1])} (${pct}% of total). ${topCat[0] === 'Food' ? 'Try cooking at home more!' : topCat[0] === 'Shopping' ? 'Consider a no-spend challenge!' : 'Keep tracking to find savings!'}`;
}

function buildExpenseHTML(exp) {
    return `<div class="expense-item" data-id="${exp.id}">
        <div class="exp-icon ${exp.category}">${CAT_EMOJI[exp.category]||'📦'}</div>
        <div class="exp-details">
            <div class="exp-desc">${escHTML(exp.description)}</div>
            <div class="exp-meta"><span>${exp.category}</span><span>${formatDate(exp.date)}</span></div>
        </div>
        <div class="exp-amount">-${fmt(exp.amount)}</div>
        <div class="exp-actions">
            <button class="btn-edit" onclick="openEditModal('${exp.id}')" title="Edit">✏️</button>
            <button class="btn-delete" onclick="openDeleteModal('${exp.id}')" title="Delete">🗑️</button>
        </div>
    </div>`;
}

function renderRecentList() {
    const sorted = [...expenses].sort((a,b) => new Date(b.date)-new Date(a.date));
    const recent = sorted.slice(0,5);
    if (recent.length === 0) {
        DOM.recentList.innerHTML = '<div class="empty-state"><p>📋 No expenses yet. Start tracking!</p></div>';
        return;
    }
    DOM.recentList.innerHTML = recent.map(buildExpenseHTML).join('');
}

function renderExpenseList() {
    let filtered = [...expenses];
    if (activeFilter !== 'All') filtered = filtered.filter(e => e.category === activeFilter);
    if (searchQuery) filtered = filtered.filter(e => e.description.toLowerCase().includes(searchQuery) || e.category.toLowerCase().includes(searchQuery));
    filtered.sort((a,b) => new Date(b.date)-new Date(a.date));
    if (filtered.length === 0) {
        DOM.expenseList.innerHTML = '<div class="empty-state"><p>📋 No expenses found.</p></div>';
        return;
    }
    DOM.expenseList.innerHTML = filtered.map(buildExpenseHTML).join('');
}

// ─── Charts ───
function getChartTextColor() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '#a0a5b8' : '#5a6070';
}
function getChartGridColor() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
}

function renderCharts() {
    renderCategoryChart();
    renderMonthlyChart();
}

function renderCategoryChart() {
    const catTotals = {};
    CATEGORIES.forEach(c => catTotals[c] = 0);
    expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + e.amount; });

    const labels = CATEGORIES;
    const data = labels.map(c => catTotals[c]);
    const colors = labels.map(c => CAT_COLORS[c]);

    if (charts.category) charts.category.destroy();
    charts.category = new Chart($('chart-category'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
        options: {
            responsive: true, cutout: '65%',
            plugins: {
                legend: { position:'bottom', labels:{ color:getChartTextColor(), padding:16, font:{family:'Inter',size:12} } }
            }
        }
    });
}

function renderMonthlyChart() {
    const monthMap = {};
    expenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        monthMap[key] = (monthMap[key]||0) + e.amount;
    });
    const sorted = Object.entries(monthMap).sort((a,b) => a[0].localeCompare(b[0])).slice(-6);
    const labels = sorted.map(([k]) => { const [y,m] = k.split('-'); return new Date(y,m-1).toLocaleDateString('en',{month:'short',year:'2-digit'}); });
    const data = sorted.map(([,v]) => v);

    if (charts.monthly) charts.monthly.destroy();
    charts.monthly = new Chart($('chart-monthly'), {
        type: 'bar',
        data: { labels, datasets: [{ label:'Spending', data, backgroundColor:'rgba(108,92,231,.7)', borderRadius:8, borderSkipped:false }] },
        options: {
            responsive: true,
            plugins: { legend:{ display:false } },
            scales: {
                x:{ grid:{display:false}, ticks:{color:getChartTextColor(), font:{family:'Inter',size:11}} },
                y:{ grid:{color:getChartGridColor()}, ticks:{color:getChartTextColor(), font:{family:'Inter',size:11}, callback:v=>'₹'+v} }
            }
        }
    });
}

function renderAnalytics() {
    renderHeatmap();
    renderTimelineChart();
    renderPieChart();
    renderWeekdayChart();
    renderInsightsList();
}

function renderTimelineChart() {
    const dayMap = {};
    expenses.forEach(e => { dayMap[e.date] = (dayMap[e.date]||0) + e.amount; });
    const sorted = Object.entries(dayMap).sort((a,b) => a[0].localeCompare(b[0])).slice(-30);
    const labels = sorted.map(([k]) => new Date(k).toLocaleDateString('en',{day:'numeric',month:'short'}));
    const data = sorted.map(([,v]) => v);

    if (charts.timeline) charts.timeline.destroy();
    charts.timeline = new Chart($('chart-timeline'), {
        type: 'line',
        data: { labels, datasets: [{ label:'Daily Spending', data, borderColor:'#6c5ce7', backgroundColor:'rgba(108,92,231,.1)', fill:true, tension:.4, pointRadius:3, pointBackgroundColor:'#6c5ce7' }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend:{display:false} },
            scales: {
                x:{ grid:{display:false}, ticks:{color:getChartTextColor(), font:{family:'Inter',size:10}, maxTicksLimit:10} },
                y:{ grid:{color:getChartGridColor()}, ticks:{color:getChartTextColor(), font:{family:'Inter',size:10}, callback:v=>'₹'+v} }
            }
        }
    });
}

function renderPieChart() {
    const catTotals = {};
    CATEGORIES.forEach(c => catTotals[c] = 0);
    expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + e.amount; });
    const labels = CATEGORIES;
    const data = labels.map(c => catTotals[c]);
    const colors = labels.map(c => CAT_COLORS[c]);

    if (charts.pie) charts.pie.destroy();
    charts.pie = new Chart($('chart-pie'), {
        type: 'pie',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth:2, borderColor: document.documentElement.getAttribute('data-theme')==='dark' ? '#1e2130' : '#fff' }] },
        options: {
            responsive: true,
            plugins: { legend:{ position:'bottom', labels:{color:getChartTextColor(), padding:12, font:{family:'Inter',size:11}} } }
        }
    });
}

function renderWeekdayChart() {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayTotals = [0,0,0,0,0,0,0];
    expenses.forEach(e => { dayTotals[new Date(e.date).getDay()] += e.amount; });

    if (charts.weekday) charts.weekday.destroy();
    charts.weekday = new Chart($('chart-weekday'), {
        type: 'bar',
        data: { labels: days, datasets: [{ label:'Spending', data:dayTotals, backgroundColor: days.map((_,i) => `hsla(${i*50},70%,60%,.7)`), borderRadius:6, borderSkipped:false }] },
        options: {
            responsive: true, indexAxis:'y',
            plugins: { legend:{display:false} },
            scales: {
                x:{ grid:{color:getChartGridColor()}, ticks:{color:getChartTextColor(), font:{family:'Inter',size:10}, callback:v=>'₹'+v} },
                y:{ grid:{display:false}, ticks:{color:getChartTextColor(), font:{family:'Inter',size:11}} }
            }
        }
    });
}

function renderInsightsList() {
    if (expenses.length === 0) {
        DOM.insightsList.innerHTML = '<div class="empty-state"><p>Add expenses to see analytics insights.</p></div>';
        return;
    }
    const insights = generateInsights();
    DOM.insightsList.innerHTML = insights.map(i =>
        `<div class="insight-card"><div class="insight-emoji">${i.emoji}</div><div class="insight-body"><div class="insight-title">${i.title}</div><div class="insight-desc">${i.desc}</div></div></div>`
    ).join('');
}

function generateInsights() {
    const ins = [];
    const now = new Date();
    const thisMonth = expenses.filter(e => { const d = new Date(e.date); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); });
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastMonth = expenses.filter(e => { const d = new Date(e.date); return d.getMonth()===lastMonthDate.getMonth() && d.getFullYear()===lastMonthDate.getFullYear(); });

    // Top category
    if (thisMonth.length > 0) {
        const ct = {}; thisMonth.forEach(e => ct[e.category]=(ct[e.category]||0)+e.amount);
        const top = Object.entries(ct).sort((a,b)=>b[1]-a[1])[0];
        ins.push({ emoji:'🏆', title:`Top Category: ${top[0]}`, desc:`You spent ${fmt(top[1])} on ${top[0]} this month.` });
    }

    // Month-over-month
    const mTotal = thisMonth.reduce((s,e)=>s+e.amount,0);
    const lTotal = lastMonth.reduce((s,e)=>s+e.amount,0);
    if (lTotal > 0) {
        const diff = mTotal - lTotal;
        const pct = ((diff/lTotal)*100).toFixed(0);
        ins.push({ emoji: diff > 0 ? '📈' : '📉', title: diff > 0 ? 'Spending Up' : 'Spending Down', desc:`${diff>0?'Up':'Down'} ${Math.abs(pct)}% compared to last month (${fmt(lTotal)} → ${fmt(mTotal)}).` });
    }

    // Most expensive
    if (expenses.length > 0) {
        const biggest = [...expenses].sort((a,b)=>b.amount-a.amount)[0];
        ins.push({ emoji:'💸', title:'Biggest Expense', desc:`${biggest.description} — ${fmt(biggest.amount)} on ${formatDate(biggest.date)}.` });
    }

    // Average transaction
    if (thisMonth.length > 0) {
        const avg = mTotal / thisMonth.length;
        ins.push({ emoji:'📊', title:'Avg Transaction', desc:`Your average expense this month is ${fmt(avg)} across ${thisMonth.length} transactions.` });
    }

    // Busiest day
    if (thisMonth.length > 0) {
        const dayCount = {};
        thisMonth.forEach(e => dayCount[e.date] = (dayCount[e.date]||0)+1);
        const busiest = Object.entries(dayCount).sort((a,b)=>b[1]-a[1])[0];
        ins.push({ emoji:'📅', title:'Busiest Day', desc:`${formatDate(busiest[0])} had ${busiest[1]} transaction(s).` });
    }

    return ins;
}

// ─── Helpers ───
function formatDate(d) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function escHTML(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

/* ═══════════════════════════════════════════════
   AI ENGINE — Smart Features
   ═══════════════════════════════════════════════ */

// ─── Keyword → Category Mapping (NLP) ───
const CAT_KEYWORDS = {
    Food: ['food','pizza','burger','lunch','dinner','breakfast','coffee','tea','chai','snack','restaurant','biryani','dosa','noodle','rice','chicken','paneer','swiggy','zomato','domino','mcdonald','kfc','subway','starbucks','juice','milk','bread','grocery','groceries','fruit','vegetable','cake','ice cream','sweet','chocolate','bakery','canteen','mess','tiffin','eat','ate','meal','thali','samosa','maggi','cook'],
    Travel: ['uber','ola','cab','taxi','auto','rickshaw','bus','train','metro','flight','fuel','petrol','diesel','gas','parking','toll','travel','trip','commute','lyft','rapido','grab','fare','ticket','airport','railway'],
    Shopping: ['amazon','flipkart','myntra','shop','shopping','clothes','shoes','shirt','pant','dress','gadget','phone','laptop','headphone','watch','bag','cosmetic','makeup','beauty','electronics','furniture','home','decor','appliance','buy','bought','purchase','order','online','store','mall'],
    Others: ['bill','rent','emi','loan','insurance','subscription','netflix','spotify','gym','medicine','doctor','hospital','pharmacy','fee','fees','tuition','book','course','donation','gift','repair','maintenance','recharge','wifi','internet','electricity','water']
};

function aiDetectCategory(text) {
    const lower = text.toLowerCase();
    const scores = {};
    CATEGORIES.forEach(cat => {
        scores[cat] = 0;
        CAT_KEYWORDS[cat].forEach(kw => {
            if (lower.includes(kw)) scores[cat] += kw.length;
        });
    });
    const best = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
    return best[1] > 0 ? best[0] : null;
}

// ─── NLP Expense Parser ───
function aiParseExpense(text) {
    const result = { amount: null, category: null, date: null, description: text.trim() };
    // Extract amount
    const amountMatch = text.match(/(?:₹|rs\.?|inr|spent|paid)\s*(\d+[\d,]*\.?\d*)/i) || text.match(/(\d+[\d,]*\.?\d*)\s*(?:₹|rs\.?|rupees?|inr|bucks?)/i) || text.match(/(\d{2,}[\d,]*\.?\d*)/);
    if (amountMatch) {
        result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        result.description = result.description.replace(amountMatch[0], '').trim();
    }
    // Extract date
    const today = new Date();
    if (/\btoday\b/i.test(text)) result.date = today.toISOString().split('T')[0];
    else if (/\byesterday\b/i.test(text)) {
        const y = new Date(today); y.setDate(y.getDate()-1);
        result.date = y.toISOString().split('T')[0];
    } else if (/\blast\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(text)) {
        const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const match = text.match(/last\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
        const targetDay = dayNames.indexOf(match[1].toLowerCase());
        const d = new Date(today);
        let diff = (today.getDay() - targetDay + 7) % 7;
        if (diff === 0) diff = 7;
        d.setDate(d.getDate() - diff);
        result.date = d.toISOString().split('T')[0];
    } else {
        const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
        if (dateMatch) {
            const yr = dateMatch[3] ? (dateMatch[3].length === 2 ? '20'+dateMatch[3] : dateMatch[3]) : today.getFullYear();
            result.date = `${yr}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`;
        } else {
            result.date = today.toISOString().split('T')[0];
        }
    }
    // Clean description
    result.description = result.description.replace(/\b(today|yesterday|last\s*\w+|spent|paid|on|for|rs\.?|₹|inr)\b/gi,'').replace(/\s+/g,' ').trim();
    if (!result.description) result.description = 'Expense';
    result.description = result.description.charAt(0).toUpperCase() + result.description.slice(1);
    // Detect category
    result.category = aiDetectCategory(text) || 'Others';
    return result;
}

// ─── Spending Prediction (Linear Regression) ───
function aiPredictNextMonth() {
    const monthMap = {};
    expenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        monthMap[key] = (monthMap[key]||0) + e.amount;
    });
    const sorted = Object.entries(monthMap).sort((a,b) => a[0].localeCompare(b[0]));
    if (sorted.length < 2) return null;
    const vals = sorted.map(([,v]) => v);
    const n = vals.length;
    const xMean = (n-1)/2;
    const yMean = vals.reduce((s,v)=>s+v,0)/n;
    let num = 0, den = 0;
    vals.forEach((v,i) => { num += (i-xMean)*(v-yMean); den += (i-xMean)**2; });
    const slope = den !== 0 ? num/den : 0;
    const intercept = yMean - slope*xMean;
    const prediction = Math.max(0, intercept + slope*n);
    const confidence = n >= 4 ? 'high' : n >= 2 ? 'medium' : 'low';
    return { prediction: Math.round(prediction), confidence, trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable' };
}

// ─── Anomaly Detection (Z-Score) ───
function aiDetectAnomalies() {
    if (expenses.length < 3) return [];
    const amounts = expenses.map(e => e.amount);
    const mean = amounts.reduce((s,v)=>s+v,0) / amounts.length;
    const std = Math.sqrt(amounts.reduce((s,v)=>s+(v-mean)**2,0)/amounts.length);
    if (std === 0) return [];
    const threshold = 1.8;
    return expenses.filter(e => (e.amount - mean) / std > threshold)
        .map(e => ({ ...e, zScore: ((e.amount - mean)/std).toFixed(1), avgAmount: Math.round(mean) }))
        .sort((a,b) => b.amount - a.amount).slice(0,5);
}

// ─── Budget Recommendations ───
function aiRecommendBudgets() {
    const now = new Date();
    const monthData = {};
    CATEGORIES.forEach(c => monthData[c] = []);
    expenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!monthData[e.category]) monthData[e.category] = [];
        monthData[e.category].push({ month: key, amount: e.amount });
    });
    const budgets = [];
    CATEGORIES.forEach(cat => {
        const catMonths = {};
        monthData[cat].forEach(e => { catMonths[e.month] = (catMonths[e.month]||0) + e.amount; });
        const vals = Object.values(catMonths);
        if (vals.length === 0) { budgets.push({ category: cat, budget: 0, spent: 0, avg: 0 }); return; }
        const avg = vals.reduce((s,v)=>s+v,0)/vals.length;
        const budget = Math.round(avg * 0.9);
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const spent = catMonths[thisMonthKey] || 0;
        budgets.push({ category: cat, budget, spent: Math.round(spent), avg: Math.round(avg) });
    });
    return budgets;
}

// ─── Spending Personality ───
function aiSpendingPersonality() {
    if (expenses.length < 3) return { type: 'New User', emoji: '🌱', desc: 'Add more expenses to discover your spending personality!' };
    const catTotals = {};
    expenses.forEach(e => catTotals[e.category] = (catTotals[e.category]||0) + e.amount);
    const total = Object.values(catTotals).reduce((s,v)=>s+v,0);
    const catPcts = {};
    Object.entries(catTotals).forEach(([k,v]) => catPcts[k] = (v/total)*100);
    const top = Object.entries(catPcts).sort((a,b)=>b[1]-a[1])[0];
    const monthMap = {};
    expenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        monthMap[key] = (monthMap[key]||0) + e.amount;
    });
    const monthVals = Object.values(monthMap);
    const avgMonth = monthVals.reduce((s,v)=>s+v,0)/monthVals.length;
    const variance = monthVals.reduce((s,v)=>s+(v-avgMonth)**2,0)/monthVals.length;
    const cv = avgMonth > 0 ? Math.sqrt(variance)/avgMonth : 0;

    if (top[0] === 'Food' && top[1] > 45) return { type: 'Foodie', emoji: '🍕', desc: 'Food dominates your spending. You love good meals!' };
    if (top[0] === 'Travel' && top[1] > 40) return { type: 'Explorer', emoji: '🌍', desc: 'Travel is your biggest expense. Adventure calls!' };
    if (top[0] === 'Shopping' && top[1] > 40) return { type: 'Shopaholic', emoji: '🛍️', desc: 'Shopping is your go-to. You love a good deal!' };
    if (cv < 0.2) return { type: 'Steady Saver', emoji: '🏦', desc: 'Your spending is very consistent month to month.' };
    if (cv > 0.5) return { type: 'Impulsive', emoji: '⚡', desc: 'Your spending varies a lot. Consider setting budgets!' };
    return { type: 'Balanced', emoji: '⚖️', desc: 'Your spending is well-distributed across categories.' };
}

// ─── AI Savings Tips ───
function aiGenerateTips() {
    const tips = [];
    if (expenses.length === 0) {
        tips.push({ icon:'📝', title:'Start Tracking', desc:'Begin adding expenses to get personalized saving tips.', savings:null });
        return tips;
    }
    const now = new Date();
    const thisMonth = expenses.filter(e => { const d=new Date(e.date); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); });
    const catTotals = {};
    thisMonth.forEach(e => catTotals[e.category]=(catTotals[e.category]||0)+e.amount);
    const mTotal = thisMonth.reduce((s,e)=>s+e.amount,0);

    if (catTotals.Food && catTotals.Food > mTotal*0.4)
        tips.push({ icon:'🍳', title:'Cook More at Home', desc:`Food is ${Math.round(catTotals.Food/mTotal*100)}% of spending. Cooking 3x/week could save significantly.`, savings: Math.round(catTotals.Food*0.3) });
    if (catTotals.Travel && catTotals.Travel > mTotal*0.25)
        tips.push({ icon:'🚌', title:'Try Public Transport', desc:`Travel costs are high. Using metro/bus 2x/week could help.`, savings: Math.round(catTotals.Travel*0.25) });
    if (catTotals.Shopping && catTotals.Shopping > mTotal*0.3)
        tips.push({ icon:'📋', title:'Make a Wish List', desc:`Shopping is ${Math.round(catTotals.Shopping/mTotal*100)}% of spending. Wait 48hrs before impulse buys.`, savings: Math.round(catTotals.Shopping*0.35) });

    const weekendExpenses = thisMonth.filter(e => { const d=new Date(e.date).getDay(); return d===0||d===6; });
    const weekendTotal = weekendExpenses.reduce((s,e)=>s+e.amount,0);
    if (weekendTotal > mTotal*0.4)
        tips.push({ icon:'📅', title:'Weekend Spending Alert', desc:`${Math.round(weekendTotal/mTotal*100)}% of spending happens on weekends. Plan free activities!`, savings: Math.round(weekendTotal*0.2) });

    const prediction = aiPredictNextMonth();
    if (prediction && prediction.trend === 'increasing')
        tips.push({ icon:'📈', title:'Upward Trend Detected', desc:`Your spending is trending upward. AI predicts ${fmt(prediction.prediction)} next month.`, savings: null });

    if (thisMonth.length > 0) {
        const avgTx = mTotal / thisMonth.length;
        tips.push({ icon:'💡', title:'Small Wins Matter', desc:`Your average transaction is ${fmt(avgTx)}. Cutting just 10% on each saves a lot over time.`, savings: Math.round(mTotal*0.1) });
    }

    const subs = thisMonth.filter(e => /netflix|spotify|subscription|premium|membership/i.test(e.description));
    if (subs.length > 0) {
        const subTotal = subs.reduce((s,e)=>s+e.amount,0);
        tips.push({ icon:'📺', title:'Review Subscriptions', desc:`You have ${subs.length} subscription expense(s) totaling ${fmt(subTotal)}. Audit which ones you actually use.`, savings: Math.round(subTotal*0.3) });
    }

    return tips.length > 0 ? tips : [{ icon:'✅', title:'Great Job!', desc:'Your spending looks balanced. Keep it up!', savings: null }];
}

// ═══════════ AI RENDER FUNCTIONS ═══════════

function renderAIDashboard() {
    // Prediction
    const pred = aiPredictNextMonth();
    if (pred) {
        $('ai-forecast').textContent = fmt(pred.prediction);
        $('ai-forecast-sub').textContent = `Trend: ${pred.trend} (${pred.confidence} confidence)`;
    } else {
        $('ai-forecast').textContent = '—';
        $('ai-forecast-sub').textContent = 'Add 2+ months of data';
    }
    // Personality
    const pers = aiSpendingPersonality();
    $('ai-personality').textContent = `${pers.emoji} ${pers.type}`;
    $('ai-personality-sub').textContent = pers.desc;
    // Budget
    const budgets = aiRecommendBudgets();
    const totalBudget = budgets.reduce((s,b)=>s+b.budget,0);
    if (totalBudget > 0) {
        $('ai-budget').textContent = fmt(totalBudget);
        $('ai-budget-sub').textContent = '10% below your average';
    } else {
        $('ai-budget').textContent = '—';
        $('ai-budget-sub').textContent = 'Not enough data';
    }
}

function renderAIAssistantView() {
    renderAIBudgetGrid();
    renderAIAnomalyList();
    renderAITipsList();
}

function renderAIBudgetGrid() {
    const budgets = aiRecommendBudgets();
    const grid = $('ai-budget-grid');
    if (budgets.every(b => b.budget === 0)) {
        grid.innerHTML = '<div class="empty-state"><p>Add expenses to see AI budget recommendations.</p></div>';
        return;
    }
    grid.innerHTML = budgets.map(b => {
        const pct = b.budget > 0 ? Math.min((b.spent/b.budget)*100, 100) : 0;
        let statusClass = 'under', statusText = '✅ On Track';
        if (b.budget > 0 && b.spent > b.budget) { statusClass = 'over'; statusText = '🚨 Over Budget'; }
        else if (b.budget > 0 && pct > 75) { statusClass = 'warn'; statusText = '⚠️ Nearing Limit'; }
        return `<div class="ai-budget-item">
            <div class="ai-budget-item-header"><span class="emoji">${CAT_EMOJI[b.category]}</span><span class="cat-name">${b.category}</span></div>
            <div class="ai-budget-bar-wrap"><div class="ai-budget-bar ${b.category}" style="width:${pct}%"></div></div>
            <div class="ai-budget-numbers"><span class="spent">Spent: ${fmt(b.spent)}</span><span class="budget">Budget: ${fmt(b.budget)}</span></div>
            ${b.budget > 0 ? `<span class="ai-budget-status ${statusClass}">${statusText}</span>` : ''}
        </div>`;
    }).join('');
}

function renderAIAnomalyList() {
    const anomalies = aiDetectAnomalies();
    const list = $('ai-anomaly-list');
    if (anomalies.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>✅ No unusual spending detected. Your expenses look normal!</p></div>';
        return;
    }
    list.innerHTML = anomalies.map(a => `<div class="ai-anomaly-item">
        <div class="anomaly-icon">🚨</div>
        <div class="anomaly-body">
            <div class="anomaly-title">${escHTML(a.description)}</div>
            <div class="anomaly-desc">${a.category} · ${formatDate(a.date)} · ${a.zScore}x above average (avg: ${fmt(a.avgAmount)})</div>
        </div>
        <div class="anomaly-amount">-${fmt(a.amount)}</div>
    </div>`).join('');
}

function renderAITipsList() {
    const tips = aiGenerateTips();
    $('ai-tips-list').innerHTML = tips.map(t => `<div class="ai-tip-item">
        <div class="tip-icon">${t.icon}</div>
        <div class="tip-body">
            <div class="tip-title">${t.title}</div>
            <div class="tip-desc">${t.desc}</div>
            ${t.savings ? `<div class="tip-savings">💰 Potential savings: ${fmt(t.savings)}/month</div>` : ''}
        </div>
    </div>`).join('');
}

// ═══════════ AI EVENT BINDINGS ═══════════

function bindAIEvents() {
    // NLP Input
    $('ai-nlp-btn')?.addEventListener('click', handleNLPParse);
    $('ai-nlp-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleNLPParse(); });

    // Auto-categorize on description input
    DOM.inpDesc.addEventListener('input', () => {
        const desc = DOM.inpDesc.value.trim();
        if (desc.length < 3) { $('ai-cat-suggest').style.display = 'none'; return; }
        const detected = aiDetectCategory(desc);
        if (detected && DOM.inpCategory.value !== detected) {
            $('ai-cat-suggest-text').textContent = `${CAT_EMOJI[detected]} ${detected}`;
            $('ai-cat-suggest').style.display = 'flex';
            $('ai-cat-suggest').dataset.category = detected;
        } else {
            $('ai-cat-suggest').style.display = 'none';
        }
    });

    // Apply AI suggestion
    $('ai-apply-cat')?.addEventListener('click', () => {
        const cat = $('ai-cat-suggest').dataset.category;
        if (cat) { DOM.inpCategory.value = cat; $('ai-cat-suggest').style.display = 'none'; showToast('AI category applied!','success'); }
    });
}

function handleNLPParse() {
    const input = $('ai-nlp-input');
    const text = input.value.trim();
    if (!text) { showToast('Please type something!','error'); return; }
    const parsed = aiParseExpense(text);
    if (!parsed.amount) { showToast('Could not detect an amount. Try: "spent 500 on pizza"','error'); return; }

    $('ai-parse-result').innerHTML = `<div class="ai-parsed-card">
        <div class="ai-parsed-title"><span class="ai-sparkle">✨</span> AI Parsed Result</div>
        <div class="ai-parsed-fields">
            <div class="ai-parsed-field"><div class="label">Amount</div><div class="value">${fmt(parsed.amount)}</div></div>
            <div class="ai-parsed-field"><div class="label">Category</div><div class="value">${CAT_EMOJI[parsed.category]} ${parsed.category}</div></div>
            <div class="ai-parsed-field"><div class="label">Date</div><div class="value">${formatDate(parsed.date)}</div></div>
            <div class="ai-parsed-field"><div class="label">Description</div><div class="value">${escHTML(parsed.description)}</div></div>
        </div>
        <div class="ai-parsed-actions">
            <button class="btn btn-primary" id="ai-confirm-add">✅ Add This Expense</button>
            <button class="btn btn-ghost" id="ai-cancel-parse">Cancel</button>
        </div>
    </div>`;

    $('ai-confirm-add').addEventListener('click', () => {
        const data = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
            amount: parsed.amount,
            category: parsed.category,
            date: parsed.date,
            description: parsed.description,
            createdAt: Date.now()
        };
        expenses.push(data);
        save();
        render();
        renderAIDashboard();
        renderAIAssistantView();
        input.value = '';
        $('ai-parse-result').innerHTML = '';
        showToast(`Added "${parsed.description}" — ${fmt(parsed.amount)}`,'success');
    });
    $('ai-cancel-parse')?.addEventListener('click', () => { $('ai-parse-result').innerHTML = ''; });
}

// ═══════════ INTEGRATE AI INTO EXISTING CODE ═══════════

// Patch render() to include AI
const _origRender = render;
// We can't reassign render since it's already a function declaration, so we patch at init
(function patchInit() {
    const origDCL = document.readyState;
    // Override switchView to trigger AI renders
    const _origSwitchView = switchView;
    window._origSwitchView = _origSwitchView;

    // We need to rebind after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAI);
    } else {
        initAI();
    }
})();

function initAI() {
    bindAIEvents();
    renderAIDashboard();
    // Patch render
    const origRenderFn = window.render || render;
    const newRender = function() {
        origRenderFn();
        renderAIDashboard();
    };
    window.render = newRender;

    // Patch switchView
    const origSwitch = switchView;
    window.switchView = function(view) {
        origSwitch(view);
        if (view === 'ai') renderAIAssistantView();
        if (view === 'analytics') renderHeatmap();
    };
    document.querySelectorAll('.nav-btn[data-view]').forEach(b => {
        b.addEventListener('click', () => window.switchView(b.dataset.view));
    });
    document.querySelectorAll('.bottom-nav-btn[data-view]').forEach(b => {
        b.addEventListener('click', () => window.switchView(b.dataset.view));
    });

    // Init voice & PWA
    initVoiceInput();
    initPWA();
}

/* ═══════════════════════════════════════════════
   FEATURE 1: SPENDING HEATMAP (GitHub-style)
   ═══════════════════════════════════════════════ */

function renderHeatmap() {
    const grid = $('heatmap-grid');
    const monthsEl = $('heatmap-months');
    const tooltip = $('heatmap-tooltip');
    if (!grid) return;

    // Build daily spending map
    const dayMap = {};
    expenses.forEach(e => {
        dayMap[e.date] = (dayMap[e.date] || 0) + e.amount;
    });

    // Generate last 6 months of dates
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);
    // Align to the start of the week (Sunday)
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const dates = [];
    const d = new Date(startDate);
    while (d <= today) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    // Pad to fill last week
    while (dates.length % 7 !== 0) {
        const next = new Date(dates[dates.length - 1]);
        next.setDate(next.getDate() + 1);
        dates.push(next);
    }

    // Find max for scaling
    const allAmounts = dates.map(dt => {
        const key = dt.toISOString().split('T')[0];
        return dayMap[key] || 0;
    });
    const maxAmount = Math.max(...allAmounts, 1);

    // Calculate color levels
    function getLevel(amount) {
        if (amount === 0) return 0;
        const pct = amount / maxAmount;
        if (pct <= 0.25) return 1;
        if (pct <= 0.5) return 2;
        if (pct <= 0.75) return 3;
        return 4;
    }

    // Render cells
    grid.innerHTML = '';
    dates.forEach(dt => {
        const key = dt.toISOString().split('T')[0];
        const amount = dayMap[key] || 0;
        const level = getLevel(amount);
        const cell = document.createElement('span');
        cell.className = 'hm-cell hm-box';
        cell.dataset.level = level;
        cell.dataset.date = key;
        cell.dataset.amount = amount;

        cell.addEventListener('mouseenter', (e) => {
            const dateStr = new Date(key).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            tooltip.innerHTML = amount > 0
                ? `<strong>${fmt(amount)}</strong> on ${dateStr}`
                : `No spending on ${dateStr}`;
            tooltip.classList.add('visible');
            const rect = cell.getBoundingClientRect();
            tooltip.style.left = (rect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - 40) + 'px';
            tooltip.style.transform = 'translateX(-50%)';
        });
        cell.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
        grid.appendChild(cell);
    });

    // Month labels
    const weeks = dates.length / 7;
    const cellW = 17; // 14px cell + 3px gap
    const months = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
        const weekStart = dates[w * 7];
        const m = weekStart.getMonth();
        if (m !== lastMonth) {
            months.push({ name: weekStart.toLocaleDateString('en', { month: 'short' }), offset: w * cellW });
            lastMonth = m;
        }
    }
    monthsEl.innerHTML = '';
    months.forEach((m, i) => {
        const span = document.createElement('span');
        span.textContent = m.name;
        const nextOffset = i < months.length - 1 ? months[i + 1].offset : weeks * cellW;
        span.style.width = (nextOffset - m.offset) + 'px';
        monthsEl.appendChild(span);
    });
}

/* ═══════════════════════════════════════════════
   FEATURE 2: VOICE INPUT (Web Speech API)
   ═══════════════════════════════════════════════ */

let voiceRecognition = null;
let isListening = false;

function initVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        const voiceBtn = $('ai-voice-btn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
        return;
    }

    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = 'en-IN';

    const voiceBtn = $('ai-voice-btn');
    const voiceStatus = $('voice-status');
    const nlpInput = $('ai-nlp-input');

    voiceRecognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        voiceStatus.textContent = '🔴 Listening... speak now';
    };

    voiceRecognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        nlpInput.value = transcript;
        if (event.results[0].isFinal) {
            voiceStatus.textContent = '✅ Got it! Click Parse to add.';
        } else {
            voiceStatus.textContent = '🎤 Hearing: "' + transcript + '"';
        }
    };

    voiceRecognition.onerror = (event) => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        if (event.error === 'no-speech') {
            voiceStatus.textContent = '⚠️ No speech detected. Try again.';
        } else if (event.error === 'not-allowed') {
            voiceStatus.textContent = '🚫 Microphone access denied. Check permissions.';
        } else {
            voiceStatus.textContent = '❌ Error: ' + event.error;
        }
        setTimeout(() => { voiceStatus.textContent = ''; }, 3000);
    };

    voiceRecognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        if (nlpInput.value.trim() && voiceStatus.textContent.startsWith('✅')) {
            // Auto-parse after voice capture
            setTimeout(() => handleNLPParse(), 500);
        }
    };

    voiceBtn?.addEventListener('click', toggleVoice);
}

function toggleVoice() {
    if (!voiceRecognition) return;
    if (isListening) {
        voiceRecognition.stop();
    } else {
        $('ai-nlp-input').value = '';
        $('voice-status').textContent = '';
        $('ai-parse-result').innerHTML = '';
        try {
            voiceRecognition.start();
        } catch(e) {
            $('voice-status').textContent = '❌ Could not start voice input.';
        }
    }
}

/* ═══════════════════════════════════════════════
   FEATURE 3: PWA SUPPORT
   ═══════════════════════════════════════════════ */

let deferredInstallPrompt = null;

function initPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        // Show install banner after 3 seconds
        setTimeout(() => {
            const banner = $('pwa-install-banner');
            if (banner && !localStorage.getItem('pwa_dismissed')) {
                banner.classList.add('visible');
            }
        }, 3000);
    });

    $('pwa-install')?.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const result = await deferredInstallPrompt.userChoice;
        if (result.outcome === 'accepted') {
            showToast('App installed! 🎉', 'success');
        }
        deferredInstallPrompt = null;
        $('pwa-install-banner')?.classList.remove('visible');
    });

    $('pwa-dismiss')?.addEventListener('click', () => {
        $('pwa-install-banner')?.classList.remove('visible');
        localStorage.setItem('pwa_dismissed', 'true');
    });

    window.addEventListener('appinstalled', () => {
        showToast('ExpenseIQ installed successfully! 📱', 'success');
        $('pwa-install-banner')?.classList.remove('visible');
    });
}
