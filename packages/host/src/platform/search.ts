import type {
  SearchQuery,
  SearchMatch,
  SearchResults,
} from "@pane-system/contracts";
import { PATHS } from "../core/paths";
import { PATTERN } from "../core/patterns";
const MAX_RESULTS = 1000;
const EXCLUDED = [PATHS.git, "node_modules", "dist", PATHS.scode];
interface RipgrepMatch {
  path: { text: string };
  lines: { text: string };
  line_number: number;
  submatches: { start: number; end: number }[];
}
function argumentsFor(input: SearchQuery) {
  if (typeof input.query !== "string" || input.query.length > 4096)
    throw new Error("Supply a search query of at most 4096 characters.");
  for (const key of ["matchCase", "wholeWord", "regex"] as const)
    if (input[key] !== undefined && typeof input[key] !== "boolean")
      throw new Error("Supply a boolean for " + key + ".");
  const args = [
    "--json",
    "--hidden",
    "--no-config",
    "--no-ignore-parent",
    "--no-require-git",
    "--max-filesize",
    "4M",
    "--threads",
    "2",
  ];
  args.push(input.matchCase ? "--case-sensitive" : "--ignore-case");
  if (!input.regex) args.push("--fixed-strings");
  if (input.wholeWord) args.push("--word-regexp");
  for (const key of ["include", "exclude"] as const) {
    const value = input[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.length > 4096)
    )
      throw new Error("Supply file patterns of at most 4096 characters.");
    // Brace groups remain intact when separating comma-delimited patterns.
    const patterns =
      value
        ?.split(PATTERN.GLOB_SEPARATOR)
        .map((part) => part.trim())
        .filter(Boolean) ?? [];
    for (const pattern of patterns) {
      args.push("--glob", (key === "exclude" ? "!" : "") + pattern);
    }
  }
  for (const name of EXCLUDED) args.push("--glob", "!**/" + name + "/**");
  return [...args, "--", input.query, "."];
}
function addMatches(data: RipgrepMatch, matches: SearchMatch[]) {
  if (typeof data.path.text !== "string" || typeof data.lines.text !== "string")
    return;
  const bytes = Buffer.from(data.lines.text);
  for (const range of data.submatches) {
    if (matches.length > MAX_RESULTS) return;
    const prefix = bytes.subarray(0, range.start).toString("utf8");
    const text = bytes.subarray(range.start, range.end).toString("utf8");
    const before = prefix.slice(-100).replace(PATTERN.LEADING_SPACE, "");
    matches.push({
      path: data.path.text.replace(PATTERN.RELATIVE_PREFIX, ""),
      line: data.line_number,
      column: prefix.length + 1,
      endColumn: prefix.length + text.length + 1,
      before: (prefix.length > 100 ? "…" : "") + before,
      text,
      after: bytes
        .subarray(range.end)
        .toString("utf8")
        .replace(PATTERN.LINE_ENDING, "")
        .slice(0, 160),
    });
  }
}
/** Uses the same JSON search protocol as VS Code's RipgrepTextSearchEngine. */
export async function searchWorkspace(
  root: string,
  input: SearchQuery,
): Promise<SearchResults> {
  const args = argumentsFor(input);
  if (!input.query) return { matches: [], fileCount: 0, limitHit: false };
  const executable = Bun.which("rg");
  if (!executable)
    throw new Error("Install ripgrep (rg) to search this folder.");
  const child = Bun.spawn([executable, ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const errors = new Response(child.stderr).text();
  const matches: SearchMatch[] = [];
  let pending = "";
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, 15000);
  function consume(line: string) {
    if (!line) return;
    const record = JSON.parse(line) as { type: string; data: RipgrepMatch };
    if (record.type === "match") addMatches(record.data, matches);
  }
  try {
    const reader = child.stdout.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) {
        consume(pending.slice(0, end));
        pending = pending.slice(end + 1);
        if (matches.length > MAX_RESULTS) break;
      }
      if (matches.length > MAX_RESULTS) {
        child.kill();
        break;
      }
    }
    if (matches.length <= MAX_RESULTS && pending.trim()) consume(pending);
    const code = await child.exited;
    const error = (await errors).trim();
    if (timedOut)
      throw new Error("Search exceeded 15 seconds. Use a more specific query.");
    if (code > 1 && matches.length <= MAX_RESULTS)
      throw new Error(error || "Search failed.");
    const limitHit = matches.length > MAX_RESULTS;
    matches.length = Math.min(matches.length, MAX_RESULTS);
    matches.sort(
      (a, b) =>
        a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column,
    );
    return {
      matches,
      fileCount: new Set(matches.map((match) => match.path)).size,
      limitHit,
    };
  } finally {
    clearTimeout(timer);
    child.kill();
  }
}
