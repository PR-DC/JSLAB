/**
 * @file Browser storage-backed workspace filesystem for JSLAB web
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var WORKSPACE_ROOT = '/workspace';

/**
 * Escapes a path segment for regex use.
 * @param {string} text
 * @returns {string}
 */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class PRDC_JSLAB_WEB_FS {

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
    var path = this.normalizePath(virtual_path);
    var dir_path = this.dirname(path);
    var data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this._ensureMemoryDirectory(dir_path);
    this.memory_files.set(path, {
      data: Uint8Array.from(data),
      lastModified: Date.now()
    });

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
    var path = this.normalizePath(virtual_path);
    var dir_path = this.dirname(path);
    var data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this._ensureMemoryDirectory(dir_path);
    this.memory_files.set(path, {
      data: Uint8Array.from(data),
      lastModified: Date.now()
    });
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
    for await(var [name, handle] of dir_handle.entries()) {
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
    for await(var [name, handle] of dir_handle.entries()) {
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
    for await(var [name, handle] of dir_handle.entries()) {
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
    for await(var [name] of this.workspace_dir.entries()) {
      await this.workspace_dir.removeEntry(name, { recursive: true });
    }
  }
}

exports.PRDC_JSLAB_WEB_FS = PRDC_JSLAB_WEB_FS;
