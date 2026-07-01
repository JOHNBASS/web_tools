// ===== LeverageLab - 信用槓桿投資模擬器 =====

// Global variables
let charts = {};
let simulationResults = [];
let currentTheme = 'light';

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    // Ensure Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded!');
        // Create a fallback script tag
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = initializeApp;
        script.onerror = function() {
            console.error('Failed to load Chart.js');
            initializeApp();
        };
        document.head.appendChild(script);
    } else {
        initializeApp();
    }
});

function initializeApp() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    initializeForm();
    setupEventListeners();
    initializeChartDefaults();
    loadSavedState();
    setTimeout(calculate, 100);
}

// ===== Theme Management =====
function toggleTheme() {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const button = document.querySelector('.theme-toggle');
    if (button) {
        button.innerHTML = theme === 'light' ? '🌙 深色主題' : '☀️ 淺色主題';
    }
    Object.values(charts).forEach(chart => chart?.update());
}

function initializeChartDefaults() {
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.color = '#64748b';
}

function getChartColors() {
    return {
        primary: '#2563eb',
        secondary: '#10b981', 
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        text: currentTheme === 'dark' ? '#f1f5f9' : '#1e293b',
        grid: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
    };
}

// ===== Form Initialization =====
function initializeForm() {
    updateAllocation(document.getElementById('allocationSlider')?.value || 50);
}

function setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    document.querySelectorAll('input[name="investmentMode"]').forEach(radio => {
        radio.addEventListener('change', () => toggleCustomPerformance(radio.value));
    });
    
    document.querySelectorAll('.strategy-card').forEach(card => {
        card.addEventListener('click', () => selectStrategy(card.dataset.strategy));
    });
    
    document.getElementById('autoSave')?.addEventListener('change', toggleAutoSave);
    
    window.addEventListener('resize', debounce(() => {
        Object.values(charts).forEach(chart => chart?.resize());
    }, 250));
}

// ===== Tab Management =====
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
    
    if (tabId === 'ai') updateAIAnalysis();
}

// ===== Investment Mode =====
function toggleCustomPerformance(mode) {
    const section = document.getElementById('customPerformanceSection');
    if (section) section.style.display = mode === 'custom' ? 'block' : 'none';
}

// ===== Allocation =====
function updateAllocation(value) {
    const slider = document.getElementById('allocationSlider');
    const display = document.getElementById('allocationValue');
    if (slider) slider.value = value;
    if (display) display.textContent = value + '%';
    
    if (value == 100) selectStrategy('allInvest');
    else if (value == 0) selectStrategy('allRepay');
    else selectStrategy('halfHalf');
}

function setAllocation(value) {
    updateAllocation(value);
}

function selectStrategy(strategy) {
    document.querySelectorAll('.strategy-card').forEach(card => {
        card.classList.toggle('active', card.dataset.strategy === strategy);
    });
    switch (strategy) {
        case 'allInvest': updateAllocation(100); break;
        case 'halfHalf': updateAllocation(50); break;
        case 'allRepay': updateAllocation(0); break;
    }
}

// ===== Auto-save =====
function toggleAutoSave() {
    localStorage.setItem('autoSave', document.getElementById('autoSave')?.checked || false);
    if (document.getElementById('autoSave')?.checked) saveState();
}

