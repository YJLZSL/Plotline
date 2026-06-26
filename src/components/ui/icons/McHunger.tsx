import { cn } from '@/lib/utils';

interface McHungerProps {
  className?: string;
}

export default function McHunger({ className }: McHungerProps) {
  return (
    <svg
      viewBox="0 0 8 8"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      aria-label="hunger"
      role="img"
    >
      <rect x="1" y="0" width="6" height="1" fill="#D49A6C" />
      <rect x="0" y="1" width="8" height="1" fill="#D49A6C" />
      <rect x="0" y="2" width="2" height="2" fill="#A07050" />
      <rect x="6" y="2" width="2" height="2" fill="#A07050" />
      <rect x="2" y="2" width="4" height="2" fill="#E8B080" />
      <rect x="1" y="4" width="6" height="1" fill="#C48A5C" />
      <rect x="2" y="5" width="4" height="1" fill="#B47A50" />
      <rect x="3" y="6" width="2" height="2" fill="#A07050" />
    </svg>
  );
}
