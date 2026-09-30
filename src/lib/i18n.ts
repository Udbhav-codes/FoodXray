import type { Lang } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════
   LOCALISATION — spec §16. Fully bilingual, not partially.
   Hindi translates meaning, not words: "Not recommended" becomes
   "आपके लिए ठीक नहीं" (natural), never "अनुशंसित नहीं" (bureaucratic).
   ═══════════════════════════════════════════════════════════════════ */

type Dict = Record<string, { en: string; hi: string }>;

export const STRINGS: Dict = {
  // ── App & navigation ──
  appName: { en: "FoodXray", hi: "FoodXray" },
  tagline: {
    en: "Read any label. Understand it in seconds.",
    hi: "कोई भी लेबल पढ़िए। सेकंडों में समझिए।",
  },
  navHome: { en: "Home", hi: "होम" },
  navScan: { en: "Scan", hi: "स्कैन" },
  navPlan: { en: "Plan", hi: "प्लान" },
  navProfile: { en: "Profile", hi: "प्रोफ़ाइल" },

  // ── Home ──
  greetingNoName: { en: "Hello", hi: "नमस्ते" },
  homePrompt: { en: "What are we scanning today?", hi: "आज क्या स्कैन करना है?" },
  scanCardTitle: { en: "Scan Ingredient Label", hi: "लेबल स्कैन करें" },
  scanCardHint: { en: "Point at the back of any pack", hi: "किसी भी पैकेट के पीछे कैमरा ले जाइए" },
  findAlternatives: { en: "Find Healthier Alternatives", hi: "बेहतर विकल्प खोजें" },
  yourDietPlan: { en: "Your Diet Plan", hi: "आपका डाइट प्लान" },
  recentScans: { en: "Recent Scans", hi: "हाल के स्कैन" },
  seeAll: { en: "See all", hi: "सब देखें" },
  didYouKnow: { en: "Did you know?", hi: "क्या आप जानते हैं?" },
  completeProfile: {
    en: "Complete your profile for personal results",
    hi: "निजी नतीजों के लिए अपनी प्रोफ़ाइल पूरी करें",
  },
  noScansYet: {
    en: "No scans yet. Point your camera at any food label to start.",
    hi: "अभी कोई स्कैन नहीं। शुरू करने के लिए किसी लेबल पर कैमरा ले जाइए।",
  },

  // ── Scan ──
  scanTitle: { en: "Scan a label", hi: "लेबल स्कैन करें" },
  frameHint: { en: "Frame the INGREDIENTS section", hi: "सामग्री वाला हिस्सा फ्रेम में लें" },
  tipSteady: { en: "Hold steady, avoid glare", hi: "कैमरा स्थिर रखें, चमक से बचें" },
  useCamera: { en: "Use camera", hi: "कैमरा खोलें" },
  uploadPhoto: { en: "Upload photo", hi: "फ़ोटो चुनें" },
  typeInstead: { en: "Type the label", hi: "लेबल टाइप करें" },
  capture: { en: "Capture", hi: "फ़ोटो लें" },
  retake: { en: "Retake", hi: "दोबारा लें" },
  analysing: { en: "Reading label…", hi: "लेबल पढ़ रहे हैं…" },
  readingText: { en: "Finding the ingredients", hi: "सामग्री ढूंढ रहे हैं" },
  pasteHint: {
    en: "Type or paste the ingredient list exactly as printed on the pack.",
    hi: "पैकेट पर छपी सामग्री सूची वैसी ही टाइप या पेस्ट कीजिए।",
  },
  analyse: { en: "Analyse label", hi: "लेबल जांचें" },
  trySample: { en: "Try a sample label", hi: "नमूना लेबल आज़माएं" },
  noTextFound: {
    en: "We couldn't find an ingredient list. Make sure the ingredients section is inside the frame.",
    hi: "हमें सामग्री सूची नहीं मिली। ध्यान दें कि सामग्री वाला हिस्सा फ्रेम के अंदर हो।",
  },
  lowConfidence: {
    en: "Some text was unclear. Check the ingredients below and correct anything that looks wrong.",
    hi: "कुछ शब्द साफ़ नहीं पढ़े गए। नीचे सामग्री देखें और गलत लगे तो सुधारें।",
  },
  cameraDenied: {
    en: "Camera access was blocked. You can upload a photo or type the label instead.",
    hi: "कैमरा नहीं खुल पाया। आप फ़ोटो चुन सकते हैं या लेबल टाइप कर सकते हैं।",
  },

  // ── Result ──
  result: { en: "Result", hi: "नतीजा" },
  grade: { en: "Grade", hi: "ग्रेड" },
  outOf100: { en: "out of 100", hi: "100 में से" },
  good: { en: "good", hi: "अच्छे" },
  average: { en: "average", hi: "ठीक-ठाक" },
  avoid: { en: "avoid", hi: "बचें" },
  unclear: { en: "unclear", hi: "अस्पष्ट" },
  verdictGood: { en: "Good", hi: "अच्छा" },
  verdictAverage: { en: "Average", hi: "ठीक-ठाक" },
  verdictAvoid: { en: "Not good", hi: "ठीक नहीं" },
  verdictUnknown: { en: "Unclear", hi: "अस्पष्ट" },
  forYou: { en: "For you", hi: "आपके लिए" },
  generalAssessment: { en: "General assessment", hi: "सामान्य आकलन" },
  averageAdult: { en: "average adult", hi: "औसत वयस्क" },
  saveProfilePrompt: {
    en: "Save your profile for a result made for your body",
    hi: "अपनी प्रोफ़ाइल सेव करें, नतीजा आपके शरीर के हिसाब से बनेगा",
  },
  whyThis: { en: "Why this score?", hi: "यह स्कोर क्यों?" },
  howWeScore: { en: "How we score", hi: "हम अंक कैसे देते हैं" },
  ingredientsLabel: { en: "Ingredients", hi: "सामग्री" },
  found: { en: "found", hi: "मिलीं" },
  scientificName: { en: "Scientific name", hi: "वैज्ञानिक नाम" },
  whatItIs: { en: "What it really is", hi: "यह असल में क्या है" },
  isItGood: { en: "Is it good for you?", hi: "क्या यह आपके लिए अच्छा है?" },
  couldNotIdentify: {
    en: "We couldn't identify this one. We'd rather say so than guess.",
    hi: "हम इसे पहचान नहीं पाए। अंदाज़ा लगाने से बेहतर है सच बताना।",
  },
  nutritionCalc: { en: "Calculate protein, carbs & fat", hi: "प्रोटीन, कार्ब्स की गणना करें" },
  betterOptions: { en: "Better options", hi: "बेहतर विकल्प" },
  whoIsEating: { en: "Who is eating this?", hi: "यह कौन खा रहा है?" },
  saveToHistory: { en: "Save", hi: "सेव करें" },
  share: { en: "Share", hi: "शेयर करें" },
  reportWrong: { en: "Report wrong data", hi: "गलत जानकारी बताएं" },
  saved: { en: "Saved to history", hi: "इतिहास में सेव हो गया" },
  copied: { en: "Result copied", hi: "नतीजा कॉपी हो गया" },

  // ── Nutrition sheet ──
  nutritionPerServing: { en: "Nutrition per serving", hi: "प्रति सर्विंग पोषण" },
  servingSize: { en: "Serving size", hi: "सर्विंग साइज़" },
  calories: { en: "kcal", hi: "कैलोरी" },
  protein: { en: "protein", hi: "प्रोटीन" },
  carbs: { en: "carbs", hi: "कार्ब्स" },
  fat: { en: "fat", hi: "फैट" },
  sugar: { en: "Sugar", hi: "चीनी" },
  sodium: { en: "Sodium", hi: "सोडियम" },
  fibre: { en: "Fibre", hi: "फाइबर" },
  satFat: { en: "Saturated fat", hi: "सैचुरेटेड फैट" },
  ofYourDaily: { en: "of your daily need", hi: "आपकी दैनिक ज़रूरत का" },
  addToPlan: { en: "Add to today's plan", hi: "आज के प्लान में जोड़ें" },
  addedToPlan: { en: "Added to today's plan", hi: "आज के प्लान में जुड़ गया" },
  noNutritionPanel: {
    en: "No nutrition panel was found in this photo. Add the numbers yourself to see how it fits your day.",
    hi: "इस फ़ोटो में पोषण तालिका नहीं मिली। संख्याएं खुद जोड़िए ताकि दिन का हिसाब दिखे।",
  },

  // ── Alternatives ──
  alternativesTitle: { en: "Healthier Alternatives", hi: "बेहतर विकल्प" },
  searchPlaceholder: { en: "Search a product or category", hi: "उत्पाद या श्रेणी खोजें" },
  browseByCategory: { en: "Browse by category", hi: "श्रेणी से देखें" },
  nearYou: { en: "Near you", hi: "आपके पास" },
  enableLocation: {
    en: "Show which of these are sold near me",
    hi: "दिखाएं कि इनमें से कौन-से मेरे आसपास मिलते हैं",
  },
  locationWhy: {
    en: "We'll use your location once to show which healthier options are available nearby. We don't store or share where you are.",
    hi: "हम आपकी लोकेशन एक बार इस्तेमाल करेंगे ताकि पास मिलने वाले बेहतर विकल्प दिखा सकें। हम इसे न सेव करते हैं न साझा करते हैं।",
  },
  notNow: { en: "Not now", hi: "अभी नहीं" },
  allow: { en: "Allow", hi: "अनुमति दें" },
  commonlyAvailable: { en: "Commonly available", hi: "आमतौर पर मिलता है" },
  noAlternatives: {
    en: "We don't have a better option in this category yet. We're adding more every week.",
    hi: "इस श्रेणी में अभी हमारे पास बेहतर विकल्प नहीं है। हम हर हफ़्ते और जोड़ रहे हैं।",
  },
  seedNote: {
    en: "Our alternatives catalogue is a starter set of representative products, not a shop inventory.",
    hi: "हमारी विकल्प सूची प्रतिनिधि उत्पादों का शुरुआती संग्रह है, किसी दुकान का स्टॉक नहीं।",
  },
  filters: { en: "Filters", hi: "फ़िल्टर" },
  clearFilters: { en: "Clear", hi: "हटाएं" },

  // ── Plan ──
  planTitle: { en: "Today", hi: "आज" },
  breakfast: { en: "Breakfast", hi: "नाश्ता" },
  lunch: { en: "Lunch", hi: "दोपहर का खाना" },
  snacks: { en: "Snacks", hi: "स्नैक्स" },
  dinner: { en: "Dinner", hi: "रात का खाना" },
  addFood: { en: "Add food", hi: "खाना जोड़ें" },
  nothingLogged: { en: "Nothing logged yet", hi: "अभी कुछ दर्ज नहीं" },
  overSugar: { en: "You're over your sugar limit for today.", hi: "आज आपकी चीनी की सीमा पार हो गई है।" },
  overSodium: { en: "You're over your sodium limit for today.", hi: "आज आपकी सोडियम की सीमा पार हो गई है।" },
  lowProtein: { en: "You're low on protein today.", hi: "आज प्रोटीन कम रह गया है।" },
  remove: { en: "Remove", hi: "हटाएं" },
  emptyPlan: {
    en: "Log what you eat and we'll track it against your own targets.",
    hi: "जो खाएं उसे दर्ज करें, हम आपके अपने लक्ष्यों से मिलान करेंगे।",
  },

  // ── Profile ──
  profileTitle: { en: "Profile", hi: "प्रोफ़ाइल" },
  privacyNote: {
    en: "Everything here is optional and stored on your phone. It only makes your results more accurate.",
    hi: "यहां सब कुछ वैकल्पिक है और आपके फ़ोन में ही रहता है। यह सिर्फ़ नतीजों को सटीक बनाता है।",
  },
  basic: { en: "Basic", hi: "बुनियादी" },
  name: { en: "Name", hi: "नाम" },
  age: { en: "Age", hi: "उम्र" },
  sex: { en: "Sex", hi: "लिंग" },
  male: { en: "Male", hi: "पुरुष" },
  female: { en: "Female", hi: "महिला" },
  preferNot: { en: "Prefer not to say", hi: "बताना नहीं चाहते" },
  height: { en: "Height", hi: "कद" },
  weight: { en: "Weight", hi: "वज़न" },
  activityLevel: { en: "Activity level", hi: "गतिविधि स्तर" },
  sedentary: { en: "Sedentary", hi: "बहुत कम" },
  light: { en: "Lightly active", hi: "थोड़ी" },
  moderate: { en: "Moderately active", hi: "मध्यम" },
  active: { en: "Active", hi: "सक्रिय" },
  veryActive: { en: "Very active", hi: "बहुत सक्रिय" },
  healthConditions: { en: "Health conditions", hi: "स्वास्थ्य स्थितियां" },
  tapAnyApply: { en: "Tap any that apply", hi: "जो लागू हों उन्हें चुनें" },
  allergies: { en: "Allergies", hi: "एलर्जी" },
  dietPreference: { en: "Diet preference", hi: "खान-पान" },
  vegetarian: { en: "Vegetarian", hi: "शाकाहारी" },
  nonVegetarian: { en: "Non-vegetarian", hi: "मांसाहारी" },
  vegan: { en: "Vegan", hi: "वीगन" },
  eggetarian: { en: "Eggetarian", hi: "अंडा खाते हैं" },
  jain: { en: "Jain", hi: "जैन" },
  goal: { en: "Goal", hi: "लक्ष्य" },
  goalMaintain: { en: "Stay healthy", hi: "सेहत बनाए रखें" },
  goalLose: { en: "Lose weight", hi: "वज़न घटाएं" },
  goalGain: { en: "Gain weight", hi: "वज़न बढ़ाएं" },
  goalSugar: { en: "Manage blood sugar", hi: "शुगर नियंत्रित करें" },
  goalBp: { en: "Lower blood pressure", hi: "बीपी कम करें" },
  goalMuscle: { en: "Build muscle", hi: "मसल बनाएं" },
  familyProfiles: { en: "Family profiles", hi: "परिवार की प्रोफ़ाइल" },
  addFamilyMember: { en: "Add family member", hi: "परिवार का सदस्य जोड़ें" },
  you: { en: "you", hi: "आप" },
  settings: { en: "Settings", hi: "सेटिंग्स" },
  language: { en: "Language", hi: "भाषा" },
  theme: { en: "Appearance", hi: "रूप" },
  themeLight: { en: "Light", hi: "उजला" },
  themeDark: { en: "Dark", hi: "गहरा" },
  themeSystem: { en: "System", hi: "सिस्टम" },
  scanHistory: { en: "Scan history", hi: "स्कैन इतिहास" },
  exportData: { en: "Export my data", hi: "मेरा डेटा निर्यात करें" },
  deleteData: { en: "Delete all my data", hi: "मेरा सारा डेटा मिटाएं" },
  deleteConfirm: {
    en: "This erases every profile, scan and food log on this device. It cannot be undone.",
    hi: "इससे इस डिवाइस की हर प्रोफ़ाइल, स्कैन और खाने का रिकॉर्ड मिट जाएगा। यह वापस नहीं आएगा।",
  },
  saveProfile: { en: "Save profile", hi: "प्रोफ़ाइल सेव करें" },
  profileSaved: { en: "Profile saved", hi: "प्रोफ़ाइल सेव हो गई" },
  yourTargets: { en: "Your daily targets", hi: "आपके दैनिक लक्ष्य" },
  bmi: { en: "BMI", hi: "बीएमआई" },
  optional: { en: "optional", hi: "वैकल्पिक" },
  cancel: { en: "Cancel", hi: "रद्द करें" },
  delete: { en: "Delete", hi: "मिटाएं" },
  done: { en: "Done", hi: "हो गया" },
  back: { en: "Back", hi: "वापस" },
  close: { en: "Close", hi: "बंद करें" },

  // ── AI ──
  aiSection: { en: "AI suggestions", hi: "AI सुझाव" },
  aiToggle: { en: "Use AI for explanations & alternatives", hi: "समझाने और विकल्पों के लिए AI इस्तेमाल करें" },
  aiPrivacy: {
    en: "When on, we send a summary of your health conditions and allergies — never your name — to Google Gemini to write your explanation and find alternatives. Turn it off and the app works entirely on your device.",
    hi: "चालू होने पर हम आपकी स्वास्थ्य स्थितियों और एलर्जी का सारांश — नाम कभी नहीं — Google Gemini को भेजते हैं ताकि आपकी व्याख्या लिखी जा सके और विकल्प मिलें। बंद करने पर ऐप पूरी तरह आपके फ़ोन पर ही चलता है।",
  },
  aiBadge: { en: "AI", hi: "AI" },
  aiWriting: { en: "Writing your explanation…", hi: "आपके लिए समझा रहे हैं…" },
  aiSearching: { en: "Searching for real alternatives…", hi: "असली विकल्प खोज रहे हैं…" },
  aiOff: { en: "AI is off", hi: "AI बंद है" },
  aiUnavailable: {
    en: "AI isn't available right now — showing our standard explanation.",
    hi: "AI अभी उपलब्ध नहीं — हमारी सामान्य व्याख्या दिखा रहे हैं।",
  },
  aiNotConfigured: {
    en: "Add a GEMINI_API_KEY to enable AI explanations and live alternatives.",
    hi: "AI व्याख्या और लाइव विकल्पों के लिए GEMINI_API_KEY जोड़ें।",
  },
  askTitle: { en: "Ask about this product", hi: "इस उत्पाद के बारे में पूछें" },
  askPlaceholder: {
    en: "e.g. Can I eat this with thyroid?",
    hi: "जैसे: थायरॉइड में यह खा सकते हैं?",
  },
  askButton: { en: "Ask", hi: "पूछें" },
  askAnother: { en: "Ask another", hi: "और पूछें" },
  askThinking: { en: "Thinking…", hi: "सोच रहे हैं…" },
  askFailed: {
    en: "Couldn't get an answer right now. Try again in a moment.",
    hi: "अभी जवाब नहीं मिल पाया। थोड़ी देर बाद कोशिश करें।",
  },
  liveAlternatives: { en: "Found for you", hi: "आपके लिए खोजे गए" },
  seedAlternatives: { en: "From our catalogue", hi: "हमारी सूची से" },
  sources: { en: "Sources", hi: "स्रोत" },
  refresh: { en: "Refresh", hi: "फिर खोजें" },
  widelySold: { en: "Widely sold", hi: "आसानी से मिलता है" },
  onlineMostly: { en: "Mostly online", hi: "ज़्यादातर ऑनलाइन" },
  nicheProduct: { en: "May need looking for", hi: "ढूंढना पड़ सकता है" },
  notStockChecked: {
    en: "We found these are sold in India — we can't confirm a specific shop has them today.",
    hi: "ये भारत में बिकते हैं, यह हमने पाया — किसी दुकान में आज हैं या नहीं, यह पक्का नहीं कह सकते।",
  },
  aiIdentified: { en: "Identified by AI", hi: "AI ने पहचाना" },

  // ── Legal ──
  disclaimer: {
    en: "This app gives general nutrition information, not medical advice. It is not a substitute for your doctor or a registered dietitian. If you have a health condition, always follow your doctor's guidance.",
    hi: "यह ऐप सामान्य पोषण जानकारी देता है, चिकित्सा सलाह नहीं। यह आपके डॉक्टर या आहार विशेषज्ञ की जगह नहीं ले सकता। किसी भी स्वास्थ्य समस्या में अपने डॉक्टर की सलाह ज़रूर लें।",
  },
  formulationsChange: {
    en: "Formulations change. Always check the physical pack.",
    hi: "फ़ॉर्मूला बदलता रहता है। असली पैकेट ज़रूर देखें।",
  },
};

export function makeT(lang: Lang) {
  return (key: keyof typeof STRINGS | string): string => {
    const entry = STRINGS[key as string];
    if (!entry) return key as string;
    return entry[lang];
  };
}

/** Picks the right side of any `_en` / `_hi` pair. */
export function pick<T>(lang: Lang, en: T, hi: T): T {
  return lang === "hi" ? hi : en;
}
