import { cn } from '@/lib/utils';

interface McHeartProps {
  className?: string;
}

export default function McHeart({ className }: McHeartProps) {
  return (
    <svg
      viewBox="0 0 8 8"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      aria-label="heart"
      role="img"
    >
      <rect x="2" y="1" width="1" height="1" fill="#FF6666" />
      <rect x="5" y="1" width="1" height="1" fill="#FF6666" />
      <rect x="1" y="2" width="6" height="1" fill="#FF4444" />
      <rect x="0" y="3" width="8" height="2" fill="#E53935" />
      <rect x="1" y="5" width="6" height="1" fill="#D32F2F" />
      <rect x="2" y="6" width="4" height="1" fill="#C62828" />
      <rect x="3" y="7" width="2" height="1" fill="#B71C1C" />
    </svg>
  );
}
