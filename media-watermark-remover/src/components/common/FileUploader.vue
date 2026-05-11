<template>
  <div class="w-full">
    <div
      class="border-2 border-dashed rounded-lg p-6 transition-colors"
      :class="[
        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ]"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
      @click="!disabled && triggerFileInput()"
    >
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p class="mt-4 text-sm text-gray-600">
          <span class="font-medium text-indigo-600">点击上传</span>
          或拖拽文件到此处
        </p>
        <p class="mt-1 text-xs text-gray-500">
          {{ acceptDescription }}
        </p>
        <p v-if="maxSize" class="mt-1 text-xs text-gray-500">
          最大文件大小：{{ formatFileSize(maxSize) }}
        </p>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="accept"
      :multiple="multiple"
      @change="handleFileSelect"
    />

    <div v-if="mode === 'url' || mode === 'both'" class="mt-4">
      <div class="flex gap-2">
        <input
          v-model="urlInput"
          type="url"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="输入图片 URL"
          :disabled="disabled"
          @keyup.enter="handleUrlSubmit"
        />
        <button
          type="button"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="disabled || !urlInput"
          @click="handleUrlSubmit"
        >
          提取
        </button>
      </div>
      <p v-if="urlError" class="mt-2 text-sm text-red-600">{{ urlError }}</p>
    </div>

    <div v-if="showMobileOptions && isMobile" class="mt-4 flex gap-2">
      <button
        v-if="acceptsImages"
        type="button"
        class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        @click="captureImage"
      >
        拍照
      </button>
      <button
        v-if="acceptsVideo"
        type="button"
        class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        @click="captureVideo"
      >
        录制视频
      </button>
    </div>

    <input
      v-if="showMobileOptions && isMobile"
      ref="cameraInput"
      type="file"
      class="hidden"
      accept="image/*"
      capture="environment"
      @change="handleFileSelect"
    />

    <input
      v-if="showMobileOptions && isMobile"
      ref="videoInput"
      type="file"
      class="hidden"
      accept="video/*"
      capture="environment"
      @change="handleFileSelect"
    />

    <div v-if="progress > 0 && progress < 100" class="mt-4">
      <div class="flex justify-between text-sm text-gray-600 mb-1">
        <span>上传中...</span>
        <span>{{ Math.round(progress) }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-indigo-600 h-2 rounded-full transition-all"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>

    <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <p class="text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatFileSize } from '@/utils/helpers'

interface Props {
  accept?: string
  multiple?: boolean
  maxSize?: number
  mode?: 'file' | 'url' | 'both'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  multiple: false,
  maxSize: 0,
  mode: 'file',
  disabled: false,
})

const emit = defineEmits<{
  'file-selected': [files: File[]]
  'url-selected': [url: string]
  'error': [error: string]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const videoInput = ref<HTMLInputElement | null>(null)
const urlInput = ref('')
const urlError = ref('')
const progress = ref(0)
const error = ref('')
const isMobile = ref(false)

const acceptsImages = computed(() => props.accept.includes('image'))
const acceptsVideo = computed(() => props.accept.includes('video'))
const showMobileOptions = computed(() => props.mode === 'file' || props.mode === 'both')

const acceptDescription = computed(() => {
  if (props.accept.includes('video')) {
    return '支持 MP4、MOV 格式'
  }
  if (props.accept.includes('image')) {
    return '支持 JPG、PNG、WebP 格式'
  }
  return '支持所有文件格式'
})

onMounted(() => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

function triggerFileInput() {
  fileInput.value?.click()
}

function handleDragOver() {
  if (!props.disabled) {
    isDragging.value = true
  }
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (props.disabled) return
  
  const files = Array.from(event.dataTransfer?.files || [])
  validateAndEmit(files)
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  validateAndEmit(files)
  input.value = ''
}

function validateAndEmit(files: File[]) {
  if (files.length === 0) return
  
  if (props.maxSize > 0) {
    const oversizedFiles = files.filter(f => f.size > props.maxSize)
    if (oversizedFiles.length > 0) {
      error.value = `文件大小超过限制（${formatFileSize(props.maxSize)}）`
      emit('error', error.value)
      return
    }
  }
  
  error.value = ''
  progress.value = 100
  emit('file-selected', files)
}

async function handleUrlSubmit() {
  if (!urlInput.value || props.disabled) return
  
  urlError.value = ''
  error.value = ''
  
  try {
    const url = new URL(urlInput.value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('仅支持 HTTP 和 HTTPS 协议')
    }
    
    progress.value = 30
    
    const response = await fetch(urlInput.value, { method: 'HEAD' })
    if (!response.ok) {
      throw new Error('无法访问该 URL')
    }
    
    progress.value = 100
    emit('url-selected', urlInput.value)
    urlInput.value = ''
  } catch (err) {
    urlError.value = err instanceof Error ? err.message : 'URL 无效'
    emit('error', urlError.value)
    progress.value = 0
  }
}

function captureImage() {
  cameraInput.value?.click()
}

function captureVideo() {
  videoInput.value?.click()
}
</script>
