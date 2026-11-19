/**
 * @file JSLAB LaTeX Editor controller
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_APP_CONFIG } = require('../../config/config');
const { PRDC_PANEL } = require('../../lib/PRDC_PANEL/PRDC_PANEL');
const { PRDC_POPUP } = require('../../lib/PRDC_POPUP/PRDC_POPUP');
const { PRDC_JSLAB_CODE_EDITOR } = require('../code/editor');
const { PRDC_JSLAB_CODE_SYMBOL_INPUT } = require('../code/symbol-input');
const { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');
const { PRDC_JSLAB_UI_CLOSE_DIALOG } = require('../windows/ui');
const { PRDC_JSLAB_LATEX_EDITOR_PREVIEW } = require('./latex-editor-preview');
const { PRDC_JSLAB_LATEX_EDITOR_PROJECT_TREE } = require('./latex-editor-project-tree');
const { PRDC_JSLAB_LATEX_EDITOR_SYMBOLS } = require('./latex-editor-symbols');
const { PRDC_JSLAB_LATEX_EDITOR_SOURCE } = require('./latex-editor-source');
const { PRDC_JSLAB_LATEX_EDITOR_COMPILER } = require('./compiler');

/**
 * Manages a LaTeX project, its source documents and the compiled PDF.
 */
class PRDC_JSLAB_LATEX_EDITOR {

  /**
   * Initializes the project tree and LaTeX Editor controls.
   * @param {Object} host Project request and event adapter.
   * @param {Object} settings Translations and stored pane sizes.
   * @param {Object} pdfjs PDF.js rendering services.
   * @param {Function} [createWorker] Host worker factory for WebAssembly compilation.
   */
  constructor(host, settings, pdfjs, createWorker) {
    if(createWorker) host = PRDC_JSLAB_LATEX_EDITOR_COMPILER.attach(host, settings.browser, createWorker);
    this.host = host;
    if(settings.browser) {
      document.getElementById('locate').hidden = true;
      document.getElementById('install').hidden = true;
    }
    this.strings = settings.strings;
    this.preferences = { engine: 'pdflatex', draft: false, reuse: false, halt: true, wrap: true, ...settings.preferences };
    this.docs = new Map();
    this.revision = 0;
    this.completed_build = false;
    this.$ = id => document.getElementById(id);
    PRDC_JSLAB_LANGUAGE.updateDocument({ currentString: id => this.strings[id] }, document);
    this.pdf = new PRDC_JSLAB_LATEX_EDITOR_PREVIEW(this.$('pdf-scroll'), pdfjs, () => this.perform(() => this.reverse()));
    this.asset_pdf = new PRDC_JSLAB_LATEX_EDITOR_PREVIEW(this.$('asset-pdf'), pdfjs);
    this.project_tree = new PRDC_JSLAB_LATEX_EDITOR_PROJECT_TREE(this.$('project-tree'), this);
    this.code = CodeMirror(this.$('code'), PRDC_JSLAB_CODE_EDITOR.options({
      mode: 'stex', lineWrapping: this.preferences.wrap, gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      foldOptions: { rangeFinder: CodeMirror.fold.indent },
      extraKeys: { 'Cmd-F': 'showSearchDialog' },
      jslabCurrentString: id => this.strings[id],
      jslabStorage: {
        get: () => settings.search_history,
        set: (_, history) => this.perform(() => this.host.request('search-history', history))
      }
    }));
    PRDC_JSLAB_CODE_EDITOR.bindShortcuts(CodeMirror);
    this.code.getWrapperElement().hidden = true;
    this.source = new PRDC_JSLAB_LATEX_EDITOR_SOURCE(this);
    this.initSymbols();
    this.code.on('cursorActivity', () => {
      const hit = this.source_hit;
      if(hit && (this.code.getDoc() !== hit.doc || this.code.getCursor().line !== hit.doc.getLineNumber(hit.handle))) {
        this.clearSourceHit();
      }
    });
    this.code.on('change', (_, change) => {
      if(change.origin === 'swapDoc') return;
      this.status = null;
      this.revision++;
      clearTimeout(this.outline_timer);
      this.outline_timer = setTimeout(() => this.renderOutline(), 120);
      this.update();
    });
    globalThis.config = new PRDC_APP_CONFIG();
    const panel_store = {
      get: key => settings.panels?.[key] ?? (key === 'panel-latex-editor-columns' ? settings.panel_size : undefined),
      set: (key, sizes) => this.host.request('panel', key, sizes)
    };
    const refresh = () => {
      this.code.refresh();
      this.symbol_popup.close();
      clearTimeout(this.resize_timer);
      this.resize_timer = setTimeout(() => this.perform(async () => {
        if(!this.$('pdf-scroll').hidden && this.pdf.needsFit) await this.display(this.pdf.number, true);
        if(!this.$('asset-pdf').hidden && !this.$('asset-preview').hidden && this.asset_pdf.needsFit) {
          await this.asset_pdf.render(this.asset_pdf.number, true);
        }
      }), 110);
    };
    const panel = new PRDC_PANEL('latex-editor-columns', 'vertical', this.$('columns'),
      [this.$('left-panel'), this.$('right-panel')], [58, 42], refresh, panel_store);
    const source_panel = new PRDC_PANEL('latex-editor-source', 'vertical', this.$('source-panel'),
      [this.$('project-panel'), this.$('source-content')], [30, 70], refresh, panel_store);
    const sidebar = new PRDC_PANEL('latex-editor-sidebar', 'horizontal', this.$('project-panel'),
      [this.$('tree-pane'), this.$('outline-pane')], [60, 40], null, panel_store);
    panel.addSubPanel(source_panel);
    source_panel.addSubPanel(sidebar);
    this.panel = panel;
    this.$('engine').value = this.preferences.engine;
    for(const [id, key] of [['draft-images', 'draft'], ['reuse-build', 'reuse'], ['halt-on-error', 'halt'], ['wrap-source', 'wrap']]) {
      this.$(id).checked = this.preferences[key];
    }
    this.$('toolchain').textContent = this.strings[749];
    this.renderOutline();
    window.addEventListener('resize', () => panel.onResize());
    this.bind();
    this.setMessages([]);
    this.update();
  }

