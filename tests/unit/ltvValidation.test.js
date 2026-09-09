import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

function setLtv(value) {
    const slider = document.getElementById('ltvSlider');
    slider.value = String(value);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Custom Mode LTV warning thresholds', () => {
    beforeEach(async () => {
        await loadApp();
        document.getElementById('customMode').click();
    });

    it('shows no warning and the default slider color below 35% LTV', () => {
        setLtv(20);
        const slider = document.getElementById('ltvSlider');
        expect(slider.classList.contains('strategy-slider--default')).toBe(true);
        expect(slider.classList.contains('strategy-slider--warning')).toBe(false);
        expect(slider.classList.contains('strategy-slider--danger')).toBe(false);
        expect(document.getElementById('ltvWarning').classList.contains('is-hidden')).toBe(true);
    });

    it('shows a yellow warning between 35% and 99% LTV', () => {
        setLtv(40);
        const slider = document.getElementById('ltvSlider');
        expect(slider.classList.contains('strategy-slider--warning')).toBe(true);
        expect(document.getElementById('ltvWarning').classList.contains('is-hidden')).toBe(false);
        expect(document.getElementById('ltvWarningIcon').textContent).toBe('⚠️');
        expect(document.getElementById('ltvWarningText').textContent).toContain('exceeds 35%');
    });

    it('shows a red danger warning at or above 100% LTV', () => {
        setLtv(100);
        const slider = document.getElementById('ltvSlider');
        expect(slider.classList.contains('strategy-slider--danger')).toBe(true);
        expect(document.getElementById('ltvWarning').classList.contains('is-hidden')).toBe(false);
        expect(document.getElementById('ltvWarningIcon').textContent).toBe('🚨');
        expect(document.getElementById('ltvWarningText').textContent).toContain('exceeds 100%');
    });

    it('clears the warning again when moving back below 35%', () => {
        setLtv(100);
        setLtv(10);
        expect(document.getElementById('ltvWarning').classList.contains('is-hidden')).toBe(true);
        expect(document.getElementById('ltvSlider').classList.contains('strategy-slider--danger')).toBe(false);
    });
});
