import type { Core } from '@strapi/strapi';

import page from './page';

/** Annotated for declaration portability under pnpm (see docs/package-conventions.md). */
const services: Record<string, (context: { strapi: Core.Strapi }) => unknown> = {
  page,
};

export default services;
