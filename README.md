# dashboard_sub2api

`dashboard_sub2api` 是一个给 `sub2api` 使用的只读 Dashboard，用来浏览订阅管理和账户管理中的用量、状态和容量信息。

GitHub 只用于管理代码。页面不部署到 GitHub Pages，而是和 `sub2api` 部署在同一台服务器上。

## 安全模型

前端不会保存 admin token，也不会在构建产物里包含 token。

浏览器只请求相对路径：

```text
/dashboard-api/*
```

服务器反向代理再转发到本机 `sub2api` admin API：

```text
/dashboard-api/* -> http://127.0.0.1:8080/api/admin/*
```

admin token 只放在服务器侧，由 Nginx、Caddy 或其他反向代理注入 `Authorization` 请求头。不要把 admin token 写入前端代码、`.env.production`、GitHub Actions 构建变量或任何会进入浏览器的配置。

## 本地开发

```powershell
npm install
npm run dev
```

开发服务器默认绑定到 `127.0.0.1`。如果要连接真实 `sub2api`，建议在本机或测试服务器配置同样的 `/dashboard-api/` 反向代理。

## 验证

```powershell
npm run test:run
npm run typecheck
npm run build
```

构建产物输出到 `dist/`。

## 同服务器部署

1. 在服务器上拉取本仓库，或把本地构建后的 `dist/` 上传到服务器。
2. 执行 `npm ci && npm run build`。
3. 将 `dist/` 作为 `/dashboard/` 静态站点目录。
4. 将 `/dashboard-api/` 反向代理到 `sub2api` 的 `/api/admin/`。
5. 在服务器环境变量或代理服务的安全配置中保存 `SUB2API_ADMIN_TOKEN`。

示例配置在：

- `deploy/nginx.example.conf`
- `deploy/caddy.example.conf`

Nginx 默认不会直接展开配置文件里的 `${SUB2API_ADMIN_TOKEN}`。可以用 `envsubst` 生成最终配置，或者改成你服务器上的安全注入方式。

```bash
export SUB2API_ADMIN_TOKEN="你的-admin-token"
envsubst '$SUB2API_ADMIN_TOKEN' < deploy/nginx.example.conf > /etc/nginx/conf.d/dashboard_sub2api.conf
nginx -t
systemctl reload nginx
```

Caddy 可以读取环境变量：

```bash
export SUB2API_ADMIN_TOKEN="你的-admin-token"
caddy reload --config /etc/caddy/Caddyfile
```

## 当前范围

第一版是只读浏览窗口，包含：

- 订阅管理列表和用量窗口
- 账户管理列表、调度状态、容量和账户状态
- 顶部汇总、刷新、错误提示

暂不包含编辑、删除、撤销订阅、重置配额、切换调度、分配订阅或刷新凭据等写操作。
