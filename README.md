# dashboard_sub2api

`dashboard_sub2api` 是一个给 `sub2api` 自用的只读 Dashboard，用来查看订阅、账号状态和用量信息。

## 工作方式

项目自带一个轻量 Node 服务，部署后直接监听一个本机端口，并完成两件事：

- 提供 `dist/` 里的前端页面和静态资源。
- 把 `/dashboard-api/*` 代理到 `sub2api` 的 `/api/v1/admin/*`，并在服务端注入 `x-api-key`。

浏览器不会读取、保存或打包 admin key。

```text
浏览器 -> HTTPS 反向代理 -> 127.0.0.1:4180 dashboard 服务

/dashboard-api/* -> http://127.0.0.1:8080/api/v1/admin/*
```

## GitHub Actions 自动编译

仓库不提交 `dist/`。编译产物由 GitHub Actions 生成 zip 包，服务器下载 zip 后解压部署。

工作流文件：

```text
.github/workflows/build-release.yml
```

它会执行：

```bash
npm ci
npm run test:run
npm run typecheck
npm run build
```

然后打包：

```text
dashboard_sub2api-<ref>.zip
└── dashboard_sub2api/
    ├── dist/
    ├── server.mjs
    ├── package.json
    ├── .env.example
    └── dashboard-sub2api.service
```

### 手动生成构建包

在 GitHub 仓库页面：

1. 打开 `Actions`
2. 选择 `Build deploy package`
3. 点击 `Run workflow`
4. 等运行完成后，在该 workflow run 的 `Artifacts` 下载 zip

### 按 tag 生成 Release

本地执行：

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions 会自动创建 Release，并上传：

```text
dashboard_sub2api-v0.1.0.zip
```

## 环境变量

复制 `.env.example` 到服务器上的安全位置，例如 `/etc/dashboard_sub2api.env`：

```bash
SUB2API_BASE_URL=http://127.0.0.1:8080
SUB2API_ADMIN_API_KEY=replace-with-your-admin-api-key
DASHBOARD_HOST=127.0.0.1
DASHBOARD_PORT=4180
DASHBOARD_DIST_DIR=/opt/dashboard_sub2api/dist
DASHBOARD_ROOT_DIR=/opt/dashboard_sub2api
DASHBOARD_INSTALL_DIR=/opt/dashboard_sub2api
DASHBOARD_GITHUB_REPO=JiaxuanShen/dashboard_sub2api
DASHBOARD_UPDATE_ENABLED=false
DASHBOARD_UPDATE_KEY=replace-with-random-update-key
DASHBOARD_SERVICE_NAME=dashboard-sub2api.service
DASHBOARD_RESTART_COMMAND=systemctl
DASHBOARD_RESTART_ARGS=restart dashboard-sub2api.service
```

建议把环境文件权限限制为 root 可读写：

```bash
chmod 600 /etc/dashboard_sub2api.env
chown root:root /etc/dashboard_sub2api.env
```

`SUB2API_ADMIN_API_KEY` 是 `sub2api` 后台的 Admin API Key。Dashboard 后端会用它请求 `x-api-key`，不要把这个值写进前端 `.env.production`、源码、构建产物或公开的反向代理配置。

`DASHBOARD_UPDATE_KEY` 用于 Dashboard 自更新接口。开启自更新时把 `DASHBOARD_UPDATE_ENABLED` 改为 `true`，并使用随机长字符串作为更新密钥。

## 使用构建包部署

把 GitHub Actions 生成的 zip 上传到服务器后：

```bash
mkdir -p /opt/dashboard_sub2api
unzip dashboard_sub2api-v0.1.0.zip -d /tmp/dashboard_release
rsync -a --delete /tmp/dashboard_release/dashboard_sub2api/ /opt/dashboard_sub2api/
systemctl restart dashboard-sub2api.service
```

如果是第一次部署，先准备环境文件和 systemd 服务。

## systemd 服务

示例服务文件在 `deploy/dashboard-sub2api.service`，构建包里也会包含一份 `dashboard-sub2api.service`。

如果服务器上的 Node 不在 `/usr/bin/node`，需要把 `ExecStart` 改成实际路径：

```ini
ExecStart=/path/to/node /opt/dashboard_sub2api/server.mjs
```

启用服务：

```bash
cp /opt/dashboard_sub2api/dashboard-sub2api.service /etc/systemd/system/dashboard-sub2api.service
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
浏览器 -> https://dashboard.example.com/dashboard-api/accounts
  -> 127.0.0.1:4180/dashboard-api/accounts
  -> http://127.0.0.1:8080/api/v1/admin/accounts
```

admin key 只存放在 `/etc/dashboard_sub2api.env`，不需要写进反向代理配置。

## 页面内自更新

开启自更新后，Dashboard 顶部会显示“检测更新”区域。输入 `DASHBOARD_UPDATE_KEY` 后可以：

1. 检测 GitHub Release 最新版本。
2. 下载 `dashboard_sub2api-vX.Y.Z.zip`。
3. 解压到临时目录并校验包结构。
4. 备份当前 `/opt/dashboard_sub2api`。
5. 替换应用文件。
6. 点击重启服务。

自更新需要服务器能执行 `unzip`。重启服务默认执行：

```bash
systemctl restart dashboard-sub2api.service
```

如果 dashboard 服务不是 root 用户运行，需要给运行用户配置最小 sudo 权限，或者让 systemd 服务以具备重启权限的用户运行。推荐 sudoers 只允许这一条命令：

```text
dashboard ALL=(root) NOPASSWD: /bin/systemctl restart dashboard-sub2api.service
```

然后配置：

```bash
DASHBOARD_RESTART_COMMAND=sudo
DASHBOARD_RESTART_ARGS=/bin/systemctl restart dashboard-sub2api.service
```

## 本地开发

```bash
npm install
npm run dev
```

连接真实 `sub2api` 时，建议单独运行构建版：

```bash
npm run build
npm run serve
```

## 本地验证

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

第一版是只读 Dashboard，包含：

- 订阅列表和订阅用量展示
- 账号列表、调度状态、容量和账号状态
- 账号 5h、7d 用量直接在账号列表内展示
- 顶部汇总、刷新、错误提示

暂不包含编辑、删除、撤销订阅、重置配额、切换调度、分配订阅等写操作。
