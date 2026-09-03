/**
 * Copywriting Helpers - Dynamic Text Generation
 * Generates all copywriting text dynamically from config values
 */

/**
 * Get config value formatters and text generators
 */
const CopywritingHelpers = {
    /**
     * Get effective borrowing rate description
     */
    getInterestRateText() {
        return `${getEffectiveBorrowingRate(STANDARD_MODE_DEFAULTS.PRIME_RATE, STANDARD_MODE_DEFAULTS.SPREAD_RATE)}%`;
    },

    /**
     * Get prime rate text
     */
    getPrimeRateText() {
        return `${STANDARD_MODE_DEFAULTS.PRIME_RATE}%`;
    },

    /**
     * Get spread text
     */
    getSpreadRateText() {
        return `${STANDARD_MODE_DEFAULTS.SPREAD_RATE}%`;
    },

    /**
     * Get growth rate text
     */
    getGrowthRateText() {
        return `${STANDARD_MODE_DEFAULTS.GROWTH_RATE}%`;
    },

    /**
     * Get volatility text
     */
    getVolatilityText() {
        return `${STANDARD_MODE_DEFAULTS.VOLATILITY}%`;
    },

    /**
     * Get margin call threshold text
     */
    getMarginCallText() {
        return `${STANDARD_MODE_DEFAULTS.MARGIN_CALL_LTV}%`;
    },

    /**
     * Get inflation rate text
     */
    getInflationText() {
        return `${STANDARD_MODE_DEFAULTS.INFLATION_RATE}%`;
    },

    /**
     * Get max LTV text
     */
    getMaxLTVText() {
        return `${STANDARD_MODE_DEFAULTS.MAX_LTV}%`;
    },

    /**
     * Calculate spread between growth and effective borrowing rate
     */
    getSpreadText() {
        return `${STANDARD_MODE_DEFAULTS.GROWTH_RATE - getEffectiveBorrowingRate(STANDARD_MODE_DEFAULTS.PRIME_RATE, STANDARD_MODE_DEFAULTS.SPREAD_RATE)}%`;
    },

    /**
     * Get number of simulations text
     */
    getSimulationCountText() {
        return UI_CONSTANTS.SIMULATION_COUNT.toLocaleString();
    },

    /**
     * Get base case simulations text
     */
    getBaseCaseSimulationsText() {
        return UI_CONSTANTS.BASE_CASE_SIMULATIONS.toLocaleString();
    },

    /**
     * Get mode description for Standard Mode
     */
    getModeStandardDescription() {
        return `<p><strong>Standard Mode:</strong> The simulator starts from a research-backed baseline for the monthly-deposit and target-LTV framework; Custom Mode allows adjustment of additional parameters.</p>`;
    },

    /**
     * Get mode description for Custom Mode
     */
    getModeCustomDescription() {
        return `<p><strong>Custom Mode:</strong> All key inputs are unlocked for testing different monthly budgets, borrowing costs, expected returns, volatility assumptions, and liquidation thresholds without changing the core logic for deposits and target LTV.</p>`;
    },

    /**
     * Get the constant leverage preamble markup
     */
    getConstantPreambleHtml() {
        return `
                  <h3 class="section-title-center">As Close to Ideal as Possible: Leveraged DCA</h3>
            <p>
                <strong>Leveraged DCA is DCA with two additions: maintaining a target LTV and avoiding voluntary sales.</strong> The same amount is deposited every month. How much gets bought depends on where LTV sits relative to target.
            </p>

            <h4 class="section-title-left">Working Example</h4>
            <p>
                Monthly budget of $1,000, target LTV of 50% (2:1 leverage). At target, every $1 of equity supports $1 of debt, so the baseline purchase is $2,000 ($1,000 deposit + $1,000 borrowing):
            </p>
            <ul class="compact-list">
                <li><strong>Good month (portfolio up):</strong> Growth pushed LTV below target. The $1,000 budget pays down debt, pushing LTV further below target. The simulator then borrows and buys <strong>more than $2,000</strong> in securities to restore LTV to 50%.</li>
                <li><strong>Okay month (flat/slightly down):</strong> LTV drifted near target. $1,000 pays down debt, simulator borrows to buy <strong>~$2,000</strong>.</li>
                <li><strong>Bad month (portfolio crashed):</strong> LTV is above target. The $1,000 budget reduces debt, modestly improving LTV. No new securities are purchased.</li>
            </ul>

            <div class="box box--info">
                <h3 class="section-title-left">Portfolio Modeling Assumption</h3>
                <div class="info-box-content">
                    The simulator models the portfolio as a single asset with constant drift and volatility. This requires a <strong>fixed allocation in the underlying portfolio</strong> (e.g., 60% equities, 40% bonds). A balanced fund that rebalances internally (e.g., VBAL) satisfies this assumption.
                </div>
            </div>


            <h3 class="section-title-center">How Strategies Compare</h3>
            <table class="comparison-table">
                <thead>
                    <tr class="comparison-table-header">
                        <th class="comparison-table-header"></th>
                        <th class="comparison-table-header">Simple</th>
                        <th class="comparison-table-header">Recoverable Risk</th>
                        <th class="comparison-table-header">Excess Returns</th>
                        <th class="comparison-table-header">Efficient</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="comparison-table-row">
                        <td>Market Index DCA</td>
                        <td class="cell-green">Yes</td>
                        <td class="cell-green">Yes</td>
                        <td class="cell-neutral">N/a (Baseline)</td>
                        <td class="cell-green">Yes</td>
                    </tr>
                    <tr class="comparison-table-row">
                        <td>Conservative Mutual Fund</td>
                        <td class="cell-green">Yes</td>
                        <td class="cell-green">Yes (Usually)</td>
                        <td class="cell-red">No (After fees)</td>
                        <td class="cell-red">No</td>
                    </tr>
                    <tr class="comparison-table-row">
                        <td>Day Trading</td>
                        <td class="cell-red">No</td>
                        <td class="cell-red">No</td>
                        <td class="cell-red">No (Usually)</td>
                        <td class="cell-red">No</td>
                    </tr>
                    <tr class="comparison-table-row">
                        <td>Private Wealth</td>
                        <td class="cell-orange">Kinda (Barriers to entry and exit)</td>
                        <td class="cell-orange">It depends</td>
                        <td class="cell-orange">It depends</td>
                        <td class="cell-orange">It depends</td>
                    </tr>
                    <tr class="comparison-table-row">
                        <td>Leveraged DCA</td>
                        <td class="cell-orange">Kinda</td>
                        <td class="cell-orange">Kinda (LTV needs monitoring)</td>
                        <td class="cell-green">Yes (Usually)</td>
                        <td class="cell-orange">Kinda (Interest is tax deductible)</td>
                    </tr>
                    <tr class="comparison-table-row">
                        <td>US Congress</td>
                        <td class="cell-red">No</td>
                        <td class="cell-green">Yes</td>
                        <td class="cell-green">Yes</td>
                        <td class="cell-green">Yes</td>
                    </tr>
                </tbody>
            </table>

            <h3 class="section-title-center">What the Simulator Calculates</h3>
            <p>
                <strong>Given a margin account, monthly budget, and a time horizon, the question becomes: what's the maximum LTV that can be responsibly maintained?</strong>
            </p>
            <p>
                Too low and there are low chances of excess returns. Too high and liquidation happens in the first major crash. The simulator runs thousands of randomized market scenarios at a given target LTV to estimate outcome probabilities.
            </p>
            <p>
                <strong>In general, over a long time horizon, more leverage means higher returns.</strong> The slider starts at the base strategy (0% target LTV) and can be moved up to explore higher borrowing levels interactively after running the simulation.
            </p>


        `;
    },

    /**
     * Get the lifecycle preamble markup
     */
    getLifecyclePreambleHtml() {
        return `
            <div class="box box--normal box--tight">
                <strong>Placeholder:</strong> This section is a placeholder. Lifecycle investing is not implemented.
            </div>
        `;
    },

    /**
     * Get simulation error message
     */
    getSimulationErrorMessage(message) {
        return `Simulation failed: ${message}`;
    },

    /**
     * Format strategy summary narrative with current values
     */
    getStrategySummaryNarrative(targetLTV, survivalRate, medianRealWealth, benchmarkMedian, delta) {
        const deltaPrefix = delta >= 0 ? '+' : '-';
        return {
            strategy: `The selected strategy maintains a target LTV of <strong>${(targetLTV * 100).toFixed(1)}%</strong> while the portfolio evolves through monthly market movements and deposits.`,
            outcomes: `This allocation results in a <strong>${survivalRate.toFixed(1)}%</strong> probability of survival. In the expected case, real wealth (in today's purchasing power) is <strong>$${medianRealWealth.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong>.`,
            baseline: `DCA Baseline Comparison: The equivalent no-leverage strategy would likely produce <strong>$${benchmarkMedian.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong> in real wealth.`,
            leverageImpact: `Leverage Impact: ${deltaPrefix}$${Math.abs(delta).toLocaleString(undefined, {maximumFractionDigits: 0})}`
        };
    },

    /**
     * INTERNAL: Classify strategy based on risk metrics (pure logic, no formatting)
     * Returns: { status, category, spread, ... } without formatting
     */
    _classifyStrategy(trinaryStats) {
        if (!trinaryStats) return null;
        
        const { ruinPercent, suckerPercent, profitPercent } = trinaryStats;
        const spreadPercent = profitPercent - suckerPercent;
        
        // Classification thresholds
        const POINTLESS_CEILING = 10.0;
        const STRONG_FLOOR = 20.0;
        const ACCEPTABLE_RUIN_THRESHOLD = 5.0;
        
        // Classification logic:
        // - DANGEROUS: Any ruin > 5% is unacceptable
        // - POINTLESS: Spread < 10% (even if ruin is low, no edge)
        // - MARGINAL: Ruin between 2-5% OR spread 10-20% (some edge but risky)
        // - STRONG: Ruin < 2% AND spread >= 20% (strong edge with contained risk)
        
        const isDangerous = ruinPercent > ACCEPTABLE_RUIN_THRESHOLD;
        const isPointless = spreadPercent < POINTLESS_CEILING && !isDangerous;
        const isStrong = spreadPercent >= STRONG_FLOOR && ruinPercent < 2.0;
        const isMarginal = !isDangerous && !isStrong && !isPointless;
        
        let classification = {
            status: 'MARGINAL',
            isDangerous,
            isPointless,
            isStrong,
            isMarginal,
            spread: spreadPercent
        };
        
        if (isDangerous) {
            classification.status = 'DANGEROUS';
        } else if (isPointless) {
            classification.status = 'POINTLESS';
        } else if (isStrong) {
            classification.status = 'STRONG';
        } else {
            classification.status = 'MARGINAL';
        }
        
        return classification;
    },

    /**
     * INTERNAL: Generate fix suggestions based on classification (pure logic)
     * Returns: array of fix strings or null
     */
    _suggestFixes(classification, trinaryStats) {
        const { ruinPercent, suckerPercent, profitPercent } = trinaryStats;
        let fixes = [];
        
        if (classification.isDangerous) {
            fixes.push("<strong>Reduce the Loan Amount.</strong> Borrowed capital is too large relative to the safety buffer. Borrowing less than a third of portfolio value provides a more conservative position.");
            fixes.push("<strong>Add More Collateral.</strong> Additional cash deposits without further borrowing strengthen the cushion against margin calls.");
            fixes.push("<strong>Increase the Monthly Deposit.</strong> Larger deposits reduce the target-LTV exposure more quickly before a crash occurs. Longer leverage increases ruin risk.");
        } else if (classification.isPointless) {
            fixes.push("<strong>Check the Interest Rate.</strong> Annual interest above 7-8% rarely supports leverage mathematically. A lower-cost loan or margin product may be more suitable.");
            fixes.push("<strong>Increase the Monthly Deposit.</strong> Larger deposits make debt a shrinking percentage of portfolio value.");
            fixes.push("<strong>Extend the Time Horizon.</strong> With a horizon under 10 years, short-term volatility can overwhelm long-term gains. Leverage needs time to compound.");
        } else if (classification.isMarginal) {
            fixes.push("<strong>Lower the LTV by 5%.</strong> A small reduction in borrowed capital can increase the spread by reducing interest costs and ruin risk together.");
            fixes.push("<strong>Maintain the Monthly Deposit.</strong> Consistent deposits support the target-LTV mechanism and keep the strategy invested through market cycles.");
            fixes.push("<strong>Test Interest Rate Risk.</strong> A 1% increase in the interest rate provides a useful fragility test. A shift to \"Pointless\" indicates insufficient cushion.");
        }
        
        return fixes.length > 0 ? fixes : null;
    },

    /**
     * Generate formatted verdict from trinary statistics
     * Wraps internal _classifyStrategy() and _suggestFixes() for presentation
     */
    generateVerdict(trinaryStats) {
        if (!trinaryStats) return null;
        const spread = trinaryStats.profitPercent - trinaryStats.suckerPercent;
        return {
            status: 'RESULTS_AVAILABLE',
            color: '#333333',
            icon: '',
            title: 'Simulation results',
            message: '',
            ruinPercent: trinaryStats.ruinPercent,
            suckerPercent: trinaryStats.suckerPercent,
            profitPercent: trinaryStats.profitPercent,
            spread,
            fixSuggestion: []
        };
    },

    /**
     * Get success criteria table headers
     */
    getSuccessCriteriaHeaders() {
        return { outcome: 'Outcome', goal: 'Target Goal', current: 'Current Result', status: 'Status' };
    },

    /**
     * Get success criteria labels
     */
    getSuccessCriteriaLabel(type) {
        const labels = {
            ruin: 'Ruin',
            sucker: 'Sucker',
            profit: 'Profit'
        };
        return labels[type] || '';
    },

    /**
     * Get the canonical outcome definition
     */
    getOutcomeDescription(type) {
        const descriptions = {
            ruin: 'Ended with real net worth below total real deposits (lost money).',
            sucker: 'Ended strictly above total real deposits but underperformed DCA.',
            profit: 'Ended strictly above total real deposits and outperformed the DCA baseline in real terms.'
        };
        return descriptions[type] || '';
    },

    /**
     * Get success criteria thresholds text
     */
    getSuccessCriteriaThreshold(type) {
        const thresholds = {
            ruin: '≤ 2%',
            sucker: 'Lower is Better',
            profit: '≥ 20% Spread*'
        };
        return thresholds[type] || '';
    },

    /**
     * Get success criteria note
     */
    getSuccessCriteriaNoteText() {
        return '*Spread = Profit % minus Sucker %. A 51/49 split is a coin flip; a 60/40 split is a strategy.';
    },

    /**
     * Get strategy improvement header
     */
    getFixStrategyHeaderText() {
        return 'Ways to Improve the Strategy';
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.CopywritingHelpers = CopywritingHelpers;
}
