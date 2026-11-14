/**
 * Copywriting Helpers - Dynamic Text Generation
 * Generates all copywriting text dynamically from config values
 */

/**
 * Get config value formatters and text generators
 */
const moneyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0
});

const percentageFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
});

function numberOr(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function formatMoney(value) {
    return moneyFormatter.format(numberOr(value));
}

function formatPercentage(value) {
    return `${percentageFormatter.format(numberOr(value))}%`;
}

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
        return `<p><strong>Standard Mode:</strong> The simulator starts from a research-backed baseline for the monthly-deposit and max-purchasing-LTV framework; Custom Mode allows adjustment of additional parameters.</p>`;
    },

    /**
     * Get mode description for Custom Mode
     */
    getModeCustomDescription() {
        return `<p><strong>Custom Mode:</strong> All key inputs are unlocked for testing different monthly budgets, borrowing costs, expected returns, volatility assumptions, liquidation thresholds, and max purchasing LTV without changing the core logic for deposits and the 0% to max-LTV strategy spectrum.</p>`;
    },

    /**
     * Get the constant leverage preamble markup
     */
    getConstantPreambleHtml() {
        return `
            <h3 class="section-title-center">Common Investing Strategies Compared</h3>
            <table class="comparison-table">
                <thead>
                    <tr class="comparison-table-header">
                        <th class="comparison-table-header"></th>
                        <th class="comparison-table-header">Simple</th>
                        <th class="comparison-table-header">Resilient</th>
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
                        <td>Managed Portfolios</td>
                        <td class="cell-green">Yes</td>
                        <td class="cell-green">Yes (Usually)</td>
                        <td class="cell-red">No (Statistically)</td>
                        <td class="cell-red">No (Fees)</td>
                    </tr>
                    <tr class="comparison-table-row">
                        <td>Day Trading</td>
                        <td class="cell-red">No</td>
                        <td class="cell-red">No</td>
                        <td class="cell-red">No (Usually)</td>
                        <td class="cell-red">No</td>
                    </tr>
                    <tr class="comparison-table-row">
                        <td>Wealth Management</td>
                        <td class="cell-orange">Kinda (Barriers to entry and exit)</td>
                        <td class="cell-orange">It depends</td>
                        <td class="cell-red">No (Usually)</td>
                        <td class="cell-orange">Kinda (Fees, but benefits beyond returns)</td>
                    </tr>
                    <tr class="comparison-table-row">
                        <td>Leveraged DCA</td>
                        <td class="cell-orange">Kinda</td>
                        <td class="cell-orange">Kinda</td>
                        <td class="cell-green">Yes (According to models)</td>
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

            <div class="box box--info" id="table-rows">
                <h3 class="section-title-left">What Each Row Covers</h3>
                <div class="info-box-content">
                    <ul class="compact-list">
                        <li><strong>Market Index DCA:</strong> Some Indices are better than others. For simplicity, I'm ignoring that.</li>
                        <li><strong>Managed Portfolios:</strong> Anything where someone else makes the investment decisions: robo-advisors, mutual funds, private equity, private credit. The line is blurry: funds like XEQT, VBAL or CAGE rebalance by fixed rules, but can be sold anytime. I don't count them. No split here is clean.</li>
                        <li><strong>Day Trading:</strong> Any active trading: options, bots, whatever.</li>
                        <li><strong>Wealth Management:</strong> Financial advisors, family offices generally don't promise excess returns after fees. Clients come for personalized solutions and benefits beyond returns.</li>
                    </ul>
                </div>
            </div>

            <h3 class="section-title-center">Investing 101: Dollar Cost Averaging</h3>
            <p>
                <strong>Dollar Cost Averaging (DCA)</strong> involves investing a fixed
                amount at regular intervals into a security, most commonly a broad market index
                fund (e.g. a $20 market buy of XEQT every day). The amount is fixed thus
                when prices are low, the same $20 buys more shares; when they're high, fewer.
            </p>
            <p>
                DCA is relatively straightforward and safe.
                This characterization is especially true with the recent rise of app-based
                investing automations and ETFs. Setting it up is one recurring investment
                in a brokerage app: an amount, a fund, a schedule.
            </p>

            <h3 class="section-title-center">Problems with DCA and Potential Fixes</h3>
            <p id="dca-problems">
                DCA contains a structural inefficiency: late crashes can dominate outcomes
                because dollar-weighted exposure concentrates at the end of the timeline
                when deposits are largest.
            </p>
            <p>
                An investor putting $500 a month into DCA has $6,000 invested after one year
                and $180,000 after thirty, before any growth. The same 40% crash costs $2,400
                in year one and $72,000 in year thirty.
            </p>
            <p>
                <strong>This is colloquially known as "last decade risk."</strong>
            </p>
            <p>
                The fix for last decade risk is early exposure: getting money into the
                market asap. The problem, of course, with what money?
                In general, the years with the most time to compound are the years with the least to invest.
                Borrowing to invest (leverage) is one answer that could also 
                potentially unlock excess returns.
            </p>

                        <div class="box box--info">
                <h3 class="section-title-left">Portfolio Modeling Assumption</h3>
                <div class="info-box-content">
                    The simulator models the portfolio as a single asset 
                    with constant drift and volatility. This requires a
                     <strong>fixed allocation in the underlying portfolio</strong> 
                     (e.g., 60% equities, 40% bonds). An ETF that 
                     rebalances internally (e.g., VBAL) satisfies this assumption.
                </div>
            </div>


            <h3 class="section-title-center">As Close to Ideal as Possible: Leveraged DCA</h3>
            <p id="investor-behaviour">
                Leveraged DCA keeps the same automation and changes one number: the recurring
                investment is set higher than the budget, in a margin account.
                <strong>A margin account allows borrowing against securities holdings</strong>,
                so the broker lends whatever the deposit doesn't cover.
            </p>
            <p>An investor with a $1,000 monthly budget:</p>
            <ol class="compact-numbered">
                <li>opens a margin account;</li>
                <li>sets a recurring deposit of $1,000 a month;</li>
                <li>sets a recurring investment of $2,000 a month into a broad market index fund.</li>
            </ol>
            <p>
                Each month the deposit pays for half the purchase and the broker lends the other
                half. No savings are needed: the fund units bought are the collateral for the loan
                that bought them, up to the limit the broker sets for that fund. Half of every
                purchase is borrowed: a <strong>purchasing LTV</strong> (loan-to-value) of 50%,
                or 2x leverage: $2 of fund for every $1 of the investor's own.
            </p>
            <p>
                Then the investor goes back to their life: no monitoring, no selling, no rebalancing.
            </p>



             <div class="box box--info" id="margin-maths">
                <h3 class="section-title-left">Margin, Leverage, and LTV</h3>
                <div class="info-box-content">
                    <p>
                        Every formula below uses the same symbols:
                    </p>
                    <ul class="compact-list" id="margin-symbols">
                        <li><strong>V</strong>: portfolio value, what the securities are worth.</li>
                        <li><strong>D</strong>: debt owed to the lender.</li>
                        <li><strong>E</strong>: equity, what's left if everything is sold and the debt repaid: E = V − D.</li>
                        <li><strong>L</strong>: loan-to-value (LTV), the share of the portfolio that is borrowed.</li>
                        <li><strong>f</strong>: leverage ratio, dollars of market exposure per dollar of equity.</li>
                        <li><strong>r</strong>: the market's annual return. <strong>i</strong>: the annual interest rate on the debt.</li>
                        <li><strong>σ</strong>: volatility, how far a typical year's return lands from its average (the standard deviation of r).</li>
                    </ul>
                    <p>
                        <strong>Loan-to-Value (LTV)</strong> is debt as a percentage of total portfolio value. $40K equity, $60K borrowed, $100K portfolio: 60% LTV.
                    </p>
                    <div class="formula">
                        L = D ÷ V
                    </div>
                    <p>
                        <strong>Leverage ratio</strong> expresses the same position differently: total position divided by equity. A 60% LTV equals a 2.5x leverage ratio ($100K ÷ $40K).
                    </p>
                    <div class="formula">
                        f = V ÷ E = 1 ÷ (1 − L)
                    </div>
                    <p>
                        The simulator uses LTV throughout because the inputs and outputs are percentages.
                    </p>
                    <p>
                        <strong>Leverage amplifies losses more than gains.</strong> Each year, equity earns the market's return on all of V and pays interest on D:
                    </p>
                    <div class="formula">
                        Return on equity ≈ f · r − (f − 1) · i<br>
                        Volatility of equity = f · σ, so its variance is f² · σ²<br>
                        Compounded growth of equity ≈ f · r − (f − 1) · i − f² · σ² / 2
                    </div>
                    <p>
                        The last term is the drag: swings cost compounded growth, because a 50% loss takes a 100% gain to undo. It grows with the square of leverage: at 2x the swings double and the drag quadruples. Past some leverage, the drag eats the extra return.
                    </p>
                </div>
            </div>

            <h3 class="section-title-center">Isn't This Insane?</h3>
            <p id="why-margin">
                Leverage amplifies every market move, up and down.
                Broad markets usually go up, and their <strong>returns could potentially exceed
                the cost of borrowing.</strong>
            </p>
            <p>
                If debt gets too high relative to portfolio value, the 
                lender forces liquidation (margin call), often leaving the
                 investor with less than they initially deposited.
                  Leverage sounds (and is) dangerous which is why most investors are taught to avoid it.
            </p>

            <div class="box box--info" id="leverage-per-purchase">
                <h3 class="section-title-left">For the Nerds: Why I Define Constant Leverage From the Buying Side</h3>
                <div class="info-box-content">
                    <p>
                        <strong>Holding constant leverage on the whole portfolio
                         is momentum trading: Buy high, sell low.</strong> After a rise the
                        portfolio's LTV falls, so holding it constant means borrowing to buy more at
                        the higher price; after a fall it rises, so holding it means selling at the
                        lower price.
                    </p>
                    <p>
                        From a simulation perspective, this project is interested
                        in realistic investor behaviour and outcomes. Constant LTV
                        on the whole portfolio requires constant monitoring and rebalancing, and
                        selling into every fall, which is not realistic for most investors. The
                        simulator assumes that the investor sets a purchasing LTV and sticks to it,
                        allowing the portfolio's LTV to fluctuate with the market.
                    </p>
                    <p>
                        As an aside, leveraged ETFs do the same every day: they get their leverage
                        through derivatives (contracts such as swaps, which aren't free) and reset it
                        daily, so over longer periods their return can differ significantly from the
                        multiple
                        (<a href="https://www.finra.org/rules-guidance/notices/09-31"
                            target="_blank">FINRA</a>). Leveraged DCA at a 67% purchasing
                        LTV is not 3x SPY.
                    </p>
                </div>
            </div>

            <h3 class="section-title-center">What the Simulator Calculates</h3>
            <p id="thesis">
                On paper, leverage pays. Ayres and Nalebuff's
                <a href="https://www.nber.org/papers/w14094" target="_blank">Lifecycle Investing</a>
                argues that buying stock on margin early in life can reduce retirement risk.
                Volatility works against it: a loss takes a larger gain to undo, and leverage
                magnifies both.
            </p>
            <p>
                I'm interested in whether it pays in a setup an investor actually runs: one
                recurring investment in a margin account, a broker that sells after a fall, and
                purchases that stop when the account can't fund them.
            </p>
            <p>
                <strong>Given a margin account, monthly budget, and a time horizon, the question becomes: how do the odds of ruin and of beating DCA change as more of each purchase is borrowed?</strong>
            </p>
            <p>
                Too low and there are low chances of excess returns. Too high and liquidation happens in the first major crash. The simulator runs thousands of randomized market scenarios across the full 0% to the max purchasing LTV to estimate outcome probabilities.
            </p>
            <p>
                <strong>In general, over a long time horizon, more leverage means higher average returns.</strong> The calculator starts at the DCA base case (0% LTV) and automatically tests the leverage spectrum up to the max purchasing LTV in smooth, readable increments.
            </p>

            </div>


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
    getStrategySummaryNarrative(targetLTV = 0, survivalRate = 0, medianRealWealth = 0, benchmarkMean = 0, delta = 0, totalDeposits = 0) {
        const target = numberOr(targetLTV);
        const median = numberOr(medianRealWealth);
        const benchmark = numberOr(benchmarkMean, median);
        const difference = numberOr(delta, median - benchmark);
        const differencePrefix = difference >= 0 ? '+' : '-';
        return {
            strategy: `The selected strategy buys at a <strong>purchasing LTV of ${formatPercentage(target * 100)}</strong> while the portfolio evolves through monthly market movements and deposits.`,
            outcomes: `Across these simulated outcomes, this allocation has a <strong>median real wealth of ${formatMoney(median)} against ${formatMoney(totalDeposits)} in deposits</strong>.`,
            leverageImpact: `<strong>The median wealth impact of leverage is ${differencePrefix}${formatMoney(Math.abs(difference))} </strong> compared to the non leveraged scenario of median of ${formatMoney(benchmark)}`
        };
    },

    /**
     * Generate the verdict fields from trinary statistics
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
            ruin: 'Ended with real net worth at or below total real deposits (did not preserve contributions).',
            sucker: 'Ended above total real deposits but below the simulated DCA mean.',
            profit: 'Ended above total real deposits and above the simulated DCA mean.'
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
     * Get baseline calculation progress message
     */
    getBaselineProgressMessage() {
        return 'DCA baseline calculated. Simulating remaining leveraged strategies in the background...';
    },

    getResultsReadyMessage() {
        return 'All leveraged strategies have been calculated.';
    },

};

// Make available globally
if (typeof window !== 'undefined') {
    window.CopywritingHelpers = CopywritingHelpers;
}
