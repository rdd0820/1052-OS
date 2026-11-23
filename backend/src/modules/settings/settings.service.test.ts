import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let tempDir = ''

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '1052-settings-'))
  process.env.DATA_DIR = tempDir
  vi.resetModules()
})

afterEach(async () => {
  delete process.env.DATA_DIR
  await fs.rm(tempDir, { recursive: true, force: true })
})

describe('settings llm profiles', () => {
  it('defaults to the workspace permission profile and persists explicit profiles', async () => {
    const service = await import('./settings.service.js')

    expect((await service.getSettings()).agent.permissionProfile).toBe('default')
    const updated = await service.updateSettings({
      agent: { permissionProfile: 'read-only' },
    })
    expect(updated.agent.permissionProfile).toBe('read-only')
    expect((await service.getSettings()).agent.permissionProfile).toBe('read-only')
  })

  it('defaults and normalizes morning brief settings', async () => {
    const service = await import('./settings.service.js')
    const calendar = await import('../calendar/calendar.schedule.service.js')

    expect((await service.getSettings()).agent.morningBrief).toEqual({
      enabled: false,
      time: '09:30',
    })
    expect(await calendar.listScheduledTasks({ target: 'agent' })).toEqual([])

    const updated = await service.updateSettings({
      agent: { morningBrief: { enabled: true, time: '07:45' } },
    })
    expect(updated.agent.morningBrief).toEqual({ enabled: true, time: '07:45' })
    let tasks = await calendar.listScheduledTasks({ target: 'agent' })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      title: '每日 Intel Center 早报',
      target: 'agent',
      mode: 'ongoing',
      time: '07:45',
      repeatUnit: 'day',
      enabled: true,
      delivery: {
        wechat: { mode: 'off' },
        feishu: { mode: 'off' },
      },
    })
    expect(tasks[0]?.notes).toContain('[managed:agent-morning-brief]')
    expect(tasks[0]?.prompt).toContain('intel-center')

    await service.updateSettings({ agent: { morningBrief: { time: 'bad-time' } } })
    expect((await service.getSettings()).agent.morningBrief).toEqual({
      enabled: true,
      time: '07:45',
    })
    tasks = await calendar.listScheduledTasks({ target: 'agent' })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.time).toBe('07:45')

    await service.updateSettings({ agent: { morningBrief: { enabled: false } } })
    expect((await service.getSettings()).agent.morningBrief).toEqual({
      enabled: false,
      time: '07:45',
    })
    tasks = await calendar.listScheduledTasks({ target: 'agent' })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ enabled: false, time: '07:45' })
  })

  it('does not take over user-created morning brief tasks without the managed marker', async () => {
    const service = await import('./settings.service.js')
    const calendar = await import('../calendar/calendar.schedule.service.js')

    const userTask = await calendar.createScheduledTask({
      title: '每日 Intel Center 早报',
      notes: '用户自己维护的飞书早报任务',
      target: 'agent',
      mode: 'ongoing',
      startDate: '2026-04-25',
      time: '06:30',
      repeatUnit: 'day',
      repeatInterval: 1,
      prompt: '请使用 intel-center 生成早报并发送到飞书。',
      delivery: {
        feishu: {
          mode: 'fixed',
          receiveIdType: 'chat_id',
          receiveId: 'oc_manual',
        },
        wechat: { mode: 'off' },
      },
      enabled: true,
    })

    await service.updateSettings({
      agent: { morningBrief: { enabled: true, time: '08:00' } },
    })

    const tasks = await calendar.listScheduledTasks({ target: 'agent' })
    expect(tasks).toHaveLength(2)
    expect(tasks.find((task) => task.id === userTask.id)).toMatchObject({
      notes: '用户自己维护的飞书早报任务',
      time: '06:30',
      enabled: true,
      delivery: {
        feishu: {
          mode: 'fixed',
          receiveIdType: 'chat_id',
          receiveId: 'oc_manual',
        },
      },
    })
    const managed = tasks.find((task) => task.notes.includes('[managed:agent-morning-brief]'))
    expect(managed).toMatchObject({
      title: '每日 Intel Center 早报',
      time: '08:00',
      enabled: true,
      delivery: {
        feishu: { mode: 'off' },
        wechat: { mode: 'off' },
      },
    })
  })

  it('updates an existing managed morning brief task without overwriting delivery', async () => {
    const service = await import('./settings.service.js')
    const calendar = await import('../calendar/calendar.schedule.service.js')

    const managedTask = await calendar.createScheduledTask({
      title: '每日 Intel Center 早报',
      notes: '[managed:agent-morning-brief]\n用户后来配置了固定飞书投递',
      target: 'agent',
      mode: 'ongoing',
      startDate: '2026-04-25',
      time: '07:00',
      repeatUnit: 'day',
      repeatInterval: 1,
      prompt: '旧早报 prompt',
      delivery: {
        feishu: {
          mode: 'fixed',
          receiveIdType: 'chat_id',
          receiveId: 'oc_managed',
        },
        wechat: { mode: 'off' },
      },
      enabled: true,
    })

    await service.updateSettings({
      agent: { morningBrief: { enabled: true, time: '08:20' } },
    })

    const tasks = await calendar.listScheduledTasks({ target: 'agent' })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.id).toBe(managedTask.id)
    expect(tasks[0]).toMatchObject({
      time: '08:20',
      enabled: true,
      delivery: {
        feishu: {
          mode: 'fixed',
          receiveIdType: 'chat_id',
          receiveId: 'oc_managed',
        },
        wechat: { mode: 'off' },
      },
    })
    expect(tasks[0]?.prompt).toContain('intel-center')
  })

  it('reads the single configured model and ignores saved profiles', async () => {
    await fs.writeFile(
      path.join(tempDir, 'settings.json'),
      JSON.stringify({
        llm: {
          baseUrl: 'https://api.openai.com/v1',
          modelId: 'gpt-4.1-mini',
          apiKey: 'cloud-key',
          profiles: [
            {
              id: 'other',
              baseUrl: 'https://api.deepseek.com',
              modelId: 'deepseek-flash',
              apiKey: 'other-key',
            },
          ],
          activeProfileId: 'other',
        },
      }),
      'utf-8',
    )

    const service = await import('./settings.service.js')
    const settings = await service.getSettings()
    const publicSettings = await service.getPublicSettings()

    expect(settings.llm).toEqual({
      apiFormat: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      modelId: 'gpt-4.1-mini',
      apiKey: 'cloud-key',
    })
    expect(settings.llm).not.toHaveProperty('profiles')
    expect(publicSettings.llm.hasApiKey).toBe(true)
    expect(publicSettings.llm.apiKey).toBe('cloud-key')
    expect(publicSettings.llm).not.toHaveProperty('profiles')
  })

  it('stores and returns an API key exactly as submitted, including an empty value', async () => {
    const service = await import('./settings.service.js')
    const submitted = 'sk-exact value'

    const saved = await service.updateSettings({
      llm: {
        baseUrl: 'https://api.deepseek.com',
        modelId: 'deepseek-flash',
        apiKey: submitted,
      },
      imageGeneration: { apiKey: submitted },
    })
    expect(saved.llm.apiKey).toBe(submitted)
    expect(saved.imageGeneration.apiKey).toBe(submitted)

    const cleared = await service.updateSettings({
      llm: { apiKey: '' },
      imageGeneration: { apiKey: '' },
    })
    expect(cleared.llm.apiKey).toBe('')
    expect(cleared.imageGeneration.apiKey).toBe('')
    expect((await service.getSettings()).llm.apiKey).toBe('')
  })
})

