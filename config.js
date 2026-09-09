/**
 * Configuration Management for Leveraged Investing Simulator
 * Contains all assumption constants and UI defaults for testing lump sum vs DCA strategies
 */

// IDs for complete precompiled simulator compositions.
const SIMULATOR_IDS = {
    GBM_NONE_CONST_CONST: 0,
    GBM_MERTON_CONST_CONST: 1
};

// Custom Mode resolves its two visible mechanism selectors to one compiled simulator.
const PROVIDER_ID_MAP = {
    'gbm+none': SIMULATOR_IDS.GBM_NONE_CONST_CONST,
    'gbm+merton': SIMULATOR_IDS.GBM_MERTON_CONST_CONST
};

// UI-facing option lists for the Custom Mode oscillator/tail model selectors
const OSCILLATORS = {
    GBM: { id: 'gbm', label: 'Geometric Brownian Motion (GBM)', implemented: true },
    GARCH: { id: 'garch', label: 'GARCH', implemented: false },
    MSGARCH: { id: 'msgarch', label: 'MS-GARCH', implemented: false }
};

const TAIL_MODELS = {
    NONE: { id: 'none', label: 'None', implemented: true },
    MERTON: { id: 'merton', label: 'Merton Jump-Diffusion', implemented: true }
};

// Standard Mode Default Values (Research-backed assumptions)
const STANDARD_MODE_DEFAULTS = {
    SIMULATOR: {
        id: SIMULATOR_IDS.GBM_MERTON_CONST_CONST,
        name: 'sim_gbm_merton_const_const',
        oscillator: 'gbm',
        tailModel: 'merton',
        depositModel: 'constant',
        ltvModel: 'constant'
    },
    PERIOD_YEARS: 30,
    INFLATION_RATE: 3.5,      // Hardcoded: Long-term inflation expectation (%)
    PRIME_RATE: 6.0,          // Benchmark prime rate (%)
    SPREAD_RATE: 1.0,         // Lender spread above prime (%)
    INTEREST_RATE: 7.0,       // Effective borrowing rate = prime + spread (%)
    GROWTH_RATE: 10,         // Historical S&P 500 return (%)
    VOLATILITY: 16.5,         // Standard deviation of annual returns (%)
    MARGIN_CALL_LTV: 60.0,    // Conservative liquidation threshold (%)
    MAX_LTV: 50             // Maximum LTV allowed in Standard Mode (%)
};

function getEffectiveBorrowingRate(primeRate = STANDARD_MODE_DEFAULTS.PRIME_RATE, spreadRate = STANDARD_MODE_DEFAULTS.SPREAD_RATE) {
    return primeRate + spreadRate;
}

// Aspirational Config struct fields (see documentation/DataFlow.md "Memory Layout").
// Not yet wired to wasm; math.ts still uses a fixed Merton jump distribution and no GARCH/Heston.
const GARCH_PARAMS_DEFAULTS = {
    OMEGA: 0.00001,   // long-run variance constant
    ALPHA: 0.08,      // weight on the most recent squared shock
    BETA: 0.90        // weight on prior conditional variance (persistence)
};

const HESTON_PARAMS_DEFAULTS = {
    KAPPA: 2.0,       // speed of mean reversion of variance
    THETA: 0.04,      // long-run variance level
    SIGMA_V: 0.3,     // volatility of variance ("vol of vol")
    RHO: -0.7         // correlation between asset and variance shocks
};

const MERTON_PARAMS_DEFAULTS = {
    JUMP_LAMBDA: 0.125, // expected jumps per year (~once per 8 years, matches current hardcoded p=1/96 monthly)
    JUMP_MU: -0.225,    // mean jump size (log-return), midpoint of current -15% to -30% range
    JUMP_SIGMA: 0.075   // jump size volatility
};

// Default Input Values
const DEFAULT_INPUTS = {
    LOAN_PERIOD: STANDARD_MODE_DEFAULTS.PERIOD_YEARS,
    MONTHLY_BUDGET: 500,       // Default monthly budget ($)
    STARTING_DEPOSIT: 10000,   // Default collateral value ($)
    STARTING_LTV: 20.0         // Default starting LTV (%)
};

// UI Constants
const UI_CONSTANTS = {
    BASE_CASE_SIMULATIONS: 20000,        // Non leverage case simulation count
    DEFAULT_RISK_PROFILES: {
        aggressive: 99.5,                   // 99% survival rate target
        median: 99.8,                       // 99.8% survival rate target
        conservative: 99.99                  // 99.99% survival rate target
    },
    SIMULATION_COUNT: 10000,              // Number of Monte Carlo simulations per bin
    NUM_STRATEGIES: 21,                   // Number of payment strategies to test
    SURVIVAL_FILTER_THRESHOLD: 90,        // Only show strategies with survival >= 90%
    HISTOGRAM_BINS: 100,                   // Number of bins for histogram visualization
    WEALTH_PERCENTILES: {
        median: 50,                       // 50th percentile
        high: 90                          // 90th percentile
    },
    HISTOGRAM_COLORS: {
        ruin: '#B3261E',                  // Red for margin call/ruin outcomes
        underperformed: '#FDD835',        // Yellow for outcomes below benchmark
        overperformed: '#66BB6A',         // Light green for outcomes above benchmark
        benchmark: 'rgba(0, 0, 0, 0.6)',  // Black for benchmark baseline
        ruinOpacity: 0.8,                 // Opacity for ruin bar
        performanceOpacity: 0.6           // Opacity for performance bars
    }
};

