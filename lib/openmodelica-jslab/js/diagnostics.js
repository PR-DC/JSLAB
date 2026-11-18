/**
 * @file Compiler diagnostics shared by Simulate hosts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  translatedLibraryText
} = require('./localization');
/**
 * Class for preserving and localizing compiler diagnostics.
 */
class PRDC_OMJSL_DIAGNOSTICS {

  /**
   * Parses complete compiler diagnostics without discarding multiline equation details.
   * @param {string} text Compiler output.
   * @returns {Object[]} Diagnostics with severity, location and message.
   */
  static parse(text) {
    const items = [];
    let current = null;
    for(const source_line of String(text || '').split(/\r?\n/)) {
      let line = source_line.trim();
      const location = /^\[(.*):(\d+):(\d+)(?:-(\d+):(\d+))?:[^\]]*\]\s*/.exec(line);
      if(location) {
        line = line.slice(location[0].length);
      }
      const severity = /^(Error|Warning|Notification):\s*/i.exec(line);
      if(severity) {
        current = {
          severity: severity[1].toLowerCase() == 'notification' ? 'info' : severity[1].toLowerCase(),
          message: line.slice(severity[0].length).trim(),
          file: location ? location[1] : '',
          line: location ? Number(location[2]) : 0,
          column: location ? Number(location[3]) : 0,
          end_line: location && location[4] ? Number(location[4]) : 0,
          end_column: location && location[5] ? Number(location[5]) : 0
        };
        items.push(current);
      } else if(current) {
        current.message += '\n' + source_line.trimEnd();
      }
    }
    for(const item of items) {
      item.message = item.message.trimEnd();
    }
    return items;
  }

  /**
   * Formats diagnostic severity and source positions in the selected language.
   * @param {Object[]} items Compiler diagnostics.
   * @param {string} language Selected interface language.
   * @returns {string} Readable diagnostics without discarding equation details.
   */
  static format(items, language = 'en') {
    return (items || []).map(function(item) {
      const severity = translatedLibraryText(item.severity == 'warning' ? "omjsl-21" : item.severity == 'info' ? "omjsl-22" : "omjsl-20", language);
      let location = item.line ? translatedLibraryText("omjsl-23", language).replace('{line}', item.line).replace('{column}', item.column || 1) : '';
      if(item.file) {
        location = item.file + (location ? ': ' + location : '');
      }
      return severity + (location ? ' (' + location + ')' : '') + ': ' + item.message;
    }).join('\n');
  }

  /**
   * Combines the error and captured compiler output into a readable diagnostic message.
   * @param {Error|string} error Compiler failure.
   * @param {string} language Selected interface language.
   * @returns {string} Complete compiler diagnostics or the original error message.
   */
  static error(error, language = 'en') {
    const text = String(error && error.message || error || '').trim();
    const items = this.parse(text);
    return items.length ? this.format(items, language) : text.replace(/^Error:\s*/i, '');
  }

}
exports.PRDC_OMJSL_DIAGNOSTICS = PRDC_OMJSL_DIAGNOSTICS;
