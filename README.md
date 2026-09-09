# strapi-plugin-puck

Visual block composition for Strapi 5, powered by [Puck](https://puckeditor.com).

It ships as a **custom field** you can add to any content-type — an Article, a campaign, a
landing page — plus a ready-made `Page` type for when you just want a page builder.
Composing blocks is a capability, not a content-type; tying it to one would mean
re-modelling content just to lay it out visually.

Part of [Strapi Content Hub](../../README.md).

## Install

```bash
pnpm add strapi-plugin-puck @measured/puck
```

```ts
// config/plugins.ts
export default {
  'content-hub-puck': { enabled: true, resolve: 'strapi-plugin-puck' },
};
```

Then register **your** blocks from the admin entry:

```tsx
// src/admin/app.tsx
import { registerPuckBlocks } from 'strapi-plugin-puck/strapi-admin';
import { config, IMAGE_FIELDS } from './puck/blocks';   // your own blocks

export default {
  register() {
    registerPuckBlocks({ config, assetFields: IMAGE_FIELDS });
  },
};
```

## This plugin ships no blocks

**A block is a front-end component.** It changes when your design system changes, and the set of
blocks a site needs is specific to that site. A CMS plugin that bundled its own blocks would be
dictating your front end — and every project would then either accept blocks it did not want or
fork the plugin.

So the split is:

| Owned by the plugin | Owned by your project |
| ------------------- | --------------------- |
| The custom field and its closed-state summary | The Puck `Config` — blocks and their components |
| The canvas: palette, outline, properties, toolbar | Which fields hold images (`assetFields`) |
| The Media Library picker, and swapping it into image fields | The public renderer |
| Reading the `json` column defensively (`toLayout`) | |
| The `ImageRef` contract the picker writes | |

The config you register is the **same object** your renderer imports, which is what keeps the
editor and the site drawing the same thing. If nothing is registered the field still renders and
says so plainly, rather than crashing the edit form.

```mermaid
flowchart LR
    YB["your blocks<br/>config + components"]

    YB -->|"registerPuckBlocks()"| P["this plugin<br/>field · canvas · picker"]
    YB -->|"Render config"| WEB["your renderer"]

    P -->|"Puck Data"| DB[("json column")]
    DB --> WEB
```

## The custom field

Add it in the Content-Type Builder, or straight in a schema:

```jsonc
// src/api/article/content-types/article/schema.json
"layout": {
  "type": "customField",
  "customField": "plugin::content-hub-puck.layout"
}
```

<img src="docs/images/layout-field.png" width="920" alt="The layout field in a Strapi entry, closed: a summary reading no blocks yet and a Compose visually button that opens the canvas">

Open it and the canvas shows **your** blocks, grouped by whatever categories your config
declares — the plugin contributes none of these names:

<img src="docs/images/canvas.png" width="920" alt="The Puck canvas open in a modal: an icon rail, a Blocks palette listing Hero, Card grid and Spacer under Layout, Text, Image and Disclaimer under Content and Buttons under Actions, the drop area in the middle, and a Properties panel on the right">

That is all. The field then renders:

- **closed** — a live preview drawn with the *real* block components, plus a summary of the
  blocks it holds. It doubles as a preview of what the site will show, without leaving the
  edit view;
- **open** — the full Puck canvas in a near-viewport modal: block palette, drag and drop,
  properties panel.

Stored as plain `json`, so nothing else has to know the field is special: existing REST and
GraphQL responses carry the layout as-is, and any renderer feeds it to Puck's `Render`.

## How the pieces fit

```mermaid
flowchart TD
    YB["your block config<br/>registered at admin startup"]

    YB --> F["layout custom field<br/>this plugin"]

    F -->|"open"| M["Puck canvas in a modal<br/>palette · drag and drop · properties"]
    M -->|"onChange"| FORM["Strapi form state"]
    FORM -->|"the entry's own Save button"| DB[("json column")]
    DB -->|"REST / GraphQL, unchanged"| WEB["your renderer"]

    YB -->|"same config"| WEB

    F -.->|"closed"| PREV["summary of the blocks it holds"]
```

The layout is written into the **form**, never straight to the API, so it is saved by the same
Save button as every other field. Publishing a layout while the fields around it stayed unsaved
would be worse than having no editor.

Only the **layout JSON** crosses the wire — `{ "type": "Hero", "props": { … } }`. That string
`"Hero"` is all the database holds; something has to map it to a component, and both the editor
and the site need that same mapping. That is why the config is yours and is registered in both
places, rather than shipped by the plugin.

One entry point: the custom field. It opens `PuckEditor` in an overlay from wherever the
field appears, so an Article and a Page get the identical canvas without either being a
special case.

Only the **layout JSON** crosses the wire. The renderer already holds the block components,
imported from the same package the editor uses — which is what guarantees the site and the
editor agree.

## The `page` content-type

| Field | Notes |
| ----- | ----- |
| `title` | |
| `slug` | Generated from the title, de-duplicated with `-2`, `-3`, … |
| `description` | Used as the page's meta description |
| `published` | Gates the public endpoint |
| `layout` | `plugin::content-hub-puck.layout` — Puck's `Data` document, stored verbatim as JSON |

`layout` uses this plugin's own custom field, so the Content Manager shows the visual
editor rather than raw JSON.

**Its shape is deliberately opaque to Strapi.** It belongs to the block config in
`puck-blocks`; modelling it as Strapi components would freeze it, and adding a block would
then need a schema migration instead of a package release.

`published` is a plain boolean rather than Strapi's draft/published, so the editor toolbar
controls visibility directly without a second publication concept to reason about.

> Strapi's `uid` field only auto-generates inside the Content Manager UI, not through the
> Document Service — so the service slugifies titles itself. Otherwise every caller would
> have to slugify, and they would each do it differently.

## Admin: no menu, no page of its own

**The editor is reached from the thing it edits, and nowhere else.** Open a Page — or an
Article, or anything else carrying the `layout` field — in the **Content Manager**, and the
field opens the canvas.

The plugin used to add a "Puck" entry to the sidebar with its own list of pages and a
full-screen editor route. Both were removed: the list duplicated what the Content Manager
already shows, and the editor route duplicated what the field already opens. A visual editor
is not a section of the admin, it is a way of editing a field.

Its admin CRUD routes went with those pages. They had no remaining caller and carried
`policies: []`, so leaving them would have been an unguarded surface for no benefit. The
Content Manager reads and writes the `page` content-type through its own generic endpoints.

> The `page` service still exposes `list`, `findOne`, `create`, `update`, `delete` and
> `uniqueSlug` for other plugins and for the Strapi console — a plugin's service is a public
> API, so those were kept even though only `findBySlug` now has an internal caller.

## API

| Method | Route | Auth |
| ------ | ----- | ---- |
| GET | `/api/content-hub-puck/pages/:slug` | **Public** |

The public route is unauthenticated because a composed page is published content — and the
service only ever returns pages whose `published` flag is set. An unpublished slug is a
`404`, not a `403`, so a draft's existence is not leaked.

```jsonc
// GET /api/content-hub-puck/pages/spring-campaign
{
  "data": {
    "title": "Spring campaign",
    "slug": "spring-campaign",
    "description": "This season's offer, explained on one page.",
    "published": true,
    "layout": { "root": { "props": {} }, "content": [ /* blocks */ ] }
  }
}
```

## Rendering it

See [`apps/web`](../../apps/web) for a working Next.js renderer — it is about thirty lines.

## License

MIT © Suryo Galih Kencana Harianja
