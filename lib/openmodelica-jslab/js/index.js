/**
 * @file Shared compiler library entry point for compiler hosts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

Object.assign(
  exports,
  require('./assets'),
  require('./client'),
  require('./annotations'),
  require('./units'),
  require('./localization'),
  require('./diagnostics'),
  require('./editing'),
  require('./modifiers'),
  require('./values'),
  require('./expressions'),
  require('./choices'),
  require('./icons'),
  require('./parser')
);
