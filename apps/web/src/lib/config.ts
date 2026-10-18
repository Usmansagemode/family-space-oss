import { SPACE_COLORS, CHART_COLORS } from '@family/config'
export { SPACE_COLORS, CHART_COLORS }

// CHART_COLORS index reference:
//  [0]=blue [1]=green [2]=yellow [3]=peach [4]=lavender
//  [5]=rose [6]=aqua  [7]=coral  [8]=periwinkle [9]=sage [10]=purple [11]=seafoam

/** Default categories seeded for new families on onboarding.
 *  Users can edit, recolor, reorder, archive, or delete these after creation. */
export const DEFAULT_CATEGORIES = [
  { name: 'Grocery',   color: CHART_COLORS[1],        icon: 'ShoppingCart' },    // green
  { name: 'Takeout',   color: CHART_COLORS[7],        icon: 'UtensilsCrossed' }, // coral
  { name: 'Shopping',  color: CHART_COLORS[4],        icon: 'ShoppingBag' },     // lavender
  { name: 'Travel',    color: CHART_COLORS[0],        icon: 'Plane' },           // blue
  { name: 'Utilities', color: CHART_COLORS[2],        icon: 'Zap' },             // yellow
  { name: 'Petrol',    color: CHART_COLORS[3],        icon: 'Fuel' },            // peach
  { name: 'Car',       color: CHART_COLORS[6],        icon: 'Car' },             // aqua
  { name: 'Gifts',     color: CHART_COLORS[5],        icon: 'Gift' },            // rose
  { name: 'Misc',      color: 'oklch(0.82 0.05 270)', icon: 'MoreHorizontal' },  // muted periwinkle
] as const

/** Pro-only features — check family plan before rendering or running these. */
export const PRO_FEATURES = [
  'yearly-charts',
  'per-member-charts',
  'pdf-import',
  'excel-export',
  'trackers',
  'google-calendar',
] as const

export type ProFeature = (typeof PRO_FEATURES)[number]
