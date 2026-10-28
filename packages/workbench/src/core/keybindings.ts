import {
  KeybindingParser,
  StandardKeyboardEvent,
  ScanCodeChord,
  ScanCodeUtils,
  isMacintosh,
  type Chord,
} from "@pane-system/upstream/keys";
export function createKeybindings() {
  const bindings = new Map<
    string,
    { chords: Chord[]; run(): void; enabled(): boolean }
  >();
  let prefix: Chord[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    register(
      id: string,
      shortcut: string,
      run: () => void,
      enabled: () => boolean,
    ) {
      const source = shortcut.replaceAll(
        "mod+",
        isMacintosh ? "meta+" : "ctrl+",
      );
      const keybinding = KeybindingParser.parseKeybinding(source);
      if (keybinding && !keybinding.chords.some((chord) => chord.keyCode === 0))
        bindings.set(id, { chords: keybinding.chords, run, enabled });
      return {
        dispose() {
          bindings.delete(id);
        },
      };
    },
    handle(event: KeyboardEvent) {
      if (event.key === "Escape") {
        prefix = [];
        return false;
      }
      const key = new StandardKeyboardEvent(event).toKeyCodeChord();
      const scan = new ScanCodeChord(
        event.ctrlKey,
        event.shiftKey,
        event.altKey,
        event.metaKey,
        ScanCodeUtils.toEnum(event.code),
      );
      const candidates = [...bindings.values()]
        .reverse()
        .filter(
          (binding) =>
            binding.enabled() &&
            prefix.every((chord, i) => binding.chords[i]?.equals(chord)) &&
            (binding.chords[prefix.length]?.equals(key) ||
              binding.chords[prefix.length]?.equals(scan)),
        );
      clearTimeout(timer);
      if (!candidates.length) {
        prefix = [];
        return false;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const exact = candidates.find(
        (binding) => binding.chords.length === prefix.length + 1,
      );
      if (exact) {
        prefix = [];
        exact.run();
      } else {
        prefix.push(candidates[0].chords[prefix.length]);
        timer = setTimeout(() => {
          prefix = [];
        }, 1500);
      }
      return true;
    },
    dispose() {
      clearTimeout(timer);
      bindings.clear();
      prefix = [];
    },
  };
}
