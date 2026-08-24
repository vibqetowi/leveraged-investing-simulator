// Global state
let currentMode = 'standard';
let simulationResults = null; // Store last simulation results for slider interaction
const DEFAULT_STRATEGY_INDEX = 0;

function getStandardDefaults() {
    if (typeof window !== 'undefined' && window.STANDARD_MODE_DEFAULTS) {
        return window.STANDARD_MODE_DEFAULTS;
    }
    if (typeof config !== 'undefined' && config.STANDARD_MODE_DEFAULTS) {
        return config.STANDARD_MODE_DEFAULTS;
    }
    return STANDARD_MODE_DEFAULTS;
}

function getPrimeRateValue() {
    const element = document.getElementById('primeRate');
    return parseFloat(element?.value ?? getStandardDefaults().PRIME_RATE);
}

function getSpreadRateValue() {
    const element = document.getElementById('spreadRate');
    return parseFloat(element?.value ?? getStandardDefaults().SPREAD_RATE);
}

function getEffectiveInterestRateValue() {
    return getPrimeRateValue() + getSpreadRateValue();
}

function setInputLocked(element, isLocked) {
    if (!element) return;
    // Use a single lock path so all standard-mode fields look and behave the same.
    element.disabled = false;
    element.readOnly = isLocked;
    element.classList.toggle('input-readonly', isLocked);
}

function setInputLocked(element, isLocked) {
    if (!element) return;
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
    const standardModeButton = document.getElementById('standardMode');
    const customModeButton = document.getElementById('customMode');
    if (standardModeButton) standardModeButton.classList.toggle('btn--active', isStandard);
    if (customModeButton) customModeButton.classList.toggle('btn--active', !isStandard);
    
    document.getElementById('modeDescription').innerHTML = isStandard 
        ? CopywritingHelpers.getModeStandardDescription() 
        : CopywritingHelpers.getModeCustomDescription();
    
    ['growth', 'vol', 'marginCall', 'primeRate', 'spreadRate', 'inflationRate']
        .forEach(id => setInputLocked(document.getElementById(id), isStandard));
    
    // Show LTV slider in both modes; the loan derivation stays hidden to the user
    const ltvSliderGroup = document.getElementById('ltvSliderGroup');
    if (ltvSliderGroup) ltvSliderGroup.classList.add('is-flex');
    const loanAmountGroup = document.getElementById('loanAmountGroup');
    if (loanAmountGroup) loanAmountGroup.classList.add('is-flex');
    
    // Configure LTV slider and hidden loan amount based on mode
    const ltvSlider = document.getElementById('ltvSlider');
    const loanAmountInput = document.getElementById('loanAmount');
    
    const standardDefaults = getStandardDefaults();

    if (isStandard) {
        // Standard Mode: slider max 50%
        if (ltvSlider) ltvSlider.max = standardDefaults.MAX_LTV;
        if (ltvSlider) ltvSlider.disabled = false;
        if (loanAmountInput) {
            setInputLocked(loanAmountInput, true);
            setInputLocked(loanAmountInput, true);
        }
        
        // Lock standard mode parameters
        document.getElementById('primeRate').value = standardDefaults.PRIME_RATE;
        document.getElementById('spreadRate').value = standardDefaults.SPREAD_RATE;
        document.getElementById('growth').value = standardDefaults.GROWTH_RATE;
        document.getElementById('vol').value = standardDefaults.VOLATILITY;
        document.getElementById('marginCall').value = standardDefaults.MARGIN_CALL_LTV;
        document.getElementById('inflationRate').value = standardDefaults.INFLATION_RATE;
        
        // Cap LTV at 35% if it was higher in custom mode
        let currentLtv = parseFloat(ltvSlider.value);
        if (currentLtv > standardDefaults.MAX_LTV) {
            currentLtv = standardDefaults.MAX_LTV;
            ltvSlider.value = currentLtv;
            document.getElementById('ltvDisplay').innerText = currentLtv;
        }
        
        // Reset slider color in standard mode
        ltvSlider.classList.remove('strategy-slider--danger', 'strategy-slider--warning', 'strategy-slider--default');
        ltvSlider.classList.remove('strategy-slider--danger', 'strategy-slider--warning', 'strategy-slider--default');
        
        // Calculate loan amount from LTV and collateral
        updateLoanFromSlider();
        
        // Clear LTV warning in standard mode
        document.getElementById('ltvWarning').classList.add('is-hidden');
        document.getElementById('ltvWarning').classList.add('is-hidden');
    } else {
        // Custom Mode: slider max 100%, hidden loan amount remains internal
        if (ltvSlider) ltvSlider.max = 100;
        if (ltvSlider) ltvSlider.disabled = false;
        if (loanAmountInput) {
            setInputLocked(loanAmountInput, false);
            setInputLocked(loanAmountInput, false);
        }
        
        // Check and show LTV warnings if applicable
        validateAndColorLTV();
    }

}


/**
 * Validate and color LTV indicator (Yellow at 35%+, Red at 100%+)
 * Only used in Custom Mode
 */
