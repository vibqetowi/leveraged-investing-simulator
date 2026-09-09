import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

const VALIDATED_FIELD_IDS = ['loanPeriod', 'assetValue', 'monthlyBudget', 'primeRate', 'spreadRate', 'growth', 'vol', 'marginCall', 'inflationRate'];

describe('Calculate input validation', () => {
    let app;

    beforeEach(async () => {
        app = await loadApp();
        document.getElementById('customMode').click();
    });

    it.each(VALIDATED_FIELD_IDS)('blocks calculation when %s is negative', async (id) => {
        document.getElementById(id).value = '-1';
        document.getElementById('calculateBtn').click();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(app.alertSpy).toHaveBeenCalledTimes(1);
        expect(app.alertSpy.mock.calls[0][0]).toContain('valid non-negative number');
        expect(app.runSimulationWithAdapter).not.toHaveBeenCalled();
    });

    it.each(VALIDATED_FIELD_IDS)('blocks calculation when %s is not a number', async (id) => {
        document.getElementById(id).value = 'abc';
        document.getElementById('calculateBtn').click();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(app.alertSpy).toHaveBeenCalledTimes(1);
        expect(app.runSimulationWithAdapter).not.toHaveBeenCalled();
    });

    it('allows calculation to proceed when all validated fields are valid', async () => {
        for (const id of VALIDATED_FIELD_IDS) {
            document.getElementById(id).value = '10';
        }
        document.getElementById('calculateBtn').click();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(app.alertSpy).not.toHaveBeenCalled();
        expect(app.runSimulationWithAdapter).toHaveBeenCalledTimes(1);
    });
});
