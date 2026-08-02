# Nutbook HTML edit contract v1

## Purpose

`nutbook-html/v1` declares that an HTML artifact exposes stable editable
targets compatible with Nutbook's existing child-WebView editor. The manifest
declaration is necessary for `managed-source`, but it is never sufficient by
itself.

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

<div
  data-id="body"
  data-editable="rich-text"
  data-edit-role="content"
>Rich content</div>

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

