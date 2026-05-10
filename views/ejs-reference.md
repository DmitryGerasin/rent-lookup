# EJS Pages Reference

Reference for AI agents and developers. Use this when creating or refactoring EJS pages to match project conventions.

**Note:** Registration page (`views/users/register.ejs`) still deviates from these conventions and is a candidate for refactoring.

---

## Router & Layout

- **`useLayout: false`** — Pass from route to give full control to the EJS page. The page renders its own full HTML document (no layout wrapper). Used for: `/file/:fileId`, `/person/:personId`, `/dashboard`, `/users/login`, `/users/register`, etc.
- When `useLayout: false`, the EJS receives `body` as raw HTML and must define its own `<!DOCTYPE html>`, `<head>`, `<body>`, scripts, and styles.

---

## General Rules

### Scope
- **Every page must have a tight scope** — Only include what that page needs.

### Naming (server-side script in EJS and routes)
- **Avoid single-letter variables** (`x`, `i`, `e`) — use **`index`**, **`entry`**, **`context`**, etc.
- **Avoid cryptic abbreviations** unless the full name is unwieldy — prefer **`submitButton`** over **`btn`**, **`forgottenFiles`** over **`ff`**. Established short names for domain concepts (e.g. **`fileId`**) are fine.

### No Inline Styles or Scripts
- **No inline styles** — Use classes only.
- **No `<style>` tags** — All CSS in external files.
- **No `<script>` tags with inline code** — Only `<script src="...">` for external scripts.
- Exception: Third-party scripts like `src="https://www.google.com/recaptcha/api.js"` (async, no defer).

### Scripts
- Scripts go in `<head>` with `defer` (async only when required, e.g. recaptcha API).
- **Standard imports per page:** exactly 2 scripts:
  1. `/js/vendors/jquery.min.js?cache=<%= process.env.CACHE_BUSTER %>`
  2. `/js/this-page.bundle.js?cache=<%= process.env.CACHE_BUSTER %>`
- Exceptions: recaptcha (`async`), Quill, Bootstrap bundle (sometimes in body for modals/dropdowns).
- Bootstrap: `<script src="/js/vendors/bootstrap.bundle.min.js?cache=<%= process.env.CACHE_BUSTER %>"></script>` — typically at end of `<body>` for modals/dropdowns.

### CSS
- **Single CSS import per page:**  
  `<link rel="stylesheet" href="/css/this-page.min.css?cache=<%= process.env.CACHE_BUSTER %>">`
- Vendor CSS from npm (e.g. Quill Snow, jQuery UI) is pulled in via one-line `@use` wrappers under `private/scss/vendors/` and compiled into the page `.min.css`.

### Table navigation — `td.fill-with-link`
- **Prefer real links** for in-app navigation (semantics, keyboard, middle-click, strict CSP). Do not use `onclick` + `window.open` for table rows when a URL exists.
- **`td.fill-with-link`** (see `private/scss/components/_link.scss` and `private/scss/scss-reference.md`) makes a child **`<a>`** cover the whole cell: put visible text (or spans) first, then an **empty** `<a href="…">` as the last child. The stylesheet positions that link absolutely so the entire cell is clickable. Ensure the page's scss has `@use './components/link';`

```html
<td class="fill-with-link">
   <%= row.label %>
   <a href="/file/<%= row.fileID %>"></a>
</td>
```

- Add other utility classes on the `<td>` as needed (`nowrap`, `text-nowrap`, etc.).

---

## Forms

### Form Submission
- **`<form>` must never have `action` or `method`** — There is no HTML form submission. Submission is always handled by front-end JS with **`private/js/components/rest.js`** (**`GET`**, **`POST`**, etc.)
- Use `id` on form for JS targeting, e.g. `id="registration-form"`.

### Floating Label Inputs
Standard pattern — input first, label second, `placeholder="."` (required for floating label when empty):

```html
<div class="col-md-4 form-floating">
   <input 
      id="firstName" 
      type="text" class="form-control" placeholder="."
      value="<%= typeof firstName !== `undefined` ? firstName : `` %>"
   >
   <label for="firstName">Prénom</label>
</div>
```

- `placeholder="."` — Enables floating label effect when input is empty (Bootstrap form-floating).
- For `<select>`, use `form-control` or `form-select`; label comes after.

### Checkboxes
Use `input-group` so checkbox + label fit with other form fields:

```html
<div class="col-md-4">
   <div class="input-group h-100">
      <div class="input-group-text">
         <input 
            id="isCanadian"
            class="form-check-input mt-0" 
            type="checkbox" value="" 
         >
      </div>
      <input disabled value="Est Canadien" name="label-for-isCanadian" type="text" class="form-control disabled-exception">
   </div>
</div>
```

- `.disabled-exception` — Placed on the **disabled input adjacent to a checkbox**. That input serves as a label for the checkbox (not editable). Without it, the input would look like a normal editable field; with it, the disabled styling is overridden so it appears as a non-editable label. See `_form.scss`.

