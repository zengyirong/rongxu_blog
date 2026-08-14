---
title: 从 0 到 1：VitePress + GitHub + Cloudflare Pages 实现自动 CI/CD
description: 第一次完整实践个人静态博客从 GitHub 代码托管、Cloudflare Pages 部署到 push 自动构建发布的全过程记录
date: 2026-08-10
tags:
  - VitePress
  - GitHub
  - Cloudflare
  - CI/CD
  - 部署
  - 前端工程化
---

# 从 0 到 1：VitePress + GitHub + Cloudflare Pages 实现自动 CI/CD

> 记录时间：2026-08-10  
> 项目：`zengyirong/rongxu_blog`  
> Cloudflare Pages 项目：`rongxu-blog`  
> 生产分支：`main`  
> 线上地址： `https://rongxu-blog.pages.dev/`
>
> 这是我第一次从 0 到 1 完整跑通一个项目的 CI/CD：从注册 Cloudflare、授权 GitHub 仓库、配置构建，到网站第一次成功上线，再到后续本地 `git push` 后 Cloudflare 自动构建和自动发布。

---

## 1. 这次最终实现了什么

最终链路是：

```text
本地开发
   ↓
git add / commit / push
   ↓
GitHub 仓库
   ↓
Cloudflare Pages 检测到代码变化
   ↓
Clone 仓库
   ↓
准备 Node.js / pnpm
   ↓
pnpm install
   ↓
pnpm docs:build
   ↓
VitePress 生成静态文件
   ↓
Cloudflare 上传构建产物
   ↓
部署到全球网络
   ↓
rongxu-blog.pages.dev
```

这里需要先建立一个重要认识：

> **CI/CD 不等于 GitHub Actions。**

这次项目没有写 `.github/workflows/*.yml`，CI/CD 依然成立。

因为：

```text
GitHub
负责：代码仓库、提交记录、分支

Cloudflare Pages
负责：监听 GitHub → 安装依赖 → Build → Deploy
```

在本项目里：

- **CI（Continuous Integration，持续集成）**：拉代码、准备环境、安装依赖、执行构建，验证当前提交能否成功产生生产构建产物。
- **CD（Continuous Deployment，持续部署）**：CI 成功以后，把 `docs/.vitepress/dist` 上传到 Cloudflare 并发布到线上。

---

# 2. 技术栈与实际配置

项目使用：

```text
VitePress 1.6.3
Vue 3
TypeScript
Node.js >= 22
pnpm 11.20.0
Git
GitHub
Cloudflare Pages
```

项目根目录的 `package.json` 核心配置如下：

```json
{
  "name": "my-blog",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.20.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vitepress": "^1.6.3",
    "vue": "^3.5.13"
  }
}
```

![项目 package.json](./assets/07-project-package-json.png)

最关键的是：

```json
"docs:build": "vitepress build docs"
```

所以 Cloudflare 的 Build Command 才能配置成：

```bash
pnpm docs:build
```

默认构建产物位于：

```text
docs/.vitepress/dist
```

---

# 3. 部署前，本地必须先做的检查

在接入 CI/CD 之前，先确认生产构建在本地能成功。

```bash
pnpm install
pnpm docs:build
pnpm docs:preview
```

其中：

```bash
pnpm docs:build
```

应该成功生成：

```text
docs/
└─ .vitepress/
   └─ dist/
```

然后：

```bash
pnpm docs:preview
```

检查生产构建，而不是只看开发环境。

这是一个非常重要的习惯：

> `pnpm docs:dev` 能运行，不代表 `pnpm docs:build` 一定成功。

CI 环境真正执行的是生产构建，所以部署前应该先在本地把 Build 跑通。

---

# 4. GitHub 仓库准备

如果项目还没有初始化 Git：

```bash
git init
git add .
git commit -m "feat: initialize personal blog"
git branch -M main
git remote add origin https://github.com/<username>/<repository>.git
git push -u origin main
```

本项目最终仓库：

```text
zengyirong/rongxu_blog
```

日常提交：

```bash
git add .
git commit -m "docs: add new article"
git push
```

建议提交：

```text
package.json
pnpm-lock.yaml
docs/
README.md
配置文件
Markdown 文章
静态资源
```

不要提交：

```text
node_modules/
docs/.vitepress/cache/
docs/.vitepress/dist/
```

