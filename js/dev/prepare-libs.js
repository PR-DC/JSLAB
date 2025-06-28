/**
 * @file Prepare libs
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
 
// Import modules
const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');
const { extractFull } = require('node-7z');
const bin_path = require('7zip-bin').path7za;

require('../init-config.js');

console.log('[prepare-libs.js] Started');
var t = performance.now();

async function main() {
  for(const lib of config.COMPRESSED_LIBS) {
    const lib_dir = path.join('./lib', lib);
    const lib_7z = path.join('./lib', `${lib}.7z`);

    // Check if lib folder exists locally
    if(!fs.existsSync(lib_dir)) {
      await extractWithProgress(lib, lib_7z, './lib');
    } else {
      console.log(`Lib ${lib} already uncompressed.`);
    }
  }

  console.log('\nAll libraries ready.');
  console.log('[prepare-libs.js] Execution done in ' + ((performance.now() - t) / 1000).toFixed(3) + ' s');
}

main();

// Function to extract .7z with progress
async function extractWithProgress(lib, archive, dest) {
  return new Promise((resolve, reject) => {
    const extractor = extractFull(archive, dest, {
      $bin: bin_path,
      $progress: true
    });

    extractor.on('progress', (progress) => {
      const percent = progress.percent.toFixed(0);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`Extracting ${lib}: ${percent}%`);
    });

    extractor.on('end', () => {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      console.log(`Extraction of ${lib} complete.`);
      fs.unlinkSync(archive);
      resolve();
    });

    extractor.on('error', (err) => {
      console.error(`Extraction error for ${lib}:`, err);
      fs.unlinkSync(archive);
      reject(err);
    });
  });
}