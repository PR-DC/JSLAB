/**
 * @file Versioned browser metadata loading for the shared compiler compiler library
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var active_store = null;
/**
 * Class for verified browser catalog loading and cache ownership.
 */
class PRDC_OMJSL_BROWSER_METADATA {

  /**
   * Connects catalog downloads to the version manifest and optional browser cache.
   * @param {*} base_url Base url.
   * @param {*} manifest Installed compiler content manifest.
   * @param {*} options Host services and operation options.
   */
  constructor(base_url, manifest, options = {}) {
    if(!manifest.integration || manifest.integration.version != 1 || !/^[a-f0-9]{64}$/.test(manifest.integration.content_sha256 || '') || !manifest.integration.web || !manifest.integration.web.metadata) {
      throw new Error('The compiler library browser metadata index is missing.');
    }
    this.base_url = new URL('../', base_url).href;
    this.version = manifest.integration.content_sha256;
    this.index = manifest.integration.web.metadata;
    this.fetch = options.fetch || globalThis.fetch.bind(globalThis);
    this.cache_storage = options.cacheStorage === undefined ? globalThis.caches : options.cacheStorage;
    this.on_progress = options.onProgress;
    this.values = new Map();
    this.pending = new Map();
    this.cache = this.cache_storage ? Promise.resolve().then(() => this.cache_storage.open('openmodelica-jslab-metadata-v1')).catch(() => null) : Promise.resolve(null);
  }

  /**
   * Returns a loaded catalog and rejects access before initialization.
   * @param {*} name Catalog, class or resource name.
   */
  read(name) {
    if(!this.values.has(name)) {
      throw new Error('compiler library metadata is not loaded: ' + name);
    }
    return this.values.get(name);
  }

  /**
   * Reuses a loaded catalog or the pending request for that catalog.
   * @param {*} name Catalog, class or resource name.
   */
  load(name) {
    if(!/^[a-z][a-z-]*\.json$/.test(name) || !Object.hasOwn(this.index, name)) {
      return Promise.reject(new Error('Unknown compiler library metadata: ' + name));
    }
    if(this.values.has(name)) {
      return Promise.resolve(this.values.get(name));
    }
    if(this.pending.has(name)) {
      return this.pending.get(name);
    }
    var promise = this._load(name).catch(error => {
      this.pending.delete(name);
      throw error;
    });
    this.pending.set(name, promise);
    return promise;
  }

  /**
   * Downloads or restores one catalog, verifies its hash and caches the decoded JSON.
   * @param {*} name Catalog, class or resource name.
   */
  async _load(name) {
    var entry = this.index[name];
    if(!entry || entry.file != (name == 'lang.json' ? 'config/' + name + '.gz' : 'metadata/' + name + '.gz') || !/^[a-f0-9]{64}$/.test(entry.sha256 || '')) {
      throw new Error('Invalid compiler library metadata index entry: ' + name);
    }
    var url = new URL(entry.file, this.base_url);
    url.searchParams.set('content', entry.sha256);
    var cache_key = new URL('/.jslab-compiler-metadata/' + entry.sha256 + '/' + name, this.base_url).href;
    var cache = await this.cache;
    var response = cache && (await cache.match(cache_key).catch(() => null));
    var bytes;
    var downloaded = false;
    if(response) {
      bytes = new Uint8Array(await response.arrayBuffer());
      if((await PRDC_OMJSL_BROWSER_METADATA.digest(bytes)) != entry.sha256) {
        await cache.delete(cache_key).catch(() => false);
        bytes = null;
      }
    }
    if(!bytes) {
      downloaded = true;
      response = await this.fetch(url.href, {
        cache: 'force-cache'
      });
      if(!response.ok) {
        throw new Error('compiler library metadata could not be loaded: ' + name);
      }
      bytes = new Uint8Array(await response.arrayBuffer());
      // Some hosts apply Content-Encoding to a .gz URL. Fetch has already
      // decoded that response; decode only an actual gzip byte stream.
      if(bytes[0] == 31 && bytes[1] == 139) {
        bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      }
      if((await PRDC_OMJSL_BROWSER_METADATA.digest(bytes)) != entry.sha256) {
        throw new Error('compiler library metadata version mismatch: ' + name);
      }
    }
    var value = JSON.parse(new TextDecoder().decode(bytes));
    if(downloaded && cache) {
      await cache.put(cache_key, new Response(bytes, {
        headers: {
          'Content-Type': 'application/json'
        }
      })).catch(() => {});
    }
    this.values.set(name, value);
    return value;
  }

  /**
   * Loads the requested catalogs and reports completed download counts.
   * @param {*} names Names.
   */
  async loadAll(names) {
    if(!Array.isArray(names)) {
      throw new Error('Provide an array of compiler library metadata names.');
    }
    var unique = Array.from(new Set(names));
    var completed = 0;
    return Promise.all(unique.map(async name => {
      var value = await this.load(name);
      if(typeof this.on_progress == 'function') {
        this.on_progress({
          completed: ++completed,
          total: unique.length
        });
      }
      return value;
    }));
  }

  /**
   * Calculates the SHA-256 fingerprint used to verify downloaded catalogs.
   * @param {*} bytes Bytes.
   */
  static async digest(bytes) {
    var hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
  }

  /**
   * * * * Loads the reviewed catalogs required by the compiler host.
   * @param {*} base_url Base url.
   * @param {*} manifest Installed compiler content manifest.
   * @param {*} options Host services and operation options.
   */
  static async initializeMetadata(base_url, manifest, options = {}) {
    active_store = new PRDC_OMJSL_BROWSER_METADATA(base_url, manifest, options);
    var names = options.metadata === undefined ? Object.keys(active_store.index).filter(name => !['repository-libraries.json', 'metadata-version.json'].includes(name)) : options.metadata;
    await active_store.loadAll(names);
    return active_store;
  }

  /**
   * * * * Reads and caches a compiler catalog from its configured directory.
   * @param {*} name Catalog, class or resource name.
   */
  static readMetadata(name) {
    if(!active_store) {
      throw new Error('Initialize the browser compiler library before reading metadata.');
    }
    return active_store.read(name);
  }

}
exports.PRDC_OMJSL_BROWSER_METADATA = PRDC_OMJSL_BROWSER_METADATA;
exports.initializeMetadata = PRDC_OMJSL_BROWSER_METADATA.initializeMetadata;
exports.readMetadata = PRDC_OMJSL_BROWSER_METADATA.readMetadata;
