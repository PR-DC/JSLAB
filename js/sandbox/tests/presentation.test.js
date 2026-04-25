/**
 * @file JSLAB presentation submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { EventEmitter } = require('events');
const { PRDC_JSLAB_LIB_PRESENTATION } = require('../presentation');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function withTempDir(fn) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-presentation-test-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createPresentationHarness() {
  var errors = [];
  var write_calls = [];
  var copy_calls = [];
  var copy_folder_calls = [];
  var spawn_calls = [];
  var existing_files = new Set();
  var last_child = null;

  var env = {
    showOpenDialogSync: function() {
      return undefined;
    },
    error: function(message) {
      errors.push(message);
    },
    pathJoin: function() {
      return path.join.apply(path, arguments);
    },
    pathBaseName: function(value) {
      return path.basename(value);
    },
    pathResolve: function(value) {
      return path.resolve(value);
    },
    checkDirectory: function(target_path) {
      return existing_files.has(target_path);
    },
    makeDirectory: function() {
      return true;
    },
    readFileSync: function(file_path) {
      return fs.readFileSync(file_path);
    },
    spawn: function(exe_file, args, opts) {
      spawn_calls.push({ exe_file: exe_file, args: args, opts: opts });
      var child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stdout.setEncoding = function() {};
      last_child = child;
      return child;
    }
  };

  var jsl = {
    inter: {
      lang: {
        currentString: function(id) {
          return 'LANG_' + id;
        },
        string: function(id) {
          return 'LANG_' + id;
        }
      },
      env: env,
      file_system: {
        existFile: function(file_path) {
          return existing_files.has(file_path);
        },
        writeFile: function(file_path, content) {
          write_calls.push({ file_path: file_path, content: content });
          return true;
        },
        copyFile: function(source, destination) {
          copy_calls.push({ source: source, destination: destination });
          return true;
        },
        copyFolder: function(source, destination) {
          copy_folder_calls.push({ source: source, destination: destination });
          return true;
        }
      }
    },
    context: { version: 'test-version' },
    app_path: path.resolve(__dirname, '..', '..', '..')
  };

  var presentation = new PRDC_JSLAB_LIB_PRESENTATION(jsl);
  return {
    presentation,
    errors,
    write_calls,
    copy_calls,
    copy_folder_calls,
    spawn_calls,
    setExistingFiles: function(list) {
      existing_files = new Set(list);
    },
    getLastChild: function() {
      return last_child;
    },
    setShowOpenDialogResult: function(value) {
      env.showOpenDialogSync = function() {
        return value;
      };
    }
  };
}

tests.add('_getPath returns provided path and reports cancel when no selection', function(assert) {
  var harness = createPresentationHarness();
  var out_direct = harness.presentation._getPath('openPresentation', 'C:/tmp/pres');
  assert.equal(out_direct, 'C:/tmp/pres');

  harness.setShowOpenDialogResult(undefined);
  var out_cancel = harness.presentation._getPath('openPresentation');
  assert.equal(out_cancel, false);
  assert.ok(harness.errors.length > 0);
}, { tags: ['unit', 'presentation'] });

tests.add('_checkPresentation validates existence of index.html', function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/presentation';
  var index_path = path.join(pres_path, 'index.html');

  harness.setExistingFiles([]);
  assert.equal(harness.presentation._checkPresentation('openPresentation', pres_path), false);

  harness.setExistingFiles([index_path]);
  assert.equal(harness.presentation._checkPresentation('openPresentation', pres_path), true);
}, { tags: ['unit', 'presentation'] });

tests.add('_startPresentation serves presentation files from internal HTTP server', async function(assert) {
  var tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-presentation-test-'));
  try {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'server-pres');
    fs.mkdirSync(pres_path, { recursive: true });
    fs.writeFileSync(path.join(pres_path, 'index.html'),
      '<!DOCTYPE html><html><body>ok</body></html>', 'utf8');

    var url = await harness.presentation._startPresentation(pres_path);
    var response = await fetch(url);

    assert.equal(response.status, 200);
    assert.ok(url.startsWith('http://127.0.0.1:'));
    assert.ok((await response.text()).includes('<body>ok</body>'));

    harness.presentation._stopPresentationServer(pres_path);
  } finally {
    fs.rmSync(tmp_dir, { recursive: true, force: true });
  }
}, { tags: ['unit', 'presentation'] });

tests.add('_fileToBuffer writes JS wrapper with encoded path and base64 payload', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var rel = path.join('assets', 'sample.bin');
    var abs = path.join(tmp_dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, Buffer.from([1, 2, 3, 4]));

    harness.presentation._fileToBuffer(tmp_dir, rel);

    assert.equal(harness.write_calls.length, 1);
    assert.equal(harness.write_calls[0].file_path, abs + '.buf.js');
    assert.ok(harness.write_calls[0].content.includes('registerFile("assets%2Fsample.bin"'));
    assert.ok(harness.write_calls[0].content.includes('AQIDBA=='));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('createPresentation writes globals.js with language provider for window scripts', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'language-pres');

    harness.presentation.createPresentation(pres_path, {}, false);

    var globals_path = path.join(pres_path, 'res', 'internal', 'globals.js');
    var globals_write = harness.write_calls.find(function(entry) {
      return entry.file_path === globals_path;
    });

    assert.ok(!!globals_write);
    new vm.Script(globals_write.content, { filename: 'globals.js' });
    assert.ok(globals_write.content.includes('window.presentation_resources'));
    assert.ok(globals_write.content.includes('"mathjax":false'));
    assert.ok(globals_write.content.includes('window.__importPresentationModule'));
    assert.ok(globals_write.content.includes('window.__getPresentationStandaloneModulePath'));
    assert.ok(globals_write.content.includes('Invalid presentation script path'));
    assert.ok(globals_write.content.includes('Refusing to load presentation page as script'));
    assert.ok(globals_write.content.includes('window.language'));
    assert.ok(globals_write.content.includes('"315":"LANG_315"'));
    assert.ok(globals_write.content.includes('"316":"LANG_316"'));
    assert.ok(globals_write.content.includes('"317":"LANG_317"'));
    assert.ok(globals_write.content.includes('"318":"LANG_318"'));
    assert.ok(globals_write.content.includes('"363":"LANG_363"'));
    assert.ok(globals_write.content.includes('"542":"LANG_542"'));

    var config_write = harness.write_calls.find(function(entry) {
      return entry.file_path === path.join(pres_path, 'res', 'internal', 'config.json');
    });
    var config = JSON.parse(config_write.content);
    assert.equal(config.presentation_mode, 'online');
  });
}, { tags: ['unit', 'presentation'] });

tests.add('createPresentation writes presentation resource flags from modules', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'resource-pres');

    harness.presentation.createPresentation(pres_path, {
      modules: ['latex', 'plot-json', 'ui']
    }, false);

    var globals_path = path.join(pres_path, 'res', 'internal', 'globals.js');
    var globals_write = harness.write_calls.find(function(entry) {
      return entry.file_path === globals_path;
    });

    assert.ok(!!globals_write);
    assert.ok(globals_write.content.includes('"pdfjs":false'));
    assert.ok(globals_write.content.includes('"plotly":true'));
    assert.ok(globals_write.content.includes('"mathjax":true'));
    assert.ok(globals_write.content.includes('"three":false'));
    assert.ok(globals_write.content.includes('"ui":true'));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_writePresentationGlobals detects legacy embedded module resources', function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/legacy-resource-pres';

  harness.setExistingFiles([
    path.join(pres_path, 'res', 'plotly-2.24.2.min.js'),
    path.join(pres_path, 'res', 'mathjax-config.js'),
    path.join(pres_path, 'res', 'tex-mml-chtml-3.2.0', 'tex-mml-chtml-3.2.0.js')
  ]);

  harness.presentation._writePresentationGlobals(pres_path);

  var globals_write = harness.write_calls.find(function(entry) {
    return entry.file_path === path.join(pres_path, 'res', 'internal', 'globals.js');
  });

  assert.ok(!!globals_write);
  assert.ok(globals_write.content.includes('"plotly":true'));
  assert.ok(globals_write.content.includes('"mathjax":true'));
}, { tags: ['unit', 'presentation'] });

tests.add('_refreshPresentationHtmlIncludes rewrites generated includes for lean startup', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'refresh-pres');
    var html_path = path.join(pres_path, 'index.html');
    var ui_css_path = path.join(pres_path, 'res', 'ui.css');
    var ui_js_path = path.join(pres_path, 'res', 'ui.js');

    fs.mkdirSync(path.dirname(ui_css_path), { recursive: true });
    fs.writeFileSync(html_path, `<!DOCTYPE html>
<html>
<head>
<!-- CSS files begin -->
  <link rel="stylesheet" type="text/css" href="./res/ui.css" />
  <link rel="stylesheet" type="text/css" href="./res/internal/presentation.css" />
  <link rel="stylesheet" type="text/css" href="./main.css" />
<!-- CSS files end -->
</head>
<body>
<!-- JS files begin -->
  <script type="text/javascript" src="./res/internal/globals.js"></script>
  <script type="text/javascript" src="./res/pdf.min.js"></script>
  <script type="text/javascript" src="./res/plotly-3.3.0.min.js"></script>
  <script type="text/javascript" src="./res/mathjax-config.js"></script>
  <script type="text/javascript" src="./res/MathJax-3.2.0/tex-mml-chtml.js"></script>
  <script type="text/javascript" src="./res/ui.js"></script>
  <script type="text/javascript" src="./res/internal/presentation.js"></script>
  <script type="text/javascript" src="./main.js"></script>
<!-- JS files end -->
</body>
</html>`, 'utf8');

    harness.setExistingFiles([html_path, ui_css_path, ui_js_path]);
    harness.presentation._refreshPresentationHtmlIncludes(pres_path);

    var html_write = harness.write_calls.find(function(entry) {
      return entry.file_path === html_path;
    });

    assert.ok(!!html_write);
    assert.ok(html_write.content.includes('./res/ui.css'));
    assert.ok(html_write.content.includes('./res/ui.js'));
    assert.ok(!html_write.content.includes('./res/pdf.min.js'));
    assert.ok(!html_write.content.includes('./res/plotly-3.3.0.min.js'));
    assert.ok(!html_write.content.includes('./res/mathjax-config.js'));
    assert.ok(!html_write.content.includes('./res/MathJax-3.2.0/tex-mml-chtml.js'));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_updatePresentationBackend refreshes generated backend files', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'old-pres');
    var config_path = path.join(pres_path, 'res', 'internal', 'config.json');
    fs.mkdirSync(path.dirname(config_path), { recursive: true });
    fs.writeFileSync(config_path, JSON.stringify({
      jslab_version: 'old-version',
      slide_width: 800,
      slide_height: 600,
      custom: true
    }), 'utf8');
    harness.setExistingFiles([config_path]);

    harness.presentation._updatePresentationBackend(pres_path);

    var presentation_js_path = path.join(pres_path, 'res', 'internal', 'presentation.js');
    var presentation_js_write = harness.write_calls.find(function(entry) {
      return entry.file_path === presentation_js_path;
    });
    var config_write = harness.write_calls.find(function(entry) {
      return entry.file_path === config_path;
    });
    var globals_write = harness.write_calls.find(function(entry) {
      return entry.file_path === path.join(pres_path, 'res', 'internal', 'globals.js');
    });

    assert.ok(!!presentation_js_write);
    assert.ok(!presentation_js_write.content.includes('%presentation_config%'));
    assert.ok(presentation_js_write.content.includes('"jslab_version": "test-version"'));
    assert.ok(presentation_js_write.content.includes('"slide_width": 800'));
    assert.ok(!!config_write);
    assert.deepEqual(JSON.parse(config_write.content), {
      jslab_version: 'test-version',
      slide_width: 800,
      slide_height: 600,
      custom: true
    });
    assert.ok(!!globals_write);
    assert.equal(harness.copy_calls.some(function(entry) {
      return entry.destination === path.join(pres_path, 'old-pres.exe');
    }), false);
    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.source.endsWith(path.join('css', 'presentation.css')) &&
        entry.destination === path.join(pres_path, 'res', 'internal', 'presentation.css');
    }));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_updatePresentationBackend skips MathJax folder copy when legacy version matches', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'legacy-mathjax-pres');
    var config_path = path.join(pres_path, 'res', 'internal', 'config.json');
    var legacy_mathjax_path = path.join(pres_path, 'res', 'tex-mml-chtml-3.2.0',
      'tex-mml-chtml-3.2.0.js');
    fs.mkdirSync(path.dirname(config_path), { recursive: true });
    fs.mkdirSync(path.dirname(legacy_mathjax_path), { recursive: true });
    fs.writeFileSync(config_path, JSON.stringify({
      jslab_version: 'old-version',
      slide_width: 800,
      slide_height: 600
    }), 'utf8');
    fs.writeFileSync(legacy_mathjax_path, 'legacy mathjax', 'utf8');
    harness.setExistingFiles([
      config_path,
      path.join(pres_path, 'res', 'mathjax-config.js'),
      legacy_mathjax_path
    ]);

    harness.presentation._updatePresentationBackend(pres_path);

    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.source.endsWith(path.join('js', 'windows', 'mathjax-config.js')) &&
        entry.destination === path.join(pres_path, 'res', 'mathjax-config.js');
    }));
    assert.equal(harness.copy_folder_calls.some(function(entry) {
      return entry.source.endsWith(path.join('lib', 'MathJax-3.2.0')) &&
        entry.destination === path.join(pres_path, 'res', 'MathJax-3.2.0');
    }), false);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_updatePresentationBackend copies current Plotly when only legacy version exists', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'legacy-plotly-pres');
    var config_path = path.join(pres_path, 'res', 'internal', 'config.json');
    var legacy_plotly_path = path.join(pres_path, 'res', 'plotly-2.24.2.min.js');
    fs.mkdirSync(path.dirname(config_path), { recursive: true });
    fs.mkdirSync(path.dirname(legacy_plotly_path), { recursive: true });
    fs.writeFileSync(config_path, JSON.stringify({
      jslab_version: 'old-version',
      slide_width: 800,
      slide_height: 600
    }), 'utf8');
    fs.writeFileSync(legacy_plotly_path, 'legacy plotly', 'utf8');
    harness.setExistingFiles([
      config_path,
      legacy_plotly_path
    ]);

    harness.presentation._updatePresentationBackend(pres_path);

    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.source.endsWith(path.join('lib', 'plotly-3.3.0', 'plotly-3.3.0.min.js')) &&
        entry.destination === path.join(pres_path, 'res', 'plotly-3.3.0.min.js');
    }));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_bundleStandaloneModuleResources bundles exported module graphs for standalone mode', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'three-bundle-pres');
    var main_path = path.join(pres_path, 'main.js');
    var module_path = path.join(pres_path, 'res', 'three.js-r162', 'build', 'three.module.js');
    var dep_path = path.join(pres_path, 'res', 'three.js-r162', 'build', 'dep.js');
    var unused_module_path = path.join(pres_path, 'res', 'three.js-r162', 'examples', 'jsm', 'libs', 'unused.module.js');
    fs.mkdirSync(path.dirname(module_path), { recursive: true });
    fs.mkdirSync(path.dirname(unused_module_path), { recursive: true });
    fs.writeFileSync(main_path,
      'window.__importPresentationModule("./res/three.js-r162/build/three.module.js");',
      'utf8');
    fs.writeFileSync(dep_path, 'export const ANSWER = 42;\n', 'utf8');
    fs.writeFileSync(module_path, [
      "import { ANSWER } from './dep.js';",
      'export const value = ANSWER + 1;'
    ].join('\n'), 'utf8');
    fs.writeFileSync(unused_module_path, 'export const UNUSED = true;\n', 'utf8');

    harness.presentation._bundleStandaloneModuleResources(pres_path);

    var bundle_path = path.join(pres_path, 'res', 'three.js-r162', 'build', 'three.standalone.js');
    var bundle = fs.readFileSync(bundle_path, 'utf8');
    var context = { window: {} };
    vm.runInNewContext(bundle, context);

    assert.ok(bundle.includes('window.__standalone_modules'));
    assert.equal(
      context.window.__standalone_modules['./res/three.js-r162/build/three.module.js'].value,
      43
    );
    assert.equal(fs.existsSync(path.join(
      pres_path, 'res', 'three.js-r162', 'examples', 'jsm', 'libs', 'unused.standalone.js'
    )), false);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_getStandaloneModuleEntries discovers only referenced module entries', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'module-entry-pres');
    fs.mkdirSync(path.join(pres_path, 'res', 'internal'), { recursive: true });
    fs.mkdirSync(path.join(pres_path, 'res', 'mods'), { recursive: true });
    fs.writeFileSync(path.join(pres_path, 'main.js'), [
      'async function loadA() {',
      '  return await import("./res/mods/a.module.js");',
      '}'
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(pres_path, 'res', 'internal', 'presentation.js'), [
      'async function loadB() {',
      '  return this._importResourceModule("./res/mods/b.js");',
      '}'
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(pres_path, 'res', 'mods', 'a.module.js'), 'export const A = 1;\n', 'utf8');
    fs.writeFileSync(path.join(pres_path, 'res', 'mods', 'b.js'), 'export const B = 2;\n', 'utf8');
    fs.writeFileSync(path.join(pres_path, 'res', 'mods', 'unused.module.js'), 'export const U = 3;\n', 'utf8');

    assert.deepEqual(harness.presentation._getStandaloneModuleEntries(pres_path), [
      './res/mods/a.module.js',
      './res/mods/b.js'
    ]);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_getStandaloneModuleEntries parses generated runtime numeric separators', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'numeric-separator-pres');
    fs.mkdirSync(path.join(pres_path, 'res', 'internal'), { recursive: true });
    fs.mkdirSync(path.join(pres_path, 'res', 'three.js-r162', 'build'), { recursive: true });
    fs.writeFileSync(path.join(pres_path, 'res', 'internal', 'presentation.js'), [
      'function pingLater() {',
      '  setInterval(function() {}, 10_000);',
      '}',
      'async function loadThree() {',
      '  return this._importResourceModule("./res/three.js-r162/build/three.module.js");',
      '}'
    ].join('\n'), 'utf8');
    fs.writeFileSync(
      path.join(pres_path, 'res', 'three.js-r162', 'build', 'three.module.js'),
      'export const THREE_OK = true;\n',
      'utf8');

    assert.deepEqual(harness.presentation._getStandaloneModuleEntries(pres_path), [
      './res/three.js-r162/build/three.module.js'
    ]);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_getStandaloneModuleEntries discovers inline auto-loaded three globals', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'orbit-controls-pres');
    fs.mkdirSync(path.join(pres_path, 'res', 'three.js-r162', 'examples', 'jsm', 'controls'), { recursive: true });
    fs.writeFileSync(path.join(pres_path, 'index.html'), [
      '<scene-3d-json src="./res/mehanizam-3d.json">',
      '<script type="x-scene-setup">',
      "  await presentation.waitForGlobal('OrbitControls');",
      '  var controls = new OrbitControls(this.camera, this.renderer.domElement);',
      '</script>',
      '</scene-3d-json>'
    ].join('\n'), 'utf8');
    fs.writeFileSync(
      path.join(pres_path, 'res', 'three.js-r162', 'examples', 'jsm', 'controls', 'OrbitControls.js'),
      "export class OrbitControls {}\nexport class MapControls {}\n",
      'utf8');

    assert.deepEqual(harness.presentation._getAutoGlobalModuleEntries(pres_path), [
      './res/three.js-r162/examples/jsm/controls/OrbitControls.js'
    ]);
    assert.deepEqual(harness.presentation._getStandaloneModuleEntries(pres_path), [
      './res/three.js-r162/examples/jsm/controls/OrbitControls.js'
    ]);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_bundleStandaloneModuleResources resolves bare three imports for addon globals', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'orbit-controls-bundle-pres');
    var three_path = path.join(pres_path, 'res', 'three.js-r162', 'build', 'three.module.js');
    var orbit_path = path.join(pres_path, 'res', 'three.js-r162', 'examples', 'jsm', 'controls', 'OrbitControls.js');
    fs.mkdirSync(path.dirname(three_path), { recursive: true });
    fs.mkdirSync(path.dirname(orbit_path), { recursive: true });
    fs.writeFileSync(three_path, [
      'export class EventDispatcher {}',
      'export const MOUSE = {};',
      'export class Quaternion {}',
      'export class Spherical {}',
      'export const TOUCH = {};',
      'export class Vector2 {}',
      'export class Vector3 {}',
      'export class Plane {}',
      'export class Ray {}',
      'export const MathUtils = {};'
    ].join('\n'), 'utf8');
    fs.writeFileSync(orbit_path, [
      "import { EventDispatcher } from 'three';",
      'class OrbitControls extends EventDispatcher {}',
      'class MapControls extends OrbitControls {}',
      'export { OrbitControls, MapControls };'
    ].join('\n'), 'utf8');

    harness.presentation._bundleStandaloneModuleResources(pres_path, [
      './res/three.js-r162/examples/jsm/controls/OrbitControls.js'
    ]);

    var bundle_path = path.join(
      pres_path,
      'res',
      'three.js-r162',
      'examples',
      'jsm',
      'controls',
      'OrbitControls.standalone.js'
    );
    var bundle = fs.readFileSync(bundle_path, 'utf8');
    var EventDispatcher = class EventDispatcher {};
    var context = {
      window: {
        THREE: { EventDispatcher: EventDispatcher }
      }
    };
    context.window.window = context.window;
    context.globalThis = context.window;
    vm.runInNewContext(bundle, context);

    assert.equal(bundle.includes('Multiple instances of Three.js being imported.'), false);
    assert.equal(
      typeof context.window.__standalone_modules['./res/three.js-r162/examples/jsm/controls/OrbitControls.js'].OrbitControls,
      'function'
    );
    assert.equal(
      Object.getPrototypeOf(
        context.window.__standalone_modules['./res/three.js-r162/examples/jsm/controls/OrbitControls.js'].OrbitControls.prototype
      ).constructor,
      EventDispatcher
    );
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_collectStandaloneBufferedAssets finds only standalone-buffered asset refs', function(assert) {
  var harness = createPresentationHarness();
  var assets = harness.presentation._collectStandaloneBufferedAssets([
    '<img-pdf src="./doc.pdf"></img-pdf>',
    '<plot-json src="./plot.json"></plot-json>',
    '<scene-3d-json src="./scene.json"></scene-3d-json>',
    '<img src="./plain.png">'
  ].join('\n'));

  assert.deepEqual(Array.from(assets).sort(), [
    './doc.pdf',
    './plot.json',
    './scene.json'
  ]);
}, { tags: ['unit', 'presentation'] });

tests.add('_rewriteStandaloneImports rewrites dynamic imports to standalone helper', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var main_path = path.join(tmp_dir, 'main.js');
    fs.writeFileSync(main_path, [
      'async function loadThing(path) {',
      '  return await import(path);',
      '}'
    ].join('\n'), 'utf8');

    harness.presentation._rewriteStandaloneImports(tmp_dir);

    var rewritten = fs.readFileSync(main_path, 'utf8');
    assert.ok(rewritten.includes('window.__importPresentationModule(path)'));
    assert.ok(!rewritten.includes('import(path)'));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_rewriteStandaloneImports keeps generated globals fallback import intact', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var globals_path = path.join(tmp_dir, 'res', 'internal', 'globals.js');
    fs.mkdirSync(path.dirname(globals_path), { recursive: true });
    fs.writeFileSync(globals_path, [
      'window.__importPresentationModule = async function(module_path) {',
      '  return import(new URL(module_path, window.location.href).href);',
      '};'
    ].join('\n'), 'utf8');

    harness.presentation._rewriteStandaloneImports(tmp_dir);

    assert.equal(
      fs.readFileSync(globals_path, 'utf8'),
      [
        'window.__importPresentationModule = async function(module_path) {',
        '  return import(new URL(module_path, window.location.href).href);',
        '};'
      ].join('\n')
    );
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_syncStandaloneBufferedAssets regenerates current buffers and removes stale ones', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var current_asset = path.join(tmp_dir, 'scene.json');
    var stale_asset = path.join(tmp_dir, 'old.json');
    var current_buf = current_asset + '.buf.js';
    var stale_buf = stale_asset + '.buf.js';

    fs.writeFileSync(current_asset, '{"ok":true}', 'utf8');
    fs.writeFileSync(stale_asset, '{"old":true}', 'utf8');
    fs.writeFileSync(stale_buf, 'stale', 'utf8');

    harness.presentation._syncStandaloneBufferedAssets(tmp_dir, ['./scene.json']);

    assert.ok(harness.write_calls.some(function(entry) {
      return entry.file_path === current_buf;
    }));
    assert.equal(fs.existsSync(current_asset), false);
    assert.equal(fs.existsSync(stale_buf), false);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_removePresentationServerExecutable removes stale portable server exe', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'standalone-pres');
    var exe_path = path.join(pres_path, 'standalone-pres.exe');

    fs.mkdirSync(pres_path, { recursive: true });
    fs.writeFileSync(exe_path, 'exe', 'utf8');

    harness.presentation._removePresentationServerExecutable(pres_path);

    assert.equal(fs.existsSync(exe_path), false);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_getPresentationMode prefers config marker and falls back to artifacts', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var online_path = path.join(tmp_dir, 'online-pres');
    var standalone_path = path.join(tmp_dir, 'standalone-pres');
    var legacy_standalone_path = path.join(tmp_dir, 'legacy-standalone');
    var legacy_online_path = path.join(tmp_dir, 'legacy-online');

    fs.mkdirSync(path.join(online_path, 'res', 'internal'), { recursive: true });
    fs.writeFileSync(path.join(online_path, 'res', 'internal', 'config.json'),
      JSON.stringify({ presentation_mode: 'online' }), 'utf8');
    fs.mkdirSync(path.join(standalone_path, 'res', 'internal'), { recursive: true });
    fs.writeFileSync(path.join(standalone_path, 'res', 'internal', 'config.json'),
      JSON.stringify({ presentation_mode: 'standalone' }), 'utf8');
    fs.mkdirSync(path.join(legacy_standalone_path, 'res'), { recursive: true });
    fs.writeFileSync(path.join(legacy_standalone_path, 'doc.pdf.buf.js'),
      'registerFile("doc.pdf", "AQID");', 'utf8');
    fs.mkdirSync(path.join(legacy_online_path, 'res'), { recursive: true });

    assert.equal(harness.presentation._getPresentationMode(online_path), 'online');
    assert.equal(harness.presentation._getPresentationMode(standalone_path), 'standalone');
    assert.equal(harness.presentation._getPresentationMode(legacy_standalone_path), 'standalone');
    assert.equal(harness.presentation._getPresentationMode(legacy_online_path), 'online');
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_setPresentationMode persists mode in config.json', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();

    harness.presentation._setPresentationMode(tmp_dir, 'standalone');

    assert.equal(
      JSON.parse(fs.readFileSync(path.join(tmp_dir, 'res', 'internal', 'config.json'), 'utf8')).presentation_mode,
      'standalone'
    );
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_readPresentationResourceFlags parses persisted globals resources', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var globals_path = path.join(tmp_dir, 'res', 'internal', 'globals.js');
    fs.mkdirSync(path.dirname(globals_path), { recursive: true });
    fs.writeFileSync(globals_path, [
      'window.presentation_resources = {"pdfjs":true,"plotly":false,"mathjax":true,"three":false,"ui":true};'
    ].join('\n'), 'utf8');

    assert.deepEqual(harness.presentation._readPresentationResourceFlags(tmp_dir), {
      pdfjs: true,
      plotly: false,
      mathjax: true,
      three: false,
      ui: true
    });
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_restoreStandaloneBufferedAssets recreates raw files from .buf.js wrappers', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var buf_path = path.join(tmp_dir, 'doc.pdf.buf.js');
    fs.writeFileSync(buf_path, 'registerFile("doc.pdf", "AQID");', 'utf8');

    harness.presentation._restoreStandaloneBufferedAssets(tmp_dir);

    assert.equal(fs.readFileSync(path.join(tmp_dir, 'doc.pdf')).toString('hex'), '010203');
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_restorePresentationModuleResources copies resources from persisted flags', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();

    harness.presentation._restorePresentationModuleResources(tmp_dir, {
      pdfjs: true,
      plotly: true,
      mathjax: true,
      three: true,
      ui: true
    });

    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.destination === path.join(tmp_dir, 'res', 'pdf.min.js');
    }));
    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.destination === path.join(tmp_dir, 'res', 'pdf.worker.min.js');
    }));
    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.destination === path.join(tmp_dir, 'res', 'plotly-3.3.0.min.js');
    }));
    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.destination === path.join(tmp_dir, 'res', 'mathjax-config.js');
    }));
    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.destination === path.join(tmp_dir, 'res', 'ui.css');
    }));
    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.destination === path.join(tmp_dir, 'res', 'ui.js');
    }));
    assert.ok(harness.copy_folder_calls.some(function(entry) {
      return entry.destination === path.join(tmp_dir, 'res', 'MathJax-3.2.0');
    }));
    assert.ok(harness.copy_folder_calls.some(function(entry) {
      return entry.destination === path.join(tmp_dir, 'res', 'three.js-r162');
    }));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('_removeStandaloneGeneratedArtifacts removes standalone-only outputs', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var buf_path = path.join(tmp_dir, 'doc.pdf.buf.js');
    var bundle_path = path.join(tmp_dir, 'res', 'mod.standalone.js');
    fs.mkdirSync(path.dirname(bundle_path), { recursive: true });
    fs.writeFileSync(buf_path, 'registerFile("doc.pdf", "AQID");', 'utf8');
    fs.writeFileSync(bundle_path, 'bundle', 'utf8');

    harness.presentation._removeStandaloneGeneratedArtifacts(tmp_dir);

    assert.equal(fs.existsSync(buf_path), false);
    assert.equal(fs.existsSync(bundle_path), false);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('makeStandalonePresentation bundles resource modules automatically', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'standalone-pres');
    var index_path = path.join(pres_path, 'index.html');
    var calls = [];
    var bundled = 0;
    var rewritten = 0;
    var sync_calls = [];
    var removed = 0;

    fs.mkdirSync(pres_path, { recursive: true });
    fs.writeFileSync(index_path,
      '<scene-3d-json src="./scene.json"></scene-3d-json>', 'utf8');
    harness.setExistingFiles([index_path]);
    harness.presentation._bundleStandaloneModuleResources = function(file_path) {
      bundled += 1;
      assert.equal(file_path, pres_path);
    };
    harness.presentation._rewriteStandaloneImports = function(file_path) {
      rewritten += 1;
      assert.equal(file_path, pres_path);
    };
    harness.presentation._updatePresentationBackend = function(file_path) {
      calls.push({ name: 'update', value: file_path });
      assert.equal(file_path, pres_path);
    };
    harness.presentation._setPresentationMode = function(file_path, mode) {
      calls.push({ name: 'set', value: file_path, mode: mode });
      assert.equal(file_path, pres_path);
      assert.equal(mode, 'standalone');
    };
    harness.presentation._syncStandaloneBufferedAssets = function(file_path, assets) {
      sync_calls.push({
        file_path: file_path,
        assets: Array.from(assets).sort()
      });
    };
    harness.presentation._removePresentationServerExecutable = function(file_path) {
      removed += 1;
      assert.equal(file_path, pres_path);
    };

    harness.presentation.makeStandalonePresentation(pres_path);

    assert.deepEqual(calls, [
      { name: 'set', value: pres_path, mode: 'standalone' },
      { name: 'update', value: pres_path }
    ]);
    assert.equal(bundled, 1);
    assert.equal(rewritten, 1);
    assert.equal(removed, 1);
    assert.deepEqual(sync_calls, [{
      file_path: pres_path,
      assets: ['./scene.json']
    }]);
  });
}, { tags: ['unit', 'presentation'] });

tests.add('makeOnlinePresentation restores online resources and removes standalone artifacts', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'online-pres');
    var index_path = path.join(pres_path, 'index.html');
    var globals_path = path.join(pres_path, 'res', 'internal', 'globals.js');
    var buf_path = path.join(pres_path, 'doc.pdf.buf.js');
    var bundle_path = path.join(pres_path, 'res', 'three.js-r162', 'build', 'three.standalone.js');
    var calls = [];

    fs.mkdirSync(path.dirname(globals_path), { recursive: true });
    fs.mkdirSync(path.dirname(bundle_path), { recursive: true });
    fs.writeFileSync(index_path, '<html></html>', 'utf8');
    fs.writeFileSync(globals_path,
      'window.presentation_resources = {"pdfjs":true,"plotly":false,"mathjax":false,"three":true,"ui":false};',
      'utf8');
    fs.writeFileSync(buf_path, 'registerFile("doc.pdf", "AQID");', 'utf8');
    fs.writeFileSync(bundle_path, 'bundle', 'utf8');
    harness.setExistingFiles([index_path]);
    harness.presentation._updatePresentationBackend = function(file_path) {
      calls.push({ name: 'update', value: file_path });
    };
    harness.presentation._setPresentationMode = function(file_path, mode) {
      calls.push({ name: 'set', value: file_path, mode: mode });
      assert.equal(file_path, pres_path);
      assert.equal(mode, 'online');
    };

    harness.presentation.makeOnlinePresentation(pres_path);

    assert.deepEqual(calls, [
      { name: 'set', value: pres_path, mode: 'online' },
      { name: 'update', value: pres_path }
    ]);
    assert.equal(fs.readFileSync(path.join(pres_path, 'doc.pdf')).toString('hex'), '010203');
    assert.equal(fs.existsSync(buf_path), false);
    assert.equal(fs.existsSync(bundle_path), false);
    assert.ok(harness.copy_calls.some(function(entry) {
      return entry.destination === path.join(pres_path, 'res', 'pdf.min.js');
    }));
    assert.ok(harness.copy_folder_calls.some(function(entry) {
      return entry.destination === path.join(pres_path, 'res', 'three.js-r162');
    }));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('updatePresentation refreshes backend and reapplies standalone mode', function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/update-standalone-pres';
  var calls = [];

  harness.setExistingFiles([path.join(pres_path, 'index.html')]);
  harness.presentation._getPresentationMode = function(file_path) {
    calls.push(['mode', file_path]);
    return 'standalone';
  };
  harness.presentation._updatePresentationBackend = function(file_path) {
    calls.push(['backend', file_path]);
  };
  harness.presentation._setPresentationMode = function(file_path, mode) {
    calls.push(['set', file_path, mode]);
  };
  harness.presentation._applyStandalonePresentationState = function(file_path) {
    calls.push(['standalone', file_path]);
  };
  harness.presentation._applyOnlinePresentationState = function(file_path) {
    calls.push(['online', file_path]);
  };

  harness.presentation.updatePresentation(pres_path);

  assert.deepEqual(calls, [
    ['mode', pres_path],
    ['set', pres_path, 'standalone'],
    ['backend', pres_path],
    ['standalone', pres_path]
  ]);
}, { tags: ['unit', 'presentation'] });

tests.add('updatePresentation refreshes backend and reapplies online mode', function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/update-online-pres';
  var calls = [];

  harness.setExistingFiles([path.join(pres_path, 'index.html')]);
  harness.presentation._getPresentationMode = function(file_path) {
    calls.push(['mode', file_path]);
    return 'online';
  };
  harness.presentation._updatePresentationBackend = function(file_path) {
    calls.push(['backend', file_path]);
  };
  harness.presentation._setPresentationMode = function(file_path, mode) {
    calls.push(['set', file_path, mode]);
  };
  harness.presentation._applyStandalonePresentationState = function(file_path) {
    calls.push(['standalone', file_path]);
  };
  harness.presentation._applyOnlinePresentationState = function(file_path) {
    calls.push(['online', file_path]);
  };

  harness.presentation.updatePresentation(pres_path);

  assert.deepEqual(calls, [
    ['mode', pres_path],
    ['set', pres_path, 'online'],
    ['backend', pres_path],
    ['online', pres_path]
  ]);
}, { tags: ['unit', 'presentation'] });

tests.add('editPresentation starts preview server without updating backend', async function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/edit-pres';
  var calls = [];
  var set_path_calls = [];
  var context = {
    presentation_editor: {
      setPath: function(file_path, url) {
        set_path_calls.push({ file_path: file_path, url: url });
      }
    },
    preview: {
      addEventListener: function() {}
    },
    document: {
      body: {
        classList: {
          add: function() {},
          remove: function() {}
        }
      },
      addEventListener: function() {}
    }
  };

  harness.setExistingFiles([path.join(pres_path, 'index.html')]);
  harness.presentation._startPresentation = async function(file_path) {
    calls.push({ name: 'start', value: file_path });
    return 'http://127.0.0.1:1234/';
  };
  harness.presentation.jsl.inter.non_blocking = {
    waitMSeconds: async function() {}
  };
  harness.presentation.jsl.inter.windows = {
    open_windows: {
      1: {
        ready: Promise.resolve(),
        context: context,
        setFullscreen: function() {},
        setTitle: function(title) {
          calls.push({ name: 'title', value: title });
        }
      }
    },
    openWindow: function(file) {
      calls.push({ name: 'open', value: file });
      return 1;
    }
  };

  await harness.presentation.editPresentation(pres_path);

  assert.deepEqual(calls.slice(0, 2).map(function(call) {
    return call.name;
  }), ['start', 'open']);
  assert.equal(calls[0].value, pres_path);
  assert.deepEqual(set_path_calls[0], {
    file_path: pres_path,
    url: 'http://127.0.0.1:1234/'
  });
}, { tags: ['unit', 'presentation', 'async'] });

tests.add('openPresentation starts presentation server without updating backend', async function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/open-pres';
  var calls = [];
  var keydown_handler;
  var sent_messages = [];
  var webview = {
    src: '',
    addEventListener: function() {},
    send: function(channel, payload) {
      sent_messages.push({ channel: channel, payload: payload });
    }
  };
  var context = {
    document: {
      getElementById: function(id) {
        if(id == 'webview') {
          return webview;
        }
      },
      addEventListener: function(type, handler) {
        if(type == 'keydown') {
          keydown_handler = handler;
        }
      }
    },
    webview: webview
  };

  harness.setExistingFiles([path.join(pres_path, 'index.html')]);
  harness.presentation._startPresentation = async function(file_path) {
    calls.push({ name: 'start', value: file_path });
    return 'http://127.0.0.1:1234/';
  };
  harness.presentation.jsl.inter.windows = {
    open_windows: {
      1: {
        ready: Promise.resolve(),
        context: context,
        setTitle: function(title) {
          calls.push({ name: 'title', value: title });
        }
      }
    },
    openWindow: function(file) {
      calls.push({ name: 'open', value: file });
      return 1;
    }
  };

  await harness.presentation.openPresentation(pres_path);

  assert.deepEqual(calls.slice(0, 2).map(function(call) {
    return call.name;
  }), ['start', 'open']);
  assert.equal(calls[0].value, pres_path);
  assert.equal(webview.src, 'http://127.0.0.1:1234/');
  assert.equal(typeof keydown_handler, 'function');
  
  keydown_handler({
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    key: 'F9',
    preventDefault: function() {}
  });
  keydown_handler({
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    code: 'KeyS',
    key: 's',
    preventDefault: function() {}
  });
  
  assert.deepEqual(sent_messages, [
    { channel: 'data', payload: { toggle_stopwatch: true } },
    { channel: 'data', payload: { toggle_slide_nav: true } }
  ]);
}, { tags: ['unit', 'presentation', 'async'] });

tests.add('openPresentation infers standalone mode from presentation config', async function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/open-standalone-pres';
  var calls = [];
  var keydown_handler;
  var context = {
    presentation: {},
    document: {
      addEventListener: function(type, handler) {
        if(type == 'keydown') {
          keydown_handler = handler;
        }
      }
    }
  };

  harness.setExistingFiles([path.join(pres_path, 'index.html')]);
  harness.presentation._getPresentationMode = function(file_path) {
    calls.push({ name: 'mode', value: file_path });
    return 'standalone';
  };
  harness.presentation._startPresentation = async function() {
    assert.fail('_startPresentation should not be used for inferred standalone mode');
  };
  harness.presentation.jsl.inter.non_blocking = {
    waitMSeconds: async function() {}
  };
  harness.presentation.jsl.inter.windows = {
    open_windows: {
      1: {
        ready: Promise.resolve(),
        context: context,
        setFullscreen: function() {},
        setTitle: function(title) {
          calls.push({ name: 'title', value: title });
        }
      }
    },
    openWindow: function(file) {
      calls.push({ name: 'open', value: file });
      return 1;
    }
  };

  await harness.presentation.openPresentation(pres_path);

  assert.deepEqual(calls.slice(0, 2), [
    { name: 'mode', value: pres_path },
    { name: 'open', value: path.join(pres_path, 'index.html') }
  ]);
  assert.equal(typeof keydown_handler, 'function');
}, { tags: ['unit', 'presentation', 'async'] });

tests.add('editPresentation infers standalone mode from presentation config', async function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/edit-standalone-pres';
  var calls = [];
  var set_path_calls = [];
  var context = {
    presentation_editor: {
      setPath: function(file_path, url) {
        set_path_calls.push({ file_path: file_path, url: url });
      }
    },
    preview: {
      addEventListener: function() {}
    },
    document: {
      body: {
        classList: {
          add: function() {},
          remove: function() {}
        }
      },
      addEventListener: function() {}
    }
  };

  harness.setExistingFiles([path.join(pres_path, 'index.html')]);
  harness.presentation._getPresentationMode = function(file_path) {
    calls.push({ name: 'mode', value: file_path });
    return 'standalone';
  };
  harness.presentation._startPresentation = async function() {
    assert.fail('_startPresentation should not be used for inferred standalone mode');
  };
  harness.presentation.jsl.inter.non_blocking = {
    waitMSeconds: async function() {}
  };
  harness.presentation.jsl.inter.windows = {
    open_windows: {
      1: {
        ready: Promise.resolve(),
        context: context,
        setFullscreen: function() {},
        setTitle: function(title) {
          calls.push({ name: 'title', value: title });
        }
      }
    },
    openWindow: function(file) {
      calls.push({ name: 'open', value: file });
      return 1;
    }
  };

  await harness.presentation.editPresentation(pres_path);

  assert.deepEqual(calls.slice(0, 2), [
    { name: 'mode', value: pres_path },
    { name: 'open', value: 'presentation-editor.html' }
  ]);
  assert.deepEqual(set_path_calls[0], {
    file_path: pres_path,
    url: path.join(pres_path, 'index.html')
  });
}, { tags: ['unit', 'presentation', 'async'] });

exports.MODULE_TESTS = tests;
