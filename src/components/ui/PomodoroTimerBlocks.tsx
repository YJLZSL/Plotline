import { BLOCK_COLORS, type BlockType } from './PomodoroTimer.utils';

interface PixelBlockProps {
  blockType: BlockType | null;
  size?: number;
}

export function PixelBlock({ blockType, size = 20 }: PixelBlockProps) {
  if (!blockType) {
    return (
      <svg width={size} height={size} viewBox="0 0 10 10" className="block opacity-50">
        <rect x="0" y="0" width="10" height="10" fill="#4A3728" />
        <rect x="1" y="2" width="2" height="2" fill="#3A2A1E" opacity="0.5" />
        <rect x="6" y="1" width="2" height="2" fill="#3A2A1E" opacity="0.5" />
        <rect x="3" y="6" width="2" height="2" fill="#3A2A1E" opacity="0.5" />
        <rect x="7" y="7" width="2" height="1" fill="#3A2A1E" opacity="0.5" />
        <rect
          x="0"
          y="0"
          width="10"
          height="10"
          fill="none"
          stroke="#2F2418"
          strokeWidth="0.5"
          opacity="0.25"
        />
      </svg>
    );
  }

  const { bg, accent, glint } = BLOCK_COLORS[blockType];

  return (
    <svg width={size} height={size} viewBox="0 0 10 10" className="block">
      <rect x="0" y="0" width="10" height="10" fill={bg} />
      <rect x="1" y="2" width="2" height="2" fill={accent} opacity="0.7" />
      <rect x="6" y="1" width="2" height="2" fill={accent} opacity="0.7" />
      <rect x="3" y="6" width="2" height="2" fill={accent} opacity="0.7" />
      <rect x="7" y="7" width="2" height="1" fill={accent} opacity="0.7" />
      {glint && (
        <>
          <rect x="0" y="0" width="3" height="2" fill={glint} opacity="0.6" />
          <rect x="5" y="5" width="2" height="2" fill={glint} opacity="0.5" />
        </>
      )}
      <rect
        x="0"
        y="0"
        width="10"
        height="10"
        fill="none"
        stroke="#2F2418"
        strokeWidth="0.5"
        opacity="0.25"
      />
    </svg>
  );
}
