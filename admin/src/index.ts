import { getTranslation } from "./utils/getTranslation";
import { PLUGIN_ID } from "./pluginId";
import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";

import type { ComponentType } from "react";
import type { StrapiApp } from "@strapi/strapi/admin";

const plugin: StrapiApp["appPlugins"][string] = {
  register(app) {
    /**
     * The reusable half: a custom field usable on ANY content-type.
     *
     * Composing blocks is a capability, not a content-type. Registering it as a field means
     * an Article, a campaign or a landing page can each carry a visual layout without being
     * re-modelled, and the closed field doubles as a live preview of the saved layout.
     */
    app.customFields.register({
      name: "layout",
      pluginId: PLUGIN_ID,
      type: "json",
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.customField.layout.label`,
        defaultMessage: "Visual layout",
      },
      intlDescription: {
        id: `${PLUGIN_ID}.customField.layout.description`,
        defaultMessage: "Compose blocks visually with Puck",
      },
      components: {
        /*
         * Strapi types a custom field's Input as a prop-less `ComponentType`, but the
         * Content Manager actually passes it the field's layout props (name, label,
         * hint, …). The cast reconciles the declared type with what is really handed over.
         */
        Input: async () => {
          const { LayoutField } = await import("./components/LayoutField");
          return { default: LayoutField as ComponentType };
        },
      },
    });

    /*
     * No menu link and no page of its own, deliberately.
     *
     * A visual editor is reached *from the thing it edits*. The plugin used to add a "Puck"
     * entry to the sidebar with its own list of pages and a full-screen editor route — a
     * second place to find content that the Content Manager already lists, and a second way
     * to edit a field that the field itself already opens.
     *
     * The plugin's own `page` content-type is visible in the Content Manager and its
     * `layout` attribute *is* this custom field, so nothing was lost by removing them: open
     * a Page (or an Article, or anything else carrying the field) and the canvas opens from
     * the field. The plugin's admin CRUD routes went with the pages that called them —
     * they were `policies: []` and had no remaining caller.
     */
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = (await import(
            `./translations/${locale}.json`
          )) as {
            default: Record<string, string>;
          };

          const newData: Record<string, string> = {};
          const keys = Object.keys(data);

          for (const key of keys) {
            newData[getTranslation(key)] = data[key];
          }

          return { data: newData, locale };
        } catch {
          return { data: {}, locale };
        }
      }),
    );
  },
};

export default plugin;

/**
 * Register the project's Puck blocks.
 *
 * Exported from the plugin's admin entry so the host app can call it from `src/admin/app.tsx`.
 * The plugin ships no blocks of its own: they are front-end components that change with the
 * design system, and the same config registered here is what the project's renderer imports.
 */
export { registerPuckBlocks, type PuckBlockRegistration } from './blocks/registry';
