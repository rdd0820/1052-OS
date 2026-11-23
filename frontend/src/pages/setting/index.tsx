import { navSections } from '../../app/navigation'
import { SectionLayout } from '../layout'

export default function SettingsLayout() {
  const items = navSections.find((section) => section.id === 'settings')!.items
  return <SectionLayout items={items} />
}
