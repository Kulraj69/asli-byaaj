import { describe, expect, it } from "vitest";
import { parseAmount, parseOffer } from "@/lib/parse";
import { EXAMPLES } from "@/lib/examples";
describe("English and Hinglish offer parsing", () => {
  it("reads the fee before a 30-day repayment", () => {
    const parsed = parseOffer("₹5000 loan, ₹500 processing fee, repay 6500 in 30 days");
    expect(parsed.offer.principal).toBe(5000); expect(parsed.offer.amountReceived).toBe(4500);
    expect(parsed.offer.deductions.processingFee).toBe(500);
    expect(parsed.offer.repayment).toEqual({ kind: "bullet", dayOffset: 30, amount: 6500 });
    expect(parsed.assumptions.length).toBeGreaterThan(2);
  });
  it("reads milega, din and wapas without swapping loan and repayment", () => {
    const parsed = parseOffer("10,000 milega, 7 din me 12,000 wapas");
    expect(parsed.offer.amountReceived).toBe(10000);
    expect(parsed.offer.repayment).toEqual({ kind: "bullet", dayOffset: 7, amount: 12000 });
  });
  it("reads shorthand weekly instalments", () => {
    const parsed = parseOffer("2k per week for 6 weeks on 10k");
    expect(parsed.offer.principal).toBe(10000);
    expect(parsed.offer.repayment).toEqual({ kind: "emi", frequency: "weekly", amount: 2000, count: 6 });
  });
  it.each(["₹", "Rs ", "rs. ", "INR "])("supports the %s prefix", currency => {
    const parsed = parseOffer(`${currency}5000 loan, ${currency}500 fee, repay ${currency}6000 in 30 days`);
    expect(parsed.offer.amountReceived).toBe(4500);
    expect(parsed.offer.repayment.kind).toBe("bullet");
  });
  it("reads lakh with decimals", () => {
    const parsed = parseOffer("INR 1 lakh loan, processing fee Rs. 2k, repay 1.1 lakh in 12 months");
    expect(parsed.offer.amountReceived).toBe(98000);
    expect(parsed.offer.repayment).toEqual({ kind: "bullet", amount: 110000, dayOffset: 360 });
    expect(parsed.assumptions.join(" ")).toContain("30 days");
  });
  it("reads Indian grouping and lacs", () => { expect(parseAmount("Rs. 1,50,000")).toBe(150000); expect(parseAmount("1.5 lacs")).toBe(150000); });
  it("reads each upfront deduction", () => {
    const parsed = parseOffer("5000 loan, 500 processing fee, 90 GST, 100 insurance, 10 other deductions, repay 6000 in 30 days");
    expect(parsed.offer.deductions).toEqual({ processingFee: 500, gst: 90, insurance: 100, other: 10 });
    expect(parsed.offer.amountReceived).toBe(4300);
  });
  it("uses an explicit fee percentage and GST percentage with stated bases", () => {
    const parsed = parseOffer("5000 loan, 10% processing fee, 18% GST, repay 6000 in 30 days");
    expect(parsed.offer.deductions.processingFee).toBe(500); expect(parsed.offer.deductions.gst).toBe(90);
  });
  it("treats milega as net and reconstructs the gross principal when fees are explicit", () => {
    const parsed = parseOffer("4500 milega, 500 processing fee, 30 din me 6500 wapas");
    expect(parsed.offer.principal).toBe(5000); expect(parsed.offer.amountReceived).toBe(4500);
  });
  it.each(EXAMPLES)("parses the $name.en example", example => { expect(parseOffer(example.text).offer.principal).toBeGreaterThan(0); });
  it("parses daily and monthly instalments", () => {
    expect(parseOffer("100 per day for 12 days on 1000").offer.repayment).toEqual({ kind: "emi", amount: 100, count: 12, frequency: "daily" });
    expect(parseOffer("1000 per month for 6 months on 5000").offer.repayment).toEqual({ kind: "emi", amount: 1000, count: 6, frequency: "monthly" });
  });
  it.each(["", "a good loan", "5000 loan", "5000 loan, repay 6000", "2k per week for 3 months on 10k"])("asks for manual clarification of %s", text => { expect(() => parseOffer(text)).toThrow(); });
  it("enforces bytes rather than just character count", () => { expect(() => parseOffer("₹".repeat(700))).toThrow(/2 KB/); });
  it.each(["-5000 loan, repay 6500 in 30 days", "5000 loan, fee -500, repay 6500 in 30 days", "5000 loan, repay -₹6000 in 30 days"])("rejects a negative term rather than dropping its sign: %s", text => { expect(() => parseOffer(text)).toThrow(/positive/); });
  it("rejects negative, ambiguous percentage net and enormous values", () => {
    expect(() => parseAmount("-2k")).toThrow(); expect(() => parseAmount("999999 lakh")).toThrow();
    expect(() => parseOffer("4500 milega, 10% fee, repay 6000 in 30 days")).toThrow(/ambiguous/);
  });
});
