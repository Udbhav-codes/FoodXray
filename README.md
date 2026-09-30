# FoodXray (FoodXray)

**Point your camera at any ingredient list. Get a verdict you can actually understand, in your language, for your body — and know what to buy instead.**

A mobile-first web app that decodes Indian packaged-food labels. Built from the product specification in [`FoodXray.md`](./FoodXray.md).

---

**Live:** [food-xray.vercel.app](https://food-xray.vercel.app)

## Deployment

Vercel (`bom1` / Mumbai) + Supabase (`ap-south-1` / Mumbai). Functions are
pinned to Mumbai in `vercel.json` so they sit next to both the database and
the users this is built for.

### Environment variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini. Server-side only — never `NEXT_PUBLIC_`. |
| `GEMINI_MODEL` | Fallback chain, tried in order. Defaults to `gemini-flash-latest,gemini-3.6-flash,gemini-flash-lite-latest`. |
| `SUPABASE_URL` | Project URL for the shared cache and rate limiting. |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS. Server-side only. |
| `RATE_LIMIT_SALT` | Salts the IP hash so rate-limit buckets are not reversible. |

Use the `-latest` model alias rather than pinning a version: pinned models get
closed to new API keys and start returning 404, which is what broke the first
attempt at this integration.

### Two serverless-specific gotchas, both fixed here

- **Vercel blocks vulnerable Next.js versions at build time.** A build failing
  with `VULNERABLE_NEXTJS_VERSION` is not a config problem — upgrade Next.
- **A floating promise after the response never runs.** The function is frozen
  as soon as it responds, so `void cacheStore(...)` silently did nothing and
  the shared cache stayed empty while every request paid full price. Deferred
  work has to go through `after()` from `next/server`.

### Database

Two tables, neither holding personal data. Health data stays on the device.

- `ai_cache` — Gemini responses keyed by request hash, shared across every
  instance and every user, so an ingredient resolved once is free globally.
- `rate_limits` — per-IP counters. Stores a salted SHA-256 of the IP, never
  the IP. Incremented through an atomic Postgres function so concurrent
  requests cannot both read a stale count.

Both have RLS enabled with **no policies**, so only the service role can reach
them, and the `SECURITY DEFINER` helpers have `EXECUTE` revoked from `anon`
and `authenticated` — otherwise anyone could have called them over the public
REST API to wipe the cache.

The limiter **fails open** if the database is unreachable: the cost of an
outage is a bigger Gemini bill, not a broken app.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3210>.

### Enabling AI (optional)

The app is fully functional without a key. To turn on Gemini-written
explanations, live alternatives and Q&A, paste a key into `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
```

Get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey),
then restart the dev server. Without it, every AI surface falls back to the
deterministic rule-written text and the bundled catalogue — nothing breaks,
and no AI-only UI is shown.

---

## What it does

| | |
|---|---|
| **OCR-first, not barcode-first** | Reads the *printed ingredient list* itself, so coverage isn't capped by a product database. Works for local brands, regional packs and brand-new SKUs on day one. This is the core bet — every India competitor fails with "product not found". |
| **One scan, many verdicts** | The same biscuit returns *Not recommended* for a diabetic father and *Do not eat* for a nut-allergic child, side by side. |
| **The Ingredient Ribbon** | One stacked bar showing good / average / avoid proportions. Readable in half a second, before any text — and it crosses the language barrier entirely. |
| **Genuinely bilingual** | Full UI, ingredient names and explanations in English and Hindi, switchable in one tap. Not a translated afterthought. |
| **Honest about gaps** | If neither the database nor the parser can identify an ingredient, it says *"We couldn't identify this one"* rather than inventing a verdict. |

---

## The scoring rubric — published openly

A score is worthless if nobody can check it. The competition discloses little or nothing; this is the whole method.

**Final score = 40% nutrition + 40% ingredient quality + 20% processing level.**

### 1 · Nutritional profile (40%)

Scored against per-100g thresholds derived from WHO and FSSAI guidance.

