/**
 * @file Build static web scaffold for JSLAB
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var fs = require('fs');
var path = require('path');
var esbuild = require('esbuild');

var app_root = path.resolve(__dirname, '..', '..');
var dist_root = path.join(app_root, 'dist-web');
var old_dist_root = path.join(app_root, 'web-dist');
var js_root = path.join(dist_root, 'js');
var js_code_root = path.join(js_root, 'code');
var js_shared_root = path.join(js_root, 'shared');
var js_windows_root = path.join(js_root, 'windows');
var css_root = path.join(dist_root, 'css');
var font_root = path.join(dist_root, 'font');
var html_root = path.join(dist_root, 'html');
var img_root = path.join(dist_root, 'img');
var native_wasm_root = path.join(app_root, 'lib', 'native-wasm');

function injectScriptsBeforeBodyClose(html, scripts) {
  if(!Array.isArray(scripts) || !scripts.length) {
    return html;
  }
  return html.replace('</body>', scripts.join('\n') + '\n</body>');
}

/**
 * Prepares an HTML document for iframe srcdoc usage from the web shell.
 * @param {string} html
 * @param {string[]} [scripts]
 * @returns {string}
 */
function createSrcdocTemplate(html, scripts) {
  return injectScriptsBeforeBodyClose(
    String(html || '').replace('<head>', '<head>\n  <base href="%WEB_HTML_BASE%">'),
    scripts
  );
}

/**
 * Prepares an HTML document for iframe srcdoc usage with a custom base href.
 * @param {string} html
 * @param {string} base_href
 * @param {string[]} [scripts]
 * @returns {string}
 */
function createSrcdocTemplateWithBase(html, base_href, scripts) {
  return injectScriptsBeforeBodyClose(
    String(html || '').replace('<head>', '<head>\n  <base href="' + base_href + '">'),
    scripts
  );
}

/**
 * Converts the Electron URL window template into a browser iframe wrapper.
 * @param {string} html
 * @returns {string}
 */
function createWebUrlWindowTemplate(html) {
  var out = html
    .replace(/<webview\b/g, '<iframe')
    .replace(/<\/webview>/g, '</iframe>');
  return injectScriptsBeforeBodyClose(out, [
    '<script type="text/javascript">',
    '(function() {',
    '  var iframe = document.getElementById("webview");',
    '  window.webview = iframe;',
    '  if(iframe && typeof iframe.send != "function") {',
    '    iframe.send = function(_channel, payload) {',
    '      try {',
    '        if(this.contentWindow && typeof this.contentWindow.postMessage == "function") {',
    '          this.contentWindow.postMessage(payload, "*");',
    '        }',
    '      } catch {}',
    '    };',
    '  }',
    '})();',
    '</script>'
  ]);
}

/**
 * Creates a simple placeholder window for unsupported web-only windows.
 * @param {string} title
 * @param {string} message
 * @returns {string}
 */
function createUnsupportedWindowTemplate(title, message) {
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <title>' + title + '</title>',
    '  <link rel="stylesheet" type="text/css" href="../css/basic.css" />',
    '  <link rel="stylesheet" type="text/css" href="../font/roboto.css" />',
    '  <style>',
    '    html, body { height: 100%; margin: 0; }',
    '    body { display: flex; align-items: center; justify-content: center; background: #fff; font-family: Roboto, Arial; }',
    '    .message { max-width: 520px; padding: 24px 28px; color: #333; border: 1px solid #ddd; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }',
    '    .message h1 { margin: 0 0 12px; font-size: 20px; font-weight: 600; }',
    '    .message p { margin: 0; font-size: 14px; line-height: 1.5; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div class="message">',
    '    <h1>' + title + '</h1>',
    '    <p>' + message + '</p>',
    '  </div>',
    '</body>',
    '</html>'
  ].join('\n');
}

/**
 * Serializes JSON for safe generated script embedding.
 * @param {*} value
 * @returns {string}
 */
function stringifyForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Extracts a complete root div block by id from an HTML document.
 * @param {string} html
 * @param {string} id
 * @returns {string}
 */
