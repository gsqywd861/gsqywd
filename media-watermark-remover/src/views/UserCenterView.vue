<template>
  <div class="space-y-8">
    <div v-if="!userStore.isAuthenticated" class="bg-white rounded-xl shadow-sm border p-8 max-w-md mx-auto">
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900">登录 / 注册</h2>
        <p class="mt-2 text-gray-600">登录后可保存处理历史记录</p>
      </div>
      
      <div v-if="!showRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            v-model="email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input
            v-model="password"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入密码"
          />
        </div>
        <button
          class="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          @click="handleLogin"
        >
          登录
        </button>
        <p class="text-center text-sm text-gray-600">
          还没有账号？
          <button class="text-indigo-600 hover:text-indigo-700" @click="showRegister = true">
            立即注册
          </button>
        </p>
      </div>
      
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            v-model="email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input
            v-model="password"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="至少 6 位密码"
          />
        </div>
        <button
          class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          @click="handleRegister"
        >
          注册
        </button>
        <p class="text-center text-sm text-gray-600">
          已有账号？
          <button class="text-indigo-600 hover:text-indigo-700" @click="showRegister = false">
            立即登录
          </button>
        </p>
      </div>
      
      <div v-if="userStore.error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-600">{{ userStore.error }}</p>
      </div>
    </div>
    
    <div v-else class="space-y-6">
      <div class="bg-white rounded-xl shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ userStore.user?.email }}</h3>
              <p class="text-sm text-gray-500">已登录</p>
            </div>
          </div>
          <button
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            @click="handleLogout"
          >
            退出登录
          </button>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">处理历史</h3>
        
        <div v-if="taskStore.tasks.length === 0" class="text-center py-8">
          <svg class="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-2 text-gray-500">暂无处理记录</p>
        </div>
        
        <div v-else class="space-y-3">
          <div
            v-for="task in taskStore.tasks"
            :key="task.id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ task.inputFileName }}</p>
              <p class="text-xs text-gray-500 mt-1">
                {{ getTaskTypeName(task.type) }} - {{ formatDate(task.createdAt) }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="getStatusClass(task.status)"
              >
                {{ getStatusText(task.status) }}
              </span>
              <button
                v-if="task.status === 'completed' && task.outputBlob"
                class="text-indigo-600 hover:text-indigo-700"
                @click="downloadTask(task)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useTaskStore } from '@/stores/task'
import type { ProcessingTask } from '@/types'

const userStore = useUserStore()
const taskStore = useTaskStore()

const showRegister = ref(false)
const email = ref('')
const password = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    userStore.setError('请填写邮箱和密码')
    return
  }
  
  userStore.isLoading = true
  userStore.setError(null)
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    userStore.setUser({
      id: 'demo-user',
      email: email.value,
      createdAt: new Date(),
      settings: userStore.defaultSettings
    })
  } catch (err) {
    userStore.setError('登录失败，请重试')
  } finally {
    userStore.isLoading = false
  }
}

async function handleRegister() {
  if (!email.value || !password.value) {
    userStore.setError('请填写邮箱和密码')
    return
  }
  
  if (password.value.length < 6) {
    userStore.setError('密码至少 6 位')
    return
  }
  
  userStore.isLoading = true
  userStore.setError(null)
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    userStore.setUser({
      id: 'demo-user',
      email: email.value,
      createdAt: new Date(),
      settings: userStore.defaultSettings
    })
  } catch (err) {
    userStore.setError('注册失败，请重试')
  } finally {
    userStore.isLoading = false
  }
}

function handleLogout() {
  userStore.clearUser()
}

function getTaskTypeName(type: ProcessingTask['type']): string {
  const names: Record<ProcessingTask['type'], string> = {
    'video-watermark': '视频去水印',
    'image-watermark': '图片去水印',
    'image-compress': '图片压缩',
    'image-enhance': '图片增强'
  }
  return names[type]
}

function getStatusClass(status: ProcessingTask['status']): string {
  const classes: Record<ProcessingTask['status'], string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800'
  }
  return classes[status]
}

function getStatusText(status: ProcessingTask['status']): string {
  const texts: Record<ProcessingTask['status'], string> = {
    'pending': '等待中',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败'
  }
  return texts[status]
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('zh-CN')
}

function downloadTask(task: ProcessingTask) {
  if (!task.outputBlob) return
  
  const a = document.createElement('a')
  a.href = URL.createObjectURL(task.outputBlob)
  a.download = task.outputFileName || 'processed'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>
