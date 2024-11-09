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

  function scriptHint(editor, keywords, getToken, options) {

    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur);
    if(/\b(?:string|comment)\b/.test(token.type)) return;
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
    while(tprop.type == "property") {
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if(tprop.string != ".") return;
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if(!context) var context = [];
      context.push(tprop);
    }
    return getCompletions(token, context, keywords, options, cur);
  }

  function javascriptHint(editor,callback, options) {
    return scriptHint(editor, javascriptKeywords,
                      function(e, cur) { return e.getTokenAt(cur);},
                      options);
  }
  CodeMirror.registerHelper("hint", "javascript", javascriptHint);


  var javascriptKeywords = ("break case catch class const continue debugger default delete do else export extends false finally for function " +
                  "if in import instanceof new null return super switch this throw true try typeof var void while with yield").split(" ");

  function getCompletions(token, context, keywords, options, cur) {
    return new Promise(function(resolve, reject) {
      ipcRenderer.invoke('get-completions', [token.string, JSON.stringify(context), keywords]).then(function(found) {
        resolve({list: found,
            from: Pos(cur.line, token.start),
            to: Pos(cur.line, token.end)});
      });
    });
  }
});
