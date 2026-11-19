/**
 * @file Edited CodeMirror javascript-hints.js
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 *
 * CodeMirror, copyright (c) by Marijn Haverbeke and others
 * Distributed under an MIT license: https://codemirror.net/LICENSE
 */

(function(mod) {
  // CommonJS
  if(typeof exports == "object" && typeof module == "object") {
    mod(require("../../lib/codemirror"));
  } else if(typeof define == "function" && define.amd) {
    // AMD
    define(["../../lib/codemirror"], mod);
  } else {
    // Plain browser env
    mod(CodeMirror);
  }
})(function(CodeMirror) {

  /**
   * Class for code custom javascript hint operations.
   */
  class PRDC_JSLAB_CODE_CUSTOM_JAVASCRIPT_HINT_HELPER {

    static hint_editors = new WeakSet();

    /**
     * Returns bridge.
     */
    static getBridge() {
      if(typeof globalThis != "undefined") {
        if(typeof globalThis.__JSLAB_WEB_getBridge == "function") {
          try {
            return globalThis.__JSLAB_WEB_getBridge();
          } catch{}
        }
        if(globalThis.__JSLAB_WEB_BRIDGE__) {
          return globalThis.__JSLAB_WEB_BRIDGE__;
        }
      }
      return null;
    }

    /**
     * Requests completions.
     * @param {*} data Data.
     */
    static requestCompletions(data) {
      if(typeof ipcRenderer != "undefined" &&
          ipcRenderer &&
          typeof ipcRenderer.invoke == "function") {
        return ipcRenderer.invoke('get-completions', data);
      }

      var bridge = PRDC_JSLAB_CODE_CUSTOM_JAVASCRIPT_HINT_HELPER.getBridge();
      if(bridge && typeof bridge.getCompletions == "function") {
        try {
          return Promise.resolve(bridge.getCompletions(data));
        } catch(err) {
          return Promise.reject(err);
        }
      }

      return Promise.resolve([]);
    }

    /**
     * Handles script hint.
     * @param {*} editor Editor.
     * @param {*} keywords Keywords.
     * @param {*} getToken Get token.
     * @param {Object} options Options.
     */
    static scriptHint(editor, keywords, getToken, options) {

      // Find the token at the cursor
      var cur = editor.getCursor(), token = getToken(editor, cur);
      if(/\bcomment\b/.test(token.type)) {
        return;
      }
      if(/\bstring\b/.test(token.type)) {
        var input_text = typeof editor.getValue == 'function' ? editor.getValue() : '';
        var bracket = /([A-Za-z_$][\w$]*(?:\s*(?:\.\s*[A-Za-z_$][\w$]*|\[\s*(?:"[^"]*"|'[^']*'|\d+)\s*\]))*)\s*\[\s*(["'])([^"']*)$/.exec(input_text);
        if(!bracket) {
          return;
        }
        token = { start: token.end - bracket[3].length, end: token.end,
          string: bracket[3], state: token.state, type: 'property',
          consoleExpression: bracket[1] };
        var context = [{}];
      }
      if(/\bnumber\b/.test(token.type || '') && token.string !== '.') {
        return;
      }
      var innerMode = CodeMirror.innerMode(editor.getMode(), token.state);
      if(innerMode.mode.helperType === "json") {
        return;
      }
      token.state = innerMode.state;

      // If it's not a 'word-style' token, ignore the token.
      if(!/^[\w$_]*$/.test(token.string)) {
        token = {start: cur.ch, end: cur.ch, string: "", state: token.state,
          type: token.string == "." ? "property" : null};
      } else if(token.end > cur.ch) {
        token.end = cur.ch;
        token.string = token.string.slice(0, cur.ch - token.start);
      }

      var tprop = token;
      // If it is a property, find out what it is a property of.
      while(tprop.type == "property" && !token.consoleExpression) {
        tprop = getToken(editor, Pos(cur.line, tprop.start));
        if(tprop.string != ".") {
          return;
        }
        tprop = getToken(editor, Pos(cur.line, tprop.start));
        if(!context) {
          var context = [];
        }
        context.push(tprop);
      }
      return PRDC_JSLAB_CODE_CUSTOM_JAVASCRIPT_HINT_HELPER.getCompletions(editor, token, context, keywords, options, cur);
    }

    /**
     * Handles javascript hint.
     * @param {*} editor Editor.
     * @param {Function} callback Callback.
     * @param {Object} options Options.
     */
    static javascriptHint(editor, callback, options) {
      return PRDC_JSLAB_CODE_CUSTOM_JAVASCRIPT_HINT_HELPER.scriptHint(editor, javascriptKeywords,
        function(e, cur) {
          return e.getTokenAt(cur);
        },
        options || callback);
    }

    /**
     * Shows argument hint.
     * @param {*} editor Editor.
     * @param {string} text Text.
     */
    static showArgumentHint(editor, text) {
      if(!editor || typeof editor.getWrapperElement != 'function' || typeof document == 'undefined') {
        return;
      }
      var previous = editor.getWrapperElement().querySelector('.jslab-argument-hint');
      if(previous) {
        previous.remove();
      }
      if(!text) {
        return;
      }
      var hint = document.createElement('div');
      hint.className = 'jslab-argument-hint';
      hint.textContent = text;
      var coords = editor.cursorCoords(null, 'local');
      hint.style.left = Math.max(0, coords.left) + 'px';
      hint.style.top = (coords.bottom + 3) + 'px';
      editor.getWrapperElement().appendChild(hint);
      if(typeof editor.on === 'function' && !this.hint_editors.has(editor)) {
        const clear = () => this.showArgumentHint(editor, null);
        this.hint_editors.add(editor);
        editor.on('change', clear);
        editor.on('blur', clear);
      }
    }

    /**
     * Handles expression before property.
     * @param {*} input Input.
     * @param {*} token Token.
     */
    static expressionBeforeProperty(input, token) {
      var prefix = input.slice(0, Math.max(0, input.length - token.string.length));
      prefix = prefix.replace(/\.\s*$/, '');
      var match = /([A-Za-z_$][\w$]*(?:\s*(?:\.\s*[A-Za-z_$][\w$]*|\[\s*(?:"[^"]*"|'[^']*'|\d+)\s*\]))*)\s*$/.exec(prefix);
      return match ? match[1] : '';
    }

    /**
     * Returns completions.
     * @param {*} editor Editor.
     * @param {*} token Token.
     * @param {Object} context Context.
     * @param {*} keywords Keywords.
     * @param {Object} options Options.
     * @param {*} cur Cur.
     */
    static getCompletions(editor, token, context, keywords, options, cur) {
      return new Promise(function(resolve) {
        var input = typeof editor.getValue == 'function' ? editor.getValue() : '';
        const line = editor.getLine ? editor.getLine(cur.line).slice(0, cur.ch) : input;
        const showHint = text => {
          const cursor = editor.getCursor();
          if((typeof editor.getValue !== 'function' || editor.getValue() === input) &&
              cursor.line === cur.line && cursor.ch === cur.ch && editor.hasFocus?.() !== false) {
            PRDC_JSLAB_CODE_CUSTOM_JAVASCRIPT_HINT_HELPER.showArgumentHint(editor, text);
          }
        };
        var request = {
          start: token.string,
          context: context?.map(({ type, string }) => ({ type, string })) || [],
          keywords: keywords,
          input: input,
          expression: token.consoleExpression ||
            (context?.length ? PRDC_JSLAB_CODE_CUSTOM_JAVASCRIPT_HINT_HELPER.expressionBeforeProperty(line, token) : ''),
          history: options && Array.isArray(options.history) ? options.history : []
        };
        const editor_names = options?.includeBrowserCompletions ?
          browserHint?.(editor, { ...options, filter: false })?.list || [] : [];
        if(!context?.length) {
          for(const scope of [token.state?.localVars, token.state?.globalVars]) {
            for(let binding = scope; binding; binding = binding.next) editor_names.push(binding.name);
          }
        }
        if(editor_names.length) request.editorNames = editor_names;
        const requestCompletions = options?.requestCompletions || PRDC_JSLAB_CODE_CUSTOM_JAVASCRIPT_HINT_HELPER.requestCompletions;
        Promise.resolve().then(() => requestCompletions(request)).then(function(response) {
          var found = Array.isArray(response) ? response : (response && response.items) || [];
          showHint(response && response.argument_hint);
          if(found.length === 1) {
            var only_item = found[0];
            var only_text = typeof only_item == 'string' ? only_item : only_item && only_item.text;
            if(!(only_item && typeof only_item == 'object' && only_item.history) &&
                only_text === token.string) {
              found = [];
            }
          }
          found = found.map(function(item) {
            if(!item || typeof item != 'object' || !item.history) {
              return item;
            }
            item.hint = function(cm, _data, completion) {
              cm.setValue(completion.text);
              cm.setCursor(cm.lineCount(), 0);
            };
            return item;
          });
          resolve({list: found,
            from: Pos(cur.line, token.start),
            to: Pos(cur.line, token.end)});
        }).catch(function() {
          showHint(null);
          resolve({list: editor_names.filter(name => name.startsWith(token.string)),
            from: Pos(cur.line, token.start),
            to: Pos(cur.line, token.end)});
        });
      });
    }
  }

  var Pos = CodeMirror.Pos;
  const browserHint = CodeMirror.hint?.javascript;


  CodeMirror.registerHelper("hint", "javascript", PRDC_JSLAB_CODE_CUSTOM_JAVASCRIPT_HINT_HELPER.javascriptHint);


  var javascriptKeywords = ("async await break case catch class const continue debugger default delete do else export extends false finally for function " +
                  "if in import instanceof let new null of return static super switch this throw true try typeof var void while with yield").split(" ");


});
