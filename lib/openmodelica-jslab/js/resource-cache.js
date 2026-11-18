/**
 * @file Content-addressed solver and library downloads for browser workers
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for verifying and caching compiler binary resources.
 */
class PRDC_OMJSL_RESOURCE_CACHE {

  /**
   * Checks resource bytes against the expected SHA-256 fingerprint.
   * @param {*} bytes Bytes.
   * @param {*} expected Expected.
   * @param {*} crypto Crypto.
   */
  static async verified(bytes, expected, crypto) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    return actual == expected;
  }

  /**
   * Reuses verified cached bytes or downloads and verifies the requested binary.
   * @param {*} url Url.
   * @param {*} expected Expected.
   * @param {*} download Download.
   * @param {*} options Host services and operation options.
   */
  static async readVerifiedResource(url, expected, download, options = {}) {
    if(!/^[a-f0-9]{64}$/.test(expected || '')) {
      throw new Error('The solver resource has no valid content fingerprint.');
    }
    const resource = new URL(url);
    const crypto = options.crypto || globalThis.crypto;
    const cache_storage = options.cacheStorage === undefined ? globalThis.caches : options.cacheStorage;
    let cache = null,
      key = null;
    if(resource.protocol != 'file:') {
      key = new URL('/.jslab-sdk-binary/' + expected, resource).href;
      if(cache_storage) {
        try {
          cache = await cache_storage.open('openmodelica-jslab-binary-v1');
        } catch(error) {}
      }
      resource.searchParams.set('content', expected);
    }
    if(cache) {
      const stored = await cache.match(key).catch(() => null);
      if(stored) {
        const bytes = new Uint8Array(await stored.arrayBuffer());
        if(await PRDC_OMJSL_RESOURCE_CACHE.verified(bytes, expected, crypto)) {
          if(typeof options.onCacheHit == 'function') {
            options.onCacheHit(bytes);
          }
          return bytes;
        }
        await cache.delete(key).catch(() => false);
      }
    }
    const bytes = await download(resource.href);
    if(!(await PRDC_OMJSL_RESOURCE_CACHE.verified(bytes, expected, crypto))) {
      throw new Error('The solver resource does not match its version fingerprint.');
    }
    if(cache) {
      await cache.put(key, new Response(bytes, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(bytes.byteLength)
        }
      })).catch(() => {});
    }
    return bytes;
  }

}
export const readVerifiedResource = PRDC_OMJSL_RESOURCE_CACHE.readVerifiedResource;
