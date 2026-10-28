import {
  createThemeController,
  createThemeEditor,
  type Workbench,
} from "@pane-system/workbench";
import type { StoragePort } from "@pane-system/contracts";
export function createAppearance(
  workbench: Workbench,
  storage: StoragePort,
  previousKey: string,
  setEditorTheme?: typeof import("@pane-system/editor").setEditorTheme,
) {
  const controller = createThemeController({
    element: document.body,
    storage,
    initial: {
      mode: storage.read(previousKey) === "light" ? "light" : "dark",
      colors: {},
    },
    changed(settings, palette) {
      setEditorTheme?.(settings.mode, {
        background: palette.editor,
        foreground: palette.text,
        selection: palette.accent,
      });
    },
  });
  const editor = createThemeEditor(controller);
  const commands = [
    workbench.commands.register({
      id: "appearance.show",
      title: "Color theme settings",
      run: () => editor.show(),
    }),
    workbench.commands.register({
      id: "pane.zoomIn",
      title: "Zoom in active pane",
      shortcut: "Command +",
      run: () => workbench.active.setZoom(workbench.active.zoom + 0.1),
    }),
    workbench.commands.register({
      id: "pane.zoomOut",
      title: "Zoom out active pane",
      shortcut: "Command -",
      run: () => workbench.active.setZoom(workbench.active.zoom - 0.1),
    }),
    workbench.commands.register({
      id: "pane.zoomReset",
      title: "Reset active pane zoom",
      shortcut: "Command 0",
      run: () => workbench.active.setZoom(1),
    }),
  ];
  return {
    refresh: () => controller.preview(controller.get()),
    show: () => editor.show(),
    dispose() {
      commands.forEach((c) => c.dispose());
      editor.dispose();
      controller.dispose();
    },
  };
}
