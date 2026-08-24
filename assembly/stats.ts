import { tensorIndex, statsStateOffset } from './contracts';

// Stats consumes the raw real-state tensor emitted by sim.
// Input: [months, scenarios, equity, totalRealDeposits, inflation, benchmarkMedian,
//         securities[S*(M+1)], debt[S*(M+1)], liquidation[S*(M+1)]]
// totalRealDeposits is computed by the JS orchestrator from its own deposits schedule
// (see documentation/DataFlow.md "Schedule Optimization") rather than reconstructed here,
// since the nominal monthly deposit is no longer a single constant.
// Output: [status, months, totalRealDeposits, survivalRate, median, p90,
//          expected, survivorCount, marginCallCount,
//          ruinCount, suckerCount, profitCount, standardDeviation,
//          meanSecurities/debt/netWorth triples, finalWealth[]]
let inputBuffer: StaticArray<f64> = new StaticArray<f64>(24000000);
let outputBuffer: StaticArray<f64> = new StaticArray<f64>(1000000);

export function getInputPtr(): usize { return changetype<usize>(inputBuffer); }
export function getOutputPtr(): usize { return changetype<usize>(outputBuffer); }

export function runStats(): i32 {
    const months = i32(inputBuffer[0]);
    const scenarios = i32(inputBuffer[1]);
    // inputBuffer[2] (equity) is informational only; totalRealDeposits already includes it.
    const totalRealDeposits = inputBuffer[3];
    const inflation = inputBuffer[4];
    const benchmarkMedian = inputBuffer[5];
    const points = scenarios * (months + 1);
    const securitiesOffset = statsStateOffset(0, scenarios, months);
    const debtOffset = statsStateOffset(1, scenarios, months);
    const liquidationOffset = statsStateOffset(2, scenarios, months);
    const finalWealth = new StaticArray<f64>(scenarios);

    let survivors = 0;
    let marginCalls = 0;
    let ruinCount = 0;
    let suckerCount = 0;
    let profitCount = 0;
    for (let scenario = 0; scenario < scenarios; scenario++) {
        const point = tensorIndex(scenario, months, months);
        const finalDeflator = Math.pow(1.0 + inflation, f64(months) / 12.0);
        const wealth = (inputBuffer[securitiesOffset + point] - inputBuffer[debtOffset + point]) / finalDeflator;
        finalWealth[scenario] = wealth;
        if (wealth > totalRealDeposits) survivors++;
        if (wealth < totalRealDeposits) ruinCount++;
        else if (wealth > benchmarkMedian) profitCount++;
        else suckerCount++;
        for (let month = 1; month <= months; month++) {
            const monthPoint = tensorIndex(scenario, month, months);
            if (inputBuffer[liquidationOffset + monthPoint] > 0.0) {
                marginCalls++;
                break;
            }
        }
    }
    finalWealth.sort();
    let median = 0.0;
    let p90 = 0.0;
    let expected = 0.0;
    let standardDeviation = 0.0;
    if (scenarios > 0) {
        median = finalWealth[scenarios / 2];
        const p90Index = i32(f64(scenarios) * 0.9);
        p90 = finalWealth[p90Index < scenarios ? p90Index : scenarios - 1];
        for (let scenario = 0; scenario < scenarios; scenario++) expected += finalWealth[scenario];
        expected /= f64(scenarios);
        for (let scenario = 0; scenario < scenarios; scenario++) {
            const difference = finalWealth[scenario] - expected;
            standardDeviation += difference * difference;
        }
        standardDeviation = Math.sqrt(standardDeviation / f64(scenarios));
    }

    let outputIdx = 0;
    outputBuffer[outputIdx++] = 0.0;
    outputBuffer[outputIdx++] = f64(months);
    outputBuffer[outputIdx++] = totalRealDeposits;
    outputBuffer[outputIdx++] = scenarios > 0 ? f64(survivors) / f64(scenarios) * 100.0 : 0.0;
    outputBuffer[outputIdx++] = median;
    outputBuffer[outputIdx++] = p90;
    outputBuffer[outputIdx++] = expected;
    outputBuffer[outputIdx++] = f64(survivors);
    outputBuffer[outputIdx++] = f64(marginCalls);
    outputBuffer[outputIdx++] = f64(ruinCount);
    outputBuffer[outputIdx++] = f64(suckerCount);
    outputBuffer[outputIdx++] = f64(profitCount);
    outputBuffer[outputIdx++] = standardDeviation;
    for (let month = 0; month <= months; month++) {
        let securitiesSum = 0.0;
        let debtSum = 0.0;
        const deflator = Math.pow(1.0 + inflation, f64(month) / 12.0);
        for (let scenario = 0; scenario < scenarios; scenario++) {
            const point = tensorIndex(scenario, month, months);
            securitiesSum += inputBuffer[securitiesOffset + point] / deflator;
            debtSum += inputBuffer[debtOffset + point] / deflator;
        }
        outputBuffer[outputIdx++] = scenarios > 0 ? securitiesSum / f64(scenarios) : 0.0;
        outputBuffer[outputIdx++] = scenarios > 0 ? debtSum / f64(scenarios) : 0.0;
        outputBuffer[outputIdx++] = scenarios > 0 ? (securitiesSum - debtSum) / f64(scenarios) : 0.0;
    }
    for (let scenario = 0; scenario < scenarios; scenario++) outputBuffer[outputIdx++] = finalWealth[scenario];
    return outputIdx;
}
