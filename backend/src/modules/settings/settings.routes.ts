import { Router } from 'express'
import {
  getAgentSettings,
  getModelSettings,
  getPublicSettings,
  updateAgentSettings,
  updateModelSettings,
  updateSettings,
} from './settings.service.js'

export const settingsRouter: Router = Router()

settingsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await getPublicSettings())
  } catch (e) {
    next(e)
  }
})

settingsRouter.put('/', async (req, res, next) => {
  try {
    const patch = req.body ?? {}
    res.json(await updateSettings(patch))
  } catch (e) {
    next(e)
  }
})

settingsRouter.get('/models', async (_req, res, next) => {
  try {
    res.json(await getModelSettings())
  } catch (e) {
    next(e)
  }
})

settingsRouter.put('/models', async (req, res, next) => {
  try {
    const body = req.body ?? {}
    res.json(await updateModelSettings({
      llm: body.llm,
      imageGeneration: body.imageGeneration,
      ocr: body.ocr,
    }))
  } catch (e) {
    next(e)
  }
})

settingsRouter.get('/agent', async (_req, res, next) => {
  try {
    res.json(await getAgentSettings())
  } catch (e) {
    next(e)
  }
})

settingsRouter.put('/agent', async (req, res, next) => {
  try {
    res.json(await updateAgentSettings(req.body ?? {}))
  } catch (e) {
    next(e)
  }
})
