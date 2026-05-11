<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-900">处理历史</h2>
      <button
        v-if="historyItems.length > 0"
        class="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
        @click="clearHistory"
      >
        清空历史
      </button>
    </div>
    
    <div v-if="historyItems.length === 0" class="bg-white rounded-xl shadow-sm border p-12 text-center">
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-gray-500">暂无处理历史记录</p>
      <p class="text-sm text-gray-400 mt-2">处理过的文件将显示在这里</p>
    </div>
    
    <div v-else class="grid gap-4">
      <div
        v-for="item in historyItems"
        :key="item.id"
        class="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-4">
          <!-- Type Icon -->
          <div class="w-12 h-12 flex items-center justify-center rounded-lg"
            :class="{
              'bg-blue-100 text-blue-600': item.type === 'video-watermark',
              'bg-green-100 text-green-600': item.type === 'image-watermark',
              'bg-purple-100 text-purple-600': item.type === 'image-compress',
              'bg-orange-100 text-orange-600': item.type === 'image-enhance'
            }"
          >
            <svg v-if="item.type === 'video-watermark'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-medium text-gray-900 truncate">{{ item.inputFileName }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-gray-500">{{ getTypeName(item.type) }}</span>
              <span class="text-xs text-gray-300">|</span>
              <span class="text-xs text-gray-500">{{ formatDate(item.createdAt) }}</span>
              <span v-if="item.completedAt" class="text-xs text-gray-300">|</span>
              <span v-if="item.completedAt" class="text-xs text-gray-500">{{ formatDate(item.completedAt) }}</span>
            </div>
          </div>
          
          <!-- Status -->
          <div class="flex items-center gap-3">
            <span
              class="px-2 py-1 text-xs rounded-full font-medium"
              :class="{
                'bg-yellow-100 text-yellow-700': item.status === 'pending',
                'bg-blue-100 text-blue-700': item.status === 'processing',
                'bg-green-100 text-green-700': item.status === 'completed',
                'bg-red-100 text-red-700': item.status === 'failed'
              }"
            >
              {{ getStatusName(item.status) }}
            </span>
            
            <!-- Download Button -->
            <button
              v-if="item.status === 'completed' && item.outputBlob"
              class="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
              @click="downloadItem(item)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              下载
            </button>
            
            <!-- Delete Button -->
            <button
              class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
              @click="deleteItem(item.id)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div v-if="item.status === 'processing'" class="mt-3">
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>处理中</span>
            <span>{{ Math.round(item.progress) }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-500 h-2 rounded-full transition-all" :style="{ width: `${item.progress}%` }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import type { ProcessingTask } from '@/types'
import { showToast } from '@/composables/useToast'

const taskStore = useTaskStore()
const historyItems = ref<ProcessingTask[]>([])

function getTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    'video-watermark': '视频去水印',
    'image-watermark': '图片去水印',
    'image-compress': '图片压缩',
    'image-enhance': '图片增强'
  }
  return typeNames[type] || type
}

function getStatusName(status: string): string {
  const statusNames: Record<string, string> = {
    'pending': '等待中',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败'
  }
  return statusNames[status] || status
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function downloadItem(item: ProcessingTask) {
  if (!item.outputBlob) return
  const url = URL.createObjectURL(item.outputBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = item.outputFileName || `processed_${Date.now()}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function deleteItem(id: string) {
  taskStore.deleteTask(id)
  historyItems.value = historyItems.value.filter(item => item.id !== id)
  showToast('已删除历史记录', 'info')
}

function clearHistory() {
  taskStore.clearAllTasks()
  historyItems.value = []
  showToast('已清空历史记录', 'info')
}

onMounted(() => {
  historyItems.value = [...taskStore.tasks].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})
</script>
