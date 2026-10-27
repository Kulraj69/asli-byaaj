import { record } from "./loan";
export const NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1/chat/completions";
export const NEBIUS_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";
export const FALLBACK_SUMMARY = "Chhoti EMI? Poora hisaab dekho.\nPehle samjho, phir haan bolo.";
// Only a category is sent. No raw offer, money, dates, checklist answers or PII.
// To keep all factual claims deterministic, model output may only select approved
// non-numeric phrases. A novel phrase falls back; it can never change the receipt.
const OPENERS = ["Chhoti EMI? Poora hisaab dekho.", "Loan lene se pehle, poori baat samjho.", "Apne paise ka hisaab, apne haath."];
const CLOSERS = ["Pehle samjho, phir haan bolo.", "Shartein padho, sawaal poochho.", "Bank se poochho, phir faisla lo."];
export async function polishSummary(tier: string, options: { apiKey?: string; fetch?: typeof fetch; signal?: AbortSignal } = {}) {
  const fallback = { summary: FALLBACK_SUMMARY, mode: "template" as const };
  if (!options.apiKey?.trim()) return fallback;
  try {
    const timeout = AbortSignal.timeout(8_000);
    const response = await (options.fetch ?? fetch)(NEBIUS_URL, {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${options.apiKey.trim()}`, "Content-Type": "application/json" },
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      body: JSON.stringify({ model: NEBIUS_MODEL, max_tokens: 400, temperature: 0.7,
        chat_template_kwargs: { enable_thinking: false },
        messages: [
          { role: "system", content: `/no_think\nCompose a friendly two-line Hinglish reminder by selecting one exact opener and one exact closer. Return only JSON with string keys "opener" and "closer". No extra wording, numbers, claims, markdown or advice. Openers: ${JSON.stringify(OPENERS)}. Closers: ${JSON.stringify(CLOSERS)}.` },
          { role: "user", content: JSON.stringify({ costCategory: ["fair", "costly", "shark"].includes(tier) ? tier : "costly" }) },
        ] }),
    });
    if (!response.ok) return fallback;
    const body = record(await response.json());
    const choices = Array.isArray(body.choices) ? body.choices : [];
    const content = record(record(choices[0]).message).content;
    if (typeof content !== "string" || content.length > 1_000 || /<\/?think>/i.test(content)) return fallback;
    const output = record(JSON.parse(content));
    if (typeof output.opener !== "string" || typeof output.closer !== "string" || !OPENERS.includes(output.opener) || !CLOSERS.includes(output.closer)) return fallback;
    return { summary: `${output.opener}\n${output.closer}`, mode: "nebius" as const };
  } catch { return fallback; }
}
