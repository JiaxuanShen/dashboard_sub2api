# Rich Readonly Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the readonly dashboard row density so subscription and account tables show the same operational information visible in upstream sub2api admin views, while removing operation columns.

**Architecture:** Keep the existing Vue 3/Vite app and `/dashboard-api/*` proxy. Extend display-only types, formatter helpers, and table components; do not add mutating API calls. Use existing `AccountUsageInfo` fetches and account fields already returned by the list endpoint.

**Tech Stack:** Vue 3, TypeScript, Vitest, @vue/test-utils, existing CSS.

---

## File Structure

- Modify `src/types/sub2api.ts`: add optional fields used by richer account and usage rendering.
- Modify `src/utils/format.ts`: add relative duration and compact stat formatting helpers.
- Modify `src/components/SubscriptionTable.vue`: render weekly/monthly/daily usage, reset countdowns, expiry date plus remaining days, no operation column.
- Modify `src/components/AccountTable.vue`: render account identity details, capacity metrics, quota bars, today stats, usage windows, no operation column.
- Modify `src/style.css`: adjust grid columns and compact metric styles.
- Modify `src/__tests__/formatUsage.spec.ts`: cover new formatting helpers.
- Modify `src/__tests__/tables.spec.ts`: cover richer subscription/account rows and absence of operations.

## Task 1: Formatting Helpers

**Files:**
- Modify: `src/utils/format.ts`
- Test: `src/__tests__/formatUsage.spec.ts`

- [ ] Write tests for `formatDurationUntil`, `formatDaysUntil`, and `formatCompactCount`.
- [ ] Run `npm run test:run -- src/__tests__/formatUsage.spec.ts` and confirm the new tests fail.
- [ ] Implement helpers.
- [ ] Run the same test and confirm it passes.

## Task 2: Rich Subscription Rows

**Files:**
- Modify: `src/components/SubscriptionTable.vue`
- Modify: `src/style.css`
- Test: `src/__tests__/tables.spec.ts`

- [ ] Write tests that expect weekly/monthly usage, reset countdown text, expiry remaining days, and no operation column.
- [ ] Run `npm run test:run -- src/__tests__/tables.spec.ts` and confirm the new tests fail.
- [ ] Update `SubscriptionTable.vue` and table grid CSS.
- [ ] Run the same test and confirm it passes.

## Task 3: Rich Account Rows

**Files:**
- Modify: `src/types/sub2api.ts`
- Modify: `src/components/AccountTable.vue`
- Modify: `src/style.css`
- Test: `src/__tests__/tables.spec.ts`

- [ ] Write tests that expect notes/email details, capacity metrics, quota bars, today stats, usage windows, and no operation column.
- [ ] Run `npm run test:run -- src/__tests__/tables.spec.ts` and confirm the new tests fail.
- [ ] Extend account types and render compact readonly metrics.
- [ ] Run table tests and confirm they pass.

## Task 4: Final Verification

- [ ] Run `npm run test:run`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Review `git diff` for token leaks or operation labels.
- [ ] Commit with `feat: enrich readonly dashboard tables`.
