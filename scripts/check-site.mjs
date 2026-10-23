import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { sourcePages } from './content.mjs';

const root = path.resolve('dist');
const pages = sourcePages();
const failures = [];
const documents = new Map();
for (const page of pages) {
  const location = `/${page.slug ? page.slug + '/' : ''}`;
  const file = path.join(root, page.slug, 'index.html');
  const { document } = parseHTML(await readFile(file, 'utf8'));
  documents.set(location, document);
  if (document.querySelector('h1')?.textContent.trim() !== page.title) failures.push(`Wrong title: ${location}`);
  if (document.querySelectorAll('h1').length !== 1) failures.push(`Multiple page headings: ${location}`);
  if (!document.querySelector('.sl-markdown-content')?.textContent.trim()) failures.push(`Empty content: ${location}`);
}
for (const [location, document] of documents) {
  for (const element of document.querySelectorAll('a[href], img[src], script[src], link[rel="stylesheet"][href]')) {
    const value = element.getAttribute('href') || element.getAttribute('src');
    if (!value || /^(https?:|mailto:|tel:|data:|javascript:)/i.test(value) || value.startsWith('//')) continue;
    const url = new URL(value, `https://docs.fermi.trade${location}`);
    const target = documents.get(url.pathname);
    if (target) {
      if (url.hash && !target.getElementById(decodeURIComponent(url.hash.slice(1)))) failures.push(`${location}: missing anchor ${value}`);
      continue;
    }
    if (url.pathname === '/admin/' || url.pathname === '/404/') continue;
    const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (path.resolve(root, relative).startsWith(root + path.sep)) {
      try { await access(path.join(root, relative)); continue; } catch {}
    }
    failures.push(`${location}: missing local resource ${value}`);
  }
}
await access(path.join(root, 'pagefind/pagefind.js'));
await access(path.join(root, 'admin/assets/decap-cms.js'));
const config = JSON.parse(await readFile(path.join(root, 'admin/config.yml'), 'utf8'));
if (config.collections[0].files.length !== pages.length) failures.push('Editor is missing documentation files');
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exitCode = 1;
} else console.log(`Verified ${pages.length} rendered pages, internal links and anchors, local assets, search index, and editor configuration.`);
