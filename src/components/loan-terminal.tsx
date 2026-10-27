"use client";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowDown, ArrowRight, Check, ChevronDown, Copy, Heart, Printer, ShieldCheck } from "lucide-react";
import { checkOffer, type CheckResponse } from "@/lib/check";
import { emptyDeductions, MAX_DAYS, MAX_MONEY, MAX_PAYMENTS, roundMoney, type Deductions, type Offer, type Repayment } from "@/lib/loan";
import { MAX_TEXT_BYTES, parseOffer } from "@/lib/parse";
import { EXAMPLES } from "@/lib/examples";
import { FLAG_QUESTIONS, FAIR_APR_MAX, COSTLY_APR_MAX, type Language } from "@/lib/flags";
import { DEFAULT_COMPARE_RATE } from "@/lib/alternatives";
import { receiptText, rupees } from "@/lib/explain";
const initialOffer: Offer = { principal: 5000, deductions: emptyDeductions(), amountReceived: 5000, repayment: { kind: "bullet", amount: 5500, dayOffset: 30 } };
export function LoanTerminal() {
  const [lang, setLang] = useState<Language>("en");
  const [text, setText] = useState("");
  const [offer, setOffer] = useState<Offer>(initialOffer);
  const [editing, setEditing] = useState(false);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [compareRate, setCompareRate] = useState(DEFAULT_COMPARE_RATE);
  const [localOnly, setLocalOnly] = useState(false);
  const [data, setData] = useState<CheckResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [helped, setHelped] = useState(false);
  const [countBusy, setCountBusy] = useState(false);
  const receiptRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const t = (en: string, hi: string) => lang === "en" ? en : hi;
  const received = roundMoney(offer.principal - Object.values(offer.deductions).reduce((a, b) => a + b, 0));
  function resetResult() { setData(null); setError(""); setNotice(""); }
  function edit(next: Offer) { setOffer(next); setConfirmed(false); resetResult(); }
  function setRepayment(repayment: Repayment) { edit({ ...offer, repayment }); }
  function readOffer(value = text) {
    resetResult();
    try {
      const parsed = parseOffer(value);
      setOffer(parsed.offer); setAssumptions(parsed.assumptions); setConfirmed(false); setEditing(true);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" }), 50);
    } catch (e) { setError(e instanceof Error ? e.message : "Please check the offer."); }
  }
  function manual() {
    resetResult(); setEditing(true); setAssumptions([]); setConfirmed(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" }), 50);
  }
  async function print(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true); setError(""); setNotice("");
    const payload = { offer: { ...offer, amountReceived: received }, flags: answers, compareRate };
    try {
      const local = checkOffer(payload);
      let checked: CheckResponse;
      if (localOnly) checked = { ...local, mode: "local" };
      else {
        let response: Response;
        try { response = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12_000) }); }
        catch { response = new Response("", { status: 503 }); }
        if (response.status === 503) {
          checked = { ...local, mode: "local" };
          setNotice(t("Connection unavailable. This receipt was calculated on your device.", "कनेक्शन उपलब्ध नहीं। यह रसीद आपके उपकरण पर गणना की गई है।"));
        } else {
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Could not check this offer.");
          checked = body;
        }
      }
      setData(checked);
      setTimeout(() => { receiptRef.current?.focus({ preventScroll: true }); receiptRef.current?.scrollIntoView({ behavior: "instant", block: "start" }); }, 50);
    } catch (e) { setError(e instanceof Error ? e.message : "Please check the form."); }
    finally { setBusy(false); }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice(t("Copied. Review before you send.", "कॉपी हो गया। भेजने से पहले जाँचें।")); }
    catch { setNotice(t("Copy is unavailable here. Select the receipt or draft text to copy it.", "यहाँ कॉपी उपलब्ध नहीं। रसीद या मसौदे का टेक्स्ट चुनकर कॉपी करें।")); }
  }
  async function helpedClick() {
    if (helped || countBusy) return;
    setCountBusy(true);
    try {
      const response = await fetch("/api/count", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ helped: true }), signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error();
      setHelped(true); setNotice(t("Thank you. One anonymous helpful-check vote added.", "धन्यवाद। एक गुमनाम उपयोगी-जाँच वोट जोड़ा गया।"));
    } catch { setNotice(t("Could not record your vote. Try again later.", "वोट दर्ज नहीं हुआ। बाद में कोशिश करें।")); }
    finally { setCountBusy(false); }
  }
  const lineStyle = (index: number): CSSProperties => ({ "--line": index } as CSSProperties);
  return <main lang={lang} className={lang === "hi" ? "app hindi" : "app"}>
    <a className="skip-link" href="#loan-input">{t("Skip to loan checker", "ऋण जाँच पर जाएँ")}</a>
    <header className="site-header">
      <a href="#" className="wordmark" aria-label="Asli Byaaj home"><span className="brand-symbol">अ</span><span>ASLI BYAAJ<span className="wordmark-sub">{t("A LITTLE CLARITY GOES A LONG WAY.", "सही हिसाब। साफ़ बात।")}</span></span></a>
      <div className="header-right"><span className="hackathon">CODE FOR A BILLION<span>FINANCIAL INCLUSION</span></span><div className="language-switch" aria-label="Language"><button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button><button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>हिंदी</button></div></div>
    </header>
    <div className="intro-strip"><span><i className="status-led" />{t("YOUR PERSONAL LOAN-COST TERMINAL", "आपका अपना ऋण लागत टर्मिनल")}</span><span>{t("NO SIGN-UP. NO SALES PITCH.", "न साइन-अप। न बिक्री का दबाव।")}</span></div>
    <section className="computer" aria-label={t("Loan cost calculator", "ऋण लागत कैलकुलेटर")}>
      <div className="hardware-top"><div className="model-plate"><span className="plate-lines" />ASLI BYAAJ <b>5150</b></div><div className="top-vents" aria-hidden="true"/><span className="hardware-serial">PERSONAL FINANCE COMPUTER</span></div>
      <div className="computer-grid">
        <div className="screen-bezel"><div className="crt-screen">
          <div className="screen-status"><span>AB-DOS / {t("LOAN CHECK", "ऋण जाँच")}</span><span>● {t("READY", "तैयार")}</span></div>
          <div className="screen-content">
            <p className="eyebrow">{t("BEFORE YOU SAY YES TO THAT LOAN", "ऋण के लिए हाँ कहने से पहले")}</p>
            <h1>{t("Small loan.", "छोटा ऋण।")}<br/><span>{t("Big picture.", "पूरा हिसाब।")}</span><span className="cursor" aria-hidden="true">_</span></h1>
            <p className="hero-copy">{t("The fee is small. The interest might not be. Find out what your loan really costs.", "शुल्क छोटा है। ब्याज शायद नहीं। जानें आपका ऋण असल में कितना महँगा है।")}</p>
            <div className="input-heading"><label htmlFor="loan-input"><span className="step-number">01</span>{t("PASTE YOUR LOAN OFFER", "अपना ऋण प्रस्ताव लिखें")}</label><span>EN / HINGLISH</span></div>
            <textarea id="loan-input" value={text} disabled={busy} maxLength={MAX_TEXT_BYTES} onChange={e => { setText(e.target.value); setEditing(false); resetResult(); }} placeholder={'₹5000 loan, ₹500 processing fee,\nrepay ₹6500 in 30 days…'} rows={3} aria-describedby="paste-note" />
            <div className="input-note" id="paste-note"><span>{t("Just the amounts & terms. Leave out personal details.", "सिर्फ़ रकम और शर्तें। निजी जानकारी न लिखें।")}</span><span>{new TextEncoder().encode(text).length}/2048 B</span></div>
            <div className="input-actions"><button type="button" className="primary-button" disabled={busy || !text.trim()} onClick={() => readOffer()}>{t("Read my offer", "प्रस्ताव पढ़ें")}<ArrowRight size={18}/></button><button type="button" className="text-button" disabled={busy} onClick={manual}>{t("or enter manually", "या खुद भरें")} <span>↗</span></button></div>
            <div className="examples-heading">{t("NO OFFER HANDY? TRY AN EXAMPLE", "प्रस्ताव नहीं है? उदाहरण देखें")}</div>
            <div className="examples">{EXAMPLES.map(example => <button key={example.icon} type="button" disabled={busy} onClick={() => { setText(example.text); setAnswers({}); readOffer(example.text); }}><span className="example-number">{example.icon}</span><span><strong>{example.name[lang]}</strong><small>{example.tag[lang]}</small></span><ArrowRight size={15}/></button>)}</div>
            <p className="example-note">{t("Illustrative offers, not quotes from real lenders.", "काल्पनिक उदाहरण, वास्तविक ऋणदाताओं के प्रस्ताव नहीं।")}</p>
            {editing && <div className="structured" ref={formRef}>
              <div className="section-heading"><span className="step-number">02</span><h2>{t("CHECK THE FINE PRINT", "विवरण की जाँच करें")}</h2></div>
              <form onSubmit={print}>
                <fieldset disabled={busy} className="offer-fields">
                  <legend className="sr-only">{t("Loan terms", "ऋण की शर्तें")}</legend>
                  <NumberField label={t("Principal / loan amount (₹)", "मूलधन / ऋण राशि (₹)")} value={offer.principal} onChange={principal => edit({ ...offer, principal })} min={0.01} />
                  <div className="field-grid">{([ ["processingFee", t("Processing fee (₹)", "प्रोसेसिंग शुल्क (₹)")], ["gst", t("GST on fee (₹)", "शुल्क पर GST (₹)")], ["insurance", t("Insurance (₹)", "बीमा (₹)")], ["other", t("Other deductions (₹)", "अन्य कटौती (₹)")] ] as [keyof Deductions, string][]).map(([key, label]) => <NumberField key={key} label={label} value={offer.deductions[key]} min={0} onChange={n => edit({ ...offer, deductions: { ...offer.deductions, [key]: n } })} />)}</div>
                  <div className="received-preview"><span>{t("Actually reaches your pocket", "वास्तव में आपको मिलेंगे")}</span><output>{rupees(received)}</output></div>
                  <label className="field">{t("Repayment schedule", "भुगतान का तरीका")}<select aria-label={t("Repayment schedule", "भुगतान का तरीका")} value={offer.repayment.kind} onChange={e => setRepayment(e.target.value === "bullet" ? { kind: "bullet", amount: offer.principal, dayOffset: 30 } : e.target.value === "emi" ? { kind: "emi", amount: 1000, count: 6, frequency: "weekly" } : { kind: "custom", payments: [{ dayOffset: 30, amount: offer.principal }] })}><option value="bullet">{t("One payment at the end", "अंत में एक भुगतान")}</option><option value="emi">{t("Equal instalments / EMIs", "बराबर किस्तें / EMI")}</option><option value="custom">{t("Custom payment dates", "खुद भुगतान के दिन भरें")}</option></select></label>
                  {offer.repayment.kind === "bullet" && <div className="field-grid"><NumberField label={t("Total repayment (₹)", "कुल भुगतान (₹)")} value={offer.repayment.amount} min={0.01} onChange={amount => { if (offer.repayment.kind === "bullet") setRepayment({ ...offer.repayment, amount }); }} /><NumberField label={t("Due after (days)", "कितने दिन बाद")} value={offer.repayment.dayOffset} min={1} max={MAX_DAYS} step={1} onChange={dayOffset => { if (offer.repayment.kind === "bullet") setRepayment({ ...offer.repayment, dayOffset }); }}/></div>}
                  {offer.repayment.kind === "emi" && <><div className="field-grid"><NumberField label={t("Each instalment (₹)", "हर किस्त (₹)")} min={0.01} value={offer.repayment.amount} onChange={amount => { if (offer.repayment.kind === "emi") setRepayment({ ...offer.repayment, amount }); }}/><NumberField label={t("Number of instalments", "किस्तों की संख्या")} min={1} max={MAX_PAYMENTS} step={1} value={offer.repayment.count} onChange={count => { if (offer.repayment.kind === "emi") setRepayment({ ...offer.repayment, count }); }}/><label className="field">{t("Frequency", "कितने अंतराल पर")}<select aria-label={t("Frequency", "कितने अंतराल पर")} value={offer.repayment.frequency} onChange={e => { if (offer.repayment.kind === "emi") setRepayment({ ...offer.repayment, frequency: e.target.value as "daily" | "weekly" | "monthly", firstDay: undefined }); }}><option value="daily">{t("Daily", "हर दिन")}</option><option value="weekly">{t("Weekly", "हर सप्ताह")}</option><option value="monthly">{t("Monthly (30 days)", "हर महीना (30 दिन)")}</option></select></label><NumberField label={t("First payment day", "पहले भुगतान का दिन")} min={1} max={MAX_DAYS} step={1} value={offer.repayment.firstDay ?? { daily: 1, weekly: 7, monthly: 30 }[offer.repayment.frequency]} onChange={firstDay => { if (offer.repayment.kind === "emi") setRepayment({ ...offer.repayment, firstDay }); }}/></div><p className="field-note">{t("Months are 30 days here. Use custom dates for calendar-exact payments.", "यहाँ महीना 30 दिनों का है। वास्तविक तारीखों के लिए खुद दिन भरें।")}</p></>}
                  {offer.repayment.kind === "custom" && <div className="custom-payments">{offer.repayment.payments.map((payment, i) => <div className="payment-row" key={i}><NumberField label={`${t("Day", "दिन")} ${i + 1}`} min={1} max={MAX_DAYS} step={1} value={payment.dayOffset} onChange={dayOffset => { if (offer.repayment.kind === "custom") setRepayment({ ...offer.repayment, payments: offer.repayment.payments.map((p, j) => j === i ? { ...p, dayOffset } : p) }); }}/><NumberField label={`${t("Payment", "भुगतान")} ${i + 1} (₹)`} min={0.01} value={payment.amount} onChange={amount => { if (offer.repayment.kind === "custom") setRepayment({ ...offer.repayment, payments: offer.repayment.payments.map((p, j) => j === i ? { ...p, amount } : p) }); }}/><button type="button" className="remove-button" aria-label={`${t("Remove payment", "भुगतान हटाएँ")} ${i + 1}`} disabled={offer.repayment.kind !== "custom" || offer.repayment.payments.length === 1} onClick={() => { if (offer.repayment.kind === "custom") setRepayment({ ...offer.repayment, payments: offer.repayment.payments.filter((_, j) => j !== i) }); }}>×</button></div>)}<button type="button" className="text-button" disabled={offer.repayment.payments.length >= MAX_PAYMENTS} onClick={() => { if (offer.repayment.kind === "custom") setRepayment({ ...offer.repayment, payments: [...offer.repayment.payments, { dayOffset: (offer.repayment.payments.at(-1)?.dayOffset ?? 0) + 30, amount: 1000 }] }); }}>+ {t("Add payment", "भुगतान जोड़ें")}</button><p className="field-note">{t("Day 1 is the day after you receive the money.", "दिन 1 पैसा मिलने के अगले दिन को कहते हैं।")}</p></div>}
                  <details className="checklist"><summary><span><ShieldCheck size={17}/>{t("A quick borrower safety check", "ऋण सुरक्षा की छोटी जाँच")}</span><span>{Object.keys(answers).length}/{FLAG_QUESTIONS.length}<ChevronDown size={16}/></span></summary><p>{t("Optional. Answer only what you know. Unanswered is unknown.", "वैकल्पिक। जितना पता है उतना बताएँ। बिना जवाब अज्ञात माना जाएगा।")}</p>{FLAG_QUESTIONS.map(flag => <fieldset key={flag.id} className="question"><legend>{flag.question[lang]}</legend><div className="answer-options">{([true, false] as const).map(value => <label key={String(value)}><input type="radio" name={flag.id} checked={answers[flag.id] === value} onChange={() => { setAnswers({ ...answers, [flag.id]: value }); resetResult(); }}/>{value ? t("Yes", "हाँ") : t("No", "नहीं")}</label>)}<button type="button" className="clear-answer" onClick={() => { const next = { ...answers }; delete next[flag.id]; setAnswers(next); resetResult(); }}>{t("Clear", "हटाएँ")}</button></div></fieldset>)}</details>
                  <NumberField label={t("Compare at X% per year", "तुलना की सालाना दर (%)")} value={compareRate} min={0} max={100} step={0.1} onChange={n => { setCompareRate(n); resetResult(); }}/><p className="field-note">{t("Example rate, check with your bank. Nominal annual rate, daily compounding; comparison fees excluded.", "उदाहरण दर, अपने बैंक से जाँचें। नाममात्र सालाना दर, दैनिक चक्रवृद्धि; तुलना में शुल्क शामिल नहीं।")}</p>
                  <div className="assumptions"><strong>{t("READ BACK & CONFIRM", "पढ़ें और पुष्टि करें")}</strong>{assumptions.length > 0 && lang === "en" ? <ul>{assumptions.map(a => <li key={a}>{a}</li>)}</ul> : <p>{t("Check the rupee amounts, upfront deductions, amount in hand and every repayment day. Unlisted charges are zero. Monthly means 30 days.", "सभी रकम, पहले कटने वाले शुल्क, हाथ में मिलने वाली रकम और भुगतान के दिन जाँचें। अनलिखे शुल्क शून्य हैं। मिलेगी लिखी रकम हाथ में मिलने वाली मानी गई है। महीना 30 दिनों का है। किस्त एक पूरे अंतराल बाद शुरू होती है। वास्तविक शर्तें फ़ॉर्म में ठीक करें।")}</p>}<label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required/>{t("I have checked these amounts and assumptions.", "मैंने इन रकमों और धारणाओं की जाँच की है।")}</label></div>
                  <label className="checkbox-label privacy-choice"><input type="checkbox" checked={localOnly} onChange={e => setLocalOnly(e.target.checked)}/>{t("Keep this check on my device", "इस जाँच को मेरे उपकरण पर ही रखें")}</label>
                  <button className="primary-button print-button" type="submit" disabled={!confirmed || busy}><Printer size={18}/>{busy ? t("Printing your receipt…", "रसीद छप रही है…") : t("Show me the real cost", "असली लागत दिखाएँ")}<ArrowRight size={18}/></button>
                </fieldset>
              </form>
            </div>}
            {error && <p className="error-message" role="alert">{error}</p>}
            <div className="screen-footer"><span>₹ &gt; % &gt; {t("CLARITY", "स्पष्टता")}</span><span>{t("KNOW MORE. OWE WISELY.", "समझें। फिर उधार लें।")}</span></div>
          </div>
        </div></div>
        <aside className="printer-panel" aria-label={t("Your loan receipt", "आपकी ऋण रसीद")}>
          <div className="printer-label"><Printer size={14}/>{t("THE TRUTH, ON PAPER", "सच, काग़ज़ पर")}<span className="status-led amber"/></div><div className="paper-slot"/>
          <section className={`receipt ${data ? "printed" : "empty"}`} ref={receiptRef} tabIndex={-1} aria-label={t("Calculation result", "गणना का परिणाम")}>
            <div className="receipt-top"><span className="receipt-logo">अ</span><strong>ASLI BYAAJ</strong><span>{t("YOUR REAL-COST RECEIPT", "आपकी असली लागत की रसीद")}</span></div>
            <div className="receipt-rule"/>
            {data ? <>
              <p className="receipt-meta print-line" style={lineStyle(0)}>{t("TERM", "अवधि")} {data.result.durationDays} {t("DAYS", "दिन")} <span>{data.result.payments.length} {t("PAYMENT(S)", "भुगतान")}</span></p>
              {[ [t("You receive", "आपको मिलेंगे"), rupees(data.result.amountReceived)], [t("You repay", "आप लौटाएँगे"), rupees(data.result.totalRepaid)], [t("Your actual cost", "आपकी असली लागत"), rupees(data.result.totalCost)] ].map(([label, value], i) => <div key={label} className={`receipt-row print-line ${i === 2 ? "cost-row" : ""}`} style={lineStyle(i + 1)}><span>{label}</span><strong>{value}</strong></div>)}
              <div className="apr-block print-line" style={lineStyle(4)}><span>{t("TRUE APR", "असली APR")}</span><strong className={data.result.aprCapped ? "capped-apr" : ""}>{data.result.aprDisplay}</strong><small>{t("effective annual rate", "प्रभावी सालाना दर")}</small></div>
              <p className="nominal-note print-line" style={lineStyle(5)}>{t("Nominal annual APR", "नाममात्र सालाना APR")}: <b>{data.result.nominalAprDisplay}</b></p>
              <div className={`shark-meter ${data.shark.tier} print-line`} style={lineStyle(6)}><div><span>SHARK METER</span><strong>{data.shark.emoji} {data.shark.label[lang]}</strong></div><div className="meter-track"><span/><span/><span/></div><div className="meter-labels"><span>🐟 {t("Fair", "कम")}</span><span>🐡 {t("Costly", "महँगा")}</span><span>🦈 {t("Shark", "बहुत महँगा")}</span></div></div>
              <div className="per-hundred print-line" style={lineStyle(7)}><span>{t("FOR EVERY ₹100 RECEIVED", "मिले हर ₹100 पर")}</span><strong>{rupees(data.result.costPer100)} <small>{t("in cost", "लागत")}</small></strong></div>
              <p className="receipt-disclaimer print-line" style={lineStyle(8)}>{t("Annualised, not a bill for a full year. Your actual cost is the rupee amount above.", "यह सालाना दर है, पूरे साल का बिल नहीं। असली लागत ऊपर रुपये में दी गई है।")}</p>
              <div className="receipt-rule"/><div className="receipt-end print-line" style={lineStyle(9)}>{t("NO SMALL PRINT. JUST THE NUMBERS.", "कोई छिपी बात नहीं। सिर्फ़ हिसाब।")}<div className="barcode" aria-hidden="true"/><span>ASLI / 5150 / {data.mode === "local" ? "LOCAL" : "CHECKED"}</span></div>
            </> : <><p className="receipt-awaiting">{t("WAITING FOR YOUR OFFER", "आपके प्रस्ताव का इंतज़ार है")}</p><div className="receipt-row"><span>{t("You receive", "आपको मिलेंगे")}</span><strong>₹ —</strong></div><div className="receipt-row"><span>{t("You repay", "आप लौटाएँगे")}</span><strong>₹ —</strong></div><div className="receipt-row cost-row"><span>{t("Your actual cost", "असली लागत")}</span><strong>₹ —</strong></div><div className="apr-block"><span>TRUE APR</span><strong>— %</strong><small>{t("the number they don’t put in bold", "वह रकम जो बड़े अक्षरों में नहीं दिखती")}</small></div><div className="idle-fish" aria-hidden="true">🐟 <span>·······</span> 🐡 <span>·······</span> 🦈</div><p className="empty-instructions">{t("A little loan can hide a lot.\nLet’s read between the lines.", "छोटे ऋण में बहुत कुछ छिप सकता है।\nआइए पूरा हिसाब समझें।")}</p><div className="receipt-rule"/><div className="receipt-end">{t("YOUR NUMBERS GO HERE.", "आपका हिसाब यहाँ दिखेगा।")}<div className="barcode" aria-hidden="true"/></div></>}
          </section>
          <div className="printer-base"><span className="printer-vents"/><span>THERMAL / 01</span></div>
          {data && <div className="receipt-actions"><button type="button" onClick={() => copy(receiptText(data.result, lang))}><Copy size={15}/>{t("Copy receipt", "रसीद कॉपी करें")}</button><a href={`https://wa.me/?text=${encodeURIComponent(receiptText(data.result, lang))}`} target="_blank" rel="noopener noreferrer">{t("Share on WhatsApp", "WhatsApp पर भेजें")}<ArrowRight size={15}/></a></div>}
        </aside>
      </div>
      <div className="hardware-bottom"><div className="bottom-vents"/><span className="bottom-label">{t("BUILT FOR PEOPLE. NOT LENDERS.", "लोगों के लिए। ऋणदाताओं के लिए नहीं।")}</span><div className="power-label"><i className="status-led"/>{t("POWER", "पावर")}</div></div>
    </section>
    <div className="under-machine"><span><ShieldCheck size={14}/>{t("No account. No contacts. No offer history stored.", "न खाता। न संपर्क। न प्रस्ताव का इतिहास संग्रह।")}</span><span>{t("YOUR MONEY. YOUR CALL.", "आपका पैसा। आपका फ़ैसला।")}</span></div>
    <p className="live-notice" role="status" aria-live="polite">{notice}</p>
    {data ? <section className="after-results" aria-label={t("Understand your result", "परिणाम समझें")}>
      <div className="results-title"><span>03 / {t("NOW YOU KNOW", "अब आप जानते हैं")}</span><h2>{t("A clearer picture. A better next step.", "साफ़ हिसाब। बेहतर अगला कदम।")}</h2><ArrowDown size={24}/></div>
      <div className="insight-grid"><article className="insight-card explanation-card"><div className="card-kicker">{t("IN PLAIN WORDS", "आसान शब्दों में")}<div className="language-switch"><button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button><button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>हिंदी</button></div></div><h3>{t("Here’s the real deal.", "यह है असली बात।")}</h3><p>{data.explainer[lang]}</p><blockquote>{lang === "hi" ? "पहले पूरा हिसाब समझें। फिर फ़ैसला लें।" : data.summary}</blockquote><details className="method-note"><summary>{t("How the APR & meter work", "APR और मीटर कैसे काम करते हैं")}</summary><p>{t("We solve the daily internal rate of return from the money you receive and each repayment. Nominal APR = daily rate × 365; effective APR compounds that daily rate over 365 days. This annualisation is for comparison, not an assumption that you will renew the loan.", "मिली रकम और हर भुगतान से दैनिक आंतरिक प्रतिफल दर निकाली जाती है। नाममात्र APR = दैनिक दर × 365; प्रभावी APR इसी दर की 365 दिनों की चक्रवृद्धि है। यह तुलना के लिए है, ऋण को दोहराने की धारणा नहीं।")}</p><p>{t(`Our illustrative tiers: fair ≤ ${FAIR_APR_MAX}%, costly ≤ ${COSTLY_APR_MAX}%, loan shark > ${COSTLY_APR_MAX}% effective APR. These are not RBI thresholds or legal findings; “fair” does not certify a lender.`, `हमारे उदाहरण स्तर: कम लागत ≤ ${FAIR_APR_MAX}%, महँगा ≤ ${COSTLY_APR_MAX}%, बहुत महँगा > ${COSTLY_APR_MAX}% प्रभावी APR। ये RBI की सीमाएँ या कानूनी निष्कर्ष नहीं हैं। कम लागत ऋणदाता का प्रमाणन नहीं है।`)}</p></details></article>
      <article className="insight-card"><div className="card-kicker"><ShieldCheck size={16}/>{t("BORROWER SAFETY", "ऋण सुरक्षा")}</div><h3>{data.flags.length ? t(`${data.flags.length} things to look into.`, `${data.flags.length} बातों की जाँच करें।`) : t("Keep asking questions.", "सवाल पूछते रहें।")}</h3><p className="muted">{t(`${data.answeredFlags} of ${FLAG_QUESTIONS.length} questions answered. Unanswered checks remain unknown.`, `${FLAG_QUESTIONS.length} में से ${data.answeredFlags} जवाब मिले। बाकी जाँच अज्ञात हैं।`)}</p>{data.flags.length ? <ul className="flag-results">{data.flags.map(flag => <li key={flag.id}><span className={`severity ${flag.severity}`}>{flag.severity === "urgent" ? t("URGENT", "ज़रूरी") : t("REVIEW", "जाँचें")}</span><p>{flag.explanation[lang]}</p><a href={flag.source} target="_blank" rel="noopener noreferrer">{flag.reference} ↗</a></li>)}</ul> : <p>{t("No warning was triggered by the answers given. This is not proof that the lender is safe or compliant.", "दिए गए जवाबों से कोई चेतावनी नहीं मिली। यह ऋणदाता की सुरक्षा या नियम पालन का प्रमाण नहीं है।")}</p>}{data.complaintDraft && <details className="complaint"><summary>{t("Review a complaint draft", "शिकायत का मसौदा देखें")}</summary><p>{t("Add identifying details privately after copying. Check the recipient’s scope and process. Nothing is sent for you.", "कॉपी करने के बाद निजी तौर पर पहचान का विवरण जोड़ें। सही माध्यम की प्रक्रिया जाँचें। हम कुछ नहीं भेजते।")}</p><textarea readOnly rows={10} value={data.complaintDraft[lang]} aria-label={t("Complaint draft", "शिकायत मसौदा")}/><button type="button" className="secondary-button" onClick={() => copy(data.complaintDraft![lang])}><Copy size={15}/>{t("Copy complaint draft", "शिकायत कॉपी करें")}</button><div className="complaint-links"><a href="https://sachet.rbi.org.in" target="_blank" rel="noopener noreferrer">RBI Sachet ↗</a><a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">{t("Cybercrime portal", "साइबर अपराध पोर्टल")} ↗</a><a href="tel:1930">1930</a></div></details>}</article></div>
      <article className="alternatives-panel"><div className="alternatives-header"><div><span className="card-kicker">{t("EXPLORE YOUR OPTIONS", "अपने विकल्प देखें")}</span><h3>{t("There may be a less costly way.", "कम लागत वाला रास्ता हो सकता है।")}</h3><p>{t("Eligibility, fees and approval vary. Ask the regulated lender for its KFS.", "पात्रता, शुल्क और मंज़ूरी अलग हैं। विनियमित ऋणदाता से KFS माँगें।")}</p></div><div className="savings"><span>{t(`AT ${data.alternatives.rate}% / YEAR · EXAMPLE ONLY`, `${data.alternatives.rate}% / साल · सिर्फ़ उदाहरण`)}</span><strong>{rupees(data.alternatives.savings)}</strong><b>{t("you would save", "आप बचा सकते हैं")}</b><small>{data.alternatives.extraCost > 0 ? t(`Your entered loan is ${rupees(data.alternatives.extraCost)} cheaper than this example.`, `आपका भरा ऋण इस उदाहरण से ${rupees(data.alternatives.extraCost)} सस्ता है।`) : t("Same received amount & payment dates. No comparison fees.", "एक जैसी मिली रकम और तारीखें। तुलना के शुल्क अलग।")}</small></div></div><div className="alternative-list">{data.alternatives.options.map((option, i) => <a href={option.link} target="_blank" rel="noopener noreferrer" key={option.name}><span className="option-index">0{i + 1}</span><div><strong>{option.name}</strong><p>{option.who[lang]}</p></div><ArrowRight size={17}/></a>)}</div><p className="alternative-note">{t("The example rate is not an advertised rate for any option above. Change it in the form and print again to compare a quote.", "उदाहरण दर ऊपर दिए किसी विकल्प की घोषित दर नहीं है। वास्तविक प्रस्ताव की तुलना के लिए फ़ॉर्म में दर बदलकर फिर छापें।")}</p></article>
      <div className="helpful-panel"><div><h3>{t("A little clearer now?", "अब कुछ साफ़ हुआ?")}</h3><p>{t("Opt in to one anonymous helpful-check vote. No personal details sent.", "स्वेच्छा से एक गुमनाम उपयोगी-जाँच वोट दें। कोई निजी विवरण नहीं भेजा जाएगा।")}</p><small>{t("A temporary server counter, not a count of unique people. Resets on restart.", "अस्थायी सर्वर गिनती, अलग-अलग लोगों की संख्या नहीं। रीस्टार्ट पर मिटती है।")}</small></div><button type="button" className="helped-button" disabled={helped || countBusy} onClick={helpedClick}>{helped ? <Check size={18}/> : <Heart size={18}/>} {helped ? t("Thank you", "धन्यवाद") : countBusy ? t("Sending…", "भेज रहे हैं…") : t("This helped me", "इससे मदद मिली")}</button></div>
    </section> : <div className="how-it-works"><span><b>01</b>{t("PASTE THE OFFER", "प्रस्ताव लिखें")}</span><i>→</i><span><b>02</b>{t("CHECK THE DETAILS", "विवरण जाँचें")}</span><i>→</i><span><b>03</b>{t("SEE THE REAL COST", "असली लागत देखें")}</span></div>}
    <footer className="site-footer"><span>ASLI BYAAJ 5150 <span className="footer-star">✦</span> {t("MADE FOR A BILLION POSSIBILITIES.", "करोड़ों संभावनाओं के लिए।")}</span><p>{t("An educational estimate, not a lender quote or legal advice. Verify all terms before signing.", "शैक्षिक अनुमान, ऋणदाता का प्रस्ताव या कानूनी सलाह नहीं। हस्ताक्षर से पहले सभी शर्तें जाँचें।")}</p><details><summary>{t("Data & privacy", "डेटा और गोपनीयता")}</summary><p>{t("No accounts, analytics or offer database. Text is parsed in your browser; the normal check sends only the edited numbers and checklist answers to our API. We do not log or store them. The optional wording service receives only a cost category. Temporary anonymous request keys are kept in server memory for rate limiting; raw IP addresses are not stored. Hosting providers may retain request metadata under their policies. Choose ‘Keep this check on my device’ to calculate locally. Sharing opens WhatsApp with your receipt; you choose whether to send.", "न खाते, न एनालिटिक्स, न प्रस्ताव डेटाबेस। टेक्स्ट आपके ब्राउज़र में पढ़ा जाता है; सामान्य जाँच केवल संपादित रकम और जवाब API को भेजती है। हम इन्हें लॉग या संग्रह नहीं करते। वैकल्पिक शब्द सेवा को सिर्फ़ लागत श्रेणी मिलती है। दर सीमा के लिए अस्थायी अनुरोध कुंजी रहती है; मूल IP संग्रह नहीं होता। होस्टिंग प्रदाता अपनी नीतियों के अनुसार अनुरोध विवरण रख सकते हैं। स्थानीय गणना के लिए ‘इस जाँच को मेरे उपकरण पर ही रखें’ चुनें। साझा करने से WhatsApp में रसीद खुलती है; भेजने का निर्णय आपका है।")}</p></details></footer>
  </main>;
}
function NumberField({ label, value, onChange, min = 0, max = MAX_MONEY, step = 0.01 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <label className="field">{label}<input type="number" inputMode={step === 1 ? "numeric" : "decimal"} min={min} max={max} step={step} required value={Number.isNaN(value) ? "" : value} onChange={e => onChange(e.target.value === "" ? NaN : Number(e.target.value))}/></label>;
}
