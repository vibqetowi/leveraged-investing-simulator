/**
 * this creates one worker per required strategy and configures them with the proper inputs

/**
 * Extract UI inputs in format expected by both old and new simulation engines
 */
function getSimulationInputs() {
    const loan = parseFloat(document.getElementById('loanAmount').value);
    const assetInput = parseFloat(document.getElementById('assetValue').value);
    const years = parseFloat(document.getElementById('loanPeriod').value);
    const paymentTypeSelect = document.getElementById('paymentType').value;
    const monthlyBudget = parseFloat(document.getElementById('monthlyBudget').value);
    
    const initialEquity = assetInput;
    
    const annualRate = parseFloat(document.getElementById('interestRate').value) / 100;
    const g = parseFloat(document.getElementById('growth').value) / 100;
    const vol = parseFloat(document.getElementById('vol').value) / 100;
    const marginCallLTV = parseFloat(document.getElementById('marginCall').value) / 100;
    const inflationRate = parseFloat(document.getElementById('inflationRate').value) / 100;
    
    const months = years * 12;
    const mRate = annualRate / 12;
    
    // Calculate amortized payment
    const amortizedPayment = loan * (mRate * Math.pow(1 + mRate, months)) / 
                            (Math.pow(1 + mRate, months) - 1);
    const monthlyInterest = loan * mRate;
    
    // Determine minimum payment based on payment type
    let minRequired = parseFloat(document.getElementById('minPayment').value);
    let minPayment;
    
    if (paymentTypeSelect === 'interest') {
        minPayment = monthlyInterest;
    } else {
        minPayment = minRequired;
    }
    
    return {
        // Core simulation parameters
        loanAmount: loan,
        interestRate: annualRate,
        volatility: vol,
        growth: g,
        inflation: inflationRate,
        monthlyBudget: monthlyBudget,
        minPayment: minPayment,
        maxPayment: monthlyBudget, // Now uses full budget as max
        simulationCount: UI_CONSTANTS.SIMULATION_COUNT,
        baselineSimulationCount: UI_CONSTANTS.BASE_CASE_SIMULATIONS,
        numStrategies: UI_CONSTANTS.NUM_STRATEGIES - 1, // Number of leveraged strategies (excluding benchmark)
        years: years,
        marginCallLTV: marginCallLTV,
        initialEquity: initialEquity,
        
        // Additional metadata for UI
        amortizedPayment: amortizedPayment,
        months: months,
        paymentType: paymentTypeSelect
    };
}

/**
 * Schedule Generator - Pre-calculate deterministic debt and deposit paths
 * Returns arrays of length `months+1` representing the cashflow schedule:
 * - Index 0: T=0 (initial state)
 * - Indices 1 to months: T=1 to T=months (monthly values)
 */
/**
 * Check if WebAssembly is supported
 */
function isWasmAvailable() {
    return typeof WebAssembly !== 'undefined';
}

/**
 * Run simulation using 21 separate Worker instances
 * Each worker processes one strategy independently
 */
