/**
 * @file JSLAB library file system submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB file system submodule.
 */
class PRDC_JSLAB_LIB_FILE_SYSTEM {
  
  /**
   * Initializes a new instance of the file system submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }

  /**
   * Reads the content of a file at the specified path.
   * @param {string} file_path Path to the file.
   * @returns {(Buffer|string|false)} The content of the file or false in case of an error.
   */
  readFile(...args) {
    return this.jsl.env.readFileSync(...args);
  }

  /**
   * Extract substring from file using range
   * @param {string} filepath - Path to file
   * @param {Array} range - Character range [start, end]
   * @returns {string} - Extracted substring
   */
  getContentFromCharRange(filepath, range) {
    const fileContent = this.readFile(filepath, "utf8");
    const [start, end] = range;
    return fileContent.slice(start, end);
  }

  /**
   * Writes data to a specified file synchronously. This method should overwrite the file if it already exists.
   * @param {string} file_path The path to the file where data will be written.
   * @param {Buffer|string} data The data to write to the file.
   * @returns {boolean} Returns true if the file was written successfully, false if an error occurred.
   */
  writeFile(...args) {
    return this.jsl.env.writeFileSync(...args);
  }
  
  /**
   * Deletes a specified file synchronously.
   * @param {string} file_path The path to the file that should be deleted.
   * @returns {boolean} Returns true if the file was deleted successfully, false if an error occurred.
   */
  deleteFile(file_path) {
    return this.jsl.env.rmSync(file_path);
  }
  
  /**
   * Reads the contents of a directory synchronously.
   * @param {string} folder The path to the directory.
   * @returns {string[]|false} An array of filenames or false in case of an error.
   */
	readDir(...args) {
    return this.jsl.env.readDir(...args);
  }
  
  /**
   * Deletes a specified file synchronously.
   * @param {string} file_path The path to the file that should be deleted.
   * @returns {boolean} Returns true if the file was deleted successfully, false if an error occurred.
   */
  deleteDir(file_path) {
    return this.jsl.env.rmSync(file_path);
  }

  /**
   * Moves a file from source to destination.
   * @param {string} source - The path to the source file.
   * @param {string} destination - The path to the destination file.
   */
  moveFile(source, destination) {
    if(comparePaths(source, destination)) {
      return true;
    }
    try {
      this.jsl.env.copyFileSync(source, destination);
      this.jsl.env.rmSync(source);
      return true;
    } catch(err) {
      this.jsl.error('@moveFile: ' + err);
    }
  }

  /**
   * Copies a file from source to destination.
   * @param {string} source - The path to the source file.
   * @param {string} destination - The path to the destination file.
   */
  copyFile(source, destination) {
    if(comparePaths(source, destination)) {
      return true;
    }
    try {
      this.jsl.env.copyFileSync(source, destination);
      return true;
    } catch(err) {
      this.jsl.error('@copyFile: ' + err);
    }
  }

  /**
   * Lists files in a specified folder, optionally filtering by extension.
   * @param {string} folder Path to the folder.
   * @param {string} ext File extension filter.
   * @returns {string[]|void} Array of file paths matching the extension in the specified folder.
   */
  filesInFolder(folder, ext) {
    var obj = this;
    var files = this.jsl.env.readDir(folder);
    if(Array.isArray(files)) {
      return files
        .filter(function(file) { 
          if(!ext) return file.includes('.');
          return file.endsWith('.' + ext);
        })
        .map(function(file) { return obj.jsl.env.pathJoin(folder, file); });
    } else {
      this.jsl.env.error('@filesInFolder: '+language.string(128)+': ' + folder);
    }
    return false;
  }

  /**
   * Lists all files in a specified folder
   * @param {string} folder Path to the folder.
   * @returns {string[]|void} Array of file names.
   */
  allFilesInFolder(folder) {
    return this.jsl.env.readDir(folder).reduce((acc, file) => {
        const file_path = this.jsl.env.pathJoin(folder, file);
        return this.jsl.env.checkDirectory(file_path)
          ? acc.concat(this.allFilesInFolder(file_path))
          : acc.concat(file);
      }, []);
  }
  
