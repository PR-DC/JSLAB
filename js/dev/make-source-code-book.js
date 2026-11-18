/**
 * @file Generate source code book for JSLAB
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */

const { compilePdf } = require('./documentation');

const { PRDC_JSLAB_TEXT } = require('../other-shared/text');

/**
 * Class for dev make source code book operations.
 */
class PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER {

  // Helper function for excluding
  /**
   * Checks whether excluded.
   * @param {*} absolutePath Absolute path.
   */
  static isExcluded(absolutePath) {
    if(SOURCE_CODE_BOOK_FILES_EXCLUDE.includes(absolutePath)) {
      return true;
    }
    return SOURCE_CODE_BOOK_FILES_EXCLUDE.some(dir => absolutePath.startsWith(dir + path.sep));
  }


  /**
   * Recursively traverses directories and reads file contents.
   * @param {string[]} pathsList - List of file or folder paths to process.
   * @returns {Promise<Object>} - An object representing the directory structure with file details.
   */
  static async buildFileStructure(pathsList) {
    const result = {root: {}};

    for(const itemPath of pathsList) {
      const absolutePath = path.resolve(itemPath);
      if(PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.isExcluded(absolutePath)) {
        continue;
      }

      const stats = await fs.promises.lstat(absolutePath);

      if(stats.isDirectory()) {
        // Recursively process the directory
        result[path.basename(absolutePath)] = await PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.traverseDirectory(absolutePath);
      } else if(stats.isFile()) {
        result['root'][path.basename(absolutePath)] = await fs.promises.readFile(absolutePath, 'utf-8');
      }
    }

    return result;
  }

  /**
   * Helper function to traverse a directory recursively.
   * @param {string} dirPath - The directory path to traverse.
   * @returns {Promise<Object>} - An object representing the directory structure.
   */
  static async traverseDirectory(dirPath) {
    if(PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.isExcluded(dirPath)) {
      return {};
    }

    const dirContents = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const dirObject = {};

    // Separate files and directories
    const files = dirContents.filter(dirent => dirent.isFile());
    const directories = dirContents.filter(dirent => dirent.isDirectory());

    // Process files first
    for(const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if(PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.isExcluded(fullPath)) {
        continue;
      }
      dirObject[file.name] = await fs.promises.readFile(fullPath, 'utf-8');
    }

    // Then process directories
    for(const directory of directories) {
      const fullPath = path.join(dirPath, directory.name);
      if(PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.isExcluded(fullPath)) {
        continue;
      }
      dirObject[directory.name] = await PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.traverseDirectory(fullPath);
    }

    return dirObject;
  }

  /**
   * Determines the programming language based on the file extension.
   * @param {string} filename - The name of the file (e.g., "main.cpp").
   * @returns {string|null} - The corresponding language name or null if unknown.
   */
  static getLanguage(filename) {
    const extensionMatch = filename.match(/\.([^.]+)$/);
    if(!extensionMatch) {
      return null;
    }

    const extension = extensionMatch[1].toLowerCase();

    // Mapping of extensions to languages
    const extensionToLanguageMap = {
      'cpp': 'C++',
      'h': 'C++',
      'js': 'JavaScript',
      'json': 'JavaScript',
      'gyp': 'JavaScript',
      'css': 'CSS',
      'html': 'HTML'
    };

    return extensionToLanguageMap[extension] || null;
  }

  /**
   * Recursively traverses an object and performs actions based on the type of each property.
   * @param {Object} obj - The object to traverse.
   * @param {Function} callback - A function to execute on each property.
   * @param {number} [level=0] - The current recursion level (used internally).
   */
  static traverseObject(obj, level = 0) {
    for(const key in obj) {
      if(obj.hasOwnProperty(key)) {
        if(typeof obj[key] === 'object' && obj[key] !== null) {
          latex += '\n% ' + '----------'.repeat(4 - level) + '\n' + levels[level] + '{' + PRDC_JSLAB_TEXT.escapeLatex(key) + '}\n\n';
          PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.traverseObject(obj[key], level + 1);
        } else {
          latex += `
  \\begin{lstlisting}[style=${PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.getLanguage(key)}Style, caption={${PRDC_JSLAB_TEXT.escapeLatex(key)}}]
  ${obj[key]}
  \\end{lstlisting}
  `;
        }
      }
    }
  }
}


const fs = require('fs');
const path = require('path');
const cp = require("child_process");
const rimraf = require('rimraf');

require('../other-shared/init-config.js');

console.log('[make-source-code-book.js] Started');
var t = performance.now();

var package_data = JSON.parse(fs.readFileSync('package.json'));
var app_version = package_data.version;
var year = new Date().getFullYear();

var levels = ['\\section', '\\subsection', '\\subsubsection'];
var latex = '';

var SOURCE_CODE_BOOK_FILES_EXCLUDE = config.SOURCE_CODE_BOOK_FILES_EXCLUDE.map(p => path.resolve(p));


(async function main() {
  // Make tex
  console.log(' Making source-code-book.tex');
  var latex_template = fs.readFileSync('dev/source_code_template.tex', 'utf8');
  latex_template = latex_template.replaceAll('$JSLAB_APP_VERSION$', 'v' + app_version + '');
  latex_template = latex_template.replaceAll('$JSLAB_PUBLISH_YEAR$', year);

  var app_path = __dirname + '/../../';
  var fileStructure = await PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.buildFileStructure(config.SOURCE_CODE_BOOK_FILES);
  PRDC_JSLAB_DEV_MAKE_SOURCE_CODE_BOOK_HELPER.traverseObject(fileStructure);
  latex_template = latex_template.replaceAll('$JSLAB_SOURCE_CODE_DATA$', latex);
  fs.writeFileSync('docs/source-code-book.tex', latex_template);

  // Make pdf
  console.log(' Making source-code-book.pdf');

  var dir = __dirname + '/../../dev/latex/';
  var file = dir + 'source-code-book.tex';
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync('docs/source-code-book.tex', file);

  compilePdf(dir, 'source-code-book', config.SOURCE_CODE_BOOK_LATEX_RERUNS_NUMBER);
  rimraf.sync(dir);

  console.log('[make-source-code-book.js] ' + ((performance.now() - t) / 1000).toFixed(3) + ' s');
})();
