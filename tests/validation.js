import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const configSource = fs.readFileSync(path.join(repoRoot, 'config.js'), 'utf8');

const sandbox = {
    console,
    module: { exports: {} },
    exports: {},
    window: {},
    globalThis: {}
};
sandbox.globalThis.window = sandbox.window;

vm.runInNewContext(configSource, sandbox, { filename: 'config.js' });

const {
    STANDARD_MODE_DEFAULTS,
    MODEL_OPTIONS,
    getModelSelection,
    resolveModelId
} = sandbox.module.exports;

assert.deepEqual(
    Array.from(MODEL_OPTIONS.oscillators, option => option.id),
    ['gbm'],
    'Only the shipped oscillator should be exposed today'
);

assert.deepEqual(
    Array.from(MODEL_OPTIONS.jumps, option => option.id),
    ['none', 'merton'],
    'Only the shipped jump overlays should be exposed today'
);

assert.equal(resolveModelId('gbm', 'none'), 0, 'GBM without jumps should map to provider 0');
assert.equal(resolveModelId('gbm', 'merton'), 1, 'GBM with Merton jumps should map to provider 1');
assert.equal(
    resolveModelId('unsupported', 'combo', STANDARD_MODE_DEFAULTS.MODEL_ID),
    STANDARD_MODE_DEFAULTS.MODEL_ID,
    'Unsupported selections should fall back to the standard default model'
);

assert.deepEqual(
    JSON.parse(JSON.stringify(getModelSelection(STANDARD_MODE_DEFAULTS.MODEL_ID))),
    { oscillatorId: 'gbm', jumpId: 'merton' },
    'The default model id should round-trip to the shipped Custom Mode selectors'
);

console.log('Validation passed.');
