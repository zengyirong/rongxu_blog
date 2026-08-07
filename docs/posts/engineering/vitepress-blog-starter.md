---
title: VitePress 博客起步
description: 用 VitePress + pnpm 搭个人静态博客的最小步骤与目录约定。
date: 2026-08-07
category: engineering
tags:
  - VitePress
  - pnpm
  - 博客
outline: deep
---

## 背景

个人技术博客 V1 选择 VitePress：Markdown 即内容、构建为静态 HTML、可接 Cloudflare Pages 自动部署。

## 最小命令

```bash
pnpm install
pnpm docs:dev
pnpm docs:build
```

- 开发：`docs:dev`
- 产物：`docs/.vitepress/dist`
- 部署构建命令与本地 `docs:build` 保持一致

## 目录约定

```text
docs/
├── index.md          # 首页
├── posts/            # 技术文章（按栏目）
├── projects/         # 项目实践
├── about/            # 关于我
├── public/           # 静态资源
└── .vitepress/       # 配置与主题
```

## Frontmatter

```yaml
---
title: 文章标题
description: 一句话摘要
date: 2026-08-07
category: engineering
tags:
  - VitePress
---
```

## 部署要点

| 项 | 值 |
|---|---|
| Install | `pnpm install` |
| Build | `pnpm docs:build` |
| Output | `docs/.vitepress/dist` |
| Branch | `main` |

## 小结

先跑通骨架与一篇示例文，再写内容；系统功能按计划文档迭代，避免一上来做评论、后台和自建图床。
