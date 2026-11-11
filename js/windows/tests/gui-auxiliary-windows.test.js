/**
 * @file Figure menu and serial-terminal renderer controls
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest } = require('../../dev/gui-test-utils');
const { root } = require('../../dev/gui-test-fixture');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

/**
 * Connects the real figure controller to its fixture window.
 * @param {Object} f Fixture.
 * @returns {Promise<Object>} Figure instance.
 */
async function figure(f) {
  var { PRDC_JSLAB_FIGURE } = f.load(path.join(root, 'js/sandbox/figures.js'), ['PRDC_JSLAB_FIGURE']);
  var jsl = { inter: {
    windows: { openWindow: () => 1, open_windows: { 1: { ready: Promise.resolve(), context: f.window } } },
    figures: { open_figures: {}, saveFigureDialog: id => f.calls.push(['figure', 'save', id]) },
    plotter: { updatePlotLayout: id => f.calls.push(['figure', 'reset', id]) }
  } };
  f.figure_runtime = jsl;
  var result = new PRDC_JSLAB_FIGURE(jsl, 1); jsl.inter.figures.open_figures[1] = result; await result.init();
  result.plot = { fid: 1 }; return result;
}

for(const [selector, attr, value] of [
  ['#zoom-menu', 'dragmode', 'zoom'], ['#zoom-in-menu', 'zoom', 'in'],
  ['#zoom-out-menu', 'zoom', 'out'], ['#pan-menu', 'dragmode', 'pan'],
  ['#rotate-menu', 'dragmode', 'orbit'], ['#fit-menu', 'zoom', 'auto'],
  ['#pan-menu-3d', 'scene.dragmode', 'pan'], ['#rotate-menu-3d', 'scene.dragmode', 'orbit'],
  ['#fit-menu-3d', 'resetDefault', null]
]) {
  guiTest(tests, 'figure', 'figure ' + selector + ' forwards to the plotting control', [selector], async function(assert, f) {
    await figure(f); var clicked = 0;
    var target = f.document.createElement('button'); target.setAttribute('data-attr', attr);
    if(value) target.setAttribute('data-val', value);
    target.addEventListener('click', () => clicked++); f.query('#figure-content').appendChild(target);
    f.click(selector); assert.equal(clicked, 1);
  });
}
for(const [selector, action] of [['#save-as-menu', 'save'], ['#reset-menu', 'reset'], ['#reset-menu-3d', 'reset']]) {
  guiTest(tests, 'figure', 'figure ' + selector + ' requests ' + action, [selector], async function(assert, f) {
    await figure(f); f.click(selector); assert.deepEqual(f.calls.at(-1), ['figure', action, 1]);
  });
}
guiTest(tests, 'figure', 'figure menu opens, closes outside and supports hiding', ['#figure-menu-button'], async function(assert, f) {
  var controller = await figure(f); f.click('#figure-menu-button');
  assert.equal(f.query('#figure-menu-container').classList.contains('active'), true);
  f.document.body.click(); assert.equal(f.query('#figure-menu-container').classList.contains('active'), false);
  controller.hideMenu(); assert.equal(f.visible('#figure-menu-button'), false);
  controller.showMenu(); assert.equal(f.visible('#figure-menu-button'), true);
});

/**
 * Connects real serial-terminal UI wiring to an in-memory serial transport.
 * @param {Object} f Fixture.
 * @returns {Promise<Object>} Terminal controller.
 */
