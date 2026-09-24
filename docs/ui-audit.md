# LSMS interface audit

## Findings

- The original shell used one horizontal strip of role links on phones. Eleven Super Admin destinations competed for the same width, with no active location or group hierarchy.
- Status labels were assembled independently in each table. Raw enum formatting, colors, and importance varied by screen.
- Eight consequential actions used native browser confirmation prompts. Their wording omitted the effect of the action and their appearance was inconsistent across browsers.
- Tables used small controls and dense text without a shared scroll affordance. Account, custody, inventory, and report screens need deliberate narrow-screen handling.
- Loading and empty states were inconsistent. API failures sometimes appeared as generic form errors without a retry path.
- Dashboard count cards had equal visual weight regardless of urgency. The page did not show a clear next action.
- Auth screens and administrative forms used related but independently styled controls. Focus indication depended on individual class strings.
- The request detail screen placed review, allocation, release, and ISO actions together. Controls are technically state-gated, but the page still needs clearer workflow stages.
- Recharts is confined to the analytics component; it should be loaded only on analytics routes. Client components are appropriate for data interaction, while static page wrappers and the application shell can remain server rendered.

## Design direction

Use green for identity and primary actions, neutral surfaces for information, and explicit warning and danger treatments. Group role navigation in a sidebar with a mobile drawer. Provide one status vocabulary, one confirmation interaction, and specific feedback for saves and errors. Keep tables within their own scrolling region and preserve pagination and server search.

## Verification plan

Check important routes at 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 CSS pixels; check keyboard navigation, dialogs, form labels, page overflow, and production build. Inspect bundle output and run the existing API route smoke test.

## Implementation report

### Design system and layout

- Green primary actions (`#166534`) on neutral surfaces, shared spacing, borders, radii, typography, focus indicators, and reduced-motion support.
- Shared `StatusBadge`, `FormField`, button classes, `Pagination`, `ErrorNotice`, confirmation/toast provider, and connection-status banner.
- Role-aware sidebar groups, active navigation, account controls, contextual header, skip link, constrained content widths, and a Radix mobile drawer.
- Dashboards prioritize actionable records. Request links open the corresponding status filter. Inventory-health links open the existing asset-management screen; the API does not currently expose an operational-status filter.

### Interactions

- Organization, category, catalog, and asset editors use expandable forms. Selecting Edit opens the editor and moves focus to it.
- Review, allocation, release, and returns show the controls relevant to the current stage. Approval quantities are checked before confirmation; release requires all inspected conditions.
- Return forms display equipment, borrower, request, release date, due date, and release condition. Damaged returns select the required damaged outcome, and non-normal returns require remarks.
- Eight native confirmation flows were replaced. Approvals, rejections, releases, and request submissions also receive explicit confirmation where appropriate.
- Dialogs describe the effect, initially focus the safe action, trap focus, close with Escape, and restore the invoking control's focus. Successful writes show a toast; mutation controls disable while saving.
- Notifications distinguish unread records and link to the associated request. Reading notifications refreshes the indicator without polling.
- If saving a new draft succeeds but submission fails, retry updates that saved draft instead of creating a duplicate.

### Errors and accessibility

- Network failures explain how to recover; list retry preserves local input. Offline status is visible. Error boundaries, missing-page and restricted-access pages provide useful navigation.
- Form errors connect to fields using `aria-invalid` and `aria-describedby`. Duplicate Admin email and institutional ID errors identify their fields.
- Pending, suspended, and archived accounts no longer all receive the same activation message.
- Table regions are keyboard scrollable, headers use column scope, status labels are readable without color, and controls use 44px targets where practical.
- Dense records scroll inside the table; phones get a visible scroll hint. Pagination and action groups wrap. Print views omit navigation.

### Performance

- Analytics previously mounted eight independently fetched sections. It now requests only the selected report, retaining server pagination.
- Recharts is in a dynamically imported chart component and renders only for chart reports. Other routes do not import it.
- Request-form catalog search is debounced by 300ms, with cancellation for obsolete requests.
- Static wrappers remain server components. Mutations and private lists retain uncached API requests; no sensitive global data cache was introduced.
- Report tables hide internal identifiers and display dates, booleans, and statuses in readable form. CSV export retains the existing data contract.

### Screens covered

Login, registration, first setup, account status, password change; all three dashboards; colleges, courses, departments, Admin creation, users; categories, catalog, assets, QR lookup, equipment browsing; request lists, creation/editing, review, allocation, release, request history; custody, returns, overdue, accountability, ISO requisitions, analytics, reports, notifications, profile, and error pages.

### Reproducible verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run build:ui
$env:UI_BROWSER_CHANNEL = "msedge" # Or install Playwright Chromium and omit this.
npm run test:ui
```

The UI suite runs an isolated fixture API on port 4100 and a separate production frontend on 3100, using `.next-ui`. It does not access the database or use real account credentials. Fixtures are test-only and are not an authentication bypass in the application. The normal HTTP smoke test uses the configured API on 4000 and production frontend on 3001.

Responsive coverage includes 36 role route/state combinations and six public screens at all nine widths, plus the pending-account screen at 320px. Checks include expanded editors, body overflow, page exceptions, drawer keyboard interaction, confirmation cancellation/focus restoration, return validation, request filters, list retry, analytics request counts, offline status, and failed-submission recovery. Screenshots are saved under `test-results/ui/`.

Automated axe checks cover the 36 role route/state combinations, three auth forms, and the return confirmation dialog. Passing automated checks is not a full WCAG certification; manual assistive-technology and physical-device testing remain useful.

### Measured performance and remaining concerns

A local Lighthouse mobile simulation of the production login page reported performance **87/100**, accessibility **100/100**, FCP **0.8s**, LCP **3.0s**, TBT **320ms**, and CLS **0**. Other browser tests were running concurrently, so these are local diagnostic results, not a deployment benchmark. The JSON report was produced successfully; the Lighthouse CLI then reported a Windows temporary-profile cleanup permission error. INP requires representative interactions or field measurement and was not established by this run.

- The official institutional ISO form layout still needs to be supplied/configured. The existing generated document is explicitly labeled as a reference copy.
- Authenticated browser workflow checks use fixtures. These establish frontend behavior, not a full live-database approval-to-return acceptance test.
- Existing selection endpoints cap lookup responses at 100 records. Catalog search remains available in request creation; larger organization/inventory lookups would benefit from a dedicated searchable selection API.
- Production network latency, real devices, long institutional data, and screen-reader use should be checked during deployment acceptance.
