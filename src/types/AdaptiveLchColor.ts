export type AdaptiveLchColor = {
  id: string
  name: string
  nits: number
  lightness: number
  chroma: number
  hue: number
}

let colorCounter = 1

export function createDefaultColor(
  nits = 100,
  lightness = 0.5,
  chroma = 0.1,
  hue = 0,
  name?: string
): AdaptiveLchColor {
  return {
    id: `color-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: name || `Color ${colorCounter++}`,
    nits,
    lightness,
    chroma,
    hue
  }
}

// Helper to create a sample palette for initial state
export function createSamplePalette(): AdaptiveLchColor[] {
  return [
    createDefaultColor(100, 0.3, 0.15, 0, 'Red'),
    createDefaultColor(100, 0.5, 0.15, 120, 'Green'),
    createDefaultColor(100, 0.5, 0.15, 240, 'Blue'),
    createDefaultColor(100, 0.7, 0.15, 60, 'Yellow'),
  ]
}