function saveState() {
    if (!document.getElementById('autoSave')?.checked) return;
    const state = {
        loanAmount: document.getElementById('loanAmount')?.value || '',
        annualRate: document.getElementById('annualRate')?.value || '',
        loanYears: document.getElementById('loanYears')?.value || '',
        repaymentType: document.getElementById('repaymentType')?.value || '',
        gracePeriod: document.getElementById('gracePeriod')?.value || '',
        prepaymentPenalty: document.getElementById('prepaymentPenalty')?.value || '',
        initialInvestment: document.getElementById('initialInvestment')?.value || '',
        avgReturn: document.getElementById('avgReturn')?.value || '',
        volatility: document.getElementById('volatility')?.value || '',
        monthlyContribution: document.getElementById('monthlyContribution')?.value || '',
        annualContribution: document.getElementById('annualContribution')?.value || '',
        compoundInterest: document.getElementById('compoundInterest')?.checked || false,
        investmentMode: document.querySelector('input[name="investmentMode"]:checked')?.value || '',
        allocationSlider: document.getElementById('allocationSlider')?.value || '',
        earlyRepaymentAmount: document.getElementById('earlyRepaymentAmount')?.value || '',
        earlyRepaymentYear: document.getElementById('earlyRepaymentYear')?.value || '',
        customReturns: Array.from(document.querySelectorAll('.custom-year')).map(i => ({
            year: i.dataset.year, value: i.value
        })),
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('leverageLabState', JSON.stringify(state));
}

function loadSavedState() {
    const state = localStorage.getItem('leverageLabState');
    if (!state) return;
    try {
        const saved = JSON.parse(state);
        ['loanAmount','annualRate','loanYears','repaymentType','gracePeriod',
         'prepaymentPenalty','initialInvestment','avgReturn','volatility',
         'monthlyContribution','annualContribution','allocationSlider',
         'earlyRepaymentAmount','earlyRepaymentYear'].forEach(field => {
            const el = document.getElementById(field);
            if (el && saved[field] !== undefined) el.value = saved[field];
        });
        if (saved.compoundInterest !== undefined) {
            document.getElementById('compoundInterest').checked = saved.compoundInterest;
        }
        if (saved.investmentMode) {
            const radio = document.querySelector(`input[name="investmentMode"][value="${saved.investmentMode}"]`);
            if (radio) radio.checked = true;
        }
        if (saved.customReturns?.length) {
            const container = document.getElementById('customReturnsContainer');
            if (container) {
                container.innerHTML = '';
                saved.customReturns.forEach(c => {
                    const group = document.createElement('div');
                    group.className = 'form-group';
                    group.innerHTML = `<label>${c.year}年報酬率</label>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="number" class="form-control custom-year" data-year="${c.year}" value="${c.value}">
                        <span>%</span>
                    </div>`;
                    container.appendChild(group);
                });
            }
        }
        updateAllocation(saved.allocationSlider || 50);
        toggleCustomPerformance(saved.investmentMode || 'fixed');
    } catch (e) {}
}

// ===== Samples =====
function loadSample(type) {
    const samples = {
        conservative: {loanAmount:'5000000',annualRate:'2.5',loanYears:'15',initialInvestment:'2000000',
                       avgReturn:'8',volatility:'15',monthlyContribution:'30000',allocationSlider:'0'},
        aggressive: {loanAmount:'15000000',annualRate:'3.5',loanYears:'30',initialInvestment:'10000000',
                    avgReturn:'15',volatility:'30',monthlyContribution:'100000',allocationSlider:'100'},
        balanced: {loanAmount:'10000000',annualRate:'2.8',loanYears:'20',initialInvestment:'5000000',
                  avgReturn:'10',volatility:'20',monthlyContribution:'50000',allocationSlider:'50'}
    };
    const sample = samples[type];
    if (sample) {
        Object.entries(sample).forEach(([key, value]) => {
            const el = document.getElementById(key);
            if (el) el.value = value;
        });
        updateAllocation(sample.allocationSlider);
        saveState();
        setTimeout(calculate, 100);
    }
}

// ===== Reset =====
function resetForm() {
    if (confirm('確定重設所有資料？')) {
        localStorage.removeItem('leverageLabState');
        location.reload();
    }
}

// ===== Utilities =====
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function formatCurrency(value, currency = '$') {
    if (value === null || value === undefined) return currency + ' 0';
    const num = Number(value);
    if (isNaN(num)) return currency + ' 0';
    if (Math.abs(num) >= 1e9) return currency + ' ' + (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return currency + ' ' + (num / 1e6).toFixed(2) + 'M';
    return currency + ' ' + Math.round(num).toLocaleString();
}

function formatPercentage(value) {
    if (value === null || value === undefined) return '0%';
    const num = Number(value);
    return isNaN(num) ? '0%' : num.toFixed(2) + '%';
}

function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function showLoading(id = 'loading') {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function hideLoading(id = 'loading') {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
}

function hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function addCustomYear() {
    const container = document.getElementById('customReturnsContainer');
    if (!container) return;
    const years = Array.from(container.querySelectorAll('.custom-year')).map(i => parseInt(i.dataset.year));
    const nextYear = Math.max(...years, 2026) + 1;
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `<label>${nextYear}年報酬率</label>
    <div style="display: flex; align-items: center; gap: 0.5rem;">
        <input type="number" class="form-control custom-year" data-year="${nextYear}" value="10">
        <span>%</span>
    </div>`;
    container.appendChild(group);
}

// ===== Core Calculation =====
function calculate() {
    showLoading();
    setTimeout(() => {
        try {
            const formData = getFormData();
            const loanResults = calculateLoan(formData);
            const investmentResults = calculateInvestment(formData, loanResults);
            simulationResults = combineResults(formData, loanResults, investmentResults);
            
            updateDashboard(simulationResults);
            updateResultsTab(simulationResults);
            updateAnalysisTab(simulationResults);
            saveState();
            hideLoading();
        } catch (error) {
            console.error('Calculation error:', error);
            hideLoading();
        }
    }, 100);
}

function getFormData() {
    const getValue = (id, def = '') => {
        const el = document.getElementById(id);
        return el ? parseFloat(el.value) || 0 : def;
    };
    
    return {
        loanAmount: getValue('loanAmount', 10000000),
        annualRate: getValue('annualRate', 2.8) / 100,
        loanYears: getValue('loanYears', 20),
        repaymentType: document.getElementById('repaymentType')?.value || 'pi',
        gracePeriod: getValue('gracePeriod', 0),
        prepaymentPenalty: getValue('prepaymentPenalty', 0) / 100,
        initialInvestment: getValue('initialInvestment', 5000000),
        avgReturn: getValue('avgReturn', 10) / 100,
        volatility: getValue('volatility', 20) / 100,
        monthlyContribution: getValue('monthlyContribution', 50000),
        annualContribution: getValue('annualContribution', 0),
        compoundInterest: document.getElementById('compoundInterest')?.checked || false,
        investmentMode: document.querySelector('input[name="investmentMode"]:checked')?.value || 'fixed',
        allocationRatio: parseFloat(document.getElementById('allocationSlider')?.value || 50) / 100,
        earlyRepaymentAmount: getValue('earlyRepaymentAmount', 0),
        earlyRepaymentYear: getValue('earlyRepaymentYear', 0),
        customReturns: getCustomReturns()
    };
}

function getCustomReturns() {
    const returns = {};
    document.querySelectorAll('.custom-year').forEach(input => {
        returns[parseInt(input.dataset.year)] = (parseFloat(input.value) || 0) / 100;
    });
    return returns;
}

function calculateLoan(formData) {
    const { loanAmount, annualRate, loanYears, repaymentType, gracePeriod } = formData;
    const monthlyRate = annualRate / 12;
    const totalMonths = loanYears * 12;
    const graceMonths = gracePeriod * 12;
    const results = { monthlyPayment: 0, totalPayment: 0, totalInterest: 0, amortization: [] };
    
    let remaining = loanAmount;
    for (let month = 1; month <= totalMonths; month++) {
        let payment = 0, interest = 0, principal = 0;
        
        if (month <= graceMonths) {
            interest = remaining * monthlyRate;
            payment = interest;
        } else if (repaymentType === 'pi') {
            const piPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths - graceMonths)) /
                             (Math.pow(1 + monthlyRate, totalMonths - graceMonths) - 1);
            payment = piPayment;
            interest = remaining * monthlyRate;
            principal = payment - interest;
        } else {
            const basePrincipal = loanAmount / (totalMonths - graceMonths);
            principal = basePrincipal;
            interest = remaining * monthlyRate;
            payment = principal + interest;
        }
        
        if (remaining + interest < payment) {
            payment = remaining + interest;
            principal = remaining;
            interest = remaining * monthlyRate;
            remaining = 0;
        } else {
            remaining -= principal;
        }
        
        if (month === totalMonths || remaining <= 0) {
            payment = remaining + (remaining * monthlyRate);
            interest = remaining * monthlyRate;
            principal = remaining;
            remaining = 0;
        }
        
        results.totalPayment += payment;
        results.totalInterest += interest;
        results.amortization.push({ month, payment, interest, principal, remaining: Math.max(0, remaining) });
    }
    
    results.monthlyPayment = results.amortization.length > 0 ? results.amortization[0].payment : 0;
    results.remainingBalance = 0;
    return results;
}

function calculateInvestment(formData, loanResults) {
    const { initialInvestment, avgReturn, volatility, monthlyContribution, 
            annualContribution, compoundInterest, investmentMode, customReturns, allocationRatio } = formData;
    const { amortization } = loanResults;
    const totalMonths = amortization.length;
    const results = { monthlyGrowth: [], totalReturn: 0, endingValue: initialInvestment };
    
    let currentValue = initialInvestment;
    for (let month = 0; month < totalMonths; month++) {
        const year = Math.floor(month / 12);
        let monthlyReturnRate = 0;
        
        if (investmentMode === 'custom' && customReturns[2025 + year]) {
            monthlyReturnRate = Math.pow(1 + customReturns[2025 + year], 1/12) - 1;
        } else if (investmentMode === 'random') {
            const randomFactor = (Math.random() - 0.5) * 2;
            monthlyReturnRate = avgReturn / 12 + (volatility / 12) * randomFactor;
        } else {
            monthlyReturnRate = Math.pow(1 + avgReturn, 1/12) - 1;
        }
        
        const prevValue = currentValue;
        currentValue *= (1 + monthlyReturnRate);
        currentValue += monthlyContribution;
        
        if (month % 12 === 0 && month > 0) {
            currentValue += annualContribution;
        }
        
        const investmentGain = currentValue - prevValue - monthlyContribution - (month % 12 === 0 && month > 0 ? annualContribution : 0);
        const amountToRepay = investmentGain * (1 - allocationRatio);
        
        results.monthlyGrowth.push({ month: month + 1, year: year + 1, value: currentValue, 
                                     return: monthlyReturnRate * 12 * 100, contribution: monthlyContribution + (month % 12 === 0 && month > 0 ? annualContribution : 0),
                                     gain: investmentGain, amountToRepay });
    }
    
    results.totalReturn = currentValue - initialInvestment - (monthlyContribution * totalMonths) - (annualContribution * (totalMonths / 12));
    results.endingValue = currentValue;
    return results;
}

function combineResults(formData, loanResults, investmentResults) {
    const { loanAmount, earlyRepaymentAmount, earlyRepaymentYear } = formData;
    const { amortization, totalInterest } = loanResults;
    const { monthlyGrowth, totalReturn, endingValue } = investmentResults;
    const results = [];
    const totalMonths = Math.min(amortization.length, monthlyGrowth.length);
    let cumulativeRepayment = 0;
    
    for (let month = 0; month < totalMonths; month++) {
        const year = Math.floor(month / 12) + 1;
        const loanData = amortization[month] || {};
        const investmentData = monthlyGrowth[month] || {};
        
        const investmentAsset = investmentData.value || 0;
        const remainingLoan = loanData.remaining || 0;
        
        let earlyRepayment = 0;
        if (earlyRepaymentAmount > 0 && earlyRepaymentYear > 0 && year === earlyRepaymentYear) {
            earlyRepayment = Math.min(earlyRepaymentAmount, remainingLoan);
            cumulativeRepayment += earlyRepayment;
        }
        
        const repaymentFromInvestment = investmentData.amountToRepay || 0;
        const adjustedRemainingLoan = Math.max(0, remainingLoan - earlyRepayment - repaymentFromInvestment);
        const adjustedNetWorth = investmentAsset - adjustedRemainingLoan + loanAmount - cumulativeRepayment;
        
        results.push({ year, month: month + 1, investmentAsset, investmentReturn: investmentData.return || 0,
                      loanPayment: loanData.payment || 0, interestPaid: loanData.interest || 0,
                      principalPaid: loanData.principal || 0, remainingLoan: adjustedRemainingLoan,
                      netWorth: adjustedNetWorth, earlyRepayment, repaymentFromInvestment });
    }
    
    const finalResult = results[results.length - 1] || {};
    const leverageRatio = loanAmount > 0 ? (endingValue / loanAmount).toFixed(2) + 'x' : '0x';
    const netProfit = (endingValue - loanAmount) - (finalResult.remainingLoan || 0);
    
    return { results, summary: { totalReturn, totalInterest, netProfit, leverageRatio, endingValue, 
               remainingLoan: finalResult.remainingLoan || 0, netWorth: finalResult.netWorth || 0 } };
}

// ===== Dashboard Updates =====
function updateDashboard(simulationResults) {
    const { summary } = simulationResults;
    updateElementText('netWorthDisplay', formatCurrency(summary.netWorth || 0));
    updateElementText('investmentAssetDisplay', formatCurrency(summary.endingValue || 0));
    updateElementText('remainingLoanDisplay', formatCurrency(summary.remainingLoan || 0));
    updateElementText('riskIndexDisplay', summary.leverageRatio || '0x');
    
    const netWorthEl = document.getElementById('netWorthDisplay');
    if (netWorthEl) {
        const netWorthValue = summary.netWorth || 0;
        netWorthEl.className = 'dashboard-card-value ' + (netWorthValue > 0 ? 'success' : netWorthValue < 0 ? 'danger' : '');
    }
}

// ===== Results Tab =====
function updateResultsTab(simulationResults) {
    const { results, summary } = simulationResults;
    
    updateElementText('totalReturn', formatCurrency(summary.totalReturn || 0));
    updateElementText('totalInterest', formatCurrency(summary.totalInterest || 0));
    updateElementText('netProfit', formatCurrency(summary.netProfit || 0));
    updateElementText('leverageRatio', summary.leverageRatio || '0x');
    
    const totalReturnEl = document.getElementById('totalReturn');
    const netProfitEl = document.getElementById('netProfit');
    if (totalReturnEl) totalReturnEl.className = 'result-value ' + (summary.totalReturn > 0 ? 'success' : summary.totalReturn < 0 ? 'danger' : '');
    if (netProfitEl) netProfitEl.className = 'result-value ' + (summary.netProfit > 0 ? 'success' : summary.netProfit < 0 ? 'danger' : '');
    
    updateResultsTable(results);
    createResultsCharts(simulationResults);
}

function updateResultsTable(results) {
    const showMonthly = document.getElementById('showMonthly')?.checked || false;
    const tableBody = document.getElementById('resultsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    const dataToShow = showMonthly ? results : filterYearlyResults(results);
    
    dataToShow.forEach(result => {
        const year = result.year || Math.floor((result.month || 1) / 12) + 1;
        const month = showMonthly ? result.month || 1 : year;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${showMonthly ? '第 ' + month + ' 月' : '第 ' + year + ' 年'}</td>
            <td>${formatCurrency(result.investmentAsset || 0)}</td>
            <td class="${result.investmentReturn > 0 ? 'text-success' : result.investmentReturn < 0 ? 'text-danger' : ''}">
                ${formatPercentage(result.investmentReturn || 0)}</td>
            <td>${formatCurrency(result.interestPaid || 0)}</td>
            <td>${formatCurrency(result.principalPaid || 0)}</td>
            <td>${formatCurrency(result.remainingLoan || 0)}</td>
            <td class="${result.netWorth > 0 ? 'text-success' : result.netWorth < 0 ? 'text-danger' : ''}">
                ${formatCurrency(result.netWorth || 0)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function filterYearlyResults(results) {
    const yearly = {};
    results.forEach(result => {
        const year = result.year || Math.floor((result.month || 1) / 12) + 1;
        if (!yearly[year]) yearly[year] = result;
    });
    return Object.values(yearly).sort((a, b) => a.year - b.year);
}

// ===== Charts =====
function createResultsCharts(simulationResults) {
    createAssetLoanChart(simulationResults);
    createNetWorthChart(simulationResults);
}

function createAssetLoanChart(simulationResults) {
    const ctx = document.getElementById('assetLoanChart');
    if (!ctx) return;
    if (charts.assetLoanChart) charts.assetLoanChart.destroy();
    
    const colors = getChartColors();
    const { results } = simulationResults;
    const labels = results.map((r, i) => i % 12 === 0 ? '第 ' + (r.year || Math.floor((r.month || 1)/12) + 1) + ' 年' : '');
    
    charts.assetLoanChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '投資資產',
                    data: results.map(r => r.investmentAsset || 0),
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondary + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: '剩餘貸款',
                    data: results.map(r => r.remainingLoan || 0),
                    borderColor: colors.danger,
                    backgroundColor: colors.danger + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'start' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y)
                    }
                }
            },
            scales: {
                x: { grid: { color: colors.grid }, ticks: { color: colors.text, maxRotation: 45, minRotation: 45 } },
                y: { 
                    beginAtZero: true,
                    grid: { color: colors.grid },
                    ticks: { color: colors.text, callback: (v) => formatCurrency(v, '$') }
                }
            }
        }
    });
}