| Nutrient | Concern from | Very high | Penalty |
|---|---|---|---|
| Sugar | 5 g | 22.5 g | up to −42 |
| Sodium | 120 mg | 600 mg | up to −42 |
| Saturated fat | 1.5 g | 10 g | up to −32 |
| Trans fat | 0.1 g | 0.2 g | −15 to −30 |
| Fibre | — | ≥ 6 g | **+12** |
| Protein | — | ≥ 8 g | **+10** |

Two deliberate refinements:

- **Penalties scale past the threshold.** A product at 1,560 mg sodium is not the same as one at 610 mg, so the penalty keeps growing rather than flatlining at the cut-off.
- **Drinks use a stricter sugar scale** (concern 1.5 g, very high 9 g per 100 ml). Nobody eats 100 g of biscuit in one sitting, but a 250 ml glass is normal — 13 g/100 ml is a whole day's sugar in one drink.

### 2 · Ingredient quality (40%)

Every ingredient carries a penalty weight from 0 (whole food) to 10 (trans fat).

- **Position matters.** Indian labels list ingredients by descending quantity, so palm oil listed second is weighted far more heavily than palm oil listed twelfth.
- **Harm does not average out.** A pure average would let a product bury four bad ingredients among ten harmless ones. The final figure blends the position-weighted average (60%) with the three worst offenders (40%).
- **Unknown ingredients are never penalised.** A gap in our database is our problem, not the product's.

### 3 · Processing level (20%)

A NOVA-style 1–4 classification, from additive markers and list composition. Two industrial markers together (say a synthetic colour plus an artificial flavour) put a product in group 4 — it cannot exist outside a factory.

### Grade bands

| Score | Grade | Verdict |
|---|---|---|
| 80–100 | **A** | Good — eat freely |
| 65–79 | **B** | Good — minor concerns |
| 45–64 | **C** | Average — occasional |
| 25–44 | **D** | Not good — limit |
| 0–24 | **E** | Avoid |

**Hard override:** any allergen matching an active profile forces a red *Do not eat*, regardless of score.

If the photo contains no nutrition panel, that 40% is redistributed across the two components we *can* measure, and the result says so rather than inventing numbers.

---

## AI architecture

Gemini writes the *prose*. It never decides the *verdict*.

| Surface | What Gemini does | Fallback when off |
|---|---|---|
| **Personal explanation** | Rewrites the rules engine's decision as 2–3 warm, specific sentences for this person | Rule-composed sentence |
| **Live alternatives** | Google Search–grounded lookup of real products on sale in India, filtered by allergies and diet | Bundled seed catalogue |
| **Unknown ingredients** | Identifies the long tail the local DB missed, batched into one call per scan | Honest "we couldn't identify this" |
| **Ask anything** | Free-text Q&A about the label in front of you | Panel is hidden |
| **Tip of the day** | Written for what this household actually scans | Fixed 8-tip rotation |
| **Score & verdict** | **Nothing. Never.** | — |

That last row is the whole point. The personalisation engine has two layers,
and the separation is a safety requirement rather than an optimisation:

1. **Deterministic rules decide.** Condition tables map diabetes, hypertension, CKD, heart, pregnancy, PCOS, thyroid and celiac to ingredient and nutrient adjustments. Auditable, testable, reproducible — the same label always yields the same verdict.
2. **Language only explains.** The generative layer rephrases what the rules already decided. Every prompt states the verdict as already-decided and forbids changing it. **An LLM never decides whether a person with a condition can eat something.**

Enforced in code, not just in prompts:

- The API key is server-side only, behind `import "server-only"` — a client import is a build error, not a silent leak.
- Model-returned ingredient penalties are clamped to 0–10; allergen tags are filtered against a fixed allowlist.
- Anything below a 0.5 confidence floor is downgraded to `unknown` server-side rather than shown as fact.
- Availability claims are normalised to three levels we can defend. `"in stock"` is impossible to emit.
- Every AI response is cached — server-side by content hash, client-side in `localStorage` — so an ingredient is paid for once (spec §11.4).

### Privacy of the AI path

This is the one place data leaves the device, so it is opt-out in Settings and minimised:

- **The name never leaves the device.** Exact age is coarsened to a band ("50-65").
- Only conditions, allergies and the label's own contents are sent.
- Switching AI off clears every cached AI response, so "off" means off.
- With no key configured, no AI request is ever made and no AI-only UI appears.

