---
name: Nested route outlet
overview: 按可独立验证的顺序，把 pathname 分支改成嵌套路由。先改导航和壳层，再以设置为样板逐个分区接入 Outlet，每步用类型检查和浏览器地址核对。
todos:
  - id: nav-shell
    content: 分区 path 改为布局地址，今日概览改为 /today/overview，对话 items 为空并收起侧栏
    status: completed
  - id: settings
    content: 增加 SectionLayout，拆设置四页并用嵌套路由替换 SettingsPage
    status: completed
  - id: today
    content: 拆今日概览和通知中心，/today 重定向到 /today/overview
    status: completed
  - id: workspace
    content: 工作区七个子页改为嵌套路由，/workspace 重定向到 repositories
    status: completed
  - id: knowledge
    content: 知识七个子页改为嵌套路由，/knowledge 重定向到 notes
    status: completed
  - id: automations
    content: 自动化四个子页改为嵌套路由，/automations 重定向到 calendar
    status: completed
  - id: capabilities
    content: 能力四个子页改为嵌套路由，/capabilities 重定向到 skills
    status: completed
  - id: chat-exact
    content: 对话改为精确路由 /chat，未知子路径进入 404
    status: completed
  - id: cleanup
    content: 删除旧 Page 文件，跑类型检查，并按清单做整站路由核对
    status: completed
isProject: false
---

# 前端二级路由改为 Outlet

父路由不要写 `/*`，否则子路由匹配不到。分区 `path` 是布局地址，默认子页只在 [`frontend/src/app/App.tsx`](frontend/src/app/App.tsx) 的 index 路由里 `<Navigate replace>`。对话没有子页，`items` 为 `[]`。今日概览是 `/today/overview`，`/today` 只做布局。

每一步都先跑 `npm run build`（在 `frontend/` 下，含 `tsc -b`），再按该步的浏览器清单点一遍。开发服务没开就先 `npm run dev`。某一步验证失败就停在该步，不进入下一步。

## 步骤 1：导航数据和壳层

改 [`frontend/src/app/navigation.tsx`](frontend/src/app/navigation.tsx)、[`frontend/src/components/shell/AppShell.tsx`](frontend/src/components/shell/AppShell.tsx)、[`frontend/src/components/shell/shell.module.css`](frontend/src/components/shell/shell.module.css)。这一步还不改 `App.tsx`，旧页面仍按 pathname 渲染，所以新地址也能先看出来。

导航：

- 分区 path 改为 `/today`、`/chat`、`/workspace`、`/knowledge`、`/automations`、`/capabilities`、`/settings`。
- `items` 里的子路径保持原样，只有「今日概览」从 `/today` 改为 `/today/overview`。
- 对话改为 `items: []`。
- `entryForPath` 在没有子项时不再读 `items[0]`。对话的面包屑只保留分区名。
- `commandEntries` 在 `items` 为空时补上分区自己：标签「对话」，路径 `/chat`。

壳层：

- `current.items.length === 0` 时不渲染分区侧栏，并给 `.shell` 加上少一列的网格：`var(--rail-width) minmax(0, 1fr)`。检查器打开时再加 `var(--inspector-width)`。移动端本来就隐藏分区侧栏，不用另写。
- 删掉分区链接上的 `end={item.path === '/today' || item.path === '/chat'}`。
- 品牌链接、根路径、404「返回今日」继续指向 `/today`。

验证：

- `npm run build` 通过。
- 打开 `/today/overview`，仍是今日概览；打开 `/today/activity`，侧栏只有「通知中心」高亮。
- 点左侧「设置」，地址是 `/settings`，页面仍是模型表单。工作区、知识、自动化、能力同理，地址停在分区根路径，内容仍是原来的第一项。
- 打开 `/chat`：没有分区侧栏，顶栏只有「对话」，命令面板搜索「对话」能进入 `/chat`。
- 打开 `/workspace/sql`，SQL 工作台仍在，确认这一步没有弄坏已有子路径。

## 步骤 2：设置分区，作为其余分区的样板

