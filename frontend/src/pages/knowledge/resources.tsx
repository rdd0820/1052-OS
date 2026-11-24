import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Archive, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ResourceItem } from '../../contracts/schemas'
import { resourcesApi } from '../../data/api'
import { DataTable } from '../../components/ui/DataTable'
import { AsyncState, Badge, Button, Dialog, Field, Input, Surface, Textarea, uiStyles } from '../../components/ui'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from '../../features/knowledge/knowledge.module.css'

type ResourceForm = { title: string; content: string; note: string; tags: string }
function ResourcesView() {
  const client = useQueryClient()
  const [queryText, setQueryText] = useState('')
  const query = useQuery({ queryKey: ['resources', queryText], queryFn: () => resourcesApi.list(queryText) })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ResourceItem | null>(null)
  const [form, setForm] = useState<ResourceForm>({ title: '', content: '', note: '', tags: '' })
  const refresh = () => void client.invalidateQueries({ queryKey: ['resources'] })
  const save = useMutation({ mutationFn: () => { const body = { ...form, tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean) }; return editing ? resourcesApi.update(editing.id, body) : resourcesApi.create(body) }, onSuccess: () => { setOpen(false); refresh() } })
  const strike = useMutation({ mutationFn: ({ id, struck }: { id: string; struck: boolean }) => resourcesApi.strike(id, struck), onSuccess: refresh })
  const remove = useMutation({ mutationFn: resourcesApi.remove, onSuccess: refresh })
  const edit = (item: ResourceItem) => { setEditing(item); setForm({ title: item.title, content: item.content, note: item.note, tags: item.tags.join(', ') }); setOpen(true) }
  const columns = useMemo<ColumnDef<ResourceItem>[]>(() => [{ accessorKey: 'title', header: '资源', cell: ({ row }) => <div className={styles.primaryResource}><Archive size={15} /><span><strong>{row.original.title}</strong><small>{row.original.note || row.original.content}</small></span></div> }, { accessorKey: 'tags', header: '标签', cell: ({ row }) => <div className={styles.tagLine}>{row.original.tags.slice(0, 3).map((tag) => <Badge key={tag}>{tag}</Badge>)}</div> }, { accessorKey: 'status', header: '状态', cell: ({ getValue }) => <Badge tone={getValue() === 'active' ? 'success' : 'default'}>{getValue() === 'active' ? '使用中' : '已划掉'}</Badge> }, { id: 'actions', header: '', cell: ({ row }) => <div className={uiStyles.rowActions}><Button size="small" onClick={() => edit(row.original)}>编辑</Button><Button size="small" onClick={() => strike.mutate({ id: row.original.id, struck: row.original.status === 'active' })}>{row.original.status === 'active' ? '划掉' : '恢复'}</Button><Button size="small" aria-label={`删除 ${row.original.title}`} variant="danger" onClick={() => remove.mutate(row.original.id)}><Trash2 size={13} /></Button></div> }], [remove, strike])
  return <><Surface title="资源库" action={<div className={pageStyles.toolbarGroup}><Input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="搜索资源" /><Button size="small" variant="primary" onClick={() => { setEditing(null); setForm({ title: '', content: '', note: '', tags: '' }); setOpen(true) }}><Plus size={14} />新建</Button></div>}><AsyncState loading={query.isLoading} error={query.error}><DataTable data={query.data ?? []} columns={columns} /></AsyncState></Surface><Dialog open={open} onOpenChange={setOpen} title={editing ? '编辑资源' : '新建资源'} footer={<Button variant="primary" onClick={() => save.mutate()} disabled={!form.title.trim()}>保存</Button>}><Field label="标题"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="内容或链接"><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field><Field label="备注"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field><Field label="标签"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field></Dialog></>
}

export default function KnowledgeResources() {
  return <SectionPage><ResourcesView /></SectionPage>
}
