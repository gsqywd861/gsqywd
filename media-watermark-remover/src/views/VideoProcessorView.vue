<template>
  <div class="space-y-6">
    <FileUploader
      accept="video/mp4,video/quicktime"
      :max-size="500 * 1024 * 1024"
      mode="file"
      @file-selected="handleFileSelected"
    />
    
    <div v-if="videoStore.videoUrl" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">视频预览</h3>
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
      
      <!-- Video Container with Selection Overlay -->
      <div ref="videoContainerRef" class="relative select-none bg-black rounded-lg overflow-hidden" @mousedown="onContainerMouseDown">
        <video
          ref="videoRef"
          :src="videoStore.outputUrl || videoStore.videoUrl || ''"
          class="max-w-full h-auto block"
          controls
          @loadedmetadata="onVideoLoaded"
        ></video>
        
        <!-- Selection Overlay (transparent layer for drawing) -->
        <div class="absolute inset-0 cursor-crosshair" :class="{ 'pointer-events-none': isPlaying }"></div>
        
        <!-- Regions -->
        <div
          v-for="region in videoStore.watermarkRegions"
          :key="region.id"
          class="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 group"
          :class="{ 'ring-2 ring-blue-500 ring-offset-1 cursor-grabbing': selectedRegionId === region.id, 'cursor-grab': selectedRegion !== region.id }"
          :style="getRegionStyle(region)"
          @mousedown.stop="onRegionMouseDown($event, region.id)"
        >
          <!-- Resize Handles -->
          <div v-if="selectedRegionId === region.id" class="absolute inset-0">
            <div class="absolute -top-2.5 -left-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize" @mousedown.stop="onResizeMouseDown($event, region.id, 'nw')"></div>
            <div class="absolute -top-2.5 -right-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize" @mousedown.stop="onResizeMouseDown($event, region.id, 'ne')"></div>
            <div class="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize" @mousedown.stop="onResizeMouseDown($event, region.id, 'sw')"></div>
            <div class="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize" @mousedown.stop="onResizeMouseDown($event, region.id, 'se')"></div>
          </div>
          
          <!-- Delete Button -->
          <button
            class="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 z-10 shadow-md"
            @click.stop="removeRegion(region.id)"
          >
            ×
          </button>
        </div>
        
        <!-- Drawing Rect -->
        <div
          v-if="isDrawing && currentRect"
          class="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
          :style="currentRectStyle"
        ></div>
        
        <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none select-none">
          拖拽画面选择水印区域
        </div>
      </div>
      
      <!-- Fine Tuning -->
      <div v-if="selectedRegionId" class="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
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
              <span class="text-sm">部分片段去水印</span>
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
        
        <!-- Output Settings -->
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
        
        <!-- Region Count -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-900">已选择 {{ videoStore.watermarkRegions.length }} 个水印区域</p>
            <p class="text-xs text-gray-500 mt-1">在视频预览上拖拽可添加区域</p>
          </div>
          <button
            v-if="videoStore.watermarkRegions.length > 0"
            class="text-sm text-red-600 hover:text-red-700"
            @click="clearRegions"
          >
            清空
          </button>
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
          {{ videoStore.isProcessing ? '处理中...' : '开始处理视频' }}
        </button>
      </div>
    </div>
    
    <!-- Progress -->
    <div v-if="videoStore.progress > 0 && videoStore.progress < 100" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>处理进度</span>
        <span>{{ Math.round(videoStore.progress) }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div class="bg-indigo-600 h-3 rounded-full transition-all duration-300" :style="{ width: `${videoStore.progress}%` }"></div>
      </div>
      <p class="mt-2 text-xs text-gray-500">视频处理可能需要较长时间，请保持页面打开</p>
    </div>
    
    <!-- Error -->
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
const isPlaying = ref(false)

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

// Interaction state
type Mode = 'none' | 'draw' | 'drag' | 'resize'
const mode = ref<Mode>('none')
const dragOffset = ref({ x: 0, y: 0 })
const resizeHandle = ref('')
const resizeStart = ref({ x: 0, y: 0, rx: 0, ry: 0, rw: 0, rh: 0 })

const currentRectStyle = computed(() => {
  if (!currentRect.value) return {}
  return {
    left: `${currentRect.value.x}px`,
    top: `${currentRect.value.y}px`,
    width: `${currentRect.value.width}px`,
    height: `${currentRect.value.height}px`
  }
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

function getContainerPos(e: MouseEvent) {
  const rect = videoContainerRef.value!.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  }
}

function onContainerMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  if (target.closest('[data-region]') || target.tagName === 'VIDEO') return
  
  mode.value = 'draw'
  isDrawing.value = true
  selectedRegionId.value = null
  startPoint.value = getContainerPos(e)
  currentRect.value = null
}

function onRegionMouseDown(e: MouseEvent, id: string) {
  if (e.button !== 0) return
  selectedRegionId.value = id
  mode.value = 'drag'
  const pos = getContainerPos(e)
  const region = videoStore.watermarkRegions.find(r => r.id === id)!
  const scaleX = displayW.value / videoWidth.value
  const scaleY = displayH.value / videoHeight.value
  dragOffset.value = { x: pos.x - region.x * scaleX, y: pos.y - region.y * scaleY }
  fineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
}

function onResizeMouseDown(e: MouseEvent, id: string, handle: string) {
  if (e.button !== 0) return
  selectedRegionId.value = id
  mode.value = 'resize'
  resizeHandle.value = handle
  const pos = getContainerPos(e)
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

function onMouseMove(e: MouseEvent) {
  if (!videoContainerRef.value) return
  const pos = getContainerPos(e)
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

function onMouseUp() {
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
  videoStore.removeWatermarkRegion(id)
  if (selectedRegionId.value === id) {
    selectedRegionId.value = null
  }
}

function clearRegions() {
  videoStore.clearWatermarkRegions()
  selectedRegionId.value = null
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
  
  // Get actual display size
  requestAnimationFrame(() => {
    if (videoRef.value) {
      displayW.value = videoRef.value.clientWidth
      displayH.value = videoRef.value.clientHeight
    }
  })
}

async function processVideo() {
  if (!videoStore.videoFile) return
  
  videoStore.isProcessing = true
  videoStore.progress = 0
  videoStore.error = null
  
  try {
    const taskId = taskStore.createTask('video-watermark', videoStore.videoFile.name)
    taskStore.updateTaskStatus(taskId, 'processing', 10)
    
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
      }
    )
    
    const outputUrl = URL.createObjectURL(blob)
    videoStore.setOutputBlob(blob, outputUrl)
    videoStore.progress = 100
    
    taskStore.setTaskOutput(taskId, blob, `processed_${videoStore.videoFile!.name}`)
    taskStore.updateTaskStatus(taskId, 'completed', 100)
    
    showToast('视频处理完成，已自动保存', 'success')
    autoSave(blob, `processed_${videoStore.videoFile!.name}`)
  } catch (err) {
    videoStore.error = err instanceof Error ? err.message : '处理失败'
    videoStore.progress = 0
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
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>