function validateAndColorLTV() {
    if (currentMode !== 'custom') return;
    
    const ltv = parseFloat(document.getElementById('ltvSlider').value);
    const ltvSlider = document.getElementById('ltvSlider');
    const ltvWarning = document.getElementById('ltvWarning');
    const ltvWarningIcon = document.getElementById('ltvWarningIcon');
    const ltvWarningText = document.getElementById('ltvWarningText');
    ltvSlider.classList.remove('strategy-slider--danger', 'strategy-slider--warning', 'strategy-slider--default');
    ltvSlider.classList.remove('strategy-slider--danger', 'strategy-slider--warning', 'strategy-slider--default');
    
    if (ltv >= 100) {
        // Red slider and warning for over 100% LTV
        ltvSlider.classList.add('strategy-slider--danger');
        ltvWarning.classList.remove('is-hidden');
        ltvSlider.classList.add('strategy-slider--danger');
        ltvWarning.classList.remove('is-hidden');
        ltvWarningIcon.textContent = '🚨';
        ltvWarningText.textContent = 'Loan amount exceeds 100% of collateral. This is extremely risky and may trigger forced liquidation.';
    } else if (ltv >= 35) {
        // Yellow slider and warning for 35%+ LTV
        ltvSlider.classList.add('strategy-slider--warning');
        ltvWarning.classList.remove('is-hidden');
        ltvSlider.classList.add('strategy-slider--warning');
        ltvWarning.classList.remove('is-hidden');
        ltvWarningIcon.textContent = '⚠️';
        ltvWarningText.textContent = 'Loan-to-Value ratio exceeds 35%. Standard mode caps at 35% to match historical best practices.';
    } else {
        // Purple slider (default) and no warning
        ltvSlider.classList.add('strategy-slider--default');
        ltvWarning.classList.add('is-hidden');
        ltvSlider.classList.add('strategy-slider--default');
        ltvWarning.classList.add('is-hidden');
    }
}

/**
 * Update loan amount based on LTV slider (all modes)
 */
function updateLoanFromSlider() {
    const ltv = parseFloat(document.getElementById('ltvSlider').value);
    const collateral = parseFloat(document.getElementById('assetValue').value);
    const loanAmount = (collateral * ltv / 100).toFixed(0);
    
    document.getElementById('ltvDisplay').innerText = ltv;
    document.getElementById('loanAmount').value = loanAmount;
    
    // Validate and color LTV if in custom mode
    if (currentMode === 'custom') {
        validateAndColorLTV();
    }
    
}

/**
 * Update loan amount when user edits it directly
 */
function updateLoanFromDirectInput() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    const collateral = parseFloat(document.getElementById('assetValue').value) || 1;
    const ltv = (loanAmount / collateral * 100);
    
    // Update slider and display
    document.getElementById('ltvSlider').value = ltv;
    document.getElementById('ltvDisplay').innerText = Math.round(ltv);
    
    // Validate and color LTV if in custom mode
    if (currentMode === 'custom') {
        validateAndColorLTV();
    }
    
}

/**
 * Update loan amount when collateral changes
 */
function updateLoanFromCollateral() {
    const ltv = parseFloat(document.getElementById('ltvSlider').value);
    const collateral = parseFloat(document.getElementById('assetValue').value);
    const loanAmount = (collateral * ltv / 100).toFixed(0);
    
    document.getElementById('loanAmount').value = loanAmount;
    
    // Validate and color LTV if in custom mode
    if (currentMode === 'custom') {
        validateAndColorLTV();
    }
    
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
        const results = await runSimulationWithAdapter(getSimulationInputs());
        console.log('[Script] Results received from adapter:', results);
        
        if (!results) {
            console.error('[Script] No results returned from adapter');
            return null;
        }
        
        // Store results globally for slider interaction
        simulationResults = results;
        console.log('[Script] Results stored globally, strategies count:', results.strategies.length);
        
        // Display results (histogram and strategic report)
        console.log('[Script] Calling displayResults with full results object');
        displayResults(results);
        console.log('[Script] displayResults completed');
        
        return results;
    } catch (error) {
        console.error('[Script] Simulation error:', error);
        alert(CopywritingHelpers.getSimulationErrorMessage(error.message));
        return null;
    }
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
    const maxLTV = Math.max(0, marginCallLTV - 0.05);
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
        modelId: STANDARD_MODE_DEFAULTS.MODEL_ID,
        months
    };
}


/**
 * Find Target Strategy Index based on Risk Target
 * Chooses the closest survival rate at or above the target,
 * or the maximum target-LTV strategy if none are safe.
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

/**
 * Render Histogram for a Specific Strategy
 * Uses "0 to Mean + 1 Sigma" filtering for performance and ethical display
 */
