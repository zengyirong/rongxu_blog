import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: '荣叙 的技术博客',
  description: 'Vue / TypeScript / 工程化 / AI · 学习与项目实践',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }]
  ],

  // 上线后改为真实域名，例如 https://YOUR_DOMAIN
  sitemap: {
    hostname: 'https://YOUR_DOMAIN'
  },

  themeConfig: {
    logo: '/avatar/placeholder.svg',
    siteTitle: '荣叙',
    appearance: true,

    nav: [
      { text: '首页', link: '/' },
      { text: '技术文章', link: '/posts/frontend/' },
      { text: '项目实践', link: '/projects/' },
      { text: '足迹', link: '/links/' },
      { text: '关于我', link: '/about/' },
      { text: 'GitHub', link: 'https://github.com/zengyirong/rongxu_blog' }
    ],

    sidebar: {
      '/posts/frontend/': [
        {
          text: 'Frontend',
          items: [
            { text: '概览', link: '/posts/frontend/' },
            { text: 'Vue3 响应式原理', link: '/posts/frontend/vue/vue3-reactivity' }
          ]
        }
      ],
      '/posts/engineering/': [
        {
          text: 'Engineering',
          items: [
            { text: '概览', link: '/posts/engineering/' },
            { text: 'VitePress 博客起步', link: '/posts/engineering/vitepress-blog-starter' }
          ]
        }
      ],
      '/posts/architecture/': [
        {
          text: 'Architecture',
          items: [{ text: '概览', link: '/posts/architecture/' }]
        }
      ],
      '/posts/ai/': [
        {
          text: 'AI',
          items: [{ text: '概览', link: '/posts/ai/' }]
        }
      ],
      '/posts/notes/': [
        {
          text: 'Notes',
          items: [{ text: '概览', link: '/posts/notes/' }]
        }
      ],
      '/projects/': [
        {
          text: '项目实践',
          items: [{ text: '概览', link: '/projects/' }]
        }
      ]
    },

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zengyirong/rongxu_blog' }
    ],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 荣叙'
    },

    outline: {
      label: '本页目录',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最后更新'
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色'
  }
})
