/**
 * Creates one worker per required strategy and configures them with the proper inputs
 */

// Dev-only performance tracing (no-op unless running on localhost, e.g. `npm run dev`).
// Guards every global lookup so this stays safe inside the vm sandbox used by
// tests/integration/orchestrator-worker-wasm.test.js, which does not define `location`.
const PERF_TRACE_ENABLED = (() => {
    try {
        const host = typeof location !== 'undefined' ? location.hostname : '';
        return host === 'localhost' || host === '127.0.0.1';
    } catch (e) {
        return false;
    }
})();

let perfEntries = [];

function perfMark(name) {
    if (!PERF_TRACE_ENABLED) return;
    try { performance.mark(name); } catch (e) { /* ignore */ }
}

function perfMeasure(label, startMark, endMark) {
    if (!PERF_TRACE_ENABLED) return 0;
    try {
        const entry = performance.measure(label, startMark, endMark);
        const duration = entry ? entry.duration : 0;
        perfEntries.push({ name: label, duration });
        return duration;
    } catch (e) {
        return 0;
    }
}

// Folds a worker's own phase timings (sent back over postMessage) into the combined table.
function perfMergeRemote(prefix, remoteEntries) {
    if (!PERF_TRACE_ENABLED || !Array.isArray(remoteEntries)) return;
    for (const entry of remoteEntries) {
        perfEntries.push({ name: `${prefix}:${entry.name}`, duration: entry.duration });
    }
}

function perfPrintTable() {
    if (!PERF_TRACE_ENABLED || perfEntries.length === 0) return;
    const rows = {};
    for (const entry of perfEntries) {
        rows[entry.name] = { 'duration (ms)': Number(entry.duration.toFixed(2)) };
    }
    console.table(rows);
}

/**
 * Check if WebAssembly is supported
 */
function isWasmAvailable() {
    return typeof WebAssembly !== 'undefined';
}