function renderHistogramLegacy(strategyIndex) {
    console.log('[Histogram] renderHistogram called with index:', strategyIndex);
    
    if (!simulationResults) {
        console.error('[Histogram] No simulationResults available from integration layer');
        document.getElementById('histogramChart').innerHTML = '<p class="chart-error">Error: No simulation results from integration layer</p>';
        document.getElementById('histogramChart').innerHTML = '<p class="chart-error">Error: No simulation results from integration layer</p>';
        return;
    }
    
    const strategy = simulationResults.strategies[strategyIndex];
    const wealthData = strategy.finalWealthArray;
    const benchmarkData = strategy.benchmarkWealthArray;
    const initialEquity = simulationResults.loanDetails.initialEquity;
    
    if (!wealthData || !benchmarkData) {
        console.error('[Histogram] Integration layer did not provide complete wealth arrays');
        document.getElementById('histogramChart').innerHTML = '<p class="chart-error">Error: Integration layer did not provide complete data</p>';
        document.getElementById('histogramChart').innerHTML = '<p class="chart-error">Error: Integration layer did not provide complete data</p>';
        return;
    }
    
    if (wealthData.length === 0 || benchmarkData.length === 0) {
        console.warn('[Histogram] Empty data arrays - all simulations resulted in ruin');
        document.getElementById('histogramChart').innerHTML = '<p class="chart-error">No data available - all simulations resulted in ruin.</p>';
        document.getElementById('histogramChart').innerHTML = '<p class="chart-error">No data available - all simulations resulted in ruin.</p>';
        return;
    }
    
    // ========================================
    // 1.0 STATISTICAL CALCULATION (Pre-Processing)
    // ========================================
    
    // 1.1 Extract Combined Dataset
    const allOutcomes = [...wealthData, ...benchmarkData];
    
    // 1.2 Define Cutoff Boundaries
    const chartMin = 0;  // Hard constraint: show all downside
    
    // 1.3 Find chartMax by filtering out bins with < 0.3% probability
    // Create initial bins to find max value that meets threshold
    const numBins = UI_CONSTANTS.HISTOGRAM_BINS;
    const tempMax = Math.max(...allOutcomes);
    const tempBinSize = tempMax / numBins;
    
    let tempBins = new Array(numBins).fill(0);
    allOutcomes.forEach(w => {
        const binIndex = Math.min(Math.floor(w / tempBinSize), numBins - 1);
        tempBins[binIndex]++;
    });
    
    // Find highest bin with at least 0.3% probability
    const threshold = allOutcomes.length * 0.003; // 0.3% threshold
    let maxBinIndex = numBins - 1;
    for (let i = numBins - 1; i >= 0; i--) {
        if (tempBins[i] >= threshold) {
            maxBinIndex = i;
            break;
        }
    }
    
    const chartMax = (maxBinIndex + 1) * tempBinSize;
    
    // ========================================
    // 2.0 DATA FILTERING
    // ========================================
    
    // 2.1 Filter Datasets (keep only outcomes visible on chart)
    const visibleWealthData = wealthData.filter(w => w >= chartMin && w <= chartMax);
    const visibleBenchmarkData = benchmarkData.filter(w => w >= chartMin && w <= chartMax);
    
    // ========================================
    // 3.0 DYNAMIC BINNING (The Performance Fix)
    // ========================================
    
    // 3.1 Calculate Dynamic Bin Size (reusing numBins from above)
    const binSize = chartMax / numBins;
    
    // 3.2 Generate Histogram Bins
    let binsLeveraged = new Array(numBins).fill(0);
    visibleWealthData.forEach(w => {
        const binIndex = Math.min(Math.floor(w / binSize), numBins - 1);
        binsLeveraged[binIndex]++;
    });

    let binsBenchmark = new Array(numBins).fill(0);
    visibleBenchmarkData.forEach(w => {
        const binIndex = Math.min(Math.floor(w / binSize), numBins - 1);
        binsBenchmark[binIndex]++;
    });

    // Convert to probabilities (%)
    const totalLeveraged = wealthData.length;  // Use ORIGINAL count for probability
    const totalBenchmark = benchmarkData.length;
    const leveragedProb = binsLeveraged.map(count => (count / totalLeveraged) * 100);
    const benchmarkProb = binsBenchmark.map(count => (count / totalBenchmark) * 100);

    // Create x-axis labels
    const xLabels = leveragedProb.map((_, i) => i * binSize);

    // Sort data to extract percentiles accurately (from ORIGINAL data)
    const sortedWealth = [...wealthData].sort((a, b) => a - b);
    const total = sortedWealth.length;

    // Extract Real-World Percentiles
    const p50 = sortedWealth[Math.floor(total * 0.50)]; // Leveraged Median
    
    // ========================================
    // 4.0 RENDER & CLEANUP
    // ========================================
    
    // 4.1 Calculate benchmark median for performance comparison
    const benchmarkMedianWealth = strategy.benchmarkMedian;
    
    // 4.2 Create separate arrays for ruin, underperformed, and overperformed outcomes
    // RUIN: Either margin call (x=0) OR lost money (x < initialEquity)
    const ruinProb = [];
    const underperformedProb = [];
    const overperformedProb = [];
    
    xLabels.forEach((x, i) => {
        if (x === 0 || x < initialEquity) {
            // Ruin outcomes: margin call OR ended with less than initial equity
            ruinProb.push(leveragedProb[i]);
            underperformedProb.push(0);
            overperformedProb.push(0);
        } else if (x < benchmarkMedianWealth) {
            // Sucker: survived with profit but underperformed benchmark
            ruinProb.push(0);
            underperformedProb.push(leveragedProb[i]);
            overperformedProb.push(0);
        } else {
            // Profit: survived and overperformed benchmark
            ruinProb.push(0);
            underperformedProb.push(0);
            overperformedProb.push(leveragedProb[i]);
        }
    });
    
    // 4.3 Create histogram traces with color-coded performance zones
    const ruinTrace = {
        x: xLabels,
        y: ruinProb,
        type: 'bar',
        name: 'Ruin (Loss or Liquidation)',
        marker: {
            color: UI_CONSTANTS.HISTOGRAM_COLORS.ruin,
            opacity: UI_CONSTANTS.HISTOGRAM_COLORS.ruinOpacity,
            line: {
                color: UI_CONSTANTS.HISTOGRAM_COLORS.ruin,
                width: 2
            }
        },
        width: binSize * 1.5  // Make ruin bar wider for visibility
    };
    
    const underperformedTrace = {
        x: xLabels,
        y: underperformedProb,
        type: 'bar',
        name: 'Underperformed Benchmark',
        marker: {
            color: UI_CONSTANTS.HISTOGRAM_COLORS.underperformed,
            opacity: UI_CONSTANTS.HISTOGRAM_COLORS.performanceOpacity,
            line: {
                color: UI_CONSTANTS.HISTOGRAM_COLORS.underperformed,
                width: 1
            }
        }
    };
    
    const overperformedTrace = {
        x: xLabels,
        y: overperformedProb,
        type: 'bar',
        name: 'Outperformed Benchmark',
        marker: {
            color: UI_CONSTANTS.HISTOGRAM_COLORS.overperformed,
            opacity: UI_CONSTANTS.HISTOGRAM_COLORS.performanceOpacity,
            line: {
                color: UI_CONSTANTS.HISTOGRAM_COLORS.overperformed,
                width: 1
            }
        }
    };

    const benchmarkTrace = {
        x: xLabels,
        y: benchmarkProb,
        type: 'bar',
        name: 'No-Leverage Baseline',
        marker: {
            color: UI_CONSTANTS.HISTOGRAM_COLORS.benchmark,
            line: {
                color: 'rgba(0, 0, 0, 0.8)',
                width: 1
            }
        }
    };
    
    // Calculate percentage of outcomes filtered out for transparency
    const filteredLeveraged = wealthData.length - visibleWealthData.length;
    const filteredBenchmark = benchmarkData.length - visibleBenchmarkData.length;
    const filteredPctLeveraged = (filteredLeveraged / wealthData.length) * 100;
    const filteredPctBenchmark = (filteredBenchmark / benchmarkData.length) * 100;
    
    // Create layout with THREE LINES visualization (Ruin/Benchmark/Strategy)
    const layout = {
        title: `Wealth Distribution (Strategy ${strategyIndex + 1})`,
        xaxis: {
            title: 'Final Real Wealth (Today\'s Purchasing Power)',
            tickformat: '$,.0f',
            range: [0, chartMax]  // Enforce the view
        },
        yaxis: {
            title: 'Probability (%)',
            ticksuffix: '%'
        },
        barmode: 'overlay',
        annotations: [],
        margin: { t: 80, b: 80, l: 70, r: 30 },
        autosize: true,
        plot_bgcolor: '#f9f9f9',
        paper_bgcolor: '#ffffff'
    };
    
    // Add subtitle showing filtered percentage if significant
    if (filteredPctLeveraged > 1 || filteredPctBenchmark > 1) {
        layout.annotations.push({
            x: 0.5,
            xref: 'paper',
            y: 1.08,
            yref: 'paper',
            text: `Outcomes below 0.3% probability filtered from chart. Extreme winners (${filteredPctLeveraged.toFixed(1)}% leveraged, ${filteredPctBenchmark.toFixed(1)}% baseline) included in statistics.`,
            showarrow: false,
            xanchor: 'center',
            font: {
                size: 10,
                color: '#666'
            }
        });
    }
    
    // Plotly config for responsive full-width display
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    };
    
    // Render with all traces: benchmark, ruin, underperformed, overperformed
    return Plotly.newPlot('histogramChart', [benchmarkTrace, ruinTrace, underperformedTrace, overperformedTrace], layout, config);
}

