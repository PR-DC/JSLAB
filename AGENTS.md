# JSLAB agent guidance

JSLAB is a scientific JavaScript desktop environment built with Electron. User scripts use the `.jsl` extension and run in a persistent workspace. Use the JSLAB MCP tools to execute JSLAB code; a plain Node.js process does not provide the JSLAB runtime or its scientific functions.

## Use a shared JSLAB session

- Read [the MCP server section](docs/documentation.md#mcp-server) for setup, tool arguments and execution limits. The same guidance is available through `jslab://mcp-guide`.
- Start with `list_sessions` and `get_session_status`. Verify that the intended desktop session is ready. Configure an explicit session when several are shared.
- Consult `get_help` for unfamiliar functions instead of guessing APIs. Use a function name, `lib.function`, or `type: "category"` with a category name.
- Use `evaluate_code` for small calculations and `run_file` for saved `.jsl` scripts. Pass absolute file paths and an explicit `cwd` when relative data paths matter.
- The workspace and working directory persist between calls and are shared with the user. Inspect existing variables before replacing them. Avoid clearing the workspace or closing figures unless the task requires it.
- Inspect `result.success`, captured output and error details. `check_code` diagnostics must also be checked for error severity. Execution success alone does not validate a numerical result.
- When a tool returns `status: "running"`, poll `get_execution` using the returned execution ID. Do not submit the same calculation again just because the tool stopped waiting or the connection failed.
- Use `interrupt_execution` to request a stop, then confirm completion. Interruption terminates JavaScript through the main-process debugger and runs registered resource cleanup without clearing the workspace. Native blocking operations may still require a sandbox reset, which discards the workspace.
- Loop checkpoints are not required. Use `pause_execution`, `get_debug_state`, `inspect_debug_object` and `evaluate_debug_expression` to inspect paused frames, then `resume_execution` to continue or step. Frame handles expire on resume.
- Use `list_workspace` and `read_variable` for focused inspection. Previews are bounded and are not lossless data exports.
- Use `list_figures` and `export_figure` to inspect plots. Export to a task-specific absolute path. Raster exports up to 4 MiB can return an image directly to the agent.
- For repeatable checks, create a `.jsl` test script whose assertions throw on failure, then call `run_test_file`. Background callbacks must be awaited if their results determine success.
- Code runs with the user's JSLAB permissions. Keep file writes, external processes and device operations within the user's requested task. Do not print, commit or share session descriptor credentials.

## Work on the repository

- Translate user-visible UI text through `config/lang.json` for `en`, `rs` and `rsc`. Run `npm run check-ui-translations`. Mark intentionally fixed HTML text locally with `lang-fixed`, or an adjacent JavaScript literal with `/* lang-fixed */`; do not use these annotations to exempt text that should be translated.

- Follow nearby source conventions: `PRDC_JSLAB_*` class names, two-space indentation, `if(...)` formatting, descriptive JSDoc comments, and the existing file header format.
- Main-process code is in `js/backend`, desktop GUI code in `js/main`, sandbox modules in `js/sandbox`, and the stdio adapter in `js/mcp`.
- In `js/sandbox`, use `jslab-*` names for runtime machinery and private helpers, including automation, workspace serialization, internal reference definitions and platform adapters. Keep `init-*` for entry points. Public API modules retain feature names and are registered in `config.SUBMODULES`; related feature implementations retain their parent prefix, such as `networking-tcp` and `geography-map`. Documentation-only declarations use `*-doc` and belong in `DOC_SUBMODULES_ADDITIONAL`.
- A filename or a CommonJS export does not expose workspace commands. Register public API modules explicitly; load private helpers through their owning module before runtime `require` overrides. Prefix implementation fields and methods with `_` so they are not exported as workspace variables or commands. Use platform suffixes such as `-web` for alternate implementations and update the static web constructor map when changing public module implementations.
- Keep internal sandbox module access under `jsl.inter`. Reuse the existing evaluator and environment methods for agent execution.
- Numerical and AlphaShape operations use shared WASM modules in desktop, browser and workers. Initialize `jslab-wasm-loader` before constructing the runtime. Implement algorithms in the C++ cores and bindings in `cpp/*-wasm.cpp`; keep host I/O and subprocess operations in the environment. Rebuild with `npm run build-native-wasm` before testing C++ changes. Do not introduce separate JavaScript numerical fallbacks or application Node-API bindings.
- Keep stdout free of application messages in the stdio adapter. Send diagnostics to stderr.
- The terminal frontend is in js/cli and owns a hidden Electron runtime through the existing local automation bridge. Keep CLI sessions isolated from desktop instance routing. Run node js/dev/run-cli-tests.js for real batch and Windows terminal integration checks.
- Windows packaging uses js/dev/prepare-cli.js before signing to prepare the console host and its runtime manifest. Keep the console frontend separate from the GUI runtime, and verify the packaged application with node js/dev/run-cli-tests.js --packaged=dist/win-unpacked.
- Keep Windows installer configuration in config/installer.nsh. Generate the Windows launcher with js/dev/prepare-cli.js; do not add a tracked batch launcher or PowerShell PATH helper. Keep CLI and GUI tests with their modules, and do not add a dev test suite or place build-only documentation tests in shared.
- Keep browser JavaScript in js/web, the browser HTML shell in html/web.html and its styles in css/web.css. Reuse the existing HTML and CSS folders instead of adding a top-level web asset folder.
- Tests use `PRDC_JSLAB_TESTS` and export `MODULE_TESTS`. Run a relevant suite with `node js/dev/run-test-suite.js --folder=backend` or `--folder=sandbox`; `--test-module=automation` selects matching test modules.
- Put each module's `.test.js` files directly in its `tests` folder; create that folder when needed. Avoid extra GUI/platform subfolders under `tests`. Keep GUI test support and launchers directly in `js/dev`; retain the application's existing `js/shared/tester.js`. Do not add a standalone GUI testing documentation file.
- Documentation is generated by `js/dev/make-doc.js` from the templates in `dev`. Edit the MCP section in `dev/documentation_template.md`; the generator shares it with HTML, TeX and PDF. Run `npm run make-doc` to update the generated documentation, including `docs/documentation.md`.
- Preserve unrelated user changes and keep generated artifacts out of a change unless the change requires them.
