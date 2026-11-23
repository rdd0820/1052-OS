import { navSections } from '../../app/navigation'
import { SectionLayout } from '../layout'

export default function CapabilitiesLayout() {
  const items = navSections.find((section) => section.id === 'capabilities')!.items
  return <SectionLayout items={items} />
}
