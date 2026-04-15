import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "AI as Workspace",
  description: "新一代 LLM 客户端",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config


    socialLinks: [
      { icon: 'github', link: 'https://github.com/NitroRCr/AIaW' }
    ],
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          /**
           * @type {Pick<import('minisearch').Options, 'extractField' | 'tokenize' | 'processTerm'>}
           */
          options: {
            /* ... */
          },
          /**
           * @type {import('minisearch').SearchOptions}
           * @default
           * { fuzzy: 0.2, prefix: true, boost: { title: 4, text: 2, titles: 1 } }
           */
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 }
          }
        },
        detailedView: true
      }
    },
    outline: {
      level: [2, 3]
    }
  },
  head: [
    ['link', { rel: 'icon', href: '/icon-256x256.png' }]
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Usage', link: '/usage/' },
          { text: 'Self-Hosting Guide', link: '/self-host/' },
          { text: 'Web Version', link: 'https://aiaw.app' },
          { text: 'Client Download', link: 'https://github.com/NitroRCr/AIaW/releases/latest' }
        ],
        sidebar: [
          {
            text: 'Usage',
            items: [
              { text: 'Features Overview', link: '/usage/' },
              { text: 'Usage Tips', link: '/usage/usage-tips' },
              { text: 'Artifacts', link: '/usage/artifacts' },
              { text: 'File Parsing', link: '/usage/file-parse' },
              { text: 'Cross-Platform', link: '/usage/cross-platform' },
              { text: 'Plugins', link: '/usage/plugins' },
              { text: 'MCP Plugin', link: '/usage/mcp' },
              { text: 'Plugin Configuration & Development', link: '/usage/plugin-dev' },
              { text: 'Prompt Variables', link: '/usage/prompt-vars' },
              { text: 'Assistants', link: '/usage/assistants' },
              { text: 'Data & Sync', link: '/usage/data-sync' },
              { text: 'Custom Provider', link: '/usage/custom-provider' },
              { text: 'Share Link', link: '/usage/share-link' },
              { text: 'Common Issues', link: '/usage/common-issues' }
            ]
          },
          {
            text: 'Self-Hosting Guide',
            items: [
              { text: 'Quick Docker Deployment', link: '/self-host/' },
              { text: 'Advanced Deployment', link: '/self-host/advanced' }
            ]
          },
          {
            text: 'Privacy Policy',
            link: '/privacy-policy/'
          },
          {
            text: 'Migrate to Nya AI',
            link: '/migration/'
          }
        ]
      }
    },
    zh: {
      label: '中文',
      lang: 'zh',
      themeConfig: {
        nav: [
          { text: '使用文档', link: '/zh/usage/' },
          { text: '自部署指南', link: '/zh/self-host/' },
          { text: '网页版', link: 'https://aiaw.app' },
          { text: '客户端下载', link: 'https://github.com/NitroRCr/AIaW/releases/latest' }
        ],
        sidebar: [
          {
            text: '使用文档',
            items: [
              { text: '功能概览', link: '/zh/usage/' },
              { text: '使用技巧', link: '/zh/usage/usage-tips' },
              { text: 'Artifacts', link: '/zh/usage/artifacts' },
              { text: '文件解析', link: '/zh/usage/file-parse' },
              { text: '跨平台', link: '/zh/usage/cross-platform' },
              { text: '插件系统', link: '/zh/usage/plugins' },
              { text: 'MCP 插件', link: '/zh/usage/mcp' },
              { text: '插件配置与开发', link: '/zh/usage/plugin-dev' },
              { text: '提示词变量', link: '/zh/usage/prompt-vars' },
              { text: '助手', link: '/zh/usage/assistants' },
              { text: '数据与同步', link: '/zh/usage/data-sync' },
              { text: '自定义服务商', link: '/zh/usage/custom-provider' },
              { text: '中转站对接', link: '/zh/usage/share-link' },
              { text: '常见问题', link: '/zh/usage/common-issues' }
            ]
          },
          {
            text: '自部署指南',
            items: [
              { text: 'Docker 快速部署', link: '/zh/self-host/' },
              { text: '进阶部署', link: '/zh/self-host/advanced' }
            ]
          },
          {
            text: '隐私政策',
            link: '/zh/privacy-policy/'
          },
          {
            text: '迁移至 Nya AI',
            link: '/zh/migration/'
          }
        ]
      }
    }
  }
})
