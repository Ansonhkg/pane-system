import {
  readTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "@pane-system/workbench/theme-state";
import { recordStartupFrames } from "../bootstrap/startup-metrics";
const root = document.documentElement;
if (new URL(location.href).searchParams.has("measure-startup"))
  recordStartupFrames();
try {
  const settings = readTheme(
    JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "null"),
  );
  const palette = resolveTheme(settings);
  root.dataset.theme = settings.mode;
  root.style.colorScheme = settings.mode;
  root.style.setProperty("--startup-surface", palette.surface);
  root.style.setProperty("--startup-text", palette.muted);
} catch {
  /* Storage can be unavailable. Use the default dark colors. */
}
function failed() {
  if (root.dataset.startup !== "loading") return;
  root.dataset.startup = "failed";
  function report() {
    const message = document.getElementById("startup-message");
    if (message)
      message.textContent =
        "The workspace could not start. Reload the page to try again.";
    const retry = document.getElementById("startup-retry");
    if (retry) retry.hidden = false;
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", report, { once: true });
  else report();
}
window.addEventListener(
  "error",
  (event) => {
    if (event.error || event.target instanceof HTMLScriptElement) failed();
  },
  true,
);
window.addEventListener("unhandledrejection", failed);
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("startup-retry")
    ?.addEventListener("click", () => location.reload());
});
