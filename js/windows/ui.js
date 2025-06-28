/**
 * @file JSLAB library ui script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB ui.
 */
class PRDC_JSLAB_UI {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_UI class.
   */
  constructor() {
    // Tabs
    var container = document.querySelector('.ui.tabs-cont');
    if(container) {
      var headers = [...container.querySelectorAll('.ui.tab-name')];
      var panels  = [...container.querySelectorAll('.ui.tab')];

      function showTab(idx) {
        headers.forEach((h, i) => h.classList.toggle('active', i === idx));
        panels.forEach((p, i) => p.style.display = i === idx ? 'block' : 'none');
      };

      var start_idx = headers.findIndex(h => h.classList.contains('active'));
      if(start_idx === -1) {
        start_idx = 0;
      }
      showTab(start_idx);
      headers.forEach((h, i) => h.addEventListener('click', () => showTab(i)));
    }
  }
}

var ui = new PRDC_JSLAB_UI();