/**
 * 统一空状态插画（v5.0）。
 * 暖色故事书 + 羽毛笔 + 星火意象，供各视图空状态复用。
 */
export function EmptyStateIllustration({
  className,
  variant = 'story',
}: {
  className?: string;
  variant?: 'story' | 'network';
}) {
  return (
    <svg
      className={className}
      width="120"
      height="80"
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid="empty-state-illustration"
    >
      <rect x="6" y="8" width="108" height="64" rx="12" className="fill-bg-elevated" />

      {variant === 'story' ? (
        <>
          {/* 翻开的书 */}
          <path
            d="M60 22C51 17.5 39 17.5 30 22V55C39 50.5 51 50.5 60 55C69 50.5 81 50.5 90 55V22C81 17.5 69 17.5 60 22Z"
            fill="var(--accent)"
            opacity="0.16"
          />
          <path
            d="M60 22V55M60 22C51 17.5 39 17.5 30 22V55M60 22C69 17.5 81 17.5 90 22V55"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="38" y1="32" x2="52" y2="31" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          <line x1="38" y1="40" x2="52" y2="39" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          {/* 羽毛笔 */}
          <path
            d="M88 24C84 30 78 38 74 45L83 54L92 45C88 39 87 31 88 24Z"
            fill="#F4B6C2"
            opacity="0.9"
          />
          <path d="M88 24C88 30 87 36 86 42" stroke="#C68A3E" strokeWidth="1.5" strokeLinecap="round" />
          {/* 星火 */}
          <path d="M26 62L28 67L33 69L28 71L26 76L24 71L19 69L24 67L26 62Z" fill="#F4E4B6" />
          <circle cx="95" cy="62" r="3" fill="#D8B6F4" opacity="0.8" />
        </>
      ) : (
        <>
          {/* 关系网络 */}
          <circle cx="32" cy="34" r="8" fill="#F4B6C2" />
          <circle cx="60" cy="24" r="7" fill="#B6D4F4" />
          <circle cx="88" cy="38" r="8" fill="#B6F4C8" />
          <circle cx="60" cy="56" r="7" fill="#F4E4B6" />
          <path
            d="M38 30L54 26M66 28L82 35M66 50L82 43M54 50L38 40"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          <circle cx="60" cy="40" r="3.5" fill="var(--accent)" />
        </>
      )}
    </svg>
  );
}
