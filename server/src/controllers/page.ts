import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin('content-hub-puck').service('page');

  return {
    /**
     * The only route left.
     *
     * `find`, `findOne`, `create`, `update` and `delete` went with the plugin's own admin
     * pages: the Content Manager edits Pages through its generic endpoints, so those
     * handlers had no caller and their routes carried no policies.
     */
    async bySlug(ctx): Promise<void> {
      const page = await service().findBySlug(ctx.params.slug);
      if (!page) return ctx.notFound('Page not found');
      ctx.body = { data: page };
    },
  };
};

export default controller;
