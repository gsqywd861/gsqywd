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
      
      <div class="relative">
        <video
          ref="videoRef"
          :src="videoStore.outputUrl || videoStore.videoUrl || ''"
          class="max-w-full h-auto rounded-lg cursor-crosshair"
          controls
          @loadedmetadata="onVideoLoaded"
          @click="addWatermarkRegion"
        ></video>
        
        <div
          v-for="region in videoStore.watermarkRegions"
          :key="region.id"
          class="absolute border-2 border-red-500 bg-red-500/20 group"
          :style="{
            left: `${(region.x / videoWidth) * 100}%`,
            top: `${(region.y / videoHeight) * 100}%`,
            width: `${(region.width / videoWidth) * 100}%`,
            height: `${(region.height / videoHeight) * 100}%`
          }"
        >
          <button
            class="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
            @click="videoStore.removeWatermarkRegion(region.id)"
          >
            ×
          </button>
        </div>
      </div>
      
      <p class="mt-2 text-sm text-gray-500">
        点击视频画面选择水印区域
      </p>
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

const videoStore = useVideoStore()
const taskStore = useTaskStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const videoWidth = ref(1920)
const videoHeight = ref(1080)

const outputSettings = ref({
  resolution: 'original' as 'original' | '1080p' | '720p' | '480p',
  quality: 'high' as 'high' | 'medium' | 'low'
})

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
  } catch (err) {
    videoStore.error = err instanceof Error ? err.message : '处理失败'
    videoStore.progress = 0
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

function addWatermarkRegion(e: MouseEvent) {
  if (!videoRef.value || videoStore.isProcessing) return
  
  const rect = videoRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * videoWidth.value
  const y = ((e.clientY - rect.top) / rect.height) * videoHeight.value
  
  const region = {
    id: Date.now().toString(),
    x: Math.round(x - 50),
    y: Math.round(y - 25),
    width: 100,
    height: 50
  }
  
  videoStore.addWatermarkRegion(region)
}
</script>
