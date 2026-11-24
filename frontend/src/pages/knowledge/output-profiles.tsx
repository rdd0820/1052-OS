import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { BrainCircuit, Plus, Save, Trash2 } from 'lucide-react'
import type { OutputProfile } from '../../contracts/schemas'
import { outputProfilesApi } from '../../data/api'
import { Badge, Button, Field, Input, Select, Switch, Textarea } from '../../components/ui'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from '../../features/knowledge/knowledge.module.css'

type ProfileForm = { title: string; description: string; priority: 'high' | 'normal' | 'low'; instructions: string; tags: string; active: boolean }
function OutputProfilesView() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['output-profiles'], queryFn: () => outputProfilesApi.list() })
  const [selected, setSelected] = useState<OutputProfile | null>(null)
  const [form, setForm] = useState<ProfileForm>({ title: '', description: '', priority: 'normal', instructions: '', tags: '', active: true })
  useEffect(() => { if (!selected && query.data?.[0]) { const item = query.data[0]; setSelected(item); setForm({ title: item.title, description: item.description, priority: item.priority, instructions: item.instructions, tags: item.tags.join(', '), active: item.active }) } }, [query.data, selected])
  const choose = (item: OutputProfile) => { setSelected(item); setForm({ title: item.title, description: item.description, priority: item.priority, instructions: item.instructions, tags: item.tags.join(', '), active: item.active }) }
  const save = useMutation({ mutationFn: () => { const body = { ...form, tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean) }; return selected ? outputProfilesApi.update(selected.id, body) : outputProfilesApi.create(body) }, onSuccess: (item) => { setSelected(item); void client.invalidateQueries({ queryKey: ['output-profiles'] }) } })
  const remove = useMutation({ mutationFn: outputProfilesApi.remove, onSuccess: () => { setSelected(null); void client.invalidateQueries({ queryKey: ['output-profiles'] }) } })
  return <div className={pageStyles.split}><aside className={pageStyles.splitAside}><div className={pageStyles.toolbar}><strong>输出配置</strong><Button size="small" onClick={() => { setSelected(null); setForm({ title: '', description: '', priority: 'normal', instructions: '', tags: '', active: true }) }}><Plus size={14} />新建</Button></div><div className={pageStyles.list}>{query.data?.map((item) => <button key={item.id} type="button" className={`${pageStyles.listItem} ${selected?.id === item.id ? pageStyles.listItemActive : ''}`} onClick={() => choose(item)}><span><strong>{item.title}</strong><small>{item.description}</small></span><Badge tone={item.active ? 'success' : 'default'}>{item.active ? '启用' : '停用'}</Badge></button>)}</div></aside><section className={pageStyles.splitMain}><div className={pageStyles.detail}><div className={styles.profileHeading}><span><BrainCircuit size={19} /></span><div><h2>{form.title || '新输出配置'}</h2><p>定义 Agent 在特定场景中的表达方式和约束。</p></div></div><div className={pageStyles.formGrid}><Field label="名称"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="优先级"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ProfileForm['priority'] })}><option value="high">高</option><option value="normal">普通</option><option value="low">低</option></Select></Field><Field label="说明"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="标签"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field><Field label="输出指令"><Textarea className={styles.instructions} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field><div className={styles.activeSwitch}><span><strong>启用配置</strong><small>允许 Runtime 在匹配场景中使用</small></span><Switch label="启用输出配置" checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} /></div></div><div className={styles.editorActions}>{selected ? <Button variant="danger" onClick={() => remove.mutate(selected.id)}><Trash2 size={14} />删除</Button> : null}<Button variant="primary" onClick={() => save.mutate()} disabled={!form.title.trim()}><Save size={14} />保存配置</Button></div></div></section></div>
}

export default function KnowledgeOutputProfiles() {
  return <SectionPage><OutputProfilesView /></SectionPage>
}
