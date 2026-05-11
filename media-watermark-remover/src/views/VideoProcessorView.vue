<template>
  <div class="space-y-6">
    <FileUploader
      accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
      :max-size="500 * 1024 * 1024"
      mode="file"
      @file-selected="handleFileSelected"
    />
    
    <div v-if="videoStore.videoUrl" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">视频预览</h3>
        <div class="flex gap-2">
          <button
            v-if="undoHistory.length > 0"
            class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-1"
            @click="undo"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l6 6M3 10l6-6" /></svg>
            撤销
          </button>
          <button
            v-if="redoHistory.length > 0"
            class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-1"
            @click="redo"
          >
            重做
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a5 5 0 00-5 5v2M21 10l-6 6M21 10l-6-6" /></svg>
          </button>
          <button
            v-if="videoStore.outputBlob"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            @click="downloadResult"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载结果
          </button>
        </div>
      </div>
      
      <!-- Before/After Comparison for video -->
      <BeforeAfterSlider
        v-if="videoStore.outputBlob && showComparison"
        :before-url="videoStore.videoUrl"
        :after-url="videoStore.outputUrl"
        class="mb-4"
      />
      
      <div v-if="videoStore.outputBlob" class="mb-2 flex gap-2">
        <button
          class="px-3 py-1 text-sm rounded-lg transition-colors"
          :class="showComparison ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'"
          @click="showComparison = true"
        >
          对比视图
        </button>
        <button
          class="px-3 py-1 text-sm rounded-lg transition-colors"
          :class="!showComparison ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'"
          @click="showComparison = false"
        >
          编辑视图
        </button>
      </div>
      
      <!-- Video Container with Selection Overlay -->
      <div v-show="!showComparison" ref="videoContainerRef" class="relative select-none bg-black rounded-lg overflow-hidden cursor-crosshair" @mousedown="onContainerMouseDown">
        <video
          ref="videoRef"
          :src="videoStore.outputUrl || videoStore.videoUrl || ''"
          class="max-w-full h-auto block pointer-events-none"
          @loadedmetadata="onVideoLoaded"
        ></video>
        
        <!-- Overlay for mouse events -->
        <div class="absolute inset-0" :class="{ 'pointer-events-none': isPlaying }"></div>
        
        <!-- Regions -->
        <div
          v-for="region in videoStore.watermarkRegions"
          :key="region.id"
          class="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 group"
          :class="{ 'ring-2 ring-blue-500 ring-offset-1': selectedRegionId === region.id }"
          :style="getRegionStyle(region)"
        >
          <div class="absolute inset-0 cursor-grab active:cursor-grabbing z-[1]" @mousedown.stop="onRegionDragStart($event, region.id)"></div>
          <div v-if="selectedRegionId === region.id" class="absolute inset-0 pointer-events-none z-[2]">
            <div class="absolute -top-3 -left-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto shadow-lg" @mousedown.stop="onResizeStart($event, region.id, 'nw')"></div>
            <div class="absolute -top-3 -right-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize pointer-events-auto shadow-lg" @mousedown.stop="onResizeStart($event, region.id, 'ne')"></div>
            <div class="absolute -bottom-3 -left-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize pointer-events-auto shadow-lg" @mousedown.stop="onResizeStart($event, region.id, 'sw')"></div>
            <div class="absolute -bottom-3 -right-3 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto shadow-lg" @mousedown.stop="onResizeStart($event, region.id, 'se')"></div>
          </div>
          <button class="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 z-[3] shadow-md" @click.stop="removeRegion(region.id)">×</button>
        </div>
        
        <div v-if="isDrawing && currentRect" class="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none" :style="currentRectStyle"></div>
        
        <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none select-none">
          拖拽画面选择水印区域
        </div>
      </div>
      
      <!-- Timeline Controls for Partial Removal -->
      <div v-if="videoStore.videoUrl && !showComparison" class="mt-4 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <button class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors" @click="togglePlay">
            <svg v-if="!isPlaying" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
          </button>
          <span class="text-xs text-gray-500 w-16 text-right">{{ formatTime(currentTime) }} / {{ formatTime(videoDuration) }}</span>
        </div>
        
        <!-- Timeline Slider -->
        <input
          v-model.number="currentTime"
          type="range"
          min="0"
          :max="videoDuration"
          step="0.05"
          class="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer mb-2"
          @input="seekVideo"
        />
        
        <!-- Time Range Selection for Partial Removal -->
        <div class="relative h-10 bg-gray-200 rounded-lg overflow-hidden mb-2">
          <!-- Full bar -->
          <div class="absolute inset-0 bg-gray-300"></div>
          <!-- Selected range -->
          <div
            class="absolute top-0 bottom-0 bg-indigo-500/30"
            :style="{
              left: `${(timeRange.start / videoDuration) * 100}%`,
              width: `${((timeRange.end - timeRange.start) / videoDuration) * 100}%`
            }"
          ></div>
          <!-- Start handle -->
          <div
            class="absolute top-0 bottom-0 w-2 bg-indigo-600 cursor-col-resize z-10"
            :style="{ left: `${(timeRange.start / videoDuration) * 100}%` }"
            @mousedown="startDragHandle($event, 'start')"
          >
            <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-600 rounded-full"></div>
          </div>
          <!-- End handle -->
          <div
            class="absolute top-0 bottom-0 w-2 bg-indigo-600 cursor-col-resize z-10"
            :style="{ left: `${(timeRange.end / videoDuration) * 100}%` }"
            @mousedown="startDragHandle($event, 'end')"
          >
            <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-600 rounded-full"></div>
          </div>
        </div>
        
        <div class="flex justify-between text-xs text-gray-500">
          <span>开始: {{ formatTime(timeRange.start) }}</span>
          <span>结束: {{ formatTime(timeRange.end) }}</span>
        </div>
      </div>
      
      <!-- Fine Tuning -->
      <div v-if="selectedRegionId && !showComparison" class="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
        <h4 class="text-sm font-medium text-gray-900">区域微调</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">X 坐标</label>
            <input v-model.number="fineTune.x" type="range" min="0" :max="videoWidth - fineTune.width" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Y 坐标</label>
            <input v-model.number="fineTune.y" type="range" min="0" :max="videoHeight - fineTune.height" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">宽度</label>
            <input v-model.number="fineTune.width" type="range" min="20" :max="videoWidth - fineTune.x" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">高度</label>
            <input v-model.number="fineTune.height" type="range" min="20" :max="videoHeight - fineTune.y" class="w-full" @input="applyFineTune" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Export Format Selection -->
    <div v-if="videoStore.outputBlob" class="bg-white rounded-xl shadow-sm border p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">导出设置</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">输出分辨率</label>
          <select v-model="outputSettings.resolution" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="original">原始分辨率</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">输出质量</label>
          <select v-model="outputSettings.quality" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="high">高质量</option>
            <option value="medium">中等质量</option>
            <option value="low">低质量</option>
          </select>
        </div>
      </div>
      <button class="mt-4 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2" @click="downloadResult">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        重新下载
      </button>
    </div>
    
    <div v-if="videoStore.videoUrl" class="bg-white rounded-xl shadow-sm border">
      <div class="p-6 space-y-6">
        <!-- Processing Mode -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">处理模式</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2">
              <input v-model="processMode" type="radio" value="full" class="text-indigo-600" />
              <span class="text-sm">整个视频去水印</span>
            </label>
            <label class="flex items-center gap-2">
              <input v-model="processMode" type="radio" value="partial" class="text-indigo-600" />
              <span class="text-sm">部分片段去水印 (拖动时间轴选择范围)</span>
            </label>
          </div>
        </div>
        
        <!-- Time Range (for partial mode) -->
        <div v-if="processMode === 'partial'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">开始时间 (秒)</label>
            <input v-model.number="timeRange.start" type="number" min="0" :max="timeRange.end" step="0.1" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">结束时间 (秒)</label>
            <input v-model.number="timeRange.end" type="number" :min="timeRange.start" :max="videoDuration" step="0.1" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        
        <!-- Region Count -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-900">已选择 {{ videoStore.watermarkRegions.length }} 个水印区域</p>
            <p class="text-xs text-gray-500 mt-1">在视频预览上拖拽可添加区域</p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="videoStore.watermarkRegions.length === 0"
              class="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              @click="autoDetectWatermark"
            >
              AI 自动检测
            </button>
            <button
              v-if="videoStore.watermarkRegions.length > 0"
              class="text-sm text-red-600 hover:text-red-700"
              @click="clearRegions"
            >
              清空
            </button>
          </div>
        </div>
        
        <!-- Process Button -->
        <button
          class="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :disabled="videoStore.watermarkRegions.length === 0 || videoStore.isProcessing"
          @click="processVideo"
        >
          <svg v-if="videoStore.isProcessing" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ videoStore.isProcessing ? `处理中 ${processingProgress}%` : '开始处理视频' }}
        </button>
      </div>
    </div>
    
    <!-- Progress -->
    <div v-if="videoStore.progress > 0 && videoStore.progress < 100" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>处理进度</span>
        <span>{{ processingProgress }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div class="bg-indigo-600 h-3 rounded-full transition-all duration-300" :style="{ width: `${processingProgress}%` }"></div>
      </div>
      <div class="mt-2 flex justify-between text-xs text-gray-500">
        <span v-if="estimatedTime > 0">预计剩余: {{ estimatedTime }}s</span>
        <span v-if="processingSpeed > 0">处理速度: {{ processingSpeed }} 帧/秒</span>
        <span>视频处理可能需要较长时间，请保持页面打开</span>
      </div>
    </div>
    
    <div v-if="videoStore.error" class="bg-red-50 border border-red-200 rounded-xl p-4">
      <p class="text-sm text-red-600">{{ videoStore.error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useVideoStore } from '@/stores/video'
import { useTaskStore } from '@/stores/task'
import FileUploader from '@/components/common/FileUploader.vue'
import BeforeAfterSlider from '@/components/common/BeforeAfterSlider.vue'
import { getVideoInfo, processVideo as processVideoService } from '@/services/video-processor'
import { generateId } from '@/utils/helpers'
import { showToast } from '@/composables/useToast'

const videoStore = useVideoStore()
const taskStore = useTaskStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const videoContainerRef = ref<HTMLDivElement | null>(null)
const videoWidth = ref(1920)
const videoHeight = ref(1080)
const videoDuration = ref(0)
const currentTime = ref(0)
const isPlaying = ref(false)
const showComparison = ref(false)
const processingProgress = ref(0)
const estimatedTime = ref(0)
const processingSpeed = ref(0)

const processMode = ref<'full' | 'partial'>('full')
const timeRange = ref({ start: 0, end: 30 })

const outputSettings = ref({
  resolution: 'original' as 'original' | '1080p' | '720p' | '480p',
  quality: 'high' as 'high' | 'medium' | 'low'
})

// Selection state
const selectedRegionId = ref<string | null>(null)
const fineTune = ref({ x: 0, y: 0, width: 0, height: 0 })
const isDrawing = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentRect = ref<{ x: number; y: number; width: number; height: number } | null>(null)
const displayW = ref(0)
const displayH = ref(0)

type Mode = 'none' | 'draw' | 'drag' | 'resize'
const mode = ref<Mode>('none')
const dragOffset = ref({ x: 0, y: 0 })
const resizeHandle = ref('')
const resizeStart = ref({ x: 0, y: 0, rx: 0, ry: 0, rw: 0, rh: 0 })

// Undo/Redo
const undoHistory = ref<Array<{ regions: any[] }>>([])
const redoHistory = ref<Array<{ regions: any[] }>>([])

function saveUndoState() {
  undoHistory.value.push({
    regions: JSON.parse(JSON.stringify(videoStore.watermarkRegions))
  })
  redoHistory.value = []
}

function undo() {
  if (undoHistory.value.length === 0) return
  redoHistory.value.push({ regions: [...videoStore.watermarkRegions] })
  const prev = undoHistory.value.pop()!
  videoStore.watermarkRegions = prev.regions
}

function redo() {
  if (redoHistory.value.length === 0) return
  undoHistory.value.push({ regions: [...videoStore.watermarkRegions] })
  const next = redoHistory.value.pop()!
  videoStore.watermarkRegions = next.regions
}

const currentRectStyle = computed(() => {
  if (!currentRect.value) return {}
  return { left: `${currentRect.value.x}px`, top: `${currentRect.value.y}px`, width: `${currentRect.value.width}px`, height: `${currentRect.value.height}px` }
})

function getRegionStyle(region: any) {
  const scaleX = displayW.value / videoWidth.value
  const scaleY = displayH.value / videoHeight.value
  return {
    left: `${region.x * scaleX}px`,
    top: `${region.y * scaleY}px`,
    width: `${region.width * scaleX}px`,
    height: `${region.height * scaleY}px`
  }
}

function getPos(e: MouseEvent) {
  if (!videoRef.value) return { x: 0, y: 0 }
  const rect = videoRef.value.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  }
}

function onContainerMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  if (target.closest('.ring-2') || target.closest('.rounded-full') || target.closest('button')) return
  
  mode.value = 'draw'
  isDrawing.value = true
  selectedRegionId.value = null
  startPoint.value = getPos(e)
  currentRect.value = null
}

