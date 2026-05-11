<template>
  <div class="relative select-none bg-black rounded-lg overflow-hidden">
    <div class="flex">
      <!-- Before Image (left side) -->
      <div class="relative overflow-hidden" :style="{ width: `${sliderPercent}%` }">
        <img
          ref="beforeImgRef"
          :src="beforeUrl"
          class="max-w-none h-auto select-none"
          :style="{ width: containerWidth + 'px' }"
          @load="onImageLoad"
        />
      </div>
      <!-- After Image (right side) -->
      <div class="relative overflow-hidden" :style="{ width: `${100 - sliderPercent}%` }">
        <img
          ref="afterImgRef"
          :src="afterUrl"
          class="max-w-none h-auto select-none"
          :style="{ width: containerWidth + 'px', marginLeft: `-${sliderPercent}%` }"
          @load="onImageLoad"
        />
      </div>
    </div>

    <!-- Slider Handle -->
    <div
      class="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10"
      :style="{ left: `${sliderPercent}%` }"
      @mousedown="startDrag"
      @touchstart.prevent="startDrag"
    >
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
        <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>
    </div>

    <!-- Labels -->
    <div class="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">处理前</div>
    <div class="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">处理后</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  beforeUrl: string
  afterUrl: string
}>()

const beforeImgRef = ref<HTMLImageElement | null>(null)
const containerWidth = ref(800)
const sliderPercent = ref(50)
let isDragging = false

function onImageLoad() {
  if (beforeImgRef.value) {
    containerWidth.value = beforeImgRef.value.clientWidth
  }
}

function updateSlider(clientX: number) {
  const rect = beforeImgRef.value?.parentElement?.parentElement?.getBoundingClientRect()
  if (!rect) return
  const x = clientX - rect.left
  sliderPercent.value = Math.max(0, Math.min(100, (x / rect.width) * 100))
}

function startDrag(e: MouseEvent | TouchEvent) {
  isDragging = true
  const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0) : e.clientX
  updateSlider(clientX)

  const moveHandler = (ev: MouseEvent | TouchEvent) => {
    if (!isDragging) return
    const cx = 'touches' in ev ? (ev.touches[0]?.clientX ?? 0) : ev.clientX
    updateSlider(cx)
  }
  const upHandler = () => {
    isDragging = false
    window.removeEventListener('mousemove', moveHandler)
    window.removeEventListener('mouseup', upHandler)
    window.removeEventListener('touchmove', moveHandler)
    window.removeEventListener('touchend', upHandler)
  }

  window.addEventListener('mousemove', moveHandler)
  window.addEventListener('mouseup', upHandler)
  window.addEventListener('touchmove', moveHandler)
  window.addEventListener('touchend', upHandler)
}

onMounted(() => {
  if (beforeImgRef.value) {
    containerWidth.value = beforeImgRef.value.clientWidth
  }
})
</script>
