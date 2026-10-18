-- ============================================================
-- Family Space — Demo Seed Script
-- Purpose: Populate a realistic family for marketing screenshots
-- ============================================================
--
-- BEFORE RUNNING:
--   1. Create a demo account in your app (sign up with email/Google)
--   2. Go to Supabase Dashboard → Authentication → Users
--   3. Copy the UUID of the demo user
--   4. Replace <<YOUR_DEMO_USER_ID>> below with that UUID
--   5. Run this entire script in Supabase SQL Editor
--      (uses service role — bypasses RLS automatically)
--
-- AFTER RUNNING:
--   - Sign in as the demo user to see the populated data
--   - The family will be on the 'pro' plan so all features are visible
--   - Take screenshots as described in docs/screenshots-guide.md
--
-- TO CLEAN UP:
--   Run docs/demo-cleanup.sql to remove all demo data
-- ============================================================

do $$
declare
  -- ── CHANGE THIS ──────────────────────────────────────────
  v_user_id        uuid := '5d84a45e-a4cc-4514-a5a3-79e14adca8ed';  -- replace with your demo user's UUID
  -- ─────────────────────────────────────────────────────────

  v_family_id      uuid := gen_random_uuid();

  -- Person spaces
  s_zoro           uuid := gen_random_uuid();
  s_nami           uuid := gen_random_uuid();
  s_coby           uuid := gen_random_uuid();
  s_vivi           uuid := gen_random_uuid();

  -- Store spaces
  s_walmart        uuid := gen_random_uuid();
  s_costco         uuid := gen_random_uuid();
  s_tt             uuid := gen_random_uuid();
  s_shoppers       uuid := gen_random_uuid();
  s_timhortons     uuid := gen_random_uuid();
  s_gas            uuid := gen_random_uuid();

  -- Categories
  c_groceries      uuid := gen_random_uuid();
  c_dining         uuid := gen_random_uuid();
  c_gas            uuid := gen_random_uuid();
  c_utilities      uuid := gen_random_uuid();
  c_pharmacy       uuid := gen_random_uuid();
  c_kids           uuid := gen_random_uuid();
  c_clothing       uuid := gen_random_uuid();
  c_household      uuid := gen_random_uuid();
  c_entertainment  uuid := gen_random_uuid();
  c_personal       uuid := gen_random_uuid();

  -- Recurring transaction UUIDs (referenced by auto-generated entries)
  r_zoro_salary    uuid := gen_random_uuid();
  r_nami_salary    uuid := gen_random_uuid();
  r_rent           uuid := gen_random_uuid();
  r_netflix        uuid := gen_random_uuid();
  r_car_ins        uuid := gen_random_uuid();