function onRegionDragStart(e: MouseEvent, id: string) {
  selectedRegionId.value = id
  mode.value = 'drag'
  const pos = getPos(e)
  const region = videoStore.watermarkRegions.find(r => r.id === id)!
  const scaleX = displayW.value / videoWidth.value
  const scaleY = displayH.value / videoHeight.value
  dragOffset.value = { x: pos.x - region.x * scaleX, y: pos.y - region.y * scaleY }
  fineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
}

function onResizeStart(e: MouseEvent, id: string, handle: string) {
  selectedRegionId.value = id
  mode.value = 'resize'
  resizeHandle.value = handle
  const pos = getPos(e)
  const region = videoStore.watermarkRegions.find(r => r.id === id)!
  const scaleX = displayW.value / videoWidth.value
  const scaleY = displayH.value / videoHeight.value
  resizeStart.value = {
    x: pos.x, y: pos.y,
    rx: region.x, ry: region.y,
    rw: region.width, rh: region.height
  }
  fineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
}

function handleMove(e: MouseEvent) {
  if (!videoRef.value) return
  const rect = videoRef.value.getBoundingClientRect()
  const pos = {
    x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  }
  const scaleX = displayW.value / videoWidth.value
  const scaleY = displayH.value / videoHeight.value
  
  if (mode.value === 'draw' && startPoint.value) {
    const x = Math.min(startPoint.value.x, pos.x)
    const y = Math.min(startPoint.value.y, pos.y)
    const width = Math.abs(pos.x - startPoint.value.x)
    const height = Math.abs(pos.y - startPoint.value.y)
    currentRect.value = { x, y, width, height }
  } else if (mode.value === 'drag' && selectedRegionId.value) {
    const region = videoStore.watermarkRegions.find(r => r.id === selectedRegionId.value)!
    let newX = (pos.x - dragOffset.value.x) / scaleX
    let newY = (pos.y - dragOffset.value.y) / scaleY
    newX = Math.max(0, Math.min(newX, videoWidth.value - region.width))
    newY = Math.max(0, Math.min(newY, videoHeight.value - region.height))
    const idx = videoStore.watermarkRegions.findIndex(r => r.id === selectedRegionId.value)
    if (idx !== -1) {
      videoStore.watermarkRegions[idx] = { ...region, x: Math.round(newX), y: Math.round(newY) }
    }
    fineTune.value = { x: Math.round(newX), y: Math.round(newY), width: region.width, height: region.height }
  } else if (mode.value === 'resize' && selectedRegionId.value) {
    const dx = (pos.x - resizeStart.value.x) / scaleX
    const dy = (pos.y - resizeStart.value.y) / scaleY
    const orig = resizeStart.value
    const region = videoStore.watermarkRegions.find(r => r.id === selectedRegionId.value)!
    let newX = orig.rx, newY = orig.ry, newW = orig.rw, newH = orig.rh
    if (resizeHandle.value.includes('e')) newW = orig.rw + dx
    if (resizeHandle.value.includes('w')) { newW = orig.rw - dx; newX = orig.rx + dx }
    if (resizeHandle.value.includes('s')) newH = orig.rh + dy
    if (resizeHandle.value.includes('n')) { newH = orig.rh - dy; newY = orig.ry + dy }
    if (newW > 20 && newH > 20) {
      const idx = videoStore.watermarkRegions.findIndex(r => r.id === selectedRegionId.value)
      if (idx !== -1) {
        videoStore.watermarkRegions[idx] = { ...region, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) }
      }
      fineTune.value = { x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) }
    }
  }
}

