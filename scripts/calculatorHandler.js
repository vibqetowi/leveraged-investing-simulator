// Global state
let currentMode = 'standard';
let simulationResults = null; // Store last simulation results for slider interaction
const DEFAULT_STRATEGY_INDEX = 0;

function enableSliderScrollLock(root = document) {
    const activeLocks = new Map();
    let restoreQueued = false;

    const restoreSliderPositions = () => {
        restoreQueued = false;
        activeLocks.forEach((lock, slider) => {
            if (!slider.isConnected) {
                activeLocks.delete(slider);
                return;
            }

            const offset = slider.getBoundingClientRect().top - lock.top;
            if (offset !== 0) window.scrollBy(0, offset);
        });
    };

    const queueRestore = () => {
        if (restoreQueued || activeLocks.size === 0) return;
        restoreQueued = true;
        requestAnimationFrame(restoreSliderPositions);
    };

    const beginLock = (slider) => {
        activeLocks.set(slider, { top: slider.getBoundingClientRect().top });
    };

    const attachLock = (slider) => {
        if (slider.dataset.scrollLockEnabled === 'true') return;
        slider.dataset.scrollLockEnabled = 'true';
        slider.addEventListener('pointerdown', () => beginLock(slider));
        slider.addEventListener('touchstart', () => beginLock(slider), { passive: true });
        slider.addEventListener('focus', () => beginLock(slider));
        slider.addEventListener('input', queueRestore, true);
        ['change', 'pointerup', 'pointercancel', 'blur', 'touchend', 'touchcancel'].forEach((eventName) => {
            slider.addEventListener(eventName, () => activeLocks.delete(slider));
        });
    };

    root.querySelectorAll('input[type="range"]').forEach(attachLock);
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;
                if (node.matches('input[type="range"]')) attachLock(node);
                node.querySelectorAll?.('input[type="range"]').forEach(attachLock);
            });
        });
        queueRestore();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
}

if (typeof window !== 'undefined') {
    window.enableSliderScrollLock = enableSliderScrollLock;
}

function getStandardDefaults() {
    if (typeof window !== 'undefined' && window.STANDARD_MODE_DEFAULTS) {
        return window.STANDARD_MODE_DEFAULTS;
    }
    if (typeof config !== 'undefined' && config.STANDARD_MODE_DEFAULTS) {
        return config.STANDARD_MODE_DEFAULTS;
    }
    return STANDARD_MODE_DEFAULTS;
}

function setInputLocked(element, isLocked) {
    if (!element) return;
    // readOnly has no effect on <select>, so selects must lock via disabled instead.
    if (element.tagName === 'SELECT') {
        element.disabled = isLocked;
        element.classList.toggle('input-readonly', isLocked);
        return;
    }
    // Use a single lock path so all standard-mode fields look and behave the same.
    element.disabled = false;
    element.readOnly = isLocked;
    element.classList.toggle('input-readonly', isLocked);
}

/**
 * Mode Management (Standard vs Custom)
 */
