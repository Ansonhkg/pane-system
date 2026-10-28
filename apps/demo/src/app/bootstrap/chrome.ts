import { createActionBar } from "@pane-system/layout";
import type { Workbench } from "@pane-system/workbench";
import { setIcon } from "@pane-system/contracts/icons";
export function applyChromeIcons() {
  for (const [id, name] of [
    ["commands", "search"],
    ["split-editor", "panel-toggle"],
    ["toggle-files", "navigation-toggle"],
    ["theme", "theme"],
    ["reset", "reload"],
  ] as const) {
    const button = document.getElementById(id);
    if (button) setIcon(button, name);
  }
  const navIcons = {
    explorer: "file",
    search: "search",
    "source-control": "branch",
    terminal: "terminal",
    context: "remote",
    input: "keyboard",
    output: "doc",
    connections: "settings",
  } as const;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-view]",
  )) {
    const name = button.dataset.view as keyof typeof navIcons;
    if (name in navIcons) setIcon(button, navIcons[name]);
  }
}

function nativeActions(container: HTMLElement) {
  const buttons = [
    ...container.querySelectorAll<HTMLButtonElement>("button"),
  ].filter((button) => !button.hidden);
  const names: Record<string, string> = {
    commands: "search",
    "toggle-files": "layout-sidebar-left",
    "split-editor": "split-horizontal",
    theme: "color-mode",
    reset: "refresh",
    explorer: "files",
    search: "search",
    "source-control": "source-control",
    terminal: "terminal",
    context: "remote",
    input: "keyboard",
    output: "output",
    connections: "settings-gear",
  };
  container.replaceChildren();
  const bar = createActionBar(
    container,
    buttons.map((button) => ({
      id: button.id || button.dataset.view || button.title,
      title: button.title || button.getAttribute("aria-label") || "Action",
      icon: names[button.id || button.dataset.view || ""] ?? "more",
      checked: button.dataset.view === "explorer" ? true : undefined,
      run: () => button.click(),
    })),
  );
  const labels = bar.element.querySelectorAll<HTMLElement>(".action-label");
  buttons.forEach((button, i) => {
    if (button.id) labels[i].id = button.id;
    if (button.dataset.view) labels[i].dataset.view = button.dataset.view;
  });
  return bar;
}
export function mountPaneNavigation(workbench: Workbench) {
  const windowActions = document.querySelector<HTMLElement>(".window-actions");
  if (windowActions) nativeActions(windowActions);
  const nav = document.getElementById("activity");
  const navigation = nav ? nativeActions(nav) : undefined;
  const activity = document.getElementById("activity");
  const files = [...workbench.panes.values()].find((p) =>
    p.tabs.some((t) => t.kind === "explorer"),
  );
  if (activity && files) files.header.prepend(activity);
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-view]",
  )) {
    button.dataset.active = String(button.dataset.view === "explorer");
  }
  const update = () => {
    const explorer = [...workbench.panes.values()].find((p) =>
      p.tabs.some((t) => t.kind === "explorer"),
    );
    if (activity && explorer && activity.parentElement !== explorer.header)
      explorer.header.prepend(activity);
    const currentView = explorer?.tabs.find(
      (tab) => tab.id === explorer.active,
    )?.kind;
    for (const kind of ["explorer", "search"])
      navigation?.update(kind, { checked: currentView === kind });
    const tab = workbench.active.tabs.find(
      (t) => t.id === workbench.active.active,
    );
    if (tab) {
      const title = document.getElementById("active-file");
      if (title) title.textContent = tab.title;
      document.title = tab.title + " — Pane System";
    }
  };
  workbench.context.onDidChange(update);
  update();
}
