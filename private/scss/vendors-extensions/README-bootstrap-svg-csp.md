# Bootstrap control icons without `data:` URLs (CSP)

Bootstrap encodes many UI icons as `url("data:image/svg+xml,...")` in Sass variables (see `node_modules/bootstrap/scss/_variables.scss`). Strict **`img-src`** Content-Security-Policy often disallows **`data:`**, which triggers browser warnings or blocked loads.

This project overrides those variables to **`url("/svg/bootstrap/<name>.svg")`** and ships matching files under **`public/svg/bootstrap/`**. The active overrides live in **`_bootstrap.scss`** (same folder as this file). Modal and toast close buttons also point at the same asset in **`_bootswatch.scss`**.

## How it was done (reproduce after a Bootswatch or theme change)

1. **Locate upstream definitions** — In **`node_modules/bootstrap/scss/_variables.scss`**, search for variables such as `$form-check-input-checked-bg-image`, `$form-select-indicator`, `$btn-close-bg`, etc. They embed SVG markup with interpolated colors (e.g. `#{$form-check-input-checked-color}`).

2. **Resolve colors for your stack** — Imports in **`_bootstrap.scss`** run Bootswatch (e.g. Flatly) variables before Bootstrap; Sass then resolves **`#{$…}`** when you expand the templates. To see what your theme actually compiles to, you can:
   - Temporarily emit the **`url("data:...")`** strings (copy the upstream lines into a scratch partial), compile once, and copy the resolved literals from the generated CSS; or  
   - Inspect computed **`background-image`** in DevTools on a page that still used **`data:`** URLs; or  
   - Trace which Bootstrap variables feed each icon (e.g. `$form-check-input-checked-color`, `$accordion-icon-color`) and read their values from Bootswatch’s **`_variables.scss`** after your edits.

3. **Save SVG files** — For each icon, take the **resolved** SVG (no Sass interpolation), save as **`public/svg/bootstrap/<descriptive-name>.svg`**. Names should stay in sync with **`_bootstrap.scss`** (see table below).

4. **Point variables at files** — In **`_bootstrap.scss`**, set each **`$…-bg-image`** / **`$…-indicator`** (etc.) to **`url("/svg/bootstrap/<file>.svg")`** without **`!default`**, so these assignments win over Bootstrap’s defaults.

After a theme bump, **re-diff** `node_modules/bootstrap/scss/_variables.scss` in case variable names or SVG paths changed.

## Variable → file (current mapping)

| Sass variable | Asset |
|---------------|--------|
| `$form-check-input-checked-bg-image` | `form-check-input-checked.svg` |
| `$form-check-radio-checked-bg-image` | `form-check-radio-checked.svg` |
| `$form-check-input-indeterminate-bg-image` | `form-check-input-indeterminate.svg` |
| `$form-switch-bg-image` | `form-switch.svg` |
| `$form-switch-focus-bg-image` | `form-switch-focus.svg` |
| `$form-switch-checked-bg-image` | `form-switch-checked.svg` |
| `$form-select-indicator` | `form-select-indicator.svg` |
| `$form-feedback-icon-valid` | `form-feedback-icon-valid.svg` |
| `$form-feedback-icon-invalid` | `form-feedback-icon-invalid.svg` |
| `$navbar-light-toggler-icon-bg` | `navbar-light-toggler-icon.svg` |
| `$navbar-dark-toggler-icon-bg` | `navbar-dark-toggler-icon.svg` |
| `$accordion-button-icon` | `accordion-button-icon.svg` |
| `$accordion-button-active-icon` | `accordion-button-active-icon.svg` |
| `$carousel-control-prev-icon-bg` | `carousel-control-prev-icon.svg` |
| `$carousel-control-next-icon-bg` | `carousel-control-next-icon.svg` |
| `$btn-close-bg` | `btn-close.svg` |

**Close button:** This app uses a **black** glyph in **`btn-close.svg`** for contrast on light chrome; Bootstrap’s default may follow **`$btn-close-color`**. If you change the SVG, update **`_bootswatch.scss`** if it still references the same path.

---

## Reference: upstream templates (interpolated — from Bootstrap `_variables.scss`)

Use these when re-deriving SVGs after an upgrade; they are **not** valid copy-paste into SVG files until Sass variables are replaced.

