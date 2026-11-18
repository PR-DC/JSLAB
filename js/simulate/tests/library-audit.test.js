/**
 * @file Complete-library audit contracts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const { spawnSync } = require('child_process');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_SIMULATE_COMPILER } = require('./compiler-fixture');
const audit_path = path.join(PRDC_JSLAB_SIMULATE_COMPILER.getCodeRoot(), 'audit.js');
const audit = require(audit_path);
var tests = new PRDC_JSLAB_TESTS();

tests.add('Audit proves complete pinned-library class, icon and property translation coverage', function(assert) {
  var report = audit.auditLibrary();
  assert.equal(report.classes, 6020);
  assert.equal(report.concrete, 1794);
  assert.equal(report.rendered, 1794);
  assert.equal(report.translated, 1794);
  assert.equal(report.abstractClasses, 291);
  assert.equal(report.translatedAbstractClasses, report.abstractClasses);
  assert.equal(report.abstractDescriptions, 284);
  assert.equal(report.translatedAbstractDescriptions, report.abstractDescriptions);
  assert.deepEqual(report.missingAbstractLabels, []);
  assert.deepEqual(report.missingAbstractDescriptions, []);
  assert.deepEqual(report.missingAbstractGraphics, []);
  assert.deepEqual(report.missingTranslations, []);
  assert.deepEqual(report.missingIcons, []);
  assert.equal(report.iconTexts, 479);
  assert.equal(report.translatedIconTexts, 110);
  assert.equal(report.translatedIconTexts + report.fixedIconTexts, report.iconTexts);
  assert.deepEqual(report.missingIconLabels, []);
  assert.equal(report.translatedIconOverrides, 2);
  assert.deepEqual(report.missingIconOverrides, []);
  assert.deepEqual(report.missingPropertyDescriptions, []);
  assert.equal(report.propertyDescriptions, 2646);
  assert.equal(report.translatedPropertyDescriptions, report.propertyDescriptions);
  assert.equal(report.libraryFolders, 790);
  assert.equal(report.translatedFolders, report.libraryFolders);
  assert.deepEqual(report.missingPackageLabels, []);
  assert.deepEqual(report.missingPropertyTypes, []);
  assert.equal(report.packageDescriptions, 732);
  assert.equal(report.translatedPackageDescriptions, report.packageDescriptions);
  assert.deepEqual(report.missingPackageDescriptions, []);
  assert.ok(report.recordTypes > 0);
  assert.ok(report.recordFields > 0);
  assert.deepEqual(report.missingRecordTypes, []);
  assert.deepEqual(report.missingRecordPropertyDescriptions, []);
  assert.equal(report.translatedRecordDescriptions + report.missingRecordPropertyDescriptions.length, report.recordDescriptions);
  assert.equal(report.translated + report.missingTranslations.length, report.concrete);
  assert.equal(report.packages['Modelica.Blocks.Continuous'].translated, 14);
  assert.equal(report.packages['Modelica.Fluid.Examples'].translated, 40);
  assert.equal(Object.keys(report.libraries).length, 15);
  assert.equal(report.systemLibraries.length, 6);
  assert.equal(report.libraries.Buildings['12.1.2-maint.12.x'].standardLibrary, '4.1.0');
  assert.ok(report.libraries.Buildings['12.1.2-maint.12.x'].nativeDependencies.includes('cpython'));
  assert.ok(/^[a-f0-9]{40}$/.test(report.repository.commit));
  var check = spawnSync(process.execPath, [audit_path, '--require-complete'], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
  });
  assert.equal(check.error, undefined);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).concrete, report.concrete);
}, { tags: ['unit', 'simulate', 'coverage'] });

exports.MODULE_TESTS = tests;
