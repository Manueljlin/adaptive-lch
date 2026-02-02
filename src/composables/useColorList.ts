import { reactive, watch } from 'vue'
import { createDefaultColor, createSamplePalette } from '../types/AdaptiveLchColor'
import type { AdaptiveLchColor } from '../types/AdaptiveLchColor'


export type ColorListState = {
  colors: AdaptiveLchColor[]
  selectedIndex: number
}


export const useColorList = (alch: {
  nits:      number
  lightness: number
  chroma:    number
  hue:       number
}) => {
  const colorListState = reactive<ColorListState>({
    colors: createSamplePalette(),
    selectedIndex: 0
  })


  const addColor = () => {
    const newColor = createDefaultColor(
      alch.nits,
      alch.lightness,
      alch.chroma,
      alch.hue
    )
    colorListState.colors.push(newColor)
    colorListState.selectedIndex = colorListState.colors.length - 1
  }


  const deleteColor = (index: number) => {
    if (colorListState.colors.length <= 1) return

    colorListState.colors.splice(index, 1)

    if (colorListState.selectedIndex >= colorListState.colors.length)
      colorListState.selectedIndex = colorListState.colors.length - 1
    else if (colorListState.selectedIndex > index)
      colorListState.selectedIndex--
  }


  const moveColorUp = (index: number) => {
    if (index <= 0) return
    const colors = colorListState.colors;

    // swap
    [
      colors[index - 1],
      colors[index]
    ] = [
      colors[index],
      colors[index - 1]
    ]

    if (colorListState.selectedIndex === index)
      colorListState.selectedIndex = index - 1
    else if (colorListState.selectedIndex === index - 1)
      colorListState.selectedIndex = index
  }


  const moveColorDown = (index: number) => {
    if (index >= colorListState.colors.length - 1) return
    const colors = colorListState.colors;

    // swap
    [
      colors[index],
      colors[index + 1]
    ] = [
      colors[index + 1],
      colors[index]
    ]

    if (colorListState.selectedIndex === index)
      colorListState.selectedIndex = index + 1
    else if (colorListState.selectedIndex === index + 1)
      colorListState.selectedIndex = index
  }


  const updateColorName = (index: number, newName: string) => {
    const color = colorListState.colors[index]
    if (!color) return

    color.name = newName
  }


  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // State sync
  //

  // selected color to adaptiveLchState
  //
  watch(() => colorListState.selectedIndex, (newIndex) => {
    const selected = colorListState.colors[newIndex]
    if (!selected) return

    alch.nits      = selected.nits
    alch.lightness = selected.lightness
    alch.chroma    = selected.chroma
    alch.hue       = selected.hue
  }, { immediate: true })


  // adaptiveLchState to selected color
  //
  let syncTimeout: number | undefined

  watch(alch, () => {
    clearTimeout(syncTimeout)

    syncTimeout = setTimeout(() => {
      const selected = colorListState.colors[colorListState.selectedIndex]
      if (!selected) return

      selected.nits      = alch.nits
      selected.lightness = alch.lightness
      selected.chroma    = alch.chroma
      selected.hue       = alch.hue
    }, 50)
  })


  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


  return {
    colorListState,
    addColor,
    deleteColor,
    moveColorUp,
    moveColorDown,
    updateColorName
  }
}
