<script setup lang="ts">
import { TransitionGroup } from 'vue'
import ColorListItem from './ColorListItem.vue'
import type { ColorListState } from '../../composables/useColorList'


defineProps<{
  colorListState:    ColorListState
  onAddColor:        () => void
  onDeleteColor:     (index: number) => void
  onMoveColorUp:     (index: number) => void
  onMoveColorDown:   (index: number) => void
  onUpdateColorName: (index: number, newName: string) => void
}>()

const emit = defineEmits<{
  'update:selectedIndex': [index: number]
}>()
</script>


<template>
  <aside
    class="
      bg-slate-100 border-r border-slate-300/50 flex flex-col overflow-hidden
    "
  >

    <!-- header -->
    <div class="p-4 border-b border-slate-300 shrink-0">
      <button
        @click="onAddColor"
        class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        + Add
      </button>
    </div>


    <!-- items -->
    <div class="flex flex-col p-2 overflow-y-auto">
      <TransitionGroup
        move-class="transition-all duration-300 ease-in-out"
        enter-active-class="transition-all duration-300 ease-in-out"
        enter-from-class="opacity-0 -translate-x-5"
        leave-active-class="transition-all duration-300 ease-in-out absolute"
        leave-to-class="opacity-0 translate-x-5"
      >
        <ColorListItem
          v-for="(color, index) in colorListState.colors"
          :key="color.id"
          :color="color"
          :is-selected="index === colorListState.selectedIndex"
          @select="emit('update:selectedIndex', index)"
          @delete="onDeleteColor(index)"
          @move-up="onMoveColorUp(index)"
          @move-down="onMoveColorDown(index)"
          @update-name="onUpdateColorName(index, $event)"
        />
      </TransitionGroup>
    </div>
  </aside>
</template>
