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
     * Get interest rate description
     */
    getInterestRateText() {
        return `${STANDARD_MODE_DEFAULTS.INTEREST_RATE}%`;
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
     * Calculate spread between growth and interest
     */
    getSpreadText() {
        const spread = STANDARD_MODE_DEFAULTS.GROWTH_RATE - STANDARD_MODE_DEFAULTS.INTEREST_RATE;
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
     * Generate intro paragraph text
     */
    getIntroParagraph() {
        return `Leveraged investing means borrowing to invest earlier than you otherwise could. You borrow against your portfolio as collateral, invest the loan immediately, then pay it back over time from your regular income. Stock market returns <strong>${this.getGrowthRateText()} per year</strong> (S&P 500 historical average 1950-2024). Borrowing costs <strong>${this.getInterestRateText()}</strong> (Prime + 1% typical). The ${this.getSpreadText()} spread accrues on borrowed capital when markets rise.`;
    },

    /**
     * Generate catch paragraph text
     */
    getCatchParagraph() {
        return `When markets crash, debt obligations remain fixed at ${this.getInterestRateText()} interest while portfolio value shrinks. Leverage amplifies both gains and losses.`;
    },

    /**
     * Generate simulation description
     */
    getSimulationDescription() {
        return `This simulator tests <strong>${UI_CONSTANTS.NUM_STRATEGIES - 1} payment strategies</strong> across <strong>${this.getSimulationCountText()} market scenarios per strategy</strong> (plus <strong>${this.getBaseCaseSimulationsText()} scenarios for DCA baseline</strong>). Generates probability distributions: what percentage result in ruin, underperformance, or outperformance.`;
    },

    /**
     * Generate methodology step 2 text
     */
    getMethodologyStep2() {
        return `The simulator tests ${UI_CONSTANTS.NUM_STRATEGIES - 1} payment strategies from minimum payment to monthly budget. Each represents a point on the leverage spectrum: low payment = high leverage; high payment = rapid debt paydown.`;
    },

    /**
     * Generate methodology step 3 text
     */
    getMethodologyStep3() {
        const perStrategy = UI_CONSTANTS.SIMULATION_COUNT.toLocaleString();
        const baseline = UI_CONSTANTS.BASE_CASE_SIMULATIONS.toLocaleString();
        return `For each payment strategy, the simulator runs ${perStrategy} randomized market scenarios. For the DCA baseline, it runs ${baseline} scenarios for higher statistical precision.`;
    },

    /**
     * Generate methodology formula text for volatility
     */
    getMethodologyFormulaText() {
        return `μ = Expected annual growth rate (${this.getGrowthRateText()} in Standard Mode)<br>
            σ = Volatility / standard deviation (${this.getVolatilityText()} in Standard Mode)<br>
            Z = Random normal variable (simulates market surprises)`;
    },

    /**
     * Generate margin call step 4 text
     */
    getMarginCallStep4() {
        return `Lenders enforce rules. If your debt gets too large relative to your portfolio value (your Loan-to-Value ratio), they force liquidation. In Standard Mode, the margin call threshold is ${this.getMarginCallText()} LTV.`;
    },

    /**
     * Generate margin call followup text
     */
    getMarginCallFollowup() {
        return `If at any point your debt exceeds ${this.getMarginCallText()} of your portfolio's value, the lender sells your positions, pays themselves back, and you're left with $0. The calculator reports liquidation risk separately from survival. Survival means final real wealth is strictly greater than total real deposits.`;
    },

    /**
     * Generate margin call note
     */
    getMarginCallNote() {
        return `${this.getMarginCallText()} LTV is conservative relative to the market. Different lenders use different thresholds (40-80%); you can adjust it in Custom Mode.`;
    },

    /**
     * Generate inflation example text
     */
    getInflationExample() {
        return `For example, if your portfolio grows to $1M in ${DEFAULT_INPUTS.LOAN_PERIOD} years but inflation is ${this.getInflationText()} per year, that $1M in the future is worth less in today's dollars. This calculator shows what that really means for your lifestyle.`;
    },

    /**
     * Generate economics text
     */
    getEconomicsText() {
        return `Leveraged investing works when there's a positive <strong>spread</strong> between borrowing costs and market returns. If borrowing costs are ${this.getInterestRateText()} and stocks return ${this.getGrowthRateText()}, the ${this.getSpreadText()} spread accrues on borrowed capital. Over ${DEFAULT_INPUTS.LOAN_PERIOD} years on $100K borrowed, that compounds significantly.`;
    },

    /**
     * Generate standard mode assumptions list
     */
    getStandardModeAssumptions() {
        return `
            <li><strong>Interest Rate: ${this.getInterestRateText()}</strong> — This assumes Canadian Prime Rate stays around 6% plus a 1% lender spread. It's higher than current rates (early 2026), so it accounts for rate increases over your ${DEFAULT_INPUTS.LOAN_PERIOD}-year period.</li>
            <li><strong>Market Growth: ${this.getGrowthRateText()} per year</strong> — Historical average for the S&P 500 from 1950-2024. It's <em>not</em> the best-case scenario; many years are below ${this.getGrowthRateText()}, some are above.</li>
            <li><strong>Volatility: ${this.getVolatilityText()} per year</strong> — Standard deviation of annual S&P 500 returns. This means most years fall between -7% and +23%, roughly. It captures the realistic swings you'd experience.</li>
            <li><strong>Margin Call Threshold: ${this.getMarginCallText()} LTV</strong> — Conservative. Different lenders enforce 40-80% LTV depending on their risk appetite. At ${this.getMarginCallText()}, the lender protects themselves earlier, which means higher probability of liquidation if markets decline.</li>
            <li><strong>Inflation: ${this.getInflationText()} per year</strong> — Long-term average U.S. inflation. All final wealth figures convert to "today's dollars" using this rate.</li>
            <li><strong>Monthly Payment: ${this.getPaymentPercentageText()} of Amortized</strong> (auto-calculated) — This is the default starting point. Paying ${this.getPaymentPercentageText()} means you're not paying down the principal very fast; you're betting on leverage. This lets you explore the tradeoff.</li>
        `;
    },

    /**
     * Generate three outcomes ruin text
     */
    getThreeOutcomesRuinText() {
        return `<strong>Ruin (Red):</strong> Either (1) your account hit the ${this.getMarginCallText()} margin call threshold and was liquidated, or (2) you ended with less wealth than your initial equity. Both outcomes represent failure. The "ruin probability" is the percentage of ${this.getSimulationCountText()} scenarios where this occurs.`;
    },

    /**
     * Generate reference leverage text
     */
    getReferenceLeverageText() {
        return `<strong>Leverage & The Spread:</strong> Leveraged investing relies on <strong>positive carry</strong>. If you borrow at ${this.getInterestRateText()} and invest at ${this.getGrowthRateText()}, you keep ${this.getSpreadText()} on borrowed capital. Read more: <a href="https://www.investopedia.com/terms/c/carry.asp" target="_blank">Investopedia's carry trade explanation</a>. The catch: this only works if markets go up. In down markets, you're paying ${this.getInterestRateText()} on a shrinking asset base—the exact opposite dynamic.`;
    },

    /**
     * Generate reference time value text
     */
    getReferenceTimeValueText() {
        return `<strong>Time Value of Money & Loan Amortization:</strong> When you borrow $100,000 over ${DEFAULT_INPUTS.LOAN_PERIOD} years at ${this.getInterestRateText()}, there's a specific monthly payment that makes sense: <a href="https://www.investopedia.com/terms/a/amortization.asp" target="_blank">Investopedia's amortization guide</a> explains the math. The formula we use calculates that "fair" payment. Paying less means you're extending the debt; paying more means you're paying it off faster.`;
    },

    /**
     * Generate reference margin call text
     */
    getReferenceMarginCallText() {
        return `<strong>Margin Calls & Forced Liquidation:</strong> When you borrow against your portfolio, the lender sets a maximum Loan-to-Value ratio. Read <a href="https://www.investopedia.com/terms/m/margincall.asp" target="_blank">Investopedia's margin call explanation</a>. If the ratio is breached, the lender sells your positions without asking, pays themselves back, and you're left with $0. This is not theoretical—it happened to many investors during 2008 and 2020. Standard Mode conservatively uses a ${this.getMarginCallText()} LTV threshold; more aggressive lenders allow up to 75-80%; more conservative lenders enforce 40-50%.`;
    },

    /**
     * Generate reference inflation text
     */
    getReferenceInflationText() {
        return `<strong>Real vs. Nominal Returns—Inflation Adjustment:</strong> A $1M portfolio sounds great until you realize that $1M in ${DEFAULT_INPUTS.LOAN_PERIOD} years won't buy as much as $1M today. This calculator converts all results to "real dollars" (today's purchasing power) using the inflation rate. <a href="https://www.investopedia.com/terms/r/realinterestrate.asp" target="_blank">Investopedia on real interest rates</a> explains the concept applied to debt. For wealth: <a href="https://www.khanacademy.org/economics-finance-domain/macroeconomics/aggregate-demand-supply/inflation-tutorial/v/inflation-and-real-return" target="_blank">Khan Academy's inflation and real return video</a> walks through it step-by-step.`;
    },

    /**
     * Generate Monte Carlo intro text
     */
    getMonteCarloIntroText() {
        return `This tool uses <strong>Monte Carlo simulation</strong> with <strong>geometric Brownian motion</strong> to test leveraged investing strategies across ${this.getSimulationCountText()} randomized market scenarios per strategy.`;
    },

    /**
     * Get mode description for Standard Mode
     */
    getModeStandardDescription() {
        return `<p><strong>Standard Mode:</strong> Research-backed defaults (7% interest, 8% growth, 15% volatility, 60% liquidation threshold). Set budget, collateral, LTV. Simulator tests payment strategies from minimum to maximum budget allocation.</p>`;
    },

    /**
     * Get mode description for Custom Mode
     */
    getModeCustomDescription() {
        return `<p><strong>Custom Mode:</strong> All parameters unlocked. For testing specific lending terms, alternative market assumptions, or margin strategies. Adjust interest rates, growth expectations, volatility, liquidation thresholds, and inflation.</p>`;
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
