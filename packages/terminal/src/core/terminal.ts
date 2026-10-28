import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { Content, TerminalPort } from "@pane-system/contracts";
export function createTerminal(options: {
  provider: TerminalPort;
  theme?: "dark" | "light";
}): Content {
  const element = document.createElement("div");
  element.className = "terminal-content";
  const terminal = new Terminal({
    fontSize: 11,
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    cursorBlink: true,
    scrollback: 5000,
    allowProposedApi: false,
    theme: {
      background: options.theme === "light" ? "#fafafa" : "#181818",
      foreground: options.theme === "light" ? "#20252c" : "#cccccc",
    },
  });
  const fit = new FitAddon();
  terminal.loadAddon(fit);
  terminal.open(element);
  function updateTheme() {
    const style = getComputedStyle(document.body);
    terminal.options.theme = {
      background: style.getPropertyValue("--surface").trim() || "#181818",
      foreground: style.getPropertyValue("--text").trim() || "#cccccc",
      cursor: style.getPropertyValue("--text").trim() || "#cccccc",
    };
  }
  const appearance = new MutationObserver(updateTheme);
  appearance.observe(document.body, {
    attributes: true,
    attributeFilter: ["style"],
  });
  appearance.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  updateTheme();
  const session = options.provider.create();
  const output = session.onData((data) => terminal.write(data));
  const input = terminal.onData((data) => session.write(data));
  const resize = terminal.onResize((size) =>
    session.resize(size.cols, size.rows),
  );
  return {
    element,
    layout() {
      if (
        element.isConnected &&
        element.clientWidth > 0 &&
        element.clientHeight > 0
      )
        fit.fit();
    },
    focus() {
      terminal.focus();
    },
    dispose() {
      appearance.disconnect();
      resize.dispose();
      input.dispose();
      output.dispose();
      session.dispose();
      terminal.dispose();
    },
  };
}