在 [`frontend/src/pages/PageLayout.tsx`](frontend/src/pages/PageLayout.tsx) 增加 `SectionLayout`：`PageBody`、由路由 `handle` 提供标题的 `PageHeader`、`MobileTabs`、`<Outlet />`。说明文字由布局传入。头部仍在移动端标签上面。

把 [`frontend/src/pages/SettingsPage.tsx`](frontend/src/pages/SettingsPage.tsx) 原样拆开，不改表单和请求：

- [`frontend/src/pages/setting/index.tsx`](frontend/src/pages/setting/index.tsx) 使用 `SectionLayout`，eyebrow 为 `System`，说明为「配置 1052 OS 的模型、运行边界和本地系统行为。」
- [`models.tsx`](frontend/src/pages/setting/models.tsx)、[`agent.tsx`](frontend/src/pages/setting/agent.tsx)、[`appearance.tsx`](frontend/src/pages/setting/appearance.tsx)、[`system.tsx`](frontend/src/pages/setting/system.tsx) 只保留各自内容。
- 样式继续引用 [`frontend/src/pages/settings.module.css`](frontend/src/pages/settings.module.css)。

只替换 `App.tsx` 里的设置路由，其它 `/*` 路由先留着：

```tsx
<Route path="/settings" element={<SettingsLayout />}>
  <Route index element={<Navigate to="models" replace />} />
  <Route path="models" handle={{ title: '模型接入' }} element={<ModelsSettings />} />
  <Route path="agent" handle={{ title: 'Agent 与权限' }} element={<AgentSettings />} />
  <Route path="appearance" handle={{ title: '外观与动态' }} element={<AppearanceSettings />} />
  <Route path="system" handle={{ title: '系统维护' }} element={<SystemSettings />} />
</Route>
```

四个子页和布局都 `lazy()`。然后删除 `SettingsPage.tsx`。

验证：

- `npm run build` 通过。
- `/settings` 的地址栏变成 `/settings/models`，标题是「模型接入」。
- 侧栏依次进入 agent、appearance、system，地址和标题分别是「Agent 与权限」「外观与动态」「系统维护」。模型页仍能看到 API 地址字段，Agent 页仍能看到权限单选。
- `/settings/unknown` 进入现有 404。
- `/workspace/sql` 仍能打开，确认其它分区还没被这次改动影响。

## 步骤 3：今日

[`frontend/src/pages/today/index.tsx`](frontend/src/pages/today/index.tsx) 只渲染 `<Outlet />`。概览标题是当天日期，通知页头部有「全部已读」，所以这两个页面自己保留 `PageBody`、`PageHeader` 和 `MobileTabs`，不用 `SectionLayout`。

- [`overview.tsx`](frontend/src/pages/today/overview.tsx) 承接现在的今日概览。
- [`activity.tsx`](frontend/src/pages/today/activity.tsx) 承接 `NotificationsView`。
- 样式仍用 [`frontend/src/pages/today.module.css`](frontend/src/pages/today.module.css)。

```tsx
<Route path="/today" element={<TodayLayout />}>
  <Route index element={<Navigate to="overview" replace />} />
  <Route path="overview" element={<TodayOverview />} />
  <Route path="activity" element={<TodayActivity />} />
</Route>
```

删除 [`frontend/src/pages/TodayPage.tsx`](frontend/src/pages/TodayPage.tsx)。

验证：

- `/today` 变成 `/today/overview`，标题是当天日期。
- `/today/activity` 标题是「通知中心」，头部有「全部已读」。此时「今日概览」不高亮。
- 概览里输入一句话并提交，进入 `/chat`，输入框带上这句话。
- 顶栏铃铛仍打开 `/today/activity`。

## 步骤 4：工作区

[`frontend/src/pages/workspace/index.tsx`](frontend/src/pages/workspace/index.tsx) 用 `SectionLayout`，eyebrow 为 `Workspace`。七个页面只渲染 `frontend/src/features/workspace/WorkspaceViews.tsx` 里对应的 view。标题和说明放在路由 `handle`，沿用 [`WorkspacePage.tsx`](frontend/src/pages/WorkspacePage.tsx) 里的文案：

