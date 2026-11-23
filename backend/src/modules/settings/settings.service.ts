import { readJson, writeJson } from "../../storage.js";
import {
  createScheduledTask,
  listScheduledTasks,
  updateScheduledTask,
} from "../calendar/calendar.schedule.service.js";
import type {
  AgentSettings,
  ImageGenerationSettings,
  LLMApiFormat,
  LLMSettings,
  MorningBriefSettings,
  OcrSettings,
  ModelSettings,
  Settings,
  PublicSettings,
  SettingsPatch,
  UapisSettings,
} from "./settings.types.js";

/** `data/settings.json`。读出来先归一化，不把缺省值写回文件。 */
const FILE = "settings.json";
/** 写在托管定时任务的备注里，用来认出并更新同一条早报任务。 */
const MORNING_BRIEF_TASK_MARKER = "[managed:agent-morning-brief]";
/** 托管早报任务在日历里显示的标题。 */
const MORNING_BRIEF_TASK_TITLE = "每日 Intel Center 早报";

/**
 * 文件缺失或字段无效时使用的缺省值。
 * 图像的协议、尺寸、质量和输出参数没有设置页，生图服务直接读这里的值。
 */
const DEFAULT_SETTINGS: Settings = {
  llm: {
    /** 主模型接口根地址，不含末尾 `/v1`。 */
    baseUrl: "",
    /** 对话、摘要和索引共用的模型 ID。 */
    modelId: "",
    /** 主模型密钥。空字符串表示未配置。 */
    apiKey: "",
    /** 未识别时按地址和模型 ID 推断。 */
    apiFormat: "openai-compatible",
  },
  imageGeneration: {
    /** `openai-compatible` 或 `gemini-native`。MiniMax 由生图服务按地址识别。 */
    apiFormat: "openai-compatible",
    baseUrl: "",
    modelId: "gpt-image-1",
    apiKey: "",
    /** 请求默认尺寸，可被单次生图参数覆盖。 */
    size: "auto",
    quality: "auto",
    background: "auto",
    outputFormat: "png",
    /** JPEG/WebP 压缩率，范围 0–100。 */
    outputCompression: 80,
  },
  ocr: {
    /** `uapis` 用平台密钥；`custom-model` 用下面三项。 */
    provider: "uapis",
    /** 自定义 OCR 根地址。请求时会自行补上 `/v1/chat/completions`。 */
    customBaseUrl: "",
    customModelId: "",
    customApiKey: "",
  },
  uapis: {
    /** 为空时 OCR 和 UAPIs 调用走免费 IP 额度。 */
    apiKey: "",
  },
  agent: {
    /** 附加到系统提示的长期指令。 */
    userPrompt: "",
    /** `read-only` 只读，`default` 敏感操作需确认，`danger-full-access` 直接执行。 */
    permissionProfile: "default",
    morningBrief: {
      enabled: false,
      /** `HH:MM`，按 Asia/Hong_Kong 解释。 */
      time: "09:30",
    },
  },
};

/** 归一化时允许的枚举。不在列表里的值回退到缺省，不抛错。 */
const LLM_API_FORMATS = ["openai-compatible", "anthropic", "gemini"] as const;
const IMAGE_API_FORMATS = ["openai-compatible", "gemini-native"] as const;
const IMAGE_SIZES = ["auto", "1024x1024", "1536x1024", "1024x1536"] as const;
const IMAGE_QUALITIES = ["auto", "low", "medium", "high"] as const;
const IMAGE_BACKGROUNDS = ["auto", "opaque", "transparent"] as const;
const IMAGE_OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;
const OCR_PROVIDERS = ["uapis", "custom-model"] as const;
const PERMISSION_PROFILES = ["read-only", "default", "danger-full-access"] as const;

/** 只接受字符串。空字符串会保留，因此密钥传 `""` 会清空。 */
function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

/** 接受字符串并去掉首尾空白。非字符串用缺省值。 */
function trimmedOr(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim() : fallback;
}

/** 空白字符串视为未填，改用缺省值。用于模型 ID。 */
function nonBlankOr(value: unknown, fallback: string) {
  return trimmedOr(value, "") || fallback;
}

