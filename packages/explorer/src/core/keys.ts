export function installExplorerKeys(
  host: HTMLElement,
  perform: (action: string) => void,
) {
  function keydown(event: KeyboardEvent) {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable)
    )
      return;
    let action: string | undefined;
    const command = navigator.platform.toLowerCase().includes("mac")
      ? event.metaKey
      : event.ctrlKey;
    if (event.key === "F2") action = "Rename selection";
    else if (event.key === "Delete" || (command && event.key === "Backspace"))
      action = "Delete selection";
    else if (command && !event.shiftKey && !event.altKey) {
      const keys: Record<string, string> = { c: "Copy", x: "Cut", v: "Paste" };
      action = keys[event.key.toLowerCase()];
    }
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    perform(action);
  }
  host.addEventListener("keydown", keydown);
  return {
    dispose() {
      host.removeEventListener("keydown", keydown);
    },
  };
}
