import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const base = process.env.VITEPRESS_BASE || (process.env.NODE_ENV === 'production' ? '/' : '/docs/')

export default withMermaid(defineConfig({
  title: 'Megadex',
  description: 'User management service storing user accounts, social handles, preferences, and localized lookup lists',
  base,
  vite: {
    // mermaid >= 11.16 pulls CJS-only fastdom, which vitepress-plugin-mermaid does not pre-bundle
    optimizeDeps: {
      include: ['fastdom', 'fastdom/extensions/fastdom-promised.js'],
    },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: false,
    sidebar: [
      {
        items: [
          { text: 'Overview', link: '/guide/overview' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Docker Compose', link: '/guide/deployment' },
          { text: 'Environment Variables', link: '/guide/configuration' },
          { text: 'Integration', link: '/guide/integration' },
          { text: 'Troubleshooting', link: '/guide/troubleshooting' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Users', link: '/guide/api-users' },
          { text: 'Social Networks', link: '/guide/api-socials' },
          { text: 'Reference Lookups', link: '/guide/api-lookups' },
          { text: 'Preferences', link: '/guide/api-preferences' },
          { text: 'Audit Logs', link: '/guide/api-audit-logs' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Request Flow', link: '/guide/architecture' },
          { text: 'Data Model', link: '/guide/data-model' },
          { text: 'Frontend Integration', link: '/guide/frontend' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ALTEN-group/Megadex' },
    ],
    footer: {
      message: 'Published and maintained by ALTEN',
    },
  },
}))
