/**
 * @file Generate sandbox documentation for JSLAB
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */

const path = require('path');
const { sourceFiles } = require('./documentation');

const { compilePdf } = require('./documentation');

const { PRDC_JSLAB_TEXT } = require('../other-shared/text');

/**
 * Class for dev make doc operations.
 */
class PRDC_JSLAB_DEV_MAKE_DOC_HELPER {

  /**
   * Handles process doc.
   * @param {*} module Module.
   */
  static async processDoc(module) {
    var docs_out;
    if(config.OUTPUT_COMPLETE_JSDOC) {
      docs_out = [];
    } else {
      docs_out = {};
    }
    var docs = await jsdoc.explain({ files: sourceFiles('js/sandbox/' + module.file + '.js') });
    docs.forEach(function(doc) {
      if(config.OUTPUT_COMPLETE_JSDOC) {
        docs_out.push(doc);
      } else if((doc.kind == 'function' || doc.kind == 'member') &&
          doc.memberof == module.class_name &&
          !doc.name.startsWith('_') &&
          !doc.name.startsWith('#') &&
          doc.name != 'jsl' &&
          doc.description) {
        var doc_output = {};
        doc_output.name = doc.name;
        doc_output.kind = doc.kind;
        doc_output.description = doc.description;
        if(doc.params) {
          doc_output.params = doc.params;
        }
        if(doc.returns) {
          doc_output.returns = doc.returns;
        }
        if(doc.async) {
          doc_output.async = doc.async;
        }
        if(doc.meta) {
          doc_output.source_filename = path.relative(path.resolve('js/sandbox'),
            path.resolve(doc.meta.path, doc.meta.filename)).replace(/\\/g, '/');
          doc_output.source_lineno = doc.meta.lineno;
          doc_output.source_range = doc.meta.range;
        }
        docs_out[doc.name] = doc_output;
      }
    });
    return docs_out;
  }

