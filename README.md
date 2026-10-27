# Asli Byaaj 5150

**Paste a loan offer. See what actually reaches your pocket, what you repay, and the real cost.**

A bilingual English / Hindi loan-cost terminal for the Code for a Billion hackathon, Financial Inclusion track. Built with Next.js 16, TypeScript and Tailwind CSS v4 for Vercel. The beige terminal, moonlit mountains, stone ruins and thermal receipt are original code and SVG, inspired by the supplied visual references.

## Why it matters

A quoted fee or a small instalment can obscure the cost of a loan. Upfront deductions reduce the money a borrower receives, while frequent repayments change the annualised rate. Asli Byaaj makes those cash flows visible and helps people ask better questions before agreeing.

- TODO(Sir): add sourced figure about digital borrowing or access to formal credit, with publication date and primary-source URL.
- TODO(Sir): add sourced figure about borrower complaints or hidden charges, with publication date and primary-source URL.
- TODO(Sir): add actual pilot results and consented participant quotes. Do not substitute demo clicks for real impact.

Source starting points: [RBI](https://www.rbi.org.in), [RBI Sachet](https://sachet.rbi.org.in), and the official scheme links below. No usage statistics, market-size estimates or impact outcomes have been invented.

## Try it: do X → see Y

1. Run `npm install`, then `npm run dev`. Open `http://localhost:3000`.
2. Choose **Instant loan app** → the parser fills the principal, fee and repayment schedule. This is a fictional example, not a real lender quote.
3. Inspect the amounts and assumptions, then confirm them → **Show me the real cost** becomes available.
4. Print → see received money, total repayment, rupee cost, nominal and effective APR, and the illustrative shark meter.
5. Try `10,000 milega, 7 din me 12,000 wapas` or `2k per week for 6 weeks on 10k` → review a Hinglish bullet loan or weekly instalments.
6. Choose **Buy now, pay later** → the illustrative zero-fee, zero-interest example returns zero APR. Real BNPL offers may have other charges; enter them yourself.
7. Use **Enter manually** → edit upfront processing fees, GST, insurance, other deductions and a bullet, equal daily/weekly/monthly EMI or custom schedule. Custom days are offsets from disbursal; day one is the following day.
8. Open the borrower safety checklist and answer a question → any triggered concern includes an RBI reference and a complaint draft to review, copy and send yourself.
9. Change **Compare at X% per year** and print again → see the hypothetical saving for the same received amount and payment dates. The default is an **example rate, check with your bank**, not an advertised lender rate.
10. Toggle **EN / हिंदी**, copy the receipt or open **Share on WhatsApp** → the selected-language receipt is ready for you to send. Nothing is sent automatically.
11. Optionally click **This helped me** → increment an anonymous temporary server counter. It is not a count of unique people.

## How the APR is computed

All financial results come from pure code in `src/lib/loan.ts`. Parsing uses regex and heuristics, not a language model.

Let `P` be principal, `D` be all upfront deductions and `R = P − D` be the amount received. Each repayment has a positive amount `Aᵢ` due `dᵢ` whole days after receipt. We solve for daily rate `r`:

```text
R = Σ Aᵢ / (1 + r)^dᵢ
nominal annual APR (%) = 100 × 365 × r
effective annual APR (%) = 100 × ((1 + r)^365 − 1)
total cost = Σ Aᵢ − R
cost per ₹100 received = 100 × total cost / R
```

The solver uses Newton iteration in `q = log(1 + r)` space, with a bracketed bisection fallback. Log-sum-exp prevents overflow while evaluating discounted repayments. One positive disbursal followed only by positive repayments gives a unique root. Zero-cost loans return exactly zero; subsidised negative-cost loans can return a negative rate.

For the test case of receiving ₹4,500 and repaying ₹6,500 after 30 days, the independent closed form is `r = (6500 / 4500)^(1/30) − 1`. Tests compare both annualisations against that expression, and verify weekly annuities and irregular repayments by discounting them back to the received amount.

The large **TRUE APR** figure is the **effective annual rate**. The nominal annual rate is also shown. This is our transparent cash-flow annualisation, not a claim that a particular lender’s regulatory KFS uses the same convention. Annualising a short, expensive loan can produce a huge percentage; it does not mean the borrower is billed for a full year or must renew the loan. The actual rupee cost is displayed separately. Rates above 10,000% are displayed as `>10,000%`. A mathematical overflow is serialised as `effectiveApr: null` with `aprCapped: true`; other computed values remain finite.

Monthly instalments use **30-day intervals**, explicitly disclosed in the form. Enter custom offsets for exact calendar dates. The model assumes a single disbursal, upfront deductions and positive repayments; it excludes unknown late fees, contingent charges, future redraws and changes in terms.

Validation caps: ₹100,000,000 per amount, 1,200 repayments, 36,500 days, total repayments up to ₹1,000,000,000. Currency accepts at most two decimal places. Received money must reconcile with principal less deductions. Text is limited to 2,048 UTF-8 bytes; JSON bodies are streamed with a 128 KiB cap.

## Comparisons and red flags

The comparison rate is user editable and defaults to 12% **for illustration only**. It is a nominal annual rate compounded daily. The comparison holds the received amount and payment days fixed, preserving relative payment sizes and scaling them to the chosen rate. This is an equal-instalment annuity comparison for equal EMIs and a proportional schedule for custom payments. Comparison fees and taxes are excluded, so request an actual all-in quote. Savings never become a misleading negative saving: when the entered loan is cheaper, we show zero savings and explain the extra comparison cost.

Static official starting points:

| Option | Who might explore it | Official information |
| --- | --- | --- |
| PM SVANidhi | Eligible street vendors | [PM SVANidhi](https://pmsvanidhi.mohua.gov.in) |
| PM Mudra Shishu | Small non-farm businesses | [MUDRA](https://www.mudra.org.in) |
| Kisan Credit Card | Eligible farmers and allied activities | [myScheme](https://www.myscheme.gov.in/schemes/kcc) |
| Bank gold loan | People with gold they can pledge; collateral is at risk | [SBI](https://sbi.co.in/web/personal-banking/loans/gold-loan/personal-gold-loans) |
| SHG bank linkage / NRLM | Eligible self-help group members | [NRLM](https://aajeevika.gov.in) |
| Credit card EMI vs app | Existing cardholders comparing total fees and interest | [RBI](https://www.rbi.org.in); obtain your issuer’s quote |

No interest rates or guaranteed approvals are attributed to these options. A credit card is not necessarily cheaper.

`FAIR_APR_MAX = 24` and `COSTLY_APR_MAX = 60` in `flags.ts` define illustrative effective-APR tiers: 🐟 fair up to the first threshold, 🐡 costly up to the second, 🦈 loan shark above it. **These are product labels, not RBI thresholds, legal findings or lender endorsements.** A low APR does not certify a lender’s conduct.

Checklist questions cover KFS/APR disclosure, direct bank disbursal, identification of the regulated lender, broad phone permissions, threats/contact calls, unsolicited limit increases, cooling-off exit and undisclosed deductions. Unanswered questions remain unknown. Explanations refer generally to **RBI’s digital lending rules (RBI Digital Lending Guidelines 2022 / Digital Lending Directions 2025)** and link to [RBI](https://www.rbi.org.in); applicable exceptions and current provisions should be checked there.

Complaint drafts are user-reviewed concerns, not allegations established by the app. They include [Sachet](https://sachet.rbi.org.in) with a scope caveat and [RBI CMS](https://cms.rbi.org.in) where appropriate. Harassment answers additionally surface [cybercrime reporting](https://cybercrime.gov.in) and **1930 for financial cyber fraud**. For immediate danger, contact local emergency services. The user privately adds identifying details and sends the draft themselves.

## No-key, local and optional model behaviour

No external service is needed for parsing, calculations, comparisons, checklists, explanations or complaints. Missing credentials, invalid output, timeouts and upstream errors all use deterministic wording. There are no fake lender responses or made-up live data in this mode.

**Keep this check on my device** runs the same deterministic check in the browser without sending the offer to the API. If the network is unavailable, the UI can also produce an explicitly marked local result. API rate-limit errors remain visible rather than being silently retried. The app must first be loaded: it does not install a service worker or promise a cold-start offline page.

Optional server environment variable:

```dotenv
NEBIUS_API_KEY=
```

Copy `.env.example` to `.env.local` if you want the optional wording feature, and set the value privately. Never commit it. With a key, `llm.ts` follows the qloo Nebius pattern:

- Endpoint: `https://api.tokenfactory.nebius.com/v1/chat/completions`
- Model: `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`
- `/no_think`, `enable_thinking: false`, `max_tokens: 400`, bounded timeout.
- The service receives **only a cost-category label**, never raw text, numbers, checklist answers, names or contact information.
- It chooses an approved opener and closer for a friendly, non-numeric, two-line Hinglish summary. Unknown wording is rejected. It cannot supply financial numbers, legal findings or recommendations.
- Every financial calculation, bilingual explainer and complaint remains deterministic. Tests use mocked service responses, not billable calls.

## API and data policy

`POST /api/check` accepts `text?: string`, `offer?: Offer`, `flags?: Record<string, boolean>` and `compareRate?: number`. A supplied structured offer takes precedence; text is still validated for type and size. Unknown checklist keys are rejected. Text-only API clients must surface the returned assumptions for confirmation, as the UI does.

```json
{
  "offer": {
    "principal": 5000,
    "deductions": { "processingFee": 500, "gst": 0, "insurance": 0, "other": 0 },
    "amountReceived": 4500,
    "repayment": { "kind": "bullet", "dayOffset": 30, "amount": 6500 }
  },
  "flags": { "kfs": false },
  "compareRate": 12
}
```

Other schedules are `{ "kind": "emi", "frequency": "weekly", "count": 6, "amount": 2000, "firstDay": 7 }` or `{ "kind": "custom", "payments": [{ "dayOffset": 30, "amount": 6500 }] }`. The first EMI day defaults to one interval. Full types live in `src/lib/loan.ts`.

The response includes `{ offer, assumptions, result, flags, answeredFlags, shark, alternatives, explainer, complaintDraft?, summary, mode }`. `mode` is `template` or `nebius`; the UI’s local path adds `local`. Invalid input returns 400, a limit returns 429 with `Retry-After`, and unexpected check errors return a generic 500. Responses use `Cache-Control: no-store`.

`GET /api/count` returns `{ count, scope }`. `POST /api/count` accepts **only** `{ "helped": true }`; extra identifying fields are rejected. This opt-in, in-memory counter starts at zero, stores no event details and resets with the process. The UI disables repeat votes in the current page session. It is neither a deduplicated user count nor durable evidence of impact. Counter bursts are limited without collecting identities.

No database, accounts, analytics, cookies or local-storage histories are used. No offers, pasted text, contact data, checklist answers, complaints or individual vote records are logged or persisted by the app. Only the edited numeric offer and answers go to the normal check API. The local option avoids that request. Sharing opens WhatsApp with the receipt text and requires the user to send it. Clipboard operations happen only on user action.

The check limiter allows **20 requests per IP per rolling hour** and **2,000 accepted requests per UTC day**, shared within the process. Its transient request buckets expire; raw IP addresses are not stored in them. Vercel’s overwritten forwarding header is trusted on Vercel. Outside Vercel, configure the reverse proxy to overwrite forwarding headers. Hosting infrastructure may retain network/request metadata under its own policy.

**Deployment limitation:** the qloo-style limiter and counter are in memory. Vercel can run multiple independent instances and restart them. The daily cap is therefore process-wide, not an enforceable fleet-wide cap, and counts may reset or differ between requests. Before a public rollout requiring a hard global budget or durable impact counter, replace these with a shared atomic store and a retention policy. Never present the temporary counter as a verified pilot study.

## Run and validate

```bash
npm install
npm test
npm run typecheck
npm run build
npm start
```

`npm run lint` is also available. The inherited Vitest toolchain reports development-only npm audit advisories; production dependencies pass `npm audit --omit=dev`. The requested qloo package versions are retained; upgrading the test toolchain is a separate maintenance item. The test suite covers independent IRR formulas and NPV checks, bisection fallback, extreme and negative rates, all schedules, numeric bounds, parsing and assumptions, flags, tier boundaries, comparison savings, bilingual receipts/complaints, wording isolation, route handlers, byte caps and rate limits. The mobile UI supports keyboard interaction, visible focus, Hindi fonts and reduced-motion preferences. Receipt animation is disabled for users who prefer reduced motion.

Package versions, the Vitest configuration, limiter structure, Nebius request pattern and original night-scene code are adapted from `/workspace/devpost/qloo`. `vercel.json` explicitly uses `npm install --include=dev`. Google fonts are integrated with `next/font/google` (VT323, IBM Plex Mono, Noto Sans Devanagari) and served by Next.js after build; a build needs access to fetch those fonts.

## Deploy to Vercel

1. Run the checks above and review the in-memory limitations.
2. Import this directory’s repository into Vercel as a Next.js project.
3. Keep the root directory at the app root; use `npm run build`. The checked-in install command includes dev dependencies for the build.
4. Optionally set `NEBIUS_API_KEY` in Vercel’s project environment settings. Without it, all core features still work.
5. Deploy when authorised, then check a demo receipt and both API routes.

No deployment or push was performed as part of this build.

## AgentFoundry and submission

**TODO(Sir): create/import the project at [AgentFoundry](https://agentfoundry.me), use it for a real part of the work, and document exactly what you built there with a project link and evidence.** No AgentFoundry usage or hackathon eligibility is claimed yet.

**TODO(Sir): conduct the real borrower pilot with consent, record actual results and quotes, add sourced problem figures, and prepare the submission.** The app’s demo examples and temporary counter are not a substitute. Review the hackathon’s current requirements and submit only when authorised.

## License and reference assets

MIT — Copyright (c) 2026 Kulraj Singh. See [LICENSE](LICENSE).

The supplied reference PNGs are ignored by Git, remain outside `public/` and are not shipped. All visible scenery is SVG/CSS. `.env*`, secret/key files and deployment metadata are ignored; `.env.example` is the intentionally empty template.
