/**
 * @file JSLAB source analysis file and report utilities
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');

/**
 * Shares file discovery, argument parsing and report ordering between source audits.
 */
class PRDC_JSLAB_SOURCE_ANALYSIS {
  /**
   * Collects JavaScript sources recursively.
   * @param {string} rootDir Source root.
   * @param {boolean} includeTests Whether to include test files.
   * @returns {Array<string>} Source filenames.
   */
  static getJsFilesRecursive(rootDir, includeTests) {
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

  /**
   * Parses a comma-separated option into unique values.
   * @param {string} value Command option value.
   * @returns {Set<string>} Selected values.
   */
  static splitCsvToSet(value) {
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

  /**
   * Sorts counts by descending value and then by name.
   * @param {Map} map Source counts.
   * @param {string} keyName Output name field.
   * @param {string} valueName Output count field.
   * @returns {Array<Object>} Sorted report rows.
   */
  static mapToSortedArray(map, keyName, valueName) {
    return [...map.entries()]
      .map(([k, v]) => ({ [keyName]: k, [valueName]: v }))
      .sort((a, b) => {
        if(b[valueName] !== a[valueName]) {
          return b[valueName] - a[valueName];
        }
        return String(a[keyName]).localeCompare(String(b[keyName]));
      });
  }
  /**
   * Runs a source audit and orders findings by location and diagnostic name.
   * @param {Object} opts Audit options.
   * @param {Function} analyze_file File analyzer.
   * @param {string} name_key Diagnostic name field.
   * @returns {Object} Source root, files, findings and parse errors.
   */
  static analyze(opts, analyze_file, name_key) {
    const root = path.resolve(process.cwd(), opts.root);
    if(!fs.existsSync(root)) {
      throw Error('Path not found: ' + opts.root);
    }
    const files = this.getJsFilesRecursive(root, opts.includeTests);
    const findings = [];
    const parseErrors = [];
    for(const file of files) {
      const result = analyze_file(file, opts);
      findings.push(...result.findings);
      parseErrors.push(...result.parseErrors);
    }
    findings.sort((a, b) => a.file.localeCompare(b.file) ||
      (a.line || 0) - (b.line || 0) || (a.column || 0) - (b.column || 0) ||
      a[name_key].localeCompare(b[name_key]));
    return { root, files, findings, parseErrors };
  }

  /**
   * Writes an optional JSON source audit report.
   * @param {string} report_file Destination filename.
   * @param {Object} report Audit results.
   */
  static writeReportFile(report_file, report) {
    if(typeof report_file !== 'string' || !report_file.length) {
      return;
    }
    const resolved = path.resolve(process.cwd(), report_file);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(report, null, 2));
    console.log('Report file: ' + path.relative(process.cwd(), resolved).replace(/\\/g, '/'));
  }

}

exports.PRDC_JSLAB_SOURCE_ANALYSIS = PRDC_JSLAB_SOURCE_ANALYSIS;
