/**
 * @file Import/export helpers for browser JSLAB storage
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

class PRDC_JSLAB_WEB_IMPORT_EXPORT {

  /**
   * Triggers a file input picker.
   * @param {HTMLInputElement} input
   */
  static openPicker(input) {
    if(input) {
      input.value = '';
      input.click();
    }
  }

  /**
   * Downloads text as a file.
   * @param {string} filename
   * @param {string} text
   */
  static downloadText(filename, text) {
    this.downloadBlob(filename, new Blob([text], { type: 'text/plain;charset=utf-8' }));
  }

  /**
   * Downloads a blob as a file.
   * @param {string} filename
   * @param {Blob} blob
   */
  static downloadBlob(filename, blob) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 0);
  }
}

exports.PRDC_JSLAB_WEB_IMPORT_EXPORT = PRDC_JSLAB_WEB_IMPORT_EXPORT;
