#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';

// Recursive copy function
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

try {
  console.log('📁 Building apps...');
  const { execSync } = require('child_process');

  execSync('pnpm --filter @met/web build', { cwd: root, stdio: 'inherit' });
  execSync('pnpm --filter @met/socio build -- --base=/socio/', { cwd: root, stdio: 'inherit' });
  execSync('pnpm --filter @met/backoffice build -- --base=/bo/', { cwd: root, stdio: 'inherit' });
  execSync('pnpm --filter @met/kiosk build -- --base=/kiosk/', { cwd: root, stdio: 'inherit' });

  console.log('📋 Copying to public/...');
  const publicDir = path.join(root, 'public');
  if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true });

  copyDir(path.join(root, 'apps/web/dist'), publicDir);
  copyDir(path.join(root, 'apps/socio/dist'), path.join(publicDir, 'socio'));
  copyDir(path.join(root, 'apps/backoffice/dist'), path.join(publicDir, 'bo'));
  copyDir(path.join(root, 'apps/kiosk/dist'), path.join(publicDir, 'kiosk'));

  console.log('✅ Build complete!');
} catch (e) {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
}
