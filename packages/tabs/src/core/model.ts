import {
  EditorGroupModel,
  EditorInput,
  type GroupInstantiation,
  type GroupConfiguration,
} from "@pane-system/upstream/groups";
import { Event } from "@pane-system/upstream/layout";
import type { Tab } from "@pane-system/contracts";
export class TabInput extends EditorInput {
  private dirty = false;
  constructor(readonly tab: Tab) {
    super();
  }
  get typeId() {
    return "pane.content";
  }
  get resource() {
    return undefined;
  }
  get capabilities() {
    return 0;
  }
  getName() {
    return this.tab.title;
  }
  isDirty() {
    return this.tab.content.dirty ?? false;
  }
  matches(other: unknown) {
    return other instanceof TabInput && other.tab.id === this.tab.id;
  }
  changed() {
    const dirty = this.isDirty();
    if (dirty === this.dirty) return;
    this.dirty = dirty;
    this._onDidChangeDirty.fire();
  }
}
export function createTabModel() {
  const configuration: GroupConfiguration = {
    onDidChangeConfiguration: Event.None,
    getValue(key) {
      if (key === "workbench.editor.openPositioning") return "right";
      if (key === "workbench.editor.focusRecentEditorAfterClose") return true;
      return undefined;
    },
  };
  const instantiation: GroupInstantiation = {
    createInstance(type, label) {
      return new type(label, instantiation, configuration);
    },
  };
  return new EditorGroupModel(undefined, instantiation, configuration);
}
