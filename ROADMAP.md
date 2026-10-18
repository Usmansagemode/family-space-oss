# Family Space — Roadmap

Known limitations and candidate improvements. Work is tracked in GitHub Issues.

## Known limitations

- **Noon means "no time".** A date picked without a time is stored at 12:00
  local time, so an item deliberately set to exactly 12:00 PM shows no time.
  A separate "has time" flag would remove the ambiguity.
- **Last write wins.** Two people editing the same item at once get no
  conflict warning.
- **Re-adding a removed member.** Removing a member bans their account; to let
  them back in, delete the user in the Supabase dashboard and create them
  again.
- **Mobile app.** `apps/mobile` covers the board, items, calendar, search and
  expenses, and lags behind the web app (no analytics, import, splits,
  trackers or settings).

## Ideas

- Reminders for dated items (Supabase Edge Function + pg_cron, Web Push or
  email).
- A stacked single-column board on small screens.
- Visible drag affordance and keyboard focus ring on drag handles.
- `aria-label` on item checkboxes.
