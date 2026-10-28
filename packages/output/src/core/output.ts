import type { Content } from "@pane-system/contracts";
export function createOutput(
  options: { limit?: number } = {},
): Content & { append(text: string): void; clear(): void } {
  const element = document.createElement("div");
  element.className = "output-content";
  element.setAttribute("role", "log");
  element.setAttribute("aria-label", "Output");
  const lines: string[] = [];
  const limit = options.limit ?? 2000;
  function render() {
    element.textContent = lines.join("\n");
    element.scrollTop = element.scrollHeight;
  }
  return {
    element,
    append(text) {
      lines.push(text);
      if (lines.length > limit) lines.splice(0, lines.length - limit);
      render();
    },
    clear() {
      lines.length = 0;
      render();
    },
    serialize() {
      return { lines };
    },
    dispose() {
      lines.length = 0;
    },
  };
}