- `repositories`：本地仓库
- `sql`：SQL 工作台
- `datasources`：数据源
- `sql-files`：SQL 文件
- `variables`：SQL 变量
- `servers`：远程服务器
- `shell-files`：Shell 文件

index 重定向到 `repositories`。删除 `WorkspacePage.tsx`。

验证：

- `/workspace` 变成 `/workspace/repositories`。
- 七个侧栏链接的地址和 `h1` 与上面的标题一致。
- `/workspace/unknown` 进入 404。

## 步骤 5：知识

同样用 `SectionLayout`，eyebrow 为 `Knowledge`。视图留在 `frontend/src/features/knowledge/`。页面标题用现有页面文案，不改侧栏 label：笔记、Wiki、记忆中心、资源库、知识检索、深度研究、输出配置。

[`ResearchView`](frontend/src/features/knowledge/ResearchView.tsx) 改为路由级 `lazy()`，页面内直接 import，去掉现在的内层 `Suspense`。index 重定向到 `notes`。删除 `KnowledgePage.tsx`。

验证：

- `/knowledge` 变成 `/knowledge/notes`。
- `/knowledge/memory` 的标题是「记忆中心」，侧栏文字仍是「记忆」。`/knowledge/resources` 的标题是「资源库」。
- `/knowledge/research` 能出现深度研究页面，不出现「正在载入工作区」卡住。
- `/knowledge/unknown` 进入 404。

## 步骤 6：自动化

`SectionLayout` 的 eyebrow 为 `Automation`。子页是日历、定时任务、流程编排、执行记录。[`OrchestrationsView`](frontend/src/features/automations/AutomationFlowView.tsx) 改为路由级懒加载，页面内直接 import。index 重定向到 `calendar`。删除 `AutomationsPage.tsx`。

验证：

- `/automations` 变成 `/automations/calendar`。
- 四个子页标题正确。`/automations/orchestrations` 能看到流程画布，而不是一直停在加载文案。
- `/automations/unknown` 进入 404。

## 步骤 7：能力与连接

`SectionLayout` 的 eyebrow 为 `Capabilities`。子页是 Skills、工具箱、搜索源、外部通道，分别渲染 `frontend/src/features/capabilities/CapabilityViews.tsx` 里的 view。index 重定向到 `skills`。删除 `CapabilitiesPage.tsx`。

验证：

- `/capabilities` 变成 `/capabilities/skills`。
- 四个子页标题正确。`/capabilities/unknown` 进入 404。

## 步骤 8：对话改为精确路由

[`frontend/src/pages/ChatPage.tsx`](frontend/src/pages/ChatPage.tsx) 不拆目录。`App.tsx` 里把 `/chat/*` 改成 `/chat`。`location.state.prompt` 保持不变。

验证：

- `/chat` 仍显示「从一个目标开始」，没有分区侧栏。
- `/chat/unknown` 进入 404。
- 再从今日概览提交一句话，`/chat` 输入框仍带上这句话。

## 步骤 9：收尾核对

确认这些文件已经删除，且全仓库不再 import 它们：`SettingsPage.tsx`、`TodayPage.tsx`、`WorkspacePage.tsx`、`KnowledgePage.tsx`、`AutomationsPage.tsx`、`CapabilitiesPage.tsx`。

然后：

- `npm run build` 通过。
- `npm test` 通过。
- 若本地后端和 Playwright 可用，跑 `npm run test:e2e:desktop`。[`frontend/e2e/smoke.spec.ts`](frontend/e2e/smoke.spec.ts) 仍打开 `/today`，最终地址应是 `/today/overview`，页面有 `h1`。

整站再点一遍：

- 根路径 `/` 先到 `/today`，再替换为 `/today/overview`。
- 左侧轨道和移动端底栏进入工作区、知识、自动化、能力、设置时，地址先落在分区 path，再替换到第一项子页。
- 每个分区的侧栏和移动端标签都能切到对应子页。
- 404 的「返回今日」回到 `/today/overview`。
- 通知页「全部已读」仍在头部。
