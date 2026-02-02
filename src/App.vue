<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { RGB } from './types/RGB'
import { adaptiveLuminosity, inverseAdaptiveLuminosity, oklchToRgb, rgbToHex, hexToRgb, rgbToOklch } from './shared/color-utils'
import { match } from 'ts-pattern'
import { videoWorkaround } from './shared/hdr-white'
import RangeSlider from './components/RangeSlider.vue'
import ColorSidebar from './components/sidebar/ColorSidebar.vue'
import Card from './components/Card.vue'
import { useColorList } from './composables/useColorList'

const supportsP3  = matchMedia('(color-gamut: p3)').matches
const supportsHdr = matchMedia('(dynamic-range: high)').matches



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


const adaptiveLchState = reactive({
  // cd/m^2 == nits btw
  nits:      100,

  lightness: 0,
  chroma:    0,
  hue:       0
})

const alchInput = computed({
  get: () =>
    `alch(A${Number(adaptiveLchState.nits.toFixed(0))} `
    + `L${Number(adaptiveLchState.lightness.toFixed(4))} `
    + `C${Number(adaptiveLchState.chroma.toFixed(4))} `
    + `h${Number(adaptiveLchState.hue.toFixed(2))})`,

  set: (str: string) => {
    // eugh
    const match = str.match(/alch\(A(\d*\.?\d+)\s+L(\d*\.?\d+)\s+C(\d*\.?\d+)\s+h(\d*\.?\d+)\)/)
    if (!match) return

    const [, nits, lightness, chroma, hue] = match

    adaptiveLchState.nits      = parseFloat(nits)
    adaptiveLchState.lightness = parseFloat(lightness)
    adaptiveLchState.chroma    = parseFloat(chroma)
    adaptiveLchState.hue       = parseFloat(hue)
  }
})

const hexInput = computed({
  get: () => rgbToHex(currentColor.value),

  set: (str: string) => {
    const rgb = hexToRgb(str)
    if (!rgb) return

    const oklch = rgbToOklch(rgb)

    adaptiveLchState.lightness = inverseAdaptiveLuminosity(oklch.L, adaptiveLchState.nits)
    adaptiveLchState.chroma    = oklch.C
    adaptiveLchState.hue       = oklch.h
  }
})


const currentColor = computed<RGB>(() => {
  const rgb = oklchToRgb({
    L: adaptiveLuminosity(adaptiveLchState.lightness, adaptiveLchState.nits),
    C: adaptiveLchState.chroma,
    h: adaptiveLchState.hue
  })

  if (!rgb.inGamut)
    return {
      r: 0,
      g: 0,
      b: 0
    }

  return rgb
})


const lightnessGradient = computed(() => {
  const steps = 200
  const colors = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    const rgb = oklchToRgb({
      L: adaptiveLuminosity(t, adaptiveLchState.nits),
      C: adaptiveLchState.chroma,
      h: adaptiveLchState.hue
    })

    if (rgb.inGamut) {
      return `color(display-p3 ${rgb.r.toFixed(4)} ${rgb.g.toFixed(4)} ${rgb.b.toFixed(4)})`
    }
    return 'black'
  })

  return `linear-gradient(to right, ${colors.join(', ')})`
})


const chromaGradient = computed(() => {
  const steps = 200
  const colors = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    const rgb = oklchToRgb({
      L: adaptiveLuminosity(adaptiveLchState.lightness, adaptiveLchState.nits),
      C: t * 0.3,
      h: adaptiveLchState.hue
    })

    if (rgb.inGamut) {
      return `color(display-p3 ${rgb.r.toFixed(4)} ${rgb.g.toFixed(4)} ${rgb.b.toFixed(4)})`
    }
    return 'black'
  })

  return `linear-gradient(to right, ${colors.join(', ')})`
})


const hueGradient = computed(() => {
  const steps = 200
  const colors = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    const rgb = oklchToRgb({
      L: adaptiveLuminosity(adaptiveLchState.lightness, adaptiveLchState.nits),
      C: adaptiveLchState.chroma,
      h: t * 360
    })

    if (rgb.inGamut) {
      return `color(display-p3 ${rgb.r.toFixed(4)} ${rgb.g.toFixed(4)} ${rgb.b.toFixed(4)})`
    }
    return 'black'
  })

  return `linear-gradient(to right, ${colors.join(', ')})`
})


