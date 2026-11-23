import { navSections } from '../../app/navigation'
import { SectionLayout } from '../layout'

export default function AutomationsLayout() {
  const items = navSections.find((section) => section.id === 'automations')!.items
  return <SectionLayout items={items} />
}
