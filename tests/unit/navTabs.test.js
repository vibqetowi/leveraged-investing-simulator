import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

describe('preamble nav tabs (constant vs lifecycle)', () => {
    beforeEach(async () => {
        await loadApp();
    });

    it('shows the constant-leverage preamble by default with matching copy', () => {
        const constantPanel = document.getElementById('constant-leverage-dca-copy');
        const lifecyclePanel = document.getElementById('lifecycle-investing-copy');
        expect(constantPanel.hidden).toBe(false);
        expect(lifecyclePanel.hidden).toBe(true);
        expect(constantPanel.textContent).toBe(document.createRange().createContextualFragment(window.CopywritingHelpers.getConstantPreambleHtml()).textContent);
        expect(document.querySelector('.nav-tab[data-preamble="constant"]').classList.contains('active')).toBe(true);
    });

    it('switches to the lifecycle preamble when its nav tab is clicked', () => {
        document.querySelector('.nav-tab[data-preamble="lifecycle"]').click();

        const constantPanel = document.getElementById('constant-leverage-dca-copy');
        const lifecyclePanel = document.getElementById('lifecycle-investing-copy');
        expect(constantPanel.hidden).toBe(true);
        expect(lifecyclePanel.hidden).toBe(false);
        expect(lifecyclePanel.textContent).toBe(document.createRange().createContextualFragment(window.CopywritingHelpers.getLifecyclePreambleHtml()).textContent);
        expect(document.querySelector('.nav-tab[data-preamble="lifecycle"]').classList.contains('active')).toBe(true);
        expect(document.querySelector('.nav-tab[data-preamble="constant"]').classList.contains('active')).toBe(false);
    });

    it('switches back to the constant preamble when its tab is clicked again', () => {
        document.querySelector('.nav-tab[data-preamble="lifecycle"]').click();
        document.querySelector('.nav-tab[data-preamble="constant"]').click();

        expect(document.getElementById('constant-leverage-dca-copy').hidden).toBe(false);
        expect(document.getElementById('lifecycle-investing-copy').hidden).toBe(true);
    });
});
