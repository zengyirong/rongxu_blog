# HTTPS 上线手册（HTTP → 证书 → Nginx → 可访问）

> 适用：阿里云 ECS + 自有域名 + Nginx 反向代理  
> 实操案例域名：`rxxnx.cn`（验证地址示例：https://rxxnx.cn/homes）  
> 日期：2026-09-15  
> 目的：把一次完整 HTTPS 部署过程固化成可复用步骤，下次换域名/换机可照抄。

---

## 0. 一句话先懂概念

| 概念 | 白话 |
|---|---|
| **HTTP** | 浏览器和服务器传数据的约定，**明文**，地址以 `http://` 开头，默认端口 **80** |
| **HTTPS** | HTTP + **TLS 加密 + 证书校验**，地址以 `https://` 开头，默认端口 **443** |
| **证书** | 证明「你访问的确实是这个域名」，并用于加密通信 |
| **Nginx** | 通常站在最前面：对外收 HTTPS，对内再转给本机前端静态资源 / 后端端口 |

推荐结构：

```text
用户浏览器
    │  HTTPS :443（加密）
    ▼
Nginx（挂证书）
    │  本机 HTTP（不暴露公网也可）
    ▼
静态站点（dist） + 后端（如 127.0.0.1:3004）
```

本地开发继续用 `http://localhost` 即可；**对外正式环境用 HTTPS**。

---

## 1. 前置条件清单

开始前确认：

- [ ] 已有云服务器（本手册以 **阿里云 ECS** 为例）
- [ ] 已有域名（案例：`rxxnx.cn`）
- [ ] 能 SSH / 面板登录服务器（root 或有 sudo）
- [ ] 服务器上已安装 **Nginx**（或准备安装）

**证书本身可以免费**（阿里云「个人测试证书」或 Let’s Encrypt）。花钱的通常是服务器、域名续费，不是 DV 证书。

---

## 2. 总流程（按顺序做）

```text
① 域名解析到 ECS IP
        ↓
② 安全组放行 80 / 443
        ↓
③ 申请免费 SSL 证书并下载（Nginx 格式）
        ↓
④ 证书上传到服务器固定目录
        ↓
⑤ 修改 Nginx：listen 443 + 证书路径（可选：80 跳转 HTTPS）
        ↓
⑥ nginx -t && reload
        ↓
⑦ 浏览器访问 https://你的域名/... 确认小锁
```

下面按步骤展开（含本项目实操路径）。

---

## 3. 域名解析

### 3.1 阿里云 DNS

域名控制台 → `rxxnx.cn` → 解析设置，至少：

| 主机记录 | 类型 | 记录值 |
|---|---|---|
| `@` | A | ECS 公网 IP（案例：`x.xxx.xxx.xxx`） |
| `www`（可选） | A | 同一公网 IP |

### 3.2 验证

在服务器或本机：

```bash
ping rxxnx.cn
```

应解析到你的 ECS IP。  
（在服务器本机 ping 延迟很低是正常的，主要看解析 IP 是否正确。）

---

## 4. 安全组（防火墙放行）

ECS → 安全组 → 入方向，确保：

| 端口 | 用途 |
|---|---|
| **80** | HTTP；证书校验 / HTTP→HTTPS 跳转常用 |
| **443** | HTTPS |

说明：

- 安全组「放行 80」≠ 某个项目独占该端口，只表示外网可以打进来。
- 若列表里已有 HTTP(80)，**保留**；再 **新增 HTTPS(443)** 即可。
- 案例新增规则示例：允许 / TCP / 源 `0.0.0.0/0` / 目的 `HTTPS(443)` / 描述「新增HTTPS」。

---

## 5. 申请免费证书（阿里云）

### 5.1 入口

控制台搜索：**数字证书管理服务 / SSL 证书**。

### 5.2 选免费额度（避免误付费）

1. 选 **个人测试证书**（每人每年有免费额度，常见约 20 张）。
2. 证书类型选免费；**自动化服务版本选「基础版」**。
3. **不要**默认勾选「标准版」等增值包（否则订单会出现约 ¥7 之类费用）。
4. 专家人工服务选 **不需要**。
5. 确认右侧 **应付金额 = ¥0.00** 再提交。