/**
 * Detect investing mode based on strategy characteristics
 * Returns 'lifecycle' or 'margin'
 */
function detectInvestingMode() {
    return "target-ltv";
}

function updateSummary(strategyIndex) {
    if (!simulationResults) return;
    
    const strategy = simulationResults.strategies[strategyIndex];
    const loanDetails = simulationResults.loanDetails;
    
    // Detect mode
    const mode = detectInvestingMode(strategy, loanDetails);
    
    // Use pre-calculated trinary statistics from orchestrator results
    const trinaryStats = strategy.trinaryStats;
    const verdict = CopywritingHelpers.generateVerdict(trinaryStats);
    
    const summaryBox = document.getElementById('dynamicSummary');
    const medianRealWealth = strategy.medianWealth;
    const survivalRate = strategy.survivalRate;
    const benchmarkMedian = strategy.benchmarkMedian;
    const delta = medianRealWealth - benchmarkMedian;
    const spreadPercent = trinaryStats.profitPercent - trinaryStats.suckerPercent;

    // Get narrative text from copywriting helpers
    const narrative = CopywritingHelpers.getStrategySummaryNarrative(strategy.targetLTV, survivalRate, medianRealWealth, benchmarkMedian, delta);
    const narrative = CopywritingHelpers.getStrategySummaryNarrative(strategy.targetLTV, survivalRate, medianRealWealth, benchmarkMedian, delta);

    // Build the summary HTML based on mode
    let summaryHTML = '';
    
    if (mode === 'lifecycle') {
        // RISK-SHIFTING: Educational content about risk-shifting
        summaryHTML = `
        <!-- RISK-SHIFTING ANALYSIS -->
        <div class="result-hero-lifecycle">
            <h3>📊 Risk-Shifting</h3>
            <p>
                This strategy borrows once, invests immediately, and pays back over time. The goal is to shift market exposure across the investor's lifetime instead of concentrating it later in life.
        <div class="result-hero-lifecycle">
            <h3>📊 Risk-Shifting</h3>
            <p>
                This strategy borrows once, invests immediately, and pays back over time. The goal is to shift market exposure across the investor's lifetime instead of concentrating it later in life.
            </p>
        </div>
        
        <!-- OUTCOME ZONES GRID -->
        <div class="outcome-grid">
            <div class="outcome-card outcome-card-ruin">
                <div class="outcome-percent outcome-percent-ruin">${trinaryStats.ruinPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('ruin')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('ruin')}</div>
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
            <div class="outcome-card outcome-card-sucker">
                <div class="outcome-percent outcome-percent-sucker">${trinaryStats.suckerPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('sucker')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('sucker')}</div>
            </div>
            <div class="outcome-card outcome-card-profit">
                <div class="outcome-percent outcome-percent-profit">${trinaryStats.profitPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('profit')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('profit')}</div>
            <div class="outcome-card outcome-card-profit">
                <div class="outcome-percent outcome-percent-profit">${trinaryStats.profitPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('profit')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('profit')}</div>
            </div>
        </div>

        <p class="result-intro">${narrative.strategy}</p>
        <p class="result-intro">${narrative.strategy}</p>
        <p>${narrative.outcomes}</p>
        <p><strong>${narrative.baseline}</strong></p>
        <p><strong>${narrative.leverageImpact}</strong></p>
        
        <hr class="result-divider">
        <hr class="result-divider">
        
        <!-- RISK-SHIFTING GUIDANCE -->
        <div class="result-guidance">
            <h4>Evaluating Risk-Shifting</h4>
            <p>
        <div class="result-guidance">
            <h4>Evaluating Risk-Shifting</h4>
            <p>
                <strong>Risk-Shifting Spread:</strong> Profit ${trinaryStats.profitPercent.toFixed(1)}% vs Sucker ${trinaryStats.suckerPercent.toFixed(1)}% = <strong>${spreadPercent.toFixed(1)}%</strong> spread. 
                ${spreadPercent > 0 ? 'Positive spread indicates leverage shifts market exposure forward successfully.' : 'Negative spread indicates DCA outperforms leveraged deployment.'}
            </p>
            <p>
            <p>
                <strong>Liquidation Risk:</strong> ${trinaryStats.ruinPercent.toFixed(1)}% probability. 
                ${trinaryStats.ruinPercent < 2 ? 'Within acceptable range (target < 2%).' : 'Exceeds acceptable threshold. Reduce target LTV or increase collateral.'}
                ${trinaryStats.ruinPercent < 2 ? 'Within acceptable range (target < 2%).' : 'Exceeds acceptable threshold. Reduce target LTV or increase collateral.'}
            </p>
            <p>
                <strong>Time Advantage:</strong> The "Deposits Over Time" chart shows the difference between DCA and constant-LTV leveraged deployment across the simulation period.
            <p>
                <strong>Time Advantage:</strong> The "Deposits Over Time" chart shows the difference between DCA and constant-LTV leveraged deployment across the simulation period.
            </p>
            <p class="advisory">
            <p class="advisory">
                <strong>⚠️ Advisory Required:</strong> Risk-Shifting involves tax implications, sequence-of-returns risk, and personal circumstances this simulator cannot model. Consult licensed financial advisors before implementation.
            </p>
        </div>
        `;
    } else {
        // CONSTANT LTV: Show verdict and outcomes
        // CONSTANT LTV: Show verdict and outcomes
        summaryHTML = `

        <!-- CONSTANT LTV STRATEGY HEADER -->
        <div class="result-hero">
            <h3>📈 Constant LTV Leveraged DCA</h3>
            <p>
                This strategy maintains a constant target LTV while deposits and market movements change portfolio value and debt.
        <!-- CONSTANT LTV STRATEGY HEADER -->
        <div class="result-hero">
            <h3>📈 Constant LTV Leveraged DCA</h3>
            <p>
                This strategy maintains a constant target LTV while deposits and market movements change portfolio value and debt.
            </p>
        </div>
        
        <!-- VERDICT CONTAINER (Traffic Light) -->
        <div class="result-verdict">
            <h3>${verdict.icon} ${verdict.title}</h3>
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
            <div class="outcome-card outcome-card-sucker">
                <div class="outcome-percent outcome-percent-sucker">${trinaryStats.suckerPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('sucker')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('sucker')}</div>
            </div>
            <div class="outcome-card outcome-card-profit">
                <div class="outcome-percent outcome-percent-profit">${trinaryStats.profitPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('profit')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('profit')}</div>
            <div class="outcome-card outcome-card-profit">
                <div class="outcome-percent outcome-percent-profit">${trinaryStats.profitPercent.toFixed(1)}%</div>
                <div class="outcome-label">${CopywritingHelpers.getSuccessCriteriaLabel('profit')}</div>
                <div class="outcome-description">${CopywritingHelpers.getOutcomeDescription('profit')}</div>
            </div>
        </div>

        <p>${narrative.strategy}</p>
        <p>${narrative.strategy}</p>
        <p>${narrative.outcomes}</p>
        <p><strong>${narrative.baseline}</strong></p>
        <p><strong>${narrative.leverageImpact}</strong></p>
        
        <hr class="result-divider">
        <hr class="result-divider">
        
        <!-- IMPLEMENTATION SUMMARY TABLE -->
        <div class="result-criteria">
            <h4>Strategy Success Criteria</h4>
            <table>
        <div class="result-criteria">
            <h4>Strategy Success Criteria</h4>
            <table>
                <thead>
                    <tr>
                        <th>${CopywritingHelpers.getSuccessCriteriaHeaders().outcome}</th>
                        <th>${CopywritingHelpers.getSuccessCriteriaHeaders().goal}</th>
                        <th>${CopywritingHelpers.getSuccessCriteriaHeaders().current}</th>
                        <th>${CopywritingHelpers.getSuccessCriteriaHeaders().status}</th>
                    <tr>
                        <th>${CopywritingHelpers.getSuccessCriteriaHeaders().outcome}</th>
                        <th>${CopywritingHelpers.getSuccessCriteriaHeaders().goal}</th>
                        <th>${CopywritingHelpers.getSuccessCriteriaHeaders().current}</th>
                        <th>${CopywritingHelpers.getSuccessCriteriaHeaders().status}</th>
                    </tr>
                    <tr>
                        <td><strong class="result-sucker">${CopywritingHelpers.getSuccessCriteriaLabel('sucker')}</strong></td>
                        <td>${CopywritingHelpers.getSuccessCriteriaThreshold('sucker')}</td>
                        <td>${trinaryStats.suckerPercent.toFixed(1)}%</td>
                        <td>
                            <span class="result-status ${trinaryStats.suckerPercent < trinaryStats.profitPercent ? 'result-status-good' : 'result-status-warning'}">
                        <td><strong class="result-sucker">${CopywritingHelpers.getSuccessCriteriaLabel('sucker')}</strong></td>
                        <td>${CopywritingHelpers.getSuccessCriteriaThreshold('sucker')}</td>
                        <td>${trinaryStats.suckerPercent.toFixed(1)}%</td>
                        <td>
                            <span class="result-status ${trinaryStats.suckerPercent < trinaryStats.profitPercent ? 'result-status-good' : 'result-status-warning'}">
                                ${trinaryStats.suckerPercent < trinaryStats.profitPercent ? '✓ OK' : '✗ LIKELY'}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td><strong class="result-profit">${CopywritingHelpers.getSuccessCriteriaLabel('profit')}</strong></td>
                        <td>${CopywritingHelpers.getSuccessCriteriaThreshold('profit')}</td>
                        <td>${trinaryStats.profitPercent.toFixed(1)}%</td>
                        <td>
                            <span class="result-status ${verdict.spread > 20 && trinaryStats.ruinPercent < 2 ? 'result-status-good' : 'result-status-warning'}">
                        <td><strong class="result-profit">${CopywritingHelpers.getSuccessCriteriaLabel('profit')}</strong></td>
                        <td>${CopywritingHelpers.getSuccessCriteriaThreshold('profit')}</td>
                        <td>${trinaryStats.profitPercent.toFixed(1)}%</td>
                        <td>
                            <span class="result-status ${verdict.spread > 20 && trinaryStats.ruinPercent < 2 ? 'result-status-good' : 'result-status-warning'}">
                                ${verdict.spread > 20 && trinaryStats.ruinPercent < 2 ? '✓ STRONG' : 'REVIEW'}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p class="note">
            <p class="note">
                ${CopywritingHelpers.getSuccessCriteriaNoteText()}
            </p>
        </div>
        `;
        
        // Add diagnostic fix suggestions if available
        // Add diagnostic fix suggestions if available
        if (verdict.fixSuggestion && verdict.fixSuggestion.length > 0) {
            const fixListHTML = verdict.fixSuggestion.map(fix => `<li>${fix}</li>`).join('');
            const fixListHTML = verdict.fixSuggestion.map(fix => `<li>${fix}</li>`).join('');
            summaryHTML += `
            <div class="result-fixes">
                <h4>${CopywritingHelpers.getFixStrategyHeaderText()}</h4>
                <ul>
            <div class="result-fixes">
                <h4>${CopywritingHelpers.getFixStrategyHeaderText()}</h4>
                <ul>
                    ${fixListHTML}
                </ul>
            </div>
            `;
        }
    }
    
    summaryBox.innerHTML = summaryHTML;
}