function setMode(mode) {
    currentMode = mode;
    const isStandard = mode === 'standard';
    const standardModeButton = document.getElementById('standardMode');
    const customModeButton = document.getElementById('customMode');
    if (standardModeButton) standardModeButton.classList.toggle('btn--active', isStandard);
    if (customModeButton) customModeButton.classList.toggle('btn--active', !isStandard);
    
    document.getElementById('modeDescription').innerHTML = isStandard 
        ? CopywritingHelpers.getModeStandardDescription() 
        : CopywritingHelpers.getModeCustomDescription();
    
    ['growth', 'vol', 'marginCall', 'primeRate', 'spreadRate', 'inflationRate',
        'oscillatorSelect', 'tailModelSelect',
        'garchOmega', 'garchAlpha', 'garchBeta',
        'hestonKappa', 'hestonTheta', 'hestonSigmaV', 'hestonRho',
        'mertonJumpLambda', 'mertonJumpMu', 'mertonJumpSigma']
        .forEach(id => setInputLocked(document.getElementById(id), isStandard));
    
    // Show LTV input in both modes; the loan derivation stays hidden to the user
    const ltvSliderGroup = document.getElementById('ltvSliderGroup');
    if (ltvSliderGroup) ltvSliderGroup.classList.add('is-flex');
    const loanAmountGroup = document.getElementById('loanAmountGroup');
    if (loanAmountGroup) loanAmountGroup.classList.add('is-flex');
    
    // Configure LTV input and hidden loan amount based on mode
    const ltvSlider = document.getElementById('ltvSlider');
    const loanAmountInput = document.getElementById('loanAmount');
    
    const standardDefaults = getStandardDefaults();

    if (isStandard) {
        // Standard Mode: locked Max Test LTV (defaults to 40%)
        if (ltvSlider) {
            ltvSlider.max = standardDefaults.MAX_LTV;
            ltvSlider.value = standardDefaults.MAX_LTV;
            setInputLocked(ltvSlider, true);
        }
        if (loanAmountInput) {
            setInputLocked(loanAmountInput, true);
        }
        
        // Lock standard mode parameters
        document.getElementById('primeRate').value = standardDefaults.PRIME_RATE;
        document.getElementById('spreadRate').value = standardDefaults.SPREAD_RATE;
        document.getElementById('growth').value = standardDefaults.GROWTH_RATE;
        document.getElementById('vol').value = standardDefaults.VOLATILITY;
        document.getElementById('marginCall').value = standardDefaults.MARGIN_CALL_LTV;
        document.getElementById('inflationRate').value = standardDefaults.INFLATION_RATE;
        // Standard Mode always runs the GBM+Merton provider
        document.getElementById('oscillatorSelect').value = 'gbm';
        document.getElementById('tailModelSelect').value = 'merton';
        
        if (ltvSlider) {
            ltvSlider.classList.remove('strategy-slider--danger', 'strategy-slider--warning', 'strategy-slider--default');
        }
        
        // Calculate loan amount from LTV and collateral
        updateLoanFromSlider();
    } else {
        // Custom Mode: unlocked Max Test LTV (up to 100%)
        if (ltvSlider) {
            ltvSlider.max = 100;
            setInputLocked(ltvSlider, false);
        }
        if (loanAmountInput) {
            setInputLocked(loanAmountInput, false);
        }
    }
}

/**
 * Update loan amount based on LTV input (all modes)
 */
function updateLoanFromSlider() {
    const ltvEl = document.getElementById('ltvSlider');
    if (!ltvEl) return;
    const ltv = parseFloat(ltvEl.value) || 0;
    const collateral = parseFloat(document.getElementById('assetValue').value) || 0;
    const loanAmount = (collateral * ltv / 100).toFixed(0);
    
    const display = document.getElementById('ltvDisplay');
    if (display) display.innerText = ltv;
    const loanAmountInput = document.getElementById('loanAmount');
    if (loanAmountInput) loanAmountInput.value = loanAmount;
}

/**
 * Update loan amount when user edits it directly
 */
function updateLoanFromDirectInput() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    const collateral = parseFloat(document.getElementById('assetValue').value) || 1;
    const ltv = (loanAmount / collateral * 100);
    
    // Update input and display
    const ltvEl = document.getElementById('ltvSlider');
    if (ltvEl) ltvEl.value = Math.round(ltv);
    const display = document.getElementById('ltvDisplay');
    if (display) display.innerText = Math.round(ltv);
}

/**
 * Update loan amount when collateral changes
 */
function updateLoanFromCollateral() {
    const ltvEl = document.getElementById('ltvSlider');
    if (!ltvEl) return;
    const ltv = parseFloat(ltvEl.value) || 0;
    const collateral = parseFloat(document.getElementById('assetValue').value) || 0;
    const loanAmount = (collateral * ltv / 100).toFixed(0);
    
    const loanAmountInput = document.getElementById('loanAmount');
    if (loanAmountInput) loanAmountInput.value = loanAmount;
}

/**
 * Main Simulation Runner - Uses WebAssembly if available, falls back to JS
 */
