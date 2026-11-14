import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

// The page's copy describes leveraged DCA: a recurring investment above the budget,
// bought at a fixed purchasing LTV, with no target LTV held on the portfolio.
describe('leveraged DCA copy', () => {
    beforeEach(async () => {
        await loadApp();
    });

    const pageText = () => document.body.textContent;

    it('speaks of a purchasing LTV and never of a target LTV', () => {
        const preamble = window.CopywritingHelpers.getConstantPreambleHtml();
        const narrative = window.CopywritingHelpers.getStrategySummaryNarrative(0.4, 90, 64000, 60000, 4000, 50000);
        expect(preamble).toContain('purchasing LTV');
        expect(preamble).toContain('investing automation');
        expect(narrative.strategy).toContain('purchasing LTV of 40.0%');
        expect(pageText()).toContain('Max Purchasing LTV');
        for (const text of [preamble, narrative.strategy, pageText()]) {
            expect(text).not.toMatch(/target LTV|target ratio|max test LTV/i);
        }
    });

    it('never addresses the reader', () => {
        const copy = [
            pageText(),
            window.CopywritingHelpers.getConstantPreambleHtml(),
            window.CopywritingHelpers.getModeStandardDescription(),
            window.CopywritingHelpers.getModeCustomDescription()
        ];
        for (const text of copy) {
            expect(text).not.toMatch(/\byou(r|'re)?\b/i);
        }
    });

    // The framing and the table's row list name robo-advisors as products; nowhere else may the word appear.
    it('calls the tool an investing automation, never a robo-advisor', () => {
        document.getElementById('framing-problem').remove();
        document.getElementById('table-rows').remove();
        expect(pageText()).not.toMatch(/robo/i);
        expect(window.CopywritingHelpers.getConstantPreambleHtml()).toContain('investing automation');
        expect(document.getElementById('investor-behaviour').textContent).toContain('recurring');
    });

    it('lists the monthly steps in order, with the deposit before the margin check', () => {
        const steps = [...document.querySelectorAll('.methodology ol.compact-numbered > li strong')].map((s) => s.textContent);
        expect(steps).toEqual([
            'Run market movements:',
            'Interest accrual:',
            'Deposit:',
            'Check margin:',
            'Recurring investment:'
        ]);
    });

    it('defines ruin as at or below total real deposits', () => {
        expect(pageText()).toContain('at or below total real deposits');
    });

    it('teaches in the order a reader asks: framing, criteria, table, DCA, its problems, leveraged DCA, the objection, calculations', () => {
        const text = pageText();
        const markers = [
            'self-directed brokerage account',
            'following framework',
            'Common Investing Strategies Compared',
            'What Each Row Covers',
            'Investing 101: Dollar Cost Averaging',
            'Problems with DCA and Potential Fixes',
            'last decade risk',
            'Portfolio Modeling Assumption',
            'As Close to Ideal as Possible: Leveraged DCA',
            'Margin, Leverage, and LTV',
            "Isn't This Insane?",
            'For the Nerds: Why I Define Constant Leverage From the Buying Side',
            'What the Simulator Calculates',
            'Outputs'
        ];
        const positions = markers.map((marker) => text.indexOf(marker));
        expect(positions.every((p) => p >= 0)).toBe(true);
        expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    });

    it('keeps the margin maths, the table rows and the leverage comparison in collapsed dropdowns', () => {
        const maths = document.getElementById('margin-maths');
        const rows = document.getElementById('table-rows');
        const perPurchase = document.getElementById('leverage-per-purchase');
        for (const box of [maths, rows, perPurchase]) {
            expect(box.classList.contains('box--info')).toBe(true);
            expect(box.classList.contains('is-collapsed')).toBe(true);
        }
        expect(maths.textContent).toContain('f² · σ²');
        expect(perPurchase.textContent).toContain('momentum trading');
        expect(perPurchase.innerHTML).toContain('finra.org/rules-guidance/notices/09-31');
        for (const id of ['dca-problems', 'investor-behaviour', 'why-margin', 'thesis', 'outputs']) {
            expect(document.getElementById(id).closest('.box--info')).toBeNull();
        }
    });

    // The main copy carries the page: the words the results use are defined outside any dropdown.
    it('defines the outcomes the results report outside any dropdown', () => {
        const outputs = document.getElementById('outputs');
        expect(outputs.closest('.box--info')).toBeNull();
        for (const term of ['Survival probability', 'Ruin', 'Sucker', 'Profit', 'at or below total real deposits']) {
            expect(outputs.textContent).toContain(term);
        }
    });

    it('defines every symbol the maths box uses before its formulas', () => {
        const maths = document.getElementById('margin-maths');
        const defined = [...maths.querySelectorAll('#margin-symbols strong')].map((s) => s.textContent);
        expect(defined).toEqual(['V', 'D', 'E', 'L', 'f', 'r', 'i', 'σ']);
        const symbolList = maths.querySelector('#margin-symbols');
        const firstFormula = maths.querySelector('.formula');
        expect(symbolList.compareDocumentPosition(firstFormula) & window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const formulas = [...maths.querySelectorAll('.formula')].map((f) => f.textContent).join(' ');
        const used = new Set(formulas.match(/[A-Za-zσ]+/g).filter((t) => t.length === 1 || t === 'σ'));
        for (const symbol of used) {
            expect(defined).toContain(symbol);
        }
    });

    it('states the disclaimer impersonally', () => {
        expect(pageText().replace(/\s+/g, ' ')).toContain("personal project, unrelated to the author's work");
    });

    it('says leverage multiplies volatility, never that it exponentiates it', () => {
        expect(pageText()).not.toMatch(/exponent/i);
    });
});
