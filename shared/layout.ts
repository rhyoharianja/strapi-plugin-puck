/**
 * The plugin's own layout contract — mechanism, not blocks.
 *
 * **Why this lives here and the blocks do not.** Blocks are a front-end concern: they change
 * whenever the design system changes, and they belong to whoever owns the site. What does *not*
 * change with the design is the plumbing around them — reading a JSON column defensively, and
 * knowing what shape the asset picker writes into an image field. That plumbing is the plugin's
 * job, so it is defined here rather than imported from a block package.
 *
 * Nothing in this file knows the name of a single block.
 */

import type { Data } from '@measured/puck';

/**
 * Puck's own document type.
 *
 * `import type` only, so nothing from `@measured/puck` reaches the runtime bundle — the import
 * is erased at compile time. Re-describing the shape structurally was the first attempt and it
 * does not typecheck against Puck's stricter `Data`, which is exactly the mismatch worth
 * catching at the boundary rather than casting away at every call site.
 */
export type PuckLayout = Data;

/** A layout that has never been edited. */
export const emptyLayout: Data = { content: [], root: { props: {} } };

/**
 * Coerce a value from the database into something renderable.
 *
 * A layout has round-tripped through a `json` column, so it is never assumed valid: it can come
 * back as a string (Strapi hands a `json` field back as text once it has been touched in the
 * admin), as `null`, or as an object missing `content`. Every one of those degrades to an empty
 * layout rather than throwing inside a field renderer, where the failure would blank the whole
 * edit form.
 */
export const toLayout = (value: unknown): Data => {
  if (typeof value === 'string') {
    const text = value.trim();

    if (!text) return emptyLayout;

    try {
      return toLayout(JSON.parse(text));
    } catch {
      return emptyLayout;
    }
  }

  if (!value || typeof value !== 'object') return emptyLayout;

  const candidate = value as Partial<Data>;

  if (!Array.isArray(candidate.content)) return emptyLayout;

  return {
    content: candidate.content,
    root: candidate.root ?? { props: {} },
    ...(candidate.zones ? { zones: candidate.zones } : {}),
  } as Data;
};

/**
 * What an image field holds: a picked asset, or a plain URL.
 *
 * A union on purpose. Layouts saved before there was an asset picker hold a plain string, and
 * those rows are live — accepting both let the picker start storing a real reference with no
 * migration and no renderer that breaks on the old data.
 *
 * The object keeps `url` beside `id` rather than only the id: a renderer receives *only* the
 * layout JSON, so a reference it would have to resolve over the network is one it cannot draw.
 * The `id` is what makes the asset traceable — it can be looked up, audited and re-resolved when
 * a file moves. It is **not** referential integrity: this is a JSON column, not a relation, so
 * the file can still be deleted. The id lets you find the breakage, not prevent it.
 */
export type ImageRef =
  | string
  | {
      /** Upload-plugin file id. Absent on a URL typed in by hand. */
      id?: number;
      url: string;
      alt?: string;
      width?: number;
      height?: number;
    };

/** Read a reference's URL without callers having to know which shape it is. */
export const imageUrlOf = (ref?: ImageRef | null): string | undefined => {
  if (!ref) return undefined;

  const url = typeof ref === 'string' ? ref : ref.url;

  return url && url.trim() ? url : undefined;
};

/** Read a reference's alt text. A bare URL carries none. */
export const imageAltOf = (ref?: ImageRef | null): string | undefined =>
  typeof ref === 'string' || !ref ? undefined : ref.alt;

/**
 * Where an image lives inside a block's fields, so the picker can be swapped in.
 *
 * Supplied by whoever owns the blocks, because only they know their own field names. Listed
 * explicitly rather than detected by naming convention: a field called `imageUrl` that is *not*
 * an asset must not silently get a picker that writes the wrong shape into it.
 */
export interface AssetFieldPath {
  /** Block name, as it appears in the Puck config's `components`. */
  component: string;
  /** Field name on that block. */
  field: string;
  /** Set when the field sits inside an array field, naming that array. */
  inArray?: string;
}
