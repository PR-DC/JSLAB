/**
 * @file JSLAB library path submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB path submodule.
 */
class PRDC_JSLAB_LIB_PATH {
  
  /**
   * Initializes a new instance of the path submodule, providing access to path manipulation utilities.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }
  
  /**
   * Generates a unique filesystem path by appending a number to the input path if the original path exists.
   * @param {String} path The base path for which a unique version is required.
   * @returns {String} A unique filesystem path based on the input path.
   */
  getUniquePath(path) {
    var i = 0;
    var unique_path = path;
    while(fs.existsSync(unique_path)) {
      i = i+1;
      unique_path = path+i;
    }
    return unique_path;
  }

  /**
   * Extracts the directory of file.
   * @param {String} path The filesystem path from which to extract the directory.
   * @returns {String} The directory from the given path.
   */
  getDir(path) {
    return this.jsl.env.pathDirName(path);
  }
  
  /**
   * Extracts the name of the directory from a given filesystem path.
   * @param {String} path The filesystem path from which to extract the directory name.
   * @returns {String} The name of the directory from the given path.
   */
  getDirName(path) {
    return path.replaceAll('\\','/').match(/([^\/]*)\/*$/)[1];
  }
  
  /**
   * Retrieves the platform-specific path separator character.
   * @returns {String} The path separator character used by the system.
   */
  pathSep() {
    return this.jsl.env.getPathSep();
  }

  /**
   * Retrieves the file name from the provided file path.
   * @param {string} path - The complete file path.
   * @returns {string} The file name extracted from the path.
   */
  pathFileName(path) {
    return this.jsl.env.pathFileName(path);
  }

  /**
   * Retrieves the file extension from the provided file path.
   * @param {string} path - The complete file path.
   * @returns {string} The file extension extracted from the path.
   */
  pathFileExt(path) {
    return this.jsl.env.pathFileExt(path);
  }
}

exports.PRDC_JSLAB_LIB_PATH = PRDC_JSLAB_LIB_PATH;