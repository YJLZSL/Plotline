/**
 * 时间轴首次使用空状态插画。
 * 使用暖色调的极简时间轴意象：轨道、事件节点与.today 标记。
 */
export function TimelineEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="120"
      height="80"
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 背景底板 */}
      <rect x="4" y="8" width="112" height="64" rx="8" className="fill-bg-elevated" />

      {/* 轨道 1 */}
      <rect x="16" y="22" width="88" height="14" rx="4" className="fill-bg-surface" />
      <rect x="20" y="24" width="28" height="10" rx="3" fill="#F4B6C2" />
      <rect x="52" y="24" width="22" height="10" rx="3" fill="#B6D4F4" />
      <rect x="78" y="24" width="20" height="10" rx="3" fill="#B6F4C8" />

      {/* 轨道 2 */}
      <rect x="16" y="42" width="88" height="14" rx="4" className="fill-bg-surface" />
      <rect x="20" y="44" width="24" height="10" rx="3" fill="#F4E4B6" />
      <rect x="48" y="44" width="30" height="10" rx="3" fill="#D8B6F4" />

      {/* 今天标记 */}
      <line x1="62" y1="14" x2="62" y2="66" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
      <circle cx="62" cy="14" r="4" fill="var(--accent)" />
    </svg>
  );
}
