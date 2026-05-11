<template>
  <div class="relative select-none" @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" @mouseleave="stopDrawing" @touchstart.prevent="handleTouchStart" @touchmove.prevent="handleTouchMove" @touchend.prevent="handleTouchEnd">
    <img
      ref="imageRef"
      :src="imageUrl || ''"
      class="max-w-full h-auto block"
      @load="onImageLoad"
    />
    
    <canvas
      ref="canvasRef"
      class="absolute inset-0 cursor-crosshair"
    ></canvas>
    
    <div
      v-for="region in regions"
      :key="region.id"
      class="absolute border-2 border-red-500 bg-red-500/10 group"
      :style="{
        left: `${region.x}px`,
        top: `${region.y}px`,
        width: `${region.width}px`,
        height: `${region.height}px`
      }"
    >
      <button
        class="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
        @click.stop="emit('remove', region.id)"
      >
        ×
      </button>
    </div>
    
    <div
      v-if="isDrawing && currentRect"
      class="absolute border-2 border-dashed border-blue-500 bg-blue-500/10"
      :style="{
        left: `${currentRect.x}px`,
        top: `${currentRect.y}px`,
        width: `${currentRect.width}px`,
        height: `${currentRect.height}px`
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { generateId } from '@/utils/helpers'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Region {
  id: string
  x: number
  y: number
  width: number
  height: number
}

const props = defineProps<{
  imageUrl: string
  regions: Region[]
}>()

const emit = defineEmits<{
  'add': [region: Region]
  'remove': [id: string]
  'image-loaded': [info: { width: number; height: number }]
}>()

const imageRef = ref<HTMLImageElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentRect = ref<Rect | null>(null)

function onImageLoad() {
  if (!imageRef.value) return
  const { naturalWidth, naturalHeight } = imageRef.value
  emit('image-loaded', { width: naturalWidth, height: naturalHeight })
  
  if (canvasRef.value) {
    canvasRef.value.width = imageRef.value.offsetWidth
    canvasRef.value.height = imageRef.value.offsetHeight
  }
}

function getRelativePos(e: MouseEvent | Touch) {
  const rect = canvasRef.value!.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function startDrawing(e: MouseEvent) {
  if (e.button !== 0) return
  isDrawing.value = true
  startPoint.value = getRelativePos(e)
  currentRect.value = null
}

function draw(e: MouseEvent) {
  if (!isDrawing.value || !startPoint.value) return
  const pos = getRelativePos(e)
  
  const x = Math.min(startPoint.value.x, pos.x)
  const y = Math.min(startPoint.value.y, pos.y)
  const width = Math.abs(pos.x - startPoint.value.x)
  const height = Math.abs(pos.y - startPoint.value.y)
  
  if (width > 5 && height > 5) {
    currentRect.value = { x, y, width, height }
  }
}

function stopDrawing() {
  if (!isDrawing.value || !currentRect.value) {
    isDrawing.value = false
    startPoint.value = null
    currentRect.value = null
    return
  }
  
  const scale = imageRef.value!.naturalWidth / imageRef.value!.offsetWidth
  
  const region = {
    id: generateId(),
    x: Math.round(currentRect.value.x * scale),
    y: Math.round(currentRect.value.y * scale),
    width: Math.round(currentRect.value.width * scale),
    height: Math.round(currentRect.value.height * scale)
  }
  
  emit('add', region)
  
  isDrawing.value = false
  startPoint.value = null
  currentRect.value = null
}

function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  startDrawing(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }))
}

function handleTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  draw(new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }))
}

function handleTouchEnd() {
  stopDrawing()
}
</script>
