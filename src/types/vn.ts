export type VnLineType = 'dialog' | 'narration' | 'choice';
export type VnEmotion = '' | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';

export interface VnScene {
  id: string;
  workspaceId: string;
  title: string;
  background: string;
  backgroundAssetPath: string | null;
  bgmPath: string | null;
  outlineNodeId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VnLine {
  id: string;
  sceneId: string;
  sortOrder: number;
  lineType: VnLineType;
  characterId: string | null;
  speakerName: string;
  text: string;
  emotion: VnEmotion;
  choiceLabel: string;
  choiceTargetSceneId: string | null;
  spriteAssetPath: string | null;
  voicePath: string | null;
  createdAt: string;
}

export interface CreateVnSceneInput {
  workspaceId: string;
  title: string;
  background?: string;
  backgroundAssetPath?: string | null;
  bgmPath?: string | null;
  outlineNodeId?: string | null;
}

export interface UpdateVnSceneInput {
  id: string;
  title?: string;
  background?: string;
  backgroundAssetPath?: string | null;
  bgmPath?: string | null;
  outlineNodeId?: string | null;
  sortOrder?: number;
}

export interface CreateVnLineInput {
  sceneId: string;
  lineType?: VnLineType;
  characterId?: string | null;
  speakerName?: string;
  text?: string;
  emotion?: VnEmotion;
  choiceLabel?: string;
  choiceTargetSceneId?: string | null;
  spriteAssetPath?: string | null;
  voicePath?: string | null;
}

export interface UpdateVnLineInput {
  id: string;
  lineType?: VnLineType;
  characterId?: string | null;
  speakerName?: string;
  text?: string;
  emotion?: VnEmotion;
  choiceLabel?: string;
  choiceTargetSceneId?: string | null;
  spriteAssetPath?: string | null;
  voicePath?: string | null;
  sortOrder?: number;
}
