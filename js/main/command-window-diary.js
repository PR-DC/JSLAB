/**
 * @file JSLAB command window diary submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_COMMAND_WINDOW_MODULE } = require('./command-window-module');


/**
 * Class for command window diary.
 */
class PRDC_JSLAB_COMMAND_WINDOW_DIARY extends PRDC_JSLAB_COMMAND_WINDOW_MODULE {


}

Object.assign(PRDC_JSLAB_COMMAND_WINDOW_DIARY.prototype, {

  /**
   * Returns default diary path when no explicit path was provided.
   * @returns {string} Default absolute/relative diary path.
   */
  getDiaryDefaultPath() {
    const { path } = this.win.platform;
    var base_path = '.';
    if(this.win && this.win.folder_navigation &&
        typeof this.win.folder_navigation.current_path === 'string' &&
        this.win.folder_navigation.current_path.length) {
      base_path = this.win.folder_navigation.current_path;
    }
    return path.join(base_path, 'diary.log');
  },

  /**
   * Closes active diary output stream.
   */
  closeDiaryStream() {
    var stream = this.diary_stream;
    this.diary_stream = undefined;
    if(stream) {
      try {
        stream.end();
      } catch(err) {
        this.errorInternal('@diary: ' + err);
      }
    }
  },

  /**
   * Opens diary stream for append logging.
   * @param {string} file_path Target file path.
   * @returns {boolean} True when stream is ready.
   */
  openDiaryStream(file_path) {
    const { fs } = this.win.platform;
    if(typeof file_path !== 'string' || !file_path.length) {
      return false;
    }

    if(this.diary_stream &&
        !this.diary_stream.destroyed &&
        !this.diary_stream.writableEnded &&
        this.diary_path === file_path) {
      return true;
    }

    this.closeDiaryStream();
    this.diary_path = file_path;

    try {
      this.diary_stream = fs.createWriteStream(file_path, {
        flags: 'a',
        encoding: 'utf8'
      });
    } catch(err) {
      this.errorInternal('@diary: ' + err);
      this.diary_stream = undefined;
      return false;
    }

    var obj = this;
    const stream = this.diary_stream;
    stream.on('error', function(err) {
      if(obj.diary_stream !== stream) return;
      obj.diary_enabled = false;
      obj.closeDiaryStream();
      obj.errorInternal('@diary: ' + err);
    });

    return true;
  },

  /**
   * Controls runtime diary state.
   * @param {Object} payload Diary command payload.
   * @returns {boolean} True when diary becomes enabled.
   */
  diary(payload) {
    if(!payload || typeof payload !== 'object') {
      payload = {};
    }

    var action = typeof payload.action === 'string' ?
      payload.action.toLowerCase() : 'toggle';
    var file_path = typeof payload.file_path === 'string' ?
      payload.file_path.trim() : '';
    if(action === 'off') {
      this.diary_enabled = false;
      this.closeDiaryStream();
      return false;
    }

    if(action !== 'on' && action !== 'toggle') {
      this.errorInternal('@diary: unknown action "' + action + '".');
      return false;
    }

    if(action === 'toggle' && this.diary_enabled) {
      this.diary_enabled = false;
      this.closeDiaryStream();
      return false;
    }

    if(this.openDiaryStream(file_path || this.diary_path || this.getDiaryDefaultPath())) {
      this.diary_enabled = true;
      return true;
    }

    this.diary_enabled = false;
    return false;
  },

  /**
   * Appends one command-window entry to active diary stream.
   * @param {string} msg_class Message class token.
   * @param {*} raw Raw message payload.
   * @param {string} [timestamp] Optional entry timestamp.
   */
  writeDiaryEntry(msg_class, raw, timestamp) {
    if(!this.diary_enabled || !this.diary_stream ||
        this.diary_stream.destroyed || this.diary_stream.writableEnded) {
      return;
    }

    var line = msg_class + ': ';
    if(this.write_timestamps) {
      line += '[' + (timestamp || this.getTimestamp()) + '] ';
    }
    if(typeof raw === 'undefined') {
      raw = '';
    }
    line += String(raw).replace(/\n/g, '\r\n') + '\r\n';
    this.diary_stream.write(line);
  }
});

exports.PRDC_JSLAB_COMMAND_WINDOW_DIARY = PRDC_JSLAB_COMMAND_WINDOW_DIARY;
