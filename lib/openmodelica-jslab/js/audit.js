/**
 * @file Audit pinned Simulate library coverage and upstream package requirements
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const {
  execFileSync
} = require('child_process');
const {
  readMetadata
} = require('./assets');
const {
  renderAnnotation,
  collectIconTexts
} = require('./annotations');
const {
  iconTextPlaceholders
} = require('./localization');
/**
 * Class for checking the pinned library catalogs and translation coverage.
 */
class PRDC_OMJSL_AUDIT {

  /**
   * Reads the pinned repository library index for offline consistency checks.
   * @param {*} directory Owning library or review directory.
   */
  static readRepositoryLibraries(directory) {
    function git(args) {
      return execFileSync('git', ['-C', directory].concat(args), {
        encoding: 'utf8',
        env: {
          ...process.env,
          GIT_NO_LAZY_FETCH: '1'
        },
        maxBuffer: 32 * 1024 * 1024
      });
    }
    var testing = JSON.parse(git(['show', 'HEAD:libraries/index.json']));
    var installed = JSON.parse(git(['show', 'HEAD:libraries/install-index.json']));
    var libraries = {};
    Object.keys({
      ...testing.libs,
      ...installed.libs
    }).sort().forEach(function(name) {
      libraries[name] = {
        testVersions: testing.libs[name] && testing.libs[name].versions || {},
        installedVersions: installed.libs[name] && installed.libs[name].versions || {}
      };
    });
    return {
      source: {
        repository: 'https://github.com/PR-DC/OpenModelicaJSLAB',
        commit: git(['rev-parse', 'HEAD']).trim()
      },
      libraries: libraries,
      systemLibraries: testing.systemLibraries || installed.systemLibraries || {}
    };
  }