  /**
   * Opens a dialog for the user to choose a file, synchronously.
   * @param {Object} options Configuration options for the dialog.
   * @returns {string|string[]} The selected file path(s) or an empty array if canceled.
   */
  chooseFile(options) {
    var file_path = this.jsl.env.showOpenDialogSync(options);
    if(file_path === undefined) {
      this.jsl.env.error('@chooseFile: '+language.string(126));
      return [];
    }
    return file_path;
  }
  
  /**
   * Opens a dialog for the user to choose a folder, synchronously.
   * @param {Object} options Configuration options for the dialog.
   * @returns {string|string[]} The selected folder path(s) or an empty array if canceled.
   */
  chooseFolder(options_in) {
    var options = {
      properties: ['openDirectory'],
      ...options_in
    };
    var file_path = this.jsl.env.showOpenDialogSync(options);
    if(file_path === undefined) {
      this.jsl.env.error('@chooseFolder: '+language.string(126));
      return [];
    }
    return file_path;
  }
  
  /**
   * Retrieves a default path based on a specified type.
   * @param {string} type Type of the default path (e.g., 'root', 'documents').
   * @returns {string} The default path for the specified type.
   */
  getDefaultPath(type) {
    return this.jsl.env.getDefaultPath(type);
  }

  /**
   * Opens the specified folder in the system's file manager.
   * @param {string} filepath Path to the folder.
   */
  openFolder(filepath) {
    this.jsl.env.openFolder(filepath);
  }

  /**
   * Creates a directory at the specified path if it does not already exist.
   * This method delegates the directory creation task to the environment's makeDirectory function.
   * @param {string} directory - The path where the directory will be created.
   * @returns {boolean} True if the directory was successfully created or already exists, false if an error occurred.
   */
  makeDirectory(directory) {
    return this.jsl.env.makeDirectory(directory);
  }
  
  /**
   * Alias for makeDirectory. Creates a directory at the specified path if it does not already exist.
   * This method delegates the directory creation task to the environment's makeDirectory function.
   * @param {string} directory - The path where the directory will be created.
   * @returns {boolean} True if the directory was successfully created or already exists, false if an error occurred.
   */
  mkdir(directory) {
    return this.jsl.env.makeDirectory(directory);
  }
  
  /**
   * Opens the specified directory in the system's file manager. Alias for `openFolder`.
   * @param {string} filepath Path to the directory.
   */
  openDir(filepath) {
    this.jsl.env.openDir(filepath);
  }

  /**
   * Shows the specified folder in the system's file manager. Alias for `openFolder`.
   * @param {string} filepath Path to the folder.
   */
  showFolder(filepath) {
    this.jsl.env.openFolder(filepath);
  }

  /**
   * Shows the specified directory in the system's file manager. Alias for `openDir`.
   * @param {string} filepath Path to the directory.
   */
  showDir(filepath) {
    this.jsl.env.openDir(filepath);
  }

  /**
   * Opens the program's root folder in the system's file manager.
   */
  openProgramFolder() {
    this.jsl.env.openFolder(this.jsl.env.getDefaultPath('root'));
  }
 
  /**
   * Shows the specified file in its containing folder within the system's file manager.
   * @param {string} filepath Path to the file.
   */
  showFileInFolder(filepath) {
    this.jsl.env.showFileInFolder(filepath);
  }

  /**
   * Shows the specified file in its containing directory within the system's file manager. Alias for `showFileInFolder`.
   * @param {string} filepath Path to the file.
   */
  showFileInDir(filepath) {
    this.jsl.env.showFileInDir(filepath);
  }
  
