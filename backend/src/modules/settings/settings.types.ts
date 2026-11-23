/**
 * 设置类型分两层：
 * - `Settings` 和各 `*Settings` 写入 data/settings.json，后端服务直接读取。
 * - `PublicSettings` 和 `ModelSettings` 是接口返回给页面的投影，只保留页面会读的字段。
 */

/** 对话请求协议，决定走 OpenAI 兼容、Anthropic 还是 Gemini 适配器。 */
export type LLMApiFormat = "openai-compatible" | "anthropic" | "gemini";

/** 页面上配置的唯一主模型。对话、摘要和索引都直接使用这一份。 */
export type LLMSettings = {
  baseUrl: string;
  modelId: string;
  apiKey: string;
  apiFormat: LLMApiFormat;
};

/**
 * 图像生成配置。页面只编辑地址、模型 ID 和密钥。
 * 协议、尺寸、质量和输出参数由生图服务读取。
 */
export type ImageGenerationSettings = {
  /** OpenAI 图像接口，或 Gemini 原生接口。MiniMax 按地址单独识别。 */
  apiFormat: "openai-compatible" | "gemini-native";
  baseUrl: string;
  modelId: string;
  apiKey: string;
  size: "auto" | "1024x1024" | "1536x1024" | "1024x1536";
  quality: "auto" | "low" | "medium" | "high";
  background: "auto" | "opaque" | "transparent";
  outputFormat: "png" | "jpeg" | "webp";
  outputCompression: number;
};

export type AgentPermissionProfile =
  | "read-only"
  | "default"
  | "danger-full-access";

export type MorningBriefSettings = {
  enabled: boolean;
  /** HH:MM，按 Asia/Hong_Kong 解释。 */
  time: string;
};

/** Agent 可配置项。流式输出、检查点、缓存和自动压缩始终开启，不写入设置。 */
export type AgentSettings = {
  userPrompt: string;
  permissionProfile: AgentPermissionProfile;
  morningBrief: MorningBriefSettings;
};

/**
 * OCR 配置。
 * provider 为 uapis 时使用 UapisSettings.apiKey；
 * 为 custom-model 时使用下面的自定义地址、模型和密钥。
 */
export type OcrSettings = {
  provider: "uapis" | "custom-model";
  customBaseUrl: string;
  customModelId: string;
  /** 自定义模型的 Bearer 令牌。模型页没有输入框，保存时省略则保留原值。 */
  customApiKey: string;
};

/** UAPIs 平台密钥。为空时走免费 IP 额度。 */
export type UapisSettings = {
  apiKey: string;
};

/** data/settings.json 的完整结构。 */
export type Settings = {
  llm: LLMSettings;
  imageGeneration: ImageGenerationSettings;
  ocr: OcrSettings;
  agent: AgentSettings;
  uapis: UapisSettings;
};

export type PublicSettings = {
  llm: {
    baseUrl: string;
    modelId: string;
    apiKey: string;
    apiFormat: LLMApiFormat;
    /** 主模型凭证徽章。由 apiKey 是否为空算出。 */
    hasApiKey: boolean;
  };
  /** 不含协议、尺寸和质量，那些字段只给生图服务用。 */
  imageGeneration: {
    baseUrl: string;
    modelId: string;
    apiKey: string;
  };
  agent: AgentSettings;
  /** 不含 customApiKey。 */
  ocr: {
    provider: OcrSettings["provider"];
    customBaseUrl: string;
    customModelId: string;
  };
};

/** GET/PUT /api/settings/models 使用的模型页投影。 */
export type ModelSettings = {
  llm: PublicSettings["llm"];
  imageGeneration: PublicSettings["imageGeneration"];
  ocr: PublicSettings["ocr"] & {
    /** 自定义模型看 customApiKey，其余看 uapis.apiKey。 */
    hasCredential: boolean;
  };
};

/**
 * 部分更新。
 * 密钥字段传空字符串会清空；省略该字段则保留原值。
 */
export type SettingsPatch = {
  llm?: Partial<LLMSettings>;
  imageGeneration?: Partial<ImageGenerationSettings>;
  ocr?: Partial<OcrSettings>;
  agent?: Partial<Omit<AgentSettings, "morningBrief">> & {
    morningBrief?: Partial<MorningBriefSettings>;
  };
  uapis?: Partial<UapisSettings>;
};