begin

  -- ── 1. Family ──────────────────────────────────────────────────────────────
  insert into families (id, name, plan, currency, locale, created_at)
  values (v_family_id, 'The Grand Line', 'pro', 'CAD', 'en-CA', now())
  on conflict do nothing;

  -- ── 2. Membership ──────────────────────────────────────────────────────────
  insert into user_families (user_id, family_id, role, joined_at)
  values (v_user_id, v_family_id, 'owner', now())
  on conflict do nothing;

  -- ── 3. Person spaces ───────────────────────────────────────────────────────
  insert into spaces (id, family_id, name, type, show_in_expenses, color, sort_order, is_system, linked_user_id)
  values
    (s_zoro, v_family_id, 'Zoro', 'person', true, 'oklch(0.82 0.10 152)', 0, false, null),
    (s_nami, v_family_id, 'Nami', 'person', true, 'oklch(0.82 0.10 55)',  1, false, null),
    (s_coby, v_family_id, 'Coby', 'person', true, 'oklch(0.82 0.10 15)',  2, false, null),
    (s_vivi, v_family_id, 'Vivi', 'person', true, 'oklch(0.82 0.10 240)', 3, false, null);

  -- ── 4. Store spaces ────────────────────────────────────────────────────────
  insert into spaces (id, family_id, name, type, show_in_expenses, color, sort_order, is_system, linked_user_id)
  values
    (s_walmart,    v_family_id, 'Walmart',            'store', true, 'oklch(0.82 0.10 260)', 4, false, null),
    (s_costco,     v_family_id, 'Costco',             'store', true, 'oklch(0.82 0.10 22)',  5, false, null),
    (s_tt,         v_family_id, 'T&T Supermarket',    'store', true, 'oklch(0.82 0.10 140)', 6, false, null),
    (s_shoppers,   v_family_id, 'Shoppers Drug Mart', 'store', true, 'oklch(0.82 0.10 345)', 7, false, null),
    (s_timhortons, v_family_id, 'Tim Hortons',        'store', true, 'oklch(0.82 0.10 50)',  8, false, null),
    (s_gas,        v_family_id, 'Gas Station',        'store', true, 'oklch(0.82 0.10 228)', 9, false, null);

  -- ── 5. Categories ──────────────────────────────────────────────────────────
  insert into categories (id, family_id, name, color, icon, sort_order)
  values
    (c_groceries,     v_family_id, 'Groceries',     'oklch(0.82 0.10 152)', 'shopping-cart', 0),
    (c_dining,        v_family_id, 'Dining Out',    'oklch(0.82 0.10 22)',  'utensils',      1),
    (c_gas,           v_family_id, 'Gas',           'oklch(0.82 0.10 228)', 'fuel',          2),
    (c_utilities,     v_family_id, 'Utilities',     'oklch(0.84 0.11 88)',  'zap',           3),
    (c_pharmacy,      v_family_id, 'Pharmacy',      'oklch(0.82 0.10 0)',   'pill',          4),
    (c_kids,          v_family_id, 'Kids',          'oklch(0.82 0.10 308)', 'baby',          5),
    (c_clothing,      v_family_id, 'Clothing',      'oklch(0.82 0.10 270)', 'shirt',         6),
    (c_household,     v_family_id, 'Household',     'oklch(0.82 0.10 50)',  'home',          7),
    (c_entertainment, v_family_id, 'Entertainment', 'oklch(0.82 0.10 320)', 'tv',            8),
    (c_personal,      v_family_id, 'Personal Care', 'oklch(0.82 0.10 345)', 'sparkles',      9);

  -- ── 6. Recurring transaction templates ────────────────────────────────────
  -- These show up in the Recurring tab. next_due_date = April 1 (fully caught up).

  insert into recurring_transactions
    (id, family_id, direction, description, amount, frequency, start_date, next_due_date, income_type, person_id, category_id, location_id, paid_by_id)
  values
    -- Zoro monthly salary
    (r_zoro_salary, v_family_id, 'income',  'Zoro — Monthly Salary',   5200.00, 'monthly', '2025-10-01', '2026-04-01',
      'salary', s_zoro, null, null, null),
    -- Nami monthly salary
    (r_nami_salary, v_family_id, 'income',  'Nami — Monthly Salary',   4500.00, 'monthly', '2025-10-01', '2026-04-01',
      'salary', s_nami, null, null, null),
    -- Rent
    (r_rent,    v_family_id, 'expense', 'Monthly Rent',               2100.00, 'monthly', '2025-10-01', '2026-04-01',
      null, null, c_household, null, s_zoro),
    -- Streaming bundle (Netflix + Disney+)
    (r_netflix, v_family_id, 'expense', 'Netflix + Disney+',            39.99, 'monthly', '2025-10-01', '2026-04-01',
      null, null, c_entertainment, null, s_nami),
    -- Car insurance
    (r_car_ins, v_family_id, 'expense', 'Car Insurance',               145.00, 'monthly', '2025-10-01', '2026-04-01',
      null, null, c_utilities, null, s_zoro);

  -- ── 7. Expenses (Oct 2025 – Mar 2026) ─────────────────────────────────────
  -- ~80 expenses across 6 months. Nami is the top spender by entry count.
  -- Rent auto-generated from recurring template is included each month.

  -- ── October 2025 ──────────────────────────────────────────────────────────
  insert into expenses (id, family_id, amount, category_id, location_id, paid_by_id, date, description, auto_generated, recurring_transaction_id)
  values
    -- Rent (auto from recurring)
    (gen_random_uuid(), v_family_id, 2100.00, c_household,    null,         s_zoro, '2025-10-01', 'Monthly Rent',                    true, r_rent),
    -- Car insurance (auto from recurring)
    (gen_random_uuid(), v_family_id,  145.00, c_utilities,    null,         s_zoro, '2025-10-01', 'Car Insurance',                   true, r_car_ins),
    -- Netflix (auto from recurring)
    (gen_random_uuid(), v_family_id,   39.99, c_entertainment,null,         s_nami, '2025-10-01', 'Netflix + Disney+',               true, r_netflix),
    -- Zoro
    (gen_random_uuid(), v_family_id,  312.89, c_groceries,    s_costco,     s_zoro, '2025-10-05', 'Costco bulk run',                 false, null),
    (gen_random_uuid(), v_family_id,   82.50, c_gas,          s_gas,        s_zoro, '2025-10-09', 'Gas fill-up',                    false, null),
    (gen_random_uuid(), v_family_id,  143.00, c_utilities,    null,         s_zoro, '2025-10-14', 'Hydro bill',                     false, null),
    (gen_random_uuid(), v_family_id,  210.00, c_kids,         s_walmart,    s_zoro, '2025-10-21', 'Back to school supplies',        false, null),
    (gen_random_uuid(), v_family_id,  187.43, c_groceries,    s_walmart,    s_zoro, '2025-10-28', 'Walmart groceries',              false, null),
    -- Nami (more entries — she does most of the day-to-day spending)
    (gen_random_uuid(), v_family_id,   68.20, c_groceries,    s_tt,         s_nami, '2025-10-07', 'Asian groceries — T&T',          false, null),
    (gen_random_uuid(), v_family_id,   95.60, c_pharmacy,     s_shoppers,   s_nami, '2025-10-10', 'Prescriptions + vitamins',       false, null),
    (gen_random_uuid(), v_family_id,   54.30, c_dining,       s_timhortons, s_nami, '2025-10-11', 'Coffee + lunch',                 false, null),
    (gen_random_uuid(), v_family_id,  156.78, c_groceries,    s_walmart,    s_nami, '2025-10-17', 'Mid-month groceries',            false, null),
    (gen_random_uuid(), v_family_id,   63.40, c_personal,     s_shoppers,   s_nami, '2025-10-20', 'Skincare + personal care',       false, null),
    (gen_random_uuid(), v_family_id,  112.50, c_clothing,     null,         s_nami, '2025-10-24', 'Fall wardrobe refresh',          false, null),
    (gen_random_uuid(), v_family_id,   47.15, c_dining,       null,         s_nami, '2025-10-29', 'Dinner out — sushi',             false, null),
    -- Coby
    (gen_random_uuid(), v_family_id,   47.90, c_gas,          s_gas,        s_coby, '2025-10-19', 'Gas',                            false, null),
    (gen_random_uuid(), v_family_id,   38.50, c_dining,       s_timhortons, s_coby, '2025-10-25', 'Family breakfast',               false, null),
    -- Vivi
    (gen_random_uuid(), v_family_id,   89.99, c_clothing,     null,         s_vivi, '2025-10-23', 'Winter jacket',                  false, null);

  -- ── November 2025 ─────────────────────────────────────────────────────────
  insert into expenses (id, family_id, amount, category_id, location_id, paid_by_id, date, description, auto_generated, recurring_transaction_id)
  values
    -- Rent + recurring
    (gen_random_uuid(), v_family_id, 2100.00, c_household,    null,         s_zoro, '2025-11-01', 'Monthly Rent',                    true, r_rent),
    (gen_random_uuid(), v_family_id,  145.00, c_utilities,    null,         s_zoro, '2025-11-01', 'Car Insurance',                   true, r_car_ins),
    (gen_random_uuid(), v_family_id,   39.99, c_entertainment,null,         s_nami, '2025-11-01', 'Netflix + Disney+',               true, r_netflix),
    -- Zoro
    (gen_random_uuid(), v_family_id,  289.50, c_groceries,    s_costco,     s_zoro, '2025-11-04', 'Costco run',                     false, null),
    (gen_random_uuid(), v_family_id,   85.80, c_gas,          s_gas,        s_zoro, '2025-11-07', 'Gas fill-up',                    false, null),
    (gen_random_uuid(), v_family_id,  145.00, c_utilities,    null,         s_zoro, '2025-11-10', 'Hydro bill',                     false, null),
    (gen_random_uuid(), v_family_id,  320.00, c_household,    s_walmart,    s_zoro, '2025-11-20', 'Winter supplies + storage',      false, null),
    -- Nami
    (gen_random_uuid(), v_family_id,  203.12, c_groceries,    s_walmart,    s_nami, '2025-11-02', 'Weekly grocery run',             false, null),
    (gen_random_uuid(), v_family_id,   62.35, c_pharmacy,     s_shoppers,   s_nami, '2025-11-12', 'Medicine + vitamins',            false, null),
    (gen_random_uuid(), v_family_id,  178.90, c_groceries,    s_walmart,    s_nami, '2025-11-14', 'Groceries',                      false, null),
    (gen_random_uuid(), v_family_id,   79.99, c_entertainment,null,         s_nami, '2025-11-17', 'Spotify + Apple One',            false, null),
    (gen_random_uuid(), v_family_id,  215.67, c_groceries,    s_costco,     s_nami, '2025-11-27', 'Costco top-up',                  false, null),
    (gen_random_uuid(), v_family_id,   74.20, c_personal,     s_shoppers,   s_nami, '2025-11-29', 'Hair care + toiletries',         false, null),
    (gen_random_uuid(), v_family_id,   88.40, c_dining,       null,         s_nami, '2025-11-30', 'Date night dinner',              false, null),
    -- Coby
    (gen_random_uuid(), v_family_id,   51.20, c_gas,          s_gas,        s_coby, '2025-11-18', 'Gas',                            false, null),
    (gen_random_uuid(), v_family_id,   44.99, c_dining,       null,         s_coby, '2025-11-22', 'Pizza night',                    false, null),
    (gen_random_uuid(), v_family_id,   58.90, c_dining,       s_timhortons, s_coby, '2025-11-28', 'Coffee + snacks',                false, null),
    -- Vivi
    (gen_random_uuid(), v_family_id,   72.40, c_groceries,    s_tt,         s_vivi, '2025-11-06', 'T&T groceries',                  false, null),
    (gen_random_uuid(), v_family_id,  134.50, c_clothing,     null,         s_vivi, '2025-11-24', 'Winter coat + boots',            false, null);

  -- ── December 2025 ─────────────────────────────────────────────────────────
  insert into expenses (id, family_id, amount, category_id, location_id, paid_by_id, date, description, auto_generated, recurring_transaction_id)
  values
    -- Rent + recurring
    (gen_random_uuid(), v_family_id, 2100.00, c_household,    null,         s_zoro, '2025-12-01', 'Monthly Rent',                    true, r_rent),
    (gen_random_uuid(), v_family_id,  145.00, c_utilities,    null,         s_zoro, '2025-12-01', 'Car Insurance',                   true, r_car_ins),
    (gen_random_uuid(), v_family_id,   39.99, c_entertainment,null,         s_nami, '2025-12-01', 'Netflix + Disney+',               true, r_netflix),
    -- Zoro
    (gen_random_uuid(), v_family_id,  445.20, c_groceries,    s_costco,     s_zoro, '2025-12-04', 'Holiday Costco haul',             false, null),
    (gen_random_uuid(), v_family_id,   90.40, c_gas,          s_gas,        s_zoro, '2025-12-07', 'Gas fill-up',                    false, null),
    (gen_random_uuid(), v_family_id,  165.00, c_utilities,    null,         s_zoro, '2025-12-09', 'Hydro — heating season',         false, null),
    (gen_random_uuid(), v_family_id,  385.00, c_kids,         null,         s_zoro, '2025-12-14', 'Holiday gifts for kids',         false, null),
    (gen_random_uuid(), v_family_id,  234.90, c_groceries,    s_costco,     s_zoro, '2025-12-22', 'Holiday food shop',              false, null),
    -- Nami (big December — lots of shopping and personal spending)
    (gen_random_uuid(), v_family_id,  198.45, c_groceries,    s_walmart,    s_nami, '2025-12-01', 'Weekly groceries',               false, null),
    (gen_random_uuid(), v_family_id,   42.15, c_pharmacy,     s_shoppers,   s_nami, '2025-12-10', 'Cold medicine',                  false, null),
    (gen_random_uuid(), v_family_id,  156.30, c_groceries,    s_walmart,    s_nami, '2025-12-15', 'Mid-month groceries',            false, null),
    (gen_random_uuid(), v_family_id,   47.80, c_gas,          s_gas,        s_nami, '2025-12-16', 'Gas',                            false, null),
    (gen_random_uuid(), v_family_id,  168.00, c_clothing,     null,         s_nami, '2025-12-19', 'Holiday outfit shopping',        false, null),
    (gen_random_uuid(), v_family_id,   63.40, c_personal,     s_shoppers,   s_nami, '2025-12-21', 'Holiday personal care',          false, null),
    (gen_random_uuid(), v_family_id,   94.50, c_dining,       null,         s_nami, '2025-12-27', 'Post-Christmas dinner out',      false, null),
    (gen_random_uuid(), v_family_id,  122.80, c_groceries,    s_walmart,    s_nami, '2025-12-30', 'New Year prep groceries',        false, null),
    -- Coby
    (gen_random_uuid(), v_family_id,   78.50, c_dining,       null,         s_coby, '2025-12-18', 'Holiday dinner out',             false, null),
    -- Vivi
    (gen_random_uuid(), v_family_id,   88.75, c_groceries,    s_tt,         s_vivi, '2025-12-06', 'T&T holiday cooking',            false, null),
    (gen_random_uuid(), v_family_id,   55.00, c_entertainment,null,         s_vivi, '2025-12-20', 'Movie tickets + popcorn',        false, null),
    (gen_random_uuid(), v_family_id,  195.00, c_clothing,     null,         s_vivi, '2025-12-26', 'Boxing Day sale — clothes',      false, null);

  -- ── January 2026 ──────────────────────────────────────────────────────────
  insert into expenses (id, family_id, amount, category_id, location_id, paid_by_id, date, description, auto_generated, recurring_transaction_id)
  values
    -- Rent + recurring
    (gen_random_uuid(), v_family_id, 2100.00, c_household,    null,         s_zoro, '2026-01-01', 'Monthly Rent',                    true, r_rent),
    (gen_random_uuid(), v_family_id,  145.00, c_utilities,    null,         s_zoro, '2026-01-01', 'Car Insurance',                   true, r_car_ins),
    (gen_random_uuid(), v_family_id,   39.99, c_entertainment,null,         s_nami, '2026-01-01', 'Netflix + Disney+',               true, r_netflix),
    -- Zoro
    (gen_random_uuid(), v_family_id,  298.45, c_groceries,    s_costco,     s_zoro, '2026-01-05', 'Costco monthly run',             false, null),
    (gen_random_uuid(), v_family_id,  148.00, c_utilities,    null,         s_zoro, '2026-01-10', 'Hydro bill',                     false, null),
    (gen_random_uuid(), v_family_id,  119.00, c_household,    s_walmart,    s_zoro, '2026-01-19', 'Cleaning supplies + storage',    false, null),
    (gen_random_uuid(), v_family_id,  182.30, c_groceries,    s_costco,     s_zoro, '2026-01-24', 'Costco top-up',                  false, null),
    -- Nami
    (gen_random_uuid(), v_family_id,  175.60, c_groceries,    s_walmart,    s_nami, '2026-01-02', 'New year grocery run',           false, null),
    (gen_random_uuid(), v_family_id,   72.50, c_pharmacy,     s_shoppers,   s_nami, '2026-01-11', 'Flu season meds',                false, null),
    (gen_random_uuid(), v_family_id,  164.75, c_groceries,    s_walmart,    s_nami, '2026-01-13', 'Mid-month groceries',            false, null),
    (gen_random_uuid(), v_family_id,   67.80, c_personal,     s_shoppers,   s_nami, '2026-01-16', 'Skincare restock',               false, null),
    (gen_random_uuid(), v_family_id,   52.30, c_dining,       s_timhortons, s_nami, '2026-01-20', 'Coffee runs this week',          false, null),
    (gen_random_uuid(), v_family_id,  143.60, c_groceries,    s_tt,         s_nami, '2026-01-22', 'T&T — big shop',                 false, null),
    (gen_random_uuid(), v_family_id,   89.90, c_clothing,     null,         s_nami, '2026-01-26', 'Winter sale — sweaters',         false, null),
    (gen_random_uuid(), v_family_id,   48.20, c_dining,       null,         s_nami, '2026-01-30', 'Takeout — Thai food',            false, null),
    -- Coby
    (gen_random_uuid(), v_family_id,   88.20, c_gas,          s_gas,        s_coby, '2026-01-08', 'Gas fill-up',                    false, null),
    (gen_random_uuid(), v_family_id,   39.99, c_dining,       s_timhortons, s_coby, '2026-01-15', 'Coffee + lunch',                 false, null),
    (gen_random_uuid(), v_family_id,   53.40, c_gas,          s_gas,        s_coby, '2026-01-27', 'Gas',                            false, null),
    -- Vivi
    (gen_random_uuid(), v_family_id,   66.80, c_groceries,    s_tt,         s_vivi, '2026-01-07', 'T&T groceries',                  false, null),
    (gen_random_uuid(), v_family_id,   45.00, c_entertainment,null,         s_vivi, '2026-01-21', 'Streaming subscriptions',        false, null);

  -- ── February 2026 ─────────────────────────────────────────────────────────
  insert into expenses (id, family_id, amount, category_id, location_id, paid_by_id, date, description, auto_generated, recurring_transaction_id)
  values
    -- Rent + recurring
    (gen_random_uuid(), v_family_id, 2100.00, c_household,    null,         s_zoro, '2026-02-01', 'Monthly Rent',                    true, r_rent),
    (gen_random_uuid(), v_family_id,  145.00, c_utilities,    null,         s_zoro, '2026-02-01', 'Car Insurance',                   true, r_car_ins),
    (gen_random_uuid(), v_family_id,   39.99, c_entertainment,null,         s_nami, '2026-02-01', 'Netflix + Disney+',               true, r_netflix),
    -- Zoro
    (gen_random_uuid(), v_family_id,  278.40, c_groceries,    s_costco,     s_zoro, '2026-02-03', 'Costco run',                     false, null),
    (gen_random_uuid(), v_family_id,   87.60, c_gas,          s_gas,        s_zoro, '2026-02-06', 'Gas fill-up',                    false, null),
    (gen_random_uuid(), v_family_id,  155.00, c_utilities,    null,         s_zoro, '2026-02-10', 'Hydro bill',                     false, null),
    (gen_random_uuid(), v_family_id,  162.30, c_groceries,    s_walmart,    s_zoro, '2026-02-22', 'Walmart groceries',              false, null),
    -- Nami (consistently the highest per-month spender)
    (gen_random_uuid(), v_family_id,  191.20, c_groceries,    s_walmart,    s_nami, '2026-02-04', 'Weekly grocery run',             false, null),
    (gen_random_uuid(), v_family_id,   74.50, c_groceries,    s_tt,         s_nami, '2026-02-07', 'T&T groceries',                  false, null),
    (gen_random_uuid(), v_family_id,   58.30, c_pharmacy,     s_shoppers,   s_nami, '2026-02-11', 'Vitamins + supplements',         false, null),
    (gen_random_uuid(), v_family_id,  203.70, c_groceries,    s_costco,     s_nami, '2026-02-14', 'Costco mid-month',               false, null),
    (gen_random_uuid(), v_family_id,   48.90, c_dining,       s_timhortons, s_nami, '2026-02-17', 'Valentine''s coffee + pastries', false, null),
    (gen_random_uuid(), v_family_id,  112.00, c_clothing,     null,         s_nami, '2026-02-20', 'Spring wardrobe pieces',         false, null),
    (gen_random_uuid(), v_family_id,   76.40, c_personal,     s_shoppers,   s_nami, '2026-02-25', 'Hair + personal restock',        false, null),
    (gen_random_uuid(), v_family_id,   67.30, c_dining,       null,         s_nami, '2026-02-28', 'Dinner out — pasta night',       false, null),
    -- Coby
    (gen_random_uuid(), v_family_id,   52.10, c_gas,          s_gas,        s_coby, '2026-02-12', 'Gas',                            false, null),
    (gen_random_uuid(), v_family_id,   41.50, c_dining,       null,         s_coby, '2026-02-22', 'Lunch with coworkers',           false, null),
    -- Vivi
    (gen_random_uuid(), v_family_id,   69.30, c_groceries,    s_tt,         s_vivi, '2026-02-09', 'T&T groceries',                  false, null),
    (gen_random_uuid(), v_family_id,   39.99, c_entertainment,null,         s_vivi, '2026-02-16', 'Movie night rentals',            false, null);

  -- ── March 2026 (partial — up to Mar 18) ───────────────────────────────────
  insert into expenses (id, family_id, amount, category_id, location_id, paid_by_id, date, description, auto_generated, recurring_transaction_id)
  values
    -- Rent + recurring
    (gen_random_uuid(), v_family_id, 2100.00, c_household,    null,         s_zoro, '2026-03-01', 'Monthly Rent',                    true, r_rent),
    (gen_random_uuid(), v_family_id,  145.00, c_utilities,    null,         s_zoro, '2026-03-01', 'Car Insurance',                   true, r_car_ins),
    (gen_random_uuid(), v_family_id,   39.99, c_entertainment,null,         s_nami, '2026-03-01', 'Netflix + Disney+',               true, r_netflix),
    -- Zoro
    (gen_random_uuid(), v_family_id,  301.20, c_groceries,    s_costco,     s_zoro, '2026-03-02', 'Costco run',                     false, null),
    (gen_random_uuid(), v_family_id,   84.20, c_gas,          s_gas,        s_zoro, '2026-03-05', 'Gas fill-up',                    false, null),
    (gen_random_uuid(), v_family_id,  148.00, c_utilities,    null,         s_zoro, '2026-03-09', 'Hydro bill',                     false, null),
    (gen_random_uuid(), v_family_id,  178.50, c_groceries,    s_walmart,    s_zoro, '2026-03-14', 'Walmart mid-month',              false, null),
    -- Nami
    (gen_random_uuid(), v_family_id,  184.60, c_groceries,    s_walmart,    s_nami, '2026-03-03', 'Weekly grocery run',             false, null),
    (gen_random_uuid(), v_family_id,   71.80, c_groceries,    s_tt,         s_nami, '2026-03-06', 'T&T groceries',                  false, null),
    (gen_random_uuid(), v_family_id,   66.40, c_pharmacy,     s_shoppers,   s_nami, '2026-03-08', 'Allergy season meds',            false, null),
    (gen_random_uuid(), v_family_id,   52.30, c_dining,       s_timhortons, s_nami, '2026-03-10', 'Coffee + breakfast runs',        false, null),
    (gen_random_uuid(), v_family_id,  142.50, c_groceries,    s_walmart,    s_nami, '2026-03-13', 'Groceries top-up',               false, null),
    (gen_random_uuid(), v_family_id,   78.90, c_personal,     s_shoppers,   s_nami, '2026-03-15', 'Spring personal care haul',      false, null),
    (gen_random_uuid(), v_family_id,   59.40, c_dining,       null,         s_nami, '2026-03-17', 'Dinner out — Korean BBQ',        false, null),
    -- Coby
    (gen_random_uuid(), v_family_id,   55.60, c_gas,          s_gas,        s_coby, '2026-03-11', 'Gas',                            false, null),
    -- Vivi
    (gen_random_uuid(), v_family_id,   74.90, c_groceries,    s_tt,         s_vivi, '2026-03-07', 'T&T groceries',                  false, null);

  -- ── 8. Income entries (Oct 2025 – Mar 2026) ────────────────────────────────
  -- Nami + Zoro: monthly salary (auto-generated from recurring templates)
  -- Coby: occasional side gig
  -- Vivi: rental income a couple of months

  -- Zoro salary (auto-generated from r_zoro_salary)
  insert into income_entries (id, family_id, person_id, type, amount, date, description, auto_generated, recurring_transaction_id)
  values
    (gen_random_uuid(), v_family_id, s_zoro, 'salary', 5200.00, '2025-10-01', 'Zoro — Monthly Salary', true, r_zoro_salary),
    (gen_random_uuid(), v_family_id, s_zoro, 'salary', 5200.00, '2025-11-01', 'Zoro — Monthly Salary', true, r_zoro_salary),
    (gen_random_uuid(), v_family_id, s_zoro, 'salary', 5200.00, '2025-12-01', 'Zoro — Monthly Salary', true, r_zoro_salary),
    (gen_random_uuid(), v_family_id, s_zoro, 'salary', 5200.00, '2026-01-01', 'Zoro — Monthly Salary', true, r_zoro_salary),
    (gen_random_uuid(), v_family_id, s_zoro, 'salary', 5200.00, '2026-02-01', 'Zoro — Monthly Salary', true, r_zoro_salary),
    (gen_random_uuid(), v_family_id, s_zoro, 'salary', 5200.00, '2026-03-01', 'Zoro — Monthly Salary', true, r_zoro_salary);

  -- Nami salary (auto-generated from r_nami_salary)
  insert into income_entries (id, family_id, person_id, type, amount, date, description, auto_generated, recurring_transaction_id)
  values
    (gen_random_uuid(), v_family_id, s_nami, 'salary', 4500.00, '2025-10-01', 'Nami — Monthly Salary', true, r_nami_salary),
    (gen_random_uuid(), v_family_id, s_nami, 'salary', 4500.00, '2025-11-01', 'Nami — Monthly Salary', true, r_nami_salary),
    (gen_random_uuid(), v_family_id, s_nami, 'salary', 4500.00, '2025-12-01', 'Nami — Monthly Salary', true, r_nami_salary),
    (gen_random_uuid(), v_family_id, s_nami, 'salary', 4500.00, '2026-01-01', 'Nami — Monthly Salary', true, r_nami_salary),
    (gen_random_uuid(), v_family_id, s_nami, 'salary', 4500.00, '2026-02-01', 'Nami — Monthly Salary', true, r_nami_salary),
    (gen_random_uuid(), v_family_id, s_nami, 'salary', 4500.00, '2026-03-01', 'Nami — Monthly Salary', true, r_nami_salary);

  -- Coby side gig (freelance — not every month)
  insert into income_entries (id, family_id, person_id, type, amount, date, description, auto_generated, recurring_transaction_id)
  values
    (gen_random_uuid(), v_family_id, s_coby, 'side_gig', 950.00, '2025-11-15', 'Coby — Freelance project', false, null),
    (gen_random_uuid(), v_family_id, s_coby, 'side_gig', 750.00, '2026-01-20', 'Coby — Side project payout', false, null),
    (gen_random_uuid(), v_family_id, s_coby, 'side_gig', 1100.00, '2026-03-10', 'Coby — Contract work', false, null);

  -- Vivi rental income (a couple of months)
  insert into income_entries (id, family_id, person_id, type, amount, date, description, auto_generated, recurring_transaction_id)
  values
    (gen_random_uuid(), v_family_id, s_vivi, 'rental', 1200.00, '2025-10-01', 'Vivi — Rental property', false, null),
    (gen_random_uuid(), v_family_id, s_vivi, 'rental', 1200.00, '2025-12-01', 'Vivi — Rental property', false, null),
    (gen_random_uuid(), v_family_id, s_vivi, 'rental', 1200.00, '2026-02-01', 'Vivi — Rental property', false, null);

  -- ── 9. Board items ─────────────────────────────────────────────────────────

  -- Walmart grocery list
  insert into items (id, space_id, title, quantity, sort_order, completed, created_by)
  values
    (gen_random_uuid(), s_walmart, 'Olive oil',        '1 bottle',  0, false, v_user_id),
    (gen_random_uuid(), s_walmart, 'Greek yogurt',     '2 x 750g',  1, false, v_user_id),
    (gen_random_uuid(), s_walmart, 'Tide pods',        '1 pack',    2, false, v_user_id),
    (gen_random_uuid(), s_walmart, 'Whole milk',       '2 x 2L',    3, false, v_user_id),
    (gen_random_uuid(), s_walmart, 'Chicken breast',   '2 kg',      4, false, v_user_id),
    (gen_random_uuid(), s_walmart, 'Apples — Gala',   '1 bag',     5, false, v_user_id),
    (gen_random_uuid(), s_walmart, 'Baby carrots',     '1 bag',     6, false, v_user_id),
    (gen_random_uuid(), s_walmart, 'Shredded cheese',  '2 packs',   7, false, v_user_id),
    (gen_random_uuid(), s_walmart, 'Pita bread',       '2 packs',   8, true,  v_user_id),
    (gen_random_uuid(), s_walmart, 'Dish soap',        null,        9, true,  v_user_id);

  -- Costco list
  insert into items (id, space_id, title, quantity, sort_order, completed, created_by)
  values
    (gen_random_uuid(), s_costco, 'Kirkland salmon fillets',    '1 pack',   0, false, v_user_id),
    (gen_random_uuid(), s_costco, 'Rotisserie chicken',         null,       1, false, v_user_id),
    (gen_random_uuid(), s_costco, 'Nature Valley granola bars', '2 boxes',  2, false, v_user_id),
    (gen_random_uuid(), s_costco, 'Kirkland almond milk',       '6-pack',   3, false, v_user_id),
    (gen_random_uuid(), s_costco, 'Paper towels',               '1 pack',   4, false, v_user_id),
    (gen_random_uuid(), s_costco, 'Toilet paper',               '1 case',   5, false, v_user_id),
    (gen_random_uuid(), s_costco, 'Frozen edamame',             '2 bags',   6, true,  v_user_id);

  -- T&T list
  insert into items (id, space_id, title, quantity, sort_order, completed, created_by)
  values
    (gen_random_uuid(), s_tt, 'Jasmine rice',        '10 kg bag', 0, false, v_user_id),
    (gen_random_uuid(), s_tt, 'Soy sauce',           '1 bottle',  1, false, v_user_id),
    (gen_random_uuid(), s_tt, 'Dumpling wrappers',   '2 packs',   2, false, v_user_id),
    (gen_random_uuid(), s_tt, 'Baby bok choy',       '1 bunch',   3, false, v_user_id),
    (gen_random_uuid(), s_tt, 'Sesame oil',          '1 bottle',  4, false, v_user_id),
    (gen_random_uuid(), s_tt, 'Fresh tofu',          '2 blocks',  5, false, v_user_id);

  -- Zoro chores
  insert into items (id, space_id, title, sort_order, completed, created_by, start_date)
  values
    (gen_random_uuid(), s_zoro, 'Book car oil change',        0, false, v_user_id, (now() + interval '3 days')::timestamptz),
    (gen_random_uuid(), s_zoro, 'Call insurance for renewal', 1, false, v_user_id, (now() + interval '7 days')::timestamptz),
    (gen_random_uuid(), s_zoro, 'Fix bathroom light fixture', 2, false, v_user_id, null),
    (gen_random_uuid(), s_zoro, 'Take out the recycling',     3, false, v_user_id, null),
    (gen_random_uuid(), s_zoro, 'Vacuum downstairs',          4, true,  v_user_id, null);

  -- Nami chores
  insert into items (id, space_id, title, sort_order, completed, created_by, start_date)
  values
    (gen_random_uuid(), s_nami, 'Renew Costco membership',      0, false, v_user_id, (now() + interval '5 days')::timestamptz),
    (gen_random_uuid(), s_nami, 'Book dentist appointments',    1, false, v_user_id, (now() + interval '10 days')::timestamptz),
    (gen_random_uuid(), s_nami, 'Review monthly budget',        2, false, v_user_id, (now() + interval '2 days')::timestamptz),
    (gen_random_uuid(), s_nami, 'Renew home internet plan',     3, false, v_user_id, null),
    (gen_random_uuid(), s_nami, 'Pick up prescription refills', 4, false, v_user_id, null);

  -- Coby chores
  insert into items (id, space_id, title, sort_order, completed, created_by, start_date)
  values
    (gen_random_uuid(), s_coby, 'Mow the lawn',                0, false, v_user_id, (now() + interval '4 days')::timestamptz),
    (gen_random_uuid(), s_coby, 'Take bins to the curb',       1, false, v_user_id, null),
    (gen_random_uuid(), s_coby, 'Clean the garage',            2, false, v_user_id, null),
    (gen_random_uuid(), s_coby, 'Replace smoke alarm battery', 3, true,  v_user_id, null);

  -- Vivi chores
  insert into items (id, space_id, title, sort_order, completed, created_by, start_date)
  values
    (gen_random_uuid(), s_vivi, 'Order birthday cake',        0, false, v_user_id, (now() + interval '6 days')::timestamptz),
    (gen_random_uuid(), s_vivi, 'School registration forms',  1, false, v_user_id, (now() + interval '14 days')::timestamptz),
    (gen_random_uuid(), s_vivi, 'Organise pantry',            2, false, v_user_id, null),
    (gen_random_uuid(), s_vivi, 'Return library books',       3, true,  v_user_id, null);

  raise notice '=== Demo seed complete ===';
  raise notice 'Family ID: %', v_family_id;
  raise notice 'Sign in with user ID: %', v_user_id;
  raise notice '';
  raise notice 'What was seeded:';
  raise notice '  - 4 members: Zoro, Nami, Coby, Vivi';
  raise notice '  - 6 store locations';
  raise notice '  - 10 categories';
  raise notice '  - 5 recurring transactions (2 income, 3 expense)';
  raise notice '  - ~95 expenses across Oct 2025 – Mar 2026';
  raise notice '  - 18 income entries (Zoro + Nami salary + Coby freelance + Vivi rental)';
  raise notice '  - ~30 board items across 3 grocery lists + 4 chore lists';
  raise notice '';
  raise notice 'Tip: hard-refresh (Cmd+Shift+R) after signing in to clear the query cache.';

end $$;
