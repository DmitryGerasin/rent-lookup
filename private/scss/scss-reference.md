# SCSS Reference

Reference for AI agents and developers. Use this when writing or refactoring SCSS to match project conventions.

**Ignore:** Everything in `private/scss/vendors/mso/` — Excel-style overrides for GET:/trust/ pages only.

---

## Build

- Run `npm run dev-front` to compile SCSS.
- SASS compiles `private/scss` → `public/css` (compressed, no source maps).
- Page-specific entry points: `file.min.scss`, `person.min.scss`, `dashboard.min.scss`, etc.

---

## When to Write New SCSS

1. **Prefer classes** — Use existing Bootstrap and custom classes first.
2. **Reuse components** — Import shared components (`_form.scss`, `_label-in-border.scss`, etc.) instead of duplicating.
3. **Add SCSS only when needed** — When components, bootstrap classes, and custom classes are insufficient.

---

## Custom Classes Summary

### base/_global.scss
| Class                 | Purpose                                 |
|-----------------------|-----------------------------------------|
| `.text-align-center`  | Center text                             |
| `.flex-row`           | `display: flex; flex-direction: row`    |
| `.flex-column`        | `display: flex; flex-direction: column` |
| `.w-0`                | `width: 0`                              |
| `.h-100`              | `height: 100%`                          |
| `.c-pointer`          | `cursor: pointer`                       |
| `.c-alias`            | `cursor: alias`                         |
| `.scale-x-negative-1` | `transform: scaleX(-1)`                 |
| `.no-print`           | Visible on screen, hidden in print media |

### components/_copyable.scss
| Class         | Purpose                                                                                   |
|---------------|-------------------------------------------------------------------------------------------|
| `.copyable`   | Click-to-copy element. Cursor copy, hover scale. Works with `data-to-copy` and copyable.js |
| `.copied`     | Shown briefly after copy (absolute, z-index 5000, "copié" text)                           |

### components/_form.scss
| Class | Purpose |
|-------|---------|
| `.altered` | Light yellow background for modified/unsaved inputs. Use on inputs/checkboxes to indicate change |
| `.disabled-exception` | On the **disabled input adjacent to a checkbox** — that input acts as a label for the checkbox (not editable). Overrides disabled styling so it appears as a non-editable label. |

Form-floating overrides:
- `.form-floating > label` — Left auto, opacity 0.5, bold, custom transform.
- `label` — Bold by default.
- `.form-floating.input-group > label` — z-index 3.
- `.ms-parent.multiple-select` — Multiple-select plugin styling.

### components/_label-in-border.scss
| Class               | Purpose                                                                                             |
|---------------------|-----------------------------------------------------------------------------------------------------|
| `.label-in-border`  | Section with label in the border. Label sits in top border, white background. Use with `.card` and `.border-primary` for form sections. |

### components/_sticky-top-gradient.scss
| Class                          | Purpose                                      |
|--------------------------------|----------------------------------------------|
| `.sticky-top-gradient`         | Sticky top + gradient fade (aliceblue) below |
| `.sticky-top-gradient-sharper` | Stronger gradient variant                    |

### components/_link.scss
| Class                  | Purpose                                  |
|------------------------|------------------------------------------|
| `a.cursor-not-allowed` | Cursor not-allowed, pointer-events all   |
| `td.fill-with-link`    | Makes child `<a>` fill the entire `<td>` |

### components/_button.scss
| Class              | Purpose                                             |
|--------------------|-----------------------------------------------------|
| `button`, `.button`| Base button: rounded, shadow, hover scale. SVG sizing|
| `.size30x30`       | 30×30px button                                      |
| `.size25x25`       | Scaled 25×25                                        |
| `.four-btn-group`  | 4-button grid with shared borders                   |

### components/_card.scss
| Class            | Purpose                                                                                             |
|------------------|-----------------------------------------------------------------------------------------------------|
| `aside div.card` | Card styling for aside (file-log, person-log, time-activities): margin, border, header/body padding |

### _currency.scss
| Class        | Purpose                    |
|--------------|----------------------------|
| `.enMoney`   | Prefix with `$`            |
| `.negMoney`  | Red, wrapped in `$()`      |

### components/_quill.scss
| Class / scope | Purpose |
|---------------|---------|
| `.quill-editor-container`, `.quill-toolbar`, `.quill-editor .ql-editor` | Layout and sizing for the file-note modal editors. |
| `.ql-snow` … | Toolbar / size picker tweaks for Quill Snow. |

