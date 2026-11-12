/**
 * @file Lazy browser asset loading for JSLAB web
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var pending_scripts = new Map();

/**
 * Resolves an asset path against the web application root.
 * @param {string} source Asset path or URL.
 * @returns {string} Absolute asset URL.
 */
function resolveAssetUrl(source) {
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
function loadScript(source, available) {
  if(typeof available == 'function' && available()) {
    return Promise.resolve(resolveAssetUrl(source));
  }
  var url = resolveAssetUrl(source);
  if(pending_scripts.has(url)) return pending_scripts.get(url);

  var promise = new Promise(function(resolve, reject) {
    var script = globalThis.document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.async = true;
    script.dataset.jslabLazyAsset = 'true';
    script.onload = function() {
      if(typeof available == 'function' && !available()) {
        reject(new Error('The web asset loaded without exposing its expected API: '+url));
        return;
      }
      resolve(url);
    };
    script.onerror = function() {
      reject(new Error('Unable to load web asset: '+url));
    };
    (globalThis.document.head || globalThis.document.documentElement).appendChild(script);
  }).catch(function(error) {
    pending_scripts.delete(url);
    throw error;
  });
  pending_scripts.set(url, promise);
  return promise;
}

/**
 * Loads scripts sequentially when later scripts depend on earlier globals.
 * @param {Array<Object|string>} assets Script descriptors or paths.
 * @returns {Promise<Array<string>>} Loaded absolute URLs.
 */
async function loadScripts(assets) {
  var loaded = [];
  for(var asset of assets || []) {
    if(typeof asset == 'string') {
      loaded.push(await loadScript(asset));
    } else {
      loaded.push(await loadScript(asset.source, asset.available));
    }
  }
  return loaded;
}

exports.loadScript = loadScript;
exports.loadScripts = loadScripts;
exports.resolveAssetUrl = resolveAssetUrl;
