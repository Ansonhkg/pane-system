import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { PROVENANCE_PATH } from "../core/paths";
interface SourceHash {
  path: string;
  sha256: string;
}
export async function verifySource(upstream: string, source: string) {
  const provenance = JSON.parse(
    await readFile(join(upstream, PROVENANCE_PATH), "utf8"),
  ) as {
    revision: string;
    files: string[];
    fileCount: number;
    supplemental: SourceHash[];
  };
  let count = 0;
  async function verify(file: SourceHash) {
    const bytes = await readFile(join(source, file.path));
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== file.sha256)
      throw new Error("Source hash mismatch: " + file.path);
  }
  for (const index of provenance.files) {
    const files = JSON.parse(
      await readFile(join(upstream, "vendor", index), "utf8"),
    ) as SourceHash[];
    for (const file of files) {
      await verify(file);
      count++;
    }
  }
  for (const file of provenance.supplemental) await verify(file);
  if (count !== provenance.fileCount)
    throw new Error("Source file count does not match the manifest.");
  return {
    revision: provenance.revision,
    files: count,
    supplemental: provenance.supplemental.length,
  };
}
