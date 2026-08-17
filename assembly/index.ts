import {
    SimulationMethod,
    getSimulationMethod
} from './math';
import { RAW_HEADER_SIZE, tensorIndex, stateOffset } from './contracts';

// Raw simulation contract.
// Input: provider configuration followed by scenario and state dimensions.
// Output: header followed by state[variable][scenario][month] tensors.
let inputBuffer: StaticArray<f64> = new StaticArray<f64>(20);
let outputBuffer: StaticArray<f64> = new StaticArray<f64>(24000000);
let stateBuffer: StaticArray<f64> = new StaticArray<f64>(3);

export function getInputPtr(): usize { return changetype<usize>(inputBuffer); }
export function getOutputPtr(): usize { return changetype<usize>(outputBuffer); }

export function runSimulation(providerId: i32): i32 {
    const years = inputBuffer[5];
    const inflation = inputBuffer[8];
    const scenarioCount = i32(inputBuffer[10]);
    const stateCount = i32(inputBuffer[11]);
    const months = i32(years * 12.0);
    const points = scenarioCount * (months + 1);
    const provider = getSimulationMethod(providerId);

    let outputIdx = 0;
    outputBuffer[outputIdx++] = 0.0;
    outputBuffer[outputIdx++] = f64(months);
    outputBuffer[outputIdx++] = f64(scenarioCount);
    outputBuffer[outputIdx++] = inputBuffer[0];
    outputBuffer[outputIdx++] = inputBuffer[3];
    outputBuffer[outputIdx++] = inflation;
    outputBuffer[outputIdx++] = inputBuffer[1];
    outputBuffer[outputIdx++] = inputBuffer[9];
    outputBuffer[outputIdx++] = f64(stateCount);

    for (let scenario = 0; scenario < scenarioCount; scenario++) {
        const base = tensorIndex(scenario, 0, months);
        inputBuffer[12] = 0.0;
        provider(stateBuffer, inputBuffer);
        for (let state = 0; state < stateCount; state++) {
            outputBuffer[stateOffset(state, scenarioCount, months) + base] = stateBuffer[state];
        }

        for (let month = 1; month <= months; month++) {
            inputBuffer[12] = f64(month);
            provider(stateBuffer, inputBuffer);
            for (let state = 0; state < stateCount; state++) {
                outputBuffer[stateOffset(state, scenarioCount, months) + base + month] = stateBuffer[state];
            }
        }
    }

    outputIdx = RAW_HEADER_SIZE + stateCount * points;
    return outputIdx;
}

