/**
 * @file JSLAB shared tester core tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_TESTER } = require('./tester');
const { PRDC_JSLAB_TESTS } = require('./tester');
var tests = new PRDC_JSLAB_TESTS();

function makeFixture(prefix, files) {
  var dir = path.join(
    process.cwd(),
    'temp',
    prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000)
  );
  fs.mkdirSync(dir, { recursive: true });
  Object.keys(files).forEach(function(file_name) {
    fs.writeFileSync(path.join(dir, file_name), files[file_name], 'utf8');
  });
  return dir;
}

function toTesterFolder(abs_dir) {
  return path.relative(path.join(process.cwd(), 'js'), abs_dir);
}

tests.add('tester applies process arguments and filters listed tests', async function(assert) {
  var fixture_dir = makeFixture('tester-filter', {
    'mod-a.test.js': `
      exports.MODULE_TESTS = [
        {
          name: 'alpha core test',
          tags: ['core'],
          fun: function(assert) { assert.ok(true); }
        },
        {
          name: 'beta slow test',
          tags: ['slow'],
          fun: function(assert) { assert.ok(true); }
        }
      ];
    `
  });
  var old_args = global.process_arguments;

  try {
    global.process_arguments = [
      'node',
      '--test-list',
      '--test-tag=core',
      '--test-skip-tag=slow',
      '--test-name=alpha',
      '--test-module=mod-a',
      '--test-timeout=123',
      '--test-recursive=false',
      '--test-report-history=false'
    ];

    var tester = new PRDC_JSLAB_TESTER(toTesterFolder(fixture_dir), { write_report: false });
    assert.equal(tester.options.list_only, true);
    assert.deepEqual(tester.options.include_tags, ['core']);
    assert.deepEqual(tester.options.exclude_tags, ['slow']);
    assert.equal(tester.options.name_filter, 'alpha');
    assert.equal(tester.options.module_filter.includes('mod-a'), true);
    assert.equal(tester.options.default_timeout_ms, 123);
    assert.equal(tester.options.recursive, false);
    assert.equal(tester.options.write_report_history, false);

    var summary = await tester.runTests();
    assert.equal(summary.listed_only, true);
    assert.equal(summary.total, 1);
  } finally {
    global.process_arguments = old_args;
    fs.rmSync(fixture_dir, { recursive: true, force: true });
  }
}, { tags: ['unit', 'shared', 'tester'] });

tests.add('tester run summary includes pass/fail/skip counts and report files', async function(assert) {
  var fixture_dir = makeFixture('tester-summary', {
    'mod-outcome.test.js': `
      exports.MODULE_TESTS = [
        {
          name: 'passing test',
          tags: ['a'],
          fun: function(assert) { assert.ok(true); }
        },
        {
          name: 'failing test',
          tags: ['b'],
          fun: function() { throw new Error('intentional fail'); }
        },
        {
          name: 'skipped test',
          tags: ['c'],
          skip: true,
          skip_reason: 'not now',
          fun: function(assert) { assert.ok(true); }
        }
      ];
    `
  });
  var old_args = global.process_arguments;
  var report_latest = '';
  var report_history = '';

  try {
    global.process_arguments = ['node'];
    var tester = new PRDC_JSLAB_TESTER(toTesterFolder(fixture_dir));
    var summary = await tester.runTests();

    assert.equal(summary.total, 3);
    assert.equal(summary.passed, 1);
    assert.equal(summary.failed, 1);
    assert.equal(summary.skipped, 1);
    assert.equal(typeof summary.report_latest, 'string');
    assert.equal(typeof summary.report_history, 'string');
    assert.equal(fs.existsSync(summary.report_latest), true);
    assert.equal(fs.existsSync(summary.report_history), true);

    report_latest = summary.report_latest;
    report_history = summary.report_history;

    var report = JSON.parse(fs.readFileSync(summary.report_latest, 'utf8'));
    assert.equal(report.summary.failed, 1);
    assert.equal(report.tests.length, 3);
  } finally {
    global.process_arguments = old_args;
    fs.rmSync(fixture_dir, { recursive: true, force: true });
    if(report_latest) {
      try { fs.rmSync(report_latest, { force: true }); } catch(err) {}
    }
    if(report_history) {
      try { fs.rmSync(report_history, { force: true }); } catch(err) {}
    }
  }
}, { tags: ['unit', 'shared', 'tester'] });

tests.add('tester can disable timestamped history reports while keeping stable latest file', async function(assert) {
  var fixture_dir = makeFixture('tester-no-history', {
    'single.test.js': `
      exports.MODULE_TESTS = [
        {
          name: 'single pass',
          fun: function(assert) { assert.ok(true); }
        }
      ];
    `
  });
  var old_args = global.process_arguments;
  var report_rel = path.join(
    'temp',
    'tester-no-history-report-' + Date.now() + '-' + Math.floor(Math.random() * 10000)
  );
  var report_abs = path.resolve(process.cwd(), report_rel);

  try {
    global.process_arguments = [
      'node',
      '--test-report-history=false',
      '--test-report-dir=' + report_rel
    ];

    var tester = new PRDC_JSLAB_TESTER(toTesterFolder(fixture_dir));
    var summary = await tester.runTests();

    assert.equal(summary.total, 1);
    assert.equal(summary.passed, 1);
    assert.equal(typeof summary.report_latest, 'string');
    assert.equal(typeof summary.report_history, 'undefined');
    assert.equal(path.dirname(summary.report_latest), report_abs);

    var files = fs.readdirSync(report_abs).filter(function(name) {
      return name.startsWith('test-report-');
    });
    assert.equal(files.length, 1);
    assert.equal(files[0].endsWith('.json'), true);
  } finally {
    global.process_arguments = old_args;
    fs.rmSync(fixture_dir, { recursive: true, force: true });
    fs.rmSync(report_abs, { recursive: true, force: true });
  }
}, { tags: ['unit', 'shared', 'tester'] });

tests.add('tester defaults to stable report mode when --test-app is present', function(assert) {
  var fixture_dir = makeFixture('tester-test-app-defaults', {
    'single.test.js': `
      exports.MODULE_TESTS = [
        { name: 'single pass', fun: function(assert) { assert.ok(true); } }
      ];
    `
  });
  var old_args = global.process_arguments;

  try {
    global.process_arguments = ['electron', '--test-app'];
    var tester = new PRDC_JSLAB_TESTER(toTesterFolder(fixture_dir));
    assert.equal(tester.options.write_report, true);
    assert.equal(tester.options.write_report_history, false);
    assert.equal(tester.options.report_dir, path.join(process.cwd(), 'temp'));
  } finally {
    global.process_arguments = old_args;
    fs.rmSync(fixture_dir, { recursive: true, force: true });
  }
}, { tags: ['unit', 'shared', 'tester'] });

tests.add('tester defaults to stable report mode when --auto-test-app is present', function(assert) {
  var fixture_dir = makeFixture('tester-auto-test-app-defaults', {
    'single.test.js': `
      exports.MODULE_TESTS = [
        { name: 'single pass', fun: function(assert) { assert.ok(true); } }
      ];
    `
  });
  var old_args = global.process_arguments;

  try {
    global.process_arguments = ['electron', '--auto-test-app'];
    var tester = new PRDC_JSLAB_TESTER(toTesterFolder(fixture_dir));
    assert.equal(tester.options.write_report, true);
    assert.equal(tester.options.write_report_history, false);
    assert.equal(tester.options.report_dir, path.join(process.cwd(), 'temp'));
  } finally {
    global.process_arguments = old_args;
    fs.rmSync(fixture_dir, { recursive: true, force: true });
  }
}, { tags: ['unit', 'shared', 'tester'] });

tests.add('tester records module load errors while continuing with valid modules', async function(assert) {
  var fixture_dir = makeFixture('tester-load-error', {
    'good.test.js': `
      exports.MODULE_TESTS = [
        { name: 'good', fun: function(assert) { assert.ok(true); } }
      ];
    `,
    'bad.test.js': `exports.MODULE_TESTS = [ { name: 'bad', fun: function() { ; } ];`
  });
  var old_args = global.process_arguments;
  var report_latest = '';
  var report_history = '';

  try {
    global.process_arguments = ['node'];
    var tester = new PRDC_JSLAB_TESTER(toTesterFolder(fixture_dir));
    var summary = await tester.runTests();

    assert.equal(summary.total, 1);
    assert.equal(summary.passed, 1);
    assert.equal(summary.failed, 0);
    assert.equal(typeof summary.report_latest, 'string');

    report_latest = summary.report_latest;
    report_history = summary.report_history;

    var report = JSON.parse(fs.readFileSync(summary.report_latest, 'utf8'));
    assert.equal(Array.isArray(report.module_load_errors), true);
    assert.equal(report.module_load_errors.length, 1);
    assert.equal(String(report.module_load_errors[0].module).includes('bad.test.js'), true);
  } finally {
    global.process_arguments = old_args;
    fs.rmSync(fixture_dir, { recursive: true, force: true });
    if(report_latest) {
      try { fs.rmSync(report_latest, { force: true }); } catch(err) {}
    }
    if(report_history) {
      try { fs.rmSync(report_history, { force: true }); } catch(err) {}
    }
  }
}, { tags: ['unit', 'shared', 'tester'] });

exports.MODULE_TESTS = tests;
