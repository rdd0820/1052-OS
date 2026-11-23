import { useQuery } from '@tanstack/react-query'
import { MonitorCog, RefreshCw } from 'lucide-react'
import { AsyncState, Badge, Button, Surface } from '../../components/ui'
import { healthApi } from '../../data/api'
import { useShellStore } from '../../state/shell'
import { SectionPage } from '../layout'
import styles from '../settings.module.css'

export default function GeneralSettings() {
  const theme = useShellStore((state) => state.theme)
  const setTheme = useShellStore((state) => state.setTheme)
  const health = useQuery({ queryKey: ['health'], queryFn: healthApi.status, refetchInterval: 30_000 })
  return (
    <SectionPage>
      <div className={styles.settingsStack}>
        <Surface title="主题模式">
          <div className={styles.themeGrid}>
            <button type="button" className={theme === 'dark' ? styles.themeActive : ''} onClick={() => setTheme('dark')}>
              <span className={styles.darkPreview}><i /><i /><i /></span>
              <strong>曜石深色</strong>
              <small>1052 OS 默认视觉</small>
            </button>
            <button type="button" className={theme === 'light' ? styles.themeActive : ''} onClick={() => setTheme('light')}>
              <span className={styles.lightPreview}><i /><i /><i /></span>
              <strong>钛白浅色</strong>
              <small>完整高对比浅色界面</small>
            </button>
          </div>
        </Surface>
        <Surface title="本地服务健康" action={<Badge tone={health.data?.ok ? 'success' : 'danger'}>{health.data?.ok ? '在线' : '未确认'}</Badge>}>
          <AsyncState loading={health.isLoading} error={health.error}>
            <div className={styles.updateStatus}>
              <MonitorCog size={22} />
              <span>
                <strong>后端 API 已响应</strong>
                <small>最后响应 {health.data?.ts ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(health.data.ts) : '尚未确认'}</small>
              </span>
              <Button onClick={() => void health.refetch()}><RefreshCw size={15} className={health.isFetching ? styles.spin : ''} />刷新</Button>
            </div>
          </AsyncState>
        </Surface>
      </div>
    </SectionPage>
  )
}
