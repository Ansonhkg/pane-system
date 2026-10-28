# Pane System API

The framework uses source from the local VS Code checkout at revision `ef01428f91d9b036beba1c6c1712771aec77e181`.
The upstream archive contains 1,174 source files with SHA-256 manifests.
The build checks each hash before compilation.

| Package                          | Public function                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `@pane-system/layout`            | VS Code grid, splits, sashes, sizes, visibility, and layout serialization          |
| `@pane-system/tabs`              | VS Code editor group model, tabs, preview, pinning, sticky tabs, and drag movement |
| `@pane-system/workbench`         | Pane extensions, layout storage, context, commands, and keybindings                |
| `@pane-system/contracts`         | Content, file, Git, terminal, storage, and operation interfaces                    |
| `@pane-system/explorer`          | VS Code virtual folder tree and file actions                                       |
| `@pane-system/editor`            | VS Code text editor, diff editor, document leases, and save                        |
| `@pane-system/syntax`            | Monarch language registrations                                                     |
| `@pane-system/language-services` | Separate TypeScript worker for diagnostics, completion, and hover                  |
| `@pane-system/source-control`    | Git changes, stage, unstage, commit, publish, and diff selection                   |
| `@pane-system/terminal`          | xterm view and terminal provider interface                                         |
| `@pane-system/output`            | Bounded output and editor diagnostics                                              |
| `@pane-system/host`              | Bun file, Git, PTY, HTTP, WebSocket, and operation adapters                        |
| `@pane-system/upstream`          | Original source, notices, and compiled native primitives                           |

## Create a custom pane

```ts
import { createWorkbench } from "@pane-system/workbench";
import "@pane-system/upstream/layout.css";
import "@pane-system/tabs/styles.css";
import "@pane-system/workbench/styles.css";

const container = document.querySelector<HTMLElement>("#workspace")!;
const workbench = createWorkbench({ container });
workbench.register({
  id: "input",
  title: "Input",
  create() {
    const element = document.createElement("textarea");
    return {
      element,
      dispose() {
        element.remove();
      },
    };
  },
});
await workbench.restore();
await workbench.open("input");
const other = workbench.split();
await workbench.open("input", undefined, other);
```

The container must have a width and a height.
Call `workbench.dispose()` when the host application closes.
The layout demo has no editor dependency.
Applications can supply their own implementations of the provider interfaces.

## Local commands

Run these commands in the framework root.

```sh
bun install --frozen-lockfile
bun run build
bun run start --workspace .
bun run typecheck
bun run lint
bun run doctor
bun run pack
bun run benchmark
```

The full demo uses `http://127.0.0.1:4318/`.
The layout demo uses `http://127.0.0.1:4318/layout`.
The default host uses a generated sample workspace.
Use `--workspace` or **Select folder** to load another folder.
The demo keeps layouts and drafts in browser storage for each folder.
The host writes its operation ledger to `.scode/local/host.sqlite`.
The selected folder remains active until the host stops.

`bun run pack` creates 13 package archives in `dist/packages`.
They contain ESM, declarations, CSS, licenses, and required native bundles.
When installing the local archives with Bun offline, map each package name to its archive in both `dependencies` and `overrides`.
Each package has version `0.1.0`.

## Limits

The browser workbench is an extracted framework with separate feature adapters.
It does not include the VS Code extension host, marketplace, debugger, or every language server.
The reference demo uses its own frame and pane toolbars around the extracted controls.
The TypeScript worker loads separately.
Speed measurements describe the measured host and workload; they do not establish a speed advantage over VS Code.

## Definition navigation

The TypeScript and JavaScript provider supports Command-click and F12 through VS Code's native definition navigation.
It loads relative imports and local workspace package exports through `FilePort`.
Use `registerEditorNavigation({ open })` to connect destination resources to the host's panes.
Pass `files` and `resolveModel` into `createLanguageServices` to retain shared models and unsaved drafts during navigation.
The local workspace resolver does not replace a complete language server for other languages or external package installations.

## Native toolbar components

`createActionBar(container, actions)` uses the original VS Code `ActionBar`, `Action`, icon registry, and icon stylesheet.
Import `@pane-system/upstream/chrome.css` when consuming it without the tab stylesheet.
Each action supplies `id`, `title`, a Codicon name, and `run`.
The returned handle supports `update(id, state)` and `dispose()`.
The host controls theme values through VS Code's CSS variables.
Keep native widget content boxes intact; do not apply a universal `border-box` rule to the embedded widgets.

## Native drag feedback

Tab movement uses VS Code's `DragAndDropObserver` and `applyDragImage`.
The build extracts the three `DropOverlay` geometry methods from the verified source archive.
The native overlay stylesheet supplies half-pane split previews, full-pane merge previews, and motion transitions.
Tab insertion uses the pointer's position relative to the tab midpoint.
The hover activation delay uses VS Code's `DRAG_OVER_OPEN_TAB_THRESHOLD` value of 1,500 milliseconds.
On macOS, hold Option to copy a tab and Shift to disable splitting.
On other systems, hold Control to copy a tab and Alt to disable splitting.
The framework supplies pane actions around these native primitives; it does not load the full VS Code workbench service graph.

## Shared view headings

`createViewHeading` uses the native VS Code ActionBar for every view heading.
Pass a title, actions, an action label, and optional leading or trailing elements.
Files and Source Control use this component in the demo.
Import `@pane-system/layout/styles.css` when using the component without the tab stylesheet.
Set `--pane-view-heading-height`, `--pane-view-heading-padding`, and `--pane-view-icon-size` to customize a view.
The default heading is 28 pixels high, with 8 pixels of padding and 22-pixel action controls.

## Pane zoom

Each pane has a separate content zoom value.
Use `pane.setZoom(1.2)` to set 120 percent, or read `pane.zoom`.
The pane toolbar has a zoom menu with a range from 50 to 200 percent.
Command or Control with plus, minus, or zero changes the focused pane's zoom.
The tab strip stays at the host scale.
The serialized pane state stores the zoom value.
A new split uses its source pane's zoom value.

## Color theme

`createThemeController({ element, storage })` owns the shared palette and its saved settings.
`createThemeEditor(controller)` provides presets, custom colors, live preview, Apply, Cancel, and Reset colors.
Cancel and Escape restore the last applied theme.
The editor accepts opaque hex colors, color names, rgb values, and hsl values.
The demo's theme button opens this editor.
The demo connects palette changes to the native code editor and terminal.
Applications can use the controller's `changed` callback or `subscribe` method for custom content.
