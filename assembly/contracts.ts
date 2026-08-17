export const RAW_HEADER_SIZE: i32 = 9;
export const STATS_INPUT_HEADER_SIZE: i32 = 6;

export function pointCount(scenarioCount: i32, months: i32): i32 {
    return scenarioCount * (months + 1);
}

export function tensorIndex(scenario: i32, month: i32, months: i32): i32 {
    return scenario * (months + 1) + month;
}

export function stateOffset(stateIndex: i32, scenarioCount: i32, months: i32): i32 {
    return RAW_HEADER_SIZE + stateIndex * pointCount(scenarioCount, months);
}

export function statsStateOffset(stateIndex: i32, scenarioCount: i32, months: i32): i32 {
    return STATS_INPUT_HEADER_SIZE + stateIndex * pointCount(scenarioCount, months);
}
