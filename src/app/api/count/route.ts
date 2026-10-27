import { helpCounter } from "@/lib/counter";
import { json, readJson } from "@/lib/http";
import { record } from "@/lib/loan";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() { return json({ count: helpCounter.get(), scope: "this server instance; resets on restart; not unique people" }); }
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Use the button on this site." }, 403);
    const input = record(await readJson(request, 256));
    if (input.helped !== true || Object.keys(input).length !== 1) return json({ error: "Send only { helped: true } to opt in." }, 400);
    const count = helpCounter.increment();
    if (count === null) return json({ error: "Please try again shortly." }, 429, { "Retry-After": "60" });
    return json({ count, scope: "this server instance; resets on restart; not unique people" });
  } catch { return json({ error: "Send only { helped: true } to opt in." }, 400); }
}
