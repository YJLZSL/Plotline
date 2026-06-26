import { cn } from '@/lib/utils';

interface McSwordProps {
  className?: string;
}

export default function McSword({ className }: McSwordProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      aria-label="sword"
      role="img"
    >
      <rect x="7" y="0" width="2" height="1" fill="#E8E8E8" />
      <rect x="6" y="1" width="4" height="1" fill="#F0F0F0" />
      <rect x="5" y="2" width="6" height="1" fill="#E0E0E0" />
      <rect x="4" y="3" width="8" height="1" fill="#D8D8D8" />
      <rect x="3" y="4" width="10" height="1" fill="#D0D0D0" />
      <rect x="2" y="5" width="12" height="1" fill="#C8C8C8" />
      <rect x="1" y="6" width="14" height="1" fill="#C0C0C0" />
      <rect x="7" y="7" width="2" height="1" fill="#A0A0A0" />
      <rect x="7" y="8" width="2" height="1" fill="#909090" />
      <rect x="5" y="9" width="6" height="1" fill="#8B7355" />
      <rect x="7" y="10" width="2" height="2" fill="#7A6548" />
      <rect x="6" y="12" width="4" height="2" fill="#6B5A45" />
      <rect x="6" y="14" width="4" height="2" fill="#5C4A38" />
    </svg>
  );
}
