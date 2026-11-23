import { RunsView } from '../../features/automations/AutomationViews'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'

export default function AutomationsRuns() {
  return <SectionPage className={pageStyles.stack}><RunsView /></SectionPage>
}