Further guardrails, per spec §18:

- Never diagnoses, never prescribes, never contradicts a doctor.
- Says *unknown* when unknown. A confidently wrong answer destroys trust permanently.
- No calorie shaming, no punishing streaks, no "bad food" moralising.
- The medical disclaimer is persistent on every result.

---

## Privacy

Health data is sensitive data, so the app is built to hold as little as possible:

- Profiles, scans and food logs live in `localStorage` on the device. There is no server.
- Location is requested **only at the moment of value** — never on launch — and is not stored.
- **Export my data** produces a JSON file; **Delete all my data** genuinely erases everything.
- Availability is labelled *"commonly available"*, never *"in stock"*. Without a retailer API we do not know what is on a shelf, and saying otherwise would be a lie.

---

## Tech

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Real routes, so the browser back button behaves |
| Styling | Tailwind CSS v4 + CSS custom properties | Semantic tokens, themed light/dark from one source |
| OCR | `tesseract.js` (in-browser) | The web equivalent of ML Kit — free, on-device, `eng` + `hin` |
| Storage | `localStorage` | Offline-first; nothing leaves the device |
| Fonts | Baloo 2 · Hind · IBM Plex Mono | Devanagari and Latin from one family per role, so both scripts match in weight |

Devanagari data is fetched only when the interface is actually set to Hindi.

### Layout

```
src/
  app/          routes — home, scan, result/[id], alternatives, plan, profile, history
  components/   Icon (SVG only), Verdict (ribbon, score badge, chips), IngredientRow, UI primitives
  data/         ingredients.ts (the bundled DB), products.ts, tips.ts
  lib/          parse · score · personalise · targets · scan · store · i18n · types
```

---

## Design

**"The Kitchen Garden"** — fresh, honest, calm. Not a clinical white-and-blue medical app, not an alarmist red one, and not neon "tech green". The verdict scale is drawn from the Indian kitchen itself: leaf green, turmeric, dried red chilli — so the colour meanings are intuitive rather than borrowed.

Accessibility floor, verified in-browser in both themes:

- Body text ≥ 4.5:1 contrast; audited programmatically in light and dark, **0 failures**.
- Colour never carries meaning alone — every verdict pairs a hue with an icon *and* a word, and the `avoid` ribbon segment is hatched so it survives greyscale and colour-vision deficiency.
- Touch targets ≥ 48 dp throughout.
- Full keyboard navigation with visible focus rings; sheets trap focus and close on Escape.
- Every animation has a `prefers-reduced-motion` escape.
- Zoom is never capped, and the layout survives 200% text scaling.

---

## Honest status

This is a working implementation of the specification, not a shipped product. What that means concretely:

- The ingredient database bundles ~90 curated entries covering the INS codes and ingredients most common on Indian labels. The spec targets 500+ for MVP.
- The alternatives catalogue is a **seed set of representative formulations**, deliberately not real brands — inventing scores for real companies' products would be both unfair and legally risky, and the UI says so.
- Nearby availability is illustrative. Level 1 (Google Places) and Level 2 (quick-commerce APIs) are not wired up.
- Condition rules need sign-off from a qualified nutritionist before this goes anywhere near real users. That is a hard prerequisite, not a nice-to-have.
- AI alternatives are **search-grounded, not inventory-checked**. Gemini can confirm a product is sold in India; it cannot confirm a specific shop has it today. The UI says exactly that and never claims stock.
- **Search-grounded alternatives need a paid Gemini key.** Google Search grounding has its own, much tighter free-tier quota than ordinary generation. On the free tier the `/api/alternatives` route returns 429 once it is exhausted; the app degrades to the bundled catalogue rather than erroring, but live results stop appearing until the quota resets or billing is enabled.
- Rate limits are per-IP and enforced in Postgres, but an attacker with many IPs can still run up a bill. For real exposure, put the AI routes behind an auth check or a CAPTCHA rather than relying on IP limits alone.

---

*This app gives general nutrition information, not medical advice.*
*यह ऐप सामान्य पोषण जानकारी देता है, चिकित्सा सलाह नहीं।*
