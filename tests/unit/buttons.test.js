import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

function fillValidCalculatorInputs() {
    document.getElementById('customMode').click();
    document.getElementById('loanPeriod').value = '30';
    document.getElementById('assetValue').value = '10000';
    document.getElementById('monthlyBudget').value = '500';
    document.getElementById('primeRate').value = '6';
    document.getElementById('spreadRate').value = '1';
    document.getElementById('growth').value = '10';
    document.getElementById('vol').value = '16.5';
    document.getElementById('marginCall').value = '60';
    document.getElementById('inflationRate').value = '3.5';
}

async function flushHandleCalculate() {
    // handleCalculate's own setTimeout(0) callback runs and drains its microtask chain before this fires.
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Button firing', () => {
    let app;

    beforeEach(async () => {
        app = await loadApp();
    });

    it('scrolls the calculator into view when Jump to Calculator is clicked', () => {
        document.getElementById('jumpToCalculator').click();
        expect(app.scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    });

    it('toggles active state exclusively between Standard Mode and Custom Mode buttons', () => {
        const standardBtn = document.getElementById('standardMode');
        const customBtn = document.getElementById('customMode');
        expect(standardBtn.classList.contains('btn--active')).toBe(true);
        expect(customBtn.classList.contains('btn--active')).toBe(false);

        customBtn.click();
        expect(standardBtn.classList.contains('btn--active')).toBe(false);
        expect(customBtn.classList.contains('btn--active')).toBe(true);

        standardBtn.click();
        expect(standardBtn.classList.contains('btn--active')).toBe(true);
        expect(customBtn.classList.contains('btn--active')).toBe(false);
    });

    it('shows a loading state on click and restores it once the stubbed simulation resolves', async () => {
        fillValidCalculatorInputs();
        const button = document.getElementById('calculateBtn');

        button.click();
        expect(button.disabled).toBe(true);
        expect(button.classList.contains('loading')).toBe(true);
        expect(button.innerHTML).toContain('Calculating');

        await flushHandleCalculate();

        expect(button.disabled).toBe(false);
        expect(button.classList.contains('loading')).toBe(false);
        expect(button.innerHTML).toBe('Calculate');
    });

    it('calls the (stubbed) simulation adapter with the expected input shape on a valid Calculate click', async () => {
        fillValidCalculatorInputs();
        document.getElementById('calculateBtn').click();
        await flushHandleCalculate();

        expect(app.runSimulationWithAdapter).toHaveBeenCalledTimes(1);
        const inputs = app.runSimulationWithAdapter.mock.calls[0][0];
        expect(inputs).toMatchObject({
            initialEquity: 10000,
            loanAmount: 2000,
            years: 30,
            monthlyBudget: 500,
            growth: 0.1,
            volatility: 0.165,
            inflation: 0.035,
            marginCallLTV: 0.6,
            months: 360
        });
        expect(inputs.simulationCount).toBe(window.UI_CONSTANTS.SIMULATION_COUNT);
        expect(inputs.baselineSimulationCount).toBe(window.UI_CONSTANTS.BASE_CASE_SIMULATIONS);
        expect(inputs.numStrategies).toBe(window.UI_CONSTANTS.NUM_STRATEGIES - 1);
    });

    it('does not call the simulation adapter when inputs are invalid', async () => {
        fillValidCalculatorInputs();
        document.getElementById('assetValue').value = '-5';
        document.getElementById('calculateBtn').click();
        await flushHandleCalculate();

        expect(app.runSimulationWithAdapter).not.toHaveBeenCalled();
        expect(app.alertSpy).toHaveBeenCalledTimes(1);
    });

    it('does not throw when the strategy slider fires before any simulation has run', () => {
        const slider = document.getElementById('strategySlider');
        expect(() => {
            slider.value = '5';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        }).not.toThrow();
    });

    it('fires the nav-tab click listener to switch preambles', () => {
        document.querySelector('.nav-tab[data-preamble="lifecycle"]').click();
        expect(document.getElementById('lifecycle-investing-copy').hidden).toBe(false);
    });
});