function createNetWorthChart(simulationResults) {
    const ctx = document.getElementById('netWorthChart');
    if (!ctx) return;
    if (charts.netWorthChart) charts.netWorthChart.destroy();
    
    const colors = getChartColors();
    const { results } = simulationResults;
    const labels = results.map((r, i) => i % 12 === 0 ? '第 ' + (r.year || Math.floor((r.month || 1)/12) + 1) + ' 年' : '');
    
    charts.netWorthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '淨資產',
                data: results.map(r => r.netWorth || 0),
                borderColor: colors.primary,
                backgroundColor: colors.primary + '20',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'start' },
                tooltip: { callbacks: { label: (ctx) => '淨資產: ' + formatCurrency(ctx.parsed.y) } }
            },
            scales: {
                x: { grid: { color: colors.grid }, ticks: { color: colors.text, maxRotation: 45, minRotation: 45 } },
                y: { 
                    beginAtZero: true,
                    grid: { color: colors.grid },
                    ticks: { color: colors.text, callback: (v) => formatCurrency(v, '$') }
                }
            }
        }
    });
}

// ===== Strategy Comparison =====
function runStrategyComparison() {
    showLoading();
    setTimeout(() => {
        try {
            const formData = getFormData();
            const strategies = [
                { name: 'allInvest', ratio: 1, label: '全部投資' },
                { name: 'halfHalf', ratio: 0.5, label: '50-50策略' },
                { name: 'allRepay', ratio: 0, label: '全部還本金' }
            ];
            
            strategies.forEach(strategy => {
                const testFormData = { ...formData, allocationRatio: strategy.ratio };
                const loanResults = calculateLoan(testFormData);
                const investmentResults = calculateInvestment(testFormData, loanResults);
                const result = combineResults(testFormData, loanResults, investmentResults);
                updateElementText(`strategy${strategy.name.charAt(0).toUpperCase() + strategy.name.slice(1)}`, 
                                formatCurrency(result.summary.netWorth || 0));
            });
            
            hideLoading();
        } catch (error) {
            console.error('Strategy comparison error:', error);
            hideLoading();
        }
    }, 100);
}

