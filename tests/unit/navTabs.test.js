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

    // The lifecycle tab is commented out in index.html until that strategy ships.
    it('offers no lifecycle tab yet, and keeps the lifecycle panel hidden', () => {
        expect(document.querySelector('.nav-tab[data-preamble="lifecycle"]')).toBeNull();
        expect(document.getElementById('lifecycle-investing-copy').hidden).toBe(true);
    });

    it('shows the constant preamble again when its tab is clicked', () => {
        document.getElementById('constant-leverage-dca-copy').hidden = true;
        document.querySelector('.nav-tab[data-preamble="constant"]').click();

        expect(document.getElementById('constant-leverage-dca-copy').hidden).toBe(false);
        expect(document.getElementById('lifecycle-investing-copy').hidden).toBe(true);
    });
});
