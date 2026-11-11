/**
 * @file Checks UI source for untranslated text and invalid language references
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const parser = require('@babel/parser');

/** True for readable text rather than punctuation, numbers or template slots. */
function readable(text) {
  return /\p{L}/u.test(String(text).replace(/%[a-zA-Z_]+%/g, '').replace(/\$\{[^}]*\}/g, '').replace(/&(?:\w+|#\d+);/g, ''));
}

/** Checks HTML text and accessibility attributes; lang-fixed marks literal text. */
function checkHtml(source, filename, catalog) {
  const findings = [];
  const report = (offset, message) => findings.push({ file: filename,
    line: source.slice(0, offset).split('\n').length, message });
  for(const title of source.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)) {
    if(/<\/?[a-z]/i.test(title[1])) report(title.index, 'HTML title cannot contain translation markup; use title[str].');
  }
  const masked = source.replace(/<(script|style|metadata)\b[^>]*>[\s\S]*?<\/\1\s*>|<!doctype[^>]*>/gi,
    block => block.replace(/[^\n]/g, ' '));
  const stack = [];
  const tokens = /<!--[\s\S]*?-->|<\/?[a-zA-Z][\w:-]*(?:[^<>"']|"[^"]*"|'[^']*')*>|[^<]+/g;
  for(const token of masked.matchAll(tokens)) {
    const text = token[0];
    if(text.startsWith('<!--')) continue;
    if(text.startsWith('</')) {
      const tag = text.match(/^<\/([\w:-]+)/)[1].toLowerCase();
      const index = stack.findLastIndex(entry => entry.tag === tag);
      if(index >= 0) stack.length = index;
      continue;
    }
    if(text.startsWith('<')) {
      const tag = text.match(/^<([\w:-]+)/)[1].toLowerCase();
      const attrs = {};
      const attribute_text = text.slice(text.match(/^<[\w:-]+/)[0].length);
      for(const match of attribute_text.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
      const fixed = Object.hasOwn(attrs, 'lang-fixed');
      for(const attr of ['title', 'aria-label', 'placeholder', 'alt']) {
        if(readable(attrs[attr] || '') && !fixed && !Object.hasOwn(attrs, attr + '-str') &&
            !(attr === 'placeholder' && attrs.str)) report(token.index, 'Untranslated ' + attr + ': ' + attrs[attr]);
      }
      const references = ['sid', 'title-str', 'aria-label-str', 'alt-str', 'lang-str', 'str'];
      for(const attr of references) if(attrs[attr] && !catalog[attrs[attr]]) report(token.index, 'Unknown translation ID: ' + attrs[attr]);
      if(!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag) && !text.endsWith('/>')) {
        stack.push({ tag, fixed, localized: tag === 'str' || !!attrs['lang-str'] || tag === 'option' && !!attrs.str });
      }
    } else {
      const parent = stack.at(-1) || {};
      if(!parent.fixed && !parent.localized && readable(text)) report(token.index, 'Untranslated text: ' + text.trim().slice(0, 100));
    }
  }
  return findings;
}

/** Checks literal text at DOM and dialog rendering sites with Babel source locations. */
function checkJavaScript(source, filename, catalog) {
  const findings = [];
  const prepared = source.replace(/%presentation_config%/g, value => 'null'.padEnd(value.length));
  const ast = parser.parse(prepared, { sourceType: 'unambiguous', allowReturnOutsideFunction: true });
  const report = (node, message) => findings.push({ file: filename, line: node.loc.start.line, message });
  const fixed = node => (ast.comments || []).some(comment =>
    /^\s*lang-fixed\s*$/.test(comment.value) && comment.end <= node.start &&
    !source.slice(comment.end, node.start).trim());
  const property = node => node?.type === 'Identifier' ? node.name : node?.type === 'StringLiteral' ? node.value : '';
  const styles = new Set();
  const markup = node => {
    if(node?.type === 'StringLiteral') return node.value;
    if(node?.type === 'BinaryExpression' && node.operator === '+') return markup(node.left) + markup(node.right);
    if(node?.type === 'TemplateLiteral') return node.quasis.map(part => part.value.cooked).join('%dynamic%');
    return '%dynamic%';
  };
  const inspect = node => {
    if(!node) return;
    const html = markup(node);
    if(/<\/?[a-z]/i.test(html)) {
      findings.push(...checkHtml(html, filename, catalog).map(row => ({ ...row, line: node.loc.start.line + row.line - 1 })));
      return;
    }
    if(node.type === 'StringLiteral') {
      if(readable(node.value) && !fixed(node)) {
        if(/<\/?[a-z]/i.test(node.value)) findings.push(...checkHtml(node.value, filename, catalog).map(row => ({ ...row, line: node.loc.start.line + row.line - 1 })));
        else report(node, 'Untranslated UI literal: ' + node.value.slice(0, 100));
      }
    } else if(node.type === 'TemplateLiteral') {
      for(const part of node.quasis) if(readable(part.value.cooked) && !fixed(node)) report(part, 'Untranslated UI template: ' + part.value.cooked.slice(0, 100));
      node.expressions.forEach(inspect);
    } else if(node.type === 'BinaryExpression' || node.type === 'LogicalExpression') { inspect(node.left); inspect(node.right); }
    else if(node.type === 'ConditionalExpression') { inspect(node.consequent); inspect(node.alternate); }
    else if(node.type === 'ArrayExpression') node.elements.forEach(inspect);
  };
  const visit = node => {
    if(!node || typeof node !== 'object') return;
    if(node.type === 'ObjectProperty' && !node.computed && /^(label|title|placeholder|tooltip)$/.test(property(node.key))) inspect(node.value);
    if(node.type === 'VariableDeclarator' && node.init?.type === 'CallExpression' &&
        property(node.init.callee.property) === 'createElement' && node.init.arguments[0]?.value === 'style') styles.add(node.id.name);
    if(node.type === 'AssignmentExpression' && /^(textContent|innerText|innerHTML|outerHTML|title|placeholder|ariaLabel)$/.test(property(node.left?.property)) &&
        !styles.has(node.left.object?.name)) inspect(node.right);
    if(node.type === 'CallExpression') {
      const method = property(node.callee?.property || node.callee);
      if(['createTextNode', 'alert', 'confirm', 'prompt'].includes(method)) inspect(node.arguments[0]);
      if(['text', 'html'].includes(method)) inspect(node.arguments[0]);
      if(['setAttribute', 'attr'].includes(method) && /^(title|aria-label|placeholder|alt)$/.test(node.arguments[0]?.value || '')) inspect(node.arguments[1]);
      if(['currentString', 'string', 'formatLang'].includes(method) &&
          ['NumericLiteral', 'StringLiteral'].includes(node.arguments[0]?.type) &&
          !catalog[String(node.arguments[0].value)]) report(node, 'Unknown translation ID: ' + node.arguments[0].value);
    }
    for(const [key, value] of Object.entries(node)) {
      if(['loc', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens'].includes(key)) continue;
      if(Array.isArray(value)) value.forEach(visit);
      else if(value && typeof value === 'object') visit(value);
    }
  };
  visit(ast.program);
  return findings;
}

exports.checkHtml = checkHtml;
exports.checkJavaScript = checkJavaScript;

/** Scans application UI sources; generated builds, libraries and tests are excluded. */
function checkRepository(root, catalog) {
  const fs = require('fs');
  const path = require('path');
  const files = [];
  const walk = (folder, extension) => {
    for(const entry of fs.readdirSync(path.join(root, folder), { withFileTypes: true })) {
      if(entry.name === 'tests') continue;
      const name = folder + '/' + entry.name;
      if(entry.isDirectory()) walk(name, extension);
      else if(name.endsWith(extension)) files.push(name);
    }
  };
  walk('html', '.html');
  for(const folder of ['js/main', 'js/editor', 'js/code', 'js/web', 'js/windows']) walk(folder, '.js');
  const findings = files.flatMap(file => (file.endsWith('.html') ? checkHtml : checkJavaScript)(fs.readFileSync(path.join(root, file), 'utf8'), file, catalog));
  const languages = new (require(path.join(root, 'config/config.js')).PRDC_APP_CONFIG)().langs;
  for(const [id, entry] of Object.entries(catalog)) {
    const placeholders = text => [...String(text).matchAll(/\{([a-zA-Z_]\w*)\}/g)].map(match => match[1]).sort().join(',');
    for(const lang of languages) {
      if(typeof entry[lang] !== 'string' || !entry[lang].trim()) findings.push({ file: 'config/lang.json', line: 1, message: 'Missing ' + lang + ' translation for ID ' + id });
      else if(placeholders(entry.en) !== placeholders(entry[lang])) findings.push({ file: 'config/lang.json', line: 1, message: 'Mismatched placeholders for ID ' + id + ' (' + lang + ')' });
    }
  }
  return { files: files.length, findings };
}
exports.checkRepository = checkRepository;
