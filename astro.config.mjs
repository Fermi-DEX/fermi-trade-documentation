import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { navigation, domain } from './site.config.mjs';
import { remarkDocLinks } from './scripts/content.mjs';

export default defineConfig({
  site: process.env.SITE_URL || `https://${domain}`,
  trailingSlash: 'always',
  markdown: { remarkPlugins: [remarkDocLinks] },
  integrations: [starlight({
    title: 'fermi',
    description: 'Fermi Trade protocol documentation and integration reference.',
    customCss: ['./src/styles/fermi.css'],
    social: [{ icon: 'github', label: 'Documentation on GitHub', href: 'https://github.com/Fermi-DEX/fermi-trade-documentation' }],
    editLink: { baseUrl: 'https://github.com/Fermi-DEX/fermi-trade-documentation/edit/main/' },
    sidebar: navigation,
    components: { SiteTitle: './src/components/SiteTitle.astro' },
    head: [{ tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' } }],
    expressiveCode: { themes: ['github-dark', 'github-light'] },
  })],
});
