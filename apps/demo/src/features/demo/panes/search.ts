import type {
  Content,
  FilePort,
  SearchMatch,
  SearchQuery,
  TreeOpenOptions,
} from "@pane-system/contracts";
import { FindInput } from "@pane-system/upstream/chrome";
import { createViewHeading } from "@pane-system/layout";
import { createSearchTree } from "./search-tree";
export function createSearch(options: {
  files: FilePort;
  state?: unknown;
  open(match: SearchMatch, behavior: TreeOpenOptions): void;
}): Content {
  const element = document.createElement("div");
  element.className = "workspace-search";
  const widgets = document.createElement("div");
  widgets.className = "search-widgets";
  const input = new FindInput(widgets, undefined, {
    placeholder: "Search",
    label: "Search file contents",
    showCommonFindToggles: true,
    inputBoxStyles: {
      inputBackground: "var(--field)",
      inputForeground: "var(--text)",
      inputBorder: "transparent",
    },
    toggleStyles: {
      inputActiveOptionBackground: "var(--active)",
      inputActiveOptionForeground: "var(--text)",
      inputActiveOptionBorder: "transparent",
    },
  });
  const filters = document.createElement("div");
  filters.className = "search-filters";
  filters.hidden = true;
  function filter(label: string) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const control = document.createElement("input");
    control.type = "text";
    control.placeholder = "e.g. **/*.ts, **/*.tsx";
    control.setAttribute("aria-label", label);
    control.oninput = schedule;
    wrapper.append(control);
    filters.append(wrapper);
    return control;
  }
  const include = filter("Files to include");
  const exclude = filter("Files to exclude");
  widgets.append(filters);
  const message = document.createElement("div");
  message.className = "search-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  const treeHost = document.createElement("div");
  treeHost.className = "search-results";
  const results = createSearchTree(treeHost, options.open);
  const heading = createViewHeading({
    title: "Search",
    actions: [
      {
        id: "refresh-search",
        title: "Refresh search",
        icon: "refresh",
        run: () => search(),
      },
      {
        id: "clear-search",
        title: "Clear search results",
        icon: "clear-all",
        run: () => {
          input.setValue("");
          schedule();
          input.focus();
        },
      },
      {
        id: "search-filters",
        title: "Show files to include or exclude",
        icon: "filter",
        run: () => {
          filters.hidden = !filters.hidden;
          heading.update("search-filters", { checked: !filters.hidden });
          layout();
        },
      },
      {
        id: "collapse-search",
        title: "Collapse search results",
        icon: "collapse-all",
        run: () => results.collapseAll(),
      },
    ],
  });
  element.append(heading.element, widgets, message, treeHost);
  let generation = 0;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let treeUpdate = Promise.resolve();
  function layout() {
    results.layout(
      Math.max(
        0,
        element.clientHeight -
          heading.element.offsetHeight -
          widgets.offsetHeight -
          message.offsetHeight,
      ),
      element.clientWidth,
    );
  }
  function query(): SearchQuery {
    return {
      query: input.getValue(),
      matchCase: input.getCaseSensitive(),
      wholeWord: input.getWholeWords(),
      regex: input.getRegex(),
      include: include.value,
      exclude: exclude.value,
    };
  }
  function schedule() {
    generation++;
    clearTimeout(timer);
    timer = setTimeout(() => void search(), 180);
  }
  function render(matches: SearchMatch[], current: number) {
    treeUpdate = treeUpdate
      .then(async () => {
        if (disposed || current !== generation) return;
        await results.setMatches(matches);
        layout();
      })
      .catch(report);
    return treeUpdate;
  }
  function report(error: unknown) {
    if (disposed) return;
    message.dataset.error = "true";
    message.textContent =
      error instanceof Error ? error.message : String(error);
    layout();
  }
  async function search() {
    clearTimeout(timer);
    const current = ++generation;
    const request = query();
    message.dataset.error = "false";
    if (!request.query) {
      message.textContent = "Type to search files in the selected folder.";
      element.removeAttribute("aria-busy");
      await render([], current);
      return;
    }
    message.textContent = "Searching…";
    element.setAttribute("aria-busy", "true");
    layout();
    try {
      if (!options.files.search)
        throw new Error("The file provider does not support workspace search.");
      const result = await options.files.search(request);
      if (disposed || current !== generation) return;
      message.textContent = result.matches.length
        ? `${result.matches.length} ${result.matches.length === 1 ? "result" : "results"} in ${result.fileCount} ${result.fileCount === 1 ? "file" : "files"}${result.limitHit ? " · Limit reached. Refine your search." : ""}`
        : "No results found.";
      await render(result.matches, current);
    } catch (error) {
      if (disposed || current !== generation) return;
      report(error);
      await render([], current);
    } finally {
      if (current === generation) element.removeAttribute("aria-busy");
      if (!disposed) layout();
    }
  }
  const listeners = [
    input.onInput(schedule),
    input.onDidOptionChange(schedule),
  ];
  function keydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      input.onSearchSubmit();
      void search();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      results.focusFirst();
    }
    if (event.key === "Escape") {
      generation++;
      clearTimeout(timer);
      element.removeAttribute("aria-busy");
      message.textContent = "Search stopped.";
      layout();
    }
  }
  widgets.addEventListener("keydown", keydown);
  const saved = options.state;
  if (
    saved &&
    typeof saved === "object" &&
    "query" in saved &&
    typeof saved.query === "string"
  ) {
    input.setValue(saved.query);
    input.setCaseSensitive("matchCase" in saved && saved.matchCase === true);
    input.setWholeWords("wholeWord" in saved && saved.wholeWord === true);
    input.setRegex("regex" in saved && saved.regex === true);
    if ("include" in saved && typeof saved.include === "string")
      include.value = saved.include;
    if ("exclude" in saved && typeof saved.exclude === "string")
      exclude.value = saved.exclude;
  }
  if (include.value || exclude.value) {
    filters.hidden = false;
    heading.update("search-filters", { checked: true });
  }
  const ready = search();
  return {
    element,
    ready,
    layout,
    focus() {
      input.focus();
      input.select();
    },
    serialize: query,
    dispose() {
      disposed = true;
      generation++;
      clearTimeout(timer);
      widgets.removeEventListener("keydown", keydown);
      listeners.forEach((listener) => listener.dispose());
      input.dispose();
      heading.dispose();
      results.dispose();
    },
  };
}
