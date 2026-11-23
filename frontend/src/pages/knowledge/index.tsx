import { navSections } from '../../app/navigation'
import { SectionLayout } from '../layout'

export default function KnowledgeLayout() {
  const items = navSections.find((section) => section.id === 'knowledge')!.items
  return <SectionLayout items={items} />
}