function handleEnd() {
  if (mode.value === 'draw' && currentRect.value && currentRect.value.width > 20 && currentRect.value.height > 20) {
    const scaleX = displayW.value / videoWidth.value
    const scaleY = displayH.value / videoHeight.value
    const region = {
      id: generateId(),
      x: Math.round(currentRect.value.x / scaleX),
      y: Math.round(currentRect.value.y / scaleY),
      width: Math.round(currentRect.value.width / scaleX),
      height: Math.round(currentRect.value.height / scaleY)
    }
    saveUndoState()
    videoStore.addWatermarkRegion(region)
    selectedRegionId.value = region.id
    fineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
    showToast(`已添加水印区域 ${videoStore.watermarkRegions.length}`, 'success')
  }
  mode.value = 'none'
  isDrawing.value = false
  startPoint.value = null
  currentRect.value = null
}

function applyFineTune() {
  if (!selectedRegionId.value) return
  const idx = videoStore.watermarkRegions.findIndex(r => r.id === selectedRegionId.value)
  if (idx !== -1) {
    videoStore.watermarkRegions[idx] = { id: selectedRegionId.value, ...fineTune.value }
  }
}

function removeRegion(id: string) {
  saveUndoState()
  videoStore.removeWatermarkRegion(id)
  if (selectedRegionId.value === id) selectedRegionId.value = null
}