#### Tri-state checkboxes (`true` / `false` / `null`)
For checkboxes that can start as **indeterminate** (`null`), do not rely on plain HTML `checked` in EJS.
Instead, provide an initial value through a data attribute, then let front-end JS apply it with `boxVal()` on load.

```html
<div class="col-md-4">
   <div class="input-group h-100">
      <div class="input-group-text">
         <input
            id="criminalOrProtectionOrDypProceedings"
            class="form-check-input mt-0"
            type="checkbox"
            data-initial-value="<%= condition ? `true` : otherCondition ? `false` : `null` %>"
         >
      </div>
      <input disabled value="Criminel / protect. 509 / DPJ" name="label-for-criminalOrProtectionOrDypProceedings" type="text" class="form-control disabled-exception">
   </div>
</div>
```

Flow:
- EJS writes `data-initial-value` as one of: `true`, `false`, `null`.
- Front-end calls `initializeCheckboxes()` (defer-loaded bundle, no wrapper needed).
- `initializeCheckboxes()` validates the value, sets the visual checkbox state using `boxVal($checkbox, value)`, then marks `data-initialized="true"`.
- `boxVal($checkbox)` can then be used to read current value for PATCH payloads.

### Dropdowns
- **First option:** `<option value="">SÉLECTIONNER</option>` (when appropriate).
- Use `form-control` or `form-select` for Bootstrap 5.
- For form-floating with select: `<select class="form-control">` or `form-select`, label after.

### Country Input (Autocomplete)
Use `<datalist>` — include `views/partials/datalists.ejs` on the page:

```html
<div class="form-floating">
   <input type="text" id="countryOfMarriage" class="form-control" list="countries-<%= language %>" value="<%= couple.countryOfMarriage %>" placeholder=".">
   <label for="countryOfMarriage">Pays de marriage</label>
</div>
```

- Datalist IDs: `countries-fr`, `countries-en`, or `countries` (combined FR+EN suggestions).

### Province Input
Use `<select>` with `JSONparams.fr.provinces`:

```html
<div class="form-floating">
   <select id="provinceOfMarriage" class="form-select">
      <option value="">SÉLECTIONNER</option>
      <% Object.entries(JSONparams.fr.provinces).forEach(([code, label]) => { %>
         <option value="<%= code %>" <%= couple.provinceOfMarriage === code ? 'selected' : '' %>><%= label %></option>
      <% }) %>
   </select>
   <label for="provinceOfMarriage">Province de marriage</label>
</div>
```

### Form Sections with Border (Card-style)
Use `.label-in-border` + `.card` + `.border-primary` for distinct sections with a visible border. **Typical use case** — simple label in border:

```html
<section id="litigation" class="card border-primary label-in-border">
   <label for="litigation">Litige</label>
   <div class="court-file-info">
      <!-- form fields -->
   </div>
</section>
```

**Optional:** To let users activate/deactivate a section, add a checkbox before the label:

```html
<div class="label-in-border border-primary card" id="new-director">
   <label for="new-director">
      <div class="form-check">
         <input class="form-check-input disabled-exception" type="checkbox" value="" id="check-director" required>
         <label class="form-check-label" for="check-director">
            Administrateur
         </label>
      </div>
   </label>
   <div class="row">
      <!-- form fields -->
   </div>
</div>
```

---

## Search Bars

Search bars follow a consistent pattern with reusable backend JS (`private/js/components/searchBar.js`):

```html
<div class="col-md-12 form-floating position-relative">
   <input 
      id="corp-participant-search-bar" required
      class="form-control" type="text" 
      placeholder="." autocomplete="off"
   >
   <button id="corp-participant-search-bar-reset" type="button" class="d-none btn-close position-absolute top-50 end-0 translate-middle p-2 me-4" aria-label="Close"></button>
   <label for="corp-participant-search-bar">Search persons by name</label>
</div>
<div id="corp-participant-search-output"></div>
<div class="create-new-buttons mt-2"></div>
```

- Search input: `form-floating`, `position-relative`, `autocomplete="off"`.
- Reset button: `d-none` initially, `position-absolute` for placement.
- Output container: `id="[search-bar-id]-output"` or similar.
- `.create-new-buttons` — Container for "Create new" actions.

---

## Modals

### Structure
- **Header:** Title (top left), close button (top right).
- **Body:** Content.
- **Footer:** Delete or similar (bottom left, if needed), Close, Save, Save and close (bottom right). 

```html
<div class="modal fade" id="modal-add-time-activity" tabindex="-1" aria-labelledby="..." aria-hidden="true">
   <div class="modal-dialog modal-lg">
      <div class="modal-content">
         <div class="modal-header">
            <h5 class="modal-title" id="...">Modal Title</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
         </div>
         <div class="modal-body">
            <!-- content -->
         </div>
         <div class="modal-footer">
            <button type="button" class="btn btn-danger me-auto" id="delete-...">Supprimer</button>
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Fermer</button>
            <button type="button" class="btn btn-success" id="save-and-close-...">Enregistrer et fermer</button>
         </div>
      </div>
   </div>
</div>
```

