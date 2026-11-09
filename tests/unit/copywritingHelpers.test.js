import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

describe('CopywritingHelpers', () => {
    beforeEach(async () => {
        await loadApp();
    });

    it('returns distinct, non-empty copy for standard vs custom mode descriptions', () => {
        const standard = window.CopywritingHelpers.getModeStandardDescription();
        const custom = window.CopywritingHelpers.getModeCustomDescription();
        expect(standard).toContain('Standard Mode');
        expect(custom).toContain('Custom Mode');
        expect(standard).not.toBe(custom);
    });

    it('returns distinct preamble markup for constant vs lifecycle strategies', () => {
        const constant = window.CopywritingHelpers.getConstantPreambleHtml();
        const lifecycle = window.CopywritingHelpers.getLifecyclePreambleHtml();
        expect(constant).toContain('Leveraged DCA');
        expect(lifecycle).toContain('Placeholder');
        expect(constant).not.toBe(lifecycle);
    });

    it('includes the raw error message in the simulation error copy', () => {
        expect(window.CopywritingHelpers.getSimulationErrorMessage('worker crashed')).toBe('Simulation failed: worker crashed');
    });

    it('derives verdict fields from trinary stats', () => {
        const verdict = window.CopywritingHelpers.generateVerdict({ ruinPercent: 1, suckerPercent: 30, profitPercent: 69 });
        expect(verdict.ruinPercent).toBe(1);
        expect(verdict.suckerPercent).toBe(30);
        expect(verdict.profitPercent).toBe(69);
        expect(verdict.spread).toBe(39);
    });

    it('returns null verdict when no trinary stats are available', () => {
        expect(window.CopywritingHelpers.generateVerdict(null)).toBeNull();
    });

    it('reflects STANDARD_MODE_DEFAULTS values in label text', () => {
        expect(window.CopywritingHelpers.getGrowthRateText()).toBe(`${window.STANDARD_MODE_DEFAULTS.GROWTH_RATE}%`);
        expect(window.CopywritingHelpers.getVolatilityText()).toBe(`${window.STANDARD_MODE_DEFAULTS.VOLATILITY}%`);
        expect(window.CopywritingHelpers.getMarginCallText()).toBe(`${window.STANDARD_MODE_DEFAULTS.MARGIN_CALL_LTV}%`);
        expect(window.CopywritingHelpers.getMaxLTVText()).toBe(`${window.STANDARD_MODE_DEFAULTS.MAX_LTV}%`);
    });

    it('describes outcome categories as comparisons with the simulated DCA mean', () => {
        expect(window.CopywritingHelpers.getOutcomeDescription('sucker')).toContain('simulated DCA mean');
        expect(window.CopywritingHelpers.getOutcomeDescription('profit')).toContain('simulated DCA mean');
        const narrative = window.CopywritingHelpers.getStrategySummaryNarrative(0.1, 90, 64000, 60000, 4000, 50000);
        expect(narrative.outcomes).toContain('$64,000 against $50,000 in deposits');
        expect(narrative.leverageImpact).toContain('+$4,000');
        expect(narrative.leverageImpact).toContain('median of $60,000');
    });

    it('keeps the results layout ordered with the slider ahead of the charts', () => {
        const benchmark = {
            targetLTV: 0,
            finalWealthArray: [1, 2, 3],
            medianWealth: 50000,
            survivalRate: 92,
            trinaryStats: { ruinPercent: 2, suckerPercent: 28, profitPercent: 70 },
            meanSecuritiesPath: [0, 1, 2],
            debtPath: [0, 1, 2],
            months: 12
        };

        const strategy = {
            targetLTV: 0.1,
            finalWealthArray: [2, 4, 6],
            medianWealth: 64000,
            survivalRate: 85,
            trinaryStats: { ruinPercent: 4, suckerPercent: 18, profitPercent: 78 },
            meanSecuritiesPath: [0, 2, 4],
            debtPath: [0, 2, 4],
            months: 12,
            benchmarkExpected: 50000,
            benchmarkWealthArray: benchmark.finalWealthArray
        };

        const order = Array.from(document.getElementById('results').children).map((node) => node.className || node.id);
        expect(order.indexOf('summary-box')).toBeLessThan(order.indexOf('slider-container'));
        expect(order.indexOf('slider-container')).toBeLessThan(order.indexOf('chart-container'));
    });

    it('keeps an active range slider at its viewport position through DOM changes', async () => {
        const { window: appWindow, document: appDocument } = await loadApp();
        const slider = appDocument.getElementById('strategySlider');
        let sliderTop = 300;
        const scrollBy = vi.fn((_, offset) => {
            sliderTop -= offset;
        });
        appWindow.scrollBy = scrollBy;
        slider.getBoundingClientRect = () => ({ top: sliderTop });

        slider.dispatchEvent(new appWindow.Event('pointerdown', { bubbles: true }));
        sliderTop = 240;
        appDocument.body.prepend(appDocument.createElement('div'));
        slider.dispatchEvent(new appWindow.Event('input', { bubbles: true }));
        await new Promise((resolve) => appWindow.requestAnimationFrame(resolve));

        expect(scrollBy).toHaveBeenCalledWith(0, -60);
        expect(sliderTop).toBe(300);
    });

    it('renders baseline summary without 3-zone outcome grid for base case (0% LTV) and renders outcome grid for leveraged strategy', () => {
        const benchmark = {
            targetLTV: 0,
            finalWealthArray: [1, 2, 3],
            medianWealth: 50000,
            expectedWealth: 60000,
            survivalRate: 92,
            totalDeposits: 190000,
            trinaryStats: { ruinPercent: 2, suckerPercent: 28, profitPercent: 70 },
            meanSecuritiesPath: [0, 1, 2],
            debtPath: [0, 0, 0],
            months: 12
        };

        const strategy = {
            targetLTV: 0.2,
            finalWealthArray: [2, 4, 6],
            medianWealth: 75000,
            survivalRate: 88,
            totalDeposits: 190000,
            trinaryStats: { ruinPercent: 3, suckerPercent: 20, profitPercent: 77 },
            meanSecuritiesPath: [0, 2, 4],
            debtPath: [0, 1, 2],
            months: 12,
            benchmarkExpected: 60000,
            benchmarkWealthArray: benchmark.finalWealthArray
        };

        window.displayResults({
            benchmark,
            strategies: [benchmark, strategy],
            loanDetails: {
                initialEquity: 10000,
                monthlyBudget: 500,
                inflationRate: 0.035,
                years: 30
            }
        });

        // Strategy index 0 is base case (0% LTV): should NOT contain outcome-grid or result-criteria
        const dynamicSummary = document.getElementById('dynamicSummary');
        expect(dynamicSummary.querySelector('.outcome-grid')).toBeNull();
        expect(document.getElementById('strategyCriteria').querySelector('.result-criteria')).toBeNull();
        expect(dynamicSummary.innerHTML).toContain('Results Ready');
        expect(dynamicSummary.innerHTML).not.toContain('Background Processing');

        // Moving the strategy slider (docs/bugs.md 2: its listener must be attached) re-renders
        // the summary for strategy index 1 (20% LTV), with the outcome grid.
        const slider = document.getElementById('strategySlider');
        slider.value = '1';
        slider.dispatchEvent(new Event('input', { bubbles: true }));

        expect(document.getElementById('selectedLtv').textContent).toBe('20.0%');
        expect(dynamicSummary.querySelector('.outcome-grid')).not.toBeNull();
        expect(dynamicSummary.innerHTML).toContain('Simulation results');
        // The impact line compares medians (75,000 vs DCA's 50,000), not DCA's mean (60,000).
        expect(dynamicSummary.innerHTML).toContain('+$25,000');
        expect(dynamicSummary.innerHTML).toContain('median of $50,000');
    });

    it('renders DCA without outcome overlays and partitions leveraged outcomes using deposits and the DCA mean', async () => {
        const { window: appWindow, document: appDocument } = await loadApp();
        const newPlot = vi.fn();
        appWindow.Plotly = { newPlot };
        const benchmark = {
            targetLTV: 0,
            finalWealthArray: [90, 100, 110, 150],
            medianWealth: 110,
            expectedWealth: 120,
            survivalRate: 50,
            totalDeposits: 100,
            trinaryStats: { ruinPercent: 50, suckerPercent: 25, profitPercent: 25 },
            meanSecuritiesPath: [0, 1],
            meanDebtPath: [0, 0],
            months: 1
        };
        const strategy = {
            targetLTV: 0.1,
            finalWealthArray: [90, 100, 110, 150],
            medianWealth: 110,
            expectedWealth: 115,
            benchmarkExpected: 120,
            survivalRate: 50,
            totalDeposits: 100,
            trinaryStats: { ruinPercent: 50, suckerPercent: 25, profitPercent: 25 },
            meanSecuritiesPath: [0, 1],
            meanDebtPath: [0, 0],
            months: 1
        };

        appWindow.displayResults({
            benchmark,
            strategies: [benchmark, strategy],
            loanDetails: { initialEquity: 10000, monthlyBudget: 500, inflationRate: 0.035, years: 1, months: 1 }
        });

        const histogramCalls = () => newPlot.mock.calls.filter(([target]) => target === 'histogramChart');
        const baselineTraces = histogramCalls()[0][1];
        expect(baselineTraces).toHaveLength(2);
        expect(baselineTraces[0].x).toEqual([90, 100]);
        expect(baselineTraces[1].x).toEqual([110, 150]);
        expect(baselineTraces[0].marker.color).toBe(appWindow.getComputedStyle(appDocument.documentElement).getPropertyValue('--md-error').trim());
        expect(baselineTraces[1].marker.color).toBe(appWindow.getComputedStyle(appDocument.documentElement).getPropertyValue('--md-chart-dca-survival').trim());

        const slider = appDocument.getElementById('strategySlider');
        slider.value = '1';
        slider.dispatchEvent(new appWindow.Event('input', { bubbles: true }));

        const leveragedTraces = histogramCalls().at(-1)[1];
        expect(leveragedTraces).toHaveLength(4);
        expect(leveragedTraces[0].marker.color).toBe(appWindow.getComputedStyle(appDocument.documentElement).getPropertyValue('--md-chart-dca-overlay').trim());
        expect(leveragedTraces[0].opacity).toBe(Number(appWindow.getComputedStyle(appDocument.documentElement).getPropertyValue('--md-chart-dca-overlay-opacity').trim()));
        expect(leveragedTraces[1].x).toEqual([90, 100]);
        expect(leveragedTraces[2].x).toEqual([110]);
        expect(leveragedTraces[3].x).toEqual([150]);
        expect(leveragedTraces[1].marker.color).toBe(appWindow.getComputedStyle(appDocument.documentElement).getPropertyValue('--md-error').trim());
        expect(leveragedTraces[2].marker.color).toBe(appWindow.getComputedStyle(appDocument.documentElement).getPropertyValue('--md-warning-border').trim());
        expect(leveragedTraces[3].marker.color).toBe(appWindow.getComputedStyle(appDocument.documentElement).getPropertyValue('--md-success').trim());
    });

    it('shows baseline survival without DCA comparison and plots all average wealth values together', async () => {
        const { window: appWindow, document: appDocument } = await loadApp();
        const newPlot = vi.fn();
        appWindow.Plotly = { newPlot };
        const benchmark = {
            targetLTV: 0,
            finalWealthArray: [9000, 11000],
            medianWealth: 11000,
            expectedWealth: 11500,
            survivalRate: 50,
            totalDeposits: 10500,
            trinaryStats: { ruinPercent: 50, suckerPercent: 0, profitPercent: 50 },
            meanSecuritiesPath: [10000, 10500],
            meanDebtPath: [0, 0],
            months: 1
        };
        const strategy = {
            targetLTV: 0.1,
            finalWealthArray: [9000, 13000],
            medianWealth: 13000,
            expectedWealth: 12000,
            benchmarkExpected: 11500,
            survivalRate: 50,
            totalDeposits: 10500,
            trinaryStats: { ruinPercent: 50, suckerPercent: 0, profitPercent: 50 },
            meanSecuritiesPath: [11000, 13000],
            meanDebtPath: [1000, 1050],
            months: 1
        };

        appWindow.displayResults({
            benchmark,
            strategies: [benchmark, strategy],
            loanDetails: { initialEquity: 10000, monthlyBudget: 500, inflationRate: 0.035, years: 1, months: 1 }
        });

        expect(appDocument.getElementById('dcaMeanComparison').hidden).toBe(true);
        expect(appDocument.getElementById('dynamicSummary').textContent).not.toContain('DCA mean');
        expect(appDocument.getElementById('depositsLineChart')).toBeNull();

        const slider = appDocument.getElementById('strategySlider');
        slider.value = '1';
        slider.dispatchEvent(new appWindow.Event('input', { bubbles: true }));

        expect(appDocument.getElementById('dcaMeanComparison').hidden).toBe(false);
        const wealthTraces = newPlot.mock.calls.filter(([target]) => target === 'securitiesDebtChart').at(-1)[1];
        expect(wealthTraces.map((trace) => trace.name)).toEqual([
            'Average Securities (Leveraged)',
            'Average Securities (Unleveraged DCA)',
            'Average Debt',
            'Real Deposits'
        ]);
        expect(wealthTraces[3].y).toEqual([10000, 10500]);
    });
});
