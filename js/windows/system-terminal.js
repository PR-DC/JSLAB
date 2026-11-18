/**
 * @file JSLAB terminal window controller
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');

/**
 * Controls the system-shell Terminal window through injected host services.
 */
class PRDC_JSLAB_WIN_SYSTEM_TERMINAL {

  /**
   * Connects the window controller to its host services.
   * @param {Object} platform Window service adapter.
   */
  constructor(platform) {
    this.platform = platform;
  }


  /**
   * Initializes window state, controls and host events after the document loads.
   */
  onReady() {
    const { host, clipboard } = this.platform;
    var obj = this;
    var configuration = obj.platform.getTerminalConfiguration();
    obj.terminal_window_id = configuration.id;
    obj.terminal_options = configuration.options;

    obj.terminal_name = typeof obj.terminal_options.name === 'string' ? obj.terminal_options.name : language.currentString(666);

    document.title = obj.terminal_name;
    obj.container = document.getElementById('terminal-container');
    obj.fit_addon = new FitAddon();
    obj.terminal = new Terminal({
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
    obj.pty_id = null;
    obj.resize_timer = null;

    obj.terminal.loadAddon(obj.fit_addon);

    obj.terminal.open(obj.container);

    obj.terminal.onData(function(data) {
      if(obj.pty_id === null) {
        return;
      }
      host.sendSync('sync-message', 'pty', {
        action: 'write',
        data: { id: obj.pty_id, buffer: obj.platform.encodeTerminalData(data) }
      });
    });

    obj.terminal.attachCustomKeyEventHandler(function(event) {
      if(event.type !== 'keydown') {
        return true;
      }
      if(event.ctrlKey && event.shiftKey && event.code === 'KeyC' && obj.terminal.hasSelection()) {
        clipboard.writeText(obj.terminal.getSelection());
        return false;
      }
      if(event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
        var text = clipboard.readText();
        if(text && obj.pty_id !== null) {
          host.sendSync('sync-message', 'pty', {
            action: 'write',
            data: { id: obj.pty_id, buffer: obj.platform.encodeTerminalData(text) }
          });
        }
        return false;
      }
      return true;
    });

    host.on('pty', function(_event, data) {
      if(!data || data.id !== obj.pty_id) {
        return;
      }
      if(data.type === 'data') {
        var output = obj.platform.decodeTerminalData(data.buffer);
        obj.terminal.write(output);
        host.send('TerminalWindowEvent', {
          id: obj.terminal_window_id,
          type: 'data',
          data: output
        });
      } else if(data.type === 'exit') {
        obj.pty_id = null;
        var code = typeof data.exitCode === 'number' ? data.exitCode : '';
        obj.terminal.writeln('\r\n\x1b[90m[' + language.formatLang(670, { code: code }) + ']\x1b[0m');
        host.send('TerminalWindowEvent', {
          id: obj.terminal_window_id,
          type: 'exit',
          exitCode: data.exitCode,
          signal: data.signal
        });
      }
    });

    window.addEventListener('resize', obj.fitTerminal.bind(obj));

    host.on('TerminalWindow', function(_event, action, data) {
      if(action === 'set-language') {
        language.set(data);
        document.title = obj.terminal_name;
      }
      if(action === 'set-name') {
        obj.terminal_name = String(data || language.currentString(666));
        document.title = obj.terminal_name;
      }
      if(action === 'write') {
        obj.writeShell(data);
      }
      if(action === 'clear') {
        obj.terminal.clear();
        obj.terminal.focus();
      }
      if(action === 'restart') {
        obj.startShell();
      }
      if(action === 'focus') {
        if(obj.pty_id === null) {
          obj.startShell();
        } else {
          obj.fitTerminal();
          obj.terminal.focus();
        }
      }
    });
  }

  /**
   * Fits the emulator and synchronizes its rows and columns with the PTY.
   */
  fitTerminal() {
    const { host } = this.platform;
    var obj = this;
    clearTimeout(obj.resize_timer);
    obj.resize_timer = setTimeout(function() {
      try {
        obj.fit_addon.fit();
        if(obj.pty_id !== null) {
          host.sendSync('sync-message', 'pty', {
            action: 'resize',
            data: { id: obj.pty_id, cols: obj.terminal.cols, rows: obj.terminal.rows }
          });
        }
      } catch(error) {}
    }, 30);
  }

  /**
   * Starts a fresh interactive system shell in the current terminal view.
   */
  startShell() {
    const { host } = this.platform;
    var obj = this;
    if(obj.pty_id !== null) {
      host.sendSync('sync-message', 'pty', { action: 'kill', data: { id: obj.pty_id } });
      obj.pty_id = null;
    }
    obj.terminal.reset();
    obj.fit_addon.fit();
    obj.pty_id = obj.platform.createShell(obj.terminal_options, {
      cols: obj.terminal.cols, rows: obj.terminal.rows
    });
    host.send('TerminalWindowEvent', {
      id: obj.terminal_window_id,
      type: 'started'
    });
    obj.terminal.focus();
  }

  /**
   * Writes text to the shell, starting it first when necessary.
   */
  writeShell(data) {
    const { host } = this.platform;
    var obj = this;
    if(obj.pty_id === null) {
      obj.startShell();
    }
    return host.sendSync('sync-message', 'pty', {
      action: 'write',
      data: { id: obj.pty_id, buffer: obj.platform.encodeTerminalData(data) }
    });
  }
}

exports.PRDC_JSLAB_WIN_SYSTEM_TERMINAL = PRDC_JSLAB_WIN_SYSTEM_TERMINAL;
