/**
 * @file Browser figure frame for in-page JSLAB windows
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

(function() {
  async function start() {
    if(typeof globalThis.__JSLAB_WEB_setFrameTitle == 'function') {
      globalThis.__JSLAB_WEB_setFrameTitle(document.title);
    }
    if(typeof globalThis.__JSLAB_WEB_applyFrameLanguage == 'function') {
      globalThis.__JSLAB_WEB_applyFrameLanguage();
    }

    var menu_button = document.getElementById('figure-menu-button');
    var menu_container = document.getElementById('figure-menu-container');
    if(menu_button && menu_container) {
      menu_button.addEventListener('click', function() {
        menu_container.classList.toggle('collapsed');
      });
    }

    if(typeof globalThis.plot == 'undefined' || typeof globalThis.Plotly == 'undefined') {
      return;
    }

    if(document.querySelector('#figure-content .plot-cont')) {
      return;
    }

    plot.setCont();
    document.getElementById('figure-menu').className = 'figure-2d';

    await plot.newPlot({}, [{
      x: [0, 1, 2, 3, 4, 5],
      y: [0, 1.5, 1, 2.75, 2.1, 3.5],
      mode: 'lines+markers',
      line: {
        color: '#12568a',
        width: 3
      },
      marker: {
        size: 7
      }
    }], {
      margin: {
        l: 50,
        r: 20,
        t: 24,
        b: 45
      },
      font: {
        family: 'Roboto',
        size: 16
      },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff'
    }, {
      responsive: true,
      displaylogo: false
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    start().catch(function(err) {
      console.error(err);
    });
  });
})();
