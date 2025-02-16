/**
 * @file Search dialog based on CodeMirror search.js
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
    mod(require("../../lib/codemirror"), require("./searchcursor"));
  else if(typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "./searchcursor"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineOption('searchDialog', false, function(cm, val) {
    if(val) {
      var div = document.createElement('div');
      div.className = 'CodeMirror-search-dialog';
      div.innerHTML = '<input class="CodeMirror-search-find" value="" placeholder="Find" autocomplete="off" spellcheck="false" title="Find"><i class="CodeMirror-search-find-prev-btn" title="Previous match"></i><i class="CodeMirror-search-find-next-btn" title="Next match"></i><br class="clear"/><input class="CodeMirror-search-replace" value="" placeholder="Replace" autocomplete="off" spellcheck="false" title="Replace"><i class="CodeMirror-search-replace-btn" title="Replace"></i><i class="CodeMirror-search-replace-all-btn" title="Replace All"></i><br class="clear"/><i class="CodeMirror-search-case-btn" title="Match Case"></i><i class="CodeMirror-search-regex-btn" title="Use Regular Expression"></i><div class="CodeMirror-search-bottom-right"><span class="CodeMirror-search-current-match">0</span> of <span class="CodeMirror-search-total-matchs">0</span><i class="CodeMirror-search-close-btn" title="Close Search Dialog"></i></div><br class="clear"/>';
      div.setAttribute('tabindex', 0);
      
      var find_input = div.querySelector('.CodeMirror-search-find');
      var replace_input = div.querySelector('.CodeMirror-search-replace');
      var find_prev_btn = div.querySelector('.CodeMirror-search-find-prev-btn');
      var find_next_btn = div.querySelector('.CodeMirror-search-find-next-btn');
      var replace_btn = div.querySelector('.CodeMirror-search-replace-btn');
      var replace_all_btn = div.querySelector('.CodeMirror-search-replace-all-btn');
      var match_case_btn = div.querySelector('.CodeMirror-search-case-btn');
      var regex_btn = div.querySelector('.CodeMirror-search-regex-btn');
      var close = div.querySelector('.CodeMirror-search-close-btn');
      
      cm.search_match_case = false;
      cm.search_regex = false;
      
      div.addEventListener('keydown', function(e) {
        if(e.key == 'Escape') {
          // ESC
          if(window.jQuery) {
            $(div).slideUp(200);
          } else {
            div.style.display = 'none';
          }
          cm.focus();
        }
      });
      
      replace_input.addEventListener('keydown', function(e) {
        if(e.key == 'Enter') {
          // Replace
          replace(cm, replace_input.value, false);
        }
      });
      
      find_input.addEventListener('keyup', function() {
        // Find match
        clearSearch(cm); 
        var state = getSearchState(cm);
        state.query = this.value;
        doSearch(cm);
      });
      
      find_prev_btn.addEventListener('click', function() {
        // Show previous match
        doSearch(cm, true);
      });
      
      find_next_btn.addEventListener('click', function() {
        // Show next match
        doSearch(cm, false);
      });
      
      replace_btn.addEventListener('click', function() {
        // Replace
        replace(cm, replace_input.value, false)
      });
      
      replace_all_btn.addEventListener('click', function() {
        // Replace all
        replace(cm, replace_input.value, true)
      });
      
      match_case_btn.addEventListener('click', function() {
        if(this.classList.contains('active')) {
          cm.search_match_case = false;
          this.classList.remove('active');
        } else {
          cm.search_match_case = true;
          this.classList.add('active');
        }
      });
      
      regex_btn.addEventListener('click', function() {
        if(this.classList.contains('active')) {
          cm.search_regex = false;
          this.classList.remove('active');
        } else {
          cm.search_regex = true;
          this.classList.add('active');
        }
      });
      
      close.addEventListener('click', function() {
        if(window.jQuery) {
          $(div).slideUp(200);
        } else {
          div.style.display = 'none';
        }
        cm.focus();
      });
      
      cm.display.wrapper.appendChild(div);
    }
  });
  
  function searchOverlay(query, caseInsensitive) {
    if(typeof query == "string")
      query = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), caseInsensitive ? "gi" : "g");
    else if(!query.global)
      query = new RegExp(query.source, query.ignoreCase ? "gi" : "g");

    return {token: function(stream) {
      query.lastIndex = stream.pos;
      var match = query.exec(stream.string);
      if(match && match.index == stream.pos) {
        stream.pos += match[0].length || 1;
        return "searching";
      } else if(match) {
        stream.pos = match.index;
      } else {
        stream.skipToEnd();
      }
      return false;
    }};
  }

  function SearchState() {
    this.posFrom = this.posTo = this.lastQuery = this.query = null;
    this.overlay = null;
  }

  function getSearchState(cm) {
    return cm.state.search || (cm.state.search = new SearchState());
  }

  function queryCaseInsensitive(cm, query) {
    return !cm.search_match_case && typeof query == "string";
  }

  function getSearchCursor(cm, query, pos) {
    return cm.getSearchCursor(query, pos, {caseFold: queryCaseInsensitive(cm, query), multiline: true});
  }

  function parseString(string) {
    return string.replace(/\\([nrt\\])/g, function(match, ch) {
      if(ch == "n") return "\n";
      if(ch == "r") return "\r";
      if(ch == "t") return "\t";
      if(ch == "\\") return "\\";
      return match;
    });
  }

  function parseQuery(cm, query) {
    if(cm.search_regex) {
      var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
      if(isRE) {
        try { query = new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i"); }
        catch(e) {}
      }
    } else {
      query = parseString(query);
    }
    if(typeof query == "string" ? query == "" : query.test(""))
      query = /x^/;
    return query;
  }

  function startSearch(cm, state, query) {
    state.queryText = query;
    state.query = parseQuery(cm, query);
    cm.removeOverlay(state.overlay, queryCaseInsensitive(cm, state.query));
    state.overlay = searchOverlay(state.query, queryCaseInsensitive(cm, state.query));
    cm.addOverlay(state.overlay);
    if(state.annotate) { state.annotate.clear(); state.annotate = null; }
    state.annotate = cm.showMatchesOnScrollbar(state.query, queryCaseInsensitive(cm, state.query));
  }

  function showSearchDialog(cm) {
    var div = cm.display.wrapper.querySelector('.CodeMirror-search-dialog');
    if(window.jQuery) {
      $(div).slideDown(200);
    } else {
      div.style.display = 'block';
    }
    var query = cm.getSelection();
    var find_input = cm.display.wrapper.querySelector('.CodeMirror-search-find');
    if(query) {
      find_input.value = query;
      clearSearch(cm); 
      var state = getSearchState(cm);
      state.query = query;
      doSearch(cm);
    }
    find_input.focus();
  }
 
  function hideSearchDialog(cm) {
    var div = cm.display.wrapper.querySelector('.CodeMirror-search-dialog');
    if(window.jQuery) {
      $(div).slideUp(200);
    } else {
      div.style.display = 'none';
    }
  }
 
  function doSearch(cm, rev) {
    var state = getSearchState(cm);
    var q = state.query;
    if(q != state.queryText) {
      startSearch(cm, state, q);
      state.posFrom = state.posTo = cm.getCursor();
    }
    if(q) {
      findNext(cm, rev);
    }
    if(state.annotate) {
      var current_match_index = state.annotate.matches.findIndex(function(e) {
        return e.from.line == state.posFrom.line && 
          e.from.ch == state.posFrom.ch && e.to.line == state.posTo.line && 
          e.to.ch == state.posTo.ch;
      })+1;
      var total_matchs = cm.display.wrapper.querySelector('.CodeMirror-search-total-matchs');
      total_matchs.innerText = state.annotate.matches.length;
      var current_match = cm.display.wrapper.querySelector('.CodeMirror-search-current-match');
      current_match.innerText = current_match_index;
    }
  }

  function findNext(cm, rev, callback) {cm.operation(function() {
    var state = getSearchState(cm);
    var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
    if(!cursor.find(rev)) {
      cursor = getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
      if(!cursor.find(rev)) return;
    }
    cm.setSelection(cursor.from(), cursor.to());
    cm.scrollIntoView({from: cursor.from(), to: cursor.to()}, 20);
    state.posFrom = cursor.from(); state.posTo = cursor.to();
    if(callback) callback(cursor.from(), cursor.to());
  });}

  function clearSearch(cm) {cm.operation(function() {
    var state = getSearchState(cm);
    state.lastQuery = state.query;
    if(!state.query) return;
    state.query = state.queryText = null;
    cm.removeOverlay(state.overlay);
    if(state.annotate) { state.annotate.clear(); state.annotate = null; }
  });}

  function replaceAll(cm, query, text) {
    clearSearch(cm);
    cm.operation(function() {
      for(var cursor = getSearchCursor(cm, query); cursor.findNext();) {
        if(typeof query != "string") {
          var match = cm.getRange(cursor.from(), cursor.to()).match(query);
          cursor.replace(text.replace(/\$(\d)/g, function(_, i) { return match[i]; }));
        } else cursor.replace(text);
      }
    });
  }

  function replace(cm, text, all) {
    if(cm.getOption("readOnly")) return;
    var query = getSearchState(cm).query;
    if(query) {
      text = parseString(text);
      if(all) {
        replaceAll(cm, query, text);
      } else {
        var cursor = getSearchCursor(cm, query, cm.getCursor());
        var start = cursor.from(), match;
        if(!(match = cursor.findNext())) {
          cursor = getSearchCursor(cm, query);
          if(!(match = cursor.findNext()) ||
            (start && cursor.from().line == start.line && cursor.from().ch == start.ch)) return;
        }
        cm.setSelection(cursor.from(), cursor.to());
        cursor.replace(typeof query == "string" ? text :
          text.replace(/\$(\d)/, function(w, i) {return match[i];}));
      }
    }
  }
  
  CodeMirror.commands.showSearchDialog = function(cm) {clearSearch(cm); showSearchDialog(cm);};
  CodeMirror.commands.hideSearchDialog = function(cm) {clearSearch(cm); hideSearchDialog(cm);};
  CodeMirror.commands.find = function(cm) {clearSearch(cm); doSearch(cm);};
  CodeMirror.commands.findNext = function(cm) {doSearch(cm, false);};
  CodeMirror.commands.findPrev = function(cm) {doSearch(cm, true);};
  CodeMirror.commands.clearSearch = clearSearch;
  CodeMirror.commands.replace = replace;
  CodeMirror.commands.replaceAll = function(cm) {replace(cm, true);};
});
