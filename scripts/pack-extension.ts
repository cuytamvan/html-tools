import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist-extension');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string };
const manifest = JSON.parse(readFileSync(resolve(root, 'extension/manifest.json'), 'utf8')) as {
  version: string;
};

manifest.version = pkg.version || '0.0.0';
writeFileSync(resolve(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

for (const extra of ['sw.js', 'background.js']) {
  const file = resolve(out, extra);
  if (existsSync(file)) unlinkSync(file);
}

const indexPath = resolve(out, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = html.replace(/\s*<link rel="manifest" href="\.\/manifest.json" \/>/, '');
html = html.replace(/ crossorigin/g, '');
writeFileSync(indexPath, html);
writeFileSync(resolve(out, 'popup.html'), html.replace('<html lang="en">', '<html lang="en" class="ext-popup">'));
