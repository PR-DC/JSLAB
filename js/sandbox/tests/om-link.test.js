/**
 * @file JSLAB OpenModelica link tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function loadOmLinkClass() {
  var source = fs.readFileSync(path.join(__dirname, '..', 'om-link.js'), 'utf8');
  var context = {
    module: { exports: {} },
    exports: null,
    require: function(module_path) {
      if(module_path === 'zeromq') return {};
      if(module_path === 'fs') return require('fs');
      if(module_path === 'path') return require('path');
      if(module_path === 'os') return require('os');
      if(module_path === 'child_process') {
        return { exec: function() {}, execSync: function() {} };
      }
      if(module_path === 'fast-xml-parser') {
        return {
          XMLParser: class {
            parse() {
              return {};
            }
          }
        };
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };
  context.exports = context.module.exports;
  context.global = context;
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'om-link.js' });
  return context.module.exports.PRDC_JSLAB_OPENMODELICA_LINK;
}

function createOmLinkHarness() {
  var PRDC_JSLAB_OPENMODELICA_LINK = loadOmLinkClass();
  var errors = [];
  var jsl = {
    inter: {
      env: {
        error: function(message) {
          errors.push(message);
        }
      },
      lang: {
        string: function(id) {
          return 'LANG_' + id;
        }
      }
    }
  };

  var om = new PRDC_JSLAB_OPENMODELICA_LINK(jsl);
  om.parameter_list = { a: '1', b: '2' };
  om.simulation_options = { startTime: '0', stopTime: '1' };
  om.linear_options = { startTime: '0', stopTime: '1' };
  om.input_list = { u: '0' };
  om.override_variables = {};
  om.sim_opt_override = {};
  om.mapped_names = {};
  om.continuous_list = {};
  om.output_list = {};
  return { om, errors };
}

tests.add('createValidNames maps unsafe identifiers into categorized lists', function(assert) {
  var harness = createOmLinkHarness();
  harness.om.createValidNames('speed.rad/s', '12', 'continuous');
  harness.om.createValidNames('mass.value', '5', 'parameter');

  assert.equal(harness.om.mapped_names.speed_rad_s, 'speed.rad/s');
  assert.equal(harness.om.continuous_list.speed_rad_s, '12');
  assert.equal(harness.om.parameter_list.mass_value, '5');
}, { tags: ['unit', 'om-link'] });

tests.add('parseExpression handles lists, nested lists, records and fail case', function(assert) {
  var harness = createOmLinkHarness();
  harness.om.sendExpression = function() {
    return 'ERROR_TEXT';
  };

  assert.deepEqual(harness.om.parseExpression('{a,b,"c"}'), ['a', 'b', 'c']);
  assert.deepEqual(harness.om.parseExpression('{{1,2},{3,4}}'), [['1', '2'], ['3', '4']]);
  assert.deepEqual(
    harness.om.parseExpression('record R a=1, b="x" end R;'),
    { a: '1', b: 'x' }
  );
  assert.equal(harness.om.parseExpression('fail()'), 'ERROR_TEXT');
  assert.equal(harness.om.parseExpression('"single"'), 'single');
}, { tags: ['unit', 'om-link'] });

tests.add('getters and setters update options and report invalid keys', function(assert) {
  var harness = createOmLinkHarness();

  harness.om.setParameters(['a=10', 'unknown=3']);
  assert.equal(harness.om.parameter_list.a, '10');
  assert.equal(harness.om.override_variables.a, '10');

  harness.om.setSimulationOptions(['startTime=5', 'badOpt=0']);
  assert.equal(harness.om.simulation_options.startTime, '5');
  assert.equal(harness.om.sim_opt_override.startTime, '5');

  harness.om.setLinearizationOptions('stopTime=4');
  assert.equal(harness.om.linear_options.stopTime, '4');

  harness.om.setInputs(['u=7', 'v=8']);
  assert.equal(harness.om.input_list.u, '7');
  assert.equal(harness.om.input_flag, true);

  var params = harness.om.getParameters(['a', 'b']);
  var sim_opt = harness.om.getSimulationOptions('startTime');
  var inputs = harness.om.getInputs('u');
  assert.deepEqual(params, { a: '10', b: '2' });
  assert.equal(sim_opt, '5');
  assert.equal(inputs, '7');

  assert.ok(harness.errors.length >= 3);
}, { tags: ['unit', 'om-link'] });

exports.MODULE_TESTS = tests;
