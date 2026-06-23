/**
 * AI 服务提供商预设。
 *
 * 所有厂商均兼容 OpenAI Chat Completions API（/chat/completions），
 * 因此后端 `services::ai::call_chat_api` 无需改动，只需在前端预设好
 * provider id / baseUrl / 推荐模型，用户即可一键切换。
 *
 * 图标来自 LobeHub 开源图标库 @lobehub/icons-static-svg（MIT 许可），
 * 抓取各厂商官方/高辨识度 SVG 后以内联组件方式使用，保持 currentColor
 * 染色，在设置页与 AI 助手面板顶部展示。
 */

import {
  CustomIcon,
  DeepseekIcon,
  MoonshotIcon,
  OllamaIcon,
  OpenaiIcon,
  SiliconflowIcon,
  TencentIcon,
  VolcanoIcon,
  ZhipuIcon,
} from './providerIcons';

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

export const AI_PROVIDERS: AiProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT 系列模型，国际通用',
    color: '#10A37F',
    icon: <OpenaiIcon />,
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    keyUrl: 'https://cloud.siliconflow.cn/account/ak',
    description: '聚合众多开源模型，国内高速',
    color: '#FF6B35',
    icon: <SiliconflowIcon />,
  },
  {
    id: 'volcano',
    name: '火山方舟',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-1-5-lite-32k-250115',
    keyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    description: '字节跳动豆包系列模型',
    color: '#1677FF',
    icon: <VolcanoIcon />,
  },
  {
    id: 'tencent',
    name: '腾讯混元',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    defaultModel: 'hunyuan-lite',
    keyUrl: 'https://console.cloud.tencent.com/hunyuan/api-key',
    description: '腾讯混元大模型',
    color: '#0052D9',
    icon: <TencentIcon />,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    description: '深度推理，性价比高',
    color: '#4D6BFE',
    icon: <DeepseekIcon />,
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    keyUrl: 'https://platform.moonshot.cn/console/api-keys',
    description: 'Kimi 长上下文模型',
    color: '#161616',
    icon: <MoonshotIcon />,
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    description: 'GLM 系列通用大模型',
    color: '#3859FF',
    icon: <ZhipuIcon />,
  },
  {
    id: 'ollama',
    name: 'Ollama（本地）',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
    keyUrl: 'https://ollama.com/download',
    description: '本地离线推理，无需 API Key',
    color: '#6B7280',
    icon: <OllamaIcon />,
  },
  {
    id: 'custom',
    name: '自定义（OpenAI 兼容）',
    baseUrl: '',
    defaultModel: '',
    keyUrl: '',
    description: '填写任意 OpenAI 兼容端点',
    color: '#7A6B5E',
    icon: <CustomIcon />,
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
