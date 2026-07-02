# dashboard_sub2api

<div align="center">

[![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Private-lightgrey.svg)](#)

**面向 sub2api 的只读运维 Dashboard**

</div>

## 项目概览

`dashboard_sub2api` 是一个独立部署在 `sub2api` 同服务器上的只读运维面板，用于集中查看订阅、账号状态、账号容量、调度状态和上游账号用量窗口。

项目设计目标是让日常查看更直接，同时避免把 `sub2api` Admin API Key 暴露给浏览器。前端只访问 Dashboard 后端提供的同源接口，Admin API Key 仅保存在服务器环境变量中。

## 功能特性

- **订阅概览**：查看生效订阅、套餐、到期时间和订阅用量窗口。
- **账号概览**：查看账号平台、类型、并发容量、会话、RPM、状态和调度开关。
- **账号用量窗口**：直接展示 OpenAI / Claude 等上游账号的 5h、7d、7d Sonnet 等窗口用量。
- **只读界面**：不提供编辑、删除、撤销、重置配额、切换调度等写操作。
- **服务端代理**：Dashboard 后端代理 `sub2api` Admin API，并在服务端注入 `x-api-key`。
- **自更新能力**：可在页面内检测 GitHub Release，并下载安装到当前服务器。
- **Release 构建**：通过 GitHub Actions 自动测试、构建并生成部署 zip 包。

## 架构说明

```text
浏览器
  -> HTTPS 反向代理
  -> 127.0.0.1:4180 dashboard_sub2api
  -> http://127.0.0.1:8080/api/v1/admin/* sub2api
```

Dashboard 服务负责两件事：

1. 提供 `dist/` 中的 Vue 前端页面和静态资源。
2. 将 `/dashboard-api/*` 转发到 `sub2api` 的 `/api/v1/admin/*`，并在服务端注入 `SUB2API_ADMIN_API_KEY`。

浏览器不会读取、保存或打包 Admin API Key。

## 技术栈

| 组件 | 技术 |
| --- | --- |
| 前端 | Vue 3, Vite 5, TypeScript |
| 服务端 | Node.js 原生 HTTP 服务 |
| 测试 | Vitest, Vue Test Utils |
| 构建发布 | GitHub Actions, GitHub Releases |
| 部署方式 | systemd + 反向代理 |

## 快速部署

### 1. 下载 Release 包

从 GitHub Releases 下载最新构建包：

```text
dashboard_sub2api-vX.Y.Z.zip
```

### 2. 解压到部署目录

```bash
mkdir -p /opt/dashboard_sub2api
unzip dashboard_sub2api-vX.Y.Z.zip -d /tmp/dashboard_release
rsync -a --delete /tmp/dashboard_release/dashboard_sub2api/ /opt/dashboard_sub2api/
```

### 3. 准备环境变量

建议把环境变量放到 `/etc/dashboard_sub2api.env`：

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

限制环境文件权限：

```bash
chmod 600 /etc/dashboard_sub2api.env
chown root:root /etc/dashboard_sub2api.env
```

### 4. 安装 systemd 服务

构建包内包含 `dashboard-sub2api.service`，仓库内源文件位于 `deploy/dashboard-sub2api.service`。

```bash
cp /opt/dashboard_sub2api/dashboard-sub2api.service /etc/systemd/system/dashboard-sub2api.service
systemctl daemon-reload
systemctl enable --now dashboard-sub2api.service
systemctl status dashboard-sub2api.service
```

如果服务器上的 Node 不在 `/usr/bin/node`，需要调整服务文件中的 `ExecStart`。

### 5. 配置反向代理

建议 Dashboard 服务只监听本机，由 Caddy、Nginx 或其他反向代理暴露 HTTPS：

```text
https://dashboard.example.com -> http://127.0.0.1:4180
```

反向代理不需要配置 `SUB2API_ADMIN_API_KEY`。

## 页面内自更新

开启自更新：

```bash
DASHBOARD_UPDATE_ENABLED=true
DASHBOARD_UPDATE_KEY=replace-with-random-update-key
```

页面内输入 `DASHBOARD_UPDATE_KEY` 后可以执行：

1. 检测 GitHub Release 最新版本。
2. 下载 `dashboard_sub2api-vX.Y.Z.zip`。
3. 解压到临时目录并校验包结构。
4. 备份当前安装目录。
5. 替换应用文件。
6. 重启 dashboard 服务。

自更新依赖服务器可执行 `unzip`。默认重启命令为：

```bash
systemctl restart dashboard-sub2api.service
```

如果 Dashboard 服务不是 root 用户运行，建议只授予最小 sudo 权限：

```text
dashboard ALL=(root) NOPASSWD: /bin/systemctl restart dashboard-sub2api.service
```

并配置：

```bash
DASHBOARD_RESTART_COMMAND=sudo
DASHBOARD_RESTART_ARGS=/bin/systemctl restart dashboard-sub2api.service
```

## GitHub Actions 发布

仓库不提交 `dist/`。发布包由 GitHub Actions 生成。

工作流文件：

```text
.github/workflows/build-release.yml
```

每次发布会执行：

```bash
npm ci
npm run test:run
npm run typecheck
npm run build
```

按 tag 生成 Release：

```bash
git tag v0.1.0
git push origin v0.1.0
```

Release 资产命名：

```text
dashboard_sub2api-v0.1.0.zip
```

## 本地开发

安装依赖：

```bash
npm install
```

启动 Vite 开发服务：

```bash
npm run dev
```

连接真实 `sub2api` 时，建议使用构建后的 Node 服务：

```bash
npm run build
npm run serve
```

## 验证命令

```bash
npm run test:run
npm run typecheck
npm run build
```

部署后可以检查：

```text
页面：/
静态资源：/assets/*.js、/assets/*.css
订阅接口：/dashboard-api/subscriptions
账号接口：/dashboard-api/accounts
账号用量接口：/dashboard-api/accounts/{id}/usage
```

## 安全边界

- `SUB2API_ADMIN_API_KEY` 只允许保存在服务器环境变量中。
- 不要把 Admin API Key 写入前端 `.env.production`、源码、构建产物或反向代理配置。
- 自更新密钥 `DASHBOARD_UPDATE_KEY` 应使用随机长字符串。
- 建议 Dashboard 服务监听 `127.0.0.1`，公网只暴露 HTTPS 反向代理。
- 页面当前定位为只读运维面板，不提供会修改 sub2api 数据的管理操作。

## 当前范围

当前版本聚焦只读浏览：

- 订阅列表和订阅用量窗口。
- 账号列表、账号容量、调度状态和账号状态。
- 账号 5h、7d、7d Sonnet 用量窗口。
- 顶部汇总、刷新、错误提示和自更新入口。

暂不包含编辑账号、删除账号、撤销订阅、重置配额、切换调度、分配订阅等写操作。
