import { Orientation, type SerializedGrid } from "@pane-system/layout";
import { PATHS } from "../../core/paths";
export function initialLayout(
  width: number,
  height: number,
  sampleAvailable = true,
): SerializedGrid {
  const leaf = (
    id: string,
    size: number,
    tabs: { id: string; kind: string; title: string; resource?: string }[],
  ) => ({
    type: "leaf" as const,
    size,
    data: { id, tabs, active: tabs[0]?.id },
  });
  return {
    orientation: Orientation.VERTICAL,
    width,
    height,
    root: {
      type: "branch",
      size: width,
      data: [
        {
          type: "branch",
          size: Math.max(300, height * 0.78),
          data: [
            leaf("files", Math.round(width * 0.24), [
              { id: "explorer", kind: "explorer", title: "Files" },
            ]),
            leaf(
              "main",
              Math.max(240, Math.round(width * 0.43)),
              sampleAvailable
                ? [
                    {
                      id: "welcome",
                      kind: sampleAvailable ? "editor" : "welcome",
                      title: sampleAvailable ? "welcome.ts" : "Welcome",
                      resource: sampleAvailable ? PATHS.sample : undefined,
                    },
                    {
                      id: "context-file",
                      kind: "editor",
                      title: "context.ts",
                      resource: PATHS.context,
                    },
                  ]
                : [{ id: "welcome", kind: "welcome", title: "Welcome" }],
            ),
            leaf("changes", Math.round(width * 0.33), [
              {
                id: "source-control",
                kind: "source-control",
                title: "Source Control",
              },
            ]),
          ],
        },
        leaf("bottom", Math.round(height * 0.22), [
          { id: "terminal", kind: "terminal", title: "Terminal" },
          { id: "output", kind: "output", title: "Output" },
          { id: "problems", kind: "problems", title: "Problems" },
        ]),
      ],
    },
  };
}
