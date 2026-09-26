import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

describe('smoke: loadApp', () => {
    beforeEach(async () => {
        await loadApp();
    });

    it('initializes standard mode with default values', () => {
        expect(document.getElementById('loanPeriod').value).toBe('30');
        expect(document.getElementById('standardMode').classList.contains('btn--active')).toBe(true);
    });

    it('can be reloaded without redeclaration errors', async () => {
        await loadApp();
        expect(document.getElementById('assetValue').value).toBe('10000');
    });
});
