/**
 * @file Simulate integration with the packaged OpenModelicaJSLAB compiler library
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_SIMULATE_COMPILER } = require('./compiler-fixture');
const bundleRoot = PRDC_JSLAB_SIMULATE_COMPILER.getBundleRoot();
const codeRoot = PRDC_JSLAB_SIMULATE_COMPILER.getCodeRoot();
const { readMetadata, PRDC_OMJSL_CLIENT, renderAnnotation } = PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
var tests = new PRDC_JSLAB_TESTS();

tests.add('Simulate consumes readable catalogs and code from the compiler bundle', async function(assert) {
  var manifest = JSON.parse(fs.readFileSync(path.join(bundleRoot, 'manifest.json'), 'utf8'));
  assert.ok(manifest.integration && manifest.integration.version == 1);
  var names = ['lang.json', 'class-labels.json', 'description-labels.json', 'component-schema.json',
    'library-catalog.json', 'library-graphics.json', 'library-assets.json', 'repository-libraries.json',
    'custom-icons.json', 'property-labels.json', 'choice-labels.json'];
  names.forEach(function(name) {
    assert.equal(fs.existsSync(path.join(bundleRoot, name == 'lang.json' ? 'config/' + name : 'metadata/' + name)), true);
    assert.ok(Object.keys(readMetadata(name)).length);
  });
  Object.entries(manifest.files).filter(function([name]) {
    return /^(js|config|metadata|css|vendor|dev)\//.test(name);
  })
    .forEach(function([name, hash]) {
      var bytes = fs.readFileSync(path.join(bundleRoot, name));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), hash);
    });
  assert.equal(fs.existsSync(path.resolve(__dirname, '../../modelica')), false);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../lang.json')), false);
  var client = new PRDC_OMJSL_CLIENT('unused');
  client._start = function() {
    throw new Error('Catalog access unexpectedly started the solver.');
  };
  var classes = await client.libraryClasses('Modelica');
  assert.ok(classes.some(function(item) {
    return item.type == 'Modelica.Blocks';
  }));
  var world = await client.componentSchema({ type: 'Modelica.Mechanics.MultiBody.World' });
  assert.ok(world.properties.find(function(property) {
    return property.name == 'gravityType';
  }).choices.includes('PointGravity'));
  assert.ok((await client.typeChoices('.Modelica.Blocks.Types.InitPID')).includes('NoInit'));
  var metadata = await client.componentGraphics('Modelica.Electrical.Analog.Examples.Utilities.RealSwitch');
  var doc = { createElementNS: function() {
    return { ownerDocument: doc, setAttribute: function() {}, appendChild: function() {} };
  } };
  assert.ok(renderAnnotation(doc.createElementNS(), metadata, { name: 'switch', modifiers: [] }, 20, 20) > 0);
  var abstract_classes = Object.values(readMetadata('library-catalog.json').classes).filter(function(item) {
    return item.partial && ['model', 'block'].includes(item.restriction);
  });
  assert.equal(abstract_classes.length, 291);
  for(const item of abstract_classes) {
    var drawing = await client.componentGraphics(item.type);
    assert.equal(drawing.type, item.type);
    assert.ok(Array.isArray(drawing.icons));
  }
}, { tags: ['unit', 'simulate', 'assets'] });

exports.MODULE_TESTS = tests;