  /**
     * Returns latex by code category.
     * @param {*} category Category.
     * @param {Object} jslab_doc_flat Documentation indexed by category.
   * @param {Object} jslab_doc_flat Documented API grouped by category.
     */
  static getLatexByCodeCategory(category, jslab_doc_flat) {


    let latex = '';

    // Iterate over each item in the specified category
    latex += `\\subsection{${PRDC_JSLAB_TEXT.escapeLatex(category)}}\n`;

    for(const item_name in jslab_doc_flat[category]) {
      const item = jslab_doc_flat[category][item_name];

      if(item.kind === 'function') {
        // Generate the function signature
        const params = item.params
          ? item.params
            .map(param => {
              if(param.type === 'Object' && param.properties) {
                // Generate nested object structure for 'opts'
                const nestedSignature = param.properties
                  .map(prop =>
                    prop.optional
                      ? `[${PRDC_JSLAB_TEXT.escapeLatex(prop.name)}]`
                      : `${PRDC_JSLAB_TEXT.escapeLatex(prop.name)}`
                  )
                  .join(', ');

                // Format the 'opts' parameter
                return param.optional
                  ? `[${PRDC_JSLAB_TEXT.escapeLatex(param.name)}\\{ ${nestedSignature} \\}]`
                  : `${PRDC_JSLAB_TEXT.escapeLatex(param.name)}\\{ ${nestedSignature} \\}`;
              } else {
                // Handle simple parameters with optionality and default values
                return param.optional
                  ? `[${PRDC_JSLAB_TEXT.escapeLatex(param.name)}${param.default ? `=${PRDC_JSLAB_TEXT.escapeLatex(param.default)}` : ''}]`
                  : `${PRDC_JSLAB_TEXT.escapeLatex(param.name)}${param.default ? `=${PRDC_JSLAB_TEXT.escapeLatex(param.default)}` : ''}`;
              }
            })
            .join(', ')
          : "";

        // Add a title for the function
        latex += `\\vspace{5mm}\n\\noindent \\codeBlock{\\texttt{${PRDC_JSLAB_TEXT.escapeLatex(item.name)}(${params})}}{\\color{jsl-gray}\\vspace{2mm}\\hrule\\vspace{4mm}}\n\n`;

        // Add metadata if available
        if(item.since) {
          latex += `\\textbf{Added in:} v${PRDC_JSLAB_TEXT.escapeLatex(item.since)}\\\\\n`;
        }

        // Add parameters section
        if(item.params && item.params.length > 0) {
          latex += `\n\\noindent \\textbf{Parameters:}\n\\begin{itemize}\n`;
          item.params.forEach(param => {
            const type = param.type && param.type.names && param.type.names[0] ? param.type.names[0] : 'Unknown';
            latex += `  \\item \\texttt{${PRDC_JSLAB_TEXT.escapeLatex(param.name)}} \\texttt{<${PRDC_JSLAB_TEXT.escapeLatex(type)}>}: ${PRDC_JSLAB_TEXT.escapeLatex(param.description || '')}\n`;
          });
          latex += `\\end{itemize}\n`;
        }

        // Add returns section
        if(item.returns && item.returns.length > 0) {
          const returnType = item.returns[0].type && item.returns[0].type.names && item.returns[0].type.names[0] ? item.returns[0].type.names[0] : 'Unknown';
          latex += `\n\\noindent \\textbf{Returns:} \\texttt{<${PRDC_JSLAB_TEXT.escapeLatex(returnType)}>}: ${PRDC_JSLAB_TEXT.escapeLatex(item.returns[0].description || '')}\n`;
        }

        // Add description
        if(item.description) {
          latex += `\n\\noindent ${PRDC_JSLAB_TEXT.escapeLatex(item.description)}\n\n`;
        }

        // Add examples if available
        if(item.examples && item.examples.length > 0) {
          latex += `\\begin{verbatim}\n${PRDC_JSLAB_TEXT.escapeLatex(item.examples[0])}\n\\end{verbatim}\n\n`;
        }

      } else if(item.kind === 'member') {
        // Add a title for the member
        latex += `\\vspace{5mm}\n\\noindent \\code{\\texttt{${PRDC_JSLAB_TEXT.escapeLatex(item.name)}}}{\\color{jsl-gray}\\vspace{2mm}\\hrule}\\vspace{4mm}\n\n`;

        // Add metadata if available
        if(item.since) {
          latex += `\\textbf{Added in:} v${PRDC_JSLAB_TEXT.escapeLatex(item.since)}\\\\\n`;
        }

        // Add type information
        const type = item.type && item.type.names && item.type.names[0] ? item.type.names[0] : 'Unknown';
        latex += `\n\\noindent \\textbf{Type:} \\texttt{<${PRDC_JSLAB_TEXT.escapeLatex(type)}>}\n`;

        // Add description
        if(item.description) {
          latex += `\n\\noindent ${PRDC_JSLAB_TEXT.escapeLatex(item.description)}\n\n`;
        }
      }
    }

    latex += '\n';

    return latex;
  }
}


const jsdoc = require('jsdoc-api');
const fs = require('fs');
const cp = require("child_process");
const rimraf = require('rimraf');
const { getMarkdownSection, renderHtml, renderLatex,
  renderMarkdownReference } = require('./documentation');

require('../other-shared/init-config.js');

console.log('[make-doc.js] Started');
var t = performance.now();

var package_data = JSON.parse(fs.readFileSync('package.json'));
var app_version = package_data.version;
var year = new Date().getFullYear();

var jslab_doc = {
  'global': {},
  'lib': {}
};


