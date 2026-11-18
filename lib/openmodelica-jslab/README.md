# OpenModelicaJSLAB compiler library

This bundle supplies the compiler and native scene geometry used by JSLAB
Simulate. JSLAB owns the model editor, project files, workspace integration,
figures and playback controls.

## Layout

- `config/lang.json`: readable English, Serbian and Cyrillic translations. Identifiers
  are ordered and contiguous: `omjsl-1`, `omjsl-2`, and so on.
- `js/`: compiler client, worker, metadata loading and compiler-specific helpers.
- `metadata/`: class catalogs, schemas, translation references and provenance.
- `css/`: block icon styles.
- `animation/`: generated `scene-core.js` and `scene-core_bg.wasm` geometry bindings.
- `omc/`: generated compiler bindings and compiler WASM.
- `wasm-blobs/`: simulation side modules required by the compiler.
- `packages/`: the pinned standard-library archive.
- `vendor/`: unchanged upstream parser and persistent compiler-file storage.
- `licenses/`: compiler and runtime license texts.
- `dev/`: browser distribution packaging.
- `manifest.json`: compiler provenance and SHA-256 hashes of installed files.

Catalogs remain readable JSON in the installed library. Only the browser
distribution compresses catalogs. Every library translation reference uses its
`omjsl-*` identifier; application translation IDs remain in JSLAB's own catalog.
Add new translations at the end and preserve existing identifiers during library
updates. Keep `en`, `rs` and `rsc` together for each entry.

## Compiler integration

Handwritten library classes use the `PRDC_OMJSL_*` namespace, such as
`PRDC_OMJSL_ANNOTATIONS` and `PRDC_OMJSL_CLIENT`.

`js/index.js` exposes the common compiler operations. Native hosts use
`js/host-electron.js`; the browser build selects `js/host-web.js` and
`js/assets-web.js`. Metadata access does not start a compiler worker. The solver
and standard-library archive load when the requested operation needs them.
Cancellation, progress and binary transport belong to the compiler worker.
Unknown model names do not automatically install online libraries.

The library retains compiler-specific source parsing, nested modifiers, record
values, property choices, units and diagnostics. Imported class names and
descriptions remain unchanged. Project imports retain the selected source entry
and its complete resource tree.

## Native geometry

Rigid scenes expose `partFrame(index)` for initial meshes and exports, and
`transforms(index)` for GPU playback relative to those initial meshes. The
`rigid` flag is true only when geometry and materials remain constant throughout
the result. Hosts can retain vertex buffers and normals while updating only
these matrices; changing geometry or materials continue to use `frame(index)`.

`js/scene.js` loads only the small geometry core in `animation/`. It reads the
compiler's scene description and referenced simulation columns, then supplies
meshes, materials and bounds to JSLAB's existing 3D figure. There is no separate
library player or renderer.

Referenced DXF, STL, OBJ and 3DS meshes travel with the simulation result, so
figures remain usable after the compiler worker closes. Missing resources and
unsupported geometry report errors. File textures and embedded CAD animations
are not interpreted; motion comes from the simulation result.

## Build from the compiler fork

From the fork repository root:

```sh
cmake -S . -B build-jslab -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ \
  -DOM_OMC_WASM=ON -DOM_ENABLE_GUI_CLIENTS=OFF \
  -DRUST_OMC_WASM_MODE=jslab-release -DRUST_OMC_CI=ON
cmake --build build-jslab --target install
```

Set `CMAKE_BUILD_PARALLEL_LEVEL`, `CARGO_BUILD_JOBS`, `RAYON_NUM_THREADS` and
`BINARYEN_CORES` to limit build concurrency. The installed bundle is under
`share/omc/jslab`.

After a completed compiler build, update library code and catalogs without
rebuilding the compiler:

```sh
cmake --build build-jslab --target rust_jslab_library
cmake --install build-jslab
```

The independent `rust_jslab_scene` target builds the native geometry core.

From `OMCompiler/Compiler/OpenModelica.rs/wasm/jslab`, run:

```sh
node dev/pack-library.js <installed-bundle>
npm test
```

Library maintenance tools stage metadata, translation and icon changes for
review before applying them. `tools/update-library.js --library=<source-root>
--incoming=<staged-export> --check` validates a candidate; `--draft` prepares
missing translations and `--apply` installs a completed review with backups.

JSLAB selects the installed library through `SIMULATE_BUNDLE` in
`config/config.js`. Both host adapters and distribution builders use that setting.
