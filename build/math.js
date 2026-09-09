async function instantiate(module, imports = {}) {
  const adaptedImports = {
    env: Object.assign(Object.create(globalThis), imports.env || {}, {
      abort(message, fileName, lineNumber, columnNumber) {
        // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
        message = __liftString(message >>> 0);
        fileName = __liftString(fileName >>> 0);
        lineNumber = lineNumber >>> 0;
        columnNumber = columnNumber >>> 0;
        (() => {
          // @external.js
          throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
        })();
      },
      seed() {
        // ~lib/builtins/seed() => f64
        return (() => {
          // @external.js
          return Date.now() * Math.random();
        })();
      },
    }),
  };
  const { exports } = await WebAssembly.instantiate(module, adaptedImports);
  const memory = exports.memory || imports.env.memory;
  const adaptedExports = Object.setPrototypeOf({
    runOscillator_gbm(state, config, month) {
      // assembly/math/runOscillator_gbm(~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, i32) => f64
      state = __retain(__lowerStaticArray(__setF64, 4, 3, state, Float64Array) || __notnull());
      config = __lowerStaticArray(__setF64, 4, 3, config, Float64Array) || __notnull();
      try {
        return exports.runOscillator_gbm(state, config, month);
      } finally {
        __release(state);
      }
    },
    runJump_none(state, config, month) {
      // assembly/math/runJump_none(~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, i32) => f64
      state = __retain(__lowerStaticArray(__setF64, 4, 3, state, Float64Array) || __notnull());
      config = __lowerStaticArray(__setF64, 4, 3, config, Float64Array) || __notnull();
      try {
        return exports.runJump_none(state, config, month);
      } finally {
        __release(state);
      }
    },
    runJump_merton(state, config, month) {
      // assembly/math/runJump_merton(~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, i32) => f64
      state = __retain(__lowerStaticArray(__setF64, 4, 3, state, Float64Array) || __notnull());
      config = __lowerStaticArray(__setF64, 4, 3, config, Float64Array) || __notnull();
      try {
        return exports.runJump_merton(state, config, month);
      } finally {
        __release(state);
      }
    },
    getSimulationMethod(providerId) {
      // assembly/math/getSimulationMethod(i32) => (~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, f64, f64, i32) => void
      return __liftInternref(exports.getSimulationMethod(providerId) >>> 0);
    },
    initializeLeveragedDCAState(state, config, targetLTV) {
      // assembly/math/initializeLeveragedDCAState(~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, f64) => void
      state = __retain(__lowerStaticArray(__setF64, 4, 3, state, Float64Array) || __notnull());
      config = __lowerStaticArray(__setF64, 4, 3, config, Float64Array) || __notnull();
      try {
        exports.initializeLeveragedDCAState(state, config, targetLTV);
      } finally {
        __release(state);
      }
    },
    sim_gbm_none_const_const(state, config, monthlyDeposit, targetLTV, month) {
      // assembly/math/sim_gbm_none_const_const(~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, f64, f64, i32) => void
      state = __retain(__lowerStaticArray(__setF64, 4, 3, state, Float64Array) || __notnull());
      config = __lowerStaticArray(__setF64, 4, 3, config, Float64Array) || __notnull();
      try {
        exports.sim_gbm_none_const_const(state, config, monthlyDeposit, targetLTV, month);
      } finally {
        __release(state);
      }
    },
    sim_gbm_merton_const_const(state, config, monthlyDeposit, targetLTV, month) {
      // assembly/math/sim_gbm_merton_const_const(~lib/staticarray/StaticArray<f64>, ~lib/staticarray/StaticArray<f64>, f64, f64, i32) => void
      state = __retain(__lowerStaticArray(__setF64, 4, 3, state, Float64Array) || __notnull());
      config = __lowerStaticArray(__setF64, 4, 3, config, Float64Array) || __notnull();
      try {
        exports.sim_gbm_merton_const_const(state, config, monthlyDeposit, targetLTV, month);
      } finally {
        __release(state);
      }
    },
  }, exports);
  function __liftString(pointer) {
    if (!pointer) return null;
    const
      end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1,
      memoryU16 = new Uint16Array(memory.buffer);
    let
      start = pointer >>> 1,
      string = "";
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
    return string + String.fromCharCode(...memoryU16.subarray(start, end));
  }
  function __lowerStaticArray(lowerElement, id, align, values, typedConstructor) {
    if (values == null) return 0;
    const
      length = values.length,
      buffer = exports.__pin(exports.__new(length << align, id)) >>> 0;
    if (typedConstructor) {
      new typedConstructor(memory.buffer, buffer, length).set(values);
    } else {
      for (let i = 0; i < length; i++) lowerElement(buffer + (i << align >>> 0), values[i]);
    }
    exports.__unpin(buffer);
    return buffer;
  }
  class Internref extends Number {}
  const registry = new FinalizationRegistry(__release);
  function __liftInternref(pointer) {
    if (!pointer) return null;
    const sentinel = new Internref(__retain(pointer));
    registry.register(sentinel, pointer);
    return sentinel;
  }
  const refcounts = new Map();
  function __retain(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount) refcounts.set(pointer, refcount + 1);
      else refcounts.set(exports.__pin(pointer), 1);
    }
    return pointer;
  }
  function __release(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount === 1) exports.__unpin(pointer), refcounts.delete(pointer);
      else if (refcount) refcounts.set(pointer, refcount - 1);
      else throw Error(`invalid refcount '${refcount}' for reference '${pointer}'`);
    }
  }
  function __notnull() {
    throw TypeError("value must not be null");
  }
  let __dataview = new DataView(memory.buffer);
  function __setF64(pointer, value) {
    try {
      __dataview.setFloat64(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setFloat64(pointer, value, true);
    }
  }
  return adaptedExports;
}
export const {
  memory,
  randn,
  simulateGeometricBrownianMotionMonthlyGrowthFactor,
  simulateMertonJumpFactor,
  runOscillator_gbm,
  runJump_none,
  runJump_merton,
  getSimulationMethod,
  initializeLeveragedDCAState,
  sim_gbm_none_const_const,
  sim_gbm_merton_const_const,
} = await (async url => instantiate(
  await (async () => {
    const isNodeOrBun = typeof process != "undefined" && process.versions != null && (process.versions.node != null || process.versions.bun != null);
    if (isNodeOrBun) { return globalThis.WebAssembly.compile(await (await import("node:fs/promises")).readFile(url)); }
    else { return await globalThis.WebAssembly.compileStreaming(globalThis.fetch(url)); }
  })(), {
  }
))(new URL("math.wasm", import.meta.url));
