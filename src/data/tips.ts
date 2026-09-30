/** Rotating educational cards for the Home screen (spec §7.1, Zone F). */
export const TIPS: { en: string; hi: string }[] = [
  {
    en: "INS 621 is MSG. It's safe in small amounts, but if you have high BP it adds sodium you can't taste.",
    hi: "INS 621 यानी MSG। थोड़ी मात्रा में सुरक्षित, पर हाई बीपी में यह ऐसा सोडियम जोड़ता है जो चखने में पता नहीं चलता।",
  },
  {
    en: "Ingredients are listed by weight, heaviest first. If sugar is second on the list, the pack is mostly sugar.",
    hi: "सामग्री वज़न के हिसाब से लिखी जाती है, सबसे ज़्यादा पहले। अगर चीनी दूसरे नंबर पर है, तो पैकेट में ज़्यादातर चीनी ही है।",
  },
  {
    en: "\"No added sugar\" doesn't mean no sugar. Fruit juice concentrate and maltodextrin are still sugar.",
    hi: "\"चीनी नहीं मिलाई\" का मतलब चीनी नहीं है, ऐसा नहीं। फ्रूट कॉन्संट्रेट और माल्टोडेक्सट्रिन भी चीनी ही हैं।",
  },
  {
    en: "Maida is wheat with the fibre stripped out. Atta keeps the bran, so it digests slower.",
    hi: "मैदा वही गेहूं है जिससे फाइबर निकाल दिया गया। आटे में चोकर रहता है, इसलिए धीरे पचता है।",
  },
  {
    en: "Vanaspati and \"partially hydrogenated\" both mean trans fat. There is no safe amount of it.",
    hi: "वनस्पति और \"पार्शियली हाइड्रोजनेटेड\" दोनों का मतलब ट्रांस फैट है। इसकी कोई सुरक्षित मात्रा नहीं होती।",
  },
  {
    en: "A short ingredient list is usually a good sign. Twenty ingredients rarely means twenty good ones.",
    hi: "छोटी सामग्री सूची आमतौर पर अच्छा संकेत है। बीस सामग्रियों का मतलब बीस अच्छी चीज़ें नहीं होता।",
  },
  {
    en: "WHO suggests under 25g of free sugar a day. One sweetened drink often crosses that on its own.",
    hi: "WHO के मुताबिक दिन में 25 ग्राम से कम चीनी। एक मीठा पेय अकेले ही यह सीमा पार कर देता है।",
  },
  {
    en: "Palm oil goes by many names on labels: palmolein, palm olein, and plain \"edible vegetable oil\".",
    hi: "लेबल पर पाम तेल कई नामों से आता है: पामोलीन, पाम ओलीन, और सिर्फ़ \"खाद्य वनस्पति तेल\"।",
  },
];

/** Stable across a day so the card doesn't flicker on every render. */
export function tipOfTheDay(): { en: string; hi: string } {
  const day = Math.floor(Date.now() / 86_400_000);
  return TIPS[day % TIPS.length];
}
