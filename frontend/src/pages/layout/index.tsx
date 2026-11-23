import { Suspense, type ReactNode } from 'react'
import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
import type { NavEntry } from '../../app/navigation'
import styles from '../pages.module.css'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  )
}

export function MobileTabs({ items }: { items: NavEntry[] }) {
  return (
    <nav className={styles.mobileTabs} aria-label="分区页面">
      {items.map((item) => <NavLink key={item.path} to={item.path}><item.icon size={15} />{item.label}</NavLink>)}
    </nav>
  )
}

export function PageBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.pageBody} ${className}`}>{children}</div>
}

export function SectionPage({ actions, className = '', children }: { actions?: ReactNode; className?: string; children?: ReactNode }) {
  const items = useOutletContext<NavEntry[]>()
  return (
    <PageBody className={className}>
      {actions ? <div className={styles.pageToolbar}>{actions}</div> : null}
      <MobileTabs items={items} />
      {children}
    </PageBody>
  )
}

export function SectionLayout({ items }: { items: NavEntry[] }) {
  return (
    <Suspense fallback={null}>
      <Outlet context={items} />
    </Suspense>
  )
}
