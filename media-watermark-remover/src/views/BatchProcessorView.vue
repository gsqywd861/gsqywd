<template>
  <div class="space-y-6">
    <!-- Upload Section -->
    <FileUploader
      :accept="acceptedFormats"
      :max-size="500 * 1024 * 1024"
      mode="file"
      @file-selected="handleFilesSelected"
    />
    
    <!-- Batch Queue -->
    <div v-if="batchStore.queue.length > 0" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">批量处理队列 ({{ batchStore.queue.length }} 个文件)</h3>
        <div class="flex gap-2">
          <button
            v-if="!batchStore.isProcessing"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            @click="startBatchProcessing"
          >
            开始批量处理
          </button>
          <button
            class="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
            @click="batchStore.clearQueue"
          >
            清空队列
          </button>
        </div>
      </div>
      
      <!-- Queue Items -->
      <div class="space-y-2 max-h-80 overflow-y-auto">
        <div
          v-for="(item, index) in batchStore.queue"
          :key="item.id"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <!-- Status Icon -->
          <div class="w-8 h-8 flex items-center justify-center rounded-full"
            :class="{
              'bg-gray-200': item.status === 'pending',
              'bg-blue-100': item.status === 'processing',
              'bg-green-100': item.status === 'completed',
              'bg-red-100': item.status === 'failed'
            }"
          >
            <svg v-if="item.status === 'pending'" class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <svg v-if="item.status === 'processing'" class="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <svg v-if="item.status === 'completed'" class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            <svg v-if="item.status === 'failed'" class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          
          <!-- File Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ item.file.name }}</p>
            <p class="text-xs text-gray-500">{{ formatFileSize(item.file.size) }}</p>
          </div>
          
          <!-- Progress -->
          <div v-if="item.status === 'processing'" class="w-24">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-blue-500 h-2 rounded-full transition-all" :style="{ width: `${item.progress}%` }"></div>
            </div>
          </div>
          
          <!-- Download Button -->
          <button
            v-if="item.status === 'completed' && item.outputUrl"
            class="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            @click="downloadItem(item)"
          >
            下载
          </button>
          
          <!-- Remove Button -->
          <button
            v-if="item.status === 'pending' || item.status === 'failed'"
            class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500"
            @click="batchStore.removeFromQueue(item.id)"
          >
            ×
          </button>
        </div>
      </div>
      
      <!-- Overall Progress -->
      <div v-if="batchStore.isProcessing" class="mt-4 p-4 bg-gray-50 rounded-lg">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
          <span>总体进度</span>
          <span>{{ batchStore.completedCount }} / {{ batchStore.queue.length }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div class="bg-indigo-600 h-3 rounded-full transition-all" :style="{ width: `${batchStore.overallProgress}%` }"></div>
        </div>
      </div>
      
      <!-- Download All -->
      <button
        v-if="batchStore.completedCount > 0 && !batchStore.isProcessing"
        class="mt-4 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        @click="downloadAllCompleted"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        下载全部已完成的文件 ({{ batchStore.completedCount }})
      </button>
    </div>
    
    <!-- Watermark Regions (shared across batch) -->
    <div v-if="batchStore.queue.length > 0 && !batchStore.isProcessing" class="bg-white rounded-xl shadow-sm border p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">水印区域设置 (应用于所有文件)</h3>
      <WatermarkSelector
        v-if="batchStore.previewUrl"
        :image-url="batchStore.previewUrl"
        :regions="batchStore.watermarkRegions"
        @add="batchStore.addWatermarkRegion"
        @remove="batchStore.removeWatermarkRegion"
        @update="updateRegion"
        @select="selectRegion"
        @image-loaded="handleImageLoaded"
      />
      
      <div v-if="selectedRegionId" class="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
        <h4 class="text-sm font-medium text-gray-900">区域微调</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">X 坐标</label>
            <input v-model.number="fineTune.x" type="range" min="0" :max="batchStore.imageInfo?.width || 1000" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Y 坐标</label>
            <input v-model.number="fineTune.y" type="range" min="0" :max="batchStore.imageInfo?.height || 1000" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">宽度</label>
            <input v-model.number="fineTune.width" type="range" min="10" :max="(batchStore.imageInfo?.width || 1000) - fineTune.x" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">高度</label>
            <input v-model.number="fineTune.height" type="range" min="10" :max="(batchStore.imageInfo?.height || 1000) - fineTune.y" class="w-full" @input="applyFineTune" />
          </div>
        </div>
      </div>
      
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">算法选择</label>
          <select v-model="batchStore.algorithm" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="traditional">传统算法 (OpenCV)</option>
            <option value="ai">AI 智能修复 (WebGPU)</option>
          </select>
        </div>
        <div v-if="batchStore.algorithm === 'traditional'">
          <label class="block text-sm font-medium text-gray-700 mb-2">修复方法</label>
          <select v-model="batchStore.method" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="telea">Telea (快速)</option>
            <option value="ns">Navier-Stokes (精细)</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBatchStore } from '@/stores/batch'
