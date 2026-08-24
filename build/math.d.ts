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
 * assembly/math/getSimulationMethod
 * @param providerId `i32`
 * @returns `(~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, f64, f64, i32) => void`
 */
export declare function getSimulationMethod(providerId: number): __Internref6;
/**
 * assembly/math/initializeLeveragedDCAState
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param targetLTV `f64`
 */
export declare function initializeLeveragedDCAState(state: ArrayLike<number>, config: ArrayLike<number>, targetLTV: number): void;
/**
 * assembly/math/transition_gbm_const
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param monthlyDeposit `f64`
 * @param targetLTV `f64`
 * @param month `i32`
 */
export declare function transition_gbm_const(state: ArrayLike<number>, config: ArrayLike<number>, monthlyDeposit: number, targetLTV: number, month: number): void;
/**
 * assembly/math/transition_merton_const
 * @param state `~lib/staticarray/StaticArray<f64>`
 * @param config `~lib/staticarray/StaticArray<f64>`
 * @param monthlyDeposit `f64`
 * @param targetLTV `f64`
 * @param month `i32`
 */
export declare function transition_merton_const(state: ArrayLike<number>, config: ArrayLike<number>, monthlyDeposit: number, targetLTV: number, month: number): void;
/** ~lib/function/Function<%28~lib/staticarray/StaticArray<f64>%2C~lib/staticarray/StaticArray<f64>%2Cf64%2Cf64%2Ci32%29=>void> */
declare class __Internref6 extends Number {
  private __nominal6: symbol;
  private __nominal0: symbol;
}
