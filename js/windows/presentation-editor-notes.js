/**
 * @file Portable speaker note editing for the Presentation Editor
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TEXT } = require('../other-shared/text');

/**
 * Edits and sanitizes speaker notes for presentation controllers.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR_NOTES {

  /**
   * Decodes notes HTML to plain editable text.
   * @param {String} notes_html
   * @returns {String}
   */
  decodeSlideNotesHtml(notes_html) {
    var template = document.createElement('template');
    template.innerHTML = String(notes_html || '');
    return template.content.textContent || '';
  }

  /**
   * Removes executable content from notes before showing them in the editor UI.
   * @param {String} notes_html
   * @returns {String}
   */
  sanitizeSlideNotesHtml(notes_html) {
    var doc = document.implementation.createHTMLDocument('');
    var template = doc.createElement('template');
    var container = doc.createElement('div');
    template.innerHTML = String(notes_html || '');
    container.appendChild(template.content.cloneNode(true));
    doc.body.appendChild(container);
    doc.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach(function(node) {
      node.remove();
    });
    doc.querySelectorAll('*').forEach(function(node) {
      Array.from(node.attributes).forEach(function(attr) {
        var name = attr.name.toLowerCase();
        var value = String(attr.value || '').trim();
        if(name.indexOf('on') == 0 || name == 'srcdoc' || /^javascript:/i.test(value)) {
          node.removeAttribute(attr.name);
        }
      });
    });
    return container.innerHTML;
  }

  /**
   * Escapes textarea text before storing it inside <notes>.
   * @param {String} notes_text
   * @returns {String}
   */
  escapeSlideNotesText(notes_text) {
    return PRDC_JSLAB_TEXT.escapeHTML(String(notes_text || ''), 'text');
  }

  /**
   * Updates or creates the <notes> element inside one slide block.
   * @param {String} block
   * @param {String} notes_text
   * @param {String} eol
   * @returns {String}
   */
  setSlideBlockNotesText(block, notes_text, eol) {
    var notes_html = this.escapeSlideNotesText(notes_text)
      .replace(/\r\n|\r|\n/g, eol);
    var notes_re = /(<\s*notes\b[^>]*>)([\s\S]*?)(<\/\s*notes\s*>)/i;
    if(notes_re.test(block)) {
      return block.replace(notes_re, '$1' + notes_html + '$3');
    }
    var close_match = /<\/\s*slide\s*>/i.exec(block);
    if(!close_match) {
      return block;
    }
    var before = block.slice(0, close_match.index);
    if(!/(\r\n|\r|\n)$/.test(before)) {
      before += eol;
    }
    return before + '  <notes>' + notes_html + '</notes>' + eol +
      block.slice(close_match.index);
  }

  /**
   * Handles notes textarea input for the active slide.
   */
  updateSlideNotesFromInput() {
    if(!this.slide_notes_body) {
      return;
    }
    this.setSlideNotesText(this.current_slide, this.slide_notes_body.value);
  }
}

exports.PRDC_JSLAB_PRESENTATION_EDITOR_NOTES = PRDC_JSLAB_PRESENTATION_EDITOR_NOTES;