async function serial(f) {
  f.window.PRDC_TERMINAL_BUFFER = f.load(path.join(root, 'js/shared/terminal-buffer.js')).PRDC_TERMINAL_BUFFER;
  f.window.terminal = f.load(path.join(root, 'js/windows/terminal.js'), ['terminal']).terminal;
  f.window.setTitle = function() {}; f.window.setSize = function() {};
  var host = { ready: Promise.resolve(), context: f.window, addUI() {}, addScript() {}, _updateLanguage() {} };
  var jsl = { inter: {
    windows: { openWindow: () => 1, open_windows: { 1: host } },
    lang: f.window.language, time: { getDateTimeStr: () => 'test' },
    env: { showSaveDialog: async() => ({ filePath: 'serial.log' }),
      writeFileSync: (file, content) => f.files.set(file, content) }
  } };
  var { PRDC_JSLAB_LIB_SERIAL_DEVICE } = f.load(path.join(root, 'js/sandbox/serial-device.js'));
  var device = new PRDC_JSLAB_LIB_SERIAL_DEVICE(jsl);
  device.connectSerialPorts = () => ({ isOpen: true, on() {}, close() {},
    write: value => f.calls.push(['serial', value]) });
  await device.openSerialTerminal('TEST_PORT', 9600);
  return f.window.terminal;
}

for(const method of ['button', 'enter']) {
  guiTest(tests, 'serial_terminal', 'serial input sends via ' + method, ['#send-button', '#message-input'], async function(assert, f) {
    await serial(f); f.input('#message-input', 'outgoing');
    if(method === 'button') f.click('#send-button'); else f.key('#message-input', 'Enter');
    assert.deepEqual(f.calls.at(-1), ['serial', 'outgoing']);
    assert.equal(f.query('#message-input').value, '');
  });
}
for(const [selector, property] of [['#timestamp', 'show_timestamp'], ['#autoscroll', 'autoscroll']]) {
  guiTest(tests, 'serial_terminal', 'serial ' + selector + ' toggles its state', [selector], async function(assert, f) {
    var terminal = await serial(f), original = terminal[property];
    f.click(selector); assert.equal(terminal[property], !original);
    f.click(selector); assert.equal(terminal[property], original);
  });
}
for(const name of ['settings', 'log']) {
  guiTest(tests, 'serial_terminal', 'serial ' + name + ' opens and closes', ['#' + name, '#' + name + '-dialog .options-close'], async function(assert, f) {
    await serial(f); f.click('#' + name); assert.equal(f.visible('#' + name + '-dialog'), true);
    f.click('#' + name + '-dialog .options-close'); assert.equal(f.visible('#' + name + '-dialog'), false);
  });
  guiTest(tests, 'serial_terminal', 'serial ' + name + ' closes with Escape', [], async function(assert, f) {
    await serial(f); f.click('#' + name); f.key('#' + name + '-dialog', 'Escape');
    assert.equal(f.visible('#' + name + '-dialog'), false);
  });
}
guiTest(tests, 'serial_terminal', 'serial message limit applies the minimum', ['#N-messages-max', '#settings-dialog .change-settings'], async function(assert, f) {
  var terminal = await serial(f); f.click('#settings'); f.input('#N-messages-max', '1');
  f.click('#settings-dialog .change-settings'); assert.equal(terminal.N_messages_max, terminal.min_messages_max);
});
guiTest(tests, 'serial_terminal', 'serial log checkbox and export affect the saved log', ['#write-timestamps', '#save-log'], async function(assert, f) {
  var terminal = await serial(f); terminal.addMessage('', 'received');
  f.click('#log'); f.click('#write-timestamps'); assert.equal(terminal.write_timestamps, false);
  f.click('#save-log'); await f.tick(); assert.ok(f.files.get('serial.log').includes('received'));
});
guiTest(tests, 'serial_terminal', 'serial clear and to-bottom update output and input focus', ['#clear', '#to-bottom'], async function(assert, f) {
  var terminal = await serial(f); terminal.addMessage('', 'transient'); f.click('#clear');
  assert.equal(f.query('#messages-container').textContent.includes('transient'), false);
  f.click('#to-bottom'); assert.equal(f.document.activeElement, f.query('#message-input'));
});

exports.MODULE_TESTS = tests;
exports.figure = figure;
exports.serial = serial;
