import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

describe('mode description copy (Standard vs Custom)', () => {
    beforeEach(async () => {
        await loadApp();
    });

    it('shows the standard-mode description by default', () => {
        expect(document.getElementById('modeDescription').innerHTML).toBe(window.CopywritingHelpers.getModeStandardDescription());
    });

    it('shows the custom-mode description after clicking Custom Mode', () => {
        document.getElementById('customMode').click();
        expect(document.getElementById('modeDescription').innerHTML).toBe(window.CopywritingHelpers.getModeCustomDescription());
    });

    it('shows the standard-mode description again after switching back', () => {
        document.getElementById('customMode').click();
        document.getElementById('standardMode').click();
        expect(document.getElementById('modeDescription').innerHTML).toBe(window.CopywritingHelpers.getModeStandardDescription());
    });
});