async function runSimulation() {
    console.log('[Script] runSimulation() called');
    if (!validateInputs()) {
        console.error('[Script] Input validation failed');
        return;
    }

    try {
        console.log('[Script] Calling runSimulationWithAdapter()...');
        const slider = document.getElementById('strategySlider');
        const results = await runSimulationWithAdapter(getSimulationInputs(), {
            onBaselineComplete: (partialResults) => {
                console.log('[Script] Baseline (Tier 1) completed early');
                simulationResults = partialResults;
                // Render baseline immediately
                displayResults(partialResults, { isPartial: true });
                // Lock slider while remaining math executes in background
                if (slider) {
                    slider.disabled = true;
                }
            }
        });
        console.log('[Script] Results received from adapter:', results);
        
        if (!results) {
            console.error('[Script] No results returned from adapter');
            return null;
        }
        
        // Store results globally for slider interaction
        simulationResults = results;
        console.log('[Script] Results stored globally, strategies count:', results.strategies.length);
        
        // Re-enable slider when full simulation finishes
        if (slider) {
            slider.disabled = false;
        }
        
        // Display results (histogram and strategic report)
        console.log('[Script] Calling displayResults with full results object');
        displayResults(results, { isPartial: false });
        console.log('[Script] displayResults completed');
        
        return results;
    } catch (error) {
        console.error('[Script] Simulation error:', error);
        alert(CopywritingHelpers.getSimulationErrorMessage(error.message));
        return null;
    }
}

function resolveProviderId() {
    const oscillator = document.getElementById('oscillatorSelect')?.value;
    const tailModel = document.getElementById('tailModelSelect')?.value;
    const key = `${oscillator}+${tailModel}`;

    if (!(key in PROVIDER_ID_MAP)) {
        throw new Error(`Unsupported simulation combination: ${key}`);
    }

    const providerId = PROVIDER_ID_MAP[key];
    if (providerId !== 0 && providerId !== 1) {
        throw new Error(`Simulation combination is not implemented: ${key}`);
    }

    return providerId;
}

function getSimulationInputs() {
    const initialEquity = parseFloat(document.getElementById('assetValue').value);
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const years = parseFloat(document.getElementById('loanPeriod').value);
    const monthlyBudget = parseFloat(document.getElementById('monthlyBudget').value);
    const primeRate = parseFloat(document.getElementById('primeRate')?.value ?? STANDARD_MODE_DEFAULTS.PRIME_RATE) / 100;
    const spreadRate = parseFloat(document.getElementById('spreadRate')?.value ?? STANDARD_MODE_DEFAULTS.SPREAD_RATE) / 100;
    const interestRate = primeRate + spreadRate;
    const growth = parseFloat(document.getElementById('growth').value) / 100;
    const volatility = parseFloat(document.getElementById('vol').value) / 100;
    const inflation = parseFloat(document.getElementById('inflationRate').value) / 100;
    const marginCallLTV = parseFloat(document.getElementById('marginCall').value) / 100;
    const maxLTV = parseFloat(document.getElementById('ltvSlider').value) / 100;
    const months = years * 12;
    return {
        initialEquity,
        loanAmount,
        years,
        monthlyBudget,
        interestRate,
        primeRate,
        spreadRate,
        growth,
        volatility,
        inflation,
        marginCallLTV,
        maxLTV,
        simulationCount: UI_CONSTANTS.SIMULATION_COUNT,
        baselineSimulationCount: UI_CONSTANTS.BASE_CASE_SIMULATIONS,
        numStrategies: UI_CONSTANTS.NUM_STRATEGIES - 1,
        statsConfig: {
            retainedPercentile: UI_CONSTANTS.WEALTH_PERCENTILES.retained,
            medianPercentile: UI_CONSTANTS.WEALTH_PERCENTILES.median,
            highPercentile: UI_CONSTANTS.WEALTH_PERCENTILES.high,
            histogramBins: UI_CONSTANTS.HISTOGRAM_BINS
        },
        providerId: currentMode === 'custom' ? resolveProviderId() : STANDARD_MODE_DEFAULTS.SIMULATOR.id,
        months
    };
}


/**
 * Find Target Strategy Index based on Risk Target
 * Chooses the closest survival rate at or above the target,
 * or the maximum target-LTV strategy if none are safe.
 * Only considers leveraged strategies (indices 0-9).
 */
