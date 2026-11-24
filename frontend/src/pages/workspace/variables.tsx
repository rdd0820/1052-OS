import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AsyncState, Button, Dialog, Field, Input, Select, Surface, Textarea, uiStyles } from '../../components/ui'
import { DataTable } from '../../components/ui/DataTable'
import type { SqlVariable } from '../../contracts/schemas'
import { sqlApi } from '../../data/api'
import { SectionPage } from '../layout'

export default function WorkspaceVariables() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['sql', 'variables'], queryFn: sqlApi.variables })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', valueType: 'static', value: '', datasourceId: '' })
  const create = useMutation({ mutationFn: () => sqlApi.createVariable(form), onSuccess: () => { setOpen(false); setForm({ name: '', valueType: 'static', value: '', datasourceId: '' }); void client.invalidateQueries({ queryKey: ['sql', 'variables'] }) } })
  const remove = useMutation({ mutationFn: sqlApi.deleteVariable, onSuccess: () => void client.invalidateQueries({ queryKey: ['sql', 'variables'] }) })
  const columns = useMemo<ColumnDef<SqlVariable>[]>(() => [{ accessorKey: 'name', header: '变量名', cell: ({ row }) => <code>{`{{${row.original.name}}}`}</code> }, { accessorKey: 'valueType', header: '类型' }, { accessorKey: 'value', header: '值' }, { id: 'actions', header: '', cell: ({ row }) => <div className={uiStyles.rowActions}><Button size="small" variant="danger" onClick={() => remove.mutate(row.original.id)}><Trash2 size={13} /></Button></div> }], [remove])
  return (
    <SectionPage>
      <Surface title="SQL 变量" action={<Button size="small" variant="primary" onClick={() => setOpen(true)}><Plus size={14} />新建变量</Button>}><AsyncState loading={query.isLoading} error={query.error}><DataTable data={query.data ?? []} columns={columns} /></AsyncState></Surface>
      <Dialog open={open} onOpenChange={setOpen} title="新建变量" footer={<Button variant="primary" onClick={() => create.mutate()} disabled={!form.name.trim()}>创建</Button>}><Field label="变量名"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="值类型"><Select value={form.valueType} onChange={(e) => setForm({ ...form, valueType: e.target.value })}><option value="static">静态值</option><option value="sql">SQL 查询</option></Select></Field><Field label="值"><Textarea value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field></Dialog>
    </SectionPage>
  )
}
