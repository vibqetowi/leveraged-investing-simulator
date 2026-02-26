// Global state
let currentMode = 'standard';
let riskTarget = UI_CONSTANTS.DEFAULT_RISK_PROFILES.median; // Default to median
let simulationResults = null; // Store last simulation results for slider interaction
let amortizationStrategyIndex = null; // Index of strategy closest to amortization payment

/**
 * Risk Profile Management
 */
function setRiskProfile(profile) {
    if (profile === 'aggressive') {
        riskTarget = UI_CONSTANTS.DEFAULT_RISK_PROFILES.aggressive;
    } else if (profile === 'median') {
        riskTarget = UI_CONSTANTS.DEFAULT_RISK_PROFILES.median;
    } else if (profile === 'conservative') {
        riskTarget = UI_CONSTANTS.DEFAULT_RISK_PROFILES.conservative;
    }
    
    document.getElementById('riskAggressive').classList.remove('risk-btn-active');
    document.getElementById('riskMedian').classList.remove('risk-btn-active');
    document.getElementById('riskConservative').classList.remove('risk-btn-active');
    
    if (profile === 'aggressive') {
        document.getElementById('riskAggressive').classList.add('risk-btn-active');
    } else if (profile === 'median') {
        document.getElementById('riskMedian').classList.add('risk-btn-active');
    } else if (profile === 'conservative') {
        document.getElementById('riskConservative').classList.add('risk-btn-active');
    }
}

/**
 * Mode Management (Standard vs Custom)
 */
