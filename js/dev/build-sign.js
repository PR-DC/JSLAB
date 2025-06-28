/**
 * @file Build sign
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
 
require('../init-config.js');

console.log('[build-sign.js] Started');
var t = performance.now();

if(!process.env.COMPANY_NAME) {
  console.error('Environment variable COMPANY_NAME must be defined!');
}
if(!process.env.TIMESTAMP_SERVER) {
  console.error('Environment variable TIMESTAMP_SERVER must be defined!');
}
if(!process.env.SIGN_TOOL_PATH) {
  console.error('Environment variable SIGN_TOOL_PATH must be defined!');
}

const { execSync } = require('child_process');


/**
 * Signs a specified file using the digital signature tool and parameters defined in the application's configuration. The
 * function reads the configuration to obtain the path to the signing tool, the company name for the signature, and other
 * necessary parameters. It then constructs the command to execute the signing process and runs it using `execSync`.
 * 
 * @param {Object} data - An object containing parameters for the signing process.
 * @param {string} data.path - The path to the file that needs to be signed.
 * @param {string} data.hash - The hash algorithm to use for signing (e.g., 'sha256').
 */
exports.default = function(data) {
  console.info('Signing '+data.path+' with '+data.hash+' to '+config.COMPANY_NAME);
  
  const sha256 = data.hash === 'sha256';
  const appendCert = sha256 ? '/as' : null;
  const timestamp = sha256 ? '/tr' : '/t';
  const appendTd = sha256 ? '/td sha256' : null;

  let args = [
    '"'+config.SIGN_TOOL_PATH+'"',
    'sign',
    '/debug',
    '/n',
    '"'+config.COMPANY_NAME+'"',
    '/a',
    appendCert,
    '/fd',
    data.hash,
    timestamp,
    config.TIMESTAMP_SERVER,
    appendTd,
    '/v',
    `"${data.path}"`
  ];

  try {
    const { stdout } = execSync(args.join(' '));
    console.log(stdout);
  } catch(err) {
    throw err;
  }
  
  console.log('[build-sign.js] ' + ((performance.now()-t)/1000).toFixed(3) + ' s');
};