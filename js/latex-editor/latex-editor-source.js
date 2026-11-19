/**
 * @file JSLAB LaTeX source formatting and keyboard commands
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const formats = [
  [['textbf', 761], ['textit', 762]],
  [['itemize', 763], ['enumerate', 764], ['indentMore', 765], ['indentLess', 766]],
  [['text', 767], ['section', 768], ['subsection', 769], ['subsubsection', 770], ['paragraph', 771], ['subparagraph', 772]]
];
const heading_icon = 'M2 4v8m5-8v8M2 8h5';
const format_icons = {
  textbf: 'M5 13V3h4a2.5 2.5 0 0 1 0 5H5m4 0a2.5 2.5 0 0 1 0 5H5',
  textit: 'M7 3h6M3 13h6M10 3 6 13',
  itemize: 'M6 4h8M6 8h8M6 12h8M2.5 4h.5m-.5 4h.5m-.5 4h.5',
  enumerate: 'M7 4h7M7 8h7M7 12h7M3 2.5v3M2 7h2L2 9h2m-2 2h2l-1 1 1 1H2',
  indentMore: 'M2 3h12M8 6h6M8 10h6M2 13h12M2 6l3 2-3 2',
  indentLess: 'M2 3h12M8 6h6M8 10h6M2 13h12m3-7L2 8l3 2',
  text: 'M3 4h10M3 8h10M3 12h7',
  section: heading_icon + 'M10 6l1-1v7',
  subsection: heading_icon + 'M10 5h3v3l-3 4h3',
  subsubsection: heading_icon + 'M10 5h3v7h-3m1-3.5h2',
  paragraph: heading_icon + 'M13 5v7m-3-7v4h4',
  subparagraph: heading_icon + 'M13 5h-3v3h3v4h-3'
};
const environments = ['align', 'align*', 'array', 'center', 'description', 'document', 'enumerate', 'equation',
  'figure', 'flushleft', 'flushright', 'gather', 'itemize', 'minipage', 'quote', 'table', 'tabular', 'verbatim'];
const commands = ['begin', 'end', 'documentclass', 'usepackage', 'title', 'author', 'date', 'maketitle', 'input',
  'include', 'includegraphics', 'caption', 'label', 'ref', 'pageref', 'eqref', 'cite', 'bibliography', 'bibliographystyle',
  'addbibresource', 'printbibliography', 'newcommand', 'renewcommand', 'newenvironment', 'emph', 'underline', 'texttt',
  'textrm', 'textsf', 'textsc', 'textsuperscript', 'textsubscript', 'item', 'footnote', 'frac', 'sqrt', 'left', 'right',
  'text', 'sum', 'prod', 'int', 'alpha', 'beta', 'gamma', 'pi', 'theta', 'newpage', 'tableofcontents',
  ...formats[0].map(([command]) => command), ...formats[2].slice(1).map(([command]) => command)];

/**
 * Applies native LaTeX formatting and provides source-specific commands.
 */
class PRDC_JSLAB_LATEX_EDITOR_SOURCE {

