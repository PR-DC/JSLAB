/**
 * @file JSLAB library presentation script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB presentation.
 */
class PRDC_JSLAB_PRESENTATION {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_PRESENTATION class.
   */
  constructor() {
    const slides = document.querySelectorAll('slide');
    let currentSlide = 0;

    function showSlide(index) {
      if(index < 0 || index >= slides.length) return;
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
    }

    function nextSlide() {
      if(currentSlide < slides.length - 1) {
        currentSlide++;
        showSlide(currentSlide);
      }
    }

    function prevSlide() {
      if(currentSlide > 0) {
        currentSlide--;
        showSlide(currentSlide);
      }
    }

    document.addEventListener('keydown', (event) => {
      switch(event.key) {
        case 'ArrowRight':
        case 'PageDown':
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          prevSlide();
          break;
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      showSlide(currentSlide);
    });
  }
}

var presentation = new PRDC_JSLAB_PRESENTATION();