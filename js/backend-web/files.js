/**
 * @file JSLAB browser files services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TEXT } = require('../other-shared/text');

var WORKSPACE_ROOT = '/workspace';

/**
 * Class for web fs.
 */
class PRDC_JSLAB_WEB_FS {

  /**
   * Initializes the web fs instance.
   */
  constructor() {
    this.mode = 'memory';
    this.opfs_root = null;
    this.workspace_dir = null;
    this.memory_files = new Map();
    this.memory_dirs = new Set([WORKSPACE_ROOT]);
  }

  /**
   * Initializes the storage backend.
   */
  async init() {
    if(globalThis.navigator &&
        globalThis.navigator.storage &&
        typeof globalThis.navigator.storage.getDirectory == 'function') {
      try {
        this.opfs_root = await globalThis.navigator.storage.getDirectory();
        this.workspace_dir = await this.opfs_root.getDirectoryHandle('workspace', { create: true });
        this.mode = 'opfs';
        await this._hydrateCacheFromOpfs();
      } catch(err) {
        this.opfs_root = null;
        this.workspace_dir = null;
        this.mode = 'memory';
      }
    }
    return this;
  }

  /**
   * Refreshes the synchronous cache from the active storage backend.
   */
  async refresh() {
    if(this.mode == 'opfs' && this.workspace_dir) {
      await this._hydrateCacheFromOpfs();
    }
    return this;
  }

  /**
   * Returns a human-readable storage mode label.
   * @returns {string}
   */
  getModeLabel() {
    return this.mode == 'opfs' ? 'Persistent browser storage' : 'Ephemeral memory storage';
  }

