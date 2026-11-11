/**
 * @file JSLAB spreadsheet link tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_EXCEL_LINK } = require('../excel-link');
const { PRDC_JSLAB_CALC_LINK } = require('../calc-link');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { EventEmitter } = require('events');
const { PassThrough, Writable } = require('stream');
var tests = new PRDC_JSLAB_TESTS();

function createLink(LinkClass) {
  var cleanup;
  var link = new LinkClass({
    app_path: process.cwd(),
    addForCleanup: function(owner, callback) { cleanup = callback; },
    inter: { env: { platform: 'win32' } }
  });
  var calls = [];
  link.active = true;
  link.opened = true;
  link.sheet_count = 3;
  link._request = async function(method, args) {
    calls.push({ method: method, args: args || [] });
    if(method == 'newDocument') return { sheet_count: 3 };
    if(method == 'addSheet') return { sheet: 4, sheet_count: 4 };
    if(method == 'removeSheet') return { sheet_count: 2 };
    if(method == 'read') return { Value: 12, Formula: '=6+6' };
    return true;
  };
  return { link: link, calls: calls, cleanup: cleanup };
}

tests.add('ExcelLink exposes corrected Excel enumerations', function(assert) {
  var link = createLink(PRDC_JSLAB_EXCEL_LINK).link;
  assert.equal(link.XlBordersIndex.InsideHorizontal, 12);
  assert.equal(link.XlBordersIndex.InsideVertical, 11);
  assert.equal(link.XlBorderWeight.Medium, -4138);
  assert.equal(link.XlHAlign.Center, -4108);
  assert.equal(Object.isFrozen(link.XlLineStyle), true);
}, { tags: ['unit', 'spreadsheet-links', 'excel-link'] });

tests.add('CalcLink exposes LibreOffice formatting enumerations', function(assert) {
  var link = createLink(PRDC_JSLAB_CALC_LINK).link;
  assert.equal(link.FontWeight.BOLD, 150);
  assert.equal(link.FontSlant.ITALIC, 2);
  assert.equal(link.CellHoriJustify.REPEAT, 5);
  assert.equal(link.CellVertJustify.BOTTOM, 3);
  assert.equal(link.CellOrientation.STACKED, 3);
}, { tags: ['unit', 'spreadsheet-links', 'calc-link'] });

tests.add('common spreadsheet operations validate and normalize arguments', async function(assert) {
  var harness = createLink(PRDC_JSLAB_EXCEL_LINK);
  await harness.link.write(1, [1, 2], [3, 4], 'same');
  assert.deepEqual(harness.calls[0], {
    method: 'write', args: [1, [1, 2], [3, 4], ['same', 'same']]
  });
  var value = await harness.link.read(1, 1, 2);
  assert.equal(value.Value, 12);
  await harness.link.setColumnWidth(1, [1, 2], [8, 12]);
  assert.equal(harness.calls[2].method, 'setColumnWidth');
  await assert.rejects(harness.link.write(1, [1, 2], [1], [1, 2]),
    /same number of values/);
  await assert.rejects(harness.link.setRowHeight(1, [1, 2], [10]),
    /same number of values/);
  await assert.rejects(harness.link.read(4, 1, 1), /does not exist/);
}, { tags: ['unit', 'spreadsheet-links'] });

tests.add('Excel formatting accepts enum names and validates borders', async function(assert) {
  var harness = createLink(PRDC_JSLAB_EXCEL_LINK);
  await harness.link.format(1, 2, 3, {
    CharBold: 'yes',
    CharColor: [10, 20, 30],
    HorizontalAlignment: 'Center',
    Borders: ['Thin', [1, 2, 3], 'Continuous']
  });
  var options = harness.calls[0].args[3];
  assert.equal(options.CharBold, true);
  assert.equal(options.HorizontalAlignment, -4108);
  assert.deepEqual(options.Borders, [2, [1, 2, 3], 1]);
  assert.deepEqual(harness.link._formatOptions({ Borders: [null, null, null] }).Borders,
    [2, [0, 0, 0], 1]);
  await assert.rejects(harness.link.format(1, 1, 1, { CharColor: [1, 2, 300] }),
    /RGB array/);
  await assert.rejects(harness.link.format(1, 1, 1, { Unknown: true }),
    /Unknown formatting option/);
}, { tags: ['unit', 'spreadsheet-links', 'excel-link'] });

tests.add('Calc formatting resolves its enums and normalizes borders', async function(assert) {
  var harness = createLink(PRDC_JSLAB_CALC_LINK);
  await harness.link.format(1, [1, 2], [1, 2], {
    CharWeight: 'BOLD',
    CharPosture: 'italic',
    HoriJustify: 'CENTER',
    VertJustify: 'BOTTOM',
    Orientation: 'STACKED',
    BottomBorder: [0.5, 255, 0, 10]
  });
  var options = harness.calls[0].args[3];
  assert.equal(options.CharWeight, 150);
  assert.equal(options.CharPosture, 2);
  assert.equal(options.HoriJustify, 2);
  assert.deepEqual(options.BottomBorder, [0.5, 255, 0, 10]);
  assert.deepEqual(harness.link._formatOptions({ Borders: [0, 0, 0, 0] }).Borders,
    [0, 0, 0, 0]);
  await assert.rejects(harness.link.format(1, 1, 1, { Orientation: 'SIDEWAYS' }),
    /enumeration value/);
}, { tags: ['unit', 'spreadsheet-links', 'calc-link'] });

tests.add('document state follows successful spreadsheet operations', async function(assert) {
  var harness = createLink(PRDC_JSLAB_CALC_LINK);
  harness.link.opened = false;
  assert.equal(await harness.link.new(), 3);
  assert.equal(harness.link.opened, true);
  assert.equal(harness.link.sheet_count, 3);
  assert.equal(await harness.link.addSheet('Data'), 4);
  assert.equal(harness.link.sheet_count, 4);
  await harness.link.removeSheet(2);
  assert.equal(harness.link.sheet_count, 2);
  await harness.link.close(false);
  assert.equal(harness.link.opened, false);
  harness.link.opened = true;
  await assert.rejects(harness.link.new(), /already open/);
}, { tags: ['unit', 'spreadsheet-links'] });

tests.add('persistent host transport sends and resolves newline-delimited requests', async function(assert) {
  var requests = [];
  var host = new EventEmitter();
  host.stdout = new PassThrough();
  host.stderr = new PassThrough();
  host.exitCode = null;
  host.kill = function() { host.exitCode = 0; };
  host.stdin = new Writable({
    write: function(chunk, encoding, callback) {
      var request = JSON.parse(chunk.toString().trim());
      requests.push(request);
      process.nextTick(function() {
        host.stdout.write(JSON.stringify({ id: request.id, ok: true, result: true })+'\n');
      });
      callback();
    }
  });
  var link = new PRDC_JSLAB_EXCEL_LINK({
    app_path: process.cwd(),
    addForCleanup: function() {},
    inter: { env: {
      platform: 'win32',
      spawn: function(command, args, options) {
        assert.equal(command, 'cscript.exe');
        assert.equal(args[0], '//Nologo');
        assert.equal(options.windowsHide, true);
        return host;
      }
    } }
  });
  assert.equal(await link.start(false), true);
  assert.equal(requests[0].method, 'start');
  assert.deepEqual(requests[0].args, [false]);
  assert.equal(link.visible_state, false);
  await link.visible(true);
  assert.equal(requests[1].method, 'visible');
  await link._disposeHost();
}, { tags: ['unit', 'spreadsheet-links', 'transport'] });

tests.add('failed quit keeps the link available for recovery', async function(assert) {
  var harness = createLink(PRDC_JSLAB_EXCEL_LINK);
  harness.link._request = async function() { throw Error('saveAs required'); };
  await assert.rejects(harness.link.quit(true), /saveAs required/);
  assert.equal(harness.link.active, true);
  assert.equal(harness.link.opened, true);
}, { tags: ['unit', 'spreadsheet-links', 'lifecycle'] });

exports.MODULE_TESTS = tests;
