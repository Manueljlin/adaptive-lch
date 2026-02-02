<template>
  <div
    :class="[
      `
        bg-white w-full h-fit relative
        shadow-sm shadow-slate-500/10
        rounded-xl


        before:pointer-events-none before:content-[\'\'] before:inset-0
        before:absolute

        before:shadow-md before:shadow-slate-500/5
        before:rounded-xl
      `,
      'class' in $props && $props.class
    ]"
  >
    <slot />
  </div>
</template>
