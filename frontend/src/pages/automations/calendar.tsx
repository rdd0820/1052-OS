import { CalendarView } from '../../features/automations/AutomationViews'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'

export default function AutomationsCalendar() {
  return <SectionPage className={pageStyles.stack}><CalendarView /></SectionPage>
}
