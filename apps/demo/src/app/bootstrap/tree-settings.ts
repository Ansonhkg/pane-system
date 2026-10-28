import type { TreeSettings, TreeSettingsPort } from "@pane-system/contracts";
const defaults: TreeSettings = {
  openMode: "singleClick",
  multiSelectModifier: "default",
  expandMode: "singleClick",
  compactFolders: true,
  autoReveal: true,
};
const storageKey = "pane-tree-settings";
export function createTreeSettings(): TreeSettingsPort {
  let settings = { ...defaults };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (saved && typeof saved === "object") {
      const value = saved as Partial<TreeSettings>;
      if (value.openMode === "singleClick" || value.openMode === "doubleClick")
        settings.openMode = value.openMode;
      if (
        value.multiSelectModifier === "default" ||
        value.multiSelectModifier === "alt"
      )
        settings.multiSelectModifier = value.multiSelectModifier;
      if (
        value.expandMode === "singleClick" ||
        value.expandMode === "doubleClick"
      )
        settings.expandMode = value.expandMode;
      if (typeof value.compactFolders === "boolean")
        settings.compactFolders = value.compactFolders;
      if (typeof value.autoReveal === "boolean")
        settings.autoReveal = value.autoReveal;
    }
  } catch {
    /* Use defaults when saved settings cannot be read. */
  }
  const listeners = new Set<(settings: TreeSettings) => void>();
  return {
    get: () => ({ ...settings }),
    subscribe(listener) {
      listeners.add(listener);
      return {
        dispose: () => {
          listeners.delete(listener);
        },
      };
    },
    show() {
      const dialog = document.createElement("dialog");
      dialog.className = "pane-dialog tree-settings";
      dialog.setAttribute("aria-label", "Tree settings");
      const form = document.createElement("form");
      const heading = document.createElement("strong");
      heading.textContent = "Tree settings";
      form.append(heading);
      function choice<
        K extends "openMode" | "multiSelectModifier" | "expandMode",
      >(key: K, label: string, values: [string, TreeSettings[K]][]) {
        const field = document.createElement("label");
        field.textContent = label;
        const select = document.createElement("select");
        select.setAttribute("aria-label", label);
        for (const [title, value] of values) {
          const option = document.createElement("option");
          option.textContent = title;
          option.value = value;
          select.append(option);
        }
        select.value = settings[key];
        select.onchange = () => {
          settings = { ...settings, [key]: select.value };
        };
        field.append(select);
        form.append(field);
      }
      function toggle(key: "compactFolders" | "autoReveal", label: string) {
        const field = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = settings[key];
        input.onchange = () => {
          settings = { ...settings, [key]: input.checked };
        };
        field.append(document.createTextNode(label), input);
        form.append(field);
      }
      const previous = { ...settings };
      choice("openMode", "Open files", [
        ["Single click", "singleClick"],
        ["Double click", "doubleClick"],
      ]);
      choice("multiSelectModifier", "Multiple selection modifier", [
        ["Command or Control", "default"],
        ["Option or Alt", "alt"],
      ]);
      choice("expandMode", "Expand folders", [
        ["Single click", "singleClick"],
        ["Double click", "doubleClick"],
      ]);
      toggle("compactFolders", "Compact Source Control folders");
      toggle("autoReveal", "Reveal active file in Source Control");
      const actions = document.createElement("div");
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.onclick = () => dialog.close("cancel");
      const save = document.createElement("button");
      save.type = "submit";
      save.textContent = "Save";
      save.className = "primary";
      actions.append(cancel, save);
      form.append(actions);
      dialog.append(form);
      document.body.append(dialog);
      form.onsubmit = (event) => {
        event.preventDefault();
        dialog.close("save");
      };
      dialog.onclose = () => {
        if (dialog.returnValue === "save") {
          try {
            localStorage.setItem(storageKey, JSON.stringify(settings));
          } catch {}
          for (const listener of listeners) listener({ ...settings });
        } else settings = previous;
        dialog.remove();
      };
      dialog.showModal();
    },
  };
}
