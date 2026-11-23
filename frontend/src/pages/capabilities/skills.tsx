import { SkillsView } from '../../features/capabilities/CapabilityViews'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'

export default function CapabilitiesSkills() {
  return <SectionPage className={pageStyles.stack}><SkillsView /></SectionPage>
}
