import { describe, it, expect, beforeEach } from 'vitest';
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
});
