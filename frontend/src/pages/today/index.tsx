import { navSections } from '../../app/navigation'
import { SectionLayout } from '../layout'

export default function TodayLayout() {
  const items = navSections.find((section) => section.id === 'today')!.items
  return <SectionLayout items={items} />
}
