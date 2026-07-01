# Dashboard Self Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dashboard-controlled self-update flow that checks GitHub Releases, downloads the latest deploy package, replaces the installed dashboard files, and restarts the service from the UI.

**Architecture:** Keep `server.mjs` as the trusted backend boundary and add local-only system endpoints under `/dashboard-system/*`. Move update logic into focused Node modules so it is testable without touching real `/opt` or `systemctl`. The frontend calls these endpoints with an update key and shows current/latest version, update status, restart, and rollback controls.

**Tech Stack:** Node.js ESM, Vue 3, TypeScript, Vitest, native `fetch`, `fs/promises`, `child_process`, and a small zip extraction dependency or system `unzip`.

---

## File Structure

- Create `src/server/version.mjs`: read current version from `VERSION`, `package.json`, or fallback.
- Create `src/server/updater.mjs`: GitHub release lookup, version comparison, asset validation, download, extract, backup, install, rollback.
- Modify `server.mjs`: wire `/dashboard-system/version`, `/dashboard-system/check-updates`, `/dashboard-system/update`, `/dashboard-system/restart`, and `/dashboard-system/rollback`.
- Create `src/api/system.ts`: frontend API client for dashboard system endpoints.
- Create `src/components/UpdatePanel.vue`: update UI, key prompt, check/update/restart/rollback status.
- Modify `src/App.vue` and `src/style.css`: place update panel in toolbar area.
- Modify `.env.example`, `README.md`, `deploy/dashboard-sub2api.service`, `.github/workflows/build-release.yml`: document env vars and include `VERSION` in release package.
- Add tests in `src/__tests__/dashboardUpdate.spec.ts`, `src/__tests__/dashboardServer.spec.ts`, and component tests.

## Task 1: Version And Release Check

**Files:**
- Create: `src/server/version.mjs`
- Create: `src/server/updater.mjs`
- Test: `src/__tests__/dashboardUpdate.spec.ts`

- [ ] Write failing tests for reading current version and comparing `v0.1.2` vs `v0.1.3`.
- [ ] Write failing tests for choosing `dashboard_sub2api-v0.1.3.zip` from GitHub release assets.
- [ ] Implement version helpers and release check.
- [ ] Run `npm run test:run -- src/__tests__/dashboardUpdate.spec.ts`.

## Task 2: Authenticated System Endpoints

**Files:**
- Modify: `server.mjs`
- Test: `src/__tests__/dashboardServer.spec.ts`

- [ ] Write failing tests that `/dashboard-system/check-updates` rejects missing `x-dashboard-update-key`.
- [ ] Write failing tests that valid key returns update info from injected updater.
- [ ] Wire routes and dependency injection.
- [ ] Run `npm run test:run -- src/__tests__/dashboardServer.spec.ts`.

## Task 3: Safe Install, Restart, Rollback

**Files:**
- Modify: `src/server/updater.mjs`
- Modify: `server.mjs`
- Test: `src/__tests__/dashboardUpdate.spec.ts`

- [ ] Write failing tests that install validates extracted package contains `dashboard_sub2api/server.mjs` and `dashboard_sub2api/dist/index.html`.
- [ ] Write failing tests that install backs up current files and preserves environment files outside install dir.
- [ ] Write failing tests that restart uses configured command only when enabled.
- [ ] Implement download/extract/install/restart/rollback with injected command runner.
- [ ] Run update and server tests.

## Task 4: Frontend Update Panel

**Files:**
- Create: `src/api/system.ts`
- Create: `src/components/UpdatePanel.vue`
- Modify: `src/App.vue`
- Modify: `src/style.css`
- Test: component/API tests

- [ ] Write failing tests for check/update UI states and no token leakage to existing `/dashboard-api/*`.
- [ ] Implement API client and panel.
- [ ] Add toolbar button/panel.
- [ ] Run frontend tests.

## Task 5: Release Packaging And Docs

**Files:**
- Modify: `.github/workflows/build-release.yml`
- Modify: `.env.example`
- Modify: `deploy/dashboard-sub2api.service`
- Modify: `README.md`

- [ ] Add `VERSION` generation to GitHub Actions package.
- [ ] Add `DASHBOARD_UPDATE_ENABLED`, `DASHBOARD_UPDATE_KEY`, `DASHBOARD_INSTALL_DIR`, `DASHBOARD_SERVICE_NAME`, and restart command docs.
- [ ] Document sudoers/systemd permission model.
- [ ] Run `npm run test:run`, `npm run typecheck`, and `npm run build`.