  /**
   * Checks translation coverage, schemas and drawings against the pinned library catalog.
   * @param {*} directory Owning library or review directory.
   */
  static auditLibrary(directory = path.resolve(__dirname, '..')) {
    var catalog = readMetadata('library-catalog.json', directory);
    var labels = readMetadata('class-labels.json', directory);
    var descriptions = readMetadata('description-labels.json', directory);
    var strings = readMetadata('lang.json', directory);
    var graphics = readMetadata('library-graphics.json', directory);
    var assets = readMetadata('library-assets.json', directory);
    var repository = readMetadata('repository-libraries.json', directory);
    var schemas = readMetadata('component-schema.json', directory);
    var property_labels = readMetadata('property-labels.json', directory);
    var record_schemas = readMetadata('record-schema.json', directory);
    var icon_labels = readMetadata('icon-text-labels.json', directory);
    var icon_overrides = readMetadata('icon-text-overrides.json', directory);
    var icon_texts = collectIconTexts(graphics, readMetadata('custom-icons.json', directory));
    var classes = Object.values(catalog.classes);
    var report = {
      classes: classes.length,
      concrete: 0,
      translated: 0,
      rendered: 0,
      propertyFields: 0,
      translatedPropertyFields: 0,
      missingPropertyDescriptions: [],
      libraryFolders: 0,
      translatedFolders: 0,
      packageDescriptions: 0,
      translatedPackageDescriptions: 0,
      missingPackageLabels: [],
      missingPackageDescriptions: [],
      missingPropertyTypes: [],
      abstractClasses: 0,
      translatedAbstractClasses: 0,
      abstractDescriptions: 0,
      translatedAbstractDescriptions: 0,
      missingAbstractLabels: [],
      missingAbstractDescriptions: [],
      missingAbstractGraphics: [],
      packages: {},
      missingTranslations: [],
      missingIcons: [],
      repository: repository.source,
      libraries: {},
      systemLibraries: Object.keys(repository.systemLibraries).sort()
    };
    var doc = {
      createElementNS: function() {
        return {
          ownerDocument: doc,
          setAttribute: function() {},
          appendChild: function() {}
        };
      }
    };
    function localized(id) {
      return id && strings[id] && ['en', 'rs', 'rsc'].every(function(language) {
        return typeof strings[id][language] == 'string' && strings[id][language].trim().length;
      });
    }
    function typeLocalized(type) {
      type = String(type || '').replace(/^\./, '');
      return localized(labels[type] || labels[type.split('.').pop()]);
    }
    report.iconTexts = icon_texts.size;
    report.translatedIconTexts = 0;
    report.fixedIconTexts = 0;
    report.missingIconLabels = [];
    for(const text of icon_texts.keys()) {
      if(Object.hasOwn(icon_labels, text) && icon_labels[text] === null) {
        report.fixedIconTexts++;
      } else if(localized(icon_labels[text]) && strings[icon_labels[text]].en == text && ['en', 'rs', 'rsc'].every(language => iconTextPlaceholders(strings[icon_labels[text]][language]) == iconTextPlaceholders(text))) {
        report.translatedIconTexts++;
      } else {
        report.missingIconLabels.push(text);
      }
    }
    report.translatedIconOverrides = 0;
    report.missingIconOverrides = [];
    for(const [key, id] of Object.entries(icon_overrides)) {
      var separator = key.indexOf('\u0000'),
        type = key.slice(0, separator),
        text = key.slice(separator + 1);
      if(separator < 1) {
        report.missingIconOverrides.push(key);
        continue;
      }
      if(!icon_texts.get(text)?.has(type) || id === null) {
        continue;
      }
      if(localized(id) && strings[id].en == text && ['en', 'rs', 'rsc'].every(language => iconTextPlaceholders(strings[id][language]) == iconTextPlaceholders(text))) {
        report.translatedIconOverrides++;
      } else {
        report.missingIconOverrides.push(key);
      }
    }
    classes.filter(function(item) {
      return item.restriction == 'package';
    }).forEach(function(item) {
      report.libraryFolders++;
      if(typeLocalized(item.type)) {
        report.translatedFolders++;
      } else {
        report.missingPackageLabels.push(item.type);
      }
      if(!item.description) {
        return;
      }
      report.packageDescriptions++;
      var id = descriptions[item.type];
      if(localized(id) && strings[id].en == item.description) {
        report.translatedPackageDescriptions++;
      } else {
        report.missingPackageDescriptions.push(item.type);
      }
    });
    var property_types = new Set();
    classes.filter(function(item) {
      return item.partial && ['model', 'block'].includes(item.restriction);
    }).forEach(function(item) {
      report.abstractClasses++;
      if(typeLocalized(item.type)) {
        report.translatedAbstractClasses++;
      } else {
        report.missingAbstractLabels.push(item.type);
      }
      if(!graphics[item.type]) {
        report.missingAbstractGraphics.push(item.type);
      }
      if(!item.description) {
        return;
      }
      report.abstractDescriptions++;
      var id = descriptions[item.type];
      if(localized(id) && strings[id].en == item.description) {
        report.translatedAbstractDescriptions++;
      } else {
        report.missingAbstractDescriptions.push(item.type);
      }
    });
    classes.forEach(function(item) {
      if(item.partial || !['model', 'block'].includes(item.restriction)) {
        return;
      }
      report.concrete++;
      var package_name = item.type.split('.').slice(0, 3).join('.');
      var group = report.packages[package_name] || (report.packages[package_name] = {
        concrete: 0,
        translated: 0,
        rendered: 0
      });
      group.concrete++;
      var description_id = descriptions[item.type];
      var description_ok = item.description ? localized(description_id) && strings[description_id].en == item.description : Object.hasOwn(descriptions, item.type) && description_id === null;
      var short_name = item.type.split('.').pop();
      var name_id = labels[item.type] || labels[short_name] || labels[short_name.replace(/\d+$/, '')];
      if(localized(name_id) && description_ok) {
        report.translated++;
        group.translated++;
      } else {
        report.missingTranslations.push(item.type);
      }
      var metadata = graphics[item.type];
      if(metadata && renderAnnotation(doc.createElementNS(), {
        ...metadata,
        assets: assets
      }, {
        name: 'audit',
        modifiers: []
      }, 40, 40) > 0) {
        report.rendered++;
        group.rendered++;
      } else {
        report.missingIcons.push(item.type);
      }
    });
    var property_descriptions = new Set();
    Object.values(schemas).forEach(function(schema) {
      (schema.properties || []).forEach(function(property) {
        property_types.add(property.type);
        report.propertyFields++;
        if(!property.description) {
          return;
        }
        property_descriptions.add(property.description);
        var id = property_labels[property.description];
        if(localized(id) && strings[id].en == property.description) {
          report.translatedPropertyFields++;
        }
      });
    });
    report.missingPropertyTypes = Array.from(property_types).filter(function(type) {
      return !typeLocalized(type);
    });
    report.propertyDescriptions = property_descriptions.size;
    report.missingPropertyDescriptions = Array.from(property_descriptions).filter(function(source) {
      var id = property_labels[source];
      return !localized(id) || strings[id].en != source;
    });
    report.translatedPropertyDescriptions = report.propertyDescriptions - report.missingPropertyDescriptions.length;
    var record_types = new Set(Object.values(schemas).flatMap(function(schema) {
      return schema.properties.map(property => property.type.replace(/^\./, ''));
    }));
    var record_descriptions = new Set();
    var missing_record_types = new Set();
    report.recordTypes = 0;
    report.recordFields = 0;
    report.translatedRecordFields = 0;
    for(const type of record_types) {
      var schema = record_schemas[type];
      if(!schema) {
        continue;
      }
      report.recordTypes++;
      if(!typeLocalized(type)) {
        missing_record_types.add(type);
      }
      for(const property of schema.properties) {
        record_types.add(property.type.replace(/^\./, ''));
        if(!typeLocalized(property.type)) {
          missing_record_types.add(property.type);
        }
        report.recordFields++;
        if(!property.description) {
          continue;
        }
        record_descriptions.add(property.description);
        var id = property_labels[property.description];
        if(localized(id) && strings[id].en == property.description) {
          report.translatedRecordFields++;
        }
      }
    }
    report.recordDescriptions = record_descriptions.size;
    report.missingRecordTypes = Array.from(missing_record_types);
    report.missingRecordPropertyDescriptions = Array.from(record_descriptions).filter(function(source) {
      var id = property_labels[source];
      return !localized(id) || strings[id].en != source;
    });
    report.translatedRecordDescriptions = report.recordDescriptions - report.missingRecordPropertyDescriptions.length;
    Object.entries(repository.libraries).forEach(function([name, library]) {
      var versions = {};
      Object.entries({
        ...library.testVersions,
        ...library.installedVersions
      }).forEach(function([version, definition]) {
        versions[version] = {
          standardLibrary: definition.uses && definition.uses.Modelica || null,
          dependencies: definition.uses || {},
          support: definition.support,
          nativeDependencies: [...new Set(Object.values(definition.wasm || {}).flatMap(function(target) {
            return target.systemLibraries || [];
          }))].sort(),
          shippedByUpstream: Object.hasOwn(library.installedVersions, version)
        };
      });
      report.libraries[name] = versions;
    });
    return report;
  }