有效期：个人测试证书通常约 **90 天**（以控制台说明为准），到期需重新领取并更换服务器上的文件。

### 5.3 域名与授权

- 绑定域名：`rxxnx.cn`（若申请时包含 `www.rxxnx.cn` 更好，与证书一致）。
- 若弹出 **RAM 访问控制快速授权**：按提示完成（创建角色/策略），完成后点「返回控制台」继续申请。

### 5.4 看是否签发成功

路径：**证书管理 → 个人测试证书（原免费证书）**。

| 状态 | 含义 |
|---|---|
| 待申请 / 待验证 | 还没做完域名验证 |
| 审核中 | 等待签发（多为几分钟～十几分钟） |
| **已签发** | 可以下载 |

### 5.5 下载

打开「证书下载」→ 选 **Nginx**（`pem/key`）→ 下载压缩包。

解压后通常得到：

- `rxxnx.cn.pem`（证书）
- `rxxnx.cn.key`（私钥）

不要选 Tomcat / IIS（除非你的 Web 服务器就是那些）。

---

## 6. 证书放到服务器哪里

### 6.1 推荐目录（不要乱放）

**推荐：**

```text
/etc/nginx/ssl/rxxnx.cn/
├── rxxnx.cn.pem
└── rxxnx.cn.key
```

- 目录挂在 `/etc/nginx/` 下，方便写配置、也好找。
- **不要**直接扔在 `/etc/nginx/` 根目录与 `nginx.conf` 混在一起。
- **不要**放进网站公开目录（如 `dist/`、`/var/www/html`），避免私钥被下载。

### 6.2 创建目录并设权限

```bash
sudo mkdir -p /etc/nginx/ssl/rxxnx.cn
# 用面板或 scp 上传两个文件到该目录后：
sudo chmod 644 /etc/nginx/ssl/rxxnx.cn/rxxnx.cn.pem
sudo chmod 600 /etc/nginx/ssl/rxxnx.cn/rxxnx.cn.key
```

`key` 必须仅管理员可读。

---

## 7. 配置 Nginx（核心）

### 7.1 先看谁占用了 80/443

```bash
ss -lntp | grep -E ':80|:443'
```

案例当时结果：

- Nginx 已监听 **80**、**8080**
- **尚无 443**（加配置前的正常状态）

### 7.2 看现有站点配置

```bash
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/conf.d/
```

案例（同一域名两套站）：

| 配置名 | 端口 | 说明 |
|---|---|---|
| `newSystem` | **80** | 主站 `rxxnx.cn`（静态 + `/pro-api/` 反代） |
| `hospital-ai` | **8080** | 另一套系统，本次可不改 |

**HTTPS（443）加在主站 `newSystem` 上**，这样访问 `https://rxxnx.cn/...` 才会走证书。

### 7.3 备份

```bash
cp /etc/nginx/sites-available/newSystem /etc/nginx/sites-available/newSystem.bak
```

### 7.4 目标配置模板（可复用）

编辑：

```bash
nano /etc/nginx/sites-available/newSystem
```

可参考如下结构（按你的 `root` / `proxy_pass` 改路径与端口）：

```nginx
# HTTP → HTTPS
server {
    listen 80;
    server_name rxxnx.cn www.rxxnx.cn;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl;
    server_name rxxnx.cn www.rxxnx.cn;

    ssl_certificate     /etc/nginx/ssl/rxxnx.cn/rxxnx.cn.pem;
    ssl_certificate_key /etc/nginx/ssl/rxxnx.cn/rxxnx.cn.key;

    root /opt/newSystem/vue_elmp_ts_vt/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /pro-api/ {
        proxy_pass http://127.0.0.1:3004/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3004/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

要点：

- `ssl_certificate` / `ssl_certificate_key` 路径必须与实际上传文件一致。
- `server_name` 建议只用域名；证书一般不签给裸 IP，用 IP 访问 HTTPS 易出证书警告。
- 反代到本机后端仍用 `http://127.0.0.1:端口`（内网明文即可）。
- 建议带上 `X-Forwarded-Proto $scheme`，方便后端识别「用户其实是 HTTPS 进来的」。

