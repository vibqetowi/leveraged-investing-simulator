# Simulator Architecture & Module Contracts

## Data Flow

```text
index.html
  -> calculatorHandler.js (reads UI, builds config, requests sims)
  -> simulationOrchestrator.js
      1. Pre-compute deposit and LTV schedules (see Schedule Optimization)
      2. Resolve (oscillator, tailModel) selection to a providerId (see Composite Provider Pattern)
      3. Spawn one worker per strategy
      -> simulationWorker.js (one per strategy)
          1. Load sim.wasm, pass providerId as a plain integer
          2. Run 10,000 independent scenarios through sim
          3. Pass raw paths to stats.wasm
          4. Return stats result to orchestrator
       copywritingHelper.js (formats for display only)
  <- charts and summaries on index.html
```

Each worker owns one strategy run. A strategy run contains many independent scenarios (e.g., 10,000). Each scenario contains a complete path from month zero through the final month.

## Composite Provider Pattern

Each oscillator + tail/shock model combination (e.g. GBM paired with Merton jumps) is precompiled into its own transition function inside math.ts, not assembled dynamically at runtime. No `WebAssembly.Table` or `call_indirect` crosses the JS/WASM boundary; selection is a single integer.

```text
index.html (Custom Mode)          orchestrator.js                  sim.wasm                     math (PROVIDERS array)
    |                                  |                                |                              |
    ├─ oscillator dropdown ──┐          |                                |                              |
    ├─ tail model dropdown ──┼─▶ read (oscillator, tailModel)            |                              |
    │                        |    ├─ look up providerId in flat map      |                              |
    │                        |    │   PROVIDER_ID_MAP["gbm+merton"] = 1  |                              |
    │                        |    ├─ build deposit schedule              |                              |
    │                        |    ├─ build LTV schedule                  |                              |
    │                        |    ├─ spin up worker with providerId +    |                              |
    │                        |    │   schedules + config                 |                              |
    │                        |    │                                     |                              |
    │                        |    │   worker instantiates sim ──────────▶ runSimulation(providerId)      |
    │                        |    │                                     ├─ getSimulationMethod(providerId) ▶ PROVIDERS[providerId]
    │                        |    │                                     │   invokes composite function ──▶ transition_gbm_merton_const
    │                        |    │                                     ◀──────── return raw state paths  |
```

New combos ship as new precompiled composite functions appended to `PROVIDERS`, plus a new entry in `PROVIDER_ID_MAP`. `sim.wasm` never changes.

## State Vector

The sim holds this struct in WASM memory. Math functions read and mutate it in place.

| Field | Type | Purpose | Model Usage |
|-------|------|---------|-------------|
| `drift` | f64 | Expected return μ | Initial condition. MS-GARCH overwrites when regime switches. |
| `vol` | f64 | Conditional variance σ² | Initial condition. GARCH/MS-GARCH overwrites every month. |
| `prev_return` | f64 | Lagged innovation ε_{t-1} | GARCH recursion. |
| `regime` | u32 | Latent regime index s_t | MS-GARCH transitions it. Single-regime models ignore. |
| `securities` | f64[] | Portfolio value path | All models write output here. |
| `debt` | f64[] | Loan balance path | All models write output here. |
| `target_ltv` | f64 | Target LTV ratio | Constant strategy ignores. Lifecycle updates it monthly. |
| `prime_rate` | f64 | Current prime rate | Interest = prime + spread. Stochastic in future. |
| `inflation` | f64 | Current inflation rate | Inflation-adjusted deposits read this. |

The sim's position in the deposit and LTV schedule arrays is the month index. No separate month counter is needed.

## Schedule Optimization

The orchestrator pre-computes deterministic, path-independent schedules once before spawning any workers:

