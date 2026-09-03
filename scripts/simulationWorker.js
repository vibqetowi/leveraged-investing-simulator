/**
 * WASM bridge for one strategy. The simulator returns raw tensors; the stats
 * module consumes that tensor and returns chart-ready aggregates.
 */
let simInstance = null;
let statsInstance = null;
let simMemory = null;
let statsMemory = null;

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

function runStats(rawResults, benchmarkMedian, totalRealDeposits) {
    const { months, scenarios, stateCount, points } = validateRawResults(rawResults);
    if (stateCount !== 3) {
        throw new Error(`Unsupported state count: ${stateCount}`);
    }

    const inputSize = 6 + (points * stateCount);
    const view = new Float64Array(statsMemory.buffer, statsInstance.exports.getInputPtr(), inputSize);
    view.fill(0);
    view[0] = months;
    view[1] = scenarios;
    view[2] = rawResults[3]; // equity, informational
    view[3] = totalRealDeposits;
    view[4] = rawResults[4]; // inflation
    view[5] = benchmarkMedian || 0;
    view.set(rawResults.subarray(9, 9 + points), 6);
    view.set(rawResults.subarray(9 + points, 9 + 2 * points), 6 + points);
    view.set(rawResults.subarray(9 + 2 * points, 9 + 3 * points), 6 + 2 * points);
    return copyOutput(statsInstance, statsMemory, statsInstance.exports.runStats());
}

self.onmessage = async function (event) {
    const { id, inputs, strategyIndex } = event.data;
    try {
        await initWasm();
        marshalInputs(inputs);
        const rawSize = simInstance.exports.runSimulation(inputs.providerId || 0);
        const rawResults = copyOutput(simInstance, simMemory, rawSize);
        const tensor = validateRawResults(rawResults);
        const statsResults = runStats(rawResults, inputs.benchmarkMedian, inputs.totalRealDeposits);
        self.postMessage({
            id,
            success: true,
            strategyIndex,
            months: tensor.months,
            scenarios: tensor.scenarios,
            statsResults
        });
    } catch (error) {
        self.postMessage({ id, success: false, strategyIndex, error: String(error) });
    }
};
