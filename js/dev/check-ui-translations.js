/**
 * @file Runs source checks for UI translation coverage
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SIMULATE_COMPILER } = require('../simulate/compiler');
PRDC_JSLAB_SIMULATE_COMPILER.configure(require('../backend-electron/simulate-assets').PRDC_JSLAB_SIMULATE_ASSETS);
const additional_strings = PRDC_JSLAB_SIMULATE_COMPILER.getLanguageStrings();
const fs = require('fs');
const path = require('path');
const { checkRepository } = require('../other-shared/ui-translation-checker');
const root = path.resolve(__dirname, '../..');
const catalog = require('../../config/lang.json');
const result = checkRepository(root, catalog, { additional_strings });
const findings = result.findings;
const catalog_source = fs.readFileSync(path.join(root, 'config/lang.json'), 'utf8');
const catalog_properties = require('@babel/parser').parseExpression(catalog_source).properties;
let expected_id = 1;
for(const property of catalog_properties) {
  if(property.key.value !== String(expected_id)) {
    findings.push({ file: 'config/lang.json', line: property.loc.start.line,
      message: 'Application translation IDs must be contiguous integers starting at 1.' });
  }
  expected_id++;
}
const library_file = path.join(PRDC_JSLAB_SIMULATE_COMPILER.getBundleRoot(), 'config/lang.json');
const library_properties = require('@babel/parser').parseExpression(fs.readFileSync(library_file, 'utf8')).properties;
expected_id = 1;
for(const property of library_properties) {
  if(property.key.value !== 'omjsl-' + expected_id) {
    findings.push({ file: path.relative(root, library_file), line: property.loc.start.line,
      message: 'Compiler translation IDs must be ordered and contiguous from omjsl-1.' });
  }
  expected_id++;
}
fs.mkdirSync(path.join(root, 'temp'), { recursive: true });
fs.writeFileSync(path.join(root, 'temp/check-ui-translations.json'), JSON.stringify(result, null, 2));
for(const finding of findings) {
  console.error(finding.file + ':' + finding.line + ': ' + finding.message);
}
console.log('UI translation check: ' + result.files + ' files, ' + findings.length + ' findings.');
process.exitCode = findings.length ? 1 : 0;
