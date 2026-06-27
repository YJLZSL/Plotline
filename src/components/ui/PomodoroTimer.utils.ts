export type BlockType =
  | 'dirt'
  | 'cobble'
  | 'coal'
  | 'iron'
  | 'gold'
  | 'diamond'
  | 'obsidian'
  | 'emerald'
  | 'enchanted'
  | 'redstone';

export const BLOCK_COLORS: Record<
  BlockType,
  { bg: string; accent: string; glint?: string; shadow?: string }
> = {
  dirt: { bg: '#6D4C33', accent: '#5D4037', shadow: '#4A3728' },
  cobble: { bg: '#8A9BA5', accent: '#7D8B93', shadow: '#5A6A72' },
  coal: { bg: '#3A3A3A', accent: '#2D2D2D', shadow: '#1A1A1A' },
  iron: { bg: '#D0D0D0', accent: '#B0B0B0', shadow: '#808080' },
  gold: { bg: '#F0C840', accent: '#D4A820', glint: '#FFF5C0', shadow: '#B09020' },
  diamond: { bg: '#73A8B5', accent: '#5CC5C5', glint: '#C0F5FF', shadow: '#4A7A85' },
  obsidian: { bg: '#2D1B4E', accent: '#1A1030', glint: '#6A4FC4', shadow: '#140A24' },
  emerald: { bg: '#3E9E5C', accent: '#2E8B4E', glint: '#9AFFB8', shadow: '#256B3A' },
  enchanted: { bg: '#1A1030', accent: '#5A3D8A', glint: '#D8C4FF', shadow: '#0D0818' },
  redstone: { bg: '#D4655A', accent: '#B05045', glint: '#FFB8B0', shadow: '#8F3A32' },
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
  if (sessionNumber % 4 === 0) return 'diamond';
  if (sessionNumber <= 3) return 'dirt';
  if (sessionNumber <= 6) return 'cobble';
  if (sessionNumber <= 8) return 'iron';
  if (sessionNumber === 9) return 'gold';
  return 'diamond';
}

// Weighted rare drops: lower index = more common, higher index = rarer.
const RARE_BLOCK_WEIGHTS: { type: BlockType; weight: number }[] = [
  { type: 'redstone', weight: 30 },
  { type: 'obsidian', weight: 22 },
  { type: 'gold', weight: 18 },
  { type: 'emerald', weight: 14 },
  { type: 'diamond', weight: 10 },
  { type: 'enchanted', weight: 6 },
];

const TOTAL_RARE_WEIGHT = RARE_BLOCK_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

export const RARITY_TIERS: Record<BlockType, number> = {
  dirt: 0,
  cobble: 0,
  coal: 1,
  iron: 1,
  gold: 2,
  redstone: 2,
  obsidian: 3,
  emerald: 3,
  diamond: 4,
  enchanted: 5,
};

export function getRandomRareBlockType(): BlockType {
  const roll = Math.random() * TOTAL_RARE_WEIGHT;
  let cumulative = 0;
  for (const { type, weight } of RARE_BLOCK_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return type;
  }
  return RARE_BLOCK_WEIGHTS[RARE_BLOCK_WEIGHTS.length - 1]!.type;
}

/**
 * Pick a random filled block whose rarity tier is at least 3 (obsidian/diamond).
 * Returns `null` when no filled block is rare enough.
 */
export function getRandomRareFilledBlockIndex(
  total: number,
  progress: number,
  random: () => number = Math.random,
): number | null {
  const filledThreshold = Math.floor(progress * total);
  const rareIndices: number[] = [];
  for (let i = 0; i < filledThreshold; i += 1) {
    const type = getBlockType(i, total, progress);
    if (type && RARITY_TIERS[type] >= 3) {
      rareIndices.push(i);
    }
  }
  if (rareIndices.length === 0) return null;
  return rareIndices[Math.floor(random() * rareIndices.length)]!;
}
