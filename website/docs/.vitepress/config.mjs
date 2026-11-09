import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const base = process.env.VITEPRESS_BASE || (process.env.NODE_ENV === 'production' ? '/' : '/docs/')

export default withMermaid(defineConfig({
  title: 'Megadex',
  description: 'User profile, preferences, and reference-data microservice',
  base,
  vite: {
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
        text: 'Overview',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Core Concepts', link: '/guide/concepts' },
          { text: 'Admin UI', link: '/guide/admin' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Docker Compose', link: '/guide/docker' },
          { text: 'Environment Variables', link: '/guide/env' },
          { text: 'Database & Migrations', link: '/guide/database' },
          { text: 'Production Guide', link: '/guide/production' },
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
          { text: 'Health Checks', link: '/guide/api-health' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Request Flow & Pipeline', link: '/guide/architecture' },
          { text: 'Security & ACLs', link: '/guide/security' },
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
