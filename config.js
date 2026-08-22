/**
 * Configuration Management for Leveraged Investing Simulator
 * Contains all assumption constants and UI defaults for testing lump sum vs DCA strategies
 */

// Standard Mode Default Values (Research-backed assumptions)
const STANDARD_MODE_DEFAULTS = {
    MODEL_ID: 1,               // 0 = GBM, 1 = Merton jump-diffusion
    INFLATION_RATE: 3.5,      // Hardcoded: Long-term inflation expectation (%)
    INTEREST_RATE: 7.0,       // Prime + 1% spread (%)
    GROWTH_RATE: 10,         // Historical S&P 500 return (%)
    VOLATILITY: 16.5,         // Standard deviation of annual returns (%)
    MARGIN_CALL_LTV: 60.0,    // Conservative liquidation threshold (%)
    MAX_LTV: 50             // Maximum LTV allowed in Standard Mode (%)
};

// Default Input Values
const DEFAULT_INPUTS = {
    LOAN_PERIOD: 30,           // Default simulation period (years)
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
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        STANDARD_MODE_DEFAULTS, 
        UI_CONSTANTS, 
        DEFAULT_INPUTS,
        calculateRequiredBufferSize 
    };
}
