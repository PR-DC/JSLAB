/**
 * @file Compares the 6-DOF integration result with a native solver reference
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const crypto = require('crypto');

/**
 * Class for verifying simulation data against a matching native solver result.
 */
class PRDC_JSLAB_SIMULATE_NATIVE_REFERENCE {

  /**
   * Compares prescribed motion, joint torques and platform dynamics on the requested grid.
   * @param {string} filename Native result CSV with adjacent source and settings.
   * @param {string} source Exact source used for the current simulation.
   * @param {Object} data Simulation variable arrays.
   * @param {Object} options Explicit simulation settings.
   * @returns {Object} Per-variable differences and the combined comparison result.
   */
  static compare(filename, source, data, options) {
    if(!options || !Number.isInteger(options.intervals) || options.intervals < 1 ||
        !Number.isFinite(options.start_time) || !Number.isFinite(options.stop_time) || options.stop_time <= options.start_time ||
        !Number.isFinite(options.tolerance) || options.tolerance <= 0) {
      throw new Error('Native comparison requires explicit valid simulation settings.');
    }
    var native_source = filename.replace(/_res\.csv$/i, '.mo');
    if(native_source == filename) {
      throw new Error('The native reference must use the <model>_res.csv filename.');
    }
    var hash = value => crypto.createHash('sha256').update(value).digest('hex');
    if(hash(fs.readFileSync(native_source)) != hash(source)) {
      throw new Error('The native reference used a different model source.');
    }
    var initialization = fs.readFileSync(filename.replace(/_res\.csv$/i, '_init.xml'), 'utf8');
    var experiment = /<DefaultExperiment\b([^>]+)>/.exec(initialization);
    if(!experiment) {
      throw new Error('The native reference has no simulation settings.');
    }
    var settings = Object.fromEntries(Array.from(experiment[1].matchAll(/([A-Za-z_]\w*)\s*=\s*"([^"]*)"/g), match => [match[1], match[2]]));
    var expected = { startTime: options.start_time, stopTime: options.stop_time,
      stepSize: (options.stop_time - options.start_time) / options.intervals, tolerance: options.tolerance };
    for(const [name, value] of Object.entries(expected)) {
      var native_value = Number(settings[name]);
      if(!Number.isFinite(native_value) || Math.abs(native_value - value) > Number.EPSILON * Math.max(1e-30, Math.abs(value)) * 16) {
        throw new Error('Native simulation settings do not match: ' + name);
      }
    }
    if(settings.solver != options.solver) {
      throw new Error('The native reference used a different solver.');
    }
    var lines = fs.readFileSync(filename, 'utf8').trim().split(/\r?\n/);
    var columns = Array.from(lines[0].matchAll(/"((?:[^"]|"")*)"(?:,|$)/g), match => match[1].replaceAll('""', '"'));
    var names = Object.keys(data);
    var indices = names.map(function(name) {
      var index = columns.indexOf(name);
      if(index < 0) {
        throw new Error('Missing native result column: ' + name);
      }
      return index;
    });
    var native = Object.fromEntries(names.map(name => [name, []]));
    for(const line of lines.slice(1)) {
      var row = line.split(',');
      names.forEach((name, index) => native[name].push(Number(row[indices[index]])));
    }
    var intervals = options.intervals, start = options.start_time, stop = options.stop_time;
    var step = (stop - start) / intervals;
    function grid(values) {
      var result = new Map();
      values.time.forEach(function(time, index) {
        var position = Math.round((time - start) / step);
        if(Math.abs(time - start - position * step) < 1e-9) {
          result.set(position, index);
        }
      });
      return result;
    }
    var native_grid = grid(native), actual_grid = grid(data);
    var differences = [];
    for(const name of names) {
      // Derived accelerations amplify integration error. Thresholds use each
      // signal's physical units, independently of the solver's state tolerance.
      var acceleration = /\.a$|M\.(?:a_0|z_a)\[/.test(name);
      var torque = /\.tau$/.test(name);
      var absolute_tolerance = name == 'time' ? 1e-9 : torque ? 1e-3 : acceleration ? 1e-4 : 1e-7;
      var relative_tolerance = name == 'time' ? 0 : torque || acceleration ? 1e-6 : 1e-8;
      var maximum = 0, scaled_maximum = 0, maximum_time = start, failures = 0;
      for(var position = 0; position <= intervals; position++) {
        if(!native_grid.has(position) || !actual_grid.has(position)) {
          throw new Error('Missing requested comparison time: ' + (start + position * step));
        }
        var reference = native[name][native_grid.get(position)];
        var actual = data[name][actual_grid.get(position)];
        if(!Number.isFinite(reference) || !Number.isFinite(actual)) {
          throw new Error('Non-finite result: ' + name);
        }
        var error = Math.abs(reference - actual);
        if(error > maximum) {
          maximum = error;
          maximum_time = start + position * step;
        }
        scaled_maximum = Math.max(scaled_maximum, error / Math.max(1, Math.abs(reference)));
        if(error > absolute_tolerance + relative_tolerance * Math.abs(reference)) {
          failures++;
        }
      }
      differences.push({ name: name, maximum: maximum, scaled_maximum: scaled_maximum,
        maximum_time: maximum_time, absolute_tolerance: absolute_tolerance,
        relative_tolerance: relative_tolerance, failures: failures });
    }
    var generator = /generationTool\s*=\s*"([^"]*)"/.exec(initialization);
    return { success: differences.every(item => !item.failures), source_sha256: hash(source),
      native_compiler: generator && generator[1], series: names.length,
      samples_per_series: intervals + 1, native_samples: native.time.length, worker_samples: data.time.length,
      maximum_absolute_difference: Math.max(...differences.map(item => item.maximum)),
      maximum_scaled_difference: Math.max(...differences.map(item => item.scaled_maximum)), differences: differences };
  }
}

exports.PRDC_JSLAB_SIMULATE_NATIVE_REFERENCE = PRDC_JSLAB_SIMULATE_NATIVE_REFERENCE;
