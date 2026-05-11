<template>
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">
      在线媒体水印去除工具
    </h1>
    <p class="text-lg text-gray-600 mb-8">
      支持视频和图片的水印去除、图片压缩和清晰度增强
    </p>
    <div class="flex justify-center space-x-4">
      <RouterLink
        to="/video"
        class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        视频水印去除
      </RouterLink>
      <RouterLink
        to="/image"
        class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        图片处理
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