```scss
$form-check-input-checked-bg-image:       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path fill='none' stroke='#{$form-check-input-checked-color}' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='m6 10 3 3 6-6'/></svg>") !default;
$form-check-radio-checked-bg-image:       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'><circle r='2' fill='#{$form-check-input-checked-color}'/></svg>") !default;
$form-check-input-indeterminate-bg-image:       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path fill='none' stroke='#{$form-check-input-indeterminate-color}' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 10h8'/></svg>") !default;
$form-switch-bg-image:            url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'><circle r='3' fill='#{$form-switch-color}'/></svg>") !default;
$form-switch-focus-bg-image:      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'><circle r='3' fill='#{$form-switch-focus-color}'/></svg>") !default;
$form-switch-checked-bg-image:    url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'><circle r='3' fill='#{$form-switch-checked-color}'/></svg>") !default;
$form-select-indicator:             url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path fill='none' stroke='#{$form-select-indicator-color}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/></svg>") !default;
$form-feedback-icon-valid:          url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><path fill='#{$form-feedback-icon-valid-color}' d='M2.3 6.73.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1'/></svg>") !default;
$form-feedback-icon-invalid:        url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='#{$form-feedback-invalid-color}'><circle cx='6' cy='6' r='4.5'/><path stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/><circle cx='6' cy='8.2' r='.6' fill='#{$form-feedback-icon-invalid-color}' stroke='none'/></svg>") !default;
$navbar-light-toggler-icon-bg:      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><path stroke='#{$navbar-light-icon-color}' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/></svg>") !default;
$navbar-dark-toggler-icon-bg:       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><path stroke='#{$navbar-dark-icon-color}' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/></svg>") !default;
$accordion-button-icon:         url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='#{$accordion-icon-color}' stroke-linecap='round' stroke-linejoin='round'><path d='m2 5 6 6 6-6'/></svg>") !default;
$accordion-button-active-icon:  url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='#{$accordion-icon-active-color}' stroke-linecap='round' stroke-linejoin='round'><path d='m2 5 6 6 6-6'/></svg>") !default;
$carousel-control-prev-icon-bg:      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='#{$carousel-control-color}'><path d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0'/></svg>") !default;
$carousel-control-next-icon-bg:      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='#{$carousel-control-color}'><path d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708'/></svg>") !default;
$btn-close-bg:               url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='#{$btn-close-color}'><path d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414'/></svg>") !default;
```

## Reference: one resolved snapshot (literals only — theme-specific)

These were the **`data:`** payloads after variables were expanded for **Flatly + this repo’s `_bootstrap.scss` theme slice** at the time the SVG files were generated. After you change Bootswatch or palette, **re-resolve**; literals below may be wrong.

```scss
$form-check-input-checked-bg-image:       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path fill='none' stroke='#fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='m6 10 3 3 6-6'/></svg>") !default;
$form-check-radio-checked-bg-image:       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'><circle r='2' fill='#fff'/></svg>") !default;
$form-check-input-indeterminate-bg-image:       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path fill='none' stroke='#fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 10h8'/></svg>") !default;
$form-switch-bg-image:            url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'><circle r='3' fill='rgba(0, 0, 0, 0.25)'/></svg>") !default;
$form-switch-focus-bg-image:      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'><circle r='3' fill='#999999'/></svg>") !default;
$form-switch-checked-bg-image:    url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'><circle r='3' fill='#fff'/></svg>") !default;
$form-select-indicator:             url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path fill='none' stroke='#212529' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/></svg>") !default;
$form-feedback-icon-valid:          url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><path fill='#28a745' d='M2.3 6.73.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1'/></svg>") !default;
$form-feedback-icon-invalid:        url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='#dc3545'><circle cx='6' cy='6' r='4.5'/><path stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/><circle cx='6' cy='8.2' r='.6' fill='#dc3545' stroke='none'/></svg>") !default;
$navbar-light-toggler-icon-bg:      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><path stroke='#fff' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/></svg>") !default;
$navbar-dark-toggler-icon-bg:       url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><path stroke='#fff' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/></svg>") !default;
$accordion-button-icon:         url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='#212529' stroke-linecap='round' stroke-linejoin='round'><path d='m2 5 6 6 6-6'/></svg>") !default;
$accordion-button-active-icon:  url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='rgb(20.4, 20.4, 20.4)' stroke-linecap='round' stroke-linejoin='round'><path d='m2 5 6 6 6-6'/></svg>") !default;
$carousel-control-prev-icon-bg:      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='#fff'><path d='M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0'/></svg>") !default;
$carousel-control-next-icon-bg:      url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='#fff'><path d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708'/></svg>") !default;
$btn-close-bg:               url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='#000'><path d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414'/></svg>") !default;
```

Note: **`$btn-close-bg`** in the snapshot uses **`#000`** by product choice; Bootstrap’s template uses **`#{$btn-close-color}`**.
