import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Cloud, LoaderCircle, MonitorCog } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AsyncState, Badge, Button, Field, Input, Select, Surface } from '../../components/ui'
import { settingsApi } from '../../data/api'
import { SectionPage } from '../layout'
import pageStyles from '../pages.module.css'
import styles from '../settings.module.css'

const modelFormSchema = z.object({
  baseUrl: z.string().min(1, '请输入 API 地址'),
  modelId: z.string().min(1, '请输入模型 ID'),
  apiFormat: z.enum(['openai-compatible', 'anthropic', 'gemini']),
  apiKey: z.string().optional(),
  imageBaseUrl: z.string().optional(),
  imageModelId: z.string().optional(),
  imageApiKey: z.string().optional(),
  ocrProvider: z.enum(['uapis', 'custom-model']),
  ocrBaseUrl: z.string().optional(),
  ocrModelId: z.string().optional(),
  ocrApiKey: z.string().optional(),
})

type ModelForm = z.infer<typeof modelFormSchema>

export default function ModelsSettings() {
  const client = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const form = useForm<ModelForm>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: { baseUrl: '', modelId: '', apiFormat: 'openai-compatible', apiKey: '', imageBaseUrl: '', imageModelId: '', imageApiKey: '', ocrProvider: 'uapis', ocrBaseUrl: '', ocrModelId: '', ocrApiKey: '' },
  })

  useEffect(() => {
    if (!settings.data) return
    const image = settings.data.imageGeneration as Record<string, unknown>
    const ocr = settings.data.ocr as Record<string, unknown>
    form.reset({
      baseUrl: settings.data.llm.baseUrl,
      modelId: settings.data.llm.modelId,
      apiFormat: settings.data.llm.apiFormat,
      apiKey: settings.data.llm.apiKeyMask,
      imageBaseUrl: String(image.baseUrl ?? ''),
      imageModelId: String(image.modelId ?? ''),
      imageApiKey: String(image.apiKeyMask ?? ''),
      ocrProvider: ocr.provider === 'custom-model' ? 'custom-model' : 'uapis',
      ocrBaseUrl: String(ocr.customBaseUrl ?? ''),
      ocrModelId: String(ocr.customModelId ?? ''),
      ocrApiKey: '',
    })
  }, [form, settings.data])

  const apiKeyMask = settings.data?.llm.apiKeyMask ?? ''
  const imageSettings = settings.data?.imageGeneration as Record<string, unknown> | undefined
  const ocrSettings = settings.data?.ocr as Record<string, unknown> | undefined
  const imageApiKeyMask = String(imageSettings?.apiKeyMask ?? '')
  const imageHasApiKey = imageSettings?.hasApiKey === true
  const ocrHasApiKey = ocrSettings?.provider === 'custom-model'
    ? ocrSettings.hasCustomApiKey === true
    : (settings.data?.uapis as Record<string, unknown> | undefined)?.hasApiKey === true

  const save = useMutation({
    mutationFn: (value: ModelForm) => settingsApi.update({
      llm: {
        baseUrl: value.baseUrl,
        modelId: value.modelId,
        apiFormat: value.apiFormat,
        ...(value.apiKey && value.apiKey !== apiKeyMask ? { apiKey: value.apiKey } : {}),
      },
      imageGeneration: { baseUrl: value.imageBaseUrl, modelId: value.imageModelId, ...(value.imageApiKey && value.imageApiKey !== imageApiKeyMask ? { apiKey: value.imageApiKey } : {}) },
      ocr: { provider: value.ocrProvider, customBaseUrl: value.ocrBaseUrl, customModelId: value.ocrModelId, ...(value.ocrApiKey ? { customApiKey: value.ocrApiKey } : {}) },
    }),
    onSuccess: (data) => client.setQueryData(['settings'], data),
  })
  const activate = useMutation({
    mutationFn: settingsApi.activateProfile,
    onSuccess: (data) => client.setQueryData(['settings'], data),
  })

  return (
    <SectionPage>
      <AsyncState loading={settings.isLoading} error={settings.error}>
        <form className={styles.settingsStack} onSubmit={form.handleSubmit((value) => save.mutate(value))}>
          {settings.data?.llm.profiles.length ? (
            <Surface title="模型配置档案">
              <div className={styles.profileList}>
                {settings.data.llm.profiles.map((profile) => (
                  <div key={profile.id}>
                    <span className={styles.profileIcon}>{profile.kind === 'local' ? <MonitorCog size={16} /> : <Cloud size={16} />}</span>
                    <span><strong>{profile.name}</strong><small>{profile.modelId} · {profile.baseUrl}</small></span>
                    {profile.id === settings.data.llm.activeProfileId ? <Badge tone="success">当前使用</Badge> : <Button size="small" onClick={() => activate.mutate(profile.id)}>切换</Button>}
                  </div>
                ))}
              </div>
            </Surface>
          ) : null}

          <Surface title="主模型" action={<Badge tone={settings.data?.llm.hasApiKey ? 'success' : 'warning'}>{settings.data?.llm.hasApiKey ? '凭证已配置' : '等待 API Key'}</Badge>}>
            <div className={pageStyles.formGrid}>
              <Field label="API 地址"><Input {...form.register('baseUrl')} placeholder="https://api.openai.com/v1" /></Field>
              <Field label="模型 ID"><Input {...form.register('modelId')} placeholder="gpt-4.1-mini" /></Field>
              <Field label="接口格式"><Select {...form.register('apiFormat')}><option value="openai-compatible">OpenAI 兼容</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></Select></Field>
              <Field label="API Key"><Input {...form.register('apiKey')} placeholder="请输入 API Key" autoComplete="off" /></Field>
            </div>
          </Surface>

          <div className={pageStyles.grid2}>
            <Surface title="图像生成" action={<Badge tone={imageHasApiKey ? 'success' : 'warning'}>{imageHasApiKey ? '凭证已配置' : '等待 API Key'}</Badge>}>
              <div className={styles.compactForm}>
                <Field label="API 地址"><Input {...form.register('imageBaseUrl')} /></Field>
                <Field label="模型 ID"><Input {...form.register('imageModelId')} /></Field>
                <Field label="API Key"><Input {...form.register('imageApiKey')} placeholder="请输入 API Key" autoComplete="off" /></Field>
              </div>
            </Surface>
            <Surface title="OCR 文字识别" action={<Badge tone={ocrHasApiKey ? 'success' : 'warning'}>{ocrHasApiKey ? '凭证已配置' : '等待 API Key'}</Badge>}>
              <div className={styles.compactForm}>
                <Field label="提供方式"><Select {...form.register('ocrProvider')}><option value="uapis">UAPIs</option><option value="custom-model">自定义模型</option></Select></Field>
                <Field label="API 地址"><Input {...form.register('ocrBaseUrl')} /></Field>
                <Field label="模型 ID"><Input {...form.register('ocrModelId')} /></Field>
              </div>
            </Surface>
          </div>
          <div className={styles.formActions}><Button variant="primary" type="submit" disabled={save.isPending}>{save.isPending ? <LoaderCircle className={styles.spin} size={15} /> : <Check size={15} />}保存模型配置</Button></div>
        </form>
      </AsyncState>
    </SectionPage>
  )
}
