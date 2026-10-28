import ts from "typescript";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NATIVE_DROP_PATHS as P } from "../core/paths";
export async function generateNativeDrop(source: string) {
  const parse = async (path: string) =>
    ts.createSourceFile(
      path,
      await readFile(join(source, path), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
  const target = await parse(P.target);
  const overlay = target.statements.find(
    (n): n is ts.ClassDeclaration =>
      ts.isClassDeclaration(n) && n.name?.text === "DropOverlay",
  );
  if (!overlay) throw new Error("VS Code DropOverlay is missing.");
  const methods = [
    "positionOverlay",
    "doPositionOverlay",
    "getOverlayOffsetHeight",
  ]
    .map((name) => {
      const method = overlay.members.find(
        (n) => ts.isMethodDeclaration(n) && n.name.getText(target) === name,
      );
      if (!method) throw new Error("VS Code drop method is missing: " + name);
      return method
        .getText(target)
        .replace("private positionOverlay", "positionOverlay");
    })
    .join("\n");
  const groups = await parse(P.groups);
  const direction = groups.statements.find(
    (n) => ts.isEnumDeclaration(n) && n.name.text === "GroupDirection",
  );
  const tabs = await parse(P.tabs);
  const tabsClass = tabs.statements.find(
    (n): n is ts.ClassDeclaration =>
      ts.isClassDeclaration(n) && n.name?.text === "MultiEditorTabsControl",
  );
  const threshold = tabsClass?.members.find(
    (n): n is ts.PropertyDeclaration =>
      ts.isPropertyDeclaration(n) &&
      n.name.getText(tabs) === "DRAG_OVER_OPEN_TAB_THRESHOLD",
  );
  if (!direction || !threshold?.initializer)
    throw new Error("VS Code drag constants are missing.");
  const wrapper = `// Microsoft VS Code, MIT. Method bodies below are extracted without changes.
import {assertReturnsDefined,assertReturnsAllDefined} from './src/vs/base/common/types.ts';
${direction.getText(groups)}
export const TAB_DRAG_OVER_OPEN_THRESHOLD=${threshold.initializer.getText(tabs)};
export class NativeDropGeometry {
 currentDropOperation: {splitDirection?: GroupDirection}|undefined;
 private groupView;
 constructor(element:HTMLElement,private container:HTMLElement,private overlay:HTMLElement,titleHeight:number,preferRight=true) {
  this.groupView={element,isEmpty:false,titleHeight:{offset:titleHeight},groupsView:{partOptions:{showTabs:'multiple',openSideBySideDirection:preferRight?'right':'down'}}};
 }
 private toggleDropIntoPrompt(_show:boolean){}
 ${methods}
}
`;
  await writeFile(join(source, P.generated), wrapper);
}
