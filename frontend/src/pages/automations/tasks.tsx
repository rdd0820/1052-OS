import { TasksView } from '../../features/automations/AutomationViews'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'

export default function AutomationsTasks() {
  return <SectionPage className={pageStyles.stack}><TasksView /></SectionPage>
}