/** 值不在允许列表中时用缺省值。 */
function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** 把数字四舍五入后限制在闭区间内。非法数字用缺省值。 */
function clamped(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

/** 未写 `apiFormat` 时，按地址和模型 ID 判断对话协议。 */
function inferLlmApiFormat(baseUrl: string, modelId: string): LLMApiFormat {
  const sig = `${baseUrl} ${modelId}`.toLowerCase();
  if (sig.includes("anthropic") || sig.includes("claude")) return "anthropic";
  if (
    sig.includes("generativelanguage.googleapis.com") ||
    sig.includes("aiplatform.googleapis.com") ||
    /\bgemini\b/.test(sig)
  )
    return "gemini";
  return "openai-compatible";
}

/** 补齐主模型字段。地址和模型 ID 会 trim，密钥原样保留。 */
function normalizeLlmSettings(llm: Partial<LLMSettings> | undefined): LLMSettings {
  const current = llm ?? {};
  const baseUrl = trimmedOr(current.baseUrl, DEFAULT_SETTINGS.llm.baseUrl);
  const modelId = trimmedOr(current.modelId, DEFAULT_SETTINGS.llm.modelId);
  return {
    baseUrl,
    modelId,
    apiKey: stringOr(current.apiKey, DEFAULT_SETTINGS.llm.apiKey),
    apiFormat: oneOf(current.apiFormat, LLM_API_FORMATS, inferLlmApiFormat(baseUrl, modelId)),
  };
}

/** 补齐生图字段。模型 ID 为空时回到缺省模型，压缩率限制在 0–100。 */
function normalizeImageGenerationSettings(
  imageGeneration: Partial<ImageGenerationSettings> | undefined,
): ImageGenerationSettings {
  const current = imageGeneration ?? {};
  const defaults = DEFAULT_SETTINGS.imageGeneration;
  return {
    apiFormat: oneOf(current.apiFormat, IMAGE_API_FORMATS, defaults.apiFormat),
    baseUrl: stringOr(current.baseUrl, defaults.baseUrl),
    modelId: nonBlankOr(current.modelId, defaults.modelId),
    apiKey: stringOr(current.apiKey, defaults.apiKey),
    size: oneOf(current.size, IMAGE_SIZES, defaults.size),
    quality: oneOf(current.quality, IMAGE_QUALITIES, defaults.quality),
    background: oneOf(current.background, IMAGE_BACKGROUNDS, defaults.background),
    outputFormat: oneOf(current.outputFormat, IMAGE_OUTPUT_FORMATS, defaults.outputFormat),
    outputCompression: clamped(current.outputCompression, 0, 100, defaults.outputCompression),
  };
}

/** 补齐 OCR 字段。自定义模型 ID 为空时回到缺省值，密钥允许为空。 */
function normalizeOcrSettings(ocr: Partial<OcrSettings> | undefined): OcrSettings {
  const current = ocr ?? {};
  const defaults = DEFAULT_SETTINGS.ocr;
  return {
    provider: oneOf(current.provider, OCR_PROVIDERS, defaults.provider),
    customBaseUrl: stringOr(current.customBaseUrl, defaults.customBaseUrl),
    customModelId: nonBlankOr(current.customModelId, defaults.customModelId),
    customApiKey: stringOr(current.customApiKey, defaults.customApiKey),
  };
}

/** 是否为 `HH:MM`，小时 00–23。 */
function isTimeString(value: unknown): value is string {
  return (
    typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim())
  );
}

/** 非法时间或非布尔开关回退到已有早报设置，不改另一项。 */
function normalizeMorningBriefSettings(
  input: unknown,
  fallback: MorningBriefSettings = DEFAULT_SETTINGS.agent.morningBrief,
): MorningBriefSettings {
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Partial<MorningBriefSettings>;

  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
    time: isTimeString(raw.time) ? raw.time.trim() : fallback.time,
  };
}

/** 香港当天日期，格式 `YYYY-MM-DD`。新建早报任务时作为开始日期。 */
function todayInHongKong() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 写入托管定时任务的固定提示词。 */
function buildMorningBriefPrompt() {
  return [
    "请生成今天的 Intel Center 早报。",
    "",
    "执行要求：",
    "- 优先读取并使用已安装的 intel-center Skill。",
    "- 使用 intel_center_collect 采集原始情报；不要用终端手动猜测 Skill 脚本路径。",
    "- 按 Skill 工作流采集新闻、行情与跨政治/金融/科技板块的联动信号。",
    "- 如果需要把结果发往外部通道，必须遵守当前权限和投递配置；本托管任务默认只回写 1052 OS 聊天流与通知中心。",
    "- 输出中文简报，包含核心摘要、分板块观察、市场异常、传导链、风险/机会和主要来源。",
  ].join("\n");
}

/**
 * 把早报开关和时间同步到日历里的托管任务。
 * 已有任务会更新，并保留用户另行配置的外部投递；没有任务时，只有开启才创建。
 * 定时生成目前还不是正在使用的产品能力，这段逻辑保留着，保存早报设置时仍会执行。
 */
