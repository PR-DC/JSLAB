/**
 * @file JSLAB command-line argument parsing
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');

/**
 * Validates CLI options before starting the runtime.
 * @param {Array<string>} args Command-line arguments.
 * @returns {Object} Parsed options.
 */
function parseOptions(args) {
  var options = { cwd: process.cwd(), timeout: 0, history: true, argv: [] };
  for(var i = 0; i < args.length; i++) {
    var arg = args[i];
    if(arg === '--') { options.argv = args.slice(i + 1); break; }
    if(arg === '-h' || arg === '--help') options.help = true;
    else if(arg === '-v' || arg === '--version') options.version = true;
    else if(arg === '--json') options.json = true;
    else if(arg === '--batch') options.batch = true;
    else if(arg === '--no-history') options.history = false;
    else if(['-e', '--eval', '--cwd', '--timeout', '--history-file'].includes(arg)) {
      if(i + 1 >= args.length) throw new Error('Missing value for ' + arg);
      var value = args[++i];
      if(arg === '-e' || arg === '--eval') {
        if(options.code !== undefined) throw new Error('Specify only one evaluation.');
        options.code = value;
      } else if(arg === '--timeout') {
        options.timeout = Number(value);
        if(!Number.isFinite(options.timeout) || options.timeout <= 0) throw new Error('Timeout must be a positive number of seconds.');
      } else if(arg === '--cwd') options.cwd = path.resolve(value);
      else options.history_file = path.resolve(value);
    } else if(arg.startsWith('-') && arg !== '-') throw new Error('Unknown option: ' + arg);
    else {
      if(options.file !== undefined) throw new Error('Specify one script; use -- before script arguments.');
      options.file = arg === '-' ? '-' : path.resolve(arg);
    }
  }
  if(options.file !== undefined && options.code !== undefined) throw new Error('Choose a script or --eval.');
  return options;
}

exports.parseOptions = parseOptions;
