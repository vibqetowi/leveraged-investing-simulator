# Build Directory

The compiled WebAssembly the browser and the tests load. These files are
committed: GitHub Pages serves them, and `npm test` loads them without
rebuilding. Rebuild and commit them whenever `assembly/` changes.

| Command | Source | Writes | Loaded by |
| --- | --- | --- | --- |
| `npm run asbuild:optimized` (release target in `asconfig.json`) | `assembly/index.ts`, with `assembly/math.ts` compiled in | `sim.wasm`, `sim.wat`, `sim.wasm.map`, `sim.js`, `sim.d.ts` | `scripts/simulationWorker.js` |
| `npm run asbuild:stats` | `assembly/stats.ts` | `stats.wasm`, `stats.wat`, `stats.wasm.map`, `stats.js`, `stats.d.ts` | `scripts/simulationWorker.js` |
| `npm run asbuild:math` | `assembly/math.ts` alone | `math.wasm`, `math.wat`, `math.wasm.map`, `math.js`, `math.d.ts` | nothing at runtime |
| `npm run asbuild:untouched` (debug target) | `assembly/index.ts` | `sim.debug.wasm`, `sim.debug.wat`, source map | nothing; for debugging |

`npm run asbuild` runs the first three. The `.wat` files are the
human-readable WebAssembly text; the `.js` and `.d.ts` files are the ESM
bindings.
