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
    return this.jsl.env.pathSep();
  }
  
  /**
   * Determines if the current path is absolute.
   * @returns {boolean} True if the current path is absolute, false otherwise.
   */
  isAbsolutePath() {
    return this.jsl.env.pathIsAbsolute();
  }
  
  /**
   * Joins all given path segments together using the platform-specific separator as a delimiter.
   * @param {...string} paths The path segments to join.
   * @returns {string} The combined path.
   */
  pathJoin(...args) {
    return this.jsl.env.pathJoin(...args);
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
   * Returns the last portion of a path, similar to the Unix `basename` command.
   * @param {string} path - The file path to process.
   * @returns {string} The last segment of the path.
   */
  pathBaseName(path) {
    return this.jsl.env.pathBaseName(path);
  }
  
  /**
   * Retrieves the file extension from the provided file path.
   * @param {string} path - The complete file path.
   * @returns {string} The file extension extracted from the path.
   */
  pathFileExt(path) {
    return this.jsl.env.pathExtName(path);
  }
  
  /**
   * Retrieves the file extension from the provided file path.
   * @param {string} path - The complete file path.
   * @returns {string} The file extension extracted from the path.
   */
  pathExtName(path) {
    return this.jsl.env.pathExtName(path);
  }
  
  /**
   * Resolves a sequence of path segments into an absolute path using the environment's path resolver.
   * @param {string} path - The path or sequence of paths to resolve.
   * @returns {string} - The resolved absolute path.
   */
  pathResolve(path) {
    return this.jsl.env.pathResolve(path);
  }
  
  /**
   * Computes the relative path from one path to another. 
   * @param {string} from - The starting path.
   * @param {string} to - The target path.
   * @returns {string} - The relative path from the `from` path to the `to` path.
   */
  pathRelative(from, to) {
    return this.jsl.env.pathRelative(from, to);
  }
  
  /**
   * Normalizes a given path, resolving '..' and '.' segments using the environment's path normalizer.
   * @param {string} path - The path to normalize.
   * @returns {string} - The normalized path.
   */
  pathNormalize(path) {
    return this.jsl.env.pathNormalize(path);
  }
  
  /**
   * Compares two file paths after resolving them to their absolute forms to check if they refer to the same location.
   * @param {string} path1 - The first file path to compare.
   * @param {string} path2 - The second file path to compare.
   * @returns {boolean} Returns true if both paths resolve to the same absolute path, otherwise false.
   */
  comparePaths(path1, path2) {
    return this.jsl.env.pathResolve(path1) === this.jsl.env.pathResolve(path2);
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
   * Generates a unique filename by appending a number to the original path if it already exists.
   * @param {string} path - The original file path.
   * @param {string} ext - The original file extension.
   * @returns {string} A unique folder path.
   */
  getUniqueFilename(filename, ext) {
    var i = 0;
    var unique_filename = filename+'.'+ext;
    while(fs.existsSync(unique_filename)) {
      i = i+1;
      unique_filename = filename+i+'.'+ext;
    }
    return unique_filename;
  }
}

exports.PRDC_JSLAB_LIB_PATH = PRDC_JSLAB_LIB_PATH;