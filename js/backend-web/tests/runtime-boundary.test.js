/**
 * @file Shared sandbox environment boundary tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { getWebSubmoduleConstructor } = require('../sandbox-modules');
const { PRDC_JSLAB_LIB_PRESENTATION } = require('../../sandbox/presentation');
const tests = new PRDC_JSLAB_TESTS();

tests.add('shared sandbox sources have no backend imports or native host dependencies', function(assert) {
  const root = path.resolve(__dirname, '../../sandbox');
  const native_modules = new Set(['fs', 'os', 'electron', 'child_process', 'http', 'https', 'net', 'dgram', 'serialport']);
  const findings = [];
  for(const name of fs.readdirSync(root)) {
    if(!name.endsWith('.js') || /^jslab-env-(electron|web)\.js$/.test(name)) {
      continue;
    }
    const ast = parser.parse(fs.readFileSync(path.join(root, name), 'utf8'), {
      sourceType: 'unambiguous', allowReturnOutsideFunction: true
    });
    traverse(ast, {
      StringLiteral(node) {
        const value = node.node.value;
        if(/backend-(electron|web)\//.test(value)) {
          findings.push(name + ': direct backend path ' + value);
        }
      },
      CallExpression(node) {
        const value = node.node.arguments[0]?.value;
        if(node.node.callee.name === 'require' && native_modules.has(value)) {
          findings.push(name + ': native dependency ' + value);
        }
      },
      Identifier(node) {
        if(node.node.name === '__JSLAB_RUNTIME__') {
          findings.push(name + ': runtime selection outside an environment');
        }
      }
    });
  }
  assert.deepEqual(findings, []);
}, { tags: ['unit', 'architecture'] });

tests.add('browser presentation registration uses the shared scientific presentation controller', function(assert) {
  assert.equal(getWebSubmoduleConstructor({ file: 'presentation' }), PRDC_JSLAB_LIB_PRESENTATION);
}, { tags: ['unit', 'architecture', 'presentation'] });

exports.MODULE_TESTS = tests;
