/**
 * @file Search dialog based on CodeMirror search.js
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
    mod(require("../../lib/codemirror"), require("./searchcursor"));
  } else if(typeof define == "function" && define.amd) {
    // AMD
    define(["../../lib/codemirror", "./searchcursor"], mod);
  } else {
    // Plain browser env
    mod(CodeMirror);
  }
})(function(CodeMirror) {
  "use strict";


  /**
   * Class for code dialog search helper.
   */
  class PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER {

    /**
     * Loads search history.
     * @param {Object} cm CodeMirror instance with injected application storage.
     */
    static loadSearchHistory(cm) {
      try {
        var parsed = cm.getOption('jslabStorage')?.get(SEARCH_HISTORY_KEY, []);
        if(!Array.isArray(parsed)) {
          return [];
        }
        return parsed.filter(function(item) {
          return typeof item === "string" && item.length > 0;
        }).slice(0, SEARCH_HISTORY_MAX);
      } catch(err) {
        return [];
      }
    }

    /**
     * Saves search history.
     * @param {Object} cm CodeMirror instance with injected application storage.
     * @param {*} history History.
     */
    static saveSearchHistory(cm, history) {
      try {
        cm.getOption('jslabStorage')?.set(SEARCH_HISTORY_KEY, history.slice(0, SEARCH_HISTORY_MAX));
      } catch(err) {
        // Ignore storage failures.
      }
    }

    /**
     * Adds search history item.
     * @param {*} cm Cm.
     * @param {*} query Query.
     */
    static addSearchHistoryItem(cm, query) {
      query = String(query || "").trim();
      if(!query.length) {
        return;
      }
      var history = cm.search_history || [];
      var found_index = history.indexOf(query);
      if(found_index > -1) {
        history.splice(found_index, 1);
      }
      history.unshift(query);
      if(history.length > SEARCH_HISTORY_MAX) {
        history.length = SEARCH_HISTORY_MAX;
      }
      cm.search_history = history;
      cm.search_history_index = -1;
      cm.search_history_draft = "";
      PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.saveSearchHistory(cm, history);
    }

    /**
     * Searches overlay.
     * @param {*} query Query.
     * @param {*} caseInsensitive Case insensitive.
     */
    static searchOverlay(query, caseInsensitive) {
      if(typeof query == "string") {
        query = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), caseInsensitive ? "gi" : "g");
      } else if(!query.global) {
        query = new RegExp(query.source, query.ignoreCase ? "gi" : "g");
      }

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


    /**
     * Returns search state.
     * @param {*} cm Cm.
     */
    static getSearchState(cm) {
      return cm.state.search || (cm.state.search = { posFrom: null, posTo: null, lastQuery: null, query: null, overlay: null });
    }

    /**
     * Queries case insensitive.
     * @param {*} cm Cm.
     * @param {*} query Query.
     */
    static queryCaseInsensitive(cm, query) {
      return !cm.search_match_case && typeof query == "string";
    }

    /**
     * Returns search cursor.
     * @param {*} cm Cm.
     * @param {*} query Query.
     * @param {*} pos Pos.
     */
    static getSearchCursor(cm, query, pos) {
      return cm.getSearchCursor(query, pos, {caseFold: PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.queryCaseInsensitive(cm, query), multiline: true});
    }

    /**
     * Parses string.
     * @param {*} string String.
     */
    static parseString(string) {
      if(string == null) {
        return "";
      }
      if(typeof string !== "string") {
        string = String(string);
      }
      return string.replace(/\\([nrt\\])/g, function(match, ch) {
        if(ch == "n") {
          return "\n";
        }
        if(ch == "r") {
          return "\r";
        }
        if(ch == "t") {
          return "\t";
        }
        if(ch == "\\") {
          return "\\";
        }
        return match;
      });
    }

    /**
     * Parses query.
     * @param {*} cm Cm.
     * @param {*} query Query.
     */
    static parseQuery(cm, query) {
      if(query == null) {
        query = "";
      }
      if(query instanceof RegExp) {
        if(cm.search_regex) {
          return query.test("") ? /x^/ : query;
        }
        query = String(query);
      }
      if(typeof query !== "string") {
        query = String(query);
      }
      if(cm.search_regex) {
        var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
        if(isRE) {
          try {
            query = new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i");
          } catch(e) {}
        }
      } else {
        query = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.parseString(query);
      }
      if(typeof query == "string" ? query == "" : query.test("")) {
        query = /x^/;
      }
      return query;
    }

    /**
     * Starts search.
     * @param {*} cm Cm.
     * @param {*} state State.
     * @param {*} query Query.
     */
    static startSearch(cm, state, query) {
      state.queryText = query;
      state.query = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.parseQuery(cm, query);
      cm.removeOverlay(state.overlay, PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.queryCaseInsensitive(cm, state.query));
      state.overlay = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.searchOverlay(state.query, PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.queryCaseInsensitive(cm, state.query));
      cm.addOverlay(state.overlay);
      if(state.annotate) {
        state.annotate.clear();
        state.annotate = null;
      }
      state.annotate = cm.showMatchesOnScrollbar(state.query, PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.queryCaseInsensitive(cm, state.query));
    }

    /**
     * Shows search dialog.
     * @param {*} cm Cm.
     */
    static showSearchDialog(cm) {
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
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.clearSearch(cm);
        var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
        state.query = query;
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm);
      }
      find_input.focus();
    }

    /**
     * Hides search dialog.
     * @param {*} cm Cm.
     */
    static hideSearchDialog(cm) {
      var div = cm.display.wrapper.querySelector('.CodeMirror-search-dialog');
      if(window.jQuery) {
        $(div).slideUp(200);
      } else {
        div.style.display = 'none';
      }
    }

    /**
     * Handles do search.
     * @param {*} cm Cm.
     * @param {*} rev Rev.
     */
    static doSearch(cm, rev) {
      var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
      var q = state.query;
      if(q != state.queryText) {
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.startSearch(cm, state, q);
        state.posFrom = state.posTo = cm.getCursor();
      }
      if(q) {
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.findNext(cm, rev);
      }
      if(state.annotate) {
        var current_match_index = state.annotate.matches.findIndex(function(e) {
          return e.from.line == state.posFrom.line &&
            e.from.ch == state.posFrom.ch && e.to.line == state.posTo.line &&
            e.to.ch == state.posTo.ch;
        }) + 1;
        var total_matchs = cm.display.wrapper.querySelector('.CodeMirror-search-total-matchs');
        total_matchs.innerText = state.annotate.matches.length;
        var current_match = cm.display.wrapper.querySelector('.CodeMirror-search-current-match');
        current_match.innerText = current_match_index;
      }
    }

    /**
     * Finds next.
     * @param {*} cm Cm.
     * @param {*} rev Rev.
     * @param {Function} callback Callback.
     */
    static findNext(cm, rev, callback) {
      cm.operation(function() {
        var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
        var cursor = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
        if(!cursor.find(rev)) {
          cursor = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
          if(!cursor.find(rev)) {
            return;
          }
        }
        cm.setSelection(cursor.from(), cursor.to());
        cm.scrollIntoView({from: cursor.from(), to: cursor.to()}, 20);
        state.posFrom = cursor.from();
        state.posTo = cursor.to();
        if(callback) {
          callback(cursor.from(), cursor.to());
        }
      });
    }

    /**
     * Clears search.
     * @param {*} cm Cm.
     */
    static clearSearch(cm) {
      cm.operation(function() {
        var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
        state.lastQuery = state.query;
        if(!state.query) {
          return;
        }
        state.query = state.queryText = null;
        cm.removeOverlay(state.overlay);
        if(state.annotate) {
          state.annotate.clear();
          state.annotate = null;
        }
      });
    }

    /**
     * Replaces all.
     * @param {*} cm Cm.
     * @param {*} query Query.
     * @param {string} text Text.
     */
    static replaceAll(cm, query, text) {
      PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.clearSearch(cm);
      cm.operation(function() {
        for(var cursor = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchCursor(cm, query); cursor.findNext();) {
          if(typeof query != "string") {
            var match = cm.getRange(cursor.from(), cursor.to()).match(query);
            cursor.replace(text.replace(/\$(\d)/g, function(_, i) {
              return match[i];
            }));
          } else {
            cursor.replace(text);
          }
        }
      });
    }

    /**
     * Replaces.
     * @param {*} cm Cm.
     * @param {string} text Text.
     * @param {*} all All.
     */
    static replace(cm, text, all) {
      if(cm.getOption("readOnly")) {
        return;
      }
      var query = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm).query;
      if(query) {
        text = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.parseString(text);
        if(all) {
          PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.replaceAll(cm, query, text);
        } else {
          var cursor = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchCursor(cm, query, cm.getCursor());
          var start = cursor.from(), match;
          if(!(match = cursor.findNext())) {
            cursor = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchCursor(cm, query);
            if(!(match = cursor.findNext()) ||
              (start && cursor.from().line == start.line && cursor.from().ch == start.ch)) {
              return;
            }
          }
          cm.setSelection(cursor.from(), cursor.to());
          cursor.replace(typeof query == "string" ? text :
            text.replace(/\$(\d)/, function(w, i) {
              return match[i];
            }));
        }
      }
    }
  }


  var SEARCH_HISTORY_KEY = "editor_search_history";
  var SEARCH_HISTORY_MAX = 100;

  CodeMirror.defineOption('jslabStorage', null);


  CodeMirror.defineOption('searchDialog', false, function(cm, val) {
    if(val) {
      var div = document.createElement('div');
      div.className = 'CodeMirror-search-dialog';
      var findLabel = language.currentString(336);
      var prevLabel = language.currentString(337);
      var nextLabel = language.currentString(338);
      var replaceLabel = language.currentString(339);
      var replaceAllLabel = language.currentString(340);
      var matchCaseLabel = language.currentString(341);
      var regexLabel = language.currentString(342);
      var ofLabel = language.currentString(343);
      var closeLabel = language.currentString(344);
      div.innerHTML =
        '<input class="CodeMirror-search-find" value="" placeholder="' + findLabel + '" autocomplete="off" spellcheck="false" title="' + findLabel + '">' +
        '<i class="CodeMirror-search-find-prev-btn" title="' + prevLabel + '"></i>' +
        '<i class="CodeMirror-search-find-next-btn" title="' + nextLabel + '"></i>' +
        '<br class="clear"/>' +
        '<input class="CodeMirror-search-replace" value="" placeholder="' + replaceLabel + '" autocomplete="off" spellcheck="false" title="' + replaceLabel + '">' +
        '<i class="CodeMirror-search-replace-btn" title="' + replaceLabel + '"></i>' +
        '<i class="CodeMirror-search-replace-all-btn" title="' + replaceAllLabel + '"></i>' +
        '<br class="clear"/>' +
        '<i class="CodeMirror-search-case-btn" title="' + matchCaseLabel + '"></i>' +
        '<i class="CodeMirror-search-regex-btn" title="' + regexLabel + '"></i>' +
        '<div class="CodeMirror-search-bottom-right"><span class="CodeMirror-search-current-match">0</span> ' + ofLabel +
        ' <span class="CodeMirror-search-total-matchs">0</span><i class="CodeMirror-search-close-btn" title="' + closeLabel + '"></i></div>' +
        '<br class="clear"/>';
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
      cm.search_history = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.loadSearchHistory(cm);
      cm.search_history_index = -1;
      cm.search_history_draft = "";

      function applySearchQuery(query) {
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.clearSearch(cm);
        var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
        state.query = query;
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm);
      }

      function navigateSearchHistory(up) {
        var history = cm.search_history || [];
        if(!history.length) {
          return;
        }

        if(cm.search_history_index === -1) {
          cm.search_history_draft = find_input.value;
        }

        if(up) {
          if(cm.search_history_index < history.length - 1) {
            cm.search_history_index += 1;
          }
        } else {
          if(cm.search_history_index > -1) {
            cm.search_history_index -= 1;
          }
        }

        var query = cm.search_history_index === -1 ?
          cm.search_history_draft : history[cm.search_history_index];
        find_input.value = query;
        applySearchQuery(query);
        find_input.setSelectionRange(query.length, query.length);
      }

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
          PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.replace(cm, replace_input.value, false);
        }
      });

      find_input.addEventListener('keydown', function(e) {
        if(e.key === 'ArrowUp' && e.altKey) {
          navigateSearchHistory(true);
          e.stopPropagation();
          e.preventDefault();
        } else if(e.key === 'ArrowDown' && e.altKey) {
          navigateSearchHistory(false);
          e.stopPropagation();
          e.preventDefault();
        } else if(e.key === 'Enter') {
          var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
          state.query = find_input.value;
          PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.addSearchHistoryItem(cm, find_input.value);
          PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm, e.shiftKey);
          e.stopPropagation();
          e.preventDefault();
        }
      });

      find_input.addEventListener('keyup', function(e) {
        if(((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) || e.key === 'Enter') {
          return;
        }
        // Find match
        cm.search_history_index = -1;
        cm.search_history_draft = this.value;
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.clearSearch(cm);
        var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
        state.query = this.value;
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm);
      });

      find_prev_btn.addEventListener('click', function() {
        // Show previous match
        var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
        state.query = find_input.value;
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.addSearchHistoryItem(cm, find_input.value);
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm, true);
      });

      find_next_btn.addEventListener('click', function() {
        // Show next match
        var state = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.getSearchState(cm);
        state.query = find_input.value;
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.addSearchHistoryItem(cm, find_input.value);
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm, false);
      });

      replace_btn.addEventListener('click', function() {
        // Replace
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.addSearchHistoryItem(cm, find_input.value);
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.replace(cm, replace_input.value, false);
      });

      replace_all_btn.addEventListener('click', function() {
        // Replace all
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.addSearchHistoryItem(cm, find_input.value);
        PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.replace(cm, replace_input.value, true);
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


  CodeMirror.commands.showSearchDialog = function(cm) {
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.clearSearch(cm);
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.showSearchDialog(cm);
  };
  CodeMirror.commands.hideSearchDialog = function(cm) {
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.clearSearch(cm);
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.hideSearchDialog(cm);
  };
  CodeMirror.commands.find = function(cm) {
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.clearSearch(cm);
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm);
  };
  CodeMirror.commands.findNext = function(cm) {
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm, false);
  };
  CodeMirror.commands.findPrev = function(cm) {
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.doSearch(cm, true);
  };
  CodeMirror.commands.clearSearch = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.clearSearch;
  CodeMirror.commands.replace = PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.replace;
  CodeMirror.commands.replaceAll = function(cm) {
    PRDC_JSLAB_CODE_DIALOG_SEARCH_HELPER.replace(cm, true);
  };
});
