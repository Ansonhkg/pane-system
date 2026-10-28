import { THEME_FIELDS, resolveTheme } from "./palette";
import { normalizeThemeColor, themeContrast } from "./color";
import type { ThemeController } from "./controller";
export function createThemeEditor(controller: ThemeController) {
  let dialog: HTMLDialogElement | undefined;
  return {
    show() {
      if (dialog) {
        dialog.focus();
        return;
      }
      let draft = controller.get();
      const element = document.createElement("dialog");
      dialog = element;
      element.className = "pane-dialog pane-theme-editor";
      element.setAttribute("aria-label", "Color theme");
      const form = document.createElement("form");
      const title = document.createElement("h2");
      title.textContent = "Color theme";
      const help = document.createElement("p");
      help.textContent =
        "Change colors for all panes. Preview changes before you apply them.";
      const mode = document.createElement("select");
      mode.setAttribute("aria-label", "Theme preset");
      for (const value of ["dark", "light"] as const) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value === "dark" ? "Dark" : "Light";
        mode.append(option);
      }
      mode.value = draft.mode;
      const fields = document.createElement("div");
      fields.className = "theme-fields";
      const error = document.createElement("p");
      error.className = "theme-error";
      error.setAttribute("role", "status");
      const preview = document.createElement("div");
      preview.className = "theme-preview";
      const sample = document.createElement("span");
      sample.textContent = "Aa Pane System";
      const contrast = document.createElement("span");
      preview.append(sample, contrast);
      const actions = document.createElement("div");
      actions.className = "theme-actions";
      const reset = document.createElement("button");
      reset.type = "button";
      reset.textContent = "Reset colors";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      const apply = document.createElement("button");
      apply.type = "submit";
      apply.textContent = "Apply";
      apply.className = "primary";
      actions.append(reset, cancel, apply);
      const entries = new Map<
        string,
        { input: HTMLInputElement; picker: HTMLInputElement }
      >();
      function refresh() {
        const palette = resolveTheme(draft);
        for (const [key] of THEME_FIELDS) {
          const row = entries.get(key)!;
          row.input.value = row.picker.value = palette[key];
          row.input.removeAttribute("aria-invalid");
        }
        error.textContent = "";
        apply.disabled = false;
        update();
      }
      function update() {
        controller.preview(draft);
        const palette = resolveTheme(draft);
        const result = themeContrast(palette.frame);
        preview.style.backgroundColor = palette.frame;
        preview.style.color = result.foreground;
        contrast.textContent = result.ratio.toFixed(1) + ":1";
      }
      for (const [key, name] of THEME_FIELDS) {
        const label = document.createElement("label");
        label.className = "theme-color-row";
        const text = document.createElement("span");
        text.textContent = name;
        const picker = document.createElement("input");
        picker.type = "color";
        picker.setAttribute(
          "aria-label",
          "Choose " + name.toLowerCase() + " color",
        );
        const input = document.createElement("input");
        input.setAttribute("aria-label", name + " color");
        input.spellcheck = false;
        entries.set(key, { input, picker });
        const change = (value: string) => {
          const normalized = normalizeThemeColor(value);
          input.setAttribute("aria-invalid", String(!normalized));
          apply.disabled = [...entries.values()].some(
            (row) => row.input.getAttribute("aria-invalid") === "true",
          );
          error.textContent = apply.disabled
            ? "Enter a hex code, color name, rgb value, or hsl value."
            : "";
          if (!normalized) return;
          draft.colors[key] = normalized;
          picker.value = normalized;
          update();
        };
        input.oninput = () => change(input.value);
        picker.oninput = () => {
          input.value = picker.value;
          change(picker.value);
        };
        label.append(text, picker, input);
        fields.append(label);
      }
      mode.onchange = () => {
        draft = { mode: mode.value === "light" ? "light" : "dark", colors: {} };
        refresh();
      };
      reset.onclick = () => {
        draft.colors = {};
        refresh();
      };
      cancel.onclick = () => element.close("cancel");
      form.onsubmit = (event) => {
        event.preventDefault();
        if (apply.disabled) return;
        try {
          controller.apply(draft);
          element.close("apply");
        } catch (failure) {
          error.textContent = String(failure);
        }
      };
      element.onclose = () => {
        if (element.returnValue !== "apply") controller.revert();
        element.remove();
        dialog = undefined;
      };
      form.append(title, help, mode, fields, preview, error, actions);
      element.append(form);
      document.body.append(element);
      refresh();
      element.showModal();
      mode.focus();
    },
    dispose() {
      if (dialog) {
        controller.revert();
        dialog.remove();
        dialog = undefined;
      }
    },
  };
}
