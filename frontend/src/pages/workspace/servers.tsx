import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Server as ServerIcon, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AsyncState, Button, Dialog, Field, Input, Select, Surface, Textarea, uiStyles } from '../../components/ui'
import { DataTable } from '../../components/ui/DataTable'
import type { Server } from '../../contracts/schemas'
import { sqlApi } from '../../data/api'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from './workspace.module.css'

export default function WorkspaceServers() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['sql', 'servers'], queryFn: sqlApi.servers })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', host: '', port: '22', user: '', authType: 'password', password: '', privateKey: '', description: '' })
  const create = useMutation({ mutationFn: () => sqlApi.createServer({ ...form, port: Number(form.port) }), onSuccess: () => { setOpen(false); void client.invalidateQueries({ queryKey: ['sql', 'servers'] }) } })
  const remove = useMutation({ mutationFn: sqlApi.deleteServer, onSuccess: () => void client.invalidateQueries({ queryKey: ['sql', 'servers'] }) })
  const test = useMutation({ mutationFn: sqlApi.testServer })
  const columns = useMemo<ColumnDef<Server>[]>(() => [{ accessorKey: 'name', header: '服务器', cell: ({ row }) => <div className={styles.primaryCell}><ServerIcon size={15} /><span><strong>{row.original.name}</strong><small>{row.original.description}</small></span></div> }, { header: '连接', cell: ({ row }) => `${row.original.user}@${row.original.host}:${row.original.port}` }, { accessorKey: 'authType', header: '认证' }, { id: 'actions', header: '', cell: ({ row }) => <div className={uiStyles.rowActions}><Button size="small" onClick={() => test.mutate(row.original.id)}>测试</Button><Button size="small" variant="danger" onClick={() => remove.mutate(row.original.id)}><Trash2 size={13} /></Button></div> }], [remove, test])
  return (
    <SectionPage>
      <Surface title="远程服务器" action={<Button size="small" variant="primary" onClick={() => setOpen(true)}><Plus size={14} />添加服务器</Button>}><AsyncState loading={query.isLoading} error={query.error}><DataTable data={query.data ?? []} columns={columns} /></AsyncState></Surface>
      <Dialog open={open} onOpenChange={setOpen} title="添加服务器" footer={<Button variant="primary" onClick={() => create.mutate()} disabled={!form.name || !form.host}>添加</Button>}><div className={pageStyles.formGrid}><Field label="名称"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="主机"><Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></Field><Field label="端口"><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></Field><Field label="用户"><Input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} /></Field><Field label="认证"><Select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })}><option value="password">密码</option><option value="privateKey">私钥</option></Select></Field><Field label={form.authType === 'password' ? '密码' : '私钥'}>{form.authType === 'password' ? <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /> : <Textarea value={form.privateKey} onChange={(e) => setForm({ ...form, privateKey: e.target.value })} />}</Field></div></Dialog>
    </SectionPage>
  )
}
