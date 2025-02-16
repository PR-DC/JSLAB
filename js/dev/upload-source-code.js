/**
 * @file Upload source code
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
 
// Import modules
const fs = require('fs');
const dircompare = require('dir-compare');
const path = require('path');

const { PRDC_APP_CONFIG } = require("../../config/config");

console.log('[upload-source-code.js] Started');
var t = performance.now();

if(!process.env.SERVER_PATH) {
  console.error('Environment variable SERVER_PATH must be defined!');
}
if(!process.env.SERVER_LIBS_PATH) {
  console.error('Environment variable SERVER_LIBS_PATH must be defined!');
}

// Variables
var config = new PRDC_APP_CONFIG();

const options = { 
  compareSize: config.UPLOAD_COMPARE_SIZE,
  compareContent: config.UPLOAD_COMPARE_CONTENT,
  compareDate: config.UPLOAD_COMPARE_DATE,
  excludeFilter: config.SOURCE_UPLOAD_EXCLUDE.join(',')
};

// Compare directories
console.log('Comparing directories...');
var result = dircompare.compareSync('.', config.SERVER_SOURCE_PATH, options);

console.log('Statistics: \n Equal entries: %s, \n Distinct entries: %s, \n Left only entries: %s, \n Right only entries: %s, \n Differences: %s\n',
  result.equal, result.distinct, result.left, result.right, result.differences);

if(result.differences) {
  // Analyzing different files
  console.log('Analyzing different files...');
  result.diffSet.forEach(function(dif) {
    if(dif.type1 == 'file' || dif.type2 == 'file') {
      if(dif.state != 'equal') {
        switch(dif.state) {
          case 'distinct':
            if(!config.UPLOAD_COMPARE_SIZE_ON_DISTINCT || dif.date1 >= dif.date2) {
              console.log('File ' + path.join(dif.relativePath, dif.name1) + ' changed.');
            } else {
              console.log('File ' + path.join(dif.relativePath, dif.name1) + ' last modified on server.');
            }
            break;
          case 'left':
            console.log('File ' + path.join(dif.relativePath, dif.name1) + ' missing on server.');
            break;
          case 'right':
            console.log('File ' + path.join(dif.relativePath, dif.name2) + ' exists only on server.');
            break;
          default:
            console.log('Unhandled state for: ');
            console.log(dif);
        }

        if(['distinct', 'left'].includes(dif.state)) {
          if(!dif.date2 || !config.UPLOAD_COMPARE_SIZE_ON_DISTINCT || dif.date1 >= dif.date2) {
            console.log(' Uploading file to server...');
            
            if(!dif.date2) {
              fs.mkdirSync(path.join(config.SERVER_SOURCE_PATH, dif.relativePath), { recursive: true });
              fs.copyFileSync(path.join(dif.path1, dif.name1), 
                path.join(config.SERVER_SOURCE_PATH, dif.relativePath, dif.name1));
            } else {
              fs.mkdirSync(dif.path2, { recursive: true });
              fs.copyFileSync(path.join(dif.path1, dif.name1), 
                path.join(dif.path2, dif.name2));
            }
          }
        }
        //console.log(dif);
      }
    }
  });
} else {
  console.log('No different files...');
}
console.log('[upload-source-code.js] Execution done in ' + ((performance.now()-t)/1000).toFixed(3) + ' s');