function requestDialog(title: string, value?: string): Promise<string | null> {
  const dialog = document.createElement("dialog");
  dialog.className = "pane-dialog";
  const form = document.createElement("form");
  const heading = document.createElement("label");
  heading.textContent = title;
  const input = document.createElement("input");
  input.value = value ?? "";
  input.setAttribute("aria-label", title);
  input.hidden = value === undefined;
  const actions = document.createElement("div");
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.onclick = () => dialog.close("cancel");
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = value === undefined ? "Continue" : "Open";
  submit.className = "primary";
  actions.append(cancel, submit);
  form.append(heading, input, actions);
  dialog.append(form);
  dialog.setAttribute("aria-label", title);
  document.body.append(dialog);
  return new Promise((resolve) => {
    form.onsubmit = (event) => {
      event.preventDefault();
      dialog.close("submit");
    };
    dialog.onclose = () => {
      const result = dialog.returnValue === "submit" ? input.value : null;
      dialog.remove();
      resolve(result);
    };
    dialog.showModal();
    if (value !== undefined) {
      input.focus();
      input.select();
    } else cancel.focus();
  });
}
export function askText(title: string, value = "") {
  return requestDialog(title, value);
}
export async function confirmAction(title: string) {
  return (await requestDialog(title)) !== null;
}
export function showActionMenu(
  dialog: HTMLDialogElement,
  x: number,
  y: number,
) {
  dialog.style.left = "0px";
  dialog.style.top = "0px";
  dialog.showModal();
  const rect = dialog.getBoundingClientRect();
  dialog.style.left = Math.max(0, Math.min(x, innerWidth - rect.width)) + "px";
  dialog.style.top = Math.max(0, Math.min(y, innerHeight - rect.height)) + "px";
}
export function enableActionMenuKeys(dialog: HTMLDialogElement) {
  dialog.onkeydown = (event) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const buttons = [
      ...dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    ];
    if (!buttons.length) return;
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let next = 0;
    switch (event.key) {
      case "End":
        next = buttons.length - 1;
        break;
      case "ArrowDown":
        next = (current + 1) % buttons.length;
        break;
      case "ArrowUp":
        next = (current - 1 + buttons.length) % buttons.length;
        break;
    }
    event.preventDefault();
    buttons[next].focus();
  };
}
