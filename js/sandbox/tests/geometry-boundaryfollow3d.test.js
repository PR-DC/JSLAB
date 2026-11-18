/**
 * @file JSLAB geometry boundary-follow 3D tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for geometry boundaryfollow3d test fixtures.
 */
class PRDC_JSLAB_SANDBOX_TESTS_GEOMETRY_BOUNDARYFOLLOW3D_TEST_HELPER {

  /**
   * Creates language harness.
   */
  static createLanguageHarness() {
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
}


const { PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D } = require('../geometry-boundaryfollow3d');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


tests.add('constructor validates bbox and normalizes 3D bounds', function(assert) {
  var jsl = PRDC_JSLAB_SANDBOX_TESTS_GEOMETRY_BOUNDARYFOLLOW3D_TEST_HELPER.createLanguageHarness();

  assert.throws(function() {
    return new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D(jsl, function() {
      return true;
    }, null);
  }, function(err) {
    return String(err.message).includes('LANG_274');
  });

  assert.throws(function() {
    return new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D(jsl, function() {
      return true;
    }, {
      bbox: { xmin: 0, xmax: 1, ymin: 0, ymax: 1, zmin: 0, zmax: Infinity }
    });
  }, function(err) {
    return String(err.message).includes('LANG_275');
  });

  var follower = new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D(jsl, function() {
    return true;
  }, {
    bbox: { xmin: 2, xmax: -2, ymin: 4, ymax: -4, zmin: 6, zmax: -6 }
  });
  assert.deepEqual(follower._bbox, {
    xmin: -2, xmax: 2,
    ymin: -4, ymax: 4,
    zmin: -6, zmax: 6
  });
}, { tags: ['unit', 'geometry-boundaryfollow3d'] });

tests.add('feasible cache avoids duplicate evaluations and honors maxEval', function(assert) {
  var calls = 0;
  var follower = new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D(
    PRDC_JSLAB_SANDBOX_TESTS_GEOMETRY_BOUNDARYFOLLOW3D_TEST_HELPER.createLanguageHarness(),
    function(x, y, z) {
      calls += 1;
      return x + y + z > 0;
    },
    {
      bbox: { xmin: -1, xmax: 1, ymin: -1, ymax: 1, zmin: -1, zmax: 1 },
      logMode: 'unique',
      maxEval: 5
    }
  );

  assert.equal(follower._feasibleXYZ(1, 1, 1), true);
  assert.equal(follower._feasibleXYZ(1, 1, 1), true);
  assert.equal(calls, 1);
  assert.equal(follower.N[0].length, 1);

  follower.opts.logMode = 'all';
  follower._feasibleXYZ(1, 1, 1);
  assert.equal(calls, 1);
  assert.equal(follower.N[0].length, 2);

  var limited = new PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D(
    PRDC_JSLAB_SANDBOX_TESTS_GEOMETRY_BOUNDARYFOLLOW3D_TEST_HELPER.createLanguageHarness(),
    function() {
      return true;
    },
    {
      bbox: { xmin: 0, xmax: 1, ymin: 0, ymax: 1, zmin: 0, zmax: 1 },
      maxEval: 0
    }
  );

  assert.throws(function() {
    limited._feasibleXYZ(0, 0, 0);
  }, function(err) {
    return String(err.message).includes('LANG_276');
  });
}, { tags: ['unit', 'geometry-boundaryfollow3d'] });

exports.MODULE_TESTS = tests;
