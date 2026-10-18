---
title: Node.js 与 TypeScript 工程实践：基础原理、核心模块与 CLI 开发
description: 系统介绍 Node.js 运行时、环境管理、模块系统、TypeScript 工程、文件与路径操作、进程管理及命令行工具开发，配有实用代码示例。
date: 2026-10-18
category: engineering
tags:
  - Node.js
  - TypeScript
  - 工程化
  - 后端开发
  - 全栈
outline: deep
---

# Node.js 与 TypeScript 工程实践：基础原理、核心模块与 CLI 开发

> 从 JavaScript 运行时到 TypeScript 工程实践，系统梳理 Node.js 的基础能力、核心 API 和常见工程模式，并通过可运行示例串联关键知识。

## 一、知识概览

本文围绕以下主题展开：

1. Node.js 是什么，为什么能够在浏览器外运行 JavaScript？
2. JavaScript 单线程与 Node.js 高并发是否矛盾？
3. `npm`、`pnpm` 和 `nvm` 分别解决什么问题？
4. CommonJS 与 ESM 怎样导入导出？为什么会出现包兼容问题？
5. `package.json` 中 `dependencies`、`devDependencies`、`peerDependencies`、`main`、`exports`、`bin` 分别有什么作用？
6. 如何建立一个可编译、可运行、可调试的 Node.js + TypeScript 项目？
7. 为什么 `fs` 经常遇到路径问题？`process.cwd()` 与 `import.meta.dirname` 有什么区别？
8. Node.js 如何启动外部命令、Python 脚本或 FFmpeg，并安全地读取输出？

**知识结构：**

```text
Node.js 运行时
  ├─ 安装与版本管理：nvm / fnm / Volta
  ├─ 包管理：npm / pnpm
  ├─ 模块系统：CommonJS / ESM
  ├─ 工程描述：package.json
  ├─ TypeScript：tsconfig → tsc → dist → node
  └─ 内置 API
      ├─ fs：文件操作
      ├─ path：路径操作
      ├─ os：系统信息
      ├─ process：当前进程
      ├─ child_process：执行外部程序
      ├─ Buffer / Stream：字节与数据流
      └─ http / net：网络（基础网络能力）
```

---

## 二、Node.js 是什么？

### 2.1 运行时，而不是框架

**Node.js 是基于 V8 JavaScript 引擎构建的 JavaScript 运行时。** 它使 JavaScript 能够在浏览器之外执行，例如服务器、命令行、构建工具等环境。

需要区分三个概念：

| 概念 | 职责 | 示例 |
| --- | --- | --- |
| JavaScript / TypeScript | 编程语言 / JavaScript 的类型化超集 | `const a = 1`、`interface User` |
| V8 | 解析、编译并执行 JavaScript | Chrome、Node.js 使用 V8 |
| Node.js | 提供 V8 与文件、网络、进程等运行时能力 | `node:fs`、`node:http`、`process` |

**浏览器与 Node.js 的差别**不在于“是不是 JavaScript”，而是运行时提供的 API 不同。浏览器提供 DOM、Web API；Node.js 提供文件系统、进程和服务器相关 API。两者也有一些共同的标准 API。

### 2.2 常见场景

- 服务端 API：REST API、实时应用、BFF（Backend For Frontend）。
- 工程化工具：Vite、构建脚本、命令行工具、脚手架。
- 自动化：批量读写文件、生成代码、执行工具。
- AI 应用：模型调用、流式输出、中间层编排、Agent 工具调用。
- 跨语言协作：从 Node.js 启动 Python 程序或其他可执行程序。

### 2.3 单线程、事件循环与并发

Node.js 的核心特征包括**事件驱动、异步 I/O 和非阻塞执行模型**。理解这些概念时，需要区分：

- **JavaScript 主线程通常是单线程执行 JS 回调**，不是说 Node.js 进程只有一个线程。
- Node.js 使用事件循环协调异步任务；部分 I/O 由操作系统异步机制或 libuv 线程池处理。
- **并发不等于并行**：并发是处理多个任务的能力；并行是多个任务在同一时刻实际执行。
- I/O 密集型工作（例如请求数据库、读取文件、网络访问）适合异步 I/O；CPU 密集型工作可能阻塞 JS 主线程，可根据场景考虑 `worker_threads`、子进程或独立服务。