function findTargetStrategyIndex(targetSurvival) {
    if (!simulationResults) return DEFAULT_STRATEGY_INDEX;
    
    if (targetSurvival <= 0) {
        return DEFAULT_STRATEGY_INDEX;
    }

    const strategies = simulationResults.strategies;
    const leveragedStrategies = strategies.slice(0, 10);
    const safeStrategies = leveragedStrategies
        .map((strategy, index) => ({ strategy, index }))
        .filter(({ strategy }) => strategy.survivalRate >= targetSurvival);

    if (safeStrategies.length === 0) {
        return 9;
    }

    const closest = safeStrategies.reduce((best, current) => {
        const bestDiff = best.strategy.survivalRate - targetSurvival;
        const currentDiff = current.strategy.survivalRate - targetSurvival;
        return currentDiff < bestDiff ? current : best;
    });

    return closest.index;
}

function updateSummary(strategyIndex, isPartial = false) {
    if (!simulationResults) return;
    
    const strategy = simulationResults.strategies[strategyIndex];
    if (!strategy) return;
    
    const currentLtvPercent = Number((strategy.targetLTV ?? 0) * 100);
    const isBaseCase = strategyIndex === 0 || currentLtvPercent === 0;
    const summaryLtvSpan = document.getElementById('summaryCurrentLtv');
    if (summaryLtvSpan) {
        summaryLtvSpan.textContent = `${currentLtvPercent.toFixed(1)}%`;
    }
    
    const summaryBox = document.getElementById('dynamicSummary');
    const criteriaBox = document.getElementById('strategyCriteria');
    const medianRealWealth = strategy.medianWealth ?? 0;
    const survivalRate = strategy.survivalRate ?? 0;

    // Base Case (0% LTV) Summary: No self-comparison, omit 3-zone grid and criteria table
    if (isBaseCase) {
        summaryBox.innerHTML = `<div class="box box--info" style="margin-bottom: 1rem;">
            <strong>${isPartial ? '⏳ Background Processing:' : 'Results Ready:'}</strong> ${isPartial ? CopywritingHelpers.getBaselineProgressMessage() : CopywritingHelpers.getResultsReadyMessage()}
           </div>`;
        if (criteriaBox) criteriaBox.innerHTML = '';
        return;
    }

    // Leveraged Strategy (>0% LTV) Summary
    // Use pre-calculated trinary statistics from orchestrator results
    const trinaryStats = strategy.trinaryStats;
    const verdict = CopywritingHelpers.generateVerdict(trinaryStats);
    // The impact line compares medians: the strategy's against plain DCA's.
    const benchmarkMedian = simulationResults.benchmark?.medianWealth ?? medianRealWealth;
    const delta = medianRealWealth - benchmarkMedian;
    const totalDeposits = strategy.totalDeposits ?? 0;

    // Get narrative text from copywriting helpers
    const narrative = CopywritingHelpers.getStrategySummaryNarrative(strategy.targetLTV ?? 0, survivalRate, medianRealWealth, benchmarkMedian, delta, totalDeposits);

    // Build the summary HTML
    let summaryHTML = `

        <!-- VERDICT CONTAINER (Traffic Light) -->
        <div class="result-verdict">
            <h3>${verdict.icon} ${verdict.title}</h3>
            <p>${verdict.message}</p>
        </div>
        
        <!-- OUTCOME ZONES GRID -->
        <div class="outcome-grid">
            <div class="outcome-card outcome-card-ruin">
                <div class="outcome-percent outcome-percent-ruin">${trinaryStats.ruinPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('ruin')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('ruin')}</div>
            </div>
            <div class="outcome-card outcome-card-sucker">
                <div class="outcome-percent outcome-percent-sucker">${trinaryStats.suckerPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('sucker')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('sucker')}</div>
            </div>
            <div class="outcome-card outcome-card-profit">
                <div class="outcome-percent outcome-percent-profit">${trinaryStats.profitPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('profit')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('profit')}</div>
            </div>
        </div>

        <p>${narrative.strategy}</p>
        <p>${narrative.outcomes}</p>
        <p>${narrative.leverageImpact}</p>
        
        `;

    
    summaryBox.innerHTML = summaryHTML;
   
}

