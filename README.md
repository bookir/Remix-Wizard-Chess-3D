# 🧙‍♂️ 3D Wizard Chess (巫师棋 3D 圣殿重制版)

基于 **Vite + React 19 + TypeScript + Three.js** 构建的高沉浸感 3D 巫师棋游戏。支持哥特式圣殿光影渲染、全动态打击碎石物理、双语语音解说音效、本地双人 / 人机对弈模式，以及接入各大主流大模型（Google Gemini、OpenAI、DeepSeek 等）的 AI 对弈与棋圣锦囊功能。

---

## 📋 目录
- [环境要求](#-环境要求)
- [本地运行与编译步骤](#-本地运行与编译步骤)
- [大模型与 API 配置](#-大模型与-api-配置)
- [部署指南](#-部署指南)
  - [方案一：Vercel / Netlify / Cloudflare Pages（推荐，极简免费）](#方案一vercel--netlify--cloudflare-pages推荐极简免费)
  - [方案二：Nginx / 自建云服务器](#方案二nginx--自建云服务器)
  - [方案三：Docker 容器化部署](#方案三docker-容器化部署)
  - [方案四：GitHub Pages 静态托管](#方案四github-pages-静态托管)

---

## 💻 环境要求

在开始前，请确保本地电脑已安装：
- **Node.js**: `v18.0.0` 或更高版本（推荐 `v20.x LTS` 或 `v22.x LTS`）
- **包管理工具**: `npm`（自带），或 `pnpm` / `yarn` / `bun`

验证安装命令：
```bash
node -v
npm -v
```

---

## 🚀 本地运行与编译步骤

### 1. 克隆或解压工程
将下载的代码解压，并在终端中进入项目根目录：
```bash
cd wizard-chess
```

### 2. 安装项目依赖
```bash
npm install
# 或者使用 pnpm / bun / yarn:
# pnpm install
# bun install
```

### 3. 启动本地开发服务器
```bash
npm run dev
```
启动成功后，终端会输出访问地址，默认在浏览器中打开：
👉 **http://localhost:3000**

> 提示：在开发模式下，支持热更新（HMR）。修改代码后浏览器会自动刷新。

### 4. 类型检查与代码校验
```bash
npm run lint
```
执行 TypeScript 静态类型检查，确保没有类型与语法错误。

### 5. 编译生产环境包 (Build)
```bash
npm run build
```
编译完成后，会在项目根目录下生成 **`dist/`** 静态产物目录。该目录包含了经过极致压缩与打包的所有 HTML、JS、CSS 与 3D 模型资产。

### 6. 本地预览生产构建产物
在本地快速验证打包后的 `dist/` 是否能正常工作：
```bash
npm run preview
```

---

## 🛠 使用 Makefile 一键编译与远程部署

工程根目录提供了配置完备的 `Makefile`，支持本地开发、类型检查、编译打包以及一键通过 `scp` 上传部署到远程服务器：

### 1. 基础命令
```bash
make install       # 安装依赖 (npm install)
make dev           # 启动本地开发服务 (localhost:3000)
make lint          # 执行 TypeScript 静态类型检查
make build         # 编译生产打包产物 (dist)
make clean         # 清理 dist 构建目录
make show-config   # 查看当前配置的远程部署参数
```

### 2. 一键编译并 scp 远程部署
```bash
# 自动编译并在编译通过后通过 scp 上传至远程服务器
make deploy
```
> 默认部署目标配置在 `Makefile` 顶部：
> - `REMOTE_HOST` = `book-vpn.softether.net`
> - `REMOTE_USER` = `root`
> - `REMOTE_PORT` = `22`
> - `REMOTE_DIR`  = `/web/wizard-chess/`

### 3. 自定义远程主机、端口或目录
无需修改文件，直接在执行 `make deploy` 时传入参数即可覆盖：
```bash
# 指定不同 IP / 主机名
make deploy REMOTE_HOST=192.168.1.100

# 指定非标准 SSH 端口 (如 2222)
make deploy REMOTE_PORT=2222

# 指定自定义部署目录与用户
make deploy REMOTE_USER=ubuntu REMOTE_DIR=/var/www/wizard-chess/

# 指定 SSH 私钥文件
make deploy SSH_KEY=~/.ssh/my_id_rsa

# 远程全新覆盖部署（先清空远程旧文件再上传）
make deploy-clean

# 远程直接重载 Nginx
make reload-nginx
```

---

## 🧠 大模型与 API 配置说明

本项目为**纯前端单页应用（SPA）**，不需要运行额外的后端服务：
1. **纯前端运行**：所有的 3D 渲染、落子规则、极大极小博弈评估、Web Audio 拟真音效、语音朗读均在用户浏览器中本地运行。
2. **LLM API Key 保密与存储**：
   - 用户在游戏界面右上角打开 **设置 (Settings)** 即可填入自己的 API Key（支持 Google Gemini、OpenAI、DeepSeek 或兼容 OpenAI 协议的第三方中转）。
   - Key 仅保存在用户浏览器的本地存储（`localStorage`）中，直接由浏览器向对应的 API 端点发起请求，**绝不会上传到任何中间服务器**。
   - 若未配置 API Key，系统会自动无缝切换至内置的 **2-Ply 极小化极大 (Minimax) + Alpha-Beta 剪枝与棋盘格价值评估引擎**，无需网络即可游玩。

---

## 🌐 部署指南

因为 `npm run build` 生成的是纯静态资源（`dist/` 文件夹），你可以将其部署在几乎任何静态托管平台或 Web 服务器上。

### 方案一：Vercel / Netlify / Cloudflare Pages（推荐，极简免费）

这些平台均支持一键连接 GitHub 仓库，全自动编译并部署，并自带全球 CDN 加速与 HTTPS 证书：

- **Build Command（编译命令）**: `npm run build`
- **Output Directory（发布目录）**: `dist`
- **Node Version**: `18.x` 或 `20.x`

#### 以 Vercel CLI 为例：
```bash
npm i -g vercel
vercel
```

#### 以 Netlify CLI 为例：
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

---

### 方案二：Nginx / 自建云服务器

#### 1. 部署在根路径（例如 `https://your-domain.com/`）
将 `dist/` 内的文件上传至服务器目录（如 `/var/www/wizard-chess/`）：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/wizard-chess;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### 2. 部署在子路径（例如 `https://book-vpn.softether.net:4433/wizard-chess/`）（★ 重点）
如果需要将游戏部署在子路径 `/wizard-chess/`，需要满足两个条件：

##### ① 前端打包基准路径 (已配置完成)
在 `vite.config.ts` 中配置 `base: './'`（本项目已预先配好）。这样打包出的 `index.html` 会以 `./assets/...` 相对路径引用静态资源，自动适配任何子路径，不会硬编码向根路径 `/assets/...` 请求。

##### ② Nginx 子路径配置（提供两种标准写法，二选一即可）：

**推荐写法 A（使用 `alias`）：**
```nginx
server {
    listen 4433 ssl;
    server_name book-vpn.softether.net;

    # SSL 证书及协议配置...
    # ssl_certificate /path/to/fullchain.pem;
    # ssl_certificate_key /path/to/privkey.pem;

    # 1. 强制无斜杠重定向到带斜杠，避免相对路径 ./assets 解析层级错误
    location = /wizard-chess {
        return 301 /wizard-chess/;
    }

    # 2. 子路径映射（注意：alias 路径末尾的 / 必须保留）
    location /wizard-chess/ {
        alias /web/wizard-chess/;
        index index.html;
        try_files $uri $uri/ /wizard-chess/index.html;
    }

    # 3. 静态资源与 3D GLB 模型长效缓存与 MIME 类型
    location ~* \.(?:glb|b64|gz|js|css|png|jpg|svg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }
}
```

**推荐写法 B（使用 `root`）：**
因为你的目录为 `/web/wizard-chess/`，如果使用 `root /web;`，Nginx 会自动将请求 `/wizard-chess/assets/xxx` 拼接为 `/web` + `/wizard-chess/assets/xxx`，天然契合你的目录结构：
```nginx
server {
    listen 4433 ssl;
    server_name book-vpn.softether.net;

    # SSL 证书配置...

    location /wizard-chess/ {
        root /web;
        index index.html;
        try_files $uri $uri/ /wizard-chess/index.html;
    }
}
```

##### ③ 文件与目录权限排查
确保 Nginx 运行用户（通常为 `www-data`、`nginx` 或 `nobody`）有权访问该目录：
```bash
# 给予上级目录可执行(进入)权限，以及项目目录读取权限
chmod +x /web
chmod -R 755 /web/wizard-chess

# 测试 Nginx 配置语法无误并重新加载
nginx -t && nginx -s reload
```

---

### 方案三：Docker 容器化部署

如果你习惯使用 Docker 进行容器化部署与流水线交付，可在项目根目录下创建以下两个文件：

#### 1. `Dockerfile`
```dockerfile
# ---- 第一阶段：编译前端 ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- 第二阶段：基于 Nginx 运行静态页面 ----
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 2. 构建与运行容器
```bash
# 构建镜像
docker build -t wizard-chess:latest .

# 启动容器映射到 8080 端口
docker run -d -p 8080:80 --name my-wizard-chess wizard-chess:latest
```
访问 `http://localhost:8080` 即可开始游戏。

---

### 方案四：GitHub Pages 静态托管

若希望直接托管在 GitHub Pages：
1. 若项目部署在二级路径（如 `https://<username>.github.io/<repo-name>/`），请在 `vite.config.ts` 中配置 `base`:
   ```ts
   export default defineConfig({
     base: './', // 或 '/<repo-name>/'
     plugins: [react()],
   })
   ```
2. 安装 `gh-pages` 工具：
   ```bash
   npm install -D gh-pages
   ```
3. 在 `package.json` 的 `scripts` 中增加一条命令：
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```
4. 执行发布：
   ```bash
   npm run deploy
   ```

---

## 🛠 常见问题排查 (FAQ)

1. **本地启动出现 `node: not found` 或版本报错？**
   - 请升级 Node.js 至 18.0 或以上版本。推荐使用 [nvm](https://github.com/nvm-sh/nvm) 进行版本管理：`nvm install 20 && nvm use 20`。
2. **下载到本地后 3D 棋盘模型不显示或变黑？**
   - 检查浏览器是否启用了 WebGL 硬件加速（在 Chrome 地址栏访问 `chrome://gpu`，确认 WebGL 为 Hardware accelerated）。
3. **调用大模型时提示网络错误（Failed to fetch / Network error）？**
   - 若使用 OpenAI 或 Gemini 官方 API，国内网络直连可能会被拦截。建议在设置中填入支持 CORS 跨域代理的中转 API URL（如自建 Cloudflare Worker 反向代理或第三方中转地址）。
