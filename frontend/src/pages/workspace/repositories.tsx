import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Folder, FolderGit2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MarkdownView } from '../../components/chat/MarkdownView'
import { AsyncState, Badge, Button, Dialog, Field, Input } from '../../components/ui'
import { repositoryApi } from '../../data/api'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from './workspace.module.css'

function flattenTree(nodes: Array<Record<string, unknown>>, depth = 0): Array<{ name: string; path: string; type: string; depth: number }> {
  const result: Array<{ name: string; path: string; type: string; depth: number }> = []
  for (const node of nodes) {
    result.push({ name: String(node.name ?? ''), path: String(node.relativePath ?? ''), type: String(node.type ?? 'file'), depth })
    if (Array.isArray(node.children)) result.push(...flattenTree(node.children as Array<Record<string, unknown>>, depth + 1))
  }
  return result
}

export default function WorkspaceRepositories() {
  const client = useQueryClient()
  const repositories = useQuery({ queryKey: ['repositories'], queryFn: repositoryApi.list })
  const [selectedId, setSelectedId] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [path, setPath] = useState('')
  useEffect(() => { if (!selectedId && repositories.data?.[0]) setSelectedId(repositories.data[0].id) }, [repositories.data, selectedId])
  const detail = useQuery({ queryKey: ['repository', selectedId], queryFn: () => repositoryApi.detail(selectedId), enabled: Boolean(selectedId) })
  const file = useQuery({ queryKey: ['repository', selectedId, 'file', selectedPath], queryFn: () => repositoryApi.file(selectedId, selectedPath), enabled: Boolean(selectedId && selectedPath) })
  const add = useMutation({ mutationFn: () => repositoryApi.add(path), onSuccess: (repo) => { setAddOpen(false); setPath(''); setSelectedId(repo.id); void client.invalidateQueries({ queryKey: ['repositories'] }) } })
  const remove = useMutation({ mutationFn: repositoryApi.remove, onSuccess: () => { setSelectedId(''); void client.invalidateQueries({ queryKey: ['repositories'] }) } })
  const tree = flattenTree((detail.data?.tree ?? []) as Array<Record<string, unknown>>).slice(0, 500)
  const selectedRepo = repositories.data?.find((repo) => repo.id === selectedId)
  return (
    <SectionPage>
      <div className={pageStyles.split}>
        <aside className={pageStyles.splitAside}>
          <div className={pageStyles.toolbar}><strong>本地仓库</strong><Button size="small" onClick={() => setAddOpen(true)}><Plus size={14} />添加</Button></div>
          <AsyncState loading={repositories.isLoading} error={repositories.error} empty={!repositories.data?.length}>
            <div className={pageStyles.list}>{repositories.data?.map((repo) => <button type="button" key={repo.id} className={`${pageStyles.listItem} ${repo.id === selectedId ? pageStyles.listItemActive : ''}`} onClick={() => { setSelectedId(repo.id); setSelectedPath('') }}><span><strong>{repo.name}</strong><small>{repo.path}</small></span><Badge tone={repo.status === 'dirty' ? 'warning' : 'success'}>{repo.status === 'dirty' ? `${repo.changes} 项变化` : repo.status === 'clean' ? '干净' : '未知'}</Badge></button>)}</div>
          </AsyncState>
        </aside>
        <section className={pageStyles.splitMain}>
          <AsyncState loading={detail.isLoading} error={detail.error} empty={!selectedRepo}>
            <div className={styles.repoHeader}><span className={styles.repoIcon}><FolderGit2 size={20} /></span><div><h2>{selectedRepo?.name}</h2><p>{selectedRepo?.description || selectedRepo?.path}</p><div><Badge>{selectedRepo?.branch || 'no branch'}</Badge>{selectedRepo?.language ? <Badge>{selectedRepo.language}</Badge> : null}</div></div>{selectedRepo ? <Button variant="danger" size="small" onClick={() => remove.mutate(selectedRepo.id)}><Trash2 size={14} />移除</Button> : null}</div>
            <div className={styles.repoContent}>
              <div className={styles.fileTree}>
                <header>文件</header>
                {tree.map((node) => <button key={node.path} type="button" style={{ paddingLeft: 10 + node.depth * 14 }} disabled={node.type === 'dir'} onClick={() => setSelectedPath(node.path)} className={selectedPath === node.path ? styles.selectedFile : ''}>{node.type === 'dir' ? <Folder size={14} /> : <FileText size={14} />}<span>{node.name}</span></button>)}
              </div>
              <div className={styles.filePreview}>
                {selectedPath ? <AsyncState loading={file.isLoading} error={file.error}>{String((file.data as Record<string, unknown> | undefined)?.previewType) === 'markdown' ? <MarkdownView content={String((file.data as Record<string, unknown>).content ?? '')} /> : <pre>{String((file.data as Record<string, unknown> | undefined)?.content ?? '')}</pre>}</AsyncState> : detail.data?.readme ? <MarkdownView content={detail.data.readme.content} /> : <div className={styles.previewEmpty}>选择一个文件查看内容</div>}
              </div>
            </div>
          </AsyncState>
        </section>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen} title="添加本地仓库" footer={<><Button onClick={() => setAddOpen(false)}>取消</Button><Button variant="primary" onClick={() => add.mutate()} disabled={!path.trim() || add.isPending}>添加仓库</Button></>}><Field label="仓库绝对路径"><Input value={path} onChange={(event) => setPath(event.target.value)} placeholder="C:\projects\my-repository" /></Field>{add.error ? <p className={styles.formError}>{add.error.message}</p> : null}</Dialog>
    </SectionPage>
  )
}
