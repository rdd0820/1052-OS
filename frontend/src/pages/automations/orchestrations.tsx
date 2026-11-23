import OrchestrationsView from '../../features/automations/AutomationFlowView'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'

export default function AutomationsOrchestrations() {
  return <SectionPage className={pageStyles.stack}><OrchestrationsView /></SectionPage>
}