  /**
   * Reports catalog coverage and fails when required library metadata is incomplete.
   */
  static runAudit() {
    var report = PRDC_OMJSL_AUDIT.auditLibrary();
    var fork_argument = process.argv.find(function(value) {
      return value.startsWith('--fork=');
    });
    if(fork_argument) {
      var expected = PRDC_OMJSL_AUDIT.readRepositoryLibraries(path.resolve(fork_argument.slice(7)));
      var actual = readMetadata('repository-libraries.json');
      if(JSON.stringify(expected.libraries) != JSON.stringify(actual.libraries) || JSON.stringify(expected.systemLibraries) != JSON.stringify(actual.systemLibraries)) {
        throw new Error('The repository library inventory is stale.');
      }
      report.upstreamIndexVerified = true;
    }
    console.log(JSON.stringify(report, null, 2));
    if(process.argv.includes('--require-complete') && (report.missingTranslations.length || report.missingIcons.length || report.missingPropertyDescriptions.length || report.missingPackageLabels.length || report.missingPackageDescriptions.length || report.missingPropertyTypes.length || report.missingRecordTypes.length || report.missingRecordPropertyDescriptions.length || report.missingIconLabels.length || report.missingIconOverrides.length || report.missingAbstractLabels.length || report.missingAbstractDescriptions.length || report.missingAbstractGraphics.length)) {
      process.exitCode = 1;
    }
  }

}
if(require.main === module) {
  PRDC_OMJSL_AUDIT.runAudit();
}
exports.auditLibrary = PRDC_OMJSL_AUDIT.auditLibrary;
exports.readRepositoryLibraries = PRDC_OMJSL_AUDIT.readRepositoryLibraries;
exports.runAudit = PRDC_OMJSL_AUDIT.runAudit;
