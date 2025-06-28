/**
 * @file Download libs
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
 
// Import modules
const fs = require('fs');
const rimraf = require('rimraf');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});
const path = require('path');
const { extractFull } = require('node-7z');
const bin_path = require('7zip-bin').path7za;

require('../init-config.js');

console.log('[dev-download-libs.js] Started');
var t = performance.now();

// Variables
var force = process.argv.includes('--force');
var confirm = process.argv.includes('--confirm');

if(confirm) {
  readline.question("Download libs? yes/[no]: ", function(answer) {
    if(answer == 'yes') {
      main();
    } else {
      console.log('Libs download aborted.');
      console.log('[dev-download-libs.js] Execution done in ' + ((performance.now() - t) / 1000).toFixed(3) + ' s');
      process.exit();
    }
    readline.close();
  });
} else {
  main();
}

async function main() {
  if(force) {
    console.log('Deleting all libs...');
    rimraf.sync('./lib');
  }

  for(const lib of config.USED_LIBS) {
    const libDir = path.join('./lib', lib);
    const serverLibDir = path.join(config.SERVER_LIBS_PATH, lib);
    const serverLib7z = path.join(config.SERVER_LIBS_PATH, `${lib}.7z`);
    const lib7z = path.join('./lib', `${lib}.7z`);

    // Check if lib folder exists locally
    if(!fs.existsSync(libDir)) {
      if(fs.existsSync(serverLibDir)) {
        process.stdout.write(`Downloading ${lib}...`);
        await fs.promises.cp(serverLibDir, libDir, { recursive: true });
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(`Downloading of ${lib} complete.`);
      } else if(fs.existsSync(serverLib7z)) {
        await copyWithProgress(lib, serverLib7z, lib7z);
        await extractWithProgress(lib, lib7z, './lib');
      } else {
        console.log(`[ERROR] Neither folder nor .7z found for ${lib}.`);
      }
    } else {
      console.log(`Lib ${lib} already downloaded.`);
    }
  }

  console.log('\nAll libraries downloaded.');
  console.log('[download-libs.js] Execution done in ' + ((performance.now() - t) / 1000).toFixed(3) + ' s');
  process.exit();
}

// Function to copy files with progress
async function copyWithProgress(lib, src, dest) {
  return new Promise((resolve, reject) => {
    const total_size = fs.statSync(src).size;
    let copied = 0;

    const read_stream = fs.createReadStream(src);
    const write_stream = fs.createWriteStream(dest);

    read_stream.on('data', (chunk) => {
      copied += chunk.length;
      const progress = ((copied / total_size) * 100).toFixed(2);

      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`Downloading ${lib}: ${progress}% (${copied}/${total_size})`);
    });

    read_stream.pipe(write_stream);

    write_stream.on('finish', () => {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      console.log(`Downloading of ${lib} complete.`);
      resolve();
    });

    read_stream.on('error', reject);
    write_stream.on('error', reject);
  });
}

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