(async function main() {


  config.SUBMODULES['builtin'].push(...config.DOC_SUBMODULES_ADDITIONAL);
  for(var module of config.SUBMODULES['builtin']) {
    console.log(' Generating documentation for: global/' + module.name);
    jslab_doc['global'][module.name] = await PRDC_JSLAB_DEV_MAKE_DOC_HELPER.processDoc(module);
  }
  for(var lib of config.SUBMODULES['lib']) {
    console.log(' Generating documentation for: lib/' + lib.name);
    jslab_doc['lib'][lib.name] = await PRDC_JSLAB_DEV_MAKE_DOC_HELPER.processDoc(lib);
  }
  var jslab_doc_flat = Object.values(jslab_doc).reduce((acc, innerObj) => {
    return { ...acc, ...innerObj };
  }, {});
  if(config.OUTPUT_COMPLETE_JSDOC) {
    return;
  }

  // Make JSON documentation
  console.log(' Making documentation.json');
  fs.writeFileSync('docs/documentation.json', JSON.stringify(jslab_doc, null, 2));

  // Make Markdown documentation
  console.log(' Making documentation.md');
  var markdown_template = fs.readFileSync('dev/documentation_template.md', 'utf8');
  markdown_template = markdown_template.replaceAll('$JSLAB_APP_VERSION$', 'v' + app_version);
  markdown_template = markdown_template.replaceAll('$JSLAB_PUBLISH_YEAR$', year);
  var mcp_section = getMarkdownSection(markdown_template, 'MCP server');
  var wasm_section = getMarkdownSection(markdown_template, 'WebAssembly backend');
  var cli_section = getMarkdownSection(markdown_template, 'Command-line interface');
  fs.writeFileSync('docs/documentation.md',
    markdown_template.replaceAll('$JSLAB_CODE_DATA$', function() {
      return renderMarkdownReference(jslab_doc);
    }));

  // Make HTML documentation
  console.log(' Making documentation.html');
  var html_template = fs.readFileSync('dev/documentation_template.html', 'utf8');
  html_template = html_template.replaceAll('$JSLAB_MCP_DATA$', function() {
    return JSON.stringify(renderHtml(mcp_section));
  });
  html_template = html_template.replaceAll('$JSLAB_WASM_DATA$', function() {
    return JSON.stringify(renderHtml(wasm_section));
  });
  html_template = html_template.replaceAll('$JSLAB_CLI_DATA$', function() {
    return JSON.stringify(renderHtml(cli_section));
  });
  html_template = html_template.replaceAll('$JSLAB_CODE_DATA$', JSON.stringify(jslab_doc_flat, null, 2));
  html_template = html_template.replaceAll('$JSLAB_APP_VERSION$', '"v' + app_version + '"');
  html_template = html_template.replaceAll('$JSLAB_PUBLISH_YEAR$', '"' + year + '"');
  fs.writeFileSync('docs/documentation.html', html_template);

  // Make tex
  console.log(' Making documentation.tex');
  var latex_template = fs.readFileSync('dev/documentation_template.tex', 'utf8');
  latex_template = latex_template.replaceAll('$JSLAB_MCP_DATA$', function() {
    return renderLatex(mcp_section);
  });
  latex_template = latex_template.replaceAll('$JSLAB_WASM_DATA$', function() {
    return renderLatex(wasm_section);
  });
  latex_template = latex_template.replaceAll('$JSLAB_CLI_DATA$', function() {
    return renderLatex(cli_section);
  });
  latex_template = latex_template.replaceAll('$JSLAB_APP_VERSION$', 'v' + app_version + '');
  latex_template = latex_template.replaceAll('$JSLAB_PUBLISH_YEAR$', year);


  var latex_text = '';
  for(const category in jslab_doc_flat) {
    latex_text += PRDC_JSLAB_DEV_MAKE_DOC_HELPER.getLatexByCodeCategory(category, jslab_doc_flat);
  }
  latex_template = latex_template.replaceAll('$JSLAB_CODE_DATA$', latex_text);
  fs.writeFileSync('docs/documentation.tex', latex_template.replace(/[ \t]+$/gm, ''));

  if(!process.argv.includes('--skip-pdf')) {
    console.log(' Making documentation.pdf');
    var dir = __dirname + '/../../dev/latex/';
    var file = dir + 'documentation.tex';
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync('docs/documentation.tex', file);
    fs.cpSync('docs/resources/', dir + 'resources/', { recursive: true });
    compilePdf(dir, 'documentation', config.DOC_LATEX_RERUNS_NUMBER);
    rimraf.sync(dir);
  }

  console.log('[make-doc.js] ' + ((performance.now() - t) / 1000).toFixed(3) + ' s');
})();
