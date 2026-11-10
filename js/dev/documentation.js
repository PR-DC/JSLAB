/**
 * @file JSLAB documentation format helpers
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const MarkdownIt = require('markdown-it');
var markdown = new MarkdownIt();
var tick = '`';

/**
 * Extracts a top-level documentation section, including its heading.
 * @param {string} source Markdown documentation.
 * @param {string} title Section title.
 * @returns {string} Markdown section.
 */
function getMarkdownSection(source, title) {
  var tokens = markdown.parse(source, {});
  var lines = source.split('\n');
  for(var i = 0; i < tokens.length; i++) {
    if(tokens[i].type === 'heading_open' && tokens[i].tag === 'h2' &&
        tokens[i + 1].content === title) {
      var end = lines.length;
      for(var j = i + 1; j < tokens.length; j++) {
        if(tokens[j].type === 'heading_open' && tokens[j].tag === 'h2') {
          end = tokens[j].map[0];
          break;
        }
      }
      return lines.slice(tokens[i].map[0], end).join('\n').trim();
    }
  }
  throw new Error('Missing documentation section: ' + title);
}

/**
 * Escapes text without re-escaping generated LaTeX commands.
 * @param {string} value Plain text.
 * @returns {string} Escaped text.
 */
function escapeLatex(value) {
  var replacements = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}',
    '$': '\\$', '&': '\\&', '#': '\\#', '_': '\\_', '%': '\\%',
    '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' };
  return String(value).replace(/[\\{}$&#_%~^]/g, function(character) {
    return replacements[character];
  });
}

/**
 * Renders inline Markdown tokens as LaTeX.
 * @param {Array<Object>} tokens Inline tokens.
 * @returns {string} LaTeX text.
 */
function renderInlineLatex(tokens) {
  return tokens.map(function(token) {
    switch(token.type) {
      case 'code_inline': return '\\texttt{' + escapeLatex(token.content) + '}';
      case 'strong_open': return '\\textbf{';
      case 'em_open': return '\\emph{';
      case 'strong_close':
      case 'em_close':
      case 'link_close': return '}';
      case 'link_open': return '\\href{' + escapeLatex(token.attrGet('href')) + '}{';
      case 'softbreak': return ' ';
      case 'hardbreak': return '\\\\\n';
      default: return escapeLatex(token.content);
    }
  }).join('');
}

/**
 * Renders documentation headings, text, code, lists and two-column tables as LaTeX.
 * @param {string} source Markdown section.
 * @returns {string} LaTeX section.
 */
function renderLatex(source) {
  var output = '';
  var table_cell = 0;
  markdown.parse(source, {}).forEach(function(token) {
    switch(token.type) {
      case 'heading_open': {
        var level = Number(token.tag.slice(1));
        var command = level <= 2 ? 'section' : level === 3 ? 'subsection' : 'subsubsection';
        output += '\n\\' + command + '{';
        break;
      }
      case 'heading_close': output += '}\n\n'; break;
      case 'paragraph_close': output += '\n\n'; break;
      case 'inline': output += renderInlineLatex(token.children || []); break;
      case 'fence':
      case 'code_block':
        output += '\\begin{lstlisting}[style=JavaScriptStyle,language={}]\n' +
          token.content + '\\end{lstlisting}\n\n';
        break;
      case 'bullet_list_open': output += '\\begin{itemize}\n'; break;
      case 'bullet_list_close': output += '\\end{itemize}\n'; break;
      case 'ordered_list_open': output += '\\begin{enumerate}\n'; break;
      case 'ordered_list_close': output += '\\end{enumerate}\n'; break;
      case 'list_item_open': output += '\\item '; break;
      case 'table_open': output += '\\begin{longtable}{p{0.30\\linewidth}p{0.62\\linewidth}}\n\\hline\n'; break;
      case 'table_close': output += '\\hline\n\\end{longtable}\n'; break;
      case 'tr_open': table_cell = 0; break;
      case 'tr_close': output += ' \\\\\n'; break;
      case 'th_open':
      case 'td_open':
        if(table_cell++) output += ' & ';
        break;
      case 'thead_close': output += '\\hline\n'; break;
    }
  });
  return output;
}

/**
 * Formats a Markdown table cell without introducing extra rows or columns.
 * @param {*} value Cell value.
 * @returns {string} Markdown cell.
 */
function tableCell(value) {
  return String(value === undefined ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/**
 * Generates the Markdown API reference from the index used by HTML and TeX.
 * @param {Object} index Documentation index.
 * @returns {string} Markdown API reference.
 */
function renderMarkdownReference(index) {
  var output = '';
  Object.keys(index).forEach(function(group) {
    output += '### ' + (group === 'global' ? 'Global functions and properties' : 'Libraries') + '\n\n';
    Object.keys(index[group]).forEach(function(category) {
      output += '#### ' + category + '\n\n';
      Object.values(index[group][category]).forEach(function(item) {
        var params = item.params || [];
        var signature = item.name;
        if(item.kind === 'function') {
          signature += '(' + params.map(function(param) {
            return param.optional ? '[' + param.name + ']' : param.name;
          }).join(', ') + ')';
        }
        output += '##### ' + tick + signature + tick + '\n\n' + (item.description || '') + '\n\n';
        if(params.length) {
          output += '| Parameter | Type | Description |\n| --- | --- | --- |\n';
          params.forEach(function(param) {
            var type = param.type && param.type.names ? param.type.names.join(' | ') : 'Unknown';
            var description = param.description || '';
            if(param.optional) description += ' Optional.';
            if(param.defaultvalue !== undefined) description += ' Default: ' + tick + param.defaultvalue + tick + '.';
            output += '| ' + tick + tableCell(param.name) + tick + ' | ' + tick + tableCell(type) +
              tick + ' | ' + tableCell(description) + ' |\n';
          });
          output += '\n';
        }
        (item.returns || []).forEach(function(result) {
          var type = result.type && result.type.names ? result.type.names.join(' | ') : 'Unknown';
          output += '**Returns:** ' + tick + type + tick + ' ' + (result.description || '') + '\n\n';
        });
        if(item.kind === 'member' && item.type && item.type.names) {
          output += '**Type:** ' + tick + item.type.names.join(' | ') + tick + '\n\n';
        }
        (item.examples || []).forEach(function(example) {
          output += tick.repeat(3) + 'javascript\n' + example + '\n' + tick.repeat(3) + '\n\n';
        });
      });
    });
  });
  return output.replace(/[ \t]+$/gm, '').trimEnd();
}

exports.getMarkdownSection = getMarkdownSection;
exports.renderHtml = function(source) { return markdown.render(source); };
exports.renderLatex = renderLatex;
exports.renderMarkdownReference = renderMarkdownReference;
