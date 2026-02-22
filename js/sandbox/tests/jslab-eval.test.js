/**
 * @file JSLAB eval submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const recast = require('recast');
const babel_parser = require('@babel/parser');
const { PRDC_JSLAB_EVAL } = require('../jslab-eval');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createEvalHarness(options = {}) {
  var event_handlers = {};
  var env_errors = [];
  var internal_errors = [];
  var logs = [];

  var jsl = {
    ready: options.ready !== false,
    context: {
      addEventListener: function(name, handler) {
        event_handlers[name] = handler;
      }
    },
    inter: {
      config: {
        DEBUG_PRE_TRANSFORMED_CODE: false,
        DEBUG_TRANSFORMED_CODE: false
      },
      lang: {
        string: function(id) {
          return 'LANG_' + id;
        }
      },
      env: {
        recast: recast,
        babel_parser: babel_parser,
        error: function(message) {
          env_errors.push(message);
        },
        errorInternal: function(message) {
          internal_errors.push(message);
        },
        showAns: function() {},
        pathBaseName: function(p) {
          return p.split(/[\\/]/).pop();
        },
        readFileSync: function() {
          return false;
        },
        SourceMapConsumer: class {
          constructor(map) {
            this.map = map;
          }

          originalPositionFor(position) {
            return {
              line: position.line - 1,
              column: position.column - 1,
            };
          }

          destroy() {}
        }
      },
      override: {
        withoutCheckStop: false
      },
      prettyPrint: function(value) {
        return String(value);
      }
    },
    _console: {
      log: function() {
        logs.push(Array.from(arguments));
      }
    },
    onEvaluating: function() {},
    onEvaluated: function() {},
    savePreviousWorkspace: function() {},
    loadPreviousWorkspace: function() {},
    pathResolve: function(p) {
      return p;
    },
    _eval: async function(code) {
      return code;
    },
    current_script: 'script.jsl',
    jsl_file_name: 'script.jsl'
  };

  if(options.runtime_identifier) {
    jsl.internal_jsl_identifier = options.runtime_identifier;
  }

  var eval_module = new PRDC_JSLAB_EVAL(jsl);
  return { eval_module, jsl, event_handlers, env_errors, internal_errors, logs };
}

tests.add('constructor registers sandbox error event handlers', function(assert) {
  var harness = createEvalHarness();
  assert.ok(typeof harness.event_handlers.unhandledrejection === 'function');
  assert.ok(typeof harness.event_handlers.error === 'function');
}, { tags: ['unit', 'eval'] });

tests.add('checkForbiddenPattern rejects forbidden identifiers in nested patterns', function(assert) {
  var harness = createEvalHarness();
  var pattern = {
    type: 'ObjectPattern',
    properties: [
      { type: 'Property', value: { type: 'Identifier', name: 'ok_name' } },
      {
        type: 'Property',
        value: {
          type: 'ArrayPattern',
          elements: [
            { type: 'Identifier', name: 'safe' },
            { type: 'Identifier', name: '__runtime' }
          ]
        }
      }
    ]
  };

  assert.throws(function() {
    harness.eval_module.checkForbiddenPattern(
      pattern,
      new Set(['__runtime']),
      harness.jsl.inter.lang
    );
  }, function(err) {
    return err && err.name === 'JslabError' && String(err.message).includes('__runtime');
  });
}, { tags: ['unit', 'eval'] });

tests.add('transformPatternToContext maps identifiers to jsl.context members', function(assert) {
  var harness = createEvalHarness({ runtime_identifier: '__runtime' });
  var b = recast.types.builders;
  var out = harness.eval_module.transformPatternToContext(
    { type: 'Identifier', name: 'alpha' },
    b,
    '__runtime'
  );

  assert.equal(out.type, 'MemberExpression');
  assert.equal(out.object.type, 'MemberExpression');
  assert.equal(out.object.object.name, '__runtime');
  assert.equal(out.object.property.name, 'context');
  assert.equal(out.property.name, 'alpha');
}, { tags: ['unit', 'eval'] });

tests.add('rewriteMemberExpressionRoot rewrites only the root identifier', function(assert) {
  var harness = createEvalHarness();
  var ast = recast.parse('obj.deep.value = 1;');
  var left = ast.program.body[0].expression.left;

  harness.eval_module.rewriteMemberExpressionRoot(left, function(identifier) {
    return { type: 'Identifier', name: 'ctx_' + identifier.name };
  });

  assert.equal(left.object.object.name, 'ctx_obj');
  assert.equal(left.property.name, 'value');
}, { tags: ['unit', 'eval'] });

tests.add('getFunctionBody extracts function body text', function(assert) {
  var harness = createEvalHarness();

  function sampleFunction() {
    const x = 4;
    return x + 2;
  }

  var body = harness.eval_module.getFunctionBody(sampleFunction);
  assert.ok(typeof body === 'string' && body.includes('return x + 2;'));
  assert.equal(harness.eval_module.getFunctionBody(42), undefined);
}, { tags: ['unit', 'eval'] });

tests.add('rewriteCode rewrites top-level declarations into runtime context', function(assert) {
  var harness = createEvalHarness();
  var out = harness.eval_module.rewriteCode('var alpha = 5; alpha;');

  assert.ok(out && typeof out.code === 'string');
  assert.ok(out.code.startsWith('(async () => {'));
  assert.ok(/jsl\.context\.alpha\s*=\s*5/.test(out.code));
  assert.ok(/return\s+alpha/.test(out.code));
}, { tags: ['unit', 'eval'] });

tests.add('rewriteCode rewrites top-level import into require assignments', function(assert) {
  var harness = createEvalHarness();
  var out = harness.eval_module.rewriteCode('import { join } from "path"; join("a", "b");');

  assert.ok(out && typeof out.code === 'string');
  assert.ok(/jsl\.context\.join\s*=/.test(out.code));
  assert.ok(/require\((['"])path\1\)\.join/.test(out.code));
}, { tags: ['unit', 'eval'] });

tests.add('rewriteCode rejects declarations of the runtime identifier', function(assert) {
  var harness = createEvalHarness({ runtime_identifier: '__runtime' });
  assert.throws(function() {
    harness.eval_module.rewriteCode('let __runtime = 1;');
  }, function(err) {
    return err && err.name === 'JslabError' && String(err.message).includes('__runtime');
  });
}, { tags: ['unit', 'eval'] });

tests.add('onEvalError forwards JslabError messages directly', function(assert) {
  var harness = createEvalHarness();
  harness.eval_module.onEvalError({ name: 'JslabError', message: 'custom error text' });
  assert.ok(harness.env_errors.some(function(message) {
    return String(message).includes('custom error text');
  }));
}, { tags: ['unit', 'eval'] });

tests.add('getOriginalPosition uses source-map consumer and restores guard flag', async function(assert) {
  var harness = createEvalHarness();
  harness.jsl.inter.override.withoutCheckStop = false;
  var result = await harness.eval_module.getOriginalPosition({}, 12, 8);

  assert.equal(harness.jsl.inter.override.withoutCheckStop, false);
  assert.equal(result.line, 11);
  assert.equal(result.column, 7);
}, { tags: ['unit', 'eval'] });

tests.add('runScript executes selected line and restores previous script context', async function(assert) {
  var harness = createEvalHarness();
  harness.jsl.current_script = 'prev-script.jsl';
  harness.jsl.jsl_file_name = 'prev-script.jsl';
  harness.jsl.inter.env.readFileSync = function() {
    return 'first line\nsecond line\nthird line';
  };
  var executed_code = '';
  harness.eval_module.evalString = async function(code) {
    executed_code = code;
    return code;
  };

  var result = await harness.eval_module.runScript('C:/tmp/example.jsl', 2);
  assert.equal(result, 'second line');
  assert.equal(executed_code, 'second line');
  assert.equal(harness.jsl.current_script, 'prev-script.jsl');
  assert.equal(harness.jsl.jsl_file_name, 'prev-script.jsl');
}, { tags: ['unit', 'eval'] });

tests.add('runScript reports invalid line ranges and returns false', async function(assert) {
  var harness = createEvalHarness();
  harness.jsl.inter.env.readFileSync = function() {
    return 'line1\nline2';
  };

  var result = await harness.eval_module.runScript('C:/tmp/example.jsl', [2, 5]);
  assert.equal(result, false);
  assert.ok(harness.env_errors.length > 0);
}, { tags: ['unit', 'eval'] });

exports.MODULE_TESTS = tests;