function renderSecuritiesDebtChart(strategyIndex) {
    if (!simulationResults || typeof Plotly === 'undefined') return;

    const strategy = simulationResults.strategies[strategyIndex];
    const benchmark = simulationResults.benchmark;
    const loanDetails = simulationResults.loanDetails;
    if (!strategy || !benchmark || !strategy.meanSecuritiesPath || !strategy.meanDebtPath || !benchmark.meanSecuritiesPath) return;

    const months = loanDetails.months ?? Math.round((loanDetails.years ?? 0) * 12);
    const timePoints = Array.from({ length: months + 1 }, (_, month) => month / 12);
    const realDeposits = Array.from(
        { length: months + 1 },
        (_, month) => loanDetails.initialEquity + loanDetails.monthlyBudget * month
    );
    const styles = getComputedStyle(document.documentElement);
    const traces = [
        {
            x: timePoints,
            y: strategy.meanSecuritiesPath,
            type: 'scatter',
            mode: 'lines',
            name: 'Average Securities (Leveraged)',
            line: { color: styles.getPropertyValue('--md-chart-leveraged').trim(), width: 2 }
        },
        {
            x: timePoints,
            y: benchmark.meanSecuritiesPath,
            type: 'scatter',
            mode: 'lines',
            name: 'Average Securities (Unleveraged DCA)',
            line: { color: styles.getPropertyValue('--md-chart-unleveraged').trim(), width: 2 }
        },
        {
            x: timePoints,
            y: strategy.meanDebtPath,
            type: 'scatter',
            mode: 'lines',
            name: 'Average Debt',
            line: { color: styles.getPropertyValue('--md-error').trim(), width: 2, dash: 'dash' }
        },
        {
            x: timePoints,
            y: realDeposits,
            type: 'scatter',
            mode: 'lines',
            name: 'Real Deposits',
            line: { color: styles.getPropertyValue('--md-text-muted').trim(), width: 2, dash: 'dot' }
        }
    ];

    return Plotly.newPlot('securitiesDebtChart', traces, {
        title: 'Average Wealth Values',
        xaxis: { title: 'Years' },
        yaxis: { title: 'Real value ($)' },
        hovermode: 'x unified',
        margin: { t: 48, r: 24, b: 48, l: 64 }
    }, { responsive: true });
}

/**
 * Display Results and Initialize Interactive Elements
 * @param {Object} results - Full results object from adapter {strategies, loanDetails, benchmark}
 */
function displayResults(results, options = {}) {
    console.log('[DisplayResults] Called with results:', results);
    simulationResults = results;
    const isPartial = options.isPartial ?? results.isPartial ?? false;
    
    const data = results.strategies;
    const loanDetails = results.loanDetails;
    const presentValue = loanDetails.initialEquity;
    
    const summary = document.getElementById('summary');
    const targetIndex = DEFAULT_STRATEGY_INDEX;
    const currentStrategy = data[targetIndex] ?? results.benchmark ?? { targetLTV: 0 };
    const currentLtvPercent = Number((currentStrategy.targetLTV ?? 0) * 100);

    const slider = document.getElementById('strategySlider');
    if (slider) {
        slider.min = 0;
        slider.max = Math.max(0, data.length - 1);
        slider.value = targetIndex;
        slider.disabled = isPartial;
    }

    updateSliderPills(targetIndex);
    updateSummary(targetIndex, isPartial);
    
    // Show results div FIRST so Plotly can calculate proper dimensions
    document.getElementById('results').classList.add('is-visible');
    
    // Then render histogram with proper sizing
    console.log('[DisplayResults] Rendering histogram for strategy index:', targetIndex);
    renderHistogram(targetIndex);
    
    renderSecuritiesDebtChart(targetIndex);
}

/**
 * Handle Slider Input Event
 */
function handleSliderChange(event) {
    const strategyIndex = parseInt(event.target.value);
    updateSliderPills(strategyIndex);
    renderHistogram(strategyIndex);
    renderSecuritiesDebtChart(strategyIndex);
    updateSummary(strategyIndex);
}

/**
 * Handle Calculate button with loading state
 */
