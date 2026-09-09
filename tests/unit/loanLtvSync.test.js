import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

describe('LTV / loan amount / collateral synchronization', () => {
    beforeEach(async () => {
        await loadApp();
        document.getElementById('customMode').click();
    });

    it('recomputes loan amount when the LTV slider changes', () => {
        document.getElementById('assetValue').value = '10000';
        document.getElementById('assetValue').dispatchEvent(new Event('input', { bubbles: true }));

        const slider = document.getElementById('ltvSlider');
        slider.value = '25';
        slider.dispatchEvent(new Event('input', { bubbles: true }));

        expect(document.getElementById('loanAmount').value).toBe('2500');
        expect(document.getElementById('ltvDisplay').innerText).toBe(25);
    });

    it('recomputes the LTV slider and display when loan amount is edited directly', () => {
        document.getElementById('assetValue').value = '10000';
        document.getElementById('assetValue').dispatchEvent(new Event('input', { bubbles: true }));

        const loanAmount = document.getElementById('loanAmount');
        loanAmount.value = '4000';
        loanAmount.dispatchEvent(new Event('input', { bubbles: true }));

        expect(document.getElementById('ltvSlider').value).toBe('40');
        expect(document.getElementById('ltvDisplay').innerText).toBe(40);
    });

    it('recomputes loan amount when collateral changes, keeping LTV constant', () => {
        const slider = document.getElementById('ltvSlider');
        slider.value = '20';
        slider.dispatchEvent(new Event('input', { bubbles: true }));

        const assetValue = document.getElementById('assetValue');
        assetValue.value = '20000';
        assetValue.dispatchEvent(new Event('input', { bubbles: true }));

        expect(document.getElementById('loanAmount').value).toBe('4000');
    });

    it('keeps loan amount locked read-only in Standard Mode', () => {
        document.getElementById('standardMode').click();
        expect(document.getElementById('loanAmount').readOnly).toBe(true);
    });
});
