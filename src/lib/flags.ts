export const RBI_URL = "https://www.rbi.org.in";
export const RBI_RULES = "RBI's digital lending rules (RBI Digital Lending Guidelines 2022 / Digital Lending Directions 2025)";
export const FAIR_APR_MAX = 24;
export const COSTLY_APR_MAX = 60;
export type Language = "en" | "hi";
export type LocalText = Record<Language, string>;
export type Severity = "caution" | "high" | "urgent";
export type FlagDefinition = { id: string; question: LocalText; badAnswer: boolean; severity: Severity; explanation: LocalText; source: string; reference: string };
const definition = (id: string, question: LocalText, badAnswer: boolean, severity: Severity, explanation: LocalText): FlagDefinition => ({ id, question, badAnswer, severity, explanation, source: RBI_URL, reference: RBI_RULES });
export const FLAG_QUESTIONS: FlagDefinition[] = [
  definition("kfs", { en: "Did you get a Key Fact Statement with the APR before signing?", hi: "क्या हस्ताक्षर से पहले APR वाला मुख्य तथ्य विवरण (KFS) मिला?" }, false, "high", { en: "Ask for the KFS showing the APR and all charges before agreeing.", hi: "सहमति से पहले APR और सभी शुल्क वाला KFS माँगें।" }),
  definition("directBank", { en: "Did the money reach your bank account directly from the lender?", hi: "क्या पैसा ऋणदाता से सीधे आपके बैंक खाते में आया?" }, false, "high", { en: "Third-party routing needs checking. Direct disbursal is the general rule; some specific exceptions apply.", hi: "तीसरे पक्ष से आए पैसे की जाँच करें। सामान्य नियम सीधे भुगतान का है; कुछ अपवाद हैं।" }),
  definition("regulatedEntity", { en: "Is the lending bank or NBFC clearly named?", hi: "क्या ऋण देने वाले बैंक या NBFC का नाम स्पष्ट है?" }, false, "high", { en: "Ask which regulated bank or NBFC is actually lending. An app name alone is not enough.", hi: "असली ऋणदाता बैंक या NBFC का नाम पूछें। सिर्फ़ ऐप का नाम पर्याप्त नहीं है।" }),
  definition("permissions", { en: "Did the app ask for contacts, photos or gallery access?", hi: "क्या ऐप ने संपर्कों, फ़ोटो या गैलरी की अनुमति माँगी?" }, true, "high", { en: "Broad access to contacts or media is a warning sign. Limited, explicit-consent access for onboarding may have exceptions.", hi: "संपर्कों या मीडिया की व्यापक अनुमति चेतावनी है। पहचान जाँच के लिए सीमित, स्पष्ट सहमति वाले अपवाद हो सकते हैं।" }),
  definition("harassment", { en: "Were you threatened, or were your contacts called?", hi: "क्या आपको धमकाया गया या आपके संपर्कों को कॉल किया गया?" }, true, "urgent", { en: "Keep evidence of threats and unwanted calls. Use the cybercrime portal; for financial cyber fraud, call 1930 promptly.", hi: "धमकियों और अनचाही कॉल के सबूत रखें। साइबर अपराध पोर्टल पर शिकायत करें; वित्तीय साइबर धोखाधड़ी में तुरंत 1930 पर कॉल करें।" }),
  definition("limitIncrease", { en: "Was your credit limit raised without your request?", hi: "क्या आपके अनुरोध के बिना क्रेडिट सीमा बढ़ाई गई?" }, true, "high", { en: "A credit-limit increase should require your explicit request and assessment.", hi: "क्रेडिट सीमा बढ़ाने के लिए आपका स्पष्ट अनुरोध और आकलन होना चाहिए।" }),
  definition("coolingOff", { en: "Were you given a cooling-off / look-up period to exit?", hi: "क्या ऋण से बाहर निकलने के लिए कूलिंग-ऑफ़ / लुक-अप अवधि मिली?" }, false, "caution", { en: "Ask about the disclosed exit window, repayment of principal and proportionate APR, and any allowed disclosed processing charge.", hi: "बाहर निकलने की अवधि, मूलधन व अनुपातिक APR का भुगतान और अनुमत घोषित प्रोसेसिंग शुल्क पूछें।" }),
  definition("hiddenDeductions", { en: "Were any deductions hidden until the money arrived?", hi: "क्या पैसा आने तक कोई कटौती छिपाई गई थी?" }, true, "high", { en: "Charges should be disclosed upfront. Compare the KFS with the amount actually received.", hi: "शुल्क पहले से बताए जाने चाहिए। KFS को वास्तव में मिली रकम से मिलाएँ।" }),
];
export function evaluateFlags(answers: Record<string, boolean> = {}): FlagDefinition[] {
  return FLAG_QUESTIONS.filter(flag => Object.hasOwn(answers, flag.id) && answers[flag.id] === flag.badAnswer);
}
export function sharkTier(effectiveApr: number | null) {
  if (effectiveApr !== null && effectiveApr <= FAIR_APR_MAX) return { tier: "fair" as const, emoji: "🐟", label: { en: "Fair", hi: "कम लागत" } };
  if (effectiveApr !== null && effectiveApr <= COSTLY_APR_MAX) return { tier: "costly" as const, emoji: "🐡", label: { en: "Costly", hi: "महँगा" } };
  return { tier: "shark" as const, emoji: "🦈", label: { en: "Loan shark", hi: "बहुत महँगा" } };
}