/**
 * Render Deposits Over Time Line Chart
 * Uses pre-calculated cash flow schedules from simulation results
 */
function renderDepositsLineChart(strategyIndex) {
    console.log('[DepositsLineChart] renderDepositsLineChart called with index:', strategyIndex);
    
    if (!simulationResults) {
        console.error('[DepositsLineChart] No simulationResults available');
        return;
    }
    
    const strategy = simulationResults.strategies[strategyIndex];
    const benchmark = simulationResults.benchmark;
    const loanDetails = simulationResults.loanDetails;
    
    console.log('[DepositsLineChart] Strategy data:', {
        hasSecuritiesPath: !!strategy.meanSecuritiesPath,
        hasDebtPath: !!strategy.debtPath,
        securitiesPathLength: strategy.meanSecuritiesPath?.length,
        debtPathLength: strategy.debtPath?.length
    });
    
    // Integration layer must provide complete data
    if (!strategy.meanSecuritiesPath || !strategy.debtPath || !benchmark.meanSecuritiesPath) {
        console.error('[DepositsLineChart] Missing cash flow schedules from integration layer');
        document.getElementById('depositsLineChart').innerHTML = '<p class="chart-error">Error: Integration layer did not provide complete schedule data</p>';
        document.getElementById('depositsLineChart').innerHTML = '<p class="chart-error">Error: Integration layer did not provide complete schedule data</p>';
        return;
    }
    
    const months = loanDetails.months;
    
    // Generate time points (years)
    const timePoints = [];
    for (let month = 0; month <= months; month++) {
        timePoints.push(month / 12);
    }
    
    const nonLeverageDeposits = [];
    const leverageDeposits = [];
    const debtBalance = [];
    for (let month = 0; month <= months; month++) {
        nonLeverageDeposits.push(benchmark.meanSecuritiesPath[month] || 0);
        leverageDeposits.push(strategy.meanSecuritiesPath[month] || 0);
        debtBalance.push(strategy.debtPath[month] || 0);
    }
    
    console.log('[DepositsLineChart] Cumulative deposits calculated');
    console.log('[DepositsLineChart] Sample data:', {
        month0: { nonLeverage: nonLeverageDeposits[0], leverage: leverageDeposits[0], debt: debtBalance[0] },
        month6: { nonLeverage: nonLeverageDeposits[6], leverage: leverageDeposits[6], debt: debtBalance[6] },
        monthEnd: { nonLeverage: nonLeverageDeposits[months], leverage: leverageDeposits[months], debt: debtBalance[months] }
    });
    
    // Create Plotly traces
    const nonLeverageTrace = {
        x: timePoints,
        y: nonLeverageDeposits,
        type: 'scatter',
        mode: 'lines',
        name: 'Securities (No Leverage)',
        line: {
            color: '#2196F3',  // Blue
            width: 3
        },
        hovertemplate: '<b>No Leverage</b><br>Time: %{x:.1f} years<br>Securities: $%{y:,.0f}<extra></extra>'
    };
    
    const leverageTrace = {
        x: timePoints,
        y: leverageDeposits,
        type: 'scatter',
        mode: 'lines',
        name: 'Securities (With Leverage)',
        line: {
            color: '#9C27B0',  // Purple
            width: 3
        },
        hovertemplate: '<b>With Leverage</b><br>Time: %{x:.1f} years<br>Securities: $%{y:,.0f}<extra></extra>'
    };
    
    const debtTrace = {
        x: timePoints,
        y: debtBalance,
        type: 'scatter',
        mode: 'lines',
        name: 'Debt Balance (Principal + Accrued Interest)',
        line: {
            color: '#F44336',  // Red
            width: 3,
            dash: 'dash'
        },
        hovertemplate: '<b>Remaining Debt</b><br>Time: %{x:.1f} years<br>Balance: $%{y:,.0f}<extra></extra>'
    };
    
    // Create layout
    const layout = {
        title: `Present Value of Deposits Over Time (Strategy ${strategyIndex + 1})`,
        xaxis: {
            title: 'Time (Years)',
            tickformat: '.1f'
        },
        yaxis: {
            title: 'Value (Today\'s Dollars)',
            tickformat: '$,.0f'
        },
        hovermode: 'x unified',
        margin: { t: 80, b: 80, l: 80, r: 200 },
        autosize: true,
        plot_bgcolor: '#f9f9f9',
        paper_bgcolor: '#ffffff',
        legend: {
            x: 1.02,
            xanchor: 'left',
            y: 1,
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            bordercolor: '#ddd',
            borderwidth: 1
        }
    };
    
    // Plotly config for responsive display
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    };
    
    // Render chart
    console.log('[DepositsLineChart] Rendering chart...');
    return Plotly.newPlot('depositsLineChart', [nonLeverageTrace, leverageTrace, debtTrace], layout, config);
}

