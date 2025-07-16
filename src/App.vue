<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { RGB } from './types/RGB'
import { adaptiveLuminosity, oklchToRgb } from './shared/color-utils'
import { match } from 'ts-pattern'
import { videoWorkaround } from './shared/hdr-white'
import RangeSlider from './components/RangeSlider.vue'

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
    `alch(A${adaptiveLchState.nits} `
    + `L${adaptiveLchState.lightness} `
    + `C${adaptiveLchState.chroma} `
    + `h${adaptiveLchState.hue})`,

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


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


const paletteState = reactive({
  steps: 100,
  mode: 'lightness' as
    | 'lightness'
    | 'chroma'
    | 'hue'
})



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
    class="
      bg-slate-200 h-dvh w-dvw overflow-auto
      flex flex-col items-center gap-8
      p-8
      *:shrink-0
    "
  >
    <h1 class="text-4xl">
      adaptive lch experiment
    </h1>

    <h2 class="text-2xl">
      {{ supportsP3 ? 'p3 wide gamut' : 'srgb' }} -- {{ supportsHdr ? 'hdr' : 'sdr' }}
    </h2>

    <!-- color preview -->
    <div class="size-64 rounded-full shadow"
      :style="{
        'background-color': `
          color(display-p3 ${currentColor.r.toFixed(4)} ${currentColor.g.toFixed(4)} ${currentColor.b.toFixed(4)})
        `
      }"
    />


    <!-- color preview -->
    <!-- <div class="size-64 rounded-full shadow"
      :style="{
        'background-color': `
          rgb(
            ${(currentColor.r * 100).toFixed(1)}%,
            ${(currentColor.g * 100).toFixed(1)}%,
            ${(currentColor.b * 100).toFixed(1)}%
          )
        `
      }"
    /> -->

    <!-- sliders -->
    <div
      class="
        bg-white shadow rounded-lg w-full h-fit
        flex flex-col gap-4 p-8
      "
    >
      <span class="flex justify-between items-center">
        <button
          class="px-2 py-1 bg-blue-500 rounded-full text-white"
          @click="() => {
            adaptiveLchState.nits = 100
          }"
        >
          sdr
        </button>
        <button
          class="px-2 py-1 bg-blue-500 rounded-full text-white"
          @click="() => {
            adaptiveLchState.nits = 485
          }"
        >
          fw16
        </button>
        <button
          class="px-2 py-1 bg-blue-500 rounded-full text-white"
          @click="() => {
            adaptiveLchState.nits = 1600
          }"
        >
          14 pro
        </button>
      </span>

      <input
        type="text"
        v-model="alchInput"
        class="
          px-3 py-2 text-sm border border-slate-300 rounded-md
          focus:outline-none
          focus:border-blue-300
          focus:ring-4 focus:ring-blue-500/30
        "
      />

      <RangeSlider
        label="Nits (kinda ass tone mapping)"
        :min="0"
        :max="2000"
        :step="1"
        v-model.number="adaptiveLchState.nits"
      />

      <RangeSlider
        label="Lightness"
        :min="0"
        :max="1"
        :step="0.001"
        v-model.number="adaptiveLchState.lightness"
      />

      <RangeSlider
        label="Chroma"
        :min="0"
        :max="0.3"
        :step="0.001"
        v-model.number="adaptiveLchState.chroma"
      />

      <RangeSlider
        label="Hue"
        :min="0"
        :max="360"
        :step="1"
        v-model.number="adaptiveLchState.hue"
      />
    </div>



    <!-- palette display -->
    <div
      class="
        bg-white shadow rounded-lg w-full h-fit
        flex flex-col gap-4 p-8
      "
    >
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
            class="size-16"
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


    </div>
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
