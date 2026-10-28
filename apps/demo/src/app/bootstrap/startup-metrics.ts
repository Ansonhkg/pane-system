/** Opt-in paint evidence. The normal startup path does not install observers. */
export function recordStartupFrames() {
  const frames: {
    time: number;
    state: string;
    visible: boolean;
    layout: string;
  }[] = [];
  let score = 0;
  let readyFrames = 0;
  const shifts = new PerformanceObserver((records) => {
    for (const entry of records.getEntries()) {
      if ("hadRecentInput" in entry && entry.hadRecentInput) continue;
      if ("value" in entry && typeof entry.value === "number")
        score += entry.value;
    }
  });
  shifts.observe({ type: "layout-shift", buffered: true });
  function frame(time: number) {
    const root = document.documentElement;
    const main = document.querySelector(".app-main");
    const state = root.dataset.startup ?? "loading";
    const visible = !!main && getComputedStyle(main).visibility === "visible";
    const panes = [...document.querySelectorAll<HTMLElement>(".pane")].map(
      (pane) => {
        const rect = pane.getBoundingClientRect();
        return {
          id: pane.dataset.pane,
          kind: pane.dataset.kind,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          tabs: pane.querySelectorAll(".tab").length,
        };
      },
    );
    frames.push({
      time: Math.round(time),
      state,
      visible,
      layout: JSON.stringify(panes),
    });
    if (state === "ready") readyFrames++;
    if (readyFrames >= 10 || state === "failed" || time > 10000) {
      shifts.disconnect();
      root.dataset.startupMetrics = JSON.stringify({
        frames,
        layoutShiftScore: score,
        visibleLoadingFrames: frames.filter(
          (item) => item.visible && item.state !== "ready",
        ).length,
        visibleLayouts: new Set(
          frames.filter((item) => item.visible).map((item) => item.layout),
        ).size,
      });
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
