/**
 * @file UI translation enforcement and fixed-text annotation tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../tester');
const { checkHtml, checkJavaScript, checkRepository } = require('../ui-translation-checker');
const catalog = require('../../../config/lang.json');
const tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;
const sample = { 1: { en: 'Hello', rs: 'Zdravo', rsc: 'Здраво' } };

tests.add('translation check rejects HTML labels tooltips accessibility text and unknown IDs', assert => {
  const findings = checkHtml('<button title="Pause" aria-label="Stop">Continue</button><input placeholder="Search"><img alt="Save"><str sid="999"></str>', 'sample.html', sample);
  assert.equal(findings.length, 6);
  assert.equal(checkJavaScript('const options = { title: "Editor", label: "Run" };', 'sample.js', sample).length, 2);
  assert.ok(findings.some(row => row.message.includes('999')));
  assert.equal(checkHtml('<button TITLE=Pause></button>', 'sample.html', sample).length, 1);
  assert.equal(checkHtml('<button title-str="1" aria-label-str="1"><str sid="1"></str></button><option str="1"></option><img alt-str="1">', 'sample.html', sample).length, 0);
}, { tags: ['unit', 'language'] });

tests.add('lang-fixed marks HTML text without a reason and does not exempt descendant labels', assert => {
  assert.equal(checkHtml('<span lang-fixed>JSLAB</span>', 'sample.html', sample).length, 0);
  assert.equal(checkHtml('<span lang-fixed="">JSLAB</span>', 'sample.html', sample).length, 0);
  assert.equal(checkHtml('<span>JSLAB</span>', 'sample.html', sample).length, 1);
  assert.equal(checkHtml('<div lang-fixed><button>Untranslated</button></div>', 'sample.html', sample).length, 1);
  assert.equal(checkHtml('<!DOCTYPE html><style>.label { color: red }</style><script>const label = "code";</script>', 'sample.html', sample).length, 0);
}, { tags: ['unit', 'language'] });

tests.add('translation check detects JavaScript labels dialogs templates and assembled HTML', assert => {
  const findings = checkJavaScript('node.textContent = ready ? "Ready" : "Busy"; node.title = `Title ${name}`; alert("Failure"); node.innerHTML = "<label title=\\"Hint\\">" + value + "<button>Apply</button></label>";', 'sample.js', sample);
  assert.equal(findings.length, 6);
}, { tags: ['unit', 'language'] });

tests.add('lang-fixed marks adjacent JavaScript literals without a reason and validates IDs', assert => {
  assert.equal(checkJavaScript('node.textContent = /* lang-fixed */ "JSLAB"; node.title = language.currentString(1);', 'sample.js', sample).length, 0);
  assert.equal(checkJavaScript('node.textContent = /* lang-fixed-extra */ "English";', 'sample.js', sample).length, 1);
  assert.equal(checkJavaScript('/* lang-fixed */ const x = 1; node.textContent = "English";', 'sample.js', sample).length, 1);
  assert.equal(checkJavaScript('node.title = language.currentString("999");', 'sample.js', sample).length, 1);
  assert.equal(checkJavaScript('node.title = language.currentString("missing");', 'sample.js', sample).length, 1);
}, { tags: ['unit', 'language'] });

tests.add('translation check distinguishes stylesheet code from rendered text', assert => {
  assert.equal(checkJavaScript('const css = document.createElement("style"); css.textContent = "body { display: flex }"; node.textContent = "Untranslated";', 'sample.js', sample).length, 1);
}, { tags: ['unit', 'language'] });

tests.add('all application UI sources and every supported catalog language pass translation checks', assert => {
  const report = checkRepository(path.resolve(__dirname, '../../..'), catalog);
  assert.ok(report.files >= 80);
  assert.deepEqual(report.findings, []);
}, { tags: ['unit', 'language'] });

tests.add('translation check flags missing catalog languages and inconsistent placeholders', assert => {
  const broken = { ...catalog, test: { en: 'Hello {name}', rs: 'Zdravo', rsc: '' } };
  const report = checkRepository(path.resolve(__dirname, '../../..'), broken);
  assert.ok(report.findings.some(row => row.message.includes('Mismatched placeholders')));
  assert.ok(report.findings.some(row => row.message.includes('Missing rsc')));
}, { tags: ['unit', 'language'] });

tests.add('title translation uses an attribute instead of nested raw-text markup', assert => {
  assert.equal(checkHtml('<title str="1"><str sid="1"></str></title>', 'sample.html', sample).length, 1);
  assert.equal(checkHtml('<title str="1"></title>', 'sample.html', sample).length, 0);
}, { tags: ['unit', 'language'] });
