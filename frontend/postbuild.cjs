const fs = require('fs');
const path = require('path');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

const src = path.join(__dirname, '.output', 'public');
const dest = path.join(__dirname, 'dist');

if (fs.existsSync(src)) {
  if (fs.existsSync(dest)) {
    try {
      fs.rmSync(dest, { recursive: true, force: true });
    } catch (e) {
      console.warn('Warning: could not delete existing dist directory, overwriting instead.');
    }
  }
  copyFolderRecursiveSync(src, dest);
  console.log('Successfully copied .output/public to dist!');
} else {
  console.error('.output/public directory does not exist.');
}
