/**
 * @file Modelica graphical annotation tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { parseAnnotation, bezierPath } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
const { renderAnnotation } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
const { annotationTextSize } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
const catalog = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('library-catalog.json');
const graphics = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('library-graphics.json');
const assets = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('library-assets.json');
const custom_icons = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('custom-icons.json');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Graphical annotations preserve nested constructors, empty fields and quoted text', function(assert) {
  var value = parseAnnotation('{-100,-100,100,100,true,-,-,,{Polygon(true,{0,0},0,{0,0,127},{255,255,255},LinePattern.Solid,FillPattern.Solid,0.25,{{-100,-100},{100,0}},Smooth.None),Text("k=%k")}}');
  assert.equal(value[8][0].kind, 'Polygon');
  assert.deepEqual(value[8][0].values[8], [[-100, -100], [100, 0]]);
  assert.equal(value[8][1].values[0], 'k=%k');
  assert.throws(function() {
    parseAnnotation('{Polygon(true)');
  });
}, { tags: ['unit', 'simulate', 'annotations'] });

exports.MODULE_TESTS = tests;

tests.add('Automatic icon text sizes fit width and multiple lines while explicit font sizes remain unchanged', function(assert) {
  assert.equal(annotationTextSize(100, 40, [1000], 0), 10);
  assert.ok(annotationTextSize(100, 40, [100, 100, 100], 0) < 12);
  assert.ok(Math.abs(annotationTextSize(0, 40, [1000], 0) - 40 / 1.15) < 1e-12);
  assert.equal(annotationTextSize(100, 40, [1000], 24), 24);
}, { tags: ['unit', 'simulate', 'annotations'] });

tests.add('Bezier annotations follow midpoint quadratic splines for open and closed paths', function(assert) {
  assert.equal(bezierPath([[0, 0], [10, 0], [10, 10], [20, 10]], false),
    'M0,0 L5,0 Q10,0 10,5 Q10,10 15,10 L20,10');
  assert.equal(bezierPath([[0, 0], [10, 0], [10, 10], [0, 0]], true),
    'M5,5 Q0,0 5,0 Q10,0 10,5 Q10,10 5,5 Z');
}, { tags: ['unit', 'simulate', 'annotations'] });

tests.add('Compiler icons retain omitted-coordinate defaults, gradients, hatching and text alignment', function(assert) {
  var nodes = [];
  var doc = { createElementNS: function(_namespace, tag) {
    var node = { tag: tag, attributes: {}, ownerDocument: doc,
      setAttribute: function(name, value) {
        this.attributes[name] = String(value);
      },
      appendChild: function() {} };
    nodes.push(node);
    return node;
  } };
  var root = doc.createElementNS('', 'svg');
  assert.ok(renderAnnotation(root, graphics['Modelica.ComplexBlocks.ComplexMath.Bode'],
    { name: 'bode', modifiers: [] }, 200, 100) > 10);
  assert.ok(nodes.some(function(node) {
    return node.attributes.transform == 'scale(0.5 -0.5) translate(0 0)';
  }));
  renderAnnotation(root, graphics['Modelica.Mechanics.MultiBody.Parts.BodyShape'],
    { name: 'body', modifiers: [] }, 200, 200);
  assert.ok(nodes.some(function(node) {
    return node.tag == 'radialGradient';
  }));
  assert.ok(nodes.some(function(node) {
    return node.tag == 'linearGradient';
  }));
  renderAnnotation(root, graphics['Modelica.Blocks.Continuous.Filter'],
    { name: 'filter', modifiers: [] }, 200, 200);
  assert.ok(nodes.some(function(node) {
    return node.tag == 'pattern';
  }));
  assert.ok(nodes.some(function(node) {
    return node.tag == 'path' && / Q/.test(node.attributes.d || '');
  }));
  renderAnnotation(root, graphics['Modelica.Electrical.Analog.Examples.Utilities.Conductor'],
    { name: 'conductor', modifiers: [] }, 200, 200);
  assert.ok(nodes.some(function(node) {
    return node.tag == 'text' && node.attributes['text-anchor'] == 'start';
  }));
  assert.ok(nodes.some(function(node) {
    return node.tag == 'text' && node.attributes['text-anchor'] == 'end';
  }));
  var ids = nodes.filter(function(node) {
    return node.attributes.id;
  }).map(function(node) {
    return node.attributes.id;
  });
  assert.equal(new Set(ids).size, ids.length);
}, { tags: ['unit', 'simulate', 'annotations'] });

tests.add('Every bundled block and base class has offline compiler graphics and resolved raster assets', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return ['model', 'block'].includes(item.restriction);
  });
  assert.equal(Object.keys(graphics).length, classes.length);
  var kinds = new Set();
  var doc = { createElementNS: function() {
    return { ownerDocument: doc, setAttribute: function() {}, appendChild: function() {} };
  } };
  classes.forEach(function(item) {
    var metadata = graphics[item.type];
    assert.ok(metadata, item.type);
    metadata.icons.forEach(function(icon) {
      var value = parseAnnotation(icon.annotation);
      (Array.isArray(value) ? value.flat() : []).forEach(function(shape) {
        if(!shape || !shape.kind) {
          return;
        }
        kinds.add(shape.kind);
        if(shape.kind == 'Bitmap' && !shape.values[5]) {
          assert.ok(assets[shape.values[4]], shape.values[4]);
        }
      });
    });
    var rendered = renderAnnotation(doc.createElementNS(), Object.assign({}, metadata, { assets: assets }),
      { name: 'coverage', modifiers: [] }, 20, 20);
    if(!item.partial) {
      assert.ok(rendered > 0, 'No rendered icon content: ' + item.type);
    }
  });
  assert.deepEqual(Array.from(kinds).sort(), ['Bitmap', 'Ellipse', 'Line', 'Polygon', 'Rectangle', 'Text']);
}, { tags: ['unit', 'simulate', 'annotations', 'coverage'] });

tests.add('Explicit custom icons cover only the named upstream classes with empty icon definitions', function(assert) {
  assert.equal(Object.keys(custom_icons).length, 26);
  Object.keys(custom_icons).forEach(function(type) {
    assert.ok(catalog.classes[type], 'Unknown custom icon class: ' + type);
    assert.ok(custom_icons[type].kind);
    assert.ok(parseAnnotation(custom_icons[type].annotation)[8].length > 0);
    graphics[type].icons.forEach(function(icon) {
      assert.deepEqual(parseAnnotation(icon.annotation), [], 'Upstream now has artwork; review the custom icon for ' + type);
    });
  });
}, { tags: ['unit', 'simulate', 'annotations', 'coverage'] });
