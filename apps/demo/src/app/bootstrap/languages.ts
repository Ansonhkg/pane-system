import { createLanguageServices } from "@pane-system/language-services";
import type { createHostClient } from "@pane-system/host/client";
import type { registerExtensions } from "./extensions";
import { PATHS } from "../../core/paths";
export function initializeLanguages(
  client: ReturnType<typeof createHostClient>,
  extensions: Awaited<ReturnType<typeof registerExtensions>>,
  status: HTMLElement,
) {
  setTimeout(
    () =>
      createLanguageServices({
        files: client.files,
        resolveModel: extensions.resolveModel,
        worker: () => new Worker(PATHS.languageWorker, { type: "module" }),
        error(error) {
          status.textContent = String(error);
        },
      }),
    0,
  );
}
