import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadOrchestrator() {
    const source = fs.readFileSync(path.join(ROOT, 'scripts/simulationOrchestrator.js'), 'utf8');
    const context = {
        WebAssembly,
        Worker: class Worker {},
        Float64Array,
        Math,
        Number,
        Promise,
        performance: { now: () => 0 },
        console,
        setTimeout,
        clearTimeout,
        UI_CONSTANTS: { NUM_STRATEGIES: 21 },
        CopywritingHelpers: { getSimulationErrorMessage: (message) => message },
        alert: () => {}
    };
    context.globalThis = context;
    vm.runInNewContext(source, context, {
        filename: path.join(ROOT, 'scripts/simulationOrchestrator.js')
    });
    return context;
}

describe('generateLTVSteps', () => {
    it('starts at 0 and produces 2% increments up to 50% with floor(50/20) = 2', () => {
        const context = loadOrchestrator();
        const steps = context.generateLTVSteps(50);
        expect(steps[0]).toBe(0);
        expect(steps).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50]);
        expect(steps[steps.length - 1]).toBe(50);
    });

    it('uses 2% steps for a 40% max LTV (floor(40/20) = 2)', () => {
        const context = loadOrchestrator();
        const steps = context.generateLTVSteps(40);
        expect(steps).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40]);
    });

    it('uses 1% step for 33% (floor(33/20) = 1) and ends cleanly at 33%', () => {
        const context = loadOrchestrator();
        const steps = context.generateLTVSteps(33);
        expect(steps[0]).toBe(0);
        expect(steps).toContain(1);
        expect(steps).toContain(32);
        expect(steps[steps.length - 1]).toBe(33);
    });

    it('keeps the base case explicit in a low max LTV scenario (floor(20/20) = 1)', () => {
        const context = loadOrchestrator();
        const steps = context.generateLTVSteps(20);
        expect(steps[0]).toBe(0);
        expect(steps).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });
});
