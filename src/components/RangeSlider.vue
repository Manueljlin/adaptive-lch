<script setup lang="ts">
defineProps<{
  label: string

  min:   number
  max:   number
  step:  number
}>()

const inputValue = defineModel<number>({
  required: true
})
</script>


<template>
  <div class="flex flex-col gap-2">
    <label class="text-sm font-medium text-slate-700 select-none">
      {{ label }}
    </label>

    <div class="flex items-center gap-3">
      <input
        type="range"
        :min
        :max
        :step
        v-model.number="inputValue"
        class="
          flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer
        "
      />

      <input
        type="number"
        :min
        :max
        :step
        v-model.number="inputValue"
        class="
          w-32 px-3 py-2 text-sm border border-slate-300 rounded-md
          focus:outline-none
          focus:border-blue-300
          focus:ring-4 focus:ring-blue-500/30
        "
      />
    </div>
  </div>
</template>