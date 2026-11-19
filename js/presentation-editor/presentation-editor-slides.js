/**
 * @file JSLAB Presentation Editor slide source operations
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Edits slide blocks independently of the preview transport.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES {

  /**
   * Finds each slide and its source range in document order.
   * @param {string} source Presentation HTML.
   * @returns {Object[]} Slide source ranges and content.
   */
  static collect(source) {
    return Array.from(String(source || '').matchAll(/<\s*slide\b[^>]*>([\s\S]*?)<\/\s*slide\s*>/gi),
      (match, index) => ({ index, start: match.index, end: match.index + match[0].length, full: match[0], inner: match[1] }));
  }

  /**
   * Finds the slide containing a cursor offset in the source.
   * @param {Object[]} slides Slide source ranges in document order.
   * @param {number} offset Cursor offset in the source.
   * @returns {number} Slide index, or -1 outside the slides.
   */
  static indexAtOffset(slides, offset) {
    return slides.findIndex(slide => offset >= slide.start && offset < slide.end);
  }

  /**
   * Inserts a block after the supplied slide.
   * @param {string[]} blocks Slide markup in document order.
   * @param {number} index Index of the preceding slide.
   * @param {string} block Slide markup to insert.
   * @returns {number} New slide index.
   */
  static insert(blocks, index, block) {
    const target = Math.max(0, Math.min(index + 1, blocks.length));
    blocks.splice(target, 0, block);
    return target;
  }

  /**
   * Duplicates an existing block.
   * @param {string[]} blocks Slide markup in document order.
   * @param {number} index Slide to duplicate.
   * @returns {number|null} New slide index, or null for an invalid index.
   */
  static duplicate(blocks, index) {
    if(index < 0 || index >= blocks.length) return null;
    return this.insert(blocks, index, blocks[index]);
  }

  /**
   * Deletes one slide and replaces the final slide with an empty slide.
   * @param {string[]} blocks Slide markup in document order.
   * @param {number} index Slide to remove.
   * @param {Function} blank Creates the replacement markup if the project has one slide.
   * @returns {boolean} Whether a slide changed.
   */
  static remove(blocks, index, blank) {
    if(index < 0 || index >= blocks.length) return false;
    if(blocks.length === 1) blocks.splice(index, 1, blank());
    else blocks.splice(index, 1);
    return true;
  }

  /**
   * Moves a slide to its final index.
   * @param {string[]} blocks Slide markup in document order.
   * @param {number} from Current index.
   * @param {number} to Final index.
   * @returns {boolean} Whether a slide moved.
   */
  static move(blocks, from, to) {
    if(from === to || from < 0 || from >= blocks.length || to < 0 || to >= blocks.length) return false;
    const [block] = blocks.splice(from, 1);
    blocks.splice(to, 0, block);
    return true;
  }

  /**
   * Saves the three presentation source tabs through their adapters.
   * @param {Object} editor Editor owning the HTML, JavaScript and CSS tabs.
   * @returns {Array} Save results in source order.
   */
  static save(editor) {
    return [editor.html_editor, editor.js_editor, editor.css_editor].map(tab => tab.save());
  }
}

exports.PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES = PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES;
