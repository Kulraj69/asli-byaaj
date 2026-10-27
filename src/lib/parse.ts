import { emptyDeductions, InputError, MAX_MONEY, roundMoney, validateOffer, type Offer, type Repayment } from "./loan";
export const MAX_TEXT_BYTES = 2_048;
const AMOUNT = String.raw`((?:\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|k\b)?)`;
const CURRENCY = String.raw`(?:₹\s*|rs\.?\s*|inr\s*)?`;
const MONEY = CURRENCY + AMOUNT;
export function parseAmount(value: string): number {
  const cleaned = value.toLowerCase().replace(/₹|\brs\.?|\binr|,/g, "").trim();
  if (!/^\d+(?:\.\d+)?\s*(?:k|lakhs?|lacs?)?$/.test(cleaned)) throw new InputError("Could not read a money amount.");
  const multiplier = /lakh|lac/.test(cleaned) ? 100_000 : /k$/.test(cleaned) ? 1_000 : 1;
  const amount = roundMoney(parseFloat(cleaned) * multiplier);
  if (!Number.isFinite(amount) || amount > MAX_MONEY) throw new InputError("Money amount is outside the supported range.");
  return amount;
}
function matchMoney(text: string, patterns: string[]): number | undefined {
  for (const pattern of patterns) {
    const found = text.match(new RegExp(pattern, "i"));
    if (found) return parseAmount(found[1]);
  }
}
export type ParsedOffer = { offer: Offer; assumptions: string[] };
export function parseOffer(raw: string): ParsedOffer {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_TEXT_BYTES || !raw.trim()) throw new InputError("Paste an offer of up to 2 KB, or use the form.");
  const text = raw.toLowerCase().replace(/(?<=\d),(?=\d)/g, "").replace(/\s+/g, " ");
  if (/-\s*(?:₹|rs\.?|inr)?\s*\d/.test(text)) throw new InputError("Use positive amounts and due days; negative terms are not supported.");
  const assumptions = ["All amounts are in rupees. Confirm every amount and due date before printing."];
  const statedReceived = matchMoney(text, [MONEY + String.raw`\s*(?:milega|milenge|received|in hand)\b`, String.raw`(?:receive|received|get in hand)\s*` + MONEY]);
  let principal = matchMoney(text, [MONEY + String.raw`\s*(?:loan|principal|borrowed)\b`, String.raw`(?:loan(?: of)?|principal(?: of)?|borrow(?:ed)?|on)\s*[:=]?\s*` + MONEY]);
  if (principal === undefined) principal = statedReceived;
  if (principal === undefined || principal <= 0) throw new InputError('Add the loan amount, for example "₹5000 loan" or "10,000 milega". Or enter the form manually.');
  const deductions = emptyDeductions();
  const labels = { processingFee: "(?:processing(?: fee)?|fee)", gst: "gst", insurance: "insurance", other: "(?:other(?: deductions?)?|deduction)" };
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    const label = labels[key];
    const amount = matchMoney(text, [MONEY + String.raw`\s*` + label + String.raw`\b`, label + String.raw`\s*[:=]?\s*` + MONEY]);
    if (amount !== undefined) deductions[key] = amount;
    // Explicit percentages are calculated only against the stated basis.
    const percent = text.match(new RegExp(String.raw`(\d+(?:\.\d+)?)\s*%\s*` + label)) ?? text.match(new RegExp(label + String.raw`\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%`));
    if (percent) {
      if (statedReceived !== undefined && key !== "gst") throw new InputError("A percentage deduction with an in-hand amount is ambiguous. Enter the principal and rupee deductions in the form.");
      deductions[key] = roundMoney((key === "gst" ? deductions.processingFee : principal) * Number(percent[1]) / 100);
      assumptions.push(`${key === "gst" ? "GST is applied to the processing fee" : "Percentage deduction is applied to the principal"}; confirm the rupee amount.`);
    }
  }
  const totalDeductions = Object.values(deductions).reduce((sum, n) => sum + n, 0);
  if (statedReceived !== undefined && !new RegExp(MONEY + String.raw`\s*(?:loan|principal)\b`).test(text) && totalDeductions > 0) {
    principal = roundMoney(statedReceived + totalDeductions);
    assumptions.push('“Milega / received” means money in hand. The stated deductions are added to reconstruct the principal.');
  }
  const amountReceived = statedReceived ?? roundMoney(principal - totalDeductions);
  assumptions.push("Listed fees, GST, insurance and other deductions are taken upfront. Unmentioned deductions are set to zero; check them.");
  const unit = String.raw`(days?|din|weeks?|hafte|hafta|months?|mahine|mahina)`;
  const emi = text.match(new RegExp(MONEY + String.raw`\s*(?:per|every|a|/)\s*` + unit + String.raw`\s*(?:for|x|×)\s*(\d+)\s*` + unit));
  let repayment: Repayment;
  if (emi) {
    const frequency = /week|haft/.test(emi[2]) ? "weekly" : /month|mah/.test(emi[2]) ? "monthly" : "daily";
    const countUnit = /week|haft/.test(emi[4]) ? "weekly" : /month|mah/.test(emi[4]) ? "monthly" : "daily";
    if (frequency !== countUnit) throw new InputError("Instalment frequency and duration use different units. Enter the schedule in the form.");
    repayment = { kind: "emi", frequency, count: Number(emi[3]), amount: parseAmount(emi[1]) };
    assumptions.push(`Equal ${frequency} repayments; the first is due after one full interval. Monthly means 30 days. Use custom dates for exact due days.`);
  } else {
    const amount = matchMoney(text, [String.raw`(?:repay(?:ment)?|pay back|return|wapas)\s*[:=]?\s*` + MONEY, MONEY + String.raw`\s*(?:wapas|repayment|back)\b`]);
    const duration = text.match(new RegExp(String.raw`(\d+)\s*` + unit + String.raw`\b`));
    if (amount === undefined || !duration) throw new InputError('Add the repayment and term, such as "repay 6500 in 30 days", or use the form.');
    const multiplier = /week|haft/.test(duration[2]) ? 7 : /month|mah/.test(duration[2]) ? 30 : 1;
    repayment = { kind: "bullet", amount, dayOffset: Number(duration[1]) * multiplier };
    assumptions.push("One repayment at the end of the stated term, counted from receipt of the money. No interim payments or late charges included.");
    if (multiplier === 30) assumptions.push("A month is approximated as 30 days. Edit the due day if your actual date differs.");
  }
  return { offer: validateOffer({ principal, deductions, amountReceived, repayment }), assumptions };
}