async function syncMorningBriefScheduledTask(settings: MorningBriefSettings) {
  const tasks = await listScheduledTasks({ target: "agent", limit: 200 });
  const existing = tasks.find((task) =>
    task.notes.includes(MORNING_BRIEF_TASK_MARKER),
  );
  const input = {
    title: MORNING_BRIEF_TASK_TITLE,
    notes: `${MORNING_BRIEF_TASK_MARKER}\n由 Agent 行为设置管理。外部通道投递默认关闭；需要飞书/微信投递时，请在定时任务中显式配置目标。`,
    target: "agent" as const,
    mode: "ongoing" as const,
    startDate: existing?.startDate ?? todayInHongKong(),
    time: settings.time,
    repeatUnit: "day" as const,
    repeatInterval: 1,
    repeatWeekdays: [],
    endDate: "",
    prompt: buildMorningBriefPrompt(),
    command: "",
    enabled: settings.enabled,
    delivery: existing?.delivery ?? {
      wechat: { mode: "off" as const, accountId: "", peerId: "" },
      feishu: {
        mode: "off" as const,
        receiveIdType: "chat_id" as const,
        receiveId: "",
      },
    },
  };

  if (existing) {
    await updateScheduledTask(existing.id, input);
  } else if (settings.enabled) {
    await createScheduledTask(input);
  }
}

/** 只保留权限、附加指令和早报。其余运行行为不进入设置。 */
function normalizeAgentSettings(agent: Partial<AgentSettings> | undefined): AgentSettings {
  const defaults = DEFAULT_SETTINGS.agent;
  return {
    userPrompt: stringOr(agent?.userPrompt, defaults.userPrompt),
    permissionProfile: oneOf(agent?.permissionProfile, PERMISSION_PROFILES, defaults.permissionProfile),
    morningBrief: normalizeMorningBriefSettings(agent?.morningBrief, defaults.morningBrief),
  };
}

/** UAPIs 密钥。空字符串表示使用免费 IP 额度。 */
function normalizeUapisSettings(uapis: Partial<UapisSettings> | undefined): UapisSettings {
  return { apiKey: stringOr(uapis?.apiKey, DEFAULT_SETTINGS.uapis.apiKey) };
}

/**
 * 去掉页面用不到的内部字段：生图协议与输出参数、OCR 自定义密钥、UAPIs 密钥。
 * `hasApiKey` 由主模型密钥是否为空算出。
 */
function toPublic(settings: Settings): PublicSettings {
  return {
    llm: {
      baseUrl: settings.llm.baseUrl,
      modelId: settings.llm.modelId,
      apiKey: settings.llm.apiKey,
      apiFormat: settings.llm.apiFormat,
      hasApiKey: settings.llm.apiKey.length > 0,
    },
    imageGeneration: {
      baseUrl: settings.imageGeneration.baseUrl,
      modelId: settings.imageGeneration.modelId,
      apiKey: settings.imageGeneration.apiKey,
    },
    agent: settings.agent,
    ocr: {
      provider: settings.ocr.provider,
      customBaseUrl: settings.ocr.customBaseUrl,
      customModelId: settings.ocr.customModelId,
    },
  };
}

/** 未提交主模型补丁时保持原值。提交的空字符串会清空对应字段。 */
function applyLlmPatch(current: LLMSettings, patch: Partial<LLMSettings> | undefined): LLMSettings {
  if (!patch) return current;
  return normalizeLlmSettings({
    ...current,
    ...patch,
    baseUrl: stringOr(patch.baseUrl, current.baseUrl),
    modelId: stringOr(patch.modelId, current.modelId),
    apiKey: stringOr(patch.apiKey, current.apiKey),
  });
}

/** 读取并归一化完整设置。后端服务用这份结果，不直接返回给页面。 */
export async function getSettings(): Promise<Settings> {
  const raw = await readJson<Partial<Settings>>(FILE, {});
  return {
    llm: normalizeLlmSettings(raw.llm),
    imageGeneration: normalizeImageGenerationSettings(raw.imageGeneration),
    ocr: normalizeOcrSettings(raw.ocr),
    agent: normalizeAgentSettings(raw.agent),
    uapis: normalizeUapisSettings(raw.uapis),
  };
}

/** `GET /api/settings`。对话页和今日页用它读取当前模型和权限。 */
export async function getPublicSettings(): Promise<PublicSettings> {
  return toPublic(await getSettings());
}

