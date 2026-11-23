import { lazy, Suspense } from 'react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'

const TodayLayout = lazy(() => import('../pages/today'))
const TodayOverview = lazy(() => import('../pages/today/overview'))
const TodayActivity = lazy(() => import('../pages/today/activity'))
const ChatPage = lazy(() => import('../pages/ChatPage'))
const WorkspaceLayout = lazy(() => import('../pages/workspace'))
const WorkspaceRepositories = lazy(() => import('../pages/workspace/repositories'))
const WorkspaceSql = lazy(() => import('../pages/workspace/sql'))
const WorkspaceDataSources = lazy(() => import('../pages/workspace/datasources'))
const WorkspaceSqlFiles = lazy(() => import('../pages/workspace/sql-files'))
const WorkspaceVariables = lazy(() => import('../pages/workspace/variables'))
const WorkspaceServers = lazy(() => import('../pages/workspace/servers'))
const WorkspaceShellFiles = lazy(() => import('../pages/workspace/shell-files'))
const KnowledgeLayout = lazy(() => import('../pages/knowledge'))
const KnowledgeNotes = lazy(() => import('../pages/knowledge/notes'))
const KnowledgeWiki = lazy(() => import('../pages/knowledge/wiki'))
const KnowledgeMemory = lazy(() => import('../pages/knowledge/memory'))
const KnowledgeResources = lazy(() => import('../pages/knowledge/resources'))
const KnowledgeSearch = lazy(() => import('../pages/knowledge/search'))
const KnowledgeResearch = lazy(() => import('../pages/knowledge/research'))
const KnowledgeOutputProfiles = lazy(() => import('../pages/knowledge/output-profiles'))
const AutomationsLayout = lazy(() => import('../pages/automations'))
const AutomationsCalendar = lazy(() => import('../pages/automations/calendar'))
const AutomationsTasks = lazy(() => import('../pages/automations/tasks'))
const AutomationsOrchestrations = lazy(() => import('../pages/automations/orchestrations'))
const AutomationsRuns = lazy(() => import('../pages/automations/runs'))
const CapabilitiesLayout = lazy(() => import('../pages/capabilities'))
const CapabilitiesSkills = lazy(() => import('../pages/capabilities/skills'))
const CapabilitiesTools = lazy(() => import('../pages/capabilities/tools'))
const CapabilitiesSearch = lazy(() => import('../pages/capabilities/search'))
const CapabilitiesChannels = lazy(() => import('../pages/capabilities/channels'))
const SettingsLayout = lazy(() => import('../pages/setting'))
const ModelsSettings = lazy(() => import('../pages/setting/models'))
const AgentSettings = lazy(() => import('../pages/setting/agent'))
const GeneralSettings = lazy(() => import('../pages/setting/general'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

function LoadingScreen() {
  return <div style={{ display: 'grid', minHeight: '100%', placeItems: 'center', color: 'var(--text-muted)' }}>正在载入工作区</div>
}

const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<AppShell />}>
    <Route index element={<Navigate to="/today" replace />} />
    <Route path="/today" element={<TodayLayout />}>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="overview" element={<TodayOverview />} />
      <Route path="activity" element={<TodayActivity />} />
    </Route>
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/workspace" element={<WorkspaceLayout />}>
      <Route index element={<Navigate to="repositories" replace />} />
      <Route path="repositories" element={<WorkspaceRepositories />} />
      <Route path="sql" element={<WorkspaceSql />} />
      <Route path="datasources" element={<WorkspaceDataSources />} />
      <Route path="sql-files" element={<WorkspaceSqlFiles />} />
      <Route path="variables" element={<WorkspaceVariables />} />
      <Route path="servers" element={<WorkspaceServers />} />
      <Route path="shell-files" element={<WorkspaceShellFiles />} />
    </Route>
    <Route path="/knowledge" element={<KnowledgeLayout />}>
      <Route index element={<Navigate to="notes" replace />} />
      <Route path="notes" element={<KnowledgeNotes />} />
      <Route path="wiki" element={<KnowledgeWiki />} />
      <Route path="memory" element={<KnowledgeMemory />} />
      <Route path="resources" element={<KnowledgeResources />} />
      <Route path="search" element={<KnowledgeSearch />} />
      <Route path="research" element={<KnowledgeResearch />} />
      <Route path="output-profiles" element={<KnowledgeOutputProfiles />} />
    </Route>
    <Route path="/automations" element={<AutomationsLayout />}>
      <Route index element={<Navigate to="calendar" replace />} />
      <Route path="calendar" element={<AutomationsCalendar />} />
      <Route path="tasks" element={<AutomationsTasks />} />
      <Route path="orchestrations" element={<AutomationsOrchestrations />} />
      <Route path="runs" element={<AutomationsRuns />} />
    </Route>
    <Route path="/capabilities" element={<CapabilitiesLayout />}>
      <Route index element={<Navigate to="skills" replace />} />
      <Route path="skills" element={<CapabilitiesSkills />} />
      <Route path="tools" element={<CapabilitiesTools />} />
      <Route path="search" element={<CapabilitiesSearch />} />
      <Route path="channels" element={<CapabilitiesChannels />} />
    </Route>
    <Route path="/settings" element={<SettingsLayout />}>
      <Route index element={<Navigate to="models" replace />} />
      <Route path="models" element={<ModelsSettings />} />
      <Route path="agent" element={<AgentSettings />} />
      <Route path="general" element={<GeneralSettings />} />
      <Route path="appearance" element={<Navigate to="/settings/general" replace />} />
      <Route path="system" element={<Navigate to="/settings/general" replace />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Route>,
))

export function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