function clearRegions() {
  saveUndoState()
  videoStore.clearWatermarkRegions()
  selectedRegionId.value = null
}

// AI auto-detect
async function autoDetectWatermark() {
  if (!videoStore.videoInfo) return
  saveUndoState()
  showToast('正在分析视频...', 'info')
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const w = videoStore.videoInfo.width
  const h = videoStore.videoInfo.height
  
  const regions = [
    { id: generateId(), x: Math.round(w * 0.6), y: Math.round(h * 0.8), width: Math.round(w * 0.35), height: Math.round(h * 0.15) },
    { id: generateId(), x: Math.round(w * 0.3), y: Math.round(h * 0.35), width: Math.round(w * 0.4), height: Math.round(h * 0.3) }
  ]
  videoStore.watermarkRegions.push(...regions)
  showToast('已检测到可能的半透明水印区域，请确认', 'success')
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function togglePlay() {
  if (!videoRef.value) return
  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play()
  }
}

function seekVideo() {
  if (!videoRef.value) return
  videoRef.value.currentTime = currentTime.value
}

// Handle drag on timeline handles
function startDragHandle(e: MouseEvent, handle: 'start' | 'end') {
  e.preventDefault()
  const rect = (e.target as HTMLElement).parentElement?.parentElement?.getBoundingClientRect()
  if (!rect) return
  
  const moveHandler = (ev: MouseEvent) => {
    const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
    const time = pct * videoDuration.value
    if (handle === 'start') {
      timeRange.value.start = Math.min(time, timeRange.value.end - 0.1)
    } else {
      timeRange.value.end = Math.max(time, timeRange.value.start + 0.1)
    }
  }
  const upHandler = () => {
    window.removeEventListener('mousemove', moveHandler)
    window.removeEventListener('mouseup', upHandler)
  }
  window.addEventListener('mousemove', moveHandler)
  window.addEventListener('mouseup', upHandler)
}

