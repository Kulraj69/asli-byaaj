import { InputError } from "./loan";
export const MAX_BODY_BYTES = 128 * 1_024;
export async function readJson(request: Request, cap = MAX_BODY_BYTES): Promise<unknown> {
  const size = request.headers.get("content-length");
  if (size && Number(size) > cap) throw new InputError("Request body is too large.");
  if (!request.headers.get("content-type")?.includes("application/json")) throw new InputError("Send application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Send a JSON body.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > cap) { await reader.cancel(); throw new InputError("Request body is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const merged = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(merged)); }
  catch { throw new InputError("Send valid JSON."); }
}
export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
