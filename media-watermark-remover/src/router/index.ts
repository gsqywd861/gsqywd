import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/video',
      name: 'video-processor',
      component: () => import('../views/VideoProcessorView.vue'),
    },
    {
      path: '/image',
      name: 'image-processor',
      component: () => import('../views/ImageProcessorView.vue'),
    },
    {
      path: '/batch',
      name: 'batch-processor',
      component: () => import('../views/BatchProcessorView.vue'),
    },
    {
      path: '/history',
      name: 'processing-history',
      component: () => import('../views/HistoryView.vue'),
    },
    {
      path: '/user',
      name: 'user-center',
      component: () => import('../views/UserCenterView.vue'),
    },
  ],
})

export default router
