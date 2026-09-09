import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Button, Field, Flex, Typography } from "@strapi/design-system";
import { Cross, Pencil } from "@strapi/icons";
import { useField } from "@strapi/strapi/admin";
import { toLayout } from "../../../shared/layout";
import type { Data } from "@measured/puck";

import { BlockList } from "./BlockList";
import { PuckEditor } from "./PuckEditor";

interface LayoutFieldProps {
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  /**
   * The Content Manager spreads `useField(name)` onto a custom field's Input, so `value`,
   * `onChange` and `error` arrive as props. They are preferred over calling `useField`
   * again: if the form path ever differs from the bare attribute name, the hook returns
   * nothing and an entry with blocks opens to an empty canvas.
   */
  value?: unknown;
  onChange?: (eventOrPath: string, value?: unknown) => void;
  error?: string;
}

/**
 * Full-screen editor overlay.
 *
 * Deliberately NOT Strapi's `Modal`. That is a Radix dialog: it traps focus and marks
 * everything outside it `aria-hidden` with `pointer-events: none`, which breaks Puck's
 * drag-and-drop — dnd-kit renders its drag preview in a portal on `document.body`, exactly
 * the region the dialog disables. Its body is also a scroll container, so Puck's
 * `height: 100%` chain collapses and the canvas renders with no height.
 *
 * A plain fixed overlay portalled to `body` reproduces the standalone editor page's
 * environment exactly, which is the environment Puck is built for.
 */
const EditorOverlay = ({
  title,
  value,
  onSave,
  onClose,
}: {
  title: string;
  value: unknown;
  onSave: (data: Data) => void;
  onClose: () => void;
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    // The overlay covers the whole viewport, so the page behind it must not scroll.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        background: "var(--neutral100, #f6f6f9)",
      }}
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        style={{
          flexShrink: 0,
          padding: "8px 12px",
          background: "var(--neutral0, #ffffff)",
          borderBottom: "1px solid var(--neutral150, #eaeaef)",
        }}
      >
        <Typography variant="omega" fontWeight="bold">
          {title}
        </Typography>
        <Button variant="tertiary" size="S" startIcon={<Cross />} onClick={onClose}>
          Close
        </Button>
      </Flex>

      <div style={{ flex: 1, minHeight: 0 }}>
        <PuckEditor
          value={value}
          onSave={onSave}
          title={title}
          path="Saved with the entry"
        />
      </div>
    </div>,
    document.body
  );
};

/**
 * Custom field: a visual layout on ANY content-type.
 *
 * Add it in the Content-Type Builder (or as `"type": "customField"` in a schema) and the
 * field turns into a Puck canvas — an Article, a landing page, a campaign, anything. That
 * is the point: composing blocks is a capability, not a content-type, and tying it to one
 * would mean re-modelling content just to lay it out visually.
 *
 * The closed state lists the blocks by name, in order, and lets them be reordered or
 * removed. Not a rendered preview: inside an edit form the useful question is *which* blocks
 * are on the page and in what order, and a shrunken rendering answers that badly while
 * taking over the form. The full canvas is one click away for everything else.
 */
const LayoutField = ({
  name,
  label,
  hint,
  required,
  disabled,
  value: valueProp,
  onChange: onChangeProp,
  error: errorProp,
}: LayoutFieldProps) => {
  // Kept as a fallback for hosts that render the Input without spreading the field.
  const field = useField<unknown>(name);
  const [open, setOpen] = useState(false);

  const value = valueProp !== undefined ? valueProp : field.value;
  const error = errorProp ?? field.error;

  const layout = toLayout(value);
  const blocks = layout.content.length;
  const heading = label ?? "Layout";

  const close = useCallback(() => setOpen(false), []);

  const save = useCallback(
    (data: Data) => {
      // Written into the form, not straight to the API: the layout must be saved by the
      // same Save button as the rest of the entry, or an editor could publish a layout
      // while the fields around it stay unsaved.
      (onChangeProp ?? field.onChange)(name, data as unknown);
      setOpen(false);
    },
    [onChangeProp, field, name]
  );

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
      <Field.Label>{heading}</Field.Label>

      <Box
        hasRadius
        borderColor="neutral200"
        background="neutral0"
        padding={3}
        style={{ borderWidth: 1, borderStyle: "solid" }}
      >
        <Flex justifyContent="space-between" alignItems="center" marginBottom={3}>
          <Typography variant="pi" textColor="neutral600">
            {blocks === 0
              ? "No blocks yet"
              : `${blocks} block${blocks === 1 ? "" : "s"} — drag to reorder`}
          </Typography>

          <Button
            variant="secondary"
            startIcon={<Pencil />}
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            {blocks === 0 ? "Compose visually" : "Edit visually"}
          </Button>
        </Flex>

        <BlockList
          layout={layout}
          disabled={disabled}
          onChange={(next) => (onChangeProp ?? field.onChange)(name, next as unknown)}
        />
      </Box>

      <Field.Hint />
      <Field.Error />

      {open ? (
        <EditorOverlay title={heading} value={value} onSave={save} onClose={close} />
      ) : null}
    </Field.Root>
  );
};

export { LayoutField };
export default LayoutField;
