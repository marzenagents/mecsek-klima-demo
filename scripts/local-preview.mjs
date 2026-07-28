import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../dist/server/index.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const portArgument = process.argv.find((value) => /^\d+$/.test(value));
const port = Number(portArgument ?? 5055);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function assetResponse(request) {
  const url = new URL(request.url);
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const base = relative.startsWith("assets/") ? join(root, "dist", "client") : join(root, "public");
  const filePath = normalize(join(base, relative));
  if (!filePath.startsWith(normalize(base))) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const origin = `http://${incoming.headers.host ?? `127.0.0.1:${port}`}`;
    const request = new Request(new URL(incoming.url ?? "/", origin), {
      method: incoming.method,
      headers: incoming.headers,
    });
    const response = new URL(request.url).pathname.startsWith("/assets/")
      ? await assetResponse(request)
      : await worker.fetch(
        request,
        { ASSETS: { fetch: assetResponse } },
        { waitUntil() {}, passThroughOnException() {} },
      );
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end(error instanceof Error ? error.message : "Local preview error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mecsek Klíma local preview: http://127.0.0.1:${port}`);
});
