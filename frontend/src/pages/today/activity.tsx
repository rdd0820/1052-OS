import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { AsyncState, Badge, Button, Surface } from '../../components/ui'
import { notificationsApi } from '../../data/api'
import { SectionPage } from '../layout'
import styles from '../today.module.css'

const timeFormatter = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function TodayActivity() {
  const client = useQueryClient()
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list })
  const mark = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  })
  return (
    <SectionPage className={styles.today} actions={<Button onClick={() => markAll.mutate()} disabled={markAll.isPending}>全部已读</Button>}>
      <Surface>
        <AsyncState loading={notifications.isLoading} error={notifications.error} empty={!notifications.data?.length}>
          <div className={styles.notificationList}>
            {notifications.data?.map((item) => (
              <button key={item.id} type="button" className={`${styles.notificationRow} ${item.read ? '' : styles.unread}`} onClick={() => !item.read && mark.mutate(item.id)}>
                <span className={`${styles.levelDot} ${styles[item.level]}`} />
                <span><strong>{item.title}</strong><small>{item.message}</small></span>
                <time>{timeFormatter.format(item.createdAt)}</time>
                {!item.read ? <Badge tone="warning">未读</Badge> : <Check size={15} />}
              </button>
            ))}
          </div>
        </AsyncState>
      </Surface>
    </SectionPage>
  )
}
