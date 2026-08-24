/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * assembly/index/getInputPtr
 * @returns `usize`
 */
export declare function getInputPtr(): number;
/**
 * assembly/index/getOutputPtr
 * @returns `usize`
 */
export declare function getOutputPtr(): number;
/**
 * assembly/index/getDepositsPtr
 * @returns `usize`
 */
export declare function getDepositsPtr(): number;
/**
 * assembly/index/getLtvSchedulePtr
 * @returns `usize`
 */
export declare function getLtvSchedulePtr(): number;
/**
 * assembly/index/runSimulation
 * @param providerId `i32`
 * @returns `i32`
 */
export declare function runSimulation(providerId: number): number;
