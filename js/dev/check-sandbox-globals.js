/**
 * @file Sandbox bare-global checker
 * @author PR-DC
 *
 * Scans js/sandbox files and reports identifiers that are used as globals
 * (not locally bound in lexical scope), which can indicate internal code paths
 * that should use this.jsl.* references instead.
 *
 * Usage:
 * node js/dev/check-sandbox-globals.js
 * node js/dev/check-sandbox-globals.js --json
 * node js/dev/check-sandbox-globals.js --hide-builtins
 * node js/dev/check-sandbox-globals.js --fail-on-any
 * node js/dev/check-sandbox-globals.js --ignore-names tic,toc
 * node js/dev/check-sandbox-globals.js --root js/sandbox
 */

const { PRDC_JSLAB_SOURCE_ANALYSIS } = require('./source-analysis');
"use strict";

/**
 * Class for dev check sandbox globals operations.
 */
class PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER {

  /**
   * Parses args.
   * @param {*} argv Argv.
   */
  static parseArgs(argv) {
    const opts = {
      root: DEFAULT_ROOT,
      json: false,
      showBuiltins: true,
      failOnAny: false,
      includeTests: false,
      ignoreNames: new Set(),
      reportFile: DEFAULT_REPORT_FILE,
    };

    for(let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      switch(arg) {
        case "--root":
          opts.root = argv[++i] || opts.root;
          break;
        case "--json":
          opts.json = true;
          break;
        case "--show-builtins":
          opts.showBuiltins = true;
          break;
        case "--hide-builtins":
          opts.showBuiltins = false;
          break;
        case "--fail-on-any":
          opts.failOnAny = true;
          break;
        case "--include-tests":
          opts.includeTests = true;
          break;
        case "--ignore-names":
          opts.ignoreNames = PRDC_JSLAB_SOURCE_ANALYSIS.splitCsvToSet(argv[++i]);
          break;
        case "--report-file":
          opts.reportFile = argv[++i] || opts.reportFile;
          break;
        case "--no-report-file":
          opts.reportFile = "";
          break;
        case "--help":
        case "-h":
          PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.printHelp();
          process.exit(0);
          break;
        default:
          break;
      }
    }
    return opts;
  }


  /**
   * Prints help.
   */
  static printHelp() {
    console.log("Sandbox bare-global checker");
    console.log("");
    console.log("Options:");
    console.log("  --root <dir>          Root folder to scan (default: js/sandbox)");
    console.log("  --json                Print machine-readable JSON report");
    console.log("  --hide-builtins       Exclude builtin globals from detailed output");
    console.log("  --fail-on-any         Exit non-zero if any bare global is found");
    console.log("  --include-tests       Include *.test.js files");
    console.log("  --ignore-names <csv>  Ignore specific names");
    console.log("  --report-file <path>  Write JSON report to file (default: temp/check-sandbox-globals-report.json)");
    console.log("  --no-report-file      Disable writing report file");
  }


  /**
   * Classifies usage.
   * @param {*} pathRef Path ref.
   */
  static classifyUsage(pathRef) {
    const parent = pathRef.parentPath;
    const key = pathRef.key;

    if(parent.isCallExpression() && key === "callee") {
      return "call";
    }
    if(parent.isNewExpression() && key === "callee") {
      return "new";
    }
    if(parent.isAssignmentExpression() && key === "left") {
      return "write";
    }
    if(parent.isUpdateExpression() && key === "argument") {
      return "write";
    }
    if(parent.isMemberExpression() && key === "object") {
      if(parent.parentPath.isCallExpression() && parent.parentPath.key === "callee") {
        return "method_call_root";
      }
      return "member_root";
    }
    return "read";
  }

  /**
   * Parses file code.
   * @param {*} filePath File path.
   * @param {string} code Code.
   */
  static parseFileCode(filePath, code) {
    return parser.parse(code, {
      sourceType: "unambiguous",
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: [
        "topLevelAwait",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "dynamicImport",
        "optionalChaining",
        "nullishCoalescingOperator",
        "objectRestSpread",
        "asyncGenerators",
        "numericSeparator",
        "bigInt",
        "importMeta",
      ],
    });
  }

  /**
   * Handles analyze file.
   * @param {*} filePath File path.
   * @param {*} opts Opts.
   */
  static analyzeFile(filePath, opts) {
    const code = fs.readFileSync(filePath, "utf8");
    const lines = code.split(/\r?\n/);
    const findings = [];
    const parseErrors = [];
    let ast;

    try {
      ast = PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.parseFileCode(filePath, code);
      if(Array.isArray(ast.errors) && ast.errors.length) {
        for(const err of ast.errors) {
          parseErrors.push({
            file: PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.normalizePath(filePath),
            message: err.message,
            line: err.loc ? err.loc.line : null,
            column: err.loc ? err.loc.column + 1 : null,
          });
        }
      }
    } catch(err) {
      parseErrors.push({
        file: PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.normalizePath(filePath),
        message: err.message,
        line: err.loc ? err.loc.line : null,
        column: err.loc ? err.loc.column + 1 : null,
      });
      return { findings, parseErrors };
    }

    traverse(ast, {
      Identifier(pathRef) {
        if(!pathRef.isReferencedIdentifier()) {
          return;
        }

        const name = pathRef.node.name;
        if(opts.ignoreNames.has(name)) {
          return;
        }

        // true => ignore implicit globals; only lexical bindings count as local.
        const hasLocalBinding = pathRef.scope.hasBinding(name, true);
        if(hasLocalBinding) {
          return;
        }

        const builtin = BUILTIN_GLOBALS.has(name);
        if(builtin && !opts.showBuiltins) {
          return;
        }

        const loc = pathRef.node.loc ? pathRef.node.loc.start : { line: null, column: null };
        findings.push({
          file: PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.normalizePath(filePath),
          line: loc.line,
          column: loc.column !== null ? loc.column + 1 : null,
          kind: PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.classifyUsage(pathRef),
          name,
          builtin,
          source: loc.line ? lines[loc.line - 1].trim() : "",
        });
      },
    });

    return { findings, parseErrors };
  }