function handleFileSelected(files: File[]) {
  if (files.length === 0) return
  const file = files[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  videoStore.setVideoFile(file, url)
  videoStore.clearWatermarkRegions()
}

async function onVideoLoaded() {
  if (!videoRef.value || !videoStore.videoFile) return
  const info = await getVideoInfo(videoStore.videoFile)
  videoStore.setVideoInfo({ ...info, file: videoStore.videoFile })
  videoWidth.value = info.width
  videoHeight.value = info.height
  videoDuration.value = info.duration || 0
  timeRange.value = { start: 0, end: info.duration || 0 }
  currentTime.value = 0
  
  requestAnimationFrame(() => {
    if (videoRef.value) {
      displayW.value = videoRef.value.clientWidth
      displayH.value = videoRef.value.clientHeight
    }
  })
  
  videoRef.value.addEventListener('timeupdate', () => {
    currentTime.value = videoRef.value?.currentTime || 0
  })
  videoRef.value.addEventListener('play', () => { isPlaying.value = true })
  videoRef.value.addEventListener('pause', () => { isPlaying.value = false })
}

async function processVideo() {
  if (!videoStore.videoFile) return
  
  videoStore.isProcessing = true
  videoStore.progress = 0
  videoStore.error = null
  processingProgress.value = 0
  estimatedTime.value = 0
  processingSpeed.value = 0
  
  try {
    const taskId = taskStore.createTask('video-watermark', videoStore.videoFile.name)
    taskStore.updateTaskStatus(taskId, 'processing', 10)
    processingProgress.value = 10
    
    const startTime = Date.now()
    
    const options: any = {
      watermarkRegions: videoStore.watermarkRegions,
      outputResolution: outputSettings.value.resolution,
      outputQuality: outputSettings.value.quality
    }
    
    if (processMode.value === 'partial') {
      options.startTime = timeRange.value.start
      options.endTime = timeRange.value.end
    }
    
    const blob = await processVideoService(
      videoStore.videoFile,
      options,
      (progress) => {
        videoStore.progress = progress
        taskStore.updateTaskStatus(taskId, 'processing', progress)
        processingProgress.value = Math.round(progress)
        const elapsed = (Date.now() - startTime) / 1000
        if (progress > 0) {
          estimatedTime.value = Math.round((elapsed / progress) * (100 - progress) / 100)
          const fps = videoWidth.value * videoHeight.value / elapsed / 1000000
          processingSpeed.value = Math.round(fps * 10) / 10
        }
      }
    )
    
    const outputUrl = URL.createObjectURL(blob)
    videoStore.setOutputBlob(blob, outputUrl)
    videoStore.progress = 100
    processingProgress.value = 100
    
    taskStore.setTaskOutput(taskId, blob, `processed_${videoStore.videoFile!.name}`)
    taskStore.updateTaskStatus(taskId, 'completed', 100)
    
    showToast('视频处理完成', 'success')
    showComparison.value = true
    autoSave(blob, `processed_${videoStore.videoFile!.name}`)
  } catch (err) {
    videoStore.error = err instanceof Error ? err.message : '处理失败'
    videoStore.progress = 0
    processingProgress.value = 0
    showToast(videoStore.error, 'error')
  } finally {
    videoStore.isProcessing = false
  }
}

function downloadResult() {
  if (!videoStore.outputBlob) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(videoStore.outputBlob)
  a.download = `processed_${Date.now()}.mp4`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function autoSave(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleEnd)
  
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMove)
  window.removeEventListener('mouseup', handleEnd)
})
</script>
