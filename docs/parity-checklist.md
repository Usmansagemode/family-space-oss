# Parity checklist: Family Space web app vs family-space

Feature-by-feature comparison of this app with hosted family-space, for a
family on family-space's top tier. Use it to check an instance after
[migrating](migrating-from-family-space.md): sign in as the owner and as a
member and walk down the list.

Columns:

- **Code** — how the screen and its queries relate to family-space's code.
  Every difference is listed under "Intentional differences".
- **Data** — what `migrate.sh` carries over for the feature.
- **UI** — ✓ when the page is part of the browser smoke check (sign in, open
  the page with a migrated family, no errors); — when it needs a manual check.

| Feature | Code | Data | UI | Check after migrating |
|---|---|---|---|---|
| Board: store and chore columns | Same | Spaces, order and colours preserved | ✓ | Columns appear in the same order |
| Items: add, edit, complete, re-add, history | Same | Items, creators, completers preserved | ✓ | Completed items in History |
| Drag and drop (reorder, move between columns) | Same | `sort_order` preserved | — | Drag an item; refresh keeps the order |
| Recurring items | Same | RRULEs and next dates preserved | ✓ | Completing a recurring item reschedules it |
| Search | Same | Finds migrated items | — | Search a known item |
| Activity feed | Same | All rows copied, no extra rows | ✓ | Recent entries show the right names |
| Expenses: monthly table, bulk edit, duplicates | Same (duplicate flags always on) | Count and total per month match | ✓ | A month you know: total and rows |
| Income | Same | Entries match | — | Income view for this year |
| Recurring transactions and catch-up | Same | Templates match | — | Recurring list |
| CSV import | Same | — | ✓ (wizard opens) | Import a small CSV |
| AI PDF import (Gemini) | Same as the top tier | — | ✓ (upload step shown) | Needs a Gemini key in Settings → Integrations |
| Charts and export (PDF, Excel) | Same as the top tier | Yearly data loads | ✓ | Totals per month; export downloads |
| Trackers | Same | Trackers and entries match | ✓ | Balances |
| Splits | Same as the top tier (unlimited groups) | Groups, participants, shares, settlements match | ✓ | Balances in a group |
| Budgets | Same | Budgets match | ✓ | Charts → Budget tab, Settings → Members |
| Settings: family | Same, minus Calendar ID | Name, currency, locale, embed URL copied | ✓ | Values |
| Settings: members, paid-by options | Same, minus invites and limits | Roles, system and virtual person spaces | ✓ | Owner badge; former members as paid-by options |
| Settings: locations, categories | Same | Archived state and order preserved | ✓ | Archived categories still on old expenses |
| Settings: account | Same, minus calendar status | Display name, avatar and sign-in metadata copied | ✓ | Name and picture match the old app after signing in; Link Google; Delete account |
| In-app calendar and upcoming timeline | Same, minus sync | Dated and recurring items load | ✓ | Week and month views; embed toggle when an embed URL is set |
| Onboarding | Same for the first owner | Onboarding state copied | ✓ (not shown after migration) | Owner lands on the board |

## Intentional differences

| Area | family-space | Family Space |
|---|---|---|
| Accounts | Public sign-up; anyone can create a family | Sign-up disabled; the owner creates users; everyone joins the one family |
| Joining | Invite links | First sign-in joins the family (membership, person space, `member.joined`) |
| Onboarding | Every new family's owner | Only the owner of an empty instance; members never see it |
| Removing a member | Membership removed | Membership removed **and** the account banned, so they can't rejoin |
| Plans and limits | Free / Plus / Pro gates, member and split limits | Everything unlocked, no limits |
| Google Calendar | Sync of dated items, Calendar ID field, "Calendar active" status | No sync; embed toggle kept; Account shows "Linked" |
| Google sign-in scopes | Calendar scope and offline access | Default profile and email scopes |
| Admin, ban, suspend | Admin panel, banned/suspended screens | Not present |
| Public pages | Marketing landing, pricing, privacy, terms | Sign-in page only |

## Known issues carried over from family-space

- A custom display name or uploaded avatar is replaced by the auth metadata at
  the next sign-in (tracked in GitHub Issues).
