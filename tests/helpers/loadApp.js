import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const APP_SCRIPTS = ['config.js', 'scripts/copywritingHelper.js', 'scripts/calculatorHandler.js'];

function extractBody(html) {
    const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return match ? match[1] : html;
}

// Loads index.html + real app scripts into a fresh jsdom Document, exactly like a browser would,
// without spawning the real simulation Workers/wasm (runSimulationWithAdapter is stubbed).
// A brand-new JSDOM instance is created per call so listeners registered on `document` in one test
// (e.g. calculatorHandler.js's DOMContentLoaded handler) never leak into the next test.
//
// NOTE: jsdom fires its own real 'DOMContentLoaded' asynchronously once parsing completes, on top of
// whatever we do manually. We must NOT dispatch a second synthetic one - the app's init code (which
// resets state to defaults) would then run twice and clobber whatever the test set up in between.
// Instead we register our scripts synchronously (before the real event fires) and await that one event.
export async function loadApp() {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const bodyHtml = extractBody(html);
    const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`, {
        url: 'http://localhost/',
        runScripts: 'outside-only',
        pretendToBeVisual: true
    });
    const { window } = dom;
    const { document } = window;

    const runSimulationWithAdapter = vi.fn().mockResolvedValue(null);
    window.runSimulationWithAdapter = runSimulationWithAdapter;

    const alertSpy = vi.fn();
    window.alert = alertSpy;

    // jsdom does not implement scrollIntoView.
    window.HTMLElement.prototype.scrollIntoView = window.HTMLElement.prototype.scrollIntoView || (() => {});
    const scrollIntoViewSpy = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});

    for (const relPath of APP_SCRIPTS) {
        const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
        window.eval(source);
    }

    await new Promise((resolve) => {
        if (document.readyState !== 'loading') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', resolve, { once: true });
        }
    });

    // Expose as ambient globals so tests can keep using bare `document`/`window`/`Event`.
    globalThis.window = window;
    globalThis.document = document;
    globalThis.Event = window.Event;

    return { document, window, runSimulationWithAdapter, alertSpy, scrollIntoViewSpy };
}

