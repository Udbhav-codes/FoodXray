# PoshanLens — Full Product & Design Specification

> **Working name:** PoshanLens (पोषणLens)
> *Alternatives to consider: LabelPadho (लेबल पढ़ो), SachhaLabel, NeemScan, PaanLabel*
> **Platform:** Android (mobile-first), Flutter or React Native
> **Category:** Packaged-food ingredient decoder + personalised nutrition advisor
> **Market:** India
> **Document version:** 1.0
> **Last updated:** 30 August 2026

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Product Vision](#2-product-vision)
3. [Target Users](#3-target-users)
4. [Competitive Research Summary](#4-competitive-research-summary)
5. [Our Differentiation Strategy](#5-our-differentiation-strategy)
6. [Information Architecture & Navigation](#6-information-architecture--navigation)
7. [Screen-by-Screen Specification](#7-screen-by-screen-specification)
8. [The Core Scan Pipeline](#8-the-core-scan-pipeline)
9. [Ingredient Result Table — Format Spec](#9-ingredient-result-table--format-spec)
10. [Personalisation Engine](#10-personalisation-engine)
11. [Gemini API Integration](#11-gemini-api-integration)
12. [Nearby Alternatives Feature](#12-nearby-alternatives-feature)
13. [Data Models](#13-data-models)
14. [UI/UX Design System](#14-uiux-design-system)
15. [Wireframes](#15-wireframes)
16. [Localisation — Hindi & English](#16-localisation--hindi--english)
17. [Tech Stack](#17-tech-stack)
18. [Privacy, Safety & Legal](#18-privacy-safety--legal)
19. [Development Roadmap](#19-development-roadmap)
20. [Risks & Mitigations](#20-risks--mitigations)
21. [Appendix](#21-appendix)

---

## 1. The Problem

Indian consumers buy packaged food every day, but the ingredient panel on the back of the pack is effectively unreadable:

- **Scientific and chemical names** — "Sodium Metabisulphite," "Butylated Hydroxyanisole," "Tertiary Butylhydroquinone" mean nothing to an ordinary shopper.
- **INS/E-number codes** — "INS 211," "INS 621," "E102" are printed as bare codes with no explanation.
- **No context of personal relevance** — a product that is fine for a healthy 22-year-old may be dangerous for a diabetic, a person with hypertension, someone with CKD, or a pregnant woman. The label treats everyone identically.
- **Marketing claims mislead** — "no added sugar," "made with real fruit," "natural flavours," "sugar-free" are legally permissible but often misleading.
- **Language barrier** — most labels are in English only, while a large share of buyers are more comfortable in Hindi or a regional language.
- **No actionable next step** — even if a person learns a product is unhealthy, they don't know what to buy instead, or where to buy it.

**Net result:** people are making daily health decisions with zero usable information.

---

## 2. Product Vision

> **"Point your camera at any ingredient list. Get a verdict you can actually understand, in your language, for your body — and know what to buy instead."**

Three commitments that define the product:

| Commitment | What it means in practice |
|---|---|
| **Radical simplicity** | Every ingredient gets a colour and a one-line explanation. No paragraphs. No jargon. A person should understand a scan result in under 10 seconds. |
| **Personal, not generic** | The same product returns a *different* verdict for a diabetic than for a healthy adult. Personalisation is the core product, not a paid upsell. |
| **Works on any product** | OCR-first. If you can photograph the label, we can read it — no barcode required, no database dependency. Critical for India's unbranded, regional, and local products. |

---

## 3. Target Users

### Primary personas

**1. Priya — The Health-Conscious Parent (32, Pune)**
Buys groceries for a family of four. Wants to know if the biscuits and juices she buys for her kids contain harmful additives. Reads English but finds chemical names intimidating.
*Needs:* allergen alerts, kid-safety flags, healthier swaps, family profiles.

**2. Rajesh — The Diabetic Shopper (54, Jaipur)**
Diagnosed Type 2 diabetes three years ago. Doctor told him to "avoid sugar" but he doesn't know that maltodextrin, glucose syrup, and invert sugar are all sugar. More comfortable reading Hindi.
*Needs:* condition-specific verdicts, Hindi UI, hidden-sugar detection.

**3. Ananya — The Fitness Tracker (24, Bengaluru)**
Gym-goer counting macros. Scans protein bars and snacks to check protein, added sugar, and whether "protein blend" is actually quality protein.
*Needs:* macro calculator, protein quality assessment, quick scan.

**4. Sunita — The Cautious First-Timer (45, Lucknow)**
Low digital confidence. Has heard packaged food is "full of chemicals" but has no way to verify. Will only use the app if it's genuinely one-tap simple and in Hindi.
*Needs:* Hindi-first UI, large text, big buttons, no clutter.

### Secondary
- Allergy sufferers (nut, gluten, dairy, soy)
- Pregnant women avoiding specific additives
- People with hypertension, PCOS, thyroid conditions, CKD
- Nutritionists and dietitians (as a client-facing tool)

---

## 4. Competitive Research Summary

### 4.1 FactsScan — the closest existing product (India)

The direct competitor. Operated by Dolphin Web Solution Pvt. Ltd. / HustelHeaven Pvt. Ltd., Ahmedabad, founded 2024, launched April 2025. Founder: Sweety Patel. Team of 11–20. Recognised by NITI Aayog's Frontier Tech Repository.

| Dimension | FactsScan's approach |
|---|---|
| **Scanning method** | **Barcode-first only.** No consumer-facing OCR of ingredient lists. |
| **Off-database products** | User must manually photograph and upload the label; their team adds it later. Not instant. |
| **Database size** | ~1 lakh (100,000) products claimed |
| **Scoring** | 0–100 health score + A–E grade, built on FSSAI + WHO guidelines |
| **Methodology transparency** | Opaque — "fixed methodology," "expert-validated algorithms," no published rubric |
| **Personalisation** | Rule-based profile matching (diet preference, some health conditions). **No generative AI.** |
| **AI usage** | Heavy "AI-powered" branding, but evidence points to a rule-based/curated engine. No LLM confirmed. |
| **Pricing** | Freemium — Pro at ₹79/mo, ₹149/qtr, ₹249/6mo, ₹449/yr |
| **What's paywalled** | Unlimited scans, deeper additive breakdown, Personalised Nutrition, portion guidance, processing level |
| **Traction (self-reported)** | 122K+ downloads, 10 lakh+ scans, 98% accuracy claim |
| **Play Store rating** | 4.3 stars, ~252 reviews |
| **Dominant complaint** | **"Product not found / doesn't scan"** — the database-coverage problem |

**Credibility weakness:** older FactsScan blog posts claim the app is "completely free," which contradicts the live ₹79–₹449 Pro tiers. Their traction figures are self-reported and unaudited.

### 4.2 TruthIn — the strongest India rival

NatFirst, founded 2022, Telangana. Team of ~35 including ~15 nutritionists and doctors. Rating system recognised by ICMR-NIN. Co-founder Ravi Teja Putrevu modelled it on Europe's Nutri-Score and Australia's Health Star Rating.

- **Transparent scoring:** 45% nutritional profile + 45% ingredient health impact + 10% manufacturing process → 1–5 rating (5 = healthiest)
- **Scope:** food + personal care + cosmetics
- **Traction:** 500,000+ users, 5M+ scans (own listings)
- **Weaknesses:** paywalled features, reliance on user-submitted data, condition-based personalisation still "coming soon"

### 4.3 HealthifyMe Snap

Khosla-backed. Generative-AI image recognition trained on **150,000 Indian food items.** Launched at 60–70% accuracy, later cited ~80% for single Indian foods. Smart plan ≈ ₹208/month (₹2,499/yr).
**Not a competitor for our use case** — Snap is built for meal/calorie logging, not packaged-food ingredient grading.

### 4.4 Global apps in India

| App | Model | India fitness |
|---|---|---|
| **Yuka** | 0–100 score (nutrition + additives + organic), food & cosmetics | Not officially available in India; almost no Indian brands |
| **Open Food Facts** | Free, open-source, NOVA + Nutri-Score, community DB | Thin, inconsistent Indian coverage |
| **Fooducate** | A–D grade + macro tracking | US-centric |
| **Osana** | 0–100 score + label-photo analysis | US-centric, but note: **already does ingredient-label photo scanning** |

### 4.5 The market signal

A wave of global OCR-first apps (Osana, Trash Panda Snap, Peelback, ScanGredients, Food Check AI) can photograph **any** label and grade it without a barcode. **No India-specific player has shipped this well.** That is the open lane.

---

## 5. Our Differentiation Strategy

Four wedges, in priority order:

### Wedge 1 — OCR-first, not barcode-first ⭐ *the core bet*
Every competitor in India fails the same way: "product not found." We invert the model. The camera reads the **printed ingredient list itself**, so coverage is not limited by a database. Works for local brands, regional products, unbranded packs, and brand-new SKUs on day one.

### Wedge 2 — Genuine generative-AI, condition-specific explanations ⭐
FactsScan's personalisation is shallow rule-matching. TruthIn's is "coming soon." We use **Google Gemini** to convert a deterministic rule-based score into a plain-language explanation of *why this matters for you specifically*:
- Diabetes → glycaemic load, hidden sugars, sugar aliases
- Hypertension → sodium, sodium-containing additives (INS 621, INS 211)
- CKD → potassium, phosphorus, protein load
- Pregnancy → caffeine, specific preservatives, artificial sweeteners
- Named allergies → exact match + cross-contamination language

### Wedge 3 — Family / multi-profile households
Indian households shop as a unit. One scan → simultaneous verdicts for the diabetic father, pregnant sister, and nut-allergic child. **No Indian competitor does this.**

### Wedge 4 — Hindi-first, genuinely bilingual
Not a translated afterthought. Full UI, ingredient explanations, and Gemini output in Hindi or English, switchable in one tap. This alone unlocks a demographic the English-only competitors can't reach.

### Supporting differentiators
- **Published, transparent scoring rubric** — TruthIn discloses 45/45/10; FactsScan discloses nothing. Transparency is a trust weapon.
- **Locally available alternatives** — not just "buy something healthier," but "here's a better option available near you."
- **Ayurvedic / traditional / regional ingredient glossary** — maida, vanaspati, dalda, khoya, and INS decoding in Hindi.
- **Core verdict stays free forever** — don't paywall the thing people came for.

---

## 6. Information Architecture & Navigation

### Bottom navigation — 4 tabs

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                 [CONTENT AREA]                  │
│                                                 │
├─────────────────────────────────────────────────┤
│   🏠        📷         🥗         👤            │
│  Home      Scan      Plan     Profile           │
│  होम      स्कैन    प्लान    प्रोफ़ाइल            │
└─────────────────────────────────────────────────┘
```

| Tab | Purpose | Hindi label |
|---|---|---|
| **Home** | Dashboard — scanner entry, alternatives, diet planner entry, recent scans, tip of the day | होम |
| **Scan** | **Quick action only.** Opens camera instantly, zero intermediate screens. | स्कैन |
| **Plan** | Diet planner — daily log, macro targets, meal suggestions | प्लान |
| **Profile** | Personal data form, family profiles, language, settings, history | प्रोफ़ाइल |

**Design rule:** the **Scan** tab is a pure shortcut — tapping it launches the camera immediately with no landing page. The **Home** tab contains the *full-featured* scan entry (with mode selection), alternatives, and planner.

---

## 7. Screen-by-Screen Specification

### 7.1 HOME (होम)

The dashboard. Five zones, top to bottom:

#### Zone A — Greeting header
```
नमस्ते, Priya 👋              [🌐 EN|हि]
आज क्या स्कैन करना है?
```
- Personalised greeting using profile name (falls back to "नमस्ते!" if no profile)
- Language toggle pinned top-right, always accessible
- If profile incomplete, a slim amber banner: *"Complete your profile for personal results →"*

#### Zone B — Primary scan card (the hero)
A large, tappable card occupying ~30% of the viewport. This is the visual anchor of the app.
```
┌───────────────────────────────────┐
│            ╭─────────╮            │
│            │   📷    │            │
│            ╰─────────╯            │
│      Scan Ingredient Label        │
│    लेबल स्कैन करें                 │
│                                   │
│  Point at the back of any pack    │
└───────────────────────────────────┘
```
- Contains a subtle animated scanning-line motion (respects `prefers-reduced-motion`)
- Tap → opens camera with an ingredient-panel framing guide overlay

#### Zone C — Find Alternatives button ⭐ *centre of home, as specified*
A standalone secondary button placed directly below the scan card, dead centre:
```
┌───────────────────────────────────┐
│   🔄  Find Healthier Alternatives │
│      बेहतर विकल्प खोजें            │
└───────────────────────────────────┘
```
- **Independent of any scan** — user can browse alternatives by category without scanning anything
- Opens the Alternatives Browser (§7.4)

#### Zone D — Diet Planner entry
```
┌───────────────────────────────────┐
│  🥗  Your Diet Plan               │
│      Today: 1,240 / 1,800 kcal    │
│      ▓▓▓▓▓▓▓▓░░░░░░  69%          │
└───────────────────────────────────┘
```
- Live progress ring/bar for today's intake
- Tap → Plan tab

#### Zone E — Recent scans (horizontal carousel)
```
Recent Scans  ·  हाल के स्कैन              See all →
┌──────┐  ┌──────┐  ┌──────┐
│ 🟢 A │  │ 🟠 C │  │ 🔴 E │
│Britan│  │Maggi │  │ Kurk │
│ -nia │  │      │  │ -ure │
└──────┘  └──────┘  └──────┘
```

#### Zone F — Tip of the day
A single rotating educational card:
> **Did you know?** *"INS 621 is MSG. It's safe in small amounts, but if you have high BP, it adds hidden sodium."*
> क्या आप जानते हैं?

---

### 7.2 SCAN (स्कैन) — Quick Action

**Behaviour:** tapping the Scan tab opens the camera **immediately**. No menu, no landing screen. Zero friction.

#### Camera screen
```
┌─────────────────────────────────────┐
│  ✕                          ⚡ 🔦    │
│                                     │
│   ┌───────────────────────────┐     │
│   │                           │     │
│   │   Frame the INGREDIENTS   │     │
│   │        section here       │     │
│   │  सामग्री वाला हिस्सा       │     │
│   │                           │     │
│   └───────────────────────────┘     │
│                                     │
│   💡 Tip: hold steady, avoid glare  │
│                                     │
│      🖼️        ⬤        📊          │
│    Gallery   Capture   Barcode      │
└─────────────────────────────────────┘
```

**Controls:**
- **Capture** (centre, large) — takes the photo
- **Gallery** (left) — pick an existing photo
- **Barcode** (right) — switch to barcode mode for known products (faster when available)
- **Flash toggle** and **close** in the top bar

**States:**
| State | UI |
|---|---|
| Analysing | Full-screen loader with rotating leaf animation + "Reading label… लेबल पढ़ रहे हैं" |
| OCR low confidence | "Text unclear. Try again with better light?" + Retake / Use anyway |
| No text detected | "We couldn't find an ingredient list. Make sure the ingredients section is inside the frame." |
| Success | Slide up the Result Sheet (§7.3) |

---

### 7.3 SCAN RESULT — the payoff screen

This is the most important screen in the product. Structure, top to bottom:

#### A. Overall verdict header
```
┌─────────────────────────────────────┐
│                                     │
│           ╭───────────╮             │
│           │           │             │
│           │    68     │  ← leaf-shaped
│           │   /100    │     score badge
│           ╰───────────╯             │
│                                     │
│         GRADE  C  ·  AVERAGE        │
│              औसत                    │
│                                     │
│   ▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓  ← Ingredient Ribbon
│    6 good  4 average  2 avoid       │
└─────────────────────────────────────┘
```

**⭐ The Ingredient Ribbon** is our signature UI element: a single horizontal stacked bar showing the proportion of good / average / avoid ingredients, readable in half a second before any text is processed.

#### B. Personal verdict card ⭐
This is the differentiator. Appears **directly below** the score.

**If profile IS saved:**
```
┌─────────────────────────────────────┐
│ 👤 For you, Rajesh (54, Diabetes)   │
│                                     │
│ ⚠️  Not recommended                 │
│                                     │
│ This has 3 hidden sugars —          │
│ maltodextrin, invert syrup, and     │
│ dextrose. Together they'll spike    │
│ your blood sugar faster than plain  │
│ sugar would.                        │
│                                     │
│              [ Why? ▾ ]             │
└─────────────────────────────────────┘
```

**If profile is NOT saved:**
```
┌─────────────────────────────────────┐
│ 👤 General assessment               │
│    (average adult)                  │
│                                     │
│ 🟠 Okay occasionally                │
│                                     │
│ High in sodium and refined carbs.   │
│ Fine as an occasional snack, not    │
│ an everyday food.                   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Save your profile for a result  │ │
│ │ made for your body →            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Rule:** when no profile exists, default to an **average healthy adult** baseline (age 30, moderate activity, no conditions) and label it clearly as a general assessment. Never pretend it's personalised.

#### C. Ingredient breakdown table ⭐ *the core deliverable*

Rendered as a vertical list of expandable rows (a true table is unreadable on a phone), where each row carries a coloured left stem bar:

```
INGREDIENTS  ·  सामग्री            12 found

┃🟢 Wheat Flour  ·  गेहूं का आटा          ▾
┃   Ground wheat. Basic, safe.

┃🔴 Palm Oil  ·  पाम तेल                  ▾
┃   High in saturated fat. Linked to
┃   heart risk in large amounts.

┃🟠 INS 621  ·  Monosodium Glutamate      ▾
┃   Flavour enhancer (MSG). Safe in
┃   small amounts, adds hidden sodium.

┃🔴 INS 102  ·  Tartrazine                ▾
┃   Artificial yellow colour. Linked
┃   to hyperactivity in some children.
```

**Expanded row** reveals the full four-part structure:

```
┃🟠 INS 621                               ▴
┃
┃  Scientific name
┃  Monosodium Glutamate (MSG)
┃  मोनोसोडियम ग्लूटामेट
┃
┃  What it really is
┃  A flavour enhancer — a salt that
┃  makes savoury food taste stronger.
┃
┃  Is it good for you?
┃  🟠 AVERAGE — Considered safe by FSSAI
┃  in normal amounts. Some people report
┃  headaches. It adds sodium you can't
┃  taste.
┃
┃  ⚠️ For you (Hypertension)
┃  Extra caution — this raises your
┃  sodium load without tasting salty.
```

Every ingredient row therefore answers the four questions the user asked for:
1. **The scientific name** (as printed + expanded full name)
2. **What it means** (plain-language translation)
3. **What it really is** (function/origin)
4. **Whether it's good** — colour-coded 🟢 / 🟠 / 🔴 / ⚪

#### D. Nutrition calculator button
```
┌─────────────────────────────────────┐
│  📊  Calculate protein, carbs & fat │
│      प्रोटीन, कार्ब्स की गणना करें    │
└─────────────────────────────────────┘
```
Opens a bottom sheet (§7.3.1).

#### E. Alternatives section ⭐ *at the end of every scan, as specified*
```
BETTER OPTIONS  ·  बेहतर विकल्प

┌─────────────────────────────────────┐
│ 🟢 A   Brand X Multigrain Biscuit   │
│        No palm oil · 6g fibre        │
│        📍 Available 0.8 km away →    │
├─────────────────────────────────────┤
│ 🟢 B   Brand Y Ragi Cookies          │
│        No artificial colour          │
│        🛵 On Blinkit · 12 min →      │
└─────────────────────────────────────┘

        [ See all alternatives → ]
```

#### F. Footer actions
`Save to history` · `Share result` · `Report wrong data`

---

#### 7.3.1 Nutrition Calculator (bottom sheet)

```
┌─────────────────────────────────────┐
│  ═══                                │
│  Nutrition per serving              │
│                                     │
│  Serving size:  [ 30 ] g   [ ⌃⌄ ]   │
│                                     │
│  ┌───────┬───────┬───────┬───────┐  │
│  │ 142   │ 2.1g  │ 18g   │ 7.2g  │  │
│  │ kcal  │protein│ carbs │ fat   │  │
│  └───────┴───────┴───────┴───────┘  │
│                                     │
│  Sugar     6.4 g   ▓▓▓▓░░░░  26% DV │
│  Sodium   310 mg   ▓▓▓▓▓▓░░  38% DV │
│  Fibre     0.8 g   ▓░░░░░░░   3% DV │
│                                     │
│  % of YOUR daily need (Rajesh, 54)  │
│                                     │
│  [ + Add to today's diet plan ]     │
└─────────────────────────────────────┘
```

- Serving size is user-adjustable with a stepper
- Daily-value percentages calculated from the profile (or average-adult defaults)
- "Add to today's plan" pushes the item straight into the Diet Planner log

---

### 7.4 ALTERNATIVES BROWSER

Reachable two ways: the centre Home button (standalone browse), or from a scan result (contextual swaps).

```
┌─────────────────────────────────────┐
│  ← Healthier Alternatives           │
│                                     │
│  [🔍 Search a product or category ] │
│                                     │
│  Browse by category                 │
│  ┌────────┬────────┬────────┐       │
│  │🍪 Bisc-│🍜 Nood-│🥤 Drin-│       │
│  │  uits  │  les   │  ks    │       │
│  ├────────┼────────┼────────┤       │
│  │🍟 Snac-│🥣 Cere-│🍫 Choc-│       │
│  │  ks    │  al    │  olate │       │
│  └────────┴────────┴────────┘       │
│                                     │
│  📍 Near you  ·  आपके पास            │
│  [ Enable location for nearby       │
│    availability ]                   │
└─────────────────────────────────────┘
```

**Category detail view** — products sorted by health score descending, each showing grade badge, key benefit, and availability chip.

**Filters:** Grade A only · No palm oil · No added sugar · High protein · Gluten-free · Vegan · Available nearby

---

### 7.5 PLAN (प्लान) — Diet Planner

Combines a daily log with targets derived from the profile.

```
┌─────────────────────────────────────┐
│  Today  ·  आज        < 30 Aug >     │
│                                     │
│         ╭─────────────╮             │
│         │   1,240     │             │
│         │  of 1,800   │  ← ring     │
│         │    kcal     │             │
│         ╰─────────────╯             │
│                                     │
│  Protein  ▓▓▓▓▓▓░░  48/70 g         │
│  Carbs    ▓▓▓▓▓▓▓░  180/220 g       │
│  Fat      ▓▓▓▓░░░░  32/60 g         │
│  Sugar    ▓▓▓▓▓▓▓▓  38/25 g  ⚠️     │
│  Sodium   ▓▓▓▓▓▓░░  1.4/2.0 g       │
│                                     │
│  ─────────────────────────────      │
│  Breakfast                   +      │
│    Poha · 250 kcal                  │
│  Lunch                       +      │
│    Dal, rice, sabzi · 520 kcal      │
│  Snacks                      +      │
│    🟠 Kurkure 30g · 142 kcal        │
│  Dinner                      +      │
│                                     │
│  ⚠️ You're over your sugar limit    │
│     for today.                      │
└─────────────────────────────────────┘
```

**Sub-features:**
- **Log by scan** — any scanned product can be added to a meal slot in one tap
- **Targets auto-calculated** from height, weight, age, sex, activity level, and goal (Mifflin-St Jeor BMR × activity factor)
- **Condition-aware limits** — a diabetic profile gets a tighter sugar cap; hypertension gets a tighter sodium cap
- **Weekly view** — 7-day trend chart
- **Suggestions** — "You're low on protein today. Try…"

---

### 7.6 PROFILE (प्रोफ़ाइल)

All fields **optional** — this must be stated explicitly at the top.

```
┌─────────────────────────────────────┐
│  Profile  ·  प्रोफ़ाइल               │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🔒 Everything here is optional  ││
│  │ and stored on your phone.       ││
│  │ It only makes your results      ││
│  │ more accurate.                  ││
│  └─────────────────────────────────┘│
│                                     │
│  ── BASIC ──────────────────────    │
│  Name              [ Rajesh      ]  │
│  Age               [ 54          ]  │
│  Sex               ( ) F  (•) M     │
│                    ( ) Prefer not   │
│  Height            [ 172 ] cm       │
│  Weight            [  78 ] kg       │
│  Activity level    [ Moderate  ▾ ]  │
│                                     │
│  BMI 26.4 · Slightly overweight     │
│                                     │
│  ── HEALTH CONDITIONS ──────────    │
│  Tap any that apply                 │
│  [Diabetes ✓] [High BP ✓] [Thyroid] │
│  [PCOS] [Kidney] [Heart] [Cholest.] │
│  [Pregnant] [Breastfeeding] [None]  │
│  [+ Add other]                      │
│                                     │
│  ── ALLERGIES ──────────────────    │
│  [Peanut] [Tree nuts] [Milk ✓]      │
│  [Egg] [Soy] [Wheat/Gluten] [Fish]  │
│  [Shellfish] [Sesame] [+ Add]       │
│                                     │
│  ── DIET PREFERENCE ────────────    │
│  ( ) Vegetarian  (•) Non-veg        │
│  ( ) Vegan       ( ) Eggetarian     │
│  ( ) Jain                           │
│                                     │
│  ── GOAL ───────────────────────    │
│  [ Manage blood sugar          ▾ ]  │
│                                     │
│  ── FAMILY PROFILES ────────────    │
│  👤 Rajesh (you)              ✓     │
│  👤 Sunita · Pregnant               │
│  👤 Aarav · 8y · Peanut allergy     │
│  [ + Add family member ]            │
│                                     │
│  ── SETTINGS ───────────────────    │
│  Language          [ हिंदी      ▾ ] │
│  Units             [ Metric    ▾ ]  │
│  Notifications     [ On/Off  ⬤ ]   │
│  Scan history                  →    │
│  Export my data                →    │
│  Delete all my data            →    │
│                                     │
│  [ Save Profile · सेव करें ]         │
└─────────────────────────────────────┘
```

**Family profile switcher:** a persistent avatar row at the top of the scan result screen lets the user flip between household members and see the verdict change instantly — the "one scan, four verdicts" moment.

---

## 8. The Core Scan Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│  1. CAPTURE                                                  │
│     Camera → photo of the ingredient panel                   │
│     (or barcode, or gallery image)                           │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  2. OCR  —  ON-DEVICE                                        │
│     Google ML Kit Text Recognition v2                        │
│     · Free, offline, fast (~200ms)                           │
│     · Latin + Devanagari script support                      │
│     Output: raw text blob                                    │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  3. PARSE & NORMALISE  —  ON-DEVICE                          │
│     · Locate the "INGREDIENTS:" / "सामग्री:" block           │
│     · Split on , ; and bracket boundaries                    │
│     · Extract INS/E-numbers into separate tokens             │
│       "Acidity Regulator (INS 330)" → ["Acidity Regulator",  │
│                                        "INS 330"]            │
│     · Strip percentages, footnotes, "contains permitted…"    │
│     · Lowercase, remove punctuation, fuzzy-normalise         │
│       spellings ("maida", "MAIDA", "Maida ")                 │
│     Output: clean ingredient token array                     │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  4. LOCAL DATABASE LOOKUP  —  FIRST LINE, ALWAYS             │
│     SQLite / Room, bundled with the app                      │
│     ~1,000 curated ingredients + all INS/E numbers used      │
│     in India                                                 │
│     · Instant, offline, free, deterministic                  │
│     · Handles ~85% of tokens on a typical Indian label       │
│     Output: verdict + explanation per matched token          │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
              ┌──────────┴──────────┐
              │  All matched?       │
              └──┬───────────────┬──┘
             YES │               │ NO (unknown tokens remain)
                 ▼               ▼
    ┌─────────────────┐  ┌──────────────────────────────────────┐
    │  Skip to step 6 │  │  5. GEMINI FALLBACK                  │
    └─────────────────┘  │     Batch ALL unknown tokens into a  │
                         │     single API call                  │
                         │     · Structured JSON response       │
                         │     · Cache result → local DB so we  │
                         │       never ask twice                │
                         └────────────────┬─────────────────────┘
                                          ▼
┌──────────────────────────────────────────────────────────────┐
│  6. SCORE AGGREGATION  —  RULE-BASED, DETERMINISTIC          │
│     Published, transparent rubric (see §8.1)                 │
│     Output: 0–100 score + A–E grade + ribbon proportions     │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  7. PERSONALISATION LAYER                                    │
│     Apply profile rules → re-weight verdicts                 │
│     · Hard blocks (allergy match) override everything        │
│     · Condition rules adjust individual ingredient verdicts  │
│     Output: personalised verdicts + adjusted overall verdict │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  8. GEMINI EXPLANATION GENERATION                            │
│     Send: product summary + flagged ingredients + profile    │
│     Receive: 2–3 sentence plain-language "why this matters   │
│     for YOU" text, in the user's chosen language             │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  9. ALTERNATIVES LOOKUP                                      │
│     Same category, higher score, filtered by profile         │
│     + local availability check (§12)                         │
└────────────────────────┬─────────────────────────────────────┘
                         ▼
                  ┌──────────────┐
                  │  10. RENDER  │
                  └──────────────┘
```

### 8.1 Scoring rubric — published & transparent

**We publish this openly. FactsScan doesn't. That's a trust advantage.**

| Component | Weight | Basis |
|---|---|---|
| **Nutritional profile** | 40% | Sugar, sodium, saturated fat, trans fat (negative); protein, fibre (positive). Scored against FSSAI and WHO thresholds per 100g. |
| **Ingredient quality** | 40% | Each ingredient carries a penalty weight. Trans fats and banned/controversial additives carry the heaviest penalties; whole-food ingredients carry zero or a bonus. |
| **Processing level** | 20% | NOVA-style classification: 1 (unprocessed) → 4 (ultra-processed). |

**Grade bands:**

| Score | Grade | Verdict | Colour |
|---|---|---|---|
| 80–100 | **A** | Good — eat freely | 🟢 Leaf green |
| 65–79 | **B** | Good — minor concerns | 🟢 Light green |
| 45–64 | **C** | Average — occasional | 🟠 Turmeric |
| 25–44 | **D** | Not good — limit | 🟠 Deep amber |
| 0–24 | **E** | Avoid | 🔴 Chilli red |

**Hard override:** any allergen match against the active profile forces a red "Do not eat" banner regardless of score.

---

## 9. Ingredient Result Table — Format Spec

Every ingredient row returns exactly this structure:

```json
{
  "raw_text": "Acidity Regulator (INS 330)",
  "display_name_en": "Citric Acid",
  "display_name_hi": "साइट्रिक एसिड",
  "scientific_name": "2-hydroxypropane-1,2,3-tricarboxylic acid",
  "code": "INS 330",
  "category": "acidity_regulator",
  "what_it_is_en": "A sour-tasting acid found naturally in lemons. Used to keep food fresh and add tartness.",
  "what_it_is_hi": "नींबू में प्राकृतिक रूप से पाया जाने वाला खट्टा एसिड। खाना ताज़ा रखने और खट्टापन देने के लिए।",
  "verdict": "good",
  "verdict_reason_en": "Safe. Found naturally in fruit.",
  "verdict_reason_hi": "सुरक्षित। फलों में प्राकृतिक रूप से मौजूद।",
  "penalty_weight": 0,
  "condition_flags": {
    "diabetes": null,
    "hypertension": null,
    "kidney": null,
    "pregnancy": null
  },
  "allergen_tags": [],
  "source": "local_db",
  "confidence": 1.0
}
```

### Verdict values & colour mapping

| Value | Label EN | Label HI | Colour token | Meaning |
|---|---|---|---|---|
| `good` | Good | अच्छा | `--verdict-good` 🟢 | Safe, or beneficial |
| `average` | Average | ठीक-ठाक | `--verdict-average` 🟠 | Safe in moderation; some caveat |
| `avoid` | Not good | ठीक नहीं | `--verdict-avoid` 🔴 | Evidence of harm, or heavily processed |
| `unknown` | Unclear | अस्पष्ट | `--verdict-unknown` ⚪ | Not enough reliable data — **say so honestly** |

**Honesty rule:** never guess. If neither the local DB nor Gemini can identify an ingredient with confidence, mark it `unknown` and say "We couldn't identify this one." Fabricating a verdict destroys trust permanently.

---

## 10. Personalisation Engine

### 10.1 Two-layer architecture

**Layer 1 — Deterministic rules (runs first, always).**
Rule tables map each condition to ingredient/nutrient adjustments. This layer is auditable, testable, and never hallucinates.

**Layer 2 — Gemini explanation (runs second).**
Takes the rule output and turns it into warm, plain, personal language. **Gemini explains the rule; it never decides the rule.**

> This separation is a safety requirement, not an optimisation. An LLM must never be the thing that decides whether a diabetic can eat something.

### 10.2 Condition rule table (excerpt)

| Condition | Watch nutrients | Escalate these ingredients | Tightened daily cap |
|---|---|---|---|
| **Diabetes (T2)** | Sugar, refined carbs, glycaemic load | All sugar aliases (maltodextrin, dextrose, invert syrup, glucose solids, HFCS, fruit juice concentrate), white flour/maida | Sugar ≤ 25 g |
| **Hypertension** | Sodium | Salt, INS 621 (MSG), INS 211 (sodium benzoate), INS 500 (sodium bicarbonate), all sodium-prefixed additives | Sodium ≤ 1,500 mg |
| **CKD / Kidney** | Potassium, phosphorus, protein, sodium | Phosphate additives (INS 339, 340, 450, 451, 452), potassium chloride | Per-doctor; flag all phosphates |
| **Heart / High cholesterol** | Saturated fat, trans fat | Palm oil, vanaspati/dalda, hydrogenated fat, partially hydrogenated oil | Sat fat ≤ 15 g |
| **Pregnancy** | Caffeine, specific additives | Caffeine, artificial sweeteners (saccharin), unpasteurised ingredients, high-dose vitamin A | Caffeine ≤ 200 mg |
| **PCOS** | Sugar, refined carbs, trans fat | Refined flour, added sugars, trans fats | Sugar ≤ 25 g |
| **Thyroid** | Iodine, soy, goitrogens | Soy protein isolate, excess soy derivatives | Advisory only |
| **Celiac / gluten** | — | Wheat, barley, rye, malt, maida, atta, semolina/sooji | **Hard block** |
| **Named allergy** | — | Exact match + "may contain" statements | **Hard block** |

### 10.3 Default fallback — no profile saved

When the profile is empty, use this baseline and **label it clearly as a general assessment**:

```json
{
  "profile_type": "default_average_adult",
  "age": 30,
  "sex": "unspecified",
  "activity": "moderate",
  "conditions": [],
  "allergies": [],
  "daily_targets": {
    "calories": 2000,
    "protein_g": 55,
    "sugar_g": 25,
    "sodium_mg": 2000,
    "sat_fat_g": 20,
    "fibre_g": 30
  }
}
```
*(Targets based on WHO general adult recommendations and ICMR-NIN Indian RDA guidance.)*

UI must always show: **"General assessment (average adult)"** with a prompt to complete the profile. Never imply a generic result is personalised.

---

## 11. Gemini API Integration

### 11.1 Where Gemini is used — and where it is NOT

| Task | Use Gemini? | Why |
|---|---|---|
| OCR / text extraction | ❌ **No** | ML Kit is faster, offline, and free |
| Known ingredient lookup | ❌ **No** | Local DB is instant, deterministic, cacheable |
| Score calculation | ❌ **No** | Must be auditable and reproducible |
| Deciding safety for a medical condition | ❌ **No** | Safety-critical — rules only |
| **Unknown ingredient identification** | ✅ **Yes** | Handles the long tail |
| **Plain-language personal explanation** | ✅ **Yes** | This is the differentiator |
| **Hindi translation of explanations** | ✅ **Yes** | Natural, not machine-stiff |
| **Free-text Q&A ("can I eat this with thyroid?")** | ✅ **Yes** | With mandatory disclaimer |

### 11.2 Prompt A — Unknown ingredient resolution

```
SYSTEM:
You are a food-science reference for an Indian consumer app.
Return ONLY valid JSON. No markdown, no code fences, no preamble.
If you are not confident about an ingredient, set "verdict" to
"unknown" and "confidence" below 0.5. Never invent a plausible-
sounding answer. Accuracy matters more than completeness.

USER:
Identify these ingredients from an Indian packaged food label.
Ingredients: ["Tertiary Butylhydroquinone", "INS 476", "Anti-caking agent"]

Return a JSON array. Each object must have:
{
  "raw_text": string,
  "display_name_en": string,
  "display_name_hi": string,
  "scientific_name": string,
  "code": string | null,
  "category": string,
  "what_it_is_en": string,   // max 20 words, plain English, 8th-grade level
  "what_it_is_hi": string,   // same, natural Hindi (not literal translation)
  "verdict": "good" | "average" | "avoid" | "unknown",
  "verdict_reason_en": string,  // max 15 words
  "verdict_reason_hi": string,
  "allergen_tags": string[],
  "confidence": number  // 0.0-1.0
}
```

**Response handling:**
- Strip any ``` fences before parsing
- Validate against schema; drop malformed entries rather than crashing
- **Cache every resolved ingredient to the local DB** — we should never pay to resolve "Palm Oil" twice
- On API failure, degrade gracefully: show the ingredient as `unknown` with "Couldn't check this one right now"

### 11.3 Prompt B — Personal explanation

```
SYSTEM:
You write short, warm, plain-language health notes for an Indian
food-label app. Rules:
- 2-3 sentences maximum. Never more.
- Speak directly to the person: "you", "your".
- No medical advice, no diagnosis, no prescribing.
- No alarmism. Be honest but calm.
- 8th-grade reading level.
- Never contradict the provided verdict — you explain it, you
  don't decide it.
- Output ONLY the explanation text. No JSON, no preamble.

USER:
Language: Hindi
Verdict (already decided, do not change): not_recommended

Person: 54-year-old man, 78kg, 172cm, Type 2 diabetes, high blood
pressure. Goal: manage blood sugar.

Product: Instant noodles, health score 34/100, Grade D

Flagged for this person:
- Sodium 1,240mg per pack (83% of his daily limit)
- Maltodextrin (rapid blood-sugar spike)
- Palm oil (saturated fat)
- INS 621 / MSG (hidden sodium)

Write the explanation.
```

**Expected output (Hindi):**
> इस एक पैकेट में आपकी पूरे दिन की नमक की सीमा का 83% है — और इसमें माल्टोडेक्सट्रिन है जो चीनी से भी तेज़ी से शुगर बढ़ाता है। आपके डायबिटीज़ और बीपी दोनों के लिए यह ठीक नहीं है। नीचे दिए गए विकल्प देखिए।

### 11.4 Cost control

| Technique | Effect |
|---|---|
| Local DB handles ~85% of tokens | Cuts API calls by ~85% at source |
| Batch all unknowns into ONE call per scan | 1 call instead of N |
| Cache every resolved ingredient permanently | Each unique ingredient is paid for once, globally |
| Cache explanations by `(product_hash + profile_hash)` | Repeat scans of the same product by the same user are free |
| Use `gemini-flash` tier for ingredient lookup | Cheaper; reserve the stronger model for explanations |
| Rate-limit free tier (e.g. 20 AI-assisted scans/day) | Prevents abuse without paywalling the core verdict |

---

## 12. Nearby Alternatives Feature

### 12.1 The problem it solves
"Eat something healthier" is useless advice if the user can't find the product. This turns information into action.

### 12.2 Two implementation levels

#### Level 1 — MVP (no partnerships required)
1. Product scored poorly → look up its `category` tag
2. Query internal DB for higher-scoring products in the same category, filtered by profile (allergies, diet preference)
3. Call **Google Places API** with the user's coordinates for nearby grocery retail (`supermarket`, `grocery_or_supermarket`, `convenience_store`)
4. Display: alternative product + "Grocery stores near you: [name], 0.8 km"

**Honest labelling:** `"Commonly available"` — never claim confirmed stock.

#### Level 2 — Growth (requires partnerships)
Integrate quick-commerce APIs (Blinkit, Zepto, Swiggy Instamart, BigBasket) for **SKU-level, real-time availability** plus a deep link to order.

**Honest labelling:** `"In stock on Blinkit · 12 min"` — this claim is verified, so it can be stated.

### 12.3 Location permission UX

**Never request location on app launch.** Request it only at the moment of value:

```
┌─────────────────────────────────────┐
│  📍                                 │
│  Find these near you?               │
│                                     │
│  We'll use your location once to    │
│  show which healthier options are   │
│  available nearby. We don't store   │
│  or share where you are.            │
│                                     │
│  [ Not now ]      [ Allow ]         │
└─────────────────────────────────────┘
```

### 12.4 Trust guardrails
- **Never overpromise stock.** Kirana inventory changes hourly; unless you have a retail API, you don't know.
- Distinguish clearly in the UI between "commonly available" and "confirmed in stock."
- No paid placement in alternatives. If a brand ever pays, label it `Sponsored` unmistakably. *(FactsScan's own weak point was users feeling data was unreliable — don't repeat it.)*

---

## 13. Data Models

### 13.1 `UserProfile`

```json
{
  "profile_id": "uuid",
  "is_primary": true,
  "name": "Rajesh",
  "age": 54,
  "sex": "male",
  "height_cm": 172,
  "weight_kg": 78,
  "activity_level": "moderate",
  "conditions": ["diabetes_t2", "hypertension"],
  "allergies": ["milk"],
  "diet_preference": "non_vegetarian",
  "goal": "manage_blood_sugar",
  "language": "hi",
  "daily_targets": {
    "calories": 1800,
    "protein_g": 70,
    "carbs_g": 220,
    "fat_g": 60,
    "sugar_g": 25,
    "sodium_mg": 1500,
    "fibre_g": 30
  },
  "created_at": "2026-08-30T10:00:00Z",
  "updated_at": "2026-08-30T10:00:00Z"
}
```

### 13.2 `Ingredient` (local DB row)
As specified in §9.

### 13.3 `ScanResult`

```json
{
  "scan_id": "uuid",
  "timestamp": "2026-08-30T14:32:00Z",
  "profile_id": "uuid",
  "capture_method": "ocr",
  "raw_ocr_text": "INGREDIENTS: Refined Wheat Flour (Maida)...",
  "product_name": "Instant Noodles",
  "product_category": "instant_noodles",
  "brand": null,
  "ingredients": [ /* Ingredient[] */ ],
  "nutrition": {
    "serving_size_g": 70,
    "calories": 380,
    "protein_g": 8.2,
    "carbs_g": 52.0,
    "sugar_g": 2.1,
    "fat_g": 15.4,
    "sat_fat_g": 7.1,
    "trans_fat_g": 0.2,
    "fibre_g": 1.8,
    "sodium_mg": 1240
  },
  "score": 34,
  "grade": "D",
  "ribbon": { "good": 3, "average": 4, "avoid": 5, "unknown": 1 },
  "personal_verdict": {
    "verdict": "not_recommended",
    "explanation_en": "...",
    "explanation_hi": "...",
    "triggered_rules": ["sodium_hypertension", "maltodextrin_diabetes"],
    "hard_blocks": []
  },
  "alternatives": [ /* Product[] */ ]
}
```

### 13.4 `Product` (alternatives DB)

```json
{
  "product_id": "uuid",
  "name": "Ragi Cookies",
  "brand": "Brand Y",
  "category": "biscuits",
  "barcode": "8901234567890",
  "score": 78,
  "grade": "B",
  "key_benefits_en": ["No palm oil", "6g fibre per serving"],
  "key_benefits_hi": ["पाम तेल नहीं", "6 ग्राम फाइबर"],
  "ingredients": [ /* ... */ ],
  "nutrition": { /* ... */ },
  "availability": {
    "quick_commerce": ["blinkit", "zepto"],
    "typical_retail": true
  }
}
```

---

## 14. UI/UX Design System

### 14.1 Design direction

**Concept: "The Kitchen Garden."**
Not a clinical medical app, not a corporate fintech dashboard. The visual language borrows from Indian home cooking and the kitchen garden — fresh, honest, warm, unpretentious. It should feel like a knowledgeable friend in the grocery aisle, not a lab report.

**The three feelings to hit:** *fresh, honest, calm.*

**What we deliberately avoid:**
- Cold clinical white + blue medical styling (feels like a hospital)
- Alarmist red-heavy design (creates food anxiety, drives uninstalls)
- Neon "tech green" (#00FF88 and friends — reads as crypto, not food)
- Cream + terracotta + serif (the current AI-design default look)

### 14.2 Colour tokens

```css
:root {
  /* ── Brand greens: from neem leaf to fresh sprout ────── */
  --leaf-900: #133A24;   /* deepest — headings, primary text */
  --leaf-700: #1F6B3F;   /* dark green — pressed states */
  --leaf-600: #2E8B57;   /* PRIMARY — buttons, brand, active nav */
  --leaf-400: #6FC08D;   /* mid — illustrations, secondary fills */
  --leaf-200: #B8E3C7;   /* light — chips, subtle highlights */
  --leaf-50:  #E9F6EE;   /* tint — card backgrounds, selected rows */

  /* ── Surface: warm off-white with a faint green cast ─── */
  --paper:     #FAFCF7;  /* app background — NOT pure white */
  --surface:   #FFFFFF;  /* cards, sheets */
  --surface-2: #F2F6F1;  /* recessed areas, input fields */

  /* ── Ink ──────────────────────────────────────────────── */
  --ink-900: #13251A;    /* primary text */
  --ink-600: #4E6355;    /* secondary text */
  --ink-400: #8CA093;    /* tertiary, placeholders */
  --ink-200: #DCE5DE;    /* borders, dividers */

  /* ── Verdict scale: kitchen-spice derived ─────────────── */
  --verdict-good:     #2E8B57;  /* fresh leaf */
  --verdict-good-bg:  #E9F6EE;
  --verdict-average:  #D9962B;  /* turmeric / haldi */
  --verdict-average-bg:#FDF4E3;
  --verdict-avoid:    #C4442E;  /* dried red chilli */
  --verdict-avoid-bg: #FBEDEA;
  --verdict-unknown:  #8CA093;  /* neutral grey-green */
  --verdict-unknown-bg:#F2F6F1;

  /* ── Accent: warm turmeric, used sparingly ───────────── */
  --haldi-500: #E8A33D;  /* highlights, badges, tips */
  --haldi-50:  #FDF4E3;

  /* ── Semantic ─────────────────────────────────────────── */
  --danger:  #C4442E;
  --warning: #D9962B;
  --success: #2E8B57;
  --info:    #3D7A8C;    /* muted teal, for neutral info only */
}
```

**Dark mode:** invert surfaces to `#0E1A13` / `#15251B`, lift greens toward `--leaf-400`, keep verdict hues identical for consistency of meaning.

**Why this palette works:** the green is a *real leaf* green (#2E8B57 — sea green), not a synthetic tech green. The verdict scale is derived from the Indian kitchen itself — leaf, turmeric, red chilli — so the colour meanings feel intuitive to the audience rather than borrowed from Western traffic lights.

### 14.3 Typography

**Critical constraint:** the type stack must render Devanagari and Latin beautifully in the same layout, at the same optical weight. Most "nice" display fonts fail this immediately.

| Role | Typeface | Why |
|---|---|---|
| **Display** | **Baloo 2** | Rounded, warm, friendly. Full Devanagari + Latin support from a single family, so Hindi and English headings match in weight and mood. Approachable without being childish. |
| **Body** | **Hind** | Designed by Indian Type Foundry specifically for dual-script Devanagari/Latin setting. Exceptionally readable at small sizes on low-end Android screens. |
| **Data / numerals** | **IBM Plex Mono** | Tabular figures for scores, macros, and percentages so numbers align in columns and don't jitter when they update. |

```css
--font-display: 'Baloo 2', sans-serif;
--font-body:    'Hind', sans-serif;
--font-data:    'IBM Plex Mono', monospace;
```

**Type scale (mobile, 4px base grid):**

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `display-xl` | 40 / 44 | 700 | Health score numeral |
| `display-lg` | 28 / 34 | 600 | Screen titles |
| `heading` | 20 / 26 | 600 | Section headings |
| `subheading` | 17 / 24 | 500 | Card titles, ingredient names |
| `body` | 15 / 23 | 400 | Explanations, paragraphs |
| `caption` | 13 / 18 | 400 | Metadata, helper text |
| `label` | 12 / 16 | 600 | Uppercase eyebrows, tab labels |
| `data-lg` | 24 / 28 | 600 | Macro values |

**Devanagari adjustment:** Devanagari has a taller x-height and needs more line spacing. When `locale === 'hi'`, increase all line-heights by **+2px** and reduce letter-spacing to `0`. Never apply Latin letter-spacing to Devanagari — it breaks conjuncts visually.

### 14.4 Spacing, radius, elevation

```css
/* 4px base grid */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px; --space-12: 48px;

/* Generous, organic radii — nothing sharp */
--radius-sm:   8px;   /* chips, small buttons */
--radius-md:  14px;   /* inputs, list rows */
--radius-lg:  20px;   /* cards */
--radius-xl:  28px;   /* hero scan card, bottom sheets */
--radius-full: 999px; /* pills, avatars, FAB */

/* Soft, green-tinted shadows — never pure black */
--shadow-sm: 0 1px 3px  rgba(19, 58, 36, 0.06);
--shadow-md: 0 4px 12px rgba(19, 58, 36, 0.08);
--shadow-lg: 0 8px 28px rgba(19, 58, 36, 0.10);
```

**Layout rules:**
- Screen edge padding: `--space-4` (16px)
- Card internal padding: `--space-5` (20px)
- Vertical rhythm between sections: `--space-6` (24px)
- Minimum touch target: **48 × 48 dp** (Android accessibility standard — non-negotiable given the Sunita persona)

### 14.5 The signature element — The Ingredient Ribbon ⭐

The one thing this app should be remembered by.

A single horizontal stacked bar sitting directly under the score, showing the proportion of good / average / avoid ingredients:

```
▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓▓▓
 6 good      4 average  2 avoid
```

**Why it earns its place:**
- Communicates the entire label in **under half a second**, before any reading
- Works for low-literacy and low-vision users
- Crosses the language barrier completely — no translation needed
- Becomes the shareable, screenshot-able signature of the product

**Behaviour:** segments animate in left-to-right on scan completion (300ms, ease-out). Tapping a segment scroll-jumps to the first ingredient of that verdict type. Segments carry a subtle texture (fine diagonal hatching on `avoid`) so the meaning survives colour-blindness and greyscale printing.

### 14.6 Core components

**Verdict Chip**
```
🟢 Good    🟠 Average    🔴 Not good    ⚪ Unclear
```
Pill shape, `--radius-full`, tinted background + solid coloured dot + label. **Always pairs colour with an icon and text** — colour alone never carries meaning (8% of Indian men have some colour-vision deficiency).

**Ingredient Row**
- 4px coloured left stem bar (the verdict colour)
- Ingredient name in `subheading`
- One-line summary in `caption`, `--ink-600`
- Chevron to expand
- Expands with a 250ms height animation, no layout jump

**Score Badge**
- Leaf-silhouette outline containing the numeral in `--font-data`
- Ring fills clockwise on reveal (600ms, ease-out)
- Colour derived from grade band

**Primary Button**
- `--leaf-600` fill, `--paper` text, `--radius-full`, 52px height, `--shadow-sm`
- Pressed: `--leaf-700` + scale(0.98)
- Disabled: `--ink-200` fill, `--ink-400` text

**Bottom Sheet**
- `--radius-xl` top corners, grab handle, backdrop `rgba(19,58,36,0.4)`
- Springs up 350ms, `cubic-bezier(0.32, 0.72, 0, 1)`

**Empty states** — never a blank screen. Always an illustration + one clear action:
> 🌱 *"No scans yet. Point your camera at any food label to start."*

### 14.7 Motion

| Interaction | Motion | Duration |
|---|---|---|
| Screen transition | Slide + fade | 250ms ease-out |
| Bottom sheet | Spring up | 350ms |
| Score ring fill | Clockwise sweep | 600ms ease-out |
| Ribbon segments | Stagger left→right | 300ms, 60ms stagger |
| Row expand | Height auto | 250ms ease-in-out |
| Scan analysing | Rotating leaf | 1.2s loop |
| Button press | Scale 0.98 | 100ms |

**All motion must respect `prefers-reduced-motion`.** When enabled, replace every animation with an instant state change — no exceptions.

### 14.8 Iconography

- **Style:** rounded, 2px stroke, organic terminals — soft, never sharp or technical
- **Library:** Lucide or Phosphor (rounded weight), with custom food/leaf glyphs
- **Size:** 24dp standard, 28dp nav, 20dp inline
- **Never icon-only** for primary actions — always paired with a text label, since Hindi-preferring users may not recognise Western icon conventions

### 14.9 Accessibility floor

- Contrast: minimum **4.5:1** for body text, **3:1** for large text — verified for both light and dark modes
- Touch targets: minimum 48 × 48 dp
- Full TalkBack labels on every interactive element, in the active language
- Dynamic type: layout must survive 200% font scaling without clipping
- Colour never carries meaning alone (icon + text always present)
- Visible keyboard/D-pad focus rings

### 14.10 Voice & tone

**Personality:** a knowledgeable friend in the grocery aisle. Calm, direct, never preachy, never alarmist.

| ❌ Don't write | ✅ Do write |
|---|---|
| "TOXIC CHEMICALS DETECTED!" | "This has 2 ingredients worth avoiding." |
| "Submit" | "Save profile" |
| "Error: OCR extraction failed (code 422)" | "We couldn't read the label. Try again in better light?" |
| "You should not consume this product." | "This one isn't a good fit for you. Here's a better option." |
| "Optimise your macronutrient intake." | "You're low on protein today." |

**Rules:**
- Sentence case everywhere. No SHOUTING.
- Active voice. A button says exactly what happens: "Save profile" → toast says "Profile saved."
- Never shame the user for a food choice. Inform, offer an alternative, move on.
- Errors explain what happened and how to fix it. They don't apologise and they're never vague.
- Empty screens are invitations to act, not dead ends.

---

## 15. Wireframes

### 15.1 Home

```
┌───────────────────────────────────────┐
│ नमस्ते, Rajesh 👋           🌐 हि|EN  │
│ आज क्या स्कैन करना है?                 │
│                                       │
│ ╭───────────────────────────────────╮ │
│ │                                   │ │
│ │             ┌───────┐             │ │
│ │             │  📷   │             │ │
│ │             └───────┘             │ │
│ │      Scan Ingredient Label        │ │
│ │        लेबल स्कैन करें             │ │
│ │                                   │ │
│ │   Point at the back of any pack   │ │
│ ╰───────────────────────────────────╯ │
│                                       │
│ ╭───────────────────────────────────╮ │
│ │  🔄  Find Healthier Alternatives  │ │
│ │      बेहतर विकल्प खोजें            │ │
│ ╰───────────────────────────────────╯ │
│                                       │
│ ╭───────────────────────────────────╮ │
│ │ 🥗 Your Diet Plan                 │ │
│ │    1,240 / 1,800 kcal today       │ │
│ │    ▓▓▓▓▓▓▓▓▓░░░░░  69%            │ │
│ ╰───────────────────────────────────╯ │
│                                       │
│ Recent Scans                 See all →│
│ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │🟢 A │ │🟠 C │ │🔴 E │               │
│ │Oats │ │Maggi│ │Chips│               │
│ └─────┘ └─────┘ └─────┘               │
│                                       │
│ ╭───────────────────────────────────╮ │
│ │ 💡 Did you know?                  │ │
│ │ INS 621 is MSG. Safe in small     │ │
│ │ amounts, but adds hidden sodium.  │ │
│ ╰───────────────────────────────────╯ │
├───────────────────────────────────────┤
│  🏠      📷      🥗      👤           │
│ Home    Scan    Plan   Profile        │
└───────────────────────────────────────┘
```

### 15.2 Scan Result

```
┌───────────────────────────────────────┐
│ ←  Result                        ⋮    │
│                                       │
│              ╭─────────╮              │
│              │   34    │              │
│              │  /100   │              │
│              ╰─────────╯              │
│         GRADE D · NOT GOOD            │
│                                       │
│   ▓▓▓░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓░            │
│   3 good  4 average  5 avoid  1 ?     │
│                                       │
│ ╭───────────────────────────────────╮ │
│ │ 👤 For you (Rajesh · Diabetes,BP) │ │
│ │                                   │ │
│ │ 🔴 Not recommended                │ │
│ │                                   │ │
│ │ One pack has 83% of your daily    │ │
│ │ salt limit, plus maltodextrin     │ │
│ │ which spikes blood sugar faster   │ │
│ │ than sugar does.                  │ │
│ │                        [ Why? ▾ ] │ │
│ ╰───────────────────────────────────╯ │
│                                       │
│ INGREDIENTS · सामग्री       13 found  │
│                                       │
│ ┃🔴 Refined Wheat Flour (Maida)    ▾ │
│ ┃   Stripped of fibre. Spikes sugar. │
│ ┃                                    │
│ ┃🔴 Palm Oil                       ▾ │
│ ┃   High saturated fat.              │
│ ┃                                    │
│ ┃🟠 INS 621 · MSG                  ▾ │
│ ┃   Flavour enhancer. Hidden sodium. │
│ ┃                                    │
│ ┃🟢 Salt · नमक                     ▾ │
│ ┃   Basic seasoning.                 │
│                                       │
│ ╭───────────────────────────────────╮ │
│ │ 📊 Calculate protein, carbs & fat │ │
│ ╰───────────────────────────────────╯ │
│                                       │
│ BETTER OPTIONS · बेहतर विकल्प         │
│ ╭───────────────────────────────────╮ │
│ │ 🟢 A  Brand X Multigrain Noodles  │ │
│ │       No palm oil · 5g fibre      │ │
│ │       📍 Available 0.8 km away →  │ │
│ ╰───────────────────────────────────╯ │
│                                       │
│  💾 Save    ↗ Share    ⚑ Report      │
└───────────────────────────────────────┘
```

### 15.3 Family verdict switcher (on result screen)

```
┌───────────────────────────────────────┐
│ Who is eating this?                   │
│ ( R )  ( S )  ( A )  ( + )            │
│  ●Raj   Sunita  Aarav                 │
│                                       │
│ 🔴 Rajesh   Not recommended (BP)      │
│ 🟠 Sunita   Limit — pregnancy         │
│ 🔴 Aarav    CONTAINS PEANUT ⛔        │
└───────────────────────────────────────┘
```

---

## 16. Localisation — Hindi & English

### 16.1 Scope

**Fully bilingual, not partially.** Every one of these must switch:

- All UI labels, buttons, nav, and empty states
- All ingredient names and explanations (both stored in the local DB as `_en` and `_hi` fields)
- All Gemini-generated explanations (language passed as a prompt parameter)
- Error messages and toasts
- Onboarding and educational tips
- Numbers and units (keep Latin numerals — Devanagari numerals reduce comprehension for most modern Hindi readers)

### 16.2 Implementation

```
/lib/l10n/
  app_en.arb
  app_hi.arb
```

- Flutter `intl` / React Native `i18next`
- Language toggle in the Home header **and** in Profile → Settings
- Persist choice in local storage; auto-detect device locale on first launch
- Switching language must **not** require an app restart
- Roadmap: Marathi, Tamil, Telugu, Bengali, Gujarati (v2)

### 16.3 Hindi copy principles

- **Translate the meaning, not the words.** "Not recommended" → "आपके लिए ठीक नहीं है" (natural) — *not* "अनुशंसित नहीं" (stiff, bureaucratic).
- **Keep well-known English terms in Devanagari transliteration** where that's what people actually say: "प्रोटीन" not "प्रोटीन (protein) प्रोटयुक्त", "कैलोरी" not "ऊष्मांक".
- **Ingredient names show both scripts** — the label is printed in English, so the user needs to match what they see: `INS 621 · मोनोसोडियम ग्लूटामेट`.
- **Hire a native Hindi copywriter for review.** Machine-translated health copy reads as untrustworthy, and trust is the entire product.

### 16.4 Layout implications

- Hindi strings run **15–25% longer** than English — every layout must be tested at Hindi length; no fixed-width buttons
- Devanagari needs +2px line-height (see §14.3)
- Both languages are LTR, so no RTL mirroring needed
- Test on a 5-inch, 720p screen — the low-end Android reality for a large share of the target audience

---

## 17. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Flutter | Single codebase, excellent Devanagari rendering, strong performance on low-end Android |
| **OCR** | Google ML Kit Text Recognition v2 | Free, on-device, offline, ~200ms, Latin + Devanagari |
| **Barcode** | ML Kit Barcode Scanning | Same SDK, EAN/UPC |
| **Local DB** | SQLite (Drift/Floor) | Bundled ingredient DB, offline-first, cache layer |
| **Backend** | Firebase (Auth, Firestore, Functions) | Fast to ship; Functions proxy the Gemini key so it's never in the client |
| **AI** | Google Gemini API (`gemini-flash` + `gemini-pro`) | Ingredient long-tail + explanation generation |
| **Places** | Google Places API | Nearby store lookup |
| **Analytics** | Firebase Analytics | Funnel, scan success rate, retention |
| **Crash** | Firebase Crashlytics | OCR failure diagnostics |
| **State** | Riverpod | Testable, scales cleanly |
| **i18n** | `flutter_intl` (ARB) | Standard, well-tooled |

**Security note:** the Gemini API key must live **only** in a Cloud Function, never in the app binary. All AI calls route through your backend.

---

## 18. Privacy, Safety & Legal

### 18.1 Health data is sensitive data

- **Store the profile locally on-device by default.** Cloud sync must be explicit opt-in.
- No selling of user health data. Ever. *(Note: FactsScan's own listed revenue streams include "selling data" — being explicitly the opposite is a marketable trust position.)*
- One-tap **"Delete all my data"** in Profile → Settings that genuinely erases everything.
- Data export (JSON) on request.
- Clear, plain-language privacy policy — not a wall of legalese.
- Request location only at the point of use, never at launch.
- DPDP Act 2023 compliance for Indian users.

### 18.2 Medical disclaimer — mandatory

Displayed on onboarding, in Profile, and as a persistent footer on every scan result:

> **This app gives general nutrition information, not medical advice.** It is not a substitute for your doctor or a registered dietitian. If you have a health condition, always follow your doctor's guidance.
>
> **यह ऐप सामान्य पोषण जानकारी देता है, चिकित्सा सलाह नहीं।** किसी भी स्वास्थ्य समस्या के लिए अपने डॉक्टर की सलाह ज़रूर लें।

### 18.3 Content safety rules

- **Never diagnose.** The app describes food, never the person's health status.
- **Never prescribe.** No "you should stop eating X."
- **Never contradict a doctor.** If a user mentions medical advice, defer to it.
- **The LLM never decides safety.** Rules decide; Gemini only explains (see §10.1).
- **Say "unknown" when unknown.** A wrong confident answer is worse than an honest gap.
- **No eating-disorder risk patterns** — no calorie shaming, no "bad food" moralising, no streaks that punish, no aggressive restriction prompts.

### 18.4 Accuracy safeguards

- Show OCR confidence; let the user correct a misread ingredient
- "Report wrong data" on every result, routed to a review queue
- Version the ingredient DB so corrections ship without an app update
- Footer note: *"Formulations change. Always check the physical pack."*

---

## 19. Development Roadmap

### Phase 1 — MVP (Months 1–3) — *prove the OCR wedge*
- [ ] Camera capture + ML Kit OCR of ingredient panels
- [ ] Ingredient parser and normaliser
- [ ] Local ingredient DB — **500 most common Indian ingredients + all INS codes**
- [ ] Rule-based scoring (0–100, A–E) + Ingredient Ribbon
- [ ] Scan result screen with expandable ingredient rows
- [ ] Basic profile form (height, weight, age, sex, conditions, allergies)
- [ ] Default average-adult fallback when no profile exists
- [ ] English + Hindi UI
- [ ] Scan history

**MVP success metric:** ≥90% OCR ingredient-extraction accuracy across 200 real Indian labels photographed by real users in real store lighting.
**If below 90%:** build a human-in-the-loop correction UI before scaling. *(HealthifyMe shipped Snap at 60–70% and needed reviewer correction — plan for this.)*

### Phase 2 — Intelligence (Months 4–5)
- [ ] Gemini integration for unknown ingredients + caching
- [ ] Gemini personal explanations, condition-specific
- [ ] Full condition rule tables (diabetes, BP, CKD, heart, pregnancy, PCOS, thyroid)
- [ ] Nutrition calculator with profile-based daily values
- [ ] Alternatives engine (category-based, in-app DB)

### Phase 3 — Depth (Months 6–7)
- [ ] Diet Planner tab with daily logging and macro targets
- [ ] Family / multi-profile support ⭐
- [ ] Nearby alternatives — Level 1 (Google Places)
- [ ] Barcode mode for known products
- [ ] Glossary / education section
- [ ] Compare two products side by side

### Phase 4 — Scale (Months 8–12)
- [ ] Quick-commerce API partnerships — Level 2 availability
- [ ] Additional languages (Marathi, Tamil, Telugu, Bengali, Gujarati)
- [ ] Community ingredient contributions with expert review
- [ ] Published scoring-rubric page (transparency play)
- [ ] Nutritionist/dietitian B2B tier
- [ ] FSSAI recall and advisory feed

### Monetisation — deliberately gentler than the competition
**Free forever:** unlimited OCR scans, full ingredient table, colour verdicts, general assessment, Hindi/English.
**Premium (₹399/yr — undercut FactsScan's ₹449):** family profiles, diet planner history and trends, nearby availability, product comparison, ad-free.

> **Never paywall the core verdict.** That's what people install the app for, and paywalling it is the fastest way to lose to a free competitor.

---

## 20. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **OCR accuracy on curved, glossy, crumpled packets** | 🔴 High | Framing guide overlay, glare detection, multi-frame capture, manual correction UI, fall back to barcode |
| **Gemini hallucinating an ingredient verdict** | 🔴 High | Local DB is first line; strict JSON schema validation; explicit `unknown` path; **LLM never decides safety, only explains** |
| **Giving harmful advice to someone with a serious condition** | 🔴 High | Rules-only safety layer, conservative defaults, persistent medical disclaimer, expert review of all condition rules |
| **API cost spiralling with scale** | 🟠 Medium | 85% local resolution, aggressive permanent caching, batched calls, flash-tier model, free-tier rate limit |
| **FactsScan or TruthIn ships OCR first** | 🟠 Medium | Speed to market; if beaten, pivot to depth — clinical partnerships for diabetes/CKD, family profiles |
| **HealthifyMe extends Snap to packaged-food grading** | 🟠 Medium | They have distribution and capital. Defend on Hindi-first, family profiles, and free core verdict |
| **Sparse alternatives database at launch** | 🟠 Medium | Seed the top 500 SKUs in the 10 highest-volume categories; expand from scan data |
| **Users distrust the scores** | 🟠 Medium | **Publish the rubric openly** — TruthIn discloses 45/45/10, FactsScan discloses nothing. Transparency is the differentiator |
| **Hindi copy reads as machine-translated** | 🟠 Medium | Native Hindi copywriter reviews every string; user-test with Hindi-first users |
| **Low-end device performance** | 🟡 Low | On-device OCR, lazy image loading, test on 2GB RAM / 720p reference device |
| **Brands legally challenge a low score** | 🟡 Low | Score only against published FSSAI/WHO thresholds; state methodology publicly; no subjective claims; legal review |

---

## 21. Appendix

### 21.1 Sample ingredient DB rows

| Raw name | INS/E | Display (EN) | Display (HI) | What it really is | Verdict | Watch for |
|---|---|---|---|---|---|---|
| Refined Wheat Flour | — | Maida | मैदा | Wheat flour with bran and germ removed | 🔴 avoid | diabetes, PCOS |
| Palm Oil | — | Palm Oil | पाम तेल | Cheap vegetable fat, high in saturated fat | 🔴 avoid | heart, cholesterol |
| Monosodium Glutamate | INS 621 | MSG | मोनोसोडियम ग्लूटामेट | Flavour enhancer; a sodium salt | 🟠 average | hypertension, CKD |
| Tartrazine | INS 102 | Yellow Colour | पीला रंग | Synthetic yellow dye | 🔴 avoid | children, asthma |
| Sodium Benzoate | INS 211 | Preservative | परिरक्षक | Stops mould and bacteria growing | 🟠 average | hypertension |
| Citric Acid | INS 330 | Citric Acid | साइट्रिक एसिड | Sour acid naturally found in lemons | 🟢 good | — |
| Maltodextrin | — | Maltodextrin | माल्टोडेक्सट्रिन | Starch-derived powder; spikes blood sugar fast | 🔴 avoid | **diabetes** |
| Hydrogenated Veg Fat | — | Vanaspati | वनस्पति | Hardened oil; source of trans fat | 🔴 avoid | heart, cholesterol |
| TBHQ | INS 319 | TBHQ | टीबीएचक्यू | Synthetic antioxidant that stops fat going rancid | 🟠 average | — |
| Whole Wheat Atta | — | Atta | आटा | Whole wheat flour with bran intact | 🟢 good | celiac ⛔ |
| Inulin | — | Chicory Fibre | चिकोरी फाइबर | Plant fibre that feeds gut bacteria | 🟢 good | IBS |
| Invert Sugar Syrup | — | Invert Sugar | इनवर्ट शुगर | Sugar broken into glucose + fructose | 🔴 avoid | **diabetes** |

### 21.2 Sugar aliases to flag for diabetic profiles

`sucrose` · `glucose` · `dextrose` · `fructose` · `maltose` · `lactose` · `maltodextrin` · `invert sugar` · `invert syrup` · `glucose syrup` · `corn syrup` · `high fructose corn syrup` · `HFCS` · `golden syrup` · `treacle` · `molasses` · `honey` · `jaggery` · `gur` · `fruit juice concentrate` · `cane juice` · `caramel` · `dextrin` · `rice syrup` · `barley malt` · `agave`

### 21.3 Sodium-carrying additives to flag for hypertension / CKD

`salt` · `sodium chloride` · `INS 621 (MSG)` · `INS 211 (sodium benzoate)` · `INS 500 (sodium bicarbonate)` · `INS 250 (sodium nitrite)` · `INS 251 (sodium nitrate)` · `INS 339 (sodium phosphate)` · `INS 452` · `sodium citrate` · `sodium caseinate` · `disodium inosinate (INS 631)` · `disodium guanylate (INS 627)`

### 21.4 Key competitive facts to keep in view

| Fact | Source |
|---|---|
| FactsScan Pro: ₹79/mo, ₹149/qtr, ₹249/6mo, ₹449/yr | App Store IAP listing |
| FactsScan: ~1 lakh products, 122K+ downloads, 4.3★ / ~252 reviews | Company investor page + Google Play |
| FactsScan's top complaint: "product not found" | Google Play reviews |
| TruthIn: 45% nutrition / 45% ingredients / 10% processing, 1–5 scale | TruthIn / NatFirst |
| TruthIn: 500,000+ users, 5M+ scans, ~35 staff incl. 15 nutritionists/doctors, ICMR-NIN recognised | TruthIn listings |
| HealthifyMe Snap: 150,000 Indian food items, 60–70% launch accuracy → ~80% | HealthifyMe / press |
| Yuka: not officially available in India | Market availability |
| Open Food Facts: free, open, NOVA + Nutri-Score, thin Indian coverage | Open Food Facts |

**Caveat:** most competitor traction figures are self-reported and unaudited. Treat as directional, not verified.

### 21.5 Open questions to resolve before build

1. **Ingredient DB sourcing** — build the initial 500 in-house, license from a nutrition data provider, or bootstrap from Open Food Facts' open dataset?
2. **Nutritionist review** — who signs off on the condition rule tables? (TruthIn's credibility rests on 15 nutritionists and ICMR-NIN recognition; you need an equivalent.)
3. **Alternatives DB seeding** — which 10 categories to launch with?
4. **Quick-commerce partnerships** — begin conversations with Blinkit/Zepto now, since these take months.
5. **Regional language priority** — which language after Hindi? Follow the user data.
6. **Name and trademark** — check availability before investing in brand design.

---

*End of specification.*
