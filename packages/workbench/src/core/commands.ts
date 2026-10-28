import { createKeybindings } from "./keybindings";
import {
  ContextKeyExpr,
  type ContextExpression,
} from "@pane-system/upstream/keys";
import type { Context } from "./context";
import type { Command } from "@pane-system/contracts";
export function createCommands(
  status?: (message: string) => void,
  context?: Context,
) {
  const commands = new Map<string, Command>();
  const keybindings = createKeybindings();
  const conditions = new Map<string, ContextExpression>();
  function enabled(command: Command) {
    const condition = conditions.get(command.id);
    return (
      !condition || condition.evaluate(context ?? { getValue: () => undefined })
    );
  }
  const dialog = document.createElement("dialog");
  dialog.className = "pane-command-palette";
  const input = document.createElement("input");
  input.placeholder = "Type a command";
  input.setAttribute("aria-label", "Find a command");
  const list = document.createElement("div");
  list.setAttribute("role", "listbox");
  dialog.append(input, list);
  document.body.append(dialog);
  let selected = 0;
  let filtered: Command[] = [];
  async function execute(command: Command) {
    dialog.close();
    try {
      await command.run();
    } catch (error) {
      status?.(String(error));
    }
  }
  function render() {
    filtered = [...commands.values()].filter(
      (c) =>
        enabled(c) && c.title.toLowerCase().includes(input.value.toLowerCase()),
    );
    selected = Math.min(selected, Math.max(0, filtered.length - 1));
    list.replaceChildren();
    for (const [i, command] of filtered.entries()) {
      const row = document.createElement("button");
      row.textContent = command.title;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(i === selected));
      const hint = document.createElement("kbd");
      hint.textContent = command.shortcut ?? "";
      row.append(hint);
      row.onclick = () => void execute(command);
      list.append(row);
    }
    if (!filtered.length) list.textContent = "No commands found";
  }
  input.oninput = () => {
    selected = 0;
    render();
  };
  input.onkeydown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selected = Math.min(selected + 1, filtered.length - 1);
      render();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      selected = Math.max(0, selected - 1);
      render();
    }
    if (e.key === "Enter" && filtered[selected]) {
      e.preventDefault();
      void execute(filtered[selected]);
    }
  };
  function show() {
    input.value = "";
    selected = 0;
    render();
    dialog.showModal();
    input.focus();
  }
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (keybindings.handle(event)) return;
    if (
      (event.metaKey || event.ctrlKey) &&
      (event.key === "k" || (event.shiftKey && event.key.toLowerCase() === "p"))
    ) {
      event.preventDefault();
      show();
    }
  };
  const subscription = context?.onDidChange(() => {
    if (dialog.open) render();
  });
  window.addEventListener("keydown", keydown);
  return {
    register(command: Command) {
      if (commands.has(command.id))
        throw new Error("Duplicate command: " + command.id);
      if (command.when) {
        const condition = ContextKeyExpr.deserialize(command.when);
        if (!condition) throw new Error("Invalid command context.");
        conditions.set(command.id, condition);
      }
      commands.set(command.id, command);
      const binding = keybindings.register(
        command.id,
        command.keybinding ?? command.shortcut ?? "",
        () => void execute(command),
        () => enabled(command),
      );
      return {
        dispose() {
          binding.dispose();
          conditions.delete(command.id);
          commands.delete(command.id);
        },
      };
    },
    show,
    run(id: string) {
      const c = commands.get(id);
      if (!c || !enabled(c)) throw new Error("Unknown command: " + id);
      return c.run();
    },
    list: () => [...commands.values()],
    dispose() {
      window.removeEventListener("keydown", keydown);
      subscription?.dispose();
      keybindings.dispose();
      conditions.clear();
      dialog.remove();
    },
  };
}
