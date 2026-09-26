# Leveraged Investing Simulator

A browser-based simulator for comparing leveraged investing strategies with plain dollar-cost averaging. Simulation work runs in WebAssembly and Web Workers so the interface remains responsive.

This is an educational tool, not financial, investment, legal, or tax advice. Simulation results depend on the assumptions and parameters entered by the user and do not predict future performance.

## Requirements

- Node.js 18 or newer
- npm
- A modern browser with WebAssembly and Web Worker support
- Vite for local development, installed by `npm install`

## Development

Install dependencies and build the WebAssembly artifacts:

```bash
npm install
npm run asbuild
```

Start the Vite development server:

```bash
npm run dev
```

Open the URL printed by Vite, normally <http://localhost:5173>. Vite serves the repository over HTTP, which is required for the WebAssembly and Web Worker files. Stop the server with `Ctrl+C`.

### Development WASM build

The default build creates optimized artifacts. To create the debug simulator artifact instead:

```bash
npm run asbuild:untouched
```

The generated files are written to `build/` and are not created by the browser at runtime.

## Testing

Run the complete automated test suite once:

```bash
npm test
```

Run Vitest in watch mode while developing:

```bash
npm run test:watch
```

The tests include unit, integration, and browser-DOM smoke coverage. Rebuild WebAssembly with `npm run asbuild` before testing changes to files under `assembly/`.

## Production

This project has no bundler or server-side runtime. Production consists of serving the repository as static files.

1. Install dependencies and generate release WebAssembly artifacts:

	```bash
	npm ci
	npm run asbuild
	npm test
	```

2. Publish the repository contents, including `index.html`, `styles.css`, `config.js`, `scripts/`, and `build/`, to a static hosting provider or web server.

3. Configure the host to serve `index.html` and to return the correct MIME type for `.wasm` files, preferably `application/wasm`.

4. Open the deployed HTTPS URL and run a calculation. Check the browser console and Network panel for successful loads of the worker scripts and `build/sim.wasm`, `build/math.wasm`, and `build/stats.wasm`.

Do not deploy only the source files under `assembly/`; the browser loads the compiled files from `build/`.

## Project Layout

- `index.html`: application markup and browser entry point
- `styles.css`: application styles
- `config.js`: simulation configuration and defaults
- `scripts/`: calculator, orchestration, worker, and copywriting logic
- `assembly/`: AssemblyScript source for the WASM modules
- `build/`: generated WASM binaries and JavaScript bindings
- `tests/`: Vitest unit and integration tests
- `asconfig.json`: AssemblyScript compiler targets

## Troubleshooting

### WASM fails to load

Confirm that the server is running from the repository root and that the required files exist:

```bash
Test-Path build/sim.wasm
Test-Path build/math.wasm
Test-Path build/stats.wasm
```

Then reload the page and inspect the browser console and Network panel. A `Failed to fetch` error usually means the page was opened with `file://`, the server is using the wrong root, or a generated artifact is missing.

### Results or UI do not update

Run `npm test`, rebuild with `npm run asbuild`, and reload the page without a cached copy. Worker failures are reported in the browser console.

### The development port is already in use

Start Vite on another port:

```bash
npm run dev -- --port 5174
```