原因是 `dist` 本来就应该由 CI 在干净环境里重新构建。

---

# 5. 第一次注册 / 登录 Cloudflare

进入 Cloudflare Dashboard 后，首页可以看到创建应用入口。

![Cloudflare Account Home](./assets/01-cloudflare-account-home.png)

最初目标是：

```text
GitHub Repository
      ↓
Cloudflare Pages
```

而不是手工上传 `dist`。

选择 Git 集成的原因是：后续每次 `git push` 都能触发自动构建与部署。

---

# 6. 第一次连接 GitHub

Cloudflare 会跳转到 GitHub，安装：

```text
Cloudflare Workers and Pages
```

GitHub App。

![GitHub 授权 Cloudflare Workers and Pages](./assets/02-github-app-authorize.png)

这里有两个选择：

```text
All repositories
Only select repositories
```

我选择并推荐：

```text
Only select repositories
```

然后只授权博客仓库：

```text
rongxu_blog
```

## 为什么不直接 All repositories

这是最小权限原则：

```text
Cloudflare 只需要部署博客
        ↓
就只授权博客仓库
```

没必要让一个部署平台同时获得其他无关仓库的访问权限。

以后真的要部署第二个项目，再增加对应仓库权限即可。

---

# 7. 第一次踩坑：误进了 Worker，而不是 Pages

这是这次部署里最值得记录的一个坑。

Cloudflare 新版 UI 会把 Workers 和 Pages 放在同一个区域，很容易进入：

```text
Create a Worker
```

当时页面出现：

```text
Build command

Deploy command:
npx wrangler deploy
```

![误进入 Worker 部署页面](./assets/03-worker-wrong-deploy-page.png)

看到：

```bash
npx wrangler deploy
```

就应该警觉：

> **这是 Worker 的部署路径，不是我们这个纯静态 VitePress 博客需要的 Pages 路径。**

本项目不需要：

```text
Wrangler Worker Deploy
Cloudflare Worker
/functions
后端函数
```

真正需要的是：

```text
Cloudflare Pages
```

在 Worker 创建页面底部可以看到：

```text
Looking to deploy Pages? Get started
```

![从 Worker 页面找到 Pages 入口](./assets/04-worker-page-pages-entry.png)

点击这里进入 Pages。

---

# 8. 正确进入 Cloudflare Pages

进入 Pages 后会看到：

```text
Import an existing Git repository
Drag and drop your files
```

![Cloudflare Pages Get Started](./assets/05-pages-get-started.png)

这里选择：

```text
Import an existing Git repository
```

而不是：

```text
Drag and drop your files
```

两者区别：

```text
Import Git repository
GitHub → 自动 Build → 自动 Deploy
适合 CI/CD

Drag and drop
自己本地 Build → 手工上传 dist
更像手工发布
```

本项目目标就是自动 CI/CD，所以必须走 Git Integration。

---

# 9. 选择 GitHub 仓库

选择已经授权的：

```text
zengyirong/rongxu_blog
```

然后进入构建配置页面。

生产分支：

```text
main
```

意味着：

```text
main 更新
   ↓
触发 Production Deployment
```

---

# 10. Cloudflare Pages 构建配置

Cloudflare Pages 会要求配置：

```text
Framework preset
Build command
Build output directory
Root directory
Environment variables
```

初始配置页面：

![Cloudflare Pages Build Settings](./assets/06-pages-build-settings.png)

本项目最终填写：

```text
Production branch
main

Framework preset
VitePress

Build command
pnpm docs:build

Build output directory
docs/.vitepress/dist

Root directory
留空
```

最终配置：

![Cloudflare Pages 最终构建配置](./assets/08-pages-build-settings-final.png)

## 为什么 Root directory 留空

因为：

```text
package.json
pnpm-lock.yaml
docs/
```

都在 Git 仓库根目录。

Cloudflare 从仓库根目录开始执行：

```bash
pnpm install
pnpm docs:build
```

只有以后项目变成 Monorepo，例如：

```text
repo/
├─ apps/blog/
├─ apps/admin/
└─ packages/
```

才需要考虑单独设置 Root Directory。

---

# 11. Build Output Directory 为什么是这个

VitePress 配置：

```bash
vitepress build docs
```

默认生成：

```text
docs/.vitepress/dist
```

所以 Cloudflare 必须知道：

> “真正需要发布的网站文件在哪个目录？”

