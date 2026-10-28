export const MEASUREMENT_FEATURES = [
  "editor",
  "explorer",
  "source-control",
  "terminal",
  "language",
  "auxiliary",
] as const;
export type MeasurementFeature = (typeof MEASUREMENT_FEATURES)[number];
export function measurementFlags(value: string | null) {
  const disabled = new Set<MeasurementFeature>();
  for (const item of (value ?? "").split(",").filter(Boolean)) {
    if (!MEASUREMENT_FEATURES.some((feature) => feature === item))
      throw new Error("Unknown measurement feature: " + item);
    disabled.add(item as MeasurementFeature);
  }
  if (disabled.has("editor")) disabled.add("language");
  return {
    enabled: (feature: MeasurementFeature) => !disabled.has(feature),
    disabled: [...disabled].sort(),
  };
}
export type MeasurementFlags = ReturnType<typeof measurementFlags>;
