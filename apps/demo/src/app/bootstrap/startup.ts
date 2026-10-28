export async function showWorkspace() {
  // Native icon fonts and editor paint must be ready before the workspace is exposed.
  await document.fonts.load("16px codicon");
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  const root = document.documentElement;
  if (root.dataset.startup === "failed") return;
  root.dataset.startup = "ready";
  document.getElementById("startup-screen")?.remove();
  performance.mark("pane-visible");
}
export function startupFailed() {
  document.documentElement.dataset.startup = "failed";
  const message = document.getElementById("startup-message");
  if (message)
    message.textContent =
      "The workspace could not start. Reload the page to try again.";
  const retry = document.getElementById("startup-retry");
  if (retry) retry.hidden = false;
}
