/**
 * Full-scale performance benchmark for CI. Runs the real orchestrator -> worker -> WASM
 * pipeline (via node:worker_threads + tests/helpers/simulationWorkerNode.js, same bridge used by
 * tests/integration/orchestrator-worker-wasm.test.js) across several randomized configs at
 * production simulation counts, then writes a mean/range report to performance-report.log.
 *
 * Deliberately NOT part of `npm test` - a full-scale run is too slow for the regular suite.
 * Invoke directly with `npm run perf`. Override run count with PERF_RUN_COUNT=n.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUN_COUNT = Number(process.env.PERF_RUN_COUNT) || 10;
// Overridable only for local smoke-testing this script; CI always uses the real production counts.
const SIMULATION_COUNT = Number(process.env.PERF_SIMULATION_COUNT) || 10000;
const BASELINE_SIMULATION_COUNT = Number(process.env.PERF_BASELINE_SIMULATION_COUNT) || 20000;
const REPORT_PATH = path.join(ROOT, 'performance-report.log');
const orchestratorSource = fs.readFileSync(path.join(ROOT, 'scripts/simulationOrchestrator.js'), 'utf8');

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
        location: { hostname: 'localhost' }, // enables the orchestrator's dev-only perf tracing hooks
        UI_CONSTANTS: {
            NUM_STRATEGIES: 21,
            WEALTH_PERCENTILES: { retained: 90, median: 50, high: 90 },
            HISTOGRAM_BINS: 100
        },
        CopywritingHelpers: { getSimulationErrorMessage: (message) => message },
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
            const worker = new Worker(new URL('../helpers/simulationWorkerNode.js', import.meta.url), {
                type: 'module',
                name: options.name
            });
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

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
}

// Random but plausible inputs - production simulation counts are kept fixed (20000/10000),
// only the market/loan assumptions vary between runs.
function generateRandomConfig(index) {
    const years = randomInt(10, 30);
    const months = years * 12;
    const monthlyBudget = randomInt(200, 2000);
    const inflation = randomBetween(0.02, 0.05);
    const initialEquity = randomInt(5000, 50000);
    const deposits = new Float64Array(months + 1);
    for (let month = 0; month <= months; month++) {
        deposits[month] = monthlyBudget * Math.pow(1 + inflation, month / 12);
    }

    return {
        label: `config-${index + 1}`,
        initialEquity,
        loanAmount: 0,
        years,
        monthlyBudget,
        interestRate: 0.07,
        primeRate: 0.06,
        spreadRate: randomBetween(0.005, 0.02),
        growth: randomBetween(0.06, 0.14),
        volatility: randomBetween(0.10, 0.25),
        inflation,
        marginCallLTV: 0.60,
        maxLTV: randomBetween(0.10, 0.60),
        simulationCount: SIMULATION_COUNT,
        baselineSimulationCount: BASELINE_SIMULATION_COUNT,
        providerId: Math.random() < 0.5 ? 0 : 1,
        deposits,
        ltvSchedule: new Float64Array(months + 1).fill(0),
        totalRealDeposits: initialEquity + monthlyBudget * months,
        stateCount: 3
    };
}

function mean(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function formatMs(value) {
    return `${value.toFixed(1)}ms`;
}

function summarize(label, values) {
    return { label, mean: mean(values), min: Math.min(...values), max: Math.max(...values) };
}

async function runOneConfig(config) {
    const workerInstances = [];
    const runSimulationWithAdapter = loadOrchestrator();
    let phaseTimings = [];

    const wallStart = performance.now();
    const result = await runSimulationWithAdapter(config, {
        WorkerConstructor: createNodeWorkerConstructor(workerInstances),
        onPerfTrace: (entries) => { phaseTimings = entries; }
    });
    const wallTotal = performance.now() - wallStart;

    await Promise.all(workerInstances.map((worker) => worker.terminate()));

    if (!result) {
        throw new Error(`${config.label}: simulation returned null`);
    }

    const phaseMap = {};
    for (const entry of phaseTimings) {
        phaseMap[entry.name] = (phaseMap[entry.name] || 0) + entry.duration;
    }

    // Per-worker entries are named "strategy-N:run-simulation" / "strategy-N:run-stats"; roll them
    // up into one representative figure per config instead of tracking all 21-26 individually.
    const simDurations = phaseTimings.filter((e) => e.name.endsWith(':run-simulation')).map((e) => e.duration);
    const statsDurations = phaseTimings.filter((e) => e.name.endsWith(':run-stats')).map((e) => e.duration);

    return {
        label: config.label,
        config: {
            years: config.years,
            monthlyBudget: Math.round(config.monthlyBudget),
            growth: Number(config.growth.toFixed(4)),
            volatility: Number(config.volatility.toFixed(4)),
            maxLTV: Number(config.maxLTV.toFixed(4)),
            providerId: config.providerId,
            strategyCount: result.strategies.length
        },
        wallTotal,
        baselineWait: phaseMap['baseline-wait'] || 0,
        tier2Wait: phaseMap['tier2-wait'] || 0,
        aggregation: phaseMap['aggregation'] || 0,
        avgWorkerSimTime: simDurations.length ? mean(simDurations) : 0,
        avgWorkerStatsTime: statsDurations.length ? mean(statsDurations) : 0
    };
}

function buildReport(runs) {
    const lines = [];
    lines.push('Leveraged Investing Simulator - Performance Benchmark Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Runs: ${runs.length} (production simulation counts: 20000 baseline / 10000 per strategy)`);
    lines.push('');
    lines.push('Per-run results:');
    lines.push('-'.repeat(110));
    lines.push(['run', 'years', 'budget', 'growth', 'vol', 'maxLTV', 'provider', 'strategies', 'wall(ms)', 'baseline(ms)', 'tier2(ms)', 'agg(ms)'].join('\t'));
    for (const run of runs) {
        lines.push([
            run.label,
            run.config.years,
            run.config.monthlyBudget,
            run.config.growth,
            run.config.volatility,
            run.config.maxLTV,
            run.config.providerId,
            run.config.strategyCount,
            run.wallTotal.toFixed(1),
            run.baselineWait.toFixed(1),
            run.tier2Wait.toFixed(1),
            run.aggregation.toFixed(1)
        ].join('\t'));
    }
    lines.push('-'.repeat(110));
    lines.push('');
    lines.push('Summary (mean / range across all runs):');
    const metrics = [
        summarize('Total wall time', runs.map((r) => r.wallTotal)),
        summarize('Baseline tier wait', runs.map((r) => r.baselineWait)),
        summarize('Tier-2 parallel wait', runs.map((r) => r.tier2Wait)),
        summarize('Aggregation', runs.map((r) => r.aggregation)),
        summarize('Avg per-worker sim time', runs.map((r) => r.avgWorkerSimTime)),
        summarize('Avg per-worker stats time', runs.map((r) => r.avgWorkerStatsTime))
    ];
    for (const metric of metrics) {
        lines.push(`  ${metric.label.padEnd(28)} mean=${formatMs(metric.mean).padEnd(10)} range=[${formatMs(metric.min)} .. ${formatMs(metric.max)}]`);
    }
    lines.push('');
    return lines.join('\n');
}

async function main() {
    console.log(`[PerfBenchmark] Running ${RUN_COUNT} full-scale simulation configs...`);
    const runs = [];
    for (let i = 0; i < RUN_COUNT; i++) {
        const config = generateRandomConfig(i);
        console.log(`[PerfBenchmark] (${i + 1}/${RUN_COUNT}) years=${config.years} growth=${config.growth.toFixed(3)} volatility=${config.volatility.toFixed(3)} maxLTV=${config.maxLTV.toFixed(3)} providerId=${config.providerId}`);
        const run = await runOneConfig(config);
        console.log(`[PerfBenchmark] (${i + 1}/${RUN_COUNT}) total=${run.wallTotal.toFixed(1)}ms`);
        runs.push(run);
    }

    const report = buildReport(runs);
    fs.writeFileSync(REPORT_PATH, report, 'utf8');
    console.log(report);
    console.log(`[PerfBenchmark] Report written to ${REPORT_PATH}`);
}

main().catch((error) => {
    console.error('[PerfBenchmark] Failed:', error);
    process.exitCode = 1;
});