### 7.5 检查并重载

```bash
nginx -t && systemctl reload nginx
ss -lntp | grep -E ':80|:443'
```

期望：

- `nginx -t`：`syntax is ok` / `test is successful`
- `ss`：能看到 nginx 监听 **443**

若 `nginx -t` 失败：**不要 reload**，根据报错改配置；可用备份回滚：

```bash
cp /etc/nginx/sites-available/newSystem.bak /etc/nginx/sites-available/newSystem
nginx -t && systemctl reload nginx
```

---

## 8. 验收

浏览器访问：

- https://rxxnx.cn/homes  
- 或 https://rxxnx.cn/

检查：

- [ ] 地址栏有锁 / 连接安全
- [ ] `http://rxxnx.cn` 会 301 跳到 `https://`
- [ ] 页面能打开；若有接口，Network 里 API 也应是 `https://` 同源或同样 https，避免混合内容

---

## 9. 常见坑

| 现象 | 可能原因 | 处理方向 |
|---|---|---|
| 证书订单要付钱 | 勾了「标准版」等增值服务 | 改回 **基础版**，应付 ¥0 |
| 一直待验证 | DNS 未生效或验证记录未加 | 检查解析 / 按控制台补记录 |
| `nginx -t` 失败 | 证书路径错、少分号、大括号不配 | 对照报错行号修改 |
| 443 连不上 | 安全组未放行 443 / 未 reload | 查安全组 + `ss` |
| 页面 https，接口 http | 前端 API 仍写死 `http://` | 改生产环境 API 为 `https://` 或相对路径 |
| 证书到期网站报警 | 个人测试证书约 90 天 | 重新领取 → 替换 pem/key → `nginx -t && reload` |
| 改配置影响旧站 | 同机多站点 | 只改目标 `server`；先备份；8080 等其它站可不动 |

---

## 10. 换域名 / 换机器时怎么复用

把下面占位符替换即可：

| 占位符 | 本案例取值 | 你下次填写 |
|---|---|---|
| `YOUR_DOMAIN` | `rxxnx.cn` | |
| `YOUR_IP` | `x.xxx.xxx.xxx` | |
| `CERT_DIR` | `/etc/nginx/ssl/rxxnx.cn` | |
| `NGINX_SITE` | `/etc/nginx/sites-available/newSystem` | |
| `WEB_ROOT` | `/opt/newSystem/vue_elmp_ts_vt/dist` | |
| `BACKEND` | `http://127.0.0.1:3004` | |

检查清单（下次上线可直接勾）：

1. [ ] A 记录 → 新 IP  
2. [ ] 安全组 80/443  
3. [ ] 新域名证书已签发并下载 Nginx 包  
4. [ ] 上传到 `CERT_DIR`，`chmod` 完成  
5. [ ] Nginx `server_name` + 证书路径已改  
6. [ ] `nginx -t && systemctl reload nginx`  
7. [ ] 浏览器 https 验收  

---

## 11. 与本仓库（ai-assistant-platform）的关系

本手册记录的是 **域名 `rxxnx.cn` 在 ECS 上为已有 `newSystem` 站点启用 HTTPS** 的完整过程。

后续若把 **本仓库前端/后端** 部署到同一域名：

- 证书与 443 可继续复用（不必重新「发明」HTTPS）。
- 需要新增/调整 Nginx `location`（例如静态资源目录、`/api` 反代到 uvicorn 端口），并保证前端生产环境 API 使用 `https://`。
- 本地开发仍用 HTTP；不要把服务器证书流程套到 localhost。

---

## 12. 变更记录

| 日期 | 内容 |
|---|---|
| 2026-09-15 | 初版：基于 `rxxnx.cn` 实操（解析 → 安全组 → 阿里云免费证书 → `/etc/nginx/ssl` → `newSystem` 443 → https 可访问） |
