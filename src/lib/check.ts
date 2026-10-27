import { calculateLoan, InputError, record, validateOffer } from "./loan";
import { MAX_TEXT_BYTES, parseOffer } from "./parse";
import { FLAG_QUESTIONS, evaluateFlags, sharkTier } from "./flags";
import { compareAlternative, DEFAULT_COMPARE_RATE } from "./alternatives";
import { complaintDraft, explainLoan } from "./explain";
import { FALLBACK_SUMMARY } from "./llm";
/** Shared by the API and the browser's explicit local-only fallback. */
export function checkOffer(input: unknown) {
  const body = record(input);
  if (body.text !== undefined && (typeof body.text !== "string" || new TextEncoder().encode(body.text).length > MAX_TEXT_BYTES)) throw new InputError("Offer text must be a string of up to 2 KB.");
  if (body.offer === undefined && !body.text) throw new InputError("Paste an offer or complete the form.");
  const parsed = body.offer !== undefined ? { offer: validateOffer(body.offer), assumptions: [] as string[] } : parseOffer(body.text as string);
  const answers: Record<string, boolean> = {};
  if (body.flags !== undefined) {
    if (!body.flags || typeof body.flags !== "object" || Array.isArray(body.flags)) throw new InputError("Checklist answers must be yes or no.");
    const allowed = new Set(FLAG_QUESTIONS.map(flag => flag.id));
    for (const [key, value] of Object.entries(body.flags)) {
      if (!allowed.has(key) || typeof value !== "boolean") throw new InputError("Unknown checklist question or invalid yes/no answer.");
      answers[key] = value;
    }
  }
  if (body.compareRate !== undefined && typeof body.compareRate !== "number") throw new InputError("Comparison rate must be a number.");
  const result = calculateLoan(parsed.offer);
  const flags = evaluateFlags(answers);
  const shark = sharkTier(result.effectiveApr);
  const alternatives = compareAlternative(result, body.compareRate as number | undefined ?? DEFAULT_COMPARE_RATE);
  return { ...parsed, result, flags, answeredFlags: Object.keys(answers).length, shark, alternatives, explainer: explainLoan(result, alternatives), complaintDraft: complaintDraft(parsed.offer, result, flags), summary: FALLBACK_SUMMARY, mode: "template" as "template" | "nebius" | "local" };
}
export type CheckResponse = ReturnType<typeof checkOffer>;
