import type { Change } from "@pane-system/contracts";
export type ChangeNode = {
  id: string;
  name: string;
  children: ChangeNode[];
  change?: Change;
};
export function buildChangeTree(
  changes: Change[],
  view: "tree" | "list",
  compact: boolean,
): ChangeNode[] {
  const groups = new Map<string, ChangeNode>();
  const roots: ChangeNode[] = [];
  for (const change of changes) {
    const groupId = change.staged ? "staged" : "changes";
    let group = groups.get(groupId);
    if (!group) {
      group = {
        id: groupId,
        name: change.staged ? "Staged Changes" : "Changes",
        children: [],
      };
      groups.set(groupId, group);
      roots.push(group);
    }
    let parent = group;
    const parts = change.path.split("/");
    const name = parts.pop() ?? change.path;
    let path = groupId;
    for (const part of view === "tree" ? parts : []) {
      path += "/" + part;
      let folder = groups.get(path);
      if (!folder) {
        folder = { id: path, name: part, children: [] };
        groups.set(path, folder);
        parent.children.push(folder);
      }
      parent = folder;
    }
    parent.children.push({
      id: groupId + ":" + change.path,
      name: view === "list" ? change.path : name,
      children: [],
      change,
    });
  }
  function compress(node: ChangeNode) {
    for (const child of node.children) {
      if (child.change) continue;
      compress(child);
      while (child.children.length === 1 && !child.children[0].change) {
        const next = child.children[0];
        child.id = next.id;
        child.name += "/" + next.name;
        child.children = next.children;
      }
    }
  }
  if (compact && view === "tree") for (const root of roots) compress(root);
  return roots;
}
export function findChangePath(
  nodes: ChangeNode[],
  path: string,
): ChangeNode[] | undefined {
  for (const node of nodes) {
    if (node.change?.path === path) return [node];
    const child = findChangePath(node.children, path);
    if (child) return [node, ...child];
  }
}