import FileUploader from '@/components/common/FileUploader.vue'
import WatermarkSelector from '@/components/common/WatermarkSelector.vue'
import { loadOpenCV, removeWatermarkTraditional } from '@/services/image-processor'
import { initAIModel, inpaintAI } from '@/services/ai-processor'
import { formatFileSize } from '@/utils/helpers'
import { showToast } from '@/composables/useToast'
import JSZip from 'jszip'

const batchStore = useBatchStore()
const selectedRegionId = ref<string | null>(null)
const fineTune = ref({ x: 0, y: 0, width: 0, height: 0 })
const hasWebGPU = ref(false)

const acceptedFormats = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime'

function selectRegion(id: string | null) {
  selectedRegionId.value = id
  if (id) {
    const region = batchStore.watermarkRegions.find(r => r.id === id)
    if (region) {
      fineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
    }
  }
}

function updateRegion(region: typeof fineTune.value & { id: string }) {
  const idx = batchStore.watermarkRegions.findIndex(r => r.id === region.id)
  if (idx !== -1) {
    batchStore.watermarkRegions[idx] = { ...region }
  }
}

function applyFineTune() {
  if (!selectedRegionId.value) return
  updateRegion({ id: selectedRegionId.value, ...fineTune.value })
}

function handleFilesSelected(files: File[]) {
  files.forEach(file => {
    const url = URL.createObjectURL(file)
    batchStore.addToQueue(file, url)
  })
  
  // Set preview to first image
  if (batchStore.queue.length > 0 && !batchStore.previewUrl) {
    const firstItem = batchStore.queue[0]
    if (firstItem) {
      batchStore.previewUrl = firstItem.url
    }
  }
}

function handleImageLoaded(info: { width: number; height: number }) {
  batchStore.setImageInfo({ width: info.width, height: info.height })
}

async function startBatchProcessing() {
  if (batchStore.queue.length === 0 || batchStore.watermarkRegions.length === 0) return
  
  batchStore.startProcessing()
  
  if (batchStore.algorithm === 'traditional') {
    await loadOpenCV()
  } else if (!hasWebGPU.value) {
    batchStore.algorithm = 'traditional'
  }
  
  for (const item of batchStore.queue) {
    if (item.status !== 'pending') continue
    
    try {
      item.status = 'processing'
      item.progress = 0
      
      const result = await processFile(item)
      item.status = 'completed'
      item.outputBlob = result.blob
      item.outputUrl = result.url
      item.progress = 100
    } catch (err) {
      item.status = 'failed'
      item.error = err instanceof Error ? err.message : '处理失败'
    }
    
    batchStore.updateOverallProgress()
  }
  
  batchStore.finishProcessing()
  showToast(`批量处理完成，成功 ${batchStore.completedCount} 个`, 'success')
}

