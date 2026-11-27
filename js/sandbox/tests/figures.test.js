/**
 * @file JSLAB figures submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for figures test fixtures.
 */
class PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER {

  /**
   * Creates figures harness.
   */
  static createFiguresHarness() {
    var file_reads = [];
    var jsl = {
      app_path: '/app',
      no_ans: false,
      ignore_output: false,
      inter: {
        env: {
          readFileSync: function(file_path) {
            file_reads.push(file_path);
            return Buffer.from('<html></html>');
          },
          error: function() {}
        }
      }
    };
    jsl.inter.file_system = {
      _writeSaveTarget: async function(target, data) {
        var file_path = typeof target == 'object' ? target.filePath : target;
        return jsl.inter.env.writeFileSync(file_path, data);
      }
    };
    var figures = new PRDC_JSLAB_LIB_FIGURES(jsl);
    return { figures, jsl, file_reads };
  }
}


const { PRDC_JSLAB_LIB_FIGURES } = require('../figures');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_SVG_TO_PDF } = require('../../other-shared/svg-to-pdf');
var tests = new PRDC_JSLAB_TESTS();

tests.add('PDF exports register and select the bundled Roboto style variants', async function(assert) {
  var { figures, jsl, file_reads } = PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER.createFiguresHarness();
  figures._registerFonts();
  assert.deepEqual(Object.keys(figures._fonts), [
    'Roboto', 'Roboto-Bold', 'Roboto-Italic', 'Roboto-BoldItalic', 'LatinModern'
  ]);
  assert.ok(file_reads.some(file => file.endsWith('-700italic.ttf')));
  figures._registerFonts();
  assert.equal(file_reads.length, 5);
  figures.open_figures[1] = { dom: { querySelector: () => ({ clientWidth: 500, clientHeight: 400 }) } };
  var events = {};
  var PDFDocument = class {
    /** Records a font registration accepted by the converter. */
    registerFont() {}

    /** Stores a PDF stream event callback for the test double. */
    on(name, callback) { events[name] = callback; }

    /** Completes the simulated PDF stream. */
    end() { events.end(); }
  };
  var SVGtoPDF = function(doc, data, x, y, options) {
    var choose = options.fontCallback;
    assert.equal(choose('Unavailable, "Roboto", sans-serif', true, true, {}), 'Roboto-BoldItalic');
    assert.equal(choose('serif, Roboto', false, true, {}), 'Times-Italic');
    var font_options = {};
    assert.equal(choose('LatinModern, serif', true, false, font_options), 'LatinModern');
    assert.equal(choose('LatinModernMath, serif', false, false, {}), 'LatinModern');
    assert.equal(font_options.fauxBold, true);
  };
  jsl.inter.env.svgToPdf = (data, width, height, fonts) =>
    PRDC_JSLAB_SVG_TO_PDF.convert(PDFDocument, SVGtoPDF, data, width, height, fonts);
  await figures._svg2pdf(1, '<svg width="500" height="400"/>');
}, { tags: ['unit', 'sandbox', 'figures'] });

tests.add('standalone SVG exports embed their bundled figure fonts', function(assert) {
  var { figures, file_reads } = PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER.createFiguresHarness();
  var input = '<svg xmlns="http://www.w3.org/2000/svg"><text style="font-family:&quot;Roboto&quot;, serif">' +
    'LatinModern</text></svg>';
  var embedded = figures._embedSvgFonts(input);
  assert.ok(embedded.includes('@font-face{font-family:Roboto;'));
  assert.ok(embedded.includes('data:font/woff2;base64,'));
  assert.ok(embedded.includes('>LatinModern</text>'));
  assert.equal(file_reads.length, 4);
  assert.equal(figures._embedSvgFonts('<svg><text font-family="serif">ok</text></svg>'),
    '<svg><text font-family="serif">ok</text></svg>');
  assert.equal(file_reads.length, 4);
}, { tags: ['unit', 'sandbox', 'figures'] });

tests.add('PDF export preserves literal text that matches a font family', async function(assert) {
  var { figures, jsl } = PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER.createFiguresHarness();
  var svg = '<svg><text font-family="LatinModern, serif">LatinModern</text></svg>';
  figures.open_figures[1] = { context: { plot: {
    toImage: async () => 'data:image/svg+xml,' + encodeURIComponent(svg)
  } } };
  figures._svg2pdf = async (fid, source) => {
    assert.equal(source, svg);
    return Buffer.from('%PDF');
  };
  jsl.inter.env.writeFileSync = (file, data) => {
    assert.equal(file, 'figure.pdf');
    assert.equal(data.toString(), '%PDF');
  };
  await figures.saveFigure(1, 'figure.pdf');
}, { tags: ['unit', 'sandbox', 'figures'] });

