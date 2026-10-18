# Screenshot Guide — Landing Page

Screenshots replace the placeholder boxes in `LoginPage.tsx`.
Once captured, save as WebP (or PNG) and drop into `apps/web/public/screenshots/`.
Then replace each `<ScreenshotSlot>` with a real `<img>` tag.

---

## Setup: Demo User & Family

Before taking screenshots, populate a realistic demo family.
See `docs/demo-seed.sql` for the full seed script.

**Demo family goal:**
- Family name: "The Khans" (or your own)
- 3–4 members: e.g. Usman, Fatima, Adam, Sara
- Spaces: Walmart, Costco, T&T, Usman, Fatima, Adam (type=person + type=store)
- ~60–80 expenses spread across 6 months (mix of categories)
- ~10–12 income entries spread across the same months (Salary, Freelance, etc.)
- ~4–5 recurring transactions (e.g. "Netflix $17/mo", "Rent $1800/mo", "Fatima — Salary $4000/mo")
- ~20 board items across spaces
- Categories: Groceries, Dining Out, Gas, Utilities, Pharmacy, Kids, Clothing, Entertainment

---

## Screenshots to Take (9 total)

### 1. `hero-finances.png` — Full-width hero (top of page)
**Slot tag:** "Full app"
**View:** `/expenses` (Finances page)
**What to show:**
- FinancialsChart visible at top — 6 months of bars showing income (green) vs expenses (a contrasting colour)
- "Finances" heading with the MonthYearSelector
- ExpenseSummary cards below the chart (3 per-member cards with amounts)
- 8–10 rows of the expense table visible below
- **Mode: Light mode**
- **Window width: 1440px**
- **Crop: full browser window minus browser chrome**

---

### 2. `expenses-desktop.png` — Finances feature row
**Slot tag:** "Finances"
**View:** `/expenses` → Expenses tab
**What to show:**
- The ExpenseSummary bar at the top with per-member totals and a "+/−% vs last month" badge
- 10–12 expense rows with coloured category badges (Groceries green, Dining orange, Gas yellow, etc.)
- The "Quick Tag" and "Add expense" buttons visible
- Month selector showing e.g. "March 2026"
- **Mode: Light mode**
- **Window width: 1280px, aspect 16:9**

---

### 3. `income-recurring-desktop.png` — Income & Recurring feature row
**Slot tag:** "Income & Recurring"
**View:** `/expenses` → Income tab **or** Recurring tab
**What to show (Income tab preferred):**
- Total income card at top showing a bold green amount (e.g. "$8,500.00")
- 3–4 income entries: Salary, Freelance, etc., each with the coloured icon and person name
- Alternatively, the Recurring tab showing 4–5 recurring rows with "Next:" dates and frequency labels
- **Mode: Light mode**
- **Window width: 1280px, aspect 16:9**

---

### 4. `analytics-desktop.png` — Analytics feature row
**Slot tag:** "Analytics"
**View:** `/charts`
**What to show:**
- Year selector showing 2026 and the total spend in large bold text
- 3–4 charts side by side: monthly bar chart, category donut, per-member bar, category heatmap
- Filter chips visible (Month, Category, Location, Paid-by)
- Export button visible in the top-right
- **Real data is critical** — charts must have varied, realistic numbers
- **Mode: Light mode**
- **Window width: 1440px, aspect 16:9 or 21:9**

---

### 5. `board-desktop.png` — Board feature row
**Slot tag:** "Board"
**View:** Board tab (`/?tab=lists`)
**What to show:**
- 2–3 store columns (Walmart, Costco, T&T) with 4–6 realistic items each
- Items show completion checkboxes and optional date badges
- One column in a hovered/active state
- **Mode: Light mode**
- **Window width: 1280px, aspect 16:9**

---

### 6. `ai-import-desktop.png` — AI import feature row

**Slot tag:** "AI Import"
**View:** `/import` → Step 2 (column mapping) or Step 3 (preview table)
**What to show:**
- The transaction review table: 8–10 rows with Amount, Date, Description, Category columns
- Category dropdowns visible and mapped
- 1–2 rows in an "edited" state (yellow/orange highlight)
- **Mode: Light mode**
- **Window width: 1280px, aspect 16:9**

---

### 7–9. Mobile screenshots (3 tall portraits)
Use Chrome DevTools → device emulation → iPhone 14 Pro (390×844)
Or take real device screenshots.

#### 7. `mobile-board.png`
**Slot tag:** "Mobile board"
**View:** Board on mobile (`/?tab=lists`)
- Single column visible with 4–5 items
- Bottom navigation bar visible
- **Mode: Light mode**
- **Aspect: 9:16 (portrait)**

#### 8. `mobile-finances.png`
**Slot tag:** "Mobile finances"
**View:** `/expenses` on mobile
- FinancialsChart visible at the top (compressed, still readable)
- 3–4 expense rows below
- "Add expense" button visible
- **Mode: Light mode**
- **Aspect: 9:16 (portrait)**

#### 9. `mobile-analytics.png`
**Slot tag:** "Mobile analytics"
**View:** `/charts` on mobile
- At least 1 full chart visible (monthly bar chart ideal)
- Year selector and total amount visible at top
- **Mode: Light mode**
- **Aspect: 9:16 (portrait)**

---

## Replacing Placeholders in Code

Once you have the images, open `LoginPage.tsx` and replace each `<ScreenshotSlot>` with:

```tsx
<img
  src="/screenshots/hero-finances.png"
  alt="Family Space finances page showing monthly income vs expense chart and expense table"
  className="w-full rounded-2xl border border-border shadow-md"
  loading="lazy"
/>
```

Match each `tag` value to the corresponding filename above.

---

## Filename → Tag mapping

| File | Tag in LoginPage |
|------|-----------------|
| `hero-finances.png` | "Full app" |
| `expenses-desktop.png` | "Finances" |
| `income-recurring-desktop.png` | "Income & Recurring" |
| `analytics-desktop.png` | "Analytics" |
| `board-desktop.png` | "Board" |
| `ai-import-desktop.png` | "AI Import" |
| `mobile-board.png` | "Mobile board" |
| `mobile-finances.png` | "Mobile finances" |
| `mobile-analytics.png` | "Mobile analytics" |

---

## Tips for Great Screenshots

- Use **real, meaningful data** — "Tide pods $14.99" reads better than "Item 1"
- **All screenshots use light mode** — the app defaults to light, keep it consistent
- Hide dev tools panels and browser extensions before capturing
- Use a tool like **CleanShot X** (macOS) for clean, shadow-free captures
- Export as **WebP at 2x resolution** for crisp retina display
- Compress with `squoosh.app` if files exceed 300KB
- The FinancialsChart needs at least 4–6 months of data to look good — make sure the seed data covers this
