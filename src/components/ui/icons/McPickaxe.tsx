import { cn } from '@/lib/utils';

interface McPickaxeProps {
  className?: string;
}

export default function McPickaxe({ className }: McPickaxeProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      aria-label="pickaxe"
      role="img"
    >
      <rect x="6" y="0" width="4" height="2" fill="#A0A0A0" />
      <rect x="4" y="2" width="8" height="2" fill="#B0B0B0" />
      <rect x="2" y="4" width="12" height="2" fill="#909090" />
      <rect x="0" y="6" width="4" height="2" fill="#808080" />
      <rect x="12" y="6" width="4" height="2" fill="#808080" />
      <rect x="7" y="6" width="2" height="2" fill="#6B5A45" />
      <rect x="7" y="8" width="2" height="2" fill="#8B7355" />
      <rect x="6" y="10" width="4" height="2" fill="#7A6548" />
      <rect x="6" y="12" width="4" height="2" fill="#6B5A45" />
      <rect x="6" y="14" width="4" height="2" fill="#5C4A38" />
    </svg>
  );
}
