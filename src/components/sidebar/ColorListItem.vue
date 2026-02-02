<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { AdaptiveLchColor } from '../../types/AdaptiveLchColor'
import type { RGB } from '../../types/RGB'
import { adaptiveLuminosity, oklchToRgb } from '../../shared/color-utils'
import Card from '../Card.vue'

const props = defineProps<{
  color: AdaptiveLchColor
  isSelected: boolean
}>()

const emit = defineEmits<{
  select: []
  delete: []
  moveUp: []
  moveDown: []
  updateName: [newName: string]
}>()


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


const isEditingName = ref(false)
const editedName    = ref('')
const nameInput     = ref<HTMLInputElement>()

const colorPreview = computed<RGB>(() => {
  const rgb = oklchToRgb({
    L: adaptiveLuminosity(props.color.lightness, props.color.nits),
    C: props.color.chroma,
    h: props.color.hue
  })

  if (!rgb.inGamut)
    return { r: 0, g: 0, b: 0 }

  return rgb
})

const startEditingName = () => {
  editedName.value    = props.color.name
  isEditingName.value = true

  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}


const saveName = () => {
  if (editedName.value.trim()) {
    emit('updateName', editedName.value.trim())
  }
  isEditingName.value = false
}


const cancelEdit = () => {
  isEditingName.value = false
}
</script>


<template>
  <Card
    :class="[
      'p-3 mb-2 cursor-pointer transition-colors hover:bg-slate-50 flex items-center gap-2 select-none',
      isSelected && 'bg-blue-100 ring-2 ring-blue-600'
    ]"
    @click="emit('select')"
  >
    <!-- color preview -->
    <div
      class="size-10 rounded-full shrink-0 shadow-sm"
      :style="{
        backgroundColor: `color(display-p3 ${colorPreview.r.toFixed(4)} ${colorPreview.g.toFixed(4)} ${colorPreview.b.toFixed(4)})`
      }"
    />

    <!-- info -->
    <div class="flex-1 min-w-0">
      <div
        v-if="!isEditingName"
        class="font-medium text-slate-900 truncate"
        @click.stop="startEditingName"
      >
        {{ color.name }}
      </div>

      <input
        v-else
        v-model="editedName"
        type="text"
        class="
          w-full px-2 py-0.5 text-sm border border-blue-600 rounded
          focus:outline-none focus:ring-2 focus:ring-blue-600/30
        "
        @click.stop
        @blur="saveName"
        @keydown.enter="saveName"
        @keydown.esc="cancelEdit"
        ref="nameInput"
      />

      <!-- stats -->
      <div class="text-xs text-slate-500">
        L{{ color.lightness.toFixed(2) }}
        C{{ color.chroma.toFixed(2) }}
        h{{ color.hue.toFixed(0) }}
      </div>
    </div>


    <!-- actions -->
    <div class="flex flex-col shrink-0">
      <button
        @click.stop="emit('moveUp')"
        class="px-2 py-0.5 text-xs hover:bg-slate-500/20 rounded-full transition-colors"
        title="Move up"
      >
        <p class="translate-y-1">
          ⌃
        </p>
      </button>
      <button
        @click.stop="emit('moveDown')"
        class="px-2 py-0.5 text-xs hover:bg-slate-500/20 rounded-full transition-colors"
        title="Move down"
      >
        <p class="-translate-y-1">
          ⌄
        </p>
      </button>
    </div>


    <button
      @click.stop="emit('delete')"
      class="
        size-6 rounded-full
        bg-red-500 text-white rounded hover:bg-red-600 transition-colors
        font-bold
      "
      title="Delete color"
    >
      ×
    </button>
  </Card>
</template>