### file.min.scss (page-specific)
| Class | Purpose |
|-------|---------|
| `.dollar-qbo`, `.dollar-green`, `.dollar-yellow`, `.dollar-red`, `.dollar-grey`, `.dollar-black` | Dollar/action buttons with specific colors |
| `.edit-client`, `.edit-surety`, `.edit-participant`, `.edit-lawyer`, `.add-lawyer`, `.btn-edit-person` | Clickable person/corp cells, hover lightgray |
| `aside#time-activities` | Time activities aside layout |
| `main.file` | Main file content area |
| `aside#file-log` | File log aside (extends #history-log) |
| `.call-notes`, `.file-updates`, `.important`, `.lawyer-notes` | Card variants for file log entries |

### _history-log.scss
| Class         | Purpose                                                           |
|---------------|-------------------------------------------------------------------|
| `#history-log`| Base for file-log, person-log, lawyer-log. Scroll, card header collapse on hover |

### _family.scss
| Class                | Purpose                                   |
|----------------------|-------------------------------------------|
| `section#family`     | Family section flex layout for couple info |
| `.edit-child > a`    | Child row link styling                    |

### _corp.scss
| Class             | Purpose                                         |
|-------------------|-------------------------------------------------|
| `section#corp`    | Corp section                                    |
| `.no-table-hover` | Disable table row hover for specific rows        |

### Registration (when refactoring register.ejs)
| Class | Purpose |
|-------|---------|
| `.form-section` | Section container: background #f8f9fa, rounded, padding, margin |
| `.form-section-title` | Section header: bold, color #495057, border-bottom |
| `.password-requirements` | Password rules box: small text, yellow background, border |
| `.invitation-info` | Invitation details: green background, border |
| `.error-card` | Error state: red background, centered |
| `.registration-card` | Main card: max-width 600px, white, shadow, rounded |

---

## Messages and alert containers

- Shared EJS partial: `views/partials/messages.ejs`
- Parent wrapper: `#messagesContainer`
- Child buckets: **`#dangerContainer`** (`alert-danger`; `displayMessages` maps `type: 'danger'` here; legacy `type: 'error'` maps to the same bucket), then `#primaryContainer`, `#secondaryContainer`, `#successContainer`, `#warningContainer`, `#infoContainer`, `#lightContainer`, `#darkContainer`
- Buckets stay empty when there is nothing to show (no `d-none` toggling required)

Visual conventions:

- Use Bootstrap dismissible alerts: `.alert.alert-<type>.alert-dismissible.fade.show`
- Close button: `.btn-close` with `data-bs-dismiss="alert"`
- Keep server flash and front-end appends on the same markup for consistency

Cross-reference: `routes/router-reference.md` (“Flash messages”), `views/ejs-reference.md` (“Messages containers”), `private/js/frontend-js-reference.md` (“Messages (`components/displayMessages.js`)”).

---

## Abstracts (Variables & Mixins)

### _variables.scss
- Breakpoints: `$mobile`, `$tablet`, `$laptop`, `$desktop`
- Colors: `$lightGray`, `$darkBlue`, `$lightBlue`, `$brightBlue`, `$grayOverlay`, `$boxShadow`
- Layout: `$navBarHeight`, `$sideBarWidth`, `$contentH`, `$aside-padding-x`, `$card-mb`
- Sizing: `$radiusLarge`, `$radiusSmall`, `$logoProportion`

### _mixins.scss
- `@include mobile()` — Mobile breakpoint media query

---

## Typical Page SCSS Structure

```scss
// 1. BOOTSTRAP & BOOTSWATCH (if needed)
@use './vendors/bootswatch/sketchy/variables' as v;
@use '../../node_modules/bootstrap/scss/functions' as f;
@use './vendors/bootstrap';

// 2. VENDOR OVERRIDES (if needed)
// @use './vendors/multiple-select';

// 3. CUSTOM STYLES
@use './base/resets';
@use './base/global';
@use './abstracts' as *;
@use './components/link';
@use './components/button';
@use './components/form';
@use './components/label-in-border';
@use './components/table';
@use './components/sticky-top-gradient';
@use './components/card';
@use './components/navbar';

// 4. PAGE-SPECIFIC STYLES
.custom-container { ... }
```

---

## Bootstrap Usage

- Bootstrap 5.1.3 is the base.
- Bootswatch themes (e.g. flatly) via `vendors/bootswatch/`.
- Custom overrides in `vendors-extensions/_bootstrap.scss`.
- **CSP / self-hosted Bootstrap icons** — Replacing Bootstrap’s default `data:` control icons with files under `public/svg/bootstrap/` is documented in **`private/scss/vendors-extensions/README-bootstrap-svg-csp.md`** (workflow, variable→file map, and archived upstream `data:` snippets for re-deriving SVGs after a theme change).

---

## File Organization

```
private/scss/
├── abstracts/          # Variables, mixins
├── base/               # Resets, global, typography
├── components/         # Reusable components (form, copyable, etc.)
├── vendors/            # Bootstrap, bootswatch; thin `@use '../../../node_modules/.../*.css'` wrappers (e.g. `_quill-snow.scss`, `_jquery-ui.scss`, `_multiple-select.scss`)
├── vendors-extensions/ # Overrides for vendors; see README-bootstrap-svg-csp.md for Bootstrap `data:` → `/svg/bootstrap/` icons
├── vendors/mso/        # IGNORE — Excel styles for trust pages
├── *.min.scss          # Page entry points (file, person, dashboard, etc.)
├── _family.scss        # Family section
├── _corp.scss          # Corp section
├── _history-log.scss   # History log base
└── _currency.scss      # Money formatting
```

---

## Related docs

- **EJS pages:** `views/ejs-reference.md`
- **Front-end JS:** `private/js/frontend-js-reference.md`
- **Express routers:** `routes/router-reference.md`
