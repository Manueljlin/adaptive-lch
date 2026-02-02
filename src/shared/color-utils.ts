import { match } from "ts-pattern"
import type { Lab } from "../types/Lab"
import type { LCh } from "../types/LCh"
import type { RGB } from "../types/RGB"

/**
 * convert color component (r, g, b) from srgb to linear rgb.
 * by undoing srgb we can undo the terrible 90s attempt at perceptual uniformity
 *
 * piecewise function that for very dark values uses linear scaling but for
 * brighter ones uses gamma correction.
 */
export const srgbToLinear = (c: number) =>
  c <= 0.04045 ?
    c / 12.92
  : Math.pow((c + 0.055) / 1.055, 2.4) // srgb gamma 2.4


export const linearToSrgb = (c: number) =>
  c <= 0.0031308 ?
    c * 12.92
  : 1.055 * Math.pow(c, 1 / 2.4) - 0.055


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~/


const supportsP3 = matchMedia('(color-gamut: p3)').matches

export const oklabToRgb = ({ L, a, b }: Lab): RGB & {
  inGamut: boolean
} => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548  * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701  * s

  const r_srgb = linearToSrgb(lr)
  const g_srgb = linearToSrgb(lg)
  const b_srgb = linearToSrgb(lb)

  const r = supportsP3 ? linearToSrgb(lr) : Math.max(0, Math.min(1, linearToSrgb(lr)))
  const g = supportsP3 ? linearToSrgb(lg) : Math.max(0, Math.min(1, linearToSrgb(lg)))
  const b_ = supportsP3 ? linearToSrgb(lb) : Math.max(0, Math.min(1, linearToSrgb(lb)))

  const inGamut = supportsP3 ? (
    r_srgb >= -0.1    && r_srgb <= 1.4
    && g_srgb >= -0.1 && g_srgb <= 1.4
    && b_srgb >= -0.1 && b_srgb <= 1.4
  )
  : (
    r_srgb >= 0    && r_srgb <= 1
    && g_srgb >= 0 && g_srgb <= 1
    && b_srgb >= 0 && b_srgb <= 1
  )

  return {
    r,
    g,
    b: b_,
    inGamut
  }
}


export const oklchToRgb = ({ L, C, h }: LCh): RGB & {
  inGamut: boolean
} => {
  // transform cylindrical hue coordinates to rectangular
  const hueRadians = (h * Math.PI) / 180

  // oklab's a coord is the horizontal axis, thus cosine
  // negative -> green, positive -> red
  const a = C * Math.cos(hueRadians)

  // oklab's b coord is the vertical axis, thus sine
  // negative -> blue, positive -> yellow
  const b = C * Math.sin(hueRadians)


  return oklabToRgb({ L, a, b })
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~/


/**
 * @param t            how bright is this? 0 = black, 1 = full white (maxLuminance)
 * @param maxLuminance max cd/m^2 of range
 * @returns
 */
export const perceptualQuantizer = (
  t: number,
  maxLuminance: number = 100 // default to 100cd/m^2 which is sdr
): number => {
  // pq constants lifted from smpte st2084 lol
  const m1 = 0.1593017578125
  const m2 = 78.84375
  const c1 = 0.8359375
  const c2 = 18.8515625
  const c3 = 18.6875

  // scale t into an actual luminance value between 0.01 and maxLuminance
  // avoids true black which causes math to blow up
  const L = 0.01 + t * (maxLuminance - 0.01)

  // clamp to 10k cd/m^2 which is the brightness of the sun and the limit of pq
  const Lp          = Math.pow(L / 10000.0, m1)

  // straight up warping it
  const numerator   = c1 + c2 * Lp
  const denominator = 1 + c3 * Lp
  const result      = Math.pow(numerator / denominator, m2)

  // normalize to [0, maxLuminance]
  const whiteL           = maxLuminance
  const whiteLp          = Math.pow(whiteL / 10000.0, m1)
  const whiteNumerator   = c1 + c2 * whiteLp
  const whiteDenominator = 1 + c3 * whiteLp
  const whiteResult      = Math.pow(whiteNumerator / whiteDenominator, m2)

  return result / whiteResult
}


// assumes max luminance is 100
export const simplifiedPq = (t: number) =>
  Math.pow(t, 0.22)


/**
 * so:
 *    - i approximated PQ @ 100 nits at `t^0.22`
 *    - "huh, i wonder if I can get it to behave like apca"
 *    - t^((1/8) / 0.22) -> t^0.568
 *    - fuck, that's actually like right between the text and non text exponents
 *      (https://www.w3.org/WAI/GL/task-forces/silver/wiki/User:Myndex/APCA_model#APCA_MATH)
 *    - i wonder if i can make it adaptive still and reach 0.62 to 0.65 (reverse)
 *    - t^((1/8) / 0.205) -> t^0.611
 *    - ehh close enough
 *    - linear interpolation works pretty good between the two actually
 *    - lol
 */
export const adaptiveLuminosity = (
   t: number,
  maxLuminance: number = 100 // default to 100cd/m^2 which is sdr
) => {
  const clampedLum = Math.max(0.01, Math.min(10000, maxLuminance))
  const tInterp    = (clampedLum - 30) / 70
  const gamma      = 0.205 + tInterp * 0.015

  // return 1 - Math.pow(1 - t, 0.125 / gamma)
  return Math.pow(t, 0.125 / gamma)
}


export const inverseAdaptiveLuminosity = (
  L: number,
  maxLuminance: number = 100
) => {
  const clampedLum = Math.max(0.01, Math.min(10000, maxLuminance))
  const tInterp    = (clampedLum - 30) / 70
  const gamma      = 0.205 + tInterp * 0.015

  return Math.pow(L, gamma / 0.125)
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~/


/**
 * convert rgb to hex color string
 */
export const rgbToHex = ({ r, g, b }: RGB): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16)
    return hex.padStart(2, '0')
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}


/**
 * convert hex color string to rgb
 */
export const hexToRgb = (hex: string): RGB | null => {
  // nuke #
  const cleaned = hex.replace(/^#/, '')

  const [r, g, b] = match(cleaned.length)
    .with(3, () => [
      parseInt(cleaned[0] + cleaned[0], 16) / 255,
      parseInt(cleaned[1] + cleaned[1], 16) / 255,
      parseInt(cleaned[2] + cleaned[2], 16) / 255
    ])
    .with(6, () => [
      parseInt(cleaned.substring(0, 2), 16) / 255,
      parseInt(cleaned.substring(2, 4), 16) / 255,
      parseInt(cleaned.substring(4, 6), 16) / 255
    ])
    .otherwise(() => [NaN, NaN, NaN])

  if (isNaN(r) || isNaN(g) || isNaN(b))
    return null

  return { r, g, b }
}


/**
 * convert rgb to oklab (inverse of oklabToRgb)
 */
export const rgbToOklab = ({ r, g, b }: RGB): Lab => {
  // convert to linear RGB
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  // linear rgb to lms color space
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

  // apply cube root
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  // convert to OKLab
  const L     = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a     = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bComp = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  return { L, a, b: bComp }
}


/**
 * convert rgb to oklch
 */
export const rgbToOklch = (rgb: RGB): LCh => {
  const { L, a, b } = rgbToOklab(rgb)

  // rectangular to cylindrical coords
  const C = Math.sqrt(a * a + b * b)
  let   h = (Math.atan2(b, a) * 180) / Math.PI

  // normalize hue to 0-360
  if (h < 0) h += 360

  return { L, C, h }
}
