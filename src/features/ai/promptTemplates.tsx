import {
  Building2,
  Heart,
  MessageCircleQuestion,
  Search,
  Wand2,
  Zap,
} from 'lucide-react';

export interface AiStyleTemplate {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  template: string;
  systemPrompt: string;
}

export const AI_STYLE_TEMPLATES: AiStyleTemplate[] = [
  {
    id: 'fantasy',
    labelKey: 'ai.styleFantasy',
    icon: <Wand2 className="h-3.5 w-3.5" />,
    template:
      '生成一段玄幻风格的场景描写，包含修炼、法宝或异兽元素。',
    systemPrompt:
      '请用玄幻/仙侠风格回答，强调修炼体系、法宝、异兽、宗门等世界观元素，文字瑰丽有画面感。',
  },
  {
    id: 'urban',
    labelKey: 'ai.styleUrban',
    icon: <Building2 className="h-3.5 w-3.5" />,
    template:
      '生成一段都市背景的情节，贴近现实职场或校园生活。',
    systemPrompt:
      '请用都市现实主义风格回答，贴近当代职场、校园或日常生活，语言自然、有代入感。',
  },
  {
    id: 'romance',
    labelKey: 'ai.styleRomance',
    icon: <Heart className="h-3.5 w-3.5" />,
    template:
      '生成一段言情互动，突出人物情感张力与细腻对话。',
    systemPrompt:
      '请用言情风格回答，注重人物情感刻画、细腻心理描写与含蓄或深情的对话。',
  },
  {
    id: 'suspense',
    labelKey: 'ai.styleSuspense',
    icon: <Search className="h-3.5 w-3.5" />,
    template:
      '生成一段悬疑情节，留下关键线索与反转钩子。',
    systemPrompt:
      '请用悬疑推理风格回答，擅长铺设线索、营造紧张氛围、设计出人意料的反转。',
  },
  {
    id: 'fanqie',
    labelKey: 'ai.styleFanqie',
    icon: <Zap className="h-3.5 w-3.5" />,
    template:
      '生成一段快节奏爽文情节，三章一打脸，十章一高潮。',
    systemPrompt:
      '请用番茄小说爽文风格回答，节奏极快、冲突密集、打脸频繁、爽点突出，语言直白有冲击力。',
  },
  {
    id: 'zhihu',
    labelKey: 'ai.styleZhihu',
    icon: <MessageCircleQuestion className="h-3.5 w-3.5" />,
    template:
      '以第一人称「我」写一段强钩子开头，吸引读者继续阅读。',
    systemPrompt:
      '请用知乎盐选/第一人称故事风格回答，以「我」的视角切入，开头强钩子、情节反转、结尾余味。',
  },
];