// ===== Analysis =====
function updateAnalysisTab(simulationResults) {
    const { summary } = simulationResults;
    const leverageRatio = parseFloat(summary.leverageRatio) || 0;
    const riskAlert = document.getElementById('riskAlert');
    const riskMessage = document.getElementById('riskMessage');
    
    if (riskAlert) {
        if (leverageRatio > 2) {
            riskAlert.style.display = 'flex';
            riskAlert.className = 'alert danger';
            if (riskMessage) riskMessage.textContent = `目前槓桿倍數為 ${leverageRatio}x，屬於極高風險，建議謹慎評估`;
        } else if (leverageRatio > 1.5) {
            riskAlert.style.display = 'flex';
            riskAlert.className = 'alert warning';
            if (riskMessage) riskMessage.textContent = `目前槓桿倍數為 ${leverageRatio}x，屬於高風險，請注意風險管理`;
        } else {
            riskAlert.style.display = 'none';
        }
    }
    updateWorstCase();
    updateBestCase();
    updateSensitivity('interest', 5);
    updateSensitivity('return', 0);
}

function updateWorstCase() {
    const scenario = parseFloat(document.getElementById('worstCaseScenario')?.value || '-50') / 100;
    const formData = { ...getFormData(), avgReturn: scenario };
    const loanResults = calculateLoan(formData);
    const investmentResults = calculateInvestment(formData, loanResults);
    const result = combineResults(formData, loanResults, investmentResults);
    const finalResult = result.results[result.results.length - 1] || {};
    updateElementText('worstCaseInvestment', formatCurrency(finalResult.investmentAsset || 0));
    updateElementText('worstCaseLoan', formatCurrency(finalResult.remainingLoan || 0));
    updateElementText('worstCaseNetWorth', formatCurrency(finalResult.netWorth || 0));
}