tests.add('PDF page dimensions follow the rendered SVG viewport', async function(assert) {
  var { figures, jsl } = PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER.createFiguresHarness();
  figures.open_figures[1] = { dom: { querySelector: () => ({ clientWidth: 800, clientHeight: 600 }) } };
  jsl.inter.env.svgToPdf = async (source, width, height) => [width, height];
  var svg = '<svg width="500" height="400"><path d="M0 0L1 1"/></svg>';
  assert.deepEqual(await figures._svg2pdf(1, svg), [500, 400]);
  assert.deepEqual(await figures._svg2pdf(1, svg, [700, 480]), [700, 480]);
}, { tags: ['unit', 'sandbox', 'figures'] });

tests.add('PDF export preserves a vector gradient opacity mask', async function(assert) {
  var { figures, jsl } = PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER.createFiguresHarness();
  figures.open_figures[1] = { dom: { querySelector: () => ({ clientWidth: 500, clientHeight: 400 }) } };
  figures._registerFonts = () => {};
  figures._fonts = {};
  jsl.inter.env.svgToPdf = (data, width, height, fonts) => PRDC_JSLAB_SVG_TO_PDF.convert(
    require('pdfkit'), require('svg-to-pdfkit'), data, width, height, fonts);
  var svg = `<svg width="500" height="400">
    <defs>
      <linearGradient id="opacity">
        <stop offset="0" stop-color="#1a1a1a"/>
        <stop offset="1" stop-color="#e6e6e6"/>
      </linearGradient>
      <mask id="surface-opacity" x="0" y="0" width="500" height="400" maskUnits="userSpaceOnUse">
        <rect width="500" height="400" fill="url(#opacity)"/>
      </mask>
    </defs>
    <g mask="url(#surface-opacity)"><path d="M0,0H500V400Z" fill="#478aa6"/></g>
  </svg>`;
  var pdf = (await figures._svg2pdf(1, svg)).toString('latin1');
  assert.ok(/\/SMask\s*<</.test(pdf), 'the gradient uses a PDF soft mask');
  assert.ok(!/\/Subtype\s*\/Image\b/.test(pdf), 'the masked surface contains no raster image objects');
}, { tags: ['unit', 'sandbox', 'figures'] });

tests.add('constructor records lazy figure template paths and initializes default state', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER.createFiguresHarness();
  assert.equal(harness.file_reads.length, 0);
  assert.ok(harness.figures._html_figure_path.endsWith('/html/html_figure.html'));
  assert.ok(harness.figures._i_html_figure_path.endsWith('/html/i_html_figure.html'));
  assert.ok(harness.figures._io_html_figure_path.endsWith('/html/io_html_figure.html'));
  assert.equal(harness.figures.active_figure, -1);
  assert.deepEqual(harness.figures.open_figures, {});
}, { tags: ['unit', 'figures'] });

tests.add('figure getters and active/close bookkeeping operate on stored entries', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER.createFiguresHarness();
  harness.figures.open_figures = {
    '1': { win: 'window-1', plot: { id: 'plot-1' } },
    '2': { win: 'window-2' }
  };

  harness.figures._setActiveFigure('1');
  assert.equal(harness.figures.active_figure, '1');
  assert.equal(harness.figures.getFigure('1').win, 'window-1');
  assert.equal(harness.figures.getFigureWindow('2'), 'window-2');
  assert.equal(harness.figures.getFigure('9'), false);
  assert.equal(harness.figures.getPlot('2'), false);
  assert.equal(harness.figures.getAxes('1').id, 'plot-1');
  assert.equal(harness.figures.gcf().win, 'window-1');
  assert.equal(harness.figures.gcp().id, 'plot-1');
  assert.equal(harness.figures.gca().id, 'plot-1');

  harness.figures._setActiveFigure('2');
  harness.figures._closedFigure('2');
  assert.equal(harness.figures.active_figure, '1');
  assert.equal(harness.figures.getFigure('2'), false);
}, { tags: ['unit', 'figures'] });

tests.add('closing all figures returns a promise for every pending close', async function(assert) {
  const { figures } = PRDC_JSLAB_SANDBOX_TESTS_FIGURES_TEST_HELPER.createFiguresHarness();
  let release;
  let closed = false;
  figures.open_figures = { 1: { close: () => new Promise(resolve => {
    release = resolve;
  }) } };
  const pending = figures.close('all').then(() => {
    closed = true;
  });
  await Promise.resolve();
  assert.equal(closed, false);
  release(true);
  await pending;
  assert.equal(closed, true);
}, { tags: ['unit', 'figures'] });

exports.MODULE_TESTS = tests;
