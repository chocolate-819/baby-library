# 后端部署指南

本文档详细说明如何将 Express 后端部署到公网服务器。

---

## 方案一：Railway 部署（推荐，免费额度）

### 前置准备

1. **GitHub 账号** - 用于代码托管和 Railway 登录
2. **Supabase 项目** - 已创建并获取连接信息
3. **百度网盘开放平台** - 已创建应用并获取 AppKey 和 AppSecret

---

### 第一步：将代码推送到 GitHub

#### 1.1 创建 `.gitignore` 文件

确保以下内容在 `.gitignore` 中（不要提交敏感信息）：

```gitignore
# Dependencies
node_modules/

# Environment files
.env
.env.local
.env.*.local

# Build output
dist/
build/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Coze config (private)
.coze
.cozeproj
```

#### 1.2 初始化 Git 仓库并推送

```bash
# 进入项目根目录
cd /workspace/projects

# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: 幼儿阅读学习应用初始版本"

# 在 GitHub 创建新仓库后，添加远程地址
# 替换 your-username 和 your-repo 为您的实际信息
git remote add origin https://github.com/your-username/kids-reading-app.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

---

### 第二步：在 Railway 创建项目

#### 2.1 登录 Railway

1. 访问 [https://railway.app](https://railway.app)
2. 点击 **"Start a New Project"**
3. 选择 **"Login with GitHub"**
4. 授权 Railway 访问您的 GitHub 仓库

#### 2.2 部署项目

1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 选择您刚才推送的仓库
4. Railway 会自动检测到 Node.js 项目

---

### 第三步：配置环境变量

在 Railway 项目页面：

1. 点击项目进入详情
2. 选择 **"Variables"** 标签
3. 点击 **"New Variable"** 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 生产环境标识 |
| `PORT` | `9091` | 服务端口 |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJ...` | Supabase 匿名密钥 |
| `BAIDU_APP_KEY` | `z1KMJhwkSdl5ssRNr36PdE0zhACtpjp2` | 百度网盘 AppKey |
| `BAIDU_APP_SECRET` | `您的AppSecret` | 百度网盘 AppSecret |

> ⚠️ **重要**：暂时先不设置 `BAIDU_REDIRECT_URI`，等部署完成后获取域名再设置。

---

### 第四步：部署并获取域名

#### 4.1 触发部署

1. 添加完环境变量后，Railway 会自动触发部署
2. 点击 **"Deployments"** 标签查看部署进度
3. 等待部署完成（通常 1-3 分钟）

#### 4.2 获取域名

1. 部署成功后，点击 **"Settings"** 标签
2. 滚动到 **"Domains"** 部分
3. 点击 **"Generate Domain"** 生成免费域名
4. 您会得到类似 `xxx-production.up.railway.app` 的域名

#### 4.3 更新回调地址

1. 回到 **"Variables"** 标签
2. 添加/更新 `BAIDU_REDIRECT_URI` 变量：
   ```
   BAIDU_REDIRECT_URI=https://您的railway域名/api/v1/baidu/callback
   ```
3. Railway 会自动重新部署

---

### 第五步：更新百度网盘开放平台配置

1. 登录 [百度网盘开放平台](https://pan.baidu.com/union/doc/)
2. 进入您的应用设置
3. 在 **"回调地址"** 中添加：
   ```
   https://您的railway域名/api/v1/baidu/callback
   ```
4. 保存配置

---

### 第六步：验证部署

使用 curl 或浏览器测试：

```bash
# 健康检查
curl https://您的railway域名/api/v1/health

# 应该返回
{"status":"ok"}
```

---

## 方案二：Render 部署（备选）

### 步骤

1. 访问 [https://render.com](https://render.com)
2. 使用 GitHub 登录
3. 点击 **"New"** → **"Web Service"**
4. 选择您的 GitHub 仓库
5. 配置：
   - **Name**: `kids-reading-api`
   - **Root Directory**: `server`
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `node dist/index.js`
   - **Instance Type**: Free
6. 添加环境变量（同 Railway）
7. 点击 **"Deploy Web Service"**

---

## 方案三：自有服务器部署

如果您有自己的云服务器（阿里云、腾讯云等）：

### 1. 服务器环境准备

```bash
# 安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 PM2（进程管理）
npm install -g pm2
```

### 2. 上传代码

```bash
# 方式一：Git clone
git clone https://github.com/your-username/kids-reading-app.git
cd kids-reading-app/server

# 方式二：使用 scp 上传
```

### 3. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << EOF
NODE_ENV=production
PORT=9091
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJ...
BAIDU_APP_KEY=z1KMJhwkSdl5ssRNr36PdE0zhACtpjp2
BAIDU_APP_SECRET=您的AppSecret
BAIDU_REDIRECT_URI=https://您的域名/api/v1/baidu/callback
EOF
```

### 4. 构建并启动

```bash
# 安装依赖
pnpm install

# 构建
pnpm run build

# 使用 PM2 启动
pm2 start dist/index.js --name "kids-reading-api"

# 设置开机自启
pm2 startup
pm2 save
```

### 5. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:9091/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 前端配置更新

部署完成后，需要更新前端的 API 地址：

### 方式一：更新环境变量

在部署前端时，设置：
```
EXPO_PUBLIC_BACKEND_BASE_URL=https://您的后端域名
```

### 方式二：修改代码

```typescript
// client/src/config/api.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';
```

---

## 常见问题

### Q1: 部署后 API 返回 500 错误

**原因**：环境变量未正确设置

**解决**：检查 Railway/Render 的 Variables 配置，确保所有必需变量都已添加

### Q2: 百度网盘授权失败

**原因**：回调地址不匹配

**解决**：
1. 确认 `BAIDU_REDIRECT_URI` 环境变量正确
2. 确认百度开放平台配置的回调地址一致

### Q3: 跨域错误 (CORS)

**原因**：后端未配置允许前端域名

**解决**：修改 `server/src/index.ts`：
```typescript
app.use(cors({
  origin: ['https://您的前端域名', 'http://localhost:5000'],
  credentials: true
}));
```

---

## 成本预估

| 平台 | 免费额度 | 预估月费用 |
|------|----------|------------|
| Railway | $5/月额度 | 免费（小流量） |
| Render | 750小时/月 | 免费 |
| 阿里云/腾讯云 | - | ¥50-100/月 |

---

## 下一步

1. 完成后端部署
2. 更新前端 API 地址
3. 测试完整流程
4. 如需帮助，随时提问！
