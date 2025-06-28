/**
 * @file JSLAB library presentation editor script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
const { ipcRenderer } = require('electron');
 
const fs = require('fs');
const path = require('path');
const { ESLint } = require("eslint");
require("../js/init-config.js");

const { PRDC_POPUP } = require('../lib/PRDC_POPUP/PRDC_POPUP');
const { PRDC_PANEL } = require('../lib/PRDC_PANEL/PRDC_PANEL');

/**
 * Class for JSLAB presentation editor code tab.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_PRESENTATION_EDITOR class.
   */
  constructor(editor, name, file) {
    var obj = this;
    this.editor = editor;
    
    this.tab = this.editor.tabs.addTab({
      title: name,
      favicon: false
    });
    this.tab.tab_obj = this;

    this.code_editor = CodeMirror(document.getElementById("code"), {
      theme: "notepadpp",
      rulers: [{ color: "#aff", column: 75, lineStyle: "solid" }],
      indentUnit: 2,
      tabSize: 2,
      lineNumbers: true,
      lineWrapping: true,
      styleActiveLine: true,
      matchBrackets: true,
      gutter: true,
      gutters: [
        "CodeMirror-linenumbers",
        "CodeMirror-foldgutter",
        "CodeMirror-lint-markers",
      ],
      foldGutter: true,
      searchDialog: true,
      highlightSelectionMatches: { annotateScrollbar: true },
    });
    
    CodeMirror.keyMap.default["Shift-Tab"] = "indentLess";
    CodeMirror.keyMap.default["Tab"] = "indentMore";
    CodeMirror.keyMap.default["Ctrl-F"] = "showSearchDialog";
    CodeMirror.keyMap.default['Ctrl-G'] = 'findNext';
    CodeMirror.keyMap.default['Shift-Ctrl-G'] = 'findPrev';
    CodeMirror.keyMap.default['Shift-Ctrl-F'] = 'replace';
    CodeMirror.keyMap.default['Shift-Ctrl-R'] = 'replaceAll';
    CodeMirror.keyMap.default['Ctrl-/'] = 'toggleComment';
    
    // Keypress events
    this.code_editor.on("keypress", function (cm, event) {
      if(
        !cm.state.completionActive &&
        !event.ctrlKey &&
        event.key != "Enter" &&
        event.key != ";" &&
        event.key != " " &&
        (event.key != "{") & (event.key != "}")
      ) {
        CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
      }
    });
    
    this.code_editor.getInputField().setAttribute('title', name);
    
    if(name == 'html') {
      this.code_editor.setOption("mode", "htmlmixed");
      this.code_editor.setOption("lint", {});

      function collectSlideRanges(source) {
        const ranges = [];
        const re = /<\s*slide\b[^>]*>([\s\S]*?)<\/\s*slide\s*>/gi;
        let m;
        while ((m = re.exec(source))) ranges.push({ start: m.index, end: re.lastIndex });
        return ranges;
      }

      function cursorSlideIndex(pos, ranges) {
        for(let i = 0; i < ranges.length; i++)
          if(pos >= ranges[i].start && pos <= ranges[i].end) return i;
        return -1;
      }
      
      this.getSlide = function() {
        var pos = obj.code_editor.indexFromPos(obj.code_editor.getCursor());
        var txt = obj.code_editor.getValue();
        return cursorSlideIndex(pos, collectSlideRanges(txt));
      }
      this.setSlide = function(index) {
        var txt = obj.code_editor.getValue();
        var rngs = collectSlideRanges(txt);
        if(index >= 0 && index < rngs.length) {
          var r = rngs[index];
          var gt = txt.indexOf('>', r.start);
          var offset = gt !== -1 && gt < r.end ? gt + 1 : r.start;
          var pos = obj.code_editor.posFromIndex(offset);
          obj.code_editor.setCursor(pos);
          obj.code_editor.scrollIntoView({ line: pos.line, ch: pos.ch }, 80)
        }
      }
      this.foldSlides = function() {
        var cursor = obj.code_editor.getSearchCursor(/<\s*slide\b[^>]*>/ig, CodeMirror.Pos(0, 0));
        obj.code_editor.operation(() => {
          while(cursor.findNext()) {
            const pos = cursor.from();
            obj.code_editor.foldCode(pos, null, 'fold');
          }
        });
      }
      this.unfoldSlides = function() {
        var cursor = obj.code_editor.getSearchCursor(/<\s*slide\b[^>]*>/ig, CodeMirror.Pos(0, 0));
        obj.code_editor.operation(() => {
          while(cursor.findNext()) {
            const pos = cursor.from();
            obj.code_editor.foldCode(pos, null, 'unfold');
          }
        });
      }
    } else if(name == 'css') {
      this.code_editor.setOption("mode", "css");
      this.code_editor.setOption("lint", {});
    } else if(name == 'js') {
      this.code_editor.setOption("mode", "javascript");
      this.code_editor.setOption("lint", {
        getAnnotations: async function(text, callback) {
          var results = await obj.editor.eslint.lintText(text);
          callback(results[0].messages.map(message => ({
            from: CodeMirror.Pos(message.line - 1, message.column - 1),
            to: CodeMirror.Pos(
              message.endLine ? message.endLine - 1 : message.line - 1,
              message.endColumn ? message.endColumn - 1 : message.column
            ),
            severity: message.severity === 2 ? "error" : "warning",
            message: message.message,
          })));
        },
        async: true
      });
    }
  }
  
  /**
   * On code changed
   */ 
  codeChanged() {
    this.tab.classList.add("changed");
  }
  
  /**
   * Activates this tab and shows code
   */
  show() {
    $(".CodeMirror").hide();
    this.editor.tabs.setCurrentTab(this.tab);
    $(this.code_editor.display.wrapper).show();
    this.code_editor.focus();
    this.code_editor.refresh();
  }
  
  /**
   * Save code
   */
  save() {
    if(this.tab.classList.contains("changed")) {
      this.tab.classList.remove("changed");
      fs.writeFileSync(this.file_path, this.code_editor.getValue())
    }
  }

  /**
   * Opens search dialog in the code editor.
   */
  openSearchDialog() {
    this.code_editor.execCommand('showSearchDialog');
  }
  
  /**
   * Sets file path for code
   * @param {String} file_path - Absolute path to the code file
   */
  setPath(file_path) {
    var obj = this;
    this.file_path = file_path;
    this.code = fs.readFileSync(file_path).toString();
    this.code_editor.setValue(this.code);
    this.code_editor.clearHistory();
    
    this.code_editor.on("change", function() {
      obj.codeChanged();   
    });
  }
}

