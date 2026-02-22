/**
 * @file Sandbox bare-global checker
 * @author PR-DC
 *
 * Scans js/sandbox files and reports identifiers that are used as globals
 * (not locally bound in lexical scope), which can indicate internal code paths
 * that should use this.jsl.* references instead.
 *
 * Usage:
 *   node js/dev/check-sandbox-globals.js
 *   node js/dev/check-sandbox-globals.js --json
 *   node js/dev/check-sandbox-globals.js --hide-builtins
 *   node js/dev/check-sandbox-globals.js --fail-on-any
 *   node js/dev/check-sandbox-globals.js --ignore-names tic,toc
 *   node js/dev/check-sandbox-globals.js --root js/sandbox
 */
"use strict";

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

function parseArgs(argv) {
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
        opts.ignoreNames = splitCsvToSet(argv[++i]);
        break;
      case "--report-file":
        opts.reportFile = argv[++i] || opts.reportFile;
        break;
      case "--no-report-file":
        opts.reportFile = "";
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        break;
    }
  }
  return opts;
}

function splitCsvToSet(value) {
  if(typeof value !== "string" || !value.length) {
    return new Set();
  }
  return new Set(
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );
}

function printHelp() {
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

function getJsFilesRecursive(rootDir, includeTests) {
  const out = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for(const entry of entries) {
      const full = path.join(dir, entry.name);
      if(entry.isDirectory()) {
        walk(full);
      } else if(entry.isFile() && full.endsWith(".js")) {
        if(!includeTests && full.endsWith(".test.js")) {
          continue;
        }
        out.push(full);
      }
    }
  }

  walk(rootDir);
  return out;
}

function classifyUsage(pathRef) {
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

function parseFileCode(filePath, code) {
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

function analyzeFile(filePath, opts) {
  const code = fs.readFileSync(filePath, "utf8");
  const lines = code.split(/\r?\n/);
  const findings = [];
  const parseErrors = [];
  let ast;

  try {
    ast = parseFileCode(filePath, code);
    if(Array.isArray(ast.errors) && ast.errors.length) {
      for(const err of ast.errors) {
        parseErrors.push({
          file: normalizePath(filePath),
          message: err.message,
          line: err.loc ? err.loc.line : null,
          column: err.loc ? err.loc.column + 1 : null,
        });
      }
    }
  } catch(err) {
    parseErrors.push({
      file: normalizePath(filePath),
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
        file: normalizePath(filePath),
        line: loc.line,
        column: loc.column !== null ? loc.column + 1 : null,
        kind: classifyUsage(pathRef),
        name,
        builtin,
        source: loc.line ? lines[loc.line - 1].trim() : "",
      });
    },
  });

  return { findings, parseErrors };
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function summarize(allFindings) {
  const byName = new Map();
  const byFile = new Map();

  for(const f of allFindings) {
    byName.set(f.name, (byName.get(f.name) || 0) + 1);
    byFile.set(f.file, (byFile.get(f.file) || 0) + 1);
  }

  return {
    byName: mapToSortedArray(byName, "name", "count"),
    byFile: mapToSortedArray(byFile, "file", "count"),
  };
}

function mapToSortedArray(map, keyName, valueName) {
  return [...map.entries()]
    .map(([k, v]) => ({ [keyName]: k, [valueName]: v }))
    .sort((a, b) => {
      if(b[valueName] !== a[valueName]) {
        return b[valueName] - a[valueName];
      }
      return String(a[keyName]).localeCompare(String(b[keyName]));
    });
}

function printTextReport(report, opts) {
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

function writeReportFile(reportFile, report) {
  if(typeof reportFile !== "string" || !reportFile.length) {
    return;
  }

  const resolved = path.resolve(process.cwd(), reportFile);
  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(report, null, 2));
  console.log(`Report file: ${normalizePath(path.relative(process.cwd(), resolved))}`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = path.resolve(process.cwd(), opts.root);
  if(!fs.existsSync(root)) {
    console.error(`Path not found: ${opts.root}`);
    process.exit(1);
  }

  const files = getJsFilesRecursive(root, opts.includeTests);
  const findings = [];
  const parseErrors = [];

  for(const filePath of files) {
    const result = analyzeFile(filePath, opts);
    findings.push(...result.findings);
    parseErrors.push(...result.parseErrors);
  }

  findings.sort((a, b) => {
    if(a.file !== b.file) return a.file.localeCompare(b.file);
    if(a.line !== b.line) return (a.line || 0) - (b.line || 0);
    if(a.column !== b.column) return (a.column || 0) - (b.column || 0);
    return a.name.localeCompare(b.name);
  });

  const nonBuiltinFindings = findings.filter((f) => !f.builtin);
  const builtinFindings = findings.filter((f) => f.builtin);
  const summary = summarize(findings);

  const report = {
    root: normalizePath(path.relative(process.cwd(), root) || "."),
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
    printTextReport(report, opts);
  }

  writeReportFile(opts.reportFile, report);

  if(opts.failOnAny && findings.length > 0) {
    process.exitCode = 2;
  }
}

main();
