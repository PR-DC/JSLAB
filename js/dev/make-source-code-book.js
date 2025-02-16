/**
 * @file Generate source code book for JSLAB
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */

const fs = require('fs');
const cp = require("child_process");
const rimraf = require('rimraf');

const { PRDC_APP_CONFIG } = require('../../config/config');

console.log('[make-source-code-book.js] Started');
var t = performance.now();

var package_data = JSON.parse(fs.readFileSync('package.json'));
var app_version = package_data.version;
var year = new Date().getFullYear();

var config = new PRDC_APP_CONFIG();

(async function main() {
  // Make tex
  console.log(' Making source-code-book.tex');
  var latex_template = fs.readFileSync('dev/source_code_template.tex', 'utf8');
  latex_template = latex_template.replaceAll('$JSLAB_APP_VERSION$', 'v'+app_version+'');
  latex_template = latex_template.replaceAll('$JSLAB_PUBLISH_YEAR$', year);
  
    // Helper function to escape LaTeX special characters
    function escapeLatex(string) {
      if(typeof string !== 'string') {
        return string;
      }
      return string
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/`/g, '\\textasciigrave{}');
    }


  var latex = '';
  // TODO

  latex_template = latex_template.replaceAll('$JSLAB_SOURCE_CODE_DATA$', latex);
  fs.writeFileSync('source-code-book.tex', latex_template);

  // Make pdf
  console.log(' Making source-code-book.pdf');
  
  var dir = __dirname + '/../../dev/latex/';
  var file = dir + 'source-code-book.tex';
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync('source-code-book.tex', file);
  try {
    for(var i = 0; i < config.DOC_LATEX_RERUNS_NUMBER; i++) {
      cp.execSync('cd ' + dir + ' & pdflatex source-code-book.tex --interaction=nonstopmode', { cwd: dir });
    }
    fs.copyFileSync(dir + 'source-code-book.pdf', 'source-code-book.pdf');
  } catch(e) {
    console.log(' LaTeX compile failed! Add path to pdflatex to environment variables and try again with MiKTeX 24.1 or later. Output: ');
    if(e.output) {
      console.log(e.output.toString());
    } else {
      console.log(e);
    }
  }
  rimraf.sync(dir);

  console.log('[make-source-code-book.js.js] ' + ((performance.now()-t)/1000).toFixed(3) + ' s');
})();
