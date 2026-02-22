"use strict";

/**
 * Core JSL module slots that are internal but not declared in config.SUBMODULES.
 * Keep this list as the single source for runtime/checker core module protection.
 */
const CORE_INTERNAL_MODULE_NAMES = Object.freeze([
  "env",
  "eval",
  "override",
  "plotter",
  "context",
]);

/**
 * Additional slots checked by the dev inter-usage checker.
 * These are not submodule instances, but should still be referenced via jsl.inter.
 */
const CHECKER_PROTECTED_SLOT_NAMES = Object.freeze([
  "lang",
  "config",
]);

exports.CORE_INTERNAL_MODULE_NAMES = CORE_INTERNAL_MODULE_NAMES;
exports.CHECKER_PROTECTED_SLOT_NAMES = CHECKER_PROTECTED_SLOT_NAMES;
