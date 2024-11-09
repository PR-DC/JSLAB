/**
 * @file PRDC_POPUP class
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
 
/**
 * Class for popup.
 */
class PRDC_POPUP {
  
  /**
   * Initializes a new popup instance with specified elements and callbacks.
   * @param {HTMLElement|HTMLElement[]} el - The element(s) that trigger the popup on click. Can be a single element or an array of elements.
   * @param {HTMLElement} dom - The DOM element representing the popup.
   * @param {Function} onOpen - A callback function executed when the popup is opened. Receives the clicked element and click event as parameters.
   * @param {Function} onClose - A callback function executed when the popup is closed. Receives the clicked element as a parameter.
   * @param {string|string[]} [classes] - Additional CSS class(es) to apply to the popup element for styling.
   */
  constructor(el, dom, onOpen, onClose, classes) {
    var obj = this;
    this.el = el;
    this.dom = dom;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.classes = classes;
    this.clickCallback;
    this.clicked_element;
    
    this.renderer = window;
    if(typeof renderer != 'undefined') {
      this.renderer = renderer;
    }
    
    // Attach click event listener
    if(!Array.isArray(el) && el) {
      el = [el];
    }

    el.forEach(function(el_i) {
      el_i.addEventListener("click", function(e) {
        obj.open(el_i, e);
      });
    });
    
    // Add classes to popup
    if(classes) {
      if(!Array.isArray(classes)) {
        classes = [classes];
      }
      classes.forEach(function(popup_class) {
        obj.dom.classList.add(popup_class);
      });
    }

    this.clickCallback = function(e) {
      if(!obj.dom.contains(e.target)) {
        obj.close();
      }
    };
      
    this.close();
  }
  
  /**
   * Opens the popup, applies any specified classes, and attaches a click listener to close the popup when clicking outside of it.
   * @param {HTMLElement} clicked_element - The element that was clicked to open the popup.
   * @param {Event} click_event - The click event that triggered the popup to open.
   */
  open(clicked_element, click_event) {
    this.clicked_element = clicked_element;
    if(!this.visible) {
      var obj = this;
      this.visible = true;
      this.renderer.requestAnimationFrame(function() {
        obj.dom.style.display = 'block';
        setImmediate(function() {
          document.addEventListener("click", obj.clickCallback);
        });
      });
    }
    if(typeof this.onOpen == "function") {
      this.onOpen(clicked_element, click_event);
    }
  }
  
  /**
   * Closes the popup and removes the click event listener that closes the popup when clicking outside of it.
   */
  close() {
    if(this.visible) {
      var obj = this;
      this.visible = false;
      this.renderer.requestAnimationFrame(function() {
        obj.dom.style.display = 'none';
        if(typeof obj.onClose == "function") {
          obj.onClose(obj.clicked_element);
        }
      });
    }
    document.removeEventListener("click", this.clickCallback);
  }
}

exports.PRDC_POPUP = PRDC_POPUP;