因此：

```text
Build output directory:
docs/.vitepress/dist
```

Cloudflare 最终上传的是这个目录，而不是上传整个 GitHub 仓库。

---

# 12. 环境版本配置

本项目使用：

```json
"packageManager": "pnpm@11.20.0"
```

同时要求：

```json
"node": ">=22"
```

为了减少：

```text
本地能 Build
CI 却 Build 失败
```

这种环境差异，推荐尽量固定 CI 环境。

Cloudflare Pages 支持设置：

```text
NODE_VERSION
PNPM_VERSION
```

例如：

```text
PNPM_VERSION = 11.20.0
```

Node 版本应该和本地验证过的版本保持一致。

## 原则

```text
本地 Node
≈
CI Node

本地 pnpm
=
CI pnpm
```

版本越一致，越容易复现问题。

---

# 13. 第一次 Deploy

配置完成：

```text
Save and Deploy
```

Cloudflare 自动开始：

```text
Clone
↓
Install
↓
Build
↓
Upload
↓
Deploy
```

最终出现：

```text
Success! Your project is deployed
```

![Cloudflare Pages 首次部署成功](./assets/09-deploy-success.png)

并获得：

```text
https://rongxu-blog.pages.dev/
```

到这里，第一次从 GitHub 到 Cloudflare 的完整部署已经完成。

---

# 14. 第一次真正看懂 CI/CD Build Log

部署日志可以拆成 5 个阶段。

## 阶段一：Clone GitHub

```text
Cloning repository...

From https://github.com/zengyirong/rongxu_blog

HEAD is now at 9a523b0 修改 README.md

Success: Finished cloning repository files
```

说明：

```text
Cloudflare
    ↓
成功访问 GitHub
    ↓
成功拉到指定 Commit
```

以后排查“线上是不是最新代码”，第一件事就可以看：

```text
HEAD is now at <commit SHA>
```

把它和 GitHub 最新 Commit 对比。

---

## 阶段二：准备 Node / pnpm

日志：

```text
Detected the following tools from environment:
nodejs@22.22.0
pnpm@11.20.0
```

说明构建环境已经准备好。

这是 CI 和“我本地直接上传 dist”的一个核心区别：

> CI 会在远端干净环境中重新准备运行环境和依赖。

---

## 阶段三：安装依赖

```text
Installing project dependencies: pnpm install
```

然后：

```text
Lockfile is up to date, resolution step is skipped
```

最终：

```text
Done in 4.8s using pnpm v11.20.0
```

说明：

```text
pnpm-lock.yaml 正常
依赖安装成功
```

日志里还看到了 pnpm 的真实机制：

```text
Packages are hard linked from the content-addressable store
to the virtual store.
```

对应 pnpm 的：

```text
content-addressable store
        ↓
hard link
        ↓
node_modules/.pnpm
```

这也是一个很好的工程化学习案例。

---

## 阶段四：执行 VitePress Build

```text
Executing user command: pnpm docs:build

$ vitepress build docs
```

然后：

```text
building client + server bundles...
✓

rendering pages...
✓

generating sitemap...
✓

build complete
```

这是 CI 的核心：

```text
当前这份 Commit
      ↓
能不能在干净环境
      ↓
成功生产 Build
```

如果这里失败：

```text
CI Failed
```

后面的发布自然不会继续成功。

---

# 15. CD：上传并发布

Build 成功后：

```text
Deploying your site to Cloudflare's global network...
```

上传：

```text
Uploading... (0/57)
Uploading... (19/57)
Uploading... (38/57)
Uploading... (57/57)
```

最后：

```text
Success! Uploaded 57 files

Success: Assets published!

Success: Your site was deployed!
```

这部分就是 CD：

```text
docs/.vitepress/dist
        ↓
上传 Cloudflare
        ↓
Assets Published
        ↓
Production
```

---

# 16. 第二个踩坑：No Wrangler configuration 不是报错

日志里出现：

```text
No Wrangler configuration file found. Continuing.
```

还出现：

```text
No functions dir at /functions found. Skipping.
```

第一次看到很容易误以为：

```text
是不是缺配置？
是不是部署有问题？
```

但对于当前项目：

```text
VitePress
纯静态网站
Cloudflare Pages
没有 Functions
没有 Worker
```

这是正常信息。

关键看后面是否：