/**
 * Class for JSLAB presentation editor.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_PRESENTATION_EDITOR class.
   */
  constructor() {
    var obj = this;
    
    this.webview = document.getElementById('preview');
    this.webview_wrap = document.getElementById('webview-wrap');
    this.left = document.getElementById('left-panel-cont');
    
    this.eslint = new ESLint(config.LINT_OPTIONS);
    this.editor_more_popup = new PRDC_POPUP(document.getElementById('editor-more-icon'),
      document.getElementById('editor-more-popup'));
    this.current_slide = 0;
    this.total_slides = 0;

    this.columns = new PRDC_PANEL('presentation-editor-columns', 'vertical', document.body, [document.getElementById('left-panel'), document.getElementById('right-panel')], [60, 40], function() {
      obj.scaleSlide();
    });    
    
    // Initialize panels
    window.addEventListener('resize', function() {
      obj.columns.onResize();
    });
    
    // Tabs
    this.tabs_cont = document.querySelector(".tabs");
    this.tabs = new PRDC_TABS();
    this.tabs.init(this.tabs_cont);

    // On tab change
    this.tabs_cont.addEventListener("activeTabChange", function({ detail }) {
      obj.active_tab = detail.tabEl;
      if(obj.active_tab.hasOwnProperty('tab_obj')) {
        obj.active_tab.tab_obj.show();
      }
    });
    
    this.html_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB(this, 'html');
    this.js_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB(this, 'js');
    this.css_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB(this, 'css');
    
    this.html_editor.show();

    document.addEventListener("keydown", function(e) {
      if(e.ctrlKey && e.key.toLowerCase() === "s" && !e.shiftKey) {
        obj.saveCode();
      }
    });

    this.webview.addEventListener('ipc-message', (e) => {
      if(e.args[0].ready !== undefined) {
        obj.total_slides = e.args[0].ready; 
        document.getElementById('total-slides').innerText = '/ ' + obj.total_slides;
      } else if(e.args[0].slide !== undefined) {
        obj.current_slide = e.args[0].slide;
        document.getElementById('set-slide').value = obj.current_slide + 1;
      }
    });
    
    $("#tab-save").click(function() { obj.saveCode(); });
    $("#search-dialog-menu").click(function() { 
      obj.active_tab.tab_obj.openSearchDialog();
      obj.editor_more_popup.close();
    });
    $("#fold-slides").click(function() { 
      obj.html_editor.show();
      obj.html_editor.foldSlides() 
      obj.editor_more_popup.close();
    });
    $("#unfold-slides").click(function() { 
      obj.html_editor.show();
      obj.html_editor.unfoldSlides() 
      obj.editor_more_popup.close();
    });
    
    $("#first-slide").click(function() {
      obj.webview.send('data',{ show: 0 });
    }); 
    $("#prev-slide").click(function() {
      obj.webview.send('data',{ show: obj.current_slide - 1 });
    });
    $("#next-slide").click(function() {
      obj.webview.send('data',{ show: obj.current_slide + 1 });
    });
    $("#last-slide").click(function() {
      obj.webview.send('data',{ show: obj.total_slides - 1 });
    });
    $("#set-slide").on( "change", function() {
      obj.webview.send('data',{ show: $(this).val() - 1 });
    });

    // On IPC message
    ipcRenderer.on("PresentationEditorWindow", function(event, action, data) {
      switch(action) {
        case "go-to-code":
          obj.html_editor.show();
          obj.html_editor.setSlide(obj.current_slide);
          break;
        case "go-to-slide":
          obj.webview.send('data', { show: obj.html_editor.getSlide() });
          break;
      }
    });
  }
  
  /**
   * Sets file path for presentation editor
   * @param {String} file_path - Absolute path to the presentation directory.
   */
  setPath(file_path, url) {
    var obj = this;
    this.file_path = file_path;
    this.url = url;
    var name = path.basename(file_path);;
    
    this.exe_file = name;
    this.html_editor.setPath(path.join(file_path, 'index.html'));
    this.js_editor.setPath(path.join(file_path, 'main.js'));
    this.css_editor.setPath(path.join(file_path, 'main.css'));
    
    document.getElementById('presentation-title').innerText = name;
    this.webview.src = url+'?lazy';
    this.presentation_config = JSON.parse(fs.readFileSync(path.join(file_path, 'res/internal/config.json')).toString());
    
    // Slide scale
    this.webview.style.width = this.presentation_config.slide_width + 'px';
    this.webview.style.height = this.presentation_config.slide_height + 'px';
    this.scaleSlide();
  }
  
  /**
   * Saves code and triggers frame update
   */
  saveCode() {
    this.html_editor.save();
    this.js_editor.save();
    this.css_editor.save();
    this.webview.reload();
  }
  
  /**
   * Scale slide
   */
  scaleSlide() {
    const scale = Math.min((this.left.clientWidth - 20) / this.presentation_config.slide_width, (this.left.clientHeight- 20) / this.presentation_config.slide_height);
    this.webview.style.transform = `scale(${scale})`;
    this.webview_wrap.style.height  = `${this.presentation_config.slide_height * scale}px`;
  }
}

var presentation_editor = new PRDC_JSLAB_PRESENTATION_EDITOR();