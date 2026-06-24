# dashboard_sub2api

`dashboard_sub2api` 是一个给 `sub2api` 自用的只读 Dashboard，用来查看订阅、账号状态和用量信息。

## 推荐部署方式

本项目自带一个轻量 Node 服务，直接监听端口并完成两件事：

- 提供 `dist/` 里的前端页面。
- 把 `/dashboard-api/*` 代理到 `sub2api` 的 `/api/v1/admin/*`，并在服务端注入 `x-api-key`。

浏览器不会读取、保存或打包 admin key。

```text
http://your-server:4180/
http://your-server:4180/dashboard-api/accounts

/dashboard-api/* -> http://127.0.0.1:8080/api/v1/admin/*
```

## 环境变量

复制 `.env.example` 到服务器上的安全位置，例如 `/etc/dashboard_sub2api.env`：

```bash
SUB2API_BASE_URL=http://127.0.0.1:8080
SUB2API_ADMIN_API_KEY=你的-admin-api-key
DASHBOARD_HOST=0.0.0.0
DASHBOARD_PORT=4180
DASHBOARD_DIST_DIR=dist
```

`SUB2API_ADMIN_API_KEY` 是 `sub2api` 后台的 Admin API Key。上游后台鉴权使用 `x-api-key`，不要把这个值写进前端 `.env.production`、源码或构建产物。

## 构建与运行

```bash
npm ci
npm run build
npm run serve
```

运行时会默认读取当前目录下的 `dist/`。如果用 systemd，请把仓库或部署目录放到 `/opt/dashboard_sub2api`，并使用 `deploy/dashboard-sub2api.service`：

```bash
cp deploy/dashboard-sub2api.service /etc/systemd/system/dashboard-sub2api.service
systemctl daemon-reload
systemctl enable --now dashboard-sub2api
```

## 本地开发

```bash
npm install
npm run dev
```

开发服务器只负责前端热更新。连接真实 `sub2api` 时，建议单独运行 `npm run serve` 的构建版，或在本机配置等价的 `/dashboard-api/` 代理。

## 验证

```bash
npm run test:run
npm run typecheck
npm run build
```

## 当前范围

第一版是只读窗口，包含：

- 订阅管理列表和用量窗口
- 账号管理列表、调度状态、容量和账号状态
- 顶部汇总、刷新、错误提示

暂不包含编辑、删除、撤销订阅、重置配额、切换调度、分配订阅等写操作。