  /**
   * Builds the source-formatting toolbar and binds its commands.
   * @param {Object} editor Owning LaTeX editor.
   */
  constructor(editor) {
    this.editor = editor;
    this.code = editor.code;
    const menu = editor.$('latex-format-menu');
    const trigger = editor.$('format-source');
    for(const [index, group] of formats.entries()) {
      if(index) menu.append(document.createElement('hr'));
      for(const [format, id] of group) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'latex-icon';
        button.dataset.format = format;
        button.title = editor.strings[id];
        button.setAttribute('aria-label', button.title);
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.classList.add('latex-line-icon');
        icon.setAttribute('viewBox', '0 0 16 16');
        icon.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS(icon.namespaceURI, 'path');
        path.setAttribute('d', format_icons[format]);
        icon.append(path);
        button.append(icon);
        if(format === 'textbf' || format === 'textit') {
          button.setAttribute('aria-keyshortcuts', format === 'textbf' ? 'Control+B Meta+B' : 'Control+I Meta+I');
        }
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => {
          menu.hidePopover();
          this.format(format);
        });
        menu.append(button);
      }
    }
    menu.addEventListener('beforetoggle', event => {
      if(event.newState !== 'open') return;
      const anchor = trigger.getBoundingClientRect();
      menu.style.top = anchor.bottom + 4 + 'px';
      menu.style.right = Math.min(Math.max(8, window.innerWidth - anchor.right), Math.max(8, window.innerWidth - 340)) + 'px';
      const { first, last } = this.selectedLines();
      const list = this.enclosingList(first, last);
      const item = /^\s*\\item\b/.test(this.code.getLine(first));
      menu.querySelector('[data-format="indentMore"]').disabled = !item || !list || !this.hasListItem(list.start + 1, first);
      menu.querySelector('[data-format="indentLess"]').disabled = !item || !list || !this.enclosingList(list.start, list.end);
    });
    this.code.addKeyMap({
      'Ctrl-Space': () => this.complete(),
      'F2': 'toggleFold',
      'Shift-Alt-1': 'foldAll',
      'Shift-Alt-0': 'unfoldAll',
      'Ctrl-Alt-Left': () => this.selectOccurrence(true),
      'Ctrl-Alt-Right': () => this.selectOccurrence(false),
      'Alt-Left': 'goLineStart',
      'Alt-Right': 'goLineEnd',
      'Shift-Alt-Left': cm => cm.extendSelection({ line: cm.getCursor().line, ch: 0 }),
      'Shift-Alt-Right': cm => cm.extendSelection({ line: cm.getCursor().line, ch: cm.getLine(cm.getCursor().line).length }),
      'Ctrl-U': () => this.changeCase(true),
      'Shift-Ctrl-U': () => this.changeCase(false)
    });
    for(const modifier of ['Ctrl', 'Cmd']) {
      this.code.addKeyMap({
        [modifier + '-B']: () => this.format('textbf'),
        [modifier + '-I']: () => this.format('textit'),
        [modifier + '-/']: 'toggleComment',
        ['Shift-' + modifier + '-L']: () => this.goToLine(),
        ['Shift-' + modifier + '-D']: () => this.duplicate(),
        [modifier + '-Alt-Up']: () => this.verticalSelection(-1, true),
        [modifier + '-Alt-Down']: () => this.verticalSelection(1, true),
        ['Shift-' + modifier + '-Alt-Up']: () => this.verticalSelection(-1, false),
        ['Shift-' + modifier + '-Alt-Down']: () => this.verticalSelection(1, false),
        [modifier + '-Home']: 'goDocStart',
        [modifier + '-End']: 'goDocEnd'
      });
    }
  }

  /**
   * Applies one formatting command to the current source.
   * @param {string} command Formatting command.
   */
  format(command) {
    if(!this.editor.docs.get(this.editor.active)?.doc) return;
    if(command === 'indentMore' || command === 'indentLess') this.indentList(command === 'indentMore');
    else if(command === 'textbf' || command === 'textit') this.inline(command);
    else if(command === 'itemize' || command === 'enumerate') this.list(command);
    else this.heading(command);
    this.code.focus();
  }

  /**
   * Finds the closing brace of a LaTeX group, skipping escaped braces and comments.
   * @param {string} text Source beginning inside the group.
   * @returns {number} Index of its closing brace.
   */
  closingBrace(text) {
    let depth = 1;
    for(const match of text.matchAll(/\\(?:[A-Za-z]+|.)|%[^\r\n]*|[{}]/g)) {
      if(match[0] === '{') depth++;
      if(match[0] === '}' && --depth === 0) return match.index;
    }
    return -1;
  }

  /**
   * Wraps the selections, or removes the same style from a selection.
   * @param {string} command Inline LaTeX command.
   */
  inline(command) {
    const prefix = '\\' + command + '{';
    const cm = this.code;
    if(cm.listSelections().length === 1) {
      const from = cm.indexFromPos(cm.getCursor('from'));
      const to = cm.indexFromPos(cm.getCursor('to'));
      const source = cm.getValue('\n');
      const start = source.lastIndexOf(prefix, from);
      const content_start = start + prefix.length;
      if(start >= 0 && content_start <= from) {
        const closing = this.closingBrace(source.slice(content_start));
        const end = content_start + closing;
        if(closing >= 0 && to <= end) {
          cm.operation(() => {
            cm.replaceRange(source.slice(content_start, end), cm.posFromIndex(start), cm.posFromIndex(end + 1), '+input');
            cm.setSelection(cm.posFromIndex(from - prefix.length), cm.posFromIndex(to - prefix.length));
          });
          return;
        }
      }
      if(from === to) {
        cm.operation(() => {
          cm.replaceSelection(prefix + '}', 'end', '+input');
          cm.setCursor(cm.posFromIndex(from + prefix.length));
        });
        return;
      }
    }
    cm.replaceSelections(cm.getSelections().map(text => {
      if(text.startsWith(prefix) && this.closingBrace(text.slice(prefix.length)) === text.length - prefix.length - 1) {
        return text.slice(prefix.length, -1);
      }
      return prefix + text + '}';
    }), 'around', '+input');
  }

  /**
   * Changes an existing heading or turns the selection into a heading.
   * @param {string} command Heading level or normal text.
   */
  heading(command) {
    const cm = this.code;
    const line = cm.getCursor('from').line;
    const text = cm.getLine(line);
    const heading = /^(\s*)\\(section|subsection|subsubsection|paragraph|subparagraph)(\*?(?:\[[^\]]*\])?\s*\{)/.exec(text);
    if(heading) {
      if(command === 'text') {
        const argument = text.slice(heading[0].length);
        const closing = this.closingBrace(argument);
        if(closing >= 0) cm.replaceRange(argument.slice(0, closing), { line, ch: heading[1].length },
          { line, ch: heading[0].length + closing + 1 }, '+input');
      } else if(command !== heading[2]) {
        const start = heading[1].length + 1;
        cm.replaceRange(command, { line, ch: start }, { line, ch: start + heading[2].length }, '+input');
      }
    } else if(command !== 'text') {
      if(!cm.somethingSelected()) cm.setSelection({ line, ch: text.search(/\S|$/) }, { line, ch: text.length });
      this.inline(command);
    }
  }

  /**
   * Turns the selected lines into an itemized or numbered list.
   * @param {string} environment LaTeX list environment.
   */
  list(environment) {
    const cm = this.code;
    const { first, last } = this.selectedLines();
    const start = { line: first, ch: 0 };
    const end = { line: last, ch: cm.getLine(last).length };
    const lines = cm.getRange(start, end).split('\n');
    const indent = /^\s*/.exec(lines[0])[0];
    const existing = this.enclosingList(first, last);
    if(existing) {
      const { name, start, end } = existing;
      cm.operation(() => {
        if(name === environment && first <= start + 1 && last >= end - 1) {
          const plain = cm.getRange({ line: start + 1, ch: 0 }, { line: end, ch: 0 }).trimEnd()
            .split('\n').map(text => text.replace(/^(\s*)\\item(?:\[[^\]]*\])?\s*/, '$1'));
          cm.replaceRange(plain.join('\n'), { line: start, ch: 0 }, { line: end, ch: cm.getLine(end).length }, '+input');
          return;
        }
        for(const line of [start, end]) {
          const index = cm.getLine(line).indexOf('{' + name + '}') + 1;
          cm.replaceRange(environment, { line, ch: index }, { line, ch: index + name.length }, '+input');
        }
      });
      return;
    }
    const items = lines.filter(text => text.trim()).map(text => indent + '  ' + (/^\s*\\item\b/.test(text) ? '' : '\\item ') + text.trim());
    cm.operation(() => {
      cm.replaceRange([indent + '\\begin{' + environment + '}', ...(items.length ? items : [indent + '  \\item ']),
        indent + '\\end{' + environment + '}'].join('\n'), start, end, '+input');
      cm.setCursor(first + 1, cm.getLine(first + 1).length);
    });
  }

  /**
   * Locates the closest list containing the given lines.
   * @param {number} first First selected line.
   * @param {number} last Last selected line.
   * @returns {Object|null} Matching environment and line bounds.
   */
  enclosingList(first, last) {
    const stack = [];
    for(let line = 0; line < this.code.lineCount(); line++) {
      const match = /^\s*\\(begin|end)\{(itemize|enumerate)\}\s*(?:%.*)?$/.exec(this.code.getLine(line));
      if(match?.[1] === 'begin') stack.push({ start: line, name: match[2] });
      if(match?.[1] === 'end' && stack.at(-1)?.name === match[2]) {
        const entry = stack.pop();
        if(entry.start < first && line > last) return { ...entry, end: line };
      }
    }
    return null;
  }

  /**
   * Gets the line interval intersected by the active selection.
   * @returns {Object} Inclusive line bounds.
   */
  selectedLines() {
    const first = this.code.getCursor('from').line;
    const to = this.code.getCursor('to');
    return { first, last: to.line > first && to.ch === 0 ? to.line - 1 : to.line };
  }

  /**
   * Nests selected list items or lifts them into the enclosing list.
   * @param {boolean} increase Whether to add one nesting level.
   */
  indentList(increase) {
    const cm = this.code;
    const { first, last } = this.selectedLines();
    const list = this.enclosingList(first, last);
    if(!list) return;
    const body = (start, end) => Array.from({ length: end - start }, (_, index) => cm.getLine(start + index));
    const open = cm.getLine(list.start);
    const close = cm.getLine(list.end);
    const item_indent = /^\s*/.exec(cm.getLine(first))[0];
    const unit = ' '.repeat(cm.getOption('indentUnit'));
    const items = body(first, last + 1);
    if(increase) {
      if(!this.hasListItem(list.start + 1, first) || !/^\s*\\item\b/.test(items[0])) return;
      const nested = [item_indent + '\\begin{' + list.name + '}', ...items.map(text => unit + text),
        item_indent + '\\end{' + list.name + '}'];
      cm.operation(() => {
        cm.replaceRange(nested.join('\n'), { line: first, ch: 0 }, { line: last, ch: cm.getLine(last).length }, '+input');
        cm.setCursor(first + 1, item_indent.length + unit.length);
      });
      return;
    }
    const parent = this.enclosingList(list.start, list.end);
    if(!parent || !/^\s*\\item\b/.test(items[0])) return;
    const previous = body(list.start + 1, first);
    const following = body(last + 1, list.end);
    const indentation = /^\s*/.exec(open)[0];
    const lifted = items.map(text => text.startsWith(indentation + unit) ? text.slice(unit.length) : text);
    const prefix = this.hasListItem(list.start + 1, first) ? [open, ...previous, close] : previous;
    const suffix = this.hasListItem(last + 1, list.end) ? [open, ...following, close] : following;
    cm.operation(() => {
      cm.replaceRange([...prefix, ...lifted, ...suffix].join('\n'),
        { line: list.start, ch: 0 }, { line: list.end, ch: close.length }, '+input');
      cm.setCursor(list.start + prefix.length, indentation.length);
    });
  }

  /**
   * Checks whether a list fragment contains an item.
   * @param {number} first First line to inspect.
   * @param {number} end Exclusive end of the fragment.
   * @returns {boolean} Whether the fragment contains an item.
   */
  hasListItem(first, end) {
    for(let line = first; line < end; line++) {
      if(/^\s*\\item\b/.test(this.code.getLine(line))) return true;
    }
    return false;
  }

  /**
   * Changes the case of the selected source.
   * @param {boolean} upper Whether to uppercase the selection.
   */
  changeCase(upper) {
    this.code.replaceSelections(this.code.getSelections().map(text => upper ? text.toUpperCase() : text.toLowerCase()), 'around', '+input');
  }

  /**
   * Duplicates the selection or the current line.
   */
  duplicate() {
    const cm = this.code;
    if(cm.somethingSelected()) cm.replaceSelections(cm.getSelections().map(text => text + text), 'end', '+input');
    else {
      const line = cm.getCursor().line;
      const text = cm.getLine(line);
      cm.replaceRange('\n' + text, { line, ch: text.length }, null, '+input');
    }
  }

  /**
   * Adds the next or previous occurrence to the selection.
   * @param {boolean} reverse Whether to search backward.
   */
  selectOccurrence(reverse) {
    const cm = this.code;
    if(!cm.somethingSelected()) {
      const word = cm.findWordAt(cm.getCursor());
      cm.setSelection(word.anchor, word.head);
      return;
    }
    const text = cm.getSelection();
    if(!text) return;
    const selected = new Set(cm.listSelections().map(range => cm.indexFromPos(range.from())));
    for(const start of [cm.getCursor(reverse ? 'from' : 'to'), reverse ? { line: cm.lastLine(), ch: cm.getLine(cm.lastLine()).length } : { line: 0, ch: 0 }]) {
      const cursor = cm.getSearchCursor(text, start);
      while(cursor.find(reverse)) {
        if(selected.has(cm.indexFromPos(cursor.from()))) continue;
        cm.addSelection(cursor.from(), cursor.to());
        return;
      }
    }
  }

  /**
   * Copies the active selection to an adjacent line.
   * @param {number} direction Vertical movement in lines.
   * @param {boolean} cumulative Whether to retain the original selection.
   */
  verticalSelection(direction, cumulative) {
    const cm = this.code;
    const move = point => {
      const line = point.line + direction;
      const text = cm.getLine(line);
      return typeof text === 'string' ? { line, ch: Math.min(point.ch, text.length) } : null;
    };
    const anchor = move(cm.getCursor('anchor'));
    const current = cm.getCursor('head');
    const head = move(current);
    if(!anchor || !head) return;
    const selections = cm.listSelections();
    const ranges = selections.filter(range => cumulative || selections.length === 1 ||
      range.head.line !== current.line || range.head.ch !== current.ch);
    ranges.push({ anchor, head });
    cm.setSelections(ranges, ranges.length - 1);
  }

  /**
   * Opens a localized line-number prompt.
   */
  goToLine() {
    const label = document.createElement('label');
    label.textContent = this.editor.strings[773] + ' ';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 1;
    input.max = this.code.lineCount();
    label.append(input);
    this.code.openDialog(label, value => {
      const line = Number(value) - 1;
      if(line >= 0 && line < this.code.lineCount() && Number.isInteger(line)) {
        this.code.setCursor(line, 0);
        this.code.scrollIntoView({ line, ch: 0 }, 40);
      }
    });
  }

  /**
   * Opens LaTeX command, environment, reference, or bibliography completions.
   */
  complete() {
    this.code.showHint({ completeSingle: false, hint: cm => this.hints(cm) });
  }

  /**
   * Returns completion candidates for the token at the caret.
   * @param {Object} cm CodeMirror editor.
   * @returns {Promise<Object>} Completion list and replacement range.
   */
  async hints(cm) {
    const to = cm.getCursor();
    const line = cm.getLine(to.line).slice(0, to.ch);
    const argument = /\\(begin|end|(?:[A-Za-z]*cite[A-Za-z]*|(?:page|eq|auto|[cC])?ref)\*?(?:\[[^\]]*\])*)\{[^}]*?([^,\s{]*)$/i.exec(line);
    let prefix = /\\[A-Za-z]*$/.exec(line)?.[0] ?? '';
    let list = commands.map(command => '\\' + command);
    if(argument) {
      prefix = argument[2];
      const command = argument[1];
      if(command === 'begin' || command === 'end') list = environments;
      else {
        const cite = /cite/i.test(command);
        const files = (this.editor.project?.files || []).filter(file => (cite ? /\.bib$/i : /\.(?:tex|ltx)$/i).test(file));
        const text = await Promise.all(files.map(file => this.editor.docs.get(file)?.doc?.getValue() ?? this.editor.host.request('read', file)));
        const key = cite ? /@\w+\s*[({]\s*([^,\s]+)\s*,/g : /\\label\s*\{([^}]+)\}/g;
        list = text.flatMap(source => Array.from((source || '').matchAll(key), match => match[1]));
      }
    } else {
      list.push(...(cm.getValue().match(/\\[A-Za-z]+/g) || []));
    }
    return { list: [...new Set(list)].filter(value => value.startsWith(prefix)).sort(),
      from: { line: to.line, ch: to.ch - prefix.length }, to };
  }
}

exports.PRDC_JSLAB_LATEX_EDITOR_SOURCE = PRDC_JSLAB_LATEX_EDITOR_SOURCE;
