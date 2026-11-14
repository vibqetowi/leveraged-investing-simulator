# Leveraged Investing Simulator

A browser-based simulator for comparing leveraged investing strategies with plain dollar-cost averaging. Simulation work runs in WebAssembly and Web Workers so the interface remains responsive.

This is an educational tool, not financial, investment, legal, or tax advice. This is a personal project, unrelated to the author's work and not endorsed by any employer. Simulation results depend on the assumptions and parameters entered by the user and do not predict future performance.

## Requirements

- Node.js 22.12 or newer (Vitest 5 requires `^22.12.0 || ^24.0.0 || >=26.0.0`; Vite 8 requires 20.19 or newer)
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

The tests include unit, integration, and browser-DOM smoke coverage. They load the committed artifacts in `build/`, so rebuild WebAssembly with `npm run asbuild` before testing changes to files under `assembly/`, and commit the rebuilt `build/` files with them.

Run the performance benchmark, which runs the full worker and WASM pipeline at production simulation counts and writes a mean/range report to `performance-report.log`:

```bash
npm run perf
```

## Production

This project has no bundler or server-side runtime. Production consists of serving the repository as static files.

The live site is deployed by GitHub Pages: on every push to `main`, `.github/workflows/jekyll-gh-pages.yml` runs `npm ci` and `npm run asbuild`, builds the site with Jekyll (`_config.yml` excludes the sources and dev files), checks that `index.html`, `config.js`, `styles.css` and `build/sim.wasm` are in it, and deploys it. The steps below are for any other static host.

1. Install dependencies and generate release WebAssembly artifacts:

	```bash
	npm ci
	npm run asbuild
	npm test
	```

2. Publish the repository contents, including `index.html`, `styles.css`, `config.js`, `scripts/`, and `build/`, to a static hosting provider or web server.

3. Configure the host to serve `index.html` and to return the correct MIME type for `.wasm` files, preferably `application/wasm`.

4. Open the deployed HTTPS URL and run a calculation. Check the browser console and Network panel for successful loads of the worker scripts and `build/sim.wasm` and `build/stats.wasm`. The math models in `assembly/math.ts` are compiled into `sim.wasm`; `build/math.wasm`, built by `npm run asbuild:math`, is not loaded by the browser.

Do not deploy only the source files under `assembly/`; the browser loads the compiled files from `build/`.

## Project Layout

- `index.html`: application markup and browser entry point
- `styles.css`: application styles
- `config.js`: simulation configuration and defaults
- `scripts/`: calculator, orchestration, worker, and copywriting logic
- `assembly/`: AssemblyScript source for the WASM modules
- `build/`: generated WASM binaries and JavaScript bindings, committed because GitHub Pages and the tests load them ([build/README.md](build/README.md))
- `tests/`: Vitest unit (`tests/unit/`) and integration (`tests/integration/`) tests, their helpers (`tests/helpers/`), and the performance benchmark (`tests/perf/`)
- `asconfig.json`: AssemblyScript compiler targets
- `vitest.config.js`: which test files Vitest runs
- `_config.yml`, `.github/workflows/`: GitHub Pages build and CI ([docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#ci))
- `docs/`: the architecture, data flow and module contracts (`docs/DataFlow.md`), and the development rules, plan and audits for contributors and the coding agent
- `tools/`: stand-ins that run Claude-Code-Setup's repo tools on this repo

## Troubleshooting

### WASM fails to load

Confirm that the server is running from the repository root and that the required files exist (PowerShell):

```powershell
Test-Path build/sim.wasm
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
