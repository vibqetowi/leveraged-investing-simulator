import {
    tensorIndex,
    statsStateOffset,
    STATS_RETAINED_PERCENTILE,
    STATS_MEDIAN_PERCENTILE,
    STATS_HIGH_PERCENTILE,
    STATS_HISTOGRAM_BINS
} from './contracts';

// Stats consumes the raw real-state tensor emitted by sim.
// Input: [months, scenarios, equity, totalRealDeposits, inflation, benchmarkMean,
//         retainedPercentile, medianPercentile, highPercentile, histogramBins,
//         securities[S*(M+1)], debt[S*(M+1)], liquidation[S*(M+1)]]
// totalRealDeposits is computed by the JS orchestrator from its own deposits schedule
// (see documentation/DataFlow.md "Schedule Optimization") rather than reconstructed here,
// since the nominal monthly deposit is no longer a single constant.
// Output: [status, months, totalRealDeposits, survivalRate, median, p90,
//          expected, survivorCount, marginCallCount,
//          ruinCount, suckerCount, profitCount, standardDeviation,
//          numBins, binMin, binMax, ...binCounts (numBins),
//          meanSecurities/debt/netWorth triples, finalWealth[]]
let inputBuffer: StaticArray<f64> = new StaticArray<f64>(24000000);
let outputBuffer: StaticArray<f64> = new StaticArray<f64>(1000000);

export function getInputPtr(): usize { return changetype<usize>(inputBuffer); }
export function getOutputPtr(): usize { return changetype<usize>(outputBuffer); }

function sortScenarioIndices(indices: StaticArray<i32>, values: StaticArray<f64>, left: i32, right: i32): void {
    if (left >= right) return;
    const pivot = values[indices[(left + right) / 2]];
    let i = left;
    let j = right;
    while (i <= j) {
        while (values[indices[i]] < pivot) i++;
        while (values[indices[j]] > pivot) j--;
        if (i <= j) {
            const temp = indices[i];
            indices[i] = indices[j];
            indices[j] = temp;
            i++;
            j--;
        }
    }
    if (left < j) sortScenarioIndices(indices, values, left, j);
    if (i < right) sortScenarioIndices(indices, values, i, right);
}

