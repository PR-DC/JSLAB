/**
 * @file Generate codebase source text for JSLAB
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */

const fs = require('fs');
const path = require('path');

var OUTPUT_DIR = path.resolve(path.join(__dirname, "../../temp"));
var FULL_CODE_FILE_NAME = path.join(OUTPUT_DIR, 'codebase.txt');
var SOURCE_PATH = path.resolve(path.join(__dirname, "../../"));
console.log(SOURCE_PATH);

// If empty, include all files.
// To restrict to specific files, add their relative paths to this set.
// Example: new Set(["some_file.py", "another_file.js"]);
var FILES_TO_INCLUDE = new Set(); 

// Define programming-related file extensions ('.json' and '.md' intentionally removed)
var PROGRAMMING_EXTENSIONS = new Set([
  '.py', '.java', '.c', '.cpp', '.js', '.ts', '.html', '.css',
  '.rb', '.go', '.php', '.swift', '.kt', '.rs', '.scala', '.sh',
  '.pl', '.lua', '.sql', '.xml', '.yml', '.yaml', '.json'
]);

// Define directories to exclude during file aggregation and directory tree generation
var EXCLUDE_DIRS = new Set([
  'venv',
  'node_modules',
  '__pycache__',
  '.git',
  'dist',
  'build',
  'temp',
  'old_files',
  'flask_session',
  'logs',
  'lib',
  '_dev'
]);

// Define files to exclude from both aggregation and directory tree
var EXCLUDE_FILES = new Set(['package-lock.json']);

console.log('[make-codebase-source.js] Started');
var t = performance.now();

/**
 * Recursively builds an ASCII directory tree.
 * - Excluded directories are marked with " [EXCLUDED]" and their internal contents are not listed.
 * - Files listed in EXCLUDE_FILES are skipped.
 *
 * @param {string} current_path - The directory path to process.
 * @param {number} level - The current indentation level.
 * @returns {string} - The generated directory tree as a string.
 */
function buildTree(current_path, level = 0) {
  var tree = "";
  var indent = '│   '.repeat(level);
  var dir_name = path.basename(current_path) || current_path;

  if(level === 0) {
    tree += `${dir_name}/\n`;
  } else {
    tree += `${indent}├── ${dir_name}/\n`;
  }

  // If the current directory is in the excluded list, mark it and do not traverse further.
  if(EXCLUDE_DIRS.has(dir_name)) {
    // Append [EXCLUDED] at the end of the current directory line.
    tree = tree.replace(/\/\n$/, '/ [EXCLUDED]\n');
    return tree;
  }

  var items;
  try {
    items = fs.readdirSync(current_path, { withFileTypes: true });
  } catch (err) {
    return tree;
  }

  // Sort items alphabetically for consistency.
  items.sort((a, b) => a.name.localeCompare(b.name));

  // List files in the current directory.
  items
    .filter(item => item.isFile())
    .forEach(file => {
      if(EXCLUDE_FILES.has(file.name)) return;
      tree += `${'│   '.repeat(level + 1)}├── ${file.name}\n`;
    });

  // Recursively process subdirectories.
  items
    .filter(item => item.isDirectory())
    .forEach(dirent => {
      tree += buildTree(path.join(current_path, dirent.name), level + 1);
    });

  return tree;
}

/**
 * Checks if a file has a programming-related extension.
 *
 * @param {string} filename - The name of the file.
 * @returns {boolean} - True if the file is considered a programming file.
 */
function isProgrammingFile(filename) {
  var ext = path.extname(filename).toLowerCase();
  return PROGRAMMING_EXTENSIONS.has(ext);
}

/**
 * Determines if a file should be excluded based on its path.
 * Excludes files that are inside any excluded directories and files that are in EXCLUDE_FILES.
 *
 * @param {string} file_path - The file path (can be relative).
 * @returns {boolean} - True if the file should be excluded.
 */
function shouldExclude(file_path) {
  var normalized_path = path.normalize(file_path);
  var parts = normalized_path.split(path.sep);
  // Check if any parent directory is excluded.
  for(var i = 0; i < parts.length - 1; i++) {
    if(EXCLUDE_DIRS.has(parts[i])) {
      return true;
    }
  }
  // Check if the file itself is excluded.
  if(EXCLUDE_FILES.has(parts[parts.length - 1])) {
    return true;
  }
  return false;
}

/**
 * Determines if a file should be included based on FILES_TO_INCLUDE.
 * If FILES_TO_INCLUDE is empty, all files are included.
 *
 * @param {string} file_path - The absolute file path.
 * @returns {boolean} - True if the file should be included.
 */
function shouldIncludeFile(file_path) {
  if(FILES_TO_INCLUDE.size === 0) {
    return true;
  }
  var rel_file_path = path.relative(process.cwd(), file_path);
  return FILES_TO_INCLUDE.has(rel_file_path);
}

/**
 * Recursively traverses directories starting at start_path,
 * aggregates content from programming files, and appends headers.
 *
 * @param {string} currentPath - The directory to process.
 * @param {string} start_path - The base directory (typically process.cwd()).
 * @returns {string} - The aggregated code content.
 */
function aggregateFiles(current_path, start_path) {
  var aggregated_content = "";
  var rel_path = path.relative(start_path, current_path);
  var path_parts = rel_path ? rel_path.split(path.sep) : [];

  // Skip this directory if any parent is in the excluded list.
  if(path_parts.some(part => EXCLUDE_DIRS.has(part))) {
    return aggregated_content;
  }

  // Skip processing if the current directory is excluded.
  var current_dir_name = path.basename(current_path) || current_path;
  if(EXCLUDE_DIRS.has(current_dir_name)) {
    return aggregated_content;
  }

  var items;
  try {
    items = fs.readdirSync(current_path, { withFileTypes: true });
  } catch (err) {
    return aggregated_content;
  }

  // Process files in the current directory.
  for(var item of items) {
    if(item.isFile()) {
      // Skip non-programming files.
      if(!isProgrammingFile(item.name)) {
        continue;
      }

      var file_path = path.join(current_path, item.name);
      var rel_file_path = path.relative(start_path, file_path);

      // Exclude files based on their path or if not explicitly included.
      if(shouldExclude(rel_file_path) || !shouldIncludeFile(file_path)) {
        continue;
      }

      // Write a header for the file.
      var header = `\n\n# ======================\n# File: ${rel_file_path}\n# ======================\n\n`;
      aggregated_content += header;

      try {
        var file_content = fs.readFileSync(file_path, { encoding: 'utf-8' });
        aggregated_content += file_content;
      } catch (err) {
        aggregated_content += `\n# Error reading file ${rel_file_path}: ${err}\n`;
      }
    }
  }

  // Recursively process subdirectories.
  for(var item of items) {
    if(item.isDirectory()) {
      aggregated_content += aggregateFiles(path.join(current_path, item.name), start_path);
    }
  }

  return aggregated_content;
}

(async function main() {
  // Make tex
  console.log(' Making source-code-book.tex');
  var start_path = SOURCE_PATH;
  
  // Generate directory tree.
  var directory_tree = buildTree(start_path);
  var master_content = "Directory Tree:\n" + directory_tree + "\n\n";

  // Aggregate code from programming files.
  master_content += aggregateFiles(start_path, start_path);

  // Write the master file.
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(FULL_CODE_FILE_NAME, master_content, { encoding: 'utf-8' });
  console.log(`Full code file '${FULL_CODE_FILE_NAME}' has been created successfully.`);

  console.log('[make-codebase-source.js] ' + ((performance.now()-t)/1000).toFixed(3) + ' s');
})();
