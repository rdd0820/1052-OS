import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Palette, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AsyncState, Badge, Button, Surface, Switch, Textarea } from '../../components/ui'
import type { AppearanceReviewReport, AppearanceThemeProfile } from '../../contracts/schemas'
import { appearanceApi, settingsApi } from '../../data/api'
import { useShellStore } from '../../state/shell'
import { SectionPage } from '../layout'
import styles from '../settings.module.css'

const sampleThemeJson = JSON.stringify({
  schemaVersion: 1,
  name: '本地主题包',
  mode: 'dark',
  scope: 'all',
  safetyLevel: 'safe',
  coreTokens: {
    bg: '#080b0e',
    surface: '#10171b',
    fg: '#eef5f7',
    accent: '#26d9d0',
    success: '#4ade80',
    danger: '#ff6b6b',
  },
  tokens: {},
}, null, 2)

function parseThemeJson(source: string) {
  try {
    return JSON.parse(source)
  } catch {
    throw new Error('主题 JSON 格式无效，请检查括号、逗号和引号')
  }
}

function safetyTone(level?: string): 'default' | 'success' | 'warning' | 'danger' {
  if (level === 'safe') return 'success'
  if (level === 'experimental') return 'warning'
  if (level === 'rejected') return 'danger'
  return 'default'
}

function formatThemeTime(timestamp?: number) {
  return timestamp ? new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(timestamp) : '未知'
}

function AppearanceThemeRegistry() {
  const client = useQueryClient()
  const themes = useQuery({ queryKey: ['appearance', 'themes'], queryFn: appearanceApi.themes })
  const [draft, setDraft] = useState(sampleThemeJson)
  const [review, setReview] = useState<AppearanceReviewReport | null>(null)
  const [selected, setSelected] = useState<AppearanceThemeProfile | null>(null)
  useEffect(() => {
    if (!selected && themes.data?.activeProfile) setSelected(themes.data.activeProfile)
  }, [selected, themes.data?.activeProfile])
  const refreshThemes = (data: unknown) => {
    client.setQueryData(['appearance', 'themes'], data)
    void client.invalidateQueries({ queryKey: ['appearance', 'themes'] })
  }
  const reviewTheme = useMutation({ mutationFn: () => appearanceApi.reviewTheme(parseThemeJson(draft)), onSuccess: setReview })
  const createTheme = useMutation({
    mutationFn: () => appearanceApi.createTheme(parseThemeJson(draft)),
    onSuccess: (profile) => {
      setSelected(profile)
      setReview(profile.review)
      void client.invalidateQueries({ queryKey: ['appearance', 'themes'] })
    },
  })
  const applyTheme = useMutation({ mutationFn: (profile: AppearanceThemeProfile) => appearanceApi.applyTheme(profile.id, profile.review.safetyLevel === 'experimental'), onSuccess: refreshThemes })
  const resetTheme = useMutation({ mutationFn: appearanceApi.resetTheme, onSuccess: refreshThemes })
  const deleteTheme = useMutation({
    mutationFn: (id: string) => appearanceApi.deleteTheme(id),
    onSuccess: (data) => {
      setSelected(null)
      refreshThemes(data)
    },
  })
  const activeId = themes.data?.activeProfileId
  const report = review ?? selected?.review ?? null
  return (
    <Surface
      title="兼容主题包"
      action={<Button size="small" onClick={() => resetTheme.mutate()} disabled={resetTheme.isPending}><RotateCcw size={14} />重置</Button>}
    >
      <div className={styles.themeRegistry}>
        <AsyncState loading={themes.isLoading} error={themes.error} empty={!themes.data?.profiles.length}>
          <div className={styles.themeList}>
            {themes.data?.profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={`${styles.themeRow} ${selected?.id === profile.id ? styles.themeRowSelected : ''}`}
                onClick={() => setSelected(profile)}
              >
                <span><Palette size={15} /><strong>{profile.theme.name}</strong></span>
                <small>{profile.theme.mode} · {profile.theme.scope} · {formatThemeTime(profile.updatedAt)}</small>
                <Badge tone={profile.id === activeId ? 'success' : safetyTone(profile.review.safetyLevel)}>
                  {profile.id === activeId ? '使用中' : profile.review.safetyLevel}
                </Badge>
              </button>
            ))}
          </div>
        </AsyncState>
        <div className={styles.themeEditor}>
          <div className={styles.themeMeta}>
            <span>
              <strong>{selected?.theme.name ?? '新主题包'}</strong>
              <small>用于承接后端主题路由；新版默认视觉仍由设计令牌控制。</small>
            </span>
            {selected ? (
              <div className={styles.formActions}>
                <Button size="small" onClick={() => applyTheme.mutate(selected)} disabled={selected.id === activeId || selected.review.safetyLevel === 'rejected' || applyTheme.isPending}>
                  <Check size={14} />应用
                </Button>
                <Button size="small" variant="danger" onClick={() => deleteTheme.mutate(selected.id)} disabled={selected.source === 'builtin' || deleteTheme.isPending}>
                  <Trash2 size={14} />删除
                </Button>
              </div>
            ) : null}
          </div>
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={10} spellCheck={false} />
          <div className={styles.formActions}>
            <Button onClick={() => reviewTheme.mutate()} disabled={reviewTheme.isPending}>审计 JSON</Button>
            <Button variant="primary" onClick={() => createTheme.mutate()} disabled={createTheme.isPending}>保存主题包</Button>
          </div>
          {reviewTheme.error || createTheme.error ? <p className={styles.warningText}>{(reviewTheme.error || createTheme.error) instanceof Error ? (reviewTheme.error || createTheme.error as Error).message : '主题处理失败'}</p> : null}
          {report ? (
            <div className={styles.reviewPanel}>
              <Badge tone={report.passed ? 'success' : 'danger'}>{report.passed ? '审计通过' : '审计未通过'}</Badge>
              <Badge tone={safetyTone(report.safetyLevel)}>{report.safetyLevel}</Badge>
              {[...report.blockingIssues, ...report.warnings].length ? (
                <div className={styles.issueList}>
                  {[...report.blockingIssues, ...report.warnings].map((issue) => (
                    <p key={`${issue.code}:${issue.path}`}><strong>{issue.path}</strong>{issue.message}；建议：{issue.suggestedFix}</p>
                  ))}
                </div>
              ) : <small>没有阻断问题或警告。</small>}
            </div>
          ) : null}
        </div>
      </div>
    </Surface>
  )
}

