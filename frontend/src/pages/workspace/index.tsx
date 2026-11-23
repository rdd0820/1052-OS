import { navSections } from '../../app/navigation'
import { SectionLayout } from '../layout'

export default function WorkspaceLayout() {
  const items = navSections.find((section) => section.id === 'workspace')!.items
  return <SectionLayout items={items} />
}
