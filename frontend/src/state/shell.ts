import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  initialRuntimeState,
  runtimeReducer,
  type RuntimeAction,
  type RuntimeState,
  type RuntimeTrace,
} from '../runtime/runtime'

/** 整站明暗主题。AppShell 把它写到 `documentElement.dataset.theme`。 */
type Theme = 'dark' | 'light'

type ShellState = {
  /** 当前主题。刷新后保留。 */
  theme: Theme
  /** 右侧运行检查器是否展开。只在当前会话有效。 */
  inspectorOpen: boolean
  /** 命令面板（Ctrl/Cmd+K 或顶栏「搜索与命令」）是否打开。只在当前会话有效。 */
  commandOpen: boolean
  /** 检查器里当前选中的一条运行轨迹。只在当前会话有效。 */
  selectedTrace?: RuntimeTrace
  /** 当前这次 Agent 运行的内存状态（状态、回复文本、轨迹、用量）。刷新后回到 idle，不落盘。 */
  runtime: RuntimeState
  /** 直接指定主题。 */
  setTheme: (theme: Theme) => void
  /** 在 dark / light 之间切换。顶栏太阳/月亮按钮用这个。 */
  toggleTheme: () => void
  /** 打开或关闭右侧运行检查器，不改变当前选中的轨迹。 */
  setInspectorOpen: (open: boolean) => void
  /** 打开或关闭命令面板。 */
  setCommandOpen: (open: boolean) => void
  /** 选中一条轨迹并强制打开检查器。传入 `undefined` 会清空选中，但面板仍然打开。 */
  inspectTrace: (trace?: RuntimeTrace) => void
  /** 把运行事件交给 `runtimeReducer`，就地替换 `runtime`。聊天页和检查器共用这一份状态。 */
  dispatchRuntime: (action: RuntimeAction) => void
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      theme: 'dark',
      inspectorOpen: false,
      commandOpen: false,
      runtime: initialRuntimeState,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      inspectTrace: (selectedTrace) => set({ selectedTrace, inspectorOpen: true }),
      dispatchRuntime: (action) => set((state) => ({ runtime: runtimeReducer(state.runtime, action) })),
    }),
    {
      // 存在 localStorage。只保留外观偏好；面板开关和 runtime 每次启动重新来过。
      name: '1052.v2.shell',
      partialize: (state) => ({
        theme: state.theme,
      }),
    },
  ),
)
