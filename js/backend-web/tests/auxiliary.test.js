/**
 * @file Real browser figure and serial window component startup
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { webTest } = require('./browser-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) {
  exports.MODULE_TESTS = tests;
  return;
}
webTest(tests, 'web figure frame initializes Plotly and its menu toggles', async function() {
  var t = GUI, opened = t.app.windows.openManagedWindow('gui-figure', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow, doc = w.document;
  await new Promise((resolve, reject) => {
    var script = doc.createElement('script');
    script.src = location.origin + '/js/init-figure.js';
    script.onload = resolve;
    script.onerror = reject;
    doc.head.appendChild(script);
  });
  doc.dispatchEvent(new w.Event('DOMContentLoaded'));
  await t.wait(() => !!doc.querySelector('.plot-cont.js-plotly-plot'), 'real Plotly plot; Plotly=' + typeof w.Plotly + '; plot=' + typeof w.plot + '; html=' + doc.getElementById('figure-content').innerHTML.slice(0, 100));
  var menu = doc.getElementById('figure-menu-container'), before = menu.classList.contains('collapsed');
  doc.getElementById('figure-menu-button').click();
  t.eq(menu.classList.contains('collapsed'), !before);
  t.app.window_manager.close('gui-figure');
});

webTest(tests, 'Plotly legend fits Latin Modern text at different font sizes', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-figure-font', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  var doc = w.document;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  cont.style.cssText = 'width:720px;height:420px';
  var label = 'Aerodynamic moment coefficient WMWMWM';
  var sizes = [12, 18, 28, 40];

  await w.plot.newPlot({}, [
    { x: [0, 1], y: [0, 1], name: label, mode: 'lines' },
    { x: [0, 1], y: [1, 0], name: 'Reference response', mode: 'lines' }
  ], {
    width: 720,
    height: 420,
    showlegend: true,
    font: { family: 'LatinModern', size: sizes[0] },
    legend: {
      font: { family: 'LatinModern', size: sizes[0] },
      borderwidth: 1,
      borderpad: 4
    }
  }, { staticPlot: true });

  if(doc.fonts && doc.fonts.ready) {
    await doc.fonts.ready;
  }

  for(var size of sizes) {
    await w.plot.relayout({
      'font.family': 'LatinModern',
      'font.size': size,
      'legend.font.family': 'LatinModern',
      'legend.font.size': size
    });
    await new Promise(resolve => w.requestAnimationFrame(() =>
      w.requestAnimationFrame(resolve)));
    var background = cont.querySelector('g.legend rect.bg');
    var texts = Array.from(cont.querySelectorAll('g.legend text.legendtext'));
    t.ok(background && texts.length, 'legend geometry exists at ' + size + 'px');
    var backgroundBox = background.getBBox();
    var textRight = Math.max(...texts.map(text => {
      var box = text.getBBox();
      return box.x + box.width;
    }));
    var backgroundRight = backgroundBox.x + backgroundBox.width;
    t.ok(textRight <= backgroundRight + 0.5,
      'Latin Modern legend text is cropped at ' + size + 'px: text right ' +
      textRight + ', background right ' + backgroundRight);
  }

  t.app.window_manager.close('gui-figure-font');
});

webTest(tests, 'web serial terminal dialogs, settings, toggles and generated UI tabs work', async function() {
  var t = GUI, opened = t.app.windows.openManagedWindow('gui-serial', 'serial_terminal.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow, doc = w.document;
  async function script(src) {
    await new Promise((resolve, reject) => {
      var el = doc.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = reject;
      doc.head.appendChild(el);
    });
  }
  await script(location.origin + '/js/other-shared/terminal-buffer.js');
  await script(location.origin + '/js/windows/serial-terminal.js');
  var terminal = w.terminal;
  t.ok(terminal);
  for(var selector of ['#timestamp', '#autoscroll']) {
    var before = doc.querySelector(selector).className;
    t.click(selector, doc);
    t.ok(doc.querySelector(selector).className !== before);
  }
  for(var name of ['settings', 'log']) {
    t.click('#' + name, doc);
    t.eq(t.visible('#' + name + '-dialog', doc), true);
    t.click('#' + name + '-dialog .options-close', doc);
    t.eq(t.visible('#' + name + '-dialog', doc), false);
    t.click('#' + name, doc);
    t.key(doc.getElementById(name + '-dialog'), 'Escape');
    t.eq(t.visible('#' + name + '-dialog', doc), false);
  }
  t.input('#N-messages-max', '2', doc);
  t.click('#settings-dialog .change-settings', doc);
  t.eq(terminal.N_messages_max, 5);
  t.click('#write-timestamps', doc);
  t.eq(terminal.write_timestamps, false);
  terminal.addMessage('', 'temporary');
  t.click('#clear', doc);
  t.eq(doc.getElementById('messages-container').textContent.includes('temporary'), false);
  t.click('#to-bottom', doc);
  t.eq(doc.activeElement, doc.getElementById('message-input'));
  t.key(doc.getElementById('message-input'), 'x');
  var group = doc.createElement('div');
  group.className = 'ui tabs-cont';
  group.innerHTML = '<button class="ui tab-name">One</button><button class="ui tab-name">Two</button><div class="ui tab">First</div><div class="ui tab">Second</div>';
  doc.body.appendChild(group);
  await script(location.origin + '/js/windows/ui.js');
  group.querySelectorAll('button')[1].click();
  t.eq(group.querySelectorAll('.tab')[1].style.display, 'block');
  t.app.window_manager.close('gui-serial');
});
webTest(tests, 'Web prints a managed window to real PDF bytes', async () => {
  const output = await GUI.app.sandbox_api.evaluate(`var print_window = openWindow('blank.html');
    await getWindow(print_window).ready;
    getWindow(print_window).context.document.body.innerHTML = '<h1>JSLAB window PDF</h1><p>Browser print integration</p>';
    var window_pdf = await printWindowToPdf(print_window, { pageSize: 'A4' });
    var signature = new TextDecoder().decode(window_pdf.slice(0, 5));
    closeWindow(print_window);
    signature;`);
  GUI.eq(output.value, '%PDF-');
});

webTest(tests, 'Web sandbox uses the browser microphone and camera', async () => {
  const app = GUI.app;
  const source = `var camera = (await getWebcams())[0]; var microphone = (await getMicrophones())[0];
    var preview = await webcam(camera.deviceId); await showAudioWaveform(microphone.deviceId, 512);
    var sample = await new Promise(async resolve => {
      var capture = await webcamCapture({ id: camera.deviceId }, (bytes, width, height) => {
        resolve(bytes.byteLength === width * height * 4);
        capture.stop();
      });
    });
    JSON.stringify([camera.kind, microphone.kind, preview.dom.readyState >= 2, sample]);`;
  const output = await app.sandbox_api.evaluate(source);
  GUI.eq(output.value, '["videoinput","audioinput",true,true]');
  const client = app.worker_debugger;
  const tracks = [...client.media.streams].flatMap(stream => stream.getTracks());
  GUI.ok(tracks.some(track => track.kind === 'video' && track.readyState === 'live'));
  GUI.ok(tracks.some(track => track.kind === 'audio' && track.readyState === 'live'));
  const choose = app.files._showSaveDialog;
  const save = app.files._saveLocalFile;
  let recording;
  try {
    app.files._showSaveDialog = async () => ({ filePath: 'capture.webm' });
    app.files._saveLocalFile = async (_target, blob) => {
      recording = new Uint8Array(await blob.arrayBuffer());
      return true;
    };
    const started = await app.sandbox_api.evaluate(`var recording_test = await startVideoRecording(camera.deviceId,
      { type: 'webcam', mimeType: 'video/webm' }); recording_test.state;`);
    GUI.eq(started.value, 'recording');
    await GUI.wait(() => [...client.media.recordings.values()].some(item => item.chunks.some(chunk => chunk.size > 0)),
      'the camera recorder produces video');
    const stopped = await app.sandbox_api.evaluate('await recording_test.stopRecording(); recording_test.state;');
    GUI.eq(stopped.value, 'inactive');
    GUI.ok(recording?.length > 4, 'the saved recording contains video');
    GUI.eq(Array.from(recording.slice(0, 4)).join(','), '26,69,223,163');
  } finally {
    app.files._showSaveDialog = choose;
    app.files._saveLocalFile = save;
  }
  await app.sandbox_api.evaluate('resetSandbox();');
  GUI.ok(tracks.every(track => track.readyState === 'ended'));
});

exports.MODULE_TESTS = tests;
