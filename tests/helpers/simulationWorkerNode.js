import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parentPort } from 'node:worker_threads';

// Test-only Node bridge: polyfills the browser Worker globals that scripts/simulationWorker.js
// expects (self, fetch, location) so the real unmodified worker script can run inside a
// node:worker_threads Worker for tests/perf benchmarking, without a browser or jsdom.
const scriptsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts');

globalThis.self = {
    postMessage(message) {
        parentPort.postMessage(message);
    }
};

// Real browser workers always have a location; polyfill it so simulationWorker.js's
// dev-only perf tracing behaves the same here as in a real worker.
globalThis.location = { hostname: 'localhost' };

globalThis.fetch = async (requestPath) => {
    const filePath = path.resolve(scriptsDirectory, requestPath);
    const buffer = await fs.readFile(filePath);
    return {
        ok: true,
        status: 200,
        async arrayBuffer() {
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }
    };
};

await import(pathToFileURL(path.join(scriptsDirectory, 'simulationWorker.js')));

parentPort.on('message', (message) => {
    globalThis.self.onmessage({ data: message });
});
