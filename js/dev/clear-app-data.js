/**
 * @file Clear app data
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
 
// Import modules
const fs = require('fs');
const os = require('os');
const rimraf = require('rimraf');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const { PRDC_APP_CONFIG } = require("../../config/config");
var data = JSON.parse(fs.readFileSync('package.json'));

console.log('[clear-app-data.js] Started');
var t = performance.now();

// Variables
var config = new PRDC_APP_CONFIG();

var confirm = process.argv.includes('--confirm');

if(confirm) {
  readline.question("Clear app data? yes/[no]: ", function(answer) {
    if(answer == 'yes') {
      main();
    } else {
      console.log('Action aborted.');
      console.log('[clear-app-data.js] Execution done in ' + ((performance.now()-t)/1000).toFixed(3) + ' s');
      process.exit();
    }
    readline.close();
  });
} else {
  main();
}

function main() {
  var path = os.homedir()+'\\AppData\\Roaming\\'+data.name;
  console.log('Clearing app data from '+path);
  rimraf.sync(path);
  
  console.log('[clear-app-data.js] Execution done in ' + ((performance.now()-t)/1000).toFixed(3) + ' s');
  process.exit();
}
