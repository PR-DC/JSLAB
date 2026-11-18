/**
 * @file Source-wide JSLAB class, header and control-flow style contracts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { PRDC_JSLAB_TESTS } = require('../tester');
var tests = new PRDC_JSLAB_TESTS();

/**
 * Class for checking application source files without executing their runtimes.
 */
class PRDC_JSLAB_SOURCE_STYLE_TEST_HELPER {

  /**
   * Recursively lists application scripts, including each module's tests.
   * @param {string} folder Source directory.
   * @returns {Array<string>} Script paths.
   */
  static listScripts(folder) {
    const files = [];
    for(const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      if(entry.isDirectory()) {
        files.push(...this.listScripts(filename));
      } else if(/\.(js|mjs|cjs)$/.test(filename)) {
        files.push(filename);
      }
    }
    return files;
  }
}

tests.add('every application script has a header, documented methods and no file-level helper functions', function(assert) {
  const root = path.resolve(__dirname, '../../..');
  const findings = [];
  const files = PRDC_JSLAB_SOURCE_STYLE_TEST_HELPER.listScripts(path.join(root, 'js'));
  for(const folder of ['js', 'dev']) {
    files.push(...PRDC_JSLAB_SOURCE_STYLE_TEST_HELPER.listScripts(path.join(root, 'lib/openmodelica-jslab', folder)));
  }
  for(const filename of files) {
    const source = fs.readFileSync(filename, 'utf8');
    const relative = path.relative(root, filename);
    if(path.basename(filename).includes('-platform.')) {
      findings.push(relative + ': name the host service directly');
    }
    if(!/@file\b/.test(source.slice(0, 700))) {
      findings.push(relative + ': missing file header');
    }
    // Presentation output contains a source-template token, not executable input yet.
    const parsed = source.replace(/%presentation_config%/g, token => '_'.repeat(token.length));
    const ast = parser.parse(parsed, { sourceType: 'unambiguous', allowReturnOutsideFunction: true });
    traverse(ast, {
      Class(p) {
        const name = p.node.id?.name || '';
        if(relative.startsWith('lib' + path.sep + 'openmodelica-jslab' + path.sep) && name && !name.startsWith('PRDC_OMJSL_')) {
          findings.push(relative + ':' + p.node.loc.start.line + ': library classes must use the PRDC_OMJSL_ prefix');
        }
        if(name.endsWith('_PLATFORM') || /_HELPER_\d+$/.test(name) || name === 'PRDC_JSLAB_HELPER') {
          findings.push(relative + ':' + p.node.loc.start.line + ': class needs a descriptive service or adapter name');
        }
      },
      FunctionDeclaration(p) {
        if(!p.getFunctionParent()) {
          findings.push(relative + ':' + p.node.loc.start.line + ': file-level function ' + p.node.id.name);
        }
      },
      ClassMethod(p) {
        const comments = (p.node.leadingComments || []).filter(comment =>
          comment.type == 'CommentBlock' && comment.value.startsWith('*') && !comment.value.includes('@file'));
        if(!comments.some(comment => comment.value.replace(/^\*\s*/, '').split('@')[0].replace(/\*/g, '').trim())) {
          findings.push(relative + ':' + p.node.loc.start.line + ': method needs descriptive JSDoc');
        }
      },
      IfStatement(p) {
        if(source.slice(p.node.start, p.node.start + 3) != 'if(') {
          findings.push(relative + ':' + p.node.loc.start.line + ': use if(...) formatting');
        }
      }
    });
  }
  assert.ok(files.length >= 350);
  assert.deepEqual(findings, []);
}, { tags: ['unit', 'shared', 'style'], timeout_ms: 30000 });

exports.MODULE_TESTS = tests;
