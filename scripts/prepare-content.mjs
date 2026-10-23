import { mkdir, writeFile, copyFile, readdir, rm } from 'node:fs/promises';
import { sourcePages } from './content.mjs';
import { repository, domain } from '../site.config.mjs';

const pages = sourcePages();
await rm('src/content/docs', { recursive: true, force: true });
await mkdir('src/content/docs', { recursive: true });
await mkdir('public/admin', { recursive: true });
for (const page of pages) {
  const metadata = {
    title: page.title,
    editUrl: `https://github.com/${repository}/edit/main/${page.file}`,
  };
  // JSON is valid YAML frontmatter. All originals remain canonical at repo root.
  const content = `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${page.body.replace(/^# .+\r?\n/, '')}`;
  await writeFile(`src/content/docs/${page.slug || 'index'}.md`, content);
}

// JSON is also valid YAML for Decap's configuration loader.
const config = {
  backend: { name: 'github', repo: repository, branch: 'main', base_url: `https://${domain}`, auth_endpoint: 'oauth/auth' },
  site_url: `https://${domain}`,
  display_url: `https://${domain}`,
  logo_url: '/wordmark.svg',
  publish_mode: 'editorial_workflow',
  media_folder: 'public/uploads',
  public_folder: '/uploads',
  collections: [{
    name: 'documentation', label: 'Documentation',
    files: pages.map((page) => ({
      name: page.slug || 'index', label: page.title, file: page.file,
      fields: [{ label: 'Markdown', name: 'body', widget: 'markdown' }],
    })),
  }],
};
await writeFile('public/admin/config.yml', JSON.stringify(config, null, 2) + '\n');
await rm('public/admin/assets', { recursive: true, force: true });
await mkdir('public/admin/assets', { recursive: true });
for (const file of await readdir('node_modules/decap-cms/dist')) {
  if (!file.endsWith('.map')) await copyFile(`node_modules/decap-cms/dist/${file}`, `public/admin/assets/${file}`);
}
console.log(`Prepared ${pages.length} pages and the self-hosted Markdown editor.`);
