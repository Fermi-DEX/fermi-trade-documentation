import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function sourcePages(root = process.cwd()) {
  return readdirSync(root).filter((file) => file === 'README.md' || /^\d{2}-.+\.md$/.test(file)).sort().map((file) => {
    const body = readFileSync(path.join(root, file), 'utf8');
    const heading = body.match(/^#\s+(.+)$/m)?.[1] || file;
    return {
      file, body,
      slug: file === 'README.md' ? '' : file.replace(/^\d{2}-/, '').replace(/\.md$/, ''),
      title: file === 'README.md' ? 'Fermi documentation' : heading.replace(/^\d+\s*[·.\-–—]\s*/, ''),
    };
  });
}

// Rewrite actual Markdown links, leaving code examples and source files untouched.
export function remarkDocLinks() {
  const routes = new Map(sourcePages().map((page) => [page.file, `/${page.slug ? page.slug + '/' : ''}`]));
  function walk(node) {
    // Starlight supplies the page H1; additional source H1s become sections.
    if (node.type === 'heading' && node.depth === 1) node.depth = 2;
    if ((node.type === 'link' || node.type === 'definition') && node.url) {
      const match = node.url.match(/^(?:\.\/)?([^/#?]+\.md)(#[^?]*)?$/);
      if (match && routes.has(match[1])) node.url = routes.get(match[1]) + (match[2] || '');
    }
    node.children?.forEach(walk);
  }
  return walk;
}
