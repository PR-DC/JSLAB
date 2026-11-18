/**
 * @file JSLAB Electron Terminal shell adapter
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER } = require('./renderer');

/**
 * Class for adapting the native system shell to a Terminal window.
 */
class PRDC_JSLAB_ELECTRON_TERMINAL_SHELL extends PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER {

  /**
   * Reads the main process's terminal-window arguments.
   * @returns {Object} Window identifier and shell options.
   */
  getTerminalConfiguration() {
    const id = process.argv.find(value => value.startsWith('--terminal-window-id='));
    const encoded = process.argv.find(value => value.startsWith('--terminal-window-options='));
    let options = {};
    if(encoded) {
      try {
        options = JSON.parse(Buffer.from(encoded.split('=')[1], 'base64').toString('utf8'));
      } catch(error) {}
    }
    return { id: id ? Number(id.split('=')[1]) : 0, options };
  }

  /**
   * Starts the requested shell with the native terminal environment.
   * @param {Object} options Shell and working-directory options.
   * @param {Object} size Initial rows and columns.
   * @returns {number} Owned PTY identifier.
   */
  createShell(options, size) {
    const shell = options.shell || process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
    const args = Array.isArray(options.args) ? options.args : [];
    const env = Object.assign({}, process.env, options.env || {}, { TERM: 'xterm-256color', COLORTERM: 'truecolor' });
    return this.host.sendSync('sync-message', 'pty', {
      action: 'create',
      data: [shell, args, {
        cols: size.cols, rows: size.rows,
        cwd: options.cwd || process.env.USERPROFILE || process.cwd(), env, name: 'xterm-256color'
      }]
    });
  }

  /**
   * Encodes terminal input for the native IPC transport.
   * @param {*} text Input text.
   * @returns {string} Base64 bytes.
   */
  encodeTerminalData(text) {
    return Buffer.from(String(text || ''), 'utf8').toString('base64');
  }

  /**
   * Decodes native PTY output for the terminal emulator.
   * @param {string} data Base64 bytes.
   * @returns {string} Output text.
   */
  decodeTerminalData(data) {
    return Buffer.from(data, 'base64').toString('utf8');
  }
}

exports.PRDC_JSLAB_ELECTRON_TERMINAL_SHELL = PRDC_JSLAB_ELECTRON_TERMINAL_SHELL;
