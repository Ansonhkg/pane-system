import type { PackageProvider } from "../core/contracts/module";
export async function servePackage(options: {
  provider: PackageProvider;
  run(operation: string, input: unknown): Promise<unknown>;
  port: number;
}) {
  const token = crypto.randomUUID();
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: options.port,
    async fetch(request) {
      if (request.headers.get("authorization") !== "Bearer " + token)
        return Response.json({ error: "Forbidden" }, { status: 403 });
      try {
        const data: unknown = await request.json();
        if (
          !data ||
          typeof data !== "object" ||
          !("operation" in data) ||
          typeof data.operation !== "string"
        )
          throw new Error("Supply an operation.");
        return Response.json(
          await options.run(data.operation, "input" in data ? data.input : {}),
        );
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 400 });
      }
    },
  });
  return {
    url: server.url.toString(),
    token,
    dispose() {
      server.stop();
      options.provider.application.dispose();
    },
  };
}
