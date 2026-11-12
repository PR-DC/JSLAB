/**
 * @file JSLAB system Terminal window
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { ipcRenderer, clipboard } = require('electron');
const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
require('../js/shared/init-config.js');
const { PRDC_JSLAB_LANGUAGE } = require('../js/shared/language');

global.app_path = ipcRenderer.sendSync('sync-message', 'get-app-path');
var language = new PRDC_JSLAB_LANGUAGE();
var terminal_window_id_arg = process.argv.find(function(arg) {
  return arg.startsWith('--terminal-window-id=');
});
var terminal_options_arg = process.argv.find(function(arg) {
  return arg.startsWith('--terminal-window-options=');
});
var terminal_window_id = terminal_window_id_arg ? Number(terminal_window_id_arg.split('=')[1]) : 0;
var terminal_options = {};
try {
  terminal_options = JSON.parse(Buffer.from(terminal_options_arg.split('=')[1], 'base64').toString('utf8'));
} catch(error) {}
var terminal_name = typeof terminal_options.name === 'string' ? terminal_options.name : language.currentString(667);
document.title = terminal_name;
var container = document.getElementById('terminal-container');
var fit_addon = new FitAddon();
var terminal = new Terminal({
  allowTransparency: false,
  convertEol: false,
  cursorBlink: true,
  cursorStyle: 'bar',
  fontFamily: 'Roboto Mono, Consolas, monospace',
  fontSize: 14,
  lineHeight: 1.15,
  scrollback: 10000,
  theme: {
    background: '#0c0c0c',
    foreground: '#f2f2f2',
    cursor: '#f7df1e',
    selectionBackground: '#2e85c780'
  }
});
var pty_id = null;
var resize_timer = null;

terminal.loadAddon(fit_addon);
terminal.open(container);

/** Fits the emulator and synchronizes its rows and columns with the PTY. */
function fitTerminal() {
  clearTimeout(resize_timer);
  resize_timer = setTimeout(function() {
    try {
      fit_addon.fit();
      if(pty_id !== null) {
        ipcRenderer.sendSync('sync-message', 'pty', {
          action: 'resize',
          data: { id: pty_id, cols: terminal.cols, rows: terminal.rows }
        });
      }
    } catch(error) {}
  }, 30);
}

/** Starts a fresh interactive system shell in the current terminal view. */
function startShell() {
  if(pty_id !== null) {
    ipcRenderer.sendSync('sync-message', 'pty', { action: 'kill', data: { id: pty_id } });
    pty_id = null;
  }
  terminal.reset();
  fit_addon.fit();
  var shell = terminal_options.shell || process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
  var args = Array.isArray(terminal_options.args) ? terminal_options.args : [];
  var env = Object.assign({}, process.env, terminal_options.env || {}, {
    TERM: 'xterm-256color', COLORTERM: 'truecolor'
  });
  pty_id = ipcRenderer.sendSync('sync-message', 'pty', {
    action: 'create',
    data: [shell, args, {
      cols: terminal.cols,
      rows: terminal.rows,
      cwd: terminal_options.cwd || process.env.USERPROFILE || process.cwd(),
      env: env,
      name: 'xterm-256color'
    }]
  });
  ipcRenderer.send('TerminalWindowEvent', {
    id: terminal_window_id,
    type: 'started'
  });
  terminal.focus();
}

terminal.onData(function(data) {
  if(pty_id === null) return;
  ipcRenderer.sendSync('sync-message', 'pty', {
    action: 'write',
    data: { id: pty_id, buffer: Buffer.from(data, 'utf8').toString('base64') }
  });
});

/** Writes text to the shell, starting it first when necessary. */
function writeShell(data) {
  if(pty_id === null) startShell();
  return ipcRenderer.sendSync('sync-message', 'pty', {
    action: 'write',
    data: { id: pty_id, buffer: Buffer.from(String(data || ''), 'utf8').toString('base64') }
  });
}

terminal.attachCustomKeyEventHandler(function(event) {
  if(event.type !== 'keydown') return true;
  if(event.ctrlKey && event.shiftKey && event.code === 'KeyC' && terminal.hasSelection()) {
    clipboard.writeText(terminal.getSelection());
    return false;
  }
  if(event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
    var text = clipboard.readText();
    if(text && pty_id !== null) {
      ipcRenderer.sendSync('sync-message', 'pty', {
        action: 'write',
        data: { id: pty_id, buffer: Buffer.from(text, 'utf8').toString('base64') }
      });
    }
    return false;
  }
  return true;
});

ipcRenderer.on('pty', function(_event, data) {
  if(!data || data.id !== pty_id) return;
  if(data.type === 'data') {
    var output = Buffer.from(data.buffer, 'base64').toString('utf8');
    terminal.write(output);
    ipcRenderer.send('TerminalWindowEvent', {
      id: terminal_window_id,
      type: 'data',
      data: output
    });
  } else if(data.type === 'exit') {
    pty_id = null;
    var code = typeof data.exitCode === 'number' ? data.exitCode : '';
    terminal.writeln('\r\n\x1b[90m[' + language.formatLang(671, { code: code }) + ']\x1b[0m');
    ipcRenderer.send('TerminalWindowEvent', {
      id: terminal_window_id,
      type: 'exit',
      exitCode: data.exitCode,
      signal: data.signal
    });
  }
});

window.addEventListener('resize', fitTerminal);
ipcRenderer.on('TerminalWindow', function(_event, action, data) {
  if(action === 'set-language') {
    language.set(data);
    document.title = terminal_name;
  }
  if(action === 'set-name') {
    terminal_name = String(data || language.currentString(667));
    document.title = terminal_name;
  }
  if(action === 'write') writeShell(data);
  if(action === 'clear') {
    terminal.clear();
    terminal.focus();
  }
  if(action === 'restart') startShell();
  if(action === 'focus') {
    if(pty_id === null) startShell();
    else {
      fitTerminal();
      terminal.focus();
    }
  }
});
