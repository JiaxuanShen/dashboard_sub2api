# dashboard_sub2api

`dashboard_sub2api` 是一个给 `sub2api` 自用的只读 Dashboard，用来查看订阅、账号状态和用量信息。

## 工作方式

本项目自带一个轻量 Node 服务，直接监听一个本机端口并完成两件事：

- 提供 `dist/` 里的前端页面和静态资源。
- 把 `/dashboard-api/*` 代理到 `sub2api` 的 `/api/v1/admin/*`，并在服务端注入 `x-api-key`。

浏览器不会读取、保存或打包 admin key。

```text
浏览器 -> HTTPS 反向代理 -> 127.0.0.1:4180 dashboard 服务

/dashboard-api/* -> http://127.0.0.1:8080/api/v1/admin/*
```

## 环境变量

复制 `.env.example` 到服务器上的安全位置，例如 `/etc/dashboard_sub2api.env`：

```bash
SUB2API_BASE_URL=http://127.0.0.1:8080
SUB2API_ADMIN_API_KEY=replace-with-your-admin-api-key
DASHBOARD_HOST=127.0.0.1
DASHBOARD_PORT=4180
DASHBOARD_DIST_DIR=/opt/dashboard_sub2api/dist
```

建议把环境文件权限限制为 root 可读写：

```bash
chmod 600 /etc/dashboard_sub2api.env
chown root:root /etc/dashboard_sub2api.env
```

`SUB2API_ADMIN_API_KEY` 是 `sub2api` 后台的 Admin API Key。上游后台鉴权使用 `x-api-key`，不要把这个值写进前端 `.env.production`、源码、构建产物或公开的反向代理配置。

## 部署方式 A：服务器构建

适合服务器有 Node/npm，并且希望部署流程最直接的场景。

```bash
git clone <your-dashboard-repo> /tmp/dashboard_sub2api
cd /tmp/dashboard_sub2api
git pull --ff-only

npm ci
npm run test:run
npm run typecheck
npm run build
```

准备正式运行目录：

```bash
mkdir -p /opt/dashboard_sub2api
cp server.mjs package.json /opt/dashboard_sub2api/
cp -r dist /opt/dashboard_sub2api/
```

## 部署方式 B：本地构建后上传

可以。本地构建是可行的，而且能减少服务器上的 Node/npm 依赖和构建时间。前提是你上传的是已经构建好的 `dist/`，并且服务器仍然需要一个 Node 运行时来执行 `server.mjs`。

本地执行：

```bash
npm ci
npm run test:run
npm run typecheck
npm run build
```

上传到服务器的最小文件集：

```text
server.mjs
package.json
dist/
```

放到服务器运行目录：

```bash
mkdir -p /opt/dashboard_sub2api
# 将 server.mjs、package.json、dist/ 放入 /opt/dashboard_sub2api
```

注意：当前前端构建使用 `base: '/'`，因此适合部署在独立域名或根路径，例如 `https://dashboard.example.com/`。如果要挂在 `/dashboard/` 子路径，需要同步调整 Vite base 和静态服务路径。

## systemd 服务

示例服务文件在 `deploy/dashboard-sub2api.service`。如果服务器上的 Node 不在 `/usr/bin/node`，需要把 `ExecStart` 改成实际路径：

```ini
ExecStart=/path/to/node /opt/dashboard_sub2api/server.mjs
```

启用服务：

```bash
cp deploy/dashboard-sub2api.service /etc/systemd/system/dashboard-sub2api.service
systemctl daemon-reload
systemctl enable --now dashboard-sub2api.service
systemctl status dashboard-sub2api.service
```

推荐让 dashboard 服务只监听本机：

```bash
DASHBOARD_HOST=127.0.0.1
DASHBOARD_PORT=4180
```

## HTTPS 反向代理

公网建议只暴露 80/443，由 Caddy、Nginx 或其他反向代理转发到本机 dashboard 服务：

```text
https://dashboard.example.com -> http://127.0.0.1:4180
```

API 请求链路：

```text
浏览器
  -> https://dashboard.example.com/dashboard-api/accounts
  -> 127.0.0.1:4180/dashboard-api/accounts
  -> http://127.0.0.1:8080/api/v1/admin/accounts
```

admin key 只存在 `/etc/dashboard_sub2api.env`，不需要写进反向代理配置。

## 本地开发

```bash
npm install
npm run dev
```

开发服务器只负责前端热更新。连接真实 `sub2api` 时，建议单独运行构建版：

```bash
npm run build
npm run serve
```

## 验证

```bash
npm run test:run
npm run typecheck
npm run build
```

部署后可以检查：

```text
页面：/
静态资源：/assets/*.js、/assets/*.css
API：/dashboard-api/accounts
API：/dashboard-api/subscriptions
API：/dashboard-api/accounts/{id}/usage
```

## 当前范围

第一版是只读窗口，包含：

- 订阅管理列表和用量窗口
- 账号管理列表、调度状态、容量和账号状态
- 顶部汇总、刷新、错误提示

暂不包含编辑、删除、撤销订阅、重置配额、切换调度、分配订阅等写操作。
