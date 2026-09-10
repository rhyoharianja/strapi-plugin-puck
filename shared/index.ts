/**
 * The plugin's public contract for whoever renders a saved layout.
 *
 * **Why this entry point exists.** The plugin owns what a stored layout *means*: the admin
 * field writes the JSON column, and the asset picker decides what an image field holds. A
 * public renderer has to read exactly that, and until now it had no way to import it — the
 * `exports` map opened only `./strapi-admin` and `./strapi-server`, both of which drag in the
 * Strapi admin runtime that a Next.js page has no business loading.
 *
 * So every renderer re-declared the contract, and this project's own block package did exactly
 * that: `ImageRef`, `imageUrlOf`, `imageAltOf` and `toLayout` existed twice, once here and once
 * beside the blocks. Two implementations of "what a stored layout means", with the editor using
 * one and the site the other. They agreed by luck, not by construction; the day they stopped
 * agreeing, images would have gone blank on the site while looking correct in the admin.
 *
 * Nothing exported here imports Strapi, React or `@measured/puck` at runtime — the Puck import
 * in `./layout` is `import type` and is erased at compile time. It is safe in a browser bundle,
 * a server renderer, or an edge function.
 *
 * ```ts
 * import { toLayout, imageUrlOf, type ImageRef } from 'strapi-plugin-puck/shared';
 * ```
 */

export {
  emptyLayout,
  imageAltOf,
  imageUrlOf,
  toLayout,
  type AssetFieldPath,
  type ImageRef,
  type PuckLayout,
} from './layout';

export { PLUGIN_ID, UID, type PageDTO, type PageSummaryDTO } from './puck';
