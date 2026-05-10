# Front-end JavaScript Reference

Reference for AI agents and developers. Use this when writing or refactoring client-side code to match project patterns.

---

## Build

- Bundles are built with **Browserify** via **Watchify** (`npm run dev-front` / `npm run watchJs-*`).
- Each page has a folder under `private/js/<name>/` (or a single entry file) that compiles to `public/js/<name>.bundle.js`.
- **CommonJS** only: `require()` / `module.exports`. No ES modules in browser bundles.

---

## Conventions

### Naming

- **Avoid single-letter variables** (`e`, `n`, `t`, `i`) — use **`event`**, **`count`**, **`traceStep`**, **`index`**, etc. Trivial numeric loops may still use **`index`** in **`forEach((item, index) => …)`** when the index is unused or only passed through; prefer a descriptive name when the index matters.
- **Avoid cryptic abbreviations** unless the full name is unwieldy — e.g. **`requestPayload`**, **`submitButton`**, not **`req` / `btn`** in new client code. (Express **`req` / `res`** on the server remain conventional.)

### jQuery

- **jQuery is global** (loaded before the bundle). Use `$` and `$(...)` everywhere.
- **Going forward:** name variables that hold jQuery objects with a **`$` prefix** (e.g. `const $email = $('#email')`). Existing code may still use names like `emailInput`; new code should follow the `$` prefix rule.

### DOM updates & event binding

- Prefer **full page reload** (or navigation) after a mutating API when the response would change server-backed content on screen; **avoid** dynamically building or patching large parts of the page unless there is a clear reason.
- Scripts use **`defer`**, so markup exists when the bundle runs: bind with **`$(selector).on(event, handler)`**. Use delegated **`$(document).on(event, selector, handler)`** sparingly, if there exists content **added after** load that cannot be bound directly, but best bind to it directly on element creation.
- Pass **named handler functions** into `.on()` (define them beside the registration or elsewhere in the module), not anonymous functions written inline inside `.on(...)`.

### Styling

- Prefer **template literals** with **backticks** for strings that contain interpolation or multi-line HTML.
- Event namespaces are used in places (e.g. `change.monitorInputs` in `monitorInputs.js`) so listeners can be managed precisely.

---

## Bundle layout (small vs large)

### Small bundle (example: `login`)

- **Single file** `private/js/login/index.js` as the only entry.
- Imports only what the page needs (`rest`, `errorHandling`, etc.).
- No `monitorAll` / unsaved navigation when there is no editable “document” state.

### Large bundle (example: `person`, `admin`)

- **`index.js` entry** that `require()`s feature modules and shared components.
- **`admin`:** `index.js` pulls in `users.js`, `employees.js`, `lawyers.js`, `commissionnerOfOaths.js`, plus shared init (`initializeBootstrapTooltips`, `mainNavBar`). Split by feature keeps files navigable.
- **`person`:** one large `index.js` with sections for corp vs person, save, representative search, etc. (not ideal because too long, prefer admin page style)
- **Pattern:** `require('../components/...')` at the top; constants for DOM nodes and IDs; async handlers with `try/catch` and `errHandling` or `displayErrors`.

---

## Unsaved changes: `monitorInputs` + navigation prompts

### `monitorAll` / `monitorChanges` (`components/monitorInputs.js`)

- Use when the page has **tracked inputs** (text, `select`, checkboxes including indeterminate via `boxVal`, multiple-select plugin, Quill).
- **`monitorAll(trackChangesIn, saveDefaultsTo, list, { navPrompt })`** registers listeners. Each item is `[jQueryField, defaultValue, type]` where `type` is `'text'` | `'checkbox'` | `'multipleSelect'` | `'quill'` (default `'text'`).
- Changed fields get the **`altered`** class (see SCSS reference); `trackChangesIn` holds current deltas keyed by `name` or `id`.

### Checkbox initialization from EJS (`components/checkboxes.js`)

