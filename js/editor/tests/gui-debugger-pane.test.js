/**
 * @file JSLAB debugger GUI interaction tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;
if(!globalThis.__JSLAB_GUI_COMPONENT__) return;
const { guiTest } = require('../../dev/gui-test-utils');

function setup(fixture, platform = 'desktop') {
  const calls = [];
  const view = fixture.controller.debugger_pane.view;
  const host = view.host; host.platform = platform;
  host.request = async (...args) => { calls.push(args); return {}; };
  fixture.controller.debugger_pane.show();
  return { view, host, calls };
}

for(const action of ['apply', 'restart', 'reset']) {
  const selector = '[data-debug-action="' + action + '"]';
  guiTest(tests, 'editor', 'Editor debugger pane dispatches ' + action, [selector], async (assert, fixture) => {
    const { view, calls } = setup(fixture, action === 'reset' ? 'web' : 'desktop');
    view.update({ state: action === 'pause' ? 'running' : 'paused', revision: 7,
      frames: [{ name: 'calculate', path: 'test.jsl', line: 3 }], frame_index: 0 });
    fixture.click('#debugger-menu-toggle'); await fixture.tick();
    fixture.click(selector); await fixture.tick();
    const method = { pause: 'pause_execution', stop: 'interrupt_execution', apply: 'update_debug_script', restart: 'restart_debug_frame', reset: 'reset_debugger' }[action] || 'resume_execution';
    assert.equal(calls.length, 1); assert.equal(calls[0][0], method);
    if(method === 'resume_execution') assert.equal(calls[0][1].action, action);
    if(action === 'apply') assert.equal(calls[0][1].path, 'test.jsl');
    if(action === 'restart') assert.equal(calls[0][1].frame_index, 0);
    assert.equal(fixture.document.querySelector('#editor-debugger-pane input'), null);
    assert.equal(fixture.document.querySelector('#debugger-values'), null);
  });
}

guiTest(tests, 'editor', 'call stack, target and exception selections are serialized and carry the pause revision',
  ['#debugger-frames', '#debugger-targets', '#debugger-exceptions'], async (assert, fixture) => {
    const { view, calls } = setup(fixture);
    view.update({ state: 'paused', revision: 12, frames: [{ name: 'callee', path: 'test.jsl', line: 2 },
      { name: 'caller', path: 'test.jsl', line: 1 }], workers: [{ session_id: 'worker', name: 'worker', paused: true }] });
    fixture.input('#debugger-frames', '1', 'change'); await fixture.tick();
    fixture.input('#debugger-targets', 'worker', 'change'); await fixture.tick();
    fixture.input('#debugger-exceptions', 'all', 'change'); await fixture.tick();
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['select_debug_frame', { frame_index: 1, revision: 12 }],
      ['select_debug_target', { session_id: 'worker' }], ['set_exception_pause', { state: 'all' }]]);
    view.update({ state: 'running', frames: [] });
    assert.equal(view.frames.disabled, true);
    assert.equal(fixture.document.querySelector('[data-debug-action="continue"]'), null);
    assert.equal(fixture.query('[data-debug-action="reset"]').hidden, true);
  });

guiTest(tests, 'editor', 'debugger reports operation errors and never replaces newer state with a stale response', [], async (assert, fixture) => {
  const { view, host } = setup(fixture, 'web');
  let finish;
  host.request = () => new Promise(resolve => { finish = resolve; });
  view.update({ state: 'paused', frames: [{name:'calculate',path:'test.jsl',line:2}] });
  fixture.click('#debugger-menu-toggle'); await fixture.tick();
  fixture.click('[data-debug-action="apply"]'); fixture.click('[data-debug-action="reset"]');
  assert.equal(view.sequence, 1);
  view.update({ state: 'running', frames: [] }); finish({ state: 'paused' }); await fixture.tick();
  assert.equal(view.state.state, 'running');
  host.request = async () => { throw Error('transport failed'); };
  fixture.click('[data-debug-action="reset"]'); await fixture.tick();
  assert.equal(view.message.textContent, 'transport failed');
  assert.equal(fixture.query('[data-debug-action="restart"]').hidden, true);
  assert.equal(fixture.query('[data-debug-action="reset"]').hidden, false);
  view.update(); assert.equal(view.state.state, 'unavailable');
});

guiTest(tests, 'editor', 'debugger keeps its options menu closed and hides internal or completed stacks', [], async (assert, fixture) => {
  const { view } = setup(fixture);
  assert.equal(fixture.visible('#debugger-menu'), false);
  assert.equal(fixture.document.querySelector('#debugger-advanced'), null);
  assert.equal(fixture.document.querySelector('#debugger-controls'), null);
  view.update({state:'paused', frame_index:1, frames:[
    {name:'_breakpoint',path:'C:/github/JSLAB/js/sandbox/basic.js',line:1143},
    {name:'calculate',path:'C:/work/calculate.jsl',line:8}
  ], async_stack:[{description:'await',frames:[{name:'eval',path:'C:/github/JSLAB/js/sandbox/jslab-eval.js',line:3}]}]});
  assert.equal(view.frames.options.length, 1); assert.equal(view.frames.value, '1');
  assert.equal(fixture.document.querySelector('[data-debug-action="continue"]'), null);
  assert.equal(fixture.query('#debugger-target-row').hidden, true);
  assert.equal(fixture.query('#debugger-history-details').hidden, true);
  view.update({state:'idle',frames:[],async_stack:[{description:'await',frames:[{name:'calculate',path:'calculate.jsl',line:8}]}]});
  assert.equal(view.frames.hidden, true); assert.equal(fixture.query('#debugger-history').textContent, '');
  assert.equal(fixture.query('#debugger-empty').hidden, false);
  assert.equal(fixture.document.querySelector('[data-debug-action="continue"]'), null);
});

guiTest(tests, 'editor', 'Editor debugger split resizes, restores source space and preserves frame selection when hidden', ['#editor-debugger-close'], async (assert, fixture, controller) => {
  const { view } = setup(fixture); const pane = controller.debugger_pane;
  pane.update({state:'paused',revision:7,frame_index:1,frames:[{name:'callee',path:'a.jsl',line:1},{name:'caller',path:'a.jsl',line:3}]});
  assert.equal(view.frames.value,'1'); assert.equal(pane.visible,true);
  const oldSize = pane.split.cells_size[0]; const rect = pane.resizer.getBoundingClientRect();
  fixture.mouse(pane.resizer,'mousedown',rect.left+2,rect.top+2);
  fixture.mouse(fixture.document,'mousemove',rect.left+2,rect.top-70);
  fixture.mouse(fixture.document,'mouseup',rect.left+2,rect.top-70);
  assert.ok(pane.split.cells_size[0] < oldSize);
  fixture.click('#editor-debugger-close');
  assert.equal(pane.visible,false); assert.equal(pane.code.style.height,'100%'); assert.equal(view.frames.value,'1');
  pane.show(); assert.equal(view.frames.value,'1');
  assert.ok(parseFloat(pane.code.style.height) < 100);
  assert.equal(fixture.document.body.classList.contains('dragging'),false);
  fixture.frame.style.height='600px'; await fixture.frames();
  fixture.window.dispatchEvent(new fixture.window.Event('resize'));
  assert.equal(pane.split.container_bcr.height,fixture.query('#editor-workspace').getBoundingClientRect().height);
  assert.equal(view.frames.value,'1');
});


guiTest(tests, 'editor', 'Debugger uses existing panel border, title and close icon styling', [], async (assert, fixture) => {
  fixture.controller.debugger_pane.show();
  const style = selector => fixture.window.getComputedStyle(fixture.query(selector));
  assert.equal(style('#editor-debugger-pane > .panel-container').borderRadius, '3px');
  assert.equal(style('#editor-debugger-header').fontSize, '14px');
  assert.equal(style('#editor-debugger-header').fontWeight, '300');
  assert.equal(style('#editor-debugger-header').color, 'rgb(102, 102, 102)');
  assert.equal(style('#editor-debugger-header').marginLeft, '10px');
  assert.equal(style('#debugger-frames').borderTopWidth, '0px');
  assert.equal(style('#editor-debugger-close img').filter, 'none');
});


guiTest(tests, 'editor', 'Debugger header popup reuses Editor menu styling and closes on Escape, outside click and pane hide', ['#debugger-menu-toggle'], async (assert, fixture, controller) => {
  const pane = controller.debugger_pane;
  pane.show();
  const header = fixture.query('#editor-debugger-header-controls');
  assert.equal(header.children[0].id, 'editor-debugger-controls');
  assert.equal(header.children[1].id, 'debugger-menu-toggle');
  assert.equal(header.children[2].id, 'editor-debugger-close');
  assert.equal(fixture.document.querySelector('.tabs [data-editor-debug-action]'), null);
  fixture.click('#debugger-menu-toggle'); await fixture.tick();
  assert.equal(pane.view.menu.constructor.name, 'PRDC_POPUP');
  assert.equal(fixture.visible('#debugger-menu'), true);
  const style = selector => fixture.window.getComputedStyle(fixture.query(selector));
  assert.equal(style('#debugger-menu').borderRadius, style('#editor-more-popup').borderRadius);
  assert.equal(style('#debugger-menu li').fontSize, style('#editor-more-popup li').fontSize);
  const rect = fixture.query('#debugger-menu').getBoundingClientRect();
  assert.ok(rect.top >= 0 && rect.bottom <= fixture.window.innerHeight);
  fixture.key(null,'Escape'); await fixture.tick();
  assert.equal(fixture.visible('#debugger-menu'), false);
  assert.equal(fixture.query('#debugger-menu-toggle').getAttribute('aria-expanded'), 'false');
  fixture.click('#debugger-menu-toggle'); await fixture.tick();
  fixture.document.body.click(); await fixture.tick();
  assert.equal(fixture.visible('#debugger-menu'), false);
  fixture.click('#debugger-menu-toggle'); await fixture.tick();
  pane.hide(); await fixture.tick();
  assert.equal(fixture.visible('#debugger-menu'), false);
});
