/**
 * @file Generate sandbox documentation for JSLAB
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */

const jsdoc = require('jsdoc-api');
const fs = require('fs');
const cp = require("child_process");
const rimraf = require('rimraf');

const { PRDC_APP_CONFIG } = require('../../config/config');

console.log('[make-sandbox-doc.js] Started');
var t = performance.now();

var package_data = JSON.parse(fs.readFileSync('package.json'));
var app_version = package_data.version;
var year = new Date().getFullYear();

var config = new PRDC_APP_CONFIG();
var jslab_doc = {
  'global': {},
  'lib': {}
};

async function processDoc(module) {
  var docs_out;
  if(config.OUTPUT_COMPLETE_JSDOC) {
    docs_out = [];
  } else {
    docs_out = {};
  }
  var docs = await jsdoc.explain({ files: 'js/sandbox/'+module.file+'.js' });
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
      docs_out[doc.name] = doc_output;
    }
  });
  return docs_out;
}

(async function main() {
  config.SUBMODULES['builtin'].push(...config.DOC_SUBMODULES_ADDITIONAL);
  for(var module of config.SUBMODULES['builtin']) { 
    console.log(' Generating documentation for: global/' + module.name);
    jslab_doc['global'][module.name] = await processDoc(module);
  }
  for(var lib of config.SUBMODULES['lib']) {
    console.log(' Generating documentation for: lib/' + lib.name);
    jslab_doc['lib'][lib.name] = await processDoc(lib);
  }
  var jslab_doc_flat = Object.values(jslab_doc).reduce((acc, innerObj) => {
    return { ...acc, ...innerObj };
  }, {});

  // Make JSON documentation
  console.log(' Making documentation.json');
  fs.writeFileSync('documentation.json', JSON.stringify(jslab_doc, null, 2));
  
  // Make HTML documentation
  console.log(' Making documentation.html');
  var html_template = fs.readFileSync('dev/documentation_template.html', 'utf8');
  html_template = html_template.replaceAll('$JSLAB_CODE_DATA$', JSON.stringify(jslab_doc_flat, null, 2));
  html_template = html_template.replaceAll('$JSLAB_APP_VERSION$', '"v'+app_version+'"');
  html_template = html_template.replaceAll('$JSLAB_PUBLISH_YEAR$', '"'+year+'"');
  fs.writeFileSync('documentation.html', html_template);
  
  // Make tex
  console.log(' Making documentation.tex');
  var latex_template = fs.readFileSync('dev/documentation_template.tex', 'utf8');
  latex_template = latex_template.replaceAll('$JSLAB_APP_VERSION$', 'v'+app_version+'');
  latex_template = latex_template.replaceAll('$JSLAB_PUBLISH_YEAR$', year);
  
  function getLatexByCodeCategory(category) {
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

    let latex = '';

    // Iterate over each item in the specified category
    latex += `\\subsection{${escapeLatex(category)}}\n`;
    
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
                        ? `[${escapeLatex(prop.name)}]`
                        : `${escapeLatex(prop.name)}`
                    )
                    .join(', ');

                  // Format the 'opts' parameter
                  return param.optional
                    ? `[${escapeLatex(param.name)}\\{ ${nestedSignature} \\}]`
                    : `${escapeLatex(param.name)}\\{ ${nestedSignature} \\}`;
                } else {
                  // Handle simple parameters with optionality and default values
                  return param.optional
                    ? `[${escapeLatex(param.name)}${param.default ? `=${escapeLatex(param.default)}` : ''}]`
                    : `${escapeLatex(param.name)}${param.default ? `=${escapeLatex(param.default)}` : ''}`;
                }
              })
              .join(', ')
          : "";

        // Add a title for the function
        latex += `\\vspace{5mm}\n\\noindent \\code{\\texttt{${escapeLatex(item.name)}(${params})}}{\\color{jsl-gray}\\vspace{2mm}\\hrule\\vspace{4mm}}\n\n`;

        // Add metadata if available
        if(item.since) {
          latex += `\\textbf{Added in:} v${escapeLatex(item.since)}\\\\\n`;
        }

        // Add parameters section
        if(item.params && item.params.length > 0) {
          latex += `\n\\noindent \\textbf{Parameters:}\n\\begin{itemize}\n`;
          item.params.forEach(param => {
            const type = param.type && param.type.names && param.type.names[0] ? param.type.names[0] : 'Unknown';
            latex += `  \\item \\texttt{${escapeLatex(param.name)}} \\texttt{<${escapeLatex(type)}>}: ${escapeLatex(param.description || '')}\n`;
          });
          latex += `\\end{itemize}\n`;
        }

        // Add returns section
        if(item.returns && item.returns.length > 0) {
          const returnType = item.returns[0].type && item.returns[0].type.names && item.returns[0].type.names[0] ? item.returns[0].type.names[0] : 'Unknown';
          latex += `\n\\noindent \\textbf{Returns:} \\texttt{<${escapeLatex(returnType)}>}: ${escapeLatex(item.returns[0].description || '')}\n`;
        }

        // Add description
        if(item.description) {
          latex += `\n\\noindent ${escapeLatex(item.description)}\n\n`;
        }

        // Add examples if available
        if(item.examples && item.examples.length > 0) {
          latex += `\\begin{verbatim}\n${escapeLatex(item.examples[0])}\n\\end{verbatim}\n\n`;
        }

      } else if(item.kind === 'member') {
        // Add a title for the member
        latex += `\\vspace{5mm}\n\\noindent \\code{\\texttt{${escapeLatex(item.name)}}}{\\color{jsl-gray}\\vspace{2mm}\\hrule}\\vspace{4mm}\n\n`;

        // Add metadata if available
        if(item.since) {
          latex += `\\textbf{Added in:} v${escapeLatex(item.since)}\\\\\n`;
        }

        // Add type information
        const type = item.type && item.type.names && item.type.names[0] ? item.type.names[0] : 'Unknown';
        latex += `\n\\noindent \\textbf{Type:} \\texttt{<${escapeLatex(type)}>}\n`;

        // Add description
        if(item.description) {
          latex += `\n\\noindent ${escapeLatex(item.description)}\n\n`;
        }
      }
    }
    
    latex += '\n'
    
    return latex;
  }

  var latex_text = '';
  for(const category in jslab_doc_flat) {
    latex_text += getLatexByCodeCategory(category);
  }
  latex_template = latex_template.replaceAll('$JSLAB_CODE_DATA$', latex_text);
  fs.writeFileSync('documentation.tex', latex_template);

  // Make pdf
  console.log(' Making documentation.pdf');
  
  var dir = __dirname + '/../../dev/latex/';
  var file = dir + 'documentation.tex';
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync('documentation.tex', file);
  try {
    for(var i = 0; i < config.DOC_LATEX_RERUNS_NUMBER; i++) {
      cp.execSync('cd ' + dir + ' & pdflatex documentation.tex --interaction=nonstopmode', { cwd: dir });
    }
    fs.copyFileSync(dir + 'documentation.pdf', 'documentation.pdf');
  } catch(e) {
    console.log(' LaTeX compile failed! Add path to pdflatex to environment variables and try again with MiKTeX 24.1 or later. Output: ');
    if(e.output) {
      console.log(e.output.toString());
    } else {
      console.log(e);
    }
  }
  rimraf.sync(dir);

  console.log('[make-sandbox-doc.js] ' + ((performance.now()-t)/1000).toFixed(3) + ' s');
})();
