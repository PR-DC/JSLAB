/* @ts-self-types="./OpenModelicaCompiler.d.ts" */

/**
 * A struct representing a Trap
 */
export class Trap {
    static __wrap(ptr) {
        const obj = Object.create(Trap.prototype);
        obj.__wbg_ptr = ptr;
        TrapFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TrapFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_trap_free(ptr, 0);
    }
    /**
     * A marker method to indicate that an object is an instance of the `Trap`
     * class.
     */
    static __wbg_wasmer_trap() {
        wasm.trap___wbg_wasmer_trap();
    }
}
if (Symbol.dispose) Trap.prototype[Symbol.dispose] = Trap.prototype.free;

/**
 * @returns {number}
 */
export function jslab_bridge_enable() {
    const ret = wasm.jslab_bridge_enable();
    return ret >>> 0;
}

/**
 * @returns {number}
 */
export function jslab_bridge_version() {
    const ret = wasm.jslab_bridge_version();
    return ret >>> 0;
}

/**
 * @param {string} command
 * @returns {string}
 */
export function jslab_eval(command) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(command, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.jslab_eval(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @returns {boolean}
 */
export function jslab_init() {
    const ret = wasm.jslab_init();
    return ret !== 0;
}

/**
 * @param {string} name
 * @param {string} value
 */
export function jslab_set_env(name, value) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    wasm.jslab_set_env(ptr0, len0, ptr1, len1);
}

/**
 * @param {number} mode
 */
export function jslab_set_inwasm_driver(mode) {
    wasm.jslab_set_inwasm_driver(mode);
}

/**
 * @param {boolean} enabled
 */
export function jslab_set_sim_bench(enabled) {
    wasm.jslab_set_sim_bench(enabled);
}

/**
 * @param {number} index
 * @returns {Float64Array | undefined}
 */
export function jslab_sim_column(index) {
    const ret = wasm.jslab_sim_column(index);
    let v1;
    if (ret[0] !== 0) {
        v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    }
    return v1;
}

/**
 * @returns {any}
 */
export function jslab_sim_info() {
    const ret = wasm.jslab_sim_info();
    return ret;
}

/**
 * @returns {any}
 */
export function jslab_sim_parameters() {
    const ret = wasm.jslab_sim_parameters();
    return ret;
}

/**
 * @returns {any}
 */
export function jslab_sim_series() {
    const ret = wasm.jslab_sim_series();
    return ret;
}

/**
 * @returns {Float64Array | undefined}
 */
export function jslab_sim_time() {
    const ret = wasm.jslab_sim_time();
    let v1;
    if (ret[0] !== 0) {
        v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    }
    return v1;
}

/**
 * @returns {any}
 */
export function jslab_sim_units() {
    const ret = wasm.jslab_sim_units();
    return ret;
}

/**
 * @param {string} class_name
 * @param {number} stop_time
 * @param {number} number_of_intervals
 * @param {number} tolerance
 * @param {string} method
 * @param {string} simflags
 * @returns {string}
 */
export function jslab_simulate(class_name, stop_time, number_of_intervals, tolerance, method, simflags) {
    let deferred7_0;
    let deferred7_1;
    try {
        const val4 = +stop_time;
        const val5 = +number_of_intervals;
        const val6 = +tolerance;
        let ptr0, len0, ptr1, len1, ptr2, len2;
        try {
            ptr0 = passStringToWasm0(class_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(method, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
            ptr2 = passStringToWasm0(simflags, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len2 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.jslab_simulate(ptr0, len0, val4, val5, val6, ptr1, len1, ptr2, len2);
        deferred7_0 = ret[0];
        deferred7_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred7_0, deferred7_1, 1);
    }
}

/**
 * @returns {any}
 */
export function jslab_take_pending_downloads() {
    const ret = wasm.jslab_take_pending_downloads();
    return ret;
}

/**
 * @param {string} mount
 * @param {Uint8Array | number[]} data
 * @returns {number}
 */
export function jslab_vfs_load_zip(mount, data) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(mount, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.jslab_vfs_load_zip(ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
}

/**
 * @param {string} path
 * @param {Uint8Array | number[]} bytes
 */
export function jslab_write_file(path, bytes) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    wasm.jslab_write_file(ptr0, len0, ptr1, len1);
}

/**
 * Enable the cross-thread cancel poll for any blocking omc call (simulate, and
 * the frontend/loader/backend chokepoints). The worker must define
 * the host cancel callback first; the standalone simulator
 * cancels via `omc_sim_free` instead and doesn't call this.
 */
export function omc_enable_cancel_poll() {
    wasm.omc_enable_cancel_poll();
}

/**
 * Let `buildModelFMU(..., platforms={"wasm", "linux64"})` serve native platforms
 * here: the component is compiled by a wasm32-wasip1 build of wasmtime in another
 * worker, and the loader libraries come from the bundle. The host must define the
 * globals first — see `wasm/fmu-aot.js`.
 */
export function omc_enable_fmu_aot() {
    wasm.omc_enable_fmu_aot();
}

/**
 * Enable live progress reporting out of a blocking omc call: the runtime writes
 * permille + phase into the shared control block via `globalThis.__omcReportProgress`
 * (which the worker defines). The UI thread reads the block on its own timer.
 */
export function omc_enable_progress_sink() {
    wasm.omc_enable_progress_sink();
}

/**
 * Let a model's externals reach a library this omc does not embed, through
 * `globalThis.__omcWasmBlob(file)`. The host defines it — see `wasm/wasm-blobs.js`.
 */
export function omc_enable_wasm_blobs() {
    wasm.omc_enable_wasm_blobs();
}

/**
 * Evaluate one interactive command and return its reply — the same string the
 * `--interactive=zmq` server returns for a request. Evaluation errors and
 * panics are returned as `"Error: …"` text rather than thrown, so a REPL can
 * keep running.
 * @param {string} command
 * @returns {string}
 */
export function omc_eval(command) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(command, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.omc_eval(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * The JSON reply of the FMI settings guide to a JSON request, see
 * `openmodelica_fmi_guide::call`. For the clients of omc; not a scripting function.
 * @param {string} request
 * @returns {string}
 */
export function omc_fmi_guide(request) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(request, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.omc_fmi_guide(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * The `method=` values a Co-Simulation wasm FMU can be exported with, a subset of
 * [`omc_sim_solver_options`]'s `s`.
 * @returns {any}
 */
export function omc_fmu_cs_solvers() {
    const ret = wasm.omc_fmu_cs_solvers();
    return ret;
}

/**
 * The native platforms an exported FMU can serve. Needs [`omc_enable_fmu_aot`].
 * @returns {any}
 */
export function omc_fmu_platforms() {
    const ret = wasm.omc_fmu_platforms();
    return ret;
}

/**
 * Initialise the compiler runtime. Returns `true` on success. Must be called
 * once before [`omc_eval`]. Mirrors `omc_compiler_init`, but additionally:
 *   * routes the compiler's stdout/stderr (and Rust panics) to the JS console,
 *   * defaults the code-generation target to `wasm-jit` — the only simCode
 *     target usable in-browser (the C/Cpp/FMU targets need an external
 *     toolchain and are unavailable here).
 * @returns {boolean}
 */
export function omc_init() {
    const ret = wasm.omc_init();
    return ret !== 0;
}

/**
 * Request cancellation of the running simulation (mirrors the native C ABI). The
 * simulator cancels via `omc_sim_free` instead; this is used by the SAB cancel path.
 */
export function omc_request_cancel() {
    wasm.omc_request_cancel();
}

/**
 * Seed an environment variable in the wasm in-process environment (there is no
 * OS environment on wasm). Call before [`omc_init`] to point the runtime at its
 * install dir, e.g. `omc_set_env("OPENMODELICAHOME", "/")`.
 * @param {string} name
 * @param {string} value
 */
export function omc_set_env(name, value) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    wasm.omc_set_env(ptr0, len0, ptr1, len1);
}

/**
 * Select the simulation driver: `1` in-wasm (the default here — the model is
 * reached wasm->wasm), `0` host (each model call crosses wasm->JS->wasm through
 * wasmer), `-1` the default. Applies from the next `omc_sim_start`/`omc_simulate`.
 * @param {number} mode
 */
export function omc_set_inwasm_driver(mode) {
    wasm.omc_set_inwasm_driver(mode);
}

/**
 * Enable the per-run bench lines; the `OMC_WASM_SIM_BENCH` that arms them
 * natively is unreachable without an environment.
 * @param {boolean} on
 */
export function omc_set_sim_bench(on) {
    wasm.omc_set_sim_bench(on);
}

/**
 * Integrate for about `budget_ms` of wall-clock, then return so the worker can
 * yield. Codes: `0` running (call again), `1` done, `2` terminated (`terminate()`),
 * `3` cancelled, `-1` error (read `getErrorString()`). On `1`/`2` the results are
 * ready via the `omc_sim_*` getters and the `.mat` is written; on `3`/`-1`/`1`/`2`
 * the session is freed.
 * @param {number} budget_ms
 * @returns {number}
 */
export function omc_sim_advance(budget_ms) {
    const ret = wasm.omc_sim_advance(budget_ms);
    return ret;
}

/**
 * The values of series `index` (as in [`omc_sim_series`]) as a `Float64Array`.
 * A time-invariant signal returns a length-1 array. `None` if out of range /
 * no run.
 * @param {number} index
 * @returns {Float64Array | undefined}
 */
export function omc_sim_column(index) {
    const ret = wasm.omc_sim_column(index);
    let v1;
    if (ret[0] !== 0) {
        v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    }
    return v1;
}

/**
 * Drop the active simulation session (freeing its external objects). Used by the
 * worker's Cancel path; safe with no active session.
 */
export function omc_sim_free() {
    wasm.omc_sim_free();
}

/**
 * `{ model, file, start, stop, rows }` for the last run, or `null` if none.
 * `file` is the result file the run actually wrote, whose suffix is the format
 * it was written in (`-outputFormat` can have moved it off the requested one).
 * @returns {any}
 */
export function omc_sim_info() {
    const ret = wasm.omc_sim_info();
    return ret;
}

/**
 * The last resumable run's model output (prints, `LOG_ASSERT` blocks, chattering,
 * `-lv=LOG_STATS`). Valid until the next `omc_sim_start`; set even on failure.
 * @returns {string}
 */
export function omc_sim_log() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.omc_sim_log();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * The last run's editable initial conditions: an array of `{ name, comment,
 * unit, displayUnit, relativeQuantity, value }`, plus `enumNames` for an
 * enumeration (its value is the 1-based index). Feed edits back via
 * `-override=name=value` on the next simulate, in the variable's own `unit`.
 * @returns {any}
 */
export function omc_sim_parameters() {
    const ret = wasm.omc_sim_parameters();
    return ret;
}

/**
 * The last run's result file as `format` (`arrow`, `mat` or `csv`), for a
 * download in a format other than the one the run wrote. The file's own format
 * is returned unconverted; converting to `mat`/`csv` drops the String variables
 * they cannot hold. `None` on failure — read `getErrorString()`.
 * @param {string} format
 * @returns {Uint8Array | undefined}
 */
export function omc_sim_result_as(format) {
    const ptr0 = passStringToWasm0(format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.omc_sim_result_as(ptr0, len0);
    let v2;
    if (ret[0] !== 0) {
        v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v2;
}

/**
 * Metadata for the last run's signals (excluding `time`): an array of
 * `{ name, comment, unit, displayUnit, relativeQuantity, constant, alias }`.
 * `unit` and `displayUnit` name entries of [`omc_sim_units`]. `constant` marks parameters/constants and
 * signals that never change; `alias` marks a signal that reads the *same stored
 * column* as an earlier one (the `.mat`'s `dataInfo` aliasing — distinct columns
 * are distinct signals). The plot shows only `!constant && !alias`. Empty if no run.
 * @returns {any}
 */
export function omc_sim_series() {
    const ret = wasm.omc_sim_series();
    return ret;
}

/**
 * `{ s, nls, nlsLS, ls, lss }`: the values each solver flag accepts in this
 * build. KLU only appears where SUNDIALS is linked.
 * @returns {any}
 */
export function omc_sim_solver_options() {
    const ret = wasm.omc_sim_solver_options();
    return ret;
}

/**
 * Start a resumable run of a model already built by `buildModel` (keyed by its
 * `prefix`; `result_file` is where the `.mat` goes). `false` on failure — read
 * `getErrorString()`.
 * @param {string} prefix
 * @param {string} result_file
 * @param {string} simflags
 * @returns {boolean}
 */
export function omc_sim_start(prefix, result_file, simflags) {
    let ptr0, len0, ptr1, len1, ptr2, len2;
    try {
        ptr0 = passStringToWasm0(prefix, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passStringToWasm0(result_file, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = passStringToWasm0(simflags, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len2 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.omc_sim_start(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret !== 0;
}

/**
 * The independent `time` column of the last run as a `Float64Array`, or `None`.
 * @returns {Float64Array | undefined}
 */
export function omc_sim_time() {
    const ret = wasm.omc_sim_time();
    let v1;
    if (ret[0] !== 0) {
        v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    }
    return v1;
}

/**
 * The display units of the last run's units: `{ "K": [{ name, factor, offset,
 * inverse }], ... }`, the same shape the FMI simulator gets from an FMU's
 * `<UnitDefinitions>`. A value in the unit shows as `factor * v + offset`
 * (`factor / v` when `inverse`); a `relativeQuantity` signal drops the offset.
 * @returns {any}
 */
export function omc_sim_units() {
    const ret = wasm.omc_sim_units();
    return ret;
}

/**
 * `simulate(...)` without the string command's O(program) env build; errors returned as `"Error: …"`.
 * @param {string} class_name
 * @param {number} stop_time
 * @param {number} number_of_intervals
 * @param {number} tolerance
 * @param {string} method
 * @param {string} simflags
 * @returns {string}
 */
export function omc_simulate(class_name, stop_time, number_of_intervals, tolerance, method, simflags) {
    let deferred7_0;
    let deferred7_1;
    try {
        const val4 = +stop_time;
        const val5 = +number_of_intervals;
        const val6 = +tolerance;
        let ptr0, len0, ptr1, len1, ptr2, len2;
        try {
            ptr0 = passStringToWasm0(class_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(method, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
            ptr2 = passStringToWasm0(simflags, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len2 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.omc_simulate(ptr0, len0, val4, val5, val6, ptr1, len1, ptr2, len2);
        deferred7_0 = ret[0];
        deferred7_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred7_0, deferred7_1, 1);
    }
}

/**
 * The last snapshot is stored in segment `seg`, file `i` at `offsets[i]`.
 * @param {number} seg
 * @param {Float64Array | number[]} offsets
 */
export function omc_store_commit(seg, offsets) {
    const val2 = +seg;
    const ptr0 = passArrayF64ToWasm0(offsets, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.omc_store_commit(val2, ptr0, len0);
}

/**
 * Stop recording changes below the root; the host could not save them.
 */
export function omc_store_disable() {
    wasm.omc_store_disable();
}

/**
 * Persist `<home>/.openmodelica` in the host's segment files (`wasm/omc-store.js`),
 * read through `globalThis.__omcStoreRead`, but not the package manager's
 * downloads in its `cache/`. Returns that root.
 * @returns {string}
 */
export function omc_store_enable() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.omc_store_enable();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Mount stored files: NUL-separated `paths`, and `[segment, mtime seconds, mtime
 * nanoseconds, offset, length]` for each in `nums`.
 * @param {string} paths
 * @param {Float64Array | number[]} nums
 * @returns {number}
 */
export function omc_store_mount(paths, nums) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(paths, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passArrayF64ToWasm0(nums, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 8, 8); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.omc_store_mount(ptr0, len0, ptr1, len1);
    return ret >>> 0;
}

/**
 * What changed below the root since the last commit, or `undefined`:
 * `{ paths, nums, data, removed }`, with NUL-separated `paths` and `removed`,
 * `[mtime seconds, mtime nanoseconds, length]` for each file in `nums`, and the
 * files' bytes one after the other in `data`.
 * @returns {any}
 */
export function omc_store_snapshot() {
    const ret = wasm.omc_store_snapshot();
    return ret;
}

/**
 * Drain the top-level classes that omc loaded on its own (a `uses` annotation, a
 * name lookup) since the last call: the native host's loadModel callback.
 * @returns {string[]}
 */
export function omc_take_loaded_models() {
    const ret = wasm.omc_take_loaded_models();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Drain the files the last command tried to download but did not find in the
 * VFS, as an array of `{ urls: string[], filename: string }`. `omc_eval` is
 * synchronous, so it cannot fetch over the network itself; instead the JS host
 * fetches each pending file (the browser streams it for download progress),
 * stages the bytes with [`wasi_write_file`], and re-runs the command, which then
 * finds them in the VFS. See `openmodelica_download`.
 * @returns {any}
 */
export function omc_take_pending_downloads() {
    const ret = wasm.omc_take_pending_downloads();
    return ret;
}

/**
 * Drain the plot commands the last `omc_eval` recorded, as an array of string
 * arrays (each the 18 `PlotCallback` args in ABI order, result file at index 0).
 * A host with its own renderer drains this, then reads each
 * result file from the VFS with [`wasi_path_open`]+[`wasi_fd_read`] and draws it.
 * @returns {any}
 */
export function omc_take_plot_commands() {
    const ret = wasm.omc_take_plot_commands();
    return ret;
}

/**
 * Unzip `data` into the VFS, mounting each entry under `mount` (e.g.
 * `mount="/lib"`, entry `Modelica 4.1.0/package.mo` → `/lib/Modelica 4.1.0/
 * package.mo`). One fetch + this call stages a whole Modelica library; point
 * MODELICAPATH at `mount` and `loadModel`. Returns the number of files written
 * or an error string.
 * @param {string} mount
 * @param {Uint8Array | number[]} data
 * @returns {number}
 */
export function omc_vfs_load_zip(mount, data) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(mount, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.omc_vfs_load_zip(ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
}

/**
 * preview1 `fd_close`.
 * @param {number} fd
 */
export function wasi_fd_close(fd) {
    wasm.wasi_fd_close(fd);
}

/**
 * preview1 `fd_read` (whole file) of an fd from [`wasi_path_open`], or `None`.
 * @param {number} fd
 * @returns {Uint8Array | undefined}
 */
export function wasi_fd_read(fd) {
    const ret = wasm.wasi_fd_read(fd);
    let v1;
    if (ret[0] !== 0) {
        v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
}

/**
 * preview1 `path_filestat_get`'s `size` for absolute key `path`, or `-1` if
 * absent (a JS number; sizes here are small config/result files).
 * @param {string} path
 * @returns {number}
 */
export function wasi_path_filestat_get(path) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.wasi_path_filestat_get(ptr0, len0);
    return ret;
}

/**
 * preview1 `path_open` (read-only) of absolute key `path`. Returns the new fd,
 * or `-1` if the file is absent.
 * @param {string} path
 * @returns {number}
 */
export function wasi_path_open(path) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.wasi_path_open(ptr0, len0);
    return ret;
}

/**
 * List directory `path` (absolute; `"/"` is the root) as an array of
 * `{ name: string, isDir: bool }`. The worker-side of preview1 `fd_readdir` for
 * a JS caller (which cannot pass guest dirent buffers): drives the engine's
 * `QDir` enumeration of worker-owned paths.
 * @param {string} path
 * @returns {any}
 */
export function wasi_readdir(path) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.wasi_readdir(ptr0, len0);
    return ret;
}

/**
 * Remove `path`, whether it is a file or a directory (the store's directories
 * are implicit, so a directory means every key beneath it). Returns true if
 * anything was removed. Embedded builtins are immutable and unaffected.
 * @param {string} path
 * @returns {boolean}
 */
export function wasi_remove(path) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.wasi_remove(ptr0, len0);
    return ret !== 0;
}

/**
 * Move `from` to `to`, either a single file or a whole subtree.
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function wasi_rename(from, to) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.wasi_rename(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * Create/overwrite absolute key `path` with `bytes` (preview1
 * `path_open`(O_CREAT|O_TRUNC) → `fd_write` → `fd_close` collapsed). Lets the JS
 * host stage downloaded library/result files into the store.
 * @param {string} path
 * @param {Uint8Array | number[]} bytes
 */
export function wasi_write_file(path, bytes) {
    let ptr0, len0, ptr1, len1;
    try {
        ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    wasm.wasi_write_file(ptr0, len0, ptr1, len1);
}

/**
 * Write many files in one call, from an array of `{ path: string, bytes:
 * Uint8Array }`. Restoring a cached package tree is one postMessage rather than
 * one per file. Returns how many were written; a malformed entry is skipped.
 * @param {any} entries
 * @returns {number}
 */
export function wasi_write_files(entries) {
    const ret = wasm.wasi_write_files(entries);
    return ret >>> 0;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_BigInt_8646f9871262cc3b: function(arg0) {
            const ret = BigInt(arg0);
            return ret;
        },
        __wbg_Error_208446807d0d1e30: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___jslabModelicaPollCancel_ccd54f6be29230e1: function() {
            const ret = globalThis.__jslabModelicaPollCancel();
            return ret;
        },
        __wbg___jslabModelicaReportProgress_8d6099d4b5c296db: function(arg0, arg1) {
            globalThis.__jslabModelicaReportProgress(arg0, arg1);
        },
        __wbg___jslabModelicaWasmBlob_6aec5fc637c5fa4c: function(arg0, arg1, arg2) {
            const ret = globalThis.__jslabModelicaWasmBlob(getStringFromWasm0(arg1, arg2));
            var ptr1 = isLikeNone(ret) ? 0 : passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___omcAotCompile_738113da23961e0d: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = globalThis.__omcAotCompile(getArrayU8FromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
            const ptr1 = passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg___omcAotPreload_24e00440a5e2110d: function() {
            globalThis.__omcAotPreload();
        },
        __wbg___omcFmuLoader_f529b938ab29af98: function(arg0, arg1, arg2) {
            const ret = globalThis.__omcFmuLoader(getStringFromWasm0(arg1, arg2));
            var ptr1 = isLikeNone(ret) ? 0 : passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___omcFmuPlatforms_9338911fa3a85290: function(arg0) {
            const ret = globalThis.__omcFmuPlatforms();
            const ptr1 = passArrayJsValueToWasm0(ret, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___omcStoreRead_6e59812d9b1cee92: function(arg0, arg1, arg2, arg3) {
            const ret = globalThis.__omcStoreRead(arg0 >>> 0, arg1, getArrayU8FromWasm0(arg2, arg3));
            return ret;
        },
        __wbg___wbindgen_bigint_get_as_i64_11da4b52cd0aedef: function(arg0, arg1) {
            const v = arg1;
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_debug_string_f249a2a76caa9a55: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_function_table_dd9abe976e6c95f6: function() {
            const ret = wasm.__wbindgen_export;
            return ret;
        },
        __wbg___wbindgen_is_bigint_5fa10641e039d3ef: function(arg0) {
            const ret = typeof(arg0) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_741ff2bb612836f5: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_c22311b1cc228e3a: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_object_8b968c3ab8e96595: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_undefined_be5b34249ff1fc15: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_38d7bfbe4cc84039: function(arg0, arg1) {
            const ret = arg0 === arg1;
            return ret;
        },
        __wbg___wbindgen_lt_0e30ec898d8dffe8: function(arg0, arg1) {
            const ret = arg0 < arg1;
            return ret;
        },
        __wbg___wbindgen_neg_672409ed5c0e2e56: function(arg0) {
            const ret = -arg0;
            return ret;
        },
        __wbg___wbindgen_number_get_934b640d0889af78: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_rethrow_d953c34c2e20677f: function(arg0) {
            throw arg0;
        },
        __wbg___wbindgen_shr_692b534b32c7458f: function(arg0, arg1) {
            const ret = arg0 >> arg1;
            return ret;
        },
        __wbg___wbindgen_string_get_7ce8eee7fd327545: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_appendChild_dbf7ad2f48413560: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.appendChild(arg1);
            return ret;
        }, arguments); },
        __wbg_apply_bfe2b07b146427e2: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.apply(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_apply_e2c1e00e05fc7519: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.apply(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_bind_6c8081aa5318c83a: function(arg0, arg1, arg2) {
            const ret = arg0.bind(arg1, arg2);
            return ret;
        },
        __wbg_bind_8714e4aa2059a8db: function(arg0, arg1, arg2, arg3) {
            const ret = arg0.bind(arg1, arg2, arg3);
            return ret;
        },
        __wbg_buffer_0eaa216bac6b8749: function(arg0) {
            const ret = arg0.buffer;
            return ret;
        },
        __wbg_byteLength_fa48f24814f5ef46: function(arg0) {
            const ret = arg0.byteLength;
            return ret;
        },
        __wbg_call_40b008ba32f73991: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_call_a410eb4b59ed5965: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_constructor_76ad3e2c50d259de: function(arg0) {
            const ret = arg0.constructor;
            return ret;
        },
        __wbg_createElement_de4a31ed2fb252be: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.createElement(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_document_3b5c3071b43e97ee: function(arg0) {
            const ret = arg0.document;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_error_3fca27bc7013cea8: function(arg0, arg1) {
            console.error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_exports_1dac89a0acaa7cc6: function(arg0) {
            const ret = arg0.exports;
            return ret;
        },
        __wbg_exports_d019064f0e828d21: function(arg0) {
            const ret = WebAssembly.Module.exports(arg0);
            return ret;
        },
        __wbg_for_e12451d86fef973f: function(arg0, arg1) {
            const ret = Symbol.for(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_getPrototypeOf_8fbf04523e13de29: function() { return handleError(function (arg0) {
            const ret = Reflect.getPrototypeOf(arg0);
            return ret;
        }, arguments); },
        __wbg_getRandomValues_5d8c030b527203a6: function() { return handleError(function (arg0, arg1) {
            globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_getRandomValues_8b6f1f663e6f188d: function() { return handleError(function (arg0, arg1) {
            globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_get_2080c49015e35254: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_8359b717672252c2: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.get(arg1 >>> 0);
            return ret;
        }, arguments); },
        __wbg_get_9133cd9240bef156: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.get(arg1 >>> 0);
            return ret;
        }, arguments); },
        __wbg_get_d7176cfb76d71114: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_index_ff57aa2f75d9456b: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_unchecked_e6325ad374eff861: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_grow_bb922e0bbaf49153: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.grow(arg1 >>> 0, arg2);
            return ret;
        }, arguments); },
        __wbg_grow_f14cd4a8dc0e2c1f: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.grow(arg1 >>> 0);
            return ret;
        }, arguments); },
        __wbg_imports_16e8be59b0892936: function(arg0) {
            const ret = WebAssembly.Module.imports(arg0);
            return ret;
        },
        __wbg_instanceof_Error_74e3cca0c4a69161: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Error;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Function_41aa4977da3f9c31: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Function;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Global_b478b2326aa13368: function(arg0) {
            let result;
            try {
                result = arg0 instanceof WebAssembly.Global;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Memory_5e105758fd5c05e5: function(arg0) {
            let result;
            try {
                result = arg0 instanceof WebAssembly.Memory;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Object_97e16a01fd368661: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Object;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_RangeError_b87eeda22812b48b: function(arg0) {
            let result;
            try {
                result = arg0 instanceof RangeError;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Table_ee225635f35a8836: function(arg0) {
            let result;
            try {
                result = arg0 instanceof WebAssembly.Table;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Tag_274fb6e21a5f752a: function(arg0) {
            let result;
            try {
                result = arg0 instanceof WebAssembly.Tag;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_d7aeb0dcb3108fea: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_5cf453f5639aa1a2: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_bcf1376d0d732d08: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_length_186163212ffe79c3: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_82a0ab9f89916136: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_b03a0fabb109b1e9: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_log_35dcf3af10a75043: function(arg0, arg1) {
            console.log(getStringFromWasm0(arg0, arg1));
        },
        __wbg_message_43d8c8f1d543a349: function(arg0) {
            const ret = arg0.message;
            return ret;
        },
        __wbg_new_13de428334042d26: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_new_178411720b5000c0: function() { return handleError(function (arg0) {
            const ret = new WebAssembly.Tag(arg0);
            return ret;
        }, arguments); },
        __wbg_new_1de793c59e102921: function() { return handleError(function (arg0, arg1) {
            const ret = new WebAssembly.Instance(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_new_273fe0d336e61b94: function() { return handleError(function (arg0) {
            const ret = new WebAssembly.Module(arg0);
            return ret;
        }, arguments); },
        __wbg_new_37eb45aaf5eeb820: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_3e991e7817fac72d: function() { return handleError(function (arg0) {
            const ret = new WebAssembly.Memory(arg0);
            return ret;
        }, arguments); },
        __wbg_new_416849d397a33ea5: function() { return handleError(function (arg0, arg1) {
            const ret = new WebAssembly.Global(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_new_cd4348290afae586: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_from_slice_aaf85a9746711968: function(arg0, arg1) {
            const ret = new Float64Array(getArrayF64FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_from_slice_b8daf545a41c6aa0: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_with_args_70b64b3ca8a6f317: function(arg0, arg1, arg2, arg3) {
            const ret = new Function(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
            return ret;
        },
        __wbg_new_with_length_a3dc62dea6e2e158: function(arg0) {
            const ret = new Array(arg0 >>> 0);
            return ret;
        },
        __wbg_new_with_value_e1d32971436be1f3: function() { return handleError(function (arg0, arg1) {
            const ret = new WebAssembly.Table(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_now_0bfd8fedfd3c2c07: function() {
            const ret = performance.now();
            return ret;
        },
        __wbg_now_463ac581d2fc7ea3: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_now_e7c6795a7f81e10f: function(arg0) {
            const ret = arg0.now();
            return ret;
        },
        __wbg_of_e7ea0fcd535c1444: function(arg0, arg1) {
            const ret = Array.of(arg0, arg1);
            return ret;
        },
        __wbg_performance_7e4e4494fdc9d07a: function(arg0) {
            const ret = arg0.performance;
            return ret;
        },
        __wbg_prototypesetcall_13162965d1fe7aa3: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_push_c9f4893fc209f768: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_querySelector_72201b7c62dc196b: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.querySelector(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_scrollHeight_879470691b1201b7: function(arg0) {
            const ret = arg0.scrollHeight;
            return ret;
        },
        __wbg_set_2793479888329cb6: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_602f4f454acd36af: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.set(arg1 >>> 0, arg2);
        }, arguments); },
        __wbg_set_d2d33b52458e984a: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_feb3714f475485ba: function(arg0, arg1, arg2) {
            arg0.set(getArrayU8FromWasm0(arg1, arg2));
        },
        __wbg_set_innerHTML_a9d3a267967b5117: function(arg0, arg1, arg2) {
            arg0.innerHTML = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_scrollTop_a01ea28563affafe: function(arg0, arg1) {
            arg0.scrollTop = arg1;
        },
        __wbg_set_value_72d309bd8ee94591: function(arg0, arg1) {
            arg0.value = arg1;
        },
        __wbg_static_accessor_GLOBAL_THIS_003ee833af9699fc: function() {
            const ret = typeof globalThis === 'undefined' ? undefined : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_e4293fb22cbe77da: function() {
            const ret = typeof global === 'undefined' ? undefined : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_53bb20457401453d: function() {
            const ret = typeof self === 'undefined' ? undefined : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_b5e0810bfecb7feb: function() {
            const ret = typeof window === 'undefined' ? undefined : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_subarray_58f388a9247ac0bb: function(arg0, arg1, arg2) {
            const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_toString_41c6536883740314: function(arg0, arg1, arg2) {
            const ret = arg1.toString(arg2);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg_toString_4d043badaf1f4f69: function(arg0) {
            const ret = arg0.toString();
            return ret;
        },
        __wbg_toString_55ffdf586349746b: function(arg0) {
            const ret = arg0.toString();
            return ret;
        },
        __wbg_trap_new: function(arg0) {
            const ret = Trap.__wrap(arg0);
            return ret;
        },
        __wbg_value_1bf44dd89e1e25e6: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Ref(NamedExternref("Array<any>"))], shim_idx: 10695, ret: Result(Externref), inner_ret: Some(Result(Externref)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_js_sys_302775ceac73ddde___Array__wasm_bindgen_74b2ed96b3d87d2d___JsValue___true_);
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Ref(NamedExternref("Array<any>"))], shim_idx: 10695, ret: Result(NamedExternref("Array<any>")), inner_ret: Some(Result(NamedExternref("Array<any>"))) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_js_sys_302775ceac73ddde___Array__wasm_bindgen_74b2ed96b3d87d2d___JsValue___true__63);
            return ret;
        },
        __wbindgen_generic_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Ref(NamedExternref("Array<any>"))], shim_idx: 10698, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_____wasm_bindgen_74b2ed96b3d87d2d___JsValue___true_);
            return ret;
        },
        __wbindgen_generic_0000000000000004: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000005: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000006: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000007: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000008: function(arg0, arg1) {
            // Cast intrinsic for `U128 -> Externref`.
            const ret = (BigInt.asUintN(64, arg0) | (BigInt.asUintN(64, arg1) << BigInt(64)));
            return ret;
        },
        __wbindgen_generic_0000000000000009: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_generic_000000000000000a: function(arg0, arg1) {
            var v0 = getArrayJsValueFromWasm0(arg0, arg1);
            wasm.__wbindgen_free(arg0, arg1 * 4, 4);
            // Cast intrinsic for `Vector(NamedExternref("string")) -> Externref`.
            const ret = v0;
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
    };
    return {
        __proto__: null,
        "./OpenModelicaCompiler_bg.js": import0,
    };
}

function wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_____wasm_bindgen_74b2ed96b3d87d2d___JsValue___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_____wasm_bindgen_74b2ed96b3d87d2d___JsValue___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_js_sys_302775ceac73ddde___Array__wasm_bindgen_74b2ed96b3d87d2d___JsValue___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_js_sys_302775ceac73ddde___Array__wasm_bindgen_74b2ed96b3d87d2d___JsValue___true_(arg0, arg1, arg2);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

function wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_js_sys_302775ceac73ddde___Array__wasm_bindgen_74b2ed96b3d87d2d___JsValue___true__63(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_74b2ed96b3d87d2d___convert__closures________invoke___js_sys_302775ceac73ddde___Array__core_6ebf190952f1f82c___result__Result_js_sys_302775ceac73ddde___Array__wasm_bindgen_74b2ed96b3d87d2d___JsValue___true__63(arg0, arg1, arg2);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

const TrapFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_trap_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function debugString(val) {
    switch (typeof val) {
        // primitive types
        case 'number':
        case 'boolean':
        case 'undefined':
        return `${val}`;
        case 'string':
        return JSON.stringify(val);
        case 'bigint':
        return `${val}n`;
        case 'symbol':
        return val.description !== undefined
            ? `Symbol(${val.description})`
            : 'Symbol';
        case 'function':
        return typeof val.name === 'string' && val.name !== ''
            ? `Function(${val.name})`
            : 'Function';
        case 'object': {
            if (val === null) {
                return 'null';
            }
            // objects
            if (Array.isArray(val)) {
                return '[' + Array.from(val, debugString).join(', ') + ']';
            }
            // errors
            if (val instanceof Error) {
                return `${val.name}: ${val.message}\n${val.stack}`;
            }

            const toStringOutput = toString.call(val);
            // Test for built-in
            const className = /\[object ([^\]]+)\]/.exec(toStringOutput)?.[1];

            // Failed to match the standard '[object ClassName]'
            if (className === undefined) {
                return toStringOutput;
            }
            if (className === 'Object') {
                // we're a user defined class or Object
                // JSON.stringify avoids problems with cycles, and is generally much
                // easier than looping through ownProperties of `val`.
                try {
                    return 'Object(' + JSON.stringify(val) + ')';
                } catch (_) {
                    return 'Object';
                }
            }
            // TODO we could test for more things here, like `Set`s and `Map`s.
            return className;
        }
        // Per MDN: 'This list of values is exhaustive.'
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#description
    }
}

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {

    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('OpenModelicaCompiler_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