async function handleCalculate() {
    const button = document.getElementById('calculateBtn');
    if (!button) {
        await runSimulation();
        return;
    }

    button.disabled = true;
    button.classList.add('loading');
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating...';

    // Use setTimeout to allow the UI to update with the loading state
    setTimeout(async () => {
        try {
            await runSimulation();
        } finally {
            button.innerHTML = 'Calculate';
            button.classList.remove('loading');
            button.disabled = false;
        }
    }, 0);
}

/**
 * Update Slider Pill States and Percentages
 */
function updateSliderPills(activeIndex) {
    if (!simulationResults) return;
    
    const selectedStrategy = simulationResults.strategies[activeIndex];
    
    if (!selectedStrategy) return;
    
    // Update selected strategy statistics
    const selectedLtvSpan = document.getElementById('selectedLtv');
    const survivalRateSpan = document.getElementById('survivalRate');
    const outperformanceRateSpan = document.getElementById('outperformanceRate');
    const dcaMeanComparison = document.getElementById('dcaMeanComparison');
    
    if (selectedLtvSpan && survivalRateSpan && outperformanceRateSpan) {
        selectedLtvSpan.textContent = (selectedStrategy.targetLTV * 100).toFixed(1) + "%";
        
        const survivalRate = selectedStrategy.survivalRate;
        const outperformanceRate = selectedStrategy.trinaryStats?.profitPercent || 0;
        const isBaseline = activeIndex === 0 || Number(selectedStrategy.targetLTV ?? 0) === 0;
        
        survivalRateSpan.textContent = Math.round(survivalRate);
        outperformanceRateSpan.textContent = Math.round(outperformanceRate);
        dcaMeanComparison.hidden = isBaseline;
    }
}

/**
 * Input Validation
 */
