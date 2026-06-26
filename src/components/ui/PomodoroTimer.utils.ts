export type BlockType =
  | 'dirt'
  | 'cobble'
  | 'coal'
  | 'iron'
  | 'gold'
  | 'diamond'
  | 'obsidian'
  | 'emerald'
  | 'enchanted';

export const BLOCK_COLORS: Record<
  BlockType,
  { bg: string; accent: string; glint?: string }
> = {
  dirt: { bg: '#6D4C33', accent: '#5D4037' },
  cobble: { bg: '#8A9BA5', accent: '#7D8B93' },
  coal: { bg: '#3A3A3A', accent: '#2D2D2D' },
  iron: { bg: '#D0D0D0', accent: '#B0B0B0' },
  gold: { bg: '#F0C840', accent: '#D4A820' },
  diamond: { bg: '#73A8B5', accent: '#5CC5C5' },
  obsidian: { bg: '#2D1B4E', accent: '#1A1030' },
  emerald: { bg: '#3E9E5C', accent: '#2E8B4E' },
  enchanted: { bg: '#1A1030', accent: '#5A3D8A', glint: '#D8C4FF' },
};

export function getBlockType(
  index: number,
  total: number,
  progress: number,
): BlockType | null {
  const filledThreshold = Math.floor(progress * total);
  if (index >= filledThreshold) return null;

  const ratio = index / total;
  if (ratio < 0.15) return 'dirt';
  if (ratio < 0.3) return 'cobble';
  if (ratio < 0.45) return 'coal';
  if (ratio < 0.6) return 'iron';
  if (ratio < 0.75) return 'gold';
  if (ratio < 0.9) return 'diamond';
  return 'obsidian';
}

export function getAchievementBlockType(sessionNumber: number): BlockType {
  if (sessionNumber % 8 === 0) return 'enchanted';
  if (sessionNumber % 4 === 0) return 'emerald';
  if (sessionNumber <= 3) return 'dirt';
  if (sessionNumber <= 6) return 'cobble';
  if (sessionNumber <= 8) return 'iron';
  if (sessionNumber === 9) return 'gold';
  return 'diamond';
}
