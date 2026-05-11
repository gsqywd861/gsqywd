<template>
  <div class="relative select-none bg-gray-100 rounded-lg overflow-hidden cursor-crosshair" @mousedown="handleContainerMouseDown" @touchstart.prevent="onTouchStart">
    <img
      ref="imageRef"
      :src="imageUrl || ''"
      class="max-w-full h-auto block pointer-events-none"
      @load="onImageLoad"
    />

    <!-- Overlay for drawing (prevents img from blocking mouse events) -->
    <div class="absolute inset-0"></div>

    <!-- Regions -->
    <div
      v-for="region in regions"
      :key="region.id"
      class="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 group"
      :class="{ 'ring-2 ring-blue-500 ring-offset-1': selectedId === region.id }"
      :style="{
        left: `${px(region.x)}px`,
        top: `${py(region.y)}px`,
        width: `${pw(region.width)}px`,
        height: `${ph(region.height)}px`
      }"
    >
      <!-- Invisible hit area for drag -->
      <div
        class="absolute inset-0 cursor-grab active:cursor-grabbing z-[1]"
        @mousedown.stop="onRegionDragStart($event, region.id)"
        @touchstart.stop.prevent="onRegionDragStart($event, region.id)"
      ></div>

      <!-- Resize Handles (visible when selected) -->
      <div v-if="selectedId === region.id" class="absolute inset-0 pointer-events-none z-[2]">
        <div class="absolute -top-3 -left-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto shadow-lg" @mousedown.stop="onResizeStart($event, region.id, 'nw')" @touchstart.stop.prevent="onResizeStart($event, region.id, 'nw')"></div>
        <div class="absolute -top-3 -right-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize pointer-events-auto shadow-lg" @mousedown.stop="onResizeStart($event, region.id, 'ne')" @touchstart.stop.prevent="onResizeStart($event, region.id, 'ne')"></div>
        <div class="absolute -bottom-3 -left-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize pointer-events-auto shadow-lg" @mousedown.stop="onResizeStart($event, region.id, 'sw')" @touchstart.stop.prevent="onResizeStart($event, region.id, 'sw')"></div>
        <div class="absolute -bottom-3 -right-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto shadow-lg" @mousedown.stop="onResizeStart($event, region.id, 'se')" @touchstart.stop.prevent="onResizeStart($event, region.id, 'se')"></div>
      </div>

      <!-- Delete Button -->
      <button
        class="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 z-[3] shadow-md transition-opacity"
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

const SNAP_THRESHOLD = 0.02

function px(val: number) { return val * sx.value }
function py(val: number) { return val * sy.value }
function pw(val: number) { return val * sx.value }
function ph(val: number) { return val * sy.value }

function onImageLoad() {
  if (!imageRef.value) return
  const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.value
  if (clientWidth === 0 || clientHeight === 0) return
  sx.value = clientWidth / naturalWidth
  sy.value = clientHeight / naturalHeight
  natW.value = naturalWidth
  natH.value = naturalHeight
  emit('image-loaded', { width: naturalWidth, height: naturalHeight })
}

function getPos(e: { clientX: number; clientY: number }) {
  if (!imageRef.value) return { x: 0, y: 0 }
  const rect = imageRef.value.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  }
}

function handleContainerMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  if (target.closest('.border-dashed') || target.closest('.rounded-full') || target.closest('button')) return
  
  mode.value = 'draw'
  isDrawing.value = true
  selectedId.value = null
  emit('select', null)
  startPoint.value = getPos(e)
  currentRect.value = null
}

function onRegionDragStart(e: MouseEvent | TouchEvent, id: string) {
  const pos = getPosFromEvent(e)
  selectedId.value = id
  emit('select', id)
  mode.value = 'drag'
  const region = props.regions.find(r => r.id === id)
  if (!region) return
  dragOffset.value = { x: pos.x - region.x * sx.value, y: pos.y - region.y * sy.value }
}

function onResizeStart(e: MouseEvent | TouchEvent, id: string, handle: string) {
  const pos = getPosFromEvent(e)
  selectedId.value = id
  emit('select', id)
  mode.value = 'resize'
  resizeHandle.value = handle
  const region = props.regions.find(r => r.id === id)
  if (!region) return
  resizeStart.value = {
    x: pos.x, y: pos.y,
    rx: region.x, ry: region.y,
    rw: region.width, rh: region.height
  }
}

