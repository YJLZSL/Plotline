/**
 * AI 服务提供商预设。
 *
 * 所有厂商均兼容 OpenAI Chat Completions API（/chat/completions），
 * 因此后端 `services::ai::call_chat_api` 无需改动，只需在前端预设好
 * provider id / baseUrl / 推荐模型，用户即可一键切换。
 *
 * 图标采用各厂商官方 SVG 的简化版（单色 currentColor），
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
  /** 官方标志的简化单色 SVG（24x24 viewBox，使用 currentColor） */
  icon: React.ReactNode;
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
} as const;

/**
 * 内联品牌图标。均为各厂商官方 logo 的简化矢量版，
 * 统一使用 currentColor 以适配明暗主题。
 */
const OpenAiIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 2 L14.5 7 L20 8 L16 12 L17 18 L12 15.5 L7 18 L8 12 L4 8 L9.5 7 Z"
      fill="currentColor"
    />
  </svg>
);

const SiliconFlowIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M8 4 Q4 8 8 12 Q12 16 16 12 Q20 8 16 4 Q12 0 8 4 Z M9 20 L15 20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="8" r="2.5" fill="currentColor" />
  </svg>
);

const VolcanoIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 3 L20 19 L4 19 Z M12 8 L16 17 L8 17 Z"
      fill="currentColor"
    />
  </svg>
);

const TencentIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 3 C7 3 4 6 4 10 C4 13 6 15 9 16 L8 20 L12 18 L16 20 L15 16 C18 15 20 13 20 10 C20 6 17 3 12 3 Z M9.5 9 Q12 7 14.5 9 M9 12 Q12 14 15 12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DeepSeekIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 2 L12 12 M12 12 Q8 12 6 15 M12 12 Q16 12 18 15 M12 12 Q12 16 10 20 M12 12 Q12 16 14 20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MoonshotIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M19 13 A7 7 0 0 1 10 4 A7 7 0 1 0 19 13 Z"
      fill="currentColor"
    />
  </svg>
);

const ZhipuIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 3 L13.5 9.5 L20 11 L13.5 12.5 L12 19 L10.5 12.5 L4 11 L10.5 9.5 Z"
      fill="currentColor"
    />
  </svg>
);

const OllamaIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 3 Q7 3 7 9 Q7 14 9 17 Q10 19 12 19 Q14 19 15 17 Q17 14 17 9 Q17 3 12 3 Z M10 10 L10 10.5 M14 10 L14 10.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 14 Q12 15 15 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CustomIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M4 6 L20 6 M4 12 L20 12 M4 18 L14 18"
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