- Use when a checkbox can start in **tri-state** (`true` / `false` / `null`).
- EJS should render a `data-initial-value` attribute (`"true"`, `"false"`, or `"null"`) on each checkbox.
- Call **`initializeCheckboxes()`** near the top of the page module (before reading defaults like `currentFieldValues`).
- The helper:
  - selects `input[type="checkbox"][data-initial-value]`
  - validates value is one of `true|false|null`
  - applies state with **`boxVal($checkbox, parsedValue)`**
  - sets `data-initialized="true"`
- Optional parameter: **`initializeCheckboxes(force = false)`**
  - `false` (default): skips already initialized checkboxes (`data-initialized="true"`)
  - `true`: re-applies initialization even if already initialized
- **`updateCheckboxValidation`** — optional HTML5 constraint validation for checkboxes with allowed states (from `components/checkboxes.js`).

### Programmatic value changes

- Monitoring listens on **`change`** (and Quill’s `text-change`). If you set values in code (`.val(...)`, `boxVal(...)`, etc.), the **`change` handler does not run** unless you fire it.
- **Always call `.trigger('change')`** on the field (or chain it) after programmatic updates so `altered` state and **`updateNavPrompt`** stay correct.
- **Modal / re-init pattern:** some flows (e.g. admin user modal) **re-call `monitorAll`** after filling the form so defaults align with the new row — another valid approach when replacing the whole tracked set.

### `navigationPrompt` / `updateNavPrompt` (`components/navigationPrompts.js`)

- **`navigationPrompt(true)`** sets `beforeunload` (warn on leave/refresh); **`navigationPrompt(false)`** clears it.
- **`updateNavPrompt(trackChangesIn)`** turns the warning on if `trackChangesIn` has any keys, off if empty.
- Call **`navigationPrompt(false)`** right before a successful save/navigation you initiate; on save failure, **`updateNavPrompt(currentlyAlteredValues)`** (or equivalent) to re-arm the warning.

---

## Address flows: `addressAutocomplete` + EJS datalists

### `addressAutocomplete` (`components/addressAutocomplete.js`)

- **When:** forms have **city**, optional **district**, **province** (`<select>` with codes like `QC`), **country** (text).
- Pass **jQuery objects:** `{ city, district, province, country }` (`district` may be `null`).
- Wires **`change`** handlers: typing a known city can set district/province; province can default country to `Canada`. Uses **`districtCityMap`** data and normalized city matching.
- Because it uses **`.trigger('change')`**, it interacts correctly with **`monitorAll`** if those fields are monitored.

### Country / province in HTML

- Include **`views/partials/datalists.ejs`** on the page. Country text inputs should use **`list="countries"`** (or `countries-fr` / `countries-en` per language if it is available in the context). See **`views/ejs-reference.md`** (“Country Input”, “Partials → datalists”).
- Province fields are usually **`<select>`** with coded values; the datalist `provinces-list-long` is only for autocomplete text fields where needed.

---

## HTTP API (`components/rest.js`)

- **No full-page form posts** — Pages do not rely on `<form action="…" method="…">`. Collect values in JS, then call **`GET`**, **`POST`**, **`PATCH`**, or **`DELETE`** here. For “search” or “calculate” flows that only need query parameters, use **`GET`** with **`URLSearchParams`** in the URL and **`goToRedirect: false`** so **`rest.js`** returns **`res.data`** without navigation.
- **`GET`**, **`POST`**, **`PATCH`**, **`DELETE`** — `fetch` with `credentials: 'include'`, JSON body for mutating methods.
- Responses are expected as JSON with `{ ok, data?, error?, redirect?, download? }` shape; **`!res.ok` throws `res.error`**. On success, **`GET`/`POST`/etc. return `res.data`** (whatever the server put in `data`, including a plain array).
- **`goToRedirect`** (default `true`): follows `redirect` or triggers file **download** when the server returns those fields.

