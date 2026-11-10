/**
 * @file Source-based GUI event handler inventory and execution coverage
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '..', '..');
const handlers = new Map();
const hits = new Set();
const dom_events = /^(click|dblclick|contextmenu|input|change|focus|blur|key\w+|mouse\w+|pointer\w+|lostpointercapture|drag\w*|drop|scroll|resize|load|DOMContentLoaded|error|unhandledrejection|beforeprint|hashchange|message|tabNew|tabAdd|tabRemove|tabClose|activeTabChange|keypress|cursorActivity)$/;

/**
 * Inventories and instruments callbacks without changing their receiver or identity.
 * @param {string} source Source after template substitutions.
 * @param {string} filename Absolute source filename.
 * @returns {string} Instrumented source, used only by test fixtures/builds.
 */
function instrument(source, filename) {
  var relative = path.relative(root, filename).replace(/\\/g, '/');
  var ast = parser.parse(source, { sourceType: 'unambiguous', allowReturnOutsideFunction: true });
  var edits = new Map();
  var methods = new Map();
  var members = new Map();
  traverse(ast, {
    ClassMethod(p) { if(p.node.key.type === 'Identifier') methods.set(p.node.key.name, p); },
    AssignmentExpression(p) {
      var left = p.node.left;
      if(left.type === 'MemberExpression' && !left.computed) members.set(left.property.name, p.get('right'));
    }
  });
  function record(callback, event, kind) {
    if(!callback || (!callback.isFunctionExpression() && !callback.isArrowFunctionExpression() && !callback.isFunctionDeclaration() && !callback.isClassMethod())) return;
    var node = callback.node;
    var id = relative + ':' + node.loc.start.line + ':' + node.loc.start.column;
    handlers.set(id, { id, file: relative, line: node.loc.start.line, event, kind });
    if(edits.has(node.start)) return;
    var hit = 'globalThis.__JSLAB_GUI_HIT__&&globalThis.__JSLAB_GUI_HIT__(' + JSON.stringify(id) + ');';
    if(node.body.type === 'BlockStatement') {
      var position = node.body.directives.length ? node.body.directives.at(-1).end : node.body.start + 1;
      edits.set(node.start, [{ start: position, text: ';' + hit }]);
    } else edits.set(node.start, [{ start: node.body.start, text: '{' + hit + 'return (' },
      { start: node.body.end, text: ');}' }]);
  }
  function resolve(callback, seen = new Set()) {
    if(!callback || seen.has(callback.node)) return callback;
    seen.add(callback.node);
    if(callback && callback.isIdentifier()) {
      var binding = callback.scope.getBinding(callback.node.name);
      if(binding && binding.path.isVariableDeclarator()) return resolve(binding.path.get('init'), seen);
      if(binding && binding.path.isFunctionDeclaration()) return binding.path;
    }
    if(callback.isMemberExpression() && !callback.node.computed) {
      var member = callback.node.property.name;
      if(members.has(member)) return resolve(members.get(member), seen);
      if(methods.has(member)) return methods.get(member);
    }
    if(callback.isCallExpression()) {
      var callee = callback.get('callee');
      if(callee.isMemberExpression() && callee.node.property.name === 'bind') return resolve(callee.get('object'), seen);
      if(callee.isFunctionExpression() || callee.isArrowFunctionExpression()) {
        var returned;
        callee.traverse({ ReturnStatement(p) { if(!returned && p.get('argument').isFunctionExpression()) returned = p.get('argument'); } });
        if(returned) return returned;
      }
    }
    return callback;
  }
  traverse(ast, {
    CallExpression(p) {
      var callee = p.node.callee;
      var args = p.get('arguments');
      var name = callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : callee.type === 'Identifier' ? callee.name : '';
      if(name === 'addEventListener') {
        record(resolve(args[1]), p.node.arguments[0].value || 'dynamic', 'dom');
      } else if(['on', 'once'].includes(name) && args.length > 1) {
        var event = p.node.arguments[0].value;
        if(typeof event === 'string' && (dom_events.test(event) || /Window$/.test(event))) record(resolve(args.at(-1)), event, 'emitter');
      } else if(dom_events.test(name) && args.length && !['load', 'error', 'message'].includes(name)) {
        record(resolve(args.at(-1)), name, 'jquery');
      } else if(name === 'bindContextAction') record(resolve(args[1]), 'click', 'action');
    },
    AssignmentExpression(p) {
      var left = p.node.left;
      if(left.type === 'MemberExpression' && !left.computed && /^on[a-z]+$/.test(left.property.name)) record(resolve(p.get('right')), left.property.name.slice(2), 'property');
    },
    NewExpression(p) {
      if(p.node.callee.type === 'Identifier' && p.node.callee.name === 'PRDC_POPUP') {
        record(resolve(p.get('arguments')[2]), 'open', 'lifecycle');
        record(resolve(p.get('arguments')[3]), 'close', 'lifecycle');
      }
    },
    ObjectProperty(p) {
      var name = p.node.key.type === 'Identifier' ? p.node.key.name : '';
      if(/^on[A-Z_]|^on_[a-z]/.test(name)) record(resolve(p.get('value')), name, 'lifecycle');
    }
  });
  for(const edit of [...edits.values()].flat().sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.start);
  return source;
}

function snapshot() {
  var rows = [...handlers.values()].map(row => ({ ...row, covered: hits.has(row.id) }));
  return { total: rows.length, covered: rows.filter(row => row.covered).length, missing: rows.filter(row => !row.covered), handlers: rows };
}

exports.instrument = instrument;
/** Inventories desktop interaction sources even when a fixture never loads them. */
exports.inventoryDesktop = function() {
  function visit(folder) {
    for(const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      var filename = path.join(folder, entry.name);
      if(entry.isDirectory()) { if(entry.name !== 'tests') visit(filename); continue; }
      // Entrypoints are covered by the real application startup suite. custom-search is unused legacy code.
      if(!entry.name.endsWith('.js') || entry.name.endsWith('.test.js') || entry.name.startsWith('init-') || entry.name === 'custom-search.js') continue;
      instrument(fs.readFileSync(filename, 'utf8').replace('%presentation_config%', '{}'), filename);
    }
  }
  for(const folder of ['js/main', 'js/editor', 'js/code', 'js/windows', 'lib/PRDC_TABS', 'lib/PRDC_PANEL', 'lib/PRDC_POPUP']) visit(path.join(root, folder));
};
exports.hit = id => hits.add(id);
exports.merge = ids => ids.forEach(id => hits.add(id));
exports.snapshot = snapshot;
exports.writeReport = function(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(snapshot(), null, 2));
};
