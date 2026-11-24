import { useMutation, useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { LoaderCircle, Play } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AsyncState, Badge, Button, Select } from '../../components/ui'
import { DataTable } from '../../components/ui/DataTable'
import { sqlApi } from '../../data/api'
import { useShellStore } from '../../state/shell'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from './workspace.module.css'

const SqlCodeEditor = lazy(() => import('../../components/editors/SqlCodeEditor'))

export default function WorkspaceSql() {
  const theme = useShellStore((state) => state.theme)
  const sources = useQuery({ queryKey: ['sql', 'datasources'], queryFn: sqlApi.dataSources })
  const files = useQuery({ queryKey: ['sql', 'files'], queryFn: sqlApi.files })
  const [datasourceId, setDatasourceId] = useState('')
  const [sql, setSql] = useState('select 1 as ready;')
  useEffect(() => { if (!datasourceId && sources.data?.[0]) setDatasourceId(sources.data[0].id) }, [datasourceId, sources.data])
  const execute = useMutation({ mutationFn: () => sqlApi.query(datasourceId, sql) })
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => (execute.data?.columns ?? []).map((column) => ({ accessorKey: column, header: column, cell: ({ getValue }) => String(getValue() ?? '') })), [execute.data?.columns])
  return (
    <SectionPage>
      <div className={styles.workbench}>
        <div className={styles.workbenchToolbar}>
          <div><Select value={datasourceId} onChange={(event) => setDatasourceId(event.target.value)} aria-label="选择数据源"><option value="">选择数据源</option>{sources.data?.map((source) => <option key={source.id} value={source.id}>{source.name} · {source.type}</option>)}</Select><Select value="" onChange={(event) => { const file = files.data?.find((item) => item.id === event.target.value); if (file) { setSql(file.content); setDatasourceId(file.datasourceId) } }} aria-label="载入 SQL 文件"><option value="">载入 SQL 文件</option>{files.data?.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}</Select></div>
          <Button variant="primary" onClick={() => execute.mutate()} disabled={!datasourceId || !sql.trim() || execute.isPending}>{execute.isPending ? <LoaderCircle size={15} className={styles.spin} /> : <Play size={15} />}运行查询</Button>
        </div>
        <div className={styles.editorPane}><Suspense fallback={<div className={pageStyles.loadingPanel}>正在载入 SQL 编辑器</div>}><SqlCodeEditor value={sql} height="100%" theme={theme} onChange={setSql} basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }} /></Suspense></div>
        <section className={styles.resultPane}>
          <header><strong>查询结果</strong>{execute.data ? <Badge tone="success">{execute.data.rowCount} 行{execute.data.truncated ? ' · 已截断' : ''}</Badge> : null}</header>
          <AsyncState loading={execute.isPending} error={execute.error} empty={!execute.data}>
            <DataTable data={execute.data?.rows ?? []} columns={columns} empty="查询成功，没有返回数据" />
          </AsyncState>
        </section>
      </div>
    </SectionPage>
  )
}
