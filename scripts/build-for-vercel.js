#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.cwd();
const publicDir = path.join(root, 'public');

// Clean public directory
if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true, force: true });
}
fs.mkdirSync(publicDir, { recursive: true });

try {
  // Build web app (outputs to apps/web/dist)
  console.log('🏗️  Building web...');
  execSync('pnpm --filter @met/web build', { cwd: root, stdio: 'inherit' });
  fs.readdirSync(path.join(root, 'apps/web/dist')).forEach(f => {
    const s = path.join(root, 'apps/web/dist', f);
    const d = path.join(publicDir, f);
    fs.cpSync(s, d, { recursive: true, force: true });
  });

  // Build and copy socio
  console.log('🏗️  Building socio...');
  execSync('pnpm --filter @met/socio build -- --base=/socio/', { cwd: root, stdio: 'inherit' });
  const socioDest = path.join(publicDir, 'socio');
  fs.mkdirSync(socioDest, { recursive: true });
  fs.readdirSync(path.join(root, 'apps/socio/dist')).forEach(f => {
    const s = path.join(root, 'apps/socio/dist', f);
    const d = path.join(socioDest, f);
    fs.cpSync(s, d, { recursive: true, force: true });
  });

  // Build and copy backoffice
  console.log('🏗️  Building backoffice...');
  execSync('pnpm --filter @met/backoffice build -- --base=/bo/', { cwd: root, stdio: 'inherit' });
  const boDest = path.join(publicDir, 'bo');
  fs.mkdirSync(boDest, { recursive: true });
  fs.readdirSync(path.join(root, 'apps/backoffice/dist')).forEach(f => {
    const s = path.join(root, 'apps/backoffice/dist', f);
    const d = path.join(boDest, f);
    fs.cpSync(s, d, { recursive: true, force: true });
  });

  // Build and copy kiosk
  console.log('🏗️  Building kiosk...');
  execSync('pnpm --filter @met/kiosk build -- --base=/kiosk/', { cwd: root, stdio: 'inherit' });
  const kioskDest = path.join(publicDir, 'kiosk');
  fs.mkdirSync(kioskDest, { recursive: true });
  fs.readdirSync(path.join(root, 'apps/kiosk/dist')).forEach(f => {
    const s = path.join(root, 'apps/kiosk/dist', f);
    const d = path.join(kioskDest, f);
    fs.cpSync(s, d, { recursive: true, force: true });
  });

  console.log('✅ Build complete! public/ ready for deployment');
} catch (e) {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
}
