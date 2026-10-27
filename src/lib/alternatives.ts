import { DAYS_PER_YEAR, InputError, roundMoney, type LoanResult } from "./loan";
import type { LocalText } from "./flags";
export const DEFAULT_COMPARE_RATE = 12;
export const MAX_COMPARE_RATE = 100;
export type Alternative = { name: string; who: LocalText; link: string };
export const REGULATED_OPTIONS: Alternative[] = [
  { name: "PM SVANidhi", who: { en: "Street vendors: check eligibility for working-capital support.", hi: "रेहड़ी-पटरी विक्रेता: काम की पूँजी के लिए पात्रता जाँचें।" }, link: "https://pmsvanidhi.mohua.gov.in" },
  { name: "PM Mudra Shishu", who: { en: "Small non-farm businesses: explore loans through participating lenders.", hi: "छोटे गैर-कृषि व्यवसाय: भाग लेने वाले ऋणदाताओं से जानकारी लें।" }, link: "https://www.mudra.org.in" },
  { name: "Kisan Credit Card", who: { en: "Eligible farmers, including allied activities: ask a bank about seasonal credit.", hi: "पात्र किसान और संबद्ध गतिविधियाँ: मौसमी ऋण के बारे में बैंक से पूछें।" }, link: "https://www.myscheme.gov.in/schemes/kcc" },
  { name: "Bank gold loan", who: { en: "People with gold to pledge: compare fees and repayment terms; pledged gold is at risk if unpaid.", hi: "गिरवी रखने योग्य सोना: शुल्क व शर्तें जाँचें; भुगतान न होने पर सोना खोने का जोखिम है।" }, link: "https://sbi.co.in/web/personal-banking/loans/gold-loan/personal-gold-loans" },
  { name: "SHG bank linkage / NRLM", who: { en: "Eligible self-help group members: ask the local NRLM mission or bank.", hi: "पात्र स्वयं सहायता समूह सदस्य: स्थानीय NRLM मिशन या बैंक से पूछें।" }, link: "https://aajeevika.gov.in" },
  { name: "Credit card EMI vs app", who: { en: "Existing cardholders: compare the issuer’s full EMI cost, fees and taxes. Cards can also be expensive.", hi: "मौजूदा कार्डधारक: EMI की कुल लागत, शुल्क और टैक्स मिलाएँ। कार्ड भी महँगे हो सकते हैं।" }, link: "https://www.rbi.org.in" },
];
/** Compare the same net amount and due dates, preserving relative payment sizes.
 * X is a hypothetical nominal annual rate, compounded daily; no comparison fees.
 */
export function compareAlternative(result: LoanResult, rate = DEFAULT_COMPARE_RATE) {
  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_COMPARE_RATE) throw new InputError(`Comparison rate must be between 0 and ${MAX_COMPARE_RATE} percent.`);
  const logDaily = Math.log1p(rate / 100 / DAYS_PER_YEAR);
  const pv = result.payments.reduce((sum, p) => sum + p.amount * Math.exp(-logDaily * p.dayOffset), 0);
  const exampleTotal = roundMoney(result.totalRepaid * result.amountReceived / pv);
  const exampleCost = roundMoney(exampleTotal - result.amountReceived);
  const difference = roundMoney(result.totalRepaid - exampleTotal);
  return { rate, exampleTotal, exampleCost, savings: Math.max(0, difference), extraCost: Math.max(0, -difference), options: REGULATED_OPTIONS };
}