export function runStats(): i32 {
    const months = i32(inputBuffer[0]);
    const scenarios = i32(inputBuffer[1]);
    // inputBuffer[2] (equity) is informational only; totalRealDeposits already includes it.
    const totalRealDeposits = inputBuffer[3];
    const inflation = inputBuffer[4];
    const benchmarkMean = inputBuffer[5];
    const retainedPercentile = inputBuffer[STATS_RETAINED_PERCENTILE];
    const medianPercentile = inputBuffer[STATS_MEDIAN_PERCENTILE];
    const highPercentile = inputBuffer[STATS_HIGH_PERCENTILE];
    const numBins = max(1, i32(inputBuffer[STATS_HISTOGRAM_BINS]));
    const points = scenarios * (months + 1);
    const securitiesOffset = statsStateOffset(0, scenarios, months);
    const debtOffset = statsStateOffset(1, scenarios, months);
    const liquidationOffset = statsStateOffset(2, scenarios, months);

    if (scenarios <= 0) {
        let outputIdx = 0;
        outputBuffer[outputIdx++] = 0.0;
        outputBuffer[outputIdx++] = f64(months);
        outputBuffer[outputIdx++] = totalRealDeposits;
        outputBuffer[outputIdx++] = 0.0; // survivalRate
        outputBuffer[outputIdx++] = 0.0; // median
        outputBuffer[outputIdx++] = 0.0; // p90
        outputBuffer[outputIdx++] = 0.0; // expected
        outputBuffer[outputIdx++] = 0.0; // survivors
        outputBuffer[outputIdx++] = 0.0; // marginCalls
        outputBuffer[outputIdx++] = 0.0; // ruinCount
        outputBuffer[outputIdx++] = 0.0; // suckerCount
        outputBuffer[outputIdx++] = 0.0; // profitCount
        outputBuffer[outputIdx++] = 0.0; // standardDeviation
        outputBuffer[outputIdx++] = f64(numBins);
        outputBuffer[outputIdx++] = 0.0; // binMin
        outputBuffer[outputIdx++] = 0.0; // binMax
        for (let b = 0; b < numBins; b++) outputBuffer[outputIdx++] = 0.0;
        for (let month = 0; month <= months; month++) {
            outputBuffer[outputIdx++] = 0.0;
            outputBuffer[outputIdx++] = 0.0;
            outputBuffer[outputIdx++] = 0.0;
        }
        return outputIdx;
    }

    // 1. Compute raw nominal terminal wealth (earliest step)
    const nominalTerminalWealth = new StaticArray<f64>(scenarios);
    const scenarioIndices = new StaticArray<i32>(scenarios);
    for (let scenario = 0; scenario < scenarios; scenario++) {
        const point = tensorIndex(scenario, months, months);
        nominalTerminalWealth[scenario] = inputBuffer[securitiesOffset + point] - inputBuffer[debtOffset + point];
        scenarioIndices[scenario] = scenario;
    }

    // 2. Sort scenario indices ascending by nominal terminal wealth
    sortScenarioIndices(scenarioIndices, nominalTerminalWealth, 0, scenarios - 1);

    // 3. Single deflator calculation for terminal real wealth
    const finalDeflator = Math.pow(1.0 + inflation, f64(months) / 12.0);
    const invFinalDeflator = 1.0 / finalDeflator;

    // 4. Statistics over every scenario. Sorted ascending, so realWealth is too.
    const realWealth = new StaticArray<f64>(scenarios);
    let survivors = 0;
    let marginCalls = 0;
    let ruinCount = 0;
    let suckerCount = 0;
    let profitCount = 0;
    let expected = 0.0;

    for (let i = 0; i < scenarios; i++) {
        const scenario = scenarioIndices[i];
        const wealth = nominalTerminalWealth[scenario] * invFinalDeflator;
        realWealth[i] = wealth;

        if (wealth > totalRealDeposits) survivors++;
        if (wealth <= totalRealDeposits) ruinCount++;
        else if (wealth > benchmarkMean) profitCount++;
        else suckerCount++;

        for (let month = 1; month <= months; month++) {
            const monthPoint = tensorIndex(scenario, month, months);
            if (inputBuffer[liquidationOffset + monthPoint] > 0.0) {
                marginCalls++;
                break;
            }
        }
        expected += wealth;
    }

    const nScenariosF64 = f64(scenarios);
    expected /= nScenariosF64;

    const medianIndex = min(scenarios - 1, i32(nScenariosF64 * medianPercentile / 100.0));
    const highIndex = min(scenarios - 1, i32(nScenariosF64 * highPercentile / 100.0));
    const median = realWealth[medianIndex];
    const p90 = realWealth[highIndex];

    let standardDeviation = 0.0;
    for (let i = 0; i < scenarios; i++) {
        const diff = realWealth[i] - expected;
        standardDeviation += diff * diff;
    }
    standardDeviation = Math.sqrt(standardDeviation / nScenariosF64);

    // 5. The histogram alone is trimmed to the configured lower part of the
    // distribution, so its long right tail doesn't flatten the bins.
    const filteredCount = max(1, i32(nScenariosF64 * retainedPercentile / 100.0));
    const binMin = realWealth[0];
    const binMax = realWealth[filteredCount - 1];
    const binCounts = new StaticArray<f64>(numBins);
    for (let b = 0; b < numBins; b++) binCounts[b] = 0.0;

    const range = binMax - binMin;
    if (range > 0.0) {
        const invBinWidth = f64(numBins) / range;
        for (let i = 0; i < filteredCount; i++) {
            let binIdx = i32((realWealth[i] - binMin) * invBinWidth);
            if (binIdx < 0) binIdx = 0;
            if (binIdx >= numBins) binIdx = numBins - 1;
            binCounts[binIdx] += 1.0;
        }
    } else {
        binCounts[0] = f64(filteredCount);
    }

    // 6. Output buffer serialization
    let outputIdx = 0;
    outputBuffer[outputIdx++] = 0.0;
    outputBuffer[outputIdx++] = f64(months);
    outputBuffer[outputIdx++] = totalRealDeposits;
    outputBuffer[outputIdx++] = (f64(survivors) / nScenariosF64) * 100.0;
    outputBuffer[outputIdx++] = median;
    outputBuffer[outputIdx++] = p90;
    outputBuffer[outputIdx++] = expected;
    outputBuffer[outputIdx++] = f64(survivors);
    outputBuffer[outputIdx++] = f64(marginCalls);
    outputBuffer[outputIdx++] = f64(ruinCount);
    outputBuffer[outputIdx++] = f64(suckerCount);
    outputBuffer[outputIdx++] = f64(profitCount);
    outputBuffer[outputIdx++] = standardDeviation;

    // Bin metadata & counts
    outputBuffer[outputIdx++] = f64(numBins);
    outputBuffer[outputIdx++] = binMin;
    outputBuffer[outputIdx++] = binMax;
    for (let b = 0; b < numBins; b++) {
        outputBuffer[outputIdx++] = binCounts[b];
    }

    // Monthly path averages over every scenario.
    // Deflators depend only on month, not scenario, so precompute the whole schedule once.
    const invDeflators = new StaticArray<f64>(months + 1);
    for (let month = 0; month <= months; month++) {
        invDeflators[month] = 1.0 / Math.pow(1.0 + inflation, f64(month) / 12.0);
    }

    for (let month = 0; month <= months; month++) {
        let securitiesSum = 0.0;
        let debtSum = 0.0;
        const invDeflator = invDeflators[month];
        for (let scenario = 0; scenario < scenarios; scenario++) {
            const point = tensorIndex(scenario, month, months);
            securitiesSum += inputBuffer[securitiesOffset + point] * invDeflator;
            debtSum += inputBuffer[debtOffset + point] * invDeflator;
        }
        outputBuffer[outputIdx++] = securitiesSum / nScenariosF64;
        outputBuffer[outputIdx++] = debtSum / nScenariosF64;
        outputBuffer[outputIdx++] = (securitiesSum - debtSum) / nScenariosF64;
    }

    // Output the histogram's final real wealth values: the trimmed lower part only.
    for (let i = 0; i < filteredCount; i++) {
        outputBuffer[outputIdx++] = realWealth[i];
    }

    return outputIdx;
}
