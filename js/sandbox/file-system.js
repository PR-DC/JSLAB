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
   * Deletes a specified file synchronously.
   * @param {string} file_path The path to the file that should be deleted.
   * @returns {boolean} Returns true if the file was deleted successfully, false if an error occurred.
   */
  deleteDir(file_path) {
    return this.jsl.env.rmSync(file_path);
  }
  
  /**
   * Lists files in a specified folder, optionally filtering by extension.
   * @param {string} folder Path to the folder.
   * @param {string} ext File extension filter.
   * @returns {string[]|void} Array of file paths matching the extension in the specified folder.
   */
  filesInFolder(folder, ext) {
    var obj = this;
    var files = this.jsl.env.readdirSync(folder);
    if(Array.isArray(files)) {
      return files.filter(function(file) { return file.match(new RegExp('\.' + ext + '$')) }).map(function(i) { return folder + obj.jsl.env.getPathSep() + i; });
    } else {
      this.jsl.env.error('@filesInFolder: '+language.string(128)+': ' + folder);
    }
  }

  /**
   * Opens a dialog for the user to choose a file, synchronously.
   * @param {Object} options Configuration options for the dialog.
   * @returns {string|string[]} The selected file path(s) or an empty array if canceled.
   */
  chooseFile(options) {
    var file_path = this.jsl.env.showOpenDialogSync(options);
    if(file_path === undefined) {
      this.jsl.env.error('@chooseFileSync: '+language.string(126));
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
    const data = this.jsl.env.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n').filter(function(line) { return line.trim() !== ''; });
    const headers = lines[0].split(delimiter).map(function(header) { return header.trim(); });
    const result = [];
    
    if(hasHeader) {
      // If there is a header, parse as objects
      const headers = lines[0].split(delimiter).map(header => header.trim());
      for(let i = 1; i < lines.length; i++) {
        const row = lines[i].split(delimiter).map(function(cell) { return cell.trim(); });
        const row_object = {};
        headers.forEach(function(header, index) {
          row_object[header] = row[index];
        });
        result.push(row_object);
      }
    } else {
      // If no header, parse as arrays
      for(let i = 0; i < lines.length; i++) {
        const row = lines[i].split(delimiter).map(function(cell) { return cell.trim(); });
        result.push(row);
      }
    }
    
    return result;
  } 
  
  /**
   * Checks if the specified directory exists.
   * @param {string} directory - The path to the directory to check.
   */
  checkDirectory(directory) {
    this.jsl.env.checkDirectory(directory);
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
    const entries = this.jsl.env.readdirSync(src, { withFileTypes: true });

    // Iterate through each entry (file or directory)
    for(const entry of entries) {
      const src_path = this.jsl.env.joinPath(src, entry.name);
      const dest_path = this.jsl.env.joinPath(dest, entry.name);

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
    var ext = this.jsl.path.pathFileExt(src);
    var filePath = this.jsl.env.joinPath(dest, name + ext);
    
    this.jsl.env.copyFileSync(src, filePath);
    this.jsl.env.execSync(`${this.jsl.env.bin7zip } x "${filePath}" -o"${dest}" -y`);
    this.jsl.env.rmSync(filePath);
  }
}

exports.PRDC_JSLAB_LIB_FILE_SYSTEM = PRDC_JSLAB_LIB_FILE_SYSTEM;