```text
build complete
Success: Assets published!
Success: Your site was deployed!
```

所以读日志时不能只看到 `No xxx found` 就判断失败。

---

# 17. 第三个踩坑：Node / Corepack 的 EBADENGINE Warning

真实日志中出现：

```text
npm warn EBADENGINE Unsupported engine

package: corepack@0.35.0

required:
^22.22.2 || ^24.15.0 || >=26.0.0

current:
node v22.22.0
```

但后续：

```text
pnpm install 成功
VitePress build 成功
Upload 成功
Deploy 成功
```

所以本次属于：

```text
Warning
不是 Error
```

## 怎么判断 Warning 是否需要立即处理

不要看到黄色 Warning 就直接大改配置。

应该继续看：

```text
安装是否成功？
Build 是否成功？
Deploy 是否成功？
```

本次最终部署成功，所以 Warning 没有阻断发布。

## 后续怎么优化

更稳妥的做法是：

1. 本地先验证新的 Node 版本。
2. Cloudflare `NODE_VERSION` 使用同一版本。
3. 再重新部署。
4. 确认 warning 消失并且网站正常。

可以升级到满足日志要求的 Node 版本，例如：

```text
22.22.2+
```

或者在本地验证后迁移到更新的 LTS 大版本。

不要只修改 Cloudflare，而让本地和 CI 变成两套完全不同的环境。

---

# 18. 第四个注意点：Build output 不要写错

正确：

```text
docs/.vitepress/dist
```

注意 Cloudflare 输入框左边本身可能已经显示：

```text
/
```

输入框里仍然只填：

```text
docs/.vitepress/dist
```

不要因为界面有 `/` 就重复写：

```text
//docs/.vitepress/dist
```

也不要误写成：

```text
dist
```

普通 Vue + Vite 项目经常是：

```text
dist
```

但当前是：

```text
VitePress + docs 目录
```

因此路径不同。

---

# 19. 第五个注意点：VitePress 和普通 Vite 项目不能照抄配置

普通 Vue3 + Vite：

```text
Build command
pnpm build

Output
dist
```

当前 VitePress：

```text
Build command
pnpm docs:build

Output
docs/.vitepress/dist
```

部署前不要只凭“都是 Vite”就复制配置。

最可靠的判断方式：

```text
看 package.json scripts
+
本地实际 Build
+
看生成目录
```

---

# 20. 最重要的验证：再 Push 一次

第一次 Save and Deploy 成功，只能证明：

```text
首次连接和部署成功
```

还应该再测试：

```text
本地修改一个页面
      ↓
git add .
      ↓
git commit
      ↓
git push
      ↓
什么都不去 Cloudflare 点
```

例如：

```bash
git add .
git commit -m "test: verify cloudflare ci cd"
git push
```

然后观察 Cloudflare 是否自动出现新 Deployment。

如果流程变成：

```text
push main
   ↓
Cloudflare 自动检测
   ↓
自动 Build
   ↓
自动 Deploy
   ↓
网站更新
```

才算真正验证：

> **持续集成 + 持续部署已经跑通。**

---

# 21. 以后发布文章的日常流程

博客上线以后，正常情况下不需要再去 Cloudflare 手工部署。

发布文章：

```text
写 Markdown
   ↓
本地预览
   ↓
pnpm docs:build
   ↓
git add .
   ↓
git commit
   ↓
git push
   ↓
Cloudflare 自动上线
```

常用命令：

```bash
pnpm docs:dev
```

写作、开发时使用。

```bash
pnpm docs:build
```

提交前检查生产 Build。

```bash
pnpm docs:preview
```

本地查看生产构建。

```bash
git status
git add .
git commit -m "docs: add xxx"
git push
```

发布。

---

# 22. 推荐的个人博客 Git 工作流

个人博客可以分两种情况。

## 小文章 / 小修改

直接：

```text
main
 ↓
push
 ↓
Production
```

足够简单。

## 功能开发 / 大改版

推荐：

```text
feat/article-tags
        ↓
push
        ↓
Cloudflare Preview Deployment
        ↓
打开 Preview URL 检查
        ↓
Pull Request
        ↓
Merge main
        ↓
Production Deployment
```

这样可以避免：

```text
改导航
改主题
改首页
改路由
```

时直接把有问题的版本推到正式站点。

---

# 23. Preview Deployment 的价值

