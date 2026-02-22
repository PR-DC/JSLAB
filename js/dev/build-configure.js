/**
 * @file Native modules build
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
 
// Import the filesystem module
const fs = require('fs');

global.process_arguments = process.argv;
require('../shared/init-config.js');

console.log('[build-configure.js] Started');
var t = performance.now();

// Change package.json
console.log('Changing package.json...');
var data = JSON.parse(fs.readFileSync('package.json'));
var filename = data.name+'_'+data.version;
if(process.argv.length > 3) {
  var action = process.argv[3];
  if(action == 'dist-portable') {
    filename += '_portable';
  }
}

data.build.artifactName = filename+'.${ext}';

var sign_env = [
  {name: 'COMPANY_NAME', value: config.COMPANY_NAME},
  {name: 'TIMESTAMP_SERVER', value: config.TIMESTAMP_SERVER},
  {name: 'SIGN_TOOL_PATH', value: config.SIGN_TOOL_PATH},
];
var missing_sign_env = sign_env.filter(function(e) {
  return !e.value || !String(e.value).trim();
}).map(function(e) {
  return e.name;
});

if(config.SIGN_BUILD && missing_sign_env.length === 0) {
  data.build.win.sign = "js/dev/build-sign.js";
} else {
  delete data.build.win.sign;
  if(config.SIGN_BUILD) {
    console.warn('Signing requested, but missing environment variables: '+
      missing_sign_env.join(', ')+'. Build will continue unsigned.');
  }
}

fs.writeFileSync('package.json', JSON.stringify(data, null, 2));

// Creating binding.gyp
console.log('Creating binding.gyp...');
var binding_data = {targets: []};

// - Native module
if(fs.existsSync('cpp/binding.gyp')) {
  var data = JSON.parse(fs.readFileSync('cpp/binding.gyp'));
  if(!Array.isArray(data)) {
    data = [data];
  }
  for(var i = 0; i < data.length; i++) {
    binding_data.targets[i] = data[i];
    binding_data.targets[i].defines = ["NAPI_DISABLE_CPP_EXCEPTIONS"];
  }
}

// - Libs binding.gyp
config.COMPILE_LIBS.forEach(function(lib) {
  var data = JSON.parse(fs.readFileSync('lib/'+lib+'/binding.gyp'));
  binding_data.targets.push(data);
});

// - Save binding.gyp
fs.writeFileSync('binding.gyp', JSON.stringify(binding_data, null, 2));

// Create bin folder
if(!fs.existsSync('bin/')) {
  fs.mkdirSync('bin/');
}

console.log('[build-configure.js] ' + ((performance.now()-t)/1000).toFixed(3) + ' s');
