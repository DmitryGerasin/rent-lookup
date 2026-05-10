# Express Routers Reference

Reference for AI agents and developers. Use this when adding or refactoring route handlers so they stay consistent with how this app wires Express, auth, and responses.

**Mount point:** `routes/index.js` attaches these routers to the main app. That file is the source of truth for which paths sit behind `auth.ensureAuthenticated` and `rbac([...])`.

---

## Security first

**Security is always the primary concern** when adding or changing routes: authentication, authorization (`rbac`), CSRF on mutating methods, safe redirects, and never trusting raw client input for SQL, redirects, or logging without validation.

For **user-supplied identifiers and strings**, use **`security/validator.js`** (not re-exported from `security/index.js`—import that file directly). It provides dossier **`validateFileId`**, **`validatePositiveInteger`** / **`validateNonNegativeInteger`** / **`validateUnsignedInt32`** / **`validateUnsignedInt32Pk`** (MySQL **`INT UNSIGNED`** per **`config/mysql/SDN.sql`**), and named PK helpers (**`validatePersonId`**, **`validateLawyerId`**, **`validateCoupleId`**, **`validateChildId`**, **`validateUserId`**, **`validateEmployeeId`**, **`validateFileNoteId`**, **`validateTrustTransactionId`**, **`validateTimeActivityId`**, **`validateInvoiceId`**, **`validateCommissionnerOfOathsId`**, **`validateInvitationId`**, **`validateMigrationId`**, **`validateOauthTokenId`**), **`validateChecked`** (checkbox tri-state: checked / unchecked / indeterminate, optional strict boolean-only mode), plus **`fileIdPattern`** / QBO helpers. Route handlers should validate or normalize input **before** calling models or building URLs; domain-specific parsers (e.g. trust monthly report period) may live in **`services/`** next to the feature.

---

## What a router file should do

A route module should be **thin**: parse the request, call the right **model** or **service**, then send JSON, redirect, or `render()` with what came back.

### Naming

- **Avoid single-letter variables** except where conventional (Express **`req`**, **`res`**, **`next`**).
- **Avoid cryptic abbreviations** in new code

**Good pattern (preferred):**

- Declare `router.get` / `router.post` / … with a small handler that delegates to `models/` or `services/` and returns the response.
- Examples that match this style well: `routes/dragon.js`, `routes/corp.js`, `routes/couple.js`, `routes/lawyer.js`.

### Do not pass `req` or `res` outside the router layer

- **Never** pass `req` or `res` into `models/`, `services/`, or other non-router modules. Route handlers should extract what they need (IDs, body fields, `req.user`, etc.) and pass **plain data** onward.
- **Never** export or thread `req`/`res` from a router file into helpers that live outside routing, except for the narrow case below.
- **`errHandling(req, res, …)`** in `routes/errorHandling.js` is the intentional exception: it runs at the **route** boundary and needs `req`/`res` only to log and send the error response. Do not use that pattern for business logic elsewhere.

Prefer returning values from models/services (e.g. `{ success, data, error }`) and letting the route handler call `res.json(…)` / `res.render(…)` once.

### `try` / `throw` / `catch` with `errHandling`

Keep the **main handler body inside `try { … }`**. Validate inputs and **`throw`** structured errors (e.g. `{ type: 'CUSTOM', name, message }`) instead of **`return errHandling(...)`** on the success path. Use a **single `catch`** that calls **`errHandling(req, res, err, __filename, 'handlerName', responseFormat?)`** once. See **`routes/admin.js`** for JSON and HTML examples.

---

## `routes/errorHandling.js` (server-side)

Import `errHandling` from `routes/errorHandling.js` and use in `try` / `catch` handlers to log failures and return a consistent response.

**Signature:** `errHandling(req, res, err, __filename, functionName, responseFormat)`

- **`responseFormat`** — `'JSON'` (default) or `'HTML'`.
- **`err.type === 'CUSTOM'`** — Treated as **safe to expose** to the user: `name` / `message` (and optional `code` for HTML) are intentional.
- **Any other error** — Logged server-side; the client gets a **generic** French message (JSON) or a generic error page (HTML), not internal details.
- All errors are safe to pass to `errHandling`, it decides internally whether to show it or present generic error message.

Handlers may also return validation errors **directly** with `res.json({ ok: false, error: … })` without calling `errHandling`; use `errHandling` for unexpected exceptions in `catch` blocks.

