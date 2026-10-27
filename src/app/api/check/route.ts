import { checkOffer } from "@/lib/check";
import { readJson, json } from "@/lib/http";
import { InputError } from "@/lib/loan";
import { polishSummary } from "@/lib/llm";
import { checkLimiter, clientIp } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const limit = checkLimiter.take(clientIp(request));
  if (!limit.ok) return json({ error: limit.note }, 429, { "Retry-After": String(limit.retryAfter) });
  try {
    const checked = checkOffer(await readJson(request));
    const wording = await polishSummary(checked.shark.tier, { apiKey: process.env.NEBIUS_API_KEY, signal: request.signal });
    return json({ ...checked, ...wording }, 200, { "X-RateLimit-Remaining": String(limit.remaining) });
  } catch (error) {
    return json({ error: error instanceof InputError ? error.message : "Could not check this offer. Please review the form." }, error instanceof InputError ? 400 : 500);
  }
}
