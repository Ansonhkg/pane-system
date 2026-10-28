export async function assetResponse(
  request: Request,
  file: string,
  asset: ReturnType<typeof Bun.file>,
) {
  let encoded = asset;
  let encoding = "";
  const accept = request.headers.get("accept-encoding") ?? "";
  for (const candidate of ["br", "gzip"]) {
    const suffix = candidate === "br" ? ".br" : ".gz";
    const compressed = Bun.file(file + suffix);
    if (accept.includes(candidate) && (await compressed.exists())) {
      encoded = compressed;
      encoding = candidate;
      break;
    }
  }
  return new Response(encoded, {
    headers: {
      "cache-control": "no-cache",
      "content-type": asset.type,
      ...(encoding
        ? { "content-encoding": encoding, vary: "Accept-Encoding" }
        : {}),
      "x-content-type-options": "nosniff",
    },
  });
}
