import { getSimulationMethod } from './math';
import {
    RAW_HEADER_SIZE,
    tensorIndex,
    stateOffset,
    CONFIG_YEARS,
    CONFIG_INFLATION,
    CONFIG_MARGIN_CALL_LTV,
    CONFIG_SCENARIO_COUNT,
    CONFIG_STATE_COUNT
} from './contracts';

// Raw simulation contract.
// Input: provider configuration followed by scenario and state dimensions.
// Output: header followed by state[variable][scenario][month] tensors.
// Deposits and target LTV vary per month; the schedules are precomputed once
// by the JS orchestrator and read here (see documentation/DataFlow.md "Schedule Optimization").
const MAX_MONTHS: i32 = 1200; // 100 years, generous cap for the schedule buffers

let inputBuffer: StaticArray<f64> = new StaticArray<f64>(20);
let outputBuffer: StaticArray<f64> = new StaticArray<f64>(24000000);
let stateBuffer: StaticArray<f64> = new StaticArray<f64>(3);
let depositsBuffer: StaticArray<f64> = new StaticArray<f64>(MAX_MONTHS);
let ltvScheduleBuffer: StaticArray<f64> = new StaticArray<f64>(MAX_MONTHS);

export function getInputPtr(): usize { return changetype<usize>(inputBuffer); }
export function getOutputPtr(): usize { return changetype<usize>(outputBuffer); }
export function getDepositsPtr(): usize { return changetype<usize>(depositsBuffer); }
export function getLtvSchedulePtr(): usize { return changetype<usize>(ltvScheduleBuffer); }

export function runSimulation(providerId: i32): i32 {
    const years = inputBuffer[CONFIG_YEARS];
    const inflation = inputBuffer[CONFIG_INFLATION];
    const scenarioCount = i32(inputBuffer[CONFIG_SCENARIO_COUNT]);
    const stateCount = i32(inputBuffer[CONFIG_STATE_COUNT]);
    const months = i32(years * 12.0);
    const points = scenarioCount * (months + 1);
    const provider = getSimulationMethod(providerId);

    // Header fields beyond equity/inflation/stateCount are informational only (already known to JS).
    let outputIdx = 0;
    outputBuffer[outputIdx++] = 0.0;
    outputBuffer[outputIdx++] = f64(months);
    outputBuffer[outputIdx++] = f64(scenarioCount);
    outputBuffer[outputIdx++] = inputBuffer[0];
    outputBuffer[outputIdx++] = inflation;
    outputBuffer[outputIdx++] = ltvScheduleBuffer[0];
    outputBuffer[outputIdx++] = depositsBuffer[0];
    outputBuffer[outputIdx++] = inputBuffer[CONFIG_MARGIN_CALL_LTV];
    outputBuffer[outputIdx++] = f64(stateCount);

    for (let scenario = 0; scenario < scenarioCount; scenario++) {
        const base = tensorIndex(scenario, 0, months);
        provider(stateBuffer, inputBuffer, depositsBuffer[0], ltvScheduleBuffer[0], 0);
        for (let state = 0; state < stateCount; state++) {
            outputBuffer[stateOffset(state, scenarioCount, months) + base] = stateBuffer[state];
        }

        for (let month = 1; month <= months; month++) {
            provider(stateBuffer, inputBuffer, depositsBuffer[month], ltvScheduleBuffer[month], month);
            for (let state = 0; state < stateCount; state++) {
                outputBuffer[stateOffset(state, scenarioCount, months) + base + month] = stateBuffer[state];
            }
        }
    }

    outputIdx = RAW_HEADER_SIZE + stateCount * points;
    return outputIdx;
}


