import type { LocalText } from "./flags";
export const EXAMPLES: { name: LocalText; tag: LocalText; text: string; icon: string }[] = [
  { name: { en: "Instant loan app", hi: "तुरंत ऋण ऐप" }, tag: { en: "7-day loan", hi: "7 दिन का ऋण" }, text: "₹5000 loan, ₹500 processing fee, repay ₹6500 in 7 days", icon: "01" },
  { name: { en: "Weekly moneylender", hi: "साप्ताहिक साहूकार" }, tag: { en: "6 instalments", hi: "6 किस्तें" }, text: "2k per week for 6 weeks on 10k", icon: "02" },
  { name: { en: "Buy now, pay later", hi: "अभी लें, बाद में चुकाएँ" }, tag: { en: "Zero-cost example", hi: "शून्य लागत उदाहरण" }, text: "₹3000 loan, repay ₹3000 in 30 days", icon: "03" },
  { name: { en: "Fair bank loan", hi: "कम लागत बैंक ऋण" }, tag: { en: "Illustrative offer", hi: "काल्पनिक प्रस्ताव" }, text: "₹10000 loan, repay ₹11000 in 365 days", icon: "04" },
];