describe('model settings projection', () => {
  it('returns only llm, image generation, and ocr', async () => {
    const service = await import('./settings.service.js')
    await service.updateSettings({
      agent: { userPrompt: 'keep-me' },
      uapis: { apiKey: 'uapis-key' },
    })

    const models = await service.getModelSettings()

    expect(Object.keys(models).sort()).toEqual(['imageGeneration', 'llm', 'ocr'])
    expect(models.ocr.hasCredential).toBe(true)
  })

  it('sets ocr.hasCredential from the active provider', async () => {
    const service = await import('./settings.service.js')

    const uapisMode = await service.updateModelSettings({
      ocr: { provider: 'uapis', customApiKey: '' },
    })
    expect(uapisMode.ocr.hasCredential).toBe(false)

    await service.updateSettings({ uapis: { apiKey: 'uapis-key' } })
    expect((await service.getModelSettings()).ocr.hasCredential).toBe(true)

    const customMode = await service.updateModelSettings({
      ocr: { provider: 'custom-model', customApiKey: 'ocr-key' },
    })
    expect(customMode.ocr.hasCredential).toBe(true)

    const clearedCustom = await service.updateModelSettings({
      ocr: { provider: 'custom-model', customApiKey: '' },
    })
    expect(clearedCustom.ocr.hasCredential).toBe(false)
  })

  it('keeps agent settings when a model patch is saved', async () => {
    const service = await import('./settings.service.js')
    await service.updateSettings({
      agent: { userPrompt: 'keep-me' },
      llm: {
        baseUrl: 'https://api.deepseek.com',
        modelId: 'deepseek-flash',
        apiKey: 'sk-keep',
      },
    })

    const models = await service.updateModelSettings({
      llm: { modelId: 'deepseek-v4' },
    })

    expect(models).not.toHaveProperty('agent')
    expect(models.llm.modelId).toBe('deepseek-v4')
    expect(models.llm.apiKey).toBe('sk-keep')
    const stored = await service.getSettings()
    expect(stored).not.toHaveProperty('appearance')
    expect(stored.agent.userPrompt).toBe('keep-me')
  })

  it('stores an empty API key submitted through the model resource', async () => {
    const service = await import('./settings.service.js')
    await service.updateModelSettings({
      llm: {
        baseUrl: 'https://api.deepseek.com',
        modelId: 'deepseek-flash',
        apiKey: 'sk-exact value',
      },
      imageGeneration: { apiKey: 'image-key' },
    })

    const cleared = await service.updateModelSettings({
      llm: { apiKey: '' },
      imageGeneration: { apiKey: '' },
    })

    expect(cleared.llm.apiKey).toBe('')
    expect(cleared.imageGeneration.apiKey).toBe('')
    expect(cleared).not.toHaveProperty('uapis')
  })
})

describe('agent settings projection', () => {
  it('returns and updates only agent settings', async () => {
    const service = await import('./settings.service.js')
    await service.updateSettings({
      llm: {
        baseUrl: 'https://api.deepseek.com',
        modelId: 'deepseek-flash',
        apiKey: 'sk-keep',
      },
      agent: { userPrompt: 'keep-me', permissionProfile: 'read-only' },
    })

    const agent = await service.getAgentSettings()
    expect(agent.userPrompt).toBe('keep-me')
    expect(agent.permissionProfile).toBe('read-only')
    expect(agent.morningBrief.time).toBe('09:30')
    expect(Object.keys(agent).sort()).toEqual(['morningBrief', 'permissionProfile', 'userPrompt'])

    const updated = await service.updateAgentSettings({ userPrompt: 'next-prompt' })
    expect(updated.userPrompt).toBe('next-prompt')
    expect(updated.permissionProfile).toBe('read-only')
    expect((await service.getSettings()).llm.modelId).toBe('deepseek-flash')
    expect((await service.getSettings()).llm.apiKey).toBe('sk-keep')
  })
})
