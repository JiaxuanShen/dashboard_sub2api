# sub2api Read-Only Dashboard Design

## Context

This repository will hold a separate dashboard for viewing selected `sub2api` admin data. GitHub is only for source control. The dashboard will be deployed on the same server as `sub2api`, not on GitHub Pages.

The upstream reference code is kept locally under `.upstream/sub2api` and is ignored by git.

## Goal

Build a read-only web dashboard focused on two admin areas:

- Subscription management visibility
- Account management visibility, especially total account usage

The UI should stay visually close to the existing `sub2api` admin style: compact table rows, light background, green status badges, small platform/type chips, usage progress bars, and right-aligned table actions.

## Non-Goals

The first version will not provide write operations:

- No edit
- No delete
- No revoke
- No quota reset
- No schedulable toggle
- No subscription assignment
- No account credential refresh

The dashboard is a browsing and monitoring surface. It may include safe actions such as refresh, search, filter, sort, pagination, and opening read-only detail panels.

## Deployment Model

The built frontend will be served from the same server as `sub2api`, for example:

```text
https://example.com/dashboard/
```

The server will expose a reverse-proxy path for dashboard API calls:

```text
/dashboard-api/* -> http://127.0.0.1:<sub2api-port>/api/admin/*
```

The admin token must stay on the server side. The browser should not receive or store the admin token. Nginx, Caddy, or another local proxy will inject the required admin authentication header.

## Data Sources

Use existing upstream admin endpoints through the proxy path.

Subscriptions:

- `GET /dashboard-api/subscriptions`
- Optional later: `GET /dashboard-api/subscriptions/{id}/progress`

Accounts:

- `GET /dashboard-api/accounts`
- `GET /dashboard-api/accounts/{id}/usage`
- `GET /dashboard-api/accounts/batch-today-stats` or the upstream equivalent if available in the deployed version

The implementation should keep endpoint access centralized in a small API client so future upstream path changes are easy to adjust.

## Subscription View

The subscription table should follow upstream `SubscriptionsView.vue` concepts:

- User identity: email or username, with avatar initial
- Group or plan badge
- Usage windows: daily, weekly, monthly where limits exist
- Expiration: date and remaining days
- Status: `active`, `expired`, `revoked`
- Read-only actions: view detail, copy related identifier, refresh row if useful

Subscription status should not be reused for account status.

## Account View

The account table should follow upstream `AccountsView.vue` concepts:

- Name and secondary identity such as email or account metadata
- Platform/type badges: `openai`, `anthropic`, `gemini`, `antigravity`; `oauth`, `apikey`, `setup-token`, etc.
- Capacity indicators: concurrency, window cost limit, sessions, RPM, daily/weekly/total quota where present
- Account status based on upstream semantics:
  - `status`: `active`, `inactive`, `error`
  - runtime limited states: rate-limited, overloaded, temporary unschedulable
  - `schedulable`: displayed as read-only on/off state
  - expiration and `auto_pause_on_expired`
- Today stats: requests, tokens, account cost, user/API-key billed cost
- Usage windows: 5h, 7d, Sonnet or provider-specific windows where upstream data provides them
- Read-only actions: view detail, copy identifier, refresh usage

Account status and subscription status should share table layout patterns, not state labels.

## UI Structure

The first screen should be the working dashboard, not a landing page.

Layout:

- Left navigation with `sub2api`-style admin sections
- Top toolbar with title, search, filters, and refresh
- Summary strip with key read-only counts
- Tabs or segmented controls for:
  - Subscriptions
  - Accounts
  - Usage records, optional in a later iteration
- Dense, horizontally scannable tables
- Read-only detail drawer or modal for row inspection

Avoid large decorative cards or marketing-style hero sections. The dashboard should feel like an operational admin surface.

## Error Handling

Show clear inline states for:

- Proxy/API unavailable
- Unauthorized or token rejected by server-side proxy
- Empty result sets
- Partial failures when account usage windows fail but the account list loads
- Slow loading or refresh in progress

Do not expose the admin token in UI errors.

## Security

The frontend must not contain an admin token at build time or runtime.

The deployment README should explain:

- How to configure the reverse proxy
- Where to place the admin token on the server
- Why GitHub Pages and frontend environment variables are not suitable for this token

## Testing And Verification

The implementation should include:

- Type checks or build verification
- API client tests for mapping upstream response shapes into view models
- Component tests for status mapping, especially account state precedence
- Manual preview check in browser for desktop width and narrower screens

Status precedence should be tested for accounts:

1. Overloaded
2. Rate-limited
3. Temporary unschedulable
4. Error
5. Unschedulable
6. Inactive
7. Active

This order reflects the need to surface runtime blockers before ordinary base status in a monitoring dashboard.
