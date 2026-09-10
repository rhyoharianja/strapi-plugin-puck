import type { Core } from '@strapi/strapi';

import { PLUGIN_ID } from '../../shared/puck';

/**
 * Register the `layout` custom field.
 *
 * The server side only declares that the field exists and stores `json`; the admin side
 * supplies the Puck editor that draws it. Once registered it can be added to any
 * content-type, either through the Content-Type Builder or directly in a schema:
 *
 *   "layout": {
 *     "type": "customField",
 *     "customField": "plugin::puck.layout"
 *   }
 */
const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.customFields.register({
    name: 'layout',
    plugin: PLUGIN_ID,
    type: 'json',
  });

  strapi.log.info(`[${PLUGIN_ID}] registered custom field plugin::${PLUGIN_ID}.layout`);
};

export default register;
