/**
 * @file Reusable animation controls on ordinary browser figures
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();
if(!globalThis.gui_browser) {
  exports.MODULE_TESTS = tests;
  return;
}

tests.add('Web animation controls render and configure a normal 3D figure without Simulate', async function(assert) {
  await gui_browser.evaluate(() => {
    globalThis.reusable_animation_test = { pending: true };
    jslab_web.sandbox_api.evaluate('var reusable_plot = plot([{id:"marker",type:"scatter3d",mode:"markers",x:[0],y:[0],z:[0]}]); await reusable_plot.ready; var reusable_controls = await animationControls(reusable_plot.fid,{time:[0,.25,.5,1],loop:true,speeds:[.5,1,2,3],onFrame:function(index,time){reusable_plot.updateById([{id:"marker",x:[time],y:[time*time],z:[index]}]);}}); reusable_controls.seek(2).setSpeed(3); ({index:reusable_controls.index,speed:reusable_controls.speed,loop:reusable_controls.loop,playing:reusable_controls.playing});')
      .then(result => { reusable_animation_test = { pending: false, result }; },
        error => { reusable_animation_test = { pending: false, error: String(error) }; });
  });
  await gui_browser.waitFor(() => !reusable_animation_test.pending, 'generic playback creation', 30000);
  var result = await gui_browser.evaluate(() => reusable_animation_test);
  assert.equal(result.error, undefined);
  assert.equal(result.result.ok, true, JSON.stringify(result));
  var configured = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('JSON.stringify({index:reusable_controls.index,speed:reusable_controls.speed,loop:reusable_controls.loop,playing:reusable_controls.playing});'));
  assert.equal(configured.ok, true, JSON.stringify(configured));
  assert.deepEqual(JSON.parse(configured.value), { index: 2, speed: 3, loop: true, playing: false });
  await gui_browser.waitFor(() => Array.from(jslab_web.window_manager.windows.values()).some(win => {
    var frame = win.iframe.contentWindow;
    return frame.document.querySelector('.ui-animation') && frame.plot?.plot_cont?.data?.[0]?.x?.[0] == .5;
  }), 'ordinary figure frame update');
  var state = await gui_browser.evaluate(async () => {
    var managed = Array.from(jslab_web.window_manager.windows.values()).find(win => win.iframe.contentDocument?.querySelector('.ui-animation'));
    var frame = managed.iframe.contentWindow;
    var play = frame.document.querySelector('.ui-animation-play');
    play.click();
    await new Promise(resolve => setTimeout(resolve, 80));
    var advanced = Number(frame.document.querySelector('.ui-animation-slider').value);
    frame.document.querySelector('.ui-animation-play').click();
    var stopped = Number(frame.document.querySelector('.ui-animation-slider').value);
    await new Promise(resolve => setTimeout(resolve, 80));
    var result = { advanced, stopped,
      after: Number(frame.document.querySelector('.ui-animation-slider').value),
      title: frame.document.querySelector('.ui-animation-speed').title,
      simulate: jslab_web.window_manager.windows.has('simulate-window') };
    jslab_web.window_manager.close(managed.id);
    return result;
  });
  assert.equal(state.stopped, state.after);
  assert.ok(state.title.trim());
  assert.equal(state.simulate, false);
  assert.equal(gui_requests.some(url => /OpenModelicaCompiler_bg\.wasm/.test(url)), false);
}, { tags: ['gui', 'web', 'animation'], timeout_ms: 45000 });

tests.add('Web runs the reusable animation example and configures its controller from code', async function(assert) {
  const fs = require('fs'), path = require('path');
  const source = fs.readFileSync(path.join(app_path, 'examples/animation-controls.jsl'), 'utf8');
  await gui_browser.evaluate(source => {
    globalThis.reusable_example_test = { pending: true };
    jslab_web.sandbox_api.evaluate(source).then(result => {
      reusable_example_test = { pending: false, result };
    }, error => { reusable_example_test = { pending: false, error: String(error) }; });
  }, source);
  await gui_browser.waitFor(() => !reusable_example_test.pending, 'animation example', 30000);
  var result = await gui_browser.evaluate(() => reusable_example_test);
  assert.equal(result.error, undefined);
  assert.equal(result.result.ok, true, JSON.stringify(result));
  await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('playback.pause().seek(120).setSpeed(2).setLoop(false);'));
  var configured = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('JSON.stringify({index:playback.index,speed:playback.speed,loop:playback.loop,playing:playback.playing});'));
  assert.deepEqual(JSON.parse(configured.value), { index: 120, speed: 2, loop: false, playing: false });
  await gui_browser.waitFor(() => Array.from(jslab_web.window_manager.windows.values()).some(win => {
    var frame = win.iframe.contentWindow;
    return frame.document.querySelector('.ui-animation') && frame.plot?.plot_cont?.data?.[0]?.x?.[0] == -1;
  }), 'example frame on standard plot');
}, { tags: ['gui', 'web', 'animation'], timeout_ms: 45000 });

tests.add('Web interruption pauses reusable playback and allows it to resume', async function(assert) {
  await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('playback.setLoop(true).play();'));
  await gui_browser.waitFor(() => Array.from(jslab_web.window_manager.windows.values()).some(win =>
    win.iframe.contentDocument?.querySelector('.ui-animation-play')?.textContent == '\u275a\u275a'), 'generic playback started');
  await gui_browser.evaluate(() => jslab_web.worker_debugger.interrupt());
  await gui_browser.waitFor(() => Array.from(jslab_web.window_manager.windows.values()).some(win =>
    win.iframe.contentDocument?.querySelector('.ui-animation-play')?.textContent == '\u25b6'), 'generic playback interrupted');
  await gui_browser.waitFor(() => jslab_web.worker_debugger.state == 'idle', 'worker interruption complete', 15000);
  var state = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('JSON.stringify({playing:playback.playing,index:playback.index});'));
  assert.equal(state.ok, true, JSON.stringify(state));
  assert.equal(JSON.parse(state.value).playing, false);
  await gui_browser.evaluate(() => {
    var managed = Array.from(jslab_web.window_manager.windows.values()).find(win =>
      win.iframe.contentDocument?.querySelector('.ui-animation'));
    managed.iframe.contentDocument.querySelector('.ui-animation-play').click();
  });
  await gui_browser.waitFor(() => Array.from(jslab_web.window_manager.windows.values()).some(win =>
    win.iframe.contentDocument?.querySelector('.ui-animation-play')?.textContent == '\u275a\u275a'), 'play button after interruption');
  var resumed = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('playback.playing;'));
  assert.equal(resumed.value, true);
  await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('playback.pause();'));
}, { tags: ['gui', 'web', 'animation'], timeout_ms: 45000 });

exports.MODULE_TESTS = tests;