function getPosFromEvent(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e) {
    const touch = e.touches[0]
    if (touch) return getPos(touch)
  }
  return getPos(e as MouseEvent)
}

function handleMove(e: MouseEvent | TouchEvent) {
  if (!imageRef.value) return
  const pos = getPosFromEvent(e)

  if (mode.value === 'draw' && startPoint.value) {
    const x = Math.min(startPoint.value.x, pos.x)
    const y = Math.min(startPoint.value.y, pos.y)
    const width = Math.abs(pos.x - startPoint.value.x)
    const height = Math.abs(pos.y - startPoint.value.y)
    currentRect.value = { x, y, width, height }
  } else if (mode.value === 'drag' && selectedId.value) {
    const region = props.regions.find(r => r.id === selectedId.value)
    if (!region) return
    let newX = (pos.x - dragOffset.value.x) / sx.value
    let newY = (pos.y - dragOffset.value.y) / sy.value
    newX = Math.max(0, Math.min(newX, natW.value - region.width))
    newY = Math.max(0, Math.min(newY, natH.value - region.height))
    emit('update', { ...region, x: Math.round(newX), y: Math.round(newY) })
  } else if (mode.value === 'resize' && selectedId.value) {
    const dx = (pos.x - resizeStart.value.x) / sx.value
    const dy = (pos.y - resizeStart.value.y) / sy.value
    const orig = resizeStart.value
    const region = props.regions.find(r => r.id === selectedId.value)
    if (!region) return
    let newX = orig.rx, newY = orig.ry, newW = orig.rw, newH = orig.rh
    if (resizeHandle.value.includes('e')) newW = orig.rw + dx
    if (resizeHandle.value.includes('w')) { newW = orig.rw - dx; newX = orig.rx + dx }
    if (resizeHandle.value.includes('s')) newH = orig.rh + dy
    if (resizeHandle.value.includes('n')) { newH = orig.rh - dy; newY = orig.ry + dy }
    if (newW > 20 && newH > 20) {
      emit('update', { ...region, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) })
    }
  }
}

function handleEnd() {
  if (mode.value === 'draw' && currentRect.value && currentRect.value.width > 20 && currentRect.value.height > 20) {
    const region: Region = {
      id: generateId(),
      x: Math.round(currentRect.value.x / sx.value),
      y: Math.round(currentRect.value.y / sy.value),
      width: Math.round(currentRect.value.width / sx.value),
      height: Math.round(currentRect.value.height / sy.value)
    }
    
    // Snap to edges (within 2% of image dimensions)
    const snapped = snapToEdges(region)
    
    emit('add', snapped)
    selectedId.value = snapped.id
    emit('select', snapped.id)
  }
  mode.value = 'none'
  isDrawing.value = false
  startPoint.value = null
  currentRect.value = null
}

function snapToEdges(region: Region): Region {
  const { x, y, width, height } = region
  const w = natW.value
  const h = natH.value
  const thresholdX = w * SNAP_THRESHOLD
  const thresholdY = h * SNAP_THRESHOLD
  
  const snapped: Region = { ...region }
  
  // Snap left edge
  if (x < thresholdX) snapped.x = 0
  // Snap right edge
  if (x + width > w - thresholdX) snapped.x = w - width
  // Snap top edge
  if (y < thresholdY) snapped.y = 0
  // Snap bottom edge
  if (y + height > h - thresholdY) snapped.y = h - height
  // Snap to center
  if (Math.abs(x + width / 2 - w / 2) < thresholdX * 2) snapped.x = Math.round(w / 2 - width / 2)
  if (Math.abs(y + height / 2 - h / 2) < thresholdY * 2) snapped.y = Math.round(h / 2 - height / 2)
  
  return snapped
}

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  mode.value = 'draw'
  isDrawing.value = true
  selectedId.value = null
  emit('select', null)
  startPoint.value = getPos(touch)
  currentRect.value = null
}

onMounted(() => {
  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleEnd)
  window.addEventListener('touchmove', handleMove)
  window.addEventListener('touchend', handleEnd)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMove)
  window.removeEventListener('mouseup', handleEnd)
  window.removeEventListener('touchmove', handleMove)
  window.removeEventListener('touchend', handleEnd)
})
</script>
