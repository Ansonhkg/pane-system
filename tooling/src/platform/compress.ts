import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";
export async function compressAssets(root: string) {
  for (const name of await readdir(root)) {
    if (
      !name.endsWith(".js") &&
      !name.endsWith(".css") &&
      !name.endsWith(".ttf")
    )
      continue;
    const source = await readFile(join(root, name));
    await Promise.all([
      writeFile(join(root, name + ".gz"), gzipSync(source)),
      writeFile(
        join(root, name + ".br"),
        brotliCompressSync(source, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
        }),
      ),
    ]);
  }
}
