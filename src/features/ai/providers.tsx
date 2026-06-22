/**
 * AI 服务提供商预设。
 *
 * 所有厂商均兼容 OpenAI Chat Completions API（/chat/completions），
 * 因此后端 `services::ai::call_chat_api` 无需改动，只需在前端预设好
 * provider id / baseUrl / 推荐模型，用户即可一键切换。
 *
 * 图标采用各厂商官方/高辨识度 SVG 的简化单色版（currentColor），
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
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 2l8.66 5v10L12 22 3.34 17V7L12 2z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M12 7l4.33 2.5v5L12 17 7.67 14.5v-5L12 7z"
      fill="currentColor"
    />
  </svg>
);

const SiliconFlowIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M2 12c4-4 8 0 12-4s4 8 8 4M2 16c4-4 8 0 12-4s4 8 8 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const VolcanoIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M12 3c2 4 6 6 5 11-1 3-3 5-5 6-2-1-4-3-5-6-1-5 3-7 5-11z"
      fill="currentColor"
    />
  </svg>
);

const TencentIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM7 11h10v2H7v-2z"
      fill="currentColor"
    />
  </svg>
);

const DeepSeekIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M4 20c0-6 5-10 10-10 2 0 4 .5 6 1.5-2-1.5-4.5-2.5-7-2.5-4 0-7 3-7 7 0 1.5.5 2.8 1.5 4H4z"
      fill="currentColor"
    />
    <path
      d="M14 7c0-2 1.5-3.5 3.5-4M18 6c-1.5 1-2 3-1 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
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
      d="M12 3c-4 0-7 3-7 7 0 2 1 4 3 5v3l4-2 4 2v-3c2-1 3-3 3-5 0-4-3-7-7-7z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2" fill="currentColor" />
  </svg>
);

const CustomIcon = (
  <svg {...iconProps} aria-hidden>
    <path
      d="M4 6h16M4 12h10M4 18h16"
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
