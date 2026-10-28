export const PATHS = {
  workspace: "/api/workspace",
  scode: ".scode",
  git: ".git",
  root: ".",
  index: "index.html",
  assets: "/assets/",
  api: "/api/",
  terminal: "/terminal",
  events: "/events",
  operations: "/api/operations",
  sessionCookie: "pane-session",
  state: ".scode/local/pane-host.sqlite",
  temporary: ".pane-write-",
} as const;

export const PACKAGE_RUN_PATH = ".scode/local/package-runs.json";
