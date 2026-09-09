import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

function fillValidInputs() {
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

async function runAndReadInputs(app) {
    document.getElementById('calculateBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return app.runSimulationWithAdapter.mock.calls[0]?.[0];
}

describe('Custom Mode provider selection', () => {
    let app;

    beforeEach(async () => {
        app = await loadApp();
        fillValidInputs();
    });

    it('resolves GBM with no jumps to provider 0', async () => {
        document.getElementById('tailModelSelect').value = 'none';

        const inputs = await runAndReadInputs(app);

        expect(inputs.providerId).toBe(0);
    });

    it('resolves GBM with Merton jumps to provider 1', async () => {
        document.getElementById('tailModelSelect').value = 'merton';

        const inputs = await runAndReadInputs(app);

        expect(inputs.providerId).toBe(1);
    });

    it('rejects an uncompiled oscillator before calling the adapter', async () => {
        document.getElementById('oscillatorSelect').value = 'garch';

        await runAndReadInputs(app);

        expect(app.runSimulationWithAdapter).not.toHaveBeenCalled();
        expect(app.alertSpy).toHaveBeenCalledTimes(1);
    });
});