  /**
   * Normalizes a virtual workspace path.
   * @param {string} virtual_path
   * @returns {string}
   */
  normalizePath(virtual_path) {
    var path = String(virtual_path || '').replace(/\\/g, '/').trim();
    if(!path.length || path == '/' || path == '/workspace' || path == 'workspace') {
      return WORKSPACE_ROOT;
    }
    if(path.startsWith('workspace/')) {
      path = '/' + path;
    }
    if(!path.startsWith('/')) {
      path = WORKSPACE_ROOT + '/' + path.replace(/^\/+/, '');
    }
    if(!path.startsWith(WORKSPACE_ROOT + '/')) {
      path = WORKSPACE_ROOT + '/' + path.replace(/^\/+/, '');
    }
    path = path.replace(/\/+/g, '/');
    path = path.replace(/\/\.\//g, '/');
    if(path.length > WORKSPACE_ROOT.length && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }

  /**
   * Joins a base virtual directory with a relative path.
   * @param {string} base_path
   * @param {string} relative_path
   * @returns {string}
   */
  join(base_path, relative_path) {
    var base = this.normalizePath(base_path);
    var rel = String(relative_path || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if(!rel.length) {
      return base;
    }
    return this.normalizePath(base + '/' + rel);
  }

  /**
   * Resolves one stored file path with Windows-like case-insensitive fallback.
   * @param {string} virtual_path
   * @returns {string}
   */
  _resolveStoredFilePath(virtual_path) {
    var normalized = this.normalizePath(virtual_path);
    var lower_path;
    var stored_path;
    if(this.memory_files.has(normalized)) {
      return normalized;
    }
    lower_path = normalized.toLowerCase();
    for(stored_path of this.memory_files.keys()) {
      if(stored_path.toLowerCase() == lower_path) {
        return stored_path;
      }
    }
    return '';
  }

  /**
   * Resolves one stored directory path with Windows-like case-insensitive fallback.
   * @param {string} virtual_path
   * @returns {string}
   */
  _resolveStoredDirectoryPath(virtual_path) {
    var normalized = this.normalizePath(virtual_path);
    var lower_path;
    var stored_path;
    if(this.memory_dirs.has(normalized)) {
      return normalized;
    }
    lower_path = normalized.toLowerCase();
    for(stored_path of this.memory_dirs.values()) {
      if(stored_path.toLowerCase() == lower_path) {
        return stored_path;
      }
    }
    return '';
  }

  /**
   * Writes a text file.
   * @param {string} virtual_path
   * @param {string} text
   */
  async writeTextFile(virtual_path, text) {
    var encoder = new TextEncoder();
    await this.writeBytes(virtual_path, encoder.encode(String(text)));
  }

  /**
   * Reads a text file.
   * @param {string} virtual_path
   * @returns {Promise<string>}
   */
  async readTextFile(virtual_path) {
    var decoder = new TextDecoder();
    return decoder.decode(await this.readBytes(virtual_path));
  }

  /**
   * Writes bytes to a file path.
   * @param {string} virtual_path
   * @param {Uint8Array|ArrayBuffer} bytes
   */
  async writeBytes(virtual_path, bytes) {
    var { path, data } = this._cacheBytes(virtual_path, bytes);
    if(this.mode == 'opfs') {
      await this._persistBytesToOpfs(path, data);
      return;
    }
  }

  /**
   * Reads bytes from a file path.
   * @param {string} virtual_path
   * @returns {Promise<Uint8Array>}
   */
  async readBytes(virtual_path) {
    var path = this._resolveStoredFilePath(virtual_path) || this.normalizePath(virtual_path);
    var cached_entry = this.memory_files.get(path);
    if(cached_entry) {
      return Uint8Array.from(cached_entry.data);
    }

    if(this.mode == 'opfs') {
      var file_handle = await this._getFileHandle(path, false);
      var file = await file_handle.getFile();
      var bytes = new Uint8Array(await file.arrayBuffer());
      this._ensureMemoryDirectory(this.dirname(path));
      this.memory_files.set(path, {
        data: Uint8Array.from(bytes),
        lastModified: file.lastModified || Date.now()
      });
      return Uint8Array.from(bytes);
    }

    throw new Error('File not found: ' + path);
  }

  /**
   * Imports selected browser files into the workspace.
   * @param {FileList|Array<File>} files
   * @param {string} base_dir
   * @returns {Promise<Array<Object>>}
   */
  async importFiles(files, base_dir) {
    var imported = [];
    var target_dir = this.normalizePath(base_dir || WORKSPACE_ROOT);
    var list = Array.from(files || []);

    for(var file of list) {
      var relative_path = file.webkitRelativePath || file.name;
      var virtual_path = this.join(target_dir, relative_path);
      await this.writeBytes(virtual_path, new Uint8Array(await file.arrayBuffer()));
      imported.push({
        name: this.basename(virtual_path),
        path: virtual_path,
        size: file.size || 0,
        lastModified: file.lastModified || Date.now()
      });
    }

    return imported;
  }

  /**
   * Imports file handles into the workspace.
   * @param {Array<FileSystemFileHandle>} handles
   * @param {string} base_dir
   * @returns {Promise<Array<Object>>}
   */
  async importFileHandles(handles, base_dir) {
    var imported = [];
    var target_dir = this.normalizePath(base_dir || WORKSPACE_ROOT);
    var list = Array.from(handles || []);

    for(var handle of list) {
      if(!handle || handle.kind != 'file') {
        continue;
      }
      var file = await handle.getFile();
      var virtual_path = this.join(target_dir, handle.name || file.name);
      await this.writeBytes(virtual_path, new Uint8Array(await file.arrayBuffer()));
      imported.push({
        name: this.basename(virtual_path),
        path: virtual_path,
        size: file.size || 0,
        lastModified: file.lastModified || Date.now()
      });
    }

    return imported;
  }

  /**
   * Imports one directory handle into the workspace.
   * @param {FileSystemDirectoryHandle} handle
   * @param {string} base_dir
   * @returns {Promise<Array<Object>>}
   */
  async importDirectoryHandle(handle, base_dir) {
    var imported = [];
    var root_dir;

    if(!handle || handle.kind != 'directory') {
      return imported;
    }

    root_dir = this.join(base_dir || WORKSPACE_ROOT, handle.name || 'folder');
    this.makeDirectorySync(root_dir);
    await this._importDirectoryEntries(handle, root_dir, imported);
    return imported;
  }

  /**
   * Lists the workspace as a flat sorted entry set.
   * @returns {Promise<Array<Object>>}
   */
  async listWorkspace() {
    var entries = this.listWorkspaceSync();

    entries.sort(function(a, b) {
      if(a.kind != b.kind) {
        return a.kind == 'directory' ? -1 : 1;
      }
      return a.path.localeCompare(b.path);
    });
    return entries;
  }

  /**
   * Returns the parent directory for a virtual path.
   * @param {string} virtual_path
   * @returns {string}
   */
  dirname(virtual_path) {
    var path = this.normalizePath(virtual_path);
    if(path == WORKSPACE_ROOT) {
      return WORKSPACE_ROOT;
    }
    var idx = path.lastIndexOf('/');
    if(idx <= 0) {
      return WORKSPACE_ROOT;
    }
    return path.slice(0, idx) || WORKSPACE_ROOT;
  }

  /**
   * Returns the basename for a virtual path.
   * @param {string} virtual_path
   * @returns {string}
   */
  basename(virtual_path) {
    var path = this.normalizePath(virtual_path);
    if(path == WORKSPACE_ROOT) {
      return 'workspace';
    }
    var idx = path.lastIndexOf('/');
    return idx >= 0 ? path.slice(idx + 1) : path;
  }

  /**
   * Returns true if a file path exists.
   * @param {string} virtual_path
   * @returns {Promise<boolean>}
   */
  async existsFile(virtual_path) {
    return this.existsFileSync(virtual_path);
  }

  /**
   * Reads bytes synchronously from the in-memory cache.
   * @param {string} virtual_path
   * @returns {Uint8Array}
   */
  readBytesSync(virtual_path) {
    var path = this._resolveStoredFilePath(virtual_path) || this.normalizePath(virtual_path);
    var entry = this.memory_files.get(path);
    if(!entry) {
      throw new Error('File not found: ' + path);
    }
    return Uint8Array.from(entry.data);
  }

  /**
   * Reads a text file synchronously from the in-memory cache.
   * @param {string} virtual_path
   * @returns {string}
   */
  readTextFileSync(virtual_path) {
    var decoder = new TextDecoder();
    return decoder.decode(this.readBytesSync(virtual_path));
  }

  /**
   * Writes bytes synchronously to the in-memory cache and schedules persistence.
   * @param {string} virtual_path
   * @param {Uint8Array|ArrayBuffer} bytes
   */
  writeBytesSync(virtual_path, bytes) {
    var { path, data } = this._cacheBytes(virtual_path, bytes);
    if(this.mode == 'opfs') {
      this._persistBytesToOpfs(path, data).catch(function(err) {
        console.error(err);
      });
    }
  }

  /**
   * Writes a text file synchronously to the in-memory cache and schedules persistence.
   * @param {string} virtual_path
   * @param {string} text
   */
  writeTextFileSync(virtual_path, text) {
    var encoder = new TextEncoder();
    this.writeBytesSync(virtual_path, encoder.encode(String(text)));
  }

  /**
   * Returns true if a cached file exists.
   * @param {string} virtual_path
   * @returns {boolean}
   */
  existsFileSync(virtual_path) {
    return !!this._resolveStoredFilePath(virtual_path);
  }

  /**
   * Returns true if a cached directory exists.
   * @param {string} virtual_path
   * @returns {boolean}
   */
  existsDirectorySync(virtual_path) {
    return !!this._resolveStoredDirectoryPath(virtual_path);
  }

  /**
   * Creates a directory synchronously in the cache and schedules persistence.
   * @param {string} virtual_path
   */
  makeDirectorySync(virtual_path) {
    var path = this.normalizePath(virtual_path);
    this._ensureMemoryDirectory(path);
    if(this.mode == 'opfs') {
      this._getDirectoryHandle(path, true).catch(function(err) {
        console.error(err);
      });
    }
  }

  /**
   * Removes a cached file or directory and schedules persistence.
   * @param {string} virtual_path
   */
  removeSync(virtual_path) {
    var normalized = this.normalizePath(virtual_path);
    var path = this._resolveStoredFilePath(normalized) ||
      this._resolveStoredDirectoryPath(normalized) ||
      normalized;
    if(path == WORKSPACE_ROOT) {
      this.memory_files.clear();
      this.memory_dirs = new Set([WORKSPACE_ROOT]);
      if(this.mode == 'opfs') {
        this._clearOpfsWorkspace().catch(function(err) {
          console.error(err);
        });
      }
      return true;
    }

    this.memory_files.delete(path);
    [...this.memory_files.keys()].forEach((file_path) => {
      if(file_path.startsWith(path + '/')) {
        this.memory_files.delete(file_path);
      }
    });
    this.memory_dirs.delete(path);
    [...this.memory_dirs].forEach((dir_path) => {
      if(dir_path.startsWith(path + '/')) {
        this.memory_dirs.delete(dir_path);
      }
    });

    if(this.mode == 'opfs') {
      this._removeFromOpfs(path).catch(function(err) {
        console.error(err);
      });
    }
    return true;
  }

  /**
   * Copies a cached file synchronously and schedules persistence.
   * @param {string} source_path
   * @param {string} destination_path
   * @returns {boolean}
   */
  copyFileSync(source_path, destination_path) {
    var source = this._resolveStoredFilePath(source_path) || this.normalizePath(source_path);
    if(!this.memory_files.has(source)) {
      return false;
    }
    this.writeBytesSync(destination_path, this.memory_files.get(source).data);
    return true;
  }

  /**
   * Returns a synchronous directory listing from the cache.
   * @param {string} virtual_path
   * @param {Object} [options]
   * @returns {Array}
   */
  readDirSync(virtual_path, options) {
    var normalized = this._resolveStoredDirectoryPath(virtual_path) ||
      this.normalizePath(virtual_path);
    if(!this.existsDirectorySync(normalized)) {
      throw new Error('Directory not found: ' + normalized);
    }

    var with_file_types = !!(options && options.withFileTypes);
    var children = new Map();
    var prefix = normalized == WORKSPACE_ROOT ? WORKSPACE_ROOT + '/' : normalized + '/';

    [...this.memory_dirs].forEach((dir_path) => {
      if(dir_path == normalized || !dir_path.startsWith(prefix)) {
        return;
      }
      var relative = dir_path.slice(prefix.length);
      if(relative.includes('/')) {
        return;
      }
      children.set(relative, { kind: 'directory' });
    });

    this.memory_files.forEach((_entry, file_path) => {
      if(!file_path.startsWith(prefix)) {
        return;
      }
      var relative = file_path.slice(prefix.length);
      if(relative.includes('/')) {
        return;
      }
      children.set(relative, { kind: 'file' });
    });

    var names = [...children.keys()].sort();
    if(!with_file_types) {
      return names;
    }
    return names.map(function(name) {
      var kind = children.get(name).kind;
      return {
        name: name,
        isDirectory: function() {
          return kind == 'directory';
        },
        isFile: function() {
          return kind == 'file';
        }
      };
    });
  }

  /**
   * Returns the cached workspace as a flat sorted entry set.
   * @returns {Array<Object>}
   */
  listWorkspaceSync() {
    var entries = [];
    this.memory_dirs.forEach((dir_path) => {
      if(dir_path != WORKSPACE_ROOT) {
        entries.push({
          kind: 'directory',
          name: this.basename(dir_path),
          path: dir_path
        });
      }
    });
    this.memory_files.forEach((entry, file_path) => {
      entries.push({
        kind: 'file',
        name: this.basename(file_path),
        path: file_path,
        size: entry.data.length,
        lastModified: entry.lastModified
      });
    });
    return entries;
  }

  /**
   * Recursively walks an OPFS directory.
   * @param {FileSystemDirectoryHandle} dir_handle
   * @param {string} current_path
   * @param {Array<Object>} out
   */
  async _walkDirectory(dir_handle, current_path, out) {
    for await (var [name, handle] of dir_handle.entries()) {
      var path = current_path + '/' + name;
      if(handle.kind == 'directory') {
        out.push({
          kind: 'directory',
          name: name,
          path: path
        });
        await this._walkDirectory(handle, path, out);
      } else {
        var file = await handle.getFile();
        out.push({
          kind: 'file',
          name: name,
          path: path,
          size: file.size,
          lastModified: file.lastModified
        });
      }
    }
  }

  /**
   * Recursively imports a browser directory handle into the workspace.
   * @param {FileSystemDirectoryHandle} dir_handle
   * @param {string} current_path
   * @param {Array<Object>} imported
   */
  async _importDirectoryEntries(dir_handle, current_path, imported) {
    for await (var [name, handle] of dir_handle.entries()) {
      var path = this.join(current_path, name);
      if(handle.kind == 'directory') {
        this.makeDirectorySync(path);
        await this._importDirectoryEntries(handle, path, imported);
      } else {
        var file = await handle.getFile();
        await this.writeBytes(path, new Uint8Array(await file.arrayBuffer()));
        imported.push({
          name: this.basename(path),
          path: path,
          size: file.size || 0,
          lastModified: file.lastModified || Date.now()
        });
      }
    }
  }

  /**
   * Resolves a directory handle for the given virtual path.
   * @param {string} virtual_path
   * @param {boolean} create
   * @returns {Promise<FileSystemDirectoryHandle>}
   */
  async _getDirectoryHandle(virtual_path, create) {
    var path = this.normalizePath(virtual_path);
    var current = this.workspace_dir;
    var parts = path.split('/').filter(Boolean).slice(1);

    for(var part of parts) {
      current = await current.getDirectoryHandle(part, { create: !!create });
    }

    return current;
  }

  /**
   * Resolves a file handle for the given virtual path.
   * @param {string} virtual_path
   * @param {boolean} create
   * @returns {Promise<FileSystemFileHandle>}
   */
  async _getFileHandle(virtual_path, create) {
    var path = this.normalizePath(virtual_path);
    var dir_handle = await this._getDirectoryHandle(this.dirname(path), create);
    return await dir_handle.getFileHandle(this.basename(path), { create: !!create });
  }

  /**
   * Ensures an in-memory directory path exists.
   * @param {string} dir_path
   */
  _ensureMemoryDirectory(dir_path) {
    var normalized = this.normalizePath(dir_path);
    var segments = normalized.split('/').filter(Boolean);
    var current = '';

    segments.forEach((segment) => {
      current += '/' + segment;
      this.memory_dirs.add(current);
    });
  }

  /**
   * Loads the current OPFS workspace into the synchronous cache.
   */
  async _hydrateCacheFromOpfs() {
    this.memory_files.clear();
    this.memory_dirs = new Set([WORKSPACE_ROOT]);
    await this._hydrateDirectoryHandle(this.workspace_dir, WORKSPACE_ROOT);
  }

  /**
   * Recursively hydrates the sync cache from OPFS handles.
   * @param {FileSystemDirectoryHandle} dir_handle
   * @param {string} current_path
   */
  async _hydrateDirectoryHandle(dir_handle, current_path) {
    for await (var [name, handle] of dir_handle.entries()) {
      var child_path = current_path + '/' + name;
      if(handle.kind == 'directory') {
        this.memory_dirs.add(child_path);
        await this._hydrateDirectoryHandle(handle, child_path);
      } else {
        var file = await handle.getFile();
        this.memory_files.set(child_path, {
          data: new Uint8Array(await file.arrayBuffer()),
          lastModified: file.lastModified || Date.now()
        });
      }
    }
  }

  /**
   * Persists cached bytes to OPFS.
   * @param {string} virtual_path
   * @param {Uint8Array} data
   */
  async _persistBytesToOpfs(virtual_path, data) {
    var dir_handle = await this._getDirectoryHandle(this.dirname(virtual_path), true);
    var file_handle = await dir_handle.getFileHandle(this.basename(virtual_path), { create: true });
    var writable = await file_handle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  /**
   * Removes a file or directory from OPFS.
   * @param {string} virtual_path
   */
  async _removeFromOpfs(virtual_path) {
    var path = this.normalizePath(virtual_path);
    var parent_dir = await this._getDirectoryHandle(this.dirname(path), false);
    await parent_dir.removeEntry(this.basename(path), { recursive: true });
  }

  /**
   * Clears the OPFS workspace directory.
   */
  async _clearOpfsWorkspace() {
    for await (var [name] of this.workspace_dir.entries()) {
      await this.workspace_dir.removeEntry(name, { recursive: true });
    }
  }
  /**
   * Updates the common file cache before either persistence strategy runs.
   * @param {string} virtual_path Workspace path.
   * @param {Uint8Array|ArrayBuffer} bytes File content.
   * @returns {Object} Normalized path and bytes.
   */
  _cacheBytes(virtual_path, bytes) {
    var path = this.normalizePath(virtual_path);
    var dir_path = this.dirname(path);
    var data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this._ensureMemoryDirectory(dir_path);
    this.memory_files.set(path, {
      data: Uint8Array.from(data),
      lastModified: Date.now()
    });

    return { path, data };
  }

}

exports.PRDC_JSLAB_WEB_FS = PRDC_JSLAB_WEB_FS;


/**
 * Implements files services for the application host.
 */
class PRDC_JSLAB_WEB_FILES {
  /**
   * Connects host services to the owning application.
   * @param {Object} application Application host controller.
   */
  constructor(application) {
    this.application = application;
  }

  /**
   * Wires import pickers.
   */
  _bindImportActions() {
    document.getElementById('file-browser-import-button').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._openFileBrowserImportMenu(event.currentTarget);
    });
    document.getElementById('file-browser-import-url-button').addEventListener('click', async () => {
      await this._promptImportUrl();
    });

    this.application.file_picker.addEventListener('change', async () => {
      if(!this.application.file_picker.dataset.jslabOpenDialog) {
        await this._importSelection(this.application.file_picker.files);
      }
    });

    this.application.folder_picker.addEventListener('change', async () => {
      if(!this.application.folder_picker.dataset.jslabOpenDialog) {
        await this._importSelection(this.application.folder_picker.files);
      }
    });
  }

  /**
   * Wires modal dialog behavior.
   */
  _bindBrowserFileActions() {
    var obj = this;
    if(this.application.file_browser_import_menu) {
      document.getElementById('file-browser-import-files-action').addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        await obj._importFilesFromPicker();
      });
      document.getElementById('file-browser-import-folder-action').addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        await obj._importFolderFromPicker();
      });
      document.addEventListener('click', function(e) {
        if(obj.application.file_browser_import_menu.style.display === 'none') {
          return;
        }
        if(!obj.application.file_browser_import_menu.contains(e.target) &&
            e.target.id != 'file-browser-import-button') {
          obj._hideFileBrowserImportMenu();
        }
      });
      document.addEventListener('keydown', function(e) {
        if(e.key == 'Escape') {
          obj._hideFileBrowserImportMenu();
        }
      });
      document.getElementById('file-browser').addEventListener('scroll', function() {
        obj._hideFileBrowserImportMenu();
      });
    }
  }

  /**
   * Imports files into the workspace.
   * @param {FileList|Array<File>} files
   */
  async _importSelection(files) {
    var imported = await this.application.fs.importFiles(files, '/workspace');
    this.application._appendCommandWindowMessage('system-in', '<span class="log">' + PRDC_JSLAB_TEXT.escapeHTML('Imported ' + imported.length + ' file(s) into browser storage.') + '</span>', 'Imported ' + imported.length + ' file(s) into browser storage.');
    await this.application._refreshWorkspaceList();
  }

  /**
   * Opens a prompt for importing one direct URL into the workspace.
   * @returns {Promise<boolean>}
   */
  async _promptImportUrl() {
    var result = await this.application.openInspectorInputDialog({
      title: this.application.language.currentString(542),
      fields: [{
        label: this.application.language.currentString(544),
        value: ''
      }],
      submit_label: this.application.language.currentString(552),
      hide_cancel: true
    });

    if(!result || !Array.isArray(result.values)) {
      return false;
    }

    if(!String(result.values[0] || '').trim().length) {
      return false;
    }

    await this._importFromUrl(result.values[0], {
      open_in_editor: false
    });
    return true;
  }

  /**
   * Builds a ready-to-use ?open=... share URL for the current web app.
   * @param {string} file_url
   * @returns {string}
   */
  _buildShareLink(file_url) {
    var url_text = String(file_url || '').trim();
    var base_url;
    var absolute_url;
    var share_url;

    if(!url_text.length) {
      return '';
    }

    absolute_url = new URL(url_text, globalThis.location.href).href;
    base_url = new URL(globalThis.location.href);
    base_url.search = '';
    base_url.hash = '';
    share_url = new URL(base_url.href);
    share_url.searchParams.append('open', absolute_url);
    return share_url.href;
  }

  /**
   * Copies text to the system clipboard with a DOM fallback for file:// mode.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async _copyText(text) {
    var value = String(text || '');
    var textarea;
    var copied = false;

    if(!value.length) {
      return false;
    }

    if(globalThis.navigator &&
        globalThis.navigator.clipboard &&
        typeof globalThis.navigator.clipboard.writeText == 'function') {
      try {
        await globalThis.navigator.clipboard.writeText(value);
        return true;
      } catch{}
    }

    textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-10000px';
    textarea.style.top = '-10000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      copied = document.execCommand('copy');
    } catch{
      copied = false;
    }

    document.body.removeChild(textarea);
    return copied === true;
  }

  /**
   * Imports a remote file URL into the workspace.
   * @param {string} file_url
   * @param {Object} [options]
   * @returns {Promise<(string|false)>}
   */
  async _importFromUrl(file_url, options) {
    var url_text = String(file_url || '').trim();
    var absolute_url;
    var response;
    var content_type;
    var content_disposition;
    var filename;
    var target_path;
    var bytes;
    var raw_error;
    var message;

    if(!url_text.length) {
      return false;
    }

    try {
      absolute_url = new URL(url_text, globalThis.location.href).href;
      response = await fetch(absolute_url, {
        mode: 'cors',
        credentials: 'omit'
      });

      if(!response.ok) {
        throw new Error('HTTP ' + response.status + ' ' + response.statusText);
      }

      content_type = String(response.headers.get('content-type') || '');
      content_disposition = String(response.headers.get('content-disposition') || '');
      filename = this._resolveImportedUrlFileName(absolute_url, content_disposition, content_type);
      target_path = this.application.fs.normalizePath('/workspace/' + filename);
      bytes = new Uint8Array(await response.arrayBuffer());

      await this.application.fs.writeBytes(target_path, bytes);
      await this.application._refreshWorkspaceList();

      this.application._appendCommandWindowMessage(
        'system-in',
        '<span class="log">' + PRDC_JSLAB_TEXT.escapeHTML(this.application.language.currentString(545) + ' ' + target_path) + '</span>',
        this.application.language.currentString(545) + ' ' + target_path
      );

      if(options && options.open_in_editor &&
          this._shouldOpenImportedFileInEditor(target_path, content_type)) {
        await this.application.windows._openEditorWindow(target_path);
      }

      return target_path;
    } catch(err) {
      raw_error = err && err.message ? err.message : String(err);
      message = this.application.language.currentString(546) + ' ' + raw_error;
      this.application.handleSandboxRuntimeLog(message, 'error');
      return false;
    }
  }

  /**
   * Infers a workspace filename for a remote import.
   * @param {string} file_url
   * @param {string} content_disposition
   * @param {string} content_type
   * @returns {string}
   */
  _resolveImportedUrlFileName(file_url, content_disposition, content_type) {
    var filename = '';
    var parsed_url;
    var path_parts;
    var match;

    if(typeof content_disposition == 'string' && content_disposition.length) {
      match = /filename\*=UTF-8''([^;]+)/i.exec(content_disposition);
      if(match && match[1]) {
        try {
          filename = decodeURIComponent(match[1]);
        } catch{
          filename = match[1];
        }
      }
      if(!filename.length) {
        match = /filename=\"?([^\";]+)\"?/i.exec(content_disposition);
        if(match && match[1]) {
          filename = match[1];
        }
      }
    }

    if(!filename.length) {
      try {
        parsed_url = new URL(file_url);
        path_parts = parsed_url.pathname.split('/').filter(function(part) {
          return part.length > 0;
        });
        filename = path_parts.length ? path_parts[path_parts.length - 1] : '';
      } catch{}
    }

    if(!filename.length) {
      filename = 'remote-file';
    }

    filename = filename.replace(/[?#].*$/, '').trim();
    filename = filename.replace(/[<>:\"/\\\\|?*]+/g, '-');
    if(!filename.length) {
      filename = 'remote-file';
    }

    if(filename.indexOf('.') < 0) {
      if(content_type.indexOf('javascript') > -1) {
        filename += '.js';
      } else if(content_type.indexOf('json') > -1) {
        filename += '.json';
      } else if(content_type.indexOf('html') > -1) {
        filename += '.html';
      } else if(content_type.indexOf('css') > -1) {
        filename += '.css';
      } else if(content_type.indexOf('markdown') > -1) {
        filename += '.md';
      } else if(content_type.indexOf('text/plain') > -1) {
        filename += '.txt';
      }
    }

    return filename;
  }

  /**
   * Returns true if an imported file should open in the editor automatically.
   * @param {string} file_path
   * @param {string} content_type
   * @returns {boolean}
   */
  _shouldOpenImportedFileInEditor(file_path, content_type) {
    var lower_path = String(file_path || '').toLowerCase();
    var allowed_extensions = [
      '.jsl', '.js', '.json', '.txt', '.md', '.html', '.css',
      '.xml', '.csv', '.ts', '.mjs', '.cjs', '.c', '.cpp', '.h', '.hpp', '.py'
    ];

    if(allowed_extensions.some(function(extension) {
      return lower_path.endsWith(extension);
    })) {
      return true;
    }

    return typeof content_type == 'string' && (
      content_type.startsWith('text/') ||
      content_type.indexOf('json') > -1 ||
      content_type.indexOf('javascript') > -1 ||
      content_type.indexOf('xml') > -1
    );
  }

  /**
   * Imports files requested through ?open=... query parameters.
   * @returns {Promise<void>}
   */
  async _handleStartupOpenUrls() {
    var params;
    var urls;
    var i;

    try {
      params = new URLSearchParams(globalThis.location.search || '');
    } catch{
      return;
    }

    urls = params.getAll('open').map(function(value) {
      return String(value || '').trim();
    }).filter(function(value) {
      return value.length > 0;
    });

    for(i = 0; i < urls.length; i++) {
      await this._importFromUrl(urls[i], {
        open_in_editor: true
      });
    }
  }

  /**
   * Opens the merged import menu under the import icon.
   * @param {HTMLElement} anchor
   */
  _openFileBrowserImportMenu(anchor) {
    if(!this.application.file_browser_import_menu || !anchor) {
      return;
    }
    this.application._hideFileBrowserContextMenu();
    this.application._hideWorkspaceContextMenu();
    var rect = anchor.getBoundingClientRect();
    this.application.file_browser_import_menu.style.left = Math.round(rect.left) + 'px';
    this.application.file_browser_import_menu.style.top = Math.round(rect.bottom + 4) + 'px';
    this.application.file_browser_import_menu.style.display = 'block';
  }

  /**
   * Hides the merged import menu.
   */
  _hideFileBrowserImportMenu() {
    if(this.application.file_browser_import_menu) {
      this.application.file_browser_import_menu.style.display = 'none';
    }
  }

  /**
   * Imports files through the browser picker.
   * @returns {Promise<void>}
   */
  async _importFilesFromPicker() {
    var result = false;
    this._hideFileBrowserImportMenu();
    if(this.application.runtime_info.supports_open_picker) {
      result = await this._showOpenDialog({
        title: this.application.language.currentString(598),
        buttonLabel: 'Import files',
        properties: ['openFile', 'multiSelections']
      });
    }
    if(!result) {
      this._openPicker(document.getElementById('file-picker'));
    }
  }

  /**
   * Imports one folder through the browser picker.
   * @returns {Promise<void>}
   */
  async _importFolderFromPicker() {
    var result = false;
    this._hideFileBrowserImportMenu();
    if(this.application.runtime_info.supports_directory_picker) {
      result = await this._showOpenDialog({
        title: this.application.language.currentString(599),
        buttonLabel: 'Import folder',
        properties: ['openDirectory']
      });
    }
    if(!result) {
      this._openPicker(document.getElementById('folder-picker'));
    }
  }

  /**
   * Resolves a default save extension from dialog options.
   * @param {Object} options
   * @param {string} default_path
   * @returns {string}
   */
  _getSaveDialogDefaultExtension(options, default_path) {
    var path_value = String(default_path || '');
    if(path_value.endsWith('.i.html')) {
      return '.i.html';
    }
    if(path_value.endsWith('.io.html')) {
      return '.io.html';
    }
    var base_name = path_value.split('/').pop() || '';
    var last_dot = base_name.lastIndexOf('.');
    if(last_dot > 0) {
      return base_name.slice(last_dot);
    }
    var filters = options && Array.isArray(options.filters) ? options.filters : [];
    for(var i = 0; i < filters.length; i++) {
      var extensions = filters[i] && Array.isArray(filters[i].extensions) ? filters[i].extensions : [];
      if(extensions.length && typeof extensions[0] == 'string' && extensions[0].length) {
        return '.' + extensions[0];
      }
    }
    return '';
  }

  /**
   * Resolves a local file name suggestion for browser save flows.
   * @param {string} file_path
   * @param {Object} [options]
   * @returns {string}
   */
  _sanitizeSaveDialogFileName(file_path, options) {
    var value = String(file_path || '').trim().replace(/\\/g, '/');
    if(value.includes('/')) {
      value = value.split('/').pop();
    }
    value = value.replace(/[:*?"<>|]/g, '_');
    if(!value.length) {
      value = 'file';
    }
    var ext = this._getSaveDialogDefaultExtension(options, file_path || value);
    if(ext && value.indexOf('.') < 0) {
      value += ext;
    }
    return value;
  }

  /**
   * Builds browser file picker types from dialog filters.
   * @param {Object} [options]
   * @returns {Array}
   */
  _getSaveDialogFileTypes(options) {
    var types = [];
    var filters = options && Array.isArray(options.filters) ? options.filters : [];
    filters.forEach(function(filter) {
      var extensions = filter && Array.isArray(filter.extensions) ? filter.extensions : [];
      var accept_extensions = [];
      extensions.forEach(function(extension) {
        var value = String(extension || '').trim();
        if(!value.length || value == '*') {
          return;
        }
        if(!value.startsWith('.')) {
          value = '.' + value;
        }
        accept_extensions.push(value);
      });
      if(accept_extensions.length) {
        types.push({
          description: filter && filter.name ? String(filter.name) : 'Files',
          accept: {
            'application/octet-stream': accept_extensions
          }
        });
      }
    });
    return types;
  }

  /**
   * Builds browser file picker types from open-dialog filters.
   * @param {Object} [options]
   * @returns {Array}
   */
  _getOpenDialogFileTypes(options) {
    return this._getSaveDialogFileTypes(options);
  }

  /**
   * Stores a pending local save target for later file writes.
   * @param {string} file_name
   * @param {FileSystemFileHandle|null} handle
   * @returns {Object}
   */
  _rememberLocalSaveTarget(file_name, handle) {
    var name = this._sanitizeSaveDialogFileName(file_name);
    var token = 'local-save-' + (++this.application.local_save_target_id);
    this.application.local_save_targets[token] = {
      name: name,
      handle: handle || null
    };
    return {
      canceled: false,
      filePath: name,
      token: token
    };
  }

  /**
   * Displays the browser save dialog and returns a local save target.
   * @param {Object} [options]
   * @returns {Promise<Object|false>}
   */
  async _showSaveDialog(options) {
    var default_name = this._sanitizeSaveDialogFileName(
      options && options.defaultPath ? options.defaultPath : 'file.txt',
      options
    );

    if(this.application.runtime_info.supports_save_picker) {
      try {
        var picker_options = {
          suggestedName: default_name
        };
        var picker_types = this._getSaveDialogFileTypes(options);
        if(picker_types.length) {
          picker_options.types = picker_types;
        }
        var handle = await globalThis.showSaveFilePicker(picker_options);
        return this._rememberLocalSaveTarget(handle && handle.name ? handle.name : default_name, handle);
      } catch(err) {
        if(err && err.name == 'AbortError') {
          return false;
        }
        if(!err || (err.name != 'SecurityError' && err.name != 'NotAllowedError')) {
          console.warn(err);
        }
      }
    }

    return this._rememberLocalSaveTarget(default_name, null);
  }

  /**
   * Resolves a stored local save target entry.
   * @param {Object|string} target
   * @param {Object} [options]
   * @returns {Object|false}
   */
  _resolveLocalSaveTarget(target, options) {
    if(target && typeof target == 'object') {
      if(typeof target.token == 'string' && this.application.local_save_targets[target.token]) {
        return this.application.local_save_targets[target.token];
      }
      if(typeof target.filePath == 'string' && target.filePath.length) {
        return {
          name: this._sanitizeSaveDialogFileName(target.filePath, options),
          handle: null
        };
      }
    }
    if(typeof target == 'string' && target.length) {
      return {
        name: this._sanitizeSaveDialogFileName(target, options),
        handle: null
      };
    }
    return false;
  }

  /**
   * Displays the browser open dialog and imports the selected entries into workspace storage.
   * Returned paths point to workspace files/directories, not original OS paths.
   * @param {Object} [options]
   * @returns {Promise<Array|false>}
   */
  async _showOpenDialog(options) {
    var props = options && Array.isArray(options.properties) ? options.properties : ['openFile'];
    var allow_directory = props.includes('openDirectory');
    var allow_file = props.includes('openFile') || !allow_directory;
    var allow_multi = props.includes('multiSelections');
    var imported = [];
    var result = [];
    var dir_handle;
    var file_handles;
    var imported_root_path = '';

    try {
      if(allow_directory && !allow_file && this.application.runtime_info.supports_directory_picker) {
        dir_handle = await globalThis.showDirectoryPicker({
          id: 'jslab-open-directory',
          mode: 'read'
        });
        imported = await this.application.fs.importDirectoryHandle(dir_handle, '/workspace');
        imported_root_path = this.application.fs.join('/workspace', dir_handle && dir_handle.name ? dir_handle.name : 'folder');
      } else if(this.application.runtime_info.supports_open_picker) {
        file_handles = await globalThis.showOpenFilePicker({
          id: 'jslab-open-file',
          multiple: !!allow_multi,
          excludeAcceptAllOption: false,
          types: this._getOpenDialogFileTypes(options)
        });
        imported = await this.application.fs.importFileHandles(file_handles, '/workspace');
      } else if(allow_directory && this.application.runtime_info.supports_directory_picker) {
        dir_handle = await globalThis.showDirectoryPicker({
          id: 'jslab-open-directory',
          mode: 'read'
        });
        imported = await this.application.fs.importDirectoryHandle(dir_handle, '/workspace');
        imported_root_path = this.application.fs.join('/workspace', dir_handle && dir_handle.name ? dir_handle.name : 'folder');
      } else {
        const files = await this._pickFiles(allow_directory ? this.application.folder_picker : this.application.file_picker);
        imported = await this.application.fs.importFiles(files, '/workspace');
        if(allow_directory && files[0]?.webkitRelativePath) {
          imported_root_path = this.application.fs.join('/workspace', files[0].webkitRelativePath.split('/')[0]);
        }
      }
    } catch(err) {
      if(err && err.name == 'AbortError') {
        return false;
      }
      if(!err || (err.name != 'SecurityError' && err.name != 'NotAllowedError')) {
        console.warn(err);
      }
      return false;
    }

    if(!imported.length) {
      return false;
    }

    await this.application._refreshWorkspaceList();
    if(imported_root_path.length) {
      return [imported_root_path];
    }
    imported.forEach(function(entry) {
      if(entry && entry.path) {
        result.push(entry.path);
      }
    });
    return result;
  }

  /**
   * Converts file payloads to a browser Blob.
   * @param {*} data
   * @param {Object} [options]
   * @returns {Blob}
   */
  _createSaveBlob(data, options) {
    var mime_type = options && typeof options.mimeType == 'string' && options.mimeType.length
      ? options.mimeType
      : 'application/octet-stream';
    if(typeof Blob != 'undefined' && data instanceof Blob) {
      return data;
    }
    if(typeof data == 'string') {
      return new Blob([data], { type: mime_type || 'text/plain;charset=utf-8' });
    }
    if(typeof ArrayBuffer != 'undefined' && data instanceof ArrayBuffer) {
      return new Blob([data], { type: mime_type });
    }
    if(typeof ArrayBuffer != 'undefined' && ArrayBuffer.isView(data)) {
      return new Blob([data], { type: mime_type });
    }
    return new Blob([String(data == null ? '' : data)], { type: mime_type });
  }

  /**
   * Triggers a browser download for the provided Blob.
   * @param {string} file_name
   * @param {Blob} blob
   * @returns {boolean}
   */
  _downloadBlob(file_name, blob) {
    var link = document.createElement('a');
    var url = globalThis.URL.createObjectURL(blob);
    link.href = url;
    link.download = this._sanitizeSaveDialogFileName(file_name);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() {
      globalThis.URL.revokeObjectURL(url);
    }, 1000);
    return true;
  }

  /**
   * Saves a payload to local disk using a picker handle or download fallback.
   * @param {Object|string} target
   * @param {*} data
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  async _saveLocalFile(target, data, options) {
    var entry = this._resolveLocalSaveTarget(target, options);
    if(!entry) {
      return false;
    }
    var blob = this._createSaveBlob(data, options);
    if(entry.handle && typeof entry.handle.createWritable == 'function') {
      try {
        var writable = await entry.handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch(err) {
        console.warn(err);
      }
    }
    return this._downloadBlob(entry.name, blob);
  }

  /**
   * Saves a payload to local disk without opening a picker.
   * @param {string} file_path
   * @param {*} data
   * @param {Object} [options]
   * @returns {boolean}
   */
  _downloadLocalFileSync(file_path, data, options) {
    var entry = this._resolveLocalSaveTarget(file_path, options);
    if(!entry) {
      return false;
    }
    return this._downloadBlob(entry.name, this._createSaveBlob(data, options));
  }

  /**
   * Merges streamed binary chunks into a single Uint8Array.
   * @param {Array} chunks
   * @returns {Uint8Array}
   */
  _mergeBinaryChunks(chunks) {
    var normalized = (chunks || []).map((chunk) => {
      if(chunk instanceof Uint8Array) {
        return chunk;
      }
      if(typeof ArrayBuffer != 'undefined' && chunk instanceof ArrayBuffer) {
        return new Uint8Array(chunk);
      }
      if(typeof ArrayBuffer != 'undefined' && ArrayBuffer.isView(chunk)) {
        return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      }
      return new Uint8Array(0);
    });
    var total = normalized.reduce(function(sum, chunk) {
      return sum + chunk.byteLength;
    }, 0);
    var data = new Uint8Array(total);
    var offset = 0;
    normalized.forEach(function(chunk) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    });
    return data;
  }

  /**
   * Converts SVG data to PDF in the browser runtime.
   * @param {string} svg_data
   * @param {number} width
   * @param {number} height
   * @param {Array} [fonts]
   * @returns {Promise<Uint8Array|false>}
   */
  async _svgToPdf(svg_data, width, height, fonts) {
    var optional_assets = globalThis.__JSLAB_WEB_OPTIONAL_ASSETS__ || {};
    try {
      await PRDC_JSLAB_WEB_FILES.loadScripts([
        {
          source: optional_assets.pdfkit || './lib/pdfkit/pdfkit.standalone.js',
          available: function() {
            return typeof globalThis.PDFDocument == 'function';
          }
        },
        {
          source: optional_assets.svg_to_pdfkit || './lib/svg-to-pdfkit/source.js',
          available: function() {
            return typeof globalThis.SVGtoPDF == 'function';
          }
        }
      ]);
    } catch(err) {
      console.warn(err);
      return false;
    }
    if(typeof globalThis.PDFDocument != 'function' ||
        typeof globalThis.SVGtoPDF != 'function') {
      return false;
    }
    var obj = this;
    return await new Promise(function(resolve, reject) {
      try {
        var doc = new globalThis.PDFDocument({
          size: [width, height]
        });
        if(Array.isArray(fonts) && fonts[0]) {
          doc.registerFont('Roboto', fonts[0]);
        }
        if(Array.isArray(fonts) && fonts[1]) {
          doc.registerFont('LatinModernMath', fonts[1]);
        }
        var chunks = [];
        doc.on('data', function(chunk) {
          chunks.push(chunk);
        });
        doc.on('end', function() {
          resolve(obj._mergeBinaryChunks(chunks));
        });
        globalThis.SVGtoPDF(doc, svg_data, 0, 0, {
          width: width,
          height: height,
          assumePt: true
        });
        doc.end();
      } catch(err) {
        reject(err);
      }
    }).then((result) => {
      if(result instanceof Uint8Array && result.byteLength) {
        return result;
      }
      return false;
    }).catch((err) => {
      console.warn(err);
      return false;
    });
  }

  /**
   * Triggers a file input picker.
   * @param {HTMLInputElement} input
   */
  _openPicker(input) {
    if(input) {
      input.value = '';
      input.click();
    }
  }

  /**
   * Waits for a file-input selection or cancellation used by a window dialog.
   * @param {HTMLInputElement} input Host file or folder picker.
   * @returns {Promise<File[]>} Selected files, or an empty list on cancellation.
   */
  _pickFiles(input) {
    this.application._dialogs ??= new WeakMap();
    if(this.application._dialogs.has(input)) {
      return this.application._dialogs.get(input);
    }
    let complete;
    let fail;
    const pending = new Promise((resolve, reject) => {
      complete = resolve;
      fail = reject;
    });
    const finish = (files, error) => {
      input.removeEventListener('change', changed);
      input.removeEventListener('cancel', canceled);
      delete input.dataset.jslabOpenDialog;
      this.application._dialogs.delete(input);
      if(error) {
        fail(error);
      } else {
        complete(files);
      }
    };
    const changed = () => finish(Array.from(input.files || []));
    const canceled = () => finish([]);
    input.addEventListener('change', changed);
    input.addEventListener('cancel', canceled);
    input.dataset.jslabOpenDialog = 'true';
    this.application._dialogs.set(input, pending);
    try {
      this._openPicker(input);
    } catch(error) {
      finish([], error);
    }
    return pending;
  }

  /** Script requests shared by file and renderer services within one page. */
  static _asset_requests = new Map();

  /**
   * Resolves an asset path against the web application root.
   * @param {string} source Asset path or URL.
   * @returns {string} Absolute asset URL.
   */
  static resolveAssetUrl(source) {
    return new URL(String(source), globalThis.document && globalThis.document.baseURI
      ? globalThis.document.baseURI
      : globalThis.location.href).href;
  }

  /**
   * Loads one browser script once per page.
   * @param {string} source Asset path or URL.
   * @param {Function} [available] Optional loaded-state predicate.
   * @returns {Promise<string>} Loaded absolute URL.
   */
  static loadScript(source, available) {
    if(typeof available == 'function' && available()) {
      return Promise.resolve(PRDC_JSLAB_WEB_FILES.resolveAssetUrl(source));
    }
    var url = PRDC_JSLAB_WEB_FILES.resolveAssetUrl(source);
    if(PRDC_JSLAB_WEB_FILES._asset_requests.has(url)) {
      return PRDC_JSLAB_WEB_FILES._asset_requests.get(url);
    }

    var promise = new Promise(function(resolve, reject) {
      var script = globalThis.document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      script.async = true;
      script.dataset.jslabLazyAsset = 'true';
      script.onload = function() {
        if(typeof available == 'function' && !available()) {
          reject(new Error('The web asset loaded without exposing its expected API: ' + url));
          return;
        }
        resolve(url);
      };
      script.onerror = function() {
        reject(new Error('Unable to load web asset: ' + url));
      };
      (globalThis.document.head || globalThis.document.documentElement).appendChild(script);
    }).catch(function(error) {
      PRDC_JSLAB_WEB_FILES._asset_requests.delete(url);
      throw error;
    });
    PRDC_JSLAB_WEB_FILES._asset_requests.set(url, promise);
    return promise;
  }

  /**
   * Loads scripts sequentially when later scripts depend on earlier globals.
   * @param {Array<Object|string>} assets Script descriptors or paths.
   * @returns {Promise<Array<string>>} Loaded absolute URLs.
   */
  static async loadScripts(assets) {
    var loaded = [];
    for(var asset of assets || []) {
      if(typeof asset == 'string') {
        loaded.push(await PRDC_JSLAB_WEB_FILES.loadScript(asset));
      } else {
        loaded.push(await PRDC_JSLAB_WEB_FILES.loadScript(asset.source, asset.available));
      }
    }
    return loaded;
  }
}

exports.PRDC_JSLAB_WEB_FILES = PRDC_JSLAB_WEB_FILES;