```js
import { readFile } from 'node:fs/promises';

console.log('A：开始');
const pending = readFile('./package.json', 'utf8'); // 开始异步读取
console.log('B：先继续执行');
const content = await pending;
console.log('C：读取结束，字符数', content.length);
```

通常打印顺序为 `A → B → C`，说明发起 I/O 后 JS 可以继续处理其他工作。

> `async/await` 让异步代码更好读，但不会自动将 CPU 密集型 JS 运算放到新线程。

---

## 三、Node.js 版本管理与包管理

### 3.1 区分“版本管理”和“依赖管理”

| 工具 | 主要作用 |
| --- | --- |
| nvm / nvm-windows / fnm / Volta | 安装、切换 Node.js 版本；部分工具也管理其他运行时或包管理器 |
| npm / pnpm / yarn | 管理项目依赖、运行 `scripts` |
| `package.json` | 声明项目元信息、脚本、依赖 |
| `pnpm-lock.yaml` | 锁定实际依赖解析结果，便于可重复安装 |

pnpm 在依赖管理和多包项目中有良好的工程体验。新项目可以优先考虑 pnpm；已有项目则应尊重团队选型，确保包管理器与锁文件保持一致。

### 3.2 Windows 与 macOS / Linux 的 NVM 不相同

- macOS / Linux 通常使用 [`nvm-sh/nvm`](https://github.com/nvm-sh/nvm)。
- Windows 常见选择是 [`nvm-windows`](https://github.com/nvm-windows/nvm)，它是**不同的项目**；命令也不完全一致。
- 跨平台也可考虑 `fnm` 或 `Volta`。

**macOS / Linux（nvm-sh）常见命令：**

```bash
nvm ls
nvm ls-remote --lts
nvm install --lts
nvm use --lts
nvm alias default 'lts/*'
node -v
npm -v
```

```bash
# 安装新 Node 版本时，从指定旧版本重新安装全局 npm 包
# 注意：是 reinstall-packages，不是 reinstall
nvm reinstall-packages <旧版本号>
```

**Windows（nvm-windows）常见命令：**

```powershell
nvm list
nvm install <版本号>
nvm use <版本号>
node -v
```

> `nvm alias default` 和 `nvm reinstall-packages` 属于 nvm-sh 的用法，不应直接套用到 nvm-windows。安装前根据系统阅读对应项目文档。具体使用哪个 Node.js 版本，应根据项目的 `engines` 约束、依赖兼容性和官方维护状态决定。

### 3.3 初始化项目、安装依赖

```bash
mkdir node-ts-learning
cd node-ts-learning
npm init -y

# 如已安装 pnpm，可使用它管理依赖
pnpm add dotenv
pnpm add -D typescript @types/node

# 常用操作
pnpm install
pnpm remove dotenv
pnpm run build
```

- `pnpm add`：默认加入 `dependencies`。
- `pnpm add -D`：加入 `devDependencies`。
- `pnpm install`：按工程声明与锁文件安装依赖。
- CI 推荐使用与锁文件匹配的冻结安装策略，例如 `pnpm install --frozen-lockfile`。

---

## 四、CommonJS 与 ES Modules（ESM）

模块化用于拆分文件、明确模块边界及导入导出关系。

### 4.1 CommonJS

`math.cjs`

```js
function sum(a, b) {
  return a + b;
}

module.exports = { sum };
```

`index.cjs`

```js
const { sum } = require('./math.cjs');
console.log(sum(1, 2)); // 3
```

### 4.2 ESM

`math.js`

```js
export function sum(a, b) {
  return a + b;
}
```

`index.js`

```js
import { sum } from './math.js';
console.log(sum(1, 2)); // 3
```

若 `.js` 文件使用 ESM，应在就近的 `package.json` 中配置：

```json
{
  "type": "module"
}
```

### 4.3 两者对比

| 对比项 | CommonJS | ESM |
| --- | --- | --- |
| 导入 | `require()` | `import` |
| 导出 | `module.exports` | `export` / `export default` |
| 常见扩展名 | `.cjs` | `.mjs` |
| `.js` 的解释方式 | 由最近的 `package.json` 等上下文决定 | 由最近的 `package.json` 等上下文决定 |
| 顶层 `await` | 不支持同样形式的顶层 `await` | 支持 |
| 典型场景 | 老项目、部分 Node 包 | 现代前后端工程 |

CommonJS 与 ESM 的差异不只在语法，还涉及模块解析、链接和加载机制，不能简单以“同步”或“异步”概括。

**补充：模块兼容问题不总能靠 Babel / Vite 自动解决。** 要先检查包的 `exports`、运行环境、扩展名、`type`、依赖版本以及是运行时导入还是构建阶段转换。Node 本身也提供 ESM/CJS 的互操作机制，但存在约束。

---

## 五、`package.json` 核心字段速查

### 5.1 示例

```json
{
  "name": "node-ts-learning",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Node.js + TypeScript learning project",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=22.18.0"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^6.0.0"
  }
}
```

> 上述依赖版本用于展示结构，不代表应固定使用这些版本；以实际安装、官方兼容矩阵以及项目锁文件为准。

### 5.2 依赖分类

| 字段 | 含义 | 典型例子 |
| --- | --- | --- |
| `dependencies` | 应用运行时或生产运行需要的包 | 服务端框架、运行时依赖的库 |
| `devDependencies` | 开发、测试、构建阶段所需的包 | TypeScript、ESLint、Vitest |
| `peerDependencies` | **声明宿主项目应提供的兼容依赖及版本范围** | Vue 组件库声明 `vue`、React 组件库声明 `react` |
| `optionalDependencies` | 可选依赖，安装失败不一定阻断整个安装 | 某些平台特定能力 |

`peerDependencies` 不意味着“npm 一定不会安装它”：现代 npm 的自动安装行为与依赖树状态有关。关键在于**表达兼容契约**，让组件库尽量与宿主共享同一框架实例，避免重复实例或版本冲突。

组件库示意：

```json
{
  "name": "@example/ui",
  "peerDependencies": {
    "vue": "^3.0.0"
  },
  "devDependencies": {
    "vue": "^3.0.0"
  }
}
```

这里开发和测试 UI 库时可能仍需要在 `devDependencies` 中安装 Vue，发布给宿主消费时依靠 `peerDependencies` 声明兼容要求。

### 5.3 `main`、`module`、`exports`、`types`、`bin`

| 字段 | 用途 | 注意点 |
| --- | --- | --- |
| `main` | 包的主入口 | **并非只能指向 CommonJS** |
| `module` | 部分打包器采用的 ESM 入口约定 | **不是 Node.js 官方通用的 ESM 解析入口字段** |
| `exports` | 明确包的公开入口及条件导出 | 新包推荐，优先级通常高于 `main` |
| `types` / `typings` | 类型声明入口 | 常见为 `./dist/index.d.ts` |
| `bin` | 命令行可执行入口 | 用于发布 CLI；不仅仅是“二进制程序” |
| `scripts` | 将开发、检查、构建、运行动作标准化 | 团队和 AI 工具都能复用 |
| `private` | 阻止意外发布到 npm | 应用型项目常设为 `true` |

在 Node.js 包解析中，`main` 是传统入口字段，并非只服务于 CommonJS；`module` 主要是部分构建工具采用的约定字段。现代包通常通过 `exports` 明确公开入口，并按环境提供条件导出。

```json
{
  "name": "@example/math",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "types": "./dist/index.d.ts"
}
```

若要同时支持 `require` 和 `import`，需要实际输出相应的 CJS/ESM 产物并配置不同入口，不能只是随意指定两个路径。

### 5.4 为什么要固定 `scripts`？

**把可重复的开发流程沉淀为脚本**，可以统一执行入口，降低协作和自动化成本。

```json
{
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "start": "node dist/index.js",
    "check": "pnpm typecheck && pnpm build"
  }
}
```

统一入口能减少口头约定、降低新人上手成本，也便于 CI 和 AI 编码助手执行与验证任务。

---

## 六、从零搭建 Node.js + TypeScript 工程

### 6.1 目录结构

```text
node-ts-learning/
├── src/
│   └── index.ts
├── dist/               # 编译产物（由构建生成）
├── .gitignore
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

### 6.2 安装依赖

```bash
pnpm add -D typescript @types/node
```

TypeScript 编译器负责类型检查与代码转换，`@types/node` 为 Node API 提供类型声明。**类型声明不等于实际的运行时代码。**

### 6.3 配置 `tsconfig.json`

以下是一个面向现代 Node ESM 的最小可行配置：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "types": ["node"],
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

同时确认 `package.json` 包含 `"type": "module"`。

### 6.4 编写与运行

`src/index.ts`

```ts
interface User {
  id: number;
  name: string;
}

const user: User = { id: 1, name: 'Ada' };
console.log('Hello Node.js + TypeScript');
console.log(user.name);
console.log('工作目录：', process.cwd());
```

`package.json` 中配置：

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "build:watch": "tsc -w"
  }
}
```

```bash
pnpm build        # src/*.ts → dist/*.js
pnpm start        # 执行生成的 JS
pnpm typecheck    # 只做类型检查
pnpm build:watch  # 保存后持续重新编译（本身不会自动重启 Node）
```

**两种模式：**

- **编译后运行**：`tsc → dist/*.js → node`，适合明确的构建 / 发布流程。
- **直接执行 TS**：较新的 Node 版本支持移除可擦除的 TS 类型语法后执行文件，但并不等于完整的 TypeScript 编译器或类型检查器。

Node.js 的内置 TypeScript 支持有版本与语法限制；有些需要转换的 TS 语法、模块解析习惯、路径别名等不能直接按 `tsc` 的行为推断。即使可以 `node src/index.ts`，依然建议用 `tsc --noEmit` 做类型检查，并根据项目部署方式决定是否编译。

### 6.5 一个关键细节：ESM 的导入路径

使用 `NodeNext` 时，源代码中的相对模块导入常需要写**运行时的 `.js` 扩展名**：

```ts
// src/index.ts
import { sum } from './math.js';
```

虽然源文件实际叫 `math.ts`，编译后会成为 `math.js`；这种写法可保证输出的 ESM 在 Node 中正常解析。

---

## 七、核心模块一：`fs` 文件系统

### 7.1 三套常见 API 风格

| 方式 | 例子 | 特点 |
| --- | --- | --- |
| Callback | `fs.readFile(path, cb)` | 传统异步 API |
| Promise | `await fsPromises.readFile(path)` | 现代业务代码优先推荐 |
| 同步 | `fs.readFileSync(path)` | 执行期间阻塞调用线程；适用于小型启动脚本等场景 |

**推荐写法：**

```ts
import { readFile, writeFile, appendFile, unlink, stat } from 'node:fs/promises';

const file = './notes.txt';

await writeFile(file, '第一行\n', 'utf8'); // 默认覆盖
await appendFile(file, '第二行\n', 'utf8');

const content = await readFile(file, 'utf8');
console.log(content);

const info = await stat(file);
console.log('字节数：', info.size);
console.log('是否为文件：', info.isFile());

await unlink(file);
```

**增删改查类比：**

- 新增 / 写入：`writeFile`、`appendFile`。
- 查询：`readFile`、`stat`。
- 修改：读取后处理再写入，或通过其他更合适的文件 API。
- 删除：`unlink`（删除文件）；删除目录是另一类操作。

### 7.2 读取失败：不是总因为 API 用错

文件位于项目目录中，并不代表任意工作目录都能使用相同的相对路径读取。

```ts
import { readFile } from 'node:fs/promises';

// 相对路径通常相对于进程当前工作目录 process.cwd() 解析
const content = await readFile('./data/config.json', 'utf8');
```

如果终端从不同目录启动，这条语句可能找不到文件。

### 7.3 `fs/promises`、`promisify`、`fs-extra`

- `node:fs/promises`：Node 官方 Promise API；现代项目优先考虑。
- `util.promisify`：将符合 Node 风格回调约定的函数包装成 Promise；遇到老 API 时有用。
- `fs-extra`：第三方辅助库，提供方便的文件 / 目录能力；**并非所有文件操作都必须依赖它**。

```ts
import { readFile } from 'node:fs/promises';

try {
  const content = await readFile('./config.json', 'utf8');
  console.log(content);
} catch (err) {
  console.error('读取文件失败：', err);
}
```

**存在性检查的正确观念：**

- 如果只是想读取文件，直接读取并处理 `ENOENT` 等错误通常更稳妥。
- `access()` 可以检查访问权限，但“先检查再操作”有竞态条件；文件可能在两步之间被其他进程修改。
- `stat()` 返回文件元数据，不只是布尔“是否存在”；不能把它当成 `exists()` 的完全等价替代。
- `existsSync()` 仍可用于一些简单脚本；不要把 `fs.exists()` 与现代推荐异步 API 混为一谈。

---

## 八、核心模块二：`path` 与路径问题

### 8.1 常见 API

```ts
import path from 'node:path';

console.log(path.join('src', 'utils', 'index.ts'));
console.log(path.resolve('src', 'index.ts'));
console.log(path.basename('/app/src/main.ts'));  // main.ts
console.log(path.dirname('/app/src/main.ts'));   // /app/src
console.log(path.extname('/app/src/main.ts'));   // .ts
```

| API | 含义 |
| --- | --- |
| `join()` | 拼接路径片段并规范化 |
| `resolve()` | 从右往左解析得到绝对路径；缺少绝对路径时参考 `process.cwd()` |
| `basename()` | 取最后一段文件名 |
| `dirname()` | 取父目录路径 |
| `extname()` | 取扩展名 |

**易错点：** `path.dirname(某个路径)` 是函数；而 ESM 中 `import.meta.dirname` 是描述当前模块目录的属性（取决于 Node 版本 / 运行环境）。

### 8.2 `process.cwd()` 与模块目录的区别

```ts
console.log(process.cwd());          // 进程被启动时使用的当前工作目录（也可能在运行中变更）
console.log(import.meta.dirname);    // 当前模块所在目录（支持该属性的 Node 版本）
```

例如：

```text
project/
├── data/message.txt
├── src/index.ts
└── dist/index.js
```

若在 `project/` 下运行 `node dist/index.js`：

- `process.cwd()` 通常为 `project/`。
- `import.meta.dirname` 为 `project/dist/`，**不是** `project/src/`。

读取“项目启动目录下”的数据：

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'data/message.txt');
console.log(await readFile(file, 'utf8'));
```

读取“相对于当前模块部署位置”的资源：

```ts
import { readFile } from 'node:fs/promises';

// 对于 ESM，使用 URL 相对定位通常更直接
const fileUrl = new URL('./template.txt', import.meta.url);
console.log(await readFile(fileUrl, 'utf8'));
```

> **工程实践：** 源码中的资源如果没有复制到 `dist`，编译后按模块目录读取会失败。要么在构建流程复制资源，要么明确按 `cwd`、配置或绝对路径读取。不要依赖“编辑器打开的是哪个文件夹”来推断路径。

---

## 九、核心模块三：`os` 系统信息

`node:os` 用于查看宿主操作系统的基础信息：

```ts
import os from 'node:os';

console.log('平台：', os.platform());    // win32、linux、darwin 等
console.log('CPU 架构：', os.arch());    // x64、arm64 等
console.log('CPU 信息：', os.cpus().length);
console.log('总内存 GB：', (os.totalmem() / 1024 ** 3).toFixed(2));
console.log('空闲内存 GB：', (os.freemem() / 1024 ** 3).toFixed(2));
console.log('临时目录：', os.tmpdir());
```

适用场景：诊断工具、跨平台 CLI、运行环境检查、资源监控。`os.freemem()` 只是系统层面的空闲内存信息，不代表你的 Node 进程能够无限制使用全部剩余内存。

---

## 十、核心模块四：`process` 当前进程

`process` 描述和控制**当前 Node.js 进程**；它不是“创建新进程”的 API。创建外部进程通常用 `node:child_process`。

| 属性 / 方法 | 作用 |
| --- | --- |
| `process.argv` | 启动 Node 进程时的命令行参数 |
| `process.env` | 环境变量 |
| `process.cwd()` | 当前工作目录 |
| `process.pid` | 当前进程 ID |
| `process.memoryUsage()` | Node 进程内存使用情况 |
| `process.exitCode` | 设置进程退出码，通常比强制立即退出更利于清理 |
| `process.nextTick()` | 安排回调在 Node 特定时机运行，使用时注意不要造成饥饿 |

### 10.1 命令行参数

```ts
// src/cli.ts
console.log(process.argv);
console.log(process.argv.slice(2));
```

执行编译后的脚本：

```bash
node dist/cli.js --name Ada --verbose
```

通常 `argv[0]` 是 Node 程序路径，`argv[1]` 是脚本路径，后续才是传入的业务参数。

### 10.2 环境变量与 `dotenv`

创建 `.env`：

```dotenv
MODEL_PROVIDER=example
API_KEY=replace_me
```

安装：

```bash
pnpm add dotenv
```

在程序入口加载：

```ts
import 'dotenv/config';

const provider = process.env.MODEL_PROVIDER;
console.log('模型供应商：', provider);

if (!process.env.API_KEY) {
  throw new Error('缺少 API_KEY 环境变量');
}
```

`.gitignore`：

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
```

**安全补充：**

1. `.env` 不应提交真实密钥；可以提交不带密钥的 `.env.example`。
2. `.env` 本身**不会自动保证安全或自动同步到服务器**。部署环境需要通过平台配置、容器环境变量或密钥管理系统注入。
3. 不要 `console.log(process.env)` 打印整份环境变量，尤其在 CI 或生产日志中。
4. Docker 的 `--env-file` / Compose 环境注入应与应用启动机制区分；生产密钥尽量使用托管密钥机制。
5. Node 的较新版本也有内建的 `.env` 文件支持选项，项目可按实际运行时决定是否使用 `dotenv`。

---

## 十一、核心模块五：`child_process` 子进程（重点）

### 11.1 适用场景

子进程常用于以下场景：

- 在 Node.js 应用中执行外部 CLI，例如 Codex 或其他工具。
- 调用 FFmpeg 处理视频，或从 Node.js 启动 Python 脚本。

**核心概念：** 父进程（Node.js）启动一个独立子进程，传入参数，并通过标准流或进程退出事件获取运行结果。

### 11.2 `spawn`、`exec`、`execFile`、`fork` 对比

| API | 特点 | 典型场景 |
| --- | --- | --- |
| `spawn()` | 启动进程，可流式消费 stdout / stderr | 长任务、大量输出、FFmpeg |
| `exec()` | 通过 shell 执行一条命令，默认缓冲输出 | 简短、可信、输出可控的命令 |
| `execFile()` | 直接执行程序，不默认借助 shell | 已知程序与参数，适合简短输出 |
| `fork()` | 专门启动 Node.js 模块子进程并提供 IPC 通道 | Node 进程之间通信 |

选择 `spawn`、`exec` 等 API，主要应考虑：**是否需要 shell、是否需要流式输出、是否存在不可信参数、是否需要进程间消息通信**。

### 11.3 `spawn`：流式获取输出

```ts
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['--version'], {
  shell: false,
});

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');

child.stdout.on('data', (chunk: string) => {
  console.log('标准输出：', chunk.trim());
});

child.stderr.on('data', (chunk: string) => {
  console.error('错误输出：', chunk.trim());
});

child.on('error', (err) => {
  console.error('进程启动失败：', err.message);
});

child.on('close', (code, signal) => {
  console.log('进程结束：', { code, signal });
});
```

解释：

- `stdout`：标准输出流。
- `stderr`：标准错误流；不一定代表程序执行失败，有些工具会把进度信息写到这里。
- `stdin`：写入子进程的标准输入。
- `data`：数据块事件，**不保证一块就是一行或一条完整 JSON**。
- `error`：进程无法启动等问题。
- `close`：标准流关闭后的结束事件，可检查退出码。

### 11.4 `Buffer` 与 `Stream` 是什么？

- **Buffer**：表示二进制数据的一段内存，常见于文件、网络和子进程输出。
- **Stream**：分段读写数据的抽象，用于避免把所有数据一次性放进内存。

```ts
const bytes = Buffer.from('你好', 'utf8');
console.log(bytes);                  // 字节内容
console.log(bytes.toString('utf8')); // 你好
```

当 `spawn()` 的输出很大时，优先以 Stream 处理；必要时考虑数据积压（backpressure）、字符编码边界与逐行解析。

### 11.5 使用 Node 启动 Python 脚本

`worker.py`：

```python
import json
import sys

name = sys.argv[1] if len(sys.argv) > 1 else "World"
print(json.dumps({"message": f"Hello, {name}"}, ensure_ascii=False))
```

`src/run-python.ts`：

```ts
import { spawn } from 'node:child_process';

// Windows 可能使用 python，Linux/macOS 可能使用 python3；
// 最好通过配置项提供准确的解释器路径。
const python = process.env.PYTHON_BIN || 'python';
const child = spawn(python, ['worker.py', 'Ada'], { shell: false });

let output = '';
let errorOutput = '';

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk: string) => { output += chunk; });
child.stderr.on('data', (chunk: string) => { errorOutput += chunk; });

child.on('error', (err) => console.error('启动失败', err));
child.on('close', (code) => {
  if (code !== 0) {
    console.error('Python 执行失败：', errorOutput);
    return;
  }
  try {
    console.log(JSON.parse(output));
  } catch (err) {
    console.error('Python 输出不是合法 JSON：', err);
  }
});
```

> 这是**教学示例**。真实服务需增加超时、并发限制、进程取消、输出大小限制、日志与工作目录配置；如果输出可能无限增长，应采用逐块 / 逐行处理而不是一直拼接字符串。

### 11.6 重要的安全与性能提醒

- 不要直接将用户输入拼入 `exec('...')` 的 shell 字符串，否则可能发生命令注入。
- 优先把程序与参数拆开：`spawn(program, [arg1, arg2], { shell: false })`。
- 不应把用户提供的任意程序名都允许执行；对可执行程序做白名单控制。
- 处理退出码、启动错误、超时、取消和并发数。
- 对长期运行程序使用流式消费，避免大输出撑爆内存。
- 大规模正式服务未必都适合“一次请求启动一个 Python 子进程”，可能更适合常驻 Python 服务，通过 HTTP / RPC / 消息队列协作。

---

## 十二、补充：`cluster`、`worker_threads` 与子进程

与进程和并发有关的机制，可以结合 `child_process`、`cluster` 和 `worker_threads` 一起理解：

| 方案 | 侧重点 | 何时考虑 |
| --- | --- | --- |
| 异步 I/O | 单进程中协调大量 I/O 工作 | API 服务和文件 / 网络操作 |
| `worker_threads` | 在同一进程内使用额外 JS 线程执行 CPU 工作 | CPU 密集型计算 |
| `child_process` | 启动外部程序或隔离执行任务 | FFmpeg、Python、CLI |
| `cluster` | 启动多个 Node 工作进程 | 多核场景下的服务进程扩展 |

`cluster` **不是多个进程直接“共享同一份 JS 内存”**；进程之间有各自的内存空间，通信与负载分发也需要考虑。实际部署还可以使用多实例、容器编排或进程管理工具。

---

## 十三、Node.js 在全栈与 AI 应用开发中的价值

### 13.1 从 TypeScript 过渡到全栈开发

对于有前端基础的开发者，可以沿着下面的方向逐步拓展：

```text
TypeScript + Node.js
      ↓
理解完整全栈业务链路与工程架构
      ↓
借助 AI 辅助开发 Python / Java / Go 等服务
      ↓
再深入对应语言、框架与运行时细节
```

这一方法的价值，是**利用熟悉的语言降低初学后端的认知负担**，将精力放在 HTTP、数据库、鉴权、日志、缓存、部署和架构上。

### 13.2 能力迁移与技术边界

- 对已有 JavaScript / TypeScript 经验的开发者而言，Node.js 是自然的服务端入门选择。
- Node.js 的服务端经验可以迁移到其他语言，但学习 Python、Java 或 Go 时仍需掌握各自的运行时、生态、异步模型、部署方式与故障处理。
- **AI 应用与 AI Agent 的关系：** AI 应用包括 RAG 问答、内容生成、模型 API 集成等；Agent 是其中更强调工具使用、动态决策与多步骤执行的一类系统。
- AI 辅助开发的关键能力，不只是编写提示词，还包括需求分析、接口设计、错误定位、结果验证与代码维护。

**面向 AI 应用开发的实践路径：**

1. 用 Node.js + TS 构建 API / BFF 和基础工具。
2. 理解文件处理、鉴权、日志、异常、环境变量与进程协作。
3. 接入数据库、对象存储和外部模型服务。
4. 在合适的模块使用 Python（如模型生态或已有 Python 库），建立明确的 API 边界。
5. 用自动化测试、类型检查、日志与可观测性验证 AI 生成代码。

---

## 十四、实践项目：编写文件处理 CLI

本节使用 TypeScript 编写一个可复用的 Node CLI，执行时读取目标文件，并打印文件名称、字节数与行数。

`src/index.ts`：

```ts
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('用法：node dist/index.js <文件路径>');
    process.exitCode = 1;
    return;
  }

  const file = path.resolve(process.cwd(), input);

  try {
    const info = await stat(file);
    if (!info.isFile()) {
      throw new Error('输入路径不是普通文件');
    }

    const content = await readFile(file, 'utf8');
    const lines = content === '' ? 0 : content.split(/\r\n|\n|\r/).length;

    console.log({
      name: path.basename(file),
      sizeBytes: info.size,
      lines,
    });
  } catch (err) {
    console.error('处理失败：', err);
    process.exitCode = 1;
  }
}

void main();
```

```bash
pnpm build
node dist/index.js README.md
```

**功能检查：**

- [ ] 能成功编译；执行 `.js` 文件正常。
- [ ] 传相对路径和绝对路径都能读取。
- [ ] 文件不存在时给出明确错误并设置非零退出码。
- [ ] 目录输入时报错，而不是当文件读取。
- [ ] 能解释 `process.cwd()`、`path.resolve()`、`readFile()`、`stat()` 各自职责。

**进阶练习：** 写一个 CLI 读取一组 JSON 文件，校验格式并输出统计汇总；进一步用 `spawn()` 调用外部工具完成文件转换。注意输出大小限制和错误处理。

---

## 十五、官方资料与延伸阅读

- [Node.js 官方文档](https://nodejs.org/docs/latest/api/)
- [Node.js：TypeScript 支持](https://nodejs.org/api/typescript.html)
- [Node.js：模块与 package.json](https://nodejs.org/api/packages.html)
- [Node.js：ES Modules](https://nodejs.org/api/esm.html)
- [Node.js：File System](https://nodejs.org/api/fs.html)
- [Node.js：Path](https://nodejs.org/api/path.html)
- [Node.js：Process](https://nodejs.org/api/process.html)
- [Node.js：Child Process](https://nodejs.org/api/child_process.html)
- [Node.js：Stream](https://nodejs.org/api/stream.html)
- [npm package.json 说明](https://docs.npmjs.com/cli/configuring-npm/package-json/)
- [TypeScript TSConfig 参考](https://www.typescriptlang.org/tsconfig/)
- [pnpm 文档](https://pnpm.io/)
- [nvm-sh（macOS / Linux）](https://github.com/nvm-sh/nvm)
- [nvm-windows（Windows）](https://github.com/nvm-windows/nvm)

## 总结

Node.js 入门并不是记住一堆 API，而是建立一条完整的工程链路：**选择运行时 → 初始化工程 → 管理依赖 → 明确模块系统 → 编译 / 运行 TS → 操作文件与路径 → 管理当前进程 → 调用外部程序 → 做安全与异常处理**。

对于希望从前端拓展到全栈或 AI 应用开发的读者来说，`fs`、`path`、`process`、`child_process` 尤其值得动手练习，因为它们直接连接代码工程、服务器环境、自动化脚本和跨语言工具调用。