async function runSimulationWithAdapter() {
    console.log('[Integration] Starting simulation with 21 workers...');
    
    if (!validateInputs()) {
        console.error('[Integration] Validation failed');
        return null;
    }
    
    const uiInputs = getSimulationInputs();
    console.log('[Integration] Inputs collected:', uiInputs);
    
    try {
        if (!isWasmAvailable()) {
            console.warn('[Integration] WebAssembly not available');
            return runSimulationJS(uiInputs);
        }
        
        // Create worker inputs for each strategy
        const strategyInputs = [];
        for (let i = 0; i < 21; i++) {
            const isBenchmark = i === 0;
            let initialDebt, initialBalance, monthlyPayment;

            initialDebt = isBenchmark ? 0 : uiInputs.loanAmount;
            initialBalance = uiInputs.initialEquity + initialDebt;
            monthlyPayment = 0;

            if (!isBenchmark) {
                // Interpolate payment
                const leverageIndex = i - 1;
                const ratio = (leverageIndex + 1) / 20;
                monthlyPayment = uiInputs.minPayment + (uiInputs.maxPayment - uiInputs.minPayment) * ratio;
            }
            
            strategyInputs.push({
                initialDebt: initialDebt,
                initialBalance: initialBalance,
                monthlyPayment: monthlyPayment,
                monthlyBudget: uiInputs.monthlyBudget,
                monthlyRate: uiInputs.interestRate / 12.0,
                years: uiInputs.years,
                volatility: uiInputs.volatility,
                growth: uiInputs.growth,
                inflation: uiInputs.inflation,
                marginCallLTV: uiInputs.marginCallLTV,
                simulationCount: isBenchmark ? uiInputs.baselineSimulationCount : uiInputs.simulationCount,
                paymentAmount: monthlyPayment,
                surplusAmount: uiInputs.monthlyBudget - monthlyPayment
            });
        }
        
        // Create and send to 21 workers
        console.log('[Integration] Creating 21 workers...');
        const workers = [];
        const promises = [];
        
        for (let i = 0; i < 21; i++) {
            const worker = new Worker('scripts/simulationWorker.js', { 
                name: `strategy-${i}` 
            });
            workers.push(worker);
            
            const promise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Strategy ${i} worker timeout`));
                }, 600000); // 10 minute timeout
                
                worker.onmessage = (e) => {
                    clearTimeout(timeout);
                    if (e.data.success) {
                        resolve({ rawResults: e.data.rawResults, strategyIndex: i, computeTime: e.data.computeTime });
                    } else {
                        const errorMsg = e.data.error || 'Unknown error from worker';
                        console.error(`[Integration] Worker ${i} returned error: ${errorMsg}`);
                        reject(new Error(`Strategy ${i}: ${errorMsg}`));
                    }
                    worker.terminate();
                };
                
                worker.onerror = (error) => {
                    clearTimeout(timeout);
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error(`[Integration] Worker ${i} error event:`, errorMsg);
                    reject(new Error(`Strategy ${i} worker error: ${errorMsg}`));
                    worker.terminate();
                };
                
                // Send strategy inputs to worker
                console.log(`[Integration] Posting message to worker ${i}`);
                worker.postMessage({
                    id: i,
                    inputs: strategyInputs[i],
                    strategyIndex: i
                });
            });
            
            promises.push(promise);
        }
        
        console.log('[Integration] Waiting for all 21 workers...');
        const startTime = performance.now();
        try {
            const results = await Promise.all(promises);
            const endTime = performance.now();
            
            console.log(`[Integration] All workers completed in ${(endTime - startTime).toFixed(2)}ms`);
            
            // Aggregate results
            return aggregateWorkerResults(results, uiInputs, endTime - startTime);
        } catch (promiseError) {
            console.error('[Integration] Promise.all() failed:', promiseError);
            throw promiseError;
        }
        
    } catch (error) {
        console.error('[Integration] Simulation failed:', error);
        alert(CopywritingHelpers.getSimulationErrorMessage(error.message));
        return null;
    }
}

/**
 * Aggregate results from all 21 worker instances
 */
function aggregateWorkerResults(workerResults, uiInputs, totalTime) {
    const aggregated = {
        benchmark: null,
        strategies: [],
        loanDetails: {
            loanAmount: uiInputs.loanAmount,
            initialEquity: uiInputs.initialEquity,
            months: uiInputs.years * 12,
            amortizedPayment: uiInputs.amortizedPayment,
            monthlyBudget: uiInputs.monthlyBudget,
            interestRate: uiInputs.interestRate,
            inflationRate: uiInputs.inflation,
            years: uiInputs.years
        },
        schedules: [],
        computeTime: totalTime
    };
    
    // Sort results by strategy index
    workerResults.sort((a, b) => a.strategyIndex - b.strategyIndex);
    
    for (const result of workerResults) {
        const strategyIndex = result.strategyIndex;
        const rawBuffer = result.rawResults;
        const isBenchmark = strategyIndex === 0;
        
        // Unmarshal results
        const strategyData = unmarshalStrategyResults(rawBuffer);
        
        // Add payment info
        if (isBenchmark) {
            strategyData.paymentAmount = 0;
            strategyData.surplusAmount = uiInputs.monthlyBudget;
        } else {
            const leverageIndex = strategyIndex - 1;
            const ratio = (leverageIndex + 1) / 20;
            strategyData.paymentAmount = uiInputs.minPayment + (uiInputs.maxPayment - uiInputs.minPayment) * ratio;
            strategyData.surplusAmount = uiInputs.monthlyBudget - strategyData.paymentAmount;
        }
        
        if (isBenchmark) {
            aggregated.benchmark = strategyData;
        } else {
            aggregated.strategies.push(strategyData);
        }
        
        aggregated.schedules.push({
            strategyIndex: strategyIndex,
            isBenchmark: isBenchmark,
            depositPath: strategyData.depositPath,
            debtPath: strategyData.debtPath
        });
    }
    
    // Post-process
    if (aggregated.benchmark && aggregated.benchmark.expectedWealth > 0) {
        for (let i = 0; i < aggregated.strategies.length; i++) {
            const strategy = aggregated.strategies[i];
            strategy.benchmarkPercentDiff = 
                ((strategy.expectedWealth - aggregated.benchmark.expectedWealth) / 
                 aggregated.benchmark.expectedWealth) * 100.0;
            strategy.amortizedPayment = uiInputs.amortizedPayment;
            strategy.paymentPercent = (strategy.paymentAmount / uiInputs.maxPayment) * 100.0;
            strategy.benchmarkWealthArray = aggregated.benchmark.finalWealthArray;
            strategy.benchmarkMedian = aggregated.benchmark.medianWealth;
            strategy.benchmarkExpected = aggregated.benchmark.expectedWealth;
            strategy.benchmarkSigma = calculateStdDev(aggregated.benchmark.finalWealthArray, aggregated.benchmark.expectedWealth);
            
            // Calculate trinary stats (Ruin/Sucker/Profit) for UI display
            strategy.trinaryStats = calculateTrinaryStatsForStrategy(
                strategy,
                aggregated.loanDetails.initialEquity,
                UI_CONSTANTS.SIMULATION_COUNT
            );
        }
    }
    
    return aggregated;
}

/**
 * Unmarshal WASM output for a single strategy
 */
function unmarshalStrategyResults(rawBuffer) {
    let pos = 0;
    
    const status = rawBuffer[pos++];
    const months = Math.floor(rawBuffer[pos++]);
    const survivalRate = rawBuffer[pos++];
    const medianWealth = rawBuffer[pos++];
    const p90Wealth = rawBuffer[pos++];
    const expectedWealth = rawBuffer[pos++];
    const finalDebt = rawBuffer[pos++];
    const totalDeposits = rawBuffer[pos++];
    const numSurvived = Math.floor(rawBuffer[pos++]);
    
    if (status !== 0) {
        throw new Error(`Strategy simulation failed with status: ${status}`);
    }
    
    // depositPath and debtPath now include T=0, so they have months+1 elements
    const depositPath = [];
    for (let i = 0; i <= months && pos < rawBuffer.length; i++) {
        depositPath.push(rawBuffer[pos++]);
    }
    
    const debtPath = [];
    for (let i = 0; i <= months && pos < rawBuffer.length; i++) {
        debtPath.push(rawBuffer[pos++]);
    }
    
    const finalWealthArray = [];
    for (let i = 0; i < numSurvived && pos < rawBuffer.length; i++) {
        finalWealthArray.push(rawBuffer[pos++]);
    }
    
    return {
        survivalRate,
        medianWealth,
        p90Wealth,
        expectedWealth,
        finalWealthArray,
        depositPath,
        debtPath,
        numSurvived,
        months,
        benchmarkPercentDiff: 0,
        paymentAmount: 0,
        surplusAmount: 0
    };
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(array, mean) {
    if (array.length === 0) return 0;
    let sumSquaredDiff = 0;
    for (let i = 0; i < array.length; i++) {
        const diff = array[i] - mean;
        sumSquaredDiff += diff * diff;
    }
    return Math.sqrt(sumSquaredDiff / array.length);
}

/**
 * Calculate Trinary Outcome Statistics for a Strategy
 * Categorizes outcomes into: Ruin, Sucker, Profit
 * 
 * Ruin: Margin call (wealth = $0) OR ended with wealth < initial equity
 * Profit: Survived AND final wealth > benchmark median
 * Sucker: Survived AND initial equity <= wealth <= benchmark median
 */
function calculateTrinaryStatsForStrategy(strategy, initialEquity, totalSimulations) {
    const leveragedWealths = strategy.finalWealthArray;
    const benchmarkMedian = strategy.benchmarkMedian;
    
    const survivors = leveragedWealths.length;
    const marginCalls = totalSimulations - survivors;
    
    // RUIN: Margin call OR ended with less than initial equity
    const lostMoney = leveragedWealths.filter(w => w < initialEquity).length;
    const ruinCount = marginCalls + lostMoney;
    const ruinPercent = (ruinCount / totalSimulations) * 100;
    
    // Among survivors who didn't lose money, categorize by benchmark comparison
    const profitSurvivors = leveragedWealths.filter(w => w >= initialEquity && w > benchmarkMedian).length;
    const suckerSurvivors = leveragedWealths.filter(w => w >= initialEquity && w <= benchmarkMedian).length;
    
    // PROFIT: Survived with profit AND outperformed benchmark
    const profitPercent = (profitSurvivors / totalSimulations) * 100;
    
    // SUCKER: Survived with profit BUT underperformed benchmark
    const suckerPercent = (suckerSurvivors / totalSimulations) * 100;
    
    return {
        ruinPercent: Math.max(0, ruinPercent),
        suckerPercent: Math.max(0, suckerPercent),
        profitPercent: Math.max(0, profitPercent),
        ruinCount: ruinCount,
        profitCount: profitSurvivors,
        suckerCount: suckerSurvivors,
        totalSims: totalSimulations,
        calculationTotal: ruinPercent + suckerPercent + profitPercent  // Should equal 100 (for verification)
    };
}


/**
 * Fallback JavaScript implementation
 * This keeps the original algorithm for browsers without Wasm support
 */
function runSimulationJS(inputs) {
    console.warn('[Integration] Using legacy JavaScript simulation (slower)');
    
    // Call the original runSimulation function
    // This is preserved in calculatorhandler as runSimulationLegacy
    if (typeof runSimulationLegacy === 'function') {
        return runSimulationLegacy();
    } else {
        throw new Error('Legacy simulation function not available');
    }
}

// Export for use in calculatorhandler
if (typeof window !== 'undefined') {
    window.getSimulationInputs = getSimulationInputs;
    window.isWasmAvailable = isWasmAvailable;
    window.runSimulationWithAdapter = runSimulationWithAdapter;
}