function updateBestCase() {
    const scenario = parseFloat(document.getElementById('bestCaseScenario')?.value || '200') / 100;
    const formData = { ...getFormData(), avgReturn: scenario };
    const loanResults = calculateLoan(formData);
    const investmentResults = calculateInvestment(formData, loanResults);
    const result = combineResults(formData, loanResults, investmentResults);
    const finalResult = result.results[result.results.length - 1] || {};
    updateElementText('bestCaseInvestment', formatCurrency(finalResult.investmentAsset || 0));
    updateElementText('bestCaseLoan', formatCurrency(finalResult.remainingLoan || 0));
    updateElementText('bestCaseNetWorth', formatCurrency(finalResult.netWorth || 0));
}

function updateSensitivity(type, value) {
    const formData = getFormData();
    if (type === 'interest') {
        const rate = parseFloat(value) / 100;
        const lowFormData = { ...formData, annualRate: rate - 0.01 };
        const highFormData = { ...formData, annualRate: rate + 0.01 };
        processSensitivity(lowFormData, highFormData, 'sensitivityLowInterest', 'sensitivityHighInterest');
    } else if (type === 'return') {
        const rate = parseFloat(value) / 100;
        const lowFormData = { ...formData, avgReturn: rate - 0.05 };
        const highFormData = { ...formData, avgReturn: rate + 0.05 };
        processSensitivity(lowFormData, highFormData, 'sensitivityLowReturn', 'sensitivityHighReturn');
    }
}

