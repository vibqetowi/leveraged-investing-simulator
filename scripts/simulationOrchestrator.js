/**
 * this creates one worker per required strategy and configures them with the proper inputs

/**
 * Extract UI inputs in format expected by both old and new simulation engines
 */
/**
 * Check if WebAssembly is supported
 */
function isWasmAvailable() {
    return typeof WebAssembly !== 'undefined';
}

function runStrategyWorker(strategyIndex, inputs) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('scripts/simulationWorker.js', {
            name: `strategy-${strategyIndex}`
        });
        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error(`Strategy ${strategyIndex} worker timeout`));
        }, 600000);

        worker.onmessage = (event) => {
            clearTimeout(timeout);
            worker.terminate();
            if (!event.data.success) {
                reject(new Error(`Strategy ${strategyIndex}: ${event.data.error || 'Unknown worker error'}`));
                return;
            }
            resolve({
                months: event.data.months,
                scenarios: event.data.scenarios,
                statsResults: event.data.statsResults,
                strategyIndex,
                computeTime: event.data.computeTime
            });
        };

        worker.onerror = (error) => {
            clearTimeout(timeout);
            worker.terminate();
            reject(new Error(`Strategy ${strategyIndex} worker error: ${String(error)}`));
        };

        worker.postMessage({ id: strategyIndex, inputs, strategyIndex });
    });
}

/**
 * Run simulation using 21 separate Worker instances
 * Each worker processes one strategy independently
 */
