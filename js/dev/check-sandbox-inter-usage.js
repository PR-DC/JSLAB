"use strict";

/**
 * @file Sandbox direct jsl-module usage checker
 * @author PR-DC
 *
 * Reports internal code paths that access modules via `*.jsl.<module>`
 * instead of `*.jsl.inter.<module>`.
 *
 * Usage:
 *   node js/dev/check-sandbox-inter-usage.js
 *   node js/dev/check-sandbox-inter-usage.js --json
 *   node js/dev/check-sandbox-inter-usage.js --fail-on-any
 *   node js/dev/check-sandbox-inter-usage.js --root js/sandbox
 *   node js/dev/check-sandbox-inter-usage.js --modules env,lang,math,windows
 */

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { PRDC_APP_CONFIG } = require("../../config/config");
const {
  CORE_INTERNAL_MODULE_NAMES,
  CHECKER_PROTECTED_SLOT_NAMES,
} = require("../sandbox/internal-protected-modules");

const DEFAULT_ROOT = "js/sandbox";
const DEFAULT_REPORT_FILE = "temp/check-sandbox-inter-report.json";

function getDefaultProtectedModules() {
  const cfg = new PRDC_APP_CONFIG();
  const names = new Set([
    ...CORE_INTERNAL_MODULE_NAMES.filter((name) => name !== "context"),
    ...CHECKER_PROTECTED_SLOT_NAMES,
  ]);
  const builtin = Array.isArray(cfg.SUBMODULES && cfg.SUBMODULES.builtin)
    ? cfg.SUBMODULES.builtin
    : [];
  const lib = Array.isArray(cfg.SUBMODULES && cfg.SUBMODULES.lib)
    ? cfg.SUBMODULES.lib
    : [];

  for(const module_data of builtin.concat(lib)) {
    if(module_data && typeof module_data.name === "string" && module_data.name.length) {
      names.add(module_data.name);
    }
  }
  names.delete("inter");
  return names;
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

function parseArgs(argv) {
  const opts = {
    root: DEFAULT_ROOT,
    json: false,
    includeTests: false,
    failOnAny: false,
    modules: getDefaultProtectedModules(),
    ignoreModules: new Set(),
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
      case "--include-tests":
        opts.includeTests = true;
        break;
      case "--fail-on-any":
        opts.failOnAny = true;
        break;
      case "--modules":
        opts.modules = splitCsvToSet(argv[++i]);
        break;
      case "--ignore-modules":
        opts.ignoreModules = splitCsvToSet(argv[++i]);
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

  for(const name of opts.ignoreModules) {
    opts.modules.delete(name);
  }
  opts.modules.delete("inter");
  return opts;
}

function printHelp() {
  console.log("Sandbox jsl.inter usage checker");
  console.log("");
  console.log("Options:");
  console.log("  --root <dir>            Root folder to scan (default: js/sandbox)");
  console.log("  --json                  Print machine-readable JSON report");
  console.log("  --include-tests         Include *.test.js files");
  console.log("  --fail-on-any           Exit non-zero if any findings are found");
  console.log("  --modules <csv>         Protected module names to check");
  console.log("  --ignore-modules <csv>  Skip selected module names");
  console.log("  --report-file <path>    Write JSON report to file (default: temp/check-sandbox-inter-report.json)");
  console.log("  --no-report-file        Disable writing report file");
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
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

function parseFileCode(code) {
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

function getMemberPropertyName(node) {
  if(!node) {
    return null;
  }

  if(node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    const prop = node.property;
    if(node.computed) {
      if(prop && prop.type === "StringLiteral") {
        return prop.value;
      }
      return null;
    }
    if(prop && prop.type === "Identifier") {
      return prop.name;
    }
    if(prop && prop.type === "PrivateName" && prop.id && prop.id.type === "Identifier") {
      return prop.id.name;
    }
    return null;
  }
  return null;
}

function isJslMember(node) {
  if(!node) {
    return false;
  }
  if(node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression") {
    return false;
  }
  return getMemberPropertyName(node) === "jsl";
}

function analyzeFile(filePath, opts) {
  const code = fs.readFileSync(filePath, "utf8");
  const lines = code.split(/\r?\n/);
  const findings = [];
  const parseErrors = [];
  let ast;

  try {
    ast = parseFileCode(code);
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

  function onMember(pathRef) {
    const node = pathRef.node;
    if(!node || !node.object) {
      return;
    }

    const obj = node.object;
    if(!isJslMember(obj)) {
      return;
    }

    const moduleName = getMemberPropertyName(node);
    if(typeof moduleName !== "string" || !moduleName.length) {
      return;
    }
    if(moduleName === "inter") {
      return;
    }
    if(!opts.modules.has(moduleName)) {
      return;
    }

    const loc = node.loc ? node.loc.start : { line: null, column: null };
    const source = loc.line ? lines[loc.line - 1].trim() : "";

    findings.push({
      file: normalizePath(filePath),
      line: loc.line,
      column: loc.column !== null ? loc.column + 1 : null,
      module: moduleName,
      source,
      suggestion: source.replace(/\.jsl\./g, ".jsl.inter."),
    });
  }

  traverse(ast, {
    MemberExpression(pathRef) {
      onMember(pathRef);
    },
    OptionalMemberExpression(pathRef) {
      onMember(pathRef);
    },
  });

  return { findings, parseErrors };
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

function summarize(findings) {
  const byModule = new Map();
  const byFile = new Map();

  for(const f of findings) {
    byModule.set(f.module, (byModule.get(f.module) || 0) + 1);
    byFile.set(f.file, (byFile.get(f.file) || 0) + 1);
  }

  return {
    byModule: mapToSortedArray(byModule, "module", "count"),
    byFile: mapToSortedArray(byFile, "file", "count"),
  };
}

function printTextReport(report, opts) {
  console.log(`Scanned files: ${report.filesScanned}`);
  console.log(`Findings: ${report.findings.length}`);
  if(report.parseErrors.length) {
    console.log(`Parse errors: ${report.parseErrors.length}`);
  }
  console.log("");

  if(report.summary.byModule.length) {
    console.log("By module:");
    for(const row of report.summary.byModule) {
      console.log(`  ${row.count.toString().padStart(5)}  ${row.module}`);
    }
    console.log("");
  }

  if(report.findings.length) {
    console.log("Details:");
    for(const f of report.findings) {
      console.log(`${f.file}:${f.line}:${f.column}  ${f.module}`);
      if(f.source) {
        console.log(`  ${f.source}`);
      }
    }
    console.log("");
  }

  if(report.parseErrors.length) {
    console.log("Parse errors:");
    for(const err of report.parseErrors) {
      console.log(`${err.file}:${err.line}:${err.column}  ${err.message}`);
    }
    console.log("");
  }

  if(opts.failOnAny && report.findings.length > 0) {
    console.log("Status: FAILED (--fail-on-any and direct jsl module usage found)");
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
    return a.module.localeCompare(b.module);
  });

  const report = {
    root: normalizePath(path.relative(process.cwd(), root) || "."),
    filesScanned: files.length,
    options: {
      includeTests: opts.includeTests,
      failOnAny: opts.failOnAny,
      modules: [...opts.modules].sort(),
      ignoreModules: [...opts.ignoreModules].sort(),
    },
    findings,
    parseErrors,
    summary: summarize(findings),
  };

  if(opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report, opts);
  }

  writeReportFile(opts.reportFile, report);

  if((opts.failOnAny && findings.length > 0) || parseErrors.length > 0) {
    process.exitCode = 2;
  }
}

main();