const nitsGradient = computed(() => {
  const steps = 200
  const colors = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    const nitsValue = t * 2000
    const rgb = oklchToRgb({
      L: adaptiveLuminosity(adaptiveLchState.lightness, nitsValue),
      C: adaptiveLchState.chroma,
      h: adaptiveLchState.hue
    })

    if (rgb.inGamut) {
      return `color(display-p3 ${rgb.r.toFixed(4)} ${rgb.g.toFixed(4)} ${rgb.b.toFixed(4)})`
    }
    return 'black'
  })

  return `linear-gradient(to right, ${colors.join(', ')})`
})


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


const paletteState = reactive({
  steps: 100,
  mode: 'lightness' as
    | 'lightness'
    | 'chroma'
    | 'hue'
})


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


const {
  colorListState,
  addColor,
  deleteColor,
  moveColorUp,
  moveColorDown,
  updateColorName
} = useColorList(adaptiveLchState)


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


const palette = computed(() =>
  Array.from({ length: paletteState.steps }, (_, i) => {
    const t = i / (paletteState.steps - 1)

    const [
      currentL,
      currentC,
      currentH
    ] = match(paletteState.mode)
      .with('lightness', () =>
        [t, adaptiveLchState.chroma, adaptiveLchState.hue]
      )
      .with('chroma', () =>
        [adaptiveLchState.lightness, t * 0.3, adaptiveLchState.hue]
      )
      .with('hue', () =>
        [adaptiveLchState.lightness, adaptiveLchState.chroma, t * 360]
      )
      .exhaustive()

    const rgb = oklchToRgb({
      L: adaptiveLuminosity(currentL, adaptiveLchState.nits),
      C: currentC,
      h: currentH
    })

    if (rgb.inGamut) {
      const r = Math.round(rgb.r * 255)
      const g = Math.round(rgb.g * 255)
      const b = Math.round(rgb.b * 255)

      return {
        color: `color(display-p3 ${(rgb.r).toFixed(4)} ${(rgb.g).toFixed(4)} ${(rgb.b).toFixed(4)})`,
        // color: `rgb(${r},${g},${b})`,
        values: { L: currentL, C: currentC, h: currentH },
        rgb: { r, g, b }
      }
    } else {
      return {
        color: 'black',
        values: { L: 0, C: 0, h: 0 },
        rgb:    { r: 0, g: 0, b: 0 }
      }
    }
  })
)
</script>


