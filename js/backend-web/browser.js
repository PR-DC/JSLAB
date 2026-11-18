/**
 * @file JSLAB browser host discovery and runtime capabilities
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Reads browser host facts without constructing a renderer or scientific runtime.
 */
class PRDC_JSLAB_WEB_BROWSER {
  /**
   * Finds the same-origin parent application bridge.
   * @returns {Object|null} Parent bridge when available.
   */
  static getBridge() {
      try {
        if(globalThis.parent && globalThis.parent.__JSLAB_WEB_BRIDGE__) {
          return globalThis.parent.__JSLAB_WEB_BRIDGE__;
        }
      } catch{}
      return null;
    }

  /**
   * Detects browser runtime mode and available host capabilities.
   * @returns {Object} Runtime capability metadata.
   */
  static runtimeInfo() {
    var protocol = '';
    var origin = '';
    var supports_local_storage = false;

    try {
      protocol = globalThis.location && globalThis.location.protocol ? globalThis.location.protocol : '';
      origin = globalThis.location && typeof globalThis.location.origin == 'string'
        ? globalThis.location.origin
        : '';
    } catch{}

    try {
      supports_local_storage = !!globalThis.localStorage;
    } catch{}

    return {
      protocol: protocol,
      origin: origin,
      is_local_file: protocol == 'file:',
      is_served: protocol == 'http:' || protocol == 'https:',
      is_secure_context: !!globalThis.isSecureContext,
      supports_opfs: !!(globalThis.navigator &&
        globalThis.navigator.storage &&
        typeof globalThis.navigator.storage.getDirectory == 'function'),
      supports_save_picker: typeof globalThis.showSaveFilePicker == 'function',
      supports_open_picker: typeof globalThis.showOpenFilePicker == 'function',
      supports_directory_picker: typeof globalThis.showDirectoryPicker == 'function',
      supports_web_serial: !!(globalThis.navigator &&
        globalThis.navigator.serial &&
        typeof globalThis.navigator.serial.getPorts == 'function'),
      supports_local_storage: supports_local_storage,
      supports_download_fallback: !!(typeof Blob != 'undefined' &&
        globalThis.URL &&
        typeof globalThis.URL.createObjectURL == 'function'),
      workspace_storage_mode: 'memory',
      workspace_storage_label: 'Ephemeral memory storage'
    };
  }
}

exports.PRDC_JSLAB_WEB_BROWSER = PRDC_JSLAB_WEB_BROWSER;
