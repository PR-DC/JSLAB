/**
 * @file Reusable animation UI interaction and asynchronous rendering tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { guiTest } = require('../../dev/component-test-utils');
const { root } = require('../../dev/gui-test-fixture');
var tests = new PRDC_JSLAB_TESTS();
if(!globalThis.__JSLAB_GUI_COMPONENT__) {
  exports.MODULE_TESTS = tests;
  return;
}

guiTest(tests, 'blank', 'Reusable animation controls follow time, seek, change speed, loop and dispose', [], function(assert, fixture) {
  var { PRDC_JSLAB_UI } = fixture.load(path.join(root, 'js/windows/ui.js'));
  var ui = new PRDC_JSLAB_UI(fixture.document);
  var now = 0, running = false, tick, frames = [];
  var timer = { start: () => { running = true; return true; }, stop: () => { running = false; }, isRunning: () => running };
  var controls = ui.animation({ time: [5, 5.1, 5.4, 6], clock: { now: () => now },
    createTimer: callback => { tick = callback; return timer; },
    onFrame: (index, time) => frames.push([index, time]), language: { currentString: id => String(id) } });
  assert.equal(controls.index, 0);
  controls.play();
  now = 520;
  tick();
  assert.equal(controls.index, 2);
  controls.setSpeed(2);
  now = 820;
  tick();
  assert.equal(controls.index, 3);
  assert.equal(controls.playing, false);
  controls.setLoop(true).play();
  assert.equal(controls.index, 0);
  now = 2070;
  tick();
  assert.equal(controls.index, 2);
  controls.pause().seek(1).setSpeed(3);
  assert.equal(controls.index, 1);
  assert.equal(controls.speed, 3);
  assert.equal(controls.playing, false);
  var slider = fixture.query('.ui-animation-slider');
  slider.value = '2';
  slider.dispatchEvent(new fixture.window.Event('input'));
  assert.equal(controls.index, 2);
  var speed = fixture.query('.ui-animation-speed');
  speed.value = '0.5';
  speed.dispatchEvent(new fixture.window.Event('change'));
  assert.equal(controls.speed, .5);
  fixture.query('.ui-animation-play').click();
  assert.equal(controls.playing, true);
  fixture.query('.ui-animation-play').click();
  assert.equal(controls.playing, false);
  assert.ok(frames.length >= 5);
  controls.dispose();
  assert.equal(fixture.document.querySelector('.ui-animation'), null);
  controls.play();
  assert.equal(controls.playing, false);
});

guiTest(tests, 'blank', 'Animation callbacks serialize asynchronous frames and keep the latest seek', [], async function(assert, fixture) {
  var { PRDC_JSLAB_UI } = fixture.load(path.join(root, 'js/windows/ui.js'));
  var ui = new PRDC_JSLAB_UI(fixture.document);
  var release, frames = [];
  var controls = ui.animation({ time: [0, 1, 2, 3], onFrame: index => {
    frames.push(index);
    if(index === 0) {
      return new Promise(resolve => { release = resolve; });
    }
  } });
  controls.seek(1);
  controls.seek(3);
  assert.deepEqual(frames, [0]);
  release();
  await fixture.waitFor(() => frames.length == 2, 'latest queued frame');
  assert.deepEqual(frames, [0, 3]);
  controls.dispose();
  assert.throws(() => ui.animation({ time: [1, 0] }));
  assert.throws(() => ui.animation({ time: [0, 1], speed: 0 }));
  assert.equal(fixture.document.querySelector('.ui-animation'), null);
});

exports.MODULE_TESTS = tests;