```javascript
// orchestrator.js
const deposits = new Float64Array(nMonths);
for (let t = 0; t < nMonths; t++) {
  deposits[t] = budget * Math.pow(1 + inflation, t / 12);
}

const ltvSchedule = new Float64Array(nMonths);
for (let t = 0; t < nMonths; t++) {
  ltvSchedule[t] = targetLTV; // or lifecycle decay
}
```

## Monthly Step Order

Each month in the sim loop, the math function executes:

1. **Stochastic Transition:** Draw returns using current `drift`, `vol`, `regime`. Apply to `securities`.
2. **Apply Interest:** `debt *= (1 + (prime_rate + spread) / 12)`
3. **Margin Check:** If `securities / debt` ratio breaches margin threshold, force liquidation or trigger margin call.
4. **Deposit:** Read `deposits[month]`, subtract from `debt`.
5. **Buy / Restore LTV:** Read `ltv_schedule[month]`, rebalance `securities` and `debt` to hit target LTV.

The sim calls `runSimulation(providerId)`, which dispatches to `PROVIDERS[providerId]` inside math.ts and invokes that composite function directly for `(state_ptr, config_ptr, deposits_ptr, ltv_schedule_ptr, month)` each step. The composite function handles all five steps internally, including any tail/shock overlay (e.g. Merton jumps). The sim records `securities` and `debt` after each step into the output arrays.

## Strategy Mapping

Merton is a jump-diffusion overlay on an oscillator, not a standalone oscillator, so combos are named `transition_{oscillator}_{tailModel}_{depositModel}`. The `transition_merton_const` row from earlier docs is reframed below as GBM + Merton, matching what the code actually computes.

| Oscillator | Tail Model | Deposit | Target LTV | Function Name | Provider ID | State Var Changes | Status |
|------------|-----------|---------|------------|---------------|-------------|-------------------|--------|
| GBM | None | Constant | Constant | `transition_gbm_none_const` | 0 | drift/vol unchanged | Implemented |
| GBM | Merton | Constant | Constant | `transition_gbm_merton_const` | 1 | drift/vol unchanged | Implemented |

## Module Contracts

### sim.wasm

**Responsibilities:**

- Receive initial state, providerId, config, and read-only schedules.
- Iterate through configured scenarios and months.
- Dispatch to the composite transition function selected by `providerId` for each step.
- Record the state returned by that behavior.
- Return raw state paths.

**Output Shape:** `scenarioCount * (monthCount + 1)` values per state variable.

### math

**Responsibilities:**

- Export one precompiled composite provider function per valid (oscillator, tailModel, deposit, targetLTV) combination, registered in a static `PROVIDERS` array indexed by `providerId`.
- Stochastic innovations and returns.
- Account or domain-state transitions.
- Model-specific state evolution (drift, vol, regime, prev_return).
- All five monthly steps (stochastic, interest, margin, deposit, buy), including any tail/shock overlay.

**Configuration:**

- Drift and volatility (initial conditions).
- GARCH parameters (ω, α, β).
- MS-GARCH regime transition matrix and per-regime parameters.
- Merton jump intensity and jump distribution.
- Spread (fixed; prime_rate is state).
- Inflation rate.
- Margin call LTV threshold.
- Random seed and random-state configuration.

### stats.wasm

**Responsibilities:**

- Nominal-to-real conversion.
- Final real wealth for every scenario.
- Mean, median, p90, and standard deviation.
- Survival and ruin measures.
- Real-wealth histogram bins.
- Monthly DCA net worth.
- Monthly average leveraged net worth.
- Monthly average securities and debt.
- Benchmark comparisons.
- Mutually exclusive Ruin, Sucker, and Profit categories.
- Strategy summaries and chart-ready arrays.

**Outcome Categories:** Defined from final real wealth and the configured benchmark. Counts must be mutually exclusive and sum to the scenario count. Survival is final real wealth greater than total real deposits. Equality is not survival.

### simulationWorker.js

**Responsibilities:**