function setMode(mode) {
    currentMode = mode;
    const isStandard = mode === 'standard';
    document.getElementById('standardMode').className = isStandard ? 'btn-active' : 'btn-inactive';
    document.getElementById('customMode').className = isStandard ? 'btn-inactive' : 'btn-active';
    
    document.getElementById('modeDescription').innerHTML = isStandard 
        ? CopywritingHelpers.getModeStandardDescription() 
        : CopywritingHelpers.getModeCustomDescription();
    
    const inputs = ['growth', 'vol', 'marginCall'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.disabled = isStandard;
    });
    
    // Interest rate is always visible, just readonly in Standard Mode
    const interestRateInput = document.getElementById('interestRate');
    if (interestRateInput) {
        interestRateInput.readOnly = isStandard;
        interestRateInput.style.backgroundColor = isStandard ? '#f5f5f5' : '';
        interestRateInput.style.cursor = isStandard ? 'not-allowed' : '';
    }

    // Inflation rate is always visible, just readonly in Standard Mode
    const inflationRateInput = document.getElementById('inflationRate');
    if (inflationRateInput) {
        inflationRateInput.readOnly = isStandard;
        inflationRateInput.style.backgroundColor = isStandard ? '#f5f5f5' : '';
        inflationRateInput.style.cursor = isStandard ? 'not-allowed' : '';
    }
    
    // Payment type is always visible in both modes
    const paymentTypeGroup = document.getElementById('paymentTypeGroup');
    if (paymentTypeGroup) {
        paymentTypeGroup.style.display = 'flex';
    }
    
    // Show LTV slider and loan amount in both modes
    document.getElementById('ltvSliderGroup').style.display = 'flex';
    document.getElementById('loanAmountGroup').style.display = 'flex';
    
    // Configure LTV slider and loan amount based on mode
    const ltvSlider = document.getElementById('ltvSlider');
    const loanAmountInput = document.getElementById('loanAmount');
    
    if (isStandard) {
        // Standard Mode: slider max 35%, loan amount readonly, slider enabled to move
        ltvSlider.max = 35;
        ltvSlider.disabled = false;
        loanAmountInput.readOnly = true;
        loanAmountInput.style.backgroundColor = '#f5f5f5';
        loanAmountInput.style.cursor = 'not-allowed';
        
        // Lock standard mode parameters
        document.getElementById('interestRate').value = STANDARD_MODE_DEFAULTS.INTEREST_RATE;
        document.getElementById('growth').value = STANDARD_MODE_DEFAULTS.GROWTH_RATE;
        document.getElementById('vol').value = STANDARD_MODE_DEFAULTS.VOLATILITY;
        document.getElementById('marginCall').value = STANDARD_MODE_DEFAULTS.MARGIN_CALL_LTV;
        document.getElementById('inflationRate').value = STANDARD_MODE_DEFAULTS.INFLATION_RATE;
        
        // Set payment type to standard
        document.getElementById('paymentType').value = 'standard';
        
        // Cap LTV at 35% if it was higher in custom mode
        let currentLtv = parseFloat(ltvSlider.value);
        if (currentLtv > STANDARD_MODE_DEFAULTS.MAX_LTV) {
            currentLtv = STANDARD_MODE_DEFAULTS.MAX_LTV;
            ltvSlider.value = currentLtv;
            document.getElementById('ltvDisplay').innerText = currentLtv;
        }
        
        // Reset slider color in standard mode
        ltvSlider.style.accentColor = '';
        
        // Calculate loan amount from LTV and collateral
        updateLoanFromSlider();
        
        // Calculate min payment from budget
        updateStandardModeFromBudget();
        
        // Clear LTV warning in standard mode
        document.getElementById('ltvWarning').style.display = 'none';
    } else {
        // Custom Mode: slider max 100%, loan amount editable
        ltvSlider.max = 100;
        ltvSlider.disabled = false;
        loanAmountInput.readOnly = false;
        loanAmountInput.style.backgroundColor = '';
        loanAmountInput.style.cursor = '';
        
        document.getElementById('minPayment').value = 0;
        
        // Update budget warning for custom mode
        updateBudgetWarningCustom();
        
        // Check and show LTV warnings if applicable
        validateAndColorLTV();
    }

    updatePaymentType();
    syncMinPayment();
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
    
    if (ltv >= 100) {
        // Red slider and warning for over 100% LTV
        ltvSlider.style.accentColor = '#C62828';
        ltvWarning.style.display = 'block';
        ltvWarning.style.background = '#ffebee';
        ltvWarning.style.borderLeftColor = '#C62828';
        ltvWarningIcon.textContent = '🚨';
        ltvWarningText.textContent = 'Loan amount exceeds 100% of collateral. This is extremely risky and may trigger forced liquidation.';
    } else if (ltv >= 35) {
        // Yellow slider and warning for 35%+ LTV
        ltvSlider.style.accentColor = '#ff9800';
        ltvWarning.style.display = 'block';
        ltvWarning.style.background = '#fff3cd';
        ltvWarning.style.borderLeftColor = '#ff9800';
        ltvWarningIcon.textContent = '⚠️';
        ltvWarningText.textContent = 'Loan-to-Value ratio exceeds 35%. Standard mode caps at 35% to match historical best practices.';
    } else {
        // Purple slider (default) and no warning
        ltvSlider.style.accentColor = '#9C27B0';
        ltvWarning.style.display = 'none';
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
    
    // Update min payment based on new loan amount
    if (currentMode === 'standard') {
        updateStandardModeFromBudget();
    } else {
        updateBudgetWarningCustom();
    }
    
    syncMinPayment();
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
    
    // Update min payment based on new loan amount
    if (currentMode === 'standard') {
        updateStandardModeFromBudget();
    } else {
        updateBudgetWarningCustom();
    }
    
    syncMinPayment();
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
    
    // Update min payment based on new loan amount
    if (currentMode === 'standard') {
        updateStandardModeFromBudget();
    } else {
        updateBudgetWarningCustom();
    }
    
    syncMinPayment();
}

/**
 * Update min payment based on monthly budget (Standard Mode)
 */
function updateStandardModeFromBudget() {
    if (currentMode !== 'standard') return;
    
    const monthlyBudget = parseFloat(document.getElementById('monthlyBudget').value);
    const loan = parseFloat(document.getElementById('loanAmount').value);
    const annualRate = STANDARD_MODE_DEFAULTS.INTEREST_RATE / 100;
    const years = parseFloat(document.getElementById('loanPeriod').value);
    const months = years * 12;
    const mRate = annualRate / 12;
    
    // Calculate amortized payment
    const amortizedPayment = loan * (mRate * Math.pow(1 + mRate, months)) / (Math.pow(1 + mRate, months) - 1);
    
    // Recalculate min payment based on current payment type
    syncMinPayment();
    
    // Show budget warning if needed
    const warningDiv = document.getElementById('budgetWarning');
    const warningText = document.getElementById('budgetWarningText');
    
    if (amortizedPayment > monthlyBudget) {
        warningDiv.style.display = 'block';
        warningText.textContent = CopywritingHelpers.getPaymentWarningText(monthlyBudget, amortizedPayment, years);
    } else {
        warningDiv.style.display = 'none';
    }
}

/**
 * Update budget warning in Custom Mode
 */
