import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { AppErrorBoundary } from './app/AppErrorBoundary'
import './styles/base.css'

/**
 * 这是整站数据请求的默认策略。queryClient 是 TanStack Query 的缓存和调度器，在应用启动时创建一次，下面通过 QueryClientProvider 交给所有 useQuery / useMutation。单个请求没有写自己的选项时，就走这里的规则。
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 一次成功取回的数据，15 秒内算「新鲜」。这段时间里，同一个 queryKey 再次挂载不会发请求，直接用缓存。
      staleTime: 15_000,
      /**
       * 如果请求失败，最多重试 2 次。如果错误是 HTTP 4xx 或 5xx，则不重试。
       * @param attempt 重试次数 从0开始
       * @param error 
       * @returns 
       */
      retry: (attempt, error) => {
        // 带 status 且 status >= 400 的错误一次都不重试
        if (error && typeof error === 'object' && 'status' in error && Number((error as { status: unknown }).status) >= 400) return false
        return attempt < 2 // 表示第 0、1 次失败都再试
      },
      refetchOnWindowFocus: false, // 切回这个浏览器标签时，不自动把已过期的查询再拉一遍。库默认是会拉的
    },
    /**
     * 所有写操作默认不重试。创建笔记、保存记忆、审批、删除这类 useMutation，失败就停在这一次。自动重试可能把同一条写入发两遍。查询可以重试，变更不行。
     */
    mutations: { retry: false },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
)
