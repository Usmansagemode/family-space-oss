# Unit Testing Setup

## Background

Unit tests were introduced in Task 3 of the In-App Calendar feature, scoped specifically to `packages/utils` — the package that holds pure, side-effect-free utility functions. No test framework existed before this.

---

## What Was Added

### 1. `packages/utils/package.json` — test script + vitest dependency

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.0.5"
  }
}
```

`vitest run` executes all tests once and exits (no watch mode). This is the right mode for CI and for running manually before a commit.

Vitest was chosen because:
- It's already used in `apps/web` (same version, consistent toolchain)
- It requires zero config for a pure TypeScript package — it auto-discovers `*.test.ts` files
- It's Vite-native, so it handles ESM and TypeScript without a separate transpile step

### 2. `packages/utils/src/recurrence.ts` — the function under test

The `expandRecurringItem` function is a pure function: given an `Item` and a date window, it returns a list of `CalendarItem` occurrences. No network calls, no React, no Supabase — ideal for unit testing.

### 3. `packages/utils/src/recurrence.test.ts` — the test file

Co-located with the source file it tests. Vitest auto-discovers it via the `*.test.ts` glob.

---

## How the Test File Works

```ts
import { describe, it, expect } from 'vitest'
import { expandRecurringItem } from './recurrence'
import type { Item } from '@family/types'
```

- `describe` groups related tests under a label
- `it` defines a single test case
- `expect` makes assertions

A helper `makeItem()` builds a default `Item` with sensible values, accepting overrides. This keeps each test focused on the one thing it changes:

```ts
function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    familyId: 'family-1',
    recurrence: 'weekly',
    startDate: new Date(2026, 0, 5), // Jan 5 2026
    // ...defaults
    ...overrides,
  }
}
```

---

## What the 12 Tests Cover

| Test | What it verifies |
|------|-----------------|
| Item starting 6 weeks ago | Returns 1 occurrence in window, marked virtual |
| Start date inside window | That occurrence is marked `isVirtual: false` (real) |
| Daily recurrence | 7 occurrences across a 7-day window |
| Start date after window | Returns empty (nothing to show) |
| No `startDate` | Returns empty (guard clause) |
| No `familyId` | Returns empty (guard clause) |
| Monthly recurrence | Correct month/date projected |
| `familyId` propagation | All occurrences carry the parent's `familyId` |
| Exactly on `windowStart` | Inclusive lower bound works |
| Exactly on `windowEnd` | Inclusive upper bound works |
| `start_date` advanced past window | Returns empty (historical nav design) |
| Monthly rollover from Jan 31 | `addMonths(Feb 28, 1)` = Mar 28, not Mar 31 |

The last test caught a real behavioural subtlety: date-fns `addMonths` clamps to the last valid day of the target month. Jan 31 → Feb 28 → Mar 28, not Mar 31. The test documents this so future devs know it's intentional.

---

## How to Run Tests

```bash
# Run just the utils tests
cd packages/utils
npm test

# Run all tests across the monorepo (via Turbo)
npm test   # from the root
```

Turbo's `test` task is already configured in `turbo.json`:

```json
"test": {
  "dependsOn": ["^build"]
}
```

This means running `npm test` at the root will build all packages first, then run tests in any package that has a `test` script — currently just `apps/web` and `packages/utils`.

---

## Where to Add More Tests

The same pattern applies to any package with pure logic:

1. Add `"test": "vitest run"` to the package's `scripts`
2. Add `vitest` to `devDependencies`
3. Create `*.test.ts` files co-located with the source

**Good candidates for future tests:**
- `packages/utils/src/date.ts` — `parseLocalDate`, `advanceDate`, `getDateStatus`
- `packages/utils/src/format.ts` — currency and date formatters
- Any future pure utility added to `packages/utils`

**Not suitable for this pattern** (require mocks or a real environment):
- Supabase queries (`packages/supabase/`) — need a real DB or deep mocking
- React hooks (`packages/hooks/`) — need `renderHook` from `@testing-library/react`
- UI components (`apps/web/src/components/`) — need jsdom (already available in `apps/web`)
