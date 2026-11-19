/**
 * @file JSLAB LaTeX Editor PDF preview
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Renders the active PDF page and translates SyncTeX positions.
 */
class PRDC_JSLAB_LATEX_EDITOR_PREVIEW {

  /**
   * Initializes the PDF viewport and navigation state.
   * @param {HTMLElement} container Preview scroll container.
   * @param {Object} pdfjs PDF.js rendering services.
   * @param {Function} on_reverse Callback for reverse synchronization.
   */
  constructor(container, pdfjs, on_reverse) {
    this.container = container;
    this.pdfjs = pdfjs;
    this.on_reverse = on_reverse;
    this.number = 1;
    this.zoom = 1;
    this.fit = true;
    this.rotation = 0;
    this.generation = 0;
    this.load_generation = 0;
  }

  /**
   * Returns the number of pages in the loaded document.
   * @returns {number} Page count.
   */
  get count() {
    return this.document?.numPages || 0;
  }

  /**
   * Checks whether the fitted page needs to be rendered at a new width.
   * @returns {boolean} Whether the preview width changed.
   */
  get needsFit() {
    return this.fit && this.count && this.page_view?.width !== this.container.clientWidth;
  }

  /**
   * Opens a PDF and restores the current page when possible.
   * @param {Uint8Array} data PDF file bytes.
   */
  async load(data) {
    const generation = ++this.load_generation;
    const loading = this.pdfjs.getDocument({
      data, isEvalSupported: false,
      cMapUrl: new URL('../node_modules/pdfjs-dist/cmaps/', location.href).href,
      cMapPacked: true,
      standardFontDataUrl: new URL('../node_modules/pdfjs-dist/standard_fonts/', location.href).href
    });
    let loaded;
    try {
      loaded = await loading.promise;
    } catch(error) {
      await loading.destroy();
      throw error;
    }
    if(generation !== this.load_generation) {
      await loaded.destroy();
      return;
    }
    const previous = this.document;
    this.document = loaded;
    this.point = null;
    await this.render(Math.min(this.number, this.count), true);
    if(previous) await previous.destroy();
  }

  /**
   * Releases the loaded PDF and resets the viewport.
   */
  async clear() {
    this.load_generation++;
    this.generation++;
    this.stopRender();
    const previous = this.document;
    this.document = null;
    this.container.querySelector('.latex-page')?.remove();
    this.number = 1;
    this.point = null;
    this.page_view = null;
    if(previous) await previous.destroy();
  }

  /**
   * Cancels pending canvas and text-layer rendering.
   */
  stopRender() {
    this.paint?.cancel();
    this.text?.cancel();
  }

  /**
   * Draws a page and its selectable text layer.
   * @param {number} number One-based PDF page.
   * @param {boolean} preserve Retain the current scroll offset.
   * @param {Object|null} hit Optional SyncTeX location to highlight.
   */
  async render(number = this.number, preserve = false, hit = null) {
    if(!this.count || !Number.isInteger(number) || number < 1 || number > this.count) return;
    const generation = ++this.generation;
    this.stopRender();
    const same_page = number === this.number;
    const left = this.container.scrollLeft;
    const top = this.container.scrollTop;
    const page = await this.document.getPage(number);
    if(generation !== this.generation) return;
    const rotation = (page.rotate + this.rotation) % 360;
    const natural = page.getViewport({ scale: 1, rotation });
    const width = this.container.clientWidth;
    const scale = this.fit ? Math.max(0.1, (width - 28) / natural.width) : this.zoom;
    const viewport = page.getViewport({ scale, rotation });
    const base = page.getViewport({ scale: 1, rotation: 0 });
    const frame = document.createElement('div');
    frame.className = 'latex-page';
    frame.style.setProperty('--scale-factor', scale * page.userUnit);
    const canvas = document.createElement('canvas');
    const pixel_ratio = Math.min(window.devicePixelRatio || 1, 4096 / Math.max(viewport.width, viewport.height));
    canvas.width = Math.ceil(viewport.width * pixel_ratio);
    canvas.height = Math.ceil(viewport.height * pixel_ratio);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    const layer = document.createElement('div');
    layer.className = 'textLayer';
    frame.append(canvas, layer);
    this.paint = page.render({
      canvasContext: canvas.getContext('2d'), viewport,
      transform: [pixel_ratio, 0, 0, pixel_ratio, 0, 0]
    });
    this.text = new this.pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport });
    try {
      await Promise.all([this.paint.promise, this.text.render()]);
    } catch(error) {
      if(generation !== this.generation) return;
      throw error;
    }
    if(generation !== this.generation) return;
    this.container.querySelector('.latex-page')?.remove();
    this.container.append(frame);
    this.number = number;
    if(!same_page) this.point = null;
    this.page_view = { frame, base, viewport, width };
    const pick = event => {
      this.point = this.positionAt(event.clientX, event.clientY);
    };
    if(this.on_reverse) {
      frame.addEventListener('pointerdown', pick);
      frame.addEventListener('dblclick', event => {
        pick(event);
        this.on_reverse();
      });
    }
    this.container.scrollTo(preserve ? left : 0, preserve ? top : 0);
    if(hit) this.highlight(hit);
  }

  /**
   * Converts a viewport point to unrotated top-left PDF coordinates.
   * @param {number} x Horizontal CSS-pixel coordinate.
   * @param {number} y Vertical CSS-pixel coordinate.
   * @returns {number[]} SyncTeX coordinates in PDF points.
   */
  toSyncTeX(x, y) {
    const { viewport, base } = this.page_view;
    return base.convertToViewportPoint(...viewport.convertToPdfPoint(x, y));
  }

  /**
   * Returns SyncTeX coordinates for a pointer in the preview.
   * @param {number} client_x Horizontal viewport coordinate.
   * @param {number} client_y Vertical viewport coordinate.
   * @returns {number[]|null} PDF position.
   */
  positionAt(client_x, client_y) {
    if(!this.page_view) return null;
    const bounds = this.page_view.frame.getBoundingClientRect();
    return this.toSyncTeX(client_x - bounds.left, client_y - bounds.top);
  }

  /**
   * Returns the selected PDF position or the location of the last forward jump.
   * @returns {number[]|null} SyncTeX coordinates.
   */
  get position() {
    return this.point ?? null;
  }

  /**
   * Highlights a SyncTeX result in the rendered page.
   * @param {Object} hit SyncTeX coordinates and bounding box.
   */
  highlight(hit) {
    const { frame, base, viewport } = this.page_view;
    const { x, y, h, v, width, height } = hit;
    this.point = [x, y];
    const to_page = (x, y) => viewport.convertToViewportPoint(...base.convertToPdfPoint(x, y));
    const box = [h, v, width, height].every(Number.isFinite) && width > 0 && height > 0;
    const first = box ? to_page(h, v - height) : to_page(x - 5, y - 5);
    const last = box ? to_page(h + width, v) : to_page(x + 5, y + 5);
    const marker = document.createElement('div');
    marker.className = 'latex-pdf-hit';
    const [left, top] = first.map((value, i) => Math.min(value, last[i]));
    const [w, h_px] = first.map((value, i) => Math.max(5, Math.abs(value - last[i])));
    Object.assign(marker.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h_px + 'px' });
    frame.append(marker);
    marker.scrollIntoView({ block: 'center', inline: 'nearest' });
  }
}

exports.PRDC_JSLAB_LATEX_EDITOR_PREVIEW = PRDC_JSLAB_LATEX_EDITOR_PREVIEW;