function validateInputs() {
    const inputs = ['loanPeriod', 'assetValue', 'monthlyBudget', 'primeRate', 'spreadRate', 'growth', 'vol', 'marginCall', 'inflationRate'];
    
    for (const id of inputs) {
        const element = document.getElementById(id);
        if (element && !element.disabled) {
            const value = parseFloat(element.value);
            if (isNaN(value) || value < 0) {
                const label = element.closest('.input-group')?.querySelector('label');
                const labelText = label ? label.textContent : id;
                alert(`Please enter a valid non-negative number for ${labelText}`);
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', () => {
    enableSliderScrollLock();
    const setText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    };

    const copy = {
        'growth-tooltip': CopywritingHelpers.getGrowthRateText(),
        'volatility-tooltip': CopywritingHelpers.getVolatilityText(),
        'prime-rate-tooltip': CopywritingHelpers.getPrimeRateText(),
        'spread-rate-tooltip': CopywritingHelpers.getSpreadRateText(),
        'interest-rate-tooltip': CopywritingHelpers.getInterestRateText(),
        'margin-call-tooltip': CopywritingHelpers.getMarginCallText(),
        'max-ltv-tooltip': CopywritingHelpers.getMaxLTVText(),
        'interest-reference-1': CopywritingHelpers.getInterestRateText(),
        'growth-reference-1': CopywritingHelpers.getGrowthRateText(),
        'spread-reference-1': CopywritingHelpers.getSpreadText(),
        'interest-reference-1b': CopywritingHelpers.getInterestRateText(),
        'margin-reference-4': CopywritingHelpers.getMarginCallText(),
        'growth-assumptions': CopywritingHelpers.getGrowthRateText(),
        'volatility-assumptions': CopywritingHelpers.getVolatilityText(),
        'margin-assumptions': CopywritingHelpers.getMarginCallText(),
        'inflation-assumptions': CopywritingHelpers.getInflationText(),
        'sim-count-method': CopywritingHelpers.getSimulationCountText(),
        'sim-count-step3-2': CopywritingHelpers.getSimulationCountText(),
        'baseline-sims-step3-2': CopywritingHelpers.getBaseCaseSimulationsText(),
        'loan-period-assumptions': DEFAULT_INPUTS.LOAN_PERIOD
    };
    Object.entries(copy).forEach(([id, text]) => setText(id, text));

    const constantPreamble = document.getElementById('constant-leverage-dca-copy');
    const lifecyclePreamble = document.getElementById('lifecycle-investing-copy');

    if (constantPreamble) {
        constantPreamble.innerHTML = CopywritingHelpers.getConstantPreambleHtml();
    }
    if (lifecyclePreamble) {
        lifecyclePreamble.innerHTML = CopywritingHelpers.getLifecyclePreambleHtml();
    }

    document.querySelectorAll('.box--info').forEach((box) => {
        box.classList.add('is-collapsed');
        box.setAttribute('tabindex', '0');
        box.setAttribute('role', 'button');
        box.setAttribute('aria-expanded', 'false');

        const toggleBox = () => {
            const isCollapsed = box.classList.toggle('is-collapsed');
            box.setAttribute('aria-expanded', String(!isCollapsed));
        };

        box.addEventListener('click', toggleBox);
        box.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleBox();
            }
        });
    });

    const switchPreamble = (mode) => {
        const panels = {
            constant: document.getElementById('constant-leverage-dca-copy'),
            lifecycle: document.getElementById('lifecycle-investing-copy')
        };

        Object.entries(panels).forEach(([key, panel]) => {
            if (!panel) return;
            const show = key === mode;
            panel.hidden = !show;
        });

        document.querySelectorAll('.nav-tab').forEach(button => {
            const isActive = button.dataset.preamble === mode;
            button.classList.toggle('active', isActive);
        });
    };

    document.querySelectorAll('.nav-tab').forEach(button => {
        button.addEventListener('click', () => switchPreamble(button.dataset.preamble));
    });
    switchPreamble(document.querySelector('.nav-tab.active')?.dataset.preamble || 'constant');

    document.getElementById('jumpToCalculator')?.addEventListener('click', () => {
        document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('standardMode')?.addEventListener('click', () => setMode('standard'));
    document.getElementById('customMode')?.addEventListener('click', () => setMode('custom'));
    document.getElementById('calculateBtn')?.addEventListener('click', handleCalculate);
    document.getElementById('assetValue')?.addEventListener('input', updateLoanFromCollateral);
    document.getElementById('ltvSlider')?.addEventListener('input', updateLoanFromSlider);
    document.getElementById('loanAmount')?.addEventListener('input', updateLoanFromDirectInput);

    // Initialize input values from config
    document.getElementById('loanPeriod').value = DEFAULT_INPUTS.LOAN_PERIOD;
    document.getElementById('monthlyBudget').value = DEFAULT_INPUTS.MONTHLY_BUDGET;
    document.getElementById('assetValue').value = DEFAULT_INPUTS.STARTING_DEPOSIT;
    
    // Initialize LTV input with correct starting value
    const ltvEl = document.getElementById('ltvSlider');
    if (ltvEl) {
        ltvEl.value = DEFAULT_INPUTS.STARTING_LTV;
    }
    const ltvDisplay = document.getElementById('ltvDisplay');
    if (ltvDisplay) {
        ltvDisplay.innerText = DEFAULT_INPUTS.STARTING_LTV;
    }
    
    // Calculate and set initial loan amount
    const initialLoanAmount = (DEFAULT_INPUTS.STARTING_DEPOSIT * DEFAULT_INPUTS.STARTING_LTV / 100).toFixed(0);
    document.getElementById('loanAmount').value = initialLoanAmount;

    // Pre-fill future mechanism parameter inputs; they remain locked until their simulators are compiled.
    document.getElementById('garchOmega').value = GARCH_PARAMS_DEFAULTS.OMEGA;
    document.getElementById('garchAlpha').value = GARCH_PARAMS_DEFAULTS.ALPHA;
    document.getElementById('garchBeta').value = GARCH_PARAMS_DEFAULTS.BETA;
    document.getElementById('hestonKappa').value = HESTON_PARAMS_DEFAULTS.KAPPA;
    document.getElementById('hestonTheta').value = HESTON_PARAMS_DEFAULTS.THETA;
    document.getElementById('hestonSigmaV').value = HESTON_PARAMS_DEFAULTS.SIGMA_V;
    document.getElementById('hestonRho').value = HESTON_PARAMS_DEFAULTS.RHO;
    document.getElementById('mertonJumpLambda').value = MERTON_PARAMS_DEFAULTS.JUMP_LAMBDA;
    document.getElementById('mertonJumpMu').value = MERTON_PARAMS_DEFAULTS.JUMP_MU;
    document.getElementById('mertonJumpSigma').value = MERTON_PARAMS_DEFAULTS.JUMP_SIGMA;

    // Set initial mode to standard
    setMode('standard');
    
    // Attach strategy slider event listener
    const slider = document.getElementById('strategySlider');
    if (slider) {
        slider.addEventListener('input', handleSliderChange);
    }
});

