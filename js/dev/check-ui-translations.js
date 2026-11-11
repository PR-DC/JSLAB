/**
 * @file Runs source checks for UI translation coverage
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const path = require('path');
const { checkRepository } = require('../shared/ui-translation-checker');
const root = path.resolve(__dirname, '../..');
const catalog = require('../../config/lang.json');
const result = checkRepository(root, catalog);
const findings = result.findings;
fs.mkdirSync(path.join(root, 'temp'), { recursive: true });
fs.writeFileSync(path.join(root, 'temp/check-ui-translations.json'), JSON.stringify(result, null, 2));
for(const finding of findings) console.error(finding.file + ':' + finding.line + ': ' + finding.message);
console.log('UI translation check: ' + result.files + ' files, ' + findings.length + ' findings.');
process.exitCode = findings.length ? 1 : 0;