Server-side conventions (`res.json` shape, `CUSTOM` errors, `routes/errorHandling.js`) are documented in **`routes/router-reference.md`**.

---

## Errors (`components/errorHandling.js`)

- **`displayErrors(errorsOrOne, $container?)`** — pass **one** error or an **array** (API validation list). Do **not** parse or extract `.message` yourself; only `type === 'CUSTOM'` or `custom === true` shows `message` to users—other values contribute to a **generic** safe message. Alerts are rendered via **`displayMessages`** (text-safe).
  - **Second argument omitted** — errors go to the shared **`#dangerContainer`** inside **`#messagesContainer`** (page must `include` `views/partials/messages.ejs`).
  - **`$container` provided** — append into that jQuery node instead (e.g. `#invitationError` in the admin modal).
- **`clearErrorMessages($container?)`** — if you pass a jQuery node, it is emptied; if omitted, clears the shared danger bucket via **`clearMessages('danger')`**.

---

## Messages (`components/displayMessages.js`)

- **`displayMessages(messagesOrOne, $container?)`** — appends dismissible Bootstrap alerts for one message object or an array. Omit **`$container`** to route by `type` into `#messagesContainer` buckets; pass **`$container`** to append every alert into that element (same pattern as `displayErrors` for modals).
- **`clearMessages(type?)`** — empties one bucket (`#${type}Container`; `error` is accepted as a legacy alias of `danger`) or all buckets under `#messagesContainer` when `type` is omitted.
- Message object shape: `{ type?: 'primary'|'secondary'|'success'|'warning'|'danger'|'info'|'light'|'dark', message: string }`
- Unknown/missing `type` falls back to `info`.
- Typical buckets used with EJS-rendered containers: `#dangerContainer`, `#primaryContainer` … `#darkContainer` as in `views/partials/messages.ejs`.

For redirect-bound one-time notices, use flash on the server and render through EJS:
- `routes/router-reference.md` ("Flash messages (server-rendered alerts)")
- `views/ejs-reference.md` ("Messages containers")

---

## API actions triggered by a button

Use **`components/buttonLoadingState.js`**: `setButtonLoadingState($button, pendingText)` before the request (stores prior HTML on the element), then **`try` / `catch`**.  
On **failure**, call **`restoreButtonFromLoadingState($button)`** in the **catch** (and show errors).  
On **success**, if the flow **reloads or navigates away**, do not restore in `try`—the page unloads. 
In almost every case putting the restore inside **`finally`** will be **wrong**. To use it inside a finally block there must be a specific reason why the user should be allowed to press the API request button again before the page unloads.

```js
   const {
      displayErrors,
      clearErrorMessages,
   }                    = require('../components/errorHandling')
   const {
      setButtonLoadingState,
      restoreButtonFromLoadingState,
   }                    = require('../components/buttonLoadingState')

   setButtonLoadingState($submitButton, 'Connexion en cours...')

   try {
      await POST('/users/login', payload)
   } catch (err) {
      clearErrorMessages()
      displayErrors(err)
      restoreButtonFromLoadingState($submitButton)
   }
```

Adjust the `require` path to the importing file.
---

## Search & lists (`components/searchBar.js`)

- **`displayPersons`**, **`displayCouples`** — render API search results into a container and wire “Add” buttons. Couples layout is tied to **family** UI.
- **`displayPersons`** optionally skips rows already linked to the current file (`skipMattchingFileId`); expects **`#file-id`** data when used on file pages.
- Typo in API: option is `skipMattchingFileId` (preserve for compatibility).

---

## Rich text & Quill

- **`quillEditor.js`** — **`QuillEditor`** class (container id, Quill options). Used with rich text fields.
- **`quillUtil.js`** — **`isDeltaEqual`** for comparing Quill Deltas (used by `monitorInputs` for `quill` type).
- **`monitorInputs`** supports type **`quill`**; track **`altered`** on the editor surface via Quill events.

---

## Miscellaneous components