function processSensitivity(lowFormData, highFormData, lowId, highId) {
    const loanLow = calculateLoan(lowFormData);
    const invLow = calculateInvestment(lowFormData, loanLow);
    const resLow = combineResults(lowFormData, loanLow, invLow);
    const loanHigh = calculateLoan(highFormData);
    const invHigh = calculateInvestment(highFormData, loanHigh);
    const resHigh = combineResults(highFormData, loanHigh, invHigh);
    const finalLow = resLow.results[resLow.results.length - 1] || {};
    const finalHigh = resHigh.results[resHigh.results.length - 1] || {};
    updateElementText(lowId, formatCurrency(finalLow.netWorth || 0));
    updateElementText(highId, formatCurrency(finalHigh.netWorth || 0));
}

// ===== AI Analysis =====
function updateAIAnalysis() {
    const formData = getFormData();
    const leverageRatio = parseFloat((formData.loanAmount / formData.initialInvestment).toFixed(2));
    const riskLevel = leverageRatio > 2 ? 'very-high' : leverageRatio > 1.5 ? 'high' : leverageRatio > 1 ? 'medium' : 'low';
    const riskScore = Math.min(100, leverageRatio * 25);
    const successProbability = Math.max(0, 100 - riskScore);
    const allocationPercentage = (formData.allocationRatio * 100).toFixed(0);
    
    updateElementText('aiLeverage', leverageRatio + 'x');
    updateElementText('aiBankruptcyProb', (100 - successProbability).toFixed(1) + '%');
    
    let projectedReturn = formData.initialInvestment * Math.pow(1 + formData.avgReturn, formData.loanYears || 20);
    updateElementText('aiProjectedAssets', formatCurrency(projectedReturn - formData.loanAmount, '$'));
    
    let recommendation = '';
    if (leverageRatio < 1) {
        recommendation = `<div style="background: var(--success-light); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
            <p><strong>✅ 保守穩健型策略</strong></p>
            <p>槓桿倍數較低（${leverageRatio}x），風險可控。可考慮增加投資比例至 ${Math.min(80, parseInt(allocationPercentage) + 20)}%。</p>
            <p>成功率：${successProbability.toFixed(1)}%</p>
        </div>`;
    } else if (leverageRatio < 2) {
        recommendation = `<div style="background: var(--info-light); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
            <p><strong>📊 平衡型策略</strong></p>
            <p>槓桿倍數適中（${leverageRatio}x）。保持 ${allocationPercentage}% 分配比例，密切監控市場波動。</p>
            <p>成功率：${successProbability.toFixed(1)}%</p>
        </div>`;
    } else {
        recommendation = `<div style="background: var(--warning-light); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
            <p><strong>⚠️ 謹慎策略</strong></p>
            <p>槓桿倍數較高（${leverageRatio}x），建議降低投資比例至 ${Math.max(20, parseInt(allocationPercentage) - 20)}%。</p>
            <p>成功率：${successProbability.toFixed(1)}%</p>
        </div>`;
    }
    
    if (allocationPercentage > 80) {
        recommendation += `<div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
            <p><strong>💡 分配建議</strong></p>
            <p>建議將 ${allocationPercentage}% 收益分配降至 60-70% 以平衡風險。</p>
        </div>`;
    }
    
    const aiRecommendation = document.getElementById('aiRecommendation');
    if (aiRecommendation) aiRecommendation.innerHTML = recommendation;
    showElement('aiAnalysis');
}

