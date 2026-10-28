import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PATHS } from "../core/paths";
export async function prepareWorkspace(root: string) {
  const marker = join(root, ".ready");
  if (await Bun.file(marker).exists()) return root;
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(
    join(root, PATHS.sample),
    `/** A custom pane can contain any DOM view. */\nexport interface PaneContent {\n  element: HTMLElement;\n  layout(width: number, height: number): void;\n  dispose(): void;\n}\n\nexport function greeting(name: string): string {\n  return "Welcome, " + name;\n}\n`,
  );
  await writeFile(
    join(root, PATHS.context),
    'export const context = { project: "Pane System", selection: [] };\n',
  );
  await writeFile(
    join(root, PATHS.manifest),
    JSON.stringify(
      { name: "pane-example", version: "0.1.0", private: true },
      null,
      2,
    ) + "\n",
  );
  async function git(args: string[]) {
    const p = Bun.spawn(["git", "-C", root, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await p.exited;
    if (code) throw new Error(await new Response(p.stderr).text());
  }
  await git(["init", "-b", "main"]);
  await git(["add", "."]);
  await git([
    "-c",
    "user.name=Pane Demo",
    "-c",
    "user.email=pane@example.invalid",
    "commit",
    "-m",
    "Create example workspace",
  ]);
  const file = join(root, PATHS.sample);
  await writeFile(
    file,
    (await Bun.file(file).text()).replace(
      '"Welcome, " + name',
      "`Welcome, ${name}. Create your first pane.`",
    ),
  );
  await writeFile(marker, "ready");
  return root;
}
