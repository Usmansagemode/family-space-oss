// Extract the hue component from an oklch(L C H) string
export function extractHue(oklchColor: string): string {
  const match = oklchColor.match(/oklch\([\d.]+\s+[\d.]+\s+([\d.]+)\)/)
  return match?.[1] ?? '0'
}
