import { connectBenchmark } from "../../platform/transport/benchmark";
import { OPERATION } from "@pane-system/host/operations";
import { ARTIFACT_PATHS } from "../../core/paths";
const base = process.argv[2] ?? "http://127.0.0.1:4318";
const client = await connectBenchmark(base);
const series: {
  operation: string;
  unit: string;
  samples: number[];
  median: number;
  p95: number;
}[] = [];
const metadata = await client.doctor();
for (const [id, input] of [
  [OPERATION.READ, { path: ARTIFACT_PATHS.manifest }],
  [OPERATION.LIST, { path: "" }],
  [OPERATION.STATUS, {}],
] as const) {
  const samples: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    const report = await client.run(id, input);
    if (report.status !== "completed")
      throw new Error("Measurement operation did not complete.");
    samples.push(performance.now() - start);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  series.push({
    operation: id,
    unit: "ms",
    samples,
    median: (sorted[9] + sorted[10]) / 2,
    p95: sorted[18],
  });
}
console.log(
  JSON.stringify(
    {
      title: "Pane System host operations",
      date: new Date().toISOString(),
      commands: series.map((s) => s.operation),
      runtime: Bun.version,
      environment: process.platform + " " + process.arch,
      workspace: metadata.root,
      notes: [
        "20 sequential samples per operation on a shared host.",
        "Includes SDK, HTTP, SQLite run tracking, and response decoding.",
      ],
      series,
    },
    null,
    2,
  ),
);
