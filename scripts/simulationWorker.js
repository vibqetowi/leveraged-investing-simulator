/**
 * WASM bridge for one strategy. The simulator returns raw tensors; the stats
 * module consumes that tensor and returns chart-ready aggregates.
 */
let simInstance = null;
let statsInstance = null;
let simMemory = null;
let statsMemory = null;

// Dev-only performance tracing (no-op unless the worker's own origin is localhost,
// e.g. `npm run dev`). Workers get their own timeline track in DevTools Performance.
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
    if (!PERF_TRACE_ENABLED) return;
    try {
        const entry = performance.measure(label, startMark, endMark);
        perfEntries.push({ name: label, duration: entry ? entry.duration : 0 });
    } catch (e) { /* ignore */ }
}

async function loadModule(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to fetch ${path}: HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    return (await WebAssembly.instantiate(buffer, {
        env: { abort: () => {}, seed: () => Math.random() }
    })).instance;
}

async function initWasm() {
    if (!simInstance) {
        simInstance = await loadModule('../build/sim.wasm');
        simMemory = simInstance.exports.memory;
    }
    if (!statsInstance) {
        statsInstance = await loadModule('../build/stats.wasm');
        statsMemory = statsInstance.exports.memory;
    }
}

function marshalInputs(inputs) {
    const view = new Float64Array(simMemory.buffer, simInstance.exports.getInputPtr(), 20);
    view.fill(0);
    view[0] = inputs.initialEquity;
    view[1] = inputs.spreadRate;
    view[2] = inputs.primeRate;
    view[3] = inputs.volatility;
    view[4] = inputs.growth;
    view[5] = inputs.marginCallLTV;
    view[6] = inputs.years;
    view[7] = inputs.inflation;
    view[8] = inputs.simulationCount;
    view[9] = inputs.stateCount || 3;

    const months = Math.round(inputs.years * 12);
    const depositsView = new Float64Array(simMemory.buffer, simInstance.exports.getDepositsPtr(), months + 1);
    const ltvView = new Float64Array(simMemory.buffer, simInstance.exports.getLtvSchedulePtr(), months + 1);
    depositsView.set(inputs.deposits.subarray(0, months + 1));
    ltvView.set(inputs.ltvSchedule.subarray(0, months + 1));
}

function copyOutput(instance, memory, size) {
    return new Float64Array(new Float64Array(memory.buffer, instance.exports.getOutputPtr(), size));
}

function expectedPointCount(scenarios, months) {
    return scenarios * (months + 1);
}

function validateRawResults(rawResults) {
    const headerSize = 9;
    const months = Math.floor(rawResults[1]);
    const scenarios = Math.floor(rawResults[2]);
    const stateCount = Math.floor(rawResults[8]);
    const points = expectedPointCount(scenarios, months);

    if (months < 0 || scenarios < 1 || stateCount < 1) {
        throw new Error('Invalid raw tensor header');
    }

    const expectedSize = headerSize + stateCount * points;
    if (rawResults.length !== expectedSize) {
        throw new Error(`Invalid raw tensor length: expected ${expectedSize}, received ${rawResults.length}`);
    }

    return { months, scenarios, stateCount, points };
}

function runStats(rawResults, benchmarkMean, totalRealDeposits, statsConfig) {
    const { months, scenarios, stateCount, points } = validateRawResults(rawResults);
    if (stateCount !== 3) {
        throw new Error(`Unsupported state count: ${stateCount}`);
    }

    const inputSize = 10 + (points * stateCount);
    const view = new Float64Array(statsMemory.buffer, statsInstance.exports.getInputPtr(), inputSize);
    view.fill(0);
    view[0] = months;
    view[1] = scenarios;
    view[2] = rawResults[3]; // equity, informational
    view[3] = totalRealDeposits;
    view[4] = rawResults[4]; // inflation
    view[5] = benchmarkMean || 0;
    view[6] = statsConfig.retainedPercentile;
    view[7] = statsConfig.medianPercentile;
    view[8] = statsConfig.highPercentile;
    view[9] = statsConfig.histogramBins;
    view.set(rawResults.subarray(9, 9 + points), 10);
    view.set(rawResults.subarray(9 + points, 9 + 2 * points), 10 + points);
    view.set(rawResults.subarray(9 + 2 * points, 9 + 3 * points), 10 + 2 * points);
    return copyOutput(statsInstance, statsMemory, statsInstance.exports.runStats());
}

self.onmessage = async function (event) {
    const { id, inputs, strategyIndex } = event.data;
    const workerStart = performance.now();
    perfEntries = [];
    try {
        const wasWasmCold = !simInstance || !statsInstance;
        perfMark('wasm-init-start');
        await initWasm();
        perfMark('wasm-init-end');
        if (wasWasmCold) perfMeasure('wasm-init', 'wasm-init-start', 'wasm-init-end');

        perfMark('marshal-start');
        marshalInputs(inputs);
        perfMark('marshal-end');
        perfMeasure('marshal', 'marshal-start', 'marshal-end');

        if (!Number.isInteger(inputs.providerId) || inputs.providerId < 0) {
            throw new Error('Invalid simulation provider ID');
        }
        perfMark('run-simulation-start');
        const rawSize = simInstance.exports.runSimulation(inputs.providerId);
        const rawResults = copyOutput(simInstance, simMemory, rawSize);
        perfMark('run-simulation-end');
        perfMeasure('run-simulation', 'run-simulation-start', 'run-simulation-end');

        const tensor = validateRawResults(rawResults);

        perfMark('run-stats-start');
        const statsResults = runStats(
            rawResults,
            inputs.benchmarkMean,
            inputs.totalRealDeposits,
            inputs.statsConfig
        );
        perfMark('run-stats-end');
        perfMeasure('run-stats', 'run-stats-start', 'run-stats-end');

        self.postMessage({
            id,
            success: true,
            strategyIndex,
            months: tensor.months,
            scenarios: tensor.scenarios,
            statsResults,
            computeTime: performance.now() - workerStart,
            timings: PERF_TRACE_ENABLED ? perfEntries : undefined,
            targetLTV: inputs.targetLTV ?? 0
        });
    } catch (error) {
        self.postMessage({ id, success: false, strategyIndex, error: String(error) });
    }
};
