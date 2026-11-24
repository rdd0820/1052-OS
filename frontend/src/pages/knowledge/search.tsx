import { useMutation, useQuery } from '@tanstack/react-query'
import { BookOpen, LoaderCircle, RefreshCw, Search } from 'lucide-react'
import { useState } from 'react'
import { pkmApi } from '../../data/api'
import { Badge, Button, Input } from '../../components/ui'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from '../../features/knowledge/knowledge.module.css'

function PkmView() {
  const summary = useQuery({ queryKey: ['pkm', 'summary'], queryFn: pkmApi.summary })
  const [expression, setExpression] = useState('')
  const search = useMutation({ mutationFn: () => pkmApi.search(expression) })
  const reindex = useMutation({ mutationFn: pkmApi.reindex })
  const results = (search.data?.results ?? []) as Array<Record<string, unknown>>
  return <div className={styles.knowledgeSearch}><div className={pageStyles.statStrip}><div><strong>{summary.data?.totalEntries ?? 0}</strong><span>索引条目</span></div><div><strong>{Object.keys(summary.data?.bySource ?? {}).length}</strong><span>内容来源</span></div><div><strong>{summary.data?.thesaurusSize ?? 0}</strong><span>同义词</span></div><div><strong>{summary.data?.lastIndexAt ? '正常' : '待建立'}</strong><span>索引状态</span></div></div><section className={styles.searchDeck}><Search size={19} /><Input value={expression} onChange={(e) => setExpression(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && expression.trim() && search.mutate()} placeholder="使用自然语言搜索记忆、Wiki、Skill、资源和日程" /><Button variant="primary" onClick={() => search.mutate()} disabled={!expression.trim() || search.isPending}>{search.isPending ? <LoaderCircle className={styles.spin} size={15} /> : <Search size={15} />}搜索</Button><Button onClick={() => reindex.mutate()}><RefreshCw size={15} />重建索引</Button></section><div className={styles.searchResults}>{results.map((result, index) => { const entry = (result.entry ?? {}) as Record<string, unknown>; return <article key={String(entry.id ?? index)}><header><span><BookOpen size={15} /></span><div><strong>{String(entry.title ?? '未命名结果')}</strong><small>{String(result.sourceLabel ?? entry.source ?? '')}</small></div><Badge>{Number(result.score ?? 0).toFixed(2)}</Badge></header><p>{String(entry.summary ?? entry.content ?? '')}</p>{Array.isArray(entry.tags) ? <footer>{entry.tags.slice(0, 5).map((tag) => <Badge key={String(tag)}>{String(tag)}</Badge>)}</footer> : null}</article> })}{search.data && !results.length ? <div className={styles.searchEmpty}>没有找到匹配内容</div> : null}</div></div>
}

export default function KnowledgeSearch() {
  return <SectionPage><PkmView /></SectionPage>
}
