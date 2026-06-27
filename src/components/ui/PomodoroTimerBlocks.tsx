import { cn } from '@/lib/utils';
import { BLOCK_COLORS, type BlockType } from './PomodoroTimer.utils';

interface PixelBlockProps {
  blockType: BlockType | null;
  size?: number;
  animated?: boolean;
  'data-testid'?: string;
}

export function PixelBlock({ blockType, size = 20, animated, 'data-testid': testId }: PixelBlockProps) {
  if (!blockType) {
    return (
      <div className="relative inline-block" data-testid={testId}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 10 10"
          className="block opacity-50"
        >
          <rect x="0" y="0" width="10" height="10" fill="#4A3728" />
          <rect x="1" y="2" width="2" height="2" fill="#3A2A1E" opacity="0.5" />
          <rect x="6" y="1" width="2" height="2" fill="#3A2A1E" opacity="0.5" />
          <rect x="3" y="6" width="2" height="2" fill="#3A2A1E" opacity="0.5" />
          <rect x="7" y="7" width="2" height="1" fill="#3A2A1E" opacity="0.5" />
          {/* 3D bevel: top/left lighter, bottom/right darker */}
          <rect x="0" y="0" width="10" height="1" fill="#FFFFFF" opacity="0.12" />
          <rect x="0" y="0" width="1" height="10" fill="#FFFFFF" opacity="0.12" />
          <rect x="0" y="9" width="10" height="1" fill="#000000" opacity="0.2" />
          <rect x="9" y="0" width="1" height="10" fill="#000000" opacity="0.2" />
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
        {animated && (
          <span
            data-testid="block-sparkle"
            className="absolute inset-0 pointer-events-none mc-block-sparkle"
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

  const { bg, accent, glint, shadow } = BLOCK_COLORS[blockType];

  return (
    <div className="relative inline-block" data-testid={testId}>
      <svg width={size} height={size} viewBox="0 0 10 10" className={cn('block', animated && 'mc-block-glint')}>
        <rect x="0" y="0" width="10" height="10" fill={bg} />
        <rect x="1" y="2" width="2" height="2" fill={accent} opacity="0.7" />
        <rect x="6" y="1" width="2" height="2" fill={accent} opacity="0.7" />
        <rect x="3" y="6" width="2" height="2" fill={accent} opacity="0.7" />
        <rect x="7" y="7" width="2" height="1" fill={accent} opacity="0.7" />
        {/* Enhanced 3D bevel */}
        <rect x="0" y="0" width="10" height="1" fill="#FFFFFF" opacity="0.22" />
        <rect x="0" y="0" width="1" height="10" fill="#FFFFFF" opacity="0.22" />
        <rect x="0" y="9" width="10" height="1" fill="#000000" opacity="0.28" />
        <rect x="9" y="0" width="1" height="10" fill="#000000" opacity="0.28" />
        {shadow && (
          <>
            <rect x="1" y="8" width="8" height="1" fill={shadow} opacity="0.35" />
            <rect x="8" y="1" width="1" height="8" fill={shadow} opacity="0.35" />
          </>
        )}
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
      {animated && (
        <span
          data-testid="block-sparkle"
          className="absolute inset-0 pointer-events-none mc-block-sparkle"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
