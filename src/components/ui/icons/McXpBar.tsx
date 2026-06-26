import { cn } from '@/lib/utils';

interface McXpBarProps {
  progress: number;
  className?: string;
}

export default function McXpBar({ progress, className }: McXpBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const totalSegments = 10;
  const filledSegments = Math.round((clamped / 100) * totalSegments);

  return (
    <svg
      viewBox="0 0 64 8"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      aria-label="experience bar"
      role="img"
    >
      <rect x="0" y="0" width="64" height="8" fill="#2E4A2E" />
      {Array.from({ length: totalSegments }).map((_, i) => {
        const x = i * 6 + 1;
        const isFilled = i < filledSegments;
        return (
          <rect
            key={i}
            x={x}
            y="1"
            width="4"
            height="6"
            fill={isFilled ? '#88FF20' : '#1A301A'}
          />
        );
      })}
      <rect x="0" y="0" width="64" height="1" fill="#5C8A5C" opacity="0.4" />
      <rect x="0" y="7" width="64" height="1" fill="#1A301A" opacity="0.5" />
    </svg>
  );
}