### Global Express error middleware (`middleware/globalErrorHandler.js`)

`app.js` mounts `middleware/globalErrorHandler.js` **after** `routes/index.js`. It handles errors emitted by middleware via `next(err)` before a route handler is reached (for example invalid CSRF token errors from `csrf-csrf`).

This is **not** a replacement for `routes/errorHandling.js`: route handlers should still use `try` / `catch` with `errHandling(req, res, err, __filename, handlerName, responseFormat?)`. Keep feature-specific error classification near its feature module when possible; for CSRF, the global middleware delegates to `security/csrf.js`.

---

## JSON responses (`res.json` / `res.send`) for API-style routes

Front-end helpers in `private/js/components/rest.js` expect **JSON** with at least:

| **Field**   | **Type**               | **Role**                                                                                                                                 |
|-------------|------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `ok`        | `boolean`              | `true` on success, `false` on failure. `GET`/`POST`/`PATCH`/`DELETE` in `rest.js` throw if `!res.ok` (they pass `res.error` to caller).  |
| `data`      | `any`                  | Optional payload on success (e.g., list, object). Returned as `res.data` by `rest.js` to the caller when `ok` is `true`.                 |
| `error`     | `object` (or similar)  | On failure, the error payload. Thrown by `rest.js` as `throw res.error` so `catch` receives this object.                                 |

On **success**, put the payload in **`data`** (including lists, success messages, and nested objects). Avoid top-level keys such as `invitations` or `message` unless they are legacy; `rest.js` returns **`res.data`** to callers on success.

**Optional fields** used by the same clients: `redirect` (navigation after success), `download` / `docName` (file download). See `rest.js`.

---

## Error object shape (server → `rest.js` → `errorHandling.js`)

- **Internal / unexpected:** Any error object without `type: 'CUSTOM'` and without `custom: true` should **not** rely on `message` being shown to users. `routes/errorHandling.js` maps those to a generic message; `private/js/components/errorHandling.js` **`displayErrors`** shows a generic French line unless the item is marked safe.

- **End-user-facing (safe to show):** Use either:
  - **`{ name: string, message: string, type: 'CUSTOM' }`**, or  
  - **`{ name, message, custom: true }`** (same effect as `type: 'CUSTOM'` for the front end).

Then **`displayErrors(err, $container?)`** (one error or an array) will show **`message`** to the user when the item is `CUSTOM` / `custom`. Do not hand-parse errors in the bundle; pass the thrown value through as documented in `private/js/frontend-js-reference.md`.

Validation responses that return an **array** of errors (e.g. registration) pass that array as-is; each item should follow the same `CUSTOM` / `custom` rule where the text should appear in the UI.

---

## Auth layers (how to read `routes/index.js`)

1. **`auth.ensureAuthenticated`** — User must have a valid session (`req.isAuthenticated()`), except when development bypass env flags apply (see `security/auth.js` and `config`).
2. **`rbac(['admin'])`** — User’s `category` must be in the allowed list (`security/accessControl.js`). Used on top of `ensureAuthenticated` for admin-only areas.
3. **Per-route auth** — Some routers are mounted **without** `ensureAuthenticated` on the parent; individual routes then add `auth.ensureAuthenticated`, `rbac`, `auth.ensureNotAuthenticated`, or nothing, as needed.

---

## Routes not using `ensureAuthenticated`

These are reachable **without** a logged-in session (subject to other middleware such as captcha, `ensureNotAuthenticated`, or feature flags).

| Method & Path              | Notes                                                                 |
|----------------------------|-----------------------------------------------------------------------|
| `GET /`                    | Redirects to `/users/login`.                                          |
| `GET /users/login`         | Login page; `auth.ensureNotAuthenticated` (must be logged **out**).   |
| `POST /users/login`        | JSON login; `ensureNotAuthenticated` + captcha.                       |
| `GET /users/register`      | Registration page when `REGISTRATION_ENABLED` is true; no session required. |
| `POST /users/register`     | Registration submit when registration is enabled; captcha; no session required. |

**Invitation API:** All `/api/invites` routes use `ensureAuthenticated` and `rbac(['admin'])` in `routes/api/invites.js` (mounted from `routes/api/index.js`). Token checks for registration use `Invitation.validate` in `routes/users.js` (no separate public JSON endpoint).

