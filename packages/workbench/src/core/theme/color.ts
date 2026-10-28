import { PATTERN } from "../patterns";
import { Color } from "@pane-system/upstream/chrome";
export function normalizeThemeColor(value: string): string | undefined {
  if (!CSS.supports("color", value) || PATTERN.CONTEXT_COLOR.test(value))
    return;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  if (a !== 255) return;
  return (
    "#" + [r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")
  );
}
export function themeContrast(hex: string) {
  const color = Color.fromHex(hex);
  const white = color.getContrastRatio(Color.white);
  const black = color.getContrastRatio(Color.black);
  return white >= black
    ? { foreground: "#ffffff", ratio: white }
    : { foreground: "#000000", ratio: black };
}