<template>
  <div
    class="h-dvh w-dvw grid md:grid-cols-[350px_1fr] bg-slate-100"
  >
    <!-- sidebar -->
    <ColorSidebar
      class="hidden md:flex"
      :color-list-state="colorListState"
      :on-add-color="addColor"
      :on-delete-color="deleteColor"
      :on-move-color-up="moveColorUp"
      :on-move-color-down="moveColorDown"
      :on-update-color-name="updateColorName"
      @update:selected-index="colorListState.selectedIndex = $event"
    />


    <!-- content -->
    <main class="flex justify-center overflow-y-auto">
      <div
        class="
          w-full max-w-4xl flex flex-col items-center gap-4 *:shrink-0
          p-8
        "
      >

        <!-- color preview -->
        <div
          class="
            flex
            *:flex *:items-end *:px-6 *:py-4
            *:size-64 *:rounded-xl *:shadow
            *:font-extrabold
            gap-2
          "
          :class="adaptiveLchState.lightness < 0.5 ? 'text-white' : 'text-black'"
        >
          <div
            v-if="supportsP3"
            :style="{
              'background-color': `
                color(display-p3 ${currentColor.r.toFixed(4)} ${currentColor.g.toFixed(4)} ${currentColor.b.toFixed(4)})
              `
            }"
          >
            <p>P3</p>
          </div>
          <div
            :style="{
              'background-color': `
                rgb(
                  ${(currentColor.r * 100).toFixed(1)}%,
                  ${(currentColor.g * 100).toFixed(1)}%,
                  ${(currentColor.b * 100).toFixed(1)}%
                )
              `
            }"
          >
            <p>SDR</p>
          </div>
        </div>


        <!-- sliders -->
        <Card class="flex flex-col gap-4 p-8">
          <span class="flex justify-start items-center gap-2">
            <button
              class="px-2 py-1 bg-blue-600 rounded-full text-white"
              @click="() => {
                adaptiveLchState.nits = 100
              }"
            >
              SDR
            </button>
            <button
              class="px-2 py-1 bg-blue-600 rounded-full text-white"
              @click="() => {
                adaptiveLchState.nits = 485
              }"
            >
              Framework 16
            </button>
            <button
              class="px-2 py-1 bg-blue-600 rounded-full text-white"
              @click="() => {
                adaptiveLchState.nits = 1600
              }"
            >
              iPhone 14 Pro
            </button>
          </span>

          <div class="flex *:flex-1 flex-col sm:flex-row gap-2">
            <input
              type="text"
              v-model="alchInput"
              class="
                px-3 py-2 text-sm border border-slate-300 rounded-md
                focus:outline-none
                focus:border-blue-300
                focus:ring-4 focus:ring-blue-600/30
              "
            />

            <input
              type="text"
              v-model="hexInput"
              placeholder="#000000"
              class="
                px-3 py-2 text-sm font-mono border border-slate-300 rounded-md
                focus:outline-none
                focus:border-blue-300
                focus:ring-4 focus:ring-blue-600/30
              "
            />
          </div>

          <RangeSlider
            label="Expected nits in monitor"
            :min="0"
            :max="2000"
            :step="1"
            v-model.number="adaptiveLchState.nits"
            :bg="nitsGradient"
          />

          <RangeSlider
            label="Lightness"
            :min="0"
            :max="1"
            :step="0.001"
            v-model.number="adaptiveLchState.lightness"
            :bg="lightnessGradient"
          />

          <RangeSlider
            label="Chroma"
            :min="0"
            :max="0.3"
            :step="0.001"
            v-model.number="adaptiveLchState.chroma"
            :bg="chromaGradient"
          />

          <RangeSlider
            label="Hue"
            :min="0"
            :max="360"
            :step="1"
            v-model.number="adaptiveLchState.hue"
            :bg="hueGradient"
          />
        </Card>



        <!-- palette display -->
        <Card class="flex flex-col gap-4 p-8">
          <input
            type="range"
            min="2"
            max="200"
            step="1"
            v-model.number="paletteState.steps"
          />
          {{ paletteState.mode }}

          <button
            @click="() =>
              paletteState.mode = 'lightness'
            "
          >
            lightness
          </button>
          <button
            @click="() =>
              paletteState.mode = 'chroma'
            "
          >
            chroma
          </button>
          <button
            @click="() =>
              paletteState.mode = 'hue'
            "
          >
            hue
          </button>

          <!-- color strip without gaps -->
          <div class="h-12 rounded overflow-hidden border flex w-full">
            <div
              v-for="({ color }, index) in palette"
              :key="index"
              class="flex-1"
              :style="{ backgroundColor: color }"
            ></div>
          </div>

          <!-- individual swatches -->
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(item, i) in palette"
              :key="i"
              class="flex flex-col items-center"
            >
              <div
                class="size-12"
                :style="{
                  backgroundColor: item.color
                }"
                :title="
                  `L:${item.values.L.toFixed(3)}, `
                  + `C:${item.values.C.toFixed(3)}, `
                  + `h:${item.values.h.toFixed(1)}°`
                "
              />
              <div class="text-xs text-center">
                <span v-if="paletteState.mode === 'lightness'">
                  L:{{ item.values.L.toFixed(2) }}
                </span>
                <span v-else-if="paletteState.mode === 'chroma'">
                  C:{{ item.values.C.toFixed(2) }}
                </span>
                <span v-else>
                  {{ item.values.h.toFixed(0) }}°
                </span>
              </div>
            </div>
          </div>

          <p class="text-2xl">
            {{ supportsP3 ? 'p3 wide gamut' : 'srgb' }} -- {{ supportsHdr ? 'hdr' : 'sdr' }}
          </p>
        </Card>
      </div>
    </main>
  </div>

  <!-- force webkit into enabling HDR mode on mobile devices -->
  <video
    class="size-0.5 opacity-0 fixed pointer-events-none"
    muted
    autoplay
    playsinline
    oncanplaythrough
    poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAAAXNSR0IArs4c6QAAAA5JREFUeNpj+P+fgRQEAP1OH+HeyHWXAAAAAElFTkSuQmCC"
    :src="videoWorkaround"
  />
</template>
