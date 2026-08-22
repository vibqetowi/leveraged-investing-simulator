# Simulator Data Flow and Module Contracts

## Purpose

This document defines the simulator's module boundaries and data contracts.

The system has four responsibilities:

1. `sim` executes repeated transitions.
2. `math` defines stochastic models and state transitions.
3. `stats` interprets the resulting paths.
4. JavaScript coordinates the modules and renders the returned view model.

The simulator is deliberately dumb. It must not know whether it is running a
leveraged-investing strategy, GBM, Merton jump-diffusion, MS-GARCH, or any future
model.

## Data Flow

```text
index.html
  -> calculatorHandler.js
  -> simulationOrchestrator.js
  -> simulationWorker.js
      -> selected math provider in sim.wasm
       -> sim.wasm execution engine
       -> stats.wasm aggregation
  <- stats result for one strategy
  <- simulationOrchestrator.js
  <- calculatorHandler.js
  <- charts and summaries
```

Each worker owns one strategy run. A strategy run contains many independent
scenarios, such as 10,000 scenarios. Each scenario contains a complete path
from month zero through the final month.

## Module Contracts

### `sim.wasm`: Generic Execution Engine

`sim.wasm` is a domain-agnostic execution engine.

It is responsible only for:

- receiving initial state and a configured model/transition interface;
- iterating through the configured scenarios and months;
- invoking the supplied behavior for each transition;
- recording the state returned by that behavior;
- returning raw state paths.

`sim` must not:

- choose or understand a financial strategy;
- know what securities, debt, drift, volatility, deposits, or LTV mean;
- implement interest, liquidation, purchases, or target-LTV rules;
- choose GBM, Merton, GARCH, or another stochastic model;
- calculate inflation or decide whether values are nominal or real;
- average, sort, calculate percentiles, classify outcomes, or create charts.

The runner records state generically:

```text
state[variable][scenario][month]

scenario = 0 .. scenarioCount - 1
month    = 0 .. monthCount
```

Every returned state variable must contain exactly:

```text
scenarioCount * (monthCount + 1)
```

values. `sim` must return every requested scenario and every month. A single
representative scenario is not a valid result.

The current raw buffer is a `Float64Array` with this layout:

```text
[status, months, scenarioCount, initialEquity, monthlyBudget,
 inflation, targetLTV, marginCallLTV, stateCount,
 state[0][scenario][month], state[1][scenario][month], ...]
```

State planes are contiguous and use scenario-major indexing:
`scenario * (monthCount + 1) + month`. The current state variables are
securities, debt, and a liquidation marker. Raw securities, debt, and wealth
are nominal; `stats` returns real-dollar chart and outcome values.

### `math`: Model and Transition Provider

`math` supplies the behavior executed by `sim`. The provider implementation is
compiled into the runnable `sim.wasm` artifact; the worker selects it by
provider ID and supplies its configuration. A separate `math.wasm` file is not
loaded at runtime.

It owns:

- scenario initialization;
- stochastic innovations and returns;
- account or domain-state transitions;
- model-specific state;
- serialization of state variables for the runner.

All behavior is configuration-driven. Configuration may include:

- drift and volatility;
- interest, inflation, and deposits;
- target LTV and margin threshold;
- jump intensity and jump distribution;
- GBM, Merton, MS-GARCH, or another model;
- strategy and liquidation rules;
- random seed and random-state configuration.

Model state may change during execution. For example, an MS-GARCH model may
read the current drift and volatility, update its regime and conditional
variance from the latest innovation, and provide new drift and volatility for
the next month. `sim` does not know that these variables exist. It only invokes
the supplied transition behavior and records the returned state.

Changing from GBM to Merton or MS-GARCH must change the selected model or its
configuration. It must not require changing the `sim` runner.

### `stats.wasm`: Path Interpretation

`stats.wasm` consumes the complete raw paths returned by `sim.wasm`, together
with configuration and benchmark data. It is the only module responsible for
interpretation and aggregation.

It computes the values required by the UI, including:

- nominal-to-real conversion, when raw paths are nominal;
- final real wealth for every scenario;
- mean, median, p90, and standard deviation;
- survival and ruin measures;
- real-wealth histogram bins;
- monthly DCA net worth;
- monthly average leveraged net worth;
- monthly average securities and debt;
- benchmark comparisons;
- mutually exclusive Ruin, Sucker, and Profit categories;
- strategy summaries and chart-ready arrays.

The stats input buffer is:

```text
[months, scenarioCount, initialEquity, monthlyBudget, inflation,
 benchmarkMedian, state[0][scenario][month], state[1][scenario][month],
 state[2][scenario][month]]
```

The output begins with status, months, total real deposits, survival rate,
median, p90, expected wealth, survivor count, margin-call count, and the
Ruin/Sucker/Profit counts. It then contains monthly securities/debt/net-worth
triples and final real wealth for every scenario. The browser receives this
stats result, not the raw tensor.

`stats` must consume all scenarios and all months. It must not infer missing
paths from scenario zero.

Survival is defined strictly as final real wealth greater than total real
deposits. Equality is not survival. The outcome categories are defined from
final real wealth and the configured benchmark. Their counts must be mutually
exclusive and sum to the scenario count.

### `simulationWorker.js`: Per-Strategy Composition

The worker composes the WASM modules for one strategy run.

It is responsible for:

1. loading `sim.wasm`, which contains the available math providers;
2. selecting the requested math provider and supplying its strategy
  configuration to `sim`;
4. receiving the complete raw scenario tensor;
5. passing the tensor to `stats.wasm`;
6. returning the stats result and strategy dimensions. Raw tensors remain
  inside the worker.

The worker does not calculate statistics, classify outcomes, or make strategy
decisions. It transfers data between modules.

### `simulationOrchestrator.js`: Coordination

The orchestrator creates and tracks workers, one per strategy. It is responsible
for:

- receiving validated simulation configuration;
- creating strategy jobs;
- starting workers and handling completion, errors, and timeouts;
- associating results with strategy identifiers;
- returning the collection of worker results.

It must not read DOM elements, implement financial formulas, aggregate paths,
calculate statistics, compare benchmarks, or classify outcomes.

### `calculatorHandler.js`: Input and Rendering Boundary

The calculator handler is responsible for:

- reading and validating UI inputs;
- constructing simulation configuration;
- requesting simulations through the orchestrator;
- selecting a returned strategy result;
- passing returned stats to the renderer.

It must not calculate averages, percentiles, histogram bins, classifications, or
monthly chart series. Charts consume arrays returned by `stats.wasm` directly.

The required visual outputs are:

1. a histogram of final real wealth;
2. a transparent overlaid area chart of monthly DCA net worth and average
   leveraged net worth;
3. a chart of monthly securities and debt;
4. a strategy summary using returned Ruin, Sucker, and Profit statistics.

### `index.html`: Markup Only

`index.html` defines structure, labels, controls, and chart containers. It must
not contain simulation, financial, stochastic, statistical, or classification
logic.

### `copywritingHelper.js`: Presentation Only

`copywritingHelper.js` formats configuration and statistics already produced by
the pipeline. It may choose wording and formatting, but it must not calculate or
infer financial outcomes, classifications, probabilities, or chart data.

## Required Invariants

- The same `sim` runner can execute any supplied model and strategy behavior.
- Evolving model state, including drift and volatility, belongs to `math`.
- Every scenario and every month appears in the raw output.
- All interpretation belongs to `stats`.
- JavaScript coordinates and renders; it performs no statistical work.
- No module silently changes the meaning or units of an array.
- Serialization layouts, dimensions, and units are documented and shared by all
  modules.
