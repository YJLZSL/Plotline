#!/usr/bin/env node
// E2: 版本一致性校验 —— 比对 package.json / src-tauri/Cargo.toml / src-tauri/tauri.conf.json。
// 用于本地 `pnpm check:version` 与 CI 前置步骤，结束三处版本号人工同步。
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'));

const pkg = read('package.json');
const tauri = read('src-tauri/tauri.conf.json');
const cargoText = readFileSync(resolve(root, 'src-tauri/Cargo.toml'), 'utf8');
const cargoVersion = /^version\s*=\s*"([^"]+)"$/m.exec(cargoText)?.[1];

const versions = new Map([
  ['package.json', pkg.version],
  ['src-tauri/tauri.conf.json', tauri.version],
  ['src-tauri/Cargo.toml', cargoVersion],
]);

const entries = [...versions.entries()];
const expected = entries[0]?.[1];
const mismatches = entries.filter(([, version]) => version !== expected);

if (!expected || mismatches.length > 0) {
  console.error('❌ 版本号不一致:');
  for (const [file, version] of entries) {
    console.error(`   ${file}: ${version ?? '缺失'}`);
  }
  process.exit(1);
}

console.log(`✅ 版本号一致: ${expected}`);
