import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Plus, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import type { WikiPage } from '../../contracts/schemas'
import { wikiApi } from '../../data/api'
import { useShellStore } from '../../state/shell'
import { MarkdownView } from '../../components/chat/MarkdownView'
import { AsyncState, Badge, Button, Input, Select } from '../../components/ui'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from '../../features/knowledge/knowledge.module.css'
const MarkdownCodeEditor = lazy(() => import('../../components/editors/MarkdownCodeEditor'))

function WikiView() {
  const client = useQueryClient()
  const theme = useShellStore((state) => state.theme)
  const pages = useQuery({ queryKey: ['wiki', 'pages'], queryFn: () => wikiApi.pages() })
  const [selected, setSelected] = useState<WikiPage | null>(null)
  const [draft, setDraft] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('concept')
  const [preview, setPreview] = useState(true)
  useEffect(() => { if (!selected && pages.data?.[0]) { setSelected(pages.data[0]); setDraft(pages.data[0].content); setTitle(pages.data[0].title); setCategory(pages.data[0].category) } }, [pages.data, selected])
  const select = (page: WikiPage) => { setSelected(page); setDraft(page.content); setTitle(page.title); setCategory(page.category); setPreview(true) }
  const save = useMutation({ mutationFn: () => selected ? wikiApi.update({ path: selected.path, title, category, tags: selected.tags, summary: selected.summary, content: draft }) : wikiApi.create({ title, category, content: draft }), onSuccess: (page) => { setSelected(page); void client.invalidateQueries({ queryKey: ['wiki', 'pages'] }) } })
  const lint = useMutation({ mutationFn: wikiApi.lint })
  const rebuild = useMutation({ mutationFn: wikiApi.rebuild })
  return <div className={pageStyles.split}><aside className={pageStyles.splitAside}><div className={pageStyles.toolbar}><strong>Wiki 页面</strong><Button size="small" onClick={() => { setSelected(null); setTitle('新页面'); setCategory('concept'); setDraft('# 新页面\n'); setPreview(false) }}><Plus size={14} />新建</Button></div><AsyncState loading={pages.isLoading} error={pages.error} empty={!pages.data?.length}><div className={pageStyles.list}>{pages.data?.map((page) => <button key={page.path} type="button" className={`${pageStyles.listItem} ${selected?.path === page.path ? pageStyles.listItemActive : ''}`} onClick={() => select(page)}><span><strong>{page.title}</strong><small>{page.summary || page.path}</small></span><Badge>{page.category}</Badge></button>)}</div></AsyncState></aside><section className={`${pageStyles.splitMain} ${styles.wikiEditor}`}><div className={pageStyles.toolbar}><div className={pageStyles.toolbarGroup}><Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Wiki 标题" /><Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Wiki 分类"><option value="entity">实体</option><option value="concept">概念</option><option value="synthesis">综合</option><option value="experience">经验</option></Select></div><div className={pageStyles.toolbarGroup}><Button size="small" onClick={() => lint.mutate()}><ShieldCheck size={14} />检查</Button><Button size="small" onClick={() => rebuild.mutate()}><RefreshCw size={14} />重建索引</Button><Button size="small" onClick={() => setPreview(!preview)}>{preview ? '编辑' : '预览'}</Button><Button size="small" variant="primary" onClick={() => save.mutate()} disabled={!title.trim()}><Save size={14} />保存</Button></div></div>{preview ? <div className={styles.markdownPreview}><MarkdownView content={draft} /></div> : <Suspense fallback={<div className={pageStyles.loadingPanel}>正在载入 Markdown 编辑器</div>}><MarkdownCodeEditor value={draft} onChange={setDraft} theme={theme} height="100%" /></Suspense>}{lint.data ? <pre className={styles.lintResult}>{JSON.stringify(lint.data, null, 2)}</pre> : null}</section></div>
}

export default function KnowledgeWiki() {
  return <SectionPage><WikiView /></SectionPage>
}