export default function AppearanceSettings() {
  const theme = useShellStore((state) => state.theme)
  const setTheme = useShellStore((state) => state.setTheme)
  const client = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => { setReduceMotion(settings.data?.appearance.reduceMotion === true) }, [settings.data])
  const save = useMutation({ mutationFn: () => settingsApi.update({ appearance: { theme, language: 'zh-CN', reduceMotion } }), onSuccess: (data) => client.setQueryData(['settings'], data) })
  return (
    <SectionPage>
    <div className={styles.settingsStack}>
      <Surface title="主题模式">
        <div className={styles.themeGrid}>
          <button type="button" className={theme === 'dark' ? styles.themeActive : ''} onClick={() => setTheme('dark')}><span className={styles.darkPreview}><i /><i /><i /></span><strong>曜石深色</strong><small>1052 OS 默认视觉</small></button>
          <button type="button" className={theme === 'light' ? styles.themeActive : ''} onClick={() => setTheme('light')}><span className={styles.lightPreview}><i /><i /><i /></span><strong>钛白浅色</strong><small>完整高对比浅色界面</small></button>
        </div>
      </Surface>
      <Surface title="动态与可访问性">
        <div className={styles.settingRows}><div><span><strong>减少动态</strong><small>简化界面转场</small></span><Switch label="减少动态" checked={reduceMotion} onCheckedChange={setReduceMotion} /></div></div>
      </Surface>
      <AppearanceThemeRegistry />
      <div className={styles.stickySave}><Button variant="primary" onClick={() => save.mutate()}><Check size={15} />保存外观设置</Button></div>
    </div>
    </SectionPage>
  )
}
