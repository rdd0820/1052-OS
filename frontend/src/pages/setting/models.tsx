import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle } from 'lucide-react'
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
})

type ModelForm = z.infer<typeof modelFormSchema>

export default function ModelsSettings() {
  const client = useQueryClient()
  const settings = useQuery({ queryKey: ['settings', 'models'], queryFn: settingsApi.getModels })
  const form = useForm<ModelForm>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: { baseUrl: '', modelId: '', apiFormat: 'openai-compatible', apiKey: '', imageBaseUrl: '', imageModelId: '', imageApiKey: '', ocrProvider: 'uapis', ocrBaseUrl: '', ocrModelId: '' },
  })

  useEffect(() => {
    if (!settings.data) return
    const { llm, imageGeneration, ocr } = settings.data
    form.reset({
      baseUrl: llm.baseUrl,
      modelId: llm.modelId,
      apiFormat: llm.apiFormat,
      apiKey: llm.apiKey,
      imageBaseUrl: imageGeneration.baseUrl,
      imageModelId: imageGeneration.modelId,
      imageApiKey: imageGeneration.apiKey,
      ocrProvider: ocr.provider,
      ocrBaseUrl: ocr.customBaseUrl,
      ocrModelId: ocr.customModelId,
    })
  }, [form, settings.data])

  const llmHasApiKey = Boolean(settings.data?.llm.hasApiKey)
  const imageHasApiKey = Boolean(settings.data?.imageGeneration.apiKey)
  const ocrHasApiKey = Boolean(settings.data?.ocr.hasCredential)

  const refreshSharedSettings = () => client.invalidateQueries({ queryKey: ['settings'] })
  const save = useMutation({
    mutationFn: (value: ModelForm) => settingsApi.updateModels({
      llm: {
        baseUrl: value.baseUrl,
        modelId: value.modelId,
        apiFormat: value.apiFormat,
        apiKey: value.apiKey ?? '',
      },
      imageGeneration: { baseUrl: value.imageBaseUrl, modelId: value.imageModelId, apiKey: value.imageApiKey ?? '' },
      ocr: { provider: value.ocrProvider, customBaseUrl: value.ocrBaseUrl, customModelId: value.ocrModelId },
    }),
    onSuccess: (data) => {
      client.setQueryData(['settings', 'models'], data)
      void refreshSharedSettings()
    },
  })

  return (
    <SectionPage>
      <AsyncState loading={settings.isLoading} error={settings.error}>
        <form className={styles.settingsStack} onSubmit={form.handleSubmit((value) => save.mutate(value))}>
          <Surface title="主模型" action={<Badge tone={llmHasApiKey ? 'success' : 'warning'}>{llmHasApiKey ? '凭证已配置' : '等待 API Key'}</Badge>}>
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
