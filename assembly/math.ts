/**
 * Math utilities for Monte Carlo simulation
 * AssemblyScript implementation
 */
import {
    CONFIG_EQUITY,
    CONFIG_SPREAD,
    CONFIG_PRIME_RATE,
    CONFIG_VOLATILITY,
    CONFIG_GROWTH,
    CONFIG_MARGIN_CALL_LTV,
    STATE_SECURITIES,
    STATE_DEBT,
    STATE_LIQUIDATION
} from './contracts';

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

// Poisson trial (p=1/96, ~once per 8 years) with a uniform -15% to -30% jump
export function simulateMertonJumpFactor(): f64 {
    if (Math.random() < (1.0 / 96.0)) {
        return 1.0 - (0.15 + 0.15 * Math.random());
    }
    return 1.0;
}

export type SimulationMethod = (
    state: StaticArray<f64>,
    config: StaticArray<f64>,
    monthlyDeposit: f64,
    targetLTV: f64,
    month: i32
) => void;

// Strategy Mapping table (DataFlow.md): index 0 = GBM/constant, index 1 = Merton/constant.
const PROVIDERS: SimulationMethod[] = [transition_gbm_const, transition_merton_const];

export function getSimulationMethod(providerId: i32): SimulationMethod {
    return providerId >= 0 && providerId < PROVIDERS.length ? PROVIDERS[providerId] : PROVIDERS[0];
}

export function initializeLeveragedDCAState(
    state: StaticArray<f64>,
    config: StaticArray<f64>,
    targetLTV: f64
): void {
    const equity = config[CONFIG_EQUITY];
    const clampedLTV = clampTargetLTV(targetLTV);
    const debt = equity * clampedLTV / (1.0 - clampedLTV);
    state[STATE_SECURITIES] = equity + debt;
    state[STATE_DEBT] = debt;
    state[STATE_LIQUIDATION] = 0.0;
}

export function transition_gbm_const(
    state: StaticArray<f64>,
    config: StaticArray<f64>,
    monthlyDeposit: f64,
    targetLTV: f64,
    month: i32
): void {
    transitionLeveragedDCAStateWithJumps(state, config, monthlyDeposit, targetLTV, month, false);
}

export function transition_merton_const(
    state: StaticArray<f64>,
    config: StaticArray<f64>,
    monthlyDeposit: f64,
    targetLTV: f64,
    month: i32
): void {
    transitionLeveragedDCAStateWithJumps(state, config, monthlyDeposit, targetLTV, month, true);
}

function transitionLeveragedDCAStateWithJumps(
    state: StaticArray<f64>,
    config: StaticArray<f64>,
    monthlyDeposit: f64,
    targetLTV: f64,
    month: i32,
    includeJumps: bool
): void {
    if (month <= 0) {
        initializeLeveragedDCAState(state, config, targetLTV);
        return;
    }

    state[STATE_SECURITIES] *= simulateGeometricBrownianMotionMonthlyGrowthFactor(config[CONFIG_GROWTH], config[CONFIG_VOLATILITY]);
    if (includeJumps) state[STATE_SECURITIES] *= simulateMertonJumpFactor();
    const monthlyRate = (config[CONFIG_PRIME_RATE] + config[CONFIG_SPREAD]) / 12.0;
    state[STATE_DEBT] = accrueDebtInterest(state[STATE_DEBT], monthlyRate);
    state[STATE_LIQUIDATION] = applyMarginCall(state, config[CONFIG_MARGIN_CALL_LTV]);
    deposit(state, monthlyDeposit);
    purchaseToRestoreTargetLTV(state, clampTargetLTV(targetLTV));
}

function clampTargetLTV(targetLTV: f64): f64 {
    return targetLTV < 0.0 ? 0.0 : (targetLTV > 0.99 ? 0.99 : targetLTV);
}

function accrueDebtInterest(debt: f64, monthlyRate: f64): f64 {
    return debt * (1.0 + monthlyRate);
}

function applyMarginCall(state: StaticArray<f64>, marginCallLTV: f64): f64 {
    const securities = state[STATE_SECURITIES];
    let debt = state[STATE_DEBT];
    if (securities <= 0.0 || marginCallLTV <= 0.0 || debt / securities <= marginCallLTV) return 0.0;
    const requiredSecurities = debt / marginCallLTV;
    const sale = securities > requiredSecurities ? securities - requiredSecurities : securities;
    state[STATE_SECURITIES] = securities - sale;
    debt -= sale;
    state[STATE_DEBT] = debt < 0.0 ? 0.0 : debt;
    return 1.0;
}

function deposit(state: StaticArray<f64>, monthlyBudget: f64): void {
    const payment = state[STATE_DEBT] < monthlyBudget ? state[STATE_DEBT] : monthlyBudget;
    state[STATE_DEBT] -= payment;
    if (state[STATE_DEBT] < 0.0) state[STATE_DEBT] = 0.0;
    state[STATE_SECURITIES] += monthlyBudget - payment;
}

function purchaseToRestoreTargetLTV(state: StaticArray<f64>, targetLTV: f64): void {
    if (state[STATE_SECURITIES] <= 0.0 || targetLTV <= 0.0) return;
    const purchase = (targetLTV * state[STATE_SECURITIES] - state[STATE_DEBT]) / (1.0 - targetLTV);
    if (purchase > 0.0) {
        state[STATE_SECURITIES] += purchase;
        state[STATE_DEBT] += purchase;
    }
}

