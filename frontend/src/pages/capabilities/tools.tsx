import { ToolsView } from '../../features/capabilities/CapabilityViews'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'

export default function CapabilitiesTools() {
  return <SectionPage className={pageStyles.stack}><ToolsView /></SectionPage>
}