/**
 * Calculate required WASM tensor buffer size for one worker.
 * Formula: raw header + state variables * scenarios * (months + 1)
 * 
 * WARNING: If you change simulation counts, the buffer must be large enough!
 */
function calculateRequiredBufferSize() {
    const rawHeaderSize = 9;
    const stateCount = 3;
    const months = DEFAULT_INPUTS.LOAN_PERIOD * 12;
    const maxScenarios = Math.max(
        UI_CONSTANTS.BASE_CASE_SIMULATIONS,
        UI_CONSTANTS.SIMULATION_COUNT
    );
    const totalRequired = rawHeaderSize + stateCount * maxScenarios * (months + 1);
    const allocated = 24000000;
    
    return {
        required: totalRequired,
        allocated,
        isValid: totalRequired <= allocated,
        utilizationPercent: (totalRequired / allocated * 100).toFixed(1)
    };
}

// Validate buffer size on load
if (typeof window !== 'undefined') {
    const bufferInfo = calculateRequiredBufferSize();
    if (!bufferInfo.isValid) {
        console.error(
            `⚠️ BUFFER OVERFLOW WARNING!\n` +
            `Required: ${bufferInfo.required.toLocaleString()} f64 values\n` +
            `Allocated: ${bufferInfo.allocated.toLocaleString()} f64 values\n` +
            `Reduce simulation counts or increase the matching AssemblyScript buffers and rebuild.`
        );
    } else {
        console.log(
            `✓ Buffer size OK: ${bufferInfo.utilizationPercent}% utilized ` +
            `(${bufferInfo.required.toLocaleString()} / ${bufferInfo.allocated.toLocaleString()})`
        );
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.STANDARD_MODE_DEFAULTS = STANDARD_MODE_DEFAULTS;
    window.DEFAULT_INPUTS = DEFAULT_INPUTS;
    window.UI_CONSTANTS = UI_CONSTANTS;
    window.PROVIDER_ID_MAP = PROVIDER_ID_MAP;
    window.OSCILLATORS = OSCILLATORS;
    window.TAIL_MODELS = TAIL_MODELS;
    window.GARCH_PARAMS_DEFAULTS = GARCH_PARAMS_DEFAULTS;
    window.HESTON_PARAMS_DEFAULTS = HESTON_PARAMS_DEFAULTS;
    window.MERTON_PARAMS_DEFAULTS = MERTON_PARAMS_DEFAULTS;
    window.config = {
        STANDARD_MODE_DEFAULTS,
        DEFAULT_INPUTS,
        UI_CONSTANTS,
        PROVIDER_ID_MAP,
        OSCILLATORS,
        TAIL_MODELS,
        GARCH_PARAMS_DEFAULTS,
        HESTON_PARAMS_DEFAULTS,
        MERTON_PARAMS_DEFAULTS
    };
}

if (typeof globalThis !== 'undefined') {
    globalThis.STANDARD_MODE_DEFAULTS = STANDARD_MODE_DEFAULTS;
    globalThis.DEFAULT_INPUTS = DEFAULT_INPUTS;
    globalThis.UI_CONSTANTS = UI_CONSTANTS;
    globalThis.PROVIDER_ID_MAP = PROVIDER_ID_MAP;
    globalThis.OSCILLATORS = OSCILLATORS;
    globalThis.TAIL_MODELS = TAIL_MODELS;
    globalThis.GARCH_PARAMS_DEFAULTS = GARCH_PARAMS_DEFAULTS;
    globalThis.HESTON_PARAMS_DEFAULTS = HESTON_PARAMS_DEFAULTS;
    globalThis.MERTON_PARAMS_DEFAULTS = MERTON_PARAMS_DEFAULTS;
    globalThis.config = globalThis.config || {
        STANDARD_MODE_DEFAULTS,
        DEFAULT_INPUTS,
        UI_CONSTANTS,
        PROVIDER_ID_MAP,
        OSCILLATORS,
        TAIL_MODELS,
        GARCH_PARAMS_DEFAULTS,
        HESTON_PARAMS_DEFAULTS,
        MERTON_PARAMS_DEFAULTS
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        STANDARD_MODE_DEFAULTS, 
        UI_CONSTANTS, 
        DEFAULT_INPUTS,
        PROVIDER_ID_MAP,
        OSCILLATORS,
        TAIL_MODELS,
        GARCH_PARAMS_DEFAULTS,
        HESTON_PARAMS_DEFAULTS,
        MERTON_PARAMS_DEFAULTS,
        calculateRequiredBufferSize 
    };
}
