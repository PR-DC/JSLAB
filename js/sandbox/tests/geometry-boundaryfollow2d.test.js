/**
 * @file JSLAB geometry boundary-follow 2D tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D } = require('../geometry-boundaryfollow2d');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createLanguageHarness() {
  return {
    inter: {
      lang: {
        string: function(id) {
          return 'LANG_' + id;
        }
      }
    }
  };
}

tests.add('constructor validates bbox and normalizes coordinate limits', function(assert) {
  var jsl = createLanguageHarness();

  assert.throws(function() {
    return new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D(jsl, function() { return true; }, null);
  }, function(err) {
    return String(err.message).includes('LANG_274');
  });

  assert.throws(function() {
    return new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D(jsl, function() { return true; }, {
      bbox: { xmin: 0, xmax: 1, ymin: 0, ymax: NaN }
    });
  }, function(err) {
    return String(err.message).includes('LANG_284');
  });

  var follower = new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D(jsl, function() { return true; }, {
    bbox: { xmin: 4, xmax: -2, ymin: 7, ymax: -3 }
  });
  assert.deepEqual(follower._bbox, { xmin: -2, xmax: 4, ymin: -3, ymax: 7 });
}, { tags: ['unit', 'geometry-boundaryfollow2d'] });

tests.add('feasibility cache logs evaluations and resetLogs supports keepCache', function(assert) {
  var calls = 0;
  var follower = new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D(
    createLanguageHarness(),
    function(x, y) {
      calls += 1;
      return x + y > 0;
    },
    {
      bbox: { xmin: -1, xmax: 1, ymin: -1, ymax: 1 },
      logMode: 'all',
      maxEval: 20
    }
  );

  assert.equal(follower._feasibleXY(1, 1), true);
  assert.equal(follower._feasibleXY(1, 1), true);
  assert.equal(calls, 1);
  assert.equal(follower.N[0].length, 2);

  follower.resetLogs(true);
  assert.equal(follower.evalCount, 0);
  assert.equal(follower._cache.size, 1);

  follower._feasibleXY(1, 1);
  assert.equal(calls, 1);
  assert.equal(follower.N[0].length, 1);

  follower.resetLogs(false);
  assert.equal(follower._cache.size, 0);
}, { tags: ['unit', 'geometry-boundaryfollow2d'] });

exports.MODULE_TESTS = tests;

