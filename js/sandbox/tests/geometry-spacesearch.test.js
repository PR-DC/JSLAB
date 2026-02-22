/**
 * @file JSLAB geometry space-search tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_GEOMETRY_SPACE_SEARCH } = require('../geometry-spacesearch');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function getValueAt(arr, indices) {
  return indices.reduce(function(current, index) {
    return current[index];
  }, arr);
}

function createSpaceSearchHarness() {
  var messages = [];
  var jsl = {
    inter: {
      disp: function(message) {
        messages.push(message);
      },
      array: {
        getValueAt: getValueAt
      }
    }
  };
  return {
    search: new PRDC_JSLAB_GEOMETRY_SPACE_SEARCH(jsl),
    messages: messages
  };
}

tests.add('splitSearchSpace divides first dimension and scales k for each worker', function(assert) {
  var harness = createSpaceSearchHarness();
  var split = harness.search.splitSearchSpace(
    [[0, 8], [10, 14]],
    [[8, 4], [1, 1]],
    4
  );
  var spaces = split[0];
  var k_out = split[1];

  assert.equal(spaces.length, 4);
  assert.deepEqual(spaces[0], [[0, 2], [10, 14]]);
  assert.deepEqual(spaces[3], [[6, 8], [10, 14]]);
  assert.equal(k_out[0][0], 2);
}, { tags: ['unit', 'geometry-spacesearch'] });

tests.add('corner and index helpers return expected multidimensional coordinates', function(assert) {
  var harness = createSpaceSearchHarness();
  assert.equal(harness.search.generateCornerShifts(3).length, 8);
  assert.deepEqual(
    harness.search.getCornerIndices([3, 4]),
    [[0, 0], [2, 0], [0, 3], [2, 3]]
  );

  var nf = [
    [1, 0],
    [0, 1]
  ];
  assert.deepEqual(harness.search.generateIndicesList([2, 2], nf), [[0, 0], [1, 1]]);
  assert.deepEqual(harness.search.getCubeCorners([[1, 2], [3, 4]], [0, 0]), [1, 3, 2, 4]);
}, { tags: ['unit', 'geometry-spacesearch'] });

tests.add('dispElementSize reports initial and minimum element dimensions', function(assert) {
  var harness = createSpaceSearchHarness();
  harness.search.dispElementSize(
    [[0, 10], [0, 4]],
    [[2, 2], [5, 2]]
  );
  assert.equal(harness.messages.length, 2);
  assert.ok(harness.messages[0].includes('5.00x2.00'));
  assert.ok(harness.messages[1].includes('1.00x1.00'));
}, { tags: ['unit', 'geometry-spacesearch'] });

exports.MODULE_TESTS = tests;

