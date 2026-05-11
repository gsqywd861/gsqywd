<template>
  <div class="relative select-none bg-gray-100 rounded-lg overflow-hidden" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" @touchstart.prevent="onTouchStart" @touchmove.prevent="onTouchMove" @touchend.prevent="onTouchEnd">
    <img
      ref="imageRef"
      :src="imageUrl || ''"
      class="max-w-full h-auto block pointer-events-none"
      @load="onImageLoad"
    />
    
    <!-- Existing Regions -->
    <div
      v-for="region in regions"
      :key="region.id"
      class="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 cursor-grab active:cursor-grabbing group"
      :class="{ 'ring-2 ring-blue-500 ring-offset-1': selectedId === region.id }"
      :style="{
        left: `${px(region.x)}px`,
        top: `${py(region.y)}px`,
        width: `${pw(region.width)}px`,
        height: `${ph(region.height)}px`
      }"
      @mousedown.stop="startDrag($event, region.id)"
    >
      <!-- Resize Handles (visible when selected) -->
      <div v-if="selectedId === region.id" class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto" @mousedown.stop="startResize($event, region.id, 'nw')"></div>
        <div class="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize pointer-events-auto" @mousedown.stop="startResize($event, region.id, 'ne')"></div>
        <div class="absolute -bottom-2 -left-2 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize pointer-events-auto" @mousedown.stop="startResize($event, region.id, 'sw')"></div>
        <div class="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto" @mousedown.stop="startResize($event, region.id, 'se')"></div>
      </div>
      
      <button
        class="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10 pointer-events-auto"
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
    <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
      拖拽画面选择水印区域
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
const containerRect = ref({ left: 0, top: 0, width: 0, height: 0 })

// Scale factors
const sx = ref(1)
const sy = ref(1)

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

// Pixel conversion helpers
function px(val: number) { return val * sx.value }
function py(val: number) { return val * sy.value }
function pw(val: number) { return val * sx.value }
function ph(val: number) { return val * sy.value }

function updateContainerRect() {
  if (!imageRef.value) return
  const rect = imageRef.value.getBoundingClientRect()
  containerRect.value = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

function onImageLoad() {
  if (!imageRef.value) return
  const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.value
  sx.value = clientWidth / naturalWidth
  sy.value = clientHeight / naturalHeight
  updateContainerRect()
  emit('image-loaded', { width: naturalWidth, height: naturalHeight })
}

function getPos(e: MouseEvent | Touch) {
  const rect = imageRef.value!.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  mode.value = 'draw'
  isDrawing.value = true
  selectedId.value = null
  emit('select', null)
  startPoint.value = getPos(e)
  currentRect.value = null
}

function startDrag(e: MouseEvent, id: string) {
  if (e.button !== 0) return
  selectedId.value = id
  emit('select', id)
  mode.value = 'drag'
  const pos = getPos(e)
  const region = props.regions.find(r => r.id === id)!
  dragOffset.value = { x: pos.x - region.x * sx.value, y: pos.y - region.y * sy.value }
}

function startResize(e: MouseEvent, id: string, handle: string) {
  selectedId.value = id
  emit('select', id)
  mode.value = 'resize'
  resizeHandle.value = handle
  const pos = getPos(e)
  resizeStart.value = { x: pos.x, y: pos.y, rx: 0, ry: 0, rw: 0, rh: 0 }
  
  const region = props.regions.find(r => r.id === id)!
  resizeStart.value = { x: pos.x, y: pos.y, rx: region.x, ry: region.y, rw: region.width, rh: region.height }
}

function onMouseMove(e: MouseEvent) {
  const pos = getPos(e)
  
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
    newX = Math.max(0, Math.min(newX, imageRef.value!.naturalWidth - region.width))
    newY = Math.max(0, Math.min(newY, imageRef.value!.naturalHeight - region.height))
    
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
    
    if (newW > 20 && newH > 20) {
      emit('update', { ...region, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) })
    }
  }
}

function onMouseUp() {
  if (mode.value === 'draw' && currentRect.value && currentRect.value.width > 10 && currentRect.value.height > 10) {
    const scale = imageRef.value!.naturalWidth / containerRect.value.width
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

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  onMouseDown({ button: 0, clientX: touch.clientX, clientY: touch.clientY } as MouseEvent)
}

function onTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent)
}

function onTouchEnd() {
  onMouseUp()
}
</script>
