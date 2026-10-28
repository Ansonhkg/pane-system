import {
  ActionBar,
  Action,
  ThemeIcon,
  getIconsStyleSheet,
} from "@pane-system/upstream/chrome";
export interface ToolbarAction {
  id: string;
  title: string;
  icon: string;
  enabled?: boolean;
  checked?: boolean;
  run(): unknown | Promise<unknown>;
}
const styles = new WeakMap<Document, { references: number; dispose(): void }>();
function installIcons(document: Document) {
  let entry = styles.get(document);
  if (!entry) {
    const sheet = getIconsStyleSheet(undefined);
    const node = document.createElement("style");
    node.dataset.paneNativeIcons = "true";
    const update = () => {
      node.textContent = sheet.getCSS();
    };
    const changed = sheet.onDidChange(update);
    update();
    document.head.append(node);
    entry = {
      references: 0,
      dispose() {
        changed.dispose();
        sheet.dispose();
        node.remove();
      },
    };
    styles.set(document, entry);
  }
  const active = entry;
  active.references++;
  return () => {
    if (--active.references === 0) {
      active.dispose();
      styles.delete(document);
    }
  };
}
export function createActionBar(
  container: HTMLElement,
  items: ToolbarAction[],
  label = "Pane actions",
) {
  const releaseIcons = installIcons(container.ownerDocument);
  const bar = new ActionBar(container, {
    ariaLabel: label,
    highlightToggledItems: true,
  });
  const actions = items.map((item) => {
    const action = new Action(
      item.id,
      item.title,
      ThemeIcon.asClassName({ id: item.icon }),
      item.enabled ?? true,
      async () => item.run(),
    );
    action.tooltip = item.title;
    action.checked = item.checked;
    return action;
  });
  bar.push(actions, { icon: true, label: false });
  return {
    element: bar.domNode,
    update(
      id: string,
      state: { enabled?: boolean; checked?: boolean; title?: string },
    ) {
      const action = actions.find((a) => a.id === id);
      if (!action) return;
      if (state.enabled !== undefined) action.enabled = state.enabled;
      if (state.checked !== undefined) action.checked = state.checked;
      if (state.title !== undefined) {
        action.label = state.title;
        action.tooltip = state.title;
      }
    },
    dispose() {
      bar.dispose();
      actions.forEach((a) => a.dispose());
      releaseIcons();
    },
  };
}
