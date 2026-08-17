/**
 * Copywriting Helpers - Dynamic Text Generation
 * Generates all copywriting text dynamically from config values
 */

/**
 * Get config value formatters and text generators
 */
const CopywritingHelpers = {
    /**
     * Format percentage for display
     */
    formatPercent(value) {
        return `${value}%`;
    },

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
     * Get payment percentage text
     */
    getPaymentPercentageText() {
        return `${STANDARD_MODE_DEFAULTS.PAYMENT_PERCENTAGE}%`;
    },

    /**
     * Calculate spread between growth and effective borrowing rate
     */
    getSpreadText() {
        const spread = STANDARD_MODE_DEFAULTS.GROWTH_RATE - getEffectiveBorrowingRate(
            STANDARD_MODE_DEFAULTS.PRIME_RATE,
            STANDARD_MODE_DEFAULTS.SPREAD_RATE
        );
        return `${spread}%`;
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
     * Get number of strategies text
     */
    getNumStrategiesText() {
        return UI_CONSTANTS.NUM_STRATEGIES;
    },

    /**
     * Get total scenarios text (1 benchmark + strategies)
     */
    getTotalScenariosText() {
        return UI_CONSTANTS.NUM_STRATEGIES + ' scenarios (1 benchmark + ' + (UI_CONSTANTS.NUM_STRATEGIES - 1) + ' strategies)';
    },

    /**
     * Get default loan period text
     */
    getDefaultLoanPeriodText() {
        return DEFAULT_INPUTS.LOAN_PERIOD;
    },

    /**
     * Update all dynamic text in the page
     */
    updateAllDynamicText() {
        // Update all elements with data-config attributes
        document.querySelectorAll('[data-config-value]').forEach(element => {
            const configPath = element.getAttribute('data-config-value');
            const value = this.getConfigValue(configPath);
            if (value !== null) {
                element.textContent = value;
            }
        });
    },

    /**
     * Get config value by path (e.g., "STANDARD_MODE_DEFAULTS.INTEREST_RATE")
     */
    getConfigValue(path) {
        const parts = path.split('.');
        let value = window;
        for (const part of parts) {
            value = value[part];
            if (value === undefined) return null;
        }
        return value;
    },

    /**
     * Get mode description for Standard Mode
     */
    getModeStandardDescription() {
        return `<p><strong>Standard Mode:</strong> The simulator starts from a research-backed baseline for the monthly-deposit and target-LTV framework; Custom Mode allows you to adjust more parameters.</p>`;
    },

    /**
     * Get mode description for Custom Mode
     */
    getModeCustomDescription() {
        return `<p><strong>Custom Mode:</strong> All key inputs are unlocked so you can test different monthly budgets, borrowing costs, expected returns, volatility assumptions, and liquidation thresholds without changing the core logic for deposits and target LTV.</p>`;
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
            <p>
                <strong>Simulator Algorithm:</strong> apply the market return to the securities position. Accrue interest on debt. The monthly budget pays down debt directly. Recalculate LTV. If below target, borrow and buy securities until back at target; if at or above target, buy nothing.
            </p>

            <div class="info-box">
                The simulator models the portfolio as a single asset with constant drift and volatility. This requires a <strong>fixed allocation in the underlying portfolio</strong> (e.g., 60% equities, 40% bonds). A balanced fund that rebalances internally (e.g., VBAL) satisfies this assumption.
            </div>

            <h4 class="section-title-left">Working Example</h4>
            <p>
                Monthly budget of $1,000, target LTV of 50% (2:1 leverage). At target, every $1 of equity supports $1 of debt, so the baseline purchase is $2,000 ($1,000 deposit + $1,000 borrowing):
            </p>
            <ul class="compact-list">
                <li><strong>Good month (portfolio up):</strong> Growth pushed LTV below target. The $1,000 budget pays down debt, pushing LTV further below target. The simulator then borrows and buys <strong>more than $2,000</strong> in securities to restore LTV to 50%.</li>
                <li><strong>Okay month (flat/slightly down):</strong> LTV drifted near target. $1,000 pays down debt, simulator borrows to buy <strong>~$2,000</strong>.</li>
                <li><strong>Bad month (portfolio crashed):</strong> LTV is above target. The $1,000 budget reduces debt, modestly improving LTV. No new securities are purchased.</li>
            </ul>

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
            <h1>Lifecycle Investing Simulator</h1>
            <div class="alert-warning">
                <strong>Placeholder:</strong> This section is a placeholder. Lifecycle investing is not implemented.
            </div>
        `;
    },

    /**
     * Get asset label for LTV input
     */
    getAssetLabelLTV() {
        return 'Starting LTV (%)';
    },

    /**
     * Get asset label for Book Value input
     */
    getAssetLabelBookValue() {
        return 'Book Value of Collateral Account ($)';
    },

    /**
     * Get asset tooltip for LTV input
     */
    getAssetTooltipLTV() {
        const ltvAbbrev = STANDARD_MODE_DEFAULTS.MAX_LTV;
        const collateralAmount = (100000 / (ltvAbbrev / 100)).toLocaleString();
        return `Loan-to-Value ratio: percentage of portfolio that is borrowed. ${ltvAbbrev}% LTV on a $${collateralAmount}K portfolio = $100K loan. Higher LTV increases margin call probability.`;
    },

    /**
     * Get asset tooltip for Book Value input
     */
    getAssetTooltipBookValue() {
        return 'The book value of your deposits as reported by your broker. This is typically the original cost basis of deposits, not the current market value. Your broker will provide the difference between book and market value.';
    },

    /**
     * Get payment warning text (when monthly budget insufficient)
     */
    getPaymentWarningText(monthlyBudget, amortizedPayment, years) {
        return `Your monthly budget ($${monthlyBudget.toFixed(2)}) is less than the full amortization payment ($${amortizedPayment.toFixed(2)}). This means you cannot fully pay off the loan over ${years} years with your current budget.`;
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
    getStrategySummaryNarrative(monthlyBudget, debtPayment, marketInvestment, survivalRate, medianRealWealth, benchmarkMedian, delta) {
        const deltaPrefix = delta >= 0 ? '+' : '-';
        return {
            allocation: `You have a monthly budget of <strong>$${monthlyBudget.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong> for debt payments and investments.`,
            paymentBreakdown: `With this strategy, you pay <strong>$${debtPayment.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong> to the lender and invest the remaining <strong>$${marketInvestment.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong> into a low-cost S&P 500 ETF.`,
            outcomes: `This allocation results in a <strong>${survivalRate.toFixed(1)}%</strong> probability of survival. In the expected case, your Real Wealth (in today's purchasing power) is <strong>$${medianRealWealth.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong>.`,
            baseline: `Baseline Comparison: If you simply invested your <strong>$${monthlyBudget.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong> monthly budget into the S&P 500 without borrowing, you would likely end up with <strong>$${benchmarkMedian.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong>.`,
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
            fixes.push("<strong>Reduce your Loan Amount.</strong> Your borrowed capital is too large relative to your safety buffer. Avoid borrowing more than a third of your portfolio's value.");
            fixes.push("<strong>Add More Collateral.</strong> Deposit additional cash into your account without borrowing more. This strengthens your cushion against margin calls.");
            fixes.push("<strong>Increase Monthly Payment.</strong> Pay down the loan faster before a crash occurs. The longer you stay leveraged, the higher your ruin risk.");
        } else if (classification.isPointless) {
            fixes.push("<strong>Check Your Interest Rate.</strong> If you're paying more than 7-8% annual interest, leverage rarely works mathematically. Consider switching to a lower-cost loan or margin product.");
            fixes.push("<strong>Increase Your Monthly Budget.</strong> Pay down the principal faster. Leverage works best when your debt is a shrinking percentage of your assets.");
            fixes.push("<strong>Extend Your Time Horizon.</strong> If your simulation is under 10 years, short-term volatility is drowning out long-term gains. Leverage needs time to compound.");
        } else if (classification.isMarginal) {
            fixes.push("<strong>Lower Your LTV by 5%.</strong> Often, a small reduction in borrowed capital significantly increases your spread by reducing interest costs and ruin risk together.");
            fixes.push("<strong>Invest Your Monthly Surplus.</strong> Ensure the money you don't use for debt payments goes into growth assets (stocks/ETFs), not cash. If you're holding cash, you're wasting the leverage benefit.");
            fixes.push("<strong>Test Interest Rate Risk.</strong> Try to increase your interest rate by 1%. If this strategy becomes \"Pointless,\" it's too fragile. You need more cushion.");
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
     * Generate diagnostic fix suggestions by category (deprecated - use _suggestFixes internally)
     * Kept for backward compatibility during refactoring
     */
    generateDiagnosticFix(category, trinaryStats) {
        return [];
    },

    /**
     * Get success criteria table headers
     */
    getSuccessCriteriaHeaders() {
        return { outcome: 'Outcome', goal: 'Target Goal', current: 'Your Current', status: 'Status' };
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
     * Get "How to Fix Your Strategy" header
     */
    getFixStrategyHeaderText() {
        return 'How to Fix Your Strategy';
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.CopywritingHelpers = CopywritingHelpers;
}
