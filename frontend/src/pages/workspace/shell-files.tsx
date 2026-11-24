import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileCode2, Play, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Field, Input, Select, Textarea } from '../../components/ui'
import type { ShellFile } from '../../contracts/schemas'
import { sqlApi } from '../../data/api'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from './workspace.module.css'

function formatDate(timestamp?: number) {
  return timestamp ? new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(timestamp) : '未知'
}

export default function WorkspaceShellFiles() {
  const client = useQueryClient()
  const files = useQuery({ queryKey: ['sql', 'shell-files'], queryFn: sqlApi.shellFiles })
  const servers = useQuery({ queryKey: ['sql', 'servers'], queryFn: sqlApi.servers })
  const [selected, setSelected] = useState<ShellFile | null>(null)
  const [form, setForm] = useState({ name: '', serverId: '', content: '', description: '' })
  const select = (file: ShellFile) => { setSelected(file); setForm({ name: file.name, serverId: file.serverId, content: file.content, description: file.description }) }
  const save = useMutation({ mutationFn: () => selected ? sqlApi.updateShellFile(selected.id, form) : sqlApi.createShellFile(form), onSuccess: (file) => { setSelected(file); void client.invalidateQueries({ queryKey: ['sql', 'shell-files'] }) } })
  const execute = useMutation({ mutationFn: () => selected ? sqlApi.executeShellFile(selected.id) : Promise.reject(new Error('请先保存文件')) })
  const remove = useMutation({ mutationFn: sqlApi.deleteShellFile, onSuccess: () => { setSelected(null); setForm({ name: '', serverId: '', content: '', description: '' }); void client.invalidateQueries({ queryKey: ['sql', 'shell-files'] }) } })
  return (
    <SectionPage>
      <div className={pageStyles.split}><aside className={pageStyles.splitAside}><div className={pageStyles.toolbar}><strong>Shell 文件</strong><Button size="small" onClick={() => { setSelected(null); setForm({ name: '', serverId: servers.data?.[0]?.id ?? '', content: '', description: '' }) }}><Plus size={14} />新建</Button></div><div className={pageStyles.list}>{files.data?.map((file) => <button key={file.id} type="button" className={`${pageStyles.listItem} ${selected?.id === file.id ? pageStyles.listItemActive : ''}`} onClick={() => select(file)}><span><strong>{file.name}</strong><small>{file.description || formatDate(file.updatedAt)}</small></span><FileCode2 size={15} /></button>)}</div></aside><section className={pageStyles.splitMain}><div className={pageStyles.detail}><div className={pageStyles.formGrid}><Field label="名称"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="服务器"><Select value={form.serverId} onChange={(e) => setForm({ ...form, serverId: e.target.value })}><option value="">选择服务器</option>{servers.data?.map((server) => <option key={server.id} value={server.id}>{server.name}</option>)}</Select></Field><Field label="说明"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="脚本内容"><Textarea className={styles.shellEditor} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field></div><div className={styles.editorActions}>{selected ? <Button variant="danger" onClick={() => remove.mutate(selected.id)}><Trash2 size={14} />删除</Button> : null}<Button onClick={() => execute.mutate()} disabled={!selected}><Play size={14} />运行</Button><Button variant="primary" onClick={() => save.mutate()} disabled={!form.name || !form.serverId}><Save size={14} />保存</Button></div>{execute.data ? <pre className={pageStyles.codeBlock}>{JSON.stringify(execute.data, null, 2)}</pre> : null}</div></section></div>
    </SectionPage>
  )
}
