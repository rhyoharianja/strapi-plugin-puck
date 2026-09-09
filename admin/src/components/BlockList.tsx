import { useState } from "react";
import { Badge, Box, Flex, IconButton, Typography } from "@strapi/design-system";
import { Drag, Trash } from "@strapi/icons";
import { blockLabel } from "../blocks/registry";
import type { Data } from "@measured/puck";

/**
 * A one-line summary of a block, so two Heroes are distinguishable.
 *
 * Picks the first meaningful text prop rather than trying to describe every block type —
 * this plugin does not know the projects' block names, and a rule per block would have to be
 * updated whenever the project adds one.
 */
const summaryOf = (props: Record<string, unknown>): string => {
  for (const key of ["title", "heading", "text", "label", "alt", "caption"]) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const items = props.cards ?? props.buttons;
  if (Array.isArray(items)) return `${items.length} item${items.length === 1 ? "" : "s"}`;

  return "";
};

/**
 * The layout as a reorderable list of block names.
 *
 * Deliberately **not** a rendered preview. Inside an edit form the useful question is
 * "which blocks are on this page, in what order" — a scaled-down rendering answers that
 * badly, takes over the form, and invites people to try editing it in place. Ordering is
 * the one structural change worth making without opening the full canvas, so it is the one
 * thing this list supports.
 *
 * Native HTML drag-and-drop, so no drag library is pulled into the admin bundle for a list
 * that is rarely longer than a dozen rows.
 */
const BlockList = ({
  layout,
  disabled,
  onChange,
}: {
  layout: Data;
  disabled?: boolean;
  onChange: (next: Data) => void;
}) => {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to) return;

    const content = [...layout.content];
    const [moved] = content.splice(from, 1);
    content.splice(to, 0, moved!);

    onChange({ ...layout, content });
  };

  const remove = (index: number) => {
    onChange({ ...layout, content: layout.content.filter((_, i) => i !== index) });
  };

  if (layout.content.length === 0) {
    return (
      <Box padding={4} background="neutral100" hasRadius>
        <Typography variant="pi" textColor="neutral600">
          No blocks yet. Open the visual editor to compose this layout.
        </Typography>
      </Box>
    );
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      {layout.content.map((block, index) => {
        const summary = summaryOf((block.props ?? {}) as Record<string, unknown>);
        const isOver = over === index && dragging !== null && dragging !== index;

        return (
          <Flex
            key={`${block.props?.id ?? index}`}
            draggable={!disabled}
            onDragStart={() => setDragging(index)}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
            onDragOver={(event: React.DragEvent) => {
              event.preventDefault();
              setOver(index);
            }}
            onDrop={(event: React.DragEvent) => {
              event.preventDefault();
              if (dragging !== null) move(dragging, index);
              setDragging(null);
              setOver(null);
            }}
            alignItems="center"
            gap={2}
            padding={2}
            background={dragging === index ? "neutral150" : "neutral0"}
            hasRadius
            style={{
              border: "1px solid var(--neutral200, #dcdce4)",
              // A line on the edge being dropped onto, rather than moving rows around —
              // shifting rows under the pointer makes the target hard to hit.
              borderTopColor: isOver ? "var(--primary600, #4945ff)" : undefined,
              borderTopWidth: isOver ? 2 : 1,
              cursor: disabled ? "default" : "grab",
              opacity: dragging === index ? 0.6 : 1,
            }}
          >
            <Box style={{ color: "var(--neutral500, #8e8ea9)", display: "flex" }}>
              <Drag />
            </Box>

            <Typography variant="pi" textColor="neutral500" style={{ width: 20 }}>
              {index + 1}
            </Typography>

            <Badge>{blockLabel(block.type as string)}</Badge>

            <Box grow={1} style={{ minWidth: 0 }}>
              <Typography
                variant="pi"
                textColor="neutral600"
                ellipsis
                title={summary || undefined}
              >
                {summary}
              </Typography>
            </Box>

            <IconButton
              label={`Remove ${blockLabel(block.type as string)}`}
              variant="danger-light"
              disabled={disabled}
              onClick={() => remove(index)}
            >
              <Trash />
            </IconButton>
          </Flex>
        );
      })}
    </Flex>
  );
};

export { BlockList };