| Module                           | Use when                                                                                                                                                         |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **`buttonLoadingState.js`**      | **`setButtonLoadingState`**, **`restoreButtonFromLoadingState`** — disable + spinner for API-triggered buttons (see “API actions triggered by a button”).        |
| **`normalizeText.js`**           | Normalizing strings for search/compare (diacritics, case, hyphens). Has **Jest** tests in `components/tests/`.                                                   |
| **`linkDobAndDobUnknown.js`**    | Pair **date** + **“unknown DOB”** checkbox so HTML5 `required` behaves correctly.                                                                              |
| **`currency.js`**                | **`formatAsCurrency`** and auto-init on **`.currency`** elements (number formatting + `enMoney` / `negMoney` classes).                                         |
| **`copyable.js`**                | **Side-effect only** — click **`.copyable`** copies **`data-to-copy`**. Usually imported just to bind behavior.                                                |
| **`returnTo.js`**                | **`returnTo()`** — current path + query + hash, URL-encoded for `?returnTo=` links.                                                                           |
| **`currentSearchParams.js`**     | **`params`** — read-only **Proxy** over `URLSearchParams` for `?query` access.                                                                                |
| **`mainNavBar.js`**              | **Logout** button + **`#dangerContainer`** for failed logout. Import on pages with main navbar.                                                              |
| **`displayMessages.js`**         | Generic dismissible alerts by `type` (`success`, `info`, etc.) for one or many messages.                                                                      |
| **`enableMultipleSelect.js`**    | On DOM ready, initializes **`.multiple-select`** (jquery plugin); import once if the page uses multi-selects.                                                 |
| **`table-sorter.js`**            | **Legacy/global:** sorts tables when **`th.sortable`** is clicked; handles numeric, **`.currency`**, and `8h57`-style times.                                 |
| **`table-filter.js`**            | **Page-specific / legacy:** hard-coded **`#myInput`** / **`#myTable`** filter—treat as a pattern to copy, not a generic import.                              |

---

## Tests

- **`components/tests/checkboxes.test.js`** — `boxVal` and `initializeCheckboxes` (Jest + `jest-environment-jsdom`).
- **`components/tests/normalizeText.test.js`** — example of unit testing shared helpers with **Jest**.

---

## File index (components)

| File                    | Role                                             |
|-------------------------|--------------------------------------------------|
| `buttonLoadingState.js` | Button disabled + spinner / restore              |
| `addressAutocomplete.js`| City → district/province/country chaining        |
| `copyable.js`           | Clipboard + “copié” UI                           |
| `currency.js`           | Money display formatting                         |
| `currentSearchParams.js`| Query string helper                              |
| `enableMultipleSelect.js`| multiple-select plugin init                     |
| `errorHandling.js`      | Alerts + inline error lists                      |
| `displayMessages.js`    | Dismissible typed messages (single or array)     |
| `linkDobAndDobUnknown.js`| DOB + unknown checkbox validation pairing       |
| `mainNavBar.js`         | Logout                                           |
| `checkboxes.js`         | `boxVal`, `initializeCheckboxes`, `updateCheckboxValidation` |
| `monitorInputs.js`      | Unsaved tracking across text, checkbox, multiple-select, and Quill |
| `navigationPrompts.js`  | `beforeunload` guard                             |
| `normalizeText.js`      | String normalization                             |
| `quillEditor.js`        | Quill wrapper class                              |
| `quillUtil.js`          | Delta equality                                   |
| `rest.js`               | GET/POST/PATCH/DELETE                            |
| `returnTo.js`           | returnTo URL helper                              |
| `searchBar.js`          | Person/couple search result rendering            |
| `table-filter.js`       | Legacy demo filter                               |
| `table-sorter.js`       | Sortable table headers                           |

---

## Related docs

- **Markup & datalists:** `views/ejs-reference.md`
- **SCSS:** `private/scss/scss-reference.md`
- **Express routers & JSON API contract:** `routes/router-reference.md`
