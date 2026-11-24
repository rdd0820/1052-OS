import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileCode2, Plus, Save, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Button, Input, Select } from '../../components/ui'
import type { SqlFile } from '../../contracts/schemas'
import { sqlApi } from '../../data/api'
import { useShellStore } from '../../state/shell'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from './workspace.module.css'

const SqlCodeEditor = lazy(() => import('../../components/editors/SqlCodeEditor'))

function formatDate(timestamp?: number) {
  return timestamp ? new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(timestamp) : '未知'
}

export default function WorkspaceSqlFiles() {
  const client = useQueryClient()
  const theme = useShellStore((state) => state.theme)
  const files = useQuery({ queryKey: ['sql', 'files'], queryFn: sqlApi.files })
  const sources = useQuery({ queryKey: ['sql', 'datasources'], queryFn: sqlApi.dataSources })
  const [selected, setSelected] = useState<SqlFile | null>(null)
  const [draft, setDraft] = useState('')
  const [name, setName] = useState('新查询.sql')
  const [sourceId, setSourceId] = useState('')
  useEffect(() => { if (!selected && files.data?.[0]) { setSelected(files.data[0]); setDraft(files.data[0].content); setName(files.data[0].name); setSourceId(files.data[0].datasourceId) } }, [files.data, selected])
  const select = (file: SqlFile) => { setSelected(file); setDraft(file.content); setName(file.name); setSourceId(file.datasourceId) }
  const save = useMutation({ mutationFn: () => selected ? sqlApi.updateFile(selected.id, { name, datasourceId: sourceId, content: draft }) : sqlApi.createFile({ name, datasourceId: sourceId, content: draft }), onSuccess: (file) => { setSelected(file); void client.invalidateQueries({ queryKey: ['sql', 'files'] }) } })
  const remove = useMutation({ mutationFn: sqlApi.deleteFile, onSuccess: () => { setSelected(null); setDraft(''); void client.invalidateQueries({ queryKey: ['sql', 'files'] }) } })
  return (
    <SectionPage>
      <div className={pageStyles.split}><aside className={pageStyles.splitAside}><div className={pageStyles.toolbar}><strong>SQL 文件</strong><Button size="small" onClick={() => { setSelected(null); setName('新查询.sql'); setDraft(''); setSourceId(sources.data?.[0]?.id ?? '') }}><Plus size={14} />新建</Button></div><div className={pageStyles.list}>{files.data?.map((file) => <button key={file.id} type="button" className={`${pageStyles.listItem} ${selected?.id === file.id ? pageStyles.listItemActive : ''}`} onClick={() => select(file)}><span><strong>{file.name}</strong><small>{formatDate(file.updatedAt)}</small></span><FileCode2 size={15} /></button>)}</div></aside><section className={`${pageStyles.splitMain} ${styles.fileEditor}`}><div className={pageStyles.toolbar}><div className={pageStyles.toolbarGroup}><Input value={name} onChange={(e) => setName(e.target.value)} aria-label="SQL 文件名" /><Select value={sourceId} onChange={(e) => setSourceId(e.target.value)} aria-label="数据源"><option value="">未绑定数据源</option>{sources.data?.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</Select></div><div className={pageStyles.toolbarGroup}>{selected ? <Button size="small" variant="danger" onClick={() => remove.mutate(selected.id)}><Trash2 size={14} /></Button> : null}<Button size="small" variant="primary" onClick={() => save.mutate()} disabled={!name.trim()}><Save size={14} />保存</Button></div></div><Suspense fallback={<div className={pageStyles.loadingPanel}>正在载入 SQL 编辑器</div>}><SqlCodeEditor value={draft} theme={theme} onChange={setDraft} height="100%" /></Suspense></section></div>
    </SectionPage>
  )
}