Cloudflare Pages 的 Git 集成支持非生产分支预览。

可以理解成：

```text
main
→ 正式环境

feat/*
→ 预览环境
```

这已经非常接近企业里的：

```text
测试环境 / Preview
生产环境 / Production
```

区别只是 Cloudflare 帮我们把基础设施都托管掉了。

---

# 24. 只改 README，不想触发部署怎么办

这次实际日志拉取的 Commit 是：

```text
修改 README.md
```

即使修改内容不影响 VitePress 站点，只要 push 到受监听分支，默认还是可能触发构建。

如果明确知道某个提交不需要 Pages 部署，可以使用 Cloudflare 支持的 Skip 标记，例如：

```text
[CI Skip] docs: update repository README
```

或者：

```text
[CF-Pages-Skip] docs: update README
```

适合：

```text
只改 README
只改仓库说明
不影响网站产物
```

不要为了省一次 Build，把真正影响网站的提交也 Skip。

---

# 25. GitHub App 权限以后在哪里改

如果以后：

```text
新建第二个博客
新建作品集
另一个仓库也要 Cloudflare Pages
```

可以在 GitHub 的：

```text
Settings
→ Applications
→ Installed GitHub Apps
→ Cloudflare Workers and Pages
→ Configure
```

增加仓库。

仍然建议：

```text
Only select repositories
```

按需增加，而不是直接全开。

---

# 26. Cloudflare Pages 后期在哪里看问题

进入项目后，最常看的几个地方：

```text
Deployments
Build logs
Settings
Environment variables
Custom domains
Analytics / Web Analytics
```

排查顺序建议固定下来：

```text
① GitHub 最新 Commit 是什么？
② Cloudflare 拉到的 Commit SHA 是什么？
③ pnpm install 有没有成功？
④ pnpm docs:build 有没有成功？
⑤ Output directory 是否正确？
⑥ Assets 有没有 Upload 成功？
⑦ Deployment 是否 Success？
```

这样不会一出问题就乱改配置。

---

# 27. 常见故障排查表

| 现象 | 第一检查点 | 常见原因 |
|---|---|---|
| Cloudflare 看不到仓库 | GitHub App 权限 | 没有授权该 repository |
| Clone 失败 | Git Integration | GitHub 授权失效 |
| pnpm install 失败 | lockfile / pnpm version | 版本不一致、依赖问题 |
| EBADENGINE | Node / package 要求 | Node 版本不满足依赖要求 |
| VitePress Build 失败 | 本地 `pnpm docs:build` | SSR、配置、Markdown、依赖错误 |
| Build 成功但发布失败 | Output directory | 构建产物目录写错 |
| 部署成功但不是最新 | Commit SHA | Cloudflare 构建了旧提交/分支 |
| `No Wrangler config` | 是否纯静态 Pages | 当前项目通常可以忽略 |
| `No functions dir` | 是否使用 Pages Functions | 当前静态博客通常可以忽略 |
| 页面资源 404 | VitePress `base` | 部署路径与 base 不一致 |

---

# 28. VitePress base 特别注意

如果网站部署在域名根路径：

```text
https://rongxu-blog.pages.dev/
```

通常使用默认：

```ts
base: '/'
```

以后自定义域名：

```text
https://example.com/
```

仍然通常是：

```ts
base: '/'
```

只有部署到：

```text
https://example.com/blog/
```

这种子路径时，才需要：

```ts
base: '/blog/'
```

资源路径错、CSS/JS 404 时，要把 `base` 作为重点排查项。

---

# 29. 不要开启会破坏 VitePress HTML 的激进压缩

VitePress 官方部署文档特别提醒：

> 不要对 HTML 开启会删除 Vue 相关注释的 Auto Minify 一类处理，否则可能产生 hydration mismatch。

因此优化 Cloudflare 时不要抱着：

```text
压缩越多越好
```

的思路乱开所有选项。

先保证：

```text
正确
稳定
可复现
```

再优化。

---

# 30. Git Integration 和 Direct Upload 要提前选好

Cloudflare Pages 当前的一个重要规则是：

> 使用 Git Integration 创建的 Pages 项目，不能直接切换成 Direct Upload 模式。

如果以后不想每次 Push 自动构建，可以关闭自动部署，再使用其他部署方式，但不要把“Git Integration”和“Direct Upload”理解成项目里随时切换的两个按钮。

