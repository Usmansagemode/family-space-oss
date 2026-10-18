# Family Space — Roadmap & Critique

Last updated: 2026-03-01
UX gaps sprint completed: 2026-03-01

---

## Current status

The core loop works end-to-end:

- Create spaces (per person or store) with colours
- Add items with optional dates and times
- Check items off → they move to history
- Re-add from history in one tap
- Items with dates sync to Google Calendar
- Embedded Google Calendar view in second tab
- Google OAuth sign-in, dark mode, settings sheet

The foundation is solid. The main gap is that it is currently a single-user app wearing a "family" label — there is no invite or multi-user system yet.

---

## Bugs to fix

### Critical

**1. Silent calendar sync failure on item create**
If `createCalendarEvent()` throws, the item is saved to Supabase without a `googleEventId`. It is permanently disconnected from Google Calendar with no way to retry. User sees an error toast but has no recovery path.

**2. Calendar event orphaned on update failure**
When a user removes a date from an item, the app deletes the Google Calendar event first, then updates Supabase. If the Supabase call fails, the event is gone but the item still shows a date. The two systems silently diverge.

**3. Noon sentinel edge case**
If a user deliberately sets an appointment at exactly 12:00 PM, `hasExplicitTime()` returns false and the time is not shown on the card. A different sentinel (e.g. `00:00` or a separate boolean flag on the entity) would be more robust.

### Moderate

**4. No conflict resolution for concurrent edits**
Two family members editing the same item simultaneously results in last-write-wins with no warning. Acceptable for now but will cause confusion once multi-user is live.

**5. Reorder spaces — silent failure**
If the reorder mutation fails, spaces snap back to the old order but no toast tells the user. Other mutation failures do show error toasts.

---

## UX gaps users will notice

**6. ~~No feedback when completing an item~~** ✅ Fixed
`toast.success('Marked as done')` added to the complete mutation's `onSuccess`. Also fixed a bug where `reAdd` was firing a success toast even on error (toast moved from `onSettled` to `onSuccess`).

**7. ~~No feedback when creating an item~~** ✅ Fixed
`toast.success('Item added')` added to the create mutation's `onSuccess`.

**8. ~~History suggestions are hidden~~** ✅ Fixed
Suggestions now show immediately when the "Add item" sheet opens (not just on focus). `showSuggestions` is initialised to `true` for new items so the history list appears as soon as the sheet opens.

**9. ~~Calendar embed URL has no validation~~** ✅ Fixed
Inline error shown if the embed URL doesn't start with `https://calendar.google.com/calendar/embed`.

**10. ~~Settings layout buries the save button~~** ✅ Fixed
The "How to" guide trigger is now a lightweight text link (no bordered box), styled as supplementary help. The numbered steps use a left-border list instead of bold circles, reducing visual noise.

**11. ~~Tab selection resets on refresh~~** ✅ Fixed
Active tab persisted to `localStorage` under key `fs-tab`. Initialised from storage on mount so the last active tab is restored on refresh.

---

## Missing features (priority order)

### 1. Multi-user / family invite ← most important

Right now every user gets their own isolated family. A spouse or child cannot join the same board. This is the single most important missing feature. Options:

- Invite by email (Supabase email invite)
- Join by shareable code
- Shared family ID in URL

### 2. Mobile / touch experience

The horizontal column layout is hard to use on a phone. Families share phones. Options:

- Stacked single-column view on small screens, switching to board on tablet+
- Swipeable column cards (one column per screen)

### 3. Upcoming / agenda view

No way to see "what is happening this week" across all spaces. Adding a date-sorted list view (either as a third tab or a panel) would make Family Space useful as a weekly planner.

### 4. Bi-directional Google Calendar sync

Events created directly in Google Calendar do not appear in Family Space. Users will expect this and be confused when GCal edits do not reflect here.

### 5. Store spaces — quantity field

For grocery spaces, a "quantity" or "amount" field makes more sense than a date. The form treats all spaces identically. A per-space-type form would be more natural.

### 6. Push / email notifications

Reminders for upcoming items with dates. Could be handled via a Supabase Edge Function + pg_cron and Web Push or email.

### 7. Shared shopping mode

A focused "shopping mode" view for a store space: large text, swipe-to-complete, phone-friendly. Useful in-aisle.

---

## Polish (lower priority)

- `ThemeToggle.tsx` is dead code — Header implements its own duplicate version
- `MdxCallout.tsx` and `MdxMetrics.tsx` are scaffold leftovers, can be deleted
- `lib/site.ts` still has the TanStack Start default branding
- No character counter on title / space name inputs (schema limits exist but are invisible)
- Drag-to-reorder has no visual affordance — new users won't discover it
- Checkbox missing `aria-label` for screen readers
- Drag handle missing visible focus ring for keyboard users
- No bulk complete / delete operations

---

## What to tackle next (suggested sprint order)

1. Fix bugs 1 & 2 (calendar sync reliability)
2. ~~Fix UX gaps 6–11~~ ✅ Done
3. Implement multi-user invite (biggest product gap)
4. Mobile layout (stacked view for small screens)
5. Upcoming / agenda tab
6. Bi-directional Google Calendar sync
