/**
 * @file JSLAB test
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Expect tic to be equal to last tic', function() {
    return tic == jsl.context.last_tic;
  }
);

tests.add('Joining two paths with path separator', function() {
    return 'a'+pathSep()+'b' == jsl.env.pathJoin('a', 'b');
  }
);
    
exports.MODULE_TESTS = tests;