// Plotly owns histogram binning; stats owns the scenario population and values.
function renderHistogram(strategyIndex) {
    if (!simulationResults || typeof Plotly === 'undefined') return;
    const strategy = simulationResults.strategies[strategyIndex];
    const benchmark = simulationResults.benchmark;
    if (!strategy || !benchmark) return;

    const isBaseline = strategyIndex === 0 || Number(strategy.targetLTV ?? 0) === 0;
    const styles = getComputedStyle(document.documentElement);
    const chartColors = {
        ruin: styles.getPropertyValue('--md-error').trim(),
        sucker: styles.getPropertyValue('--md-warning-border').trim(),
        profit: styles.getPropertyValue('--md-success').trim(),
        dcaSurvival: styles.getPropertyValue('--md-chart-dca-survival').trim(),
        dcaOverlay: styles.getPropertyValue('--md-chart-dca-overlay').trim()
    };
    const ruinOpacity = Number(styles.getPropertyValue('--md-chart-ruin-opacity').trim());
    const outcomeOpacity = Number(styles.getPropertyValue('--md-chart-outcome-opacity').trim());
    const dcaOverlayOpacity = Number(styles.getPropertyValue('--md-chart-dca-overlay-opacity').trim());
    const totalDeposits = Number(strategy.totalDeposits ?? 0);
    const benchmarkMean = Number(strategy.benchmarkExpected ?? benchmark.expectedWealth ?? 0);

    const traces = [];

    if (isBaseline) {
        const outcomes = { ruin: [], survived: [] };
        strategy.finalWealthArray.forEach((wealth) => {
            outcomes[wealth <= totalDeposits ? 'ruin' : 'survived'].push(wealth);
        });
        traces.push(
            { x: outcomes.ruin, type: 'histogram', histnorm: 'probability', name: 'DCA Ruin', opacity: ruinOpacity, marker: { color: chartColors.ruin } },
            { x: outcomes.survived, type: 'histogram', histnorm: 'probability', name: 'DCA Survived', opacity: outcomeOpacity, marker: { color: chartColors.dcaSurvival } }
        );
    } else {
        traces.push({
            x: benchmark.finalWealthArray,
            type: 'histogram',
            histnorm: 'probability',
            name: 'DCA Benchmark',
            opacity: dcaOverlayOpacity,
            marker: { color: chartColors.dcaOverlay }
        });
    }

    if (!isBaseline) {
        const outcomes = { ruin: [], sucker: [], profit: [] };
        strategy.finalWealthArray.forEach((wealth) => {
            if (wealth <= totalDeposits) outcomes.ruin.push(wealth);
            else if (wealth > benchmarkMean) outcomes.profit.push(wealth);
            else outcomes.sucker.push(wealth);
        });
        traces.push(
            { x: outcomes.ruin, type: 'histogram', histnorm: 'probability', name: 'Ruin', opacity: ruinOpacity, marker: { color: chartColors.ruin } },
            { x: outcomes.sucker, type: 'histogram', histnorm: 'probability', name: 'Sucker', opacity: outcomeOpacity, marker: { color: chartColors.sucker } },
            { x: outcomes.profit, type: 'histogram', histnorm: 'probability', name: 'Profit', opacity: outcomeOpacity, marker: { color: chartColors.profit } }
        );
    }

    return Plotly.newPlot('histogramChart', traces, {
        title: `Final Real Wealth (Strategy ${strategyIndex + 1})`,
        barmode: 'overlay',
        xaxis: { title: 'Final Real Wealth (Today\'s Purchasing Power)', tickformat: '$,.0f' },
        yaxis: { title: 'Probability', tickformat: '.0%' },
        margin: { t: 64, b: 72, l: 72, r: 24 },
        autosize: true
    }, { responsive: true, displaylogo: false });
}