function runStrategyWorker(strategyIndex, inputs, WorkerConstructor = Worker) {
    return new Promise((resolve, reject) => {
        const worker = new WorkerConstructor('scripts/simulationWorker.js', {
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
                computeTime: event.data.computeTime,
                timings: event.data.timings,
                targetLTV: event.data.targetLTV ?? inputs.targetLTV ?? 0
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
 * Generates a spectrum of LTV strategies starting explicitly at 0% (base case) and ending at maxLTVPercent.
 * Conceptual specification:
 * 1. Compute rawStep = maxLTV / 20
 * 2. Floor rawStep (Math.floor(maxLTV / 20)), with a minimum step of 0.5%
 * 3. Add steps consecutively until hitting max or within 0.5% of max
 * 4. Append max if not already the final step
 */
function generateLTVSteps(maxLTVPercent) {
    const safeMax = Number.isFinite(maxLTVPercent) ? Math.max(0, maxLTVPercent) : 0;
    if (safeMax === 0) return [0];

    const flooredStep = Math.floor(safeMax / 20);
    const stepPercent = Math.max(0.5, flooredStep);
    const steps = [0];

    for (let value = stepPercent; value <= safeMax - 0.5; value += stepPercent) {
        steps.push(Number(value.toFixed(6)));
    }

    if (steps[steps.length - 1] !== safeMax) {
        steps.push(Number(safeMax.toFixed(6)));
    }

    return steps;
}

/**
 * Run simulation using one worker per generated strategy step.
 * Each worker processes one strategy independently.
 */
async function runSimulationWithAdapter(uiInputs, options = {}) {
    const strategyCount = options.strategyCount ?? UI_CONSTANTS.NUM_STRATEGIES;
    const WorkerConstructor = options.WorkerConstructor ?? Worker;
    const simulationCount = options.simulationCountOverride ?? uiInputs.simulationCount;
    const baselineSimulationCount = options.baselineSimulationCountOverride ?? uiInputs.baselineSimulationCount;
    const strategyLTVs = generateLTVSteps((uiInputs.maxLTV ?? 0) * 100);
    const actualStrategyCount = Math.max(strategyCount, strategyLTVs.length);
    console.log(`[Integration] Starting simulation with ${actualStrategyCount} workers...`);
    
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

        const strategyInputs = [];
        strategyLTVs.forEach((targetLTV, index) => {
            const isBenchmark = index === 0;
            const ltvSchedule = new Float64Array(months + 1).fill(targetLTV / 100);
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
                simulationCount: isBenchmark ? baselineSimulationCount : simulationCount,
                providerId: uiInputs.providerId,
                stateCount: 3,
                statsConfig: uiInputs.statsConfig,
                targetLTV: targetLTV / 100
            });
        });
        
        console.log(`[Integration] Running benchmark + ${strategyInputs.length - 1} strategies...`);
        perfEntries = [];
        perfMark('total-start');
        const startTime = performance.now();
        try {
            // Tier 1: Run DCA base case (LTV = 0) worker first (deliberately sequential - see docs)
            perfMark('baseline-wait-start');
            const benchmarkResult = await runStrategyWorker(0, strategyInputs[0], WorkerConstructor);
            perfMark('baseline-wait-end');
            perfMeasure('baseline-wait', 'baseline-wait-start', 'baseline-wait-end');
            perfMergeRemote('strategy-0', benchmarkResult.timings);
            const benchmarkStats = benchmarkResult.statsResults;
            const benchmarkMean = benchmarkStats[6];

            // If a progress callback was supplied, unmarshal Tier 1 results and notify caller immediately
            if (typeof options.onBaselineComplete === 'function') {
                const baselineData = unmarshalStrategyResults(benchmarkStats, benchmarkResult.months, benchmarkResult.scenarios);
                baselineData.targetLTV = 0;
                baselineData.initialLoan = 0;
                const partialAggregated = {
                    benchmark: baselineData,
                    strategies: [baselineData],
                    loanDetails: {
                        loanAmount: uiInputs.loanAmount,
                        initialEquity: uiInputs.initialEquity,
                        months: uiInputs.years * 12,
                        monthlyBudget: uiInputs.monthlyBudget,
                        interestRate: uiInputs.interestRate,
                        inflationRate: uiInputs.inflation,
                        years: uiInputs.years
                    },
                    computeTime: performance.now() - startTime,
                    isPartial: true
                };
                try {
                    options.onBaselineComplete(partialAggregated);
                } catch (cbErr) {
                    console.warn('[Integration] onBaselineComplete callback error:', cbErr);
                }
            }

            // Tier 2: Pass the benchmark mean to remaining strategies and execute in parallel
            for (let i = 1; i < strategyInputs.length; i++) {
                strategyInputs[i].benchmarkMean = benchmarkMean;
            }
            perfMark('tier2-wait-start');
            const strategyResults = await Promise.all(
                strategyInputs.slice(1).map((inputs, offset) => runStrategyWorker(offset + 1, inputs, WorkerConstructor))
            );
            perfMark('tier2-wait-end');
            perfMeasure('tier2-wait', 'tier2-wait-start', 'tier2-wait-end');
            strategyResults.forEach((result) => perfMergeRemote(`strategy-${result.strategyIndex}`, result.timings));
            const results = [benchmarkResult, ...strategyResults];
            const endTime = performance.now();
            
            console.log(`[Integration] All workers completed in ${(endTime - startTime).toFixed(2)}ms`);
            
            perfMark('aggregation-start');
            const aggregated = aggregateWorkerResults(results, uiInputs, endTime - startTime);
            perfMark('aggregation-end');
            perfMeasure('aggregation', 'aggregation-start', 'aggregation-end');
            perfMark('total-end');
            perfMeasure('total', 'total-start', 'total-end');
            perfPrintTable();
            // Opt-in hook for automated perf tooling (see scripts/performanceBenchmark.js) to read raw phase timings.
            if (typeof options.onPerfTrace === 'function') {
                try {
                    options.onPerfTrace(perfEntries.slice());
                } catch (traceErr) {
                    console.warn('[Integration] onPerfTrace callback error:', traceErr);
                }
            }
            return aggregated;
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
        const targetLTV = Number(result.targetLTV ?? 0);
        strategyData.targetLTV = targetLTV;
        strategyData.initialLoan = uiInputs.initialEquity * targetLTV / (1 - targetLTV);
        
        if (isBenchmark) {
            aggregated.benchmark = strategyData;
        }
        aggregated.strategies.push(strategyData);
        
    }
    
    // Post-process
    if (aggregated.benchmark && aggregated.benchmark.expectedWealth > 0) {
        for (let i = 0; i < aggregated.strategies.length; i++) {
            const strategy = aggregated.strategies[i];
            strategy.benchmarkWealthArray = aggregated.benchmark.finalWealthArray;
            strategy.benchmarkMean = aggregated.benchmark.expectedWealth;
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

    const numBins = Math.floor(statsBuffer[13]);
    const binMin = statsBuffer[14];
    const binMax = statsBuffer[15];
    const binCounts = [];
    let pos = 16;
    for (let b = 0; b < numBins; b++) {
        binCounts.push(statsBuffer[pos++]);
    }

    const meanSeries = [];
    const debtMeanSeries = [];
    const netWorthSeries = [];
    for (let month = 0; month <= statsMonths; month++) {
        meanSeries.push(statsBuffer[pos++]);
        debtMeanSeries.push(statsBuffer[pos++]);
        netWorthSeries.push(statsBuffer[pos++]);
    }
    const finalWealthArray = Array.from(statsBuffer.subarray(pos));
    const effectiveScenarios = finalWealthArray.length > 0 ? finalWealthArray.length : scenarios;

    return {
        survivalRate, medianWealth, p90Wealth, expectedWealth, standardDeviation, finalWealthArray,
        histogramBins: {
            numBins,
            binMin,
            binMax,
            binCounts
        },
        securitiesPath: meanSeries, debtPath: debtMeanSeries, meanSecuritiesPath: meanSeries,
        meanDebtPath: debtMeanSeries, meanNetWorthPath: netWorthSeries,
        totalDeposits: statsBuffer[2], numSurvived: survivorCount, marginCalls: marginCallCount,
        trinaryStats: {
            ruinCount,
            suckerCount,
            profitCount,
            totalSims: effectiveScenarios,
            ruinPercent: effectiveScenarios > 0 ? ruinCount / effectiveScenarios * 100 : 0,
            suckerPercent: effectiveScenarios > 0 ? suckerCount / effectiveScenarios * 100 : 0,
            profitPercent: effectiveScenarios > 0 ? profitCount / effectiveScenarios * 100 : 0,
            calculationTotal: effectiveScenarios > 0 ? (ruinCount + suckerCount + profitCount) / effectiveScenarios * 100 : 0
        },
        months, scenarios: effectiveScenarios, benchmarkPercentDiff: 0
    };
}

// Export for use in calculatorhandler
if (typeof window !== 'undefined') {
    window.isWasmAvailable = isWasmAvailable;
    window.runSimulationWithAdapter = runSimulationWithAdapter;
}

if (typeof globalThis !== 'undefined') {
    globalThis.runSimulationWithAdapter = runSimulationWithAdapter;
}