function extractDivById(html, id) {
  var marker = `id="${id}"`;
  var marker_index = html.indexOf(marker);
  if(marker_index < 0) {
    throw new Error('Missing HTML block #' + id);
  }

  var start_index = html.lastIndexOf('<div', marker_index);
  if(start_index < 0) {
    throw new Error('Missing start div for #' + id);
  }

  var div_tag = /<\/?div\b[^>]*>/gi;
  div_tag.lastIndex = start_index;
  var depth = 0;
  var match;
  while((match = div_tag.exec(html))) {
    if(match[0][1] == '/') {
      depth--;
      if(depth === 0) {
        return html.slice(start_index, div_tag.lastIndex);
      }
    } else {
      depth++;
    }
  }

  throw new Error('Unclosed div for #' + id);
}

/**
 * Rewrites local relative paths for dist-web root HTML.
 * @param {string} html
 * @returns {string}
 */
function rebaseWebRootPaths(html) {
  return String(html || '').replace(/\.\.\//g, './');
}

/**
 * Builds shared web fragments from the Electron main window HTML.
 * @param {string} main_html
 * @returns {Object<string, string>}
 */
function buildSharedMainFragments(main_html) {
  var info_block = rebaseWebRootPaths(extractDivById(main_html, 'info-container'))
    .replace(/<div class=['"]app-version['"]><\/div>/, '<div class="app-version"><str sid="8"></str> %APP_VERSION%</div>');

  var settings_block = rebaseWebRootPaths(extractDivById(main_html, 'settings-container'))
    .replace('<select name="set-language" class="set-language">', '<select id="language-select" name="set-language" class="set-language">')
    .replace('<input autocomplete="off" type="text" name="N-history-max" class="N-history-max" str="536" value="20">', '<input id="history-max-input" autocomplete="off" type="text" name="N-history-max" class="N-history-max" str="536" value="20">')
    .replace('<button class="change-settings">', '<button id="settings-apply-button" class="change-settings">')
    .replace(/for="set-language"/g, 'for="language-select"')
    .replace(/for="N-history-max"/g, 'for="history-max-input"');

  var command_window_settings = rebaseWebRootPaths(extractDivById(main_html, 'command-window-settings'))
    .replace('<input autocomplete="off" type="text" name="N-messages-max" class="N-messages-max" str="510" value="">', '<input id="command-window-messages-max-input" autocomplete="off" type="text" name="N-messages-max" class="N-messages-max" str="510" value="">')
    .replace('<button class="change-settings">', '<button id="command-window-settings-apply" class="change-settings">')
    .replace(/for="N-messages-max"/g, 'for="command-window-messages-max-input"');

  var command_window_log = rebaseWebRootPaths(extractDivById(main_html, 'command-window-log'))
    .replace('<input class="write-timestamps" type="checkbox" name="write-timestamps" value="1" checked>', '<input id="command-window-write-timestamps" class="write-timestamps" type="checkbox" name="write-timestamps" value="1" checked>')
    .replace('<button class="save-log">', '<button id="command-window-save-log" class="save-log">');

  var command_window_history = rebaseWebRootPaths(extractDivById(main_html, 'command-window-history'))
    .replace('<ul class="history-panel panel" tabindex="0">', '<ul id="command-window-history-list" class="history-panel panel" tabindex="0">');

  var inspector_input_block = rebaseWebRootPaths(extractDivById(main_html, 'inspector-input-container'))
    .replace(
      /<label id="inspector-input-label-1" for="inspector-input-field-1"><\/label>\s*<input id="inspector-input-field-1" type="text" autocomplete="off" spellcheck="false">/,
      '<div id="inspector-input-row-1" class="float-input">\n          <input id="inspector-input-field-1" type="text" autocomplete="off" spellcheck="false" placeholder=" ">\n          <label class="float-label" id="inspector-input-label-1" for="inspector-input-field-1"></label>\n          </div>'
    )
    .replace(
      /<div id="inspector-input-row-2">\s*<label id="inspector-input-label-2" for="inspector-input-field-2"><\/label>\s*<input id="inspector-input-field-2" type="text" autocomplete="off" spellcheck="false">\s*<\/div>/,
      '<div id="inspector-input-row-2" class="float-input">\n            <input id="inspector-input-field-2" type="text" autocomplete="off" spellcheck="false" placeholder=" ">\n            <label class="float-label" id="inspector-input-label-2" for="inspector-input-field-2"></label>\n          </div>'
    );

  return {
    '%WEB_COMMAND_WINDOW_DIALOGS%': [
      command_window_settings,
      command_window_log,
      command_window_history
    ].join('\n\n'),
    '%WEB_WORKSPACE_CONTEXT_MENU%': rebaseWebRootPaths(extractDivById(main_html, 'workspace-context-menu')),
    '%WEB_HELP_CONTAINER%': rebaseWebRootPaths(extractDivById(main_html, 'help-container')),
    '%WEB_INFO_CONTAINER%': info_block,
    '%WEB_INSPECTOR_INPUT_CONTAINER%': inspector_input_block,
    '%WEB_SETTINGS_CONTAINER%': settings_block,
    '%WEB_SANDBOX_STATS_POPUP%': rebaseWebRootPaths(extractDivById(main_html, 'sandbox-stats-popup'))
  };
}

/**
 * Builds the browser editor HTML from the Electron editor source.
 * @param {string} editor_html
 * @returns {string}
 */
function buildWebEditorHtml(editor_html) {
  var web_editor_layout_style = [
    '    <style id="web-editor-layout-overrides">',
    '      body {',
    '        position: relative;',
    '        min-height: 100vh;',
    '        overflow: hidden;',
    '      }',
    '      #code {',
    '        position: absolute;',
    '        top: 74px;',
    '        left: 0;',
    '        right: 0;',
    '        bottom: 0;',
    '      }',
    '      html.editor-search-all-open #code {',
    '        bottom: calc(var(--editor-search-all-panel-height) + 17px);',
    '      }',
    '    </style>'
  ].join('\n');

  var script_tail = [
    '    <script>',
    '      window.__JSLAB_WEB_EDITOR_FILE__ = %WEB_EDITOR_FILE%;',
    '      window.__JSLAB_WEB_EDITOR_LINE__ = %WEB_EDITOR_LINE%;',
    '    </script>',
    '',
    '    <script type="text/javascript" src="../lib/draggabilly-2.3.0/draggabilly-2.3.0.min.js"></script>',
    '    <script type="text/javascript" src="../lib/PRDC_TABS/PRDC_TABS.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/lib/codemirror.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/selection/active-line.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/foldcode.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/foldgutter.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/brace-fold.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/indent-fold.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/comment-fold.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/display/rulers.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/edit/matchbrackets.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/lint/lint.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/hint/show-hint.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/search/searchcursor.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/scroll/annotatescrollbar.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/search/matchesonscrollbar.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/search/jump-to-line.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/search/match-highlighter.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/comment/comment.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/mode/javascript/javascript.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/mode/clike/clike.js"></script>',
    '',
    '    <script type="text/javascript" src="../lib/jquery-3.7.0/jquery-3.7.0.min.js"></script>',
    '    <script type="text/javascript" src="../js/code/custom-javascript-hint.js"></script>',
    '    <script type="text/javascript" src="../js/code/dialog-search.js"></script>',
    '',
    '    <script type="text/javascript" src="../js/frame-bootstrap.js"></script>',
    '    <script type="text/javascript" src="../js/editor-frame.js"></script>',
    '  </body>'
  ].join('\n');

  return editor_html
    .replace('<style id="dynamic-style-rules"></style>', '<style id="dynamic-style-rules"></style>\n' + web_editor_layout_style)
    .replace(/\s*<ul id="window-controls">[\s\S]*?<\/ul>/, '\n')
    .replace('<div class="tabs-content"></div>', '<div class="tabs-content" id="editor-tabs-content"></div>')
    .replace(/\s*<script>if \(typeof module === 'object'\) \{window\.module = module; module = undefined;\}<\/script>\s*/,'\n\n')
    .replace(/<script type="text\/javascript" src="\.\.\/lib\/draggabilly-2\.3\.0\/draggabilly-2\.3\.0\.min\.js"><\/script>[\s\S]*?<\/body>/, script_tail);
}

/**
 * Builds the browser presentation editor HTML from the Electron source.
 * @param {string} presentation_editor_html
 * @returns {string}
 */
function buildWebPresentationEditorHtml(presentation_editor_html) {
  var web_presentation_editor_style = [
    '    <style id="web-presentation-editor-overrides">',
    '      #preview {',
    '        border: 0;',
    '        width: 100%;',
    '        height: 100%;',
    '      }',
    '      .slide-thumb-preview {',
    '        display: flex;',
    '        align-items: center;',
    '        justify-content: center;',
    '        padding: 8px;',
    '        color: #666;',
    '        font-size: 11px;',
    '        line-height: 1.25;',
    '        text-align: center;',
    '      }',
    '      .slide-thumb-preview-body {',
    '        display: -webkit-box;',
    '        -webkit-box-orient: vertical;',
    '        -webkit-line-clamp: 5;',
    '        overflow: hidden;',
    '      }',
    '      .slide-thumb-frame {',
    '        display: block;',
    '        width: 100%;',
    '        height: 100%;',
    '        border: 0;',
    '        background: #fff;',
    '        pointer-events: none;',
    '      }',
    '      .presentation-slide-menu {',
    '        display: none;',
    '        z-index: 60;',
    '        position: fixed;',
    '        min-width: 180px;',
    '        background: #fff;',
    '        border: 1px solid #cfcfcf;',
    '        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);',
    '      }',
    '      .presentation-slide-menu button {',
    '        display: block;',
    '        width: 100%;',
    '        padding: 8px 12px;',
    '        border: 0;',
    '        background: transparent;',
    '        color: #444;',
    '        font: 14px Roboto, Arial;',
    '        text-align: left;',
    '        cursor: pointer;',
    '      }',
    '      .presentation-slide-menu button:hover {',
    '        background: #2e85c7;',
    '        color: #fff;',
    '      }',
    '    </style>'
  ].join('\n');

  var script_tail = [
    '    <script type="text/javascript" src="../lib/draggabilly-2.3.0/draggabilly-2.3.0.min.js"></script>',
    '    <script type="text/javascript" src="../lib/PRDC_TABS/PRDC_TABS.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/lib/codemirror.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/selection/active-line.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/foldcode.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/foldgutter.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/xml-fold.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/brace-fold.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/indent-fold.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/fold/comment-fold.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/display/rulers.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/edit/matchbrackets.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/lint/lint.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/hint/show-hint.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/search/searchcursor.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/scroll/annotatescrollbar.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/search/matchesonscrollbar.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/search/jump-to-line.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/search/match-highlighter.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/comment/comment.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/mode/xml/xml.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/mode/css/css.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/mode/javascript/javascript.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/mode/htmlmixed/htmlmixed.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/hint/xml-hint.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/hint/javascript-hint.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/hint/css-hint.js"></script>',
    '    <script type="text/javascript" src="../lib/codemirror-5.49.2/addon/hint/html-hint.js"></script>',
    '    <script type="text/javascript" src="../lib/jquery-3.7.0/jquery-3.7.0.min.js"></script>',
    '    <script type="text/javascript" src="../js/code/custom-javascript-hint.js"></script>',
    '    <script type="text/javascript" src="../js/code/dialog-search.js"></script>',
    '    <script type="text/javascript" src="../js/frame-bootstrap.js"></script>',
    '    <script type="text/javascript" src="../js/presentation-editor-frame.js"></script>',
    '  </body>'
  ].join('\n');

  return presentation_editor_html
    .replace('<style id="dynamic-style-rules"></style>', '<style id="dynamic-style-rules"></style>\n' + web_presentation_editor_style)
    .replace(/<webview id="preview"[^>]*><\/webview>/, '<iframe id="preview"></iframe>')
    .replace(/\s*<div id="thumbnail-preview-host">[\s\S]*?<\/div>\s*/m, '\n')
    .replace(/\s*<script>if \(typeof module === 'object'\) \{window\.module = module; module = undefined;\}<\/script>\s*/,'\n\n')
    .replace(/<script type="text\/javascript" src="\.\.\/lib\/draggabilly-2\.3\.0\/draggabilly-2\.3\.0\.min\.js"><\/script>[\s\S]*?<\/body>/, script_tail);
}

/**
 * Builds the generated runtime data bootstrap for the web app.
 * @param {Object} package_json
 * @param {*} docs_index
 * @param {Object<string, string>} window_templates
 * @param {Object<string, string>} app_assets
 * @param {string} sandbox_frame_source
 * @returns {string}
 */
function buildWebRuntimeDataScript(package_json, docs_index, window_templates, app_assets,
    sandbox_frame_source, native_wasm_info) {
  return [
    '/**',
    ' * @file Generated runtime data bootstrap for JSLAB web',
    ' * Generated by js/dev/build-web.js',
    ' */',
    '',
    'window.__JSLAB_WEB_APP_VERSION__ = ' + JSON.stringify(String(package_json.version || '')) + ';',
    'window.__JSLAB_WEB_DOCS__ = ' + stringifyForInlineScript(docs_index) + ';',
    'window.__JSLAB_WEB_WINDOW_TEMPLATES__ = ' + stringifyForInlineScript(window_templates) + ';',
    'window.__JSLAB_WEB_APP_ASSETS__ = ' + stringifyForInlineScript(app_assets) + ';',
    'window.__JSLAB_WEB_NATIVE_WASM__ = ' + stringifyForInlineScript(native_wasm_info) + ';',
    'window.__JSLAB_WEB_SANDBOX_FRAME_SOURCE__ = ' + stringifyForInlineScript(sandbox_frame_source) + ';',
    ''
  ].join('\n');
}

/**
 * Sanitizes the generated documentation HTML for browser embedding.
 * @param {string} html
 * @returns {string}
 */
function sanitizeDocumentationHtml(html) {
  return String(html || '')
    .replace(
      /<li><strong>Discourse:<\/strong> Write a New Topic at \\url\{<a href="https:\/\/discourse\.jsl\.pr-dc\.com\/">https:\/\/discourse\.jsl\.pr-dc\.com\/<\/a>/,
      '<li><strong>Discourse:</strong> Write a New Topic at <a href="https://discourse.jsl.pr-dc.com/">https://discourse.jsl.pr-dc.com/</a>.</li>'
    )
    .replace(/\\url\{/g, '\\\\url{');
}

/**
 * Ensures a directory exists.
 * @param {string} dir_path
 */
function ensureDirectory(dir_path) {
  fs.mkdirSync(dir_path, { recursive: true });
}

/**
 * Removes all children from a directory while keeping the root folder.
 * @param {string} dir_path
 */
function emptyDirectory(dir_path) {
  if(!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true });
    return;
  }
  fs.readdirSync(dir_path).forEach(function(entry_name) {
    try {
      fs.rmSync(path.join(dir_path, entry_name), { recursive: true, force: true });
    } catch {}
  });
}

/**
 * Copies a file while creating parent directories.
 * @param {string} from_path
 * @param {string} to_path
 */
function copyFile(from_path, to_path) {
  fs.mkdirSync(path.dirname(to_path), { recursive: true });
  fs.copyFileSync(from_path, to_path);
}

/**
 * Copies a directory recursively.
 * @param {string} from_path
 * @param {string} to_path
 */
function copyFolder(from_path, to_path) {
  fs.mkdirSync(to_path, { recursive: true });
  var entries = fs.readdirSync(from_path, { withFileTypes: true });
  entries.forEach(function(entry) {
    var src = path.join(from_path, entry.name);
    var dest = path.join(to_path, entry.name);
    if(entry.isDirectory()) {
      copyFolder(src, dest);
    } else {
      copyFile(src, dest);
    }
  });
}

/**
 * Reads the native wasm manifest when available.
 * @returns {Object}
 */
function readNativeWasmInfo() {
  var manifest_path = path.join(native_wasm_root, 'manifest.json');
  var info = {
    native_module: {
      available: false,
      entry: 'native_module.js'
    },
    alpha_shape_3d: {
      available: false
    }
  };

  if(fs.existsSync(manifest_path)) {
    try {
      var manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf8'));
      if(manifest && manifest.targets) {
        if(manifest.targets.native_module) {
          info.native_module = Object.assign({}, info.native_module, manifest.targets.native_module);
        }
        if(manifest.targets.alpha_shape_3d) {
          info.alpha_shape_3d = Object.assign({}, info.alpha_shape_3d, manifest.targets.alpha_shape_3d);
        }
      }
    } catch(err) {
      console.warn('Failed to parse native wasm manifest:', err.message);
    }
  }

  info.native_module.available = !!(info.native_module.available &&
    fs.existsSync(path.join(native_wasm_root, info.native_module.entry || 'native_module.js')));
  info.alpha_shape_3d.available = !!(info.alpha_shape_3d.available &&
    fs.existsSync(path.join(native_wasm_root, info.alpha_shape_3d.entry || 'alpha_shape_3d.js')));

  return info;
}

/**
 * Builds the static dist-web bundle.
 */
async function buildWeb() {
  emptyDirectory(dist_root);
  fs.rmSync(old_dist_root, { recursive: true, force: true });
  ensureDirectory(dist_root);
  ensureDirectory(js_root);
  ensureDirectory(js_code_root);
  ensureDirectory(js_shared_root);
  ensureDirectory(js_windows_root);

  await esbuild.build({
    absWorkingDir: app_root,
    alias: {
      os: path.join(app_root, 'js', 'web', 'shims', 'os.js'),
      'node:path': path.join(app_root, 'js', 'web', 'shims', 'path.js'),
      'node:util': path.join(app_root, 'js', 'web', 'shims', 'util.js')
    },
    bundle: true,
    entryPoints: {
      'init-web': 'js/web/init-web.js',
      'sandbox-frame': 'js/web/init-sandbox-frame.js',
      'frame-bootstrap': 'js/web/windows/frame-bootstrap.js',
      'editor-frame': 'js/web/windows/editor-frame.js',
      'figure-frame': 'js/web/windows/figure-frame.js',
      'presentation-editor-frame': 'js/web/windows/presentation-editor-frame.js'
    },
    format: 'iife',
    outdir: js_root,
    platform: 'browser',
    target: ['es2020']
  });

  ensureDirectory(css_root);
  ensureDirectory(html_root);
  copyFile(path.join(app_root, 'css', 'main.css'), path.join(css_root, 'main.css'));
  copyFile(path.join(app_root, 'css', 'terminal.css'), path.join(css_root, 'terminal.css'));
  copyFile(path.join(app_root, 'web', 'css', 'web.css'), path.join(css_root, 'web.css'));
  [
    'basic.css',
    'figure.css',
    'three.css',
    'editor.css',
    'presentation-editor.css',
    'tabs.css',
    'big-json-viewer-notepadpp-theme.css',
    'codemirror-notepadpp-theme.css',
    'codemirror-main-custom.css',
    'codemirror-editor-custom.css',
    'codemirror-presentation-editor-custom.css',
    'highlight-notepadpp-theme.css',
    'context-menu.css',
    'svg-viewer.css',
    'mermaid-graph.css'
  ].forEach(function(file_name) {
    copyFile(path.join(app_root, 'css', file_name), path.join(css_root, file_name));
  });
  copyFolder(path.join(app_root, 'font'), font_root);
  copyFolder(path.join(app_root, 'img'), img_root);
  copyFolder(path.join(app_root, 'docs', 'resources'), path.join(dist_root, 'docs', 'resources'));
  ensureDirectory(path.join(dist_root, 'docs'));
  copyFile(path.join(app_root, 'node_modules', 'pdfkit', 'js', 'pdfkit.standalone.js'), path.join(dist_root, 'lib', 'pdfkit', 'pdfkit.standalone.js'));
  copyFile(path.join(app_root, 'node_modules', 'svg-to-pdfkit', 'source.js'), path.join(dist_root, 'lib', 'svg-to-pdfkit', 'source.js'));
  copyFile(path.join(app_root, 'js', 'shared', 'terminal-buffer.js'), path.join(js_shared_root, 'terminal-buffer.js'));
  copyFile(path.join(app_root, 'js', 'windows', 'mathjax-config.js'), path.join(js_windows_root, 'mathjax-config.js'));
  copyFile(path.join(app_root, 'js', 'windows', 'plot.js'), path.join(js_windows_root, 'plot.js'));
  copyFile(path.join(app_root, 'js', 'windows', 'terminal.js'), path.join(js_windows_root, 'terminal.js'));
  copyFile(path.join(app_root, 'js', 'windows', 'ui.js'), path.join(js_windows_root, 'ui.js'));

  [
    'sympy-0.26.2',
    'MathJax-3.2.0',
    'plotly-3.3.0',
    'd3-7.8.5',
    'leaflet-1.9.4',
    'leaflet.rotatedMarker-0.2.0',
    'Cesium-1.124',
    'three.js-r162',
    'hammer-2.0.8',
    'anime-3.2.1',
    'tween.js-23.1.1',
    'inflate-0.3.1',
    'jquery-3.7.0',
    'highlight-11.0.1',
    'jstree-3.3.17',
    'draggabilly-2.3.0',
    'PRDC_TABS',
    'PRDC_SVG_VIEWER',
    'mermaid-11.4.1',
    'codemirror-5.49.2'
  ].forEach(function(folder_name) {
    copyFolder(path.join(app_root, 'lib', folder_name), path.join(dist_root, 'lib', folder_name));
  });

  copyFile(path.join(app_root, 'js', 'code', 'dialog-search.js'), path.join(js_code_root, 'dialog-search.js'));
  copyFile(path.join(app_root, 'js', 'code', 'custom-javascript-hint.js'), path.join(js_code_root, 'custom-javascript-hint.js'));
  var native_wasm_info = readNativeWasmInfo();
  if(native_wasm_info.native_module.available || native_wasm_info.alpha_shape_3d.available) {
    copyFolder(native_wasm_root, path.join(dist_root, 'lib', 'native-wasm'));
  }

  var frame_bootstrap_script = '<script type="text/javascript" src="../js/frame-bootstrap.js"></script>';
  var figure_frame_script = '<script type="text/javascript" src="../js/figure-frame.js"></script>';
  var main_html = fs.readFileSync(path.join(app_root, 'html', 'main.html'), 'utf8');
  var editor_html = fs.readFileSync(path.join(app_root, 'html', 'editor.html'), 'utf8');
  var presentation_editor_html = fs.readFileSync(path.join(app_root, 'html', 'presentation-editor.html'), 'utf8');
  var shared_main_fragments = buildSharedMainFragments(main_html);
  var editor_web_template = buildWebEditorHtml(editor_html);
  var presentation_editor_web_template = buildWebPresentationEditorHtml(presentation_editor_html);

  fs.writeFileSync(
    path.join(html_root, 'editor-web.html'),
    editor_web_template
      .replace(/%WEB_EDITOR_FILE%/g, '""')
      .replace(/%WEB_EDITOR_LINE%/g, '0'),
    'utf8'
  );
  ['blank.html', 'plotlyjs.html', 'd3.html', 'leaflet.html', 'three.html', 'serial_terminal.html', 'cesium.html'].forEach(function(file_name) {
    fs.writeFileSync(
      path.join(html_root, file_name),
      injectScriptsBeforeBodyClose(
        fs.readFileSync(path.join(app_root, 'html', file_name), 'utf8'),
        [frame_bootstrap_script]
      ),
      'utf8'
    );
  });

  fs.writeFileSync(
    path.join(html_root, 'figure.html'),
    injectScriptsBeforeBodyClose(
      fs.readFileSync(path.join(app_root, 'html', 'figure.html'), 'utf8'),
      [frame_bootstrap_script, figure_frame_script]
    ),
    'utf8'
  );
  fs.writeFileSync(
    path.join(html_root, 'mermaid_graph.html'),
    injectScriptsBeforeBodyClose(
      fs.readFileSync(path.join(app_root, 'html', 'mermaid_graph.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'utf8'
  );
  fs.writeFileSync(
    path.join(html_root, 'url.html'),
    injectScriptsBeforeBodyClose(
      createWebUrlWindowTemplate(fs.readFileSync(path.join(app_root, 'html', 'url.html'), 'utf8')),
      [frame_bootstrap_script]
    ),
    'utf8'
  );
  fs.writeFileSync(
    path.join(html_root, 'presentation-editor.html'),
    presentation_editor_web_template,
    'utf8'
  );

  var html_template = fs.readFileSync(path.join(app_root, 'web', 'html', 'web.html'), 'utf8');
  var package_json = JSON.parse(fs.readFileSync(path.join(app_root, 'package.json'), 'utf8'));
  var docs_index = JSON.parse(fs.readFileSync(path.join(app_root, 'docs', 'documentation.json'), 'utf8'));
  var documentation_html = sanitizeDocumentationHtml(fs.readFileSync(path.join(app_root, 'docs', 'documentation.html'), 'utf8'));
  var sandbox_frame_source = fs.readFileSync(path.join(js_root, 'sandbox-frame.js'), 'utf8');
  Object.keys(shared_main_fragments).forEach(function(placeholder) {
    html_template = html_template.replace(placeholder, shared_main_fragments[placeholder]);
  });
  html_template = html_template
    .replace(
      /<label id="inspector-input-label-1" for="inspector-input-field-1"><\/label>\s*<input id="inspector-input-field-1" type="text" autocomplete="off" spellcheck="false">/,
      '<div id="inspector-input-row-1" class="float-input">\n          <input id="inspector-input-field-1" type="text" autocomplete="off" spellcheck="false" placeholder=" ">\n          <label class="float-label" id="inspector-input-label-1" for="inspector-input-field-1"></label>\n          </div>'
    )
    .replace(
      /<div id="inspector-input-row-2">\s*<label id="inspector-input-label-2" for="inspector-input-field-2"><\/label>\s*<input id="inspector-input-field-2" type="text" autocomplete="off" spellcheck="false">\s*<\/div>/,
      '<div id="inspector-input-row-2" class="float-input">\n            <input id="inspector-input-field-2" type="text" autocomplete="off" spellcheck="false" placeholder=" ">\n            <label class="float-label" id="inspector-input-label-2" for="inspector-input-field-2"></label>\n          </div>'
    );
  var window_templates = {
    'blank.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'blank.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'plotlyjs.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'plotlyjs.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'd3.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'd3.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'leaflet.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'leaflet.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'cesium.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'cesium.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'three.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'three.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'figure.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'figure.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'mermaid_graph.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'mermaid_graph.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'serial_terminal.html': createSrcdocTemplate(
      fs.readFileSync(path.join(app_root, 'html', 'serial_terminal.html'), 'utf8'),
      [frame_bootstrap_script]
    ),
    'url.html': createSrcdocTemplate(
      createWebUrlWindowTemplate(fs.readFileSync(path.join(app_root, 'html', 'url.html'), 'utf8')),
      [frame_bootstrap_script]
    ),
    'documentation.html': createSrcdocTemplateWithBase(
      documentation_html,
      '%WEB_DOCS_BASE%'
    ),
    'presentation-editor.html': createSrcdocTemplate(
      presentation_editor_web_template
    ),
    'editor-web.html': createSrcdocTemplate(editor_web_template)
  };
  var app_assets = {};
  Object.keys(window_templates).forEach(function(file_name) {
    app_assets['/html/' + file_name] = window_templates[file_name];
  });
  app_assets['/docs/documentation.html'] = window_templates['documentation.html'];
  app_assets['/docs/documentation.json'] = JSON.stringify(docs_index);
  app_assets['/html/presentation.html'] = fs.readFileSync(path.join(app_root, 'html', 'presentation.html'), 'utf8');
  app_assets['/css/presentation.css'] = fs.readFileSync(path.join(app_root, 'css', 'presentation.css'), 'utf8');
  app_assets['/js/windows/presentation.js'] = fs.readFileSync(path.join(app_root, 'js', 'windows', 'presentation.js'), 'utf8');
  app_assets['/js/windows/mathjax-config.js'] = fs.readFileSync(path.join(app_root, 'js', 'windows', 'mathjax-config.js'), 'utf8');
  fs.writeFileSync(path.join(dist_root, 'docs', 'documentation.html'), documentation_html, 'utf8');
  fs.writeFileSync(
    path.join(js_root, 'web-runtime-data.js'),
    buildWebRuntimeDataScript(package_json, docs_index, window_templates, app_assets,
      sandbox_frame_source, native_wasm_info),
    'utf8'
  );
  var html = html_template
    .replace(/%APP_VERSION%/g, String(package_json.version || ''));
  fs.writeFileSync(path.join(dist_root, 'index.html'), html, 'utf8');

  console.log('Built JSLAB web scaffold to ' + dist_root);
}

buildWeb().catch(function(err) {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
