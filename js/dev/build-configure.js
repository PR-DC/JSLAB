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
require('../init-config.js');

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

if(config.SIGN_BUILD) {
  data.build.win.sign = "js/dev/build-sign.js";
} else {
  delete data.build.win.sign;
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