<script setup lang="ts">
import { ref, watch } from 'vue'


const props = defineProps<{
  label: string

  min:   number
  max:   number
  step:  number
}>()

const inputValue = defineModel<number>({
  required: true
})


// keep internal value so that it doesn't kaboom
const textInputValue = ref(String(inputValue.value))


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


// set new value
watch(inputValue, (newValue) => {
  if (isNaN(newValue) || !isFinite(newValue)) return
  textInputValue.value = String(newValue)
})


// validate on input
const handleTextInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // we allow empty state while user inputs new value
  if (value === '') {
    textInputValue.value = ''
    return
  }

  const numValue = parseFloat(value)
  if (isNaN(numValue) || !isFinite(numValue)) return

  inputValue.value = Math.max(props.min, Math.min(props.max, numValue))
  textInputValue.value = value
}


// restore last valid value on blur if empty
const handleBlur = () => {
  if (textInputValue.value !== '') return
  textInputValue.value = String(inputValue.value)
}
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
        :value="textInputValue"
        @input="handleTextInput"
        @blur="handleBlur"
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
