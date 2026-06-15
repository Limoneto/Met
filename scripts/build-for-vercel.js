#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.cwd();
const publicDir = path.join(root, '.vercel/output/static');

console.log(`📍 Working directory: ${root}`);

// Clean public directory
console.log('🧹 Cleaning public directory...');
if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true, force: true });
}
fs.mkdirSync(publicDir, { recursive: true });
console.log(`✓ public/ created at ${publicDir}`);

function runBuild(app, baseFlag) {
  console.log(`\n🏗️  Building ${app}...`);
  const cmd = baseFlag
    ? `pnpm --filter @met/${app} build -- --base=${baseFlag}`
    : `pnpm --filter @met/${app} build`;

  console.log(`   Running: ${cmd}`);
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit' });
    console.log(`✓ ${app} built successfully`);
  } catch (e) {
    console.error(`✗ ${app} build failed: ${e.message}`);
    throw e;
  }
}

function copyDist(appName, destSubdir) {
  const src = path.join(root, `apps/${appName}/dist`);
  const dest = destSubdir ? path.join(publicDir, destSubdir) : publicDir;

  console.log(`   Copying ${src} → ${dest}`);

  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }

  if (destSubdir && !fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  fs.readdirSync(src).forEach(f => {
    const s = path.join(src, f);
    const d = path.join(dest, f);
    fs.cpSync(s, d, { recursive: true, force: true });
  });

  console.log(`✓ Copied to ${destSubdir || 'root'}`);
}

try {
  runBuild('web', null);
  copyDist('web', null);

  runBuild('socio', '/socio/');
  copyDist('socio', 'socio');

  runBuild('backoffice', '/bo/');
  copyDist('backoffice', 'bo');

  runBuild('kiosk', '/kiosk/');
  copyDist('kiosk', 'kiosk');

  console.log('\n✅ Build complete!');
  console.log(`   public/ directory ready at ${publicDir}`);
  const files = fs.readdirSync(publicDir);
  console.log(`   Contents: ${files.join(', ')}`);

} catch (e) {
  console.error('\n❌ Build failed:', e.message);
  process.exit(1);
}
