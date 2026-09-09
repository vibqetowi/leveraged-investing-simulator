import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPort } from 'node:worker_threads';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));

globalThis.self = {
    postMessage(message) {
        parentPort.postMessage(message);
    }
};

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

await import('./simulationWorker.js');

parentPort.on('message', (message) => {
    globalThis.self.onmessage({ data: message });
});