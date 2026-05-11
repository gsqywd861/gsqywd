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
      
      <div class="relative select-none" @mousedown="startVideoSelection" @mousemove="handleVideoSelection" @mouseup="endVideoSelection">
        <video
          ref="videoRef"
          :src="videoStore.outputUrl || videoStore.videoUrl || ''"
          class="max-w-full h-auto rounded-lg"
          controls
          @loadedmetadata="onVideoLoaded"
        ></video>
        
        <div
          v-for="region in videoStore.watermarkRegions"
          :key="region.id"
          class="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 cursor-move group"
          :class="{ 'ring-2 ring-indigo-500 ring-offset-2': selectedRegionId === region.id }"
          :style="{
            left: `${(region.x / videoWidth) * 100}%`,
            top: `${(region.y / videoHeight) * 100}%`,
            width: `${(region.width / videoWidth) * 100}%`,
            height: `${(region.height / videoHeight) * 100}%`
          }"
          @mousedown.stop="startDragVideo($event, region.id)"
        >
          <div v-if="selectedRegionId === region.id" class="absolute inset-0">
            <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nw-resize" @mousedown.stop="startResizeVideo($event, region.id, 'nw')"></div>
            <div class="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-ne-resize" @mousedown.stop="startResizeVideo($event, region.id, 'ne')"></div>
            <div class="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-sw-resize" @mousedown.stop="startResizeVideo($event, region.id, 'sw')"></div>
            <div class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-se-resize" @mousedown.stop="startResizeVideo($event, region.id, 'se')"></div>
          </div>
          
          <button
            class="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10"
            @click.stop="videoStore.removeWatermarkRegion(region.id)"
          >
            ×
          </button>
        </div>
        
        <div
          v-if="isVideoDrawing && videoCurrentRect"
          class="absolute border-2 border-dashed border-green-500 bg-green-500/10"
          :style="{
            left: `${videoCurrentRect.x}%`,
            top: `${videoCurrentRect.y}%`,
            width: `${videoCurrentRect.width}%`,
            height: `${videoCurrentRect.height}%`
          }"
        ></div>
      </div>
      
      <div v-if="selectedRegionId" class="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
        <h4 class="text-sm font-medium text-gray-900">区域微调</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">X 坐标</label>
            <input v-model.number="videoFineTune.x" type="range" min="0" :max="videoWidth - videoFineTune.width" class="w-full" @input="applyVideoFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Y 坐标</label>
            <input v-model.number="videoFineTune.y" type="range" min="0" :max="videoHeight - videoFineTune.height" class="w-full" @input="applyVideoFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">宽度</label>
            <input v-model.number="videoFineTune.width" type="range" min="10" :max="videoWidth - videoFineTune.x" class="w-full" @input="applyVideoFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">高度</label>
            <input v-model.number="videoFineTune.height" type="range" min="10" :max="videoHeight - videoFineTune.y" class="w-full" @input="applyVideoFineTune" />
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="videoStore.videoUrl" class="bg-white rounded-xl shadow-sm border">
      <div class="p-6 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">输出分辨率</label>
            <select
              v-model="outputSettings.resolution"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="original">原始分辨率</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">输出质量</label>
            <select
              v-model="outputSettings.quality"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="high">高质量</option>
              <option value="medium">中等质量</option>
              <option value="low">低质量</option>
            </select>
          </div>
        </div>
        
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-900">已选择 {{ videoStore.watermarkRegions.length }} 个水印区域</p>
            <p class="text-xs text-gray-500 mt-1">在视频预览上点击可添加区域</p>
          </div>
          <button
            v-if="videoStore.watermarkRegions.length > 0"
            class="text-sm text-red-600 hover:text-red-700"
            @click="videoStore.clearWatermarkRegions"
          >
            清空
          </button>
        </div>
        
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
    
    <div v-if="videoStore.progress > 0 && videoStore.progress < 100" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>处理进度</span>
        <span>{{ Math.round(videoStore.progress) }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div
          class="bg-indigo-600 h-3 rounded-full transition-all duration-300"
          :style="{ width: `${videoStore.progress}%` }"
        ></div>
      </div>
      <p class="mt-2 text-xs text-gray-500">
        视频处理可能需要较长时间，请保持页面打开
      </p>
    </div>
    
    <div v-if="videoStore.error" class="bg-red-50 border border-red-200 rounded-xl p-4">
      <p class="text-sm text-red-600">{{ videoStore.error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVideoStore } from '@/stores/video'
import { useTaskStore } from '@/stores/task'
import FileUploader from '@/components/common/FileUploader.vue'
import { getVideoInfo, processVideo as processVideoService } from '@/services/video-processor'
import { generateId } from '@/utils/helpers'
import { showToast } from '@/composables/useToast'

const videoStore = useVideoStore()
const taskStore = useTaskStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const videoWidth = ref(1920)
const videoHeight = ref(1080)
const selectedRegionId = ref<string | null>(null)
const videoFineTune = ref({ x: 0, y: 0, width: 0, height: 0 })

// Video selection state
const isVideoDrawing = ref(false)
const videoStartPoint = ref<{ x: number; y: number } | null>(null)
const videoCurrentRect = ref<{ x: number; y: number; width: number; height: number } | null>(null)
const videoMode = ref<'none' | 'draw' | 'drag' | 'resize'>('none')
const videoDragOffset = ref({ x: 0, y: 0 })
const videoResizeHandle = ref('')
const videoInitialRect = ref<any>(null)
const videoInitialPoint = ref({ x: 0, y: 0 })

const outputSettings = ref({
  resolution: 'original' as 'original' | '1080p' | '720p' | '480p',
  quality: 'high' as 'high' | 'medium' | 'low'
})

function getVideoRelativePos(e: MouseEvent) {
  const rect = videoRef.value!.getBoundingClientRect()
  return {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100
  }
}

function startVideoSelection(e: MouseEvent) {
  if (e.button !== 0) return
  videoMode.value = 'draw'
  isVideoDrawing.value = true
  videoStartPoint.value = getVideoRelativePos(e)
  videoCurrentRect.value = null
}

function handleVideoSelection(e: MouseEvent) {
  if (videoMode.value === 'draw' && videoStartPoint.value) {
    const pos = getVideoRelativePos(e)
    const x = Math.min(videoStartPoint.value.x, pos.x)
    const y = Math.min(videoStartPoint.value.y, pos.y)
    const width = Math.abs(pos.x - videoStartPoint.value.x)
    const height = Math.abs(pos.y - videoStartPoint.value.y)
    if (width > 1 && height > 1) {
      videoCurrentRect.value = { x, y, width, height }
    }
  } else if (videoMode.value === 'drag' && selectedRegionId.value) {
    const pos = getVideoRelativePos(e)
    const region = videoStore.watermarkRegions.find(r => r.id === selectedRegionId.value)!
    let newX = pos.x - videoDragOffset.value.x
    let newY = pos.y - videoDragOffset.value.y
    newX = Math.max(0, Math.min(newX, 100 - region.width))
    newY = Math.max(0, Math.min(newY, 100 - region.height))
    
    const updated = { ...region, x: (newX / 100) * videoWidth.value, y: (newY / 100) * videoHeight.value }
    const idx = videoStore.watermarkRegions.findIndex(r => r.id === selectedRegionId.value)
    if (idx !== -1) videoStore.watermarkRegions[idx] = updated
    videoFineTune.value = { x: updated.x, y: updated.y, width: updated.width, height: updated.height }
  } else if (videoMode.value === 'resize' && selectedRegionId.value && videoInitialRect.value) {
    const pos = getVideoRelativePos(e)
    const dx = pos.x - videoInitialPoint.value.x
    const dy = pos.y - videoInitialPoint.value.y
    const orig = videoInitialRect.value
    let newX = orig.x, newY = orig.y, newW = orig.width, newH = orig.height
    
    if (videoResizeHandle.value.includes('e')) newW = orig.width + dx
    if (videoResizeHandle.value.includes('w')) { newW = orig.width - dx; newX = orig.x + dx }
    if (videoResizeHandle.value.includes('s')) newH = orig.height + dy
    if (videoResizeHandle.value.includes('n')) { newH = orig.height - dy; newY = orig.y + dy }
    
    if (newW > 2 && newH > 2) {
      const updated = { ...orig, x: newX, y: newY, width: newW, height: newH }
      const region = videoStore.watermarkRegions.find(r => r.id === selectedRegionId.value)!
      const final = { ...region, x: (newX / 100) * videoWidth.value, y: (newY / 100) * videoHeight.value, width: (newW / 100) * videoWidth.value, height: (newH / 100) * videoHeight.value }
      const idx = videoStore.watermarkRegions.findIndex(r => r.id === selectedRegionId.value)
      if (idx !== -1) videoStore.watermarkRegions[idx] = final
      videoFineTune.value = { x: final.x, y: final.y, width: final.width, height: final.height }
    }
  }
}

function endVideoSelection() {
  if (videoMode.value === 'draw' && videoCurrentRect.value) {
    const rect = videoCurrentRect.value
    const region = {
      id: generateId(),
      x: Math.round((rect.x / 100) * videoWidth.value),
      y: Math.round((rect.y / 100) * videoHeight.value),
      width: Math.round((rect.width / 100) * videoWidth.value),
      height: Math.round((rect.height / 100) * videoHeight.value)
    }
    videoStore.addWatermarkRegion(region)
    selectedRegionId.value = region.id
    videoFineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
  }
  videoMode.value = 'none'
  isVideoDrawing.value = false
  videoStartPoint.value = null
  videoCurrentRect.value = null
}

function startDragVideo(e: MouseEvent, id: string) {
  if (e.button !== 0) return
  selectedRegionId.value = id
  videoMode.value = 'drag'
  const pos = getVideoRelativePos(e)
  const region = videoStore.watermarkRegions.find(r => r.id === id)!
  videoDragOffset.value = { x: pos.x - (region.x / videoWidth.value) * 100, y: pos.y - (region.y / videoHeight.value) * 100 }
  videoFineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
}

function startResizeVideo(e: MouseEvent, id: string, handle: string) {
  selectedRegionId.value = id
  videoMode.value = 'resize'
  videoResizeHandle.value = handle
  videoInitialPoint.value = getVideoRelativePos(e)
  const region = videoStore.watermarkRegions.find(r => r.id === id)!
  videoInitialRect.value = { x: (region.x / videoWidth.value) * 100, y: (region.y / videoHeight.value) * 100, width: (region.width / videoWidth.value) * 100, height: (region.height / videoHeight.value) * 100 }
  videoFineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
}

function applyVideoFineTune() {
  if (!selectedRegionId.value) return
  const idx = videoStore.watermarkRegions.findIndex(r => r.id === selectedRegionId.value)
  if (idx !== -1) {
    videoStore.watermarkRegions[idx] = { id: selectedRegionId.value, ...videoFineTune.value }
  }
}

function handleFileSelected(files: File[]) {
  if (files.length === 0) return
  const file = files[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  videoStore.setVideoFile(file, url)
}

async function onVideoLoaded() {
  if (!videoRef.value || !videoStore.videoFile) return
  
  const info = await getVideoInfo(videoStore.videoFile)
  videoStore.setVideoInfo({ ...info, file: videoStore.videoFile })
  videoWidth.value = info.width
  videoHeight.value = info.height
}

async function processVideo() {
  if (!videoStore.videoFile) return
  
  videoStore.isProcessing = true
  videoStore.progress = 0
  videoStore.error = null
  
  try {
    const videoFile = videoStore.videoFile
    const taskId = taskStore.createTask('video-watermark', videoStore.videoFile.name)
    taskStore.updateTaskStatus(taskId, 'processing', 10)
    
    const blob = await processVideoService(
      videoFile,
      {
        watermarkRegions: videoStore.watermarkRegions,
        outputResolution: outputSettings.value.resolution,
        outputQuality: outputSettings.value.quality
      },
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
    
    showToast('视频处理完成！', 'success')
    autoSaveOrNotify(blob, `processed_${videoStore.videoFile!.name}`)
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

async function autoSaveOrNotify(blob: Blob, filename: string) {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Video File',
          accept: { 'video/mp4': ['.mp4'] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      showToast('已保存到本地', 'success')
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('处理完成，请查看下载内容', 'info')
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      showToast('保存失败，请点击下载按钮手动保存', 'error')
    }
  }
}


</script>
