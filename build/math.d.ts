/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * assembly/math/randn
 * @returns `f64`
 */
export declare function randn(): number;
/**
 * assembly/math/simulateGeometricBrownianMotionMonthlyGrowthFactor
 * @param growthRate `f64`
 * @param volatility `f64`
 * @returns `f64`
 */
export declare function simulateGeometricBrownianMotionMonthlyGrowthFactor(growthRate: number, volatility: number): number;
/**
 * assembly/math/simulateMertonJumpFactor
 * @returns `f64`
 */
export declare function simulateMertonJumpFactor(): number;
/**
 * assembly/math/runOscillator_gbm
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param month `i32`
 * @returns `f64`
 */
export declare function runOscillator_gbm(state: ArrayLike<number>, config: ArrayLike<number>, month: number): number;
/**
 * assembly/math/runJump_none
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param month `i32`
 * @returns `f64`
 */
export declare function runJump_none(state: ArrayLike<number>, config: ArrayLike<number>, month: number): number;
/**
 * assembly/math/runJump_merton
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param month `i32`
 * @returns `f64`
 */
export declare function runJump_merton(state: ArrayLike<number>, config: ArrayLike<number>, month: number): number;
/**
 * assembly/math/getSimulationMethod
 * @param providerId `i32`
 * @returns `(~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, f64, f64, i32) => void`
 */
export declare function getSimulationMethod(providerId: number): __Internref7;
/**
 * assembly/math/initializeLeveragedDCAState
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param targetLTV `f64`
 */
export declare function initializeLeveragedDCAState(state: ArrayLike<number>, config: ArrayLike<number>, targetLTV: number): void;
/**
 * assembly/math/sim_gbm_none_const_const
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param monthlyDeposit `f64`
 * @param targetLTV `f64`
 * @param month `i32`
 */
export declare function sim_gbm_none_const_const(state: ArrayLike<number>, config: ArrayLike<number>, monthlyDeposit: number, targetLTV: number, month: number): void;
/**
 * assembly/math/sim_gbm_merton_const_const
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param monthlyDeposit `f64`
 * @param targetLTV `f64`
 * @param month `i32`
 */
export declare function sim_gbm_merton_const_const(state: ArrayLike<number>, config: ArrayLike<number>, monthlyDeposit: number, targetLTV: number, month: number): void;
/** ~lib/function/Function<%28~lib/staticarray/StaticArray<f64>%2C~lib/staticarray/StaticArray<f64>%2Cf64%2Cf64%2Ci32%29=>void> */
declare class __Internref7 extends Number {
  private __nominal7: symbol;
  private __nominal0: symbol;
}
