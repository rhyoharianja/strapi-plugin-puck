import { useState, type ReactNode } from "react";
import { Puck, usePuck, type Data } from "@measured/puck";
import { toLayout } from "../../../shared/layout";
import { configWithAssetFields, hasPuckBlocks } from "../blocks/registry";

import { assetField } from "./AssetField";
import { Button, Flex, Tooltip, Typography } from "@strapi/design-system";
import { ArrowClockwise, Check, GridFour, ListPlus } from "@strapi/icons";

import "@measured/puck/puck.css";

/**
 * A custom Puck interface.
 *
 * Puck's stock layout stacks the block palette and the outline down one long left column,
 * so on anything but a tall screen you scroll past the palette to reach the outline. Puck
 * exposes its panels individually (`Puck.Components`, `Puck.Outline`, `Puck.Fields`,
 * `Puck.Preview`), so they are recomposed here into an icon rail: one panel at a time,
 * switched from a fixed 48px strip that never scrolls away.
 *
 * The chrome is drawn with Strapi's own Design System so the editor reads as part of the
 * admin panel rather than an embedded third-party app.
 */

/**
 * Puck's own root element carries no height — its stylesheet only sets a font and
 * `overflow-x`. Anything inside it asking for `height: 100%` therefore resolves against an
 * auto-height parent and collapses, which is why the canvas can render with no height at
 * all. This makes that root a flex child of the shell so the chain reaches the panels.
 */
const SHELL_CLASS = "ch-puck-shell";

const SHELL_CSS = `
.${SHELL_CLASS} {
  display: flex;
  flex-direction: column;
  min-height: 0;
  /*
   * Puck gives its palette and outline items a colour only on :hover — the default state
   * has no colour rule at all, so the label inherits from the host page. Puck's own demo
   * happens to inherit something dark; embedded here, and portalled to document.body
   * outside Strapi's themed subtree, it does not, and every block label renders invisible
   * until hovered. So the inherited colour is stated explicitly rather than left to chance.
   */
  color: var(--puck-color-grey-02, #2a2a2a);
}
.${SHELL_CLASS} > *:not(style) { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
`;

const RAIL_WIDTH = 48;
const PANEL_WIDTH = 268;
const FIELDS_WIDTH = 300;

type Panel = "blocks" | "outline";

const PANELS: Array<{ id: Panel; label: string; Icon: typeof GridFour }> = [
  { id: "blocks", label: "Blocks", Icon: GridFour },
  { id: "outline", label: "Outline", Icon: ListPlus },
];

const surface = {
  background: "var(--neutral0, #ffffff)",
  border: "1px solid var(--neutral150, #eaeaef)",
};

/** Section heading shared by both side panels. */
const PanelHeading = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      padding: "12px 16px",
      borderBottom: "1px solid var(--neutral150, #eaeaef)",
      background: "var(--neutral100, #f6f6f9)",
    }}
  >
    <Typography variant="sigma" textColor="neutral600">
      {children}
    </Typography>
  </div>
);

/**
 * Toolbar actions.
 *
 * Lives inside `<Puck>` so it can reach the editor store: undo/redo come from Puck's own
 * history, and Save reads the current document straight out of `appState`.
 */
