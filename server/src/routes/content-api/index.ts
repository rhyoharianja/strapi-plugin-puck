/**
 * Public read for front ends. Unauthenticated because a composed page is published
 * content; the service only ever returns pages whose `published` flag is set.
 */
export default () => ({
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/pages/:slug',
      handler: 'page.bySlug',
      config: { auth: false, policies: [] },
    },
  ],
});