function renderSecuritiesDebtChart(strategyIndex) {
    if (!simulationResults || typeof Plotly === 'undefined') return;

    const strategy = simulationResults.strategies[strategyIndex];
    if (!strategy || !strategy.meanSecuritiesPath || !strategy.meanDebtPath) return;

    const months = strategy.months;
    const timePoints = Array.from({ length: months + 1 }, (_, month) => month / 12);
    const traces = [
        {
            x: timePoints,
            y: strategy.meanSecuritiesPath,
            type: 'scatter',
            mode: 'lines',
            name: 'Average Securities',
            line: { color: '#1976D2', width: 2 }
        },
        {
            x: timePoints,
            y: strategy.meanDebtPath,
            type: 'scatter',
            mode: 'lines',
            name: 'Average Debt',
            line: { color: '#C62828', width: 2 }
        }
    ];

    return Plotly.newPlot('securitiesDebtChart', traces, {
        title: 'Average Securities and Debt',
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
function displayResults(results) {
    console.log('[DisplayResults] Called with results:', results);
    
    const data = results.strategies;
    const loanDetails = results.loanDetails;
    const presentValue = loanDetails.initialEquity;
    
    const summary = document.getElementById('summary');
    const targetIndex = DEFAULT_STRATEGY_INDEX;
    const targetStrategy = data[targetIndex];

    summary.innerHTML = `
        <div class="analysis-parameters">
        <div class="analysis-parameters">
            <strong>Analysis Parameters</strong><br>
            <span class="analysis-parameter">Monthly Budget (Baseline): <strong>$${loanDetails.monthlyBudget.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></span><br>
            <span class="analysis-parameter">Starting Portfolio Equity: <strong>$${presentValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></span><br>
            <span class="analysis-parameter">Inflation Rate: <strong>${(loanDetails.inflationRate * 100).toFixed(1)}%</strong> (All wealth values in today's dollars)</span><br><br>
            <span class="analysis-parameter">Monthly Budget (Baseline): <strong>$${loanDetails.monthlyBudget.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></span><br>
            <span class="analysis-parameter">Starting Portfolio Equity: <strong>$${presentValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></span><br>
            <span class="analysis-parameter">Inflation Rate: <strong>${(loanDetails.inflationRate * 100).toFixed(1)}%</strong> (All wealth values in today's dollars)</span><br><br>
        </div>
        <strong>Starting Point:</strong> Base case at <strong>${(targetStrategy.targetLTV * 100).toFixed(1) + "% LTV"}</strong>.<br><br>
        <em class="summary-instruction">Use the slider below to explore the leverage spectrum from the baseline to higher target LTVs.</em>
        <em class="summary-instruction">Use the slider below to explore the leverage spectrum from the baseline to higher target LTVs.</em>
    `;

    const slider = document.getElementById('strategySlider');
    slider.value = targetIndex;

    updateSliderPills(targetIndex);
    updateSummary(targetIndex);
    
    // Show results div FIRST so Plotly can calculate proper dimensions
    document.getElementById('results').classList.add('is-visible');
    document.getElementById('results').classList.add('is-visible');
    
    // Then render histogram with proper sizing
    console.log('[DisplayResults] Rendering histogram for strategy index:', targetIndex);
    renderHistogram(targetIndex);
    
    // Render deposits over time line chart
    console.log('[DisplayResults] Rendering deposits line chart for strategy index:', targetIndex);
    renderDepositsLineChart(targetIndex);
    renderSecuritiesDebtChart(targetIndex);
}

/**
 * Handle Slider Input Event
 */
function handleSliderChange(event) {
    const strategyIndex = parseInt(event.target.value);
    updateSliderPills(strategyIndex);
    renderHistogram(strategyIndex);
    renderDepositsLineChart(strategyIndex);
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
    
    const monthlyBudget = simulationResults.loanDetails.monthlyBudget;
    const selectedStrategy = simulationResults.strategies[activeIndex];
    
    if (!selectedStrategy) return;
    
    // Update selected strategy statistics
    const selectedLtvSpan = document.getElementById('selectedLtv');
    const survivalRateSpan = document.getElementById('survivalRate');
    const outperformanceRateSpan = document.getElementById('outperformanceRate');
    // Update selected strategy statistics
    const selectedLtvSpan = document.getElementById('selectedLtv');
    const survivalRateSpan = document.getElementById('survivalRate');
    const outperformanceRateSpan = document.getElementById('outperformanceRate');
    
    if (selectedLtvSpan && survivalRateSpan && outperformanceRateSpan) {
        selectedLtvSpan.textContent = (selectedStrategy.targetLTV * 100).toFixed(1) + "%";
    if (selectedLtvSpan && survivalRateSpan && outperformanceRateSpan) {
        selectedLtvSpan.textContent = (selectedStrategy.targetLTV * 100).toFixed(1) + "%";
        
        const survivalRate = selectedStrategy.survivalRate;
        const outperformanceRate = selectedStrategy.trinaryStats?.profitPercent || 0;
        const survivalRate = selectedStrategy.survivalRate;
        const outperformanceRate = selectedStrategy.trinaryStats?.profitPercent || 0;
        
        survivalRateSpan.textContent = Math.round(survivalRate);
        outperformanceRateSpan.textContent = Math.round(outperformanceRate);
        survivalRateSpan.textContent = Math.round(survivalRate);
        outperformanceRateSpan.textContent = Math.round(outperformanceRate);
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
        'loan-period-assumptions': DEFAULT_INPUTS.LOAN_PERIOD
    };
    Object.entries(copy).forEach(([id, text]) => setText(id, text));

    const constantPreamble = document.getElementById('constantPreambleContent');
    const lifecyclePreamble = document.getElementById('lifecyclePreambleContent');

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
            constant: document.getElementById('constantPreamble'),
            lifecycle: document.getElementById('lifecyclePreamble')
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
    
    // Initialize LTV slider with correct starting value
    document.getElementById('ltvSlider').value = DEFAULT_INPUTS.STARTING_LTV;
    document.getElementById('ltvDisplay').innerText = DEFAULT_INPUTS.STARTING_LTV;
    
    // Calculate and set initial loan amount
    const initialLoanAmount = (DEFAULT_INPUTS.STARTING_DEPOSIT * DEFAULT_INPUTS.STARTING_LTV / 100).toFixed(0);
    document.getElementById('loanAmount').value = initialLoanAmount;
    
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

    return Plotly.newPlot('histogramChart', [
        {
            x: benchmark.finalWealthArray,
            type: 'histogram',
            histnorm: 'probability',
            name: 'DCA Benchmark',
            opacity: 0.55,
            marker: { color: UI_CONSTANTS.HISTOGRAM_COLORS.benchmark }
        },
        {
            x: strategy.finalWealthArray,
            type: 'histogram',
            histnorm: 'probability',
            name: `Target LTV ${((strategy.targetLTV || 0) * 100).toFixed(0)}%`,
            opacity: 0.65,
            marker: { color: UI_CONSTANTS.HISTOGRAM_COLORS.overperformed }
        }
    ], {
        title: `Final Real Wealth (Strategy ${strategyIndex + 1})`,
        barmode: 'overlay',
        xaxis: { title: 'Final Real Wealth (Today\'s Purchasing Power)', tickformat: '$,.0f' },
        yaxis: { title: 'Probability', tickformat: '.0%' },
        margin: { t: 64, b: 72, l: 72, r: 24 },
        autosize: true
    }, { responsive: true, displaylogo: false });
}

