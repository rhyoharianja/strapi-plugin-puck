import type { Core } from '@strapi/strapi';

import { UID, type PageDTO, type PageSummaryDTO } from '../../../shared/puck';
import { documents, type DocumentRow } from '../utils/documents';

const EMPTY_LAYOUT = { content: [], root: { props: {} } };

const toPageDTO = (row: DocumentRow): PageDTO => ({
  id: row.id,
  documentId: row.documentId,
  title: row.title,
  slug: row.slug,
  description: row.description ?? null,
  published: row.published ?? false,
  layout: row.layout ?? EMPTY_LAYOUT,
  updatedAt: row.updatedAt ?? null,
});

/**
 * Turn a title into a URL slug.
 *
 * Strapi's `uid` field only auto-generates inside the Content Manager UI, not through the
 * Document Service, so a plugin that creates pages through its own API has to do it here —
 * otherwise every caller would have to slugify, and they would each do it differently.
 */
const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'page';

/** How many blocks a layout holds — the only thing the list view needs to read out of it. */
const blockCount = (layout: unknown): number => {
  const content = (layout as { content?: unknown[] } | null)?.content;
  return Array.isArray(content) ? content.length : 0;
};

const page = ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(): Promise<PageSummaryDTO[]> {
    const rows = await documents(strapi, UID.page).findMany({ sort: { updatedAt: 'desc' } });

    // The list never ships whole layouts: a page with a hundred blocks would make the
    // index payload large for information nobody reads there.
    return rows.map((row) => ({
      id: row.id,
      documentId: row.documentId,
      title: row.title,
      slug: row.slug,
      published: row.published ?? false,
      blockCount: blockCount(row.layout),
      updatedAt: row.updatedAt ?? null,
    }));
  },

  async findOne(documentId: string): Promise<PageDTO | null> {
    const rows = await documents(strapi, UID.page).findMany({ filters: { documentId } });
    return rows[0] ? toPageDTO(rows[0]) : null;
  },

  /** Public lookup used by the renderer. Only published pages are ever returned. */
  async findBySlug(slug: string): Promise<PageDTO | null> {
    const row = await documents(strapi, UID.page).findFirst({
      filters: { slug, published: true },
    });
    return row ? toPageDTO(row) : null;
  },

  /** A slug that is not already taken, suffixing `-2`, `-3`, … as needed. */
  async uniqueSlug(base: string): Promise<string> {
    const root = slugify(base);
    const taken = new Set(
      (await documents(strapi, UID.page).findMany({ fields: ['slug'] })).map((row) => row.slug)
    );

    if (!taken.has(root)) return root;

    let suffix = 2;
    while (taken.has(`${root}-${suffix}`)) suffix += 1;
    return `${root}-${suffix}`;
  },

  async create(data: { title: string; slug?: string; description?: string }): Promise<PageDTO> {
    const created = await documents(strapi, UID.page).create({
      data: {
        title: data.title,
        slug: await this.uniqueSlug(data.slug || data.title),
        description: data.description ?? null,
        published: false,
        layout: EMPTY_LAYOUT,
      },
    });

    return toPageDTO(created);
  },

  async update(
    documentId: string,
    data: { title?: string; slug?: string; description?: string; published?: boolean; layout?: unknown }
  ): Promise<PageDTO> {
    const updated = await documents(strapi, UID.page).update({
      documentId,
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.published !== undefined ? { published: data.published } : {}),
        ...(data.layout !== undefined ? { layout: data.layout } : {}),
      },
    });

    return toPageDTO(updated);
  },

  async delete(documentId: string): Promise<void> {
    await documents(strapi, UID.page).delete({ documentId });
  },
});

export default page;