  /**
   * Reads a CSV file and returns a promise that resolves with the parsed data.
   * @param {string} filePath - Path to the CSV file.
   * @param {string} delimiter - Delimiter used in the CSV file (e.g., ',', ';', '\t').
   * @returns {Array<Object>} - Parsed CSV data as an array of objects.
   */
  readcsv(filePath, delimiter = ',', hasHeader = false) {
    var data = this.jsl.env.readFileSync(filePath, 'utf-8');
    var lines = data.split('\n').filter(function(line) { return line.trim() !== ''; });
    var headers = lines[0].split(delimiter).map(function(header) { return header.trim(); });
    var result = [];
    
    if(hasHeader) {
      // If there is a header, parse as objects
      var headers = lines[0].split(delimiter).map(header => header.trim());
      for(let i = 1; i < lines.length; i++) {
        var row = lines[i].split(delimiter).map(function(cell) { return cell.trim(); });
        var row_object = {};
        headers.forEach(function(header, index) {
          row_object[header] = row[index];
        });
        result.push(row_object);
      }
    } else {
      // If no header, parse as arrays
      for(let i = 0; i < lines.length; i++) {
        var row = lines[i].split(delimiter).map(function(cell) { return cell.trim(); });
        result.push(row);
      }
    }
    
    return result;
  } 
  
  /**
   * Checks if the specified file exists.
   * @param {string} file - The path to the file to check.
   */
  checkFile(file) {
    return this.jsl.env.checkFile(file);
  }
  
  /**
   * Checks if the specified file exists.
   * @param {string} file - The path to the file to check.
   */
  existFile(file) {
    return this.checkFile(file);
  }
  
  /**
   * Checks if the specified directory exists.
   * @param {string} directory - The path to the directory to check.
   */
  checkDirectory(directory) {
    return this.jsl.env.checkDirectory(directory);
  }
  
  /**
   * Checks if the specified directory exists.
   * @param {string} directory - The path to the directory to check.
   */
  existDirectory(directory) {
    return this.checkDirectory(directory);
  }
  
  /**
   * Recursively copies a directory from the source path to the destination path.
   * @param {string} src - The source directory path.
   * @param {string} dest - The destination directory path.
   */
  copyDir(src, dest) {
    // Check if the source directory exists
    if(!this.jsl.env.checkDirectory(src)) {
      this.jsl.env.error('@copyDir: '+language.string(173));
    }

    // Create the destination directory if it doesn't exist
    this.jsl.env.makeDirectory(dest);

    // Read all the files and directories in the source directory
    const entries = this.jsl.env.readDir(src, { withFileTypes: true });

    // Iterate through each entry (file or directory)
    for(const entry of entries) {
      const src_path = this.jsl.env.pathJoin(src, entry.name);
      const dest_path = this.jsl.env.pathJoin(dest, entry.name);

      if(entry.isDirectory()) {
        // Recursively copy directories
        this.copyDir(src_path, dest_path);
      } else {
        // Copy files
        this.jsl.env.copyFileSync(src_path, dest_path);
      }
    }
  }
  
  /**
   * Copies a folder from the source path to the destination path.
   * @param {string} src - The source folder path.
   * @param {string} dest - The destination folder path.
   */
  copyFolder(src, dest) {
    return this.copyDir(src, dest);
  }

  /**
   * Copies a directory from the source path to the destination path.
   * @param {string} src - The source directory path.
   * @param {string} dest - The destination directory path.
   */
  cp(src, dest) {
    return this.copyDir(src, dest);
  }

  /**
   * Copies a 7z archive from the source path to the destination path, extracts it, and removes the archive.
   * @param {string} src - The source 7z archive path.
   * @param {string} dest - The destination directory path.
   */
  copyDir7z(src, dest) {
    var name = this.jsl.path.pathFileName(src);
    var ext = this.jsl.path.pathExtName(src);
    var filePath = this.jsl.env.pathJoin(dest, name + ext);
    
    this.jsl.env.copyFileSync(src, filePath);
    this.jsl.env.execSync(`${this.jsl.env.bin7zip } x "${filePath}" -o"${dest}" -y`);
    this.jsl.env.rmSync(filePath);
  }
}

exports.PRDC_JSLAB_LIB_FILE_SYSTEM = PRDC_JSLAB_LIB_FILE_SYSTEM;