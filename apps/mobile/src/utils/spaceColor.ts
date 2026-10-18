/**
 * React Native cannot render OKLCH CSS color strings.
 * Space colors are stored as OKLCH in the DB (set from the web app).
 * Maps each SPACE_COLORS entry to sRGB hex equivalents:
 *   base   — pastel fill (card / header background)
 *   accent — vivid deeper tone (checkbox tick, icon tint)
 *   border — mid tone between base and accent (card border)
 */

type SpaceColorTokens = {
  base: string
  accent: string
  border: string
}

const SPACE_COLOR_MAP: Record<string, SpaceColorTokens> = {
  'oklch(0.82 0.10 228)': { base: '#9AC4E8', accent: '#2A70B8', border: '#76AED6' }, // sky blue
  'oklch(0.82 0.10 152)': { base: '#88D8A8', accent: '#1E9050', border: '#60C488' }, // mint green
  'oklch(0.84 0.11 88)':  { base: '#DACE5E', accent: '#A09000', border: '#C8BC40' }, // butter yellow
  'oklch(0.82 0.10 50)':  { base: '#E4BE8C', accent: '#B46020', border: '#D0A470' }, // peach
  'oklch(0.82 0.10 308)': { base: '#C6A4E0', accent: '#6A38B8', border: '#B088CC' }, // lavender
  'oklch(0.82 0.10 345)': { base: '#E69AB4', accent: '#A62858', border: '#D07898' }, // rose
  'oklch(0.82 0.10 188)': { base: '#84D8D4', accent: '#147E7A', border: '#5EC4C0' }, // aqua
  'oklch(0.82 0.10 22)':  { base: '#E6AC94', accent: '#B83820', border: '#D09078' }, // coral
  'oklch(0.82 0.10 270)': { base: '#AAAADC', accent: '#4040A8', border: '#8888C8' }, // periwinkle
  'oklch(0.82 0.10 130)': { base: '#9CCCA0', accent: '#3E7844', border: '#78B87C' }, // sage
  'oklch(0.82 0.10 290)': { base: '#C0A0D8', accent: '#7028A8', border: '#A878C4' }, // soft purple
  'oklch(0.82 0.10 0)':   { base: '#E8A0B8', accent: '#B42850', border: '#D47894' }, // blush
  'oklch(0.82 0.10 165)': { base: '#88D4BC', accent: '#1E8068', border: '#60C0A4' }, // seafoam
  'oklch(0.84 0.11 75)':  { base: '#E0C450', accent: '#A08000', border: '#CCAE30' }, // honey
}

const FALLBACK: SpaceColorTokens = {
  base: '#9AC4E8',
  accent: '#2A70B8',
  border: '#76AED6',
}

export function getSpaceColors(color: string): SpaceColorTokens {
  return SPACE_COLOR_MAP[color] ?? FALLBACK
}

/** Shorthand — just the pastel base hex */
export function resolveSpaceColor(color: string): string {
  return getSpaceColors(color).base
}
