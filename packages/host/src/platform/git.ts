import { isMissing } from "./files";
import { isAbsolute, sep } from "node:path";
import type {
  GitPort,
  Change,
  FilePort,
  Disposable,
} from "@pane-system/contracts";
export function createGit(options: {
  root: string;
  files: FilePort;
}): GitPort & Disposable {
  const processes = new Set<Bun.Subprocess>();
  function validate(path: string) {
    if (
      !path ||
      path.startsWith("-") ||
      isAbsolute(path) ||
      path.includes("\0") ||
      path.split("/").includes("..") ||
      path.split(sep).includes("..")
    )
      throw new Error("Invalid Git path.");
  }
  async function git(args: string[], allowMissing = false, acceptedExit = 0) {
    const process = Bun.spawn(
      ["git", "--literal-pathspecs", "-C", options.root, ...args],
      {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...Bun.env,
          GIT_TERMINAL_PROMPT: "0",
          LC_ALL: "C",
          GIT_OPTIONAL_LOCKS: "0",
        },
      },
    );
    processes.add(process);
    const [out, error, code] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited,
    ]);
    processes.delete(process);
    if (code && code !== acceptedExit && !allowMissing)
      throw new Error(error.trim() || "Git operation failed.");
    return code && code !== acceptedExit ? "" : out;
  }
  let prefix: Promise<string> | undefined;
  function rootPrefix() {
    return (prefix ??= git(["rev-parse", "--show-prefix"]).then((value) =>
      value.trim(),
    ));
  }
  async function status() {
    const [raw, remote, scope] = await Promise.all([
      git([
        "status",
        "--porcelain=v1",
        "-z",
        "--branch",
        "--untracked-files=all",
        "--",
        ".",
      ]),
      git(["remote", "get-url", "origin"], true),
      rootPrefix(),
    ]);
    const records = raw.split("\0");
    const header = records.shift() ?? "";
    const changes: Change[] = [];
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      if (!row) continue;
      const x = row[0],
        y = row[1],
        repositoryPath = row.slice(3);
      const inside = repositoryPath.startsWith(scope);
      const path = repositoryPath.slice(scope.length);
      let originalPath: string | undefined;
      if (x === "R" || x === "C") {
        const original = records[++i];
        if (original?.startsWith(scope))
          originalPath = original.slice(scope.length);
      }
      if (!inside) continue;
      if (x === "?") {
        changes.push({ path, status: "U", staged: false });
        continue;
      }
      if (x !== " " && x !== "!")
        changes.push({ path, status: x, staged: true, originalPath });
      if (y !== " " && y !== "!")
        changes.push({ path, status: y, staged: false, originalPath });
    }

    return {
      branch: header
        .slice(3)
        .split("...")[0]
        .replace("No commits yet on ", "")
        .replace("Initial commit on ", ""),
      changes,
      canPublish: !!remote && !scope,
    };
  }
  return {
    dispose() {
      for (const process of processes) process.kill();
      processes.clear();
    },
    status,
    async diff(path, staged = false) {
      validate(path);
      const result = await status();
      const change = result.changes.find(
        (c) => c.path === path && c.staged === staged,
      );
      const scope = await rootPrefix();
      let reference = ":" + scope + path;
      if (staged) reference = "HEAD:" + scope + (change?.originalPath ?? path);
      const original = await git(["show", reference], true);
      let modified = "";
      if (staged) modified = await git(["show", ":" + scope + path], true);
      else
        try {
          modified = await options.files.read(path);
        } catch (error) {
          if (change?.status !== "D") throw error;
        }
      return { original, modified };
    },
    async stage(path) {
      validate(path);
      await git(["add", "--", path]);
    },
    async unstage(path) {
      validate(path);
      const head = await git(["rev-parse", "--verify", "HEAD"], true);
      if (head) await git(["restore", "--staged", "--", path]);
      else await git(["rm", "--cached", "--", path]);
    },
    async head(path) {
      validate(path);
      const change = (await status()).changes.find(
        (item) => item.path === path && item.originalPath,
      );
      return git([
        "show",
        "HEAD:" + (await rootPrefix()) + (change?.originalPath ?? path),
      ]);
    },
    async patch(path, staged) {
      validate(path);
      const tracked = await git(["ls-files", "--", path]);
      if (!tracked && !staged)
        return git(
          ["diff", "--no-index", "--binary", "--", "/dev/null", path],
          false,
          1,
        );
      return git([
        "diff",
        "--binary",
        ...(staged ? ["--cached"] : []),
        "--",
        path,
      ]);
    },
    async stash(paths) {
      if (!paths.length) throw new Error("Select at least one change.");
      for (const path of paths) validate(path);
      await git(["stash", "push", "--include-untracked", "--", ...paths]);
    },
    async discard(path, staged) {
      validate(path);
      const change = (await status()).changes.find(
        (item) => item.path === path && item.staged === staged,
      );
      if (!change) throw new Error("The change is no longer present.");
      const tracked = await git(["ls-files", "--", path]);
      if (!tracked && !staged) {
        if (!options.files.remove)
          throw new Error("File removal is not available.");
        await options.files.remove(path);
      } else if (staged && change.status === "R" && change.originalPath) {
        validate(change.originalPath);
        await git(["rm", "--cached", "-f", "--", path]);
        if (!options.files.remove)
          throw new Error("File removal is not available.");
        try {
          await options.files.remove(path);
        } catch (error) {
          if (!isMissing(error)) throw error;
        }
        await git([
          "restore",
          "--source=HEAD",
          "--staged",
          "--worktree",
          "--",
          change.originalPath,
        ]);
      } else if (staged && change.status === "A") {
        const head = await git(["rev-parse", "--verify", "HEAD"], true);
        if (head) await git(["restore", "--staged", "--", path]);
        else await git(["rm", "--cached", "--", path]);
        if (!options.files.remove)
          throw new Error("File removal is not available.");
        await options.files.remove(path);
      } else if (staged) {
        await git([
          "restore",
          "--source=HEAD",
          "--staged",
          "--worktree",
          "--",
          path,
        ]);
      } else await git(["restore", "--worktree", "--", path]);
    },
    async commit(message) {
      if (!message.trim()) throw new Error("Enter a commit message.");
      const scope = await rootPrefix();
      if (scope) {
        const staged = await git([
          "diff",
          "--cached",
          "--no-renames",
          "--no-relative",
          "--name-only",
          "-z",
        ]);
        if (staged.split("\0").some((path) => path && !path.startsWith(scope)))
          throw new Error(
            "Staged files exist outside the selected folder. Open the repository root to commit them.",
          );
      }
      await git(["commit", "-m", message]);
      return (await git(["rev-parse", "HEAD"])).trim();
    },
    async publish() {
      if (await rootPrefix())
        throw new Error("Open the repository root to publish this branch.");
      const branch = (await git(["symbolic-ref", "--short", "HEAD"])).trim();
      await git(["push", "--set-upstream", "origin", branch]);
    },
  };
}