/**
 * 模型页投影。
 * `hasCredential`：自定义 OCR 看 `customApiKey`，UAPIs OCR 看 `uapis.apiKey`。
 */
export function projectModelSettings(settings: Settings): ModelSettings {
  const pub = toPublic(settings);
  const hasCredential =
    settings.ocr.provider === "custom-model"
      ? settings.ocr.customApiKey.length > 0
      : settings.uapis.apiKey.length > 0;
  return {
    llm: pub.llm,
    imageGeneration: pub.imageGeneration,
    ocr: {
      ...pub.ocr,
      hasCredential,
    },
  };
}

/** `GET /api/settings/models`。 */
export async function getModelSettings(): Promise<ModelSettings> {
  return projectModelSettings(await getSettings());
}

/** Agent 页投影，只有附加指令、权限和早报。 */
export function projectAgentSettings(settings: Settings): AgentSettings {
  return settings.agent;
}

/** `GET /api/settings/agent`。 */
export async function getAgentSettings(): Promise<AgentSettings> {
  return projectAgentSettings(await getSettings());
}

/** `PUT /api/settings/agent`。省略的字段保留，只合并提交的 Agent 字段。 */
export async function updateAgentSettings(
  patch: SettingsPatch["agent"],
): Promise<AgentSettings> {
  return projectAgentSettings(await saveSettings({ agent: patch }));
}

/** `PUT /api/settings/models`。只合并主模型、生图和 OCR，不动 Agent 与 UAPIs。 */
export async function updateModelSettings(
  patch: Pick<SettingsPatch, "llm" | "imageGeneration" | "ocr">,
): Promise<ModelSettings> {
  return projectModelSettings(await saveSettings(patch));
}

/**
 * 唯一写盘路径。先读出当前值再合并，写回完整设置。
 * 密钥字段省略则保留；显式传空字符串则清空。
 * 补丁里带了 `morningBrief` 时，会同步日历里的早报托管任务。
 */
async function saveSettings(patch: SettingsPatch): Promise<Settings> {
  const current = await getSettings();
  const agentPatch = patch.agent ?? {};
  const mergedMorningBrief = agentPatch.morningBrief
    ? normalizeMorningBriefSettings(
        { ...current.agent.morningBrief, ...agentPatch.morningBrief },
        current.agent.morningBrief,
      )
    : current.agent.morningBrief;
  const mergedAgent: Partial<AgentSettings> = {
    ...current.agent,
    ...agentPatch,
    morningBrief: mergedMorningBrief,
  };
  const next: Settings = {
    ...current,
    llm: applyLlmPatch(current.llm, patch.llm),
    imageGeneration: patch.imageGeneration
      ? normalizeImageGenerationSettings({
          ...current.imageGeneration,
          ...patch.imageGeneration,
          apiKey: stringOr(patch.imageGeneration.apiKey, current.imageGeneration.apiKey),
        })
      : current.imageGeneration,
    ocr: normalizeOcrSettings({
      ...current.ocr,
      ...(patch.ocr ?? {}),
      customApiKey: stringOr(patch.ocr?.customApiKey, current.ocr.customApiKey),
    }),
    agent: normalizeAgentSettings(mergedAgent),
    uapis: normalizeUapisSettings({
      apiKey: stringOr(patch.uapis?.apiKey, current.uapis.apiKey),
    }),
  };

  await writeJson(FILE, next);
  if (patch.agent?.morningBrief !== undefined) {
    await syncMorningBriefScheduledTask(next.agent.morningBrief);
  }
  return next;
}

/** `PUT /api/settings`。可同时改多个分区，返回公开投影。 */
export async function updateSettings(patch: SettingsPatch): Promise<PublicSettings> {
  return toPublic(await saveSettings(patch));
}

/** 拼进 Agent 运行上下文的早报偏好，提醒模型不要擅自改外部投递。 */
export function formatMorningBriefRuntimeContext(agent: AgentSettings): string {
  const { enabled, time } = agent.morningBrief;
  return [
    "早报设置：",
    `- 是否启用：${enabled ? "是" : "否"}`,
    `- 期望发送时间：${time}（Asia/Hong_Kong）`,
    "- 用途：生成每日本地 Intel Center 早报，涵盖新闻、市场、跨领域信号、风险、机会和主要来源。",
    "- 默认去向：只回写 1052 OS 聊天流和通知中心。",
    "- 这是用户对每日 Intel Center 早报的偏好。除非用户明确要求修改，或当前权限允许，否则不要创建、修改或发送定时的外部投递。",
  ].join("\n");
}
