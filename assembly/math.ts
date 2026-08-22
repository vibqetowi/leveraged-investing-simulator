/**
 * Math utilities for Monte Carlo simulation
 * AssemblyScript implementation
 */

// Box-Muller transform for generating normal random variables
// Returns a standard normal random variable (mean=0, stddev=1)
export function randn(): f64 {
    let u: f64 = 0.0;
    let v: f64 = 0.0;
    
    // Ensure we don't get exactly 0 (would cause log(0) = -infinity)
    while (u === 0.0) u = Math.random();
    while (v === 0.0) v = Math.random();
    
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Simulate geometric Brownian motion for one month
// Returns the multiplicative return factor
export function simulateGeometricBrownianMotionMonthlyGrowthFactor(
    growthRate: f64,
    volatility: f64
): f64 {
    const dt = 1.0 / 12.0; // Monthly time step
    const drift = (growthRate - 0.5 * volatility * volatility) * dt;
    const diffusion = volatility * Math.sqrt(dt) * randn();
    
    return Math.exp(drift + diffusion);
}

export function simulateMertonJumpFactor(): f64 {
    if (Math.random() < (1.0 / 96.0)) {
        return 1.0 - (0.15 + 0.15 * Math.random());
    }
    return 1.0;
}

const SECURITIES_STATE: i32 = 0;
const DEBT_STATE: i32 = 1;
const LIQUIDATION_STATE: i32 = 2;

export type SimulationMethod = (state: StaticArray<f64>, input: StaticArray<f64>) => void;

export function getSimulationMethod(providerId: i32): SimulationMethod {
    if (providerId == 0) return transitionLeveragedDCAState;
    if (providerId == 1) return transitionLeveragedDCAMertonState;
    return transitionLeveragedDCAState;
}

export function initializeLeveragedDCAState(state: StaticArray<f64>, input: StaticArray<f64>): void {
    const equity = input[0];
    const targetLTV = clampTargetLTV(input[1]);
    const debt = equity * targetLTV / (1.0 - targetLTV);
    state[SECURITIES_STATE] = equity + debt;
    state[DEBT_STATE] = debt;
    state[LIQUIDATION_STATE] = 0.0;
}

export function transitionLeveragedDCAState(state: StaticArray<f64>, input: StaticArray<f64>): void {
    transitionLeveragedDCAStateWithJumps(state, input, false);
}

export function transitionLeveragedDCAMertonState(state: StaticArray<f64>, input: StaticArray<f64>): void {
    transitionLeveragedDCAStateWithJumps(state, input, true);
}

function transitionLeveragedDCAStateWithJumps(
    state: StaticArray<f64>,
    input: StaticArray<f64>,
    includeJumps: bool
): void {
    if (input[12] <= 0.0) {
        initializeLeveragedDCAState(state, input);
        return;
    }

    state[SECURITIES_STATE] *= simulateGeometricBrownianMotionMonthlyGrowthFactor(input[7], input[6]);
    if (includeJumps) state[SECURITIES_STATE] *= simulateMertonJumpFactor();
    state[DEBT_STATE] = accrueDebtInterest(state[DEBT_STATE], input[4]);
    state[LIQUIDATION_STATE] = applyMarginCall(state, input[9]);
    deposit(state, input[3]);
    purchaseToRestoreTargetLTV(state, clampTargetLTV(input[1]));

}

function clampTargetLTV(targetLTV: f64): f64 {
    return targetLTV < 0.0 ? 0.0 : (targetLTV > 0.99 ? 0.99 : targetLTV);
}

function accrueDebtInterest(debt: f64, monthlyRate: f64): f64 {
    return debt * (1.0 + monthlyRate);
}

function applyMarginCall(state: StaticArray<f64>, marginCallLTV: f64): f64 {
    const securities = state[SECURITIES_STATE];
    let debt = state[DEBT_STATE];
    if (securities <= 0.0 || marginCallLTV <= 0.0 || debt / securities <= marginCallLTV) return 0.0;
    const requiredSecurities = debt / marginCallLTV;
    const sale = securities > requiredSecurities ? securities - requiredSecurities : securities;
    state[SECURITIES_STATE] = securities - sale;
    debt -= sale;
    state[DEBT_STATE] = debt < 0.0 ? 0.0 : debt;
    return 1.0;
}

function deposit(state: StaticArray<f64>, monthlyBudget: f64): void {
    const payment = state[DEBT_STATE] < monthlyBudget ? state[DEBT_STATE] : monthlyBudget;
    state[DEBT_STATE] -= payment;
    if (state[DEBT_STATE] < 0.0) state[DEBT_STATE] = 0.0;
    state[SECURITIES_STATE] += monthlyBudget - payment;
}

function purchaseToRestoreTargetLTV(state: StaticArray<f64>, targetLTV: f64): void {
    if (state[SECURITIES_STATE] <= 0.0 || targetLTV <= 0.0) return;
    const purchase = (targetLTV * state[SECURITIES_STATE] - state[DEBT_STATE]) / (1.0 - targetLTV);
    if (purchase > 0.0) {
        state[SECURITIES_STATE] += purchase;
        state[DEBT_STATE] += purchase;
    }
}
