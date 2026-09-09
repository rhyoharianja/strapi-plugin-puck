import * as React from "react";
import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { Trash } from "@strapi/icons";
import { useStrapiApp } from "@strapi/strapi/admin";
import type { CustomField } from "@measured/puck";
import { imageUrlOf, type ImageRef } from "../../../shared/layout";

/**
 * A Puck field that picks from Strapi's Media Library.
 *
 * It replaces the URL text boxes the image blocks used to have. Those worked, but what they
 * stored was a bare string: nothing tied the layout to the file it drew, so an asset deleted
 * from the library left a dead URL inside the layout JSON with nothing to trace it back to.
 *
 * The dialog is **Strapi's own**, not a rebuild. The upload plugin registers it through the
 * public `addComponents` API under the name `media-library`, which is how the Content
 * Manager's media input opens it too — so search, folders, upload and permissions all behave
 * exactly as they do everywhere else in the panel.
 *
 * What this does and does not fix, stated plainly: the stored reference now carries the
 * asset's `id` alongside its `url`, so a broken image can be found and re-resolved. It is
 * still a JSON column and not a relation, so Strapi will not *stop* the file being deleted.
 * Preventing that needs a dynamic zone, and a dynamic zone cannot be a custom field — the
 * canvas and referential integrity are mutually exclusive here.
 */

/** The asset shape the media-library dialog hands back. */
interface Asset {
  id: number;
  url: string;
  name?: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
  mime?: string;
}

const THUMB = 48;

const AssetFieldInput = ({
  value,
  onChange,
  readOnly,
}: {
  value?: ImageRef;
  onChange: (next: ImageRef | undefined) => void;
  readOnly?: boolean;
}) => {
  const components = useStrapiApp("PuckAssetField", (state) => state.components, true) as Record<
    string,
    React.ComponentType<{
      onClose: () => void;
      onSelectAssets: (assets: Asset[]) => void;
      allowedTypes?: string[];
      multiple?: boolean;
    }>
  >;

  const [open, setOpen] = React.useState(false);

  const MediaLibraryDialog = components?.["media-library"];
  const url = imageUrlOf(value);

  /*
   * A layout saved before the picker existed holds a plain string. It still renders, and it
   * is worth saying so in the UI rather than showing it as if it were a picked asset —
   * otherwise there is no way to tell which images are traceable and which are not.
   */
  const isLegacyUrl = typeof value === "string" && value.trim() !== "";

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Flex gap={3} alignItems="center">
        <Box
          hasRadius
          background="neutral100"
          borderColor="neutral200"
          borderStyle="solid"
          borderWidth="1px"
          style={{
            width: THUMB,
            height: THUMB,
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {url ? (
            <img
              src={url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Typography variant="pi" textColor="neutral500">
              —
            </Typography>
          )}
        </Box>

        <Flex direction="column" alignItems="flex-start" gap={1} style={{ minWidth: 0, flex: 1 }}>
          <Button
            size="S"
            variant="secondary"
            disabled={readOnly || !MediaLibraryDialog}
            onClick={() => setOpen(true)}
          >
            {url ? "Replace" : "Choose asset"}
          </Button>
          {url ? (
            <Typography variant="pi" textColor="neutral600" ellipsis>
              {isLegacyUrl ? `URL only: ${url}` : url}
            </Typography>
          ) : null}
        </Flex>

        {url && !readOnly ? (
          <Button
            size="S"
            variant="danger-light"
            startIcon={<Trash />}
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
        ) : null}
      </Flex>

      {isLegacyUrl ? (
        <Typography variant="pi" textColor="warning600">
          Saved as a plain URL, so it is not linked to a library file. Choose the asset again
          to make it traceable.
        </Typography>
      ) : null}

      {!MediaLibraryDialog ? (
        <Typography variant="pi" textColor="danger600">
          The Media Library plugin is not available, so no asset can be chosen here.
        </Typography>
      ) : null}

      {open && MediaLibraryDialog ? (
        <MediaLibraryDialog
          allowedTypes={["images"]}
          multiple={false}
          onClose={() => setOpen(false)}
          onSelectAssets={(assets) => {
            const asset = assets[0];

            if (asset) {
              onChange({
                id: asset.id,
                url: asset.url,
                // Kept so a renderer has alt text even when the block's own field is empty.
                alt: asset.alternativeText ?? undefined,
                width: asset.width ?? undefined,
                height: asset.height ?? undefined,
              });
            }

            setOpen(false);
          }}
        />
      ) : null}
    </Flex>
  );
};

/** The field definition handed to `withAssetFields`. */
export const assetField: CustomField<ImageRef | undefined> = {
  type: "custom",
  label: "Image",
  render: ({ value, onChange, readOnly }) => (
    <AssetFieldInput value={value} onChange={onChange} readOnly={readOnly} />
  ),
};