async function runSimulationWithAdapter(uiInputs) {
    const strategyCount = UI_CONSTANTS.NUM_STRATEGIES;
    const maxStrategyIndex = strategyCount - 1;
    console.log(`[Integration] Starting simulation with ${strategyCount} workers...`);
    
    console.log('[Integration] Inputs collected:', uiInputs);
    
    try {
        if (!isWasmAvailable()) throw new Error("WebAssembly is required");
        
        // Pre-compute deterministic schedules once (documentation/DataFlow.md "Schedule Optimization").
        // Deposits grow nominally with inflation so the real monthly contribution stays constant.
        const months = Math.round(uiInputs.years * 12);
        const deposits = new Float64Array(months + 1);
        for (let t = 0; t <= months; t++) {
            deposits[t] = uiInputs.monthlyBudget * Math.pow(1 + uiInputs.inflation, t / 12);
        }
        const totalRealDeposits = uiInputs.initialEquity + uiInputs.monthlyBudget * months;

        // Create worker inputs for each strategy
        const strategyInputs = [];
        for (let i = 0; i < strategyCount; i++) {
            const isBenchmark = i === 0;
            const targetLTV = isBenchmark ? 0 : uiInputs.maxLTV * (i / maxStrategyIndex);
            const ltvSchedule = new Float64Array(months + 1).fill(targetLTV);
            strategyInputs.push({
                initialEquity: uiInputs.initialEquity,
                deposits,
                ltvSchedule,
                totalRealDeposits,
                primeRate: uiInputs.primeRate,
                spreadRate: uiInputs.spreadRate,
                years: uiInputs.years,
                volatility: uiInputs.volatility,
                growth: uiInputs.growth,
                inflation: uiInputs.inflation,
                marginCallLTV: uiInputs.marginCallLTV,
                simulationCount: isBenchmark ? uiInputs.baselineSimulationCount : uiInputs.simulationCount,
                providerId: uiInputs.modelId,
                stateCount: 3
            });
        }
        
        console.log(`[Integration] Running benchmark, then ${strategyCount - 1} strategies...`);
        const startTime = performance.now();
        try {
            const benchmarkResult = await runStrategyWorker(0, strategyInputs[0]);
            const benchmarkStats = benchmarkResult.statsResults;
            const benchmarkMedian = benchmarkStats[4];
            for (let i = 1; i < strategyCount; i++) {
                strategyInputs[i].benchmarkMedian = benchmarkMedian;
            }
            const strategyResults = await Promise.all(
                strategyInputs.slice(1).map((inputs, offset) => runStrategyWorker(offset + 1, inputs))
            );
            const results = [benchmarkResult, ...strategyResults];
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
 * Aggregate results from all configured worker instances
 */
function aggregateWorkerResults(workerResults, uiInputs, totalTime) {
    const aggregated = {
        benchmark: null,
        strategies: [],
        loanDetails: {
            loanAmount: uiInputs.loanAmount,
            initialEquity: uiInputs.initialEquity,
            months: uiInputs.years * 12,
            monthlyBudget: uiInputs.monthlyBudget,
            interestRate: uiInputs.interestRate,
            inflationRate: uiInputs.inflation,
            years: uiInputs.years
        },
        computeTime: totalTime
    };
    
    // Sort results by strategy index
    workerResults.sort((a, b) => a.strategyIndex - b.strategyIndex);
    
    for (const result of workerResults) {
        const strategyIndex = result.strategyIndex;
        const statsBuffer = result.statsResults;
        const isBenchmark = strategyIndex === 0;
        
        // Unmarshal results
        const strategyData = unmarshalStrategyResults(statsBuffer, result.months, result.scenarios);
        
        const maxStrategyIndex = UI_CONSTANTS.NUM_STRATEGIES - 1;
        strategyData.targetLTV = isBenchmark ? 0 : uiInputs.maxLTV * (strategyIndex / maxStrategyIndex);
        strategyData.initialLoan = uiInputs.initialEquity * strategyData.targetLTV / (1 - strategyData.targetLTV);
        
        if (isBenchmark) {
            aggregated.benchmark = strategyData;
        } else {
            aggregated.strategies.push(strategyData);
        }
        
    }
    
    // Post-process
    if (aggregated.benchmark && aggregated.benchmark.expectedWealth > 0) {
        for (let i = 0; i < aggregated.strategies.length; i++) {
            const strategy = aggregated.strategies[i];
            strategy.benchmarkWealthArray = aggregated.benchmark.finalWealthArray;
            strategy.benchmarkMedian = aggregated.benchmark.medianWealth;
            strategy.benchmarkExpected = aggregated.benchmark.expectedWealth;
            strategy.benchmarkSigma = aggregated.benchmark.standardDeviation;
            
        }
    }
    
    return aggregated;
}

/**
 * Unmarshal WASM output for a single strategy
 */
function unmarshalStrategyResults(statsBuffer, months, scenarios) {

    const statsStatus = statsBuffer[0];
    const statsMonths = Math.floor(statsBuffer[1]);
    const survivalRate = statsBuffer[3];
    const medianWealth = statsBuffer[4];
    const p90Wealth = statsBuffer[5];
    const expectedWealth = statsBuffer[6];
    const survivorCount = Math.floor(statsBuffer[7]);
    const marginCallCount = Math.floor(statsBuffer[8]);
    const ruinCount = Math.floor(statsBuffer[9]);
    const suckerCount = Math.floor(statsBuffer[10]);
    const profitCount = Math.floor(statsBuffer[11]);
    const standardDeviation = statsBuffer[12];
    const meanSeries = [];
    const debtMeanSeries = [];
    const netWorthSeries = [];
    let pos = 13;
    for (let month = 0; month <= statsMonths; month++) {
        meanSeries.push(statsBuffer[pos++]);
        debtMeanSeries.push(statsBuffer[pos++]);
        netWorthSeries.push(statsBuffer[pos++]);
    }
    const finalWealthArray = Array.from(statsBuffer.subarray(pos, pos + scenarios));
    return {
        survivalRate, medianWealth, p90Wealth, expectedWealth, standardDeviation, finalWealthArray,
        securitiesPath: meanSeries, debtPath: debtMeanSeries, meanSecuritiesPath: meanSeries,
        meanDebtPath: debtMeanSeries, meanNetWorthPath: netWorthSeries,
        totalDeposits: statsBuffer[2], numSurvived: survivorCount, marginCalls: marginCallCount,
        trinaryStats: {
            ruinCount,
            suckerCount,
            profitCount,
            totalSims: scenarios,
            ruinPercent: scenarios > 0 ? ruinCount / scenarios * 100 : 0,
            suckerPercent: scenarios > 0 ? suckerCount / scenarios * 100 : 0,
            profitPercent: scenarios > 0 ? profitCount / scenarios * 100 : 0,
            calculationTotal: scenarios > 0 ? (ruinCount + suckerCount + profitCount) / scenarios * 100 : 0
        },
        months, scenarios, benchmarkPercentDiff: 0
    };
}

// Export for use in calculatorhandler
if (typeof window !== 'undefined') {
    window.isWasmAvailable = isWasmAvailable;
    window.runSimulationWithAdapter = runSimulationWithAdapter;
}
