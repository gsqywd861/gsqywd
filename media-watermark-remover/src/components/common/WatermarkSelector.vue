<template>
  <div class="relative select-none" @mousedown="startInteraction" @mousemove="handleInteraction" @mouseup="endInteraction" @mouseleave="endInteraction" @touchstart.prevent="handleTouchStart" @touchmove.prevent="handleTouchMove" @touchend.prevent="handleTouchEnd">
    <img
      ref="imageRef"
      :src="imageUrl || ''"
      class="max-w-full h-auto block"
      @load="onImageLoad"
    />
    
    <div
      v-for="region in regions"
      :key="region.id"
      class="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 cursor-move group"
      :class="{ 'ring-2 ring-indigo-500 ring-offset-2': selectedId === region.id }"
      :style="{
        left: `${getScaleX(region.x)}px`,
        top: `${getScaleY(region.y)}px`,
        width: `${region.width * scaleX}px`,
        height: `${region.height * scaleY}px`
      }"
      @mousedown.stop="startDrag($event, region.id)"
    >
      <!-- Resize Handles -->
      <div v-if="selectedId === region.id" class="absolute inset-0">
        <!-- Corners -->
        <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nw-resize" @mousedown.stop="startResize($event, region.id, 'nw')"></div>
        <div class="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-ne-resize" @mousedown.stop="startResize($event, region.id, 'ne')"></div>
        <div class="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-sw-resize" @mousedown.stop="startResize($event, region.id, 'sw')"></div>
        <div class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-se-resize" @mousedown.stop="startResize($event, region.id, 'se')"></div>
      </div>
      
      <button
        class="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10"
        @click.stop="emit('remove', region.id)"
      >
        ×
      </button>
    </div>
    
    <div
      v-if="isDrawing && currentRect"
      class="absolute border-2 border-dashed border-green-500 bg-green-500/10"
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
import { ref, computed } from 'vue'
import { generateId } from '@/utils/helpers'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

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
const isDrawing = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentRect = ref<Rect | null>(null)
const selectedId = ref<string | null>(null)

// Interaction state
type Mode = 'none' | 'draw' | 'drag' | 'resize'
const mode = ref<Mode>('none')
const dragOffset = ref({ x: 0, y: 0 })
const resizeHandle = ref('')
const initialResizeRect = ref<Rect | null>(null)
const initialResizePoint = ref({ x: 0, y: 0 })

const scaleX = ref(1)
const scaleY = ref(1)
const imageDisplayWidth = ref(0)
const imageDisplayHeight = ref(0)

function getScaleX(val: number) { return val * scaleX.value }
function getScaleY(val: number) { return val * scaleY.value }

function onImageLoad() {
  if (!imageRef.value) return
  const { naturalWidth, naturalHeight, offsetWidth, offsetHeight } = imageRef.value
  scaleX.value = offsetWidth / naturalWidth
  scaleY.value = offsetHeight / naturalHeight
  imageDisplayWidth.value = offsetWidth
  imageDisplayHeight.value = offsetHeight
  emit('image-loaded', { width: naturalWidth, height: naturalHeight })
}

function getRelativePos(e: MouseEvent | Touch) {
  const rect = imageRef.value!.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function startDrawing(e: MouseEvent) {
  mode.value = 'draw'
  isDrawing.value = true
  startPoint.value = getRelativePos(e)
  currentRect.value = null
}

function startDrag(e: MouseEvent, id: string) {
  if (e.button !== 0) return
  selectedId.value = id
  emit('select', id)
  mode.value = 'drag'
  const pos = getRelativePos(e)
  const region = props.regions.find(r => r.id === id)!
  dragOffset.value = { x: pos.x - region.x * scaleX.value, y: pos.y - region.y * scaleY.value }
}

function startResize(e: MouseEvent, id: string, handle: string) {
  selectedId.value = id
  emit('select', id)
  mode.value = 'resize'
  resizeHandle.value = handle
  initialResizePoint.value = getRelativePos(e)
  const region = props.regions.find(r => r.id === id)!
  initialResizeRect.value = { ...region }
}

function handleInteraction(e: MouseEvent) {
  const pos = getRelativePos(e)
  if (mode.value === 'draw') {
    if (!startPoint.value) return
    const x = Math.min(startPoint.value.x, pos.x)
    const y = Math.min(startPoint.value.y, pos.y)
    const width = Math.abs(pos.x - startPoint.value.x)
    const height = Math.abs(pos.y - startPoint.value.y)
    if (width > 5 && height > 5) {
      currentRect.value = { x, y, width, height }
    }
  } else if (mode.value === 'drag' && selectedId.value) {
    const region = props.regions.find(r => r.id === selectedId.value)!
    let newX = pos.x - dragOffset.value.x
    let newY = pos.y - dragOffset.value.y
    // Clamp
    newX = Math.max(0, Math.min(newX, imageDisplayWidth.value - region.width * scaleX.value))
    newY = Math.max(0, Math.min(newY, imageDisplayHeight.value - region.height * scaleY.value))
    
    emit('update', { ...region, x: newX / scaleX.value, y: newY / scaleY.value })
  } else if (mode.value === 'resize' && selectedId.value && initialResizeRect.value) {
    const dx = pos.x - initialResizePoint.value.x
    const dy = pos.y - initialResizePoint.value.y
    const orig = initialResizeRect.value
    const region = props.regions.find(r => r.id === selectedId.value)!
    
    let newX = orig.x, newY = orig.y, newW = orig.width, newH = orig.height
    
    if (resizeHandle.value.includes('e')) newW = orig.width + dx / scaleX.value
    if (resizeHandle.value.includes('w')) { newW = orig.width - dx / scaleX.value; newX = orig.x + dx / scaleX.value }
    if (resizeHandle.value.includes('s')) newH = orig.height + dy / scaleY.value
    if (resizeHandle.value.includes('n')) { newH = orig.height - dy / scaleY.value; newY = orig.y + dy / scaleY.value }
    
    // Minimum size
    if (newW > 10 && newH > 10) {
      emit('update', { ...region, x: newX, y: newY, width: newW, height: newH })
    }
  }
}

function endInteraction() {
  if (mode.value === 'draw') {
    if (!isDrawing.value || !currentRect.value) {
      mode.value = 'none'
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
    selectedId.value = region.id
    emit('select', region.id)
  }
  
  mode.value = 'none'
  isDrawing.value = false
  startPoint.value = null
  currentRect.value = null
}

function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  startDrawing(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY, button: 0 }))
}

function handleTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  handleInteraction(new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }))
}

function handleTouchEnd() {
  endInteraction()
}
</script>
