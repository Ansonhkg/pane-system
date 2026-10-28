import { createActionBar, type ToolbarAction } from "./toolbar";
export interface ViewHeadingOptions {
  title: string;
  actions: ToolbarAction[];
  label?: string;
  className?: string;
  leading?: HTMLElement;
  trailing?: HTMLElement;
}
export function createViewHeading(options: ViewHeadingOptions) {
  const element = document.createElement("div");
  element.className = "pane-view-heading " + (options.className ?? "");
  const title = document.createElement("h2");
  title.className = "pane-view-title";
  title.textContent = options.title;
  title.title = options.title;
  const controls = document.createElement("div");
  controls.className = "pane-view-actions";
  const toolbar = createActionBar(
    controls,
    options.actions,
    options.label ?? options.title + " actions",
  );
  if (options.leading) element.append(options.leading);
  element.append(title, controls);
  if (options.trailing) element.append(options.trailing);
  return {
    element,
    titleElement: title,
    update: toolbar.update,
    setTitle(value: string) {
      title.textContent = value;
      title.title = value;
    },
    dispose() {
      toolbar.dispose();
      element.remove();
    },
  };
}
