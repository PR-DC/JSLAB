/**
 * @file JSLAB FreeCAD link tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_FREECAD_LINK } = require('../freecad-link');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createFreecadHarness() {
  var calls = {
    disp: [],
    env_disp: []
  };
  var jsl = {
    inter: {
      disp: function(message) {
        calls.disp.push(message);
      },
      env: {
        disp: function(message) {
          calls.env_disp.push(message);
        }
      },
      lang: {
        string: function(id) {
          return 'LANG_' + id;
        }
      },
      exist: function() {
        return true;
      }
    }
  };
  var link = new PRDC_JSLAB_FREECAD_LINK(jsl);
  return { link, calls };
}

tests.add('inputParser and showMessage parse protocol tags and report messages', function(assert) {
  var harness = createFreecadHarness();
  var err = harness.link.inputParser('ERR|boom');
  assert.deepEqual(err, ['ERR', 'boom']);
  assert.ok(harness.calls.disp[0].includes('LANG_356'));

  harness.link.showMessage('MSG|hello');
  assert.ok(harness.calls.env_disp[0].includes('LANG_357'));
}, { tags: ['unit', 'freecad-link'] });

tests.add('commands short-circuit with LANG_182 while link is not loaded', async function(assert) {
  var harness = createFreecadHarness();
  var open_out = await harness.link.open('model.fcstd', 1000);
  var quit_out = await harness.link.quit();
  assert.equal(open_out, false);
  assert.equal(quit_out, false);
  assert.ok(harness.calls.env_disp.some(function(msg) {
    return String(msg).includes('LANG_182');
  }));
}, { tags: ['unit', 'freecad-link'] });

exports.MODULE_TESTS = tests;

