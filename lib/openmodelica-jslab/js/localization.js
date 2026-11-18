/**
 * @file Compiler-library labels shared by all compiler library consumers
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  readMetadata
} = require('./assets');
/**
 * Class for resolving compiler-owned labels and descriptions.
 */
class PRDC_OMJSL_LOCALIZATION {

  /**
   * Identify compiler-owned classes by catalog membership, including the library root.
   * @param {*} type Declared compiler type.
   */
  static isBundledLibraryType(type) {
    return Object.hasOwn(readMetadata('library-catalog.json').classes, String(type || '').replace(/^\./, ''));
  }

  /**
   * Read a library translation without depending on application language IDs.
   * @param {*} id Id.
   * @param {*} language Selected interface language.
   */
  static translatedLibraryText(id, language = 'en') {
    var entry = readMetadata('lang.json')[id];
    return entry ? entry[language] || entry.en : '';
  }

  /**
   * Preserve imported names; standardContext resolves medium aliases in built-in blocks.
   * @param {*} type Declared compiler type.
   * @param {*} language Selected interface language.
   * @param {*} standardContext StandardContext.
   */
  static translatedTypeLabel(type, language = 'en', standardContext = false) {
    type = String(type || '').replace(/^\./, '');
    var name = type.split('.').pop();
    if(!standardContext && !PRDC_OMJSL_LOCALIZATION.isBundledLibraryType(type) && !['Real', 'Integer', 'Boolean', 'String', 'Complex', 'StateSelect'].includes(type)) {
      return name;
    }
    var labels = readMetadata('class-labels.json');
    var id = labels[type] || labels[name];
    if(id) {
      return PRDC_OMJSL_LOCALIZATION.translatedLibraryText(id, language);
    }
    var numbered = /^(.*?)(\d+)$/.exec(name);
    if(numbered && labels[numbered[1]]) {
      return PRDC_OMJSL_LOCALIZATION.translatedLibraryText(labels[numbered[1]], language) + ' ' + numbered[2];
    }
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  /**
   * Only compiler-owned class descriptions use the built-in translation catalog.
   * @param {*} type Declared compiler type.
   * @param {*} source Original compiler source text.
   * @param {*} language Selected interface language.
   */
  static translatedClassDescription(type, source, language = 'en') {
    var id = /^\.?Modelica(?:\.|$)/.test(String(type || '')) && readMetadata('description-labels.json')[String(type).replace(/^\./, '')];
    return id ? PRDC_OMJSL_LOCALIZATION.translatedLibraryText(id, language) : source || '';
  }

  /**
   * Property help is indexed by its full source meaning.
   * @param {*} property Component property definition.
   * @param {*} language Selected interface language.
   */
  static translatedPropertyDescription(property, language = 'en') {
    return PRDC_OMJSL_LOCALIZATION.translatedLibraryText(readMetadata('property-labels.json')[property.description], language);
  }

  /**
   * Translate only reviewed labels in bundled classes; imported drawings keep their text.
   * @param {*} type Declared compiler type.
   * @param {*} source Original compiler source text.
   * @param {*} language Selected interface language.
   */
  static translatedIconText(type, source, language = 'en') {
    if(language == 'en' || !/^\.?Modelica\./.test(String(type || ''))) {
      return source;
    }
    type = String(type).replace(/^\./, '');
    if(!PRDC_OMJSL_LOCALIZATION.isBundledLibraryType(type)) {
      return source;
    }
    var labels = readMetadata('icon-text-labels.json');
    var id = Object.hasOwn(labels, source) ? labels[source] : null;
    var overrides = readMetadata('icon-text-overrides.json');
    var key = type + '\u0000' + source;
    if(Object.hasOwn(overrides, key)) {
      id = overrides[key];
    }
    return id ? PRDC_OMJSL_LOCALIZATION.translatedLibraryText(id, language) : source;
  }

  /**
   * Extracts icon substitutions so translated labels preserve their variable references.
   * @param {*} source Original compiler source text.
   */
  static iconTextPlaceholders(source) {
    return (String(source).match(/%[A-Za-z_]\w*/g) || []).sort().join('\u0000');
  }

}
exports.translatedLibraryText = PRDC_OMJSL_LOCALIZATION.translatedLibraryText;
exports.isBundledLibraryType = PRDC_OMJSL_LOCALIZATION.isBundledLibraryType;
exports.translatedTypeLabel = PRDC_OMJSL_LOCALIZATION.translatedTypeLabel;
exports.translatedClassDescription = PRDC_OMJSL_LOCALIZATION.translatedClassDescription;
exports.translatedPropertyDescription = PRDC_OMJSL_LOCALIZATION.translatedPropertyDescription;
exports.translatedIconText = PRDC_OMJSL_LOCALIZATION.translatedIconText;
exports.iconTextPlaceholders = PRDC_OMJSL_LOCALIZATION.iconTextPlaceholders;
