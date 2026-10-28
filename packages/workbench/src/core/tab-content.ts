import type { PaneExtension, Tab } from "@pane-system/contracts";
export async function createTabContent(
  extensions: ReadonlyMap<string, PaneExtension>,
  isClosed: () => boolean,
  kind: string,
  resource: string | undefined,
  state: unknown,
  id: string,
  title: string | undefined,
  pinned: boolean,
): Promise<Tab> {
  const extension = extensions.get(kind);
  if (!extension) throw new Error("Unknown pane extension: " + kind);
  const content = await extension.create({ resource, state });
  if (isClosed()) {
    content.dispose();
    throw new Error("Workbench is closed.");
  }
  return {
    id,
    kind,
    resource,
    pinned,
    title: title ?? resource?.split("/").at(-1) ?? extension.title,
    content,
  };
}
