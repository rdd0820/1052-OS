import { SearchSourcesView } from '../../features/capabilities/CapabilityViews'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'

export default function CapabilitiesSearch() {
  return <SectionPage className={pageStyles.stack}><SearchSourcesView /></SectionPage>
}