---

## Flat EJS Structure

- Keep EJS files **flat**. A page's `index.ejs` sets up the document structure (head, body, main sections) and then **includes** all content via `<%- include(...) %>`.
- `index.ejs` declares the main sections of the page (e.g. aside, main, modals) and includes the content for each. Sections can include additional parts when it keeps things simple.

---

## Page Structure (Reference Pages)

### File Page (`/file/:fileId`)
- Navbar: `include('./navbar.ejs', {activeTab: 'file'})`
- Layout: `d-flex flex-row` with `aside` (file log), `main.file`, `aside` (time activities).
- Data: `<div id="file-id" class="d-none" data-file-id="<%= fileId %>"></div>`
- Modals: `include('./modals.ejs')` when not new file.
- Datalists: `include('../partials/datalists.ejs')`
- Bootstrap bundle at end of body.

### Person Page (`/person/:personId`)
- Navbar: `include('./navbar.ejs')`
- Layout: `d-flex flex-row` with `main.person`, `aside#person-log`.
- Sections: `h5 pb-2 mb-0 mt-2 text-primary border-bottom border-primary` for section headers.
- Save button: `btn btn-success ms-auto me-3 w-auto`.
- Datalists: `include('../partials/datalists.ejs')`.

### Dashboard (`/dashboard`)
- Navbar: `include('../partials/navbar.ejs', {current:'dashboard', ...})`
- Messages: `include('../partials/messages.ejs')`
- Container: `.custom-container` (70% width, centered).
- Search: `form-control`, `autocomplete="off"`, `autofocus`.

---

## Partials

- **`partials/navbar.ejs`** — Main app navbar. Requires: `current`, `firstName`, `lastName`, `isAdmin`, `user`.
- **`partials/messages.ejs`** — Flash/alert messages rendered with Bootstrap dismissible alerts.
- **`partials/datalists.ejs`** — Country/province datalists (`countries`, `countries-fr`, `countries-en`, `provinces-list-long`). Self-contained (no `JSONparams` or other locals). Include on any page with country/province inputs.

---

## Messages containers

Use one grouped wrapper for server-rendered alerts:

```html
<%- include('../partials/messages.ejs') %>
```

This partial renders:
- `#messagesContainer` (parent wrapper)
- child buckets: **`#dangerContainer`** (Bootstrap `alert-danger`; flash `danger` and `error` strings, and JS `displayErrors` / `displayMessages` with `type: 'danger'`), then `#primaryContainer`, `#secondaryContainer`, `#successContainer`, `#warningContainer`, `#infoContainer`, `#lightContainer`, `#darkContainer`. (`displayMessages` still accepts legacy `type: 'error'` and maps it to `#dangerContainer`.)

Why this structure:
- Keeps message types separated (no mixed "salad" when several alerts are present)
- Leaves each bucket empty when there is nothing to show (no need for `d-none`)
- Lets front-end JS append API messages to the same buckets by id

For flash setup and bucket mapping, see `routes/router-reference.md` ("Flash messages (server-rendered alerts)").
For front-end append helpers, see `private/js/frontend-js-reference.md` ("Messages (`components/displayMessages.js`)").

---

## Common Classes

- **Bootstrap:** `form-control`, `form-select`, `form-floating`, `form-check`, `btn`, `btn-primary`, `btn-success`, `btn-danger`, `card`, `modal`, `row`, `col-md-*`, `d-flex`, `d-none`, `position-relative`, `position-absolute`.
- **Custom:** `.label-in-border`, `.copyable`, `.altered`, `.disabled-exception`, `.sticky-top-gradient`, `.btn-edit-person`, `.create-new-buttons`.
- **Layout:** `main.file`, `main.person`, `aside#file-log`, `aside#person-log`, `aside#time-activities`.

### Checkboxes (Indeterminate)
- Sometimes a checkbox should start with **indeterminate** (neither true nor false). Use `null` as the value. The frontend JS `boxVal()` handles reading and setting both boolean and `null` values.

---

## Data Attributes

- Store IDs: `data-file-id`, `data-person-id`, `data-is-corp`.
- Store JSON: `data-representative="<%= JSON.stringify(representative) %>"`.
- Use `class="d-none"` to hide data containers from view.

---

## Mobile Compatibility

When refactoring pages, make them compatible with mobile devices. Users are not expected to use all features on mobile, but they are likely to visit: **login**, **registration**, **dashboard**, **admin**, **time**, and the **file page** (for reading main section, reading notes, creating notes, creating time activity entries). Use responsive Bootstrap classes (`col-md-*`, `col-12`, etc.) and test on small viewports.

---

## Related docs

- **Front-end JS:** `private/js/frontend-js-reference.md`
- **SCSS:** `private/scss/scss-reference.md`
- **Express routers:** `routes/router-reference.md`
