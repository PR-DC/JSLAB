/**
 * @file Simulate Modelica GUI interaction tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { guiTest, sent } = require('../../dev/component-test-utils');
var tests = new PRDC_JSLAB_TESTS();
if(!globalThis.__JSLAB_GUI_COMPONENT__) {
  exports.MODULE_TESTS = tests;
  return;
}

guiTest(tests, 'simulate', 'Simulate brings its unsaved project forward and respects shutdown choices',
  ['#close-dialog-cancel', '#close-dialog-discard', '#close-dialog-save'], async function(assert, fixture) {
    const controller = fixture.window.win_simulate;
    const dialog = fixture.query('#close-dialog-cont');
    assert.equal(await controller.confirmProjectClose(), true);
    fixture.input('#simulate-stop-time', '42');
    let closing = controller.confirmProjectClose();
    assert.equal(dialog.hidden, false);
    sent(assert, fixture, 'MainProcess', 'focus-win');
    fixture.click('#close-dialog-cancel');
    assert.equal(await closing, false);
    closing = controller.confirmProjectClose();
    fixture.click('#close-dialog-discard');
    assert.equal(await closing, true);
    assert.equal(fixture.query('#simulate-stop-time').value, '42');
    fixture.setDialogResult({ canceled: false, file_path: 'saved.jslmo' });
    closing = controller.confirmProjectClose();
    fixture.click('#close-dialog-save');
    assert.equal(await closing, true);
    assert.equal(await controller.confirmProjectClose(), true);
    assert.ok(fixture.calls.some(call => call[0] === 'JSLAB_SIMULATE_SAVE' && call[1].simulation.stop_time === '42'));
  });

guiTest(tests, 'simulate', 'Simulate keeps hidden visual components editable without drawing their blocks or wires',
  [], async function(assert, fixture) {
    var controller = fixture.window.win_simulate;
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 4;
    },
    'initial diagram');
    var component = controller.model.components.find(function(item) {
      return item.name == 'source';
    });
    component.placement.visible = false;
    controller.renderDiagram();
    controller.renderTree();
    assert.ok(fixture.document.querySelector('[data-component="source"].simulate-tree-item'));
    assert.equal(fixture.document.querySelector('.simulate-tree-status'), null);
    assert.equal(fixture.document.querySelector('.simulate-component[data-component="source"]'), null);
    assert.equal(fixture.document.querySelectorAll('.simulate-component').length, 3);
    assert.equal(fixture.document.querySelectorAll('.simulate-connection').length, 1);
    assert.equal(controller.model.components.includes(component), true);
    assert.equal(controller.model.connections.length, 2);
  });

guiTest(tests, 'simulate', 'Simulate renders parsed parameters, components and wires',
  ['#simulate-diagram-fit'], async function(assert, fixture) {
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 4;
    }, 'parsed Modelica diagram');
    assert.equal(fixture.document.querySelectorAll('.simulate-parameter input[data-field="value"]').length, 1);
    assert.equal(fixture.document.querySelectorAll('.simulate-connection').length, 2);
    assert.equal(fixture.document.querySelectorAll('.component-icon').length, 4);
    assert.equal(fixture.document.querySelectorAll('.component-name-background').length, 0);
    assert.ok(fixture.document.querySelector('.icon-table-paper'));
    assert.ok(fixture.document.querySelector('.icon-steel'));
    assert.ok(fixture.query('.simulate-connection').getAttribute('style').includes('0, 0, 127'));
    var icon_types = [
      'Modelica.Mechanics.MultiBody.World', 'Modelica.Mechanics.MultiBody.Parts.Fixed',
      'Modelica.Mechanics.MultiBody.Joints.Revolute', 'Modelica.Mechanics.MultiBody.Joints.Spherical',
      'Modelica.Mechanics.MultiBody.Joints.Assemblies.JointSSR',
      'Modelica.Mechanics.MultiBody.Parts.BodyShape', 'Modelica.Mechanics.MultiBody.Parts.FixedTranslation',
      'Modelica.Mechanics.MultiBody.Parts.Body', 'Modelica.Mechanics.Rotational.Sources.Position',
      'Modelica.Blocks.Sources.TimeTable'
    ];
    icon_types.forEach(function(type) {
      var group = fixture.document.createElementNS('http://www.w3.org/2000/svg', 'g');
      fixture.window.drawComponentIcon(group, { type: type }, 20, 20);
      assert.ok(group.querySelector('.component-icon'));
      assert.equal(group.querySelector('.icon-block'), null);
    });
    var world_group = fixture.document.createElementNS('http://www.w3.org/2000/svg', 'g');
    fixture.window.drawComponentIcon(world_group, { type: 'Modelica.Mechanics.MultiBody.World' }, 20, 20);
    assert.equal(world_group.querySelector('.icon-world'), null);
    assert.equal(world_group.querySelectorAll('.icon-world-gravity').length, 1);
    assert.equal(world_group.querySelectorAll('.icon-axis-label').length, 2);
    assert.equal(world_group.querySelector('.icon-gravity-label').textContent, 'g');
    var joint = { name: 'leg1', type: 'Modelica.Mechanics.MultiBody.Joints.Assemblies.JointSSR' };
    assert.deepEqual(fixture.window.componentPortLocal({ label: 'frame_a' }, 18, 18, [], joint), { x: 9, y: 0 });
    assert.deepEqual(fixture.window.componentPortLocal({ label: 'frame_b' }, 18, 18, [], joint), { x: -9, y: 0 });
    assert.deepEqual(fixture.window.componentPortLocal({ label: 'frame_ib' }, 18, 18, [], joint), { x: 0, y: 9 });
    assert.deepEqual(fixture.window.componentPortLocal({ label: 'axis' }, 18, 18, [], joint), { x: 0, y: -9 });
    var lower_rod = { name: 'lowerRod1', type: 'Modelica.Mechanics.MultiBody.Parts.Body' };
    assert.deepEqual(fixture.window.componentPortLocal({ label: 'frame_a' }, 10, 10, [], lower_rod),
      { x: 0, y: -5 });
    assert.equal(fixture.window.segmentIntersectsBox(
      { x: -55, y: -93 }, { x: -8, y: -93 },
      { left: -49, right: -35, top: -92, bottom: -78 }, 2), true);
    fixture.click('.simulate-tree-item');
    fixture.click('.simulate-tree-item:nth-child(2)');
    assert.ok(fixture.query('.simulate-tree-root').textContent.endsWith('.jslmo'));
    fixture.query('.simulate-tree-root').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
    assert.equal(fixture.query('#simulate-parameters-dialog').hidden, false);
    fixture.click('#simulate-parameters-cancel');
    fixture.query('.simulate-tree-item:nth-child(2)').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-property-row').length === 2;
    }, 'component property schema');
    assert.equal(fixture.query('#simulate-component-dialog').hidden, false);
    assert.equal(fixture.document.querySelectorAll('.simulate-property-row').length, 2);
    assert.equal(fixture.document.querySelectorAll('.simulate-property-row:not(.simulate-property-head)').length, 2);
    assert.equal(fixture.document.querySelectorAll('.simulate-property-row select').length, 1);
    assert.ok(fixture.query('.simulate-property-choice').textContent.includes('Yes'));
    assert.equal(fixture.window.modelicaValueToJSLAB('{1, 2, 3}', false), '[1, 2, 3]');
    assert.equal(fixture.window.modelicaValueToJSLAB('(start = {0, 0, 0})', true), '[0, 0, 0]');
    assert.equal(fixture.window.modelicaValueToJSLAB('[0, 1; 2, 3]', false), '[[0, 1], [2, 3]]');
    assert.equal(fixture.window.modelicaValueToJSLAB('from_deg(30)', false),
      '((30) * pi / 180)');
    fixture.input('#simulate-component-name', 'sourceRenamed', 'input');
    fixture.input('.simulate-property-row input', 'gain * 2', 'input');
    fixture.click('#simulate-component-apply');
    assert.equal(fixture.window.component_bindings.get('sourceRenamed\u0000gain'), 'gain * 2');
    assert.ok(!fixture.window.editor.getValue().includes('// JSLAB component bindings:'));
    assert.equal(fixture.window.replaceModelicaIdentifier('x = source; // source\n"source"', 'source', 'renamed'),
      'x = renamed; // source\n"source"');
    assert.equal(fixture.document.querySelector('#simulate-view-switch'), null);
    assert.equal(fixture.document.querySelector('#simulate-code'), null);
    fixture.click('#simulate-diagram-fit');
    fixture.query('.simulate-component').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
    assert.equal(fixture.query('#simulate-component-dialog').hidden, false);
  });

guiTest(tests, 'simulate', 'Simulate automatic icon labels fit at different diagram scales',
  [], async function(assert, fixture) {
    const { renderAnnotation, readMetadata } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
    await fixture.document.fonts.ready;
    for(const size of [20, 60, 200]) {
      var svg = fixture.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '-250 -250 500 500');
      svg.setAttribute('width', '500');
      svg.setAttribute('height', '500');
      svg.style.cssText = 'position:fixed;left:-10000px;top:-10000px';
      fixture.document.body.appendChild(svg);
      for(const type of ['Modelica.Blocks.Continuous.LowpassButterworth', 'Modelica.Electrical.Digital.Delay.InertialDelaySensitiveVector']) {
        renderAnnotation(svg, readMetadata('library-graphics.json')[type], { name: 'block', modifiers: [] }, size, size);
      }
      var labels = svg.querySelectorAll('text[data-text-extent]');
      assert.ok(labels.length > 1);
      labels.forEach(function(text) {
        var extent = JSON.parse(text.getAttribute('data-text-extent')), bounds = text.getBBox();
        if(extent[0] > 0) {
          assert.ok(bounds.width <= extent[0] + 1, text.textContent + ' width at ' + size);
        }
        if(extent[1] > 0) {
          assert.ok(bounds.height <= extent[1] + 1, text.textContent + ' height at ' + size);
        }
      });
      svg.remove();
    }
  });

guiTest(tests, 'simulate', 'Simulate redraws translated icon labels in the diagram and library without moving the view',
  ['#simulate-library-search'], async function(assert, fixture) {
    fixture.window.editor.setValue('model ModelName\n Modelica.Electrical.Digital.Delay.InertialDelay delay1 annotation(Placement(transformation(origin={0,0},extent={{-10,-10},{10,10}})));\nend ModelName;');
    function drawingText() {
      return Array.from(fixture.document.querySelectorAll('[data-component="delay1"] .component-icon text')).map(text => text.textContent).join(' ');
    }
    await fixture.waitFor(function() {
      return drawingText().includes('Inertial');
    }, 'English icon labels');
    fixture.click('#simulate-diagram-fit');
    var transform = fixture.query('#simulate-diagram-layer').getAttribute('transform');
    for(const [code, inertial, delay] of [['rs', 'Inercijalno', 'Kašnjenje'], ['rsc', 'Инерцијално', 'Кашњење']]) {
      fixture.emit('SimulateWindow', 'set-language', code);
      assert.ok(drawingText().includes(inertial));
      assert.ok(drawingText().includes(delay), code + ': ' + drawingText());
      assert.equal(fixture.query('#simulate-diagram-layer').getAttribute('transform'), transform);
    }
    fixture.click('#simulate-library-open');
    fixture.input('#simulate-library-search', 'InertialDelay', 'input');
    var selector = '[data-library-type="Modelica.Electrical.Digital.Delay.InertialDelay"] svg';
    await fixture.waitFor(function() {
      return fixture.document.querySelector(selector)?.textContent.includes('Кашњење');
    }, 'Cyrillic library drawing');
    fixture.input('#simulate-library-search', 'World', 'input');
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-library-type="Modelica.Mechanics.MultiBody.World"] .icon-world-gravity');
    }, 'matching custom World icon in library');
    assert.ok(fixture.query('#simulate-icon-style').textContent.includes('.icon-world-axis'));
    assert.ok(fixture.window.editor.getValue().includes('delay1'));
  });

guiTest(tests, 'simulate', 'Simulate compiler controls publish workspace results and open animation',
  ['#simulate-check', '#simulate-build', '#simulate-simulate', '#simulate-animation',
    '#simulate-start-time', '#simulate-stop-time', '#simulate-intervals', '#simulate-tolerance', '#simulate-solver',
    '#simulate-compiler-progress'], async function(assert, fixture) {
    fixture.window.setCompilerStatus({ id: "omjsl-11", loaded: '40.0', total: '80.0', progress: 50 });
    assert.equal(fixture.query('#simulate-compiler-progress').value, 50);
    assert.equal(fixture.query('#simulate-compiler-progress').hidden, false);
    fixture.window.setCompilerStatus('Preparing solver...');
    assert.equal(fixture.query('#simulate-compiler-progress').hidden, true);
    fixture.window.startCompilerActivity('simulate');
    assert.equal(fixture.query('#simulate-compiler-progress').hidden, true);
    assert.ok(fixture.query('#simulate-compiler-status').textContent.includes('0 s'));
    assert.ok(fixture.query('#simulate-compiler-status').classList.contains('active'));
    fixture.window.stopCompilerActivity();
    assert.equal(fixture.query('#simulate-compiler-progress').hidden, true);
    assert.ok(!fixture.query('#simulate-compiler-status').classList.contains('active'));
    var compiler_selectors = ['#simulate-check', '#simulate-build', '#simulate-simulate'];
    for(var compiler_index = 0; compiler_index < compiler_selectors.length; compiler_index++) {
      var selector = compiler_selectors[compiler_index];
      fixture.click(selector);
      assert.ok(!fixture.query('#simulate-console').classList.contains('collapsed'));
      await fixture.waitFor(function() {
        return fixture.calls.filter(function(call) {
          return call[0] === 'JSLAB_OPENMODELICA_WASM_COMPILE';
        }).length > compiler_index;
      }, selector + ' compiler response');
      await fixture.waitFor(function() {
        return !fixture.query('#simulate-compiler-status').classList.contains('active');
      }, selector + ' compiler completion');
    }
    var actions = fixture.calls.filter(function(call) {
      return call[0] === 'JSLAB_OPENMODELICA_WASM_COMPILE';
    })
      .map(function(call) {
        return call[1].action;
      });
    assert.deepEqual(actions, ['check', 'build', 'simulate']);
    var results = fixture.calls.filter(function(call) {
      return call[0] === 'JSLAB_SIMULATE_RESULT';
    });
    assert.equal(results.length, 1);
    assert.deepEqual(results[0][1].result.columns,
      ['time', 'body.frame_a.r_0[1]', 'body.frame_a.r_0[2]', 'body.frame_a.r_0[3]']);
    fixture.click('#simulate-animation');
    assert.equal(fixture.calls.filter(function(call) {
      return call[0] === 'JSLAB_SIMULATE_ANIMATION';
    }).length, 1);
    fixture.window.setBusy(true);
    assert.equal(fixture.query('#simulate-simulate str').textContent, 'Stop');
    assert.ok(!fixture.query('#simulate-simulate').classList.contains('disabled'));
    fixture.click('#simulate-simulate');
    assert.equal(fixture.calls.filter(function(call) {
      return call[0] === 'JSLAB_OPENMODELICA_WASM_CLOSE';
    }).length, 1);
    fixture.window.setBusy(false);
  });

guiTest(tests, 'simulate', 'Simulate scripts can change parameters, run and start looped animation',
  ['#simulate-simulate'], async function(assert, fixture) {
    fixture.emit('SimulateWindow', 'automation', { id: 17, filepath: '', options: {
      parameters: { gain: 5 }, run: true, animation: { loop: true, interval_ms: 20 }
    } });
    await fixture.waitFor(function() {
      return fixture.calls.some(function(call) {
        return call[0] === 'JSLAB_SIMULATE_AUTOMATION_RESULT' && call[1].id === 17;
      });
    }, 'scripted Simulate operation');
    var response = fixture.calls.find(function(call) {
      return call[0] === 'JSLAB_SIMULATE_AUTOMATION_RESULT' && call[1].id === 17;
    });
    assert.equal(response[1].success, true);
    assert.equal(fixture.window.parameter_bindings.get('gain'), '5');
    var animation = fixture.calls.find(function(call) {
      return call[0] === 'JSLAB_SIMULATE_ANIMATION';
    });
    assert.equal(animation[1].options.loop, true);
  });

guiTest(tests, 'simulate', 'Simulate diagram supports block, wire, pan and zoom interactions',
  ['#simulate-diagram-svg', '#simulate-diagram-zoom-in',
    '#simulate-diagram-zoom-out', '#simulate-diagram-fit'], async function(assert, fixture) {
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-port').length >= 4;
    }, 'diagram ports');
    var component = fixture.query('.simulate-component');
    var untouched_wire = fixture.document.querySelectorAll('.simulate-connection')[1];
    var untouched_path = untouched_wire.getAttribute('d');
    fixture.pointer(component, 'pointerdown', 100, 100);
    fixture.pointer(fixture.window, 'pointermove', 125, 115);
    fixture.pointer(fixture.window, 'pointerup', 125, 115);
    assert.equal(fixture.document.querySelectorAll('.simulate-connection')[1].getAttribute('d'), untouched_path);
    var second_component = fixture.document.querySelectorAll('.simulate-component')[1];
    var first_transform = component.getAttribute('transform');
    var second_transform = second_component.getAttribute('transform');
    fixture.pointer(second_component, 'pointerdown', 140, 100, { shiftKey: true });
    fixture.pointer(fixture.window, 'pointermove', 160, 110, { shiftKey: true });
    fixture.pointer(fixture.window, 'pointerup', 160, 110, { shiftKey: true });
    assert.notEqual(component.getAttribute('transform'), first_transform);
    assert.notEqual(second_component.getAttribute('transform'), second_transform);
    assert.equal(fixture.document.querySelectorAll('.simulate-component.selected').length, 2);
    var wire_hit = fixture.document.querySelectorAll('.simulate-connection-hit')[1];
    var wire_before = fixture.document.querySelectorAll('.simulate-connection')[1].getAttribute('d');
    fixture.pointer(wire_hit, 'pointerdown', 200, 200);
    fixture.pointer(fixture.query('.simulate-wire-segment'), 'pointerdown', 200, 200);
    fixture.pointer(fixture.window, 'pointermove', 200, 225);
    var wire_after = fixture.document.querySelectorAll('.simulate-connection')[1].getAttribute('d');
    assert.notEqual(wire_after, wire_before);
    assert.ok(wire_after.includes('Q'));
    fixture.pointer(fixture.window, 'pointerup', 200, 225);
    var svg = fixture.query('#simulate-diagram-svg');
    fixture.pointer(svg, 'pointerdown', 300, 300);
    fixture.pointer(fixture.window, 'pointermove', 320, 330);
    assert.ok(fixture.document.querySelector('.simulate-selection-box'));
    fixture.pointer(fixture.window, 'pointerup', 320, 330);
    assert.equal(fixture.document.querySelector('.simulate-selection-box'), null);
    fixture.pointer(svg, 'pointerdown', 300, 300, { button: 1, buttons: 4 });
    fixture.pointer(fixture.window, 'pointermove', 320, 330, { button: 1, buttons: 4 });
    fixture.pointer(fixture.window, 'pointerup', 320, 330, { button: 1, buttons: 0 });
    svg.dispatchEvent(new fixture.window.WheelEvent('wheel', { deltaY: -100, clientX: 200, clientY: 200, bubbles: true, cancelable: true }));
    var transform = fixture.query('#simulate-diagram-layer').getAttribute('transform');
    fixture.click('#simulate-diagram-zoom-in');
    assert.notEqual(fixture.query('#simulate-diagram-layer').getAttribute('transform'), transform);
    fixture.click('#simulate-diagram-zoom-out');
    var resize_transform = fixture.query('#simulate-diagram-layer').getAttribute('transform');
    fixture.window.adaptDiagramView(
      { width: 600, height: 400, center_x: 300, center_y: 200 },
      { width: 900, height: 600, center_x: 450, center_y: 300 });
    assert.notEqual(fixture.query('#simulate-diagram-layer').getAttribute('transform'), resize_transform);
    var ports = fixture.document.querySelectorAll('.simulate-port');
    fixture.document.elementFromPoint = function() {
      return ports[1];
    };
    fixture.pointer(ports[0], 'pointerdown', 100, 100);
    fixture.pointer(fixture.window, 'pointermove', 150, 100);
    fixture.pointer(fixture.window, 'pointerup', 150, 100);
    assert.ok(component.getAttribute('transform').includes('translate'));
  });

guiTest(tests, 'simulate', 'Simulate context actions insert at the pointer, edit blocks and delete their connections',
  ['#simulate-diagram-svg', '#simulate-tree'], async function(assert, fixture) {
    const controller = fixture.window.win_simulate;
    await fixture.waitFor(() => fixture.document.querySelectorAll('.simulate-component').length == 4, 'initial diagram');
    fixture.window.editor.setValue('model ModelName\n parameter Real gain = 1;\n' +
      ' Modelica.Blocks.Sources.TimeTable source annotation(Placement(transformation(origin={-30,0},extent={{-10,-10},{10,10}})));\n' +
      ' Modelica.Blocks.Math.Gain sink annotation(Placement(transformation(origin={30,0},extent={{-10,-10},{10,10}})));\n' +
      'equation\n connect(source.y, sink.u);\nend ModelName;');
    await fixture.waitFor(() => controller.model?.name == 'ModelName', 'parsed editable diagram');
    const svg = fixture.query('#simulate-diagram-svg');
    const bounds = svg.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const point = controller.diagramPoint(x, y);
    svg.dispatchEvent(new fixture.window.MouseEvent('contextmenu', { bubbles: true, clientX: x, clientY: y }));
    assert.equal(fixture.query('#simulate-context-menu').style.display, 'block');
    fixture.click('#simulate-context-menu [data-action="add-block"]');
    fixture.query('#simulate-library-items button').click();
    await fixture.waitFor(() => controller.model.components.some(item => item.name == 'timeTable'), 'inserted context block');
    const inserted = controller.model.components.find(item => item.name == 'timeTable');
    assert.ok(inserted);
    assert.ok(Math.abs(inserted.placement.x - point.x) < 1);
    assert.ok(Math.abs(inserted.placement.y + point.y) < 1);
    fixture.query('[data-component="source"]').dispatchEvent(new fixture.window.MouseEvent('contextmenu', { bubbles: true }));
    assert.equal(controller.selected_components.has('source'), true);
    fixture.click('#simulate-context-menu [data-action="properties"]');
    await fixture.waitFor(() => !fixture.query('#simulate-component-dialog').hidden, 'context block properties');
    fixture.click('#simulate-component-cancel');
    controller.component_bindings.set('source\u0000gain', 'gain');
    fixture.query('[data-component="source"]').dispatchEvent(new fixture.window.MouseEvent('contextmenu', { bubbles: true }));
    fixture.click('#simulate-context-menu [data-action="delete"]');
    await fixture.waitFor(() => !controller.model.components.some(item => item.name == 'source'), 'deleted context block');
    assert.equal(controller.model.connections.some(item => item.from.startsWith('source.') || item.to.startsWith('source.')), false);
    assert.equal(controller.component_bindings.has('source\u0000gain'), false);
    svg.dispatchEvent(new fixture.window.MouseEvent('contextmenu', { bubbles: true }));
    fixture.key('#simulate-context-menu button', 'Escape');
    assert.equal(fixture.query('#simulate-context-menu').style.display, 'none');
    svg.dispatchEvent(new fixture.window.MouseEvent('contextmenu', { bubbles: true }));
    svg.dispatchEvent(new fixture.window.WheelEvent('wheel', { bubbles: true, deltaY: 10 }));
    assert.equal(fixture.query('#simulate-context-menu').style.display, 'none');
    for(const event of ['blur', 'resize']) {
      svg.dispatchEvent(new fixture.window.MouseEvent('contextmenu', { bubbles: true }));
      assert.equal(fixture.query('#simulate-context-menu').style.display, 'block');
      fixture.window.dispatchEvent(new fixture.window.Event(event));
      assert.equal(fixture.query('#simulate-context-menu').style.display, 'none');
    }
    controller.setBusy(true);
    svg.dispatchEvent(new fixture.window.MouseEvent('contextmenu', { bubbles: true }));
    assert.equal(fixture.query('#simulate-context-menu').style.display, 'none');
    controller.setBusy(false);
  });

guiTest(tests, 'simulate', 'Simulate browses nested categories separately from blocks and keeps search independent',
  ['#simulate-library-categories'], async function(assert, fixture) {
    const controller = fixture.window.win_simulate;
    fixture.click('#simulate-library-open');
    const tree = fixture.query('#simulate-library-categories');
    assert.equal(tree.getAttribute('role'), 'tree');
    for(const category of tree.querySelectorAll('[data-library-type]')) {
      if(category.dataset.libraryType.includes('.')) {
        assert.ok(Number(category.getAttribute('aria-level')) > 1, category.dataset.libraryType);
      }
    }
    assert.ok(tree.querySelector('[data-library-type="Modelica.Blocks"]'));
    assert.equal(tree.querySelector('[data-library-type="Modelica.Blocks.Sources"]'), null);
    fixture.click('#simulate-library-categories [data-library-type="Modelica.Blocks"]');
    await fixture.waitFor(() => controller.library_parent == 'Modelica.Blocks', 'selected category');
    assert.ok(tree.querySelector('[data-library-type="Modelica.Blocks.Sources"]'));
    assert.equal(fixture.query('#simulate-library-items').querySelector('[data-library-type="Modelica.Blocks.Sources"]'), null);
    assert.ok(fixture.query('#simulate-library-items [data-library-type="Modelica.Blocks.Discrete.FirstOrderHold"]'));
    assert.ok(tree.querySelector('[data-library-type="Modelica.Blocks.Interfaces"]'));
    assert.equal(tree.querySelector('[data-library-type="Modelica.Icons"]'), null);
    fixture.click('#simulate-library-categories [data-library-type="Modelica.Blocks.Sources"]');
    await fixture.waitFor(() => controller.library_parent == 'Modelica.Blocks.Sources', 'source blocks');
    assert.ok(fixture.query('#simulate-library-items [data-library-type="Modelica.Blocks.Sources.TimeTable"]'));
    assert.equal(tree.querySelector('[data-library-type="Modelica.Blocks.Sources"]').getAttribute('aria-selected'), 'true');
    assert.deepEqual(Array.from(fixture.query('#simulate-library-category-name').querySelectorAll('button'))
      .map(button => button.dataset.categoryPath), ['', 'Modelica', 'Modelica.Blocks', 'Modelica.Blocks.Sources']);
    fixture.click('#simulate-library-category-name [data-category-path="Modelica.Blocks"]');
    await fixture.waitFor(() => controller.library_parent == 'Modelica.Blocks', 'breadcrumb parent');
    assert.ok(fixture.query('#simulate-library-items [data-library-type="Modelica.Blocks.Discrete.FirstOrderHold"]'));
    fixture.click('#simulate-library-categories [data-library-type="Modelica.Blocks.Sources"]');
    await fixture.waitFor(() => controller.library_parent == 'Modelica.Blocks.Sources', 'breadcrumb return');
    const category = tree.querySelector('[data-library-type="Modelica.Blocks"]');
    category.focus();
    fixture.key('#simulate-library-categories [data-library-type="Modelica.Blocks"]', 'ArrowLeft');
    assert.equal(tree.querySelector('[data-library-type="Modelica.Blocks.Sources"]'), null);
    assert.ok(fixture.query('#simulate-library-items [data-library-type="Modelica.Blocks.Sources.TimeTable"]'));
    fixture.key('#simulate-library-categories [data-library-type="Modelica.Blocks"]', 'ArrowRight');
    assert.ok(tree.querySelector('[data-library-type="Modelica.Blocks.Sources"]'));
    const selector = '[data-library-type="Modelica.Blocks"]';
    tree.querySelector(selector).previousElementSibling.click();
    assert.equal(tree.querySelector('[data-library-type="Modelica.Blocks.Sources"]'), null);
    tree.querySelector(selector).previousElementSibling.click();
    assert.ok(tree.querySelector('[data-library-type="Modelica.Blocks.Sources"]'));
    fixture.input('#simulate-library-search', 'BodyShape', 'input');
    assert.equal(fixture.document.querySelectorAll('#simulate-library-items [data-library-type]').length, 1);
    assert.ok(fixture.query('#simulate-library-items [data-library-type="Modelica.Mechanics.MultiBody.Parts.BodyShape"]'));
    fixture.input('#simulate-library-search', 'no-matching-library-block', 'input');
    assert.equal(fixture.query('#simulate-library-items').textContent, fixture.window.language.currentString(693));
    fixture.input('#simulate-library-search', '', 'input');
    assert.ok(fixture.query('#simulate-library-items [data-library-type="Modelica.Blocks.Sources.TimeTable"]'));
    fixture.click('#simulate-library-categories [data-library-type=""]');
    assert.equal(fixture.document.querySelectorAll('#simulate-library-items button').length, 10);
    const browse = controller.compiler.libraryClasses;
    let finish;
    controller.compiler.libraryClasses = () => new Promise(resolve => {
      finish = resolve;
    });
    fixture.click('#simulate-library-categories [data-library-type="Modelica"]');
    fixture.click('#simulate-library-categories [data-library-type=""]');
    finish([]);
    await fixture.tick();
    assert.equal(controller.library_parent, '');
    assert.equal(fixture.document.querySelectorAll('#simulate-library-items button').length, 10);
    controller.compiler.libraryClasses = browse;
  });

guiTest(tests, 'simulate', 'Simulate creates models from library blocks with editable units',
  ['#simulate-library-open'], async function(assert, fixture) {
    fixture.click('#simulate-new');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 0;
    }, 'empty model');
    await new Promise(function(resolve) {
      fixture.window.setTimeout(resolve, 300);
    });
    fixture.click('#simulate-library-open');
    assert.equal(fixture.query('#simulate-library-dialog').hidden, false);
    assert.equal(fixture.document.querySelectorAll('#simulate-library-items button').length, 10);
    fixture.document.querySelector('#simulate-library-items button').click();
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 1;
    }, 'inserted source');
    assert.ok(fixture.window.editor.getValue().includes('TimeTable timeTable'));
    assert.ok(fixture.document.querySelector('[data-reference="timeTable.y"]'));
    fixture.click('#simulate-library-open');
    fixture.input('#simulate-library-search', 'BodyShape', 'input');
    assert.equal(fixture.document.querySelectorAll('#simulate-library-items button').length, 1);
    fixture.document.querySelector('#simulate-library-items button').click();
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 2;
    }, 'inserted body');
    fixture.query('[data-component="bodyShape"]').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
    await fixture.waitFor(function() {
      return fixture.document.querySelector('.simulate-property-type select');
    }, 'unit selector');
    var unit = fixture.query('.simulate-property-type select');
    unit.value = 'mm';
    unit.dispatchEvent(new fixture.window.Event('change'));
    var value = fixture.query('.simulate-property-row input');
    assert.ok(value.placeholder.includes('1000'));
    value.value = '50';
    value.dispatchEvent(new fixture.window.Event('input'));
    fixture.click('#simulate-properties-advanced');
    unit = fixture.query('.simulate-property-type select');
    assert.equal(unit.value, 'mm');
    assert.equal(fixture.query('.simulate-property-row input').value, '50');
    unit.value = 'm';
    unit.dispatchEvent(new fixture.window.Event('change'));
    fixture.emit('SimulateWindow', 'set-language', 'rs');
    assert.equal(fixture.query('.simulate-property-name span').textContent, 'Dužina oblika');
    assert.equal(fixture.query('.simulate-property-name span').title, 'Dužina oblika');
    fixture.emit('SimulateWindow', 'set-language', 'rsc');
    assert.equal(fixture.query('.simulate-property-name span').textContent, 'Дужина облика');
    fixture.click('#simulate-component-apply');
    assert.equal(fixture.window.component_bindings.get('bodyShape\u0000length'), '0.05');
    await new Promise(function(resolve) {
      fixture.window.setTimeout(resolve, 300);
    });
    fixture.click('[data-component="bodyShape"]');
    fixture.key(null, 'Delete');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 1;
    }, 'removed body');
    assert.ok(!fixture.window.editor.getValue().includes('BodyShape bodyShape'));
  });

guiTest(tests, 'simulate', 'Simulate displays translated library categories and medium property types in every language',
  ['#simulate-library-categories'], async function(assert, fixture) {
    fixture.click('#simulate-new');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 0;
    }, 'empty model');
    fixture.click('#simulate-library-open');
    fixture.click('#simulate-library-categories [data-library-type="Modelica"]');
    await fixture.waitFor(function() {
      return Array.from(fixture.document.querySelectorAll('#simulate-library-categories button')).some(function(button) {
        return button.textContent.includes('Complex Blocks');
      });
    }, 'standard library folders');
    fixture.emit('SimulateWindow', 'set-language', 'rs');
    assert.ok(fixture.query('#simulate-library-categories').textContent.includes('Kompleksni blokovi'));
    var complexFolder = Array.from(fixture.document.querySelectorAll('#simulate-library-categories button')).find(function(button) {
      return button.textContent.includes('Kompleksni blokovi');
    });
    assert.ok(complexFolder.title.includes('kompleksnim signalima'));
    fixture.emit('SimulateWindow', 'set-language', 'rsc');
    assert.ok(fixture.query('#simulate-library-categories').textContent.includes('Комплексни блокови'));
    fixture.input('#simulate-library-search', 'DynamicPipe', 'input');
    fixture.document.querySelector('#simulate-library-items button').click();
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="dynamicPipe"]');
    }, 'inserted pipe');
    fixture.query('[data-component="dynamicPipe"]').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
    await fixture.waitFor(function() {
      return fixture.document.querySelector('.simulate-property-row');
    }, 'pipe properties');
    fixture.click('#simulate-properties-advanced');
    function pressureRow() {
      return Array.from(fixture.document.querySelectorAll('.simulate-property-row')).find(function(row) {
        return row.querySelector('strong').textContent == 'p_a_start';
      });
    }
    for(const [language, type, help] of [
      ['en', 'Absolute Pressure', 'Start value of pressure at port a'],
      ['rs', 'Apsolutni pritisak', 'Početna vrednost pritiska na priključku a'],
      ['rsc', 'Апсолутни притисак', 'Почетна вредност притиска на прикључку a']
    ]) {
      fixture.emit('SimulateWindow', 'set-language', language);
      assert.equal(pressureRow().querySelector('.simulate-property-type').textContent, type);
      assert.equal(pressureRow().querySelector('.simulate-property-name span').textContent, help);
    }
    assert.equal(fixture.window.simulateTypeLabel('External.Ground'), 'Ground');
    assert.equal(fixture.window.simulateTypeLabel('External.AbsolutePressure'), 'AbsolutePressure');
  });

guiTest(tests, 'simulate', 'Simulate library search loads further results and inserts World with the required scope',
  ['#simulate-library-open'], async function(assert, fixture) {
    fixture.click('#simulate-new');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 0;
    }, 'empty model');
    fixture.click('#simulate-library-open');
    fixture.input('#simulate-library-search', 'Modelica.', 'input');
    assert.equal(fixture.document.querySelectorAll('#simulate-library-items [data-library-type]').length, 150);
    fixture.click('.simulate-library-more');
    assert.equal(fixture.document.querySelectorAll('#simulate-library-items [data-library-type]').length, 300);
    fixture.input('#simulate-library-search', 'World', 'input');
    fixture.document.querySelector('#simulate-library-items [data-library-type]').click();
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="world"]');
    }, 'inserted world');
    assert.ok(fixture.window.editor.getValue().includes('inner Modelica.Mechanics.MultiBody.World world'));
  });

guiTest(tests, 'simulate', 'Simulate imports and inserts a standalone external block without a package wrapper',
  ['#simulate-library-import-file'], async function(assert, fixture) {
    fixture.click('#simulate-new');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 0;
    }, 'empty model');
    fixture.click('#simulate-library-open');
    var input = fixture.query('#simulate-library-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'External.mo',
      arrayBuffer: async function() {
        return Buffer.from('block External parameter Real gain=2; end External;');
      } }] });
    input.dispatchEvent(new fixture.window.Event('change'));
    await fixture.waitFor(function() {
      var button = fixture.document.querySelector('[data-library-type="External"]');
      return button && !button.disabled;
    }, 'standalone external root');
    fixture.emit('SimulateWindow', 'set-language', 'rsc');
    fixture.input('#simulate-library-search', 'External', 'input');
    var button = fixture.query('[data-library-type="External"]');
    assert.equal(button.textContent, 'External');
    assert.equal(button.title, 'External description');
    fixture.input('#simulate-library-search', '', 'input');
    fixture.window.win_simulate.library_classes = null;
    fixture.window.win_simulate.renderBlockLibrary();
    fixture.query('[data-library-type="External"]').click();
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="external1"]');
    }, 'inserted external block');
    assert.ok(fixture.window.editor.getValue().includes('External external1'));
  });

guiTest(tests, 'simulate', 'Simulate preserves external block labels and property help inside a Modelica namespace',
  [], async function(assert, fixture) {
    fixture.emit('SimulateWindow', 'set-language', 'rsc');
    fixture.window.editor.setValue('model ModelName\n Modelica.External.Gain42 custom annotation(Placement(transformation(origin={0,0},extent={{-10,-10},{10,10}})));\nend ModelName;');
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="custom"]');
    }, 'external block');
    assert.equal(fixture.query('.simulate-tree-type').textContent, 'Gain42');
    fixture.query('.simulate-component').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-property-row').length === 2;
    }, 'external property schema');
    assert.equal(fixture.query('.simulate-property-name span').textContent, 'Block gain');
    assert.equal(fixture.query('#simulate-component-summary strong').textContent, 'Gain42');
    assert.ok(fixture.query('#simulate-component-summary').textContent.includes('Test block'));
  });

guiTest(tests, 'simulate', 'Simulate honors declared numeric units, preferred display units and final fields',
  [], async function(assert, fixture) {
    fixture.window.editor.setValue('model ModelName\n External.UnitGain custom(distance=1000) annotation(Placement(transformation(origin={0,0},extent={{-10,-10},{10,10}})));\nend ModelName;');
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="custom"]');
    }, 'unit-aware external block');
    fixture.query('.simulate-component').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-property-row').length === 2;
    }, 'unit-aware settings');
    var distance = fixture.query('[data-property="distance"]');
    var unit = distance.querySelector('.simulate-property-type select');
    var value = distance.querySelector('input');
    assert.equal(unit.value, 'm');
    assert.equal(fixture.window.eval(value.value), 1);
    var fixed = fixture.query('[data-property="fixedGain"]');
    assert.equal(fixed.querySelector('input').disabled, true);
    assert.equal(fixed.querySelector('.simulate-property-reset').disabled, true);
    value.value = '2';
    value.dispatchEvent(new fixture.window.Event('input'));
    fixture.click('#simulate-component-apply');
    assert.equal(fixture.window.component_bindings.get('custom\u0000distance'), '2000');
  });

guiTest(tests, 'simulate', 'Simulate rejects reserved or colliding names before changing model source',
  ['#simulate-component-apply', '#simulate-parameters-apply'], async function(assert, fixture) {
    fixture.window.editor.setValue('model ModelName\n parameter Real gain=2;\nequation\nend ModelName;');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 0 &&
        fixture.document.querySelectorAll('#simulate-parameters input[data-field="name"]').length === 1;
    }, 'editable model');
    fixture.click('#simulate-library-open');
    fixture.document.querySelector('#simulate-library-items button').click();
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="timeTable"]');
    }, 'inserted source');
    fixture.query('[data-component="timeTable"]').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
    await fixture.waitFor(function() {
      return fixture.document.querySelector('#simulate-component-name');
    }, 'component settings');
    var source = fixture.window.editor.getValue();
    for(const name of ['gain', 'equation', 'external']) {
      fixture.input('#simulate-component-name', name, 'input');
      fixture.click('#simulate-component-apply');
      assert.equal(fixture.window.editor.getValue(), source);
      assert.equal(fixture.query('#simulate-component-dialog').hidden, false);
      assert.ok(fixture.query('#simulate-component-dialog [role="alert"]').textContent.length > 0);
      assert.equal(fixture.query('#simulate-component-name').value, name);
      assert.equal(fixture.query('#simulate-console').classList.contains('collapsed'), false);
    }
    fixture.input('#simulate-component-name', 'sourceData', 'input');
    fixture.click('#simulate-component-apply');
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="sourceData"]');
    }, 'renamed source');
    fixture.click('#simulate-parameters-menu');
    source = fixture.window.editor.getValue();
    for(const name of ['sourceData', 'constant']) {
      fixture.input('#simulate-parameters input[data-field="name"]', name, 'input');
      fixture.click('#simulate-parameters-apply');
      assert.equal(fixture.window.editor.getValue(), source);
      assert.equal(fixture.query('#simulate-parameters-dialog').hidden, false);
      assert.ok(fixture.query('#simulate-parameters-dialog [role="alert"]').textContent.length > 0);
      assert.equal(fixture.query('#simulate-parameters input[data-field="name"]').value, name);
    }
  });

guiTest(tests, 'simulate', 'Simulate record fields bind expressions, protect final fields and reset one field independently',
  ['#simulate-component-apply', '#simulate-build'], async function(assert, fixture) {
    fixture.click('#simulate-new');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 0;
    }, 'empty model');
    fixture.click('#simulate-library-open');
    fixture.input('#simulate-library-search', 'AIM_SquirrelCage', 'input');
    fixture.query('[data-library-type="Modelica.Electrical.Machines.BasicMachines.AsynchronousInductionMachines.AIM_SquirrelCage"]').click();
    await fixture.waitFor(function() {
      return fixture.document.querySelector('.simulate-component');
    }, 'inserted machine');
    async function openFields() {
      fixture.query('.simulate-component').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
      await fixture.waitFor(function() {
        return fixture.document.querySelector('.simulate-property-row');
      }, 'block settings');
      fixture.click('#simulate-properties-advanced');
      await fixture.waitFor(function() {
        return fixture.document.querySelector('[data-property="frictionParameters"] .simulate-property-fields');
      }, 'record settings');
      assert.equal(fixture.query('[data-property="frictionParameters"] .simulate-property-fields').textContent, 'Fields');
      fixture.query('[data-property="frictionParameters"] .simulate-property-fields').click();
    }
    await openFields();
    var fixed = fixture.query('[data-property="frictionParameters.tauRef"] input');
    assert.equal(fixed.disabled, true);
    for(const [language, help] of [['rs', 'Referentni gubici trenja pri wRef'], ['rsc', 'Референтни губици трења при wRef']]) {
      fixture.emit('SimulateWindow', 'set-language', language);
      assert.equal(fixture.query('[data-property="frictionParameters.PRef"] .simulate-property-name span').textContent, help);
    }
    fixture.emit('SimulateWindow', 'set-language', 'en');
    fixture.input('[data-property="frictionParameters.PRef"] input', 'lossPower', 'input');
    fixture.input('[data-property="frictionParameters.wRef"] input', '100', 'input');
    fixture.data.set('simulate-resolve:lossPower', '25');
    fixture.data.set('simulate-resolve:100', '100');
    fixture.click('#simulate-component-apply');
    await new Promise(resolve => fixture.window.setTimeout(resolve, 300));
    fixture.click('#simulate-build');
    await fixture.waitFor(function() {
      return fixture.calls.some(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE');
    }, 'record expression compilation');
    var compiled = fixture.calls.filter(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE');
    assert.ok(compiled[0][1].source.includes('frictionParameters(PRef = 25,wRef = 100)'));
    await openFields();
    fixture.query('[data-property="frictionParameters.PRef"] .simulate-property-reset').click();
    fixture.click('#simulate-component-apply');
    await new Promise(resolve => fixture.window.setTimeout(resolve, 300));
    fixture.click('#simulate-build');
    await fixture.waitFor(function() {
      return fixture.calls.filter(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE').length === 2;
    }, 'record field reset');
    compiled = fixture.calls.filter(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE');
    assert.ok(compiled[1][1].source.includes('frictionParameters(wRef = 100)'));
    await openFields();
    fixture.input('[data-property="frictionParameters"] input', 'frictionData', 'input');
    fixture.data.set('simulate-value:frictionData', { PRef: 40 });
    fixture.click('#simulate-component-apply');
    await new Promise(resolve => fixture.window.setTimeout(resolve, 300));
    fixture.click('#simulate-build');
    await fixture.waitFor(function() {
      return fixture.calls.filter(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE').length === 3;
    }, 'record object compilation');
    compiled = fixture.calls.filter(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE');
    assert.ok(compiled[2][1].source.includes('frictionParameters(wRef = 100,PRef = 40)'));
    fixture.data.set('simulate-value:frictionData', { tauRef: 2 });
    fixture.emit('SimulateWindow', 'set-language', 'rs');
    await new Promise(resolve => fixture.window.setTimeout(resolve, 100));
    fixture.click('#simulate-build');
    await fixture.waitFor(function() {
      return fixture.query('#simulate-output').textContent.includes('samo za čitanje');
    }, 'translated final-field validation');
    assert.equal(fixture.calls.filter(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE').length, 3);
    assert.ok(!compiled[1][1].source.includes('PRef = 25'));
  });

guiTest(tests, 'simulate', 'Simulate initialization edits preserve bindings and final property controls',
  ['#simulate-component-apply', '#simulate-build'], async function(assert, fixture) {
    fixture.window.editor.setValue('model ModelName\n Modelica.Fluid.Pipes.DynamicPipe pipe(final nNodes=2, m_flows(each start=1,each fixed=true)={3,3,3}) annotation(Placement(transformation(origin={0,0},extent={{-10,-10},{10,10}})));\nend ModelName;');
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="pipe"]');
    }, 'pipe diagram');
    async function openProperties() {
      fixture.query('[data-component="pipe"]').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
      await fixture.waitFor(function() {
        return fixture.document.querySelector('.simulate-property-row');
      }, 'pipe settings');
      fixture.click('#simulate-properties-advanced');
    }
    await openProperties();
    assert.equal(fixture.query('[data-property="nNodes"] input').disabled, true);
    assert.equal(fixture.query('[data-property="nNodes"] .simulate-property-reset').disabled, true);
    assert.equal(fixture.query('[data-property="m_flows"] input').value, '1');
    fixture.input('[data-property="m_flows"] input', 'flowStart', 'input');
    fixture.data.set('simulate-value:flowStart', 2);
    fixture.click('#simulate-component-apply');
    await new Promise(resolve => fixture.window.setTimeout(resolve, 300));
    fixture.click('#simulate-build');
    await fixture.waitFor(function() {
      return fixture.calls.some(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE');
    }, 'initial-value compilation');
    var compiled = fixture.calls.filter(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE');
    assert.ok(compiled[0][1].source.includes('m_flows(each start= 2,each fixed=true)={3,3,3}'));
    await openProperties();
    fixture.query('[data-property="m_flows"] .simulate-property-reset').click();
    fixture.click('#simulate-component-apply');
    await new Promise(resolve => fixture.window.setTimeout(resolve, 300));
    assert.ok(fixture.window.editor.getValue().includes('m_flows(each fixed=true)={3,3,3}'));
    assert.ok(fixture.window.editor.getValue().includes('final nNodes=2'));
  });

guiTest(tests, 'simulate', 'Simulate parameter editing changes only the selected workspace binding',
  ['#simulate-parameters-apply', '#simulate-build'], async function(assert, fixture) {
    fixture.window.editor.setValue('model ModelName\n parameter Real mass=150;\n parameter Real vector[2]={mass,mass^2};\n parameter Real weights[2]={i for i in 1:2};\n parameter String label="Keep {x}; deg2rad(30)";\nend ModelName;');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-parameter input[data-field="value"]').length === 4;
    }, 'real imported parameters');
    fixture.click('#simulate-parameters-menu');
    var values = fixture.document.querySelectorAll('.simulate-parameter input[data-field="value"]');
    assert.equal(values[0].value, '150');
    assert.equal(values[1].value, '[mass, (mass ** 2)]');
    assert.equal(values[2].placeholder, 'Default value');
    assert.equal(values[3].value, '"Keep {x}; deg2rad(30)"');
    fixture.input('.simulate-parameter input[data-field="value"]', '200', 'input');
    fixture.click('#simulate-parameters-apply');
    assert.equal(fixture.query('#simulate-parameters-dialog').hidden, true);
    assert.equal(fixture.window.parameter_bindings.get('mass'), '200');
    for(const name of ['vector', 'weights', 'label']) {
      assert.equal(fixture.window.parameter_bindings.has(name), false);
    }
    await new Promise(resolve => fixture.window.setTimeout(resolve, 300));
    fixture.data.set('simulate-value:200', 200);
    fixture.click('#simulate-build');
    await fixture.waitFor(function() {
      return fixture.calls.some(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE');
    }, 'one parameter binding compilation');
    var source = fixture.calls.find(call => call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE')[1].source;
    assert.ok(source.includes('mass=200'));
    assert.ok(source.includes('vector[2]={mass,mass^2}'));
    assert.ok(source.includes('weights[2]={i for i in 1:2}'));
    assert.ok(source.includes('label="Keep {x}; deg2rad(30)"'));
  });

guiTest(tests, 'simulate', 'Simulate imports external sources and includes them in project saves',
  ['#simulate-library-import-file'], async function(assert, fixture) {
    fixture.emit('SimulateWindow', 'set-language', 'rs');
    assert.equal(fixture.window.propertyLabel({ name: 'm', description: 'Number of phases' }), 'Broj faza');
    assert.equal(fixture.window.propertyLabel({ name: 'm', description: 'An unrelated vendor field' }), '');
    assert.equal(fixture.window.propertyChoiceLabel({ type: 'External.GravityTypes' }, 'NoGravity'), 'NoGravity');
    assert.equal(fixture.window.simulateTypeLabel('External.Gain'), 'Gain');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.External.Gain42'), 'Gain42');
    assert.equal(fixture.window.simulateClassDescription('External.Gain', 'Original vendor description'),
      'Original vendor description');
    assert.notEqual(fixture.window.simulateTypeLabel('Modelica.Blocks.Math.Gain'), 'Gain');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.StateGraph.Step'), 'Običan korak');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.ComplexBlocks.ComplexMath.Gain'), 'Kompleksno pojačanje');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.Analog.Basic.Ground'), 'Uzemljenje');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.Analog.Sensors.PotentialSensor'), 'Senzor električnog potencijala');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.Analog.Semiconductors.NMOS'), 'NMOS tranzistor');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.Digital.Sources.Clock'), 'Digitalni takt');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.MultiPhase.Basic.Star'), 'Veza zvezda');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.MultiPhase.Basic.Delta'), 'Veza trougao');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.PowerConverters.DCDC.ChopperStepUp'), 'Podižući čoper');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Fluid.Pipes.DynamicPipe'), 'Dinamička cev');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Fluid.Sensors.MassFlowRate'), 'Senzor masenog protoka');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.SIunits.Voltage'), 'Napon');
    assert.equal(fixture.window.simulateTypeLabel('StateSelect'), 'Izbor promenljivih stanja');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Mechanics.MultiBody.Types.GravityTypes'), 'Gravitaciono polje');
    assert.equal(fixture.window.simulateTypeLabel('.Modelica.SIunits.AngularVelocity'), 'Ugaona brzina');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.QuasiStationary.SinglePhase.Basic.Admittance'),
      'Jednofazna admitansa');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.Machines.BasicMachines.Transformers.Dy.Dy11'),
      'Transformator Dy11');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Magnetic.FluxTubes.Basic.Ground'), 'Referentni magnetni potencijal');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Magnetic.FundamentalWave.BasicMachines.AsynchronousInductionMachines.AIM_SlipRing'),
      'Asinhrona mašina sa kliznim prstenovima');
    fixture.emit('SimulateWindow', 'set-language', 'rsc');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Magnetic.QuasiStatic.FluxTubes.Basic.ConstantReluctance'),
      'Стална магнетна отпорност');
    assert.equal(fixture.window.simulateTypeLabel('External.Ground'), 'Ground');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.External.Ground'), 'Ground');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.Machines.BasicMachines.Transformers.Dy.Dy11'),
      'Трансформатор Dy11');
    assert.equal(fixture.window.simulateTypeLabel('Modelica.Electrical.Spice3.Semiconductors.M_NMOS2'),
      'NMOS транзистор нивоа 2');
    fixture.emit('SimulateWindow', 'set-language', 'en');
    fixture.click('#simulate-library-open');
    var input = fixture.query('#simulate-library-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'External.mo',
      arrayBuffer: async function() {
        return Buffer.from('package External end External;');
      } }] });
    input.dispatchEvent(new fixture.window.Event('change'));
    await fixture.waitFor(function() {
      return fixture.window.win_simulate.project_libraries.some(library => library.roots.includes('External'));
    }, 'imported library root');
    fixture.click('#simulate-library-close');
    fixture.click('#simulate-save');
    var save = fixture.calls.find(function(call) {
      return call[0] == 'JSLAB_SIMULATE_SAVE';
    });
    assert.equal(save[1].libraries[0].entry, 'External.mo');
    assert.equal(Buffer.from(save[1].libraries[0].files[0].data, 'base64').toString(),
      'package External end External;');
  });

guiTest(tests, 'simulate', 'Simulate new, save and window controls are connected',
  ['#simulate-new', '#simulate-open', '#simulate-save', '#simulate-output-clear',
    '#simulate-parameters-menu', '#simulate-parameters-close', '#simulate-parameters-cancel', '#simulate-parameters-apply',
    '#simulate-simulation-settings', '#simulate-simulation-close', '#simulate-simulation-done',
    '#simulate-output-toggle',
    '#win-minimize', '#win-restore', '#win-close'], async function(assert, fixture) {
    fixture.click('#simulate-parameters-menu');
    assert.equal(fixture.query('#simulate-parameters-dialog').hidden, false);
    fixture.click('#simulate-simulation-settings');
    assert.equal(fixture.query('#simulate-parameters-dialog').hidden, true);
    assert.equal(fixture.query('#simulate-simulation-dialog').hidden, false);
    fixture.click('#simulate-simulation-close');
    fixture.click('#simulate-parameters-menu');
    fixture.click('#simulate-parameters-close');
    fixture.click('#simulate-parameters-menu');
    fixture.click('#simulate-parameters-cancel');
    assert.equal(fixture.query('#simulate-parameters-dialog').hidden, true);
    fixture.click('#simulate-parameters-menu');
    fixture.input('#simulate-parameters input[data-field="name"]', 'payload', 'input');
    fixture.input('#simulate-parameters select[data-field="type"]', 'Integer', 'input');
    fixture.input('#simulate-parameters input[data-field="value"]', '5', 'input');
    fixture.click('#simulate-parameter-add');
    assert.equal(fixture.document.querySelectorAll('.simulate-parameter input[data-field="value"]').length, 2);
    fixture.document.querySelectorAll('.simulate-parameter-remove')[1].click();
    fixture.click('#simulate-parameters-apply');
    assert.ok(fixture.window.editor.getValue().includes('parameter Integer payload'));
    assert.ok(!fixture.window.editor.getValue().includes('parameter Real parameter1 = 0;'));
    fixture.click('#simulate-simulation-settings');
    assert.equal(fixture.query('#simulate-simulation-dialog').hidden, false);
    fixture.click('#simulate-simulation-close');
    fixture.click('#simulate-simulation-settings');
    fixture.click('#simulate-simulation-done');
    assert.equal(fixture.query('#simulate-simulation-dialog').hidden, true);
    assert.ok(fixture.query('#simulate-console').classList.contains('collapsed'));
    fixture.click('#simulate-output-toggle');
    assert.ok(!fixture.query('#simulate-console').classList.contains('collapsed'));
    fixture.click('#simulate-output-toggle');
    assert.ok(fixture.query('#simulate-console').classList.contains('collapsed'));
    fixture.click('#simulate-new');
    assert.ok(fixture.window.editor.getValue().includes('model ModelName'));
    fixture.click('#simulate-save');
    fixture.click('#simulate-open');
    fixture.click('#simulate-output-clear');
    fixture.click('#win-minimize');
    fixture.click('#win-restore');
    fixture.click('#win-close');
    assert.ok(fixture.calls.some(function(call) {
      return call[0] === 'JSLAB_SIMULATE_SAVE';
    }));
    assert.ok(fixture.calls.some(function(call) {
      return call[0] === 'MainProcess' && call[1] === 'minimize-win';
    }));
    assert.ok(fixture.calls.some(function(call) {
      return call[0] === 'MainProcess' && call[1] === 'toggle-maximize-win';
    }));
    assert.ok(fixture.calls.some(function(call) {
      return call[0] === 'MainProcess' && call[1] === 'close-simulate';
    }));
    fixture.key(null, 's', { ctrlKey: true });
    fixture.key(null, 'o', { ctrlKey: true });
    fixture.key(null, 'F5');
    fixture.emit('SimulateWindow', 'focus');
    fixture.emit('SimulateWindow', 'set-language', 'rs');
    fixture.window.dispatchEvent(new fixture.window.Event('beforeunload'));
    assert.ok(fixture.calls.some(function(call) {
      return call[0] === 'JSLAB_OPENMODELICA_WASM_CLOSE';
    }));
  });

exports.MODULE_TESTS = tests;

guiTest(tests, 'simulate', 'Simulate selects standalone folder entries and discards canceled imports',
  ['#simulate-library-entry-import', '#simulate-library-entry-cancel', '#simulate-library-close'], async function(assert, fixture) {
    var controller = fixture.window.win_simulate;
    function file(path, source) {
      return { name: path.split('/').pop(), webkitRelativePath: 'Assets/' + path,
        arrayBuffer: async function() {
          return new TextEncoder().encode(source).buffer;
        } };
    }
    var files = [file('A.mo', 'block A\nend A;'), file('B.mo', 'block B\nend B;'),
      file('Resources/body.obj', 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')];
    fixture.click('#simulate-library-open');
    await controller.importProjectLibrary(files, true);
    assert.equal(fixture.query('#simulate-library-entry-choice').hidden, false, fixture.query('#simulate-library-items').textContent);
    assert.deepEqual(Array.from(fixture.query('#simulate-library-entry').options, option => option.value), ['A.mo', 'B.mo']);
    fixture.emit('SimulateWindow', 'set-language', 'rs');
    assert.ok(fixture.query('#simulate-library-entry-choice').textContent.includes('Izvorna datoteka'));
    fixture.click('#simulate-library-entry-cancel');
    assert.equal(controller.pending_library_import, null);
    assert.equal(fixture.calls.some(call => call[0] == 'JSLAB_IMPORT_LIBRARY'), false);
    await controller.importProjectLibrary(files, true);
    fixture.query('#simulate-library-entry').value = 'B.mo';
    fixture.click('#simulate-library-entry-import');
    await fixture.waitFor(function() {
      return !controller.busy && controller.project_libraries.length;
    }, 'selected library import');
    var imported = fixture.calls.find(call => call[0] == 'JSLAB_IMPORT_LIBRARY')[1];
    assert.equal(imported.entry, 'B.mo');
    assert.equal(imported.files.length, 3);
    assert.equal(new TextDecoder().decode(imported.files[2].data), 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
    var read;
    var pending = file('Late.mo', 'block Late\nend Late;');
    pending.arrayBuffer = function() {
      return new Promise(resolve => {
        read = resolve;
      });
    };
    var request = controller.importProjectLibrary([pending], true);
    fixture.click('#simulate-library-close');
    read(new TextEncoder().encode('block Late\nend Late;').buffer);
    await request;
    assert.equal(controller.project_libraries.length, 1);
    assert.equal(controller.pending_library_import, null);
    assert.equal(fixture.query('#simulate-library-entry-choice').hidden, true);
  });

guiTest(tests, 'simulate', 'Simulate choice fields support localized selections, workspace expressions and reset',
  ['#simulate-component-apply', '.simulate-property-choice'], async function(assert, fixture) {
    fixture.click('#simulate-new');
    await fixture.waitFor(function() {
      return fixture.document.querySelectorAll('.simulate-component').length === 0;
    }, 'empty model');
    await new Promise(function(resolve) {
      fixture.window.setTimeout(resolve, 300);
    });
    fixture.click('#simulate-library-open');
    fixture.input('#simulate-library-search', 'World', 'input');
    fixture.document.querySelector('#simulate-library-items button').click();
    await fixture.waitFor(function() {
      return fixture.document.querySelector('[data-component="world"]');
    }, 'inserted world');
    function row() {
      return Array.from(fixture.document.querySelectorAll('.simulate-property-row')).find(function(item) {
        return item.querySelector('strong').textContent == 'gravityType';
      });
    }
    async function open() {
      fixture.query('[data-component="world"]').dispatchEvent(new fixture.window.MouseEvent('dblclick', { bubbles: true }));
      await fixture.waitFor(function() {
        return row();
      }, 'gravity choice');
    }
    function select(value) {
      var control = row().querySelector('.simulate-property-choice');
      control.value = value;
      control.dispatchEvent(new fixture.window.Event('change'));
    }
    await open();
    fixture.emit('SimulateWindow', 'set-language', 'rs');
    assert.ok(row().querySelector('select').textContent.includes('Bez gravitacije'));
    select('NoGravity');
    fixture.click('#simulate-component-apply');
    assert.ok(fixture.window.editor.getValue().includes('gravityType = Modelica.Mechanics.MultiBody.Types.GravityTypes.NoGravity'));
    assert.equal(fixture.window.component_bindings.has('world\u0000gravityType'), false);
    await new Promise(function(resolve) {
      fixture.window.setTimeout(resolve, 300);
    });
    await open();
    assert.equal(row().querySelector('select').value, 'NoGravity');
    select('__expression__');
    var expression = row().querySelector('input');
    assert.equal(expression.hidden, false);
    expression.value = 'gravityMode';
    expression.dispatchEvent(new fixture.window.Event('input'));
    fixture.click('#simulate-component-apply');
    assert.equal(fixture.window.component_bindings.get('world\u0000gravityType'), 'gravityMode');
    fixture.data.set('simulate-resolve:gravityMode', '"PointGravity"');
    await new Promise(function(resolve) {
      fixture.window.setTimeout(resolve, 300);
    });
    fixture.click('#simulate-build');
    await fixture.waitFor(function() {
      return fixture.calls.some(function(call) {
        return call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE';
      });
    }, 'compiled expression');
    var compiled = fixture.calls.find(function(call) {
      return call[0] == 'JSLAB_OPENMODELICA_WASM_COMPILE';
    });
    assert.ok(compiled[1].source.includes('gravityType = Modelica.Mechanics.MultiBody.Types.GravityTypes.PointGravity'));
    await open();
    row().querySelector('.simulate-property-reset').click();
    fixture.click('#simulate-component-apply');
    assert.equal(fixture.window.component_bindings.has('world\u0000gravityType'), false);
    assert.equal(fixture.window.editor.getValue().includes('gravityType ='), false);
  });


guiTest(tests, 'simulate', 'Simulate releases pan mode, switches basic properties and handles canceled library selection',
  ['#simulate-properties-basic', '#simulate-library-import-file', '#simulate-library-import-folder'], async function(assert, fixture) {
    const controller = fixture.window.win_simulate;
    controller.diagram_space_pressed = true;
    fixture.window.dispatchEvent(new fixture.window.KeyboardEvent('keyup', { code: 'Space' }));
    assert.equal(controller.diagram_space_pressed, false);
    controller.property_advanced = true;
    fixture.click('#simulate-properties-basic');
    assert.equal(controller.property_advanced, false);
    assert.equal(fixture.query('#simulate-properties-basic').classList.contains('active'), true);
    fixture.click('#simulate-library-open');
    for(const kind of ['file', 'folder']) {
      const input = fixture.query('#simulate-library-' + kind);
      let opened = false;
      input.click = () => {
        opened = true;
      };
      fixture.click('#simulate-library-import-' + kind);
      assert.equal(opened, true);
      Object.defineProperty(input, 'files', { configurable: true, value: [] });
      input.dispatchEvent(new fixture.window.Event('change'));
    }
    await fixture.tick();
    assert.equal(controller.busy, false);
    fixture.click('#simulate-library-categories [data-library-type="Modelica"]');
    await fixture.waitFor(() => controller.library_parent == 'Modelica', 'library root');
    fixture.click('#simulate-library-categories [data-library-type=""]');
    assert.equal(controller.library_parent, '');
    fixture.click('#simulate-library-dialog');
    assert.equal(fixture.query('#simulate-library-dialog').hidden, true);
  });

guiTest(tests, 'simulate', 'Simulate lists unplaced and inherited components and protects inherited source',
  [], async function(assert, fixture) {
    var controller = fixture.window.win_simulate;
    await fixture.waitFor(() => !!controller.model, 'initial model');
    controller.compiler.modelSources = async function() {
      return [{ type: 'Base', source: 'model ModelName\n parameter Real inheritedValue=2;\n Gain inheritedGain annotation(Placement(transformation(origin={10,20})));\n Gain inheritedTarget annotation(Placement(transformation(origin={50,20})));\nequation\n connect(inheritedGain.y,inheritedTarget.u);\nend ModelName;',
        components: [{ name: 'inheritedGain', type: 'Modelica.Blocks.Math.Gain' }] }];
    };
    controller.editor.setValue('model ModelName\n extends Base;\n Gain unplaced;\nend ModelName;');
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    assert.equal(controller.model.components.length, 4);
    var inherited = controller.model.components.find(item => item.name == 'inheritedGain');
    assert.equal(inherited.inherited, true);
    assert.ok(fixture.query('.simulate-component[data-component="inheritedGain"]'));
    assert.equal(fixture.document.querySelector('.simulate-component[data-component="unplaced"]'), null);
    assert.ok(fixture.query('.simulate-tree-item[data-component="unplaced"]'));
    assert.equal(fixture.document.querySelector('.simulate-tree-status'), null);
    var source = controller.editor.getValue();
    var wire = controller.model.connections[0];
    assert.equal(wire.inherited, true);
    controller.removeConnectionSource(wire);
    fixture.query('.simulate-connection-hit').dispatchEvent(new fixture.window.MouseEvent('pointerdown',
      { bubbles: true, button: 0, clientX: 30, clientY: 30 }));
    assert.ok(!controller.wire_drag);
    assert.equal(fixture.document.querySelector('.simulate-wire-segment'), null);
    assert.equal(controller.editor.getValue(), source);
    controller.selected_components = new Set(['inheritedGain']);
    controller.deleteDiagramSelection();
    assert.equal(controller.editor.getValue(), source);
    await controller.showComponentProperties(inherited);
    assert.equal(fixture.query('#simulate-component-name').disabled, true);
    assert.equal(fixture.query('#simulate-component-apply').disabled, true);
    controller.hideComponentProperties();
    controller.showParameters();
    assert.equal(fixture.query('#simulate-parameters input[data-field="name"]').disabled, true);
    controller.applyParameters();
    assert.equal(controller.editor.getValue(), source);
  });

guiTest(tests, 'simulate', 'Parameter editing preserves sibling declarations when changing or deleting a shared member',
  [], async function(assert, fixture) {
    var controller = fixture.window.win_simulate;
    await fixture.waitFor(() => !!controller.model, 'initial model');
    controller.editor.setValue('model ModelName\n parameter Real a=1 "A", b=2 "B", c=3; Real keep;\nend ModelName;');
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    controller.showParameters();
    controller.parameter_draft[1].description = 'Changed';
    controller.parameter_draft[1].type = 'Integer';
    controller.parameter_draft.splice(0, 1);
    controller.applyParameters();
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    assert.deepEqual(Array.from(controller.model.parameters, item => item.name), ['b', 'c']);
    assert.equal(controller.model.parameters[0].description, 'Changed');
    assert.equal(controller.model.parameters[0].type, 'Integer');
    assert.equal(controller.model.parameters[1].value, '3');
    assert.ok(controller.model.components.some(item => item.name == 'keep'));
  });

guiTest(tests, 'simulate', 'Simulate preserves authored bends across redraws and persists routes after a user block move',
  [], async function(assert, fixture) {
    var controller = fixture.window.win_simulate;
    await fixture.waitFor(() => !!controller.model, 'initial model');
    var source = 'model ModelName\n Modelica.Blocks.Math.Gain a annotation(Placement(transformation(origin={-40,0},extent={{-10,-10},{10,10}})));\n Modelica.Blocks.Math.Gain b annotation(Placement(transformation(origin={40,0},extent={{-10,-10},{10,10}})));\n Modelica.Blocks.Math.Gain obstacle annotation(Placement(transformation(origin={0,-20},extent={{-10,-10},{10,10}})));\nequation\n connect(a.y,b.u) annotation(Line(points={{-30,0},{-20,0},{-20,-20},{20,-20},{20,0},{30,0}}));\nend ModelName;';
    controller.editor.setValue(source);
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    await fixture.waitFor(() => controller.diagram_nodes.has('a') && controller.diagram_nodes.has('b'), 'authored diagram');
    var original = Array.from(controller.model.connections[0].points, point => Array.from(point));
    var path = fixture.query('.simulate-connection').getAttribute('d');
    controller.renderDiagram();
    controller.diagram_fitted = false;
    controller.fitDiagram();
    assert.equal(fixture.query('.simulate-connection').getAttribute('d'), path);
    assert.equal(controller.editor.getValue(), source);
    assert.deepEqual(Array.from(controller.model.connections[0].points, point => Array.from(point)), original);
    fixture.pointer(fixture.query('.simulate-component[data-component="a"]'), 'pointerdown', 100, 100);
    fixture.pointer(fixture.window, 'pointermove', 120, 110);
    fixture.pointer(fixture.window, 'pointerup', 120, 110);
    var edited = controller.editor.getValue();
    assert.notEqual(edited, source);
    var persisted = Array.from(controller.model.connections[0].points, point => Array.from(point));
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    assert.deepEqual(Array.from(controller.model.connections[0].points, point => Array.from(point)), persisted);
    assert.deepEqual(persisted.slice(2), original.slice(2));
    var restored_path = fixture.query('.simulate-connection').getAttribute('d');
    controller.renderDiagram();
    assert.equal(fixture.query('.simulate-connection').getAttribute('d'), restored_path);
  });

guiTest(tests, 'simulate', 'Simulate labels stay near icons, clear connector exits and never mask wires',
  [], async function(assert, fixture) {
    var controller = fixture.window.win_simulate;
    await fixture.waitFor(() => !!controller.model, 'initial model');
    var source = 'model ModelName\n Modelica.Mechanics.MultiBody.Joints.Assemblies.JointSSR leg annotation(Placement(transformation(origin={0,0},extent={{-10,-10},{10,10}})));\n Modelica.Mechanics.MultiBody.Parts.Body lowerRod annotation(Placement(transformation(origin={0,-40},extent={{-5,-5},{5,5}})));\nequation\n connect(leg.frame_ib,lowerRod.frame_a) annotation(Line(points={{0,-10},{0,-35}}));\nend ModelName;';
    controller.editor.setValue(source);
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    var node = controller.diagram_nodes.get('leg');
    var wire = fixture.query('.simulate-connection').getAttribute('d');
    var box = node.label_bounds;
    assert.equal(fixture.document.querySelector('.component-name-background'), null);
    assert.ok(Math.abs(Number(node.name_text.getAttribute('x'))) > 0);
    assert.ok(Math.abs(Number(node.name_text.getAttribute('y'))) <= 14);
    assert.equal(controller.segmentIntersectsBox({ x: 0, y: 10 }, { x: 0, y: 35 }, box, .4), false);
    assert.equal(controller.boxesOverlap(box, { left: -1.5, right: 1.5, top: 8.5, bottom: 19.5 }, .3), false);
    controller.positionComponentLabels([[{ x: 0, y: 10 }, { x: 0, y: 35 }]]);
    assert.equal(fixture.query('.simulate-connection').getAttribute('d'), wire);
    assert.equal(controller.editor.getValue(), source);
  });

guiTest(tests, 'simulate', 'Library insertion finds free space while context insertion honors the clicked position',
  [], async function(assert, fixture) {
    var controller = fixture.window.win_simulate;
    await fixture.waitFor(() => !!controller.model, 'initial model');
    var source = 'model ModelName\n Modelica.Blocks.Math.Gain a annotation(Placement(transformation(origin={0,0},extent={{-10,-10},{10,10}})));\n Modelica.Blocks.Math.Gain b annotation(Placement(transformation(origin={40,0},extent={{-10,-10},{10,10}})));\nequation\n connect(a.y,b.u) annotation(Line(points={{10,0},{16,0},{16,38},{-100,38},{-100,0},{30,0}}));\nend ModelName;';
    controller.editor.setValue(source);
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    var bounds = fixture.query('#simulate-diagram-svg').getBoundingClientRect();
    controller.diagram_view = { x: bounds.width / 2, y: bounds.height / 2, scale: 2 };
    controller.updateDiagramTransform();
    controller.diagram_fitted = true;
    var old_points = JSON.stringify(controller.model.connections[0].points);
    controller.showBlockLibrary();
    controller.addLibraryBlock(['Modelica.Blocks.Math.Gain', 0, []]);
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    var inserted = controller.model.components.find(item => item.name == 'gain');
    assert.ok(inserted);
    var box = { left: inserted.placement.x - 10, right: inserted.placement.x + 10,
      top: -inserted.placement.y - 10, bottom: -inserted.placement.y + 10 };
    for(const name of ['a', 'b']) {
      var component = controller.model.components.find(item => item.name == name);
      assert.equal(controller.boxesOverlap(box, { left: component.placement.x - 10,
        right: component.placement.x + 10, top: -10, bottom: 10 }, 2), false);
    }
    var points = controller.model.connections[0].points.map(point => ({ x: point[0], y: -point[1] }));
    assert.ok(points.every((point, index) => !index || !controller.segmentIntersectsBox(points[index - 1], point, box, 2)));
    assert.equal(JSON.stringify(controller.model.connections[0].points), old_points);
    controller.showBlockLibrary({ x: 13, y: 57 });
    controller.addLibraryBlock(['Modelica.Blocks.Math.Gain', 0, []]);
    clearTimeout(controller.parse_timer);
    await controller.parseModel();
    var clicked = controller.model.components.find(item => item.name == 'gain1');
    assert.equal(clicked.placement.x, 13);
    assert.equal(clicked.placement.y, -57);
    assert.equal(controller._library_insert_point, null);
  });
