# UX Contract
## Product context
Kazakhstan patients and clinics; RU/KZ; Asia/Almaty; Gregorian; ₸. WCAG 2.2 AA target, browser/native-language audit outstanding.
## Business-context sources
| Domain | Authoritative source | Type |
|---|---|---|
| Permission model | PRODUCT.md Identity and authorization | User brief/domain contract |
| Data lifecycle | PRODUCT.md Booking lifecycle | User brief/domain contract |
| Privacy and legal | PRODUCT.md Legal, privacy and retention | User brief; legal review pending |
| Availability | PRODUCT.md Availability and concurrency | User brief/domain contract |
| Billing | PRODUCT.md | Out of scope |
## Visual contract
DESIGN.md mirrors canonical Frontend/styles.css. Single light theme. No CSS adapters.
## Canonical UI Map
| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | native select via ui.field | UX contract | native, platform geometry accepted | Browser pending |
| Date | native input date via ui.field | UX contract | native, OS locale accepted | Date/schema tests |
| Form | Frontend/js/ui.js field and formError | PRODUCT.md | create/edit | Validation tests |
| Scrollbar | Frontend/styles.css global baseline | DESIGN.md | table overflow | Static audit |
| Toast | Frontend/js/ui.js toast | UX contract | success/error/info | Static audit |
| CRUD | Frontend/js/api.js + Express routes | PRODUCT.md | patient/clinic/admin | API tests |
## Behavior
App-owned inline errors, aria-invalid/aria-describedby, first-error focus; noValidate on forms. Pessimistic mutations, busy buttons keep width. Native dialog for cancellation, native Escape/containment and restored focus. One toast live region, deduplicate same message. No native alert/confirm/prompt.
Catalog filters live in URL query, explicit submit, native date/select, clear all. Twelve results per page, dashboard 20, backend maximum 100. Loading skeletons, explicit empty/error/retry. Navigation updates title and heading focus; back preserves URL filters. Phone formats normalize +7. No personal data or sessions are stored in browser localStorage.
## Flow ledger
| Operation | Pending | Success | Failure | Source |
|---|---|---|---|---|
| Book | disabled submit; same idempotency key retained | visit details, pending label | preserve fields; conflict returns slot step | PRODUCT.md |
| Cancel | app dialog then disabled button | list + updated status | inline error and retry | PRODUCT.md |
| Reschedule request | disabled button | request badge; slot stays reserved | preserve visit | PRODUCT.md |
| Clinic change | disabled submit | saved workspace | inline error; no optimistic changes | PRODUCT.md |
| Search | skeleton | filtered list, count | retry; preserve URL | User brief |
## Async and session
API timeout 15s, no automatic mutation retry. Read render sequence prevents stale responses overwriting new route. Expired auth returns login; no PII in URLs. HttpOnly cookie sessions, refresh server-side. Real Supabase email/password identity only; server cookies and user JWT, no selectable roles. Logout clears session.
## Verification
npm run check; npm test; npm run build; strict premium audit. Real browser unavailable in current environment; desktop/mobile/keyboard/screenshots not claimed. Native RU/KZ copy review and real Supabase concurrency/RLS integration tests required before pilot. Canonical sibling flows: home/catalog clinic cards; patient/clinic appointment list.

## Responsive behavior
Shared responsive menu owner: Frontend/js/navigation.js. Non-modal disclosure, hidden when closed, native Tab links; Escape returns trigger focus; outside/link clicks and desktop resize close it. Per-render cleanup removes global listeners. Catalog filters are a non-modal inline disclosure before results, aria-controls/expanded and focus to the first control when opened.
Shared responsive table owner: ui.dataTable; mobile row cards retain labels, roles and every staff action. Calendar uses data-calendar-view variants; day is one column, week/month reflow at tablet/phone widths. Mobile booking shows clinic context above the workflow and complete summary after the form. Inputs are 16px to avoid iOS focus zoom; safe areas, dynamic viewport dialogs, fluid gutters, wrapped long text, and coarse-pointer targets are shared CSS behavior.
Menu tests use EventTarget stubs; they do not certify real DOM, viewport or screen-reader behavior.

## Authentication v0.2
Canonical auth UI: Frontend/js/auth.js. Generic invalid credentials; email and password confirmation; native-password-manager support; password visibility button; explicit confirmation action so email scanners do not consume a token. Server owns access/refresh cookies; recovery requires signed short-lived proof bound to user/session. Forms preserve email on failure and clear passwords. No token values are rendered or persisted in browser storage. Supabase provider/API is the authority; service tests use mocks and real-provider verification remains blocked.
