/**
 * @file Platform-independent window-controller dependency contracts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { PRDC_JSLAB_TESTS } = require('../tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('feature controllers receive platform services instead of importing backend implementations', function(assert) {
  const root = path.resolve(__dirname, '../../..');
  const native_modules = new Set(['electron', 'electron-store', 'fs', 'path', 'os', 'child_process', 'eslint']);
  const files = [];
  for(const folder of ['main', 'editor', 'simulate', 'latex-editor', 'presentation-editor']) {
    for(const entry of fs.readdirSync(path.join(root, 'js', folder), { withFileTypes: true })) {
      if(entry.isFile() && entry.name.endsWith('.js')) {
        files.push(path.join(root, 'js', folder, entry.name));
      }
    }
  }
  for(const name of ['assistant', 'system-terminal']) {
    files.push(path.join(root, 'js/windows', name + '.js'));
  }
  files.push(path.join(root, 'js/code/doc-hover.js'), path.join(root, 'js/code/dialog-search.js'),
    path.join(root, 'lib/PRDC_PANEL/PRDC_PANEL.js'), path.join(root, 'lib/PRDC_POPUP/PRDC_POPUP.js'));
  const violations = [];
  for(const filename of files) {
    const ast = parser.parse(fs.readFileSync(filename, 'utf8'), { sourceType: 'unambiguous' });
    traverse(ast, {
      ReferencedIdentifier(p) {
        if(['localStorage', 'sessionStorage'].includes(p.node.name)) {
          violations.push(path.relative(root, filename) + ': ' + p.node.name);
        }
      },
      MemberExpression(p) {
        if(['localStorage', 'sessionStorage'].includes(p.node.property.name || p.node.property.value)) {
          violations.push(path.relative(root, filename) + ': ' + (p.node.property.name || p.node.property.value));
        }
      },
      CallExpression(p) {
        if(p.node.callee.name != 'require' || p.node.arguments[0]?.type != 'StringLiteral') {
          return;
        }
        const module_name = p.node.arguments[0].value;
        if(native_modules.has(module_name) || /backend-(electron|web)/.test(module_name)) {
          violations.push(path.relative(root, filename) + ': ' + module_name);
        }
      }
    });
  }
  assert.deepEqual(violations, []);
}, { tags: ['unit', 'shared', 'architecture'] });

tests.add('browser host loads the common main controller without reimplementing its views', function(assert) {
  const filename = path.resolve(__dirname, '../../backend-web/app-host.js');
  const ast = parser.parse(fs.readFileSync(filename, 'utf8'), { sourceType: 'unambiguous' });
  const duplicate_views = new Set(['renderInspector', 'renderInspectorTable', 'handleInspectorAction',
    '_renderWorkspaceDirectory', '_addWorkspaceBrowserItem', '_createConsoleValueElement', '_handleCommandInputKeyDown']);
  let loads_main = false;
  const violations = [];
  traverse(ast, {
    ClassMethod(p) {
      if(duplicate_views.has(p.node.key.name)) {
        violations.push(p.node.key.name);
      }
    },
    CallExpression(p) {
      if(p.node.callee.name == 'require' && p.node.arguments[0]?.value == '../main/main') {
        loads_main = true;
      }
    }
  });
  assert.equal(loads_main, true);
  assert.deepEqual(violations, []);
}, { tags: ['unit', 'architecture'] });

tests.add('main and Editor controllers do not read host runtime globals or select a backend', function(assert) {
  const root = path.resolve(__dirname, '../../..');
  const globals = new Set(['process', 'Buffer', 'ipcRenderer', 'MathJax', 'navigator']);
  const violations = [];
  for(const folder of ['main', 'editor']) {
    for(const name of fs.readdirSync(path.join(root, 'js', folder)).filter(name => name.endsWith('.js'))) {
      const filename = path.join(root, 'js', folder, name);
      traverse(parser.parse(fs.readFileSync(filename, 'utf8'), { sourceType: 'unambiguous' }), {
        ReferencedIdentifier(p) {
          if(globals.has(p.node.name) && !p.scope.hasBinding(p.node.name)) {
            violations.push(folder + '/' + name + ': ' + p.node.name);
          }
        },
        MemberExpression(p) {
          if(p.node.property.name == 'kind' && p.node.object.property?.name == 'platform') {
            violations.push(folder + '/' + name + ': platform.kind');
          }
        }
      });
    }
  }
  assert.deepEqual(violations, []);
}, { tags: ['unit', 'architecture'] });

tests.add('host services reuse feature-owned behavior through real bases and composed services', function(assert) {
  const root = path.resolve(__dirname, '../..');
  for(const [backend, host_name, debugger_name] of [
    ['backend-electron', 'main-process', 'chromium-debugger'],
    ['backend-web', 'app-host', 'worker-debugger-client']
  ]) {
    const host = fs.readFileSync(path.join(root, backend, host_name + '.js'), 'utf8');
    assert.ok(host.includes("require('../windows/assistant')"), backend + ' uses the feature-owned Assistant');
    assert.equal(host.includes('api.openai.com'), false, backend + ' delegates provider requests to the Assistant service');
    for(const [name, base] of [[debugger_name, 'PRDC_JSLAB_DEBUGGER_STATE'],
      ['window-manager', 'PRDC_JSLAB_WINDOW_MANAGER']]) {
      const source = parser.parse(fs.readFileSync(path.join(root, backend, name + '.js'), 'utf8'));
      assert.ok(source.program.body.some(node => node.type === 'ClassDeclaration' && node.superClass?.name === base),
        backend + '/' + name + ' extends the common feature base');
    }
    const sandbox_host = fs.readFileSync(path.join(root, backend, 'sandbox-host.js'), 'utf8');
    assert.ok(sandbox_host.includes('new PRDC_JSLAB_DEBUGGER_DISPATCHER('), backend + ' composes debugger command routing');
    assert.equal(parser.parse(host).program.body.some(node => node.type === 'ClassDeclaration' && node.superClass), false,
      backend + ' has no unrelated application base');
  }
}, { tags: ['unit', 'shared', 'architecture'] });

tests.add('Electron and browser backends do not contain substantial copied method bodies', function(assert) {
  const root = path.resolve(__dirname, '../..');
  const bodies = { 'backend-electron': new Map(), 'backend-web': new Map() };
  for(const backend of Object.keys(bodies)) {
    const directory = path.join(root, backend);
    for(const name of fs.readdirSync(directory).filter(file => file.endsWith('.js'))) {
      const filename = path.join(directory, name);
      const source = fs.readFileSync(filename, 'utf8');
      const add = node => {
        if(node.body?.type !== 'BlockStatement') return;
        const body = source.slice(node.body.start + 1, node.body.end - 1)
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
          .replace(/\s+/g, ' ').trim();
        const tokens = body.match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|=>|\?\?|\?\.|&&|\|\||\S/g) || [];
        if(tokens.length < 35) return;
        const normalized = tokens.join(' ');
        const location = backend + '/' + name + ':' + node.loc.start.line;
        if(!bodies[backend].has(normalized)) bodies[backend].set(normalized, []);
        bodies[backend].get(normalized).push(location);
      };
      traverse(parser.parse(source, { sourceType: 'unambiguous' }), {
        ClassMethod(p) { add(p.node); },
        ObjectMethod(p) { add(p.node); },
        FunctionDeclaration(p) { add(p.node); },
        FunctionExpression(p) { add(p.node); },
        ArrowFunctionExpression(p) { add(p.node); }
      });
    }
  }
  const duplicates = [];
  for(const [body, electron_locations] of bodies['backend-electron']) {
    const web_locations = bodies['backend-web'].get(body);
    if(web_locations) duplicates.push(...electron_locations.flatMap(left => web_locations.map(right => left + ' == ' + right)));
  }
  assert.deepEqual(duplicates, []);
}, { tags: ['unit', 'shared', 'architecture'] });

exports.MODULE_TESTS = tests;
