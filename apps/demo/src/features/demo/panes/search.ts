import type { Content, FilePort, FileEntry } from "@pane-system/contracts";
export function createSearch(options: {
  files: FilePort;
  open(path: string): void;
}): Content {
  const element = document.createElement("div");
  element.className = "custom-content";
  const input = document.createElement("input");
  input.placeholder = "Search file contents";
  input.setAttribute("aria-label", "Search file contents");
  const button = document.createElement("button");
  button.textContent = "Search";
  const status = document.createElement("p");
  status.className = "status";
  const results = document.createElement("div");
  element.append(input, button, status, results);
  let stopped = false;
  let generation = 0;
  async function search() {
    const query = input.value.toLowerCase();
    if (!query) return;
    const current = ++generation;
    results.replaceChildren();
    button.disabled = true;
    status.textContent = "Searching";
    let count = 0;
    let scanned = 0;
    async function visit(path: string) {
      if (stopped || current !== generation) return;
      const entries = await options.files.list(path);
      for (const entry of entries) {
        if (stopped || current !== generation) return;
        if (entry.directory) {
          await visit(entry.path);
          continue;
        }
        try {
          const text = await options.files.read(entry.path);
          scanned++;
          const lines = text.split("\n");
          for (const [i, line] of lines.entries()) {
            if (!line.toLowerCase().includes(query)) continue;
            count++;
            const row = document.createElement("button");
            row.className = "search-result";
            row.textContent =
              entry.path + ":" + (i + 1) + "  " + line.trim().slice(0, 120);
            row.onclick = () => options.open(entry.path);
            results.append(row);
            if (count >= 500) return;
          }
        } catch {
          /* Binary files cannot contain an editor search result. */
        }
        if (count >= 500) return;
      }
    }
    try {
      await visit("");
      if (!stopped && current === generation)
        status.textContent = count + " results in " + scanned + " files";
    } catch (error) {
      status.textContent = String(error);
    } finally {
      button.disabled = false;
    }
  }
  button.onclick = () => void search();
  input.onkeydown = (e) => {
    if (e.key === "Enter") void search();
  };
  return {
    element,
    focus() {
      input.focus();
    },
    dispose() {
      stopped = true;
      generation++;
    },
  };
}
