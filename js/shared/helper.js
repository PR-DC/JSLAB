/**
 * @file Javascript helper functions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { shell } = require('electron');

/**
 * Call function when document is ready
 * @param {function} fn - function which is called when document is ready.
 */
global.ready = function(fn) {
  if(document.readyState != 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
};
  
/**
 * Prevents redirect
 */
global.preventRedirect = function() {
  var links = $('a');
  links.each(function() {
    var a = this;
    if(!$(a).hasClass('external-link')) {
      $(a).addClass('external-link');
      $(a).click(function(e) {
        e.preventDefault();
        shell.openExternal(a.href);
        return false;
      });
    }
  });
};

/**
 * Get process arguments
 */
if(process.type == 'browser' || global.is_worker) {
  global.process_arguments = process.argv;
} else {
  var { ipcRenderer } = require('electron');
  global.process_arguments = 
    ipcRenderer.sendSync("sync-message", "get-process-arguments");
}
  