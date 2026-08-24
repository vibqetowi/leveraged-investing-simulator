# Simulator Data Flow

## Current Pipeline

```text
index.html
  -> calculatorHandler.js
      1. Reads visible UI inputs
      2. Uses Standard Mode defaults or Custom Mode selections
      3. Resolves the selected oscillator/jump pair to a WASM provider id
  -> simulationOrchestrator.js
      1. Builds one job per target-LTV strategy
      2. Passes the same provider id and constant run inputs to each worker
  -> simulationWorker.js
      1. Loads sim.wasm and stats.wasm
      2. Marshals inputs into sim.wasm memory
      3. Calls runSimulation(providerId)
      4. Passes the raw tensor to stats.wasm
  -> charts + summaries on index.html
```

The code currently follows a simple rule: **account mechanics are constant, while the market path generator is selectable**.

## What Is Selectable Today

These controls are surfaced only in **Custom Mode**:

| Dimension | UI Control | Current Options | Notes |
|-----------|------------|-----------------|-------|
| Oscillator | Dropdown | `GBM` | Base diffusion process compiled into WASM. |
| Jump Process | Dropdown | `None`, `Merton Jump-Diffusion` | Optional jump overlay compiled into WASM. |

These items are **not** selectors today:

| Dimension | Current Behavior |
|-----------|------------------|
| Target LTV rule | Constant target per strategy bin |
| Interest model | Constant input over the run |
| Inflation model | Constant input over the run |

Future oscillator choices such as GARCH can be added later without changing the UI shape or the account-transition logic.

## Provider Mapping

`calculatorHandler.js` resolves the Custom Mode dropdowns to the provider id expected by WASM:

| Oscillator | Jump | Provider Id |
|------------|------|-------------|
| `gbm` | `none` | `0` |
| `gbm` | `merton` | `1` |

`Standard Mode` does not expose these controls and always uses `STANDARD_MODE_DEFAULTS.MODEL_ID`.

## WASM Runtime Contract

### `assembly/index.ts`

- Reads the scalar input buffer.
- Resolves `providerId` with `getSimulationMethod(providerId)`.
- Iterates all scenarios and months.
- Stores the three state paths in a raw output tensor.

### `assembly/math.ts`

The compiled providers currently share the same account mechanics:

1. Initialize securities and debt from starting equity and target LTV.
2. Apply the monthly market move from the selected oscillator.
3. Optionally apply the selected jump overlay.
4. Accrue debt interest.
5. Apply the margin-call rule.
6. Apply the monthly deposit.
7. Borrow and buy securities to restore the target LTV.

The only runtime difference between provider `0` and provider `1` is whether the Merton jump factor is applied after the GBM step.

## State vs Input

The simulator's evolving WASM state is intentionally small:

| State Slot | Meaning |
|------------|---------|
| `0` | Securities value |
| `1` | Debt value |
| `2` | Liquidation flag |

Everything else is a fixed run input for the current implementation:

- initial equity
- target LTV
- monthly budget
- monthly borrowing rate
- years
- volatility
- growth
- inflation
- margin call LTV
- scenario count

## Invariants

- Every strategy run uses one provider id for the entire run.
- Custom Mode model selection changes only the market generator, not the debt-management logic.
- Standard Mode hides model-selection details.
- Serialization layout between `calculatorHandler.js`, `simulationWorker.js`, `assembly/index.ts`, and `assembly/stats.ts` must remain aligned.