const Toolbar = ({
  title,
  path,
  onSave,
  saving,
  savedAt,
}: {
  title?: string;
  path?: string;
  onSave: (data: Data) => void;
  saving?: boolean;
  savedAt?: string | null;
}) => {
  const { appState, history } = usePuck();

  return (
    <Flex
      justifyContent="space-between"
      alignItems="center"
      style={{
        ...surface,
        borderWidth: "0 0 1px",
        padding: "8px 12px",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <Flex direction="column" alignItems="flex-start">
        <Typography variant="omega" fontWeight="bold">
          {title ?? "Layout"}
        </Typography>
        {path ? (
          <Typography variant="pi" textColor="neutral500">
            {path}
          </Typography>
        ) : null}
      </Flex>

      <Flex gap={2} alignItems="center">
        {savedAt ? (
          <Typography variant="pi" textColor="neutral500">
            saved {savedAt}
          </Typography>
        ) : null}

        <Tooltip label="Undo">
          <Button
            variant="tertiary"
            size="S"
            disabled={!history.hasPast}
            onClick={history.back}
            startIcon={<ArrowClockwise style={{ transform: "scaleX(-1)" }} />}
          >
            Undo
          </Button>
        </Tooltip>

        <Tooltip label="Redo">
          <Button
            variant="tertiary"
            size="S"
            disabled={!history.hasFuture}
            onClick={history.forward}
            startIcon={<ArrowClockwise />}
          >
            Redo
          </Button>
        </Tooltip>

        <Button
          size="S"
          startIcon={<Check />}
          loading={saving}
          onClick={() => onSave(appState.data as Data)}
        >
          Save layout
        </Button>
      </Flex>
    </Flex>
  );
};

/**
 * The registered config with its image fields swapped for the Media Library picker.
 *
 * Built at module scope, not per render: the swap clones every component definition, and
 * handing Puck a new `config` object on each render would remount its field editors.
 *
 * The project's own `config` object is left untouched — its public renderer imports the same
 * object and must not pull the admin's picker, or Strapi's admin bundle would end up in the
 * site.
 */
const editorConfig = configWithAssetFields(assetField);

const PuckEditor = ({
  value,
  onSave,
  title,
  path,
  height = "100%",
  saving,
  savedAt,
}: {
  value: unknown;
  onSave: (data: Data) => void;
  title?: string;
  path?: string;
  height?: string;
  saving?: boolean;
  savedAt?: string | null;
}) => {
  const [panel, setPanel] = useState<Panel>("blocks");

  return (
    <div
      className={SHELL_CLASS}
      style={{ height, background: "var(--neutral100, #f6f6f9)" }}
    >
      <style>{SHELL_CSS}</style>

      <Puck
        config={editorConfig}
        // A layout is user data that has round-tripped through JSON, so it is coerced
        // rather than trusted — a malformed one would otherwise take the edit view down.
        data={toLayout(value)}
        onPublish={onSave}
        iframe={{ enabled: false }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <Toolbar
            title={title}
            path={path}
            onSave={onSave}
            saving={saving}
            savedAt={savedAt}
          />

          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* Icon rail — fixed, so switching panels never costs a scroll. */}
            <nav
              style={{
                width: RAIL_WIDTH,
                flexShrink: 0,
                ...surface,
                borderWidth: "0 1px 0 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                paddingTop: 8,
              }}
            >
              {PANELS.map(({ id, label, Icon }) => {
                const active = panel === id;

                return (
                  <Tooltip key={id} label={label} side="right">
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={active}
                      onClick={() => setPanel(id)}
                      style={{
                        width: 36,
                        height: 36,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        background: active ? "var(--primary100, #f0f0ff)" : "transparent",
                        color: active
                          ? "var(--primary600, #4945ff)"
                          : "var(--neutral500, #8e8ea9)",
                      }}
                    >
                      <Icon width={18} height={18} />
                    </button>
                  </Tooltip>
                );
              })}
            </nav>

            {/* One panel at a time. Both stay mounted so Puck keeps their internal state. */}
            <aside
              style={{
                width: PANEL_WIDTH,
                flexShrink: 0,
                ...surface,
                borderWidth: "0 1px 0 0",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <PanelHeading>{panel === "blocks" ? "Blocks" : "Outline"}</PanelHeading>
              <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
                <div hidden={panel !== "blocks"}>
                  <Puck.Components />
                </div>
                <div hidden={panel !== "outline"}>
                  <Puck.Outline />
                </div>
              </div>
            </aside>

            {/* Canvas */}
            <main style={{ flex: 1, minWidth: 0, overflow: "auto", padding: 16 }}>
              <div
                style={{
                  ...surface,
                  borderRadius: 8,
                  minHeight: "100%",
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(33,33,52,0.08)",
                }}
              >
                <Puck.Preview />
              </div>
            </main>

            {/* Properties of the selected block */}
            <aside
              style={{
                width: FIELDS_WIDTH,
                flexShrink: 0,
                ...surface,
                borderWidth: "0 0 0 1px",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <PanelHeading>Properties</PanelHeading>
              <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
                <Puck.Fields />
              </div>
            </aside>
          </div>
        </div>
      </Puck>
    </div>
  );
};

export { PuckEditor };
