import { describe, expect, it, vi } from "vitest";
import { checkOffer } from "@/lib/check";
import { receiptText } from "@/lib/explain";
import { FALLBACK_SUMMARY, NEBIUS_MODEL, polishSummary } from "@/lib/llm";
const input = { text: "5000 loan, 500 fee, repay 6500 in 30 days" };
describe("deterministic bilingual explanations", () => {
  it("uses the computed rupee amounts in English, Hindi and the shared receipt", () => {
    const checked = checkOffer(input);
    expect(checked.explainer.en).toContain("₹4,500"); expect(checked.explainer.hi).toContain("₹6,500");
    expect(receiptText(checked.result)).toContain(checked.result.aprDisplay);
    expect(receiptText(checked.result, "hi")).toContain("₹2,000");
  });
  it("omits complaints without answered red flags", () => { expect(checkOffer(input).complaintDraft).toBeUndefined(); });
  it("creates a concern for review, never a verdict, in both languages", () => {
    const draft = checkOffer({ ...input, flags: { kfs: false } }).complaintDraft!;
    expect(draft.en).toContain("not a finding of a violation"); expect(draft.en).toContain("https://sachet.rbi.org.in");
    expect(draft.hi).toContain("मसौदा"); expect(draft.en).not.toContain("1930");
  });
});
describe("optional wording only", () => {
  it("uses the fallback without calling any service when no key is set", async () => {
    const fetcher = vi.fn();
    expect(await polishSummary("shark", { fetch: fetcher })).toEqual({ summary: FALLBACK_SUMMARY, mode: "template" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("accepts only approved, non-numeric Hinglish wording", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify({ opener: "Apne paise ka hisaab, apne haath.", closer: "Shartein padho, sawaal poochho." }) } }] }));
    const output = await polishSummary("shark", { apiKey: "test-placeholder", fetch: fetcher });
    expect(output.mode).toBe("nebius"); expect(output.summary.split("\n")).toHaveLength(2);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.model).toBe(NEBIUS_MODEL); expect(body.max_tokens).toBe(400); expect(body.messages[0].content).toContain("/no_think");
    expect(body.messages[1].content).toBe('{"costCategory":"shark"}');
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it.each(["<think>hidden</think>", "not json", '{"opener":"APR is 50%","closer":"Guaranteed approval"}', '{"opener":"This lender is illegal","closer":"Act now"}'])("rejects untrusted response %s", async content => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content } }] }));
    expect((await polishSummary("fair", { apiKey: "test-placeholder", fetch: fetcher })).mode).toBe("template");
  });
  it("falls back on service failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("unavailable"));
    expect((await polishSummary("fair", { apiKey: "test-placeholder", fetch: fetcher })).summary).toBe(FALLBACK_SUMMARY);
  });
  it("falls back on a non-success status", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    expect((await polishSummary("fair", { apiKey: "test-placeholder", fetch: fetcher })).mode).toBe("template");
  });
});
