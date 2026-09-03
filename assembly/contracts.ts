export const RAW_HEADER_SIZE: i32 = 9;
export const STATS_INPUT_HEADER_SIZE: i32 = 6;

// Flat config buffer indices shared by index.ts, math.ts, and the JS worker marshalling code.
// Monthly budget and target LTV are NOT here: they vary per month and are supplied via the
// deposits/ltv_schedule arrays instead (see getDepositsPtr/getLtvSchedulePtr in index.ts).
// spread and prime_rate stay distinct so interest = (prime+spread)/12 is computed in wasm.
export const CONFIG_EQUITY: i32 = 0;
export const CONFIG_SPREAD: i32 = 1;
export const CONFIG_PRIME_RATE: i32 = 2;
export const CONFIG_VOLATILITY: i32 = 3;
export const CONFIG_GROWTH: i32 = 4;
export const CONFIG_MARGIN_CALL_LTV: i32 = 5;
export const CONFIG_YEARS: i32 = 6;
export const CONFIG_INFLATION: i32 = 7;
export const CONFIG_SCENARIO_COUNT: i32 = 8;
export const CONFIG_STATE_COUNT: i32 = 9;

// Flat per-step state buffer indices (recorded into the output tensor each month).
export const STATE_SECURITIES: i32 = 0;
export const STATE_DEBT: i32 = 1;
export const STATE_LIQUIDATION: i32 = 2;

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
