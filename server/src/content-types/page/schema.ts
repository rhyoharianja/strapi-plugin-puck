/**
 * A visually composed page.
 *
 * `layout` holds Puck's `Data` document as JSON. It is deliberately opaque to Strapi: the
 * shape belongs to the project's own block config, and modelling it
 * as Strapi components would freeze it — adding a block would then need a schema migration
 * instead of a package release.
 */
export default {
  kind: 'collectionType',
  collectionName: 'puck_pages',
  info: {
    singularName: 'page',
    pluralName: 'pages',
    displayName: 'Page (Puck)',
    description: 'A page composed in the visual editor',
  },
  options: { draftAndPublish: false },
  pluginOptions: {
    /*
     * Visible again: `layout` is now the plugin's own custom field, so the Content Manager
     * renders the visual editor and a live preview rather than a wall of raw JSON. This
     * content-type is simply the one that ships with the plugin — nothing about the editor
     * is special to it.
     */
    'content-manager': { visible: true },
    'content-type-builder': { visible: false },
  },
  attributes: {
    title: { type: 'string', required: true, maxLength: 200 },
    slug: { type: 'uid', targetField: 'title', required: true },
    description: { type: 'text' },
    /** Kept out of Strapi's own draft/published so the editor controls visibility directly. */
    published: { type: 'boolean', default: false },
    layout: {
      type: 'customField',
      customField: 'plugin::puck.layout',
      default: { content: [], root: { props: {} } },
    },
  },
};
