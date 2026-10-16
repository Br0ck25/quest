# HTML_LIVING_STANDARD.md — HTML Living Standard Specification

> **Precedence**: Higher precedence than framework preferences and code style.  
> **Standard**: WHATWG HTML Living Standard (No XHTML, No JSX self-closing hacks on non-void elements).

---

## 1. Syntax & Markup Rules

### 1.1 Non-Void Elements Must Never Self-Close
Under the HTML Living Standard, only designated **void elements** may be self-closing (and do not require a trailing slash). Non-void elements MUST have explicit closing tags.
- ❌ **Forbidden**:
  ```html
  <div class="card" />
  <span class="badge" />
  <button class="btn" />
  <textarea id="prompt" />
  <script src="app.js" />
  ```
- ✅ **Required**:
  ```html
  <div class="card"></div>
  <span class="badge"></span>
  <button type="button" class="btn"></button>
  <textarea id="prompt"></textarea>
  <script src="app.js"></script>
  ```

### 1.2 Void Elements
The only elements that do not require closing tags are void elements:
- `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `param`, `source`, `track`, `wbr`.
- Trailing slashes (e.g. `<input />` vs `<input>`) are tolerated by HTML parsers but `<input>` is preferred.

### 1.3 Boolean Attributes
In HTML, boolean attributes represent `true` simply by their presence.
- ❌ **Forbidden**:
  ```html
  <button disabled="true">Submit</button>
  <input type="checkbox" checked="false">
  ```
- ✅ **Required**:
  ```html
  <!-- True -->
  <button disabled>Submit</button>
  <!-- False: omit attribute completely -->
  <button>Submit</button>
  ```

### 1.4 Semantic Element Selection
- Every screen must have a clear semantic landmark structure:
  - `<main id="app-root">` wraps the primary game shell.
  - `<canvas>` for visual gameplay world.
  - `<div role="region" aria-label="Game World">` wraps the canvas with a textual description for accessibility.
  - Question modals must use `<dialog>` or `role="dialog"` with `aria-modal="true"`.
  - Question options must be encapsulated inside `<fieldset>` with a `<legend>` containing the question prompt, or an accessible list of `<button type="button">` elements.
  - Always explicitly specify `type="button"` on `<button>` elements that do not submit forms to prevent accidental form submission.