async function processFile(item: any): Promise<{ blob: Blob; url: string }> {
  const isVideo = item.file.type.startsWith('video/')
  
  if (isVideo) {
    // For video, we'll do a simple canvas-based approach
    // In production, this would use the full video processor
    return processVideoFile(item)
  }
  
  return processImageFile(item)
}

async function processImageFile(item: any): Promise<{ blob: Blob; url: string }> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = item.url
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject })
  
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = imageData.width
  maskCanvas.height = imageData.height
  const maskCtx = maskCanvas.getContext('2d')!
  const maskData = maskCtx.createImageData(imageData.width, imageData.height)
  
  // Scale regions to image dimensions
  const scaleX = imageData.width / (batchStore.imageInfo?.width || imageData.width)
  const scaleY = imageData.height / (batchStore.imageInfo?.height || imageData.height)
  
  for (const region of batchStore.watermarkRegions) {
    const rx = Math.max(0, Math.round(region.x * scaleX))
    const ry = Math.max(0, Math.round(region.y * scaleY))
    const rw = Math.min(Math.round(region.width * scaleX), imageData.width - rx)
    const rh = Math.min(Math.round(region.height * scaleY), imageData.height - ry)
    
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const idx = (y * imageData.width + x) * 4
        maskData.data[idx] = 255
        maskData.data[idx + 1] = 255
        maskData.data[idx + 2] = 255
        maskData.data[idx + 3] = 255
      }
    }
  }
  
  let result: ImageData
  if (batchStore.algorithm === 'ai' && hasWebGPU.value) {
    const aiReady = await initAIModel()
    result = aiReady ? await inpaintAI(imageData, maskData) : await removeWatermarkTraditional(imageData, maskData, batchStore.method)
  } else {
    result = await removeWatermarkTraditional(imageData, maskData, batchStore.method)
  }
  
  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = result.width
  resultCanvas.height = result.height
  resultCanvas.getContext('2d')!.putImageData(result, 0, 0)
  
  const blob = await new Promise<Blob>((resolve) => {
    resultCanvas.toBlob((b) => resolve(b!), 'image/png')
  })
  
  return { blob, url: URL.createObjectURL(blob) }
}

async function processVideoFile(item: any): Promise<{ blob: Blob; url: string }> {
  // Simplified video processing - in production use full video processor
  const video = document.createElement('video')
  video.src = item.url
  video.muted = true
  await new Promise((resolve) => { video.onloadedmetadata = resolve })
  
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  
  const stream = canvas.captureStream(30)
  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  
  await new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve()
    video.onended = () => recorder.stop()
    video.onerror = () => reject(new Error('视频播放错误'))
    
    recorder.start()
    video.play()
    
    function drawFrame() {
      if (video.paused || video.ended) return
      ctx.drawImage(video, 0, 0)
      item.progress = Math.round((video.currentTime / video.duration) * 100)
      requestAnimationFrame(drawFrame)
    }
    drawFrame()
  })
  
  const blob = new Blob(chunks, { type: 'video/webm' })
  return { blob, url: URL.createObjectURL(blob) }
}

function downloadItem(item: any) {
  if (!item.outputUrl) return
  const a = document.createElement('a')
  a.href = item.outputUrl
  a.download = `processed_${item.file.name}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function downloadAllCompleted() {
  const completedItems = batchStore.queue.filter(item => item.status === 'completed' && item.outputBlob)
  if (completedItems.length === 0) return
  
  if (completedItems.length === 1) {
    downloadItem(completedItems[0])
    return
  }
  
  const zip = new JSZip()
  for (const item of completedItems) {
    if (item.outputBlob) {
      zip.file(`processed_${item.file.name}`, item.outputBlob)
    }
  }
  
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `batch_processed_${Date.now()}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  hasWebGPU.value = !!(navigator as any).gpu
})
</script>
