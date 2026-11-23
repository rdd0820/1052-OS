import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentTool } from '../agent.tool.types.js'

let tempDir = ''

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '1052-agent-runtime-tools-'))
  process.env.DATA_DIR = tempDir
  vi.resetModules()
})

afterEach(async () => {
  delete process.env.DATA_DIR
  await fs.rm(tempDir, { recursive: true, force: true })
})

async function loadRuntimeToolModules() {
  const settingsService = await import('../../settings/settings.service.js')
  const toolModule = await import('./agent-runtime.tools.js')
  const agentToolService = await import('../agent.tool.service.js')
  return { settingsService, toolModule, agentToolService }
}

function toolByName(tools: AgentTool[], name: string) {
  const tool = tools.find((item) => item.name === name)
  if (!tool) throw new Error(`missing tool: ${name}`)
  return tool
}

describe('agent llm settings tools', () => {
  it('updates morning brief preferences with confirmation and exposes them in runtime status', async () => {
    const { settingsService, toolModule } = await loadRuntimeToolModules()
    const updateMorningBrief = toolByName(toolModule.agentRuntimeTools, 'agent_morning_brief_update')
    const status = toolByName(toolModule.agentRuntimeTools, 'agent_runtime_status')

    await expect(updateMorningBrief.execute({ enabled: true, time: '08:10' })).rejects.toThrow(
      'Morning brief settings require explicit confirmation',
    )
    await expect(
      updateMorningBrief.execute({ enabled: true, time: '25:00', confirmed: true }),
    ).rejects.toThrow('HH:MM')

    await updateMorningBrief.execute({ enabled: true, time: '08:10', confirmed: true })
    expect((await settingsService.getSettings()).agent.morningBrief).toEqual({
      enabled: true,
      time: '08:10',
    })
    await updateMorningBrief.execute({ enabled: false, confirmed: true })
    expect((await settingsService.getSettings()).agent.morningBrief).toEqual({
      enabled: false,
      time: '08:10',
    })

    const runtime = (await status.execute({})) as {
      agent?: { morningBrief?: { enabled: boolean; time: string } }
    }
    expect(runtime.agent?.morningBrief).toEqual({ enabled: false, time: '08:10' })
  })

  it('honors danger-full-access confirmation injection in the 1052 executor', async () => {
    const { settingsService, agentToolService } = await loadRuntimeToolModules()
    await settingsService.updateSettings({
      agent: { permissionProfile: 'danger-full-access' },
    })

    const message = await agentToolService.executeToolCall({
      id: 'call-1',
      type: 'function',
      function: {
        name: 'agent_morning_brief_update',
        arguments: JSON.stringify({ enabled: true, time: '08:10' }),
      },
    })

    expect(message.content).toContain('08:10')
    expect((await settingsService.getSettings()).agent.morningBrief).toEqual({
      enabled: true,
      time: '08:10',
    })
  })

  it('does not let model arguments bypass default runtime approval', async () => {
    const { settingsService, agentToolService } = await loadRuntimeToolModules()
    await settingsService.updateSettings({
      agent: { permissionProfile: 'default' },
    })

    const message = await agentToolService.executeToolCall({
      id: 'call-unapproved',
      type: 'function',
      function: {
        name: 'agent_morning_brief_update',
        arguments: JSON.stringify({ enabled: true, time: '08:10', confirmed: true }),
      },
    })

    expect(message.content).toContain('requires approval from the 1052 runtime')
    expect((await settingsService.getSettings()).agent.morningBrief.enabled).toBe(false)
  })

  it('blocks side-effecting tools in the read-only permission profile', async () => {
    const { settingsService, agentToolService } = await loadRuntimeToolModules()
    await settingsService.updateSettings({
      agent: { permissionProfile: 'read-only' },
    })

    const message = await agentToolService.executeToolCall({
      id: 'call-read-only',
      type: 'function',
      function: {
        name: 'agent_morning_brief_update',
        arguments: JSON.stringify({ enabled: true, time: '08:10', confirmed: true }),
      },
    })

    expect(message.content).toContain('blocked by the 1052 read-only permission profile')
  })
})
