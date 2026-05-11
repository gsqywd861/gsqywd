<template>
  <div ref="containerRef" class="relative select-none bg-gray-100 rounded-lg overflow-hidden">
    <img
      ref="imageRef"
      :src="imageUrl || ''"
      class="max-w-full h-auto block"
      @load="onImageLoad"
    />
    
    <!-- Regions -->
    <div
      v-for="region in regions"
      :key="region.id"
      class="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 group"
      :class="{ 'ring-2 ring-blue-500 ring-offset-1 cursor-grabbing': selectedId === region.id, 'cursor-grab': selectedId !== region.id }"
      :style="{
        left: `${px(region.x)}px`,
        top: `${py(region.y)}px`,
        width: `${pw(region.width)}px`,
        height: `${ph(region.height)}px`
      }"
      @mousedown.stop="onRegionMouseDown($event, region.id)"
    >
      <!-- Resize Handles -->
      <div v-if="selectedId === region.id" class="absolute inset-0">
        <div class="absolute -top-2.5 -left-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize" @mousedown.stop="onResizeMouseDown($event, region.id, 'nw')"></div>
        <div class="absolute -top-2.5 -right-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize" @mousedown.stop="onResizeMouseDown($event, region.id, 'ne')"></div>
        <div class="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize" @mousedown.stop="onResizeMouseDown($event, region.id, 'sw')"></div>
        <div class="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize" @mousedown.stop="onResizeMouseDown($event, region.id, 'se')"></div>
      </div>
      
      <!-- Delete Button -->
      <button
        class="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 z-10 shadow-md"
        @click.stop="emit('remove', region.id)"
      >
        ×
      </button>
    </div>
    
    <!-- Drawing Rect -->
    <div
      v-if="isDrawing && currentRect"
      class="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
      :style="{
        left: `${currentRect.x}px`,
        top: `${currentRect.y}px`,
        width: `${currentRect.width}px`,
        height: `${currentRect.height}px`
      }"
    ></div>
    
    <!-- Hint -->
    <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none select-none">
      拖拽画面选择水印区域
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { generateId } from '@/utils/helpers'

export interface Region {
  id: string
  x: number
  y: number
  width: number
  height: number
}

const props = defineProps<{
  imageUrl: string | undefined
  regions: Region[]
}>()

const emit = defineEmits<{
  'add': [region: Region]
  'remove': [id: string]
  'update': [region: Region]
  'select': [id: string | null]
  'image-loaded': [info: { width: number; height: number }]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

// Scale factors
const sx = ref(1)
const sy = ref(1)
const natW = ref(1)
const natH = ref(1)

// Drawing state
const isDrawing = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentRect = ref<{ x: number; y: number; width: number; height: number } | null>(null)

// Interaction state
type Mode = 'none' | 'draw' | 'drag' | 'resize'
const mode = ref<Mode>('none')
const selectedId = ref<string | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const resizeHandle = ref('')
const resizeStart = ref({ x: 0, y: 0, rx: 0, ry: 0, rw: 0, rh: 0 })

function px(val: number) { return val * sx.value }
function py(val: number) { return val * sy.value }
function pw(val: number) { return val * sx.value }
function ph(val: number) { return val * sy.value }

function onImageLoad() {
  if (!imageRef.value) return
  const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.value
  sx.value = clientWidth / naturalWidth
  sy.value = clientHeight / naturalHeight
  natW.value = naturalWidth
  natH.value = naturalHeight
  emit('image-loaded', { width: naturalWidth, height: naturalHeight })
}

function getContainerPos(e: MouseEvent) {
  const rect = containerRef.value!.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  }
}

// Container mouse down (for drawing new regions)
function onContainerMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  // Only start drawing if we're not clicking on a region
  const target = e.target as HTMLElement
  if (target.closest('[data-region]')) return
  
  mode.value = 'draw'
  isDrawing.value = true
  selectedId.value = null
  emit('select', null)
  startPoint.value = getContainerPos(e)
  currentRect.value = null
}

function onRegionMouseDown(e: MouseEvent, id: string) {
  if (e.button !== 0) return
  selectedId.value = id
  emit('select', id)
  mode.value = 'drag'
  const pos = getContainerPos(e)
  const region = props.regions.find(r => r.id === id)!
  dragOffset.value = { x: pos.x - region.x * sx.value, y: pos.y - region.y * sy.value }
}

function onResizeMouseDown(e: MouseEvent, id: string, handle: string) {
  if (e.button !== 0) return
  selectedId.value = id
  emit('select', id)
  mode.value = 'resize'
  resizeHandle.value = handle
  const pos = getContainerPos(e)
  const region = props.regions.find(r => r.id === id)!
  resizeStart.value = {
    x: pos.x, y: pos.y,
    rx: region.x, ry: region.y,
    rw: region.width, rh: region.height
  }
}

function onMouseMove(e: MouseEvent) {
  if (!containerRef.value) return
  const pos = getContainerPos(e)
  
  if (mode.value === 'draw' && startPoint.value) {
    const x = Math.min(startPoint.value.x, pos.x)
    const y = Math.min(startPoint.value.y, pos.y)
    const width = Math.abs(pos.x - startPoint.value.x)
    const height = Math.abs(pos.y - startPoint.value.y)
    currentRect.value = { x, y, width, height }
  } else if (mode.value === 'drag' && selectedId.value) {
    const region = props.regions.find(r => r.id === selectedId.value)!
    let newX = (pos.x - dragOffset.value.x) / sx.value
    let newY = (pos.y - dragOffset.value.y) / sy.value
    
    // Clamp to image bounds
    newX = Math.max(0, Math.min(newX, natW.value - region.width))
    newY = Math.max(0, Math.min(newY, natH.value - region.height))
    
    emit('update', { ...region, x: Math.round(newX), y: Math.round(newY) })
  } else if (mode.value === 'resize' && selectedId.value) {
    const dx = (pos.x - resizeStart.value.x) / sx.value
    const dy = (pos.y - resizeStart.value.y) / sy.value
    const orig = resizeStart.value
    const region = props.regions.find(r => r.id === selectedId.value)!
    
    let newX = orig.rx, newY = orig.ry, newW = orig.rw, newH = orig.rh
    
    if (resizeHandle.value.includes('e')) newW = orig.rw + dx
    if (resizeHandle.value.includes('w')) { newW = orig.rw - dx; newX = orig.rx + dx }
    if (resizeHandle.value.includes('s')) newH = orig.rh + dy
    if (resizeHandle.value.includes('n')) { newH = orig.rh - dy; newY = orig.ry + dy }
    
    // Minimum size 20px in natural coordinates
    if (newW > 20 && newH > 20) {
      emit('update', { ...region, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) })
    }
  }
}

function onMouseUp() {
  if (mode.value === 'draw' && currentRect.value && currentRect.value.width > 20 && currentRect.value.height > 20) {
    const region = {
      id: generateId(),
      x: Math.round(currentRect.value.x / sx.value),
      y: Math.round(currentRect.value.y / sy.value),
      width: Math.round(currentRect.value.width / sx.value),
      height: Math.round(currentRect.value.height / sy.value)
    }
    emit('add', region)
    selectedId.value = region.id
    emit('select', region.id)
  }
  
  mode.value = 'none'
  isDrawing.value = false
  startPoint.value = null
  currentRect.value = null
}

// Global event listeners for mouse move/up (handles dragging outside container)
onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  if (containerRef.value) {
    containerRef.value.addEventListener('mousedown', onContainerMouseDown)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  if (containerRef.value) {
    containerRef.value.removeEventListener('mousedown', onContainerMouseDown)
  }
})
</script>
