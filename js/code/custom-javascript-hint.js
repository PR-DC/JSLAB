/**
 * @file Edited CodeMirror javascript-hints.js
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 *
 * CodeMirror, copyright (c) by Marijn Haverbeke and others
 * Distributed under an MIT license: https://codemirror.net/LICENSE
 *
 */

(function(mod) {
  if(typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if(typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var Pos = CodeMirror.Pos;

  function getBridge() {
    if(typeof globalThis != "undefined") {
      if(typeof globalThis.__JSLAB_WEB_getBridge == "function") {
        try {
          return globalThis.__JSLAB_WEB_getBridge();
        } catch {}
      }
      if(globalThis.__JSLAB_WEB_BRIDGE__) {
        return globalThis.__JSLAB_WEB_BRIDGE__;
      }
    }
    return null;
  }

  function requestCompletions(data) {
    if(typeof ipcRenderer != "undefined" &&
        ipcRenderer &&
        typeof ipcRenderer.invoke == "function") {
      return ipcRenderer.invoke('get-completions', data);
    }

    var bridge = getBridge();
    if(bridge && typeof bridge.getCompletions == "function") {
      try {
        return Promise.resolve(bridge.getCompletions(data));
      } catch(err) {
        return Promise.reject(err);
      }
    }

    return Promise.resolve([]);
  }

  function scriptHint(editor, keywords, getToken, options) {

    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur);
    if(/\bcomment\b/.test(token.type)) return;
    if(/\bstring\b/.test(token.type)) {
      var input_text = typeof editor.getValue == 'function' ? editor.getValue() : '';
      var bracket = /([A-Za-z_$][\w$]*(?:\s*(?:\.\s*[A-Za-z_$][\w$]*|\[\s*(?:"[^"]*"|'[^']*'|\d+)\s*\]))*)\s*\[\s*(["'])([^"']*)$/.exec(input_text);
      if(!bracket) return;
      token = { start: token.end - bracket[3].length, end: token.end,
        string: bracket[3], state: token.state, type: 'property',
        consoleExpression: bracket[1] };
      var context = [{}];
    }
    if(/\bnumber\b/.test(token.type || '') && token.string !== '.') return;
    var innerMode = CodeMirror.innerMode(editor.getMode(), token.state);
    if(innerMode.mode.helperType === "json") return;
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
      if(tprop.string != ".") return;
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if(!context) var context = [];
      context.push(tprop);
    }
    return getCompletions(editor, token, context, keywords, options, cur);
  }

  function javascriptHint(editor,callback, options) {
    return scriptHint(editor, javascriptKeywords,
                      function(e, cur) { return e.getTokenAt(cur);},
                      options);
  }
  CodeMirror.registerHelper("hint", "javascript", javascriptHint);


  var javascriptKeywords = ("async await break case catch class const continue debugger default delete do else export extends false finally for function " +
                  "if in import instanceof let new null of return static super switch this throw true try typeof var void while with yield").split(" ");

  function showArgumentHint(editor, text) {
    if(!editor || typeof editor.getWrapperElement != 'function' || typeof document == 'undefined') return;
    var previous = editor.getWrapperElement().querySelector('.jslab-argument-hint');
    if(previous) previous.remove();
    if(!text) return;
    var hint = document.createElement('div');
    hint.className = 'jslab-argument-hint';
    hint.textContent = text;
    var coords = editor.cursorCoords(null, 'local');
    hint.style.left = Math.max(0, coords.left) + 'px';
    hint.style.top = (coords.bottom + 3) + 'px';
    editor.getWrapperElement().appendChild(hint);
  }

  function expressionBeforeProperty(input, token) {
    var prefix = input.slice(0, Math.max(0, input.length - token.string.length));
    prefix = prefix.replace(/\.\s*$/, '');
    var match = /([A-Za-z_$][\w$]*(?:\s*(?:\.\s*[A-Za-z_$][\w$]*|\[\s*(?:"[^"]*"|'[^']*'|\d+)\s*\]))*)\s*$/.exec(prefix);
    return match ? match[1] : '';
  }

  function getCompletions(editor, token, context, keywords, options, cur) {
    return new Promise(function(resolve) {
      var input = typeof editor.getValue == 'function' ? editor.getValue() : '';
      var request = {
        start: token.string,
        context: context || [],
        keywords: keywords,
        input: input,
        expression: token.consoleExpression ||
          (context && context.length ? expressionBeforeProperty(input, token) : ''),
        history: options && Array.isArray(options.history) ? options.history : []
      };
      requestCompletions(request).then(function(response) {
        var found = Array.isArray(response) ? response : (response && response.items) || [];
        showArgumentHint(editor, response && response.argument_hint);
        if(found.length === 1) {
          var only_item = found[0];
          var only_text = typeof only_item == 'string' ? only_item : only_item && only_item.text;
          if(!(only_item && typeof only_item == 'object' && only_item.history) &&
              only_text === token.string) found = [];
        }
        found = found.map(function(item) {
          if(!item || typeof item != 'object' || !item.history) return item;
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
        showArgumentHint(editor, null);
        resolve({list: [],
            from: Pos(cur.line, token.start),
            to: Pos(cur.line, token.end)});
      });
    });
  }
});
