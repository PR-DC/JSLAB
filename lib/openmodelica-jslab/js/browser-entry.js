/**
 * @file Lazy browser entry point for OpenModelicaJSLAB
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

import library from './index.js';
import assets from './assets.js';
import platform from './host-electron.js';
/**
 * Class for initializing browser compiler integration.
 */
class PRDC_OMJSL_BROWSER_ENTRY {

  /**
   * Loads browser catalogs and configures the worker URL without starting the solver.
   * @param {*} options Host services and operation options.
   */
  static async initialize(options = {}) {
    const base_url = options.baseURL || new URL('./', import.meta.url).href;
    const fetch_resource = options.fetch || globalThis.fetch.bind(globalThis);
    let manifest = options.manifest;
    if(!manifest) {
      const response = await fetch_resource(new URL('../manifest.json', base_url).href, {
        cache: 'no-cache'
      });
      if(!response.ok) {
        throw new Error('The solver manifest could not be loaded.');
      }
      manifest = await response.json();
    }
    await assets.initializeMetadata(base_url, manifest, options);
    platform.setWorkerRoot(base_url, manifest.integration.content_sha256);
    return library;
  }

}
export const initialize = PRDC_OMJSL_BROWSER_ENTRY.initialize;
export { library };
export default library;
