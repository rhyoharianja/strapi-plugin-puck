import contentAPIRoutes from "./content-api";

/**
 * Only a public read route.
 *
 * The plugin had an admin CRUD surface for its own list page and editor route; both were
 * removed in favour of editing through the Content Manager, which uses its own generic
 * endpoints. Leaving unauthenticated-by-policy CRUD in place with no caller is a surface for
 * no benefit.
 */
const routes = {
  "content-api": contentAPIRoutes,
};

export default routes;
