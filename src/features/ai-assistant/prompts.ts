import type { AiAgent, AiAgentId } from '@/types';

const BASE_SYSTEM_PROMPT =
  '你是 Plotline 的 AI 创作助手，熟悉叙事写作、角色塑造、大纲结构和视觉小说。请用中文简洁回答，并使用 Markdown 格式（**粗体**、*斜体*、`代码`、列表、标题、引用）以便界面正确渲染。';

export const AI_AGENTS: AiAgent[] = [
  {
    id: 'chat',
    labelKey: 'aiAssistant.agentChat',
    descriptionKey: 'aiAssistant.agentChatDesc',
    icon: 'MessageSquare',
    systemPrompt: BASE_SYSTEM_PROMPT,
  },
  {
    id: 'continue',
    labelKey: 'aiAssistant.agentContinue',
    descriptionKey: 'aiAssistant.agentContinueDesc',
    icon: 'PenLine',
    systemPrompt:
      '你擅长续写与扩展。请基于提供的上下文，以相同的叙事风格和人物设定续写内容。保持情节连贯、语气一致，并给出 1-3 个可延续的段落。',
  },
  {
    id: 'brainstorm',
    labelKey: 'aiAssistant.agentBrainstorm',
    descriptionKey: 'aiAssistant.agentBrainstormDesc',
    icon: 'Lightbulb',
    systemPrompt:
      '你擅长创意脑暴。请围绕用户主题发散出多个有戏剧张力的创意方向，每个方向包含核心冲突、潜在场景和可发展的角色动机。',
  },
  {
    id: 'check',
    labelKey: 'aiAssistant.agentCheck',
    descriptionKey: 'aiAssistant.agentCheckDesc',
    icon: 'ShieldCheck',
    systemPrompt:
      '你擅长逻辑查漏。请仔细检查提供的时间轴、角色设定、地点与大纲之间是否存在矛盾、漏洞或时间冲突，并以清单形式列出发现的问题与修改建议。',
  },
  {
    id: 'polish',
    labelKey: 'aiAssistant.agentPolish',
    descriptionKey: 'aiAssistant.agentPolishDesc',
    icon: 'Sparkles',
    systemPrompt:
      '你擅长润色文字。请优化用户提供的文本，使其文笔更流畅、画面感更强，同时保留原意、人称与关键设定。可给出修改说明。',
  },
  {
    id: 'relationships',
    labelKey: 'aiAssistant.agentRelationships',
    descriptionKey: 'aiAssistant.agentRelationshipsDesc',
    icon: 'Users',
    systemPrompt:
      '你擅长分析角色关系。请基于角色档案、事件与大纲，梳理角色之间的情感、利益与冲突关系，并提出可增强戏剧张力的关系建议。',
  },
  {
    id: 'styleTransfer',
    labelKey: 'aiAssistant.agentStyleTransfer',
    descriptionKey: 'aiAssistant.agentStyleTransferDesc',
    icon: 'Palette',
    systemPrompt:
      '你擅长文风迁移。请将用户提供的内容改写成指定风格（如古典、现代、悬疑、轻松、影视化等），保留原意与情节，并在开头说明所使用的风格特征。',
  },
];

export function getAgentById(id: AiAgentId): AiAgent {
  return AI_AGENTS.find((agent) => agent.id === id) ?? AI_AGENTS[0]!;
}

export function getAgentSystemPrompt(id: AiAgentId): string {
  return getAgentById(id).systemPrompt;
}
