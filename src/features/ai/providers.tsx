/**
 * AI 服务提供商预设。
 *
 * 所有厂商均兼容 OpenAI Chat Completions API（/chat/completions），
 * 因此后端 `services::ai::call_chat_api` 无需改动，只需在前端预设好
 * provider id / baseUrl / 推荐模型，用户即可一键切换。
 *
 * 图标采用各厂商官方/高辨识度 SVG 的简化单色版（currentColor，24×24），
 * 在设置页与 AI 助手面板顶部展示，保证视觉一致。
 */

export interface AiProviderPreset {
  /** 唯一标识，存入 AppSettings.aiProvider */
  id: string;
  /** 显示名称（走 i18n，回退到该默认名） */
  name: string;
  /** OpenAI 兼容的 API 基础地址（不含 /chat/completions 后缀） */
  baseUrl: string;
  /** 推荐模型，仅作占位提示，用户可自行修改 */
  defaultModel: string;
  /** 获取 API Key 的官方控制台链接 */
  keyUrl: string;
  /** 简短说明（走 i18n） */
  description: string;
  /** 官方品牌色（用于图标圆形背景） */
  color: string;
  /** 品牌 SVG（24x24 viewBox，使用 currentColor） */
  icon: React.ReactNode;
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
} as const;

const OpenAiIcon = (
  <svg {...iconProps} aria-hidden viewBox="0 0 24 24">
    <path
      d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
      fill="currentColor"
    />
  </svg>
);

const SiliconFlowIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M2 12c3-3 6 0 9-3s3 6 9 3M2 16c3-3 6 0 9-3s3 6 9 3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const VolcanoIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 2c1.5 3.5 5.5 6 4.5 11.5-.8 3.2-3 5.5-4.5 6.5-1.5-1-3.7-3.3-4.5-6.5C6.5 8 10.5 5.5 12 2z"
      fill="currentColor"
    />
  </svg>
);

const TencentIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15V7h4v3h3v4h-3v3h-4z"
      fill="currentColor"
    />
  </svg>
);

const DeepSeekIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M4 19.5c.5-5.5 5.5-9 10.5-9 2 0 4 .5 5.5 1.5-1.8-1.8-4.3-3-7-3-5 0-9 3.5-9 8.5 0 1 .2 2 .5 2.9H4z"
      fill="currentColor"
    />
    <path
      d="M15.5 6.5c0-2.5 2.5-4 5-4.5M21 5.5c-1.5 1.5-2 3.5-1 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const MoonshotIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M20.3 15.6A9 9 0 1 1 8.4 3.7a7 7 0 1 0 11.9 11.9z"
      fill="currentColor"
    />
  </svg>
);

const ZhipuIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M6 5h12v3l-6 8h6v3H6v-3l6-8H6V5z"
      fill="currentColor"
    />
  </svg>
);

const OllamaIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 3c-3.8 0-6.8 2.8-7 6.5-.1 1.8.6 3.5 2 4.6V18l5-2.5 5 2.5v-3.9c1.4-1.1 2.1-2.8 2-4.6-.2-3.7-3.2-6.5-7-6.5z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="12" cy="10" r="1.8" fill="currentColor" />
  </svg>
);

const CustomIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M4 7h16M4 12h16M4 17h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const AI_PROVIDERS: AiProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT 系列模型，国际通用',
    color: '#10A37F',
    icon: OpenAiIcon,
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    keyUrl: 'https://cloud.siliconflow.cn/account/ak',
    description: '聚合众多开源模型，国内高速',
    color: '#FF6B35',
    icon: SiliconFlowIcon,
  },
  {
    id: 'volcano',
    name: '火山方舟',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-1-5-lite-32k-250115',
    keyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    description: '字节跳动豆包系列模型',
    color: '#1677FF',
    icon: VolcanoIcon,
  },
  {
    id: 'tencent',
    name: '腾讯混元',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    defaultModel: 'hunyuan-lite',
    keyUrl: 'https://console.cloud.tencent.com/hunyuan/api-key',
    description: '腾讯混元大模型',
    color: '#0052D9',
    icon: TencentIcon,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    description: '深度推理，性价比高',
    color: '#4D6BFE',
    icon: DeepSeekIcon,
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    keyUrl: 'https://platform.moonshot.cn/console/api-keys',
    description: 'Kimi 长上下文模型',
    color: '#161616',
    icon: MoonshotIcon,
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    description: 'GLM 系列通用大模型',
    color: '#3859FF',
    icon: ZhipuIcon,
  },
  {
    id: 'ollama',
    name: 'Ollama（本地）',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
    keyUrl: 'https://ollama.com/download',
    description: '本地离线推理，无需 API Key',
    color: '#6B7280',
    icon: OllamaIcon,
  },
  {
    id: 'custom',
    name: '自定义（OpenAI 兼容）',
    baseUrl: '',
    defaultModel: '',
    keyUrl: '',
    description: '填写任意 OpenAI 兼容端点',
    color: '#7A6B5E',
    icon: CustomIcon,
  },
];

/** 按 id 查找预设，找不到时回退到 custom。 */
export function getProviderPreset(id: string): AiProviderPreset {
  for (const p of AI_PROVIDERS) {
    if (p.id === id) return p;
  }
  for (const p of AI_PROVIDERS) {
    if (p.id === 'custom') return p;
  }
  return AI_PROVIDERS[0]!;
}