function updateBudgetWarningCustom() {
    if (currentMode !== 'custom') return;
    
    const monthlyBudget = parseFloat(document.getElementById('monthlyBudget').value);
    const loan = parseFloat(document.getElementById('loanAmount').value);
    const annualRate = parseFloat(document.getElementById('interestRate').value) / 100;
    const years = parseFloat(document.getElementById('loanPeriod').value);
    const months = years * 12;
    const mRate = annualRate / 12;
    
    // Calculate amortized payment
    const amortizedPayment = loan * (mRate * Math.pow(1 + mRate, months)) / (Math.pow(1 + mRate, months) - 1);
    
    // Always show warning if amortized payment exceeds budget
    const warningDiv = document.getElementById('budgetWarning');
    const warningText = document.getElementById('budgetWarningText');
    
    if (amortizedPayment > monthlyBudget) {
        warningDiv.style.display = 'block';
        warningText.textContent = CopywritingHelpers.getPaymentWarningText(monthlyBudget, amortizedPayment, years);
    } else {
        warningDiv.style.display = 'none';
    }
}

/**
 * Handle interest rate changes and recalculate payments
 */
function handleInterestRateChange() {
    // Recalculate minimum payment based on payment type
    syncMinPayment();
    
    // Update budget warnings based on mode
    if (currentMode === 'standard') {
        updateStandardModeFromBudget();
    } else {
        updateBudgetWarningCustom();
    }
}

/**
 * Handle budget or period changes
 */
function handleBudgetOrPeriodChange() {
    if (currentMode === 'standard') {
        updateStandardModeFromBudget();
    } else {
        updateBudgetWarningCustom();
    }
}

/**
 * Sync Minimum Payment
 */
function syncMinPayment() {
    const paymentType = document.getElementById('paymentType').value;
    const loan = parseFloat(document.getElementById('loanAmount').value);
    const annualRate = parseFloat(document.getElementById('interestRate').value) / 100;
    const years = parseFloat(document.getElementById('loanPeriod').value);
    const months = years * 12;
    const mRate = annualRate / 12;
    const monthlyInterest = loan * (annualRate / 12);
    const amortizedPayment = loan * (mRate * Math.pow(1 + mRate, months)) / (Math.pow(1 + mRate, months) - 1);
    
    if (paymentType === 'interest') {
        document.getElementById('minPayment').value = monthlyInterest.toFixed(2);
    } else if (paymentType === 'standard') {
        const standardPayment = amortizedPayment * (STANDARD_MODE_DEFAULTS.PAYMENT_PERCENTAGE / 100);
        document.getElementById('minPayment').value = standardPayment.toFixed(2);
    }
}

/**
 * Update Payment Type
 */
