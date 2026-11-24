import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, Database, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DataSource } from '../../contracts/schemas'
import { AsyncState, Button, Dialog, Field, Input, Select, Surface, uiStyles } from '../../components/ui'
import { DataTable } from '../../components/ui/DataTable'
import { sqlApi } from '../../data/api'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from './workspace.module.css'

type SourceForm = { name: string; type: 'mysql' | 'oracle' | 'sqlite' | 'hive'; host: string; port: string; user: string; password: string; database: string; filePath: string }
const emptySource: SourceForm = { name: '', type: 'mysql', host: '', port: '3306', user: '', password: '', database: '', filePath: '' }

export default function WorkspaceDataSources() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['sql', 'datasources'], queryFn: sqlApi.dataSources })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SourceForm>(emptySource)
  const create = useMutation({ mutationFn: () => sqlApi.createDataSource({ ...form, port: Number(form.port) || undefined }), onSuccess: () => { setOpen(false); setForm(emptySource); void client.invalidateQueries({ queryKey: ['sql', 'datasources'] }) } })
  const remove = useMutation({ mutationFn: sqlApi.deleteDataSource, onSuccess: () => void client.invalidateQueries({ queryKey: ['sql', 'datasources'] }) })
  const test = useMutation({ mutationFn: sqlApi.testDataSource })
  const columns = useMemo<ColumnDef<DataSource>[]>(() => [
    { accessorKey: 'name', header: '名称', cell: ({ row }) => <div className={styles.primaryCell}><Database size={15} /><span><strong>{row.original.name}</strong><small>{row.original.type}</small></span></div> },
    { header: '连接', cell: ({ row }) => row.original.type === 'sqlite' ? row.original.filePath : `${row.original.host}:${row.original.port}` },
    { accessorKey: 'database', header: '数据库' },
    { id: 'actions', header: '', cell: ({ row }) => <div className={uiStyles.rowActions}><Button size="small" onClick={() => test.mutate(row.original.id)}><CheckCircle2 size={13} />测试</Button><Button size="small" variant="danger" onClick={() => remove.mutate(row.original.id)}><Trash2 size={13} /></Button></div> },
  ], [remove, test])
  return (
    <SectionPage>
      <Surface title="数据源" action={<Button size="small" variant="primary" onClick={() => setOpen(true)}><Plus size={14} />新建数据源</Button>}><AsyncState loading={query.isLoading} error={query.error}><DataTable data={query.data ?? []} columns={columns} /></AsyncState></Surface>
      <Dialog open={open} onOpenChange={setOpen} title="新建数据源" footer={<><Button onClick={() => setOpen(false)}>取消</Button><Button variant="primary" onClick={() => create.mutate()} disabled={!form.name.trim()}>创建</Button></>}><div className={pageStyles.formGrid}><Field label="名称"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="类型"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SourceForm['type'] })}><option value="mysql">MySQL</option><option value="oracle">Oracle</option><option value="sqlite">SQLite</option><option value="hive">Hive</option></Select></Field>{form.type === 'sqlite' ? <Field label="数据库文件"><Input value={form.filePath} onChange={(e) => setForm({ ...form, filePath: e.target.value })} /></Field> : <><Field label="主机"><Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></Field><Field label="端口"><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></Field><Field label="用户"><Input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} /></Field><Field label="密码"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field><Field label="数据库"><Input value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} /></Field></>}</div></Dialog>
    </SectionPage>
  )
}
