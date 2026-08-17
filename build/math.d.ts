/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * assembly/math/randn
 * @returns `f64`
 */
export declare function randn(): number;
/**
 * assembly/math/simulateGBM
 * @param growthRate `f64`
 * @param volatility `f64`
 * @returns `f64`
 */
export declare function simulateGBM(growthRate: number, volatility: number): number;
/**
 * assembly/math/simulateMertonJump
 * @returns `f64`
 */
export declare function simulateMertonJump(): number;
/**
 * assembly/math/initializeLeveragedDCA
 * @param configPtr `usize`
 * @param statePtr `usize`
 */
export declare function initializeLeveragedDCA(configPtr: number, statePtr: number): void;
/**
 * assembly/math/transitionLeveragedDCAGBMMerton
 * @param configPtr `usize`
 * @param statePtr `usize`
 * @param month `i32`
 */
export declare function transitionLeveragedDCAGBMMerton(configPtr: number, statePtr: number, month: number): void;
/**
 * assembly/math/simulateMonthlyReturn
 * @param growthRate `f64`
 * @param volatility `f64`
 * @returns `f64`
 */
export declare function simulateMonthlyReturn(growthRate: number, volatility: number): number;
/**
 * assembly/math/simulateJumpReturn
 * @returns `f64`
 */
export declare function simulateJumpReturn(): number;