  /**
   * Opens the shared symbol picker beneath the source toolbar.
   */
  initSymbols() {
    const button = this.$('symbol-input');
    const popup = this.$('latex-symbol-popup');
    new PRDC_JSLAB_CODE_SYMBOL_INPUT(this.$('latex-symbol-groups'), id => this.strings[id], text => {
      if(!this.docs.get(this.active)?.doc) return;
      const end = this.code.getCursor('to');
      if(/\\[A-Za-z]+$/.test(text) && /^[A-Za-z]/.test(this.code.getLine(end.line).slice(end.ch))) text += ' ';
      PRDC_JSLAB_CODE_EDITOR.insertText(this.code, text);
    }, PRDC_JSLAB_LATEX_EDITOR_SYMBOLS.key);
    this.symbol_popup = new PRDC_POPUP(button, popup, () => {
      const bounds = button.getBoundingClientRect();
      popup.style.top = bounds.bottom + 4 + 'px';
      popup.style.left = Math.max(10, bounds.right - popup.offsetWidth) + 'px';
      button.setAttribute('aria-expanded', 'true');
    }, () => button.setAttribute('aria-expanded', 'false'));
  }

  /**
   * Binds project, settings, compiler and viewport controls.
   */
  bind() {
    const click = (id, callback) => this.$(id).addEventListener('click', () => this.perform(callback));
    click('new-file', () => this.newSource());
    click('open-folder', () => this.open());
    click('refresh-files', () => this.refreshProject());
    click('toggle-tree', () => this.toggleSidebar('tree'));
    click('toggle-outline', () => this.toggleSidebar('outline'));
    click('save', () => this.save());
    for(const action of ['undo', 'redo']) {
      click(action + '-source', () => {
        this.code.execCommand(action);
        this.code.focus();
        this.update();
      });
    }
    click('search-source', () => this.code.execCommand('showSearchDialog'));
    click('forward', () => this.forward());
    click('reverse', () => this.reverse());
    click('compile', () => this.compile());
    click('cancel', () => this.host.request('cancel'));
    click('locate', async () => this.setup(await this.host.request('locate', this.preferences.engine)));
    click('install', () => this.host.request('install'));
    this.bindJumpMenus();
    click('previous', () => this.display(this.pdf.number - 1));
    click('next', () => this.display(this.pdf.number + 1));
    click('zoom-out', () => this.zoom(1 / 1.25));
    click('zoom-in', () => this.zoom(1.25));
    click('settings', async () => {
      this.$('latex-settings').showModal();
      if(!this.busy && !this.toolchain_checked) {
        this.showToolchain(await this.host.request('toolchain', this.preferences.engine));
      }
    });
    click('rotate', () => {
      this.pdf.rotation = (this.pdf.rotation + 90) % 360;
      return this.display(this.pdf.number, true);
    });
    click('asset-previous', () => this.pageAsset(-1));
    click('asset-next', () => this.pageAsset(1));
    click('show-messages', () => this.toggleMessages(this.$('compiler-messages').hidden));
    click('back-to-pdf', () => this.toggleMessages(false));
    this.$('message-filters').addEventListener('click', event => {
      const filter = event.target.closest('[data-message-filter]');
      if(filter) this.filterMessages(filter.dataset.messageFilter);
    });
    this.$('latex-settings').addEventListener('change', event => {
      if(event.target.id !== 'main-file') this.perform(() => this.savePreferences());
    });
    this.$('file-outline').addEventListener('click', event => {
      const row = event.target.closest('button[data-line]');
      if(row) this.perform(() => this.jump(this.active, Number(row.dataset.line), 1));
    });
    this.$('zoom').addEventListener('change', event => this.perform(() => this.setZoom(event.target.value)));
    this.$('main-file').addEventListener('change', event => this.perform(() => this.setMain(event.target.value)));
    this.$('page').addEventListener('change', event => this.perform(() => this.display(Number(event.target.value))));
    this.host.onClose(() => this.perform(() => this.close()));
    this.host.onOpen(project => {
      this.pending_file = project;
      this.perform(() => this.openPending());
    });
    this.close_dialog = new PRDC_JSLAB_UI_CLOSE_DIALOG(document, choice => this.close_answer?.(choice));
    document.addEventListener('keydown', event => {
      if(this.close_answer) return;
      if(event.key === 'Escape' && this.symbol_popup.visible) {
        event.preventDefault();
        this.symbol_popup.close();
        this.$('symbol-input').focus();
        return;
      }
      if(!this.$('latex-settings').open && (event.ctrlKey || event.metaKey) && ['s', 'Enter'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        this.perform(() => this.compile());
      }
    });
  }

  /**
   * Collapses a sidebar section and gives its space to the other section.
   * @param {string} section Sidebar section name.
   */
  toggleSidebar(section) {
    const button = this.$('toggle-' + section);
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    this.$(button.getAttribute('aria-controls')).hidden = open;
    this.$('project-panel').toggleAttribute('data-' + section + '-collapsed', open);
  }

  /**
   * Adds the same source and preview context actions as the Presentation Editor.
   */
  bindJumpMenus() {
    this.code.getWrapperElement().addEventListener('contextmenu', event => {
      if(!this.docs.get(this.active)?.doc) return;
      event.preventDefault();
      const file = this.active;
      const position = event.clientX === 0 && event.clientY === 0 ? this.code.getCursor() :
        this.code.coordsChar({ left: event.clientX, top: event.clientY }, 'window');
      this.perform(async () => {
        if(await this.host.request('jump-menu', 'forward') && file === this.active) {
          this.code.setCursor(position);
          await this.forward();
        }
      });
    });
    const preview = this.$('pdf-scroll');
    preview.addEventListener('pointerdown', () => this.updateReverseControl());
    preview.addEventListener('contextmenu', event => {
      if(!event.target.closest('.latex-page')) return;
      event.preventDefault();
      const page = this.pdf.number;
      const point = this.pdf.positionAt(event.clientX, event.clientY);
      this.perform(async () => {
        if(await this.host.request('jump-menu', 'reverse') && page === this.pdf.number) {
          await this.reverse(point);
        }
      });
    });
  }

  /**
   * Changes and saves the main document for the current project.
   * @param {string} file Project-relative TeX path.
   */
  async setMain(file) {
    const selector = this.$('main-file');
    if(this.busy || ![...selector.options].some(option => option.value === file)) return;
    selector.value = file;
    this.revision++;
    this.update();
    await this.host.request('choose-main', file);
  }

  /**
   * Saves compiler and source display preferences.
   */
  async savePreferences() {
    const previous = this.preferences;
    this.preferences = {
      engine: this.$('engine').value,
      draft: this.$('draft-images').checked,
      reuse: this.$('reuse-build').checked,
      halt: this.$('halt-on-error').checked,
      wrap: this.$('wrap-source').checked
    };
    if(previous.engine !== this.preferences.engine || previous.draft !== this.preferences.draft) this.revision++;
    this.code.setOption('lineWrapping', this.preferences.wrap);
    await this.host.request('preferences', this.preferences);
    this.update();
    if(previous.engine !== this.preferences.engine && !this.busy) {
      this.showToolchain(await this.host.request('toolchain', this.preferences.engine));
    }
  }

  /**
   * Displays the installed toolchain version reported by the selected engine.
   * @param {Object} result Compiler probe result.
   */
  showToolchain(result) {
    if(!result || (result.engine && result.engine !== this.preferences.engine)) return;
    this.toolchain_checked = true;
    this.$('toolchain').textContent = result.version || this.strings[751];
  }

  /**
   * Lists section headings in the active source, using original line numbers.
   */
  renderOutline() {
    const outline = this.$('file-outline');
    const doc = this.docs.get(this.active)?.doc;
    const rows = [];
    if(doc) {
      const levels = ['part', 'chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];
      const source = doc.getValue().replace(/\\.|%[^\n]*/g, token => token.startsWith('%') ? '' : token);
      const headings = /(?<!\\)\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\s*(?:\[[^\]]*\]\s*)?\{/g;
      let line = 1;
      let offset = 0;
      for(const match of source.matchAll(headings)) {
        line += source.slice(offset, match.index).split('\n').length - 1;
        offset = match.index;
        let end = match.index + match[0].length;
        let depth = 1;
        const start = end;
        for(; end < source.length && depth; end++) {
          if(source[end] === '\\') end++;
          else if(source[end] === '{') depth++;
          else if(source[end] === '}') depth--;
        }
        if(depth) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'latex-outline-link';
        button.dataset.line = line;
        button.style.paddingInlineStart = 4 + Math.max(0, levels.indexOf(match[1]) - 2) * 10 + 'px';
        button.textContent = source.slice(start, end - 1).replace(/\s+/g, ' ').trim();
        rows.push(button);
      }
    }
    if(!rows.length) {
      const message = document.createElement('p');
      message.className = 'latex-outline-empty';
      message.textContent = this.strings[doc ? 752 : 753];
      rows.push(message);
    }
    outline.replaceChildren(...rows);
  }

  /**
   * Runs a user action and reports any failure in the messages pane.
   * @param {Function} callback Action to run.
   */
  async perform(callback) {
    try {
      await callback();
    } catch(error) {
      this.setMessages([...this.messages, { severity: 'errors', message: error.message || this.strings[721] }]);
      this.showMessages(true);
    } finally {
      if(this.pending_file && !this.busy && !this.close_answer && !this.closing) await this.perform(() => this.openPending());
    }
  }

  /**
   * Opens a requested project after the current action finishes.
   */
  async openPending() {
    if(this.busy || this.close_answer || this.closing || !this.pending_file) return;
    const project = this.pending_file;
    this.pending_file = null;
    await this.open(project);
  }

  /**
   * Checks whether any source contains unsaved edits.
   * @returns {boolean} Whether the project has unsaved changes.
   */
  get dirty() {
    return [...this.docs.values()].some(entry => entry.doc && !entry.doc.isClean(entry.saved));
  }

  /**
   * Checks whether SyncTeX matches the current project state.
   * @returns {boolean} Whether source navigation is available.
   */
  get synced() {
    return this.pdf.count && this.built_revision === this.revision && !this.busy;
  }

  /**
   * Updates controls, modified source indicators and build status.
   */
  update() {
    const pdf = !this.$('pdf-scroll').hidden && this.pdf.count;
    const dirty = this.dirty;
    this.$('status').textContent = this.status ? this.strings[this.status] : '';
    this.$('status').hidden = !this.status || this.compiling;
    const clean = this.completed_build && !this.compiling;
    const message = this.strings[this.compiling ? 713 : clean ? 755 : 759];
    const empty_messages = this.$('empty-messages-text');
    if(empty_messages.textContent !== message) empty_messages.textContent = message;
    this.$('messages-ready').hidden = !clean;
    this.$('messages-pending').hidden = clean;
    const compile = this.$('compile');
    compile.title = this.strings[dirty ? 703 : 702];
    compile.setAttribute('aria-label', compile.title);
    compile.setAttribute('aria-busy', String(this.compiling));
    for(const id of ['open-folder', 'locate']) this.$(id).disabled = this.busy;
    for(const id of ['new-file', 'refresh-files']) this.$(id).disabled = this.busy || !this.project;
    this.$('save').disabled = !dirty || this.busy;
    compile.disabled = !this.$('main-file').value || this.busy;
    this.$('cancel').disabled = !this.compiling;
    this.$('cancel').hidden = !this.compiling;
    for(const id of ['engine', 'draft-images', 'reuse-build', 'halt-on-error']) this.$(id).disabled = this.busy;
    this.$('main-file').disabled = !this.$('main-file').options.length || this.busy;
    this.$('previous').disabled = !pdf || this.pdf.number < 2;
    this.$('next').disabled = !pdf || this.pdf.number >= pdf;
    for(const id of ['page', 'zoom-in', 'zoom-out', 'zoom', 'rotate']) this.$(id).disabled = !pdf;
    this.updateZoom();
    this.$('page').value = this.pdf.number;
    this.$('page').max = pdf;
    this.$('page').style.setProperty('--page-digits', String(this.pdf.count).length);
    this.$('pages').textContent = pdf ? '/ ' + pdf : '';
    this.$('empty-pdf').hidden = Boolean(pdf);
    this.$('asset-pages').textContent = this.asset_pdf.count ? this.asset_pdf.number + ' / ' + this.asset_pdf.count : '';
    this.$('asset-previous').disabled = this.asset_pdf.number <= 1;
    this.$('asset-next').disabled = this.asset_pdf.number >= this.asset_pdf.count;
    const active = this.docs.get(this.active);
    const history = active?.doc?.historySize();
    this.$('undo-source').disabled = !history?.undo;
    this.$('redo-source').disabled = !history?.redo;
    this.$('search-source').disabled = !active?.doc;
    this.$('format-source').disabled = !active?.doc;
    this.$('symbol-input').disabled = !active?.doc;
    if(!active?.doc) this.symbol_popup.close();
    this.$('forward').disabled = !active?.doc || this.busy;
    this.updateReverseControl();
    this.$('source-title').textContent = active?.name || '';
    this.$('source-title').title = this.active || '';
    this.$('source-dirty').hidden = !active?.doc || active.doc.isClean(active.saved);
    this.project_tree.markDirty(this.docs);
  }

  /**
   * Enables PDF-to-source jumps after the user selects a point on the page.
   */
  updateReverseControl() {
    const button = this.$('reverse');
    button.disabled = !this.pdf.position || this.busy;
    button.title = this.strings[this.pdf.count && !this.pdf.position ? 756 : 705];
  }

  /**
   * Prompts for unsaved changes before a project or tab closes.
   * @returns {Promise<boolean>} Whether the operation may proceed.
   */
  async discardOrSave() {
    if(!this.dirty) return true;
    const dirty = [...this.docs.values()].filter(entry => entry.doc && !entry.doc.isClean(entry.saved));
    const modal = this.$('latex-settings');
    if(modal.open) modal.close();
    const focus = document.activeElement;
    this.$('close-dialog-msg').hidden = dirty.length !== 1;
    this.$('close-project-msg').hidden = dirty.length === 1;
    const covered = ['columns', 'setup'].map(id => this.$(id));
    covered.forEach(element => { element.inert = true; });
    let response;
    try {
      response = await new Promise(resolve => {
        this.close_answer = resolve;
        this.close_dialog.show(dirty[0].name);
      });
    } finally {
      this.close_answer = null;
      this.close_dialog.hide();
      covered.forEach(element => { element.inert = false; });
      focus?.focus();
    }
    if(response === 'discard') return true;
    return response === 'save' && await this.saveDocuments();
  }

  /**
   * Replaces the current project after resolving any unsaved edits.
   * @param {Object} [request] Scripted project path and optional main document.
   */
  async open(request) {
    if(this.busy) return;
    this.busy = true;
    this.update();
    try {
      if(!await this.discardOrSave()) return;
      const project = request ? await this.host.request('open-path', request.file, request.main) :
        await this.host.request('open');
      if(!project) {
        if(project === null) this.status = 718;
        return;
      }
      this.selection = null;
      this.active = null;
      this.clearSourceHit();
      for(const entry of this.docs.values()) {
        if(entry.url) URL.revokeObjectURL(entry.url);
      }
      this.docs.clear();
      await Promise.all([this.pdf.clear(), this.asset_pdf.clear()]);
      this.project = project;
      this.revision++;
      this.status = null;
      this.completed_build = false;
      this.setMessages([]);
      this.showMessages(false);
      this.renderProject(project.main);
      this.showSource(null);
      if(this.$('main-file').value) await this.select(this.$('main-file').value);
      this.renderOutline();
    } finally {
      this.busy = false;
      this.update();
    }
  }

  /**
   * Updates the file tree and main-document selector.
   * @param {string|null} main Main document to keep selected.
   */
  renderProject(main) {
    this.project_tree.render(this.project);
    this.project_tree.select(this.active);
    const files = this.project.files.filter(file => /\.tex$/i.test(file));
    this.$('main-file').replaceChildren(...files.map(file => new Option(file, file)));
    if(files.includes(main)) this.$('main-file').value = main;
  }

  /**
   * Refreshes the project tree after an external file change.
   */
  async refreshProject() {
    if(this.busy) return;
    this.busy = true;
    try {
      Object.assign(this.project, await this.host.request('scan'));
      this.renderProject(this.$('main-file').value);
      this.revision++;
    } finally {
      this.busy = false;
      this.update();
    }
  }

  /**
   * Creates a TeX file while retaining unsaved edits in other files.
   */
  async newSource() {
    if(this.busy) return;
    this.busy = true;
    this.update();
    try {
      const result = await this.host.request('new');
      if(!result) return;
      Object.assign(this.project, { tree: result.tree, files: result.files });
      this.renderProject(this.$('main-file').value || result.file);
      this.revision++;
      await this.select(result.file);
    } finally {
      this.busy = false;
      this.update();
    }
  }

  /**
   * Opens a project folder in the system file manager.
   * @param {string} file Project-relative folder path.
   */
  async revealFolder(file) {
    if(!await this.host.request('reveal-folder', file)) {
      this.status = 721;
      this.update();
    }
  }

  /**
   * Selects a source or asset, loading its contents on first use.
   * @param {string} file Project-relative path.
   */
  async select(file) {
    if(!this.project || !file) return;
    const selection = this.selection = Symbol();
    if(!this.docs.has(file)) {
      const is_source = this.project.files.includes(file);
      const value = await this.host.request(is_source ? 'read' : 'read-asset', file);
      if(selection !== this.selection) return;
      if(value == null) {
        this.status = 718;
        this.update();
        return;
      }
      const name = file.split(/[\\/]/).pop();
      const entry = { name };
      if(is_source) {
        entry.doc = new CodeMirror.Doc(value, 'stex');
        entry.saved = entry.doc.changeGeneration();
        entry.separator = value.includes('\r\n') ? '\r\n' : '\n';
      } else {
        entry.asset = value;
      }
      this.docs.set(file, entry);
    }
    const entry = this.docs.get(file);
    if(this.active !== file) this.clearSourceHit();
    this.active = file;
    this.project_tree.select(file);
    if(entry.doc) this.showSource(entry.doc);
    else await this.showAsset(entry);
    this.renderOutline();
    this.update();
  }

  /**
   * Displays the source editor or the empty project message.
   * @param {Object|null} doc CodeMirror document to display.
   */
  showSource(doc) {
    this.$('asset-preview').hidden = true;
    this.$('code').hidden = false;
    this.$('empty-project').hidden = Boolean(doc);
    this.$('empty-project').textContent = this.strings[this.project ? 750 : 712];
    this.code.getWrapperElement().hidden = !doc;
    if(doc) {
      if(this.code.getDoc() !== doc) this.code.swapDoc(doc);
      this.code.refresh();
    }
  }

  /**
   * Displays a project asset instead of the source editor.
   * @param {Object} entry Selected asset.
   */
  async showAsset(entry) {
    this.$('code').hidden = true;
    this.$('asset-preview').hidden = false;
    const is_pdf = entry.asset.type === 'application/pdf';
    const is_text = entry.asset.type === 'text/plain';
    this.$('asset-image').hidden = is_pdf || is_text;
    this.$('asset-pdf').hidden = !is_pdf;
    this.$('asset-text').hidden = !is_text;
    this.$('asset-controls').hidden = !is_pdf;
    if(is_pdf) {
      await this.asset_pdf.load(new Uint8Array(entry.asset.data));
    } else if(is_text) {
      const text = this.$('asset-text');
      text.textContent = new TextDecoder().decode(entry.asset.data);
      text.setAttribute('aria-label', entry.name);
      text.scrollTo(0, 0);
    } else {
      entry.url ||= URL.createObjectURL(new Blob([entry.asset.data], { type: entry.asset.type }));
      this.$('asset-image').alt = entry.name;
      this.$('asset-image').src = entry.url;
    }
  }

  /**
   * Changes the page of a project PDF asset.
   * @param {number} step Relative page offset.
   */
  async pageAsset(step) {
    await this.asset_pdf.render(this.asset_pdf.number + step);
    this.update();
  }

  /**
   * Saves all modified source tabs and records their clean generations.
   * @returns {Promise<boolean>} Whether all sources are saved.
   */
  async saveDocuments() {
    for(const [file, entry] of this.docs) {
      if(!entry.doc || entry.doc.isClean(entry.saved)) continue;
      const generation = entry.doc.changeGeneration(true);
      if(!await this.host.request('save', file, entry.doc.getValue(entry.separator))) {
        this.status = 721;
        return false;
      }
      entry.saved = generation;
    }
    return !this.dirty;
  }

  /**
   * Saves project sources while the editing controls reflect the operation.
   */
  async save() {
    if(this.busy) return;
    this.busy = true;
    this.update();
    try {
      await this.saveDocuments();
    } finally {
      this.busy = false;
      this.update();
    }
  }

  /**
   * Displays any missing tools and the TeX installation controls.
   * @param {Object} result Toolchain detection result.
   * @returns {boolean} Whether compilation tools are available.
   */
  setup(result) {
    if(!result) return false;
    this.showToolchain(result);
    this.$('setup').hidden = !result.missing.length;
    this.$('missing-tools').textContent = result.missing.join(', ');
    this.panel.onResize();
    return !result.missing.length;
  }

  /**
   * Builds the selected main document and opens the successful PDF.
   */
  async compile() {
    if(this.busy || !this.$('main-file').value) return;
    this.busy = true;
    this.status = null;
    this.update();
    try {
      if(!await this.saveDocuments() || !this.setup(await this.host.request('detect', this.preferences.engine))) return;
      if(this.dirty) return;
      this.compiling = true;
      const revision = this.revision;
      this.update();
      const main = this.$('main-file').value;
      const result = await this.host.request('compile', main, this.preferences);
      if(result?.cancelled) {
        this.status = 732;
        return;
      }
      this.completed_build = Boolean(result?.ok);
      if(result?.project) {
        Object.assign(this.project, result.project);
        this.renderProject(main);
        const transcript = main.replace(/\.tex$/i, '.log');
        this.docs.delete(transcript);
        if(this.active === transcript) await this.select(transcript);
      }
      const messages = this.parseMessages(result?.log || result?.output || '');
      if(!result?.ok) {
        if(!messages.some(entry => entry.severity === 'errors') && result?.log && result.output) {
          messages.push(...this.parseMessages(result.output).filter(entry => entry.severity === 'errors'));
        }
        if(!messages.some(entry => entry.severity === 'errors')) messages.push({ severity: 'errors', message: this.strings[714] });
        this.setMessages(messages);
        this.showMessages(true);
        return;
      }
      this.setMessages(messages);
      this.built_revision = null;
      this.showMessages(false);
      await this.pdf.load(result.data);
      this.built_revision = revision;
      const output = main.replace(/\.tex$/i, '.pdf');
      this.docs.delete(output);
      if(this.active === output) await this.select(output);
    } finally {
      this.busy = false;
      this.compiling = false;
      this.update();
    }
  }

  /**
   * Switches the right pane between compiler messages and the compiled PDF.
   * @param {boolean} show Whether to show compiler messages.
   */
  showMessages(show) {
    this.$('compiler-messages').hidden = !show;
    this.$('pdf-scroll').hidden = show;
    this.$('pdf-page-controls').hidden = show;
    this.$('pdf-heading').hidden = show;
    this.$('messages-heading').hidden = !show;
    this.$('back-to-pdf').hidden = !show;
    this.$('show-messages').setAttribute('aria-expanded', String(show));
    this.update();
  }

  /**
   * Switches views and refits the PDF after it is made visible.
   * @param {boolean} show Whether to show compiler messages.
   */
  async toggleMessages(show) {
    this.showMessages(show);
    if(!show && this.pdf.needsFit) await this.display(this.pdf.number, true);
  }

  /**
   * Extracts errors and warnings from a TeX transcript.
   * @param {string} log Compiler output.
   * @returns {Object[]} Messages with any project source locations.
   */
  parseMessages(log) {
    const root = this.project?.root || '';
    const normalize = file => {
      const value = file.replace(/^"|"$/g, '').replaceAll('\\', '/').replace(/^\.\//, '');
      return /^[A-Z]:|^\\\\/i.test(root) ? value.toLowerCase() : value;
    };
    const files = new Map();
    for(const file of this.project?.files || []) {
      files.set(normalize(file), file);
      files.set(normalize(root + '/' + file), file);
    }
    const messages = [];
    let previous;
    for(const text of log.split(/\r?\n/)) {
      const value = text.trim();
      const location = value.match(/^(.+?\.(?:tex|bib|sty|cls|ltx|bst|dtx|ins)"?):(\d+):\s*(.+)$/i);
      const message = location?.[3] || value.replace(/^!\s*/, '');
      if(/^==>\s*Fatal error occurred, no output PDF file produced/i.test(message)) continue;
      const typesetting = /^(?:Over|Under)full \\[hv]box\b/i.test(message);
      const warning = /^(?:(?:LaTeX(?:3| Font)?|Package \S+|Class \S+|pdfTeX|LuaTeX|XeTeX|xdvipdfmx|BibTeX|Biber)\s+)?warning\b/i.test(message);
      const error = location || value.startsWith('!') ||
        /^(?:LaTeX(?:3)?|Package \S+|Class \S+|pdfTeX|LuaTeX|XeTeX|xdvipdfmx|BibTeX|Biber)\s+error\b|^(?:ERROR\s+-|I couldn't open (?:database|style) file\b)/i.test(message);
      if(typesetting || warning || error) {
        previous = { severity: typesetting ? 'typesetting' : warning ? 'warnings' : 'errors', message,
          file: location && files.get(normalize(location[1])), line: location && Number(location[2]) };
        messages.push(previous);
      } else if(previous && /^\([\w@-]+\)\s{2,}\S/.test(value)) {
        previous.message += ' ' + value.replace(/^\([\w@-]+\)\s+/, '');
      } else {
        previous = null;
      }
    }
    const seen = new Set();
    return messages.filter(({ severity, file, line, message }) => {
      const key = JSON.stringify([severity, file, line, message]);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Shows grouped diagnostics and links messages with known source locations.
   * @param {Object[]} messages Compiler and editor diagnostics.
   */
  setMessages(messages) {
    this.messages = messages;
    const badge = this.$('message-count');
    badge.hidden = !messages.length;
    badge.textContent = messages.length > 99 ? '99+' : messages.length;
    badge.dataset.severity = messages.find(entry => entry.severity === 'errors')?.severity ||
      messages.find(entry => entry.severity === 'warnings')?.severity || 'typesetting';
    const counts = [];
    this.$('message-filters').querySelector('[data-message-filter="all"] span').textContent = messages.length;
    for(const [severity, label] of [['errors', 644], ['warnings', 643], ['typesetting', 758]]) {
      const group = this.$('latex-' + severity);
      const entries = messages.filter(entry => entry.severity === severity);
      const filter = this.$('message-filters').querySelector('[data-message-filter="' + severity + '"]');
      filter.querySelector('span').textContent = entries.length;
      filter.disabled = !entries.length;
      if(entries.length) counts.push(this.strings[label] + ' (' + entries.length + ')');
      group.querySelector('h3 span').textContent = '(' + entries.length + ')';
      group.querySelector('ul').replaceChildren(...entries.map(({ message, file, line }) => {
        const row = document.createElement('li');
        const description = document.createElement('p');
        description.textContent = message;
        row.append(description);
        if(file && line) {
          const button = document.createElement('button');
          button.className = 'latex-icon';
          button.textContent = file + ':' + line;
          button.addEventListener('click', () => this.perform(() => this.jump(file, line, -1)));
          row.append(button);
        }
        return row;
      }));
    }
    const label = counts.join(', ') || this.strings[706];
    this.$('show-messages').title = label;
    this.$('show-messages').setAttribute('aria-label', label);
    this.filterMessages('all');
  }

  /**
   * Limits the visible compiler messages to a selected severity.
   * @param {string} selected Message category or all messages.
   */
  filterMessages(selected) {
    this.$('empty-messages').hidden = Boolean(this.messages.length);
    for(const button of this.$('message-filters').querySelectorAll('[data-message-filter]')) {
      const severity = button.dataset.messageFilter;
      button.setAttribute('aria-pressed', String(selected === severity));
      if(severity !== 'all') {
        this.$('latex-' + severity).hidden = button.disabled || (selected !== 'all' && selected !== severity);
      }
    }
  }

  /**
   * Renders a page of the compiled PDF and updates its controls.
   * @param {number} number One-based page number.
   * @param {boolean} preserve Retain the previous scroll position.
   * @param {Object|null} hit SyncTeX location to highlight.
   */
  async display(number, preserve = false, hit = null) {
    await this.pdf.render(number, preserve, hit);
    this.update();
  }

  /**
   * Changes the scale of the compiled PDF.
   * @param {number} factor Scale multiplier.
   */
  zoom(factor) {
    const current = this.pdf.fit ? this.pdf.page_view.viewport.scale : this.pdf.zoom;
    this.pdf.fit = false;
    this.pdf.zoom = Math.min(5, Math.max(0.15, current * factor));
    return this.display(this.pdf.number, true);
  }

  /**
   * Selects a preset zoom or fits the preview to its available width.
   * @param {string} value Zoom preset.
   */
  setZoom(value) {
    this.pdf.fit = value === 'fit';
    if(!this.pdf.fit) this.pdf.zoom = Number(value);
    return this.display(this.pdf.number, true);
  }

  /**
   * Shows the current zoom even when it falls between two presets.
   */
  updateZoom() {
    const zoom = this.$('zoom');
    const scale = this.pdf.page_view?.viewport.scale;
    const custom = zoom.options[zoom.options.length - 1];
    custom.textContent = scale ? Math.round(scale * 100) + '%' : '';
    if(this.pdf.fit) {
      zoom.value = scale ? 'custom' : 'fit';
    } else {
      const preset = [...zoom.options].find(option => Number(option.value) === this.pdf.zoom);
      zoom.value = preset?.value || 'custom';
    }
  }

  /**
   * Highlights the PDF location corresponding to the source cursor.
   */
  async forward() {
    if(this.busy || !this.docs.get(this.active)?.doc) return;
    if(!this.synced) {
      this.status = 715;
      this.update();
      return;
    }
    const revision = this.revision;
    const file = this.active;
    const sequence = this.jump_sequence = Symbol();
    const { line, ch } = this.code.getCursor();
    const result = await this.host.request('forward', file, line + 1, ch + 1);
    if(!this.synced || revision !== this.revision || file !== this.active || this.jump_sequence !== sequence) return;
    this.status = result ? null : 717;
    if(result) {
      clearTimeout(this.resize_timer);
      this.showMessages(false);
      await this.display(result.page, false, result);
    }
    this.update();
  }

  /**
   * Selects the project source corresponding to a PDF position.
   * @param {number[]} [point] PDF position to resolve.
   */
  async reverse(point = this.pdf.position) {
    if(this.busy || !point) return;
    if(!this.synced) {
      this.status = 715;
      this.update();
      return;
    }
    const revision = this.revision;
    const page = this.pdf.number;
    const sequence = this.jump_sequence = Symbol();
    const result = await this.host.request('reverse', page, ...point);
    if(!this.synced || revision !== this.revision || page !== this.pdf.number || this.jump_sequence !== sequence) return;
    this.status = result ? null : 717;
    if(result) await this.jump(result.file, result.line, result.column);
    this.update();
  }

  /**
   * Removes the highlight left by source navigation.
   */
  clearSourceHit() {
    const hit = this.source_hit;
    if(hit) {
      this.source_hit = null;
      hit.doc.removeLineClass(hit.handle, 'background', 'latex-source-hit');
    }
  }

  /**
   * Selects, scrolls to and highlights a location in the project source.
   * @param {string} file Project-relative source path.
   * @param {number} line One-based source line.
   * @param {number} column One-based source column or a negative value if unavailable.
   */
  async jump(file, line, column) {
    await this.select(file);
    if(this.active !== file || !this.docs.get(file)?.doc) return;
    this.clearSourceHit();
    const position = CodeMirror.Pos(line - 1, column > 0 ? column - 1 : 0);
    this.code.operation(() => {
      this.code.setCursor(position);
      const cursor = this.code.getCursor();
      const doc = this.code.getDoc();
      const handle = doc.addLineClass(cursor.line, 'background', 'latex-source-hit');
      this.source_hit = { doc, handle };
      this.code.scrollIntoView(cursor, 80);
    });
    this.code.focus();
  }

  /**
   * Confirms an application reload using the editor's regular save dialog.
   * @param {Function} focus Focuses this editor when its sources are dirty.
   * @returns {Promise<boolean>} Whether reloading is approved.
   */
  async confirmReload(focus) {
    if(this.closing || this.close_answer || (this.busy && !this.compiling)) return false;
    if(this.dirty) await focus();
    return this.discardOrSave();
  }

  /**
   * Closes the editor after prompting for modified sources.
   */
  async close() {
    if(this.closing) return;
    if(this.busy && !this.compiling) {
      await this.host.request('keep-open');
      return;
    }
    this.closing = true;
    let close = false;
    try {
      if(this.dirty) await this.host.request('focus');
      close = await this.discardOrSave();
      if(close) await this.host.request('close');
    } finally {
      this.closing = false;
      if(!close) await this.host.request('keep-open');
    }
  }
}

exports.PRDC_JSLAB_LATEX_EDITOR = PRDC_JSLAB_LATEX_EDITOR;
