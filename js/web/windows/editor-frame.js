/**
 * @file Browser editor frame for in-page JSLAB windows
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { PRDC_POPUP } = require('../../../lib/PRDC_POPUP/PRDC_POPUP');
var { PRDC_JSLAB_EDITOR_SEARCH_ALL } = require('../../editor/search-all');
var { PRDC_JSLAB_EDITOR_SYMBOL_INPUT } = require('../../editor/symbol-input');
var { createCodeMirrorLintOptions } = require('../eslint');
var { PRDC_JSLAB_CODE_DOC_HOVER } = require('../../code/doc-hover');

var SECTION_MARKER_REGEX = /^\s*\/\/\/(?!\/).*$/;

(function() {
  function getBridge() {
    if(typeof globalThis.__JSLAB_WEB_getBridge == 'function') {
      return globalThis.__JSLAB_WEB_getBridge();
    }
    return null;
  }

  function getInitialFilePath() {
    return typeof globalThis.__JSLAB_WEB_EDITOR_FILE__ == 'string'
      ? globalThis.__JSLAB_WEB_EDITOR_FILE__
      : '';
  }

  function getInitialLineNumber() {
    return Number.isFinite(globalThis.__JSLAB_WEB_EDITOR_LINE__)
      ? Math.max(0, Number(globalThis.__JSLAB_WEB_EDITOR_LINE__))
      : 0;
  }

  function currentString(id, fallback) {
    var bridge = getBridge();
    var text = bridge && typeof bridge.currentString == 'function'
      ? bridge.currentString(id)
      : '';
    if(typeof text == 'string' && text.length) {
      return text;
    }
    return fallback || '';
  }

  function normalizePath(file_path) {
    var value = String(file_path || '').replace(/\\/g, '/').trim();
    if(!value.length) {
      return '';
    }
    if(!value.startsWith('/workspace/')) {
      value = '/workspace/' + value.replace(/^\/+/, '');
    }
    return value.replace(/\/+/g, '/');
  }

  function getBaseName(file_path) {
    var normalized = normalizePath(file_path);
    if(!normalized.length) {
      return 'Unknown';
    }
    var parts = normalized.split('/');
    return parts[parts.length - 1] || 'Unknown';
  }

  function getExtension(file_path) {
    var name = getBaseName(file_path);
    var idx = name.lastIndexOf('.');
    return idx >= 0 ? name.slice(idx).toLowerCase() : '';
  }

  function getBodyFileClass(file_path) {
    var ext = getExtension(file_path);
    return ext.length > 1 ? 'file-' + ext.slice(1) : '';
  }

  function escapeForRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function writeClipboardText(text) {
    var value = String(text || '');
    if(globalThis.navigator &&
        globalThis.navigator.clipboard &&
        typeof globalThis.navigator.clipboard.writeText == 'function') {
      try {
        await globalThis.navigator.clipboard.writeText(value);
        return true;
      } catch {}
    }
    return false;
  }

  async function readClipboardText() {
    if(globalThis.navigator &&
        globalThis.navigator.clipboard &&
        typeof globalThis.navigator.clipboard.readText == 'function') {
      try {
        return await globalThis.navigator.clipboard.readText();
      } catch {}
    }
    return '';
  }

  class PRDC_JSLAB_WEB_EDITOR_SCRIPT {

    constructor(win, script_manager, script_path, tab) {
      var obj = this;
      this.win = win;
      this.script_manager = script_manager;
      this.bridge = win.bridge;
      this.tab = tab;
      this.code_editor = null;
      this.code_doc_hover = null;
      this.code = '';
      this.path = typeof script_path == 'string' && script_path.length
        ? normalizePath(script_path)
        : undefined;
      this.name = this.path ? getBaseName(this.path) : 'Unknown';
      this.saved_code = '';
      this.closing = false;
      this.section_line_handles = [];
      this.section_refresh_timer = undefined;

      if(this.path) {
        this.loadCode(this.path);
      }

      this.tab.setAttribute('title', this.path || this.name);
      this.script_manager.setScriptNameByTab(this.tab, this.name);

      this.code_editor = CodeMirror(document.getElementById('code'), {
        theme: 'notepadpp',
        rulers: [{ color: '#aff', column: 75, lineStyle: 'solid' }],
        indentUnit: 2,
        tabSize: 2,
        lineNumbers: true,
        lineWrapping: true,
        styleActiveLine: true,
        matchBrackets: true,
        gutter: true,
        gutters: [
          'CodeMirror-linenumbers',
          'CodeMirror-foldgutter',
          'CodeMirror-lint-markers'
        ],
        foldGutter: true,
        searchDialog: true,
        highlightSelectionMatches: { annotateScrollbar: true }
      });

      this.code_editor.setOption('foldOptions', {
        rangeFinder: CodeMirror.fold.combine(
          function(cm, start_pos) {
            return obj.getSectionFoldRange(cm, start_pos);
          },
          CodeMirror.fold.auto
        ),
        scanUp: true
      });

      CodeMirror.keyMap.default['Shift-Tab'] = 'indentLess';
      CodeMirror.keyMap.default['Tab'] = 'indentMore';
      CodeMirror.keyMap.default['Ctrl-F'] = 'showSearchDialog';
      CodeMirror.keyMap.default['Ctrl-G'] = 'findNext';
      CodeMirror.keyMap.default['Shift-Ctrl-G'] = 'findPrev';
      CodeMirror.keyMap.default['Shift-Ctrl-F'] = 'replace';
      CodeMirror.keyMap.default['Shift-Ctrl-R'] = 'replaceAll';
      CodeMirror.keyMap.default['Ctrl-/'] = 'toggleComment';

      this.code_editor.on('keypress', function(cm, event) {
        if(!cm.state.completionActive &&
            !event.ctrlKey &&
            event.key != 'Enter' &&
            event.key != ';' &&
            event.key != ' ' &&
            event.key != '{' &&
            event.key != '}') {
          if(typeof CodeMirror.commands.autocomplete == 'function') {
            CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
          }
        }
      });

      this.code_editor.on('drop', function(_data, event) {
        event.preventDefault();
      });

      this.code_editor.getWrapperElement().addEventListener('contextmenu', function(event) {
        event.preventDefault();
        event.stopPropagation();
        var pos = obj.code_editor.coordsChar({ left: event.clientX, top: event.clientY });
        if(pos && isFinite(pos.line)) {
          obj.code_editor.setCursor(pos);
        }
        obj.win.openContextMenu(event.clientX, event.clientY);
      });

      this.code_editor.on('scroll', function() {
        obj.win.hideContextMenu();
      });

      this.code_editor.setValue(this.code);
      this.code_editor.clearHistory();
      this.refreshSectionDecorations();
      this.code_editor.on('change', function() {
        obj.codeChanged();
        obj.scheduleSectionDecorationsRefresh();
      });

      this.code_doc_hover = new PRDC_JSLAB_CODE_DOC_HOVER({
        on_print_doc: function(entry) {
          var query = entry && entry.doc_query ? entry.doc_query : '';
          if(!query.length) {
            return;
          }
          if(obj.bridge && typeof obj.bridge.showDocumentation == 'function') {
            obj.bridge.showDocumentation(query);
          }
        }
      });
      this.code_doc_hover.attach(this.code_editor);

      this.show();
      this.updateEditorMode();
    }

    loadCode(script_path) {
      try {
        this.code = this.bridge.readWorkspaceTextSync(script_path);
      } catch(err) {
        this.win.errorInternal(err && err.stack ? err.stack : String(err));
        this.code = '';
      }
      this.saved_code = this.code;
    }

    show() {
      var wrapper = this.code_editor && this.code_editor.getWrapperElement();
      document.querySelectorAll('#code .CodeMirror').forEach(function(el) {
        el.style.display = 'none';
      });
      if(this.closing) {
        document.getElementById('close-file').textContent = this.name;
        if(globalThis.jQuery) {
          globalThis.jQuery('#close-dialog-cont').fadeIn(300, 'linear');
        } else {
          document.getElementById('close-dialog-cont').style.display = 'block';
        }
      }
      if(wrapper) {
        wrapper.style.display = 'block';
      }
      this.code_editor.focus();
      this.updateEditorMode();
    }

    update() {
      this.code = this.code_editor.getValue();
    }

    save() {
      if(this.path === undefined) {
        return this.saveAs();
      }

      if(this.isActive()) {
        this.update();
      }

      if(this.code != this.saved_code) {
        try {
          this.bridge.writeWorkspaceTextSync(this.path, this.code);
        } catch(err) {
          this.win.errorInternal(err && err.stack ? err.stack : String(err));
          return false;
        }
        this.saved_code = this.code;
      }

      this.tab.classList.remove('changed');
      this.closing = false;
      this.tab.setAttribute('title', this.path || this.name);
      this.script_manager.updateActiveExtension(this);
      Promise.resolve(this.bridge.refreshWorkspaceList()).catch(function(err) {
        console.error(err);
      });
      return true;
    }

    async saveAs() {
      if(this.isActive()) {
        this.update();
      }

      var default_path = this.path ? getBaseName(this.path) : 'script.jsl';
      var prompt_text = currentString(144, 'Save script as');
      var save_target = this.bridge && typeof this.bridge.showSaveDialog == 'function'
        ? await this.bridge.showSaveDialog({
            title: prompt_text,
            defaultPath: default_path,
            buttonLabel: currentString(145, 'Save as'),
            filters: [{ name: 'jsl', extensions: ['jsl'] }]
          })
        : false;
      if(!save_target || save_target.canceled) {
        return false;
      }

      try {
        if(!this.bridge || typeof this.bridge.saveLocalFile != 'function') {
          this.win.errorInternal(prompt_text + ': local save is not available.');
          return false;
        }
        await this.bridge.saveLocalFile(save_target, this.code, {
          mimeType: 'text/plain;charset=utf-8',
          filePath: typeof save_target == 'object' ? save_target.filePath : default_path
        });
      } catch(err) {
        this.win.errorInternal(err && err.stack ? err.stack : String(err));
        return false;
      }
      return true;
    }

    remove() {
      this.closing = true;
      if(this.isActive()) {
        this.update();
      }
      if(this.code.replace(/[\r]/g, '') != this.saved_code.replace(/[\r]/g, '')) {
        if(this.isActive()) {
          document.getElementById('close-file').textContent = this.name;
          if(globalThis.jQuery) {
            globalThis.jQuery('#close-dialog-cont').fadeIn(300, 'linear');
          } else {
            document.getElementById('close-dialog-cont').style.display = 'block';
          }
        }
        return false;
      }
      return true;
    }

    removeCodeEditor() {
      if(this.section_refresh_timer) {
        clearTimeout(this.section_refresh_timer);
        this.section_refresh_timer = undefined;
      }
      if(this.code_doc_hover) {
        this.code_doc_hover.destroy();
        this.code_doc_hover = null;
      }
      this.win.hideContextMenu();
      if(this.code_editor && this.code_editor.getWrapperElement()) {
        this.code_editor.getWrapperElement().remove();
      }
    }

    isActive() {
      return this.tab == this.script_manager.active_tab;
    }

    activate() {
      if(!this.isActive()) {
        this.script_manager.activateScriptByTab(this.tab);
      } else {
        this.show();
      }
    }

    setLine(lineno, charpos) {
      if(!isFinite(lineno)) {
        return;
      }
      var line = Math.max(0, Number(lineno) - 1);
      var ch = Math.max(0, Number(charpos || 1) - 1);
      this.code_editor.setCursor({ line: line, ch: ch });
      this.code_editor.scrollIntoView({ line: line, ch: ch }, 80);
    }

    run(lines) {
      if(!this.save()) {
        this.win.disp('@editor/run: ' + currentString(131, 'Save failed.'));
        return false;
      }
      var code_to_run = this.getRunnableCode(lines);
      if(!String(code_to_run || '').trim().length) {
        return false;
      }
      var label = this.path || this.name;
      if(Array.isArray(lines)) {
        label += ':' + lines[0] + '-' + lines[1];
      } else if(isFinite(lines)) {
        label += ':' + Number(lines);
      }
      this.bridge.runEditorCode(code_to_run, label);
      return true;
    }

    getRunnableCode(lines) {
      var text = this.code_editor.getValue();
      if(lines === undefined) {
        return text;
      }
      var all_lines = text.split(/\r\n|\r|\n/g);
      if(Array.isArray(lines) && lines.length >= 2) {
        var start = Math.max(1, Number(lines[0] || 1));
        var end = Math.max(start, Number(lines[1] || start));
        return all_lines.slice(start - 1, end).join('\n');
      }
      if(isFinite(lines)) {
        var line = Math.max(1, Number(lines));
        return all_lines[line - 1] || '';
      }
      return text;
    }

    runCurrentSection() {
      var lines = this.getCurrentSectionLines();
      if(lines === undefined) {
        this.win.disp('@editor/runCurrentSection: ' + currentString(380, 'No runnable section found.'));
        return false;
      }
      return this.run(lines);
    }

    runCurrentLine() {
      var line = this.code_editor.getDoc().getCursor().line + 1;
      return this.run(line);
    }

    codeChanged() {
      this.tab.classList.add('changed');
      this.closing = false;
    }

    toggleComment() {
      this.code_editor.execCommand('toggleComment');
    }

    insertText(text) {
      if(typeof text !== 'string' || !text.length) {
        return;
      }
      this.code_editor.replaceSelection(text, 'end', '+input');
      this.code_editor.focus();
    }

    updateEditorMode() {
      var file_extension = getExtension(this.name);
      if(['.cpp', '.c', '.ino', '.h', '.hpp'].includes(file_extension)) {
        this.code_editor.setOption('mode', 'text/x-csrc');
        this.code_editor.setOption('lint', {});
        return;
      }
      this.code_editor.setOption('mode', 'javascript');
      this.code_editor.setOption('lint', createCodeMirrorLintOptions(CodeMirror));
    }

    openSearchDialog() {
      this.code_editor.execCommand('showSearchDialog');
    }

    compileArduino() {
      this.win.dispInternal('compileArduino is not available in web mode.');
    }

    uploadArduino() {
      this.win.dispInternal('uploadArduino is not available in web mode.');
    }

    isSectionMarkerLine(line_text) {
      return SECTION_MARKER_REGEX.test(String(line_text || ''));
    }

    getSectionFoldRange(cm, start_pos) {
      var start_line = start_pos.line;
      if(!this.isSectionMarkerLine(cm.getLine(start_line))) {
        return undefined;
      }

      var line_count = cm.lineCount();
      var end_line = line_count - 1;
      for(var i = start_line + 1; i < line_count; i++) {
        if(this.isSectionMarkerLine(cm.getLine(i))) {
          end_line = i - 1;
          break;
        }
      }

      if(end_line <= start_line) {
        return undefined;
      }

      return {
        from: CodeMirror.Pos(start_line, cm.getLine(start_line).length),
        to: CodeMirror.Pos(end_line, cm.getLine(end_line).length)
      };
    }

    getCurrentSectionLines() {
      var doc = this.code_editor.getDoc();
      var line_count = doc.lineCount();
      if(line_count < 1) {
        return undefined;
      }

      var cursor_line = doc.getCursor().line;
      var is_marker = (line_index) => {
        return this.isSectionMarkerLine(doc.getLine(line_index));
      };

      var prev_marker = -1;
      for(var i = cursor_line; i >= 0; i--) {
        if(is_marker(i)) {
          prev_marker = i;
          break;
        }
      }

      var next_marker = line_count;
      for(var j = cursor_line + 1; j < line_count; j++) {
        if(is_marker(j)) {
          next_marker = j;
          break;
        }
      }

      var start_line = prev_marker >= 0 ? prev_marker + 1 : 0;
      if(is_marker(cursor_line)) {
        start_line = cursor_line + 1;
      }
      var end_line = next_marker - 1;

      while(start_line <= end_line && !doc.getLine(start_line).trim().length) {
        start_line++;
      }
      while(end_line >= start_line && !doc.getLine(end_line).trim().length) {
        end_line--;
      }

      if(start_line > end_line) {
        return undefined;
      }

      return [start_line + 1, end_line + 1];
    }

    scheduleSectionDecorationsRefresh() {
      if(this.section_refresh_timer) {
        clearTimeout(this.section_refresh_timer);
      }
      var obj = this;
      this.section_refresh_timer = setTimeout(function() {
        obj.section_refresh_timer = undefined;
        obj.refreshSectionDecorations();
      }, 40);
    }

    refreshSectionDecorations() {
      if(!this.code_editor) {
        return;
      }

      var cm = this.code_editor;
      for(var i = 0; i < this.section_line_handles.length; i++) {
        var handle = this.section_line_handles[i];
        cm.removeLineClass(handle, 'text', 'jslab-section-marker-line');
        cm.removeLineClass(handle, 'background', 'jslab-section-marker-bg');
      }
      this.section_line_handles = [];

      var line_count = cm.lineCount();
      for(var line_i = 0; line_i < line_count; line_i++) {
        var line_text = cm.getLine(line_i);
        if(!this.isSectionMarkerLine(line_text)) {
          continue;
        }
        var line_handle = cm.getLineHandle(line_i);
        cm.addLineClass(line_handle, 'text', 'jslab-section-marker-line');
        cm.addLineClass(line_handle, 'background', 'jslab-section-marker-bg');
        this.section_line_handles.push(line_handle);
      }
    }
  }

  class PRDC_JSLAB_WEB_EDITOR_SCRIPT_MANAGER {

    constructor(win) {
      var obj = this;
      this.win = win;
      this.bridge = win.bridge;
      this.scripts = [];
      this.active_tab = undefined;
      this.tabs = new PRDC_TABS();
      this.tabs_cont = document.querySelector('.tabs');

      this.tabs.init(this.tabs_cont);

      this.tabs_cont.addEventListener('tabAdd', function(event) {
        document.getElementById('close-dialog-cont').style.display = 'none';
        event.detail.tabEl.onmousedown = function(e) {
          if(e && (e.which == 2 || e.button == 4 || e.button == 1)) {
            obj.removeScriptByTab(event.detail.tabEl);
          }
        };
      });

      this.tabs_cont.addEventListener('tabClose', function(event) {
        obj.removeScriptByTab(event.detail.tabEl);
      });

      this.tabs_cont.addEventListener('activeTabChange', function(event) {
        if(obj.active_tab !== undefined) {
          var last_script = obj.getScriptByTab(obj.active_tab)[0];
          if(last_script) {
            last_script.update();
          }
        }
        obj.active_tab = event.detail.tabEl;
        var script = obj.getScriptByTab(obj.active_tab)[0];
        if(script) {
          if(!script.closing) {
            document.getElementById('close-dialog-cont').style.display = 'none';
          }
          script.show();
        }
        obj.updateActiveExtension(script);
        obj.win.updateWindowTitle();
      });

      this.tabs_cont.addEventListener('tabRemove', function() {
        if(obj.scripts.length == 0) {
          obj.createUntitledScript();
        }
      });
    }

    allocateUntitledPathSync() {
      var index = 1;
      var file_path;
      do {
        file_path = '/workspace/Untitled-' + index + '.jsl';
        index += 1;
      } while(this.bridge.existsWorkspaceFileSync(file_path));
      return file_path;
    }

    createUntitledScript() {
      var file_path = this.allocateUntitledPathSync();
      this.bridge.writeWorkspaceTextSync(file_path, '');
      Promise.resolve(this.bridge.refreshWorkspaceList()).catch(function(err) {
        console.error(err);
      });
      this.createScript(file_path);
    }

    saveScript() {
      var script = this.getScriptByTab(this.active_tab)[0];
      return script ? script.save() : false;
    }

    saveAsScript() {
      var script = this.getScriptByTab(this.active_tab)[0];
      return script ? script.saveAs() : false;
    }

    openSearchDialog() {
      var script = this.getScriptByTab(this.active_tab)[0];
      if(script) {
        script.openSearchDialog();
      }
    }

    compileArduino() {
      var script = this.getScriptByTab(this.active_tab)[0];
      if(script) {
        script.compileArduino();
      }
    }

    uploadArduino() {
      var script = this.getScriptByTab(this.active_tab)[0];
      if(script) {
        script.uploadArduino();
      }
    }

    openScriptFile() {
      this.bridge.openMainDialog('paths-container');
    }

    openScript(data) {
      var script_path = normalizePath(data && data[0]);
      var script_lineno = data && data[1];
      var script_charpos = data && data[2];
      if(!script_path.length || !this.bridge.existsWorkspaceFileSync(script_path)) {
        return false;
      }
      var script = this.getScriptByPath(script_path)[0];
      if(script === undefined) {
        this.createScript(script_path, script_lineno, script_charpos);
      } else {
        script.activate();
        script.setLine(script_lineno, script_charpos);
      }
      return true;
    }

    runScript() {
      var script = this.getScriptByTab(this.active_tab)[0];
      return script ? script.run() : false;
    }

    runCurrentSection() {
      var script = this.getScriptByTab(this.active_tab)[0];
      return script ? script.runCurrentSection() : false;
    }

    runCurrentLine() {
      var script = this.getScriptByTab(this.active_tab)[0];
      return script ? script.runCurrentLine() : false;
    }

    createScript(script_path, lineno, charpos) {
      var tab = this.tabs.addTab({
        title: getBaseName(script_path),
        favicon: false
      });
      var script = new PRDC_JSLAB_WEB_EDITOR_SCRIPT(this.win, this, script_path, tab);
      this.scripts.push(script);
      if(isFinite(lineno)) {
        script.setLine(lineno, charpos);
      }
      this.updateActiveExtension(script);
      this.win.updateWindowTitle();
      return script;
    }

    toggleComment() {
      var script = this.getScriptByTab(this.active_tab)[0];
      if(script) {
        script.toggleComment();
      }
    }

    insertTextInActiveScript(text) {
      var script = this.getScriptByTab(this.active_tab)[0];
      if(script) {
        script.insertText(text);
      }
    }

    activateScriptByTab(tab) {
      this.tabs.setCurrentTab(tab);
    }

    activateScriptByPath(script_path) {
      var script = this.getScriptByPath(script_path)[0];
      if(script) {
        this.activateScriptByTab(script.tab);
      }
    }

    getScriptByTab(tab) {
      var index = this.scripts.findIndex(function(script) {
        return script.tab == tab;
      });
      return index > -1 ? [this.scripts[index], index] : [undefined, -1];
    }

    getScriptByPath(script_path) {
      var normalized = normalizePath(script_path);
      var index = this.scripts.findIndex(function(script) {
        return normalizePath(script.path) == normalized;
      });
      return index > -1 ? [this.scripts[index], index] : [undefined, -1];
    }

    setScriptNameByTab(tab, name) {
      this.tabs.updateTab(tab, {
        title: name,
        favicon: false
      });
    }

    finalizeRemoveScriptByIndex(index) {
      var script = this.scripts[index];
      var tab = script.tab;
      script.removeCodeEditor();
      this.scripts.splice(index, 1);
      this.tabs.removeTab(tab);
      this.updateActiveExtension(this.getScriptByTab(this.active_tab)[0]);
      this.win.updateWindowTitle();
    }

    removeScriptByTab(tab) {
      var result = this.getScriptByTab(tab);
      var script = result[0];
      var index = result[1];
      if(!script || index < 0) {
        return false;
      }
      script.activate();
      if(script.remove()) {
        this.finalizeRemoveScriptByIndex(index);
      }
      return true;
    }

    checkScriptOpenByPath(script_path) {
      return this.getScriptByPath(script_path)[0] !== undefined;
    }

    closingDialogButton(state) {
      var result = this.getScriptByTab(this.active_tab);
      var script = result[0];
      var index = result[1];
      if(!script || index < 0) {
        return false;
      }

      if(state == 2 || state == 1) {
        if(state == 2 && !script.save()) {
          return false;
        }
        this.finalizeRemoveScriptByIndex(index);
      } else {
        script.closing = false;
        document.getElementById('close-dialog-cont').style.display = 'none';
      }
      return true;
    }

    updateActiveExtension(script) {
      document.body.className = script ? getBodyFileClass(script.path) : '';
    }
  }

  class PRDC_JSLAB_WEB_EDITOR_FRAME {

    constructor() {
      var obj = this;
      this.bridge = getBridge();
      this.script_manager = new PRDC_JSLAB_WEB_EDITOR_SCRIPT_MANAGER(this);
      this.context_menu = document.getElementById('editor-context-menu');
      this.context_menu_run_line = document.getElementById('editor-context-run-line');
      this.context_menu_run_section = document.getElementById('editor-context-run-section');
      this.context_menu_toggle_comment = document.getElementById('editor-context-toggle-comment');
      this.context_menu_undo = document.getElementById('editor-context-undo');
      this.context_menu_redo = document.getElementById('editor-context-redo');
      this.context_menu_cut = document.getElementById('editor-context-cut');
      this.context_menu_copy = document.getElementById('editor-context-copy');
      this.context_menu_paste = document.getElementById('editor-context-paste');
      this.context_menu_select_all = document.getElementById('editor-context-select-all');
      this.editor = this;

      this.editor_symbol_input = new PRDC_JSLAB_EDITOR_SYMBOL_INPUT(this);
      this.editor_search_all = new PRDC_JSLAB_EDITOR_SEARCH_ALL(this);
      this.editor_more_popup = new PRDC_POPUP(
        document.getElementById('editor-more-icon'),
        document.getElementById('editor-more-popup'),
        function() {
          if(obj.editor_symbol_popup) {
            obj.editor_symbol_popup.close();
          }
        }
      );
      this.editor_symbol_popup = new PRDC_POPUP(
        document.getElementById('symbol-input-menu'),
        document.getElementById('editor-symbol-popup')
      );

      this.bindMenuActions();
      this.bindContextMenuActions();
      this.bindKeyActions();
      this.bindGlobalEvents();
      this.updateWindowTitle();
    }

    getSelectionText() {
      var text = '';
      if(globalThis.getSelection) {
        text = globalThis.getSelection().toString();
      } else if(document.selection && document.selection.type != 'Control') {
        text = document.selection.createRange().text;
      }
      return text;
    }

    getActiveCodeEditor() {
      var script = this.script_manager.getScriptByTab(this.script_manager.active_tab)[0];
      return script ? script.code_editor : undefined;
    }

    bindMenuActions() {
      var obj = this;

      document.getElementById('save-menu').addEventListener('click', function() {
        obj.script_manager.saveScript();
      });
      document.getElementById('save-as-menu').addEventListener('click', function() {
        obj.script_manager.saveAsScript();
      });
      document.getElementById('open-menu').addEventListener('click', function() {
        obj.script_manager.openScriptFile();
      });
      document.getElementById('run-menu').addEventListener('click', function() {
        obj.script_manager.runScript();
      });
      document.getElementById('new-tab').addEventListener('click', function() {
        obj.bridge.createUntitledEditorFile();
      });
      document.getElementById('new-script').addEventListener('click', function() {
        obj.bridge.createUntitledEditorFile();
      });

      document.getElementById('close-dialog-save').addEventListener('click', function() {
        obj.script_manager.closingDialogButton(2);
      });
      document.getElementById('close-dialog-discard').addEventListener('click', function() {
        obj.script_manager.closingDialogButton(1);
      });
      document.getElementById('close-dialog-cancel').addEventListener('click', function() {
        obj.script_manager.closingDialogButton(0);
      });

      document.getElementById('search-dialog-menu').addEventListener('click', function() {
        obj.script_manager.openSearchDialog();
        obj.editor_more_popup.close();
      });
      document.getElementById('search-all-menu').addEventListener('click', function() {
        obj.editor_search_all.open();
        obj.editor_more_popup.close();
      });
      document.getElementById('symbol-input-menu').addEventListener('click', function() {
        obj.editor_more_popup.close();
      });
      document.getElementById('compile-dialog-menu').addEventListener('click', function() {
        obj.script_manager.compileArduino();
        obj.editor_more_popup.close();
      });
      document.getElementById('upload-dialog-menu').addEventListener('click', function() {
        obj.script_manager.uploadArduino();
        obj.editor_more_popup.close();
      });
    }

    bindContextMenuActions() {
      var obj = this;

      function bindContextAction(element, action) {
        if(!element) {
          return;
        }
        element.addEventListener('click', function(event) {
          event.preventDefault();
          event.stopPropagation();
          Promise.resolve(action()).finally(function() {
            obj.hideContextMenu();
          });
        });
      }

      bindContextAction(this.context_menu_run_line, function() {
        obj.script_manager.runCurrentLine();
      });
      bindContextAction(this.context_menu_run_section, function() {
        obj.script_manager.runCurrentSection();
      });
      bindContextAction(this.context_menu_toggle_comment, function() {
        obj.script_manager.toggleComment();
      });
      bindContextAction(this.context_menu_undo, function() {
        var cm = obj.getActiveCodeEditor();
        if(cm) {
          cm.execCommand('undo');
        }
      });
      bindContextAction(this.context_menu_redo, function() {
        var cm = obj.getActiveCodeEditor();
        if(cm) {
          cm.execCommand('redo');
        }
      });
      bindContextAction(this.context_menu_cut, async function() {
        var cm = obj.getActiveCodeEditor();
        if(!cm) {
          return;
        }
        cm.focus();
        var selection = cm.getSelection();
        if(selection && selection.length) {
          if(await writeClipboardText(selection)) {
            cm.replaceSelection('', 'start', '+delete');
          }
        }
      });
      bindContextAction(this.context_menu_copy, async function() {
        var cm = obj.getActiveCodeEditor();
        if(!cm) {
          return;
        }
        var selection = cm.getSelection();
        if(selection && selection.length) {
          await writeClipboardText(selection);
        }
      });
      bindContextAction(this.context_menu_paste, async function() {
        var cm = obj.getActiveCodeEditor();
        if(!cm) {
          return;
        }
        var text = await readClipboardText();
        if(typeof text == 'string' && text.length) {
          cm.focus();
          cm.replaceSelection(text, 'end', '+input');
        }
      });
      bindContextAction(this.context_menu_select_all, function() {
        var cm = obj.getActiveCodeEditor();
        if(cm) {
          cm.execCommand('selectAll');
        }
      });
    }

    bindKeyActions() {
      var obj = this;
      document.addEventListener('keydown', function(event) {
        if(event.ctrlKey && event.key.toLowerCase() === 'n') {
          obj.bridge.createUntitledEditorFile();
          event.preventDefault();
        } else if(event.ctrlKey && event.key === 'F4') {
          obj.closeActiveTab();
          event.preventDefault();
        } else if(event.key === 'Escape') {
          obj.hideContextMenu();
        } else if(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
          var selected_text = '';
          var script = obj.script_manager.getScriptByTab(obj.script_manager.active_tab)[0];
          if(script && script.code_editor) {
            selected_text = script.code_editor.getSelection();
          }
          obj.editor_search_all.open(selected_text);
          event.stopPropagation();
          event.preventDefault();
        } else if((event.ctrlKey && event.key === 'Enter') || (event.shiftKey && event.key === 'F5')) {
          obj.script_manager.runCurrentSection();
          event.stopPropagation();
          event.preventDefault();
        } else if(event.key === 'F5') {
          obj.script_manager.runScript();
          event.preventDefault();
        } else if(event.ctrlKey && event.key.toLowerCase() === 'o') {
          obj.script_manager.openScriptFile();
          event.preventDefault();
        } else if(event.ctrlKey && event.key.toLowerCase() === 's' && !event.shiftKey) {
          obj.script_manager.saveScript();
          event.preventDefault();
        } else if(event.ctrlKey && event.key.toLowerCase() === 's' && event.shiftKey) {
          obj.script_manager.saveAsScript();
          event.preventDefault();
        }
      });
    }

    bindGlobalEvents() {
      var obj = this;

      document.addEventListener('click', function(event) {
        if(!obj.context_menu || obj.context_menu.style.display === 'none') {
          return;
        }
        if(!obj.context_menu.contains(event.target)) {
          obj.hideContextMenu();
        }
      });

      document.addEventListener('scroll', function() {
        obj.hideContextMenu();
      }, true);

      document.addEventListener('drop', function(event) {
        event.stopPropagation();
        event.preventDefault();
      }, false);

      document.addEventListener('dragover', function(event) {
        event.stopPropagation();
        event.preventDefault();
      }, false);
    }

    updateWindowTitle() {
      var script = this.script_manager.getScriptByTab(this.script_manager.active_tab)[0];
      var title = script ? script.name : currentString(518, 'Editor - JSLAB | PR-DC');
      document.title = title;
      if(typeof globalThis.__JSLAB_WEB_setFrameTitle == 'function') {
        globalThis.__JSLAB_WEB_setFrameTitle(title);
      }
    }

    openContextMenu(left, top) {
      if(!this.context_menu) {
        return;
      }

      this.context_menu.style.display = 'block';
      this.context_menu.style.left = '0px';
      this.context_menu.style.top = '0px';

      var rect = this.context_menu.getBoundingClientRect();
      var x = left;
      var y = top;
      var margin = 4;

      if((x + rect.width) > globalThis.innerWidth - margin) {
        x = Math.max(margin, globalThis.innerWidth - rect.width - margin);
      }
      if((y + rect.height) > globalThis.innerHeight - margin) {
        y = Math.max(margin, globalThis.innerHeight - rect.height - margin);
      }

      this.context_menu.style.left = x + 'px';
      this.context_menu.style.top = y + 'px';
    }

    hideContextMenu() {
      if(this.context_menu) {
        this.context_menu.style.display = 'none';
      }
    }

    disp(message) {
      this.bridge.appendConsoleMessage(String(message || ''), 'muted');
    }

    dispInternal(message) {
      this.bridge.appendConsoleMessage(String(message || ''), 'muted');
    }

    errorInternal(message) {
      this.bridge.appendConsoleMessage(String(message || ''), 'error');
    }

    openFile(file_path, lineno, charpos) {
      return this.script_manager.openScript([file_path, lineno, charpos]);
    }

    saveActiveTab() {
      return this.script_manager.saveScript();
    }

    closeActiveTab() {
      if(this.script_manager.active_tab) {
        return this.script_manager.removeScriptByTab(this.script_manager.active_tab);
      }
      return false;
    }

    hasDirtyTabs() {
      return this.script_manager.scripts.some(function(script) {
        return script.code.replace(/[\r]/g, '') != script.saved_code.replace(/[\r]/g, '');
      });
    }
  }

  async function start() {
    if(typeof globalThis.__JSLAB_WEB_applyFrameLanguage == 'function') {
      globalThis.__JSLAB_WEB_applyFrameLanguage();
    }

    var editor = new PRDC_JSLAB_WEB_EDITOR_FRAME();
    globalThis.__JSLAB_WEB_EDITOR__ = {
      openFile: function(file_path, lineno, charpos) {
        return editor.openFile(file_path, lineno, charpos);
      },
      saveActiveTab: function() {
        return editor.saveActiveTab();
      },
      closeActiveTab: function() {
        return editor.closeActiveTab();
      },
      hasDirtyTabs: function() {
        return editor.hasDirtyTabs();
      }
    };

    var initial_file = getInitialFilePath();
    if(initial_file.length) {
      editor.openFile(initial_file, getInitialLineNumber(), 1);
    }

    globalThis.__JSLAB_WEB_FRAME_onLanguageChange = function() {
      if(typeof globalThis.__JSLAB_WEB_applyFrameLanguage == 'function') {
        globalThis.__JSLAB_WEB_applyFrameLanguage();
      }
      if(editor.editor_symbol_input) {
        editor.editor_symbol_input.render();
      }
      if(editor.editor_search_all) {
        editor.editor_search_all.refreshLanguage();
      }
      editor.updateWindowTitle();
    };
  }

  document.addEventListener('DOMContentLoaded', function() {
    start().catch(function(err) {
      console.error(err && err.stack ? err.stack : err);
    });
  });
})();
