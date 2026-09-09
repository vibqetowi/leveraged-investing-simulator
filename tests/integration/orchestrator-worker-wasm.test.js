import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const orchestratorSource = fs.readFileSync(
    path.join(ROOT, 'scripts/simulationOrchestrator.js'),
    'utf8'
);

function loadOrchestrator() {
    const context = {
        WebAssembly,
        Worker,
        Float64Array,
        Math,
        Number,
        Promise,
        performance,
        console,
        setTimeout,
        clearTimeout,
        UI_CONSTANTS: {
            NUM_STRATEGIES: 21
        },
        CopywritingHelpers: {
            getSimulationErrorMessage: (message) => message
        },
        alert: () => {}
    };
    context.globalThis = context;
    vm.runInNewContext(orchestratorSource, context, {
        filename: path.join(ROOT, 'scripts/simulationOrchestrator.js')
    });
    return context.runSimulationWithAdapter;
}

function createNodeWorkerConstructor(instances) {
    return class NodeWorker {
        constructor(_browserScript, options = {}) {
            const worker = new Worker(
                new URL('../../scripts/simulationWorkerNode.js', import.meta.url),
                { type: 'module', name: options.name }
            );
            instances.push(worker);
            this.worker = worker;
        }

        set onmessage(handler) {
            this.worker.on('message', (data) => handler({ data }));
        }

        set onerror(handler) {
            this.worker.on('error', handler);
        }

        postMessage(message) {
            this.worker.postMessage(message);
        }

        terminate() {
            return this.worker.terminate();
        }
    };
}

function createInputs(providerId) {
    const years = 1;
    const months = years * 12;
    const monthlyBudget = 500;
    const inflation = 0.035;
    const deposits = new Float64Array(months + 1);
    for (let month = 0; month <= months; month++) {
        deposits[month] = monthlyBudget * Math.pow(1 + inflation, month / 12);
    }

    return {
        initialEquity: 10000,
        loanAmount: 0,
        years,
        monthlyBudget,
        interestRate: 0.07,
        primeRate: 0.06,
        spreadRate: 0.01,
        growth: 0.10,
        volatility: 0.165,
        inflation,
        marginCallLTV: 0.60,
        maxLTV: 0.50,
        simulationCount: 10000,
        baselineSimulationCount: 20000,
        providerId,
        deposits,
        ltvSchedule: new Float64Array(months + 1).fill(0),
        totalRealDeposits: 10000 + monthlyBudget * months,
        stateCount: 3
    };
}

describe('orchestrator to worker to WASM integration', () => {
    it.each([
        [0, 'GBM without jumps'],
        [1, 'GBM with Merton jumps']
    ])('completes one LTV simulation for %s', async (providerId) => {
        const workerInstances = [];
        const runSimulationWithAdapter = loadOrchestrator();
        const result = await runSimulationWithAdapter(createInputs(providerId), {
            simulationCountOverride: 1,
            baselineSimulationCountOverride: 1,
            WorkerConstructor: createNodeWorkerConstructor(workerInstances)
        });

        expect(workerInstances).toHaveLength(21);
        expect(result).not.toBeNull();
        expect(result.benchmark).not.toBeNull();
        expect(result.strategies).toHaveLength(20);
        expect(result.benchmark.months).toBe(12);
        expect(result.benchmark.scenarios).toBe(1);
        expect(result.benchmark.finalWealthArray).toHaveLength(1);
        expect(Number.isFinite(result.benchmark.medianWealth)).toBe(true);
        expect(Number.isFinite(result.benchmark.expectedWealth)).toBe(true);
        result.strategies.forEach((strategy, index) => {
            expect(strategy.scenarios).toBe(1);
            expect(strategy.finalWealthArray).toHaveLength(1);
            expect(Number.isFinite(strategy.medianWealth)).toBe(true);
            expect(strategy.targetLTV).toBeCloseTo(0.5 * ((index + 1) / 20));
        });

        await Promise.all(workerInstances.map((worker) => worker.terminate()));
    }, 20000);
});
