/**
 * @file JSLAB documentation format tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { getMarkdownSection, renderHtml, renderLatex,
  renderMarkdownReference } = require('../documentation');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
var tick = '`';
var fence = tick.repeat(3);

tests.add('documentation section extraction ignores headings inside fenced examples', function(assert) {
  var source = ['## First', 'Text', '## MCP server', '### Setup', fence + 'javascript',
    '## This is code', fence, 'End', '## Last', 'Other'].join('\n');
  var section = getMarkdownSection(source, 'MCP server');
  assert.ok(section.includes('## This is code'));
  assert.ok(section.endsWith('End'));
  assert.equal(section.includes('## Last'), false);
  assert.throws(function() { getMarkdownSection(source, 'Missing'); }, /Missing documentation/);
}, { tags: ['unit', 'documentation'] });

tests.add('MCP documentation renders setup, tools and code examples in HTML and LaTeX', function(assert) {
  var source = fs.readFileSync(path.resolve(__dirname, '../../../dev/documentation_template.md'), 'utf8');
  var section = getMarkdownSection(source, 'MCP server');
  var html = renderHtml(section);
  var tex = renderLatex(section);
  assert.ok(html.includes('<h2>MCP server</h2>'));
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('mcpServers'));
  assert.ok(tex.includes('\\section{MCP server}'));
  assert.ok(tex.includes('\\begin{longtable}'));
  assert.ok(tex.includes('\\texttt{evaluate\\_code}'));
  assert.ok(tex.includes('mcpServers'));
  assert.equal(tex.includes('docs/mcp.md'), false);
}, { tags: ['unit', 'documentation'] });

tests.add('documentation LaTeX escapes special characters once and preserves fenced code', function(assert) {
  var tex = renderLatex(['## MCP server', 'Use ' + tick + 'a_b' + tick + ' with & and 10%.', '',
    fence + 'javascript', 'var path = "C:\\\\work";', fence].join('\n'));
  assert.ok(tex.includes('\\texttt{a\\_b}'));
  assert.ok(tex.includes('\\& and 10\\%'));
  assert.ok(tex.includes('var path = "C:\\\\work";'));
  assert.equal(tex.includes('\\textbackslash\\{'), false);
}, { tags: ['unit', 'documentation'] });

tests.add('Markdown API reference includes optional parameters, union types, defaults and returns', function(assert) {
  var index = { global: { basic: { example: { name: 'example', kind: 'function',
    description: 'Example description.', params: [{ name: 'value', optional: true,
      defaultvalue: 1, type: { names: ['number', 'string'] }, description: 'Input | value.' }],
    returns: [{ type: { names: ['boolean'] }, description: 'Result.' }] } } } };
  var output = renderMarkdownReference(index);
  assert.ok(output.includes('example([value])'));
  assert.ok(output.includes('number \\| string'));
  assert.ok(output.includes('Input \\| value.'));
  assert.ok(output.includes('Default: ' + tick + '1' + tick + '.'));
  assert.ok(output.includes('**Returns:** ' + tick + 'boolean' + tick + ' Result.'));
}, { tags: ['unit', 'documentation'] });

exports.MODULE_TESTS = tests;