  /**
   * Normalizes path.
   * @param {*} filePath File path.
   */
  static normalizePath(filePath) {
    return filePath.split(path.sep).join("/");
  }

  /**
   * Handles summarize.
   * @param {*} allFindings All findings.
   */
  static summarize(allFindings) {
    const byName = new Map();
    const byFile = new Map();

    for(const f of allFindings) {
      byName.set(f.name, (byName.get(f.name) || 0) + 1);
      byFile.set(f.file, (byFile.get(f.file) || 0) + 1);
    }

    return {
      byName: PRDC_JSLAB_SOURCE_ANALYSIS.mapToSortedArray(byName, "name", "count"),
      byFile: PRDC_JSLAB_SOURCE_ANALYSIS.mapToSortedArray(byFile, "file", "count"),
    };
  }


  /**
   * Prints text report.
   * @param {*} report Report.
   * @param {*} opts Opts.
   */
  static printTextReport(report, opts) {
    const {
      filesScanned,
      findings,
      nonBuiltinFindings,
      builtinFindings,
      parseErrors,
      summary,
    } = report;

    console.log(`Scanned files: ${filesScanned}`);
    console.log(`Findings (all): ${findings.length}`);
    console.log(`Findings (non-builtin): ${nonBuiltinFindings.length}`);
    console.log(`Findings (builtin): ${builtinFindings.length}`);
    if(parseErrors.length) {
      console.log(`Parse errors: ${parseErrors.length}`);
    }
    console.log("");

    if(summary.byName.length) {
      console.log("Top names:");
      for(const row of summary.byName.slice(0, 30)) {
        console.log(`  ${row.count.toString().padStart(5)}  ${row.name}`);
      }
      console.log("");
    }

    if(findings.length) {
      console.log("Details:");
      for(const f of findings) {
        console.log(
          `${f.file}:${f.line}:${f.column}  ${f.kind.padEnd(16)} ${f.name}` +
          `${f.builtin ? " [builtin]" : ""}`
        );
      }
      console.log("");
    }

    if(parseErrors.length) {
      console.log("Parse errors:");
      for(const err of parseErrors) {
        console.log(`${err.file}:${err.line}:${err.column}  ${err.message}`);
      }
      console.log("");
    }

    if(opts.failOnAny && findings.length > 0) {
      console.log("Status: FAILED (--fail-on-any and bare globals found)");
    } else {
      console.log("Status: OK");
    }
  }

  /**
   * Runs the module entry point.
   */
  static main() {
    const opts = PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.parseArgs(process.argv.slice(2));
    const { root, files, findings, parseErrors } = PRDC_JSLAB_SOURCE_ANALYSIS.analyze(opts,
      (file, options) => PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.analyzeFile(file, options), 'name');

    const nonBuiltinFindings = findings.filter((f) => !f.builtin);
    const builtinFindings = findings.filter((f) => f.builtin);
    const summary = PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.summarize(findings);

    const report = {
      root: PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.normalizePath(path.relative(process.cwd(), root) || "."),
      filesScanned: files.length,
      options: {
        showBuiltins: opts.showBuiltins,
        failOnAny: opts.failOnAny,
        includeTests: opts.includeTests,
        ignoreNames: [...opts.ignoreNames],
      },
      findings,
      nonBuiltinFindings,
      builtinFindings,
      parseErrors,
      summary,
    };

    if(opts.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.printTextReport(report, opts);
    }

    PRDC_JSLAB_SOURCE_ANALYSIS.writeReportFile(opts.reportFile, report);

    if(opts.failOnAny && findings.length > 0) {
      process.exitCode = 2;
    }
  }
}


const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const DEFAULT_ROOT = "js/sandbox";
const DEFAULT_REPORT_FILE = "temp/check-sandbox-globals-report.json";
const BUILTIN_GLOBALS = new Set([
  ...Object.getOwnPropertyNames(globalThis),
  "window",
  "document",
  "navigator",
  "self",
  "location",
  "Worker",
  "Blob",
  "MediaRecorder",
  "SpeechSynthesisUtterance",
  "speechSynthesis",
  "Cesium",
  "Image",
  "HTMLMediaElement",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "require",
  "module",
  "exports",
  "__dirname",
  "__filename",
  "global",
  "globalThis",
  "process",
]);


PRDC_JSLAB_DEV_CHECK_SANDBOX_GLOBALS_HELPER.main();
