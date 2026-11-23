import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, MonitorCog, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { AsyncState, Badge, Button, Field, Input, Surface } from '../../components/ui'
import { agentApi, healthApi, updatesApi } from '../../data/api'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from '../settings.module.css'

export default function SystemSettings() {
  const health = useQuery({ queryKey: ['health'], queryFn: healthApi.status, refetchInterval: 30_000 })
  const status = useQuery({ queryKey: ['updates', 'status'], queryFn: updatesApi.status })
  const client = useQueryClient()
  const check = useMutation({ mutationFn: updatesApi.check, onSuccess: (data) => client.setQueryData(['updates', 'status'], data) })
  const install = useMutation({ mutationFn: () => updatesApi.install(false) })
  const [sourcePath, setSourcePath] = useState('')
  const [migration, setMigration] = useState<Record<string, unknown> | null>(null)
  const preview = useMutation({ mutationFn: () => agentApi.previewMigration(sourcePath), onSuccess: setMigration })
  const run = useMutation({ mutationFn: () => agentApi.runMigration(sourcePath, false), onSuccess: setMigration })
  return (
    <SectionPage>
    <div className={styles.settingsStack}>
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
      <Surface title="系统更新" action={status.data?.updateAvailable ? <Badge tone="warning">有新版本</Badge> : <Badge tone="success">当前已是最新</Badge>}>
        <AsyncState loading={status.isLoading} error={status.error}>
          <div className={styles.updateStatus}>
            <Sparkles size={22} />
            <span><strong>当前版本 {(status.data?.current as { shortCommit?: string } | undefined)?.shortCommit || 'unknown'}</strong><small>安装方式：{status.data?.mode || 'unknown'} · 上次检查 {status.data?.lastCheckedAt || '尚未检查'}</small></span>
            <Button onClick={() => check.mutate()} disabled={check.isPending}><RefreshCw size={15} className={check.isPending ? styles.spin : ''} />检查更新</Button>
            <Button variant="primary" onClick={() => install.mutate()} disabled={!status.data?.updateAvailable || !status.data?.canInstall || install.isPending}><Download size={15} />安装更新</Button>
          </div>
          {status.data?.warnings.length ? <div className={styles.warningList}>{status.data.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
        </AsyncState>
      </Surface>
      <Surface title="历史数据迁移">
        <div className={styles.migrationForm}><Field label="旧版数据目录"><Input value={sourcePath} onChange={(event) => setSourcePath(event.target.value)} placeholder="C:\path\to\old\data" /></Field><Button onClick={() => preview.mutate()} disabled={!sourcePath.trim()}>预览</Button><Button variant="primary" onClick={() => run.mutate()} disabled={!migration || run.isPending}>执行迁移</Button></div>
        {migration ? <pre className={pageStyles.codeBlock}>{JSON.stringify(migration, null, 2)}</pre> : null}
      </Surface>
    </div>
    </SectionPage>
  )
}
