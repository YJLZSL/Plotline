import { appDataDir } from '@tauri-apps/api/path';
import { mkdir, readDir, readFile, writeFile, exists } from '@tauri-apps/plugin-fs';

import { isWebMode } from '@/lib/ipc';

const FONT_STYLE_ID = 'plotline-imported-fonts';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function familyNameFromFileName(name: string): string {
  return name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
}

function formatFromFileName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? 'ttf';
  switch (ext) {
    case 'otf':
      return 'opentype';
    case 'woff':
      return 'woff';
    case 'woff2':
      return 'woff2';
    default:
      return 'truetype';
  }
}

async function getFontsDir(): Promise<string> {
  const appData = await appDataDir();
  return `${appData}/fonts`;
}

export async function listImportedFonts(): Promise<string[]> {
  if (isWebMode()) return [];
  const dir = await getFontsDir();
  if (!(await exists(dir))) return [];
  const entries = await readDir(dir);
  return entries
    .filter((e) => e.isFile && /\.(ttf|otf|woff|woff2)$/i.test(e.name))
    .map((e) => e.name);
}

export async function importFont(file: File): Promise<string> {
  if (isWebMode()) {
    throw new Error('字体导入仅在桌面端可用');
  }
  const dir = await getFontsDir();
  await mkdir(dir, { recursive: true });
  const safeName = sanitizeFileName(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeFile(`${dir}/${safeName}`, bytes);
  return familyNameFromFileName(safeName);
}

export async function loadImportedFontFaces(): Promise<void> {
  if (isWebMode()) return;
  const names = await listImportedFonts();
  if (names.length === 0) return;

  const dir = await getFontsDir();
  let style = document.getElementById(FONT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = FONT_STYLE_ID;
    document.head.appendChild(style);
  }

  const rules: string[] = [];
  for (const name of names) {
    const bytes = await readFile(`${dir}/${name}`);
    const blob = new Blob([bytes], { type: 'font/ttf' });
    const url = URL.createObjectURL(blob);
    const family = familyNameFromFileName(name);
    rules.push(
      `@font-face { font-family: "${family}"; src: url("${url}") format("${formatFromFileName(name)}"); font-display: swap; }`,
    );
  }
  style.textContent = rules.join('\n');
}