本项目目标本来就是：

```text
GitHub → Cloudflare 自动 CI/CD
```

所以选择 Git Integration 是正确的。

---

# 31. 后期升级：自定义域名

目前：

```text
rongxu-blog.pages.dev
```

已经足够完成 V1.0。

后面可以增加：

```text
自己的域名
   ↓
Cloudflare DNS
   ↓
Cloudflare Pages
```

例如：

```text
example.com
www.example.com
blog.example.com
```

这一步不影响当前 CI/CD 核心链路：

```text
GitHub
 ↓
Build
 ↓
Deploy
```

只是把最终用户访问入口从：

```text
*.pages.dev
```

换成自己的域名。

---

# 32. 后期升级：Cloudflare Web Analytics

静态博客没必要为了：

```text
PV
UV
访问趋势
性能指标
```

自己搭数据库和统计 API。

可以直接使用 Cloudflare Web Analytics。

这样仍然保持：

```text
无后端
无数据库
静态博客
```

---

# 33. 后期升级：CI 质量检查

目前 CI：

```text
pnpm install
pnpm docs:build
```

已经够 V1.0 使用。

以后项目复杂，可以增加：

```text
ESLint
TypeScript typecheck
Markdown lint
死链检查
单元测试
```

那时可以选择：

```text
GitHub Actions
        ↓
Lint / TypeCheck / Test
        ↓
通过
        ↓
Cloudflare Pages Deploy
```

因此：

> 当前没有 GitHub Actions，不代表 CI/CD 不完整；只是当前质量门禁比较轻量。

---

# 34. 这次部署最重要的工程化认知

## 认知一：部署不是“把代码丢到服务器”

真正自动化部署应该是：

```text
源代码
 ↓
版本控制
 ↓
自动构建
 ↓
构建产物
 ↓
自动发布
```

---

## 认知二：Build 产物不应该依赖我的电脑

如果：

```text
只有我电脑的 dist 能运行
```

而远程干净环境无法构建，那项目其实不够可靠。

CI 的价值之一就是验证：

```text
换一台机器
重新 Clone
重新 Install
重新 Build
```

依然可以成功。

---

## 认知三：锁文件非常重要

`pnpm-lock.yaml` 能让 CI 安装的依赖版本更可控。

所以：

```text
package.json
+
pnpm-lock.yaml
```

应该一起进入 Git。

---

## 认知四：环境版本应该显式管理

不要长期依赖：

```text
“Cloudflare 默认是什么版本就用什么版本”
```

更成熟的做法：

```text
Node version
pnpm version
框架版本
lockfile
```

都尽量可追踪。

---

## 认知五：日志比“猜”重要

出了问题不要先：

```text
删 node_modules
重装
乱改 Cloudflare
改十个配置
```

先看：

```text
到底失败在哪一行？
Clone？
Install？
Build？
Upload？
Deploy？
```

CI/CD 排错本质上就是缩小失败阶段。

---

# 35. 项目实践总结

通过这次个人博客的部署，我第一次完整跑通了从代码提交到自动发布的 CI/CD 链路。

整个流程包括：

- 使用 GitHub 管理源代码和 Markdown 内容
- 使用 Cloudflare Pages 连接 GitHub 仓库
- 以 `main` 作为生产分支
- Cloudflare 自动 Clone 最新 Commit
- 使用 Node.js + pnpm 安装项目依赖
- 执行 `pnpm docs:build`
- VitePress 生成 `docs/.vitepress/dist`
- Cloudflare 自动上传静态资源并完成发布

在实践过程中，也遇到了几个比较典型的问题：

- 一开始误进入了 Cloudflare Workers，而不是 Pages
- GitHub App 权限需要控制在指定仓库
- Node / pnpm 版本需要尽量保持本地与 CI 一致
- Build Log 中 Warning 和 Error 需要区分
- 排错应该按照 Clone → Install → Build → Deploy 分阶段进行

这次实践让我对 CI/CD 的理解从概念变成了实际工程流程。

---

# 36. 5 分钟讲解版

可以按 5 个问题讲：

### ① 为什么选这个方案？

```text
博客是静态内容
不需要数据库
不需要后端
希望 push 就自动上线
```

所以：

```text
VitePress + GitHub + Cloudflare Pages
```

---

### ② GitHub 做什么？

