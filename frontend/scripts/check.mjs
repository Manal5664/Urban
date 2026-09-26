import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const required = [
  'index.html',
  'src/main.js',
  'src/app.js',
  'src/styles.css',
  'src/navigation.js',
  'src/api/contracts.js',
  'src/api/index.js',
  'src/api/filters.js',
  'src/api/map-adapter.js',
  'src/api/client.js',
  'src/api/view-models.js',
  'src/data/demo-data.js',
  'src/data/page-data.js',
  'src/pages/index.js',
];

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await javascriptFiles(path)));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

for (const file of required) {
  try {
    await readFile(join(root, file));
  } catch {
    throw new Error(`Missing required frontend file: ${file}`);
  }
}

const jsFiles = await javascriptFiles(join(root, 'src'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Syntax check failed for ${relative(root, file)}\n${result.stderr}`);
  }
}

const contracts = await readFile(join(root, 'src/api/contracts.js'), 'utf8');
if ((contracts.match(/state: 'contract-only'/g) ?? []).length < 10) {
  throw new Error('API contracts are not explicitly marked as contract-only.');
}

const demo = await readFile(join(root, 'src/data/demo-data.js'), 'utf8');
if (!demo.includes('DEMO / MOCK') || !demo.includes('not production')) {
  throw new Error('Demo fixtures are missing their explicit non-production marker.');
}

const pageIndex = await readFile(join(root, 'src/pages/index.js'), 'utf8');
for (const page of ['executive', 'demand', 'routes-stops', 'delays', 'occupancy', 'forecasting', 'clustering', 'passenger-flow', 'what-if', 'recommendations', 'data-quality', 'system']) {
  if (!pageIndex.includes(page)) throw new Error(`Page registry is missing ${page}.`);
}

const { renderPage } = await import('../src/pages/index.js');
const pages = ['executive', 'demand', 'routes-stops', 'delays', 'occupancy', 'forecasting', 'clustering', 'passenger-flow', 'what-if', 'recommendations', 'data-quality', 'system'];
for (const mode of ['demo', 'api']) {
  for (const page of pages) {
    const markup = renderPage(page, mode);
    if (typeof markup !== 'string' || markup.length < 200) {
      throw new Error(`Page render smoke failed for ${page}/${mode}.`);
    }
    if (mode === 'api') {
      const leakedDemoValue = ['18,420', '87.4%', '128.6k', 'R-101', 'R-107', 'R-214', '+6.8%'].find((value) => markup.includes(value));
      if (leakedDemoValue) throw new Error(`Demo value leaked into API mode on ${page}: ${leakedDemoValue}`);
    }
  }
}

const domRoot = { innerHTML: '' };
globalThis.document = { title: '', querySelector: () => domRoot, addEventListener: () => {} };
globalThis.location = { hash: '#/executive' };
globalThis.localStorage = { getItem: () => 'demo', setItem: () => {} };
globalThis.requestAnimationFrame = (callback) => callback();
globalThis.window = { location: globalThis.location };
const { mountApp } = await import('../src/app.js');
mountApp();
if (!domRoot.innerHTML.includes('main-content')) throw new Error('Application shell mount smoke failed.');

console.log(`Frontend foundation check passed: ${jsFiles.length} JavaScript files, ${required.length} required entry files, ${pages.length * 2} page/mode renders, shell mount.`);