// ===== Monte Carlo =====
function runMonteCarlo() {
    const simulations = parseInt(document.getElementById('mcSimulations')?.value || '10000');
    const years = parseInt(document.getElementById('mcYears')?.value || '20');
    const avgReturn = parseFloat(document.getElementById('mcAvgReturn')?.value || '10') / 100;
    const volatility = parseFloat(document.getElementById('mcVolatility')?.value || '20') / 100;
    
    showLoading('mcLoading');
    hideElement('mcResults');
    hideElement('mcCharts');
    hideElement('mcPercentiles');
    
    setTimeout(() => {
        try {
            const results = [];
            for (let i = 0; i < Math.min(simulations, 5000); i++) {
                let value = 1;
                for (let year = 0; year < years; year++) {
                    const returnRate = avgReturn + volatility * (Math.random() - 0.5) * 2;
                    value *= (1 + returnRate);
                }
                results.push(value);
            }
            
            const sortedResults = results.sort((a, b) => a - b);
            const sum = sortedResults.reduce((acc, val) => acc + val, 0);
            const mean = sum / sortedResults.length;
            const median = sortedResults[Math.floor(sortedResults.length / 2)];
            const best = Math.max(...sortedResults);
            const worst = Math.min(...sortedResults);
            const successCount = sortedResults.filter(v => v > 1).length;
            const successRate = (successCount / sortedResults.length * 100).toFixed(2);
            const failureRate = ((sortedResults.length - successCount) / sortedResults.length * 100).toFixed(2);
            
            updateElementText('mcAverage', formatCurrency(mean, '$'));
            updateElementText('mcMedian', formatCurrency(median, '$'));
            updateElementText('mcBest', formatCurrency(best, '$'));
            updateElementText('mcWorst', formatCurrency(worst, '$'));
            updateElementText('mcSuccessRate', successRate + '%');
            updateElementText('mcBankruptcyRate', failureRate + '%');
            
            hideLoading('mcLoading');
            showElement('mcResults');
            
        } catch (error) {
            console.error('Monte Carlo error:', error);
            hideLoading('mcLoading');
        }
    }, 100);
}

// Export to global
window.toggleTheme = toggleTheme;
window.calculate = calculate;
window.resetForm = resetForm;
window.loadSample = loadSample;
window.updateAllocation = updateAllocation;
window.setAllocation = setAllocation;
window.selectStrategy = selectStrategy;
window.runStrategyComparison = runStrategyComparison;
window.updateTable = updateResultsTable;
window.toggleCustomPerformance = toggleCustomPerformance;
window.addCustomYear = addCustomYear;
window.toggleAutoSave = toggleAutoSave;
window.updateWorstCase = updateWorstCase;
window.updateBestCase = updateBestCase;
window.updateSensitivity = updateSensitivity;
window.runMonteCarlo = runMonteCarlo;
window.switchTab = switchTab;
