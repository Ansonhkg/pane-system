import type { Workbench } from "@pane-system/workbench";
import type { Content, Tab } from "@pane-system/contracts";
export interface BrowserMeasurements {
  kind: "browser-layout";
  date: string;
  environment: string;
  start: string;
  complete: string;
  samples: number;
  series: { key: string; unit: "ms"; samples: number[] }[];
  navigation: number;
}
export async function measureLayout(
  workbench: Workbench,
): Promise<BrowserMeasurements> {
  const count = 20;
  const original = [...workbench.panes.values()].map((pane) => ({
    pane,
    size: workbench.layout?.engine.getViewSize(pane),
  }));
  const reference = workbench.panes.get("main") ?? workbench.active;
  const grid = workbench.layout?.engine;
  if (!grid) throw new Error("Layout is not ready.");
  const size = grid.getViewSize(reference);
  const resize: number[] = [];
  const split: number[] = [];
  const move: number[] = [];
  const force = () => reference.element.getBoundingClientRect().width;
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    grid.resizeView(reference, { width: size.width + (i % 2 === 0 ? 8 : 0) });
    force();
    resize.push(performance.now() - start);
  }
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    const pane = workbench.split(reference);
    force();
    split.push(performance.now() - start);
    workbench.close(pane);
  }
  const from = workbench.split(reference);
  const to = workbench.split(reference);
  const tabs: Tab[] = [];
  for (let i = 0; i < 3; i++) {
    const element = document.createElement("div");
    element.textContent = "Measurement content";
    const tab: Tab = {
      id: crypto.randomUUID(),
      kind: "measurement",
      title: "Measurement",
      content: {
        element,
        dispose() {
          element.remove();
        },
      },
    };
    if (i === 2) to.open(tab);
    else from.open(tab);
    tabs.push(tab);
  }
  try {
    for (let i = 0; i < count; i++) {
      const source = i % 2 === 0 ? from : to;
      const target = i % 2 === 0 ? to : from;
      const start = performance.now();
      workbench.move(tabs[0].id, source.id, target.id);
      force();
      move.push(performance.now() - start);
    }
  } finally {
    for (const pane of [from, to]) {
      for (const tab of tabs) {
        const removed = pane.take(tab.id);
        removed?.content.dispose();
      }
      if (workbench.panes.has(pane.id)) workbench.close(pane);
    }
    for (const entry of original) {
      if (entry.size && workbench.panes.has(entry.pane.id))
        grid.resizeView(entry.pane, entry.size);
    }
    workbench.save();
  }
  return {
    kind: "browser-layout",
    date: new Date().toISOString(),
    environment: navigator.userAgent,
    start: "Immediately before the layout operation.",
    complete: "After the operation and a forced DOM layout.",
    samples: count,
    series: [
      { key: "layout.resize", unit: "ms", samples: resize },
      { key: "layout.split", unit: "ms", samples: split },
      { key: "tabs.move", unit: "ms", samples: move },
    ],
    navigation:
      performance.getEntriesByName("pane-ready")[0]?.startTime ??
      performance.getEntriesByName("pane-layout-ready")[0]?.startTime ??
      0,
  };
}
export function createMeasurements(options: {
  workbench: Workbench;
  record(value: BrowserMeasurements): Promise<void>;
}): Content {
  const element = document.createElement("div");
  element.className = "custom-content";
  const title = document.createElement("h2");
  title.textContent = "Layout measurements";
  const help = document.createElement("p");
  help.textContent =
    "Measure 20 resize, split, and tab move operations. Each sample includes a forced DOM layout.";
  const run = document.createElement("button");
  run.className = "primary";
  run.textContent = "Measure layout";
  const status = document.createElement("p");
  status.className = "status";
  const results = document.createElement("div");
  element.append(title, help, run, status, results);
  let disposed = false;
  run.onclick = async () => {
    run.disabled = true;
    try {
      const report = await measureLayout(options.workbench);
      await options.record(report);
      if (disposed) return;
      results.replaceChildren();
      for (const series of report.series) {
        const sorted = [...series.samples].sort((a, b) => a - b);
        const row = document.createElement("p");
        row.textContent =
          series.key +
          ": median " +
          ((sorted[9] + sorted[10]) / 2).toFixed(2) +
          " ms · p95 " +
          sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2) +
          " ms · n=" +
          sorted.length;
        results.append(row);
      }
      status.textContent = "Measurements saved.";
    } catch (error) {
      status.textContent = String(error);
      status.dataset.error = "true";
    } finally {
      run.disabled = false;
    }
  };
  return {
    element,
    dispose() {
      disposed = true;
    },
  };
}
