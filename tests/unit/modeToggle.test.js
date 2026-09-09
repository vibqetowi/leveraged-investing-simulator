import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

const LOCKED_INPUT_IDS = ['growth', 'vol', 'marginCall', 'primeRate', 'spreadRate', 'inflationRate'];
const LOCKED_SELECT_IDS = ['oscillatorSelect', 'tailModelSelect'];

describe('Standard vs Custom mode field locking', () => {
    beforeEach(async () => {
        await loadApp();
    });

    it('locks standard-mode inputs as readOnly and selects as disabled by default', () => {
        for (const id of LOCKED_INPUT_IDS) {
            const el = document.getElementById(id);
            expect(el.readOnly, `${id} should be readOnly in standard mode`).toBe(true);
            expect(el.disabled, `${id} should not be disabled in standard mode`).toBe(false);
        }
        for (const id of LOCKED_SELECT_IDS) {
            expect(document.getElementById(id).disabled, `${id} should be disabled in standard mode`).toBe(true);
        }
        expect(document.getElementById('loanAmount').readOnly).toBe(true);
    });

    it('unlocks all fields when switching to Custom Mode', () => {
        document.getElementById('customMode').click();

        for (const id of LOCKED_INPUT_IDS) {
            expect(document.getElementById(id).readOnly, `${id} should be editable in custom mode`).toBe(false);
        }
        for (const id of LOCKED_SELECT_IDS) {
            expect(document.getElementById(id).disabled, `${id} should be enabled in custom mode`).toBe(false);
        }
        expect(document.getElementById('loanAmount').readOnly).toBe(false);
    });

    it('re-locks fields and restores standard defaults when switching back to Standard Mode', () => {
        document.getElementById('customMode').click();
        document.getElementById('growth').value = '99';
        document.getElementById('standardMode').click();

        expect(document.getElementById('growth').readOnly).toBe(true);
        expect(document.getElementById('growth').value).toBe(String(window.STANDARD_MODE_DEFAULTS.GROWTH_RATE));
        expect(document.getElementById('vol').value).toBe(String(window.STANDARD_MODE_DEFAULTS.VOLATILITY));
        expect(document.getElementById('marginCall').value).toBe(String(window.STANDARD_MODE_DEFAULTS.MARGIN_CALL_LTV));
        expect(document.getElementById('primeRate').value).toBe(String(window.STANDARD_MODE_DEFAULTS.PRIME_RATE));
        expect(document.getElementById('spreadRate').value).toBe(String(window.STANDARD_MODE_DEFAULTS.SPREAD_RATE));
        expect(document.getElementById('inflationRate').value).toBe(String(window.STANDARD_MODE_DEFAULTS.INFLATION_RATE));
        expect(document.getElementById('oscillatorSelect').value).toBe('gbm');
        expect(document.getElementById('tailModelSelect').value).toBe('merton');
    });

    it('caps the LTV slider max at 50 in standard mode and 100 in custom mode', () => {
        expect(Number(document.getElementById('ltvSlider').max)).toBe(window.STANDARD_MODE_DEFAULTS.MAX_LTV);
        document.getElementById('customMode').click();
        expect(Number(document.getElementById('ltvSlider').max)).toBe(100);
    });

    it('clamps the LTV slider down to the standard-mode max when switching back from a higher custom value', () => {
        document.getElementById('customMode').click();
        const ltvSlider = document.getElementById('ltvSlider');
        ltvSlider.value = '60';
        ltvSlider.dispatchEvent(new Event('input', { bubbles: true }));

        document.getElementById('standardMode').click();

        expect(Number(ltvSlider.value)).toBe(window.STANDARD_MODE_DEFAULTS.MAX_LTV);
        expect(document.getElementById('ltvDisplay').innerText).toBe(window.STANDARD_MODE_DEFAULTS.MAX_LTV);
    });

    it('hides the LTV warning banner in standard mode even at a high LTV', () => {
        expect(document.getElementById('ltvWarning').classList.contains('is-hidden')).toBe(true);
    });
});
