# Nutbook HTML edit contract v1

## Purpose

`nutbook-html/v1` declares that an HTML artifact exposes stable editable
targets compatible with Nutbook's existing child-WebView editor. Every active
HTML artifact registered by nbskill must satisfy this contract and use
`managed-source`. Ordinary HTML that cannot satisfy it stays on Nutbook's
non-nbskill discovery and editable-copy path.

## Document marker

The root `html` element must declare:

```html
<html data-nutbook-edit-contract="nutbook-html/v1">
```

Nutbook 0.6 can probe existing `data-editable` fields without this root marker.
Task 7 must require the marker in addition to the manifest declaration before
enabling `managed-source`; this contract does not silently broaden current
runtime behavior.

## Editable targets

Every editable target must have a stable, non-empty, document-unique `data-id`.
Supported v1 targets are:

```html
<p data-id="summary" data-editable="text">Plain text</p>

<p data-id="summary-rich" data-editable="rich-text" data-edit-role="short">
  Run <code>nbskill</code> with <strong>inline emphasis</strong>
</p>

<article data-id="body" data-editable="rich-text" data-edit-role="content">
  <h2>Editor-owned prose</h2>
  <p>Only canonical body markup belongs inside this target.</p>
</article>

<img
  data-id="hero"
  data-editable="image"
  src="assets/hero.png"
  alt="Hero"
>

<section
  data-id="cover"
  data-editable="background-image"
  style="background-image:url('assets/cover.png')"
></section>
```

For `rich-text`, `data-edit-role` is required and is either:

- `short`: short-form inline formatting;
- `content`: supported block and inline rich text.

The v1 contract does not promise arbitrary DOM, chart, layout, JSON, YAML, or
script editing. Existing support for user-inserted image frames remains a
Nutbook-managed runtime/source feature rather than an author-created editable
target type.

## Complete and layout-safe content coverage

Registration succeeds only when every user-visible text node in `body` is
inside a `text` or `rich-text` target and every `img` is its own `image` target.
This includes titles, headings, paragraphs, list items, card copy, table text,
captions, labels, code examples, and footer copy. CSS, layout, scripts, metadata,
and non-visible accessibility attributes are not editable fields.

- Use `text` only for plain text without child elements. Put the marker on the
  semantic element itself so its tag, class, style, and layout role survive.
- Use `rich-text short` for one semantic field whose descendants are limited to
  `br`, `strong`, `em`, and `code` with no attributes.
- Use `rich-text content` only for an intentionally editor-owned prose island.
  Its descendants are limited to `p`, `br`, `strong`, `em`, `code`, `h1`–`h4`,
  `ul`, `ol`, and `li`. Descendant attributes are forbidden except exact
  `style="text-align:left|center|right"` on `p` and `h1`–`h4`.
- Never use a rich-text target as a shortcut around layout. A section, card
  grid, table, header, footer, figure, navigation region, or scripted component
  must keep its structure outside rich-text and expose separate field targets.
- Nutbook owns and may rewrite every descendant inside rich-text. If a
  descendant needs a class, ID, style, data attribute, event hook, attributed
  `code`, `span`, link, image, table, or other author-owned markup, it must not live
  inside that rich-text target. Restructure it into sibling plain-text or image
  targets instead.
- Split decorative prefixes from editable wording by putting the wording in a
  dedicated target; do not mark a parent as `text` if it contains spans or icons.
- Do not nest editable targets. Keep an editable image outside a rich-text
  target so each field has one unambiguous owner.
- A root marker plus one editable field is not compliance. Partial coverage is
  rejected by the registrar and validator.

Unsafe shortcut, rejected because editing would remove layout identity:

```html
<section data-id="features" data-editable="rich-text" data-edit-role="content">
  <h2 class="section-title">Features</h2>
  <div class="card">Fast</div>
</section>
```

Layout-safe equivalent:

```html
<section class="features">
  <h2 class="section-title" data-id="features-title" data-editable="text">Features</h2>
  <div class="card">
    <p data-id="feature-fast" data-editable="text">Fast</p>
  </div>
</section>
```

## Identity and structure

- `data-id` identifies the logical field across saves and Agent regeneration.
- IDs must not be derived from DOM order.
- Regeneration must not reuse an ID for a different semantic field.
- Duplicate IDs invalidate managed-source editing.
- Presentation pages may use stable `data-nutbook-page-id`; field IDs remain
  unique across the whole document.

## Resource boundary

Local images and other dependencies remain project-relative resources. Their
manifest paths must pass the same canonical project-root and symlink checks as
the primary file. Remote URLs and data URLs do not become managed related
files.

## Save safety

Before writing a managed source, Nutbook must verify all of the following:

1. the manifest entry is active;
2. `editContract` is `nutbook-html/v1`;
3. `savePolicy` is `managed-source`;
4. the root marker is present and supported;
5. editable IDs and target types are valid and unique;
6. the item, runtime session, generation, and path lease are current;
7. the source path, hash, size, and modification time still match the opened
   baseline;
8. the existing journal/atomic commit path succeeds.

An external Agent rewrite is a conflict. Nutbook must not silently overwrite
it. Saving, discarding, closing, and reopening must continue through the real
child-WebView and host orchestration paths.

## Compatibility policy

`nutbook-html/v1` is a stable published contract. A package update may add
markup that Nutbook can preserve, but it must not make an artifact accepted by
an earlier published v1 validator unreadable solely because the package
version changed. A future restriction that cannot preserve this compatibility
requires a new edit-contract identifier and a coexistence or scripted migration
path; it must not silently redefine v1.

Manifest schema readability is independent from active HTML compatibility.
The validator reports incompatible legacy HTML entries by ID and path while
keeping the manifest structurally readable, so an Agent can repair the source
or retire it with `supersede.mjs` without manual JSON edits.
