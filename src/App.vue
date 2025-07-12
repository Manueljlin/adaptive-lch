<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { RGB } from './types/RGB'
import { adaptiveLuminosity, oklchToRgb } from './shared/color-utils'
import { match } from 'ts-pattern'

// fw16 is technically 500 but rtings measured it at this
const currentDisplayMaxNits = ref(485)

const supportsP3 = matchMedia('(color-gamut: p3)').matches


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


const adaptiveLchState = reactive({
  // cd/m^2 == nits btw
  nits:      100,

  lightness: 0,
  chroma:    0,
  hue:       0
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
        nits {{ adaptiveLchState.nits }}
        <button
          class="px-2 py-1 bg-blue-500 rounded-full text-white"
          @click="() => {
            adaptiveLchState.nits = 100
          }"
        >
          reset
        </button>
      </span>
      <input
        type="range"
        min="0"
        :max="currentDisplayMaxNits"
        step="1"
        v-model.number="adaptiveLchState.nits"
      />

      lightness {{ adaptiveLchState.lightness }}
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        v-model.number="adaptiveLchState.lightness"
      />

      chroma {{ adaptiveLchState.chroma }}
      <input
        type="range"
        min="0"
        max="0.3"
        step="0.001"
        v-model.number="adaptiveLchState.chroma"
      />

      hue {{ adaptiveLchState.hue }}
      <input
        type="range"
        min="0"
        max="360"
        step="1"
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
</template>