function updatePaymentType() {
    const paymentType = document.getElementById('paymentType').value;
    const loan = parseFloat(document.getElementById('loanAmount').value);
    const annualRate = parseFloat(document.getElementById('interestRate').value) / 100;
    const years = parseFloat(document.getElementById('loanPeriod').value);
    const months = years * 12;
    const mRate = annualRate / 12;
    const monthlyInterest = loan * (annualRate / 12);
    const amortizedPayment = loan * (mRate * Math.pow(1 + mRate, months)) / (Math.pow(1 + mRate, months) - 1);
    
    if (paymentType === 'interest') {
        document.getElementById('minPayment').value = monthlyInterest.toFixed(2);
        document.getElementById('minPayment').disabled = true;
    } else if (paymentType === 'standard') {
        // Calculate PAYMENT_PERCENTAGE of amortized payment
        const standardPayment = amortizedPayment * (STANDARD_MODE_DEFAULTS.PAYMENT_PERCENTAGE / 100);
        document.getElementById('minPayment').value = standardPayment.toFixed(2);
        document.getElementById('minPayment').disabled = true;
    } else {
        // custom - default to 0
        if (currentMode !== 'standard') {
            document.getElementById('minPayment').value = 0;
        }
        document.getElementById('minPayment').disabled = false;
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
        const results = await runSimulationWithAdapter();
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


/**
 * Find Target Strategy Index based on Risk Target
 * Chooses the closest survival rate at or above the target,
 * or the max payment strategy if none are safe.
 * Only considers leveraged strategies (indices 0-9).
 */
function findTargetStrategyIndex(targetSurvival) {
    if (!simulationResults) return 0;
    
    const strategies = simulationResults.strategies;
    // Only consider leveraged strategies (0-9), not the baseline strategy (10)
    const leveragedStrategies = strategies.slice(0, 10);
    
    const safeStrategies = leveragedStrategies
        .map((strategy, index) => ({ strategy, index }))
        .filter(({ strategy }) => strategy.survivalRate >= targetSurvival);

    if (safeStrategies.length === 0) {
        // Return the most conservative leveraged strategy (index 9)
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
function renderHistogram(strategyIndex) {
    console.log('[Histogram] renderHistogram called with index:', strategyIndex);
    
    if (!simulationResults) {
        console.error('[Histogram] No simulationResults available from integration layer');
        document.getElementById('histogramChart').innerHTML = '<p style="text-align:center;color:red;">Error: No simulation results from integration layer</p>';
        return;
    }
    
    const strategy = simulationResults.strategies[strategyIndex];
    const wealthData = strategy.finalWealthArray;
    const benchmarkData = strategy.benchmarkWealthArray;
    const initialEquity = simulationResults.loanDetails.initialEquity;
    
    if (!wealthData || !benchmarkData) {
        console.error('[Histogram] Integration layer did not provide complete wealth arrays');
        document.getElementById('histogramChart').innerHTML = '<p style="text-align:center;color:red;">Error: Integration layer did not provide complete data</p>';
        return;
    }
    
    if (wealthData.length === 0 || benchmarkData.length === 0) {
        console.warn('[Histogram] Empty data arrays - all simulations resulted in ruin');
        document.getElementById('histogramChart').innerHTML = '<p style="text-align:center;color:var(--md-error);">No data available - all simulations resulted in ruin.</p>';
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
function detectInvestingMode(strategy, loanDetails) {
    const paymentAmount = strategy.paymentAmount;
    const loanAmount = loanDetails.loanAmount;
    const monthlyInterest = loanAmount * (loanDetails.interestRate / 12);
    const initialEquity = loanDetails.initialEquity;
    const ltv = (loanAmount / (loanAmount + initialEquity)) * 100;
    
    // Margin indicators: interest-only payments, high LTV, minimal principal paydown
    const isInterestOnly = Math.abs(paymentAmount - monthlyInterest) < (monthlyInterest * 0.1);
    const isHighLTV = ltv > 40;
    const isMinimalPayment = paymentAmount < (loanAmount * 0.005); // Less than 0.5% of loan per month
    
    if ((isInterestOnly || isMinimalPayment) && isHighLTV) {
        return 'margin';
    }
    
    return 'lifecycle';
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
    const monthlyBudget = loanDetails.monthlyBudget;
    const debtPayment = strategy.paymentAmount;
    const marketInvestment = strategy.surplusAmount;
    const medianRealWealth = strategy.medianWealth;
    const survivalRate = strategy.survivalRate;
    const benchmarkMedian = strategy.benchmarkMedian;
    const delta = medianRealWealth - benchmarkMedian;
    const spreadPercent = trinaryStats.profitPercent - trinaryStats.suckerPercent;

    // Get narrative text from copywriting helpers
    const narrative = CopywritingHelpers.getStrategySummaryNarrative(monthlyBudget, debtPayment, marketInvestment, survivalRate, medianRealWealth, benchmarkMedian, delta);

    // Build the summary HTML based on mode
    let summaryHTML = '';
    
    if (mode === 'lifecycle') {
        // RISK-SHIFTING: Educational content about risk-shifting
        summaryHTML = `
        <!-- RISK-SHIFTING ANALYSIS -->
        <div style="background: #E3F2FD; border: 3px solid #2196F3; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565C0;">📊 Risk-Shifting (Risk-Shifting)</h3>
            <p style="color: #333;">
                This strategy borrows once, invests immediately, pays back over time. The goal: shift market exposure across your lifetime instead of concentrating it when you're older.
            </p>
        </div>
        
        <!-- OUTCOME ZONES GRID -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px;">
            <div style="background: #ffebee; border-left: 4px solid #B3261E; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #B3261E;">${trinaryStats.ruinPercent.toFixed(1)}%</div>
                <div style="font-size: 0.9rem; color: #666; font-weight: 600;">RUIN</div>
                <div style="font-size: 0.75rem; color: #999;">Loss/Liquidation</div>
            </div>
            <div style="background: #fff3e0; border-left: 4px solid #FF9800; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #FF9800;">${trinaryStats.suckerPercent.toFixed(1)}%</div>
                <div style="font-size: 0.9rem; color: #666; font-weight: 600;">SUCKER</div>
                <div style="font-size: 0.75rem; color: #999;">Underperform DCA</div>
            </div>
            <div style="background: #e8f5e9; border-left: 4px solid #1B5E20; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #1B5E20;">${trinaryStats.profitPercent.toFixed(1)}%</div>
                <div style="font-size: 0.9rem; color: #666; font-weight: 600;">PROFIT</div>
                <div style="font-size: 0.75rem; color: #999;">Outperform DCA</div>
            </div>
        </div>

        <p style="margin-top: 20px;">${narrative.allocation}</p>
        <p>${narrative.paymentBreakdown}</p>
        <p>${narrative.outcomes}</p>
        <p><strong>${narrative.baseline}</strong></p>
        <p><strong>${narrative.leverageImpact}</strong></p>
        
        <hr style="margin-top: 20px; margin-bottom: 20px; border: none; border-top: 1px solid #E0E0E0;">
        
        <!-- RISK-SHIFTING GUIDANCE -->
        <div style="margin-top: 24px; background: #E8F5E9; padding: 16px; border-radius: 4px; border-left: 4px solid #1B5E20;">
            <h4 style="margin-top: 0; color: #1B5E20;">Evaluating Risk-Shifting</h4>
            <p style="font-size: 0.9rem; line-height: 1.6;">
                <strong>Risk-Shifting Spread:</strong> Profit ${trinaryStats.profitPercent.toFixed(1)}% vs Sucker ${trinaryStats.suckerPercent.toFixed(1)}% = <strong>${spreadPercent.toFixed(1)}%</strong> spread. 
                ${spreadPercent > 0 ? 'Positive spread indicates leverage shifts market exposure forward successfully.' : 'Negative spread indicates DCA outperforms leveraged deployment.'}
            </p>
            <p style="font-size: 0.9rem; line-height: 1.6;">
                <strong>Liquidation Risk:</strong> ${trinaryStats.ruinPercent.toFixed(1)}% probability. 
                ${trinaryStats.ruinPercent < 2 ? 'Within acceptable range (target < 2%).' : 'Exceeds acceptable threshold. Reduce loan amount or increase payments.'}
            </p>
            <p style="font-size: 0.9rem; line-height: 1.6;">
                <strong>Time Advantage:</strong> Check the "Deposits Over Time" chart below. The gap between DCA (blue) and leveraged deposits (purple) shows the time advantage leverage provides. When DCA catches up, it has deployed the same capital but over a longer period.
            </p>
            <p style="font-size: 0.9rem; line-height: 1.6; margin-top: 12px; padding: 12px; background: #FFF3E0; border-radius: 4px;">
                <strong>⚠️ Advisory Required:</strong> Risk-Shifting involves tax implications, sequence-of-returns risk, and personal circumstances this simulator cannot model. Consult licensed financial advisors before implementation.
            </p>
        </div>
        `;
    } else {
        // MARGIN: Show verdict and recommendations
        summaryHTML = `

        <!-- MARGIN STRATEGY HEADER -->
        <div style="background: #FFF3E0; border: 3px solid #FF9800; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #F57F17;">📈 Margin Strategy (Return Amplification)</h3>
            <p style="color: #333;">
                This strategy maintains leverage continuously to amplify returns. Higher risk, higher potential reward.
            </p>
        </div>
        
        <!-- VERDICT CONTAINER (Traffic Light) -->
        <div style="background: ${verdict.color}; border: 3px solid ${verdict.color}; border-radius: 8px; padding: 20px; margin: 20px 0; color: white;">
            <h3 style="margin-top: 0; color: white;">${verdict.icon} ${verdict.title}</h3>
            <p>${verdict.message}</p>
        </div>
        
        <!-- OUTCOME ZONES GRID -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px;">
            <div style="background: #ffebee; border-left: 4px solid #B3261E; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #B3261E;">${trinaryStats.ruinPercent.toFixed(1)}%</div>
                <div style="font-size: 0.9rem; color: #666; font-weight: 600;">RUIN</div>
                <div style="font-size: 0.75rem; color: #999;">Loss/Liquidation</div>
            </div>
            <div style="background: #fff3e0; border-left: 4px solid #FF9800; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #FF9800;">${trinaryStats.suckerPercent.toFixed(1)}%</div>
                <div style="font-size: 0.9rem; color: #666; font-weight: 600;">SUCKER</div>
                <div style="font-size: 0.75rem; color: #999;">Underperform</div>
            </div>
            <div style="background: #e8f5e9; border-left: 4px solid #1B5E20; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #1B5E20;">${trinaryStats.profitPercent.toFixed(1)}%</div>
                <div style="font-size: 0.9rem; color: #666; font-weight: 600;">PROFIT</div>
                <div style="font-size: 0.75rem; color: #999;">Outperform</div>
            </div>
        </div>

        <p>${narrative.allocation}</p>
        <p>${narrative.paymentBreakdown}</p>
        <p>${narrative.outcomes}</p>
        <p><strong>${narrative.baseline}</strong></p>
        <p><strong>${narrative.leverageImpact}</strong></p>
        
        <hr style="margin-top: 20px; margin-bottom: 20px; border: none; border-top: 1px solid #E0E0E0;">
        
        <!-- IMPLEMENTATION SUMMARY TABLE -->
        <div style="margin-top: 24px; background: #F5F5F5; padding: 16px; border-radius: 4px; border-left: 4px solid #6200EE;">
            <h4 style="margin-top: 0; color: #212121;">Strategy Success Criteria</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                    <tr style="background: #EEEEEE;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #BDBDBD;">Outcome</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #BDBDBD;">Target Goal</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #BDBDBD;">Your Current</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #BDBDBD;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #E0E0E0;"><strong style="color: #B3261E;">${CopywritingHelpers.getSuccessCriteriaLabel('ruin')}</strong></td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #E0E0E0;">${CopywritingHelpers.getSuccessCriteriaThreshold('ruin')}</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #E0E0E0;">${trinaryStats.ruinPercent.toFixed(1)}%</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #E0E0E0;">
                            <span style="font-weight: 600; color: ${trinaryStats.ruinPercent < 2 ? '#1B5E20' : '#B3261E'};">
                                ${trinaryStats.ruinPercent < 2 ? '✓ SAFE' : '✗ HIGH RISK'}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #E0E0E0;"><strong style="color: #FF9800;">${CopywritingHelpers.getSuccessCriteriaLabel('sucker')}</strong></td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #E0E0E0;">${CopywritingHelpers.getSuccessCriteriaThreshold('sucker')}</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #E0E0E0;">${trinaryStats.suckerPercent.toFixed(1)}%</td>
                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #E0E0E0;">
                            <span style="font-weight: 600; color: ${trinaryStats.suckerPercent < trinaryStats.profitPercent ? '#1B5E20' : '#FF9800'};">
                                ${trinaryStats.suckerPercent < trinaryStats.profitPercent ? '✓ OK' : '✗ LIKELY'}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px;"><strong style="color: #1B5E20;">${CopywritingHelpers.getSuccessCriteriaLabel('profit')}</strong></td>
                        <td style="padding: 10px; text-align: center;">${CopywritingHelpers.getSuccessCriteriaThreshold('profit')}</td>
                        <td style="padding: 10px; text-align: center;">${trinaryStats.profitPercent.toFixed(1)}%</td>
                        <td style="padding: 10px; text-align: center;">
                            <span style="font-weight: 600; color: ${verdict.spread > 20 && trinaryStats.ruinPercent < 2 ? '#1B5E20' : '#FF9800'};">
                                ${verdict.spread > 20 && trinaryStats.ruinPercent < 2 ? '✓ STRONG' : 'REVIEW'}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p style="font-size: 0.75rem; color: #999; margin-top: 10px; margin-bottom: 0;">
                ${CopywritingHelpers.getSuccessCriteriaNoteText()}
            </p>
        </div>
        `;
        
        // Add diagnostic fix suggestions if available (margin mode only)
        if (verdict.fixSuggestion && verdict.fixSuggestion.length > 0) {
            const fixListHTML = verdict.fixSuggestion.map(fix => `<li style="margin: 8px 0; line-height: 1.5;">${fix}</li>`).join('');
            summaryHTML += `
            <div style="margin-top: 24px; background: #FFF8E1; border-left: 4px solid #FF9800; padding: 16px; border-radius: 4px;">
                <h4 style="margin-top: 0; color: #F57F17;">${CopywritingHelpers.getFixStrategyHeaderText()}</h4>
                <ul style="margin: 12px 0; padding-left: 20px;">
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
        hasDepositPath: !!strategy.depositPath,
        hasDebtPath: !!strategy.debtPath,
        depositPathLength: strategy.depositPath?.length,
        debtPathLength: strategy.debtPath?.length
    });
    
    // Integration layer must provide complete data
    if (!strategy.depositPath || !strategy.debtPath || !benchmark.depositPath) {
        console.error('[DepositsLineChart] Missing cash flow schedules from integration layer');
        document.getElementById('depositsLineChart').innerHTML = '<p style="color: red; text-align: center;">Error: Integration layer did not provide complete schedule data</p>';
        return;
    }
    
    const months = loanDetails.months;
    
    // Generate time points (years)
    const timePoints = [];
    for (let month = 0; month <= months; month++) {
        timePoints.push(month / 12);
    }
    
    // Calculate cumulative deposits - depositPath now includes T=0 initial capital at index 0
    const nonLeverageDeposits = [];
    const leverageDeposits = [];
    const debtBalance = [];
    
    let nonLeverageSum = 0;
    let leverageSum = 0;
    
    for (let month = 0; month <= months; month++) {
        // depositPath[0] = initial capital at T=0
        // depositPath[1..months] = monthly contributions
        // Cumulative at month M = sum of depositPath[0..M]
        if (month < benchmark.depositPath.length) {
            nonLeverageSum += benchmark.depositPath[month] || 0;
        }
        if (month < strategy.depositPath.length) {
            leverageSum += strategy.depositPath[month] || 0;
        }
        
        nonLeverageDeposits.push(nonLeverageSum);
        leverageDeposits.push(leverageSum);
        
        // Debt balance: debtPath[month] is debt at end of month
        const debtAtMonth = month < strategy.debtPath.length ? strategy.debtPath[month] : 0;
        debtBalance.push(debtAtMonth);
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
        name: 'Total Deposits (No Leverage)',
        line: {
            color: '#2196F3',  // Blue
            width: 3
        },
        hovertemplate: '<b>No Leverage</b><br>Time: %{x:.1f} years<br>Total Deposits: $%{y:,.0f}<extra></extra>'
    };
    
    const leverageTrace = {
        x: timePoints,
        y: leverageDeposits,
        type: 'scatter',
        mode: 'lines',
        name: 'Total Deposits (With Leverage)',
        line: {
            color: '#9C27B0',  // Purple
            width: 3
        },
        hovertemplate: '<b>With Leverage</b><br>Time: %{x:.1f} years<br>Total Deposits: $%{y:,.0f}<extra></extra>'
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

/**
 * Display Results and Initialize Interactive Elements
 * @param {Object} results - Full results object from adapter {strategies, loanDetails, benchmark}
 */
function displayResults(results) {
    console.log('[DisplayResults] Called with results:', results);
    
    const data = results.strategies;
    const loanDetails = results.loanDetails;
    const amortizedPayment = loanDetails.amortizedPayment;
    
    // Calculate amortization details
    const totalPayments = amortizedPayment * loanDetails.months;
    const totalInterest = totalPayments - loanDetails.loanAmount;
    const presentValue = loanDetails.loanAmount;
    
    // Find strategies with target survival rate
    const safeStrategies = data.filter(d => d.survivalRate >= riskTarget);
    const summary = document.getElementById('summary');
    const targetIndex = findTargetStrategyIndex(riskTarget);
    const targetStrategy = data[targetIndex];

    if (safeStrategies.length > 0) {
        summary.innerHTML = `
            <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #E0E0E0;">
                <strong>Analysis Parameters</strong><br>
                <span style="font-size: 0.95rem; color: #757575;">Monthly Budget (Baseline): <strong>$${loanDetails.monthlyBudget.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></span><br>
                <span style="font-size: 0.95rem; color: #757575;">Loan Amount: <strong>$${presentValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></span><br>
                <span style="font-size: 0.95rem; color: #757575;">Inflation Rate: <strong>${(loanDetails.inflationRate * 100).toFixed(1)}%</strong> (All wealth values in today's dollars)</span><br><br>
                <span style="font-size: 0.85rem; color: #999;"><em>Reference: Full Amortization Payment = $${amortizedPayment.toLocaleString(undefined, {maximumFractionDigits: 0})}/month (would pay off loan completely over ${loanDetails.years} years with $${totalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})} total interest)</em></span>
            </div>
            <strong>Default Strategy Selection (Risk-Based):</strong><br><br>
            Your risk profile targets <strong>${riskTarget}% survival</strong>. The slider starts at the closest strategy that meets or exceeds this target.<br><br>
            Selected Strategy: <strong>$${targetStrategy.paymentAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong> per month
            with <strong>${targetStrategy.survivalRate.toFixed(1)}%</strong> survival.<br><br>
            <em style="font-size: 0.9rem;">Use the slider below to explore different payment strategies from minimum required to your full monthly budget.</em>
        `;
    } else {
        summary.innerHTML = `
            <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #E0E0E0;">
                <strong>Analysis Parameters</strong><br>
                <span style="font-size: 0.95rem; color: #757575;">Monthly Budget (Baseline): <strong>$${loanDetails.monthlyBudget.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></span><br>
                <span style="font-size: 0.95rem; color: #757575;">Loan Amount: <strong>$${presentValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></span><br>
                <span style="font-size: 0.95rem; color: #757575;">Inflation Rate: <strong>${(loanDetails.inflationRate * 100).toFixed(1)}%</strong> (All wealth values in today's dollars)</span><br><br>
                <span style="font-size: 0.85rem; color: #999;"><em>Reference: Full Amortization Payment = $${amortizedPayment.toLocaleString(undefined, {maximumFractionDigits: 0})}/month (would pay off loan completely over ${loanDetails.years} years with $${totalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})} total interest)</em></span>
            </div>
            <strong>⚠️ High Risk:</strong> No strategies meet the ${riskTarget}% survival target. The slider starts at the maximum payment strategy to maximize safety.
        `;
    }


    // Find target strategy index based on risk target
    const slider = document.getElementById('strategySlider');
    slider.value = targetIndex;

    updateSliderPills(targetIndex);
    updateSummary(targetIndex);
    
    // Show results div FIRST so Plotly can calculate proper dimensions
    document.getElementById('results').style.display = 'block';
    
    // Then render histogram with proper sizing
    console.log('[DisplayResults] Rendering histogram for strategy index:', targetIndex);
    renderHistogram(targetIndex);
    
    // Render deposits over time line chart
    console.log('[DisplayResults] Rendering deposits line chart for strategy index:', targetIndex);
    renderDepositsLineChart(targetIndex);
}

/**
 * Handle Slider Input Event
 */
function handleSliderChange(event) {
    const strategyIndex = parseInt(event.target.value);
    updateSliderPills(strategyIndex);
    renderHistogram(strategyIndex);
    renderDepositsLineChart(strategyIndex);
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
    
    const amortizedPayment = simulationResults.loanDetails.amortizedPayment;
    const monthlyBudget = simulationResults.loanDetails.monthlyBudget;
    const selectedStrategy = simulationResults.strategies[activeIndex];
    
    if (!selectedStrategy) return;
    
    // Update payment reference information
    const selectedPaymentAmountSpan = document.getElementById('selectedPaymentAmount');
    const paymentPercentAmortizationSpan = document.getElementById('paymentPercentAmortization');
    const paymentPercentBudgetSpan = document.getElementById('paymentPercentBudget');
    
    if (selectedPaymentAmountSpan && paymentPercentAmortizationSpan && paymentPercentBudgetSpan) {
        selectedPaymentAmountSpan.textContent = `$${Math.round(selectedStrategy.paymentAmount).toLocaleString()}`;
        
        const percentOfAmortization = (selectedStrategy.paymentAmount / amortizedPayment) * 100;
        const percentOfBudget = (selectedStrategy.paymentAmount / monthlyBudget) * 100;
        
        paymentPercentAmortizationSpan.textContent = Math.round(percentOfAmortization);
        paymentPercentBudgetSpan.textContent = Math.round(percentOfBudget);
    }
}

/**
 * Input Validation
 */
function validateInputs() {
    const inputs = ['loanAmount', 'loanPeriod', 'assetValue', 'minPayment', 'monthlyBudget', 'interestRate', 'growth', 'vol', 'marginCall', 'inflationRate'];
    
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
    // Initialize input values from config
    document.getElementById('loanPeriod').value = DEFAULT_INPUTS.LOAN_PERIOD;
    document.getElementById('monthlyBudget').value = DEFAULT_INPUTS.MONTHLY_BUDGET;
    document.getElementById('assetValue').value = DEFAULT_INPUTS.COLLATERAL_VALUE;
    
    // Initialize LTV slider with correct starting value
    document.getElementById('ltvSlider').value = DEFAULT_INPUTS.STARTING_LTV;
    document.getElementById('ltvDisplay').innerText = DEFAULT_INPUTS.STARTING_LTV;
    
    // Calculate and set initial loan amount
    const initialLoanAmount = (DEFAULT_INPUTS.COLLATERAL_VALUE * DEFAULT_INPUTS.STARTING_LTV / 100).toFixed(0);
    document.getElementById('loanAmount').value = initialLoanAmount;
    
    // Set initial mode to standard
    setMode('standard');
    
    // Attach slider event listener
    const slider = document.getElementById('strategySlider');
    if (slider) {
        slider.addEventListener('input', handleSliderChange);
    }
});
