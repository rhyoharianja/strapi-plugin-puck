/** Contract shared by this plugin's server and admin bundles. */

export const PLUGIN_ID = 'content-hub-puck' as const;

export const UID = {
  page: 'plugin::content-hub-puck.page',
} as const;

export interface PageDTO {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
  /** Puck `Data`: validated with `toLayout` from this plugin's own `shared/layout`. */
  layout: unknown;
  updatedAt: string | null;
}

export interface PageSummaryDTO {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  published: boolean;
  blockCount: number;
  updatedAt: string | null;
}
