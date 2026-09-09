import type { Config, Field } from "@measured/puck";

import type { AssetFieldPath } from "../../../shared/layout";

/**
 * The blocks this plugin edits are supplied by the project, not shipped with the plugin.
 *
 * **Why.** A block is a front-end component. It changes when the design system changes, and the
 * set of blocks a site needs is specific to that site. A CMS plugin that bundled its own blocks
 * would be dictating the front end — and every project would then either accept blocks it did
 * not want or fork the plugin.
 *
 * So the plugin owns the *mechanism* — the custom field, the canvas, the asset picker, reading
 * the JSON column defensively — and the project owns the *blocks*. The same Puck config the
 * project registers here is the one its public renderer imports, which is what keeps the editor
 * and the site drawing the same thing.
 *
 * Registration happens from the Strapi app's own admin entry:
 *
 * ```tsx
 * // src/admin/app.tsx
 * import { registerPuckBlocks } from 'strapi-plugin-puck/strapi-admin';
 * import { config, IMAGE_FIELDS } from './puck/blocks';
 *
 * export default {
 *   register() {
 *     registerPuckBlocks({ config, assetFields: IMAGE_FIELDS });
 *   },
 * };
 * ```
 *
 * A module-level registry rather than React context: the field inputs are rendered by the
 * Content Manager, deep in its own tree, with no ancestor of this plugin's above them. There is
 * no provider the app could wrap them in — the same reason the collab plugin keeps its session
 * in a module store.
 */

export interface PuckBlockRegistration {
  /** The project's Puck config — the identical object its renderer uses. */
  config: Config;
  /** Which block fields hold images, so the Media Library picker can replace them. */
  assetFields?: AssetFieldPath[];
}

/**
 * A config with no blocks at all.
 *
 * Deliberately valid rather than `null`: the field renders, says plainly that no blocks are
 * registered, and does not blank the edit form. An empty canvas with a clear message is a much
 * better failure than a crashed field, because a crashed field looks like the entry is broken.
 */
const EMPTY_CONFIG: Config = { components: {} } as Config;

let registration: PuckBlockRegistration | null = null;

/** Called once by the host app, from its admin `register()`. */
export const registerPuckBlocks = (next: PuckBlockRegistration): void => {
  registration = next;
};

/** Whether the host app has registered anything — what the field's empty state reads. */
export const hasPuckBlocks = (): boolean =>
  registration !== null && Object.keys(registration.config.components ?? {}).length > 0;

/** The registered config, or an empty one. Never throws: a field must always render. */
export const puckConfig = (): Config => registration?.config ?? EMPTY_CONFIG;

/** Human label for a block type, from whatever config was registered. */
export const blockLabel = (type: string): string => {
  const components = puckConfig().components as Record<string, { label?: string }> | undefined;

  return components?.[type]?.label ?? type;
};

/**
 * The registered config with its image fields swapped for a picker.
 *
 * Returns a *new* config, and callers must memoise it: handing Puck a new `config` object on
 * every render remounts its field editors, which loses focus mid-typing.
 *
 * A field the project did not declare is left alone, and a declared field that does not exist on
 * the block is skipped rather than created — a picker attached to a field the block never reads
 * would write a value nothing renders.
 */
export const configWithAssetFields = (picker: Field): Config => {
  const base = puckConfig();
  const paths = registration?.assetFields ?? [];

  if (paths.length === 0) return base;

  const components = { ...(base.components ?? {}) } as Record<string, any>;

  for (const { component, field, inArray } of paths) {
    const definition = components[component];

    if (!definition?.fields) continue;

    if (inArray) {
      const arrayField = definition.fields[inArray];

      if (!arrayField?.arrayFields?.[field]) continue;

      components[component] = {
        ...definition,
        fields: {
          ...definition.fields,
          [inArray]: {
            ...arrayField,
            arrayFields: { ...arrayField.arrayFields, [field]: picker },
          },
        },
      };

      continue;
    }

    if (!definition.fields[field]) continue;

    components[component] = {
      ...definition,
      fields: { ...definition.fields, [field]: picker },
    };
  }

  return { ...base, components } as Config;
};