```text
存源代码
存 Markdown
记录 Commit
管理 branch
作为 CI/CD 的触发源
```

---

### ③ CI 做什么？

```text
Cloudflare Clone
Node / pnpm
pnpm install
pnpm docs:build
```

目标：

> 验证最新提交是否能产生正确的生产构建。

---

### ④ CD 做什么？

```text
获取 docs/.vitepress/dist
↓
Upload
↓
Cloudflare Global Network
↓
Production URL
```

---

### ⑤ 以后怎么发布？

```bash
git add .
git commit -m "docs: add article"
git push
```

然后：

```text
不用 SSH
不用 FTP
不用手动上传 dist
不用重启 Nginx
```

网站自动更新。

---

# 37. 一张图记住整个项目

```text
┌────────────────────┐
│       本地          │
│ VitePress / Markdown│
└─────────┬──────────┘
          │
       git push
          │
          ▼
┌────────────────────┐
│      GitHub        │
│ rongxu_blog / main │
└─────────┬──────────┘
          │
     Git Integration
          │
          ▼
┌──────────────────────────┐
│     Cloudflare Pages     │
│                          │
│ Clone                    │
│   ↓                      │
│ Node + pnpm              │
│   ↓                      │
│ pnpm install             │
│   ↓                      │
│ pnpm docs:build          │
│   ↓                      │
│ docs/.vitepress/dist     │
└────────────┬─────────────┘
             │
             │ Deploy
             ▼
┌──────────────────────────┐
│ Cloudflare Global Network│
│ CDN / HTTPS / Pages      │
└────────────┬─────────────┘
             │
             ▼
 https://rongxu-blog.pages.dev/
```

---

# 38. V1.0 部署检查清单

第一次：

- [x] GitHub 仓库创建完成
- [x] `main` 分支存在
- [x] `package.json` 有 `docs:build`
- [x] `pnpm-lock.yaml` 已提交
- [x] 本地 `pnpm docs:build` 成功
- [x] Cloudflare 注册 / 登录
- [x] 安装 Cloudflare Workers and Pages GitHub App
- [x] 使用 Only select repositories
- [x] 授权 `rongxu_blog`
- [x] 正确进入 Pages，不是 Worker
- [x] Import existing Git repository
- [x] Production Branch = `main`
- [x] Framework = `VitePress`
- [x] Build Command = `pnpm docs:build`
- [x] Output = `docs/.vitepress/dist`
- [x] 首次 Build 成功
- [x] Assets 上传成功
- [x] Pages 部署成功
- [x] `rongxu-blog.pages.dev` 可访问

后续建议：

- [ ] 再测试一次 `git push → 自动部署`
- [ ] 固定经过验证的 Node 版本
- [ ] 处理 Corepack / Node Warning
- [ ] 增加自定义域名
- [ ] 开启 Web Analytics
- [ ] 功能开发采用 Preview Branch / PR
- [ ] 增加必要的 Lint / TypeCheck / Link Check

---

# 39. 一句话总结

这次真正跑通的不是“把一个页面发到网上”，而是一条完整的软件交付链路：

```text
代码变化
→ Git 记录
→ GitHub 托管
→ Cloudflare 自动检测
→ 干净环境重新安装
→ 自动生产构建
→ 自动发布
→ 用户访问
```

以后再接触公司的：

```text
GitLab CI
GitHub Actions
Jenkins
Docker
Kubernetes
多环境 Deployment
```

虽然工具会变复杂，但核心思想仍然是同一套：

> **让代码从提交到验证、构建和发布尽可能自动、稳定、可重复、可追踪。**

---

# 官方参考

以下内容建议后期复习时优先看官方文档，因为 Cloudflare 控制台 UI、默认 Node/pnpm 版本和构建系统会随时间变化。

- [Cloudflare Pages - Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages - GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [Cloudflare Pages - Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages - Build image / runtime versions](https://developers.cloudflare.com/pages/configuration/build-image/)
- [VitePress - Deploy Your VitePress Site](https://vitepress.dev/guide/deploy)
- [GitHub - 推送提交到远程仓库](https://docs.github.com/zh/get-started/using-git/pushing-commits-to-a-remote-repository)

> 注：本文界面与平台行为记录于 **2026-08-10**。后续如果 Cloudflare Dashboard 改版，应优先理解“Git Repository → Build → Output → Deploy”这条主线，而不是死记按钮位置。
