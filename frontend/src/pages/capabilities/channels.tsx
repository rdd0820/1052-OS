import { ChannelsView } from '../../features/capabilities/CapabilityViews'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'

export default function CapabilitiesChannels() {
  return <SectionPage className={pageStyles.stack}><ChannelsView /></SectionPage>
}