1. Load sim.wasm and pass the resolved providerId.
2. Supply strategy configuration and schedules to sim.
3. Run the complete simulation (all scenarios, all months).
4. Receive the complete raw scenario tensor.
5. Pass the tensor to stats.wasm.
6. Return the stats result and strategy dimensions to the orchestrator.

Raw tensors remain inside the worker. The orchestrator never sees raw paths.

### simulationOrchestrator.js

**Responsibilities:**

- Receive validated simulation configuration from calculatorHandler.
- Pre-compute deposit and LTV schedules (see Schedule Optimization).
- Resolve the UI's (oscillator, tailModel) selection to a `providerId` via `PROVIDER_ID_MAP`.
- Create strategy jobs (one per strategy).
- Spawn workers with the resolved providerId, schedules, and config.
- Handle worker completion, errors, and timeouts.
- Collect stats results from all workers.
- Return the collection of strategy results.

### calculatorHandler.js

**Responsibilities:**

- Read and validate UI inputs, including the Custom Mode oscillator and tail model selectors.
- Construct simulation configuration.
- Request simulations through the orchestrator.
- Select a returned strategy result.
- Pass returned stats to the renderer.
- Use copywritingHelper.js for presentation text.

Charts consume arrays returned by stats.wasm directly.

#### UI Selection Mapping

Custom Mode exposes two independent selectors instead of a single hardcoded model:

- **Market Oscillator:** GBM (implemented); GARCH, MS-GARCH shown disabled as future options.
- **Tail/Shock Model:** None (implemented), Merton (implemented); other jump/tail models future.

calculatorHandler.js combines the two selections into a single `providerId` using a flat lookup table, e.g.:

```javascript
const PROVIDER_ID_MAP = {
  "gbm+none": 0,
  "gbm+merton": 1,
  // future: "garch+none": 4, "garch+merton": 5, ...
};
```

Only combos present in `PROVIDER_ID_MAP` are selectable; unimplemented combos remain disabled in the dropdowns until their composite provider ships in math.ts.

### copywritingHelper.js

**Responsibilities:**

- Format configuration and statistics already produced by the pipeline.
- Choose wording and formatting.

### index.html

Defines structure, labels, controls, and chart containers.

## Memory Layout

```c
struct SimState {
  f64 drift;           // 0
  f64 vol;             // 8
  f64 prev_return;     // 16
  f64 target_ltv;      // 24
  f64 prime_rate;      // 32
  f64 inflation;       // 40
  u32 regime;          // 48
};

struct Config {
  f64 omega, alpha, beta;         // GARCH params
  f64 kappa, theta, sigma_v, rho;  // Heston params (future)
  f64 jump_lambda, jump_mu, jump_sigma; // Merton params
  f64 spread;                      // prime + spread; spread is config, prime is state
  u32 model_id;                    // providerId: flat enum over (oscillator, tailModel, deposit, targetLTV) combos, see Strategy Mapping
};
```

Arrays (`securities[]`, `debt[]`, `deposits[]`, `ltv_schedule[]`) are passed as pointers + lengths. No embedded arrays in structs.

## Future Extensibility

Adding a new oscillator, tail model, or combo requires no changes to sim.wasm or the dispatch mechanism:

1. Write the new composite transition function in math.ts.
2. Append it to the `PROVIDERS` array with the next `providerId`.
3. Add the corresponding entry to `PROVIDER_ID_MAP` and enable the dropdown option(s) in Custom Mode.

| Feature | State Var | Config Item | Notes |
|---------|-----------|-------------|-------|
| Stochastic Prime | `prime_rate` (f64) | spread (f64) | Prime evolves via Vasicek/Hull-White. Spread fixed. |
| Variable Inflation | `inflation` (f64) | : | Inflation autoregression. Current: constant. |
| Regime Transition Matrix | none (stored in config) | P[K][K] | 2x2 for now, expandable. |

## Required Invariants

- Every scenario and every month appears in the raw output.
- No module silently changes the meaning or units of an array.
- Serialization layouts, dimensions, and units are documented and shared by all modules.