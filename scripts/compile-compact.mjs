#!/usr/bin/env node
/**
 * Cross-platform Compact compiler runner for AuraVote
 * Invokes the Midnight Compact compiler natively or via WSL
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const contractFile = 'contract/auravote.compact';
const outputDir = 'contract/managed/auravote';

console.log('🌙 ========================================================');
console.log('🌙 Midnight Compact Compiler Runner — AuraVote Protocol');
console.log('🌙 ========================================================\n');

if (!fs.existsSync(path.join(projectRoot, contractFile))) {
  console.error(`❌ Contract file not found: ${contractFile}`);
  process.exit(1);
}

const skipZk = process.argv.includes('--skip-zk');
const args = ['compile'];
if (skipZk) {
  args.push('--skip-zk');
}
args.push(contractFile, outputDir);

console.log(`🔨 Source Contract : ${contractFile}`);
console.log(`📦 Target Output   : ${outputDir}`);
console.log(`⚡ Mode            : ${skipZk ? 'Fast Compilation (--skip-zk)' : 'Full Proving Key & ZKIR Generation'}`);
console.log('⏳ Running Compact compiler...\n');

let compileSuccess = false;

// If on Windows, Windows 'compact.exe' is the built-in NTFS compression utility.
// Therefore, we invoke the Midnight Compact compiler inside WSL or check for genuine compactc.
if (process.platform === 'win32') {
  try {
    const wslCmd = `~/.local/bin/compact ${args.join(' ')}`;
    console.log(`🔄 Invoking Midnight Compact compiler in WSL: ${wslCmd}`);
    execSync(`wsl ${wslCmd}`, { stdio: 'inherit' });
    compileSuccess = true;
  } catch (err) {
    console.error('❌ WSL compilation failed:', err.message);
  }
} else {
  try {
    const result = spawnSync('compact', args, { stdio: 'inherit' });
    if (result.status === 0) {
      compileSuccess = true;
    }
  } catch (e) {
    console.error('❌ Compact binary execution failed:', e.message);
  }
}

if (!compileSuccess) {
  console.error('\n❌ Compilation failed. Ensure the Compact compiler is installed.');
  process.exit(1);
}

console.log('\n✅ Compilation Succeeded!');
console.log('📂 Generated Artifacts in contract/managed/auravote:');

const inspectDir = (subdir, label) => {
  const fullPath = path.join(projectRoot, outputDir, subdir);
  if (fs.existsSync(fullPath)) {
    console.log(`\n  📁 [${label}] ${subdir}/`);
    const files = fs.readdirSync(fullPath);
    files.forEach(f => {
      const stats = fs.statSync(path.join(fullPath, f));
      const sizeKb = (stats.size / 1024).toFixed(1);
      console.log(`     • ${f.padEnd(28)} (${sizeKb} KB)`);
    });
  }
};

inspectDir('zkir', 'Zero-Knowledge Intermediate Representation (Circuits)');
inspectDir('keys', 'Zero-Knowledge SNARK Prover & Verifier Keys');
inspectDir('contract', 'TypeScript & JavaScript Contract Bindings');
inspectDir('compiler', 'Compiler Structural Metadata');

console.log('\n🌟 Ready for tests and Preprod deployment!\n');