**OAuth (`/oauth/...`):** Mounted **with** `ensureAuthenticated` in `routes/index.js`. The provider callback is still part of an authenticated “connect account” flow (session must exist when the user returns from the provider).

---

## Development-only behavior

When `NODE_ENV !== 'production'` and `USE_PRETEND_USER` is `true`, `routes/index.js` may set `req.user` from `PRETEND_USER` before other handlers. That is not a public bypass in production; keep production envs strict.

**`/dev` (`routes/dev/index.js`):** Mounted in `routes/index.js` with `auth.ensureAuthenticated`. Handlers run only when `DEVELOPMENT` is true or `config.I_AM` matches the SDN firm (`utils/userSpecificContent.js`); otherwise the router responds with 404. **`GET /dev`** renders **`views/dev/index.ejs`** (hub listing admin-only dev links). **`GET /dev/stats`** is **`rbac(['admin'])`**. **`GET /dev/forgotten-files`** renders **`views/dev/forgottenFiles/index.ejs`** (table partial **`forgottenFiles/table.ejs`**); rows come from **`db/queries/dev.js`** (`searchForgottenFiles`); dates are formatted with **Luxon** in the route (`yyyy-MM-dd`). The forgotten-files page includes a client-side lawyer filter (`private/js/dev.js`). No dedicated model—mapping stays in the route handler. **`GET /dev/kronos`** (`rbac(['admin'])`) renders **`views/dev/kronos/index.ejs`**; **`GET /dev/kronos/data`** returns **`{ ok: true, data }`** from **`DevTools.computeKronos`** / **`lib/kronos`** (query **`start`**, **`amount`**, **`units`**) for **`private/js/kronos`** via **`rest.js`** **`GET`**.

---

## Flash messages (server-rendered alerts)

Use flash for one-time messages that must survive a redirect (e.g. create account, auth guards, successful mutations followed by `res.redirect(...)`).

- Set in a route before redirect: `req.flash('success', '...')`
- The next request consumes it with `req.flash('success')` (returns an array and removes consumed values)
- `app.js` maps flash buckets to `res.locals.alert_*`
- `views/partials/messages.ejs` renders those buckets into grouped containers inside `#messagesContainer` (`#dangerContainer` for danger + legacy `error` flash, then `#primaryContainer` … `#darkContainer` per Bootstrap alert class)

Recommended buckets: `primary`, `secondary`, `success`, `warning`, `danger`, `info`, `light`, `dark`.

For API JSON responses on the same page (no redirect), use front-end rendering helpers instead of flash:
- `private/js/components/errorHandling.js` (`displayErrors`)
- `private/js/components/displayMessages.js` (`displayMessages`)

See also:
- `views/ejs-reference.md` ("Partials", "Messages containers")
- `private/js/frontend-js-reference.md` ("Messages (`components/displayMessages.js`)")
- `private/scss/scss-reference.md` ("Messages and alert containers")

---

## HTTP access logging (`security/logRequest.js`)

Production (and optional dev) request logs are written to the logs DB (`db/queries/sdnLogs.js` → `_Request`) and echoed in part to stdout. **Never log secrets** (passwords, invitation tokens, OAuth codes, API keys, captcha responses).

- **Query string:** sensitive param names are listed in **`QUERY_KEYS_NEVER_LOG`** in `security/logRequest.js`. Values are replaced with `[REDACTED]` in stored `query` JSON and the logged URL (`originalUrl` / console line) so e.g. `?t=` invite links are not persisted in full.
- **Body:** sensitive keys are listed in **`BODY_KEYS_NEVER_LOG`** in `security/logRequest.js`; those keys are omitted from stored `body` JSON and stdout.

**When you add a new secret** in `req.query` or `req.body`, add its key to the appropriate `Set` in `security/logRequest.js` and extend this bullet list so future refactors stay consistent.

`sql.save` is intentionally **not awaited** so responses are not delayed; failures are **`.catch`’d** so a logging outage does not become an unhandled rejection.

---

## Related docs

- **Input validation (file IDs, integer PKs):** `security/validator.js`
- **EJS pages:** `views/ejs-reference.md`
- **Front-end JS (`rest.js`, `displayErrors`):** `private/js/frontend-js-reference.md`
- **SCSS:** `private/scss/scss-reference.md`
