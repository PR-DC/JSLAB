/**
 * @file JSLAB LaTeX toolchain regression checks
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_LATEX } = require('../latex');
const fs = require('node:fs/promises');
const path = require('node:path');
const { gzipSync } = require('node:zlib');

const tests = new PRDC_JSLAB_TESTS();

tests.add('LaTeX reverse jumps prefer the clicked text over a float elsewhere on the page', async function(assert) {
  const directory = path.join(app_path, 'temp');
  await fs.mkdir(directory, { recursive: true });
  const root = await fs.mkdtemp(path.join(directory, 'latex-synctex-'));
  const latex = new PRDC_JSLAB_LATEX();
  const main = path.join(root, 'main.tex');
  const figures = path.join(root, 'figures.tex');
  const pdf = path.join(root, 'main.pdf');
  const sp = points => Math.round(points * 65536 * 72.27 / 72);
  try {
    await Promise.all([fs.writeFile(main, ''), fs.writeFile(figures, '')]);
    await latex.open(main);
    latex.preview = { pdf };
    await fs.writeFile(path.join(root, 'main.synctex.gz'), gzipSync([
      'SyncTeX Version:1', 'Input:1:' + main, 'Input:2:' + figures,
      'Output:pdf', 'Magnification:1000', 'Unit:1', 'X Offset:0', 'Y Offset:0',
      'Content:', '{1', '(1,12:' + sp(140) + ',' + sp(265) + ':0,0,0',
      'x1,10:' + sp(200) + ',' + sp(265), ')',
      '(2,5:' + sp(150) + ',' + sp(332) + ':0,0,0', 'x2,4:' + sp(230) + ',' + sp(332),
      ')', '}1', 'Postamble:', 'Post scriptum:'
    ].join('\n')));
    let queries = 0;
    latex.query = async () => {
      queries++;
      return { Input: figures, Line: '14', Column: '-1' };
    };
    assert.deepEqual(await latex.reverse(1, 168, 262), { file: 'main.tex', line: 10, column: -1 });
    assert.deepEqual(await latex.reverse(1, 190, 329), { file: 'figures.tex', line: 4, column: -1 });
    assert.equal(queries, 0);
    assert.equal((await latex.reverse(1, 192, 450)).line, 14);
    assert.equal(queries, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

tests.add('LaTeX lists the project hierarchy and previews assets under its root', async function(assert) {
  const latex = new PRDC_JSLAB_LATEX();
  const folder = path.join(app_path, 'examples', 'resources', 'latex-project');
  const opened = await latex.open(folder);
  assert.equal(opened.main, 'main.tex');
  const images = opened.tree.find(entry => entry.name === 'images');
  assert.equal(images.children.length, 3);
  for(const asset of images.children) {
    const result = await latex.readAsset(asset.file);
    assert.equal(result.type, asset.preview);
    assert.ok(result.data.length > 0);
  }
  const chapter = path.join('sections', 'figures.tex');
  assert.equal((await latex.open(folder, chapter)).main, chapter);
  assert.equal((await latex.open(path.join(folder, 'main.tex'))).main, 'main.tex');
  assert.equal(await latex.open(folder, path.join('..', 'hello_world.tex')), null);
  assert.equal(await latex.resolvePath('..'), null);
});

tests.add('LaTeX parses SyncTeX locations without splitting drive letters and ignores secondary matches', async function(assert) {
  const latex = new PRDC_JSLAB_LATEX();
  const input = path.resolve('chapter.tex');
  latex.root = path.dirname(input);
  latex.preview = { pdf: path.resolve('main file.pdf') };
  latex.toolchain = { bin: { synctex: 'synctex' }, env: {} };
  latex.resolve = async file => {
    if(file === 'chapter.tex' || file === input) return input;
    return null;
  };
  latex.run = async (executable, args) => {
    assert.equal(executable, 'synctex');
    if(args[0] === 'view') {
      assert.equal(args[2], '8:2:' + input);
      assert.equal(args[4], latex.preview.pdf);
      return { output: 'SyncTeX result begin\r\nOutput:main file.pdf\r\nPage:2\r\nx:32.5\r\ny:42\r\n' +
        'h:31\r\nv:44\r\nW:10\r\nH:12\r\nOutput:main file.pdf\r\nPage:3\r\nSyncTeX result end' };
    }
    assert.equal(args[2], '2:32.500:42.000:' + latex.preview.pdf);
    return { output: 'SyncTeX result begin\r\nOutput:main file.pdf\r\nInput:' + input +
      '\r\nLine:8\r\nColumn:-1\r\nSyncTeX result end' };
  };
  const hit = await latex.forward('chapter.tex', 8, 2);
  assert.equal(hit.page, 2);
  assert.equal(hit.width, 10);
  const result = await latex.reverse(hit.page, hit.x, hit.y);
  assert.equal(result.file, 'chapter.tex');
  assert.equal(result.line, 8);
  assert.equal(result.column, -1);
});

tests.add('LaTeX retains the successful build when a later build fails or is cancelled', async function(assert) {
  const directory = path.join(app_path, 'temp');
  await fs.mkdir(directory, { recursive: true });
  const root = await fs.mkdtemp(path.join(directory, 'latex-project-'));
  const latex = new PRDC_JSLAB_LATEX();
  const build_dirs = [];
  let state = 'success';
  latex.toolchain = { bin: { latexmk: 'latexmk', pdflatex: path.join(root, 'TeX engine', 'pdflatex') }, env: {}, miktex: true };
  latex.build = async (_, args) => {
    const dir = args.find(arg => arg.startsWith('-outdir=')).slice(8);
    build_dirs.push(dir);
    const config = await fs.readFile(args[args.indexOf('-r') + 1], 'utf8');
    assert.ok(config.includes('TeX engine/pdflatex" --disable-installer -no-shell-escape'));
    assert.ok(args.includes('-norc'));
    if(state === 'cancel') latex.cancel();
    if(state === 'success') {
      await fs.writeFile(path.join(dir, 'main file.pdf'), 'first build');
      await fs.writeFile(path.join(dir, 'main file.synctex.gz'), 'first map');
    }
    if(state !== 'cancel') await fs.writeFile(path.join(dir, 'main file.log'), 'Compiler transcript: ' + state);
    return { code: state === 'fail' ? 1 : 0, output: 'Tool output: ' + state };
  };
  try {
    const folder = path.join(root, 'source');
    await fs.mkdir(folder);
    const main = path.join(folder, 'main file.tex');
    await fs.writeFile(main, 'source');
    const file = path.join('source', 'main file.tex');
    await latex.open(root, file);
    const success = await latex.compile(file, undefined, true);
    assert.equal(success.ok, true);
    assert.equal(success.log, 'Compiler transcript: success');
    assert.equal(await fs.readFile(path.join(folder, 'main file.pdf'), 'utf8'), 'first build');
    assert.equal(await fs.readFile(path.join(folder, 'main file.log'), 'utf8'), 'Compiler transcript: success');
    const previous = latex.preview.pdf;
    state = 'fail';
    const failed = await latex.compile(file, undefined, true);
    assert.equal(failed.ok, false);
    assert.equal(failed.log, 'Compiler transcript: fail');
    assert.equal(failed.output, 'Tool output: fail');
    state = 'cancel';
    assert.equal((await latex.compile(file, undefined, true)).cancelled, true);
    assert.equal(latex.preview.pdf, previous);
    assert.equal(await fs.readFile(previous, 'utf8'), 'first build');
    assert.equal(await fs.readFile(path.join(folder, 'main file.pdf'), 'utf8'), 'first build');
    assert.equal(await fs.readFile(path.join(folder, 'main file.log'), 'utf8'), 'Compiler transcript: fail');
    for(const dir of build_dirs.slice(1)) {
      assert.equal(await fs.stat(dir).catch(error => error.code), 'ENOENT');
    }
  } finally {
    await latex.clearPreview();
    await fs.rm(root, { recursive: true, force: true });
  }
});

exports.MODULE_TESTS = tests;
