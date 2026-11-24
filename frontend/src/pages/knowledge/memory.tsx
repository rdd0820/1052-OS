import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Check, MemoryStick, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import type { MemoryItem } from '../../contracts/schemas'
import { memoryApi } from '../../data/api'
import { AsyncState, Badge, Button, Dialog, Field, Input, Select, Surface, Textarea } from '../../components/ui'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from '../../features/knowledge/knowledge.module.css'

type MemoryForm = { title: string; content: string; category: string; scope: string; priority: string; tags: string }
const emptyMemory: MemoryForm = { title: '', content: '', category: 'preference', scope: 'global', priority: 'normal', tags: '' }

function MemoryView() {
  const client = useQueryClient()
  const [mode, setMode] = useState<'confirmed' | 'suggestions' | 'secure'>('confirmed')
  const memories = useQuery({ queryKey: ['memory', 'items'], queryFn: () => memoryApi.list() })
  const suggestions = useQuery({ queryKey: ['memory', 'suggestions'], queryFn: () => memoryApi.suggestions() })
  const secure = useQuery({ queryKey: ['memory', 'secure'], queryFn: memoryApi.secure })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MemoryItem | null>(null)
  const [form, setForm] = useState<MemoryForm>(emptyMemory)
  const refresh = () => { void client.invalidateQueries({ queryKey: ['memory'] }) }
  const save = useMutation({ mutationFn: () => editing ? memoryApi.update(editing.id, { ...form, tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean) }) : memoryApi.create({ ...form, tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean) }), onSuccess: () => { setOpen(false); setEditing(null); setForm(emptyMemory); refresh() } })
  const remove = useMutation({ mutationFn: memoryApi.remove, onSuccess: refresh })
  const confirm = useMutation({ mutationFn: memoryApi.confirm, onSuccess: refresh })
  const reject = useMutation({ mutationFn: memoryApi.reject, onSuccess: refresh })
  const edit = (item: MemoryItem) => { setEditing(item); setForm({ title: item.title, content: item.content, category: item.category, scope: item.scope, priority: item.priority, tags: item.tags.join(', ') }); setOpen(true) }
  const rows = mode === 'confirmed' ? memories.data ?? [] : mode === 'suggestions' ? suggestions.data ?? [] : secure.data ?? []
  return <><div className={styles.segmented}><button type="button" className={mode === 'confirmed' ? styles.segmentActive : ''} onClick={() => setMode('confirmed')}>已确认</button><button type="button" className={mode === 'suggestions' ? styles.segmentActive : ''} onClick={() => setMode('suggestions')}>待确认建议</button><button type="button" className={mode === 'secure' ? styles.segmentActive : ''} onClick={() => setMode('secure')}>安全记忆</button><Button size="small" variant="primary" onClick={() => { setEditing(null); setForm(emptyMemory); setOpen(true) }}><Plus size={14} />新建记忆</Button></div><Surface><AsyncState loading={memories.isLoading || suggestions.isLoading || secure.isLoading} error={memories.error || suggestions.error || secure.error} empty={!rows.length}><div className={styles.memoryGrid}>{rows.map((raw) => { const item = raw as MemoryItem & Record<string, unknown>; return <article key={item.id}><header><span className={styles.memoryIcon}>{mode === 'secure' ? <ShieldCheck size={16} /> : <MemoryStick size={16} />}</span><div><strong>{item.title}</strong><small>{String(item.category ?? item.type ?? '')} · {String(item.scope ?? item.mask ?? '')}</small></div>{mode === 'confirmed' ? <Badge tone={item.active ? 'success' : 'default'}>{item.active ? '启用' : '停用'}</Badge> : mode === 'suggestions' ? <Badge tone="warning">建议</Badge> : <Badge>受保护</Badge>}</header><p>{String(item.content ?? item.mask ?? '')}</p><footer>{Array.isArray(item.tags) ? item.tags.slice(0, 4).map((tag) => <Badge key={tag}>{tag}</Badge>) : null}<span />{mode === 'confirmed' ? <><Button size="small" onClick={() => edit(item)}>编辑</Button><Button size="small" variant="danger" onClick={() => remove.mutate(item.id)}><Trash2 size={13} /></Button></> : mode === 'suggestions' ? <><Button size="small" onClick={() => reject.mutate(item.id)}>忽略</Button><Button size="small" variant="primary" onClick={() => confirm.mutate(item.id)}><Check size={13} />确认</Button></> : null}</footer></article> })}</div></AsyncState></Surface><Dialog open={open} onOpenChange={setOpen} title={editing ? '编辑记忆' : '新建记忆'} footer={<Button variant="primary" onClick={() => save.mutate()} disabled={!form.title.trim() || !form.content.trim()}>保存</Button>}><div className={pageStyles.formGrid}><Field label="标题"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="分类"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="preference">偏好</option><option value="hard_rule">硬规则</option><option value="habit">习惯</option><option value="workflow">工作流</option><option value="project_context">项目上下文</option><option value="identity">身份</option></Select></Field><Field label="范围"><Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}><option value="global">全局</option><option value="repository">仓库</option><option value="notes">笔记</option><option value="workspace">工作区</option></Select></Field><Field label="优先级"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="high">高</option><option value="normal">普通</option><option value="low">低</option></Select></Field><Field label="标签（逗号分隔）"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field><Field label="内容"><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field></div></Dialog></>
}

export default function KnowledgeMemory() {
  return <SectionPage><MemoryView /></SectionPage>
}
