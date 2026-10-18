# Billing Gates

## Plans

| Plan | Price | Members | Features |
|------|-------|---------|---------|
| `free` | $0 | 3 | Core expenses, grocery, chores |
| `plus` | $5/mo | 5 | + Yearly analytics, CSV/PDF export |
| `pro` | $10/mo | Unlimited | + AI PDF bank statement import |

## Stripe Price IDs
<!-- Fill these in after completing Stripe setup below -->

| Plan | Stripe Price ID |
|------|----------------|
| Plus monthly | `price_` |
| Pro monthly | `price_` |

Store these in environment variables:
```
STRIPE_PLUS_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## Stripe Setup (Step by Step)

### 1. Create a Stripe account
Go to stripe.com → sign up → complete business details.

### 2. Create the product
Dashboard → **Products** → **Add product**
- Name: `Family Space`
- Description: `Family expense tracking, grocery lists, and chore management`

### 3. Add pricing to the product
Inside the product, add two prices:
- **Plus**: $5.00 / month / recurring → copy the `price_xxx` ID
- **Pro**: $10.00 / month / recurring → copy the `price_xxx` ID

Paste both IDs into the table above and into your `.env`.

### 4. Get API keys
Dashboard → **Developers** → **API keys**
- Copy **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`
- Copy **Secret key** → `STRIPE_SECRET_KEY`

### 5. Set up the webhook
Dashboard → **Developers** → **Webhooks** → **Add endpoint**
- Endpoint URL: `https://your-domain.com/api/billing/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

For local testing use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### 6. Build the two API endpoints

**`POST /api/billing/checkout`**
- Creates a Stripe Checkout session for the given price ID
- Pass `family_id` and `user_id` in metadata so the webhook can find the family
- Redirect success → `/settings?tab=billing&success=1`
- Redirect cancel → `/settings?tab=billing`

**`POST /api/billing/webhook`**
- Verify signature with `STRIPE_WEBHOOK_SECRET`
- On `checkout.session.completed`: update `families.plan`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status = 'active'`
- On `customer.subscription.updated`: sync `stripe_subscription_status` and `plan`
- On `customer.subscription.deleted`: set `plan = 'free'`, clear subscription columns

### 7. Build the billing settings UI
In Settings → Billing tab:
- Show current plan + next billing date
- "Upgrade" button → calls `/api/billing/checkout` → redirects to Stripe Checkout
- "Manage subscription" button → Stripe Customer Portal (cancellation, card updates — all handled by Stripe)

To create a Customer Portal session:
```ts
const session = await stripe.billingPortal.sessions.create({
  customer: family.stripeCustomerId,
  return_url: 'https://your-domain.com/settings?tab=billing',
})
// redirect to session.url
```

### 8. Replace upgrade toasts with real flow
In `UpgradePlanPrompt.tsx` and `ImportWizard.tsx`, replace:
```ts
toast.info('Plus upgrade coming soon!')
```
with a call to `POST /api/billing/checkout` passing the relevant price ID.

---

## How Gating Works

### 1. Database (`families.plan`)
`plan` column: `'free' | 'plus' | 'pro'`, default `'free'`.
Stripe columns present: `stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status`.

### 2. Hooks — two layers

**`usePlan` (static fallback)**
```ts
const { can, memberLimit } = usePlan(family?.plan ?? 'free')
// can.analytics, can.export, can.aiImport — booleans
// memberLimit — number | null (null = unlimited)
```
Hardcoded tier lookup in `packages/hooks/src/family/usePlan.ts`. Synchronous, no DB call. Used as an immediate fallback while the DB-backed hook loads.

**`useDynamicPlan` (DB-backed — use this in gated UI)**
```ts
const limits = useDynamicPlan(familyId, family.plan)
// Same shape as usePlan result, but values come from the DB
```
Fetches `plan_features` (plan-level config) and `family_feature_overrides` (per-family exceptions) from Supabase, merges them via `mergePlanLimits()`, and returns the result. Falls back to `usePlan` while loading so there's no flicker. Stale time: 10 minutes.

Use `useDynamicPlan` everywhere in the UI. The admin panel can toggle feature flags in `plan_features` without a code deploy and they take effect within 10 minutes for all sessions. Per-family overrides in `family_feature_overrides` always win over the plan default.

### 3. Upgrade UI (`apps/web/src/components/billing/UpgradePlanPrompt.tsx`)
- `requiredPlan="plus"` — shows Plus + Pro cards (Plus highlighted)
- `requiredPlan="pro"` — shows only Pro card
- `preview` prop — optional custom blurred background (defaults to chart skeletons)

## Where Each Gate Lives

| Feature | File | How |
|---------|------|-----|
| Yearly analytics | `apps/web/src/routes/charts.tsx` | `!can.analytics` → `<UpgradePlanPrompt requiredPlan="plus">` |
| Export button | `apps/web/src/routes/charts.tsx` | `!can.export` → button disabled + tooltip |
| AI PDF import card | `apps/web/src/components/import/ImportWizard.tsx` | `canAiImport` prop → inline Pro badge + upgrade button |
| Member limit | `accept_invite` Postgres function + `PaidByOptions` in `settings.tsx` | Server-side: raises `member_limit_reached` exception. Client-side: counts **all active person spaces** (real members + virtual paid-by members). Archived spaces do not count. |

## Testing Without Stripe (plan gates only)
```sql
UPDATE families SET plan = 'free'  WHERE id = '<family-id>';
UPDATE families SET plan = 'plus'  WHERE id = '<family-id>';
UPDATE families SET plan = 'pro'   WHERE id = '<family-id>';
```
Hard reload (`Cmd+Shift+R`) after each — `useUserFamily` has `staleTime: Infinity`.

---

## Testing Stripe Payments (no real money)

Stripe has a built-in test mode — no real money ever moves. The dashboard shows a **Test mode** toggle top-right. Keep it on while developing. Test API keys start with `pk_test_` / `sk_test_` and are separate from live keys (`pk_live_` / `sk_live_`) — go live by swapping env vars.

### Test card numbers

| Scenario | Card number |
|----------|------------|
| Successful payment | `4242 4242 4242 4242` |
| Card declined | `4000 0000 0000 0002` |
| Requires 3D Secure | `4000 0025 0000 3155` |

Any future expiry (e.g. `12/34`), any 3-digit CVC, any zip.

### Test webhooks locally with Stripe CLI

```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to your local server
stripe listen --forward-to localhost:3000/api/billing/webhook

# Manually trigger events to test your webhook handler
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### Full end-to-end test flow (once Stripe is wired up)
1. Click "Upgrade to Plus" in the app
2. Redirected to Stripe Checkout
3. Enter `4242 4242 4242 4242`
4. Stripe fires `checkout.session.completed` → webhook sets `families.plan = 'plus'`
5. User lands back on `/settings?tab=billing`
6. Hard reload → charts unlock
