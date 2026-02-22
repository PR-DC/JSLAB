/**
 * @file Init config
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
"use strict";

const { PRDC_APP_CONFIG } = require("../../config/config.js");

// Global variables
global.config = createConfigProxy(new PRDC_APP_CONFIG());

// Conditional variables
if(typeof global.process_arguments != 'undefined' && Array.isArray(global.process_arguments)) {
  var args = global.process_arguments.map(function(e) { return e.toLowerCase(); });
  if(args.includes("--debug-app")) {
    global.config.DEBUG = true;
  }
  if(args.includes("--test-app") || args.includes("--auto-test-app")) {
    global.config.TEST = true;
  }
  if(args.includes("--sign-build")) {
    global.config.SIGN_BUILD = true;
  }
}

/**
 * Creates a Proxy wrapper around the configuration object that logs any
 * attempts to read or write unknown (non-existent) properties.
 * 
 * @param {Object} root_config - The original configuration object instance to wrap.
 * @returns {Object} A proxied configuration object that logs unknown property access.
 */
function createConfigProxy(root_config) {
  const already_reported = new Set();
  const proxy_cache = new WeakMap();

  function isPlainObject(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
  }

  function logUnknown(kind, path, value, target) {    
    const key = `${kind}:${path}`;
    if(already_reported.has(key)) return;
    already_reported.add(key);

    const msgBase = `Attempted to ${kind.toUpperCase()} unknown property '${path}'`;
    const msg = value !== undefined
      ? `${msgBase} = ${JSON.stringify(value)}`
      : msgBase;
      
    if(typeof app_logger != 'undefined') {
      app_logger.logMessage(true, true, 0, 'Config', msg);
    } else {
      console.error(msg);
    }
  }

  function wrapObject(obj, base_path) {
    if(!isPlainObject(obj)) return obj;
    if(proxy_cache.has(obj)) return proxy_cache.get(obj);

    const p = new Proxy(obj, {
      get(target, prop, receiver) {
        if(typeof prop !== 'string') {
          return Reflect.get(target, prop, receiver);
        }

        const path = base_path ? `${base_path}.${prop}` : prop;

        if(!(prop in target)) {
          logUnknown('read', path, undefined, root_config);
          return undefined;
        }

        const value = Reflect.get(target, prop, receiver);
        return isPlainObject(value) ? wrapObject(value, path) : value;
      },

      set(target, prop, value, receiver) {
        if(typeof prop === 'string') {
          const path = base_path ? `${base_path}.${prop}` : prop;
          if(!(prop in target)) {
            logUnknown('write', path, value, root_config);
          }
        }
        return Reflect.set(target, prop, value, receiver);
      }
    });

    proxy_cache.set(obj, p);
    return p;
  }

  return new Proxy(root_config, {
    get(target, prop, receiver) {
      if(typeof prop !== 'string') {
        return Reflect.get(target, prop, receiver);
      }

      if(!(prop in target)) {
        logUnknown('read', prop, undefined, target);
        return undefined;
      }

      const value = Reflect.get(target, prop, receiver);
      return isPlainObject(value) ? wrapObject(value, prop) : value;
    },

    set(target, prop, value, receiver) {
      if(typeof prop === 'string' && !(prop in target)) {
        logUnknown('write', prop, value, target);
      }
      return Reflect.set(target, prop, value, receiver);
    }
  });
}
